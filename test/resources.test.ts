import { describe, expect, it } from 'vitest';

import { buildingDef } from '../src/sim/buildingData';
import { advanceProduction, foundCityAt, hasResource, tileYieldOf } from '../src/sim/cities';
import { applyCommand } from '../src/sim/commands';
import { createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../src/sim/map';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES, generateMap, generateMapDetail } from '../src/sim/mapgen';
import {
  RESOURCE_DATA,
  RESOURCE_IDS,
  type ResourceId,
  isBonusFood,
  isResourceId,
  resourceDef,
  resourceYield,
  resourcesOfKind,
} from '../src/sim/resourceData';
import { landTileCount, tileSuitsResource } from '../src/sim/resources';
import { RULES } from '../src/sim/rulesData';
import { chooseStartPositions } from '../src/sim/startPositions';
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  newGame,
} from '../src/sim/state';
import { buildError, isResourceVisible, requiredResource, visibleResourceAt } from '../src/sim/tech';
import { FEATURE_IDS, TERRAIN_IDS, isWaterTerrain, tileYield } from '../src/sim/terrainData';
import { TECH_IDS } from '../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../src/sim/unitData';

const CONFIG = MAPGEN_CONFIG.resources;

/** The sizes and seeds every sweep below runs over. Small enough to stay fast. */
const SAMPLES: [number, string][] = [
  [1, 'duel'],
  [1234, 'duel'],
  [31337, 'duel'],
  [7, 'standard'],
  [2024, 'standard'],
  [99, 'large'],
];

function resourceTiles(map: GameMap): Tile[] {
  return map.tiles.filter((tile) => tile.resource !== undefined);
}

// --- the table --------------------------------------------------------------

