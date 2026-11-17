import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GameMap, Tile } from '../sim/map';
import type { GameState } from '../sim/state';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { playerColor, playerSecondaryColor, signTerritory } from './cities3d';
import { type FogLevels, levelAt } from './fog3d';
import { terraceFarmSurface } from './terraceFarmSurface';
import { VIEW3D } from './lookData';
import { hashSigned, hashUnit } from './hash';
import { signRoadCells } from './roads3d';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { centre, neighbour, surfaceHeight } from '../terrainStudy/surface.js';
// @ts-expect-error The pigment module is plain JavaScript with no declaration file.
import { terrainColors } from '../terrainStudy/terrainPigment.js';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
// @ts-expect-error Approved ground ribbons remain JavaScript.
import { marking, projectMarkings, roadRibbonPolygons } from '../terrainStudy/surfaceMarkings.js';
// @ts-expect-error Share the approved two-ink border dimensions.
import { TERRITORY_INSET, TERRITORY_PRIMARY_WIDTH, TERRITORY_SECONDARY_WIDTH } from '../terrainStudy/territoryPlan.js';

type Point = [number, number];
/**
 * A tint band's fade (the visual test version's border tint, switch 3): the
 * alpha is `alpha` at distance `from` from the line through `a` along the
 * inward `normal`, and falls to nothing at distance `to`.
 */
type Fade = { a: Point; normal: Point; from: number; to: number; alpha: number };
type Mark = { polygon: Point[]; color: Color; lift: number; /** One lift a corner, for a sloped band (`surfacePatch`). */ lifts?: number[]; /** One colour a corner of a free quad (a mark with `deck`), so a face can grade from one colour to another. */ tints?: Color[]; deck?: number; heights?: number[]; fade?: Fade; bounds: { minX: number; maxX: number; minZ: number; maxZ: number } };
export type GroundPlan = Map<number, Mark[]>;
const root3 = Math.sqrt(3), apothem = root3 / 2;
const corners: Point[] = [[1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1], [0, -2]];
const mod = (n: number, width: number): number => (n % width + width) % width;
const water = (tile: Tile): boolean => ['ocean', 'coast', 'lake'].includes(tile.terrain);

/**
 * The last plan drawn for a prepared map, and the fingerprint it was drawn from.
 *
 * A plan is a picture of the *map*, and a fog move is not a fact about the map —
 * but both layers are rebuilt on a fog move (a border survives on remembered
 * ground, so it has to follow the wash), and the plan walk was being repeated
 * every time to discover that not a tile had changed hands. The two fingerprints
 * are the board's own, the same ones the renderer already gates the rebuild on,
 * so the memo cannot disagree with the trigger: `signRoadCells` is presence per
 * cell, `signTerritory` is the ownership array and the towns it points at.
 *
 * Keyed on the prepared map by weak reference — a new board drops its plans with
 * it — and re-checked against the live `GameState` identity, because a second
 * game's first frame must not be handed the first game's borders.
 */
type PlanMemo = { state: GameState; signature: number; plan: GroundPlan; style?: string };
const roadPlans = new WeakMap<GameMap, PlanMemo>();
const territoryPlans = new WeakMap<GameMap, PlanMemo>();
const tintPlans = new WeakMap<GameMap, PlanMemo>();
const memoised = (memo: PlanMemo | undefined, state: GameState, signature: number, style?: string): GroundPlan | undefined =>
  memo && memo.state === state && memo.signature === signature && memo.style === style ? memo.plan : undefined;

/**
 * The visual test version's border (switch 3, `docs/flags.md` item (nnnnnnn)).
 *
 * Why there were red lines inside an empire: they were never per-city borders
 * or worked-hex marks. An empire's land has gaps. Each town's border grows hex
 * by hex, and the hexes between two towns are often nobody's for a long time:
 * holes closed on every side, and narrow bays open to the outside at one end.
 * The old plan drew the full two-ink line round every gap, so a gap looked like
 * a border running through the middle of the empire.
 *
 * The new plan draws the strong line round the empire's *outline*
 * (`territoryRegion`): its own hexes, plus each hole of up to `holeMax` hexes,
 * plus each unowned hex with `fillNeighbours` or more of the empire's hexes
 * round it (asked `fillPasses` times, so a bay two hexes deep closes too). The
 * gaps inside the outline keep a thin faint line in the seat's colour
 * (`gapWidth`, `gapAlpha`), so the player can still see that a hex is not
 * theirs. A hex next to another seat's land is never filled.
 */
export interface BorderStyle {
  holeMax: number; fillNeighbours: number; fillPasses: number;
  tintWidth: number; tintAlpha: number; tintLift: number; gapWidth: number; gapAlpha: number;
  /** A soft band of the seat's colour round a gap, fading away from it into the owned land (the user, 2026-11-14: an enclosed open hex "renders poorly"). Nought draws none. */
  gapGlowWidth?: number; gapGlowAlpha?: number;
  /**
   * How the line is drawn (`BorderStyleKey` in `visualTest.ts`). `drape` lays it
   * over the relief. `ruled` and `wash` run it straight from corner to corner at
   * the hex's own height (`borderHeight`), `ruledLift` above it. `wash` swaps
   * the two-ink line for one thin ink line `inkWidth` wide and a watercolour
   * band `washWidth` wide, `washAlpha` strong at the line.
   */
  kind?: 'drape' | 'ruled' | 'wash';
  /**
   * With `level`, the draped style's two-ink line is not laid over the relief.
   * Each edge runs straight at the highest ground along that edge alone
   * (`edgeHeight`), so the line does not climb a hill's cliff and come back
   * down (the user, 2026-11-14: borders "look weird when overlapping with
   * hills"). On flat ground it lies where the draped line lay.
   */
  level?: boolean;
  ruledLift?: number; washWidth?: number; washAlpha?: number; inkWidth?: number;
}

/**
 * The height a ruled border stands at in each hex: the highest ground on the
 * ring the line runs round, so the relief inside the hex never cuts through
 * it. On flat land that is the land's own level; on a hill, the hill's
 * shoulder at the line; on a mountain, its base (the peaks are props). Where
 * two hexes along one line differ, the line ramps between them along the edge
 * next to the higher one, so it never breaks: from the game camera a ramp
 * reads as one ink line, where a vertical step reads as a gap.
 */
const borderHeights = new WeakMap<GameMap, Map<number, number>>();
/** The highest ground under one border edge, from end to end, a little inside its hex. */
function edgeHeight(prepared: GameMap, cell: number, a: Point, b: Point, normal: Point): number {
  const tile = prepared.tiles[cell]!, c = centre(tile) as { x: number; z: number }, period = Math.sqrt(3) * prepared.width;
  const inset = TERRITORY_INSET + TERRITORY_PRIMARY_WIDTH;
  let highest = -Infinity;
  for (let k = 0; k <= 8; k++) for (const back of [0, inset, inset * 2]) {
    let x = a[0] + (b[0] - a[0]) * k / 8 - normal[0] * back - c.x; const z = a[1] + (b[1] - a[1]) * k / 8 - normal[1] * back - c.z;
    x -= Math.round(x / period) * period;
    highest = Math.max(highest, surfaceHeight(tile, x * .97, z * .97) as number);
  }
  return highest;
}
/**
 * `edgeHeight` for one edge of a border plan, kept for each prepared map. An
 * edge's ends and normal are fixed by its hex and its side, so the height is a
 * fact of the board, like `borderHeight`. It is asked three times for each band
 * of each edge (the edge and the edges either side), and it samples the ground
 * twenty-seven times, so it was most of the border plan's time.
 */
const edgeHeights = new WeakMap<GameMap, Map<number, number>>();
function edgeHeightOf(prepared: GameMap, edge: Edge): number {
  let known = edgeHeights.get(prepared);
  if (!known) { known = new Map(); edgeHeights.set(prepared, known); }
  const key = edge.cell * 6 + edge.side;
  let height = known.get(key);
  if (height === undefined) { height = edgeHeight(prepared, edge.cell, edge.a, edge.b, edge.normal); known.set(key, height); }
  return height;
}
function borderHeight(prepared: GameMap, cell: number): number {
  let known = borderHeights.get(prepared);
  if (!known) { known = new Map(); borderHeights.set(prepared, known); }
  const cached = known.get(cell);
  if (cached !== undefined) return cached;
  const tile = prepared.tiles[cell]!, ring = apothem - TERRITORY_INSET - TERRITORY_PRIMARY_WIDTH / 2;
  let highest = -Infinity;
  for (let k = 0; k < 24; k++) {
    const angle = k * Math.PI / 12, face = Math.round(angle / (Math.PI / 3)) * Math.PI / 3;
    const r = ring / Math.cos(angle - face);
    highest = Math.max(highest, surfaceHeight(tile, Math.cos(angle) * r, Math.sin(angle) * r) as number);
  }
  known.set(cell, highest);
  return highest;
}

/**
 * The seat each hex's strong line is drawn for: its owner, or the seat whose
 * outline closes over it (see `BorderStyle`). Pure; exported for its test.
 */
