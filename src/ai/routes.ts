/**
 * **What a route is worth to this empire, and what a route slot is worth** —
 * batch 8 of `docs/bot-priorities.md`, the connection pass.
 *
 * Two questions the bot used to answer with one flat number
 * (`weights.trader × goldPressure`, batch 7's surviving guess):
 *
 *   · *what is a caravan worth to build or to buy?* — the pay of **the best
 *     route no caravan of this empire is running**, which is the thing a caravan
 *     is actually for. An empire whose towns are all joined already, or whose
 *     every market slot is spoken for, wants no more wagons whatever the
 *     treasury says;
 *   · *what is a market worth beyond its shelves?* — while every route this
 *     empire may run **is** running, a row that carries `routeSlots` opens one
 *     more, and what it opens is worth exactly what that unserved pair would
 *     pay. The market is priced partly as the route it unlocks.
 *
 * **The gate is the simulation's, and it is the trader-independent half.**
 * `routeStartable` (`trade.ts`) is documented as *"the gate minus the piece"* —
 * every clause a pair of towns can be asked on its own: yours at one end, at
 * peace and met at the other, a free slot, no live route already running that
 * way, a path in the mode asked for, and the range. Those are exactly the
 * clauses a caravan that does not exist yet can honestly be held to, so nothing
 * here re-implements one. What `startRouteError` adds — the piece exists, is
 * yours, is a trader, is idle — is about a wagon, and there is no wagon.
 *
 * **The capacity hypothesis is a board, not a clause.** The one clause that is
 * about the empire rather than the pair is the free slot, and while it bites it
 * makes every pair answer the same empire-level refusal — so a reader that
 * wanted to know *what would a slot open* could learn nothing from the gate at
 * all. Rather than ask four of the five clauses by hand, this asks the whole
 * gate **on a board with one more market on it** (`withSpareSlot`): a shallow
 * clone of the state whose first town carries one extra route-slot row. That is
 * the hypothetical the term is about, said as a board, and it is the same shape
 * the purchasing plan already uses when it prices a building by the `cityYields`
 * an unbuilt row would produce.
 *
 * **The pay is cheap and the gate is dear.** `explainRoutePay` reads two folds
 * of `routeYields.ts` and no path; `routeStartable` runs A* twice. So the sweep
 * prices *every* ordered pair, sorts by what it would pay, and asks the gate in
 * that order until a pair passes or `search.routeGateProbes` asks have been
 * paid for. The answer is therefore the exact best legal pair whenever one of
 * the richest few is legal, and a bound on compute otherwise — the audit's one
 * honest kind of cap.
 *
 * **The road is the half `routeYields.ts` does not answer.** A caravan paves
 * every hex it rests on (`layRoadUnder`, `roads.ts`), so a land leg to a town
 * the capital's roads do not yet reach very likely joins it — and a joined town
 * pays its empire gold every turn for ever through `explainEmpireGold`'s
 * connections line. That is a standing income the flat weight was partly
 * standing in for, and an offer's `pay` carries it as a term of its own
 * (`roadTerm`). Without it the honest price stopped this bot building caravans
 * at all; see the batch's measurement.
 *
 * Hoisted once per sitting onto `ValueContext.routes` (the batch-6 bargain): a
 * per-candidate reading would be an empire sweep and a pathfind for every row of
 * every town.
 */

import { type Appraisal, type ValueTerm, appraise, nest } from './decision';
import { type ValueContext, type YieldBag, buildTurns, explainYields } from './value';

import { BUILDING_IDS, buildingDef } from '../sim/buildingData';
import { connectedCities } from '../sim/roads';
import {
  explainRouteSenderYieldBetween,
  explainRouteYieldBetween,
  foldRouteYield,
  routeIsInternational,
} from '../sim/routeYields';
import { type City, type GameState, type Player, capitalCityOf } from '../sim/state';
import { type RouteMode, routeModesAvailable, routeSlots, usedRouteSlots } from '../sim/trade';
import { RULES } from '../sim/rulesData';
import { type UnitTypeId, caravanTypeId, trades, unitDef } from '../sim/unitData';

const TRADE = RULES.trade;

