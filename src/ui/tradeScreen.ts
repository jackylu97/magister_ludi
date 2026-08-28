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
 * What it graduates from
 * ----------------------
 * Trade had three surfaces and no *screen*: a routed caravan's sheet
 * (`unitPanel.ts`), a town's Routes row (`cityPanel.ts`), and a board full of
 * send plates armed from an unladen trader (`tilePriceTags.ts`). Each answers
 * one question about one thing. None of them answers "how is my trade doing",
 * and none of them can be reached without first finding and clicking the right
 * piece — which for the fourth caravan in a twelve-city empire is a search.
 *
 * Nothing here is a new rule
 * --------------------------
 * Every figure comes out of `trade.ts`: `explainRouteYield` for what a route
 * pays, `explainRouteYieldBetween` for what one *would* pay, `explainRouteSlots`
 * and `usedRouteSlots` for the capacity, `explainTradeGold` for the two
 * empire-scale lines. Every refusal is `sendTraderError`'s own sentence, asked
 * of the very caravan the Send button would send — **never of a copy wearing a
 * route it is not carrying**, which is the mistake `tradeLines.ts`' docblock
 * records having made once already. A row with no caravan standing on its origin
 * is not "refused"; it is a row with nowhere to send from, and it says that
 * instead.
 *
 * The pure half of this file is everything above `createTradeScreen`, for
 * `figures.ts`' reason: this suite has no jsdom, and the half of a panel that
 * can be *quietly wrong* — a sort order, a greyed sentence, a total — has to be
 * a function somebody can call.
 */

import { hexDistance } from '../sim/hex';
import { offsetToAxial } from '../sim/map';
import {
  type RouteYieldLine,
  type TradeGoldLine,
  explainRouteSlots,
  explainRouteYield,
  explainRouteYieldBetween,
  explainTradeGold,
  foldRouteYield,
  originCityOf,
  routeCities,
  routeIsLive,
  sendTraderError,
  tradeGold,
  usedRouteSlots,
} from '../sim/trade';
import { UNIT_TYPE_IDS, type UnitTypeId, trades, unitDef } from '../sim/unitData';
import { gatingTech } from '../sim/tech';
import { techDef } from '../sim/techData';
import type { City, GameState, Unit } from '../sim/state';
import { cityDisplayName } from './cityDisplay';
import { YIELD_GLYPH, figure, signedFigure } from './figures';
import { routeFigures } from './tradeLines';
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
 * One line per running route, then `explainTradeGold`'s two — the connections
 * and the road upkeep — and the total under a double rule. Gold is the one voice
 * that totals because it is the one voice all three sources share: a route's
 * food and hammers land in one town's own basket and are quoted on the route's
 * line, and adding them to an empire-wide figure would be summing two different
 * things.
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
  for (const line of explainTradeGold(state, playerId) as readonly TradeGoldLine[]) {
    lines.push({ source: line.source, gold: line.gold, figures: `${signedFigure(line.gold)}${YIELD_GLYPH.gold}` });
  }
  let total = 0;
  for (const route of routes) total += route.gold;
  total += tradeGold(state, playerId);
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
   * The reducer's own refusal, or `null`. **`sendTraderError`'s sentence
   * verbatim**, asked of the idle caravan standing on the origin — so a greyed
   * row and a rejected `sendTrader` can never disagree about why. `null` when
   * there is no caravan on the origin to ask about: that row is not refused, it
   * simply has nowhere to set out from, and the origin says so.
   */
  error: string | null;
}

/** One of this seat's towns, and every partner a caravan could reach from it. */
export interface TradeOrigin {
  cityId: number;
  name: string;
  col: number;
  row: number;
  /** The idle caravan standing on this centre, or `null`. Send needs one. */
  senderUnitId: number | null;
  /**
   * Why nothing can be sent from here, or `null` when something can — "no
   * caravan here · the nearest idle one is in Ur", or "build a trader
   * (Currency)" when the empire has no idle caravan anywhere.
   */
  note: string | null;
  candidates: TradeCandidate[];
}

/** The unit type that carries a route. Presence of `trades` is the marker. */
function traderType(): UnitTypeId | null {
  return UNIT_TYPE_IDS.find((type) => trades(unitDef(type))) ?? null;
}

/** Every caravan of this seat that is standing free of a route. */
function idleTraders(state: GameState, playerId: number): Unit[] {
  return state.units.filter(
    (unit) =>
      unit.ownerId === playerId && unit.trade === undefined && trades(unitDef(unit.type)),
  );
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
 * Hex distance between two towns. Used only to name the *nearest* idle caravan
 * when a row has none of its own — a suggestion, never a rule, which is why it
 * is a straight-line reading rather than `pathTurns`: a player being told where
 * their spare caravan is does not need it priced.
 */
function townDistance(a: City, b: City): number {
  return hexDistance(offsetToAxial(a.col, a.row), offsetToAxial(b.col, b.row));
}

/**
 * Why this town can send nothing, or `null`.
 *
 * Three answers in the order a player meets them: a caravan is standing here and
 * there is nothing to say; no caravan is here but one is idle elsewhere, so name
 * the town it is in; or the empire has no idle caravan at all, in which case the
 * useful sentence is the one that names the technology.
 */
function originNote(state: GameState, playerId: number, city: City, sender: Unit | null): string | null {
  if (sender !== null) return null;
  const idle = idleTraders(state, playerId);
  let nearest: City | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const unit of idle) {
    const home = originCityOf(state, unit);
    if (home === null) continue;
    const distance = townDistance(city, home);
    if (distance < best) {
      best = distance;
      nearest = home;
    }
  }
  if (nearest !== null) {
    return `No caravan here — the nearest idle one is in ${cityDisplayName(state, nearest)}`;
  }
  if (idle.length > 0) return 'No caravan here — your idle one is in the field';
  const type = traderType();
  const gate = type === null ? null : gatingTech('unit', type);
  const named = type === null ? 'caravan' : unitDef(type).name.toLowerCase();
  return gate === null ? `Build a ${named}` : `Build a ${named} (${techDef(gate).name})`;
}