export function territoryRegion(owner: readonly (number | undefined)[], prepared: GameMap, style: BorderStyle): (number | undefined)[] {
  let region = owner.slice();
  for (const [seat, cells] of territoryHoles(owner, prepared, style.holeMax)) for (const cell of cells) region[cell] = seat;
  for (let pass = 0; pass < style.fillPasses; pass++) {
    const next = region.slice();
    let changed = false;
    for (let cell = 0; cell < region.length; cell++) {
      if (region[cell] !== undefined) continue;
      const tile = prepared.tiles[cell]!;
      let seat: number | undefined, count = 0, mixed = false;
      for (let d = 0; d < 6; d++) {
        const other = neighbour(tile, prepared, d) as Tile | null;
        if (!other) continue;
        const around = region[other.row * prepared.width + other.col];
        if (around === undefined) continue;
        if (seat !== undefined && around !== seat) mixed = true;
        seat = around; count++;
      }
      // Next to two seats is a frontier, and a frontier is never filled.
      if (mixed || seat === undefined || count < style.fillNeighbours) continue;
      next[cell] = seat; changed = true;
    }
    region = next;
    if (!changed) break;
  }
  return region;
}

/** The holes in each seat's land, as cell sets. Pure; exported for its test. */
export function territoryHoles(owner: readonly (number | undefined)[], prepared: GameMap, holeMax: number): Map<number, Set<number>> {
  const holes = new Map<number, Set<number>>();
  // Every pocket holds at least one hex, so with no room for one there is nothing to walk.
  if (holeMax < 1) return holes;
  const seen = new Map<number, Set<number>>();
  const width = prepared.width;
  for (let cell = 0; cell < owner.length; cell++) {
    const seat = owner[cell];
    if (seat === undefined) continue;
    const tile = prepared.tiles[cell]!;
    for (let d = 0; d < 6; d++) {
      const other = neighbour(tile, prepared, d) as Tile | null;
      if (!other) continue;
      const start = other.row * width + other.col;
      if (owner[start] !== undefined) continue;
      let visited = seen.get(seat);
      if (!visited) { visited = new Set(); seen.set(seat, visited); }
      if (visited.has(start)) continue;
      // Walk the whole pocket once (a sea is one pocket, walked once a seat).
      // It is open if it is too big, reaches the top or bottom row, or meets
      // another seat's land.
      const pocket = [start], queue = [start];
      visited.add(start);
      let closed = true;
      while (queue.length) {
        const at = queue.pop()!, here = prepared.tiles[at]!;
        if (here.row === 0 || here.row === prepared.height - 1) closed = false;
        for (let k = 0; k < 6; k++) {
          const next = neighbour(here, prepared, k) as Tile | null;
          if (!next) { closed = false; continue; }
          const index = next.row * width + next.col;
          if (owner[index] === seat) continue;
          if (owner[index] !== undefined) { closed = false; continue; }
          if (visited.has(index)) continue;
          visited.add(index); pocket.push(index); queue.push(index);
        }
      }
      if (!closed || pocket.length > holeMax) continue;
      let set = holes.get(seat);
      if (!set) { set = new Set(); holes.set(seat, set); }
      for (const index of pocket) set.add(index);
    }
  }
  return holes;
}

/** Live road facts, with each cell owning only its half-links and junction. */
export function planPaintedRoads(state: GameState, prepared: GameMap, organic: OrganicRoadStyle | null = null): GroundPlan {
  const signature = signRoadCells(state);
  const styleKey = organic ? `organic:${JSON.stringify(organic)}` : undefined;
  const memo = memoised(roadPlans.get(prepared), state, signature, styleKey);
  if (memo) return memo;
  const plan = planRoadCells(state, prepared, organic, styleKey);
  roadPlans.set(prepared, { state, signature, plan, style: styleKey });
  return plan;
}

/**
 * The road plan, kept one hex at a time.
 *
 * A hex's road marks depend on the prepared tile under it and its neighbours
 * (fixed for a board), the style, and its links: which of its six neighbours
 * are paved land hexes. Nothing else in the state reaches them. So each hex's
 * marks are kept with the links they were drawn for, and a change plans again
 * only the hexes whose links moved: the hex that was paved or unpaved, and its
 * paved neighbours. Every other hex keeps the marks it had, the same objects.
 * Planning the whole map again took about 600 ms at a turn end at turn 130.
 *
 * The plan comes out in cell order, as a full plan does, because the ground
 * layer merges a region's ink in the order the plan lists it.
 * `test/render/paintedRoadPlan.test.ts` holds the output equal to a full plan
 * over a road laid, a road pillaged, a town founded and a change of owner.
 */
type RoadCells = { map: GameMap; style: string | undefined; cells: Map<number, { links: number; marks: Mark[] }> };
const roadCells = new WeakMap<GameMap, RoadCells>();

/** The links of a paved land hex, one bit for each direction; -1 for a hex that draws no road. */
function roadLinks(state: GameState, prepared: GameMap, cell: number): number {
  const original = state.map.tiles[cell]!;
  if (original.road === undefined || water(original)) return -1;
  const tile = prepared.tiles[cell]!;
  let links = 0;
  for (let d = 0; d < 6; d++) {
    const other = neighbour(tile, prepared, d) as Tile | null;
    if (!other) continue;
    const next = state.map.tiles[other.row * prepared.width + other.col]!;
    if (next.road !== undefined && !water(next)) links |= 1 << d;
  }
  return links;
}

function planRoadCells(state: GameState, prepared: GameMap, organic: OrganicRoadStyle | null, style: string | undefined): GroundPlan {
  let kept = roadCells.get(prepared);
  // A new map or a new style keeps nothing: the marks were drawn for another.
  if (!kept || kept.map !== state.map || kept.style !== style) {
    kept = { map: state.map, style, cells: new Map() };
    roadCells.set(prepared, kept);
  }
  const links: [cell: number, links: number][] = [], stale: number[] = [];
  for (let cell = 0; cell < state.map.tiles.length; cell++) {
    const mask = roadLinks(state, prepared, cell);
    if (mask < 0) continue;
    links.push([cell, mask]);
    if (kept.cells.get(cell)?.links !== mask) stale.push(cell);
  }
  const fresh = organic ? planOrganicRoads(state, prepared, organic, stale) : planStraightRoads(state, prepared, stale);
  const result: GroundPlan = new Map(), cells = new Map<number, { links: number; marks: Mark[] }>();
  for (const [cell, mask] of links) {
    const marks = fresh.get(cell) ?? kept.cells.get(cell)!.marks;
    cells.set(cell, { links: mask, marks });
    result.set(cell, marks);
  }
  // Only the paved hexes stay, so a pillaged road leaves nothing behind.
  kept.cells = cells;
  return result;
}

/** The plain road plan (switch 5 off) for the listed cells: a straight spoke to each linked edge. */
function planStraightRoads(state: GameState, prepared: GameMap, cells: readonly number[]): GroundPlan {
  const result: GroundPlan = new Map();
  for (const cell of cells) {
    const original = state.map.tiles[cell]!, tile = prepared.tiles[cell]!;
    if (original.road === undefined || water(original)) continue;
    const c = centre(tile) as { x: number; z: number }, paths: Point[][] = [], decks: Mark[] = [];
    for (let d = 0; d < 6; d++) {
      const other = neighbour(tile, prepared, d) as Tile | null;
      if (!other) continue;
      const next = state.map.tiles[other.row * prepared.width + other.col]!;
      if (next.road === undefined || water(next)) continue;
      const angle = d * Math.PI / 3;
      paths.push([[c.x, c.z], [c.x + Math.cos(angle) * apothem, c.z + Math.sin(angle) * apothem]]);
      if ((tile.riverEdges ?? 0) & (1 << d)) {
        const dx = Math.cos(angle), dz = Math.sin(angle), start = apothem - .20;
        const deck = Math.max(surfaceHeight(tile, dx * start, dz * start), surfaceHeight(other, -dx * start, -dz * start)) as number;
        for (const [width, color, lift] of [[.14, '#a3977e', .016], [.114, '#c2b28f', .019]] as const) {
          const a: Point = [c.x + dx * start, c.z + dz * start], b: Point = [c.x + dx * apothem, c.z + dz * apothem];
          const nx = -dz * width / 2, nz = dx * width / 2;
          // Each bank owns half the crossing, preserving the fog boundary.
          const polygon: Point[] = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]];
          decks.push({ ...marking(polygon, color, lift), deck });
        }
      }
    }
    if (!paths.length) paths.push([[c.x, c.z]]);
    result.set(cell, [
      ...roadRibbonPolygons(paths, .14).map((p: Point[]) => marking(p, '#a3977e', .016)),
      ...roadRibbonPolygons(paths, .114).map((p: Point[]) => marking(p, '#c2b28f', .019)),
      ...decks,
    ]);
  }
  return result;
}

/** The organic roads' knobs: `visualTest.organicRoads` in `data/view3d.json`. */
export interface OrganicRoadStyle {
  /** How far a raised road's side runs out for each unit it falls. Absent, the side spans `raisedShoulder` over `raisedHeight`. */
  sideRun?: number;
  step: number; pull: number; wander: number; edgeShift: number; forkAt: number; forkPull: number;
  bedWidth: number; coreWidth: number; bed: string; core: string; capSides: number;
  shoulderWidth: number; shoulder: string; rutOffset: number; rutWidth: number; rut: string; crownWidth: number; crown: string; edgeWander: number;
  bridgeLength: number; bridgeWidth: number; bridge: string; rail: string; railWidth: number;
  /** A road with a 3D form: a flat top `raisedHeight` above the ground, with a sloped shoulder `raisedShoulder` wide on each side. The bridge is a deck `bridgeHeight` up with side faces and rails `railHeight` tall. */
  raised: boolean; raisedHeight: number; raisedShoulder: number; bridgeHeight: number; railHeight: number;
  /** Paving and kerbs on a raised road: the top changes tone every `slabSteps` samples by `slabShade`; a kerb stone stands on each edge every `kerbSteps` samples, less the share `kerbGaps`. */
  slabSteps: number; slabShade: number; kerbSteps: number; kerbGaps: number; kerbSize: number; kerbHeight: number; kerb: string;
}

