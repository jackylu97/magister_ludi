import { describe, expect, it } from 'vitest';
import { generateMap, MAP_SIZE_NAMES } from '../src/sim/mapgen';
import { tileHex, tileIndex, wrappedDistance } from '../src/sim/map';
import { chooseStartPositions, planStartingUnits, startScore } from '../src/sim/startPositions';
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
        expect(distance).toBeGreaterThanOrEqual(RULES.startPlacement.minSpacing);
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
