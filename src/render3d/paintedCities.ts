import {
  Box3, BufferGeometry, Color, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Matrix4,
  Mesh, MeshStandardMaterial, Quaternion, Vector3,
} from 'three';
import { mergePaintedPatches } from './paintedPatchPicking';
import { type GameMap, type Tile, getTileAt, tileIndex } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { type CityLook, capitalIds, cityLook } from './cities3d';
import { type FogLevels, knowsCell, seesCell } from './fog3d';
import { createTileSurfaceSampler } from './paintedTileSurface';
import { VIEW3D } from './lookData';
import { paintedCityGeometry } from './paintedCityGeometry';
import { NORTH_STAR_TOWER_HEIGHT, NORTH_STAR_WALL_HEIGHT, northStarTownGeometry } from './northStarTownGeometry';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { NORTH_STAR_TOWN_AGES, NORTH_STAR_TOWN_BEFORE } from '../terrainStudy/northStarAssets.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { centre, neighbour, onTileTop, surfaceHeight, tileShape } from '../terrainStudy/surface.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { surfacePatch } from '../terrainStudy/surfacePatch.js';

type CityAssetName = 'city-house' | 'city-loggia' | 'civic-sanctum' | 'city-spire' | 'city-dome' | 'house' | 'temple' | 'bell-tower'
  | 'monument-ziggurat' | 'monument-armillary' | 'monument-obelisk' | NorthStarHouse | NorthStarCentre;
type NorthStarHouse = `ns-house-${1 | 2 | 3}${'a' | 'b' | 'c'}` | `ns-house-3${'d' | 'e' | 'f'}` | 'ns-house-4a';
type NorthStarCentre = 'ns-hall' | 'ns-great-hut' | 'ns-great-house' | 'ns-hall-3' | 'ns-hall-4';
/** One tier's entry of `NORTH_STAR_TOWN_AGES`. */
type TownAge = { houses: NorthStarHouse[]; centre: NorthStarCentre; centreSize: number; smoke: number[] };

/**
 * The north-star look (the visual test, 2026-11-12; docs/art-pass.md): a town
 * raises monuments where it raised a small spire or dome. A shrine is an
 * obelisk, a temple a ziggurat, a wonder one of three shared landmarks, and the
 * capital keeps the magistrates' armillary sphere. Larger than the pieces they
 * replace, so a landmark reads as one at play zoom. Off, or with the models
 * not loaded, the study's pieces stand as before.
 */
const MONUMENTS = VIEW3D.visualTest.northStar ? VIEW3D.visualTest.monuments : null;
const WONDER_MONUMENTS = ['monument-obelisk', 'monument-ziggurat', 'monument-armillary'] as const;
/**
 * The town that fills its hex (the visual test, 2026-11-12; `docs/flags.md`
 * item (nnnnnnn), "Towns and works in the test scene"). On under the same
 * switch as the monuments, and only when the new houses are loaded, so a
 * renderer with the study's kit alone draws the study's town.
 */
const TOWN = VIEW3D.visualTest.northStar ? VIEW3D.visualTest.town : null;
const NORTH_STAR_HOUSE_NAMES = [1, 2, 3].flatMap(tier => ['a', 'b', 'c'].map(variant => `ns-house-${tier}${variant}` as NorthStarHouse));
type PrimaryCityAsset = Exclude<CityAssetName, 'house' | 'temple' | 'bell-tower' | NorthStarHouse | NorthStarCentre>;
export type PaintedCityAssets = { material: MeshStandardMaterial } & Record<PrimaryCityAsset, BufferGeometry> & Partial<Record<CityAssetName, BufferGeometry>>;
interface PaintedCityAnchor { x: number; y: number; z: number }
interface PaintedCityOptions { previewWalls?: boolean }
interface PaintedCityPlacement {
  cityId: number;
  kind: 'house' | 'civic' | 'capital' | 'shrine' | 'temple' | 'wonder' | 'wall' | 'gate';
  asset: string;
  x: number; y: number; z: number;
  scale: number; yaw: number;
  /** Canonical world coordinates, including the asset's asymmetric steps. */
  footprint: { x: number; z: number }[];
  foundationMin: number;
  foundationMax: number;
  roofMounted?: boolean;
}
type RegisterMaterial = (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown;
type Batch = { geometry: BufferGeometry; matrices: Matrix4[]; cells: number[] };
/**
 * One town's sculpt, built once and kept until the town changes.
 *
 * `tile`/`original` are identity, not contents, exactly as `PaintedWorksLayer`'s
 * recipes are: a new board is a new prepared map and every recipe goes with it.
 */
type CityRecipe = {
  key: string; cell: number; tile: Tile; original: Tile;
  parts: { geometry: BufferGeometry; matrices: Matrix4[] }[];
  patches: BufferGeometry[]; placements: PaintedCityPlacement[];
  anchor: PaintedCityAnchor; tallest: number;
  /**
   * Where the town's smoke starts: the smoke hole or chimney of its centre building. Null for a north-star
   * town where no centre fits, which then has no smoke. Absent for the study's town.
   */
  smoke?: PaintedCityAnchor | null;
};
type CityBatch = { inputs: readonly unknown[]; meshes: Mesh[]; geometry?: BufferGeometry };
/**
 * The two facts in a `CityLook` that no roof moves for.
 *
 * A town's faith and its yoke are printed on its **banner** — DOM over the board
 * (`cityBanners.ts`), never a stone — and `CityLook`'s own docblock says so. They
 * are in the layer's *fingerprint* because the banner rides `signCities`; they
 * are not in the *sculpt's* key, or converting a town would re-cut every wall
 * segment in it for a picture that came out identical.
 *
 * Everything else in the look is in the key **by construction** — `sculptKey`
 * walks the object rather than naming members, so a sixth sculpt fact added to
 * `CityLook` joins this cache the day it joins the picture, which is the whole
 * discipline that type exists for. Adding a name here is a deliberate claim that
 * the new fact draws nothing.
 */
const BANNER_ONLY: readonly string[] = ['religion', 'puppet'];
const sculptKey = (look: CityLook): string => Object.entries(look)
  .filter(([name]) => !BANNER_ONLY.includes(name))
  .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  .map(([name, value]) => `${name}=${String(value)}`).join(',');
const up = new Vector3(0, 1, 0);
const CITY = VIEW3D.city;
const GARRISON_RADIUS = VIEW3D.pieces.base.radius;
// Fixed addresses, rather than dividing a ring by population. Growth fills
// the next vacant address and never moves the buildings already standing.
const houseSlots = [
  [-.52, -.20, .43, .10], [.52, -.20, .43, -.12],
  [-.50, .22, .43, -.10], [.50, .22, .43, .12],
  [-.29, .53, .38, -.06], [.29, .53, .38, .10],
  [-.70, .04, .26, .02],
] as const;
const wonderSlots = [[-.60, -.36], [.60, -.36], [-.58, .40], [.58, .40]] as const;

function transform(x: number, z: number, yaw: number): { x: number; z: number } {
  return { x: x * Math.cos(yaw) + z * Math.sin(yaw), z: -x * Math.sin(yaw) + z * Math.cos(yaw) };
}

function nearestToCenter(points: readonly { x: number; z: number }[]): number {
  const sides = points.map((a, i) => {
    const b = points[(i + 1) % points.length]!;
    return (b.x - a.x) * -a.z - (b.z - a.z) * -a.x;
  });
  if (sides.every(side => side >= 0) || sides.every(side => side <= 0)) return 0;
  let nearest = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, -(a.x * dx + a.z * dz) / (dx * dx + dz * dz || 1)));
    nearest = Math.min(nearest, Math.hypot(a.x + dx * t, a.z + dz * t));
  }
  return nearest;
}

