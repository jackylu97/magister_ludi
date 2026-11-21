import {
  BufferGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial,
  Quaternion, Vector3,
} from 'three';
import { APPROVED_WORK_IDS, type ApprovedWorkId, isApprovedWork, workGalleryPreviews } from './approvedWorkCatalog';
import { loadApprovedWork, placeApprovedWork } from './approvedWorkArt';
import { mergePaintedPatches } from './paintedPatchPicking';
import { type GameMap, type Tile, tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { RESOURCE_IDS, type ResourceId } from '../sim/resourceData';
import { FEATURE_IDS } from '../sim/terrainData';
import { IMPROVEMENT_IDS, type ImprovementId, improvementBaseRow } from '../sim/improvementData';
import { visibleResourceAt } from '../sim/tech';
import { highestAge } from '../sim/techData';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { type FogLevels, levelAt } from './fog3d';
import { type SuppressScope, SUPPRESS } from './instances';
import { samplePaintedSurface } from './paintedSurface';
import { createTileSurfaceSampler } from './paintedTileSurface';
import { terraceFarmGeometry } from './terraceFarmGeometry';
import { terraceFarmSurface, TERRACE_LIFT } from './terraceFarmSurface';
import { installHerdMotion } from './paintedAnimals';
import { VIEW3D } from './lookData';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { NORTH_STAR_WORK_AGES, NORTH_STAR_WORK_STEPS } from '../terrainStudy/northStarAssets.js';
// @ts-expect-error The reusable approved art builder remains JavaScript.
import { createSettlementArt } from '../terrainStudy/settlementArt.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { surfaceHeight } from '../terrainStudy/surface.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';

export const PAINTED_WORK_ASSET_NAMES = [
  'horse', 'cattle', 'bison', 'deer', 'elephant', 'beaver', 'camel',
  'house', 'mine', 'camp', 'quarry', 'resource-shrub', 'fishing-boat',
] as const;
/** The rows this layer has a recipe drawn for. One name, one composition. */
const DRAWN_WORK_IMPROVEMENTS = [
  'farm', 'terraces', 'mine', 'pasture', 'camp', 'quarry', 'plantation', 'lumbermill', 'fishingBoats',
  'academy', 'landmark', 'manufactory', 'customsHouse', 'citadel', 'holySite', ...APPROVED_WORK_IDS,
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
  (id) => id !== 'polder' && (isApprovedWork(id) || (DRAWN_WORK_IMPROVEMENTS as readonly string[]).includes(improvementBaseRow(id))),
);
export type PaintedWorksAssets = { material: MeshStandardMaterial } & Record<typeof PAINTED_WORK_ASSET_NAMES[number], BufferGeometry>;
interface PaintedWorksOptions { suppressed?: ReadonlyMap<number, SuppressScope> }
export interface PaintedWorksEntry {
  cell: number; resource: ResourceId | null; improvement: CoreImprovement | undefined; level: number;
  damage?: ImprovementId;
  site?: string;
  /** The age step the work is drawn at, 1 to 4, or 0 for a hex whose look has no steps. See `workAgeSteps`. */
  step: number;
}
/** Alternate prop compositions share the same fog, batching and lifecycle. */
export interface PaintedPropSource {
  name: string;
  createArt(assets: PaintedWorksAssets, register: RegisterMaterial): ReturnType<typeof createSettlementArt>;
  entries(state: GameState, seat: number | null): ReadonlyMap<number, string>;
}
interface PaintedWorksPlacement {
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
  damage?: ImprovementId;
  site?: string; step: number;
  fitted?: BufferGeometry;
  props: Prop[]; patches: Patch[]; placements: PaintedWorksPlacement[];
};
type PropBatch = { region: number; geometry: BufferGeometry; material: MeshStandardMaterial; props: Prop[]; cells: number[] };
type PatchBatch = { region: number; material: MeshStandardMaterial; geometries: BufferGeometry[]; cells: number[] };
const up = new Vector3(0, 1, 0);
const core = new Set<string>(DRAWN_WORK_IMPROVEMENTS);
/** Visual variants are independent of the simulation's counts-as rules. */
const improvementAt = (tile: Tile): CoreImprovement | undefined => {
  if (!tile.improvement || tile.improvement === 'polder') return undefined;
  if (isApprovedWork(tile.improvement)) return tile.improvement;
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
const damageOrdinal = new Map(IMPROVEMENT_IDS.map((id, index) => [id, index + 1]));
const featureOrdinal = new Map<string, number>(FEATURE_IDS.map((id, index) => [id, index + 1]));

/** The improvements that have a row in `NORTH_STAR_WORK_AGES`, so their look follows their owner's age. */
const AGED_WORKS = new Set<string>(Object.keys(NORTH_STAR_WORK_AGES as Record<string, unknown>));

/**
 * The age step of the work on a hex: its owner's age, as a town's look is
 * (`cityTier` in `cities3d.ts`), from 1 to `NORTH_STAR_WORK_STEPS`. The user,
 * 2026-11-16: "the windmills feel out of place with the huts representing the
 * city". A work on a hex that nobody owns takes the first step. The answer is 0
 * when the look has no steps (`visualTest.works.byAge` off, or the north-star
 * look off) and for an improvement with no row in the table, so those hexes
 * never rebuild for an age.
 *
 * This is the one reading. `signPaintedWorks` asks it to decide when to draw
 * again and `PaintedWorksLayer.build` asks it to decide what to draw, so the
 * two cannot disagree. It returns a function of the cell, made once for a walk
 * of the map: the owners and their ages are looked up once, not once a hex.
 */
export function workAgeSteps(state: GameState): (cell: number, improvement: string | undefined) => number {
  if (!VIEW3D.visualTest.northStar || !VIEW3D.visualTest.works.byAge) return () => 0;
  const cityOwner = new Map<number, number>();
  for (const city of state.cities) cityOwner.set(city.id, city.ownerId);
  const ages = new Map<number, number>();
  return (cell, improvement) => {
    if (!improvement || !AGED_WORKS.has(improvement)) return 0;
    const cityId = state.tileOwner[cell];
    const owner = cityId === null || cityId === undefined ? undefined : cityOwner.get(cityId);
    if (owner === undefined) return 1;
    let age = ages.get(owner);
    if (age === undefined) {
      const player = state.players[owner];
      age = player ? Math.max(1, Math.min(NORTH_STAR_WORK_STEPS as number, highestAge(player.techsResearched))) : 1;
      ages.set(owner, age);
    }
    return age;
  };
}

/** Only presentation facts: hidden veins and simulation RNG never participate. */
export function signPaintedWorks(state: GameState, seat: number | null = null): number {
  let hash = 2166136261;
  const add = (value: number): void => { hash = Math.imul(hash ^ (value | 0), 16777619); };
  add(seat === null ? -1 : seat);
  // One answer per resource row rather than one per hex: whether this seat can
  // name a resource is an empire fact, and the map asks it four thousand times.
  const previews = workGalleryPreviews.get(state.map);
  const nameable = new Map<ResourceId, boolean>();
  const stepAt = workAgeSteps(state);
  for (const [cell, tile] of state.map.tiles.entries()) {
    const id = tile.resource;
    let resource = 0;
    if (id !== undefined) {
      let visible = seat === null ? true : nameable.get(id);
      if (visible === undefined) { visible = visibleResourceAt(state, seat!, tile) !== null; nameable.set(id, visible); }
      if (visible) resource = resourceOrdinal.get(id) ?? 0;
    }
    add(resource);
    const improvement = previews?.get(cell) ?? (tile.improvement ? improvementAt(tile) : undefined);
    add(improvement ? improvementOrdinal.get(improvement) ?? 0 : 0);
    // The work's age step, so the works change when their owner enters a new age or the hex changes hands.
    if (improvement) add(stepAt(cell, improvement));
    const damaged = tile.damagedImprovement?.id;
    if (damaged) { add(tile.damagedImprovement?.pillagedOn ?? -1); add(0x100 + (damageOrdinal.get(damaged) ?? 0)); add(stepAt(cell, improvementBaseRow(damaged))); }
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
  private drawn = new Map<number, { recipe: Recipe; level: number }>();
  private readonly batches = new Map<string, { region: number; inputs: readonly unknown[]; meshes: Mesh[]; geometry?: BufferGeometry }>();
  private readonly explored = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  private preparedMap: GameMap | undefined;
  private disposed = false;
  private shadowsEnabled: boolean | undefined;

  private readonly approved = new Map<ApprovedWorkId, BufferGeometry>();
  private readonly loading = new Set<ApprovedWorkId>();
  private pigment?: MeshStandardMaterial;
  private readonly terrace = terraceFarmGeometry();
  private readonly terraceMaterial = new MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .95, flatShading: true });

  get surfaceMeshes(): Mesh[] {
    return this.group.children.filter((mesh): mesh is InstancedMesh => mesh instanceof InstancedMesh && mesh.geometry === this.terrace);
  }

  constructor(private readonly assets: PaintedWorksAssets, private readonly registerMaterial: RegisterMaterial, private readonly source?: PaintedPropSource,
    private readonly onAssetsReady?: () => void, private readonly loadWork = loadApprovedWork) {
    registerMaterial(this.terraceMaterial, { terrain: true });
    this.group.name = source?.name ?? 'painted-works';
    this.art = source ? source.createArt(assets, registerMaterial)
      : createSettlementArt(assets, { register: registerMaterial }, VIEW3D.visualTest.northStar ? VIEW3D.visualTest.works : null);
    // The herds' idle motion lives in the shader of the material every work shares (`paintedAnimals.ts`).
    if (VIEW3D.visualTest.northStar) installHerdMotion(assets.material);
  }

  /** Request only works on charted ground. Each sculpt stays shared across cells and wrap copies. */
  private async prepareApproved(ids: ReadonlySet<ApprovedWorkId>): Promise<void> {
    if (this.disposed) return;
    const pending = [...ids].filter(id => !this.approved.has(id) && !this.loading.has(id));
    if (!pending.length) return;
    const loaded = new Set<ApprovedWorkId>();
    await Promise.all(pending.map(async id => {
      this.loading.add(id);
      try {
        const geometry = await this.loadWork(id);
        if (this.disposed) geometry.dispose();
        else { this.approved.set(id, geometry); loaded.add(id); }
      } catch (error) {
        console.error('Could not load painted improvement', id, error);
      } finally { this.loading.delete(id); }
    }));
    if (this.disposed || !loaded.size) return;
    for (const [cell, recipe] of this.recipes) {
      if (isApprovedWork(recipe.improvement) && loaded.has(recipe.improvement)) this.deleteRecipe(cell);
    }
    this.onAssetsReady?.();
  }

  build(state: GameState, preparedMap: GameMap, levels: FogLevels = null, seat: number | null = null,
    shadows = true, options: PaintedWorksOptions = {}): void {
    if (this.disposed) return;
    if (this.preparedMap !== preparedMap) { this.clearMeshes(); this.clearRecipes(); this.preparedMap = preparedMap; }
    this.entries.length = 0; this.placements.length = 0;
    const cityCells = new Set(state.cities.map(city => tileIndex(state.map, city.col, city.row)));
    const props = new Map<string, PropBatch>(), patches = new Map<string, PatchBatch>();
    const missing = new Set<ApprovedWorkId>();
    const previews = workGalleryPreviews.get(state.map);
    const sites = this.source?.entries(state, seat);
    const stepAt = workAgeSteps(state);
    const regionsAcross = Math.ceil(preparedMap.width / 12);
    const regionAt = (tile: Tile): number => Math.floor(tile.row / 12) * regionsAcross + Math.floor(tile.col / 12);
    const dirty = new Set<number>();
    const drawn = new Map<number, { recipe: Recipe; level: number }>();
    for (const original of state.map.tiles) {
      const cell = tileIndex(state.map, original.col, original.row);
      const level = levelAt(levels, state.map, original.col, original.row);
      if (level === HIDDEN || cityCells.has(cell)) continue;
      const tile = preparedMap.tiles[cell]; if (!tile) continue;
      const resource = this.source || (options.suppressed?.get(cell) ?? 0) >= SUPPRESS.decor ? null : resourceAt(state, seat, original);
      const improvement = this.source ? undefined : previews?.get(cell) ?? improvementAt(original), site = sites?.get(cell);
      const damage = this.source ? undefined : original.damagedImprovement?.id;
      if (!damage && isApprovedWork(improvement) && !this.approved.has(improvement)) missing.add(improvement);
      if (!resource && !improvement && !site && !damage) { this.deleteRecipe(cell); continue; }
      const step = stepAt(cell, damage ? improvementBaseRow(damage) : improvement);
      const entry = { cell, resource, improvement, damage, site, level, step }; this.entries.push(entry);
      let recipe = this.recipes.get(cell);
      if (!recipe || recipe.tile !== tile || recipe.original !== original || recipe.resource !== resource || recipe.improvement !== improvement || recipe.damage !== damage || recipe.site !== site || recipe.step !== step) {
        this.deleteRecipe(cell); recipe = this.createRecipe(original, tile, entry); this.recipes.set(cell, recipe);
      }
      this.placements.push(...recipe.placements);
      const previous = this.drawn.get(cell);
      if (previous?.recipe === recipe && previous.level === level) {
        drawn.set(cell, previous);
      } else {
        dirty.add(regionAt(tile));
        drawn.set(cell, { recipe, level });
      }
    }
    for (const [cell, previous] of this.drawn) {
      if (!drawn.has(cell)) dirty.add(regionAt(previous.recipe.tile));
    }
    this.drawn = drawn;
    if (missing.size) void this.prepareApproved(missing);
    if (dirty.size === 0) {
      this.setShadows(shadows);
      return;
    }
    // A fog change can move a few props between the visible and remembered
    // materials. Only the affected regions need new batch inputs.
    for (const [cell, { recipe, level }] of drawn) {
      const region = regionAt(recipe.tile);
      if (!dirty.has(region)) continue;
      for (const prop of recipe.props) {
        const material = this.materialAt(prop.material, level), key = `${region}:${prop.geometry.id}:${material.uuid}`;
        let batch = props.get(key);
        if (!batch) { batch = { region, geometry: prop.geometry, material, props: [], cells: [] }; props.set(key, batch); }
        batch.props.push(prop); batch.cells.push(cell);
      }
      for (const patch of recipe.patches) {
        const material = this.materialAt(patch.material, level), key = `${region}:${material.uuid}`;
        let batch = patches.get(key);
        if (!batch) { batch = { region, material, geometries: [], cells: [] }; patches.set(key, batch); }
        batch.geometries.push(patch.geometry); batch.cells.push(cell);
      }
    }
    const period = Math.sqrt(3) * preparedMap.width;
    this.group.updateWorldMatrix(false, false);
    this.group.matrixAutoUpdate = false;
    this.group.matrixWorldAutoUpdate = false;
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
      // A region's three copies differ only in their world position. The batch
      // owns the instance data and removes all three meshes together.
      const primary = new InstancedMesh(batch.geometry, batch.material, batch.props.length);
      for (const [i, prop] of batch.props.entries()) {
        primary.setMatrixAt(i, prop.matrix);
        primary.setColorAt(i, prop.color);
      }
      primary.instanceMatrix.needsUpdate = true;
      if (primary.instanceColor) primary.instanceColor.needsUpdate = true;
      primary.computeBoundingBox();
      primary.computeBoundingSphere();
      const meshes: InstancedMesh[] = [];
      for (const offset of [-period, 0, period]) {
        const mesh = offset === 0 ? primary : new InstancedMesh(batch.geometry, batch.material, 0);
        if (mesh !== primary) {
          mesh.instanceMatrix = primary.instanceMatrix;
          mesh.instanceColor = primary.instanceColor;
          mesh.count = primary.count;
          mesh.boundingBox = primary.boundingBox;
          mesh.boundingSphere = primary.boundingSphere;
        }
        mesh.castShadow = shadows;
        this.addWrapCopy(mesh, offset, batch.cells, shadows);
        meshes.push(mesh);
      }
      this.batches.set(key, { region: batch.region, inputs: batch.props, meshes });
    }
    // A patch is flat pigment on the hex top, and it is **not** the last thing
    // painted there: the ground layer's borders and roads cross it and stand
    // above it, by lift and by depth offset both. `GROUND_INK_OFFSET` in
    // `paintedGround.ts` is that rank, and the reason this layer's own material
    // may keep the `-1` every ground decal asks for.
    for (const [id, batch] of patches) {
      const key = `patches:${id}`;
      if (reuse(key, batch.geometries)) continue;
      const geometry = mergePaintedPatches(batch.geometries); if (!geometry) continue;
      this.merged.add(geometry);
      const meshes: Mesh[] = [];
      const cells = [...new Set(batch.cells)];
      for (const offset of [-period, 0, period]) {
        const mesh = new Mesh(geometry, batch.material);
        this.addWrapCopy(mesh, offset, cells, shadows);
        meshes.push(mesh);
      }
      this.batches.set(key, { region: batch.region, inputs: batch.geometries, meshes, geometry });
    }
    for (const [key, batch] of this.batches) {
      if (dirty.has(batch.region) && !retained.has(key)) this.deleteBatch(key);
    }
    // Over the reused batches too — they kept their buffers and so kept the flag
    // they were built with. See `setShadows`.
    this.setShadows(shadows);
  }

  /** Only a new copy needs its world matrix set. The works stay fixed until their batch is replaced. */
  private addWrapCopy(mesh: Mesh, offset: number, cells: number[], shadows: boolean): void {
    mesh.position.x = offset;
    mesh.receiveShadow = shadows;
    mesh.userData.paintedWorksCells = cells;
    mesh.userData.paintedWorksWrap = offset;
    this.group.add(mesh);
    mesh.updateMatrixWorld();
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldAutoUpdate = false;
  }

  /**
   * The recipes of the hexes with works that the seat cannot see yet, made a
   * few at a time in idle time. Returns a step: each call works until `timeUp`
   * says the slice is over, and answers true when every such hex has a recipe.
   *
   * The layer is built for the seat's eyes, so a hex the seat first sees at a
   * turn end had its recipe made in that turn end: the farm cuts and the
   * clipped patches, a fifth of the layer's rebuild at turn 130 (the fourth
   * render speed pass). Each recipe here is the one `build` would make for the
   * hex from the same state, with the same fields, and `build` checks every
   * recipe it reuses against the hex as it is then, so a recipe made too early
   * is made again. Nothing here is drawn.
   */
  warmRecipes(state: GameState, preparedMap: GameMap, levels: FogLevels = null, seat: number | null = null,
    options: PaintedWorksOptions = {}): (timeUp: () => boolean) => boolean {
    const cityCells = new Set(state.cities.map(city => tileIndex(state.map, city.col, city.row)));
    const stepAt = workAgeSteps(state);
    const previews = workGalleryPreviews.get(state.map);
    let cell = 0;
    return (timeUp) => {
      if (this.disposed || this.source || this.preparedMap !== preparedMap) return true;
      for (; cell < state.map.tiles.length; cell++) {
        if (timeUp()) return false;
        const original = state.map.tiles[cell]!;
        if (levelAt(levels, state.map, original.col, original.row) !== HIDDEN || cityCells.has(cell)) continue;
        const tile = preparedMap.tiles[cell]; if (!tile) continue;
        const resource = (options.suppressed?.get(cell) ?? 0) >= SUPPRESS.decor ? null : resourceAt(state, seat, original);
        const improvement = previews?.get(cell) ?? improvementAt(original);
        const damage = original.damagedImprovement?.id;
        if (!resource && !improvement && !damage) continue;
        const step = stepAt(cell, damage ? improvementBaseRow(damage) : improvement), recipe = this.recipes.get(cell);
        if (recipe && recipe.tile === tile && recipe.original === original && recipe.resource === resource && recipe.improvement === improvement
          && recipe.site === undefined && recipe.damage === damage && recipe.step === step) continue;
        this.deleteRecipe(cell);
        this.recipes.set(cell, this.createRecipe(original, tile, { cell, resource, improvement, damage, level: HIDDEN, step }));
      }
      return true;
    };
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
    if (this.shadowsEnabled === enabled) return;
    this.shadowsEnabled = enabled;
    for (const batch of this.batches.values()) for (const mesh of batch.meshes) {
      mesh.receiveShadow = enabled;
      if (mesh instanceof InstancedMesh) mesh.castShadow = enabled;
    }
  }

  private createRecipe(original: Tile, tile: Tile, entry: PaintedWorksEntry): Recipe {
    const recipe: Recipe = { tile, original, resource: entry.resource, improvement: entry.improvement, site: entry.site, damage: entry.damage, step: entry.step, props: [], patches: [], placements: [] };
    // Resource-only cells never need field clipping. Avoid tessellating a
    // second world just to place their few instanced silhouettes.
    const terraced = entry.improvement === 'terraces';
    const top = entry.improvement || entry.site || entry.damage ? ((terraced ? terraceFarmSurface(tile) : terrainMesh(tile)) as [BufferGeometry, BufferGeometry]) : null;
    const localSurface = top ? createTileSurfaceSampler(top[0], Math.sqrt(3) * (tile.col + tile.row % 2 * .5), tile.row * 1.5) : null;
    const height = (x: number, z: number): number => (localSurface ? localSurface(x, z) : samplePaintedSurface(original, x, z)) ?? surfaceHeight(tile, x, z) as number;
    try {
      let drawn = entry;
      if (entry.damage) {
        // These exports show intact works. The pillage layer draws their damaged ground.
        const wreck = isApprovedWork(entry.damage) ? undefined : improvementBaseRow(entry.damage);
        drawn = { ...entry, damage: wreck };
      } else if (terraced) drawn = { ...entry, improvement: undefined };
      const placement = {
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
      };
      this.art.tile(tile, drawn, top?.[0], placement);
      if (!entry.damage && isApprovedWork(entry.improvement) && top) {
        const shape = this.approved.get(entry.improvement);
        if (shape) {
          if (!this.pigment) {
            this.pigment = new MeshStandardMaterial({ vertexColors: true, roughness: .97,
              polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
            this.registerMaterial(this.pigment, { terrain: true });
          }
          recipe.fitted = placeApprovedWork(entry.improvement, shape, original, top[0], this.assets.material, this.pigment, placement);
        }
      }
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
  private clearMeshes(): void {
    for (const key of this.batches.keys()) this.deleteBatch(key);
    this.drawn.clear();
  }
  private deleteRecipe(cell: number): void {
    const recipe = this.recipes.get(cell); if (!recipe) return;
    recipe.fitted?.dispose();
    for (const patch of recipe.patches) patch.geometry.dispose(); this.recipes.delete(cell);
  }
  private clearRecipes(): void { for (const cell of this.recipes.keys()) this.deleteRecipe(cell); }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.clearMeshes(); this.clearRecipes(); this.art.dispose();
    for (const geometry of this.approved.values()) geometry.dispose();
    this.approved.clear(); this.pigment?.dispose();
    this.terrace.dispose(); this.terraceMaterial.dispose();
    for (const material of this.explored.values()) material.dispose(); this.explored.clear();
    this.entries.length = 0; this.placements.length = 0;
  }
}
