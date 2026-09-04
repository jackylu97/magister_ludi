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

import type { MeterEffect, MeterId } from '../sim/meters';
import type { ProjectPayout } from '../sim/projectData';

/** The six yields, in the order the city panel's chip row lists them. */
export type YieldKey = 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith';

/**
 * The six glyphs, as **text**.
 *
 * These are no longer what the interface *shows*. The drawn art landed (Lucide's
 * carrot, gear, flask, notes and flame; Tabler's money bag — see
 * `src/art/yieldMarks.ts`), and every visible yield glyph in the HUD is now a
 * masked element printed by `src/ui/yieldMark.ts`. What this table does is
 * *compose*: a figure is still assembled as a string here and in the panels
 * above, and the printer swaps each of these characters for its drawing on the
 * way into the DOM. Nothing about composition changed, which is why forty call
 * sites did not have to.
 *
 * So the table stays, in two roles, and both are deliberate:
 *
 *   the token   what a composed figure carries so the printer can find it.
 *               `40⚙` is how a cost is written down; whether it is *shown* as an
 *               emoji or as a drawing is the printer's business.
 *   the text    the register below — every surface where a figure has to be a
 *               string and cannot hold an element:
 *                 · a `title` attribute (the platform builds that tooltip;
 *                   `unitPanel.ts`'s improvement rows and the star chart's
 *                   research card both quote a yield in one)
 *                 · an `aria-label` and any announce string — the top bar's
 *                   chips, the tile readout's rows, the meter chips
 *                 · a `NotificationEntry.text`, which is a *record* replayed
 *                   into the log and read aloud; the toast draws the glyph in
 *                   it, the string itself keeps the character
 *               A surface on that list is text on purpose. Everything else
 *               prints through `setYieldText` and a reader sees a drawing.
 */
export const YIELD_GLYPH: Record<YieldKey, string> = {
  food: '🌾',
  production: '⚙',
  gold: '💰',
  science: '🔬',
  culture: '🎭',
  // A votive candle. The last of the six with no better text stand-in, and it is
  // only ever read aloud or shown in a tooltip now — the flame the board and the
  // panels draw is `yieldMarks.faith`.
  faith: '🕯',
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
  faith: 'faith',
};

/**
 * The two **meters**, as text, in the register `YIELD_GLYPH` keeps for the six
 * yields — and here beside them for the reason this whole file exists.
 *
 * They lived in `topBar.ts`, privately, for as long as a meter glyph was a
 * thing exactly one surface drew: `☺`/`⚜` sat alone on a chip beside a word.
 * The card stamp ended that (user, 2026-09-03 — "we should have happiness and
 * authority be yields that appear in the preview numbers, its confusing when
 * they aren't shown"): a card's own meter line is now **composed into a figure**
 * — `+4☺`, printed beside `+2🔬` in the same sentence — which is precisely the
 * job `YIELD_GLYPH` does for the six, and a second private table one module over
 * is the drift this file was written to end.
 *
 * Same two roles as the yields', and the same seam: the *token* a composed
 * figure carries so `yieldMark.ts` can find it and swap in the drawing
 * (`meterMarkNode`), and the *text* for every surface that must be a string —
 * the chips' own native tooltips, an `aria-label`, an announce line.
 *
 * No longer placeholders: `src/art/meterMarks.ts` draws a face and a stamp, and
 * these two characters are what survives where a mask cannot go.
 */
export const METER_GLYPH: Record<MeterId, string> = {
  happiness: '☺',
  authority: '⚜',
};

/** The word behind each meter mark, for the surfaces that have to *say* one. */
export const METER_NAME: Record<MeterId, string> = {
  happiness: 'happiness',
  authority: 'authority',
};

/**
 * A sentence a yield's hover card ends with, for a yield that needs an
 * explanation rather than a breakdown.
 *
 * **Empty, and that is the point.** It held one entry — faith's "the faithful
 * gather, their purpose comes later" — for as long as the pool had no sink, and
 * that entry's own docblock promised it would *go away* rather than be reworded
 * the day something spent it. Religion v1 (ledger Entry XXVIII) is that day:
 * augurs are bought with faith, so a card explaining that the pool does nothing
 * would now be the lie of omission it was written to prevent.
 *
 * The table stays because the *shape* is right and cost nothing to keep: the
 * next yield that needs a sentence rather than a breakdown gets one here.
 */
export const YIELD_NOTE: Partial<Record<YieldKey, string>> = {};

/** Production, the one a cost is quoted in — named for how often it is read. */
/**
 * The three banks a repeating project may pay into, in this interface's glyphs
 * and in words.
 *
 * `src/sim` may not know what a UI draws, so `projectRate` (`projectData.ts`)
 * takes the marks as an argument and these are the tables that supply them.
 * Typed as `Record<keyof ProjectPayout, …>`, so a fourth bank added to that
 * shape is a compile error here rather than a rate label that silently drops a
 * figure — and they live beside `YIELD_GLYPH` for its own reason: the city
 * panel and the star chart both quote a project's rate, and two copies of the
 * same three entries is exactly the drift this file exists to end.
 *
 * The spoken table is the drawn mark's doing and it is the buildable grid's
 * existing rule: a screen reader given a yield glyph announces its Unicode name
 * before the word it decorates, so a spoken sentence is words only.
 */
