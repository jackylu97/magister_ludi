/**
 * The Trade screen: every caravan on the road, and every road not yet taken.
 *
 * The fifth full-screen overlay and the third parchment one, and it is
 * deliberately the Religion sheet's sibling rather than a new language: same
 * bones (`.sc-*`), same split at the same breakpoint, same keyboard contract
 * (`hidden` is the whole of the screen state, Escape closes it, the × and a
 * click on the ground do the same, opening it closes whatever else was up).
 *
 * The split is the same division those two make — *what I have* against *what I
 * can do with it*. The left column is the empire's running routes and what they
 * are worth; the right pane is every pair a caravan could still join, grouped by
 * the town it would set out from.
 *
 * The screen *is* the verb now (2026-08-28)
 * -----------------------------------------
 * Trade used to have three surfaces and no screen, and then a screen beside a
 * board full of send plates armed from an unladen trader. The user's ruling
 * deleted the second half of that: *"the caravan has action 'start route' and
 * you choose from an available trade route in the trade screen (from any city).
 * Once chosen, the caravan teleports to the origin city and begins the route as
 * before. I want to remove all micromanagement of units."*
 *
 * So a row is no longer "a send from the town a caravan happens to be standing
 * in". It is a **pair**, offered on its own merits, and the caravan is a
 * resource the empire spends on it — which is why the gate the rows grey with is
 * `routeStartable` (slots, pair, path, range, a free centre: everything that is
 * about the two towns) rather than an error asked of a particular piece. The
 * piece is named on the row's hover and nowhere else, because *which* caravan is
 * an answer, not a question.
 *
 * Nothing here is a new rule
 * --------------------------
 * Every figure comes out of `trade.ts`: `explainRouteYield` for what a route
 * pays, `explainRouteYieldBetween` for what one *would* pay, `explainRouteSlots`
 * and `usedRouteSlots` for the capacity, `explainEmpireGold` for the four
 * empire-scale lines, `routeStartable` for every greyed row. A row's sentence is
 * the reducer's own — **never a copy wearing a route it is not carrying**, which
 * is the mistake `tradeLines.ts`' docblock records having made once already.
 *
 * The pure half of this file is everything above `createTradeScreen`, for
 * `figures.ts`' reason: this suite has no jsdom, and the half of a panel that
 * can be *quietly wrong* — a sort order, a greyed sentence, a total — has to be
 * a function somebody can call.
 */

import {
  type RouteYieldLine,
  type TradeGoldLine,
  empireGold,
  explainEmpireGold,
  explainRouteSlots,
  explainRouteYield,
  explainRouteYieldBetween,
  foldRouteYield,
  originCityOf,
  routeCities,
  routeIsLive,
  routeStartable,
  usedRouteSlots,
} from '../sim/trade';
import { UNIT_TYPE_IDS, type UnitTypeId, trades, unitDef } from '../sim/unitData';
import { gatingTech } from '../sim/tech';
import { techDef } from '../sim/techData';
import type { GameState, Unit } from '../sim/state';
import { cityDisplayName } from './cityDisplay';
import { YIELD_GLYPH, figure, signedFigure } from './figures';
import { NO_ROUTE_CAPACITY, hasFreeRouteSlot, routeFigures } from './tradeLines';
import { setYieldText } from './yieldMark';

// --- the running half -------------------------------------------------------

