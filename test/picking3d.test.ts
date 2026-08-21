/**
 * Round-trip tests for the 3D renderer's closed-form picking.
 *
 * The contract under test is the one the whole interaction model rests on: the
 * centre of a tile, projected through the camera onto the screen and picked back
 * up, must be that same tile. Not "a nearby tile" — the exact one, for every
 * tile of a real generated map, at several zooms, at several camera positions,
 * and on both sides of the east–west seam.
 *
 * The projection direction is deliberately *not* the renderer's own inverse: the
 * test drives `THREE.Camera.project`, three's own world→NDC transform, and only
 * the way back is our code. A mistake shared between our forward and inverse
 * maths would therefore still fail the test.
 *
 * Where picking is knowingly approximate (cliff faces, peak silhouettes — see
 * the docblock in `picking.ts`) is *not* tested here, because it has no exact
 * answer to assert. Tile centres do.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';

import { DioramaCamera, rayPlaneHit } from '../src/render3d/camera3d';
import {
  HEIGHT_CLASSES_TOP_DOWN,
  boardBounds,
  cellCenter,
  heightClassOf,
  nominalTopY,
  tileTopY,
  worldToCell,
  wrapWidth,
} from '../src/render3d/layout';
import { pickTile } from '../src/render3d/picking';
import { generateMap } from '../src/sim/mapgen';
import { SQRT3 } from '../src/sim/hex';
import type { GameMap } from '../src/sim/map';

const VIEWPORT = { width: 1200, height: 800 };

function makeCamera(map: GameMap): DioramaCamera {
  const camera = new DioramaCamera();
  camera.resize(VIEWPORT.width, VIEWPORT.height);
  camera.setBoard(boardBounds(map), wrapWidth(map));
  return camera;
}

/** Viewport pixel position of a world point, or null if it is off screen. */
function toScreen(camera: DioramaCamera, world: Vector3): { x: number; y: number } | null {
  const ndc = world.clone().project(camera.camera);
  if (ndc.x < -1 || ndc.x > 1 || ndc.y < -1 || ndc.y > 1) return null;
  return {
    x: ((ndc.x + 1) / 2) * VIEWPORT.width,
    y: ((1 - ndc.y) / 2) * VIEWPORT.height,
  };
}

/**
 * Projects a tile's real, jittered top-centre — trying each of the three baked
 * copies of the cylinder — and picks it back. Returns null when the tile is not
 * on screen in any copy, which is not a failure, just nothing to assert.
 */
function roundTrip(
  camera: DioramaCamera,
  map: GameMap,
  col: number,
  row: number,
): { col: number; row: number } | null {
  const tile = map.tiles[row * map.width + col]!;
  const center = cellCenter(col, row);
  const period = wrapWidth(map);
  for (const copy of [-1, 0, 1]) {
    const world = new Vector3(center.x + copy * period, tileTopY(tile), center.z);
    const screen = toScreen(camera, world);
    if (!screen) continue;
    const hit = pickTile(map, camera.screenRay(screen.x, screen.y));
    return hit ? { col: hit.col, row: hit.row } : null;
  }
  return null;
}

/** Round-trips every tile and returns how many were visible and how many wrong. */
function sweep(camera: DioramaCamera, map: GameMap): { checked: number; wrong: string[] } {
  const wrong: string[] = [];
  let checked = 0;
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const result = roundTrip(camera, map, col, row);
      if (!result) continue;
      checked++;
      if (result.col !== col || result.row !== row) {
        wrong.push(`(${col},${row}) → (${result.col},${result.row})`);
      }
    }
  }
  return { checked, wrong };
}

