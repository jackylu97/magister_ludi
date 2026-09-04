/**
 * The yield marks as inline elements, for every DOM surface that quotes a
 * figure in one of the six voices: the top bar's strip and its cards, a city
 * panel's chips, build buttons and modifier ledger, the tile readout, the star
 * chart's unlock lines, the unit panel's improvement rows.
 *
 * `resourceMark.ts`, one set over
 * ------------------------------
 * Same mechanism and the same argument, so read that module's docblock for the
 * long form: the drawing lives once as path data (`src/art/yieldMarks.ts`), the
 * board traces it into the icon atlas, and this turns it into a `data:` URI SVG
 * used as a CSS **mask** with `background-color: currentColor`. The ink is
 * therefore whatever the text beside it is, which is the only way one drawing
 * can sit on parchment in a city panel and on ink in the top bar's plates.
 *
 * The masks here take *stroked* art, which is worth saying out loud because it
 * is the one thing that could have made a vendored outline set unusable: a mask
 * reads the alpha of what is painted, and a stroke paints alpha exactly as a
 * fill does. An outline icon masks as an outline. Nothing had to be converted.
 *
 * One printer, and why it takes a string
 * --------------------------------------
 * `resourceMarkNode` takes a resource id, because a resource mark stands beside
 * a *name* and there is one of them. A yield mark is a **unit on a figure**, and
 * this interface composes figures as text — `40⚙`, `+1🔬/pop`, `⚙ +25%`,
 * `🔬🎭 −10%` — in something like forty places, several of which hand the
 * finished string to a shared row builder or a test. Handing every one of those
 * a node API would have meant forty signature changes and four `string | Node`
 * unions, and the first surface anybody added afterwards would have gone back to
 * concatenating a glyph.
 *
 * So the seam is: **`figures.ts` composes the sentence in `YIELD_GLYPH`, and
 * this module prints it.** `yieldTextNodes` walks the string, swaps each of the
 * six glyphs for its drawn mark and leaves everything else alone. Composition
 * stays stringly-typed, testable and unchanged; the *rendering* moved, once. A
 * surface that forgets to print through here shows an emoji, which is a visible
 * failure rather than a silent one — and `test/ui/yieldMark.test.ts` sweeps the
 * built HUD for exactly that.
 *
 * What stays text, deliberately
 * -----------------------------
 * `YIELD_GLYPH` is not going away and is not deprecated. It is the right answer
 * wherever a figure has to *be a string*: an `aria-label`, a `title` attribute
 * (the platform builds that tooltip and it cannot hold an element), an announce
 * line, the mono log. Those surfaces keep the emoji on purpose — the register is
 * in `figures.ts`.
 */

import { METER_GLYPH, YIELD_GLYPH, type YieldKey } from './figures';
import { meterMarkNode } from './meterMark';
import { yieldMarkDataUri } from '../art/yieldMarks';
import type { MeterId } from '../sim/meters';

/**
 * The reverse of `YIELD_GLYPH`: which voice a character stands for.
 *
 * Built from that table rather than written out, so the two cannot disagree
 * about what `⚙` means — and so that changing a fallback glyph is one edit.
 */
const GLYPH_YIELD = new Map<string, YieldKey>(
  (Object.keys(YIELD_GLYPH) as YieldKey[]).map((key) => [YIELD_GLYPH[key], key]),
);

/**
 * The same reverse table for the **two meters**, and the reason this printer
 * grew a second one.
 *
 * A meter glyph used to sit alone on a chip beside a word, which is why
 * `meterMark.ts` has no printer of its own. The card stamp ended that (user,
 * 2026-09-03 — happiness and authority are figures on a card's face now, `+4☺`
 * beside `+2🔬`), and a *composed* glyph is exactly what this module exists to
 * swap for a drawing. One walk, two tables, one seam: a surface that composes
 * either kind of mark into a sentence prints the drawing, and a surface that
 * needs a string still imports the character from `figures.ts`.
 */
const GLYPH_METER = new Map<string, MeterId>(
  (Object.keys(METER_GLYPH) as MeterId[]).map((key) => [METER_GLYPH[key], key]),
);

