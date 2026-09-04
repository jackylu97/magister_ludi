/**
 * The one entry point that changes the game: `applyCommand(state, command)`.
 *
 * Everything a player (or an AI, or a replay, or the network) can do is a plain
 * JSON object. Nothing outside this module may mutate a `GameState`; if a new
 * rule needs to change the world it becomes a command type here, or a turn
 * phase in `turn.ts` that this reducer invokes.
 *
 * Mutation contract
 * -----------------
 * On success the command mutates `state` **in place** and returns `{ ok: true }`.
 * On failure it returns `{ ok: false, error }` and the state is left *exactly*
 * as it was — every handler validates completely before it writes anything, so
 * a rejected command is unobservable. Callers may rely on that: a failed
 * command is never appended to the log (see `dispatch` in `game.ts`).
 *
 * In-place mutation is deliberate, not laziness. A Civ-sized state is a big
 * object graph and copying it every command would cost more than the whole
 * simulation; undo, replay and "what did the last turn change?" are served by
 * re-running the command log from `newGame`, which is cheap because the log is
 * tiny and generation is deterministic. Structural sharing would buy immutable
 * snapshots at the price of making every rule harder to write.
 *
 * Exhaustiveness
 * --------------
 * The switch ends in a `never`-typed default: adding a member to `Command`
 * without handling it here is a compile error, not a silent no-op. The same
 * branch still returns an error at runtime, because a command can arrive from a
 * save file or a socket and be anything at all.
 *
 * Who is acting
 * -------------
 * Turns are simultaneous: everyone plays inside one shared window, so a command
 * cannot be attributed to "whoever's turn it is". Every command therefore names
 * its author in `playerId`, and every handler checks that author before it
 * checks anything else — the player exists, owns what it is about to move, and
 * has not already ended the turn. A remote peer's command is validated by the
 * same code that validates the local player's, because there is only one code.
 *
 * Contention
 * ----------
 * Two players reaching for the same tile in the same window are resolved by the
 * position of their commands in the log: the first one applied gets the tile and
 * the second is rejected, exactly as if they had been sequential. Log order is
 * the whole of the tie-break, which is what keeps a replay identical to the game
 * it replays.
 *
 * Combat is not an exception to any of this
 * -----------------------------------------
 * An `attack` is a command like every other: it resolves immediately, in log
 * order, and it rolls its dice from `state.rng` as a state mutation. There is no
 * combat phase, no batching of a turn's attacks, and no window in which a
 * declared attack waits for anything. That is the whole model, and the case
 * everybody asks about needs no rule of its own: a unit killed by an earlier
 * command in the same window is gone from `state.units`, so a later command *by*
 * it fails at the id lookup and a later command *against* it finds nothing to
 * attack — both refused cleanly, both leaving the state byte-identical. The
 * validate-fully contract above is what buys that for free.
 */

import { type ArrivalReport, arriveOnTile, isEmptyArrival } from './arrival';
import { isBuildingId } from './buildingData';
import { isProjectId } from './projectData';
import {
  type CompletionGrantReport,
  type ConsecrationReport,
  type StarvationReport,
  type WonderCompletion,
  assignableTiles,
  citizenFocusError,
  cityAt,
  foundCityAt,
  foundingError,
  purchaseTileAt,
  refreshCityDerived,
  settleProductionWindfall,
  tileOwnerPlayerId,
  tilePurchaseError,
} from './cities';
import { type CombatOutcome, type SiegeReport, applyCombat, fortifyError } from './combat';
import { discoveryChoiceError, settleDiscovery } from './discoveries';
import { type ExploreEndReport, aimExplorer, autoExploreError } from './explore';
import type { ImprovementId } from './improvementData';
import {
  type PillageReport,
  type ProspectReport,
  buildImprovementAt,
  chopCity,
  chopError,
  chopFeatureAt,
  improvementError,
  pillageAt,
  pillageError,
  prospectAt,
  prospectError,
} from './improvements';
import { type DisbandReport, unitUpkeepOf } from './upkeep';
import {
  greatPersonActAt,
  greatPersonActError,
  greatPersonChoiceError,
  greatPersonPurchaseError,
  greatPersonWorkAt,
  greatPersonWorkError,
  purchaseGreatPersonOfferAt,
  redrawGreatPersonOffer,
  settleGreatPersonChoice,
} from './greatPeople';
import { getTileAt, tileIndex } from './map';
import { advanceAlongPath } from './movement';
import { type Cell, canStopOn, findPath, isPassable } from './pathfind';
import {
  type ProclamationReport,
  type PurgeReport,
  beliefChoiceError,
  consecrateAt,
  consecrateError,
  gainBeliefAt,
  gainBeliefError,
  performRiteAt,
  plantHolySiteAt,
  plantHolySiteError,
  proclaimAt,
  proclaimError,
  purgeAt,
  purgeError,
  redraftAt,
  redraftError,
  renameReligionAt,
  renameReligionError,
  riteError,
  settleBeliefChoice,
} from './religion';
import {
  type PurchaseCurrency,
  type PurchasableItem,
  contributeAt,
  contributeError,
  purchaseError,
  purchaseItemAt,
  readPurchasableItem,
} from './purchase';
import type { BeliefId, ReligionBeliefPool, RiteId } from './religionData';
import { planRecruitment, renownThreshold, settleRenownWindfall } from './renown';
import { type CitizenFocus, RULES, isCitizenFocus } from './rulesData';
import {
  type City,
  type GameState,
  type Player,
  type QueueItem,
  allTurnsEnded,
  cityById,
  clearTurnEnded,
  createUnit,
  hasEndedTurn,
  playerById,
  removeUnit,
  unitById,
  wakeUnit,
} from './state';
import {
  adoptGovernmentAt,
  doctrineChoiceError,
  governmentChoiceError,
  orderChoiceError,
  settleDoctrineChoice,
  settleOrderChoice,
  slotOrderAt,
  slotOrderError,
  unslotOrderAt,
  unslotOrderError,
} from './statecraft';
import type { OrderId } from './statecraftData';
import {
  type ResearchQueueMode,
  buildError,
  chooseResearchFor,
  dequeueResearchError,
  dequeueResearchFor,
  opusOpen,
  researchError,
} from './tech';
import type { TechId } from './techData';
import {
  type RouteEndReport,
  type RouteMode,
  endRoute,
  routeModeFor,
  startRouteAt,
  startRouteError,
} from './trade';
import { type BeadAward, beadMarks, beadsSince } from './beads';
import type { BeadAge } from './beadData';
import { type TriumphAward, triumphsAwarded } from './triumphs';
import { runEndOfTurn } from './turn';
import { atWar } from './wars';
import {
  type DealExecution,
  type PeaceOutcome,
  type RazeReport,
  type WarDeclaredReport,
  acceptDealAt,
  annexCityAt,
  annexCityError,
  answerDealError,
  declareWarAt,
  declareWarError,
  dropProposal,
  proposeDealAt,
  proposeDealError,
  proposePeaceError,
  razeCityAt,
  razeCityError,
  setPeaceOfferAt,
  withdrawDealError,
  withdrawPeaceError,
} from './diplomacy';
import { type DealEndReport, type DealTerms, proposalById } from './deals';
import type { CampBounty } from './camps';
import { type GuildReport, dismissSpecialistAt, dismissSpecialistError } from './guilds';
import { type SpecialistFamily, isSpecialistFamily } from './greatPeopleData';
import { type UnitTypeId, isCivilian, isUnitTypeId, unitDef } from './unitData';
import { hasStackingRoom, sleepError } from './units';
import { recomputeVisibility } from './visibility';

// --- command types ----------------------------------------------------------

/**
 * The part every command shares: who issued it.
 *
 * Not "whose turn it is" — there is no such thing under simultaneous turns —
 * but the authority the command is claiming. In single player the UI stamps its
 * local seat on everything it sends; over a network the server stamps the
 * connection it arrived on. Either way the reducer trusts the field only as far
 * as it validates it.
 */
export interface PlayerCommand {
  /** Id of the player acting. Must name a player in `state.players`. */
  playerId: number;
}

/**
 * Ends this player's turn. Every other player may still be acting; when the
 * last outstanding seat ends, the end-of-turn phases resolve, every seat reopens
 * and the turn counter advances.
 */
export interface EndTurnCommand extends PlayerCommand {
  type: 'endTurn';
}

/**
 * Orders a unit to `target`, however far away it is.
 *
 * One command covers both a single step and a ten-turn march: the reducer finds
 * the route, walks as much of it as this turn's movement pays for, and parks the
 * remainder on the unit as a standing order that `resetMovement` resumes. A
 * second `moveUnit` for the same unit replaces the first — the player changed
 * their mind, and half of an abandoned route is not a plan.
 *
 * **A unit with no movement left is a legal subject**, and walks none of the
 * route: it records the whole thing as a standing order and sets off next turn.
 * "As much as this turn's movement pays for" is exactly none of it, which is why
 * this needs no clause of its own — see `applyMoveUnit`.
 *
 * `playerId` must own the unit and must not have ended the turn: a seat that has
 * declared itself finished is finished, however much movement its units have
 * left.
 */
export interface MoveUnitCommand extends PlayerCommand {
  type: 'moveUnit';
  unitId: number;
  target: Cell;
}

/**
 * Cancels a unit's standing order, leaving it where it is.
 *
 * The other half of `moveUnit`: an order that spans turns is resumed by
 * `resetMovement` without asking again, so there has to be a way to say "stop".
 * It names the unit rather than carrying the route, because the route is
 * whatever the unit is still holding — a command that restated it could disagree
 * with the state it was meant to clear.
 *
 * It is *not* a movement command: nothing on the board moves, and the unit keeps
 * every movement point it has. It is still turn-gated exactly like `moveUnit`,
 * and that is a deliberate choice rather than an inherited one. A stored order is
 * a decision the player made during their turn, and `resetMovement` will act on
 * it in the resolution that a finished seat has already handed over to. Letting a
 * seat that has declared itself finished reach back in and revoke that decision
 * would make "I have ended my turn" mean less than it says — and under
 * simultaneous turns it would be a second, quieter turn taken after everyone
 * else's window closed.
 *
 * Refusing on a unit with no stored order is deliberate too: "cancel nothing"
 * has no effect to log, and an accepted no-op would put a command in the log
 * that a replay has to apply and that says nothing about what happened.
 */
export interface CancelOrderCommand extends PlayerCommand {
  type: 'cancelOrder';
  unitId: number;
}

/**
 * Puts a new unit on the board. Used by tests and debugging today, and by city
 * production once cities can build; keeping it a command means all three go
 * through the same validation instead of reaching into `state.units`.
 *
 * The two ids are different questions and both are checked. `playerId` is who
 * *asked* — a debug console, a test, or (later) the production system acting for
 * a city's owner; `ownerId` is whose unit the new piece becomes. They usually
 * coincide and are allowed not to, which is why ending the turn does not close
 * this command the way it closes `moveUnit`.
 */
export interface SpawnUnitCommand extends PlayerCommand {
  type: 'spawnUnit';
  /** The player the new unit belongs to, which need not be `playerId`. */
  ownerId: number;
  unitType: UnitTypeId;
  at: Cell;
}

/**
 * Spends a settler to plant a city on the tile it is standing on.
 *
 * The unit is *consumed*, not moved — it is the city now — so this is one of the
 * few commands that removes something from the board. It names the unit rather
 * than the tile because the settler is what authorises it: the tile is wherever
 * that unit happens to be, and asking for a tile would invite a UI that let a
 * player found a city across the map.
 *
 * Turn-gated exactly like `moveUnit`: founding a city is an act, and a seat that
 * has declared itself finished has finished acting.
 */
export interface FoundCityCommand extends PlayerCommand {
  type: 'foundCity';
  settlerUnitId: number;
}

/**
 * Replaces a city's production queue wholesale.
 *
 * Whole-queue replacement rather than push/remove/reorder commands, for three
 * reasons: the queue is short, the resulting command is a complete statement of
 * intent (so a replay never depends on a queue's prior contents), and one
 * validation path covers every edit the UI can make. The panel builds the array
 * it wants and sends it; the reducer either takes all of it or none.
 *
 * Order is the player's intent and is preserved exactly. Turn-gated like
 * `moveUnit` — a finished seat is finished, and letting it keep re-planning
 * production would be a second, quieter turn.
 */
export interface SetCityProductionCommand extends PlayerCommand {
  type: 'setCityProduction';
  cityId: number;
  queue: QueueItem[];
}

/**
 * Pins this city's citizens to a set of tiles, replacing whatever was pinned
 * before.
 *
 * Whole-list replacement for the same three reasons `setCityProduction` is (see
 * above): the list is short, the command is a complete statement of intent, and
 * one validation path covers every edit the panel can make.
 *
 * Every cell must be a tile this city could actually work — its own, workable,
 * inside the work radius — and there may be no more of them than the city has
 * citizens. Refusing at the gate is what keeps the panel honest: a pin that
 * could never be honoured would be a dot the player put on the board and the
 * simulation quietly ignored.
 *
 * Turn-gated like `moveUnit`: re-planning who works what is an act, and a seat
 * that has declared itself finished has finished acting.
 */
export interface SetLockedTilesCommand extends PlayerCommand {
  type: 'setLockedTiles';
  cityId: number;
  cells: Cell[];
}

/**
 * Points a city's citizens at a yield, and says whether the town may grow.
 *
 * `setLockedTiles`' sibling one grade coarser — a pin says *this hex*, this says
 * *this kind of hex* — and the one verb the focus pane has. Both halves ride one
 * command because they are one arrangement a player edits in one place, and a
 * seat that sent them separately would land two log entries for one click.
 *
 * **An absent field is a half not named**, not a half cleared: `focus` alone
 * leaves the avoid-growth mark as it was, and `avoidGrowth` alone leaves the
 * focus. Clearing is said out loud — `focus: 'default'` for the balanced
 * ordering, `avoidGrowth: false` for a town that may grow again — which is what
 * lets the two controls dispatch independently without either erasing the other.
 *
 * Turn-gated like `setLockedTiles`, and refused for a **puppet**: a town that
 * chooses for itself what to build chooses for itself where its people stand
 * (`citizenFocusError`, which is also what greys the control).
 */
export interface SetCitizenFocusCommand extends PlayerCommand {
  type: 'setCitizenFocus';
  cityId: number;
  focus?: CitizenFocus;
  avoidGrowth?: boolean;
}

/**
 * Sends one of a city's guildsmen back to the fields (ledger Entry XLVIII).
 *
 * **The only verb the guild system has**, and it only ever *removes*: there is
 * no way to add a specialist, choose a family, or hold a seat open. That is the
 * ruling — passive, unlimited, ignorable — and this exists for the one case a
 * player can be hurt by it, a town that has grown into famine and needs the hex
 * back.
 *
 * The bar restarts (`City.guildBasket` to zero), which is what stops the verb
 * being a dial: a town that could dismiss and re-form at will would have found a
 * way to choose a family. See `dismissSpecialistAt`.
 *
 * Turn-gated like `setLockedTiles`, and for its reason exactly: deciding where a
 * town's people stand is an act, and a seat that has declared itself finished
 * has finished acting.
 */
export interface DismissSpecialistCommand extends PlayerCommand {
  type: 'dismissSpecialist';
  cityId: number;
  family: SpecialistFamily;
}

/**
 * Points this player's science at a technology — and at everything that
 * technology needs.
 *
 * Choosing is aiming rather than spending: progress *is* `Player.sciencePool`
 * (see `tech.ts`), so there is nothing to cancel, refund or bank separately, and
 * switching mid-research is legal and lossless. A player who reacts to something
 * another seat did inside the same turn window keeps every beaker they banked.
 *
 * **The target need not be reachable.** Naming a locked node names its
 * unresearched prerequisites too, in `researchExpansion`'s order, and the whole
 * list becomes the plan: the head is what `sciencePool` is aimed at and the rest
 * is `Player.researchQueue`. That is the entire feature — clicking a distant
 * node is one command, not a lesson in the tree.
 *
 * `queue` says what to do with what is already lined up, and its **absent value
 * is `'replace'`**, which is what this command meant before a queue existed: a
 * log written by an older build replays byte-identically, because a target whose
 * prerequisites were met expands to itself and a plan that was one node long is
 * replaced by a plan that is one node long. `'append'` is the shift-click — a
 * second destination rather than a second mind — and adds only what the plan
 * does not already hold.
 *
 * Refused when the command would change nothing: a technology already held, and
 * a plan that comes out identical to the one already standing (re-choosing the
 * current research with an empty queue is the commonest case). An accepted no-op
 * is a log entry a replay has to apply and that says nothing about what happened.
 *
 * Turn-gated like `setCityProduction`: choosing what to learn is an act, and a
 * seat that has declared itself finished has finished acting.
 */
export interface ChooseResearchCommand extends PlayerCommand {
  type: 'chooseResearch';
  techId: TechId;
  queue?: ResearchQueueMode;
}

/**
 * Takes a technology out of this player's research plan.
 *
 * `chooseResearch`'s other half, and `cancelOrder` one system over: a plan that
 * spans a dozen turns has to be revisable without being re-drawn from scratch.
 * It names the technology rather than an index for `cancelOrder`'s reason — an
 * index is a statement about a list the player may have been looking at two
 * commands ago, and a name is a statement about what they meant.
 *
 * **Everything that only made sense because of it goes too**, transitively:
 * dropping Bronzeworking drops the Iron Working standing behind it. The
 * alternative is a plan holding rows the completion phase would silently step
 * over, which is a plan that lies about what will be learnt.
 *
 * The named technology may be the current research; the plan is one list and
 * this is one rule over it (see `researchPlan`). Dropping the head simply
 * promotes whatever was behind it, and the pool is not touched — this is a
 * switch, and switching has always been free.
 *
 * Refused when the technology is not in the plan at all, and turn-gated exactly
 * like `chooseResearch`.
 */
export interface DequeueResearchCommand extends PlayerCommand {
  type: 'dequeueResearch';
  techId: TechId;
}

/**
 * Attacks whatever of somebody else's is standing on `target`.
 *
 * A command of its own rather than an overload of `moveUnit`, and that is the
 * important part of the design. Attacking and moving look similar from a mouse's
 * point of view and are nothing alike underneath: one spends movement and can be
 * half-completed across several turns, the other spends the whole turn, rolls
 * dice, and may end with the actor dead. Folding them together would mean a
 * mis-aimed move order could start a war, a path preview would have to mean two
 * things, and the reducer would have to guess which the player meant. So the UI
 * decides — right-click an enemy is an attack, right-click ground is a move —
 * and the log records which was intended rather than what happened to be there.
 *
 * The tile is named, not the victim. What is actually hit is the targeting rule
 * in `combat.ts` (walls, then the garrison, then capture — civilians last),
 * asked at the moment the command applies — so a defender that died to an
 * earlier command in the same turn window simply is not there, and the attack
 * is refused or lands on whatever remains. The interface asks the same question
 * through `previewCombat` and therefore always aims at the thing that will be
 * hit.
 *
 * Melee or ranged is decided by the *unit*, never by the command: a type with
 * `rangedStrength` shoots and a type without it closes. One command, because
 * from the player's side it is one gesture.
 *
 * Turn-gated like `moveUnit`: fighting is an act, and a seat that has declared
 * itself finished has finished acting.
 */