describe('3D picking round-trip', () => {
  const map = generateMap(1, 'duel');

  it('picks the right tile at the default zoom', () => {
    const camera = makeCamera(map);
    camera.lookAtPoint(new Vector3(20 * SQRT3, 0, 12 * 1.5));
    const { checked, wrong } = sweep(camera, map);
    expect(checked).toBeGreaterThan(100);
    expect(wrong).toEqual([]);
  });

  it('picks the right tile when the whole board is framed', () => {
    const camera = makeCamera(map);
    camera.frameBoard(boardBounds(map));
    const { checked, wrong } = sweep(camera, map);
    // Framed, the entire map is on screen, so every tile is checked.
    expect(checked).toBe(map.tiles.length);
    expect(wrong).toEqual([]);
  });

  it('picks the right tile at several zoom levels and camera positions', () => {
    // Zoomed hard in, mid, and out; each from a different corner of the board.
    const cases: { zoom: number; target: Vector3 }[] = [
      { zoom: 4, target: new Vector3(6 * SQRT3, 0, 4 * 1.5) },
      { zoom: 1.8, target: new Vector3(31 * SQRT3, 0, 19 * 1.5) },
      { zoom: 1, target: new Vector3(15 * SQRT3, 0, 8 * 1.5) },
      { zoom: 0.5, target: new Vector3(25 * SQRT3, 0, 15 * 1.5) },
      { zoom: 0.25, target: new Vector3(10 * SQRT3, 0, 21 * 1.5) },
    ];
    for (const { zoom, target } of cases) {
      const camera = makeCamera(map);
      camera.lookAtPoint(target);
      if (zoom !== 1) {
        camera.zoomByFactor(zoom, VIEWPORT.width / 2, VIEWPORT.height / 2);
      }
      const { checked, wrong } = sweep(camera, map);
      expect(checked).toBeGreaterThan(20);
      expect(wrong, `zoom ${zoom} at ${target.x},${target.z}`).toEqual([]);
    }
  });

  it('picks the right tile across the east–west seam', () => {
    // Target sitting exactly on the seam, so the visible band spans the last
    // columns of one copy of the cylinder and the first columns of the next.
    const camera = makeCamera(map);
    camera.lookAtPoint(new Vector3(0, 0, 12 * 1.5));
    const { checked, wrong } = sweep(camera, map);
    expect(checked).toBeGreaterThan(100);
    expect(wrong).toEqual([]);

    // And specifically: the two columns either side of the seam must both be
    // reachable, which is the thing a broken wrap would silently drop.
    const seamCols = [0, 1, map.width - 1, map.width - 2];
    for (const col of seamCols) {
      const result = roundTrip(camera, map, col, 12);
      expect(result, `column ${col} at the seam`).toEqual({ col, row: 12 });
    }
  });

  it('zooming keeps the ground point under the cursor fixed', () => {
    const camera = makeCamera(map);
    camera.lookAtPoint(new Vector3(20 * SQRT3, 0, 12 * 1.5));
    const cursor = { x: 300, y: 220 };
    const before = camera.groundAt(cursor.x, cursor.y);
    camera.zoomByFactor(1.6, cursor.x, cursor.y);
    const after = camera.groundAt(cursor.x, cursor.y);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.z).toBeCloseTo(before.z, 6);
  });
});

describe('3D picking internals', () => {
  const map = generateMap(7, 'duel');

  it('orders the height planes from the top down', () => {
    const heights = HEIGHT_CLASSES_TOP_DOWN.map(nominalTopY);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]!).toBeLessThan(heights[i - 1]!);
    }
    expect(HEIGHT_CLASSES_TOP_DOWN[0]).toBe('mountain');
  });

  it('gives every tile a height class with a matching nominal top', () => {
    for (const tile of map.tiles) {
      const kind = heightClassOf(tile);
      expect(HEIGHT_CLASSES_TOP_DOWN).toContain(kind);
      // The jittered top never strays far enough to reach a neighbouring class.
      expect(Math.abs(tileTopY(tile) - nominalTopY(kind))).toBeLessThan(0.1);
    }
  });

  it('intersects a horizontal plane exactly', () => {
    const ray = {
      origin: new Vector3(3, 10, -4),
      direction: new Vector3(1, -2, 0.5).normalize(),
    };
    const hit = rayPlaneHit(ray, 0.4);
    expect(hit.y).toBeCloseTo(0.4, 10);
    // The hit must lie on the ray: same direction, positive parameter.
    const t = hit.clone().sub(ray.origin).length();
    expect(hit.clone().sub(ray.origin).normalize().dot(ray.direction)).toBeCloseTo(1, 10);
    expect(t).toBeGreaterThan(0);
  });

  it('wraps world x into canonical columns', () => {
    const period = wrapWidth(map);
    expect(period).toBeCloseTo(SQRT3 * map.width, 10);
    for (const row of [0, 1, 12, map.height - 1]) {
      for (const col of [0, 5, map.width - 1]) {
        const center = cellCenter(col, row);
        for (const copy of [-2, -1, 0, 1, 2]) {
          const cell = worldToCell(map, center.x + copy * period, center.z);
          expect(cell, `copy ${copy} of (${col},${row})`).not.toBeNull();
          expect(cell!.col).toBe(col);
          expect(cell!.row).toBe(row);
          // The un-wrapped column reports which copy the point landed in.
          expect(cell!.worldCol).toBe(col + copy * map.width);
        }
      }
    }
  });

  it('has no tile past the poles', () => {
    const north = cellCenter(4, 0);
    expect(worldToCell(map, north.x, north.z - 1.5)).toBeNull();
    const south = cellCenter(4, map.height - 1);
    expect(worldToCell(map, south.x, south.z + 1.5)).toBeNull();
  });
});
