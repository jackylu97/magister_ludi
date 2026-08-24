/**
 * The two conventions every surface writes numbers by.
 *
 * `turnsLabel` is three lines and it is the reason this file exists: it is the
 * single point where `turnsToFill`'s honest `null` becomes something a player
 * reads, and the wrong answer there is an `Infinity` or a `NaN` on a build
 * button — a data error wearing the costume of a number. The glyph table is
 * asserted because it had been copied into three files before it was one, and
 * the copies are what this table exists to stop coming back.
 */

import { describe, expect, it } from 'vitest';
import { turnsToFill } from '../src/sim/cities';
import type { MeterEffect } from '../src/sim/meters';
import { BORDER_GLYPH, HAMMER, YIELD_GLYPH, effectFigure, turnsLabel } from '../src/ui/figures';
import { BEAKER } from '../src/ui/researchProgress';

describe('turnsLabel', () => {
  it('prints a count in the "3t" the whole interface uses', () => {
    expect(turnsLabel(3)).toBe('3t');
    expect(turnsLabel(1)).toBe('1t');
  });

  it('prints an em dash, never an infinity, when the answer is unknowable', () => {
    // What a city making no hammers and an empire making no science both get.
    expect(turnsLabel(null)).toBe('—');
    expect(turnsLabel(turnsToFill(40, 0))).toBe('—');
    // The failure it exists to prevent, spelt out: this is what the arithmetic
    // would have printed on its own.
    expect(String(Math.ceil(40 / 0))).toBe('Infinity');
  });

  it('keeps zero as a number, because "already paid" is a real answer', () => {
    // The thing lands at the next resolution; it is not unknowable.
    expect(turnsLabel(0)).toBe('0t');
    expect(turnsLabel(turnsToFill(-5, 0))).toBe('0t');
  });
});

describe('the yield voices', () => {
  it('quotes production as the glyph a cost is written in', () => {
    expect(HAMMER).toBe(YIELD_GLYPH.production);
    expect(HAMMER).not.toBe('h');
  });

  it('is the one table the research card counts beakers from', () => {
    // `BEAKER` used to be its own literal in a second file. It is now this one.
    expect(BEAKER).toBe(YIELD_GLYPH.science);
  });

  it('gives every yield its own distinct voice', () => {
    const glyphs = Object.values(YIELD_GLYPH);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('marks territory with a voice of its own, not with a yield glyph', () => {
    // Border growth is not a yield — the same culture is banked twice and only
    // the half that buys ground answers to the writ — so its mark must not be
    // one of the six.
    expect(Object.values(YIELD_GLYPH)).not.toContain(BORDER_GLYPH);
  });
});

describe('an empire modifier as a figure', () => {
  function effect(partial: Partial<MeterEffect>): MeterEffect {
    return {
      meter: 'authority',
      value: 6,
      percent: 10,
      yields: [],
      growth: false,
      borders: false,
      ...partial,
    };
  }

  it('names every channel it touches, borders included', () => {
    // A solvent writ builds *and* claims, and the chip says both on one line.
    const writ = effectFigure(effect({ yields: ['production'], borders: true }));
    expect(writ).toContain(YIELD_GLYPH.production);
    expect(writ).toContain(BORDER_GLYPH);
    expect(writ).toContain('+10%');
  });

  it('gives the freeze the boundary stone and nothing else', () => {
    const frozen = effectFigure(effect({ percent: -100, borders: true }));
    expect(frozen).toBe(`${BORDER_GLYPH} −100%`);
  });
});
