/**
 * The hover cards on keyword links: which cards are open, and the rules for
 * when a card shows, locks and closes (batch T2, `docs/plans/tutorial.md`
 * section 5.6; the research behind it is item 6 of section 3).
 *
 * This module is pure: no DOM, no clock. A keyword is whatever token the
 * caller uses for one (the DOM half passes the element, the suite passes a
 * string), and time arrives as three events (`showDue`, `holdDue`,
 * `graceDue`) that the caller sends when the timers this module asks for run
 * out. `keywordCards.ts` is the DOM half: it turns pointer, focus and key
 * events into the events below, runs the timers, and draws whatever the state
 * says is open.
 *
 * The two kinds of card
 * ---------------------
 * - A **preview** shows while the pointer rests on a keyword, or while
 *   keyboard focus is on one. The pointer passes straight through it, so it
 *   can never take a click meant for whatever is under it, and it goes when
 *   the pointer or focus leaves its keyword. There is at most one.
 * - A **locked** card can be entered, and the keywords on it open child cards.
 *   There are two ways to lock one, and they keep the card for different
 *   lengths of time:
 *   - **Held:** the pointer stayed on the keyword for `KEYWORD_HOLD_MS` after
 *     the preview showed. A held card stays while the pointer is on it, on a
 *     card opened from it, or on the keyword that opened it, and goes a moment
 *     after the pointer has left all of them. This is the Crusader Kings III
 *     lock: it lets the pointer travel into the card, and it leaves nothing
 *     behind once the player moves on.
 *   - **Pinned:** the player clicked the keyword or pressed Enter on it. A
 *     pinned card stays until the player closes it. This is the Old World
 *     freeze, with the way back one level that Old World's players asked for.
 *
 * The locked cards form one chain: each was opened from a keyword on the card
 * before it, and the first from a keyword on the page. The preview is drawn on
 * top of the chain, and its `parent` says which locked card it came from.
 *
 * What closes what
 * ----------------
 * - A preview never closes anything. Locking a card does: the new card takes
 *   the place of every card above the one its keyword sits on, so locking a
 *   keyword on the page replaces the whole chain.
 * - A hold never locks a card when that would close a pinned card. The pinned
 *   card stays, and the preview stays a preview unless it is clicked.
 * - Escape closes the top card (the preview first). `back` closes one card and
 *   every card above it. `closeAll` is a click outside every card, the close
 *   button, the "Full entry" button, and the screen registry closing the cards
 *   because another card or screen opened.
 * - A keyword inside a control (a `<button>`, where a click picks the card it
 *   is on) is never activated: `activate` refuses a keyword that is not a link.
 *   It can still show a preview and be held, as the ruling on keyword links
 *   allows (`keywords.ts`).
 * - A keyword on a preview does nothing, since a preview cannot be entered,
 *   and a keyword that names the card it sits on does nothing either.
 *
 * Every arm of `keywordCardStep` returns the state it was given when nothing
 * changed, so the DOM half can skip drawing by comparing the two.
 */

import type { AnchorBox, CardBox } from './infoCard';

// --- timing -----------------------------------------------------------------

/**
 * How long the pointer rests on a keyword before its card shows. Moving across
 * a paragraph full of keywords should not flash a card for every one of them.
 * Once a preview is showing, the next keyword's card replaces it at once.
 */
export const KEYWORD_SHOW_MS = 200;

/**
 * How long the pointer stays on a keyword after its card shows before the card
 * locks. Long enough that reading past a keyword locks nothing; short enough
 * that a player who has started to read the card finds it locked when they
 * reach for it.
 */
export const KEYWORD_HOLD_MS = 900;

/**
 * How long a card waits, once nothing holds it, before it goes. This is the
 * time the pointer has to cross the gap between a keyword and its card, and it
 * covers the jitter of a pointer resting on the edge of a word.
 */
export const KEYWORD_GRACE_MS = 200;

// --- the state ----------------------------------------------------------------

/** Where a preview came from. Only a pointer can hold a card locked. */
export type PreviewSource = 'pointer' | 'focus';

/** A keyword the pointer or focus is on, as the DOM half reports it. */
export interface KeywordAt<A> {
  /** The keyword's element, or any token that identifies one keyword. */
  readonly anchor: A;
  /** The Compendium entry it names: `building:granary`. */
  readonly ref: string;
  /** The id of the card the keyword sits on, or null when it is on the page. */
  readonly origin: number | null;
  /** False inside a control: it shows and holds a card, and is never clicked. */
  readonly linked: boolean;
}

