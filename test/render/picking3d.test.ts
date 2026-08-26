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

import { badgeCenterY, badgeHitRadius } from '../../src/render3d/badges3d';
import { pieceHeightFor } from '../../src/render3d/board3d';
import { DioramaCamera, rayPlaneHit } from '../../src/render3d/camera3d';
import {
  HEIGHT_CLASSES_TOP_DOWN,
  boardBounds,
  cellCenter,
  directionDelta,
  edgeYaw,
  heightClassOf,
  nominalTopY,
  tileTopY,
  worldToCell,
  wrapWidth,
} from '../../src/render3d/layout';
import {
  type BadgeAnchor,
  type ScreenProjection,
  type WorldPoint,
  pickBadge,
  pickTile,
} from '../../src/render3d/picking';
import { generateMap } from '../../src/sim/mapgen';
import { SQRT3 } from '../../src/sim/hex';
import type { GameMap } from '../../src/sim/map';
import { VIEW3D } from '../../src/render3d/lookData';

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

/**
 * Where a river ribbon goes.
 *
 * `board3d.ts` places one flat quad per flagged edge at the midpoint of the step
 * to the neighbour, rotated so its long axis lies *along* that edge. Both halves
 * of that are pure math and both are easy to get 60° wrong, so they are pinned
 * here rather than left to an eyeball at 57° elevation.
 */
describe('river ribbon placement', () => {
  it('steps to a neighbour without ever consulting a wrapped column', () => {
    const map = generateMap(4242, 'duel');
    const period = wrapWidth(map);
    for (let direction = 0; direction < 6; direction++) {
      const delta = directionDelta(direction);
      // One hex step is one hex step wherever you stand: the same displacement
      // at the seam as in the middle of the board.
      expect(Math.hypot(delta.x, delta.z)).toBeCloseTo(SQRT3, 12);
      // ...and never a whole world away, which is what differencing two
      // `cellCenter` calls across the seam would give.
      expect(Math.abs(delta.x)).toBeLessThan(period / 2);
    }
  });

  it('lays the ribbon across the step, not along it', () => {
    for (let direction = 0; direction < 6; direction++) {
      const delta = directionDelta(direction);
      const yaw = edgeYaw(direction);
      // The quad's local +x after a yaw rotation about +y.
      const axis = { x: Math.cos(yaw), z: -Math.sin(yaw) };
      expect(axis.x * delta.x + axis.z * delta.z).toBeCloseTo(0, 12);
    }
  });

  it('gives opposite directions the same edge line', () => {
    for (let direction = 0; direction < 3; direction++) {
      const near = edgeYaw(direction);
      const far = edgeYaw(direction + 3);
      // Same line, half a turn apart: the edge does not care which tile named it.
      expect(Math.abs(Math.sin(near - far))).toBeCloseTo(0, 12);
    }
  });
});

/**
 * Do rivers actually read as continuous chains?
 *
 * This is the question a screenshot was supposed to answer, asked more strictly
 * than an eye can ask it. Each flagged edge becomes one ribbon, and a ribbon's
 * *edge line* — its centre ± half a hex radius along `edgeYaw` — is where its
 * two ends physically are. If two consecutive edges of a traced river do not
 * share an end within floating-point slop, the drawn river has a gap in it, and
 * no amount of overhang closes a gap that is a whole hex wide.
 *
 * The comparison is wrap-aware. `cellCenter` takes the canonical column, so two
 * edges either side of the seam are a full board apart in world x while being
 * neighbours on the cylinder; folding the difference modulo the wrap period is
 * the same trick `wrappedDistance` plays in the simulation.
 */
describe('river ribbon continuity', () => {
  it('overhangs far enough to close the corner each join turns through', () => {
    // Consecutive edges meet at 120°, so a ribbon that stopped exactly at the
    // corner would leave a wedge open. The overhang has to cover half the
    // ribbon width to fill it; this is the number `rivers.overhang` has to beat.
    const { width, overhang } = VIEW3D.rivers;
    const overhangLength = (VIEW3D.board.hexRadius * (overhang - 1)) / 2;
    expect(overhangLength).toBeGreaterThanOrEqual((width / 2) * 0.4);
  });

  it('keeps the ribbon buried under both prisms it runs between', () => {
    // The visible part of a river is exactly the grout gap; the rest has to be
    // inside a prism or it would be a blue stripe painted on the tile faces.
    const { hexRadius, tileGap } = VIEW3D.board;
    const apothem = (hexRadius * (1 - tileGap) * SQRT3) / 2;
    const gap = SQRT3 * hexRadius - 2 * apothem;
    const halfWidth = (hexRadius * VIEW3D.rivers.width) / 2;
    // Wider than the gap it fills...
    expect(halfWidth).toBeGreaterThan(gap / 2);
    // ...but not so wide it reaches past the prism's top face and out the far
    // side, which would show the ribbon sitting on the neighbouring tile.
    expect(halfWidth).toBeLessThan(apothem);
  });
});

