/**
 * How far the beakers have come, in the one arithmetic two surfaces quote.
 *
 * The star chart draws a lapis bar under the node it is researching; the
 * research card at the top-left of the HUD draws the same bar with the same
 * numbers beside it. They are two windows onto one fact — `sciencePool` against
 * the current technology's `cost`, at the empire's current rate — and a fact
 * computed twice is a fact that eventually disagrees with itself, so it is
 * computed here and read there.
 *
 * It is deliberately arithmetic over three numbers rather than a reader of
 * `GameState`: the state-shaped questions (which tech, what does it cost, how
 * many beakers a turn) are already answered once each in `src/sim/tech.ts`, and
 * asking them again here would be the second opinion this module exists to
 * prevent. What is left — a clamped fraction and a turn count — is pure, so it
 * is also the only part of the research card an ordinary unit test can reach
 * (the card itself is DOM, and this suite has no jsdom).
 *
 * The turn count is `turnsToFill`, the same helper the city panel estimates
 * production with and `turnsToTech` estimates research with. `null` means the
 * empire makes no science at all and the answer is honestly unknowable — every
 * caller prints it as an em dash rather than as an infinity.
 */

import { turnsToFill } from '../sim/cities';
import { YIELD_GLYPH, turnsLabel } from './figures';

/** The science voice, in the glyph every other surface counts beakers in. */
export const BEAKER = YIELD_GLYPH.science;

export interface ResearchProgress {
  /** Pool over cost, clamped to 0…1 — overflow from a banked pool reads full. */
  fraction: number;
  /** Turns to finish at this rate, `0` when it is already paid, `null` at no rate. */
  turns: number | null;
  /** The pool as a whole number: beakers accumulate in fractions, labels do not. */
  banked: number;
  /** The technology's cost, carried through so a caller quotes one object. */
  cost: number;
  /** "230/250 🔬 · 3t" — the whole line, mono, as both surfaces print it. */
  figures: string;
}

/**
 * `pool` beakers banked against a `cost`, earning `rate` a turn.
 *
 * A cost of zero (or less) is treated as already paid rather than divided by:
 * the tech tables never price a node at nothing, but a fraction of `NaN` would
 * silently become a bar of width `NaN%` that renders as *empty*, which is the
 * worst way for a data error to show up — as a plausible number.
 */
export function researchProgress(pool: number, cost: number, rate: number): ResearchProgress {
  const banked = Math.floor(Math.max(0, pool));
  const fraction = cost <= 0 ? 1 : Math.max(0, Math.min(1, pool / cost));
  const turns = turnsToFill(cost - pool, rate);
  return {
    fraction,
    turns,
    banked,
    cost,
    figures: `${banked}/${cost} ${BEAKER} · ${turnsLabel(turns)}`,
  };
}
