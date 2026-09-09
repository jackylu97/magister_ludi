/**
 * **The Caravans** — the ledger a trade route is hired out of, and the only
 * surface that hires one.
 *
 * The tenth sheet on `modalShell.ts` (`hidden` is the whole of the screen
 * state, the ×, Escape and a press on the ground arrive at one `close`, the
 * disposer is the game's), and the third rewrite of a screen that has been
 * three different things. The user's ruling of 2026-09-09 (`docs/flags.md`
 * item (iii)) is what this one is:
 *
 *   *"once you hit late game there's an overwhelming amount of trade routes
 *   available and I'd like to organize and surface the best ones for the
 *   player"* — and *"please look into the performance of the trade screen, it
 *   gets quite laggy"*.
 *
 * Two problems and they had the same cause. The old screen drew **every
 * ordered pair** as a row in a table sorted by a column, which is a hundred
 * rows on a late board with nothing to say which three of them matter; and it
 * priced every one of those pairs from scratch on every open and every redraw,
 * which is a few hundred A\* searches for a table nobody could read anyway.
 *
 * What replaced both
 * ------------------
 * **One reading, four tabs.** `readRoutes(state, seat)` (batch R1,
 * `src/sim/readings.ts`) is this sheet's whole subject: every pair's available
 * modes, the labelled fold per mode with the sea premium among its lines, the
 * price, the hexes a land cart would pave, the march's turn count, the gate's
 * own refusal sentence, and the towns a trading post at the partner would pull
 * into range. It is memoised on the revision, so the tabs, the filters, the
 * sort orders and the Land | Sea toggles are all free to redraw. **Nothing on
 * this screen prices a pair by any other means** — there is no second survey
 * here, no `routeStartable` asked row by row, and no fold taken beside the
 * reading's own.
 *
 * The four tabs are the ruling's own list: **Recommended** (the default),
 * **Running**, **All routes**, **Unavailable**. The first is the answer to the
 * user's complaint — a hundred pairs sorted by a number is not a
 * recommendation, so the pairs are grouped by **purpose** instead (Richest ·
 * Paves a road · Feeds a town · Most science and culture) and each group shows
 * its best few. An **empty purpose group does not appear at all**: a heading
 * over nothing is a heading a player has to read to learn there is nothing
 * under it.
 *
 * Facts, not adjectives
 * ---------------------
 * The user's marks on the mock (2026-09-09) cut every soft line off a card and
 * left a row of **facts in mono**: what the cart paves, which town it joins to
 * the capital and on what turn, what that connection pays, what a foreign host
 * keeps, the fed town's size and its next citizen with the cart and without,
 * and the trading post the first cart leaves with the towns its range would
 * newly reach. No walk or sail turns, no "from" buildings, no flavour. Every
 * one of those is read off the simulation — `readRoutes` for the route's own
 * half, `connectedCities`, `growthThreshold`/`growthSurplus` and
 * `RULES.trade` for the rest — and the register of which fact comes from where
 * is `routeFacts` below.
 *
 * One fact on the mock is **not** built and its absence is deliberate:
 * "warships on path". `readRoutes` does not carry the path — carrying it would
 * mean surveying every refused pair, which is the cost this reading exists to
 * avoid — so the sheet cannot count hulls along one. What it says instead is
 * the rule that actually takes a route's pay away: a **blockade** at either end
 * (`cityBlockaded`), which is the sim's own reading of a hull in a harbour
 * mouth. See `docs/trade.md`.
 *
 * The pure half is everything above `createTradeScreen`, for `figures.ts`'
 * reason: the half of a sheet that can be *quietly wrong* — a ranking, a
 * grouping, a refusal's heading, a command's three ids — has to be a function
 * somebody can call.
 */

import {
  type RouteMode,
  type RouteYieldLine,
  type TradeGoldLine,
  ROUTE_MODES,
  explainEmpireGold,
  explainRouteSenderYield,
  explainRouteSlots,
  explainRouteYield,
  foldRouteYield,
  routeCities,
  routeIsInternational,
  routeIsLive,
  usedRouteSlots,
} from '../sim/trade';
import { type RouteReadingRow, type RoutesReading, readCity, readRoutes } from '../sim/readings';
import { growthSurplus, growthThreshold, turnsToFill } from '../sim/cities';
import { foldCity } from '../sim/yields/town';
import { connectedCities } from '../sim/roads';
import { cityBlockaded } from '../sim/blockade';
import { atWar } from '../sim/wars';
import { hasMetSeat } from '../sim/diplomacy';
import { RULES } from '../sim/rulesData';
import { type City, type GameState, playerById } from '../sim/state';
import { cityDisplayName } from './cityDisplay';
import { YIELD_GLYPH, figure, signedFigure } from './figures';
import { NO_ROUTE_CAPACITY, hasFreeRouteSlot, routeFigures, tradeFigureRuns } from './tradeLines';
import { setYieldText } from './yieldMark';
import { createModalShell } from './modalShell';
import { element } from './dom';

// --- the index's four tabs --------------------------------------------------

export type TradeTabId = 'recommended' | 'running' | 'all' | 'unavailable';

/**
 * The ledger's cut tabs, in the order they are bound into the leaf.
 *
 * **Recommended first and open by default** — the ruling's own priority: a
 * player opening this sheet wants to be told which caravan to send, and the
 * complete list is a reference behind a tab rather than the front page.
 */
export const TRADE_TABS: readonly { id: TradeTabId; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'running', label: 'Running' },
  { id: 'all', label: 'All routes' },
  { id: 'unavailable', label: 'Unavailable' },
];

// --- the running half -------------------------------------------------------

/** One caravan of this seat that is carrying a route. See `runningRoutes`. */
export interface RunningRoute {
  unitId: number;
  /** Where the piece is standing right now — the row's click pans here. */
  col: number;
  row: number;
  fromCityId: number;
  toCityId: number;
  fromName: string;
  toName: string;
  /** True when the far end is another empire's town — the name is drawn in their ink. */
  abroad: boolean;
  /** The route's own mode, off `Unit.trade` — a running route's mode is settled. */
  mode: RouteMode;
  /** "+3🌾 +2⚙ +1💰", or "nothing yet". */
  figures: string;
  /** The lines `figures` is the fold of — the hover ledger. */
  lines: RouteYieldLine[];
  /** `expiresTurn − state.turn`, floored at zero. Never a stored countdown. */
  turnsLeft: number;
  autoResend: boolean;
  /** Gold this route alone pays, for the summary ledger's fold. */
  gold: number;
  /** "Uruk ⇄ Nippur · +3🌾 +2⚙ +1💰 · 14 turns · ↻ auto". */
  text: string;
}

/**
 * Every caravan of this seat that is carrying a route, in `state.units` order.
 *
 * A **lapsed** route is still a row, and deliberately: the caravan is walking
 * home, the slot is still spoken for, and a player wondering where their fourth
 * route went needs to see exactly that. `turnsLeft` reads zero and the row
 * stands — and it is the row the Renew button sits on.
 */
export function runningRoutes(state: GameState, playerId: number): RunningRoute[] {
  const rows: RunningRoute[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const route = unit.trade;
    if (route === undefined) continue;
    const pair = routeCities(state, unit);
    const fromName = pair ? cityDisplayName(state, pair.from) : 'a lost city';
    const toName = pair ? cityDisplayName(state, pair.to) : 'a lost city';
    // **The seat's own take**, which for a route ending abroad is the sender's
    // fold and not the destination's (the international ruling of 2026-09-03):
    // this sheet is the empire's own, and a host's coin belongs on the host's.
    const foreign = pair !== null && routeIsInternational(pair.from, pair.to);
    const lines = foreign
      ? explainRouteSenderYield(state, unit)
      : explainRouteYield(state, unit);
    const fold = foldRouteYield(lines);
    const figures = routeFigures(fold);
    const turnsLeft = Math.max(0, route.expiresTurn - state.turn);
    const auto = route.autoResend ? ' · ↻ auto' : '';
    rows.push({
      unitId: unit.id,
      col: unit.col,
      row: unit.row,
      fromCityId: route.from,
      toCityId: route.to,
      fromName,
      toName,
      abroad: foreign,
      mode: route.sea === true ? 'sea' : 'land',
      figures,
      lines,
      turnsLeft,
      autoResend: route.autoResend,
      gold: fold.gold,
      text: `${fromName} ⇄ ${toName} · ${figures} · ${figure(turnsLeft)} turns${auto}`,
    });
  }
  return rows;
}

