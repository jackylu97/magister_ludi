/**
 * Movement animation in world space — render-only, and deliberately powerless.
 *
 * The same contract as the 2D renderer's `src/render/animation.ts`, ported to
 * three dimensions. When a `moveUnit` order succeeds the simulation is *already*
 * in its final state: the unit's `col`/`row` are where it ended up. This module
 * does not delay that, queue it or replay it; it only remembers the tiles the
 * piece walked through and, for a few hundred milliseconds, reports a position
 * somewhere between them. Clicking during an animation is therefore always safe,
 * and a dropped frame can never desync anything.
 *
 * Because of that, "skip to the end" is just forgetting: `clear()` before
 * issuing a new command, and the next frame draws every piece on its real tile.
 * The walked prefix itself is computed by `walkedPrefix`, which is shared with
 * the 2D renderer — it is pure list arithmetic over the previewed route and owes
 * nothing to either renderer's geometry.
 *
 * Height
 * ------
 * A walk crosses tiles at different heights, so the piece's y interpolates
 * between the two tile tops of the segment it is on and the hop is added to
 * that. Walking from a coast tile onto a hill therefore climbs, which is a thing
 * the 2D renderer had to fake with a rise lookup and this one gets for free.
 *
 * Wrapping
 * --------
 * A walk may cross the east–west seam, where consecutive tiles are a whole map
 * apart in world x. Each segment takes the shorter of the two ways round, so the
 * piece steps over the seam instead of streaking across the board; because the
 * renderer draws the moving piece in all three wrap copies, it is on screen on
 * whichever side of the seam the camera is looking at.
 */

import { type GameMap, getTileAt } from '../sim/map';

import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D } from './lookData';

const ANIM = VIEW3D.animation;

/** An offset cell. Structurally what the simulation calls a path waypoint. */
export interface Cell {
  col: number;
  row: number;
}

/** Where to draw a piece mid-walk, in world units. */
export interface MoveSample {
  x: number;
  y: number;
  z: number;
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

/** How a toppling piece is lying at some instant of its fall. */
export interface DeathSample {
  /** Radians of roll, 0 at the start and about a right angle at the end. */
  tilt: number;
  /** How far it has sunk into the tile, in world units. */
  sink: number;
  /** 1 at the start, 0 when it is gone. */
  opacity: number;
}

/**
 * The death of a piece: it falls over.
 *
 * The diorama's signature, and the reason it is worth animating at all. A unit
 * that simply vanished would be indistinguishable from a rendering glitch, and a
 * unit that faded would be a ghost; a toy soldier that topples is a toy soldier
 * that *lost*, and the board is a table full of toys. It is the same powerless
 * contract the walk has — see the module docblock — because by the time this
 * runs the simulation has already removed the unit and nothing can be undone by
 * dropping a frame.
 *
 * The piece is gone from `state.units` before the fall begins, so unlike a walk
 * this animation cannot look anything up: whoever starts it hands over the
 * placement and the visual, and this class only says how far through the fall
 * we are. See `Renderer3D.animateDeath`.
 */
export class DeathAnimations3D {
  private readonly byUnit = new Map<number, { startedAt: number; durationMs: number }>();

  /** Begins a fall. A zero or negative duration is not an animation. */
  start(unitId: number, now: number, durationMs = ANIM.deathMs): void {
    if (durationMs <= 0) return;
    this.byUnit.set(unitId, { startedAt: now, durationMs });
  }

  clear(): void {
    this.byUnit.clear();
  }

  activeUnits(): number[] {
    return [...this.byUnit.keys()];
  }

  /**
   * How far through its fall a piece is, or `null` once it is over — at which
   * point it is forgotten, exactly as a finished walk is, so the renderer's
   * sweep is what eventually takes the mesh off the scene.
   *
   * The tilt eases *in* rather than out: a falling figure accelerates, and a
   * topple that slowed as it hit the table would read as a controlled descent.
   * The fade is held back until the second half so that the fall is legible
   * before the piece starts leaving.
   */
  sample(unitId: number, now: number): DeathSample | null {
    const fall = this.byUnit.get(unitId);
    if (!fall) return null;

    const elapsed = now - fall.startedAt;
    if (elapsed >= fall.durationMs) {
      this.byUnit.delete(unitId);
      return null;
    }

    const t = Math.max(0, elapsed) / fall.durationMs;
    return {
      tilt: (t * t) * ANIM.deathTilt,
      sink: t * ANIM.deathSink,
      opacity: t < 0.5 ? 1 : 1 - (t - 0.5) * 2,
    };
  }
}

export class MoveAnimations3D {
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
    const durationMs = Math.min(ANIM.maxMs, ANIM.msPerHex * walked.length);
    if (durationMs <= 0) return;
    this.byUnit.set(unitId, { cells, startedAt: now, durationMs });
  }

  /** Forgets every animation; pieces snap to their real tiles next frame. */
  clear(): void {
    this.byUnit.clear();
  }

  /** The units currently in flight, so the renderer knows which to hide. */
  activeUnits(): number[] {
    return [...this.byUnit.keys()];
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
   * How much longer the board keeps moving: the largest remaining span over
   * every walk in flight, and 0 when nothing is.
   *
   * A read, not a promise — this class stays as powerless as its docblock says,
   * and a caller that drops the answer loses nothing. It exists because the
   * *interface* has things it should not say over a walk still in progress (the
   * turn card, the camera glide to the next idle piece; see `endTurn` in
   * `controls.ts`), and "when will the pieces have stopped" is a question only
   * the thing holding the clocks can answer. Reading it never forgets an
   * animation the way `sample` does: a finished walk still has to be *drawn*
   * once more on its real tile, and that sweep belongs to the render loop.
   */
  remainingMs(now: number): number {
    let longest = 0;
    for (const animation of this.byUnit.values()) {
      const left = animation.durationMs - (now - animation.startedAt);
      if (left > longest) longest = left;
    }
    return longest;
  }

  /**
   * Where a unit's piece should be drawn, or `null` when it is not animating
   * (which is the common case, so this stays a single Map lookup). A finished
   * animation is forgotten here, which is what eventually lets the renderer
   * restore the resting instance.
   */
  sample(unitId: number, now: number, map: GameMap): MoveSample | null {
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

    const from = animation.cells[index]!;
    const to = animation.cells[index + 1]!;
    const a = cellCenter(from.col, from.row);
    const b = cellCenter(to.col, to.row);

    const period = wrapWidth(map);
    let dx = b.x - a.x;
    if (dx > period / 2) dx -= period;
    else if (dx < -period / 2) dx += period;

    const aTile = getTileAt(map, from.col, from.row);
    const bTile = getTileAt(map, to.col, to.row);
    const aTop = aTile ? tileTopY(aTile) : 0;
    const bTop = bTile ? tileTopY(bTile) : 0;
    const hop = Math.sin(Math.PI * fraction) * ANIM.hopHeight;

    return {
      x: a.x + dx * fraction,
      y: aTop + (bTop - aTop) * fraction + hop,
      z: a.z + (b.z - a.z) * fraction,
    };
  }
}