export interface AttackCommand extends PlayerCommand {
  type: 'attack';
  unitId: number;
  target: Cell;
}

/**
 * Digs a unit in where it stands.
 *
 * The cheapest possible order and the most valuable: it costs nothing, it can be
 * given with no movement left, and it pays `combat.fortifyBonusPerTurn` of
 * defence for every turn the unit then stays put, up to `combat.fortifyMax`. It
 * breaks the moment the unit moves or attacks (see `breakFortify`), so it is a
 * standing decision rather than a toggle to be micromanaged.
 *
 * It does *not* require movement, unlike founding a city. Fortifying is what a
 * unit that has already marched does with the rest of its turn, and requiring
 * movement would make the order useless in exactly the situation it exists for —
 * a unit that just arrived somewhere it means to hold.
 *
 * Re-fortifying an already-fortified unit is refused, for the reason
 * `chooseResearch` refuses re-choosing: it would change nothing and put a log
 * entry in the save that says nothing. There is no "unfortify" command either —
 * moving is how a unit stands up, and a second verb for it would be a second way
 * to say the same thing.
 */
export interface FortifyCommand extends PlayerCommand {
  type: 'fortify';
  unitId: number;
}

/**
 * Tells a civilian to sleep where it stands.
 *
 * `fortify`'s civilian twin, and shaped exactly like it: it names the unit and
 * nothing else, it costs nothing, it can be given with no movement left, and it
 * is refused when it would change nothing. What it buys is not defence but
 * *silence* — a sleeping unit stops blocking End Turn and stops being the piece
 * the camera flies to when the turn opens (`ui/turnBlockers.ts`). See
 * `Unit.sleeping` for the whole of what it means.
 *
 * There is no "wake" command, and that is the design rather than an omission.
 * **Every command that names a sleeping unit wakes it** — see `wakeActorUnit`
 * below — because an order *is* a waking, and a player who has decided to move a
 * sleeping worker should not have to say so twice. The word for waking a piece
 * you have no other use for is `cancelOrder`, which already means "never mind".
 *
 * Turn-gated like `fortify`: a seat that has declared itself finished has
 * finished giving orders, and this is one.
 */
export interface SleepUnitCommand extends PlayerCommand {
  type: 'sleepUnit';
  unitId: number;
}

/**
 * Tells a soldier or a scout to seek out unexplored land on its own, or calls
 * it back.
 *
 * A toggle like `setAutoResend`, and an order like `moveUnit`: setting it
 * drops whatever the piece was doing — the path it held, the sleep it was
 * given — and aims it at the nearest hex whose own sight would still show its
 * empire something new (`exploreTarget` in `explore.ts` is the whole rule).
 * The `marchExplorers` phase re-aims the piece every resolution until the
 * search comes back empty, at which point the flag is deleted and
 * `TurnReport.exploreEnded` says so. Any *other* accepted order naming the
 * unit clears the flag (`applyCommand`'s one seam, `sleeping`'s argument
 * exactly), so a piece told to do anything at all is a piece called back —
 * and `cancelOrder` is the plain "never mind".
 *
 * Turn-gated like every other order, and refused for a piece that is neither
 * a combatant nor the explorer (`autoExploreError` — a kind, never a name): a
 * worker ranging ahead is a worker walking into somebody's spear for nothing
 * it can use.
 */
export interface SetAutoExploreCommand extends PlayerCommand {
  type: 'setAutoExplore';
  unitId: number;
  on: boolean;
}

/**
 * Spends one of a worker's charges to lay an improvement on the tile it stands
 * on.
 *
 * It names the unit and the improvement, never the tile — the worker is what
 * authorises the work and the tile is wherever that worker happens to be, which
 * is `foundCity`'s argument exactly. A command that carried a target would
 * invite an interface that let a player farm a hex on the other side of the map.
 *
 * **Instant.** There is no progress, no partial state and no "worker is busy"
 * flag: the improvement is on the ground the moment the command is accepted.
 * That is the whole architectural reason the charge model was chosen (design
 * ledger, M7) — under simultaneous turns a half-built farm is a thing two seats
 * can contend over, and this game has no such thing.
 *
 * It spends *all* the unit's remaining movement, unlike `pillage`, which spends
 * one point. Building is the turn's work.
 *
 * Turn-gated like `moveUnit`: building is an act, and a seat that has declared
 * itself finished has finished acting.
 */
export interface BuildImprovementCommand extends PlayerCommand {
  type: 'buildImprovement';
  unitId: number;
  improvement: ImprovementId;
}

/**
 * Spends one of a worker's charges to clear the feature it is standing in, and
 * banks the timber in the city that owns the ground.
 *
 * `buildImprovement`'s mirror image and deliberately shaped like it: it names
 * the unit and nothing else, it is instant, it spends all remaining movement,
 * and a worker that empties its charges on it is consumed. What it does *not*
 * name is the feature — the feature is whatever the worker is standing in, for
 * the same reason the tile is wherever the worker is. A command that carried one
 * could disagree with the ground, and the ground is the truth.
 *
 * It is a command of its own rather than a seventh `improvement`, because the
 * two are not the same act: an improvement goes *on* a tile and pays forever, a
 * chop takes something *off* and pays once. Folding them together would have
 * meant an improvement id that names no improvement, and `buildImprovementAt`
 * branching on it.
 *
 * Turn-gated like `moveUnit`: felling a wood is an act, and a seat that has
 * declared itself finished has finished acting.
 */
export interface ChopFeatureCommand extends PlayerCommand {
  type: 'chopFeature';
  unitId: number;
}

/**
 * Asks a hill what is under it. See `prospectAt` (`improvements.ts`) for the
 * rules, and `veins.ts` for what put the answer there.
 *
 * `chopFeature`'s shape exactly — it names the unit and nothing else, it is
 * instant, and it spends all remaining movement — and it names no tile for that
 * command's reason: the hill is wherever the surveyor is standing, and a command
 * that carried one could disagree with the ground.
 *
 * What it does **not** cost is a charge. Clearing a wood uses a worker up
 * because something happens to the wood; a survey leaves the hillside as it
 * found it and takes the day. That also makes it a verb an *explorer* can spend,
 * which is the other half of the ratified act.
 *
 * A command of its own rather than a mode of `buildImprovement`, for the reason
 * `chopFeature` is one: nothing stands on the tile afterwards, so folding them
 * together would have meant an improvement id that names no improvement.
 *
 * Turn-gated like `moveUnit`: reading a hillside is an act, and a seat that has
 * declared itself finished has finished acting.
 */
export interface ProspectCommand extends PlayerCommand {
  type: 'prospect';
  unitId: number;
}

/**
 * Tears an improvement out of ground that is not yours, and pockets the salvage.
 *
 * A command of its own rather than a mode of `attack`, for `attack`'s own
 * reason: the two look similar from a mouse's point of view and are nothing
 * alike underneath. An attack rolls dice, may kill the actor and spends the
 * whole turn; a raid is deterministic, costs a single movement point and leaves
 * the column riding on. Folding them together would mean a mis-aimed order
 * burned a farm instead of starting a fight.
 *
 * Like `attack` and `foundCity` it names no tile: the tile is where the unit is.
 * Turn-gated like every other act.
 */
export interface PillageCommand extends PlayerCommand {
  type: 'pillage';
  unitId: number;
}

/**
 * Buys one unowned tile for one of this player's cities, with gold.
 *
 * The first gold sink the game has (playable.md item 2). It names the city as
 * well as the hex, and both are load-bearing: the hex is the ground, and the
 * city is who will own and work it — a tile in the overlap of two towns is a
 * different purchase depending on which one is buying, and the price is quoted
 * against the buyer's rings.
 *
 * Instant and complete, like `buildImprovement`: there is no part-paid tile. The
 * whole of the rule is `tilePurchaseError` (`cities.ts`), which the overlay also
 * greys its tags with — so a tag a player can click is a command this accepts,
 * and the sentence they read on a refusal is this reducer's own.
 *
 * Turn-gated like every other act. A seat that has declared itself finished has
 * finished spending.
 */
export interface PurchaseTileCommand extends PlayerCommand {
  type: 'purchaseTile';
  cityId: number;
  col: number;
  row: number;
}

/**
 * Takes one of the three boons a claimed ruin or village is offering.
 *
 * **The first draft pick this game has** (design ledger, Entry XV — offers from
 * `state.rng`, the pick as a command), and the shape Statecraft inherits rather
 * than re-inventing. Three things about it are the doctrine rather than this
 * feature:
 *
 * It names an **index, never an id**. An index can only ever refer to something
 * the player was actually dealt, so a client cannot ask for a card it was not
 * offered — the reducer does not have to re-derive the legal set to find out, it
 * simply looks at the offer it stored. An id would make every pick a question
 * about the whole pool.
 *
 * There is **no reroll and no decline**. The offer is the decision; a pick that
 * could be refused would be an offer that can sit in the state forever, and the
 * End Turn blocker exists precisely to stop that. (Entry XV's Magister's Dice
 * will add a reroll *as its own command*, which is the right shape for it — a
 * reroll is a thing you spend something on, not a mode of this.)
 *
 * Turn-gated like every other act: choosing what the ruins gave you is an act,
 * and a seat that has declared itself finished has finished acting. That is not
 * a trap — the blocker will not let a seat end its turn while an offer is
 * outstanding, so the only way to reach the gate is to answer the prompt and
 * then hand the turn over anyway.
 */
export interface ChooseDiscoveryCommand extends PlayerCommand {
  type: 'chooseDiscovery';
  /** Which of the offered options, by position in `Player.pendingDiscovery`. */
  optionIndex: number;
}


/**
 * Takes one of the cards a Statecraft draft is offering.
 *
 * `chooseDiscovery`'s shape at the scale Entry XV designed it for, and the same
 * three claims hold: the offer was **drawn once** from `state.rng` when the
 * meter filled and stored on the player, the pick names an **index rather than
 * an id** (an index can only ever name something the player was dealt), and both
 * halves are in the log — so a replay deals the same hand and takes the same
 * card.
 *
 * Three new cards and, when the empire owns anything, one **upgrade** as the
 * last option: taking it deepens a card already held rather than adding one.
 * Which it is, is not in the command — the offer knows, and a client that
 * guessed would be a client the reducer has to second-guess.
 *
 * The card lands in the **collection**, never in a slot. Slotting is
 * `slotOrder`, because it is its own decision and it costs a seal.
 *
 * Turn-gated like every other act, and not a trap for the same reason
 * `chooseDiscovery` is not: the End Turn blocker will not let a seat hand over
 * while a draft is outstanding.
 */
export interface ChooseOrderCommand extends PlayerCommand {
  type: 'chooseOrder';
  /** Which option, by position. The upgrade is last when there is one. */
  optionIndex: number;
}

/**
 * Puts an Order the empire holds into one of its government's slots, and
 * **seals** it there.
 *
 * The seal is an *entry* lock (Entry XV): it starts when the card goes in, so a
 * posture change is anticipated rather than reactive — which is what
 * simultaneous turns need, since a swap made after seeing what another seat did
 * this window would be a decision taken with information the design does not
 * want it taken with. Length is the empire's own (`sealTurnsFor`), so The Loose
 * Rein is felt at the moment it matters.
 *
 * It names the card **and** the slot, and both are load-bearing: a card may fit
 * several slots (a wildcard takes anything), and which one it goes in decides
 * what is left for everything else. There is deliberately no swap — an occupied
 * slot is usually a sealed slot, and a verb that emptied one silently would be
 * the one thing entry-locking exists to prevent.
 *
 * Turn-gated like every other act. A seat that has declared itself finished has
 * finished rewriting its law.
 */
export interface SlotOrderCommand extends PlayerCommand {
  type: 'slotOrder';
  cardId: OrderId;
  slotIndex: number;
}

/**
 * Takes an Order back out of a slot. The card returns to the collection — it is
 * never lost.
 *
 * Free once the seal has expired (Entry XV): no cost, no cooldown, no second
 * seal on the way out, because the friction the design wants is on *committing*
 * rather than on retreating. Refused while the seal stands, with the sentence
 * that says how many turns are left.
 *
 * It names the slot rather than the card, which is `cancelOrder`'s argument: the
 * slot is what is being emptied, and a command that named the card could
 * disagree with the state it was meant to clear.
 */
export interface UnslotOrderCommand extends PlayerCommand {
  type: 'unslotOrder';
  slotIndex: number;
}

/**
 * Adopts one of the three governments a tier offered. **The chapter break.**
 *
 * The offer is a fixed triple and it is **banked** (Entry XV: adoption is
 * bankable), so this command may be sent turns after the tier that opened it —
 * which is exactly why a banked government does not block End Turn. Taking it
 * does three things in one breath, because they are one decision: the slot
 * spread changes, **every slotted card returns to the collection unsealed** (the
 * amnesty — Civ VI's free-swap window derived rather than ruled), and a Doctrine
 * draft opens, drawn at this instant from `state.rng`.
 *
 * A choice index, never an id, for `chooseOrder`'s reason. There is no way back:
 * Entry XV settles the open question at "a government pick cannot be revisited
 * within a tier".
 */
export interface AdoptGovernmentCommand extends PlayerCommand {
  type: 'adoptGovernment';
  /** Which of the tier's three, by position. */
  choiceIndex: number;
}

/**
 * Takes one of the three Doctrines an adoption offered.
 *
 * Permanent, slotless, one per adoption — three per game (Entry XV.b). It is a
 * separate command from `adoptGovernment` rather than a second field on it,
 * because it is a separate decision made after seeing what the adoption dealt,
 * and folding them together would mean choosing a government blind to the
 * Doctrines it opens or choosing a Doctrine before the government is real.
 *
 * `chooseOrder`'s shape otherwise, refusal for refusal.
 */
export interface ChooseDoctrineCommand extends PlayerCommand {
  type: 'chooseDoctrine';
  optionIndex: number;
}

/**
 * Buys a thing outright, out of a named bank, in one of this player's cities.
 *
 * **One transaction, two banks** (ledger Entry XXIX; Entry XXVIII is the augur
 * it grew out of). The religion pass wrote this command currency-agnostic in
 * shape and faith-funded in fact, on the argument that the M9 gold purchases
 * were the same transaction. They are, and this is it: the `unitType` widened
 * to an `item`, because gold buys buildings as well, and nothing else about the
 * shape changed.
 *
 * The **city** and the **item** are both load-bearing: the city is where the
 * thing lands, and the bank is checked against the roster row rather than
 * trusted — a client asking to buy an augur with gold is asking for something
 * the table does not sell, and `purchaseError` tells it which bank the thing is
 * priced in. The price is deliberately *not* in the command: it is
 * `explainPurchaseCost`'s, asked at the moment this applies, so a client cannot
 * name a figure the reducer then has to second-guess.
 *
 * Instant and complete, like `purchaseTile`: there is no part-paid granary, and
 * a bought piece can act on the turn it was bought, exactly as a chopped-for
 * warrior can.
 *
 * Turn-gated like every other act. A seat that has declared itself finished has
 * finished spending.
 */
export interface PurchaseItemCommand extends PlayerCommand {
  type: 'purchaseItem';
  cityId: number;
  /** A unit or a building. A project is not a thing that can be delivered. */
  item: PurchasableItem;
  /** Which bank pays. Refused when it is not the one the row is priced in. */
  currency: PurchaseCurrency;
}

/**
 * Pours gold or faith into a city's basket — the Cathedral's verb (design ledger
 * Entry LV).
 *
 * `purchaseItem`'s narrow cousin, and the differences are the design. A purchase
 * charges the **full** cost and delivers the thing outright; a contribution
 * charges only what the row still wants, banks it as hammers, and lets the
 * ordinary completion routine decide whether that finished anything. It is
 * therefore a deliberate, *declared* exception to Entry XXIX's "the full cost,
 * never the remainder": the exception is confined to rows carrying
 * `BuildingDef.acceptsContributions`, which today is the cathedral alone and
 * tomorrow the Magnum Opus — the whole point being that the Opus's
 * pillar-funding is rehearsed one age early on a building every player raises.
 *
 * The **city** and the **bank** are all it says. Which row is being paid for is
 * not in the command and must not be: a city has one basket and it pays for
 * `queue[0]`, so naming the row would be naming something the reducer would then
 * have to second-guess against the queue as it stands at this point in the log.
 * The *amount* is not in it either, for `purchaseItem`'s reason —
 * `explainContribution` decides it at the moment this applies, capped at what
 * the row still needs, so a client cannot name a figure that overshoots.
 *
 * Turn-gated like every other act. A seat that has declared itself finished has
 * finished spending.
 */
export interface ContributeCommand extends PlayerCommand {
  type: 'contribute';
  cityId: number;
  /** Which bank pays. Both are legal; the rate differs. */
  currency: PurchaseCurrency;
}

/**
 * Spends an augur — the **whole** augur — to found or widen the pantheon.
 *
 * It names the unit and nothing else, which is `foundCity`'s argument: the augur
 * is what authorises it and there is nothing else to say. And it consumes the
 * piece *whatever charges are left on it*, which is the anti-spam structure
 * rather than an oversight (`docs/deprecated/religion.md`): an augur is three rites **or**
 * one god, so the price of a god is always a whole agent and the decision is
 * live at every point on that curve.
 *
 * Legal only while a **belief slot is open**. It opens a 1-of-3 offer drawn from
 * `state.rng` at this instant and stored on the player, answered by
 * `chooseBelief` — Entry XV's shape for the third time, and both halves in the
 * log so a replay deals the same three gods and takes the same one.
 *
 * Turn-gated like every other act.
 */
export interface ConsecrateCommand extends PlayerCommand {
  type: 'consecrate';
  unitId: number;
}

/**
 * Takes one of the three gods a Consecrate is offering.
 *
 * `chooseOrder`'s shape, refusal for refusal: an **index rather than an id** (an
 * index can only ever name something the player was dealt), no reroll and no
 * decline, and the End Turn blocker is what stops the offer sitting on the
 * empire forever. A belief is **permanent** — there is no unconsecrating, no
 * slot to move it out of, and no later pass that takes it away.
 */
export interface ChooseBeliefCommand extends PlayerCommand {
  type: 'chooseBelief';
  optionIndex: number;
}

