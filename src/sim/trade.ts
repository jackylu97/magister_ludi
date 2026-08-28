/**
 * Trade: caravans, roads, and the city connection (`docs/trade.md`).
 *
 * Four things live here and they are one system read from four sides — what a
 * route *is*, what it *pays*, how many an empire may run, and what the roads its
 * caravans wear into the ground are worth to keep. The verbs are in
 * `commands.ts` and the shuttle is a phase in `turn.ts`, exactly as every other
 * subsystem splits.
 *
 * The route is the piece
 * ---------------------
 * There is no `GameState.routes`. A route lives on the caravan carrying it
 * (`Unit.trade`), which is the one structural decision the design doc left open,
 * and it is settled this way because every other shape needs a rule for what
 * happens to the register when the piece dies. With the route on the piece a
 * plundered caravan is a plundered route, "how many am I running" is a count of
 * units, and nothing anywhere can hold a row pointing at a unit that is not
 * there. The cost is that a route is only ever as durable as its trader — which
 * is exactly the tension the user asked for when they said a caravan can be
 * pillaged.
 *
 * Nothing is snapshotted
 * ----------------------
 * What a route pays is derived every turn from the two cities as they stand: an
 * origin that finishes a library raises the route next turn, and either end
 * changing hands stops paying at all. `Unit.trade` carries four
 * facts and not one number. That is rule 5 read from the far end — the totals
 * are the fold of `explainRouteYield`, and there is no second ledger to keep in
 * step.
 *
 * The caravan is a route, not a piece you position
 * ------------------------------------------------
 * The user's ruling of 2026-08-28, and it replaced a verb: *"the caravan has an
 * action 'start route' and you choose from an available trade route in the trade
 * screen (from any city). Once chosen, the caravan teleports to the origin city
 * and begins the route as before. I want to remove all micromanagement of
 * units."*
 *
 * So `startRoute` names **both** cities and the trader's own position is
 * irrelevant — it may be standing in a field, in the wrong town, or halfway home
 * from a route that lapsed. The command teleports it into the origin's gates and
 * the route begins there. That is a deliberate trade of simulation for
 * ergonomics, and it is the right trade for exactly the reason the ruling gives:
 * walking a caravan to the town it should set out from is a chore with no
 * decision in it, and the decision — *which pair of towns is worth a route* —
 * was being buried under the chore.
 *
 * The consequence for the gate is that the *unit* half and the *route* half come
 * apart, so they are two functions over one implementation: `routeStartable`
 * answers everything a pair of towns can be asked on its own (the screen greys a
 * row with it before any trader is chosen) and `startRouteError` is that plus
 * the four clauses only a piece can answer. Nothing is duplicated between them.
 *
 * Internal routes only, for now
 * -----------------------------
 * A route must join two cities of the **same empire**. The doc's foreign route —
 * doubled gold, half of it to the partner — is a *deferred* half and is annotated
 * as one rather than half-built: there is no war state and no diplomacy, so
 * "trade with me" has nothing to mean yet and a foreign route would be a gift
 * with no way to refuse it. `routeStartable` refuses it in a sentence; when
 * diplomacy lands, the clause moves and `explainRouteYield` grows the two lines
 * the doc's table already names.
 *
 * The road is not owned by anybody who walks it
 * ---------------------------------------------
 * `Tile.road` carries the *builder's* seat, and it is asked exactly one question:
 * who pays the upkeep. Movement never asks (`isRoadStep` in `pathfind.ts` reads
 * presence and nothing else) — an invader uses your roads, which is Civ's rule
 * and the honest one.
 */

import {
  type BuildingCategory,
  type BuildingId,
  buildingDef,
} from './buildingData';
import {
  capitalCityOf,
  nearestOwnedCity,
  refreshCityDerived,
  settleGrowthWindfall,
  settleProductionWindfall,
  tileOwnerField,
} from './cities';
import {
  type GameMap,
  type Tile,
  getTile,
  getTileAt,
  mapNeighbors,
  tileHex,
  tileIndex,
} from './map';
import { type Cell, findPath, pathTurns } from './pathfind';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type Unit,
  cityById,
  playerById,
  unitById,
} from './state';
import {
  cardAmplifier,
  cardRouteSlots,
  payWindfallGrants,
  settleCultureWindfall,
  windfallPayout,
} from './statecraft';
import {
  UNIT_TYPE_IDS,
  type UnitTypeId,
  isCivilian,
  trades,
  unitDef,
} from './unitData';
import { fullMovement, hasStackingRoom, unitsOnTile } from './units';

const TRADE = RULES.trade;

/**
 * Which building categories pay a route in **food**, and which in **hammers**.
 *
 * The user's table, as two lists rather than as a switch: a caravan brings food
 * to a town from the places its partner *consumes* into (granaries, theatres,
 * libraries) and brings goods from the places its partner *makes* in (workshops,
 * barracks, markets). `faith` is deliberately in neither — a temple counts for
 * nothing on a trade route, which is the ruling exactly.
 *
 * Lists rather than tuning numbers because this is the shape of the rule and not
 * a figure anybody would retune; the figures (one point per building, one gold
 * per ten people) are in `data/rules.json` where figures belong.
 */
