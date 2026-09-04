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

import { cityBlockaded } from './blockade';
import {
  type BuildingCategory,
  type BuildingId,
  buildingDef,
} from './buildingData';
// Furs' Æra III coin a caravan, read through the one luxury evaluator. Like
// `statecraft.ts` beside it, this module reaches `cities.ts` only *through*
// another file and only inside a function — the leaf claim in the docblock above
// is about what this file imports directly, and it still holds for `cities.ts`
// and `trade.ts` themselves.
import { resourceRouteYields } from './resourceEffects';
import { RULES } from './rulesData';
import { type City, type GameState, type Unit, cityById } from './state';
import { cardAmplifier } from './statecraft';
// The war register, and the only thing this leaf asks about diplomacy. `wars.ts`
// imports the rules, the state and the deal terms and nothing else, so asking it
// costs the leaf claim in the docblock above nothing at all. **Met-ness is not
// asked here**, deliberately: whether two empires have *met* is a gate on
// opening a route (`routeStartable`) and a screen's reading besides, while
// whether they are at *war* is a fact about whether the goods still move — a
// route must not stop paying because a scout wandered out of sight of a border.
import { atWar } from './wars';

const TRADE = RULES.trade;
const ABROAD = RULES.trade.international;

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
 * answer rather than four.
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

// --- what a route pays ------------------------------------------------------

/**
 * One labelled line of what a route pays — its **destination**
 * (`explainRouteYieldBetween`) or, when it ends abroad, the empire that
 * **sent** it (`explainRouteSenderYieldBetween`).
 *
 * `CardYieldLine`'s shape minus the one voice no route pays. It carried three
 * yields and the comment here said a fourth would be a design decision rather
 * than a field — which is exactly what happened: the international ruling of
 * 2026-09-03 pays a sender science and culture, so the two joined **together**,
 * as one decision, and faith stayed out because nothing pays it.
 *
 * A domestic line reads byte-identically to what it always did: the two new
 * voices are zero on every line the building rates and the coin produce, and
 * `foldRouteYield` sums them like any other.
 */
export interface RouteYieldLine {
  /** What the interface prints: "Caravan from Uruk · 3 buildings". */
  source: string;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
}

/** A line with the two rarely-used voices at zero — every domestic line's shape. */
function line(
  source: string,
  bag: { food?: number; production?: number; gold?: number; science?: number; culture?: number },
): RouteYieldLine {
  return {
    source,
    food: bag.food ?? 0,
    production: bag.production ?? 0,
    gold: bag.gold ?? 0,
    science: bag.science ?? 0,
    culture: bag.culture ?? 0,
  };
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
 *   · **+1🌾 per `buildingsPerFood` food, culture or science buildings**
 *     standing in the origin (2 since the 2026-09-03 nerf);
 *   · **+1⚙ per `buildingsPerProduction` production, military or gold
 *     buildings** there;
 *   · **+1💰 per `rules.trade.goldPerCombinedPop` people** across the two towns.
 *
 * Every figure is read off the cities *as they stand*, so an origin that
 * finishes a library raises the route the next turn — see the module docblock.
 * A lapsed route pays nothing and answers an empty list, which is what makes
 * `state.turn < expiresTurn` the whole of expiry.
 *
 * **A route ending abroad reads none of this** (2026-09-03): its destination
 * fold is one coin and its sender fold is a flat table, both one function down.
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
 * `state` was unused when this was split out — every figure read off `from`/`to`
 * alone — and stayed on the signature anyway, for the reason every `explain…`
 * function in this module takes it: *"the day a route's yield gains a card or a
 * wonder rider, that rider is read off the state and this is where it joins,
 * not a second function with the state parameter added back."* That day came
 * twice, and it joined here both times — the Merchant League's share, and now
 * furs' coin a caravan (`resourceRouteYields`).
 *
 * **A route ending abroad pays this town one coin and nothing else** (the
 * international ruling of 2026-09-03). None of the building rates is read: a
 * foreign library is not the sender's to harvest, and the host is not being
 * paid out of its own shelves either — it is being paid for the market. What
 * the *sender* takes is a fold of its own, `explainRouteSenderYieldBetween`,
 * because it lands in a different empire's books.
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

  if (routeIsInternational(from, to)) {
    const host = Math.floor(ABROAD.hostGold);
    if (host !== 0) lines.push(line(label('a foreign market'), { gold: host }));
    return blockaded(state, from, to, lines);
  }

  // A yield per SO-MANY buildings, floored — the 2026-09-03 nerf ("cut their
  // yields by ~half") turned the old one-per-building rule into a divisor knob
  // (`buildingsPerFood`/`buildingsPerProduction`, 2 as ruled). The line still
  // names the buildings counted, because that is the figure a player can check
  // against the origin's own sheet.
  const foodBuildings = buildingsInCategories(from.buildings, FOOD_CATEGORIES);
  const food = Math.floor(foodBuildings / Math.max(1, Math.floor(TRADE.buildingsPerFood)));
  if (food > 0) {
    lines.push(
      line(label(`${foodBuildings} ${foodBuildings === 1 ? 'building' : 'buildings'}`), { food }),
    );
  }

  const hammerBuildings = buildingsInCategories(from.buildings, PRODUCTION_CATEGORIES);
  const hammers = Math.floor(
    hammerBuildings / Math.max(1, Math.floor(TRADE.buildingsPerProduction)),
  );
  if (hammers > 0) {
    lines.push(
      line(label(`${hammerBuildings} ${hammerBuildings === 1 ? 'building' : 'buildings'}`), {
        production: hammers,
      }),
    );
  }

  const people = from.population + to.population;
  const per = Math.max(1, Math.floor(TRADE.goldPerCombinedPop));
  const gold = Math.floor(people / per);
  if (gold > 0) lines.push(line(label(`${people} people`), { gold }));

  // **The luxury's coin**, one line per paying kind and one kind per route —
  // furs' Æra III. Before the card's share on purpose: a percentage takes what
  // the flats have already reached, which is the order `explainEmpireGold` states
  // for the connections line ("the share is taken of the total the flat has
  // already reached"), and the alternative would have been the Merchant League
  // quietly declining to carry one of the goods in the cart.
  //
  // The **origin's** owner again, for `cardAmplifier`'s reason: a route belongs
  // to the seat that sent it, and a caravan into a rival's town is not enriched
  // by the rival's mines. Deliberately **domestic only** (2026-09-03): a
  // luxury's coin is a fact about what this empire's own caravans carry between
  // its own towns, and the international fold is the ruling's flat table with
  // nothing riding on it — the riders the ruling *did* name were flagged and not
  // built, and quietly adding one that was not named would be worse.
  for (const bag of resourceRouteYields(state, from.ownerId)) {
    lines.push(
      line(label(bag.source), {
        food: bag.food,
        production: bag.production,
        gold: bag.gold,
      }),
    );
  }

  amplify(state, from, lines, label);
  return blockaded(state, from, to, lines);
}

