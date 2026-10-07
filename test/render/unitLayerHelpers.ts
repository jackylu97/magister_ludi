/**
 * Reading the unit layer's meshes in tests.
 *
 * The layer draws every pass of every bucket (sculpt, outline shell, x-ray
 * ghost, badge disc, rim, HP bar) as one `InstancedMesh` per wrap copy: the
 * in-place copy owns the instance buffers, and the copies a period east and
 * west are separate objects over the very same `instanceMatrix`, offset by
 * their `position.x` (`CollectorOptions.copyMeshes` in `instances.ts`). These
 * helpers let a test talk about the buffers it cares about without counting
 * each wrap copy as a separate bucket.
 */
import { Frustum, InstancedMesh, Matrix4, type Object3D, Sphere, Vector3 } from 'three';

import { DioramaCamera } from '../../src/render3d/camera3d';
import { VIEW3D } from '../../src/render3d/lookData';

/** How many objects each instanced pass of the unit layer is drawn as. */
export const WRAP_COPIES = 3;

/**
 * One mesh per bucket and pass: the in-place copy, which owns the buffers.
 * In group order, so a test that relied on build order still can.
 */
export function layerMeshes(group: Object3D): InstancedMesh[] {
  const seen = new Set<unknown>();
  const out: InstancedMesh[] = [];
  for (const child of group.children) {
    if (!(child instanceof InstancedMesh) || seen.has(child.instanceMatrix)) continue;
    seen.add(child.instanceMatrix);
    out.push(child);
  }
  return out;
}

/** Every object drawing `mesh`'s buffers, west to east. */
export function wrapCopiesOf(group: Object3D, mesh: InstancedMesh): InstancedMesh[] {
  return group.children
    .filter((child): child is InstancedMesh =>
      child instanceof InstancedMesh && child.instanceMatrix === mesh.instanceMatrix)
    .sort((a, b) => a.position.x - b.position.x);
}

/**
 * Every drawn instance of `mesh`'s pass in the layer's own space, wrap copies
 * included: for each instance, its copies west to east. This is the order the
 * layer used to bake its copies into one buffer, so a test written against
 * that layout reads the same list.
 */
export function worldMatrices(group: Object3D, mesh: InstancedMesh): Matrix4[] {
  const copies = wrapCopiesOf(group, mesh);
  const out: Matrix4[] = [];
  const instance = new Matrix4();
  for (let i = 0; i < mesh.count; i++) {
    for (const copy of copies) {
      copy.updateMatrix();
      copy.getMatrixAt(i, instance);
      out.push(new Matrix4().multiplyMatrices(copy.matrix, instance));
    }
  }
  return out;
}

/**
 * Every drawn instance that is inside `frustum` while the object drawing it
 * would be culled, as readable strings — empty when culling is safe.
 *
 * This is the whole promise of culling the unit layer per wrap copy: three may
 * skip a copy only when nothing it draws is in view. Each instance is tested by
 * its own sphere (the geometry's, through the instance and the copy's offset),
 * grown for an outline shell by the widest rim it can be drawn with, since the
 * shell is pushed out in the vertex shader. Hidden (zero-scaled) instances
 * draw nothing and are skipped.
 */
export function culledWhileInView(group: Object3D, frustum: Frustum): string[] {
  const out: string[] = [];
  const instance = new Matrix4();
  const world = new Matrix4();
  const sphere = new Sphere();
  group.updateMatrixWorld(true);
  for (const child of group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    const geometry = child.geometry;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const shell = geometry.hasAttribute('unitOutlineWidth');
    const culled = child.frustumCulled && !frustum.intersectsObject(child);
    if (!culled) continue;
    for (let i = 0; i < child.count; i++) {
      child.getMatrixAt(i, instance);
      if (instance.determinant() === 0) continue;
      world.multiplyMatrices(child.matrixWorld, instance);
      sphere.copy(geometry.boundingSphere!).applyMatrix4(world);
      if (shell) sphere.radius += VIEW3D.units.hoverOutlineWidth * world.getMaxScaleOnAxis();
      if (frustum.intersectsSphere(sphere)) {
        out.push(`${geometry.name || geometry.uuid} instance ${i} at x ${sphere.center.x.toFixed(2)} is in view but its copy is culled`);
      }
    }
  }
  return out;
}

/**
 * The frustum of the game's own camera at its default zoom, looking at ground
 * point `(x, z)` through a 16:9 window.
 */
export function frustumOver(x: number, z: number): Frustum {
  const view = new DioramaCamera();
  view.resize(1600, 900);
  view.lookAtPoint(new Vector3(x, 0, z));
  const camera = view.camera;
  camera.updateMatrixWorld(true);
  return new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}