const FOOD_CATEGORIES: readonly BuildingCategory[] = ['food', 'culture', 'science'];
const PRODUCTION_CATEGORIES: readonly BuildingCategory[] = ['production', 'military', 'gold'];

// --- what a route is --------------------------------------------------------

/** Every unit of this empire currently carrying a route, in `state.units` order. */
export function tradersOf(state: GameState, playerId: number): Unit[] {
  const list: Unit[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (unit.trade === undefined) continue;
    list.push(unit);
  }
  return list;
}

/**
 * The two cities a caravan's route joins, or `null` when the route no longer
 * describes anything the board agrees with.
 *
 * **One resolution, four readers** — the yields, the shuttle, the slot count and
 * the send gate all ask this, so "a route that has stopped being a route" is one
 * answer rather than four. Both ends must still belong to the caravan's owner: a
 * destination taken by somebody else ends the route, which is the internal-only
 * rule read from the other side and the honest reading of "the partner is one of
 * yours".
 */
export function routeCities(
  state: GameState,
  unit: Unit,
): { from: City; to: City } | null {
  const route = unit.trade;
  if (!route) return null;
  const from = cityById(state, route.from);
  const to = cityById(state, route.to);
  if (!from || !to) return null;
  if (from.ownerId !== unit.ownerId || to.ownerId !== unit.ownerId) return null;
  return { from, to };
}

/**
 * Is this caravan's route still paying?
 *
 * The `TimedEffect` reading exactly (`state.turn < expiresTurn`): an absolute
 * turn, compared and never counted down. A lapsed route is **inert rather than
 * gone** — the piece keeps walking home carrying a dead route, and the shuttle
 * phase is what tidies it up when it gets there, which is the same broom-not-a-
 * clock bargain `pruneTimedEffects` makes.
 */
export function routeIsLive(state: GameState, unit: Unit): boolean {
  const route = unit.trade;
  if (!route) return false;
  if (state.turn >= route.expiresTurn) return false;
  return routeCities(state, unit) !== null;
}

/**
 * The city this caravan is walking toward on the leg it is on now.
 *
 * `null` when the route has stopped describing the board, which is the shuttle's
 * signal to end it.
 */
export function routeTarget(state: GameState, unit: Unit): City | null {
  const pair = routeCities(state, unit);
  if (!pair || !unit.trade) return null;
  return unit.trade.outbound ? pair.to : pair.from;
}

/** True when the unit is standing on this city's centre. */
export function standsIn(unit: Unit, city: City): boolean {
  return unit.col === city.col && unit.row === city.row;
}

/**
 * Ends a route now, leaving the piece where it is.
 *
 * The key is *deleted* rather than flagged, because presence is the state (see
 * `Unit.trade`): a trader that has never been sent and one whose route lapsed
 * must serialise identically. The destination is re-seated through the
 * register's own helper, because that town has just stopped receiving a
 * caravan's food and the panel it would otherwise lie to is that one
 * (`refreshCityDerived`).
 */
export function endRoute(state: GameState, unit: Unit): void {
  const route = unit.trade;
  if (!route) return;
  delete unit.trade;
  const to = cityById(state, route.to);
  if (to && to.ownerId === unit.ownerId) refreshCityDerived(state, to);
}

/**
 * One caravan's route coming home — dropped, or renewed for another leg.
 *
 * `marchTraders`' own news (`turn.ts`): a route that lapses is otherwise
 * silent — the piece is still on the board, nothing died, nothing was taken —
 * so without this the interface has no way to say "your caravan to Nippur is
 * home" or "…and it set out again." `renewed` is the whole of auto-resend read
 * as an event: the same route continuing is news exactly as the same route
 * ending is, which is why one shape covers both rather than a flag bolted on
 * after.
 *
 * Deliberately **not** raised for `cancelRoute` (`commands.ts`): that ending is
 * a command the player just issued, and a command already knows what it did.
 * This is only for the three ways `marchTraders` ends or renews a route with no
 * verb behind it.
 */
export interface RouteEndReport {
  /** The caravan carrying (or that carried) the route. */
  unitId: number;
  ownerId: number;
  /** The two ends, exactly as `TradeRoute.from`/`to` name them. */
  from: number;
  to: number;
  /** True when the caravan set out on a fresh leg instead of idling. */
  renewed: boolean;
}

// --- what a route pays ------------------------------------------------------

/**
 * One labelled line of what a route pays its **destination**.
 *
 * `CardYieldLine`'s shape minus the voices a route cannot pay: three yields,
 * because the ruling names three. A fourth would be a design decision and not a
 * field.
 */
export interface RouteYieldLine {
  /** What the interface prints: "Caravan from Uruk · 3 buildings". */
  source: string;
  food: number;
  production: number;
  gold: number;
}

/** How many of a city's buildings fall in one of these categories. */
function buildingsInCategories(
  buildings: readonly BuildingId[],
  categories: readonly BuildingCategory[],
): number {
  let count = 0;
  for (const id of buildings) {
    if (categories.includes(buildingDef(id).category)) count += 1;
  }
  return count;
}

