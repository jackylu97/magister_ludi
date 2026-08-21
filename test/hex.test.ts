import { describe, expect, it } from 'vitest';
import {
  HEX_DIRECTIONS,
  type Hex,
  axialToCube,
  cubeToAxial,
  hex,
  hexCorners,
  hexDistance,
  hexKey,
  hexLine,
  hexToPixel,
  neighbor,
  neighbors,
  pixelToHex,
  range,
  ring,
  ringRange,
  SQRT3,
} from '../src/sim/hex';

const SAMPLE: Hex[] = [];
for (let q = -6; q <= 6; q++) {
  for (let r = -6; r <= 6; r++) SAMPLE.push({ q, r });
}

describe('hex neighbours', () => {
  it('has 6 distinct directions that all sum to zero', () => {
    expect(HEX_DIRECTIONS).toHaveLength(6);
    const keys = new Set(HEX_DIRECTIONS.map(hexKey));
    expect(keys.size).toBe(6);
    const sum = HEX_DIRECTIONS.reduce((acc, d) => ({ q: acc.q + d.q, r: acc.r + d.r }), {
      q: 0,
      r: 0,
    });
    expect(sum).toEqual({ q: 0, r: 0 });
  });

  it('returns 6 distinct neighbours, each exactly one step away', () => {
    for (const h of SAMPLE) {
      const ns = neighbors(h);
      expect(ns).toHaveLength(6);
      expect(new Set(ns.map(hexKey)).size).toBe(6);
      for (const n of ns) {
        expect(hexDistance(h, n)).toBe(1);
        expect(neighbors(n).some((back) => back.q === h.q && back.r === h.r)).toBe(true);
      }
    }
  });

  it('wraps the direction index in neighbor()', () => {
    const h = hex(2, -3);
    expect(neighbor(h, 0)).toEqual(neighbor(h, 6));
    expect(neighbor(h, 1)).toEqual(neighbor(h, -5));
  });
});

describe('hexDistance', () => {
  it('is zero only for identical hexes', () => {
    for (const h of SAMPLE) expect(hexDistance(h, h)).toBe(0);
    expect(hexDistance(hex(0, 0), hex(1, 0))).toBe(1);
  });

  it('is symmetric', () => {
    for (const a of SAMPLE) {
      for (const b of SAMPLE) {
        expect(hexDistance(a, b)).toBe(hexDistance(b, a));
      }
    }
  });

  it('satisfies the triangle inequality', () => {
    const pts = SAMPLE.filter((_, i) => i % 7 === 0);
    for (const a of pts) {
      for (const b of pts) {
        for (const c of pts) {
          expect(hexDistance(a, c)).toBeLessThanOrEqual(
            hexDistance(a, b) + hexDistance(b, c),
          );
        }
      }
    }
  });

  it('matches known cases', () => {
    expect(hexDistance(hex(0, 0), hex(3, 0))).toBe(3);
    expect(hexDistance(hex(0, 0), hex(0, 3))).toBe(3);
    expect(hexDistance(hex(0, 0), hex(-3, 3))).toBe(3);
    // (2, 2) is 4 steps: +q,+q then +r,+r all lie on non-collinear axes.
    expect(hexDistance(hex(0, 0), hex(2, 2))).toBe(4);
    expect(hexDistance(hex(0, 0), hex(2, -2))).toBe(2);
  });

  it('always returns a whole number', () => {
    for (const a of SAMPLE) {
      for (const b of SAMPLE) expect(Number.isInteger(hexDistance(a, b))).toBe(true);
    }
  });
});

describe('cube conversion', () => {
  it('round-trips axial -> cube -> axial and keeps x+y+z === 0', () => {
    for (const h of SAMPLE) {
      const c = axialToCube(h);
      expect(c.x + c.y + c.z).toBe(0);
      expect(cubeToAxial(c)).toEqual(h);
    }
  });
});

