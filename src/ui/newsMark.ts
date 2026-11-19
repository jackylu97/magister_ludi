/**
 * The head of a line of news: its drawn mark, and the name in it that is new.
 *
 * Batch SS1 (the Scholar's Study Main and Marks boards, approved by the user on
 * 2026-10-16) gave each kind of news its own mark, in place of the Unicode
 * character that used to lead a toast (`◉`, `◈`, `✦`). The toast stack and the
 * chronicle both print an entry through here, so a toast and its line in the
 * chronicle cannot disagree.
 *
 * Three rules, from the boards:
 *   - The mark is drawn, in the deep ink of its kind: the sun on the horizon
 *     for an age, the arch for a Triumph, the laurel for a great person, the
 *     compass star for research, and the bead for a bead.
 *   - Red ink marks only the name that is new (`NotificationEntry.news`).
 *   - A kind of news the boards gave no mark keeps its leading character, but
 *     in the mark's slot rather than in the sentence, so every line starts its
 *     words at the same place. The character is hidden from a screen reader,
 *     which the critique asked for: a live region read "fisheye A bead" aloud.
 */

import { AGE_MARK, BEAD_MARK, HELD_MARK, TRIUMPH_MARK, newsMarkDataUri } from '../art/newsMarks';
import { inPlayMarkDataUri } from '../art/inPlayMarks';
import { renownMarkDataUri } from '../art/meterMarks';
import { yieldMarkDataUri } from '../art/yieldMarks';
import { cornerStarDataUri } from './deviceMarks';
import type { NewsMarkKind, NotificationEntry } from './notifications';
import { hasYieldGlyph, setYieldText } from './yieldMark';

/** Each mark's picture, as a `data:` URI for a mask. */
function markUri(kind: NewsMarkKind): string {
  switch (kind) {
    case 'age':
      return newsMarkDataUri(AGE_MARK);
    case 'triumph':
      return newsMarkDataUri(TRIUMPH_MARK);
    case 'bead':
      return newsMarkDataUri(BEAD_MARK);
    case 'greatPerson':
      return renownMarkDataUri();
    case 'research':
      return cornerStarDataUri();
    case 'culture':
      return yieldMarkDataUri('culture');
    case 'wonder':
      return inPlayMarkDataUri('wonder');
    case 'held':
      return newsMarkDataUri(HELD_MARK);
  }
}

/** Each mark's ink when the entry names none: deep gilt for the honours, lapis for knowledge. */
const MARK_INK: Readonly<Record<NewsMarkKind, string>> = {
  age: '--deep-gilt',
  triumph: '--deep-gilt',
  greatPerson: '--deep-gilt',
  research: '--lapis',
  bead: '--lapis',
  culture: '--y-cul',
  wonder: '--lapis',
  held: '--deep-gilt',
};

/**
 * A leading character and its space: `⚔ `, `◈ `, `🎵 `. One or two code
 * points of anything that is not a letter, a digit or a space, so a sentence
 * that starts with a figure (`−3`, `+2`) or a word is never touched.
 */
const LEADING_GLYPH = /^([^\p{L}\p{N}\s]{1,2})\s+/u;

/** The leading character of a line, when it is a mark and not a yield glyph. */
function leadingGlyph(text: string): string | null {
  const match = LEADING_GLYPH.exec(text);
  if (match === null) return null;
  const glyph = match[1]!;
  // A yield or meter glyph is drawn by the yield printer in the sentence.
  if (hasYieldGlyph(glyph)) return null;
  return glyph;
}

/**
 * The mark's slot: the drawing for a marked kind, the old character for an
 * unmarked one that had a character, or an empty slot so the words still line
 * up. Always hidden from a screen reader: the sentence says what happened.
 */
export function newsMarkNode(entry: NotificationEntry): HTMLElement {
  const slot = document.createElement('span');
  slot.setAttribute('aria-hidden', 'true');
  if (entry.mark !== undefined) {
    slot.className = `news-mark is-${entry.mark}`;
    slot.style.setProperty('--news-mark', `url("${markUri(entry.mark)}")`);
    slot.style.setProperty('--news-ink', `var(${entry.ink ?? MARK_INK[entry.mark]})`);
    return slot;
  }
  const glyph = leadingGlyph(entry.text);
  slot.className = glyph === null ? 'news-mark is-empty' : 'news-mark is-glyph';
  if (glyph !== null) slot.textContent = glyph;
  return slot;
}

/**
 * Writes the sentence into `target`: without the leading character that the
 * slot now holds, with the new name in red ink, and with any yield glyph drawn
 * (`setYieldText`). The entry's own string is unchanged: it is the record.
 */
export function writeNewsText(target: HTMLElement, entry: NotificationEntry): void {
  const glyph = leadingGlyph(entry.text);
  const text = glyph === null ? entry.text : entry.text.replace(LEADING_GLYPH, '');
  const at = entry.news === undefined || entry.news === '' ? -1 : text.indexOf(entry.news);
  if (at < 0) {
    setYieldText(target, text);
    return;
  }
  target.replaceChildren();
  const before = document.createElement('span');
  setYieldText(before, text.slice(0, at));
  const news = document.createElement('span');
  news.className = 'news-word';
  news.textContent = entry.news!;
  const after = document.createElement('span');
  setYieldText(after, text.slice(at + entry.news!.length));
  target.append(...before.childNodes, news, ...after.childNodes);
}

/**
 * The bead's character, `◉`: the text form of the bead, for a string that has
 * to stay a string (a `title`, a test). Wherever the bead is *drawn* (the top
 * bar, a town's race project, the Compendium), `beadMarkNode` draws the glass
 * bead on its wire instead (the Marks board).
 */
export const BEAD_GLYPH = '◉';

/**
 * The bead as a span: a mask of the drawing in `currentColor`, sized in `em`
 * like a meter's mark. `aria-hidden`: every place it stands says "bead" in
 * words beside it.
 */
export function beadMarkNode(): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.className = 'bead-mark';
  span.style.setProperty('--bead-mark', `url("${newsMarkDataUri(BEAD_MARK)}")`);
  return span;
}
