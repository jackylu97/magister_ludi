/**
 * Exact terrain queries for an opted-in painted board. Registrations belong to
 * one map and its simulation tile objects; the ordinary renderer never sees
 * them. Meshes are borrowed from the board and remain the board's to dispose.
 */
import { Box3, BufferAttribute, BufferGeometry, type Intersection, InstancedMesh, type Mesh, Raycaster, Vector3 } from 'three';
import { createTileSurfaceSampler } from './paintedTileSurface';
import { hexToPixel, pixelToHex } from '../sim/hex';
import { type GameMap, type Tile, axialToOffset, offsetToAxial } from '../sim/map';
import type { Ray } from './camera3d';
import { VIEW3D } from './lookData';

interface SurfaceMesh {
  mesh: Mesh;
  bounds: Box3;
  sample?: (x: number, z: number) => number | undefined;
}

interface SurfaceRegistration {
  map: GameMap;
  meshes: SurfaceMesh[];
  columns: Map<string, SurfaceMesh[]>;
  raycaster: Raycaster;
  top: number;
  centerHeights: WeakMap<Tile, number>;
}

export interface PaintedPickResult {
  tile: Tile;
  col: number;
  row: number;
  worldCol: number;
}

const maps = new WeakMap<GameMap, SurfaceRegistration>();
const tiles = new WeakMap<Tile, SurfaceRegistration>();
const radius = VIEW3D.board.hexRadius;
const gridSize = 6 * Math.sqrt(3) * radius;
const gridKey = (x: number, z: number): string =>
  `${Math.floor(x / gridSize)},${Math.floor(z / gridSize)}`;

function center(tile: Tile): { x: number; z: number } {
  const point = hexToPixel(offsetToAxial(tile.col, tile.row), radius);
  return { x: point.x, z: point.y };
}

/**
 * Install after the board has positioned all wrap copies. Near terrain meshes
 * stay queryable even when an LOD switch hides them. A paintedCell attribute
 * names each triangle's (or instance's) original tile. paintedPickOnly meshes
 * contribute silhouettes to pointer picking while leaving ground heights alone.
 * The prepared map supplies only the shape check, never simulation tile identity.
 */
export function installPaintedSurface(
  map: GameMap,
  preparedMap: Pick<GameMap, 'width' | 'height' | 'tiles'>,
  pickMeshes: readonly Mesh[],
): void {
  if (preparedMap.width !== map.width || preparedMap.height !== map.height ||
      preparedMap.tiles.length !== map.tiles.length) {
    throw new Error('Painted terrain must match the gameplay map dimensions.');
  }
  uninstallPaintedSurface(map);
  const registration: SurfaceRegistration = {
    map, meshes: [], columns: new Map(), raycaster: new Raycaster(),
    top: 1, centerHeights: new WeakMap(),
  };
  for (const mesh of pickMeshes) {
    mesh.updateWorldMatrix(true, false);
    // A prop batch's instances are scattered over its chunk. The shared rock
    // geometry's local box only encloses one unplaced sculpt at the origin.
    if (mesh instanceof InstancedMesh) {
      if (!mesh.boundingBox) mesh.computeBoundingBox();
    } else if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const localBounds = mesh instanceof InstancedMesh ? mesh.boundingBox : mesh.geometry.boundingBox;
    const bounds = localBounds?.clone().applyMatrix4(mesh.matrixWorld);
    if (!bounds || bounds.isEmpty()) continue;
    const entry = { mesh, bounds };
    registration.meshes.push(entry);
    if (mesh.userData.paintedPickOnly) continue;
    registration.top = Math.max(registration.top, bounds.max.y + 1);
    // Vertical samples examine only nearby terrain. This index is independent
    // of chunk dimensions and includes the transformed east/west copies.
    const minX = Math.floor(bounds.min.x / gridSize);
    const maxX = Math.floor(bounds.max.x / gridSize);
    const minZ = Math.floor(bounds.min.z / gridSize);
    const maxZ = Math.floor(bounds.max.z / gridSize);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const key = `${x},${z}`;
      const column = registration.columns.get(key);
      if (column) column.push(entry);
      else registration.columns.set(key, [entry]);
    }
  }
  maps.set(map, registration);
  for (const tile of map.tiles) tiles.set(tile, registration);
}

export function uninstallPaintedSurface(map: GameMap): void {
  const registration = maps.get(map);
  if (!registration) return;
  for (const tile of map.tiles) {
    if (tiles.get(tile) === registration) tiles.delete(tile);
  }
  maps.delete(map);
}

