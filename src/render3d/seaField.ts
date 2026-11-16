/**
 * The three numbers each water vertex carries for the new sea (switch 1 of the
 * visual test version, `visualTest.ts`). Baked once when the board builds, in
 * the worker with the rest of the board, and read by `SEA_GLSL` in
 * `visualTestLook.ts`:
 * - x, `shore`: the distance to the nearest edge between a water hex and a land
 *   hex, in world units, capped at `sea.shoreReach`. On the water sheet under a
 *   land hex it is the same distance made negative, or `RIVER` where a river
 *   edge is nearer than any shore (a river keeps its old paint);
 * - y, `edge`: the distance to the nearest edge between a coast (or lake) hex
 *   and an ocean hex, positive inside the ocean hex, capped at `sea.edgeReach`;
 * - z, `deep`: how many hexes the water hex is from land, mixed across the hex
 *   from its centre to its corners so the gradient has no steps. A lake reads
 *   `LAKE`.
 *
 * Pure, apart from the attribute it writes: everything is a function of the map,
 * and nothing reads the simulation's random numbers.
 */

import { BufferAttribute, type BufferGeometry } from 'three';

// @ts-expect-error Approved terrain modules remain JavaScript.
import { neighbour as studyNeighbour } from '../terrainStudy/surface.js';

export interface SeaTile {
  col: number;
  row: number;
  terrain: string;
  riverEdges?: number;
}

export interface SeaMap {
  width: number;
  height: number;
  tiles: SeaTile[];
}

/** The `shore` value on the water under a land hex that a river is nearer than any shore. */
export const RIVER = -9;
/** The `deep` value on a lake. */
export const LAKE = -1;

const ROOT3 = Math.sqrt(3);
const isWater = (tile: SeaTile | null | undefined): boolean =>
  !!tile && (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake');
const neighbour = studyNeighbour as (tile: SeaTile, map: SeaMap, direction: number) => SeaTile | null;

type Segment = [number, number, number, number];

/** Segments filed in a grid of one world unit, so a query looks at a few cells only. */
class SegmentGrid {
  private cells = new Map<number, Segment[]>();
  add(segment: Segment): void {
    const [ax, az, bx, bz] = segment;
    for (let x = Math.floor(Math.min(ax, bx)); x <= Math.floor(Math.max(ax, bx)); x++) {
      for (let z = Math.floor(Math.min(az, bz)); z <= Math.floor(Math.max(az, bz)); z++) {
        const key = (z + 64) * 65536 + (x + 32768);
        const list = this.cells.get(key);
        if (list) list.push(segment); else this.cells.set(key, [segment]);
      }
    }
  }
  /** The distance to the nearest segment, or `reach` when none is nearer. */
  distance(x: number, z: number, reach: number): number {
    let best = reach * reach;
    const span = Math.ceil(reach);
    const cx = Math.floor(x), cz = Math.floor(z);
    for (let dz = -span; dz <= span; dz++) {
      for (let dx = -span; dx <= span; dx++) {
        const list = this.cells.get((cz + dz + 64) * 65536 + (cx + dx + 32768));
        if (!list) continue;
        for (const [ax, az, bx, bz] of list) {
          const ex = bx - ax, ez = bz - az, length = ex * ex + ez * ez;
          const t = length > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / length)) : 0;
          const px = ax + ex * t - x, pz = az + ez * t - z;
          const d = px * px + pz * pz;
          if (d < best) best = d;
        }
      }
    }
    return Math.sqrt(best);
  }
}

function centreOf(tile: SeaTile): { x: number; z: number } {
  return { x: ROOT3 * (tile.col + (tile.row % 2) * 0.5), z: tile.row * 1.5 };
}

/** The hex edge facing direction `d` (0 is +x, counting toward +z), as a segment. */
function edgeOf(tile: SeaTile, d: number): Segment {
  const c = centreOf(tile);
  const a = (d - 0.5) * Math.PI / 3, b = (d + 0.5) * Math.PI / 3;
  return [c.x + Math.cos(a), c.z + Math.sin(a), c.x + Math.cos(b), c.z + Math.sin(b)];
}

