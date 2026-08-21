import { describe, expect, it } from 'vitest';
import { keyWhiteGround } from '../src/render3d/sprites3d';

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