/** One pair of towns a caravan could join, priced. */
export interface RouteOffer {
  from: City;
  to: City;
  mode: RouteMode;
  /** What this empire would bank off it, per turn, in the one currency. */
  pay: Appraisal;
}

/**
 * **The empire's standing in trade**, as one reading — `ValueContext.routes`.
 *
 * Everything a candidate needs to know about routes without asking the board
 * again: how many slots there are, how many are spoken for, how many a *new*
 * caravan could still fill, the best pair one could run today, and the best pair
 * one more slot would open.
 */
export interface RouteOutlook {
  /** `routeSlots` — the fold of markets and card riders. */
  slots: number;
  /** `usedRouteSlots` — caravans carrying a route, lapsed ones included. */
  used: number;
  /**
   * Caravans of this empire's standing idle with no route at all.
   *
   * They are not slots spent — the simulation counts only laden wagons — but
   * they are wagons that will take the next slot that opens, so a *new* caravan
   * has nothing left to do while one of these is waiting. That is the realised
   * step dropping out by construction (batch 4's rule) said about traders.
   */
  idle: number;
  /** Slots a caravan built today could actually fill: `slots − used − idle`. */
  free: number;
  /** True while every slot this empire has is spoken for. */
  bound: boolean;
  /** The best pair a new caravan could run **today**, or `null`. */
  open: RouteOffer | null;
  /**
   * The best pair **one more slot** would open, or `null` — read only while the
   * empire is capacity-bound, because that is the only time it says anything the
   * `open` reading does not.
   */
  next: RouteOffer | null;
  /**
   * Turns before a wagon could carry the route a new slot opens: nothing when
   * one is already idle in hand, and the caravan's own build otherwise.
   */
  caravanDelay: number;
}

/** An empire nobody has asked about — the shape `valueContext` starts from. */
export const NO_ROUTES: RouteOutlook = {
  slots: 0,
  used: 0,
  idle: 0,
  free: 0,
  bound: false,
  open: null,
  next: null,
  caravanDelay: 0,
};

/**
 * **What one route would pay this empire**, per turn, in the one currency.
 *
 * Moved here whole from `bot.ts` (batch 8) so that the caravan's *worth* and the
 * caravan's *destination* read one number: none of it is this bot's arithmetic.
 * `routeYields.ts` already answers "what does a caravan between these two towns
 * pay, as they stand", and the only thing a seat has to decide is which side of
 * it lands in its own books:
 *
 *   · a route between two of its own towns pays the **destination**
 *     (`explainRouteYieldBetween` — the origin's shelves, the two populations, a
 *     luxury's coin, the card's share), and the destination is this empire's;
 *   · a route ending abroad pays the **sender** a flat table
 *     (`explainRouteSenderYieldBetween`), and pays the host a coin that lands in
 *     somebody else's treasury. That coin is deliberately not counted — neither
 *     as a gift nor as a cost. The ruling is greed, not diplomacy.
 *
 * The blockade and the amplifier ride along for free, being lines of those same
 * folds. Faith is the one voice no route pays, so it never appears in the bag.
 */
export function explainRoutePay(
  state: GameState,
  from: City,
  to: City,
  ctx: ValueContext,
): Appraisal {
  const abroad = routeIsInternational(from, to);
  const paid = foldRouteYield(
    abroad
      ? explainRouteSenderYieldBetween(state, from, to)
      : explainRouteYieldBetween(state, from, to),
  );
  const bag: YieldBag = {
    food: paid.food,
    production: paid.production,
    gold: paid.gold,
    science: paid.science,
    culture: paid.culture,
  };
  return appraise([
    nest(
      abroad
        ? `what a foreign market pays the seat that sent it, ${from.name} → ${to.name}`
        : `what ${to.name} banks off ${from.name}'s shelves`,
      explainYields(bag, ctx),
    ),
  ]);
}

/**
 * The empire's trade standing, read once for the whole sitting.
 *
 * Ordered exactly as the docblock describes: the counts first (they are free),
 * then the priced sweep, then the gate in pay order. An empire with fewer than
 * two towns on the board at all never reaches the sweep — a lone town has
 * nowhere to send a route, which is the one *rule* batch 4 left standing.
 */
