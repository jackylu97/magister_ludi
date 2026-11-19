/**
 * **What each card on the orders screen says it pays** (batch SS10, part 2).
 *
 * The final board gives every played card and every Doctrine a live line in
 * its colophon and, when there is a figure, a figure tablet in its picture
 * (`docs/plans/mockups/scholars-study/orders-screen-final-board.html`, the
 * build spec's "The rules for the words" and "Readings"). This module picks
 * the right reading for a card and hands back words and figures. It reads
 * nothing new: each line comes from a reading the game already has.
 *
 *   - **a staged card** (played this visit, not confirmed): "awaits your seal:
 *     on Confirm" and no tablet. No figure is asked for at all, which is the
 *     reveal ruling (`cardStamp.ts`, `STAMP_PENDING_MARK`);
 *   - **a commission**: its goal's counter (`commissionCounters`), as beads and
 *     "3 of 4 towns reached", with the count in the tablet;
 *   - **a Scaler**: its value now (`scalerFace`), "its value now +4 +4";
 *   - **a card that pays each turn**: the card's stamp (`explainCardImpact`
 *     through `stampReading`), "pays +15 this turn";
 *   - **a card that pays on an occasion**: the grant and the occasion, with
 *     what the card has paid so far from the lifetime tally
 *     (`PlayerStatecraft.yieldTallies`);
 *   - **a card that pays nothing now**: "+0 now" in grey, and the reason from
 *     the one new reading (`cardIdleReason`, worded by `idleReasonWords`);
 *   - **a rule**, which pays no yield: "in force".
 *
 * Every number is the reading's own. Rule 5 holds on the screen's head: the
 * total there is `foldDeck`'s figure, never a sum of these lines.
 *
 * **The pay plate** (the Council screen, stage 1, the board's PL and PM
 * frames) is the same reading as data for the card's foot: `plate` carries the
 * stamp's figures (the six yields, then happiness and authority), "+0" and the
 * reason for a card that pays nothing now, and `null` for a rule, an occasion,
 * a commission's counter and a card played this visit. A Scaler's plate is its
 * stamp too: the plate says what a card pays each turn, and a Scaler's value
 * is its rate, not its turn's pay.
 *
 * **On the Council screen the plate is a share of the totals** (stage 2): the
 * caller passes the council's exact figures, and the plate is what the totals
 * would lose if the card left (`councilPlate`, `councilTotals.ts`), the same
 * reading as the totals line and the chips. Without them (another surface)
 * the plate is the stamp, rounded.
 */

import { type CardImpactLine, type CardImpactSheet, explainCardImpact } from '../sim/cardImpact';
import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';
import { cardIdleReason, cardCanPay, idleReasonWords } from '../sim/statecraft';
import { type DoctrineId, type GovernmentId, type OrderId, orderDef } from '../sim/statecraftData';
import { type CouncilFigures, councilPlate } from './councilTotals';
import {
  type StampFigure,
  type StampReading,
  stampFigures,
  stampIsEmpty,
  stampReading,
  stampText,
} from './cardStamp';
import { commissionCounters, commissionStanding } from './commissionGoal';
import { METER_GLYPH, YIELD_GLYPH } from './figures';
import { stampOfVoices } from './ledgerScreen';
import type { FirstFigure, OrderFaceLive, OrderFacePlate, PlateFigure } from './orderFace';
import { scalerFace } from './scalerValue';
import { splitYieldText } from './yieldMark';

/** The words of the live lines, in one table. */
export const LIVE_WORDS = {
  staged: 'awaits your seal: on Confirm',
  rule: 'in force',
  idle: '+0 now',
  idleFigure: '+0',
  fulfilled: 'fulfilled',
  pays: (figures: string) => `pays ${figures} this turn`,
  value: (figures: string) => `its value now ${figures}`,
  occasion: (figures: string, occasion: string) => `${figures} · ${occasion}`,
  soFar: (line: string, total: string) => `${line} · ${total} so far`,
  counter: (have: number, need: number, label: string) => `${have} of ${need} ${label}`,
} as const;

/** What a card on the table says about itself now. */
export interface CardLive {
  /** The colophon's line. */
  line: OrderFaceLive;
  /** The same reading in short, for the register's live plate: "+12", "in force", "+0 now". */
  short: string;
  /** The figure tablet, or null for none. */
  tablet: FirstFigure | null;
  /** Set when the card pays yields but pays nothing now, with the reason when there is one. */
  unmet: { reason?: string } | null;
  /** The kind of reading, for the screen's styling and its tests. */
  kind: 'staged' | 'counter' | 'value' | 'pays' | 'occasion' | 'idle' | 'rule';
  /**
   * The pay plate: what the card pays each turn, "+0" and the reason, or
   * `null` for no plate. See the module docblock.
   */
  plate: OrderFacePlate | null;
}

