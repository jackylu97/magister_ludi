import { describe, expect, it } from 'vitest';
import { buildingDef } from '../src/sim/buildingData';
import { type Command, applyCommand } from '../src/sim/commands';
import {
  advanceProduction,
  assignCitizens,
  assignableTiles,
  bestExpansionTile,
  centreYield,
  cityYields,
  collectYields,
  expandBorders,
  foundCityAt,
  foundingError,
  foundingErrorAt,
  growCities,
  growthThreshold,
  nextBorderCost,
  nextCityName,
  tileOwnerCityId,
  yieldScore,
} from '../src/sim/cities';
import {
  type Game,
  createGame,
  dispatch,
  loadGame,
  replay,
  saveGame,
  snapshotState,
} from '../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, tileHex, tileIndex, wrappedDistance } from '../src/sim/map';
import { RULES } from '../src/sim/rulesData';
import {
  type City,
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  createUnit,
  newGame,
} from '../src/sim/state';
import { tileYield } from '../src/sim/terrainData';
import { runEndOfTurn } from '../src/sim/turn';
import { unitDef } from '../src/sim/unitData';

const CITIES = RULES.cities;

/**
 * A two-player state on a blank desert rectangle. Desert yields nothing, so any
 * tile a test cares about is a tile the test set up itself.
 *
 * `tileOwner` is re-sized with the map: it is indexed exactly like `map.tiles`,
 * so replacing one without the other would leave the two out of step.
 */
function flatState(width = 16, height = 12, terrain: 'desert' | 'grassland' = 'desert'): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain });
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** Plants a city directly, skipping the command's validation. */
function plant(state: GameState, ownerId: number, col: number, row: number): City {
  return foundCityAt(state, ownerId, at(state.map, col, row));
}

function worked(city: City): string[] {
  return city.workedTiles.map((cell) => `${cell.col},${cell.row}`);
}

function endRound(state: GameState): void {
  for (const player of state.players) {
    expect(applyCommand(state, { type: 'endTurn', playerId: player.id })).toEqual({ ok: true });
  }
}

// ---------------------------------------------------------------------------

describe('tile yield algebra', () => {
  it('reads the bare terrain when there is no feature and no hill', () => {
    expect(tileYield('grassland', 'none', false)).toEqual({ food: 2, production: 0, gold: 0 });
    expect(tileYield('plains', 'none', false)).toEqual({ food: 1, production: 1, gold: 0 });
    expect(tileYield('desert', 'none', false)).toEqual({ food: 0, production: 0, gold: 0 });
    expect(tileYield('coast', 'none', false)).toEqual({ food: 1, production: 0, gold: 1 });
  });

  it('lets a feature replace the terrain, not add to it', () => {
    // Forest is "1/1/0", never "grassland plus a forest".
    expect(tileYield('grassland', 'forest', false)).toEqual(tileYield('tundra', 'forest', false));
    expect(tileYield('grassland', 'forest', false)).toEqual({ food: 1, production: 1, gold: 0 });
    expect(tileYield('desert', 'jungle', false)).toEqual({ food: 2, production: 0, gold: 0 });
  });

  it('lets hills win over both the terrain and the feature', () => {
    const hill = { food: 0, production: 2, gold: 0 };
    expect(tileYield('grassland', 'none', true)).toEqual(hill);
    expect(tileYield('grassland', 'forest', true)).toEqual(hill);
    expect(tileYield('desert', 'jungle', true)).toEqual(hill);
  });

  it('hands out a fresh object, so a caller cannot retune the tables', () => {
    const first = tileYield('grassland', 'none', false);
    first.food = 99;
    expect(tileYield('grassland', 'none', false).food).toBe(2);
  });

  it('scores a tile with the rules weights', () => {
    const w = CITIES.citizenWeights;
    expect(yieldScore({ food: 2, production: 0, gold: 0 })).toBe(2 * w.food);
    expect(yieldScore({ food: 1, production: 1, gold: 1 })).toBe(w.food + w.production + w.gold);
  });
});

describe('newGame with cities', () => {
  it('sizes tile ownership to the map and leaves every tile unclaimed', () => {
    const state = newGame({
      seed: 5,
      sizeName: 'duel',
      players: [{ name: 'Solo', color: '#fff' }],
    });
    expect(state.tileOwner).toHaveLength(state.map.tiles.length);
    expect(state.tileOwner.every((owner) => owner === null)).toBe(true);
    expect(state.cities).toEqual([]);
    expect(state.players[0]).toMatchObject({ gold: 0, sciencePool: 0, culturePool: 0 });
  });
});