/** One caravan of this seat that is carrying a route. See `runningRoutes`. */
export interface RunningRoute {
  unitId: number;
  /** Where the piece is standing right now — the row's click pans here. */
  col: number;
  row: number;
  fromName: string;
  toName: string;
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
 * stands.
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
    const lines = explainRouteYield(state, unit);
    const fold = foldRouteYield(lines);
    const figures = routeFigures(fold);
    const turnsLeft = Math.max(0, route.expiresTurn - state.turn);
    const auto = route.autoResend ? ' · ↻ auto' : '';
    rows.push({
      unitId: unit.id,
      col: unit.col,
      row: unit.row,
      fromName,
      toName,
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
export function tradeLedger(state: GameState, playerId: number): TradeLedger {
  const lines: TradeLedgerLine[] = [];
  const routes = runningRoutes(state, playerId);
  for (const route of routes) {
    lines.push({
      source: `${route.fromName} ⇄ ${route.toName}`,
      gold: route.gold,
      figures: route.figures,
    });
  }
  for (const line of explainEmpireGold(state, playerId) as readonly TradeGoldLine[]) {
    lines.push({ source: line.source, gold: line.gold, figures: `${signedFigure(line.gold)}${YIELD_GLYPH.gold}` });
  }
  let total = 0;
  for (const route of routes) total += route.gold;
  total += empireGold(state, playerId);
  const slots = explainRouteSlots(state, playerId).reduce((sum, line) => sum + line.slots, 0);
  const used = usedRouteSlots(state, playerId);
  return { lines, total, used, slots, chip: `${figure(used)} / ${figure(slots)}` };
}

// --- the available half -----------------------------------------------------

/** One destination a caravan could be sent to from one origin. */
export interface TradeCandidate {
  cityId: number;
  name: string;
  food: number;
  production: number;
  gold: number;
  /** "+3🌾 +2⚙ +1💰", or "nothing yet". */
  figures: string;
  lines: RouteYieldLine[];
  /** True when a live route already joins this pair, in either direction. */
  running: boolean;
  /**
   * The reducer's own refusal, or `null`. **`routeStartable`'s sentence
   * verbatim** — the gate about the *pair* (a free slot, no route already
   * joining these two, a path, the range, a free centre to arrive on), asked
   * with no caravan in mind at all, because under the 2026-08-28 ruling the
   * caravan may be anywhere and is teleported to the origin.
   */
  error: string | null;
}

/** One of this seat's towns, and every partner a route could join it to. */
export interface TradeOrigin {
  cityId: number;
  name: string;
  col: number;
  row: number;
  candidates: TradeCandidate[];
}

/** The unit type that carries a route. Presence of `trades` is the marker. */
function traderType(): UnitTypeId | null {
  return UNIT_TYPE_IDS.find((type) => trades(unitDef(type))) ?? null;
}

/**
 * Every caravan of this seat that is standing free of a route, in `state.units`
 * order — which is what makes "the first idle trader" a fact about the state
 * rather than about who asked, exactly as every other sweep in this game is.
 */
export function idleTraders(state: GameState, playerId: number): Unit[] {
  return state.units.filter(
    (unit) =>
      unit.ownerId === playerId && unit.trade === undefined && trades(unitDef(unit.type)),
  );
}

/**
 * The caravan a Start would name: the **chooser** when the screen was opened
 * from a trader's own sheet, otherwise the **first idle trader** in `state.units`
 * order.
 *
 * One function rather than a conditional in the click handler, for this file's
 * stated reason: "which caravan" is the part of that button that can be quietly
 * wrong. The chooser is honoured only while it is still idle and still this
 * seat's — a screen left open across a resolution that ended somebody's route,
 * or across a plunder, must not dispatch a piece that has moved on.
 */
export function startingTrader(
  state: GameState,
  playerId: number,
  chooserUnitId: number | null,
): Unit | null {
  const idle = idleTraders(state, playerId);
  const chooser =
    chooserUnitId === null ? undefined : idle.find((unit) => unit.id === chooserUnitId);
  return chooser ?? idle[0] ?? null;
}

/**
 * "Caravan from Ur will be sent" — which piece a Start would move, on the row's
 * hover.
 *
 * The teleport is the whole reason this is a *note* and not a gate: the caravan
 * no longer has to be standing anywhere in particular, so the honest thing to
 * say is which one is about to be spent and where it is coming from. A caravan
 * out in the field says so rather than naming a town it is only near.
 */
export function starterNote(state: GameState, trader: Unit | null): string | null {
  if (trader === null) return null;
  const home = originCityOf(state, trader);
  return home === null
    ? 'A caravan in the field will be sent'
    : `Caravan from ${cityDisplayName(state, home)} will be sent`;
}

/**
 * "Build a trader (Currency) to start a route.", or `null` when one is standing
 * idle somewhere.
 *
 * **One line at the top of the pane**, not one per origin group. The old screen
 * said "no caravan here — the nearest idle one is in Ur" on every town without a
 * piece on it, which was true of a rule that no longer exists: a route is
 * started from the screen and the caravan comes to it. The only fact left worth
 * saying is that the empire has no caravan at all, and the useful half of that
 * is the technology.
 */
export function noTraderNote(state: GameState, playerId: number): string | null {
  if (idleTraders(state, playerId).length > 0) return null;
  const type = traderType();
  const gate = type === null ? null : gatingTech('unit', type);
  const named = type === null ? 'caravan' : unitDef(type).name.toLowerCase();
  return gate === null
    ? `Build a ${named} to start a route.`
    : `Build a ${named} (${techDef(gate).name}) to start a route.`;
}

/**
 * A row's refusal: `routeStartable`'s sentence, **except** for the slot clause.
 *
 * The substitution is exact rather than a guess, and that is the whole reason it
 * is safe. `startRouteError` asks about the slots *before* the pair, the path
 * and the range (`trade.ts`), so a full ledger is the answer for every row and
 * only for a full ledger — which means "is a slot free" decides the swap with no
 * prose read at all. See `NO_ROUTE_CAPACITY`.
 */
export function startableError(
  state: GameState,
  playerId: number,
  fromCityId: number,
  toCityId: number,
): string | null {
  const problem = routeStartable(state, playerId, fromCityId, toCityId);
  if (problem === null) return null;
  return hasFreeRouteSlot(state, playerId) ? problem : NO_ROUTE_CAPACITY;
}

/** Is a live route already joining these two towns, either way round? */
function pairIsRunning(state: GameState, playerId: number, from: number, to: number): boolean {
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const route = unit.trade;
    if (route === undefined) continue;
    const joins =
      (route.from === from && route.to === to) || (route.from === to && route.to === from);
    if (joins && routeIsLive(state, unit)) return true;
  }
  return false;
}

/**
 * Every town of this seat, in founding order, with every partner a route could
 * be started to from it.
 *
 * Candidates are sorted **gold, then food, then production**, descending — the
 * brief's order and the honest one: the gold is the empire's, and the food and
 * the hammers are what **that candidate**, as the route's destination, would
 * bank in its own basket (2026-08-27: the origin's buildings set the figure,
 * the destination banks it) — so a player scanning a column is scanning for the
 * partner most worth feeding.
 *
 * A pair the empire is already running keeps its row and is marked rather than
 * dropped: "Nippur is the one already paying you" is the answer to why it is not
 * on offer, and a row that vanished would make that a thing a player deduces.
 */
export function tradeOrigins(state: GameState, playerId: number): TradeOrigin[] {
  const towns = state.cities.filter((city) => city.ownerId === playerId);
  const origins: TradeOrigin[] = [];
  for (const city of towns) {
    const candidates: TradeCandidate[] = [];
    for (const other of towns) {
      if (other.id === city.id) continue;
      const lines = explainRouteYieldBetween(state, city, other);
      const fold = foldRouteYield(lines);
      candidates.push({
        cityId: other.id,
        name: cityDisplayName(state, other),
        ...fold,
        figures: routeFigures(fold),
        lines,
        running: pairIsRunning(state, playerId, city.id, other.id),
        // The reducer's own gate about the *pair*. No unit is named because
        // none needs to be: the caravan is teleported to the origin, so which
        // one it is cannot change the answer. See `TradeCandidate`.
        error: startableError(state, playerId, city.id, other.id),
      });
    }
    candidates.sort(
      (a, b) => b.gold - a.gold || b.food - a.food || b.production - a.production,
    );
    origins.push({
      cityId: city.id,
      name: cityDisplayName(state, city),
      col: city.col,
      row: city.row,
      candidates,
    });
  }
  return origins;
}

/**
 * The `startRoute` a row would dispatch, or `null` when the row cannot dispatch
 * one.
 *
 * The pure half of the Start button, split out for this file's stated reason:
 * "which caravan, from which town, to which town" is the part of that button
 * that can be quietly wrong, and it is a function somebody can call rather than
 * a closure inside a click handler. The two conditions are exactly the ones the
 * row is drawn under — the empire has an idle caravan, and the reducer is not
 * refusing this pair — so a row with a button is a row this answers for.
 */
export function startCommandFor(
  origin: TradeOrigin,
  candidate: TradeCandidate,
  trader: Unit | null,
): { unitId: number; fromCityId: number; toCityId: number } | null {
  if (trader === null) return null;
  if (candidate.error !== null) return null;
  return { unitId: trader.id, fromCityId: origin.cityId, toCityId: candidate.cityId };
}

// --- the pane's two controls: sort, and filter by origin ---------------------

/**
 * One offered pair, flattened out of its group.
 *
 * The **row model** the sort and the filter are functions of (user, 2026-08-28),
 * and flat on purpose: a comparator whose tie-break is "the origin's name, then
 * the destination's" needs both names in one object, and a sort written against
 * a nested shape would either be a loop per group or a comparator that cannot
 * see half of what it is breaking ties on. The grouping is put back afterwards
 * (`groupRouteRows`) from the origins' own founding order, which is why sorting
 * *within* a group and sorting the flat list are the same operation here.
 */
export interface TradeRouteRow {
  origin: TradeOrigin;
  candidate: TradeCandidate;
}

/** Every pair on offer, flattened in origin (founding) then candidate order. */
export function tradeRouteRows(origins: readonly TradeOrigin[]): TradeRouteRow[] {
  const rows: TradeRouteRow[] = [];
  for (const origin of origins) {
    for (const candidate of origin.candidates) rows.push({ origin, candidate });
  }
  return rows;
}

/** The four clickable columns. `total` is the three summed, not a fourth voice. */
export type RouteSortKey = 'food' | 'production' | 'gold' | 'total';

export type SortDirection = 'desc' | 'asc';

/** What one column reads on one row. `total` is the sum and nothing else. */
export function routeRowValue(row: TradeRouteRow, key: RouteSortKey): number {
  const { food, production, gold } = row.candidate;
  if (key === 'total') return food + production + gold;
  return key === 'food' ? food : key === 'production' ? production : gold;
}

/**
 * The rows in the order a column header asks for, or the sheet's own default.
 *
 * Pure, returns a new array, and **total** — every comparison falls through to
 * the origin's name, then the destination's, then their ids — so the order is a
 * function of the rows and never of the sort algorithm's stability. Names are
 * compared with `<`/`>` rather than `localeCompare`, which is locale-dependent
 * and would put two players' screens in different orders.
 *
 * `key: null` is the default and is the one the screen opens in: **gold, then
 * food, then production**, descending, because the gold is the empire's and a
 * player scanning a column is scanning for the biggest number that reaches the
 * treasury. `direction` is not consulted for it — the default is an order, not
 * a column.
 *
 * A **greyed row keeps its place**. There is deliberately no clause sinking a
 * refused pair to the bottom: "Nippur would be worth +4💰 and it is one turn too
 * far" is the argument for a road, and a row that fell out of the ranking would
 * make the case it is making impossible to see.
 */
export function sortRouteRows(
  rows: readonly TradeRouteRow[],
  key: RouteSortKey | null,
  direction: SortDirection,
): TradeRouteRow[] {
  const sign = direction === 'asc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === null) {
      const byGold = b.candidate.gold - a.candidate.gold;
      if (byGold !== 0) return byGold;
      const byFood = b.candidate.food - a.candidate.food;
      if (byFood !== 0) return byFood;
      const byProduction = b.candidate.production - a.candidate.production;
      if (byProduction !== 0) return byProduction;
    } else {
      const byKey = routeRowValue(b, key) - routeRowValue(a, key);
      if (byKey !== 0) return sign * byKey;
    }
    if (a.origin.name !== b.origin.name) return a.origin.name < b.origin.name ? -1 : 1;
    if (a.candidate.name !== b.candidate.name) return a.candidate.name < b.candidate.name ? -1 : 1;
    return a.origin.cityId - b.origin.cityId || a.candidate.cityId - b.candidate.cityId;
  });
}

