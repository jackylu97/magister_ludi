/**
 * The variants of the city screen's yield plaque (`plaque.styles` in
 * `data/view3d.json`, `plaqueLayout` and `plaqueAnchor` in `lens3d.ts`).
 *
 * The user asked for variations (2026-11-22: the plaques "look a bit
 * awkward"). A variant is data: a layout, a backing and a place. The claims:
 *
 *   1. The data names one variant, and every variant names a layout and a
 *      backing the code knows.
 *   2. Each layout has one cell for each yield, in the order given, and the
 *      cells stay inside the content's box.
 *   3. `row` has one height for every hex. `column` has one width for every
 *      hex with figures of one digit. `grid` is never wider than its columns.
 *   4. `stack` is the board's own readout, row for row.
 *   5. A tag stands above the hex's centre with its foot on the centre. Every
 *      other variant sits at its own fixed place, whatever its size.
 */

import { describe, expect, it } from 'vitest';

import { numberedRowLayout, plaqueAnchor, plaqueLayout, plaqueStyle, yieldDiscWidth, yieldRowLayout, type PlaqueStyle } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';

const SPEC = VIEW3D.territory.citizens.plaque;
const STYLES = SPEC.styles as Record<string, PlaqueStyle>;
const LAYOUTS = ['stack', 'column', 'row', 'grid'] as const;

describe('the plaque variants', () => {
  it('names one variant, and every variant is one the code can draw', () => {
    expect(Object.keys(STYLES)).toContain(SPEC.style);
    expect(plaqueStyle()).toBe(STYLES[SPEC.style]);
    for (const [name, style] of Object.entries(STYLES)) {
      expect(LAYOUTS, name).toContain(style.layout);
      expect(['paper', 'scrim', 'pill', 'tag'], name).toContain(style.back);
      expect(['top', 'left'], name).toContain(style.pin);
    }
    // The four the user asked for, and one more.
    expect(Object.keys(STYLES)).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
  });

  it('gives each yield one cell, inside the content box, in every layout', () => {
    const disc = yieldDiscWidth();
    for (const layout of LAYOUTS) {
      for (const amounts of [[1], [2, 1], [4, 2, 1], [5, 3, 2, 1], [12, 1]]) {
        const laid = plaqueLayout(layout, amounts);
        expect(laid.cells, `${layout} ${amounts}`).toHaveLength(amounts.length);
        for (const cell of laid.cells) {
          for (const x of cell.row.glyphs) {
            expect(Math.abs(cell.x + x) + disc / 2).toBeLessThanOrEqual(laid.width / 2 + 1e-9);
          }
          expect(Math.abs(cell.z) + disc / 2).toBeLessThanOrEqual(laid.depth / 2 + 1e-9);
        }
      }
    }
  });

  it('keeps one height for a row and one width for a column, whatever the hex pays', () => {
    const disc = yieldDiscWidth();
    const one = plaqueLayout('row', [2]), four = plaqueLayout('row', [4, 3, 2, 1]);
    expect(one.depth).toBeCloseTo(disc, 9);
    expect(four.depth).toBeCloseTo(disc, 9);
    expect(four.width).toBeGreaterThan(one.width);
    expect(plaqueLayout('column', [1]).width).toBeCloseTo(plaqueLayout('column', [4, 3, 2]).width, 9);
    const grid = plaqueLayout('grid', [4, 3, 2, 1]);
    const cell = Math.max(...[4, 3, 2, 1].map((amount) => plaqueLayout('column', [amount]).width));
    expect(grid.width).toBeCloseTo(SPEC.columns * cell + (SPEC.columns - 1) * SPEC.cellGap, 9);
  });

  it('lays the stack out as the board lays out any hex', () => {
    const laid = plaqueLayout('stack', [3, 6]);
    expect(laid.cells[0]!.row).toEqual(yieldRowLayout(3));
    expect(laid.cells[1]!.row).toEqual(yieldRowLayout(6));
    expect(laid.cells[1]!.z - laid.cells[0]!.z).toBeCloseTo(VIEW3D.lens.rowSpacing, 9);
    // Past the stack limit a row is one coin and a figure, which is what the compact layouts always use.
    expect(yieldRowLayout(VIEW3D.lens.yieldStackMax + 1)).toEqual(numberedRowLayout(VIEW3D.lens.yieldStackMax + 1));
    expect(numberedRowLayout(2).glyphs).toHaveLength(1);
    expect(numberedRowLayout(2).numerals).toHaveLength(1);
  });

  it('puts the foot of a tag on the centre of the hex, and every other variant at one fixed place', () => {
    for (const [name, style] of Object.entries(STYLES)) {
      const small = plaqueLayout(style.layout, [1]), large = plaqueLayout(style.layout, [4, 3, 2, 1]);
      if (style.back === 'tag') {
        for (const laid of [small, large]) {
          const anchor = plaqueAnchor(style, laid.depth);
          // The content's centre, then half the content, the padding and the foot, reaches the centre of the hex.
          expect(anchor + laid.depth / 2 + SPEC.padZ + SPEC.foot, name).toBeCloseTo(0, 9);
        }
      } else {
        expect(plaqueAnchor(style, small.depth), name).toBe(plaqueAnchor(style, large.depth));
      }
    }
  });
});
