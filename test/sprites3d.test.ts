import { describe, expect, it } from 'vitest';
import {
  alphaDistanceField,
  dieCutStandee,
  keyWhiteGround,
  type StandeeCut,
} from '../src/render3d/sprites3d';

/** One pixel's RGBA, as the loader's canvas hands them over. */
function pixel(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, a]);
}

function alphaOf(rgba: Uint8ClampedArray): number {
  return rgba[3]!;
}

describe('keyWhiteGround', () => {
  it('makes paper-white transparent', () => {
    const rgba = pixel(255, 255, 255);
    keyWhiteGround(rgba, 0.9, 0.12);
    expect(alphaOf(rgba)).toBe(0);
  });

  it('leaves anything below the ramp fully opaque', () => {
    const rgba = pixel(40, 60, 90);
    keyWhiteGround(rgba, 0.9, 0.12);
    expect(alphaOf(rgba)).toBe(255);
  });

  it('feathers the band between the ramp foot and the threshold', () => {
    // Whiteness 0.84 sits halfway up a 0.12-wide ramp ending at 0.9.
    const rgba = pixel(214, 214, 214);
    keyWhiteGround(rgba, 0.9, 0.12);
    const alpha = alphaOf(rgba);
    expect(alpha).toBeGreaterThan(100);
    expect(alpha).toBeLessThan(160);
  });

  it('falls monotonically across the ramp', () => {
    let previous = 256;
    for (let value = 200; value <= 255; value += 5) {
      const rgba = pixel(value, value, value);
      keyWhiteGround(rgba, 0.9, 0.12);
      const alpha = alphaOf(rgba);
      expect(alpha).toBeLessThanOrEqual(previous);
      previous = alpha;
    }
    expect(previous).toBe(0);
  });

  it('keys on the darkest channel, so bright colour survives', () => {
    // A saturated yellow is bright in two channels out of three. Luminance
    // would call it paper; whiteness must not, or the warrior loses his shield.
    const yellow = pixel(255, 240, 30);
    keyWhiteGround(yellow, 0.9, 0.12);
    expect(alphaOf(yellow)).toBe(255);

    // Pale skin is bright in all three but not *that* bright.
    const skin = pixel(240, 205, 180);
    keyWhiteGround(skin, 0.9, 0.12);
    expect(alphaOf(skin)).toBe(255);
  });

  it('treats a zero feather as a hard cut rather than dividing by zero', () => {
    const justUnder = pixel(228, 228, 228); // whiteness ≈ 0.894
    const justOver = pixel(232, 232, 232); // whiteness ≈ 0.910
    keyWhiteGround(justUnder, 0.9, 0);
    keyWhiteGround(justOver, 0.9, 0);
    expect(alphaOf(justUnder)).toBe(255);
    expect(alphaOf(justOver)).toBe(0);
  });

  it('scales the alpha it finds rather than replacing it', () => {
    const half = pixel(255, 255, 255, 128);
    keyWhiteGround(half, 0.9, 0.12);
    expect(alphaOf(half)).toBe(0);

    const dark = pixel(10, 10, 10, 128);
    keyWhiteGround(dark, 0.9, 0.12);
    expect(alphaOf(dark)).toBe(128);
  });

  it('walks a whole buffer, one pixel at a time', () => {
    const rgba = new Uint8ClampedArray([
      255, 255, 255, 255, // paper
      12, 34, 56, 255, // ink
      255, 255, 255, 255, // paper
    ]);
    keyWhiteGround(rgba, 0.9, 0.12);
    expect([rgba[3], rgba[7], rgba[11]]).toEqual([0, 255, 0]);
    // Colour is never touched; only alpha is written.
    expect([rgba[4], rgba[5], rgba[6]]).toEqual([12, 34, 56]);
  });
});

// --- the die cut -----------------------------------------------------------

const PAPER = 0xf1e7cd;
const RIM = 0x211c1e;

