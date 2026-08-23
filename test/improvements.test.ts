import { describe, expect, it } from 'vitest';

import {
  assignCitizens,
  cityYields,
  explainTileYield,
  foldTileYield,
  hasResource,
  tileYieldOf,
  foundCityAt,
  yieldContextFor,
} from '../src/sim/cities';
import { type Command, applyCommand } from '../src/sim/commands';
import {
  type Game,
  createGame,
  dispatch,
  loadGame,
  replay,
  saveGame,
  snapshotState,
} from '../src/sim/game';
import {
  IMPROVEMENT_DATA,
  IMPROVEMENT_IDS,
  type ImprovementId,
  improvementDef,
  improvementForResource,
  improvementYield,
  isImprovementId,
} from '../src/sim/improvementData';
import {
  chargesLeft,
  improvementError,
  improvementErrorAt,
  improvementYieldDelta,
  isBuilder,
  pillageError,
} from '../src/sim/improvements';
import { type Tile, createMap, getTileAt } from '../src/sim/map';
import { RESOURCE_IDS, resourceYield } from '../src/sim/resourceData';
import { RULES } from '../src/sim/rulesData';
import {
  type GameState,
  type Unit,
  SCHEMA_VERSION,
  createUnit,
  newGame,
  unitById,
} from '../src/sim/state';
import {
  FEATURE_IDS,
  type FeatureId,
  TERRAIN_IDS,
  type TerrainId,
  tileYield,
} from '../src/sim/terrainData';
import { TECH_IDS } from '../src/sim/techData';
import { unitDef } from '../src/sim/unitData';
import { computeFreshwater } from '../src/sim/water';
import { resetVisibility } from '../src/sim/visibility';
import { isIdleUnit } from '../src/ui/turnBlockers';

/**
 * Milestone 7: workers, the things they build, and the raiders who burn them.
 *
 * Three separable claims are being defended here and they are kept apart on
 * purpose, because they fail for different reasons:
 *
 *   1. **The explainable-yields refactor** (CLAUDE.md hard rule 5). `tileYieldOf`
 *      is now the fold of an ordered contribution list and nothing else. The
 *      load-bearing test is the *golden* one: on every terrain/feature/hills
 *      combination the fold must equal the pre-M7 arithmetic, computed here from
 *      the same tables the old implementation read, so the refactor is provably
 *      a refactor.
 *   2. **The two commands.** Fully validated, byte-identical on refusal, and
 *      enabled by exactly the evaluator the unit panel builds its buttons from.
 *   3. **The Entry IX correction.** Resource access is improvement-gated now,
 *      which is a rule change rather than a refactor, and the flips it causes are
 *      asserted where they bite (`test/resources.test.ts` carries the rest).
 */

// --- fixtures ---------------------------------------------------------------

/**
 * A two-player game on a blank grassland board, every technology held.
 *
 * The same shape `resources.test.ts` and `resources3d.test.ts` use: the map is
 * replaced under a real `newGame`, so everything that is sized from the board
 * (the fog grids, `tileOwner`) is resized with it.
 */
function bareState(width = 12, height = 10): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A player-0 city at (5, 5) and a worker of theirs standing on `(col, row)`. */
function workerState(col = 5, row = 4): { state: GameState; worker: Unit } {
  const state = bareState();
  foundCityAt(state, 0, at(state, 5, 5));
  const worker = createUnit(state, 0, 'worker', col, row);
  return { state, worker };
}

function build(playerId: number, unitId: number, improvement: ImprovementId): Command {
  return { type: 'buildImprovement', playerId, unitId, improvement };
}

// --- the table --------------------------------------------------------------

