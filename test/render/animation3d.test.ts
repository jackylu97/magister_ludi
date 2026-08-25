/**
 * The 3D move animation's arithmetic: where a piece is, partway through a walk.
 *
 * All of it is pure — cells in, a world position out — which is the property
 * that makes an animation safe to skip, replace or drop frames from. The two
 * things worth pinning down are the ones a reader cannot check by eye: that a
 * step across the east–west seam goes the short way round rather than streaking
 * back across the whole map, and that a piece walking onto a hill climbs it.
 */

import { describe, expect, it } from 'vitest';

import { DeathAnimations3D, MoveAnimations3D } from '../../src/render3d/animation3d';
import { cellCenter, tileTopY, wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { generateMap } from '../../src/sim/mapgen';
import { SQRT3 } from '../../src/sim/hex';

const ANIM = VIEW3D.animation;
const map = generateMap(3, 'duel');

/** Duration of a walk of `steps` hexes, as `start` computes it. */
function duration(steps: number): number {
  return Math.min(ANIM.maxMs, ANIM.msPerHex * steps);
}

describe('3D move animation', () => {
  it('ignores an empty walk', () => {
    const animations = new MoveAnimations3D();
    animations.start(1, { col: 4, row: 4 }, [], 0);
    expect(animations.activeUnits()).toEqual([]);
    expect(animations.sample(1, 0, map)).toBeNull();
  });

  it('interpolates along a segment and hops in the middle', () => {
    const animations = new MoveAnimations3D();
    const from = { col: 5, row: 6 };
    const to = { col: 6, row: 6 };
    animations.start(1, from, [to], 0);

    const a = cellCenter(from.col, from.row);
    const b = cellCenter(to.col, to.row);
    const half = animations.sample(1, duration(1) / 2, map)!;
    expect(half).not.toBeNull();
    // Ease-in-out is symmetric, so half the time is half the distance.
    expect(half.x).toBeCloseTo((a.x + b.x) / 2, 6);
    expect(half.z).toBeCloseTo((a.z + b.z) / 2, 6);

    // The hop peaks at the midpoint of the segment, over the interpolated
    // ground height rather than over zero.
    const aTop = tileTopY(map.tiles[from.row * map.width + from.col]!);
    const bTop = tileTopY(map.tiles[to.row * map.width + to.col]!);
    expect(half.y).toBeCloseTo((aTop + bTop) / 2 + ANIM.hopHeight, 6);
  });

  it('climbs from one tile top to the next', () => {
    const animations = new MoveAnimations3D();
    // A pair of tiles with different height classes, whichever the map offers.
    const pair = findHeightChange();
    expect(pair, 'the duel map should contain some elevation change').not.toBeNull();
    const { from, to } = pair!;
    animations.start(2, from, [to], 0);

    const aTop = tileTopY(map.tiles[from.row * map.width + from.col]!);
    const bTop = tileTopY(map.tiles[to.row * map.width + to.col]!);
    const quarter = animations.sample(2, duration(1) * 0.25, map)!;
    // A quarter of the way in, the piece is between the two tops (the hop only
    // ever adds height, so the ordering of the bounds is safe either way).
    expect(quarter.y).toBeGreaterThan(Math.min(aTop, bTop));
    expect(quarter.y).toBeLessThan(Math.max(aTop, bTop) + ANIM.hopHeight + 1e-9);
  });

  it('steps across the east–west seam the short way', () => {
    const animations = new MoveAnimations3D();
    const from = { col: map.width - 1, row: 10 };
    const to = { col: 0, row: 10 };
    animations.start(3, from, [to], 0);

    const a = cellCenter(from.col, from.row);
    const half = animations.sample(3, duration(1) / 2, map)!;
    // Half a hex east of the last column — not most of a map back to the west.
    expect(half.x).toBeCloseTo(a.x + SQRT3 / 2, 6);
    expect(Math.abs(half.x - a.x)).toBeLessThan(wrapWidth(map) / 2);
  });

  it('forgets a walk once it is over', () => {
    const animations = new MoveAnimations3D();
    animations.start(4, { col: 2, row: 2 }, [{ col: 3, row: 2 }], 0);
    expect(animations.isActive(duration(1) - 1)).toBe(true);
    expect(animations.sample(4, duration(1), map)).toBeNull();
    expect(animations.activeUnits()).toEqual([]);
    expect(animations.isActive(duration(1))).toBe(false);
  });

  it('caps a long walk at the maximum duration', () => {
    const animations = new MoveAnimations3D();
    const walked = Array.from({ length: 40 }, (_, i) => ({ col: 1 + i, row: 5 }));
    animations.start(5, { col: 0, row: 5 }, walked, 0);
    expect(animations.isActive(ANIM.maxMs - 1)).toBe(true);
    expect(animations.isActive(ANIM.maxMs)).toBe(false);
  });

  it('clears every walk at once', () => {
    const animations = new MoveAnimations3D();
    animations.start(6, { col: 2, row: 2 }, [{ col: 3, row: 2 }], 0);
    animations.start(7, { col: 8, row: 8 }, [{ col: 9, row: 8 }], 0);
    expect(animations.activeUnits()).toHaveLength(2);
    animations.clear();
    expect(animations.activeUnits()).toEqual([]);
    expect(animations.sample(6, 1, map)).toBeNull();
  });

  /**
   * "How much longer is the board moving" — the question End Turn's hand-over
   * is scheduled off (`MapView.pendingAnimationMs`, and `scheduleHandOver` in
   * `controls.ts`), so that the turn card and the camera glide land *after* the
   * marches the click set off rather than on top of them. Pure arithmetic over
   * the clocks this class already holds, which is why it can be pinned here
   * rather than by watching a browser.
   */
  describe('remaining time', () => {
    it('is zero with nothing in flight', () => {
      expect(new MoveAnimations3D().remainingMs(0)).toBe(0);
    });

    it('counts down over one walk and reaches zero exactly at the end', () => {
      const animations = new MoveAnimations3D();
      animations.start(1, { col: 2, row: 2 }, [{ col: 3, row: 2 }], 100);
      const total = duration(1);
      expect(animations.remainingMs(100)).toBe(total);
      expect(animations.remainingMs(100 + total / 2)).toBeCloseTo(total / 2, 6);
      expect(animations.remainingMs(100 + total)).toBe(0);
      // Past the end it stays zero rather than going negative — a caller that
      // waits on this must never be asked to wait a negative beat.
      expect(animations.remainingMs(100 + total * 3)).toBe(0);
    });

    it('answers for the *longest* walk, which is when the board stops', () => {
      // Two columns set off together and one is going four times as far. The
      // hand-over waits for the last piece to arrive, not the first.
      const animations = new MoveAnimations3D();
      animations.start(1, { col: 2, row: 2 }, [{ col: 3, row: 2 }], 0);
      animations.start(2, { col: 8, row: 8 }, [
        { col: 9, row: 8 },
        { col: 10, row: 8 },
        { col: 11, row: 8 },
        { col: 12, row: 8 },
      ], 0);
      expect(animations.remainingMs(0)).toBe(duration(4));
      // The short one has landed; the long one is still going.
      expect(animations.remainingMs(duration(1))).toBe(duration(4) - duration(1));
    });

    it('is zero again once the walks are forgotten', () => {
      const animations = new MoveAnimations3D();
      animations.start(1, { col: 2, row: 2 }, [{ col: 3, row: 2 }], 0);
      animations.clear();
      expect(animations.remainingMs(0)).toBe(0);
    });
  });
});

describe('3D death animation', () => {
  it('tilts further, sinks further and eventually gives up the piece', () => {
    const deaths = new DeathAnimations3D();
    deaths.start(1, 0);

    const start = deaths.sample(1, 0)!;
    expect(start.tilt).toBe(0);
    expect(start.sink).toBe(0);
    expect(start.opacity).toBe(1);

    const middle = deaths.sample(1, ANIM.deathMs * 0.5)!;
    const late = deaths.sample(1, ANIM.deathMs * 0.9)!;
    expect(middle.tilt).toBeGreaterThan(start.tilt);
    expect(late.tilt).toBeGreaterThan(middle.tilt);
    expect(late.sink).toBeGreaterThan(middle.sink);
    // Nearly flat by the end, but never past the tilt the data asks for.
    expect(late.tilt).toBeLessThanOrEqual(ANIM.deathTilt);

    // Past the end it is forgotten, which is what lets the renderer's sweep
    // remove the mesh — the same contract a finished walk has.
    expect(deaths.sample(1, ANIM.deathMs)).toBeNull();
    expect(deaths.activeUnits()).toEqual([]);
  });

  it('holds full opacity for the first half, then fades out', () => {
    const deaths = new DeathAnimations3D();
    deaths.start(2, 0);
    // The fall has to be legible before the piece starts leaving.
    expect(deaths.sample(2, ANIM.deathMs * 0.25)!.opacity).toBe(1);
    expect(deaths.sample(2, ANIM.deathMs * 0.5)!.opacity).toBeCloseTo(1, 5);
    expect(deaths.sample(2, ANIM.deathMs * 0.75)!.opacity).toBeCloseTo(0.5, 5);
    expect(deaths.sample(2, ANIM.deathMs * 0.99)!.opacity).toBeLessThan(0.05);
  });

  it('ignores a fall with no duration, and forgets everything on clear', () => {
    const deaths = new DeathAnimations3D();
    deaths.start(3, 0, 0);
    expect(deaths.activeUnits()).toEqual([]);
    expect(deaths.sample(3, 0)).toBeNull();

    deaths.start(4, 0);
    deaths.start(5, 0);
    expect(deaths.activeUnits()).toHaveLength(2);
    deaths.clear();
    expect(deaths.activeUnits()).toEqual([]);
  });
});

/** Two horizontally adjacent tiles whose top faces are at different heights. */
function findHeightChange(): { from: { col: number; row: number }; to: { col: number; row: number } } | null {
  for (let row = 1; row < map.height - 1; row++) {
    for (let col = 0; col < map.width - 1; col++) {
      const a = tileTopY(map.tiles[row * map.width + col]!);
      const b = tileTopY(map.tiles[row * map.width + col + 1]!);
      if (Math.abs(a - b) > 0.1) {
        return { from: { col, row }, to: { col: col + 1, row } };
      }
    }
  }
  return null;
}
