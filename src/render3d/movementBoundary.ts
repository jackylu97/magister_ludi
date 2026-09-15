/**
 * The movement range's ink: the outline of where the selected piece may walk.
 *
 * It is drawn as *loops*, not as edges. The frontier of a set of hexes is always
 * a union of closed rings — a hex vertex is shared by exactly three cells, so a
 * boundary vertex always has exactly two boundary edges at it and the walk from
 * one edge to the next is never ambiguous. Tracing those rings first and
 * extruding each one afterwards is what makes the corners *join*: the ring's
 * corner is computed once, both segments meeting there use that one point, and a
 * mitre carries the ribbon's two rails round it. There is nothing left to
 * mis-align — no per-edge quad to end short, no round cap to sit off the line.
 *
 * The height is the other half of the join, and the harder half. The painted
 * board is real terrain, so the ink has to drape on it, but a downward ray at
 * *exactly* a hex vertex falls through the seam where the terrain's own
 * triangles meet and reports the paper far below (measured: 0.040 against a
 * plateau at 0.120 — nearly twice the ink's whole width — with every sample a
 * hundredth of a hex away reading the plateau correctly). That one bad reading
 * used to be the hub of both round joins at every corner. So a station's height
 * is read as the *highest* of a small rosette rather than a single ray: a seam
 * can only ever read low, never high. A station the terrain does not answer for
 * at all takes the line between the stations that did, around the ring — never
 * the tile's own centre height, which on a hill stood a quarter of a hex above
 * the line it was meant to close.
 *
 * Both rails of a cross-section take the *centreline's* height, and every
 * station sits on the centreline, so the reading does not depend on the ribbon's
 * width: the backing strip and the ink strip are sampled at the same points and
 * come out at the same heights, and the dark backing can no longer peek out of
 * a joint the pale ink failed to reach.
 *
 * Determinism (hard rule 4): the rings are traced from the edge list sorted by
 * tile index then side, and nothing here consults a Map's iteration order for an
 * outcome.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { HEX_DIRECTIONS } from '../sim/hex';
import { axialToOffset, getTileAt, offsetToAxial, type GameMap } from '../sim/map';
import { cellCenter, tileTopY } from './layout';
import { VIEW3D } from './lookData';
import { samplePaintedWorld } from './paintedSurface';

type Cell = { col: number; row: number };
export interface MovementEdge { cell: Cell; side: number }

/** A point on the frontier's centreline, with the ground under it. */
export interface FrontierStation { x: number; z: number; y: number }
/** One closed ring of the frontier. The last station joins back to the first. */
export interface FrontierLoop { stations: FrontierStation[] }

const RADIUS = VIEW3D.board.hexRadius;
/** Stations per hex edge. Enough for the ink to bend over a hill's shoulder. */
const STATIONS_PER_EDGE = 4;
/**
 * How far off a station the rosette looks. A hundredth of a hex: wide enough to
 * step over the terrain's own zero-width seam at a vertex, narrow enough that
 * the reading is still the ground the ink is standing on.
 */
const ROSETTE = RADIUS * 0.01;
/** A mitre at a corner sharper than this is bevelled instead of run out to a spike. */
const MITRE_LIMIT = 2;

const wrap6 = (side: number): number => ((side % 6) + 6) % 6;

/** The frontier of the supplied movement set, including holes and cylindrical wrap. */
export function movementEdges(map: GameMap, cells: readonly Cell[], origin?: Cell | null): MovementEdge[] {
  const region = new Map<number, Cell>();
  // No range means no boundary, even if a spent unit remains selected.
  if (!cells.length) return [];
  for (const cell of [...cells, ...(origin ? [origin] : [])]) {
    const tile = getTileAt(map, cell.col, cell.row);
    if (tile) region.set(tile.row * map.width + tile.col, tile);
  }
  const edges: MovementEdge[] = [];
  for (const cell of region.values()) {
    const hex = offsetToAxial(cell.col, cell.row);
    HEX_DIRECTIONS.forEach((d, side) => {
      const next = axialToOffset({ q: hex.q + d.q, r: hex.r + d.r });
      const tile = getTileAt(map, next.col, next.row);
      if (!tile || !region.has(tile.row * map.width + tile.col)) edges.push({ cell, side });
    });
  }
  return edges;
}

