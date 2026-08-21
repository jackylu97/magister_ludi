/**
 * Where a tile *is*, in world units. Pure math — no Three.js, no DOM.
 *
 * Two coordinate spaces and one rule that ties them together:
 *
 *   plane   The pointy-top hex layout `src/sim/hex.ts` produces, in a single
 *           2D space where `hexToPixel` gives `(x, y)`.
 *   world   The 3D board's ground plane, where that same layout is read as
 *           `(x, z)` and `y` becomes height. `worldX === plane.x` and
 *           `worldZ === plane.y`, exactly — the board is the hex plane laid
 *           flat and lifted, never re-derived.
 *
 * That identity is the whole reason picking can be a closed form: the inverse of
 * "which tile is at this world point" is `pixelToHex(x, z)`, the same function
 * the 2D renderer inverts, with no isometric squash in the way.
 *
 * The height model
 * ----------------
 * A tile's top face is at one of five heights — ocean, coast, land, hills,
 * mountain — plus a per-tile jitter of a few percent. The nominal heights are
 * what picking intersects; `tileTopY` is what things standing on the tile are
 * placed at. The jitter is deliberately small (a few hundredths of a hex radius)
 * so those two never disagree by enough to matter, and it is hashed from the
 * tile's own coordinates so it is identical in every rebuild, in every copy of
 * the board across the wrap seam, and in the tests.
 *
 * Wrapping
 * --------
 * The map is a cylinder `map.width` columns around. In world units that period
 * is `√3 · hexRadius · width`, and it is *exact*: odd rows are offset half a hex
 * east by the odd-r layout, and half a hex east of the last column is the first
 * column of the next copy. Nothing here wraps anything itself — `worldToCell`
 * hands the column to the simulation's `wrapCol`, which is the one canonical
 * definition of the seam.
 */

import { SQRT3, hexToPixel, pixelToHex } from '../sim/hex';
import { type GameMap, type Tile, axialToOffset, getTileAt, offsetToAxial } from '../sim/map';

import { hashSigned } from './hash';
import { VIEW3D } from './lookData';

const BOARD = VIEW3D.board;

/** The five prism heights a tile top can sit at. */
export type HeightClass = keyof typeof BOARD.height;

/**
 * Height classes ordered top-down.
 *
 * Picking walks this order and takes the first plane whose hit lands on a tile
 * of that class, which is what makes a hill in front of a coast tile occlude it
 * rather than the other way round. Sorted from the data rather than written out,
 * so re-tuning `board.height` in `view3d.json` cannot silently invert the test.
 */
export const HEIGHT_CLASSES_TOP_DOWN: readonly HeightClass[] = (
  Object.keys(BOARD.height) as HeightClass[]
).sort((a, b) => BOARD.height[b] - BOARD.height[a]);

/** Which prism height a tile gets. Mountain beats hills beats water beats flat. */
export function heightClassOf(tile: Tile): HeightClass {
  if (tile.terrain === 'mountain') return 'mountain';
  if (tile.terrain === 'ocean') return 'ocean';
  if (tile.terrain === 'coast') return 'coast';
  return tile.hills ? 'hills' : 'land';
}

/** The un-jittered top face height of a height class. */
export function nominalTopY(kind: HeightClass): number {
  return BOARD.height[kind];
}

/**
 * Per-tile uniform scale.
 *
 * Applied as a *uniform* scale about the prism's base rather than a y-only
 * squash: it keeps the inverted-hull outline a constant thickness (the shell
 * offset is multiplied by the instance matrix) and keeps the base planted on the
 * floor plane. The horizontal cost is ±3.5% of a hex radius, which disappears
 * into the tile gap.
 */
export function tileScale(tile: Tile): number {
  return 1 + hashSigned(tile.col, tile.row, 11) * BOARD.heightJitter;
}

/** Per-tile yaw jitter, in radians. */
export function tileYaw(tile: Tile): number {
  return hashSigned(tile.col, tile.row, 12) * BOARD.yawJitter;
}

/**
 * Top face height of a tile *after* its jitter — where anything standing on this
 * tile must be placed. Derived from the same scale the prism gets, so a tree can
 * never float above or sink into the tile it belongs to.
 */
export function tileTopY(tile: Tile): number {
  const base = nominalTopY(heightClassOf(tile));
  return BOARD.floorY + (base - BOARD.floorY) * tileScale(tile);
}

/**
 * World-space centre of an offset cell, on the ground plane (height ignored).
 *
 * Straight through `hexToPixel`, with its y read as world z. Going through the
 * simulation's own layout function rather than re-deriving the formula is what
 * guarantees the board and the picker agree about where a hex is.
 */
export function cellCenter(col: number, row: number): { x: number; z: number } {
  const point = hexToPixel(offsetToAxial(col, row), BOARD.hexRadius);
  return { x: point.x, z: point.y };
}

/** The horizontal wrap period of a map, in world units. */
export function wrapWidth(map: GameMap): number {
  return SQRT3 * BOARD.hexRadius * map.width;
}

/** World-space extent of a map's tile centres. */
export function boardBounds(map: GameMap): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  // Cheap and exact rather than a scan: row 0 starts at x = 0, odd rows are
  // half a hex further east, and z is linear in the row.
  const w = SQRT3 * BOARD.hexRadius;
  const oddRowShift = map.height > 1 ? w / 2 : 0;
  return {
    minX: 0,
    maxX: w * (map.width - 1) + oddRowShift,
    minZ: 0,
    maxZ: 1.5 * BOARD.hexRadius * (map.height - 1),
  };
}

/**
 * The offset cell containing a world-space ground point, wrap-aware.
 *
 * `col` comes back canonical (wrapped into `[0, width)`) via the simulation's
 * `wrapCol`; `worldCol` is the un-wrapped column, which says *which copy* of the
 * board the point landed in and is what a caller needs to know if it wants to
 * draw something exactly under the cursor. Returns `null` past the poles, where
 * there is no tile at all — rows never wrap.
 */
export function worldToCell(
  map: GameMap,
  x: number,
  z: number,
): { tile: Tile; col: number; row: number; worldCol: number } | null {
  const axial = pixelToHex(x, z, BOARD.hexRadius);
  const { col, row } = axialToOffset(axial);
  const tile = getTileAt(map, col, row);
  if (!tile) return null;
  return { tile, col: tile.col, row: tile.row, worldCol: col };
}
