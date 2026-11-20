/**
 * The board's three wrap copies (x = −W, 0, +W), each hidden as a whole for a
 * pass whose camera cannot see any of it.
 *
 * Each copy holds about a thousand meshes: the ground chunks, the stones and
 * the trees, near and far. three walks every visible mesh of the scene on every
 * pass and tests its bounding sphere against the camera, so a copy out of view
 * cost a thousand sphere tests in the main pass and again in the mirror pass,
 * to draw nothing. At the middle zoom of a standard map one copy is in view,
 * two near the seam.
 *
 * A copy is hidden only when the box round its meshes' bounding spheres lies
 * wholly outside the camera's view. Then three would have culled every one of
 * those meshes on its own, so the meshes drawn, their order and the picture
 * are the same. The box is widened a little, so a rounding difference between
 * the box test and three's sphere test can only keep a copy, never hide one
 * that three would have drawn from. A mesh as wide as the map (the chart's
 * paper) stays out of the box and is left to three (`CopyBox`); a copy that
 * holds one has its other meshes hidden one by one instead of as a whole.
 *
 * Shadow maps are drawn inside a pass, from the light, out of the same scene.
 * A pass that draws a shadow map hides nothing, so every caster reaches it.
 * In other passes, a tree batch inside a retained copy also has a box. It
 * includes every tree at its full sway and often fits the screen edge more
 * closely than the sphere around a long row of trees.
 *
 * Most other layers keep their three copies as siblings in one group, each
 * mesh standing at its copy's offset (the works, the sites, the towns, the
 * ground ink, the pieces). For those, `hide` takes the layer's group: its
 * meshes are sorted into the three copies by their offset, each copy gets a box
 * the same way, and the meshes of a copy out of view are hidden one by one for
 * the pass. The boxes are measured again whenever the group's meshes, their
 * bounding spheres, their places or their culling flags change.
 */

import { Box3, type Camera, Frustum, type InstancedMesh, Matrix4, type Mesh, type Object3D, Sphere, Vector3 } from 'three';

/** World units added round each copy's box. Far wider than any rounding, far smaller than a hex. */
const SLACK = 1e-3;

/** The breeze moves vertices in the tree's local axes. Include it before each tree's scale and rotation. */
export function canopyBatchBox(mesh: InstancedMesh, sway: {x: number; z: number}): Box3 {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const tree = mesh.geometry.boundingBox!.clone().expandByVector(new Vector3(sway.x, 0, sway.z));
  const matrix = new Matrix4(), placed = new Box3(), box = new Box3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    box.union(placed.copy(tree).applyMatrix4(matrix));
  }
  return box.expandByScalar(SLACK);
}

/**
 * A board copy's box, and the meshes left out of it. A mesh whose sphere is
 * wider than a quarter of the map's period is left out (the chart's paper is
 * one mesh for the whole map), because it would make the box as wide as the map
 * and so keep every copy in view. When the copy is out of view, its other meshes
 * are hidden one by one and the wide ones are left to three's own test.
 */
interface CopyBox { children: number; period: number; box: Box3; wide: Set<Object3D>; always: boolean; canopies: { mesh: Mesh; box: Box3 }[] }

/** A layer whose wrap copies are siblings in one group, and the period that separates them. */
export interface FlatLayer { group: Object3D; period: number }

/** What a flat layer's boxes were measured from: each mesh, its sphere and place, and the three copies' boxes. */
interface FlatRecord {
  meshes: Object3D[];
  spheres: (Sphere | null)[];
  facts: Float64Array;
  copies: { meshes: Object3D[]; box: Box3; always: boolean }[];
}

export class CopyCulling {
  private readonly boxes = new WeakMap<Object3D, CopyBox>();
  private readonly frustum = new Frustum();
  private readonly viewProjection = new Matrix4();
  private readonly sphere = new Sphere();
  private readonly hidden: Object3D[] = [];
  /** Copies hidden since the page loaded, for the cost report. */
  hides = 0;

