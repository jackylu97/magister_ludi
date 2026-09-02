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
 * The v0 creed, and every clause of it is a deliberate simplification
 * -------------------------------------------------------------------
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
 *   · **Greedy.** Every choice is the first thing that passes a validator, in a
 *     priority order that lives in `data/ai.json`. There is no search, no
 *     lookahead and no evaluation of a position. The successor for the drafts is
 *     a scored hand rather than a preference for a label (see `scoreOrder`).
 *   · **Peaceful toward real players.** It hunts the wild, garrisons its towns
 *     and never once attacks another nation's unit or city. There is no
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

import aiJson from '../../data/ai.json';

import { type BuildingId, isBuildingId } from '../sim/buildingData';
import {
  type QueueItem,
  cityById,
  hasEndedTurn,
  playerById,
} from '../sim/state';
import type { City, GameState, Player, Unit } from '../sim/state';
import {
  explainTileYield,
  foldTileYield,
  foundingError,
  foundingErrorAt,
  tileOwnerPlayerId,
} from '../sim/cities';
import { fortifyError, previewCombat } from '../sim/combat';
import type { Command } from '../sim/commands';
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
import { isUpgradeIndex, orderOfferSize, slotOrderError } from '../sim/statecraft';
import { type OrderId, orderDef } from '../sim/statecraftData';
import { type TechId, techDef } from '../sim/techData';
import { availableTechs, buildError } from '../sim/tech';
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
 * Every tuned number this bot has, read off `data/ai.json`.
 *
 * The project's oldest rule (`CLAUDE.md`): code holds algorithms, data holds
 * constants. A settler cap, a search radius and a build order are all opinions
 * about balance, and an opinion about balance in a `const` is an opinion nobody
 * can retune without a rebuild.
 */
interface AiConfig {
  driver: {
    /** Hard ceiling on commands one seat may emit in one turn. A guard, not a rule. */
    commandsPerSeat: number;
    /** How many times the driver re-runs the bot after a refused `endTurn`. */
    endTurnAttempts: number;
    /** How many `chooseGreatPerson` redraws the driver will ride out. */
    greatPersonRedraws: number;
  };
  search: {
    /**
     * How many ranked destinations a decision will pay for a route to before it
     * settles for standing still.
     *
     * A* over a full map is the most expensive question this bot asks, and the
     * shape that makes it expensive is *unreachable* ground: a high-scoring city
     * site across a strait is refused by the pathfinder only after a complete
     * search, and a bot that walked its whole candidate list would pay for one
     * of those per candidate, every turn, forever. Four is enough that the
     * ordinary case — the best site, and it is walkable — is never missed, and
     * bounded enough that a coastline cannot make a turn quadratic.
     *
     * It is a *cap on effort*, not a rule, which is why it lives here: raising
     * it makes the bot slower and very slightly better, and that is exactly the
     * kind of dial a data file is for.
     */
    pathProbes: number;
  };
  /**
   * When the two banks are opened, and what is never taken out of them.
   *
   * **A hoarding bot is a dead bot**: gold and faith have no automatic sink in
   * this game — nothing spends them but a decision — so a seat that never
   * decides ends the game with a treasury and an empty board. The threshold is
   * what stops it going the other way and buying a warrior the turn it can
   * afford one; the reserve is what it keeps back, because buildings cost gold
   * to *maintain* (`explainEmpireGold`) and an empire at zero is an empire
   * disbanding units next resolution.
   */
  spending: {
    /** Gold above this, over and above the reserve, is surplus. */
    goldSpendAbove: number;
    /** Gold never spent. Upkeep is a standing bill, not a one-off. */
    goldReserve: number;
    /** Faith above this, over and above its reserve, is surplus. */
    faithSpendAbove: number;
    faithReserve: number;
  };
  expansion: {
    settlerCap: number;
    settlerCityPop: number;
    settlerAuthorityFloor: number;
    siteSearchRadius: number;
    siteScoreMin: number;
  };
  site: {
    ringRadius: number;
    freshWaterBonus: number;
    coastBonus: number;
    yieldWeights: Record<string, number>;
  };
  workers: {
    perCity: number;
    cap: number;
    searchRadius: number;
    improvements: string[];
  };
  military: {
    campHuntRadius: number;
    garrisonPerCity: number;
    armyPerCity: number;
  };
  trade: {
    tradersPerCity: number;
    traderCap: number;
  };
  build: {
    buildings: string[];
  };
  statecraft: {
    /**
     * Effect labels the drafting heuristic likes to see on a card.
     *
     * **Read as a tag, never evaluated.** `statecraft.ts` is still the only
     * module in the game that switches on what a `CardEffect.kind` *means*
     * (CLAUDE.md); this list is matched against the string for a preference and
     * nothing here asks what the effect does. Retuning the bot's taste is a JSON
     * edit, which is the whole reason it is here rather than in a `const`.
     */
    preferredEffectKinds: string[];
  };
}