/** Only the rows setting out from this town, or all of them for `null`. */
export function filterRouteRows(
  rows: readonly TradeRouteRow[],
  originId: number | null,
): TradeRouteRow[] {
  if (originId === null) return [...rows];
  return rows.filter((row) => row.origin.cityId === originId);
}

/**
 * The rows back in their groups, in the origins' own founding order.
 *
 * The inverse of `tradeRouteRows`, and the reason the sort can be one pass over
 * a flat list: a group's rows come out in the order the sort left them, so
 * "sorting applies within the shown groups" is a consequence rather than a
 * second implementation. A town every row was filtered out of is dropped rather
 * than drawn empty.
 */
export function groupRouteRows(
  origins: readonly TradeOrigin[],
  rows: readonly TradeRouteRow[],
): { origin: TradeOrigin; rows: TradeRouteRow[] }[] {
  const groups: { origin: TradeOrigin; rows: TradeRouteRow[] }[] = [];
  for (const origin of origins) {
    const own = rows.filter((row) => row.origin.cityId === origin.cityId);
    if (own.length > 0) groups.push({ origin, rows: own });
  }
  return groups;
}

// --- the screen -------------------------------------------------------------

export interface TradeScreen {
  readonly isOpen: boolean;
  /**
   * Opens the screen, optionally naming the caravan that asked for it.
   *
   * The **chooser** is the trader whose sheet said "Start route" — every Start
   * on the screen will send that piece rather than whichever one happens to be
   * first. Opened from the bar, the chip or a city panel there is no chooser and
   * the first idle caravan is spent; either way the row says which
   * (`starterNote`).
   */
  open(chooserUnitId?: number | null): void;
  close(): void;
  toggle(): void;
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
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
   * Starts the route. The screen never mutates state itself.
   *
   * Three ids because the command is `startRoute { unitId, fromCityId,
   * toCityId }`: the caravan may be standing anywhere, so the origin is *named*
   * rather than read off the piece's hex.
   */
  startRoute: (unitId: number, fromCityId: number, toCityId: number) => void;
  /** Flips a route's auto-resend flag. */
  setAutoResend: (unitId: number, on: boolean) => void;
  /** Ends a route now and frees the slot. */
  cancelRoute: (unitId: number) => void;
  /** Brings a cell into view. `controls.panTo`, which is `MapView`'s to drive. */
  panTo: (cell: { col: number; row: number }) => void;
  onOpen?: () => void;
}

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, label: string): HTMLButtonElement {
  const node = element('button', className, label) as HTMLButtonElement;
  node.type = 'button';
  return node;
}

