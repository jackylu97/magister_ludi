import { describe, expect, it } from 'vitest';
import { createNoise3D, fbm3, noise3, ridged3 } from '../src/sim/noise';
import { makeRng } from '../src/sim/rng';
import {
  MAPGEN_CONFIG,
  MAP_SIZE_NAMES,
  crestLine,
  frequencyOf,
  generateMap,
  generateMapDetail,
  getMapSize,
  latitudeOf,
  rankAmong,
  rankNormalizeInPlace,
  sampleCylinder,
  waterDistance,
} from '../src/sim/mapgen';
import { createMap, getTileAt, tileHex, tileIndex, tileNeighbors, wrappedDistance } from '../src/sim/map';
import { neighborInDirection, vertexTiles } from '../src/sim/water';
import { FEATURE_IDS, TERRAIN_IDS, isWaterTerrain } from '../src/sim/terrainData';

const duel = generateMap(1234, 'duel');

function terrainCounts(map = duel): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tile of map.tiles) counts[tile.terrain] = (counts[tile.terrain] ?? 0) + 1;
  return counts;
}

function landFraction(map: typeof duel): number {
  let land = 0;
  for (const tile of map.tiles) if (!isWaterTerrain(tile.terrain)) land++;
  return land / map.tiles.length;
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

  it('generates a map of the configured dimensions', () => {
    for (const name of MAP_SIZE_NAMES) {
      const size = getMapSize(name);
      const map = generateMap(7, name);
      expect(map.width).toBe(size.width);
      expect(map.height).toBe(size.height);
      expect(map.tiles).toHaveLength(size.width * size.height);
      expect(map.sizeName).toBe(name);
      expect(map.seed).toBe(7);
    }
  });
});

describe('determinism', () => {
  it('produces an identical map for the same seed and size', () => {
    expect(generateMap(4242, 'duel')).toEqual(generateMap(4242, 'duel'));
    expect(generateMap(4242, 'standard')).toEqual(generateMap(4242, 'standard'));
  });

  it('produces different maps for different seeds', () => {
    const a = generateMap(1, 'duel');
    const b = generateMap(2, 'duel');
    expect(a).not.toEqual(b);
    const differing = a.tiles.filter((tile, i) => tile.terrain !== b.tiles[i]!.terrain);
    expect(differing.length).toBeGreaterThan(a.tiles.length * 0.1);
  });

  it('does not depend on generation order or shared state', () => {
    const first = generateMap(99, 'duel');
    generateMap(12345, 'standard');
    generateMap(-7, 'huge');
    expect(generateMap(99, 'duel')).toEqual(first);
  });
});