describe('the improvement table', () => {
  it('names six improvements and recognises its own ids', () => {
    expect(IMPROVEMENT_IDS).toEqual([
      'farm',
      'mine',
      'pasture',
      'camp',
      'quarry',
      'plantation',
    ]);
    expect(isImprovementId('farm')).toBe(true);
    expect(isImprovementId('orchard')).toBe(false);
    expect(isImprovementId(7)).toBe(false);
  });

  it('only ever names terrains, features, resources and techs that exist', () => {
    for (const id of IMPROVEMENT_IDS) {
      const def = improvementDef(id);
      expect(def.chargeCost).toBeGreaterThan(0);
      for (const terrain of def.validTerrain ?? []) expect(TERRAIN_IDS).toContain(terrain);
      for (const feature of def.validFeatures ?? []) expect(FEATURE_IDS).toContain(feature);
      for (const resource of def.requiresResource ?? []) expect(RESOURCE_IDS).toContain(resource);
      for (const resource of def.improvesResource ?? []) expect(RESOURCE_IDS).toContain(resource);
      for (const upgrade of def.upgrades ?? []) expect(TECH_IDS).toContain(upgrade.tech);
    }
  });

  it('constrains every row: no improvement is buildable on the ocean floor', () => {
    for (const id of IMPROVEMENT_IDS) {
      const def = improvementDef(id);
      const constrained = def.validTerrain !== undefined || def.requiresResource !== undefined;
      expect(constrained, `${id} constrains nothing`).toBe(true);
    }
  });

  it('gives every resource but fish exactly one improvement', () => {
    // The forward table is written per improvement; this is the inversion, and
    // the only hole in it is the documented one.
    const covered = RESOURCE_IDS.filter((id) => improvementForResource(id) !== null);
    expect(covered.sort()).toEqual(RESOURCE_IDS.filter((id) => id !== 'fish').sort());
    expect(improvementForResource('fish')).toBeNull();
  });

  it('hands back a fresh yield object, so a caller cannot retune the game', () => {
    const first = improvementYield('farm');
    first.food += 99;
    expect(improvementYield('farm').food).toBe(IMPROVEMENT_DATA.improvements.farm.yields.food);
  });

  it('splits the roster into ground-workers and resource-workers', () => {
    // The two kinds fall out of which filters a row uses, not out of a `kind`
    // field — and the composition rule follows the same split.
    for (const id of ['farm', 'mine'] as const) {
      expect(improvementDef(id).requiresResource).toBeUndefined();
      expect(improvementDef(id).clearsClutter).toBe(true);
    }
    for (const id of ['pasture', 'camp', 'quarry', 'plantation'] as const) {
      expect(improvementDef(id).requiresResource?.length).toBeGreaterThan(0);
      expect(improvementDef(id).validTerrain).toBeUndefined();
      expect(improvementDef(id).clearsClutter).toBe(false);
    }
  });
});

// --- the worker -------------------------------------------------------------

describe('the worker', () => {
  it('is a civilian with charges, unlocked from the opening kit', () => {
    const def = unitDef('worker');
    expect(def.category).toBe('civilian');
    expect(def.charges).toBe(3);
    expect(def.movement).toBe(2);
    expect(def.sight).toBe(2);
    expect(def.modelClass).toBe('worker');
    expect(def.foundsCity).toBe(false);
  });

  it('is the only type with charges, and presence is the marker', () => {
    const builders = ['warrior', 'settler', 'scout', 'worker'] as const;
    for (const id of builders) {
      expect(unitDef(id).charges !== undefined).toBe(id === 'worker');
    }
  });

  it('is born with its charges and nothing else is', () => {
    const state = bareState();
    const worker = createUnit(state, 0, 'worker', 3, 3);
    const warrior = createUnit(state, 0, 'warrior', 4, 3);
    expect(worker.chargesLeft).toBe(3);
    expect(isBuilder(worker)).toBe(true);
    // Absent, not zero: a soldier serialises exactly as it did before builders
    // existed. See `Unit.chargesLeft`.
    expect('chargesLeft' in warrior).toBe(false);
    expect(isBuilder(warrior)).toBe(false);
    expect(chargesLeft(warrior)).toBe(0);
  });

  it('blocks the end of a turn while it stands idle with work to do', () => {
    const { worker } = workerState();
    expect(isIdleUnit(worker)).toBe(true);
    // Building spends the whole allowance, which is what stops it blocking again.
    worker.movesLeft = 0;
    expect(isIdleUnit(worker)).toBe(false);
  });
});

