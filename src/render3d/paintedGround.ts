import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GameMap, Tile } from '../sim/map';
import type { GameState } from '../sim/state';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { playerColor, playerSecondaryColor, signTerritory } from './cities3d';
import { type FogLevels, levelAt } from './fog3d';
import { VIEW3D } from './lookData';
import { signRoadCells } from './roads3d';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { centre, neighbour, surfaceHeight } from '../terrainStudy/surface.js';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
// @ts-expect-error Approved ground ribbons remain JavaScript.
import { marking, projectMarkings, roadRibbonPolygons } from '../terrainStudy/surfaceMarkings.js';
// @ts-expect-error Share the approved two-ink border dimensions.
import { TERRITORY_INSET, TERRITORY_PRIMARY_WIDTH, TERRITORY_SECONDARY_WIDTH } from '../terrainStudy/territoryPlan.js';

type Point = [number, number];
type Mark = { polygon: Point[]; color: Color; lift: number; deck?: number; bounds: { minX: number; maxX: number; minZ: number; maxZ: number } };
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
type PlanMemo = { state: GameState; signature: number; plan: GroundPlan };
const roadPlans = new WeakMap<GameMap, PlanMemo>();
const territoryPlans = new WeakMap<GameMap, PlanMemo>();
const memoised = (memo: PlanMemo | undefined, state: GameState, signature: number): GroundPlan | undefined =>
  memo && memo.state === state && memo.signature === signature ? memo.plan : undefined;