/** One card, open or about to open. */
export interface KeywordCard<A> {
  /** Unique for the life of the state. The DOM half keys its elements on it. */
  readonly id: number;
  readonly ref: string;
  readonly anchor: A;
  /** The locked card whose keyword opened this one, or null for the page. */
  readonly parent: number | null;
  readonly linked: boolean;
}

export interface LockedCard<A> extends KeywordCard<A> {
  /** Pinned by a click or Enter. False for a card locked by holding. */
  readonly pinned: boolean;
}

export interface PreviewCard<A> extends KeywordCard<A> {
  readonly source: PreviewSource;
}

/** Where the pointer or focus is: on which locked card, and on which keyword. */
export interface Spot<A> {
  /** The id of the locked card it is on, or null. */
  readonly card: number | null;
  /** The keyword it is on, or null. */
  readonly anchor: A | null;
}

export interface KeywordCardState<A> {
  /** The chain, from the card opened from the page to the top one. */
  readonly locked: readonly LockedCard<A>[];
  readonly preview: PreviewCard<A> | null;
  /** A preview waiting for `KEYWORD_SHOW_MS`. Always from the pointer. */
  readonly pending: PreviewCard<A> | null;
  readonly pointer: Spot<A>;
  readonly focus: Spot<A>;
  readonly nextId: number;
}

export type KeywordCardEvent<A> =
  /** The pointer moved onto something: a locked card, a keyword, both or neither. */
  | { readonly type: 'pointer'; readonly card: number | null; readonly keyword: KeywordAt<A> | null }
  /** Focus moved. Both null when it left for somewhere this module does not track. */
  | { readonly type: 'focus'; readonly card: number | null; readonly keyword: KeywordAt<A> | null }
  /** `KEYWORD_SHOW_MS` ran out for the pending preview. */
  | { readonly type: 'showDue' }
  /** `KEYWORD_HOLD_MS` ran out for the preview under the pointer. */
  | { readonly type: 'holdDue' }
  /** `KEYWORD_GRACE_MS` ran out for whatever nothing holds any more. */
  | { readonly type: 'graceDue' }
  /** A click or Enter on a linked keyword: pin its card. */
  | { readonly type: 'activate'; readonly keyword: KeywordAt<A> }
  /** The back control on one card: close it and every card above it. */
  | { readonly type: 'back'; readonly card: number }
  /** Escape: close the top card. */
  | { readonly type: 'escape' }
  /** The DOM half cannot draw this card (its keyword is gone, or it has no entry). */
  | { readonly type: 'drop'; readonly card: number }
  | { readonly type: 'closeAll' };

const NOWHERE: Spot<never> = { card: null, anchor: null };

/** Nothing open and nothing tracked. */
export function closedKeywordCards<A>(): KeywordCardState<A> {
  return { locked: [], preview: null, pending: null, pointer: NOWHERE, focus: NOWHERE, nextId: 1 };
}

// --- readings -------------------------------------------------------------------

/** Is any card on screen? What the screen registry and Escape ask. */
export function keywordCardsOpen<A>(state: KeywordCardState<A>): boolean {
  return state.locked.length > 0 || state.preview !== null;
}

/** Every card on screen, bottom to top: the chain, then the preview. */
export function shownCards<A>(state: KeywordCardState<A>): readonly (LockedCard<A> | PreviewCard<A>)[] {
  return state.preview === null ? state.locked : [...state.locked, state.preview];
}

/** The position of a locked card in the chain, or -1. */
function chainIndex<A>(state: KeywordCardState<A>, id: number | null): number {
  if (id === null) return -1;
  return state.locked.findIndex((card) => card.id === id);
}

/** The position of the locked card a keyword opened, or -1. */
function chainIndexOfAnchor<A>(state: KeywordCardState<A>, anchor: A | null): number {
  if (anchor === null) return -1;
  return state.locked.findIndex((card) => card.anchor === anchor);
}

/** Is the pointer or focus on the preview's own keyword? */
export function previewHeld<A>(state: KeywordCardState<A>): boolean {
  const preview = state.preview;
  if (preview === null) return false;
  return state.pointer.anchor === preview.anchor || state.focus.anchor === preview.anchor;
}

/**
 * How far up the chain something is holding the cards: the position of the
 * highest locked card that may stay, or -1 for none.
 *
 * The pointer or focus on a card holds that card and every card under it. On a
 * keyword that opened a card, it holds that card too. A pinned card holds
 * itself and everything under it, since a card cannot outlive the card its
 * keyword sits on.
 */