/**
 * Organic roads: switch 5 of the visual test version (batch V1).
 *
 * The old plan drew a straight spoke from each road hex's centre to the middle
 * of each edge toward a roaded neighbour, so a junction read as a star. This
 * plan draws curves through the hexes a road links, and still owns only each
 * hex's half, so the fog and the ground layer's caches work as before:
 * - a road leaves each edge at a crossing point shared by the two hexes, moved
 *   along the edge by a small hashed amount, and leaves it square to the edge,
 *   so the two halves meet with the same direction and no kink;
 * - a hex with two links draws one curve between them; one link, a road that
 *   ends in a round cap; none, a small round patch;
 * - a hex with three or more links draws its straightest pair as the through
 *   road, and each other link as a branch that merges into it at a shallow
 *   angle, heading on toward the far end: a fork, not a hub;
 * - every curve wanders sideways a little, by a hash of its hex, and the
 *   wander is nothing at both ends;
 * - a link over a river edge gets a small plank bridge. The road crosses the
 *   edge square to it, so it meets the river at a right angle.
 * A road still reads as joined or not joined: a link is drawn exactly where the
 * old spoke was, and nowhere else.
 */
function planOrganicRoads(state: GameState, prepared: GameMap, style: OrganicRoadStyle, cells: readonly number[]): GroundPlan {
  const result: GroundPlan = new Map();
  const width = prepared.width;
  const bed = new Color(style.bed), core = new Color(style.core), plank = new Color(style.bridge), rail = new Color(style.rail);
  for (const cell of cells) {
    const original = state.map.tiles[cell]!, tile = prepared.tiles[cell]!;
    if (original.road === undefined || water(original)) continue;
    const c = centre(tile) as { x: number; z: number };
    const links: { d: number; at: Point; inward: Point; other: Tile }[] = [];
    for (let d = 0; d < 6; d++) {
      const other = neighbour(tile, prepared, d) as Tile | null;
      if (!other) continue;
      const otherCell = other.row * width + other.col, next = state.map.tiles[otherCell]!;
      if (next.road === undefined || water(next)) continue;
      const angle = d * Math.PI / 3, dx = Math.cos(angle), dz = Math.sin(angle);
      // One crossing point for both hexes: the shift is a hash of the pair and
      // runs along the edge in the lower cell's sense.
      const shift = hashSigned(Math.min(cell, otherCell), Math.max(cell, otherCell), 911) * style.edgeShift * (cell < otherCell ? 1 : -1);
      links.push({ d, other, inward: [-dx, -dz], at: [c.x + dx * apothem - dz * shift, c.z + dz * apothem + dx * shift] });
    }
    const curves: Point[][] = [], caps: Point[] = [];
    const lean = hashSigned(tile.col, tile.row, 921) * style.wander;
    const pull = style.pull * apothem;
    const along = (a: { at: Point; inward: Point }, b: { at: Point; inward: Point }): Point[] =>
      bezier(a.at, [a.at[0] + a.inward[0] * pull, a.at[1] + a.inward[1] * pull],
        [b.at[0] + b.inward[0] * pull, b.at[1] + b.inward[1] * pull], b.at, style.step, lean);
    if (links.length === 0) caps.push([c.x, c.z]);
    else if (links.length === 1) {
      // A road that ends here: into the hex, a little past its middle.
      const link = links[0]!, end: Point = [c.x - link.inward[0] * .08, c.z - link.inward[1] * .08];
      curves.push(bezier(link.at, [link.at[0] + link.inward[0] * pull, link.at[1] + link.inward[1] * pull], end, end, style.step, lean));
      caps.push(end);
    } else {
      // The straightest pair is the through road.
      let best: [number, number] = [0, 1], widest = -1;
      for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++) {
        const turn = Math.min(Math.abs(links[i]!.d - links[j]!.d), 6 - Math.abs(links[i]!.d - links[j]!.d));
        if (turn > widest) { widest = turn; best = [i, j]; }
      }
      const a = links[best[0]]!, b = links[best[1]]!, main = along(a, b);
      curves.push(main);
      for (let i = 0; i < links.length; i++) {
        if (i === best[0] || i === best[1]) continue;
        const branch = links[i]!;
        // Merge toward whichever end of the through road lies farther round.
        const away = (end: typeof a) => Math.min(Math.abs(branch.d - end.d), 6 - Math.abs(branch.d - end.d));
        const toB = away(b) >= away(a);
        const s = toB ? style.forkAt : 1 - style.forkAt, at = pointOn(main, s), ahead = pointOn(main, toB ? Math.min(1, s + .05) : Math.max(0, s - .05));
        const tx = ahead[0] - at[0], tz = ahead[1] - at[1], tl = Math.hypot(tx, tz) || 1;
        const reach = style.forkPull;
        curves.push(bezier(branch.at, [branch.at[0] + branch.inward[0] * pull, branch.at[1] + branch.inward[1] * pull],
          [at[0] - tx / tl * reach, at[1] - tz / tl * reach], at, style.step, 0));
      }
    }
    const marks: Mark[] = [];
    // A worn track, built from five stacked bands: a dusty shoulder where the
    // traffic has thinned the grass, the dark bed, the pale trodden core, two
    // wheel ruts and a thin crown between them. Each band's edge wanders by its
    // own amount, so the road has no ruled edge anywhere.
    const shoulder = new Color(style.shoulder), rut = new Color(style.rut), crown = new Color(style.crown);
    const bands: readonly [offset: number, half: number, color: Color, lift: number, wander: number, caps: boolean][] = [
      [0, style.shoulderWidth / 2, shoulder, .0145, style.edgeWander * 1.6, true],
      [0, style.bedWidth / 2, bed, .016, style.edgeWander, true],
      [0, style.coreWidth / 2, core, .019, style.edgeWander * .7, true],
      [style.rutOffset, style.rutWidth / 2, rut, .0205, style.edgeWander * .3, false],
      [-style.rutOffset, style.rutWidth / 2, rut, .0205, style.edgeWander * .3, false],
      [0, style.crownWidth / 2, crown, .021, style.edgeWander * .3, false],
    ];
    if (style.raised) {
      // A road with a form (2026-11-12): a flat top that stands above the
      // ground, and a sloped shoulder each side in the bed's darker colour, so
      // the road has a lit side and a shaded side like a low causeway.
      // The road is its own geometry with its own height (the user,
      // 2026-11-12: "can't we give the road a geometry and place it along the
      // hill?"). Along each curve the height is a taut line that never goes
      // below the ground, so the road climbs a terrace as one ramp and does
      // not step. Its sides reach down to the ground wherever it stands above.
      const top = style.raisedHeight, foot = .006, half = style.coreWidth / 2, wide = style.raisedShoulder;
      const groundAt = (p: Point): number => surfaceHeight(tile, p[0] - c.x, p[1] - c.z) as number;
      // A crossing point belongs to two hexes, so both must read one height there.
      const edgeHeight = new Map<Point, number>();
      // Between two hill hexes the ground dips at the shared edge. The road
      // spans the dip: at the crossing it stands at the lower of the two sides'
      // high ground near the edge. Both hexes compute the same figure.
      for (const link of links) {
        const oc = centre(link.other) as { x: number; z: number }, shift = Math.round((link.at[0] - oc.x) / (root3 * width)) * root3 * width;
        const otherAt = (p: Point): number => surfaceHeight(link.other, p[0] - oc.x - shift, p[1] - oc.z) as number;
        let here = -Infinity, there = -Infinity;
        for (let d = .04; d <= .36; d += .04) {
          here = Math.max(here, groundAt([link.at[0] + link.inward[0] * d, link.at[1] + link.inward[1] * d]));
          there = Math.max(there, otherAt([link.at[0] - link.inward[0] * d, link.at[1] - link.inward[1] * d]));
        }
        edgeHeight.set(link.at, Math.max(groundAt(link.at), otherAt(link.at), Math.min(here, there)));
      }
      const coreDeep = core.clone().multiplyScalar(style.slabShade), kerb = new Color(style.kerb), kerbSide = kerb.clone().multiplyScalar(.8);
      const quad = (polygon: Point[], heights: number[], color: Color, tints?: Color[]): void => { marks.push({ ...marking(polygon, '#ffffff', 0), color, deck: 0, heights, ...(tints ? { tints } : {}) } as Mark); };
      // A side grades from the bed's earth at the road's edge to the hex's own ground at its foot, so a ramp reads as a grassy bank.
      const turf = new Color((terrainColors as Record<string, string>)[tile.terrain] ?? style.bed).multiplyScalar(.9);
      let through: { points: Point[]; heights: number[] } | null = null;
      curves.forEach((curve, index) => {
        const last = curve.length - 1, ground = curve.map(groundAt), line = [...ground];
        line[0] = edgeHeight.get(curve[0]!) ?? ground[0]!;
        // A branch ends on the through road, at the through road's own height.
        let end = edgeHeight.get(curve[last]!) ?? ground[last]!;
        if (index > 0 && through && !edgeHeight.has(curve[last]!)) {
          let near = 0, best = Infinity;
          through.points.forEach((p, k) => { const d = Math.hypot(p[0] - curve[last]![0], p[1] - curve[last]![1]); if (d < best) { best = d; near = k; } });
          end = through.heights[near]!;
        }
        line[last] = end;
        for (let pass = 0; pass < 240; pass++) {
          for (let k = 1; k < last; k++) line[k] = Math.max(ground[k]!, (line[k - 1]! + line[k + 1]!) / 2);
          for (let k = last - 1; k > 0; k--) line[k] = Math.max(ground[k]!, (line[k - 1]! + line[k + 1]!) / 2);
        }
        // The taut line has a corner where it leaves the ground. A few passes
        // of smoothing round it, still never below the ground.
        for (let pass = 0; pass < 10; pass++) for (let k = 1; k < last; k++) line[k] = Math.max(ground[k]!, .25 * line[k - 1]! + .5 * line[k]! + .25 * line[k + 1]!);
        if (index === 0) through = { points: curve, heights: line };
        const normal = curve.map((_, k) => {
          const a = curve[Math.max(0, k - 1)]!, b = curve[Math.min(last, k + 1)]!, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
          return [-dz / l, dx / l] as Point;
        });
        const at = (k: number, across: number): Point => [curve[k]![0] + normal[k]![0] * across, curve[k]![1] + normal[k]![1] * across];
        // Each side falls from the road's edge at one fixed slope until it
        // meets the ground. With one slope everywhere, the four corners of a
        // side's face lie in one plane, so its two triangles take the same
        // light and the side shows no saw-tooth (the user, 2026-11-12:
        // "smoothing the triangles along the lateral side of the roads").
        // `sideRun` sets the slope outright: how far a side runs out for each unit it falls. A small number gives a near wall, so a road's ramp over a hill has a thin base (the user, 2026-11-13).
        const run = style.sideRun ?? wide / Math.max(.001, top - foot);
        const falls = [1, -1].map((side) => {
          let fall = curve.map((_, k) => {
            let t = Math.max(top - foot, line[k]! + top - ground[k]! - foot);
            for (let pass = 0; pass < 4; pass++) t = Math.max(top - foot, line[k]! + top - foot - groundAt(at(k, side * (half + t * run))));
            return t;
          });
          // The longest fall nearby, then smoothed, so the foot never hangs above the ground and never jumps.
          fall = fall.map((_, k) => Math.max(fall[Math.max(0, k - 2)]!, fall[Math.max(0, k - 1)]!, fall[k]!, fall[Math.min(last, k + 1)]!, fall[Math.min(last, k + 2)]!));
          for (let pass = 0; pass < 8; pass++) fall = fall.map((_, k) => .25 * fall[Math.max(0, k - 1)]! + .5 * fall[k]! + .25 * fall[Math.min(last, k + 1)]!);
          return fall;
        });
        const fallOf = (k: number, side: number): number => falls[side > 0 ? 0 : 1]![k]!;
        const reach = (k: number, side = 1): number => half + fallOf(k, side) * run;
        const footOf = (k: number, side: number): number => line[k]! + top - fallOf(k, side);
        for (let k = 0; k < last; k++) {
          const ha = line[k]! + top, hb = line[k + 1]! + top;
          // Paving: the top changes between two close tones every few steps, so the road reads as laid slabs.
          const slab = Math.floor(k / Math.max(1, style.slabSteps)), tone = hashUnit(tile.col * 31 + index, tile.row * 17 + slab, 931) > .5 ? core : coreDeep;
          quad([at(k, half), at(k + 1, half), at(k + 1, -half), at(k, -half)], [ha, hb, hb, ha], tone);
          for (const side of [1, -1]) quad([at(k, side * reach(k, side)), at(k + 1, side * reach(k + 1, side)), at(k + 1, side * half), at(k, side * half)],
            [footOf(k, side), footOf(k + 1, side), hb, ha], bed, [turf, turf, bed, bed]);
        }
        // Kerb stones: a small pale stone on each edge every few steps, set a little into the road.
        const every = Math.max(2, style.kerbSteps);
        for (let k = Math.floor(every / 2); k < last; k += every) for (const side of [1, -1]) {
          if (hashUnit(tile.col * 13 + k, tile.row * 7 + index, side > 0 ? 941 : 942) < style.kerbGaps) continue;
          const a = curve[Math.max(0, k - 1)]!, b = curve[Math.min(last, k + 1)]!, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
          const tx = dx / l * style.kerbSize / 2, tz = dz / l * style.kerbSize / 2, out = at(k, side * (half + style.kerbSize * .55)), inn = at(k, side * (half - style.kerbSize * .25));
          const low = line[k]! + top - .004, high = line[k]! + top + style.kerbHeight;
          const p0: Point = [inn[0] - tx, inn[1] - tz], p1: Point = [inn[0] + tx, inn[1] + tz], p2: Point = [out[0] + tx, out[1] + tz], p3: Point = [out[0] - tx, out[1] - tz];
          quad([p0, p1, p2, p3], [high, high, high, high], kerb);
          for (const [p, q] of [[p0, p1], [p1, p2], [p2, p3], [p3, p0]] as const) { quad([p, q, q, p], [low, low, high, high], kerbSide); quad([q, p, p, q], [low, low, high, high], kerbSide); }
        }
      });
      const disc = (x: number, z: number, radius: number): Point[] => Array.from({ length: style.capSides }, (_, i) => [x + Math.cos(i * 2 * Math.PI / style.capSides) * radius, z + Math.sin(i * 2 * Math.PI / style.capSides) * radius] as Point);
      for (const [x, z] of caps) {
        const level = groundAt([x, z]);
        marks.push({ ...marking(disc(x, z, half + wide), '#ffffff', foot), color: bed } as Mark);
        marks.push({ ...marking(disc(x, z, half), '#ffffff', 0), color: core, deck: level + top } as Mark);
      }
    } else
    for (const [offset, half, color, lift, wander, capped] of bands) {
      if (half <= 0) continue; // A band with no width is left out: the clean path has no shoulder, ruts or crown.
      for (const curve of curves) for (const polygon of ribbonQuads(curve, half, offset, wander)) marks.push({ ...marking(polygon, '#ffffff', lift), color } as Mark);
      if (capped) for (const [x, z] of caps) marks.push({ ...marking(Array.from({ length: style.capSides }, (_, i) => [x + Math.cos(i * 2 * Math.PI / style.capSides) * half, z + Math.sin(i * 2 * Math.PI / style.capSides) * half] as Point), '#ffffff', lift), color } as Mark);
    }
    // A plank bridge over each river edge a link crosses: this hex's half.
    for (const link of links) {
      if (!((tile.riverEdges ?? 0) & (1 << link.d))) continue;
      const dx = -link.inward[0], dz = -link.inward[1], start = apothem - .20;
      const deck = Math.max(surfaceHeight(tile, dx * start, dz * start) as number, surfaceHeight(link.other, -dx * start, -dz * start) as number);
      const from: Point = [link.at[0] - dx * style.bridgeLength / 2, link.at[1] - dz * style.bridgeLength / 2];
      const strip = (offset: number, half: number, color: Color, lift: number): void => {
        const nx = -dz, nz = dx;
        const polygon: Point[] = [[from[0] + nx * (offset - half), from[1] + nz * (offset - half)], [link.at[0] + nx * (offset - half), link.at[1] + nz * (offset - half)],
          [link.at[0] + nx * (offset + half), link.at[1] + nz * (offset + half)], [from[0] + nx * (offset + half), from[1] + nz * (offset + half)]];
        marks.push({ ...marking(polygon, '#ffffff', lift), color, deck } as Mark);
      };
      if (style.raised) {
        // A bridge with a form: a deck above the river's banks, with a face
        // down each side and a rail that stands on each edge.
        const nx = -dz, nz = dx;
        const box = (offset: number, half: number, low: number, high: number, color: Color): void => {
          const corner = (end: Point, across: number): Point => [end[0] + nx * across, end[1] + nz * across];
          const a0 = corner(from, offset - half), a1 = corner(link.at, offset - half), b1 = corner(link.at, offset + half), b0 = corner(from, offset + half);
          const quad = (polygon: Point[], heights: number[]): void => { marks.push({ ...marking(polygon, '#ffffff', 0), color, deck: 0, heights } as Mark); };
          quad([a0, a1, b1, b0], [high, high, high, high]);
          // Each side face twice, once each way round, so it shows from both sides.
          for (const [p, q] of [[a0, a1], [b0, b1], [a0, b0]] as const) { quad([p, q, q, p], [low, low, high, high]); quad([q, p, p, q], [low, low, high, high]); }
        };
        const deckTop = deck + style.bridgeHeight, edge = style.bridgeWidth / 2 - style.railWidth / 2;
        box(0, style.bridgeWidth / 2, deck, deckTop, plank);
        for (const side of [-1, 1]) box(side * edge, style.railWidth / 2, deckTop, deckTop + style.railHeight, rail);
        continue;
      }
      strip(0, style.bridgeWidth / 2, plank, .022);
      for (const side of [-1, 1]) strip(side * (style.bridgeWidth / 2 - style.railWidth / 2), style.railWidth / 2, rail, .025);
    }
    result.set(cell, marks);
  }
  return result;
}