/**
 * Spends **one** of an augur's charges on a rite.
 *
 * `buildImprovement`'s twin one system over, and shaped like it on purpose: one
 * charge, instant, fully validated, and an augur that empties its last charge is
 * removed from the board exactly as a worker is. What differs is the target —
 * a rite blesses a *town* or a *piece*, and it reaches one hex, so `target` is
 * the hex it is aimed at and **absent means where the augur stands**.
 *
 * It does not spend movement, unlike building. A rite is a thing said, not a
 * day's work, and the charge is the whole of what it costs.
 *
 * The instant half settles into its bucket the moment it lands (Entry XVIII) and
 * the lasting half is stamped on the target as an absolute-expiry `TimedEffect`.
 *
 * Turn-gated like every other act.
 */
export interface PerformRiteCommand extends PlayerCommand {
  type: 'performRite';
  unitId: number;
  rite: RiteId;
  /** The hex blessed. Absent means the hex the augur is standing on. */
  target?: Cell;
  /**
   * The god handed back, on a **redraw** rite (Recasting the Omens) and on no
   * other — absent everywhere else, so a v33 log replays byte-identically.
   *
   * It names an **id** rather than an index, which is the one place this system
   * departs from Entry XV's doctrine and departs from it for that doctrine's own
   * reason: an index is safe because it can only name something the player was
   * *dealt*, and this names something the player already **holds**. The pantheon
   * is not an offer — it is a list on the empire that no draw produced — so an
   * index into it would be an index into a list the log never wrote down. The
   * gate checks the seat holds it (`riteError`).
   *
   * The hand it opens is answered by the ordinary `chooseBelief`, which appends,
   * so the slot the give-back emptied is the slot the pick fills.
   */
  belief?: BeliefId;
}

/**
 * Spends the prophet on **founding a religion** — the stones and the faith in
 * one deed.
 *
 * `foundCity`'s shape: it names the piece and nothing else, because the piece is
 * what authorises it and the hex it stands on is where the stones go. **One
 * verb, one act**, since Entry LVIII: a prophet carries one charge, planting is
 * founding, and there is no such thing as a second holy site any more. An empire
 * that cannot found (no gods, already founded, or the world already holds every
 * religion it will) is refused here, at the ground, rather than discovering it
 * in a screen somewhere else.
 *
 * Founding opens **two** belief drafts, each answered by `chooseBelief` — Entry
 * XV's shape for the fourth time, both halves in the log, and a pick that names
 * an index rather than an id. The second hand is *drawn when the first is
 * answered* (`PlayerPantheon.owed`) rather than dealt alongside it, because both
 * come out of the same bag and two simultaneous hands could offer the same
 * belief twice.
 *
 * Turn-gated like every other act.
 */
export interface PlantHolySiteCommand extends PlayerCommand {
  type: 'plantHolySite';
  unitId: number;
}

/**
 * Spends the prophet on **one more belief** for its religion.
 *
 * `consecrate`'s shape one shelf over: it names the piece, it opens an offer,
 * and the offer blocks End Turn until it is answered. Which bag it draws from is
 * the *ladder's* answer and never the command's (`nextBeliefPool`) — the
 * follower house until it is full, the enhancer house after that, and Theology
 * still gates the second. That is why this is one verb where there were two: an
 * `enhanceReligion` that a player had to know to press was a verb that answered
 * a question the rules already knew.
 *
 * Turn-gated like every other act.
 */
export interface GainBeliefCommand extends PlayerCommand {
  type: 'gainBelief';
  unitId: number;
}

/**
 * Spends the inquisitor on the **Purge** — every rival faith's banked pressure
 * stripped off every town within reach, and the congregations the deficit
 * reaches turned back to following nothing.
 *
 * `proclaim`'s shape and its mirror: it names the piece and nothing else,
 * because the hex the inquisitor stands on is where it happens. The faith it
 * spares is its empire's own (`servedReligion`) and is never named by the
 * command — an inquisitor does not choose a side.
 *
 * Turn-gated like every other act.
 */
export interface PurgeCommand extends PlayerCommand {
  type: 'purge';
  unitId: number;
}

/**
 * Spends a charge on a **proclamation** — the faith bomb.
 *
 * It leaves a pulse on the hex the prophet stands on: a wide, strong, *decaying*
 * source of pressure that converts what it reaches and then fades. The user's
 * ruling of 2026-08-27 is that it plants **no site** — "it makes the decision
 * more important between the two" — so a bomb converts and a site keeps, and a
 * prophet with two charges has a real question to answer twice.
 *
 * Turn-gated like every other act.
 */
export interface ProclaimCommand extends PlayerCommand {
  type: 'proclaim';
  unitId: number;
}

/**
 * Spends a charge on **giving one pool's beliefs back** and drawing again.
 *
 * The pantheon is not one of the pools it accepts, and that is the design: a
 * pantheon is the religion's identity and identity is not a decision you take
 * back (`docs/religion-v2.md`).
 *
 * Turn-gated like every other act.
 */
export interface RedraftBeliefsCommand extends PlayerCommand {
  type: 'redraftBeliefs';
  unitId: number;
  pool: ReligionBeliefPool;
}

/**
 * Renames this empire's religion. **Pure prose, and the only such command.**
 *
 * The name is generated at founding so a religion has one at all; this is the
 * courtesy that lets a player disagree with the dice. It names no piece, spends
 * nothing, and changes no rule — which is why it is not turn-gated the way an
 * act is, and why `orderedUnitId` returns nothing for it.
 */
export interface RenameReligionCommand extends PlayerCommand {
  type: 'renameReligion';
  name: string;
}

/**
 * Takes one of the names a filled renown bucket is offering.
 *
 * `chooseOrder`'s shape for the fifth time, refusal for refusal: an **index
 * rather than an id** (an index can only ever name something the player was
 * dealt), no reroll and no decline, and the End Turn blocker is what stops the
 * offer sitting on the empire forever.
 *
 * The **one** thing it does that its four siblings do not: the roster is shared
 * by the whole world, so a name another seat took in this same window is refused
 * — and the seat's offer is re-drawn on the spot rather than left unplayable.
 * See `greatPersonChoiceError` and the module docblock of `greatPeople.ts`.
 *
 * Turn-gated like every other act.
 */
export interface ChooseGreatPersonCommand extends PlayerCommand {
  type: 'chooseGreatPerson';
  optionIndex: number;
}

/**
 * Buys the **recruitment** a filled renown bucket would have opened — The
 * Commonwealth's gold, The Magisterium's faith — or the **draft** itself, which
 * is The Academy's scholars.
 *
 * It is emphatically not `purchaseItem`. A great person is *called* rather than
 * built or bought (CLAUDE.md; `buildError` and `purchaseError` both still refuse
 * `UnitDef.greatWork`), so what changes hands here is a moment on the ladder or
 * a hand of names, never a piece: the bank is charged and the offer opens by the
 * same code an end-of-turn trickle opens one by — one draft path, one place a
 * name is taken, and `chooseGreatPerson` still answers it.
 *
 * `buys` names one of the three purchases (`OfferPurchaseId`, `greatPeople.ts`)
 * rather than a currency, because the third is not one: the register there says
 * which bank each charges, what it costs, whose names it deals and whether it
 * moves the ladder. It carries no `cityId` for the reason it carries no unit — a
 * recruitment belongs to the empire and lands in its capital the way every other
 * one does. Each purchase is gated by its own `actionRule`, so an empire under
 * any other law is refused with a sentence.
 *
 * Turn-gated like every other act.
 */
export interface PurchaseGreatPersonOfferCommand extends PlayerCommand {
  type: 'purchaseGreatPersonOffer';
  buys: 'gold' | 'faith' | 'scholarDraft';
}

/**
 * Spends a great person on its family's boon — the burst.
 *
 * `consecrate`'s shape: it names the piece and nothing else, because the piece
 * is what authorises it and its *family* is what decides what happens. And it
 * consumes the whole person, which is the decision the recruit put to the
 * player: the burst now, or the ground forever.
 *
 * Every payout lands through the seam its bucket already has (Entry XVIII), so a
 * scholar's beakers can finish a technology and an engineer's hammers a granary
 * before this returns.
 *
 * Turn-gated like every other act.
 */
export interface GreatPersonActCommand extends PlayerCommand {
  type: 'greatPersonAct';
  unitId: number;
}

/**
 * Spends a great person on its family's work — the ground.
 *
 * `buildImprovement` without the improvement: *which* work is the family's, read
 * off the roster, so a client cannot ask a merchant to plant an academy. The
 * ground is held to exactly the rules a worker's farm is held to
 * (`improvementErrorAt`), and the piece is consumed whole rather than charged.
 *
 * Turn-gated like every other act.
 */
export interface GreatPersonWorkCommand extends PlayerCommand {
  type: 'greatPersonWork';
  unitId: number;
}

/**
 * Opens a trade route between two of your own cities, and puts one of your
 * caravans on it.
 *
 * The trader is **not** consumed: it walks the route for as long as the route
 * runs, laying road under its feet on every hex it rests on (a **land** route;
 * a sea route lays none — see `mode`), and shuttles back
 * and forth between the two towns until the route lapses. That is the design
 * decision the doc left open (Civ V consumes the caravan on arrival) and it is
 * made this way because it is what makes the piece worth defending — a caravan
 * on the road is a thing an enemy can ride down, which is the user's ruling.
 *
 * It names **both cities and never a path**: the route is a fact about two
 * towns, and the walk is the pipeline's business exactly as `moveUnit` names a
 * target and never a route. **Where the trader is standing is not asked** — the
 * user's ruling of 2026-08-28 ("I want to remove all micromanagement of units"):
 * the piece teleports into the origin's gates and sets out from there, so a
 * caravan idling in a field is one click from useful again. See `trade.ts`'s
 * module docblock for why that trade is the right one.
 *
 * Everything is validated by `startRouteError` before a field is written, so a
 * refusal leaves the state byte-identical like every other handler. Turn-gated
 * like every other order.
 */
export interface StartRouteCommand extends PlayerCommand {
  type: 'startRoute';
  unitId: number;
  /** The origin. Must be a city of `playerId`'s; the caravan appears in it. */
  fromCityId: number;
  /** The partner. Must be another city of `playerId`'s. */
  toCityId: number;
  /**
   * **Which way the caravan goes** — by land, wearing a road, or by sea, laying
   * none (the user's ruling, 2026-09-03; `trade.ts`'s last docblock section).
   *
   * Optional because it is a *choice*, and a choice only exists where both are
   * possible: the interface offers two buttons when `routeModesAvailable` says
   * two, one when it says one, and names the mode either way. An **absent**
   * field resolves through `surveyRoute`'s documented default — **land where a
   * land path exists, else sea** — which is what an old log, a hand-written
   * command and a bot that names nothing all get.
   *
   * Validated like everything else: a mode with no path of that mode is a
   * refusal, and a refused command leaves the state byte-identical.
   */
  mode?: RouteMode;
}

export interface SetAutoResendCommand extends PlayerCommand {
  type: 'setAutoResend';
  unitId: number;
  on: boolean;
}

/**
 * Ends a caravan's route now.
 *
 * `cancelOrder` for a route rather than for a march, and deliberately a separate
 * verb: cancelling the *order* stops the walk and leaves the route running,
 * while this ends the route and leaves the piece exactly where it is — still
 * holding whatever waypoints it had, so it walks home and then idles like any
 * other unit that has finished its order. Two different things a player might
 * mean, and one verb for each.
 *
 * The slot is freed the instant this returns, which is the reason a player
 * reaches for it: a caravan tied to a partner that has stopped being worth it is
 * a market's worth of capacity standing idle.
 */
export interface CancelRouteCommand extends PlayerCommand {
  type: 'cancelRoute';
  unitId: number;
}

/**
 * Lets a unit go: it leaves the board, for good.
 *
 * The user's ruling of 2026-08-29 — "we need a way to delete units too". An
 * empire pays maintenance every turn for the army it keeps (`upkeep.ts`), and
 * until now the only way to stop paying for a warrior nobody needs was to walk
 * it into somebody. The creditors already take a piece off a seat deep enough
 * in arrears; this is the same act done *on purpose*, before the arrears.
 *
 * **No movement requirement**, and that is the deliberate half: a piece may be
 * let go at any point in a turn, spent or fresh, because giving up a unit is
 * not work it does — it is a decision about the payroll. It is otherwise the
 * plainest order in the game: it names a piece, the piece must be yours, and
 * the seat must still be acting.
 *
 * `disbandError` is the whole rule and this handler delegates to it, so the
 * greyed row on the unit sheet and the reducer's refusal are one sentence.
 * The one thing a player must not be able to do here is dissolve a caravan out
 * from under a live route — the route is `Unit.trade` and ending it is the
 * Trade screen's own verb (`cancelRoute`), which is what the refusal says.
 *
 * Turn-gated like every other order.
 */
export interface DisbandUnitCommand extends PlayerCommand {
  type: 'disbandUnit';
  unitId: number;
}

/**
 * Declares war on another empire (`docs/war-diplomacy.md`, section 2).
 *
 * An ordinary command in every respect — validated in full, logged, replayed —
 * and free: there is no authority price, no happiness toll and no casus belli
 * in v1. What it changes is a *legality*: from the moment the row is written,
 * blows, raids and border crossings between the two are legal, and the trade
 * running between them stops.
 *
 * **A surprise war is legal**, and it needs no rule of its own: this command
 * and the attacks that follow it are separate entries in the same turn's log,
 * resolved in log order like everything else, so declaring and striking in one
 * window is simply two commands (the user's ruling, section 2).
 *
 * Turn-gated like every other order: a seat that has ended its turn is not
 * acting, and a declaration is an act.
 */
export interface DeclareWarCommand extends PlayerCommand {
  type: 'declareWar';
  /** The empire to declare on. Never yourself, never the wild. */
  targetId: number;
}

/**
 * Puts a standing white-peace offer on a war (`docs/war-diplomacy.md`,
 * section 4; 9b's "empty proposal = white peace").
 *
 * It resolves nothing by itself. Turns are simultaneous, so agreement cannot be
 * a handshake inside one command — the flag stands until it is withdrawn or the
 * war ends, and `settleDiplomacy` (`turn.ts`) closes every war *both* sides have
 * signed at the end of the turn. See `diplomacy.ts` for why that is the shape.
 *
 * **The terms are optional** (schema 57). With neither `give` nor `take` this
 * is the P1 command byte for byte, and it means *sign whatever paper is on the
 * table* — which, with nothing on it, is the white peace it always was. With
 * terms it is a new paper: coin, tribute, lent seams, a right of way and
 * **towns**, which change hands in a peace and nowhere else (the ruling, 9b).
 * Writing a paper voids the signatures on the last one, so a counter-offer is
 * this same command (see `setPeaceOffer` in `wars.ts`).
 */
export interface ProposePeaceCommand extends PlayerCommand {
  type: 'proposePeace';
  targetId: number;
  /** What this empire hands over. Absent means "sign what is on the table". */
  give?: DealTerms;
  /** What this empire asks for. Absent with `give` present means "nothing". */
  take?: DealTerms;
}

/** Takes a standing peace offer back off the table. `proposePeace`'s mirror. */
export interface WithdrawPeaceCommand extends PlayerCommand {
  type: 'withdrawPeace';
  targetId: number;
}

/**
 * Puts a bargain to another empire (`docs/war-diplomacy.md`, section 7).
 *
 * It moves nothing. A proposal is a standing, revocable paper — `acceptDeal`
 * is what executes it, and it is the other seat's command, so nothing about a
 * bargain happens without both empires having issued one. Terms are named from
 * the **proposer's** side: `give` is what they hand over, `take` what they ask
 * for.
 *
 * Towns are refused here in plain words: a city changes hands in a peace deal
 * and nowhere else (the ruling, 9b), and so is a bargain with an empire this
 * seat is at war with — terms belong on the peace paper while there is a war on.
 *
 * Turn-gated like every other order.
 */
export interface ProposeDealCommand extends PlayerCommand {
  type: 'proposeDeal';
  targetId: number;
  give: DealTerms;
  take: DealTerms;
}

/**
 * Signs a bargain put to this empire, executing it **immediately** and in
 * command order — the deterministic half, and the reason acceptance is a
 * command rather than a phase: two seats accepting in the same window resolve
 * in the order their commands were logged, like every other contention.
 *
 * Both halves are re-validated from scratch (`answerDealError`), because the
 * coin may have been spent and the mine may have been pillaged since the paper
 * was written. The deal's twenty turns start the turn it is signed.
 */
export interface AcceptDealCommand extends PlayerCommand {
  type: 'acceptDeal';
  dealId: number;
}

/** Refuses a bargain put to this empire. Always legal for the seat that was asked. */
export interface DeclineDealCommand extends PlayerCommand {
  type: 'declineDeal';
  dealId: number;
}

/** Takes back a bargain this empire put to another. `proposeDeal`'s mirror. */
export interface WithdrawDealCommand extends PlayerCommand {
  type: 'withdrawDeal';
  dealId: number;
}

/**
 * Takes a puppet into the empire proper — full authority, full contentment,
 * and a queue its owner may set (`docs/war-diplomacy.md`, 9b).
 *
 * **Anytime and irreversible**: there is no window, no cost and no verb that
 * turns it back. A captured town starts as a puppet (`captureCity`), and this
 * is the one decision a captor is offered about it.
 */
export interface AnnexCityCommand extends PlayerCommand {
  type: 'annexCity';
  cityId: number;
}

/**
 * Pulls a town down. Immediate, and there is no window in which it is offered:
 * a captor may raze anything they hold except a seat of government
 * (`razeCityError` names the rule).
 *
 * The site keeps whatever was built on the ground around it — nothing
 * regenerates a tile mid-game — and the hexes go back to nobody's. See
 * `razeCityAt` for the whole of what it takes with it.
 */
export interface RazeCityCommand extends PlayerCommand {
  type: 'razeCity';
  cityId: number;
}

/** Every legal mutation of the game, as serializable data. */
export type Command =
  | EndTurnCommand
  | MoveUnitCommand
  | CancelOrderCommand
  | SpawnUnitCommand
  | FoundCityCommand
  | SetCityProductionCommand
  | SetLockedTilesCommand
  | SetCitizenFocusCommand
  | DismissSpecialistCommand
  | ChooseResearchCommand
  | DequeueResearchCommand
  | AttackCommand
  | FortifyCommand
  | SleepUnitCommand
  | SetAutoExploreCommand
  | BuildImprovementCommand
  | ChopFeatureCommand
  | ProspectCommand
  | PillageCommand
  | PurchaseTileCommand
  | ChooseDiscoveryCommand
  | ChooseOrderCommand
  | SlotOrderCommand
  | UnslotOrderCommand
  | AdoptGovernmentCommand
  | ChooseDoctrineCommand
  | PurchaseItemCommand
  | ContributeCommand
  | ConsecrateCommand
  | ChooseBeliefCommand
  | PerformRiteCommand
  | PlantHolySiteCommand
  | GainBeliefCommand
  | PurgeCommand
  | ProclaimCommand
  | RedraftBeliefsCommand
  | RenameReligionCommand
  | ChooseGreatPersonCommand
  | PurchaseGreatPersonOfferCommand
  | GreatPersonActCommand
  | GreatPersonWorkCommand
  | StartRouteCommand
  | SetAutoResendCommand
  | CancelRouteCommand
  | DisbandUnitCommand
  | DeclareWarCommand
  | ProposePeaceCommand
  | WithdrawPeaceCommand
  | AnnexCityCommand
  | RazeCityCommand
  | ProposeDealCommand
  | AcceptDealCommand
  | DeclineDealCommand
  | WithdrawDealCommand;

