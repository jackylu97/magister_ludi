/**
 * The city screen's vignette, held at the only place it can be held without a
 * GL context: its arithmetic.
 *
 * The shader is three lines and they are the three functions in this file —
 * `focusAnchor` builds the ellipse, `focusFalloff` is the shoulder, `fadeAt` is
 * the tween — so pinning them here pins what is drawn. The fragment program
 * spells the same cubic out longhand rather than calling `smoothstep` precisely
 * so that these expectations describe it exactly.
 *
 * The claims worth writing down:
 *
 *   1. **The hole is the work radius.** At exactly one projected work radius
 *      from the city the wash is still fully clear, because `innerRadius` is
 *      greater than 1 — a wash that started biting on the outermost ring would
 *      be dimming ground the panel is inviting the player to click.
 *   2. **The falloff is soft and monotone**, and it is flat at both ends: the
 *      cubic's derivative is zero at the shoulders, which is what stops the band
 *      from showing an edge.
 *   3. **The ellipse is measured, not assumed.** `focusAnchor` takes the two
 *      offset points already projected, so the camera's foreshortening arrives
 *      as data and there is no `sin(elevation)` in this module to drift from the
 *      camera's own.
 *   4. **The wash is over everything.** `RENDER_ORDER.vignette` outranks every
 *      other readout, badges and HP bars included.
 *   5. **It cannot touch the board.** A source read, because the failure it
 *      guards is a future edit rather than a present bug: the day this module
 *      learns to write an instance tint or ask for a rebuild is the day the
 *      "no tints, no rebuilds, fog-safe by construction" claim in its docblock
 *      stops being structural and starts being a promise.
 */

import { describe, expect, it } from 'vitest';

import { RENDER_ORDER } from '../../src/render3d/instances';
import { VIEW3D } from '../../src/render3d/lookData';
import {
  fadeAt,
  focusAlphaAt,
  focusAnchor,
  focusFalloff,
  workRadiusWorld,
} from '../../src/render3d/vignette3d';

const VIGNETTE = VIEW3D.vignette;

/** The module's own text, read through Vite's raw glob (`seatRoster.test.ts`). */
const SOURCES = import.meta.glob('../../src/render3d/vignette3d.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function moduleSource(): string {
  const text = Object.values(SOURCES)[0];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('vignette3d.ts came back empty');
  }
  return text;
}

/**
 * A camera-shaped anchor: 100px across the ground horizontally, foreshortened to
 * 84px up the screen — near enough the diorama's own 57° elevation that the
 * numbers below read like the real thing.
 */
function sampleAnchor() {
  return focusAnchor({ x: 400, y: 300 }, { x: 500, y: 300 }, { x: 400, y: 216 });
}

describe('the vignette ellipse', () => {
  it('measures its semi-axes from projected points rather than deriving them', () => {
    const anchor = sampleAnchor();
    expect(anchor.x).toBe(400);
    expect(anchor.y).toBe(300);
    expect(anchor.semiX).toBeCloseTo(100, 6);
    expect(anchor.semiY).toBeCloseTo(84, 6);
  });

  it('floors a degenerate axis rather than dividing by zero', () => {
    // A camera looking straight down flattens the climb axis to nothing. The
    // hole is then a stripe rather than an ellipse, which is a strange picture
    // and not a NaN — and the diorama's angle is fixed, so it is unreachable.
    const flat = focusAnchor({ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 10 });
    expect(flat.semiX).toBe(1);
    expect(flat.semiY).toBe(1);
    expect(Number.isFinite(focusAlphaAt(20, 20, flat, 1))).toBe(true);
  });

  it('reaches past the outermost workable ring, not to its centre', () => {
    const rings = 3;
    const hex = 1;
    // Three centre-to-centre steps plus one radius: the far *edge* of the ring,
    // so the wash clears whole tiles rather than bisecting the outer ones.
    expect(workRadiusWorld(rings, hex)).toBeCloseTo(Math.sqrt(3) * 3 + 1, 6);
    // Linear in the hex size, so it survives a change to `board.hexRadius`.
    expect(workRadiusWorld(rings, 2)).toBeCloseTo(2 * workRadiusWorld(rings, 1), 6);
  });
});