describe('founding', () => {
  it('claims the centre and the ring around it, and nothing further', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);

    const owned = state.tileOwner.filter((owner) => owner === city.id).length;
    expect(owned).toBe(7); // centre + six neighbours
    expect(tileOwnerCityId(state, 8, 5)).toBe(city.id);
    for (const tile of [at(state.map, 8, 4), at(state.map, 9, 6)]) {
      expect(tileOwnerCityId(state, tile.col, tile.row)).toBe(city.id);
    }
    // Two hexes out is still unclaimed.
    expect(tileOwnerCityId(state, 8, 3)).toBeNull();
  });

  it('leaves a neighbour that another city already owns alone', () => {
    const state = flatState();
    const first = plant(state, 0, 8, 5);
    // Three hexes away, so their rings overlap on exactly the tiles between.
    const second = plant(state, 0, 8, 8);
    const contested = state.map.tiles.filter(
      (tile) =>
        wrappedDistance(state.map, tileHex(tile), tileHex(at(state.map, 8, 5))) === 1 &&
        wrappedDistance(state.map, tileHex(tile), tileHex(at(state.map, 8, 8))) === 1,
    );
    for (const tile of contested) {
      expect(tileOwnerCityId(state, tile.col, tile.row)).toBe(first.id);
    }
    expect(second.id).not.toBe(first.id);
  });

  it('names cities from the rules list, in order, per player', () => {
    const state = flatState();
    expect(nextCityName(state, 0)).toBe(CITIES.cityNames[0]);
    const a = plant(state, 0, 3, 3);
    const b = plant(state, 0, 3, 9);
    // Player 1 starts at the top of the same list: names are per player.
    const c = plant(state, 1, 12, 3);
    expect([a.name, b.name, c.name]).toEqual([
      CITIES.cityNames[0],
      CITIES.cityNames[1],
      CITIES.cityNames[0],
    ]);
  });

  it('falls back to a numbered name when the list runs out', () => {
    const state = flatState();
    for (let i = 0; i < CITIES.cityNames.length; i++) {
      state.cities.push({ ...plant(state, 0, 1, 1), id: 1000 + i });
    }
    expect(nextCityName(state, 0)).toMatch(/^A \d+$/);
  });
});

