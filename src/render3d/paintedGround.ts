import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GameMap, Tile } from '../sim/map';
import type { GameState } from '../sim/state';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { playerColor, playerSecondaryColor } from './cities3d';
import { type FogLevels, levelAt } from './fog3d';
import { VIEW3D } from './lookData';
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

/** Live road facts, with each cell owning only its half-links and junction. */
export function planPaintedRoads(state: GameState, prepared: GameMap): GroundPlan {
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
  return result;
}

type Edge = { cell: number; owner: number; a: Point; b: Point; ka: string; kb: string; normal: Point };
/** Integer vertex identity joins concave corners and the cylindrical wrap seam. */
export function planPaintedTerritory(state: GameState, prepared: GameMap): GroundPlan {
  const cityOwners = new Map(state.cities.map(city => [city.id, city.ownerId]));
  const owner = state.tileOwner.map(id => id == null ? undefined : cityOwners.get(id));
  const edges: Edge[] = [], incoming = new Map<string, Edge>(), outgoing = new Map<string, Edge>();
  const vertexKey = (tile: Tile, corner: number, seat: number): string => {
    const [u, v] = corners[corner]!;
    return `${seat}:${mod(2 * tile.col + tile.row % 2 + u, 2 * prepared.width)},${3 * tile.row + v}`;
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
  return result;
}

/** Ground-fit ink, batched by region. Fog changes reuse the clipped geometry. */
export class PaintedGroundLayer {
  readonly group = new Group();
  readonly cells = new Set<number>();
  private material: MeshStandardMaterial;
  private remembered: MeshStandardMaterial;
  private recipes = new Map<number, { key: string; geometry: BufferGeometry }>();
  private merged: BufferGeometry[] = [];
  private prepared?: GameMap;
  constructor(name: string, register: (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown) {
    this.group.name = name;
    this.material = new MeshStandardMaterial({ color: 'white', vertexColors: true, roughness: .96, flatShading: true });
    register(this.material, { terrain: true });
    this.remembered = this.material.clone();
    const hook = this.material.onBeforeCompile, key = this.material.customProgramCacheKey();
    this.remembered.onBeforeCompile = function(shader, renderer) {
      hook.call(this, shader, renderer);
      shader.uniforms.groundWash = { value: new Color(VIEW3D.fog.exploredWash) };
      shader.fragmentShader = `uniform vec3 groundWash;\n${shader.fragmentShader}`.replace('#include <opaque_fragment>',
        `outgoingLight = mix(outgoingLight, groundWash, ${VIEW3D.fog.exploredDim.toFixed(5)}) * ${VIEW3D.fog.exploredShade.toFixed(5)};\n#include <opaque_fragment>`);
    };
    this.remembered.customProgramCacheKey = () => `${key}:painted-ground-explored`;
  }
  build(state: GameState, prepared: GameMap, plan: GroundPlan, levels: FogLevels = null, shadows = true): void {
    this.clearMeshes(); this.cells.clear(); this.group.visible = true;
    if (this.prepared !== prepared) { this.clearRecipes(); this.prepared = prepared; }
    for (const [cell, recipe] of this.recipes) if (!plan.has(cell)) { recipe.geometry.dispose(); this.recipes.delete(cell); }
    const batches = new Map<string, { parts: BufferGeometry[]; cells: number[]; material: MeshStandardMaterial }>();
    for (const [cell, marks] of plan) {
      const tile = prepared.tiles[cell]!, level = levelAt(levels, state.map, tile.col, tile.row);
      if (level === HIDDEN) continue;
      const key = JSON.stringify(marks);
      let recipe = this.recipes.get(cell);
      if (!recipe || recipe.key !== key) {
        recipe?.geometry.dispose(); this.recipes.delete(cell);
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
        if (!pieces.length) continue;
        const geometry = mergeGeometries(pieces)!; pieces.forEach(g => g.dispose());
        recipe = { key, geometry }; this.recipes.set(cell, recipe);
      }
      this.cells.add(cell);
      const material = level === EXPLORED ? this.remembered : this.material;
      const id = `${Math.floor(tile.col / 12)},${Math.floor(tile.row / 12)}:${material.uuid}`;
      let batch = batches.get(id);
      if (!batch) { batch = { parts: [], cells: [], material }; batches.set(id, batch); }
      batch.parts.push(recipe.geometry); batch.cells.push(cell);
    }
    const period = root3 * prepared.width;
    for (const batch of batches.values()) {
      const geometry = mergeGeometries(batch.parts)!; this.merged.push(geometry);
      for (const offset of [-period, 0, period]) {
        const mesh = new Mesh(geometry, batch.material); mesh.position.x = offset; mesh.receiveShadow = shadows;
        mesh.userData.paintedGroundCells = batch.cells; this.group.add(mesh);
      }
    }
    this.group.updateMatrixWorld(true);
    this.group.traverse(object => { object.matrixAutoUpdate = false; object.matrixWorldAutoUpdate = false; });
  }
  private clearMeshes(): void { this.group.clear(); this.merged.forEach(g => g.dispose()); this.merged = []; }
  private clearRecipes(): void { for (const r of this.recipes.values()) r.geometry.dispose(); this.recipes.clear(); }
  dispose(): void { this.clearMeshes(); this.clearRecipes(); this.material.dispose(); this.remembered.dispose(); }
}
