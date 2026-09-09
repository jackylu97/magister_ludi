/**
 * **What a trade route still is** — the pair of towns a caravan joins, whether
 * that pair still describes the board, and whether the road is still paying.
 *
 * A **leaf**, and the whole reason it is one (batch E4b). These three readers
 * lived in `routeYields.ts`, which was the right home for them until a *card*
 * needed to ask one: `CityScope`'s `routeEndsHere` (the Bank's share of the coin
 * where a caravan ends) is asked by `cityScopeAdmits` in `statecraft/evaluator.ts`,
 * and `routeYields.ts` imports the evaluator back for the lines a card puts on a
 * caravan. That is a load-time cycle between the two, of exactly the kind
 * `roads.ts`, `unitData.ts` and `empireGold.ts` exist to prevent — so the
 * question moved down to a file that imports the state and the war register and
 * nothing else, and both hubs ask it from above.
 *
 * Nothing about the rules moved with it. `routeYields.ts` re-exports all three
 * **by name** (never `export *`), so `trade.ts` and every screen still have one
 * import site for a route, and the fold's own docblock still describes the
 * resolution it performs — it simply no longer owns the words.
 */

import { offsetToAxial, wrappedDistance } from './map';
import { type City, type GameState, type TradeRoute, type Unit, cityById } from './state';
// The war register, and the only thing this leaf asks about diplomacy.
// `wars.ts` imports the rules, the state and the deal terms and nothing else.
import { atWar } from './wars';

// --- which way a route runs -------------------------------------------------

/**
 * Which way a route runs. See `trade.ts`'s last docblock section.
 *
 * Two arms and no third: a route is entirely a land route or entirely a sea
 * route, so "mixed" is not a mode that was left out — it is the thing the
 * ruling of 2026-09-03 abolished.
 *
 * **It lives in the leaf** (batch R1) for the same reason the pair resolution
 * does: `routeYields.ts` has to read the mode now — a sea route pays
 * `rules.trade.seaYieldPercent` more, as a line of its own fold — and
 * `trade.ts` imports `cities.ts`, which is the far side of the cycle
 * `routeYields.ts` exists to stay clear of. `trade.ts` re-exports all three
 * names **by name** (never `export *`), so every caller still has one import
 * site for a route.
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
 * The two cities a caravan's route joins, or `null` when the route no longer
 * describes anything the board agrees with.
 *
 * **One resolution, five readers** — the yields, the shuttle, the slot count,
 * the send gate and now a card's scope all ask this, so "a route that has
 * stopped being a route" is one answer rather than five.
 *
 * Two clauses, and they are deliberately not the same clause twice (the
 * international ruling of 2026-09-03):
 *
 *   · **the origin is still the caravan's owner's.** A route is a thing a seat
 *     *sends*, so an origin that changes hands ends it — there is nobody left
 *     whose goods these are;
 *   · **the destination is the caravan's owner's, or a foreign town at peace.**
 *     That is the whole of what "may end abroad" means here, and war is the one
 *     thing that ends it: a declaration stops the goods moving the instant it
 *     lands, and a caravan whose partner is captured by an empire this one is
 *     fighting stops paying without waiting for any broom to reach it
 *     (`cancelRoutesBetween` is the *tidying* of that, not the rule).
 *
 * Met-ness is **not** asked. Whether two empires have met gates *opening* a
 * route (`routeStartable`); a route already running must not lapse because a
 * scout walked out of sight of a border.
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
  if (from.ownerId !== unit.ownerId) return null;
  if (to.ownerId !== unit.ownerId && atWar(state, from.ownerId, to.ownerId)) return null;
  return { from, to };
}

/**
 * Does this route end in **another empire's** town?
 *
 * The one reading of "international", asked by both folds and by every screen
 * that words a route differently for it. It is a fact about the two cities as
 * they stand — a partner that changes hands changes the answer next turn, which
 * is the module's own "nothing is snapshotted" one clause further out.
 */
export function routeIsInternational(from: City, to: City): boolean {
  return from.ownerId !== to.ownerId;
}

/**
 * **How long this road is, in hexes** — the one reading of a route's length
 * (`CountKind`'s `routeLength`, Marco Polo's coin by the mile).
 *
 * The **distance between the two towns**, not the path a cart walks. A walked
 * path shortens every time somebody paves a hex, lengthens when a border closes
 * and needs an A* per caravan per turn to answer at all — so a card written on it
 * would pay a different figure every turn for the same road, and the Trade
 * screen's send preview could not promise what the route would earn. The
 * distance is a fact about the pair, is answerable before a caravan exists, and
 * is the same figure for a road running and a road being considered.
 *
 * `wrappedDistance`, so the seam of a wrapping map is not a wall — every other
 * radius in this game is measured the same way.
 *
 * In this leaf beside the pair resolution because the fold that pays it
 * (`routeYields.ts`) and the appraisal that prices it (`src/ai/value.ts`) both
 * ask, and a second copy of "how far is Uruk from Lagash" is how a caravan and
 * the bot start disagreeing about what a road is worth.
 */
export function routeHexes(state: GameState, from: City, to: City): number {
  return wrappedDistance(
    state.map,
    offsetToAxial(from.col, from.row),
    offsetToAxial(to.col, to.row),
  );
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
