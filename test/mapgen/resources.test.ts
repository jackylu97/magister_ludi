import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import {
  advanceProduction,
  explainTileYield,
  foldTileYield,
  foundCityAt,
  hasResource,
  tileYieldOf,
} from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../../src/sim/game';
import { improvementForResource } from '../../src/sim/improvementData';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex, tileIndex, tileNeighbors, wrappedDistance } from '../../src/sim/map';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES, generateMap, generateMapDetail } from '../../src/sim/mapgen';
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
  carveContinents,
  dealContinentLuxuries,
  landTileCount,
  luxuryGroundOf,
  tileSuitsResource,
} from '../../src/sim/resources';
import { describeResourceEffect } from '../../src/sim/resourceEffects';
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
    // as a fact the map hands out for free. Both are visibility only — an
    // unrevealed seam still pays its yield (see `isResourceVisible`).
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
    //
    // The two fairness passes are the documented exception and this test is
    // where that is pinned down rather than waved at: a guarantee outranks an
    // aesthetic, so a start hemmed in by other finds gets its wheat and its
    // second luxury anyway. Every violation must therefore be **within reach of
    // a possible start** — which is a real constraint, not an escape hatch: a
    // leak in the scatter would show up in open country and fail here.
    for (const [seed, size] of SAMPLES) {
      const map = generateMap(seed, size);
      const starts = chooseStartPositions(map, RULES.game.maxPlayers).map((tile) => tileHex(tile));
      const reach = Math.max(CONFIG.startFoodRadius, CONFIG.startLuxuryRadius);
      for (const tile of resourceTiles(map)) {
        for (const near of mapRange(map, tileHex(tile), CONFIG.minSpacing - 1)) {
          if (near === tile || near.resource === undefined) continue;
          if (near.resource === tile.resource) continue;
          const guaranteed = [tile, near].every((crowded) =>
            starts.some((start) => wrappedDistance(map, start, tileHex(crowded)) <= reach),
          );
          expect(`${seed}/${size} (${tile.col},${tile.row}) ${tile.resource} vs ${near.resource}`)
            .toBe(
              guaranteed
                ? `${seed}/${size} (${tile.col},${tile.row}) ${tile.resource} vs ${near.resource}`
                : 'a crowded pair in open country',
            );
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

  it('holds each kind’s density inside a band on every size', () => {
    // One band per *kind*, because the budgets are per kind now. Luxuries have
    // no per-1000 budget at all — they are dealt per continent, so their
    // density is a consequence of the continent size and the copies range and
    // is asserted as a band around what that arithmetic predicts.
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of [1, 4242]) {
        const map = generateMap(seed, size);
        const land = landTileCount(map);
        const per1000 = (kind: string): number =>
          (resourceTiles(map).filter((tile) => resourceDef(tile.resource!).kind === kind).length /
            land) *
          1000;
        const where = `${size}/${seed}`;

        // The budget is the floor; the two fairness passes and a cluster that
        // ran a tile over the target are what push it above. The ceiling is
        // widest on the *duel* map specifically, and the reason is worth
        // writing down: the guarantees are made to every one of the twelve
        // possible starts, and twelve starts on four hundred land tiles is the
        // densest that promise ever gets.
        expect(`${where} bonus ${per1000('bonus') >= CONFIG.bonusPer1000LandTiles * 0.85}`).toBe(
          `${where} bonus true`,
        );
        expect(`${where} bonus ${per1000('bonus') <= CONFIG.bonusPer1000LandTiles * 1.45}`).toBe(
          `${where} bonus true`,
        );
        expect(
          `${where} strategic ${per1000('strategic') >= CONFIG.strategicPer1000LandTiles * 0.7}`,
        ).toBe(`${where} strategic true`);
        expect(
          `${where} strategic ${per1000('strategic') <= CONFIG.strategicPer1000LandTiles * 1.35}`,
        ).toBe(`${where} strategic true`);
        // Civ 6’s abundance, which is what this pass was asked for: a bonus
        // resource roughly every eight to twelve land tiles, so a decent city
        // site has something worth working without being hunted for.
        expect(`${where} bonus every ${(land / (per1000('bonus') * land / 1000)).toFixed(0)} tiles`)
          .toBe(`${where} bonus every ${Math.min(12, Math.max(8, Math.round(1000 / per1000('bonus'))))} tiles`);
      }
    }
  });

  it('sits a good margin below the density this table used to scatter', () => {
    // A tripwire, not a design spec: `OLD_*_PER_1000` are what `bonus` and
    // `strategic` read before a balance pass cut overall scatter density by
    // roughly a sixth (`bonusPer1000LandTiles` 100→85, `strategicPer1000LandTiles`
    // 26→22, `luxuryCopiesPerKind` {min:4,max:6}→{min:3,max:6}), read off the same seed/size
    // sweep the band test above runs. Duel is left out on purpose — its
    // density is set almost entirely by the near-start fairness guarantees
    // (see that test's comment), which the pass was explicitly told to leave
    // alone, so a small map barely moves and is not the signal this test is
    // for. The point is only that a future edit cannot silently walk the
    // budgets back toward the old numbers without this failing.
    const OLD_BONUS_PER_1000 = 100;
    const OLD_STRATEGIC_PER_1000 = 26;
    let checked = 0;
    for (const size of MAP_SIZE_NAMES) {
      if (size === 'duel') continue;
      for (const seed of [1, 4242]) {
        const map = generateMap(seed, size);
        const land = landTileCount(map);
        const per1000 = (kind: string): number =>
          (resourceTiles(map).filter((tile) => resourceDef(tile.resource!).kind === kind).length /
            land) *
          1000;
        const where = `${size}/${seed}`;
        expect(`${where} bonus ${per1000('bonus') < OLD_BONUS_PER_1000 * 0.9}`).toBe(
          `${where} bonus true`,
        );
        expect(
          `${where} strategic ${per1000('strategic') < OLD_STRATEGIC_PER_1000 * 0.9}`,
        ).toBe(`${where} strategic true`);
        checked += 1;
      }
    }
    expect(checked).toBe((MAP_SIZE_NAMES.length - 1) * 2);
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

  // Re-measured when the generator moved to the elevation/moisture pipeline
  // (ridged relief, quantile terrain cuts, two-scale moisture), and again when
  // `elevation.hillShare` rose from 0.20 to 0.28 to put standalone hills — and
  // therefore hill-and-forest and hill-and-jungle hexes — across the interior in
  // real numbers. Only `tile.hills` moved: the relief *field* is untouched, so
  // elevation, moisture, the rivers and the coastline are bit-identical (which
  // is why the river and lake counts below did not move with them).
  //
  // The fixtures are a *tripwire*, not a golden output: what they promise is
  // that resources draw from `rng` strictly after the ground does, and
  // re-measuring them is exactly what a deliberate change to the ground is
  // supposed to require.
  const FIXTURES: [number, string, string][] = [
    [1234, 'duel', '2b6aeab9'],
    [7, 'duel', 'a3dfb6ad'],
    [31337, 'standard', 'cfffc507'],
    [99, 'large', 'a3cbe4ff'],
    [2024, 'huge', 'bc45fd23'],
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
      // 57 before the relief rework. Springs now have to stand on range ground,
      // and `attemptsPerRiver` replaced a flat attempt cap that a huge map's
      // quota outgrew — between them the huge map finally reaches the count its
      // own `countPer1000Tiles` was always asking for.
      [2024, 'huge', 72, 2],
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
    for (const id of UNIT_TYPE_IDS) {
      const needs = unitDef(id).requiresResource;
      if (needs === undefined) continue;
      expect(RESOURCE_IDS).toContain(needs);
      expect(resourceDef(needs).kind).toBe('strategic');
    }
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

  it('leaves fish permanently unreachable, and says so in the data', () => {
    // The one documented hole: the water improvement is a work boat and naval is
    // deferred. Asserted rather than left implicit, so the day somebody adds the
    // row this test is what tells them to delete it.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).resource = 'fish';
    expect(improvementForResource('fish')).toBeNull();
    expect(hasResource(state, 0, 'fish')).toBe(false);
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

  it('hides the label and never the yield', () => {
    // The citizens are already collecting the production; a panel that hid the
    // number would be a lie the city has to keep telling every turn.
    const state = bareState();
    state.players[0]!.techsResearched = [];
    const tile = at(state, 3, 3);
    tile.resource = 'iron';
    expect(visibleResourceAt(state, 0, tile)).toBeNull();
    expect(tileYieldOf(tile)).toEqual({ food: 2, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
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

/**
 * Luxury variety (playable-loop item 1): ten kinds, regional character, and the
 * guarantee that every start can open two of them.
 *
 * The claims here are about *distribution* rather than about any one seed, so
 * everything sweeps several maps. What is deliberately not asserted is which
 * luxury lands where: that is the scatter's dice doing their job, and pinning it
 * would be pinning the seed.
 */
describe('luxury placement', () => {
  const SEEDS = [1, 7, 99, 1234, 4242];

  it('puts every luxury only on ground its own row allows', () => {
    for (const seed of SEEDS) {
      const map = generateMap(seed, 'standard');
      for (const tile of map.tiles) {
        const id = tile.resource;
        if (id === undefined || resourceDef(id).kind !== 'luxury') continue;
        expect(`${id} on ${tile.terrain}`).toBe(
          `${id} on ${tileSuitsResource(tile, resourceDef(id)) ? tile.terrain : 'illegal ground'}`,
        );
      }
    }
  });

  it('gives every luxury somewhere to live and actually places most of them', () => {
    // A luxury the generator never places is a luxury the table is lying about.
    // "Most" rather than "all" because a single standard map need not carry all
    // ten — the regional hands are the point — so the sweep is over sizes.
    const seen = new Set<ResourceId>();
    for (const size of ['standard', 'large', 'huge']) {
      for (const seed of SEEDS) {
        for (const tile of generateMap(seed, size).tiles) {
          if (tile.resource !== undefined) seen.add(tile.resource);
        }
      }
    }
    for (const id of resourcesOfKind('luxury')) {
      expect(`${id}: ${seen.has(id) ? 'placed' : 'never placed'}`).toBe(`${id}: placed`);
    }
  });

  it('carves the land into continents of a roughly fixed size, each one contiguous', () => {
    // The unit regional character is keyed to. A *continent* is a carved chunk
    // of about `continentTargetTiles`, not a landmass — that is the whole
    // change: keyed to landmasses, a map whose land happens to be one connected
    // mass had one region, was dealt one hand, and read as a single grey
    // average from pole to pole.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SEEDS) {
        const map = generateMap(seed, size);
        const continents = carveContinents(map, CONFIG);
        const where = `${size}/${seed}`;

        expect(`${where}: ${continents.count >= 2}`).toBe(`${where}: true`);

        // Every tile belongs somewhere — water included, which is what gives a
        // pearl bed a continent to belong to.
        const orphans = Array.from(continents.of).filter((id) => id < 0).length;
        expect(`${where}: ${orphans} orphan tiles`).toBe(`${where}: 0 orphan tiles`);

        const core = new Map<number, number[]>();
        for (let i = 0; i < map.tiles.length; i++) {
          if (!continents.core[i]) continue;
          const id = continents.of[i]!;
          const list = core.get(id);
          if (list) list.push(i);
          else core.set(id, [i]);
        }

        const sizes = [...core.values()].map((list) => list.length);
        const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        // A band on the *mean* rather than on every cell: farthest-point seeds
        // divide a lobed continent unevenly on purpose, and a peninsula that
        // comes out half-size is a peninsula, not a bug. What must hold is that
        // the carve is aiming at the configured size at all.
        expect(`${where}: mean ${mean.toFixed(0)} within band`).toBe(
          `${where}: mean ${Math.min(
            Math.max(mean, CONFIG.continentTargetTiles * 0.5),
            CONFIG.continentTargetTiles * 1.6,
          ).toFixed(0)} within band`,
        );
        // No cell may be a shred, and none may be a whole supercontinent that
        // dodged the carve.
        for (const count of sizes) {
          expect(`${where}: cell ${count} <= ${CONFIG.continentTargetTiles * 3}`).toBe(
            `${where}: cell ${Math.min(count, CONFIG.continentTargetTiles * 3)} <= ${
              CONFIG.continentTargetTiles * 3
            }`,
          );
        }

        // Contiguity of every carved core, by flood fill over land only.
        for (const [id, list] of core) {
          const members = new Set(list);
          const reached = new Set<number>([list[0]!]);
          const queue = [list[0]!];
          for (let head = 0; head < queue.length; head++) {
            for (const near of tileNeighbors(map, map.tiles[queue[head]!]!)) {
              const at = tileIndex(map, near.col, near.row);
              if (!members.has(at) || reached.has(at)) continue;
              reached.add(at);
              queue.push(at);
            }
          }
          expect(`${where} continent ${id}: ${reached.size} of ${list.length} connected`).toBe(
            `${where} continent ${id}: ${list.length} of ${list.length} connected`,
          );
        }
      }
    }
  });

  it('carves the same continents every time, and different ones for another seed', () => {
    const map = generateMap(4242, 'standard');
    expect(Array.from(carveContinents(map, CONFIG).of)).toEqual(
      Array.from(carveContinents(map, CONFIG).of),
    );
    const other = generateMap(4243, 'standard');
    expect(Array.from(carveContinents(map, CONFIG).of)).not.toEqual(
      Array.from(carveContinents(other, CONFIG).of),
    );
  });

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

  it('places a dealt kind in multiples on its own continent, not as a lonely hex', () => {
    // Duplicates are the point: they feed the settle-on-the-seam rule, silver
    // and gold’s per-copy signatures, and eventually a trade good worth
    // carrying. What is asserted is the consequence rather than the hand — the
    // hand is drawn mid-stream from the map rng and is not reproducible from
    // outside.
    for (const seed of SEEDS) {
      const map = generateMap(seed, 'large');
      const continents = carveContinents(map, CONFIG);

      /** Luxury tiles of each kind, per continent. */
      const copies = new Map<string, number>();
      const kindTotals = new Map<ResourceId, number>();
      for (let i = 0; i < map.tiles.length; i++) {
        const id = map.tiles[i]!.resource;
        if (id === undefined || resourceDef(id).kind !== 'luxury') continue;
        const key = `${continents.of[i]}|${id}`;
        copies.set(key, (copies.get(key) ?? 0) + 1);
        kindTotals.set(id, (kindTotals.get(id) ?? 0) + 1);
      }

      // Most (kind, continent) pairs that exist at all carry a real seam. Not
      // *every* pair: the start guarantees plant single hexes of a kind the
      // continent was never dealt, and that bending is deliberate.
      const seams = [...copies.values()].filter((n) => n >= CONFIG.luxuryCopiesPerKind.min).length;
      expect(`${seed}: ${seams * 2 >= copies.size}`).toBe(`${seed}: true`);

      // And the map as a whole carries far more luxury than one hex per kind:
      // Civ 6 puts about seven copies of a type on a standard map, and a large
      // map holds more continents than a standard one.
      const mean = [...kindTotals.values()].reduce((a, b) => a + b, 0) / kindTotals.size;
      expect(`${seed}: mean ${mean.toFixed(1)} copies per kind >= 4`).toBe(
        `${seed}: mean ${Math.max(mean, 4).toFixed(1)} copies per kind >= 4`,
      );
      // Most of the table shows up somewhere, which single-hex placement never
      // managed: a map used to carry about half the luxuries in the game.
      expect(`${seed}: ${kindTotals.size} kinds of ${resourcesOfKind('luxury').length}`).toBe(
        `${seed}: ${Math.max(
          kindTotals.size,
          Math.round(resourcesOfKind('luxury').length * 0.7),
        )} kinds of ${resourcesOfKind('luxury').length}`,
      );
    }
  });

  it('gives each continent its own hand, so no one continent carries the table', () => {
    for (const seed of SEEDS) {
      const map = generateMap(seed, 'large');
      const continents = carveContinents(map, CONFIG);
      const kinds = new Map<number, Set<ResourceId>>();
      const sizes = new Map<number, number>();
      for (let i = 0; i < map.tiles.length; i++) {
        if (!continents.core[i]) continue;
        const id = continents.of[i]!;
        sizes.set(id, (sizes.get(id) ?? 0) + 1);
        const resource = map.tiles[i]!.resource;
        if (resource === undefined || resourceDef(resource).kind !== 'luxury') continue;
        let set = kinds.get(id);
        if (!set) {
          set = new Set();
          kinds.set(id, set);
        }
        set.add(resource);
      }

      const luxuries = resourcesOfKind('luxury').length;
      const everywhere = new Set<ResourceId>();
      let biggest = 0;
      for (const [id, set] of kinds) {
        if ((sizes.get(id) ?? 0) < CONFIG.continentTargetTiles * 0.5) continue;
        // A continent holds a hand, never the table. The bound is the hand plus
        // the room the start guarantees have to bend it — see the dealing test.
        const ceiling = CONFIG.luxuryKindsPerContinent + CONFIG.startLuxuryKinds + 2;
        expect(`continent ${id}: ${set.size} of ${luxuries}`).toBe(
          `continent ${id}: ${Math.min(set.size, ceiling)} of ${luxuries}`,
        );
        biggest = Math.max(biggest, set.size);
        for (const id of set) everywhere.add(id);
      }
      // …and the world is more varied than its most varied continent, which is
      // exactly what "variety is geographic" buys.
      expect(everywhere.size).toBeGreaterThan(biggest);
    }
  });

  it('guarantees every possible start every luxury its ground can hold, up to two', () => {
    // The guarantee is `startLuxuryKinds` distinct kinds within
    // `startLuxuryRadius` — and it is bounded by the ground, which is the
    // honest reading rather than a weaker test: a start ringed by flat
    // featureless grassland can host exactly one luxury in the whole table, and
    // no fairness pass may invent a jungle to put spices in.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SEEDS) {
        const map = generateMap(seed, size);
        for (const start of chooseStartPositions(map, RULES.game.maxPlayers)) {
          const near = mapRange(map, tileHex(start), CONFIG.startLuxuryRadius);
          const kinds = new Set<ResourceId>();
          for (const tile of near) {
            const id = tile.resource;
            if (id !== undefined && resourceDef(id).kind === 'luxury') kinds.add(id);
          }
          const possible = resourcesOfKind('luxury').filter((id) =>
            near.some((tile) => tileSuitsResource(tile, resourceDef(id))),
          ).length;
          const owed = Math.min(CONFIG.startLuxuryKinds, possible);
          const where = `${size}/${seed} (${start.col},${start.row})`;
          expect(`${where}: ${kinds.size} of ${owed}`).toBe(
            `${where}: ${Math.max(kinds.size, owed)} of ${owed}`,
          );
        }
      }
    }
  });

  it('gives one of a start’s guaranteed kinds in multiples, not a single hex', () => {
    // Civ 5’s contribution to the same promise, and the answer to "there is
    // nowhere worth settling near my capital": one lonely wine four hexes away
    // is a curiosity, a seam of two is a reason to plant a city on it. Bounded
    // by the ground for the same reason the kinds guarantee is — no pass may
    // invent a jungle to put spices in — so the claim is made against what the
    // rings could actually grow.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SEEDS) {
        const map = generateMap(seed, size);
        for (const start of chooseStartPositions(map, RULES.game.maxPlayers)) {
          const near = mapRange(map, tileHex(start), CONFIG.startLuxuryRadius);
          const copies = new Map<ResourceId, number>();
          for (const tile of near) {
            const id = tile.resource;
            if (id !== undefined && resourceDef(id).kind === 'luxury') {
              copies.set(id, (copies.get(id) ?? 0) + 1);
            }
          }
          // The deepest seam the ground could carry: for each kind, what it
          // already has plus the *free* tiles in reach that would take it. A
          // start hemmed in by mountains and ocean gets fewer, and that is the
          // honest bound rather than a weaker test.
          const room = Math.max(
            0,
            ...resourcesOfKind('luxury').map(
              (id) =>
                (copies.get(id) ?? 0) +
                near.filter(
                  (tile) =>
                    tile.resource === undefined && tileSuitsResource(tile, resourceDef(id)),
                ).length,
            ),
          );
          const owed = Math.min(CONFIG.startLuxuryCopies, room);
          const best = Math.max(0, ...copies.values());
          const where = `${size}/${seed} (${start.col},${start.row})`;
          expect(`${where}: deepest seam ${best} of ${owed}`).toBe(
            `${where}: deepest seam ${Math.max(best, owed)} of ${owed}`,
          );
        }
      }
    }
  });

  it('still guarantees every possible start a bonus food', () => {
    // The pass that was here before this one, unchanged and still holding: the
    // luxury guarantee was added beside it, not on top of it.
    for (const seed of SEEDS) {
      const map = generateMap(seed, 'standard');
      for (const start of chooseStartPositions(map, RULES.game.maxPlayers)) {
        const fed = mapRange(map, tileHex(start), CONFIG.startFoodRadius).some(
          (tile) => tile.resource !== undefined && isBonusFood(tile.resource),
        );
        expect(`(${start.col},${start.row}): ${fed ? 'fed' : 'hungry'}`).toBe(
          `(${start.col},${start.row}): fed`,
        );
      }
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
/**
 * The three defects the resource survey found, each pinned by the measurement
 * that found it.
 *
 * These are *sweeps* rather than examples, and they have to be: every one of the
 * three was invisible on any single map and obvious across fifteen. A hand dealt
 * a kind with nowhere to grow looks, on the map in front of you, exactly like a
 * hand of three; a luxury total of 65 per 1000 land looks exactly like one of
 * 90; a continent of 477 tiles looks like a continent.
 */
describe('what the survey found', () => {
  /** Enough maps to see a distribution, few enough to stay under a second each. */
  const SWEEP = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
  const LUXURIES = resourcesOfKind('luxury');

  /** Every luxury kind's tile count on one map, zeroes kept. */
  function luxuryCounts(map: GameMap): Map<ResourceId, number> {
    const counts = new Map<ResourceId, number>(LUXURIES.map((id) => [id, 0]));
    for (const tile of map.tiles) {
      const id = tile.resource;
      if (id === undefined || resourceDef(id).kind !== 'luxury') continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  it('never deals a continent a kind its ground cannot wear', () => {
    // The zero-copy pathology, at its source. A hand is dealt before a single
    // tile is placed, so a kind named on ground that cannot grow it is a kind
    // the map will simply never carry — coffee was absent from eleven maps in
    // fifteen this way, spices and sugar from ten.
    for (const seed of SWEEP.slice(0, 6)) {
      const map = generateMap(seed, 'standard');
      const continents = carveContinents(map, CONFIG);
      const candidates = new Map<ResourceId, Tile[]>();
      for (const id of LUXURIES) {
        candidates.set(id, map.tiles.filter((tile) => tileSuitsResource(tile, resourceDef(id))));
      }
      const ground = luxuryGroundOf(map, continents, candidates, CONFIG);
      const hands = dealContinentLuxuries(makeRng(seed), continents.count, CONFIG, ground);

      for (let continent = 0; continent < continents.count; continent++) {
        for (const id of hands[continent] ?? []) {
          const room = (candidates.get(id) ?? []).filter(
            (tile) => continents.of[tileIndex(map, tile.col, tile.row)] === continent,
          ).length;
          expect(`${seed} continent ${continent} dealt ${id}: room for ${room}`).toBe(
            `${seed} continent ${continent} dealt ${id}: room for ${Math.max(
              room,
              CONFIG.luxuryMinCopiesPerContinent,
            )}`,
          );
        }
      }
    }
  });

  it('grows every kind it deals as a seam, never as a lonely hex', () => {
    // The consequence on the finished map. The one documented exception is the
    // start guarantee, which plants single hexes of a kind a continent was never
    // dealt precisely because a start with nothing to trade is the worse fault —
    // so a group is allowed to be a single hex only when *every* copy in it
    // stands inside a start's guarantee radius.
    const floor = Math.round(CONFIG.luxuryMinCopiesPerContinent);
    for (const seed of SWEEP.slice(0, 6)) {
      const map = generateMap(seed, 'standard');
      const continents = carveContinents(map, CONFIG);
      const guarded = new Set<number>();
      for (const start of chooseStartPositions(map, RULES.game.maxPlayers)) {
        for (const near of mapRange(map, tileHex(start), CONFIG.startLuxuryRadius)) {
          guarded.add(tileIndex(map, near.col, near.row));
        }
      }

      const groups = new Map<string, { copies: number; free: number }>();
      for (let i = 0; i < map.tiles.length; i++) {
        const id = map.tiles[i]!.resource;
        if (id === undefined || resourceDef(id).kind !== 'luxury') continue;
        const key = `${continents.of[i]}|${id}`;
        const seen = groups.get(key) ?? { copies: 0, free: 0 };
        seen.copies += 1;
        if (!guarded.has(i)) seen.free += 1;
        groups.set(key, seen);
      }

      for (const [key, group] of groups) {
        // Wholly inside a guarantee radius: the guarantee's business, not the
        // deal's.
        if (group.free === 0) continue;
        if (group.copies >= floor) continue;
        // The only other way out is ground: `deepenThinSeams` tops every thin
        // group up, so one that is still thin had nowhere *legal* left to put a
        // copy — free ground of the right kind, on the right continent, with no
        // other find inside the spacing rule. That last clause is the honest one:
        // the density pass honours spacing where the guarantee passes do not, so
        // a continent can have room for a second wine and still not be allowed
        // to grow one there.
        const [continent, id] = key.split('|');
        const room = map.tiles.filter((tile) => {
          if (tile.resource !== undefined) return false;
          if (String(continents.of[tileIndex(map, tile.col, tile.row)]) !== continent) return false;
          if (!tileSuitsResource(tile, resourceDef(id as ResourceId))) return false;
          return !mapRange(map, tileHex(tile), CONFIG.minSpacing - 1).some(
            (near) => near.resource !== undefined && near.resource !== id,
          );
        }).length;
        expect(`${seed} ${key}: ${group.copies} copies, ${room} legal tiles`).toBe(
          `${seed} ${key}: ${group.copies} copies, 0 legal tiles`,
        );
      }
    }
  });

  it('puts every luxury in the table on a healthy share of maps', () => {
    // The global reading, and the one the survey was actually about. Before the
    // feature-aware deal, four kinds were missing from more than half the maps
    // generated and the table read as a lie. The floor is two thirds rather than
    // "always" on purpose: a kind that turned up on *every* map would mean the
    // deal had stopped being a deal.
    const seen = new Map<ResourceId, number>(LUXURIES.map((id) => [id, 0]));
    for (const seed of SWEEP) {
      for (const [id, copies] of luxuryCounts(generateMap(seed, 'standard'))) {
        if (copies > 0) seen.set(id, (seen.get(id) ?? 0) + 1);
      }
    }
    const floor = Math.ceil(SWEEP.length * 0.6);
    for (const id of LUXURIES) {
      const maps = seen.get(id) ?? 0;
      expect(`${id}: on ${maps} of ${SWEEP.length} maps`).toBe(
        `${id}: on ${Math.max(maps, floor)} of ${SWEEP.length} maps`,
      );
    }
  });

  it('holds the luxury total inside its budget band on every map', () => {
    // The third budget. The deal alone swung from 65 to 90 tiles per 1000 land
    // across fifteen maps — a 38% swing in how much of the trading half of the
    // game exists, decided by how many continents the coastline happened to
    // make. `settleLuxuryDensity` trims or tops up to `luxuryPer1000LandTiles`,
    // and the band asserted here is the one that pass works to.
    for (const size of ['duel', 'standard', 'large']) {
      for (const seed of SWEEP.slice(0, 6)) {
        const map = generateMap(seed, size);
        const land = landTileCount(map);
        const target = Math.round((land / 1000) * CONFIG.luxuryPer1000LandTiles);
        const low = Math.floor(target * (1 - CONFIG.luxuryDensityTolerance));
        const high = Math.ceil(target * (1 + CONFIG.luxuryDensityTolerance));
        let total = 0;
        for (const copies of luxuryCounts(map).values()) total += copies;

        // The one thing the budget may not cut into is the guarantees, which
        // run before it and which it deliberately refuses to touch. On a duel
        // map the twelve possible starts are packed close enough that their
        // guaranteed seams alone outweigh the budget, and a trim that took them
        // would be the budget overruling a fairness pass — so the ceiling is
        // whichever of the two is higher, and it is stated rather than tuned
        // around.
        let bound = 0;
        for (const start of chooseStartPositions(map, RULES.game.maxPlayers)) {
          for (const near of mapRange(map, tileHex(start), CONFIG.startLuxuryRadius)) {
            const id = near.resource;
            if (id !== undefined && resourceDef(id).kind === 'luxury') bound += 1;
          }
        }
        const ceiling = Math.max(high, bound);
        const where = `${size}/${seed}`;
        expect(`${where}: ${total} in [${low}, ${ceiling}]`).toBe(
          `${where}: ${Math.min(Math.max(total, low), ceiling)} in [${low}, ${ceiling}]`,
        );
      }
    }
  });

  it('carves continents to a fixed size, with one documented remainder', () => {
    // The band is arithmetic rather than hope: a component of `x · target` tiles
    // is cut into `round(x)` pieces under a size quota, so no piece exceeds
    // `1.5 · target`, and `minContinentTiles` is the floor under `x` itself.
    // What is *left* below the band is the remainder the docblock names — a
    // whole small landmass with no land border to be folded across. Before the
    // quota the same sweep ran from 19 tiles to 477 against a target of 170.
    const target = CONFIG.continentTargetTiles;
    const ceiling = Math.round(target * 1.5);
    let stranded = 0;
    let cells = 0;
    for (const seed of SWEEP) {
      const map = generateMap(seed, 'standard');
      const continents = carveContinents(map, CONFIG);
      const sizes = new Array<number>(continents.count).fill(0);
      for (let i = 0; i < map.tiles.length; i++) {
        if (continents.core[i]) sizes[continents.of[i]!]! += 1;
      }
      for (let id = 0; id < sizes.length; id++) {
        cells += 1;
        const size = sizes[id]!;
        // The ceiling holds without exception — that half is construction.
        expect(`${seed}/${id}: ${size} <= ${ceiling}`).toBe(
          `${seed}/${id}: ${Math.min(size, ceiling)} <= ${ceiling}`,
        );
        if (size >= Math.round(target * 0.6)) continue;
        // Below the band it must have had nowhere to fold: either no land
        // border at all (a whole small landmass) or no neighbour it could join
        // without breaking the ceiling at the other end of the band. That is
        // exactly the rule `mergeSmallContinents` works to.
        const neighbours = new Set<number>();
        for (let i = 0; i < map.tiles.length; i++) {
          if (!continents.core[i] || continents.of[i] !== id) continue;
          for (const near of tileNeighbors(map, map.tiles[i]!)) {
            const at = tileIndex(map, near.col, near.row);
            if (continents.core[at] && continents.of[at] !== id) neighbours.add(continents.of[at]!);
          }
        }
        stranded += 1;
        const foldable = [...neighbours].filter((other) => size + sizes[other]! <= ceiling);
        expect(`${seed}/${id}: undersized, ${foldable.length} folds available`).toBe(
          `${seed}/${id}: undersized, 0 folds available`,
        );
      }
    }
    // And the remainder is a remainder: a handful of islands, not the rule.
    expect(`${stranded} of ${cells} stranded`).toBe(
      `${Math.min(stranded, Math.floor(cells * 0.1))} of ${cells} stranded`,
    );
  });
});

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