// --- building ---------------------------------------------------------------

describe('buildImprovement', () => {
  it('lays the improvement instantly and charges the worker', () => {
    const { state, worker } = workerState();
    expect(applyCommand(state, build(0, worker.id, 'farm'))).toEqual({ ok: true });
    expect(at(state, 5, 4).improvement).toBe('farm');
    expect(worker.chargesLeft).toBe(2);
    // All of it, not one point: building is the turn's work.
    expect(worker.movesLeft).toBe(0);
  });

  it('changes the tile yield in the same breath, with no phase to wait for', () => {
    const { state, worker } = workerState();
    const tile = at(state, 5, 4);
    expect(tileYieldOf(tile)).toEqual({ food: 2, production: 0, gold: 0 });
    applyCommand(state, build(0, worker.id, 'farm'));
    expect(tileYieldOf(tile)).toEqual({ food: 3, production: 0, gold: 0 });
  });

  it('removes the worker when its last charge goes', () => {
    const { state, worker } = workerState();
    worker.chargesLeft = 1;
    expect(applyCommand(state, build(0, worker.id, 'farm'))).toEqual({ ok: true });
    expect(unitById(state, worker.id)).toBeUndefined();
    expect(state.units).toHaveLength(0);
    // And the work stands: the piece left, the farm did not.
    expect(at(state, 5, 4).improvement).toBe('farm');
  });

  it('refuses a unit that is not a builder', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    const warrior = createUnit(state, 0, 'warrior', 5, 4);
    const result = applyCommand(state, build(0, warrior.id, 'farm'));
    expect(result).toEqual({ ok: false, error: 'A Warrior cannot build improvements' });
    expect(at(state, 5, 4).improvement).toBeUndefined();
  });

  it('refuses a worker with no charges and no movement', () => {
    const { state, worker } = workerState();
    worker.chargesLeft = 0;
    expect(improvementError(state, worker.id, 'farm')).toBe(
      'This worker has no charges left',
    );
    worker.chargesLeft = 2;
    worker.movesLeft = 0;
    expect(improvementError(state, worker.id, 'farm')).toBe(
      `Unit ${worker.id} has no movement left`,
    );
  });

  it('refuses ground that is not the actor\'s own', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    // Unclaimed, well outside the opening ring.
    const wanderer = createUnit(state, 0, 'worker', 11, 9);
    expect(applyCommand(state, build(0, wanderer.id, 'farm'))).toEqual({
      ok: false,
      error: '(11, 9) is not in your territory',
    });

    // A rival's ground is refused with a different sentence, because it is a
    // different problem.
    foundCityAt(state, 1, at(state, 2, 2));
    const trespasser = createUnit(state, 0, 'worker', 2, 1);
    const result = applyCommand(state, build(0, trespasser.id, 'farm'));
    expect(result).toEqual({ ok: false, error: '(2, 1) belongs to player 1' });
  });

  it('refuses the city tile itself', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const worker = createUnit(state, 0, 'worker', 5, 5);
    expect(applyCommand(state, build(0, worker.id, 'farm'))).toEqual({
      ok: false,
      error: `${city.name} stands on (5, 5)`,
    });
  });

  it('refuses the same improvement twice, and allows a different one', () => {
    const { state, worker } = workerState();
    at(state, 5, 4).improvement = 'farm';
    expect(applyCommand(state, build(0, worker.id, 'farm'))).toEqual({
      ok: false,
      error: '(5, 4) already has a farm',
    });
    // Replacing a farm with something else is legal — it is one build's work
    // either way, and there is no "clear" verb to make it two.
    at(state, 5, 4).hills = true;
    expect(applyCommand(state, build(0, worker.id, 'mine'))).toEqual({ ok: true });
    expect(at(state, 5, 4).improvement).toBe('mine');
  });

  describe('the constraint shape', () => {
    it('holds a farm to flat, featureless, farmable terrain', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);

      tile.hills = true;
      expect(improvementError(state, worker.id, 'farm')).toBe('A farm needs flat ground');
      tile.hills = false;
      tile.feature = 'forest';
      expect(improvementError(state, worker.id, 'farm')).toBe(
        'A farm cannot be built in forest',
      );
      tile.feature = 'none';
      tile.terrain = 'tundra';
      expect(improvementError(state, worker.id, 'farm')).toBe(
        'A farm cannot be built on tundra',
      );
      tile.terrain = 'plains';
      expect(improvementError(state, worker.id, 'farm')).toBeNull();
    });

    it('holds a mine to high ground', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      expect(improvementError(state, worker.id, 'mine')).toBe('A mine needs hills');
      tile.hills = true;
      expect(improvementError(state, worker.id, 'mine')).toBeNull();
    });

    it('holds a resource-improvement to its own resources', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      expect(improvementError(state, worker.id, 'pasture')).toBe(
        'A pasture needs a resource it can work',
      );
      tile.resource = 'deer';
      expect(improvementError(state, worker.id, 'pasture')).toBe(
        'A pasture needs a resource it can work',
      );
      expect(improvementError(state, worker.id, 'camp')).toBeNull();
      tile.resource = 'cattle';
      expect(improvementError(state, worker.id, 'pasture')).toBeNull();
    });

    it('lets a camp be built in the forest a resource-improvement lives in', () => {
      // The four resource-improvements name no terrain and no feature, because
      // the resource's own placement rules already pin both. Deer are in forests.
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.feature = 'forest';
      tile.resource = 'deer';
      expect(improvementError(state, worker.id, 'camp')).toBeNull();
    });

    it('is one evaluator: the ground half answers with no unit on it', () => {
      const state = bareState();
      foundCityAt(state, 0, at(state, 5, 5));
      const tile = at(state, 5, 4);
      // What a lens or an AI would ask, and it agrees with the command exactly.
      expect(improvementErrorAt(state, 0, tile, 'farm')).toBeNull();
      expect(improvementErrorAt(state, 0, tile, 'mine')).toBe('A mine needs hills');
      expect(improvementErrorAt(state, 1, tile, 'farm')).toBe('(5, 4) belongs to player 0');
    });
  });

  it('is turn-gated, and refuses somebody else\'s worker', () => {
    const { state, worker } = workerState();
    state.turnEnded[0] = true;
    expect(applyCommand(state, build(0, worker.id, 'farm'))).toEqual({
      ok: false,
      error: `Player 0 has ended turn ${state.turn} and cannot build`,
    });
    state.turnEnded[0] = false;
    const result = applyCommand(state, build(1, worker.id, 'farm'));
    expect(result).toEqual({
      ok: false,
      error: `Unit ${worker.id} does not belong to player 1`,
    });
  });

  it('leaves the state byte-identical when it refuses', () => {
    const { state, worker } = workerState();
    at(state, 5, 4).hills = true;
    const before = snapshotState(state);
    expect(applyCommand(state, build(0, worker.id, 'farm')).ok).toBe(false);
    expect(applyCommand(state, build(0, worker.id, 'pasture')).ok).toBe(false);
    expect(applyCommand(state, build(0, 999, 'farm')).ok).toBe(false);
    expect(applyCommand(state, build(0, worker.id, 'orchard' as ImprovementId)).ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('spends three charges on three tiles and then the worker is gone', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    const worker = createUnit(state, 0, 'worker', 5, 4);
    const cells: [number, number][] = [
      [5, 4],
      [4, 5],
      [6, 5],
    ];
    for (const [col, row] of cells) {
      worker.col = col;
      worker.row = row;
      worker.movesLeft = 2;
      expect(applyCommand(state, build(0, worker.id, 'farm')).ok).toBe(true);
    }
    expect(state.units).toHaveLength(0);
    for (const [col, row] of cells) expect(at(state, col, row).improvement).toBe('farm');
  });
});

