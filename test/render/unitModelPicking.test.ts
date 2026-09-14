import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Group,
  InstancedBufferAttribute, InstancedMesh, Layers, Matrix4, Mesh,
  MeshBasicMaterial, Plane, Raycaster, Vector3,
} from 'three';
import { PaintedUnitKit } from '../../src/render3d/paintedUnits';
import { pickUnitModel, type UnitModelCandidate } from '../../src/render3d/unitModelPicking';

const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); vi.restoreAllMocks(); });

function mesh(z = 0, x = 0): Mesh<BoxGeometry, MeshBasicMaterial> {
  const geometry = new BoxGeometry(1, 1, 1), material = new MeshBasicMaterial();
  const object = new Mesh(geometry, material);
  object.position.set(x, 0, z);
  cleanup.push(() => { geometry.dispose(); material.dispose(); });
  return object;
}

function batch(positions: readonly number[]): InstancedMesh<BoxGeometry, MeshBasicMaterial> {
  const geometry = new BoxGeometry(1, 1, 1), material = new MeshBasicMaterial();
  const object = new InstancedMesh(geometry, material, positions.length);
  positions.forEach((x, index) => object.setMatrixAt(index, new Matrix4().makeTranslation(x, 0, 0)));
  object.instanceMatrix.needsUpdate = true;
  cleanup.push(() => { object.dispose(); geometry.dispose(); material.dispose(); });
  return object;
}

const ray = (x = 0, y = 0) => ({ origin: new Vector3(x, y, 10), direction: new Vector3(0, 0, -1) });
const candidate = (object: Mesh, unitId = 1, instanceId?: number): UnitModelCandidate => ({ object, unitId, instanceId });

