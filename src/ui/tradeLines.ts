/**
 * What the interface says about caravans: the route a caravan is carrying, the
 * routes a town is an end of, and the two sentences a plunder is news in.
 *
 * Pure, and separated from the surfaces that print it — the unit sheet, the
 * city panel, the Trade screen and the top bar's gold card — for `figures.ts`'
 * reason and `offerSpread`'s: this suite has no jsdom, so the half of a panel
 * that can be *quietly wrong* has to be a function somebody can call. Everything
 * below is a reader of the simulation or a sentence built out of one; nothing
 * here decides a rule.
 *
 * The thing that used to be worth arguing about
 * --------------------------------------------
 * A **preview** of a route that has not been sent. `explainRouteYield` takes a
 * *caravan*, because a route lives on the piece carrying it (`trade.ts`'s
 * structural decision) — and a candidate partner has to quote what the route
 * *would* pay before any of that exists. This file used to get that by handing
 * the evaluator a **copy** of the trader wearing a route it was not carrying:
 * legal, invisible to the state, and one refactor away from being a lie.
 *
 * It is gone, and the offer it priced is gone with it (2026-08-28, the user's
 * ruling): there is no send mode and no board full of plates any more, so this
 * file no longer previews anything. `explainRouteYieldBetween` (`trade.ts`) is
 * the sim's own answer to "what would a route between these two towns pay", and
 * the Trade screen — the one surface that asks — asks *it* directly
 * (`tradeScreen.ts`, `tradeOrigins`). One implementation, no copy in between.
 */

import { RULES } from '../sim/rulesData';
import type { City, GameState, Unit } from '../sim/state';
import {
  type RouteEndReport,
  type RouteYieldLine,
  type TraderPlunder,
  explainRouteSenderYield,
  explainRouteYield,
  foldRouteYield,
  routeCities,
  routeIsInternational,
  routeSlots,
  usedRouteSlots,
} from '../sim/trade';
import { cityDisplayName } from './cityDisplay';
import { YIELD_GLYPH, signedFigure } from './figures';

/** How long a fresh route runs, as the reducer will write it. */
export function routeTurns(): number {
  return Math.max(1, Math.floor(RULES.trade.routeTurns));
}

/**
 * The voices a route pays, in the order every surface prints them.
 *
 * Three of them for a domestic route and five since a route may end abroad (the
 * international ruling of 2026-09-03) — one list, because a caravan's figures
 * are printed by the same sentence wherever they land and a second list for the
 * foreign case is exactly the drift this file exists to end. A domestic fold
 * reads byte-identically: its two new voices are zero, and a zero is left out.
 */
const ROUTE_KEYS = ['food', 'production', 'gold', 'science', 'culture'] as const;

/**
 * "+3🌾 +2⚙ +1💰" — what a route is worth, zeroes left out.
 *
 * Composed in `YIELD_GLYPH` and printed through `setYieldText` by whoever shows
 * it, which is the seam `yieldMark.ts` describes: this builds the sentence, the
 * printer draws the marks. A route worth nothing at all says so in words rather
 * than as a row of `+0`s — a partner with no buildings and eight people between
 * the two towns is a real answer and it is the argument *against* sending.
 */
export function routeFigures(fold: {
  food: number;
  production: number;
  gold: number;
  /** Absent on a caller that has only ever known the domestic three. */
  science?: number;
  culture?: number;
}): string {
  const parts = ROUTE_KEYS.filter((key) => (fold[key] ?? 0) !== 0).map(
    (key) => `${signedFigure(fold[key] ?? 0)}${YIELD_GLYPH[key]}`,
  );
  return parts.length === 0 ? 'nothing yet' : parts.join(' ');
}

/** "2 of 3 routes" — what the empire is running against what it may. */
export function routeSlotsLine(state: GameState, playerId: number): string {
  const held = routeSlots(state, playerId);
  return `${usedRouteSlots(state, playerId)} of ${held} route${held === 1 ? '' : 's'}`;
}

/**
 * Is there a route slot free — the one refusal the interface says in its **own**
 * words (user, 2026-08-28).
 *
 * Asked here rather than by reading `routeStartable`'s sentence, because
 * matching prose to decide what a refusal *meant* is how two files start
 * disagreeing the first time one of them is reworded. The two counts are the
 * sim's own and the question is the sim's own clause; only the sentence below
 * is ours, and it is ours because the user wrote it.
 */
export function hasFreeRouteSlot(state: GameState, playerId: number): boolean {
  return usedRouteSlots(state, playerId) < routeSlots(state, playerId);
}

/**
 * The user's own words for a full route ledger, verbatim (2026-08-28).
 *
 * The **one** sentence in trade the interface does not take from the reducer,
 * and it is a deliberate exception rather than a drift: the sim's clause says
 * which of two states the empire is in ("no trade routes — build a market" /
 * "all 2 of your trade routes are running"), and the user asked for one line
 * that says what to *do* about either. Every surface that greys for the slot
 * clause prints exactly this — the trader's sheet and every Start button on the
 * Trade screen — so the two cannot say different things about one fact.
 */