/** Convenience alias for the discriminant. */
export type CommandType = Command['type'];

/**
 * What a command did, from the reducer's side.
 *
 * `arrivals` is the one thing a successful command reports beyond "it worked",
 * and it is present only when there is something to report — a ruin claimed, a
 * camp burnt out (see `arrival.ts`). Two commands can produce one: `moveUnit`,
 * whose march may cross several such hexes, and `attack`, whose melee winner may
 * advance onto one.
 *
 * It is here rather than derived by the interface because it is a *difference*
 * that stops existing the instant the command returns — the camp is gone, its
 * bounty is already in the treasury, and asking the board afterwards which town
 * received the provisions would be a second implementation of `nearestOwnedCity`
 * standing beside the one that actually paid. That is the same argument
 * `onDamage` and `researchSince` make in `controls.ts`, answered one layer lower
 * because this is the layer that knows.
 *
 * Absent on every other command and on every ordinary march, so a caller that
 * has never heard of it — a test asserting `{ ok: true }`, a replay, a network
 * peer — is unaffected.
 */
export type CommandResult =
  | {
      ok: true;
      arrivals?: ArrivalReport[];
      combats?: CombatOutcome[];
      wonders?: WonderCompletion[];
      triumphs?: TriumphAward[];
      grants?: CompletionGrantReport[];
      consecrations?: ConsecrationReport[];
      routesEnded?: RouteEndReport[];
      exploreEnded?: ExploreEndReport[];
      sieges?: SiegeReport[];
      pillages?: PillageReport[];
      disbanded?: DisbandReport[];
      starved?: StarvationReport[];
      guilds?: GuildReport[];
      proclaimed?: ProclamationReport;
      purged?: PurgeReport;
      prospect?: ProspectReport;
      campBounties?: { ownerId: number; col: number; row: number; bounty: CampBounty }[];
      beads?: BeadAward[];
      beadAgeOpened?: BeadAge;
      /**
       * **The Magnum Opus is open to the world**, said once, on the command that
       * opened it (design ledger Entry LVIII).
       *
       * `beadAgeOpened`'s sibling and here for exactly its argument. The reading
       * is *derived* — any real seat holding the closing technology (`opusOpen`,
       * `tech.ts`) — and deliberately not a flag on the state, so nothing on the
       * board says the answer changed *this* command rather than eight turns
       * ago. Without this an interface wanting to announce the finish line would
       * keep its own copy of last turn's answer and diff it, which is a second
       * clock and how a reload comes to announce something a decade old.
       *
       * Written in `applyCommand`, the one funnel every command passes through,
       * for the bead diff's reason: the technology may land in the research
       * phase of an `endTurn`, or mid-command through a windfall that finished
       * it, and a handler that forgot would be a finish line nobody was told
       * about.
       */
      opusOpened?: boolean;
      /**
       * A war opening, from `declareWar` alone (`WarDeclaredReport`).
       *
       * `wonders`' kind of news: **not filtered by seat**, because a
       * declaration is public and everybody hears it (`docs/war-diplomacy.md`,
       * section 1). It is a *difference* like every other field on this shape —
       * by the time this returns there is simply a row in `state.wars`, and
       * nothing on the board says it was written this command rather than nine
       * turns ago.
       */
      warDeclared?: WarDeclaredReport;
      /**
       * Every war that ended, and the armies each peace sent home
       * (`PeaceOutcome`). From `endTurn` alone: peace is resolved by the
       * `settleDiplomacy` phase, because both sides have to have signed and
       * turns are simultaneous.
       *
       * `warDeclared`'s sibling and public for its reason exactly.
       */
      peaces?: PeaceOutcome[];
      /**
       * A town pulled down, from `razeCity` alone (`RazeReport`).
       *
       * `proclaimed`'s kind of field — one act on one board, so not a list —
       * and `arrivals`' argument in a fourth currency: by the time this returns
       * the city is not in `state.cities`, its ground is unclaimed, and no diff
       * of two boards can say what stood there.
       */
      razed?: RazeReport;
      /**
       * A bargain that was signed and what it moved (`DealExecution`), from
       * `acceptDeal` alone.
       *
       * `arrivals`' argument once more: the coin is spent, the towns have
       * changed hands and the row is open by the time this returns, and no diff
       * of two boards could say which paper did it.
       */
      dealSigned?: DealExecution;
      /**
       * Bargains that stopped standing (`DealEndReport`). Two commands produce
       * it: `declareWar`, which cancels every deal between the pair, and
       * `endTurn`, whose broom sweeps the ones that have run out.
       */
      dealsEnded?: DealEndReport[];
    }
  | { ok: false; error: string };

/**
 * Builds a success, writing each optional field **only when it has something in
 * it** — so the overwhelmingly common result is byte-identical to the
 * `{ ok: true }` this used to be, and a caller that has never heard of either
 * field is unaffected.
 *
 * `combats` is `arrivals`' sibling and joined this signature for the same
 * argument (see the docblock above): a blow struck **inside a resolution** is a
 * difference that stops existing the instant the command returns — by then the
 * raider has been paid, the worker has changed hands, and the board cannot be
 * asked who hit whom. Two commands produce it: `endTurn`, whenever the wild
 * struck during the resolution, and `attack`, whose own blow rides along for
 * the one figure the attacker cannot otherwise see — a plundered caravan's
 * `CombatOutcome.plundered` (see `applyAttack`). The interface filters the list
 * by the seat at the keyboard; the reducer has no opinion about who is
 * watching.
 *
 * `wonders` is the third, from the same command and for the same reason, with
 * one difference the interface leans on: it is **not** filtered by seat. A
 * wonder finishing is news to everybody, including — especially — the empires
 * that were building it and have just been handed their hammers back as gold.
 *
 * `grants` is the fifth and the narrowest: what a finished building *handed
 * over* — the Statue of Zeus' free sword, the Great Library's technology, the
 * Theatre of Dionysus' Doctrine draft (`CompletionGrantReport`). News to its
 * owner alone, and a difference like every other field here: by the time this
 * returns the piece is on the board, the node is in the list and the offer is on
 * the seat, so nothing downstream could re-derive which building did it.
 *
 * `routesEnded` is the sixth, from `endTurn` alone: every route `marchTraders`
 * dropped or renewed during the resolution (`TurnReport.routesEnded`), news for
 * the same reason a wonder is — by the time this returns the caravan's
 * `Unit.trade` has already been rewritten or deleted, and no diff of two boards
 * can say which caravans came home this turn.
 *
 * `sieges` is the seventh, also from `endTurn` alone: every town the heal phase
 * found cut off, and what the siege cost it (`SiegeReport`). A siege is derived
 * from where the armies stand and never stored, so this is the only place the
 * interface can learn that Uruk is starving rather than merely wounded.
 *
 * `pillages` is the eighth and the first that is news to **two** seats at once
 * (2026-08-28, the wild's raiding pass). Two commands produce it: `pillage`,
 * carrying the raider's own figures — which the announcement could not otherwise
 * get right, because a rider is part of the printed number and
 * `RULES.improvements.pillageGold` is only the base — and `endTurn`, carrying
 * every farm the wild burnt during the resolution. A `PillageReport` names both
 * the raider and the empire whose ground it was, so the interface can tell
 * "your column burnt a farm" from "somebody burnt yours" without a second field.
 *
 * `disbanded` is the ninth, from `endTurn` alone: every piece the creditors took
 * off an empire deep enough in arrears (`DisbandReport`, the maintenance ruling
 * of 2026-08-28). A difference like every other field here — by the time this
 * returns the unit is simply not in `state.units`, and nothing distinguishes a
 * warrior sold for debt from a warrior killed — and the one entry in the list
 * that names something the player neither chose nor had done to them by another
 * seat, which is exactly why it has to be said out loud.
 *
 * `starved` is the tenth, from `endTurn` alone: every city whose basket lost
 * food during the resolution, and what became of it (`StarvationReport`, the
 * user's ruling of 2026-08-29). `disbanded`'s sibling and a difference for the
 * identical reason — by the time this returns the basket has already moved and
 * a citizen has already been taken if the deficit reached the floor, so no diff
 * of two boards can say whether a town lost food this turn or spent a healthy
 * surplus on nothing.
 *
 * `guilds` is the eleventh, from `endTurn` alone: every city where a citizen
 * left the fields for a trade during the resolution (`GuildReport`, ledger Entry
 * XLVIII). `starved`'s sibling and a difference for its reason — by the time
 * this returns the assignment has already been rewritten around the new
 * guildsman, and nothing on the board says why a town works one hex fewer than
 * it did. The interface announces a city's **first** guild and nothing after,
 * which is a property of the report rather than a flag: the first is the one
 * whose `count` is one.
 *
 * `proclaimed` is the twelfth and the only one that is **not** a list, which is
 * why it is set beside this helper rather than passed through it: a proclamation
 * is one act on one board, and an eleventh positional `undefined` on every other
 * caller would be a worse price than the two lines it saves. Two commands
 * produce it — `proclaim`, a prophet's faith bomb, and `performRite`, the
 * augur's Preaching — and it is `arrivals`' argument in a third currency: by the
 * time this returns the citizens have turned and nothing on the board says which
 * towns were spoken to (see `ProclamationReport`).
 *
 * `campBounties` is the thirteenth, from `endTurn` alone (`TurnReport.campBounties`,
 * 2026-08-29): every camp a **standing order** burnt out during the resolution,
 * which `spendLeftoverMovement` and `resetMovement` cannot report any other way
 * — they are phases, with no `CommandResult` of their own to write into. A camp
 * a fresh `moveUnit` clears is still `arrivals`' own field; this is only the
 * gap a phase leaves.
 *
 * `exploreEnded` is the fourteenth, from `endTurn` alone
 * (`TurnReport.exploreEnded`, 2026-08-30): every piece whose auto-explore ran
 * out of world during the resolution. `routesEnded`'s argument one verb over —
 * by the time this returns the flag is simply gone from the unit, and no diff
 * of two boards can say the search came back empty rather than never having
 * run.
 *
 * `purged` is the fifteenth and `proclaimed`'s mirror, from `purge` alone
 * (Entry LVIII): what an inquisitor stripped off the towns around it. Set beside
 * the helper for `proclaimed`'s reason exactly — it is one act on one board, not
 * a list of them — and carried out for `arrivals`' reason: by the time this
 * returns the banks are empty and the congregations are smaller, and no diff of
 * two boards could tell an inquisitor's work from a rival's bad turn.
 */
function ok(
  arrivals?: readonly ArrivalReport[],
  combats?: readonly CombatOutcome[],
  wonders?: readonly WonderCompletion[],
  triumphs?: readonly TriumphAward[],
  grants?: readonly CompletionGrantReport[],
  routesEnded?: readonly RouteEndReport[],
  sieges?: readonly SiegeReport[],
  pillages?: readonly PillageReport[],
  disbanded?: readonly DisbandReport[],
  starved?: readonly StarvationReport[],
  guilds?: readonly GuildReport[],
  campBounties?: readonly { ownerId: number; col: number; row: number; bounty: CampBounty }[],
  exploreEnded?: readonly ExploreEndReport[],
): CommandResult {
  const result: CommandResult = { ok: true };
  if (arrivals !== undefined && arrivals.length > 0) result.arrivals = [...arrivals];
  if (combats !== undefined && combats.length > 0) result.combats = [...combats];
  if (wonders !== undefined && wonders.length > 0) result.wonders = [...wonders];
  if (triumphs !== undefined && triumphs.length > 0) result.triumphs = [...triumphs];
  if (grants !== undefined && grants.length > 0) result.grants = [...grants];
  if (routesEnded !== undefined && routesEnded.length > 0) result.routesEnded = [...routesEnded];
  if (sieges !== undefined && sieges.length > 0) result.sieges = [...sieges];
  if (pillages !== undefined && pillages.length > 0) result.pillages = [...pillages];
  if (disbanded !== undefined && disbanded.length > 0) result.disbanded = [...disbanded];
  if (starved !== undefined && starved.length > 0) result.starved = [...starved];
  if (guilds !== undefined && guilds.length > 0) result.guilds = [...guilds];
  if (campBounties !== undefined && campBounties.length > 0) result.campBounties = [...campBounties];
  if (exploreEnded !== undefined && exploreEnded.length > 0) result.exploreEnded = [...exploreEnded];
  return result;
}

function fail(error: string): CommandResult {
  return { ok: false, error };
}

/**
 * Reads the discriminant defensively: `command` is typed, but at runtime it may
 * have come from a save file or the network, so it may be anything.
 */
function readCommandType(command: Command): string | undefined {
  const value: unknown = command;
  if (typeof value !== 'object' || value === null) return undefined;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' ? type : undefined;
}

/**
 * The `default` branch of the reducer.
 *
 * `kind` is typed `never`, so the moment a member of `Command` has no `case`
 * this call stops compiling. It still produces a runtime error too, because the
 * command may have arrived from a save file or a socket and be anything at all
 * — hence the separately-read `type` string for the message.
 */
function unhandledCommand(_kind: never, type: string): CommandResult {
  return fail(`Unknown command type "${type}"`);
}

// --- handlers ---------------------------------------------------------------

/**
 * The player a command claims to come from, or an error naming what is wrong.
 *
 * Every handler starts here, before it looks at anything the command is *about*.
 * The `turnEnded` length check belongs with it rather than in `endTurn` alone:
 * the flags are the turn, and a state whose flags do not line up with its
 * players is one no handler should be reasoning about.
 */
function resolveActor(state: GameState, playerId: unknown): Player | string {
  if (state.turnEnded.length !== state.players.length) {
    return (
      `Corrupt turnEnded: ${state.turnEnded.length} flag(s) for ` +
      `${state.players.length} player(s)`
    );
  }
  if (typeof playerId !== 'number' || !Number.isInteger(playerId)) {
    return `Command needs an integer playerId, got ${String(playerId)}`;
  }
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  return player;
}

/**
 * Marks one seat finished, and resolves the turn when it was the last one.
 *
 * Under simultaneous turns this is the only thing that moves the world: the
 * end-of-turn phases run *before* the counter advances, so a phase still sees
 * the turn that is ending, and every seat is reopened in the same breath so the
 * next window starts with nobody finished.
 */
function applyEndTurn(state: GameState, command: EndTurnCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has already ended turn ${state.turn}`);
  }

  state.turnEnded[actor.id] = true;
  if (!allTurnsEnded(state)) return ok();

  // The resolution reports what it did — every blow the wild landed, every
  // wonder somebody finished, and every Triumph anybody earned. See
  // `TurnReport`: by the time this returns the raider has been paid, the board
  // cannot be asked who hit whom, a city beaten to a wonder has already had its
  // basket turned into gold, and the renown a triumph paid may already have
  // dealt somebody a great person.
  const report = runEndOfTurn(state);
  clearTurnEnded(state);
  state.turn += 1;
  const result = ok(
    undefined,
    report.combats,
    report.wonders,
    report.triumphs,
    report.grants,
    report.routesEnded,
    report.sieges,
    report.pillages,
    report.disbanded,
    report.starved,
    report.guilds,
    report.campBounties,
    report.exploreEnded,
  );
  // The resolution's beads, **with the boon lines the settlements produced** —
  // set beside the helper rather than passed through it for `proclaimed`'s
  // reason (a fourteenth positional argument on every other caller is a worse
  // price than the two lines it saves), and set *before* `applyCommand`'s own
  // diff runs, which is what stops the same bead being announced twice.
  if (result.ok && report.beads.length > 0) result.beads = [...report.beads];
  // Every cathedral dedicated during the resolution. Set beside the helper
  // rather than passed through it, for `beads`' stated reason exactly: a
  // fifteenth positional argument on every other caller is a worse price than
  // the two lines it saves.
  if (result.ok && report.consecrations.length > 0) {
    result.consecrations = [...report.consecrations];
  }
  // And the age, on the one turn in a game that opens one: a fact about the
  // *transition*, which is what every field on this shape is.
  if (result.ok && report.beadAgeOpened !== undefined) {
    result.beadAgeOpened = report.beadAgeOpened;
  }
  // Every war the resolution ended, with the columns each peace walked home.
  // Set beside the helper for `beads`' stated reason exactly.
  if (result.ok && report.peaces.length > 0) result.peaces = [...report.peaces];
  // The bargains the broom swept out — `peaces`' sibling, and reported for its
  // reason: a moment later there is simply no row to ask.
  if (result.ok && report.dealsEnded.length > 0) result.dealsEnded = [...report.dealsEnded];
  return result;
}

/** Reads an offset cell defensively; commands may arrive from a save or a socket. */
function readCell(value: unknown): Cell | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { col, row } = value as { col?: unknown; row?: unknown };
  if (!Number.isInteger(col) || !Number.isInteger(row)) return undefined;
  return { col: col as number, row: row as number };
}

/**
 * Moves a unit as far towards `target` as this turn allows, storing the rest of
 * the route as a standing order.
 *
 * Everything is checked before anything is written: an illegal order leaves the
 * unit — position, movement, standing order — exactly as it was. Note that the
 * *target* is checked with `canStopOn` rather than merely being passable, so an
 * order that could only ever end on top of a friendly unit is refused up front
 * rather than half-walked.
 *
 * The tile checks read the board as it stands *at this point in the log*, which
 * is what makes contention between simultaneous players fall out for free: the
 * loser of a race for a tile finds it occupied and is refused.
 */
function applyMoveUnit(state: GameState, command: MoveUnitCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot move`);
  }

  const target = readCell(command.target);
  if (!target) return fail('moveUnit needs an integer target { col, row }');

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  // **No movement left is not a refusal** (playtest batch two). A spent unit
  // given a march records the route and walks none of it: `advanceAlongPath`
  // takes no step it cannot pay for, so an allowance of zero stores the whole
  // path and moves nothing, and `resetMovement` sets off next turn. That is what
  // a player means by ordering a unit that has already moved — "go there,
  // starting when you can" — and refusing it made the last click of a unit's
  // turn the one click that did nothing. Every other gate below still applies,
  // so an order that could never be walked is still refused rather than parked.

  // `getTileAt` wraps the column, so an un-wrapped target from the UI resolves
  // to the tile the player actually clicked.
  const tile = getTileAt(state.map, target.col, target.row);
  if (!tile) return fail(`Target (${target.col}, ${target.row}) is off the map`);
  if (tile.col === unit.col && tile.row === unit.row) {
    return fail(`Unit ${unit.id} is already on (${tile.col}, ${tile.row})`);
  }
  if (!canStopOn(state, unit, tile)) {
    // A foreign city gets its own sentence rather than the coordinate-shaped
    // default: `canTransit`'s refusal here is a design choice (2026-08-28 —
    // capture, not a march, is how a town changes hands) and a player who
    // clicked a city should be told that, not handed a coordinate that reads
    // like a pathing failure.
    const blockedBy = cityAt(state, tile.col, tile.row);
    if (blockedBy !== undefined && blockedBy.ownerId !== unit.ownerId) {
      return fail(`${blockedBy.name} is another empire's city — take it by force`);
    }
    /**
     * **A closed border gets its own sentence too**, for the foreign city's
     * reason exactly (the war ruling, section 3): the refusal is a *rule* a
     * player is meant to learn, and a coordinate reads like a pathing failure.
     *
     * Asked only when the hex is somebody else's and the mover is one the rule
     * binds, so the sentence is never printed about ground the piece was
     * refused for some other reason — the ordinary default still covers water,
     * mountains, a full stack and a foreign unit standing there.
     */
    const holder = tileOwnerPlayerId(state, tile.col, tile.row);
    if (
      holder !== null &&
      holder !== unit.ownerId &&
      !isCivilian(unitDef(unit.type)) &&
      !atWar(state, unit.ownerId, holder)
    ) {
      const them = playerById(state, holder)?.name ?? 'that empire';
      return fail(`You are not at war with the ${them} — their land is closed to your armies`);
    }
    return fail(`Unit ${unit.id} cannot stop on (${tile.col}, ${tile.row})`);
  }

  // The route is found over the *true* map, not over what this seat has charted.
  // That is the Civ rule and it is deliberate (see `visibility.ts`): fog is a
  // mask the interface reads, not a second blinded copy of the world, so a
  // player may order a march into Terra Incognita and find out what is there by
  // walking into it.
  const path = findPath(state, unit, tile);
  if (!path) return fail(`No path from (${unit.col}, ${unit.row}) to (${tile.col}, ${tile.row})`);

  const walk = advanceAlongPath(state, unit, path);
  // The unit moved, so what its owner can see moved with it. One recompute per
  // order rather than one per step: `advanceAlongPath` may walk five tiles, and
  // only where it stopped decides what is lit.
  recomputeVisibility(state, actor.id);
  // What the march crossed, if it crossed anything — see `CommandResult`.
  return ok(walk.arrivals);
}

