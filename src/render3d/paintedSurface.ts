/**
 * Exact terrain queries for an opted-in painted board. Registrations belong to
 * one map and its simulation tile objects; the ordinary renderer never sees
 * them. Meshes are borrowed from the board and remain the board's to dispose.
 */
import {
  BackSide, Box3, BufferAttribute, BufferGeometry, FrontSide, type InterleavedBufferAttribute, type Intersection, InstancedMesh,
  type Material, Matrix4, Mesh, Ray as LineRay, Raycaster, type Side, Sphere, Vector3,
} from 'three';
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

interface PaintedPickResult {
  tile: Tile;
  col: number;
  row: number;
  worldCol: number;
}

const maps = new WeakMap<GameMap, SurfaceRegistration>();
const tiles = new WeakMap<Tile, SurfaceRegistration>();

/**
 * The height sampler of each static ground chunk, kept across installs.
 *
 * `installPaintedSurface` runs again each time the works layer rebuilds on a
 * map with a terrace on it (the terrace shelves are ground too), and a new
 * install used to start with no samplers. The placements that followed (units,
 * resource pins, the toon works) then built one sampler again for each chunk
 * they touched. At the end of a turn-130 turn that was 2.2 s of a 4.6 s state
 * sync, measured on a loaded machine (`docs/plans/render-performance-2026-11-16.md`).
 *
 * A chunk's sampler depends only on its triangles and on where the chunk
 * stands. So it is kept while the mesh has the same geometry, the same index
 * and position buffers at the same versions (the hill cuts of `paintedRelief.ts`
 * rewrite the index and raise its version), the same side and the same world
 * matrix. Anything else builds it again, as before.
 */
interface KeptSampler {
  geometry: BufferGeometry;
  index: BufferAttribute | null;
  indexVersion: number;
  position: BufferAttribute | InterleavedBufferAttribute;
  positionVersion: number;
  side: Side;
  matrix: number[];
  sample: (x: number, z: number) => number | undefined;
}
const keptSamplers = new WeakMap<Mesh, KeptSampler>();
let samplerBuilds = 0;

/** How many chunk samplers have been built since the page loaded. For tests and the cost report. */
export function surfaceSamplerBuilds(): number { return samplerBuilds; }

function sameMatrix(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The chunk's sampler: the kept one if nothing it was built from has changed. */
function chunkSampler(mesh: Mesh): (x: number, z: number) => number | undefined {
  const geometry = mesh.geometry, index = geometry.index, position = geometry.getAttribute('position');
  const side = (mesh.material as Material).side, elements = mesh.matrixWorld.elements;
  const kept = keptSamplers.get(mesh);
  if (kept && kept.geometry === geometry && kept.index === index && kept.indexVersion === (index?.version ?? -1)
      && kept.position === position && kept.positionVersion === (position as BufferAttribute).version
      && kept.side === side && sameMatrix(kept.matrix, elements)) return kept.sample;
  // Double precision preserves raycast contact heights after the wrap transform.
  // The arithmetic is `Vector3.applyMatrix4`'s, term for term, so the heights
  // are the same numbers the per-vertex vectors gave; without the two objects
  // a vertex the copy runs several times faster.
  const count = position.count, data = new Float64Array(count * 3), e = elements;
  for (let i = 0; i < count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const w = 1 / (e[3]! * x + e[7]! * y + e[11]! * z + e[15]!);
    data[i * 3] = (e[0]! * x + e[4]! * y + e[8]! * z + e[12]!) * w;
    data[i * 3 + 1] = (e[1]! * x + e[5]! * y + e[9]! * z + e[13]!) * w;
    data[i * 3 + 2] = (e[2]! * x + e[6]! * y + e[10]! * z + e[14]!) * w;
  }
  const copy = new BufferGeometry(); copy.setAttribute('position', new BufferAttribute(data, 3));
  copy.setIndex(index);
  const sample = createTileSurfaceSampler(copy, 0, 0, side);
  copy.dispose();
  samplerBuilds++;
  keptSamplers.set(mesh, {
    geometry, index, indexVersion: index?.version ?? -1, position, positionVersion: (position as BufferAttribute).version,
    side, matrix: [...elements], sample,
  });
  return sample;
}
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
 * names each triangle's (or instance's) original tile.
 *
 * Ground only (R5, `docs/flags.md` (hhhhhh)). A mesh flagged `paintedPickOnly`
 * — the range props: a summit, a saddle, a foothill's shoulder or talus — is
 * refused here and never consulted, for heights or for the pointer. The hex
 * under the cursor is the hex whose *ground* the cursor points at. A peak may
 * be what the eye sees, but it stands on a flat plate labelled with the
 * mountain's cell, and its shoulders stand on the hill next door labelled the
 * same; while they answered the pointer, a mountain took a tenth of every
 * neighbour's face on average and a third at worst (measured on a generated
 * duel map), and most of a hill neighbour's own centre. Units keep their own
 * pick, where a peak still occludes a piece hidden behind it —
 * `unitModelPicking.ts` reads the flag's `paintedCellVisible` predicate for
 * that, which is why the board still attaches it.
 *
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
    if (mesh.userData.paintedPickOnly) continue;
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


