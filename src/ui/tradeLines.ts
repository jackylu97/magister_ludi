/**
 * What the interface says about caravans: the send offer, the route a caravan
 * is carrying, the routes a town is an end of, and the two sentences a plunder
 * is news in.
 *
 * Pure, and separated from the four surfaces that print it — the send mode's
 * plates (`controls.ts` + `tilePriceTags.ts`), the unit sheet, the city panel
 * and the top bar's gold card — for `figures.ts`' reason and `offerSpread`'s:
 * this suite has no jsdom, so the half of a panel that can be *quietly wrong*
 * has to be a function somebody can call. Everything below is a reader of the
 * simulation or a sentence built out of one; nothing here decides a rule.
 *
 * The one thing worth arguing about
 * ---------------------------------
 * A **preview** of a route that has not been sent. `explainRouteYield` takes a
 * *caravan*, because a route lives on the piece carrying it (`trade.ts`'s
 * structural decision) — and the plate over a candidate partner has to quote
 * what the route *would* pay before any of that exists. There are two ways to
 * get that number and only one of them is allowed: re-count the destination's
 * buildings here (a second implementation of the ruling, which is the failure
 * every fold in this codebase exists to prevent), or hand the sim's own
 * evaluator a caravan carrying the route it is being asked about.
 *
 * So `previewRoute` builds the route the reducer would write — the same
 * `expiresTurn`, the same two ends — hangs it on a **copy** of the trader and
 * asks `explainRouteYield`. The copy never touches `state.units`, so nothing
 * downstream can see it: `cityRouteYields` walks the state and finds only real
 * caravans. The figure on the plate is therefore the figure the city panel will
 * print the turn after the send, by construction rather than by agreement.
 */

import { RULES } from '../sim/rulesData';
import type { City, GameState, Unit } from '../sim/state';
import { getTileAt } from '../sim/map';
import { type Cell, findPath } from '../sim/pathfind';
import {
  type RouteYieldLine,
  type TraderPlunder,
  explainRouteYield,
  foldRouteYield,
  originCityOf,
  routeCities,
  routeSlots,
  sendTraderError,
  usedRouteSlots,
} from '../sim/trade';
import { trades, unitDef } from '../sim/unitData';
import { cityDisplayName } from './cityDisplay';
import { YIELD_GLYPH, signedFigure } from './figures';

/** How long a fresh route runs, as the reducer will write it. */
export function routeTurns(): number {
  return Math.max(1, Math.floor(RULES.trade.routeTurns));
}

/** The three voices a route pays, in the order every surface prints them. */
const ROUTE_KEYS = ['food', 'production', 'gold'] as const;

/**
 * "+3🌾 +2⚙ +1💰" — what a route is worth, zeroes left out.
 *
 * Composed in `YIELD_GLYPH` and printed through `setYieldText` by whoever shows
 * it, which is the seam `yieldMark.ts` describes: this builds the sentence, the
 * printer draws the marks. A route worth nothing at all says so in words rather
 * than as a row of `+0`s — a partner with no buildings and eight people between
 * the two towns is a real answer and it is the argument *against* sending.
 */
export function routeFigures(fold: { food: number; production: number; gold: number }): string {
  const parts = ROUTE_KEYS.filter((key) => fold[key] !== 0).map(
    (key) => `${signedFigure(fold[key])}${YIELD_GLYPH[key]}`,
  );
  return parts.length === 0 ? 'nothing yet' : parts.join(' ');
}

/** What a route between two towns would pay, and the lines it is the fold of. */
export interface RoutePreview {
  lines: RouteYieldLine[];
  food: number;
  production: number;
  gold: number;
  /** How long the route would run. */
  turns: number;
}

/**
 * What sending `unit` from `from` to `to` would pay its origin — the sim's own
 * evaluator, asked about a caravan that does not exist yet. See the module
 * docblock for why this is a copy and not a re-count.
 */
export function previewRoute(
  state: GameState,
  unit: Unit,
  from: City,
  to: City,
): RoutePreview {
  const turns = routeTurns();
  const candidate: Unit = {
    ...unit,
    trade: {
      from: from.id,
      to: to.id,
      expiresTurn: state.turn + turns,
      outbound: true,
      autoResend: false,
    },
  };
  const lines = explainRouteYield(state, candidate);
  return { lines, ...foldRouteYield(lines), turns };
}

