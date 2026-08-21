/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * The generator state is stored explicitly in a plain, serializable object and
 * passed into every call. No module-level state, no `Math.random()` — the whole
 * simulation must be reproducible from a seed alone.
 */

export interface Rng {
  /** 32-bit generator state. Serializable. */
  state: number;
}

/** Creates a generator from a numeric seed. */
export function makeRng(seed: number): Rng {
  // Coerce to a 32-bit integer; also scrambles floats / negatives sanely.
  return { state: seed | 0 };
}

/** Clones a generator so a sub-system can advance without disturbing the caller. */
export function cloneRng(rng: Rng): Rng {
  return { state: rng.state };
}

/**
 * Hashes an arbitrary string into a 32-bit seed (FNV-1a).
 * Lets users type a word as a seed while keeping the sim numeric.
 */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/** Next raw 32-bit unsigned integer. Advances the state. */
export function nextUint32(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) | 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** Next float in [0, 1). */
export function nextFloat(rng: Rng): number {
  return nextUint32(rng) / 4294967296;
}

/** Next float in [min, max). */
export function nextRange(rng: Rng, min: number, max: number): number {
  return min + nextFloat(rng) * (max - min);
}

/** Next integer in [min, maxExclusive). Returns `min` if the range is empty. */
export function nextInt(rng: Rng, min: number, maxExclusive: number): number {
  const span = maxExclusive - min;
  if (span <= 0) return min;
  return min + Math.floor(nextFloat(rng) * span);
}

/** In-place Fisher–Yates shuffle driven by the generator. */
export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(rng, 0, i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}