// --- pillaging --------------------------------------------------------------

describe('pillage', () => {
  /** A player-1 farm at (2, 1), and a player-0 warrior standing on it. */
  function raidState(): { state: GameState; raider: Unit } {
    const state = bareState();
    foundCityAt(state, 1, at(state, 2, 2));
    at(state, 2, 1).improvement = 'farm';
    const raider = createUnit(state, 0, 'warrior', 2, 1);
    return { state, raider };
  }

  it('burns the improvement, pays the raider and costs one point', () => {
    const { state, raider } = raidState();
    raider.movesLeft = 2;
    expect(applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id })).toEqual({
      ok: true,
    });
    expect(at(state, 2, 1).improvement).toBeUndefined();
    expect(state.players[0]!.gold).toBe(RULES.improvements.pillageGold);
    // One point, not the whole allowance: a column burns a farm riding past.
    expect(raider.movesLeft).toBe(1);
  });

  it('refuses your own ground', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    at(state, 5, 4).improvement = 'farm';
    const raider = createUnit(state, 0, 'warrior', 5, 4);
    expect(pillageError(state, raider.id)).toBe('(5, 4) is your own ground');
    expect(applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id }).ok).toBe(
      false,
    );
    expect(at(state, 5, 4).improvement).toBe('farm');
  });

  it('refuses a civilian, an empty tile and a spent unit', () => {
    const { state, raider } = raidState();
    const worker = createUnit(state, 0, 'worker', 3, 1);
    expect(pillageError(state, worker.id)).toBe('A Worker cannot pillage');

    raider.movesLeft = 0;
    expect(pillageError(state, raider.id)).toBe(`Unit ${raider.id} has no movement left`);

    raider.movesLeft = 2;
    delete at(state, 2, 1).improvement;
    expect(pillageError(state, raider.id)).toBe('There is nothing to pillage on (2, 1)');
  });

  it('is turn-gated and leaves the state byte-identical when it refuses', () => {
    const { state, raider } = raidState();
    state.turnEnded[0] = true;
    const before = snapshotState(state);
    expect(applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id })).toEqual({
      ok: false,
      error: `Player 0 has ended turn ${state.turn} and cannot pillage`,
    });
    expect(snapshotState(state)).toBe(before);
  });

  it('takes the rival\'s strategic access with it', () => {
    const state = bareState();
    foundCityAt(state, 1, at(state, 2, 2));
    const seam = at(state, 2, 1);
    seam.hills = true;
    seam.resource = 'iron';
    seam.improvement = 'mine';
    expect(hasResource(state, 1, 'iron')).toBe(true);

    const raider = createUnit(state, 0, 'warrior', 2, 1);
    expect(applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id }).ok).toBe(
      true,
    );
    // Nobody has it now: the raider does not own the tile, and the owner has no
    // mine. That is the whole rule, with no bookkeeping of its own.
    expect(hasResource(state, 1, 'iron')).toBe(false);
    expect(hasResource(state, 0, 'iron')).toBe(false);
  });
});

