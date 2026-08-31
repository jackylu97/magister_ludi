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

import { type Bounds, DioramaCamera } from '../../src/render3d/camera3d';
import { boardBounds, wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { generateMap } from '../../src/sim/mapgen';

const CAMERA = VIEW3D.camera;

/**
 * `maxFrustum` — how far out the diorama can zoom — was cut to two-thirds of
 * its former 46 (2026-08-30, the "reduce max zoom" ruling). Pinned deliberately,
 * against the historical value, so a future change to the widest view is a
 * decision rather than a drift.
 */
describe('camera.maxFrustum', () => {
  it('is two-thirds of the pre-ruling ceiling of 46', () => {
    expect(CAMERA.maxFrustum).toBeCloseTo(46 * (2 / 3), 1);
    expect(CAMERA.maxFrustum).toBeLessThan(46);
  });
});

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

/**
 * `frameCells` — the "open a city" camera move: pan and zoom together, to a
 * small rectangle rather than the whole board.
 *
 * Three things about it are not exercised by anything above and are exactly
 * what could regress silently: the zoom actually tightens onto a small
 * rectangle (unlike `panTo`, which never touches it), the zoom-out ceiling it
 * is bounded by is the diorama's ordinary one rather than one `frameBoard`
 * raised, and the target lands biased off the rectangle's true centre so a
 * fixed-width panel would not cover it — never *on* the centre.
 */
describe('DioramaCamera.frameCells', () => {
  const rect: Bounds = { minX: 10, maxX: 13, minZ: 8, maxZ: 11 };

  it('jumps to a tightened zoom, biased off the rectangle centre', () => {
    const camera = seated();
    camera.panTo(0, 0, false, 0);
    const before = camera.radius;

    camera.frameCells(rect, false, 0);
    expect(camera.isPanning).toBe(false);
    // A three-unit rectangle needs far less frustum than the default zoom.
    expect(camera.radius).toBeLessThan(before);

    const centreX = (rect.minX + rect.maxX) / 2;
    const centreZ = (rect.minZ + rect.maxZ) / 2;
    // The camera looks along a fixed azimuth (see the module docblock), so
    // "biased" must move the target off centre in at least one axis — never
    // land exactly on it.
    const offCentre = Math.hypot(camera.target.x - centreX, camera.target.z - centreZ);
    expect(offCentre).toBeGreaterThan(0);
  });

  it('never raises the zoom-out ceiling the way frameBoard does', () => {
    const camera = seated();
    const ceiling = CAMERA.maxFrustum;
    // A rectangle far larger than the whole board would ask `frameBoard` for
    // a frustum past its ceiling; `frameCells` must clamp to it instead of
    // raising it.
    const huge: Bounds = { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 };
    camera.frameCells(huge, false, 0);
    expect(camera.radius).toBeCloseTo(ceiling, 6);

    // Proof the ceiling itself did not move: an ordinary `frameBoard` right
    // after still fits the real board at its own (much smaller) frustum,
    // which it could not if `frameCells` had left the ceiling raised to
    // whatever `huge` needed.
    camera.frameBoard(bounds);
    expect(camera.radius).toBeLessThan(ceiling);
  });

  it('eases the pan and the zoom together, landing exactly on both', () => {
    const camera = seated();
    camera.panTo(0, 0, false, 0);
    const startRadius = camera.radius;

    camera.frameCells(rect, true, 1000);
    expect(camera.isPanning).toBe(true);
    // The tween owns both from here; nothing has moved yet.
    expect(camera.target.x).toBeCloseTo(0, 6);
    expect(camera.radius).toBeCloseTo(startRadius, 6);

    expect(camera.stepPan(1000 + CAMERA.panMs / 2)).toBe(true);
    const midRadius = camera.radius;
    // Framing a tiny rectangle only ever zooms *in* from the default.
    expect(midRadius).toBeLessThan(startRadius);
    expect(midRadius).toBeGreaterThan(0);

    expect(camera.stepPan(1000 + CAMERA.panMs * 1.7)).toBe(true);
    expect(camera.isPanning).toBe(false);
    // Lands on the same answer the immediate jump would have given.
    const jumped = seated();
    jumped.panTo(0, 0, false, 0);
    jumped.frameCells(rect, false, 0);
    expect(camera.target.x).toBeCloseTo(jumped.target.x, 6);
    expect(camera.target.z).toBeCloseTo(jumped.target.z, 6);
    expect(camera.radius).toBeCloseTo(jumped.radius, 6);
  });

  it('is cancelled by the player’s own hand, like any other pan', () => {
    const camera = seated();
    camera.panTo(0, 0, false, 0);
    camera.frameCells(rect, true, 0);
    camera.pan(5, 5);
    expect(camera.isPanning).toBe(false);
    expect(camera.stepPan(CAMERA.panMs)).toBe(false);
  });
});

/**
 * `openAt` — the boot camera for a brand-new game (2026-08-30, the
 * boot-camera ruling): jumps to a point at `camera.startZoom`'s fraction of
 * the way from the ordinary `frustum` to `minFrustum`.
 */
describe('DioramaCamera.openAt', () => {
  it('jumps straight to the point, never animating', () => {
    const camera = seated();
    camera.panTo(0, 0, false, 0);
    camera.openAt(9, 4);
    expect(camera.isPanning).toBe(false);
    expect(camera.target.x).toBeCloseTo(9, 6);
    expect(camera.target.z).toBeCloseTo(4, 6);
  });

  it('zooms to the configured startZoom fraction toward minFrustum', () => {
    const camera = seated();
    camera.openAt(0, 0);
    const expected =
      CAMERA.frustum - CAMERA.startZoom * (CAMERA.frustum - CAMERA.minFrustum);
    expect(camera.radius).toBeCloseTo(expected, 6);
    // Closer than the ordinary opening zoom, and no closer than the camera
    // ever allows.
    expect(camera.radius).toBeLessThan(CAMERA.frustum);
    expect(camera.radius).toBeGreaterThanOrEqual(CAMERA.minFrustum);
  });

  it('is cancelled by the player’s own hand, like any other pan', () => {
    const camera = seated();
    camera.openAt(9, 4);
    camera.pan(5, 5);
    expect(camera.isPanning).toBe(false);
    expect(camera.stepPan(CAMERA.panMs)).toBe(false);
  });
});