/** The yield a stamp figure's glyph names, or null for a meter's. */
function yieldOfGlyph(glyph: string): CityYieldKey | null {
  return CITY_YIELD_KEYS.find((key) => YIELD_GLYPH[key] === glyph) ?? null;
}

/** The two meters, in the order the stamp prints them. */
const PLATE_METERS = ['happiness', 'authority'] as const;

/**
 * **A stamp's figures as plate figures**: each glyph read back to its yield or
 * its meter. A figure whose glyph names neither is left out, which no stamp
 * figure does today (`stampReading` writes only these eight).
 */
export function plateFigures(figures: readonly StampFigure[]): PlateFigure[] {
  const out: PlateFigure[] = [];
  for (const figure of figures) {
    const voice = yieldOfGlyph(figure.glyph) ?? PLATE_METERS.find((meter) => METER_GLYPH[meter] === figure.glyph);
    if (voice !== undefined) out.push({ voice, amount: figure.amount });
  }
  return out;
}

/**
 * **The plate of a card from its stamp**: the figures when it pays each turn,
 * "+0" and the reason when it could pay and pays nothing now, and no plate for
 * a card that pays on an occasion or pays nothing at all (a rule).
 */
function plateOfStamp(state: GameState, seat: number, card: OrderId | DoctrineId | GovernmentId, reading: StampReading): OrderFacePlate | null {
  if (reading.figures.length > 0) return { kind: 'pays', figures: plateFigures(reading.figures) };
  if (!stampIsEmpty(reading)) return null;
  if (!cardCanPay(card)) return null;
  const reason = idleReasonWords(cardIdleReason(state, seat, card));
  return reason === null ? { kind: 'idle' } : { kind: 'idle', reason };
}

/**
 * **The plate on the Council screen**: the card's share of the totals when the
 * caller has the council's figures (`councilPlate`), and the stamp's plate
 * otherwise. A card whose share rounds to nothing is read as the stamp reads
 * it: "+0" and the reason, an occasion, or a rule.
 */
function plateOf(
  state: GameState,
  seat: number,
  card: OrderId | DoctrineId | GovernmentId,
  reading: StampReading,
  lines: readonly CardImpactLine[],
  council: Readonly<CouncilFigures> | undefined,
): OrderFacePlate | null {
  if (council !== undefined) {
    const figures = councilPlate(council, lines);
    if (figures.length > 0) return { kind: 'pays', figures };
    if (reading.figures.length > 0) return cardCanPay(card) ? plateOfStamp(state, seat, card, { ...reading, figures: [] }) : null;
  }
  return plateOfStamp(state, seat, card, reading);
}

/** A stamp figure as the tablet prints it: the signed number and its yield. */
export function tabletOfFigure(figure: StampFigure): FirstFigure {
  const sign = figure.amount < 0 ? '−' : '+';
  return { figure: `${sign}${String(Math.abs(figure.amount))}`, yield: yieldOfGlyph(figure.glyph) };
}

/** The first figure of a composed yield string ("+3🔬 +3🎭"), for the tablet. */
export function tabletOfText(text: string): FirstFigure | null {
  const parts = splitYieldText(text);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!;
    if (part.kind !== 'text') continue;
    const match = /([+\-−]?\d+(?:\.\d+)?%?)\s*$/.exec(part.text);
    if (match === null) continue;
    const next = parts[index + 1];
    const key = next?.kind === 'mark' && (CITY_YIELD_KEYS as readonly string[]).includes(next.key) ? (next.key as CityYieldKey) : null;
    return { figure: match[1]!, yield: key };
  }
  return null;
}

/** What a card has paid so far on its occasions, from the lifetime tally, or null for nothing. */
function paidSoFar(state: GameState, seat: number, card: string): string | null {
  const row = playerById(state, seat)?.statecraft.yieldTallies?.find((entry) => entry.card === card);
  if (row === undefined) return null;
  const figures = stampFigures(stampOfVoices(row.paid));
  return figures.length === 0 ? null : stampText(figures);
}

/**
 * A card's reading from its impact list, or the idle and rule lines when the
 * stamp is empty. Shared by an Order in a chair, a Doctrine and the
 * government. `council` is the council's exact figures on the Council screen,
 * so the plate is the card's share of the totals there.
 */
