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

import { cityBlockaded } from './blockade';
import { offsetToAxial, wrappedDistance } from './map';
import { RULES } from './rulesData';
import {
  type City,
  type CommercialPost,
  type GameState,
  type TradeRoute,
  type Unit,
  cityById,
} from './state';
// The war register, and the only thing this leaf asks about diplomacy.
// `wars.ts` imports the rules, the state and the deal terms and nothing else.
import { atWar } from './wars';
import { leaderDef } from './leaderData';
import { type UnitTypeId, caravanTypeId, trades, unitDef } from './unitData';

/**
 * **Which caravan this seat sends** — its figure's own, or the roster's.
 *
 * `caravanTypeId` (`unitData.ts`) answers the roster's question: which row
 * `trades`. It walks the union and takes the first, which was the whole of the
 * answer while exactly one row traded. A figure may now name a trader of its own
 * (Ibn Battuta's Rihla caravan), and a unique nobody can be *given* is a unique
 * nobody has — so the question a verb actually wants is this one: which trader
 * does *this empire* send.
 *
 * The figure's row wins where the figure has one, and the roster's is the
 * fallback for every other seat. Markers, never names: the sheet says which row,
 * and `trades` says whether it is a caravan at all — so a figure whose unique is
 * a soldier falls through here exactly as a figure with no unique would.
 *
 * **A leaf, and it has to be.** `trade.ts`, `purchase.ts`, `cities.ts` and the
 * reducer all ask this, and `cities.ts` may never import `trade.ts` (the pinned
 * rule). `leaderData.ts` and `unitData.ts` are both leaves themselves, so the
 * edges cost nothing.
 */
export function caravanTypeFor(state: GameState, playerId: number): UnitTypeId | null {
  const leader = state.players[playerId]?.leader;
  if (leader !== undefined) {
    const own = leaderDef(leader).unit;
    if (trades(unitDef(own))) return own;
  }
  return caravanTypeId();
}

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
 * The two towns of a route that is **still active**, or `null`.
 *
 * `routeIsLive` and `routeCities` asked as one question, because every caller
 * that cares whether a route is still running also wants to know which pair it
 * joins — and two calls resolve the same two cities twice. The expiry is the
 * `TimedEffect` reading exactly (`state.turn < expiresTurn`): an absolute turn,
 * compared and never counted down.
 */
export function liveRouteCities(
  state: GameState,
  unit: Unit,
): { from: City; to: City } | null {
  const route = unit.trade;
  if (!route) return null;
  if (state.turn >= route.expiresTurn) return null;
  return routeCities(state, unit);
}

/**
 * Is this caravan's route still active?
 *
 * The one test, and there is no second one. A lapsed route is **inert rather
 * than gone** — the piece keeps walking home carrying a dead route, and the
 * shuttle phase is what tidies it up when it gets there, which is the same
 * broom-not-a-clock bargain `pruneTimedEffects` makes — so "active" is the
 * whole of the question. Two Commerce cards say "paying" in their text; the
 * user ruled on 2026-09-19 that the word is decorative and means active, so
 * nothing here tests anything else.
 */
export function routeIsLive(state: GameState, unit: Unit): boolean {
  return liveRouteCities(state, unit) !== null;
}

/** Which way a route runs, seen from one town. See `countRoutesAt`. */
export type RouteEnd = 'arriving' | 'departing';

/**
 * Whose town the far end of a route belongs to — `routeIsInternational` said as
 * a narrowing a card can carry.
 *
 * The same two words `CardPaysEffect.crossing` and `CityScope`'s
 * `routeEndsHere` already use, named here so the leaf that answers the question
 * owns the vocabulary and the card table imports it rather than respelling it.
 */
export type RouteCrossing = 'domestic' | 'international';

/**
 * **How many active routes meet this town**, by which way they run and whose
 * town is at the other end.
 *
 * The one walk behind every route question a *town* is asked. `Unit.trade` is
 * the route and there is no register, so the only way to answer is to walk the
 * pieces; putting that walk here rather than in the card evaluator is what keeps
 * the predicate ("does one end here") and the tally ("how many set out from
 * here") from becoming two readings that can disagree. The scope
 * `routeEndsHere` is this function compared against a threshold, and the count
 * `foreignTradeRoutes` narrowed to a town is this function with the other
 * direction.
 *
 * **Nobody asks who sent it**, and nobody needs to. A route departing a town is
 * that town's owner's by construction (`routeCities` drops a route whose origin
 * has changed hands), and a domestic route arriving at your town started in
 * another of your towns. So "your outgoing routes" and "outgoing routes" name
 * the same set, and a foreign caravan in your market is still counted the way
 * `routeEndsHere` has always counted it.
 *
 * The cheap test is first: the id comparison rejects almost every piece on the
 * board before the pair resolution, which is the part that walks the city list.
 */
export function countRoutesAt(
  state: GameState,
  city: City,
  end: RouteEnd,
  crossing?: RouteCrossing,
  /**
   * **What the town at the other end has to be** — `CityScope`'s
   * `routeEndsHere.farEnd`, The Grain Exchange's granary (batch C8).
   *
   * A predicate handed down rather than a scope, because answering a scope means
   * the card evaluator and this file is a leaf that may not import it. The same
   * shape `combat.ts` hands a presser down to the windfall riders: the caller
   * owns the vocabulary, this owns the walk.
   *
   * Absent counts every route the other narrowings admit, which is what every
   * caller written before it meant. Asked last, after the two cheap tests, so a
   * board with no such card pays nothing for it.
   */
  farEndAdmits?: (other: City) => boolean,
): number {
  let total = 0;
  for (const unit of state.units) {
    const route = unit.trade;
    if (route === undefined) continue;
    if ((end === 'arriving' ? route.to : route.from) !== city.id) continue;
    const pair = liveRouteCities(state, unit);
    if (pair === null) continue;
    if (
      crossing !== undefined &&
      routeIsInternational(pair.from, pair.to) !== (crossing === 'international')
    ) {
      continue;
    }
    // The far end is the *other* town of the pair, which is the one this walk
    // did not match on: routes arriving here came from `from`, routes leaving
    // here are going to `to`.
    if (farEndAdmits !== undefined && !farEndAdmits(end === 'arriving' ? pair.from : pair.to)) {
      continue;
    }
    total += 1;
  }
  return total;
}

