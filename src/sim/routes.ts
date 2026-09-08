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

import { type City, type GameState, type Unit, cityById } from './state';
// The war register, and the only thing this leaf asks about diplomacy.
// `wars.ts` imports the rules, the state and the deal terms and nothing else.
import { atWar } from './wars';

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