export const PROJECT_GLYPHS: Record<keyof ProjectPayout, string> = {
  gold: YIELD_GLYPH.gold,
  science: YIELD_GLYPH.science,
  faith: YIELD_GLYPH.faith,
};

export const PROJECT_SPOKEN: Record<keyof ProjectPayout, string> = {
  gold: ' gold',
  science: ' science',
  faith: ' faith',
};

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
  const body = compact(Math.abs(rounded));
  if (rounded > 0) return `+${body}`;
  if (rounded < 0) return `−${body}`;
  return '0';
}

/**
 * The abbreviation past three digits (user, 2026-08-30: the top bar was
 * overflowing): a magnitude of a thousand reads `1k`, a million `1M` — one
 * decimal while the leading part is a single digit (`1.5k`, `2.4M`), a whole
 * number after (`15k`, `234k`). Below a thousand nothing changes, tenths
 * included. One helper, so `figure` and `signedFigure` cannot drift on it.
 */
function compact(magnitude: number): string {
  for (const [unit, mark] of [
    [1_000_000, 'M'],
    [1_000, 'k'],
  ] as const) {
    if (magnitude < unit) continue;
    const scaled = magnitude / unit;
    const body = scaled < 10 ? (Math.round(scaled * 10) / 10).toFixed(1).replace(/\.0$/, '') : String(Math.round(scaled));
    return `${body}${mark}`;
  }
  const rounded = Math.round(magnitude * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

/** A plain magnitude in the same voice: `6`, `2.4`, `1.5k`, `2M`. */
export function figure(value: number): string {
  return compact(Math.abs(value));
}

/**
 * "132 (+4)" — a pool with its rate beside it, in parens.
 *
 * The house pattern for the one yield the empire *banks* rather than only
 * earns (`Player.gold`): the figure a purchase is checked against comes
 * first, because that is the number "can I afford this" means, and the
 * per-turn rate — the number every other yield chip shows on its own — comes
 * after it, in the signed voice, because "how am I doing" is still worth
 * answering in the same glance.
 *
 * **"24/40 (+3)" is the same grammar with a rung on it.** A pool that is filling
 * toward a *threshold* — renown against the great-person ladder — reads as the
 * pool over what it is climbing to, and then the rate, because "how close am I"
 * is one question and not two. It is an optional argument rather than a second
 * function for the reason `BANKED` is a table rather than a pair of `===`
 * tests: the two would drift on the spacing, the parens or the minus sign the
 * first time either was touched, and the whole point of this file is that a
 * figure is written one way everywhere it appears.
 */
export function poolFigure(pool: number, perTurn: number, threshold?: number): string {
  const head = threshold === undefined ? figure(pool) : `${figure(pool)}/${figure(threshold)}`;
  return `${head} (${signedFigure(perTurn)})`;
}

/** "+10%", "−50%" — a percentage, same minus sign. */
export function percentFigure(percent: number): string {
  return percent > 0 ? `+${percent}%` : `−${Math.abs(percent)}%`;
}

/**
 * The mark for a modifier on *territory* — a boundary stone, and a placeholder
 * like every other glyph in this table.
 *
 * Not a yield glyph, because border growth is not a yield: the same culture is
 * banked twice, and only the half that buys ground answers to the writ (see
 * `borderGrowth` in `cities.ts`). It reads at one line-height and is not a flag
 * — a flag would say "this ground is mine", and the point of the mark is ground
 * that is not yours yet.
 */
export const BORDER_GLYPH = '⛫';

/**
 * The Æra a thing belongs to, in the numerals the star chart uses.
 *
 * Actual Roman numerals rather than a tally of `I`s. The tally read correctly
 * for the three ages the tech tree has and broke on the great-people table,
 * which reaches the fifth: "Æra IIIII" is not a numeral, it is a count of
 * strokes. Written as a subtractive table so a sixth age costs nothing.
 *
 * It lives here, beside the other things this interface has exactly one way of
 * writing, because three surfaces now name an age — the Compendium's eyebrows,
 * the Bead Race's tables and the Beads screen's headings — and an era numeral
 * written two ways is the same failure a figure written two ways is.
 */
const ROMAN_ERA: readonly (readonly [number, string])[] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function eraWord(age: number): string {
  let left = Math.max(1, Math.round(age));
  let out = '';
  for (const [value, mark] of ROMAN_ERA) {
    while (left >= value) {
      out += mark;
      left -= value;
    }
  }
  return `Æra ${out}`;
}

/**
 * "🔬🎭 +10%" — what one empire modifier is doing, in the glyphs of the yields
 * it is doing it to. The growth stifle wears the food glyph, because growth is
 * what food is *for*, and a modifier on the borders wears the boundary stone.
 */
export function effectFigure(effect: MeterEffect): string {
  const marks = effect.growth ? [YIELD_GLYPH.food] : effect.yields.map((id) => YIELD_GLYPH[id]);
  if (effect.borders) marks.push(BORDER_GLYPH);
  return `${marks.join('')} ${percentFigure(effect.percent)}`;
}
