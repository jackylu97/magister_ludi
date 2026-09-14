import {
  Box3, BufferGeometry, Color, DoubleSide, Group, InstancedMesh, Matrix4,
  Mesh, MeshStandardMaterial, Quaternion, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type GameMap, type Tile, getTileAt, tileIndex } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { type CityLook, capitalIds, cityLook } from './cities3d';
import { type FogLevels, seesCell } from './fog3d';
import { samplePaintedSurface } from './paintedSurface';
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

/** Real cities using the approved sculpted kit. No fixtures or simulation writes. */
export class PaintedCityLayer {
  readonly group = new Group();
  readonly flagAnchors = new Map<number, PaintedCityAnchor>();
  readonly cityHeights = new Map<number, number>();
  readonly placements: PaintedCityPlacement[] = [];
  private readonly geometry = paintedCityGeometry();
  private readonly fields: MeshStandardMaterial;
  private readonly generated = new Set<BufferGeometry>();
  private disposed = false;

  constructor(private readonly assets: PaintedCityAssets, registerMaterial: RegisterMaterial) {
    this.group.name = 'painted-cities';
    this.fields = new MeshStandardMaterial({
      color: 'white', vertexColors: true, roughness: .96, flatShading: true, side: DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    registerMaterial(this.fields, { terrain: true });
  }

  build(state: GameState, preparedMap: GameMap, levels: FogLevels = null, shadows = true, options: PaintedCityOptions = {}): void {
    if (this.disposed) return;
    this.clear();
    const batches = new Map<BufferGeometry, Batch>(), patches: BufferGeometry[] = [];
    const capitals = capitalIds(state), period = Math.sqrt(3) * state.map.width;
    for (const city of state.cities) {
      if (!seesCell(levels, state.map, city.col, city.row)) continue;
      const original = getTileAt(state.map, city.col, city.row);
      const tile = getTileAt(preparedMap, city.col, city.row);
      if (!original || !tile) continue;
      this.city(state, city, original, tile, cityLook(state, city, capitals), batches, patches, options);
    }
    for (const { geometry, matrices, cells } of batches.values()) {
      for (const offset of [-period, 0, period]) {
        const mesh = new InstancedMesh(geometry, this.assets.material, matrices.length);
        matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        mesh.position.x = offset; mesh.castShadow = shadows; mesh.receiveShadow = true;
        mesh.userData.paintedCityCells = cells;
        mesh.computeBoundingSphere(); this.group.add(mesh);
      }
    }
    if (patches.length) {
      const geometry = mergeGeometries(patches)!; patches.forEach(patch => patch.dispose());
      this.generated.add(geometry); geometry.computeBoundingSphere();
      for (const offset of [-period, 0, period]) {
        const mesh = new Mesh(geometry, this.fields); mesh.position.x = offset;
        mesh.receiveShadow = true; this.group.add(mesh);
      }
    }
    this.group.updateMatrixWorld(true);
    this.group.traverse(object => { object.matrixAutoUpdate = false; object.matrixWorldAutoUpdate = false; });
  }

  private city(
    state: GameState, city: City, original: Tile, tile: Tile, look: CityLook,
    batches: Map<BufferGeometry, Batch>, patches: BufferGeometry[], options: PaintedCityOptions,
  ): void {
    const c = centre(tile) as { x: number; z: number }, cell = tileIndex(state.map, city.col, city.row);
    const [top, skirt] = terrainMesh(tile) as [BufferGeometry, BufferGeometry]; skirt.dispose();
    const height = (x: number, z: number): number => samplePaintedSurface(original, x, z) ?? surfaceHeight(tile, x, z) as number;
    let tallest = height(0, 0);
    const add = (geometry: BufferGeometry, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, yaw = 0): void => {
      if (!batches.has(geometry)) batches.set(geometry, { geometry, matrices: [], cells: [] });
      const batch = batches.get(geometry)!;
      batch.matrices.push(new Matrix4().compose(new Vector3(c.x + x, y, c.z + z), new Quaternion().setFromAxisAngle(up, yaw), new Vector3(sx, sy, sz)));
      batch.cells.push(cell);
    };
    const patch = (polygon: number[][], pigment: string, lift = .007): void => {
      const geometry = surfacePatch(top, polygon.map(([x, z]) => [x! + c.x, z! + c.z]), new Color(pigment), lift) as BufferGeometry;
      if (geometry.getAttribute('position').count) patches.push(geometry); else geometry.dispose();
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
      this.placements.push(placement); return placement;
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
        this.placements.push({ cityId: city.id, kind: 'wall', asset: stone ? 'stoneWall' : 'stake', x: c.x + x, y: min - .006, z: c.z + z,
          scale, yaw, footprint: foot.map(p => ({ x: c.x + p.x, z: c.z + p.z })), foundationMin: min - .006, foundationMax: max });
      }
      // An unsupported lintel is especially visible on a cut shoreline. The
      // gate is one assembly, admitted only when both full support pads fit.
      const supports = [-.22, .22].flatMap(x => [-.044, .044].flatMap(dx => [-.044, .044].map(dz => ({ x: x + dx, z: .75 + dz }))));
      if (supports.every(p => onTileTop(tile, p.x, p.z, .004))) {
        for (const x of [-.22, .22]) add(this.geometry.stake, x, height(x, .75), .75, 2, 1.6, 2);
        const gateY = Math.max(height(-.22, .75), height(.22, .75)) + .26;
        add(this.geometry.rail, 0, gateY, .75, .47, 1.5, 1.5);
        this.placements.push({ cityId: city.id, kind: 'gate', asset: 'rail', x: c.x, y: gateY, z: c.z + .75, scale: .47, yaw: 0,
          footprint: supports.map(p => ({ x: c.x + p.x, z: c.z + p.z })), foundationMin: gateY, foundationMax: gateY });
      }
    }
    this.flagAnchors.set(city.id, { x: c.x + .30, y: height(.30, .08) + .008, z: c.z + .08 });
    this.cityHeights.set(city.id, tallest);
    top.dispose();
  }

  private clear(): void {
    this.group.traverse(object => { if (object instanceof InstancedMesh) object.dispose(); });
    this.group.clear();
    for (const geometry of this.generated) geometry.dispose(); this.generated.clear();
    this.flagAnchors.clear(); this.cityHeights.clear(); this.placements.length = 0;
  }

  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.clear(); this.fields.dispose();
    Object.values(this.geometry).forEach(geometry => geometry.dispose());
  }
}