describe('tile validity', () => {
  it('gives every tile a known terrain and feature', () => {
    for (const map of [duel, generateMap(55, 'standard')]) {
      for (const tile of map.tiles) {
        expect(TERRAIN_IDS).toContain(tile.terrain);
        expect(FEATURE_IDS).toContain(tile.feature);
        expect(typeof tile.hills).toBe('boolean');
        expect(tile.elevation).toBeGreaterThanOrEqual(0);
        expect(tile.elevation).toBeLessThanOrEqual(1);
        expect(tile.moisture).toBeGreaterThanOrEqual(0);
        expect(tile.moisture).toBeLessThanOrEqual(1);
      }
    }
  });

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
  it('keeps the land fraction within loose sanity bounds for every seed and size', () => {
    for (const name of MAP_SIZE_NAMES) {
      for (const seed of [1, 2, 3, 99, 31337]) {
        // Rank-normalised elevation means seaLevel is a fraction of the map, so
        // this is stable across seeds; the bounds are still deliberately loose.
        const fraction = landFraction(generateMap(seed, name));
        expect(fraction).toBeGreaterThan(0.2);
        expect(fraction).toBeLessThan(0.6);
      }
    }
  });

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
      const map = generateMap(seed, 'duel');
      for (const tile of map.tiles) {
        if (!isWaterTerrain(tile.terrain) || tile.terrain === 'lake') continue;
        const touchesLand = tileNeighbors(map, tile).some((n) => !isWaterTerrain(n.terrain));
        expect(tile.terrain).toBe(touchesLand ? 'coast' : 'ocean');
      }
    }
  });

  it('puts the coldest terrain at the poles', () => {
    const map = generateMap(31337, 'standard');
    const polarLand = map.tiles.filter(
      (t) => (t.row === 0 || t.row === map.height - 1) && !isWaterTerrain(t.terrain),
    );
    for (const tile of polarLand) {
      expect(['snow', 'mountain']).toContain(tile.terrain);
    }
  });

  it('keeps jungle in the tropics and forest out of the ice', () => {
    const map = generateMap(777, 'standard');
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
 * The two coherent fields, asserted as fields.
 *
 * Everything below is a *property* over many seeds rather than a fixture: what
 * the elevation/moisture pipeline promises is a shape — ranges are lines, hills
 * are their flanks, wood comes in regions — and a shape is exactly the thing a
 * golden map cannot pin down. The share targets are read from `mapgen.json`, so
 * a designer who retunes a share retunes this suite with it.
 */
describe('the elevation field', () => {
  const SEEDS = [1, 2, 3, 7, 11, 42, 99, 777, 1234, 2024, 2468, 31337];
  const ELEVATION = MAPGEN_CONFIG.elevation;

  /** Land tiles, mountain tiles and hill tiles of one map. */
  function relief(map: ReturnType<typeof generateMap>) {
    let land = 0;
    let mountain = 0;
    let hills = 0;
    for (const tile of map.tiles) {
      if (isWaterTerrain(tile.terrain)) continue;
      land += 1;
      if (tile.terrain === 'mountain') mountain += 1;
      if (tile.hills) hills += 1;
    }
    return { land, mountain, hills };
  }

  it('holds the mountain and hill shares of land on every seed and size', () => {
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of SEEDS.slice(0, 4)) {
        const { land, mountain, hills } = relief(generateMap(seed, size));
        const where = `${size}/${seed}`;
        // Quantiles of the land, so these are near-exact rather than banded.
        // The slack is rounding on the cut plus the polar rows, whose ice the
        // sea-level pass adds *after* the field was ranked.
        for (const [name, share, target] of [
          ['mountain', mountain / land, ELEVATION.mountainShare],
          ['hills', hills / land, ELEVATION.hillShare],
        ] as const) {
          expect(`${where} ${name} ${share.toFixed(3)}`).toBe(
            `${where} ${name} ${Math.min(Math.max(share, target - 0.01), target + 0.01).toFixed(3)}`,
          );
        }
      }
    }
  });

  /**
   * Connected components of mountain, as tile indices. The unit a "range" is
   * measured in.
   */
  function mountainRanges(map: ReturnType<typeof generateMap>): number[][] {
    const seen = new Uint8Array(map.tiles.length);
    const ranges: number[][] = [];
    for (let start = 0; start < map.tiles.length; start++) {
      if (seen[start] || map.tiles[start]!.terrain !== 'mountain') continue;
      seen[start] = 1;
      const members = [start];
      for (let head = 0; head < members.length; head++) {
        for (const near of tileNeighbors(map, map.tiles[members[head]!]!)) {
          const at = tileIndex(map, near.col, near.row);
          if (seen[at] || near.terrain !== 'mountain') continue;
          seen[at] = 1;
          members.push(at);
        }
      }
      ranges.push(members);
    }
    return ranges;
  }

  it('makes ranges that are lines, not walls — at every map size', () => {
    // Width, read off the only two numbers a component has: its area and how
    // far apart its two furthest tiles are. A perfect one-hex line of n tiles
    // scores n/(n-1) ≈ 1; a round blob of the same area scores its radius. The
    // ceiling is 2.4 because "one to two tiles wide" is the design target and
    // the measure charges a little for the elbows a real range has.
    //
    // Asserted on *every* size, which is the half that used to fail: the ridge
    // layer is scaled by `cycleTiles`, so a range is the same width in hexes on
    // a giant map as on a duel one. Scaled by `frequency` — the old
    // arrangement — the same five ranges simply grew with the board, and the
    // giant map's mountains were three times the width of the duel map's.
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of SEEDS.slice(0, 4)) {
        const map = generateMap(seed, size);
        const ranges = mountainRanges(map).filter((members) => members.length >= 4);
        expect(`${size}/${seed}: ${ranges.length > 0}`).toBe(`${size}/${seed}: true`);
        let widthSum = 0;
        for (const members of ranges) {
          let longest = 1;
          for (let a = 0; a < members.length; a++) {
            for (let b = a + 1; b < members.length; b++) {
              const distance = wrappedDistance(
                map,
                tileHex(map.tiles[members[a]!]!),
                tileHex(map.tiles[members[b]!]!),
              );
              if (distance > longest) longest = distance;
            }
          }
          widthSum += members.length / longest;
        }
        const width = widthSum / ranges.length;
        expect(`${size}/${seed} width ${width.toFixed(2)}`).toBe(
          `${size}/${seed} width ${Math.min(width, 2.4).toFixed(2)}`,
        );
      }
    }
  });

  it('puts foothills against every range', () => {
    // The consequence of hills being the *flank band* of the field the peaks
    // came from rather than an independent scatter: a mountain tile with no
    // hill beside it is a peak that erupted out of a plain.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SEEDS) {
        const map = generateMap(seed, size);
        let peaks = 0;
        let flanked = 0;
        for (const tile of map.tiles) {
          if (tile.terrain !== 'mountain') continue;
          peaks += 1;
          if (tileNeighbors(map, tile).some((near) => near.hills)) flanked += 1;
        }
        const share = peaks === 0 ? 1 : flanked / peaks;
        expect(`${size}/${seed} flanked ${share.toFixed(2)}`).toBe(
          `${size}/${seed} flanked ${Math.max(share, 0.75).toFixed(2)}`,
        );
      }
    }
  });

  it('spreads hills over every landmass, not just the highest one', () => {
    // "Meaningfully common across all landmasses". The old absolute cut put
    // hills wherever the continental noise happened to peak, so a low-lying
    // continent had none at all; the relief field is ranked over the land as a
    // whole and its crests run everywhere.
    for (const seed of SEEDS.slice(0, 6)) {
      const map = generateMap(seed, 'large');
      const seen = new Uint8Array(map.tiles.length);
      for (let start = 0; start < map.tiles.length; start++) {
        if (seen[start] || isWaterTerrain(map.tiles[start]!.terrain)) continue;
        seen[start] = 1;
        const members = [start];
        for (let head = 0; head < members.length; head++) {
          for (const near of tileNeighbors(map, map.tiles[members[head]!]!)) {
            const at = tileIndex(map, near.col, near.row);
            if (seen[at] || isWaterTerrain(near.terrain)) continue;
            seen[at] = 1;
            members.push(at);
          }
        }
        // Only landmasses big enough to have room for high ground at all. A
        // hundred hexes is where the measurement settles: below it a landmass
        // is a shelf that genuinely may be flat, and the largest hill-less
        // landmass across this sweep is 68 tiles.
        if (members.length < 100) continue;
        const hills = members.filter((at) => map.tiles[at]!.hills).length;
        expect(`${seed}: landmass of ${members.length} has ${hills > 0}`).toBe(
          `${seed}: landmass of ${members.length} has true`,
        );
        // And not a token one or two.
        expect(`${seed}: ${hills / members.length > 0.05}`).toBe(`${seed}: true`);
      }
    }
  });

  it('sources its rivers high, on range ground', () => {
    // Rivers trace downhill, so where they are *born* is the whole of whether
    // they read as coming out of the mountains. Two readings, because the
    // interesting claim is geographic rather than numeric: the springs sit well
    // above the average land, and the corner a river starts at is *on* a range.
    //
    // Not "every spring is above the hill cut": a spring's altitude is the mean
    // of its three hexes, so a corner where two mountain tiles meet a valley
    // floor is high ground by any reading and still averages below the cut.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SEEDS.slice(0, 4)) {
        const { map, rivers } = generateMapDetail(seed, size);
        expect(rivers.length).toBeGreaterThan(0);

        let land = 0;
        let landSum = 0;
        for (const tile of map.tiles) {
          if (isWaterTerrain(tile.terrain)) continue;
          land += 1;
          landSum += tile.elevation;
        }

        let springSum = 0;
        let onRange = 0;
        for (const river of rivers) {
          const spring = river.vertices[0]!;
          springSum += map.tiles[tileIndex(map, spring.col, spring.row)]!.elevation;
          const corner = vertexTiles(map, spring) ?? [];
          if (corner.some((tile) => tile.hills || tile.terrain === 'mountain')) onRange += 1;
        }
        const mean = springSum / rivers.length;
        const where = `${size}/${seed}`;

        expect(`${where} spring ${mean.toFixed(3)}`).toBe(
          `${where} spring ${Math.max(mean, MAPGEN_CONFIG.rivers.minSpringElevation).toFixed(3)}`,
        );
        // And clear of the average land by a real margin, not a rounding error.
        const lift = mean - landSum / land;
        expect(`${where} lift ${lift.toFixed(3)}`).toBe(
          `${where} lift ${Math.max(lift, 0.05).toFixed(3)}`,
        );
        // The geographic reading: nearly every river starts on a hex of hills
        // or mountain. It runs at 96% across this sweep.
        const share = onRange / rivers.length;
        expect(`${where} on range ${share.toFixed(2)}`).toBe(
          `${where} on range ${Math.max(share, 0.8).toFixed(2)}`,
        );
      }
    }
  });

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

