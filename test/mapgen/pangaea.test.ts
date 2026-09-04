/**
 * The pangaea: one continent, islands off its shelf, every seat on the mainland.
 *
 * The ruling of 2026-09-03 (`docs/flags.md`, "Batch: mapgen pangaea"), asserted
 * as the three sentences it is made of. Every claim here is *topological* — read
 * off connected components of the finished map — rather than off any number the
 * generator wrote down, because "one continent" and "reachable by coast" are
 * facts about a graph and nothing else can check them.
 *
 * Three seeds here; the sweep over seeds and sizes is `pangaea.slow.test.ts`,
 * because a seed sweep is slow by kind.
 */
import { describe, expect, it } from 'vitest';

import { MAPGEN_CONFIG, generateMap, islandShelfLift, pangaeaPull } from '../../src/sim/mapgen';
import { createMap, tileIndex } from '../../src/sim/map';
import {
  chooseStartPositions,
  isHomeLandmass,
  landmassFacts,
  scoreStartSite,
} from '../../src/sim/startPositions';
import { mapFor } from './fixtures';
import {
  landmassesOf,
  shelfReachableFromMainland,
  startsAwayFromHome,
  strandedLandTiles,
} from './pangaeaHelpers';

const SEEDS = [23, 1234, 31337];

/**
 * A seed whose archipelago is genuinely out of reach of two rings of coast.
 *
 * Most seeds do not need the chains at all, and that is the belt's doing rather
 * than luck: `islandShelfTiles` puts the islands five hexes out, and two rings
 * of `coast` reach four of those from either side. The chains are the guarantee
 * for the rest — on this seed twenty-one hexes of land would otherwise sit
 * across open ocean.
 */
const STRANDED_SEED = 23;

describe('the pangaea mask', () => {
  it('sinks the rims and leaves the core alone', () => {
    // The mask as a field, which is the only place its shape is legible: a flat
    // core, a shoulder that rises to the map's eastern and western edges, and
    // nothing at all when the feature is switched off.
    const map = createMap({ width: 80, height: 52, seed: 1, sizeName: 'standard' });
    const config = MAPGEN_CONFIG.pangaea;
    const pull = pangaeaPull(map, config);
    const at = (col: number, row: number): number => pull[row * map.width + col]!;

    // The meridian at the equator is the one hex the mask never touches.
    expect(at(40, 26)).toBeCloseTo(0, 10);
    // A shoulder rises monotonically away from it, all the way to the seam.
    let previous = -Infinity;
    for (let col = 40; col <= 79; col++) {
      const here = at(col, 26);
      expect(here).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = here;
    }
    // …and symmetrically the other way, because the distance is wrap-aware.
    for (let step = 1; step <= 39; step++) {
      expect(at(40 + step, 26)).toBeCloseTo(at(40 - step, 26), 10);
    }
    // The poles are pulled down too, but far less than the rims: a continent
    // that reaches the caps is what keeps tundra and snow on the map.
    expect(at(40, 0)).toBeGreaterThan(0);
    expect(at(40, 0)).toBeLessThan(at(79, 26));

    expect(Array.from(pangaeaPull(map, { ...config, enabled: false }))).toEqual(
      new Array(map.tiles.length).fill(0),
    );
  });

  it('lifts a belt of water offshore, and no land at all', () => {
    // The islands are read off the coastline the shoulders drew, so the lift is
    // a function of how far out to sea a hex is — never of where it is.
    const map = createMap({ width: 20, height: 9, seed: 1, sizeName: 'duel' });
    const land = new Uint8Array(map.tiles.length);
    for (let row = 0; row < 9; row++) for (let col = 0; col < 3; col++) land[row * 20 + col] = 1;
    const config = MAPGEN_CONFIG.pangaea;
    const lift = islandShelfLift(map, land, config);

    for (let i = 0; i < land.length; i++) if (land[i]) expect(lift[i]).toBe(0);
    // Peak at exactly `islandShelfTiles` hexes out, falling away either side.
    const row = 4;
    const out = (hexes: number): number => lift[row * 20 + 2 + hexes]!;
    expect(out(config.islandShelfTiles)).toBeCloseTo(config.islandShelfLift, 10);
    expect(out(config.islandShelfTiles)).toBeGreaterThan(out(config.islandShelfTiles + 3));
    expect(out(config.islandShelfTiles)).toBeGreaterThan(out(1));

    expect(Array.from(islandShelfLift(map, land, { ...config, islandShelfLift: 0 }))).toEqual(
      new Array(map.tiles.length).fill(0),
    );
  });

  it('leaves the water fraction exactly where sea level put it', () => {
    // The mask is applied to a *ranked* field and the field is ranked again, so
    // what it moves is where the water is and never how much there is. Measured
    // against the same map with the mask switched off: within a hex or two,
    // whatever the ice caps happen to round to.
    for (const seed of SEEDS) {
      const shaped = mapFor(seed, 'standard');
      const flat = mapFor(seed, 'standard', { pangaea: { enabled: false } });
      // Not to the hex: the ice-cap bonus is applied *after* the mask, so a
      // polar tile the re-rank moved across the cut is added or lost at the
      // margin. Measured over twenty seeds and every size the drift tops out at
      // 1.4% of the map (on duel, where one hex is worth the most), so 1.5% is
      // the honest bound — against a mask that decides where 43% of the map's
      // land goes.
      const share = (map: typeof shaped): number => landmassesOf(map).land / map.tiles.length;
      expect(`${seed}: land within 1.5%`).toBe(
        Math.abs(share(shaped) - share(flat)) <= 0.015
          ? `${seed}: land within 1.5%`
          : `${seed}: land moved to ${(share(shaped) * 100).toFixed(1)}% from ${(share(flat) * 100).toFixed(1)}%`,
      );
    }
  });
});

