/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the river ribbon
 * joined on real rivers.
 *
 * A sweep over generated maps, and it has to be: what the test asserts is that
 * **every** consecutive pair of segments in **every** river shares an end, and a
 * river is a thing the generator makes rather than a thing a fixture can pose.
 * Two sizes by four seeds is eight generations, which is what puts it here; the
 * geometry the test is checking costs nothing at all.
 *
 * `picking3d.test.ts` keeps the ribbon's other two claims — the overhang that
 * closes the corner each join turns through, and that the ribbon stays buried
 * under both prisms it runs between — along with the whole badge-picking
 * concern, all of which is arithmetic on a hand-placed hex.
 */
import { describe, expect, it } from 'vitest';

import { cellCenter, directionDelta, edgeYaw, wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { generateMapDetail } from '../../src/sim/mapgen';

describe('river ribbon continuity', () => {
  function ribbonEnds(
    col: number,
    row: number,
    direction: number,
  ): { x: number; z: number }[] {
    const centre = cellCenter(col, row);
    const delta = directionDelta(direction);
    const mid = { x: centre.x + delta.x / 2, z: centre.z + delta.z / 2 };
    const yaw = edgeYaw(direction);
    // A hexagon's side equals its circumradius, so the edge is one radius long.
    const half = VIEW3D.board.hexRadius / 2;
    const axis = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    return [
      { x: mid.x + axis.x * half, z: mid.z + axis.z * half },
      { x: mid.x - axis.x * half, z: mid.z - axis.z * half },
    ];
  }

  /** Distance between two world points, folded across the wrap seam. */
  function seamDistance(
    a: { x: number; z: number },
    b: { x: number; z: number },
    period: number,
  ): number {
    let dx = a.x - b.x;
    dx -= period * Math.round(dx / period);
    return Math.hypot(dx, a.z - b.z);
  }

  it('joins every consecutive pair of segments end to end', () => {
    for (const size of ['duel', 'standard'] as const) {
      for (const seed of [1, 7, 1234, 31337]) {
        const { map, rivers } = generateMapDetail(seed, size);
        const period = wrapWidth(map);
        for (const river of rivers) {
          for (let i = 1; i < river.edges.length; i++) {
            const previous = river.edges[i - 1]!;
            const current = river.edges[i]!;
            const a = ribbonEnds(previous.col, previous.row, previous.direction);
            const b = ribbonEnds(current.col, current.row, current.direction);
            let shared = Infinity;
            for (const p of a) {
              for (const q of b) shared = Math.min(shared, seamDistance(p, q, period));
            }
            expect(
              shared,
              `${size}/${seed}: segments ${i - 1} and ${i} do not meet`,
            ).toBeLessThan(1e-9);
          }
        }
      }
    }
  });

});
