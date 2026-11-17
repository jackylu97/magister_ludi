/**
 * Bounds for the wrap copies of a layer whose vertex shader moves its
 * vertices: the town smoke, the birds, the river glints, the windmill sails,
 * the rich hexes' motes and the yield light.
 *
 * Each of these layers draws one mesh for each wrap copy of the board (x = −W,
 * 0, +W). They used to turn frustum culling off, because the bounds three
 * measures do not hold a vertex that the shader has moved. So every copy was
 * drawn on every frame, in view or not: three draw calls for each layer where
 * one, or two at the seam, can be seen.
 *
 * These helpers take the measured bounds and widen them by the farthest the
 * shader can move a vertex (`margin`, in world units, worked out by each layer
 * from its own shader). With that, each copy is culled like any other mesh,
 * and nothing it could draw is ever cut. Culling only removes whole objects
 * from the draw list, so the order of the objects that are drawn, and the
 * picture, stay the same.
 */

import { Box3, type BufferAttribute, type BufferGeometry, type InstancedMesh, type Mesh, Sphere } from 'three';

/**
 * Culls the copies of one instanced batch. The copies share one instance
 * buffer and one count, so their bounds in their own space are the same, and
 * each copy's own place (its `position.x`) moves them with it.
 */
export function cullWrapCopies(copies: readonly InstancedMesh[], margin: number): void {
  const first = copies[0];
  if (!first) return;
  first.computeBoundingSphere();
  const sphere = first.boundingSphere!.clone();
  if (!sphere.isEmpty()) sphere.radius += margin;
  for (const copy of copies) {
    copy.boundingSphere = sphere.clone();
    copy.frustumCulled = true;
  }
}

/**
 * The same for copies that are plain meshes over one instanced geometry whose
 * quads are placed by a per-instance attribute (`at`, the quad's centre)
 * rather than by instance matrices. The bounds are those centres, widened by
 * `margin`, which must cover the largest quad and the farthest it moves.
 */
export function cullWrapQuads(copies: readonly Mesh[], geometry: BufferGeometry, at: BufferAttribute, margin: number): void {
  const sphere = new Box3().setFromBufferAttribute(at).getBoundingSphere(new Sphere());
  sphere.radius += margin;
  geometry.boundingSphere = sphere;
  for (const copy of copies) copy.frustumCulled = true;
}