/**
 * What one caravan's route pays, as the ordered list its totals are the fold of
 * (rule 5).
 *
 * **The origin's buildings set the figure and the destination banks it** — the
 * user's reversal of 2026-08-27 (`docs/trade.md`'s Revisions), quoted there
 * verbatim: "it is best for routes from the capital to later settles, to feed
 * the later settles." Reading the *origin's* buildings is what makes that true —
 * a well-built capital sends its own goods outward rather than harvesting
 * whatever a raw young settle happens to have standing, and a route into that
 * settle is worth sending precisely because the settle itself pays nothing yet.
 *
 * Three lines, and each is the user's table read literally, now off the
 * **origin**:
 *
 *   · **+1🌾 per food, culture or science building** standing in the origin;
 *   · **+1⚙ per production, military or gold building** there;
 *   · **+1💰 per `rules.trade.goldPerCombinedPop` people** across the two towns.
 *
 * Every figure is read off the cities *as they stand*, so an origin that
 * finishes a library raises the route the next turn — see the module docblock.
 * A lapsed route pays nothing and answers an empty list, which is what makes
 * `state.turn < expiresTurn` the whole of expiry.
 *
 * Wonders count as buildings of their own category, which is what
 * `BuildingDef.category` being on *every* row buys: the Colossus is a gold
 * building to a caravan and a `wonder` to a production bonus, and both readings
 * are true at once.
 */
export function explainRouteYield(state: GameState, unit: Unit): RouteYieldLine[] {
  if (!routeIsLive(state, unit)) return [];
  const pair = routeCities(state, unit);
  if (!pair) return [];
  return explainRouteYieldBetween(state, pair.from, pair.to);
}

/**
 * What a route *would* pay between these two cities, as they stand — the same
 * fold `explainRouteYield` answers for a caravan already carrying one, with the
 * caravan subtracted out.
 *
 * Split out so the interface's send preview stops handing `explainRouteYield` a
 * *copy* of the trader wearing a fake `Unit.trade` — a route's figures are a
 * pure function of the two cities and never needed a piece at all, which this
 * makes literal: `explainRouteYield` is now this function once it has resolved
 * the pair, so there is exactly one implementation of the three lines and the
 * preview and the paying caravan cannot drift apart on what they promise.
 *
 * `_state` is unused today — every figure here reads off `from`/`to` alone —
 * and stays on the signature anyway (underscored, so the unused-parameter
 * check does not fight it), for the reason every `explain…` function in this
 * module takes it: the day a route's yield gains a card or a wonder rider
 * (`docs/trade.md`'s deferred half), that rider is read off the state and this
 * is where it joins, not a second function with the state parameter added back.
 */
export function explainRouteYieldBetween(
  state: GameState,
  from: City,
  to: City,
): RouteYieldLine[] {
  const lines: RouteYieldLine[] = [];
  // Printed on the *destination's* sheet ("Caravan from Uruk · 3 buildings"),
  // naming the origin — the town this figure was read off, not the town
  // reading it.
  const label = (note: string): string => `Caravan from ${from.name} · ${note}`;

  const food = buildingsInCategories(from.buildings, FOOD_CATEGORIES);
  if (food > 0) {
    lines.push({
      source: label(`${food} ${food === 1 ? 'building' : 'buildings'}`),
      food,
      production: 0,
      gold: 0,
    });
  }

  const hammers = buildingsInCategories(from.buildings, PRODUCTION_CATEGORIES);
  if (hammers > 0) {
    lines.push({
      source: label(`${hammers} ${hammers === 1 ? 'building' : 'buildings'}`),
      food: 0,
      production: hammers,
      gold: 0,
    });
  }

  const people = from.population + to.population;
  const per = Math.max(1, Math.floor(TRADE.goldPerCombinedPop));
  const gold = Math.floor(people / per);
  if (gold > 0) {
    lines.push({ source: label(`${people} people`), food: 0, production: 0, gold });
  }

  // **The card's share, as a line of its own** — the Merchant League's fifty
  // percent, and rule 5 for a caravan: the amplifier does not multiply the
  // totals afterwards, it adds what it is worth to the list the totals are the
  // fold of, so the destination's sheet says where the extra food came from.
  //
  // The **origin's** owner is asked, because a route belongs to the seat that
  // sent it (`originCityOf`) and the law that pays it is that seat's law — a
  // caravan into a rival's town is not enriched by the rival's charter.
  // Percentages sum before one multiplication and each voice is floored once,
  // exactly as Entry XVII sums within a stage.
  const percent = cardAmplifier(state, from.ownerId, 'routeYields');
  if (percent !== 0) {
    const total = foldRouteYield(lines);
    const extra = {
      food: Math.floor((total.food * percent) / 100),
      production: Math.floor((total.production * percent) / 100),
      gold: Math.floor((total.gold * percent) / 100),
    };
    if (extra.food !== 0 || extra.production !== 0 || extra.gold !== 0) {
      lines.push({ source: label(`cards ${percent > 0 ? '+' : ''}${percent}%`), ...extra });
    }
  }

  return lines;
}

/** The fold of `explainRouteYield`, and the only sum of one. */
export function foldRouteYield(lines: readonly RouteYieldLine[]): {
  food: number;
  production: number;
  gold: number;
} {
  const total = { food: 0, production: 0, gold: 0 };
  for (const line of lines) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
  }
  return total;
}