describe('one continent, islands off it', () => {
  it('gathers most of the land into a single continent', () => {
    for (const seed of SEEDS) {
      const map = mapFor(seed, 'standard');
      const { mainlandTiles, land } = landmassesOf(map);
      // The floor is 75% rather than the ~95% of the first cut, and the gap is
      // the belt retune of 2026-09-03 paying for bigger islands out of the
      // mainland's own margins: the land fraction is fixed by `seaLevel`, so
      // every hex an island gains is a hex the continent gives up.
      expect(`${seed}: mainland ${((mainlandTiles / land) * 100).toFixed(0)}%`).toBe(
        `${seed}: mainland ${Math.max(75, Math.round((mainlandTiles / land) * 100))}%`,
      );
    }
  });

  it('spawns islands worth sailing to', () => {
    // "Medium sized islands", read as: a landmass a city could actually be
    // planted on, and more than one of them.
    for (const seed of SEEDS) {
      const { islands } = landmassesOf(mapFor(seed, 'standard'));
      const worth = islands.filter((tiles) => tiles >= 6);
      expect(`${seed}: ${worth.length} islands of six hexes or more`).toBe(
        `${seed}: ${Math.max(worth.length, 4)} islands of six hexes or more`,
      );
      // …and at least one big enough to be a country of its own. The belt
      // retune's whole point (2026-09-03: "islands bigger and more frequent").
      expect(`${seed}: biggest island ${worth[0] ?? 0}`).toBe(
        `${seed}: biggest island ${Math.max(worth[0] ?? 0, 20)}`,
      );
    }
  });

  it('leaves no land the mainland shelf cannot reach', () => {
    // The ruling's own words: reachable by coast. A hull that never leaves the
    // shelf can walk from the mainland to every hex of land on the map.
    for (const seed of SEEDS) {
      expect(`${seed}: ${strandedLandTiles(mapFor(seed, 'standard'))} stranded`).toBe(
        `${seed}: 0 stranded`,
      );
    }
  });

  it('strands islands when the chains are switched off, which is what they fix', () => {
    // The other half of the same claim, and the reason `chainIslandShelves` is
    // a pass rather than a hope: two rings of coast join what is near, and the
    // rest of the archipelago is out there on its own.
    const bare = mapFor(STRANDED_SEED, 'standard', { pangaea: { shelfChains: false } });
    expect(strandedLandTiles(bare)).toBeGreaterThan(0);
    expect(strandedLandTiles(mapFor(STRANDED_SEED, 'standard'))).toBe(0);
  });

  it('pays for the chains in shelf and never in land', () => {
    // A land bridge would move the land fraction and every budget counted per
    // land tile with it. A shelf costs the map nothing but shallow water.
    for (const seed of [STRANDED_SEED]) {
      const chained = mapFor(seed, 'standard');
      const bare = mapFor(seed, 'standard', { pangaea: { shelfChains: false } });
      const count = (map: typeof chained, terrain: string): number =>
        map.tiles.filter((tile) => tile.terrain === terrain).length;
      for (const terrain of ['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'lake']) {
        expect(`${seed}/${terrain}: ${count(chained, terrain)}`).toBe(
          `${seed}/${terrain}: ${count(bare, terrain)}`,
        );
      }
      // Only ocean becomes coast, and never the other way about.
      expect(count(chained, 'coast')).toBeGreaterThan(count(bare, 'coast'));
      expect(count(chained, 'coast') + count(chained, 'ocean')).toBe(
        count(bare, 'coast') + count(bare, 'ocean'),
      );
    }
  });
});

describe('the landmass floor on a start', () => {
  it('seats every player somewhere they can live', () => {
    // Four seats on a standard board — the 4-player playtest the ruling was
    // written for. The rule is the mainland **or** a landmass of at least
    // `minLandmassTiles` (ruled 2026-09-03): a strait-split pangaea's far lobe
    // is a country, a thirty-hex island is not. The sweep over sizes and rosters
    // is the slow tier's.
    for (const seed of SEEDS) {
      const map = mapFor(seed, 'standard');
      const away = startsAwayFromHome(map, chooseStartPositions(map, 4));
      expect(`${seed}: ${away.length} seated away from home`).toBe(
        `${seed}: 0 seated away from home`,
      );
    }
  });

  it('reads the mainland and the tile floor as an or, not as two rules', () => {
    // The predicate itself, on numbers rather than on a map — the one place the
    // shape of the rule is legible.
    const starts = MAPGEN_CONFIG.starts;
    const facts = { size: new Int32Array(0), largest: 1000 };
    expect(isHomeLandmass(1000, facts, starts)).toBe(true); // the mainland
    expect(isHomeLandmass(starts.minLandmassTiles, facts, starts)).toBe(true); // big enough
    expect(isHomeLandmass(starts.minLandmassTiles - 1, facts, starts)).toBe(false);
    expect(isHomeLandmass(0, facts, starts)).toBe(false); // water
    // Either half switched off leaves the other one deciding, and both off
    // stops the refusal happening at all.
    expect(isHomeLandmass(30, facts, { ...starts, minLandmassTiles: 20 })).toBe(true);
    expect(isHomeLandmass(30, facts, { ...starts, minLandmassShare: 0 })).toBe(false);
    expect(isHomeLandmass(30, facts, { ...starts, minLandmassShare: 0, minLandmassTiles: 0 })).toBe(
      false,
    );
  });

  it('refuses an island site for the island and nothing else', () => {
    // The refusal names itself, and it names the *landmass* — so a site that is
    // otherwise perfect is still refused, and the reason a reader is given is
    // the true one.
    const map = mapFor(1234, 'standard');
    const facts = landmassFacts(map);
    let refused = 0;
    for (const tile of map.tiles) {
      const size = facts.size[tileIndex(map, tile.col, tile.row)]!;
      if (size === 0 || isHomeLandmass(size, facts, MAPGEN_CONFIG.starts)) continue;
      refused += 1;
      expect(scoreStartSite(map, tile, undefined, facts).reject).toBe('landmass is too small');
    }
    expect(refused).toBeGreaterThan(0);
    expect(facts.largest).toBeGreaterThan(0);
  });

  it('is a data edit: a floor of zero seats players wherever the ground is best', () => {
    // The knob does what it says, which is the whole of why it is a knob. With
    // both halves of the refusal switched off the sweep is free to take an
    // island site again.
    const sheet = { starts: { minLandmassShare: 0, minLandmassTiles: 0 } };
    const map = generateMap(1234, 'standard', sheet);
    expect(chooseStartPositions(map, 12).length).toBe(12);
    expect(shelfReachableFromMainland(map).length).toBe(map.tiles.length);
  });
});
