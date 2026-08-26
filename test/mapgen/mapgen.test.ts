import { describe, expect, it } from 'vitest';
import { createNoise3D, fbm3, noise3, ridged3 } from '../../src/sim/noise';
import { makeRng } from '../../src/sim/rng';
import {
  MAPGEN_CONFIG,
  MAP_SIZE_NAMES,
  crestLine,
  frequencyOf,
  getMapSize,
  latitudeOf,
  rankAmong,
  rankNormalizeInPlace,
  sampleCylinder,
  waterDistance,
} from '../../src/sim/mapgen';
import { createMap, getTileAt, tileIndex, tileNeighbors } from '../../src/sim/map';
import { mapFor } from './fixtures';
import { isWaterTerrain } from '../../src/sim/terrainData';

const duel = mapFor(1234, 'duel');

function terrainCounts(map = duel): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tile of map.tiles) counts[tile.terrain] = (counts[tile.terrain] ?? 0) + 1;
  return counts;
}

describe('map sizes', () => {
  it('exposes the configured sizes', () => {
    expect(MAP_SIZE_NAMES).toEqual(['duel', 'standard', 'large', 'huge', 'giant']);
    expect(getMapSize('duel')).toMatchObject({ width: 40, height: 25 });
    expect(getMapSize('standard')).toMatchObject({ width: 80, height: 52 });
    expect(getMapSize('large')).toMatchObject({ width: 104, height: 64 });
    expect(getMapSize('huge')).toMatchObject({ width: 128, height: 80 });
    expect(getMapSize('giant')).toMatchObject({ width: 180, height: 112 });
  });

  it('throws on an unknown size', () => {
    expect(() => getMapSize('gigantic')).toThrow(/Unknown map size/);
  });

});

describe('determinism', () => {
  it('produces different maps for different seeds', () => {
    const a = mapFor(1, 'duel');
    const b = mapFor(2, 'duel');
    expect(a).not.toEqual(b);
    const differing = a.tiles.filter((tile, i) => tile.terrain !== b.tiles[i]!.terrain);
    expect(differing.length).toBeGreaterThan(a.tiles.length * 0.1);
  });

});

describe('tile validity', () => {
  it('keeps offset coordinates consistent with the tile array', () => {
    for (let row = 0; row < duel.height; row++) {
      for (let col = 0; col < duel.width; col++) {
        const tile = getTileAt(duel, col, row)!;
        expect(tile.col).toBe(col);
        expect(tile.row).toBe(row);
      }
    }
  });

  it('never puts a feature or hills on water or mountains', () => {
    for (const tile of duel.tiles) {
      if (isWaterTerrain(tile.terrain) || tile.terrain === 'mountain') {
        expect(tile.feature).toBe('none');
        expect(tile.hills).toBe(false);
      }
    }
  });

  it('produces a plain, JSON-serializable map', () => {
    const clone = JSON.parse(JSON.stringify(duel));
    expect(clone).toEqual(duel);
  });
});

describe('terrain distribution', () => {
  it('produces several distinct terrains including water and land', () => {
    const counts = terrainCounts();
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(4);
    expect(counts['ocean']).toBeGreaterThan(0);
    expect((counts['grassland'] ?? 0) + (counts['plains'] ?? 0)).toBeGreaterThan(0);
  });

  it('marks marine water next to land as coast and open water as ocean', () => {
    // Lakes are excluded: they are classified out of the sea *before* the coast
    // pass and are deliberately not coast, however much land they touch. That a
    // lake never mints a coastal tile is asserted in `water.test.ts`.
    for (const seed of [2468, 1, 7, 31337]) {
      const map = mapFor(seed, 'duel');
      for (const tile of map.tiles) {
        if (!isWaterTerrain(tile.terrain) || tile.terrain === 'lake') continue;
        const touchesLand = tileNeighbors(map, tile).some((n) => !isWaterTerrain(n.terrain));
        expect(tile.terrain).toBe(touchesLand ? 'coast' : 'ocean');
      }
    }
  });

  it('puts the coldest terrain at the poles', () => {
    const map = mapFor(31337, 'standard');
    const polarLand = map.tiles.filter(
      (t) => (t.row === 0 || t.row === map.height - 1) && !isWaterTerrain(t.terrain),
    );
    for (const tile of polarLand) {
      expect(['snow', 'mountain']).toContain(tile.terrain);
    }
  });

  it('keeps jungle in the tropics and forest out of the ice', () => {
    const map = mapFor(777, 'standard');
    for (const tile of map.tiles) {
      const latitude = latitudeOf(tile.row, map.height);
      if (tile.feature === 'jungle') {
        expect(latitude).toBeLessThanOrEqual(MAPGEN_CONFIG.latitude.jungleMax);
      }
      if (tile.feature === 'forest') {
        expect(latitude).toBeLessThanOrEqual(MAPGEN_CONFIG.latitude.forestMax);
        expect(latitude).toBeGreaterThanOrEqual(MAPGEN_CONFIG.latitude.forestMin);
      }
    }
  });
});

