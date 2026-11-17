/**
 * **The orders screen's motion** (batch SS10, part 2B).
 *
 * The final board's six moments
 * (`docs/plans/mockups/scholars-study/orders-screen-final-board.html`, "The
 * six moments"), each with the form it takes when the player asks for less
 * motion (`wantsMotion`, `motion.ts`):
 *
 *   1. **Lift.** The hand card under the pointer rises 16 px in 120 ms
 *      (ease-out), and its full face opens beside it, fading in over 120 ms.
 *      Less motion: the face appears, with no rise. The rise is CSS
 *      (`statecraftScreen.css`); the face is `showPreview`.
 *   2. **Picked up.** The hand card follows the pointer, tilted 5 degrees
 *      (`placeGhost`). Less motion: no tilt.
 *   3. **Landing.** 180 ms on a short arc from the hand to the chair
 *      (ease-out). The card widens to the full face over the last 80 ms and
 *      its effect fades in (`animateLanding`). Less motion: a 120 ms
 *      cross-fade in place.
 *   4. **Staged against confirmed.** On Confirm the edge turns solid and the
 *      art darkens in 120 ms (`settleConfirmed`), and the figures count up
 *      (`statecraftScreen.ts`, `countUp`). Less motion: the figure is there.
 *   5. **Sealed.** A click shakes the card 2 px twice in 160 ms (CSS). Less
 *      motion: the line under the head only.
 *   6. **A swap.** The new card lands as in 3; the card that was in the chair
 *      narrows to its hand form and slides to its place in the hand, 180 ms
 *      ease-in-out (`flyToHand`). Less motion: both change in place.
 *
 * Every function here only animates. None of them changes what the screen
 * holds, so a moment that is cut short (a redraw, a closed sheet) leaves the
 * screen correct.
 */

import { wantsMotion } from './motion';

/** The board's timings, in milliseconds and pixels. */
export const ORDERS_MOTION = {
  /** Moment 1: the rise of a hand card, and the fade of its full face. */
  liftMs: 120,
  liftRise: 16,
  /** A compact or cut card lifts to the full face after this pause on hover or focus. */
  previewDelayMs: 300,
  /** Moment 2: the tilt of a card that follows the pointer. */
  tiltDeg: 5,
  /** Moment 3: the flight to the chair, the widening at its end, and the arc's height. */
  landingMs: 180,
  landingWidenMs: 80,
  landingArc: 28,
  /** Moments 3 and 6 with less motion: a cross-fade in place. */
  crossFadeMs: 120,
  /** Moment 4: the edge and the art settling on Confirm. */
  settleMs: 120,
  /** Moment 6: the swapped card's slide to the hand. */
  swapMs: 180,
} as const;

/** A rectangle relative to a layer's own box. */
interface LocalRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function localRect(rect: DOMRect, layer: HTMLElement): LocalRect {
  const box = layer.getBoundingClientRect();
  return { left: rect.left - box.left, top: rect.top - box.top, width: rect.width, height: rect.height };
}

/**
 * **Moment 1, and a compact card's lift**: shows `face` in `layer` beside the
 * anchor, inside the layer's box. `place` says where to look first: `above`
 * for a card in the rail at the foot of the table, `beside` for anything else.
 * The face fades in over 120 ms, or simply appears with less motion. Returns
 * the holder, so the caller can take it away.
 */
export function showPreview(
  layer: HTMLElement,
  anchor: DOMRect,
  face: HTMLElement,
  place: 'above' | 'beside' | 'below',
): HTMLElement {
  const holder = document.createElement('div');
  holder.className = 'orders-preview';
  holder.setAttribute('aria-hidden', 'true');
  holder.append(face);
  layer.append(holder);
  const box = layer.getBoundingClientRect();
  const at = localRect(anchor, layer);
  const width = holder.offsetWidth;
  const height = holder.offsetHeight;
  const gap = 12;
  let left: number;
  let top: number;
  if (place === 'above') {
    left = at.left + at.width / 2 - width / 2;
    top = at.top - height - gap;
  } else if (place === 'below') {
    left = at.left;
    top = at.top + at.height + gap;
  } else {
    left = at.left + at.width + gap;
    if (left + width > box.width - 8) left = at.left - width - gap;
    top = at.top + at.height / 2 - height / 2;
  }
  left = Math.max(8, Math.min(left, box.width - width - 8));
  top = Math.max(8, Math.min(top, box.height - height - 8));
  holder.style.left = `${Math.round(left)}px`;
  holder.style.top = `${Math.round(top)}px`;
  // The fade is the stylesheet's (`orders-preview-in`, 120 ms), which the
  // less-motion block turns off.
  return holder;
}

