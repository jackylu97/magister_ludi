import { describe, expect, it } from 'vitest';
import { BoxGeometry, Frustum, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Vector3 } from 'three';
import { canopyBatchBox, CopyCulling } from '../../src/render3d/copyCulling';

// The board's three wrap copies each hold about a thousand meshes, and three tests every one of them against the camera
// in each pass. A copy out of view is now hidden as a whole for the pass (render speed pass, third pass). It may be
// hidden only when three would have culled every mesh in it, so the meshes drawn and the picture stay the same.

const PERIOD = 40;

function board(): { copies: Group[]; meshes: Mesh[][] } {
  const geometry = new BoxGeometry(1, 1, 1), material = new MeshBasicMaterial();
  const copies: Group[] = [], meshes: Mesh[][] = [];
  for (const offset of [-PERIOD, 0, PERIOD]) {
    const copy = new Group(); copy.position.x = offset;
    const own: Mesh[] = [];
    for (let x = 0; x < 30; x += 3) for (let z = 0; z < 12; z += 3) {
      const mesh = new Mesh(geometry, material); mesh.position.set(x, 0, z); copy.add(mesh); own.push(mesh);
    }
    const trees = new InstancedMesh(geometry, material, 2);
    trees.setMatrixAt(0, new Matrix4().makeTranslation(5, 0, 5)); trees.setMatrixAt(1, new Matrix4().makeTranslation(12, 0, 8));
    copy.add(trees); own.push(trees);
    copy.updateMatrixWorld(true);
    copies.push(copy); meshes.push(own);
  }
  return { copies, meshes };
}

function cameraOver(x: number, half = 6): OrthographicCamera {
  const camera = new OrthographicCamera(-half, half, half * .6, -half * .6, .1, 200);
  camera.position.set(x, 30, 20); camera.lookAt(x, 0, 6);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  return camera;
}

/** What three would draw of a copy: any visible mesh whose own sphere meets the camera's frustum. */
function threeDraws(meshes: readonly Mesh[], camera: OrthographicCamera): boolean {
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  return meshes.some(mesh => !mesh.frustumCulled || frustum.intersectsObject(mesh));
}

