/**
 * What a Statecraft card *looks like*: the archetype line's name, its ink, and
 * its emblem.
 *
 * `figures.ts` for the deck. The simulation says which thread a card belongs to
 * (`CardLine` — "for the screen's grouping and for nothing else", says its
 * docblock) and stops there, because a colour is not a rule. This is the
 * interface's answer to the rest of the question, and it lives in one file for
 * the reason the yield glyphs do: the same three facts were about to be needed
 * by the Statecraft screen, by the offer card and by whatever prints a card
 * next, and three copies of "the Wild Hunt is vermilion" drift.
 *
 * The colour is a class of the palette, not a hex
 * -----------------------------------------------
 * Each line names an **accent key**, which reaches the DOM as `data-line` and is
 * resolved to ink by one block of `style.css` (`--line-ink`). Nothing here knows
 * a colour. That matters more than it looks: the accent lands on three things at
 * once — the card's frame rule, its emblem and its eyebrow — and every one of
 * them is a CSS property on a different element. Setting three inline styles
 * from TypeScript would be three places for a card to come up half-painted.
 *
 * The emblem is a mask, so it takes whatever ink is set
 * ----------------------------------------------------
 * `yieldMark.ts`'s mechanism exactly, one deck over: the drawing is path data
 * (`src/art/lineMarks.ts`), it arrives as a `data:` URI used as a CSS mask, and
 * it paints in `currentColor`. That is the whole reason the marks are drawn
 * rather than set in emoji — see that module's docblock for the two ways the
 * emoji set failed, one of which was a straight collision with the faith glyph.
 */

import { type AnyCardLine, cardLineMarkDataUri, slotMarkDataUri } from '../art/lineMarks';
import type { CardLine, SlotType } from '../sim/statecraftData';

export type { AnyCardLine };

/**
 * How a line reads when the interface has to *say* it — a card's title
 * attribute, a collection heading, a screen reader.
 *
 * `docs/deprecated/statecraft-cards.md`'s names, to the word: these are the designer's
 * names for the threads and the screen has no business inventing a synonym.
 * `'none'` is deliberately not "None" — a neutral card is not a member of a
 * line called nothing, it is a card that joins no line, and the sentence has to
 * survive being read aloud.
 *
 * Keyed on `AnyCardLine` rather than `CardLine`, which is the one thing here
 * that is not simply a table: a thread's name and ink are art, and the
 * interface may be ready for one before the simulation declares it. See
 * `PendingCardLine` in `src/art/lineMarks.ts` for how the two unions rejoin.
 */
export const CARD_LINE_NAME: Record<AnyCardLine, string> = {
  hunt: 'The Wild Hunt',
  caravan: 'The Long Caravan',
  green: 'The Green Belt',
  forge: 'The Forge Levy',
  star: 'The Star Chart',
  procession: 'The Procession',
  wayfarers: 'The Wayfarers',
  none: 'no line',
  // The five newer threads, keyed on `AnyCardLine` so this table is ready
  // before `CardLine` declares them (see `PendingCardLine`). The Marble Court
  // is the one with a card already written for it — The Laureate, whose whole
  // sentence is about patronage — and the other four are its siblings in the
  // same pass, named here so that a data row naming one is never printed as
  // "no line".
  court: 'The Marble Court',
  cloister: 'The Cloister',
  charter: 'The Charter',
  ploughshare: 'The Ploughshare',
  highlands: 'The Highlands',
};

/**
 * The palette cut each line is drawn in, as the key `style.css` resolves.
 *
 * Six of the first eight are the specimen's own accents used for what they
 * already mean — vermilion is blood, gilt is money, grape is rite, lapis is
 * knowledge, teal is distance — and the two that are not (sage for the Green
 * Belt, slate for the Forge Levy) are added beside them rather than borrowed
 * from a yield voice, because a card's line is not a yield and a hand that reads
 * as five yields plus two would be saying something untrue about what the cards
 * do. The five newer threads follow the same rule: each is a cut of its own in
 * `style.css`, spaced off the eight already there rather than reusing one.
 *
 * `'none'` resolves to plain ink. That is the point of it: two thirds of a good
 * hand is neutral, and a deck where every card shouts has no accent at all.
 */
export const CARD_LINE_ACCENT: Record<AnyCardLine, string> = {
  hunt: 'hunt',
  caravan: 'caravan',
  green: 'green',
  forge: 'forge',
  star: 'star',
  procession: 'procession',
  wayfarers: 'wayfarers',
  none: 'none',
  court: 'court',
  cloister: 'cloister',
  charter: 'charter',
  ploughshare: 'ploughshare',
  highlands: 'highlands',
};

/** A card's line, defaulting the way the data does: an absent thread is neutral. */
export function lineOf(def: { line?: CardLine }): CardLine {
  return def.line ?? 'none';
}

/**
 * The emblem for one line, as a span that paints in `currentColor`.
 *
 * `aria-hidden`, always, and for `yieldMarkNode`'s reason: the card beside it
 * already carries the line's name in its title and its type in text, so a reader
 * that announced the mark would say the card twice.
 */
export function cardLineMarkNode(id: AnyCardLine): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.className = 'line-mark';
  span.style.setProperty('--line-mark', `url("${cardLineMarkDataUri(id)}")`);
  return span;
}

/** The same, for a slot's office — the ghost inside an empty slot. */
export function slotMarkNode(slot: SlotType): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.className = 'slot-mark';
  span.style.setProperty('--line-mark', `url("${slotMarkDataUri(slot)}")`);
  return span;
}

/**
 * The emblem as a bare CSS `url(…)` value, for a surface that takes strings.
 *
 * The offer card is the one, and it is not laziness: `offerCard.ts` holds the
 * line that no simulation type crosses its boundary, so it is handed a picture
 * and an accent key rather than a `CardLine` it would have to look up. See its
 * `OfferOption.emblem`.
 */
export function cardLineMarkUrl(id: AnyCardLine): string {
  return `url("${cardLineMarkDataUri(id)}")`;
}

/** The same, for a slot's office. See `governmentEmblem` in `main.ts`. */
export function slotMarkUrl(slot: SlotType): string {
  return `url("${slotMarkDataUri(slot)}")`;
}
