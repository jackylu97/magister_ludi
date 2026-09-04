/**
 * The first bot: one seat's next intention, as a `Command`.
 *
 * `nextBotCommand(state, playerId)` answers the only question an artificial seat
 * ever has to answer — *what would I like to do next?* — and answers it with a
 * single command, or `null` when the seat is content to hand the turn over. The
 * loop that keeps asking, dispatches, and finally ends the turn is `driver.ts`;
 * this file has no loop of its own and no memory between calls, which is what
 * makes it testable and what makes a replay reproduce a bot's whole game.
 *
 * The creed, and every clause of it is a deliberate simplification
 * ----------------------------------------------------------------
 *   · **Pure.** A function of `(state, playerId)` and nothing else: no
 *     `Math.random`, no `state.rng` (a bot that rolled dice would put its
 *     decisions *inside* the seeded stream and change every other outcome
 *     downstream of it), no DOM, no clock. Ties break by array and roster order,
 *     which are part of the state, so two identical boards produce identical
 *     commands on any machine.
 *   · **Omniscient.** It reads the true board rather than what its seat has
 *     charted — the fog grid is right there and it does not consult it. That is
 *     a cheat and it is written down as one; the successor is a fog-honest read
 *     (`isExploredBy` / `citySightings`), which is a pass of its own because
 *     every valuation below has to learn to say "I do not know".
 *   · **Greedy, and since tier 1 *scored*.** There is still no search and no
 *     lookahead: the bot picks the best thing available now and never asks what
 *     the board looks like two turns later. What changed (design ledger Entry
 *     LIII's ladder, *"scored greedy on the sim's own explainers → one value
 *     currency + weights"*) is that "best" is a number rather than a position in
 *     a hand-written list. Every build, every draft, every research goal is
 *     appraised in one currency by `value.ts` against the weight vector in
 *     `data/ai.json`, and the fixed lists that used to answer those questions —
 *     `ai.build.buildings`, `ai.statecraft.preferredEffectKinds`, "the cheapest
 *     open node" — are gone rather than dormant. The successor is search where
 *     it pays (combat micro, operations), then self-play tuning of the vector.
 *   · **Solvent.** It reads the simulation's own books (`empireRateReading`,
 *     `explainEmpireGold`) and prices what it is about to owe before it owes it.
 *     Entry LIX's first finding — both seats at −125💰 a turn and −1,642 in the
 *     treasury by t160 — is the whole reason this clause exists; `goldPressure`
 *     is the soft half of the answer, `maintenanceAffordable` and
 *     `disbandCommand` the hard halves.
 *   · **Peaceful toward real players by default, and hostile only when a seat
 *     says so.** At `military.aggression` 0 — which is every persona but one —
 *     it hunts the wild, garrisons its towns and never once attacks another
 *     nation's unit or city. It does *defend* against one: a rival's column
 *     standing near a town raises the threat term like a raider's would
 *     (`threatLevel`), because declining to notice an army is not diplomacy, it
 *     is negligence. Above zero, the warmonger's arm wakes: soldiers hunt a
 *     rival's pieces and push at their towns inside `military.huntRadius`, at
 *     exchanges loosened by the appetite (`favourableBlow`, `warMarch`).
 *
 *     **Since P3 that appetite is gated by an actual war.** A blow against a
 *     nation this seat is at peace with is refused by `previewCombat` and a
 *     march into its fields by `moveProfile`, so the aggressive arms below only
 *     ever fire inside a war somebody declared — and who declares, who sues and
 *     who signs is `src/ai/diplomacy.ts`. The old note here said the warmonger
 *     was starting a war nobody could end; it can now be ended, on terms, by
 *     either side.
 *   · **One seat, one sheet.** Every tuned number is read through
 *     `aiConfigFor(player.persona)` (`aiFor`, and `ValueContext.ai` for every
 *     appraisal), never off a module global — so two seats with two personas
 *     appraise differently *in the same turn*. A persona is config, rides in the
 *     save, and drives the bot rather than the reducer, so an old log replays
 *     without one.
 *
 * It never reimplements a rule
 * ----------------------------
 * Every candidate is put to the simulation's own validator before it is
 * proposed — `foundingError`, `improvementError`, `buildError`, `previewCombat`,
 * `findPath`, `startRouteError`, the four `…ChoiceError`s. A refused command
 * from this bot is therefore a *bug*, not a strategy, and `driver.ts` warns
 * loudly on one. The one documented exception is `chooseGreatPerson`, where the
 * reducer's refusal legitimately redraws a hand another seat has emptied.
 *
 * Why it lives outside `src/sim/`
 * -------------------------------
 * For `turnBlockers.ts`'s reason exactly: this is not a rule. The reducer takes
 * a command from anybody, and an opinion about which command to send is a
 * *reader* of the state. `src/sim/` must never import `src/ai/`; this module
 * imports the simulation and the one pure interface helper (`firstBlocker`),
 * and nothing else.
 */

import { AI, type AiConfig, aiConfigFor, aiConfigForPuppet } from './aiConfig';
import { diplomacyDecision } from './diplomacy';
import {
  type Appraisal,
  type BotCandidate,
  type BotDecision,
  type ValueTerm,
  appraise,
  foldTerms,
  nest,
} from './decision';
import {
  type ImprovementPlan,
  buildImprovementPlan,
  explainWorkerCraving,
  rankPlanFor,
  rankWorkSites,
} from './plan';
import {
  type ValueContext,
  type YieldBag,
  costOfUpkeep,
  explainBuildingRow,
  explainEffects,
  explainLump,
  explainProjectRow,
  explainSoldier,
  explainUpkeepCost,
  explainYields,
  valueOfBuildingRow,
  valueOfSoldier,
  valueOfYields,
  yieldDelta,
} from './value';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import { discoveryDef } from '../sim/discoveryData';
import { greatPersonDef } from '../sim/greatPeopleData';
import { improvementDef } from '../sim/improvementData';
import { projectDef } from '../sim/projectData';
import {
  type QueueItem,
  cityById,
  hasEndedTurn,
  playerById,
} from '../sim/state';
import type { City, GameState, Player, Unit } from '../sim/state';
import {
  assignableTiles,
  cityQuote,
  cityYields,
  empirePercents,
  empireRateReading,
  explainTileYield,
  foldTileYield,
  controlledResources,
  foundingError,
  foundingErrorAt,
  tileContextAt,
  tileOwnerPlayerId,
  tileYieldOf,
  turnsToBuild,
  yieldScore,
} from '../sim/cities';
import { fortifyError, previewCombat } from '../sim/combat';
import type { Command } from '../sim/commands';
import { disbandError } from '../sim/commands';
import { explainEmpireGold } from '../sim/empireGold';
import { autoExploreError, exploreTarget } from '../sim/explore';
import {
  agedActFactor,
  familyOf,
  greatPersonActError,
  greatPersonChoiceError,
  greatPersonWorkError,
  workOf,
} from '../sim/greatPeople';
import { improvementError, improvementErrorAt, prospectError } from '../sim/improvements';
import { type ImprovementId, workForFamily } from '../sim/improvementData';
import { type Tile, getTileAt, mapRange, tileHex, wrappedDistance } from '../sim/map';
import { type ResourceId, resourceDef } from '../sim/resourceData';
import { RULES } from '../sim/rulesData';
import { TILE_YIELD_KEYS, type TileYield } from '../sim/terrainData';
import { authorityOf } from '../sim/meters';
import { findPath } from '../sim/pathfind';
import { PROJECT_IDS } from '../sim/projectData';
import {
  type PurchasableItem,
  type PurchaseCurrency,
  bankOf,
  contributeError,
  explainContribution,
  explainPurchaseCost,
  purchaseError,
} from '../sim/purchase';
import {
  consecrateError,
  gainBeliefError,
  plantHolySiteError,
  riteError,
} from '../sim/religion';
import { RITE_IDS } from '../sim/religionData';
import {
  SLOT_WORDS,
  anyCardDef,
  isUpgradeIndex,
  orderOfferSize,
  slotOrderError,
  slotTypesOf,
} from '../sim/statecraft';
import {
  type CardId,
  type CardLine,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  type SlotType,
  orderFitsSlot,
  slotLayout,
} from '../sim/statecraftData';
import { type BeliefId } from '../sim/religionData';
import { TECH_IDS, UNIT_UNLOCK_TECH, type TechId, highestAge, techDef } from '../sim/techData';
import {
  availableTechs,
  buildError,
  researchExpansion,
  researchPlan,
  upgradeTargetForType,
} from '../sim/tech';
import { unitUpkeep, buildingUpkeep, unitUpkeepOf } from '../sim/upkeep';
import { bestRouteMode, startRouteError } from '../sim/trade';
import {
  type UnitTypeId,
  UNIT_TYPE_IDS,
  isCombatant,
  isExplorer,
  trades,
  unitDef,
} from '../sim/unitData';
import { sleepError } from '../sim/units';
import { atWar } from '../sim/wars';
import { hasFreshWater, isCoastal } from '../sim/water';
import { type TurnBlocker, firstBlocker } from '../ui/turnBlockers';

/**
 * The tuning surface, re-exported so every existing reader keeps its import
 * site. It lives in `aiConfig.ts` because `value.ts` reads it too — see that
 * file's docblock for why the leaf is not the top of this one.
 */
export { type AiConfig } from './aiConfig';
export { AI };
export type { BotCandidate, BotDecision, BotDecisionKind, ValueTerm } from './decision';

/**
 * **The seat's own tuning sheet.**
 *
 * A persona (`PlayerSpec.persona`, riding in the save's config) is a sparse
 * override of the whole configuration, merged and memoised by `aiConfigFor`. It
 * is asked *per seat* rather than swapped into a global for the reason two
 * personas exist at all: two seats appraise in the same turn, and a global would
 * make a decision a function of whichever seat asked last.
 *
 * Every function below that has an opinion reads this, and every appraisal reads
 * `ValueContext.ai`, which is this. There is no other door to a tuned number.
 */
function aiFor(player: Player): AiConfig {
  return aiConfigFor(player.persona);
}

/**
 * A handful of appraisals are exported for the tests and for nothing else: they
 * are the *decisions* each pass added, and every one of them is a pure function
 * whose behaviour a played game can only demonstrate statistically.
 * `valueContext`, `bestTechGoal`, `scoreCard`, `chooseProduction`,
 * `explainCitizen`, `explainNextTown` and `isPatientRow` are pinned directly in
 * `test/sim/aiBot.test.ts` and `test/sim/aiPersona.test.ts`; nothing in `src/`
 * calls them from outside this file.
 */

// --- the appraisal's context ------------------------------------------------

/**
 * What every appraisal this turn is made against — the empire's age, its size,
 * how dear a coin currently is, and how much of an enemy is standing next to its
 * towns.
 *
 * **Hoisted once per decision**, `tileOwnerField`'s bargain one system over:
 * `netGoldPerTurn` prices every city in the empire through the simulation's own
 * books, and asking it once per candidate would be forty empire sweeps to choose
 * one queue item. Its lifetime is one decision, for that helper's stated reason
 * — a context that outlived its loop would appraise against a treasury the state
 * has moved past.
 */
export function valueContext(state: GameState, player: Player): ValueContext {
  const ai = aiFor(player);
  const pressure = goldPressure(state, player);
  return {
    ai,
    age: highestAge(player.techsResearched),
    cities: Math.min(ai.score.cityCap, countCities(state, player.id)),
    goldPressure: pressure.value,
    pressureNote: pressure.note,
    threat: threatLevel(state, player),
    // A god held and no religion founded: the one window in which the road to a
    // prophet is the most valuable thing on the chart. It closes itself.
    faithAppetite:
      player.pantheon.beliefs.length > 0 && !hasFoundedReligion(state, player.id) ? 1 : 0,
  };
}

/**
 * What this empire's treasury gains and loses per turn, **as the simulation
 * reads it** — `empireRateReading` (`cities.ts`), which is the very fold
 * `collectYields` banks and a `rateConversion` prices against.
 *
 * Asked rather than reimplemented, and that is the whole point: the collapse
 * Entry LIX found (both seats at −125💰 a turn by t160) is invisible to a bot
 * that estimates its own income, because the estimate would be wrong in exactly
 * the places the real books are — the four `explainEmpireGold` lines, the debt
 * percentage, the meters' staging. There is one set of books and the bot reads
 * them.
 */
function netGoldPerTurn(state: GameState, playerId: number): number {
  return empireRateReading(state, playerId).goldPerTurn ?? 0;
}

/**
 * The standing maintenance bill: what `explainEmpireGold` is charging this
 * empire, as a positive figure.
 *
 * The negative lines only — roads, units, buildings — because what a reserve is
 * cover *for* is the bill, not the net. An empire whose connections happen to
 * cover its army this turn still owes the army next turn, and a reserve sized
 * off the net would be a reserve that vanished the moment a caravan arrived.
 */
function upkeepBill(state: GameState, playerId: number): number {
  let bill = 0;
  for (const line of explainEmpireGold(state, playerId)) {
    if (line.gold < 0) bill -= line.gold;
  }
  return bill;
}

/**
 * How much dearer a coin is than the weight table says — 1 in a healthy empire,
 * rising to `weights.debtAversion` in one that is bleeding.
 *
 * **The collapse lever** (design ledger Entry LIX, finding 1), and one number
 * doing two jobs on purpose: it multiplies the value of a gold *gain*, so a
 * market outbids a library once the books turn, and it multiplies the cost of an
 * ongoing gold *bill*, so a maintained building stops looking free. Two knobs
 * could disagree about how bad the debt is; one cannot.
 *
 * The ramp is linear over `solvency.strainSpan` below `healthyIncome`, and an
 * empire actually in arrears is pinned at full aversion however its income
 * reads — a treasury below the floor is not a trade-off, it is a fact.
 *
 * **The opening grace.** A fresh empire has one town, no market, no caravan and
 * no roads to maintain: its net gold reads as a deficit because *nothing has
 * been built yet*, not because anything is wrong, and the ramp pinned every seat
 * at full aversion by turn six of every game — twenty turns of a bot appraising
 * like a bankrupt. So while the treasury is at or above `solvency.graceTreasury`
 * **and** the game is younger than `solvency.graceTurns` **and** the books are
 * not actually falling, the pressure is 1.
 *
 * "Not actually falling" is read off the one cheap trajectory the bot honestly
 * has: `netGoldPerTurn ≥ 0`. A bot has no memory between calls (the creed's
 * first clause) and cannot difference the treasury across turns without one, so
 * a *rate* is the reading — and it is the right one anyway, because a
 * non-negative rate is exactly the statement "the treasury is not falling".
 *
 * It answers a **note beside the number** rather than a bare number, so the feed
 * can print a 1 that was decided rather than merely arrived at. The note changes
 * no fold: it is a label.
 */
function goldPressure(state: GameState, player: Player): { value: number; note: string } {
  const ai = aiFor(player);
  const { healthyIncome, strainSpan, arrearsTreasury, graceTreasury, graceTurns } = ai.solvency;
  const aversion = Math.max(1, ai.weights.debtAversion);
  if (player.gold < arrearsTreasury) return { value: aversion, note: '' };
  const net = netGoldPerTurn(state, player.id);
  if (net >= healthyIncome) return { value: 1, note: '' };
  if (player.gold >= graceTreasury && state.turn < graceTurns && net >= 0) {
    return {
      value: 1,
      note: `early grace: ${player.gold} in hand at turn ${state.turn}, and the books are not falling`,
    };
  }
  const span = Math.max(1, strainSpan);
  const strain = Math.min(1, (healthyIncome - net) / span);
  return { value: 1 + (aversion - 1) * strain, note: '' };
}

/**
 * **The hard floor**, and it is hard because a score cannot be one.
 *
 * The pressure above is the *soft* half of the solvency answer: a maintained
 * building simply stops winning its comparison. But a score can always be
 * outweighed by a big enough yield, and an empire whose income has gone negative
 * must not be able to talk itself into one more library. Below
 * `solvency.stopMaintainedBelow` nothing that costs upkeep is queued or bought
 * at all.
 *
 * It is a filter over candidates rather than a refusal to decide: `bestBuild`
 * falls back to the unfiltered list when the floor empties it, because a town
 * with nothing legal to build is a seat that can never end its turn (see
 * `chooseProduction`).
 */
function maintenanceAffordable(state: GameState, player: Player): boolean {
  return netGoldPerTurn(state, player.id) >= aiFor(player).solvency.stopMaintainedBelow;
}

/**
 * The reserve: what this bot never spends, **sized off the standing bill rather
 * than off a flat number**.
 *
 * `spending.goldReserve` alone was a hundred coins whether the empire owed five
 * a turn or a hundred and twenty-five, which is a reserve that stops meaning
 * anything at exactly the scale it starts mattering. This is that floor plus
 * `solvency.reserveTurnsOfUpkeep` turns of the real maintenance bill, so cover
 * grows with what there is to cover.
 */
function goldReserveFor(state: GameState, player: Player): number {
  const ai = aiFor(player);
  const turns = Math.max(0, ai.solvency.reserveTurnsOfUpkeep);
  return ai.spending.goldReserve + Math.floor(turns * upkeepBill(state, player.id));
}

/**
 * How many enemy combat pieces are standing within `threat.radius` of one of
 * this empire's towns.
 *
 * The omniscient reading, like every other search in this file, and it is the
 * creed's second clause said out loud rather than a new cheat: the successor is
 * a fog-honest read (`citySightings`), and the whole of what would change is
 * this function.
 *
 * "Enemy" is *anybody else's soldier* — the wild's raiders and a rival nation's
 * column both. The bot still never attacks a nation (the creed's fourth clause),
 * but declining to *defend* against one would be a bot that watched an army walk
 * up to its capital and started a library.
 */
function threatLevel(state: GameState, player: Player): number {
  const ai = aiFor(player);
  let threats = 0;
  for (const unit of state.units) {
    if (unit.ownerId === player.id) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    if (nearOwnCity(state, player, unit.col, unit.row, ai.threat.radius) === null) continue;
    threats += 1;
  }
  return Math.min(ai.score.cityCap, threats);
}

/**
 * The nearest town of this empire within `threat.radius` of a hex, or `null`.
 *
 * Shared by the threat count and the camp hunt, which is the point: "near one of
 * my towns" is one question, and a camp beside a town and a raider beside a town
 * are the same fact read twice. The two ask it at different reaches — a raider
 * inside `threat.radius` is an emergency, a camp inside `military.campHuntRadius`
 * is an errand — so the reach is the caller's and the *question* is shared.
 *
 * The reach is a required parameter rather than a default now that it is a
 * *seat's* number: a default read off a module global would be the balanced
 * seat's radius applied to a warmonger's question.
 */
function nearOwnCity(
  state: GameState,
  player: Player,
  col: number,
  row: number,
  within: number,
): { city: City; distance: number } | null {
  const from = getTileAt(state.map, col, row);
  if (!from) return null;
  const here = tileHex(from);
  let best: { city: City; distance: number } | null = null;
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    const distance = wrappedDistance(state.map, here, tileHex(tile));
    if (distance > within) continue;
    if (best === null || distance < best.distance) best = { city, distance };
  }
  return best;
}

// --- the one entry point ----------------------------------------------------

/**
 * The single next command this seat wants, or `null` when it is content to end
 * the turn.
 *
 * The order of concerns is the order the *interface* uses to nag a human
 * (`firstBlocker`), because those are exactly the decisions a seat is not
 * allowed to hand over without: an offer on the table, an idle piece, a town
 * building nothing, an unaimed science pool. Reusing that fold rather than
 * re-listing the debts here means a new blocker kind stops this switch
 * compiling, which is the point of a discriminated union.
 *
 * Between the offers and the board sits **spending**, which `firstBlocker` knows
 * nothing about because a full treasury blocks nothing at all. That is exactly
 * why it has to be here: gold and faith have no automatic sink in this game, so
 * a bot that only answered blockers would end a hundred turns rich, unbuilt and
 * losing. It goes ahead of the units and the queues because a purchase changes
 * what those decisions are about — a granary bought at noon is a granary the
 * town's citizens are already working around.
 *
 * When nothing is owed there is still *housekeeping* — four decisions that block
 * End Turn by design and would therefore never be reached by a bot that only
 * answered blockers: a banked charter (Entry XV makes adoption bankable), a card
 * standing outside a slot that fits it, **a town idling on a conversion** (a
 * project never leaves the queue, so the `cityProduction` blocker can never fire
 * for that town again — see `projectIdleCommand`), and **re-aiming the beeline**
 * when the world changes class.
 *
 * And ahead of the purse sits the **arrears** arm, because a seat whose treasury
 * has gone under is not in a position to buy anything and the one thing it can
 * do about it that pays off this turn is stop paying a wage (`disbandCommand`).
 */
export function nextBotCommand(state: GameState, playerId: number): Command | null {
  const decision = nextBotDecision(state, playerId);
  return decision === null ? null : decision.command;
}

/**
 * **The same answer, with its reasons still attached** — and the only place the
 * policy actually lives.
 *
 * `nextBotCommand` is one line over this, which is the whole discipline: there
 * is no second path a spectator could be shown that the game does not walk.
 * Every arm below returns a `BotDecision` carrying the candidates it weighed and
 * the labelled arithmetic behind each score, and every one of those numbers is
 * folded by `foldTerms` rather than described beside a separate computation —
 * see `decision.ts`. A commentary that is *not* the computation is a commentary
 * that drifts, and this bot exists to be criticised.
 *
 * Some arms weigh nothing: a worker takes the first improvement the rules will
 * accept, a prophet plants where it can. Those still report a candidate list —
 * everything they tried, in the order they tried it, each carrying the
 * simulation's own refusal — because "what the rules would not let me do" is
 * most of what a seat's turn actually consists of, and it is invisible in a
 * command log.
 */
