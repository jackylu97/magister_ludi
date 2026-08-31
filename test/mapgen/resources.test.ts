import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import {
  advanceProduction,
  explainTileYield,
  foldTileYield,
  foundCityAt,
  hasResource,
  tileYieldOf,
  yieldContextFor,
} from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../../src/sim/game';
import { improvementForResource } from '../../src/sim/improvementData';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import { generateMap } from '../../src/sim/mapgen';
import {
  RESOURCE_DATA,
  RESOURCE_IDS,
  type ResourceId,
  isBonusFood,
  isResourceId,
  resourceDef,
  resourceYield,
  resourcesOfKind,
  withExtraResources,
} from '../../src/sim/resourceData';
import {
  dealContinentLuxuries,
  landTileCount,
  tileSuitsResource,
} from '../../src/sim/resources';
import { describeResourceEffect } from '../../src/sim/resourceEffects';
import { mapFor } from './fixtures';
import { CONFIG, resourceTiles } from './resourceHelpers';
import { makeRng } from '../../src/sim/rng';
import { RULES } from '../../src/sim/rulesData';
import { chooseStartPositions } from '../../src/sim/startPositions';
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  newGame,
} from '../../src/sim/state';
import { buildError, isResourceVisible, requiredResource, visibleResourceAt } from '../../src/sim/tech';
import {
  FEATURE_IDS,
  TERRAIN_IDS,
  TILE_YIELD_KEYS,
  isWaterTerrain,
  readTileYield,
  tileYield,
} from '../../src/sim/terrainData';
import { TECH_IDS } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

// --- the table --------------------------------------------------------------

describe('the resource table', () => {
  it('names forty-one resources across the three kinds', () => {
    expect(RESOURCE_IDS).toHaveLength(41);
    // Table order is iteration order and therefore part of every seeded outcome,
    // so each kind is asserted in order rather than sorted.
    expect(resourcesOfKind('bonus')).toEqual([
      'wheat', 'cattle', 'deer', 'fish', 'stone', 'rice', 'maize', 'bananas',
      'copper', 'tin', 'clay', 'reeds', 'crabs', 'bison',
    ]);
    expect(resourcesOfKind('strategic')).toEqual(['horses', 'iron']);
    // Twenty-five luxuries since the ratified table: twenty-one on land and the
    // four that sit in the sea, which are placed and fully specified and cannot
    // be *held* by anybody until work boats exist (see `docs/luxuries.md`).
    expect(resourcesOfKind('luxury')).toEqual([
      'gems', 'silk', 'wine', 'spices', 'salt', 'incense', 'jade', 'marble', 'furs', 'dyes',
      'ivory', 'amber', 'tea', 'coffee', 'cotton', 'sugar', 'olives', 'lapis', 'silver',
      'gold', 'honey', 'pearls', 'coral', 'whales', 'tyrian',
    ]);
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
    // All six voices since the ratified table: silk pays culture where it grows
    // and jade pays faith, so a three-voice reading would call both of them free.
    for (const id of RESOURCE_IDS) {
      const value = resourceYield(id);
      let total = 0;
      for (const key of TILE_YIELD_KEYS) {
        expect(`${id}.${key} >= 0`).toBe(`${id}.${key} ${value[key] >= 0 ? '>=' : '<'} 0`);
        total += value[key];
      }
      expect(`${id} pays ${total > 0 ? 'something' : 'nothing'}`).toBe(`${id} pays something`);
    }
  });

  it('hands back a fresh yield object, so a caller cannot retune the game', () => {
    const first = resourceYield('wheat');
    first.food += 99;
    expect(resourceYield('wheat').food).toBe(RESOURCE_DATA.resources.wheat.yields.food);
  });

  it('tech-gates exactly the resources that are meant to be hidden', () => {
    expect(resourceDef('iron').requiresTech).toBe('bronzeWorking');
    // Horses joined it in the Age I rework: Husbandry is the tech that unlocks
    // the horseman and the pasture, so it is also the tech that says where the
    // horses are, and the reveal now reads as part of one package rather than
    // as a fact the map hands out for free. The gate is no longer visibility
    // only: an unrevealed seam is unusable *and* pays its owner nothing (see
    // `isResourceVisible` and `explainTileYield`).
    expect(resourceDef('horses').requiresTech).toBe('husbandry');
    // Incense briefly used the gate too (Divination revealed it, mirroring the
    // strategics), but that made the only faith-luxury invisible before players
    // had any faith mechanic to react to it with, so the gate was dropped —
    // incense is visible from turn one like every other luxury.
    expect(resourceDef('incense').requiresTech).toBeUndefined();
    const gated = RESOURCE_IDS.filter((id) => resourceDef(id).requiresTech !== undefined);
    expect(gated).toEqual(['horses', 'iron']);
  });

  it('recognises its own ids and nothing else', () => {
    expect(isResourceId('horses')).toBe(true);
    expect(isResourceId('unobtanium')).toBe(false);
    expect(isResourceId(7)).toBe(false);
  });

  it('knows which resources the fairness pass may plant', () => {
    // Asked of the data rather than pinned as a list of names, which is the
    // property `isBonusFood` exists for: the ratified table added five more
    // bonus foods and the guarantee picked them up with no edit here.
    expect(RESOURCE_IDS.filter(isBonusFood)).toEqual([
      'wheat', 'cattle', 'deer', 'fish', 'rice', 'maize', 'bananas', 'clay', 'reeds',
      'crabs', 'bison',
    ]);
    for (const id of RESOURCE_IDS) {
      const def = resourceDef(id);
      const expected = def.kind === 'bonus' && def.yields.food > 0;
      expect(`${id}: ${isBonusFood(id)}`).toBe(`${id}: ${expected}`);
    }
  });
});