describe('foundCity command', () => {
  /** A settler of `playerId` standing at `(col, row)`, ready to found. */
  function settlerAt(state: GameState, playerId: number, col: number, row: number): number {
    return createUnit(state, playerId, 'settler', col, row).id;
  }

  function found(playerId: number, settlerUnitId: number): Command {
    return { type: 'foundCity', playerId, settlerUnitId };
  }

  it('spends the settler and puts a city on its tile', () => {
    const state = flatState();
    const settler = settlerAt(state, 0, 8, 5);
    expect(applyCommand(state, found(0, settler))).toEqual({ ok: true });

    expect(state.units).toHaveLength(0);
    expect(state.cities).toHaveLength(1);
    expect(state.cities[0]).toMatchObject({
      ownerId: 0,
      col: 8,
      row: 5,
      population: 1,
      foodBasket: 0,
      hammerBasket: 0,
      culture: 0,
      tilesClaimed: 0,
      buildings: [],
      queue: [],
    });
  });

  it('refuses a unit that is not a founder, or is not the actor’s', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 8, 5).id;
    const theirs = settlerAt(state, 1, 4, 4);
    const before = clone(state);

    expect(applyCommand(state, found(0, warrior)).ok).toBe(false);
    expect(applyCommand(state, found(0, theirs)).ok).toBe(false);
    expect(applyCommand(state, found(0, 9999)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a settler with no movement left, and a seat that has ended', () => {
    const state = flatState();
    const spent = settlerAt(state, 0, 8, 5);
    state.units[0]!.movesLeft = 0;
    expect(applyCommand(state, found(0, spent)).ok).toBe(false);

    state.units[0]!.movesLeft = 2;
    applyCommand(state, { type: 'endTurn', playerId: 0 });
    const before = clone(state);
    const result = applyCommand(state, found(0, spent));
    expect(result).toEqual({
      ok: false,
      error: 'Player 0 has ended turn 1 and cannot found a city',
    });
    expect(state).toEqual(before);
  });

  it('refuses terrain a city cannot stand on', () => {
    const state = flatState();
    at(state.map, 8, 5).terrain = 'mountain';
    const settler = settlerAt(state, 0, 8, 5);
    const before = clone(state);
    expect(applyCommand(state, found(0, settler)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a tile another player’s city owns, and allows one of your own', () => {
    const state = flatState();
    plant(state, 1, 8, 5);
    // (8, 4) is inside their ring but three hexes from nothing; spacing is fine.
    const intruder = settlerAt(state, 0, 8, 4);
    const before = clone(state);
    expect(applyCommand(state, found(0, intruder)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('enforces the minimum spacing against every city, anyone’s', () => {
    const state = flatState(20, 14);
    plant(state, 1, 8, 6);
    const spacing = CITIES.minCitySpacing;

    // One hex short of the rule.
    const tooClose = state.map.tiles.find(
      (tile) =>
        wrappedDistance(state.map, tileHex(tile), tileHex(at(state.map, 8, 6))) === spacing - 1 &&
        tileOwnerCityId(state, tile.col, tile.row) === null,
    )!;
    const near = settlerAt(state, 0, tooClose.col, tooClose.row);
    expect(applyCommand(state, found(0, near)).ok).toBe(false);

    // Exactly the rule is allowed.
    const justFar = state.map.tiles.find(
      (tile) =>
        wrappedDistance(state.map, tileHex(tile), tileHex(at(state.map, 8, 6))) === spacing &&
        tileOwnerCityId(state, tile.col, tile.row) === null,
    )!;
    const far = settlerAt(state, 0, justFar.col, justFar.row);
    expect(applyCommand(state, found(0, far))).toEqual({ ok: true });
  });
});

describe('foundingErrorAt', () => {
  it('answers about the ground alone, and gives the settler rule its answer', () => {
    const state = flatState();
    const tile = at(state.map, 8, 5);
    expect(foundingErrorAt(state, 0, tile)).toBeNull();

    // A warrior standing there is refused for being a warrior — the *ground* is
    // still fine, which is exactly the difference between the two functions.
    const warrior = createUnit(state, 0, 'warrior', 8, 5);
    expect(foundingError(state, warrior)).toBe('A Warrior cannot found a city');
    expect(foundingErrorAt(state, 0, tile)).toBeNull();

    // And where the ground is the problem, the two say the same words.
    const settler = createUnit(state, 0, 'settler', 8, 5);
    plant(state, 1, 8, 6);
    expect(foundingError(state, settler)).toBe(foundingErrorAt(state, 0, tile));
    expect(foundingError(state, settler)).not.toBeNull();
  });

  it('refuses impassable ground, a rival’s territory and a crowded neighbourhood', () => {
    const state = flatState(20, 14);
    expect(foundingErrorAt(state, 0, at(state.map, 3, 3))).toBeNull();
    at(state.map, 3, 3).terrain = 'mountain';
    expect(foundingErrorAt(state, 0, at(state.map, 3, 3))).toMatch(/cannot hold a city/);

    plant(state, 1, 8, 6);
    // Inside their ring: theirs, not yours.
    expect(foundingErrorAt(state, 0, at(state.map, 8, 5))).toMatch(/belongs to player 1/);
    // Their own owner may stand on it, but the spacing rule still refuses.
    expect(foundingErrorAt(state, 1, at(state.map, 8, 5))).toMatch(/tile\(s\) from the nearest/);
  });

  it('judges every tile of a work radius without a unit anywhere near it', () => {
    // What the settler lens does: ask the reducer's own rule, tile by tile.
    const state = flatState(20, 14);
    plant(state, 0, 8, 6);
    const spacing = CITIES.minCitySpacing;
    for (const tile of state.map.tiles) {
      const distance = wrappedDistance(state.map, tileHex(tile), tileHex(at(state.map, 8, 6)));
      if (distance >= spacing && tileOwnerCityId(state, tile.col, tile.row) === null) {
        expect(foundingErrorAt(state, 0, tile)).toBeNull();
      } else {
        expect(foundingErrorAt(state, 0, tile)).not.toBeNull();
      }
    }
  });
});

describe('citizen assignment', () => {
  it('works the best tile, not the nearest or the first', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // The highest tile index in the ring, so index order would never pick it.
    at(state.map, 9, 6).terrain = 'grassland';
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['9,6']);
  });

  it('breaks ties by tile index, so the choice is a function of the board', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    // Every ring tile is identical desert; the lowest index wins.
    expect(worked(city)).toEqual(['8,4']);

    // And it is stable: assigning again changes nothing.
    const first = [...city.workedTiles];
    assignCitizens(state, city);
    expect(city.workedTiles).toEqual(first);
  });

  it('never assigns an unworkable tile, however cheap the alternative', () => {
    const state = flatState();
    at(state.map, 8, 4).terrain = 'mountain';
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    // (8, 4) is the lowest index in the ring and would have won the tie.
    expect(worked(city)).toEqual(['9,4']);
  });

  it('works exactly `population` tiles, and never the free centre', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    for (const pop of [1, 2, 3, 6]) {
      city.population = pop;
      assignCitizens(state, city);
      expect(city.workedTiles).toHaveLength(pop);
      expect(worked(city)).not.toContain('8,5');
    }
    // Only six tiles are owned besides the centre, so a bigger city idles.
    city.population = 9;
    assignCitizens(state, city);
    expect(city.workedTiles).toHaveLength(6);
  });

  it('ignores an owned tile outside the work radius', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // Four hexes north: hand it to the city and make it the best tile on the map.
    const far = at(state.map, 8, 1);
    expect(wrappedDistance(state.map, tileHex(far), tileHex(at(state.map, 8, 5)))).toBe(4);
    state.tileOwner[tileIndex(state.map, far.col, far.row)] = city.id;
    far.terrain = 'grassland';

    city.population = 1;
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,4']);
  });

  it('works a tile three hexes out once the borders reach it', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const edge = at(state.map, 8, 2);
    expect(wrappedDistance(state.map, tileHex(edge), tileHex(at(state.map, 8, 5)))).toBe(3);
    state.tileOwner[tileIndex(state.map, edge.col, edge.row)] = city.id;
    edge.terrain = 'grassland';

    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,2']);
  });

  it('leaves another city’s tiles to that city', () => {
    const state = flatState();
    const mine = plant(state, 0, 8, 5);
    const theirs = plant(state, 0, 8, 8);
    // A tile of the second city that is still inside the first one's radius.
    const tile = at(state.map, 8, 7);
    expect(tileOwnerCityId(state, tile.col, tile.row)).toBe(theirs.id);
    tile.terrain = 'grassland';

    assignCitizens(state, mine);
    expect(worked(mine)).not.toContain('8,7');
  });
});