export function nextBotDecision(state: GameState, playerId: number): BotDecision | null {
  const player = playerById(state, playerId);
  if (!player) return null;
  // The three seats a bot never drives, and each for its own reason: the wild is
  // not a nation (`realPlayers` is the register), an eliminated seat has nothing
  // to act with, and a seat that has ended its turn has said so.
  if (player.barbarian || player.eliminated) return null;
  if (hasEndedTurn(state, playerId)) return null;

  const blocker = firstBlocker(state, playerId);
  // **An offer outranks a purse.** The four drafts are decisions the reducer is
  // holding open — the reducer refuses them from a seat that has ended its turn
  // — so they are answered before anything else is considered.
  if (blocker !== null && isOfferBlocker(blocker)) {
    const answer = answerBlocker(state, player, blocker);
    if (answer !== null) return answer;
  }
  // **Arrears outrank appetite.** A seat whose treasury has gone under is not in
  // a position to buy anything, and the one thing it can do about it that does
  // not need a turn to pay off is stop paying a wage. See `disbandCommand`.
  const cut = disbandCommand(state, player);
  if (cut !== null) return cut;

  const purchase = spendCommand(state, player);
  if (purchase !== null) return purchase;

  // **What this seat has to say to somebody else**, and it is asked *before* the
  // board for one reason: a surprise war is legal (the ruling, section 2), so a
  // declaration taken now is a declaration this turn's soldiers get to act on.
  // Every arm of it is monotone — a war cannot be declared twice, an offer that
  // already stands is refused, an answered paper leaves the table — which is
  // what lets it sit ahead of the blockers without threatening the driver's
  // loop. See `src/ai/diplomacy.ts`.
  const abroad = diplomacyDecision(state, player, valueContext(state, player));
  if (abroad !== null) return abroad;

  if (blocker !== null) {
    const answer = answerBlocker(state, player, blocker);
    if (answer !== null) return answer;
  }
  return housekeeping(state, player);
}

/**
 * Is this blocker one of the four **offers** — a decision sitting on the empire
 * that no other seat can answer?
 *
 * The split matters for one reason: the reducer refuses `chooseDiscovery`,
 * `chooseOrder`, `chooseBelief` and `chooseGreatPerson` from a seat that has
 * ended its turn, so those four have to be answered before this bot does
 * anything it might spend its whole command budget on. The other three
 * (`idleUnit`, `cityProduction`, `research`) are nags, not doors.
 */
function isOfferBlocker(blocker: TurnBlocker): boolean {
  return (
    blocker.kind === 'discovery' ||
    blocker.kind === 'statecraft' ||
    blocker.kind === 'religion' ||
    blocker.kind === 'greatPerson'
  );
}

/**
 * What this seat sends about one piece of unfinished business.
 *
 * Every arm ends in a command the simulation has already agreed to, or in
 * `null` — and `null` here means "this bot has nothing legal to offer", which
 * the driver reports rather than swallows.
 */
function answerBlocker(state: GameState, player: Player, blocker: TurnBlocker): BotDecision | null {
  const playerId = player.id;
  switch (blocker.kind) {
    case 'discovery':
      return discoveryDecision(player);
    case 'statecraft':
      return blocker.what === 'order' ? orderDecision(state, player) : doctrineDecision(state, player);
    case 'religion':
      return beliefDecision(state, player);
    case 'greatPerson':
      return greatPersonDecision(state, player);
    case 'idleUnit':
      return unitCommand(state, player, blocker.unitId);
    case 'cityProduction':
      return cityCommand(state, player, blocker.cityId);
    case 'research':
      return researchCommand(state, playerId);
    default: {
      // The aliased-discriminant exhaustiveness idiom, as the reducer uses it: a
      // new blocker kind is a compile error here rather than a seat that quietly
      // cannot end its turn.
      const never: never = blocker;
      void never;
      return null;
    }
  }
}

/**
 * The two decisions that block nothing and are therefore never surfaced by
 * `firstBlocker`: claiming a banked charter, and putting a held Order into a
 * slot that fits it.
 *
 * Both are strictly monotone, which is what keeps the driver's loop finite: an
 * adoption deletes the offer it answered, and a slotting fills a slot that was
 * empty. Neither can be proposed twice about the same thing.
 */
function housekeeping(state: GameState, player: Player): BotDecision | null {
  const sc = player.statecraft;
  if (sc.pendingGovernment !== undefined) {
    const faces = adoptionTable(state, player, sc.pendingGovernment.options);
    return {
      kind: 'draft',
      command: { type: 'adoptGovernment', playerId: player.id, choiceIndex: faces.index },
      subject: player.name,
      summary:
        `Claims the charter it has banked as ${cardName(sc.pendingGovernment.options[faces.index]!)} — ` +
        'its own signature, plus what this empire’s held cards would be worth in the slots it opens.',
      candidates: faces.candidates,
    };
  }
  // **A town idling on a conversion**, which blocks nothing at all and is the
  // one thing `firstBlocker` structurally cannot see. See `projectIdleCommand`.
  const idle = projectIdleCommand(state, player);
  if (idle !== null) return idle;

  // **Re-aiming the beeline**, which blocks nothing and is therefore never
  // surfaced by `firstBlocker`: a plan laid in peacetime is still the plan when
  // a column arrives, and a bot that only answered blockers would research
  // pottery while its capital was stormed. `researchCommand` sends nothing when
  // the plan already is the goal's closure, so this is silent on every turn the
  // world has not changed class — see its docblock for why that is a proof of
  // termination rather than a hope.
  const beeline = researchCommand(state, player.id);
  if (beeline !== null) return beeline;

  return slottingDecision(state, player);
}

/**
 * **The best held card into the scarcest office it fits** — the scored slotting
 * (P3), where the v1 took the first pair the rules would accept.
 *
 * First-fit is wrong in exactly one way, and it is the way that costs an empire
 * its whole deck: a wildcard office takes *any* card, so a first-fit walk put
 * the first Order it held into the wildcard and then had nowhere to put the
 * military card it drew next. Two decisions come out of that:
 *
 *   · **the office's scarcity** — how many cards this empire holds that could go
 *     in an office of that type. A wildcard fits everything, so it is the least
 *     scarce office there is and it is spent **last**; a military office that
 *     only one held card fits is spent first, because nothing else can use it;
 *   · **the card's worth** — `scoreCard`, the same appraisal the drafts use, so
 *     a slotting and a draft cannot disagree about what a card is worth.
 *
 * One command per call, like every other arm: the best pair goes in, and the
 * next call re-asks the question on a board where that office is full. That is
 * what keeps it monotone (a slot that was empty is not), and it is also what
 * makes it *correct* — the second-best pair is re-scored against the deck the
 * first one left behind rather than fixed in advance.
 *
 * `slotOrderError` is the whole gate. A pair it accepts is a pair the command
 * accepts, and the refusals it gives (sealed, already slotted, wrong office) are
 * printed on the rows rather than restated as clauses here.
 */
function slottingDecision(state: GameState, player: Player): BotDecision | null {
  const sc = player.statecraft;
  const ctx = valueContext(state, player);
  const layout = slotTypesOf(sc);
  // How many held cards each office could take. Asked once for the whole table
  // rather than per pair, and it is the *scarcity* the placement sorts on.
  const fits = new Map<SlotType, number>();
  for (const type of layout) {
    if (fits.has(type)) continue;
    fits.set(type, sc.orders.filter((owned) => orderFitsSlot(owned.id, type)).length);
  }
  const rows: BotCandidate[] = [];
  let best: { cardId: OrderId; slot: number; row: number; score: number } | null = null;

  for (const owned of sc.orders) {
    for (let slot = 0; slot < layout.length; slot++) {
      const type = layout[slot]!;
      const label = `${cardName(owned.id)} → slot ${slot + 1} (${SLOT_WORDS[type]})`;
      const refusal = slotOrderError(state, player.id, owned.id, slot);
      if (refusal !== null) {
        rows.push({ label, score: 0, chosen: false, terms: [], rejected: refusal });
        continue;
      }
      const scarcity = Math.max(1, fits.get(type) ?? 1);
      // **The scarcer office wins the card**, and it is a *division* rather than
      // a penalty for a reason: what is being compared is value per contested
      // office. A wildcard six of this empire's cards would fit is worth a sixth
      // of what it looks like, because five other cards could have taken it; a
      // military office only one card fits is worth the whole card. A card twice
      // as good as anything else can still take the wildcard, which is right —
      // scarcity is a tie-break with teeth, not a veto.
      const terms: ValueTerm[] = [
        nest('what the card is worth', explainCard(player, owned.id, ctx)),
        {
          label: `÷ ${scarcity} — cards of this empire's that would also fit a ${SLOT_WORDS[type]} office`,
          value: scarcity,
          op: 'div',
        },
      ];
      const score = foldOf(terms);
      rows.push({ label, score, chosen: false, terms });
      if (best === null || score > best.score) {
        best = { cardId: owned.id, slot, row: rows.length - 1, score };
      }
    }
  }
  if (best === null) return null;
  rows[best.row]!.chosen = true;
  const type = layout[best.slot]!;
  return {
    kind: 'draft',
    command: { type: 'slotOrder', playerId: player.id, cardId: best.cardId, slotIndex: best.slot },
    subject: player.name,
    summary:
      `Puts ${cardName(best.cardId)} into slot ${best.slot + 1}, the ${SLOT_WORDS[type]} office — ` +
      'a card outside a slot is paying nothing, and the office fewest cards fit is filled first.',
    candidates: rows,
  };
}

/**
 * **The charter's three faces, compared** (P3) — where the v1 took face zero and
 * said so.
 *
 * A government is two things at once and both are scored: a **signature** (its
 * own effects, through `scoreCard`, which is the same appraisal every other card
 * class gets) and a **slot layout**, which is worth whatever this empire's held
 * cards would pay from inside it. The second half is the whole reason the v1
 * refused the comparison — "comparing layouts is a valuation of a whole empire's
 * card collection" — and the answer is that the collection is right there and
 * already priced: the layout is walked scarcest-office-first, greedily, and each
 * office takes the best held card still unspent.
 *
 * Greedy rather than optimal, deliberately: an exact assignment is a matching
 * problem over three offices and a handful of cards, and the difference between
 * greedy and optimal there is smaller than the difference between either and the
 * face-zero it replaces. The amnesty makes every held card available (adoption
 * rebuilds the slots array — CLAUDE.md), so nothing has to be excluded for being
 * already slotted.
 */
function adoptionTable(
  state: GameState,
  player: Player,
  options: readonly GovernmentId[],
): { index: number; candidates: BotCandidate[] } {
  const ctx = valueContext(state, player);
  const candidates: BotCandidate[] = [];
  let index = 0;
  let bestScore = -Infinity;
  for (let option = 0; option < options.length; option++) {
    const id = options[option]!;
    const layout = slotLayout(id);
    // Scarcest office first, so the wildcard is spent on whatever is left —
    // `slottingDecision`'s rule, applied to a layout this empire does not have
    // yet. Ties by the layout's own order, which is data order.
    const offices = layout
      .map((type, at) => ({
        type,
        at,
        fits: player.statecraft.orders.filter((owned) => orderFitsSlot(owned.id, type)).length,
      }))
      .sort((a, b) => a.fits - b.fits || a.at - b.at);
    const spent = new Set<OrderId>();
    const slotTerms: ValueTerm[] = [];
    for (const office of offices) {
      let take: { id: OrderId; worth: number } | null = null;
      for (const owned of player.statecraft.orders) {
        if (spent.has(owned.id)) continue;
        if (!orderFitsSlot(owned.id, office.type)) continue;
        const worth = scoreCard(player, owned.id, ctx);
        if (take === null || worth > take.worth) take = { id: owned.id, worth };
      }
      if (take === null) {
        slotTerms.push({
          label: `a ${SLOT_WORDS[office.type]} office with nothing held that fits it`,
          value: 0,
        });
        continue;
      }
      spent.add(take.id);
      slotTerms.push({
        label: `a ${SLOT_WORDS[office.type]} office, which ${cardName(take.id)} would fill`,
        value: take.worth,
      });
    }
    const terms: ValueTerm[] = [
      nest('the charter’s own signature', explainCard(player, id, ctx)),
      { label: `what its ${layout.length} slot(s) would pay`, value: foldOf(slotTerms), parts: slotTerms },
    ];
    const score = foldOf(terms);
    candidates.push({ label: cardName(id), score, chosen: false, terms });
    if (score > bestScore) {
      bestScore = score;
      index = option;
    }
  }
  if (candidates.length > 0) candidates[index]!.chosen = true;
  return { index, candidates };
}

/**
 * A town whose queue is nothing but conversions, given something to build — the
 * one decision `firstBlocker` structurally cannot ask for.
 *
 * **A project never leaves the queue** (Entry XXVI: `settleProduction`
 * subtracts, banks, and returns before the splice), so a town that once started
 * Tithes has a non-empty queue for the rest of the game and the
 * `cityProduction` blocker never fires for it again. The v0 hid this behind its
 * fixed list — projects were last, so a town only reached one after twenty-nine
 * buildings — and the scored list walked straight into it: a conversion prices
 * well when gold is dear, five towns took one, and both seats spent the last
 * eighty turns of the arena minting coin while the Magnum Opus stood unbuilt and
 * legal in every one of them.
 *
 * The fix is the *interface's* own rule, which had the answer already: a new row
 * lands **in front of the trailing run of projects** (`insertionIndex` in
 * `cityPanel.ts`). So the conversion is never cancelled — it waits behind the
 * thing worth building, and resumes when that is done.
 *
 * **It terminates, and the argument is the whole reason it is shaped this way.**
 * It fires only while the queue's *front* is a project, and it only fires when
 * `chooseProduction` — the same scorer, on the same state — names something
 * else. The moment it lands, the front is not a project and the arm is silent;
 * when that item finishes and the conversion returns to the front, the arm asks
 * again, and if the scorer still prefers the conversion, nothing is sent. Two
 * calls of one pure function on one state cannot disagree, so there is no
 * oscillation to guard against.
 */
function projectIdleCommand(state: GameState, player: Player): BotDecision | null {
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    const front = city.queue[0];
    if (front === undefined || front.kind !== 'project') continue;
    const table = productionTable(state, player, city);
    const wanted = table.best;
    if (wanted === null) continue;
    // The scorer still prefers the conversion that is already running: nothing
    // to say.
    if (sameItem(wanted, front)) continue;
    // **The rest of the queue, minus whatever `wanted` already is.** A town may
    // be holding two conversions, and the reducer refuses a queue that names one
    // twice (`validateQueue`) — so a `wanted` the queue already holds is
    // *promoted* to the front rather than added to it. That is the same command
    // either way and it keeps the arm's termination argument exact: after it
    // lands, `wanted` **is** the front, so the guard above silences the arm.
    const rest = city.queue.filter((item) => !sameItem(item, wanted));
    return {
      kind: 'build',
      command: {
        type: 'setCityProduction',
        playerId: player.id,
        cityId: city.id,
        queue: [wanted, ...rest],
      },
      subject: townSubject(city),
      summary:
        `${city.name} is idling on ${itemName(front)}, which never leaves the queue — ` +
        `${itemName(wanted)} goes in front of it.`,
      candidates: table.candidates,
      focus: { col: city.col, row: city.row },
    };
  }
  return null;
}

/** Two queue rows naming the same thing. `validateQueue`'s own reading. */
function sameItem(a: QueueItem, b: QueueItem): boolean {
  return a.kind === b.kind && a.id === b.id;
}

// --- the offers -------------------------------------------------------------

/**
 * Which card of an Order draft this bot takes: **the best-scoring one**, in the
 * one currency, with a bonus for a card that deepens a thread this empire is
 * already committed to.
 *
 * This replaces the v0's label-counting, which could not tell +1💰 from +6💰
 * (see `scoreCard`). Ties go to the first index, which is draw order and
 * therefore part of the log.
 *
 * The upgrade option — always last when there is one — is scored through the
 * card it deepens, because that is what taking it does.
 */
function orderDecision(state: GameState, player: Player): BotDecision {
  const playerId = player.id;
  const offer = player.statecraft.pendingOrder;
  if (offer === undefined) {
    return {
      kind: 'draft',
      command: { type: 'chooseOrder', playerId, optionIndex: 0 },
      subject: player.name,
      summary: 'Takes the first option: there is no offer to read.',
      candidates: [],
    };
  }
  const ctx = valueContext(state, player);
  const size = orderOfferSize(offer);
  // The index is the *offer's*, so the list keeps its holes: `pickCard` skips an
  // absent option without shifting what an index names.
  const ids: (OrderId | undefined)[] = [];
  for (let index = 0; index < size; index++) {
    ids.push(isUpgradeIndex(offer, index) ? offer.upgrade : offer.options[index]);
  }
  const picked = pickCard(player, ids, ctx);
  const taken = ids[picked.index];
  return {
    kind: 'draft',
    command: { type: 'chooseOrder', playerId, optionIndex: picked.index },
    subject: player.name,
    summary:
      taken === undefined
        ? 'Takes the first option: there is no card to read.'
        : `Drafts ${cardName(taken)} — best of ${picked.candidates.length} on effects plus the threads it already holds.`,
    candidates: picked.candidates,
  };
}

/** The best-scoring Doctrine of an adoption's triple. `orderDecision`'s twin. */
function doctrineDecision(state: GameState, player: Player): BotDecision {
  const playerId = player.id;
  const options = player.statecraft.pendingDoctrine?.options ?? [];
  const picked = pickCard(player, options, valueContext(state, player));
  return {
    kind: 'draft',
    command: { type: 'chooseDoctrine', playerId, optionIndex: picked.index },
    subject: player.name,
    summary:
      options.length === 0
        ? 'Takes the first option: there is no offer to read.'
        : `Adopts ${cardName(options[picked.index]!)} — the best-scoring of the triple.`,
    candidates: picked.candidates,
  };
}

/** The best-scoring god of a Consecrate's hand, or a follower bag's. */
function beliefDecision(state: GameState, player: Player): BotDecision {
  const playerId = player.id;
  const options = player.pantheon.pending?.options ?? [];
  const picked = pickCard(player, options, valueContext(state, player));
  return {
    kind: 'draft',
    command: { type: 'chooseBelief', playerId, optionIndex: picked.index },
    subject: player.name,
    summary:
      options.length === 0
        ? 'Takes the first option: there is no offer to read.'
        : `Takes ${cardName(options[picked.index]!)} — the best-scoring belief on offer.`,
    candidates: picked.candidates,
  };
}

/**
 * Three boons from a ruin, and the bot takes the first one.
 *
 * The one offer this bot does not score, and it says so out loud rather than
 * pretending: a ruin's boons are a technology, a lump of gold and a piece, and
 * comparing those needs a valuation of the whole empire that nothing here has.
 * The candidates are still listed, so a reader can see exactly what was passed
 * over.
 */
function discoveryDecision(player: Player): BotDecision {
  const offer = player.pendingDiscovery;
  const options = offer?.options ?? [];
  const decision: BotDecision = {
    kind: 'draft',
    command: { type: 'chooseDiscovery', playerId: player.id, optionIndex: 0 },
    subject: player.name,
    summary: 'Takes the first boon offered — this bot does not appraise a ruin’s three at all.',
    candidates: unweighed(options.map((id) => discoveryDef(id).name)),
  };
  if (offer !== undefined) decision.focus = { col: offer.col, row: offer.row };
  return decision;
}

/** The highest-scoring id of a plain list of options, ties to the first. */
function pickCard(
  player: Player,
  options: readonly (OrderId | DoctrineId | BeliefId | undefined)[],
  ctx: ValueContext,
): { index: number; candidates: BotCandidate[] } {
  const candidates: BotCandidate[] = [];
  let bestIndex = 0;
  let bestScore = -Infinity;
  let bestCandidate: BotCandidate | null = null;
  for (let index = 0; index < options.length; index++) {
    const id = options[index];
    if (id === undefined) continue;
    const appraisal = explainCard(player, id, ctx);
    const candidate: BotCandidate = {
      label: cardName(id),
      score: appraisal.total,
      chosen: false,
      terms: appraisal.terms,
    };
    if (appraisal.total > bestScore) {
      bestScore = appraisal.total;
      bestIndex = index;
      bestCandidate = candidate;
    }
    candidates.push(candidate);
  }
  if (bestCandidate !== null) bestCandidate.chosen = true;
  return { index: bestIndex, candidates };
}

/**
 * How much this bot likes one card: what its effects are worth in the one
 * currency, plus **a synergy bonus per card it already holds on the same
 * thread**.
 *
 * The valuation is `scoreEffects` (`value.ts`), which reads magnitudes off the
 * row rather than counting labels — the v0 preferred a card with three tiny
 * effects to one with a single enormous one, because all it could see was how
 * many effects wore a `kind` it liked.
 *
 * The **synergy** term is the half that makes a bot play a deck rather than
 * graze one. `CardDefBase.line` is the designer's thread — hunt, caravan, forge,
 * cloister — and nothing in the simulation switches on it (it is the screen's
 * grouping, exactly as `tier` is), which is precisely why it is safe and right
 * for a *reader* to: a bot that took the hunt card because it already had two
 * hunt cards is a bot with an identity, and `score.synergyBonus` is how strong
 * that pull is. Deferred: the successor is a real valuation of what the card
 * would pay *this* empire on *this* board, which needs the evaluators in
 * `statecraft.ts` to answer hypothetically.
 */
export function scoreCard(player: Player, id: CardId, ctx: ValueContext): number {
  return explainCard(player, id, ctx).total;
}

