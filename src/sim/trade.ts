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
 * A route may end abroad
 * ----------------------
 * The user's ruling of 2026-09-03, and it closed the deferral this docblock used
 * to state: a route had to join two cities of the **same empire**, because
 * without a war state and without diplomacy "trade with me" had nothing to mean
 * and a foreign route would have been a gift with no way to refuse it. Both
 * exist now, so the clause became two questions asked of the partner's seat —
 * **at peace**, and **met** — and nothing else about the gate changed: the
 * slots, the one-route-per-direction rule, the mode and the range are asked of a
 * foreign pair exactly as they are of an own one.
 *
 * What a foreign route *pays* is a different table read by a different clause,
 * and it is in `routeYields.ts` where every other route figure is: no building
 * lines at all, a flat science, culture and coin to the **sender**, and one coin
 * to the **host** as a line in that town's own fold. A war between the two ends
 * stops it paying the instant it is declared (`routeCities`) and the broom that
 * follows the declaration ends it properly (`cancelRoutesBetween`).
 *
 * **A caravan trades at the gates.** A foreign city hex is closed to a march and
 * always was, so a leg ending abroad ends on the partner's doorstep rather than
 * inside it — see `routeGoals`, which is the whole of that rule and the reason
 * no rule of movement, stacking or capture had to be touched to ship this.
 *
 * The road is not owned by anybody who walks it
 * ---------------------------------------------
 * `Tile.road` carries the *builder's* seat, and it is asked exactly one question:
 * who pays the upkeep. Movement never asks (`isRoadStep` in `pathfind.ts` reads
 * presence and nothing else) — an invader uses your roads, which is Civ's rule
 * and the honest one.
 *
 * A route is entirely land, or entirely sea
 * -----------------------------------------
 * The user's ruling of 2026-09-03, and it began as a bug: *"trade routes
 * shouldn't create roads over water, trade routes should stay entirely either
 * land only routes or water only routes. For the purpose of building roads, we
 * should have an option to go by sea or go by land when available."*
 *
 * A caravan's ordinary profile lets it embark, so the shortest path between two
 * towns across a bay was a march with a swim in the middle — and `layRoadUnder`
 * paved every hex it rested on, sea included. The fix is not a clause in the
 * paving; it is that **a route has a mode** (`RouteMode`), the mode is a
 * narrowing of the survey the caravan walks (`routeProfile`), and the two
 * narrowings are exhaustive:
 *
 *   · **land** — `embarks: false`, which is the profile The Founders' Road has
 *     always surveyed with (`layFoundingRoad`, `cities.ts`), for the same reason
 *     said the other way round: a road does not cross water, so a route that
 *     lays road may not either;
 *   · **sea** — confined to the water and to the route's two harbours
 *     (`MoveProfile.ports`, second reading), and it **lays no road at all**.
 *
 * The choice rides on the command (`StartRouteCommand.mode`) and then on the
 * route (`TradeRoute.sea`), because the return leg is re-pathed by a phase
 * (`marchTraders`) that has no command to read. An absent mode is resolved by
 * `surveyRoute`'s stated default: **land where a land path exists, else sea**.
 */