/**
 * Every route line this city receives — one caravan's list after another, in
 * `state.units` order.
 *
 * A route pays its **destination** (`unit.trade.to`), so this is the filter on
 * `to` and not on `from` — a town receives the caravans sent *to* it, off
 * whatever their *origins* have built.
 *
 * Folded into `cityYields` exactly as `cardCityYields` and `cityResourceYields`
 * are, and **staged like any other flat** (Entry XVII): a route's food is a
 * per-turn yield, not a windfall, so it rides the city's percentages and the
 * empire's meters like the granary beside it. The gold rides with it and lands
 * in the treasury through the same `collectYields`, which is what "the gold joins
 * the empire's gold in the same pass" means with no second bank.
 */
export function cityRouteYields(state: GameState, city: City): RouteYieldLine[] {
  const lines: RouteYieldLine[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== city.ownerId) continue;
    if (unit.trade?.to !== city.id) continue;
    lines.push(...explainRouteYield(state, unit));
  }
  return lines;
}

// --- how many routes an empire may run --------------------------------------

/** One labelled source of route capacity. See `explainRouteSlots`. */
export interface RouteSlotLine {
  /** "Market · Uruk", or a card's own label. Printed verbatim. */
  source: string;
  /** Routes this source is worth. */
  slots: number;
}

/**
 * How many routes this empire may run at once, as the ordered list it is the
 * fold of (rule 5).
 *
 * Two sources and one number. **Buildings**, counted per building standing on
 * the board — four markets are four routes, and a captured market changes whose
 * caravans it pays for with no bookkeeping at all — and **cards**, through the
 * `routeRider` shape read where every card effect is read (`cardRouteSlots` in
 * `statecraft.ts`). The Great Lighthouse is the first rider, so the shape is
 * live rather than declared and forgotten.
 *
 * Cities are walked in `state.cities` order and each city's `buildings` in build
 * order, so the list is a fact about the state rather than about a sweep.
 */
export function explainRouteSlots(state: GameState, playerId: number): RouteSlotLine[] {
  const lines: RouteSlotLine[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const id of city.buildings) {
      const slots = buildingDef(id).routeSlots;
      if (slots === undefined || slots === 0) continue;
      lines.push({ source: `${buildingDef(id).name} · ${city.name}`, slots });
    }
  }
  for (const line of cardRouteSlots(state, playerId)) {
    lines.push({ source: line.source, slots: line.delta });
  }
  return lines;
}

/** The fold of `explainRouteSlots`. */
export function routeSlots(state: GameState, playerId: number): number {
  let total = 0;
  for (const line of explainRouteSlots(state, playerId)) total += line.slots;
  return total;
}

/**
 * How many of this empire's route slots are spoken for.
 *
 * A **count of caravans carrying a route**, lapsed ones included, and that is
 * deliberate: a trader walking home on a dead route is still on the road, and
 * freeing its slot the instant the route lapsed would let an empire keep one more
 * caravan out than it has markets for. The slot comes back when the piece gets
 * home and the shuttle drops the route — or when somebody kills it.
 */
export function usedRouteSlots(state: GameState, playerId: number): number {
  return tradersOf(state, playerId).length;
}

// --- starting a route -------------------------------------------------------

/**
 * How far a caravan may be sent to *this* partner, in turns of its own march.
 *
 * The base is `rules.trade.rangeTurns`; each **trading post** among the two
 * endpoints adds `rules.trade.postRangeTurns`. That is the user's ruling and the
 * whole of what a post is for — the first route to a town is the expensive one,
 * and every route after it reaches further.
 */
export function routeRange(from: City, to: City): number {
  const posts = (from.tradingPost === true ? 1 : 0) + (to.tradingPost === true ? 1 : 0);
  return TRADE.rangeTurns + TRADE.postRangeTurns * posts;
}

/**
 * The roster's caravan — the first row that `trades`.
 *
 * Derived off the flag rather than named, which is the discipline every marker
 * in this game keeps (`settler`, `augur`, `greatPerson`): nothing in `src/sim/`
 * compares a unit type against a string, and `test/sim/trade.test.ts` reads the
 * sources to make sure of it. `null` on a roster with no caravan at all — a
 * world where no route can be started, and the gate says so rather than
 * pretending.
 */
function caravanTypeId(): UnitTypeId | null {
  for (const id of UNIT_TYPE_IDS) {
    if (trades(unitDef(id))) return id;
  }
  return null;
}

/** An **unladen** caravan of this empire standing on this hex, or `null`. */
function idleCaravanAt(
  state: GameState,
  playerId: number,
  col: number,
  row: number,
): Unit | null {
  for (const unit of unitsOnTile(state, col, row)) {
    if (unit.ownerId !== playerId) continue;
    if (unit.trade !== undefined) continue;
    if (trades(unitDef(unit.type))) return unit;
  }
  return null;
}

/**
 * The piece standing in this town's gates that a caravan could not share the hex
 * with, or `null`.
 *
 * Stacking is per *category* (`hasStackingRoom`), so only a civilian can be in
 * the way. The exception is the load-bearing part: **an unladen caravan of the
 * asking empire is not a wall**, because it is precisely the piece a
 * `startRoute` would move — the commonest send in the game is a caravan standing
 * in the town that built it, and counting it as a blocker would grey that row
 * out. `startRouteError` re-asks the question about the *particular* piece it
 * has been handed, which is the clause that stops two caravans landing on one
 * hex.
 */