describe('locked tiles', () => {
  /**
   * `col,row` keys for a list of cells, sorted — `workedTiles` comes back in
   * tile-index order, which is not the order the pins were made in.
   */
  function keys(cells: readonly { col: number; row: number }[]): string[] {
    return cells.map((cell) => `${cell.col},${cell.row}`).sort();
  }

  it('works a pinned tile ahead of a better one', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // Left alone, the city takes this one (see the assignment tests above).
    at(state.map, 9, 6).terrain = 'grassland';
    city.lockedTiles = [{ col: 8, row: 4 }];

    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,4']);

    // Room for both: the pin is first, the auto-fill takes the best remaining.
    city.population = 2;
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,4', '9,6']);
  });

  it('ignores a lock it cannot honour, keeps it, and honours it again later', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const far = at(state.map, 8, 2);
    const farIndex = tileIndex(state.map, far.col, far.row);
    // Three hexes out: inside the work radius, but not this city's yet.
    city.lockedTiles = [{ col: 8, row: 2 }];

    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,4']);
    expect(city.lockedTiles).toEqual([{ col: 8, row: 2 }]);

    // The borders reach it: the same list now means something.
    state.tileOwner[farIndex] = city.id;
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,2']);

    // And a tile lost again is ignored again — without forgetting the pin.
    state.tileOwner[farIndex] = 999;
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,4']);
    expect(city.lockedTiles).toEqual([{ col: 8, row: 2 }]);
  });

  it('honours the first `population` pins when a city starves', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const ring = assignableTiles(state, city);
    expect(ring).toHaveLength(6);

    city.population = 3;
    city.lockedTiles = [ring[5]!, ring[3]!, ring[0]!].map((tile) => ({
      col: tile.col,
      row: tile.row,
    }));
    assignCitizens(state, city);
    expect(worked(city).sort()).toEqual(keys([ring[0]!, ring[3]!, ring[5]!]));

    // Starvation takes a citizen: the two pinned *first* keep their tiles.
    city.population = 2;
    assignCitizens(state, city);
    expect(worked(city).sort()).toEqual(keys([ring[3]!, ring[5]!]));
    // The third pin is still on the list, waiting for the city to regrow.
    expect(city.lockedTiles).toHaveLength(3);
  });

  it('ignores a lock naming a tile that is not workable at all', () => {
    const state = flatState();
    at(state.map, 8, 4).terrain = 'mountain';
    const city = plant(state, 0, 8, 5);
    city.lockedTiles = [{ col: 8, row: 4 }];
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['9,4']);
  });
});

describe('setLockedTiles', () => {
  function lock(playerId: number, cityId: number, cells: { col: number; row: number }[]): Command {
    return { type: 'setLockedTiles', playerId, cityId, cells };
  }

  /** A size-3 city with its whole ring, so there is room to pin things badly. */
  function cityWithRing(state: GameState): City {
    const city = plant(state, 0, 8, 5);
    city.population = 3;
    assignCitizens(state, city);
    return city;
  }

  it('pins the tiles and re-assigns the citizens on the spot', () => {
    const state = flatState();
    const city = cityWithRing(state);
    at(state.map, 9, 6).terrain = 'grassland';
    assignCitizens(state, city);
    expect(worked(city)).toContain('9,6');

    expect(applyCommand(state, lock(0, city.id, [{ col: 8, row: 6 }]))).toEqual({ ok: true });
    expect(city.lockedTiles).toEqual([{ col: 8, row: 6 }]);
    // Immediately, not at the end of the turn: the panel must not lie.
    expect(worked(city)).toContain('8,6');
    expect(city.workedTiles).toHaveLength(3);
  });

  it('replaces the whole list, and an empty list unpins everything', () => {
    const state = flatState();
    const city = cityWithRing(state);
    applyCommand(state, lock(0, city.id, [{ col: 8, row: 4 }, { col: 8, row: 6 }]));
    expect(city.lockedTiles).toHaveLength(2);

    expect(applyCommand(state, lock(0, city.id, [{ col: 9, row: 4 }]))).toEqual({ ok: true });
    expect(city.lockedTiles).toEqual([{ col: 9, row: 4 }]);

    expect(applyCommand(state, lock(0, city.id, []))).toEqual({ ok: true });
    expect(city.lockedTiles).toEqual([]);
  });

  it('refuses everything it should, and changes nothing when it does', () => {
    const state = flatState();
    const city = cityWithRing(state);
    // Another player's city, to check ownership rather than existence.
    const theirs = plant(state, 1, 2, 2);
    const before = clone(state);

    const refusals: Command[] = [
      lock(0, 9999, [{ col: 8, row: 4 }]),
      lock(0, theirs.id, []),
      lock(7, city.id, []),
      // The free centre is not a citizen slot.
      lock(0, city.id, [{ col: 8, row: 5 }]),
      // Unowned, though it is inside the work radius.
      lock(0, city.id, [{ col: 8, row: 2 }]),
      // Owned by this city, but outside the map.
      lock(0, city.id, [{ col: 8, row: 99 }]),
      // The same tile twice.
      lock(0, city.id, [{ col: 8, row: 4 }, { col: 8, row: 4 }]),
      // Four pins for three citizens.
      lock(0, city.id, [
        { col: 8, row: 4 },
        { col: 9, row: 4 },
        { col: 8, row: 6 },
        { col: 9, row: 6 },
      ]),
      { type: 'setLockedTiles', playerId: 0, cityId: city.id, cells: 'nope' } as unknown as Command,
      {
        type: 'setLockedTiles',
        playerId: 0,
        cityId: city.id,
        cells: [{ col: 1.5, row: 2 }],
      } as unknown as Command,
    ];

    for (const command of refusals) {
      expect(applyCommand(state, command).ok).toBe(false);
      expect(state).toEqual(before);
    }
  });

  it('refuses an unworkable tile the city owns, and a seat that has ended', () => {
    const state = flatState();
    at(state.map, 8, 4).terrain = 'mountain';
    const city = cityWithRing(state);
    expect(tileOwnerCityId(state, 8, 4)).toBe(city.id);
    expect(applyCommand(state, lock(0, city.id, [{ col: 8, row: 4 }])).ok).toBe(false);

    applyCommand(state, { type: 'endTurn', playerId: 0 });
    const before = clone(state);
    expect(applyCommand(state, lock(0, city.id, [{ col: 9, row: 4 }]))).toEqual({
      ok: false,
      error: 'Player 0 has ended turn 1 and cannot assign citizens',
    });
    expect(state).toEqual(before);
  });

  it('does not alias the command’s array into the state', () => {
    const state = flatState();
    const city = cityWithRing(state);
    const cells = [{ col: 8, row: 4 }];
    applyCommand(state, lock(0, city.id, cells));
    cells[0]!.col = 99;
    expect(city.lockedTiles).toEqual([{ col: 8, row: 4 }]);
  });

  it('keeps a pin honoured through a whole turn of the real pipeline', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    city.population = 2;
    // The lowest-index ring tile is what the auto-assignment would never drop;
    // pin a different one and check the end of turn does not undo it.
    applyCommand(state, lock(0, city.id, [{ col: 9, row: 6 }]));
    expect(worked(city)).toContain('9,6');
    endRound(state);
    expect(worked(city)).toContain('9,6');
  });
});