/** One partner city, as the plate over it reads. See `caravanOffers`. */
export interface CaravanOffer {
  cityId: number;
  col: number;
  row: number;
  /** The town's name, as this seat knows it. */
  name: string;
  /** "+3🌾 +2⚙ +1💰 · 20 turns" — the plate's whole face. */
  label: string;
  /** The lines `label` is the fold of, for a ledger that wants them. */
  lines: RouteYieldLine[];
  /**
   * The reducer's own refusal, or `null`. **`sendTraderError`'s sentence
   * verbatim** — out of range, already routed, no free slot — so a greyed plate
   * and a rejected `sendTrader` can never disagree about why.
   */
  error: string | null;
}

/**
 * Every town this caravan could be sent to, eligible or not.
 *
 * One plate per **other city of this seat**, which is the whole of the candidate
 * set today: `sendTraderError` refuses a foreign partner outright (foreign
 * routes wait on diplomacy), and a board covered in plates that all say the same
 * deferred sentence would bury the ones that mean something. That is the price
 * tags' rule exactly — ground nobody is selling gets no tag — read one scale up.
 *
 * A refused partner keeps its **figures** and is greyed, rather than being
 * dropped: "Nippur would be worth +3🌾 and it is one turn too far" is the
 * argument for building a road, and a plate that vanished would make the range
 * something a player discovers by not seeing anything.
 *
 * `null` when the piece is not a caravan standing in one of its owner's towns —
 * there is nothing to offer from a field.
 */
export function caravanOffers(state: GameState, unit: Unit): CaravanOffer[] {
  if (!trades(unitDef(unit.type))) return [];
  const home = originCityOf(state, unit);
  if (!home) return [];

  const offers: CaravanOffer[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== unit.ownerId) continue;
    if (city.id === home.id) continue;
    const preview = previewRoute(state, unit, home, city);
    offers.push({
      cityId: city.id,
      col: city.col,
      row: city.row,
      name: cityDisplayName(state, city),
      label: `${routeFigures(preview)} · ${preview.turns} turns`,
      lines: preview.lines,
      error: sendTraderError(state, unit.ownerId, unit.id, city.id),
    });
  }
  return offers;
}

/**
 * The march a caravan would make to this partner, for the dashed preview the
 * renderer draws under the pointer (`MapView.previewRoute`).
 *
 * The **same** `findPath` the send itself walks with (`sendTraderAt`), so the
 * line under the cursor is the road the caravan will take rather than an
 * as-the-crow-flies suggestion. `null` when there is no path, which is also
 * when `sendTraderError` is refusing — the plate is greyed and the hover simply
 * draws nothing.
 */
export function caravanRoutePath(state: GameState, unit: Unit, cityId: number): Cell[] | null {
  const city = state.cities.find((entry) => entry.id === cityId);
  if (!city) return null;
  const goal = getTileAt(state.map, city.col, city.row);
  if (!goal) return null;
  return findPath(state, unit, goal);
}

/** "2 of 3 routes" — what the empire is running against what it may. */
export function routeSlotsLine(state: GameState, playerId: number): string {
  const held = routeSlots(state, playerId);
  return `${usedRouteSlots(state, playerId)} of ${held} route${held === 1 ? '' : 's'}`;
}

/** A caravan's live route, as the unit sheet reads it. See `routeReading`. */
export interface RouteReading {
  fromName: string;
  toName: string;
  /** "+3🌾 +2⚙ +1💰", or "nothing yet". */
  figures: string;
  /** The lines `figures` is the fold of — the hover ledger. */
  lines: RouteYieldLine[];
  /** `expiresTurn - state.turn`, floored at zero. Never counted down anywhere. */
  turnsLeft: number;
  autoResend: boolean;
  /** "Caravan · Uruk ⇄ Nippur · +3🌾 +2⚙ +1💰 · 14 turns left". */
  line: string;
}

/**
 * What this caravan is carrying, or `null` for a piece with no route.
 *
 * `turnsLeft` is a **subtraction, never a stored countdown** — `TradeRoute`
 * carries an absolute `expiresTurn` and nothing in the game decrements it, so
 * the only honest way to print "14 turns left" is to ask what turn it is. A
 * lapsed route reads `0` and still prints: the caravan is walking home and the
 * slot is still spoken for, which is precisely what a player wondering where
 * their fourth route went needs to see.
 */
