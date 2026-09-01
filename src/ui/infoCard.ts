/**
 * The hover card: a note laid beside whatever the pointer is resting on.
 *
 * One shape, four surfaces. The city screen's build list uses it to say what a
 * unit *is* before you spend forty hammers finding out; the star chart uses it
 * to say what a technology actually hands over, which is more than the four
 * lines a node card has room for; the top bar uses it to break a total into
 * the lines it is the fold of — which yields came from which city, what the two
 * empire meters are currently doing to the economy; and the **board** uses it
 * under the faith lens to lay a town's pressure ledger beside the hex
 * (`faithHover.ts`). All four wanted the same object, so it is written once here
 * and dressed by a class name.
 *
 * The fourth arrived with the only structural difference since `placement`: it
 * has no DOM anchor to hover, because a hex is picked out of a WebGL scene. See
 * `showAt`, which is the same measure-then-place against a bare rectangle.
 *
 * The third one arrived with one difference and it is the only reason
 * `placement` exists: a card *beside* a chip in a horizontal strip covers the
 * chips it is being compared against, so the bar's cards fall underneath their
 * anchor instead. See `placeCardBelow`.
 *
 * It is a note and not a control — with one opted-in exception
 * ------------------------------------------------------------
 * Everything in this paragraph is true of every card but the star chart's, which
 * asks for `sticky` and is therefore the one card a pointer can enter. See
 * `StickyState` for what that buys, what it costs, and why exactly one surface
 * has earned it.
 *
 * The card never takes the pointer (`pointer-events: none` in the stylesheet),
 * never takes focus, and has nothing in it to click. That is what lets it be a
 * pure hover: there is no "move the mouse onto the card" gesture to support, no
 * dismissal to arrange, and no way for it to swallow the click that was headed
 * for the button underneath it. It shows on `pointerenter` and on `focus`, and
 * it is gone on `pointerleave`, on `blur`, and on any scroll — because a card
 * positioned against an anchor that has since slid up the panel is a card
 * pointing at the wrong thing.
 *
 * Touch is left alone. A tap has no hover to precede it, so a card that appeared
 * on `pointerdown` would be a card that appeared *after* the button had already
 * been pressed; `pointerType === 'touch'` is filtered out and the panels stay
 * exactly as usable as they were.
 *
 * Rebuilt panels
 * --------------
 * The city panel tears its DOM down and rebuilds it on every render, which takes
 * the anchor out from under an open card with no `pointerleave` to follow. So
 * `hide()` is public and the panels call it as they rebuild — the alternative is
 * a MutationObserver watching a panel that already knows perfectly well when it
 * has changed.
 *
 * Measurement, then placement
 * ---------------------------
 * The card is sized by its content and the content is not known until it is in
 * the document, so showing is three steps: fill it, reveal it *invisibly* to let
 * the browser lay it out, then place it and let it be seen. Placing before
 * measuring would put every card at the position the last one wanted, which
 * reads as a card that jumps.
 */

/** A rectangle in viewport coordinates — a `DOMRect`, minus what is unused. */
export interface AnchorBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CardBox {
  width: number;
  height: number;
}

/**
 * Where to put a card of `card` size beside an anchor, inside a `view`.
 *
 * Beside, never over: the anchor is the thing being asked about and a card that
 * covered it would answer a question the player could no longer see. It goes to
 * the anchor's right when there is room, to its left when there is not, and its
 * top lines up with the anchor's so the eye travels straight across.
 *
 * Everything is then clamped into the viewport, and the clamp is the reason this
 * is arithmetic rather than CSS: `position: fixed` will happily place a card
 * three hundred pixels below the fold, where the one thing a hover card must
 * never be is off screen. Both clamps floor at `gap` rather than at the far
 * edge, so a card *larger* than the window is pinned to the top-left and spills
 * off the bottom — the readable failure, since a card is read downwards.
 *
 * Pure, and separated from the DOM for exactly that reason: this is the part of
 * a hover card that can be wrong in a way no one notices until a small window
 * turns up, and it is the part a test can reach (this suite has no jsdom).
 */
