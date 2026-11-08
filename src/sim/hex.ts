/**
 * Hex grid math for pointy-top hexes in axial coordinates.
 *
 * Axial coordinates `{ q, r }` where +q runs east and +r runs south-east.
 * Cube coordinates `{ x, y, z }` (x = q, z = r, y = -x - z) are used internally
 * wherever the algorithm is cleaner in cube space (distance, lerp, rounding).
 *
 * Pure math: no map, no wrapping, no rendering. Map-aware (cylinder wrapping)
 * variants live in `map.ts`.
 */

export interface Hex {
  q: number;
  r: number;
}

interface Cube {
  x: number;
  y: number;
  z: number;
}

export interface Point {
  x: number;
  y: number;
}

export const SQRT3 = Math.sqrt(3);

/**
 * The 6 neighbour directions, starting east and going clockwise
 * (screen-space clockwise for pointy-top: E, SE, SW, W, NW, NE).
 */
export const HEX_DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 }, // east
  { q: 0, r: 1 }, // south-east
  { q: -1, r: 1 }, // south-west
  { q: -1, r: 0 }, // west
  { q: 0, r: -1 }, // north-west
  { q: 1, r: -1 }, // north-east
];

export function hex(q: number, r: number): Hex {
  return { q, r };
}

/** A stable string key, handy for Set/Map lookups. */
export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`;
}

// --- cube conversions -------------------------------------------------------

export function axialToCube(h: Hex): Cube {
  return { x: h.q, y: -h.q - h.r, z: h.r };
}

export function cubeToAxial(c: Cube): Hex {
  return { q: c.x, r: c.z };
}

// --- distance ---------------------------------------------------------------

/** Grid distance in steps between two hexes. */
export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

// --- rings and ranges -------------------------------------------------------

// --- rounding and interpolation ---------------------------------------------

/** Rounds fractional cube coordinates to the nearest hex centre. */
function cubeRound(c: Cube): Cube {
  let rx = Math.round(c.x);
  let ry = Math.round(c.y);
  let rz = Math.round(c.z);

  const dx = Math.abs(rx - c.x);
  const dy = Math.abs(ry - c.y);
  const dz = Math.abs(rz - c.z);

  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  // `+ 0` normalises -0 to 0 so coordinates compare and serialise cleanly.
  return { x: rx + 0, y: ry + 0, z: rz + 0 };
}

/** Rounds fractional axial coordinates to the nearest hex. */
function hexRound(h: Hex): Hex {
  return cubeToAxial(cubeRound(axialToCube(h)));
}

function cubeLerp(a: Cube, b: Cube, t: number): Cube {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/**
 * The hexes along the straight line from `a` to `b`, inclusive of both.
 * Uses cube lerp with a tiny nudge so ties fall consistently on one side.
 * Result length is `hexDistance(a, b) + 1`.
 */
export function hexLine(a: Hex, b: Hex): Hex[] {
  const n = hexDistance(a, b);
  if (n === 0) return [{ q: a.q, r: a.r }];

  const ac = axialToCube(a);
  const bc = axialToCube(b);
  // Nudge to avoid landing exactly on an edge between two hexes.
  const nudged: Cube = { x: bc.x + 1e-6, y: bc.y + 2e-6, z: bc.z - 3e-6 };

  const results: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    results.push(cubeToAxial(cubeRound(cubeLerp(ac, nudged, i / n))));
  }
  return results;
}

// --- pixel conversion (pointy-top layout) -----------------------------------

/**
 * Centre of hex `h` in pixels, where `size` is the hex circumradius
 * (centre to corner). Hex width is `√3 · size`, height is `2 · size`.
 */
export function hexToPixel(h: Hex, size: number): Point {
  return {
    x: size * SQRT3 * (h.q + h.r / 2),
    y: size * 1.5 * h.r,
  };
}

/** Fractional axial coordinates for a pixel position (before rounding). */
function pixelToHexFractional(x: number, y: number, size: number): Hex {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return { q, r };
}

/** The hex containing pixel position `(x, y)`. Inverse of `hexToPixel`. */
export function pixelToHex(x: number, y: number, size: number): Hex {
  return hexRound(pixelToHexFractional(x, y, size));
}

/** The 6 corner points of a hex centred at `(cx, cy)`, starting at the east-ish corner. */
export function hexCorners(cx: number, cy: number, size: number): Point[] {
  const corners: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return corners;
}