/**
 * The elevation field's *primitives*, on hand-made fields.
 *
 * The field's shape — ranges are lines, hills are their flanks, wood comes in
 * regions — is a property over many seeds and sizes, so it is asserted in
 * `mapgen.slow.test.ts`. What is left here is what a single eleven-by-nine
 * grid can answer: what a crest is, what a distance-to-water field is, what
 * ranking a subset means, and which key a noise layer reads its scale from.
 */
describe('the elevation field', () => {
  it('marks a crest line one tile wide across a ridge', () => {
    // The primitive, on a field with a single known ridge: a hand-made map
    // whose value depends only on the distance from one column.
    const map = createMap({ width: 11, height: 9, terrain: 'grassland' });
    const land = new Uint8Array(map.tiles.length).fill(1);
    const field = new Float64Array(map.tiles.length);
    for (const tile of map.tiles) {
      field[tileIndex(map, tile.col, tile.row)] = 5 - Math.abs(tile.col - 5);
    }
    const on = crestLine(map, field, land);
    for (const tile of map.tiles) {
      const marked = on[tileIndex(map, tile.col, tile.row)] === 1;
      // Column 5 is the ridge and is the *only* thing marked: the test of a
      // crest is strict on both sides, so a tile on the slope — however steep —
      // never qualifies. Column 0 is the seam, where the field turns round and
      // comes back: a valley, and a minimum is not a crest either.
      expect(`(${tile.col},${tile.row}) ${marked}`).toBe(
        `(${tile.col},${tile.row}) ${tile.col === 5}`,
      );
    }
  });

  it('measures distance to water through the land', () => {
    const map = createMap({ width: 9, height: 7, terrain: 'grassland' });
    const land = new Uint8Array(map.tiles.length).fill(1);
    land[tileIndex(map, 4, 3)] = 0;
    const distance = waterDistance(map, land);
    expect(distance[tileIndex(map, 4, 3)]).toBe(0);
    for (const near of tileNeighbors(map, getTileAt(map, 4, 3)!)) {
      expect(distance[tileIndex(map, near.col, near.row)]).toBe(1);
    }
    // A tile two steps off is two, and the field is a plain BFS elsewhere.
    expect(distance[tileIndex(map, 4, 1)]).toBe(2);
  });

  it('ranks a subset among itself', () => {
    const values = new Float64Array([9, 1, 5, 7, 3]);
    const mask = new Uint8Array([1, 0, 1, 0, 1]);
    // 5 and 9 and 3 are the selected values: 3 is lowest, 9 highest.
    expect(Array.from(rankAmong(values, mask))).toEqual([1, 0, 0.5, 0, 0]);
    expect(Array.from(rankAmong(values, new Uint8Array(5)))).toEqual([0, 0, 0, 0, 0]);
  });

  it('reads a noise layer’s scale from whichever key it carries', () => {
    // `frequency` fixes the feature *count* and grows the features with the
    // map; `cycleTiles` fixes their size in hexes and grows their number. The
    // ridge layer wants the second, which is why a giant map's ranges are as
    // narrow as a duel map's.
    expect(frequencyOf({ frequency: 2.6, octaves: 1, lacunarity: 2, persistence: 0.5 }, 80)).toBe(
      2.6,
    );
    expect(frequencyOf({ cycleTiles: 20, octaves: 1, lacunarity: 2, persistence: 0.5 }, 80)).toBe(4);
    expect(frequencyOf({ cycleTiles: 20, octaves: 1, lacunarity: 2, persistence: 0.5 }, 180)).toBe(9);
    expect(() =>
      frequencyOf({ octaves: 1, lacunarity: 2, persistence: 0.5 }, 80),
    ).toThrow(/frequency.*cycleTiles/);
  });
});

