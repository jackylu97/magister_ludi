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
  explainCityBuildings,
  foundCityAt,
  foundingError,
  foundingErrorAt,
  growCities,
  growthThreshold,
  nextBorderCost,
  nextCityName,
  productionModifiers,
  queueItemCost,
  tileOwnerCityId,
  turnsToBuild,
  turnsToFill,
  unitProductionCost,
  withinWorkRadius,
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
import { meterEffects, yieldFactor } from '../src/sim/meters';
import { RULES } from '../src/sim/rulesData';
import {
  type City,
  type GameConfig,
  type GameState,
  type QueueItem,
  SCHEMA_VERSION,
  createUnit,
  newGame,
} from '../src/sim/state';
import { techDef } from '../src/sim/techData';
import { readTileYield, tileYield } from '../src/sim/terrainData';
import { runEndOfTurn } from '../src/sim/turn';
import { UNIT_TYPE_IDS, unitDef } from '../src/sim/unitData';
import { resetVisibility } from '../src/sim/visibility';

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
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
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
    expect(tileYield('grassland', 'none', false)).toEqual({ food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(tileYield('plains', 'none', false)).toEqual({ food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(tileYield('desert', 'none', false)).toEqual({ food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(tileYield('coast', 'none', false)).toEqual({ food: 1, production: 0, gold: 1, science: 0, culture: 0, faith: 0 });
  });

  it('lets a feature replace the terrain, not add to it', () => {
    // Forest is "1/1/0", never "grassland plus a forest".
    expect(tileYield('grassland', 'forest', false)).toEqual(tileYield('tundra', 'forest', false));
    expect(tileYield('grassland', 'forest', false)).toEqual({ food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(tileYield('desert', 'jungle', false)).toEqual({ food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
  });

  it('lets hills win over both the terrain and the feature', () => {
    const hill = readTileYield({ food: 0, production: 2, gold: 0 });
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
    expect(yieldScore(readTileYield({ food: 2, production: 0, gold: 0 }))).toBe(2 * w.food);
    expect(yieldScore(readTileYield({ food: 1, production: 1, gold: 1 }))).toBe(
      w.food + w.production + w.gold,
    );
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

/**
 * The ring a city panel is *about*, which the interface asks about on every
 * click while a city screen is open: inside it a click pins a citizen, outside
 * it the click closes the screen (see `handleLeftClick` in `ui/controls.ts`).
 * The rule that matters is that it is *wider* than the assignable list — a
 * question about ground, not about citizens.
 */
describe('the work radius', () => {
  it('holds every tile within the radius, the city\u2019s own included', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const centre = tileHex(at(state.map, 8, 5));

    for (const tile of state.map.tiles) {
      const inside = wrappedDistance(state.map, centre, tileHex(tile)) <= CITIES.workRadius;
      expect(
        `${tile.col},${tile.row}: ${withinWorkRadius(state, city, tile.col, tile.row)}`,
      ).toBe(`${tile.col},${tile.row}: ${inside}`);
    }
    expect(withinWorkRadius(state, city, 8, 5)).toBe(true);
  });

  it('answers for ground no citizen could ever be sent to', () => {
    // The centre, a mountain and a rival's tile are all inside the ring and
    // none of them is assignable: a click on any of them is still a click about
    // *this* city, so the panel must not read it as walking away.
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    at(state.map, 9, 5).terrain = 'mountain';
    const rival = plant(state, 1, 10, 5);

    const assignable = new Set(
      assignableTiles(state, city).map((tile) => `${tile.col},${tile.row}`),
    );
    for (const cell of [
      { col: 8, row: 5 },
      { col: 9, row: 5 },
      { col: 10, row: 5 },
    ]) {
      expect(assignable.has(`${cell.col},${cell.row}`)).toBe(false);
      expect(withinWorkRadius(state, city, cell.col, cell.row)).toBe(true);
    }
    // And it is asked of a city, not of a player: the rival's own ring is its
    // own, and the two overlap without either answering for the other.
    expect(withinWorkRadius(state, rival, 8, 5)).toBe(true);
    expect(withinWorkRadius(state, city, 4, 5)).toBe(false);
  });

  it('wraps the seam and refuses a cell off the map', () => {
    const state = flatState();
    // A city on column 0 owns the ring that runs off the west edge and back
    // round the east one; the map is a cylinder, so that ring is not clipped.
    const city = plant(state, 0, 0, 5);
    expect(withinWorkRadius(state, city, state.map.width - 1, 5)).toBe(true);
    expect(withinWorkRadius(state, city, 0, -1)).toBe(false);
    expect(withinWorkRadius(state, city, 0, state.map.height)).toBe(false);
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
    expect(centreYield(state, city)).toEqual(readTileYield(CITIES.baseCityYields));

    // A hill centre keeps its own production and still gets the food floor.
    at(state.map, 8, 5).hills = true;
    expect(centreYield(state, city)).toEqual(
      readTileYield({ food: CITIES.baseCityYields.food, production: 2, gold: 0 }),
    );
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
      faith: 0,
    });
  });

  it('adds building effects, flooring each science-per-pop on its own', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.buildings = ['monument', 'granary', 'library'];
    const granary = buildingDef('granary');
    const library = buildingDef('library');

    city.population = 1;
    assignCitizens(state, city);
    const small = cityYields(state, city);
    expect(small.culture).toBe(CITIES.baseCulturePerCity + 2);
    expect(small.food).toBe(CITIES.baseCityYields.food + granary.food);
    // The population's own beaker, plus both of the library's terms — the flat
    // one and the per-citizen one, floored on its own.
    expect(small.science).toBe(1 + library.science + Math.floor(1 * library.sciencePerPop));

    city.population = 4;
    assignCitizens(state, city);
    // Through the happiness multiplier, which bites at this size: the two
    // rules compose in the documented order — every source floored on its own,
    // then the empire's percentage applied once to the sum.
    const factor = yieldFactor(meterEffects(state, city.ownerId), 'science');
    expect(cityYields(state, city).science).toBe(
      Math.floor((4 + library.science + Math.floor(4 * library.sciencePerPop)) * factor),
    );
  });

  /**
   * A building renewal, which is `improvements.json`'s `upgrades[].tech` said of
   * a building: The Wheel gives every granary an extra point of food.
   *
   * Asserted through the breakdown *and* the total, because rule 5 is that the
   * one is the fold of the other — a renewal that showed up in the number but
   * not in the list would be exactly the total-computed-beside-its-list the rule
   * forbids, and the city panel prints that list.
   */
  it('renews a building when its owner earns the technology, as its own line', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.buildings = ['granary'];
    const granary = buildingDef('granary');
    const renewal = granary.upgrades![0]!;

    const before = cityYields(state, city).food;
    expect(explainCityBuildings(state, city)).toHaveLength(1);

    state.players[0]!.techsResearched.push(renewal.tech);
    const entries = explainCityBuildings(state, city);
    expect(entries.map((entry) => entry.source)).toEqual([
      granary.name,
      techDef(renewal.tech).name,
    ]);
    expect(entries[1]!.building).toBe('granary');
    expect(cityYields(state, city).food).toBe(before + (renewal.add.food ?? 0));

    // And it reaches only the empire that earned it: the other seat's own
    // granary is untouched, which is the same rule `explainTileYield` keeps.
    const theirs = plant(state, 1, 12, 5);
    theirs.buildings = ['granary'];
    expect(explainCityBuildings(state, theirs)).toHaveLength(1);
  });

  /**
   * The barracks: a share of the hammers, but only behind a *unit*.
   *
   * The claim under test is not the ten percent, it is that there is exactly one
   * evaluator for it — the panel's rate, the estimate and the hammers the basket
   * actually receives are three readings of `cityYields`, so they cannot drift.
   */
  it('puts a building\'s production bonus behind a unit and nothing else', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.population = 6;
    assignCitizens(state, city);
    const bonus = buildingDef('barracks').productionBonus!.percent / 100;

    const unit = { kind: 'unit', id: 'warrior' } as QueueItem;
    const building = { kind: 'building', id: 'granary' } as QueueItem;
    const plain = cityYields(state, city).production;
    expect(productionModifiers(state, city, unit)).toEqual([]);

    city.buildings = ['barracks'];
    // A unit gets the bonus, floored once at the end; a building never does,
    // and neither does a city asked about itself rather than about a build.
    expect(cityYields(state, city, [], unit).production).toBe(Math.floor(plain * (1 + bonus)));
    expect(cityYields(state, city, [], building).production).toBe(plain);
    expect(cityYields(state, city).production).toBe(plain);
    expect(productionModifiers(state, city, unit)).toEqual([
      { source: 'Barracks', building: 'barracks', percent: bonus * 100 },
    ]);
    expect(productionModifiers(state, city, building)).toEqual([]);

    // And the basket really does fill at the modified rate: what the estimate
    // divided by is what the turn banks.
    city.queue = [unit];
    city.hammerBasket = 0;
    collectYields(state);
    expect(city.hammerBasket).toBe(Math.floor(plain * (1 + bonus)));
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
    const price = unitProductionCost(state, 0, 'settler');
    advanceProduction(state);
    expect(state.units).toHaveLength(1);
    expect(city.hammerBasket).toBe(500 - price);
  });
});

// ---------------------------------------------------------------------------

/**
 * The estimate the whole city screen quotes: the progress bar, every queue row,
 * and every "add to queue" button are three readings of `turnsToBuild`, so what
 * is covered here is what would otherwise drift between them — which position
 * the banked hammers belong to, and what happens at the edges of the arithmetic.
 */
describe('turnsToBuild', () => {
  it('is the shared filler over the shared price, and not a fourth opinion', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 3;

    const rate = cityYields(state, city).production;
    const cost = queueItemCost(state, 0, city.queue[0]!)!;
    expect(turnsToBuild(state, city, city.queue[0]!, 0)).toBe(turnsToFill(cost - 3, rate));
  });

  it('counts the basket for the front of the queue and for nothing behind it', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    const item: QueueItem = { kind: 'building', id: 'library' };
    city.queue = [item, item];
    // A basket one hammer short of the whole cost: the front row is nearly
    // done and the row behind it has not started, which is exactly the pair of
    // numbers a single estimate would get wrong.
    city.hammerBasket = buildingDef('library').cost - 1;

    const rate = cityYields(state, city).production;
    expect(turnsToBuild(state, city, item, 0)).toBe(turnsToFill(1, rate));
    expect(turnsToBuild(state, city, item, 1)).toBe(
      turnsToFill(buildingDef('library').cost, rate),
    );
    expect(turnsToBuild(state, city, item, 1)).toBeGreaterThan(
      turnsToBuild(state, city, item, 0)!,
    );
  });

  it('prices a row about to be appended at the queue length, which is 0 when empty', () => {
    // The "add to queue" grid asks at `city.queue.length`, so an empty city's
    // banked hammers are counted — they are indeed what the next thing queued
    // will be paid for — and a busy city's are not.
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    const item: QueueItem = { kind: 'unit', id: 'warrior' };
    city.hammerBasket = unitDef('warrior').cost;

    city.queue = [];
    expect(turnsToBuild(state, city, item, city.queue.length)).toBe(0);
    city.queue = [{ kind: 'building', id: 'monument' }];
    expect(turnsToBuild(state, city, item, city.queue.length)).toBeGreaterThan(0);
  });

  it('quotes a unit at the escalating price, never at the base one', () => {
    // The panel's estimate has to climb with `unitProductionCost` or it would
    // promise a settler on the strength of a price the empire stopped paying
    // three cities ago.
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    const item: QueueItem = { kind: 'unit', id: 'settler' };
    const first = turnsToBuild(state, city, item, 0);

    state.players[0]!.settlersBuilt = 4;
    expect(unitProductionCost(state, 0, 'settler')).toBeGreaterThan(unitDef('settler').cost);
    expect(turnsToBuild(state, city, item, 0)).toBeGreaterThan(first!);
  });

  it('is zero when the hammers are already banked, however much they overflow', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    city.hammerBasket = 5000;
    expect(turnsToBuild(state, city, { kind: 'building', id: 'university' }, 0)).toBe(0);
  });

  it('answers null — never a number — for an item it cannot price', () => {
    // A hand-edited save can name a building that no longer exists. `null` is
    // what the surfaces draw as an em dash; a `NaN` would draw as a plausible
    // schedule for something that will never be built.
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);
    const nonsense = { kind: 'building', id: 'zeppelin' } as unknown as QueueItem;
    expect(queueItemCost(state, 0, nonsense)).toBeNull();
    expect(turnsToBuild(state, city, nonsense, 0)).toBeNull();
  });

  it('answers null when the city makes no hammers at all', () => {
    // Not reachable from a real city today — `baseCityYields` floors a centre
    // at some production — so the branch is asked of the filler it delegates
    // to, which is the one place the rule is written.
    expect(turnsToFill(10, 0)).toBeNull();
    expect(turnsToFill(10, -1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('escalating settler cost', () => {
  const BASE = unitDef('settler').cost;
  const STEP = unitDef('settler').costIncrement!;

  /** A city big enough to finish a settler, with hammers to spare. */
  function settlerCity(state: GameState, ownerId: number, col: number, row: number): City {
    const city = plant(state, ownerId, col, row);
    city.population = unitDef('settler').minCityPop;
    city.queue = [{ kind: 'unit', id: 'settler' }];
    city.hammerBasket = 500;
    return city;
  }

  it('adds one increment for every settler its owner has already built', () => {
    const state = flatState();
    expect(STEP).toBeGreaterThan(0);
    expect(unitProductionCost(state, 0, 'settler')).toBe(BASE);

    state.players[0]!.settlersBuilt = 3;
    expect(unitProductionCost(state, 0, 'settler')).toBe(BASE + 3 * STEP);
    // Every player climbs their own ladder: one empire's sprawl is not another's.
    expect(unitProductionCost(state, 1, 'settler')).toBe(BASE);
  });

  it('leaves every type without an increment at its flat price', () => {
    const state = flatState();
    state.players[0]!.settlersBuilt = 5;
    for (const id of UNIT_TYPE_IDS) {
      const def = unitDef(id);
      if (def.costIncrement !== undefined) continue;
      expect(unitProductionCost(state, 0, id), id).toBe(def.cost);
    }
    // Exactly one type escalates today, and it is the one that founds cities.
    const escalating = UNIT_TYPE_IDS.filter((id) => unitDef(id).costIncrement !== undefined);
    expect(escalating).toEqual(['settler']);
    expect(unitDef('settler').foundsCity).toBe(true);
  });

  it('charges the price it quotes, and quotes the next one dearer', () => {
    const state = flatState();
    const city = settlerCity(state, 0, 8, 5);

    const first = queueItemCost(state, 0, city.queue[0]!)!;
    expect(first).toBe(BASE);
    advanceProduction(state);
    expect(city.hammerBasket).toBe(500 - first);
    expect(state.players[0]!.settlersBuilt).toBe(1);

    city.queue = [{ kind: 'unit', id: 'settler' }];
    const second = queueItemCost(state, 0, city.queue[0]!)!;
    expect(second).toBe(BASE + STEP);
    const banked = city.hammerBasket;
    advanceProduction(state);
    expect(city.hammerBasket).toBe(banked - second);
    expect(state.players[0]!.settlersBuilt).toBe(2);
    expect(unitProductionCost(state, 0, 'settler')).toBe(BASE + 2 * STEP);
  });

  it('re-prices a queued settler at every resolution, never at queue time', () => {
    // Two cities of one empire, both mid-settler, both quoted the same price
    // today. The first to finish makes the second dearer *while it is being
    // built* — the price is asked at the resolution, so the second city holds
    // its hammers and needs one more increment. See `advanceProduction`.
    const state = flatState();
    const first = settlerCity(state, 0, 5, 5);
    const second = settlerCity(state, 0, 11, 5);
    second.hammerBasket = BASE;
    expect(queueItemCost(state, 0, second.queue[0]!)).toBe(BASE);

    advanceProduction(state);
    expect(state.units).toHaveLength(1);
    expect(first.queue).toHaveLength(0);
    // Not a failure and not a dropped item: the hammers are all still there.
    expect(second.queue).toEqual([{ kind: 'unit', id: 'settler' }]);
    expect(second.hammerBasket).toBe(BASE);
    expect(queueItemCost(state, 0, second.queue[0]!)).toBe(BASE + STEP);

    // And it finishes the moment the extra increment is banked.
    second.hammerBasket = BASE + STEP;
    advanceProduction(state);
    expect(second.queue).toHaveLength(0);
    expect(second.hammerBasket).toBe(0);
    expect(state.players[0]!.settlersBuilt).toBe(2);
  });

  it('counts production only: not the settler a player starts with', () => {
    const game = createGame({
      seed: 31337,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#e8503a', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    expect(game.state.units.some((unit) => unitDef(unit.type).foundsCity)).toBe(true);
    for (const player of game.state.players) expect(player.settlersBuilt).toBe(0);
  });

  it('counts production only: not a settler taken off somebody else', () => {
    const state = flatState(16, 12, 'grassland');
    const theirs = settlerCity(state, 1, 8, 5);
    advanceProduction(state);
    const settler = state.units.find((unit) => unitDef(unit.type).foundsCity)!;
    expect(theirs.queue).toHaveLength(0);
    expect(state.players[1]!.settlersBuilt).toBe(1);

    // Walked out of its city, where it can be caught in the open.
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 1,
        unitId: settler.id,
        target: { col: 10, row: 5 },
      } as Command),
    ).toEqual({ ok: true });
    expect(`${settler.col},${settler.row}`).not.toBe('8,5');

    // Player 0 walks in and takes it. The unit changes hands; the bill does not.
    const raider = createUnit(state, 0, 'warrior', settler.col + 1, settler.row);
    expect(
      applyCommand(state, {
        type: 'attack',
        playerId: 0,
        unitId: raider.id,
        target: { col: settler.col, row: settler.row },
      } as Command),
    ).toEqual({ ok: true });
    expect(settler.ownerId).toBe(0);
    expect(state.players[0]!.settlersBuilt).toBe(0);
    expect(state.players[1]!.settlersBuilt).toBe(1);
    expect(unitProductionCost(state, 0, 'settler')).toBe(BASE);
  });

  it('replays a run of escalating settlers byte for byte', () => {
    const game = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
    expect(
      dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok,
    ).toBe(true);
    const capital = game.state.cities[0]!;

    for (let turn = 0; turn < 40; turn++) {
      if (capital.queue.length === 0 && capital.population >= unitDef('settler').minCityPop) {
        dispatch(game, {
          type: 'setCityProduction',
          playerId: 0,
          cityId: capital.id,
          queue: [{ kind: 'unit', id: 'settler' }],
        } as Command);
      }
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }

    // The run was long enough for the ladder to matter.
    expect(game.state.players[0]!.settlersBuilt).toBeGreaterThanOrEqual(3);
    expect(unitProductionCost(game.state, 0, 'settler')).toBe(
      BASE + STEP * game.state.players[0]!.settlersBuilt,
    );
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('carries the counter through a save and back', () => {
    const state = flatState();
    settlerCity(state, 0, 8, 5);
    advanceProduction(state);
    expect(state.players[0]!.settlersBuilt).toBe(1);

    const restored = clone(state);
    expect(restored.players[0]!.settlersBuilt).toBe(1);
    expect(unitProductionCost(restored, 0, 'settler')).toBe(BASE + STEP);
  });
});

describe('setCityProduction', () => {
  function set(playerId: number, cityId: number, queue: unknown): Command {
    return { type: 'setCityProduction', playerId, cityId, queue } as Command;
  }

  it('replaces the whole queue, in the order given', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // Monuments moved to Stonecraft in the Age I rework, and this test is about
    // the queue rather than about the tree, so the seat is simply given it.
    state.players[0]!.techsResearched.push('husbandry', 'earthenware', 'stonecraft');
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
    // A hill under the city, so the centre keeps a hill's production on top of
    // the `baseCityYields` floor and the queue moves at a visible pace.
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
          // Units only. Every building is behind a technology since the Age I
          // rework, and this game is driven *entirely by commands* so that its
          // log is a save file — a tech granted by reaching into the state
          // would not survive the replay these three tests exist to assert.
          // What is being measured is thirty turns of growth and production,
          // and a queue of units measures it exactly as well.
          queue: [
            { kind: 'unit', id: 'warrior' },
            { kind: 'unit', id: 'worker' },
            { kind: 'unit', id: 'scout' },
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
    // Units rather than buildings, for the reason the queue names: every
    // building is behind a technology now, and this log may not reach past the
    // reducer to grant one.
    expect(game.state.units.some((unit) => unit.type === 'worker')).toBe(true);
    expect(game.state.tileOwner.some((owner) => owner !== null)).toBe(true);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('round-trips a schema 13 save with cities and keeps playing in lockstep', () => {
    const game = twoCityGame();
    for (let turn = 0; turn < 12; turn++) {
      for (const player of game.state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }

    const json = saveGame(game);
    expect((JSON.parse(json) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);
    // Bumped to 12 by the M10 meters: cities grew `captured`, the one fact
    // happiness and authority cannot recompute from the board. (7 was combat —
    // `hasAttacked`, `fortifiedTurns`, `City.hp`, `eliminated`, `winnerId`;
    // 8 was resources; 9 was escalating settlers and `settlersBuilt`; 10 was
    // fog of war; 11 was workers and improvements.)
    expect(SCHEMA_VERSION).toBe(13);

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