/**
 * A step of the boundary walk. `worldCol` is the *unwrapped* column: a ring that
 * straddles the seam keeps counting past it, so the ring is drawn as one
 * continuous line in one copy of the board rather than leaping the map's width,
 * and the overlay's east and west copies cover the rest.
 */
interface Step { col: number; row: number; worldCol: number; side: number }

/** World position of a cell's corner `k` — the corner edge `k` starts at. */
function cornerAt(worldCol: number, row: number, k: number): { x: number; z: number } {
  const center = cellCenter(worldCol, row);
  const angle = ((wrap6(k) * 60 - 30) * Math.PI) / 180;
  return { x: center.x + Math.cos(angle) * RADIUS, z: center.z + Math.sin(angle) * RADIUS };
}

/**
 * Walk the boundary edges into closed rings.
 *
 * The rule at a corner: the edge ending at it is `(cell, side)`, and the three
 * cells around that corner are `cell`, its neighbour across `side`, and its
 * neighbour across `side + 1`. If that last one is outside the region then
 * `(cell, side + 1)` is the next boundary edge; otherwise the walk hands over to
 * it, where the same corner is the start of `side + 5`. One of the two always
 * answers — the third cell is outside the region by the current edge's own
 * existence — so there is no ambiguity to resolve and no vertex where four
 * boundary edges meet.
 */
function traceLoops(map: GameMap, edges: readonly MovementEdge[]): Step[][] {
  const key = (col: number, row: number, side: number): number => (row * map.width + col) * 6 + wrap6(side);
  const present = new Set<number>();
  const starts: MovementEdge[] = [...edges].sort((a, b) =>
    key(a.cell.col, a.cell.row, a.side) - key(b.cell.col, b.cell.row, b.side));
  for (const edge of starts) present.add(key(edge.cell.col, edge.cell.row, edge.side));

  const walked = new Set<number>();
  const loops: Step[][] = [];
  for (const edge of starts) {
    if (walked.has(key(edge.cell.col, edge.cell.row, edge.side))) continue;
    const loop: Step[] = [];
    let step: Step = { col: edge.cell.col, row: edge.cell.row, worldCol: edge.cell.col, side: edge.side };
    for (let guard = 0; guard <= edges.length; guard++) {
      const here = key(step.col, step.row, step.side);
      if (walked.has(here)) break;
      walked.add(here);
      loop.push(step);
      const turn = wrap6(step.side + 1);
      if (present.has(key(step.col, step.row, turn))) { step = { ...step, side: turn }; continue; }
      const hex = offsetToAxial(step.worldCol, step.row);
      const d = HEX_DIRECTIONS[turn]!;
      const next = axialToOffset({ q: hex.q + d.q, r: hex.r + d.r });
      const tile = getTileAt(map, next.col, next.row);
      if (!tile) break;
      step = { col: tile.col, row: tile.row, worldCol: next.col, side: wrap6(step.side + 5) };
      if (!present.has(key(step.col, step.row, step.side))) break;
    }
    if (loop.length) loops.push(loop);
  }
  return loops;
}

/** The highest ground in a small rosette, so a seam in the terrain reads as ground. */
function groundAt(map: GameMap, x: number, z: number): number | undefined {
  let best: number | undefined;
  for (const [dx, dz] of [[0, 0], [ROSETTE, 0], [-ROSETTE, 0], [0, ROSETTE], [0, -ROSETTE]] as const) {
    const y = samplePaintedWorld(map, x + dx, z + dz);
    if (y !== undefined && (best === undefined || y > best)) best = y;
  }
  return best;
}

/**
 * The frontier as closed rings of stations, each carrying the height the ink
 * stands at. Sampled once and extruded as many times as there are strips.
 */
