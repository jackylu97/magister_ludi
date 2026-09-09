/**
 * What a trade route *pays*, and the resolution of the pair it pays between.
 *
 * A **leaf on the city side**, and that is the whole reason the module exists
 * (2026-08-28). These readers used to live in `trade.ts`, which was the right
 * home for the *rule* and the wrong one for the *layering*: `trade.ts` asks
 * `cities.ts` what a town is and where the nearest one stands, and `cities.ts`
 * asked `trade.ts` back for the caravan lines `foldCity` folds — so the two
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
 * The pair resolution (`routeCities`, `routeIsLive`) came with them because it
 * is what "this route still describes the board" *means*, and the yield readers
 * are its first callers. It has since moved **one file further down**
 * (`routes.ts`, batch E4b) and is re-exported from here by name: a card's scope
 * needs to ask whether a route ends in a town (`routeEndsHere`), the evaluator
 * that answers it is a file this one imports, and a leaf is where a question two
 * hubs ask has to live. Every caller still has one import site for a route.
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
import { endpointLuxuryCount, resourceRouteYields } from './resourceEffects';
import { RULES } from './rulesData';
import {
  type RouteMode,
  routeCities,
  routeHexes,
  routeIsInternational,
  routeIsLive,
  routeMode,
} from './routes';
import type { City, GameState, Unit } from './state';
import { cardAmplifier, cardRouteShareLines, cardRouteYieldLines } from './statecraft';

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
 * The pair resolution, re-exported **by name** from the leaf that now owns it
 * (`routes.ts` — a star re-export comes out empty in a cycle). One import site
 * for a route, exactly as `trade.ts` re-exports these onward for the screens.
 */
