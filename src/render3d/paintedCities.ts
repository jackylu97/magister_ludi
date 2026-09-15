import {
  Box3, BufferGeometry, Color, DoubleSide, Group, InstancedMesh, Matrix4,
  Mesh, MeshStandardMaterial, Quaternion, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type GameMap, type Tile, getTileAt, tileIndex } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { type CityLook, capitalIds, cityLook } from './cities3d';
import { type FogLevels, seesCell } from './fog3d';
import { createTileSurfaceSampler } from './paintedTileSurface';
import { VIEW3D } from './lookData';
import { paintedCityGeometry } from './paintedCityGeometry';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { centre, onTileTop, surfaceHeight, tileShape } from '../terrainStudy/surface.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { surfacePatch } from '../terrainStudy/surfacePatch.js';

type CityAssetName = 'city-house' | 'city-loggia' | 'civic-sanctum' | 'city-spire' | 'city-dome' | 'house' | 'temple' | 'bell-tower';
type PrimaryCityAsset = Exclude<CityAssetName, 'house' | 'temple' | 'bell-tower'>;
export type PaintedCityAssets = { material: MeshStandardMaterial } & Record<PrimaryCityAsset, BufferGeometry> & Partial<Record<CityAssetName, BufferGeometry>>;
export interface PaintedCityAnchor { x: number; y: number; z: number }
export interface PaintedCityOptions { previewWalls?: boolean }
export interface PaintedCityPlacement {
  cityId: number;
  kind: 'house' | 'civic' | 'shrine' | 'temple' | 'wonder' | 'wall' | 'gate';
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
  readonly placements: PaintedCityPlacement[] = [];
  private readonly geometry = paintedCityGeometry();
  private readonly fields: MeshStandardMaterial;
  private readonly recipes = new Map<number, CityRecipe>();
  private readonly batches = new Map<string, CityBatch>();
  private preparedMap: GameMap | undefined;
  private disposed = false;

  constructor(private readonly assets: PaintedCityAssets, registerMaterial: RegisterMaterial) {
    this.group.name = 'painted-cities';
    this.fields = new MeshStandardMaterial({
      color: 'white', vertexColors: true, roughness: .96, flatShading: true, side: DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
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
  private recipeKey(city: City, cell: number, look: CityLook, options: PaintedCityOptions): string {
    return `${cell}|${city.population}|${options.previewWalls === true}|${sculptKey(look)}`;
  }

  build(state: GameState, preparedMap: GameMap, levels: FogLevels = null, shadows = true, options: PaintedCityOptions = {}): void {
    if (this.disposed) return;
    if (this.preparedMap !== preparedMap) { this.clearBatches(); this.clearRecipes(); this.preparedMap = preparedMap; }
    this.flagAnchors.clear(); this.cityHeights.clear(); this.placements.length = 0;
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
      const key = this.recipeKey(city, cell, look, options);
      let recipe = this.recipes.get(city.id);
      if (!recipe || recipe.key !== key || recipe.tile !== tile || recipe.original !== original) {
        this.deleteRecipe(city.id);
        recipe = this.city(city, original, tile, look, options, cell, key);
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
    }
    // A town razed takes its cut with it; a town merely out of sight keeps it,
    // because the fog will hand it back and nothing about the stones moved.
    for (const id of [...this.recipes.keys()]) if (!living.has(id)) this.deleteRecipe(id);
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
      for (const offset of [-period, 0, period]) {
        const mesh = new InstancedMesh(geometry, this.assets.material, matrices.length);
        matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        mesh.position.x = offset; mesh.castShadow = shadows; mesh.receiveShadow = true;
        mesh.userData.paintedCityCells = cells;
        mesh.computeBoundingSphere(); this.group.add(mesh); meshes.push(mesh);
      }
      this.batches.set(id, { inputs: [...matrices], meshes });
    }
    if (patches.length && !reuse('fields', patches)) {
      const geometry = mergeGeometries(patches)!;
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

  private city(
    city: City, original: Tile, tile: Tile, look: CityLook,
    options: PaintedCityOptions, cell: number, key: string,
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

    patch([[-.54, -.49], [.38, -.58], [.68, -.18], [.55, .52], [-.51, .57], [-.69, .11]], '#b8b693');
    patch([[-.11, .79], [.11, .79], [.105, .27], [-.10, .27]], '#cdc3a0', .009);
    // The monumental capital remains legible at population one. Its front
    // steps stop behind the garrison court rather than under the unit's base.
    const civic = look.capital ? 'civic-sanctum' : 'city-loggia';
    building('civic', civic, 0, -.58, look.capital ? [.59, .64, .70][look.tier - 1]! : [.59, .65, .70][look.tier - 1]!);
    const houses = Math.max(1, Math.min(city.population, CITY.houseCap, houseSlots.length));
    for (let i = 0; i < houses; i++) {
      const [x, z, scale, yaw] = houseSlots[i]!;
      const name = look.tier === 1 && this.assets.house ? 'house' : look.tier >= 3 && i % 3 === 1 ? 'city-dome' : i % 3 === 2 ? 'city-loggia' : 'city-house';
      building('house', name, x, z, scale * [1, 1.08, 1.14][look.tier - 1]!, yaw);
    }
    if (look.shrine && look.tier >= CITY.shrine.fromTier) building('shrine', 'city-spire', -.33, -.52, .38);
    if (look.temple && look.tier >= CITY.temple.fromTier) building('temple', 'city-dome', .34, -.50, .48);
    for (let i = 0; i < look.wonders; i++) {
      const [x, z] = wonderSlots[i % wonderSlots.length]!;
      const storey = Math.floor(i / wonderSlots.length);
      building('wonder', 'city-spire', x, z, .25, 0, storey ? height(x, z) + .010 + storey * .285 : undefined);
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
    this.flagAnchors.clear(); this.cityHeights.clear(); this.placements.length = 0;
    Object.values(this.geometry).forEach(geometry => geometry.dispose());
  }
}