/** `scoreCard`'s arithmetic, labelled. See `decision.ts`. */
export function explainCard(player: Player, id: CardId, ctx: ValueContext) {
  const def = anyCardDef(id);
  const terms: ValueTerm[] = [nest('what its effects are worth', explainEffects(def.effects ?? [], ctx))];
  const line = def.line;
  if (line !== undefined) {
    const held = heldOnLine(player, line);
    terms.push({
      label: `${held} card${held === 1 ? '' : 's'} already held on the ${line} thread × ${ctx.ai.score.synergyBonus}`,
      value: ctx.ai.score.synergyBonus * held,
    });
  }
  return appraise(terms);
}

/** A card's own printed name, for a candidate row. */
function cardName(id: CardId): string {
  return anyCardDef(id).name;
}

/**
 * How many cards this empire already holds on one thread — Orders held (slotted
 * or not), Doctrines taken, and gods consecrated.
 *
 * Held rather than *slotted*, deliberately: an Order sitting outside a slot is
 * still a commitment this empire made and still says what kind of empire it is
 * trying to be. A slotted card counts twice for the same reason it is slotted —
 * it is the commitment that is actually paying.
 */
function heldOnLine(player: Player, line: CardLine): number {
  const sc = player.statecraft;
  let count = 0;
  for (const owned of sc.orders) {
    if (anyCardDef(owned.id).line === line) count += 1;
  }
  for (const slot of sc.slots) {
    if (slot !== null && anyCardDef(slot.card).line === line) count += 1;
  }
  for (const id of sc.doctrines) {
    if (anyCardDef(id).line === line) count += 1;
  }
  for (const id of player.pantheon.beliefs) {
    if (anyCardDef(id).line === line) count += 1;
  }
  return count;
}

// --- solvency ---------------------------------------------------------------

/**
 * The one piece this empire lets go, or `null` — the sharp end of Entry LIX's
 * first finding.
 *
 * The arena's two seats ended at −1,642 in the treasury with the creditors'
 * sweep unable to right it, and the reason is that a bot with no disband policy
 * has exactly one way out of a deficit: wait for the sweep to take a piece it
 * did not choose. This chooses.
 *
 * Four guards, and each closes a different way this could be a catastrophe
 * rather than a saving:
 *
 *   · it only ever fires **in arrears and bleeding** — treasury under
 *     `solvency.arrearsTreasury` *and* income under `disbandBelowIncome`, so a
 *     rich empire with a bad turn keeps its army;
 *   · it never takes the **last garrison** of a town (`military.garrisonPerCity`
 *     is the same figure the whole military branch reads), and never any piece
 *     standing in a town with an enemy nearby;
 *   · it never takes the empire below `solvency.minArmy` pieces in total — an
 *     empire with no army at all is not solvent, it is finished;
 *   · it only takes a piece that **is actually on the payroll** (`unitUpkeepOf`,
 *     which is the *piece's* reading and so respects `Unit.freeUpkeep`): letting
 *     go of a settler saves nothing at all.
 *
 * Which piece: the one paying the most gold per point of strength — the worst
 * value on the payroll, which is exactly what "redundant" means when every piece
 * is doing the same job. Ties by `state.units` order, which is a fact about the
 * board and therefore part of the replay. `disbandError` is the single gate, so
 * a routed caravan is refused by the rules rather than by a clause here.
 *
 * **Monotone**, which is what keeps the driver's loop finite: every accepted
 * disband removes a piece, so the empire cannot be asked to let the same one go
 * twice.
 */
function disbandCommand(state: GameState, player: Player): BotDecision | null {
  const ai = aiFor(player);
  if (player.gold >= ai.solvency.arrearsTreasury) return null;
  if (netGoldPerTurn(state, player.id) >= ai.solvency.disbandBelowIncome) return null;
  if (countSoldiers(state, player.id) <= Math.max(0, ai.solvency.minArmy)) return null;

  const candidates: BotCandidate[] = [];
  let worst: Unit | null = null;
  let worstValue = Infinity;
  let worstCandidate: BotCandidate | null = null;
  for (const unit of state.units) {
    if (unit.ownerId !== player.id) continue;
    const upkeep = unitUpkeepOf(unit);
    if (upkeep <= 0) {
      candidates.push(refused(unitLabel(unit), 'it is not on the payroll — letting it go saves nothing'));
      continue;
    }
    const rule = disbandError(state, player.id, unit.id);
    if (rule !== null) {
      candidates.push(refused(unitLabel(unit), rule));
      continue;
    }
    if (!isRedundant(state, player, unit)) {
      candidates.push(refused(unitLabel(unit), 'it is the last thing holding its town, or its town is threatened'));
      continue;
    }
    const def = unitDef(unit.type);
    const strength = Math.max(1, Math.max(def.combatStrength, def.rangedStrength ?? 0));
    const value = strength / upkeep;
    // **The lowest score is the one let go**, which is the one place in this bot
    // where the best candidate is the smallest number: the sort key is strength
    // bought per coin of wage, and the worst value on the payroll is what
    // "redundant" means when every piece is doing the same job.
    const candidate: BotCandidate = {
      label: unitLabel(unit),
      score: value,
      chosen: false,
      terms: [
        { label: `${strength} strength`, value: strength },
        { label: `÷ ${upkeep} gold a turn in wages`, value: upkeep, op: 'div' },
      ],
    };
    candidates.push(candidate);
    if (value < worstValue) {
      worstValue = value;
      worst = unit;
      worstCandidate = candidate;
    }
  }
  if (worst === null) return null;
  if (worstCandidate !== null) worstCandidate.chosen = true;
  return {
    kind: 'disband',
    command: { type: 'disbandUnit', playerId: player.id, unitId: worst.id },
    subject: unitLabel(worst),
    summary:
      `In arrears at ${player.gold} gold and ${netGoldPerTurn(state, player.id)} a turn: lets go the worst ` +
      'strength-per-wage piece it is allowed to. Lowest score wins here.',
    candidates,
    focus: { col: worst.col, row: worst.row },
  };
}

/**
 * May this piece be let go without leaving a town open?
 *
 * A piece standing in one of this empire's towns is redundant only while the
 * town would still hold its garrison without it **and** nothing hostile is
 * standing near that town. A piece in the field is redundant by default: it is
 * not holding anything.
 */
function isRedundant(state: GameState, player: Player, unit: Unit): boolean {
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (city.col !== unit.col || city.row !== unit.row) continue;
    if (garrisonAt(state, player.id, city) - 1 < aiFor(player).military.garrisonPerCity) return false;
    if (cityIsThreatened(state, player, city)) return false;
  }
  return true;
}

/** Is anybody else's soldier standing within `threat.radius` of this town? */
function cityIsThreatened(state: GameState, player: Player, city: City): boolean {
  const tile = getTileAt(state.map, city.col, city.row);
  if (!tile) return false;
  const here = tileHex(tile);
  for (const unit of state.units) {
    if (unit.ownerId === player.id) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    const at = getTileAt(state.map, unit.col, unit.row);
    if (!at) continue;
    if (wrappedDistance(state.map, here, tileHex(at)) <= aiFor(player).threat.radius) return true;
  }
  return false;
}

/**
 * Which name to call, and the one place this bot leans on a refusal.
 *
 * The roster is shared by every seat and resolved by log order, so a hand can
 * name somebody another empire already took. `greatPersonChoiceError` is asked
 * of each option first, so the ordinary case never reaches the reducer's
 * refusal — and when *every* option is spent there is nothing legal to send, so
 * index 0 goes out precisely to trigger the reducer's redraw (the one refusal in
 * the game that mutates; see `chooseGreatPerson`). The driver rides that out a
 * bounded number of times.
 */
function greatPersonDecision(state: GameState, player: Player): BotDecision {
  const options = player.greatPersonOffer?.options ?? [];
  const candidates: BotCandidate[] = [];
  let picked = 0;
  let found = false;
  for (let index = 0; index < options.length; index++) {
    const name = greatPersonDef(options[index]!).name;
    const rule = greatPersonChoiceError(state, player.id, index);
    if (rule === null && !found) {
      found = true;
      picked = index;
      candidates.push(chosenAt(name, index));
    } else if (rule === null) {
      candidates.push({ label: name, score: -index, chosen: false, terms: rankTerms(index) });
    } else {
      candidates.push(refused(name, rule));
    }
  }
  return {
    kind: 'draft',
    command: { type: 'chooseGreatPerson', playerId: player.id, optionIndex: picked },
    subject: player.name,
    summary: found
      ? `Calls ${greatPersonDef(options[picked]!).name} — the first name in the hand nobody else has taken.`
      : 'Every name in the hand is spent; sends the first anyway, which is what makes the reducer redraw.',
    candidates,
  };
}

/**
 * **The beeline.** A goal node, and the whole prerequisite closure behind it,
 * sent as one `chooseResearch`.
 *
 * The v0 took the *cheapest open node*, which is a serviceable stand-in for a
 * plan and nothing like one: it spread an empire evenly across the early tree
 * and never once decided it wanted anything. This picks a destination and lays
 * in the road, which is what `chooseResearch`'s `queue` parameter was built for
 * (Entry XXXIV: "the successor is a goal node and `chooseResearch`'s queue,
 * which already takes a distant target and fills in its prerequisites"). The
 * mode is `'replace'`, so what is installed is exactly `researchExpansion` of
 * the goal.
 *
 * **When it re-aims** is the part that has to be got right, because this is
 * asked every turn and a plan that changed its mind every turn would fill the
 * log with orders. The answer is *idempotence by construction*: it sends nothing
 * when the plan already **is** the goal's expansion. After the command lands the
 * plan is that expansion, so the very next ask is silent — and when the world
 * changes class (a column appears beside a town, and `bestTechGoal` starts
 * wanting a unit node), the plan and the wanted expansion differ once, one
 * command goes out, and they agree again. No memory, no flag, no countdown; the
 * comparison is the whole mechanism, which is `SlottedOrder.sealedUntil`'s
 * lesson applied to a plan.
 */
function researchCommand(state: GameState, playerId: number): BotDecision | null {
  const player = playerById(state, playerId);
  if (!player) return null;
  const table = techGoalTable(state, player);
  const goal = table.goal;
  if (goal === null) return null;
  const wanted = researchExpansion(state, playerId, goal);
  if (wanted.length === 0) return null;
  if (samePlan(researchPlan(player), wanted)) return null;
  return {
    kind: 'research',
    command: { type: 'chooseResearch', playerId, techId: goal, queue: 'replace' },
    subject: player.name,
    summary:
      `Aims at ${techDef(goal).name} and lays in the ${wanted.length}-node road behind it ` +
      `(${wanted.map((id) => techDef(id).name).join(' → ')}).`,
    candidates: table.candidates,
  };
}

/** Two plans are the same list in the same order. `tech.ts`' own comparison. */
function samePlan(a: readonly TechId[], b: readonly TechId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * The technology this empire most wants to hold, over every node it does not
 * have yet whose road is short enough to be a plan rather than a wish.
 *
 * The score is **what the node gives, over how far away it is**: its unlocks
 * appraised in the one currency (`techGifts`' own three keys, read off
 * `TechUnlocks`), plus `weights.tech` for the node itself, divided by the
 * beakers of its whole closure. That is a plain rate — value per beaker — and it
 * is why a cheap node with one good unlock can beat an expensive node with two.
 *
 * The **threat multiplier** is the beeline's half of the defence policy (design
 * addendum 1 and 3): while somebody's soldiers are standing near this empire's
 * towns, a unit unlock is worth `threat.techMilitaryFactor` times what it is
 * worth in peace, so the goal swings to the military branch and swings back when
 * the column leaves. Nothing is stored — the threat is read off the board and
 * the goal is recomputed, which is the same "a comparison, never a countdown"
 * discipline the timed effects keep.
 *
 * `research.goalHorizon` bounds the closure, which does two things: it keeps
 * this a **beeline** rather than a hundred-turn ambition, and it bounds the
 * work — a walk of fifty nodes' closures once a turn is nothing, a search over
 * the whole tree's power set would not be.
 *
 * Ties by `TECH_IDS` order, which is the roster and therefore part of the log.
 */
export function bestTechGoal(state: GameState, player: Player): TechId | null {
  return techGoalTable(state, player).goal;
}

/** `bestTechGoal`, with every node it weighed and the rate that ranked them. */
function techGoalTable(
  state: GameState,
  player: Player,
): { goal: TechId | null; candidates: BotCandidate[] } {
  const ctx = valueContext(state, player);
  const ai = ctx.ai;
  const candidates: BotCandidate[] = [];
  let best: TechId | null = null;
  let bestScore = -Infinity;
  let bestCandidate: BotCandidate | null = null;
  for (const id of TECH_IDS) {
    if (player.techsResearched.includes(id)) continue;
    const road = researchExpansion(state, player.id, id);
    if (road.length === 0) continue;
    if (road.length > ai.research.goalHorizon) {
      // Not a rejection by the rules — a rejection by this bot's own horizon,
      // which is the difference between a beeline and a hundred-turn ambition.
      candidates.push(
        refused(techDef(id).name, `${road.length} nodes away; the beeline looks ${ai.research.goalHorizon} ahead`),
      );
      continue;
    }
    let beakers = 0;
    for (const step of road) beakers += techDef(step).cost;
    const denominator = beakers / Math.max(1, ai.research.costDivisor) + 1;
    const gifts = explainTechGifts(id, ctx);
    const candidate: BotCandidate = {
      label: techDef(id).name,
      score: 0,
      chosen: false,
      terms: [
        nest('what the node unlocks', gifts),
        { label: 'holding one more technology', value: ai.weights.tech },
        {
          label: `÷ ${beakers} beakers over ${road.length} node${road.length === 1 ? '' : 's'} (${beakers} ÷ ${ai.research.costDivisor} + 1)`,
          value: denominator,
          op: 'div',
        },
      ],
    };
    candidate.score = foldOf(candidate.terms);
    candidates.push(candidate);
    if (candidate.score > bestScore) {
      bestScore = candidate.score;
      best = id;
      bestCandidate = candidate;
    }
  }
  // The floor the v0 stood on: if nothing scored — an empty horizon, a finished
  // tree — take whatever is open, cheapest first, so the seat is never left with
  // an unaimed pool it cannot end its turn over.
  if (best === null) {
    const open = availableTechs(state, player.id);
    if (open.length === 0) return { goal: null, candidates };
    let cheapest: TechId = open[0]!;
    for (const id of open) {
      if (techDef(id).cost < techDef(cheapest).cost) cheapest = id;
    }
    candidates.push({
      label: techDef(cheapest).name,
      score: 0,
      chosen: true,
      terms: [{ label: 'nothing scored — the cheapest open node, so the pool is aimed at all', value: 0 }],
    });
    return { goal: cheapest, candidates };
  }
  if (bestCandidate !== null) bestCandidate.chosen = true;
  return { goal: best, candidates };
}

/**
 * What one node hands over, in the one currency — its units, its buildings, its
 * projects and its abilities.
 *
 * A **row-only** appraisal, unlike the build list's, and deliberately: the build
 * list asks `cityYields` for a hypothetical because it has one town in hand and
 * the answer has to be exact; this asks fifty nodes a turn about buildings that
 * do not exist in any town yet, and an empire sweep per row would be the profile
 * Entry LIII already warns about. `valueOfBuildingRow` plus the row's flat
 * yields is the honest cheap reading, and it is the same weights either way.
 */
function explainTechGifts(id: TechId, ctx: ValueContext) {
  const ai = ctx.ai;
  const unlocks = techDef(id).unlocks;
  const terms: ValueTerm[] = [];
  for (const unit of unlocks.units ?? []) {
    const def = unitDef(unit);
    if (isCombatant(def) && !isExplorer(def)) {
      // The threat swing (addendum 1): a spear is worth several libraries while
      // there is a column beside the capital, and one library when there is not.
      const factor = ctx.threat > 0 ? Math.max(1, ai.threat.techMilitaryFactor) : 1;
      const soldier = explainSoldier(unit, ctx).terms;
      if (factor !== 1) soldier.push({ label: `× ${factor} (a column is near a town)`, value: factor, op: 'mul' });
      terms.push({
        label: def.name,
        value: valueOfSoldier(unit, ctx) * factor,
        parts: soldier,
      });
    } else if (def.foundsCity) {
      terms.push({ label: `${def.name} — one more town`, value: ai.weights.city });
    } else if (trades(def)) {
      terms.push({ label: `${def.name} — a caravan`, value: ai.weights.trader });
    } else if (def.prophesies === true) {
      // **The appetite's beeline** (design addendum 5). A seat that has
      // consecrated a god and founded no faith wants this door open above almost
      // anything else, and wants it not at all once it is through — which is
      // what makes a large number safe here. Read off the row's marker, never
      // off a name.
      terms.push({
        label:
          `${def.name} — the door to a religion` +
          (ctx.faithAppetite > 0 ? ' (this empire holds a god and has founded no faith)' : ''),
        value: ai.weights.worker + ai.religion.prophetTechValue * ctx.faithAppetite,
      });
    } else {
      terms.push({ label: `${def.name} — a civilian`, value: ai.weights.worker });
    }
  }
  for (const building of unlocks.buildings ?? []) {
    const def = buildingDef(building);
    const bag: Record<string, number> = {
      food: def.food,
      production: def.production,
      gold: def.gold,
      science: def.science,
      culture: def.culture,
      faith: def.faith ?? 0,
    };
    const flats = explainYields(bag, ctx).terms;
    flats.push({ label: `× ${ctx.cities} towns`, value: ctx.cities, op: 'mul' });
    terms.push({
      label: `${def.name} — its flat yields, in every town`,
      value: valueOfYields(bag, ctx) * ctx.cities,
      parts: flats,
    });
    terms.push(nest(`${def.name} — what its row gives`, explainBuildingRow(building, ctx)));
  }
  const projects = (unlocks.projects ?? []).length;
  const abilities = (unlocks.abilities ?? []).length;
  terms.push({ label: `${projects} conversion project${projects === 1 ? '' : 's'}`, value: projects * ai.research.projectValue });
  terms.push({ label: `${abilities} ability${abilities === 1 ? '' : 'ies'}`, value: abilities * ai.research.abilityValue });
  return appraise(terms);
}

// --- the two banks ----------------------------------------------------------

/**
 * The surplus, spent — or `null` when neither bank is over its threshold.
 *
 * **Gold and faith have no automatic sink**, and that is the whole reason this
 * arm exists. Nothing in the simulation converts a treasury into anything: a
 * purchase is a *decision*, so a seat that never decides simply accumulates. The
 * failure mode is not subtle — a bot two hundred turns in with nine hundred gold,
 * no walls and half its towns unimproved — and it is invisible to every test
 * that only asks whether commands were accepted.
 *
 * `purchaseError` is the **single gate**, exactly as `buildError` is for the
 * queue: the wonder clause, the augur's bank, the one-unit-per-city stamp, the
 * spawn tile and the price are all its, and none of them is restated here. What
 * *is* here is the reserve, which is not a rule at all — it is this bot's
 * opinion about how much of a standing upkeep bill to keep cover for.
 */
function spendCommand(state: GameState, player: Player): BotDecision | null {
  const gold = goldPurchase(state, player);
  if (gold !== null) return gold;
  const faith = faithPurchase(state, player);
  if (faith !== null) return faith;
  return contributionCommand(state, player);
}

/**
 * The surplus poured into a basket that will take it — the Cathedral's verb
 * (design ledger Entry LV).
 *
 * Last of the three arms, and deliberately: a purchase delivers a thing and a
 * contribution only hurries one, so a bot with the coin for a granary buys the
 * granary first. What it catches is the case the other two cannot — an empire
 * three hundred hammers into a cathedral with nine hundred gold doing nothing.
 *
 * `contributeError` is the single gate, exactly as `purchaseError` is above: the
 * marker on the row, the front of the queue, the remaining cost and the bank are
 * all its, and none of them is restated here. The reserve is this bot's own
 * opinion and is asked of `explainContribution`'s printed `spend`, which is the
 * figure the reducer charges — so "I can give this and still keep a hundred
 * back" is never a guess. Cities in founding order, gold before faith, and one
 * press per command like every other arm.
 */
function contributionCommand(state: GameState, player: Player): BotDecision | null {
  const ai = aiFor(player);
  const spend = ai.spending;
  for (const currency of ['gold', 'faith'] as const) {
    const above = currency === 'gold' ? spend.goldSpendAbove : spend.faithSpendAbove;
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      if (contributeError(state, player.id, city.id, currency) !== null) continue;
      const offer = explainContribution(state, player.id, city.id, currency);
      if (offer === null) continue;
      const front = city.queue[0];
      // **The reserve is the standing bill's, except at the finish line.** The
      // sized reserve (`goldReserveFor`) is what stops a growing empire spending
      // its cover; the row that `endsTheGame` is the one thing worth going down
      // to the flat floor for, because there is no next turn to be solvent in.
      // A deliberate carve-out, written down as one.
      const reserve =
        currency === 'faith'
          ? spend.faithReserve
          : frontRowEndsTheGame(city)
            ? spend.goldReserve
            : goldReserveFor(state, player);
      if (bankOf(player, currency) <= above + reserve) continue;
      if (bankOf(player, currency) - offer.spend < reserve) continue;
      return {
        kind: 'purchase',
        command: { type: 'contribute', playerId: player.id, cityId: city.id, currency },
        subject: city.name,
        summary:
          `Pours ${offer.spend} ${currency} into ${front === undefined ? 'the basket' : itemName(front)} at ${city.name} — ` +
          `the bank holds ${bankOf(player, currency)} and keeps ${reserve} back.`,
        candidates: [
          {
            label: `${front === undefined ? 'the front row' : itemName(front)} at ${city.name}`,
            // The score is the *surplus* — what this bank holds over its reserve
            // — because that is the only number the bot weighed. What actually
            // moves is `explainContribution`'s printed `spend`, which is the
            // reducer's own figure and is in the summary.
            score: bankOf(player, currency) - reserve,
            chosen: true,
            terms: [
              { label: `${bankOf(player, currency)} in the ${currency} bank`, value: bankOf(player, currency) },
              { label: `− ${reserve} kept back as reserve`, value: reserve, op: 'sub' },
            ],
          },
        ],
        focus: { col: city.col, row: city.row },
      };
    }
  }
  return null;
}

