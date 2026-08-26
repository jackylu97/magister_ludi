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

import type { ArrivalReport } from './arrival';
import { isBuildingId } from './buildingData';
import { isProjectId } from './projectData';
import {
  assignableTiles,
  foundCityAt,
  foundingError,
  purchaseTileAt,
  refreshCityDerived,
  settleProductionWindfall,
  tilePurchaseError,
} from './cities';
import { type CombatOutcome, applyCombat, fortifyError } from './combat';
import { discoveryChoiceError, settleDiscovery } from './discoveries';
import type { ImprovementId } from './improvementData';
import {
  buildImprovementAt,
  chopCity,
  chopError,
  chopFeatureAt,
  improvementError,
  pillageAt,
  pillageError,
} from './improvements';
import { getTileAt, tileIndex } from './map';
import { advanceAlongPath } from './movement';
import { type Cell, canStopOn, findPath, isPassable } from './pathfind';
import {
  beliefChoiceError,
  consecrateAt,
  consecrateError,
  performRiteAt,
  purchaseError,
  purchaseUnitAt,
  riteError,
  settleBeliefChoice,
} from './religion';
import type { RiteId } from './religionData';
import { RULES } from './rulesData';
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
import { buildError, researchError } from './tech';
import type { TechId } from './techData';
import { runEndOfTurn } from './turn';
import { type UnitTypeId, isUnitTypeId, unitDef } from './unitData';
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
 * Points this player's science at a technology.
 *
 * The only research command there is, because the model has only one decision in
 * it: progress *is* `Player.sciencePool` (see `tech.ts`), so choosing is aiming
 * rather than spending, and there is nothing to cancel, refund or bank
 * separately. Switching mid-research is therefore legal and lossless — a player
 * who reacts to something another seat did inside the same turn window keeps
 * every beaker they had banked.
 *
 * Re-choosing the tech already being researched is refused: it would change
 * nothing and put a log entry in the save that says nothing. So is a tech
 * already held, and one whose prerequisites are not met.
 *
 * Turn-gated like `setCityProduction`: choosing what to learn is an act, and a
 * seat that has declared itself finished has finished acting.
 */