export const AI: AiConfig = aiJson as AiConfig;

/** The build order, narrowed to rows this build actually has. */
const BUILD_ORDER: BuildingId[] = AI.build.buildings.filter((id): id is BuildingId =>
  isBuildingId(id),
);

/** The improvements a worker will lay, in preference order. */
const WORK_ORDER: ImprovementId[] = AI.workers.improvements.filter((id): id is ImprovementId =>
  isImprovementId(id),
);

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
 * When nothing is owed there is still *housekeeping* — a banked charter and a
 * card standing outside a slot that fits it — because neither blocks End Turn
 * by design (Entry XV makes adoption bankable) and a bot that only ever
 * answered blockers would play a hundred turns under a chiefdom.
 */
export function nextBotCommand(state: GameState, playerId: number): Command | null {
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
function answerBlocker(state: GameState, player: Player, blocker: TurnBlocker): Command | null {
  const playerId = player.id;
  switch (blocker.kind) {
    case 'discovery':
      // Index 0, like every offer this bot does not score. A ruin's three boons
      // are not comparable without a valuation of the whole empire, and inventing
      // one would be sophistication this pass is explicitly resisting.
      return { type: 'chooseDiscovery', playerId, optionIndex: 0 };
    case 'statecraft':
      return blocker.what === 'order'
        ? { type: 'chooseOrder', playerId, optionIndex: bestOrderIndex(player) }
        : { type: 'chooseDoctrine', playerId, optionIndex: 0 };
    case 'religion':
      return { type: 'chooseBelief', playerId, optionIndex: 0 };
    case 'greatPerson':
      return { type: 'chooseGreatPerson', playerId, optionIndex: greatPersonIndex(state, player) };
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
function housekeeping(state: GameState, player: Player): Command | null {
  const sc = player.statecraft;
  if (sc.pendingGovernment !== undefined) {
    // The tier is the offer's; within it, the first option. A charter's three
    // faces differ by slot layout, and comparing layouts is a valuation of a
    // whole empire's card collection — the successor's job.
    return { type: 'adoptGovernment', playerId: player.id, choiceIndex: 0 };
  }
  // In collection order against slot order, both of which are state, and the
  // gate is the reducer's own: a pair `slotOrderError` accepts is a pair the
  // command accepts.
  for (const owned of sc.orders) {
    for (let slot = 0; slot < sc.slots.length; slot++) {
      if (slotOrderError(state, player.id, owned.id, slot) === null) {
        return { type: 'slotOrder', playerId: player.id, cardId: owned.id, slotIndex: slot };
      }
    }
  }
  return null;
}

// --- the offers -------------------------------------------------------------

/**
 * Which card of an Order draft this bot takes.
 *
 * A preference rather than a valuation: a card whose effects carry a *label*
 * this bot likes (yields, per-thing scaling, a percentage on a yield) beats one
 * whose effects are about combat, sight or a rule it cannot read. Ties go to the
 * first index, which is draw order and therefore part of the log.
 *
 * The upgrade option — always last when there is one — is scored through the
 * card it deepens, because that is what taking it does.
 */
function bestOrderIndex(player: Player): number {
  const offer = player.statecraft.pendingOrder;
  if (offer === undefined) return 0;
  const size = orderOfferSize(offer);
  let bestIndex = 0;
  let bestScore = -1;
  for (let index = 0; index < size; index++) {
    const id = isUpgradeIndex(offer, index) ? offer.upgrade : offer.options[index];
    if (id === undefined) continue;
    const score = scoreOrder(id);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex;
}

/**
 * How much this bot likes one Order: how many of its effects wear a label from
 * `ai.statecraft.preferredEffectKinds`.
 *
 * Counting labels is not reading effects, and the distinction is load-bearing —
 * see the field's docblock. The successor is a real valuation: what the card
 * would pay *this* empire on *this* board, which needs the evaluators in
 * `statecraft.ts` to answer hypothetically and is a pass of its own.
 */
function scoreOrder(id: OrderId): number {
  let score = 0;
  for (const effect of orderDef(id).effects) {
    if (AI.statecraft.preferredEffectKinds.includes(effect.kind)) score += 1;
  }
  return score;
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
function greatPersonIndex(state: GameState, player: Player): number {
  const offer = player.greatPersonOffer;
  if (offer === undefined) return 0;
  for (let index = 0; index < offer.options.length; index++) {
    if (greatPersonChoiceError(state, player.id, index) === null) return index;
  }
  return 0;
}

/**
 * The cheapest technology this empire could start on, ties by the tree's own
 * order.
 *
 * Cheapest rather than best, and that is the naive half said out loud: an
 * opening that buys the most nodes per beaker spreads an empire across the
 * early tree, which is a serviceable stand-in for a plan and is nothing like
 * one. The successor is a goal node and `chooseResearch`'s queue, which already
 * takes a distant target and fills in its prerequisites.
 */
function researchCommand(state: GameState, playerId: number): Command | null {
  const open = availableTechs(state, playerId);
  if (open.length === 0) return null;
  let best: TechId = open[0]!;
  for (const id of open) {
    if (techDef(id).cost < techDef(best).cost) best = id;
  }
  return { type: 'chooseResearch', playerId, techId: best };
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
function spendCommand(state: GameState, player: Player): Command | null {
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
function contributionCommand(state: GameState, player: Player): Command | null {
  const spend = AI.spending;
  for (const currency of ['gold', 'faith'] as const) {
    const reserve = currency === 'gold' ? spend.goldReserve : spend.faithReserve;
    const above = currency === 'gold' ? spend.goldSpendAbove : spend.faithSpendAbove;
    if (bankOf(player, currency) <= above + reserve) continue;
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      if (contributeError(state, player.id, city.id, currency) !== null) continue;
      const offer = explainContribution(state, player.id, city.id, currency);
      if (offer === null) continue;
      if (bankOf(player, currency) - offer.spend < reserve) continue;
      return { type: 'contribute', playerId: player.id, cityId: city.id, currency };
    }
  }
  return null;
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
function goldPurchase(state: GameState, player: Player): Command | null {
  const spend = AI.spending;
  if (player.gold <= spend.goldSpendAbove + spend.goldReserve) return null;

  for (const id of BUILD_ORDER) {
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      const item: PurchasableItem = { kind: 'building', id };
      if (affordable(state, player, city, item, 'gold')) {
        return { type: 'purchaseItem', playerId: player.id, cityId: city.id, item, currency: 'gold' };
      }
    }
  }
  // A town with nobody standing in it is the one thing worth breaking the
  // building order for. `purchaseError` owns the one-unit-per-city stamp
  // (`City.purchasedUnitTurn`), so a town that already took delivery today is
  // simply skipped rather than fought with.
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (garrisonAt(state, player.id, city) >= AI.military.garrisonPerCity) continue;
    const soldier = bestPurchasableSoldier(state, player, city);
    if (soldier === null) continue;
    return {
      type: 'purchaseItem',
      playerId: player.id,
      cityId: city.id,
      item: { kind: 'unit', id: soldier },
      currency: 'gold',
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
function faithPurchase(state: GameState, player: Player): Command | null {
  const spend = AI.spending;
  if (player.faithPool <= spend.faithSpendAbove + spend.faithReserve) return null;

  for (const id of UNIT_TYPE_IDS) {
    if (unitDef(id).purchase?.currency !== 'faith') continue;
    if (ownsAny(state, player.id, id)) continue;
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      const item: PurchasableItem = { kind: 'unit', id };
      if (affordable(state, player, city, item, 'faith')) {
        return {
          type: 'purchaseItem',
          playerId: player.id,
          cityId: city.id,
          item,
          currency: 'faith',
        };
      }
    }
  }
  return null;
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
  const reserve = currency === 'gold' ? AI.spending.goldReserve : AI.spending.faithReserve;
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
function cityCommand(state: GameState, player: Player, cityId: number): Command | null {
  const city = cityById(state, cityId);
  if (!city || city.ownerId !== player.id) return null;
  const item = chooseProduction(state, player, city);
  if (item === null) return null;
  return { type: 'setCityProduction', playerId: player.id, cityId, queue: [item] };
}

function chooseProduction(state: GameState, player: Player, city: City): QueueItem | null {
  const settler = settlerType(state, player, city);
  if (settler !== null) return { kind: 'unit', id: settler };

  const worker = workerType(state, player, city);
  if (worker !== null) return { kind: 'unit', id: worker };

  for (const id of BUILD_ORDER) {
    if (canQueueBuilding(state, player, city, id)) return { kind: 'building', id };
  }

  const trader = traderType(state, player, city);
  if (trader !== null) return { kind: 'unit', id: trader };

  const soldier = bestSoldier(state, player, city);
  if (soldier !== null) return { kind: 'unit', id: soldier };

  for (const id of PROJECT_IDS) {
    if (buildError(state, player.id, 'project', id, city) === null) {
      return { kind: 'project', id };
    }
  }
  return null;
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

/**
 * The settler this town should build, or `null`.
 *
 * Three gates, and every one of them is a number in `data/ai.json`: the empire
 * is not already at its settler cap (counting the ones queued, or the whole
 * empire queues one the same turn), the town is big enough that losing a
 * citizen is not a wound, and there is authority headroom — a settler that
 * founds a town into a deficit freezes every border the empire has.
 *
 * It does **not** check that a site exists. That is the settler's own decision
 * when it is standing somewhere (`unitCommand`), and asking it here would be a
 * map-wide search per town per turn for an answer that goes stale in three.
 */
function settlerType(state: GameState, player: Player, city: City): UnitTypeId | null {
  if (city.population < AI.expansion.settlerCityPop) return null;
  if (authorityOf(state, player.id) < AI.expansion.settlerAuthorityFloor) return null;
  for (const id of UNIT_TYPE_IDS) {
    if (unitDef(id).foundsCity !== true) continue;
    if (countOwnedAndQueued(state, player.id, id) >= AI.expansion.settlerCap) continue;
    if (canQueueUnit(state, player, city, id)) return id;
  }
  return null;
}

/** The worker this town should build, or `null`. One per city up to a cap. */
function workerType(state: GameState, player: Player, city: City): UnitTypeId | null {
  const towns = countCities(state, player.id);
  const wanted = Math.min(AI.workers.cap, Math.floor(towns * AI.workers.perCity));
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    // A builder by its charges, never by its name — `isBuilder`'s reading, and
    // it must not be a settler, which also carries a charge in some rosters.
    if (def.charges === undefined || def.foundsCity === true) continue;
    if (countOwnedAndQueued(state, player.id, id) >= wanted) continue;
    if (canQueueUnit(state, player, city, id)) return id;
  }
  return null;
}

/** The caravan this town should build, or `null`. Only ever with somewhere to send it. */
function traderType(state: GameState, player: Player, city: City): UnitTypeId | null {
  if (countCities(state, player.id) < 2) return null;
  const towns = countCities(state, player.id);
  const wanted = Math.min(AI.trade.traderCap, Math.floor(towns * AI.trade.tradersPerCity));
  for (const id of UNIT_TYPE_IDS) {
    if (!trades(unitDef(id))) continue;
    if (countOwnedAndQueued(state, player.id, id) >= wanted) continue;
    if (canQueueUnit(state, player, city, id)) return id;
  }
  return null;
}

/**
 * The strongest legal soldier, or `null` once the empire has enough of them.
 *
 * "Strongest" is the roster's own `combatStrength` with a shooter's
 * `rangedStrength` taken as the higher of the two, which is a crude reading and
 * is meant to be: this bot does not have an army composition, it has a wall of
 * whatever the tree has most recently unlocked. Ties go to roster order.
 */
function bestSoldier(state: GameState, player: Player, city: City): UnitTypeId | null {
  const wanted = countCities(state, player.id) * AI.military.armyPerCity;
  if (countSoldiers(state, player.id) >= wanted) return null;
  let best: UnitTypeId | null = null;
  let bestStrength = -1;
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (!isCombatant(def)) continue;
    // Ships are a whole system this bot has no opinion about; a landlocked town
    // that queued one would build a hull it can never use.
    if (def.category === 'naval') continue;
    if (!canQueueUnit(state, player, city, id)) continue;
    const strength = Math.max(def.combatStrength, def.rangedStrength ?? 0);
    if (strength > bestStrength) {
      bestStrength = strength;
      best = id;
    }
  }
  return best;
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
function unitCommand(state: GameState, player: Player, unitId: number): Command | null {
  const unit = findUnit(state, unitId);
  if (!unit || unit.ownerId !== player.id) return null;
  const def = unitDef(unit.type);

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
  return standDown(unit);
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
function standDown(unit: Unit): Command | null {
  if (sleepError(unit) === null) return { type: 'sleepUnit', playerId: unit.ownerId, unitId: unit.id };
  if (fortifyError(unit) === null) return { type: 'fortify', playerId: unit.ownerId, unitId: unit.id };
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
function settlerCommand(state: GameState, player: Player, unit: Unit): Command | null {
  const here = getTileAt(state.map, unit.col, unit.row);
  if (here && foundingError(state, unit) === null) {
    if (siteScore(state, here) >= AI.expansion.siteScoreMin) {
      return { type: 'foundCity', playerId: player.id, settlerUnitId: unit.id };
    }
  }
  const march = marchToSite(state, player, unit);
  if (march !== null) return march;
  // Nowhere better within reach: found here anyway if the rules allow it — a
  // settler standing around forever is worth less than a mediocre town — else
  // sleep and let the next turn's board be a different question.
  if (here && foundingError(state, unit) === null) {
    return { type: 'foundCity', playerId: player.id, settlerUnitId: unit.id };
  }
  return standDown(unit);
}

/** The best reachable site inside the search radius, as a march order. */
function marchToSite(state: GameState, player: Player, unit: Unit): Command | null {
  const candidates: { tile: Tile; score: number; distance: number }[] = [];
  const from = tileHex(getTileAt(state.map, unit.col, unit.row) ?? state.map.tiles[0]!);
  for (const tile of mapRange(state.map, from, AI.expansion.siteSearchRadius)) {
    if (tile.col === unit.col && tile.row === unit.row) continue;
    if (foundingErrorAt(state, player.id, tile) !== null) continue;
    const score = siteScore(state, tile);
    if (score < AI.expansion.siteScoreMin) continue;
    candidates.push({ tile, score, distance: wrappedDistance(state.map, from, tileHex(tile)) });
  }
  // Best first, nearest on a tie, then map order — all three are facts about the
  // board rather than about the order a loop happened to visit hexes in.
  candidates.sort((a, b) => b.score - a.score || a.distance - b.distance);
  for (const candidate of candidates.slice(0, AI.search.pathProbes)) {
    if (findPath(state, unit, candidate.tile) === null) continue;
    return {
      type: 'moveUnit',
      playerId: player.id,
      unitId: unit.id,
      target: { col: candidate.tile.col, row: candidate.tile.row },
    };
  }
  return null;
}

/**
 * What a hex is worth as a city site: the weighted fold of its own yield and its
 * six neighbours', plus the two things a town cares about that no tile yield
 * says — fresh water, and a coast.
 */
function siteScore(state: GameState, tile: Tile): number {
  let score = 0;
  for (const near of mapRange(state.map, tileHex(tile), AI.site.ringRadius)) {
    const yields = foldTileYield(explainTileYield(near));
    for (const [voice, weight] of Object.entries(AI.site.yieldWeights)) {
      const value = (yields as unknown as Record<string, number>)[voice];
      if (typeof value === 'number') score += value * weight;
    }
  }
  if (hasFreshWater(tile)) score += AI.site.freshWaterBonus;
  if (isCoastal(state.map, tile)) score += AI.site.coastBonus;
  return score;
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
function workerCommand(state: GameState, player: Player, unit: Unit): Command | null {
  for (const improvement of WORK_ORDER) {
    if (improvementError(state, unit.id, improvement) === null) {
      return { type: 'buildImprovement', playerId: player.id, unitId: unit.id, improvement };
    }
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
    return { type: 'prospect', playerId: player.id, unitId: unit.id };
  }
  const target = nearestWorkableTile(state, player, unit);
  if (target !== null) {
    return {
      type: 'moveUnit',
      playerId: player.id,
      unitId: unit.id,
      target: { col: target.col, row: target.row },
    };
  }
  return standDown(unit);
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
function scoutCommand(state: GameState, player: Player, unit: Unit): Command | null {
  if (unit.autoExplore !== true && autoExploreError(unit) === null) {
    if (exploreTarget(state, unit) !== null) {
      return { type: 'setAutoExplore', playerId: player.id, unitId: unit.id, on: true };
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
function soldierCommand(state: GameState, player: Player, unit: Unit): Command | null {
  const blow = favourableBlow(state, player, unit);
  if (blow !== null) {
    return { type: 'attack', playerId: player.id, unitId: unit.id, target: blow };
  }
  const camp = campMarch(state, player, unit);
  if (camp !== null) {
    return { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: camp };
  }
  const home = undefendedCity(state, player, unit);
  if (home !== null) {
    return { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: home };
  }
  return standDown(unit);
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
function favourableBlow(state: GameState, player: Player, unit: Unit): { col: number; row: number } | null {
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  for (const near of mapRange(state.map, tileHex(here), unitDef(unit.type).range ?? 1)) {
    if (near.col === unit.col && near.row === unit.row) continue;
    if (!holdsWild(state, player, near)) continue;
    const preview = previewCombat(state, unit.id, { col: near.col, row: near.row });
    if (!preview.ok) continue;
    const kills = preview.defenderHp <= preview.damageToDefender;
    if (kills || preview.damageToDefender > preview.damageToAttacker) {
      return { col: near.col, row: near.row };
    }
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
 * The nearest camp inside the hunt radius that this piece can walk to, or
 * `null`.
 *
 * Marching *onto* a camp is how a camp is cleared — the arrival seam burns it
 * out (`arriveOnTile`), there is no verb for it — so this is a plain move order
 * and not an attack. Only sent while the empire's towns are held: a bot that
 * emptied its capital to chase raiders is how a bot loses a capital.
 */
function campMarch(
  state: GameState,
  player: Player,
  unit: Unit,
): { col: number; row: number } | null {
  if (!townsAreHeld(state, player)) return null;
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return null;
  const from = tileHex(here);
  const reachable: { camp: { col: number; row: number }; distance: number }[] = [];
  for (const camp of state.camps) {
    const tile = getTileAt(state.map, camp.col, camp.row);
    if (!tile) continue;
    const distance = wrappedDistance(state.map, from, tileHex(tile));
    if (distance === 0 || distance > AI.military.campHuntRadius) continue;
    reachable.push({ camp: { col: camp.col, row: camp.row }, distance });
  }
  reachable.sort((a, b) => a.distance - b.distance);
  for (const entry of reachable.slice(0, AI.search.pathProbes)) {
    const tile = getTileAt(state.map, entry.camp.col, entry.camp.row)!;
    if (findPath(state, unit, tile) !== null) return entry.camp;
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
function undefendedCity(
  state: GameState,
  player: Player,
  unit: Unit,
): { col: number; row: number } | null {
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
  for (const entry of wanted.slice(0, AI.search.pathProbes)) {
    const tile = getTileAt(state.map, entry.city.col, entry.city.row);
    if (!tile) continue;
    if (findPath(state, unit, tile) !== null) return { col: entry.city.col, row: entry.city.row };
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
function augurCommand(state: GameState, player: Player, unit: Unit): Command | null {
  if (consecrateError(state, player.id, unit.id) === null) {
    return { type: 'consecrate', playerId: player.id, unitId: unit.id };
  }
  for (const rite of RITE_IDS) {
    if (riteError(state, player.id, unit.id, rite) === null) {
      return { type: 'performRite', playerId: player.id, unitId: unit.id, rite };
    }
  }
  return standDown(unit);
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
function prophetCommand(state: GameState, player: Player, unit: Unit): Command | null {
  if (plantHolySiteError(state, player.id, unit.id) === null) {
    return { type: 'plantHolySite', playerId: player.id, unitId: unit.id };
  }
  if (gainBeliefError(state, player.id, unit.id) === null) {
    return { type: 'gainBelief', playerId: player.id, unitId: unit.id };
  }
  const step = holySiteStep(state, player, unit);
  if (step !== null) {
    return { type: 'moveUnit', playerId: player.id, unitId: unit.id, target: step };
  }
  return standDown(unit);
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
function traderCommand(state: GameState, player: Player, unit: Unit): Command | null {
  for (const from of state.cities) {
    if (from.ownerId !== player.id) continue;
    for (const to of state.cities) {
      if (to.ownerId !== player.id || to.id === from.id) continue;
      if (startRouteError(state, player.id, unit.id, from.id, to.id) !== null) continue;
      return {
        type: 'startRoute',
        playerId: player.id,
        unitId: unit.id,
        fromCityId: from.id,
        toCityId: to.id,
      };
    }
  }
  return standDown(unit);
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
