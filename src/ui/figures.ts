/**
 * The voices this interface writes numbers in.
 *
 * Two conventions, both of them house rules from `docs/design-specimen.html`,
 * and both of them the kind of thing that goes quietly wrong when each surface
 * keeps its own copy.
 *
 * One glyph per yield
 * -------------------
 * Costs used to read `40h`, which is a unit of measure this game names nowhere
 * else. The top bar's yield strip, a city's build buttons, a tech node's unlock
 * lines and the hover cards over all three write production as `⚙` — one glyph
 * for one yield, so a cost on a button and a rate on the bar are visibly the
 * same currency. The table lives here because it had begun to live in three
 * places at once (the city panel had a `HAMMER`, the star chart had a `HAMMER`
 * *and* a table of five, the research card had a `BEAKER`), and three lists of
 * the same five things drift apart in exactly the way two lists of the same
 * units would — which is the argument `unitData.ts` makes for keeping `glyph`
 * beside the rules.
 *
 * A signed figure, and a modifier's glyphs
 * ----------------------------------------
 * Milestone 10 put the same two sentences on three surfaces — the top bar's
 * meter chips, their hover cards, and the city panel's modifier lines — and they
 * are here for the third time for the reason above: `+6` / `−2.4` uses the true
 * minus sign rather than a hyphen because every figure in this interface is set
 * in mono and tabular, and `⚙🔬🎭 −10%` says a modifier in the same five glyphs
 * the yields themselves are written in.
 *
 * An em dash, never an infinity
 * -----------------------------
 * `turnsToFill` answers `null` when a city makes no hammers or an empire makes
 * no science, and that answer is *unknowable*, not large. Every surface prints
 * it as `—`. The alternative is whatever `Math.ceil(n / 0)` prints, and an
 * `Infinity` on a build button is a data error wearing the costume of a number.
 */

import type { MeterEffect } from '../sim/meters';

/** The five yields, in the order the city panel's chip row lists them. */
export type YieldKey = 'food' | 'production' | 'gold' | 'science' | 'culture';

export const YIELD_GLYPH: Record<YieldKey, string> = {
  food: '🌾',
  production: '⚙',
  gold: '🪙',
  science: '🔬',
  culture: '🎭',
};

/**
 * The word behind each glyph, for the surfaces that have to *say* a yield: a
 * chip's accessible label, a hover card's heading. Beside the glyphs for the
 * reason the glyphs are here at all — one table, so a strip that reads "food"
 * aloud and a card headed "food" cannot come to disagree.
 */
export const YIELD_NAME: Record<YieldKey, string> = {
  food: 'food',
  production: 'production',
  gold: 'gold',
  science: 'science',
  culture: 'culture',
};

/** Production, the one a cost is quoted in — named for how often it is read. */
export const HAMMER = YIELD_GLYPH.production;

/**
 * A turn estimate as every surface prints it: `3t`, or an em dash when the
 * answer is honestly unknowable. `0t` is a real answer and stays a number — the
 * thing is already paid for and lands at the next resolution.
 */
export function turnsLabel(turns: number | null): string {
  return turns === null ? '—' : `${turns}t`;
}

/**
 * "+6", "−2.4", "0" — a signed figure in the house voice.
 *
 * Rounded to a tenth, because the only fractional figures on this interface are
 * the happiness curve's crowding terms and nobody needs the fourteenth decimal
 * place of `0.6 · 3 ^ 1.4`. A true minus sign, never a hyphen.
 */
export function signedFigure(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const body =
    Math.abs(rounded) % 1 === 0 ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  if (rounded > 0) return `+${body}`;
  if (rounded < 0) return `−${body}`;
  return '0';
}

/** A plain magnitude in the same voice: `6`, `2.4`. */
export function figure(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

/** "+10%", "−50%" — a percentage, same minus sign. */
export function percentFigure(percent: number): string {
  return percent > 0 ? `+${percent}%` : `−${Math.abs(percent)}%`;
}

/**
 * "🔬🎭 +10%" — what one empire modifier is doing, in the glyphs of the yields
 * it is doing it to. The growth stifle wears the food glyph, because growth is
 * what food is *for*.
 */
export function effectFigure(effect: MeterEffect): string {
  const glyphs = effect.growth
    ? YIELD_GLYPH.food
    : effect.yields.map((id) => YIELD_GLYPH[id]).join('');
  return `${glyphs} ${percentFigure(effect.percent)}`;
}