/** One line of the summary ledger the routes chip hovers. */
export interface TradeLedgerLine {
  source: string;
  /** Signed gold. The one voice the ledger totals. */
  gold: number;
  /** The figures the line is *shown* with — a route quotes all three voices. */
  figures: string;
}

/** The chip's whole card: the lines, and the gold they fold to. */
export interface TradeLedger {
  lines: TradeLedgerLine[];
  /** The fold, and the only sum of one. */
  total: number;
  used: number;
  slots: number;
  /** "2 / 3" — the chip's own face. */
  chip: string;
}

/**
 * What trade is paying this empire, as the ordered list the total is the fold of
 * (rule 5).
 *
 * One line per running route, then `explainEmpireGold`'s four — the
 * connections, the road bill, the army's wages and the institutions' — and the
 * total under a double rule. Gold is the one voice that totals because it is
 * the one voice every source here shares: a route's food and hammers land in
 * one town's own basket and are quoted on the route's line, and adding them to
 * an empire-wide figure would be summing two different things.
 */
export function tradeLedger(
  state: GameState,
  playerId: number,
  // The four empire-scale lines, asked once (2026-08-29). `explainEmpireGold`
  // floods the empire's connected territory and sweeps every hex, unit and
  // building it holds, and this function used to ask for it twice — once for the
  // lines and again through `empireGold`, which is nothing but the fold of them.
  empire: readonly TradeGoldLine[] = explainEmpireGold(state, playerId) as readonly TradeGoldLine[],
): TradeLedger {
  const lines: TradeLedgerLine[] = [];
  const routes = runningRoutes(state, playerId);
  for (const route of routes) {
    lines.push({
      source: `${route.fromName} ⇄ ${route.toName}`,
      gold: route.gold,
      figures: route.figures,
    });
  }
  for (const line of empire) {
    lines.push({
      source: line.source,
      gold: line.gold,
      figures: `${signedFigure(line.gold)}${YIELD_GLYPH.gold}`,
    });
  }
  let total = 0;
  for (const route of routes) total += route.gold;
  for (const line of empire) total += line.gold;
  const slots = explainRouteSlots(state, playerId).reduce((sum, line) => sum + line.slots, 0);
  const used = usedRouteSlots(state, playerId);
  return { lines, total, used, slots, chip: `${figure(used)} / ${figure(slots)}` };
}

// --- the sheet's one reading, and the facts hung off it ----------------------

/**
 * Everything the whole sheet is a function of, gathered once per paint.
 *
 * `readRoutes` is the subject and the rest is the *surroundings* a fact needs:
 * which of this seat's towns are joined to the capital (so "paves a road" can
 * mean the road that would join one), the purse, and the slot ledger. Every one
 * of these is a reading of the simulation asked **once** — the whole point of
 * the pass — and handed down to every group, card and fact below rather than
 * re-asked per row.
 */
export interface TradeContext {
  state: GameState;
  seat: number;
  /** The seat's own name, for the masthead. */
  seatName: string;
  reading: RoutesReading;
  /**
   * The reading's rows, less the pairs this seat may not be *told* about.
   *
   * The met clause is a **screen** reading and not a rule, exactly as it was
   * before this rewrite: the gate refuses an unmet partner in words, and a
   * sheet that greyed out "You have not met Persia" would be telling the player
   * Persia exists. The wild holds no towns worth a caravan and is not at the
   * table, so a barbarian seat's towns go by the same clause every other roster
   * uses.
   */
  rows: readonly RouteReadingRow[];
  gold: number;
  /** Ids of this seat's towns that already reach the capital by road. */
  connected: ReadonlySet<number>;
  /** True while the empire has a route slot to spend. */
  slotFree: boolean;
}

export function tradeContext(state: GameState, seat: number): TradeContext {
  const reading = readRoutes(state, seat);
  const rows = reading.rows.filter((row) => partnerIsVisible(state, seat, row.to));
  const connected = new Set<number>();
  for (const entry of connectedCities(state, seat)) connected.add(entry.city.id);
  return {
    state,
    seat,
    seatName: playerById(state, seat)?.name ?? 'this empire',
    reading,
    rows,
    gold: playerById(state, seat)?.gold ?? 0,
    connected,
    slotFree: hasFreeRouteSlot(state, seat),
  };
}

/** May this seat be shown a row about that town at all? See `TradeContext.rows`. */
function partnerIsVisible(state: GameState, seat: number, to: City): boolean {
  if (to.ownerId === seat) return true;
  const owner = playerById(state, to.ownerId);
  if (owner === undefined || owner.barbarian === true) return false;
  return hasMetSeat(state, seat, to.ownerId);
}

/**
 * One fact on a card, as the mock prints it: a small-caps label and a figure.
 *
 * Two halves rather than one sentence because the *label* is the copy face and
 * the *figure* is tabular mono — the specimen's one rule about numbers — and a
 * fact composed as a single string could not be drawn in two faces.
 */
export interface TradeFact {
  key: string;
  text: string;
}

/**
 * What a card says about one pair read **in one mode** — the register of where
 * each fact comes from.
 *
 * | fact | read from |
 * |---|---|
 * | paves N hexes (land) | `RouteReadingRow.roadHexes`, the land leg's unpaved hexes |
 * | connects ⟨town⟩ turn T | `RouteReadingRow.turns` added to `state.turn` — the cart lays the road as it walks |
 * | connection +G gold/t | `connectedCities`' own arithmetic: the town's people over `rules.trade.connectionPerPop` |
 * | host keeps G gold/t | `rules.trade.international.hostGold` |
 * | ⟨town⟩ size S · F food/t | the destination's own reading — `readCity`/`foldCity`, `growthSurplus` |
 * | next citizen N turns (was M) | `growthThreshold` against the basket, `turnsToFill` with the cart's food and without |
 * | blockaded | `cityBlockaded` at either end — the rule that takes the pay back |
 * | post at ⟨town⟩ +N range · K more towns in reach | `RouteReadingRow.postReach`, `rules.trade.postRangeTurns` |
 *
 * **The mode decides the facts**, which is the user's direction of record: a sea
 * cart lays no road, so its paving line says so and its connection lines are
 * absent; a land cart's paving counts. The food figure is the fold for *this*
 * mode, so the sea premium moves the fed town's next citizen too.
 */