import { buildingDef } from './buildingData';
import {
  nearestOwnedCity,
  refreshCityDerived,
  settleGrowthWindfall,
  settleProductionWindfall,
} from './cities';
// **A function-level cycle, and the documented kind** (`statecraft.ts` ↔
// `cities.ts` is the precedent): `diplomacy.ts` imports this module for the war
// broom (`cancelRoutesBetween`) and this module asks it one question back — have
// these two empires met — inside a gate, never at load time. Nothing here reads
// a value from it while modules are being evaluated, which is the whole of the
// claim `test/mapgen/moduleCycles.test.ts` asserts by loading every module in
// `src/sim` first in turn.
import { hasMetSeat } from './diplomacy';
import { type Tile, getTileAt, tileHex, tileNeighbors, wrappedDistance } from './map';
import { type Cell, type MoveProfile, findPath, moveProfile, pathTurns } from './pathfind';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type TradeRoute,
  type Unit,
  cityById,
  playerById,
  unitById,
} from './state';
import { atWar } from './wars';
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
  explainRouteSenderYield,
  explainRouteSenderYieldBetween,
  explainRouteYield,
  explainRouteYieldBetween,
  foldRouteYield,
  routeCities,
  routeIsInternational,
  routeIsLive,
  senderRouteYields,
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
 * Ends every route running **between these two empires**, in `state.units`
 * order, and says which ones it dropped.
 *
 * The trade half of a declaration (`docs/war-diplomacy.md`, section 5: "trade
 * routes between the two empires cancel on declaration"). It goes through
 * `endRoute` rather than deleting keys itself, so the destination is re-seated
 * exactly as it is when a route lapses of its own accord and there is one
 * implementation of "this route is over".
 *
 * A route is *between* the two empires when its two ends are held one by each,
 * **read as the board stands now** rather than as it stood when the caravan set
 * out. It was written for the pair rather than for the one story that could fire
 * when it was written — a route came to span two empires only by an end
 * *changing hands* — and the international ruling of 2026-09-03 needed no second
 * rule because of it: a route sent abroad at peace is ended by this same sweep
 * the turn the peace ends. `routeCities` stops it *paying* on the same
 * declaration, so the broom is the tidying rather than the rule.
 *
 * An end whose city has vanished is left alone: a route describing a city that
 * is not there is `marchTraders`' to drop, and dropping it here would be a
 * second answer to a question that already has one.
 */
export function cancelRoutesBetween(
  state: GameState,
  x: number,
  y: number,
): RouteEndReport[] {
  const dropped: RouteEndReport[] = [];
  if (x === y) return dropped;
  for (const unit of state.units) {
    const route = unit.trade;
    if (route === undefined) continue;
    // `cityById` rather than `routeCities`, deliberately: that reader refuses a
    // pair whose two ends are not both the caravan's owner's — it is the
    // *yield* question, and a route spanning two empires pays nobody — which is
    // precisely the shape this function is looking for.
    const from = cityById(state, route.from);
    const to = cityById(state, route.to);
    if (!from || !to) continue;
    const spans =
      (from.ownerId === x && to.ownerId === y) || (from.ownerId === y && to.ownerId === x);
    if (!spans) continue;
    dropped.push({
      unitId: unit.id,
      ownerId: unit.ownerId,
      from: route.from,
      to: route.to,
      renewed: false,
    });
    endRoute(state, unit);
  }
  return dropped;
}

/**
 * Every route with an end in this city, ended — the razing half of the same
 * rule, and `cancelRoutesBetween`'s sibling.
 *
 * A town that is pulled down stops being an end of anything, and the caravan
 * walking to it has nowhere to arrive. It is a separate function rather than a
 * clause because the question is about *one city* rather than about a pair, and
 * folding them would mean passing a city id where a player id goes.
 */
export function cancelRoutesAt(state: GameState, cityId: number): RouteEndReport[] {
  const dropped: RouteEndReport[] = [];
  for (const unit of state.units) {
    const route = unit.trade;
    if (route === undefined) continue;
    if (route.from !== cityId && route.to !== cityId) continue;
    dropped.push({
      unitId: unit.id,
      ownerId: unit.ownerId,
      from: route.from,
      to: route.to,
      renewed: false,
    });
    endRoute(state, unit);
  }
  return dropped;
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

// --- land or sea ------------------------------------------------------------

/**
 * Which way a route runs. See the module docblock's last section.
 *
 * Two arms and no third: a route is entirely a land route or entirely a sea
 * route, so "mixed" is not a mode that was left out — it is the thing the
 * ruling abolished.
 */
export type RouteMode = 'land' | 'sea';

/**
 * Both modes, in **the order every choice is resolved in** — an array, never a
 * set, because the order is an outcome (see the default in `surveyRoute`, and
 * `routeModesAvailable`, whose result the interface draws left to right).
 */
export const ROUTE_MODES: readonly RouteMode[] = ['land', 'sea'];

/**
 * Which way this route runs, read off the route itself.
 *
 * `TradeRoute.sea` is presence-is-state and its absent half is land, so this is
 * the one place the two vocabularies meet and nothing else compares the field
 * against a boolean.
 */
export function routeMode(route: TradeRoute): RouteMode {
  return route.sea === true ? 'sea' : 'land';
}

/**
 * The movement profile a caravan surveys and walks **one mode's** route with.
 *
 * A **narrowing** of the piece's own profile in both arms, which is the safety
 * argument `findPath`'s `mover` parameter already states: an override that
 * widened what a mover may do would path a piece somewhere it cannot go, while
 * one that narrows can only ever refuse a route the piece could have walked.
 * Both arms here narrow, so the walk the pipeline commits (`advanceAlongPath`,
 * which prices with the piece's *full* profile) can never be stopped by ground
 * the survey admitted.
 *
 *   · **land** drops embarkation. Every hex of the path is dry, so
 *     `layRoadUnder` pavings a caravan makes are all on land by construction —
 *     the bug's actual fix, and it is a fact about the *path* rather than a
 *     clause in the writer.
 *   · **sea** hands the mover its two harbours as `MoveProfile.ports` and
 *     nothing else, so every dry hex on the map but the route's own two ends is
 *     impassable to it. It keeps the piece's own `embarks`, which is the whole
 *     of why a sea route needs Sailing: an empire that cannot put a caravan on
 *     the water has no sea path to be offered.
 *
 * The harbour set is built from the two cities in the order they are named and
 * is only ever asked `.has`, so nothing about an outcome depends on it.
 */
export function routeProfile(
  state: GameState,
  unit: Unit,
  mode: RouteMode,
  from: City,
  to: City,
): MoveProfile {
  const base = moveProfile(state, unit);
  if (mode === 'land') return { ...base, embarks: false };
  const harbours = new Set<Tile>();
  const start = getTileAt(state.map, from.col, from.row);
  if (start) harbours.add(start);
  const goal = getTileAt(state.map, to.col, to.row);
  if (goal) harbours.add(goal);
  return { ...base, ports: harbours };
}

/**
 * Where a leg of this route actually **ends on the board** — the partner's own
 * centre at home, and its *doorstep* abroad.
 *
 * **A caravan trades at the gates** (the international ruling of 2026-09-03,
 * and the one thing about it the ruling did not have to say because the
 * movement rules already had). A foreign city hex is closed to a march —
 * `canTransit` refuses it outright so that no ordinary walk can make a town
 * uncapturable, and the garrison standing in it refuses the hex besides — so a
 * route ending abroad cannot end *inside* the partner. It ends one hex out:
 * the caravan lays its road up to the gates, the goods go in without the cart,
 * and not one rule of movement, stacking, capture or arrival had to be bent to
 * let a foreign piece stand where a foreign piece may not stand.
 *
 * The candidates are the partner's six neighbours ordered by **how near they
 * are to the origin**, then by column and row — a fact about the two towns, so
 * two players' boards resolve the same doorstep, and the near side of a town is
 * the side a caravan would come at anyway. `surveyRoute` walks them in this
 * order and takes the first that has a path, which is at most six searches and
 * in practice one.
 *
 * A leg toward a town of the **mover's own** empire is one candidate, unchanged:
 * the centre itself. It is keyed on the mover rather than on the pair because
 * both legs ask this — the way out ends abroad and the way home ends at home,
 * and a rule written as "the two ends differ" would send a caravan to its own
 * doorstep on the return.
 */
function routeGoals(state: GameState, mover: Unit, from: City, to: City): Tile[] {
  const centre = getTileAt(state.map, to.col, to.row);
  if (!centre) return [];
  if (to.ownerId === mover.ownerId) return [centre];
  const origin = getTileAt(state.map, from.col, from.row);
  const doorsteps = tileNeighbors(state.map, centre).map((tile) => ({
    tile,
    away:
      origin === undefined
        ? 0
        : wrappedDistance(state.map, tileHex(origin), tileHex(tile)),
  }));
  doorsteps.sort(
    (a, b) => a.away - b.away || a.tile.col - b.tile.col || a.tile.row - b.tile.row,
  );
  return doorsteps.map((entry) => entry.tile);
}

/**
 * Has this caravan finished the leg it is on — standing in the town it was
 * walking to, or on its doorstep when the town is not its owner's.
 *
 * `standsIn` is still the whole of the answer at home, and `routeGoals` is why
 * there is a second half: an international leg ends on the gates rather than
 * inside them, so "arrived" has to be asked the same way the path was found or
 * a caravan would walk to the doorstep and stand there for ever waiting to be
 * somewhere it may not be.
 *
 * Adjacency is read off the map's own neighbours rather than a distance, so a
 * wrapped board answers this exactly as `findPath` walked it.
 */
export function routeArrived(state: GameState, unit: Unit, target: City): boolean {
  if (standsIn(unit, target)) return true;
  if (target.ownerId === unit.ownerId) return false;
  const centre = getTileAt(state.map, target.col, target.row);
  if (!centre) return false;
  for (const tile of tileNeighbors(state.map, centre)) {
    if (tile.col === unit.col && tile.row === unit.row) return true;
  }
  return false;
}

/**
 * The path one leg of a live route walks, in the route's own mode — the send's
 * first leg and every leg the shuttle re-paths afterwards.
 *
 * `surveyRoute`'s mechanism with the mode already settled, and it exists so
 * that the **goal** is resolved in one place: a leg abroad ends on the
 * doorstep (`routeGoals`), and a shuttle that found its own goal would walk a
 * caravan at a hex the gate never priced.
 */
export function routeLegPath(
  state: GameState,
  unit: Unit,
  from: City,
  to: City,
  mode: RouteMode,
): Cell[] | null {
  const profile = routeProfile(state, unit, mode, from, to);
  for (const goal of routeGoals(state, unit, from, to)) {
    const path = findPath(state, unit, goal, profile);
    if (path !== null) return path;
  }
  return null;
}

/** What one survey found: the mode a send would run in, and the path it walks. */
export interface RouteSurvey {
  /** The mode settled on — the one asked for, or the default's answer. */
  mode: RouteMode;
  /** The path that mode would walk, or `null` when it has none. */
  path: Cell[] | null;
}

/**
 * The **one** resolution of "which way does this route run, and can it".
 *
 * The gate and the reducer both go through it, so a greyed row, a refused
 * command and the path a caravan is actually set walking cannot disagree about
 * a mode — `routeStartable`'s own argument one field over.
 *
 * **The default, when the command names no mode: land where a land path exists,
 * else sea.** It is stated as a fact about the *path* rather than about
 * legality, deliberately: a rule that fell through to sea whenever land was
 * merely *out of range* would make the mode of a route depend on a number, and
 * a player reading a log would have to price the march to know what happened.
 * The interface names the mode explicitly on every send, so the default is what
 * an old save, a hand-written command and the bot's fallback resolve to — see
 * `bestRouteMode`, which asks the question the other way round.
 *
 * A pair with no path either way reports **land**, so the refusal above reads in
 * the plain voice a landlocked world deserves.
 */
export function surveyRoute(
  state: GameState,
  probe: Unit,
  from: City,
  to: City,
  mode?: RouteMode,
): RouteSurvey {
  // The centre at home, the doorsteps abroad, in the order `routeGoals` states —
  // through `routeLegPath`, so the survey, the send and the shuttle all aim at
  // the same hex.
  const walk = (which: RouteMode): Cell[] | null => routeLegPath(state, probe, from, to, which);
  if (mode !== undefined) return { mode, path: walk(mode) };
  const land = walk('land');
  if (land !== null) return { mode: 'land', path: land };
  const sea = walk('sea');
  return sea === null ? { mode: 'land', path: null } : { mode: 'sea', path: sea };
}

/**
 * The mode a `startRoute` naming `mode` (or naming none) will actually run in.
 *
 * The reducer's reading, asked **after** `startRouteError` has passed: the gate
 * settled the question already, and this asks it again rather than threading a
 * second return value through a function whose whole contract is "a sentence or
 * `null`". It is the same survey against the same probe, so it is the same
 * answer.
 */
export function routeModeFor(
  state: GameState,
  playerId: number,
  fromCityId: number,
  toCityId: number,
  mode?: RouteMode,
): RouteMode {
  if (mode !== undefined) return mode;
  const type = caravanTypeId();
  const from = cityById(state, fromCityId);
  const to = cityById(state, toCityId);
  if (!type || !from || !to) return 'land';
  return surveyRoute(state, caravanProbe(playerId, type, from), from, to, undefined).mode;
}

/**
 * The modes this pair of towns could actually be joined by, in `ROUTE_MODES`
 * order — what the Trade screen offers as buttons.
 *
 * Each arm is the **whole** gate asked of that mode (`routeStartable`), never a
 * path test on its own: a mode is on offer exactly when the command naming it
 * would be accepted, so a button the screen draws is a button that works. Two
 * entries means a real choice; one means today's single Start; none means the
 * row is refused, and the sentence to print is `routeStartable`'s own.
 */
export function routeModesAvailable(
  state: GameState,
  playerId: number,
  fromCityId: number,
  toCityId: number,
): RouteMode[] {
  const modes: RouteMode[] = [];
  for (const mode of ROUTE_MODES) {
    if (routeStartable(state, playerId, fromCityId, toCityId, mode) === null) modes.push(mode);
  }
  return modes;
}

/**
 * The mode this caravan should be sent on, or `null` when neither works — the
 * bot's reading, and `routeModesAvailable`'s single-answer twin.
 *
 * First in `ROUTE_MODES` order, so a land route is preferred wherever one is
 * legal: the road it wears is worth something to the empire afterwards and a
 * sea lane leaves nothing behind. It asks `startRouteError` rather than
 * `routeStartable` because the bot has a piece in hand.
 */
export function bestRouteMode(
  state: GameState,
  playerId: number,
  unitId: number,
  fromCityId: number,
  toCityId: number,
): RouteMode | null {
  for (const mode of ROUTE_MODES) {
    if (startRouteError(state, playerId, unitId, fromCityId, toCityId, mode) === null) return mode;
  }
  return null;
}

/**
 * Why a route could not be started between these two towns, or `null` when one
 * could — **the gate minus the piece**.
 *
 * This is what the Trade screen greys a row with before any trader has been
 * chosen, and it is the whole of what a pair of towns can be asked on its own:
 *
 *   1. the origin is **a city of yours**, the destination is **another city** —
 *      yours, or a **foreign** one whose empire you are **at peace with** and
 *      have **met** (the international ruling of 2026-09-03);
 *   2. a **free slot** (`routeSlots` against `usedRouteSlots`);
 *   3. **no live route already runs this way** — same origin, same
 *      destination; the reverse leg is its own route (ruled 2026-09-03), so a
 *      pair carries at most two caravans, one each way;
 *   4. a path exists **in the mode asked for** for the roster's caravan, priced
 *      through the very `findPath` the march will walk — `surveyRoute` resolves
 *      an absent `mode` to land-or-sea by its documented default, so a caller
 *      that names nothing still gets one honest answer rather than a survey of
 *      ground no caravan will actually cross;
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
  mode?: RouteMode,
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
    // **The foreign half, and it is two questions** (the international ruling of
    // 2026-09-03, `docs/trade.md`). War first, because a seat at war has
    // necessarily met the seat it is fighting, so asking the other way round
    // would answer a declaration with "you have not met them". There is no
    // open-borders clause: a caravan passes freely by the standing war ruling,
    // and the ruling says so out loud.
    const them = playerById(state, to.ownerId);
    const name = them?.name ?? 'them';
    if (atWar(state, playerId, to.ownerId)) return `You are at war with ${name}`;
    if (!hasMetSeat(state, playerId, to.ownerId)) return `You have not met ${name}`;
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
    // Same origin AND same destination — the reverse leg is its own route
    // (the user's ruling of 2026-09-03: Brightwater→Aldermarch must not
    // preclude Aldermarch→Brightwater). The either-direction reading this
    // replaces existed to stop caravans stacking on one rich partner; the
    // directional gate keeps the pair to two, one each way, which is the
    // stacking the ruling accepts.
    const joins = route.from === from.id && route.to === to.id;
    if (joins && routeIsLive(state, other)) {
      return `A caravan already runs from ${from.name} to ${to.name}`;
    }
  }

  const goal = getTileAt(state.map, to.col, to.row);
  if (!goal) return `${to.name} is off the map`;
  if (!getTileAt(state.map, from.col, from.row)) return `${from.name} is off the map`;

  const probe = caravanProbe(playerId, type, from);
  // One survey, and the mode it settled on is what the refusal is *about*: a
  // player who asked for the sea is told about the sea, and a caller who named
  // nothing is told about the ground the default actually chose.
  const survey = surveyRoute(state, probe, from, to, mode);
  const { path } = survey;
  if (!path) {
    return survey.mode === 'sea'
      ? `No sea lane a caravan could sail from ${from.name} to ${to.name}`
      : `No road a caravan could walk from ${from.name} to ${to.name}`;
  }

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
  mode?: RouteMode,
): string | null {
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;

  const def = unitDef(unit.type);
  if (!trades(def)) return `A ${def.name} carries no trade route`;
  if (unit.trade !== undefined) return `${def.name} ${unit.id} is already carrying a route`;

  return routeStartable(state, playerId, fromCityId, toCityId, mode);
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
 *
 * **The mode is written before the path is found**, and both are the caller's
 * settled answer rather than this function's guess: `applyStartRoute` resolves
 * it through `routeModeFor` off the very survey the gate passed, so the route
 * the piece carries and the ground it is aimed across are one decision. A land
 * route writes no `sea` key at all — presence is the state.
 */
export function startRouteAt(
  state: GameState,
  unit: Unit,
  from: City,
  to: City,
  mode: RouteMode,
): void {
  unit.trade = {
    from: from.id,
    to: to.id,
    expiresTurn: state.turn + Math.max(1, Math.floor(TRADE.routeTurns)),
    outbound: true,
    autoResend: false,
    ...(mode === 'sea' ? { sea: true as const } : {}),
  };
  from.tradingPost = true;
  to.tradingPost = true;

  // Through the one goal resolution (`routeLegPath`): a route abroad is walked
  // to the partner's doorstep, which is the hex the gate priced the range on.
  const path = routeLegPath(state, unit, from, to, mode);
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