/**
 * A ground chunk's triangles, binned by where they lie on the ground plane.
 *
 * The pointer's pick runs on every pointer move, and a drag pans the board on
 * every pointer move too. three's raycast tests every triangle of every chunk
 * whose box the ray crosses: about 20 ms a pick at the middle zoom of a
 * turn-130 game, measured on a loaded machine, so a drag spent more time
 * picking than drawing. The grid lets the pick test only the triangles that lie
 * under the ray's short path through the chunk's height range, a few hundred at
 * most.
 *
 * The grid is in the geometry's own space, so the three wrap copies of a chunk
 * share one. It is kept while the geometry has the same index and position
 * buffers at the same versions and the same draw range (the hill cuts of
 * `paintedRelief.ts` rewrite the index and raise its version).
 */
interface PickGrid {
  index: BufferAttribute | null;
  indexVersion: number;
  position: BufferAttribute | InterleavedBufferAttribute;
  positionVersion: number;
  drawStart: number;
  drawCount: number;
  /** The triangles' own bounds, so the search never depends on a stored box. */
  minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number;
  cols: number; rows: number;
  /** `starts[cell]` to `starts[cell + 1]` are the cell's entries in `triangles`. */
  starts: Uint32Array;
  /** The first index position (`i` in three's loop) of each triangle, in ascending order within a cell. */
  triangles: Uint32Array;
  /** One stamp a triangle, so a triangle in several cells is tested once a query. */
  seen: Uint32Array;
  stamp: number;
}
const PICK_CELL = .5;
/** Wider than any rounding in three's triangle test, and far smaller than a triangle. */
const PICK_SLACK = 1e-3;
const keptPickGrids = new WeakMap<BufferGeometry, PickGrid>();
let pickGridBuilds = 0;

/** How many pick grids have been built since the page loaded. For tests and the cost report. */
export function surfacePickGridBuilds(): number { return pickGridBuilds; }

function currentPickGrid(geometry: BufferGeometry): PickGrid | undefined {
  const kept = keptPickGrids.get(geometry);
  if (!kept) return undefined;
  const index = geometry.index, position = geometry.getAttribute('position'), range = geometry.drawRange;
  return kept.index === index && kept.indexVersion === (index?.version ?? -1) && kept.position === position
    && kept.positionVersion === (position as BufferAttribute).version && kept.drawStart === range.start && kept.drawCount === range.count
    ? kept : undefined;
}