export function routeFacts(
  ctx: TradeContext,
  row: RouteReadingRow,
  mode: RouteMode,
): TradeFact[] {
  const facts: TradeFact[] = [];
  const { state } = ctx;
  const toName = cityDisplayName(state, row.to);
  const pays = row.pays.find((entry) => entry.mode === mode) ?? null;
  const domestic = row.to.ownerId === ctx.seat;

  // The road. A land cart wears one into every hex it walks; a sea cart lays
  // none at all, and the card says which rather than leaving the paving line
  // off — the toggle's whole job is to show what changes.
  if (mode === 'land') {
    if (row.roadHexes !== null && row.roadHexes > 0) {
      facts.push({ key: 'paves', text: `${figure(row.roadHexes)} hexes (land)` });
    }
  } else if (row.modes.includes('land')) {
    facts.push({ key: 'paves', text: '— (sea lays no road)' });
  }

  // The connection, and only for the case it is an argument in: a town of this
  // seat's that the road would newly join to the capital. A connection already
  // standing pays whether or not this cart goes, so saying it here would be
  // crediting the route with somebody else's road.
  if (
    mode === 'land' &&
    domestic &&
    !ctx.connected.has(row.to.id) &&
    row.roadHexes !== null &&
    row.roadHexes > 0
  ) {
    if (row.turns !== null) {
      facts.push({ key: `connects ${toName}`, text: `turn ${figure(state.turn + row.turns)}` });
    }
    const pay = connectionGold(row.to);
    if (pay > 0) facts.push({ key: 'connection', text: `+${figure(pay)} gold/t` });
  }

  // What the far empire keeps. A route abroad pays its host a coin of their own
  // (`rules.trade.international.hostGold`) and a player deciding to feed a
  // rival's treasury should be told the figure rather than discover it.
  if (!domestic) {
    const host = Math.max(0, Math.floor(RULES.trade.international.hostGold));
    if (host > 0) facts.push({ key: 'host keeps', text: `${figure(host)} gold/t` });
  }

  // The fed town, and what the cart does to its next citizen. Domestic only:
  // a foreign route pays the sender's pools directly and banks nothing in the
  // partner's basket, so there is no town of ours growing at the far end.
  if (domestic && pays !== null && pays.total.food > 0) {
    const growth = growthReading(ctx, row.to, pays.total.food);
    facts.push({
      key: toName,
      text: `size ${figure(row.to.population)} · ${figure(growth.surplus)} food/t`,
    });
    if (growth.withCart !== null) {
      const was = growth.without === null ? 'never' : `${figure(growth.without)}`;
      facts.push({
        key: 'next citizen',
        text: `${figure(growth.withCart)} turns (was ${was})`,
      });
    }
  }

  // The one exposure the sheet can honestly name. See the module docblock on
  // why this stands where the mock's "warships on path" did.
  const shut = cityBlockaded(state, row.from)
    ? row.from
    : cityBlockaded(state, row.to)
      ? row.to
      : null;
  if (shut !== null) {
    facts.push({
      key: 'blockaded',
      text: `a hull sits in ${cityDisplayName(state, shut)}’s harbour mouth`,
    });
  }

  // The post the first cart leaves, and what its range opens. `postReach` is
  // empty when the partner already carries one, so the fact appears exactly
  // when it is news.
  if (row.postReach.length > 0) {
    const extra = Math.max(0, Math.floor(RULES.trade.postRangeTurns));
    const towns = row.postReach.length;
    facts.push({
      key: `post at ${toName}`,
      text: `+${figure(extra)} range · ${figure(towns)} more town${towns === 1 ? '' : 's'} in reach`,
    });
  }

  return facts;
}

/** What a connected town of this size pays the treasury. `connectedCities`' own step. */
export function connectionGold(city: City): number {
  const per = Math.max(1, Math.floor(RULES.trade.connectionPerPop));
  return Math.floor(city.population / per);
}

/**
 * A town's growth with a cart's food and without it — the "next citizen"
 * fact's whole arithmetic, and the simulation's own two functions.
 *
 * `growthSurplus` is what the basket will actually receive (the harvest less
 * upkeep, less a settler at the front of the queue, less a happiness deficit),
 * and `turnsToFill` is the same division the city panel prints. The cart's food
 * is **added to the surplus** rather than folded into the town's yields,
 * because that is where a route lands: `collectYields` banks a caravan's
 * arrival into the destination's basket after the town has been priced.
 */
export function growthReading(
  ctx: TradeContext,
  city: City,
  cartFood: number,
): { surplus: number; without: number | null; withCart: number | null } {
  const { state } = ctx;
  const quote = readCity(state, city);
  const surplus = growthSurplus(state, city, foldCity(state, city, [], undefined, quote));
  const remaining = growthThreshold(city.population) - city.foodBasket;
  return {
    surplus: Math.round(surplus),
    without: turnsToFill(remaining, surplus),
    withCart: turnsToFill(remaining, surplus + cartFood),
  };
}

// --- one card ---------------------------------------------------------------

/** One pair on offer, read in one mode. See `routeCard`. */
export interface RouteCard {
  fromCityId: number;
  toCityId: number;
  fromName: string;
  toName: string;
  /** The empire that holds the far town when it is not this seat's, else `null`. */
  rivalName: string | null;
  /** The modes the gate would take today, in `ROUTE_MODES` order. */
  modes: readonly RouteMode[];
  /** The mode this card is currently read in. Always one of `modes`. */
  mode: RouteMode;
  /** "+9💰 +3🔬 +2🎭" for `mode`, or "nothing yet". */
  figures: string;
  /** The labelled list `figures` is the fold of — the hover ledger. */
  lines: readonly RouteYieldLine[];
  /** Every voice of the fold summed — the ranking's own number. */
  total: number;
  facts: TradeFact[];
  price: number;
  /** False when the purse cannot pay the price today. */
  affordable: boolean;
}

/** Every voice of a mode's fold summed. The one ranking number, taken once. */
export function routeModeTotal(row: RouteReadingRow, mode: RouteMode): number {
  const pays = row.pays.find((entry) => entry.mode === mode);
  if (pays === undefined) return 0;
  const { food, production, gold, science, culture } = pays.total;
  return food + production + gold + science + culture;
}

/** The mode a card opens in: the one that pays most, ties to `ROUTE_MODES` order. */
export function bestMode(row: RouteReadingRow): RouteMode | null {
  let best: RouteMode | null = null;
  let bestTotal = -1;
  for (const mode of ROUTE_MODES) {
    if (!row.modes.includes(mode)) continue;
    const total = routeModeTotal(row, mode);
    if (total > bestTotal) {
      best = mode;
      bestTotal = total;
    }
  }
  return best;
}

export function routeCard(ctx: TradeContext, row: RouteReadingRow, mode: RouteMode): RouteCard {
  const pays = row.pays.find((entry) => entry.mode === mode) ?? null;
  const lines = pays?.lines ?? [];
  const rival =
    row.to.ownerId === ctx.seat ? null : (playerById(ctx.state, row.to.ownerId)?.name ?? null);
  return {
    fromCityId: row.from.id,
    toCityId: row.to.id,
    fromName: cityDisplayName(ctx.state, row.from),
    toName: cityDisplayName(ctx.state, row.to),
    rivalName: rival,
    modes: row.modes,
    mode,
    figures: pays === null ? 'nothing yet' : routeFigures(pays.total),
    lines,
    total: routeModeTotal(row, mode),
    facts: routeFacts(ctx, row, mode),
    price: ctx.reading.price,
    affordable: ctx.gold >= ctx.reading.price,
  };
}

// --- the recommendations ----------------------------------------------------

/** One purpose group on the Recommended tab. An empty one is never built. */
export interface PurposeGroup {
  id: 'richest' | 'paves' | 'feeds' | 'learning';
  title: string;
  /** The heading's small line — what the group is *for*, in plain words. */
  blurb: string;
  /** The pairs, best first. The first is the one that carries the hedera. */
  rows: { row: RouteReadingRow; mode: RouteMode }[];
}

/** How many cards a purpose group shows. The ruling's "the first two or three". */
export const PURPOSE_CARDS = 3;

/** Order two candidates and break every tie on the pair's own ids. Total, always. */
function byScore(
  score: (entry: { row: RouteReadingRow; mode: RouteMode }) => number,
): (a: { row: RouteReadingRow; mode: RouteMode }, b: { row: RouteReadingRow; mode: RouteMode }) => number {
  return (a, b) =>
    score(b) - score(a) || a.row.from.id - b.row.from.id || a.row.to.id - b.row.to.id;
}

/**
 * The Recommended tab: the pairs worth sending, grouped by **what for**.
 *
 * The four purposes are the user's own list and in the user's own priority
 * (`docs/flags.md` (iii), *Refined*): the richest carts first because that is
 * the first two or three a player ever sends; then the ones that finish a road
 * to a town the capital cannot reach, which is usually the same cart wearing a
 * second argument; then the ones that feed a town still growing, which is a
 * late-game decision; then what a rival's towns teach.
 *
 * **An empty group does not appear at all.** There is no "no routes pave a road
 * today" line, because a heading over an empty box is a thing a player has to
 * read before learning it says nothing.
 *
 * A pair may appear in two groups and that is the point rather than a bug: a
 * cart that is both the richest and the one that joins a town is *more* worth
 * sending, not less, and the ruling says the overlap out loud.
 */
