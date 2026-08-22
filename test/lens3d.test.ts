import { describe, expect, it } from 'vitest';
import { NO_LENS, sameLens } from '../src/render3d/lens3d';
import type { LensView } from '../src/ui/mapView';

function lens(overrides: Partial<LensView> = {}): LensView {
  return { ...NO_LENS, ...overrides };
}

/**
 * `sameLens` is the guard on a rebuild that throws away and remakes a few
 * thousand instances, so it has to be exactly right in both directions: a false
 * "same" leaves a stale picture on the board, and a false "different" rebuilds
 * the layer on every mouse move.
 */
describe('sameLens', () => {
  it('is true for the plain board against itself', () => {
    expect(sameLens(NO_LENS, lens())).toBe(true);
  });

  it('separates the lens mode from the two switches', () => {
    expect(sameLens(lens({ mode: 'none' }), lens({ mode: 'settler' }))).toBe(false);
    expect(sameLens(lens({ yields: false }), lens({ yields: true }))).toBe(false);
    expect(sameLens(lens({ resources: false }), lens({ resources: true }))).toBe(false);
    // All three are independent, so a lens with a switch up is not the lens
    // without it.
    expect(
      sameLens(lens({ mode: 'settler', yields: true }), lens({ mode: 'settler' })),
    ).toBe(false);
    expect(
      sameLens(lens({ mode: 'settler', resources: true }), lens({ mode: 'settler' })),
    ).toBe(false);
  });

  it('notices the seat, because the settler lens judges ownership by it', () => {
    expect(sameLens(lens({ playerId: 0 }), lens({ playerId: 1 }))).toBe(false);
  });

  it('compares the wash restriction by value, not by identity', () => {
    const a = lens({ mode: 'settler', cells: [{ col: 1, row: 2 }] });
    const b = lens({ mode: 'settler', cells: [{ col: 1, row: 2 }] });
    expect(sameLens(a, b)).toBe(true);
    expect(sameLens(a, lens({ mode: 'settler', cells: [{ col: 1, row: 3 }] }))).toBe(false);
    expect(sameLens(a, lens({ mode: 'settler', cells: null }))).toBe(false);
    expect(
      sameLens(a, lens({ mode: 'settler', cells: [{ col: 1, row: 2 }, { col: 2, row: 2 }] })),
    ).toBe(false);
  });

  it('compares the pip restriction the same way, while the pips are up', () => {
    const a = lens({ yields: true, yieldCells: [{ col: 4, row: 4 }] });
    expect(sameLens(a, lens({ yields: true, yieldCells: [{ col: 4, row: 4 }] }))).toBe(true);
    expect(sameLens(a, lens({ yields: true, yieldCells: [{ col: 5, row: 4 }] }))).toBe(false);
    expect(sameLens(a, lens({ yields: true, yieldCells: null }))).toBe(false);
  });

  it('ignores the pip restriction while the pips are down', () => {
    // Nothing is drawn from it, so a change to it is not a change to look at.
    const off = lens({ yields: false, yieldCells: [{ col: 4, row: 4 }] });
    expect(sameLens(off, lens({ yields: false, yieldCells: null }))).toBe(true);
  });

  it('compares the roundel restriction the same way, and only while they are up', () => {
    const a = lens({ resources: true, resourceCells: [{ col: 4, row: 4 }] });
    expect(sameLens(a, lens({ resources: true, resourceCells: [{ col: 4, row: 4 }] }))).toBe(true);
    expect(sameLens(a, lens({ resources: true, resourceCells: [{ col: 5, row: 4 }] }))).toBe(false);
    expect(sameLens(a, lens({ resources: true, resourceCells: null }))).toBe(false);
    const off = lens({ resources: false, resourceCells: [{ col: 4, row: 4 }] });
    expect(sameLens(off, lens({ resources: false, resourceCells: null }))).toBe(true);
  });

  it('is symmetric', () => {
    const a = lens({ mode: 'settler', yields: true, yieldCells: [{ col: 1, row: 1 }] });
    const b = lens({ mode: 'settler', yields: true, yieldCells: null });
    expect(sameLens(a, b)).toBe(sameLens(b, a));
    expect(sameLens(a, a)).toBe(true);
  });
});