export function heldUpTo<A>(state: KeywordCardState<A>): number {
  let level = -1;
  for (const spot of [state.pointer, state.focus]) {
    level = Math.max(level, chainIndex(state, spot.card), chainIndexOfAnchor(state, spot.anchor));
  }
  state.locked.forEach((card, index) => {
    if (card.pinned) level = Math.max(level, index);
  });
  return level;
}

/**
 * Locking the preview would close a pinned card. The preview replaces every
 * card above its parent, so this asks whether one of those is pinned.
 */
function lockWouldClosePinned<A>(state: KeywordCardState<A>, card: KeywordCard<A>): boolean {
  const parentAt = chainIndex(state, card.parent);
  return state.locked.some((one, index) => one.pinned && index > parentAt);
}

/** Whether a hold may lock this preview, ignoring where the pointer is. */
export function previewHoldable<A>(state: KeywordCardState<A>): boolean {
  return state.preview !== null && !lockWouldClosePinned(state, state.preview);
}

/** The pending preview the show timer is for, or null when it should not run. */
export function showTimerFor<A>(state: KeywordCardState<A>): number | null {
  return state.pending?.id ?? null;
}

/**
 * The preview the hold timer is for, or null when it should not run: the
 * pointer (not focus) is on the preview's keyword, and locking it would not
 * close a pinned card.
 */
export function holdTimerFor<A>(state: KeywordCardState<A>): number | null {
  const preview = state.preview;
  if (preview === null || state.pointer.anchor !== preview.anchor) return null;
  return lockWouldClosePinned(state, preview) ? null : preview.id;
}

/**
 * What the grace timer is waiting to close, as a key that changes whenever
 * that set changes, or null when nothing is waiting. A key rather than a flag,
 * so a card that starts to fade later than another gets a full grace of its
 * own: the DOM half restarts the timer whenever the key changes.
 */
export function graceTimerFor<A>(state: KeywordCardState<A>): string | null {
  const fading: string[] = [];
  if (state.preview !== null && !previewHeld(state)) fading.push(`p${state.preview.id}`);
  const level = heldUpTo(state);
  for (const card of state.locked.slice(level + 1)) fading.push(`h${card.id}`);
  return fading.length === 0 ? null : fading.join(',');
}

// --- the rules ----------------------------------------------------------------------

/**
 * Can this keyword open a card? Not when it sits on a preview (which cannot be
 * entered) or on a card that has closed, and not when it names the card it
 * sits on.
 */
function usable<A>(state: KeywordCardState<A>, keyword: KeywordAt<A>): boolean {
  if (keyword.origin === null) return true;
  const at = chainIndex(state, keyword.origin);
  return at >= 0 && state.locked[at]!.ref !== keyword.ref;
}

/** Drops a preview or a pending preview whose parent card has closed. */
function withoutOrphans<A>(state: KeywordCardState<A>): KeywordCardState<A> {
  const alive = (parent: number | null): boolean => parent === null || chainIndex(state, parent) >= 0;
  const preview = state.preview !== null && !alive(state.preview.parent) ? null : state.preview;
  const pending = state.pending !== null && !alive(state.pending.parent) ? null : state.pending;
  return preview === state.preview && pending === state.pending ? state : { ...state, preview, pending };
}

/** The chain cut to its first `length` cards, with whatever hung off the rest. */
function cutTo<A>(state: KeywordCardState<A>, length: number): KeywordCardState<A> {
  if (length >= state.locked.length) return state;
  return withoutOrphans({ ...state, locked: state.locked.slice(0, Math.max(0, length)) });
}

/**
 * Locks a card: it goes on top of the card its keyword sits on, and every card
 * that was above that one closes. The preview and anything pending go too,
 * since the player's attention is now on the locked card.
 */
function lock<A>(state: KeywordCardState<A>, card: KeywordCard<A>, pinned: boolean): KeywordCardState<A> {
  const parentAt = chainIndex(state, card.parent);
  if (card.parent !== null && parentAt < 0) return state;
  const locked: LockedCard<A> = {
    id: card.id,
    ref: card.ref,
    anchor: card.anchor,
    parent: card.parent,
    linked: card.linked,
    pinned,
  };
  return { ...state, locked: [...state.locked.slice(0, parentAt + 1), locked], preview: null, pending: null };
}

