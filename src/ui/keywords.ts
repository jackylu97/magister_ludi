/**
 * Keyword links: the named things inside a descriptor, drawn bold and — where
 * clicking is safe — pointed at the Compendium entry that defines them.
 *
 * The user's ruling (playtest, 2026-08-28): *"keywords that are linked are shown
 * in bold; only in places where clicking doesn't result in an action (buttons
 * shouldn't be keyword links); keep these to descriptors."* Three rules, and
 * this module is the second and third of them.
 *
 * One emitter, one renderer
 * -------------------------
 * The first rule lives in `src/sim/statecraft.ts`: a describer that interpolates
 * the name of a thing the reference book has a page about wraps it with `ref`,
 * so a clause's `text` carries `[[building:granary|a Granary]]` where it used to
 * carry the name. Nothing else about a clause changed — `stripRefs` is exactly
 * the sentence that was printed before — and `[[kind:id]]` is the Compendium's
 * own address scheme (`compendiumId`), so a mark is already a link before
 * anybody draws it.
 *
 * This module is the only thing in the interface that knows what that mark looks
 * like. Every surface that prints a clause does one of exactly two things:
 *
 *   · a **descriptor** — a hover card, a card face, a reference clause, a
 *     ledger line — prints it through `renderDescriptor`;
 *   · a **plain-text sink** — a `title` attribute, an announce line, a toast,
 *     the search index — takes `stripRefs` and prints words.
 *
 * There is no third option, and `test/ui/keywords.test.ts` reads the sources to
 * say so: a surface that printed `clause.text` raw would show the brackets.
 *
 * Bold always, a link sometimes
 * -----------------------------
 * `linked` is the ruling's middle clause, and it is a **safety** rule rather
 * than a style one. A keyword inside a `<button>` — an offer card's face, an
 * Order in the collection — cannot be clickable: the click that opened the book
 * would also pick the card, and picking a card is irreversible. So inside a
 * control the mark still renders bold (it is the same word about the same thing)
 * and carries no `data-ref`, no `tabindex` and no handler. The caller does not
 * have to remember which it is: `setDescriptorText` asks the element it is
 * writing into, which is the one question that cannot be got wrong.
 *
 * Yield marks still draw
 * ----------------------
 * A clause may carry both a keyword and a figure (`+1🔬 in every city with a
 * Library`), so the runs *between* marks go through `yieldTextNodes` rather than
 * becoming text nodes — this is `setYieldText` with one more thing it knows how
 * to draw, and a surface that swapped one for the other would lose either the
 * links or the marks.
 *
 * Where the click goes
 * --------------------
 * A registry rather than a callback threaded through forty builders: `main.ts`
 * hands over `compendium.open` once, and every keyword drawn anywhere uses it.
 * With nothing registered the fallback is the address bar — which is not a
 * degraded path but the **standalone page's** whole mechanism (`compendium.html`
 * listens for `hashchange`), so a keyword in the reference book works with no
 * wiring at all.
 *
 * Hover cards (batch T2)
 * ----------------------
 * Every keyword, linked or not, carries `data-keyword` with the entry it names.
 * That is what the hover cards (`keywordCards.ts`, `docs/plans/tutorial.md`
 * section 5.6) look for. Their hover and focus listeners are delegated from the
 * document, so a keyword node carries no listener it did not carry before.
 *
 * A page that mounts the cards registers them here with `setKeywordCardLayer`,
 * and one thing then changes: a click or Enter on a linked keyword locks its
 * card instead of opening the book. The card has a "Full entry" button that
 * calls `openKeyword`. When the layer cannot show the card (its definitions
 * failed to load, or the click took the keyword off the page before a card was
 * showing), it declines and the book opens as before.
 *
 * A keyword inside a control gets `data-keyword` and nothing more: no
 * `data-ref`, no tab stop, no handler. Its card can show on hover, but a click
 * on it belongs to the button underneath, so the click never locks, opens or
 * picks anything extra.
 */

import { stripRefs } from '../sim/statecraft';
import { yieldTextNodes } from './yieldMark';

export { stripRefs };

/** One piece of a descriptor: a run of words, or a named thing inside it. */
export type DescriptorPart =
  | { kind: 'text'; text: string }
  | { kind: 'keyword'; ref: string; name: string };

/**
 * The mark, as a pattern. A local copy of `statecraft.ts`'s `REF_PATTERN`
 * rather than an import of it, for the reason `stripRefs` builds a fresh one: a
 * global regex carries `lastIndex`, and a shared instance walked by two callers
 * is a parser that skips.
 */
const MARK = /\[\[([a-zA-Z]+):([A-Za-z0-9_]+)\|([^[\]|]*)\]\]/g;

/**
 * A descriptor split into its runs of words and the things they name.
 *
 * The pure half, and separated from the DOM for the reason `splitYieldText` and
 * `placeCard` are: this suite runs with no document, and *which words are
 * keywords and what they point at* is the part that can be quietly wrong on
 * every surface at once.
 *
 * A run of plain text is never empty — two adjacent marks produce two keywords
 * and nothing between them — so a consumer can append every part without
 * checking.
 */
export function splitDescriptor(text: string): DescriptorPart[] {
  const parts: DescriptorPart[] = [];
  const pattern = new RegExp(MARK.source, 'g');
  let at = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    if (match.index > at) parts.push({ kind: 'text', text: text.slice(at, match.index) });
    parts.push({ kind: 'keyword', ref: `${match[1]}:${match[2]}`, name: match[3] ?? '' });
    at = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (at < text.length) parts.push({ kind: 'text', text: text.slice(at) });
  return parts;
}

// --- where a keyword goes ---------------------------------------------------

let opener: ((entryId: string) => void) | null = null;

