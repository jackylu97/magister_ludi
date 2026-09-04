/**
 * The stamp: what a card is worth, printed on its own face.
 *
 * The deckbuilder mock's one new gesture (user, 2026-09-03 — "the card stamp
 * animations and draft flow"). A card in a draft, in the hand, or in an office
 * carries one small figure that says what it changes about the empire's ledger
 * every turn, and the *arrival* of that figure is the ceremony: a card is
 * weighed at the moment it is taken, not before.
 *
 * Boxless, and it means it
 * -----------------------
 * There is no frame, no rounded box, no rule around the figure (user, revision
 * 3): the digits sit bare between the card's clauses and its flavour, in the
 * interface's tabular mono, and the landing is a **soft radial glow** behind
 * them in the card's own line ink rather than a ring drawn around them. A box
 * would make the stamp a widget; it is a mark on paper.
 *
 * Three faces, and only one of them has a number
 * ---------------------------------------------
 *   · **the flourish** — `— · ✶ · —` in the name face at half strength, in the
 *     card's line ink. It is what a card wears while it is still a *choice*: on
 *     the draft's spread before a pick, and on a card held out of every office.
 *     Deliberately not a placeholder box and deliberately not a word: a hand of
 *     three cards showing three figures is a hand that has already been chosen
 *     for the player, and a hand of three boxes is furniture.
 *   · **the figure** — the count-up. `+2🔬 +1🎵`, the fold of the impact list,
 *     counted from nothing to the number over three quarters of a second. **The
 *     number stands alone**: there is no tag, no chip and no popup beside it
 *     (final ruling, 2026-09-03 — a reserved band that was rarely filled made
 *     the hand ragged). Where a figure came from — a cascade, a tier flip, a
 *     coastal read, a count — is the hover breakdown's rule-5 lines, and the
 *     evaluator still labels a cascade distinctly so the hover can lean on it.
 *   · **the thunk** — a card that pays on an *occasion* has no per-turn figure
 *     to count, so its stamp drops like a rubber stamp on the grant and the
 *     moment it is paid on ("+10🎵 · killing a barbarian unit"). Counting to a
 *     number that is true on no particular turn would be the wrong sentence
 *     said fluently.
 *
 * Where the number comes from
 * ---------------------------
 * `explainCardImpact` (`src/sim/cardImpact.ts`) — the empire's own ledger read
 * twice. Nothing here computes a yield; `stampReading` is an adapter that turns
 * that list into glyphs and signed integers, and the *component* below crosses
 * its boundary with strings and numbers only, exactly as `offerCard.ts` does.
 *
 * Motion, and its absence
 * -----------------------
 * `prefers-reduced-motion` is honoured by *arriving already landed*: the digits
 * are simply there, with no anticipation, no per-tick pop and no glow. Not a
 * faster animation — none at all — which is the rule `damageNumbers.ts` and
 * `toasts.ts` already keep: the reduced-motion reading loses the ceremony and
 * never the information.
 */

import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import { YIELD_GLYPH } from './figures';
import { setYieldText } from './yieldMark';
import type { CardImpactLine } from '../sim/cardImpact';

/**
 * The mock's four beats, in milliseconds.
 *
 * Here rather than in `style.css` because the script has to know when the count
 * is done in order to land it: a duration in the stylesheet and a timer in the
 * module that quietly disagree by 40ms is a stamp that lands on the wrong
 * number. The stylesheet reads them back through custom properties.
 */
export const STAMP_TIMING = {
  /** The held breath before the first digit. */
  anticipationMs: 220,
  /** The count itself, eased. */
  countMs: 750,
  /** The rubber-stamp drop, for a card that pays on an occasion. */
  thunkMs: 260,
  /** How long a taken card stays on the table before the sheet leaves. */
  exitMs: 2000,
  /**
   * The floor between two digit pops. Early ticks of the eased count arrive
   * faster than a 90ms pop can play, and a pop restarted on every one both
   * looks like a shiver and (in the class-restart idiom this replaced) forced
   * a layout per tick — the 2026-09-03 "feels laggy" report.
   */
  tickPopMinMs: 70,
} as const;

/** The card's own small mark, in the name face — see the module docblock. */
export const STAMP_FLOURISH = '— · ✶ · —';