/**
 * Real cities using the approved sculpted kit. No fixtures or simulation writes.
 *
 * **A town is cut once.** The sculpt is expensive — a tile tessellated, a
 * polygon clipped per building footprint, and fifty-two or ninety-two wall
 * segments each sampling nine heights — and it was being cut again on every fog
 * move, which on a developed map is every step any unit takes. A recipe is kept
 * per town, keyed on everything the cut reads (`recipeKey`), and the batches over
 * those recipes are retained while their contents are identical by identity, so a
 * scout walking past a ten-town empire moves nothing at all.
 *
 * The heights come from the **tile's own triangles** (`createTileSurfaceSampler`)
 * rather than from a query against the whole world, which is the same swap the
 * works and the sites made: every point a town samples is inside its own hex —
 * `onTileTop` refuses a footprint that is not — so the narrower reading answers
 * the same question against a hundredth of the geometry.
 */
export class PaintedCityLayer {
  readonly group = new Group();
  readonly flagAnchors = new Map<number, PaintedCityAnchor>();
  readonly cityHeights = new Map<number, number>();
  /**
   * Where each north-star town's smoke starts, in world units, by city id (`PaintedSmokeLayer` reads it).
   * Null for a town with no centre building, which has no smoke.
   */
  readonly smokeAnchors = new Map<number, PaintedCityAnchor | null>();
  readonly placements: PaintedCityPlacement[] = [];
  private readonly geometry = paintedCityGeometry();
  private readonly northStar = northStarTownGeometry();
  private readonly fields: MeshStandardMaterial;
  private readonly recipes = new Map<number, CityRecipe>();
  private readonly batches = new Map<string, CityBatch>();
  private preparedMap: GameMap | undefined;
  private disposed = false;
  private casters = '';
  /** The north-star town's numbers, or null when the look is off or its houses are not loaded. */
  private readonly town: typeof TOWN;

  /**
   * What the static sun's bake needs to know about this layer, as one string:
   * every town the seat has charted that has been cut, with the key it was cut
   * with. The renderer re-bakes the static shadows when this changes, instead
   * of whenever any town anywhere changes.
   *
   * A town the seat cannot see is never re-cut, so a rival's town growing out
   * of sight leaves this alone. A town that drops from sight to memory keeps its
   * cut and so keeps its place here: the flip between seen and remembered is
   * deliberately not a bake (it happens on most unit steps near a border), as it
   * was before this key existed. A town seen again after it changed is re-cut on
   * that build, and the key moves then.
   */
  get shadowKey(): string { return this.casters; }

  constructor(private readonly assets: PaintedCityAssets, registerMaterial: RegisterMaterial) {
    this.group.name = 'painted-cities';
    this.town = TOWN && assets['ns-hall'] && NORTH_STAR_HOUSE_NAMES.every(name => assets[name]) ? TOWN : null;
    // The north-star town's ground is drawn over the roads (ground ink has an
    // offset of -2), so a road stops at the town's gate.
    const offset = this.town ? -3 : -1;
    this.fields = new MeshStandardMaterial({
      color: 'white', vertexColors: true, roughness: .96, flatShading: true, side: DoubleSide,
      polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset,
    });
    registerMaterial(this.fields, { terrain: true });
  }

  /**
   * Everything the cut reads, in one string.
   *
   * The cell fixes which hex's triangles are sampled *and* the wall jitter, which
   * hashes the town's own column and row (`vertical`, below). The population
   * decides how many house addresses are filled, the preview flag puts a
   * palisade on a town that has not built one, and `sculptKey` carries the look —
   * every member of it but the two the banner owns.
   *
   * A stale key here is a visible bug, so the pins in
   * `test/render/paintedCitiesCache.test.ts` walk each field and assert the key
   * moved. The prepared tile and the original tile are checked by **identity**
   * beside this string, because a new board is new triangles under the same town.
   */
  private recipeKey(city: City, cell: number, look: CityLook, options: PaintedCityOptions, roads: number): string {
    return `${cell}|${city.population}|${options.previewWalls === true}|${sculptKey(look)}${this.town ? `|roads=${roads}` : ''}`;
  }