describe('the resource table', () => {
  it('names twelve resources across the three kinds', () => {
    expect(RESOURCE_IDS).toHaveLength(12);
    expect(resourcesOfKind('bonus')).toEqual(['wheat', 'cattle', 'deer', 'fish', 'stone']);
    expect(resourcesOfKind('strategic')).toEqual(['horses', 'iron']);
    expect(resourcesOfKind('luxury')).toEqual(['gems', 'silk', 'wine', 'spices', 'salt']);
  });

  it('only ever names terrains, features and technologies that exist', () => {
    for (const id of RESOURCE_IDS) {
      const def = resourceDef(id);
      expect(def.validTerrain.length).toBeGreaterThan(0);
      for (const terrain of def.validTerrain) expect(TERRAIN_IDS).toContain(terrain);
      for (const feature of def.validFeatures ?? []) expect(FEATURE_IDS).toContain(feature);
      if (def.requiresTech !== undefined) expect(TECH_IDS).toContain(def.requiresTech);
      expect(def.frequency).toBeGreaterThan(0);
    }
  });

  it('never puts a resource on a terrain no citizen could work', () => {
    // Mountains are the case, and the guard is *data*: nothing in the placement
    // loop knows what a mountain is, so this is the only thing keeping wheat off
    // a summit.
    for (const id of RESOURCE_IDS) {
      expect(resourceDef(id).validTerrain).not.toContain('mountain');
    }
  });

  it('pays something for every resource, and never a negative', () => {
    for (const id of RESOURCE_IDS) {
      const value = resourceYield(id);
      expect(value.food + value.production + value.gold).toBeGreaterThan(0);
      for (const amount of [value.food, value.production, value.gold]) {
        expect(amount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('hands back a fresh yield object, so a caller cannot retune the game', () => {
    const first = resourceYield('wheat');
    first.food += 99;
    expect(resourceYield('wheat').food).toBe(RESOURCE_DATA.resources.wheat.yields.food);
  });

  it('tech-gates exactly the strategics that are meant to be hidden', () => {
    expect(resourceDef('iron').requiresTech).toBe('bronzeWorking');
    // Horses are deliberately ungated in v1 — a mounted line the player cannot
    // see the reason for is worse than one they can plan around.
    expect(resourceDef('horses').requiresTech).toBeUndefined();
    for (const id of RESOURCE_IDS) {
      if (resourceDef(id).kind === 'strategic') continue;
      expect(resourceDef(id).requiresTech).toBeUndefined();
    }
  });

  it('recognises its own ids and nothing else', () => {
    expect(isResourceId('horses')).toBe(true);
    expect(isResourceId('unobtanium')).toBe(false);
    expect(isResourceId(7)).toBe(false);
  });

  it('knows which resources the fairness pass may plant', () => {
    expect(RESOURCE_IDS.filter(isBonusFood)).toEqual(['wheat', 'cattle', 'deer', 'fish']);
  });
});

// --- placement --------------------------------------------------------------

describe('placement', () => {
  it('never puts a resource on ground its own rules refuse', () => {
    for (const [seed, size] of SAMPLES) {
      const map = generateMap(seed, size);
      for (const tile of resourceTiles(map)) {
        const def = resourceDef(tile.resource!);
        expect(tileSuitsResource(tile, def)).toBe(true);
      }
    }
  });

  it('keeps different finds apart by the configured spacing', () => {
    // Two tiles of *different* resources closer than `minSpacing` would mean the
    // rejection sampling leaked; two of the same are a cluster and are allowed
    // to touch, which is the whole reason the rule is stated this way.
    for (const [seed, size] of SAMPLES) {
      const map = generateMap(seed, size);
      const tiles = resourceTiles(map);
      for (const tile of tiles) {
        for (const near of mapRange(map, tileHex(tile), CONFIG.minSpacing - 1)) {
          if (near === tile || near.resource === undefined) continue;
          expect(near.resource).toBe(tile.resource);
        }
      }
    }
  });

  it('grows clusters: some finds are more than one tile', () => {
    const map = generateMap(1234, 'standard');
    // Horses ask for two or three tiles a find, so a whole standard map with no
    // adjacent pair at all would mean the cluster walk never ran.
    const herds = map.tiles.filter(
      (tile) =>
        tile.resource === 'horses' &&
        mapRange(map, tileHex(tile), 1).some(
          (near) => near !== tile && near.resource === 'horses',
        ),
    );
    expect(herds.length).toBeGreaterThan(0);
  });

  it('holds the density inside a band on every size', () => {
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of [1, 4242]) {
        const map = generateMap(seed, size);
        const per1000 = (resourceTiles(map).length / landTileCount(map)) * 1000;
        // The budget is the floor; the fairness pass and a cluster that ran a
        // tile over the target are what push it above. A band rather than an
        // equality, because both of those are deliberate.
        expect(per1000).toBeGreaterThanOrEqual(CONFIG.countPer1000LandTiles * 0.9);
        expect(per1000).toBeLessThanOrEqual(CONFIG.countPer1000LandTiles * 1.35);
      }
    }
  });

  it('places every kind, not just the cheap ones', () => {
    const map = generateMap(1, 'large');
    const kinds = new Set(resourceTiles(map).map((tile) => resourceDef(tile.resource!).kind));
    expect(kinds).toEqual(new Set(['bonus', 'strategic', 'luxury']));
  });

  it('is deterministic in the seed, and different for another', () => {
    const digest = (map: GameMap): string =>
      map.tiles.map((tile) => tile.resource ?? '').join(',');
    expect(digest(generateMap(4242, 'duel'))).toBe(digest(generateMap(4242, 'duel')));
    expect(digest(generateMap(4242, 'duel'))).not.toBe(digest(generateMap(4243, 'duel')));
  });

  it('survives a JSON round trip with the resources on it', () => {
    const map = generateMap(1234, 'duel');
    expect(JSON.parse(JSON.stringify(map))).toEqual(map);
    // Absent, not `'none'`: a bare tile and a tile that lost its resource must
    // serialise identically. See the `Tile.resource` docblock.
    const bare = map.tiles.find((tile) => tile.resource === undefined)!;
    expect(Object.prototype.hasOwnProperty.call(bare, 'resource')).toBe(false);
  });
});

/**
 * The rivers milestone's promise, kept: a pass added *after* the existing dice
 * must not move the ground under them.
 *
 * The hashes below were taken from the generator as it stood immediately before
 * resources existed, by running the previous revision of `src/sim/` side by side
 * with this one. They cover terrain, feature, hills, both noise fields, the
 * river edge masks and the freshwater flag — everything a tile is except the
 * resource itself. If a future pass draws from `rng` before `traceRivers`, this
 * is the test that says so.
 */
describe('the ground did not move', () => {
  function hashTerrain(map: GameMap): string {
    let h = 0x811c9dc5;
    const push = (s: string): void => {
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
    };
    for (const t of map.tiles) {
      push(
        `${t.terrain}|${t.feature}|${t.hills ? 1 : 0}|${t.elevation}|${t.moisture}|` +
          `${t.riverEdges}|${t.freshwater ? 1 : 0};`,
      );
    }
    return (h >>> 0).toString(16);
  }

  const FIXTURES: [number, string, string][] = [
    [1234, 'duel', 'a7c1e5c'],
    [7, 'duel', '858271ce'],
    [31337, 'standard', 'b253ce9f'],
    [99, 'large', 'a636c44c'],
    [2024, 'huge', 'ba91ba48'],
  ];

  it('reproduces the pre-resource generator exactly', () => {
    for (const [seed, size, expected] of FIXTURES) {
      expect(`${seed}/${size}: ${hashTerrain(generateMap(seed, size))}`).toBe(
        `${seed}/${size}: ${expected}`,
      );
    }
  });

  it('leaves the rivers and the lakes where they were', () => {
    // River *counts* per seed, likewise measured before this milestone. The
    // hashes above already cover the edge masks; this is the reading that fails
    // legibly when somebody moves the resource draw too early.
    const counts: [number, string, number, number][] = [
      [1234, 'duel', 7, 0],
      [31337, 'standard', 29, 4],
      [2024, 'huge', 57, 2],
    ];
    for (const [seed, size, rivers, lakes] of counts) {
      const detail = generateMapDetail(seed, size);
      expect([detail.rivers.length, detail.lakeCount]).toEqual([rivers, lakes]);
    }
  });
});

describe('the fairness pass', () => {
  it('gives every possible start a bonus food within the configured radius', () => {
    for (const [seed, size] of SAMPLES) {
      const map = generateMap(seed, size);
      const starts = chooseStartPositions(map, RULES.game.maxPlayers);
      expect(starts.length).toBeGreaterThan(0);
      for (const start of starts) {
        const near = mapRange(map, tileHex(start), CONFIG.startFoodRadius);
        const fed = near.some(
          (tile) => tile.resource !== undefined && isBonusFood(tile.resource),
        );
        expect(`${seed}/${size} @ (${start.col},${start.row}) fed`).toBe(
          `${seed}/${size} @ (${start.col},${start.row}) ${fed ? 'fed' : 'starving'}`,
        );
      }
    }
  });

  it('covers a real game\'s starts, because it plants for the maximum roster', () => {
    // `chooseStartPositions(map, n)` is a prefix of the same call for a larger
    // n, so planting for `maxPlayers` covers every game the map can host. That
    // is the property the pass leans on, so it is asserted rather than assumed.
    const map = generateMap(31337, 'standard');
    const all = chooseStartPositions(map, RULES.game.maxPlayers);
    for (let n = 1; n <= 4; n++) {
      expect(chooseStartPositions(map, n)).toEqual(all.slice(0, n));
    }
  });

  it('rolls no dice: it runs identically whatever the scatter left', () => {
    // The pass consumes nothing from `rng`, so two generations of one seed agree
    // tile for tile — including the tiles the guarantee planted.
    const a = generateMap(11, 'duel');
    const b = generateMap(11, 'duel');
    expect(a.tiles.map((t) => t.resource ?? '')).toEqual(b.tiles.map((t) => t.resource ?? ''));
  });
});

// --- yields -----------------------------------------------------------------

describe('resource yields', () => {
  function tileWith(resource: ResourceId | undefined, patch: Partial<Tile> = {}): Tile {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const tile = map.tiles[4]!;
    Object.assign(tile, patch);
    if (resource !== undefined) tile.resource = resource;
    return tile;
  }

  it('adds to the terrain yield rather than replacing it', () => {
    expect(tileYieldOf(tileWith(undefined))).toEqual({ food: 2, production: 0, gold: 0 });
    expect(tileYieldOf(tileWith('wheat'))).toEqual({ food: 3, production: 0, gold: 0 });
  });

  it('adds *after* the feature override, not before it', () => {
    // A forest replaces grassland's 2/0/0 with 1/1/0; the deer then adds a food
    // to what the forest left, which is 2/1/0 and not 3/1/0.
    const forest = tileWith('deer', { feature: 'forest' });
    expect(tileYield('grassland', 'forest', false)).toEqual({ food: 1, production: 1, gold: 0 });
    expect(tileYieldOf(forest)).toEqual({ food: 2, production: 1, gold: 0 });
  });

  it('adds *after* the hills override, which wins over everything else', () => {
    const hill = tileWith('gems', { hills: true });
    expect(tileYieldOf(hill)).toEqual({ food: 0, production: 2, gold: 2 });
  });

  it('pays more than one voice when the table says so', () => {
    const salt = tileWith('salt', { terrain: 'desert' });
    expect(tileYieldOf(salt)).toEqual({ food: 1, production: 0, gold: 1 });
  });

  it('leaves a mountain unworkable however rich it is', () => {
    // No resource names a mountain, so this is a guard rather than a rule — but
    // workability is asked of the terrain, never of the yield, and that is worth
    // holding still.
    const peak = tileWith('iron', { terrain: 'mountain' });
    expect(tileYieldOf(peak)).toEqual({ food: 0, production: 1, gold: 0 });
    expect(TERRAIN_IDS.includes('mountain')).toBe(true);
  });
});

// --- strategic gating -------------------------------------------------------

/** A two-player game on blank grassland, with no resources anywhere. */
function bareState(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  // Every technology, so the *only* thing that can refuse a queue is a resource.
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

describe('strategic resources gate production', () => {
  it('names the resource each unit line needs, from the data', () => {
    expect(requiredResource('unit', 'horseman')).toBe('horses');
    expect(requiredResource('unit', 'chariot')).toBe('horses');
    expect(requiredResource('unit', 'knight')).toBe('horses');
    expect(requiredResource('unit', 'swordsman')).toBe('iron');
    expect(requiredResource('unit', 'longswordsman')).toBe('iron');
    expect(requiredResource('unit', 'warrior')).toBeNull();
    expect(requiredResource('building', 'library')).toBeNull();
  });

  it('every gated unit names a resource the table actually has', () => {
    for (const id of UNIT_TYPE_IDS) {
      const needs = unitDef(id).requiresResource;
      if (needs === undefined) continue;
      expect(RESOURCE_IDS).toContain(needs);
      expect(resourceDef(needs).kind).toBe('strategic');
    }
  });

  it('counts a resource as held when a tile the player owns carries it', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    expect(hasResource(state, 0, 'horses')).toBe(false);

    // Inside the city's own ring, so `foundCityAt` already claimed it.
    at(state, 5, 4).resource = 'horses';
    expect(hasResource(state, 0, 'horses')).toBe(true);
    // The other player owns nothing, so the same tile does nothing for them.
    expect(hasResource(state, 1, 'horses')).toBe(false);
    expect(city.ownerId).toBe(0);
  });

  it('does not count a resource on unclaimed ground', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    // Far outside the opening ring: seen, wanted, not owned.
    at(state, 11, 9).resource = 'iron';
    expect(hasResource(state, 0, 'iron')).toBe(false);
  });

  it('follows a captured city, because ownership is the city\'s', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    expect(hasResource(state, 0, 'iron')).toBe(true);
    expect(hasResource(state, 1, 'iron')).toBe(false);
    // Capture is exactly this: the city changes hands and its territory follows.
    city.ownerId = 1;
    expect(hasResource(state, 0, 'iron')).toBe(false);
    expect(hasResource(state, 1, 'iron')).toBe(true);
  });

  it('refuses a queue for a unit whose resource the player lacks', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const result = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'swordsman' }],
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toBe('Swordsman needs Iron');
    // Validate-fully: a refused command leaves the queue exactly as it was.
    expect(city.queue).toEqual([]);
  });

  it('accepts the same queue the moment the player owns the tile', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    const result = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'swordsman' }],
    });
    expect(result.ok).toBe(true);
    expect(city.queue).toEqual([{ kind: 'unit', id: 'swordsman' }]);
  });

  it('is one gate: the panel and the reducer read the same sentence', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    // What the city panel disables a button with, and what the reducer refuses
    // with, are the same call. A divergence here is a button that lies.
    expect(buildError(state, 0, 'unit', 'horseman')).toBe('Horseman needs Horses');
    expect(buildError(state, 0, 'unit', 'warrior')).toBeNull();
    expect(buildError(state, 0, 'building', 'library')).toBeNull();
    expect(buildingDef('library').name).toBe('Library');
  });

  it('reports the technology first when both gates would refuse', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    state.players[0]!.techsResearched = [];
    // A player with neither Iron Working nor iron should be told about the
    // technology: the ore is not their problem yet.
    expect(buildError(state, 0, 'unit', 'swordsman')).toBe('Swordsman needs Iron Working');
  });

  it('holds production rather than dropping it when the resource is lost', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    city.queue = [{ kind: 'unit', id: 'swordsman' }];
    city.hammerBasket = 1000;

    // The iron hill changes hands mid-build. The hammers stay in the basket and
    // the item stays at the front — the same rule `minCityPop` gets.
    delete at(state, 5, 4).resource;
    advanceProduction(state);
    expect(city.queue).toEqual([{ kind: 'unit', id: 'swordsman' }]);
    expect(city.hammerBasket).toBe(1000);
    expect(state.units).toHaveLength(0);

    at(state, 5, 4).resource = 'iron';
    advanceProduction(state);
    expect(city.queue).toEqual([]);
    expect(state.units.map((unit) => unit.type)).toEqual(['swordsman']);
  });
});

