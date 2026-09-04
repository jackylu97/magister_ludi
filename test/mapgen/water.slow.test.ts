/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the water
 * passes, swept.
 *
 * Everything here is asked of **generated** maps, and of several of them. The
 * river quota is asserted on every map size, the giant board included, and that
 * is the point of it rather than an accident: springs have to stand on range
 * ground, so the spring budget has to scale with the quota it serves, and a flat
 * cap is only visible on the boards big enough to hit it. The rest are seed
 * sweeps — four seeds across two sizes — walking every hex or every river
 * vertex, which is tens of thousands of assertions apiece on top of the maps
 * they generate.
 *
 * Everything a hand-built eight-by-six map can answer stays in `water.test.ts`,
 * and that is most of the concern: what an edge flag is, what a lake is, what a
 * water body is, what a corner is, how a river traces down a slope and what it
 * does on a plateau, how the quota scales, and what fresh water reaches. It also
 * keeps the generated-map readings that cost one map — that lakes stay inside
 * their configured size, that springs are spaced, and that the river pass leaves
 * the terrain it runs over alone.
 */
import { describe, expect, it } from 'vitest';

import { tileIndex, tileNeighbors } from '../../src/sim/map';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES, generateMap } from '../../src/sim/mapgen';
import { detailFor, mapFor } from './fixtures';
import { isFreshwaterTerrain, isWaterTerrain } from '../../src/sim/terrainData';
import {
  DIRECTION_COUNT,
  hasFreshWater,
  hasRiverEdge,
  neighborInDirection,
  oppositeDirection,
  riverCountFor,
  vertexAltitude,
} from '../../src/sim/water';

describe('lake classification', () => {
  it('is only ocean, never lake, that becomes coast on a generated map', () => {
    // `coast.rings` widened this from a plain adjacency check to a reachability
    // one (2026-08-29): a coast tile no longer has to touch land itself, only
    // to lie within `coast.rings` hex steps of it across open water — but a
    // lake is still never that water, at any ring width, because a lake is by
    // definition a water body with no ocean in it (see `water.ts`'s docblock).
    //
    // The pangaea ruling (2026-09-03) split the claim once more. `coast.rings`
    // is still the whole of what **pass 3** does, and that is what the strict
    // half below asserts, with the shelf chains switched off. Pass 3b then runs
    // ribbons of shelf out to the islands (`chainIslandShelves`), and those
    // ribbons are coast that is deliberately further from land than any ring —
    // so on the shipped map the surviving reading is the other one: a coast tile
    // is still *reachable* from land through non-lake water, and still never
    // stands beside a lake. Which tiles those ribbons are, and that they join
    // every island to the mainland, is `pangaea.slow.test.ts`'s subject.
    for (const seed of [1, 7, 31337, 2024]) {
      for (const chains of [false, true]) {
        const map = mapFor(seed, 'standard', { pangaea: { shelfChains: chains } });
        const distance = new Int32Array(map.tiles.length).fill(-1);
        let frontier: typeof map.tiles = [];
        for (const tile of map.tiles) {
          if (isWaterTerrain(tile.terrain)) continue;
          for (const n of tileNeighbors(map, tile)) {
            if (!isWaterTerrain(n.terrain) || n.terrain === 'lake') continue;
            const idx = tileIndex(map, n.col, n.row);
            if (distance[idx] !== -1) continue;
            distance[idx] = 1;
            frontier.push(n);
          }
        }
        for (let d = 2; frontier.length > 0; d++) {
          const next: typeof map.tiles = [];
          for (const tile of frontier) {
            for (const n of tileNeighbors(map, tile)) {
              if (!isWaterTerrain(n.terrain) || n.terrain === 'lake') continue;
              const idx = tileIndex(map, n.col, n.row);
              if (distance[idx] !== -1) continue;
              distance[idx] = d;
              next.push(n);
            }
          }
          frontier = next;
        }
        for (const tile of map.tiles) {
          if (tile.terrain !== 'coast') continue;
          // A lake tile next to it would mean the lake minted a shelf.
          expect(tileNeighbors(map, tile).every((n) => n.terrain !== 'lake')).toBe(true);
          const d = distance[tileIndex(map, tile.col, tile.row)]!;
          expect(d).not.toBe(-1);
          if (!chains) expect(d).toBeLessThanOrEqual(MAPGEN_CONFIG.coast.rings);
        }
      }
    }
  });
});