/**
 * **Moment 2**: places the card that follows the pointer, centred a little
 * above the pointer's tip, tilted 5 degrees (no tilt with less motion).
 */
export function placeGhost(ghost: HTMLElement, layer: HTMLElement, x: number, y: number): void {
  const box = layer.getBoundingClientRect();
  ghost.style.left = `${Math.round(x - box.left - ghost.offsetWidth / 2)}px`;
  ghost.style.top = `${Math.round(y - box.top - 24)}px`;
  ghost.style.transform = wantsMotion() ? `rotate(${ORDERS_MOTION.tiltDeg}deg)` : 'none';
}

/**
 * **Moment 3, the landing**: the card in its chair flies there from `from`
 * (the card in hand, or the one following the pointer), at the hand's size,
 * on a short arc, and widens to its full face over the last 80 ms while its
 * effect fades in. With less motion, a 120 ms cross-fade in place.
 */
export function animateLanding(face: HTMLElement, from: DOMRect): void {
  const to = face.getBoundingClientRect();
  if (to.width === 0 || to.height === 0) return;
  if (!wantsMotion()) {
    face.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ORDERS_MOTION.crossFadeMs, easing: 'linear' });
    return;
  }
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  const widenAt = (ORDERS_MOTION.landingMs - ORDERS_MOTION.landingWidenMs) / ORDERS_MOTION.landingMs;
  face.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      {
        transformOrigin: '0 0',
        transform: `translate(${dx * 0.45}px, ${dy * 0.45 - ORDERS_MOTION.landingArc}px) scale(${sx}, ${sy})`,
        offset: widenAt / 2,
      },
      { transformOrigin: '0 0', transform: `translate(0px, 0px) scale(${sx}, ${sy})`, offset: widenAt },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    { duration: ORDERS_MOTION.landingMs, easing: 'ease-out' },
  );
  const sub = face.querySelector<HTMLElement>('.of-sub');
  if (sub !== null) {
    const end = getComputedStyle(sub).opacity;
    sub.animate([{ opacity: 0 }, { opacity: 0, offset: widenAt }, { opacity: end }], {
      duration: ORDERS_MOTION.landingMs,
      easing: 'linear',
    });
  }
}

/**
 * **Moment 4**: a card Confirm just made law. Its border is solid already;
 * this darkens the art and drops the hard shadow under it over 120 ms. Nothing
 * with less motion.
 */
export function settleConfirmed(face: HTMLElement): void {
  if (!wantsMotion()) return;
  const shadow = getComputedStyle(face).boxShadow;
  face.animate([{ boxShadow: 'none' }, { boxShadow: shadow }], { duration: ORDERS_MOTION.settleMs, easing: 'ease-out' });
  for (const part of face.querySelectorAll<HTMLElement>('.of-device, .of-sub, .of-tablet')) {
    part.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: ORDERS_MOTION.settleMs, easing: 'ease-out' });
  }
}

/**
 * **Moment 6, the slide**: a copy of the card that left the chair flies from
 * the chair's box to its place in the hand, narrowing as it goes, 180 ms
 * ease-in-out. The card in the hand is hidden until the copy arrives. Nothing
 * with less motion: both change in place.
 */
export function flyToHand(layer: HTMLElement, copy: HTMLElement, from: DOMRect, target: HTMLElement): void {
  if (!wantsMotion()) return;
  const to = target.getBoundingClientRect();
  if (to.width === 0) return;
  const start = localRect(from, layer);
  const end = localRect(to, layer);
  copy.classList.add('orders-fly');
  copy.style.left = `${end.left}px`;
  copy.style.top = `${end.top}px`;
  layer.append(copy);
  const scale = start.width / Math.max(1, end.width);
  target.style.visibility = 'hidden';
  const flight = copy.animate(
    [
      {
        transformOrigin: '0 0',
        transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${scale})`,
      },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    { duration: ORDERS_MOTION.swapMs, easing: 'ease-in-out' },
  );
  const land = (): void => {
    copy.remove();
    target.style.visibility = '';
  };
  flight.addEventListener('finish', land);
  flight.addEventListener('cancel', land);
}
