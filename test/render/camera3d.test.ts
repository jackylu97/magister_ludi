/**
 * The diorama camera's animated pan — the seat-change gesture.
 *
 * Everything here is arithmetic on the pan target: no GL context, no clock of
 * its own (`panTo`/`stepPan` are handed the time, exactly as the move animation
 * is). The two things worth pinning down are the ones nobody can check by eye:
 * that a pan across the east–west seam takes the short way round instead of
 * unwinding the whole board, and that the tween lands *exactly* on its
 * destination rather than wherever the last sampled frame fell.
 */

import { describe, expect, it } from 'vitest';

import { DioramaCamera } from '../../src/render3d/camera3d';
import { boardBounds, wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { generateMap } from '../../src/sim/mapgen';

const CAMERA = VIEW3D.camera;
const map = generateMap(11, 'duel');
const period = wrapWidth(map);
const bounds = boardBounds(map);

/** A camera that knows about the board, so wrapping and clamping are live. */
function seated(): DioramaCamera {
  const camera = new DioramaCamera();
  camera.resize(1200, 800);
  camera.setBoard(bounds, period);
  return camera;
}

/** The wrapped distance between two world x values, in either direction. */
function seamDistance(a: number, b: number): number {
  const raw = Math.abs(((a - b) % period + period) % period);
  return Math.min(raw, period - raw);
}

describe('DioramaCamera.panTo', () => {
  it('jumps immediately when asked not to animate', () => {
    const camera = seated();
    camera.panTo(12, 9, false, 0);
    expect(camera.isPanning).toBe(false);
    expect(camera.target.x).toBeCloseTo(12, 6);
    expect(camera.target.z).toBeCloseTo(9, 6);
  });

  it('jumps rather than tweening a distance nobody would see', () => {
    const camera = seated();
    camera.panTo(10, 10, false, 0);
    camera.panTo(10 + CAMERA.panSnapDistance / 2, 10, true, 0);
    expect(camera.isPanning).toBe(false);
  });

  it('eases to the destination and lands on it exactly', () => {
    const camera = seated();
    camera.panTo(6, 6, false, 0);
    camera.panTo(20, 14, true, 1000);
    expect(camera.isPanning).toBe(true);
    // The tween owns the target from here; nothing has moved yet.
    expect(camera.target.x).toBeCloseTo(6, 6);

    expect(camera.stepPan(1000 + CAMERA.panMs / 2)).toBe(true);
    const halfway = camera.target.x;
    expect(halfway).toBeGreaterThan(6);
    expect(halfway).toBeLessThan(20);

    // Sampled past the end: the final step lands on the destination, not on the
    // eased value of whatever frame happened to arrive last.
    expect(camera.stepPan(1000 + CAMERA.panMs * 1.7)).toBe(true);
    expect(camera.isPanning).toBe(false);
    expect(camera.target.x).toBeCloseTo(20, 6);
    expect(camera.target.z).toBeCloseTo(14, 6);
    // And an idle camera reports no frame to draw.
    expect(camera.stepPan(9999)).toBe(false);
  });

  it('crosses the seam the short way', () => {
    const camera = seated();
    // Just east of the origin, panning to just west of the far edge: the short
    // way is a few units backwards across the seam, not most of a map forwards.
    camera.panTo(1, 5, false, 0);
    const destination = period - 2;
    camera.panTo(destination, 5, true, 0);

    let previous = camera.target.x;
    let travelled = 0;
    for (let t = 16; t <= CAMERA.panMs + 16; t += 16) {
      camera.stepPan(t);
      travelled += seamDistance(camera.target.x, previous);
      previous = camera.target.x;
    }
    // Three hexes of travel, not most of the board.
    expect(travelled).toBeLessThan(period / 4);
    expect(seamDistance(camera.target.x, destination)).toBeCloseTo(0, 6);
  });

  it('keeps the zoom the player chose', () => {
    const camera = seated();
    const before = camera.radius;
    camera.panTo(18, 11, true, 0);
    camera.stepPan(CAMERA.panMs);
    expect(camera.radius).toBe(before);
  });

  it('yields to the player’s own hand', () => {
    const camera = seated();
    camera.panTo(4, 4, false, 0);
    camera.panTo(24, 12, true, 0);

    camera.pan(10, 10);
    expect(camera.isPanning).toBe(false);
    // The drag, not the abandoned tween, is what the target says.
    const dragged = camera.target.x;
    expect(camera.stepPan(CAMERA.panMs)).toBe(false);
    expect(camera.target.x).toBe(dragged);
  });

  it('is dropped by a re-frame of the whole board', () => {
    const camera = seated();
    camera.panTo(24, 12, true, 0);
    camera.frameBoard(bounds);
    expect(camera.isPanning).toBe(false);
  });
});