function centreBlocker(state: GameState, playerId: number, city: City): Unit | null {
  for (const unit of unitsOnTile(state, city.col, city.row)) {
    const def = unitDef(unit.type);
    if (!isCivilian(def)) continue;
    if (unit.ownerId === playerId && trades(def) && unit.trade === undefined) continue;
    return unit;
  }
  return null;
}

/**
 * A caravan that does not exist, standing in the origin's gates.
 *
 * Every distance question a route asks — is there a land road, and how many
 * turns is it — is a fact about **the two towns and the roster's caravan**, not
 * about the piece that happens to be chosen: the trader teleports to the origin
 * before it walks a step, so measuring from wherever it is standing now would be
 * measuring the wrong march. So the search is run against a probe, and both
 * gates run the same one.
 *
 * `exceptId` is whichever unladen caravan of this empire is parked in the
 * *destination's* gates, because `findPath` refuses a goal nobody could stop on
 * and `centreBlocker` has already ruled that such a caravan is not a wall — the
 * probe stands in for it. Everything else on the goal hex has been refused
 * before the search runs.
 */
function caravanProbe(
  playerId: number,
  type: UnitTypeId,
  from: City,
  exceptId: number,
): Unit {
  const def = unitDef(type);
  return {
    id: exceptId,
    ownerId: playerId,
    type,
    col: from.col,
    row: from.row,
    hp: def.maxHp,
    movesLeft: def.movement,
    hasAttacked: false,
  };
}

/**
 * Why a route could not be started between these two towns, or `null` when one
 * could — **the gate minus the piece**.
 *
 * This is what the Trade screen greys a row with before any trader has been
 * chosen, and it is the whole of what a pair of towns can be asked on its own:
 *
 *   1. both are **cities of yours**, and they are **two** cities;
 *   2. a **free slot** (`routeSlots` against `usedRouteSlots`);
 *   3. **no live route already joins the pair**, in either direction — one route
 *      per pair, so a player cannot stack four caravans on one rich partner;
 *   4. **both gates have room** for a caravan (`centreBlocker`): the origin's,
 *      because the trader appears there, and the destination's, because
 *      `findPath` refuses a goal nobody could stop on and "there is no road"
 *      would be a lie about a hex with a settler parked on it;
 *   5. a **land path exists** for the roster's caravan, priced through the very
 *      `findPath` the march will walk;
 *   6. the destination is **in range**, measured by `pathTurns` on a *full*
 *      purse — a fact about the distance between two towns, not about how much
 *      any particular caravan has left today.
 *
 * `startRouteError` is this plus the four clauses only a piece can answer, so
 * there is one implementation of all six and a greyed row and a rejected command
 * cannot disagree about why.
 */
export function routeStartable(
  state: GameState,
  playerId: number,
  fromCityId: number,
  toCityId: number,
): string | null {
  const type = caravanTypeId();
  if (!type) return 'This world has no caravans';

  const from = cityById(state, fromCityId);
  if (!from) return `No city with id ${String(fromCityId)}`;
  const to = cityById(state, toCityId);
  if (!to) return `No city with id ${String(toCityId)}`;
  if (from.ownerId !== playerId) return `${from.name} belongs to another empire`;
  if (to.id === from.id) return `A route joins two different cities`;
  if (to.ownerId !== playerId) {
    // The deferred half, said out loud rather than half-built. See the module
    // docblock: foreign routes wait on diplomacy.
    return `${to.name} belongs to another empire — foreign routes wait on diplomacy`;
  }

  const held = usedRouteSlots(state, playerId);
  const slots = routeSlots(state, playerId);
  if (held >= slots) {
    return slots === 0
      ? 'You have no trade routes — build a market'
      : `All ${slots} of your trade routes are running`;
  }

  for (const other of tradersOf(state, playerId)) {
    const route = other.trade!;
    const joins =
      (route.from === from.id && route.to === to.id) ||
      (route.from === to.id && route.to === from.id);
    if (joins && routeIsLive(state, other)) {
      return `A caravan already runs between ${from.name} and ${to.name}`;
    }
  }

  const parked = centreBlocker(state, playerId, from);
  if (parked) {
    return `A ${unitDef(parked.type).name} is standing in ${from.name}`;
  }
  const waiting = centreBlocker(state, playerId, to);
  if (waiting) {
    return `A ${unitDef(waiting.type).name} is standing in ${to.name}`;
  }

  const goal = getTileAt(state.map, to.col, to.row);
  if (!goal) return `${to.name} is off the map`;
  if (!getTileAt(state.map, from.col, from.row)) return `${from.name} is off the map`;

  const probe = caravanProbe(
    playerId,
    type,
    from,
    idleCaravanAt(state, playerId, to.col, to.row)?.id ?? -1,
  );
  const path = findPath(state, probe, goal);
  if (!path) return `No road a caravan could walk from ${from.name} to ${to.name}`;

  const range = routeRange(from, to);
  // A full purse: the range is a fact about the two towns, not about how much
  // any caravan has left today. See `pathTurns`.
  const full = fullMovement(probe, state);
  const turns = pathTurns(state, probe, path, { left: full, refill: full });
  if (turns > range) {
    return `${to.name} is ${turns} turns away; a caravan may be sent ${range}`;
  }
  return null;
}