/**
 * The four sortable columns, in the order they are drawn.
 *
 * `label` wears the glyph because the column is two characters wide and the
 * word will not fit; `name` is the word, for the header's `title` and for a
 * screen reader. The glyphs here are **typed**, not drawn — a header is a
 * `title` attribute's anchor and the marks are printed in the cells below it,
 * which is `figures.ts`' register exactly.
 */
const SORT_COLUMNS: readonly { key: RouteSortKey; label: string; name: string }[] = [
  { key: 'food', label: YIELD_GLYPH.food, name: 'food' },
  { key: 'production', label: YIELD_GLYPH.production, name: 'production' },
  { key: 'gold', label: YIELD_GLYPH.gold, name: 'gold' },
  { key: 'total', label: 'Σ', name: 'the three together' },
];

/**
 * A route's ledger as the title attribute of whatever carries it.
 *
 * The platform's own tooltip rather than an `infoCard`, for the reason the
 * pantheon wheel's houses use one: this is a *screen* and a hover card inside a
 * screen is a second modal surface. The lines are `explainRouteYield`'s own
 * sentences, which already name the partner and what was counted.
 */
export function routeLedgerTitle(lines: readonly RouteYieldLine[]): string {
  if (lines.length === 0) return 'This route pays nothing yet';
  return lines
    .map((line) => {
      const parts = [
        line.food === 0 ? '' : `${signedFigure(line.food)}${YIELD_GLYPH.food}`,
        line.production === 0 ? '' : `${signedFigure(line.production)}${YIELD_GLYPH.production}`,
        line.gold === 0 ? '' : `${signedFigure(line.gold)}${YIELD_GLYPH.gold}`,
      ].filter((part) => part.length > 0);
      return `${line.source} ${parts.join(' ')}`;
    })
    .join('\n');
}