// --- visibility -------------------------------------------------------------

describe('what a player may be told', () => {
  it('shows everything that is not tech-gated to everybody', () => {
    const state = bareState();
    state.players[0]!.techsResearched = [];
    for (const id of RESOURCE_IDS) {
      if (resourceDef(id).requiresTech !== undefined) continue;
      expect(isResourceVisible(state, 0, id)).toBe(true);
    }
  });

  it('hides iron until Bronze Working, per player', () => {
    const state = bareState();
    state.players[0]!.techsResearched = [];
    state.players[1]!.techsResearched = ['bronzeWorking'];
    const tile = at(state, 3, 3);
    tile.resource = 'iron';

    expect(isResourceVisible(state, 0, 'iron')).toBe(false);
    expect(visibleResourceAt(state, 0, tile)).toBeNull();
    expect(visibleResourceAt(state, 1, tile)).toBe('iron');
  });

  it('hides the label and never the yield', () => {
    // The citizens are already collecting the production; a panel that hid the
    // number would be a lie the city has to keep telling every turn.
    const state = bareState();
    state.players[0]!.techsResearched = [];
    const tile = at(state, 3, 3);
    tile.resource = 'iron';
    expect(visibleResourceAt(state, 0, tile)).toBeNull();
    expect(tileYieldOf(tile)).toEqual({ food: 2, production: 1, gold: 0 });
    expect(hasResource(state, 0, 'iron')).toBe(false);
  });

  it('answers null for a tile with nothing on it', () => {
    const state = bareState();
    expect(visibleResourceAt(state, 0, at(state, 2, 2))).toBeNull();
  });
});