describe('wrap copy culling', () => {
  it('keeps every tree vertex inside its batch box at the full sway, rotation and scale', () => {
    const geometry = new BoxGeometry(1, 3, 1), sway = { x: .045, z: .028 };
    const trees = new InstancedMesh(geometry, new MeshBasicMaterial(), 2);
    const turn = new Matrix4().makeRotationY(Math.PI / 3).scale(new Vector3(2, .75, .5)).setPosition(18, 4, 0);
    const lean = new Matrix4().makeRotationZ(.17).setPosition(-2, 1, -6);
    trees.setMatrixAt(0, turn); trees.setMatrixAt(1, lean);
    const box = canopyBatchBox(trees, sway), position = geometry.getAttribute('position');
    for (const matrix of [turn, lean]) for (let i = 0; i < position.count; i++) {
      for (const dx of [-sway.x, sway.x]) for (const dz of [-sway.z, sway.z]) {
        const vertex = new Vector3().fromBufferAttribute(position, i).add(new Vector3(dx, 0, dz)).applyMatrix4(matrix);
        expect(box.containsPoint(vertex)).toBe(true);
      }
    }
  });

  it('culls a forest row only beyond its full sway in each wrap copy and keeps it for a shadow pass', () => {
    const material = new MeshBasicMaterial(), sway = material.userData.canopySway = { x: .045, z: .028 };
    const geometry = new BoxGeometry(1, 1, 1);
    function rowAt(x: number): InstancedMesh {
      const mesh = new InstancedMesh(geometry, material, 2);
      for (const [i, z] of [2, 10].entries()) mesh.setMatrixAt(i, new Matrix4().makeTranslation(x, 0, z));
      mesh.boundingBox = canopyBatchBox(mesh, sway);
      mesh.castShadow = true;
      return mesh;
    }
    const row = rowAt(6.6), edge = rowAt(6.52), hidden = rowAt(6.6);
    hidden.visible = false;
    const copy = new Group();
    copy.add(row, edge, hidden);
    const copies = [-PERIOD, 0, PERIOD].map(x => {
      const placed = copy.clone();
      placed.position.x = x;
      placed.updateMatrixWorld(true);
      return placed;
    });
    const culling = new CopyCulling();
    for (const placed of copies) {
      const camera = cameraOver(placed.position.x);
      // Three's sphere includes the screen edge for both rows.
      expect(threeDraws([placed.children[0] as Mesh], camera)).toBe(true);
      culling.hide(copies, camera, false, [], PERIOD);
      expect(placed.visible).toBe(true);
      expect(placed.children.map(tree => tree.visible)).toEqual([false, true, false]);
      culling.restore();
      culling.hide(copies, camera, true, [], PERIOD);
      expect(copies.every(wrap => wrap.visible)).toBe(true);
      expect(placed.children.map(tree => tree.visible)).toEqual([true, true, false]);
      // A light with a wider view can still draw the row outside the player camera.
      expect(threeDraws([placed.children[0] as Mesh], cameraOver(placed.position.x + 8))).toBe(true);
      culling.restore();
    }
  });

  it('hides a copy only when three would cull every mesh in it, and restore shows it again', () => {
    const { copies, meshes } = board(), culling = new CopyCulling();
    let hidden = 0;
    for (let x = -PERIOD - 10; x <= PERIOD + 40; x += 1.5) for (const half of [3, 8, 20]) {
      const camera = cameraOver(x, half);
      culling.hide(copies, camera, false);
      copies.forEach((copy, i) => {
        // Never hidden while one of its meshes would be drawn.
        if (!copy.visible) { hidden++; expect(threeDraws(meshes[i]!, camera)).toBe(false); }
      });
      culling.restore();
      expect(copies.every(copy => copy.visible)).toBe(true);
    }
    // And it does hide: most of these views see one copy, a few two.
    expect(hidden).toBeGreaterThan(100);
  });

  it('hides nothing in a pass that draws a shadow map, or in a copy with a mesh three never culls', () => {
    const { copies, meshes } = board(), culling = new CopyCulling(), camera = cameraOver(15);
    culling.hide(copies, camera, true);
    expect(copies.every(copy => copy.visible)).toBe(true);
    culling.hide(copies, camera, false);
    expect(copies.map(copy => copy.visible)).toEqual([false, true, false]);
    culling.restore();
    // A mesh drawn wherever the camera looks keeps its copy in; the box is measured again when a mesh is added.
    const always = new Mesh(new BoxGeometry(), new MeshBasicMaterial()); always.frustumCulled = false;
    copies[0]!.add(always); meshes[0]!.push(always); copies[0]!.updateMatrixWorld(true);
    culling.hide(copies, camera, false);
    expect(copies.map(copy => copy.visible)).toEqual([true, true, false]);
    culling.restore();
  });

  // The chart's paper is one mesh for the whole map in each copy. In the box it would keep every copy in view, so a mesh
  // wider than a quarter of the period stays out of the box and out of the hiding, and three tests it as before.
  it('leaves a map-wide mesh to three, and still hides the rest of a copy out of view', () => {
    const { copies, meshes } = board(), culling = new CopyCulling(), camera = cameraOver(15);
    const paper = new Mesh(new PlaneGeometry(PERIOD, 14).rotateX(-Math.PI / 2).translate(PERIOD / 2 - 5, 0, 6), new MeshBasicMaterial());
    // It stands over the middle of the map, where the camera looks, as the board's paper does in every copy.
    paper.position.x = PERIOD; copies[0]!.add(paper); copies[0]!.updateMatrixWorld(true);
    // Without the period every copy with the paper keeps everything: the old box.
    culling.hide(copies, camera, false);
    expect(copies[0]!.visible).toBe(true);
    culling.restore();
    culling.hide(copies, camera, false, [], PERIOD);
    expect(copies[0]!.visible).toBe(true);
    expect(paper.visible).toBe(true);
    expect(meshes[0]!.every(mesh => !mesh.visible)).toBe(true);
    expect(threeDraws(meshes[0]!, camera)).toBe(false);
    expect(copies[2]!.visible).toBe(false);
    culling.restore();
    expect([...meshes[0]!, paper].every(mesh => mesh.visible)).toBe(true);
  });

  it('leaves alone a copy that something else had hidden', () => {
    const { copies } = board(), culling = new CopyCulling(), camera = cameraOver(15);
    copies[2]!.visible = false;
    culling.hide(copies, camera, false);
    culling.restore();
    expect(copies.map(copy => copy.visible)).toEqual([true, true, false]);
    expect(new Vector3().copy(copies[1]!.position).x).toBe(0);
  });

  // Most layers keep their three copies as siblings in one group, each mesh at its copy's offset.
  it('hides a flat layer\'s copy mesh by mesh, only when three would cull all of it, and follows a changed mesh', () => {
    const geometry = new BoxGeometry(1, 1, 1), material = new MeshBasicMaterial();
    const layer = new Group(), byCopy: Mesh[][] = [[], [], []];
    for (const [k, offset] of [-PERIOD, 0, PERIOD].entries()) for (let x = 0; x < 30; x += 6) {
      const trees = new InstancedMesh(geometry, material, 2);
      trees.setMatrixAt(0, new Matrix4().makeTranslation(x, 0, 2)); trees.setMatrixAt(1, new Matrix4().makeTranslation(x + 2, 0, 9));
      trees.computeBoundingSphere(); trees.position.x = offset; layer.add(trees); byCopy[k]!.push(trees);
    }
    layer.updateMatrixWorld(true);
    const culling = new CopyCulling(), flat = [{ group: layer, period: PERIOD }];
    let hidden = 0;
    for (let x = -PERIOD - 10; x <= PERIOD + 40; x += 2.5) {
      const camera = cameraOver(x, 6);
      culling.hide([], camera, false, flat);
      byCopy.forEach(meshes => {
        if (meshes.some(mesh => !mesh.visible)) { hidden++; expect(meshes.every(mesh => !mesh.visible)).toBe(true); expect(threeDraws(meshes, camera)).toBe(false); }
      });
      culling.restore();
      expect(layer.children.every(mesh => mesh.visible)).toBe(true);
    }
    expect(hidden).toBeGreaterThan(30);
    // A mesh of the left copy grows a bound that reaches the view over the middle copy: that copy is kept.
    const camera = cameraOver(15);
    culling.hide([], camera, false, flat);
    expect(byCopy[0]!.every(mesh => !mesh.visible)).toBe(true);
    culling.restore();
    const wide = byCopy[0]![0]! as InstancedMesh;
    wide.setMatrixAt(1, new Matrix4().makeTranslation(PERIOD + 15, 0, 6)); wide.computeBoundingSphere();
    culling.hide([], camera, false, flat);
    expect(byCopy[0]!.every(mesh => mesh.visible)).toBe(true);
    culling.restore();
    // And a mesh added to the right copy that three never culls keeps that copy in.
    const always = new Mesh(geometry, material); always.position.x = PERIOD; always.frustumCulled = false; layer.add(always); layer.updateMatrixWorld(true);
    culling.hide([], camera, false, flat);
    expect([...byCopy[2]!, always].every(mesh => mesh.visible)).toBe(true);
    culling.restore();
    // A mesh something else had hidden stays hidden.
    byCopy[2]![1]!.visible = false; always.frustumCulled = true;
    culling.hide([], cameraOver(15, 3), false, flat);
    culling.restore();
    expect(byCopy[2]![1]!.visible).toBe(false);
  });
});