/** Is this town's queue front the row that closes the game? */
function frontRowEndsTheGame(city: City): boolean {
  const front = city.queue[0];
  if (front === undefined || front.kind !== 'building') return false;
  return buildingDef(front.id).endsTheGame === true;
}

/** Has this empire founded a religion? `GameState.religions` is the register. */
function hasFoundedReligion(state: GameState, playerId: number): boolean {
  for (const religion of state.religions) {
    if (religion.founderId === playerId) return true;
  }
  return false;
}

/**
 * What a rich empire buys with gold: the next building on the priority list,
 * anywhere it will go — and failing that, a soldier for a town standing empty.
 *
 * Buildings before soldiers because a bought building is permanent and a bought
 * soldier is a wall that walks away; and the building loop is *building*-outer,
 * *city*-inner so the empire finishes granaries everywhere before it starts on
 * libraries, which is the same order the queue builds them in.
 */
function goldPurchase(state: GameState, player: Player): BotDecision | null {
  const ai = aiFor(player);
  const spend = ai.spending;
  if (player.gold <= spend.goldSpendAbove + goldReserveFor(state, player)) return null;

  // **The hard floor reaches the purse too** (design ledger Entry LIX, finding
  // 1). Buying a library outright is exactly as ruinous as building one — the
  // hammers are the difference, the standing bill is the same — so an empire
  // whose income has turned buys nothing it would have to keep. See
  // `maintenanceAffordable`.
  const maintained = maintenanceAffordable(state, player);
  const ctx = valueContext(state, player);
  // Best-scoring first rather than the fixed list's order, so a bleeding empire
  // buys the market and a growing one buys the granary. The city loop is inside
  // the row loop for the v0's reason: the empire finishes a row everywhere
  // before it starts on the next.
  const order = scoredBuildingOrder(ctx);
  const candidates: BotCandidate[] = [];
  for (const row of order) {
    const id = row.id;
    const def = buildingDef(id);
    if (!maintained && buildingUpkeep(id) > 0) {
      candidates.push(
        refused(def.name, `the books are bleeding (${netGoldPerTurn(state, player.id)} gold a turn) and it costs upkeep`),
      );
      continue;
    }
    let taken: City | null = null;
    let refusal: string | null = null;
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      const item: PurchasableItem = { kind: 'building', id };
      if (affordable(state, player, city, item, 'gold')) {
        taken = city;
        break;
      }
      refusal ??= purchaseError(state, player.id, city.id, item, 'gold') ?? 'the reserve would not survive the price';
    }
    if (taken === null) {
      candidates.push(refused(def.name, refusal ?? 'no town of this empire could take delivery'));
      continue;
    }
    candidates.push({ label: `${def.name} at ${taken.name}`, score: row.value, chosen: true, terms: row.terms });
    const price = explainPurchaseCost(state, player.id, taken.id, { kind: 'building', id }, 'gold');
    return {
      kind: 'purchase',
      command: {
        type: 'purchaseItem',
        playerId: player.id,
        cityId: taken.id,
        item: { kind: 'building', id },
        currency: 'gold',
      },
      subject: taken.name,
      summary:
        `Buys ${def.name} at ${taken.name} for ${price?.total ?? '?'} gold — the best-scoring row the purse can ` +
        `reach with ${player.gold} in hand and ${goldReserveFor(state, player)} kept back.`,
      candidates,
      focus: { col: taken.col, row: taken.row },
    };
  }
  // A town with nobody standing in it is the one thing worth breaking the
  // building order for. `purchaseError` owns the one-unit-per-city stamp
  // (`City.purchasedUnitTurns`), so a town that already took delivery today is
  // simply skipped rather than fought with.
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (garrisonAt(state, player.id, city) >= ai.military.garrisonPerCity) continue;
    const soldier = bestPurchasableSoldier(state, player, city);
    if (soldier === null) continue;
    const def = unitDef(soldier);
    const strength = Math.max(def.combatStrength, def.rangedStrength ?? 0);
    candidates.push({
      label: `${def.name} at ${city.name}`,
      score: strength,
      chosen: true,
      terms: [{ label: `${strength} strength — the strongest the town can take delivery of today`, value: strength }],
    });
    return {
      kind: 'purchase',
      command: {
        type: 'purchaseItem',
        playerId: player.id,
        cityId: city.id,
        item: { kind: 'unit', id: soldier },
        currency: 'gold',
      },
      subject: city.name,
      summary: `${city.name} is standing empty: buys ${def.name} to hold it, breaking the building order to do it.`,
      candidates,
      focus: { col: city.col, row: city.row },
    };
  }
  return null;
}

/**
 * What a faithful empire buys: the cheapest thing the **faith** bank is priced
 * in — the augur, and after it the prophet — and only ever one at a time.
 *
 * "One at a time" is the whole of the restraint, and it is a restraint rather
 * than a rule: an augur is three rites or one god, so a second one standing idle
 * beside the first is faith that bought nothing. The row's own `purchase` block
 * names the bank (nothing here compares a type against `"augur"`), and roster
 * order puts the cheap one first.
 */
function faithPurchase(state: GameState, player: Player): BotDecision | null {
  const ai = aiFor(player);
  const spend = ai.spending;
  const noPantheon = player.pantheon.beliefs.length === 0;
  const unfounded = !hasFoundedReligion(state, player.id);
  const candidates: BotCandidate[] = [];

  const appetite = faithAppetiteOrder(state, player);
  for (let rank = 0; rank < appetite.length; rank++) {
    const id = appetite[rank]!;
    const def = unitDef(id);
    if (ownsAny(state, player.id, id)) {
      candidates.push(refused(def.name, 'this empire already has one standing'));
      continue;
    }

    // **Saving up is a decision too.** Once this empire has a god but no faith
    // of its own, an augur bought today is a prophet not bought this age: the
    // augur is consumed by consecrating and `ownsAny` goes false again, so a bot
    // with no hold-back buys augurs forever and reaches the classical age with
    // no religion at all — which is exactly what the arena showed. The clause is
    // read off the rows' own markers (`prophesies`), never off a name.
    if (!noPantheon && unfounded && def.prophesies !== true && wantsAProphet(state, player)) {
      candidates.push(refused(def.name, 'saving up: this empire holds a god, has no faith, and a prophet is open'));
      continue;
    }

    // **The early-game appetite** (design addendum 5). The threshold is not one
    // number: a seat with no god at all opens its bank at almost nothing for the
    // piece that would found one, because the first belief is worth more than
    // any amount of banked faith. Once both doors are open the ordinary
    // `spending.faithSpendAbove` applies again.
    let above = spend.faithSpendAbove;
    if (def.consecrates === true && noPantheon) {
      above = Math.min(above, ai.religion.pantheonSpendAbove);
    }
    if (def.prophesies === true && unfounded) {
      above = Math.min(above, ai.religion.prophetSpendAbove);
    }
    if (player.faithPool <= above + spend.faithReserve) {
      candidates.push(
        refused(def.name, `the faith bank holds ${player.faithPool}; it opens above ${above + spend.faithReserve}`),
      );
      continue;
    }

    let taken: City | null = null;
    let refusal: string | null = null;
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      const item: PurchasableItem = { kind: 'unit', id };
      if (affordable(state, player, city, item, 'faith')) {
        taken = city;
        break;
      }
      refusal ??= purchaseError(state, player.id, city.id, item, 'faith') ?? 'the reserve would not survive the price';
    }
    if (taken === null) {
      candidates.push(refused(def.name, refusal ?? 'no town of this empire could take delivery'));
      continue;
    }
    candidates.push(chosenAt(`${def.name} at ${taken.name}`, rank));
    const price = explainPurchaseCost(state, player.id, taken.id, { kind: 'unit', id }, 'faith');
    return {
      kind: 'purchase',
      command: {
        type: 'purchaseItem',
        playerId: player.id,
        cityId: taken.id,
        item: { kind: 'unit', id },
        currency: 'faith',
      },
      subject: taken.name,
      summary:
        `Calls ${def.name} at ${taken.name} for ${price?.total ?? '?'} faith — first in the appetite order ` +
        `(the first god, then the first religion, then anything else) the bank will pay for.`,
      candidates,
      focus: { col: taken.col, row: taken.row },
    };
  }
  return null;
}

/**
 * The faith-priced rows in the order this empire currently wants them.
 *
 * The v0 walked the roster and took the cheapest thing it could afford, which is
 * a policy that can only ever buy augurs: they are the cheap row, and the piece
 * is *spent* consecrating, so the empire is back where it started with a
 * hundred and twenty faith it never saved. The order here is an appetite —
 * **the first god, then the first religion, then whatever else** — and it is
 * read off the rows' own markers, never off a type name (the discipline
 * `src/sim/` keeps for `settler` and `augur`).
 *
 * Ties by roster order, which is data order and therefore part of the log.
 */
function faithAppetiteOrder(state: GameState, player: Player): UnitTypeId[] {
  const noPantheon = player.pantheon.beliefs.length === 0;
  const unfounded = !hasFoundedReligion(state, player.id);
  const rows: { id: UnitTypeId; rank: number; index: number }[] = [];
  for (let index = 0; index < UNIT_TYPE_IDS.length; index++) {
    const id = UNIT_TYPE_IDS[index]!;
    const def = unitDef(id);
    if (def.purchase?.currency !== 'faith') continue;
    let rank = 2;
    if (def.consecrates === true && noPantheon) rank = 0;
    else if (def.prophesies === true && unfounded) rank = noPantheon ? 1 : 0;
    rows.push({ id, rank, index });
  }
  rows.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return rows.map((row) => row.id);
}

/**
 * Is there a prophet this empire could call *today*, and has it none standing?
 *
 * The **unlock tech clause is the whole of the honesty here.** Holding faith
 * back for a prophet whose door has not opened is not saving, it is hoarding: it
 * cost the arena eighty turns and eight hundred banked faith on a seat that
 * never reached The High Temple. Asked of the tree's own inverse
 * (`UNIT_UNLOCK_TECH`), which is the same lookup `upkeep.ts` prices an age off —
 * so nothing here names a technology either.
 */
function wantsAProphet(state: GameState, player: Player): boolean {
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (def.prophesies !== true) continue;
    if (def.purchase?.currency !== 'faith') continue;
    if (ownsAny(state, player.id, id)) return false;
    const gate = UNIT_UNLOCK_TECH.get(id);
    if (gate !== undefined && !player.techsResearched.includes(gate)) return false;
    return true;
  }
  return false;
}

/**
 * Would this purchase be accepted, **and** leave the reserve untouched?
 *
 * Two questions and they belong to two different owners. Legality is the
 * simulation's and is asked whole (`purchaseError`); the reserve is this bot's
 * and is asked of the printed price (`explainPurchaseCost`), which is the same
 * fold the reducer charges — so "I can afford this and still keep a hundred
 * back" is never a guess.
 */
function affordable(
  state: GameState,
  player: Player,
  city: City,
  item: PurchasableItem,
  currency: PurchaseCurrency,
): boolean {
  if (purchaseError(state, player.id, city.id, item, currency) !== null) return false;
  const price = explainPurchaseCost(state, player.id, city.id, item, currency);
  if (price === null) return false;
  const reserve =
    currency === 'gold' ? goldReserveFor(state, player) : aiFor(player).spending.faithReserve;
  return bankOf(player, currency) - price.total >= reserve;
}

/** The strongest soldier this town could take delivery of today, or `null`. */
function bestPurchasableSoldier(
  state: GameState,
  player: Player,
  city: City,
): UnitTypeId | null {
  let best: UnitTypeId | null = null;
  let bestStrength = -1;
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (!isCombatant(def) || def.category === 'naval') continue;
    if (!affordable(state, player, city, { kind: 'unit', id }, 'gold')) continue;
    const strength = Math.max(def.combatStrength, def.rangedStrength ?? 0);
    if (strength > bestStrength) {
      bestStrength = strength;
      best = id;
    }
  }
  return best;
}

/** Does this empire hold any piece of this type at all? */
function ownsAny(state: GameState, playerId: number, type: UnitTypeId): boolean {
  for (const unit of state.units) {
    if (unit.ownerId === playerId && unit.type === type) return true;
  }
  return false;
}

// --- cities -----------------------------------------------------------------

/**
 * What an empty-queued town starts on.
 *
 * Priority, in the order a young empire actually needs things: a settler while
 * there is room to expand, a worker while the land is unimproved, then the
 * building order from `data/ai.json`, then a caravan, then the best soldier the
 * roster will sell it, then any conversion project. First legal wins — every
 * candidate goes through `buildError` *and* the two extra gates the reducer
 * applies on top of it (`validateQueue`: a building the town already has, and a
 * unit's `minCityPop`), so a queue this returns is a queue the reducer takes.
 */
function cityCommand(state: GameState, player: Player, cityId: number): BotDecision | null {
  const city = cityById(state, cityId);
  if (!city || city.ownerId !== player.id) return null;
  const table = productionTable(state, player, city);
  const item = table.best;
  if (item === null) return null;
  return {
    kind: 'build',
    command: { type: 'setCityProduction', playerId: player.id, cityId, queue: [item] },
    subject: townSubject(city),
    summary:
      `${city.name} starts ${itemName(item)} — best value per turn of build effort of ` +
      `${table.candidates.filter((c) => c.rejected === undefined).length} legal candidates.`,
    candidates: table.candidates,
    focus: { col: city.col, row: city.row },
  };
}

/**
 * **The scored build list** — every legal candidate appraised in the one
 * currency, per turn of build effort, best first.
 *
 * This is what tier 1 is (design ledger Entry LIII's ladder: *"scored greedy on
 * the sim's own explainers"*). The v0 walked a fixed priority list — settler,
 * worker, `ai.build.buildings` in order, caravan, best soldier, project — and
 * took the first legal thing. A fixed list cannot answer the only question a
 * town ever has: *is a granary worth more here than a spearman?* A vector can,
 * because both are priced in the same currency.
 *
 * The formula, and every term of it is somebody else's arithmetic:
 *
 *     score = (value − upkeep×goldWeight×pressure) / turnsToBuild
 *
 *   · **value** for a building is the *hypothetical delta*
 *     `cityYields(state, city, [id])` − `cityYields(state, city)`, weighted —
 *     which is the simulation's own fold, already staged by Entry XVII, already
 *     percentaged, already aware that a second library pays nothing — plus what
 *     the row gives that a yield cannot say (`valueOfBuildingRow`: happiness,
 *     authority, walls, renown, a bead, the curtain);
 *   · **value** for a unit is its role: a town, a worker, a caravan, or strength
 *     plus whatever the threat is worth (`valueOfSoldier`);
 *   · **upkeep** is `buildingUpkeep`/`unitUpkeep` — the simulation's own
 *     maintenance reading — priced at the gold weight times `goldPressure`.
 *     **This is the collapse fix's soft half**: at full aversion a maintained
 *     library is charged four times what it is charged in a healthy empire, and
 *     simply stops winning;
 *   · **turnsToBuild** is `cities.ts`' own estimate, which knows about the
 *     basket, the barracks' percentage and the front-row rate. Amortising by it
 *     is what stops a town starting a five-hundred-hammer wonder for a yield a
 *     granary would pay in six turns.
 *
 * The **hard floor** is `maintenanceAffordable`, applied as a filter and not as
 * a refusal: when it empties the list the unfiltered list is used instead,
 * because a town with nothing legal to build is a seat that can never end its
 * turn. A soldier for an *ungarrisoned* town is exempt from the floor by
 * construction — that candidate carries `essential`, which is the same sentence
 * the disband guard makes from the other end.
 *
 * Ties break by the enumeration order — `BUILDING_IDS`, `UNIT_TYPE_IDS`,
 * `PROJECT_IDS`, all of them data order — so two identical boards produce
 * identical queues, which is the contract this whole file is written to keep.
 */
export function chooseProduction(state: GameState, player: Player, city: City): QueueItem | null {
  return productionTable(state, player, city).best;
}

/**
 * **What a puppet builds, for a seat a person is sitting in.**
 *
 * The ruling (9b): a puppet's production is *visible but uncontrollable*, and it
 * is chosen by the seat's own appraisal and issued as an ordinary logged command
 * by whichever client drives the seat. For a bot seat that client is
 * `driver.ts`, and nothing extra is needed — the `cityProduction` blocker names
 * the puppet like any other town and `cityCommand` answers it under the puppet
 * profile. For a **human** seat there is no such loop, and without this the town
 * would be a blocker its own owner is not allowed to answer: the city panel
 * locks a puppet, so End Turn would stop on a decision with no door.
 *
 * So this is the door, and it is deliberately the same one: the same
 * `productionTable`, the same profile, the same command. `controls.ts` issues it
 * at the top of End Turn (see `autoPickPuppets` there), which keeps the choice
 * inside the log and therefore inside the replay.
 *
 * It returns `null` for a town that is not a puppet, so a caller cannot use it
 * to set a queue the player is entitled to set themselves.
 */
export function puppetProduction(state: GameState, player: Player, city: City): QueueItem | null {
  if (city.puppet !== true) return null;
  if (city.ownerId !== player.id) return null;
  return productionTable(state, player, city).best;
}

/**
 * `chooseProduction`, with the whole scored table it decided on.
 *
 * The **solvency floor** shows up here as a rejection rather than as a silent
 * absence, which is the point of the table: a reader wanting to know why a town
 * started a warrior instead of a library gets told the library was struck out by
 * the floor, and by what income figure.
 */
function productionTable(
  state: GameState,
  player: Player,
  city: City,
): { best: QueueItem | null; candidates: BotCandidate[] } {
  // **The opening book, ahead of the scoring** — the one hard-coded build in
  // this bot. See `openingScout`.
  const opening = openingScout(state, player, city);
  if (opening !== null) {
    return {
      best: opening,
      candidates: [
        {
          label: itemName(opening),
          score: 0,
          chosen: true,
          terms: [
            { label: 'Opening book: a scout ranges before anything else', value: 0 },
            { label: '(nothing was weighed — this is a ruling, not an appraisal)', value: 0 },
          ],
        },
      ],
    };
  }
  const ctx = puppetAwareContext(state, player, city);
  // The improvement plan, hoisted for this decision exactly as the context is:
  // the worker candidate reads it, and it walks every owned hex against every
  // improvement on the roster once rather than once per candidate.
  const plan = buildImprovementPlan(state, player, ctx);
  const restricted = buildCandidates(state, player, city, ctx, plan, city.puppet === true);
  // A puppet the restrictions leave with nothing legal to start is a blocker
  // nobody can answer, so it falls back to the unrestricted list — the solvency
  // floor's escape hatch, and for its reason exactly.
  const candidates =
    restricted.length > 0 ? restricted : buildCandidates(state, player, city, ctx, plan, false);
  if (candidates.length === 0) return { best: null, candidates: [] };

  const maintained = maintenanceAffordable(state, player);
  const floored = maintained
    ? candidates
    : candidates.filter((candidate) => candidate.upkeep <= 0 || candidate.essential);
  // The floor is never allowed to leave a town with nothing to build: an empty
  // list here is a `cityProduction` blocker nobody can answer.
  const pool = floored.length > 0 ? floored : candidates;

  let best = pool[0]!;
  for (const candidate of pool) {
    if (candidate.score > best.score) best = candidate;
  }
  const struck = pool !== candidates;
  const rows: BotCandidate[] = candidates.map((candidate) => {
    const row: BotCandidate = {
      label: itemName(candidate.item),
      score: candidate.score,
      chosen: candidate === best,
      terms: candidate.terms,
    };
    if (struck && !pool.includes(candidate)) {
      row.rejected =
        `struck out by the solvency floor: the empire makes ${netGoldPerTurn(state, player.id)} gold a turn ` +
        `and this costs ${candidate.upkeep} to keep`;
    }
    return row;
  });
  return { best: best.item, candidates: rows };
}

/**
 * **The opening book, and it is one row long.**
 *
 * The user's ruling, verbatim (`docs/bot-notes.md`): *"my general build order is
 * scout settler settler worker, that might not be optimal but first build being
 * a scout should be hard-coded."* So it is hard-coded, ahead of the scoring,
 * rather than expressed as a weight big enough to win — a weight that has to win
 * on turn one is a weight that goes on winning on turn forty, and a ruling that
 * says *first* is not a statement about how much a scout is worth.
 *
 * Three clauses, and each closes a way the book could go on firing after the
 * opening: the empire holds **one** town (so it is the first city), that town's
 * queue is **empty** (so nothing has been decided for it yet), and the empire
 * **owns or has queued no ranging piece at all**. The third is what makes it an
 * opening rather than a habit — and it is deliberately not "has this empire
 * built anything", because `unitsBuilt` only counts rows that carry an
 * `escalation` ladder (`realiseItem`) and a scout carries none, so a book asking
 * that question would order a scout, watch the counter stay empty, and order
 * another one for ever.
 *
 * `state.turn` bounds it too, with the same knob the early-scout weight uses: a
 * one-town empire that loses its ranger in the first decade may well want
 * another, and one that loses it in the fifth is not opening any more.
 *
 * `buildError` is still the gate: a roster with no ranging piece in it, or one
 * gated behind a technology, simply falls through to the scored table. The piece
 * is found by its **marker** (`isExplorer` — `ignoresTerrainCost`), never by the
 * name "scout", which is the discipline `src/sim/` keeps.
 */
