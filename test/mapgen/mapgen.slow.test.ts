/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the generator's
 * sweeps.
 *
 * What is here is not a different subject from `mapgen.test.ts`; it is the same
 * subject asked of *every seed and every size*. The elevation and moisture
 * fields promise a **shape** — ranges are lines, hills are their flanks, wood
 * comes in regions — and a shape is the one thing a single fixture map cannot
 * pin down, so these claims are properties over a dozen seeds across five sizes.
 * A giant map costs about three and a half seconds to make; twenty-five of them
 * is a minute, and a minute is the whole reason the tiers exist.
 *
 * The line between the two files is the loop, not the assertion: a test that
 * iterates `MAP_SIZE_NAMES` or the twelve-seed `SEEDS` array lives here, and a
 * test that reads one duel or one standard map stays in core. Nothing is
 * duplicated — core keeps the primitives (`crestLine`, `waterDistance`,
 * `rankAmong`, the noise functions, the seam) and the single-map readings, and
 * the sweeps that used to make `npm run test` a coffee break live here.
 */
import { describe, expect, it } from 'vitest';
import {
  MAPGEN_CONFIG,
  MAP_SIZE_NAMES,
  generateMap,
  getMapSize,
  latitudeOf,
} from '../../src/sim/mapgen';
import { HEX_DIRECTIONS } from '../../src/sim/hex';
import { getTile, tileHex, tileIndex, tileNeighbors, wrappedDistance } from '../../src/sim/map';
import { neighborInDirection, vertexTiles } from '../../src/sim/water';
import { detailFor, mapFor } from './fixtures';
import { FEATURE_IDS, TERRAIN_IDS, isWaterTerrain } from '../../src/sim/terrainData';

function landFraction(map: ReturnType<typeof generateMap>): number {
  let land = 0;
  for (const tile of map.tiles) if (!isWaterTerrain(tile.terrain)) land++;
  return land / map.tiles.length;
}

describe('map sizes', () => {
  it('generates a map of the configured dimensions', () => {
    for (const name of MAP_SIZE_NAMES) {
      const size = getMapSize(name);
      const map = mapFor(7, name);
      expect(map.width).toBe(size.width);
      expect(map.height).toBe(size.height);
      expect(map.tiles).toHaveLength(size.width * size.height);
      expect(map.sizeName).toBe(name);
      expect(map.seed).toBe(7);
    }
  });
});