function intersect(
  registration: SurfaceRegistration,
  entries: readonly SurfaceMesh[],
  accepts?: (hit: Intersection) => boolean,
): Intersection | undefined {
  const { raycaster } = registration;
  const candidates = entries
    .filter(({ bounds }) => raycaster.ray.intersectsBox(bounds))
    .map(({ mesh }) => mesh);
  const hits = raycaster.intersectObjects(candidates, false);
  return accepts ? hits.find(accepts) : hits[0];
}

function paintedCell(hit: Intersection): number {
  const attribute = (hit.object as Mesh).geometry.getAttribute('paintedCell');
  const index = hit.instanceId ?? hit.face?.a;
  return attribute && index !== undefined ? Math.round(attribute.getX(index)) : -1;
}

function acceptsPointerHit(hit: Intersection): boolean {
  const metadata = hit.object.userData;
  if (!metadata.paintedPickOnly) return true;
  const visible = metadata.paintedCellVisible;
  // Ground remains available for exploration orders, but an invisible prop
  // cannot intercept a click aimed at visible ground behind its silhouette.
  if (typeof visible !== 'function') return true;
  const index = hit.instanceId ?? hit.face?.a;
  const attribute = (hit.object as Mesh).geometry.getAttribute('paintedSuppress');
  const grade = attribute && index !== undefined ? attribute.getX(index) : 0;
  return visible(paintedCell(hit), grade);
}

/** Height on the actual rendered triangles, or undefined for an ordinary tile. */
export function samplePaintedSurface(tile: Tile, localX = 0, localZ = 0): number | undefined {
  const registration = tiles.get(tile);
  if (!registration) return undefined;
  const atCenter = localX === 0 && localZ === 0;
  if (atCenter) {
    const cached = registration.centerHeights.get(tile);
    if (cached !== undefined) return cached;
  }
  const c = center(tile), x = c.x + localX, z = c.z + localZ;
  const height = samplePaintedWorld(registration.map, x, z);
  if (atCenter && height !== undefined) registration.centerHeights.set(tile, height);
  return height;
}

/** A movement anchor may cross any number of copies; terrain remains periodic. */
export function samplePaintedWorld(map: GameMap, worldX: number, z: number): number | undefined {
  const registration = maps.get(map);
  if (!registration) return undefined;
  const period = Math.sqrt(3) * radius * map.width;
  const x = ((worldX % period) + period) % period;
  registration.raycaster.set(new Vector3(x, registration.top, z), new Vector3(0, -1, 0));
  let highest = -Infinity;
  for (const entry of registration.columns.get(gridKey(x, z)) ?? []) {
    const {mesh, bounds} = entry;
    if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) continue;
    if (mesh instanceof InstancedMesh || Array.isArray(mesh.material)) {
      const hit = intersect(registration, [entry]);
      if (hit) highest = Math.max(highest, hit.point.y);
      continue;
    }
    if (!entry.sample) {
      // Build once on first contact with this static chunk. Double precision
      // preserves raycast contact heights after the wrap transform.
      const positions = mesh.geometry.getAttribute('position'), data = new Float64Array(positions.count * 3);
      const point = new Vector3();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld); point.toArray(data, i * 3);
      }
      const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(data, 3));
      geometry.setIndex(mesh.geometry.index);
      entry.sample = createTileSurfaceSampler(geometry, 0, 0, mesh.material.side);
      geometry.dispose();
    }
    const y = entry.sample(x, z);
    if (y !== undefined) highest = Math.max(highest, y);
  }
  return highest === -Infinity ? undefined : highest;
}

/** Undefined means legacy board; null means a painted board with no surface hit. */
export function pickPaintedSurface(map: GameMap, ray: Ray): PaintedPickResult | null | undefined {
  const registration = maps.get(map);
  if (!registration) return undefined;
  registration.raycaster.set(ray.origin, ray.direction);
  const hit = intersect(registration, registration.meshes, acceptsPointerHit);
  if (!hit) return null;
  const cell = paintedCell(hit);
  let tile = cell >= 0 ? map.tiles[cell] : undefined;
  if (!tile) {
    const offset = axialToOffset(pixelToHex(hit.point.x, hit.point.z, radius));
    const col = ((offset.col % map.width) + map.width) % map.width;
    if (offset.row < 0 || offset.row >= map.height) return null;
    tile = map.tiles[offset.row * map.width + col];
  }
  if (!tile) return null;
  const period = Math.sqrt(3) * radius * map.width;
  const copy = Math.round((hit.point.x - center(tile).x) / period);
  return { tile, col: tile.col, row: tile.row, worldCol: tile.col + copy * map.width };
}
