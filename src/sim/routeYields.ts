/**
 * What a trade route *pays*, and the resolution of the pair it pays between.
 *
 * A **leaf on the city side**, and that is the whole reason the module exists
 * (2026-08-28). These readers used to live in `trade.ts`, which was the right
 * home for the *rule* and the wrong one for the *layering*: `trade.ts` asks
 * `cities.ts` what a town is and where the nearest one stands, and `cities.ts`
 * asked `trade.ts` back for the caravan lines `cityYields` folds — so the two
 * hubs imported each other and either could be the first module evaluated. That
 * is the cycle `roads.ts` narrowed and this file closes: nothing here imports
 * `cities.ts` or `trade.ts`, so the fold `collectYields` needs is on the far
 * side of nothing.
 *
 * Nothing about the rules changed in the move. Every figure is still read off
 * the two cities *as they stand* — an origin that finishes a library raises the
 * route next turn, and either end changing hands stops it paying at all — and
 * the totals are still the fold of `explainRouteYield` (rule 5), with no second
 * ledger to keep in step. The route still lives on the caravan carrying it
 * (`Unit.trade`); `trade.ts` still owns the verbs, the lifecycle and the slots,
 * and re-exports these names so a screen still has one import site for a route.
 *
 * The pair resolution (`routeCities`, `routeIsLive`) comes with them because it
 * is what "this route still describes the board" *means*, and the yield readers
 * are its first callers: splitting the question from the answer would have left
 * the leaf asking the hub whether it was allowed to pay.
 */

import {
  type BuildingCategory,
  type BuildingId,
  buildingDef,
} from './buildingData';
import { RULES } from './rulesData';
import { type City, type GameState, type Unit, cityById } from './state';
import { cardAmplifier } from './statecraft';

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

// --- what a route is, when it is still one ----------------------------------

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