/** A cubic curve, sampled about `step` apart, pushed sideways by `lean` in its middle. */
function bezier(p0: Point, p1: Point, p2: Point, p3: Point, step: number, lean: number): Point[] {
  const at = (t: number): Point => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  };
  const rough = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
  const count = Math.max(2, Math.ceil(rough / step));
  const points = Array.from({ length: count + 1 }, (_, i) => at(i / count));
  if (!lean) return points;
  // Sideways by sin² of the way along: nothing, and no turn, at either end.
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]!, b = points[Math.min(points.length - 1, i + 1)]!;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, w = Math.sin(Math.PI * i / count) ** 2 * lean;
    return [p[0] - dz / l * w, p[1] + dx / l * w] as Point;
  });
}

/** The point a fraction `s` of the way along a sampled curve, by sample count. */
function pointOn(points: readonly Point[], s: number): Point {
  const f = Math.max(0, Math.min(1, s)) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f)), t = f - i;
  const a = points[i]!, b = points[i + 1]!;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Quads `half` either side of a sampled curve, mitred at each sample so they
 * join. `offset` moves the band sideways (a wheel rut). `wander` makes each
 * edge drift in and out by that share of `half`: two slow waves read from the
 * sample's own place, so the two edges differ and no stretch repeats. The drift
 * fades to nothing at both ends of the curve, where the next hex's band meets it.
 */