/**
 * What the quiet lifetime register is called (user, revision 3): **"has
 * produced"**, never "banked since slotted", which reads as a debt rather than
 * as a tally. The counter itself is phase 2; the words are settled now so the
 * two halves cannot be introduced under two names.
 */
export const STAMP_LIFETIME_LABEL = 'has produced';

/** One voice of a stamp: the glyph it is quoted in, and the number it counts to. */
export interface StampFigure {
  /** The yield glyph, from `figures.ts` — the caller's table, not this one's. */
  glyph: string;
  /** Signed whole number. The digits count from zero to this. */
  amount: number;
}

/**
 * A card's stamp, as the component reads it: numbers and strings, no simulation
 * type. `offerCard.ts`'s boundary rule, kept here for its reason.
 */
export interface StampReading {
  /**
   * The stamp's own figure: **the fold of every standing line**, cascade
   * included (rule 5 — the number is the fold of the reasons under it). Empty
   * for a card that pays only on an occasion.
   */
  figures: StampFigure[];
  /** The grant a rider pays on its moment. Printed at the same size as above. */
  occasionFigures: StampFigure[];
  /**
   * Which **part** of that fold was a cascade — a meter tier the card flipped.
   *
   * Data, never a mark on the card. Nothing on this face draws it (the final
   * ruling: the number stands alone), and it is carried so the *hover
   * breakdown* can print the cascade with emphasis among its rule-5 lines,
   * which is where an explanation of a number belongs.
   */
  knockOn: StampFigure[];
  /** The meter that moved, in its own word. Absent when `knockOn` is empty. */
  knockOnLabel?: string;
  /** The occasion this card pays on, in words. Absent for a standing card. */
  occasion?: string;
  /** A grant with no countable figure — "heals 25", "gifts a piece". */
  note?: string;
}

/** True when there is nothing at all to print — the flourish stands. */
export function stampIsEmpty(reading: StampReading): boolean {
  return (
    reading.figures.length === 0 &&
    reading.knockOn.length === 0 &&
    reading.occasionFigures.length === 0 &&
    reading.occasion === undefined &&
    reading.note === undefined
  );
}

/** True when the stamp thunks rather than counts. See the module docblock. */
export function stampThunks(reading: StampReading): boolean {
  return reading.figures.length === 0 && reading.knockOn.length === 0 && reading.occasion !== undefined;
}

/**
 * The stamp's own figures: the standing ones when there are any, and otherwise
 * the occasion's grant.
 *
 * One accessor so the count-up and the thunk print the same thing, and so the
 * ruling that the two forms share a **digit size** has one place to be true.
 */
export function stampFigures(reading: StampReading): StampFigure[] {
  return reading.figures.length > 0 ? reading.figures : reading.occasionFigures;
}

/**
 * The simulation's impact list as a stamp — the one adapter, and the only place
 * in the interface that reads `CardImpactLine`.
 *
 * Three folds off one list, which is rule 5's shape kept on the presentation
 * side too: the digits are the fold of every standing line, the cascade is the
 * fold of the tier-flip lines alone (kept for the hover, never drawn on the
 * card), and the occasion's grant is its own. Nothing is computed here that the
 * sim did not already answer — the sums are sums.
 *
 * The **component** does not see this function's input: `StampReading` is
 * numbers and strings, so `offerCard.ts` can carry a stamp without a simulation
 * type crossing its boundary (its module docblock's rule, kept).
 */
export function stampReading(lines: readonly CardImpactLine[]): StampReading {
  const standing = emptyVoices();
  const cascade = emptyVoices();
  const occasion = emptyVoices();
  let occasionWords: string | undefined;
  let note: string | undefined;
  let knockOnLabel: string | undefined;
  for (const line of lines) {
    if (line.kind === 'occasion') {
      for (const key of CITY_YIELD_KEYS) occasion[key] += line[key];
      occasionWords ??= line.occasion;
      note ??= line.note;
      continue;
    }
    for (const key of CITY_YIELD_KEYS) standing[key] += line[key];
    if (line.kind !== 'knockOn') continue;
    for (const key of CITY_YIELD_KEYS) cascade[key] += line[key];
    knockOnLabel ??= line.source;
  }
  const knockOn = figuresOf(cascade);
  const reading: StampReading = {
    figures: figuresOf(standing),
    occasionFigures: figuresOf(occasion),
    knockOn,
  };
  if (knockOn.length > 0 && knockOnLabel !== undefined) reading.knockOnLabel = knockOnLabel;
  if (occasionWords !== undefined) reading.occasion = occasionWords;
  if (note !== undefined) reading.note = note;
  return reading;
}