// --- explainable yields -----------------------------------------------------

describe('explainTileYield', () => {
  /**
   * The pre-M7 arithmetic, written out from the same tables the old
   * implementation read: terrain/feature/hills overrides, then the resource as
   * the one term that adds. This is the golden reference, and the point of
   * writing it here rather than importing it is that it cannot be quietly
   * changed by an edit to the thing it is checking.
   */
  function legacyYield(tile: Tile): { food: number; production: number; gold: number } {
    const base = tileYield(tile.terrain, tile.feature, tile.hills);
    if (tile.resource === undefined) return base;
    const extra = resourceYield(tile.resource);
    return {
      food: base.food + extra.food,
      production: base.production + extra.production,
      gold: base.gold + extra.gold,
    };
  }

  function bareTile(patch: Partial<Tile> = {}): Tile {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const tile = map.tiles[4]!;
    Object.assign(tile, patch);
    return tile;
  }

  it('folds to the legacy total on every unimproved combination', () => {
    // THE golden test: the refactor is a refactor. Every terrain × feature ×
    // hills, plus every resource on its own legal terrain.
    for (const terrain of TERRAIN_IDS as TerrainId[]) {
      for (const feature of FEATURE_IDS as FeatureId[]) {
        for (const hills of [false, true]) {
          const tile = bareTile({ terrain, feature, hills });
          expect(
            foldTileYield(explainTileYield(tile)),
            `${terrain}/${feature}/${hills ? 'hills' : 'flat'}`,
          ).toEqual(legacyYield(tile));
        }
      }
    }
    for (const resource of RESOURCE_IDS) {
      for (const hills of [false, true]) {
        const tile = bareTile({ resource, hills });
        expect(foldTileYield(explainTileYield(tile)), resource).toEqual(legacyYield(tile));
      }
    }
  });

  it('is the only implementation: tileYieldOf is the fold', () => {
    const tile = bareTile({ feature: 'forest', resource: 'deer', improvement: 'camp' });
    expect(tileYieldOf(tile)).toEqual(foldTileYield(explainTileYield(tile)));
  });

  it('names the terrain as the base and every step in resolution order', () => {
    const tile = bareTile({ feature: 'forest', hills: true, resource: 'deer' });
    const list = explainTileYield(tile);
    expect(list.map((entry) => [entry.source, entry.kind])).toEqual([
      ['Grassland', 'base'],
      ['Forest', 'override'],
      ['Hills', 'override'],
      ['Deer', 'add'],
    ]);
    // The forest is written down even though the hill overrides it — that is the
    // *explanation*, and the fold reaches the hill's number either way.
    expect(foldTileYield(list)).toEqual({ food: 1, production: 2, gold: 0 });
  });

  it('adds the improvement last, after the resource', () => {
    const tile = bareTile({ resource: 'wheat', improvement: 'farm' });
    const list = explainTileYield(tile);
    expect(list.map((entry) => entry.source)).toEqual(['Grassland', 'Wheat', 'Farm']);
    expect(list[2]).toEqual({ source: 'Farm', kind: 'add', food: 1, production: 0, gold: 0 });
    expect(foldTileYield(list)).toEqual({ food: 4, production: 0, gold: 0 });
  });

  it('carries every kind of entry', () => {
    const kinds = new Set(
      explainTileYield(bareTile({ feature: 'forest', resource: 'deer', improvement: 'camp' })).map(
        (entry) => entry.kind,
      ),
    );
    expect(kinds).toEqual(new Set(['base', 'override', 'add']));
  });

  it('has an entry for every improvement, and each one moves the total', () => {
    for (const id of IMPROVEMENT_IDS) {
      const tile = bareTile({ improvement: id });
      const entry = explainTileYield(tile).find((row) => row.source === improvementDef(id).name);
      expect(entry, id).toBeDefined();
      expect(entry!.kind).toBe('add');
      expect(entry!.food + entry!.production + entry!.gold, id).toBeGreaterThan(0);
    }
  });
});