describe('the moisture field', () => {
  const SEEDS = [1, 2, 3, 7, 11, 42, 99, 777, 1234, 2024, 2468, 31337];

  it('holds the forest and jungle shares within their bands', () => {
    // Bands rather than the near-equalities the relief cuts get, because a
    // feature share is a share of its *eligible* ground and how much ground is
    // eligible moves with the seed's climate. What the numbers below are is the
    // design target, measured: forest 15–20% of land (down from 24% before the
    // rework, which is the "forests blanket continents" complaint), jungle
    // 8–12% of the equatorial band.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SEEDS) {
        const map = generateMap(seed, size);
        let land = 0;
        let forest = 0;
        let band = 0;
        let jungle = 0;
        for (const tile of map.tiles) {
          if (isWaterTerrain(tile.terrain)) continue;
          land += 1;
          if (tile.feature === 'forest') forest += 1;
          if (latitudeOf(tile.row, map.height) <= MAPGEN_CONFIG.latitude.jungleMax) {
            band += 1;
            if (tile.feature === 'jungle') jungle += 1;
          }
        }
        const where = `${size}/${seed}`;
        const forestShare = forest / land;
        expect(`${where} forest ${forestShare.toFixed(3)}`).toBe(
          `${where} forest ${Math.min(Math.max(forestShare, 0.1), 0.21).toFixed(3)}`,
        );
        const jungleShare = band === 0 ? 0.1 : jungle / band;
        expect(`${where} jungle ${jungleShare.toFixed(3)}`).toBe(
          `${where} jungle ${Math.min(Math.max(jungleShare, 0.03), 0.17).toFixed(3)}`,
        );
      }
    }
  });

  it('makes wood a regional fact: some country is wooded, some is open', () => {
    // The complaint the two-scale moisture field answers is not "too much
    // forest" but "forest everywhere, evenly" — a share alone would not fix
    // that, and a share is all the old single-scale field's threshold was.
    //
    // Overdispersion is the honest measure. Scatter trees independently at rate
    // p and a block of n land tiles has forest-share variance p(1-p)/n; the
    // statistic below is the observed variance over that, so 1 is "no regional
    // structure at all" and anything large is regions. It is in the twenties on
    // a standard map, and the floor is set well under that so a retune has room.
    for (const size of ['standard', 'large', 'huge']) {
      for (const seed of SEEDS.slice(0, 6)) {
        const map = generateMap(seed, size);
        const blockWidth = Math.max(6, Math.round(map.width / 8));
        const blockHeight = Math.max(6, Math.round(map.height / 6));
        const blocks = new Map<string, { land: number; forest: number }>();
        for (const tile of map.tiles) {
          if (isWaterTerrain(tile.terrain)) continue;
          const key = `${Math.floor(tile.col / blockWidth)},${Math.floor(tile.row / blockHeight)}`;
          const block = blocks.get(key) ?? { land: 0, forest: 0 };
          block.land += 1;
          if (tile.feature === 'forest') block.forest += 1;
          blocks.set(key, block);
        }
        // Blocks with enough land in them to have a forest share worth reading.
        const used = [...blocks.values()].filter((block) => block.land >= 25);
        const totalLand = used.reduce((sum, block) => sum + block.land, 0);
        const totalForest = used.reduce((sum, block) => sum + block.forest, 0);
        const p = totalForest / totalLand;
        const shares = used.map((block) => block.forest / block.land);
        const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
        const variance =
          shares.reduce((sum, share) => sum + (share - mean) ** 2, 0) / shares.length;
        const overdispersion = variance / ((p * (1 - p)) / (totalLand / used.length));
        const where = `${size}/${seed}`;
        expect(`${where} clumping ${overdispersion.toFixed(1)}`).toBe(
          `${where} clumping ${Math.max(overdispersion, 5).toFixed(1)}`,
        );
        // And said the plain way: the woodiest country and the barest differ by
        // a lot, not by a rounding error.
        const spread = Math.max(...shares) - Math.min(...shares);
        expect(`${where} spread ${spread.toFixed(2)}`).toBe(
          `${where} spread ${Math.max(spread, 0.3).toFixed(2)}`,
        );
      }
    }
  });

  it('dries the ground downwind of a range', () => {
    // Rain shadow, asserted as the thing it is for: desert is commoner in the
    // lee of mountains than in open country. Skipped bodily when the feature is
    // switched off, because with `enabled: false` the pass does not run and
    // there is nothing to assert.
    const shadow = MAPGEN_CONFIG.moisture.rainShadow;
    if (!shadow.enabled) return;
    let leeDesertAll = 0;
    let leeAll = 0;
    let openDesertAll = 0;
    let openAll = 0;
    for (const seed of [1, 7, 42, 777, 1234, 4242]) {
      const map = generateMap(seed, 'standard');
      let lee = 0;
      let leeMoisture = 0;
      let open = 0;
      let openMoisture = 0;
      for (const tile of map.tiles) {
        if (isWaterTerrain(tile.terrain) || tile.terrain === 'mountain') continue;
        let upwind: typeof tile | undefined = tile;
        let sheltered = false;
        for (let step = 1; step <= shadow.rangeTiles; step++) {
          upwind = neighborInDirection(map, upwind, shadow.windDirection);
          if (!upwind) break;
          if (upwind.terrain === 'mountain') {
            sheltered = true;
            break;
          }
        }
        if (sheltered) {
          lee += 1;
          leeMoisture += tile.moisture;
          leeAll += 1;
          if (tile.terrain === 'desert') leeDesertAll += 1;
        } else {
          open += 1;
          openMoisture += tile.moisture;
          openAll += 1;
          if (tile.terrain === 'desert') openDesertAll += 1;
        }
      }
      // The mechanism, per seed: ground in the lee of a range is drier. This is
      // what the pass actually does, and it holds on every seed.
      const ratio = leeMoisture / lee / (openMoisture / open);
      expect(`${seed}: lee moisture ${ratio.toFixed(2)}x`).toBe(
        `${seed}: lee moisture ${Math.min(ratio, 0.9).toFixed(2)}x`,
      );
    }
    // The *terrain* consequence, pooled rather than per seed. Desert also wants
    // a latitude, so a seed whose ranges all stand in the tundra shows the
    // dryness in its moisture and not in its sand — which is correct, and is
    // why this reading is taken over the sample rather than inside it.
    const arid = leeDesertAll / leeAll / (openDesertAll / openAll);
    expect(`lee is ${arid.toFixed(2)}x as arid`).toBe(
      `lee is ${Math.max(arid, 1.3).toFixed(2)}x as arid`,
    );
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
    const map = generateMap(2024, 'standard');
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