function pickGridFor(geometry: BufferGeometry): PickGrid | null {
  const kept = currentPickGrid(geometry);
  if (kept) return kept;
  const index = geometry.index, position = geometry.getAttribute('position'), range = geometry.drawRange;
  if (!position) return null;
  // The same triangle walk as three's `_computeIntersections` for one material.
  const start = Math.max(0, range.start), end = Math.min(index ? index.count : position.count, range.start + range.count);
  const corner = (i: number): number => index ? index.getX(i) : i;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = start; i + 2 < end; i += 3) for (let k = 0; k < 3; k++) {
    const v = corner(i + k), x = position.getX(v), y = position.getY(v), z = position.getZ(v);
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  if (minX === Infinity) { minX = minY = minZ = 0; maxX = maxY = maxZ = -1; }
  const cols = Math.max(1, Math.ceil((maxX - minX) / PICK_CELL) + 1), rows = Math.max(1, Math.ceil((maxZ - minZ) / PICK_CELL) + 1);
  const columnOf = (x: number): number => Math.min(cols - 1, Math.max(0, Math.floor((x - minX) / PICK_CELL)));
  const rowOf = (z: number): number => Math.min(rows - 1, Math.max(0, Math.floor((z - minZ) / PICK_CELL)));
  const counts = new Uint32Array(cols * rows + 1);
  const span = (i: number, visit: (cell: number) => void): void => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const v = corner(i + k), x = position.getX(v), z = position.getZ(v);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    const c0 = columnOf(x0 - PICK_SLACK), c1 = columnOf(x1 + PICK_SLACK), r0 = rowOf(z0 - PICK_SLACK), r1 = rowOf(z1 + PICK_SLACK);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) visit(r * cols + c);
  };
  for (let i = start; i + 2 < end; i += 3) span(i, cell => { counts[cell + 1]!++; });
  const starts = new Uint32Array(cols * rows + 1);
  for (let cell = 0; cell < cols * rows; cell++) starts[cell + 1] = starts[cell]! + counts[cell + 1]!;
  const fill = starts.slice(0, cols * rows), triangles = new Uint32Array(starts[cols * rows]!);
  for (let i = start; i + 2 < end; i += 3) span(i, cell => { triangles[fill[cell]!++] = i; });
  const grid: PickGrid = {
    index, indexVersion: index?.version ?? -1, position, positionVersion: (position as BufferAttribute).version,
    drawStart: range.start, drawCount: range.count, minX, minY, minZ, maxX, maxY, maxZ, cols, rows, starts, triangles,
    seen: new Uint32Array(Math.ceil(Math.max(0, end - start) / 3) + 1), stamp: 0,
  };
  pickGridBuilds++;
  keptPickGrids.set(geometry, grid);
  return grid;
}

const pickInverse = new Matrix4(), pickLocal = new LineRay(), pickNear = new LineRay(), pickSphere = new Sphere(), pickSphereHit = new Vector3();
const pickA = new Vector3(), pickB = new Vector3(), pickC = new Vector3(), pickPoint = new Vector3(), pickWorld = new Vector3();
const pickFound: number[] = [];
const byIndex = (a: number, b: number): number => a - b;

/**
 * The hit three's `Mesh.raycast` would give first for one plain ground mesh,
 * or null: the same bounding sphere and box tests, the same ray in the mesh's
 * own space, the same triangle test on the same corners, the same world point
 * and distance, and the earliest triangle in three's order among equal
 * distances. Only triangles that cannot be hit are skipped.
 */