export function createTradeScreen(options: TradeScreenOptions): TradeScreen {
  const { overlay, body, closeButton, trigger } = options;

  /**
   * The caravan whose sheet opened this, or `null`.
   *
   * Screen state, exactly like `hidden` is: it is a fact about *this opening*
   * and is dropped when the screen closes, so a player who reaches the screen
   * from the bar next time is not still spending a piece they picked minutes
   * ago. It is a *preference*, never a gate — `startingTrader` falls back to the
   * first idle caravan the moment this one is no longer idle.
   */
  let chooserUnitId: number | null = null;
  /** `null` is the sheet's own gold → food → production order. See `sortRouteRows`. */
  let sortKey: RouteSortKey | null = null;
  let sortDirection: SortDirection = 'desc';
  /** The town whose group is shown alone, or `null` for all of them. */
  let originFilter: number | null = null;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function setExpanded(): void {
    trigger?.setAttribute('aria-expanded', String(isOpen()));
  }

  /** The left column: what is on the road, and what the empire is earning by it. */
  function drawRunning(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'sc-column trade-running');
    const ledger = tradeLedger(state, seat);
    block.append(
      element('p', 'eyebrow sc-eyebrow', `routes · ${ledger.chip}`),
    );

    // The column's two parts, exactly as the Statecraft sheet's: the routes
    // scroll and the foot does not. A ledger that scrolled away with the rows
    // above it would be a total a player has to go looking for.
    const scroller = element('div', 'sc-column-body');
    block.append(scroller);

    const rows = runningRoutes(state, seat);
    if (rows.length === 0) {
      scroller.append(
        element(
          'p',
          'sc-none',
          'No caravan is on the road. A market opens a route; a trader carries it.',
        ),
      );
    }
    for (const route of rows) {
      const card = element('article', route.turnsLeft === 0 ? 'trade-row is-lapsed' : 'trade-row');
      card.title = routeLedgerTitle(route.lines);
      const open = button('trade-row-open', '');
      open.append(element('span', 'trade-row-pair', `${route.fromName} ⇄ ${route.toName}`));
      const figures = element('span', 'trade-row-figures');
      setYieldText(figures, route.figures);
      open.append(figures);
      open.append(
        element(
          'span',
          'trade-row-clock',
          route.turnsLeft === 0
            ? 'lapsed · walking home'
            : `${figure(route.turnsLeft)} turns${route.autoResend ? ' · ↻ auto' : ''}`,
        ),
      );
      open.title = 'Show me this caravan';
      open.addEventListener('click', () => {
        options.panTo({ col: route.col, row: route.row });
        close();
      });
      card.append(open);

      const verbs = element('div', 'trade-row-verbs');
      const auto = button(
        route.autoResend ? 'btn btn-second btn-tiny' : 'btn btn-quiet btn-tiny',
        route.autoResend ? 'Auto-resend ✓' : 'Auto-resend',
      );
      auto.title = route.autoResend
        ? 'The caravan starts a fresh route when this one lapses'
        : 'Start a fresh route automatically when this one lapses';
      auto.addEventListener('click', () => {
        options.setAutoResend(route.unitId, !route.autoResend);
        draw();
      });
      const cancel = button('btn btn-quiet btn-tiny', 'Cancel');
      cancel.title = 'End the route now and free the slot';
      cancel.addEventListener('click', () => {
        options.cancelRoute(route.unitId);
        draw();
      });
      verbs.append(auto, cancel);
      card.append(verbs);
      scroller.append(card);
    }

    // The foot: the capacity, then the four empire-scale lines and the fold. The
    // whole of `tradeLedger` under a double rule, which is what makes the chip's
    // hover and this column the same arithmetic.
    const foot = element('div', 'trade-foot');
    foot.append(
      element(
        'p',
        'hint',
        `${figure(ledger.used)} of ${figure(ledger.slots)} route${ledger.slots === 1 ? '' : 's'} running`,
      ),
    );
    const list = element('ul', 'meter-lines ledger');
    for (const line of explainEmpireGold(state, seat)) {
      const item = element('li', 'meter-line');
      item.append(element('span', 'meter-line-source', line.source));
      item.append(element('span', 'meter-line-value', signedFigure(line.gold)));
      list.append(item);
    }
    if (list.childElementCount > 0) foot.append(list);
    const total = element('div', 'meter-total ledger-total');
    total.append(element('span', 'meter-line-source', 'Treasury, per turn'));
    const value = element('span', 'meter-line-value');
    setYieldText(value, `${signedFigure(ledger.total)}${YIELD_GLYPH.gold}`);
    total.append(value);
    foot.append(total);
    block.append(foot);
    return block;
  }

  /**
   * The chips that pick which town's routes are shown — "All" and one per town,
   * in founding order.
   *
   * Chips rather than a `<select>`, and the on/off dress is the one this very
   * screen already uses for Auto-resend (`btn-second` when it is the answer,
   * `btn-quiet` when it is not), so a player meets one toggle idiom on this
   * sheet rather than two. `aria-pressed` because they are a set of toggles and
   * exactly one is on.
   */
  function drawOriginFilter(origins: readonly TradeOrigin[]): HTMLElement {
    const bar = element('div', 'trade-filter');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Show routes from');
    const chip = (label: string, id: number | null, title: string): void => {
      const on = originFilter === id;
      const node = button(on ? 'btn btn-second btn-tiny' : 'btn btn-quiet btn-tiny', label);
      node.title = title;
      node.setAttribute('aria-pressed', String(on));
      node.addEventListener('click', () => {
        originFilter = id;
        draw();
      });
      bar.append(node);
    };
    chip('All', null, 'Every route on offer, grouped by the town it sets out from');
    for (const origin of origins) chip(origin.name, origin.cityId, `Only routes from ${origin.name}`);
    return bar;
  }

  /**
   * The four clickable column headers.
   *
   * One click sorts by that column descending, a second flips it, and a third
   * column takes over descending — the ordinary table contract, and the arrow is
   * drawn on the active header alone so "which column am I reading" never has to
   * be deduced from the numbers. Pressing the *active* column's own header a
   * third time does **not** return to the default: the default is the order the
   * screen opens in, and a control that silently cycled through three states
   * would be one a player cannot aim.
   */
  function drawColumnHead(): HTMLElement {
    const head = element('div', 'trade-head');
    head.append(element('span', 'trade-head-name', 'Destination'));
    const arrow = sortDirection === 'desc' ? ' ▾' : ' ▴';
    for (const column of SORT_COLUMNS) {
      const active = sortKey === column.key;
      const node = button(
        active ? 'trade-head-col is-active' : 'trade-head-col',
        `${column.label}${active ? arrow : ''}`,
      );
      node.title = active
        ? `Sorted by ${column.name}, ${sortDirection === 'desc' ? 'largest' : 'smallest'} first`
        : `Sort by ${column.name}`;
      node.setAttribute('aria-pressed', String(active));
      node.addEventListener('click', () => {
        if (sortKey === column.key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else {
          sortKey = column.key;
          sortDirection = 'desc';
        }
        draw();
      });
      head.append(node);
    }
    head.append(element('span', 'trade-head-verb', ''));
    return head;
  }

  /** One numeric cell, the mark drawn, a zero kept quiet rather than printed. */
  function figureCell(value: number, key: 'food' | 'production' | 'gold' | null): HTMLElement {
    const cell = element('span', 'trade-cell');
    if (value === 0) {
      cell.textContent = '·';
      cell.classList.add('is-nil');
      return cell;
    }
    if (key === null) cell.textContent = signedFigure(value);
    else setYieldText(cell, `${signedFigure(value)}${YIELD_GLYPH[key]}`);
    return cell;
  }

  /** The right pane: every road not yet taken, grouped by the town it starts in. */
  function drawAvailable(state: GameState, seat: number): HTMLElement {
    const pane = element('div', 'sc-pane trade-available');
    const origins = tradeOrigins(state, seat);
    if (origins.length === 0) {
      pane.append(element('p', 'sc-none', 'You have no cities to trade between.'));
      return pane;
    }
    // The pane's one caravan sentence, said once at the top rather than on every
    // town: under the 2026-08-28 ruling the only fact left about *where* a
    // caravan is standing is whether the empire has one at all.
    const trader = startingTrader(state, seat, chooserUnitId);
    const missing = noTraderNote(state, seat);
    if (missing !== null) pane.append(element('p', 'hint', missing));
    const starter = starterNote(state, trader);

    // Filter, then sort, then group back: three pure passes over one flat row
    // model, so "sorting applies within the shown groups" is a consequence of
    // the grouping being last rather than a rule written twice.
    pane.append(drawOriginFilter(origins));
    const rows = sortRouteRows(
      filterRouteRows(tradeRouteRows(origins), originFilter),
      sortKey,
      sortDirection,
    );
    pane.append(drawColumnHead());
    const groups = groupRouteRows(origins, rows);
    if (groups.length === 0) {
      pane.append(element('p', 'sc-none', 'There is nowhere to send from here yet.'));
      return pane;
    }
    // A single filtered origin needs no group heading — the chip above already
    // says which town, and a header repeating it is a line the eye has to skip.
    const flat = originFilter !== null;
    for (const group of groups) {
      const origin = group.origin;
      const block = element('section', 'trade-origin');
      if (!flat) block.append(element('p', 'eyebrow sc-eyebrow', `from ${origin.name}`));
      // A row's figures are what *that town* — the candidate, the route's
      // destination — would receive, read off `origin.name`'s own buildings
      // (2026-08-27's reversal). Said once per origin group rather than per row,
      // which is where every row's figures in the group come from.
      block.append(
        element('p', 'hint', `What each town would receive, off ${origin.name}'s buildings`),
      );
      const list = element('ul', 'trade-candidates');
      for (const row of group.rows) {
        const candidate = row.candidate;
        const item = element('li', 'trade-candidate');
        if (candidate.running) item.classList.add('is-running');
        if (candidate.error !== null) item.classList.add('is-blocked');
        item.title = routeLedgerTitle(candidate.lines);
        item.append(element('span', 'trade-candidate-name', candidate.name));
        item.append(figureCell(candidate.food, 'food'));
        item.append(figureCell(candidate.production, 'production'));
        item.append(figureCell(candidate.gold, 'gold'));
        item.append(figureCell(routeRowValue(row, 'total'), null));
        const command = startCommandFor(origin, candidate, trader);
        if (command !== null) {
          const start = button('btn btn-primary btn-tiny', 'Start');
          // Which caravan is spent, on the button rather than in a rule the
          // player has to know: the piece is teleported to the origin, so the
          // only surprising half is *which* one leaves the map where it was.
          if (starter !== null) start.title = starter;
          // Starting closes the screen and takes the camera to the town the
          // caravan is setting out from (user-approved): the decision has been
          // made, and what a player wants next is to watch it leave — and after
          // the teleport that town is where the piece now is.
          start.addEventListener('click', () => {
            options.startRoute(command.unitId, command.fromCityId, command.toCityId);
            close();
            options.panTo({ col: origin.col, row: origin.row });
          });
          item.append(start);
        } else if (candidate.error !== null) {
          item.append(element('span', 'trade-candidate-why', candidate.error));
        } else if (candidate.running) {
          item.append(element('span', 'trade-candidate-why', 'already running'));
        } else {
          // No caravan idle anywhere: the pane's own line above says what to do
          // about that, so the row keeps its figures and says nothing.
          item.append(element('span', 'trade-candidate-why', ''));
        }
        list.append(item);
      }
      block.append(list);
      pane.append(block);
    }
    return pane;
  }

  function draw(): void {
    if (!isOpen()) return;
    const state = options.getState();
    const seat = options.getPlayerId();
    body.replaceChildren();
    // The split is an element *inside* the sheet's body rather than the body
    // itself — the Statecraft and Religion sheets' own shape, and not a
    // stylistic echo: `.statecraft-body` is a column, and a `.sc-split` worn by
    // the body would inherit that and stack the two panes.
    const split = element('div', 'sc-split');
    split.append(drawRunning(state, seat));
    split.append(drawAvailable(state, seat));
    body.append(split);
  }

  function open(chooser: number | null = null): void {
    options.onOpen?.();
    chooserUnitId = chooser;
    overlay.hidden = false;
    setExpanded();
    draw();
  }

  function close(): void {
    overlay.hidden = true;
    // The chooser, the sort and the filter are all facts about *this* opening
    // (see `chooserUnitId`): a screen reached from the bar tomorrow starts from
    // the sheet's own defaults rather than from a picture somebody left behind.
    chooserUnitId = null;
    sortKey = null;
    sortDirection = 'desc';
    originFilter = null;
    setExpanded();
  }

  function onKey(event: KeyboardEvent): void {
    if (!isOpen()) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  function onGround(event: MouseEvent): void {
    if (event.target === overlay) close();
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('mousedown', onGround);
  window.addEventListener('keydown', onKey, true);
  setExpanded();

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    open,
    close,
    toggle: () => {
      if (isOpen()) close();
      else open();
    },
    refresh: draw,
    dispose: () => {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('mousedown', onGround);
      window.removeEventListener('keydown', onKey, true);
    },
  };
}
