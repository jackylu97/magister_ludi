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
} from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import {
  type Game,
  createGame,
  dispatch,
  loadGame,
  replay,
  saveGame,
  snapshotState,
} from '../../src/sim/game';
import {
  CHOPPABLE_FEATURES,
  IMPROVEMENT_DATA,
  IMPROVEMENT_IDS,
  type ImprovementId,
  chopDef,
  chopYield,
  improvementDef,
  improvementForResource,
  improvementYield,
  isGreatPersonWork,
  isImprovementId,
} from '../../src/sim/improvementData';
import {
  chargesLeft,
  chopBaseFor,
  chopCity,
  chopError,
  chopErrorAt,
  chopTechError,
  improvementError,
  improvementErrorAt,
  improvementTechError,
  improvementYieldDelta,
  isBuilder,
  pillageError,
} from '../../src/sim/improvements';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import { RESOURCE_IDS, resourceDef, resourceYield } from '../../src/sim/resourceData';
import { RULES } from '../../src/sim/rulesData';
import { windfallPayout } from '../../src/sim/statecraft';
import {
  type City,
  type GameState,
  type Unit,
  SCHEMA_VERSION,
  createUnit,
  unitById,
} from '../../src/sim/state';
import {
  FEATURE_IDS,
  type FeatureId,
  TERRAIN_IDS,
  TILE_YIELD_KEYS,
  type TerrainId,
  type TileYield,
  defenseBonus,
  emptyTileYield,
  isWaterTerrain,
  moveCost,
  readTileYield,
  tileYield,
} from '../../src/sim/terrainData';
import { TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';
import { at, bareState, woodedWorker } from './improvementHelpers';
import { unitAwaitsOrders } from '../../src/sim/units';

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
  it('names eight worker improvements, six works, and recognises its own ids', () => {
    // Two halves of one table, and the split is `ImprovementDef.greatPerson`:
    // the first eight are what a worker's charge buys, the last six are what a
    // *work's* hand plants (`docs/great-people.md`, and the holy site the
    // prophet leaves — `docs/religion-v2.md`), and no rule anywhere compares an
    // id against a string to tell them apart.
    expect(IMPROVEMENT_IDS).toEqual([
      'farm',
      'mine',
      'pasture',
      'camp',
      'quarry',
      'fishingBoats',
      'plantation',
      'lumbermill',
      'academy',
      'landmark',
      'manufactory',
      'customsHouse',
      'citadel',
      'holySite',
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
    // Three lists can do the constraining and one kind of row is excused. The
    // lumbermill is the third kind (`validFeatures` naming no bare ground —
    // every feature in the table grows on land), and a **great person's work**
    // is the excused one: it constrains nothing on the ground by design, and
    // `improvementErrorAt` refuses it water and impassable ground instead.
    for (const id of IMPROVEMENT_IDS) {
      const def = improvementDef(id);
      if (def.greatPerson !== undefined) {
        expect(def.validTerrain, `${id} stands anywhere`).toBeUndefined();
        expect(def.validFeatures, `${id} stands anywhere`).toBeUndefined();
        continue;
      }
      const byFeature =
        def.validFeatures !== undefined && !def.validFeatures.includes('none');
      const constrained =
        def.validTerrain !== undefined || def.requiresResource !== undefined || byFeature;
      expect(constrained, `${id} constrains nothing`).toBe(true);
    }
  });

  it('sends every water resource to the fishing boats, and nothing on land', () => {
    // The forward table is written per improvement; this is the inversion, and
    // since Entry XXVII it has no holes at all. It used to assert the opposite —
    // "water iff *un*improved", the documented deferral — and the day the boats
    // landed it failed in both directions at once, which is exactly what it was
    // written to do. What it pins now is the other half of the same claim: a
    // resource on water goes to the boats and to nothing else, and no land
    // resource wanders into them.
    for (const id of RESOURCE_IDS) {
      const wet = resourceDef(id).validTerrain.every(isWaterTerrain);
      const wants = improvementForResource(id);
      expect(wants, `${id} is improved by something`).not.toBeNull();
      expect(wants === 'fishingBoats', `${id} wants fishing boats`).toBe(wet);
    }
    expect(improvementForResource('fish')).toBe('fishingBoats');
    expect(improvementForResource('tyrian')).toBe('fishingBoats');
  });

  it('puts the fishing boats on the coast and only on a seam', () => {
    // The one row that uses both filters, and the reason is in the table's
    // docblock: the terrain clause is what keeps it honest if a sea resource is
    // ever seeded on the deep ocean, since a worker can only stand on water it
    // could embark onto.
    const def = improvementDef('fishingBoats');
    expect(def.validTerrain).toEqual(['coast']);
    expect(def.requiresTech).toBe('sailing');
    expect(def.clearsClutter).toBe(false);
    expect(def.requiresResource).toEqual(def.improvesResource);
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
    expect(unitAwaitsOrders(worker)).toBe(true);
    // Building spends the whole allowance, which is what stops it blocking again.
    worker.movesLeft = 0;
    expect(unitAwaitsOrders(worker)).toBe(false);
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
    expect(tileYieldOf(tile)).toEqual({ food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    applyCommand(state, build(0, worker.id, 'farm'));
    expect(tileYieldOf(tile)).toEqual({ food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
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
      // Dry tundra is not refused for being tundra any more — it is refused for
      // being *dry*. See the freshwater block below.
      expect(improvementError(state, worker.id, 'farm')).toBe(
        'A farm on tundra needs fresh water',
      );
      tile.terrain = 'mountain';
      expect(improvementError(state, worker.id, 'farm')).toBe(
        'A farm cannot be built on mountain',
      );
      tile.terrain = 'plains';
      expect(improvementError(state, worker.id, 'farm')).toBeNull();
    });

    /**
     * The farm's freshwater widening (user, 2026-08-26).
     *
     * The rule is a **union**, not a fifth filter: `freshwaterTerrain` adds to
     * `validTerrain` on ground that can drink, so grassland and plains keep
     * working dry and the ground the row would never accept is still refused by
     * terrain rather than by thirst. `requiresHills: false` is asked separately
     * and still holds, which is what makes it "any *flat* watered tile".
     */
    it('farms watered desert, tundra and snow, and only while they are watered', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);

      for (const terrain of ['desert', 'tundra', 'snow'] as const) {
        tile.terrain = terrain;
        tile.freshwater = false;
        expect(improvementError(state, worker.id, 'farm')).toBe(
          `A farm on ${terrain} needs fresh water`,
        );
        tile.freshwater = true;
        expect(improvementError(state, worker.id, 'farm')).toBeNull();
      }

      // The widening never reaches ground the row does not name at all.
      tile.terrain = 'mountain';
      expect(improvementError(state, worker.id, 'farm')).toBe(
        'A farm cannot be built on mountain',
      );

      // The hills filter is relaxed by a *different* seam, and by the same
      // water: `hillsIf: ['freshwater', …]` (user, 2026-08-27). A watered desert
      // hill takes a farm; a dry one is refused by the hills clause, not by the
      // terrain one, and says so.
      tile.terrain = 'desert';
      tile.hills = true;
      tile.freshwater = true;
      expect(improvementError(state, worker.id, 'farm')).toBeNull();
      tile.freshwater = false;
      expect(improvementError(state, worker.id, 'farm')).toBe(
        'A farm on desert needs fresh water',
      );
      tile.terrain = 'grassland';
      expect(improvementError(state, worker.id, 'farm')).toBe('A farm needs flat ground');
    });

    it('stands a lumbermill in forest and jungle, and nowhere else', () => {
      // User, 2026-08-27: "add ability to build lumbermills at construction. +1
      // prod, can only be built on forest and jungle tiles". The *whole* rule is
      // the feature, so the row names `validFeatures` and no terrain — which is
      // the third kind of constraint the table now has.
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      for (const feature of ['forest', 'jungle'] as const) {
        tile.feature = feature;
        expect(improvementError(state, worker.id, 'lumbermill')).toBeNull();
      }
      tile.feature = 'none';
      expect(improvementError(state, worker.id, 'lumbermill')).toBe(
        'A lumbermill cannot be built in none',
      );
      tile.feature = 'floodplain';
      expect(improvementError(state, worker.id, 'lumbermill')).toBe(
        'A lumbermill cannot be built in floodplain',
      );
      // And nothing about the ground under the canopy: a forested hill, a
      // forested tundra and a forested grassland all take one.
      tile.feature = 'forest';
      tile.hills = true;
      tile.terrain = 'tundra';
      expect(improvementError(state, worker.id, 'lumbermill')).toBeNull();
    });

    it('leaves the trees standing, which is what makes it a lumbermill', () => {
      // The one improvement that works the thing already on the tile. Nothing
      // writes `feature = 'none'` for it and it clears no clutter, so the board
      // keeps its pines and the yield is the canopy's plus one hammer.
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.feature = 'forest';
      const before = tileYieldOf(tile);
      expect(improvementDef('lumbermill').clearsClutter).toBe(false);
      expect(applyCommand(state, build(0, worker.id, 'lumbermill')).ok).toBe(true);
      expect(tile.feature).toBe('forest');
      expect(tile.improvement).toBe('lumbermill');
      expect(tileYieldOf(tile).production).toBe(before.production + 1);
    });

    it('waits for Construction, and says so last', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.feature = 'forest';
      state.players[0]!.techsResearched = [];
      const said = 'A lumbermill needs Construction';
      expect(improvementError(state, worker.id, 'lumbermill')).toBe(said);
      // The technology is asked *after* every question about the ground, which
      // is what lets the sheet grey a row rather than hide it.
      expect(improvementTechError(state, 0, 'lumbermill')).toBe(said);
      tile.feature = 'none';
      expect(improvementError(state, worker.id, 'lumbermill')).toBe(
        'A lumbermill cannot be built in none',
      );
    });

    it('takes a bare forest, and still yields the seam to the seam', () => {
      // The seam rule is unchanged and still applies over a canopy: a lumbermill
      // on bare woodland is fine, and one on a deer forest is refused because
      // the deer want a camp.
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.feature = 'forest';
      expect(improvementError(state, worker.id, 'lumbermill')).toBeNull();
      tile.resource = 'deer';
      expect(improvementError(state, worker.id, 'lumbermill')).toBe('Deer wants a camp');
    });

    it('farms a hill that can drink, or one that carries its own seam', () => {
      // User, 2026-08-27: "farms can be built on hills if adjacent to freshwater
      // or there is a farmable resource on the tile. I see a bug where I can't
      // build a farm on a wheat-on-hills tile." Two reasons on the row
      // (`hillsIf`), one clause in the gate, and the old sentence for a dry bare
      // hill.
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.terrain = 'grassland';
      tile.hills = true;
      tile.freshwater = false;

      expect(improvementError(state, worker.id, 'farm')).toBe('A farm needs flat ground');

      tile.freshwater = true;
      expect(improvementError(state, worker.id, 'farm')).toBeNull();

      tile.freshwater = false;
      tile.resource = 'wheat';
      expect(improvementError(state, worker.id, 'farm')).toBeNull();
      // And the seam still belongs to the seam: the wheat wants a farm, so the
      // mine that would otherwise be legal on this hill is refused by name.
      expect(improvementError(state, worker.id, 'mine')).toBe('Wheat wants a farm');

      // A seam that is *not* the farm's own waives nothing.
      tile.resource = 'iron';
      expect(improvementError(state, worker.id, 'farm')).toBe('A farm needs flat ground');
    });

    it('keeps grassland and plains farmable with no water anywhere near', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.freshwater = false;
      for (const terrain of ['grassland', 'plains'] as const) {
        tile.terrain = terrain;
        expect(improvementError(state, worker.id, 'farm')).toBeNull();
      }
    });

    it('farms a floodplain, which is fresh desert by construction', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.terrain = 'desert';
      tile.feature = 'floodplain';
      // `deriveFloodplains` only ever writes one onto ground that already
      // touches a river or an oasis, so this is the state the generator makes.
      tile.freshwater = true;
      expect(improvementError(state, worker.id, 'farm')).toBeNull();
    });

    /**
     * **A seam claims its own hex** (user, 2026-08-26: "should not be allowed to
     * build the incorrect improvement on resource tiles").
     *
     * The rule is one line read off the table's own inverse
     * (`improvementForResource`): a resource that some improvement opens will
     * take that improvement and no other. Asserted over the **whole table**
     * rather than on a handful of rows, because the failure it prevents is a
     * silent one — a farm on a deer forest looks like a farm and the camp's
     * luxury simply never arrives.
     *
     * Honey is the row that made it urgent and it is named below: it is the only
     * luxury whose home is bare flat grassland, which is exactly where a farm
     * goes.
     */
    describe('a resource refuses every improvement but its own', () => {
      /** Puts the tile in a state that satisfies this improvement's ground filters. */
      function shapeFor(tile: Tile, id: ImprovementId): void {
        const def = improvementDef(id);
        tile.terrain = def.validTerrain?.[0] ?? 'grassland';
        tile.feature = def.validFeatures?.[0] ?? 'none';
        tile.hills = def.requiresHills ?? false;
        tile.freshwater = true;
      }

      it('refuses the wrong one by name, for every improvable resource', () => {
        const { state, worker } = workerState();
        const tile = at(state, 5, 4);
        let checked = 0;

        for (const resource of RESOURCE_IDS) {
          const wanted = improvementForResource(resource);
          if (wanted === null) continue;
          for (const other of IMPROVEMENT_IDS) {
          // A great person's work never reaches the seam clause: a worker is
          // refused it one rung earlier, by the symmetric clause in
          // `improvementError` that keeps the two halves of the table apart.
          if (improvementDef(other).greatPerson !== undefined) continue;
            if (other === wanted) continue;
            const def = improvementDef(other);
            // A resource-improvement refuses on its own `requiresResource`
            // filter first, which is a different (and correct) sentence. This
            // clause is about the improvements that *would* otherwise be legal.
            if (def.requiresResource !== undefined) continue;
            shapeFor(tile, other);
            tile.resource = resource;
            tile.improvement = undefined;
            expect(
              improvementError(state, worker.id, other),
              `${other} on ${resource}`,
            ).toBe(`${resourceDef(resource).name} wants a ${improvementDef(wanted).name.toLowerCase()}`);
            checked += 1;
          }
        }
        // The sweep is not vacuous: every land resource in the table has an
        // improver today, and the two generic improvements reach most of them.
        expect(checked).toBeGreaterThan(20);
      });

      it('never refuses the improvement the resource actually wants', () => {
        const { state, worker } = workerState();
        const tile = at(state, 5, 4);
        for (const resource of RESOURCE_IDS) {
          const wanted = improvementForResource(resource);
          if (wanted === null) continue;
          shapeFor(tile, wanted);
          tile.resource = resource;
          tile.improvement = undefined;
          const error = improvementError(state, worker.id, wanted) ?? '';
          expect(error, `${wanted} on ${resource}`).not.toContain('wants a');
        }
      });

      it('names honey, the row that made the rule urgent', () => {
        const { state, worker } = workerState();
        const tile = at(state, 5, 4);
        // Honey's home: bare flat grassland — a farm's home exactly.
        tile.terrain = 'grassland';
        tile.feature = 'none';
        tile.hills = false;
        tile.resource = 'honey';
        expect(improvementError(state, worker.id, 'farm')).toBe('Honey wants a plantation');
        expect(improvementError(state, worker.id, 'plantation')).toBeNull();
      });

      it('leaves ground with no improvable resource on it alone', () => {
        const { state, worker } = workerState();
        const tile = at(state, 5, 4);
        tile.resource = undefined;
        expect(improvementError(state, worker.id, 'farm')).toBeNull();
        // Every land resource the table names has an improver today, so "a
        // bonus resource nobody improves stays free" has no land row to stand
        // on — the four unimproved ones are all at sea. Pinned as a property of
        // the table so the day a land row is added with no improver, the rule
        // above is already known to let it through.
        for (const resource of RESOURCE_IDS) {
          if (improvementForResource(resource) !== null) continue;
          expect(resourceDef(resource).validTerrain?.every(isWaterTerrain) ?? false).toBe(true);
        }
      });

      it('says nothing about a seam the player cannot yet name', () => {
        const { state, worker } = workerState();
        const tile = at(state, 5, 4);
        // Horses want a pasture and are gated behind Husbandry. A refusal that
        // named them would leak the map through an error message — `chopErrorAt`
        // keeps the same silence for the same reason.
        tile.terrain = 'grassland';
        tile.feature = 'none';
        tile.hills = false;
        tile.resource = 'horses';
        expect(improvementError(state, worker.id, 'farm')).toBe('Horses wants a pasture');

        state.players[0]!.techsResearched = TECH_IDS.filter((id) => id !== 'husbandry');
        expect(improvementError(state, worker.id, 'farm')).toBeNull();
      });
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

  /**
   * The technology gate, which is the Age I rework's addition: every improvement
   * carries a `requiresTech` now, so the worker's menu opens over the course of
   * a game instead of arriving whole on turn one.
   */
  describe('the technology gate', () => {
    it('refuses an ungated build by name, and takes it the moment the tech lands', () => {
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      tile.hills = true;
      const gate = improvementDef('mine').requiresTech!;
      state.players[0]!.techsResearched = ['agriculture'];

      expect(improvementError(state, worker.id, 'mine')).toBe(
        `A mine needs ${techDef(gate).name}`,
      );
      // And the reducer refuses with the same sentence, byte-identically —
      // a rejected command changes nothing at all.
      const before = snapshotState(state);
      expect(applyCommand(state, build(0, worker.id, 'mine'))).toEqual({
        ok: false,
        error: `A mine needs ${techDef(gate).name}`,
      });
      expect(snapshotState(state)).toBe(before);

      state.players[0]!.techsResearched.push(gate);
      expect(improvementError(state, worker.id, 'mine')).toBeNull();
      expect(applyCommand(state, build(0, worker.id, 'mine'))).toEqual({ ok: true });
      expect(tile.improvement).toBe('mine');
    });

    it('asks the tree last, so the ground always gets to speak first', () => {
      // The ordering the worker sheet is built on (see `improvementOptions` in
      // `controls.ts`): a hex that could never take a mine says so, whatever the
      // player has researched, and only a hex that *could* is told about Mining.
      const { state, worker } = workerState();
      const tile = at(state, 5, 4);
      state.players[0]!.techsResearched = ['agriculture'];

      expect(tile.hills).toBe(false);
      expect(improvementError(state, worker.id, 'mine')).toBe('A mine needs hills');
      tile.hills = true;
      expect(improvementError(state, worker.id, 'mine')).toBe('A mine needs Mining');
    });

    it('answers the gate on its own, with no hex in the question', () => {
      const state = bareState();
      state.players[0]!.techsResearched = ['agriculture'];
      // Ground-independent, which is what lets the sheet grey a row rather than
      // hide it, and it is the *same sentence* the full gate refuses with.
      expect(improvementTechError(state, 0, 'farm')).toBeNull();
      expect(improvementTechError(state, 0, 'quarry')).toBe('A quarry needs Stonecraft');
      expect(improvementTechError(state, 1, 'quarry')).toBeNull();
    });

    it('gates every improvement in the table on a technology that exists', () => {
      // The rework's other half: the worker's menu is a curve now, not a wall of
      // six buttons on turn one. A row with no gate would be a hole in it.
      for (const id of IMPROVEMENT_IDS) {
        // A great person's work is gated by the *person*, not by the tree: it
        // is planted by a piece a renown bucket had to fill to produce, which is
        // a steeper gate than any technology and one no worker can reach.
        if (improvementDef(id).greatPerson !== undefined) continue;
        const gate = improvementDef(id).requiresTech;
        expect(gate, id).toBeDefined();
        expect(TECH_IDS, id).toContain(gate!);
      }
    });

    it("names the same technology the worker sheet's hover card leads with", () => {
      // The sheet builds its "Requires Mining" headline from
      // `improvementDef(id).requiresTech` by way of `techDef` — the exact field
      // this sentence reads — rather than parsing the name back out of the
      // sentence below. This is the parity that keeps the two honest: whatever
      // `improvementTechError` says, the tech it says is the tech named here.
      const state = bareState();
      // `bareState` hands every player the whole tree so its worker can build
      // anything; empty it back out so every gate in the table is live to ask.
      state.players[0]!.techsResearched = [];
      for (const id of IMPROVEMENT_IDS) {
        if (improvementDef(id).greatPerson !== undefined) continue;
        const gate = improvementDef(id).requiresTech!;
        expect(improvementTechError(state, 0, id)).toContain(techDef(gate).name);
      }
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

// --- clearing features ------------------------------------------------------

/**
 * The worker's other verb: `chopFeature`.
 *
 * Three claims, kept apart because they fail for different reasons:
 *
 *   1. **The table is the feature.** Which features can be cleared, what gates
 *      them and what they pay is `data/improvements.json`'s `chop` block and
 *      nothing else, so the jungle's absence is a *data* hole rather than a
 *      missing branch — asserted as such, so the day a jungle row lands the
 *      whole verb works on it with no code edit.
 *   2. **The gate.** Every refusal, each with its own sentence, and the state
 *      byte-identical after every one of them. Including the protection rule,
 *      which is the one genuinely new decision here.
 *   3. **The effect**, which is four mutations and one of them is a tile field
 *      that had never changed during play before.
 */

describe('the chop table', () => {
  it('clears the forest, on Mining, for a lump of production', () => {
    const forest = chopDef('forest');
    expect(forest).not.toBeNull();
    expect(forest!.tech).toBe('mining');
    expect(TECH_IDS).toContain(forest!.tech);
    expect(forest!.chargeCost).toBeGreaterThan(0);
    expect(chopYield('forest').production).toBe(20);
  });

  it('clears the jungle at Bronzeworking, and nothing at all off bare ground', () => {
    // The hole the table's docblock predicted would cost one JSON object, filled
    // on 2026-08-27 (user: "that should probably be in bronzeworking"). No gate,
    // no sheet and no tech card was edited to let it through.
    expect(chopDef('jungle')?.tech).toBe('bronzeWorking');
    expect(chopDef('forest')?.tech).toBe('mining');
    // `chopDef` answering `null` is the whole of "not choppable", and it is the
    // same `null` a bare hex gets.
    expect(chopDef('none')).toBeNull();
    expect(CHOPPABLE_FEATURES).toEqual(['forest', 'jungle']);
  });

  it('leaves the oasis and the floodplain out, and that one is permanent', () => {
    // The two arid features are not choppable, and unlike the jungle their
    // absence is a *design decision* rather than a hole waiting for a design.
    // There is nothing to fell on either: an oasis is water and a floodplain is
    // ground, so a chop row for one would have to be a rule about draining or
    // levelling the map, which this game does not have and is not going to grow
    // by somebody adding a JSON object. Asserted at the table so a row added by
    // accident fails here rather than turning up on a worker's sheet.
    expect(chopDef('oasis')).toBeNull();
    expect(chopDef('floodplain')).toBeNull();
    // And the whole list, so the assertion cannot be satisfied by two absences
    // while a third feature quietly gains a row.
    expect(CHOPPABLE_FEATURES).toEqual(['forest', 'jungle']);
  });

  it('pays in production only, because nothing else has a one-time bank', () => {
    // `City.hammerBasket` is the only pool a lump can land in. A chop that
    // promised food would be a number the sheet printed and the city never got,
    // so the load validator forbids it — and this is the outside check on that.
    for (const feature of CHOPPABLE_FEATURES) {
      const paid = chopYield(feature);
      expect(paid.production, feature).toBeGreaterThan(0);
      for (const key of TILE_YIELD_KEYS) {
        if (key === 'production') continue;
        expect(paid[key], `${feature}.${key}`).toBe(0);
      }
    }
  });

  it('hands back a fresh yield object, so a caller cannot retune the game', () => {
    const first = chopYield('forest');
    first.production += 99;
    expect(chopYield('forest').production).toBe(20);
  });
});

describe('chopBaseFor — the chop scales with what this empire has learned', () => {
  /** A player with exactly this many technologies researched, nothing else set up. */
  function playerWith(state: GameState, techCount: number): void {
    state.players[0]!.techsResearched = TECH_IDS.slice(0, techCount);
  }

  it('with no technologies beyond the opening kit, pays the raw table figure', () => {
    const state = bareState();
    playerWith(state, 0);
    const base = chopBaseFor(state, 0, 'forest');
    expect(base.production).toBe(chopYield('forest').production);
    expect(base.label).toBe('Forest 20');
  });

  it('at six technologies, +30% floored (the ruling’s own worked example)', () => {
    const state = bareState();
    playerWith(state, 6);
    expect(RULES.improvements.chopPerTech).toBe(0.05);
    const base = chopBaseFor(state, 0, 'forest');
    expect(base.production).toBe(26); // floor(20 × 1.3)
    expect(base.label).toBe('Forest 20 · +30% for 6 technologies');
  });

  it('at twelve technologies, +60% floored', () => {
    const state = bareState();
    playerWith(state, 12);
    const base = chopBaseFor(state, 0, 'forest');
    expect(base.production).toBe(32); // floor(20 × 1.6)
    expect(base.label).toBe('Forest 20 · +60% for 12 technologies');
  });

  it('scales the jungle the same way, off its own table figure', () => {
    const state = bareState();
    playerWith(state, 6);
    const base = chopBaseFor(state, 0, 'jungle');
    expect(base.production).toBe(Math.floor(chopYield('jungle').production * 1.3));
    expect(base.label).toBe(`Jungle ${chopYield('jungle').production} · +30% for 6 technologies`);
  });

  it('an unknown player is priced off the raw table, like an unknown player’s unit cost', () => {
    const state = bareState();
    expect(chopBaseFor(state, 999, 'forest')).toEqual({ production: 20, label: 'Forest 20' });
  });

  it('climbs by exactly chopPerTech a technology, monotonically, and never overtakes the deed', () => {
    // Every extra technology is worth a little more, never less — and it takes
    // twenty of them (1 / chopPerTech) to double the printed figure, against a
    // unit's own age band reaching ×2 the moment its type's tech is Age III
    // (`RULES.production.unitCostAgeMultiplier`). That is the ruling's "grows
    // slightly slower … so that they're optimal to use earlier" made exact: the
    // chop never becomes the *better* buy purely for having waited, because
    // doubling it costs the empire a technology count no early-game unit price
    // needs to reach its own ceiling.
    const state = bareState();
    playerWith(state, 0);
    let previous = chopBaseFor(state, 0, 'forest').production;
    for (let techs = 1; techs <= TECH_IDS.length; techs++) {
      playerWith(state, techs);
      const current = chopBaseFor(state, 0, 'forest').production;
      expect(current, `${techs} technologies`).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
    // Doubling the printed figure takes twenty technologies — well past what
    // any opening researches, which is the ruling's "optimal to use earlier"
    // read as a number: a chop taken on the first few techs is never far
    // behind one taken much later, and never ahead of it either.
    expect(1 / RULES.improvements.chopPerTech).toBe(20);
  });

  it('composes with a windfall rider on top of the scaled base, not the raw one', () => {
    const state = bareState();
    playerWith(state, 12);
    const scaled = chopBaseFor(state, 0, 'forest').production;
    state.players[0]!.statecraft.doctrines.push('woodwrights');
    const payout = windfallPayout(state, 0, 'chop', scaled);
    // The Woodwrights doubles the *scaled* figure — 32 → 64 — never the printed
    // twenty the table alone would have paid.
    expect(payout.amount).toBe(scaled * 2);
    expect(payout.amount).toBe(64);
  });

  it('the preview a player reads equals what the settlement actually banks', () => {
    // `chopBaseFor` is the one composition both the sim's own settlement and
    // the sheet's preview must read — this is that parity, asked without the
    // UI in the loop: call it before the command exactly as a preview would,
    // dispatch the chop, and check the basket agrees to the hammer.
    const { state, worker, city } = woodedWorker();
    playerWith(state, 9);
    const previewed = chopBaseFor(state, 0, 'forest').production;
    expect(applyCommand(state, { type: 'chopFeature', playerId: 0, unitId: worker.id })).toEqual({
      ok: true,
    });
    expect(city.hammerBasket).toBe(previewed);
  });
});

describe('chopFeature', () => {
  function chop(playerId: number, unitId: number): Command {
    return { type: 'chopFeature', playerId, unitId };
  }

  /** Refuses with exactly this sentence, and changes nothing at all. */
  function refuses(state: GameState, command: Command, error: string): void {
    const before = snapshotState(state);
    expect(applyCommand(state, command)).toEqual({ ok: false, error });
    expect(snapshotState(state)).toBe(before);
  }

  describe('the gate', () => {
    it('accepts a worker with charges, movement and a wood to fell', () => {
      const { state, worker } = woodedWorker();
      expect(chopError(state, worker.id)).toBeNull();
      expect(applyCommand(state, chop(0, worker.id))).toEqual({ ok: true });
    });

    it('refuses a unit that is not a builder, before it looks at the ground', () => {
      // `improvementError`'s ordering: a warrior standing in a magnificent
      // forest should be told it is a warrior.
      const { state } = woodedWorker();
      const warrior = createUnit(state, 0, 'warrior', 5, 4);
      refuses(state, chop(0, warrior.id), 'A Warrior cannot clear features');
    });

    it('refuses a unit that is not there, or not alive', () => {
      const { state, worker } = woodedWorker();
      refuses(state, chop(0, 999), 'No unit with id 999');
      worker.hp = 0;
      expect(chopError(state, worker.id)).toBe(`Unit ${worker.id} is not alive`);
    });

    it('refuses a spent worker and a worker that has already marched', () => {
      const { state, worker } = woodedWorker();
      worker.chargesLeft = 0;
      refuses(state, chop(0, worker.id), 'This worker has no charges left');

      worker.chargesLeft = 3;
      worker.movesLeft = 0;
      refuses(state, chop(0, worker.id), `Unit ${worker.id} has no movement left`);
    });

    it('refuses bare ground in its own words, and clears the jungle', () => {
      const { state, worker, tile } = woodedWorker();
      tile.feature = 'none';
      refuses(state, chop(0, worker.id), 'There is nothing to clear on (5, 4)');
      // The jungle became choppable at Bronzeworking on 2026-08-27; `bareState`
      // holds the whole tree, so nothing is refusing this one.
      tile.feature = 'jungle';
      expect(chopError(state, worker.id)).toBeNull();
    });

    it('never offers a chop on an oasis or a floodplain', () => {
      // The other half of the "no row in the chop table" assertion, read through
      // the command rather than through the data: a worker standing in its own
      // territory on either arid feature is refused with the ground's own
      // sentence, never with a technology — which is what greys the sheet's
      // Chop row out entirely instead of promising it after a research.
      const { state, worker, tile } = woodedWorker();
      for (const [feature, said] of [
        ['oasis', 'Oasis cannot be cleared'],
        ['floodplain', 'Floodplain cannot be cleared'],
      ] as const) {
        tile.feature = feature;
        // The worker holds every technology in `bareState`, so nothing but the
        // ground can be doing the refusing here.
        refuses(state, chop(0, worker.id), said);
        expect(chopTechError(state, 0, feature)).toBe(said);
      }
    });

    it('refuses ground that is not yours, and ground that is nobody\'s', () => {
      const { state, worker } = woodedWorker();
      at(state, 0, 0).feature = 'forest';
      worker.col = 0;
      worker.row = 0;
      refuses(state, chop(0, worker.id), '(0, 0) is not in your territory');

      foundCityAt(state, 1, at(state, 9, 5));
      at(state, 9, 4).feature = 'forest';
      worker.col = 9;
      worker.row = 4;
      refuses(state, chop(0, worker.id), '(9, 4) belongs to player 1');
    });

    it('refuses the tile a town stands on', () => {
      // A town keeps whatever feature it was founded in and the board has
      // already suppressed the trees under the houses, so this would be hammers
      // for a picture that does not change.
      const { state, worker, city } = woodedWorker();
      at(state, 5, 5).feature = 'forest';
      worker.col = 5;
      worker.row = 5;
      refuses(state, chop(0, worker.id), `${city.name} stands on (5, 5)`);
    });

    it('names the technology, and asks it LAST so the ground speaks first', () => {
      // The ordering the worker sheet is built on, exactly as
      // `improvementErrorAt`'s: a worker on bare ground is told there is nothing
      // to clear whatever it has researched, and only a worker in a real wood is
      // told about Mining. That is what lets the sheet grey the row with a
      // technology rather than with a fact about the wrong hex.
      const { state, worker, tile } = woodedWorker();
      state.players[0]!.techsResearched = ['agriculture'];

      tile.feature = 'none';
      expect(chopError(state, worker.id)).toBe('There is nothing to clear on (5, 4)');
      tile.feature = 'forest';
      refuses(state, chop(0, worker.id), 'Clearing forest needs Mining');

      state.players[0]!.techsResearched.push('mining');
      expect(chopError(state, worker.id)).toBeNull();
    });

    it('answers the gate on its own, with no hex in the question', () => {
      // `improvementTechError`'s sibling, and the reason it is split out: the
      // sheet greys its Chop row with this and compares it against the full
      // refusal to decide whether the *only* problem is the tree.
      const state = bareState();
      state.players[0]!.techsResearched = ['agriculture'];
      expect(chopTechError(state, 0, 'forest')).toBe('Clearing forest needs Mining');
      expect(chopTechError(state, 1, 'forest')).toBeNull();
      // The jungle is a rung later, and it is a *technology* refusal now rather
      // than the table's "cannot be cleared" — which is what greys the sheet's
      // Chop row with a promise instead of a wall.
      expect(chopTechError(state, 0, 'jungle')).toBe('Clearing jungle needs Bronzeworking');
      expect(chopTechError(state, 1, 'jungle')).toBeNull();
      // A feature nothing can clear is never "one technology away".
      expect(chopTechError(state, 1, 'oasis')).toBe('Oasis cannot be cleared');
    });

    it("names the same technology the worker sheet's Chop hover leads with", () => {
      // `chopTechError`'s parity twin to the improvement table's version above:
      // the sheet's "Requires Mining" headline on a greyed Chop row is read off
      // `chopDef(feature).tech` by way of `techDef`, never parsed from this
      // sentence, and this is what keeps the two from being able to disagree.
      const state = bareState();
      // Same reset as the improvement table's version above — `bareState`
      // starts every player with the whole tree.
      state.players[0]!.techsResearched = [];
      for (const feature of CHOPPABLE_FEATURES) {
        const gate = chopDef(feature)!.tech;
        expect(chopTechError(state, 0, feature)).toContain(techDef(gate).name);
      }
    });

    it('is turn-gated, and refuses somebody else\'s worker', () => {
      const { state, worker } = woodedWorker();
      state.turnEnded[0] = true;
      refuses(
        state,
        chop(0, worker.id),
        `Player 0 has ended turn ${state.turn} and cannot clear features`,
      );
      state.turnEnded[0] = false;
      refuses(state, chop(1, worker.id), `Unit ${worker.id} does not belong to player 1`);
    });

    it('refuses a player who does not exist', () => {
      const { state, worker } = woodedWorker();
      refuses(state, chop(7, worker.id), 'No player with id 7');
    });
  });

  describe('the protection rule', () => {
    /**
     * Decided 2026-08-23: a chop is refused while the tile carries a resource
     * whose placement *required* the feature, that resource is revealed to this
     * player, and the tile is unimproved. The camp is worth more than the
     * timber, and the game says so instead of letting a player quietly delete
     * their own deer.
     */
    it('refuses to strip a revealed, unimproved resource of its ground', () => {
      const { state, worker, tile } = woodedWorker();
      tile.resource = 'deer';
      refuses(
        state,
        chop(0, worker.id),
        'The deer here needs the forest — build a camp before you clear it',
      );
    });

    it('lets the timber go once the camp is standing, and keeps the deer', () => {
      // The other half of "the camp is worth more than the timber": once the
      // camp is built the deer are *secured* — `openedResource` asks for the
      // improvement and never for the feature — so the wood is a legitimate
      // second harvest rather than a loss.
      const { state, worker, tile } = woodedWorker();
      tile.resource = 'deer';
      tile.improvement = 'camp';
      expect(hasResource(state, 0, 'deer')).toBe(true);

      expect(applyCommand(state, chop(0, worker.id))).toEqual({ ok: true });
      expect(tile.feature).toBe('none');
      expect(tile.improvement).toBe('camp');
      expect(hasResource(state, 0, 'deer')).toBe(true);
    });

    it('says nothing about a seam nobody has a word for yet', () => {
      // The refusal names the resource, so a protected *unrevealed* one would
      // leak the map through an error message. An empire that does not know the
      // deer are there fells the wood and simply loses them, which is the honest
      // reading of "you did not know". No feature-bound resource carries a
      // reveal tech today, so one is lent one for the length of this test.
      const { state, worker, tile } = woodedWorker();
      tile.resource = 'deer';
      const authored = resourceDef('deer').requiresTech;
      try {
        (resourceDef('deer') as { requiresTech?: TechId }).requiresTech = 'divination';
        state.players[0]!.techsResearched = ['agriculture', 'mining'];
        expect(chopError(state, worker.id)).toBeNull();
        expect(applyCommand(state, chop(0, worker.id))).toEqual({ ok: true });
        expect(tile.feature).toBe('none');
        expect(tile.resource).toBe('deer');
      } finally {
        if (authored === undefined) {
          delete (resourceDef('deer') as { requiresTech?: TechId }).requiresTech;
        } else {
          (resourceDef('deer') as { requiresTech?: TechId }).requiresTech = authored;
        }
      }
    });
  });

  describe('the effect', () => {
    it('takes the feature off the tile and banks the timber in the city', () => {
      const { state, worker, tile, city } = woodedWorker();
      expect(city.hammerBasket).toBe(0);
      // `bareState` hands every player the whole tree, so the bank the chop
      // settles into is the tech-scaled base (`chopBaseFor`), not the raw
      // `chopYield` — the same distinction the "the worker holds every
      // technology" comment makes a few tests down.
      const base = chopBaseFor(state, 0, 'forest').production;
      expect(applyCommand(state, chop(0, worker.id))).toEqual({ ok: true });
      expect(tile.feature).toBe('none');
      expect(city.hammerBasket).toBe(base);
      expect(unitById(state, worker.id)?.chargesLeft).toBe(2);
      // Felling a wood is the turn's work, exactly as laying a farm is.
      expect(unitById(state, worker.id)?.movesLeft).toBe(0);
    });

    it('pays the city that owns the ground, not the nearest or the first', () => {
      const state = bareState();
      const capital = foundCityAt(state, 0, at(state, 2, 2));
      const second = foundCityAt(state, 0, at(state, 8, 6));
      at(state, 8, 5).feature = 'forest';
      const worker = createUnit(state, 0, 'worker', 8, 5);

      expect(applyCommand(state, chop(0, worker.id))).toEqual({ ok: true });
      expect(second.hammerBasket).toBe(chopBaseFor(state, 0, 'forest').production);
      expect(capital.hammerBasket).toBe(0);
    });

    it('consumes the worker on its last charge, like every other spend', () => {
      const { state, worker } = woodedWorker();
      worker.chargesLeft = 1;
      expect(applyCommand(state, chop(0, worker.id))).toEqual({ ok: true });
      expect(unitById(state, worker.id)).toBeUndefined();
      expect(state.units).toHaveLength(0);
    });

    it('lets the yield, the movement cost and the defence follow by themselves', () => {
      // The point of mutating `Tile.feature` rather than storing a "was cleared"
      // flag: every evaluator that reads the feature is already correct, and
      // none of them knows the chop exists.
      const { state, worker, tile } = woodedWorker();
      expect(tileYieldOf(tile)).toEqual(tileYield('grassland', 'forest', false));
      expect(moveCost('grassland', tile.feature, false)).toBe(2);
      expect(defenseBonus('grassland', tile.feature, false)).toBeGreaterThan(0);

      expect(applyCommand(state, chop(0, worker.id))).toEqual({ ok: true });
      expect(tileYieldOf(tile)).toEqual(tileYield('grassland', 'none', false));
      expect(moveCost('grassland', tile.feature, false)).toBe(1);
      expect(defenseBonus('grassland', tile.feature, false)).toBe(0);
      // And the breakdown says so too: no line about a wood that is not there.
      const sources = explainTileYield(tile).map((entry) => entry.source);
      expect(sources.some((source) => source.toLowerCase().includes('forest'))).toBe(false);
    });

    it('spends charges across three woods and then the worker is gone', () => {
      const state = bareState();
      foundCityAt(state, 0, at(state, 5, 5));
      const cells: [number, number][] = [
        [5, 4],
        [4, 5],
        [6, 5],
      ];
      for (const [col, row] of cells) at(state, col, row).feature = 'forest';
      const worker = createUnit(state, 0, 'worker', 5, 4);

      for (const [col, row] of cells) {
        worker.col = col;
        worker.row = row;
        worker.movesLeft = 2;
        expect(applyCommand(state, chop(0, worker.id)).ok).toBe(true);
      }
      expect(state.units).toHaveLength(0);
      for (const [col, row] of cells) expect(at(state, col, row).feature).toBe('none');
    });
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
    const raid = applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id });
    expect(raid.ok).toBe(true);
    expect(at(state, 2, 1).improvement).toBeUndefined();
    expect(state.players[0]!.gold).toBe(RULES.improvements.pillageGold);
    // One point, not the whole allowance: a column burns a farm riding past.
    expect(raider.movesLeft).toBe(1);
    // The command carries its own figures out (`PillageReport`), because a rider
    // is part of the printed number and the rules constant is only the base.
    expect(raid.ok && raid.pillages).toEqual([
      {
        ownerId: 0,
        fromOwnerId: 1,
        col: 2,
        row: 1,
        improvement: 'farm',
        road: false,
        gold: RULES.improvements.pillageGold,
        heal: 0,
        warning: null,
      },
    ]);
  });

  it('heals the raider by the printed figure, capped at its maximum', () => {
    // The user's 2026-08-28 ruling: a raid pays gold **and** health, to
    // everybody, with no card involved. The heal is `improvements.pillageHeal`
    // handed to `windfallPayout` as a base, so a rider adds to it rather than
    // being the only way to get one.
    const { state, raider } = raidState();
    const max = unitDef(raider.type).maxHp;
    raider.hp = max - RULES.improvements.pillageHeal - 5;
    raider.movesLeft = 2;
    const raid = applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id });
    expect(raider.hp).toBe(max - 5);
    expect(raid.ok && raid.pillages?.[0]?.heal).toBe(RULES.improvements.pillageHeal);
  });

  it('reports what the bar actually moved by, never what was offered', () => {
    // A raider at full strength takes the farm and no bandage: the report says
    // zero rather than promising twenty-five points nothing received.
    const { state, raider } = raidState();
    at(state, 2, 1).road = 1;
    raider.movesLeft = 2;
    const before = raider.hp;
    const raid = applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id });
    expect(raider.hp).toBe(before);
    // The road went with the farm, and the report says both.
    expect(at(state, 2, 1).road).toBeUndefined();
    expect(raid.ok && raid.pillages?.[0]).toMatchObject({ heal: 0, road: true, fromOwnerId: 1 });
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
  function legacyYield(tile: Tile): TileYield {
    const base = tileYield(tile.terrain, tile.feature, tile.hills);
    if (tile.resource === undefined) return base;
    const extra = resourceYield(tile.resource);
    const total = emptyTileYield();
    // Every voice, so the golden test still covers the whole algebra now that a
    // tile can pay six of them: a resource that quietly stopped paying its
    // culture would otherwise slip through the one test built to catch exactly
    // that. Extended, never weakened.
    for (const key of TILE_YIELD_KEYS) total[key] = base[key] + extra[key];
    return total;
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
      ['Hills', 'override'],
      ['Forest', 'override'],
      ['Deer', 'add'],
    ]);
    // **The canopy is written last and therefore wins** (user, 2026-08-27: "if
    // jungle or forest is on a hills tile, the jungle/forest yield should take
    // precedence"). The hill is still written down — that is the *explanation* of
    // what the forest replaced — and the fold reaches the forest's 1🌾/1⚙ plus
    // the deer, where it used to reach the hill's 0/2.
    expect(foldTileYield(list)).toEqual({ food: 2, production: 1, gold: 0, science: 0, culture: 0, faith: 0 });
  });

  it('adds the improvement last, after the resource', () => {
    const tile = bareTile({ resource: 'wheat', improvement: 'farm' });
    const list = explainTileYield(tile);
    expect(list.map((entry) => entry.source)).toEqual(['Grassland', 'Wheat', 'Farm']);
    expect(list[2]).toEqual({ source: 'Farm', kind: 'add', food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(foldTileYield(list)).toEqual({ food: 4, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
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
      const def = improvementDef(id);
      const tile = bareTile({ improvement: id });
      const entry = explainTileYield(tile).find((row) => row.source === def.name);
      expect(entry, id).toBeDefined();
      expect(entry!.kind).toBe('add');
      // Six voices, not three: an academy pays science and a landmark culture,
      // and the three-voice reading was written when the ground only ever paid
      // food, hammers and coin.
      //
      // **Every row pays something now**, the citadel included: it was the one
      // exception — worth +8 to whoever defends the hex
      // (`ImprovementDef.defense`, folded into `planCombat`'s breakdown) and a
      // ring of ground, neither of which is a tile yield — and it grew 2⚙ on
      // 2026-08-28 (user: "citadel improvements should give +2 production").
      // A fort that pays nothing is a fort a player never plants outside a war,
      // and the general who plants one has spent a great person on the hex.
      const paid =
        entry!.food + entry!.production + entry!.gold +
        entry!.science + entry!.culture + entry!.faith;
      expect(paid, id).toBeGreaterThan(0);
      if (id === 'citadel') expect(entry!.production).toBe(2);
      expect(def.name.length, id).toBeGreaterThan(0);
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
    expect(tileYieldOf(tile)).toEqual({ food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    expect(tileYieldOf(tile, { techs: [] })).toEqual({ food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
  });

  it('pays with the technology, but only on fresh water', () => {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const dry = map.tiles[4]!;
    dry.improvement = 'farm';
    expect(tileYieldOf(dry, withTech)).toEqual({ food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });

    const wet = map.tiles[5]!;
    wet.improvement = 'farm';
    wet.freshwater = true;
    expect(tileYieldOf(wet, withTech)).toEqual({ food: 4, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
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
      ...readTileYield({ food: 1, production: 0, gold: 0 }),
    });
  });

  it('needs the improvement: a bare river tile gains nothing', () => {
    const map = createMap({ width: 3, height: 3, terrain: 'grassland' });
    const tile = map.tiles[4]!;
    tile.freshwater = true;
    expect(tileYieldOf(tile, withTech)).toEqual({ food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
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
    expect(tileYieldOf(tile, yieldContextFor(state, 1))).toEqual(
      readTileYield({ food: 3, production: 0, gold: 0 }),
    );
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
    expect(improvementYieldDelta(tile, 'farm')).toEqual({ food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });

    // The preview is a diff of the real evaluator, so a renewal the player holds
    // is inside it — which a reading of `improvementDef(id).yields` would miss.
    tile.freshwater = true;
    expect(improvementYieldDelta(tile, 'farm', { techs: ['feudalism'] })).toEqual({
      food: 2,
      production: 0,
      gold: 0,
      science: 0,
      culture: 0,
      faith: 0,
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
  /**
   * A real game with a worker and a raider, driven entirely by commands.
   *
   * It also *researches* Fletching, by ordinary `chooseResearch` and end-turn
   * commands, and that is the Age I rework's doing: every improvement is behind
   * a technology now, and this seat starts with Agriculture alone. Granting the
   * tech by reaching into the state would be the one thing these three tests
   * exist to forbid — the log has to be the whole story — so the empire earns
   * it the way a player would. The wait is bounded and short; the assertion is
   * that it happened at all.
   *
   * Fletching specifically, because of what this seed deals: the capital's ring
   * on seed 4242 is forest and jungle hills all the way round, and the one hex
   * in it that any improvement can touch is a deer tile — which wants a camp.
   * That was the site this test always used; it simply used to be free.
   */
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
      dispatch(game, { type: 'chooseResearch', playerId: player.id, techId: 'fletching' });
    }
    for (let turn = 0; turn < 40; turn++) {
      if (state.players.every((player) => player.techsResearched.includes('fletching'))) break;
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    for (const player of state.players) {
      expect(player.techsResearched, player.name).toContain('fletching');
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
   *
   * **A worker's improvement, though.** `improvementErrorAt` is the *ground's*
   * half of the question and says nothing about who is standing there — the
   * "a worker may not plant a work" clause lives in `improvementError`, one
   * scale up — so a great person's work is legal on ground no worker could
   * touch, and the caller below spawns a worker. Filtered here rather than
   * asserted around, because the section is about a build and a pillage
   * replaying, not about who may plant what.
   */
  function improvableTile(
    state: GameState,
    playerId: number,
  ): { tile: Tile; id: ImprovementId } | null {
    for (const tile of state.map.tiles) {
      for (const id of IMPROVEMENT_IDS) {
        if (isGreatPersonWork(id)) continue;
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

  /**
   * A real generated game in which player 0 owns a wood it may legally fell.
   *
   * Seeds are tried in order until one deals a fellable wood inside the opening
   * borders, because the map may *not* be edited here: a save carries a seed and
   * a hand-patched tile would not survive the replay this section exists to
   * assert. Which seed wins is deterministic, so this is a fixture and not a
   * search.
   */
  function choppingGame(): { game: Game; tile: Tile } {
    for (const seed of [4242, 7, 19, 55, 101, 808, 1234, 90210]) {
      const game = createGame({
        seed,
        sizeName: 'duel',
        players: [
          { name: 'A', color: '#a00', isHuman: true },
          { name: 'B', color: '#00a', isHuman: true },
        ],
      });
      const { state } = game;
      for (const player of state.players) {
        const settler = state.units.find(
          (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
        );
        if (settler) {
          dispatch(game, { type: 'foundCity', playerId: player.id, settlerUnitId: settler.id });
        }
        dispatch(game, { type: 'chooseResearch', playerId: player.id, techId: 'mining' });
      }
      for (let turn = 0; turn < 40; turn++) {
        if (state.players.every((player) => player.techsResearched.includes('mining'))) break;
        for (const player of state.players) {
          dispatch(game, { type: 'endTurn', playerId: player.id });
        }
      }
      if (!state.players[0]!.techsResearched.includes('mining')) continue;
      const tile = state.map.tiles.find((candidate) => chopErrorAt(state, 0, candidate) === null);
      if (tile) return { game, tile };
    }
    throw new Error('no seed dealt player 0 a wood it could fell');
  }

  it('replays a chop byte for byte, feature and hammers and all', () => {
    // `Tile.feature` is the *second* field on a tile that changes during play,
    // and this is the assertion that keeps the map reproducible anyway: the
    // board is still a pure function of the seed plus the log, because every
    // clearing is a logged command.
    const { game, tile } = choppingGame();
    const { state } = game;
    dispatch(game, {
      type: 'spawnUnit',
      playerId: 0,
      ownerId: 0,
      unitType: 'worker',
      at: { col: tile.col, row: tile.row },
    });
    const worker = state.units[state.units.length - 1]!;
    const before = tile.feature;
    expect(dispatch(game, { type: 'chopFeature', playerId: 0, unitId: worker.id }).ok).toBe(true);
    expect(tile.feature).toBe('none');

    for (let turn = 0; turn < 3; turn++) {
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(game.log.some((command) => command.type === 'chopFeature')).toBe(true);

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    // Spelled out as well as folded into the snapshot, because a replay that
    // regenerated the map would put the wood back and nothing else would notice.
    expect(getTileAt(replayed.map, tile.col, tile.row)?.feature).toBe('none');
    expect(before).not.toBe('none');
  });

  it('carries a chop through a save file, which regenerates the map', () => {
    // The save is `{config, log}`: the map comes back out of the seed *with the
    // wood on it* and the logged chop takes it off again. If a chop were ever
    // applied outside the command path this is the test that would fail.
    const { game, tile } = choppingGame();
    const { state } = game;
    dispatch(game, {
      type: 'spawnUnit',
      playerId: 0,
      ownerId: 0,
      unitType: 'worker',
      at: { col: tile.col, row: tile.row },
    });
    const worker = state.units[state.units.length - 1]!;
    dispatch(game, { type: 'chopFeature', playerId: 0, unitId: worker.id });

    const loaded = loadGame(saveGame(game));
    expect(getTileAt(loaded.state.map, tile.col, tile.row)?.feature).toBe('none');
    expect(unitById(loaded.state, worker.id)?.chargesLeft).toBe(2);
    expect(snapshotState(loaded.state)).toBe(snapshotState(game.state));
  });

  it('replays a chop that SETTLED a build, unit and overflow and all', () => {
    // Entry XVIII's determinism case: a windfall completion happens inside a
    // command, mid-turn, and so is only reproducible if it is a pure function of
    // the state the log rebuilt. A settlement that read anything else — a clock,
    // a rebuilt map, a Map iteration order — would surface right here.
    const { game, tile } = choppingGame();
    const { state } = game;
    const city = chopCity(state, tile)!;
    expect(city.ownerId).toBe(0);
    // A warrior, because every *building* in the table is behind a technology
    // this opening has not reached — and the arithmetic of what a lump pays for
    // is pinned in `cities.test.ts` anyway. What this test needs is a settlement
    // *in the log*, which any completed item gives it.
    dispatch(game, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'warrior' }],
    });
    expect(city.queue).toHaveLength(1);

    dispatch(game, {
      type: 'spawnUnit',
      playerId: 0,
      ownerId: 0,
      unitType: 'worker',
      at: { col: tile.col, row: tile.row },
    });
    const worker = state.units[state.units.length - 1]!;
    const warriorsBefore = state.units.filter((unit) => unit.type === 'warrior').length;
    expect(dispatch(game, { type: 'chopFeature', playerId: 0, unitId: worker.id }).ok).toBe(true);
    // The whole claim in one line: no turn was ended between the order and the
    // axe, and the warrior is on the board.
    expect(state.units.filter((unit) => unit.type === 'warrior')).toHaveLength(
      warriorsBefore + 1,
    );
    expect(city.queue).toEqual([]);

    for (let turn = 0; turn < 3; turn++) {
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    expect(snapshotState(loadGame(saveGame(game)).state)).toBe(snapshotState(game.state));
  });

  it('round-trips a schema 31 save with improvements on the board', () => {
    expect(SCHEMA_VERSION).toBe(31);
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

// --- the mid-turn refresh ---------------------------------------------------

/**
 * The improvement verbs joining the mid-turn register (`refreshCityDerived` in
 * `cities.ts`, and the trap in CLAUDE.md).
 *
 * The claim is narrow and it is the one players actually feel: the moment a
 * worker finishes a farm, the city panel and the top bar are already telling the
 * truth about it. Before this, the tile's yield changed instantly and the
 * *derived* state a panel reads — which citizen sits where — waited for the end
 * of the turn, so the food arrived one End Turn after the farm did.
 */
describe('the works pay instantly', () => {
  /** A one-citizen city with its seats deliberately left stale. */
  function stale(city: City): void {
    city.population = 1;
    city.workedTiles = [];
  }

  it('seats a citizen on the farm the turn it is built', () => {
    const { state, worker } = workerState(5, 4);
    const city = state.cities[0]!;
    city.population = 1;
    assignCitizens(state, city);
    const before = cityYields(state, city).food;

    expect(applyCommand(state, build(0, worker.id, 'farm'))).toEqual({ ok: true });
    // Not merely refreshed — refreshed to the *right* answer: a farmed
    // grassland tile outscores every bare one around it, so the citizen is
    // standing on the new works before the player has ended anything, and the
    // food the panel prints has already moved.
    expect(city.workedTiles).toEqual([{ col: 5, row: 4 }]);
    expect(cityYields(state, city).food).toBeGreaterThan(before);
  });

  it('is idempotent, so the end-of-turn phase agrees with it', () => {
    const { state, worker } = workerState(5, 4);
    const city = state.cities[0]!;
    stale(city);
    expect(applyCommand(state, build(0, worker.id, 'farm'))).toEqual({ ok: true });
    const seated = JSON.stringify(city.workedTiles);
    assignCitizens(state, city);
    expect(JSON.stringify(city.workedTiles)).toBe(seated);
  });

  it('refreshes the victim of a pillage, not the raider', () => {
    // The refresh is owed to whoever owns the ground: the farm that stopped
    // paying is in *their* panel. Asked of the tile, so it needs no rule of its
    // own — see `refreshTileDerived`.
    const state = bareState();
    const victim = foundCityAt(state, 1, at(state, 2, 2));
    at(state, 2, 1).improvement = 'farm';
    const raider = createUnit(state, 0, 'warrior', 2, 1);
    raider.movesLeft = 2;
    victim.population = 1;
    victim.workedTiles = [{ col: 2, row: 1 }];

    expect(applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id }).ok).toBe(true);
    // The burnt tile is no better than its neighbours now, so the citizen is
    // re-seated by the tie-break rather than left standing on a promise.
    expect(victim.workedTiles).toHaveLength(1);
    const seated = JSON.stringify(victim.workedTiles);
    assignCitizens(state, victim);
    expect(JSON.stringify(victim.workedTiles)).toBe(seated);
  });

  it('costs a pillage on unclaimed ground nothing at all', () => {
    // Nobody owns the tile, so nobody is owed a refresh. It must not throw.
    const state = bareState();
    at(state, 8, 8).improvement = 'farm';
    const raider = createUnit(state, 0, 'warrior', 8, 8);
    raider.movesLeft = 2;
    expect(applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id }).ok).toBe(true);
    expect(at(state, 8, 8).improvement).toBeUndefined();
  });
});