export function recommendedGroups(ctx: TradeContext): PurposeGroup[] {
  const offered: { row: RouteReadingRow; mode: RouteMode }[] = [];
  for (const row of ctx.rows) {
    if (!row.available) continue;
    const mode = bestMode(row);
    if (mode === null) continue;
    offered.push({ row, mode });
  }

  const groups: PurposeGroup[] = [];

  // 1. Richest — every voice of the fold summed, in the mode that pays most.
  const richest = [...offered].sort(byScore((entry) => routeModeTotal(entry.row, entry.mode)));
  push(groups, {
    id: 'richest',
    title: 'Richest',
    blurb: 'the routes that pay most a turn',
    rows: richest.filter((entry) => routeModeTotal(entry.row, entry.mode) > 0),
  });

  // 2. Paves a road — a **land** cart whose walk lays hexes toward a town of
  //    this seat's that the capital cannot yet reach by road. Ranked by what
  //    the connection would pay, because that is the argument the group makes;
  //    the pay per turn breaks the tie.
  const paves = offered
    .filter(
      (entry) =>
        entry.row.modes.includes('land') &&
        entry.row.roadHexes !== null &&
        entry.row.roadHexes > 0 &&
        entry.row.to.ownerId === ctx.seat &&
        !ctx.connected.has(entry.row.to.id),
    )
    .map((entry) => ({ row: entry.row, mode: 'land' as RouteMode }))
    .sort(
      byScore(
        (entry) => connectionGold(entry.row.to) * 100 + routeModeTotal(entry.row, entry.mode),
      ),
    );
  push(groups, {
    id: 'paves',
    title: 'Paves a road',
    blurb: 'routes that lay the road to a town not yet joined to the capital',
    rows: paves,
  });

  // 3. Feeds a town — ranked by the **turns the cart takes off the next
  //    citizen**, which is the fact the card prints. No "still small" threshold
  //    is invented: `growthThreshold` climbs with every citizen, so the biggest
  //    saving lands on the smallest town by the simulation's own arithmetic.
  const feeds: { row: RouteReadingRow; mode: RouteMode; saved: number }[] = [];
  for (const entry of offered) {
    if (entry.row.to.ownerId !== ctx.seat) continue;
    const pays = entry.row.pays.find((one) => one.mode === entry.mode);
    if (pays === undefined || pays.total.food <= 0) continue;
    const growth = growthReading(ctx, entry.row.to, pays.total.food);
    if (growth.withCart === null) continue;
    // A town that would never grow without the cart is the strongest case there
    // is, and a subtraction against `null` would drop it: it ranks above every
    // town the cart merely hurries.
    const saved = growth.without === null ? Number.MAX_SAFE_INTEGER : growth.without - growth.withCart;
    if (saved <= 0) continue;
    feeds.push({ ...entry, saved });
  }
  feeds.sort(
    (a, b) => b.saved - a.saved || a.row.from.id - b.row.from.id || a.row.to.id - b.row.to.id,
  );
  push(groups, {
    id: 'feeds',
    title: 'Feeds a town',
    blurb: 'the best food into a town still growing',
    rows: feeds.map((entry) => ({ row: entry.row, mode: entry.mode })),
  });

  // 4. Most science and culture — the foreign carts, which are the only ones
  //    that pay either voice (the international ruling of 2026-09-03).
  const learning = offered
    .filter((entry) => entry.row.to.ownerId !== ctx.seat)
    .filter((entry) => {
      const pays = entry.row.pays.find((one) => one.mode === entry.mode);
      return pays !== undefined && pays.total.science + pays.total.culture > 0;
    })
    .sort(
      byScore((entry) => {
        const pays = entry.row.pays.find((one) => one.mode === entry.mode);
        return pays === undefined ? 0 : pays.total.science + pays.total.culture;
      }),
    );
  push(groups, {
    id: 'learning',
    title: 'Most science and culture',
    blurb: 'what a rival’s towns teach',
    rows: learning,
  });

  return groups;
}

/** Adds a group iff it has a card in it, capped at `PURPOSE_CARDS`. */
function push(groups: PurposeGroup[], group: PurposeGroup): void {
  if (group.rows.length === 0) return;
  groups.push({ ...group, rows: group.rows.slice(0, PURPOSE_CARDS) });
}

// --- the full list ----------------------------------------------------------

/** The four things a filter chip can say about a pair. All on is every pair. */
export interface RouteFilters {
  own: boolean;
  abroad: boolean;
  land: boolean;
  sea: boolean;
}

export const ALL_ROUTE_FILTERS: RouteFilters = { own: true, abroad: true, land: true, sea: true };

/** What the All-routes tab may be sorted by. `road` is the hexes a cart would pave. */
export type RouteSortKey = 'pay' | 'food' | 'gold' | 'science' | 'road';

export const ROUTE_SORTS: readonly { key: RouteSortKey; label: string }[] = [
  { key: 'pay', label: 'pay' },
  { key: 'food', label: 'food' },
  { key: 'gold', label: 'gold' },
  { key: 'science', label: 'science' },
  { key: 'road', label: 'road' },
];

/** What one sort key reads on one row, in the mode the row is shown in. */
export function routeSortValue(row: RouteReadingRow, mode: RouteMode, key: RouteSortKey): number {
  if (key === 'road') return row.roadHexes ?? 0;
  const pays = row.pays.find((entry) => entry.mode === mode);
  if (pays === undefined) return 0;
  if (key === 'pay') return routeModeTotal(row, mode);
  return pays.total[key];
}

/** Does this pair survive the chips? A filter is a **narrowing**, never a re-ranking. */
export function rowPassesFilters(
  ctx: TradeContext,
  row: RouteReadingRow,
  mode: RouteMode,
  filters: RouteFilters,
): boolean {
  const domestic = row.to.ownerId === ctx.seat;
  if (domestic && !filters.own) return false;
  if (!domestic && !filters.abroad) return false;
  if (mode === 'land' && !filters.land) return false;
  if (mode === 'sea' && !filters.sea) return false;
  return true;
}

/** One origin town's fold on the All-routes tab. */
export interface OriginGroup {
  city: City;
  name: string;
  rows: { row: RouteReadingRow; mode: RouteMode }[];
}

/**
 * Every offered pair, grouped by the town it sets out from, in founding order.
 *
 * The old screen's whole content, behind a tab: a reference the ruling keeps
 * ("the full list stays viewable behind a tab, grouped by origin town with
 * collapsible groups and the slot tally") rather than the front page it used to
 * be. Only **available** pairs are here — the refused ones are the Unavailable
 * tab's, which is the user's own instruction and the reason this tab is
 * readable at all.
 */
export function originGroups(
  ctx: TradeContext,
  filters: RouteFilters,
  sort: RouteSortKey,
  modeOf: (row: RouteReadingRow) => RouteMode,
): OriginGroup[] {
  const groups = new Map<number, OriginGroup>();
  for (const row of ctx.rows) {
    if (!row.available) continue;
    const mode = modeOf(row);
    if (!rowPassesFilters(ctx, row, mode, filters)) continue;
    let group = groups.get(row.from.id);
    if (group === undefined) {
      group = { city: row.from, name: cityDisplayName(ctx.state, row.from), rows: [] };
      groups.set(row.from.id, group);
    }
    group.rows.push({ row, mode });
  }
  const ordered: OriginGroup[] = [];
  // `state.cities` order — founding order, a fact about the state rather than
  // about the sweep — so two players' sheets group the same way.
  for (const city of ctx.state.cities) {
    const group = groups.get(city.id);
    if (group !== undefined) ordered.push(group);
  }
  for (const group of ordered) {
    group.rows.sort(
      (a, b) =>
        routeSortValue(b.row, b.mode, sort) - routeSortValue(a.row, a.mode, sort) ||
        a.row.to.id - b.row.to.id,
    );
  }
  return ordered;
}