describe('ring and range', () => {
  it('ring(0) is just the centre', () => {
    expect(ring(hex(2, 5), 0)).toEqual([{ q: 2, r: 5 }]);
  });

  it('ring(r) has 6r hexes, all exactly r away and all distinct', () => {
    const center = hex(-2, 4);
    for (let radius = 1; radius <= 8; radius++) {
      const hexes = ring(center, radius);
      expect(hexes).toHaveLength(6 * radius);
      expect(new Set(hexes.map(hexKey)).size).toBe(6 * radius);
      for (const h of hexes) expect(hexDistance(center, h)).toBe(radius);
    }
  });

  it('ring hexes form a closed loop of adjacent steps', () => {
    const hexes = ring(hex(0, 0), 4);
    for (let i = 0; i < hexes.length; i++) {
      const a = hexes[i]!;
      const b = hexes[(i + 1) % hexes.length]!;
      expect(hexDistance(a, b)).toBe(1);
    }
  });

  it('range(r) has 3r^2 + 3r + 1 hexes, all within r and all distinct', () => {
    const center = hex(3, -1);
    for (let radius = 0; radius <= 8; radius++) {
      const hexes = range(center, radius);
      const expected = 3 * radius * radius + 3 * radius + 1;
      expect(hexes).toHaveLength(expected);
      expect(new Set(hexes.map(hexKey)).size).toBe(expected);
      for (const h of hexes) expect(hexDistance(center, h)).toBeLessThanOrEqual(radius);
    }
  });

  it('range is the union of rings 0..r', () => {
    const center = hex(1, 1);
    const fromRings = new Set(ringRange(center, 0, 5).map(hexKey));
    const fromRange = new Set(range(center, 5).map(hexKey));
    expect(fromRings).toEqual(fromRange);
  });

  it('returns nothing for a negative radius', () => {
    expect(ring(hex(0, 0), -1)).toEqual([]);
    expect(range(hex(0, 0), -1)).toEqual([]);
  });
});

describe('hexLine', () => {
  it('starts at a, ends at b and has distance+1 hexes', () => {
    const pairs: [Hex, Hex][] = [
      [hex(0, 0), hex(5, 0)],
      [hex(0, 0), hex(-4, 7)],
      [hex(3, -2), hex(-6, 1)],
      [hex(2, 2), hex(2, 2)],
    ];
    for (const [a, b] of pairs) {
      const line = hexLine(a, b);
      expect(line).toHaveLength(hexDistance(a, b) + 1);
      expect(line[0]).toEqual(a);
      expect(line[line.length - 1]).toEqual(b);
    }
  });

  it('steps one hex at a time', () => {
    const line = hexLine(hex(-5, 3), hex(6, -2));
    for (let i = 1; i < line.length; i++) {
      expect(hexDistance(line[i - 1]!, line[i]!)).toBe(1);
    }
  });
});

describe('pixel conversion', () => {
  it('matches the documented pointy-top formula', () => {
    const size = 10;
    const p = hexToPixel(hex(2, 3), size);
    expect(p.x).toBeCloseTo(size * Math.sqrt(3) * (2 + 3 / 2), 10);
    expect(p.y).toBeCloseTo(size * 1.5 * 3, 10);
  });

  it('round-trips hexToPixel -> pixelToHex for many hexes and sizes', () => {
    for (const size of [1, 8, 16, 22.5, 64]) {
      for (let q = -20; q <= 20; q++) {
        for (let r = -20; r <= 20; r++) {
          const p = hexToPixel({ q, r }, size);
          expect(pixelToHex(p.x, p.y, size)).toEqual({ q, r });
        }
      }
    }
  });

  it('round-trips from jittered points inside each hex', () => {
    const size = 24;
    // Deterministic jitter well inside the inradius (√3/2 · size).
    const offsets = [
      [0, 0],
      [0.4, 0],
      [-0.4, 0],
      [0, 0.45],
      [0, -0.45],
      [0.3, 0.3],
      [-0.3, -0.3],
    ];
    for (let q = -10; q <= 10; q++) {
      for (let r = -10; r <= 10; r++) {
        const p = hexToPixel({ q, r }, size);
        for (const [dx, dy] of offsets) {
          const picked = pixelToHex(p.x + dx! * size, p.y + dy! * size, size);
          expect(picked).toEqual({ q, r });
        }
      }
    }
  });

  it('produces hexes of width √3·size and height 2·size', () => {
    const size = 30;
    const corners = hexCorners(0, 0, size);
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(SQRT3 * size, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2 * size, 6);
  });

  it('places adjacent hex centres exactly one hex apart in pixels', () => {
    const size = 12;
    const origin = hexToPixel(hex(0, 0), size);
    for (const d of HEX_DIRECTIONS) {
      const p = hexToPixel(d, size);
      const dist = Math.hypot(p.x - origin.x, p.y - origin.y);
      expect(dist).toBeCloseTo(SQRT3 * size, 6);
    }
  });
});