function nearestOnMesh(raycaster: Raycaster, mesh: Mesh, matrixWorld = mesh.matrixWorld, instanceId?: number): Intersection | null {
  const geometry = mesh.geometry, material = mesh.material as Material;
  if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
  pickSphere.copy(geometry.boundingSphere!).applyMatrix4(matrixWorld);
  pickNear.copy(raycaster.ray).recast(raycaster.near);
  if (!pickSphere.containsPoint(pickNear.origin)) {
    if (pickNear.intersectSphere(pickSphere, pickSphereHit) === null) return null;
    if (pickNear.origin.distanceToSquared(pickSphereHit) > (raycaster.far - raycaster.near) ** 2) return null;
  }
  pickInverse.copy(matrixWorld).invert();
  pickLocal.copy(raycaster.ray).applyMatrix4(pickInverse);
  if (geometry.boundingBox !== null && !pickLocal.intersectsBox(geometry.boundingBox)) return null;
  const grid = pickGridFor(geometry);
  if (!grid || grid.maxX < grid.minX) return null;
  // Where the ray is inside the triangles' own bounds, widened by the slack: no hit can lie outside it.
  const o = pickLocal.origin, d = pickLocal.direction;
  let t0 = -Infinity, t1 = Infinity;
  for (const [origin, direction, low, high] of [[o.x, d.x, grid.minX, grid.maxX], [o.y, d.y, grid.minY, grid.maxY], [o.z, d.z, grid.minZ, grid.maxZ]] as const) {
    const lo = low - PICK_SLACK, hi = high + PICK_SLACK;
    if (direction === 0) { if (origin < lo || origin > hi) return null; continue; }
    const a = (lo - origin) / direction, b = (hi - origin) / direction;
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
  }
  t0 = Math.max(t0, 0);
  if (t0 > t1) return null;
  const xa = o.x + d.x * t0, xb = o.x + d.x * t1, za = o.z + d.z * t0, zb = o.z + d.z * t1;
  const column = (x: number): number => Math.min(grid.cols - 1, Math.max(0, Math.floor((x - grid.minX) / PICK_CELL)));
  const row = (z: number): number => Math.min(grid.rows - 1, Math.max(0, Math.floor((z - grid.minZ) / PICK_CELL)));
  const c0 = column(Math.min(xa, xb) - PICK_SLACK), c1 = column(Math.max(xa, xb) + PICK_SLACK);
  const r0 = row(Math.min(za, zb) - PICK_SLACK), r1 = row(Math.max(za, zb) + PICK_SLACK);
  if (++grid.stamp === 0xffffffff) { grid.seen.fill(0); grid.stamp = 1; }
  pickFound.length = 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const cell = r * grid.cols + c;
    for (let k = grid.starts[cell]!; k < grid.starts[cell + 1]!; k++) {
      const i = grid.triangles[k]!, slot = (i - grid.drawStart) / 3 | 0;
      if (grid.seen[slot] === grid.stamp) continue;
      grid.seen[slot] = grid.stamp; pickFound.push(i);
    }
  }
  pickFound.sort(byIndex);
  const index = geometry.index;
  let best: Intersection | null = null;
  for (const i of pickFound) {
    const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
    mesh.getVertexPosition(a, pickA); mesh.getVertexPosition(b, pickB); mesh.getVertexPosition(c, pickC);
    const hit = material.side === BackSide ? pickLocal.intersectTriangle(pickC, pickB, pickA, true, pickPoint)
      : pickLocal.intersectTriangle(pickA, pickB, pickC, material.side === FrontSide, pickPoint);
    if (hit === null) continue;
    pickWorld.copy(pickPoint).applyMatrix4(matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(pickWorld);
    if (distance < raycaster.near || distance > raycaster.far) continue;
    if (best && distance >= best.distance) continue;
    best = { distance, point: pickWorld.clone(), object: mesh, face: { a, b, c, normal: new Vector3(), materialIndex: 0 }, faceIndex: Math.floor(i / 3) };
    if (instanceId !== undefined) best.instanceId = instanceId;
  }
  return best;
}

/**
 * A unit pick often reaches a large terrain mesh whose triangles all lie behind the piece.
 * Use the ground pick's current grid to rule out that mesh. A possible hit still needs
 * the unit pick's checks for fog, reserved tiles, clipping and other triangles in front.
 */
export function missesPaintedGround(raycaster: Raycaster, mesh: Mesh): boolean {
  return mesh.userData.paintedSurface === true && mesh.constructor === Mesh && !Array.isArray(mesh.material)
    && mesh.geometry.getAttribute('position') instanceof BufferAttribute
    && !mesh.geometry.morphAttributes.position?.length && !!currentPickGrid(mesh.geometry)
    && nearestOnMesh(raycaster, mesh) === null;
}

const instanceLocal = new Matrix4(), instanceWorld = new Matrix4(), instanceSphere = new Sphere();

/**
 * The hit three's `InstancedMesh.raycast` would give first, or null: the
 * whole batch's bounding sphere first, then each instance in order as a mesh
 * standing at the instance's own place, through `nearestOnMesh`, and the
 * earliest instance among equal distances. The terrace shelves are such a
 * batch (`PaintedWorksLayer.surfaceMeshes`), and every height a piece stood at
 * near one raycast every triangle of the shelf: about half of the pieces'
 * rebuild at a turn-130 turn end (the third render speed pass).
 */
function nearestOnInstanced(raycaster: Raycaster, mesh: InstancedMesh): Intersection | null {
  if (mesh.material === undefined) return null;
  if (mesh.boundingSphere === null) mesh.computeBoundingSphere();
  instanceSphere.copy(mesh.boundingSphere!).applyMatrix4(mesh.matrixWorld);
  if (!raycaster.ray.intersectsSphere(instanceSphere)) return null;
  let best: Intersection | null = null;
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, instanceLocal);
    instanceWorld.multiplyMatrices(mesh.matrixWorld, instanceLocal);
    const hit = nearestOnMesh(raycaster, mesh, instanceWorld, i);
    if (hit && (!best || hit.distance < best.distance)) best = hit;
  }
  return best;
}

/**
 * The nearest hit on the registered ground, the same as three's raycast of the meshes gives:
 * three sorts every hit by distance with a stable sort, so among equal
 * distances the first mesh in the list wins, and within it the first triangle.
 * A mesh with several materials or instances goes through three's own raycast.
 */
