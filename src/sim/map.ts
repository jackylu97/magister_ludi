/**
 * The board: a rectangular hex map stored as odd-r offset rows, wrapping
 * east–west like a cylinder.
 *
 * Storage
 * -------
 * Tiles live in one flat array indexed `row * width + col`. Each tile keeps its
 * offset coordinates (`col`, `row`); axial coordinates are derived on demand via
 * `offsetToAxial` / `axialToOffset` (odd-r: odd rows are pushed half a hex east).
 *
 * Hills
 * -----
 * `feature` is only `none | forest | jungle`. Hills are a separate boolean flag
 * on the tile rather than a feature value, because in Civ-like rules hills stack
 * *with* a feature (forested hills are a real, common combination) and mountains
 * are their own terrain. `elevation` keeps the raw normalised noise value that
 * produced the flag.
 *
 * Wrapping
 * --------
 * Every coordinate access goes through `wrapCol` / `wrapHex`. Columns wrap
 * modulo `width`; rows never wrap — anything above row 0 or below `height - 1`
 * is off the map and resolves to `undefined`.
 *
 * Rivers live on edges, not on tiles
 * ----------------------------------
 * A river in this game is a Civ-style *edge* river: it runs along the border
 * between two hexes rather than through the middle of one, which is what lets a
 * river be a boundary and a source of water without also being a tile you have
 * to spend a turn walking around. `Tile.riverEdges` is a 6-bit mask indexed by
 * `HEX_DIRECTIONS`, bit `d` meaning "a river runs along the edge I share with
 * my neighbour in direction `d`".
 *
 * Resources live on tiles, and are absent rather than empty
 * ----------------------------------------------------------
 * `Tile.resource` is the id of the wheat, iron or silk sitting on the hex, and
 * the key is missing entirely on the ninety-odd percent of tiles that carry
 * nothing. It is generation output like the terrain — placed by `resources.ts`
 * as the last pass of `generateMap`, reproduced from the seed, and never
 * written again during play.
 *
 * Improvements live on tiles too, and are the one thing here that plays
 * ---------------------------------------------------------------------
 * `Tile.improvement` is the farm or the mine a worker built, and it is the only
 * field on a tile that changes during a game. See its docblock for why that is
 * compatible with a save file that carries a seed rather than a board.
 *
 * THE INVARIANT: an edge is flagged on *both* of the tiles that share it. Bit
 * `d` of tile A implies bit `(d + 3) % 6` of A's neighbour in direction `d`,
 * because `HEX_DIRECTIONS[d + 3]` is exactly `-HEX_DIRECTIONS[d]`. Every write
 * goes through `setRiverEdge` in `water.ts`, which sets both halves, and
 * `test/water.test.ts` asserts the mirror over whole generated maps. Reading one
 * side is therefore always enough — `hasRiverEdge(tile, d)` never has to look up
 * the neighbour — and that is the whole reason the flag is duplicated rather
 * than stored once on a canonical owner.
 */

import {
  type Hex,
  HEX_DIRECTIONS,
  hexDistance,
} from './hex';
import type { ImprovementId } from './improvementData';
import type { ResourceId } from './resourceData';
import type { FeatureId, TerrainId } from './terrainData';

export interface Tile {
  /** Offset column, always in `[0, width)`. */
  col: number;
  /** Offset row, always in `[0, height)`. */
  row: number;
  terrain: TerrainId;
  feature: FeatureId;
  /** Hills stack with terrain and features; see the module docblock. */
  hills: boolean;
  /** Normalised generator elevation, 0..1. */
  elevation: number;
  /** Normalised generator moisture, 0..1. */
  moisture: number;
  /**
   * Which of this tile's six edges a river runs along, as a 6-bit mask indexed
   * by `HEX_DIRECTIONS`. See the module docblock for the mirror invariant.
   */
  riverEdges: number;
  /**
   * True when this tile is land that can drink: it has a river on one of its
   * own edges, or a lake next door. Computed once at the end of generation by
   * `computeFreshwater` (`water.ts`); read through `hasFreshWater`.
   */
  freshwater: boolean;
  /**
   * The resource sitting on this tile, or the key is **absent** when there is
   * none. Placed once, at the end of generation, by `placeResources`
   * (`resources.ts`); read through `tileYieldOf` for what it pays and through
   * `visibleResourceAt` (`tech.ts`) for what a given player may be told about it.
   *
   * Absence rather than a `'none'` sentinel, which is `Unit.path`'s convention
   * and is here for the same reason: two maps that are the same map must
   * serialise identically, and a bare tile has never had a resource rather than
   * having one called nothing.
   */
  resource?: ResourceId;
  /**
   * The farm, mine or pasture standing on this tile, or the key is **absent**
   * when there is none. Absence rather than a `'none'` sentinel, for the reason
   * `resource` gives above.
   *
   * The one field on a tile that is **not** generation output: it is written
   * during play by the `buildImprovement` command and cleared by `pillage`
   * (`commands.ts`), and by nothing else. That does not break the "a save file
   * carries a seed, not four thousand tiles" promise in `state.ts` — a save is
   * `{config, log}` and every improvement on the board is in that log, so a
   * replay lays them down again in the order they were built. What it does mean
   * is that the map object is no longer a pure function of the seed *after* turn
   * one, and anything that regenerates it mid-game (nothing does) would wipe the
   * empire's works.
   */
  improvement?: ImprovementId;
}

export interface GameMap {
  width: number;
  height: number;
  /** Seed the map was generated from (informational; regeneration is by seed). */
  seed: number;
  /** Size key from `data/mapgen.json`. */
  sizeName: string;
  /** Flat tile array, indexed `row * width + col`. */
  tiles: Tile[];
}