describe('direct unit body picking', () => {
  it('tests triangles inside the bounds, preserving gaps beside equipment', () => {
    const body = mesh();
    const triangle = new BufferGeometry();
    triangle.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0], 3));
    cleanup.push(() => triangle.dispose());
    const piece = new Mesh(triangle, body.material);
    expect(pickUnitModel(ray(-.5, -.5), [candidate(piece)])).toBe(1);
    expect(pickUnitModel(ray(.75, .75), [candidate(piece)])).toBeNull();
  });

  it('chooses the nearest body before ownership filtering, independently of candidate order', () => {
    const friendly = candidate(mesh(), 4), enemy = candidate(mesh(2), 9);
    expect(pickUnitModel(ray(), [friendly, enemy])).toBe(9);
    expect(pickUnitModel(ray(), [enemy, friendly])).toBe(9);
    expect(pickUnitModel(ray(), [candidate(enemy.object, 0), enemy])).toBe(0);
  });

  it('uses the exact live instance index and world transform for each wrap copy', () => {
    const body = batch([-10, 0, 10]), parent = new Group();
    parent.position.set(3, 0, 2); parent.add(body);
    const candidates = [candidate(body, 17, 0), candidate(body, 18, 1), candidate(body, 17, 2)];
    expect(pickUnitModel(ray(-7), candidates)).toBe(17);
    expect(pickUnitModel(ray(3), candidates)).toBe(18);
    expect(pickUnitModel(ray(13), candidates)).toBe(17);
    expect(pickUnitModel(ray(3), [candidates[0]!])).toBeNull();
    body.setMatrixAt(1, new Matrix4().makeTranslation(2, 0, 0));
    expect(pickUnitModel(ray(3), candidates)).toBeNull();
    expect(pickUnitModel(ray(5), candidates)).toBe(18);
    body.setMatrixAt(1, new Matrix4().makeScale(0, 0, 0));
    expect(pickUnitModel(ray(5), candidates)).toBeNull();
  });

  it('rejects hidden ancestors, hidden material, wrong layers and missing instance slots', () => {
    const body = batch([0]), parent = new Group(); parent.add(body);
    const candidates = [candidate(body, 1, 0)];
    parent.visible = false; expect(pickUnitModel(ray(), candidates)).toBeNull();
    parent.visible = true; body.material.visible = false;
    expect(pickUnitModel(ray(), candidates)).toBeNull();
    body.material.visible = true; body.layers.set(2);
    expect(pickUnitModel(ray(), candidates)).toBeNull();
    const layers = new Layers(); layers.enable(2);
    expect(pickUnitModel(ray(), candidates, [], { layers })).toBe(1);
    expect(pickUnitModel(ray(), [candidate(body)], [], { layers })).toBeNull();
    expect(pickUnitModel(ray(), [candidate(body, 1, 1)], [], { layers })).toBeNull();
  });

  it('does not inspect unrelated slots or raycast distant body triangles', () => {
    const body = batch([-100, 0, 100]);
    const bucketCast = vi.spyOn(body, 'raycast');
    const triangleCast = vi.spyOn(Mesh.prototype, 'raycast');
    expect(pickUnitModel(ray(), [candidate(body, 1, 0), candidate(body, 2, 1), candidate(body, 3, 2)])).toBe(2);
    expect(bucketCast).not.toHaveBeenCalled();
    expect(triangleCast).toHaveBeenCalledTimes(1);
  });

  it('matches real painted geometry triangles across wraps without picking the decorative passes', () => {
    const kit = new PaintedUnitKit(() => {}), model = kit.resolve({ type: 'spearman' })!;
    cleanup.push(() => kit.dispose());
    const body = new InstancedMesh(model.geometry, kit.material(model, 0x385176), 3);
    cleanup.push(() => body.dispose());
    const candidates = [-5, 0, 5].map((x, instanceId) => {
      const transform = new Matrix4().makeRotationY(.45); transform.setPosition(x, 0, 0);
      body.setMatrixAt(instanceId, transform);
      return candidate(body, 33, instanceId);
    });
    body.updateWorldMatrix(true, false);
    const reference = new Raycaster(), unitRoot = new Group(), shell = mesh(2);
    shell.scale.set(2, 2, 2); unitRoot.userData.unitVisual = true; unitRoot.add(body, shell);
    let hits = 0, misses = 0;
    for (const offset of [-5, 0, 5]) for (const x of [-.32, 0, .32]) for (const y of [.05, .5, .85]) {
      const sample = ray(offset + x, y); reference.set(sample.origin, sample.direction);
      const actual = reference.intersectObject(body, false)[0];
      expect(pickUnitModel(sample, candidates, [unitRoot])).toBe(actual ? 33 : null);
      if (actual) hits++; else misses++;
    }
    expect(hits).toBeGreaterThan(0); expect(misses).toBeGreaterThan(0);
  });
});