/** Live road facts, with each cell owning only its half-links and junction. */
export function planPaintedRoads(state: GameState, prepared: GameMap): GroundPlan {
  const signature = signRoadCells(state);
  const memo = memoised(roadPlans.get(prepared), state, signature);
  if (memo) return memo;
  const result: GroundPlan = new Map();
  for (let cell = 0; cell < state.map.tiles.length; cell++) {
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
  roadPlans.set(prepared, { state, signature, plan: result });
  return result;
}

type Edge = { cell: number; owner: number; a: Point; b: Point; ka: number; kb: number; normal: Point };
/** Integer vertex identity joins concave corners and the cylindrical wrap seam. */
export function planPaintedTerritory(state: GameState, prepared: GameMap): GroundPlan {
  const signature = signTerritory(state);
  const memo = memoised(territoryPlans.get(prepared), state, signature);
  if (memo) return memo;
  const cityOwners = new Map(state.cities.map(city => [city.id, city.ownerId]));
  const owner = state.tileOwner.map(id => id == null ? undefined : cityOwners.get(id));
  const edges: Edge[] = [], incoming = new Map<number, Edge>(), outgoing = new Map<number, Edge>();
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
  for (let cell = 0; cell < owner.length; cell++) {
    const seat = owner[cell]; if (seat === undefined) continue;
    const tile = prepared.tiles[cell]!, c = centre(tile) as { x: number; z: number };
    for (let d = 0; d < 6; d++) {
      const other = neighbour(tile, prepared, d) as Tile | null;
      if (other && owner[other.row * prepared.width + other.col] === seat) continue;
      const [u, v] = corners[d]!, [uu, vv] = corners[(d + 1) % 6]!;
      const a: Point = [c.x + u * apothem, c.z + v / 2], b: Point = [c.x + uu * apothem, c.z + vv / 2];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const edge: Edge = { cell, owner: seat, a, b, ka: vertexKey(tile, d, seat), kb: vertexKey(tile, (d + 1) % 6, seat),
        normal: [-(b[1] - a[1]) / length, (b[0] - a[0]) / length] };
      edges.push(edge); outgoing.set(edge.ka, edge); incoming.set(edge.kb, edge);
    }
  }
  const result: GroundPlan = new Map();
  const offsets = [TERRITORY_INSET, TERRITORY_INSET + TERRITORY_PRIMARY_WIDTH, TERRITORY_INSET + TERRITORY_PRIMARY_WIDTH + TERRITORY_SECONDARY_WIDTH] as number[];
  const rail = (p: Point, a: Point, b: Point, distance: number): Point => {
    const divisor = 1 + a[0] * b[0] + a[1] * b[1];
    return [p[0] + (a[0] + b[0]) * distance / divisor, p[1] + (a[1] + b[1]) * distance / divisor];
  };
  for (const edge of edges) {
    const previous = incoming.get(edge.ka)!, next = outgoing.get(edge.kb)!;
    const a = offsets.map(d => rail(edge.a, previous.normal, edge.normal, d));
    const b = offsets.map(d => rail(edge.b, edge.normal, next.normal, d));
    const colors = [playerColor(state, edge.owner), playerSecondaryColor(state, edge.owner)];
    for (let band = 0; band < 2; band++) {
      const polygon: Point[] = [a[band]!, b[band]!, b[band + 1]!, a[band + 1]!];
      // Concave mitres can cross into the next owned hex. Distribute by bounds,
      // then clip; assigning a whole edge to one hex would leave a broken join.
      const minRow = Math.max(0, Math.floor((Math.min(...polygon.map(p => p[1])) - 1) / 1.5));
      const maxRow = Math.min(prepared.height - 1, Math.ceil((Math.max(...polygon.map(p => p[1])) + 1) / 1.5));
      for (let row = minRow; row <= maxRow; row++) {
        const lo = Math.floor(Math.min(...polygon.map(p => p[0])) / root3 - row % 2 / 2 - 1);
        const hi = Math.ceil(Math.max(...polygon.map(p => p[0])) / root3 - row % 2 / 2 + 1);
        for (let col = lo; col <= hi; col++) {
          const canonical = mod(col, prepared.width), cell = row * prepared.width + canonical;
          if (owner[cell] !== edge.owner) continue;
          const shift = (canonical - col) * root3;
          const mark = marking(polygon.map(([x, z]) => [x + shift, z]), colors[band], .013) as Mark;
          const marks = result.get(cell) ?? []; marks.push(mark); result.set(cell, marks);
        }
      }
    }
  }
  territoryPlans.set(prepared, { state, signature, plan: result });
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
type GroundRecipe = { key: number; geometry: BufferGeometry | null };

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
  constructor(name: string, register: (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown) {
    this.group.name = name;
    this.material = new MeshStandardMaterial({ color: 'white', vertexColors: true, roughness: .96, flatShading: true,
      polygonOffset: true, polygonOffsetFactor: GROUND_INK_OFFSET, polygonOffsetUnits: GROUND_INK_OFFSET });
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
      const key = recipe && !planned ? recipe.key : foldMarks(marks);
      if (!recipe || recipe.key !== key) {
        recipe?.geometry?.dispose(); this.recipes.delete(cell);
        const terrain = terrainMesh(tile) as BufferGeometry[];
        let pieces: BufferGeometry[] = [];
        try {
          pieces = projectMarkings(terrain[0], marks.filter(mark => mark.deck === undefined)) as BufferGeometry[];
          for (const mark of marks) if (mark.deck !== undefined) {
            const positions: number[] = [], colors: number[] = [];
            // Face up, independently of the path's direction.
            const polygon = [...mark.polygon];
            const area = polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]!; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
            if (area > 0) polygon.reverse();
            for (let i = 1; i < polygon.length - 1; i++) for (const p of [polygon[0]!, polygon[i]!, polygon[i + 1]!]) {
              positions.push(p[0], mark.deck + mark.lift, p[1]); colors.push(mark.color.r, mark.color.g, mark.color.b);
            }
            const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); pieces.push(geometry);
          }
        }
        finally { terrain.forEach(g => g.dispose()); }
        if (!pieces.length) { this.recipes.set(cell, { key, geometry: null }); continue; }
        const geometry = mergeGeometries(pieces)!; pieces.forEach(g => g.dispose());
        geometry.setAttribute('groundExplored', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count), 1));
        recipe = { key, geometry }; this.recipes.set(cell, recipe);
      }
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
