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
 * An em dash, never an infinity
 * -----------------------------
 * `turnsToFill` answers `null` when a city makes no hammers or an empire makes
 * no science, and that answer is *unknowable*, not large. Every surface prints
 * it as `—`. The alternative is whatever `Math.ceil(n / 0)` prints, and an
 * `Infinity` on a build button is a data error wearing the costume of a number.
 */

/** The five yields, in the order the city panel's chip row lists them. */
export type YieldKey = 'food' | 'production' | 'gold' | 'science' | 'culture';

export const YIELD_GLYPH: Record<YieldKey, string> = {
  food: '🌾',
  production: '⚙',
  gold: '🪙',
  science: '🔬',
  culture: '🎭',
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
