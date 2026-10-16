/**
 * The hover cards on keyword links, on the page (batch T2,
 * `docs/plans/tutorial.md` section 5.6).
 *
 * Hovering a bold keyword in any descriptor shows its short Compendium
 * definition in a card. Holding the hover, or clicking the keyword, locks the
 * card; a locked card can be entered, and the keywords on it open child cards.
 * Every rule about when a card shows, locks and closes is in
 * `keywordCardStack.ts`, which is pure. This module is the DOM half:
 *
 *   - it listens, once, on the document and the window, and turns pointer,
 *     focus and key events into the stack's events;
 *   - it runs the three timers the stack asks for;
 *   - it draws whatever the stack says is open, with the definitions from
 *     `keywordDefinitions.ts` printed through `keywords.ts`'s one renderer;
 *   - it registers with `keywords.ts`, so a click or Enter on a linked keyword
 *     locks the card instead of opening the book.
 *
 * Why it is one layer for the whole page
 * --------------------------------------
 * A keyword is drawn by dozens of builders across every screen, and most of
 * them rebuild their DOM on every render. Listening on each keyword would mean
 * a listener for every node ever drawn and a cleanup nobody owns. The listeners
 * here are delegated instead: a keyword is anything matching
 * `.kw[data-keyword]`, wherever and whenever it was drawn, so every surface
 * that prints a descriptor has hover cards without being told about them.
 *
 * It is mounted once per page (`main.ts`), before any sheet is built, and it is
 * a property of the page, like the Compendium: it is never in `gameDisposers`.
 * Its Escape listener is on the window in the capture phase, and being bound
 * before every sheet's is what lets the first Escape close the top card and
 * the second close the sheet under it. `mountKeywordCards` disposes any layer
 * already mounted, so a page can never hold two sets of listeners, and
 * `dispose` takes off every listener it put on.
 *
 * Inside a control
 * ----------------
 * A keyword inside a `<button>` (an offer card's face, an Order in the
 * collection) has no click handler and no tab stop (`keywords.ts`). Its card
 * shows on hover and can be locked by holding, and the card itself is drawn on
 * the page's body, never inside the button, so nothing on the card can press
 * the button. A press on the button is a press outside every card: the cards
 * close and the button does what it always did.
 *
 * Keyboard and screen readers
 * ---------------------------
 * Keyboard focus on a linked keyword shows its card at once, and the keyword is
 * described by the card's body (`aria-describedby`); the focus a click leaves
 * on a keyword does not count (`keyboardFocus`). Enter pins the card and moves
 * focus into it; the card is a non-modal dialog named by its title. Tab stays
 * inside the top card, Escape closes it and puts focus back on the keyword that
 * opened it, and the back button does the same one level down.
 */

import './keywordCards.css';

import type { AnchorBox } from './infoCard';
import { element } from './dom';
import {
  type KeywordActivation,
  type KeywordCardLayer,
  keywordCardLayer,
  keywordNode,
  openKeyword,
  setDescriptorText,
  setKeywordCardLayer,
} from './keywords';
import {
  KEYWORD_GRACE_MS,
  KEYWORD_HOLD_MS,
  KEYWORD_SHOW_MS,
  type KeywordAt,
  type KeywordCard,
  type KeywordCardEvent,
  type KeywordCardState,
  type LockedCard,
  type PreviewCard,
  closedKeywordCards,
  graceTimerFor,
  holdTimerFor,
  keywordCardStep,
  keywordCardsOpen,
  placeKeywordCard,
  previewHoldable,
  showTimerFor,
  shownCards,
} from './keywordCardStack';
import {
  type DefinitionReader,
  type KeywordDefinition,
  loadKeywordDefinitions,
} from './keywordDefinitions';
import { setYieldText } from './yieldMark';

/** How far a card sits from its keyword, and from the window's edges. */
const GAP = 8;