function ribbonQuads(points: readonly Point[], half: number, offset = 0, wander = 0): Point[][] {
  const last = points.length - 1;
  const normals = points.map((_, i) => {
    const a = points[Math.max(0, i - 1)]!, b = points[Math.min(last, i + 1)]!;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l] as Point;
  });
  const drift = (p: Point, i: number, side: number): number => {
    if (!wander) return half;
    const fade = Math.sin(Math.PI * i / Math.max(1, last));
    const wave = Math.sin(p[0] * 17.3 + p[1] * 9.1 + side * 2.1) * .6 + Math.sin(p[0] * 6.7 - p[1] * 21.9 + side * 5.3) * .4;
    return half * (1 + wave * wander * fade);
  };
  const edges = points.map((p, i) => {
    const n = normals[i]!, left = offset + drift(p, i, 1), right = offset - drift(p, i, -1);
    return [[p[0] + n[0] * left, p[1] + n[1] * left] as Point, [p[0] + n[0] * right, p[1] + n[1] * right] as Point] as const;
  });
  const quads: Point[][] = [];
  for (let i = 0; i < last; i++) quads.push([edges[i]![0], edges[i + 1]![0], edges[i + 1]![1], edges[i]![1]]);
  return quads;
}

type Edge = { cell: number; owner: number; /** Which of the hex's six edges, 0 to 5. */ side: number; a: Point; b: Point; ka: number; kb: number; normal: Point };

/**
 * The border plans, kept one edge at a time.
 *
 * A border edge's marks depend on the board (fixed), the style, the seats of
 * the hexes near it and the seats' inks. So each plan keeps, for each edge, the
 * marks it handed out and the hexes they went to, with the owner and outline
 * arrays the plan was drawn from. The next plan compares those arrays with the
 * new ones, and plans again only the edges near a hex whose seat changed
 * (`BORDER_REACH`). Every other edge hands out the very marks it handed out
 * before. The plan is put together edge by edge in the order a full plan walks
 * them, so its hexes, their order and the order of each hex's marks are a full
 * plan's: the ground layer merges a region's ink in that order.
 * `test/render/paintedBorderPlan.test.ts` holds the output equal to a full plan
 * over several changes. A full plan took about 570 ms at a turn end at turn 130.
 */
type Handed = [cell: number, mark: Mark][];
type BorderKept = {
  map: GameMap; players: GameState['players']; style: string | undefined;
  owner: readonly (number | undefined)[]; region: readonly (number | undefined)[];
  edges: Map<number, Handed>;
};
type BorderKeeping = { kept: BorderKept; last: BorderKept | null; near: Set<number> | null };
const borderLines = new WeakMap<GameMap, BorderKept>();
const borderTints = new WeakMap<GameMap, BorderKept>();

/**
 * How many hexes from a hex whose seat changed an edge's marks can move. An
 * edge reads the seats of its own hex and of the hexes round its two corners
 * (one hex away), and a draped band is handed to each hex of its seat that its
 * bounds cross, which `spread` looks for up to three hexes away. Four leaves a
 * hex to spare.
 */
const BORDER_REACH = 4;

/**
 * Starts a kept plan for the arrays given. With the last plan for the same map,
 * players and style, it also says which hexes are near a change; with none,
 * `near` is null and every edge is planned.
 */
function keepBorder(store: WeakMap<GameMap, BorderKept>, prepared: GameMap, state: GameState, style: string | undefined,
  owner: readonly (number | undefined)[], region: readonly (number | undefined)[]): BorderKeeping {
  const before = store.get(prepared);
  const kept: BorderKept = { map: state.map, players: state.players, style, owner, region, edges: new Map() };
  store.set(prepared, kept);
  if (!before || before.map !== state.map || before.players !== state.players || before.style !== style) return { kept, last: null, near: null };
  let frontier: number[] = [];
  for (let cell = 0; cell < owner.length; cell++) if (owner[cell] !== before.owner[cell] || region[cell] !== before.region[cell]) frontier.push(cell);
  const near = new Set(frontier);
  for (let ring = 0; ring < BORDER_REACH && frontier.length; ring++) {
    const next: number[] = [];
    for (const cell of frontier) for (let d = 0; d < 6; d++) {
      const other = neighbour(prepared.tiles[cell]!, prepared, d) as Tile | null;
      if (!other) continue;
      const index = other.row * prepared.width + other.col;
      if (!near.has(index)) { near.add(index); next.push(index); }
    }
    frontier = next;
  }
  return { kept, last: before, near };
}

/**
 * Hands one edge's marks to the plan: the ones it handed last time when no hex
 * near it changed seat, else the ones `make` hands now. `set` tells apart the
 * edge lists one plan walks (the lines, the pockets, the gaps).
 */