/**
 * Drops a unit's standing order. Nothing else about the unit changes.
 *
 * Fully validated before the single mutation, like every other handler: a
 * refusal leaves the unit's `path` — and everything else — byte-identical. The
 * key is *deleted* rather than emptied, which is `movement.ts`'s convention for
 * an idle unit (see its docblock): a unit that never had an order and a unit
 * whose order was cancelled must serialise the same way, or two states that are
 * the same game would not compare equal.
 */
function applyCancelOrder(state: GameState, command: CancelOrderCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot cancel orders`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  // `length === 0` is only reachable from a hand-edited save; either way there
  // is no order to cancel.
  const marching = unit.path !== undefined && unit.path.length > 0;
  // Sleep is a standing order too — the cheapest one there is (`Unit.sleeping`)
  // — and this is the verb that means "never mind". Waking is not a command of
  // its own for the reason `SleepUnitCommand` gives, so it is this one's second
  // subject rather than a fifteenth entry in the union. The flag itself is
  // cleared by `applyCommand`, which wakes the unit *any* accepted order names;
  // all this handler owes is agreeing there was something to cancel.
  // Auto-explore is the third subject (2026-08-30), for sleep's reason: it is
  // a standing order with no wake verb of its own, and "never mind" is this
  // command. The flag itself is cleared by `applyCommand`'s one seam.
  if (!marching && unit.sleeping !== true && unit.autoExplore !== true) {
    return fail(`Unit ${unit.id} has no standing order`);
  }

  if (marching) delete unit.path;
  return ok();
}

/**
 * Places a new unit, if the terrain allows it and the stack has room.
 *
 * Both ids are validated: `playerId` (who asked) and `ownerId` (whose unit it
 * becomes). See `SpawnUnitCommand` for why they are allowed to differ.
 */
function applySpawnUnit(state: GameState, command: SpawnUnitCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);

  const at = readCell(command.at);
  if (!at) return fail('spawnUnit needs an integer position { col, row }');
  if (!isUnitTypeId(command.unitType)) {
    return fail(`Unknown unit type "${String(command.unitType)}"`);
  }
  if (!playerById(state, command.ownerId)) {
    return fail(`No owner with id ${String(command.ownerId)}`);
  }

  const tile = getTileAt(state.map, at.col, at.row);
  if (!tile) return fail(`Position (${at.col}, ${at.row}) is off the map`);
  if (!isPassable(tile)) return fail(`(${tile.col}, ${tile.row}) is impassable`);

  const { category } = unitDef(command.unitType);
  if (!hasStackingRoom(state, tile.col, tile.row, category)) {
    return fail(
      `(${tile.col}, ${tile.row}) already holds ` +
        `${RULES.stacking.perCategoryPerTile} ${category} unit(s)`,
    );
  }

  createUnit(state, command.ownerId, command.unitType, tile.col, tile.row);
  return ok();
}

/**
 * Spends a settler to found a city where it stands.
 *
 * Everything is checked before anything is written, and the checks run in the
 * order a player would think of them: is this my unit, can it still act, can a
 * city stand *here*, and is here far enough from everybody else's cities.
 *
 * `movesLeft > 0` is required for the same reason a move is: founding is this
 * unit's action for the turn, and a settler that has already marched its full
 * allowance has spent it. The spacing rule counts *every* city, not just the
 * player's own — two empires cannot interleave their capitals.
 */
function applyFoundCity(state: GameState, command: FoundCityCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot found a city`);
  }

  const unit = unitById(state, command.settlerUnitId);
  if (!unit) return fail(`No unit with id ${String(command.settlerUnitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  // Everything about the *ground* — the unit's type and health, the terrain,
  // the territory and the spacing — is one shared rule, so that the UI's
  // "Found City" button can be enabled by exactly what this will accept.
  const problem = foundingError(state, unit);
  if (problem) return fail(problem);

  const tile = getTileAt(state.map, unit.col, unit.row)!;
  // Validation is done: the settler becomes the city.
  removeUnit(state, unit.id);
  foundCityAt(state, actor.id, tile);
  return ok();
}

/**
 * Reads one queue item defensively. Commands arrive from saves and sockets, so
 * neither the shape nor the ids can be trusted.
 */
function readQueueItem(value: unknown): QueueItem | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { kind, id } = value as { kind?: unknown; id?: unknown };
  if (kind === 'unit' && isUnitTypeId(id)) return { kind, id };
  if (kind === 'building' && isBuildingId(id)) return { kind, id };
  if (kind === 'project' && isProjectId(id)) return { kind, id };
  return undefined;
}

/**
 * Validates a whole queue against a city, returning the sanitised items or an
 * error message.
 *
 * The rules a queue must satisfy, and why each is checked *here* rather than
 * being tolerated and skipped later:
 *
 *   - every id is real. A typo in a queue silently blocking production for a
 *     hundred turns is the worst possible failure mode.
 *   - a building is built once. Already in `city.buildings`, or twice in this
 *     queue, is a mistake the player cannot see the consequences of.
 *   - a **project** is likewise queued once, and for the same reason read one
 *     scale further: a project never leaves the queue (Entry XXVI), so a second
 *     copy of Tithes is not a second conversion, it is a row that can never be
 *     reached and a queue that has silently stopped below it.
 *   - a unit's `minCityPop` is met *now*. A settler queued in a size-1 city is
 *     almost always a misclick. (If the city later shrinks below it, production
 *     holds instead — see `advanceProduction`. Refusing at the gate and holding
 *     afterwards are the same rule read at the two moments it can be read.)
 *   - the owner has the technology, and controls the strategic resource. Both
 *     asked through `buildError` (`tech.ts`), which is what the city panel
 *     disables its buttons with — so an offered button and an accepted queue are
 *     one rule, and the sentence the player reads on a refusal is the reducer's
 *     own. Techs are only ever gained, but a resource can be *lost* with the
 *     city that held it, so an item that passed this check can become illegal
 *     while it sits in the queue; `advanceProduction` holds it in that case
 *     rather than dropping it, exactly as it does for `minCityPop`.
 */
function validateQueue(state: GameState, city: City, raw: unknown): QueueItem[] | string {
  if (!Array.isArray(raw)) return 'setCityProduction needs a queue array';

  const items: QueueItem[] = [];
  const seenBuildings = new Set<string>();
  const seenProjects = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const item = readQueueItem(raw[i]);
    if (!item) return `Queue item ${i} is not a known unit, building or project`;

    // The city is handed over so the wonder clause can tell "this town is
    // already building it" (fine — it is what is being re-sent) from "another of
    // my towns is" (a second copy that could never complete). See `buildError`.
    const blocked = buildError(state, city.ownerId, item.kind, item.id, city);
    if (blocked !== null) return blocked;

    if (item.kind === 'building') {
      if (city.buildings.includes(item.id)) {
        return `${city.name} has already built ${item.id}`;
      }
      if (seenBuildings.has(item.id)) return `${item.id} appears twice in the queue`;
      seenBuildings.add(item.id);
    } else if (item.kind === 'project') {
      if (seenProjects.has(item.id)) return `${item.id} appears twice in the queue`;
      seenProjects.add(item.id);
    } else {
      const def = unitDef(item.id);
      if (city.population < def.minCityPop) {
        return (
          `${city.name} needs population ${def.minCityPop} to build a ` +
          `${def.name} (it has ${city.population})`
        );
      }
    }
    items.push(item);
  }
  return items;
}

/** Replaces a city's production queue. See `SetCityProductionCommand`. */
function applySetCityProduction(
  state: GameState,
  command: SetCityProductionCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot set production`);
  }

  const city = cityById(state, command.cityId);
  if (!city) return fail(`No city with id ${String(command.cityId)}`);
  if (city.ownerId !== actor.id) {
    return fail(`City ${city.id} does not belong to player ${actor.id}`);
  }

  const queue = validateQueue(state, city, command.queue);
  if (typeof queue === 'string') return fail(queue);

  // Copy: the command (and the log entry it becomes) must not be aliased into
  // the state, or a caller reusing its array would rewrite history.
  city.queue = queue.map((item): QueueItem => {
    if (item.kind === 'unit') return { kind: 'unit', id: item.id };
    if (item.kind === 'project') return { kind: 'project', id: item.id };
    return { kind: 'building', id: item.id };
  });
  return ok();
}

/**
 * Validates a whole pin list against a city, returning the sanitised cells or
 * an error message.
 *
 * Legality is asked of `assignableTiles` — the very function the assignment
 * runs on — rather than re-derived here from ownership, terrain and distance.
 * One rule, one implementation: a tile the panel can pin is exactly a tile a
 * citizen can be sent to, and the two cannot drift apart.
 */
function validateLockedCells(
  state: GameState,
  city: City,
  raw: unknown,
): Cell[] | string {
  if (!Array.isArray(raw)) return 'setLockedTiles needs a cells array';
  if (raw.length > city.population) {
    return (
      `${city.name} has ${city.population} citizen(s) and cannot pin ` +
      `${raw.length} tile(s)`
    );
  }

  const legal = new Set<number>();
  for (const tile of assignableTiles(state, city)) {
    legal.add(tileIndex(state.map, tile.col, tile.row));
  }

  const cells: Cell[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < raw.length; i++) {
    const cell = readCell(raw[i]);
    if (!cell) return `Locked tile ${i} is not an integer { col, row }`;
    // `getTileAt` wraps the column, so a cell that came from the UI un-wrapped
    // is canonicalised here rather than failing a lookup later.
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) return `Locked tile ${i} (${cell.col}, ${cell.row}) is off the map`;
    const index = tileIndex(state.map, tile.col, tile.row);
    if (!legal.has(index)) {
      return `${city.name} cannot work (${tile.col}, ${tile.row})`;
    }
    if (seen.has(index)) {
      return `(${tile.col}, ${tile.row}) is pinned twice`;
    }
    seen.add(index);
    cells.push({ col: tile.col, row: tile.row });
  }
  return cells;
}

/**
 * Replaces a city's pinned tiles, then re-assigns its citizens on the spot.
 *
 * The immediate re-assignment is deliberate, and it is the *first* entry in the
 * mid-turn register (see `refreshCityDerived` in `cities.ts`, which is now the
 * one implementation of it): pinning a tile is a *direct* manipulation of who
 * works what, and a panel that showed the old dots until the end of the turn
 * would be showing the player that their click did nothing. It is safe because
 * assignment is idempotent and derived — `collectYields` recomputes it from
 * scratch anyway and reaches the same answer.
 */
function applySetLockedTiles(
  state: GameState,
  command: SetLockedTilesCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot assign citizens`);
  }

  const city = cityById(state, command.cityId);
  if (!city) return fail(`No city with id ${String(command.cityId)}`);
  if (city.ownerId !== actor.id) {
    return fail(`City ${city.id} does not belong to player ${actor.id}`);
  }

  const cells = validateLockedCells(state, city, command.cells);
  if (typeof cells === 'string') return fail(cells);

  // Copy, for the same reason the queue is copied: the command becomes a log
  // entry, and a caller that reused its array would be rewriting history.
  city.lockedTiles = cells.map((cell) => ({ col: cell.col, row: cell.row }));
  refreshCityDerived(state, city);
  return ok();
}

/**
 * Writes a town's focus and its avoid-growth mark, then re-seats its citizens on
 * the spot.
 *
 * **Register entry 21** — see `refreshCityDerived` in `cities.ts`. The immediate
 * re-assignment is `applySetLockedTiles`' own reason: this is a direct
 * manipulation of who works what, and a pane showing the old dots until the turn
 * ended would be showing a player that their click did nothing.
 *
 * Everything the *gate* refuses is asked of `citizenFocusError`, the one function
 * the panel greys its control with (`dismissSpecialist`'s bargain). What is
 * checked here and not there is what a *command* has to check and a control never
 * does: that the words carried are words the game knows, because a command may
 * have arrived from a save file or a socket carrying anything at all.
 *
 * Presence is the state on both fields, so `'default'` and `false` **delete**
 * rather than writing a value — a town told to go back to the balanced ordering
 * must serialise exactly like a town nobody ever told anything.
 */
function applySetCitizenFocus(
  state: GameState,
  command: SetCitizenFocusCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);

  const city = cityById(state, command.cityId);
  if (!city) return fail(`No city with id ${String(command.cityId)}`);

  const focus: unknown = command.focus;
  if (focus !== undefined && !isCitizenFocus(focus)) {
    return fail(`"${String(focus)}" is not a citizen focus`);
  }
  const avoid: unknown = command.avoidGrowth;
  if (avoid !== undefined && typeof avoid !== 'boolean') {
    return fail('setCitizenFocus needs avoidGrowth to be true or false');
  }

  const blocker = citizenFocusError(state, actor.id, city);
  if (blocker !== null) return fail(blocker);

  if (focus !== undefined) {
    if (focus === 'default') delete city.focus;
    else city.focus = focus;
  }
  if (avoid !== undefined) {
    if (avoid) city.avoidGrowth = true;
    else delete city.avoidGrowth;
  }
  refreshCityDerived(state, city);
  return ok();
}

/**
 * Sends one guildsman back to the fields. See `DismissSpecialistCommand`.
 *
 * Everything the *gate* refuses is asked of `dismissSpecialistError`, the one
 * function the panel greys its control with, so a Dismiss button is disabled
 * exactly when this would refuse and the sentence a player reads on the hover is
 * the sentence the reducer would have returned. What is checked here and not
 * there is what a *command* has to check and a button never does: that the
 * family named is one the game knows, because a command may have arrived from a
 * save file or a socket carrying anything at all.
 */
function applyDismissSpecialist(
  state: GameState,
  command: DismissSpecialistCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);

  const city = cityById(state, command.cityId);
  if (!city) return fail(`No city with id ${String(command.cityId)}`);
  const family: unknown = command.family;
  if (!isSpecialistFamily(family)) {
    return fail(`"${String(family)}" is not a specialist family`);
  }

  const blocker = dismissSpecialistError(state, actor.id, city, family);
  if (blocker !== null) return fail(blocker);

  dismissSpecialistAt(state, city, family);
  return ok();
}

/**
 * Reads the queue mode off a command defensively, `undefined` for a value that
 * is not one — the reducer trusts a field from a save or a socket only as far as
 * it validates it. An **absent** mode is `'replace'`, which is what every
 * command written before the queue existed meant.
 */
function readQueueMode(value: unknown): ResearchQueueMode | undefined {
  if (value === undefined || value === 'replace') return 'replace';
  return value === 'append' ? 'append' : undefined;
}

/**
 * Aims this player's science at a technology, queueing what it needs. See
 * `ChooseResearchCommand`.
 *
 * Three questions, asked in the order a player would think of them: may this
 * seat still act, is that a mode this build knows, and is that a plan they could
 * install. The last is delegated whole to `researchError` — the same function
 * the tech screen enables its nodes with — so a node the interface offers is a
 * node this accepts.
 *
 * The mutation is `writeResearchPlan`, through `chooseResearchFor`, and it is
 * still not a *spend*: the pool is the progress, and it stays exactly where it
 * was however far the plan moves.
 */
function applyChooseResearch(
  state: GameState,
  command: ChooseResearchCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot choose research`);
  }

  const mode = readQueueMode(command.queue);
  if (mode === undefined) {
    return fail(`chooseResearch queue must be "replace" or "append"`);
  }

  const problem = researchError(state, actor.id, command.techId, mode);
  if (problem) return fail(problem);

  chooseResearchFor(state, actor.id, command.techId, mode);
  return ok();
}

/**
 * Drops a technology — and its dependants — out of this player's plan. See
 * `DequeueResearchCommand`.
 *
 * `applyChooseResearch`'s mirror, down to the split: the seat question belongs
 * to the reducer and the plan question is delegated whole to
 * `dequeueResearchError`, so the button the tech screen greys out and the
 * refusal the reducer makes are the same sentence.
 */
