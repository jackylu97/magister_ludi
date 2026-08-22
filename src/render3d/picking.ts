/**
 * Which tile is under the cursor — closed form, no GPU readback.
 *
 * The board is not an arbitrary mesh. Every tile top is a horizontal hexagon at
 * one of five known heights, and the ground layout inverts exactly (see
 * `layout.ts`). So picking never has to render an id buffer or walk a BVH: it
 * intersects the mouse ray with each of the five height planes, converts the hit
 * to a hex with `pixelToHex`, and takes the first candidate — testing the planes
 * top-down — whose tile actually belongs to that height class.
 *
 * Why top-down is the right order: a hit on a higher plane is nearer the eye, so
 * if a mountain top and a coast top both project onto this pixel, the mountain is
 * the one you can see. Reading the planes in descending height order and
 * stopping at the first class match reproduces occlusion exactly, for the cost
 * of at most five plane intersections and five array lookups.
 *
 * The approximations, stated plainly
 * ----------------------------------
 * This is the 3D sibling of the 2D renderer's documented "picking ignores
 * elevation rises" trade, and it is wrong in the same *kind* of place: at the
 * edges, where a raised tile's side wall is visible.
 *
 *   Cliff faces. The vertical side of a hills or mountain prism belongs to no
 *   height plane. A cursor over a cliff face therefore matches no class, and the
 *   fallback (the ground-plane hit) resolves it to whichever tile the land plane
 *   lands on — in practice the tile the cliff rises out of or its downhill
 *   neighbour. The band is one prism-height wide on screen, about a third of a
 *   hex at the default heights.
 *
 *   Mountain peaks. The cone on a mountain tile stands well above its own tile
 *   top and is not part of the height model at all. Clicking the upper part of a
 *   peak's silhouette picks the tile *behind* the peak, which is what the ground
 *   under that pixel really is.
 *
 *   Height jitter. Tiles are scaled by up to ±3.5%, so a real top face sits a few
 *   hundredths of a unit off its nominal plane. At a 57° camera that displaces
 *   the hit by ~0.03 hex radii — a twenty-fifth of the distance from a hex centre
 *   to its edge, and far too small to change which hex a click lands in except
 *   for a cursor already balanced on a boundary.
 *
 * All three are bounded by roughly one prism height, none of them can pick a
 * tile that is not adjacent to the right one, and every one of them buys the
 * same thing: picking stays a pure function of the mouse position and the map,
 * cheap enough to run on every pointermove and testable without a GPU.
 *
 * The second question: which *badge* is under the cursor
 * -----------------------------------------------------
 * Tiles are picked by casting a ray *into* the world. Badges are picked the
 * other way round — by projecting each candidate *out* to the screen and
 * measuring in pixels — and that inversion is deliberate rather than lazy. A
 * badge is a camera-facing disc floating over a piece: on screen it is exactly a
 * circle, so "did the pointer land on it" is one `hypot` against one radius,
 * where a ray/quad intersection in world space would be the same answer computed
 * through a rotation nobody needs. There is no depth to resolve either, because
 * the candidates are one player's units and a handful of them ever overlap.
 *
 * The radius is *derived* from the projection rather than assumed. `pickBadge`
 * is handed a world-space offset from a badge's centre to its rim (the camera's
 * own right vector, scaled by `badgeHitRadius`) and projects both ends, so the
 * pixel radius it tests against is whatever the camera currently makes of a
 * world-sized disc. That is what keeps the target honest at every zoom without a
 * per-zoom constant to keep in step with the camera — and it would keep working
 * if the camera ever stopped being orthographic.
 */

import type { GameMap, Tile } from '../sim/map';

import { type Ray, rayPlaneHit } from './camera3d';
import {
  HEIGHT_CLASSES_TOP_DOWN,
  heightClassOf,
  nominalTopY,
  worldToCell,
} from './layout';

