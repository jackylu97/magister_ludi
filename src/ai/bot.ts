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
 *   · **Peaceful toward real players — but not blind.** It hunts the wild,
 *     garrisons its towns and never once attacks another nation's unit or city.
 *     It does *defend* against one: a rival's column standing near a town raises
 *     the threat term like a raider's would (`threatLevel`), because declining
 *     to notice an army is not diplomacy, it is negligence. There is no
 *     diplomacy state in this game yet, so a bot that attacked would be a bot
 *     declaring a war nobody could end. The successor is diplomacy state, and
 *     the whole military branch is written to grow into it.
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

import { AI } from './aiConfig';
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
  type ValueContext,
  costOfUpkeep,
  explainBuildingRow,
  explainEffects,
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
  cityQuote,
  cityYields,
  empirePercents,
  empireRateReading,
  explainTileYield,
  foldTileYield,
  foundingError,
  foundingErrorAt,
  tileOwnerPlayerId,
  turnsToBuild,
} from '../sim/cities';
import { fortifyError, previewCombat } from '../sim/combat';
import type { Command } from '../sim/commands';
import { disbandError } from '../sim/commands';
import { explainEmpireGold } from '../sim/empireGold';
import { autoExploreError, exploreTarget } from '../sim/explore';
import { greatPersonChoiceError } from '../sim/greatPeople';
import { improvementError, improvementErrorAt, prospectError } from '../sim/improvements';
import { type ImprovementId, isImprovementId, workForFamily } from '../sim/improvementData';
import { type Tile, getTileAt, mapRange, tileHex, wrappedDistance } from '../sim/map';
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
import { anyCardDef, isUpgradeIndex, orderOfferSize, slotOrderError } from '../sim/statecraft';
import { type CardId, type CardLine, type DoctrineId, type OrderId } from '../sim/statecraftData';
import { type BeliefId } from '../sim/religionData';
import { TECH_IDS, UNIT_UNLOCK_TECH, type TechId, highestAge, techDef } from '../sim/techData';
import { availableTechs, buildError, researchExpansion, researchPlan } from '../sim/tech';
import { unitUpkeep, buildingUpkeep, unitUpkeepOf } from '../sim/upkeep';
import { startRouteError } from '../sim/trade';
import {
  type UnitTypeId,
  UNIT_TYPE_IDS,
  isCombatant,
  isExplorer,
  trades,
  unitDef,
} from '../sim/unitData';
import { sleepError } from '../sim/units';
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

/** The improvements a worker will lay, in preference order. */
const WORK_ORDER: ImprovementId[] = AI.workers.improvements.filter((id): id is ImprovementId =>
  isImprovementId(id),
);

/**
 * Four appraisals are exported for the tests and for nothing else: they are the
 * *decisions* this pass added, and every one of them is a pure function whose
 * behaviour a played game can only demonstrate statistically. `valueContext`,
 * `bestTechGoal`, `scoreCard` and `chooseProduction` are pinned directly in
 * `test/sim/aiBot.test.ts`; nothing in `src/` calls them from outside this file.
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
  return {
    age: highestAge(player.techsResearched),
    cities: Math.min(AI.score.cityCap, countCities(state, player.id)),
    goldPressure: goldPressure(state, player),
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
 */