/**
 * **How many turns this road has been running**, or `undefined` for a route with
 * no start date (batch D2d, the age stamp).
 *
 * `routeIsLive`'s reading of the other absolute stamp on the same shape:
 * `TradeRoute.startedTurn` is written once when the route opens and never
 * rewritten by a renewal, so this is one subtraction and **nothing ticks**.
 * `undefined` rather than zero for a route with no stamp — a hand-built fixture,
 * a scenario — so a card that names a term reads "cannot be shown to have run
 * long enough" rather than "new".
 *
 * Here rather than beside the field because this is the leaf both the yield fold
 * and anything else that ever asks can see, exactly as the pair resolution is.
 */
export function routeAge(state: GameState, route: TradeRoute): number | undefined {
  if (route.startedTurn === undefined) return undefined;
  return state.turn - route.startedTurn;
}

// --- commercial posts -------------------------------------------------------

/**
 * How long an empire must trade with a town before its post is established —
 * one full route term (`rules.trade.routeTurns`, twenty).
 *
 * The design's own words are *"completes a normal twenty-turn term"*, so this
 * reads the term itself rather than a knob of its own. Deliberately the **base**
 * term and not `routeTermFor`, which is the empire's term with its cards on it:
 * a card that lets your trade routes run longer would otherwise make your houses take
 * longer to establish, which is the opposite of what it says.
 */
export function postTermTurns(): number {
  return Math.max(1, Math.floor(RULES.trade.routeTurns));
}

/**
 * When this empire's unbroken trading presence in this town began, or
 * `undefined` if it has none.
 *
 * The raw record. Every other question about a post is asked through one of the
 * two readers below; this is here for the writers in `trade.ts` and for a test
 * that wants to see the date.
 */
export function postSince(city: City, playerId: number): number | undefined {
  return city.posts?.find((post) => post.by === playerId)?.since;
}

/**
 * **Does this empire hold an established commercial post in this town?**
 *
 * The record plus the term, and nothing else — not who owns the town, not
 * whether the two empires are fighting, not whether the harbour is shut. That is
 * deliberate and it is the sentence Entrenched Interests prints: *"going to war
 * does not remove these posts"*. A post is a building that happened to be built;
 * war does not unbuild it.
 *
 * Whether a post still *pays* is the other question, and `cityPostPays` is where
 * it is asked. Keeping the two apart is what lets one card read the footprint
 * and five others read the income without either having to know about the other.
 */
export function cityHoldsPost(state: GameState, city: City, playerId: number): boolean {
  const since = postSince(city, playerId);
  if (since === undefined) return false;
  return state.turn - since >= postTermTurns();
}

/**
 * **Is this empire's post in this town paying it today?**
 *
 * `cityHoldsPost` and the design's two suspensions, stated once here so that no
 * card has to carry them: *"foreign post income and card range privileges are
 * suspended during war or while the host city is blockaded"*
 * (`docs/six-decks-first-cut.md`). Neither suspension touches the record, so a
 * war that ends restores the income the turn peace is signed and a blockade
 * lifted does the same — which is what "suspended" means rather than "lost".
 *
 * Both clauses are asked of the **host**, so they are free on a post in one of
 * your own towns: nobody is at war with themselves, and a blockade of your own
 * port already stops its routes paying one fold over.
 */
export function cityPostPays(state: GameState, city: City, playerId: number): boolean {
  if (!cityHoldsPost(state, city, playerId)) return false;
  if (atWar(state, playerId, city.ownerId)) return false;
  return !cityBlockaded(state, city);
}

/**
 * **Does this post become established on the turn that is resolving?**
 * (Commerce batch T3, The Fondaci.)
 *
 * `cityHoldsPost` asks whether the term has passed, and this asks whether it
 * passes on this very turn: the turn on which `cityHoldsPost` first says yes.
 * It is a comparison of two absolute turns, so nothing ticks and nothing is
 * stored. It is true on one turn only for each record, because `since` never
 * moves once a post is established. The sweep that pays the moment
 * (`runPostEstablishments`, `trade.ts`) runs once a turn and asks this of
 * every record.
 */
export function postEstablishedThisTurn(state: GameState, post: CommercialPost): boolean {
  return state.turn - post.since === postTermTurns();
}

/**
 * How many **foreign** towns hold this empire's paying post — `CountKind`'s
 * `postCities` narrowed the way every card that asks wants it.
 *
 * Over `state.cities` in array order, which is a walk and not a lookup because a
 * post lives on the town and there is no register keyed the other way. The same
 * bargain `countRoutesAt` makes one function up: one walk behind every question,
 * rather than a second index that can fall out of step with the first.
 */
export function foreignPostCities(state: GameState, playerId: number): number {
  let total = 0;
  for (const city of state.cities) {
    if (city.ownerId === playerId) continue;
    if (cityPostPays(state, city, playerId)) total += 1;
  }
  return total;
}