/** A new card for a keyword, and the state with its id spent. */
function newCard<A>(
  state: KeywordCardState<A>,
  keyword: KeywordAt<A>,
  source: PreviewSource,
): [PreviewCard<A>, KeywordCardState<A>] {
  const card: PreviewCard<A> = {
    id: state.nextId,
    ref: keyword.ref,
    anchor: keyword.anchor,
    parent: keyword.origin,
    linked: keyword.linked,
    source,
  };
  return [card, { ...state, nextId: state.nextId + 1 }];
}

/**
 * The pointer or focus arrived on a keyword, or on nothing. What it means for
 * the preview: start the show timer, show at once, or forget a keyword the
 * pointer has left before its card showed.
 */
function arrive<A>(
  state: KeywordCardState<A>,
  keyword: KeywordAt<A> | null,
  source: PreviewSource,
): KeywordCardState<A> {
  // Only a pointer waits, so only a pointer can leave a pending preview behind.
  const dropPending = (from: KeywordCardState<A>): KeywordCardState<A> =>
    source === 'pointer' && from.pending !== null ? { ...from, pending: null } : from;

  if (keyword === null || !usable(state, keyword)) return dropPending(state);
  // Its card is already locked: nothing to open.
  if (chainIndexOfAnchor(state, keyword.anchor) >= 0) return dropPending(state);

  const preview = state.preview;
  if (preview !== null && preview.anchor === keyword.anchor) {
    // Already showing. A pointer arriving on a keyword the keyboard opened
    // takes it over, so that holding it can lock it.
    const taken = source === 'pointer' && preview.source === 'focus' ? { ...preview, source } : preview;
    const next = taken === preview ? state : { ...state, preview: taken };
    return dropPending(next);
  }

  const pending = state.pending;
  if (pending !== null && pending.anchor === keyword.anchor) {
    // Focus does not wait: the keyboard arriving on the keyword the pointer is
    // waiting on shows the card now.
    if (source === 'focus') return { ...state, preview: { ...pending, source }, pending: null };
    return state;
  }

  const [card, next] = newCard(state, keyword, source);
  // Focus shows at once (a keyboard does not sweep across words), and so does
  // a pointer while another preview is up: the player is already reading
  // cards, and a gap between two of them would only flicker.
  if (source === 'focus' || preview !== null) return { ...next, preview: card, pending: null };
  return { ...next, pending: card };
}

function sameSpot<A>(a: Spot<A>, b: Spot<A>): boolean {
  return a.card === b.card && a.anchor === b.anchor;
}

/** One event. Total, and every arm is one of the rules in the module docblock. */
export function keywordCardStep<A>(
  state: KeywordCardState<A>,
  event: KeywordCardEvent<A>,
): KeywordCardState<A> {
  switch (event.type) {
    case 'pointer':
    case 'focus': {
      const spot: Spot<A> = { card: event.card, anchor: event.keyword?.anchor ?? null };
      const current = event.type === 'pointer' ? state.pointer : state.focus;
      const moved = sameSpot(current, spot)
        ? state
        : event.type === 'pointer'
          ? { ...state, pointer: spot }
          : { ...state, focus: spot };
      return arrive(moved, event.keyword, event.type);
    }
    case 'showDue':
      if (state.pending === null) return state;
      return { ...state, preview: state.pending, pending: null };
    case 'holdDue': {
      const preview = state.preview;
      if (preview === null || holdTimerFor(state) !== preview.id) return state;
      return lock(state, preview, false);
    }
    case 'graceDue': {
      // Whatever nothing holds goes: held cards above the highest one something
      // is on, and a preview whose keyword the pointer and focus have both left.
      let next = cutTo(state, heldUpTo(state) + 1);
      if (next.preview !== null && !previewHeld(next)) next = { ...next, preview: null };
      return next;
    }
    case 'activate': {
      const keyword = event.keyword;
      // The safety rule: a keyword inside a control is never a link, so a click
      // there is the control's and never reaches a card.
      if (!keyword.linked || !usable(state, keyword)) return state;
      const at = chainIndexOfAnchor(state, keyword.anchor);
      if (at >= 0) {
        // Its card is already locked. A click pins it if it was only held, and
        // leaves everything above it alone; a second click is not a toggle,
        // since a player who held and then clicked meant "keep it".
        const card = state.locked[at]!;
        if (card.pinned) return state;
        const locked = state.locked.map((one, index) => (index === at ? { ...one, pinned: true } : one));
        return { ...state, locked };
      }
      if (state.preview !== null && state.preview.anchor === keyword.anchor) {
        return lock(state, state.preview, true);
      }
      const [card, next] = newCard(state, keyword, 'pointer');
      return lock(next, card, true);
    }
    case 'back': {
      const at = chainIndex(state, event.card);
      return at < 0 ? state : cutTo(state, at);
    }
    case 'escape':
      if (state.preview !== null) return { ...state, preview: null, pending: null };
      if (state.locked.length === 0) return state.pending === null ? state : { ...state, pending: null };
      return cutTo({ ...state, pending: null }, state.locked.length - 1);
    case 'drop': {
      if (state.preview?.id === event.card) return { ...state, preview: null };
      if (state.pending?.id === event.card) return { ...state, pending: null };
      const at = chainIndex(state, event.card);
      return at < 0 ? state : cutTo(state, at);
    }
    case 'closeAll':
      if (!keywordCardsOpen(state) && state.pending === null) return state;
      return { ...state, locked: [], preview: null, pending: null };
    default: {
      const unhandled: never = event;
      void unhandled;
      return state;
    }
  }
}