describe('rank normalisation', () => {
  it('maps values onto evenly spaced ranks in [0, 1] preserving order', () => {
    const values = new Float64Array([3.5, -1, 0, 100, 2]);
    rankNormalizeInPlace(values);
    expect(Array.from(values)).toEqual([0.75, 0, 0.25, 1, 0.5]);
  });

  it('handles ties deterministically and empty input safely', () => {
    const values = new Float64Array([1, 1, 1, 1]);
    rankNormalizeInPlace(values);
    expect(Array.from(values)).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(() => rankNormalizeInPlace(new Float64Array(0))).not.toThrow();
  });

  it('makes the water fraction track the configured sea level', () => {
    const map = mapFor(2024, 'standard');
    let water = 0;
    for (const tile of map.tiles) if (isWaterTerrain(tile.terrain)) water++;
    // The polar elevation bonus converts a little water into ice caps.
    expect(water / map.tiles.length).toBeGreaterThan(
      MAPGEN_CONFIG.elevation.seaLevel - 0.12,
    );
    expect(water / map.tiles.length).toBeLessThanOrEqual(
      MAPGEN_CONFIG.elevation.seaLevel + 0.02,
    );
  });
});

describe('latitude', () => {
  it('is 0 at the equator and 1 at both poles', () => {
    expect(latitudeOf(0, 51)).toBe(1);
    expect(latitudeOf(50, 51)).toBe(1);
    expect(latitudeOf(25, 51)).toBe(0);
    expect(latitudeOf(12, 51)).toBeCloseTo(0.52, 2);
  });

  it('is symmetric about the equator', () => {
    const height = 40;
    for (let row = 0; row < height; row++) {
      expect(latitudeOf(row, height)).toBeCloseTo(latitudeOf(height - 1 - row, height), 12);
    }
  });
});

describe('cylinder noise sampling (the seam)', () => {
  const noise = createNoise3D(makeRng(20250820));
  const config = MAPGEN_CONFIG.noise.elevation;

  it('is exactly periodic: col 0 and col === width sample the same value', () => {
    for (const width of [40, 80, 128]) {
      for (let row = 0; row < 20; row++) {
        const atZero = sampleCylinder(noise, config, 0, row, width);
        const atWidth = sampleCylinder(noise, config, width, row, width);
        expect(Math.abs(atWidth - atZero)).toBeLessThan(1e-9);
      }
    }
  });

  it('is periodic for every column, not just the origin', () => {
    const width = 64;
    for (let col = 0; col < width; col++) {
      const a = sampleCylinder(noise, config, col, 5, width);
      const b = sampleCylinder(noise, config, col + width, 5, width);
      const c = sampleCylinder(noise, config, col - width, 5, width);
      expect(Math.abs(b - a)).toBeLessThan(1e-9);
      expect(Math.abs(c - a)).toBeLessThan(1e-9);
    }
  });

  it('changes smoothly across the seam, like any interior column pair', () => {
    const width = 80;
    const row = 20;
    let interiorMax = 0;
    for (let col = 1; col < width - 1; col++) {
      const step = Math.abs(
        sampleCylinder(noise, config, col + 1, row, width) -
          sampleCylinder(noise, config, col, row, width),
      );
      interiorMax = Math.max(interiorMax, step);
    }
    const seamStep = Math.abs(
      sampleCylinder(noise, config, 0, row, width) -
        sampleCylinder(noise, config, width - 1, row, width),
    );
    expect(seamStep).toBeLessThanOrEqual(interiorMax);
  });

  it('actually varies across the map (not a constant field)', () => {
    const values: number[] = [];
    for (let col = 0; col < 40; col++) values.push(sampleCylinder(noise, config, col, 7, 40));
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeGreaterThan(0.05);
  });
});