describe('city yields', () => {
  it('floors the centre tile at the base city yields, per field', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // Desert centre: nothing of its own, so the floor is the whole of it.
    expect(centreYield(state, city)).toEqual(CITIES.baseCityYields);

    // A hill centre keeps its own production and still gets the food floor.
    at(state.map, 8, 5).hills = true;
    expect(centreYield(state, city)).toEqual({
      food: CITIES.baseCityYields.food,
      production: 2,
      gold: 0,
    });
  });

  it('adds the centre, the worked tiles, population science and base culture', () => {
    const state = flatState();
    at(state.map, 9, 6).terrain = 'grassland';
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);

    expect(cityYields(state, city)).toEqual({
      food: CITIES.baseCityYields.food + 2,
      production: CITIES.baseCityYields.production,
      gold: CITIES.baseCityYields.gold,
      science: CITIES.sciencePerPop,
      culture: CITIES.baseCulturePerCity,
    });
  });

  it('adds building effects, flooring each science-per-pop on its own', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.buildings = ['monument', 'granary', 'library'];

    city.population = 1;
    assignCitizens(state, city);
    const small = cityYields(state, city);
    expect(small.culture).toBe(CITIES.baseCulturePerCity + 2);
    expect(small.food).toBe(CITIES.baseCityYields.food + 2);
    // A library at size 1 is half a point, and half a point is none.
    expect(small.science).toBe(1);

    city.population = 4;
    assignCitizens(state, city);
    expect(cityYields(state, city).science).toBe(4 + 2);
  });
});

describe('growth', () => {
  it('follows the threshold curve from the rules', () => {
    const c = CITIES;
    for (const pop of [1, 2, 3, 5, 9]) {
      const steps = pop - 1;
      expect(growthThreshold(pop)).toBe(
        Math.floor(c.growthBase + c.growthLinear * steps + steps ** c.growthExponent),
      );
    }
    expect(growthThreshold(1)).toBe(15);
    expect(growthThreshold(2)).toBe(24);
    // Strictly increasing, so a bigger city never grows faster.
    for (let pop = 1; pop < 20; pop++) {
      expect(growthThreshold(pop + 1)).toBeGreaterThan(growthThreshold(pop));
    }
  });

  it('grows on a full basket and carries the overflow', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.foodBasket = growthThreshold(1) + 4;
    runEndOfTurn(state);
    // `collectYields` ran first and added this turn's surplus, so assert on the
    // one thing growth is responsible for: the threshold came out of the basket.
    expect(city.population).toBe(2);
    expect(city.foodBasket).toBeGreaterThanOrEqual(4);
    expect(city.foodBasket).toBeLessThan(growthThreshold(2));
  });

  it('starves a point away on any deficit and empties the basket', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.population = 3;
    city.foodBasket = CITIES.starvationShrinksAt;
    // Growth phase only: `collectYields` would refill the basket first.
    growCities(state);
    expect(city.population).toBe(2);
    expect(city.foodBasket).toBe(0);
  });

  it('never starves below one, and still writes the debt off', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.foodBasket = -40;
    growCities(state);
    expect(city.population).toBe(1);
    expect(city.foodBasket).toBe(0);
  });

  it('banks nothing toward growth while a settler is at the front', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    city.population = 2;

    // First measure the surplus this city makes with an empty queue.
    collectYields(state);
    const surplus = city.foodBasket;
    expect(surplus).toBeGreaterThan(0);

    city.foodBasket = 0;
    city.queue = [{ kind: 'unit', id: 'settler' }];
    collectYields(state);
    expect(city.foodBasket).toBe(0);
    // Hammers are unaffected: a settler halts growth, not the whole city.
    expect(city.hammerBasket).toBeGreaterThan(0);
  });

  it('lets a settler-halted city starve anyway', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.population = 5; // desert tiles: nowhere near enough food
    city.queue = [{ kind: 'unit', id: 'settler' }];
    collectYields(state);
    expect(city.foodBasket).toBeLessThan(0);
  });
});