// --- offset <-> axial -------------------------------------------------------

/** odd-r offset -> axial. Odd rows are shifted half a hex east. */
export function offsetToAxial(col: number, row: number): Hex {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

/** axial -> odd-r offset. */
export function axialToOffset(h: Hex): { col: number; row: number } {
  return { col: h.q + (h.r - (h.r & 1)) / 2, row: h.r };
}

// --- wrapping ---------------------------------------------------------------

/** Wraps an offset column into `[0, width)`. THE canonical east–west wrap. */
export function wrapCol(map: GameMap, col: number): number {
  const w = map.width;
  return ((col % w) + w) % w;
}

/** True when a row is on the map (rows do not wrap). */
export function inRows(map: GameMap, row: number): boolean {
  return row >= 0 && row < map.height;
}

/**
 * Wraps an axial `q` for the given row, returning the canonical `q`.
 * Axial `q` depends on the row, so the row must be supplied.
 */
export function wrapQ(map: GameMap, q: number, r: number): number {
  const { col } = axialToOffset({ q, r });
  return offsetToAxial(wrapCol(map, col), r).q;
}

/** Canonical (wrapped) form of an axial hex. Rows are left untouched. */
export function wrapHex(map: GameMap, h: Hex): Hex {
  return { q: wrapQ(map, h.q, h.r), r: h.r };
}

// --- tile access ------------------------------------------------------------

export function tileIndex(map: GameMap, col: number, row: number): number {
  return row * map.width + col;
}

/** Tile at offset coordinates, wrapping the column. `undefined` off the poles. */
export function getTileAt(map: GameMap, col: number, row: number): Tile | undefined {
  if (!inRows(map, row)) return undefined;
  return map.tiles[tileIndex(map, wrapCol(map, col), row)];
}

/** Tile at axial coordinates, wrapping the column. `undefined` off the poles. */
export function getTile(map: GameMap, h: Hex): Tile | undefined {
  const { col, row } = axialToOffset(h);
  return getTileAt(map, col, row);
}

/** The axial coordinates of a tile. */
export function tileHex(tile: Tile): Hex {
  return offsetToAxial(tile.col, tile.row);
}

export function forEachTile(map: GameMap, fn: (tile: Tile) => void): void {
  for (const tile of map.tiles) fn(tile);
}

// --- map-aware neighbourhood ------------------------------------------------

/**
 * The on-map neighbours of `h` as canonical (wrapped) axial hexes.
 * Neighbours past the north/south edge are omitted, so the result has 3–6 entries.
 */
export function mapNeighbors(map: GameMap, h: Hex): Hex[] {
  const result: Hex[] = [];
  for (const d of HEX_DIRECTIONS) {
    const r = h.r + d.r;
    if (!inRows(map, r)) continue;
    result.push({ q: wrapQ(map, h.q + d.q, r), r });
  }
  return result;
}

/** The on-map neighbour tiles of `h`. */
export function neighborTiles(map: GameMap, h: Hex): Tile[] {
  const result: Tile[] = [];
  for (const n of mapNeighbors(map, h)) {
    const tile = getTile(map, n);
    if (tile) result.push(tile);
  }
  return result;
}

/** The on-map neighbour tiles of a tile. */
export function tileNeighbors(map: GameMap, tile: Tile): Tile[] {
  return neighborTiles(map, tileHex(tile));
}

/**
 * Hex distance that may travel around the east–west seam, i.e. the shortest of
 * going directly and going around the cylinder in either direction.
 */
export function wrappedDistance(map: GameMap, a: Hex, b: Hex): number {
  const w = map.width;
  // Shifting a hex by `k` whole map widths in *offset* space changes axial q by
  // k * width (the row, and therefore the odd-r shear term, is unchanged).
  let best = Infinity;
  for (let k = -1; k <= 1; k++) {
    const d = hexDistance(a, { q: b.q + k * w, r: b.r });
    if (d < best) best = d;
  }
  return best;
}

/** Every on-map tile within `radius` steps of `h`, wrap-aware, `h` included. */
export function mapRange(map: GameMap, h: Hex, radius: number): Tile[] {
  const result: Tile[] = [];
  if (radius < 0) return result;
  const seen = new Set<number>();
  for (let dq = -radius; dq <= radius; dq++) {
    const lo = Math.max(-radius, -dq - radius);
    const hi = Math.min(radius, -dq + radius);
    for (let dr = lo; dr <= hi; dr++) {
      const tile = getTile(map, { q: h.q + dq, r: h.r + dr });
      if (!tile) continue;
      const idx = tileIndex(map, tile.col, tile.row);
      // A small map can wrap onto itself; do not report the same tile twice.
      if (seen.has(idx)) continue;
      seen.add(idx);
      result.push(tile);
    }
  }
  return result;
}

// --- construction -----------------------------------------------------------

export interface CreateMapOptions {
  width: number;
  height: number;
  seed?: number;
  sizeName?: string;
  terrain?: TerrainId;
}

/** An empty map, every tile the same terrain. Generation fills it in. */
export function createMap(options: CreateMapOptions): GameMap {
  const { width, height } = options;
  const terrain = options.terrain ?? 'ocean';
  const tiles: Tile[] = new Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      tiles[row * width + col] = {
        col,
        row,
        terrain,
        feature: 'none',
        hills: false,
        elevation: 0,
        moisture: 0,
        riverEdges: 0,
        freshwater: false,
      };
    }
  }
  return {
    width,
    height,
    seed: options.seed ?? 0,
    sizeName: options.sizeName ?? 'custom',
    tiles,
  };
}