export interface ChooseResearchCommand extends PlayerCommand {
  type: 'chooseResearch';
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
 * in `combat.ts` (military unit, then city, then civilian), asked at the moment
 * the command applies — so a defender that died to an earlier command in the
 * same turn window simply is not there, and the attack is refused or lands on
 * whatever remains. The interface asks the same question through `previewCombat`
 * and therefore always aims at the thing that will be hit.
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
 * Buys a unit outright, out of a named bank, in one of this player's cities.
 *
 * **Currency-agnostic in shape and faith-funded in fact** (ledger Entry XXVIII).
 * The augur is the only thing for sale today and faith is the only pool that
 * spends, but the transaction the M9 gold purchases want is this one — a city,
 * a type, a bank — so it is written once now rather than twice later. The
 * currency is *checked against the roster row* rather than trusted: a client
 * asking to buy an augur with gold is asking for something the table does not
 * sell, and `purchaseError` tells it which bank the thing is priced in.
 *
 * It names the **city** as well as the type, and both are load-bearing: the city
 * is where the piece will stand, and stacking room is asked of that hex. The
 * price is not in the command — the price is `explainPurchaseCost`'s, asked at
 * the moment this applies, so a client cannot name a figure the reducer then has
 * to second-guess.
 *
 * Instant and complete, like `purchaseTile`: there is no part-paid augur, and it
 * can act on the turn it was called, exactly as a chopped-for warrior can.
 *
 * Turn-gated like every other act. A seat that has declared itself finished has
 * finished spending.
 */
export interface PurchaseUnitCommand extends PlayerCommand {
  type: 'purchaseUnit';
  cityId: number;
  unitType: UnitTypeId;
  /** Which bank pays. Refused when it is not the one the row is priced in. */
  currency: 'faith' | 'gold';
}

/**
 * Spends an augur — the **whole** augur — to found or widen the pantheon.
 *
 * It names the unit and nothing else, which is `foundCity`'s argument: the augur
 * is what authorises it and there is nothing else to say. And it consumes the
 * piece *whatever charges are left on it*, which is the anti-spam structure
 * rather than an oversight (`docs/religion.md`): an augur is three rites **or**
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
  | ChooseResearchCommand
  | AttackCommand
  | FortifyCommand
  | SleepUnitCommand
  | BuildImprovementCommand
  | ChopFeatureCommand
  | PillageCommand
  | PurchaseTileCommand
  | ChooseDiscoveryCommand
  | ChooseOrderCommand
  | SlotOrderCommand
  | UnslotOrderCommand
  | AdoptGovernmentCommand
  | ChooseDoctrineCommand
  | PurchaseUnitCommand
  | ConsecrateCommand
  | ChooseBeliefCommand
  | PerformRiteCommand;

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
  | { ok: true; arrivals?: ArrivalReport[]; combats?: CombatOutcome[] }
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
 * asked who hit whom. Exactly one command produces it, `endTurn`, and only when
 * the wild actually struck; `attack` deliberately does not (see `applyAttack`).
 * The interface filters the list by the seat at the keyboard; the reducer has no
 * opinion about who is watching.
 */
function ok(
  arrivals?: readonly ArrivalReport[],
  combats?: readonly CombatOutcome[],
): CommandResult {
  const result: CommandResult = { ok: true };
  if (arrivals !== undefined && arrivals.length > 0) result.arrivals = [...arrivals];
  if (combats !== undefined && combats.length > 0) result.combats = [...combats];
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

  // The resolution reports what it did — today, every blow the wild landed. See
  // `TurnReport`: by the time this returns the raider has been paid and the
  // board cannot be asked who hit whom.
  const report = runEndOfTurn(state);
  clearTurnEnded(state);
  state.turn += 1;
  return ok(undefined, report.combats);
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
  if (unit.movesLeft <= 0) return fail(`Unit ${unit.id} has no movement left`);

  // `getTileAt` wraps the column, so an un-wrapped target from the UI resolves
  // to the tile the player actually clicked.
  const tile = getTileAt(state.map, target.col, target.row);
  if (!tile) return fail(`Target (${target.col}, ${target.row}) is off the map`);
  if (tile.col === unit.col && tile.row === unit.row) {
    return fail(`Unit ${unit.id} is already on (${tile.col}, ${tile.row})`);
  }
  if (!canStopOn(state, unit, tile)) {
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
  if (!marching && unit.sleeping !== true) {
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

    const blocked = buildError(state, city.ownerId, item.kind, item.id);
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
 * Aims this player's science at a technology. See `ChooseResearchCommand`.
 *
 * Two questions, asked in the order a player would think of them: may this seat
 * still act, and is that a technology they could start. The second is delegated
 * whole to `researchError` — the same function the tech screen enables its nodes
 * with — so a node the interface offers is a node this accepts.
 *
 * The mutation is one field. Nothing is spent: the pool is the progress, and it
 * stays exactly where it was even when the aim moves mid-research.
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

  const problem = researchError(state, actor.id, command.techId);
  if (problem) return fail(problem);

  actor.researching = command.techId;
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
  // The blow itself is deliberately **not** reported on `combats`. That channel
  // is for news the actor could not otherwise have — a camp's bounty already
  // banked, a raid that happened inside a resolution — and an attacker knows it
  // attacked: the interface narrates its own blow from the forecast it just
  // showed (`reportCombatNotice`). Reporting it here would also put a field on
  // the overwhelmingly common result for nobody's benefit, which is the promise
  // `CommandResult` makes above. The day a *relayed* command has to tell a
  // watching seat, that is the referee's per-seat projection (ledger Entry
  // XXIII), not this return value.
  return ok(arrival === null ? undefined : [arrival]);
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
  if (paid) settleProductionWindfall(state, paid);
  return ok();
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
  pillageAt(state, unit, tile);
  return ok();
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

  slotOrderAt(state, actor, command.cardId, command.slotIndex);
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
 * Buys a unit. See `PurchaseUnitCommand`, and `religion.ts` for the rules.
 *
 * The seat's two questions here, everything about the *sale* delegated whole to
 * `purchaseError` — `applyPurchaseTile`'s split, and the same guarantee: a
 * refusal leaves the state byte-identical, because not one line below the
 * validation runs until every question has been answered.
 */
function applyPurchaseUnit(state: GameState, command: PurchaseUnitCommand): CommandResult {
  const actor = resolveActor(state, command.playerId);
  if (typeof actor === 'string') return fail(actor);
  if (hasEndedTurn(state, actor.id)) {
    return fail(`Player ${actor.id} has ended turn ${state.turn} and cannot buy units`);
  }

  const problem = purchaseError(
    state,
    actor.id,
    command.cityId,
    command.unitType,
    command.currency,
  );
  if (problem) return fail(problem);

  // Validation is done — `purchaseError` has established the city is this
  // player's, the type is for sale in this currency, and the bank covers it.
  const city = cityById(state, command.cityId)!;
  purchaseUnitAt(state, actor, city, command.unitType);
  return ok();
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

  settleBeliefChoice(actor, command.optionIndex);
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

  const problem = riteError(state, actor.id, command.unitId, command.rite, target);
  if (problem) return fail(problem);

  const unit = unitById(state, command.unitId)!;
  performRiteAt(state, actor, unit, command.rite, target);
  return ok();
}

// --- reducer ----------------------------------------------------------------

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
    case 'pillage':
    // An augur told to consecrate or to bless is an augur given an order, so it
    // wakes like anybody else — even though the first of the two spends it.
    case 'consecrate':
    case 'performRite':
      return command.unitId;
    case 'foundCity':
      return command.settlerUnitId;
    case 'sleepUnit':
    case 'spawnUnit':
    case 'endTurn':
    case 'setCityProduction':
    case 'setLockedTiles':
    case 'chooseResearch':
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
    case 'purchaseUnit':
    case 'chooseBelief':
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
  const result = runCommand(state, command);
  if (!result.ok) return result;
  const ordered = orderedUnitId(command);
  if (ordered !== undefined) {
    const unit = unitById(state, ordered);
    // Absent when the order spent the piece — a settler that founded a city.
    if (unit) wakeUnit(unit);
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
    case 'chooseResearch':
      return applyChooseResearch(state, command);
    case 'attack':
      return applyAttack(state, command);
    case 'fortify':
      return applyFortify(state, command);
    case 'sleepUnit':
      return applySleepUnit(state, command);
    case 'buildImprovement':
      return applyBuildImprovement(state, command);
    case 'chopFeature':
      return applyChopFeature(state, command);
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
    case 'purchaseUnit':
      return applyPurchaseUnit(state, command);
    case 'consecrate':
      return applyConsecrate(state, command);
    case 'chooseBelief':
      return applyChooseBelief(state, command);
    case 'performRite':
      return applyPerformRite(state, command);
    default:
      return unhandledCommand(kind, type);
  }
}
