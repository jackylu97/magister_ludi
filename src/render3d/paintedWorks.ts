import {
  BufferGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial,
  Quaternion, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type GameMap, type Tile, tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { RESOURCE_IDS, type ResourceId } from '../sim/resourceData';
import { FEATURE_IDS } from '../sim/terrainData';
import { IMPROVEMENT_IDS, type ImprovementId, improvementBaseRow } from '../sim/improvementData';
import { visibleResourceAt } from '../sim/tech';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { type FogLevels, levelAt } from './fog3d';
import { type SuppressScope, SUPPRESS } from './instances';
import { samplePaintedSurface } from './paintedSurface';
import { createTileSurfaceSampler } from './paintedTileSurface';
import { terraceFarmGeometry } from './terraceFarmGeometry';
import { terraceFarmSurface, TERRACE_LIFT } from './terraceFarmSurface';
import { VIEW3D } from './lookData';
// @ts-expect-error The reusable approved art builder remains JavaScript.
import { createSettlementArt } from '../terrainStudy/settlementArt.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { surfaceHeight } from '../terrainStudy/surface.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';

export const PAINTED_WORK_ASSET_NAMES = [
  'horse', 'cattle', 'bison', 'deer', 'elephant', 'beaver',
  'house', 'mine', 'camp', 'quarry', 'resource-shrub', 'fishing-boat',
] as const;
/** The rows this layer has a recipe drawn for. One name, one composition. */
const DRAWN_WORK_IMPROVEMENTS = [
  'farm', 'terraces', 'mine', 'pasture', 'camp', 'quarry', 'plantation', 'lumbermill', 'fishingBoats',
  'academy', 'landmark', 'manufactory', 'customsHouse', 'citadel', 'holySite',
] as const;
type CoreImprovement = typeof DRAWN_WORK_IMPROVEMENTS[number];
/**
 * Every row this layer takes responsibility for — the drawn ones above, and any
 * row that **stands in** for one of them (`ImprovementDef.countsAs`).
 *
 * Derived rather than listed, so the native improvement layer skips exactly what
 * this one draws: the renderer builds its "already painted" set out of this, and
 * a variant missing from it would be drawn twice, once in each style. See
 * `improvementAt`, which is where a stand-in becomes the row it stands in for.
 */
export const PAINTED_WORK_IMPROVEMENTS: readonly ImprovementId[] = IMPROVEMENT_IDS.filter(
  (id) => (DRAWN_WORK_IMPROVEMENTS as readonly string[]).includes(improvementBaseRow(id)),
);
export type PaintedWorksAssets = { material: MeshStandardMaterial } & Record<typeof PAINTED_WORK_ASSET_NAMES[number], BufferGeometry>;
export interface PaintedWorksOptions { suppressed?: ReadonlyMap<number, SuppressScope> }
export interface PaintedWorksEntry {
  cell: number; resource: ResourceId | null; improvement: CoreImprovement | undefined; level: number;
  site?: string;
}
/** Alternate prop compositions share the same fog, batching and lifecycle. */
export interface PaintedPropSource {
  name: string;
  createArt(assets: PaintedWorksAssets, register: RegisterMaterial): ReturnType<typeof createSettlementArt>;
  entries(state: GameState, seat: number | null): ReadonlyMap<number, string>;
}
export interface PaintedWorksPlacement {
  cell: number; asset: string; x: number; y: number; z: number; scale: number; yaw: number;
  /** Canonical world coordinates, including asymmetric sculpt bounds. */
  footprint: { x: number; z: number }[];
  foundationMin: number; foundationMax: number;
}
type RegisterMaterial = (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown;
type Prop = { geometry: BufferGeometry; material: MeshStandardMaterial; matrix: Matrix4; color: Color };
type Patch = { geometry: BufferGeometry; material: MeshStandardMaterial };
type Recipe = {
  tile: Tile; original: Tile; resource: ResourceId | null; improvement: CoreImprovement | undefined;
  site?: string;
  props: Prop[]; patches: Patch[]; placements: PaintedWorksPlacement[];
};
type PropBatch = { geometry: BufferGeometry; material: MeshStandardMaterial; props: Prop[]; cells: number[] };
type PatchBatch = { material: MeshStandardMaterial; geometries: BufferGeometry[]; cells: number[] };
const up = new Vector3(0, 1, 0);
const core = new Set<string>(DRAWN_WORK_IMPROVEMENTS);
/** Visual variants are independent of the simulation's counts-as rules. */
const improvementAt = (tile: Tile): CoreImprovement | undefined => {
  if (!tile.improvement) return undefined;
  const drawn = tile.improvement === 'terraces' ? 'terraces' : improvementBaseRow(tile.improvement);
  return core.has(drawn) ? drawn as CoreImprovement : undefined;
};
const resourceAt = (state: GameState, seat: number | null, tile: Tile): ResourceId | null =>
  seat === null ? tile.resource ?? null : visibleResourceAt(state, seat, tile);

/**
 * The three tables that turn a row's name into a number, built once.
 *
 * The fingerprint below is asked on every state refresh and walks the whole
 * map, so what it costs per tile is what it costs per unit step. Hashing the
 * *names* cost three string walks a tile — some twelve thousand character reads
 * a refresh, on a 41-town map the dearest thing in this file — and told the
 * renderer nothing a number could not. A row's position in its own id list is
 * that number: stable within a build, never persisted, and one comparison
 * apart from the name it stands for. Zero is "nothing here", so an absent row
 * and the first row of a list are still two different fingerprints.
 */
const resourceOrdinal = new Map<ResourceId, number>(RESOURCE_IDS.map((id, index) => [id, index + 1]));
const improvementOrdinal = new Map<string, number>(DRAWN_WORK_IMPROVEMENTS.map((id, index) => [id, index + 1]));
const featureOrdinal = new Map<string, number>(FEATURE_IDS.map((id, index) => [id, index + 1]));

/** Only presentation facts: hidden veins and simulation RNG never participate. */
export function signPaintedWorks(state: GameState, seat: number | null = null): number {
  let hash = 2166136261;
  const add = (value: number): void => { hash = Math.imul(hash ^ (value | 0), 16777619); };
  add(seat === null ? -1 : seat);
  // One answer per resource row rather than one per hex: whether this seat can
  // name a resource is an empire fact, and the map asks it four thousand times.
  const nameable = new Map<ResourceId, boolean>();
  for (const tile of state.map.tiles) {
    const id = tile.resource;
    let resource = 0;
    if (id !== undefined) {
      let visible = seat === null ? true : nameable.get(id);
      if (visible === undefined) { visible = visibleResourceAt(state, seat!, tile) !== null; nameable.set(id, visible); }
      if (visible) resource = resourceOrdinal.get(id) ?? 0;
    }
    add(resource);
    add(tile.improvement ? improvementOrdinal.get(improvementAt(tile)!) ?? 0 : 0);
    add(featureOrdinal.get(tile.feature) ?? 0);
  }
  for (const city of state.cities) { add(city.col); add(city.row); }
  return hash >>> 0;
}

/** Approved fields and resource silhouettes driven by the live game map. */
export class PaintedWorksLayer {
  readonly group = new Group();
  readonly entries: PaintedWorksEntry[] = [];
  readonly placements: PaintedWorksPlacement[] = [];
  private readonly art: ReturnType<typeof createSettlementArt>;
  private readonly recipes = new Map<number, Recipe>();
  private readonly merged = new Set<BufferGeometry>();
  private readonly batches = new Map<string, { inputs: readonly unknown[]; meshes: Mesh[]; geometry?: BufferGeometry }>();
  private readonly explored = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  private preparedMap: GameMap | undefined;
  private disposed = false;

  private readonly terrace = terraceFarmGeometry();
  private readonly terraceMaterial = new MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .95, flatShading: true });

  get surfaceMeshes(): Mesh[] {
    return this.group.children.filter((mesh): mesh is InstancedMesh => mesh instanceof InstancedMesh && mesh.geometry === this.terrace);
  }

  constructor(private readonly assets: PaintedWorksAssets, registerMaterial: RegisterMaterial, private readonly source?: PaintedPropSource) {
    registerMaterial(this.terraceMaterial, { terrain: true });
    this.group.name = source?.name ?? 'painted-works';
    this.art = source ? source.createArt(assets, registerMaterial) : createSettlementArt(assets, { register: registerMaterial });
  }

  build(state: GameState, preparedMap: GameMap, levels: FogLevels = null, seat: number | null = null,
    shadows = true, options: PaintedWorksOptions = {}): void {
    if (this.disposed) return;
    if (this.preparedMap !== preparedMap) { this.clearMeshes(); this.clearRecipes(); this.preparedMap = preparedMap; }
    this.entries.length = 0; this.placements.length = 0;
    const cityCells = new Set(state.cities.map(city => tileIndex(state.map, city.col, city.row)));
    const props = new Map<string, PropBatch>(), patches = new Map<string, PatchBatch>();
    const sites = this.source?.entries(state, seat);
    for (const original of state.map.tiles) {
      const cell = tileIndex(state.map, original.col, original.row);
      const level = levelAt(levels, state.map, original.col, original.row);
      if (level === HIDDEN || cityCells.has(cell)) continue;
      const tile = preparedMap.tiles[cell]; if (!tile) continue;
      const resource = this.source || (options.suppressed?.get(cell) ?? 0) >= SUPPRESS.decor ? null : resourceAt(state, seat, original);
      const improvement = this.source ? undefined : improvementAt(original), site = sites?.get(cell);
      if (!resource && !improvement && !site) { this.deleteRecipe(cell); continue; }
      const entry = { cell, resource, improvement, site, level }; this.entries.push(entry);
      let recipe = this.recipes.get(cell);
      if (!recipe || recipe.tile !== tile || recipe.original !== original || recipe.resource !== resource || recipe.improvement !== improvement || recipe.site !== site) {
        this.deleteRecipe(cell); recipe = this.createRecipe(original, tile, entry); this.recipes.set(cell, recipe);
      }
      this.placements.push(...recipe.placements);
      // Regions provide useful culling while all identical animals/rocks in a
      // region share one draw. Visibility changes reuse the costly farm cuts.
      const region = `${Math.floor(tile.col / 12)},${Math.floor(tile.row / 12)}`;
      for (const prop of recipe.props) {
        const material = this.materialAt(prop.material, level), key = `${region}:${prop.geometry.id}:${material.uuid}`;
        let batch = props.get(key);
        if (!batch) { batch = { geometry: prop.geometry, material, props: [], cells: [] }; props.set(key, batch); }
        batch.props.push(prop); batch.cells.push(cell);
      }
      for (const patch of recipe.patches) {
        const material = this.materialAt(patch.material, level), key = `${region}:${material.uuid}`;
        let batch = patches.get(key);
        if (!batch) { batch = { material, geometries: [], cells: [] }; patches.set(key, batch); }
        batch.geometries.push(patch.geometry); batch.cells.push(cell);
      }
    }
    const period = Math.sqrt(3) * preparedMap.width;
    const retained = new Set<string>();
    const reuse = (key: string, inputs: readonly unknown[]): boolean => {
      retained.add(key);
      const previous = this.batches.get(key);
      if (previous && previous.inputs.length === inputs.length && inputs.every((input, i) => input === previous.inputs[i])) return true;
      this.deleteBatch(key); return false;
    };
    for (const [id, batch] of props) {
      const key = `props:${id}`;
      if (reuse(key, batch.props)) continue;
      const meshes: InstancedMesh[] = [];
      for (const offset of [-period, 0, period]) {
        const mesh = new InstancedMesh(batch.geometry, batch.material, batch.props.length);
        for (let i = 0; i < batch.props.length; i++) { mesh.setMatrixAt(i, batch.props[i]!.matrix); mesh.setColorAt(i, batch.props[i]!.color); }
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.position.x = offset; mesh.castShadow = shadows; mesh.receiveShadow = shadows;
        mesh.userData.paintedWorksCells = batch.cells; mesh.userData.paintedWorksWrap = offset;
        mesh.computeBoundingBox(); mesh.computeBoundingSphere(); this.group.add(mesh); meshes.push(mesh);
      }
      this.batches.set(key, {inputs: [...batch.props], meshes});
    }
    // A patch is flat pigment on the hex top, and it is **not** the last thing
    // painted there: the ground layer's borders and roads cross it and stand
    // above it, by lift and by depth offset both. `GROUND_INK_OFFSET` in
    // `paintedGround.ts` is that rank, and the reason this layer's own material
    // may keep the `-1` every ground decal asks for.
    for (const [id, batch] of patches) {
      const key = `patches:${id}`;
      if (reuse(key, batch.geometries)) continue;
      const geometry = mergeGeometries(batch.geometries); if (!geometry) continue;
      this.merged.add(geometry);
      const meshes: Mesh[] = [];
      for (const offset of [-period, 0, period]) {
        const mesh = new Mesh(geometry, batch.material); mesh.position.x = offset; mesh.receiveShadow = shadows;
        mesh.userData.paintedWorksCells = [...new Set(batch.cells)]; mesh.userData.paintedWorksWrap = offset;
        this.group.add(mesh); meshes.push(mesh);
      }
      this.batches.set(key, {inputs: [...batch.geometries], meshes, geometry});
    }
    for (const key of this.batches.keys()) if (!retained.has(key)) this.deleteBatch(key);
    // Over the reused batches too — they kept their buffers and so kept the flag
    // they were built with. See `setShadows`.
    this.setShadows(shadows);
    this.group.updateMatrixWorld(true);
    this.group.traverse(object => { object.matrixAutoUpdate = false; object.matrixWorldAutoUpdate = false; });
  }

  /**
   * Shadows on or off, over the props and patches already standing.
   *
   * A silhouette casts and receives; a field patch is flat pigment on the hex
   * top and only receives. Both are mesh flags, not buffer contents, so the
   * setting is written here rather than folded into the batch key — where it
   * used to be, which made a toggle re-instance every animal and re-merge every
   * field on the map. The site kit is this same layer under another name
   * (`paintedSites.ts`), and it was the half nothing rebuilt on a toggle at all.
   */
  setShadows(enabled: boolean): void {
    for (const batch of this.batches.values()) for (const mesh of batch.meshes) {
      mesh.receiveShadow = enabled;
      if (mesh instanceof InstancedMesh) mesh.castShadow = enabled;
    }
  }

  private createRecipe(original: Tile, tile: Tile, entry: PaintedWorksEntry): Recipe {
    const recipe: Recipe = { tile, original, resource: entry.resource, improvement: entry.improvement, site: entry.site, props: [], patches: [], placements: [] };
    // Resource-only cells never need field clipping. Avoid tessellating a
    // second world just to place their few instanced silhouettes.
    const terraced = entry.improvement === 'terraces';
    const top = entry.improvement || entry.site ? ((terraced ? terraceFarmSurface(tile) : terrainMesh(tile)) as [BufferGeometry, BufferGeometry]) : null;
    const localSurface = top ? createTileSurfaceSampler(top[0], Math.sqrt(3) * (tile.col + tile.row % 2 * .5), tile.row * 1.5) : null;
    const height = (x: number, z: number): number => (localSurface ? localSurface(x, z) : samplePaintedSurface(original, x, z)) ?? surfaceHeight(tile, x, z) as number;
    try {
      this.art.tile(tile, terraced ? { ...entry, improvement: undefined } : entry, top?.[0], {
        sampleSurface: height, preciseFit: true,
        prop: (geometry: BufferGeometry, material: MeshStandardMaterial, x: number, y: number, z: number,
          sx: number, sy: number, sz: number, yaw = 0, tint: number | Color = 0xffffff): void => {
          const matrix = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(up, yaw), new Vector3(sx, sy, sz));
          recipe.props.push({ geometry, material, matrix, color: new Color(tint) });
        },
        push: (material: MeshStandardMaterial, geometry: BufferGeometry): void => {
          if (geometry.getAttribute('position').count) recipe.patches.push({ material, geometry }); else geometry.dispose();
        },
        onBuilding: (placement: Omit<PaintedWorksPlacement, 'cell'>): void => { recipe.placements.push({ cell: entry.cell, ...placement }); },
      });
    } catch (error) {
      for (const patch of recipe.patches) patch.geometry.dispose(); throw error;
    } finally { top?.forEach(geometry => geometry.dispose()); }
    if (terraced) {
      const x = Math.sqrt(3) * (tile.col + tile.row % 2 * .5), z = tile.row * 1.5;
      recipe.props.push({ geometry: this.terrace, material: this.terraceMaterial,
        matrix: new Matrix4().makeTranslation(x, TERRACE_LIFT, z), color: new Color(0xffffff) });
      const house = this.assets.house;
      if (!house.boundingBox) house.computeBoundingBox();
      const bounds = house.boundingBox!, size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
      const scale = .23 / Math.max(size.x, size.z);
      recipe.props.push({ geometry: house, material: this.assets.material,
        matrix: new Matrix4().compose(new Vector3(x + .07 - center.x * scale,
          TERRACE_LIFT + .39 - bounds.min.y * scale, z - .32 - center.z * scale), new Quaternion(), new Vector3(scale, scale, scale)), color: new Color(0xffffff) });
    }
    return recipe;
  }

  private materialAt(source: MeshStandardMaterial, level: number): MeshStandardMaterial {
    if (level !== EXPLORED) return source;
    let material = this.explored.get(source);
    if (!material) {
      material = source.clone();
      const originalHook = source.onBeforeCompile, originalKey = source.customProgramCacheKey();
      material.onBeforeCompile = function(shader, renderer): void {
        originalHook.call(this, shader, renderer);
        shader.uniforms.paintedWorksWash = { value: new Color(VIEW3D.fog.exploredWash) };
        shader.fragmentShader = `uniform vec3 paintedWorksWash;\n${shader.fragmentShader}`.replace('#include <opaque_fragment>',
          `outgoingLight = mix(outgoingLight, paintedWorksWash, ${VIEW3D.fog.exploredDim.toFixed(5)}) * ${VIEW3D.fog.exploredShade.toFixed(5)};\n#include <opaque_fragment>`);
      };
      material.customProgramCacheKey = () => `${originalKey}:painted-works-explored`;
      material.userData.paintedWorksExplored = true; this.explored.set(source, material);
    }
    return material;
  }

  private deleteBatch(key: string): void {
    const batch = this.batches.get(key); if (!batch) return;
    for (const mesh of batch.meshes) { this.group.remove(mesh); if (mesh instanceof InstancedMesh) mesh.dispose(); }
    if (batch.geometry) { batch.geometry.dispose(); this.merged.delete(batch.geometry); }
    this.batches.delete(key);
  }
  private clearMeshes(): void { for (const key of this.batches.keys()) this.deleteBatch(key); }
  private deleteRecipe(cell: number): void {
    const recipe = this.recipes.get(cell); if (!recipe) return;
    for (const patch of recipe.patches) patch.geometry.dispose(); this.recipes.delete(cell);
  }
  private clearRecipes(): void { for (const cell of this.recipes.keys()) this.deleteRecipe(cell); }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.clearMeshes(); this.clearRecipes(); this.art.dispose();
    this.terrace.dispose(); this.terraceMaterial.dispose();
    for (const material of this.explored.values()) material.dispose(); this.explored.clear();
    this.entries.length = 0; this.placements.length = 0;
  }
}