// --- the unavailable --------------------------------------------------------

/**
 * Why the gate refused a pair, as a **heading**.
 *
 * Classified by re-asking the simulation's own clauses **in the order
 * `routeStartable` asks them** — never by reading its sentence. Matching prose
 * to decide what a refusal meant is how two files start disagreeing the first
 * time one of them is reworded, and `startableError`'s docblock has said so on
 * this screen since 2026-08-28.
 *
 * There are four headings and not the mock's five, and both differences are
 * stated rather than hidden:
 *
 *   · **No "blockaded"** — a blockade is not a refusal. A hull in the harbour
 *     mouth takes a running route's pay back (`routeYields.ts`); it never stops
 *     one being hired. The fact is on the *card*, where it belongs.
 *   · **"Out of reach" holds two clauses** — no lane at all, and too far. The
 *     reading does not survey a pair the gate refused (that is the whole of
 *     R1's speed), so the sheet cannot tell those two apart without re-running
 *     the search this reading exists to avoid. The heading covers both and each
 *     row prints the gate's own sentence, which says which it was.
 */
export type RefusalReason = 'war' | 'slots' | 'running' | 'reach';

export const REFUSAL_TITLES: Readonly<Record<RefusalReason, string>> = {
  war: 'At war',
  slots: 'No route slot free',
  running: 'Already running',
  reach: 'Out of reach',
};

export function refusalReason(ctx: TradeContext, row: RouteReadingRow): RefusalReason {
  // The gate's own order: the foreign clauses, then the slot ledger, then the
  // pair, then the ground.
  if (row.to.ownerId !== ctx.seat && atWar(ctx.state, ctx.seat, row.to.ownerId)) return 'war';
  if (!ctx.slotFree) return 'slots';
  if (pairIsRunning(ctx.state, ctx.seat, row.from.id, row.to.id)) return 'running';
  return 'reach';
}

/** Is a live route already running from this town to that one? Directional, as the gate is. */
export function pairIsRunning(
  state: GameState,
  playerId: number,
  from: number,
  to: number,
): boolean {
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const route = unit.trade;
    if (route === undefined) continue;
    if (route.from !== from || route.to !== to) continue;
    if (routeIsLive(state, unit)) return true;
  }
  return false;
}

export interface RefusalGroup {
  reason: RefusalReason;
  title: string;
  /**
   * The heading's own line, where the whole group has one thing to say.
   *
   * The slot group's is `NO_ROUTE_CAPACITY` — **the user's own sentence**
   * (2026-08-28), which every surface that greys for the slot clause prints
   * identically or it is two facts. Said once over the group rather than
   * repeated down a list of forty pairs that are all refused for it.
   */
  note: string | null;
  rows: { row: RouteReadingRow; sentence: string }[];
}

/**
 * Every pair the gate refused, under the heading of the clause that refused it.
 *
 * The user's own instruction: *"trade routes that are unavailable shouldn't
 * show in the main screen, they should be tucked away in an 'unavailable
 * routes' tab."* — with the reason each one is unavailable, which is the
 * reducer's own sentence and never a copy of it.
 */
export function refusalGroups(ctx: TradeContext): RefusalGroup[] {
  const order: RefusalReason[] = ['reach', 'war', 'running', 'slots'];
  const buckets = new Map<RefusalReason, RefusalGroup['rows']>();
  for (const row of ctx.rows) {
    if (row.available) continue;
    const reason = refusalReason(ctx, row);
    const rows = buckets.get(reason) ?? [];
    rows.push({ row, sentence: row.refusal ?? 'This route cannot be sent' });
    buckets.set(reason, rows);
  }
  const groups: RefusalGroup[] = [];
  for (const reason of order) {
    const rows = buckets.get(reason);
    if (rows === undefined || rows.length === 0) continue;
    groups.push({
      reason,
      title: REFUSAL_TITLES[reason],
      note: reason === 'slots' ? NO_ROUTE_CAPACITY : null,
      rows,
    });
  }
  return groups;
}

// --- the one command this sheet sends ---------------------------------------

/**
 * The `buyRoute` a Send would dispatch, or `null` when it cannot.
 *
 * The pure half of the button, split out for this file's stated reason: "which
 * pair, in which mode" is the part of Send that can be quietly wrong. The two
 * conditions are exactly the ones the card is drawn under — the gate takes this
 * mode of this pair, and the purse can pay the price — so a card with a live
 * button is a card this answers for.
 *
 * **The mode is named, always.** The sheet never leans on the command's
 * absent-mode default, because that default is a fact about the path and the
 * card is drawn from the whole gate; a card offering one mode sends that one, a
 * card offering two sends whichever side of the toggle is pressed.
 */
export function buyCommandFor(
  ctx: TradeContext,
  row: RouteReadingRow,
  mode: RouteMode,
): { fromCityId: number; toCityId: number; mode: RouteMode } | null {
  if (!row.modes.includes(mode)) return null;
  if (ctx.gold < ctx.reading.price) return null;
  return { fromCityId: row.from.id, toCityId: row.to.id, mode };
}

/** What a mode's side of the toggle says. Plain words, the user's own. */
export const MODE_LABEL: Readonly<Record<RouteMode, string>> = {
  land: 'Land',
  sea: 'Sea',
};

/**
 * A route's ledger as the title attribute of whatever carries it.
 *
 * The platform's own tooltip rather than an `infoCard`, for the reason the
 * pantheon wheel's houses use one: this is a *screen* and a hover card inside a
 * screen is a second modal surface. The lines are the fold's own sentences,
 * which already name the partner and what was counted.
 */
export function routeLedgerTitle(lines: readonly RouteYieldLine[]): string {
  if (lines.length === 0) return 'This route pays nothing yet';
  return lines
    .map((line) => {
      const parts = [
        line.food === 0 ? '' : `${signedFigure(line.food)}${YIELD_GLYPH.food}`,
        line.production === 0 ? '' : `${signedFigure(line.production)}${YIELD_GLYPH.production}`,
        line.gold === 0 ? '' : `${signedFigure(line.gold)}${YIELD_GLYPH.gold}`,
        line.science === 0 ? '' : `${signedFigure(line.science)}${YIELD_GLYPH.science}`,
        line.culture === 0 ? '' : `${signedFigure(line.culture)}${YIELD_GLYPH.culture}`,
      ].filter((part) => part.length > 0);
      return `${line.source} ${parts.join(' ')}`;
    })
    .join('\n');
}

/**
 * How many of each tab's things there are — the figure printed on the cut tab.
 *
 * One function so the four counts are taken from the one reading in one place;
 * a tab whose number disagreed with its own pane would be worse than no number.
 */
export function tabCounts(
  ctx: TradeContext,
  groups: readonly PurposeGroup[],
): Readonly<Record<TradeTabId, number>> {
  let all = 0;
  let unavailable = 0;
  for (const row of ctx.rows) {
    if (row.available) all += 1;
    else unavailable += 1;
  }
  let recommended = 0;
  for (const group of groups) recommended += group.rows.length;
  return {
    recommended,
    running: runningRoutes(ctx.state, ctx.seat).length,
    all,
    unavailable,
  };
}

// --- the screen -------------------------------------------------------------

export interface TradeScreen {
  readonly isOpen: boolean;
  /**
   * Opens the sheet. The argument is kept for the four doors that still name a
   * caravan (the unit sheet's link, chiefly) and is ignored: since R1 a route is
   * **bought**, not carried by a piece the player picked, so there is no chooser
   * left to honour. Dropping the parameter would be a change to every caller.
   */
  open(chooserUnitId?: number | null): void;
  close(): void;
  toggle(): void;
  /** The state changed. Repaints iff the sheet is up and the reading moved. */
  refresh(): void;
  dispose(): void;
}

