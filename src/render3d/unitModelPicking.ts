/**
 * A unit's selectable silhouette is its body buffer, placed by its live
 * instance slot. The caller supplies those slots from the unit handles so
 * outlines, x-ray ghosts and badges never acquire model-sized hit targets.
 */
import {
  Box3, type BufferGeometry, type Intersection, InstancedMesh, type Layers,
  type Material, Matrix4, Mesh, Object3D, Raycaster, Sphere, Vector3,
} from 'three';
import type { Ray } from './camera3d';

export interface UnitModelCandidate {
  unitId: number;
  object: Mesh;
  /** One authoritative body slot, including the selected wrap copy. */
  instanceId?: number;
}

export interface UnitModelPickOptions {
  /** The camera's active layers; ordinary layer zero is the default. */
  layers?: Layers;
  /** Shader clipping beyond material planes, such as a painted board's fog. */
  acceptsOccluderHit?: (hit: Intersection<Mesh>) => boolean;
}

const raycaster = new Raycaster();
const probe = new Mesh();
const matrix = new Matrix4();
const instanceMatrix = new Matrix4();
const box = new Box3();
const instanceBox = new Box3();
const sphere = new Sphere();
const point = new Vector3();
const intersections: Intersection<Mesh>[] = [];

interface InstanceBounds {
  version: number;
  count: number;
  geometry: BufferGeometry;
  box: Box3;
  /**
   * Every slot's own bounding sphere, in the batch's object space — the centre
   * as three floats, the radius beside it.
   *
   * A prop batch is a whole 6×6 chunk of trees or a whole region of fields, so
   * the batch box crossing the ray says almost nothing: the ray passes near two
   * or three of its hundred instances. Before this, each of the hundred paid a
   * `getMatrixAt`, a matrix multiply, a `Sphere.applyMatrix4` and — for anything
   * the sphere admitted — a `Box3.applyMatrix4`, which transforms eight corners.
   * The sphere is the same sphere `cast` computes first, so filtering on it here
   * removes only work `cast` was going to throw away, and the walk is left with
   * one transformed point per slot.
   */
  centres: Float32Array;
  radii: Float32Array;
}
const instanceBounds = new WeakMap<InstancedMesh, InstanceBounds>();

function visible(object: Object3D): boolean {
  for (let parent: Object3D | null = object; parent; parent = parent.parent) {
    if (!parent.visible) return false;
  }
  return raycaster.layers.test(object.layers);
}

function bodyMaterial(material: Material): boolean {
  return material.visible && material.opacity > 0 && material.colorWrite;
}

function occludingMaterial(material: Material): boolean {
  return bodyMaterial(material) && !material.transparent &&
    material.opacity >= 1 && material.depthTest && material.depthWrite;
}

function hasMaterial(mesh: Mesh, accepts: (material: Material) => boolean): boolean {
  return Array.isArray(mesh.material) ? mesh.material.some(accepts) : accepts(mesh.material);
}

function clipped(hit: Intersection<Mesh>, material: Material): boolean {
  const planes = material.clippingPlanes;
  if (!planes?.length) return false;
  return material.clipIntersection
    ? planes.every(plane => plane.distanceToPoint(hit.point) < 0)
    : planes.some(plane => plane.distanceToPoint(hit.point) < 0);
}

function hitMaterial(hit: Intersection<Mesh>): Material | undefined {
  const material = hit.object.material;
  return Array.isArray(material) ? material[hit.face?.materialIndex ?? 0] : material;
}

/** The same cell predicate used by painted peak picking, inherited by batches. */
function visiblePaintedCell(hit: Intersection<Mesh>): boolean {
  let object: Object3D | null = hit.object;
  while (object && typeof object.userData.paintedCellVisible !== 'function') object = object.parent;
  if (!object) return true;
  const geometry = hit.object.geometry;
  const cell = geometry.getAttribute('paintedCell');
  if (!cell) return true;
  const index = hit.instanceId ?? hit.face?.a;
  if (index === undefined) return true;
  const grade = geometry.getAttribute('paintedSuppress')?.getX(index) ?? 0;
  return object.userData.paintedCellVisible(Math.round(cell.getX(index)), grade);
}

/** Bounds beyond the first body cannot hide it, even when they share the ray. */
function inRange(bounds: Box3): boolean {
  if (bounds.isEmpty()) return false;
  if (bounds.containsPoint(raycaster.ray.origin)) return true;
  const entry = raycaster.ray.intersectBox(bounds, point);
  return entry !== null && entry.distanceToSquared(raycaster.ray.origin) <= raycaster.far ** 2;
}

function placedMatrix(mesh: Mesh, instanceId?: number): boolean {
  matrix.copy(mesh.matrixWorld);
  if (mesh instanceof InstancedMesh) {
    if (instanceId === undefined || !Number.isInteger(instanceId) || instanceId < 0 || instanceId >= mesh.count) return false;
    mesh.getMatrixAt(instanceId, instanceMatrix);
    matrix.multiply(instanceMatrix);
  } else if (instanceId !== undefined) return false;
  // Fog and an active walk hide the resting slot by collapsing its transform.
  return matrix.determinant() !== 0;
}