describe('production', () => {
  it('completes one item per turn and carries the overflow to the next', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.queue = [
      { kind: 'unit', id: 'scout' },
      { kind: 'building', id: 'monument' },
    ];

    city.hammerBasket = unitDef('scout').cost + 7;
    advanceProduction(state);
    expect(state.units).toHaveLength(1);
    expect(state.units[0]).toMatchObject({ type: 'scout', ownerId: 0, col: 8, row: 5 });
    // The monument did not also finish, and the change is in the basket.
    expect(city.hammerBasket).toBe(7);
    expect(city.queue).toEqual([{ kind: 'building', id: 'monument' }]);
  });

  it('completes a building into the city', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.queue = [{ kind: 'building', id: 'library' }];
    city.hammerBasket = buildingDef('library').cost;
    advanceProduction(state);
    expect(city.buildings).toEqual(['library']);
    expect(city.queue).toEqual([]);
    expect(city.hammerBasket).toBe(0);
  });

  it('holds, keeping the basket, when there is nowhere for the unit to stand', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // Ring the city with mountains and park a soldier on the centre tile.
    for (const [col, row] of [[9, 5], [9, 6], [8, 6], [7, 5], [8, 4], [9, 4]]) {
      at(state.map, col!, row!).terrain = 'mountain';
    }
    createUnit(state, 0, 'warrior', 8, 5);

    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 500;
    const before = clone(state);
    advanceProduction(state);
    expect(state).toEqual(before);
  });

  it('spills a unit onto a neighbour when the city tile is taken', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    createUnit(state, 0, 'warrior', 8, 5);
    city.queue = [{ kind: 'unit', id: 'scout' }];
    city.hammerBasket = 500;
    advanceProduction(state);

    const scout = state.units.find((unit) => unit.type === 'scout')!;
    expect(scout).toBeDefined();
    expect(`${scout.col},${scout.row}`).not.toBe('8,5');
    expect(wrappedDistance(state.map, tileHex(at(state.map, scout.col, scout.row)), tileHex(at(state.map, 8, 5)))).toBe(1);
  });

  it('holds a settler whose city has shrunk below its minimum population', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.queue = [{ kind: 'unit', id: 'settler' }];
    city.hammerBasket = 500;
    expect(city.population).toBeLessThan(unitDef('settler').minCityPop);

    advanceProduction(state);
    expect(state.units).toHaveLength(0);
    expect(city.hammerBasket).toBe(500);
    expect(city.queue).toHaveLength(1);

    // Grown back, it finishes with the hammers it kept.
    city.population = unitDef('settler').minCityPop;
    advanceProduction(state);
    expect(state.units).toHaveLength(1);
    expect(city.hammerBasket).toBe(500 - unitDef('settler').cost);
  });
});

describe('setCityProduction', () => {
  function set(playerId: number, cityId: number, queue: unknown): Command {
    return { type: 'setCityProduction', playerId, cityId, queue } as Command;
  }

  it('replaces the whole queue, in the order given', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const queue = [
      { kind: 'building', id: 'monument' },
      { kind: 'unit', id: 'warrior' },
    ];
    expect(applyCommand(state, set(0, city.id, queue))).toEqual({ ok: true });
    expect(city.queue).toEqual(queue);

    expect(applyCommand(state, set(0, city.id, []))).toEqual({ ok: true });
    expect(city.queue).toEqual([]);
  });

  it('does not alias the command’s array into the state', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const queue = [{ kind: 'unit', id: 'warrior' }];
    applyCommand(state, set(0, city.id, queue));
    (queue[0] as { id: string }).id = 'scout';
    expect(city.queue).toEqual([{ kind: 'unit', id: 'warrior' }]);
  });

  it('refuses another player’s city, an unknown city, and a finished seat', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const before = clone(state);
    expect(applyCommand(state, set(1, city.id, [])).ok).toBe(false);
    expect(applyCommand(state, set(0, 9999, [])).ok).toBe(false);

    applyCommand(state, { type: 'endTurn', playerId: 0 });
    expect(applyCommand(state, set(0, city.id, [{ kind: 'unit', id: 'warrior' }])).ok).toBe(false);
    expect(city.queue).toEqual(before.cities[0]!.queue);
  });

  it('refuses unknown ids, duplicate buildings and buildings already built', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.buildings = ['granary'];
    const before = clone(state);

    for (const bad of [
      'not an array',
      [{ kind: 'unit', id: 'zeppelin' }],
      [{ kind: 'building', id: 'pyramid' }],
      [{ kind: 'wonder', id: 'monument' }],
      [null],
      [{ kind: 'building', id: 'monument' }, { kind: 'building', id: 'monument' }],
      [{ kind: 'building', id: 'granary' }],
    ]) {
      expect(applyCommand(state, set(0, city.id, bad)).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('refuses a settler in a city too small to build one', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    expect(applyCommand(state, set(0, city.id, [{ kind: 'unit', id: 'settler' }])).ok).toBe(false);

    city.population = unitDef('settler').minCityPop;
    expect(applyCommand(state, set(0, city.id, [{ kind: 'unit', id: 'settler' }]))).toEqual({
      ok: true,
    });
  });
});