// --- the renewal hook -------------------------------------------------------

describe('growth renewals', () => {
  const withTech = { techs: ['feudalism' as const] };

  it('pays nothing without the technology, whatever the water', () => {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const tile = map.tiles[4]!;
    tile.improvement = 'farm';
    tile.freshwater = true;
    expect(tileYieldOf(tile)).toEqual({ food: 3, production: 0, gold: 0 });
    expect(tileYieldOf(tile, { techs: [] })).toEqual({ food: 3, production: 0, gold: 0 });
  });

  it('pays with the technology, but only on fresh water', () => {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const dry = map.tiles[4]!;
    dry.improvement = 'farm';
    expect(tileYieldOf(dry, withTech)).toEqual({ food: 3, production: 0, gold: 0 });

    const wet = map.tiles[5]!;
    wet.improvement = 'farm';
    wet.freshwater = true;
    expect(tileYieldOf(wet, withTech)).toEqual({ food: 4, production: 0, gold: 0 });
  });

  it('appears as its own contribution entry, named for the technology', () => {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const tile = map.tiles[4]!;
    tile.improvement = 'farm';
    tile.freshwater = true;
    const list = explainTileYield(tile, withTech);
    expect(list.map((entry) => entry.source)).toEqual(['Grassland', 'Farm', 'Feudalism']);
    expect(list[2]).toEqual({
      source: 'Feudalism',
      kind: 'add',
      food: 1,
      production: 0,
      gold: 0,
    });
  });

  it('needs the improvement: a bare river tile gains nothing', () => {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const tile = map.tiles[4]!;
    tile.freshwater = true;
    expect(tileYieldOf(tile, withTech)).toEqual({ food: 2, production: 0, gold: 0 });
  });

  it('reaches the city that owns the tile, through the owner\'s context', () => {
    const state = bareState();
    for (const player of state.players) player.techsResearched = ['agriculture'];
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const tile = at(state, 5, 4);
    tile.improvement = 'farm';
    tile.freshwater = true;
    city.population = 1;
    city.lockedTiles = [{ col: 5, row: 4 }];
    assignCitizens(state, city);

    const before = cityYields(state, city).food;
    state.players[0]!.techsResearched.push('feudalism');
    // No phase, no rebuild: the same call, one technology later.
    expect(cityYields(state, city).food).toBe(before + 1);
    // And the rival, who has not researched it, sees the old number.
    expect(tileYieldOf(tile, yieldContextFor(state, 1))).toEqual({
      food: 3,
      production: 0,
      gold: 0,
    });
  });
});