describe('noise primitives', () => {
  it('is deterministic for a given seed and drifts for another', () => {
    const a = createNoise3D(makeRng(5));
    const b = createNoise3D(makeRng(5));
    const c = createNoise3D(makeRng(6));
    // Not a lattice point: (1.5, 2.5, 3.5) is a simplex corner where every
    // contribution is zero for any permutation table.
    expect(noise3(a, 1.3, 2.7, -0.4)).toBe(noise3(b, 1.3, 2.7, -0.4));
    expect(noise3(a, 1.3, 2.7, -0.4)).not.toBe(noise3(c, 1.3, 2.7, -0.4));
  });

  it('stays within [-1, 1] over a wide sample', () => {
    const noise = createNoise3D(makeRng(11));
    for (let i = 0; i < 4000; i++) {
      const v = noise3(noise, i * 0.37 - 500, i * 0.11 - 200, i * -0.23 + 90);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is continuous: nearby inputs give nearby outputs', () => {
    const noise = createNoise3D(makeRng(3));
    for (let i = 0; i < 500; i++) {
      const x = i * 0.19 - 40;
      const a = noise3(noise, x, 3.1, -2.2);
      const b = noise3(noise, x + 1e-4, 3.1, -2.2);
      expect(Math.abs(a - b)).toBeLessThan(1e-2);
    }
  });

  it('fbm stays normalised and is deterministic', () => {
    const noise = createNoise3D(makeRng(13));
    const options = { octaves: 5, lacunarity: 2, persistence: 0.5 };
    for (let i = 0; i < 2000; i++) {
      const v = fbm3(noise, i * 0.13, i * -0.07, i * 0.29, options);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(fbm3(noise, 1, 2, 3, options)).toBe(fbm3(noise, 1, 2, 3, options));
  });

  it('ridged noise stays in [0, 1] and is deterministic', () => {
    const noise = createNoise3D(makeRng(17));
    const options = { octaves: 4, lacunarity: 2, persistence: 0.5, offset: 1, gain: 1.9 };
    for (let i = 0; i < 2000; i++) {
      const v = ridged3(noise, i * 0.11, i * -0.05, i * 0.23, options);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(ridged3(noise, 1, 2, 3, options)).toBe(ridged3(noise, 1, 2, 3, options));
    expect(ridged3(noise, 1, 2, 3, { ...options, octaves: 0 })).toBe(0);
  });

  it('ridged noise creases where plain noise merely crosses zero', () => {
    // The whole reason ranges are lines: `offset - |noise|` turns the smooth
    // zero-crossing *surface* of the underlying field into a sharp maximum, so
    // the crests of the ridged field are connected curves rather than islands.
    // Sampled along a line, the ridged field peaks exactly where the plain one
    // changes sign.
    const noise = createNoise3D(makeRng(23));
    const options = { octaves: 1, lacunarity: 2, persistence: 0.5, offset: 1, gain: 1 };
    let crossings = 0;
    let atCrossings = 0;
    let everywhere = 0;
    let samples = 0;
    let previous = noise3(noise, 0, 0.5, 0.25);
    for (let i = 1; i < 600; i++) {
      const x = i * 0.05;
      const plain = noise3(noise, x, 0.5, 0.25);
      const crest = ridged3(noise, x, 0.5, 0.25, options);
      everywhere += crest;
      samples += 1;
      if (Math.sign(plain) !== Math.sign(previous)) {
        crossings += 1;
        atCrossings += crest;
      }
      previous = plain;
    }
    expect(crossings).toBeGreaterThan(5);
    // The ridged field is markedly higher at a sign change of the plain field
    // than it is on average — the crease is *where the noise crosses zero*, and
    // a zero crossing in 3D is a surface, which is a line on the cylinder the
    // generator samples.
    expect(atCrossings / crossings).toBeGreaterThan((everywhere / samples) * 1.5);
  });

  it('returns 0 for zero octaves', () => {
    const noise = createNoise3D(makeRng(1));
    expect(fbm3(noise, 1, 2, 3, { octaves: 0, lacunarity: 2, persistence: 0.5 })).toBe(0);
  });
});