/**
 * **The card's share, as a line of its own** — the Merchant League's fifty
 * percent, and rule 5 for a caravan: the amplifier does not multiply the totals
 * afterwards, it adds what it is worth to the list the totals are the fold of,
 * so the sheet says where the extra food came from.
 *
 * The **origin's** owner is asked, because a route belongs to the seat that sent
 * it (`originCityOf`) and the law that pays it is that seat's law — a caravan
 * into a rival's town is not enriched by the rival's charter. Percentages sum
 * before one multiplication and each voice is floored once, exactly as Entry
 * XVII sums within a stage.
 *
 * One function over both folds since the international ruling, and that is the
 * whole reason it left `explainRouteYieldBetween`: an amplifier that read the
 * domestic list and not the sender's would be a law that stopped applying the
 * moment a caravan crossed a border, which no card says.
 */
function amplify(
  state: GameState,
  from: City,
  lines: RouteYieldLine[],
  label: (note: string) => string,
): void {
  const percent = cardAmplifier(state, from.ownerId, 'routeYields');
  if (percent === 0) return;
  const total = foldRouteYield(lines);
  const extra = {
    food: Math.floor((total.food * percent) / 100),
    production: Math.floor((total.production * percent) / 100),
    gold: Math.floor((total.gold * percent) / 100),
    science: Math.floor((total.science * percent) / 100),
    culture: Math.floor((total.culture * percent) / 100),
  };
  if (extra.food === 0 && extra.production === 0 && extra.gold === 0) {
    if (extra.science === 0 && extra.culture === 0) return;
  }
  lines.push(line(label(`cards ${percent > 0 ? '+' : ''}${percent}%`), extra));
}

/**
 * **The blockade, last, and it takes back everything above it.**
 *
 * A heavy hull in the mouth of either town's harbour stops the route paying —
 * the user's ruling with the naval line, and the heavy hull's whole reason to
 * be slow. Written as a **negative line** rather than an early return, which is
 * rule 5 doing the work it exists for: the sheet says *why* the caravan stopped
 * paying, on the row where the number went, instead of a total quietly becoming
 * zero and a player wondering what broke.
 *
 * Either end, because a blockade is about goods that cannot move: a hull off the
 * origin stops them leaving and one off the destination stops them arriving, and
 * there is no honest reading under which only one of those counts. It is applied
 * after the amplifier so it cancels the card's share too — a law that pays a
 * percentage of nothing pays nothing — and it is applied to the **sender's**
 * fold on the same argument: a blockaded port trades with nobody, at home or
 * abroad.
 *
 * `cityBlockaded` is the same reading `siegeField` marks the sea lane with
 * (`blockade.ts`, a leaf so this module can ask it without importing the fight),
 * so a port that is besieged from the water is a port whose caravans have
 * stopped.
 */
