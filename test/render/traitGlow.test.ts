/**
 * The trait glow (Scientific batch S10): a one-time gilt glow on the pieces
 * that gained a line trait in the turn that just resolved.
 *
 * Pure checks, in the node environment: the glow's clock, the one wash it
 * writes over a resting wash, the renderer skipping a piece its unit layer is
 * not drawing, and a source pin that the glow adds nothing to the piece
 * fingerprint (`signUnits`), because a trait changes no unit field and the
 * glow must not either.
 */

import { describe, expect, it, vi } from 'vitest';

import { Renderer3D } from '../../src/render3d/renderer3d';
import { UnitLayer } from '../../src/render3d/pieces';
import {
  TRAIT_GLOW_COLOR,
  TraitGlows,
  glowShellWash,
  setTraitGlowTuning,
  traitGlowStrength,
  traitGlowTuning,
} from '../../src/render3d/traitGlow';

const PIECES = import.meta.glob('../../src/render3d/pieces.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const GLOW = import.meta.glob('../../src/render3d/traitGlow.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const TUNING = { durationMs: 1000, peak: 0.8, rise: 0.25 };

/** `0xRRGGBB` mixed `mix` of the way toward `target`, unrounded, per channel. */
function mixChannels(color: number, target: number, mix: number): [number, number, number] {
  const c = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
  const t = [(target >> 16) & 255, (target >> 8) & 255, target & 255];
  return [0, 1, 2].map((k) => c[k]! + (t[k]! - c[k]!) * mix) as [number, number, number];
}

function channelsOf(color: number): [number, number, number] {
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}

describe('the glow’s clock', () => {
  it('starts at nothing, rises to its peak, and settles back to nothing', () => {
    expect(traitGlowStrength(0, TUNING)).toBeCloseTo(0, 6);
    expect(traitGlowStrength(250, TUNING)).toBeCloseTo(0.8, 6);
    // Rising through the first quarter, falling through the rest.
    let last = -1;
    for (let t = 0; t <= 250; t += 25) {
      const s = traitGlowStrength(t, TUNING)!;
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
    for (let t = 275; t < 1000; t += 25) {
      const s = traitGlowStrength(t, TUNING)!;
      expect(s).toBeLessThanOrEqual(last);
      last = s;
    }
    // Its last frame already looks like the resting piece.
    expect(traitGlowStrength(999, TUNING)!).toBeLessThan(0.001);
  });

  it('never goes past its peak', () => {
    for (let t = 0; t < 1000; t += 7) {
      expect(traitGlowStrength(t, TUNING)!).toBeLessThanOrEqual(0.8 + 1e-9);
    }
  });

  it('ends after its duration', () => {
    expect(traitGlowStrength(1000, TUNING)).toBeNull();
    expect(traitGlowStrength(5000, TUNING)).toBeNull();
  });

  it('is no glow at all with a duration of zero', () => {
    expect(traitGlowStrength(0, { ...TUNING, durationMs: 0 })).toBeNull();
    expect(traitGlowStrength(0, { ...TUNING, durationMs: -10 })).toBeNull();
  });
});

describe('the glows in flight', () => {
  it('reports a glow until it ends, then forgets it', () => {
    const glows = new TraitGlows();
    glows.start([7, 9], 100);
    expect(glows.pending).toBe(true);
    expect(glows.activeUnits()).toEqual([7, 9]);
    expect(glows.strength(7, 100)).toBeCloseTo(0, 6);
    const length = traitGlowTuning().durationMs;
    expect(glows.strength(7, 100 + length / 2)).toBeGreaterThan(0);
    expect(glows.strength(7, 100 + length)).toBeNull();
    expect(glows.activeUnits()).toEqual([9]);
    expect(glows.strength(42, 100)).toBeNull();
  });

  it('starts nothing while the duration is zero', () => {
    const before = { ...traitGlowTuning() };
    try {
      setTraitGlowTuning({ durationMs: 0 });
      const glows = new TraitGlows();
      glows.start([1, 2], 0);
      expect(glows.pending).toBe(false);
    } finally {
      setTraitGlowTuning(before);
    }
  });
});

describe('the wash the glow writes', () => {
  it('is exactly the resting wash at strength nought', () => {
    const trim = { target: 0x2a7f6f, mix: 1 };
    expect(glowShellWash(trim, 0)).toEqual(trim);
    const hostile = { target: 0x9b1b3a, mix: 0.6 };
    expect(glowShellWash(hostile, 0)).toEqual(hostile);
    // A shell with no resting wash rests at no mix at all.
    expect(glowShellWash(null, 0).mix).toBe(0);
  });

  it('mixes straight toward gilt over a shell with no resting wash', () => {
    expect(glowShellWash(null, 0.5)).toEqual({ target: TRAIT_GLOW_COLOR, mix: 0.5 });
  });

  it('is the resting look mixed toward gilt, for any ink the outline is drawn in', () => {
    // Two mixes in a row are one mix, so the glow needs no knowledge of the
    // outline's own ink. Checked against three inks and three resting washes.
    const rests = [
      { target: 0x2a7f6f, mix: 1 },
      { target: 0x9b1b3a, mix: 0.6 },
      { target: 0xe9e2cf, mix: 0.45 },
    ];
    for (const ink of [0x1d1a20, 0x404040, 0xffffff]) {
      for (const rest of rests) {
        for (const strength of [0.2, 0.5, 0.85]) {
          const rested = mixChannels(ink, rest.target, rest.mix);
          const restedColor = (Math.round(rested[0]) << 16) | (Math.round(rested[1]) << 8) | Math.round(rested[2]);
          const want = mixChannels(restedColor, TRAIT_GLOW_COLOR, strength);
          const wash = glowShellWash(rest, strength);
          const got = mixChannels(ink, wash.target, wash.mix);
          for (let k = 0; k < 3; k++) expect(Math.abs(got[k]! - want[k]!)).toBeLessThan(1.5);
        }
      }
    }
  });

  it('never leaves the colour range', () => {
    const wash = glowShellWash({ target: 0xffffff, mix: 0.3 }, 0.9);
    for (const channel of channelsOf(wash.target)) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
    expect(wash.mix).toBeLessThanOrEqual(1);
  });
});

describe('a piece the board is not drawing', () => {
  /** A renderer with nothing but the three fields `glowUnits` reads. */
  function renderer(drawn: readonly number[]) {
    const start = vi.fn();
    const invalidate = vi.fn();
    const runtime = Object.assign(Object.create(Renderer3D.prototype), {
      state: {},
      units: { isDrawing: (id: number) => drawn.includes(id) },
      glows: { start, pending: false },
      invalidate,
    }) as Renderer3D;
    return { runtime, start, invalidate };
  }

  it('is skipped: only the drawn pieces glow', () => {
    const f = renderer([2, 5]);
    f.runtime.glowUnits([1, 2, 3, 5]);
    expect(f.start).toHaveBeenCalledOnce();
    expect(f.start.mock.calls[0]![0]).toEqual([2, 5]);
    expect(f.invalidate).toHaveBeenCalledOnce();
  });

  it('starts nothing and wakes nothing when none is drawn', () => {
    const f = renderer([]);
    f.runtime.glowUnits([1, 3]);
    expect(f.start).not.toHaveBeenCalled();
    expect(f.invalidate).not.toHaveBeenCalled();
  });

  it('is refused by the unit layer, which has no body for it', () => {
    const layer = new UnitLayer();
    expect(layer.isDrawing(1)).toBe(false);
    expect(layer.setGlow(1, 0.5)).toBe(false);
    expect(() => layer.endGlow(1)).not.toThrow();
  });

  it('drops out of the clock when the layer stops drawing it mid-glow', () => {
    const setGlow = vi.fn((id: number) => id === 4);
    const endGlow = vi.fn();
    const glows = new TraitGlows();
    glows.start([3, 4], 0);
    const runtime = Object.assign(Object.create(Renderer3D.prototype), {
      glows,
      units: { setGlow, endGlow },
    }) as unknown as { stepGlows(now: number): boolean };
    const length = traitGlowTuning().durationMs;
    expect(runtime.stepGlows(length / 2)).toBe(true);
    expect(glows.activeUnits()).toEqual([4]);
    // The end of the glow writes the resting look back.
    expect(runtime.stepGlows(length)).toBe(false);
    expect(endGlow).toHaveBeenCalledWith(4);
    expect(glows.pending).toBe(false);
  });
});

describe('the piece fingerprint', () => {
  it('hashes nothing about a glow', () => {
    const source = Object.values(PIECES)[0]!;
    const at = source.indexOf('export function signUnits(');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = source.slice(at, source.indexOf('\n}\n', at));
    expect(body.toLowerCase()).not.toContain('glow');
    expect(body.toLowerCase()).not.toContain('trait');
  });

  it('reads nothing from the game state', () => {
    // The glow's module is arithmetic and a clock: no import from the sim, so
    // it cannot come to depend on a unit field the fingerprint does not cover.
    const source = Object.values(GLOW)[0]!;
    expect(source).not.toMatch(/from '\.\.\/sim\//);
  });
});