describe('world occlusion of direct unit picking', () => {
  it('blocks through solid scenery in front and ignores scenery behind the body', () => {
    const piece = candidate(mesh());
    expect(pickUnitModel(ray(), [piece], [mesh(2)])).toBeNull();
    expect(pickUnitModel(ray(), [piece], [mesh(-2)])).toBe(1);
  });

  it('rejects bounding-box-only scenery hits', () => {
    const ring = mesh(2), geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([
      -1, -1, 0, -.6, -1, 0, -1, 1, 0,
      1, -1, 0, 1, 1, 0, .6, 1, 0,
    ], 3));
    cleanup.push(() => geometry.dispose());
    const scenery = new Mesh(geometry, ring.material); scenery.position.z = 2;
    expect(pickUnitModel(ray(), [candidate(mesh())], [scenery])).toBe(1);
  });

  it.each(['transparent', 'depthTest', 'depthWrite', 'visible', 'colorWrite', 'opacity'] as const)(
    'ignores non-occluding %s materials and decorative unit roots', flag => {
      const piece = candidate(mesh()), overlay = mesh(2);
      if (flag === 'opacity') overlay.material.opacity = .5;
      else if (flag === 'transparent') overlay.material.transparent = true;
      else overlay.material[flag] = false;
      expect(pickUnitModel(ray(), [piece], [overlay])).toBe(1);
      const unitRoot = new Group(); unitRoot.userData.unitVisual = true; unitRoot.add(mesh(3));
      expect(pickUnitModel(ray(), [piece], [unitRoot])).toBe(1);
      expect(pickUnitModel(ray(), [piece], [unitRoot.children[0]!])).toBe(1);
    },
  );

  it('honors hidden ancestors and camera layers without treating a parent layer as a child visibility gate', () => {
    const piece = candidate(mesh()), parent = new Group(), obstruction = mesh(2); parent.add(obstruction);
    parent.visible = false;
    expect(pickUnitModel(ray(), [piece], [obstruction])).toBe(1);
    parent.visible = true; obstruction.layers.set(2);
    expect(pickUnitModel(ray(), [piece], [parent])).toBe(1);
    parent.layers.set(7); const layers = new Layers(); layers.enable(2);
    expect(pickUnitModel(ray(), [piece], [parent], { layers })).toBeNull();
  });

  it('honors clipping planes and the front/back material of each triangle', () => {
    const piece = candidate(mesh()), obstruction = mesh(2);
    obstruction.material.clippingPlanes = [new Plane(new Vector3(1, 0, 0), -.1)];
    expect(pickUnitModel(ray(), [piece], [obstruction])).toBe(1);
    obstruction.material.clippingPlanes.push(new Plane(new Vector3(-1, 0, 0), .1));
    obstruction.material.clipIntersection = true;
    expect(pickUnitModel(ray(), [piece], [obstruction])).toBeNull();
    const invisible = new MeshBasicMaterial({ visible: false }); cleanup.push(() => invisible.dispose());
    const grouped = new Mesh(obstruction.geometry, Array.from({ length: 6 }, () => invisible)); grouped.position.z = 2;
    expect(pickUnitModel(ray(), [piece], [grouped])).toBe(1);
    obstruction.material.clippingPlanes = []; obstruction.material.side = DoubleSide;
    grouped.material[4] = obstruction.material;
    expect(pickUnitModel(ray(), [piece], [grouped])).toBeNull();
  });

  it('reads instanced painted fog and suppression through the real instance index', () => {
    const piece = candidate(mesh()), obstruction = batch([0, 3]), parent = new Group();
    obstruction.position.z = 2; parent.add(obstruction);
    obstruction.geometry.setAttribute('paintedCell', new InstancedBufferAttribute(new Float32Array([7, 8]), 1));
    obstruction.geometry.setAttribute('paintedSuppress', new InstancedBufferAttribute(new Float32Array([2, 0]), 1));
    const visible = vi.fn((cell: number, grade: number) => cell === 7 && grade < 2);
    parent.userData.paintedCellVisible = visible;
    expect(pickUnitModel(ray(), [piece], [parent])).toBe(1);
    expect(visible).toHaveBeenCalledWith(7, 2);
    parent.userData.paintedCellVisible = () => true;
    expect(pickUnitModel(ray(), [piece], [parent])).toBeNull();
    expect(pickUnitModel(ray(), [piece], [parent], { acceptsOccluderHit: hit => hit.instanceId !== 0 })).toBe(1);
  });

  it('checks only nearby occluder triangles before the first body and updates changed instance bounds', () => {
    const piece = candidate(mesh()), obstruction = batch([-100, 100]); obstruction.position.z = 2;
    const distant = mesh(-100);
    const ranges: number[] = [], originalCast = Mesh.prototype.raycast;
    const bucketCast = vi.spyOn(obstruction, 'raycast');
    const triangleCast = vi.spyOn(Mesh.prototype, 'raycast').mockImplementation(function(this: Mesh, caster, hits) {
      ranges.push(caster.far); originalCast.call(this, caster, hits);
    });
    expect(pickUnitModel(ray(), [piece], [obstruction, distant])).toBe(1);
    expect(bucketCast).not.toHaveBeenCalled(); expect(triangleCast).toHaveBeenCalledTimes(1);
    obstruction.setMatrixAt(0, new Matrix4()); obstruction.instanceMatrix.needsUpdate = true;
    expect(pickUnitModel(ray(), [piece], [obstruction, distant])).toBeNull();
    expect(bucketCast).not.toHaveBeenCalled(); expect(triangleCast).toHaveBeenCalledTimes(3);
    expect(ranges).toEqual([Infinity, Infinity, 9.5]);
  });
});
