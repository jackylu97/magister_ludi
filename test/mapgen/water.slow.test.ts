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

import { tileNeighbors } from '../../src/sim/map';
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
    for (const seed of [1, 7, 31337, 2024]) {
      const map = mapFor(seed, 'standard');
      for (const tile of map.tiles) {
        if (tile.terrain !== 'coast') continue;
        // A coast tile must touch land *and* be reachable from the open sea; a
        // lake tile next to it would mean the lake minted a shelf.
        expect(tileNeighbors(map, tile).some((n) => !isWaterTerrain(n.terrain))).toBe(true);
        expect(tileNeighbors(map, tile).every((n) => n.terrain !== 'lake')).toBe(true);
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


  it('meets its river quota on every size and seed', () => {
    // Every size, the biggest boards included, and that is the point of the
    // sweep rather than an accident of it. Springs have to stand on range
    // ground — a fifth of the land, gathered into lines — so the budget of
    // springs to examine has to scale with the quota it serves. Under the flat
    // cap this replaced, a giant map reached about seven of every ten rivers it
    // asked for and a huge map nine; `attemptsPerRiver` is the fix and this is
    // the test that would notice it being reverted.
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of seeds) {
        const { map, rivers } = detailFor(seed, size);
        const wanted = riverCountFor(MAPGEN_CONFIG.rivers, map.width, map.height);
        expect(`${size}/${seed}: ${rivers.length} of ${wanted}`).toBe(
          `${size}/${seed}: ${wanted} of ${wanted}`,
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