  /**
   * The edges a road leaves the town by, one bit for each direction. The
   * north-star town opens a gate in its wall there. The rule is the road
   * painter's own (`planPaintedRoads`): both hexes are paved and neither is water.
   */
  private roadEdges(state: GameState, preparedMap: GameMap, original: Tile, tile: Tile): number {
    if (!this.town || original.road === undefined) return 0;
    let mask = 0;
    for (let d = 0; d < 6; d++) {
      const other = neighbour(tile, preparedMap, d) as Tile | null;
      const next = other ? getTileAt(state.map, other.col, other.row) : undefined;
      if (next && next.road !== undefined && !['ocean', 'coast', 'lake'].includes(next.terrain)) mask |= 1 << d;
    }
    return mask;
  }

  build(state: GameState, preparedMap: GameMap, levels: FogLevels = null, shadows = true, options: PaintedCityOptions = {}): void {
    if (this.disposed) return;
    if (this.preparedMap !== preparedMap) { this.clearBatches(); this.clearRecipes(); this.preparedMap = preparedMap; }
    this.flagAnchors.clear(); this.cityHeights.clear(); this.smokeAnchors.clear(); this.placements.length = 0;
    const batches = new Map<BufferGeometry, Batch>(), patches: BufferGeometry[] = [];
    const capitals = capitalIds(state), period = Math.sqrt(3) * state.map.width;
    const living = new Set<number>();
    for (const city of state.cities) {
      living.add(city.id);
      if (!seesCell(levels, state.map, city.col, city.row)) continue;
      const original = getTileAt(state.map, city.col, city.row);
      const tile = getTileAt(preparedMap, city.col, city.row);
      if (!original || !tile) continue;
      const cell = tileIndex(state.map, city.col, city.row);
      const look = cityLook(state, city, capitals);
      const roads = this.roadEdges(state, preparedMap, original, tile);
      const key = this.recipeKey(city, cell, look, options, roads);
      let recipe = this.recipes.get(city.id);
      if (!recipe || recipe.key !== key || recipe.tile !== tile || recipe.original !== original) {
        this.deleteRecipe(city.id);
        recipe = this.city(city, original, tile, look, options, cell, key, roads);
        this.recipes.set(city.id, recipe);
      }
      for (const part of recipe.parts) {
        let batch = batches.get(part.geometry);
        if (!batch) { batch = { geometry: part.geometry, matrices: [], cells: [] }; batches.set(part.geometry, batch); }
        for (const matrix of part.matrices) { batch.matrices.push(matrix); batch.cells.push(recipe.cell); }
      }
      patches.push(...recipe.patches);
      this.placements.push(...recipe.placements);
      this.flagAnchors.set(city.id, recipe.anchor);
      this.cityHeights.set(city.id, recipe.tallest);
      if (recipe.smoke !== undefined) this.smokeAnchors.set(city.id, recipe.smoke);
    }
    // A town razed takes its cut with it; a town merely out of sight keeps it,
    // because the fog will hand it back and nothing about the stones moved.
    for (const id of [...this.recipes.keys()]) if (!living.has(id)) this.deleteRecipe(id);
    // In the order of `state.cities`, so the key does not move when the recipe
    // map's insertion order does.
    this.casters = state.cities.map(city => {
      const recipe = this.recipes.get(city.id);
      return recipe && knowsCell(levels, state.map, city.col, city.row) ? `${city.id}:${recipe.key}` : '';
    }).join(',');
    const retained = new Set<string>();
    const reuse = (id: string, inputs: readonly unknown[]): boolean => {
      retained.add(id);
      const previous = this.batches.get(id);
      if (previous && previous.inputs.length === inputs.length && inputs.every((input, i) => input === previous.inputs[i])) return true;
      this.deleteBatch(id); return false;
    };
    for (const { geometry, matrices, cells } of batches.values()) {
      const id = `pieces:${geometry.id}`;
      if (reuse(id, matrices)) continue;
      const meshes: Mesh[] = [];
      // Only the world positions differ. All three meshes leave the batch together.
      const primary = new InstancedMesh(geometry, this.assets.material, matrices.length);
      matrices.forEach((matrix, i) => primary.setMatrixAt(i, matrix));
      // White lets towns use the same shader as the coloured improvement instances.
      primary.instanceColor = new InstancedBufferAttribute(new Float32Array(matrices.length * 3).fill(1), 3);
      primary.computeBoundingSphere();
      for (const offset of [-period, 0, period]) {
        const mesh = offset === -period ? primary : new InstancedMesh(geometry, this.assets.material, 0);
        if (mesh !== primary) {
          mesh.instanceMatrix = primary.instanceMatrix;
          mesh.instanceColor = primary.instanceColor;
          mesh.count = primary.count;
          mesh.boundingSphere = primary.boundingSphere;
        }
        mesh.position.x = offset; mesh.castShadow = shadows; mesh.receiveShadow = true;
        mesh.userData.paintedCityCells = cells;
        this.group.add(mesh); meshes.push(mesh);
      }
      this.batches.set(id, { inputs: [...matrices], meshes });
    }
    if (patches.length && !reuse('fields', patches)) {
      const geometry = mergePaintedPatches(patches)!;
      geometry.computeBoundingSphere();
      const meshes: Mesh[] = [];
      for (const offset of [-period, 0, period]) {
        const mesh = new Mesh(geometry, this.fields); mesh.position.x = offset;
        mesh.receiveShadow = true; this.group.add(mesh); meshes.push(mesh);
      }
      this.batches.set('fields', { inputs: [...patches], meshes, geometry });
    }
    for (const id of [...this.batches.keys()]) if (!retained.has(id)) this.deleteBatch(id);
    // Over the reused batches too. See `setShadows`.
    this.setShadows(shadows);
    this.group.updateMatrixWorld(true);
    this.group.traverse(object => { object.matrixAutoUpdate = false; object.matrixWorldAutoUpdate = false; });
  }

