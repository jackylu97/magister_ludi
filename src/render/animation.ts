/**
 * Movement animation — render-only, and deliberately powerless.
 *
 * When a `moveUnit` order succeeds the simulation is *already* in its final
 * state: the unit's `col`/`row` are where it ended up. This module does not
 * delay that, queue it or replay it; it only remembers the tiles the piece
 * walked through and, for a few hundred milliseconds, tells the units layer to
 * draw the piece somewhere between them. Clicking during an animation is
 * therefore always safe, and a dropped frame can never desync anything.
 *
 * Because of that, "skip to the end" is just forgetting: `clear()` before
 * issuing a new command, and the next frame draws every piece on its real tile.
 *
 * Wrapping
 * --------
 * A walk may cross the east–west seam, where consecutive tiles are a whole map
 * apart in plane coordinates. Each segment picks the shorter of the two ways
 * round, so the piece steps over the seam instead of streaking across the map;
 * the renderer's per-repeat draw loop puts it back on screen on the other side.
 */

import { type Point } from '../sim/hex';
import { tilePlaneCenter } from './projection';
import { VIEW } from './viewData';

/** An offset cell. Structurally what the simulation calls a path waypoint. */
export interface Cell {
  col: number;
  row: number;
}

/** Where to draw a piece mid-walk. */
export interface MoveSample {
  /** Plane-space position, before the isometric squash. */
  plane: Point;
  /** Hop height for this instant, 0..1, to be scaled by `animation.hopHeight`. */
  hop: number;
}

interface MoveAnimation {
  cells: Cell[];
  startedAt: number;
  durationMs: number;
}

/** Smooth start and stop over the whole walk rather than per hex. */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export class MoveAnimations {
  private readonly byUnit = new Map<number, MoveAnimation>();

  /**
   * Starts (or replaces) the animation for one unit.
   *
   * `walked` is the tiles it entered, in order, excluding the one it started on;
   * an empty walk is not an animation and is ignored.
   */
  start(unitId: number, from: Cell, walked: readonly Cell[], now: number): void {
    if (walked.length === 0) return;
    const cells: Cell[] = [{ col: from.col, row: from.row }];
    for (const cell of walked) cells.push({ col: cell.col, row: cell.row });
    const durationMs = Math.min(VIEW.animation.maxMs, VIEW.animation.msPerHex * walked.length);
    if (durationMs <= 0) return;
    this.byUnit.set(unitId, { cells, startedAt: now, durationMs });
  }

  /** Forgets every animation; pieces snap to their real tiles next frame. */
  clear(): void {
    this.byUnit.clear();
  }

  /** True while at least one piece is still in flight at `now`. */
  isActive(now: number): boolean {
    for (const [unitId, animation] of this.byUnit) {
      if (now - animation.startedAt < animation.durationMs) return true;
      this.byUnit.delete(unitId);
    }
    return false;
  }

  /**
   * Where a unit's piece should be drawn, or `null` when it is not animating
   * (which is the common case, so this stays a single Map lookup).
   *
   * `worldWidth` is the horizontal wrap period in plane units — identical to the
   * iso one, since the squash never touches x.
   */
  sample(unitId: number, now: number, baseSize: number, worldWidth: number): MoveSample | null {
    const animation = this.byUnit.get(unitId);
    if (!animation) return null;

    const elapsed = now - animation.startedAt;
    if (elapsed >= animation.durationMs) {
      this.byUnit.delete(unitId);
      return null;
    }

    const segments = animation.cells.length - 1;
    const progress = easeInOutQuad(Math.max(0, elapsed) / animation.durationMs) * segments;
    const index = Math.min(segments - 1, Math.floor(progress));
    const fraction = progress - index;

    const a = tilePlaneCenter(
      animation.cells[index]!.col,
      animation.cells[index]!.row,
      baseSize,
    );
    const b = tilePlaneCenter(
      animation.cells[index + 1]!.col,
      animation.cells[index + 1]!.row,
      baseSize,
    );

    let dx = b.x - a.x;
    if (dx > worldWidth / 2) dx -= worldWidth;
    else if (dx < -worldWidth / 2) dx += worldWidth;

    return {
      plane: { x: a.x + dx * fraction, y: a.y + (b.y - a.y) * fraction },
      hop: Math.sin(Math.PI * fraction),
    };
  }
}

/**
 * The tiles a unit actually entered, given the route the player was shown and
 * where the unit ended up.
 *
 * The order may stop short — a mountain appeared, movement ran out, a friendly
 * unit is in the way — so the walked prefix is "everything up to and including
 * the tile the unit is standing on now". Returns an empty array when the unit
 * did not move at all, or when its position is not on the previewed route
 * (which would mean the preview and the reducer disagreed, and animating a
 * guess is worse than not animating).
 */
export function walkedPrefix(route: readonly Cell[], endedAt: Cell): Cell[] {
  const walked: Cell[] = [];
  for (const cell of route) {
    walked.push(cell);
    if (cell.col === endedAt.col && cell.row === endedAt.row) return walked;
  }
  return [];
}