export interface TradeScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /**
   * Hires the route. The sheet never mutates state itself.
   *
   * Two ids and a mode, because the command is `buyRoute { fromCityId,
   * toCityId, mode }` (batch R1): there is no unit to name — the caravan is
   * minted in the origin's gates by the reducer with the route already on it.
   */
  buyRoute: (fromCityId: number, toCityId: number, mode: RouteMode) => void;
  /** Flips a route's auto-renew flag. */
  setAutoResend: (unitId: number, on: boolean) => void;
  /** Ends a route now and frees the slot. */
  cancelRoute: (unitId: number) => void;
  /** Brings a cell into view. `controls.panTo`, which is `MapView`'s to drive. */
  panTo: (cell: { col: number; row: number }) => void;
  onOpen?: () => void;
}

function button(className: string, label: string): HTMLButtonElement {
  const node = element('button', className, label) as HTMLButtonElement;
  node.type = 'button';
  return node;
}

/**
 * A composed figure written into an element **with every voice in its own ink**
 * — the whole of R3's first half (the user, 2026-09-09: *"colorize the yields
 * in the trade screen"*).
 *
 * One run per voice (`tradeFigureRuns`), each in a `.trade-yield.is-⟨voice⟩`
 * span, and the class carries the colour for the number *and* the mark at once:
 * a drawn mark is `currentColor`-masked, so it takes the ink of whatever span it
 * sits in. There is no second rule for the glyph, and there cannot be one to
 * disagree with.
 *
 * The separator between runs is a plain space **outside** the spans, so nothing
 * coloured has a space hanging off its front — and on the cards, where
 * `.trade-yields` is a flex row, a whitespace-only run is not a flex item at all
 * and the `gap` does the spacing it always did.
 *
 * The class stays on every run, voiced or not, so "nothing yet" is set in the
 * same mono as a figure rather than falling back to the copy face.
 */
function setTradeFigures(node: HTMLElement, text: string): void {
  const fragment = document.createDocumentFragment();
  tradeFigureRuns(text).forEach((run, index) => {
    if (index > 0) fragment.append(document.createTextNode(' '));
    const span = element('span', run.key === null ? 'trade-yield' : `trade-yield is-${run.key}`);
    setYieldText(span, run.text);
    fragment.append(span);
  });
  node.replaceChildren(fragment);
}

/** A figure in mono, each voice in its own ink. See `setTradeFigures`. */
function figuresNode(className: string, text: string): HTMLElement {
  const node = element('span', className);
  setTradeFigures(node, text);
  return node;
}