/**
 * Why *this* caravan cannot start *this* route, or `null` when it can.
 *
 * `routeStartable` and four clauses more, in the order a player meets them: the
 * piece exists, it is **yours**, it is a **trader** (`UnitDef.trades`), and it is
 * **idle** — a caravan runs one route at a time, and a second `startRoute` would
 * silently abandon the first.
 *
 * The fifth is at the far end and is the one `routeStartable` structurally
 * cannot ask: the origin's gates must have room for **this** piece. A caravan
 * already standing there is not a blocker to itself (which is the whole reason
 * the commonest send works) and *is* a blocker to any other, and
 * `hasStackingRoom`'s `exceptId` is exactly that distinction.
 *
 * Where the trader is standing is asked nowhere at all — see the module
 * docblock. It teleports.
 */
export function startRouteError(
  state: GameState,
  playerId: number,
  unitId: number,
  fromCityId: number,
  toCityId: number,
): string | null {
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;

  const def = unitDef(unit.type);
  if (!trades(def)) return `A ${def.name} carries no trade route`;
  if (unit.trade !== undefined) return `${def.name} ${unit.id} is already carrying a route`;

  const problem = routeStartable(state, playerId, fromCityId, toCityId);
  if (problem) return problem;

  // `routeStartable` has resolved both towns, so this cannot be null.
  const from = cityById(state, fromCityId)!;
  if (!hasStackingRoom(state, from.col, from.row, def.category, unit.id)) {
    return `Another ${def.name} is standing in ${from.name}`;
  }
  return null;
}

/**
 * The city this caravan is standing in, when it is standing in one of its
 * owner's.
 *
 * No longer part of any gate — a route's origin is named by the command now, not
 * read off the board (see the module docblock) — and kept because it is still
 * the honest answer to "where is this caravan", which the interface asks when it
 * labels an idle trader.
 */
export function originCityOf(state: GameState, unit: Unit): City | null {
  for (const city of state.cities) {
    if (city.ownerId !== unit.ownerId) continue;
    if (standsIn(unit, city)) return city;
  }
  return null;
}

/**
 * Writes the route and sets the caravan walking. Validates nothing — the
 * mechanism.
 *
 * Three writes and each is a rule:
 *
 *   · **`Unit.trade`**, which *is* the route (module docblock). `expiresTurn` is
 *     absolute, so nothing ever has to tick it;
 *   · **a trading post at both ends**, permanently. History, never cleared —
 *     the range every later caravan is sent on;
 *   · **the path**, toward the destination. The send is an *order*, not a march:
 *     the pipeline walks it like any other standing order (`spendLeftoverMovement`
 *     the same turn, `resetMovement` the next), which is what keeps the walk in
 *     one place instead of two.
 *
 * The **teleport is not here**, and that is deliberate: putting a piece on a hex
 * means answering what was standing there, which is `arriveOnTile`'s job and
 * `arrival.ts` imports *this* module (`layRoadUnder`, `settleTraderPlunder`).
 * So the reducer moves the piece through the one seam and then calls this, which
 * is the same split `applyMoveUnit` makes with `advanceAlongPath`. The caravan
 * is therefore already standing in `from`'s gates when the path is found here.
 *
 * The destination is re-seated because a route that has just been opened is a
 * route whose destination is already receiving its food — the mid-turn
 * register's rule (`refreshCityDerived`), and the reason the city panel does
 * not wait for the turn to end to tell the truth.
 */
export function startRouteAt(state: GameState, unit: Unit, from: City, to: City): void {
  unit.trade = {
    from: from.id,
    to: to.id,
    expiresTurn: state.turn + Math.max(1, Math.floor(TRADE.routeTurns)),
    outbound: true,
    autoResend: false,
  };
  from.tradingPost = true;
  to.tradingPost = true;

  const goal = getTileAt(state.map, to.col, to.row);
  const path = goal ? findPath(state, unit, goal) : null;
  if (path && path.length > 0) {
    unit.path = path.map((cell) => ({ col: cell.col, row: cell.row }));
  } else {
    // The teleport already cleared whatever order the piece was under; an
    // origin that *is* the destination is refused by the gate, so this is only
    // reachable on a board that changed under a caller validating nothing.
    delete unit.path;
  }
  refreshCityDerived(state, to);
}

// --- roads, and what they connect -------------------------------------------

/**
 * How many road hexes this empire laid — the count maintenance is charged on.
 *
 * An **index sweep** over `map.tiles` rather than a walk of anything with
 * coordinates, for `tileOwnerField`'s stated reason: this runs once per empire
 * per turn over four thousand hexes, and a coordinate lookup per hex is the
 * shape that turned a forty-city resolution into a profile.
 */
export function roadsBuiltBy(state: GameState, playerId: number): number {
  let count = 0;
  for (const tile of state.map.tiles) {
    if (tile.road === playerId) count += 1;
  }
  return count;
}