  /**
   * Hides each copy that `camera` cannot see. `restore` must follow the pass.
   * `shadowPass` is true when the pass about to be drawn also draws a shadow
   * map; then nothing is hidden.
   */
  hide(copies: readonly Object3D[], camera: Camera, shadowPass: boolean, flat: readonly (FlatLayer | null | undefined)[] = [], period = 0): void {
    if (shadowPass) return;
    camera.updateMatrixWorld();
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.viewProjection);
    for (const copy of copies) {
      if (!copy.visible) continue;
      const kept = this.boxOf(copy, period);
      if (kept.always || kept.box.isEmpty() || this.frustum.intersectsBox(kept.box)) {
        this.hideCanopies(kept.canopies);
        continue;
      }
      if (kept.wide.size === 0) { copy.visible = false; this.hidden.push(copy); }
      else for (const child of copy.children) if (child.visible && !kept.wide.has(child)) { child.visible = false; this.hidden.push(child); }
      this.hides++;
    }
    for (const layer of flat) {
      if (!layer || !layer.group.visible || layer.period <= 0) continue;
      const record = this.flatRecord(layer);
      for (const copy of record.copies) {
        if (copy.always || copy.box.isEmpty() || this.frustum.intersectsBox(copy.box)) continue;
        for (const mesh of copy.meshes) if (mesh.visible) { mesh.visible = false; this.hidden.push(mesh); }
        this.hides++;
      }
    }
  }

  /** A row of trees can lie outside a screen edge while its bounding sphere crosses that edge. */
  private hideCanopies(canopies: CopyBox['canopies']): void {
    for (const { mesh, box } of canopies) {
      if (mesh.visible && !this.frustum.intersectsBox(box)) {
        mesh.visible = false;
        this.hidden.push(mesh);
      }
    }
  }

  private readonly flats = new WeakMap<Object3D, FlatRecord>();
  /** The world sphere three tests for a mesh, into `this.sphere`; false for an object three does not test. */
  private sphereOf(object: Object3D): boolean {
    const mesh = object as Mesh & Partial<InstancedMesh>;
    if (!mesh.isMesh && !(object as { isLine?: boolean }).isLine && !(object as { isPoints?: boolean }).isPoints) return false;
    if (mesh.boundingSphere !== undefined) {
      if (mesh.boundingSphere === null) mesh.computeBoundingSphere!();
      this.sphere.copy(mesh.boundingSphere!);
    } else {
      if (mesh.geometry.boundingSphere === null) mesh.geometry.computeBoundingSphere();
      this.sphere.copy(mesh.geometry.boundingSphere!);
    }
    this.sphere.applyMatrix4(mesh.matrixWorld);
    return true;
  }
  /** The sphere object three reads for a mesh (the instanced mesh's own, else the geometry's), or null. */
  private static sphereRef(object: Object3D): Sphere | null {
    const mesh = object as Mesh & Partial<InstancedMesh>;
    if (mesh.boundingSphere !== undefined) return mesh.boundingSphere;
    return mesh.geometry?.boundingSphere ?? null;
  }
  /**
   * The flat layer's three copies, measured again if anything they were
   * measured from has changed: the list of meshes, a sphere object, its centre
   * or radius, a mesh's place, or its culling flag. Seven numbers a mesh are
   * compared on each pass, against the sphere test three makes for each.
   */
  private flatRecord(layer: FlatLayer): FlatRecord {
    const children = layer.group.children;
    let record = this.flats.get(layer.group);
    if (record && record.meshes.length === children.length) {
      let same = true;
      for (let i = 0; i < children.length && same; i++) {
        const child = children[i]!, sphere = CopyCulling.sphereRef(child), e = child.matrixWorld.elements, f = record.facts, k = i * 8;
        same = child === record.meshes[i] && sphere === record.spheres[i] && (child as Mesh).frustumCulled === (f[k] === 1)
          && e[12] === f[k + 1] && e[13] === f[k + 2] && e[14] === f[k + 3]
          && (sphere ? sphere.center.x === f[k + 4] && sphere.center.y === f[k + 5] && sphere.center.z === f[k + 6] && sphere.radius === f[k + 7] : true);
      }
      if (same) return record;
    }
    const copies = [0, 1, 2].map(() => ({ meshes: [] as Object3D[], box: new Box3(), always: false }));
    const facts = new Float64Array(children.length * 8), spheres: (Sphere | null)[] = [];
    children.forEach((child, i) => {
      const at = Math.max(-1, Math.min(1, Math.round(child.position.x / layer.period))) + 1, copy = copies[at]!;
      copy.meshes.push(child);
      // A child with children of its own, or a mesh three never culls, keeps its copy in view.
      if (child.children.length > 0 || ((child as Mesh).isMesh && !(child as Mesh).frustumCulled)) copy.always = true;
      else if (this.sphereOf(child) && !this.sphere.isEmpty()) {
        copy.box.expandByPoint(this.sphere.center.clone().addScalar(this.sphere.radius));
        copy.box.expandByPoint(this.sphere.center.clone().addScalar(-this.sphere.radius));
      }
      const sphere = CopyCulling.sphereRef(child), e = child.matrixWorld.elements, k = i * 8;
      spheres.push(sphere);
      facts[k] = (child as Mesh).frustumCulled ? 1 : 0; facts[k + 1] = e[12]!; facts[k + 2] = e[13]!; facts[k + 3] = e[14]!;
      if (sphere) { facts[k + 4] = sphere.center.x; facts[k + 5] = sphere.center.y; facts[k + 6] = sphere.center.z; facts[k + 7] = sphere.radius; }
    });
    for (const copy of copies) if (!copy.box.isEmpty()) copy.box.expandByScalar(SLACK);
    record = { meshes: [...children], spheres, facts, copies };
    this.flats.set(layer.group, record);
    return record;
  }

  /** Shows again every copy `hide` hid. */
  restore(): void {
    for (const copy of this.hidden) copy.visible = true;
    this.hidden.length = 0;
  }

  /**
   * The box round the bounding spheres three tests for each mesh of the copy,
   * the same spheres in the same places. Measured again when the copy gains or
   * loses a mesh (the chart's paper is added after the board is built). The
   * board's meshes never move and their bounds never change after the build.
   */
  private boxOf(copy: Object3D, period: number): CopyBox {
    let kept = this.boxes.get(copy);
    if (kept && kept.children === copy.children.length && kept.period === period) return kept;
    const box = new Box3(), wide = new Set<Object3D>(), canopies: CopyBox['canopies'] = [];
    let always = false;
    copy.updateMatrixWorld(true);
    copy.traverse(object => {
      const mesh = object as Mesh & Partial<InstancedMesh>;
      if (!mesh.isMesh && !(object as { isLine?: boolean }).isLine && !(object as { isPoints?: boolean }).isPoints) return;
      // A mesh three never culls is drawn wherever the camera looks, so its copy is never hidden.
      if (!mesh.frustumCulled) { always = true; return; }
      if (mesh.isInstancedMesh && mesh.boundingBox && !Array.isArray(mesh.material) && mesh.material.userData.canopySway) {
        canopies.push({ mesh, box: mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld) });
      }
      // three's own choice of sphere (`Frustum.intersectsObject`): the instanced mesh's own, else the geometry's.
      if (mesh.boundingSphere !== undefined) {
        if (mesh.boundingSphere === null) mesh.computeBoundingSphere!();
        this.sphere.copy(mesh.boundingSphere!);
      } else {
        if (mesh.geometry.boundingSphere === null) mesh.geometry.computeBoundingSphere();
        this.sphere.copy(mesh.geometry.boundingSphere!);
      }
      this.sphere.applyMatrix4(mesh.matrixWorld);
      if (this.sphere.isEmpty()) return;
      // A direct child as wide as a quarter of the map stays out of the box, and out of the hiding (see `CopyBox`).
      if (period > 0 && object.parent === copy && this.sphere.radius > period / 4) { wide.add(object); return; }
      box.expandByPoint(this.sphere.center.clone().addScalar(this.sphere.radius));
      box.expandByPoint(this.sphere.center.clone().addScalar(-this.sphere.radius));
    });
    if (!box.isEmpty()) box.expandByScalar(SLACK);
    kept = { children: copy.children.length, period, box, wide, always, canopies };
    this.boxes.set(copy, kept);
    return kept;
  }
}