/** What can hold focus inside a card: its buttons and its linked keywords. */
const FOCUSABLE = 'button:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Where focus goes back to when a keyword inside a control loses its card. */
const FOCUS_HOME = 'button, a[href], [tabindex]:not([tabindex="-1"])';

export interface KeywordCards {
  /** Is any card on screen? What the screen registry asks. */
  readonly isOpen: boolean;
  /** Closes every card. The screen registry's close; safe with none open. */
  close(): void;
  /** Takes off every listener, stops the timers and removes the cards. */
  dispose(): void;
}

export interface KeywordCardsOptions {
  /** Where the cards are drawn. The page's body unless a caller says otherwise. */
  root?: HTMLElement;
  /** The definitions. The Compendium's own, loaded on first use, by default. */
  definitions?: () => Promise<DefinitionReader>;
  /** Opens a full entry. The book (`openKeyword`) by default. */
  openEntry?: (entryId: string) => void;
}

/** One card on the page. */
interface CardView {
  readonly id: number;
  readonly parent: number | null;
  readonly el: HTMLElement;
  readonly body: HTMLElement;
  readonly foot: HTMLElement;
  readonly definition: KeywordDefinition;
  readonly anchor: HTMLElement;
  /** Where the keyword was when last measured, for a keyword since torn out. */
  anchorBox: AnchorBox;
  /** The mode it was last drawn in (`modeOf`), or empty before the first. */
  drawn: string;
  holdBar: HTMLElement | null;
  /** Which run of the hold timer its bar was drawn for. */
  holdRun: number;
}

/** The one layer on this page, so a second mount can take the first one off. */
let mounted: KeywordCards | null = null;