/**
 * Every town of this seat, in founding order, with every partner a caravan could
 * be sent to from it.
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
  const idle = idleTraders(state, playerId);
  const origins: TradeOrigin[] = [];
  for (const city of towns) {
    const sender =
      idle.find((unit) => unit.col === city.col && unit.row === city.row) ?? null;
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
        // The reducer's own gate, asked of the very piece the button would
        // send. No caravan here, no question to ask — see `TradeCandidate`.
        error: sender === null ? null : sendTraderError(state, playerId, sender.id, other.id),
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
      senderUnitId: sender?.id ?? null,
      note: originNote(state, playerId, city, sender),
      candidates,
    });
  }
  return origins;
}

/**
 * The send a row would make, or `null` when the row cannot make one.
 *
 * The pure half of the Send button, split out for this file's stated reason:
 * "which caravan, to which town" is the part of that button that can be quietly
 * wrong, and it is now a function somebody can call rather than a closure inside
 * a click handler. The two conditions are exactly the ones the row is drawn
 * under — a caravan standing on this origin, and the reducer not refusing this
 * partner — so a row with a button is a row this answers for.
 */
export function sendCommandFor(
  origin: TradeOrigin,
  candidate: TradeCandidate,
): { unitId: number; cityId: number } | null {
  if (origin.senderUnitId === null) return null;
  if (candidate.error !== null) return null;
  return { unitId: origin.senderUnitId, cityId: candidate.cityId };
}

// --- the screen -------------------------------------------------------------

export interface TradeScreen {
  readonly isOpen: boolean;
  open(): void;
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
  /** Sends the caravan. The screen never mutates state itself. */
  send: (unitId: number, cityId: number) => void;
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

    // The foot: the capacity, then the two empire-scale lines and the fold. The
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
    for (const line of explainTradeGold(state, seat)) {
      const item = element('li', 'meter-line');
      item.append(element('span', 'meter-line-source', line.source));
      item.append(element('span', 'meter-line-value', signedFigure(line.gold)));
      list.append(item);
    }
    if (list.childElementCount > 0) foot.append(list);
    const total = element('div', 'meter-total ledger-total');
    total.append(element('span', 'meter-line-source', 'Trade, per turn'));
    const value = element('span', 'meter-line-value');
    setYieldText(value, `${signedFigure(ledger.total)}${YIELD_GLYPH.gold}`);
    total.append(value);
    foot.append(total);
    block.append(foot);
    return block;
  }

  /** The right pane: every road not yet taken, grouped by the town it starts in. */
  function drawAvailable(state: GameState, seat: number): HTMLElement {
    const pane = element('div', 'sc-pane trade-available');
    const origins = tradeOrigins(state, seat);
    if (origins.length === 0) {
      pane.append(element('p', 'sc-none', 'You have no cities to trade between.'));
      return pane;
    }
    for (const origin of origins) {
      const block = element('section', 'trade-origin');
      const head = element('p', 'eyebrow sc-eyebrow', `from ${origin.name}`);
      block.append(head);
      // The column heading: a row's figures are what *that town* — the
      // candidate, the route's destination — would receive, read off
      // `origin.name`'s own buildings (2026-08-27's reversal). Said once per
      // origin group rather than per row, which is where every row's figures
      // in the group come from.
      block.append(
        element('p', 'hint', `What each town would receive, off ${origin.name}'s buildings`),
      );
      if (origin.note !== null) block.append(element('p', 'hint', origin.note));
      if (origin.candidates.length === 0) {
        block.append(element('p', 'sc-none', 'There is nowhere to send from here yet.'));
        pane.append(block);
        continue;
      }
      const list = element('ul', 'trade-candidates');
      for (const candidate of origin.candidates) {
        const item = element('li', 'trade-candidate');
        if (candidate.running) item.classList.add('is-running');
        if (candidate.error !== null) item.classList.add('is-blocked');
        item.title = routeLedgerTitle(candidate.lines);
        item.append(element('span', 'trade-candidate-name', candidate.name));
        const figures = element('span', 'trade-candidate-figures');
        setYieldText(figures, candidate.figures);
        item.append(figures);
        const command = sendCommandFor(origin, candidate);
        if (command !== null) {
          const send = button('btn btn-primary btn-tiny', 'Send');
          // Sending closes the screen and takes the camera to the town the
          // caravan is setting out from (user-approved): the decision has been
          // made, and what a player wants next is to watch it leave.
          send.addEventListener('click', () => {
            options.send(command.unitId, command.cityId);
            close();
            options.panTo({ col: origin.col, row: origin.row });
          });
          item.append(send);
        } else if (candidate.error !== null) {
          item.append(element('span', 'trade-candidate-why', candidate.error));
        } else if (candidate.running) {
          item.append(element('span', 'trade-candidate-why', 'already running'));
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

  function open(): void {
    options.onOpen?.();
    overlay.hidden = false;
    setExpanded();
    draw();
  }

  function close(): void {
    overlay.hidden = true;
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
