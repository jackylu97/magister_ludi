/**
 * The two readings `dressing3d.test.ts` and `dressing3d.slow.test.ts` share.
 *
 * The dressing is placement arithmetic and all of it has to be a pure function
 * of the map, which is asserted two ways: as a *count* (the draw-call budget,
 * the per-geometry instance counts) on boards small enough to lay out by hand,
 * and as an instance-for-instance **matrix digest** of a whole standard board,
 * which is a scale fixture and lives in the sibling file. Both need the same
 * material library and the same flattening, so they live here rather than being
 * exported from a test file — importing a `.test.ts` from a `.test.ts`
 * re-registers its tests.
 */
import { BackSide, type BufferGeometry, Group, InstancedMesh, Matrix4 } from 'three';

import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import type { GameMap } from '../../src/sim/map';

export function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
}

export interface BoardStats {
  drawCalls: number;
  instances: number;
  /** Instance count per geometry, so a kind can be found without a colour. */
  byGeometry: Map<BufferGeometry, number>;
  meshes: InstancedMesh[];
}

export function statsFor(map: GameMap, geometry: BoardGeometry): BoardStats {
  const board = buildBoard(map, geometry, materials(), false);
  const meshes: InstancedMesh[] = [];
  const byGeometry = new Map<BufferGeometry, number>();
  let instances = 0;
  for (const child of board.group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    meshes.push(child);
    // Only the subjects are counted per geometry: an outline shell shares its
    // subject's geometry and would double every kind that has one. A shell is
    // the only back-faced thing on the board — see `MaterialLibrary.outline`.
    if (!Array.isArray(child.material) && child.material.side === BackSide) continue;
    byGeometry.set(child.geometry, (byGeometry.get(child.geometry) ?? 0) + child.count);
    instances += child.count;
  }
  return { drawCalls: board.drawCalls, instances, byGeometry, meshes };
}

/** Every instance matrix in a group, flattened, for a byte-level comparison. */
export function matrixDigest(group: Group): number[] {
  const out: number[] = [];
  const matrix = new Matrix4();
  for (const child of group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    for (let i = 0; i < child.count; i++) {
      child.getMatrixAt(i, matrix);
      out.push(...matrix.elements);
    }
  }
  return out;
}