function openingScout(state: GameState, player: Player, city: City): QueueItem | null {
  if (city.queue.length > 0) return null;
  if (countCities(state, player.id) !== 1) return null;
  if (state.turn >= aiFor(player).military.scoutEarlyTurns) return null;
  for (const id of UNIT_TYPE_IDS) {
    if (!isExplorer(unitDef(id))) continue;
    if (countOwnedAndQueued(state, player.id, id) > 0) return null;
  }
  for (const id of UNIT_TYPE_IDS) {
    if (!isExplorer(unitDef(id))) continue;
    if (!canQueueUnit(state, player, city, id)) continue;
    return { kind: 'unit', id };
  }
  return null;
}

/**
 * The appraisal context this town builds under — **the seat's, unless the town
 * is a puppet** (ruled 2026-09-03, `docs/flags.md`).
 *
 * A puppet's queue is chosen by the seat's own appraisal, leaning toward coin:
 * `aiConfigForPuppet` folds the puppet profile over whatever persona this seat
 * plays, so a warmonger's puppet is still a warmonger's town with a merchant's
 * taste. What the profile *cannot* say is "never a wonder, never a settler,
 * never a unit" — those are feasibility rather than preference and live in
 * `buildCandidates` as filters, exactly where the settler cap does.
 *
 * The rest of the context is unchanged and deliberately so: the empire's age,
 * its gold pressure and its threat count are facts about the empire, and a
 * puppet is in the empire.
 */
function puppetAwareContext(state: GameState, player: Player, city: City): ValueContext {
  const ctx = valueContext(state, player);
  if (city.puppet !== true) return ctx;
  return { ...ctx, ai: aiConfigForPuppet(player.persona) };
}

/** One thing a town could start, appraised. See `chooseProduction`. */
interface BuildCandidate {
  item: QueueItem;
  /** Value per turn of build effort, after upkeep. The sort key. */
  score: number;
  /** Gold per turn this would cost the empire for as long as it stands. */
  upkeep: number;
  /** True for the one candidate the solvency floor may never filter out. */
  essential: boolean;
  /** The arithmetic `score` folds from. See `decision.ts`. */
  terms: ValueTerm[];
}

/**
 * Every legal candidate for this town, priced.
 *
 * The **caps stay** — settler, worker, trader, army — because they are not
 * priorities, they are feasibility: a cap says *this empire does not want a
 * sixth settler at all*, which is a different sentence from *a settler is worth
 * less than a library here*, and scoring cannot express the first one. What the
 * caps no longer do is decide the *order*, which is what the fixed list was
 * doing and what the vector does now.
 *
 * The army cap is the one that moves with the board: `military.armyPerCity` per
 * town, plus `threat.extraArmyPerThreat` per enemy piece standing near one of
 * them (design addendum 1), so a besieged empire is allowed to raise the levy it
 * needs and a quiet one is not allowed to bankrupt itself on soldiers.
 */
function buildCandidates(
  state: GameState,
  player: Player,
  city: City,
  ctx: ValueContext,
  plan: ImprovementPlan,
  /**
   * **What an uncontrollable town will not raise** (ruled 2026-09-03): no
   * wonders, no settlers, no units at all. Read off the rows' markers rather
   * than off names, and written as a *filter* rather than as a weight for this
   * function's own stated reason — a cap says "this empire does not want one at
   * all", which is a different sentence from "it is worth less here", and
   * scoring cannot express the first.
   *
   * A parameter rather than a reading of `city.puppet` so that the caller can
   * ask the same town the question twice: a puppet the filters leave with
   * nothing to build is a `cityProduction` blocker nobody can answer, and the
   * answer to that is the unfiltered list — the same escape the solvency floor
   * takes, for the same reason.
   */
  puppet: boolean,
): BuildCandidate[] {
  const candidates: BuildCandidate[] = [];
  // The empire's half of every town's percentages, taken **once** for the whole
  // sweep rather than once per candidate — `cityQuote`'s own documented bargain,
  // and the difference between one meter sweep and forty.
  const empire = empirePercents(state, player.id);
  const base = cityYields(state, city, [], null, cityQuote(state, city, [], empire));

  for (const id of BUILDING_IDS) {
    if (!canQueueBuilding(state, player, city, id)) continue;
    if (puppet && buildingDef(id).wonder === true) continue;
    if (buildingDef(id).endsTheGame === true && !isOpusTown(state, player, city)) continue;
    const after = cityYields(state, city, [id], null, cityQuote(state, city, [id], empire));
    const delta = yieldDelta(after, base);
    const value = valueOfYields(delta, ctx) + valueOfBuildingRow(id, ctx);
    push(candidates, state, city, { kind: 'building', id }, value, buildingUpkeep(id), false, ctx, [
      nest('what this town would actually make with it', explainYields(delta, ctx)),
      nest('what its row gives beyond a yield', explainBuildingRow(id, ctx)),
    ]);
  }

  for (const id of UNIT_TYPE_IDS) {
    if (puppet) break;
    if (!canQueueUnit(state, player, city, id)) continue;
    const role = unitRoleValue(state, player, city, id, ctx, plan);
    if (role === null) continue;
    push(candidates, state, city, { kind: 'unit', id }, role.value, unitUpkeep(id), role.essential, ctx, role.terms);
  }

  for (const id of PROJECT_IDS) {
    if (buildError(state, player.id, 'project', id, city) !== null) continue;
    push(candidates, state, city, { kind: 'project', id }, explainProjectRow(id, ctx).total, 0, false, ctx, [
      nest('what one turn of the conversion pays', explainProjectRow(id, ctx)),
    ]);
  }
  return candidates;
}

/** Prices one candidate and files it, or drops it when it can never finish. */
function push(
  into: BuildCandidate[],
  state: GameState,
  city: City,
  item: QueueItem,
  value: number,
  upkeep: number,
  essential: boolean,
  ctx: ValueContext,
  valueTerms: ValueTerm[],
): void {
  const ai = ctx.ai;
  // `null` is "this town will never finish it" — no production at all — and a
  // candidate that never finishes has no score, not a bad one.
  const turns = turnsToBuild(state, city, item, 0);
  if (turns === null) return;
  const capped = Math.max(1, Math.min(ai.score.maxTurns, turns));
  // **Wonder patience.** See `isPatientRow`: a row there is only one of is
  // amortised over at most `score.patienceTurns`, because dividing a
  // hundred-and-nine-point capstone by thirty-two turns is how the endgame rows
  // came to lose to an eighty-point worker over six, every time, for ever.
  const patient = isPatientRow(item);
  const effort = patient ? Math.min(capped, Math.max(1, ai.score.patienceTurns)) : capped;
  const terms: ValueTerm[] = [
    ...valueTerms,
    nest('its standing maintenance', explainUpkeepCost(upkeep, ctx), 'sub'),
    {
      label:
        `÷ ${effort} turn${effort === 1 ? '' : 's'} of build effort` +
        (patient && effort < capped
          ? ` (patience: there is only one of it, so ${capped} turns is read as ${effort})`
          : turns > effort
            ? ` (${turns} turns, capped at ${ai.score.maxTurns})`
            : ''),
      value: effort,
      op: 'div',
    },
  ];
  into.push({ item, upkeep, essential, score: (value - costOfUpkeep(upkeep, ctx)) / effort, terms });
}

/**
 * What a unit of this type is worth to this town, or `null` when the empire does
 * not want another one at all.
 *
 * Dispatched on what the *row* says the piece is for — founds a city, carries
 * charges, trades, fights — never on a type name, which is the discipline
 * `src/sim/` keeps and a reader of the same tables has no business breaking.
 *
 * A **settler** is a town, worth less for every town already held
 * (`expansion.cityValueFalloff`), minus the citizen it costs — and a citizen is
 * no longer a flat number either (`explainCitizen`). Those two changes are what
 * make "wide" and "tall" real preferences rather than two settings of a cap.
 *
 * A **worker** is no longer flat: it is worth the ground its town actually has
 * waiting for a spade (`explainWorkerCraving` over the improvement plan), so a
 * capital ringed by unploughed wheat wants workers and a town whose every hex is
 * finished stops. A **caravan** is still a flat figure multiplied by the gold
 * pressure: a broke empire builds trade, which is the one production decision
 * that answers a deficit directly. A **soldier** carries `essential` when its
 * town is standing empty, which is the one candidate the solvency floor may
 * never filter away.
 */
function unitRoleValue(
  state: GameState,
  player: Player,
  city: City,
  id: UnitTypeId,
  ctx: ValueContext,
  plan: ImprovementPlan,
): { value: number; essential: boolean; terms: ValueTerm[] } | null {
  const ai = ctx.ai;
  const def = unitDef(id);

  if (def.foundsCity === true) {
    if (city.population < ai.expansion.settlerCityPop) return null;
    if (authorityOf(state, player.id) < ai.expansion.settlerAuthorityFloor) return null;
    if (countOwnedAndQueued(state, player.id, id) >= ai.expansion.settlerCap) return null;
    const town = explainNextTown(state, player, ctx);
    const citizen = explainCitizen(state, city, ctx);
    return {
      value: town.total - citizen.total,
      essential: false,
      terms: [
        nest('one more town', town),
        nest('the citizen it costs this town', citizen, 'sub'),
      ],
    };
  }

  if (isPlainBuilder(def)) {
    const towns = countCities(state, player.id);
    // **The cap is a safety, not the policy.** It says "this empire will not
    // keep nine spades whatever the ground looks like"; what it no longer does
    // is decide how badly a town wants the first one.
    const wanted = Math.min(ai.workers.cap, Math.floor(towns * ai.workers.perCity));
    if (countOwnedAndQueued(state, player.id, id) >= wanted) return null;
    const craving = explainWorkerCraving(plan, state, city, ctx);
    return {
      value: craving.total,
      essential: false,
      terms: [nest('the ground around this town that is waiting for a spade', craving)],
    };
  }

  if (trades(def)) {
    if (countCities(state, player.id) < 2) return null;
    const towns = countCities(state, player.id);
    const wanted = Math.min(ai.trade.traderCap, Math.floor(towns * ai.trade.tradersPerCity));
    if (countOwnedAndQueued(state, player.id, id) >= wanted) return null;
    return {
      value: ai.weights.trader * ctx.goldPressure,
      essential: false,
      terms: [
        { label: 'a caravan, flat', value: ai.weights.trader },
        { label: `× ${ctx.goldPressure} gold pressure — a broke empire trades`, value: ctx.goldPressure, op: 'mul' },
      ],
    };
  }

  // **The opening's scouts**, and this is the half that is a *weight* rather
  // than a ruling: the first scout is the opening book's (`openingScout`), and
  // this is what makes a second one compete honestly against a warrior or a
  // granary while the map is still dark. It is a soldier's value plus a
  // premium, and the premium switches itself off twice over — past
  // `military.scoutEarlyTurns`, and past `military.scoutCap` rangers — because
  // an empire in the classical age with four scouts is paying four wages to
  // rediscover its own borders.
  if (isExplorer(def) && isCombatant(def)) {
    const ranging = countOwnedAndQueued(state, player.id, id);
    const early = state.turn < ai.military.scoutEarlyTurns && ranging < ai.military.scoutCap;
    const soldier = explainSoldier(id, ctx);
    const terms: ValueTerm[] = [nest('what this piece is worth as a soldier', soldier)];
    if (early) {
      terms.push({
        label: `${ranging} ranging already, and it is turn ${state.turn} — the opening wants eyes`,
        value: ai.military.scoutBonus,
      });
    }
    return { value: foldOf(terms), essential: false, terms };
  }

  if (isCombatant(def)) {
    // Ships are a whole system this bot has no opinion about; a landlocked town
    // that queued one would build a hull it can never use.
    if (def.category === 'naval') return null;
    const held = garrisonAt(state, player.id, city);
    const empty = held < ai.military.garrisonPerCity;
    const wanted =
      countCities(state, player.id) * ai.military.armyPerCity +
      ctx.threat * ai.threat.extraArmyPerThreat;
    if (!empty && countSoldiers(state, player.id) >= wanted) return null;
    let value = valueOfSoldier(id, ctx);
    const terms: ValueTerm[] = [nest('what this soldier is worth', explainSoldier(id, ctx))];
    if (empty) {
      value += ai.threat.garrisonValue;
      terms.push({ label: 'its town is standing empty', value: ai.threat.garrisonValue });
    }
    return { value, essential: empty, terms };
  }

  // A great person is never built (`greatWork` is refused by `buildError`), and
  // an augur or a prophet is bought out of the faith bank — the row names its
  // own currency. Anything else the roster grows is worth deciding about before
  // it is queued, so it is not queued.
  return null;
}

/**
 * **What the next town is worth to an empire that already holds some.**
 *
 * `weights.city × cityValueFalloff^towns`, and the falloff is the honest tall
 * lever: before it, a settler was a flat eighty-eight points for every empire on
 * every board, so "tall" could only ever be spelled as a *cap* — which says
 * *this empire does not want a sixth town at all* rather than *a sixth town is
 * worth less to this empire than a library*. Those are different sentences and
 * only the second one is a preference.
 *
 * Towns are counted uncapped (not `ctx.cities`, which is clipped at
 * `score.cityCap` for the "in every town" scalings): the fourth town's discount
 * has to keep biting at the tenth, or the falloff stops being a curve and
 * becomes a step.
 */
export function explainNextTown(state: GameState, player: Player, ctx: ValueContext): Appraisal {
  const held = countCities(state, player.id);
  const falloff = ctx.ai.expansion.cityValueFalloff;
  const terms: ValueTerm[] = [{ label: 'a town, before what this empire already holds', value: ctx.ai.weights.city }];
  for (let index = 0; index < held; index++) {
    terms.push({
      label: `× ${round1(falloff)} — the ${ordinal(index + 1)} town this empire already holds`,
      value: falloff,
      op: 'mul',
    });
  }
  return appraise(terms);
}

/**
 * **What one citizen of this town is worth** — the user's ruling, 2026-09-03:
 * *"a citizen should be valued as a science yield too. Weight a citizen based on
 * the next potential tile that can be worked, the science that citizen would
 * produce, alongside a premium (citizens compound over time), so cities with
 * fewer than some X citizens weight citizens more heavily."*
 *
 * Three lines, and each is somebody else's number:
 *
 *   · **the ground it would work.** The best hex this town could assign a
 *     citizen to that nobody is standing on — `assignableTiles` and `yieldScore`
 *     are the simulation's own seating, so the tile named here is the tile the
 *     greedy would actually pick — priced through the town's own context and
 *     weighted like any other yield.
 *   · **the science it makes by existing.** `RULES.cities.sciencePerPop` plus
 *     every `sciencePerPop` line the town's buildings carry, which is the real
 *     per-pop rate `cityYields` bank — never a rate invented here.
 *   · **the premium**, for a town under `growth.smallCityPop`: citizens
 *     compound, so the second citizen of a hamlet is worth more than the ninth
 *     of a metropolis.
 *
 * It replaces the flat `weights.citizen`, which was one number for a starving
 * hamlet on tundra and a metropolis beside three wheat fields.
 */
export function explainCitizen(state: GameState, city: City, ctx: ValueContext): Appraisal {
  const terms: ValueTerm[] = [];
  const next = nextWorkableTile(state, city);
  if (next !== null) {
    terms.push(
      nest(
        `the ground it would work — (${next.tile.col},${next.tile.row})`,
        explainYields(bagOfTileYield(next.yields), ctx),
      ),
    );
  }
  const perPop = sciencePerPopOf(city);
  if (perPop > 0) {
    terms.push(nest('the science it makes by existing', explainYields({ science: perPop }, ctx)));
  }
  const { smallCityPop, smallCityPremium } = ctx.ai.growth;
  if (city.population < smallCityPop) {
    terms.push({
      label: `a small town's premium — ${city.population} citizens, under the ${smallCityPop} this seat calls small`,
      value: smallCityPremium,
    });
  }
  return appraise(terms);
}

/**
 * The best hex this town could seat a *new* citizen on, with what it pays.
 *
 * Asked of the simulation's own seating — `assignableTiles` is the candidate
 * list `chooseCitizens` walks and `yieldScore` is the key it sorts by — so the
 * hex named is the hex the greedy would actually take next. Hexes the town is
 * already working are skipped, which is what makes this the *next* one.
 */
function nextWorkableTile(state: GameState, city: City): { tile: Tile; yields: TileYield } | null {
  const worked = new Set(city.workedTiles.map((cell) => `${cell.col},${cell.row}`));
  let best: { tile: Tile; yields: TileYield; score: number } | null = null;
  for (const tile of assignableTiles(state, city)) {
    if (worked.has(`${tile.col},${tile.row}`)) continue;
    const yields = tileYieldOf(tile, tileContextAt(state, city.ownerId, tile));
    const score = yieldScore(yields);
    if (best === null || score > best.score) best = { tile, yields, score };
  }
  return best === null ? null : { tile: best.tile, yields: best.yields };
}

/**
 * The science one more citizen makes in this town, at the simulation's own rate.
 *
 * `RULES.cities.sciencePerPop` is the standing rate every citizen pays, and a
 * building's `sciencePerPop` rides on top of it — the same two sources
 * `cityYields` folds. Nothing here invents a rate; a library that changed what a
 * citizen was worth would change it here the same turn it changed it there.
 */
function sciencePerPopOf(city: City): number {
  let rate = RULES.cities.sciencePerPop;
  for (const id of city.buildings) rate += buildingDef(id).sciencePerPop;
  return rate;
}

/** A tile yield as a bag the appraisal weights. The keys are the six voices. */
function bagOfTileYield(yields: TileYield): YieldBag {
  const bag: YieldBag = {};
  for (const key of TILE_YIELD_KEYS) bag[key] = yields[key];
  return bag;
}

/**
 * Is this a row the empire should be **patient** about?
 *
 * A row there is only one of — `oncePerEmpire`, or a wonder, which is once per
 * *world* — or one that carries a bead or the curtain. Read off the row's own
 * markers, never against a name, which is the discipline `src/sim/` keeps and a
 * reader of the same tables has no business breaking.
 *
 * The reason it exists: the amortiser divides by `turnsToBuild`, and a capstone
 * takes thirty-two turns where a worker takes six — so a hundred-and-nine-point
 * wonder scored 3.4 against an eighty-point worker's 13.3 and *never started*,
 * however much the vector said a bead was worth. Patience says: for the things
 * there is only one of, read the wait as at most `score.patienceTurns`.
 */
export function isPatientRow(item: QueueItem): boolean {
  if (item.kind !== 'building') return false;
  const def = buildingDef(item.id);
  if (def.wonder === true) return true;
  if (def.oncePerEmpire === true) return true;
  if (def.endsTheGame === true) return true;
  return (def.onComplete ?? []).some((grant) => grant.grant === 'bead');
}

/** "first", "second", … for a term label. Falls back to the figure past three. */
function ordinal(n: number): string {
  if (n === 1) return 'first';
  if (n === 2) return 'second';
  if (n === 3) return 'third';
  return `${n}th`;
}

/**
 * Is this the town that raises the Magnum Opus?
 *
 * The only opinion in the endgame arm, and it is about *where* rather than
 * whether: the empire's busiest town, measured by the production its citizens
 * actually make (`cityYields`), because a twelve-hundred-hammer row started in a
 * hamlet is a row that never finishes. Whether it may be raised at all is
 * `buildError`'s — including once per world. Ties go to founding order, which is
 * `state.cities` order and therefore a fact the replay reproduces.
 *
 * What the row is *worth* is no longer decided here: `weights.bead` and
 * `weights.victory` are what put it at the top of the scored list, which is the
 * point — the endgame race is real to the bot because the vector says a bead is
 * worth two hundred and fifty of anything.
 */
function isOpusTown(state: GameState, player: Player, city: City): boolean {
  let best: City | null = null;
  let most = -1;
  for (const town of state.cities) {
    if (town.ownerId !== player.id) continue;
    const made = cityYields(state, town).production;
    if (made > most) {
      most = made;
      best = town;
    }
  }
  return best !== null && best.id === city.id;
}

/**
 * The building rows in scored order — what the *purse* buys, as opposed to what
 * a town builds.
 *
 * A row-only appraisal (`valueOfBuildingRow` plus the row's flat yields) rather
 * than the hypothetical the queue uses, and for a stated reason: this is asked
 * of the empire rather than of a town, so there is no town to take a
 * hypothetical against, and pricing forty rows against every town every turn is
 * the shape Entry LIII's profile note warns about. The purse is choosing an
 * *order to try things in*; `purchaseError` is still the gate that decides
 * whether any of them lands.
 *
 * It walks the **whole roster**, which is the last of the fixed lists to go:
 * `ai.build.buildings` was a hand-ordered twenty-nine rows that both decided
 * what the bot would consider and what order it would consider them in, and the
 * vector answers both questions better. Ties by `BUILDING_IDS`, which is data
 * order and therefore part of the log.
 */
function scoredBuildingOrder(ctx: ValueContext): { id: BuildingId; value: number; terms: ValueTerm[] }[] {
  const rows = BUILDING_IDS.map((id) => {
    const def = buildingDef(id);
    const bag: Record<string, number> = {
      food: def.food,
      production: def.production,
      gold: def.gold,
      science: def.science,
      culture: def.culture,
      faith: def.faith ?? 0,
    };
    const terms: ValueTerm[] = [
      nest('its flat yields', explainYields(bag, ctx)),
      nest('what its row gives', explainBuildingRow(id, ctx)),
      nest('its standing maintenance', explainUpkeepCost(buildingUpkeep(id), ctx), 'sub'),
    ];
    return { id, value: foldOf(terms), terms };
  });
  // Ties by `ai.build.buildings` order, which is the data's own list and
  // therefore part of the replay — a sort that fell back on anything else would
  // be a sort a replay could disagree with.
  const order = new Map(BUILDING_IDS.map((id, index) => [id, index]));
  rows.sort((a, b) => b.value - a.value || order.get(a.id)! - order.get(b.id)!);
  return rows;
}

