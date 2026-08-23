import { describe, expect, it } from 'vitest';
import { generateMap, MAPGEN_CONFIG, MAP_SIZE_NAMES } from '../src/sim/mapgen';
import { tileHex, tileIndex, wrappedDistance } from '../src/sim/map';
import {
  chooseStartPositions,
  planStartingUnits,
  scoreStartSite,
  startScore,
  startSpacing,
} from '../src/sim/startPositions';
import { RULES } from '../src/sim/rulesData';
import { type GameConfig, newGame } from '../src/sim/state';
import { moveCost } from '../src/sim/terrainData';
import { unitDef } from '../src/sim/unitData';
import { unitsOnTile } from '../src/sim/units';

function config(players: number, sizeName = 'duel', seed = 4242): GameConfig {
  return {
    seed,
    sizeName,
    players: new Array(players).fill(null).map((_, i) => ({ name: `P${i}`, color: '#fff' })),
  };
}

describe('chooseStartPositions', () => {
  it('places every player on passable land', () => {
    const map = generateMap(4242, 'duel');
    const starts = chooseStartPositions(map, 4);
    expect(starts).toHaveLength(4);
    for (const tile of starts) {
      expect(moveCost(tile.terrain, tile.feature, tile.hills)).not.toBeNull();
    }
  });

  it('is deterministic in the map alone', () => {
    const a = generateMap(77, 'duel');
    const b = generateMap(77, 'duel');
    const first = chooseStartPositions(a, 5).map((t) => tileIndex(a, t.col, t.row));
    const second = chooseStartPositions(a, 5).map((t) => tileIndex(a, t.col, t.row));
    const other = chooseStartPositions(b, 5).map((t) => tileIndex(b, t.col, t.row));
    expect(second).toEqual(first);
    expect(other).toEqual(first);
  });

  it('keeps starts at least minSpacing apart when the map allows it', () => {
    const map = generateMap(4242, 'standard');
    const starts = chooseStartPositions(map, 4);
    for (let i = 0; i < starts.length; i++) {
      for (let j = i + 1; j < starts.length; j++) {
        const distance = wrappedDistance(map, tileHex(starts[i]!), tileHex(starts[j]!));
        expect(distance).toBeGreaterThanOrEqual(startSpacing(map));
      }
    }
  });

  it('never places two players on the same tile, however cramped the map', () => {
    const map = generateMap(9, 'duel');
    const starts = chooseStartPositions(map, RULES.game.maxPlayers);
    const indices = starts.map((t) => tileIndex(map, t.col, t.row));
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('relaxes the spacing rather than seating fewer players', () => {
    // The smallest map with the largest player count: spacing cannot hold.
    const map = generateMap(1, 'duel');
    expect(chooseStartPositions(map, RULES.game.maxPlayers)).toHaveLength(RULES.game.maxPlayers);
  });

  it('asks for nothing and gets nothing', () => {
    const map = generateMap(1, 'duel');
    expect(chooseStartPositions(map, 0)).toEqual([]);
  });

  it('prefers well-scored ground over the surrounding waste', () => {
    const map = generateMap(4242, 'duel');
    const starts = chooseStartPositions(map, 2);
    const scores = map.tiles
      .filter((t) => moveCost(t.terrain, t.feature, t.hills) !== null)
      .map((t) => startScore(map, t));
    const median = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]!;
    for (const start of starts) {
      expect(startScore(map, start)).toBeGreaterThanOrEqual(median);
    }
  });
});

describe('planStartingUnits', () => {
  it('seats the whole roster for every player', () => {
    const map = generateMap(4242, 'standard');
    const starts = chooseStartPositions(map, 3);
    const placements = planStartingUnits(map, starts, RULES.startingUnits);
    expect(placements).toHaveLength(3 * RULES.startingUnits.length);
    expect(placements.map((p) => p.ownerIndex)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('stacks the different categories on the start tile itself', () => {
    const map = generateMap(4242, 'standard');
    const starts = chooseStartPositions(map, 1);
    const placements = planStartingUnits(map, starts, RULES.startingUnits);
    const start = starts[0]!;
    for (const placement of placements) {
      expect({ col: placement.col, row: placement.row }).toEqual({ col: start.col, row: start.row });
    }
  });

  it('spills a same-category unit onto a neighbouring tile', () => {
    const map = generateMap(4242, 'standard');
    const starts = chooseStartPositions(map, 1);
    const placements = planStartingUnits(map, starts, ['warrior', 'warrior', 'settler']);
    const start = starts[0]!;
    expect(placements).toHaveLength(3);
    const soldiers = placements.filter((p) => unitDef(p.unitType).category === 'military');
    expect(soldiers[0]).toMatchObject({ col: start.col, row: start.row });
    const spilled = soldiers[1]!;
    expect(tileIndex(map, spilled.col, spilled.row)).not.toBe(tileIndex(map, start.col, start.row));
    // ...but only as far as the neighbouring ring.
    const spilledTile = map.tiles[tileIndex(map, spilled.col, spilled.row)]!;
    expect(wrappedDistance(map, tileHex(start), tileHex(spilledTile))).toBe(1);
  });
});

describe('newGame start placement', () => {
  it('gives every player their starting roster on every map size', () => {
    for (const sizeName of MAP_SIZE_NAMES) {
      const state = newGame(config(3, sizeName));
      expect(state.units).toHaveLength(3 * RULES.startingUnits.length);
      for (const player of state.players) {
        const owned = state.units.filter((u) => u.ownerId === player.id);
        expect(owned.map((u) => u.type)).toEqual(RULES.startingUnits);
      }
    }
  });

  it('seats even a full lobby on the smallest map', () => {
    const state = newGame(config(RULES.game.maxPlayers, 'duel'));
    expect(state.units).toHaveLength(RULES.game.maxPlayers * RULES.startingUnits.length);
    // And every unit stands somewhere it could legally have been spawned.
    for (const unit of state.units) {
      const tile = state.map.tiles[tileIndex(state.map, unit.col, unit.row)]!;
      expect(moveCost(tile.terrain, tile.feature, tile.hills)).not.toBeNull();
    }
  });

  it('never breaks the stacking rule', () => {
    const state = newGame(config(RULES.game.maxPlayers, 'duel'));
    const seen = new Set<string>();
    for (const unit of state.units) {
      const key = `${unit.col},${unit.row}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const here = unitsOnTile(state, unit.col, unit.row);
      for (const category of ['military', 'civilian'] as const) {
        const count = here.filter((u) => unitDef(u.type).category === category).length;
        expect(count).toBeLessThanOrEqual(RULES.stacking.perCategoryPerTile);
      }
    }
  });

  it('is deterministic: two games from one config seat units identically', () => {
    const a = newGame(config(4, 'standard'));
    const b = newGame(config(4, 'standard'));
    expect(a.units).toEqual(b.units);
    expect(JSON.stringify(a.units)).toBe(JSON.stringify(b.units));
  });

  it('gives different seeds different starts', () => {
    const a = newGame(config(2, 'standard', 1));
    const b = newGame(config(2, 'standard', 2));
    expect(a.units.map((u) => `${u.col},${u.row}`)).not.toEqual(
      b.units.map((u) => `${u.col},${u.row}`),
    );
  });
});

/**
 * The site score (playable-loop item 1): what a start is chosen *for*.
 *
 * Properties across many seeds and every map size rather than fixtures on one
 * roll, because the claim is about the algorithm and not about seed 4242. Every
 * threshold is read from `mapgen.starts`, so a designer who retunes a weight
 * retunes this suite with it.
 */
describe('start-site scoring', () => {
  const STARTS = MAPGEN_CONFIG.starts;
  const SEEDS = [1, 7, 99, 1234, 4242, 31337];

  it('folds its own ledger, and names the site bonuses it gives', () => {
    const map = generateMap(4242, 'standard');
    for (const tile of chooseStartPositions(map, 4)) {
      const score = scoreStartSite(map, tile);
      const fold = score.entries.reduce((sum, entry) => sum + entry.value, 0);
      expect(score.total).toBeCloseTo(fold, 9);
      expect(score.entries.map((entry) => entry.source)).toContain('Site');
      // The two site bonuses the settler lens already paints (Entry I.b) are
      // lines, not a silent addition: fresh water and coast.
      if (tile.freshwater) {
        expect(score.entries.find((entry) => entry.source === 'Fresh water')?.value).toBe(
          STARTS.freshwaterBonus,
        );
      }
    }
  });

  it('never seats anybody on cold or arid ground when the map has better', () => {
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of SEEDS.slice(0, 3)) {
        const map = generateMap(seed, size);
        for (const start of chooseStartPositions(map, 4)) {
          // The hard rejection is on the *site*, so a start on snow, tundra or
          // desert can only mean the accepted pool was exhausted — which is a
          // different failure, and the maps in this suite are not that poor.
          expect(`${size}/${seed}: ${start.terrain}`).toBe(`${size}/${seed}: ${start.terrain}`);
          expect(STARTS.hostileTerrain).not.toContain(start.terrain);
        }
      }
    }
  });

  it('clears the food and production floors on every start it accepts', () => {
    for (const seed of SEEDS) {
      const map = generateMap(seed, 'standard');
      for (const start of chooseStartPositions(map, 6)) {
        const score = scoreStartSite(map, start);
        expect(score.reject).toBeNull();
        expect(`${seed} food ${score.ringFood}`).toBe(
          `${seed} food ${Math.max(score.ringFood, STARTS.minRingFood)}`,
        );
        expect(`${seed} prod ${score.ringProduction}`).toBe(
          `${seed} prod ${Math.max(score.ringProduction, STARTS.minRingProduction)}`,
        );
      }
    }
  });

  it('keeps every pair of starts at the map’s own spacing', () => {
    // Every size except the duel map, which is the one board where four players
    // genuinely do not fit at full spacing — the greedy sweep relaxes there by
    // design rather than seating three of them (see the test above). The floor
    // the clamp guarantees is asserted for it separately, below.
    for (const size of MAP_SIZE_NAMES.filter((name) => name !== 'duel')) {
      for (const seed of SEEDS.slice(0, 3)) {
        const map = generateMap(seed, size);
        const spacing = startSpacing(map);
        const starts = chooseStartPositions(map, 4);
        for (let i = 0; i < starts.length; i++) {
          for (let j = i + 1; j < starts.length; j++) {
            const distance = wrappedDistance(map, tileHex(starts[i]!), tileHex(starts[j]!));
            expect(`${size}/${seed}: ${distance}`).toBe(
              `${size}/${seed}: ${Math.max(distance, spacing)}`,
            );
          }
        }
      }
    }
  });

  it('keeps a duel map’s starts apart even when it has to relax', () => {
    for (const seed of SEEDS) {
      const map = generateMap(seed, 'duel');
      const starts = chooseStartPositions(map, 4);
      for (let i = 0; i < starts.length; i++) {
        for (let j = i + 1; j < starts.length; j++) {
          const distance = wrappedDistance(map, tileHex(starts[i]!), tileHex(starts[j]!));
          expect(`${seed}: ${distance}`).toBe(
            `${seed}: ${Math.max(distance, MAPGEN_CONFIG.starts.minDistance)}`,
          );
        }
      }
    }
  });

  it('scales that spacing to the map and not to the roster', () => {
    const small = generateMap(4242, 'duel');
    const large = generateMap(4242, 'giant');
    expect(startSpacing(large)).toBeGreaterThan(startSpacing(small));
    expect(startSpacing(small)).toBeGreaterThanOrEqual(STARTS.minDistance);
    expect(startSpacing(large)).toBeLessThanOrEqual(STARTS.maxDistance);
    // Independent of how many players ask, which is the property the resource
    // fairness passes lean on: they seat the maximum roster once and cover every
    // real game because a short roster's starts are an exact *prefix*.
    const few = chooseStartPositions(large, 2).map((t) => tileIndex(large, t.col, t.row));
    const many = chooseStartPositions(large, RULES.game.maxPlayers).map((t) =>
      tileIndex(large, t.col, t.row),
    );
    expect(many.slice(0, few.length)).toEqual(few);
  });

  it('chooses the ground, so a resource landing next door cannot move a start', () => {
    // The whole reason a site is scored on a *ground view* of each tile: the
    // fairness passes plant food and luxuries at the starts, and a guarantee
    // that moved the start it was made to would chase itself around the map.
    const map = generateMap(99, 'standard');
    const before = chooseStartPositions(map, 6).map((t) => tileIndex(map, t.col, t.row));
    for (const tile of map.tiles) {
      if (tile.terrain === 'grassland' && tile.resource === undefined) tile.resource = 'wheat';
    }
    const after = chooseStartPositions(map, 6).map((t) => tileIndex(map, t.col, t.row));
    expect(after).toEqual(before);
  });
});
