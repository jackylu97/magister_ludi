import { describe, expect, it } from 'vitest';
import { bumpEconomy } from '../../src/sim/slate';

import { buildingDef } from '../../src/sim/buildingData';
import {
  advanceProduction,
  foundCityAt,
  hasResource,
  resourceCopies,
} from '../../src/sim/cities';
import {
  explainTileYield,
  foldTile,
  foldTileLines,
  yieldContextFor,
} from '../../src/sim/yields/hex';
import { applyCommand } from '../../src/sim/commands';
import { dispatch, loadGame, replay, saveGame, snapshotState } from '../../src/sim/game';
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
import { UNIT_TYPE_IDS, requiredResourcesOf, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { createGame, newGame } from '../sim/newGameHelpers';

// --- the table --------------------------------------------------------------

describe('the resource table', () => {
  it('names forty-five resources across the three kinds', () => {
    expect(RESOURCE_IDS).toHaveLength(45);
    // Table order is iteration order and therefore part of every seeded outcome,
    // so each kind is asserted in order rather than sorted.
    //
    // **Rich ore is last on purpose** (the vein pass, 2026-09-02). It is the
    // one row nothing scatters — `ResourceDef.buried`, filtered out of the
    // surface draw's own table — and appending it rather than filing it beside
    // the other minerals is what keeps every seed's surface bit-identical: the
    // draw walks `resourcesOfKind('bonus')` in order, and a row inserted in the
    // middle would have moved every wheat field in the game.
    expect(resourcesOfKind('bonus')).toEqual([
      'wheat', 'cattle', 'deer', 'fish', 'stone', 'rice', 'maize', 'bananas',
      'tin', 'clay', 'reeds', 'crabs', 'bison', 'richOre',
    ]);
    // **Seven strategics since batch R3** — two promoted and two new. Copper
    // and ivory kept the row positions they held as a bonus and a luxury, which
    // is why the list is not in one block: a row moved inside this table moves
    // every draw the scatter makes, and a promotion is a change of kind rather
    // than a change of place.
    expect(resourcesOfKind('strategic')).toEqual([
      'copper', 'obsidian', 'horses', 'camels', 'iron', 'niter', 'ivory',
    ]);
    // Twenty-four luxuries: twenty on land and the four that sit in the sea,
    // which are placed and fully specified and cannot be *held* by anybody
    // until work boats exist (see `docs/luxuries.md`). Ivory left the pool for
    // the strategic table in batch R3.
    expect(resourcesOfKind('luxury')).toEqual([
      'gems', 'silk', 'wine', 'spices', 'salt', 'incense', 'jade', 'marble', 'furs', 'dyes',
      'amber', 'tea', 'coffee', 'cotton', 'sugar', 'olives', 'lapis', 'silver',
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
      // A **buried** row has no weight to give: it is never in the surface
      // draw's table at all, and a number there would be a dial a designer
      // turned expecting something to happen. Everything else must have one, or
      // it is a row that can never be placed and nothing would say so.
      if (def.buried) expect(def.frequency).toBe(0);
      else expect(def.frequency).toBeGreaterThan(0);
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
    // Iron Working names the iron since the re-cut of 2026-09-02 — the
    // worksheet's "reveals Iron (passive) — gates this line".
    expect(resourceDef('iron').requiresTech).toBe('bronzePanoply'); // moved 2026-09-04
    // Niter moved from Alchemy to Physics in batch R3: Alchemy is the endgame
    // node that opens the Magnum Opus, so a fire lance revealed there was a
    // unit almost nobody built.
    expect(resourceDef('niter').requiresTech).toBe('physics');
    // Copper was a bonus row until batch R3, when it became the blade pair's
    // half that lives on ordinary hills. Mining unlocked nothing at all before
    // it, which is the hole the placement fills.
    expect(resourceDef('copper').requiresTech).toBe('mining');
    // Obsidian, camels and ivory: the first two are new rows and the third was
    // promoted, and none of the three is hidden. Obsidian must be visible from
    // turn one or the blade pair is not a pair — anything revealing it would
    // put it after copper. Ivory was already visible and promoting it should
    // not hide it.
    expect(resourceDef('obsidian').requiresTech).toBeUndefined();
    expect(resourceDef('ivory').requiresTech).toBeUndefined();
    expect(resourceDef('camels').requiresTech).toBe('husbandry');
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
    expect(gated).toEqual(['copper', 'horses', 'camels', 'iron', 'niter']);
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
    expect(foldTile(tileWith(undefined))).toEqual({ food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(foldTile(tileWith('wheat'))).toEqual({ food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
  });

  it('adds *after* the feature override, not before it', () => {
    // A forest replaces grassland's 2/0/0 with 1/1/0; the deer then adds a food
    // to what the forest left, which is 2/1/0 and not 3/1/0.
    const forest = tileWith('deer', { feature: 'forest' });
    expect(tileYield('grassland', 'forest', false)).toEqual({ food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(foldTile(forest)).toEqual({ food: 2, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
  });

  it('adds *after* the hills override, which wins over everything else', () => {
    const hill = tileWith('gems', { hills: true });
    expect(foldTile(hill)).toEqual({ food: 0, production: 2, gold: 2, science: 0, culture: 0, faith: 0 });
  });

  it('pays more than one voice when the table says so', () => {
    const salt = tileWith('salt', { terrain: 'desert' });
    expect(foldTile(salt)).toEqual(readTileYield({ food: 1, production: 1, gold: 0 }));
  });

  it('pays the three voices the ground itself never could', () => {
    // The widening the ratified table forced: silk pays culture, tea and reeds
    // pay science, incense and jade pay faith. A tile could do none of that
    // before, and the whole chain — resource row, contribution entry, fold —
    // carries them exactly as it carries a coin.
    const silk = tileWith('silk', { feature: 'forest' });
    expect(foldTile(silk).culture).toBe(resourceYield('silk').culture);
    expect(foldTile(silk).culture).toBeGreaterThan(0);

    const reeds = tileWith('reeds');
    expect(foldTile(reeds).science).toBe(resourceYield('reeds').science);
    expect(foldTile(reeds).science).toBeGreaterThan(0);

    const incense = tileWith('incense', { terrain: 'desert' });
    expect(foldTile(incense).faith).toBe(resourceYield('incense').faith);
    expect(foldTile(incense).faith).toBeGreaterThan(0);
  });

  it('leaves a mountain unworkable however rich it is', () => {
    // No resource names a mountain, so this is a guard rather than a rule — but
    // workability is asked of the terrain, never of the yield, and that is worth
    // holding still.
    const peak = tileWith('iron', { terrain: 'mountain' });
    expect(foldTile(peak)).toEqual(readTileYield({ food: 0, production: 1, gold: 0 }));
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
    // A **list** since batch R1 — a row may accept either of two resources
    // (`UnitDef.requiresResource`). Nothing in the live data writes a pair yet;
    // `test/sim/resourceCopies.test.ts` pins the shape behaviourally and pins
    // that absence, so the day R3 writes one this file needs no edit.
    // **Pairs since batch R3**: the mounted line accepts horses or camels and
    // the blade line obsidian or copper, so a start poor in one is rich in the
    // other. `requiredResourcesOf` was already the list form for the single
    // rows, which is why nothing below it had to change.
    expect(requiredResource('unit', 'horseman')).toEqual(['horses', 'camels']);
    expect(requiredResource('unit', 'chariot')).toEqual(['horses', 'camels']);
    expect(requiredResource('unit', 'knight')).toEqual(['horses', 'camels']);
    // The sword moved down a rung in batch R3: the Æra II blade is forged from
    // obsidian or copper and it is iron from the legionary up, which is the
    // copper/obsidian → iron ladder the roster is built on.
    expect(requiredResource('unit', 'swordsman')).toEqual(['obsidian', 'copper']);
    expect(requiredResource('unit', 'legionary')).toEqual(['iron']);
    expect(requiredResource('unit', 'longswordsman')).toEqual(['iron']);
    expect(requiredResource('unit', 'fireLance')).toEqual(['niter']);
    expect(requiredResource('unit', 'warrior')).toEqual([]);
    expect(requiredResource('building', 'library')).toEqual([]);
  });

  it('every gated unit names a resource the table actually has', () => {
    // **And a strategic one, with no exceptions left.** Ivory was the stated
    // exception until batch R3 — the war elephant was the one row gated on a
    // luxury — and promoting ivory to the strategic table closed it. What this
    // pins is still the decision rather than a limit of the mechanism:
    // `openedResource` has never asked what kind a resource was, so a luxury
    // gate would work; the roster simply does not write one.
    const luxuryGated: string[] = [];
    for (const id of UNIT_TYPE_IDS) {
      const needs = requiredResourcesOf(unitDef(id));
      if (needs.length === 0) continue;
      for (const seam of needs) expect(RESOURCE_IDS).toContain(seam);
      if (needs.every((seam) => resourceDef(seam).kind === 'strategic')) continue;
      luxuryGated.push(id);
    }
    expect(luxuryGated).toEqual([]);
    expect(requiredResourcesOf(unitDef('warElephant'))).toEqual(['ivory']);
    expect(resourceDef('ivory').kind).toBe('strategic');
  });

  it('gates no unique unit on a strategic resource', () => {
    // Settled 2026-09-18: *"yup, all unique units don't require strategic
    // resources."* The rows a leader's table or a leader's ability hands out
    // are the whole of what a unique is, and none of them names a seam — so the
    // gated catalogue is exactly the standard roster, listed here so a new
    // requirement has to be added deliberately.
    const gated = UNIT_TYPE_IDS.filter((id) => requiredResourcesOf(unitDef(id)).length > 0);
    expect(gated).toEqual([
      'horseman',
      'chariot',
      'chariotArcher',
      'swordsman',
      'knight',
      'longswordsman',
      'phalanx',
      'legionary',
      'horseArcher',
      'cataphract',
      'warElephant',
      'fireLance',
    ]);
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
    bumpEconomy(state);
    expect(hasResource(state, 0, 'horses')).toBe(false);
    at(state, 5, 4).improvement = 'pasture';
    bumpEconomy(state);
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
    bumpEconomy(state);
    at(state, 5, 4).improvement = 'farm';
    bumpEconomy(state);
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
    bumpEconomy(state);
    expect(improvementForResource('fish')).toBe('fishingBoats');
    expect(hasResource(state, 0, 'fish')).toBe(false);
    at(state, 5, 4).improvement = 'farm';
    bumpEconomy(state);
    expect(hasResource(state, 0, 'fish')).toBe(false);
    at(state, 5, 4).improvement = 'fishingBoats';
    bumpEconomy(state);
    expect(hasResource(state, 0, 'fish')).toBe(true);
  });

  it('does not count a resource on unclaimed ground, improved or not', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    // Far outside the opening ring: seen, wanted, not owned.
    at(state, 11, 9).resource = 'iron';
    bumpEconomy(state);
    at(state, 11, 9).improvement = 'mine';
    bumpEconomy(state);
    expect(hasResource(state, 0, 'iron')).toBe(false);
  });

  it('follows a captured city, because ownership is the city\'s', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    bumpEconomy(state);
    at(state, 5, 4).improvement = 'mine';
    bumpEconomy(state);
    expect(hasResource(state, 0, 'iron')).toBe(true);
    expect(hasResource(state, 1, 'iron')).toBe(false);
    // Capture is exactly this: the city changes hands and its territory follows.
    city.ownerId = 1;
    bumpEconomy(state);
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
    bumpEconomy(state);
    at(state, 5, 4).improvement = 'mine';
    bumpEconomy(state);
    expect(hasResource(state, 0, 'iron')).toBe(true);
    delete at(state, 5, 4).improvement;
    bumpEconomy(state);
    expect(hasResource(state, 0, 'iron')).toBe(false);
  });

  it('refuses a queue for a unit whose resource the player lacks', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const result = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'legionary' }],
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toBe('Legionary needs improved Iron');
    // Validate-fully: a refused command leaves the queue exactly as it was.
    expect(city.queue).toEqual([]);
  });

  it('accepts the same queue the moment the player has mined the tile', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    at(state, 5, 4).improvement = 'mine';
    // The **top** of the iron line, since the obsolescence ruling of 2026-09-03:
    // this fixture holds every technology, so the mine that opens the legionary
    // opens the longswordsman above it in the same breath and the legionary is
    // replaced the instant it becomes legal. The resource gate is the same gate
    // either way, which is what this test is about.
    const result = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'longswordsman' }],
    });
    expect(result.ok).toBe(true);
    expect(city.queue).toEqual([{ kind: 'unit', id: 'longswordsman' }]);
  });

  it('is one gate: the panel and the reducer read the same sentence', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    // What the city panel disables a button with, and what the reducer refuses
    // with, are the same call. A divergence here is a button that lies.
    // "improved", since M7: owning the tile stopped being enough.
    expect(buildError(state, 0, 'unit', 'horseman')).toBe(
      'Horseman needs improved Horses or Camels',
    );
    // A row with nothing above it in the data is the honest positive control
    // here: the warrior would now be refused for having been *replaced* (the
    // obsolescence ruling of 2026-09-03) in a fixture holding every technology,
    // which is a different sentence about a different rule.
    expect(unitDef('worker').upgradesTo).toBeUndefined();
    expect(buildError(state, 0, 'unit', 'worker')).toBeNull();
    // And the warrior is the *other* control since 2026-09-04: every rung above
    // it wants a seam, and this fixture has none, so the antiquated row is
    // still offered — the obsolescence ruling's own exception. Mine the seams
    // and the same call flips to the replacement sentence, naming the rung the
    // piece would actually reach. **Two seams since batch R3**: the sword rung
    // wants a blade and the two rungs above it want iron, and the walk stops at
    // the first rung it cannot field.
    expect(buildError(state, 0, 'unit', 'warrior')).toBeNull();
    at(state, 5, 4).resource = 'copper';
    at(state, 5, 4).improvement = 'mine';
    at(state, 6, 4).resource = 'iron';
    at(state, 6, 4).improvement = 'mine';
    bumpEconomy(state);
    expect(buildError(state, 0, 'unit', 'warrior')).toBe(
      'Warrior has been replaced by the Longswordsman',
    );
    expect(buildError(state, 0, 'building', 'library')).toBeNull();
    expect(buildingDef('library').name).toBe('Library');
  });

  it('reports the technology first when both gates would refuse', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    state.players[0]!.techsResearched = [];
    // A player with neither Iron Working nor iron should be told about the
    // technology: the ore is not their problem yet.
    expect(buildError(state, 0, 'unit', 'legionary')).toBe('Legionary needs Iron Working');
  });

  it('holds production rather than dropping it when the resource is lost', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'iron';
    bumpEconomy(state);
    at(state, 5, 4).improvement = 'mine';
    bumpEconomy(state);
    city.queue = [{ kind: 'unit', id: 'legionary' }];
    city.hammerBasket = 1000;

    // The mine is pillaged mid-build. The hammers stay in the basket and the
    // item stays at the front — the same rule `minCityPop` gets. (Losing the
    // *improvement* is now a second way to lose the resource, and it is by far
    // the likelier one: a raid takes a turn, a city takes a war.)
    delete at(state, 5, 4).improvement;
    advanceProduction(state);
    expect(city.queue).toEqual([{ kind: 'unit', id: 'legionary' }]);
    expect(city.hammerBasket).toBe(1000);
    expect(state.units).toHaveLength(0);

    at(state, 5, 4).improvement = 'mine';
    bumpEconomy(state);
    advanceProduction(state);
    expect(city.queue).toEqual([]);
    expect(state.units.map((unit) => unit.type)).toEqual(['legionary']);
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

  it('hides iron until Iron Working, per player', () => {
    const state = bareState();
    state.players[0]!.techsResearched = [];
    state.players[1]!.techsResearched = ['bronzePanoply']; // iron's reveal moved 2026-09-04
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
    expect(foldTile(tile, ctx)).toEqual(foldTile({ ...tile, resource: undefined }, ctx));
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

    const before = foldTile(tile, yieldContextFor(state, 0));
    player.techsResearched = ['bronzePanoply']; // iron's reveal moved 2026-09-04
    const after = foldTile(tile, yieldContextFor(state, 0));

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
    expect(foldTile(tile, ctx).food).toBe(bare.food + resourceYield('wheat').food);
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
    expect(foldTile(tile).production).toBe(
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
      // **The cap is a preference and the code says so**: when a hand cannot be
      // filled under it the draw falls back to the least-used kinds rather than
      // deadlocking. That fallback became reachable when ivory left the luxury
      // pool in batch R3 — thirty continents want 120 slots and twenty-four
      // kinds at a cap of five supply exactly 120, so the deal has no slack at
      // all and one kind ends up a continent over. One over is the whole of the
      // slip; a deal that piled onto one kind would fail here.
      const slack = 1;
      for (const [id, seen] of appearances) {
        expect(`${count} continents, ${id} on ${seen} <= ${cap + slack}`).toBe(
          `${count} continents, ${id} on ${Math.min(seen, cap + slack)} <= ${cap + slack}`,
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
      expect(foldTile(tile).gold).toBe(bare.gold + UNOBTANIUM.yields.gold);

      // …and explains: a labelled line in the breakdown the panel prints, with
      // the fold of the list equal to the total.
      const lines = explainTileYield(tile);
      expect(lines.map((line) => line.source)).toContain(UNOBTANIUM.name);
      expect(foldTileLines(lines)).toEqual(foldTile(tile));

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
        { bogus: { ...UNOBTANIUM, effects: [{ kind: 'pays', where: 'empire', food: 2 }] } as never },
        () => undefined,
      ),
    ).toThrow(/basket/);
    // A tier gated on an age no technology has is a payoff that can never
    // arrive, which would fail as silence rather than as an error.
    expect(() =>
      withExtraResources(
        { bogus: { ...UNOBTANIUM, effects: [{ kind: 'pays', where: 'empire', gold: 1, fromAge: 9 }] } as never },
        () => undefined,
      ),
    ).toThrow(/age 9/);
  });
});

// --- how much a seam is worth ----------------------------------------------

/**
 * **The per-tile quantity** (batch R3, `docs/strategic-resources-proposal.md`
 * section 2).
 *
 * A unit holds one copy of a strategic resource while it lives, so one copy per
 * tile would make a two-horse empire a two-horseman empire for the whole game.
 * Each strategic row gives an inclusive range and each tile rolls inside it, off
 * the map rng.
 *
 * Three claims:
 *
 *   1. **Every strategic tile has one, in range, and nothing else has one.**
 *   2. **It is deterministic.** Same seed, same quantities, to the tile.
 *   3. **The roll comes last**, after every placement draw, so which tile
 *      carries which resource is untouched by it.
 */
describe('a strategic tile carries a quantity', () => {
  it('rolls every strategic tile inside its own row’s range, and nothing else', () => {
    const map = mapFor(7, 'standard');
    let strategics = 0;
    for (const tile of map.tiles) {
      const range =
        tile.resource === undefined ? undefined : resourceDef(tile.resource).copiesPerSource;
      if (range === undefined) {
        // A bonus or luxury seam is worth one of its kind by definition, so it
        // carries no number at all — absence, `resource`'s own convention.
        expect(
          `${tile.resource ?? 'bare'} at (${tile.col},${tile.row}): ${tile.resourceCopies}`,
        ).toBe(`${tile.resource ?? 'bare'} at (${tile.col},${tile.row}): undefined`);
        continue;
      }
      strategics += 1;
      const rolled = tile.resourceCopies;
      expect(typeof rolled, `${tile.resource} at (${tile.col},${tile.row})`).toBe('number');
      expect(rolled!, `${tile.resource} at (${tile.col},${tile.row})`).toBeGreaterThanOrEqual(
        range[0],
      );
      expect(rolled!, `${tile.resource} at (${tile.col},${tile.row})`).toBeLessThanOrEqual(
        range[1],
      );
    }
    expect(strategics).toBeGreaterThan(0);
  });

  it('spends the whole range rather than one value of it', () => {
    // A roll that always came back at the floor would satisfy the range check
    // above and would be a constant wearing a range's clothes. Read over one
    // map, which carries enough seams of enough kinds to show the spread — and
    // every row's ceiling is 8, so the top of the range has to turn up.
    const map = mapFor(7, 'standard');
    const rolled = new Set<number>();
    for (const tile of map.tiles) {
      if (tile.resourceCopies !== undefined) rolled.add(tile.resourceCopies);
    }
    expect(rolled.size).toBeGreaterThan(3);
    expect(Math.max(...rolled)).toBe(8);
  });

  it('is the same map twice from one seed', () => {
    // Generated rather than memoised: what is under test is that generating
    // twice lands in the same place, which a cache would assert for it.
    const print = (map: GameMap): string =>
      map.tiles.map((tile) => `${tile.resource ?? ''}:${tile.resourceCopies ?? ''}`).join('|');
    expect(print(generateMap(4243, 'standard'))).toBe(print(generateMap(4243, 'standard')));
  });

  it('is the empire’s count, not a count of tiles', () => {
    // The other end of the same field: `resourceCopies` sums the quantity over
    // the opened seams an empire owns, so one seven-copy hill is seven copies
    // and not one.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    const first = at(state, 5, 4);
    first.resource = 'iron';
    first.improvement = improvementForResource('iron')!;
    first.resourceCopies = 7;
    bumpEconomy(state);
    expect(resourceCopies(state, 0, 'iron')).toBe(7);
    // And a second seam adds its own roll rather than another one.
    const second = at(state, 6, 4);
    second.resource = 'iron';
    second.improvement = improvementForResource('iron')!;
    second.resourceCopies = 3;
    bumpEconomy(state);
    expect(resourceCopies(state, 0, 'iron')).toBe(10);
  });

  it('reads the row rather than the number, so a rewritten seam pays its own worth', () => {
    // Nothing in the rules rewrites a tile's resource — they are placed once, in
    // `newGame` — but a bench does, and a leftover quantity under a luxury would
    // quietly multiply it. The reading asks whether the row has a range at all.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    const tile = at(state, 5, 4);
    tile.resource = 'silk';
    tile.improvement = improvementForResource('silk')!;
    tile.resourceCopies = 6;
    bumpEconomy(state);
    expect(resourceCopies(state, 0, 'silk')).toBe(1);
  });
});