function handOut(result: GroundPlan, edge: Edge, set: number, prepared: GameMap, keeping: BorderKeeping,
  make: (hand: (cell: number, mark: Mark) => void) => void): void {
  const key = (set * prepared.tiles.length + edge.cell) * 6 + edge.side;
  let handed = keeping.last && keeping.near && !keeping.near.has(edge.cell) ? keeping.last.edges.get(key) : undefined;
  if (!handed) { const fresh: Handed = []; make((cell, mark) => { fresh.push([cell, mark]); }); handed = fresh; }
  keeping.kept.edges.set(key, handed);
  for (const [cell, mark] of handed) { const marks = result.get(cell) ?? []; marks.push(mark); result.set(cell, marks); }
}
/** Integer vertex identity joins concave corners and the cylindrical wrap seam. */
export function planPaintedTerritory(state: GameState, prepared: GameMap, style: BorderStyle | null = null): GroundPlan {
  const signature = signTerritory(state);
  const styleKey = style ? `outline:${style.level ? 'level:' : ''}${style.holeMax}:${style.fillNeighbours}:${style.fillPasses}:${style.kind ?? 'drape'}:${style.ruledLift}:${style.inkWidth}` : undefined;
  const memo = memoised(territoryPlans.get(prepared), state, signature, styleKey);
  if (memo) return memo;
  const cityOwners = new Map(state.cities.map(city => [city.id, city.ownerId]));
  const owner = state.tileOwner.map(id => id == null ? undefined : cityOwners.get(id));
  // The seat each hex's line is drawn for. Without the visual test style this
  // is the owner, exactly as before; with it, the outline (`territoryRegion`).
  const region = style ? territoryRegion(owner, prepared, style) : owner;
  // The identity is a *number* rather than the string it reads as: one vertex is
  // asked for on every edge of every owned hex, and the rail joins are looked up
  // twice more each. The lattice is finite and small — two columns and three rows
  // per hex, plus the seat — so the whole of it fits in one integer, and the two
  // maps stop allocating a key per corner.
  const columns = 2 * prepared.width, rows = 3 * prepared.height + 4;
  const vertexKey = (tile: Tile, corner: number, seat: number): number => {
    const [u, v] = corners[corner]!;
    return (seat * rows + (3 * tile.row + v! + 2)) * columns + mod(2 * tile.col + tile.row % 2 + u!, columns);
  };
  /** The edges of `inside`'s hexes where `outside` says the neighbour is not the same seat. */
  const collect = (inside: readonly (number | undefined)[], open: (seat: number, other: number | null) => boolean): EdgeSet => {
    const set: EdgeSet = { edges: [], incoming: new Map(), outgoing: new Map() };
    for (let cell = 0; cell < inside.length; cell++) {
      const seat = inside[cell]; if (seat === undefined) continue;
      const tile = prepared.tiles[cell]!, c = centre(tile) as { x: number; z: number };
      for (let d = 0; d < 6; d++) {
        const other = neighbour(tile, prepared, d) as Tile | null;
        if (!open(seat, other ? other.row * prepared.width + other.col : null)) continue;
        const [u, v] = corners[d]!, [uu, vv] = corners[(d + 1) % 6]!;
        const a: Point = [c.x + u * apothem, c.z + v / 2], b: Point = [c.x + uu * apothem, c.z + vv / 2];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const edge: Edge = { cell, owner: seat, side: d, a, b, ka: vertexKey(tile, d, seat), kb: vertexKey(tile, (d + 1) % 6, seat),
          normal: [-(b[1] - a[1]) / length, (b[0] - a[0]) / length] };
        set.edges.push(edge); set.outgoing.set(edge.ka, edge); set.incoming.set(edge.kb, edge);
      }
    }
    return set;
  };
  const lines = collect(region, (seat, other) => other === null || region[other] !== seat);
  const result: GroundPlan = new Map();
  const offsets = [TERRITORY_INSET, TERRITORY_INSET + TERRITORY_PRIMARY_WIDTH, TERRITORY_INSET + TERRITORY_PRIMARY_WIDTH + TERRITORY_SECONDARY_WIDTH] as number[];
  const ruled = style?.kind === 'ruled' || style?.kind === 'wash';
  const inked = style?.kind === 'wash' ? [TERRITORY_INSET, TERRITORY_INSET + (style.inkWidth ?? .03)] : offsets;
  const keeping = keepBorder(borderLines, prepared, state, styleKey, owner, region);
  for (const edge of lines.edges) handOut(result, edge, 0, prepared, keeping, hand => {
    const previous = lines.incoming.get(edge.ka)!, next = lines.outgoing.get(edge.kb)!;
    const a = inked.map(d => rail(edge.a, previous.normal, edge.normal, d));
    const b = inked.map(d => rail(edge.b, edge.normal, next.normal, d));
    const colors = style?.kind === 'wash' ? [playerColor(state, edge.owner)] : [playerColor(state, edge.owner), playerSecondaryColor(state, edge.owner)];
    for (let band = 0; band < colors.length; band++) {
      const polygon: Point[] = [a[band]!, b[band]!, b[band + 1]!, a[band + 1]!];
      if (ruled || style?.level) {
        // Straight along the edge at the hexes' own heights. A ruled line is
        // not clipped to the ground, so it belongs to its own hex only.
        const level = !ruled;
        const own = level ? edgeHeightOf(prepared, edge) : borderHeight(prepared, edge.cell);
        const ha = Math.max(own, level ? edgeHeightOf(prepared, previous) : borderHeight(prepared, previous.cell));
        const hb = Math.max(own, level ? edgeHeightOf(prepared, next) : borderHeight(prepared, next.cell));
        const mark = marking(polygon, colors[band], level ? .013 : style!.ruledLift ?? .02) as Mark;
        mark.deck = 0; mark.heights = [ha, hb, hb, ha];
        hand(edge.cell, mark);
        continue;
      }
      // Concave mitres can cross into the next owned hex. Distribute by bounds,
      // then clip; assigning a whole edge to one hex would leave a broken join.
      spread(prepared, polygon, region, edge.owner, hand, shifted => marking(shifted, colors[band], .013) as Mark);
    }
  });
  territoryPlans.set(prepared, { state, signature, plan: result, style: styleKey });
  // The gaps inside an outline: an owned hex's edges toward a hex the outline
  // closed over. Only asked for with the style, for the faint gap line.
  const gaps = style ? collect(owner, (seat, other) => other !== null && owner[other] !== seat && region[other] === seat) : null;
  // The same gaps from the other side: each closed-over hex's edges toward the
  // owned land, with the seat that closed over it. The gap's line is drawn on
  // these, so it lies on the gap's own ground as one closed loop. Drawn on the
  // owned side it climbed the hill next door (the user, 2026-11-14: an enclosed
  // open hex "renders poorly").
  const pocket = style ? region.map((seat, cell) => seat !== undefined && owner[cell] !== seat ? seat : undefined) : null;
  const pockets = pocket ? collect(pocket, (seat, other) => other !== null && owner[other] === seat) : null;
  outlines.set(result, { lines, gaps, pockets, pocket, owner, region });
  return result;
}

type EdgeSet = { edges: Edge[]; incoming: Map<number, Edge>; outgoing: Map<number, Edge> };

/** A mitred point `distance` inside a corner between two edges with these inward normals. */
function rail(p: Point, a: Point, b: Point, distance: number): Point {
  const divisor = 1 + a[0] * b[0] + a[1] * b[1];
  return [p[0] + (a[0] + b[0]) * distance / divisor, p[1] + (a[1] + b[1]) * distance / divisor];
}

/**
 * Hands one ribbon polygon to every hex of `seat` (by `inside`) whose bounds
 * it crosses, shifted onto the canonical copy of the map. The ground layer
 * clips each to its own hex.
 */
function spread(prepared: GameMap, polygon: Point[], inside: readonly (number | undefined)[], seat: number,
  hand: (cell: number, mark: Mark) => void, make: (polygon: Point[], shift: number) => Mark): void {
  const minRow = Math.max(0, Math.floor((Math.min(...polygon.map(p => p[1])) - 1) / 1.5));
  const maxRow = Math.min(prepared.height - 1, Math.ceil((Math.max(...polygon.map(p => p[1])) + 1) / 1.5));
  for (let row = minRow; row <= maxRow; row++) {
    const lo = Math.floor(Math.min(...polygon.map(p => p[0])) / root3 - row % 2 / 2 - 1);
    const hi = Math.ceil(Math.max(...polygon.map(p => p[0])) / root3 - row % 2 / 2 + 1);
    for (let col = lo; col <= hi; col++) {
      const canonical = mod(col, prepared.width), cell = row * prepared.width + canonical;
      if (inside[cell] !== seat) continue;
      const shift = (canonical - col) * root3;
      hand(cell, make(polygon.map(([x, z]) => [x + shift, z]), shift));
    }
  }
}

/** The edges a plan drew, and the gaps inside its outlines, for the tint layer. */
const outlines = new WeakMap<GroundPlan, { lines: EdgeSet; gaps: EdgeSet | null; pockets: EdgeSet | null; pocket: (number | undefined)[] | null; owner: (number | undefined)[]; region: (number | undefined)[] }>();

/**
 * The translucent half of the visual test version's border (switch 3), drawn by
 * the tint layer:
 * - a band of the seat's colour just inside the strong line, fading to nothing
 *   over `tintWidth`, mitred like the line so it turns the corners the line does;
 * - a thin faint line in the seat's colour round each gap inside the outline.
 * Every mark carries a `fade` the ground layer turns into vertex alpha.
 */
export function planPaintedTerritoryTint(state: GameState, prepared: GameMap, style: BorderStyle): GroundPlan {
  const lines = planPaintedTerritory(state, prepared, style);
  const signature = signTerritory(state);
  const styleKey = `tint:${style.holeMax}:${style.fillNeighbours}:${style.fillPasses}:${style.tintWidth}:${style.tintAlpha}:${style.tintLift}:${style.gapWidth}:${style.gapAlpha}:${style.gapGlowWidth ?? 0}:${style.gapGlowAlpha ?? 0}:${style.kind ?? 'drape'}:${style.washWidth}:${style.washAlpha}:${style.inkWidth}:${style.ruledLift}:${style.level ? 'level' : ''}`;
  const memo = memoised(tintPlans.get(prepared), state, signature, styleKey);
  if (memo) return memo;
  const kept = outlines.get(lines);
  const result: GroundPlan = new Map();
  if (!kept) return result;
  const ruled = style.kind === 'ruled' || style.kind === 'wash';
  // With `level`, a gap line round a hill is laid on the ground like the glow,
  // not drawn as a flat strip. A flat strip stands at the highest ground along
  // its edge, and each corner rises to the next edge's height. Where a hill's
  // ground climbs along an edge, the whole ring then stood at the hill's height,
  // above the ground at the low end of each edge, and read as a second border
  // lifted off the hex (the user, 2026-11-16). The line is only `gapWidth` wide
  // and lies on the hex's own edge, so on the ground it cannot smear.
  const draped = (e: Edge): boolean => !ruled && prepared.tiles[e.cell]!.hills === true;
  const keeping = keepBorder(borderTints, prepared, state, styleKey, kept.owner, kept.region);
  const band = (set: EdgeSet, index: number, inside: readonly (number | undefined)[], from: number, to: number, alpha: number, flat: boolean): void => {
    for (const edge of set.edges) handOut(result, edge, index, prepared, keeping, hand => {
      const previous = set.incoming.get(edge.ka) ?? edge, next = set.outgoing.get(edge.kb) ?? edge;
      const polygon: Point[] = [rail(edge.a, previous.normal, edge.normal, from), rail(edge.b, edge.normal, next.normal, from),
        rail(edge.b, edge.normal, next.normal, to), rail(edge.a, previous.normal, edge.normal, to)];
      if (flat && (ruled || style.level) && !draped(edge)) {
        // A ruled gap line, straight and level like the border it belongs to. With `level` it runs at the ground's own height along the edge, so it does not smear down the side of a hill.
        const height = (e: Edge): number => ruled ? borderHeight(prepared, e.cell) : edgeHeightOf(prepared, e);
        const own = height(edge);
        // A draped neighbour lies on its own ground, so it does not raise this strip's end.
        const ha = draped(previous) ? own : Math.max(own, height(previous)), hb = draped(next) ? own : Math.max(own, height(next));
        const mark = marking(polygon, playerColor(state, edge.owner), ruled ? style.ruledLift ?? .02 : .013) as Mark;
        mark.deck = 0; mark.heights = [ha, hb, hb, ha];
        mark.fade = { a: edge.a, normal: edge.normal, from, to: from + 1e3, alpha };
        hand(edge.cell, mark);
        return;
      }
      spread(prepared, polygon, inside, edge.owner, hand, (shifted, shift) => {
        const mark = marking(shifted, playerColor(state, edge.owner), style.tintLift) as Mark;
        // A flat line keeps its alpha all the way across: its fade ends far away.
        mark.fade = { a: [edge.a[0] + shift, edge.a[1]], normal: edge.normal, from, to: flat ? from + 1e3 : to, alpha };
        return mark;
      });
    });
  };
  // The wash sits against its one thin ink line; the other styles' tint sits
  // inside their two-ink line.
  const wash = style.kind === 'wash';
  const from = wash ? TERRITORY_INSET + (style.inkWidth ?? .03) : TERRITORY_INSET + TERRITORY_PRIMARY_WIDTH + TERRITORY_SECONDARY_WIDTH;
  band(kept.lines, 0, kept.region, from, from + (wash ? style.washWidth ?? .2 : style.tintWidth), wash ? style.washAlpha ?? .3 : style.tintAlpha, false);
  if (kept.pockets && kept.pocket) band(kept.pockets, 1, kept.pocket, 0, style.gapWidth, style.gapAlpha, true);
  // The gap's own glow: the border's inward glow at a smaller size, so the gap reads as an edge of the land and not as a stray line.
  if (kept.gaps && (style.gapGlowWidth ?? 0) > 0) {
    // Not on a hill: draped down a hill's steep side, the band becomes a tall dark patch.
    const flatLand = kept.owner.map((seat, cell) => prepared.tiles[cell]!.hills ? undefined : seat);
    band(kept.gaps, 2, flatLand, 0, style.gapGlowWidth!, style.gapGlowAlpha ?? 0, false);
  }
  tintPlans.set(prepared, { state, signature, plan: result, style: styleKey });
  return result;
}