export function routeOutlook(state: GameState, player: Player, ctx: ValueContext): RouteOutlook {
  const slots = routeSlots(state, player.id);
  const used = usedRouteSlots(state, player.id);
  let idle = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== player.id) continue;
    if (!trades(unitDef(unit.type))) continue;
    if (unit.trade === undefined) idle += 1;
  }
  const bound = used >= slots;
  const outlook: RouteOutlook = {
    slots,
    used,
    idle,
    free: slots - used - idle,
    bound,
    open: null,
    next: null,
    caravanDelay: idle > 0 ? 0 : caravanBuildTurns(ctx),
  };

  const pairs = pricedPairs(state, player, ctx);
  if (pairs.length === 0) return outlook;

  const probes = Math.max(1, ctx.ai.search.routeGateProbes);
  const roads = roadReading(state, player);
  if (!bound) {
    outlook.open = firstLegal(state, player.id, pairs, probes, ctx, roads);
    // While a slot is free the two readings are the same board asked the same
    // question, so the hypothetical is not built at all.
    outlook.next = outlook.open;
    return outlook;
  }
  const spare = withSpareSlot(state, player.id);
  outlook.next = spare === null ? null : firstLegal(spare, player.id, pairs, probes, ctx, roads);
  return outlook;
}

/** Every ordered pair of a town of this empire's and a town anywhere, priced. */
function pricedPairs(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): { from: City; to: City; pay: Appraisal }[] {
  const pairs: { from: City; to: City; pay: Appraisal }[] = [];
  for (const from of state.cities) {
    if (from.ownerId !== player.id) continue;
    for (const to of state.cities) {
      if (to.id === from.id) continue;
      pairs.push({ from, to, pay: explainRoutePay(state, from, to, ctx) });
    }
  }
  // Richest first, ties by the two towns' ids — founding order, a fact about
  // the state rather than about the order a sweep happened to visit them in.
  pairs.sort((a, b) =>
    b.pay.total === a.pay.total
      ? a.from.id - b.from.id || a.to.id - b.to.id
      : b.pay.total - a.pay.total,
  );
  return pairs;
}

/**
 * The richest pair the gate accepts, or `null` — at most `probes` gate asks.
 *
 * `routeModesAvailable` is `routeStartable` asked of both modes, so a pair it
 * answers with a mode is a pair `startRoute` would accept from any idle caravan
 * of this empire's. Land is preferred where both work, which is the simulation's
 * own ordering (`ROUTE_MODES`) and the reason the bot's own march prefers it: a
 * road is left behind and a sea lane is not.
 */
function firstLegal(
  state: GameState,
  playerId: number,
  pairs: readonly { from: City; to: City; pay: Appraisal }[],
  probes: number,
  ctx: ValueContext,
  roads: RoadReading,
): RouteOffer | null {
  let asked = 0;
  for (const pair of pairs) {
    if (asked >= probes) return null;
    asked += 1;
    const modes = routeModesAvailable(state, playerId, pair.from.id, pair.to.id);
    const mode = modes[0];
    if (mode === undefined) continue;
    const road = roadTerm(pair.to, mode, ctx, roads);
    const pay = road === null ? pair.pay : appraise([nest('what it pays', pair.pay), road]);
    return { from: pair.from, to: pair.to, mode, pay };
  }
  return null;
}

/**
 * **The road a land route wears into the ground**, as a term — the half of a
 * caravan's worth `routeYields.ts` does not answer, because it is not what the
 * route *pays*, it is what the road under it does.
 *
 * A caravan paves every hex it rests on (`layRoadUnder`, `roads.ts`), so a land
 * leg to a town of this empire's that the capital's road network does not yet
 * reach is very likely to **join** it — and a joined town pays its empire
 * `floor(pop ÷ connectionPerPop)` gold a turn for ever, through
 * `explainEmpireGold`'s connections line. That is a standing income the flat
 * `weights.trader` guess was, in part, standing in for.
 *
 * Two stated crudenesses, both conservative: only the **destination** is
 * credited (a leg may join the origin too), and the join is assumed rather than
 * pathfound (the leg may end a hex short of a link, and a road already half-laid
 * may join the town before the caravan ever sets out).
 */