/**
 * The mark for one yield, as a span.
 *
 * `aria-hidden`, always. Every figure this stands beside is announced some other
 * way — a chip carries an `aria-label` that says the yield in words, a build
 * button's `title` spells the cost out in plain glyphs — so the mark is
 * decoration, and a screen reader that read it would say the thing twice. A
 * surface that shows a mark with *no* accessible text beside it needs a label of
 * its own, not a flag here.
 *
 * `lead` moves the mark's air to its right, for the marks that come *before*
 * their figure (`⚙ +25%`, the modifier voice) rather than after it (`40⚙`, the
 * quantity voice). `yieldTextNodes` decides which from the string itself; see
 * there. A class and not `:first-child`, which counts elements only and would
 * therefore fire on the trailing mark in `40⚙` too — the text node before it
 * does not make it a second child.
 */
export function yieldMarkNode(key: YieldKey, lead = false): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.className = lead ? 'yield-mark is-lead' : 'yield-mark';
  // A custom property rather than `maskImage` directly, so the stylesheet keeps
  // ownership of the vendor-prefixed pair and this only supplies the picture.
  span.style.setProperty('--yield-mark', `url("${yieldMarkDataUri(key)}")`);
  return span;
}

/** Does this string carry any drawable glyph? The cheap check before the walk. */
export function hasYieldGlyph(text: string): boolean {
  for (const glyph of GLYPH_YIELD.keys()) if (text.includes(glyph)) return true;
  for (const glyph of GLYPH_METER.keys()) if (text.includes(glyph)) return true;
  return false;
}

/**
 * One piece of a composed figure: a run of plain text, or a mark to draw.
 *
 * `'meter'` is its own variant rather than a flag on `'mark'` because the two
 * draw from two tables and two stylesheets' classes — and because every caller
 * that reads a part today is asking about a *yield*, and a widened `key` would
 * have made each of them silently wrong instead of loudly.
 */
export type YieldTextPart =
  | { kind: 'text'; text: string }
  | { kind: 'mark'; key: YieldKey; lead: boolean }
  | { kind: 'meter'; key: MeterId; lead: boolean };

/**
 * A composed figure, split into the runs of text and the marks between them.
 *
 * The pure half of the printer, and separated from the DOM for the reason
 * `yieldRowLayout` and `stageRows` are: this suite has no jsdom, and *where the
 * marks are and which way they face* is the part that can be quietly wrong on
 * every surface at once. `yieldTextNodes` is this plus `document`.
 *
 * Walked by *code point* (`Array.from`), not by UTF-16 unit: four of the six
 * glyphs are surrogate pairs, and a loop over `text[i]` would split them into
 * halves that match nothing and print as tofu.
 *
 * A mark **leads** when the character after it is a space. That one rule gets
 * every shape this interface writes right, and it is a rule about the *sentence*
 * rather than a flag a caller has to remember:
 *
 *   `40⚙`         nothing after it — a unit on a quantity, trailing.
 *   `+1🔬/pop`     a slash after it — still the unit on the quantity.
 *   `⚙ +25%`       a space after it — the mark names what is modified, leading.
 *   `⚙🔬🎭 −10%`   the run tightens and only the last one takes the gap.
 */
export function splitYieldText(text: string): YieldTextPart[] {
  const parts: YieldTextPart[] = [];
  const chars = Array.from(text);
  let plain = '';
  const flush = (): void => {
    if (plain === '') return;
    parts.push({ kind: 'text', text: plain });
    plain = '';
  };
  chars.forEach((char, index) => {
    const lead = chars[index + 1] === ' ';
    const key = GLYPH_YIELD.get(char);
    if (key !== undefined) {
      flush();
      parts.push({ kind: 'mark', key, lead });
      return;
    }
    const meter = GLYPH_METER.get(char);
    if (meter !== undefined) {
      flush();
      parts.push({ kind: 'meter', key: meter, lead });
      return;
    }
    plain += char;
  });
  flush();
  return parts;
}

/** One part of a split figure as the node that draws it. */
function partNode(part: YieldTextPart): Node {
  if (part.kind === 'text') return document.createTextNode(part.text);
  if (part.kind === 'meter') {
    const node = meterMarkNode(part.key);
    // The meter mark's own class knows nothing about sitting in a sentence, so
    // the *composition* rule is applied here: `.is-lead` is what moves a mark's
    // air to its right, and it is the same rule for both kinds of mark.
    node.classList.add('meter-mark-inline');
    if (part.lead) node.classList.add('is-lead');
    return node;
  }
  return yieldMarkNode(part.key, part.lead);
}

/** One composed figure as nodes: the text, with every glyph in it drawn. */
export function yieldTextNodes(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const part of splitYieldText(text)) fragment.append(partNode(part));
  return fragment;
}