/** `validateQueue`'s building clauses, mirrored so a proposal is never refused. */
function canQueueBuilding(
  state: GameState,
  player: Player,
  city: City,
  id: BuildingId,
): boolean {
  if (city.buildings.includes(id)) return false;
  return buildError(state, player.id, 'building', id, city) === null;
}

/**
 * `validateQueue`'s unit clauses, likewise — **read strictly**.
 *
 * The one place this is deliberately harder on itself than the reducer is
 * obsolescence (user, 2026-09-03). `buildError` excuses a superseded row this
 * town is already building, so that a queue holding one stays editable; a bot
 * asking "what should this town start next" is not editing anything, and a
 * warrior proposed beside a warrior would be the excuse spent on the one thing
 * it was not for. Asked of the same walk the gate asks (`upgradeTargetForType`),
 * so the two cannot drift apart.
 */
function canQueueUnit(state: GameState, player: Player, city: City, id: UnitTypeId): boolean {
  if (city.population < unitDef(id).minCityPop) return false;
  if (upgradeTargetForType(state, player.id, id) !== null) return false;
  return buildError(state, player.id, 'unit', id, city) === null;
}

// --- units ------------------------------------------------------------------

/**
 * What one idle piece does.
 *
 * Dispatched on what the *row* says the piece is for — founds a city, carries
 * charges, trades, ranges ahead, fights — never on a type name, which is the
 * discipline `src/sim/` keeps for `settler`, `augur` and `trader` and there is
 * no reason for a reader of the same tables to keep a second list.
 *
 * **Every arm ends in a command.** An idle unit that produced nothing would be a
 * seat that can never end its turn, so the last line of every branch is the one
 * order that always works: a civilian sleeps and a soldier digs in, and exactly
 * one of those two is legal for any piece (`isCivilian` is `!isCombatant`).
 */
function unitCommand(state: GameState, player: Player, unitId: number): BotDecision | null {
  const unit = findUnit(state, unitId);
  if (!unit || unit.ownerId !== player.id) return null;
  const def = unitDef(unit.type);

  const choice = (():
    | UnitChoice
    | null => {
    if (def.foundsCity === true) return settlerCommand(state, player, unit);
    if (trades(def)) return traderCommand(state, player, unit);
    if (def.consecrates === true) return augurCommand(state, player, unit);
    if (def.prophesies === true) return prophetCommand(state, player, unit);
    if (isPlainBuilder(def)) return workerCommand(state, player, unit);
    if (isExplorer(def)) return scoutCommand(state, player, unit);
    if (isCombatant(def)) return soldierCommand(state, player, unit);
    if (def.greatWork === true) return greatPersonCommand(state, player, unit);
    return standDown(unit, 'Nothing this bot knows how to do with this piece.');
  })();
  if (choice === null) return null;
  const decision: BotDecision = {
    kind: 'unitOrder',
    command: choice.command,
    subject: unitLabel(unit),
    summary: choice.summary,
    candidates: choice.candidates,
    focus: choice.focus ?? { col: unit.col, row: unit.row },
  };
  return decision;
}

/**
 * What one arm of the unit branch decided, before it is dressed as a decision.
 *
 * The arms are `null`-returning and chain into one another (a scout with nothing
 * left to chart *is* a soldier), so they answer in a shape that can be handed
 * along; `unitCommand` is the one place a piece's name and hex are attached.
 */
interface UnitChoice {
  command: Command;
  summary: string;
  candidates: BotCandidate[];
  focus?: { col: number; row: number };
}

/**
 * Is this row the piece that lays farms and mines — as opposed to the three
 * other things in the roster that also carry charges?
 *
 * Asked of the row's own markers and never of a type name, which is the
 * discipline `src/sim/` keeps for `settler`, `augur`, `trader` and
 * `greatPerson`: a reader of the same tables has no business keeping a second
 * list of what those words mean. A settler spends its charge founding, an augur
 * spends its on a rite, a prophet on a holy site, and a great person on a work
 * — none of them is a `buildImprovement`, and routing one here would be a piece
 * walking to a wheat field it can never plough.
 */
function isPlainBuilder(def: ReturnType<typeof unitDef>): boolean {
  if (def.charges === undefined) return false;
  if (def.foundsCity === true) return false;
  if (def.greatWork === true) return false;
  if (def.consecrates === true) return false;
  if (def.prophesies === true) return false;
  return true;
}

/** Sleep for a civilian, fortify for a soldier. The order that always works. */
function standDown(unit: Unit, why = 'Nothing better to do where it stands.'): UnitChoice | null {
  const sleep = sleepError(unit);
  if (sleep === null) {
    return {
      command: { type: 'sleepUnit', playerId: unit.ownerId, unitId: unit.id },
      summary: `${why} Sleeps.`,
      candidates: [chosenAt('sleep', 0)],
    };
  }
  const fortify = fortifyError(unit);
  if (fortify === null) {
    return {
      command: { type: 'fortify', playerId: unit.ownerId, unitId: unit.id },
      summary: `${why} Digs in.`,
      candidates: [refused('sleep', sleep), chosenAt('fortify', 1)],
    };
  }
  return null;
}

/**
 * A settler founds where it stands when the ground is legal and worth it, else
 * marches to the best site it can reach, else sleeps.
 *
 * The site score is the fold of a **context-less** `explainTileYield` over the
 * hex and its ring — the omniscient reading, which CLAUDE.md allows exactly here
 * (it is mapgen's own start scorer) — plus a bonus for fresh water and for a
 * coast. Context-less is also the honest reading for a *founding*: the tile is
 * nobody's yet, so there is no owner whose technologies would gate it.
 */
function settlerCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const ai = aiFor(player);
  // Hoisted for this whole decision, `valueContext`'s bargain: the site scorer
  // asks it per hex and there are two hundred hexes in a search radius.
  const held = heldResources(state, player.id);
  // Who is walking with it, asked once and read twice — here and by the march.
  const escorted = escortWithin(state, player, unit);
  const here = getTileAt(state.map, unit.col, unit.row);
  const standing =
    here === undefined
      ? null
      : { tile: here, appraisal: explainSite(state, held, ai, here), legal: foundingError(state, unit) };
  const foundHere = (why: string): UnitChoice => ({
    command: { type: 'foundCity', playerId: player.id, settlerUnitId: unit.id },
    summary: why,
    candidates: [
      {
        label: `found here (${unit.col},${unit.row})`,
        score: standing?.appraisal.total ?? 0,
        chosen: true,
        terms: standing?.appraisal.terms ?? [],
      },
    ],
  });

  if (standing !== null && standing.legal === null) {
    if (standing.appraisal.total >= ai.expansion.siteScoreMin) {
      return foundHere(
        `The ground it stands on scores ${round1(standing.appraisal.total)}, over the ` +
          `${ai.expansion.siteScoreMin} it asks for. Founds here.`,
      );
    }
    // **A settler does not march unescorted** (the user's notes, P3): a hostile
    // inside `war.escortRadius` and nothing of ours walking with it, and the
    // piece stops walking. What it does instead is *found where it stands*,
    // below the score it would have asked for — a mediocre town is worth more
    // than a settler captured in the open, and it is the one answer that cannot
    // oscillate, because founding is terminal.
    if (escorted === null) {
      const danger = nearestHostile(state, player, unit.col, unit.row, ai.war.escortRadius);
      if (danger !== null) {
        return foundHere(
          `There is ${danger.what} ${danger.distance} hexes off and nothing of ours walking with it: ` +
            `founds on ${round1(standing.appraisal.total)} ground rather than march unescorted.`,
        );
      }
    }
  }
  const march = marchToSite(state, player, unit, held, escorted, standing?.appraisal ?? null);
  if (march !== null) return march;
  // Nowhere better within reach: found here anyway if the rules allow it — a
  // settler standing around forever is worth less than a mediocre town — else
  // sleep and let the next turn's board be a different question.
  if (standing !== null && standing.legal === null) {
    return foundHere(
      `Nowhere better within ${ai.expansion.siteSearchRadius} hexes it can walk to; founds on ` +
        `${round1(standing.appraisal.total)} ground anyway rather than wander.`,
    );
  }
  return standDown(unit, 'Nowhere legal to found and nowhere better to walk.');
}

/**
 * The best reachable site inside the search radius, as a march order.
 *
 * **An unescorted settler will not walk to a hex something hostile is standing
 * near** (the user's notes, P3). It is a filter on the *destination* rather than
 * a refusal to march at all, and that is the honest reading of the ruling: a
 * settler is almost never killed where it was built, it is killed on the road to
 * the site nobody has taken yet — which is nobody's yet precisely because the
 * wild is camped in it. Struck sites appear in the table with the rules'-style
 * sentence saying what is standing near them, so the choice is readable.
 *
 * A settler with a soldier walking beside it (`escortWithin` — a garrison does
 * not count) takes those sites like any other. That is the pair `escortMarch`
 * completes from the soldier's end.
 */
function marchToSite(
  state: GameState,
  player: Player,
  unit: Unit,
  /** The empire's seams, hoisted by the caller. See `explainSite`. */
  held: ReadonlySet<ResourceId>,
  /** The piece walking with it, or `null`. See `escortWithin`. */
  escorted: Unit | null,
  here: Appraisal | null,
): UnitChoice | null {
  const ai = aiFor(player);
  const candidates: { tile: Tile; score: number; distance: number; terms: ValueTerm[] }[] = [];
  const struck: BotCandidate[] = [];
  const from = tileHex(getTileAt(state.map, unit.col, unit.row) ?? state.map.tiles[0]!);
  for (const tile of mapRange(state.map, from, ai.expansion.siteSearchRadius)) {
    if (tile.col === unit.col && tile.row === unit.row) continue;
    if (foundingErrorAt(state, player.id, tile) !== null) continue;
    const appraisal = explainSite(state, held, ai, tile);
    if (appraisal.total < ai.expansion.siteScoreMin) continue;
    if (escorted === null) {
      const danger = nearestHostile(state, player, tile.col, tile.row, ai.war.escortRadius);
      if (danger !== null) {
        struck.push(
          refused(
            `(${tile.col},${tile.row}), scoring ${round1(appraisal.total)}`,
            `${danger.what} stands ${danger.distance} hexes from it and nothing of ours is walking with this settler`,
          ),
        );
        continue;
      }
    }
    candidates.push({
      tile,
      score: appraisal.total,
      distance: wrappedDistance(state.map, from, tileHex(tile)),
      terms: appraisal.terms,
    });
  }
  // Best first, nearest on a tie, then map order — all three are facts about the
  // board rather than about the order a loop happened to visit hexes in.
  candidates.sort((a, b) => b.score - a.score || a.distance - b.distance);
  const probes = candidates.slice(0, ai.search.pathProbes);
  const hereScore = here?.total ?? 0;
  const rows: BotCandidate[] = [
    {
      label: `stay and found here (${unit.col},${unit.row})`,
      score: hereScore,
      chosen: false,
      terms: here?.terms ?? [],
    },
    // The sites the escort rule struck out, at most a handful of them so a
    // reader sees the rule bite without reading a hundred rows of it.
    ...struck.slice(0, ai.search.pathProbes),
  ];
  for (const candidate of probes) {
    const label = `(${candidate.tile.col},${candidate.tile.row}), ${candidate.distance} hexes off`;
    if (findPath(state, unit, candidate.tile) === null) {
      rows.push(refused(label, 'no route to it'));
      continue;
    }
    rows.push({ label, score: candidate.score, chosen: true, terms: candidate.terms });
    return {
      command: {
        type: 'moveUnit',
        playerId: player.id,
        unitId: unit.id,
        target: { col: candidate.tile.col, row: candidate.tile.row },
      },
      summary:
        `Marches ${candidate.distance} hexes to (${candidate.tile.col},${candidate.tile.row}), which scores ` +
        `${round1(candidate.score)} against ${round1(hereScore)} where it stands. ` +
        `${candidates.length} legal sites in range; the ${ai.search.pathProbes} best were asked for a route.`,
      candidates: rows,
      focus: { col: candidate.tile.col, row: candidate.tile.row },
    };
  }
  return null;
}

/**
 * Every resource kind this empire actually holds, as one set.
 *
 * Hoisted once per settler decision and handed to `explainSite` — see its
 * docblock for why that matters. It asks `controlledResources`, the same reading
 * the happiness meter and the deal table ask, so "this empire holds silk" means
 * one thing across the whole program; lent seams are in it, which is right,
 * because a signature on loan is a signature this empire is already paid for.
 */
function heldResources(state: GameState, playerId: number): Set<ResourceId> {
  return new Set<ResourceId>([
    ...controlledResources(state, playerId, 'luxury'),
    ...controlledResources(state, playerId, 'strategic'),
  ]);
}

/**
 * **The nearest thing that would kill a civilian standing here**, or `null`.
 *
 * "Hostile" is the wild *or* an empire this seat is actually at war with
 * (`atWar`, the simulation's own reading): since P1 a rival's column standing in
 * its own fields at peace can do nothing to a settler at all, and treating one
 * as a threat would be a bot that never expanded toward a neighbour.
 *
 * It answers about a **hex** rather than about a piece, because the settler asks
 * it twice: once about where it is standing, and once about each site it is
 * thinking of walking to. The second is the one that matters — a settler is
 * almost never killed where it was built.
 */
function nearestHostile(
  state: GameState,
  player: Player,
  col: number,
  row: number,
  within: number,
): { what: string; distance: number } | null {
  const here = getTileAt(state.map, col, row);
  if (!here) return null;
  const from = tileHex(here);
  let nearest: { what: string; distance: number } | null = null;
  for (const other of state.units) {
    if (other.ownerId === player.id) continue;
    if (!isCombatant(unitDef(other.type))) continue;
    if (!atWar(state, player.id, other.ownerId)) continue;
    const tile = getTileAt(state.map, other.col, other.row);
    if (!tile) continue;
    const distance = wrappedDistance(state.map, from, tileHex(tile));
    if (distance > within) continue;
    if (nearest !== null && distance >= nearest.distance) continue;
    const owner = playerById(state, other.ownerId);
    nearest = {
      what: owner?.barbarian === true ? 'a raider' : `a ${owner?.name ?? 'foreign'} column`,
      distance,
    };
  }
  return nearest;
}

/**
 * **The escort question**: is anything of ours walking with this civilian?
 *
 * A soldier **standing in one of this empire's towns does not count**, and that
 * clause is the whole of what makes the rule work. A settler is built in a town
 * and a town has a garrison, so a positional reading with no such clause would
 * call every settler escorted at the moment it decides where to walk — and then
 * it walks out of the gate alone, which is exactly how the arena lost its
 * settlers to the wild. A garrison is not an escort; it is a garrison.
 *
 * The pair with `escortMarch` closes: an unescorted settler is what that arm
 * looks for, and a soldier that has marched out to one is *not* standing in a
 * town, so it counts here the moment it arrives.
 */
function escortWithin(state: GameState, player: Player, unit: Unit): Unit | null {
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const from = tileHex(here);
  const within = Math.max(0, aiFor(player).war.escortRadius);
  for (const other of state.units) {
    if (other.ownerId !== player.id) continue;
    if (!isCombatant(unitDef(other.type))) continue;
    const tile = getTileAt(state.map, other.col, other.row);
    if (!tile) continue;
    if (wrappedDistance(state.map, from, tileHex(tile)) > within) continue;
    const garrison = state.cities.some(
      (city) => city.ownerId === player.id && city.col === other.col && city.row === other.row,
    );
    if (garrison) continue;
    return other;
  }
  return null;
}

/**
 * The settler this soldier walks with, or `null` — **the escort** (the user's
 * notes, P3).
 *
 * Crude and visible, which is what was asked for: the nearest settler of this
 * empire that is out in the open (not standing in one of its towns) with no
 * soldier of ours inside `war.escortRadius`, and the order is a plain march to
 * the hex it is standing on.
 *
 * Marching to the *settler* rather than to the site it is walking toward is the
 * detail that makes this stable rather than clever. The escort's leash is the
 * same radius the settler's own reading uses, so the pair walks: the settler
 * marches, the distance opens past the radius, this arm fires again and the
 * soldier closes it. Aiming at the site instead would have both pieces walking
 * to a fixed point and arriving separately, which is a convoy only by
 * coincidence.
 *
 * The two guards are the camp hunt's, word for word and for its reasons: every
 * town held first, and this piece must not be the thing holding the town it
 * stands in.
 */
function escortMarch(state: GameState, player: Player, unit: Unit): UnitTarget | null {
  if (!townsAreHeld(state, player)) return null;
  if (!isRedundant(state, player, unit)) return null;
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const from = tileHex(here);
  const wanted: { settler: Unit; distance: number }[] = [];
  for (const other of state.units) {
    if (other.ownerId !== player.id) continue;
    if (unitDef(other.type).foundsCity !== true) continue;
    if (other.col === unit.col && other.row === unit.row) continue;
    // A settler standing in one of its own towns is not in the open.
    if (state.cities.some((city) => city.ownerId === player.id && city.col === other.col && city.row === other.row)) {
      continue;
    }
    if (escortWithin(state, player, other) !== null) continue;
    const tile = getTileAt(state.map, other.col, other.row);
    if (!tile) continue;
    wanted.push({ settler: other, distance: wrappedDistance(state.map, from, tileHex(tile)) });
  }
  wanted.sort((a, b) => a.distance - b.distance || a.settler.id - b.settler.id);
  const tried: BotCandidate[] = [];
  for (const entry of wanted.slice(0, aiFor(player).search.pathProbes)) {
    const tile = getTileAt(state.map, entry.settler.col, entry.settler.row);
    if (!tile) continue;
    const label = `escort ${unitLabel(entry.settler)} at (${entry.settler.col},${entry.settler.row})`;
    if (findPath(state, unit, tile) === null) {
      tried.push(refused(label, 'no route to it'));
      continue;
    }
    // **The lowest score marches**, as in the two hunts: the key is hexes to the
    // piece being escorted.
    tried.push({
      label,
      score: entry.distance,
      chosen: true,
      terms: [
        { label: `${entry.distance} hexes to the nearest settler of ours walking alone`, value: entry.distance },
        { label: '(a settler with nothing beside it does not march at all)', value: 0 },
      ],
    });
    return {
      at: { col: entry.settler.col, row: entry.settler.row },
      summary:
        `Marches ${entry.distance} hexes to walk with ${unitLabel(entry.settler)}, which is out in the open with ` +
        'nothing of ours beside it.',
      candidates: tried,
    };
  }
  return null;
}

/**
 * What a hex is worth as a city site: the weighted fold of its own yield and of
 * every hex in its rings, plus the things a town cares about that no tile yield
 * says — fresh water, a coast, and **a kind of resource this empire has none
 * of**.
 *
 * The ring is one flat run of adds rather than a per-hex subtotal, and that is
 * the arithmetic rather than a presentation choice: regrouping the sum would
 * move the last bits and a settler would walk somewhere else.
 *
 * **Two rings, with a falloff** (P3). One ring was less ground than a town
 * actually works, so a hill with three good neighbours outscored a river bend
 * with nine; the second ring is folded at `site.ringFalloff` of the first, which
 * is the honest statement that a town works its inner ring first and may never
 * reach the outer one at all. The falloff is per *ring* rather than per hex, so
 * every hex at the same distance is worth the same thing whatever order the
 * range walk visits them in.
 *
 * **Kind awareness** is the other half, and it is what a settler is really for
 * once an empire has any ground at all: a luxury is a *signature* and a second
 * copy of one pays nothing new (`resourceEffects.ts`), so what makes a site
 * valuable is a kind nobody in this empire holds. Read off the row's `kind` and
 * asked of the empire (`hasResource`), never against a name.
 *
 * The reading is deliberately **omniscient** — `explainTileYield` with no
 * context, mapgen's own start scorer, which CLAUDE.md allows exactly here — and
 * `held` is a fact about the *empire*, so a seam a rival has revealed and this
 * empire cannot name still counts. That is the creed's second clause, unchanged.
 *
 * `held` is **hoisted by the caller**, `tileOwnerField`'s bargain one system
 * over and for exactly its reason: `hasResource` sweeps the whole map, and a
 * settler prices two hundred candidate hexes in one decision. Asked per hex it
 * would be two hundred map sweeps to choose where to walk.
 */
