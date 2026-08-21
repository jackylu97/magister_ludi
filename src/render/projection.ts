/**
 * The isometric projection: one vertical squash, applied at draw time.
 *
 * There are three coordinate spaces and it is worth naming them, because every
 * bug in this file is a confusion between two of them:
 *
 *   plane   The hex layout `src/sim/hex.ts` produces — pointy-top hexes spaced
 *           `√3·s` apart horizontally and `1.5·s` vertically. Nothing about the
 *           simulation or the hex math knows the view is isometric; this space
 *           is exactly what `hexToPixel` returns, shifted down by one `s` so
 *           row 0's hex starts at y = 0.
 *   iso     The plane with y multiplied by `squash` and `padTop` added. This is
 *           what the terrain cache is baked in, what the camera pans over, and
 *           what `src/render/camera.ts` calls "world". 1 iso unit == 1 cached
 *           pixel, so the camera, the wrap period and the blit are all unchanged
 *           from the flat renderer.
 *   screen  iso through the camera transform. Lives in `camera.ts`.
 *
 * x is never touched: the squash is purely vertical, which is what keeps the
 * horizontal wrap period — and therefore the whole tiling trick — intact.
 *
 * Elevation
 * ---------
 * A tile with `hills` has its *face* drawn `hillRise` iso pixels higher than its
 * ground position, mountains `mountainRise`; a dark cliff strip fills the gap so
 * the face reads as lifted rather than floating. Everything anchored to that
 * tile — standing sprites, units, overlays — inherits the same rise.
 *
 * Picking deliberately ignores rises (`isoToAxial` unprojects to the ground
 * plane). Inverting the elevation would need a per-tile search, and the error is
 * at most `mountainRise` iso pixels — roughly a sixth of a hex at the default
 * tuning, so the cursor lands on the right tile everywhere except a thin band
 * along the *upper* edge of a raised tile. This is a known approximation, not an
 * oversight; keeping the inverse a closed form is worth it.
 */

import { type Hex, type Point, SQRT3, hexToPixel, pixelToHex } from '../sim/hex';
import { offsetToAxial } from '../sim/map';

/** Everything the projection needs, resolved for one terrain-cache build. */
export interface Projection {
  /** Hex circumradius in plane units. */
  baseSize: number;
  /** Vertical squash factor; 1 is the flat top-down view. */
  squash: number;
  /** Iso pixels of blank space above row 0's hex, for standing-sprite overhang. */
  padTop: number;
  /** Iso pixels a hills tile's face is lifted by. */
  hillRise: number;
  /** Iso pixels a mountain tile's face is lifted by. */
  mountainRise: number;
}

/** The rise-relevant part of a tile, so this module never imports `Tile`. */
export interface Elevated {
  terrain: string;
  hills: boolean;
}

export function createProjection(
  baseSize: number,
  squash: number,
  padTop: number,
  hillRise: number,
  mountainRise: number,
): Projection {
  return { baseSize, squash, padTop, hillRise, mountainRise };
}

/** Hex width (corner to corner across the flats) in plane units. */
export function hexWidth(baseSize: number): number {
  return SQRT3 * baseSize;
}

/**
 * Plane-space centre of an offset cell.
 *
 * The `+ baseSize` puts row 0's topmost vertex at y = 0, so the plane's origin
 * is the map's top-left corner rather than the centre of its first hex.
 */
export function tilePlaneCenter(col: number, row: number, baseSize: number): Point {
  const p = hexToPixel(offsetToAxial(col, row), baseSize);
  return { x: p.x, y: p.y + baseSize };
}

/** Inverse of the `+ baseSize` in `tilePlaneCenter`. */
export function planeToHexPixel(planeX: number, planeY: number, baseSize: number): Point {
  return { x: planeX, y: planeY - baseSize };
}

export function planeToIso(p: Point, projection: Projection): Point {
  return { x: p.x, y: p.y * projection.squash + projection.padTop };
}

export function isoToPlane(x: number, y: number, projection: Projection): Point {
  return { x, y: (y - projection.padTop) / projection.squash };
}

/** Iso-space centre of an offset cell, at ground level (no elevation rise). */
export function tileIsoCenter(col: number, row: number, projection: Projection): Point {
  return planeToIso(tilePlaneCenter(col, row, projection.baseSize), projection);
}

/** How far above its ground position a tile's face is drawn, in iso pixels. */
export function tileRise(tile: Elevated, projection: Projection): number {
  if (tile.terrain === 'mountain') return projection.mountainRise;
  return tile.hills ? projection.hillRise : 0;
}

/**
 * The hex under an iso-space point, as axial coordinates. Inverse of
 * `tileIsoCenter` up to rounding, and up to elevation (see the module docblock).
 */
export function isoToAxial(isoX: number, isoY: number, projection: Projection): Hex {
  const plane = isoToPlane(isoX, isoY, projection);
  const local = planeToHexPixel(plane.x, plane.y, projection.baseSize);
  return pixelToHex(local.x, local.y, projection.baseSize);
}

/**
 * The 6 corners of a squashed hex centred at `(cx, cy)`, in the same order as
 * `hexCorners`: index 0 is the east-upper corner and they run clockwise, so
 * index 2 is the bottom vertex and index 5 the top one.
 *
 * The y offsets are scaled rather than the canvas, on purpose: `ctx.scale` would
 * squash stroke widths too and the grid would come out anisotropic.
 */
export function squashedHexCorners(
  cx: number,
  cy: number,
  size: number,
  squash: number,
): Point[] {
  const corners: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle) * squash,
    });
  }
  return corners;
}

/**
 * The lower silhouette of a squashed hex: corners 0 → 1 → 2 → 3 → 4, i.e. the
 * edges a viewer sees the *front* of. The cliff strip under a raised face is
 * this chain extruded downwards.
 */
export function frontChain(corners: readonly Point[]): Point[] {
  return [corners[0]!, corners[1]!, corners[2]!, corners[3]!, corners[4]!];
}

/** Height of the cached map in iso units, padding included. */
export function cacheIsoHeight(mapHeight: number, projection: Projection): number {
  const planeHeight = 1.5 * projection.baseSize * (mapHeight - 1) + 2 * projection.baseSize;
  return projection.padTop + planeHeight * projection.squash;
}

/** Horizontal wrap period in iso units — unchanged by the squash. */
export function cacheIsoWidth(mapWidth: number, baseSize: number): number {
  return hexWidth(baseSize) * mapWidth;
}