// --- placement --------------------------------------------------------------

describe('placement', () => {
  it('grows clusters: some finds are more than one tile', () => {
    const map = mapFor(1234, 'standard');
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

  it('places every kind, not just the cheap ones', () => {
    const map = mapFor(1, 'large');
    const kinds = new Set(resourceTiles(map).map((tile) => resourceDef(tile.resource!).kind));
    expect(kinds).toEqual(new Set(['bonus', 'strategic', 'luxury']));
  });

  // `generateMap` rather than `./fixtures`' memo table, here and in "rolls no
  // dice" below: both tests are *about* generating twice, so a cache would turn
  // them into assertions that a Map hands back what it stored.
  it('is deterministic in the seed, and different for another', () => {
    const digest = (map: GameMap): string =>
      map.tiles.map((tile) => tile.resource ?? '').join(',');
    expect(digest(generateMap(4242, 'duel'))).toBe(digest(generateMap(4242, 'duel')));
    expect(digest(generateMap(4242, 'duel'))).not.toBe(digest(generateMap(4243, 'duel')));
  });

  it('survives a JSON round trip with the resources on it', () => {
    const map = mapFor(1234, 'duel');
    expect(JSON.parse(JSON.stringify(map))).toEqual(map);
    // Absent, not `'none'`: a bare tile and a tile that lost its resource must
    // serialise identically. See the `Tile.resource` docblock.
    const bare = map.tiles.find((tile) => tile.resource === undefined)!;
    expect(Object.prototype.hasOwnProperty.call(bare, 'resource')).toBe(false);
  });
});

describe('the fairness pass', () => {
  it('covers a real game\'s starts, because it plants for the maximum roster', () => {
    // `chooseStartPositions(map, n)` is a prefix of the same call for a larger
    // n, so planting for `maxPlayers` covers every game the map can host. That
    // is the property the pass leans on, so it is asserted rather than assumed.
    const map = mapFor(31337, 'standard');
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
    expect(tileYieldOf(tileWith(undefined))).toEqual({ food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(tileYieldOf(tileWith('wheat'))).toEqual({ food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
  });

  it('adds *after* the feature override, not before it', () => {
    // A forest replaces grassland's 2/0/0 with 1/1/0; the deer then adds a food
    // to what the forest left, which is 2/1/0 and not 3/1/0.
    const forest = tileWith('deer', { feature: 'forest' });
    expect(tileYield('grassland', 'forest', false)).toEqual({ food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(tileYieldOf(forest)).toEqual({ food: 2, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
  });

  it('adds *after* the hills override, which wins over everything else', () => {
    const hill = tileWith('gems', { hills: true });
    expect(tileYieldOf(hill)).toEqual({ food: 0, production: 2, gold: 2, science: 0, culture: 0, faith: 0 });
  });

  it('pays more than one voice when the table says so', () => {
    const salt = tileWith('salt', { terrain: 'desert' });
    expect(tileYieldOf(salt)).toEqual(readTileYield({ food: 1, production: 1, gold: 0 }));
  });

  it('pays the three voices the ground itself never could', () => {
    // The widening the ratified table forced: silk pays culture, tea and reeds
    // pay science, incense and jade pay faith. A tile could do none of that
    // before, and the whole chain — resource row, contribution entry, fold —
    // carries them exactly as it carries a coin.
    const silk = tileWith('silk', { feature: 'forest' });
    expect(tileYieldOf(silk).culture).toBe(resourceYield('silk').culture);
    expect(tileYieldOf(silk).culture).toBeGreaterThan(0);

    const reeds = tileWith('reeds');
    expect(tileYieldOf(reeds).science).toBe(resourceYield('reeds').science);
    expect(tileYieldOf(reeds).science).toBeGreaterThan(0);

    const incense = tileWith('incense', { terrain: 'desert' });
    expect(tileYieldOf(incense).faith).toBe(resourceYield('incense').faith);
    expect(tileYieldOf(incense).faith).toBeGreaterThan(0);
  });

  it('leaves a mountain unworkable however rich it is', () => {
    // No resource names a mountain, so this is a guard rather than a rule — but
    // workability is asked of the terrain, never of the yield, and that is worth
    // holding still.
    const peak = tileWith('iron', { terrain: 'mountain' });
    expect(tileYieldOf(peak)).toEqual(readTileYield({ food: 0, production: 1, gold: 0 }));
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
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
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
    // **And a strategic one, with the war elephant as the stated exception**
    // (the tree pass of 2026-08-30). Iron and horses are war metals and a unit
    // gated on one is a unit gated on a seam; ivory is a *luxury*, and the
    // elephant is the one row where "you may raise this because you happen to
    // have that" is the point rather than an oversight. The gate is the same
    // rule either way — `openedResource` never asked what kind a resource was —
    // so what this pins is the **decision**, not a limitation of the mechanism.
    const luxuryGated: string[] = [];
    for (const id of UNIT_TYPE_IDS) {
      const needs = unitDef(id).requiresResource;
      if (needs === undefined) continue;
      expect(RESOURCE_IDS).toContain(needs);
      if (resourceDef(needs).kind === 'strategic') continue;
      luxuryGated.push(id);
    }
    expect(luxuryGated).toEqual(['warElephant']);
    expect(unitDef('warElephant').requiresResource).toBe('ivory');
    expect(resourceDef('ivory').kind).toBe('luxury');
  });

  it('counts a resource as held when the player owns it AND has improved it', () => {
    // THE Entry IX correction, and the reason this test changed rather than
    // being replaced: ownership used to be the whole rule, because there were no
    // workers. Now a pasture has to stand on the horses.
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    expect(hasResource(state, 0, 'horses')).toBe(false);

    // Inside the city's own ring, so `foundCityAt` already claimed it.
    at(state, 5, 4).resource = 'horses';
    expect(hasResource(state, 0, 'horses')).toBe(false);
    at(state, 5, 4).improvement = 'pasture';
    expect(hasResource(state, 0, 'horses')).toBe(true);
    // The other player owns nothing, so the same tile does nothing for them.
    expect(hasResource(state, 1, 'horses')).toBe(false);
    expect(city.ownerId).toBe(0);
  });

  it('refuses the wrong improvement on the right resource', () => {
    // Which improvement opens which resource is data (`improvesResource`), and
    // a farm on a horse pasture is not a pasture.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'horses';
    at(state, 5, 4).improvement = 'farm';
    expect(hasResource(state, 0, 'horses')).toBe(false);
    expect(improvementForResource('horses')).toBe('pasture');
    expect(improvementForResource('iron')).toBe('mine');
  });

  it('opens fish to a fishing boat, and to nothing else', () => {
    // This used to be the one documented hole — the water improvement was a work
    // boat, naval was deferred, and the test said "the day somebody adds the row
    // this is what tells them to delete it". Entry XXVII added the row, so what
    // it pins now is the same rule from the other side: the boats open the seam
    // and a farm laid on the same hex does not.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'fish';
    expect(improvementForResource('fish')).toBe('fishingBoats');
    expect(hasResource(state, 0, 'fish')).toBe(false);
    at(state, 5, 4).improvement = 'farm';
    expect(hasResource(state, 0, 'fish')).toBe(false);
    at(state, 5, 4).improvement = 'fishingBoats';
    expect(hasResource(state, 0, 'fish')).toBe(true);
  });

  it('does not count a resource on unclaimed ground, improved or not', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    // Far outside the opening ring: seen, wanted, not owned.
    at(state, 11, 9).resource = 'iron';
    at(state, 11, 9).improvement = 'mine';
    expect(hasResource(state, 0, 'iron')).toBe(false);
  });

  it('follows a captured city, because ownership is the city\'s', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    at(state, 5, 4).improvement = 'mine';
    expect(hasResource(state, 0, 'iron')).toBe(true);
    expect(hasResource(state, 1, 'iron')).toBe(false);
    // Capture is exactly this: the city changes hands and its territory follows.
    city.ownerId = 1;
    expect(hasResource(state, 0, 'iron')).toBe(false);
    expect(hasResource(state, 1, 'iron')).toBe(true);
  });

  it('takes the resource away again when the mine is pillaged', () => {
    // The other end of the same rule, and it needs no bookkeeping of its own:
    // pillaging deletes `Tile.improvement`, and `hasResource` simply stops
    // finding one.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    at(state, 5, 4).improvement = 'mine';
    expect(hasResource(state, 0, 'iron')).toBe(true);
    delete at(state, 5, 4).improvement;
    expect(hasResource(state, 0, 'iron')).toBe(false);
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
    expect(result.ok ? '' : result.error).toBe('Swordsman needs improved Iron');
    // Validate-fully: a refused command leaves the queue exactly as it was.
    expect(city.queue).toEqual([]);
  });

  it('accepts the same queue the moment the player has mined the tile', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    at(state, 5, 4).improvement = 'mine';
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
    // "improved", since M7: owning the tile stopped being enough.
    expect(buildError(state, 0, 'unit', 'horseman')).toBe('Horseman needs improved Horses');
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
    at(state, 5, 4).improvement = 'mine';
    city.queue = [{ kind: 'unit', id: 'swordsman' }];
    city.hammerBasket = 1000;

    // The mine is pillaged mid-build. The hammers stay in the basket and the
    // item stays at the front — the same rule `minCityPop` gets. (Losing the
    // *improvement* is now a second way to lose the resource, and it is by far
    // the likelier one: a raid takes a turn, a city takes a war.)
    delete at(state, 5, 4).improvement;
    advanceProduction(state);
    expect(city.queue).toEqual([{ kind: 'unit', id: 'swordsman' }]);
    expect(city.hammerBasket).toBe(1000);
    expect(state.units).toHaveLength(0);

    at(state, 5, 4).improvement = 'mine';
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

  it('hides the label, the access and the yield together', () => {
    // The ratified reading, and the reversal of this test's first version: iron
    // an empire has no word for is not a production point it collects while
    // being told nothing — it is simply not there yet. All three questions are
    // one rule (`resourceIsVisibleTo`), so they cannot come apart.
    const state = bareState();
    state.players[0]!.techsResearched = [];
    const tile = at(state, 3, 3);
    tile.resource = 'iron';
    const ctx = yieldContextFor(state, 0)!;

    expect(visibleResourceAt(state, 0, tile)).toBeNull();
    expect(hasResource(state, 0, 'iron')).toBe(false);
    // Bare grassland, exactly as if the seam were not there.
    expect(tileYieldOf(tile, ctx)).toEqual(tileYieldOf({ ...tile, resource: undefined }, ctx));
    // Not a subtraction afterwards: the line is simply absent from the
    // breakdown, which is rule 5's whole point (`explainTileYield`).
    expect(explainTileYield(tile, ctx).map((line) => line.source)).not.toContain(
      resourceDef('iron').name,
    );
  });

  it('pays it the instant the technology lands, to the line', () => {
    // The reveal *moment*, asked of the tile: the delta across the discovery is
    // exactly the resource's own row and nothing else.
    const state = bareState();
    const player = state.players[0]!;
    player.techsResearched = [];
    const tile = at(state, 3, 3);
    tile.resource = 'iron';

    const before = tileYieldOf(tile, yieldContextFor(state, 0));
    player.techsResearched = ['bronzeWorking'];
    const after = tileYieldOf(tile, yieldContextFor(state, 0));

    const line = resourceYield('iron');
    for (const key of TILE_YIELD_KEYS) expect(after[key] - before[key]).toBe(line[key]);
    expect(explainTileYield(tile, yieldContextFor(state, 0)).map((l) => l.source)).toContain(
      resourceDef('iron').name,
    );
  });

  it('pays an ungated resource to an empire that has researched nothing', () => {
    // The other half, and the reason the gate is read off the row rather than
    // off the *kind*: wheat is wheat to anybody.
    const state = bareState();
    state.players[0]!.techsResearched = [];
    const tile = at(state, 3, 3);
    tile.resource = 'wheat';
    const ctx = yieldContextFor(state, 0)!;
    const bare = tileYield('grassland', 'none', false);
    expect(tileYieldOf(tile, ctx).food).toBe(bare.food + resourceYield('wheat').food);
  });

  it('stays omniscient when nobody is asking — the mapgen reading', () => {
    // A context-less evaluation is "what could this ground ever pay", which is
    // what the start-site scorer wants during generation, when there is no
    // player to have a technology. Documented in `explainTileYield`, and the one
    // place the gate does not apply.
    const state = bareState();
    state.players[0]!.techsResearched = [];
    const tile = at(state, 3, 3);
    tile.resource = 'iron';
    expect(tileYieldOf(tile).production).toBe(
      tileYield('grassland', 'none', false).production + resourceYield('iron').production,
    );
    expect(explainTileYield(tile).map((line) => line.source)).toContain(resourceDef('iron').name);
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
    const map = mapFor(1234, 'duel');
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
    const map = mapFor(1234, 'duel');
    const west = getTileAt(map, 0, 5)!;
    const east = getTileAt(map, map.width - 1, 5)!;
    expect(wrappedDistance(map, tileHex(west), tileHex(east))).toBe(1);
    expect(tileIndex(map, east.col, east.row)).toBeGreaterThan(tileIndex(map, west.col, west.row));
  });
});

/**
 * Luxury variety (playable-loop item 1), where no map is needed to answer it:
 * a hand is dealt the way the table says, deterministically, with the cap on how
 * many continents may grow one kind and the documented relaxation when the pool
 * cannot seat them all. Everything that has to *look at ground* — the carve's
 * determinism, a kind's regional character, the start guarantees, whether every
 * luxury in the table gets placed at all — costs a standard map or five and
 * lives in `resources.slow.test.ts`.
 */
describe('luxury placement', () => {
  it('deals each continent four unique kinds, and keeps a kind to few continents', () => {
    // Civ 6’s two rules together: a hand per continent gives a coastline its
    // character, and the cap on how many continents may grow one kind is what
    // makes that character *exclusive* — which is in turn what will make
    // trading for someone else’s silk mean anything.
    const luxuries = resourcesOfKind('luxury');
    for (const count of [4, 9, 30]) {
      const first = dealContinentLuxuries(makeRng(99), count, CONFIG);
      expect(dealContinentLuxuries(makeRng(99), count, CONFIG)).toEqual(first);
      expect(first).toHaveLength(count);

      const appearances = new Map<ResourceId, number>();
      for (const hand of first) {
        expect(hand).toHaveLength(Math.min(CONFIG.luxuryKindsPerContinent, luxuries.length));
        expect(new Set(hand).size).toBe(hand.length);
        for (const id of hand) {
          expect(luxuries).toContain(id);
          appearances.set(id, (appearances.get(id) ?? 0) + 1);
        }
        // Table order, not draw order: a hand is a set, and the order it
        // happened to be drawn in must not leak into which luxury a fairness
        // pass reaches for first.
        expect(hand).toEqual(luxuries.filter((id) => hand.includes(id)));
      }

      // The cap, and its documented relaxation: with more continents than the
      // pool can seat at `maxContinentsPerLuxury` apiece the cap rises to the
      // smallest value that fits, rather than the deal deadlocking.
      const cap = Math.max(
        CONFIG.maxContinentsPerLuxury,
        Math.ceil((count * CONFIG.luxuryKindsPerContinent) / luxuries.length),
      );
      for (const [id, seen] of appearances) {
        expect(`${count} continents, ${id} on ${seen} <= ${cap}`).toBe(
          `${count} continents, ${id} on ${Math.min(seen, cap)} <= ${cap}`,
        );
      }
      // And the hands are not all the same hand.
      expect(new Set(first.map((hand) => hand.join(','))).size).toBeGreaterThan(1);
    }
  });

});

/**
 * The proof that a resource is *entirely* data.
 *
 * A row the table has never seen is installed at runtime and the simulation is
 * asked to place it, pay it and explain it, with no TypeScript written for it —
 * which is the acceptance criterion this milestone was given, and the one thing
 * a suite of fixtures could never demonstrate. `withExtraResources` puts the
 * table back afterwards; nothing in `src/` calls it.
 */
describe('a resource nobody wrote code for', () => {
  /**
   * A row the table has never heard of — the name matters, and it is checked
   * below: `amber` used to play this part and is now a real luxury, which made
   * the "puts the table back" assertion silently true for the wrong reason.
   */
  const UNOBTANIUM = {
    name: 'Unobtanium',
    kind: 'luxury',
    yields: { food: 0, production: 0, gold: 2 },
    validTerrain: ['grassland', 'plains'],
    validFeatures: ['forest'],
    frequency: 400,
    clusterSize: [1, 2],
    effects: [{ kind: 'perCityYields', gold: 2, culture: 1 }],
    emoji: '🟠',
  } as const;

  it('places, pays and explains without a line of code of its own', () => {
    expect(isResourceId('unobtanium')).toBe(false);
    withExtraResources({ unobtanium: UNOBTANIUM as never }, () => {
      const id = 'unobtanium' as ResourceId;
      expect(RESOURCE_IDS).toContain(id);
      expect(resourcesOfKind('luxury')).toContain(id);

      // Placed: the scatter reads only the constraint fields, so a huge
      // frequency is enough to make the seeded draw find it.
      //
      // `generateMap` rather than `./fixtures`' memo table, and this is the one
      // place in the directory where the reason is not determinism but the
      // *table*: `withExtraResources` swaps the resource rows for the length of
      // this callback, so `(seed, size)` is not the whole of what this map is a
      // function of and a cached answer would be one from the ordinary table.
      const map = generateMap(4242, 'standard');
      const tiles = map.tiles.filter((tile) => tile.resource === id);
      expect(tiles.length).toBeGreaterThan(0);
      for (const tile of tiles) expect(tileSuitsResource(tile, resourceDef(id))).toBe(true);

      // Pays: the yield algebra adds it like any other resource…
      const tile = tiles[0]!;
      const bare = tileYield(tile.terrain, tile.feature, tile.hills);
      expect(tileYieldOf(tile).gold).toBe(bare.gold + UNOBTANIUM.yields.gold);

      // …and explains: a labelled line in the breakdown the panel prints, with
      // the fold of the list equal to the total.
      const lines = explainTileYield(tile);
      expect(lines.map((line) => line.source)).toContain(UNOBTANIUM.name);
      expect(foldTileYield(lines)).toEqual(tileYieldOf(tile));

      // And its signature is read by the one evaluator, in words too.
      expect(describeResourceEffect(id)).toContain('gold');
    });
  });

  it('puts the table back afterwards, whatever happens inside', () => {
    const before = [...RESOURCE_IDS];
    expect(() =>
      withExtraResources({ unobtanium: UNOBTANIUM as never }, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect([...RESOURCE_IDS]).toEqual(before);
    expect(isResourceId('unobtanium')).toBe(false);
  });

  it('refuses a row the vocabulary cannot read, loudly and at load', () => {
    // The other half of "data-driven": an effect the evaluator cannot interpret
    // is an effect that silently pays nothing, which is the one bug this design
    // could hide indefinitely. So the table validates on installation.
    expect(() =>
      withExtraResources(
        { bogus: { ...UNOBTANIUM, effects: [{ kind: 'teleport' }] } as never },
        () => undefined,
      ),
    ).toThrow(/effect kind/);
    expect(() =>
      withExtraResources(
        { bogus: { ...UNOBTANIUM, effects: [{ kind: 'empireYields', food: 2 }] } as never },
        () => undefined,
      ),
    ).toThrow(/basket/);
    // A tier gated on an age no technology has is a payoff that can never
    // arrive, which would fail as silence rather than as an error.
    expect(() =>
      withExtraResources(
        { bogus: { ...UNOBTANIUM, effects: [{ kind: 'empireYields', gold: 1, fromAge: 9 }] } as never },
        () => undefined,
      ),
    ).toThrow(/age 9/);
  });
});
