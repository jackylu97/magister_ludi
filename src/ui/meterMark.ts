/**
 * The two meter marks as inline elements, for every DOM surface that shows
 * happiness or authority as a picture rather than a word: the top bar's two
 * chips, and both cards' headers — the hover card `topBar.ts` builds fresh on
 * every open, and the click-through card whose "Happiness"/"Authority" title
 * lives as static markup in `index.html`.
 *
 * `resourceMark.ts` and `yieldMark.ts`, a third time over
 * ---------------------------------------------------------
 * Same mechanism, same argument — read either module's docblock for the long
 * form. The drawing lives once as path data (`src/art/meterMarks.ts`); this
 * turns it into a `data:` URI SVG used as a CSS **mask**, ink set by
 * `currentColor`, so the same drawing reads on the top bar's ink plate and on
 * a parchment card without a second file. The vermilion the chip already
 * turns in deficit (`.civ-meter.is-alarm`) is free for exactly this reason —
 * nothing about the mask needs to know the chip is unhappy with the writ.
 *
 * No text printer here, unlike the six yields
 * ---------------------------------------------
 * `yieldMark.ts` exists mostly for `splitYieldText`, because a yield glyph is
 * *composed into a sentence* forty places over (`40⚙`, `⚙🔬🎭 −10%`). A meter
 * glyph never was: `☺`/`⚜` sat alone on a chip, or beside a word
 * ("Happiness") that already says the same thing aloud. So there is nothing
 * to walk and nothing to split — `meterMarkNode` is the whole surface.
 *
 * `☺`/`⚜` themselves are not retired. `METER_GLYPH` (`topBar.ts`) keeps them
 * as **text**, the same register `YIELD_GLYPH` keeps for the six yields: a
 * `title` attribute, the one place on this pair of chips a figure still has to
 * be a string a browser tooltip can hold rather than an element this module
 * draws.
 */

import { meterMarkDataUri, renownMarkDataUri } from '../art/meterMarks';
import type { MeterId } from '../sim/meters';

/**
 * The mark for one meter, as a span.
 *
 * `aria-hidden`, always: every call site prints the meter's name in words
 * beside it — the chip's own `aria-label`, a card's "Happiness"/"Authority"
 * heading — so the mark is decoration, and a screen reader that read it too
 * would say the thing twice.
 */
export function meterMarkNode(key: MeterId): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.className = 'meter-mark';
  // A custom property rather than `maskImage` directly, so the stylesheet
  // keeps ownership of the vendor-prefixed pair and this only supplies the
  // picture — the same split `.res-mark`/`.yield-mark` use.
  span.style.setProperty('--meter-mark', `url("${meterMarkDataUri(key)}")`);
  return span;
}

/**
 * The laurel — **renown**, the fifth Entry XVIII bucket — as the same kind of
 * span.
 *
 * It is here rather than in `yieldMark.ts` for the reason the drawing is in
 * `meterMarks.ts`: renown is not a yield (no citizen works a tile for it, no
 * city banks it, it is never drawn on the board), so it has no place in the
 * six-voice table and nothing composes it into a sentence the way `40⚙` is
 * composed. It sits alone on a chip beside a figure, which is exactly what the
 * two meter marks do, so it wears their class and their mechanism.
 *
 * `aria-hidden` for `meterMarkNode`'s reason: the chip says "renown" in words.
 */
export function renownMarkNode(): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.className = 'meter-mark';
  span.style.setProperty('--meter-mark', `url("${renownMarkDataUri()}")`);
  return span;
}