export function routeReading(state: GameState, unit: Unit): RouteReading | null {
  const route = unit.trade;
  if (!route) return null;
  const pair = routeCities(state, unit);
  const fromName = pair ? cityDisplayName(state, pair.from) : 'a lost city';
  const toName = pair ? cityDisplayName(state, pair.to) : 'a lost city';
  const lines = explainRouteYield(state, unit);
  const figures = routeFigures(foldRouteYield(lines));
  const turnsLeft = Math.max(0, route.expiresTurn - state.turn);
  return {
    fromName,
    toName,
    figures,
    lines,
    turnsLeft,
    autoResend: route.autoResend,
    line: `Caravan · ${fromName} ⇄ ${toName} · ${figures} · ${turnsLeft} turns left`,
  };
}

/** One route a city is an end of. See `cityRouteRows`. */
export interface CityRouteRow {
  /** True when this town is the route's **origin** — the end that is paid. */
  outbound: boolean;
  /** "→ Nippur · 14t" or "← Ur". */
  text: string;
}

/**
 * Every route this town is an end of, its own first.
 *
 * Two readings and they are deliberately not symmetric. An **outbound** route is
 * this city's asset — it pays *here*, and how long it has left is the number a
 * player is deciding on — so it carries the clock. An **inbound** route pays
 * somebody else and is a fact about the partner: naming it is enough, and a
 * second clock beside it would be the same countdown printed twice on one panel.
 *
 * Walked in `state.units` order like every other sweep, so the list is a fact
 * about the state rather than about who happened to ask.
 */
export function cityRouteRows(state: GameState, city: City): CityRouteRow[] {
  const rows: CityRouteRow[] = [];
  for (const unit of state.units) {
    const route = unit.trade;
    if (!route) continue;
    if (unit.ownerId !== city.ownerId) continue;
    const pair = routeCities(state, unit);
    if (!pair) continue;
    if (route.from === city.id) {
      const left = Math.max(0, route.expiresTurn - state.turn);
      rows.push({ outbound: true, text: `→ ${cityDisplayName(state, pair.to)} · ${left}t` });
    } else if (route.to === city.id) {
      rows.push({ outbound: false, text: `← ${cityDisplayName(state, pair.from)}` });
    }
  }
  return rows;
}

/**
 * "✶ A caravan of Uruk's plundered: +30💰, +10🌾 +10⚙ → Nippur" — the
 * pillager's half.
 *
 * The camp bounty's sentence one occasion over, and built to the same shape on
 * purpose: the gold first because it is always paid, then the goods and the town
 * that received them, then the **forfeited** clause when there was nowhere to
 * put them. `TraderPlunder.warning` is the sim's own words for that, and it is
 * said out loud for the camp's reason — a boon that vanished silently is the
 * interface keeping a secret.
 *
 * `victim` is the empire that lost the caravan, named by the caller: the plunder
 * report carries a seat id and naming a seat is the interface's business.
 */
export function plunderSpoilsSentence(plunder: TraderPlunder, victim: string): string {
  const parts = [`+${plunder.gold}${YIELD_GLYPH.gold}`];
  if (plunder.cityName !== null) {
    const goods = [
      `+${plunder.food}${YIELD_GLYPH.food}`,
      `+${plunder.production}${YIELD_GLYPH.production}`,
    ].join(' ');
    const grew = plunder.grownTo === null ? '' : ` · grows to ${plunder.grownTo}`;
    parts.push(`${goods} → ${plunder.cityName}${grew}`);
  } else if (plunder.warning !== null) {
    parts.push(plunder.warning);
  }
  return `✶ A caravan of ${victim}’s plundered: ${parts.join(', ')}`;
}

/**
 * "Your caravan to Nippur was plundered" — the other half, and the one that
 * costs something.
 *
 * The destination is the caller's because it cannot be re-derived: the caravan
 * is off the board by the time anybody reports this, and the route died with it
 * (`trade.ts` — a plundered caravan is a plundered route). `null` for a route
 * whose far end could not be named, which is the honest sentence rather than a
 * guess.
 */
export function plunderLossSentence(destination: string | null): string {
  return destination === null
    ? '✶ Your caravan was plundered'
    : `✶ Your caravan to ${destination} was plundered`;
}