function nearestGround(registration: SurfaceRegistration, entries: readonly SurfaceMesh[]): Intersection | undefined {
  const { raycaster } = registration;
  let best: Intersection | undefined;
  const hits: Intersection[] = [];
  for (const { mesh, bounds } of entries) {
    if (!raycaster.ray.intersectsBox(bounds) || !mesh.layers.test(raycaster.layers)) continue;
    let hit: Intersection | null | undefined;
    if (mesh instanceof InstancedMesh && !Array.isArray(mesh.material)) hit = nearestOnInstanced(raycaster, mesh);
    else if (Array.isArray(mesh.material) || mesh.material === undefined) {
      hits.length = 0; mesh.raycast(raycaster, hits);
      for (const candidate of hits) if (!hit || candidate.distance < hit.distance) hit = candidate;
    } else hit = nearestOnMesh(raycaster, mesh);
    if (hit && (!best || hit.distance < best.distance)) best = hit;
  }
  return best;
}

function paintedCell(hit: Intersection): number {
  const attribute = (hit.object as Mesh).geometry.getAttribute('paintedCell');
  const index = hit.instanceId ?? hit.face?.a;
  return attribute && index !== undefined ? Math.round(attribute.getX(index)) : -1;
}

/**
 * Builds the height samplers of the ground chunks that do not have one yet,
 * while `stop()` says false. True when every chunk has one.
 *
 * A sampler is built the first time something stands on its chunk: a piece, a
 * town, a work, a resource pin. The page builds its layers for the seat's own
 * eyes at load, so the chunks it has not seen have none yet, and a turn that
 * shows the seat new ground used to build them inside the turn end's state
 * sync. The renderer calls this in idle time after the first frame (the third
 * render speed pass), so they are built while the player looks at the board.
 * A sampler is the same whenever it is built. Only the chunks a height query
 * can reach are warmed: the canonical period, where `samplePaintedWorld` looks.
 * The chunk's pick grid is built beside its sampler: the first pick over a
 * chunk otherwise built it, up to about 100 ms on a loaded machine.
 */
export function warmPaintedSurface(map: GameMap, stop: () => boolean): boolean {
  const registration = maps.get(map);
  if (!registration) return true;
  const period = Math.sqrt(3) * radius * map.width;
  for (const entry of registration.meshes) {
    const { mesh, bounds } = entry;
    if (mesh instanceof InstancedMesh || Array.isArray(mesh.material)) continue;
    if (bounds.max.x < 0 || bounds.min.x > period) continue;
    if (!entry.sample) {
      if (stop()) return false;
      entry.sample = chunkSampler(mesh);
    }
    // Placing a unit can build the height sampler before the first pointer event.
    // The pointer still needs its own triangle index, which can wait for the next idle slice.
    if (!currentPickGrid(mesh.geometry)) {
      if (stop()) return false;
      pickGridFor(mesh.geometry);
    }
  }
  return true;
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
      // The nearest hit three's raycast gives, through the triangle grid (see `nearestGround`).
      const hit = nearestGround(registration, [entry]);
      if (hit) highest = Math.max(highest, hit.point.y);
      continue;
    }
    // Found once on first contact with this static chunk, and kept across
    // installs while the chunk is unchanged. See `keptSamplers`.
    if (!entry.sample) entry.sample = chunkSampler(mesh);
    const y = entry.sample(x, z);
    if (y !== undefined) highest = Math.max(highest, y);
  }
  return highest === -Infinity ? undefined : highest;
}

/**
 * The ground hit under a ray: the hit three's raycast of the registered meshes
 * would give first, found without testing the triangles the ray cannot reach
 * (see `PickGrid`). Undefined on a board with no registration or no hit.
 */
export function paintedGroundHit(map: GameMap, ray: Ray): Intersection | undefined {
  const registration = maps.get(map);
  if (!registration) return undefined;
  registration.raycaster.set(ray.origin, ray.direction);
  return nearestGround(registration, registration.meshes);
}

/**
 * Undefined means legacy board; null means a painted board with no surface hit.
 * The ray meets ground and nothing else — see `installPaintedSurface`.
 */
export function pickPaintedSurface(map: GameMap, ray: Ray): PaintedPickResult | null | undefined {
  const registration = maps.get(map);
  if (!registration) return undefined;
  const hit = paintedGroundHit(map, ray);
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