describe('the falloff', () => {
  it('leaves the work radius itself completely clear', () => {
    // The whole reason `innerRadius` is above 1: at the edge of the ground the
    // open city can work, nothing is dimmed yet.
    expect(VIGNETTE.innerRadius).toBeGreaterThan(1);
    expect(focusFalloff(1, VIGNETTE.innerRadius, VIGNETTE.outerRadius)).toBe(0);
    expect(focusFalloff(VIGNETTE.innerRadius, VIGNETTE.innerRadius, VIGNETTE.outerRadius)).toBe(0);
  });

  it('reaches full strength beyond the outer radius and stays there', () => {
    expect(focusFalloff(VIGNETTE.outerRadius, VIGNETTE.innerRadius, VIGNETTE.outerRadius)).toBe(1);
    expect(focusFalloff(99, VIGNETTE.innerRadius, VIGNETTE.outerRadius)).toBe(1);
  });

  it('rises monotonically across the band, with flat shoulders', () => {
    const { innerRadius: inner, outerRadius: outer } = VIGNETTE;
    expect(outer).toBeGreaterThan(inner);
    let previous = -1;
    for (let i = 0; i <= 40; i++) {
      const value = focusFalloff(inner + ((outer - inner) * i) / 40, inner, outer);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    // Flat at both ends is what makes the band read as a gradient rather than as
    // two visible rings: a hair inside either shoulder is still essentially the
    // shoulder's own value.
    const step = (outer - inner) / 200;
    expect(focusFalloff(inner + step, inner, outer)).toBeLessThan(0.01);
    expect(focusFalloff(outer - step, inner, outer)).toBeGreaterThan(0.99);
    // Half way across is half dark, exactly — the cubic is symmetric.
    expect(focusFalloff((inner + outer) / 2, inner, outer)).toBeCloseTo(0.5, 12);
  });

  it('degenerates to a hard edge rather than a NaN when the band has no width', () => {
    expect(focusFalloff(1, 2, 2)).toBe(0);
    expect(focusFalloff(2, 2, 2)).toBe(1);
    expect(focusFalloff(3, 2, 1)).toBe(1);
  });
});

describe('the wash', () => {
  it('is clear at the city and full out in the country', () => {
    const anchor = sampleAnchor();
    expect(focusAlphaAt(anchor.x, anchor.y, anchor, 1)).toBe(0);
    expect(focusAlphaAt(anchor.x + 4000, anchor.y, anchor, 1)).toBeCloseTo(VIGNETTE.opacity, 12);
  });

  it('is an ellipse: the same tile distance dims the same, up-screen or across', () => {
    const anchor = sampleAnchor();
    const r = (VIGNETTE.innerRadius + VIGNETTE.outerRadius) / 2;
    const across = focusAlphaAt(anchor.x + anchor.semiX * r, anchor.y, anchor, 1);
    const upward = focusAlphaAt(anchor.x, anchor.y - anchor.semiY * r, anchor, 1);
    expect(across).toBeCloseTo(upward, 12);
    // And it is genuinely squashed — the same *pixel* offset does not.
    expect(focusAlphaAt(anchor.x, anchor.y - anchor.semiX * r, anchor, 1)).toBeGreaterThan(across);
  });

  it('scales with the fade, so a half-faded wash is half as dark', () => {
    const anchor = sampleAnchor();
    const far: [number, number] = [anchor.x + 4000, anchor.y];
    expect(focusAlphaAt(far[0], far[1], anchor, 0)).toBe(0);
    expect(focusAlphaAt(far[0], far[1], anchor, 0.5)).toBeCloseTo(VIGNETTE.opacity / 2, 12);
  });

  it('never darkens the board past the tunable', () => {
    const anchor = sampleAnchor();
    expect(VIGNETTE.opacity).toBeGreaterThan(0);
    expect(VIGNETTE.opacity).toBeLessThan(1);
    for (let x = -500; x <= 1300; x += 37) {
      for (let y = -500; y <= 1100; y += 41) {
        const alpha = focusAlphaAt(x, y, anchor, 1);
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThanOrEqual(VIGNETTE.opacity);
      }
    }
  });
});

describe('the fade', () => {
  it('lands exactly on its endpoints', () => {
    expect(fadeAt(0, 1, 0, 260)).toBe(0);
    expect(fadeAt(0, 1, 260, 260)).toBe(1);
    expect(fadeAt(0, 1, 9999, 260)).toBe(1);
    expect(fadeAt(1, 0, 260, 260)).toBe(0);
  });

  it('is instant when there is no duration — reduced motion, and 0 in the data', () => {
    expect(fadeAt(0, 1, 0, 0)).toBe(1);
    expect(fadeAt(1, 0, 0, 0)).toBe(0);
  });

  it('is sampled absolutely, so a dropped frame cannot leave it short', () => {
    // Two samples of the same elapsed time agree, and a jump straight to the end
    // is the end — nothing here accumulates.
    expect(fadeAt(0, 1, 130, 260)).toBe(fadeAt(0, 1, 130, 260));
    expect(fadeAt(0, 1, 130, 260)).toBeCloseTo(0.5, 12);
  });

  it('resumes from wherever it actually is, so a reopen never jumps', () => {
    // The mid-fade close, then a reopen: `setFocus` passes the live alpha as
    // `from`, so the curve starts where the eye left it.
    const caught = fadeAt(1, 0, 100, 260);
    expect(caught).toBeGreaterThan(0);
    expect(caught).toBeLessThan(1);
    expect(fadeAt(caught, 1, 0, 260)).toBe(caught);
  });
});

describe('the vignette in the frame', () => {
  it('draws over every other readout, badges and HP bars included', () => {
    for (const [name, order] of Object.entries(RENDER_ORDER)) {
      if (name === 'vignette') continue;
      expect(`${name}: ${order < RENDER_ORDER.vignette}`).toBe(`${name}: true`);
    }
  });

  it('is laid in a palette ink like everything else on the board', () => {
    expect(Object.values(VIEW3D.palette)).toContain(VIGNETTE.color);
  });

  it('writes no instance state and asks for no rebuild', () => {
    // Comments stripped first: the module's docblock *names* the machinery it
    // cannot reach, which is the explanation, not a call.
    const source = moduleSource()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    // The board's three-bit instance state machine, the tint channel, and the
    // collectors. None of them is reachable from here, and the point of reading
    // for it is that the day one becomes reachable is the day the docblock's
    // structural claim quietly becomes a promise instead.
    for (const forbidden of [
      'setColorAt',
      'InstanceCollector',
      'BuiltBoard',
      'FogView',
      'RevealView',
      'suppress',
      'unveil',
      'rebuild',
    ]) {
      expect(`${forbidden}: ${source.includes(forbidden)}`).toBe(`${forbidden}: false`);
    }
  });
});
