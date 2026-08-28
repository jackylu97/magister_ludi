/**
 * Trade: caravans, and the lifecycle of the route one carries (`docs/trade.md`).
 *
 * The **verbs and the plumbing** — sending a caravan, refusing a send, the
 * slots an empire may fill, ending or renewing a route, and what plundering one
 * pays. The verbs proper are in `commands.ts` and the shuttle is a phase in
 * `turn.ts`, exactly as every other subsystem splits.
 *
 * What left, and why
 * ------------------
 * Two of this file's four sides moved out on 2026-08-28 and are **re-exported
 * from here**, so every screen keeps one import site for trade:
 *
 *   · what a route *pays* → `routeYields.ts` (with the pair resolution, which is
 *     what "this route still describes the board" means);
 *   · what the empire's treasury makes and loses beyond its towns → the roads,
 *     the connection fill and the four-line ledger → `empireGold.ts`.
 *
 * Both are **leaves that import neither `cities.ts` nor this file**, and that is
 * the whole point. `cities.ts` folds a caravan's lines into `cityYields` and
 * banks `empireGold` in `collectYields`, while this module asks `cities.ts` for
 * the nearest town and the windfall settlements — so the two largest modules in
 * the simulation imported each other at load time, which surfaced once as a
 * `tileYieldOf is not a function` at test load. The rule that replaces it is
 * asserted rather than reasoned about: `test/mapgen/moduleCycles.test.ts` loads
 * every `src/sim` module first in turn, and `test/sim/cities.test.ts` reads
 * `cities.ts` and fails if `./trade` reappears in it.
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
 * the three clauses only a piece can answer. Nothing is duplicated between them.
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

import { buildingDef } from './buildingData';
import {
  nearestOwnedCity,
  refreshCityDerived,
  settleGrowthWindfall,
  settleProductionWindfall,
} from './cities';
import { getTileAt } from './map';
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
  cardRouteSlots,
  payWindfallGrants,
  settleCultureWindfall,
  windfallPayout,
} from './statecraft';
import { type UnitTypeId, caravanTypeId, trades, unitDef } from './unitData';
import { fullMovement } from './units';
// The two halves that had to leave (2026-08-28). `cities.ts` folds a caravan's
// lines into `cityYields` and banks `empireGold` in `collectYields`, and while
// both lived here that made the two largest modules in the simulation import
// each other at load time. They now sit where neither hub can reach back —
// `routeYields.ts` and `empireGold.ts` import no city and no trade — and this
// file imports what it still uses and **re-exports the rest**, so a screen that
// reads a route and the ledger together still has one import site for trade.
import { routeCities, routeIsLive } from './routeYields';

export {
  type RouteYieldLine,
  cityRouteYields,
  explainRouteYield,
  explainRouteYieldBetween,
  foldRouteYield,
  routeCities,
  routeIsLive,
} from './routeYields';
export {
  type ConnectedCity,
  type TradeGoldLine,
  connectedCities,
  empireGold,
  explainEmpireGold,
  roadsBuiltBy,
} from './empireGold';

const TRADE = RULES.trade;

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
 * A caravan that does not exist, standing in the origin's gates.
 *
 * Every distance question a route asks — is there a land road, and how many
 * turns is it — is a fact about **the two towns and the roster's caravan**, not
 * about the piece that happens to be chosen: the trader teleports to the origin
 * before it walks a step, so measuring from wherever it is standing now would be
 * measuring the wrong march. So the search is run against a probe, and both
 * gates run the same one.
 *
 * The probe carries **no real id** (`-1`), and that is a simplification the
 * stacking ruling paid for: it used to have to impersonate whichever unladen
 * caravan was parked in the destination's gates, because `findPath` refuses a
 * goal nobody could stop on and the gate had already ruled such a caravan was
 * not a wall. Traders stack freely now (`stacksFreely`, `units.ts`), so nothing
 * of this empire's can be in a caravan's way at either end and the exclusion has
 * nothing left to exclude.
 */
function caravanProbe(playerId: number, type: UnitTypeId, from: City): Unit {
  const def = unitDef(type);
  return {
    id: -1,
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
 *   4. a **land path exists** for the roster's caravan, priced through the very
 *      `findPath` the march will walk;
 *   5. the destination is **in range**, measured by `pathTurns` on a *full*
 *      purse — a fact about the distance between two towns, not about how much
 *      any particular caravan has left today.
 *
 * There were **six**, and the one that went is the gates: "both towns have room
 * for a caravan" was a real question while a trader took the hex's one civilian
 * slot, and the user's ruling of 2026-08-28 answered it once and for all — a
 * trader is its own stacking category and any number of them share a hex, so
 * neither a settler in the gates nor a caravan already parked there can refuse a
 * route. The clause is deleted rather than left standing and always true,
 * because a gate that can never close is a gate a reader has to disprove.
 *
 * `startRouteError` is this plus the three clauses only a piece can answer, so
 * there is one implementation of all five and a greyed row and a rejected
 * command cannot disagree about why.
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

  const goal = getTileAt(state.map, to.col, to.row);
  if (!goal) return `${to.name} is off the map`;
  if (!getTileAt(state.map, from.col, from.row)) return `${from.name} is off the map`;

  const probe = caravanProbe(playerId, type, from);
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
 * `routeStartable` and three clauses more, in the order a player meets them: the
 * piece exists, it is **yours**, it is a **trader** (`UnitDef.trades`), and it is
 * **idle** — a caravan runs one route at a time, and a second `startRoute` would
 * silently abandon the first.
 *
 * There was a fourth — "the origin's gates have room for *this* piece" — and it
 * went with the gate clause in `routeStartable`, for the same reason: since the
 * stacking ruling a trader is its own category and always fits, so
 * `hasStackingRoom` could only ever have answered yes. Nothing is left that only
 * a piece can answer about *where it lands*; the three above are all about the
 * piece itself.
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

  return routeStartable(state, playerId, fromCityId, toCityId);
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
 * `arrival.ts` imports *this* module (`settleTraderPlunder`) and `roads.ts`
 * (`layRoadUnder`).
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