/**
 * Tells every keyword in the interface how to open the book.
 *
 * Called once, by `main.ts`, with the overlay's own `open`. A registry rather
 * than a parameter because a keyword is drawn by a dozen unrelated builders and
 * none of them has any business holding a screen.
 */
export function setKeywordOpener(open: ((entryId: string) => void) | null): void {
  opener = open;
}

/**
 * Opens the Compendium at one entry.
 *
 * The registered opener when there is one; otherwise the address bar, which is
 * the standalone page's own mechanism — `compendium.html` honours `#unit:scout`
 * on load and on `hashchange`, so a keyword inside the book needs no wiring to
 * work.
 */
export function openKeyword(entryId: string): void {
  if (opener !== null) {
    opener(entryId);
    return;
  }
  if (typeof window !== 'undefined') window.location.hash = entryId;
}

/** How a linked keyword was activated: a click (or tap), or Enter or Space. */
export type KeywordActivation = 'pointer' | 'keyboard';

/** The hover cards, as the keyword renderer sees them. See the module docblock. */
export interface KeywordCardLayer {
  /**
   * A click or Enter on a linked keyword. Returns true when the layer took it
   * (it locks the keyword's card), and false when it cannot, in which case the
   * book opens instead.
   */
  activate(node: HTMLElement, entryId: string, how: KeywordActivation): boolean;
}

let cardLayer: KeywordCardLayer | null = null;

/**
 * Registers the hover cards, or clears them with `null`. Called by
 * `mountKeywordCards` and by its `dispose`, never by a surface.
 */
export function setKeywordCardLayer(layer: KeywordCardLayer | null): void {
  cardLayer = layer;
}

/** The registered hover cards, or null. For the layer's own `dispose`. */
export function keywordCardLayer(): KeywordCardLayer | null {
  return cardLayer;
}

/**
 * What a click or Enter on a linked keyword does: lock its card when the
 * hover cards are mounted and can show it, and open the book otherwise.
 */
function activateKeyword(node: HTMLElement, entryId: string, how: KeywordActivation): void {
  if (cardLayer !== null && cardLayer.activate(node, entryId, how)) return;
  openKeyword(entryId);
}

// --- drawing ----------------------------------------------------------------

export interface DescriptorOptions {
  /**
   * Whether a keyword is a *link* as well as bold. Default `true`.
   *
   * `false` inside any control — see the docblock: the click that opened the
   * book would also press the button. The word still comes out bold, because it
   * is the same word about the same thing.
   */
  linked?: boolean;
}

/**
 * One keyword as a node: bold, in the ink, and pointed at its entry.
 *
 * `<b>` and not `<a>`, deliberately. This is not navigation — nothing has an
 * href, nothing opens in a tab, and the target is a screen this application
 * already has up. What it needs is the *affordance*, which is the bold and the
 * hover underline the stylesheet gives it, plus the two things a keyboard needs:
 * a tab stop and Enter.
 *
 * `data-keyword` is on every keyword and `data-ref` only on a linked one. The
 * first says which entry the hover card defines; the second says the word is
 * a link, and the stylesheet's underline and the star chart's card both key on
 * it.
 */
export function keywordNode(entryId: string, name: string, linked = true): HTMLElement {
  const node = document.createElement('b');
  node.className = 'kw';
  node.dataset.keyword = entryId;
  if (!linked) {
    node.textContent = name;
    return node;
  }
  node.dataset.ref = entryId;
  node.tabIndex = 0;
  node.setAttribute('role', 'button');
  node.textContent = name;
  node.addEventListener('click', (event) => {
    // Stopped, always: a keyword sits inside cards and panels that have their
    // own click handlers, and the one thing a keyword must never do is also do
    // whatever it was standing on top of.
    event.preventDefault();
    event.stopPropagation();
    activateKeyword(node, entryId, 'pointer');
  });
  node.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    activateKeyword(node, entryId, 'keyboard');
  });
  return node;
}

/**
 * A descriptor as nodes: the words, with every yield glyph drawn and every
 * named thing marked.
 *
 * The one renderer. Text runs go through `yieldTextNodes` rather than becoming
 * plain text nodes, so this is `setYieldText`'s job plus one — a surface that
 * chose between them would lose either its figures or its links.
 */
export function renderDescriptor(
  text: string,
  options: DescriptorOptions = {},
): DocumentFragment {
  const linked = options.linked ?? true;
  const fragment = document.createDocumentFragment();
  for (const part of splitDescriptor(text)) {
    fragment.append(
      part.kind === 'text'
        ? yieldTextNodes(part.text)
        : keywordNode(part.ref, part.name, linked),
    );
  }
  return fragment;
}

/**
 * Writes a descriptor into an element — **the call every descriptor surface
 * makes**, and `setYieldText`'s replacement wherever the string may name a thing.
 */
export function setDescriptorText(
  element: HTMLElement,
  text: string,
  options: DescriptorOptions = {},
): void {
  element.replaceChildren(renderDescriptor(text, options));
}

/**
 * Whether keywords drawn *into* this host may be links — the ruling's middle
 * clause, asked of the one thing that answers it.
 *
 * The **tag**, not a class name: the same card face is a `<button>` on the
 * Statecraft screen (pick it up) and an `<article>` in the Compendium (read it),
 * and what decides is whether a click already means something, which is exactly
 * what the tag says. Asked by the builder that owns the host, before anything is
 * appended — a `closest` walk would depend on when the subtree was joined to the
 * page and would therefore be right or wrong by accident.
 */
export function keywordsAllowedIn(host: HTMLElement): boolean {
  const tag = host.tagName.toLowerCase();
  return tag !== 'button' && tag !== 'a';
}