/** A rectangle's four edges, copied off a live `DOMRect`. */
function boxOf(node: Element): AnchorBox {
  const rect = node.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/** The element an event came from, when it is one. A document or a window is not. */
function elementOf(target: EventTarget | null): Element | null {
  return target !== null && typeof (target as Element).closest === 'function' ? (target as Element) : null;
}

/**
 * Did the keyboard put focus here, rather than a click? The browser's own
 * answer is `:focus-visible`. A browser too old to know the selector throws,
 * and is treated as the keyboard, which only costs a card shown on a click.
 */
function keyboardFocus(node: Element | null): boolean {
  if (node === null) return false;
  try {
    return node.matches(':focus-visible');
  } catch {
    return true;
  }
}

/** The line under a preview that says how to keep it, or null for none. */
function previewHint(card: PreviewCard<HTMLElement>, holdable: boolean): string | null {
  if (card.source === 'focus') return 'Press Enter to keep it open';
  if (card.linked) return holdable ? 'Click or hold to keep it open' : 'Click to keep it open';
  return holdable ? 'Hold to keep it open' : null;
}

export function mountKeywordCards(options: KeywordCardsOptions = {}): KeywordCards {
  mounted?.dispose();

  const root = options.root ?? document.body;
  const loadDefinitions = options.definitions ?? loadKeywordDefinitions;
  const openEntry = options.openEntry ?? openKeyword;

  let state: KeywordCardState<HTMLElement> = closedKeywordCards();
  let reader: DefinitionReader | null = null;
  let loading = false;
  let loadFailed = false;
  let disposed = false;
  const views = new Map<number, CardView>();
  /** A card Enter pinned before the definitions arrived; focused once drawn. */
  let focusWanted: number | null = null;
  /** True while focus is being handed back, so the keyword does not reopen its card. */
  let quietFocus = false;
  /**
   * The keyword the pointer last arrived on, and where it was. A click can take
   * its own keyword off the page before the keyword hears it (the star chart's
   * card empties itself on a keyword click), and this is where its card goes.
   */
  let lastSeen: { node: HTMLElement; box: AnchorBox } | null = null;

  // --- the event loop ---------------------------------------------------------
  //
  // Events are queued, because drawing can raise more of them: handing focus
  // back fires `focusin`, and a card that cannot be drawn is dropped. A queue
  // keeps every step whole, one after the other.

  interface Job {
    readonly event: KeywordCardEvent<HTMLElement> | null;
    readonly restoreFocus: boolean;
  }
  const queue: Job[] = [];
  let busy = false;

  function send(event: KeywordCardEvent<HTMLElement>, restoreFocus = false): void {
    run({ event, restoreFocus });
  }

  /** Draws again with no event: the definitions have just arrived. */
  function redraw(): void {
    run({ event: null, restoreFocus: false });
  }

  function run(job: Job): void {
    if (disposed) return;
    queue.push(job);
    if (busy) return;
    busy = true;
    try {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        const before = state;
        if (next.event !== null) state = keywordCardStep(state, next.event);
        syncTimers();
        if (next.event === null || state !== before) draw(next.restoreFocus);
      }
    } finally {
      busy = false;
    }
  }

  // --- the timers -------------------------------------------------------------
  //
  // Each runs while the stack names something for it, and restarts when the
  // name changes. A timer that fires forgets its name first, so the step it
  // sends can ask for it again.

  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let showFor: number | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let holdFor: number | null = null;
  /** Counts the hold timer's starts, so its bar restarts with it. */
  let holdRun = 0;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let graceFor: string | null = null;

  function syncTimers(): void {
    const show = showTimerFor(state);
    if (show !== showFor) {
      if (showTimer !== null) clearTimeout(showTimer);
      showTimer = null;
      showFor = show;
      if (show !== null) {
        showTimer = setTimeout(() => {
          showTimer = null;
          showFor = null;
          send({ type: 'showDue' });
        }, KEYWORD_SHOW_MS);
      }
    }
    const hold = holdTimerFor(state);
    if (hold !== holdFor) {
      if (holdTimer !== null) clearTimeout(holdTimer);
      holdTimer = null;
      holdFor = hold;
      if (hold !== null) {
        holdRun += 1;
        holdTimer = setTimeout(() => {
          holdTimer = null;
          holdFor = null;
          send({ type: 'holdDue' });
        }, KEYWORD_HOLD_MS);
      }
    }
    const grace = graceTimerFor(state);
    if (grace !== graceFor) {
      if (graceTimer !== null) clearTimeout(graceTimer);
      graceTimer = null;
      graceFor = grace;
      if (grace !== null) {
        graceTimer = setTimeout(() => {
          graceTimer = null;
          graceFor = null;
          send({ type: 'graceDue' });
        }, KEYWORD_GRACE_MS);
      }
    }
  }

  function stopTimers(): void {
    for (const timer of [showTimer, holdTimer, graceTimer]) {
      if (timer !== null) clearTimeout(timer);
    }
    showTimer = holdTimer = graceTimer = null;
    showFor = holdFor = null;
    graceFor = null;
  }

  // --- the definitions --------------------------------------------------------

  function ensureDefinitions(): void {
    if (reader !== null || loading || disposed) return;
    loading = true;
    loadDefinitions().then(
      (loaded) => {
        loading = false;
        if (disposed) return;
        reader = loaded;
        loadFailed = false;
        redraw();
      },
      () => {
        // No card can be drawn. A click on a keyword opens the book instead
        // (`activate`), and the next hover tries the load again.
        loading = false;
        loadFailed = true;
        if (!disposed) send({ type: 'closeAll' });
      },
    );
  }

  // --- drawing ----------------------------------------------------------------

  /** A key for how a card is drawn; it is redrawn when this changes. */
  function modeOf(card: KeywordCard<HTMLElement>, locked: LockedCard<HTMLElement> | null): string {
    if (locked !== null) return locked.pinned ? 'pinned' : 'held';
    const preview = card as PreviewCard<HTMLElement>;
    return `preview ${preview.source} ${preview.linked ? 'link' : 'word'} ${previewHoldable(state) ? 'hold' : 'stay'}`;
  }

  /**
   * Where a keyword is on screen: its own box while it is on the page and laid
   * out, or where the pointer last found it, or null when neither is known.
   */
  function anchorBoxOf(anchor: HTMLElement): AnchorBox | null {
    if (anchor.isConnected) {
      const box = boxOf(anchor);
      if (box.right > box.left || box.bottom > box.top) return box;
    }
    return lastSeen !== null && lastSeen.node === anchor ? lastSeen.box : null;
  }

  function buildView(card: KeywordCard<HTMLElement>, definition: KeywordDefinition, anchorBox: AnchorBox): CardView {
    const el = element('div', 'kwc');
    el.id = `kwc-${card.id}`;
    el.dataset.kwc = String(card.id);
    // Focusable by script only: Enter puts focus here, and Tab goes on into
    // the card's own keywords and buttons.
    el.tabIndex = -1;

    const head = element('div', 'kwc-head');
    head.append(element('p', 'kwc-eyebrow eyebrow', definition.eyebrow));
    const name = element('p', 'kwc-name', definition.name);
    name.id = `kwc-${card.id}-name`;
    head.append(name);

    const body = element('div', 'kwc-body');
    body.id = `kwc-${card.id}-body`;
    const foot = element('div', 'kwc-foot');

    // Last in the card, so Tab reaches it after everything else on the card;
    // the stylesheet puts it in the top corner.
    const close = element('button', 'kwc-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => send({ type: 'closeAll' }, true));

    el.append(head, body, foot, close);
    el.setAttribute('aria-labelledby', name.id);
    el.setAttribute('aria-describedby', body.id);
    return {
      id: card.id,
      parent: card.parent,
      el,
      body,
      foot,
      definition,
      anchor: card.anchor,
      anchorBox,
      drawn: '',
      holdBar: null,
      holdRun: 0,
    };
  }

  /**
   * The definition, printed. The figures go through `setYieldText` and the
   * clauses through `setDescriptorText`, the same two printers the Compendium
   * uses, so a card reads exactly as the entry it came from.
   *
   * The keywords are links only on a locked card. A preview cannot be entered,
   * so a link on it would offer a click that cannot land; the same reason the
   * city panel's hover cards print theirs plain.
   */
  function fillBody(view: CardView, linked: boolean): void {
    const { body, definition } = view;
    body.replaceChildren();
    if (definition.rows.length > 0) {
      const rows = element('ul', 'kwc-rows');
      for (const row of definition.rows) {
        const item = element('li', 'kwc-row');
        item.append(element('span', 'kwc-row-label', row.label));
        const value = element('span', 'kwc-row-value');
        setYieldText(value, row.figures);
        item.append(value);
        rows.append(item);
      }
      body.append(rows);
    }
    if (definition.prose) {
      for (const line of definition.lines) {
        const paragraph = element('p', 'kwc-prose');
        setDescriptorText(paragraph, line.text, { linked });
        body.append(paragraph);
      }
    } else if (definition.lines.length > 0) {
      const lines = element('ul', 'kwc-lines');
      for (const line of definition.lines) {
        const item = element(
          'li',
          line.standing === true
            ? 'kwc-line is-standing'
            : line.deferred === true
              ? 'kwc-line is-deferred'
              : 'kwc-line',
        );
        setDescriptorText(item, line.text, { linked });
        lines.append(item);
      }
      body.append(lines);
    }
    if (!linked) return;
    // A keyword naming the card it sits on would open the same card again.
    // It stays bold, as the same word about the same thing, without the link.
    for (const word of Array.from(body.querySelectorAll<HTMLElement>('.kw[data-ref]'))) {
      if (word.dataset.ref !== definition.id) continue;
      word.replaceWith(keywordNode(definition.id, word.textContent ?? '', false));
    }
  }

  /** The footer: how to keep a preview, or a locked card's two buttons. */
  function fillFoot(view: CardView, card: KeywordCard<HTMLElement>, locked: LockedCard<HTMLElement> | null): void {
    const { foot, definition } = view;
    foot.replaceChildren();
    if (locked === null) {
      const hint = previewHint(card as PreviewCard<HTMLElement>, previewHoldable(state));
      foot.hidden = hint === null;
      if (hint !== null) foot.append(element('span', 'kwc-hint', hint));
      return;
    }
    foot.hidden = false;
    if (card.parent !== null) {
      const back = element('button', 'kwc-back', '‹ Back');
      back.type = 'button';
      const parentName = views.get(card.parent)?.definition.name;
      back.setAttribute('aria-label', parentName === undefined ? 'Back' : `Back to ${parentName}`);
      back.addEventListener('click', () => send({ type: 'back', card: card.id }, true));
      foot.append(back);
    }
    const entry = element('button', 'kwc-entry', 'Full entry ›');
    entry.type = 'button';
    entry.setAttribute('aria-label', `Open the full entry for ${definition.name} in the Compendium`);
    entry.addEventListener('click', () => {
      send({ type: 'closeAll' }, true);
      openEntry(definition.id);
    });
    foot.append(entry);
  }

  function dress(view: CardView, card: KeywordCard<HTMLElement>, locked: LockedCard<HTMLElement> | null, mode: string): void {
    const isLocked = locked !== null;
    const wasLocked = view.drawn === 'held' || view.drawn === 'pinned';
    view.el.classList.toggle('is-locked', isLocked);
    view.el.classList.toggle('is-pinned', locked?.pinned === true);
    // A preview is a tooltip: it describes the keyword under the pointer. A
    // locked card has controls, so it is a dialog, though not a modal one.
    view.el.setAttribute('role', isLocked ? 'dialog' : 'tooltip');
    if (view.drawn === '' || wasLocked !== isLocked) fillBody(view, isLocked);
    fillFoot(view, card, locked);
    view.drawn = mode;
  }

  /**
   * Measure, then place: fill the card, lay it out unseen, ask its size, and
   * only then put it where `placeKeywordCard` says and let it be seen. Placing
   * before measuring would put each card where the last one wanted to be.
   */
  function place(view: CardView, card: KeywordCard<HTMLElement>): void {
    if (view.anchor.isConnected) {
      const now = boxOf(view.anchor);
      if (now.right > now.left || now.bottom > now.top) view.anchorBox = now;
    }
    const el = view.el;
    el.style.visibility = 'hidden';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.maxHeight = '';
    const size = el.getBoundingClientRect();
    const parent = card.parent === null ? undefined : views.get(card.parent);
    const spot = placeKeywordCard(
      view.anchorBox,
      { width: size.width, height: size.height },
      { width: window.innerWidth, height: window.innerHeight },
      GAP,
      parent === undefined ? null : boxOf(parent.el),
    );
    el.style.left = `${Math.round(spot.left)}px`;
    el.style.top = `${Math.round(spot.top)}px`;
    if (spot.maxHeight !== null) el.style.maxHeight = `${Math.floor(spot.maxHeight)}px`;
    el.dataset.side = spot.side;
    el.style.visibility = '';
  }

  /**
   * Tells a screen reader what the keyword's card is: the body describes a
   * keyword whose preview the keyboard opened, and a linked keyword whose card
   * is locked is marked expanded and pointed at the card.
   */
  function decorate(view: CardView): void {
    const anchor = view.anchor;
    const preview = state.preview;
    if (preview !== null && preview.id === view.id && preview.source === 'focus') {
      anchor.setAttribute('aria-describedby', view.body.id);
    } else if (anchor.getAttribute('aria-describedby') === view.body.id) {
      anchor.removeAttribute('aria-describedby');
    }
    const expanded = anchor.dataset.ref !== undefined && state.locked.some((card) => card.id === view.id);
    if (expanded) {
      anchor.setAttribute('aria-expanded', 'true');
      anchor.setAttribute('aria-controls', view.el.id);
    } else if (anchor.getAttribute('aria-controls') === view.el.id) {
      anchor.removeAttribute('aria-expanded');
      anchor.removeAttribute('aria-controls');
    }
  }

  function undecorate(view: CardView): void {
    const anchor = view.anchor;
    if (anchor.getAttribute('aria-describedby') === view.body.id) anchor.removeAttribute('aria-describedby');
    if (anchor.getAttribute('aria-controls') === view.el.id) {
      anchor.removeAttribute('aria-expanded');
      anchor.removeAttribute('aria-controls');
    }
  }

  /** The bar that fills while the pointer holds a preview, restarted with the timer. */
  function syncHoldBar(): void {
    const holding = holdTimerFor(state);
    for (const view of views.values()) {
      if (view.id === holding) {
        if (view.holdRun === holdRun && view.holdBar !== null) continue;
        view.holdBar?.remove();
        const bar = element('span', 'kwc-hold');
        bar.setAttribute('aria-hidden', 'true');
        bar.style.setProperty('--kwc-hold-ms', `${KEYWORD_HOLD_MS}ms`);
        view.el.append(bar);
        view.holdBar = bar;
        view.holdRun = holdRun;
      } else if (view.holdBar !== null) {
        view.holdBar.remove();
        view.holdBar = null;
        view.holdRun = 0;
      }
    }
  }

  /**
   * Hands focus back after the card holding it closed: to the keyword that
   * opened the lowest card that closed, or the control a keyword inside a
   * control sits in, or else the card under it.
   */
  function giveFocusBack(view: CardView): void {
    const anchor = view.anchor;
    let target: HTMLElement | null = null;
    if (anchor.isConnected) {
      target = anchor.tabIndex >= 0 ? anchor : anchor.closest<HTMLElement>(FOCUS_HOME);
    }
    if (target === null && view.parent !== null) target = views.get(view.parent)?.el ?? null;
    if (target === null) return;
    quietFocus = true;
    try {
      target.focus({ preventScroll: true });
    } finally {
      quietFocus = false;
    }
  }

  function takeDown(leaving: readonly CardView[], restoreFocus: boolean): void {
    const active = document.activeElement;
    const focusWasIn = active !== null && leaving.some((view) => view.el.contains(active));
    // The lowest card going is the one whose keyword is not on another card
    // that is going too. Its keyword is where focus goes back to.
    const lowest = leaving.find(
      (view) => !leaving.some((other) => other !== view && other.el.contains(view.anchor)),
    );
    for (const view of leaving) {
      undecorate(view);
      view.el.remove();
      views.delete(view.id);
    }
    if (restoreFocus && focusWasIn && lowest !== undefined) giveFocusBack(lowest);
  }

  function draw(restoreFocus: boolean): void {
    const shown = shownCards(state);
    const wanted = new Set(shown.map((card) => card.id));
    const leaving = [...views.values()].filter((view) => !wanted.has(view.id));
    if (leaving.length > 0) takeDown(leaving, restoreFocus);
    if (focusWanted !== null && !wanted.has(focusWanted)) focusWanted = null;
    if (reader === null) {
      // The first card waits for the definitions; `redraw` comes back here.
      if (shown.length > 0) ensureDefinitions();
      return;
    }
    const read = reader;
    const drops: number[] = [];
    shown.forEach((card, index) => {
      const locked = index < state.locked.length ? (card as LockedCard<HTMLElement>) : null;
      const mode = modeOf(card, locked);
      const known = views.get(card.id);
      if (known !== undefined) {
        if (known.drawn !== mode) {
          dress(known, card, locked, mode);
          place(known, card);
        }
        return;
      }
      const definition = read(card.ref);
      const anchorBox = anchorBoxOf(card.anchor);
      // A keyword gone from the page with nowhere known to put its card, or one
      // naming an entry the book does not have: there is nothing to show.
      if (definition === null || anchorBox === null) {
        drops.push(card.id);
        return;
      }
      const view = buildView(card, definition, anchorBox);
      views.set(card.id, view);
      root.append(view.el);
      dress(view, card, locked, mode);
      place(view, card);
    });
    for (const view of views.values()) decorate(view);
    syncHoldBar();
    if (focusWanted !== null) {
      const view = views.get(focusWanted);
      if (view !== undefined) {
        focusWanted = null;
        view.el.focus({ preventScroll: true });
      }
    }
    for (const id of drops) send({ type: 'drop', card: id });
  }

  /**
   * A scroll or a resize moved the keywords under the cards. Every card is
   * placed again against where its keyword is now, and a card whose keyword
   * has left the screen closes. Run once per frame however many scroll events
   * arrive in it.
   */
  function placeAll(): void {
    const drops: number[] = [];
    for (const card of shownCards(state)) {
      const view = views.get(card.id);
      if (view === undefined) continue;
      if (view.anchor.isConnected) {
        const box = boxOf(view.anchor);
        const seen =
          box.right > box.left || box.bottom > box.top
            ? box.bottom > 0 && box.right > 0 && box.top < window.innerHeight && box.left < window.innerWidth
            : false;
        if (!seen) {
          drops.push(card.id);
          continue;
        }
      }
      place(view, card);
    }
    for (const id of drops) send({ type: 'drop', card: id });
  }

  let frame: number | null = null;
  function placeSoon(): void {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      if (!disposed) placeAll();
    });
  }

  // --- reading the page -------------------------------------------------------

  /** The id of the card a node is on, locked or not, or null. */
  function cardIdOf(node: Element | null): number | null {
    const holder = node?.closest<HTMLElement>('.kwc') ?? null;
    if (holder === null) return null;
    const id = Number(holder.dataset.kwc);
    return Number.isFinite(id) ? id : null;
  }

  /** The id of the locked card a node is on, or null. */
  function lockedCardOf(node: Element | null): number | null {
    const id = cardIdOf(node);
    return id !== null && state.locked.some((card) => card.id === id) ? id : null;
  }

  /** The keyword a node is in, as the stack wants it, or null. */
  function keywordOf(node: Element | null, selector: string): KeywordAt<HTMLElement> | null {
    const word = node?.closest<HTMLElement>(selector) ?? null;
    if (word === null) return null;
    const ref = word.dataset.keyword;
    if (ref === undefined || ref === '') return null;
    return { anchor: word, ref, origin: cardIdOf(word), linked: word.dataset.ref !== undefined };
  }

  function pointerAt(node: Element | null): void {
    const keyword = keywordOf(node, '.kw[data-keyword]');
    const card = lockedCardOf(node);
    // `pointerover` fires at every element boundary; most of them change nothing.
    if (card === state.pointer.card && (keyword?.anchor ?? null) === state.pointer.anchor) return;
    if (keyword !== null) {
      ensureDefinitions();
      if (lastSeen?.node !== keyword.anchor) lastSeen = { node: keyword.anchor, box: boxOf(keyword.anchor) };
    }
    send({ type: 'pointer', card, keyword });
  }

  const onPointerOver = (event: PointerEvent): void => {
    // A tap has no hover before it; a tap on a linked keyword is a click, and
    // the click pins the card.
    if (event.pointerType === 'touch') return;
    pointerAt(elementOf(event.target));
  };

  const onPointerOut = (event: PointerEvent): void => {
    // Out of the window altogether: the pointer is on nothing here.
    if (event.relatedTarget === null) pointerAt(null);
  };

  const onFocusIn = (event: FocusEvent): void => {
    const node = elementOf(event.target);
    // Only a linked keyword takes focus, and only the keyboard's focus shows a
    // card: a click focuses the keyword too, and the click has its own answer.
    // While focus is being handed back to a keyword whose card just closed, it
    // is not treated as arriving either, or the card the player closed would
    // open again.
    const keyword = quietFocus || !keyboardFocus(node) ? null : keywordOf(node, '.kw[data-ref]');
    if (keyword !== null) ensureDefinitions();
    send({ type: 'focus', card: lockedCardOf(node), keyword });
  };

  const onFocusOut = (): void => {
    // The `focusin` that follows, if there is one, says where focus went.
    if (state.focus.card === null && state.focus.anchor === null) return;
    send({ type: 'focus', card: null, keyword: null });
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (!keywordCardsOpen(state)) return;
    const node = elementOf(event.target);
    // A press on a card is the card's own. A press on a linked keyword is about
    // to be a click, and the click decides: it pins that keyword's card, which
    // replaces the cards it displaces.
    if (node !== null && (node.closest('.kwc') !== null || node.closest('.kw[data-ref]') !== null)) return;
    send({ type: 'closeAll' });
  };

  /** Tab and Shift+Tab go round the top card rather than out of it. */
  function keepTabInCard(event: KeyboardEvent): void {
    const active = document.activeElement;
    const id = lockedCardOf(elementOf(active));
    if (id === null) return;
    const view = views.get(id);
    if (view === undefined) return;
    const items = Array.from(view.el.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const wrap = event.shiftKey ? active === first || active === view.el : active === last || active === view.el;
    if (!wrap) return;
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      // Claimed only while a card is up, so the next Escape reaches the sheet.
      if (!keywordCardsOpen(state)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      send({ type: 'escape' }, true);
      return;
    }
    if (event.key === 'Tab') keepTabInCard(event);
  };

  const onMoved = (event: Event): void => {
    if (!keywordCardsOpen(state)) return;
    // A scroll inside a card's own body moves nothing else.
    const node = elementOf(event.target);
    if (node !== null && node.closest('.kwc') !== null) return;
    placeSoon();
  };

  // --- the link to the renderer -----------------------------------------------

  /**
   * A click or Enter on a linked keyword (`keywords.ts`). Pins its card and,
   * from the keyboard, moves focus into it.
   */
  function activate(node: HTMLElement, entryId: string, how: KeywordActivation): boolean {
    if (disposed) return false;
    // The last load failed: no card can be drawn, so the book opens instead.
    if (reader === null && loadFailed) return false;
    const showing = state.preview?.anchor === node || state.locked.some((card) => card.anchor === node);
    // The click took the keyword off the page before reaching it: the star
    // chart's card closes on a keyword click in the capture phase, ahead of the
    // keyword's own handler. A card already showing for it locks where it is,
    // and one the pointer had reached goes where the pointer found it. With
    // neither there is nowhere to put a card, so the book opens as before.
    if (!node.isConnected && !showing && lastSeen?.node !== node) return false;
    ensureDefinitions();
    send({
      type: 'activate',
      keyword: { anchor: node, ref: entryId, origin: cardIdOf(node), linked: node.dataset.ref !== undefined },
    });
    if (how === 'keyboard') {
      const card = state.locked.find((one) => one.anchor === node);
      if (card !== undefined) {
        const view = views.get(card.id);
        if (view !== undefined) view.el.focus({ preventScroll: true });
        else focusWanted = card.id;
      }
    }
    return true;
  }

  const layer: KeywordCardLayer = { activate };

  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('scroll', onMoved, true);
  window.addEventListener('resize', onMoved);
  setKeywordCardLayer(layer);

  const handle: KeywordCards = {
    get isOpen(): boolean {
      return keywordCardsOpen(state);
    },
    close(): void {
      send({ type: 'closeAll' });
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onMoved, true);
      window.removeEventListener('resize', onMoved);
      stopTimers();
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      for (const view of views.values()) {
        undecorate(view);
        view.el.remove();
      }
      views.clear();
      queue.length = 0;
      lastSeen = null;
      state = closedKeywordCards();
      if (keywordCardLayer() === layer) setKeywordCardLayer(null);
      if (mounted === handle) mounted = null;
    },
  };
  mounted = handle;
  return handle;
}