function cut(overrides: Partial<StandeeCut> = {}): StandeeCut {
  return {
    borderPx: 2,
    rimPx: 1,
    // Hard-edged by default so a test can assert which band a pixel is in
    // without also asserting where a ramp happens to land.
    edgeFeatherPx: 0,
    maskAlpha: 128,
    paperColor: PAPER,
    rimColor: RIM,
    ...overrides,
  };
}

/** A `width × height` buffer of transparent black, with `set` opaque red. */
function buffer(
  width: number,
  height: number,
  set: readonly [number, number][],
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of set) {
    const i = (y * width + x) * 4;
    rgba[i] = 200;
    rgba[i + 1] = 30;
    rgba[i + 2] = 40;
    rgba[i + 3] = 255;
  }
  return rgba;
}

function at(
  rgba: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!, rgba[i + 3]!];
}

function rgb(color: number): [number, number, number] {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

describe('alphaDistanceField', () => {
  it('is zero on the mask and grows outward from it', () => {
    const width = 5;
    const rgba = buffer(width, 5, [[2, 2]]);
    const distance = alphaDistanceField(rgba, width, 5, 128);
    expect(distance[2 * width + 2]).toBe(0);
    expect(distance[2 * width + 3]).toBeCloseTo(1);
    expect(distance[2 * width + 4]).toBeCloseTo(2);
    // Diagonals cost √2, which is what makes the dilated border round rather
    // than square.
    expect(distance[1 * width + 1]).toBeCloseTo(Math.SQRT2);
    expect(distance[0]).toBeCloseTo(2 * Math.SQRT2);
  });

  it('reaches every pixel from a mask on the far side of the buffer', () => {
    // The backward pass is what carries distance leftward and upward; without
    // it the top-left of this buffer would still hold the initial infinity.
    const width = 6;
    const rgba = buffer(width, 3, [[5, 2]]);
    const distance = alphaDistanceField(rgba, width, 3, 128);
    expect(distance[0]).toBeLessThan(width + 3);
    expect(distance[0]).toBeCloseTo(3 + 2 * Math.SQRT2, 5);
  });

  it('reads the mask off alpha, not off colour', () => {
    const width = 3;
    const rgba = buffer(width, 1, [[1, 0]]);
    rgba[4 + 3] = 100; // below the threshold: no longer the figure
    const distance = alphaDistanceField(rgba, width, 1, 128);
    expect(distance[1]).toBeGreaterThan(0);
  });
});

describe('dieCutStandee', () => {
  it('keeps the figure, and forces it fully opaque', () => {
    const width = 9;
    const rgba = buffer(width, 9, [[4, 4]]);
    // A feathered pixel from the white key, still above the mask threshold.
    const feathered = (4 * width + 5) * 4;
    rgba[feathered] = 90;
    rgba[feathered + 1] = 90;
    rgba[feathered + 2] = 90;
    rgba[feathered + 3] = 200;

    dieCutStandee(rgba, width, 9, cut());

    expect(at(rgba, width, 4, 4)).toEqual([200, 30, 40, 255]);
    // Its paint survives; only its alpha is pushed to solid, because the paper
    // is printed behind it and nothing inside the silhouette is see-through.
    expect(at(rgba, width, 5, 4)).toEqual([90, 90, 90, 255]);
  });

  it('paints the dilated band in paper, solid', () => {
    const width = 9;
    const rgba = buffer(width, 9, [[4, 4]]);
    dieCutStandee(rgba, width, 9, cut({ borderPx: 2, rimPx: 1 }));

    // d = 1 and d = 2 straight out, and d = √2 diagonally: all inside a
    // two-pixel border.
    for (const [x, y] of [
      [5, 4],
      [6, 4],
      [4, 2],
      [5, 5],
    ] as const) {
      expect(at(rgba, width, x, y)).toEqual([...rgb(PAPER), 255]);
    }
  });

  it('inks a thin rim outside the band, solid', () => {
    const width = 9;
    const rgba = buffer(width, 9, [[4, 4]]);
    dieCutStandee(rgba, width, 9, cut({ borderPx: 2, rimPx: 1 }));

    // d = 3 straight out, and d = 2√2 ≈ 2.83 diagonally: both in (2, 3].
    expect(at(rgba, width, 7, 4)).toEqual([...rgb(RIM), 255]);
    expect(at(rgba, width, 6, 6)).toEqual([...rgb(RIM), 255]);
  });

  it('clears everything past the rim', () => {
    const width = 9;
    const rgba = buffer(width, 9, [[4, 4]]);
    dieCutStandee(rgba, width, 9, cut({ borderPx: 2, rimPx: 1 }));
    expect(at(rgba, width, 8, 4)[3]).toBe(0); // d = 4
    expect(at(rgba, width, 0, 0)[3]).toBe(0);
  });

  it('walks the bands outward in order, with no gap between them', () => {
    // The whole silhouette has to be solid out to the far edge of the rim, or
    // the alpha test punches holes in the card.
    const width = 15;
    const rgba = buffer(width, 3, [[0, 1]]);
    dieCutStandee(rgba, width, 3, cut({ borderPx: 5, rimPx: 3 }));
    const alphas: number[] = [];
    for (let x = 0; x < width; x++) alphas.push(at(rgba, width, x, 1)[3]);
    expect(alphas).toEqual([255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0]);
  });

  it('feathers only the outer edge of the rim', () => {
    const width = 9;
    const rgba = buffer(width, 3, [[0, 1]]);
    dieCutStandee(rgba, width, 3, cut({ borderPx: 1, rimPx: 1, edgeFeatherPx: 2 }));
    // d = 0..2 solid, then a two-pixel ramp down to nothing.
    expect(at(rgba, width, 2, 1)[3]).toBe(255);
    const ramp = at(rgba, width, 3, 1)[3];
    expect(ramp).toBeGreaterThan(0);
    expect(ramp).toBeLessThan(255);
    expect(at(rgba, width, 4, 1)[3]).toBe(0);
  });

  it('erases a buffer with no figure in it at all', () => {
    // A sprite whose key ate everything must come back empty rather than as a
    // solid parchment card, which would be a very confusing thing to ship.
    const width = 4;
    const rgba = buffer(width, 4, []);
    dieCutStandee(rgba, width, 4, cut());
    for (let i = 3; i < rgba.length; i += 4) expect(rgba[i]).toBe(0);
  });

  it('draws the rim straight onto the figure when the border is zero', () => {
    const width = 7;
    const rgba = buffer(width, 3, [[0, 1]]);
    dieCutStandee(rgba, width, 3, cut({ borderPx: 0, rimPx: 2 }));
    expect(at(rgba, width, 1, 1)).toEqual([...rgb(RIM), 255]);
    expect(at(rgba, width, 2, 1)).toEqual([...rgb(RIM), 255]);
    expect(at(rgba, width, 3, 1)[3]).toBe(0);
  });

  it('treats a card it has already cut as one big figure', () => {
    // Not something the loader does — it is here to pin down that the bands are
    // a function of the *mask* and nothing else, so re-cutting grows the card
    // rather than doing nothing. Anybody tempted to make this idempotent would
    // have to stop deriving the mask from alpha, which is the load-bearing part.
    const width = 9;
    const once = buffer(width, 9, [[4, 4]]);
    dieCutStandee(once, width, 9, cut());
    const twice = Uint8ClampedArray.from(once);
    dieCutStandee(twice, width, 9, cut());
    // The first cut made the paper band opaque, so the second reads it as
    // figure and grows the card by one band. That is the documented behaviour
    // of "solid means figure" — assert it rather than pretend otherwise.
    expect(at(twice, width, 4, 4)).toEqual(at(once, width, 4, 4));
    expect(at(twice, width, 8, 4)[3]).toBe(255);
  });
});
