/**
 * The hover card: a note laid beside whatever the pointer is resting on.
 *
 * One shape, two surfaces. The city screen's build list uses it to say what a
 * unit *is* before you spend forty hammers finding out; the star chart uses it
 * to say what a technology actually hands over, which is more than the four
 * lines a node card has room for. Both wanted the same object, so it is written
 * once here and dressed by a class name.
 *
 * It is a note and not a control
 * ------------------------------
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

export interface InfoCard {
  /**
   * Wires an anchor to the card it should raise. `build` is called on each
   * hover rather than once, so a card always quotes the state as it is now —
   * a cost that has climbed, a rate that has fallen — without the panel having
   * to remember which cards it handed out.
   */
  bind(anchor: HTMLElement, build: () => Node): void;
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
}

const DEFAULT_GAP = 10;

export function createInfoCard(options: InfoCardOptions): InfoCard {
  const { className, gap = DEFAULT_GAP } = options;

  const card = document.createElement('div');
  card.className = className;
  card.hidden = true;
  // Announced to nobody: the card repeats what its anchor's own `title` and
  // label already say, and a live region that fired on every pointer move
  // would be a screen reader narrating the mouse.
  card.setAttribute('aria-hidden', 'true');
  document.body.append(card);

  /** What the card is currently open against, so a stale leave is ignored. */
  let anchoredTo: HTMLElement | null = null;

  function hide(): void {
    if (anchoredTo === null) return;
    anchoredTo = null;
    card.hidden = true;
    card.replaceChildren();
  }

  function show(anchor: HTMLElement, build: () => Node): void {
    anchoredTo = anchor;
    card.replaceChildren(build());
    // Laid out but not yet seen: the card must be measurable before it can be
    // placed, and placing it after it is visible is what makes it jump.
    card.style.visibility = 'hidden';
    card.style.left = '0px';
    card.style.top = '0px';
    card.hidden = false;
    const box = card.getBoundingClientRect();
    const at = placeCard(
      anchor.getBoundingClientRect(),
      { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight },
      gap,
    );
    card.style.left = `${Math.round(at.left)}px`;
    card.style.top = `${Math.round(at.top)}px`;
    card.style.visibility = '';
  }

  // Any scroll anywhere: the anchor has moved and the card has not. Captured,
  // because the panels that raise these cards are themselves the scrollers and
  // their scroll events do not bubble to the window.
  window.addEventListener('scroll', hide, true);

  function bind(anchor: HTMLElement, build: () => Node): void {
    anchor.addEventListener('pointerenter', (event) => {
      // A tap is not a hover — see the docblock. A pen is, and reports itself
      // as `pen`, so only touch is turned away.
      if (event.pointerType === 'touch') return;
      show(anchor, build);
    });
    anchor.addEventListener('pointerleave', () => {
      if (anchoredTo === anchor) hide();
    });
    // The keyboard's half of the same gesture. It costs two lines and it is the
    // only way a player tabbing through the build list ever sees these at all.
    anchor.addEventListener('focus', () => show(anchor, build));
    anchor.addEventListener('blur', () => {
      if (anchoredTo === anchor) hide();
    });
  }

  return { bind, hide };
}