/** A free coast's waterline (`freeCoast.js`): the distance to it, positive on the water. */
export interface FreeCoastField {
  distance(tile: SeaTile, x: number, z: number, reach: number): number;
}

export interface SeaField {
  /** The three numbers for a point on the water sheet of `tile`. */
  sample(tile: SeaTile, x: number, z: number): [number, number, number];
  /** Writes `paintedWater` on a geometry that belongs to `tile`. */
  attribute(geometry: BufferGeometry, tile: SeaTile): void;
}

/**
 * Builds the field for a prepared map. `wraps` says the map is a cylinder; the
 * segments near the seam are then filed again one period to each side, so a
 * distance is measured across the seam as it is anywhere else.
 */
export function createSeaField(map: SeaMap, options: { shoreReach: number; edgeReach: number; wraps: boolean; coast?: FreeCoastField | null; cutRivers?: boolean }): SeaField {
  const { shoreReach, edgeReach, wraps } = options;
  const coast = options.coast ?? null, cutRivers = options.cutRivers ?? true;
  const period = ROOT3 * map.width;
  const shores = new SegmentGrid(), edges = new SegmentGrid(), rivers = new SegmentGrid();
  const file = (grid: SegmentGrid, segment: Segment, reach: number): void => {
    grid.add(segment);
    if (!wraps) return;
    const [ax, az, bx, bz] = segment;
    if (Math.min(ax, bx) < reach + 2) grid.add([ax + period, az, bx + period, bz]);
    if (Math.max(ax, bx) > period - reach - 2) grid.add([ax - period, az, bx - period, bz]);
  };
  for (const tile of map.tiles) {
    for (let d = 0; d < 6; d++) {
      const other = neighbour(tile, map, d);
      if (!other) continue;
      if (isWater(tile) && !isWater(other)) file(shores, edgeOf(tile, d), shoreReach);
      if (tile.terrain === 'ocean' && (other.terrain === 'coast' || other.terrain === 'lake')) file(edges, edgeOf(tile, d), edgeReach);
      if (!isWater(tile) && !isWater(other) && ((tile.riverEdges ?? 0) & (1 << d))) file(rivers, edgeOf(tile, d), shoreReach);
    }
  }

  // How many hexes each water hex is from land: a breadth-first walk out from
  // every land hex. Land is 0, the first ring of water 1, and so on.
  const steps = new Float32Array(map.tiles.length).fill(Infinity);
  let frontier: number[] = [];
  map.tiles.forEach((tile, i) => { if (!isWater(tile)) { steps[i] = 0; frontier.push(i); } });
  while (frontier.length) {
    const next: number[] = [];
    for (const i of frontier) {
      const tile = map.tiles[i]!;
      for (let d = 0; d < 6; d++) {
        const other = neighbour(tile, map, d);
        if (!other) continue;
        const j = other.row * map.width + other.col;
        if (steps[j]! > steps[i]! + 1) { steps[j] = steps[i]! + 1; next.push(j); }
      }
    }
    frontier = next;
  }
  const stepsAt = (tile: SeaTile | null, fallback: number): number => {
    if (!tile) return fallback;
    const value = steps[tile.row * map.width + tile.col]!;
    return Number.isFinite(value) ? value : fallback;
  };

  function deepAt(tile: SeaTile, x: number, z: number): number {
    if (tile.terrain === 'lake') return LAKE;
    const c = centreOf(tile);
    const own = stepsAt(tile, 1);
    const dx = x - c.x, dz = z - c.z;
    // The sector of the hex fan the point lies in: the edge facing direction d.
    const d = ((Math.round(Math.atan2(dz, dx) / (Math.PI / 3)) % 6) + 6) % 6;
    const corner = (k: number): { x: number; z: number; value: number } => {
      // The corner between directions k and k + 1, where three hexes meet.
      const a = (k + 0.5) * Math.PI / 3;
      const one = stepsAt(neighbour(tile, map, k), own), two = stepsAt(neighbour(tile, map, (k + 1) % 6), own);
      return { x: Math.cos(a), z: Math.sin(a), value: (own + one + two) / 3 };
    };
    const p = corner((d + 5) % 6), q = corner(d);
    // Barycentric weights in the triangle (centre, p, q).
    const det = p.x * q.z - q.x * p.z;
    if (Math.abs(det) < 1e-9) return own;
    const u = (dx * q.z - q.x * dz) / det, v = (p.x * dz - dx * p.z) / det;
    const w = Math.max(0, 1 - u - v);
    return w * own + Math.max(0, u) * p.value + Math.max(0, v) * q.value;
  }

  /** With a free coast, the water under a land hex is open sea out to the waterline: is the water nearest this point a lake? */
  function besideLake(tile: SeaTile, x: number, z: number): boolean {
    const c = centreOf(tile);
    const d = ((Math.round(Math.atan2(z - c.z, x - c.x) / (Math.PI / 3)) % 6) + 6) % 6;
    for (const turn of [0, 1, 5, 2, 4, 3]) {
      const other = neighbour(tile, map, (d + turn) % 6);
      if (isWater(other)) return other!.terrain === 'lake';
    }
    return false;
  }

  function sample(tile: SeaTile, x: number, z: number): [number, number, number] {
    if (coast) {
      // The shore is the free waterline, on the water of a land hex as on a water hex.
      const shore = coast.distance(tile, x, z, shoreReach);
      if (!isWater(tile)) {
        if (cutRivers && rivers.distance(x, z, shoreReach) < Math.abs(shore)) return [RIVER, -edgeReach, 0];
        return [shore, -edgeReach, besideLake(tile, x, z) ? LAKE : deepAt(tile, x, z)];
      }
      let edge = -edgeReach;
      if (tile.terrain === 'ocean') edge = edges.distance(x, z, edgeReach);
      else if (tile.terrain === 'coast') edge = -edges.distance(x, z, edgeReach);
      return [shore, edge, deepAt(tile, x, z)];
    }
    if (!isWater(tile)) {
      const shore = shores.distance(x, z, shoreReach);
      const river = rivers.distance(x, z, shoreReach);
      if (river < shore) return [RIVER, -edgeReach, 0];
      return [-shore, -edgeReach, 0];
    }
    const shore = shores.distance(x, z, shoreReach);
    let edge = -edgeReach;
    if (tile.terrain === 'ocean') edge = edges.distance(x, z, edgeReach);
    else if (tile.terrain === 'coast') edge = -edges.distance(x, z, edgeReach);
    return [shore, edge, deepAt(tile, x, z)];
  }

  return {
    sample,
    attribute(geometry, tile) {
      const position = geometry.getAttribute('position');
      const values = new Float32Array(position.count * 3);
      // With a free coast, the only sea on a land hex is its own water sheet
      // (`coastWater` marks it). Any other water there is a river's, and keeps the river's paint.
      // So does a piece that carries its own colour, such as the foam ring round a rock (`keepPaint`).
      const river = !!geometry.userData.keepPaint || (!!coast && !isWater(tile) && !geometry.userData.seaSheet);
      for (let i = 0; i < position.count; i++) values.set(river ? [RIVER, -edgeReach, 0] : sample(tile, position.getX(i), position.getZ(i)), i * 3);
      // The water painter's brushed coast-to-ocean edge, where it marked the
      // fragments: a fragment's kind decides which side of the edge it is on,
      // so the colours swap at the stroke's outline and not on the hex line.
      const kind = geometry.getAttribute('seaKind');
      if (kind) {
        if (isWater(tile) && tile.terrain !== 'lake') {
          for (let i = 0; i < position.count; i++) values[i * 3 + 1] = kind.getX(i) > .5 ? edgeReach : -edgeReach;
        }
        geometry.deleteAttribute('seaKind');
      }
      geometry.setAttribute('paintedWater', new BufferAttribute(values, 3));
    },
  };
}