describe('borders', () => {
  it('follows the cost curve from the rules', () => {
    const c = CITIES;
    for (const claimed of [0, 1, 2, 5, 11]) {
      expect(nextBorderCost(claimed)).toBe(
        Math.floor(c.borderCostBase + c.borderCostLinear * claimed ** c.borderCostExponent),
      );
    }
    expect(nextBorderCost(0)).toBe(20);
    expect(nextBorderCost(1)).toBe(30);
    // Each tile costs more than the last.
    for (let claimed = 0; claimed < 12; claimed++) {
      expect(nextBorderCost(claimed + 1)).toBeGreaterThan(nextBorderCost(claimed));
    }
  });

  it('takes the best unclaimed tile that touches its own territory', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // Two hexes out, so it touches the ring the city already owns.
    at(state.map, 8, 3).terrain = 'grassland';
    expect(bestExpansionTile(state, city)!.row).toBe(3);

    city.culture = nextBorderCost(0);
    expandBorders(state);
    expect(tileOwnerCityId(state, 8, 3)).toBe(city.id);
    expect(city.tilesClaimed).toBe(1);
    expect(city.culture).toBe(0);
  });

  it('keeps the excess culture and never takes two tiles in a turn', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.culture = nextBorderCost(0) + nextBorderCost(1) + 5;
    expandBorders(state);
    expect(city.tilesClaimed).toBe(1);
    expect(city.culture).toBe(nextBorderCost(1) + 5);
  });

  it('never reaches past the claim radius', () => {
    const state = flatState(24, 18);
    const city = plant(state, 0, 12, 9);
    const centre = tileHex(at(state.map, 12, 9));
    for (let i = 0; i < 60; i++) {
      city.culture += nextBorderCost(city.tilesClaimed);
      expandBorders(state);
    }
    for (let index = 0; index < state.tileOwner.length; index++) {
      if (state.tileOwner[index] !== city.id) continue;
      const tile = state.map.tiles[index]!;
      expect(wrappedDistance(state.map, tileHex(tile), centre)).toBeLessThanOrEqual(
        CITIES.claimRadius,
      );
    }
  });

  it('gives a contested tile to the city that comes first in the array', () => {
    const state = flatState();
    // Four hexes apart, so their opening rings do not overlap but the tile
    // halfway between them touches both — and it is the only tile either would
    // rather have than bare desert.
    const first = plant(state, 0, 8, 4);
    const second = plant(state, 0, 8, 8);
    at(state.map, 8, 6).terrain = 'grassland';

    expect(bestExpansionTile(state, first)!.row).toBe(6);
    expect(bestExpansionTile(state, second)!.row).toBe(6);

    first.culture = nextBorderCost(0);
    second.culture = nextBorderCost(0);
    expandBorders(state);

    // `state.cities` order settles it. The loser is not punished: its choice is
    // made when its turn in the sweep comes round, by which time the contested
    // tile is simply not on offer, so it buys its own second choice instead.
    expect(tileOwnerCityId(state, 8, 6)).toBe(first.id);
    expect(first.tilesClaimed).toBe(1);
    expect(first.culture).toBe(0);
    expect(second.tilesClaimed).toBe(1);
    expect(second.culture).toBe(0);
    const theirs = state.tileOwner.filter((owner) => owner === second.id).length;
    expect(theirs).toBe(8); // its opening seven, plus one it actually got
  });

  it('banks culture and spends none when there is nothing left to claim', () => {
    const state = flatState(8, 6);
    const city = plant(state, 0, 4, 3);
    // Claim everything within reach first.
    for (let i = 0; i < 80; i++) {
      city.culture += nextBorderCost(city.tilesClaimed);
      expandBorders(state);
    }
    const claimed = city.tilesClaimed;
    city.culture = 10_000;
    expandBorders(state);
    expect(city.tilesClaimed).toBe(claimed);
    expect(city.culture).toBe(10_000);
  });
});