/** Raycast one slot, never InstancedMesh.raycast's walk through the whole bucket. */
function cast(mesh: Mesh, instanceId: number | undefined, accepts: (hit: Intersection<Mesh>) => boolean): number | null {
  if (!placedMatrix(mesh, instanceId)) return null;
  const geometry = mesh.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere || !geometry.boundingBox) return null;
  sphere.copy(geometry.boundingSphere).applyMatrix4(matrix);
  if (!raycaster.ray.intersectsSphere(sphere)) return null;
  box.copy(geometry.boundingBox).applyMatrix4(matrix);
  if (!inRange(box)) return null;
  probe.geometry = geometry;
  probe.material = mesh.material;
  probe.matrixWorld.copy(matrix);
  intersections.length = 0;
  probe.raycast(raycaster, intersections);
  let nearest: number | null = null;
  for (const hit of intersections) {
    hit.object = mesh;
    if (instanceId !== undefined) hit.instanceId = instanceId;
    const material = hitMaterial(hit);
    if (!material || clipped(hit, material) || !accepts(hit)) continue;
    if (nearest === null || hit.distance < nearest) nearest = hit.distance;
  }
  return nearest;
}

function boundsOf(mesh: InstancedMesh): InstanceBounds {
  let cached = instanceBounds.get(mesh);
  if (!cached || cached.version !== mesh.instanceMatrix.version || cached.count !== mesh.count || cached.geometry !== mesh.geometry) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const bounds = cached?.box ?? new Box3();
    bounds.makeEmpty();
    const centres = new Float32Array(mesh.count * 3), radii = new Float32Array(mesh.count);
    // A batch with no computable sphere leaves NaN here, and every comparison
    // below is written so a NaN admits the slot rather than dropping it.
    if (!mesh.geometry.boundingSphere) radii.fill(NaN);
    if (mesh.geometry.boundingBox) for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, instanceMatrix);
      instanceBox.copy(mesh.geometry.boundingBox).applyMatrix4(instanceMatrix);
      bounds.union(instanceBox);
      if (!mesh.geometry.boundingSphere) continue;
      sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(instanceMatrix);
      centres[i * 3] = sphere.center.x; centres[i * 3 + 1] = sphere.center.y; centres[i * 3 + 2] = sphere.center.z;
      radii[i] = sphere.radius;
    }
    cached = { version: mesh.instanceMatrix.version, count: mesh.count, geometry: mesh.geometry, box: bounds, centres, radii };
    instanceBounds.set(mesh, cached);
  }
  return cached;
}

function batchBounds(mesh: InstancedMesh): Box3 {
  return box.copy(boundsOf(mesh).box).applyMatrix4(mesh.matrixWorld);
}

/**
 * Could this slot's geometry be on the ray at all?
 *
 * The cached sphere is the object-space one, so the world sphere `cast` would
 * build is this centre through `matrixWorld` at this radius times that matrix's
 * largest scale. Composing the two scales can only *grow* the radius — three
 * takes the largest axis of each matrix separately, and the product of two
 * maxima is never below the maximum of the product — so a slot rejected here is
 * one `cast`'s own first test would have rejected too.
 */
function instanceOnRay(bounds: InstanceBounds, index: number, mesh: InstancedMesh, scale: number): boolean {
  point.set(bounds.centres[index * 3]!, bounds.centres[index * 3 + 1]!, bounds.centres[index * 3 + 2]!)
    .applyMatrix4(mesh.matrixWorld);
  const radius = bounds.radii[index]! * scale;
  return !(raycaster.ray.distanceSqToPoint(point) > radius * radius);
}

/**
 * Nearest visible body wins before ownership is considered by the caller. This
 * prevents a friendly piece being selected through an enemy in front of it.
 * World roots may include the scene: unit visual roots carry unitVisual so
 * their decorative passes cannot obscure their own candidate body.
 */
export function pickUnitModel(
  ray: Ray,
  candidates: readonly UnitModelCandidate[],
  occluders: readonly Object3D[] = [],
  options: UnitModelPickOptions = {},
): number | null {
  raycaster.set(ray.origin, ray.direction);
  raycaster.near = 0;
  raycaster.far = Infinity;
  raycaster.layers.mask = options.layers?.mask ?? 1;
  let selected: number | null = null;
  const bodyHit = (hit: Intersection<Mesh>): boolean => bodyMaterial(hitMaterial(hit)!) && visiblePaintedCell(hit);
  for (const candidate of candidates) {
    const { object } = candidate;
    if (!visible(object) || !hasMaterial(object, bodyMaterial)) continue;
    object.updateWorldMatrix(true, false);
    const distance = cast(object, candidate.instanceId, bodyHit);
    if (distance !== null && distance < raycaster.far) {
      selected = candidate.unitId;
      raycaster.far = distance;
    }
  }
  if (selected === null) return null;
  const worldHit = (hit: Intersection<Mesh>): boolean =>
    occludingMaterial(hitMaterial(hit)!) && visiblePaintedCell(hit) && (options.acceptsOccluderHit?.(hit) ?? true);
  const blocks = (object: Object3D): boolean => {
    if (!object.visible || object.userData.unitVisual) return false;
    if (object instanceof Mesh && raycaster.layers.test(object.layers) && hasMaterial(object, occludingMaterial)) {
      object.updateWorldMatrix(true, false);
      if (object instanceof InstancedMesh) {
        if (inRange(batchBounds(object))) {
          const bounds = boundsOf(object), scale = object.matrixWorld.getMaxScaleOnAxis();
          for (let i = 0; i < object.count; i++) {
            if (!instanceOnRay(bounds, i, object, scale)) continue;
            const distance = cast(object, i, worldHit);
            if (distance !== null && distance < raycaster.far) return true;
          }
        }
      } else {
        const distance = cast(object, undefined, worldHit);
        if (distance !== null && distance < raycaster.far) return true;
      }
    }
    return object.children.some(blocks);
  };
  return occluders.some(object => visibleAncestors(object) && blocks(object)) ? null : selected;
}

function visibleAncestors(object: Object3D): boolean {
  for (let parent = object.parent; parent; parent = parent.parent) {
    if (!parent.visible || parent.userData.unitVisual) return false;
  }
  return true;
}