  /**
   * Shadows on or off, over the stones already standing.
   *
   * A building casts and receives; a town's ground pigment only receives, and
   * receives whether the sun is drawing shadows or not — a flat patch under the
   * walls has nothing to gain from being cut out of the receiving set. Both are
   * mesh flags, so the setting is written here instead of riding in the batch
   * key, where it made a toggle re-instance every town on the map and re-merge
   * all their fields.
   */
  setShadows(enabled: boolean): void {
    for (const batch of this.batches.values()) for (const mesh of batch.meshes)
      if (mesh instanceof InstancedMesh) mesh.castShadow = enabled;
  }

  /**
   * The models of a town at one tier of its look: `NORTH_STAR_TOWN_AGES` when
   * `visualTest.town.byAge` is on and the kit holds that tier's models, and the
   * town of before (`NORTH_STAR_TOWN_BEFORE`) otherwise.
   */
  private townAge(tier: number): TownAge {
    const index = tier - 1;
    const aged = (NORTH_STAR_TOWN_AGES as TownAge[])[index];
    if (aged && this.town?.byAge && this.assets[aged.centre] && aged.houses.every(name => this.assets[name])) return aged;
    const previous = NORTH_STAR_TOWN_BEFORE as TownAge[];
    return previous[Math.max(0, Math.min(index, previous.length - 1))]!;
  }

  private city(
    city: City, original: Tile, tile: Tile, look: CityLook,
    options: PaintedCityOptions, cell: number, key: string, roads = 0,
  ): CityRecipe {
    const c = centre(tile) as { x: number; z: number };
    const recipe: CityRecipe = { key, cell, tile, original, parts: [], patches: [], placements: [],
      anchor: { x: c.x, y: 0, z: c.z }, tallest: 0 };
    const [top, skirt] = terrainMesh(tile) as [BufferGeometry, BufferGeometry]; skirt.dispose();
    // The tile's own triangles, in world coordinates like everything else here.
    const surface = createTileSurfaceSampler(top, c.x, c.z);
    const height = (x: number, z: number): number => surface(x, z) ?? surfaceHeight(tile, x, z) as number;
    let tallest = height(0, 0);
    const parts = new Map<BufferGeometry, Matrix4[]>();
    const add = (geometry: BufferGeometry, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, yaw = 0): void => {
      let matrices = parts.get(geometry);
      if (!matrices) { matrices = []; parts.set(geometry, matrices); recipe.parts.push({ geometry, matrices }); }
      matrices.push(new Matrix4().compose(new Vector3(c.x + x, y, c.z + z), new Quaternion().setFromAxisAngle(up, yaw), new Vector3(sx, sy, sz)));
    };
    const patch = (polygon: number[][], pigment: string, lift = .007): void => {
      const geometry = surfacePatch(top, polygon.map(([x, z]) => [x! + c.x, z! + c.z]), new Color(pigment), lift) as BufferGeometry;
      if (geometry.getAttribute('position').count) recipe.patches.push(geometry); else geometry.dispose();
    };
    const bounds = (geometry: BufferGeometry): Box3 => { if (!geometry.boundingBox) geometry.computeBoundingBox(); return geometry.boundingBox!; };
    const footprint = (box: Box3, x: number, z: number, scale: number, yaw: number): { x: number; z: number }[] =>
      [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.max.x, box.max.z], [box.min.x, box.max.z]].map(([xx, zz]) => {
        const p = transform(xx! * scale, zz! * scale, yaw); return { x: x + p.x, z: z + p.z };
      });
    const building = (kind: PaintedCityPlacement['kind'], name: CityAssetName, x: number, z: number, desired: number, yaw = 0, roof?: number): PaintedCityPlacement | undefined => {
      const geometry = this.assets[name]; if (!geometry) return undefined;
      const box = bounds(geometry);
      let scale = desired, local = footprint(box, x, z, scale, yaw), fitted = false;
      for (const factor of [1, .94, .88, .80, .72, .64]) {
        scale = desired * factor; local = footprint(box, x, z, scale, yaw);
        fitted = local.every(p => onTileTop(tile, p.x, p.z, .018)) && nearestToCenter(local) >= GARRISON_RADIUS + .012;
        if (fitted) break;
      }
      if (!fitted) return undefined;
      const world = local.map(p => ({ x: c.x + p.x, z: c.z + p.z }));
      // Clipped triangle vertices include any ridge crossing the footprint's
      // interior; corner-only sampling can leave a hill poking through a floor.
      const clipped = surfacePatch(top, world.map(p => [p.x, p.z]), new Color('white'), 0) as BufferGeometry;
      const p = clipped.getAttribute('position');
      let min = Math.min(height(x, z), ...local.map(p => height(p.x, p.z)));
      let max = Math.max(height(x, z), ...local.map(p => height(p.x, p.z)));
      for (let i = 0; i < p.count; i++) { min = Math.min(min, p.getY(i)); max = Math.max(max, p.getY(i)); }
      clipped.dispose();
      const floor = roof ?? max + .010;
      if (roof === undefined) {
        const offset = transform((box.min.x + box.max.x) * scale * .5, (box.min.z + box.max.z) * scale * .5, yaw);
        add(this.geometry.foundation, x + offset.x, min - .018, z + offset.z,
          (box.max.x - box.min.x) * scale, floor - min + .018, (box.max.z - box.min.z) * scale, yaw);
      }
      add(geometry, x, floor, z, scale, scale, scale, yaw);
      tallest = Math.max(tallest, floor + box.max.y * scale);
      const placement: PaintedCityPlacement = {
        cityId: city.id, kind, asset: name, x: c.x + x, y: floor, z: c.z + z, scale, yaw,
        footprint: world, foundationMin: roof ?? min - .018, foundationMax: floor,
        ...(roof !== undefined ? { roofMounted: true } : {}),
      };
      recipe.placements.push(placement); return placement;
    };