/** May the connection fill cross this hex? */
function fillAdmits(
  map: GameMap,
  owner: { at(index: number): number | null },
  cityCells: ReadonlySet<number>,
  playerId: number,
  tile: Tile,
): boolean {
  const index = tileIndex(map, tile.col, tile.row);
  // Never through another seat's ground. Your own, or nobody's.
  const holder = owner.at(index);
  if (holder !== null && holder !== playerId) return false;
  // A town is a junction: the fill crosses a city centre whether or not a
  // caravan has happened to wear a road across it. That is the honest reading of
  // "connected by road" — the road ends *at* the gates — and it is what stops a
  // route's own two endpoints reading as unconnected until a caravan comes home.
  if (cityCells.has(index)) return true;
  return tile.road !== undefined;
}

/** What one connected city pays its empire. See `connectedCities`. */
export interface ConnectedCity {
  city: City;
  /** `floor(pop / rules.trade.connectionPerPop)`. */
  gold: number;
}

/**
 * Every non-capital city of this empire joined to its capital by road, with what
 * each pays.
 *
 * A **flood fill**, hoisted for one sweep and never stored — `tileOwnerField`'s
 * bargain, and for its reason: a stored connection graph would be a second thing
 * to keep in step with every road laid, every city founded and every border that
 * moved. It is a pure function of the board, so it is asked when it is wanted.
 *
 * The rules, and each is a decision:
 *
 *   · the root is `capitalCityOf` — the oldest city the empire *founded* — so a
 *     captured capital moves the graph's root with no code at all, which is the
 *     Civ rule;
 *   · the fill crosses hexes that are **this empire's or nobody's**, never
 *     another seat's: a highway through a rival's territory is a road you do not
 *     control;
 *   · a **city centre is a junction** (see `fillAdmits`), so the road has only to
 *     reach the gates;
 *   · the capital itself pays nothing — it is what the others are connected *to*.
 *
 * Neighbours come from `mapNeighbors`, so a connection may cross the east–west
 * seam exactly as a march may. Cities come back in `state.cities` order, which
 * is founding order, so the list is a fact about the state.
 */
export function connectedCities(state: GameState, playerId: number): ConnectedCity[] {
  const capital = capitalCityOf(state, playerId);
  if (!capital) return [];
  const { map } = state;

  const cityCells = new Set<number>();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    cityCells.add(tileIndex(map, city.col, city.row));
  }
  const owner = tileOwnerField(state);

  const start = getTileAt(map, capital.col, capital.row);
  if (!start) return [];
  const seen = new Uint8Array(map.tiles.length);
  const frontier: Tile[] = [start];
  seen[tileIndex(map, start.col, start.row)] = 1;
  while (frontier.length > 0) {
    const tile = frontier.pop()!;
    for (const hex of mapNeighbors(map, tileHex(tile))) {
      const next = getTile(map, hex);
      if (!next) continue;
      const index = tileIndex(map, next.col, next.row);
      if (seen[index] === 1) continue;
      if (!fillAdmits(map, owner, cityCells, playerId, next)) continue;
      seen[index] = 1;
      frontier.push(next);
    }
  }

  const per = Math.max(1, Math.floor(TRADE.connectionPerPop));
  const list: ConnectedCity[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (city.id === capital.id) continue;
    if (seen[tileIndex(map, city.col, city.row)] !== 1) continue;
    list.push({ city, gold: Math.floor(city.population / per) });
  }
  return list;
}

/** One labelled line of empire-scale trade gold. See `explainTradeGold`. */
export interface TradeGoldLine {
  /** "City connections · 4 cities", "Road maintenance · 23 hexes". */
  source: string;
  /** Signed: connections pay, maintenance costs. */
  gold: number;
}

/**
 * What trade pays this empire's treasury every turn beyond what its cities bank,
 * as the ordered list the figure is the fold of (rule 5).
 *
 * Two lines, and the shape of each is the user's ruling:
 *
 *   · **City connections**, as *one* line for the total rather than one per city
 *     ("City connections · 4 cities +11💰"). The per-city figures are still
 *     `connectedCities`' answer, for a hover that wants them — the fold is a
 *     presentation decision and the list is the truth;
 *   · **Road maintenance**, one negative line, charged only on the roads this
 *     empire's own caravans laid (`Tile.road` carries the builder's seat).
 *
 * Banked once per player by `collectYields`, after every city has collected —
 * the same seam `empireResourceYields` lands on, and for the same reason: it
 * belongs to no town.
 *
 * TODO (the user, 2026-08-27): "start adding maintenance costs to the game".
 * Roads are the first upkeep this game has ever charged; buildings and units are
 * the obvious next two, and they join this fold rather than opening a second one.
 */
export function explainTradeGold(state: GameState, playerId: number): TradeGoldLine[] {
  const lines: TradeGoldLine[] = [];

  const connected = connectedCities(state, playerId);
  let connectionGold = 0;
  for (const entry of connected) connectionGold += entry.gold;
  if (connectionGold !== 0) {
    const count = connected.length;
    lines.push({
      source: `City connections · ${count} ${count === 1 ? 'city' : 'cities'}`,
      gold: connectionGold,
    });
  }

  const roads = roadsBuiltBy(state, playerId);
  const per = Math.max(1, Math.floor(TRADE.roadsPerMaintenance));
  const upkeep = Math.floor(roads / per);
  if (upkeep > 0) {
    lines.push({ source: `Road maintenance · ${roads} hexes`, gold: -upkeep });
  }

  return lines;
}

