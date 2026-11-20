import { type Box3, type BufferGeometry, Matrix4, type Mesh, Ray, type Raycaster, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const patchBounds = new WeakMap<BufferGeometry, Box3[]>();
const inverse = new Matrix4(), localRay = new Ray(), entry = new Vector3();

/** Keep the bounds of each patch when a town or improvement combines its paint into one static draw. */
export function mergePaintedPatches(parts: BufferGeometry[]): BufferGeometry | null {
  const merged = mergeGeometries(parts);
  if (!merged) return null;
  const bounds: Box3[] = [];
  for (const part of parts) {
    if (!part.boundingBox) part.computeBoundingBox();
    if (!part.boundingBox) return merged;
    // The source can be reused. Keep the bounds of the vertices copied at this merge.
    bounds.push(part.boundingBox.clone().expandByScalar(1e-6));
  }
  patchBounds.set(merged, bounds);
  return merged;
}

/** A gap between patches is selectable even when their combined box covers the unit. */
export function missesPaintedPatches(raycaster: Raycaster, mesh: Mesh): boolean {
  const bounds = patchBounds.get(mesh.geometry);
  if (!bounds) return false;
  localRay.copy(raycaster.ray).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());
  for (const bound of bounds) {
    if (bound.containsPoint(localRay.origin)) return false;
    if (!localRay.intersectBox(bound, entry)) continue;
    entry.applyMatrix4(mesh.matrixWorld);
    if (entry.distanceToSquared(raycaster.ray.origin) <= raycaster.far ** 2) return false;
  }
  return true;
}
