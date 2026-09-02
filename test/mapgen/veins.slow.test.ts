import { describe, expect, it } from 'vitest';

import { generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { veinCells, veinGroundCells } from '../../src/sim/veins';

/**
 * The vein layer's *density*, which is a sweep over seeds and sizes and
 * therefore lives here rather than beside the rules (see `veins.test.ts` for the
 * other three claims).
 *
 * What is asserted is the **designer's number**: a survey pays about one time in
 * three, and the three kinds run in ascending rarity. Both are read off whole
 * generated boards rather than off `data/mapgen.json`, because the share is a
 * share of *eligible hills* and the table cannot say how many of those a seed
 * will produce.
 */

const VEINS = MAPGEN_CONFIG.veins;
const SEEDS = [1, 2, 3, 11, 27];

describe('how much is buried', () => {
  it('hits about the share the sheet asks for, across seeds and sizes', () => {
    for (const size of ['duel', 'standard']) {
      let ground = 0;
      let seeded = 0;
      for (const seed of SEEDS) {
        const map = generateMap(seed, size);
        ground += veinGroundCells(map).length;
        seeded += veinCells(map).length;
      }
      expect(ground, size).toBeGreaterThan(0);
      const rate = seeded / ground;
      // A **band**, not a figure, and it is two-sided for two different reasons.
      // Below: a hill whose terrain and feature no vein row fits spends its roll
      // on nothing (`placeVeins`, and why the roll is spent anyway), so the
      // realised rate sits at or a little under the share — far under means the
      // rows have stopped covering the hills. Above: a few hundred hills is a
      // small sample and a share is not a quota, so the tolerance is symmetric
      // rather than a ceiling the sampling noise would eventually clip.
      expect(rate, `${size}: ${rate.toFixed(3)}`).toBeGreaterThan(VEINS.share - 0.1);
      expect(rate, `${size}: ${rate.toFixed(3)}`).toBeLessThan(VEINS.share + 0.05);
    }
  });

  it('leans common, and the deep luxuries stay rare', () => {
    // The sheet's ascending rarity read off the board rather than off the table:
    // ore is the bulk of what a province turns up, a strategic seam is the
    // insurance, and a buried luxury is the thing worth telling somebody about.
    const counts = new Map<string, number>();
    for (const seed of SEEDS) {
      for (const cell of veinCells(generateMap(seed, 'standard'))) {
        counts.set(cell.resource, (counts.get(cell.resource) ?? 0) + 1);
      }
    }
    const ore = counts.get('richOre') ?? 0;
    const iron = counts.get('iron') ?? 0;
    const luxuries = ['gems', 'silver', 'gold'].reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
    expect(ore).toBeGreaterThan(iron);
    expect(iron).toBeGreaterThan(luxuries);
    expect(luxuries).toBeGreaterThan(0);
  });

  it('never scatters a buried row on the surface, on any seed', () => {
    // The `buried` marker doing its one job over whole maps. If this fails, the
    // surface of every map in the game has moved — which is the failure the
    // marker exists to make impossible rather than unlikely.
    const buried = RESOURCE_IDS.filter((id) => resourceDef(id).buried === true);
    for (const seed of SEEDS) {
      const map = generateMap(seed, 'standard');
      for (const tile of map.tiles) {
        if (tile.resource === undefined) continue;
        expect(buried, `${seed}: ${tile.col},${tile.row}`).not.toContain(tile.resource);
      }
    }
  });
});