// --- citizens and previews --------------------------------------------------

describe('improvements and the city', () => {
  it('sends a citizen to the improved tile', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    city.population = 1;
    // Every tile in the ring is identical grassland, so the assignment falls to
    // the tie-break (lowest tile index) — until one of them is farmed.
    assignCitizens(state, city);
    const plain = city.workedTiles[0]!;

    const better = at(state, 6, 6);
    better.improvement = 'farm';
    assignCitizens(state, city);
    expect(city.workedTiles).toHaveLength(1);
    expect(city.workedTiles[0]).toEqual({ col: 6, row: 6 });
    expect(city.workedTiles[0]).not.toEqual(plain);
  });

  it('quotes the delta a charge would buy, from the same evaluator', () => {
    const state = bareState();
    const tile = at(state, 5, 4);
    expect(improvementYieldDelta(tile, 'farm')).toEqual({ food: 1, production: 0, gold: 0 });

    // The preview is a diff of the real evaluator, so a renewal the player holds
    // is inside it — which a reading of `improvementDef(id).yields` would miss.
    tile.freshwater = true;
    expect(improvementYieldDelta(tile, 'farm', { techs: ['feudalism'] })).toEqual({
      food: 2,
      production: 0,
      gold: 0,
    });
    // And nothing was mutated on the way past.
    expect(tile.improvement).toBeUndefined();
  });

  it('unlocks a gated unit the moment the mine is finished', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const seam = at(state, 5, 4);
    seam.hills = true;
    seam.resource = 'iron';
    const worker = createUnit(state, 0, 'worker', 5, 4);

    const queue: Command = {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'swordsman' }],
    };
    expect(applyCommand(state, queue)).toEqual({
      ok: false,
      error: 'Swordsman needs improved Iron',
    });

    expect(applyCommand(state, build(0, worker.id, 'mine')).ok).toBe(true);
    expect(applyCommand(state, queue)).toEqual({ ok: true });
  });
});

