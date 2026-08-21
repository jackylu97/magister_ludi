/**
 * Self-contained 3D simplex noise (Perlin's simplex, Gustavson's formulation),
 * seeded from the project PRNG. No npm dependency, no `Math.random()`.
 *
 * 3D (rather than 2D) so map generation can sample noise on the *surface of a
 * cylinder*: the east–west axis becomes an angle around a circle, which makes
 * the field exactly periodic across the map seam. See `mapgen.ts`.
 */

import { type Rng, nextInt } from './rng';

// 12 gradient vectors pointing at the midpoints of the edges of a cube.
const GRAD3 = new Int8Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1,
  0, 1, -1, 0, -1, -1,
]);

const F3 = 1 / 3;
const G3 = 1 / 6;

/**
 * Kernel radius squared. 0.5 (rather than the more common 0.6) makes each
 * corner's contribution vanish exactly at the simplex boundary, so the field is
 * continuous everywhere. With 0.6 the noise takes small jumps across simplex
 * faces, which breaks exact periodicity on the cylinder seam.
 */
const KERNEL = 0.5;

/** Normalises the summed corner contributions into roughly [-1, 1] for KERNEL = 0.5. */
const SCALE = 76;

export interface Noise3D {
  /** 512-entry doubled permutation table. */
  perm: Uint8Array;
  /** Same table pre-reduced modulo 12 for gradient lookup. */
  permMod12: Uint8Array;
}

/** Builds a permutation table by shuffling 0..255 with the seeded PRNG. */
export function createNoise3D(rng: Rng): Noise3D {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = nextInt(rng, 0, i + 1);
    const tmp = p[i]!;
    p[i] = p[j]!;
    p[j] = tmp;
  }

  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]!;
    permMod12[i] = perm[i]! % 12;
  }
  return { perm, permMod12 };
}

function dot3(gi: number, x: number, y: number, z: number): number {
  return GRAD3[gi]! * x + GRAD3[gi + 1]! * y + GRAD3[gi + 2]! * z;
}

/** 3D simplex noise. Output is (approximately) in [-1, 1]. */
export function noise3(n: Noise3D, xin: number, yin: number, zin: number): number {
  const { perm, permMod12 } = n;

  // Skew the input space to determine which simplex cell we're in.
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);

  const t = (i + j + k) * G3;
  // Unskewed cell origin, and the distances from it.
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  const z0 = zin - (k - t);

  // Determine which of the 6 simplices (tetrahedra) we are in.
  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
    } else {
      i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
    } else {
      i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2 * G3;
  const y2 = y0 - j2 + 2 * G3;
  const z2 = z0 - k2 + 2 * G3;
  const x3 = x0 - 1 + 3 * G3;
  const y3 = y0 - 1 + 3 * G3;
  const z3 = z0 - 1 + 3 * G3;

  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;

  let n0 = 0;
  let t0 = KERNEL - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0) {
    t0 *= t0;
    n0 = t0 * t0 * dot3(permMod12[ii + perm[jj + perm[kk]!]!]! * 3, x0, y0, z0);
  }

  let n1 = 0;
  let t1 = KERNEL - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0) {
    t1 *= t1;
    n1 = t1 * t1 * dot3(permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]!]!]! * 3, x1, y1, z1);
  }

  let n2 = 0;
  let t2 = KERNEL - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0) {
    t2 *= t2;
    n2 = t2 * t2 * dot3(permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]!]!]! * 3, x2, y2, z2);
  }

  let n3 = 0;
  let t3 = KERNEL - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0) {
    t3 *= t3;
    n3 = t3 * t3 * dot3(permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]!]!]! * 3, x3, y3, z3);
  }

  return SCALE * (n0 + n1 + n2 + n3);
}

export interface FbmOptions {
  octaves: number;
  lacunarity: number;
  persistence: number;
}

/**
 * Fractal (fractional Brownian motion) sum of simplex octaves.
 * Amplitude-normalised, so the output stays roughly in [-1, 1].
 */
export function fbm3(
  n: Noise3D,
  x: number,
  y: number,
  z: number,
  options: FbmOptions,
): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let normalization = 0;

  for (let octave = 0; octave < options.octaves; octave++) {
    sum += amplitude * noise3(n, x * frequency, y * frequency, z * frequency);
    normalization += amplitude;
    amplitude *= options.persistence;
    frequency *= options.lacunarity;
  }

  return normalization === 0 ? 0 : sum / normalization;
}