describe('the turn pipeline over a live empire', () => {
  it('banks yields into the city and the player in one pass', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    at(state.map, 9, 6).terrain = 'coast'; // the only gold on the board

    collectYields(state);
    const player = state.players[0]!;
    expect(city.hammerBasket).toBeGreaterThan(0);
    expect(player.sciencePool).toBe(CITIES.sciencePerPop);
    expect(player.culturePool).toBe(CITIES.baseCulturePerCity);
    expect(city.culture).toBe(CITIES.baseCulturePerCity);
    expect(player.gold).toBeGreaterThanOrEqual(0);
  });

  it('grows a city, builds its queue and pushes its borders out over time', () => {
    const state = flatState(20, 14, 'grassland');
    // A hill under the city: grassland alone is two food and one hammer a turn,
    // and sixty turns of that would not finish a monument.
    at(state.map, 10, 7).hills = true;
    const city = plant(state, 0, 10, 7);
    city.queue = [
      { kind: 'building', id: 'monument' },
      { kind: 'unit', id: 'warrior' },
    ];

    for (let turn = 0; turn < 60; turn++) endRound(state);

    expect(city.population).toBeGreaterThan(1);
    expect(city.buildings).toContain('monument');
    expect(state.units.some((unit) => unit.type === 'warrior')).toBe(true);
    expect(city.tilesClaimed).toBeGreaterThan(0);
    expect(city.workedTiles).toHaveLength(city.population);
    expect(state.players[0]!.sciencePool).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe('determinism with cities', () => {
  function config(overrides: Partial<GameConfig> = {}): GameConfig {
    return {
      seed: 31337,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#e8503a', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
      ...overrides,
    };
  }

  /** Founds a city with each player's starting settler and queues some work. */
  function twoCityGame(): Game {
    const game = createGame(config());
    for (const player of game.state.players) {
      const settler = game.state.units.find(
        (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
      );
      expect(settler).toBeDefined();
      expect(
        dispatch(game, { type: 'foundCity', playerId: player.id, settlerUnitId: settler!.id }).ok,
      ).toBe(true);
    }
    expect(game.state.cities).toHaveLength(2);

    for (const city of game.state.cities) {
      expect(
        dispatch(game, {
          type: 'setCityProduction',
          playerId: city.ownerId,
          cityId: city.id,
          queue: [
            { kind: 'building', id: 'monument' },
            { kind: 'unit', id: 'warrior' },
            { kind: 'building', id: 'granary' },
          ],
        }).ok,
      ).toBe(true);
    }
    return game;
  }

  it('replays thirty turns of two growing cities byte for byte', () => {
    const game = twoCityGame();
    for (let turn = 0; turn < 32; turn++) {
      for (const player of game.state.players) {
        expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
      }
    }

    // The game actually did something worth replaying.
    expect(game.state.turn).toBe(33);
    expect(game.state.cities.every((city) => city.population > 1)).toBe(true);
    expect(game.state.cities.some((city) => city.buildings.length > 0)).toBe(true);
    expect(game.state.tileOwner.some((owner) => owner !== null)).toBe(true);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('round-trips a schema 6 save with cities and keeps playing in lockstep', () => {
    const game = twoCityGame();
    for (let turn = 0; turn < 12; turn++) {
      for (const player of game.state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }

    const json = saveGame(game);
    expect((JSON.parse(json) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);
    // Bumped to 5 by fresh water: `Tile` grew `riverEdges` and `freshwater`,
    // and `lake` joined the terrain list.
    expect(SCHEMA_VERSION).toBe(6);

    const loaded = loadGame(json);
    expect(loaded.state).toEqual(game.state);

    for (let turn = 0; turn < 6; turn++) {
      for (const player of game.state.players) {
        dispatch(loaded, { type: 'endTurn', playerId: player.id });
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    expect(snapshotState(loaded.state)).toBe(snapshotState(game.state));
  });

  it('replays a log with pinned citizens in it byte for byte', () => {
    const game = twoCityGame();
    // One pin per city, chosen from the tiles that city could actually work.
    for (const city of game.state.cities) {
      const choices = assignableTiles(game.state, city);
      expect(choices.length).toBeGreaterThan(0);
      const pick = choices[choices.length - 1]!;
      expect(
        dispatch(game, {
          type: 'setLockedTiles',
          playerId: city.ownerId,
          cityId: city.id,
          cells: [{ col: pick.col, row: pick.row }],
        }).ok,
      ).toBe(true);
      expect(worked(city)).toContain(`${pick.col},${pick.row}`);
    }

    for (let turn = 0; turn < 20; turn++) {
      for (const player of game.state.players) {
        expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
      }
    }

    // The pins survived twenty turns of growth, borders and production.
    expect(game.state.cities.every((city) => city.lockedTiles.length === 1)).toBe(true);
    expect(
      game.state.cities.every((city) =>
        worked(city).includes(`${city.lockedTiles[0]!.col},${city.lockedTiles[0]!.row}`),
      ),
    ).toBe(true);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('reaches the same state whichever order the seats found their cities in', () => {
    const forwards = createGame(config());
    const backwards = createGame(config());
    const settlerOf = (game: Game, playerId: number): number =>
      game.state.units.find(
        (unit) => unit.ownerId === playerId && unitDef(unit.type).foundsCity,
      )!.id;

    for (const id of [0, 1]) {
      dispatch(forwards, { type: 'foundCity', playerId: id, settlerUnitId: settlerOf(forwards, id) });
    }
    for (const id of [1, 0]) {
      dispatch(backwards, { type: 'foundCity', playerId: id, settlerUnitId: settlerOf(backwards, id) });
    }

    // Ids and array order follow the log, so the two differ — but every city
    // stands on the same tile and owns the same territory.
    const places = (game: Game): string[] =>
      game.state.cities.map((city) => `${city.ownerId}@${city.col},${city.row}`).sort();
    expect(places(backwards)).toEqual(places(forwards));
  });
});