function explainSite(
  state: GameState,
  held: ReadonlySet<ResourceId>,
  ai: AiConfig,
  tile: Tile,
) {
  const ring: ValueTerm[] = [];
  const bonuses: ValueTerm[] = [];
  const here = tileHex(tile);
  const seen = new Set<ResourceId>();
  for (const near of mapRange(state.map, here, Math.max(0, ai.site.ringRadius))) {
    const steps = wrappedDistance(state.map, here, tileHex(near));
    const falloff = Math.pow(ai.site.ringFalloff, steps);
    const yields = foldTileYield(explainTileYield(near));
    for (const [voice, weight] of Object.entries(ai.site.yieldWeights) as [string, number][]) {
      const value = (yields as unknown as Record<string, number>)[voice];
      if (typeof value === 'number') {
        ring.push({
          label:
            `(${near.col},${near.row}) ${voice} ${value} × ${weight}` +
            (steps === 0 ? '' : ` × ${round1(falloff)} (ring ${steps})`),
          value: value * weight * falloff,
        });
      }
    }
    // The seam itself, once per kind: a site with two silk hexes is still a
    // site that opens silk, which is exactly what the signature pays for.
    const resource = near.resource;
    if (resource === undefined || seen.has(resource)) continue;
    seen.add(resource);
    if (held.has(resource)) continue;
    const kind = resourceDef(resource).kind;
    if (kind === 'luxury') {
      bonuses.push({
        label: `${resourceDef(resource).name} at (${near.col},${near.row}) — a luxury this empire holds none of`,
        value: ai.site.newLuxuryBonus,
      });
    } else if (kind === 'strategic') {
      bonuses.push({
        label: `${resourceDef(resource).name} at (${near.col},${near.row}) — a strategic kind this empire cannot field`,
        value: ai.site.newStrategicBonus,
      });
    }
  }
  const terms: ValueTerm[] = [
    { label: `the hex and its ${ai.site.ringRadius} ring(s), weighted`, value: foldOf(ring), parts: ring },
  ];
  if (hasFreshWater(tile)) terms.push({ label: 'fresh water', value: ai.site.freshWaterBonus });
  if (isCoastal(state.map, tile)) terms.push({ label: 'a coast', value: ai.site.coastBonus });
  terms.push(...bonuses);
  return appraise(terms);
}


/**
 * **A worker reads the plan.**
 *
 * The v1 answered two questions with two fixed lists: *what to lay* was the
 * first row of `ai.workers.improvements` the rules would accept — so a hex that
 * wanted a mine got a farm whenever a farm was legal — and *where to walk* was
 * `nearestWorkableTile`, which sorted by distance alone and sent a spade past a
 * wheat field to reach a nearer patch of tundra.
 *
 * Both are one scored table now (`plan.ts`): every legal pairing of a hex and an
 * improvement, priced by the simulation's own `improvementYieldDelta` through
 * the **owning town's** context, weighted in the one currency, discounted by the
 * walk. The piece walks that table and takes the first row the rules will let it
 * act on — which is the same shape every other arm has, with a real appraisal
 * where the preference order used to be.
 *
 * `improvementError` is still the whole gate for the standing case (charges,
 * movement, the ground, the seam, the technology); the plan's own gate is
 * `improvementErrorAt`, its ground-only half, which is what a search over hexes
 * with no worker on them needs. So a row this arm proposes is a row the reducer
 * takes.
 */
function workerCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const ai = aiFor(player);
  const ctx = valueContext(state, player);
  // Built here rather than hoisted for the whole turn because it is only these
  // few pieces that ask: a plan walked for every settler and scout as well would
  // be the map swept a dozen times a turn for nothing.
  const plan = buildImprovementPlan(state, player, ctx);
  const ranked = rankPlanFor(plan, state, unit, ctx);
  // The shortlist is two data numbers rather than a constant: how many entries a
  // town's craving folds, plus how many routes this bot will ever pay for.
  const shortlist = ranked.slice(0, Math.max(1, ai.workers.planTopN + ai.search.pathProbes));

  const tried: BotCandidate[] = [];
  let taken: { command: Command; summary: string; focus?: { col: number; row: number } } | null = null;
  let probes = 0;

  for (const row of shortlist) {
    const label = row.entry.label;
    if (taken !== null) {
      tried.push({ label, score: row.score, chosen: false, terms: row.terms });
      continue;
    }
    const standing = row.entry.col === unit.col && row.entry.row === unit.row;
    if (standing) {
      const improvement = row.entry.improvement;
      const refusal =
        improvement === null ? prospectError(state, unit.id) : improvementError(state, unit.id, improvement);
      if (refusal !== null) {
        tried.push(refused(label, refusal));
        continue;
      }
      tried.push({ label, score: row.score, chosen: true, terms: row.terms });
      taken =
        improvement === null
          ? {
              command: { type: 'prospect', playerId: player.id, unitId: unit.id },
              summary:
                `Asks the hill it is standing on — the best thing on this ground at ${round1(row.score)}, ` +
                'the assay and whatever sleeps under it.',
            }
          : {
              command: { type: 'buildImprovement', playerId: player.id, unitId: unit.id, improvement },
              summary:
                `Lays ${improvementDef(improvement).name} where it stands — the best-scoring hex in reach at ` +
                `${round1(row.score)} a turn, and it is under its feet.`,
            };
      continue;
    }
    // A route is the most expensive question this bot asks (`search.pathProbes`),
    // so the walk is only priced for the few best rows.
    if (probes >= ai.search.pathProbes) {
      tried.push(refused(label, `beyond the ${ai.search.pathProbes} routes this bot will pay to ask about`));
      continue;
    }
    probes += 1;
    const tile = getTileAt(state.map, row.entry.col, row.entry.row);
    if (!tile || findPath(state, unit, tile) === null) {
      tried.push(refused(label, 'no route to it'));
      continue;
    }
    tried.push({ label, score: row.score, chosen: true, terms: row.terms });
    taken = {
      command: {
        type: 'moveUnit',
        playerId: player.id,
        unitId: unit.id,
        target: { col: row.entry.col, row: row.entry.row },
      },
      summary:
        `Walks ${row.distance} hexes to (${row.entry.col},${row.entry.row}) for ${row.entry.label} — ` +
        `${round1(row.score)} a turn after the walk, the best of ${ranked.length} hexes the plan holds.`,
      focus: { col: row.entry.col, row: row.entry.row },
    };
  }

  if (taken !== null) {
    const choice: UnitChoice = { command: taken.command, summary: taken.summary, candidates: tried };
    if (taken.focus !== undefined) choice.focus = taken.focus;
    return choice;
  }

  /**
   * **The survey, kept as the free fallback it always was.**
   *
   * A marked seam is a plan entry now and is compared against the spade like
   * everything else. This is the other case: a worker with nothing in the plan
   * it can reach, standing on unasked high ground inside its own borders. The
   * alternative on that hex is `standDown`, so the survey costs the bot nothing
   * it was going to do anyway — and once in a while the hill is not barren.
   *
   * The territory clause is the bot's own, not the rule's (`prospectError` lets
   * anybody survey anywhere): a bot that wandered off to read hills in the wild
   * would be an exploration policy wearing a worker.
   */
  if (
    prospectError(state, unit.id) === null &&
    tileOwnerPlayerId(state, unit.col, unit.row) === player.id
  ) {
    tried.push(chosenAt('survey the ground it stands on', tried.length));
    return {
      command: { type: 'prospect', playerId: player.id, unitId: unit.id },
      summary: 'Nothing in the plan it can reach: surveys the high ground it is standing on instead, which is free.',
      candidates: tried,
    };
  }
  return standDown(unit, 'The plan has nothing this piece can reach, and no hill under it to ask.');
}

/**
 * A scout is told to range ahead once and then never thought about again — the
 * resolution re-aims it every turn (`marchExplorers`) until the search comes
 * back empty and the flag is dropped.
 *
 * `exploreTarget` is asked first so the order is only ever given when there is
 * somewhere to go: `setAutoExplore` would be *accepted* on a piece with nothing
 * left to find, and a bot that re-issued it every turn forever would fill the
 * log with orders that do nothing.
 */
function scoutCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  if (unit.autoExplore !== true && autoExploreError(unit) === null) {
    const target = exploreTarget(state, unit);
    if (target !== null) {
      return {
        command: { type: 'setAutoExplore', playerId: player.id, unitId: unit.id, on: true },
        summary: 'Sets off to range ahead — the resolution re-aims it every turn until there is nothing left to chart.',
        candidates: [chosenAt('range ahead', 0)],
      };
    }
  }
  // Nothing left to chart: a scout is a soldier with better boots.
  return soldierCommand(state, player, unit);
}

/**
 * A soldier's questions, in order: is there a favourable blow against the wild
 * next door, is there one against a nation this seat is at war with, is there a
 * camp to march on, am I standing in a town that wants holding, is there a
 * settler of ours walking unescorted — and, failing all of them, dig in.
 *
 * **A peaceful seat still never attacks a nation**, and it is now belt and
 * braces: the aggressive arms are behind `military.aggression`, and the blow
 * itself is behind `previewCombat`, which refuses a strike on an empire this
 * one is not at war with. So a seat with an appetite and no declaration gets a
 * table full of the rules' own refusals rather than a war.
 */
function soldierCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const ai = aiFor(player);
  const blow = favourableBlow(state, player, unit, holdsWild, 0);
  if (blow !== null) {
    return {
      command: { type: 'attack', playerId: player.id, unitId: unit.id, target: blow.at },
      summary: blow.summary,
      candidates: blow.candidates,
      focus: blow.at,
    };
  }
  // **A seat at war swings at what is beside it, whatever its temperament.**
  // The appetite decides whether this empire goes *looking* for a fight
  // (`warMarch`, below) and how bad an exchange it will accept — at zero the
  // bar is the peaceful one, deal more than you take — but declining to hit an
  // enemy column standing next to a piece is not pacifism, it is negligence.
  // A seat with no war on has nothing to swing at: `holdsRival` is gated on
  // `atWar`, and `previewCombat` refuses a peacetime blow besides.
  const strike = favourableBlow(state, player, unit, holdsRival, ai.military.aggression);
  if (strike !== null) {
    return {
      command: { type: 'attack', playerId: player.id, unitId: unit.id, target: strike.at },
      summary: strike.summary,
      candidates: strike.candidates,
      focus: strike.at,
    };
  }
  const camp = campMarch(state, player, unit);
  if (camp !== null) {
    return {
      command: { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: camp.at },
      summary: camp.summary,
      candidates: camp.candidates,
      focus: camp.at,
    };
  }
  const home = undefendedCity(state, player, unit);
  if (home !== null) {
    return {
      command: { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: home.at },
      summary: home.summary,
      candidates: home.candidates,
      focus: home.at,
    };
  }
  // **The escort**, after the towns are held and before anybody goes hunting: a
  // settler walking alone is an empire's next town walking alone.
  const escort = escortMarch(state, player, unit);
  if (escort !== null) {
    return {
      command: { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: escort.at },
      summary: escort.summary,
      candidates: escort.candidates,
      focus: escort.at,
    };
  }
  // The march on a rival comes **after** the towns are seen to, which is the
  // whole of the restraint an aggressive seat still keeps: `warMarch` asks the
  // same two guards the camp hunt does.
  if (ai.military.aggression > 0) {
    const push = warMarch(state, player, unit);
    if (push !== null) {
      return {
        command: { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: push.at },
        summary: push.summary,
        candidates: push.candidates,
        focus: push.at,
      };
    }
  }
  return standDown(
    unit,
    'No favourable blow next door, no camp near a town worth marching on, and every town is held.',
  );
}

/** A hex this piece was told to act on, with the reasoning that named it. */
interface UnitTarget {
  at: { col: number; row: number };
  summary: string;
  candidates: BotCandidate[];
}

/**
 * An adjacent hex holding a target this piece would come off better against, or
 * `null`.
 *
 * The whole exchange is asked of `previewCombat`, which is the *same* plan the
 * reducer resolves — so the movement, the one-blow-a-turn rule, the range, the
 * terrain and the fortification are all already in the answer and none of them
 * is restated here. "Better off" is the naive reading: the defender dies, or the
 * midpoint roll hurts them more than it hurts us.
 *
 * **Who counts as a target is the caller's**, and that is the whole of how the
 * peaceful bot and the warmonger share one function: `holdsWild` is the standing
 * arm and can never name a nation, `holdsRival` is the aggressive one and is
 * only ever passed by a seat whose `military.aggression` is above zero.
 *
 * `aggression` loosens the exchange the piece will accept, and nothing else. At
 * 0 the rule is the one it always was — deal more than you take. At 1 any blow
 * that deals anything is taken. In between, the blow must deal more than
 * `(1 − aggression)` of what it takes, which is a seat that is willing to trade
 * down to break a line.
 */
function favourableBlow(
  state: GameState,
  player: Player,
  unit: Unit,
  holds: (state: GameState, player: Player, tile: Tile) => boolean,
  aggression: number,
): UnitTarget | null {
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const tried: BotCandidate[] = [];
  const appetite = Math.max(0, Math.min(1, aggression));
  for (const near of mapRange(state.map, tileHex(here), unitDef(unit.type).range ?? 1)) {
    if (near.col === unit.col && near.row === unit.row) continue;
    if (!holds(state, player, near)) continue;
    const label = `strike (${near.col},${near.row})`;
    const preview = previewCombat(state, unit.id, { col: near.col, row: near.row });
    if (!preview.ok) {
      tried.push(refused(label, preview.error ?? 'the rules refuse the blow'));
      continue;
    }
    const kills = preview.defenderHp <= preview.damageToDefender;
    // **The exchange, as the reducer previews it.** The score is the naive
    // reading the bot actually uses: damage dealt less damage taken. Nothing
    // else is weighed — no lookahead, no valuation of the piece at risk.
    const exchange: BotCandidate = {
      label,
      score: preview.damageToDefender - preview.damageToAttacker,
      chosen: false,
      terms: [
        { label: `${preview.damageToDefender} damage dealt (defender on ${preview.defenderHp})`, value: preview.damageToDefender },
        { label: `${preview.damageToAttacker} damage taken`, value: preview.damageToAttacker, op: 'sub' },
      ],
    };
    // The bar the exchange has to clear, loosened by the seat's appetite. At
    // appetite 0 this is exactly `taken`, which is the rule the peaceful bot has
    // always used.
    const bar = preview.damageToAttacker * (1 - appetite);
    if (kills || preview.damageToDefender > bar) {
      exchange.chosen = true;
      tried.push(exchange);
      return {
        at: { col: near.col, row: near.row },
        summary: kills
          ? `The blow kills: ${preview.damageToDefender} damage against ${preview.defenderHp} hit points left.`
          : appetite > 0
            ? `An exchange this seat will take: ${preview.damageToDefender} dealt against ${preview.damageToAttacker} ` +
              `taken, and its appetite of ${round1(appetite)} asks only for more than ${round1(bar)}.`
            : `A favourable exchange: ${preview.damageToDefender} dealt against ${preview.damageToAttacker} taken.`,
        candidates: tried,
      };
    }
    tried.push(exchange);
  }
  return null;
}

/** Does the wild have a piece standing here that this seat could strike? */
function holdsWild(state: GameState, player: Player, tile: Tile): boolean {
  for (const other of state.units) {
    if (other.ownerId === player.id) continue;
    if (other.col !== tile.col || other.row !== tile.row) continue;
    if (playerById(state, other.ownerId)?.barbarian === true) return true;
  }
  return false;
}

/**
 * Does **a nation this empire is at war with** have a piece or a town standing
 * here?
 *
 * `holdsWild`'s twin and the one place this bot admits a rival exists as a
 * target. A town counts: `previewCombat` prices a blow against a city's walls
 * exactly as it prices one against a spearman (the three beats are the
 * reducer's), so a seat pushes at a town through the same door it strikes a
 * column through.
 *
 * The wild is excluded here rather than included, so the two predicates
 * partition what stands on a hex instead of overlapping: a raider is
 * `holdsWild`'s business and an enemy's warrior is this one's.
 *
 * **The war is a clause of the predicate** (P3), not of the callers. Before
 * there was a war state a rival was simply "somebody else" and the appetite was
 * the only thing standing between this bot and a blow; now `atWar` answers the
 * question the reducer would answer anyway (`previewCombat` refuses a peacetime
 * strike), so a neighbour at peace never even reaches the table — and neither
 * `favourableBlow` nor `warMarch` needs a clause of its own about it.
 */
function holdsRival(state: GameState, player: Player, tile: Tile): boolean {
  for (const other of state.units) {
    if (other.ownerId === player.id) continue;
    if (other.col !== tile.col || other.row !== tile.row) continue;
    const owner = playerById(state, other.ownerId);
    if (owner === undefined || owner.barbarian || owner.eliminated) continue;
    if (atWar(state, player.id, owner.id)) return true;
  }
  for (const city of state.cities) {
    if (city.ownerId === player.id) continue;
    if (city.col !== tile.col || city.row !== tile.row) continue;
    const owner = playerById(state, city.ownerId);
    if (owner === undefined || owner.barbarian || owner.eliminated) continue;
    if (atWar(state, player.id, owner.id)) return true;
  }
  return false;
}

/**
 * The rival's piece or town this seat marches on, or `null` — the warmonger's
 * half of the hunt, and it is `campMarch` with a different quarry.
 *
 * The two guards are the camp hunt's, word for word and for its reasons: every
 * town of this empire must be held before anybody goes hunting, **and** this
 * particular piece must not be the thing holding the town it stands in. An
 * aggressive seat that emptied its capital to chase a column is how a bot loses
 * a capital, and aggression is not permission to be stupid.
 *
 * Nearest quarry first, then map order. There is no operational plan here at
 * all — no siege stack, no line, no war economy — and that is v1 said out loud:
 * this is a piece walking toward the nearest enemy thing until it is adjacent to
 * it, at which point `favourableBlow` decides whether to swing.
 */
function warMarch(state: GameState, player: Player, unit: Unit): UnitTarget | null {
  if (!townsAreHeld(state, player)) return null;
  if (!isRedundant(state, player, unit)) return null;
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const ai = aiFor(player);
  const from = tileHex(here);
  const quarry: { at: { col: number; row: number }; distance: number; what: string }[] = [];
  for (const tile of mapRange(state.map, from, ai.military.huntRadius)) {
    if (!holdsRival(state, player, tile)) continue;
    const distance = wrappedDistance(state.map, from, tileHex(tile));
    if (distance === 0) continue;
    quarry.push({ at: { col: tile.col, row: tile.row }, distance, what: `(${tile.col},${tile.row})` });
  }
  quarry.sort((a, b) => a.distance - b.distance);
  const tried: BotCandidate[] = [];
  for (const entry of quarry.slice(0, ai.search.pathProbes)) {
    const tile = getTileAt(state.map, entry.at.col, entry.at.row);
    if (!tile) continue;
    const label = `march on ${entry.what}`;
    if (findPath(state, unit, tile) === null) {
      tried.push(refused(label, 'no route to it'));
      continue;
    }
    // **The lowest score marches**, as in the camp hunt: the key is hexes to the
    // quarry, so the nearest enemy thing is the one walked at.
    tried.push({
      label,
      score: entry.distance,
      chosen: true,
      terms: [
        { label: `${entry.distance} hexes to the nearest rival piece or town`, value: entry.distance },
        {
          label: `(this seat's appetite for a fight is ${round1(ai.military.aggression)} — the tie-break is distance)`,
          value: 0,
        },
      ],
    });
    return {
      at: entry.at,
      summary:
        `Marches ${entry.distance} hexes on ${entry.what} — every town of this empire is held and this piece ` +
        'is not the thing holding one.',
      candidates: tried,
    };
  }
  return null;
}

/**
 * The camp this piece marches on, or `null` — **the camps near this empire's
 * towns, nearest-to-a-town first** (design addendum 2).
 *
 * The v0 hunted whatever camp was within `military.campHuntRadius` of *the
 * piece*, which made the hunt a fact about where a soldier happened to be
 * standing rather than about what was threatening the realm: a warrior that had
 * wandered chased a camp in the wild while a camp two hexes from the capital
 * spawned raiders all game. The radius is now measured from **any of this
 * empire's towns** (`nearOwnCity`), and the ordering is that distance first —
 * so a camp beside a border town outranks one at the edge of the reach, and a
 * camp beside nothing at all is not this bot's business.
 *
 * Marching *onto* a camp is how a camp is cleared — the arrival seam burns it
 * out (`arriveOnTile`), there is no verb for it — so this is a plain move order
 * and not an attack.
 *
 * **It never strips a threatened town.** Two guards, and they are two different
 * sentences: the empire's towns must all be held before anybody goes hunting
 * (`townsAreHeld`, the v0's rule and still right — a bot that emptied its
 * capital to chase raiders is how a bot loses a capital), *and* this particular
 * piece must not be the thing holding the town it is standing in
 * (`isRedundant`, the same reading the disband guard makes from the other end).
 * The first is about the empire, the second about the piece, and neither implies
 * the other.
 */
function campMarch(state: GameState, player: Player, unit: Unit): UnitTarget | null {
  if (!townsAreHeld(state, player)) return null;
  if (!isRedundant(state, player, unit)) return null;
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const ai = aiFor(player);
  const from = tileHex(here);
  const reachable: {
    camp: { col: number; row: number };
    toTown: number;
    distance: number;
  }[] = [];
  for (const camp of state.camps) {
    const tile = getTileAt(state.map, camp.col, camp.row);
    if (!tile) continue;
    const distance = wrappedDistance(state.map, from, tileHex(tile));
    if (distance === 0 || distance > ai.military.campHuntRadius) continue;
    // The camp has to threaten *something of ours*. `nearOwnCity` answers with
    // the nearest town inside `threat.radius`; a camp with no town near it is
    // somebody else's problem.
    const near = nearOwnCity(state, player, camp.col, camp.row, ai.military.campHuntRadius);
    if (near === null) continue;
    reachable.push({ camp: { col: camp.col, row: camp.row }, toTown: near.distance, distance });
  }
  // Nearest to one of our towns first, then nearest to this piece, then map
  // order — all three facts about the board rather than about the order a loop
  // happened to visit `state.camps` in.
  reachable.sort((a, b) => a.toTown - b.toTown || a.distance - b.distance);
  const tried: BotCandidate[] = [];
  for (const entry of reachable.slice(0, ai.search.pathProbes)) {
    const tile = getTileAt(state.map, entry.camp.col, entry.camp.row)!;
    const label = `camp at (${entry.camp.col},${entry.camp.row})`;
    // **The lowest score marches**: the key is hexes from the nearest of this
    // empire's towns, so a camp beside a border town outranks one at the edge of
    // the reach. A camp near nothing at all never reaches this list.
    const terms: ValueTerm[] = [
      { label: `${entry.toTown} hexes from the nearest town of ours`, value: entry.toTown },
      { label: `(${entry.distance} hexes from this piece — the tie-break)`, value: 0 },
    ];
    if (findPath(state, unit, tile) === null) {
      tried.push(refused(label, 'no route to it'));
      continue;
    }
    tried.push({ label, score: entry.toTown, chosen: true, terms });
    return {
      at: entry.camp,
      summary:
        `Marches on the camp at (${entry.camp.col},${entry.camp.row}), ${entry.toTown} hexes from one of its ` +
        'towns — every town is held and this piece is not the thing holding one.',
      candidates: tried,
    };
  }
  return null;
}