export {
  type RouteMode,
  ROUTE_MODES,
  routeCities,
  routeHexes,
  routeIsInternational,
  routeIsLive,
  routeMode,
} from './routes';

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
  // **The mode is read off the piece's own route** (batch R1), never guessed:
  // a caravan carrying `sea` is paid the sea premium and one carrying nothing
  // is not, which is `routeMode`'s whole job one file down.
  return explainRouteYieldBetween(state, pair.from, pair.to, routeMode(unit.trade!));
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
 *
 * **The mode is asked for since batch R1**, because a sea route pays
 * `rules.trade.seaYieldPercent` more (the user's ruling of 2026-09-09) and that
 * is a line of this list like any other. It is **optional and defaults to
 * land**, which is the mode that pays no premium: a caller that has not chosen
 * yet — a preview of a pair, a sweep pricing every pair in order to sort them —
 * is told the conservative figure rather than one it has not earned, and every
 * caller that *knows* the mode names it. `explainRouteYield` reads it off the
 * caravan's own route, so a route already running is never priced as anything
 * but what it is.
 */
export function explainRouteYieldBetween(
  state: GameState,
  from: City,
  to: City,
  mode: RouteMode = 'land',
): RouteYieldLine[] {
  const lines: RouteYieldLine[] = [];
  // Printed on the *destination's* sheet ("Caravan from Uruk · 3 buildings"),
  // naming the origin — the town this figure was read off, not the town
  // reading it.
  const label = (note: string): string => `Caravan from ${from.name} · ${note}`;

  if (routeIsInternational(from, to)) {
    const host = Math.floor(ABROAD.hostGold);
    if (host !== 0) lines.push(line(label('a foreign market'), { gold: host }));
    // The host's coin is a fact about the market, not about the crossing, so
    // the sea premium is deliberately **not** taken of it: the ruling raises
    // what a sea route *pays the seat that sent it*, and that fold is
    // `explainRouteSenderYieldBetween`'s.
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

  // **What a card puts on the caravan itself** — Silk Roads' coin, the
  // Caravanserai's grain. *Before* `amplify`, and that ordering is the whole
  // grammar the user's marks revealed: put yields on a thing, then multiply the
  // thing. A line added after the share would be a line "double your trade route
  // yields" could not see.
  cardLines(state, from, to, lines, label);
  shares(state, from, to, lines, label);
  bySea(mode, lines, label);
  amplify(state, from, lines, label);
  return blockaded(state, from, to, lines);
}

/**
 * **What the crossing is worth** — `rules.trade.seaYieldPercent` on a route run
 * by sea, and nothing at all on one run by land (the user's ruling of
 * 2026-09-09: *"sea routes should pay +50%"*).
 *
 * A line of the list rather than a multiplication of the totals, which is rule 5
 * for a caravan exactly as `amplify` is: the sheet says the goods came over the
 * water, and the Ledger, the Trade screen and the bot all see the same figure
 * because there is only the one.
 *
 * **Why the mode was worth nothing before.** `RouteMode` changed three things
 * and no number — which path is surveyed, whether a road is laid, and how
 * exposed the route is to a hull in a harbour mouth — and every one of the
 * three is *against* the sea: a land cart leaves a road behind that pays its
 * empire for ever, and a sea lane leaves nothing and can be shut by one
 * warship. So a sea route was strictly the worse choice wherever both were
 * legal, and the mode was only ever a choice on paper.
 *
 * Placed **after** the flats, the cards' lines and their shares, and **before**
 * the amplifier, which is this fold's stated grammar (put yields on a thing,
 * then multiply the thing): the premium takes the whole cart as the cards have
 * loaded it, and a law that doubles trade route yields then doubles the premium
 * with everything else it doubles. The blockade below still takes the lot back,
 * which is the honest reading of a shut harbour — the premium is *for* the
 * crossing, and there is no crossing.
 *
 * Exact rather than floored, `amplify`'s own bargain since batch X: half again
 * on a one-gold caravan is half a gold rather than nothing at all, and the
 * town's own fold floors once at the end where Entry XVII floors.
 */
function bySea(
  mode: RouteMode,
  lines: RouteYieldLine[],
  label: (note: string) => string,
): void {
  if (mode !== 'sea') return;
  const percent = TRADE.seaYieldPercent;
  if (percent === 0) return;
  const total = foldRouteYield(lines);
  const extra = {
    food: (total.food * percent) / 100,
    production: (total.production * percent) / 100,
    gold: (total.gold * percent) / 100,
    science: (total.science * percent) / 100,
    culture: (total.culture * percent) / 100,
  };
  if (extra.food === 0 && extra.production === 0 && extra.gold === 0) {
    if (extra.science === 0 && extra.culture === 0) return;
  }
  lines.push(line(label(`by sea ${percent > 0 ? '+' : ''}${percent}%`), extra));
}

/**
 * **The cards' own lines on the caravan** — the flats an Order or a building puts
 * on a route, read off the **origin's** empire (`cardRouteYieldLines`).
 *
 * One function over both folds, exactly as `amplify` is one over both, and for
 * its reason: a law that stopped applying the moment a caravan crossed a border
 * would be a law no card says. Which books the line lands in is the *caller's*
 * question — a domestic route's whole figure is banked by its destination, and a
 * route ending abroad carries this line in the sender's own fold — so an empire's
 * card never pays a foreign host.
 */
function cardLines(
  state: GameState,
  from: City,
  to: City,
  lines: RouteYieldLine[],
  label: (note: string) => string,
): void {
  // **The one count this fold takes, and the one thing only this module can
  // answer**: how many distinct luxuries the two ends hold between them (The
  // Golden Roads). Hoisted before the walk and only when a row asks for it, so
  // a game whose cards say nothing about luxuries pays for no set at all.
  let goods = -1;
  // **And the road's own length**, hoisted the same way and only when a row asks
  // for it: `routeHexes` is the one reading of how far apart two towns are (see
  // it for why it is the distance and not the walked path), and a game whose
  // cards say nothing about the miles measures none.
  let hexes = -1;
  for (const paid of cardRouteYieldLines(state, from, to)) {
    let helpings = 1;
    let note = paid.source;
    if (paid.perEndpointLuxury) {
      if (goods < 0) goods = endpointLuxuryCount(state, from, to);
      helpings = goods;
      note = `${paid.source} · ${helpings} luxur${helpings === 1 ? 'y' : 'ies'}`;
      // A road between two towns holding no luxury at all carries the row and
      // pays nothing for it — the honest zero rather than an absent line.
      if (helpings === 0) continue;
    } else if (paid.perHexes !== undefined) {
      if (hexes < 0) hexes = routeHexes(state, from, to);
      // `helpings`' own arithmetic one module over: floored, so a road two hexes
      // short of the next helping is paid for the ones it has walked.
      helpings = Math.floor(hexes / paid.perHexes);
      note = `${paid.source} · ${hexes} hex${hexes === 1 ? '' : 'es'}`;
      // A pair close enough to be under one helping carries the row and pays
      // nothing for it, exactly as a road with no luxuries on it does.
      if (helpings === 0) continue;
    }
    lines.push(
      line(label(note), {
        food: paid.food * helpings,
        production: paid.production * helpings,
        gold: paid.gold * helpings,
        science: paid.science * helpings,
        culture: paid.culture * helpings,
      }),
    );
  }
}

/**
 * **A card's share of what the road already carries**, voice by voice — The Silk
 * Exchange's doubled beakers and songs (`CardRouteYieldEffect.share`).
 *
 * `amplify`'s narrow cousin, and the pair is deliberately two functions: that
 * one is the Merchant League's *whole caravan* raised by one figure, and this is
 * a row naming which voices it raises. A card that wanted the whole cart says
 * `effectAmplifier`; a card that wanted the beakers alone could not, and that is
 * the field's whole reason to exist.
 *
 * Placed **after** the flats and **before** the amplifier, which is the fold's
 * own grammar (put yields on a thing, then multiply the thing): a share reads
 * every flat line above it, its own row's included, and the amplifier then reads
 * the share like any other line. Every share is computed off the **same**
 * handed-in fold and floored **per row and per voice**, which is
 * `cardYieldConversions`' discipline one ledger over: two rows raising the songs
 * never read each other, so their order cannot change what either pays, and two
 * half-points buy two halves rather than rounding into a free one.
 *
 * Each row is its own labelled line (rule 5), so the sheet says which card
 * raised what; a row whose share comes to nothing at all is not printed.
 */
function shares(
  state: GameState,
  from: City,
  to: City,
  lines: RouteYieldLine[],
  label: (note: string) => string,
): void {
  const rows = cardRouteShareLines(state, from, to);
  if (rows.length === 0) return;
  // The fold **as it stands before any share spoke**, so two of them read the
  // same road and their order cannot change what either pays —
  // `cardYieldConversions`' rule, one ledger over.
  const base = foldRouteYield(lines);
  for (const row of rows) {
    const share = (voice: keyof typeof base): number =>
      row.yield === 'all' || row.yield === voice
        ? Math.floor((base[voice] * row.percent) / 100)
        : 0;
    const extra = {
      food: share('food'),
      production: share('production'),
      gold: share('gold'),
      science: share('science'),
      culture: share('culture'),
    };
    if (
      extra.food === 0 &&
      extra.production === 0 &&
      extra.gold === 0 &&
      extra.science === 0 &&
      extra.culture === 0
    ) {
      continue;
    }
    lines.push(line(label(`${row.source} ${row.percent > 0 ? '+' : ''}${row.percent}%`), extra));
  }
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
  // Exact since batch X: half again on a two-gold caravan is one gold, and half
  // again on a one-gold caravan is half a gold rather than nothing at all.
  const extra = {
    food: (total.food * percent) / 100,
    production: (total.production * percent) / 100,
    gold: (total.gold * percent) / 100,
    science: (total.science * percent) / 100,
    culture: (total.culture * percent) / 100,
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
  mode: RouteMode = 'land',
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

  // The sender's own cards on its own caravan — see `cardLines`. It rides the
  // foreign fold exactly as the amplifier does, because the line belongs to the
  // seat that sent the goods and this is that seat's book.
  cardLines(state, from, to, lines, label);
  shares(state, from, to, lines, label);
  // **The crossing pays here too**, and here is where it matters most: an
  // international route's whole worth to the seat that sent it is this fold,
  // and the ruling is about what a sea route pays, not about whose town it
  // ends in.
  bySea(mode, lines, label);
  amplify(state, from, lines, label);
  return blockaded(state, from, to, lines);
}

/** `explainRouteSenderYieldBetween` for a caravan already carrying the route. */
export function explainRouteSenderYield(state: GameState, unit: Unit): RouteYieldLine[] {
  if (!routeIsLive(state, unit)) return [];
  const pair = routeCities(state, unit);
  if (!pair) return [];
  return explainRouteSenderYieldBetween(state, pair.from, pair.to, routeMode(unit.trade!));
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
 * Folded into `foldCity` exactly as `explainCardCityYields` and `cityResourceYields`
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