/**
 * Writes a composed figure into an element, marks drawn.
 *
 * The one call every surface makes, and the reason it takes the element rather
 * than handing back a fragment: it can then fall through to `textContent` for
 * the overwhelming majority of strings that carry no glyph at all, which is what
 * makes it safe to route a panel's *whole* element builder through here.
 */
export function setYieldText(element: HTMLElement, text: string): void {
  if (!hasYieldGlyph(text)) {
    if (element.textContent !== text) element.textContent = text;
    return;
  }
  element.replaceChildren(yieldTextNodes(text));
}

/**
 * The **animated** writer: one element, written many times a second, without
 * rebuilding it.
 *
 * `setYieldText` is right for the ninety-nine surfaces that write a figure once
 * and leave it: it throws the element's children away and builds new ones, which
 * costs nothing when it happens on a click. The card stamp's count-up writes the
 * same element on every animation frame for three quarters of a second, and
 * there `replaceChildren` is the whole of the "clunk" the 2026-09-03 playtest
 * reported: each tick destroyed and rebuilt every mark span, and each mark span
 * carries a `data:` URI of the best part of a kilobyte in an inline custom
 * property. Forty-odd style-attribute parses and forty-odd subtree replacements
 * inside one count,
 * every one of them dirtying the layout of a large parchment card that is
 * simultaneously being animated.
 *
 * The observation that fixes it: across a count **only the digits change**. The
 * glyphs, their order and which way each faces are fixed the moment the figure
 * is composed, because the figure counts from zero to a target of a known sign.
 * So the writer builds the row once, keeps the text nodes, and afterwards writes
 * `nodeValue` — no element churn, no style parse, no subtree replacement. It
 * still compares the split *shape* each time and rebuilds if it differs, so a
 * caller that changes voices mid-flight is correct rather than merely fast.
 */
export function yieldTextWriter(element: HTMLElement): (text: string) => void {
  let shape: string | null = null;
  let slots: Text[] = [];
  return (text: string): void => {
    const parts = splitYieldText(text);
    const next = shapeOf(parts);
    if (next === shape) {
      let at = 0;
      for (const part of parts) {
        if (part.kind !== 'text') continue;
        const slot = slots[at++];
        if (slot !== undefined && slot.nodeValue !== part.text) slot.nodeValue = part.text;
      }
      return;
    }
    shape = next;
    slots = [];
    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      const node = partNode(part);
      if (part.kind === 'text') slots.push(node as Text);
      fragment.append(node);
    }
    element.replaceChildren(fragment);
  };
}

/**
 * A split figure's **skeleton**: everything about it that is not a digit.
 *
 * Two figures with the same shape can be written into one another by moving text
 * only, which is the whole of what `yieldTextWriter` needs to know. Text runs
 * collapse to a marker; marks carry their table, their key and their facing,
 * because a mark that changed side would want its class rewritten.
 */
function shapeOf(parts: readonly YieldTextPart[]): string {
  return parts
    .map((part) => (part.kind === 'text' ? 't' : `${part.kind}:${part.key}:${part.lead ? 'l' : 't'}`))
    .join('|');
}

/**
 * "40⚙" — a quantity with its yield's mark after it, drawn.
 *
 * The order is the one this interface has always used for a quantity in a
 * currency: the number leads, the unit follows it tight, with no space between
 * them. Built on the printer rather than beside it, so there is exactly one
 * implementation of what a mark looks like next to a figure.
 */
export function yieldFigureNodes(text: string, key: YieldKey): DocumentFragment {
  return yieldTextNodes(`${text}${YIELD_GLYPH[key]}`);
}

/**
 * "⚙ +25%" — the mark before the figure, the modifier voice.
 *
 * The other of the two orders, and the distinction is real rather than
 * typographic: `yieldFigureNodes` quotes an *amount of* something, so the mark
 * is its unit and belongs after it, while a modifier line names *what is being
 * modified* and then says by how much.
 */
export function yieldLabelNodes(key: YieldKey, text: string): DocumentFragment {
  return yieldTextNodes(`${YIELD_GLYPH[key]} ${text}`);
}

/**
 * The plain-text glyph, re-exported so a surface that has *decided* to stay text
 * says so by importing from here rather than by reaching past this module.
 *
 * Not a convenience: it is the seam. Every remaining `YIELD_GLYPH` that reaches
 * a user should be one somebody chose — an aria-label, an announce string, a
 * `title`, the mono log — and importing it through the drawn-mark module is what
 * makes that choice visible at the import line.
 */
export { YIELD_GLYPH };