/**
 * A cell's marks, folded to one integer.
 *
 * It used to be `JSON.stringify(marks)` — several hundred bytes of transient
 * string per roaded or bordered cell, over objects holding `Color` instances,
 * built on every fog move only to discover that nothing had changed. The fold is
 * the same question asked in integers: every corner, every ink and every lift,
 * quantised to a millionth (ground ink is millimetres apart at the coarsest and
 * a seat's two inks a whole channel step), with a separator between marks so two
 * short marks cannot read as one long one.
 */
function foldMarks(marks: readonly Mark[]): number {
  let hash = 2166136261 ^ marks.length;
  const mix = (value: number): void => { hash = Math.imul(hash ^ (Math.round(value) | 0), 16777619); };
  for (const mark of marks) {
    for (const [x, z] of mark.polygon) { mix(x * 1e6); mix(z * 1e6); }
    mix(mark.color.r * 1e6); mix(mark.color.g * 1e6); mix(mark.color.b * 1e6); mix(mark.lift * 1e6);
    mix(mark.deck === undefined ? -1 : mark.deck * 1e6);
    if (mark.fade) for (const value of [...mark.fade.a, ...mark.fade.normal, mark.fade.from, mark.fade.to, mark.fade.alpha]) mix(value * 1e6);
    if (mark.heights) for (const value of mark.heights) mix(value * 1e6);
    if (mark.lifts) for (const value of mark.lifts) mix(value * 1e6);
    if (mark.tints) for (const tint of mark.tints) { mix(tint.r * 1e6); mix(tint.g * 1e6); mix(tint.b * 1e6); }
    mix(0x5bf03635);
  }
  return hash >>> 0;
}

/**
 * A cell's clipped ink — or `null`, which is an answer and not an absence.
 *
 * A mark can fall entirely off the tile top (a border mitre thrown onto a hex
 * whose shoulder is cut away, most often on a shoreline), and the clip then
 * comes back empty. That used to be remembered nowhere, so the tile was
 * tessellated and clipped again on every single build to be told the same thing.
 * Forty such cells on a developed map is the whole of what a fog move cost after
 * the recipes were cached. A null recipe is the cache saying *nothing here*.
 */
type GroundRecipe = {
  terraced: boolean; key: number; geometry: BufferGeometry | null;
  /**
   * The marks array the recipe was clipped from. The road and border plans keep a
   * hex's marks array when nothing near it changed, and never change an array
   * they have handed out, so the same array has the same fold and need not be
   * folded again when the plan object is new.
   */
  marks: readonly Mark[];
};

/**
 * Where the ground ink stands in the queue of things painted on the ground.
 *
 * Every flat mark in the painted look is the same trick — a polygon clipped to
 * the terrain's own triangles and lifted a few thousandths along Y — and the
 * lifts already say who is on top: a farm's field is at .006, its parcels and
 * brush passes climb to about .009, its farmyard sits at .012, and this layer's
 * territory ribbon is at .013 with the roads at .016 above that. Read as
 * geometry, a border has always been above the field it crosses.
 *
 * The depth buffer disagreed, and the reason is `polygonOffset`. The works, the
 * towns and the great-person sites all paint their pigment through a material
 * carrying `-1, -1` (`settlementArt.js`, `paintedCities.ts`, `paintedSites.ts`),
 * which is not a fixed nudge: the factor multiplies the polygon's depth *slope*,
 * and the diorama's ground is a plane seen at forty-odd degrees, so one step of
 * it is worth far more than the seven thousandths the ribbon stood above the
 * crop. The border went under the field — the user, `docs/flags.md` (ccccc):
 * *"farms are colliding with the city border, we should have them sit under"* —
 * and survived only in the headland gaps between parcels, which is what made it
 * read as a torn line rather than a hidden one.
 *
 * So the ink answers in the same currency, one step deeper. It is a **rank** and
 * not a dial, which is why it lives here beside the lifts it ranks against
 * rather than in `data/view3d.json` — `RENDER_ORDER` in `instances.ts` is the
 * same species of table. Both terms scale with the slope, so the ordering holds
 * at every zoom the ortho camera reaches, which a bigger lift would not have
 * done. Both this layer's instances take it: a road crossing a field belongs on
 * top of the crop for exactly the reason the border does.
 */
const GROUND_INK_OFFSET = -2;

/**
 * A hex's tessellated top, made once for each prepared hex and kept.
 *
 * Every hex whose ink is clipped again is tessellated first (`terrainMesh`),
 * and the border line and the border tint clip the same hexes at the same turn
 * end: about a fifth of the tint's rebuild at a turn-130 turn end (the third
 * render speed pass). The top depends only on the prepared hex, which never
 * changes after the board is built, and the clip only reads it. It never
 * reaches the GPU, so there is nothing to dispose; it goes with its hex.
 */
const groundTops = new WeakMap<Tile, BufferGeometry>();
function groundTop(tile: Tile): BufferGeometry {
  let top = groundTops.get(tile);
  if (!top) {
    const [made, skirt] = terrainMesh(tile) as BufferGeometry[];
    skirt!.dispose();
    top = made!;
    groundTops.set(tile, top);
  }
  return top;
}

/**
 * Turns a projected tint mark's colour into colour and alpha: the alpha falls
 * smoothly from `fade.alpha` at the line to nothing at the band's inner edge.
 * A piece with no fade keeps full alpha.
 */
function fadeGeometry(piece: BufferGeometry, fade: Fade | undefined): BufferGeometry {
  const position = piece.getAttribute('position'), color = piece.getAttribute('color');
  const values = new Float32Array(position.count * 4);
  for (let i = 0; i < position.count; i++) {
    values[i * 4] = color.getX(i); values[i * 4 + 1] = color.getY(i); values[i * 4 + 2] = color.getZ(i);
    if (!fade) { values[i * 4 + 3] = 1; continue; }
    const distance = (position.getX(i) - fade.a[0]) * fade.normal[0] + (position.getZ(i) - fade.a[1]) * fade.normal[1];
    const t = Math.max(0, Math.min(1, (distance - fade.from) / Math.max(1e-6, fade.to - fade.from)));
    values[i * 4 + 3] = fade.alpha * (1 - t * t * (3 - 2 * t));
  }
  piece.setAttribute('color', new Float32BufferAttribute(values, 4));
  return piece;
}

type GroundBatch = {
  parts: BufferGeometry[]; cells: number[]; starts: number[]; counts: number[];
  levels: number[]; geometry: BufferGeometry; meshes: Mesh[];
};

/**
 * Ground-fit ink, batched by region. Fog changes reuse the clipped geometry.
 *
 * Three caches, and they answer three different questions. The **recipe** is the
 * expensive one — a tile tessellated and a polygon clipped to its triangles —
 * and it is keyed on the cell's marks (`foldMarks`), so a plan that came out the
 * same leaves every clip standing. The **batch** is the region's merged geometry
 * and its three wrap meshes, retained while the list of cells feeding it is
 * identical by identity: one cell's ink changing re-merges one region and the
 * rest of the map keeps its buffers.
 *
 * And the **wash is a vertex attribute**, not a second material. A hex crossing
 * from watched to remembered used to change which of two materials its ink
 * belonged to, which moved it to a different batch, which re-merged both — the
 * whole geometry rebuilt because a scout looked away. `groundExplored` is 0 or 1
 * per vertex and the shader picks the wash off it, so a fog move is a write into
 * an existing buffer and no geometry moves at all. The mix is exact at both ends
 * (`mix(x, y, 0.) == x`), so the picture is the one the two materials drew.
 */