export function placeCard(
  anchor: AnchorBox,
  card: CardBox,
  view: CardBox,
  gap: number,
): { left: number; top: number } {
  const toRight = anchor.right + gap;
  const toLeft = anchor.left - gap - card.width;
  // The right is tried first and taken whenever it fits *with its own margin*,
  // so a card's side stays stable as the pointer walks down a column of buttons
  // and only flips when the anchor is genuinely too near the right edge. Asking
  // for the margin here is what keeps the clamp below from second-guessing a
  // side this line has already chosen.
  const wanted = toRight + card.width + gap <= view.width ? toRight : toLeft;
  const rightmost = Math.max(gap, view.width - card.width - gap);
  const lowest = Math.max(gap, view.height - card.height - gap);
  return {
    left: Math.max(gap, Math.min(wanted, rightmost)),
    top: Math.max(gap, Math.min(anchor.top, lowest)),
  };
}

/**
 * Where to put a card *under* an anchor rather than beside it.
 *
 * The top bar's readouts need this and the panels do not, and the difference is
 * the shape of the thing being hovered: a build row is one line in a tall
 * column, so a card beside it covers nothing, while a chip in a horizontal strip
 * has its own neighbours to its left and right — a card laid beside a yield
 * total would cover the four totals it is being compared against.
 *
 * Left edges line up, so the card reads as belonging to the chip it dropped out
 * of, and both axes are clamped exactly as `placeCard` clamps them: floor at
 * `gap`, so a card too large for the window spills off the bottom rather than
 * off the top.
 */
export function placeCardBelow(
  anchor: AnchorBox,
  card: CardBox,
  view: CardBox,
  gap: number,
): { left: number; top: number } {
  const rightmost = Math.max(gap, view.width - card.width - gap);
  const lowest = Math.max(gap, view.height - card.height - gap);
  return {
    left: Math.max(gap, Math.min(anchor.left, rightmost)),
    top: Math.max(gap, Math.min(anchor.bottom + gap, lowest)),
  };
}

/** Which side of its anchor a card falls on. See the two `place*` functions. */
export type CardPlacement = 'beside' | 'below';

// --- the sticky card --------------------------------------------------------

/**
 * The **sticky** card is the one exception to "it is a note and not a control",
 * and it is opt-in for exactly one surface (user ruling, 2026-08-28): *"the
 * hover modal persists only while the mouse is over the tech OR the modal; once
 * a keyword link is clicked or the mouse leaves both, it disappears."*
 *
 * The star chart's card lists what a technology hands over, and those names are
 * keywords (`keywords.ts`) — so it is the one card a player has a reason to
 * reach into. Everything else in this interface stays pointer-transparent, which
 * is why `sticky` defaults off and is a *card* option rather than a mode: a card
 * that can be reached into is a card that can swallow a click meant for the
 * button underneath it, and only one surface has earned that.
 *
 * Which state it is in
 * --------------------
 * Two booleans and a flag, and they are separate because the pointer is
 * genuinely in one of four places. The card stays up while either boolean is
 * set; when both go false it does **not** close at once — the pointer crossing
 * the gap between the node and the card leaves both for a frame or two, and a
 * card that closed in that gap could never be entered. That wait is
 * `STICKY_GRACE_MS`, and the `grace` event is the timer arriving: it closes the
 * card *only if* the pointer has not landed on either in the meantime, which is
 * what makes the timer safe to fire late, twice, or after the card has already
 * gone.
 *
 * The three sudden closes take no grace at all. A keyword click raises the
 * Compendium over the chart, so leaving a card behind it would be leaving a
 * ghost; Escape and a click elsewhere are the player saying so outright.
 *
 * Pure, and exported, for the reason `placeCard` is: this suite has no DOM, and
 * *when a hover card is allowed to still be there* is precisely the kind of rule
 * that is wrong in one direction for weeks (a card that will not go away) or in
 * the other for ever (a card nobody can reach).
 */