// --- the save file ----------------------------------------------------------

describe('resources and the save file', () => {
  const config: GameConfig = {
    seed: 20250821,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#d4502e', isHuman: true },
      { name: 'B', color: '#1f8a85', isHuman: false },
    ],
  };

  it('carries a schema version at or past the one this milestone bumped to', () => {
    // Resources bumped it to 8; escalating settlers took it to 9. The check is
    // that a save from this build refuses an older reader, not that the number
    // has stopped moving.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(8);
  });

  it('round-trips a game and comes back with the same resources on the map', () => {
    const game = createGame(config);
    for (let turn = 0; turn < 6; turn++) {
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    const loaded = loadGame(saveGame(game));
    expect(snapshotState(loaded.state)).toBe(snapshotState(game.state));
    expect(loaded.state.map.tiles.map((t) => t.resource ?? '')).toEqual(
      game.state.map.tiles.map((t) => t.resource ?? ''),
    );
  });

  it('replays to a byte-identical state, resources included', () => {
    const game = createGame(config);
    for (let turn = 0; turn < 8; turn++) {
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('puts a resource somewhere inside a real game\'s opening territory', () => {
    // Not a rule, a smoke test: a generated duel map with two starts should have
    // *something* worth working near one of them, or the fairness pass and the
    // scatter are both doing nothing.
    const game = createGame(config);
    const nearStarts = game.state.units.some((unit) => {
      const tile = getTileAt(game.state.map, unit.col, unit.row)!;
      return mapRange(game.state.map, tileHex(tile), 3).some((t) => t.resource !== undefined);
    });
    expect(nearStarts).toBe(true);
  });
});

// --- housekeeping -----------------------------------------------------------

describe('the placement helpers', () => {
  it('counts land as everything that is not water', () => {
    const map = generateMap(1234, 'duel');
    let land = 0;
    for (const tile of map.tiles) if (!isWaterTerrain(tile.terrain)) land++;
    expect(landTileCount(map)).toBe(land);
  });

  it('reads the three filters as an AND, with absence meaning "any"', () => {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const tile = map.tiles[4]!;
    // Wheat: grassland or plains, no feature, hills unspecified.
    expect(tileSuitsResource(tile, resourceDef('wheat'))).toBe(true);
    tile.hills = true;
    expect(tileSuitsResource(tile, resourceDef('wheat'))).toBe(true);
    tile.feature = 'forest';
    expect(tileSuitsResource(tile, resourceDef('wheat'))).toBe(false);
    // Silk wants exactly that forest; iron wants the hill and no trees.
    expect(tileSuitsResource(tile, resourceDef('silk'))).toBe(true);
    expect(tileSuitsResource(tile, resourceDef('iron'))).toBe(false);
    tile.feature = 'none';
    expect(tileSuitsResource(tile, resourceDef('iron'))).toBe(true);
    tile.hills = false;
    expect(tileSuitsResource(tile, resourceDef('iron'))).toBe(false);
    // Horses want the flat ground iron does not.
    expect(tileSuitsResource(tile, resourceDef('horses'))).toBe(true);
  });

  it('keeps the wrap in mind when it measures spacing', () => {
    // A resource one tile east of column 0 across the seam is adjacent, and the
    // spacing sweep has to know it. `wrappedDistance` is what it asks.
    const map = generateMap(1234, 'duel');
    const west = getTileAt(map, 0, 5)!;
    const east = getTileAt(map, map.width - 1, 5)!;
    expect(wrappedDistance(map, tileHex(west), tileHex(east))).toBe(1);
    expect(tileIndex(map, east.col, east.row)).toBeGreaterThan(tileIndex(map, west.col, west.row));
  });
});