/** Does every town of this empire have at least its garrison standing in it? */
function townsAreHeld(state: GameState, player: Player): boolean {
  const ai = aiFor(player);
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (garrisonAt(state, player.id, city) < ai.military.garrisonPerCity) return false;
  }
  return true;
}

/**
 * The nearest of this empire's towns that is standing without a garrison and
 * that this piece can reach, or `null` when it is already standing in one.
 */
function undefendedCity(state: GameState, player: Player, unit: Unit): UnitTarget | null {
  const ai = aiFor(player);
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const from = tileHex(here);
  const wanted: { city: City; distance: number }[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (city.col === unit.col && city.row === unit.row) return null;
    if (garrisonAt(state, player.id, city) >= ai.military.garrisonPerCity) continue;
    wanted.push({ city, distance: wrappedDistance(state.map, from, tileHex(getTileAt(state.map, city.col, city.row)!)) });
  }
  wanted.sort((a, b) => a.distance - b.distance);
  const tried: BotCandidate[] = [];
  for (const entry of wanted.slice(0, ai.search.pathProbes)) {
    const tile = getTileAt(state.map, entry.city.col, entry.city.row);
    if (!tile) continue;
    const label = `${entry.city.name}, ${entry.distance} hexes off`;
    if (findPath(state, unit, tile) === null) {
      tried.push(refused(label, 'no route to it'));
      continue;
    }
    // Nearest first, so the lowest score is the one marched to.
    tried.push({
      label,
      score: entry.distance,
      chosen: true,
      terms: [{ label: `${entry.distance} hexes away — nearest wins`, value: entry.distance }],
    });
    return {
      at: { col: entry.city.col, row: entry.city.row },
      summary: `${entry.city.name} is standing without a garrison: marches ${entry.distance} hexes to hold it.`,
      candidates: tried,
    };
  }
  return null;
}

/** How many of this empire's soldiers are standing in this town. */
function garrisonAt(state: GameState, playerId: number, city: City): number {
  let count = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (unit.col !== city.col || unit.row !== city.row) continue;
    if (isCombatant(unitDef(unit.type))) count += 1;
  }
  return count;
}

/**
 * **A great person no longer sleeps.**
 *
 * The v1 stood every one of them down with an honest deferral — *"a work is a
 * once-per-game hand, and a bot that spent one on the first legal hex would be
 * worse than one that keeps it"* — and then kept them for ever, which is worse
 * than either. A person who never acts and never plants is renown spent on a
 * piece that stands in a field.
 *
 * So the two verbs are put in one scored table, in the one currency:
 *
 *   · **acting** pays a lump — a scholar's beakers, an engineer's hammers, a
 *     merchant's purse, an artist's culture and calm, a general's aura — and a
 *     lump is converted to a per-turn figure by `score.lumpTurns` so it can be
 *     compared with anything else at all (`explainLump`);
 *   · **planting** pays for ever: the family's work on a hex, priced by the very
 *     same `improvementYieldDelta` the improvement plan prices a farm with
 *     (`rankWorkSites`), discounted by the walk.
 *
 * Both gates are the simulation's — `greatPersonActError` and
 * `greatPersonWorkError` — so a verb this arm proposes is a verb the reducer
 * takes. Crude is allowed here and is written down as crude: the act's figures
 * are read off `RULES.greatPeople` without Leonardo's amplifier (a card the bot
 * cannot ask hypothetically), and a work's second-order gifts — the seam an
 * academy opens, the ring a citadel claims — are not priced at all. What is no
 * longer true is that the piece does nothing.
 */
function greatPersonCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const ai = aiFor(player);
  const ctx = valueContext(state, player);
  const tried: BotCandidate[] = [];

  const actRefusal = greatPersonActError(state, player.id, unit.id);
  const act = actRefusal === null ? explainAct(state, player, unit, ctx) : null;
  if (act === null) tried.push(refused('act now', actRefusal ?? 'this piece has no boon to spend'));

  const work = workOf(unit);
  const sites =
    work === null ? [] : rankWorkSites(state, player, ctx, work, unit, ai.workers.searchRadius);
  const best = sites[0] ?? null;

  // **The act wins a tie**, and deliberately: a lump banked this turn is a lump
  // that cannot be taken off the board, while a work planted on a border hex can
  // be pillaged the turn after.
  if (act !== null && (best === null || act.total >= best.score)) {
    tried.push({ label: 'act now', score: act.total, chosen: true, terms: act.terms });
    if (best !== null) tried.push({ label: best.entry.label, score: best.score, chosen: false, terms: best.terms });
    return {
      command: { type: 'greatPersonAct', playerId: player.id, unitId: unit.id },
      summary:
        `Spends itself now for ${round1(act.total)} a turn's worth of one-time boon` +
        (best === null ? '.' : `, against ${round1(best.score)} for planting its work.`),
      candidates: tried,
    };
  }

  if (act !== null) tried.push({ label: 'act now', score: act.total, chosen: false, terms: act.terms });

  let probes = 0;
  for (const site of sites) {
    const standing = site.entry.col === unit.col && site.entry.row === unit.row;
    if (standing) {
      const refusal = greatPersonWorkError(state, player.id, unit.id);
      if (refusal !== null) {
        tried.push(refused(site.entry.label, refusal));
        continue;
      }
      tried.push({ label: site.entry.label, score: site.score, chosen: true, terms: site.terms });
      return {
        command: { type: 'greatPersonWork', playerId: player.id, unitId: unit.id },
        summary:
          `Plants its work where it stands — ${round1(site.score)} a turn on this hex, the best ground in reach.`,
        candidates: tried,
      };
    }
    if (probes >= ai.search.pathProbes) {
      tried.push(refused(site.entry.label, `beyond the ${ai.search.pathProbes} routes this bot will pay to ask about`));
      continue;
    }
    probes += 1;
    const tile = getTileAt(state.map, site.entry.col, site.entry.row);
    if (!tile || findPath(state, unit, tile) === null) {
      tried.push(refused(site.entry.label, 'no route to it'));
      continue;
    }
    tried.push({ label: site.entry.label, score: site.score, chosen: true, terms: site.terms });
    return {
      command: {
        type: 'moveUnit',
        playerId: player.id,
        unitId: unit.id,
        target: { col: site.entry.col, row: site.entry.row },
      },
      summary:
        `Walks ${site.distance} hexes to (${site.entry.col},${site.entry.row}) to plant its work — ` +
        `${round1(site.score)} a turn after the walk.`,
      candidates: tried,
      focus: { col: site.entry.col, row: site.entry.row },
    };
  }
  return standDown(unit, 'Nothing to act on and nowhere its work would pay.');
}

/**
 * What spending this person **now** is worth, per turn, in the one currency.
 *
 * Every figure is `greatPersonActAt`'s own — the same `RULES.greatPeople` rows,
 * the same era multiplier, the same `agedActFactor` — read rather than
 * reinvented, so the bot's expectation and the reducer's payout are the same
 * arithmetic minus one term it cannot ask for (Leonardo's amplifier, which is a
 * card evaluated hypothetically and `statecraft.ts` does not answer that).
 *
 * The two **timed** families are honest about being timed: an artist's calm and
 * a general's aura are per-turn effects that run out, so they are priced as
 * their per-turn worth times their share of `score.lumpTurns` — the same
 * exchange rate a lump goes through, applied from the other end.
 */
function explainAct(
  state: GameState,
  player: Player,
  unit: Unit,
  ctx: ValueContext,
): Appraisal | null {
  const family = familyOf(unit);
  if (family === null) return null;
  const people = RULES.greatPeople;
  const era = highestAge(player.techsResearched);
  const aged = agedActFactor(player);
  const lumpTurns = Math.max(1, ctx.ai.score.lumpTurns);

  switch (family) {
    case 'scholar': {
      const aim = player.researching;
      if (aim === null) return null;
      // Deliberately un-aged, exactly as the reducer's scholar arm is: a share of
      // the aimed technology's cost already grows with the tree.
      const beakers = Math.floor(techDef(aim).cost * people.scholarShare);
      return appraise([nest(`${beakers} beakers toward ${techDef(aim).name}`, explainLump({ science: beakers }, ctx))]);
    }
    case 'engineer': {
      const hammers = Math.floor(people.engineerHammers * era * aged);
      return appraise([nest(`${hammers} hammers into a basket`, explainLump({ production: hammers }, ctx))]);
    }
    case 'merchant': {
      const gold = Math.floor(people.merchantGold * era * aged);
      return appraise([nest(`${gold} gold into the treasury`, explainLump({ gold }, ctx))]);
    }
    case 'artist': {
      const culture = Math.floor(people.artistCulture * aged);
      const calm = (people.artistHappiness * ctx.ai.weights.happiness * people.artistTurns) / lumpTurns;
      return appraise([
        nest(`${culture} culture into the basket`, explainLump({ culture }, ctx)),
        {
          label: `${people.artistHappiness} happiness for ${people.artistTurns} turns`,
          value: calm,
        },
      ]);
    }
    case 'general': {
      const blessed = friendlyPiecesWithin(state, unit, people.generalRadius);
      const aura =
        (people.generalCombat * ctx.ai.weights.military * blessed * people.generalTurns) / lumpTurns;
      return appraise([
        {
          label:
            `${people.generalCombat} strength on ${blessed} piece${blessed === 1 ? '' : 's'} ` +
            `for ${people.generalTurns} turns`,
          value: aura,
        },
      ]);
    }
    default: {
      // No `never` check: a sixth family is a design decision in `src/sim/`, and
      // a bot that failed to compile over one would be the wrong module refusing.
      return null;
    }
  }
}

/** How many of this empire's pieces stand within a radius, this one included. */
function friendlyPiecesWithin(state: GameState, unit: Unit, radius: number): number {
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return 0;
  const here = tileHex(from);
  let count = 0;
  for (const other of state.units) {
    if (other.ownerId !== unit.ownerId) continue;
    const at = getTileAt(state.map, other.col, other.row);
    if (!at) continue;
    if (wrappedDistance(state.map, here, tileHex(at)) <= radius) count += 1;
  }
  return count;
}

/**
 * An augur's whole brain: **found a god if there is room for one, otherwise
 * bless something, otherwise stand quiet.**
 *
 * The order is the value order and it is not close. A Consecrate spends the
 * piece and buys a *permanent* belief; a rite spends one of three charges and
 * buys a windfall or a blessing that runs out. So a pantheon with an open slot
 * always wins, and the rites are what the piece does with its life when the
 * pantheon is full — which is also the only reason an augur is worth buying
 * once the gods are all named.
 *
 * **A rite is the augur's whole turn** (`augurHasActed`), so this can be asked
 * every turn without ever proposing a second act: `riteError` refuses it, and
 * the piece's own spent movement is the reading. Rites are tried in roster
 * order, which is file order and therefore part of the data — there is no price
 * axis to sort on, because every rite costs exactly one charge.
 *
 * The target is deliberately **absent**, which means "where the augur stands" —
 * and where it stands is the town that bought it, so a city-targeted rite lands
 * on that town with nothing to aim.
 */
function augurCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const tried: BotCandidate[] = [];
  const consecrate = consecrateError(state, player.id, unit.id);
  if (consecrate === null) {
    tried.push(chosenAt('consecrate a god', 0));
    return {
      command: { type: 'consecrate', playerId: player.id, unitId: unit.id },
      summary:
        'Consecrates: a god is permanent and spends the piece, a rite is one of three charges and runs out — ' +
        'so an open pantheon slot always wins.',
      candidates: tried,
    };
  }
  tried.push(refused('consecrate a god', consecrate));
  for (let rank = 0; rank < RITE_IDS.length; rank++) {
    const rite = RITE_IDS[rank]!;
    const refusal = riteError(state, player.id, unit.id, rite);
    if (refusal === null) {
      tried.push(chosenAt(String(rite), rank + 1));
      return {
        command: { type: 'performRite', playerId: player.id, unitId: unit.id, rite },
        summary: `Performs ${String(rite)} where it stands — rites are tried in roster order; every one costs the same charge.`,
        candidates: tried,
      };
    }
    tried.push(refused(String(rite), refusal));
  }
  return standDown(unit, 'No pantheon slot open and no rite it may perform.');
}

/**
 * A prophet's: **plant the stones, else deepen the faith, else get off the city
 * centre so next turn's stones have somewhere to go.**
 *
 * The third clause is the one that earns its place. A bought prophet spawns on
 * the town's own hex, and a holy site may not stand where a city stands — so
 * without a step off, every prophet this bot ever bought would sleep for the
 * rest of the game on the square it was born on. The hex it steps to is chosen
 * by the *ground's* half of the improvement rule (`improvementErrorAt` against
 * the work the prophet family plants, read off the table's own inverse rather
 * than by name), so the march is only ever toward somewhere the planting will
 * actually be legal.
 */
function prophetCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const tried: BotCandidate[] = [];
  const plant = plantHolySiteError(state, player.id, unit.id);
  if (plant === null) {
    tried.push(chosenAt('plant the stones', 0));
    return {
      command: { type: 'plantHolySite', playerId: player.id, unitId: unit.id },
      summary: 'Plants a holy site where it stands, which is what founds the faith.',
      candidates: tried,
    };
  }
  tried.push(refused('plant the stones', plant));
  const belief = gainBeliefError(state, player.id, unit.id);
  if (belief === null) {
    tried.push(chosenAt('deepen the faith', 1));
    return {
      command: { type: 'gainBelief', playerId: player.id, unitId: unit.id },
      summary: 'Deepens the faith with another belief.',
      candidates: tried,
    };
  }
  tried.push(refused('deepen the faith', belief));
  const step = holySiteStep(state, player, unit);
  if (step !== null) {
    tried.push(chosenAt(`step to (${step.col},${step.row})`, 2));
    return {
      command: { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: step },
      summary:
        `Steps off the town centre to (${step.col},${step.row}), where the stones would be legal — a bought prophet ` +
        'spawns on the very hex a holy site may not stand on.',
      candidates: tried,
      focus: step,
    };
  }
  return standDown(unit, 'Nowhere to plant, nothing to deepen and nowhere legal to step.');
}

/** A hex beside the prophet where its work would be legal, or `null`. */
function holySiteStep(
  state: GameState,
  player: Player,
  unit: Unit,
): { col: number; row: number } | null {
  if (HOLY_SITE === null) return null;
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  for (const tile of mapRange(state.map, tileHex(here), 1)) {
    if (tile.col === unit.col && tile.row === unit.row) continue;
    if (improvementErrorAt(state, player.id, tile, HOLY_SITE) !== null) continue;
    if (findPath(state, unit, tile) === null) continue;
    return { col: tile.col, row: tile.row };
  }
  return null;
}

/**
 * The work a prophet plants, read off the table's own inverse — never by name,
 * which is the discipline `improvements.ts` keeps for the same lookup.
 */
const HOLY_SITE: ImprovementId | null = workForFamily('prophet');

/**
 * An idle caravan is sent on the first route the rules will take, else sleeps.
 *
 * The origin is named by the command rather than read off the board (the
 * caravan teleports into its gates), so this is a plain search over pairs of
 * this empire's towns in `state.cities` order, gated by `startRouteError`.
 *
 * **The mode is named too** (`bestRouteMode`, the ruling of 2026-09-03): land
 * wherever a land route is legal, sea otherwise. Naming it rather than leaving
 * it out is what lets the bot reach a partner across a bay at all — the absent
 * field's default is a fact about the *path* and would take the land answer
 * even when the land answer is out of range.
 *
 * **Foreign partners are searched second** (the international ruling of
 * 2026-09-03), and the two passes are the whole of this bot's opinion about
 * them: it does not price routes against each other at all — the summary says
 * so out loud — so "first legal" is the only ordering it has, and a bot that
 * met the world's towns in `state.cities` order would send its first caravan
 * abroad on nothing but the accident of who was founded first. Its own towns
 * first is the conservative reading of a rule it cannot weigh: the road home is
 * worth something to it afterwards. Everything about legality — at peace, met,
 * in range, a path in some mode — is `startRouteError`'s, asked identically in
 * both passes.
 */
function traderCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const tried: BotCandidate[] = [];
  // Its own towns, then the world's — see the docblock. `pass` is the reading
  // "is this partner somebody else's", so one sweep of `state.cities` answers
  // each pass and the order stays a fact about the state.
  for (const pass of [false, true]) {
    for (const from of state.cities) {
      if (from.ownerId !== player.id) continue;
      for (const to of state.cities) {
        if (to.id === from.id) continue;
        if ((to.ownerId !== player.id) !== pass) continue;
        const label = `${from.name} → ${to.name}`;
        const mode = bestRouteMode(state, player.id, unit.id, from.id, to.id);
        if (mode === null) {
          // Land's own sentence, which `bestRouteMode` has just proved is a
          // refusal — the feed says why the ordinary road was no good rather
          // than reporting the sea to an empire with no coast.
          const refusal = startRouteError(state, player.id, unit.id, from.id, to.id, 'land');
          tried.push(refused(label, refusal ?? 'No route a caravan could take.'));
          continue;
        }
        tried.push(chosenAt(label, tried.length));
        return {
          command: {
            type: 'startRoute',
            playerId: player.id,
            unitId: unit.id,
            fromCityId: from.id,
            toCityId: to.id,
            mode,
          },
          summary: `Opens the first route the rules will take, ${from.name} → ${to.name} by ${mode} — this bot does not price routes against each other.`,
          candidates: tried,
          focus: { col: to.col, row: to.row },
        };
      }
    }
  }
  return standDown(unit, 'No pair of towns will take a route from this empire.');
}

// --- naming a decision ------------------------------------------------------

/**
 * The four little constructors every arm builds its candidate table out of.
 *
 * A first-legal arm has no score to report, so it reports the only number it
 * actually used: **where the option sat in the preference order**, negated so
 * that "earlier is better" reads the same way as every scored table on the page.
 * The term folds to exactly that, which is what keeps the spectate pin
 * (`foldTerms(terms) === score`) true across arms that weigh nothing.
 */
function rankTerms(rank: number): ValueTerm[] {
  return [{ label: `position ${rank + 1} in the order this bot tries them`, value: rank, op: 'sub' }];
}

function chosenAt(label: string, rank: number): BotCandidate {
  return { label, score: -rank, chosen: true, terms: rankTerms(rank) };
}

/** A candidate the rules removed. It was never scored, and says so. */
function refused(label: string, why: string): BotCandidate {
  return { label, score: 0, chosen: false, terms: [], rejected: why };
}

/** A list of options none of which this bot appraises. The first is taken. */
function unweighed(labels: readonly string[]): BotCandidate[] {
  return labels.map((label, index) =>
    index === 0 ? chosenAt(label, 0) : { label, score: -index, chosen: false, terms: rankTerms(index) },
  );
}

/**
 * A town as a decision's subject — **"Uruk (puppet)" for one nobody controls**.
 *
 * The ruling asks a puppet's production to be *visible*, and the feed is where
 * it is visible: a reader watching a seat build a market has to be able to tell
 * whether that was the seat's choice or the arrangement the ruling describes.
 * It is a label and nothing else — the decision is an ordinary `build`.
 */
function townSubject(city: City): string {
  return city.puppet === true ? `${city.name} (puppet)` : city.name;
}

/** A queue row's printed name. */
function itemName(item: QueueItem): string {
  if (item.kind === 'building') return buildingDef(item.id).name;
  if (item.kind === 'unit') return unitDef(item.id).name;
  return projectDef(item.id).name;
}

/** A piece, named the way a spectator would point at it. */
function unitLabel(unit: Unit): string {
  return `${unitDef(unit.type).name} ${unit.id}`;
}

/** One decimal place, for a summary sentence. */
function round1(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}

/** `foldTerms`, under the name the arithmetic reads best as. */
function foldOf(terms: readonly ValueTerm[]): number {
  return foldTerms(terms);
}

// --- small readings ---------------------------------------------------------

function findUnit(state: GameState, unitId: number): Unit | undefined {
  for (const unit of state.units) {
    if (unit.id === unitId) return unit;
  }
  return undefined;
}

function countCities(state: GameState, playerId: number): number {
  let count = 0;
  for (const city of state.cities) {
    if (city.ownerId === playerId) count += 1;
  }
  return count;
}

function countSoldiers(state: GameState, playerId: number): number {
  let count = 0;
  for (const unit of state.units) {
    if (unit.ownerId === playerId && isCombatant(unitDef(unit.type))) count += 1;
  }
  return count;
}

/**
 * How many of one unit type this empire holds **or has queued**.
 *
 * The queue half is what stops five towns each starting a settler in the same
 * window: a cap read off the board alone is a cap that is only true once a turn.
 */
function countOwnedAndQueued(state: GameState, playerId: number, type: UnitTypeId): number {
  let count = 0;
  for (const unit of state.units) {
    if (unit.ownerId === playerId && unit.type === type) count += 1;
  }
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const item of city.queue) {
      if (item.kind === 'unit' && item.id === type) count += 1;
    }
  }
  return count;
}
