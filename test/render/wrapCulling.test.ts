/**
 * The wrap copies of the layers whose shaders move their vertices
 * (`wrapCulling.ts`), and the river glints the flow layer keeps for each board
 * (`paintedFlow.ts`). Both are parts of the render speed pass of 2026-11-16
 * (`docs/plans/render-performance-2026-11-16.md`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Frustum, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, OrthographicCamera, Vector3 } from 'three';

import { createMap, type GameMap } from '../../src/sim/map';
import { HIDDEN, VISIBLE } from '../../src/sim/visibility';
import { VIEW3D } from '../../src/render3d/lookData';
import { PaintedBirdsLayer } from '../../src/render3d/paintedBirds';
import { PaintedFlowLayer } from '../../src/render3d/paintedFlow';
import { cullWrapCopies } from '../../src/render3d/wrapCulling';
// @ts-expect-error The organic river builder is JavaScript, like the board build it serves.
import * as organic from '../../src/render3d/organicRivers.js';
// @ts-expect-error The terrain modules remain JavaScript.
import { prepareTerrainMap, setRiverStyle } from '../../src/terrainStudy/surface.js';

// The traces are counted with a spy on the module's export, not with `vi.mock`. The suite runs with
// `isolate: false` (`vite.config.ts`), so when an earlier file in the same worker had already loaded
// `paintedFlow.ts`, a `vi.mock` here could not reach it: the flow layer kept the real function and the
// count read 0 (it failed inside `npm run test:render` and passed alone). A spy replaces the export on
// the one module object every importer reads, whatever ran before.
afterEach(() => { setRiverStyle(null); vi.restoreAllMocks(); });

/** A frustum over the given span of x, looking straight down at the board. */
function frustumOver(fromX: number, toX: number, depth: number): Frustum {
  const camera = new OrthographicCamera(-(toX - fromX) / 2, (toX - fromX) / 2, depth / 2, -depth / 2, .1, 500);
  camera.position.set((fromX + toX) / 2, 200, depth / 2);
  camera.lookAt((fromX + toX) / 2, 0, depth / 2);
  camera.updateMatrixWorld();
  return new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}

describe('the wrap copies of a moving layer', () => {
  it('share one widened bound and are culled', () => {
    const box = new BoxGeometry(), material = new MeshStandardMaterial();
    const copies = [-10, 0, 10].map((x) => {
      const mesh = new InstancedMesh(box, material, 2);
      mesh.setMatrixAt(0, new Matrix4().makeTranslation(1, 0, 0));
      mesh.setMatrixAt(1, new Matrix4().makeTranslation(3, 0, 0));
      mesh.position.x = x; mesh.frustumCulled = false;
      return mesh;
    });
    for (let i = 1; i < copies.length; i++) copies[i]!.instanceMatrix = copies[0]!.instanceMatrix;
    cullWrapCopies(copies, 2);
    for (const copy of copies) {
      expect(copy.frustumCulled).toBe(true);
      expect(copy.boundingSphere!.radius).toBeCloseTo(copies[0]!.boundingSphere!.radius, 9);
    }
    // The measured bound of the two instances (unit box geometry) widened by the margin.
    const measured = new InstancedMesh(box, material, 2);
    measured.instanceMatrix = copies[0]!.instanceMatrix; measured.computeBoundingSphere();
    expect(copies[1]!.boundingSphere!.radius).toBeCloseTo(measured.boundingSphere!.radius + 2, 9);
  });

  // The birds move furthest of all: half a period either way along their line. Every vertex, at both ends of its
  // flight and at the top and bottom of its beat and its rise, must stay inside its copy's bound, or a bird would be
  // cut out of the picture while it is still on screen.
  it('hold every bird of the flock, wherever the shader has flown it, and leave the copies out of view undrawn', () => {
    const birds = new PaintedBirdsLayer((material) => material);
    birds.build(80, 52);
    const copies = birds.group.children as InstancedMesh[];
    expect(copies).toHaveLength(3);
    const BIRDS = VIEW3D.visualTest.birds;
    const geometry = copies[1]!.geometry, position = geometry.getAttribute('position'), wing = geometry.getAttribute('birdWing');
    const seed = geometry.getAttribute('birdSeed');
    birds.group.updateMatrixWorld(true);
    const instance = new Matrix4(), point = new Vector3();
    for (const copy of copies) {
      expect(copy.frustumCulled).toBe(true);
      const sphere = copy.boundingSphere!.clone().applyMatrix4(copy.matrixWorld);
      for (let i = 0; i < copy.count; i++) {
        copy.getMatrixAt(i, instance);
        const line = seed.getY(i);
        for (let v = 0; v < position.count; v++) {
          const w = wing.getX(v);
          for (const along of [-.5, .5]) for (const beat of [-1, 1]) for (const rise of [-.6, .6]) {
            point.set(position.getX(v) + along * line, position.getY(v) + w * (.55 * beat + .15) + rise, position.getZ(v) * (1 - .25 * w * (.5 + .5 * beat)));
            point.applyMatrix4(instance).applyMatrix4(copy.matrixWorld);
            expect(sphere.distanceToPoint(point)).toBeLessThanOrEqual(1e-6);
          }
        }
      }
    }
    // A view of the middle of the board, as wide as a middle zoom, sees the middle copy only.
    const period = Math.sqrt(3) * 80;
    const view = frustumOver(period / 2 - 25, period / 2 + 25, 1.5 * 52);
    expect(copies.map((copy) => view.intersectsObject(copy))).toEqual([false, true, false]);
    expect(BIRDS.flocks).toBeGreaterThan(0);
    birds.dispose();
  });
});

describe('the river glints', () => {
  function riverBoard(): { map: GameMap; prepared: GameMap } {
    setRiverStyle({ crest: 0, toe: 0, corner: .0008, organic: true, clearance: .2 });
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    map.tiles[2 * 8 + 3]!.riverEdges = 1; map.tiles[2 * 8 + 4]!.riverEdges = 1 << 3;
    return { map, prepared: prepareTerrainMap(map, { wrap: true }) as GameMap };
  }

  // The rivers' line is a fact of the board: the layer used to trace every river again on each build, which is each
  // time the works rebuild. Now it traces once a board and asks the fog which glints to keep.
  it('are traced once for a board however often the layer is built, and follow the fog', () => {
    const { map, prepared } = riverBoard();
    const traced = vi.spyOn(organic, 'createOrganicRivers');
    const flow = new PaintedFlowLayer();
    const count = (): number => (flow.group.children[1] as InstancedMesh | undefined)?.count ?? 0;
    flow.build(prepared, null, map, true);
    const all = count();
    expect(all).toBeGreaterThan(0);
    flow.build(prepared, new Array(map.tiles.length).fill(HIDDEN), map, true);
    expect(count()).toBe(0);
    flow.build(prepared, new Array(map.tiles.length).fill(VISIBLE), map, true);
    expect(count()).toBe(all);
    // Charted on one bank only: never more glints than the whole river has.
    const one = new Array(map.tiles.length).fill(HIDDEN); one[2 * 8 + 3] = VISIBLE;
    flow.build(prepared, one, map, true);
    expect(count()).toBeLessThanOrEqual(all);
    expect(traced).toHaveBeenCalledTimes(1);
    // A new board traces its own rivers.
    flow.build(riverBoard().prepared, null, map, true);
    expect(traced).toHaveBeenCalledTimes(2);
    for (const copy of flow.group.children) expect((copy as Mesh).frustumCulled).toBe(true);
    flow.dispose();
  });
});