// --- placement ------------------------------------------------------------------

/** Which side of its keyword a card sits on. */
export type KeywordCardSide = 'below' | 'above' | 'right' | 'left';

export interface KeywordCardSpot {
  left: number;
  top: number;
  side: KeywordCardSide;
  /**
   * The height the card must be cut to, or null when it fits whole. A card cut
   * short scrolls its body; the stylesheet keeps the head and the footer.
   */
  maxHeight: number | null;
}

/**
 * Where to put a card of `card` size for a keyword at `anchor`, inside `view`.
 *
 * Two rules, and both are about the keyword. The card never covers it, because
 * the keyword is what the player asked about. And the card stays on screen,
 * because a card off the edge of the window is one nobody can read.
 *
 * A keyword on the page gets its card below it, or above it when there is no
 * room below, the way a tooltip sits; then to its right, then to its left. A
 * keyword on a card (`beside` is that card's box) gets its child beside the
 * card instead, right then left, so the parent stays readable and the chain
 * reads across the screen; then below or above the keyword.
 *
 * When no side fits the card whole, it goes into the taller of the two bands
 * above and below the keyword and is cut to that band's height. That still
 * never covers the keyword, which a clamp to the window's edge could.
 *
 * Pure, and exported for the reason `placeCard` in `infoCard.ts` is: this is
 * the part of a hover card that can be wrong in a way nobody sees until a small
 * window turns up, and the suite has no DOM to see it with.
 */
export function placeKeywordCard(
  anchor: AnchorBox,
  card: CardBox,
  view: CardBox,
  gap: number,
  beside: AnchorBox | null = null,
): KeywordCardSpot {
  const clampLeft = (left: number): number => Math.max(gap, Math.min(left, view.width - card.width - gap));
  const clampTop = (top: number): number => Math.max(gap, Math.min(top, view.height - card.height - gap));
  const wall = beside ?? anchor;

  const below = { side: 'below' as const, left: clampLeft(anchor.left), top: anchor.bottom + gap };
  const above = { side: 'above' as const, left: clampLeft(anchor.left), top: anchor.top - gap - card.height };
  const right = {
    side: 'right' as const,
    left: Math.max(anchor.right, wall.right) + gap,
    top: clampTop(anchor.top),
  };
  const left = {
    side: 'left' as const,
    left: Math.min(anchor.left, wall.left) - gap - card.width,
    top: clampTop(anchor.top),
  };

  const fits = (spot: { left: number; top: number }): boolean =>
    spot.left >= gap &&
    spot.left + card.width <= view.width - gap &&
    spot.top >= gap &&
    spot.top + card.height <= view.height - gap;

  const order = beside === null ? [below, above, right, left] : [right, left, below, above];
  for (const spot of order) {
    if (fits(spot)) return { ...spot, maxHeight: null };
  }

  const roomBelow = Math.max(0, view.height - anchor.bottom - 2 * gap);
  const roomAbove = Math.max(0, anchor.top - 2 * gap);
  if (roomBelow >= roomAbove) {
    return { side: 'below', left: clampLeft(anchor.left), top: anchor.bottom + gap, maxHeight: roomBelow };
  }
  const height = Math.min(card.height, roomAbove);
  return { side: 'above', left: clampLeft(anchor.left), top: anchor.top - gap - height, maxHeight: roomAbove };
}