function roadTerm(
  to: City,
  mode: RouteMode,
  ctx: ValueContext,
  roads: RoadReading,
): ValueTerm | null {
  if (mode !== 'land') return null;
  if (to.ownerId !== ctx.playerId) return null;
  if (roads.capital === to.id || roads.joined.has(to.id)) return null;
  const gold = Math.floor(to.population / Math.max(1, TRADE.connectionPerPop));
  if (gold <= 0) return null;
  return nest(
    `the road it wears would join ${to.name} to the capital — ${gold} gold a turn`,
    explainYields({ gold }, ctx),
  );
}

/** Which towns the capital's roads already reach, read once per sitting. */
interface RoadReading {
  capital: number | null;
  joined: Set<number>;
}

function roadReading(state: GameState, player: Player): RoadReading {
  const capital = capitalCityOf(state, player.id);
  const joined = new Set<number>();
  for (const entry of connectedCities(state, player.id)) joined.add(entry.city.id);
  return { capital: capital?.id ?? null, joined };
}

/**
 * **The board with one more market on it** — the capacity hypothesis, as a
 * shallow clone.
 *
 * The first town of this empire's carries one extra route-slot row, so
 * `routeSlots` folds one higher and the gate's slot clause opens; every other
 * thing `routeStartable` reads — who owns what, where the towns stand, the
 * traders already out, the map — is the very same object. The clone is read by
 * the gate and thrown away, so the duplicated row is a fact about a board nobody
 * plays rather than a state this bot could accidentally propose.
 *
 * `null` for an empire with no town, which has no market to hypothesise about.
 */
function withSpareSlot(state: GameState, playerId: number): GameState | null {
  let row: (typeof BUILDING_IDS)[number] | null = null;
  for (const id of BUILDING_IDS) {
    const slots = buildingDef(id).routeSlots;
    if (slots !== undefined && slots > 0) {
      row = id;
      break;
    }
  }
  if (row === null) return null;
  let found = false;
  const cities = state.cities.map((city) => {
    if (found || city.ownerId !== playerId) return city;
    found = true;
    return { ...city, buildings: [...city.buildings, row] };
  });
  if (!found) return null;
  return { ...state, cities };
}

/** How long a middling town of this empire would take to raise a caravan. */
function caravanBuildTurns(ctx: ValueContext): number {
  const id: UnitTypeId | null = caravanTypeId();
  if (id === null) return 0;
  return buildTurns(unitDef(id).cost, ctx);
}

/**
 * **What a caravan is worth**, or `null` when this empire has no route for one —
 * the build arm's and the purchasing plan's one reading (batch 8).
 *
 * The flat `weights.trader` guess is gone: a wagon is worth the pay of the best
 * route nobody is running, which is the thing it will actually do. `null` rather
 * than nought where there is no such route, because that is a *rule* and not a
 * price — a lone town has nowhere to send a route, an empire whose every slot is
 * spoken for has no room for another wagon, and a wagon already standing idle
 * will take the next slot before a new one does.
 */
export function explainCaravan(ctx: ValueContext): Appraisal | null {
  const routes = ctx.routes;
  if (routes.free <= 0 || routes.open === null) return null;
  const offer = routes.open;
  const terms = [
    nest(
      `the best route no caravan of this empire is running — ${offer.from.name} → ${offer.to.name} by ${offer.mode}`,
      offer.pay,
    ),
  ];
  // The stand-in for what this reading leaves out (see `score.caravanScale`);
  // printed only when it is actually saying something, so a 1 leaves the fold
  // exactly the route's pay.
  const scale = ctx.ai.score.caravanScale;
  if (scale !== 1) {
    terms.push({ label: `× ${scale} — what a route pays beyond its yields, unread`, value: scale, op: 'mul' });
  }
  return appraise(terms);
}

/** Why a caravan is refused, in the words the feed prints. See `explainCaravan`. */
export function caravanRefusal(ctx: ValueContext): string {
  const routes = ctx.routes;
  if (routes.slots <= 0) return 'This empire has no trade route to run — build a market first.';
  if (routes.free <= 0) {
    return routes.idle > 0
      ? 'A caravan already stands idle waiting for a slot; a second would wait beside it.'
      : `All ${routes.slots} of this empire's trade routes are running.`;
  }
  return 'No pair of towns will take another route from this empire.';
}