function applyDequeueResearch(
  state: GameState,
  command: DequeueResearchCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot choose research`);
  }

  const problem = dequeueResearchError(state, actor.id, command.techId);
  if (problem) return fail(problem);

  dequeueResearchFor(state, actor.id, command.techId);
  return ok();
}

/**
 * Resolves one attack. See `AttackCommand`, and `combat.ts` for the rules.
 *
 * Three questions belong to the reducer and are asked here — is this a real
 * seat, may it still act, and is that its unit — and every question about the
 * *fight* is delegated whole to `applyCombat`, which validates completely before
 * it writes a single field. That split is what makes the "one evaluator" promise
 * hold at the command boundary too: the interface's forecast comes from
 * `previewCombat`, which is the same computation this resolves, so a forecast
 * the player was shown is a fight the reducer will accept.
 */
function applyAttack(state: GameState, command: AttackCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot attack`);
  }

  const target = readCell(command.target);
  if (!target) return fail('attack needs an integer target { col, row }');

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const result = applyCombat(state, unit.id, target);
  if (!result.ok) return fail(result.error);
  // A melee winner that advanced may have stormed a camp or ridden into a ruin.
  const arrival = result.outcome.arrival;
  // The blow itself is still not reported on `combats` for the ordinary case:
  // an attacker knows it attacked, and the interface narrates its own blow from
  // the forecast it already showed (`reportCombatNotice`). That channel is for
  // news the actor could not otherwise have — a camp's bounty already banked, a
  // raid that happened inside a resolution — and reporting an ordinary blow
  // here would put a field on the overwhelmingly common result for nobody's
  // benefit, which is the promise `CommandResult` makes above.
  //
  // A plundered caravan is the one figure that channel cannot supply: the
  // bounty (`CombatOutcome.plundered`) is composed *inside* `applyCombat`, off
  // the board by the time this returns, and no forecast the interface showed
  // beforehand could have printed a number nobody had rolled yet. So the
  // outcome rides `combats` exactly when there was something plundered — an
  // ordinary kill's result is unchanged, and `reportRaids` (`controls.ts`)
  // still ignores it, because that reader only narrates blows against the
  // *local* seat and an attacker is never its own defender.
  const combats = result.outcome.plundered === null ? undefined : [result.outcome];
  return ok(arrival === null ? undefined : [arrival], combats);
}

/**
 * Digs a unit in. See `FortifyCommand`.
 *
 * The seat's questions here, the unit's delegated to `fortifyError` — the same
 * function the unit sheet enables its Fortify button with, so a live button and
 * an accepted command are one rule. The mutation is a single field.
 */
function applyFortify(state: GameState, command: FortifyCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot fortify`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  const problem = fortifyError(unit);
  if (problem) return fail(problem);

  // Zero, not one: the bonus is paid for turns *survived* dug in, and
  // `advanceFortify` raises this at the end of every turn the unit stays put.
  unit.fortifiedTurns = 0;
  return ok();
}

/**
 * Puts a civilian to sleep. See `SleepUnitCommand`.
 *
 * `applyFortify` line for line, and deliberately so: the seat's questions here,
 * the unit's delegated whole to `sleepError` — the same function the unit sheet
 * enables its Sleep button with, so a live button and an accepted command are
 * one rule — and the mutation is a single field.
 */
function applySleepUnit(state: GameState, command: SleepUnitCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot give orders`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  const problem = sleepError(unit);
  if (problem) return fail(problem);

  unit.sleeping = true;
  return ok();
}

/**
 * Sets or clears a unit's auto-explore. See `SetAutoExploreCommand`.
 *
 * `applySetAutoResend`'s shape: the seat's questions here, the *eligibility*
 * delegated whole to `autoExploreError` — the same function the unit sheet
 * greys its button with, so a live button and an accepted command are one rule
 * — and a value that would change nothing refused, which keeps the log free of
 * commands that say nothing.
 *
 * Turning it on aims the piece at once (`aimExplorer`) — the `startRoute`
 * precedent: the path is written here and the pipeline walks it,
 * `spendLeftoverMovement` on this very turn, so the piece moves the turn it
 * was told to range ahead rather than the one after. An aim that finds nothing
 * deliberately leaves the flag standing: the `marchExplorers` phase is the one
 * place an empty search ends the order, with the report that lets the
 * interface say so.
 */
function applySetAutoExplore(state: GameState, command: SetAutoExploreCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot change orders`);
  }
  if (typeof command.on !== 'boolean') return fail('setAutoExplore needs a boolean "on"');

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  const problem = autoExploreError(unit);
  if (problem) return fail(problem);
  if ((unit.autoExplore === true) === command.on) {
    return fail(`Unit ${unit.id} is ${command.on ? 'already' : 'not'} exploring`);
  }

  if (!command.on) {
    // The one seam excuses this verb from the clearing, so the off half is the
    // handler's own line.
    delete unit.autoExplore;
    return ok();
  }
  // Whatever it was walking toward, the search decides now. The sleep flag is
  // `orderedUnitId`'s business, like every other order's.
  delete unit.path;
  unit.autoExplore = true;
  aimExplorer(state, unit);
  return ok();
}

/**
 * Lays an improvement. See `BuildImprovementCommand`, and `improvements.ts` for
 * the rules.
 *
 * The same three questions every handler asks first — is this a real seat, may
 * it still act, is that its unit — and every question about the *work* delegated
 * whole to `improvementError`, which is what the unit sheet builds its list of
 * offered improvements from. So a row the panel shows is a command this accepts.
 *
 * **The improvement pays this instant**: `buildImprovementAt` refreshes the
 * owning city's derived state itself (`refreshTileDerived` → the register in
 * `refreshCityDerived`), so the panel and the top bar carry the new food before
 * the turn ends rather than after it. It is done down in the mechanism rather
 * than here for the reason the chop's completion is done *here* — a windfall is
 * a decision about a queue and belongs to the reducer, while "the ground is
 * worth something else now" is a fact about the mutation itself.
 */
function applyBuildImprovement(
  state: GameState,
  command: BuildImprovementCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot build`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const problem = improvementError(state, unit.id, command.improvement);
  if (problem) return fail(problem);

  // Validation is done — `improvementError` has already established that the
  // unit is on the map and that the improvement id is real.
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  buildImprovementAt(state, unit, tile, command.improvement);
  return ok();
}

/**
 * Fells a wood. See `ChopFeatureCommand`, and `improvements.ts` for the rules.
 *
 * `applyBuildImprovement`'s twin, question for question: is this a real seat,
 * may it still act, is that its unit — and everything about the *work* delegated
 * whole to `chopError`, which is what the worker sheet greys its Chop row with.
 * So an offered row is a command this accepts, and the sentence a player reads
 * on a refusal is this reducer's own.
 *
 * **The timber settles the basket it lands in** (design ledger, Entry XVIII).
 * `chopFeatureAt` banks the lump, and if that lump covers the front of the
 * owning city's queue the item completes *this instant* rather than waiting for
 * a phase the player has to end their turn to reach — the moment of the gift is
 * the moment of the payoff. It goes through `settleProductionWindfall`, which is
 * `advanceProduction`'s own completion routine plus the re-assignment a mid-turn
 * mutation owes the open panel, so a chopped-for granary is finished by exactly
 * the code an end-of-turn granary is finished by.
 *
 * Nothing is forced on the player afterwards. A city left with an empty queue is
 * the End Turn blocker's business, exactly as a newly founded city is, and the
 * interface announces the completion rather than opening a screen over it
 * (Entry XVIII.4).
 */
function applyChopFeature(state: GameState, command: ChopFeatureCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot clear features`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const problem = chopError(state, unit.id);
  if (problem) return fail(problem);

  // Validation is done — `chopError` has already established that the unit is on
  // the map and that what it is standing in can be cleared.
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  // Read before the chop, because it is the *ground's* owner that banks the
  // timber and the chop is about to change what stands on that ground. Same
  // lookup the mechanism and the preview use, so all three name one city.
  const paid = chopCity(state, tile);
  chopFeatureAt(state, unit, tile);
  const done = paid ? settleProductionWindfall(state, paid) : null;
  // Timber can finish a **wonder**, and a wonder finishing is news to the whole
  // world (`CommandResult.wonders`) — including to the empires whose baskets it
  // has just turned into gold. Reported here rather than only from `endTurn`
  // because a windfall completion is a completion: the claim is made and the
  // refunds are paid by the same routine either way, and a channel that only
  // carried the end-of-turn half would be a silence nobody could explain.
  return ok(
    undefined,
    undefined,
    done?.wonder ? [done.wonder] : undefined,
    undefined,
    done?.grants,
  );
}

/**
 * Asks a hill what is under it. See `ProspectCommand`, and `improvements.ts` for
 * the rules.
 *
 * `applyChopFeature`'s twin, question for question: is this a real seat, may it
 * still act, is that its unit — and everything about the *work* delegated whole
 * to `prospectError`, which is what the unit sheet greys its Survey row with. So
 * an offered row is a command this accepts, and the sentence a player reads on a
 * refusal is this reducer's own.
 *
 * The report rides out on `CommandResult.prospect` rather than being announced
 * here, and it is `arrivals`' argument in a fifth currency: by the time this
 * returns the seam is an ordinary `Tile.resource` and the hill is marked
 * surveyed, so nothing downstream could say whether the ore was struck this turn
 * or has been sitting there since the map was made. The assay is banked by then
 * too, and re-deriving which town received it would be a second implementation
 * of `nearestOwnedCity`.
 */
function applyProspect(state: GameState, command: ProspectCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot survey`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const problem = prospectError(state, unit.id);
  if (problem) return fail(problem);

  // Validation is done — `prospectError` has already established that the unit
  // is on the map and that what it is standing on is an unasked hill.
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  const result = ok();
  if (result.ok) result.prospect = prospectAt(state, unit, tile);
  return result;
}

/**
 * Burns somebody else's works. See `PillageCommand`.
 *
 * The seat's questions here, the raid's delegated to `pillageError` — the same
 * split `applyFortify` makes, and the same guarantee.
 *
 * `pillageAt` refreshes the *victim's* city on the spot, exactly as
 * `buildImprovementAt` refreshes the builder's: the ground stops paying the
 * moment the farm burns, and the panel that has to be told is the one that owns
 * it. See `refreshCityDerived`.
 */
function applyPillage(state: GameState, command: PillageCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot pillage`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }

  const problem = pillageError(state, unit.id);
  if (problem) return fail(problem);

  const tile = getTileAt(state.map, unit.col, unit.row)!;
  // The raid's own figures ride back out (`PillageReport`). The interface cannot
  // derive them: a rider is part of the printed number, so
  // `RULES.improvements.pillageGold` is the base and never the answer, and the
  // heal is what the bar *actually* moved by rather than what was offered.
  return ok(undefined, undefined, undefined, undefined, undefined, undefined, undefined, [
    pillageAt(state, unit, tile),
  ]);
}

/**
 * Buys ground. See `PurchaseTileCommand`, and `cities.ts` for the rules.
 *
 * The seat's three questions here, everything about the *sale* delegated whole
 * to `tilePurchaseError` — `applyBuildImprovement`'s split, and the same
 * guarantee: a refusal leaves the state byte-identical, because not one line
 * below the validation runs until every question has been answered.
 */
function applyPurchaseTile(state: GameState, command: PurchaseTileCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot buy land`);
  }

  const cell: Cell = { col: command.col, row: command.row };
  const problem = tilePurchaseError(state, actor.id, command.cityId, cell);
  if (problem) return fail(problem);

  // Validation is done — `tilePurchaseError` has already established that the
  // city is this player's and that the tile is real, land and free.
  const city = cityById(state, command.cityId)!;
  const tile = getTileAt(state.map, cell.col, cell.row)!;
  purchaseTileAt(state, city, tile);
  return ok();
}

/**
 * Takes a boon. See `ChooseDiscoveryCommand`, and `discoveries.ts` for the rules.
 *
 * The seat's two questions here, everything about the *offer* delegated whole to
 * `discoveryChoiceError` — `applyFortify`'s split, and the same guarantee: a
 * refusal leaves the state byte-identical, because not one line below the
 * validation runs until every question has been answered.
 *
 * `settleDiscovery` then pays it through the bucket's own windfall routine
 * (Entry XVIII), which is the same code the end-of-turn phase completes a
 * granary, a citizen or a technology with. Nothing about a boon is settled here.
 */
function applyChooseDiscovery(
  state: GameState,
  command: ChooseDiscoveryCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot choose a discovery`);
  }

  const problem = discoveryChoiceError(state, actor.id, command.optionIndex);
  if (problem) return fail(problem);

  settleDiscovery(state, actor, command.optionIndex);
  return ok();
}


/**
 * Takes a card. See `ChooseOrderCommand`, and `statecraft.ts` for the rules.
 *
 * The seat's two questions here, everything about the *offer* delegated whole to
 * `orderChoiceError` — `applyChooseDiscovery`'s split, and the same guarantee:
 * a refusal leaves the state byte-identical, because not one line below the
 * validation runs until every question has been answered.
 */
function applyChooseOrder(state: GameState, command: ChooseOrderCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot choose an Order`);
  }

  const problem = orderChoiceError(state, actor.id, command.optionIndex);
  if (problem) return fail(problem);

  settleOrderChoice(actor, command.optionIndex);
  return ok();
}

/**
 * Slots a card and seals it. See `SlotOrderCommand`.
 *
 * `slotOrderError` is the whole of the rule and the Statecraft screen greys its
 * slots with it, so a slot a player can drop a card on is a command this
 * accepts, and the sentence they read on a refusal is this reducer's own.
 */
function applySlotOrder(state: GameState, command: SlotOrderCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot slot an Order`);
  }

  const problem = slotOrderError(state, actor.id, command.cardId, command.slotIndex);
  if (problem) return fail(problem);

  const outcome = slotOrderAt(state, actor, command.cardId, command.slotIndex);
  // **The Laureate's once-per-game gift, settled here and nowhere else.** The
  // claim is `slotOrderAt`'s — it is the one place a card enters a slot — and
  // the *settlement* is the reducer's, because "gain a great person" is a renown
  // windfall and `renown.ts` reads `statecraft.ts`: the arrow points one way, so
  // the module above both is what turns a claim into an offer. Poured through
  // `settleRenownWindfall`, the bucket's own Entry XVIII seam, so the draft
  // opens exactly as a Triumph opens one — including the rule that an empire
  // already holding an offer banks rather than blocks.
  for (const grant of outcome.granted) {
    // **The Auspicious Seal's die**, banked here beside the laureate's offer and
    // for its reason: `slotOrderAt` makes the claim, and the module above both
    // pools turns a claim into a payment. `Player.dice` is the pool the beads
    // already fill (`beads.ts`), so a card and a bead cannot disagree about what
    // a die is; nothing spends one yet, which is the Almanac's business.
    if (grant.grant === 'die') {
      actor.dice += 1;
      continue;
    }
    if (grant.grant !== 'greatPerson') continue;
    // Exactly what the ladder still wants, and never more: the gift is *a great
    // person*, not a lump of renown, so an empire two renown short of the next
    // rung is handed two and an empire that has just recruited is handed the
    // whole rung. The overflow it was already carrying is untouched, which is
    // what keeps the ladder's arithmetic the ladder's.
    const plan = planRecruitment(actor);
    const owed = plan === null ? renownThreshold(actor) - actor.renownPool : 0;
    settleRenownWindfall(state, actor, [{ family: null, amount: Math.max(0, owed) }]);
  }
  return ok();
}

/** Empties a slot. See `UnslotOrderCommand`. `applySlotOrder`'s mirror. */
function applyUnslotOrder(state: GameState, command: UnslotOrderCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot unslot an Order`);
  }

  const problem = unslotOrderError(state, actor.id, command.slotIndex);
  if (problem) return fail(problem);

  unslotOrderAt(actor, command.slotIndex);
  return ok();
}

/**
 * Adopts a government. See `AdoptGovernmentCommand`.
 *
 * The three things adoption does — the spread, the amnesty, the Doctrine draw —
 * are all `adoptGovernmentAt`'s, because they are one decision and a reducer
 * that did any of them itself would be a second implementation of the chapter
 * break. This handler owns only the seat's questions.
 */
function applyAdoptGovernment(
  state: GameState,
  command: AdoptGovernmentCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot adopt a government`);
  }

  const problem = governmentChoiceError(state, actor.id, command.choiceIndex);
  if (problem) return fail(problem);

  adoptGovernmentAt(state, actor, command.choiceIndex);
  return ok();
}

/** Takes a Doctrine. See `ChooseDoctrineCommand`. `applyChooseOrder`'s twin. */
function applyChooseDoctrine(
  state: GameState,
  command: ChooseDoctrineCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot choose a Doctrine`);
  }

  const problem = doctrineChoiceError(state, actor.id, command.optionIndex);
  if (problem) return fail(problem);

  settleDoctrineChoice(actor, command.optionIndex);
  return ok();
}

/**
 * Buys a unit or a building. See `PurchaseItemCommand`, and `purchase.ts` for
 * the rules.
 *
 * The seat's two questions here, everything about the *sale* delegated whole to
 * `purchaseError` — `applyPurchaseTile`'s split, and the same guarantee: a
 * refusal leaves the state byte-identical, because not one line below the
 * validation runs until every question has been answered.
 */
function applyPurchaseItem(state: GameState, command: PurchaseItemCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot buy anything`);
  }

  const problem = purchaseError(
    state,
    actor.id,
    command.cityId,
    command.item,
    command.currency,
  );
  if (problem) return fail(problem);

  // Validation is done — `purchaseError` has established the city is this
  // player's, the thing is for sale in this bank, there is room for it and the
  // bank covers it. `readPurchasableItem` runs again here rather than being
  // threaded out of the check, because the command's `item` is JSON off the
  // wire and this is the one place it becomes a type.
  const city = cityById(state, command.cityId)!;
  const born = purchaseItemAt(
    state,
    actor,
    city,
    readPurchasableItem(command.item)!,
    command.currency,
  );
  const result = ok();
  // A bought cathedral is dedicated the instant it is delivered, by the same
  // line in `realiseItem` that dedicates a built one — so the news leaves by the
  // same field. Every other `RealisedItem` half is always absent on this path;
  // see `purchaseItemAt`.
  if (result.ok && born.consecration) result.consecrations = [born.consecration];
  return result;
}

/**
 * Pours a bank into a city's basket. See `ContributeCommand`, and `purchase.ts`
 * for the rules.
 *
 * `applyPurchaseItem`'s shape exactly: the seat's two questions here, everything
 * about the transaction delegated whole to `contributeError`, and the same
 * guarantee — a refusal leaves the state byte-identical, because not one line
 * below the validation runs until every question has been answered.
 *
 * The completion is `settleProductionWindfall`'s (inside `contributeAt`), so a
 * cathedral finished by a contribution is finished by the same routine that
 * finishes one at the end of a turn — and its **dedication** rides out on the
 * result the way a wonder's completion does.
 */
function applyContribute(state: GameState, command: ContributeCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot contribute`);
  }

  const problem = contributeError(state, actor.id, command.cityId, command.currency);
  if (problem) return fail(problem);

  const city = cityById(state, command.cityId)!;
  const done = contributeAt(state, actor, city, command.currency as PurchaseCurrency);
  const result = ok();
  if (result.ok && done?.consecration) result.consecrations = [done.consecration];
  return result;
}