function goldPressure(state: GameState, player: Player): number {
  const { healthyIncome, strainSpan, arrearsTreasury } = AI.solvency;
  const aversion = Math.max(1, AI.weights.debtAversion);
  if (player.gold < arrearsTreasury) return aversion;
  const net = netGoldPerTurn(state, player.id);
  if (net >= healthyIncome) return 1;
  const span = Math.max(1, strainSpan);
  const strain = Math.min(1, (healthyIncome - net) / span);
  return 1 + (aversion - 1) * strain;
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
  return netGoldPerTurn(state, player.id) >= AI.solvency.stopMaintainedBelow;
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
function goldReserveFor(state: GameState, playerId: number): number {
  const turns = Math.max(0, AI.solvency.reserveTurnsOfUpkeep);
  return AI.spending.goldReserve + Math.floor(turns * upkeepBill(state, playerId));
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
  let threats = 0;
  for (const unit of state.units) {
    if (unit.ownerId === player.id) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    if (nearOwnCity(state, player, unit.col, unit.row) === null) continue;
    threats += 1;
  }
  return Math.min(AI.score.cityCap, threats);
}

/**
 * The nearest town of this empire within `threat.radius` of a hex, or `null`.
 *
 * Shared by the threat count and the camp hunt, which is the point: "near one of
 * my towns" is one question, and a camp beside a town and a raider beside a town
 * are the same fact read twice. The two ask it at different reaches — a raider
 * inside `threat.radius` is an emergency, a camp inside `military.campHuntRadius`
 * is an errand — so the reach is the caller's and the *question* is shared.
 */
function nearOwnCity(
  state: GameState,
  player: Player,
  col: number,
  row: number,
  within: number = AI.threat.radius,
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
    // The tier is the offer's; within it, the first option. A charter's three
    // faces differ by slot layout, and comparing layouts is a valuation of a
    // whole empire's card collection — the successor's job.
    return {
      kind: 'draft',
      command: { type: 'adoptGovernment', playerId: player.id, choiceIndex: 0 },
      subject: player.name,
      summary:
        'Claims the charter it has banked, taking the first of its faces — it does not compare slot layouts.',
      candidates: unweighed(sc.pendingGovernment.options.map((id) => String(id))),
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

  // In collection order against slot order, both of which are state, and the
  // gate is the reducer's own: a pair `slotOrderError` accepts is a pair the
  // command accepts.
  const tried: BotCandidate[] = [];
  for (const owned of sc.orders) {
    for (let slot = 0; slot < sc.slots.length; slot++) {
      const label = `${cardName(owned.id)} → slot ${slot + 1}`;
      const refusal = slotOrderError(state, player.id, owned.id, slot);
      if (refusal === null) {
        tried.push(chosenAt(label, tried.length));
        return {
          kind: 'draft',
          command: { type: 'slotOrder', playerId: player.id, cardId: owned.id, slotIndex: slot },
          subject: player.name,
          summary: `Puts ${cardName(owned.id)} into slot ${slot + 1} — a card outside a slot is paying nothing.`,
          candidates: tried,
        };
      }
      tried.push({ label, score: 0, chosen: false, terms: [], rejected: refusal });
    }
  }
  return null;
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
      subject: city.name,
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
      label: `${held} card${held === 1 ? '' : 's'} already held on the ${line} thread × ${AI.score.synergyBonus}`,
      value: AI.score.synergyBonus * held,
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
  if (player.gold >= AI.solvency.arrearsTreasury) return null;
  if (netGoldPerTurn(state, player.id) >= AI.solvency.disbandBelowIncome) return null;
  if (countSoldiers(state, player.id) <= Math.max(0, AI.solvency.minArmy)) return null;

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
    if (garrisonAt(state, player.id, city) - 1 < AI.military.garrisonPerCity) return false;
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
    if (wrappedDistance(state.map, here, tileHex(at)) <= AI.threat.radius) return true;
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
  const candidates: BotCandidate[] = [];
  let best: TechId | null = null;
  let bestScore = -Infinity;
  let bestCandidate: BotCandidate | null = null;
  for (const id of TECH_IDS) {
    if (player.techsResearched.includes(id)) continue;
    const road = researchExpansion(state, player.id, id);
    if (road.length === 0) continue;
    if (road.length > AI.research.goalHorizon) {
      // Not a rejection by the rules — a rejection by this bot's own horizon,
      // which is the difference between a beeline and a hundred-turn ambition.
      candidates.push(
        refused(techDef(id).name, `${road.length} nodes away; the beeline looks ${AI.research.goalHorizon} ahead`),
      );
      continue;
    }
    let beakers = 0;
    for (const step of road) beakers += techDef(step).cost;
    const denominator = beakers / Math.max(1, AI.research.costDivisor) + 1;
    const gifts = explainTechGifts(id, ctx);
    const candidate: BotCandidate = {
      label: techDef(id).name,
      score: 0,
      chosen: false,
      terms: [
        nest('what the node unlocks', gifts),
        { label: 'holding one more technology', value: AI.weights.tech },
        {
          label: `÷ ${beakers} beakers over ${road.length} node${road.length === 1 ? '' : 's'} (${beakers} ÷ ${AI.research.costDivisor} + 1)`,
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
  const unlocks = techDef(id).unlocks;
  const terms: ValueTerm[] = [];
  for (const unit of unlocks.units ?? []) {
    const def = unitDef(unit);
    if (isCombatant(def) && !isExplorer(def)) {
      // The threat swing (addendum 1): a spear is worth several libraries while
      // there is a column beside the capital, and one library when there is not.
      const factor = ctx.threat > 0 ? Math.max(1, AI.threat.techMilitaryFactor) : 1;
      const soldier = explainSoldier(unit, ctx).terms;
      if (factor !== 1) soldier.push({ label: `× ${factor} (a column is near a town)`, value: factor, op: 'mul' });
      terms.push({
        label: def.name,
        value: valueOfSoldier(unit, ctx) * factor,
        parts: soldier,
      });
    } else if (def.foundsCity) {
      terms.push({ label: `${def.name} — one more town`, value: AI.weights.city });
    } else if (trades(def)) {
      terms.push({ label: `${def.name} — a caravan`, value: AI.weights.trader });
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
        value: AI.weights.worker + AI.religion.prophetTechValue * ctx.faithAppetite,
      });
    } else {
      terms.push({ label: `${def.name} — a civilian`, value: AI.weights.worker });
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
  terms.push({ label: `${projects} conversion project${projects === 1 ? '' : 's'}`, value: projects * AI.research.projectValue });
  terms.push({ label: `${abilities} ability${abilities === 1 ? '' : 'ies'}`, value: abilities * AI.research.abilityValue });
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
  const spend = AI.spending;
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
            : goldReserveFor(state, player.id);
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
  const spend = AI.spending;
  if (player.gold <= spend.goldSpendAbove + goldReserveFor(state, player.id)) return null;

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
        `reach with ${player.gold} in hand and ${goldReserveFor(state, player.id)} kept back.`,
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
    if (garrisonAt(state, player.id, city) >= AI.military.garrisonPerCity) continue;
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
  const spend = AI.spending;
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
      above = Math.min(above, AI.religion.pantheonSpendAbove);
    }
    if (def.prophesies === true && unfounded) {
      above = Math.min(above, AI.religion.prophetSpendAbove);
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
    currency === 'gold' ? goldReserveFor(state, player.id) : AI.spending.faithReserve;
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
    subject: city.name,
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
  const ctx = valueContext(state, player);
  const candidates = buildCandidates(state, player, city, ctx);
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
): BuildCandidate[] {
  const candidates: BuildCandidate[] = [];
  // The empire's half of every town's percentages, taken **once** for the whole
  // sweep rather than once per candidate — `cityQuote`'s own documented bargain,
  // and the difference between one meter sweep and forty.
  const empire = empirePercents(state, player.id);
  const base = cityYields(state, city, [], null, cityQuote(state, city, [], empire));

  for (const id of BUILDING_IDS) {
    if (!canQueueBuilding(state, player, city, id)) continue;
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
    if (!canQueueUnit(state, player, city, id)) continue;
    const role = unitRoleValue(state, player, city, id, ctx);
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
  // `null` is "this town will never finish it" — no production at all — and a
  // candidate that never finishes has no score, not a bad one.
  const turns = turnsToBuild(state, city, item, 0);
  if (turns === null) return;
  const effort = Math.max(1, Math.min(AI.score.maxTurns, turns));
  const terms: ValueTerm[] = [
    ...valueTerms,
    nest('its standing maintenance', explainUpkeepCost(upkeep, ctx), 'sub'),
    {
      label:
        `÷ ${effort} turn${effort === 1 ? '' : 's'} of build effort` +
        (turns > effort ? ` (${turns} turns, capped at ${AI.score.maxTurns})` : ''),
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
 * A **settler** is a town minus the citizen it costs, which is the trade
 * honestly stated. A **worker** and a **caravan** are flat figures in the
 * weights, and the caravan's is multiplied by the gold pressure: a broke empire
 * builds trade, which is the one production decision that answers a deficit
 * directly. A **soldier** carries `essential` when its town is standing empty,
 * which is the one candidate the solvency floor may never filter away.
 */
function unitRoleValue(
  state: GameState,
  player: Player,
  city: City,
  id: UnitTypeId,
  ctx: ValueContext,
): { value: number; essential: boolean; terms: ValueTerm[] } | null {
  const def = unitDef(id);

  if (def.foundsCity === true) {
    if (city.population < AI.expansion.settlerCityPop) return null;
    if (authorityOf(state, player.id) < AI.expansion.settlerAuthorityFloor) return null;
    if (countOwnedAndQueued(state, player.id, id) >= AI.expansion.settlerCap) return null;
    return {
      value: AI.weights.city - AI.weights.citizen,
      essential: false,
      terms: [
        { label: 'one more town', value: AI.weights.city },
        { label: 'the citizen it costs this town', value: AI.weights.citizen, op: 'sub' },
      ],
    };
  }

  if (isPlainBuilder(def)) {
    const towns = countCities(state, player.id);
    const wanted = Math.min(AI.workers.cap, Math.floor(towns * AI.workers.perCity));
    if (countOwnedAndQueued(state, player.id, id) >= wanted) return null;
    return {
      value: AI.weights.worker,
      essential: false,
      terms: [{ label: 'a worker, flat — the improvements it will lay, priced as one number', value: AI.weights.worker }],
    };
  }

  if (trades(def)) {
    if (countCities(state, player.id) < 2) return null;
    const towns = countCities(state, player.id);
    const wanted = Math.min(AI.trade.traderCap, Math.floor(towns * AI.trade.tradersPerCity));
    if (countOwnedAndQueued(state, player.id, id) >= wanted) return null;
    return {
      value: AI.weights.trader * ctx.goldPressure,
      essential: false,
      terms: [
        { label: 'a caravan, flat', value: AI.weights.trader },
        { label: `× ${ctx.goldPressure} gold pressure — a broke empire trades`, value: ctx.goldPressure, op: 'mul' },
      ],
    };
  }

  if (isCombatant(def)) {
    // Ships are a whole system this bot has no opinion about; a landlocked town
    // that queued one would build a hull it can never use.
    if (def.category === 'naval') return null;
    const held = garrisonAt(state, player.id, city);
    const empty = held < AI.military.garrisonPerCity;
    const wanted =
      countCities(state, player.id) * AI.military.armyPerCity +
      ctx.threat * AI.threat.extraArmyPerThreat;
    if (!empty && countSoldiers(state, player.id) >= wanted) return null;
    let value = valueOfSoldier(id, ctx);
    const terms: ValueTerm[] = [nest('what this soldier is worth', explainSoldier(id, ctx))];
    if (empty) {
      value += AI.threat.garrisonValue;
      terms.push({ label: 'its town is standing empty', value: AI.threat.garrisonValue });
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

/** `validateQueue`'s unit clauses, likewise. */
function canQueueUnit(state: GameState, player: Player, city: City, id: UnitTypeId): boolean {
  if (city.population < unitDef(id).minCityPop) return false;
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
    // **A great person sleeps**, and that is the v0 deferral said out loud: a
    // work is a once-per-game hand, and a bot that spent one on the first legal
    // hex would be worse than one that keeps it. The successor is a valuation of
    // what a work is worth on a hex, which is the same missing machinery the
    // drafting heuristic waits on.
    return standDown(unit, 'A great person is never spent by this bot — a work is a once-per-game hand.');
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
  const here = getTileAt(state.map, unit.col, unit.row);
  const standing =
    here === undefined
      ? null
      : { tile: here, appraisal: explainSite(state, here), legal: foundingError(state, unit) };
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
    if (standing.appraisal.total >= AI.expansion.siteScoreMin) {
      return foundHere(
        `The ground it stands on scores ${round1(standing.appraisal.total)}, over the ` +
          `${AI.expansion.siteScoreMin} it asks for. Founds here.`,
      );
    }
  }
  const march = marchToSite(state, player, unit, standing?.appraisal ?? null);
  if (march !== null) return march;
  // Nowhere better within reach: found here anyway if the rules allow it — a
  // settler standing around forever is worth less than a mediocre town — else
  // sleep and let the next turn's board be a different question.
  if (standing !== null && standing.legal === null) {
    return foundHere(
      `Nowhere better within ${AI.expansion.siteSearchRadius} hexes it can walk to; founds on ` +
        `${round1(standing.appraisal.total)} ground anyway rather than wander.`,
    );
  }
  return standDown(unit, 'Nowhere legal to found and nowhere better to walk.');
}

/** The best reachable site inside the search radius, as a march order. */
function marchToSite(
  state: GameState,
  player: Player,
  unit: Unit,
  here: Appraisal | null,
): UnitChoice | null {
  const candidates: { tile: Tile; score: number; distance: number; terms: ValueTerm[] }[] = [];
  const from = tileHex(getTileAt(state.map, unit.col, unit.row) ?? state.map.tiles[0]!);
  for (const tile of mapRange(state.map, from, AI.expansion.siteSearchRadius)) {
    if (tile.col === unit.col && tile.row === unit.row) continue;
    if (foundingErrorAt(state, player.id, tile) !== null) continue;
    const appraisal = explainSite(state, tile);
    if (appraisal.total < AI.expansion.siteScoreMin) continue;
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
  const probes = candidates.slice(0, AI.search.pathProbes);
  const hereScore = here?.total ?? 0;
  const rows: BotCandidate[] = [
    {
      label: `stay and found here (${unit.col},${unit.row})`,
      score: hereScore,
      chosen: false,
      terms: here?.terms ?? [],
    },
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
        `${candidates.length} legal sites in range; the ${AI.search.pathProbes} best were asked for a route.`,
      candidates: rows,
      focus: { col: candidate.tile.col, row: candidate.tile.row },
    };
  }
  return null;
}

/**
 * What a hex is worth as a city site: the weighted fold of its own yield and its
 * six neighbours', plus the two things a town cares about that no tile yield
 * says — fresh water, and a coast.
 *
 * The ring is one flat run of adds rather than a per-hex subtotal, and that is
 * the arithmetic rather than a presentation choice: regrouping the sum would
 * move the last bits and a settler would walk somewhere else.
 */
function explainSite(state: GameState, tile: Tile) {
  const ring: ValueTerm[] = [];
  for (const near of mapRange(state.map, tileHex(tile), AI.site.ringRadius)) {
    const yields = foldTileYield(explainTileYield(near));
    for (const [voice, weight] of Object.entries(AI.site.yieldWeights)) {
      const value = (yields as unknown as Record<string, number>)[voice];
      if (typeof value === 'number') {
        ring.push({ label: `(${near.col},${near.row}) ${voice} ${value} × ${weight}`, value: value * weight });
      }
    }
  }
  const terms: ValueTerm[] = [
    { label: `the hex and its ring, weighted`, value: foldOf(ring), parts: ring },
  ];
  if (hasFreshWater(tile)) terms.push({ label: 'fresh water', value: AI.site.freshWaterBonus });
  if (isCoastal(state.map, tile)) terms.push({ label: 'a coast', value: AI.site.coastBonus });
  return appraise(terms);
}


/**
 * A worker improves the ground it is standing on, else walks to ground that
 * wants improving, else sleeps.
 *
 * `improvementError` is the whole gate for the standing case — it asks the
 * unit's charges, its movement, the ground, the seam and the technology — and
 * `improvementErrorAt` is its ground-only half, which is what a search over
 * hexes with no worker on them needs.
 */
function workerCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  // **The preference order is the whole appraisal here.** A worker does not
  // score a farm against a mine: it takes the first improvement on
  // `ai.workers.improvements` the rules will accept, so the candidate table is
  // that list with the simulation's own refusal beside each row it passed over.
  const tried: BotCandidate[] = [];
  for (let rank = 0; rank < WORK_ORDER.length; rank++) {
    const improvement = WORK_ORDER[rank]!;
    const refusal = improvementError(state, unit.id, improvement);
    if (refusal === null) {
      tried.push(chosenAt(improvementDef(improvement).name, rank));
      return {
        command: { type: 'buildImprovement', playerId: player.id, unitId: unit.id, improvement },
        summary: `Lays ${improvementDef(improvement).name} where it stands — first on the preference order the ground will take.`,
        candidates: tried,
      };
    }
    tried.push(refused(improvementDef(improvement).name, refusal));
  }
  /**
   * **The survey, after the spade and only where the worker already stands.**
   *
   * Deliberately the smallest possible arm: no search, no scoring, no walking
   * to a hill. A worker with nothing to build under it that happens to be
   * standing on unasked high ground inside its own borders spends the turn
   * asking, because the alternative on that hex is `standDown` — so the survey
   * costs the bot nothing it was going to do anyway and the assay is free money.
   *
   * The territory clause is the bot's own, not the rule's (`prospectError` lets
   * anybody survey anywhere): a bot that wandered off to read hills in the wild
   * would be an exploration policy wearing a worker, and `nearestWorkableTile`
   * below is the policy this piece actually has.
   */
  if (
    prospectError(state, unit.id) === null &&
    tileOwnerPlayerId(state, unit.col, unit.row) === player.id
  ) {
    tried.push(chosenAt('survey the ground it stands on', WORK_ORDER.length));
    return {
      command: { type: 'prospect', playerId: player.id, unitId: unit.id },
      summary: 'Nothing to build under it: surveys the high ground it is standing on instead, which is free.',
      candidates: tried,
    };
  }
  const target = nearestWorkableTile(state, player, unit);
  if (target !== null) {
    tried.push(chosenAt(`walk to (${target.col},${target.row})`, WORK_ORDER.length + 1));
    return {
      command: {
        type: 'moveUnit',
        playerId: player.id,
        unitId: unit.id,
        target: { col: target.col, row: target.row },
      },
      summary: `Nothing to build under it: walks to the nearest owned hex some improvement will take, (${target.col},${target.row}).`,
      candidates: tried,
      focus: { col: target.col, row: target.row },
    };
  }
  return standDown(unit, 'No improvement is legal under it and no workable hex is in reach.');
}

/** The nearest owned, unimproved hex some improvement would take, or `null`. */
function nearestWorkableTile(state: GameState, player: Player, unit: Unit): Tile | null {
  const from = tileHex(getTileAt(state.map, unit.col, unit.row) ?? state.map.tiles[0]!);
  const found: { tile: Tile; distance: number }[] = [];
  for (const tile of mapRange(state.map, from, AI.workers.searchRadius)) {
    if (tile.col === unit.col && tile.row === unit.row) continue;
    if (tileOwnerPlayerId(state, tile.col, tile.row) !== player.id) continue;
    let wanted = false;
    for (const improvement of WORK_ORDER) {
      if (improvementErrorAt(state, player.id, tile, improvement) === null) {
        wanted = true;
        break;
      }
    }
    if (!wanted) continue;
    found.push({ tile, distance: wrappedDistance(state.map, from, tileHex(tile)) });
  }
  found.sort((a, b) => a.distance - b.distance);
  for (const entry of found.slice(0, AI.search.pathProbes)) {
    if (findPath(state, unit, entry.tile) !== null) return entry.tile;
  }
  return null;
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
 * A soldier's four questions, in order: is there a favourable blow against the
 * wild next door, is there a camp to march on, am I standing in a town that
 * wants holding, and — failing all three — dig in where I am.
 *
 * **It never attacks another nation.** There is no diplomacy state in this
 * game, so a bot that opened fire would be starting a war that has no shape and
 * no end; the whole branch is gated on the target's owner being the wild. That
 * is the v0 creed's fourth clause and the successor is diplomacy state.
 */
function soldierCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const blow = favourableBlow(state, player, unit);
  if (blow !== null) {
    return {
      command: { type: 'attack', playerId: player.id, unitId: unit.id, target: blow.at },
      summary: blow.summary,
      candidates: blow.candidates,
      focus: blow.at,
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
 * An adjacent hex holding one of the wild's pieces that this unit would come
 * off better against, or `null`.
 *
 * The whole exchange is asked of `previewCombat`, which is the *same* plan the
 * reducer resolves — so the movement, the one-blow-a-turn rule, the range, the
 * terrain and the fortification are all already in the answer and none of them
 * is restated here. "Better off" is the naive reading: the defender dies, or the
 * midpoint roll hurts them more than it hurts us.
 */
function favourableBlow(state: GameState, player: Player, unit: Unit): UnitTarget | null {
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const tried: BotCandidate[] = [];
  for (const near of mapRange(state.map, tileHex(here), unitDef(unit.type).range ?? 1)) {
    if (near.col === unit.col && near.row === unit.row) continue;
    if (!holdsWild(state, player, near)) continue;
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
    if (kills || preview.damageToDefender > preview.damageToAttacker) {
      exchange.chosen = true;
      tried.push(exchange);
      return {
        at: { col: near.col, row: near.row },
        summary: kills
          ? `The blow kills: ${preview.damageToDefender} damage against ${preview.defenderHp} hit points left.`
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
    if (distance === 0 || distance > AI.military.campHuntRadius) continue;
    // The camp has to threaten *something of ours*. `nearOwnCity` answers with
    // the nearest town inside `threat.radius`; a camp with no town near it is
    // somebody else's problem.
    const near = nearOwnCity(state, player, camp.col, camp.row, AI.military.campHuntRadius);
    if (near === null) continue;
    reachable.push({ camp: { col: camp.col, row: camp.row }, toTown: near.distance, distance });
  }
  // Nearest to one of our towns first, then nearest to this piece, then map
  // order — all three facts about the board rather than about the order a loop
  // happened to visit `state.camps` in.
  reachable.sort((a, b) => a.toTown - b.toTown || a.distance - b.distance);
  const tried: BotCandidate[] = [];
  for (const entry of reachable.slice(0, AI.search.pathProbes)) {
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
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (garrisonAt(state, player.id, city) < AI.military.garrisonPerCity) return false;
  }
  return true;
}

/**
 * The nearest of this empire's towns that is standing without a garrison and
 * that this piece can reach, or `null` when it is already standing in one.
 */
function undefendedCity(state: GameState, player: Player, unit: Unit): UnitTarget | null {
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const from = tileHex(here);
  const wanted: { city: City; distance: number }[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (city.col === unit.col && city.row === unit.row) return null;
    if (garrisonAt(state, player.id, city) >= AI.military.garrisonPerCity) continue;
    wanted.push({ city, distance: wrappedDistance(state.map, from, tileHex(getTileAt(state.map, city.col, city.row)!)) });
  }
  wanted.sort((a, b) => a.distance - b.distance);
  const tried: BotCandidate[] = [];
  for (const entry of wanted.slice(0, AI.search.pathProbes)) {
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
 */
function traderCommand(state: GameState, player: Player, unit: Unit): UnitChoice | null {
  const tried: BotCandidate[] = [];
  for (const from of state.cities) {
    if (from.ownerId !== player.id) continue;
    for (const to of state.cities) {
      if (to.ownerId !== player.id || to.id === from.id) continue;
      const label = `${from.name} → ${to.name}`;
      const refusal = startRouteError(state, player.id, unit.id, from.id, to.id);
      if (refusal !== null) {
        tried.push(refused(label, refusal));
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
        },
        summary: `Opens the first route the rules will take, ${from.name} → ${to.name} — this bot does not price routes against each other.`,
        candidates: tried,
        focus: { col: to.col, row: to.row },
      };
    }
  }
  return standDown(unit, 'No pair of this empire’s towns will take a route.');
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