export function movementFrontier(map: GameMap, edges: readonly MovementEdge[]): FrontierLoop[] {
  const loops: FrontierLoop[] = [];
  for (const walk of traceLoops(map, edges)) {
    const points: { x: number; z: number }[] = [];
    let floor = -Infinity;
    for (const step of walk) {
      const tile = getTileAt(map, step.col, step.row);
      if (tile) floor = Math.max(floor, tileTopY(tile));
      // The ring's corner belongs to this step alone: the step that arrives here
      // never emits it, so the two segments meeting at it share one point exactly.
      const from = cornerAt(step.worldCol, step.row, step.side);
      const to = cornerAt(step.worldCol, step.row, step.side + 1);
      for (let i = 0; i < STATIONS_PER_EDGE; i++) {
        const t = i / STATIONS_PER_EDGE;
        points.push({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t });
      }
    }
    const count = points.length;
    if (count < 3) continue;
    const sampled = points.map(p => groundAt(map, p.x, p.z));
    // A station the terrain does not answer for takes the line between the ones
    // that did, walking the ring both ways. A ring the terrain answers for
    // nowhere sits on the highest tile it encloses — flat, but never broken.
    const filled: number[] = new Array<number>(count);
    const anchored = sampled.some(y => y !== undefined);
    for (let i = 0; i < count; i++) {
      if (sampled[i] !== undefined) { filled[i] = sampled[i]!; continue; }
      if (!anchored) { filled[i] = floor; continue; }
      let back = 0, forward = 0;
      while (sampled[(i - back - 1 + count * (back + 2)) % count] === undefined) back++;
      while (sampled[(i + forward + 1) % count] === undefined) forward++;
      const a = sampled[(i - back - 1 + count * (back + 2)) % count]!;
      const b = sampled[(i + forward + 1) % count]!;
      filled[i] = a + (b - a) * ((back + 1) / (back + forward + 2));
    }
    loops.push({
      stations: points.map((p, i) => ({ x: p.x, z: p.z, y: filled[i]! + VIEW3D.overlay.lift })),
    });
  }
  return loops;
}

/**
 * One ribbon of the given width over the frontier's rings.
 *
 * Both rails take the station's own height, so a cross-section is level and two
 * strips of different widths agree everywhere. The corner is a bounded mitre:
 * a hex turns sixty degrees, so the ribbon runs about a seventh wider *through*
 * a corner, which is the price of a joint that actually closes.
 */
export function frontierRibbon(loops: readonly FrontierLoop[], width: number): BufferGeometry {
  const positions: number[] = [];
  const half = width / 2;
  for (const { stations } of loops) {
    const count = stations.length;
    const rails: number[][] = [];
    for (let i = 0; i < count; i++) {
      const here = stations[i]!, before = stations[(i - 1 + count) % count]!, after = stations[(i + 1) % count]!;
      const into = { x: here.x - before.x, z: here.z - before.z };
      const outof = { x: after.x - here.x, z: after.z - here.z };
      const li = Math.hypot(into.x, into.z), lo = Math.hypot(outof.x, outof.z);
      const ni = li > 1e-9 ? { x: -into.z / li, z: into.x / li } : null;
      const no = lo > 1e-9 ? { x: -outof.z / lo, z: outof.x / lo } : null;
      const a = ni ?? no, b = no ?? ni;
      if (!a || !b) { rails.push([here.x, here.y, here.z, here.x, here.y, here.z]); continue; }
      let mx = a.x + b.x, mz = a.z + b.z;
      const len = Math.hypot(mx, mz);
      // A reversal has no mitre to take; the incoming normal is the honest answer.
      if (len < 1e-9) { mx = a.x; mz = a.z; } else { mx /= len; mz /= len; }
      const reach = Math.min(1 / Math.max(mx * a.x + mz * a.z, 1e-6), MITRE_LIMIT) * half;
      rails.push([
        here.x + mx * reach, here.y, here.z + mz * reach,
        here.x - mx * reach, here.y, here.z - mz * reach,
      ]);
    }
    for (let i = 0; i < count; i++) {
      const p = rails[i]!, q = rails[(i + 1) % count]!;
      positions.push(
        p[0]!, p[1]!, p[2]!, p[3]!, p[4]!, p[5]!, q[0]!, q[1]!, q[2]!,
        p[3]!, p[4]!, p[5]!, q[3]!, q[4]!, q[5]!, q[0]!, q[1]!, q[2]!,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Joined, terrain-following ink. One shared buffer for the whole frontier. */
export function movementBoundaryGeometry(map: GameMap, edges: readonly MovementEdge[], width: number): BufferGeometry {
  return frontierRibbon(movementFrontier(map, edges), width);
}