/**
 * Spends an augur on a god. See `ConsecrateCommand`.
 *
 * `applyChopFeature`'s shape: the seat's questions here, the whole of the act's
 * rule delegated to `consecrateError` — which is also what the augur's panel
 * greys its Consecrate row with, so an offered row is a command this accepts and
 * "Your pantheon has no room for another god" is one sentence in one place.
 */
function applyConsecrate(state: GameState, command: ConsecrateCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot consecrate`);
  }

  const problem = consecrateError(state, actor.id, command.unitId);
  if (problem) return fail(problem);

  const unit = unitById(state, command.unitId)!;
  consecrateAt(state, actor, unit);
  return ok();
}

/** Takes a god. See `ChooseBeliefCommand`. `applyChooseOrder`'s twin. */
function applyChooseBelief(state: GameState, command: ChooseBeliefCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot name a god`);
  }

  const problem = beliefChoiceError(state, actor.id, command.optionIndex);
  if (problem) return fail(problem);

  settleBeliefChoice(state, actor, command.optionIndex);
  return ok();
}

/**
 * Performs a rite. See `PerformRiteCommand`, and `religion.ts` for the rules.
 *
 * `applyBuildImprovement` question for question — is this a real seat, may it
 * still act, and then everything about the *work* delegated whole to
 * `riteError`, which is what the augur's sheet greys its rite rows with.
 *
 * **The payout settles here and now** (Entry XVIII), through
 * `performRiteAt`, which reaches each bucket's own `settle…Windfall`: a Rite of
 * the Harvest's citizen is placed before this returns, an Omen Reading's beakers
 * can complete a technology, and the town's derived state is refreshed by the
 * one helper every mid-turn mutation goes through.
 *
 * **A redraw's payout is an offer**, and it goes out the way a Consecrate's
 * always has — on `player.pantheon.pending`, where the End Turn blocker and the
 * offer card both already look — rather than through a field of this result. A
 * twelfth `CommandResult` field for a thing already sitting on the state would
 * be a second answer to "is a decision owed", and the first thing a second
 * answer does is disagree.
 */
function applyPerformRite(state: GameState, command: PerformRiteCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot perform rites`);
  }

  // An absent target is legal and means "where the augur stands"; a *present*
  // one that is not a pair of integers is a malformed command, not a default.
  let target: Cell | undefined;
  if (command.target !== undefined) {
    target = readCell(command.target);
    if (!target) return fail('performRite needs an integer target { col, row }');
  }

  const problem = riteError(state, actor.id, command.unitId, command.rite, target, command.belief);
  if (problem) return fail(problem);

  const unit = unitById(state, command.unitId)!;
  const mark = actor.triumphs.length;
  const done = performRiteAt(state, actor, unit, command.rite, target, command.belief);
  // A rite's hammers may finish a wonder, and a wonder is news to every seat —
  // the gap the wonders framework left and named. Its triumphs ride out the
  // same way every other command's do, as a diff of this seat's own list.
  const result = ok(undefined, undefined, done.wonders, triumphsAwarded(actor, mark));
  // The Preaching's lump, on the one rite that makes one. See `CommandResult`.
  if (result.ok && done.proclaimed) result.proclaimed = done.proclaimed;
  return result;
}

/**
 * Plants a holy site, founding the religion where there is none. See
 * `PlantHolySiteCommand`, and `religion.ts` for the rules.
 *
 * `applyBuildImprovement`'s shape question for question — is this a real seat,
 * may it still act, and then everything about the *act* delegated whole to
 * `plantHolySiteError`, which is what the prophet's sheet greys the row with.
 * The name the founding generates is drawn from `state.rng` inside the
 * mechanism, so an AI that plants one gets a named faith without the reducer
 * knowing how names are made.
 */
function applyPlantHolySite(state: GameState, command: PlantHolySiteCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot plant a holy site`);
  }

  const problem = plantHolySiteError(state, actor.id, command.unitId);
  if (problem) return fail(problem);

  const unit = unitById(state, command.unitId)!;
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  plantHolySiteAt(state, actor, unit, tile);
  return ok();
}

/** Draws one more belief for this religion. See `GainBeliefCommand`. */
function applyGainBelief(state: GameState, command: GainBeliefCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot draw a belief`);
  }

  const problem = gainBeliefError(state, actor.id, command.unitId);
  if (problem) return fail(problem);

  gainBeliefAt(state, actor, unitById(state, command.unitId)!);
  return ok();
}

/** Strips every rival faith off the towns around an inquisitor. See `PurgeCommand`. */
function applyPurge(state: GameState, command: PurgeCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot purge`);
  }

  const problem = purgeError(state, actor.id, command.unitId);
  if (problem) return fail(problem);

  // **The strip happens inside the command**, the proclamation's rule mirrored:
  // what it took away is a difference that stops existing the moment this
  // returns, so it is carried out rather than re-derived. Always present on a
  // success, even when every town in range held nothing.
  const done = purgeAt(state, actor, unitById(state, command.unitId)!);
  const result = ok();
  if (result.ok) result.purged = done;
  return result;
}

/** Presses a lump of faith on every town in range. See `ProclaimCommand`. */
function applyProclaim(state: GameState, command: ProclaimCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot proclaim`);
  }

  const problem = proclaimError(state, actor.id, command.unitId);
  if (problem) return fail(problem);

  // **The bomb lands inside the command** (user, 2026-08-28), so what it
  // converted is a difference that stops existing the moment this returns and
  // has to be carried out. Always present on a success, even when every town in
  // range held: "Nippur resisted" is the news a spent charge earns.
  const done = proclaimAt(state, actor, unitById(state, command.unitId)!);
  const result = ok();
  if (result.ok) result.proclaimed = done;
  return result;
}

/** Gives a pool's beliefs back and draws again. See `RedraftBeliefsCommand`. */
function applyRedraftBeliefs(state: GameState, command: RedraftBeliefsCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot redraft beliefs`);
  }

  const problem = redraftError(state, actor.id, command.unitId, command.pool);
  if (problem) return fail(problem);

  redraftAt(state, actor, unitById(state, command.unitId)!, command.pool);
  return ok();
}

/**
 * Renames this empire's religion. See `RenameReligionCommand`.
 *
 * The one command in the game whose whole effect is a string. It is still
 * turn-gated, for the reason every other command is: a seat that has ended its
 * turn is not acting, and a name that changed between a resolution's start and
 * its end would be a name two clients disagreed about.
 */
function applyRenameReligion(state: GameState, command: RenameReligionCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot rename a religion`);
  }

  const problem = renameReligionError(state, actor.id, command.name);
  if (problem) return fail(problem);

  renameReligionAt(state, actor.id, command.name);
  return ok();
}

/**
 * Calls a great person. See `ChooseGreatPersonCommand`, and `greatPeople.ts` for
 * the rules.
 *
 * `applyChooseOrder`'s split — the seat's two questions here, everything about
 * the *offer* delegated whole to `greatPersonChoiceError` — with one thing none
 * of its siblings has: **a refusal that mutates**. When the name was taken by a
 * faster seat this window, the offer this player is holding is unplayable, so it
 * is re-drawn before the refusal is returned.
 *
 * That is a deliberate exception to "a rejected command leaves the state
 * byte-identical", and it is the only one in the reducer. It is confined to
 * exactly one refusal (the contention clause, which no other seat's command can
 * provoke by accident), it is fully determined by the log (the redraw spends
 * `state.rng` at a point every replay reaches identically), and the alternative
 * is a seat holding a hand of spent names that can never end its turn. Every
 * other refusal below returns before a single line runs.
 */
function applyChooseGreatPerson(
  state: GameState,
  command: ChooseGreatPersonCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot call anybody`);
  }

  const problem = greatPersonChoiceError(state, actor.id, command.optionIndex);
  if (problem) {
    // The one refusal that leaves the empire something to do. See the docblock;
    // every other refusal in this file returns a byte-identical state.
    if (problem.includes('already been called')) redrawGreatPersonOffer(state, actor);
    return fail(problem);
  }

  settleGreatPersonChoice(state, actor, command.optionIndex);
  return ok();
}

/**
 * Buys the recruitment, or the draft. See `PurchaseGreatPersonOfferCommand`.
 *
 * `applyChooseGreatPerson`'s shape minus its one oddity: the whole rule is
 * `greatPersonPurchaseError`'s — which is also what the interface greys the
 * button with — and a refusal leaves the state byte-identical, because that gate
 * only ever *reads* the roster. The narrowed draft deals its hand inside the
 * mechanism, on the far side of the gate, so a refused purchase still spends no
 * roll of `state.rng`.
 */
function applyPurchaseGreatPersonOffer(
  state: GameState,
  command: PurchaseGreatPersonOfferCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot call anybody`);
  }

  const problem = greatPersonPurchaseError(state, actor.id, command.buys);
  if (problem) return fail(problem);

  purchaseGreatPersonOfferAt(state, actor, command.buys);
  return ok();
}

/**
 * Spends a great person on its family's boon. See `GreatPersonActCommand`.
 *
 * `applyPerformRite`'s shape: the seat's questions here, the whole of the act's
 * rule delegated to `greatPersonActError`, which is also what the unit panel
 * greys its Act row with — so an offered button is a command this accepts.
 *
 * **The payout settles here and now** (Entry XVIII), through `greatPersonActAt`,
 * which reaches each bucket's own `settle…Windfall`. What comes back is the
 * *triumphs* those settlements earned along the way — a technology that opened
 * an era, a wonder a hurry finished — read as a diff of this seat's own
 * append-only list (`triumphsAwarded`), which is why this handler needs no sink
 * and the mechanism needed no parameter.
 */
function applyGreatPersonAct(
  state: GameState,
  command: GreatPersonActCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot spend a great person`);
  }

  const problem = greatPersonActError(state, actor.id, command.unitId);
  if (problem) return fail(problem);

  const mark = actor.triumphs.length;
  greatPersonActAt(state, actor, unitById(state, command.unitId)!);
  return ok(undefined, undefined, undefined, triumphsAwarded(actor, mark));
}

/**
 * Plants a great person's work. See `GreatPersonWorkCommand`.
 *
 * `applyBuildImprovement`'s twin, question for question, with the improvement
 * read off the roster rather than off the command — the ground's half is
 * `improvementErrorAt`'s, the same function a worker's farm is held to.
 */
function applyGreatPersonWork(
  state: GameState,
  command: GreatPersonWorkCommand,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot plant a work`);
  }

  const problem = greatPersonWorkError(state, actor.id, command.unitId);
  if (problem) return fail(problem);

  // Validation is done — `greatPersonWorkError` has established that the unit is
  // this player's, that it is a great person, and that it is on the map.
  const unit = unitById(state, command.unitId)!;
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  greatPersonWorkAt(state, actor, unit, tile);
  return ok();
}

// --- reducer ----------------------------------------------------------------

/**
 * Opens a trade route. See `StartRouteCommand`, and `trade.ts` for the rules.
 *
 * The seat's two questions here, everything about the *route* delegated whole to
 * `startRouteError` — `applyBuildImprovement`'s split, and the same guarantee: a
 * refusal leaves the state byte-identical, because not one line below the
 * validation runs until every question has been answered.
 *
 * Then the **teleport**, which is a third way a unit's position changes and so
 * owes `arriveOnTile` everything a march owes it (CLAUDE.md's rule, and the one
 * reason this is not four lines inside `startRouteAt`: `arrival.ts` imports
 * `trade.ts`, never the other way round). Written in `advanceAlongPath`'s own
 * order and for its reasons — the position, then the standing order dropped,
 * then the seam, then one recompute of what the empire can see. On a city centre
 * the seam finds nothing to claim and lays no road: `layRoadUnder` asks for a
 * caravan *carrying a route*, and this one is still unladen, which is why the
 * route is written **after** the arrival and not before. That is the same answer
 * the shuttle gives — a caravan's own origin hex is never paved, because a road
 * is worn by arriving somewhere and it started there.
 *
 * The caravan does not march here. `startRouteAt` sets the path and the pipeline
 * walks it — `spendLeftoverMovement` on this very turn, `resetMovement` on the
 * next — which is what keeps one implementation of a walk instead of two, and
 * what makes the road a caravan lays a thing `arriveOnTile` writes on every step
 * of every leg rather than a thing this command writes once.
 */
function applyStartRoute(state: GameState, command: StartRouteCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot start a route`);
  }

  const problem = startRouteError(
    state,
    actor.id,
    command.unitId,
    command.fromCityId,
    command.toCityId,
    command.mode,
  );
  if (problem) return fail(problem);

  // Validation is done — `startRouteError` has established that the unit is this
  // player's idle trader, that both cities are this player's, and that the
  // origin's gates have room for the piece.
  const unit = unitById(state, command.unitId)!;
  const from = cityById(state, command.fromCityId)!;
  const to = cityById(state, command.toCityId)!;
  // Which way it goes, settled once and read *before* the piece is moved: the
  // survey behind it is a fact about the two towns, and the teleport below is
  // the one thing that changes the board between the gate and the write.
  const mode: RouteMode = routeModeFor(
    state,
    actor.id,
    command.fromCityId,
    command.toCityId,
    command.mode,
  );

  const gates = getTileAt(state.map, from.col, from.row)!;
  unit.col = gates.col;
  unit.row = gates.row;
  // Whatever it was walking toward, it is not there any more. The sleep flag is
  // `orderedUnitId`'s business, like every other order's.
  delete unit.path;
  const arrival = arriveOnTile(state, unit, gates);
  // The piece moved, so what its owner can see moved with it — one recompute per
  // order, exactly as `applyMoveUnit` does it.
  recomputeVisibility(state, actor.id);

  startRouteAt(state, unit, from, to, mode);
  return ok(isEmptyArrival(arrival) ? undefined : [arrival]);
}

/**
 * Flips a caravan's auto-resend. See `SetAutoResendCommand`.
 *
 * Refuses a value that would change nothing, which is what keeps the log free of
 * commands that say nothing — see the type's docblock.
 */
function applySetAutoResend(state: GameState, command: SetAutoResendCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot change orders`);
  }
  if (typeof command.on !== 'boolean') return fail('setAutoResend needs a boolean "on"');

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  const route = unit.trade;
  if (!route) return fail(`Unit ${unit.id} is not carrying a trade route`);
  if (route.autoResend === command.on) {
    return fail(`That caravan already ${command.on ? 'renews' : 'ends'} its route`);
  }

  route.autoResend = command.on;
  return ok();
}

/**
 * Ends a caravan's route. See `CancelRouteCommand`.
 *
 * Fully validated before the single mutation, like every other handler. The
 * piece keeps its waypoints on purpose — see the type's docblock; this is a verb
 * about the *route*, and `cancelOrder` is the verb about the march.
 */
function applyCancelRoute(state: GameState, command: CancelRouteCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot cancel orders`);
  }

  const unit = unitById(state, command.unitId);
  if (!unit) return fail(`No unit with id ${String(command.unitId)}`);
  if (unit.ownerId !== actor.id) {
    return fail(`Unit ${unit.id} does not belong to player ${actor.id}`);
  }
  if (unit.trade === undefined) return fail(`Unit ${unit.id} is not carrying a trade route`);

  endRoute(state, unit);
  return ok();
}

/**
 * Declares war.
 *
 * `declareWarError` is the whole rule, so the greyed button on the Diplomacy
 * screen and this refusal are one sentence. What lands beyond the row is the
 * trade between the two: `declareWarAt` drops every route spanning the pair and
 * reports them through `routesEnded`, the same field a route that lapses of its
 * own accord comes home on — a route ended by a phase and a route ended by a
 * declaration are the same kind of news, and neither has a verb of the owner's
 * behind it.
 *
 * **Nobody is expelled**, which is the ruling: a declaration opens the borders
 * (see `declareWarAt`). The peace closes them again and sends the columns home.
 */
function applyDeclareWar(state: GameState, command: DeclareWarCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot declare war`);
  }
  const targetId = command.targetId;
  if (typeof targetId !== 'number' || !Number.isInteger(targetId)) {
    return fail(`declareWar needs an integer targetId, got ${String(targetId)}`);
  }
  const refusal = declareWarError(state, actor.id, targetId);
  if (refusal !== null) return fail(refusal);

  const outcome = declareWarAt(state, actor.id, targetId);
  const result = ok(undefined, undefined, undefined, undefined, undefined, outcome.routesEnded);
  if (result.ok) {
    result.warDeclared = outcome.report;
    // The bargains between the two went with the caravans (the ruling, 9b), on
    // the same field an expiry comes home on: a deal ended by a declaration and
    // a deal ended by its own clock are the same kind of news.
    if (outcome.dealsEnded.length > 0) result.dealsEnded = outcome.dealsEnded;
  }
  return result;
}

/**
 * Puts a bargain to another empire. `proposeDealError` is the whole rule, so
 * the greyed row on the Diplomacy screen and this refusal are one sentence.
 *
 * It moves nothing — see `ProposeDealCommand`.
 */
function applyProposeDeal(state: GameState, command: ProposeDealCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot talk terms`);
  }
  const targetId = command.targetId;
  if (typeof targetId !== 'number' || !Number.isInteger(targetId)) {
    return fail(`proposeDeal needs an integer targetId, got ${String(targetId)}`);
  }
  const give = readTerms(command.give);
  const take = readTerms(command.take);
  if (give === null || take === null) return fail('A bargain needs two sides, each an object');
  const refusal = proposeDealError(state, actor.id, targetId, give, take);
  if (refusal !== null) return fail(refusal);
  proposeDealAt(state, actor.id, targetId, give, take);
  return ok();
}

/**
 * Signs, refuses or takes back a bargain — one handler for three verbs, because
 * all three name a paper by id and differ only in which gate is asked and what
 * happens after it.
 *
 * A signature is the only one that moves anything, and it moves everything at
 * once: `acceptDealAt` executes both halves, opens the row for whatever is left
 * standing and drops the paper. The other two only drop the paper.
 */
