/**
 * The pantheon wheel's geometry.
 *
 * The wheel is how the belief axes came back after their names were taken off
 * the screen: gods of one thread sit in adjacent houses, and adjacency is the
 * whole of what the drawing says. That makes the layout a *claim about the
 * data* rather than decoration — a run split in two, or a sector that wraps
 * past twelve o'clock, is the screen quietly telling a player that two gods are
 * unrelated when they are the reason the other one is worth taking.
 *
 * The drawing itself is SVG and this suite has no jsdom, which is exactly why
 * the layout is a pure module: everything worth pinning about a wheel is
 * arithmetic over a list of ids.
 */

import { describe, expect, it } from 'vitest';

import { type BeliefId, BELIEF_AXES, BELIEF_IDS, beliefDef } from '../../src/sim/religionData';
import {
  housePath,
  pantheonWheelLayout,
  wheelOrder,
  wheelPoint,
} from '../../src/ui/pantheonWheel';

/** The shipped pool, which is what the screen actually lays out. */
const POOL = BELIEF_IDS;

describe('wheelOrder', () => {
  it('keeps every god, exactly once', () => {
    const ordered = wheelOrder(POOL);
    expect(ordered).toHaveLength(POOL.length);
    expect(new Set(ordered).size).toBe(POOL.length);
    expect([...ordered].sort()).toEqual([...POOL].sort());
  });

  it('puts every god of one axis in one unbroken run', () => {
    const axes = wheelOrder(POOL).map((id) => beliefDef(id).axis);
    const seen = new Set<string>();
    let previous: string | null = null;
    for (const axis of axes) {
      if (axis === previous) continue;
      // A second run of an axis already closed is the failure this exists for.
      expect(seen.has(axis)).toBe(false);
      seen.add(axis);
      previous = axis;
    }
  });

  it('lays the axes out in the order the table declares', () => {
    const axes = wheelOrder(POOL).map((id) => beliefDef(id).axis);
    const runs = axes.filter((axis, index) => axis !== axes[index - 1]);
    const expected = BELIEF_AXES.filter((axis) => axes.includes(axis));
    expect(runs).toEqual(expected);
  });

  it('is stable — the same pool lays out the same way every time', () => {
    expect(wheelOrder(POOL)).toEqual(wheelOrder(POOL));
    // And is not sensitive to the order it is handed: a wheel a player is
    // learning the shape of must not rearrange because a caller filtered.
    expect(wheelOrder([...POOL].reverse())).toEqual(wheelOrder(POOL));
  });
});

describe('pantheonWheelLayout', () => {
  it('gives every god one house, and the houses tile the circle', () => {
    const { houses } = pantheonWheelLayout(POOL);
    expect(houses).toHaveLength(POOL.length);
    expect(houses[0]!.startAngle).toBe(0);
    expect(houses[houses.length - 1]!.endAngle).toBe(360);
    houses.forEach((house, index) => {
      expect(house.index).toBe(index);
      expect(house.endAngle).toBeGreaterThan(house.startAngle);
      expect(house.midAngle).toBeCloseTo((house.startAngle + house.endAngle) / 2, 10);
      // No gap and no overlap: one house ends exactly where the next begins.
      if (index > 0) expect(house.startAngle).toBe(houses[index - 1]!.endAngle);
    });
  });

  it('makes every house the same size', () => {
    const { houses } = pantheonWheelLayout(POOL);
    const step = 360 / POOL.length;
    for (const house of houses) {
      expect(house.endAngle - house.startAngle).toBeCloseTo(step, 10);
    }
  });

  it('groups the houses into the runs the axes come in', () => {
    const { houses, sectors } = pantheonWheelLayout(POOL);
    // Every house names a real sector, and that sector's axis is its own.
    for (const house of houses) {
      const sector = sectors[house.sector];
      expect(sector).toBeDefined();
      expect(sector!.axis).toBe(house.axis);
    }
    // Every sector spans exactly the houses that point at it, edge to edge.
    sectors.forEach((sector, index) => {
      const mine = houses.filter((house) => house.sector === index);
      expect(mine).toHaveLength(sector.houses);
      expect(sector.startAngle).toBe(mine[0]!.startAngle);
      expect(sector.endAngle).toBe(mine[mine.length - 1]!.endAngle);
      expect(sector.midAngle).toBeCloseTo((sector.startAngle + sector.endAngle) / 2, 10);
    });
    // And the sectors themselves tile the circle in order.
    expect(sectors.reduce((sum, sector) => sum + sector.houses, 0)).toBe(POOL.length);
    expect(sectors[sectors.length - 1]!.endAngle).toBe(360);
  });

  it('has as many sectors as the pool has axes', () => {
    const { sectors } = pantheonWheelLayout(POOL);
    const axes = new Set(POOL.map((id) => beliefDef(id).axis));
    expect(sectors).toHaveLength(axes.size);
  });

  it('lays out an empty pool as an empty wheel rather than throwing', () => {
    expect(pantheonWheelLayout([])).toEqual({ houses: [], sectors: [] });
  });

  it('lays out a short pool without special-casing it', () => {
    const four = POOL.slice(0, 4) as BeliefId[];
    const { houses } = pantheonWheelLayout(four);
    expect(houses).toHaveLength(4);
    expect(houses.map((house) => house.startAngle)).toEqual([0, 90, 180, 270]);
  });
});

describe('wheelPoint', () => {
  it('reads clockwise from twelve o’clock, in screen coordinates', () => {
    const up = wheelPoint(50, 50, 10, 0);
    expect(up.x).toBeCloseTo(50, 10);
    expect(up.y).toBeCloseTo(40, 10);
    const right = wheelPoint(50, 50, 10, 90);
    expect(right.x).toBeCloseTo(60, 10);
    expect(right.y).toBeCloseTo(50, 10);
    const down = wheelPoint(50, 50, 10, 180);
    expect(down.x).toBeCloseTo(50, 10);
    expect(down.y).toBeCloseTo(60, 10);
    const left = wheelPoint(50, 50, 10, 270);
    expect(left.x).toBeCloseTo(40, 10);
    expect(left.y).toBeCloseTo(50, 10);
  });

  it('comes back to where it started after a full turn', () => {
    const start = wheelPoint(0, 0, 7, 33);
    const round = wheelPoint(0, 0, 7, 393);
    expect(round.x).toBeCloseTo(start.x, 10);
    expect(round.y).toBeCloseTo(start.y, 10);
  });
});

describe('housePath', () => {
  it('closes a ring segment on the four points the layout names', () => {
    const path = housePath(50, 50, 20, 40, 0, 90);
    expect(path.startsWith('M50 10')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    // Out along the outer radius, in at the far edge, back along the inner one.
    expect(path).toContain('A40 40 0 0 1 90 50');
    expect(path).toContain('L70 50');
    expect(path).toContain('A20 20 0 0 0 50 30');
  });

  it('sets the large-arc flag only when the wedge needs it', () => {
    expect(housePath(0, 0, 5, 10, 0, 90)).toContain('0 0 1');
    expect(housePath(0, 0, 5, 10, 0, 270)).toContain('0 1 1');
  });
});
