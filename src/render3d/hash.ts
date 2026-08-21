/**
 * Deterministic per-tile scatter.
 *
 * The same `hash3` family the sprite renderer and the look-dev prototype use,
 * copied rather than imported for the same reason the prototype copied it: the
 * 2D pipeline is frozen, and a shared import would make one a dependency of the
 * other's future. It is fifteen lines of integer math and it is not going to
 * drift.
 *
 * The property that matters: the same `(col, row, stream)` always yields the
 * same number, so rebuilding the board, resizing the window, panning across the
 * wrap seam or reloading the page can never make a tree hop. Each thing that
 * wants randomness takes its own `stream` index, so adding rocks to hills does
 * not reshuffle the forests that were already placed.
 *
 * Nothing in `src/render3d/` may call `Math.random()`.
 */

export function hash3(a: number, b: number, c: number): number {
  let h = (a | 0) * 0x27d4eb2d;
  h = (h ^ ((b | 0) * 0x165667b1)) >>> 0;
  h = (h ^ ((c | 0) * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2545f491) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** `hash3` mapped to `[0, 1)`. */
export function hashUnit(a: number, b: number, c: number): number {
  return hash3(a, b, c) / 4294967296;
}

/** `hash3` mapped to `[-1, 1)`. The usual shape for a jitter term. */
export function hashSigned(a: number, b: number, c: number): number {
  return hashUnit(a, b, c) * 2 - 1;
}

/** A deterministic scatter point inside a disc of radius `spread`. */
export function hashDisc(
  col: number,
  row: number,
  stream: number,
  spread: number,
): { x: number; z: number } {
  const angle = hashUnit(col, row, stream) * Math.PI * 2;
  // sqrt keeps the points uniform over the disc instead of piling at the
  // centre, which is the difference between a planted forest and a haystack.
  const radius = Math.sqrt(hashUnit(col, row, stream + 1)) * spread;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}