/** The fold of `explainTradeGold`, and the only sum of one. */
export function tradeGold(state: GameState, playerId: number): number {
  let total = 0;
  for (const line of explainTradeGold(state, playerId)) total += line.gold;
  return total;
}

// --- plunder ----------------------------------------------------------------

/** What killing a laden caravan paid, for the line the interface announces it in. */
export interface TraderPlunder {
  /** The empire that lost the caravan. */
  fromOwnerId: number;
  gold: number;
  /** Food actually banked. Zero when there was nowhere to bank it. */
  food: number;
  /** Hammers actually banked. Zero for the same reason. */
  production: number;
  /** The city that received the goods, or `null` when none did. */
  cityName: string | null;
  /** The size that city grew to on the spot, or `null`. */
  grownTo: number | null;
  /** Why the goods were forfeited, or `null`. */
  warning: string | null;
}

/**
 * Pays the plunder for a caravan `playerId` has just destroyed. Validates
 * nothing — the caller has already established that the piece was a laden trader
 * and has taken it off the board; this is the mechanism.
 *
 * `settleCampBounty`'s twin one occasion over, and deliberately built from the
 * same three parts, because it is the same sentence: *this lands in the town
 * closest to where you are standing*. The gold is the occasion's own figure and
 * the riders scale it; the food and the hammers scale by the same ratio, so a
 * card that says "+50% on plundered caravans" means the caravan and not a third
 * of it (Entry XVIII.5 — a rider is part of the printed number).
 *
 * **A barbarian collects nothing.** The wild has no cities, so `nearestOwnedCity`
 * answers `null` and the goods are forfeited with the warning said out loud — the
 * camp bounty's rule exactly, and the caravan dies either way. Inventing a
 * destination would be worse than saying so.
 */
export function settleTraderPlunder(
  state: GameState,
  playerId: number,
  fromOwnerId: number,
  at: Cell,
): TraderPlunder {
  const plunder: TraderPlunder = {
    fromOwnerId,
    gold: 0,
    food: 0,
    production: 0,
    cityName: null,
    grownTo: null,
    warning: null,
  };
  const player = playerById(state, playerId);
  if (!player) return plunder;

  const bounty = TRADE.pillageBounty;
  const payout = windfallPayout(state, playerId, 'pillageTrader', bounty.gold);
  plunder.gold = payout.amount;
  player.gold += plunder.gold;

  const city = nearestOwnedCity(state, playerId, at);
  if (!city) {
    plunder.warning = 'no city to receive the goods';
    payWindfallGrants(state, player, payout, at);
    settleCultureWindfall(state, player);
    return plunder;
  }

  const scale = (figure: number): number =>
    Math.floor((figure * payout.amount) / Math.max(1, bounty.gold));
  plunder.food = scale(bounty.food);
  plunder.production = scale(bounty.production);
  city.foodBasket += plunder.food;
  city.hammerBasket += plunder.production;
  plunder.cityName = city.name;

  payWindfallGrants(state, player, payout, at);
  // Both buckets, through the register's own wrappers: a caravan's grain can
  // fill a basket and its cargo can finish a granary, and a one-time grant
  // settles the instant it lands (Entry XVIII).
  const grown = settleGrowthWindfall(state, city);
  if (grown) plunder.grownTo = grown.population;
  settleProductionWindfall(state, city);
  settleCultureWindfall(state, player);
  return plunder;
}

// --- the road a caravan lays ------------------------------------------------

/**
 * Lays road under a caravan that has come to rest on a hex, if there is none.
 *
 * Called from `arriveOnTile` and nowhere else — the one "a piece came to rest
 * here" seam — so a road is laid by *walking*, on every step of every leg,
 * whether the caravan was marching under a fresh order or under one the
 * resolution resumed. The builder's seat is written rather than a flag: see
 * `Tile.road`.
 *
 * It refuses to repave, which is what makes maintenance stable — a rival's
 * caravan walking your highway does not take over the bill.
 */
export function layRoadUnder(unit: Unit, tile: Tile): boolean {
  if (!trades(unitDef(unit.type))) return false;
  if (unit.trade === undefined) return false;
  return layRoad(tile, unit.ownerId);
}

/**
 * Writes `Tile.road`, and is the **only** thing that does.
 *
 * Two occasions reach it now — a caravan wearing a highway into the ground
 * (`layRoadUnder`, above) and The Founders' Road decreeing one between two towns
 * (`foundCityAt`, `cities.ts`) — which is exactly why the write is a function of
 * its own rather than a line in each: a road is one mark on one field, and the
 * refusal to repave is the rule that keeps maintenance stable whichever
 * occasion asks. A third way to lay a road calls this.
 */
export function layRoad(tile: Tile, ownerId: number): boolean {
  if (tile.road !== undefined) return false;
  tile.road = ownerId;
  return true;
}