export class PaintedGroundLayer {
  readonly group = new Group();
  readonly cells = new Set<number>();
  private material: MeshStandardMaterial;
  private recipes = new Map<number, GroundRecipe>();
  private batches = new Map<string, GroundBatch>();
  private prepared?: GameMap;
  private plan?: GroundPlan;
  /**
   * `tint` makes this a layer of translucent bands (the visual test version's
   * border tint, switch 3): each mark's `fade` becomes a vertex alpha, and the
   * material blends and writes no depth. One extra material, and the same
   * region batching, so the band costs a few draw calls and never one a hex.
   */
  private readonly tint: boolean;
  constructor(name: string, register: (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown, options: { tint?: boolean } = {}) {
    this.group.name = name;
    this.tint = options.tint === true;
    this.material = new MeshStandardMaterial({ color: 'white', vertexColors: true, roughness: .96, flatShading: true,
      polygonOffset: true, polygonOffsetFactor: GROUND_INK_OFFSET, polygonOffsetUnits: GROUND_INK_OFFSET,
      ...(this.tint ? { transparent: true, depthWrite: false } : {}) });
    register(this.material, { terrain: true });
    const hook = this.material.onBeforeCompile, key = this.material.customProgramCacheKey();
    this.material.onBeforeCompile = function(shader, renderer) {
      hook.call(this, shader, renderer);
      shader.uniforms.groundWash = { value: new Color(VIEW3D.fog.exploredWash) };
      shader.vertexShader = `attribute float groundExplored;\nvarying float vGroundExplored;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', 'vGroundExplored = groundExplored;\n#include <begin_vertex>');
      shader.fragmentShader = `uniform vec3 groundWash;\nvarying float vGroundExplored;\n${shader.fragmentShader}`
        .replace('#include <opaque_fragment>',
          `outgoingLight = mix(outgoingLight, mix(outgoingLight, groundWash, ${VIEW3D.fog.exploredDim.toFixed(5)}) * ${VIEW3D.fog.exploredShade.toFixed(5)}, vGroundExplored);\n#include <opaque_fragment>`);
    };
    this.material.customProgramCacheKey = () => `${key}:painted-ground-wash`;
  }
  build(state: GameState, prepared: GameMap, plan: GroundPlan, levels: FogLevels = null, shadows = true): void {
    this.cells.clear(); this.group.visible = true;
    if (this.prepared !== prepared) { this.clearMeshes(); this.clearRecipes(); this.prepared = prepared; this.plan = undefined; }
    // The plan is memoised on its own fingerprint (`planPaintedRoads`), so the
    // same object arriving again is the board saying nothing on the ground moved
    // — every recipe stands and not a mark need be folded.
    const planned = this.plan !== plan;
    this.plan = plan;
    if (planned) for (const [cell, recipe] of this.recipes) if (!plan.has(cell)) { recipe.geometry?.dispose(); this.recipes.delete(cell); }
    const regions = new Map<string, { parts: BufferGeometry[]; cells: number[]; levels: number[] }>();
    for (const [cell, marks] of plan) {
      const tile = prepared.tiles[cell]!, level = levelAt(levels, state.map, tile.col, tile.row);
      if (level === HIDDEN) continue;
      let recipe = this.recipes.get(cell);
      const key = recipe && (!planned || recipe.marks === marks) ? recipe.key : foldMarks(marks);
      const terraced = state.map.tiles[cell]?.improvement === 'terraces';
      if (!recipe || recipe.key !== key || recipe.terraced !== terraced) {
        recipe?.geometry?.dispose(); this.recipes.delete(cell);
        const terrain = terraced ? terraceFarmSurface(tile) as BufferGeometry[] : [groundTop(tile)];
        let pieces: BufferGeometry[] = [];
        try {
          pieces = this.tint
            ? marks.filter(mark => mark.deck === undefined).flatMap(mark => (projectMarkings(terrain[0], [mark]) as BufferGeometry[]).map(piece => fadeGeometry(piece, mark.fade)))
            : projectMarkings(terrain[0], marks.filter(mark => mark.deck === undefined)) as BufferGeometry[];
          for (const mark of marks) if (mark.deck !== undefined) {
            const positions: number[] = [], colors: number[] = [];
            // Face up, independently of the path's direction. A ruled border
            // (the visual test version's switch 3) gives each corner its own
            // height; a bridge deck is level.
            const corners = mark.polygon.map((p, i) => ({ p, y: (mark.heights?.[i] ?? mark.deck!) + mark.lift, ink: mark.tints?.[i] ?? mark.color }));
            const area = corners.reduce((sum, { p }, i) => { const q = corners[(i + 1) % corners.length]!.p; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
            if (area > 0) corners.reverse();
            for (let i = 1; i < corners.length - 1; i++) for (const { p, y, ink } of [corners[0]!, corners[i]!, corners[i + 1]!]) {
              positions.push(p[0], y, p[1]); colors.push(ink.r, ink.g, ink.b);
            }
            const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
            pieces.push(this.tint ? fadeGeometry(geometry, mark.fade) : geometry);
          }
        }
        // The kept hex tops are the board's for good (see `groundTop`); only a terrace's surface is made here.
        finally { if (terraced) terrain.forEach(g => g.dispose()); }
        if (!pieces.length) { this.recipes.set(cell, { key, terraced, geometry: null, marks }); continue; }
        const geometry = mergeGeometries(pieces)!; pieces.forEach(g => g.dispose());
        geometry.setAttribute('groundExplored', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count), 1));
        recipe = { key, terraced, geometry, marks }; this.recipes.set(cell, recipe);
      } else recipe.marks = marks;
      if (!recipe.geometry) continue;
      this.cells.add(cell);
      const id = `${Math.floor(tile.col / 12)},${Math.floor(tile.row / 12)}`;
      let region = regions.get(id);
      if (!region) { region = { parts: [], cells: [], levels: [] }; regions.set(id, region); }
      region.parts.push(recipe.geometry); region.cells.push(cell); region.levels.push(level === EXPLORED ? 1 : 0);
    }
    const period = root3 * prepared.width;
    const retained = new Set<string>();
    for (const [id, region] of regions) {
      retained.add(id);
      const previous = this.batches.get(id);
      if (previous && previous.parts.length === region.parts.length
        && region.parts.every((part, i) => part === previous.parts[i])) {
        // Same ink in the same order: only the wash can have moved, and that is
        // a write into the merged buffer rather than a merge.
        const wash = previous.geometry.getAttribute('groundExplored');
        let moved = false;
        for (let i = 0; i < region.levels.length; i++) {
          if (previous.levels[i] === region.levels[i]) continue;
          previous.levels[i] = region.levels[i]!; moved = true;
          const start = previous.starts[i]!, end = start + previous.counts[i]!;
          for (let v = start; v < end; v++) wash.setX(v, region.levels[i]!);
        }
        if (moved) wash.needsUpdate = true;
        continue;
      }
      this.deleteBatch(id);
      const starts: number[] = [], counts: number[] = [];
      let start = 0;
      for (let i = 0; i < region.parts.length; i++) {
        const part = region.parts[i]!, wash = part.getAttribute('groundExplored');
        const count = part.getAttribute('position').count;
        for (let v = 0; v < count; v++) wash.setX(v, region.levels[i]!);
        starts.push(start); counts.push(count); start += count;
      }
      const geometry = mergeGeometries(region.parts)!;
      const meshes: Mesh[] = [];
      for (const offset of [-period, 0, period]) {
        const mesh = new Mesh(geometry, this.material); mesh.position.x = offset; mesh.receiveShadow = shadows;
        mesh.userData.paintedGroundCells = region.cells; this.group.add(mesh); meshes.push(mesh);
      }
      this.batches.set(id, { parts: [...region.parts], cells: region.cells, starts, counts,
        levels: [...region.levels], geometry, meshes });
    }
    for (const id of [...this.batches.keys()]) if (!retained.has(id)) this.deleteBatch(id);
    // The flag is written over every batch, the reused ones included: a region
    // whose ink did not move kept its buffers and therefore kept whatever flag
    // it was merged with, which is stale the moment the setting changes.
    this.setShadows(shadows);
    this.group.updateMatrixWorld(true);
    this.group.traverse(object => { object.matrixAutoUpdate = false; object.matrixWorldAutoUpdate = false; });
  }
  /**
   * Shadows on or off, over the ribbons that are already merged.
   *
   * Roads and borders receive a shadow and cast none, and `receiveShadow` is a
   * flag on a mesh rather than anything folded into a buffer — so the setting is
   * written here and the region batches, the clipped recipes and the wash
   * attribute all stand. It used to ride in the batch's reuse test, which meant
   * a toggle re-merged every roaded and bordered region on the map to change one
   * boolean; and nothing asked the ground layer to rebuild on a toggle anyway,
   * so a game begun with shadows off kept unlit ink after they were turned on.
   */
  setShadows(enabled: boolean): void {
    for (const batch of this.batches.values()) for (const mesh of batch.meshes) mesh.receiveShadow = enabled;
  }
  private deleteBatch(id: string): void {
    const batch = this.batches.get(id); if (!batch) return;
    for (const mesh of batch.meshes) this.group.remove(mesh);
    batch.geometry.dispose(); this.batches.delete(id);
  }
  private clearMeshes(): void { for (const id of [...this.batches.keys()]) this.deleteBatch(id); this.group.clear(); }
  private clearRecipes(): void { for (const r of this.recipes.values()) r.geometry?.dispose(); this.recipes.clear(); }
  dispose(): void { this.clearMeshes(); this.clearRecipes(); this.material.dispose(); }
}