export interface PickResult {
  tile: Tile;
  /** Canonical column, wrapped into `[0, map.width)`. Same as `tile.col`. */
  col: number;
  row: number;
  /**
   * The un-wrapped column, i.e. which copy of the cylinder the cursor was over.
   * Overlays are drawn in every copy, so nothing needs this today — it is here
   * because `HoverInfo` promises it and the 2D renderer's overlays use it.
   */
  worldCol: number;
}

/**
 * The tile under a world-space ray, or `null` if the ray leaves the board past
 * the north or south pole (columns wrap; rows do not).
 */
export function pickTile(map: GameMap, ray: Ray): PickResult | null {
  for (const kind of HEIGHT_CLASSES_TOP_DOWN) {
    const hit = rayPlaneHit(ray, nominalTopY(kind));
    const cell = worldToCell(map, hit.x, hit.z);
    if (!cell) continue;
    if (heightClassOf(cell.tile) !== kind) continue;
    return { tile: cell.tile, col: cell.col, row: cell.row, worldCol: cell.worldCol };
  }

  // Nothing matched: the cursor is over a cliff face or a peak. Resolve it the
  // way the 2D renderer resolves everything — on the flat ground plane — so a
  // pointer over the board always names a tile instead of blinking to nothing.
  const ground = rayPlaneHit(ray, nominalTopY('land'));
  const cell = worldToCell(map, ground.x, ground.z);
  if (!cell) return null;
  return { tile: cell.tile, col: cell.col, row: cell.row, worldCol: cell.worldCol };
}

// --- badges ----------------------------------------------------------------

/** A point in world space. Not `Vector3`, so this file stays free of three. */
export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * One badge to test: where its centre floats, and the unit it names.
 *
 * A unit contributes *one anchor per wrap copy* of the board — the same three
 * copies the renderer bakes — because a badge near the seam is on screen in a
 * copy whose world x is a whole map away from the unit's canonical one. They
 * carry the same `unitId`, so which copy the pointer found is not a question
 * anybody asks afterwards.
 */
export interface BadgeAnchor extends WorldPoint {
  unitId: number;
}

/**
 * World point → viewport CSS pixels, or `null` for a point the camera cannot
 * place. The renderer's own projection, passed in so this stays testable
 * without a canvas — and so a test can drive three's `project` directly rather
 * than our inverse of it, exactly as the tile round-trip does.
 */
export type ScreenProjection = (point: WorldPoint) => { x: number; y: number } | null;

/**
 * The badge under a viewport position, or `null` if the pointer is on none of
 * them.
 *
 * `rim` is a world-space offset from a badge's centre out to the edge of its
 * click target — the camera's right vector times `badgeHitRadius()`. Projecting
 * `centre + rim` and measuring back to the projected centre is what turns a
 * world radius into a pixel one, per anchor and at whatever zoom the player has
 * settled on. Under this renderer's orthographic camera every badge gets the
 * same number, which is precisely why it is *computed* rather than written down:
 * the day the projection changes, so does the target, with nothing to update.
 *
 * Nearest wins when several overlap, measured from the pointer to each badge's
 * *centre* rather than by depth. A stack of pieces fans its badges out around
 * the tile centre, so the one whose middle the pointer is closest to is the one
 * it is aimed at; asking which is in front would answer a question about the
 * board rather than about the gesture. Ties keep the first anchor, which makes
 * the result a function of `state.units` order and therefore stable.
 */
export function pickBadge(
  anchors: readonly BadgeAnchor[],
  screenX: number,
  screenY: number,
  project: ScreenProjection,
  rim: WorldPoint,
): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;

  for (const anchor of anchors) {
    const centre = project(anchor);
    if (!centre) continue;
    const edge = project({
      x: anchor.x + rim.x,
      y: anchor.y + rim.y,
      z: anchor.z + rim.z,
    });
    if (!edge) continue;

    const radius = Math.hypot(edge.x - centre.x, edge.y - centre.y);
    if (radius <= 0) continue;
    const distance = Math.hypot(screenX - centre.x, screenY - centre.y);
    if (distance > radius) continue;
    if (distance >= bestDistance) continue;
    best = anchor.unitId;
    bestDistance = distance;
  }

  return best;
}