function blockaded(
  state: GameState,
  from: City,
  to: City,
  lines: RouteYieldLine[],
): RouteYieldLine[] {
  const cut = cityBlockaded(state, from) ? from : cityBlockaded(state, to) ? to : null;
  if (cut === null) return lines;
  const total = foldRouteYield(lines);
  const empty =
    total.food === 0 &&
    total.production === 0 &&
    total.gold === 0 &&
    total.science === 0 &&
    total.culture === 0;
  if (empty) return lines;
  lines.push(
    line(`Blockaded · ${cut.name}`, {
      food: -total.food,
      production: -total.production,
      gold: -total.gold,
      science: -total.science,
      culture: -total.culture,
    }),
  );
  return lines;
}

/**
 * What a route ending **abroad** pays the empire that sent it, as the ordered
 * list its totals are the fold of (rule 5) — empty for a route between two of
 * one empire's own towns.
 *
 * The ruling of 2026-09-03, and the whole of it: a flat +🔬 +🎭 +💰, a further
 * coin per so-many people across the two markets, and **no building lines** —
 * the reason a foreign route is worth sending is the crossing itself, not the
 * partner's shelves.
 *
 * Two lines rather than four, because two are what a player can check: the flat
 * one is the ruling's own table and the coin names the population it counted.
 * The card amplifier rides both exactly as it rides a domestic route
 * (`amplify`), and a blockade at either end takes the lot back.
 *
 * It is the **sender's** list and therefore lands in the sender's books
 * (`collectYields`, `cities.ts`), which is the one thing about an international
 * route that is not like a domestic one: a domestic route's every voice is
 * banked by the destination.
 */
export function explainRouteSenderYieldBetween(
  state: GameState,
  from: City,
  to: City,
): RouteYieldLine[] {
  if (!routeIsInternational(from, to)) return [];
  const lines: RouteYieldLine[] = [];
  // Named on the *sender's* sheet, so it names the town the caravan is walking
  // to — the mirror of the destination fold's "Caravan from Uruk".
  const label = (note: string): string => `Caravan to ${to.name} · ${note}`;

  const flat = {
    science: Math.floor(ABROAD.science),
    culture: Math.floor(ABROAD.culture),
    gold: Math.floor(ABROAD.gold),
  };
  if (flat.science !== 0 || flat.culture !== 0 || flat.gold !== 0) {
    lines.push(line(label('a foreign market'), flat));
  }

  const people = from.population + to.population;
  const per = Math.max(1, Math.floor(ABROAD.goldPerCombinedPop));
  const gold = Math.floor(people / per);
  if (gold > 0) lines.push(line(label(`${people} people`), { gold }));

  amplify(state, from, lines, label);
  return blockaded(state, from, to, lines);
}

/** `explainRouteSenderYieldBetween` for a caravan already carrying the route. */
export function explainRouteSenderYield(state: GameState, unit: Unit): RouteYieldLine[] {
  if (!routeIsLive(state, unit)) return [];
  const pair = routeCities(state, unit);
  if (!pair) return [];
  return explainRouteSenderYieldBetween(state, pair.from, pair.to);
}

/**
 * Every line this empire's **outbound foreign** routes pay it, in `state.units`
 * order — `cityRouteYields`' sibling one bank over.
 *
 * The sweep `collectYields` banks the sender's half out of. It is a per-empire
 * reading rather than a per-city one because that is where the yields land: a
 * route's science and culture belong to the seat's pools and its gold to the
 * seat's treasury, exactly as the empire-scale luxury lines beside it do. The
 * origin town is named in the line's own label, so nothing is lost by not
 * banking it there.
 */
export function senderRouteYields(state: GameState, playerId: number): RouteYieldLine[] {
  const lines: RouteYieldLine[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (unit.trade === undefined) continue;
    lines.push(...explainRouteSenderYield(state, unit));
  }
  return lines;
}

/** The fold of `explainRouteYield`, and the only sum of one. */
export function foldRouteYield(lines: readonly RouteYieldLine[]): {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
} {
  const total = { food: 0, production: 0, gold: 0, science: 0, culture: 0 };
  for (const entry of lines) {
    total.food += entry.food;
    total.production += entry.production;
    total.gold += entry.gold;
    total.science += entry.science;
    total.culture += entry.culture;
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
 * The caravan's **owner is not asked** (the international ruling of
 * 2026-09-03), and that clause going is the whole of how a host is paid: a
 * foreign caravan is exactly a caravan whose owner is not this town's, and the
 * line it brings is the host's coin. `explainRouteYield` still refuses a route
 * the board has stopped agreeing with, so a hostile caravan's route pays nobody
 * the turn war is declared.
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
    if (unit.trade?.to !== city.id) continue;
    lines.push(...explainRouteYield(state, unit));
  }
  return lines;
}