    const grand = MONUMENTS && this.assets['monument-obelisk'] && this.assets['monument-ziggurat'] && this.assets['monument-armillary'] ? MONUMENTS : null;
    const town = this.town;
    if (town) {
      // The town that fills its hex. Every address is a fixed place, so a town
      // that grows fills the next free address and moves nothing that stands.
      const shape = tileShape(tile) as { normals: [number, number][]; upper: number[] };
      const radiusAt = (angle: number, inset: number): number => {
        let radius = town.wallRadius;
        shape.normals.forEach(([nx, nz], i) => {
          const dot = nx * Math.cos(angle) + nz * Math.sin(angle);
          if (dot > 0) radius = Math.min(radius, (shape.upper[i]! - inset) / dot);
        });
        return radius;
      };
      const ring = (count: number, inset: number): { x: number; z: number }[] => Array.from({ length: count }, (_, i) => {
        const angle = i * Math.PI * 2 / count, r = radiusAt(angle, inset);
        return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
      });
      const hash = (n: number): number => {
        let v = Math.imul(city.col + 29, 374761393) ^ Math.imul(city.row + 73, 668265263) ^ Math.imul(n + 1, 1274126177);
        v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
      };
      const walled = (look.walls && look.tier >= CITY.palisade.fromTier) || options.previewWalls === true;
      // The town's floor (the user, 2026-11-13: "more city-like ... similar to
      // the mine, where it somewhat transitions into the surrounding tile").
      // An open town's floor has an uneven edge that stops short of the hex
      // line, with loose patches of the same earth beyond it, so it runs out
      // into the ground. A walled town's floor fills the wall. On it lie a
      // paler square in the middle, lanes out to the houses, and paving stones
      // in two tones, thick near the middle and thin toward the edge.
      const floor = town.floor;
      if (!floor) patch(ring(36, town.wallInset).map(p => [p.x, p.z]), town.ground, town.groundLift);
      else {
        const edge = (angle: number): number => radiusAt(angle, town.wallInset) * (walled ? 1 : floor.reach + floor.ragged * (Math.sin(angle * 3 + hash(900) * 6.28) * .5 + Math.sin(angle * 5 + hash(901) * 6.28) * .3 + (hash(910 + Math.round(angle * 5.73)) - .5) * .6));
        const blob = (x: number, z: number, r: number, seed: number, sides = 6): number[][] => Array.from({ length: sides }, (_, k) => {
          const angle = k * Math.PI * 2 / sides + hash(seed) * 6.28, reach = r * (.7 + hash(seed + k + 1) * .5);
          return [x + Math.cos(angle) * reach, z + Math.sin(angle) * reach * .8];
        });
        patch(Array.from({ length: 36 }, (_, i) => { const angle = i * Math.PI * 2 / 36, r = edge(angle); return [Math.cos(angle) * r, Math.sin(angle) * r]; }), town.ground, town.groundLift);
        // Loose earth beyond an open town's edge.
        if (!walled) for (let i = 0; i < floor.fringe; i++) {
          const angle = hash(1000 + i) * 6.28, r = edge(angle) * (1.02 + hash(1040 + i) * .2);
          patch(blob(Math.cos(angle) * r, Math.sin(angle) * r, .05 + hash(1080 + i) * .07, 1100 + i * 9), town.ground, town.groundLift);
        }
        // The square, and a lane to each of the six sides.
        patch(blob(0, .05, floor.square, 1300, 8), town.street, town.groundLift + .002);
        for (let d = 0; d < 6; d++) {
          if (walled && d === 1) continue;
          const angle = d * Math.PI / 3 + Math.PI / 6 + (hash(1320 + d) - .5) * .3, r = edge(angle) * (.62 + hash(1330 + d) * .2), nx = -Math.sin(angle) * floor.lane, nz = Math.cos(angle) * floor.lane;
          patch([[nx, .05 + nz], [Math.cos(angle) * r + nx * .6, Math.sin(angle) * r + nz * .6], [Math.cos(angle) * r - nx * .6, Math.sin(angle) * r - nz * .6], [-nx, .05 - nz]], town.street, town.groundLift + .002);
        }
        // Paving stones.
        for (let i = 0; i < floor.stones; i++) {
          const angle = hash(1400 + i) * 6.28, r = Math.pow(hash(1500 + i), .8) * edge(angle) * .92;
          patch(blob(Math.cos(angle) * r, Math.sin(angle) * r, floor.stone * (.7 + hash(1600 + i) * .6), 1700 + i * 7, 5), hash(1800 + i) > .5 ? floor.paveLight : floor.paveDark, town.groundLift + .004);
        }
      }
      // The street to the front gate. A town with no wall has no gate, and no street.
      const gateZ = radiusAt(Math.PI * .5, town.wallInset);
      if (walled) patch([[-town.streetHalf, gateZ], [town.streetHalf, gateZ], [town.streetHalf, .27], [-town.streetHalf, .27]], town.street, town.groundLift + .002);
      // A piece is scaled so the longest side of its footprint is the address's size.
      const stand = (kind: PaintedCityPlacement['kind'], name: CityAssetName, address: readonly number[], factor = 1, turn = 0): PaintedCityPlacement | undefined => {
        const geometry = this.assets[name]; if (!geometry) return undefined;
        const box = bounds(geometry), [x, z, size, yaw] = address as [number, number, number, number];
        return building(kind, name, x, z, size * factor / Math.max(box.max.x - box.min.x, box.max.z - box.min.z), yaw + turn);
      };
      // Which house, and how far it turns, hash the town's own hex.
      // What this age's town is made of (`NORTH_STAR_TOWN_AGES`). The tier is the look's, so the centre and the
      // houses change with the fingerprint (`signCities`) and at no other time.
      const age = this.townAge(look.tier);
      const big = [...town.big], lots = [...town.lots], pockets = [...town.pockets];
      // The centre stands at the hall's address. A river or a beach along the back of the hex can refuse that
      // address, because nothing stands within a clearance of a river edge or on a beach (`onTileTop`). Many
      // starts are on a river, so the centre then takes the first big address or lot that fits it, at the
      // hall's size, and the houses take the addresses that are left. The hex decides this, so a town that
      // grows never moves its centre.
      const centreSize = (look.capital ? town.capitalHall : 1) * age.centreSize;
      let middle = stand('civic', age.centre, town.hall, centreSize);
      for (const pool of [big, lots]) for (let i = 0; !middle && i < pool.length; i++) {
        const [x, z] = pool[i]!;
        middle = stand('civic', age.centre, [x!, z!, town.hall[2]!, town.hall[3]!], centreSize);
        if (middle) pool.splice(i, 1);
      }
      // The smoke leaves the centre's own smoke hole or chimney, wherever the centre was fitted. A town with no
      // centre has no smoke (null), rather than smoke over an empty place.
      recipe.smoke = null;
      if (middle) {
        const [sx, sy, sz] = age.smoke as [number, number, number], p = transform(sx * middle.scale, sz * middle.scale, middle.yaw);
        recipe.smoke = { x: middle.x + p.x, y: middle.y + sy * middle.scale, z: middle.z + p.z };
      }
      if (grand) {
        const raise = (kind: PaintedCityPlacement['kind'], name: CityAssetName): void => {
          // An obelisk is narrow and takes a pocket. The other two want a big
          // address. With none left, the town raises an obelisk in a pocket.
          const wide = name !== 'monument-obelisk' ? big.shift() : undefined;
          const address = wide ?? pockets.shift() ?? big.shift();
          if (address) stand(kind, wide ? name : 'monument-obelisk', address, town.monumentSize);
        };
        if (look.hasWonder) {
          // Give the landmark a full building plot. Try the next one on a river or coast.
          const asset = WONDER_MONUMENTS[city.id % WONDER_MONUMENTS.length]!;
          for (const plots of [big, pockets, lots]) {
            const at = plots.findIndex(plot => stand('wonder', asset, plot, town.monumentSize) !== undefined);
            if (at >= 0) { plots.splice(at, 1); break; }
          }
        } else if (look.capital) raise('capital', 'monument-armillary');
        if (look.temple && look.tier >= CITY.temple.fromTier) raise('temple', 'monument-ziggurat');
        if (look.shrine && look.tier >= CITY.shrine.fromTier) raise('shrine', 'monument-obelisk');
      }
      const large = big.length, addresses = [...big, ...lots, ...pockets];
      // The count is of houses that stand. An address that the hex refuses (a river edge, a beach) passes to
      // the next one, so a town on a river still has its count. The refusal is the hex's own, so the houses
      // that stand before a town grows stand in the same places after it.
      const houses = Math.max(town.minHouses, city.population + town.housesOverPopulation);
      for (let i = 0, standing = 0; i < addresses.length && standing < houses; i++) {
        const name = age.houses[Math.floor(hash(i) * age.houses.length)]!;
        if (stand('house', name, addresses[i]!, i < large ? town.bigHouse : 1, (hash(i + 40) - .5) * 2 * town.yawJitter)) standing++;
      }
      if (walled) {
        const stone = look.tier >= CITY.wall.fromTier;
        // Walk the ring by distance, so the courses are one length on the
        // straight sides and round the corners alike.
        const samples = ring(360, town.wallInset), travelled = [0];
        for (let i = 1; i <= samples.length; i++) {
          const a = samples[i - 1]!, b = samples[i % samples.length]!;
          travelled.push(travelled[i - 1]! + Math.hypot(b.x - a.x, b.z - a.z));
        }
        const total = travelled[samples.length]!, count = Math.max(6, Math.round(total / (stone ? town.wallSpacing : town.stakeSpacing)));
        const at = (distance: number): { x: number; z: number } => {
          const d = ((distance % total) + total) % total;
          let i = 0; while (i < samples.length - 1 && travelled[i + 1]! < d) i++;
          const a = samples[i]!, b = samples[(i + 1) % samples.length]!, t = (d - travelled[i]!) / (travelled[i + 1]! - travelled[i]! || 1);
          return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
        };
        const post = (geometry: BufferGeometry, asset: string, x: number, z: number, halfX: number, halfZ: number,
          sx: number, sy: number, sz: number, tall: number, yaw: number): boolean => {
          const foot = [[-halfX, -halfZ], [halfX, -halfZ], [halfX, halfZ], [-halfX, halfZ]].map(([xx, zz]) => {
            const p = transform(xx!, zz!, yaw); return { x: x + p.x, z: z + p.z };
          });
          if (!onTileTop(tile, x, z, .012) || !foot.every(p => onTileTop(tile, p.x, p.z, .004))) return false;
          const points = [...foot, ...foot.map((a, j) => {
            const b = foot[(j + 1) % foot.length]!; return { x: (a.x + b.x) * .5, z: (a.z + b.z) * .5 };
          }), { x, z }];
          const heights = points.map(p => height(p.x, p.z)), min = Math.min(...heights), max = Math.max(...heights);
          add(geometry, x, min - .006, z, sx, sy + (max - min) / tall, sz, yaw);
          tallest = Math.max(tallest, max + tall * sy);
          recipe.placements.push({ cityId: city.id, kind: 'wall', asset, x: c.x + x, y: min - .006, z: c.z + z,
            scale: sx, yaw, footprint: foot.map(p => ({ x: c.x + p.x, z: c.z + p.z })), foundationMin: min - .006, foundationMax: max });
          return true;
        };
        // A gate stands where the street leaves the ring at the front, and
        // where each road does: two posts and a lintel.
        const gates = [Math.PI * .5, ...[0, 1, 2, 3, 4, 5].filter(d => roads & (1 << d)).map(d => d * Math.PI / 3)];
        const inGate = (p: { x: number; z: number }, pad: number): boolean => gates.some(angle => {
          const ux = Math.cos(angle), uz = Math.sin(angle);
          return p.x * ux + p.z * uz > 0 && Math.abs(p.x * uz - p.z * ux) < town.gateHalf + pad;
        });
        const length = total / count;
        for (let i = 0; i < count; i++) {
          const p = at(i * length), before = at(i * length - .01), after = at(i * length + .01);
          if (inGate(p, stone ? length * .5 : 0)) continue;
          const yaw = -Math.atan2(after.z - before.z, after.x - before.x);
          if (stone) post(this.northStar.wall, 'ns-wall', p.x, p.z, length * .5, .0375, length * 1.04, town.wallHeight, 1, NORTH_STAR_WALL_HEIGHT, yaw);
          else post(this.geometry.stake, 'stake', p.x, p.z, .022 * 1.6, .022 * 1.6, 1.6,
            1.25 + .2 * (.5 + .5 * Math.sin(city.col * 73 + city.row * 19 + i * 17)), 1.6, .205, yaw);
        }
        if (stone) for (const corner of [30, 150, 210, 270, 330]) {
          const angle = corner * Math.PI / 180, r = radiusAt(angle, town.wallInset);
          post(this.northStar.tower, 'ns-tower', Math.cos(angle) * r, Math.sin(angle) * r, .06, .06, town.towerSize, town.towerSize, town.towerSize, NORTH_STAR_TOWER_HEIGHT, 0);
        }
        for (const angle of gates) {
          const spread = Math.atan2(town.gateHalf, radiusAt(angle, town.wallInset));
          const posts = [-1, 1].map(side => {
            const a = angle + side * spread, r = radiusAt(a, town.wallInset + town.gateInset);
            return { x: Math.cos(a) * r, z: Math.sin(a) * r };
          });
          const size = town.towerSize * (angle === gates[0] ? town.gateTower : town.roadGateTower);
          const raised = posts.map(p => stone
            ? post(this.northStar.tower, 'ns-tower', p.x, p.z, .035, .035, size, size, size, NORTH_STAR_TOWER_HEIGHT, 0)
            : post(this.geometry.stake, 'stake', p.x, p.z, .03, .03, 2.2, 1.9, 2.2, .205, 0));
          if (!raised.every(Boolean)) continue;
          const [a, b] = posts as [{ x: number; z: number }, { x: number; z: number }];
          const gateY = Math.max(height(a.x, a.z), height(b.x, b.z)) + (stone ? NORTH_STAR_TOWER_HEIGHT * size * .78 : .30);
          add(stone ? this.northStar.lintel : this.geometry.rail, (a.x + b.x) * .5, gateY, (a.z + b.z) * .5,
            Math.hypot(b.x - a.x, b.z - a.z), stone ? 1 : 1.8, stone ? 1 : 1.8, -Math.atan2(b.z - a.z, b.x - a.x));
          recipe.placements.push({ cityId: city.id, kind: 'gate', asset: stone ? 'ns-lintel' : 'rail', x: c.x + (a.x + b.x) * .5, y: gateY, z: c.z + (a.z + b.z) * .5,
            scale: Math.hypot(b.x - a.x, b.z - a.z), yaw: 0, footprint: posts.map(p => ({ x: c.x + p.x, z: c.z + p.z })), foundationMin: gateY, foundationMax: gateY });
        }
      }
    } else {
      patch([[-.54, -.49], [.38, -.58], [.68, -.18], [.55, .52], [-.51, .57], [-.69, .11]], '#b8b693');
      patch([[-.11, .79], [.11, .79], [.105, .27], [-.10, .27]], '#cdc3a0', .009);
      // The monumental capital remains legible at population one. Its front
      // steps stop behind the garrison court rather than under the unit's base.
      const studyTier = Math.min(look.tier, 3) - 1;
      const civic = look.capital ? 'civic-sanctum' : 'city-loggia';
      building('civic', civic, 0, -.58, look.capital ? [.59, .64, .70][studyTier]! : [.59, .65, .70][studyTier]!);
      const houses = Math.max(1, Math.min(city.population, CITY.houseCap, houseSlots.length));
      for (let i = 0; i < houses; i++) {
        const [x, z, scale, yaw] = houseSlots[i]!;
        const name = look.tier === 1 && this.assets.house ? 'house' : look.tier >= 3 && i % 3 === 1 ? 'city-dome' : i % 3 === 2 ? 'city-loggia' : 'city-house';
        building('house', name, x, z, scale * [1, 1.08, 1.14][studyTier]!, yaw);
      }
      if (look.shrine && look.tier >= CITY.shrine.fromTier) building('shrine', grand ? 'monument-obelisk' : 'city-spire', -.33, -.52, grand ? grand.shrine : .38);
      if (look.temple && look.tier >= CITY.temple.fromTier) building('temple', grand ? 'monument-ziggurat' : 'city-dome', .34, -.50, grand ? grand.temple : .48);
      if (look.hasWonder) {
        const asset = grand ? WONDER_MONUMENTS[city.id % WONDER_MONUMENTS.length]! : 'city-spire';
        for (const [x, z] of wonderSlots) {
          if (building('wonder', asset, x, z, grand ? grand.wonder : .25)) break;
        }
      } else if (grand && look.capital) {
        building('capital', 'monument-armillary', grand.capitalAt[0]!, grand.capitalAt[1]!, grand.capital);
      }
      if ((look.walls && look.tier >= CITY.palisade.fromTier) || options.previewWalls) {
        const shape = tileShape(tile) as { normals: [number, number][]; upper: number[] };
        const stone = look.tier >= CITY.wall.fromTier, count = stone ? 52 : 92;
        const radiusAt = (angle: number): number => {
          let radius = .78 + .014 * Math.sin(angle * 5);
          shape.normals.forEach(([nx, nz], i) => {
            const dot = nx * Math.cos(angle) + nz * Math.sin(angle);
            if (dot > 0) radius = Math.min(radius, (shape.upper[i]! - (stone ? .06 : .04)) / dot);
          });
          return radius;
        };
        for (let i = 0; i < count; i++) {
          const angle = i * Math.PI * 2 / count;
          if (angle > 1.28 && angle < 1.86) continue;
          const r = radiusAt(angle), x = Math.cos(angle) * r, z = Math.sin(angle) * r;
          if (!onTileTop(tile, x, z, .025)) continue;
          const scale = stone ? Math.PI * 2 * r / count * 1.03 : 1.42;
          const vertical = stone ? 1.15 : 1.10 + .2 * (.5 + .5 * Math.sin(city.col * 73 + city.row * 19 + i * 17));
          const yaw = stone ? -angle - Math.PI * .5 : angle;
          const halfX = stone ? scale * .5 : .022 * 1.42, halfZ = stone ? .030 : .022 * 1.42;
          const foot = [[-halfX, -halfZ], [halfX, -halfZ], [halfX, halfZ], [-halfX, halfZ]].map(([xx, zz]) => {
            const p = transform(xx!, zz!, yaw); return { x: x + p.x, z: z + p.z };
          });
          if (!foot.every(p => onTileTop(tile, p.x, p.z, .004))) continue;
          const points = [...foot, ...foot.map((a, j) => {
            const b = foot[(j + 1) % foot.length]!; return { x: (a.x + b.x) * .5, z: (a.z + b.z) * .5 };
          }), { x, z }];
          const heights = points.map(p => height(p.x, p.z)), min = Math.min(...heights), max = Math.max(...heights);
          add(stone ? this.geometry.stoneWall : this.geometry.stake, x, min - .006, z,
            scale, vertical + (max - min) / .205, stone ? 1 : 1.42, yaw);
          tallest = Math.max(tallest, max + .21 * vertical);
          recipe.placements.push({ cityId: city.id, kind: 'wall', asset: stone ? 'stoneWall' : 'stake', x: c.x + x, y: min - .006, z: c.z + z,
            scale, yaw, footprint: foot.map(p => ({ x: c.x + p.x, z: c.z + p.z })), foundationMin: min - .006, foundationMax: max });
        }
        // An unsupported lintel is especially visible on a cut shoreline. The
        // gate is one assembly, admitted only when both full support pads fit.
        const supports = [-.22, .22].flatMap(x => [-.044, .044].flatMap(dx => [-.044, .044].map(dz => ({ x: x + dx, z: .75 + dz }))));
        if (supports.every(p => onTileTop(tile, p.x, p.z, .004))) {
          for (const x of [-.22, .22]) add(this.geometry.stake, x, height(x, .75), .75, 2, 1.6, 2);
          const gateY = Math.max(height(-.22, .75), height(.22, .75)) + .26;
          add(this.geometry.rail, 0, gateY, .75, .47, 1.5, 1.5);
          recipe.placements.push({ cityId: city.id, kind: 'gate', asset: 'rail', x: c.x, y: gateY, z: c.z + .75, scale: .47, yaw: 0,
            footprint: supports.map(p => ({ x: c.x + p.x, z: c.z + p.z })), foundationMin: gateY, foundationMax: gateY });
        }
      }
    }
    recipe.anchor = { x: c.x + .30, y: height(.30, .08) + .008, z: c.z + .08 };
    recipe.tallest = tallest;
    top.dispose();
    return recipe;
  }

  private deleteBatch(id: string): void {
    const batch = this.batches.get(id); if (!batch) return;
    for (const mesh of batch.meshes) { this.group.remove(mesh); if (mesh instanceof InstancedMesh) mesh.dispose(); }
    batch.geometry?.dispose();
    this.batches.delete(id);
  }
  private clearBatches(): void { for (const id of [...this.batches.keys()]) this.deleteBatch(id); this.group.clear(); }
  private deleteRecipe(id: number): void {
    const recipe = this.recipes.get(id); if (!recipe) return;
    for (const patch of recipe.patches) patch.dispose();
    this.recipes.delete(id);
  }
  private clearRecipes(): void { for (const id of [...this.recipes.keys()]) this.deleteRecipe(id); }

  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.clearBatches(); this.clearRecipes(); this.fields.dispose();
    this.flagAnchors.clear(); this.cityHeights.clear(); this.smokeAnchors.clear(); this.placements.length = 0;
    Object.values(this.geometry).forEach(geometry => geometry.dispose());
    Object.values(this.northStar).forEach(geometry => geometry.dispose());
  }
}