// --- the save file ----------------------------------------------------------

describe('improvements in the log', () => {
  /** A real game with a worker and a raider, driven entirely by commands. */
  function improvingGame(): Game {
    const game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    const { state } = game;
    // Found on the settler each seat starts with, so the log is ordinary.
    for (const player of state.players) {
      const settler = state.units.find(
        (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
      );
      if (settler) {
        dispatch(game, { type: 'foundCity', playerId: player.id, settlerUnitId: settler.id });
      }
    }
    return game;
  }

  /**
   * The first tile this player could improve at all, and what with.
   *
   * Any improvement rather than a farm specifically, because this runs on a
   * *generated* map: a duel-sized opening ring is whatever the seed dealt, and a
   * helper that insisted on flat featureless grassland would be a test that
   * passes or fails on terrain. The map may not be edited either — a save
   * carries a seed, and a hand-patched tile would not survive the replay this
   * whole section exists to assert.
   */
  function improvableTile(
    state: GameState,
    playerId: number,
  ): { tile: Tile; id: ImprovementId } | null {
    for (const tile of state.map.tiles) {
      for (const id of IMPROVEMENT_IDS) {
        if (improvementErrorAt(state, playerId, tile, id) === null) return { tile, id };
      }
    }
    return null;
  }

  it('replays a build and a pillage byte for byte', () => {
    const game = improvingGame();
    const { state } = game;

    const site = improvableTile(state, 0);
    expect(site).not.toBeNull();
    const { tile, id } = site!;
    dispatch(game, {
      type: 'spawnUnit',
      playerId: 0,
      ownerId: 0,
      unitType: 'worker',
      at: { col: tile.col, row: tile.row },
    });
    const worker = state.units[state.units.length - 1]!;
    expect(dispatch(game, build(0, worker.id, id)).ok).toBe(true);

    // A rival rides in and burns it.
    dispatch(game, {
      type: 'spawnUnit',
      playerId: 1,
      ownerId: 1,
      unitType: 'warrior',
      at: { col: tile.col, row: tile.row },
    });
    const raider = state.units[state.units.length - 1]!;
    expect(dispatch(game, { type: 'pillage', playerId: 1, unitId: raider.id }).ok).toBe(true);

    for (let turn = 0; turn < 3; turn++) {
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(game.log.some((command) => command.type === 'buildImprovement')).toBe(true);
    expect(game.log.some((command) => command.type === 'pillage')).toBe(true);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('round-trips a schema 12 save with improvements on the board', () => {
    expect(SCHEMA_VERSION).toBe(12);
    const game = improvingGame();
    const { state } = game;
    const { tile, id } = improvableTile(state, 0)!;
    dispatch(game, {
      type: 'spawnUnit',
      playerId: 0,
      ownerId: 0,
      unitType: 'worker',
      at: { col: tile.col, row: tile.row },
    });
    const worker = state.units[state.units.length - 1]!;
    dispatch(game, build(0, worker.id, id));

    const loaded = loadGame(saveGame(game));
    expect(loaded.state).toEqual(game.state);
    // The two things the bump was for: a charge count and a tile's works.
    expect(unitById(loaded.state, worker.id)?.chargesLeft).toBe(2);
    expect(getTileAt(loaded.state.map, tile.col, tile.row)?.improvement).toBe(id);

    for (let turn = 0; turn < 4; turn++) {
      for (const player of state.players) {
        dispatch(loaded, { type: 'endTurn', playerId: player.id });
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    expect(snapshotState(loaded.state)).toBe(snapshotState(game.state));
  });
});
