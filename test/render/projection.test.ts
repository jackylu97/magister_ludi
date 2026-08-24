import { describe, expect, it } from 'vitest';
import { SQRT3 } from '../../src/sim/hex';
import { axialToOffset } from '../../src/sim/map';
import {
  cacheIsoHeight,
  cacheIsoWidth,
  createProjection,
  frontChain,
  hexWidth,
  isoToAxial,
  isoToPlane,
  planeToHexPixel,
  planeToIso,
  squashedHexCorners,
  tileIsoCenter,
  tilePlaneCenter,
  tileRise,
} from '../../src/render/projection';

/** A spread of squash values, including the degenerate flat-view case. */
const SQUASHES = [1, 0.85, 0.58, 0.42, 0.25];
const BASE_SIZES = [8, 22, 40, 69.28];
const PADS = [0, 17, 120.5];

function projections(): ReturnType<typeof createProjection>[] {
  const result = [];
  for (const squash of SQUASHES) {
    for (const baseSize of BASE_SIZES) {
      for (const padTop of PADS) {
        result.push(createProjection(baseSize, squash, padTop, 5, 10));
      }
    }
  }
  return result;
}

describe('plane <-> iso', () => {
  it('leaves x alone and only ever scales y', () => {
    for (const projection of projections()) {
      for (const point of [
        { x: 0, y: 0 },
        { x: 137.5, y: -42 },
        { x: -900, y: 1234.75 },
      ]) {
        const iso = planeToIso(point, projection);
        expect(iso.x).toBe(point.x);
        expect(iso.y).toBeCloseTo(point.y * projection.squash + projection.padTop, 9);
      }
    }
  });

  it('round-trips every point through isoToPlane', () => {
    for (const projection of projections()) {
      for (let i = 0; i < 40; i++) {
        // Deterministic spread, no RNG: tests must not be flaky.
        const point = { x: i * 37.25 - 500, y: i * -61.5 + 220 };
        const iso = planeToIso(point, projection);
        const back = isoToPlane(iso.x, iso.y, projection);
        expect(back.x).toBeCloseTo(point.x, 6);
        expect(back.y).toBeCloseTo(point.y, 6);
      }
    }
  });

  it('undoes the row-0 shift that tilePlaneCenter applies', () => {
    for (const baseSize of BASE_SIZES) {
      const plane = tilePlaneCenter(3, 4, baseSize);
      const local = planeToHexPixel(plane.x, plane.y, baseSize);
      expect(local.y).toBeCloseTo(plane.y - baseSize, 9);
      expect(local.x).toBe(plane.x);
    }
  });
});

describe('projection round-trip', () => {
  it('maps a tile centre back to the same tile, for every squash', () => {
    for (const projection of projections()) {
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 12; col++) {
          const iso = tileIsoCenter(col, row, projection);
          const { col: gotCol, row: gotRow } = axialToOffset(
            isoToAxial(iso.x, iso.y, projection),
          );
          expect({ col: gotCol, row: gotRow }).toEqual({ col, row });
        }
      }
    }
  });

  it('maps points well inside a hex back to that hex', () => {
    // Sixteen offsets at 40% of the circumradius: comfortably inside the hex
    // for every squash, since the squash only ever shrinks the y extent.
    const offsets: { dx: number; dy: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      offsets.push({ dx: Math.cos(angle) * 0.4, dy: Math.sin(angle) * 0.4 });
    }

    for (const projection of projections()) {
      const { baseSize, squash } = projection;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const iso = tileIsoCenter(col, row, projection);
          for (const { dx, dy } of offsets) {
            const hit = axialToOffset(
              isoToAxial(
                iso.x + dx * baseSize,
                iso.y + dy * baseSize * squash,
                projection,
              ),
            );
            expect(hit).toEqual({ col, row });
          }
        }
      }
    }
  });

  it('is unaffected by padTop, which only shifts the whole board', () => {
    const a = createProjection(30, 0.58, 0, 5, 10);
    const b = createProjection(30, 0.58, 250, 5, 10);
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        expect(tileIsoCenter(col, row, b).y - tileIsoCenter(col, row, a).y).toBeCloseTo(250, 9);
        expect(axialToOffset(isoToAxial(tileIsoCenter(col, row, b).x, tileIsoCenter(col, row, b).y, b)))
          .toEqual({ col, row });
      }
    }
  });
});

describe('elevation', () => {
  const projection = createProjection(40, 0.58, 12, 5, 10);

  it('lifts mountains most, then hills, and leaves flat land alone', () => {
    expect(tileRise({ terrain: 'mountain', hills: false }, projection)).toBe(10);
    expect(tileRise({ terrain: 'mountain', hills: true }, projection)).toBe(10);
    expect(tileRise({ terrain: 'grassland', hills: true }, projection)).toBe(5);
    expect(tileRise({ terrain: 'grassland', hills: false }, projection)).toBe(0);
    expect(tileRise({ terrain: 'ocean', hills: false }, projection)).toBe(0);
  });
});

describe('squashed hex geometry', () => {
  it('scales only the y offsets, so stroke widths stay uniform', () => {
    const flat = squashedHexCorners(100, 200, 30, 1);
    const squashed = squashedHexCorners(100, 200, 30, 0.5);
    for (let i = 0; i < 6; i++) {
      expect(squashed[i]!.x).toBeCloseTo(flat[i]!.x, 9);
      expect(squashed[i]!.y - 200).toBeCloseTo((flat[i]!.y - 200) * 0.5, 9);
    }
  });

  it('puts the top vertex at index 5 and the bottom one at index 2', () => {
    const corners = squashedHexCorners(0, 0, 10, 0.6);
    expect(corners[5]!.y).toBeCloseTo(-6, 9);
    expect(corners[2]!.y).toBeCloseTo(6, 9);
    expect(corners[5]!.x).toBeCloseTo(0, 9);
    expect(corners[2]!.x).toBeCloseTo(0, 9);
  });

  it('gives frontChain the five corners of the lower silhouette', () => {
    const corners = squashedHexCorners(0, 0, 10, 0.6);
    const front = frontChain(corners);
    expect(front).toHaveLength(5);
    expect(front[0]).toBe(corners[0]);
    expect(front[4]).toBe(corners[4]);
    // The bottom vertex is in the middle of the chain.
    expect(front[2]).toBe(corners[2]);
  });
});

describe('cache dimensions', () => {
  it('keeps the wrap period exactly one hex width per column', () => {
    expect(hexWidth(40)).toBeCloseTo(SQRT3 * 40, 9);
    expect(cacheIsoWidth(80, 40)).toBeCloseTo(SQRT3 * 40 * 80, 9);
  });

  it('shrinks with the squash and grows with the padding', () => {
    const tall = createProjection(40, 1, 0, 5, 10);
    const squat = createProjection(40, 0.5, 0, 5, 10);
    const padded = createProjection(40, 0.5, 100, 5, 10);
    expect(cacheIsoHeight(52, squat)).toBeCloseTo(cacheIsoHeight(52, tall) / 2, 6);
    expect(cacheIsoHeight(52, padded) - cacheIsoHeight(52, squat)).toBeCloseTo(100, 9);
  });

  it('leaves room for the whole of row 0 and row height-1', () => {
    const projection = createProjection(40, 0.58, 25, 5, 10);
    const height = cacheIsoHeight(30, projection);
    const first = tileIsoCenter(0, 0, projection);
    const last = tileIsoCenter(0, 29, projection);
    expect(first.y - 40 * 0.58).toBeCloseTo(25, 6);
    expect(last.y + 40 * 0.58).toBeCloseTo(height, 6);
  });
});