function applyAnswerDeal(
  state: GameState,
  command: AcceptDealCommand | DeclineDealCommand | WithdrawDealCommand,
  verb: 'accept' | 'decline' | 'withdraw',
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot talk terms`);
  }
  const dealId = command.dealId;
  if (typeof dealId !== 'number' || !Number.isInteger(dealId)) {
    return fail(`${command.type} needs an integer dealId, got ${String(dealId)}`);
  }
  const refusal =
    verb === 'withdraw'
      ? withdrawDealError(state, actor.id, dealId)
      : answerDealError(state, actor.id, dealId, verb === 'accept');
  if (refusal !== null) return fail(refusal);
  const row = proposalById(state, dealId)!;
  if (verb !== 'accept') {
    dropProposal(state, dealId);
    return ok();
  }
  const execution = acceptDealAt(state, row);
  const result = ok();
  if (result.ok) result.dealSigned = execution;
  return result;
}

/**
 * One half of a bargain off the wire, or `null` when it is not an object.
 *
 * A command is plain JSON and may arrive from a save or a socket, so the two
 * halves are guarded here before either gate reads them; everything *inside*
 * them is `dealSideError`'s business, which is where each term's rule lives.
 * Absent is `{}` — a side that gives nothing — so a proposal naming one
 * direction only is the ordinary shape rather than a special case.
 */
function readTerms(value: unknown): DealTerms | null {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const terms = value as Record<string, unknown>;
  // The two lists are checked for *shape* here and for contents in
  // `dealSideError`, and the split is the one that matters: a refusal must
  // still be a refusal, and a `for…of` over a number would throw rather than
  // return, which is the one thing hard rule 1 cannot survive.
  for (const key of ['luxuries', 'cities']) {
    if (terms[key] !== undefined && !Array.isArray(terms[key])) return null;
  }
  return value as DealTerms;
}

/**
 * Puts a standing white-peace offer on the table, or takes one back.
 *
 * One handler for two verbs, because they are one write with a sign
 * (`setPeaceOffer` in `wars.ts`) and the only difference between them is which
 * gate is asked. Neither ends a war: `settleDiplomacy` does that at the end of
 * the turn, when both sides' flags stand.
 */
function applyPeaceOffer(
  state: GameState,
  command: ProposePeaceCommand | WithdrawPeaceCommand,
  standing: boolean,
): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot talk terms`);
  }
  const targetId = command.targetId;
  if (typeof targetId !== 'number' || !Number.isInteger(targetId)) {
    return fail(`${command.type} needs an integer targetId, got ${String(targetId)}`);
  }
  // The paper, when there is one. `undefined` means "sign what is on the
  // table", which is the P1 command and still the common one; a command naming
  // one direction only is the ordinary shape (`readTerms`).
  let offered: { give: DealTerms; take: DealTerms } | undefined;
  if (standing && command.type === 'proposePeace') {
    if (command.give !== undefined || command.take !== undefined) {
      const give = readTerms(command.give);
      const take = readTerms(command.take);
      if (give === null || take === null) return fail('A bargain needs two sides, each an object');
      offered = { give, take };
    }
  }
  const refusal = standing
    ? proposePeaceError(state, actor.id, targetId, offered)
    : withdrawPeaceError(state, actor.id, targetId);
  if (refusal !== null) return fail(refusal);

  setPeaceOfferAt(state, actor.id, targetId, standing, offered);
  return ok();
}

/** Takes a puppet into the empire. `annexCityError` is the whole rule. */
function applyAnnexCity(state: GameState, command: AnnexCityCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot annex`);
  }
  const refusal = annexCityError(state, actor.id, command.cityId);
  if (refusal !== null) return fail(refusal);
  annexCityAt(state, cityById(state, command.cityId)!);
  return ok();
}

/**
 * Pulls a town down. `razeCityError` is the whole rule.
 *
 * The caravans whose route had an end here come home on `routesEnded`, for
 * `applyDeclareWar`'s reason exactly; the town itself is reported on `razed`,
 * because by the time this returns there is nothing on the board to ask.
 */
function applyRazeCity(state: GameState, command: RazeCityCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot raze`);
  }
  const refusal = razeCityError(state, actor.id, command.cityId);
  if (refusal !== null) return fail(refusal);
  const outcome = razeCityAt(state, cityById(state, command.cityId)!);
  const result = ok(undefined, undefined, undefined, undefined, undefined, outcome.routesEnded);
  if (result.ok) result.razed = outcome.report;
  return result;
}

/**
 * Why this seat cannot let that piece go, or `null` when it can.
 *
 * **The** gate: `applyDisbandUnit` refuses with this sentence and the unit
 * sheet greys its Disband row with it, so an offered button is a command the
 * reducer takes — `chopError`'s bargain, and every other blocker's in this
 * codebase.
 *
 * It answers the seat's questions as well as the piece's, unlike `sleepError`,
 * because there is no *verb* rule left once those are asked: a unit may be let
 * go spent, fortified, asleep, wounded or fresh. Four clauses in precedence:
 *
 *   · a real seat, still acting — the two every handler asks first;
 *   · **the wild never disbands.** It has no treasury to save and no screen to
 *     say so on, which is `seatPays`' own reading of the same seat one module
 *     over. A barbarian army thins because somebody killed it;
 *   · the piece exists and is yours;
 *   · **it is not carrying a route.** `Unit.trade` is the route (there is no
 *     route register), so dissolving a routed caravan would silently take a
 *     partner's yields off two cities. Ending the route is its own verb and
 *     lives on its own screen, which is what the sentence says.
 */
export function disbandError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const actor = resolveActor(state, playerId);
  if (typeof actor === 'string') return actor;
  if (actor.barbarian === true) return 'The wild does not disband its own';
  if (hasEndedTurn(state, actor.id)) {
    return `Player ${actor.id} has ended turn ${state.turn} and cannot give orders`;
  }

  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== actor.id) {
    return `Unit ${unit.id} does not belong to player ${actor.id}`;
  }
  if (unit.trade !== undefined) return 'End its route from the Trade screen first';
  return null;
}

/**
 * Lets a unit go. See `DisbandUnitCommand`.
 *
 * Fully validated by `disbandError` before the single mutation, and the
 * mutation is `removeUnit` (`state.ts`) rather than a splice of `state.units`:
 * a piece leaves the board in exactly one place, and that place is also what
 * recomputes the owner's sight now that the piece is not standing there any
 * more.
 *
 * It reports through `CommandResult.disbanded`, the field the creditors' sweep
 * already fills, with the same `DisbandReport` — one shape for "this piece left
 * the payroll" whichever end of the treasury it left from. Nothing about upkeep
 * is written anywhere: next turn's bill is a fold of what is on the board
 * (`explainEmpireGold`), so a piece that is gone simply stops appearing in it.
 */
function applyDisbandUnit(state: GameState, command: DisbandUnitCommand): CommandResult {
  const problem = disbandError(state, command.playerId, command.unitId);
  if (problem !== null) return fail(problem);

  // Not null: `disbandError` has just found it. Read *before* the removal —
  // by the time this returns there is nothing left to ask what it cost.
  const unit = unitById(state, command.unitId)!;
  const report: DisbandReport = {
    unitId: unit.id,
    ownerId: unit.ownerId,
    type: unit.type,
    upkeep: unitUpkeepOf(unit),
  };
  removeUnit(state, unit.id);

  const result = ok();
  // Set beside the helper rather than passed through it, `proclaimed`'s reason:
  // eight positional `undefined`s at one call site is a worse price than a line.
  if (result.ok) result.disbanded = [report];
  return result;
}

/**
 * The unit a command is an order **to**, when it is an order to one.
 *
 * The whole of "an order is a waking" (see `Unit.sleeping` and
 * `SleepUnitCommand`). Written here, once, rather than as a `wakeUnit` line in
 * each of the eight handlers that names a unit, for `createUnit`'s reason
 * exactly: there is one place a command reaches a piece, so there is one place
 * that can forget — and the failure mode of the forgotten version is a worker
 * that walks across the map still marked asleep, which nothing would complain
 * about until End Turn quietly stopped mentioning it.
 *
 * The two `undefined` arms are the interesting ones. **`sleepUnit`** names a
 * unit and is emphatically not a waking; it is the one command excused, and
 * that is the entire reason this is a reader rather than "does the command have
 * a `unitId`". **`spawnUnit`** names a *type*, not a piece — the unit it is
 * about does not exist yet.
 *
 * Aliased-discriminant idiom, like the reducer's own switch below, so the day a
 * command is added this stops compiling until somebody has decided whether it
 * wakes a sleeper.
 */
function orderedUnitId(command: Command): number | undefined {
  const kind = command.type;
  switch (kind) {
    case 'moveUnit':
    case 'cancelOrder':
    case 'attack':
    case 'fortify':
    case 'buildImprovement':
    case 'chopFeature':
    // A surveyor told to read a hill is a piece given an order, and it wakes
    // like anybody else — the act spends its whole turn either way.
    case 'prospect':
    case 'pillage':
    // An augur told to consecrate or to bless is an augur given an order, so it
    // wakes like anybody else — even though the first of the two spends it.
    case 'consecrate':
    case 'performRite':
    // A prophet told to plant, to enhance, to proclaim or to redraft is a piece
    // given an order, so it wakes like anybody else — even though every one of
    // the four may spend it.
    case 'plantHolySite':
    case 'gainBelief':
    case 'proclaim':
    case 'redraftBeliefs':
    // An inquisitor told to purge is a piece given an order, like every other.
    case 'purge':
    // A great person told to act or to plant is a piece given an order, so it
    // wakes like anybody else — even though both verbs spend it.
    case 'greatPersonAct':
    case 'greatPersonWork':
    // A caravan told to set out, to renew or to stop is a piece given an order,
    // so it wakes like anybody else.
    case 'startRoute':
    case 'setAutoResend':
    case 'cancelRoute':
    // Telling a piece to range ahead — or calling it back — is an order to it,
    // so it wakes like anybody else. It is deliberately *not* in the excused
    // arm below: only the auto-explore *clearing* in `applyCommand` excuses
    // this verb, because a command must not erase its own work.
    case 'setAutoExplore':
    // Letting a piece go is an order to it, and the last one it will ever be
    // given. It names the unit like its neighbours here rather than joining the
    // excused arm below: `applyCommand` already looks the piece up and finds
    // nothing (`removeUnit` ran), which is the settler-that-founded case
    // exactly — the order spent the piece.
    case 'disbandUnit':
      return command.unitId;
    case 'foundCity':
      return command.settlerUnitId;
    case 'sleepUnit':
    case 'spawnUnit':
    case 'endTurn':
    case 'setCityProduction':
    case 'setLockedTiles':
    // Pointing a town's people at a yield names a *city*, exactly as pinning one
    // of them to a hex does. There is no piece on the board to wake.
    case 'setCitizenFocus':
    // Sending a guildsman back to the fields names a *city* and a trade. There
    // is no piece on the board to wake — a specialist is a citizen, and this
    // game has never drawn one.
    case 'dismissSpecialist':
    case 'chooseResearch':
    // Research is about the empire's schedule, not about a piece: neither
    // aiming the beakers nor dropping a node off the plan is an order to
    // anything standing on the board.
    case 'dequeueResearch':
    case 'purchaseTile':
    case 'chooseDiscovery':
    // The five Statecraft verbs name no piece at all: they are about the
    // empire's law, and a card is not an order to a warrior.
    case 'chooseOrder':
    case 'slotOrder':
    case 'unslotOrder':
    case 'adoptGovernment':
    case 'chooseDoctrine':
    // Buying a piece names a *type*, and taking a god names an offer; neither is
    // an order to anything standing on the board.
    case 'purchaseItem':
    // Pouring a bank into a basket names a city. There is nothing standing on
    // the board to wake.
    case 'contribute':
    case 'chooseBelief':
    // Naming a faith is prose about the empire, not an order to a piece.
    case 'renameReligion':
    // Calling a name answers an offer; the piece it mints does not exist yet.
    case 'chooseGreatPerson':
    // Buying the recruitment names a bank. There is no piece to wake — the
    // offer it opens does not name anybody yet.
    case 'purchaseGreatPersonOffer':
    // The five diplomacy verbs name an *empire* or a *town*, never a piece: a
    // declaration is not an order to a warrior, and neither is a peace offer,
    // an annexation or a razing. Nothing on the board wakes.
    case 'declareWar':
    case 'proposePeace':
    case 'withdrawPeace':
    case 'annexCity':
    case 'razeCity':
    // And neither is a bargain: the four deal verbs name an *empire* or a
    // paper, and a treaty is not an order to a warrior.
    case 'proposeDeal':
    case 'acceptDeal':
    case 'declineDeal':
    case 'withdrawDeal':
      return undefined;
    default: {
      const unhandled: never = kind;
      void unhandled;
      return undefined;
    }
  }
}

/**
 * Applies one command. The only function in the simulation that mutates state.
 * See the module docblock for the success/failure contract.
 *
 * Two steps rather than one, and the second is a single rule: an accepted order
 * wakes the piece it was given to (`orderedUnitId`). It runs **after** the
 * handler and **only on success**, which is what keeps the byte-identical
 * promise — a refused order does not wake anybody, because a refused order was
 * never given.
 */
export function applyCommand(state: GameState, command: Command): CommandResult {
  // **The bead diff, taken once, here** (design ledger Entry VI). `Player.beads`
  // is append-only and turn-stamped, so a mark taken before the handler and a
  // slice taken after it is exactly what this command earned, at whatever depth
  // it earned it — a city founded eight deep in `foundCityAt`, a wonder claimed
  // inside `realiseItem`, a faith founded by a prophet. Taken in *this* function
  // rather than in each handler because that is the one place every command
  // passes through, and a handler that forgot would be a bead nobody was told
  // about. `endTurn` sets the field itself first, with the boon lines the phase
  // produced; the merge below leaves those alone.
  const marks = beadMarks(state);
  // **Was the finish line open before this command?** The same before-and-after
  // the bead marks take, one scalar over, and taken here for that field's reason
  // exactly — the closing technology can land in a resolution's research phase
  // or mid-command through a windfall, and `opusOpen` is derived, so a diff is
  // the only honest way to say "this is the moment". See `CommandResult
  // .opusOpened`.
  const opusWasOpen = opusOpen(state);
  const result = runCommand(state, command);
  if (!result.ok) return result;
  if (!opusWasOpen && opusOpen(state)) result.opusOpened = true;
  const already = new Set((result.beads ?? []).map((award) => `${award.playerId}:${award.id}`));
  for (const award of beadsSince(state, marks)) {
    if (already.has(`${award.playerId}:${award.id}`)) continue;
    (result.beads ??= []).push(award);
  }
  const ordered = orderedUnitId(command);
  if (ordered !== undefined) {
    const unit = unitById(state, ordered);
    // Absent when the order spent the piece — a settler that founded a city.
    if (unit) {
      wakeUnit(unit);
      // An order is a waking, and a change of plan too: any accepted order
      // naming an auto-exploring unit calls it back to the colours, here in
      // the one seam rather than as a line in each handler — `sleeping`'s
      // argument exactly. The one excused verb is the flag's own: a
      // `setAutoExplore` that erased what it just wrote would be a switch
      // that cannot be turned on.
      if (command.type !== 'setAutoExplore') delete unit.autoExplore;
    }
  }
  return result;
}

/** The switch itself. See `applyCommand`, which is what callers use. */
function runCommand(state: GameState, command: Command): CommandResult {
  const type = readCommandType(command);
  if (type === undefined) return fail('Command is not an object with a string "type"');

  // Switching on an aliased discriminant still narrows `command` inside each
  // case, and — unlike switching on `command.type` — it leaves `kind` (not
  // `command`) as the `never` the exhaustiveness check needs in `default`.
  const kind = command.type;
  switch (kind) {
    case 'endTurn':
      return applyEndTurn(state, command);
    case 'moveUnit':
      return applyMoveUnit(state, command);
    case 'cancelOrder':
      return applyCancelOrder(state, command);
    case 'spawnUnit':
      return applySpawnUnit(state, command);
    case 'foundCity':
      return applyFoundCity(state, command);
    case 'setCityProduction':
      return applySetCityProduction(state, command);
    case 'setLockedTiles':
      return applySetLockedTiles(state, command);
    case 'setCitizenFocus':
      return applySetCitizenFocus(state, command);
    case 'dismissSpecialist':
      return applyDismissSpecialist(state, command);
    case 'chooseResearch':
      return applyChooseResearch(state, command);
    case 'dequeueResearch':
      return applyDequeueResearch(state, command);
    case 'attack':
      return applyAttack(state, command);
    case 'fortify':
      return applyFortify(state, command);
    case 'sleepUnit':
      return applySleepUnit(state, command);
    case 'setAutoExplore':
      return applySetAutoExplore(state, command);
    case 'buildImprovement':
      return applyBuildImprovement(state, command);
    case 'chopFeature':
      return applyChopFeature(state, command);
    case 'prospect':
      return applyProspect(state, command);
    case 'pillage':
      return applyPillage(state, command);
    case 'purchaseTile':
      return applyPurchaseTile(state, command);
    case 'chooseDiscovery':
      return applyChooseDiscovery(state, command);
    case 'chooseOrder':
      return applyChooseOrder(state, command);
    case 'slotOrder':
      return applySlotOrder(state, command);
    case 'unslotOrder':
      return applyUnslotOrder(state, command);
    case 'adoptGovernment':
      return applyAdoptGovernment(state, command);
    case 'chooseDoctrine':
      return applyChooseDoctrine(state, command);
    case 'purchaseItem':
      return applyPurchaseItem(state, command);
    case 'contribute':
      return applyContribute(state, command);
    case 'consecrate':
      return applyConsecrate(state, command);
    case 'chooseBelief':
      return applyChooseBelief(state, command);
    case 'performRite':
      return applyPerformRite(state, command);
    case 'plantHolySite':
      return applyPlantHolySite(state, command);
    case 'gainBelief':
      return applyGainBelief(state, command);
    case 'purge':
      return applyPurge(state, command);
    case 'proclaim':
      return applyProclaim(state, command);
    case 'redraftBeliefs':
      return applyRedraftBeliefs(state, command);
    case 'renameReligion':
      return applyRenameReligion(state, command);
    case 'chooseGreatPerson':
      return applyChooseGreatPerson(state, command);
    case 'purchaseGreatPersonOffer':
      return applyPurchaseGreatPersonOffer(state, command);
    case 'greatPersonAct':
      return applyGreatPersonAct(state, command);
    case 'greatPersonWork':
      return applyGreatPersonWork(state, command);
    case 'startRoute':
      return applyStartRoute(state, command);
    case 'setAutoResend':
      return applySetAutoResend(state, command);
    case 'cancelRoute':
      return applyCancelRoute(state, command);
    case 'disbandUnit':
      return applyDisbandUnit(state, command);
    case 'declareWar':
      return applyDeclareWar(state, command);
    case 'proposePeace':
      return applyPeaceOffer(state, command, true);
    case 'withdrawPeace':
      return applyPeaceOffer(state, command, false);
    case 'annexCity':
      return applyAnnexCity(state, command);
    case 'razeCity':
      return applyRazeCity(state, command);
    case 'proposeDeal':
      return applyProposeDeal(state, command);
    case 'acceptDeal':
      return applyAnswerDeal(state, command, 'accept');
    case 'declineDeal':
      return applyAnswerDeal(state, command, 'decline');
    case 'withdrawDeal':
      return applyAnswerDeal(state, command, 'withdraw');
    default:
      return unhandledCommand(kind, type);
  }
}