export function createTradeScreen(options: TradeScreenOptions): TradeScreen {
  const { overlay, body, closeButton, trigger } = options;

  /** Which cut tab is bound into the leaf. Per-opening state, like `hidden`. */
  let tab: TradeTabId = 'recommended';
  /** The mode a pair is currently read in, where the player has said. Per opening. */
  const modeChoice = new Map<string, RouteMode>();
  let filters: RouteFilters = { ...ALL_ROUTE_FILTERS };
  let sort: RouteSortKey = 'pay';
  /** Which origin folds are open on the All-routes tab. */
  const openOrigins = new Set<number>();
  /**
   * **The fingerprint of what is on the paper** (the `MapView.noteStateChanged`
   * idiom, one system over).
   *
   * The sheet's rows are rebuilt only when this string moves, which is the
   * second half of the performance ruling: `readRoutes` is memoised on the
   * revision, so a redraw that changed nothing used to still tear down and
   * rebuild a hundred rows of DOM. The revision is in it because the reading
   * is; everything else in it is a control on this sheet.
   */
  let painted: string | null = null;

  function pairKey(from: number, to: number): string {
    return `${from}:${to}`;
  }

  function chosenMode(row: RouteReadingRow): RouteMode {
    const said = modeChoice.get(pairKey(row.from.id, row.to.id));
    if (said !== undefined && row.modes.includes(said)) return said;
    return bestMode(row) ?? 'land';
  }

  function fingerprint(state: GameState, seat: number): string {
    const said = [...modeChoice.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return [
      state.revision,
      seat,
      tab,
      sort,
      `${String(filters.own)}${String(filters.abroad)}${String(filters.land)}${String(filters.sea)}`,
      [...openOrigins].sort((a, b) => a - b).join(','),
      said.map(([key, mode]) => `${key}=${mode}`).join(','),
    ].join('|');
  }

  // --- the masthead ---------------------------------------------------------

  /**
   * "The Caravans of Crimson", the purse, and the idle slots — **and no turn**
   * (the user's mark of 2026-09-09: no clock line in a masthead).
   *
   * The two figures beside the title are the two the whole sheet is gated on:
   * what a route costs against what is in the purse, and whether there is a
   * slot to put one in.
   */
  function drawMasthead(ctx: TradeContext): HTMLElement {
    const head = element('div', 'trade-masthead');
    const title = element('h3', 'trade-masthead-title', 'The Caravans ');
    title.append(element('em', '', `of ${ctx.seatName}`));
    head.append(title);
    const idle = Math.max(0, ctx.reading.slots - ctx.reading.used);
    const purse = element('p', 'trade-purse');
    purse.append(element('b', '', figure(ctx.gold)));
    purse.append(document.createTextNode(' gold in the purse · '));
    purse.append(element('b', '', figure(idle)));
    purse.append(document.createTextNode(` of ${figure(ctx.reading.slots)} slots idle`));
    head.append(purse);
    return head;
  }

  /**
   * The ledger's cut tabs: parchment steps with an ink edge, a **gilt inner
   * edge** on each, a hedera that turns vermilion on the open one, and the ink
   * rule alone beneath (the user's final mark: no gilt hairline under the rule
   * — the gilt is the trade sheet's one accent and it lives on the tabs).
   */
  function drawIndex(counts: Readonly<Record<TradeTabId, number>>): HTMLElement {
    const index = element('div', 'trade-index');
    index.setAttribute('role', 'tablist');
    index.setAttribute('aria-label', 'The ledger’s index');
    for (const entry of TRADE_TABS) {
      const node = button('trade-tab', entry.label);
      node.setAttribute('role', 'tab');
      node.setAttribute('aria-selected', String(tab === entry.id));
      node.dataset.pane = entry.id;
      node.append(element('span', 'trade-tab-n', figure(counts[entry.id])));
      node.addEventListener('click', () => {
        tab = entry.id;
        draw();
      });
      index.append(node);
    }
    return index;
  }

  // --- one card -------------------------------------------------------------

  /**
   * The Land | Sea control, or a single chip where one mode is all there is.
   *
   * The user's final mark of record: a mode is **not prose** anywhere on this
   * sheet. Pressing a side re-reads the card — the yields and the facts are the
   * fold for the chosen mode — which is done by writing the choice down and
   * repainting, so there is one place that decides what a card says and it is
   * `routeCard`.
   */
  function drawModeControl(row: RouteReadingRow, mode: RouteMode): HTMLElement {
    if (row.modes.length === 1) {
      const only = row.modes[0]!;
      const chip = element('span', `trade-chip is-${only}`, MODE_LABEL[only]);
      return chip;
    }
    const group = element('span', 'trade-mode');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'by land or by sea');
    for (const one of ROUTE_MODES) {
      const node = button('', MODE_LABEL[one]);
      const offered = row.modes.includes(one);
      node.setAttribute('aria-pressed', String(offered && one === mode));
      node.disabled = !offered;
      if (offered) {
        node.addEventListener('click', () => {
          modeChoice.set(pairKey(row.from.id, row.to.id), one);
          draw();
        });
      }
      group.append(node);
    }
    return group;
  }

  /** Send, and the price under it. The one write this sheet makes. */
  function drawSend(ctx: TradeContext, row: RouteReadingRow, mode: RouteMode): HTMLElement {
    const foot = element('div', 'trade-card-foot');
    const command = buyCommandFor(ctx, row, mode);
    const send = button('trade-send', 'Send');
    if (command === null) {
      send.disabled = true;
      send.title = ctx.gold < ctx.reading.price
        ? `The hire costs ${figure(ctx.reading.price)} gold`
        : 'This route cannot be sent by that way';
    } else {
      send.title = `Hire a caravan from ${cityDisplayName(ctx.state, row.from)} for ${figure(ctx.reading.price)} gold`;
      send.addEventListener('click', () => {
        options.buyRoute(command.fromCityId, command.toCityId, command.mode);
        // The decision is made and what a player wants next is to watch the cart
        // leave — and the caravan is minted in the origin's gates, so that is
        // where the camera goes.
        close();
        options.panTo({ col: row.from.col, row: row.from.row });
      });
    }
    foot.append(send);
    const price = element('span', 'trade-price', figure(ctx.reading.price));
    price.append(element('small', '', 'gold'));
    foot.append(price);
    return foot;
  }

  /** The pair, the far town in its own empire's ink when it is not ours. */
  function drawPair(card: RouteCard): HTMLElement {
    const pair = element('div', 'trade-card-pair');
    pair.append(document.createTextNode(card.fromName));
    pair.append(element('span', 'trade-arrow', '→'));
    pair.append(
      card.rivalName === null
        ? document.createTextNode(card.toName)
        : element('span', 'trade-rival', card.toName),
    );
    return pair;
  }

  function drawFacts(facts: readonly TradeFact[]): HTMLElement {
    const line = element('div', 'trade-facts');
    for (const fact of facts) {
      const item = element('span', 'trade-fact');
      item.append(element('span', 'trade-fact-k', fact.key));
      item.append(document.createTextNode(fact.text));
      line.append(item);
    }
    return line;
  }

  function drawCard(ctx: TradeContext, row: RouteReadingRow, mode: RouteMode, best: boolean): HTMLElement {
    const card = routeCard(ctx, row, mode);
    const node = element('article', best ? 'trade-card is-best' : 'trade-card');
    node.dataset.pair = pairKey(row.from.id, row.to.id);
    node.title = routeLedgerTitle(card.lines);
    node.append(drawPair(card));

    const chips = element('div', 'trade-card-chips');
    chips.append(drawModeControl(row, mode));
    if (card.rivalName !== null) {
      chips.append(element('span', 'trade-chip is-abroad', card.rivalName));
    } else {
      chips.append(element('span', 'trade-chip', 'own'));
    }
    chips.append(figuresNode('trade-yields', card.figures));
    node.append(chips);

    node.append(drawFacts(card.facts));
    node.append(drawSend(ctx, row, mode));
    return node;
  }

  // --- the four panes -------------------------------------------------------

  function drawRecommended(ctx: TradeContext, groups: readonly PurposeGroup[]): HTMLElement {
    const pane = element('section', 'trade-pane');
    if (groups.length === 0) {
      pane.append(
        element(
          'p',
          'sc-none',
          'No caravan can set out today. The other tabs say what is running and why the rest are shut.',
        ),
      );
      return pane;
    }
    for (const group of groups) {
      const block = element('div', 'trade-purpose');
      const head = element('header', 'trade-purpose-head');
      const title = element('h4', 'trade-purpose-title', group.title);
      title.append(element('small', '', group.blurb));
      head.append(title);
      block.append(head);
      const grid = element('div', 'trade-cards');
      group.rows.forEach((entry, index) => {
        grid.append(drawCard(ctx, entry.row, chosenModeIn(entry), index === 0));
      });
      block.append(grid);
      pane.append(block);
    }
    return pane;
  }

  /**
   * A recommended card's mode: the player's own choice if they have made one for
   * this pair, otherwise the mode the group picked it *for*.
   *
   * The group's own mode is the default rather than `bestMode` because a group
   * makes an argument about a mode — "Paves a road" is about a land cart — and
   * opening its card on the sea would be the heading disagreeing with the card
   * under it.
   */
  function chosenModeIn(entry: { row: RouteReadingRow; mode: RouteMode }): RouteMode {
    const said = modeChoice.get(pairKey(entry.row.from.id, entry.row.to.id));
    if (said !== undefined && entry.row.modes.includes(said)) return said;
    return entry.mode;
  }

  function drawRunning(ctx: TradeContext): HTMLElement {
    const pane = element('section', 'trade-pane');
    const rows = runningRoutes(ctx.state, ctx.seat);
    if (rows.length === 0) {
      pane.append(
        element(
          'p',
          'sc-none',
          'No caravan is on the road. A market opens a route; the purse hires one.',
        ),
      );
      return pane;
    }
    const wrap = element('div', 'trade-wrap');
    const table = element('table', 'trade-table');
    const head = element('tr');
    for (const label of ['Route', 'Mode', 'Road', 'Pays a turn', 'Turns left', '']) {
      head.append(element('th', label === 'Pays a turn' || label === 'Turns left' ? 'is-num' : undefined, label));
    }
    const thead = element('thead');
    thead.append(head);
    table.append(thead);
    const bodyRows = element('tbody');
    for (const route of rows) {
      const tr = element('tr', route.turnsLeft === 0 ? 'is-lapsed' : '');
      tr.title = routeLedgerTitle(route.lines);
      const name = element('td', '');
      const open = button('trade-linkish', '');
      open.append(document.createTextNode(`${route.fromName} → `));
      open.append(
        route.abroad
          ? element('span', 'trade-rival', route.toName)
          : document.createTextNode(route.toName),
      );
      open.title = 'Show me this caravan';
      open.addEventListener('click', () => {
        options.panTo({ col: route.col, row: route.row });
        close();
      });
      name.append(open);
      tr.append(name);
      // A running route's mode is settled: one chip, not a control offering a
      // choice that cannot be made.
      const mode = element('td', '');
      mode.append(element('span', `trade-chip is-${route.mode}`, MODE_LABEL[route.mode]));
      tr.append(mode);
      tr.append(element('td', 'is-num', route.mode === 'sea' ? '—' : 'laying'));
      const pays = element('td', 'is-num');
      setTradeFigures(pays, route.figures);
      tr.append(pays);
      tr.append(element('td', 'is-num', figure(route.turnsLeft)));

      const verbs = element('td', '');
      const auto = button(route.autoResend ? 'trade-send is-on' : 'trade-send is-quiet', '↻');
      auto.title = route.autoResend
        ? 'The caravan starts a fresh route when this one lapses'
        : 'Start a fresh route automatically when this one lapses';
      auto.setAttribute('aria-pressed', String(route.autoResend));
      auto.addEventListener('click', () => {
        options.setAutoResend(route.unitId, !route.autoResend);
        draw();
      });
      verbs.append(auto);
      // Renew is a fresh **hire** of the same pair, which is only a thing when
      // the ledger has a slot for it — the running one's slot comes free on the
      // Cancel beside it, or when the route lapses and the cart gets home.
      const again = ctx.rows.find(
        (row) => row.from.id === route.fromCityId && row.to.id === route.toCityId,
      );
      const mode2 = again === undefined ? null : chosenMode(again);
      const renewable =
        again !== undefined && mode2 !== null && buyCommandFor(ctx, again, mode2) !== null;
      const renew = button('trade-send', 'Renew');
      renew.disabled = !renewable;
      renew.title = renewable
        ? `Hire a second caravan on this pair for ${figure(ctx.reading.price)} gold`
        : 'There is no free slot for a second caravan on this pair';
      if (renewable && again !== undefined && mode2 !== null) {
        renew.addEventListener('click', () => {
          options.buyRoute(again.from.id, again.to.id, mode2);
          close();
          options.panTo({ col: again.from.col, row: again.from.row });
        });
      }
      verbs.append(renew);
      const cancel = button('trade-send is-quiet', 'Cancel');
      cancel.title = 'End the route now and free the slot';
      cancel.addEventListener('click', () => {
        options.cancelRoute(route.unitId);
        draw();
      });
      verbs.append(cancel);
      tr.append(verbs);
      bodyRows.append(tr);
    }
    table.append(bodyRows);
    wrap.append(table);
    pane.append(wrap);
    return pane;
  }

  function drawFilters(): HTMLElement {
    const bar = element('div', 'trade-filters');
    bar.append(element('span', '', 'Show'));
    const chip = (label: string, on: boolean, flip: () => void): void => {
      const node = button(on ? 'trade-chip is-on' : 'trade-chip', label);
      node.setAttribute('aria-pressed', String(on));
      node.addEventListener('click', () => {
        flip();
        draw();
      });
      bar.append(node);
    };
    chip('own', filters.own, () => {
      filters = { ...filters, own: !filters.own };
    });
    chip('abroad', filters.abroad, () => {
      filters = { ...filters, abroad: !filters.abroad };
    });
    chip('land', filters.land, () => {
      filters = { ...filters, land: !filters.land };
    });
    chip('sea', filters.sea, () => {
      filters = { ...filters, sea: !filters.sea };
    });
    bar.append(element('span', '', '· sort by'));
    for (const entry of ROUTE_SORTS) {
      const node = button(sort === entry.key ? 'trade-chip is-on' : 'trade-chip', entry.label);
      node.setAttribute('aria-pressed', String(sort === entry.key));
      node.addEventListener('click', () => {
        sort = entry.key;
        draw();
      });
      bar.append(node);
    }
    return bar;
  }

  function drawAll(ctx: TradeContext): HTMLElement {
    const pane = element('section', 'trade-pane');
    pane.append(drawFilters());
    const groups = originGroups(ctx, filters, sort, chosenMode);
    if (groups.length === 0) {
      pane.append(element('p', 'sc-none', 'No pair survives those chips.'));
      return pane;
    }
    const idle = Math.max(0, ctx.reading.slots - ctx.reading.used);
    for (const group of groups) {
      const details = element('details', 'trade-origin') as HTMLDetailsElement;
      details.open = openOrigins.has(group.city.id);
      details.addEventListener('toggle', () => {
        if (details.open) openOrigins.add(group.city.id);
        else openOrigins.delete(group.city.id);
      });
      const summary = element('summary', '');
      summary.append(element('span', '', group.name));
      summary.append(
        element(
          'span',
          'trade-origin-count',
          `${figure(group.rows.length)} route${group.rows.length === 1 ? '' : 's'}`,
        ),
      );
      // The slot tally is the **empire's** ledger and not this town's — routes
      // are counted across the whole empire (`routeSlots`) — so the same figure
      // rides every fold, which is the honest thing rather than four different
      // numbers for one count.
      summary.append(
        element(
          'span',
          idle === 0 ? 'trade-origin-slots is-full' : 'trade-origin-slots',
          `${figure(idle)} of ${figure(ctx.reading.slots)} slots idle`,
        ),
      );
      details.append(summary);

      const wrap = element('div', 'trade-wrap');
      const table = element('table', 'trade-table');
      const head = element('tr');
      for (const label of ['To', 'Mode', 'Pays a turn', 'Road', 'Price', '']) {
        head.append(
          element(
            'th',
            label === 'Pays a turn' || label === 'Road' || label === 'Price' ? 'is-num' : undefined,
            label,
          ),
        );
      }
      const thead = element('thead');
      thead.append(head);
      table.append(thead);
      const rows = element('tbody');
      for (const entry of group.rows) {
        const card = routeCard(ctx, entry.row, entry.mode);
        const tr = element('tr', '');
        tr.title = routeLedgerTitle(card.lines);
        const to = element('td', '');
        to.append(
          card.rivalName === null
            ? document.createTextNode(card.toName)
            : element('span', 'trade-rival', card.toName),
        );
        tr.append(to);
        const mode = element('td', '');
        mode.append(drawModeControl(entry.row, entry.mode));
        tr.append(mode);
        const pays = element('td', 'is-num');
        setTradeFigures(pays, card.figures);
        tr.append(pays);
        // The road is its own column (the user's final mark), and it is a
        // figure: what a land cart would still have to pave, or nothing at all
        // for a sea crossing.
        tr.append(
          element(
            'td',
            'is-num',
            entry.mode === 'sea'
              ? '—'
              : entry.row.roadHexes === null || entry.row.roadHexes === 0
                ? 'laid'
                : `${figure(entry.row.roadHexes)} hexes`,
          ),
        );
        tr.append(element('td', 'is-num', figure(ctx.reading.price)));
        const verb = element('td', '');
        const command = buyCommandFor(ctx, entry.row, entry.mode);
        const send = button('trade-send', 'Send');
        if (command === null) {
          send.disabled = true;
          send.title = `The hire costs ${figure(ctx.reading.price)} gold`;
        } else {
          send.addEventListener('click', () => {
            options.buyRoute(command.fromCityId, command.toCityId, command.mode);
            close();
            options.panTo({ col: entry.row.from.col, row: entry.row.from.row });
          });
        }
        verb.append(send);
        tr.append(verb);
        rows.append(tr);
      }
      table.append(rows);
      wrap.append(table);
      details.append(wrap);
      pane.append(details);
    }
    return pane;
  }

  function drawUnavailable(ctx: TradeContext): HTMLElement {
    const pane = element('section', 'trade-pane');
    const groups = refusalGroups(ctx);
    if (groups.length === 0) {
      pane.append(element('p', 'sc-none', 'Every pair is open to you.'));
      return pane;
    }
    for (const group of groups) {
      const block = element('div', 'trade-reason');
      block.dataset.reason = group.reason;
      const title = element('h4', 'trade-reason-title', group.title);
      if (group.note !== null) title.append(element('small', '', group.note));
      block.append(title);
      const list = element('ul', 'trade-reason-list');
      for (const entry of group.rows) {
        const item = element('li', '');
        const pair = element('b', '');
        pair.append(
          document.createTextNode(
            `${cityDisplayName(ctx.state, entry.row.from)} → ${cityDisplayName(ctx.state, entry.row.to)}`,
          ),
        );
        item.append(pair);
        // The gate's own sentence, and it wears the wanting voice (the ruling of
        // 2026-09-08): every "you are missing X" on every surface is said in the
        // one vermilion italic. A group that already says it in the heading does
        // not say it again on forty rows — see `RefusalGroup.note`.
        if (group.note === null) {
          item.append(element('span', 'trade-reason-why wanting', entry.sentence));
        }
        list.append(item);
      }
      block.append(list);
      pane.append(block);
    }
    return pane;
  }

  // --- the paint ------------------------------------------------------------

  function draw(): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const mark = fingerprint(state, seat);
    // **Rows are rebuilt only when the reading moved** — the performance half of
    // the ruling. Everything the sheet draws is a function of this string, so a
    // repaint that would produce the same DOM is not taken.
    if (mark === painted) return;
    painted = mark;

    const ctx = tradeContext(state, seat);
    const groups = recommendedGroups(ctx);
    const counts = tabCounts(ctx, groups);

    body.replaceChildren();
    const sheet = element('div', 'trade-book');
    sheet.append(drawMasthead(ctx));
    sheet.append(drawIndex(counts));
    sheet.append(
      tab === 'recommended'
        ? drawRecommended(ctx, groups)
        : tab === 'running'
          ? drawRunning(ctx)
          : tab === 'all'
            ? drawAll(ctx)
            : drawUnavailable(ctx),
    );
    body.append(sheet);
  }

  /**
   * The frame (`modalShell.ts`) — the tenth sheet on it.
   *
   * What this one hangs on the shell is the **facts about one opening**: the
   * tab, the mode a pair is being read in, the chips and the folds are a picture
   * of a conversation and not of the empire, so a sheet reached from the bar
   * tomorrow starts from the sheet's own defaults. `onShow` forgets the
   * fingerprint as well, so a genuine opening always paints fresh paper.
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    onShow: () => {
      painted = null;
    },
    draw,
    onClose: () => {
      tab = 'recommended';
      modeChoice.clear();
      filters = { ...ALL_ROUTE_FILTERS };
      sort = 'pay';
      openOrigins.clear();
      painted = null;
    },
  });

  function close(): void {
    shell.close();
  }

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open(): void {
      shell.open();
    },
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