describe('determinism', () => {
  // The one corner of this file that calls `generateMap` rather than the memo
  // table in `./fixtures`: a test whose subject is "the same seed twice gives
  // the same map" has to generate twice, or it is asserting that a cache hands
  // back what it stored. That is also why it is slow-tier — it pays the full
  // price for every map it names, memo or no memo.
  it('produces an identical map for the same seed and size', () => {
    expect(generateMap(4242, 'duel')).toEqual(generateMap(4242, 'duel'));
    expect(generateMap(4242, 'standard')).toEqual(generateMap(4242, 'standard'));
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
    // Seven readings on every tile of two maps — about thirty thousand
    // assertions, which is what makes an otherwise plain integrity check a
    // slow-tier test. Core keeps the same integrity claims on the duel map.
    for (const map of [mapFor(1234, 'duel'), mapFor(55, 'standard')]) {
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
});

describe('terrain distribution', () => {
  it('keeps the land fraction within loose sanity bounds for every seed and size', () => {
    for (const name of MAP_SIZE_NAMES) {
      for (const seed of [1, 2, 3, 99, 31337]) {
        // Rank-normalised elevation means seaLevel is a fraction of the map, so
        // this is stable across seeds; the bounds are still deliberately loose.
        const fraction = landFraction(mapFor(seed, name));
        expect(fraction).toBeGreaterThan(0.2);
        expect(fraction).toBeLessThan(0.6);
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
        const { land, mountain, hills } = relief(mapFor(seed, size));
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
        const map = mapFor(seed, size);
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
        const map = mapFor(seed, size);
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
      const map = mapFor(seed, 'large');
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

  it('puts standalone hills across the interior, wooded ones among them', () => {
    // The flank band is `hillShare` of the land and it is deliberately *wide*:
    // at 0.20 it barely reached past the ranges, so hills were foothills and
    // almost nothing else, and the composite hexes a player reads as variety —
    // a wooded ridge, a jungle-clad slope — were a rounding error. Widening it
    // spends the extra band furthest from the crests, which is where the
    // standalone chains are, and the composites follow.
    //
    // The figures below are counts per standard map. At `hillShare` 0.20, over
    // this sweep: 322 hills, of which 205 stood clear of any mountain, 51
    // hill-and-forest and 9 hill-and-jungle. At 0.28: 451, 296, 65 and 12. At
    // the ratified **0.38 with `mountainShare` 0.10**: 612, 320, 93 and 19.
    //
    // The standalone *share* fell from 0.66 to 0.52 across that last step, and
    // the floor moves with it — because the thing that changed is the other
    // number. Doubling the mountain share doubles the ground that has a mountain
    // next to it, so a larger slice of a wider hill band is a foothill by
    // definition. The count of standalone hills went *up* by half (205 → 320),
    // which is what the claim is actually about: "most hills are not foothills"
    // is still true, and there are far more of both.
    //
    // The floor moved 0.48 → 0.45 on 2026-09-03 for exactly the same reason one
    // step further: `elevation.ridgeBreakStrength` breaks the ranges into
    // scattered massifs, and the *same* count of mountain hexes spread over more
    // separate places touches more ground. The pooled standalone share went
    // 0.535 → 0.501 and the unluckiest seed 0.491 → 0.464.
    //
    // And back to 0.48 later the same day, when `mountainShare` went 0.10 → 0.08
    // (the user's own number): a fifth fewer mountain hexes touch a fifth less
    // ground however they are arranged, so the pooled share recovered to 0.561
    // and the unluckiest seed to 0.532 — better than either reading before the
    // scatter. Hills per map are 677 and were never the thing moving; the
    // mountain cut is a quantile, so what changes is which hexes, not how many.
    let jungleTotal = 0;
    for (const seed of SEEDS) {
      const map = mapFor(seed, 'standard');
      let hills = 0;
      let standalone = 0;
      let wooded = 0;
      let tropical = 0;
      for (const tile of map.tiles) {
        if (!tile.hills) continue;
        hills += 1;
        if (!tileNeighbors(map, tile).some((near) => near.terrain === 'mountain')) standalone += 1;
        if (tile.feature === 'forest') wooded += 1;
        if (tile.feature === 'jungle') tropical += 1;
      }
      jungleTotal += tropical;
      const where = `${seed}`;
      // Most hills are not foothills. That is the sentence "sporadic hills"
      // means, and it is the one the widening was for.
      expect(`${where}: ${standalone} of ${hills} standalone`).toBe(
        `${where}: ${Math.max(standalone, Math.ceil(hills * 0.48))} of ${hills} standalone`,
      );
      expect(`${where}: ${wooded} hill+forest`).toBe(`${where}: ${Math.max(wooded, 30)} hill+forest`);
    }
    // Jungle is measured over the sweep rather than per seed, and deliberately.
    // It grows only inside a band thirteen rows deep and only where the regional
    // moisture layer put a wet region *in* that band, so a seed whose wet country
    // missed the equator has almost no jungle at all and none of it on a hill —
    // seed 2024 has zero, and that is a climate rather than a fault. What has to
    // hold is that the world type exists in numbers: a jungle-clad slope is a
    // hex a player meets, not one they hear about.
    const perMap = jungleTotal / SEEDS.length;
    expect(`hill+jungle ${perMap.toFixed(1)} per map`).toBe(
      `hill+jungle ${Math.max(perMap, 8).toFixed(1)} per map`,
    );
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
        const { map, rivers } = detailFor(seed, size);
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
});

describe('the broken ridges', () => {
  const RIDGE_SEEDS = [1, 2, 3, 7, 11, 42, 99, 777, 1234, 2024, 2468, 31337];

  /**
   * A map's mountains, read as *shape*: how many separate massifs there are, how
   * big the biggest is, and the longest unbroken run along any of the three hex
   * axes. Straight runs are counted from a hex whose predecessor along that axis
   * is not mountain, so each run is counted once.
   */
  function massifs(map: ReturnType<typeof generateMap>) {
    const isMountain = (index: number): boolean => map.tiles[index]!.terrain === 'mountain';
    let mountains = 0;
    for (let i = 0; i < map.tiles.length; i++) if (isMountain(i)) mountains += 1;

    const seen = new Uint8Array(map.tiles.length);
    let components = 0;
    let largest = 0;
    for (let i = 0; i < map.tiles.length; i++) {
      if (!isMountain(i) || seen[i]) continue;
      seen[i] = 1;
      const queue = [i];
      for (let head = 0; head < queue.length; head++) {
        for (const near of tileNeighbors(map, map.tiles[queue[head]!]!)) {
          const index = tileIndex(map, near.col, near.row);
          if (seen[index] || !isMountain(index)) continue;
          seen[index] = 1;
          queue.push(index);
        }
      }
      components += 1;
      largest = Math.max(largest, queue.length);
    }

    let longestRun = 0;
    for (let axis = 0; axis < 3; axis++) {
      const ahead = HEX_DIRECTIONS[axis]!;
      const behind = HEX_DIRECTIONS[axis + 3]!;
      for (const tile of map.tiles) {
        if (tile.terrain !== 'mountain') continue;
        const hex = tileHex(tile);
        const before = getTile(map, { q: hex.q + behind.q, r: hex.r + behind.r });
        if (before?.terrain === 'mountain') continue;
        let run = 0;
        let at: ReturnType<typeof getTile> = tile;
        while (at && at.terrain === 'mountain') {
          run += 1;
          const here = tileHex(at);
          at = getTile(map, { q: here.q + ahead.q, r: here.r + ahead.r });
        }
        longestRun = Math.max(longestRun, run);
      }
    }
    return { mountains, components, largest, longestRun };
  }

  it('scatters the ranges without culling a single mountain', () => {
    // Ruled 2026-09-03: "break up continuous lines of mountains a bit and have
    // them be slightly more scattered". `elevation.ridgeBreakStrength` multiplies
    // the crest before the relief mix is *ranked*, and that is the whole reason
    // this is a scatter rather than a cull — `mountainShare` is a quantile of the
    // land, so the same hexes-worth of mountain is dealt either way and all the
    // break decides is which hexes. The equality below is exact, not a band.
    //
    // Measured over a twenty-seed sweep on a standard board, whole → broken:
    // 143 → 143 mountains a map, 23.9 → 57.4 separate massifs, 6.37 → 2.52 hexes
    // in the average one, the largest 40 → 15, and the longest straight run
    // 6.8 → 5.3 on average and 11 → 8 at worst. (The counts fell from 179 with
    // `mountainShare` 0.10 → 0.08 later the same day; the *shape* readings are
    // the break's, and it is the ratios below that this test holds.)
    //
    // Round two of the ruling (2026-09-03, "still too many unbroken chains")
    // pushed `ridgeBreakStrength` to its ceiling of 1 and tightened the break
    // field to `cycleTiles: 3` at three octaves, roughly halving the average
    // massif and the longest run again from the 3.8 and 8 the first cut shipped.
    // A side effect worth the note: the continent got *more* walkable, not less.
    // The largest connected component of passable land on the mainland went from
    // 98.5% of it to 99.7% on average and from 89.6% to 96.1% on the worst seed —
    // a wall of mountain encloses pockets, a chain of massifs has passes.
    const total = { components: 0, largest: 0, longestRun: 0 };
    const was = { components: 0, largest: 0, longestRun: 0 };
    for (const seed of RIDGE_SEEDS) {
      const broken = massifs(mapFor(seed, 'standard'));
      const whole = massifs(mapFor(seed, 'standard', { elevation: { ridgeBreakStrength: 0 } }));

      // Per seed, and exactly: the scatter deals the same amount of mountain.
      expect(`${seed}: ${broken.mountains} mountains`).toBe(`${seed}: ${whole.mountains} mountains`);
      // Per seed, more pieces than the wall it came out of.
      expect(`${seed}: ${broken.components} massifs`).toBe(
        `${seed}: ${Math.max(broken.components, whole.components + 1)} massifs`,
      );
      total.components += broken.components;
      total.largest += broken.largest;
      total.longestRun += broken.longestRun;
      was.components += whole.components;
      was.largest += whole.largest;
      was.longestRun += whole.longestRun;
    }
    // The size of the effect, over the sweep rather than inside it. Half again
    // as many massifs, each of them smaller — and the second half is why these
    // two readings are pooled: the hexes a saddle gives up surface *somewhere*,
    // and on one seed in twelve the somewhere happens to be a line one hex
    // longer than the longest one broken (seed 2, 6 → 7). What must not happen
    // is the walls getting longer on the whole, and they do not.
    const ratio = total.components / was.components;
    expect(`massifs ×${ratio.toFixed(2)}`).toBe(`massifs ×${Math.max(ratio, 1.4).toFixed(2)}`);
    const shrunk = total.largest / was.largest;
    expect(`largest massif ×${shrunk.toFixed(2)}`).toBe(
      `largest massif ×${Math.min(shrunk, 0.85).toFixed(2)}`,
    );
    expect(`longest run ${(total.longestRun / RIDGE_SEEDS.length).toFixed(1)}`).toBe(
      `longest run ${(Math.min(total.longestRun, was.longestRun) / RIDGE_SEEDS.length).toFixed(1)}`,
    );
  });
});

describe('the moisture field', () => {
  const SEEDS = [1, 2, 3, 7, 11, 42, 99, 777, 1234, 2024, 2468, 31337];

  it('holds the forest and jungle shares within their bands', () => {
    // Bands rather than the near-equalities the relief cuts get, because a
    // feature share is a share of its *eligible* ground and how much ground is
    // eligible moves with the seed's climate. What the numbers below are is the
    // design target, measured: forest 11–19% of land (down from 24% before the
    // rework, which is the "forests blanket continents" complaint), jungle
    // 7–20% of the equatorial band.
    //
    // The jungle ceiling rose from 0.17 to 0.21 with `moisture.jungleShare`
    // 0.15 → 0.20. The two numbers are not the same measurement and never have
    // been — the tunable is a share of the band's *eligible* ground (grassland
    // and plains inside `latitude.jungleMax`) and this is a share of the whole
    // band, mountains, desert and sea-adjacent tundra included — so a third more
    // jungle moves the measured top of the range from 0.17 to 0.20, and the
    // ceiling is set a point clear of that rather than on it.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SEEDS) {
        const map = mapFor(seed, size);
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
          `${where} jungle ${Math.min(Math.max(jungleShare, 0.03), 0.21).toFixed(3)}`,
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
        const map = mapFor(seed, size);
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
      const map = mapFor(seed, 'standard');
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
      //
      // The bound went 0.90 → 0.92 when the pangaea gathered the land into one
      // continent — far more of it stands inland with some range upwind, so the
      // lee set grows towards the whole map and the open set shrinks towards the
      // coastal fringe, and two sets that overlap that much cannot differ as
      // sharply. Breaking the ranges (`elevation.ridgeBreakStrength`, the same
      // day) hands it straight back: a gapped range shelters a *narrower* strip,
      // so the lee set is a real lee again. Over this sweep the ratios now run
      // 0.65-0.87 and the original 0.90 stands.
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