function emptyVoices(): Record<CityYieldKey, number> {
  return { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

/** The non-zero voices, in the order every surface prints them. */
function figuresOf(voices: Record<CityYieldKey, number>): StampFigure[] {
  const list: StampFigure[] = [];
  for (const key of CITY_YIELD_KEYS) {
    if (voices[key] === 0) continue;
    list.push({ glyph: YIELD_GLYPH[key], amount: voices[key] });
  }
  return list;
}

/**
 * A signed figure the way every other number in this interface is written: an
 * explicit `+`, a real minus sign, and the glyph tight against the digits.
 *
 * Pure, and separated from the DOM for `splitYieldText`'s reason exactly — this
 * suite has no jsdom, and a sign that came out wrong would be wrong on every
 * card at once.
 */
export function stampFigureText(figure: StampFigure): string {
  const sign = figure.amount < 0 ? '−' : '+';
  return `${sign}${String(Math.abs(figure.amount))}${figure.glyph}`;
}

/** The whole per-turn figure, voices joined by a hair of air. */
export function stampText(figures: readonly StampFigure[]): string {
  return figures.map(stampFigureText).join(' ');
}

/**
 * The cascade in words, **for a hover** — never for the card's own face.
 *
 * "+2🔬 · Happiness". The card prints the number alone; this is what a
 * breakdown line says about the part of it a meter unlocked.
 */
export function stampCascadeText(reading: StampReading): string | null {
  if (reading.knockOn.length === 0) return null;
  const label = reading.knockOnLabel;
  const figures = stampText(reading.knockOn);
  return label === undefined ? figures : `${figures} · ${label}`;
}

/**
 * The eased count, as a **whole number at a moment**.
 *
 * `easeOutCubic`, so the digits sprint and settle rather than arriving at a
 * constant rate — the mock's feel, and the reason a stamp reads as *landing*
 * rather than as a progress bar. Pure, because "does the last frame show the
 * real number" is exactly the sort of thing that is quietly wrong forever.
 *
 * Clamped at both ends: before the count it is zero, after it is the target,
 * and a target of zero is never counted to at all (nothing prints a nought —
 * see `stampIsEmpty`).
 */
export function stampCountAt(target: number, elapsed: number, duration = STAMP_TIMING.countMs): number {
  if (duration <= 0 || elapsed >= duration) return target;
  if (elapsed <= 0) return 0;
  const t = elapsed / duration;
  const eased = 1 - (1 - t) ** 3;
  // Rounded **toward the target**, so the last visible tick before the end is
  // the number below it rather than the number itself shown twice.
  const value = target * eased;
  return target < 0 ? Math.ceil(value) : Math.floor(value);
}

/** Does this viewer want motion? Asked at the moment the stamp is played. */
function wantsMotion(): boolean {
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function span(className: string): HTMLSpanElement {
  const node = document.createElement('span');
  node.className = className;
  return node;
}

/**
 * The stamp's element, wearing the flourish.
 *
 * Built once and *revealed* rather than replaced, so the figure lands in the
 * place the flourish was standing — which is the whole of why the card's layout
 * does not jump when a pick is made.
 */
export function cardStampNode(): HTMLSpanElement {
  const stamp = span('card-stamp');
  stamp.dataset.face = 'flourish';
  const flourish = span('card-stamp-flourish');
  flourish.textContent = STAMP_FLOURISH;
  flourish.setAttribute('aria-hidden', 'true');
  stamp.append(flourish);
  // The glow is an element rather than a shadow on the figure, because it has to
  // sit *behind* the digits and outlive one repaint. Painted by `style.css`.
  const glow = span('card-stamp-glow');
  glow.setAttribute('aria-hidden', 'true');
  stamp.append(glow);
  stamp.append(span('card-stamp-figure'));
  stamp.append(span('card-stamp-occasion'));
  return stamp;
}

/** The two parts a reveal writes into, looked up once. */
function partsOf(stamp: HTMLElement): { figure: HTMLElement; occasion: HTMLElement } | null {
  const figure = stamp.querySelector<HTMLElement>('.card-stamp-figure');
  const occasion = stamp.querySelector<HTMLElement>('.card-stamp-occasion');
  if (!figure || !occasion) return null;
  return { figure, occasion };
}

/**
 * Writes the finished stamp with no motion at all.
 *
 * Two callers and one behaviour: the reduced-motion reading, and **a card at
 * rest** — an Order already in an office, whose figure is a standing fact
 * rather than an arrival. A screen that replayed the count on every redraw would
 * be a screen that celebrates itself.
 */
export function landCardStamp(stamp: HTMLElement, reading: StampReading): void {
  const parts = partsOf(stamp);
  if (!parts) return;
  stamp.dataset.face = stampThunks(reading) ? 'occasion' : 'figure';
  stamp.dataset.phase = 'landed';
  setYieldText(parts.figure, stampText(stampFigures(reading)));
  const said = reading.occasion ?? reading.note;
  parts.occasion.textContent = said === undefined ? '' : `· ${said}`;
}

/**
 * Plays the stamp: anticipation, the eased count with a pop per tick, and the
 * landing overshoot with its glow. Nothing arrives after the number — the
 * number is the whole of it.
 *
 * Returns a **canceller**, because a sheet can be torn down mid-count (a chained
 * draft deals the next card) and a timer left running against a detached tree is
 * the bug every animation in this interface has already had once.
 */
export function playCardStamp(stamp: HTMLElement, reading: StampReading): () => void {
  const parts = partsOf(stamp);
  if (!parts || stampIsEmpty(reading)) return () => undefined;
  if (!wantsMotion()) {
    landCardStamp(stamp, reading);
    return () => undefined;
  }

  let frame = 0;
  const timers: number[] = [];
  const cancel = (): void => {
    if (frame !== 0) window.cancelAnimationFrame(frame);
    frame = 0;
    for (const id of timers) window.clearTimeout(id);
    timers.length = 0;
  };

  const said = reading.occasion ?? reading.note;
  parts.occasion.textContent = said === undefined ? '' : `· ${said}`;

  if (stampThunks(reading)) {
    // The thunk: no counting, one drop. The figure is written first so the drop
    // lands *on* the number rather than revealing it afterwards.
    stamp.dataset.face = 'occasion';
    setYieldText(parts.figure, stampText(stampFigures(reading)));
    stamp.dataset.phase = 'thunk';
    timers.push(
      window.setTimeout(() => {
        stamp.dataset.phase = 'landed';
      }, STAMP_TIMING.thunkMs),
    );
    return cancel;
  }

  stamp.dataset.face = 'figure';
  stamp.dataset.phase = 'anticipate';
  const counted = stampFigures(reading);
  setYieldText(parts.figure, stampText(counted.map((f) => ({ ...f, amount: 0 }))));

  timers.push(
    window.setTimeout(() => {
      stamp.dataset.phase = 'counting';
      const started = performance.now();
      let lastShown = '';
      let lastPop = 0;
      const step = (now: number): void => {
        const elapsed = now - started;
        const shown = counted.map((f) => ({
          glyph: f.glyph,
          amount: stampCountAt(f.amount, elapsed),
        }));
        const text = stampText(shown);
        if (text !== lastShown) {
          lastShown = text;
          setYieldText(parts.figure, text);
          // The per-tick pop, through the Web Animations API rather than a
          // restarted CSS class: the class-restart idiom needs a forced
          // synchronous reflow (`void offsetWidth`) to convince the browser,
          // and forty of those inside one count is the lag the 2026-09-03
          // playtest felt. `animate()` restarts cleanly on the compositor,
          // costs no layout, and is throttled to one pop per `tickPopMinMs`
          // because early ticks arrive faster than any pop can finish.
          if (now - lastPop >= STAMP_TIMING.tickPopMinMs && wantsMotion()) {
            lastPop = now;
            parts.figure.animate(
              [
                { transform: 'scale(1.16) translateY(-1px)' },
                { transform: 'scale(1)' },
              ],
              { duration: 90, easing: 'ease-out' },
            );
          }
        }
        if (elapsed < STAMP_TIMING.countMs) {
          frame = window.requestAnimationFrame(step);
          return;
        }
        frame = 0;
        setYieldText(parts.figure, stampText(counted));
        stamp.dataset.phase = 'landed';
      };
      frame = window.requestAnimationFrame(step);
    }, STAMP_TIMING.anticipationMs),
  );

  return cancel;
}