function liveOfStamp(
  state: GameState,
  seat: number,
  card: OrderId | DoctrineId | GovernmentId,
  lines: readonly CardImpactLine[],
  council?: Readonly<CouncilFigures>,
): CardLive {
  const reading = stampReading(lines);
  const plate = plateOf(state, seat, card, reading, lines, council);
  if (!stampIsEmpty(reading)) {
    if (reading.figures.length > 0) {
      return {
        kind: 'pays',
        line: { kind: 'pays', text: LIVE_WORDS.pays(stampText(reading.figures)) },
        short: stampText(reading.figures),
        tablet: tabletOfFigure(reading.figures[0]!),
        unmet: null,
        plate,
      };
    }
    if (reading.occasionFigures.length > 0 || reading.occasion !== undefined) {
      const grant = stampText(reading.occasionFigures);
      const said = reading.occasion ?? reading.note ?? '';
      let text = grant === '' ? said : said === '' ? grant : LIVE_WORDS.occasion(grant, said);
      const total = paidSoFar(state, seat, card);
      if (total !== null) text = LIVE_WORDS.soFar(text, total);
      return {
        kind: 'occasion',
        line: { kind: 'pays', text },
        short: grant === '' ? said : grant,
        tablet: reading.occasionFigures.length > 0 ? tabletOfFigure(reading.occasionFigures[0]!) : null,
        unmet: null,
        plate,
      };
    }
    if (reading.note !== undefined) {
      return { kind: 'occasion', line: { kind: 'pays', text: reading.note }, short: reading.note, tablet: null, unmet: null, plate };
    }
  }
  if (cardCanPay(card)) {
    const reason = idleReasonWords(cardIdleReason(state, seat, card));
    return {
      kind: 'idle',
      line: { kind: 'pays', text: LIVE_WORDS.idle },
      short: LIVE_WORDS.idle,
      tablet: { figure: LIVE_WORDS.idleFigure, yield: null },
      unmet: reason === null ? {} : { reason },
      plate,
    };
  }
  return { kind: 'rule', line: { kind: 'standing', text: LIVE_WORDS.rule }, short: LIVE_WORDS.rule, tablet: null, unmet: null, plate };
}

/** The line a card played this visit and not yet confirmed wears. No figure is asked for. */
export function stagedLive(): CardLive {
  return {
    kind: 'staged',
    line: { kind: 'waiting', text: LIVE_WORDS.staged },
    short: LIVE_WORDS.staged,
    tablet: null,
    unmet: null,
    plate: null,
  };
}

/**
 * **An Order in a chair**, confirmed: its counter, its value, its stamp, or
 * the idle and rule lines. `sheet` is the draw's shared reading of the real
 * board (`cardImpactSheet`), so a table of a dozen cards reads the empire once.
 * `council` is the council's exact figures, on the Council screen.
 */
export function seatedOrderLive(
  state: GameState,
  seat: number,
  id: OrderId,
  sheet: CardImpactSheet | undefined,
  council?: Readonly<CouncilFigures>,
): CardLive {
  if (orderDef(id).commission !== undefined) {
    if (commissionStanding(state, seat, id) === 'fulfilled') {
      return {
        kind: 'rule',
        line: { kind: 'standing', text: LIVE_WORDS.fulfilled },
        short: LIVE_WORDS.fulfilled,
        tablet: null,
        unmet: null,
        plate: null,
      };
    }
    const counters = commissionCounters(state, seat, id);
    const first = counters[0];
    if (first !== undefined) {
      const have = Math.floor(Math.max(0, first.have));
      return {
        kind: 'counter',
        line: {
          kind: 'counter',
          text: LIVE_WORDS.counter(have, first.need, first.label),
          progress: { done: have, of: first.need },
        },
        short: `${have}/${first.need}`,
        tablet: { figure: `${have}/${first.need}`, yield: null },
        unmet: null,
        plate: null,
      };
    }
  }
  const value = scalerFace(state, seat, id);
  if (value !== null) {
    // The plate is what the card pays this turn: its stamp, as for any card.
    const lines = orderLines(state, seat, id, sheet);
    return {
      kind: 'value',
      line: { kind: 'pays', text: LIVE_WORDS.value(value.figure) },
      short: value.figure,
      tablet: tabletOfText(value.figure),
      unmet: null,
      plate: plateOf(state, seat, id, stampReading(lines), lines, council),
    };
  }
  return liveOfStamp(state, seat, id, orderLines(state, seat, id, sheet), council);
}

/** An Order's impact list: the card stamp's reading for the order. */
function orderLines(state: GameState, seat: number, id: OrderId, sheet: CardImpactSheet | undefined): CardImpactLine[] {
  return explainCardImpact(state, seat, { kind: 'order', id }, sheet);
}

/** **A Doctrine**, always in force: its stamp, or the idle and rule lines. */
export function doctrineLive(
  state: GameState,
  seat: number,
  id: DoctrineId,
  sheet: CardImpactSheet | undefined,
  council?: Readonly<CouncilFigures>,
): CardLive {
  return liveOfStamp(state, seat, id, explainCardImpact(state, seat, { kind: 'doctrine', id }, sheet), council);
}

/**
 * **The government in force** (stage 2): its law's stamp, read on a ghost
 * board with the law set aside (`cardImpact.ts`), so its plate is the same
 * reading as every other card's.
 */
export function governmentLive(
  state: GameState,
  seat: number,
  id: GovernmentId,
  sheet: CardImpactSheet | undefined,
  council?: Readonly<CouncilFigures>,
): CardLive {
  return liveOfStamp(state, seat, id, explainCardImpact(state, seat, { kind: 'government', id }, sheet), council);
}