export const NO_ROUTE_CAPACITY =
  'Not enough trade route capacity. Build markets and harbours to gain more.';

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
  /**
   * True when this route runs **by sea** (the ruling of 2026-09-03) — the
   * caravan sails and lays no road.
   *
   * Said out loud on the line only for a sea route, which is presence-is-state
   * read as prose: by land is what a route has always been and needs no word,
   * and a sheet that labelled both would put a badge on every caravan in a game
   * with no coast in it.
   */
  sea: boolean;
  /**
   * True when the route ends in **another empire's** town (the international
   * ruling of 2026-09-03).
   *
   * `sea`'s sibling and read the same way — a fact about the route that changes
   * the sentence rather than a second sentence. It also says which fold `lines`
   * came from: a foreign route's figures are what the **sender** takes, because
   * the sheet it is printed on is the sender's.
   */
  foreign: boolean;
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
  // **Whose sheet this is** decides which fold it prints (the international
  // ruling of 2026-09-03): a domestic route's every voice is banked by the
  // destination, which is this seat's town too, so its own fold is the honest
  // answer — while a route ending abroad pays this seat directly and pays the
  // partner a coin that is none of this sheet's business.
  const foreign = pair !== null && routeIsInternational(pair.from, pair.to);
  const lines = foreign ? explainRouteSenderYield(state, unit) : explainRouteYield(state, unit);
  const figures = routeFigures(foldRouteYield(lines));
  const turnsLeft = Math.max(0, route.expiresTurn - state.turn);
  const sea = route.sea === true;
  const way = sea ? ' · by sea' : '';
  return {
    fromName,
    toName,
    figures,
    lines,
    turnsLeft,
    autoResend: route.autoResend,
    sea,
    foreign,
    line: `Caravan · ${fromName} ⇄ ${toName}${way} · ${figures} · ${turnsLeft} turns left`,
  };
}

/** One route a city is an end of. See `cityRouteRows`. */
export interface CityRouteRow {
  /** True when this town is the route's **origin** — where the caravan set out. */
  outbound: boolean;
  /** "← Ur · +3🌾 +2⚙" (pays here) or "→ Nippur" (pays there). */
  text: string;
}

/**
 * Every route this town is an end of, its own first.
 *
 * Two readings and they are deliberately not symmetric, and which one carries
 * the figures **flipped with the direction of payment** (2026-08-27: the
 * origin's buildings set the figure, the destination banks it —
 * `docs/trade.md`'s Revisions). An **inbound** route is this city's asset now
 * — it pays *here*, off the partner's buildings — so it carries what it is
 * worth. An **outbound** route pays somewhere else and is a fact about the
 * partner: naming it is enough.
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
      rows.push({ outbound: true, text: `→ ${cityDisplayName(state, pair.to)}` });
    } else if (route.to === city.id) {
      const figures = routeFigures(foldRouteYield(explainRouteYield(state, unit)));
      rows.push({ outbound: false, text: `← ${cityDisplayName(state, pair.from)} · ${figures}` });
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
  return `✶ A caravan of ${victim}’s plundered: ${plunderSpoils(plunder)}`;
}

/**
 * "+30💰, +10🌾 +10⚙ → Nippur · grows to 5" — what a plunder was *worth*, with
 * no sentence around it.
 *
 * Split out of `plunderSpoilsSentence` because there are now two occasions that
 * quote the figures and only one of them is the pillager watching from
 * elsewhere: an attack this seat **ordered** says it in the attacker's own words
 * ("Warrior plunders the caravan of Uruk: …", `reportCombatNotice` in
 * `controls.ts`), and it must not read as a third-party report of something the
 * player just did. Two sentences, one composer — the figures cannot drift, which
 * is the only part of this that is arithmetic.
 */
export function plunderSpoils(plunder: TraderPlunder): string {
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
  return parts.join(', ');
}

/**
 * "The caravan from Uruk has come home" — a route that ran out, in one line.
 *
 * A route ends on the resolution that walks the caravan past its `expiresTurn`
 * (`marchTraders`), and until this the only sign was a slot quietly coming free:
 * a player who had set three routes running twenty turns ago had no way to learn
 * that one of them had stopped paying except by opening a sheet and counting.
 *
 * Two sentences, and the difference between them is the *only* thing a player
 * has to act on: a caravan that came home is a piece standing idle and a slot to
 * spend, and one that set out again is neither. The origin names the route
 * because that is the town the caravan is walking home *to* — `RouteEndReport.from`
 * is `TradeRoute.from`, and both ends are ids rather than names for the reason
 * every sim report is (naming a city is the interface's business).
 */
export function routeEndSentence(state: GameState, report: RouteEndReport): string {
  const home = state.cities.find((city) => city.id === report.from);
  const named = home ? cityDisplayName(state, home) : 'a lost city';
  return report.renewed
    ? `✶ The caravan from ${named} sets out again`
    : `✶ The caravan from ${named} has come home`;
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
