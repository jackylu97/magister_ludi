import { describe, expect, it } from 'vitest';
import { buildingDef } from '../../src/sim/buildingData';
import { type Command, applyCommand } from '../../src/sim/commands';
import {
  advanceProduction,
  assignCitizens,
  assignableTiles,
  bestExpansionTile,
  CENTRE_SOURCE,
  centreYield,
  cityYields,
  collectYields,
  expandBorders,
  explainCentreYield,
  explainBuildingPreview,
  explainCityBuildings,
  explainTileYield,
  foldBuildingPreview,
  foldTileYield,
  foundCityAt,
  foundingError,
  foundingErrorAt,
  citizenFocus,
  growCities,
  growthIsHalted,
  growthThreshold,
  nextBorderCost,
  nextCityName,
  planProduction,
  productionModifiers,
  productionSettledBy,
  queueItemCost,
  refreshCityDerived,
  refreshTileDerived,
  settleProduction,
  settleProductionWindfall,
  tileOwnerCityId,
  tileOwnerField,
  tileOwnerPlayerId,
  tileYieldOf,
  turnsToBuild,
  turnsToFill,
  unitProductionCost,
  withinWorkRadius,
  yieldContextFor,
  yieldScore,
} from '../../src/sim/cities';
import {
  type Game,
  createGame,
  dispatch,
  loadGame,
  replay,
  saveGame,
  snapshotState,
} from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import { meterEffects, yieldFactor } from '../../src/sim/meters';
import { RULES } from '../../src/sim/rulesData';
import { config, twoCityGame } from './citiesHelpers';
import {
  type City,
  type GameState,
  type QueueItem,
  type Unit,
  SCHEMA_VERSION,
  createUnit,
  newGame,
} from '../../src/sim/state';
import { chopYield } from '../../src/sim/improvementData';
import { firstBlocker } from '../../src/ui/turnBlockers';
import { UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { CITY_YIELD_KEYS, RESOURCE_IDS, resourceYield } from '../../src/sim/resourceData';
import {
  FEATURE_IDS,
  TERRAIN_IDS,
  TILE_YIELD_KEYS,
  readTileYield,
  tileYield,
} from '../../src/sim/terrainData';
import { beliefDef } from '../../src/sim/religionData';
import { runEndOfTurn } from '../../src/sim/turn';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

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

  it('lets a hill win over the terrain, and the canopy win over the hill', () => {
    // The order changed on 2026-08-27 (user: "if jungle or forest is on a hills
    // tile, the jungle/forest yield should take precedence"). A bare hill is
    // still a hill; a wooded one is worked by foresters, and hills-win had been
    // quietly turning every jungle hill into a mine.
    const hill = readTileYield({ food: 0, production: 2, gold: 0 });
    expect(tileYield('grassland', 'none', true)).toEqual(hill);
    expect(tileYield('grassland', 'forest', true)).toEqual(
      tileYield('grassland', 'forest', false),
    );
    expect(tileYield('desert', 'jungle', true)).toEqual(tileYield('desert', 'jungle', false));
    // Only a feature with an override of its own takes the hill's place —
    // `none` is the absence of a feature and leaves the hill standing.
    expect(tileYield('desert', 'none', true)).toEqual(hill);
  });

  it('agrees with explainTileYield on every combination — one algebra, two readings', () => {
    // `tileYield` is the table's pure answer and `explainTileYield` is the
    // game's; the second is the one that pays a citizen, and the first exists so
    // a caller with three fields and no `Tile` can ask. This is what keeps them
    // from drifting the next time the override order moves.
    for (const terrain of TERRAIN_IDS) {
      for (const feature of FEATURE_IDS) {
        for (const hills of [false, true]) {
          const map = createMap({ width: 3, height: 3, terrain });
          const tile = map.tiles[4]!;
          tile.feature = feature;
          tile.hills = hills;
          expect(
            foldTileYield(explainTileYield(tile)),
            `${terrain}/${feature}/${hills ? 'hills' : 'flat'}`,
          ).toEqual(tileYield(terrain, feature, hills));
        }
      }
    }
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

  /**
   * The spacing rule as a player hears it — *no city within three hexes of
   * another* — pinned at its literal numbers rather than symbolically, because
   * the symbolic tests above would go on passing through any change to the
   * value and this one is the statement of the rule itself.
   *
   * Three is not an arbitrary radius: it is `workRadius`, so the reserved ring
   * is exactly the ground the existing town already works. That identity is
   * asserted here, and it is why the two numbers are allowed to agree.
   */
  it('reserves the ring a city works: nothing may be founded within three hexes', () => {
    const state = flatState(20, 14);
    plant(state, 0, 8, 6);
    expect(CITIES.minCitySpacing).toBe(4);
    expect(CITIES.minCitySpacing).toBe(CITIES.workRadius + 1);

    const centre = tileHex(at(state.map, 8, 6));
    /** An unclaimed tile exactly `distance` hexes from that city. */
    const ring = (distance: number): Tile => {
      const tile = state.map.tiles.find(
        (candidate) =>
          wrappedDistance(state.map, tileHex(candidate), centre) === distance &&
          tileOwnerCityId(state, candidate.col, candidate.row) === null,
      );
      if (!tile) throw new Error(`No unclaimed tile ${distance} hexes out`);
      return tile;
    };

    // Two and three are refused *for the spacing*, not for belonging to anyone:
    // the opening claim only reaches one hex, so these are free ground the rule
    // is reserving all the same.
    for (const distance of [2, 3]) {
      expect(`${distance}: ${foundingErrorAt(state, 0, ring(distance))}`).toMatch(
        new RegExp(`^${distance}: .*is ${distance} tile\\(s\\) from the nearest city; 4 required$`),
      );
    }
    // Four is the first legal hex, and it is legal to everybody — the rule reads
    // the board, not the passports.
    expect(foundingErrorAt(state, 0, ring(4))).toBeNull();
    expect(foundingErrorAt(state, 1, ring(4))).toBeNull();
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

/**
 * The settler focus (playtest batch two): "a city should auto-work production
 * tiles when creating a settler".
 *
 * The marker is `growthIsHalted` — the front of the queue says `haltsGrowth` —
 * so nothing here compares a unit type against `"settler"`, and the day
 * something else stops a town growing it gets the same focus.
 */
describe('citizen focus while growth is halted', () => {
  /** A city with a farm and a mine in its ring, one citizen to place. */
  function farmVsMine(state: GameState): City {
    const farm = at(state.map, 8, 4);
    farm.terrain = 'grassland';
    farm.improvement = 'farm';
    const mine = at(state.map, 9, 4);
    mine.hills = true;
    mine.improvement = 'mine';
    const city = plant(state, 0, 8, 5);
    city.population = 1;
    return city;
  }

  it('takes the farm while the city is growing and the mine while it is not', () => {
    const state = flatState();
    const city = farmVsMine(state);
    // 3🌾 against 3⚙ — the ordinary sheet weights food above hammers.
    expect(tileYieldOf(at(state.map, 8, 4), yieldContextFor(state, 0))).toMatchObject({
      food: 3,
      production: 0,
    });
    expect(tileYieldOf(at(state.map, 9, 4), yieldContextFor(state, 0))).toMatchObject({
      food: 0,
      production: 3,
    });

    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,4']);
    expect(citizenFocus(city)).toBe('balanced');

    // A settler at the front banks no food toward growth, so the bushels go
    // nowhere and the hammers finish the settler.
    city.queue = [{ kind: 'unit', id: 'settler' }];
    expect(growthIsHalted(city)).toBe(true);
    expect(citizenFocus(city)).toBe('production');
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['9,4']);

    // Derived and idempotent, like every other assignment.
    const first = [...city.workedTiles];
    assignCitizens(state, city);
    expect(city.workedTiles).toEqual(first);

    // And it is only the *front* of the queue that decides.
    city.queue = [{ kind: 'unit', id: 'warrior' }, { kind: 'unit', id: 'settler' }];
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,4']);
  });

  it('keeps a pinned tile pinned, focus or no focus', () => {
    const state = flatState();
    const city = farmVsMine(state);
    city.queue = [{ kind: 'unit', id: 'settler' }];
    city.lockedTiles = [{ col: 8, row: 4 }];
    assignCitizens(state, city);
    // The player's pin outranks the focus, exactly as it outranks the score.
    expect(worked(city)).toEqual(['8,4']);
  });

  it('refuses the focus outright when it would starve the town', () => {
    const state = flatState();
    // Three farms and three mines, and a city too big to live on hammers.
    for (const [col, row] of [[8, 4], [9, 4], [8, 6]] as const) {
      const tile = at(state.map, col, row);
      tile.terrain = 'grassland';
      tile.improvement = 'farm';
    }
    for (const [col, row] of [[7, 4], [7, 5], [9, 6]] as const) {
      const tile = at(state.map, col, row);
      tile.hills = true;
      tile.improvement = 'mine';
    }
    const city = plant(state, 0, 8, 5);
    city.population = 3;
    city.queue = [{ kind: 'unit', id: 'settler' }];

    assignCitizens(state, city);
    // The focused sheet would have taken all three mines and left the town
    // eating six for a harvest of two. The focus is a preference, never a way
    // to starve a city, so the ordinary sheet is put back whole.
    expect(worked(city).sort()).toEqual(['8,4', '8,6', '9,4']);
    expect(cityYields(state, city).food).toBeGreaterThanOrEqual(
      city.population * RULES.cities.foodPerCitizen,
    );
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

/**
 * The city centre, and the rule ratified on 2026-08-25: **a centre pays
 * `baseCityYields`, and inherits the ground's own yield in any voice where the
 * ground pays more.** Per voice, across all six.
 *
 * The old reading floored food at three, which handed every flat capital a
 * point of food no ground had earned; the base is now 2🌾/2⚙ — a citizen's own
 * upkeep — and the difference between planting on grass and planting on a
 * river is the ground's to make. See `explainCentreYield` and the measured
 * pacing note in `test/sim/tech.test.ts`.
 */
describe('the city centre', () => {
  const base = readTileYield(CITIES.baseCityYields);
  const sourcesOf = (state: GameState, city: City): string[] =>
    explainCentreYield(state, city).map((entry) => entry.source);

  it('pays its own base on ground that pays less, and says so in one line', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // Desert pays nothing, so the base is the whole of it — and the breakdown
    // is the base line alone: there is nothing to inherit and no line claiming
    // there is.
    expect(centreYield(state, city)).toEqual(base);
    expect(sourcesOf(state, city)).toEqual([CENTRE_SOURCE]);
  });

  it('inherits the ground voice by voice where the ground pays more', () => {
    // The ratified example: a 3🌾/2🪙 seam under a town reads 3🌾/2⚙/2🪙 — the
    // food and the gold are the ground's, the production is the town's own.
    const state = flatState(16, 12, 'grassland');
    at(state.map, 8, 5).resource = 'cotton';
    const city = plant(state, 0, 8, 5);

    expect(centreYield(state, city)).toEqual(
      readTileYield({ food: 3, production: 2, gold: 2 }),
    );
    const lines = explainCentreYield(state, city);
    expect(lines.map((entry) => entry.source)).toEqual([CENTRE_SOURCE, 'Inherited · Cotton']);
    expect(lines[0]).toMatchObject({ kind: 'base', ...base });
    // The inherited line carries the *excess* and only the excess: the base
    // already covers the two hammers, so the line says nothing about them.
    expect(lines[1]).toMatchObject({ kind: 'add', food: 1, production: 0, gold: 2 });
  });

  it('names the ground that earned the inheritance, terrain included', () => {
    // An override is the tile's effective ground line, so an oasis is what the
    // extra food is inherited *from* — "move the town one hex and you lose it"
    // is the sentence the label has to be able to say.
    const state = flatState();
    at(state.map, 8, 5).feature = 'oasis';
    const city = plant(state, 0, 8, 5);
    expect(centreYield(state, city)).toEqual(readTileYield({ food: 3, production: 2, gold: 0 }));
    expect(sourcesOf(state, city)).toEqual([CENTRE_SOURCE, 'Inherited · Oasis']);
  });

  it('inherits nothing on a tie, in either voice', () => {
    // Grassland pays exactly the base's two food and less production; a hill
    // pays exactly its two production and less food. Neither exceeds anything,
    // so neither earns a line — a breakdown that itemized a tie would be
    // printing a zero and calling it an explanation.
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    expect(centreYield(state, city)).toEqual(base);
    expect(sourcesOf(state, city)).toEqual([CENTRE_SOURCE]);

    at(state.map, 8, 5).hills = true;
    expect(centreYield(state, city)).toEqual(base);
    expect(sourcesOf(state, city)).toEqual([CENTRE_SOURCE]);
  });

  /**
   * The rule stated over all six voices, and the fold identity with it.
   *
   * A single tile paying into all six at once is not reachable from the tables
   * today — no resource pays more than two voices and no terrain pays past
   * gold — so the honest form of "per voice, across all six" is the sweep: run
   * every resource in the table over flat ground and hills, assert
   * `max(base, ground)` in every voice every time, and assert the corpus
   * actually reaches all six so the sweep cannot go quietly vacuous.
   */
  it('is the per-voice maximum of its base and its ground, over the whole table', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    const centre = at(state.map, 8, 5);
    const ctx = yieldContextFor(state, 0);
    const reached = new Set<string>();

    for (const resource of RESOURCE_IDS) {
      for (const hills of [false, true]) {
        centre.resource = resource;
        centre.hills = hills;
        const ground = tileYieldOf(centre, ctx);
        const expected = readTileYield(CITIES.baseCityYields);
        for (const key of TILE_YIELD_KEYS) {
          expected[key] = Math.max(base[key], ground[key]);
          if (ground[key] > 0) reached.add(key);
        }
        const label = `${resource}${hills ? ' hills' : ''}`;
        expect(centreYield(state, city), label).toEqual(expected);
        // Rule 5, at the one scale it had not been held at: the number is the
        // fold of the list and there is no second implementation to drift.
        expect(foldTileYield(explainCentreYield(state, city)), label).toEqual(expected);
      }
    }

    expect([...reached].sort()).toEqual([...TILE_YIELD_KEYS].sort());
  });

  it('reads the ground through its owner, not through whoever is asking', () => {
    // Iron is invisible until Bronze Working, and the reveal binds the yield
    // (`explainTileYield`). A centre standing on it is worth the hammer only to
    // an empire that has heard of iron — the same rule one grade up.
    const state = flatState();
    const centre = at(state.map, 8, 5);
    centre.hills = true;
    centre.resource = 'iron';
    const city = plant(state, 0, 8, 5);
    const before = centreYield(state, city);

    state.players[0]!.techsResearched = [...state.players[0]!.techsResearched, 'bronzeWorking'];
    const after = centreYield(state, city);
    expect(after.production).toBeGreaterThan(before.production);
    expect(sourcesOf(state, city)).toEqual([CENTRE_SOURCE, 'Inherited · Iron']);
  });
});

describe('city yields', () => {

  it('adds the centre, the worked tiles, population science and base culture', () => {
    const state = flatState();
    at(state.map, 9, 6).terrain = 'grassland';
    const city = plant(state, 0, 8, 5);
    assignCitizens(state, city);

    // The one town this empire has is its capital, so the palace's coin is in
    // the gold (the maintenance ruling, 2026-08-28) — `explainPalaceYield`,
    // folded inside `cityYields` like every other list beside it.
    expect(cityYields(state, city)).toEqual({
      food: CITIES.baseCityYields.food + 2,
      production: CITIES.baseCityYields.production,
      gold: CITIES.baseCityYields.gold + CITIES.palaceGold,
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
   * The build screen's preview, and the reason it is not `explainBuildingYield`
   * (user, 2026-08-28: "orders + religion benefits should show in city build
   * screen … preview for barracks in the city build list should show +1 prod").
   *
   * The row's own answer for a barracks is *nothing* — it pays no flat yield at
   * all — which is exactly the number the playtest complained about, because a
   * seat holding God of the Forge is looking at a hammer the screen will not
   * admit to. The claim is that `explainBuildingPreview` asks the question the
   * player is actually asking: what would this town's yields become.
   */
  it('previews what a card would pay for a building the town has not built yet', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);

    // With no god, a barracks changes no yield this reading is about: its
    // productionBonus is a fact about a *build* (`toward`), never about the
    // town, and the preview says so by being empty.
    expect(explainBuildingPreview(state, city, 'barracks')).toEqual([]);

    // God of the Forge: "+1⚙ in every city with a Barracks" — a `cityYields`
    // effect scoped `hasBuilding: barracks`, which is invisible to every
    // evaluator that reads the building's own row.
    state.players[0]!.pantheon.beliefs.push('godOfTheForge');
    const lines = explainBuildingPreview(state, city, 'barracks');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.card).toBe('godOfTheForge');
    expect(lines[0]!.source).toMatch(new RegExp(beliefDef('godOfTheForge').name));
    expect(lines[0]!.production).toBe(1);
    expect(foldBuildingPreview(lines).production).toBe(1);

    // And the belief pays nothing until the barracks stands: the preview is a
    // *difference*, so the town's current yields are untouched by asking.
    expect(cityYields(state, city).production).toBe(
      cityYields(state, { ...city, buildings: [] }).production,
    );
  });

  it('is the fold of the true difference, rule 5 at the scale of a preview', () => {
    const state = flatState(16, 12, 'grassland');
    const city = plant(state, 0, 8, 5);
    city.population = 4;
    assignCitizens(state, city);
    // Two gods, one on a granary and one on a monument, so the preview has to
    // pick the right one out for each row — and the granary's own tile line
    // (food on water) rides along with it.
    state.players[0]!.pantheon.beliefs.push('keeperOfTheHearth', 'theStandingStones');

    for (const id of ['granary', 'monument', 'barracks', 'library'] as const) {
      const lines = explainBuildingPreview(state, city, id);
      const ghost = { ...city, buildings: [...city.buildings, id] };
      const gain = cityYields(state, ghost);
      const now = cityYields(state, city);
      const folded = foldBuildingPreview(lines);
      for (const key of CITY_YIELD_KEYS) {
        expect(folded[key], `${id} ${key}`).toBe(gain[key] - now[key]);
      }
    }

    // A building the town already has gains it nothing, and the caller needs no
    // special case for it.
    city.buildings.push('granary');
    expect(explainBuildingPreview(state, city, 'granary')).toEqual([]);
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
      { source: 'Barracks', building: 'barracks', percent: bonus * 100, stage: 'city' },
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
    // Retuned 2026-08-28 (user — "the first few population feel a bit slow
    // considering how fast other things seem to ramp up"): 10 · 6 · 1.65,
    // where it was 15 · 8 · 1.65. Both *height* terms came down and the
    // exponent did not move, so the discount is felt at the bottom and the
    // superlinear term takes it back — a third off the second citizen, a fifth
    // off the eighth. It was 15 · 24 · 34 · 45 · 56 · 69 · 82.
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(growthThreshold)).toEqual([
      10, 17, 25, 34, 43, 54, 65, 76,
    ]);
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
 * Entry XVIII: a one-time grant settles its bucket the moment it lands.
 *
 * Two claims, and they are the whole of the entry's first commitment:
 *
 *   1. **One routine.** `settleProduction` is what the end-of-turn phase does
 *      and what a chop does, so a windfall completion and a phase completion
 *      agree about the spawn, the escalation ladder and the overflow *by
 *      construction*. The A/B tests here are the outside check on that — they
 *      drive the two doors and compare what came out.
 *   2. **The player is not railroaded.** A settlement pops the queue and stops.
 *      An empty queue afterwards is the End Turn blocker's business, exactly as
 *      a newly founded city's is.
 *
 * The chop is the only windfall the game mints today, so it is the vehicle; the
 * claims are about the routine and inherit to every grant that calls it.
 */
describe('windfall settlement (Entry XVIII)', () => {
  const TIMBER = chopYield('forest').production;

  /** A player-0 city at (8, 5), a wood at (8, 4), and a worker standing in it. */
  function chopper(): { state: GameState; city: City; worker: Unit } {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    at(state.map, 8, 4).feature = 'forest';
    const player = state.players[0]!;
    if (!player.techsResearched.includes('mining')) player.techsResearched.push('mining');
    const worker = createUnit(state, 0, 'worker', 8, 4);
    return { state, city, worker };
  }

  const chop = (unitId: number): Command => ({ type: 'chopFeature', playerId: 0, unitId });

  it('completes an exactly-paid item and banks no overflow', () => {
    const { state, city, worker } = chopper();
    // Re-pinned 2026-08-28: the ×1.4 cost ruling left no building priced at
    // exactly what a wood pays (TIMBER=20 against 15/21/25/28…), so the edge —
    // `hammerBasket >= cost` with nothing over — is built by hand instead: top
    // the basket up to one wood short of the library's price first.
    city.queue = [{ kind: 'building', id: 'library' }];
    city.hammerBasket = buildingDef('library').cost - TIMBER;

    expect(applyCommand(state, chop(worker.id))).toEqual({ ok: true });
    expect(city.buildings).toEqual(['library']);
    expect(city.queue).toEqual([]);
    expect(city.hammerBasket).toBe(0);
  });

  it('completes an overpaid item and carries the exact overflow', () => {
    const { state, city, worker } = chopper();
    // Re-pinned 2026-08-28: the granary used to be the cheap building here
    // (15 < TIMBER=20), but the ×1.4 ruling put it above a single wood's
    // yield (21 > 20). The shrine is the one row still under TIMBER.
    city.queue = [
      { kind: 'building', id: 'shrine' },
      { kind: 'building', id: 'monument' },
    ];

    expect(applyCommand(state, chop(worker.id))).toEqual({ ok: true });
    expect(city.buildings).toEqual(['shrine']);
    // At most one item, exactly as the phase does it — the monument is still
    // queued and the change is in the basket.
    expect(city.queue).toEqual([{ kind: 'building', id: 'monument' }]);
    expect(city.hammerBasket).toBe(TIMBER - buildingDef('shrine').cost);
  });

  it('leaves the queue untouched when the timber does not cover the front', () => {
    const { state, city, worker } = chopper();
    expect(buildingDef('university').cost).toBeGreaterThan(TIMBER);
    city.queue = [{ kind: 'building', id: 'university' }];

    expect(applyCommand(state, chop(worker.id))).toEqual({ ok: true });
    // The hammers land, and that is all: a windfall is a very good turn's work,
    // never a discount.
    expect(city.hammerBasket).toBe(TIMBER);
    expect(city.buildings).toEqual([]);
    expect(city.queue).toEqual([{ kind: 'building', id: 'university' }]);
  });

  it('adds a windfall to what the basket already held', () => {
    const { state, city, worker } = chopper();
    city.queue = [{ kind: 'building', id: 'amphitheater' }];
    city.hammerBasket = buildingDef('amphitheater').cost - TIMBER;

    expect(applyCommand(state, chop(worker.id))).toEqual({ ok: true });
    expect(city.buildings).toEqual(['amphitheater']);
    expect(city.hammerBasket).toBe(0);
  });

  it('climbs the settler ladder exactly as the phase does', () => {
    // The A/B: the same city finishing the same settler through the two doors.
    // Escalation is the property most likely to be forgotten by a second
    // implementation, because it is the one that reaches outside the city.
    const windfall = chopper();
    windfall.city.population = unitDef('settler').minCityPop;
    windfall.city.queue = [{ kind: 'unit', id: 'settler' }];
    const price = unitProductionCost(windfall.state, 0, 'settler');
    windfall.city.hammerBasket = price - TIMBER;
    expect(applyCommand(windfall.state, chop(windfall.worker.id))).toEqual({ ok: true });

    const phase = chopper();
    phase.city.population = unitDef('settler').minCityPop;
    phase.city.queue = [{ kind: 'unit', id: 'settler' }];
    phase.city.hammerBasket = price;
    advanceProduction(phase.state);

    expect(windfall.state.players[0]!.settlersBuilt).toBe(1);
    expect(windfall.state.players[0]!.settlersBuilt).toBe(phase.state.players[0]!.settlersBuilt);
    // And the ladder is live from that instant: the empire's next settler is
    // dearer through both doors, by the same rung.
    expect(unitProductionCost(windfall.state, 0, 'settler')).toBeGreaterThan(price);
    expect(unitProductionCost(windfall.state, 0, 'settler')).toBe(
      unitProductionCost(phase.state, 0, 'settler'),
    );
    expect(windfall.city.hammerBasket).toBe(phase.city.hammerBasket);
  });

  it('spawns a mid-turn unit exactly as the phase spawns one, movement and all', () => {
    // The convention, stated as a test because it is a decision: a unit paid for
    // by a windfall is born through `createUnit` like every other, which means
    // full movement and an unspent attack — it can act on the turn the chop
    // bought it. That is the honest reading of "the moment of the gift is the
    // moment of the payoff", and matching the phase is what keeps it from being
    // a second kind of unit.
    const windfall = chopper();
    windfall.city.queue = [{ kind: 'unit', id: 'warrior' }];
    windfall.city.hammerBasket = unitDef('warrior').cost - TIMBER;
    expect(applyCommand(windfall.state, chop(windfall.worker.id))).toEqual({ ok: true });

    const phase = chopper();
    phase.city.queue = [{ kind: 'unit', id: 'warrior' }];
    phase.city.hammerBasket = unitDef('warrior').cost;
    advanceProduction(phase.state);

    const born = windfall.state.units.find((unit) => unit.type === 'warrior')!;
    const expected = phase.state.units.find((unit) => unit.type === 'warrior')!;
    expect(born).toBeDefined();
    expect(born.movesLeft).toBe(unitDef('warrior').movement);
    expect(born.hasAttacked).toBe(false);
    // Every field but the id, which is an allocation order and not a rule.
    expect({ ...born, id: 0 }).toEqual({ ...expected, id: 0 });
  });

  it('hands an empty queue to the End Turn blocker rather than forcing a choice', () => {
    const { state, city, worker } = chopper();
    // A shrine (see the ×1.4 re-pin above): the one non-wonder row a single
    // wood still completes outright.
    city.queue = [{ kind: 'building', id: 'shrine' }];

    expect(applyCommand(state, chop(worker.id))).toEqual({ ok: true });
    expect(city.queue).toEqual([]);
    // Nothing is chosen for the player and nothing is refused to them: the city
    // simply joins the list of things End Turn will stop on (Entry XVIII.4).
    expect(firstBlocker(state, 0)).toEqual({ kind: 'cityProduction', cityId: city.id });
  });

  it('re-seats the citizens, so the panel is not left reading last turn', () => {
    // The sanctioned-mid-turn-mutation half (Entry XVIII.3, and the register in
    // CLAUDE.md): `setLockedTiles`' precedent, applied to a settlement. The
    // assignment is the derived state the city panel reads, and a completion
    // that left it stale would show the player a screen their own click had
    // already made wrong.
    const { state, city, worker } = chopper();
    city.population = 2;
    city.workedTiles = [];
    city.queue = [{ kind: 'building', id: 'granary' }];

    expect(applyCommand(state, chop(worker.id))).toEqual({ ok: true });
    expect(city.workedTiles).toHaveLength(city.population);
    // Idempotent, which is what makes running it outside `collectYields` safe:
    // the phase recomputes it from scratch and reaches the same seats.
    const seated = worked(city);
    assignCitizens(state, city);
    expect(worked(city)).toEqual(seated);
  });

  it('re-seats them even when nothing completed, because the ground changed', () => {
    // The other side of the same rule, and it moved: a chop that banks hammers
    // without finishing anything still *took a forest off a tile*, which is a
    // mid-turn mutation of exactly what the panel derives. The settlement
    // refreshes for the completion's sake (`settleProductionWindfall`) and
    // `chopFeatureAt` refreshes for the ground's, so both paths leave the seats
    // fresh — see the register in `refreshCityDerived`.
    const { state, city, worker } = chopper();
    city.population = 2;
    city.workedTiles = [];
    city.queue = [{ kind: 'building', id: 'university' }];

    expect(applyCommand(state, chop(worker.id))).toEqual({ ok: true });
    expect(city.workedTiles).toHaveLength(city.population);
    // Idempotent, as every entry in the register has to be: the phase recomputes
    // it from scratch next turn and reaches the same seats.
    const seated = worked(city);
    assignCitizens(state, city);
    expect(worked(city)).toEqual(seated);
  });

  describe('the shared routine', () => {
    it('is what the phase is made of: one item per city, then stop', () => {
      const state = flatState();
      const city = plant(state, 0, 8, 5);
      city.queue = [
        { kind: 'building', id: 'shrine' },
        { kind: 'building', id: 'monument' },
      ];
      city.hammerBasket = 500;

      const done = settleProduction(state, city);
      expect(done?.name).toBe(buildingDef('shrine').name);
      expect(done?.cost).toBe(buildingDef('shrine').cost);
      expect(city.queue).toEqual([{ kind: 'building', id: 'monument' }]);
      // A second call takes the second item — which is exactly why the phase
      // calls it once per city per turn and not in a loop.
      expect(settleProduction(state, city)?.name).toBe(buildingDef('monument').name);
    });

    it('answers "would this complete" without touching anything', () => {
      const { state, city } = chopper();
      city.queue = [{ kind: 'building', id: 'granary' }];
      const before = clone(state);

      expect(planProduction(state, city)).toBeNull();
      expect(planProduction(state, city, buildingDef('granary').cost)).toMatchObject({
        kind: 'building',
        id: 'granary',
        cost: buildingDef('granary').cost,
      });
      expect(state).toEqual(before);
    });

    it('is the preview the worker sheet promises with', () => {
      // One evaluator, so "completes Shrine!" on the button and the completion
      // a moment later cannot disagree — no parallel arithmetic in the UI.
      // Shrine, not granary, since the ×1.4 re-pin above (2026-08-28) put the
      // granary above a single wood's yield.
      const { state, city } = chopper();
      city.queue = [{ kind: 'building', id: 'shrine' }];
      expect(productionSettledBy(state, city, TIMBER)).toBe(buildingDef('shrine').name);
      expect(productionSettledBy(state, city, 0)).toBeNull();

      city.queue = [{ kind: 'building', id: 'university' }];
      expect(productionSettledBy(state, city, TIMBER)).toBeNull();

      // And it respects every hold the settlement respects: a settler in a city
      // too small to send one out is not "one chop away" at any price.
      city.queue = [{ kind: 'unit', id: 'settler' }];
      city.population = unitDef('settler').minCityPop - 1;
      expect(productionSettledBy(state, city, 500)).toBeNull();
      city.population = unitDef('settler').minCityPop;
      expect(productionSettledBy(state, city, 500)).toBe(unitDef('settler').name);
    });

    it('drops a building the city already has, and calls it no completion', () => {
      const state = flatState();
      const city = plant(state, 0, 8, 5);
      city.buildings = ['granary'];
      city.queue = [{ kind: 'building', id: 'granary' }];
      city.hammerBasket = 500;

      expect(settleProductionWindfall(state, city)).toBeNull();
      expect(city.queue).toEqual([]);
      expect(city.buildings).toEqual(['granary']);
      expect(city.hammerBasket).toBe(500);
    });
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

  it('leaves every type without an increment off the ladder', () => {
    const state = flatState();
    state.players[0]!.settlersBuilt = 5;
    for (const id of UNIT_TYPE_IDS) {
      const def = unitDef(id);
      if (def.costIncrement !== undefined) continue;
      // A great person is neither built nor bought and has no unlock tech, so
      // it has no band either — see `tech.test.ts`'s reading of the exception.
      if (def.greatWork === true) continue;
      // Not `def.cost`: since the build-sink pass a later-age type is also
      // multiplied by its Æra band (Entry XXVI), which is a fact about the
      // *roster* and not about this empire. What the ladder must not do is
      // move — so the price is asked with and without five settlements and the
      // two answers have to agree.
      const priced = unitProductionCost(state, 0, id);
      state.players[0]!.settlersBuilt = 0;
      expect(unitProductionCost(state, 0, id), id).toBe(priced);
      state.players[0]!.settlersBuilt = 5;
      // And the band is the only thing between the printed cost and the price.
      const band = RULES.production.unitCostAgeMultiplier;
      const age = techDef(UNIT_UNLOCK_TECH.get(id)!).age;
      expect(priced, id).toBe(Math.floor(def.cost * (band[age - 1] ?? 1)));
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
    // The taking is an *advance* (user, 2026-08-28), so the result carries the
    // arrival that handed the settler over — `ok`, with news.
    const raider = createUnit(state, 0, 'warrior', settler.col + 1, settler.row);
    expect(
      applyCommand(state, {
        type: 'attack',
        playerId: 0,
        unitId: raider.id,
        target: { col: settler.col, row: settler.row },
      } as Command).ok,
    ).toBe(true);
    expect(settler.ownerId).toBe(0);
    expect(state.players[0]!.settlersBuilt).toBe(0);
    expect(state.players[1]!.settlersBuilt).toBe(1);
    expect(unitProductionCost(state, 0, 'settler')).toBe(BASE);
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

describe('the hoisted owner field', () => {
  // The whole of `tileOwnerField` rests on one invariant — `map.tiles[i]` is the
  // tile whose `tileIndex` is `i`, the same address `state.tileOwner` is indexed
  // by — and `createMap` is the only place that lays the array out. Asserted
  // here rather than assumed, because a sweep reading ownership positionally
  // would go quietly wrong rather than loudly wrong if that ever drifted.
  it('is indexed exactly like the map it parallels', () => {
    const { map } = flatState(9, 7);
    expect(map.tiles).toHaveLength(9 * 7);
    for (let index = 0; index < map.tiles.length; index++) {
      const tile = map.tiles[index]!;
      expect(tileIndex(map, tile.col, tile.row)).toBe(index);
    }
  });

  it('answers every hex exactly as the coordinate reading does', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    plant(state, 1, 11, 7);
    // Borders pushed out, so the field is asked about ground two cities took at
    // different moments rather than about two founding rings.
    for (const city of state.cities) city.culture = nextBorderCost(0) * 4;
    expandBorders(state);

    const field = tileOwnerField(state);
    let owned = 0;
    for (let index = 0; index < state.map.tiles.length; index++) {
      const tile = state.map.tiles[index]!;
      const byCoordinate = tileOwnerPlayerId(state, tile.col, tile.row);
      expect(field.at(index)).toBe(byCoordinate);
      if (byCoordinate !== null) owned += 1;
    }
    // The agreement above would be trivially true on an empty board.
    expect(owned).toBeGreaterThan(0);
  });

  it('reads a stale city id as unowned, exactly as the coordinate reading does', () => {
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    const tile = at(state.map, 4, 4);
    const index = tileIndex(state.map, tile.col, tile.row);
    // A city id that names nobody: the `?? null` arm both readings share.
    state.tileOwner[index] = city.id + 999;
    expect(tileOwnerPlayerId(state, tile.col, tile.row)).toBeNull();
    expect(tileOwnerField(state).at(index)).toBeNull();
  });

  it('is hoisted per sweep, so a change of hands is a fresh field away', () => {
    // Why the lifetime is one loop: the id→owner half is resolved at the moment
    // of hoisting, so a town that changes seat is only visible to a field built
    // after it did. Nothing in the sim holds one past its loop; this is the
    // property that would be broken if something started to.
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    const index = tileIndex(state.map, city.col, city.row);
    expect(tileOwnerField(state).at(index)).toBe(0);
    city.ownerId = 1;
    expect(tileOwnerField(state).at(index)).toBe(1);
    expect(tileOwnerPlayerId(state, city.col, city.row)).toBe(1);
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
    // Reshaped 2026-08-28 (user — "make early tiles easier to get with culture,
    // we can ramp more over time"): 6 · 4 · 1.45, where it was Civ 6's own
    // 10 · 6 · 1.3 and then 9 · 5.4 · 1.3. This is the first pass to move the
    // **exponent**, deliberately: the height comes down a third and the ramp
    // takes it back, so the eighth tile is 73 against the old 76 while the
    // first is 6 against 9. The schedule the monument band in
    // `territory.test.ts` is measured against.
    expect(nextBorderCost(0)).toBe(6);
    expect(nextBorderCost(1)).toBe(10);
    expect(nextBorderCost(2)).toBe(16);
    expect(nextBorderCost(3)).toBe(25);
    expect(nextBorderCost(4)).toBe(35);
    expect(nextBorderCost(7)).toBe(73);
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
  it('round-trips a schema 29 save with cities and keeps playing in lockstep', () => {
    const game = twoCityGame();
    for (let turn = 0; turn < 12; turn++) {
      for (const player of game.state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }

    const json = saveGame(game);
    expect((JSON.parse(json) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);
    // Bumped to 16 by sleep: `Unit.sleeping`, the `sleepUnit` command and the
    // `wakeSleepers` phase. (7 was combat — `hasAttacked`, `fortifiedTurns`,
    // `City.hp`, `eliminated`, `winnerId`; 8 was resources; 9 was escalating
    // settlers and `settlersBuilt`; 10 was fog of war; 11 was workers and
    // improvements; 12 was the meters' `captured`; 13 the luxuries; 14 tile
    // purchase; 15 barbarians and discoveries.) What this pins is not the
    // number but that a city save is carried by whatever the number is.
    expect(SCHEMA_VERSION).toBe(29);

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

// --- the reveal gate --------------------------------------------------------

describe('the reveal gate, in a city', () => {
  /**
   * A one-citizen city pinned onto an iron seam, for an empire that has
   * researched nothing. The pin is what makes the *yield* the variable: without
   * it the citizen would move when the seam became worth something, and the
   * comparison would be measuring two different tiles.
   */
  function seamCity(): { state: GameState; city: City; seam: Tile } {
    const state = flatState();
    state.players[0]!.techsResearched = [];
    const city = plant(state, 0, 8, 6);
    const seam = at(state.map, 8, 5);
    seam.resource = 'iron';
    city.population = 1;
    city.lockedTiles = [{ col: seam.col, row: seam.row }];
    assignCitizens(state, city);
    expect(worked(city)).toEqual(['8,5']);
    return { state, city, seam };
  }

  it('pays the city nothing for ore nobody has a word for', () => {
    const { state, city, seam } = seamCity();
    // The same city working the same tile, with the seam taken off the ground:
    // the two readings are identical, which is what "contributes no yield"
    // means — not a smaller number, the same number.
    const withSeam = cityYields(state, city);
    delete seam.resource;
    expect(cityYields(state, city)).toEqual(withSeam);
  });

  it('pays it the instant the technology lands, to the line', () => {
    // The reveal *moment*, which is the whole of the rule: the delta across the
    // discovery is exactly the resource's own row, and it arrives without any
    // command being issued or any turn being ended.
    const { state, city } = seamCity();
    const before = cityYields(state, city);
    state.players[0]!.techsResearched = ['bronzeWorking'];
    const after = cityYields(state, city);

    const line = resourceYield('iron');
    for (const key of TILE_YIELD_KEYS) {
      expect(`${key} +${after[key] - before[key]}`).toBe(`${key} +${line[key]}`);
    }
    expect(after.production).toBeGreaterThan(before.production);
  });

  it('sends the citizen to the seam only once the seam is worth going to', () => {
    // The assignment reads the same evaluator, so "grow toward land you would
    // work" cannot chase a hill this empire has no reason to want yet.
    const { state, city, seam } = seamCity();
    city.lockedTiles = [];
    assignCitizens(state, city);
    const blind = worked(city);
    state.players[0]!.techsResearched = ['bronzeWorking'];
    assignCitizens(state, city);
    expect(worked(city)).toEqual([`${seam.col},${seam.row}`]);
    expect(blind).not.toEqual(worked(city));
  });

  it('answers two empires differently about one tile, and stores neither', () => {
    // The gate is asked of the *owner's* context, not of the board: two players
    // looking at one seam get two different answers, and neither is stored.
    const { state, seam } = seamCity();
    state.players[1]!.techsResearched = ['bronzeWorking'];
    expect(tileYieldOf(seam, yieldContextFor(state, 0))).not.toEqual(
      tileYieldOf(seam, yieldContextFor(state, 1)),
    );
  });
});

// --- the mid-turn register --------------------------------------------------

/**
 * The register itself, asserted rather than trusted.
 *
 * Two of these are ordinary behavioural tests — the derived state a panel reads
 * is fresh after each registered command — and the third is honestly a **grep**:
 * it reads the three source files and checks that every mutation on the register
 * mentions the helper. A source assertion is a weak thing to defend a doctrine
 * with, and it is here anyway, for the one failure mode the behavioural tests
 * cannot see: somebody adding a *seventh* mid-turn mutation and hand-rolling the
 * refresh next to it, which works, passes everything, and quietly ends the
 * "there is one helper" claim that CLAUDE.md now makes. This fails the moment
 * one of the six stops calling it, and the list below is the register — adding a
 * mutation means adding a line here.
 */
describe('the mid-turn refresh register', () => {
  /**
   * The simulation's own text. Read through Vite's raw glob rather than through
   * `node:fs`, because this project has no node typings and a source assertion
   * is not worth a dependency.
   */
  const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  function source(file: string): string {
    const key = Object.keys(SIM_SOURCE).find((path) => path.endsWith(`/${file}`));
    expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
    return SIM_SOURCE[key!]!;
  }

  /** One function's body, from its declaration to the next top-level brace. */
  function bodyOf(file: string, name: string): string {
    const text = source(file);
    const start = text.indexOf(`export function ${name}(`);
    const from = start === -1 ? text.indexOf(`function ${name}(`) : start;
    expect(`${file}:${name} found`).toBe(from === -1 ? `${file}:${name} missing` : `${file}:${name} found`);
    const end = text.indexOf('\n}', from);
    return text.slice(from, end === -1 ? undefined : end);
  }

  /** The register. A new mid-turn yield mutation adds itself here. */
  const REGISTER: { file: string; fn: string }[] = [
    { file: 'commands.ts', fn: 'applySetLockedTiles' },
    { file: 'cities.ts', fn: 'purchaseTileAt' },
    { file: 'cities.ts', fn: 'settleProductionWindfall' },
    { file: 'improvements.ts', fn: 'buildImprovementAt' },
    { file: 'improvements.ts', fn: 'pillageAt' },
    { file: 'improvements.ts', fn: 'chopFeatureAt' },
    { file: 'cities.ts', fn: 'foundCityAt' },
    // The border bucket's own settlement (2026-08-27): culture poured into a
    // *town's bounds* claims its ground on the spot, and the hex it takes is a
    // hex a citizen may now be sent to.
    { file: 'cities.ts', fn: 'settleBorderWindfall' },
    // The trade verbs: a route's food and hammers are lines of the *origin's*
    // yields, so the town is richer the turn a caravan sets out and poorer the
    // turn its route ends.
    { file: 'trade.ts', fn: 'startRouteAt' },
    { file: 'trade.ts', fn: 'endRoute' },
  ];

  it('routes every registered mutation through the one helper', () => {
    for (const { file, fn } of REGISTER) {
      const body = bodyOf(file, fn);
      const calls = /refresh(City|Tile)Derived\(/.test(body);
      expect(`${fn} refreshes`).toBe(calls ? `${fn} refreshes` : `${fn} does not refresh`);
    }
  });

  it('keeps the helper the only place assignment runs outside the phase', () => {
    // In the whole simulation `assignCitizens` is *called* by exactly two
    // things: the turn phase that owns it, and the helper. Anything else is the
    // register being routed around, which is the failure this file exists for.
    const callers: string[] = [];
    for (const file of ['cities.ts', 'commands.ts', 'improvements.ts', 'turn.ts']) {
      for (const line of source(file).split('\n')) {
        if (!/(?<![\w.])assignCitizens\(/.test(line)) continue;
        if (/function assignCitizens/.test(line)) continue;
        callers.push(`${file}: ${line.trim()}`);
      }
    }
    expect(callers).toEqual([
      'cities.ts: assignCitizens(state, city);',
      'cities.ts: assignCitizens(state, city);',
    ]);
    // And by name, so that two calls in the wrong two places cannot pass:
    expect(bodyOf('cities.ts', 'collectYields')).toMatch(/assignCitizens\(/);
    expect(bodyOf('cities.ts', 'refreshCityDerived')).toMatch(/assignCitizens\(/);
  });

  it('exports a helper that is one call and idempotent', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 6);
    city.population = 2;
    city.workedTiles = [];
    refreshCityDerived(state, city);
    const seated = worked(city);
    expect(seated).toHaveLength(2);
    refreshCityDerived(state, city);
    expect(worked(city)).toEqual(seated);
  });

  it('refreshes the city that owns a tile, and nothing when nobody does', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 6);
    city.population = 2;
    city.workedTiles = [];
    // Unowned ground: no panel is quoting it, so this is a no-op rather than an
    // error — which is what lets `pillageAt` call it without asking first.
    refreshTileDerived(state, at(state.map, 1, 1));
    expect(city.workedTiles).toEqual([]);
    refreshTileDerived(state, at(state.map, 8, 5));
    expect(city.workedTiles).toHaveLength(2);
  });
});