describe('river tracing', () => {
  it('never runs uphill, and reports its altitudes non-increasing', () => {
    for (const size of ['duel', 'standard']) {
      for (const seed of [1, 7, 1234]) {
        const { map, rivers } = detailFor(seed, size);
        for (const river of rivers) {
          let previous = Infinity;
          for (const vertex of river.vertices) {
            const altitude = vertexAltitude(map, vertex)!;
            expect(altitude).not.toBeNull();
            expect(altitude).toBeLessThanOrEqual(previous);
            previous = altitude;
          }
        }
      }
    }
  });

});

describe('rivers on generated maps', () => {
  const sizes = ['duel', 'standard'] as const;
  const seeds = [1, 7, 1234, 31337];

  it('keeps every edge flag mirrored on both tiles', () => {
    for (const size of sizes) {
      for (const seed of seeds) {
        const map = mapFor(seed, size);
        for (const tile of map.tiles) {
          for (let d = 0; d < DIRECTION_COUNT; d++) {
            if (!hasRiverEdge(tile, d)) continue;
            const neighbor = neighborInDirection(map, tile, d);
            expect(neighbor).toBeDefined();
            expect(hasRiverEdge(neighbor!, oppositeDirection(d))).toBe(true);
          }
        }
      }
    }
  });

  it('runs every river edge between two land tiles', () => {
    for (const seed of seeds) {
      const map = mapFor(seed, 'standard');
      for (const tile of map.tiles) {
        if (tile.riverEdges === 0) continue;
        expect(isWaterTerrain(tile.terrain)).toBe(false);
        for (let d = 0; d < DIRECTION_COUNT; d++) {
          if (!hasRiverEdge(tile, d)) continue;
          expect(isWaterTerrain(neighborInDirection(map, tile, d)!.terrain)).toBe(false);
        }
      }
    }
  });

  it('ends every river at water or at another river, and keeps none too short', () => {
    for (const size of sizes) {
      for (const seed of seeds) {
        const { rivers } = detailFor(seed, size);
        expect(rivers.length).toBeGreaterThan(0);
        for (const river of rivers) {
          expect(['water', 'river']).toContain(river.ending);
          expect(river.edges.length).toBeGreaterThanOrEqual(MAPGEN_CONFIG.rivers.minLength);
          expect(river.edges.length).toBeLessThanOrEqual(MAPGEN_CONFIG.rivers.maxLength);
        }
      }
    }
  });

  // `generateMap` rather than `./fixtures`' memo table, here and in the terrain
  // test below: both compare two generations of one seed, and a cache would
  // hand back the same object twice and make the comparison vacuous.
  it('is deterministic in the seed, and different seeds differ', () => {
    const masks = (seed: number, size: string): number[] =>
      generateMap(seed, size).tiles.map((t) => t.riverEdges);
    expect(masks(4242, 'duel')).toEqual(masks(4242, 'duel'));
    expect(masks(4242, 'standard')).toEqual(masks(4242, 'standard'));
    expect(masks(1, 'duel')).not.toEqual(masks(2, 'duel'));
  });


  it('meets its river quota on the sizes whose interior can drain', () => {
    // Every size, the biggest boards included, and that is the point of the
    // sweep rather than an accident of it. Springs have to stand on range
    // ground — a fifth of the land, gathered into lines — so the budget of
    // springs to examine has to scale with the quota it serves. Under the flat
    // cap this replaced, a giant map reached about seven of every ten rivers it
    // asked for and a huge map nine; `attemptsPerRiver` is the fix and this is
    // the test that would notice it being reverted.
    // The quota is a **ceiling**, and the pangaea ruling (2026-09-03) is what
    // made the distinction matter. A trace has to run downhill from its spring
    // to the sea without one step back up, so how far a spring stands from open
    // water is the whole of whether it can become a river. When the land was a
    // scatter of continents nothing was more than a dozen hexes from a coast and
    // the quota was always seated; one continent has an interior, and an
    // interior has interior drainage — a basin the corner field cannot walk out
    // of.
    //
    // Breaking the mountain ranges (`elevation.ridgeBreakStrength`, ruled the
    // same day) bought most of it back, and for a reason worth writing down: a
    // continuous wall of mountain is a watershed a trace cannot cross, so the
    // interior it encloses drains nowhere. Gap the wall and the same interior has
    // saddles to leave by. Measured over a twenty-seed sweep the floors went
    // duel 0.86 → 0.86, standard 0.97 → **1.00**, large 0.67 → 0.89,
    // huge 0.42 → 0.69, giant 0.50 → 0.83 of the quota asked for.
    //
    // Re-measured for round two of the same ruling (2026-09-03), which moved two
    // things under this reading and one to compensate. Pushing the break to its
    // ceiling flattens the crests, and raising `seaLevel` to 0.58 stretches the
    // land's elevation band — and `minSpringElevation` is an *absolute* altitude,
    // so both make the same threshold a scarcer quantile of the land. Following
    // it down 0.84 → 0.80 (the hill cut) put the floors back at duel 0.71,
    // standard **0.98**, large 0.81, huge 0.63, giant 0.68. Duel is the one that
    // did not fully recover: 386 land tiles is not much watershed.
    //
    // The claim still splits by size, because the interior is still an interior.
    // `standard` is the size the balance is tuned against and seats the whole
    // quota; the bigger boards seat a documented share of theirs, and the number
    // that matters there is that the share does not collapse. `attemptsPerRiver`
    // is still the tunable this test would notice being reverted — at the old
    // flat cap every one of these floors halves.
    const floor: Record<string, number> = {
      duel: 0.65,
      standard: 0.9,
      large: 0.75,
      huge: 0.55,
      giant: 0.6,
    };
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of seeds) {
        const { map, rivers } = detailFor(seed, size);
        const wanted = riverCountFor(MAPGEN_CONFIG.rivers, map.width, map.height);
        const least = Math.ceil(wanted * floor[size]!);
        expect(`${size}/${seed}: ${rivers.length} of ${wanted}`).toBe(
          `${size}/${seed}: ${Math.max(rivers.length, least)} of ${wanted}`,
        );
      }
    }
  }, 60_000);
});

describe('fresh water', () => {
  it('matches its definition exactly on generated maps', () => {
    // The definition restated rather than imported, which is the whole value of
    // this test: it is the one place the rule is written down twice, so a clause
    // added to `computeFreshwater` and not to the design has to be typed out
    // here before it can pass. The **oasis** clauses are the second entry in
    // that ledger — a pool waters the hex it stands on as well as its six
    // neighbours, which no other source here does.
    for (const size of ['duel', 'standard'] as const) {
      for (const seed of [1, 7, 1234, 31337]) {
        const map = mapFor(seed, size);
        let fresh = 0;
        for (const tile of map.tiles) {
          const expected =
            !isWaterTerrain(tile.terrain) &&
            (tile.riverEdges !== 0 ||
              tile.feature === 'oasis' ||
              tileNeighbors(map, tile).some(
                (n) => isFreshwaterTerrain(n.terrain) || n.feature === 'oasis',
              ));
          expect(hasFreshWater(tile)).toBe(expected);
          if (expected) fresh++;
        }
        // Rivers alone guarantee some; a map with none would mean the pass
        // silently did nothing.
        expect(fresh).toBeGreaterThan(0);
      }
    }
  });

});
