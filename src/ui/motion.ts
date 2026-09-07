/**
 * One media query, asked once.
 *
 * `prefers-reduced-motion` is the only accessibility setting this interface
 * reads, and it was read in eight places under two names — five
 * `prefersReducedMotion` and three `wantsMotion`, which is the same question
 * with the sign flipped (`docs/audit/simplify.md` §2). Four of the eight
 * guarded `matchMedia` with `?.` and four did not, so half of them threw in an
 * environment that has no `matchMedia` and half answered "animate" — a
 * difference nobody chose and no test could have named.
 *
 * Both names survive because both readings are natural at a call site: an
 * animation asks `wantsMotion()` before it starts, and a beat asks
 * `prefersReducedMotion()` when it wants to collapse to zero. One of them is
 * the negation of the other and there is nowhere left for them to disagree.
 *
 * Asked per call rather than cached: a player can change the setting with the
 * game open, and a cached answer would keep animating a screen that had just
 * asked for stillness.
 */

/** True when the viewer has asked for less movement. Safe where `matchMedia` is absent. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** `prefersReducedMotion`'s other side, for the animations that read it that way. */
export function wantsMotion(): boolean {
  return !prefersReducedMotion();
}