/**
 * The other picking question: which *badge* is under the cursor.
 *
 * Tiles are picked by casting a ray into the world; badges are picked by
 * projecting each one out to the screen and measuring in pixels, because a badge
 * is a camera-facing disc and on screen it is exactly a circle (see the docblock
 * in `picking.ts`). What is worth holding still is the part that has no
 * screenshot to check it against: the target's *size*, which is derived from the
 * projection so that it is right at every zoom, and the wrap, without which a
 * unit beside the seam has an unclickable tag.
 *
 * As with the tile round-trip, the forward direction is three's own `project`
 * and only the answer is our code, so a mistake shared between our forward and
 * inverse maths would still fail here.
 */
describe('badge hit testing', () => {
  const map = generateMap(1, 'duel');
  /** The badge floats over a warrior, which is a class height like any other. */
  const LIFT = badgeCenterY(pieceHeightFor('warrior'));

  /** The renderer's world→viewport projection, in the test's own arithmetic. */
  function projectionOf(camera: DioramaCamera): ScreenProjection {
    return (point: WorldPoint) => {
      const ndc = new Vector3(point.x, point.y, point.z).project(camera.camera);
      return {
        x: ((ndc.x + 1) / 2) * VIEWPORT.width,
        y: ((1 - ndc.y) / 2) * VIEWPORT.height,
      };
    };
  }

  /** Centre → rim, along the camera's right vector: what sets the radius. */
  function rimOf(camera: DioramaCamera): WorldPoint {
    const right = new Vector3().setFromMatrixColumn(camera.camera.matrixWorld, 0).normalize();
    const radius = badgeHitRadius();
    return { x: right.x * radius, y: right.y * radius, z: right.z * radius };
  }

  /** A badge floating over the tile at `col,row`, in the copy `copies` away. */
  function anchorAt(col: number, row: number, unitId: number, copy = 0): BadgeAnchor {
    const tile = map.tiles[row * map.width + col]!;
    const centre = cellCenter(col, row);
    return {
      unitId,
      x: centre.x + copy * wrapWidth(map),
      y: tileTopY(tile) + LIFT,
      z: centre.z,
    };
  }

  /**
   * How many pixels one world unit is worth at this zoom, computed from the
   * camera's own frustum rather than from the projection — an independent second
   * opinion, so a wrong radius cannot agree with itself.
   */
  function pixelsPerWorldUnit(camera: DioramaCamera): number {
    return VIEWPORT.height / (2 * camera.radius);
  }

  function cameraOn(anchor: BadgeAnchor, zoom: number): DioramaCamera {
    const camera = makeCamera(map);
    camera.lookAtPoint(new Vector3(anchor.x, 0, anchor.z));
    if (zoom !== 1) camera.zoomByFactor(zoom, VIEWPORT.width / 2, VIEWPORT.height / 2);
    return camera;
  }

  it('takes a click inside the disc and refuses one just outside it, at every zoom', () => {
    for (const zoom of [0.3, 1, 2.5]) {
      const anchor = anchorAt(20, 12, 7);
      const camera = cameraOn(anchor, zoom);
      const project = projectionOf(camera);
      const centre = project(anchor)!;
      const radius = badgeHitRadius() * pixelsPerWorldUnit(camera);
      const hit = (dx: number, dy: number): number | null =>
        pickBadge([anchor], centre.x + dx, centre.y + dy, project, rimOf(camera));

      expect(hit(0, 0), `zoom ${zoom}`).toBe(7);
      expect(hit(radius * 0.95, 0), `zoom ${zoom}`).toBe(7);
      expect(hit(0, -radius * 0.95), `zoom ${zoom}`).toBe(7);
      // A disc, not a square: the corner of the bounding box is outside it.
      expect(hit(radius * 0.75, radius * 0.75), `zoom ${zoom}`).toBeNull();
      expect(hit(radius * 1.05, 0), `zoom ${zoom}`).toBeNull();
    }
  });

  it('scales the target with the zoom rather than holding a pixel constant', () => {
    // The whole reason the radius is projected. A badge is a thing in the world,
    // so zooming in makes it a bigger target — and a hand-written pixel radius
    // would be right at exactly one zoom and increasingly wrong either side.
    const anchor = anchorAt(20, 12, 3);
    const measured = [0.5, 1, 2].map((zoom) => {
      const camera = cameraOn(anchor, zoom);
      const project = projectionOf(camera);
      const centre = project(anchor)!;
      const edge = project({
        x: anchor.x + rimOf(camera).x,
        y: anchor.y + rimOf(camera).y,
        z: anchor.z + rimOf(camera).z,
      })!;
      return {
        camera,
        radius: Math.hypot(edge.x - centre.x, edge.y - centre.y),
      };
    });

    for (const { camera, radius } of measured) {
      expect(radius).toBeCloseTo(badgeHitRadius() * pixelsPerWorldUnit(camera), 6);
    }
    // Twice the zoom, twice the target.
    expect(measured[1]!.radius / measured[0]!.radius).toBeCloseTo(2, 6);
    expect(measured[2]!.radius / measured[1]!.radius).toBeCloseTo(2, 6);
  });

  it('forgives a click by exactly the hitbox knob and no more', () => {
    const anchor = anchorAt(20, 12, 5);
    const camera = cameraOn(anchor, 1);
    const project = projectionOf(camera);
    const centre = project(anchor)!;
    const scale = pixelsPerWorldUnit(camera);
    const drawn = (VIEW3D.badges.diameter / 2) * scale;
    const target = badgeHitRadius() * scale;

    // Between the ink and the edge of the target: a click that missed the disc
    // by a hair still selects, which is the whole point of the knob.
    expect(target).toBeGreaterThan(drawn);
    const between = (drawn + target) / 2;
    expect(pickBadge([anchor], centre.x + between, centre.y, project, rimOf(camera))).toBe(5);
    expect(pickBadge([anchor], centre.x + target * 1.02, centre.y, project, rimOf(camera))).toBeNull();
  });

  it('finds a badge through whichever copy of the cylinder is on screen', () => {
    // A unit in column 0 with the camera looking at the *east* edge: its badge
    // is on screen a whole map width east of its canonical position, which is
    // the copy the renderer draws there and the copy the pointer is over.
    const period = wrapWidth(map);
    const camera = makeCamera(map);
    camera.lookAtPoint(new Vector3(period - 1.5, 0, 12 * 1.5));
    const project = projectionOf(camera);
    const rim = rimOf(camera);

    const copies = [-1, 0, 1].map((copy) => anchorAt(0, 12, 9, copy));
    const visible = copies
      .map((anchor) => ({ anchor, screen: toScreen(camera, new Vector3(anchor.x, anchor.y, anchor.z)) }))
      .find((entry) => entry.screen !== null);
    expect(visible, 'no copy of the badge was on screen at all').toBeDefined();
    const point = visible!.screen!;

    expect(pickBadge(copies, point.x, point.y, project, rim)).toBe(9);
    // And the canonical copy alone would have missed it — which is what a
    // wrap-blind hit test would have shipped.
    expect(pickBadge([anchorAt(0, 12, 9)], point.x, point.y, project, rim)).toBeNull();
  });

  it('gives an overlapping pair to whichever badge the pointer is nearer', () => {
    const camera = cameraOn(anchorAt(20, 12, 1), 1);
    const project = projectionOf(camera);
    const rim = rimOf(camera);
    const a = anchorAt(20, 12, 1);
    // Half a badge to the east: the two targets overlap, as a stack's do.
    const b = { ...a, unitId: 2, x: a.x + badgeHitRadius() };

    const centreA = project(a)!;
    const centreB = project(b)!;
    const mid = { x: (centreA.x + centreB.x) / 2, y: (centreA.y + centreB.y) / 2 };
    expect(pickBadge([a, b], centreA.x, centreA.y, project, rim)).toBe(1);
    expect(pickBadge([a, b], centreB.x, centreB.y, project, rim)).toBe(2);
    expect(pickBadge([a, b], mid.x - 1, mid.y, project, rim)).toBe(1);
    expect(pickBadge([a, b], mid.x + 1, mid.y, project, rim)).toBe(2);
    // Two badges at exactly one point — the tie a stack of overlapping copies
    // can genuinely produce — keep the first, so the answer is a function of
    // `state.units` order rather than of which comparison happened to run last.
    expect(
      pickBadge([a, { ...a, unitId: 2 }], centreA.x, centreA.y, project, rim),
    ).toBe(1);
  });

  it('answers nothing on ground with no badge over it, and nothing at all with no badges', () => {
    const anchor = anchorAt(20, 12, 4);
    const camera = cameraOn(anchor, 1);
    const project = projectionOf(camera);
    const centre = project(anchor)!;
    expect(pickBadge([anchor], centre.x + 400, centre.y, project, rimOf(camera))).toBeNull();
    expect(pickBadge([], centre.x, centre.y, project, rimOf(camera))).toBeNull();
  });

  it('skips a badge the projection cannot place', () => {
    // The projection is allowed to say "nowhere". A hit test that read that as
    // the origin would put a phantom target in the top-left corner of the board.
    const anchor = anchorAt(20, 12, 6);
    const camera = cameraOn(anchor, 1);
    const project = projectionOf(camera);
    const centre = project(anchor)!;
    const blind: ScreenProjection = () => null;
    expect(pickBadge([anchor], centre.x, centre.y, blind, rimOf(camera))).toBeNull();
  });
});