export interface StickyState {
  overAnchor: boolean;
  overCard: boolean;
  open: boolean;
}

export type StickyEvent =
  /** The pointer (or focus) arrived on the anchor. */
  | 'enterAnchor'
  /** It left the anchor — for the card, or for the page. */
  | 'leaveAnchor'
  /** It arrived on the card itself. */
  | 'enterCard'
  | 'leaveCard'
  /** The grace period elapsed. Closes iff the pointer is still on neither. */
  | 'grace'
  /** A keyword inside the card was clicked: the book opens over it. */
  | 'keyword'
  | 'escape'
  /** A click that landed on neither the anchor nor the card. */
  | 'elsewhere';

/** Nothing hovered, nothing shown. */
export const STICKY_CLOSED: StickyState = { overAnchor: false, overCard: false, open: false };

/** How long the pointer may be on neither before the card goes. */
export const STICKY_GRACE_MS = 150;

/** One event. Total, and every arm is one of the rules in the docblock above. */
export function stickyStep(state: StickyState, event: StickyEvent): StickyState {
  switch (event) {
    case 'enterAnchor':
      return { ...state, overAnchor: true, open: true };
    case 'enterCard':
      // Only meaningful while the card is up — you cannot enter what is not
      // drawn — and saying so keeps a stray event from opening a card nobody
      // asked for.
      return state.open ? { ...state, overCard: true } : state;
    case 'leaveAnchor':
      return { ...state, overAnchor: false };
    case 'leaveCard':
      return { ...state, overCard: false };
    case 'grace':
      return state.open && !state.overAnchor && !state.overCard ? STICKY_CLOSED : state;
    case 'keyword':
    case 'escape':
    case 'elsewhere':
      return STICKY_CLOSED;
    default: {
      const unhandled: never = event;
      void unhandled;
      return state;
    }
  }
}

/**
 * Is this a state the grace timer should be running in? Open, and the pointer
 * on neither. The one derived reading, so the timer and the machine cannot
 * disagree about when the card is on its way out.
 */
export function stickyClosing(state: StickyState): boolean {
  return state.open && !state.overAnchor && !state.overCard;
}

export interface InfoCard {
  /**
   * Wires an anchor to the card it should raise. `build` is called on each
   * hover rather than once, so a card always quotes the state as it is now —
   * a cost that has climbed, a rate that has fallen — without the panel having
   * to remember which cards it handed out.
   */
  bind(anchor: HTMLElement, build: () => Node): void;

  /**
   * Raises the card against a bare rectangle instead of an element.
   *
   * The board is the one surface with a hover and no DOM to hover: a hex is
   * picked out of a WebGL scene and its position comes back from
   * `projectCell`, so there is nothing for `bind` to listen on and nothing for
   * `getBoundingClientRect` to be asked of. The caller therefore owns both
   * halves of the gesture — it already knows when the pointer moved and what it
   * moved onto — and this is only the placement.
   *
   * Deliberately *not* a second mode: everything past the anchor is the same
   * card, measured and placed by the same two functions, and `hide()` closes one
   * of these exactly as it closes one raised by `bind`. Never sticky — the
   * machine below is driven by pointer events on an anchor there is none of.
   */
  showAt(anchor: AnchorBox, build: () => Node): void;

  /** Puts the card away. Called by a panel that is about to rebuild. */
  hide(): void;
}

export interface InfoCardOptions {
  /**
   * The class the card wears. `info-card` is the ground; a caller adds its own
   * modifier (`is-night` over the star chart) so the two surfaces can differ in
   * palette without differing in construction.
   */
  className: string;
  /** How far the card sits from its anchor, and from the viewport's edges. */
  gap?: number;
  /** Beside the anchor (the default) or under it. See `placeCardBelow`. */
  placement?: CardPlacement;
  /**
   * Whether the card may be *entered*. Off for every surface but the star
   * chart — see `StickyState`'s docblock for what it costs and why one surface
   * has earned it.
   */
  sticky?: boolean;
}

const DEFAULT_GAP = 10;

export function createInfoCard(options: InfoCardOptions): InfoCard {
  const { className, gap = DEFAULT_GAP, placement = 'beside', sticky = false } = options;

  const card = document.createElement('div');
  card.className = sticky ? `${className} is-sticky` : className;
  card.hidden = true;
  // Announced to nobody: the card repeats what its anchor's own `title` and
  // label already say, and a live region that fired on every pointer move
  // would be a screen reader narrating the mouse.
  //
  // A **sticky** card is the exception, and it has to be: it holds keywords
  // that are themselves tab stops, and a focusable element inside an
  // `aria-hidden` subtree is a thing a screen reader is told to ignore and a
  // keyboard can still reach.
  if (!sticky) card.setAttribute('aria-hidden', 'true');
  document.body.append(card);

  /** What the card is currently open against, so a stale leave is ignored. */
  let anchoredTo: HTMLElement | null = null;
  /**
   * True while the card stands against a bare rectangle (`showAt`). A second
   * flag rather than a fake element, because `anchoredTo` answers "which anchor
   * asked for this" and a board hex is not one — every `pointerleave` guard
   * below compares against it and would match `null` by accident.
   */
  let boxAnchored = false;

  function hide(): void {
    if (anchoredTo === null && !boxAnchored) return;
    anchoredTo = null;
    boxAnchored = false;
    card.hidden = true;
    card.replaceChildren();
  }

  /**
   * The public `hide` — a panel about to rebuild, or a scroll. It puts the
   * machine back to closed as well, because a sticky card whose DOM was taken
   * away while the machine still believed it was open would never re-show.
   */
  function dismiss(): void {
    state = STICKY_CLOSED;
    pending = null;
    clearGrace();
    hide();
  }

  /**
   * Fill, measure, place. The one implementation both `show` and `showAt` use,
   * so a card raised by the board is measured exactly as a card raised by a
   * panel row — see the module docblock's "Measurement, then placement".
   */
  function showBox(anchor: AnchorBox, build: () => Node): void {
    card.replaceChildren(build());
    // Laid out but not yet seen: the card must be measurable before it can be
    // placed, and placing it after it is visible is what makes it jump.
    card.style.visibility = 'hidden';
    card.style.left = '0px';
    card.style.top = '0px';
    card.hidden = false;
    const box = card.getBoundingClientRect();
    const place = placement === 'below' ? placeCardBelow : placeCard;
    const at = place(
      anchor,
      { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight },
      gap,
    );
    card.style.left = `${Math.round(at.left)}px`;
    card.style.top = `${Math.round(at.top)}px`;
    card.style.visibility = '';
  }

  function show(anchor: HTMLElement, build: () => Node): void {
    anchoredTo = anchor;
    boxAnchored = false;
    showBox(anchor.getBoundingClientRect(), build);
  }

  function showAt(anchor: AnchorBox, build: () => Node): void {
    anchoredTo = null;
    boxAnchored = true;
    showBox(anchor, build);
  }

  // Any scroll anywhere: the anchor has moved and the card has not. Captured,
  // because the panels that raise these cards are themselves the scrollers and
  // their scroll events do not bubble to the window.
  window.addEventListener('scroll', () => dismiss(), true);

  // --- the sticky half ------------------------------------------------------
  //
  // Everything below is inert unless `sticky` was asked for. The machine is
  // `stickyStep` (pure, and the one place the rule is written); this is its
  // plumbing — a timer for the gap between node and card, and the four ways the
  // world tells it something happened.

  let state: StickyState = STICKY_CLOSED;
  let grace: ReturnType<typeof setTimeout> | null = null;
  /** What the machine would show, held so `enterCard` can re-show nothing. */
  let pending: { anchor: HTMLElement; build: () => Node } | null = null;

  function clearGrace(): void {
    if (grace === null) return;
    clearTimeout(grace);
    grace = null;
  }

  /**
   * One event, then make the world agree with the machine.
   *
   * Reconciliation rather than an action per arm: every arm of `stickyStep`
   * would otherwise have to remember to start or stop the timer, and the arm
   * that forgot would be a card that never went away.
   */
  function send(event: StickyEvent): void {
    const before = state;
    state = stickyStep(state, event);
    if (state === before && event !== 'enterAnchor') return;
    if (state.open) {
      if (pending !== null && (anchoredTo !== pending.anchor || card.hidden)) {
        show(pending.anchor, pending.build);
      }
    } else {
      pending = null;
      hide();
    }
    clearGrace();
    if (stickyClosing(state)) grace = setTimeout(() => send('grace'), STICKY_GRACE_MS);
  }

  if (sticky) {
    card.addEventListener('pointerenter', () => send('enterCard'));
    card.addEventListener('pointerleave', () => send('leaveCard'));
    // A keyword raises the Compendium over the chart, so the card goes with the
    // click rather than waiting to be left. The keyword itself does the opening
    // (`keywords.ts`); this only takes the card down.
    //
    // **Captured**, and that is load-bearing: a keyword stops its own click from
    // propagating (it sits inside panels with their own handlers, and must never
    // also do what it was standing on). A bubble listener here would therefore
    // never run, and the card would stay up behind the book it just opened.
    card.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest('[data-ref]') !== null) send('keyword');
      },
      true,
    );
    // Captured and stopped **only while the card is up**, so the first Escape
    // takes the card down and the second still closes the screen behind it.
    window.addEventListener(
      'keydown',
      (event) => {
        // A hidden card claims nothing (Entry LVII's second half): if the DOM
        // moved on without the machine — an anchor torn out mid-hover never
        // fires pointerleave — the press belongs to whatever is actually on
        // screen, and the machine is put back rather than fed.
        if (card.hidden || (anchoredTo !== null && !anchoredTo.isConnected)) {
          if (state.open) send('elsewhere');
          return;
        }
        if (!state.open || event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        send('escape');
      },
      true,
    );
    window.addEventListener(
      'pointerdown',
      (event) => {
        // The keydown guard's twin: a card that is not on screen eats no click.
        if (card.hidden || (anchoredTo !== null && !anchoredTo.isConnected)) {
          if (state.open) send('elsewhere');
          return;
        }
        if (!state.open) return;
        const target = event.target;
        const inside =
          target instanceof Node &&
          (card.contains(target) || (anchoredTo?.contains(target) ?? false));
        if (!inside) send('elsewhere');
      },
      true,
    );
  }

  function bind(anchor: HTMLElement, build: () => Node): void {
    anchor.addEventListener('pointerenter', (event) => {
      // A tap is not a hover — see the docblock. A pen is, and reports itself
      // as `pen`, so only touch is turned away.
      if (event.pointerType === 'touch') return;
      if (sticky) {
        pending = { anchor, build };
        send('enterAnchor');
        return;
      }
      show(anchor, build);
    });
    anchor.addEventListener('pointerleave', () => {
      if (sticky) {
        if (pending?.anchor === anchor) send('leaveAnchor');
        return;
      }
      if (anchoredTo === anchor) hide();
    });
    // The keyboard's half of the same gesture. It costs two lines and it is the
    // only way a player tabbing through the build list ever sees these at all.
    anchor.addEventListener('focus', () => {
      if (sticky) {
        pending = { anchor, build };
        send('enterAnchor');
        return;
      }
      show(anchor, build);
    });
    anchor.addEventListener('blur', () => {
      if (sticky) {
        if (pending?.anchor === anchor) send('leaveAnchor');
        return;
      }
      if (anchoredTo === anchor) hide();
    });
  }

  return { bind, showAt, hide: dismiss };
}
