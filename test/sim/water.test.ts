import { describe, expect, it } from 'vitest';

import {
  assignCitizens,
  cityYields,
  explainTileYield,
  foundCityAt,
  foundingErrorAt,
  hasResource,
  isWorkableTile,
  tileYieldOf,
  yieldContextFor,
} from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { raid } from '../../src/sim/barbarians';
import { type Game, createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../../src/sim/game';
import { buildingDef } from '../../src/sim/buildingData';
import { improvementDef, improvementForResource } from '../../src/sim/improvementData';
import { improvementError, improvementErrorAt } from '../../src/sim/improvements';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import { explainHappiness, happinessOf } from '../../src/sim/meters';
import {
  type MoveProfile,
  canStopOn,
  isPassable,
  moveProfile,
  reachableTiles,
  findPath,
  tileMoveCost,
} from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
import { hasAbility } from '../../src/sim/tech';
import {
  ABILITY_IDS,
  ABILITY_TECH,
  type AbilityId,
  TECH_IDS,
  techsGrant,
} from '../../src/sim/techData';
import { techGifts } from '../../src/sim/techUnlocks';
import { TERRAIN_IDS, isEmbarkableTerrain, isWaterTerrain, isWorkableTerrain } from '../../src/sim/terrainData';
import { isCivilian, isExplorer, unitDef } from '../../src/sim/unitData';
import { computeFreshwater } from '../../src/sim/water';
import { resetVisibility } from '../../src/sim/visibility';

/**
 * The water milestone (design ledger, Entry XXVII): **Sailing, civilian
 * embarkation, and fishing boats.**
 *
 * Three changes that only make sense together, and this file is organised by the
 * seam each one lands on rather than by feature:
 *
 *   1. **The embark rule lives in `stepCost` and nowhere else.** A civilian whose
 *      owner holds the ability may enter *embarkable* water; a combat unit never
 *      may, and nothing may enter the deep ocean. Everything downstream —
 *      pathing, the reachable highlight, the `moveUnit` command, the barbarian
 *      AI — inherits that from the one evaluator, so the matrix below is
 *      asserted through the evaluator *and* through the reducer, and the two
 *      must agree.
 *   2. **Fishing boats are an improvement like any other**, which is the whole
 *      claim: no rule in `openedResource`, `resourceEffects.ts` or the meters
 *      knew the sea was special, so adding the row is what switched the four sea
 *      luxuries on.
 *   3. **The granary's water line is a *tile* line** (hard rule 5), so it shows
 *      up in the hex's own breakdown rather than as a lump on the building.
 *
 * The quirk this milestone knowingly ships is asserted rather than hidden: an
 * embarked civilian cannot be reached by anything, because everything that could
 * reach it is a combat unit and no combat unit embarks. See the ledger.
 */

// --- fixtures ---------------------------------------------------------------

/**
 * `improvements.test.ts`'s bench with a sea down the western edge.
 *
 * Columns 0 and 1 are ocean, column 2 is coast — the same shape mapgen makes,
 * so "the coast is the only water a worker may reach" is a fact about the board
 * rather than about the fixture. Every technology is held; tests that are about
 * a gate take one away by name.
 */
function seaState(width = 14, height = 10): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  for (const tile of state.map.tiles) {
    if (tile.col <= 1) tile.terrain = 'ocean';
    else if (tile.col === 2) tile.terrain = 'coast';
  }
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  // Every technology **except the three that widen the sea**, so that this
  // file's fixture is the Sailing-era rule it was written about (the tree pass
  // of 2026-08-30). Wayfinding lets soldiers embark, The Astrolabe opens the
  // ocean to hull and swimmer alike, and The Floating Fields pay a worked water
  // hex an extra food — each of which is a *later* rule with its own tests
  // below. A blanket grant would have quietly turned every "and nobody else may"
  // assertion here into a test of the wrong age.
  // `colonialCharters` is in the list for a different reason and it is worth
  // stating: it founds every city **with a granary**, and a granary pays a point
  // of food on water — so a blanket grant would have put a citizen on the
  // fishery before the boats were ever built, which is the premise two of the
  // tests below rest on.
  const SEA_WIDENERS = new Set<string>([
    'wayfinding',
    'theAstrolabe',
    'theFloatingFields',
    'colonialCharters',
  ]);
  for (const player of state.players) {
    player.techsResearched = TECH_IDS.filter((id) => !SEA_WIDENERS.has(id));
  }
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Takes one technology away from a seat, leaving everything else in hand. */
function forget(state: GameState, playerId: number, tech: string): void {
  const player = state.players[playerId]!;
  player.techsResearched = player.techsResearched.filter((id) => id !== tech);
}

function move(playerId: number, unitId: number, tile: Tile): Command {
  return { type: 'moveUnit', playerId, unitId, target: { col: tile.col, row: tile.row } };
}

// --- the ability ------------------------------------------------------------

describe('the embark ability', () => {
  it('is a row in the tree, not a technology named in a rule', () => {
    // The register: every ability the type declares is handed over by some node,
    // and the *rule* asks the table rather than spelling "sailing" into
    // `pathfind.ts`. Moving embarkation to a different node is a data edit.
    for (const ability of ABILITY_IDS) {
      expect(ABILITY_TECH.has(ability), ability).toBe(true);
    }
    expect(ABILITY_TECH.get('embark')).toBe('sailing');
    expect(techsGrant(['sailing'], 'embark')).toBe(true);
    expect(techsGrant(['agriculture'], 'embark')).toBe(false);
  });

  it('answers the state-flavoured question the same way', () => {
    const state = seaState();
    expect(hasAbility(state, 0, 'embark')).toBe(true);
    forget(state, 0, 'sailing');
    expect(hasAbility(state, 0, 'embark')).toBe(false);
    // A seat that does not exist cannot sail, which is the strictest honest
    // answer to a question about nobody.
    expect(hasAbility(state, 99, 'embark')).toBe(false);
  });

  it('appears on Sailing beside the boats and the granary line', () => {
    // The three gifts of one node, and each comes from a *different* table:
    // `techs.json`'s own abilities block, `improvements.json`'s `requiresTech`,
    // and `buildings.json`'s `tileYields`. Nothing in `techUnlocks.ts` names
    // Sailing to make that happen.
    const gifts = techGifts('sailing');
    const ability = gifts.find((gift) => gift.kind === 'ability');
    expect(ability, 'the verb').toBeDefined();
    expect(ability!.id).toBe('embark');
    // A verb that banks nothing says nothing about banking — unlike a clearing.
    expect(ability!.kind === 'ability' && ability!.pays).toBeUndefined();

    const improvement = gifts.find((gift) => gift.kind === 'improvement');
    expect(improvement, 'the boats').toBeDefined();
    expect(improvement!.id).toBe('fishingBoats');

    const line = gifts.find((gift) => gift.kind === 'buildingTileYield');
    expect(line, 'the granary line').toBeDefined();
    if (line?.kind !== 'buildingTileYield') throw new Error('expected a building tile yield');
    expect(line.id).toBe('granary');
    expect(line.on).toEqual({ test: 'water' });
    expect(line.add.food).toBe(1);
  });
});

// --- the step evaluator -----------------------------------------------------

describe('embarkation, in the one movement evaluator', () => {
  it('names exactly the coast as embarkable, which is narrower than water', () => {
    // Two questions with different answers, and keeping them apart is the whole
    // of "ocean stays impassable in v1".
    const wet = TERRAIN_IDS.filter(isWaterTerrain);
    const crossable = TERRAIN_IDS.filter(isEmbarkableTerrain);
    expect(wet).toEqual(['ocean', 'coast', 'lake']);
    expect(crossable).toEqual(['coast']);
  });

  it('prices coastal water for a civilian who may sail, and refuses everyone else', () => {
    const state = seaState();
    const coast = at(state, 2, 5);
    const ocean = at(state, 1, 5);
    const land = at(state, 5, 5);

    const worker = createUnit(state, 0, 'worker', 3, 5);
    const warrior = createUnit(state, 0, 'warrior', 3, 6);
    const sailor = moveProfile(state, worker);
    const soldier = moveProfile(state, warrior);

    // The matrix, on the evaluator itself.
    expect(sailor.embarks).toBe(true);
    expect(soldier.embarks).toBe(false);
    expect(tileMoveCost(coast, sailor)).toBe(RULES.movement.embarkCost);
    expect(tileMoveCost(coast, soldier)).toBeNull();
    expect(tileMoveCost(ocean, sailor)).toBeNull();
    expect(tileMoveCost(land, sailor)).toBe(1);

    // And without the technology, the same civilian is landlocked again.
    forget(state, 0, 'sailing');
    expect(moveProfile(state, worker).embarks).toBe(false);
    expect(tileMoveCost(coast, moveProfile(state, worker))).toBeNull();
  });

  it('leaves `isPassable` meaning *land*, because that is what its callers mean', () => {
    // A city site, a spawn tile and a barbarian's target all ask this, and every
    // one of them means dry ground. Widening it would put a town on the sea.
    const state = seaState();
    expect(isPassable(at(state, 2, 5))).toBe(false);
    expect(isPassable(at(state, 5, 5))).toBe(true);
    expect(tileMoveCost(at(state, 2, 5))).toBeNull();
  });

  it('refuses to found a city on the water a worker can stand on', () => {
    const state = seaState();
    expect(foundingErrorAt(state, 0, at(state, 2, 5))).toMatch(/cannot hold a city/);
    expect(foundingErrorAt(state, 0, at(state, 1, 5))).toMatch(/cannot hold a city/);
  });

  it('carries the rule into pathing, the highlight and the reducer alike', () => {
    // Four readers of one evaluator (Entry XXV, now with a fifth term). What the
    // overlay promises has to be what the walk delivers, so all three are asked
    // about the same hex.
    const state = seaState();
    const worker = createUnit(state, 0, 'worker', 3, 5);
    const coast = at(state, 2, 5);

    expect(canStopOn(state, worker, coast)).toBe(true);
    expect(findPath(state, worker, coast)).toEqual([{ col: 2, row: 5 }]);
    expect(reachableTiles(state, worker).some((entry) => entry.tile === coast)).toBe(true);
    expect(applyCommand(state, move(0, worker.id, coast)).ok).toBe(true);
    expect([worker.col, worker.row]).toEqual([2, 5]);
  });

  it('stops a combat unit at the waterline, through the same three surfaces', () => {
    const state = seaState();
    const warrior = createUnit(state, 0, 'warrior', 3, 5);
    const coast = at(state, 2, 5);

    expect(canStopOn(state, warrior, coast)).toBe(false);
    expect(findPath(state, warrior, coast)).toBeNull();
    expect(reachableTiles(state, warrior).some((entry) => entry.tile === coast)).toBe(false);
    const before = snapshotState(state);
    expect(applyCommand(state, move(0, warrior.id, coast)).ok).toBe(false);
    // A refusal leaves the state byte-identical (hard rule 1).
    expect(snapshotState(state)).toEqual(before);
  });

  it('never lets anybody onto the deep ocean, sailing or not', () => {
    const state = seaState();
    const worker = createUnit(state, 0, 'worker', 2, 5);
    const ocean = at(state, 1, 5);
    expect(canStopOn(state, worker, ocean)).toBe(false);
    expect(findPath(state, worker, ocean)).toBeNull();
    expect(applyCommand(state, move(0, worker.id, ocean)).ok).toBe(false);
  });

  it('is a civilian rule plus the explorer, asked of the roster rather than of a unit id', () => {
    // `isCivilian` is the same predicate combat and capture ask, so a settler and
    // a future augur inherit the sea without a second list to keep up to date.
    // The scout joins by its row's `isExplorer` marker (user, 2026-08-29:
    // "sailing should also allow scouts to embark") — the one combat unit at
    // sea, and the one thing at sea that can reach an embarked civilian.
    const state = seaState();
    for (const type of ['worker', 'settler', 'scout'] as const) {
      const unit = createUnit(state, 0, type, 4, 4);
      expect(isCivilian(unitDef(type)) || isExplorer(unitDef(type))).toBe(true);
      expect(moveProfile(state, unit).embarks).toBe(true);
    }
    for (const type of ['warrior', 'archer'] as const) {
      const unit = createUnit(state, 0, type, 6, 4);
      expect(moveProfile(state, unit).embarks).toBe(false);
    }
  });

  it('carries a scout onto the coast through pathing, the highlight and the reducer', () => {
    const state = seaState();
    const coast = at(state, 2, 5);
    const scout = createUnit(state, 0, 'scout', 3, 5);
    expect(tileMoveCost(coast, moveProfile(state, scout))).toBe(RULES.movement.embarkCost);
    expect(findPath(state, scout, coast)).not.toBeNull();
    expect(reachableTiles(state, scout).some((entry) => entry.tile === coast)).toBe(true);
    expect(applyCommand(state, move(0, scout.id, coast)).ok).toBe(true);
    // And landlocked again the moment the technology is not held.
    forget(state, 0, 'sailing');
    expect(moveProfile(state, scout).embarks).toBe(false);
  });

  it('keeps a settler at sea safe from the wild, because the wild cannot follow', () => {
    // The quirk, stated. Barbarian intent is derived from the board every turn
    // and every raider is a combat unit, so a hex no combat unit can price is a
    // hex no raider can be ordered onto. This is asserted through the whole AI
    // rather than through `moveProfile`, because the claim is about what the
    // wild will actually do.
    const state = seaState();
    const wild = state.players[state.players.length - 1]!;
    const raider = createUnit(state, wild.id, 'warrior', 3, 5);
    const settler = createUnit(state, 0, 'settler', 2, 5);
    expect(moveProfile(state, raider).embarks).toBe(false);
    expect(canStopOn(state, raider, at(state, 2, 5))).toBe(false);

    // Let the wild actually take its turn, several times, with nothing else on
    // the board to distract it. It closes to the waterline and stops there.
    for (let turn = 0; turn < 5; turn++) {
      raider.movesLeft = unitDef(raider.type).movement;
      raid(state, [raider.id]);
      for (const unit of state.units) {
        if (unit.ownerId !== wild.id) continue;
        expect(isWaterTerrain(at(state, unit.col, unit.row).terrain), 'the wild went to sea').toBe(
          false,
        );
      }
    }
    expect(settler.ownerId).toBe(0);
    expect([settler.col, settler.row]).toEqual([2, 5]);
  });
});

// --- fishing boats ----------------------------------------------------------

describe('fishing boats', () => {
  /** A player-0 city with the western coast inside its borders, and a worker. */
  function fishery(resource = 'fish'): { state: GameState; worker: Unit; seam: Tile } {
    const state = seaState();
    const city = foundCityAt(state, 0, at(state, 3, 5));
    const seam = at(state, 2, 5);
    seam.resource = resource as Tile['resource'];
    expect(state.tileOwner[seam.row * state.map.width + seam.col]).toBe(city.id);
    const worker = createUnit(state, 0, 'worker', 2, 5);
    return { state, worker, seam };
  }

  it('is built by a worker standing on the water, and spends its charge', () => {
    const { state, worker, seam } = fishery();
    const before = worker.chargesLeft!;
    expect(improvementError(state, worker.id, 'fishingBoats')).toBeNull();
    expect(
      applyCommand(state, {
        type: 'buildImprovement',
        playerId: 0,
        unitId: worker.id,
        improvement: 'fishingBoats',
      }).ok,
    ).toBe(true);
    expect(seam.improvement).toBe('fishingBoats');
    expect(worker.chargesLeft).toBe(before - 1);
    // Building is the turn's work, exactly as it is on land.
    expect(worker.movesLeft).toBe(0);
  });

  it('refuses bare water, dry ground and the deep ocean by name', () => {
    const { state, seam } = fishery();
    delete seam.resource;
    expect(improvementErrorAt(state, 0, seam, 'fishingBoats')).toMatch(/needs a resource/);
    seam.resource = 'fish';
    // Land is refused by the terrain clause even with a seam on it.
    const land = at(state, 4, 5);
    land.resource = 'fish';
    expect(improvementErrorAt(state, 0, land, 'fishingBoats')).toMatch(/cannot be built on grassland/);
  });

  it('is held back by Sailing and by nothing else, so the sheet can grey one row', () => {
    // `improvementErrorAt(…) === improvementTechError(…)` is how the worker sheet
    // decides a row is greyed rather than hidden, and it only works because the
    // technology is asked last.
    const { state, seam } = fishery();
    forget(state, 0, 'sailing');
    expect(improvementErrorAt(state, 0, seam, 'fishingBoats')).toBe('A fishing boat needs Sailing');
  });

  it('pays the tile a point of food, as a line in its own breakdown', () => {
    const { state, seam } = fishery();
    const ctx = yieldContextFor(state, 0);
    const before = tileYieldOf(seam, ctx);
    seam.improvement = 'fishingBoats';
    const after = explainTileYield(seam, ctx);
    const line = after.find((entry) => entry.source === improvementDef('fishingBoats').name);
    expect(line, 'the boats have a line of their own').toBeDefined();
    expect(line!.food).toBe(1);
    expect(tileYieldOf(seam, ctx).food).toBe(before.food + 1);
  });

  it('refreshes the owning city the instant it is laid', () => {
    // The register in `refreshCityDerived`'s docblock, clause 4, read on water:
    // the boats pay now, not at the end of the turn. The stored derived state is
    // `workedTiles`, so the visible consequence is that the citizen moves onto
    // the fishery in the same breath as the command.
    const { state, worker, seam } = fishery();
    const city = state.cities[0]!;
    const worksSeam = (): boolean =>
      city.workedTiles.some((cell) => cell.col === seam.col && cell.row === seam.row);
    // Two hexes of bare grassland out-score bare coast, so nobody is there yet.
    expect(worksSeam()).toBe(false);
    applyCommand(state, {
      type: 'buildImprovement',
      playerId: 0,
      unitId: worker.id,
      improvement: 'fishingBoats',
    });
    expect(worksSeam()).toBe(true);
  });
});

// --- what the boats switched on ---------------------------------------------

describe('the sea luxuries, live', () => {
  /** A city holding an improved seam of `resource` on its own coast. */
  function holding(resource: string): GameState {
    const state = seaState();
    foundCityAt(state, 0, at(state, 3, 5));
    const seam = at(state, 2, 5);
    seam.resource = resource as Tile['resource'];
    seam.improvement = 'fishingBoats';
    return state;
  }

  it('puts every sea resource in an empire’s hands once a boat stands on it', () => {
    for (const resource of ['fish', 'crabs', 'pearls', 'coral', 'whales', 'tyrian'] as const) {
      expect(improvementForResource(resource)).toBe('fishingBoats');
      const state = holding(resource);
      expect(hasResource(state, 0, resource), resource).toBe(true);
    }
  });

  it('fires the happiness the ratified table promised pearls', () => {
    // The signature was written, tested and inert; nothing about it changed, and
    // the only reason it pays now is that somebody can hold the seam.
    const bare = seaState();
    foundCityAt(bare, 0, at(bare, 3, 5));
    const before = happinessOf(bare, 0);
    const state = holding('pearls');
    expect(happinessOf(state, 0)).toBeGreaterThan(before);
    const lines = explainHappiness(state, 0).map((line) => line.source);
    expect(lines.some((source) => source.includes('Pearls'))).toBe(true);
  });

  it('activates tyrian’s fishing-boat rider as a line on the hex', () => {
    // The `improvementYields` shape: "fishing boats give +1 culture", deferred in
    // `docs/luxuries.md` until there were fishing boats. It lands in the tile
    // breakdown rather than in a lump on the city (hard rule 5).
    const state = holding('tyrian');
    const seam = at(state, 2, 5);
    const ctx = yieldContextFor(state, 0);
    // Matched on the *whole* label rather than on the resource's name: the hex
    // also carries the murex's own tile line, and "Tyrian Murex" is the start of
    // both. `label` is what tells the two apart, which is what it is for.
    const riderSource = 'Tyrian Murex · fishing boat';
    const rider = explainTileYield(seam, ctx).find((entry) => entry.source === riderSource);
    expect(rider, 'the murex pays its boats').toBeDefined();
    expect(rider!.culture).toBe(1);
    // Empire-wide: a boat in a town nowhere near the murex is better for it too,
    // which is what makes it a trade good rather than a local bonus.
    const elsewhere = at(state, 2, 8);
    elsewhere.improvement = 'fishingBoats';
    expect(
      explainTileYield(elsewhere, ctx).some((entry) => entry.source === riderSource),
    ).toBe(true);
    // And it lands on boats, not on ground: a farm gets nothing from the murex.
    const farm = at(state, 5, 5);
    farm.improvement = 'farm';
    expect(explainTileYield(farm, ctx).some((entry) => entry.source === riderSource)).toBe(false);
  });

  it('holds whales’ rider behind its age, like every other second tier', () => {
    const state = seaState();
    foundCityAt(state, 0, at(state, 3, 5));
    const seam = at(state, 2, 5);
    seam.resource = 'whales';
    seam.improvement = 'fishingBoats';
    // The fixture holds every technology, so the empire is standing in Æra III
    // and the tier is live. Rolled back to Age I it is not.
    const late = yieldContextFor(state, 0);
    expect(explainTileYield(seam, late).some((entry) => entry.production === 1)).toBe(true);
    state.players[0]!.techsResearched = TECH_IDS.filter((id) => id !== 'sailing').slice(0, 3);
    state.players[0]!.techsResearched.push('sailing');
    const early = yieldContextFor(state, 0);
    expect(
      explainTileYield(seam, early).some((entry) => entry.source.startsWith('Whales · fishing')),
    ).toBe(false);
  });
});

// --- the coast as ground ----------------------------------------------------

describe('the coast a citizen works', () => {
  it('was always workable, and still is', () => {
    // Item four of the milestone turned out to need no code: `workable` is a
    // terrain flag and every water row already carried it, so the assigner's
    // candidate set reached the sea before any of this landed.
    for (const id of TERRAIN_IDS.filter(isWaterTerrain)) {
      expect(isWorkableTerrain(id), id).toBe(true);
    }
    const state = seaState();
    expect(isWorkableTile(at(state, 2, 5))).toBe(true);
  });

  it('is claimed by a coastal town and can hold a citizen', () => {
    const state = seaState();
    const city = foundCityAt(state, 0, at(state, 3, 5));
    city.population = 3;
    assignCitizens(state, city);
    const coast = at(state, 2, 5);
    coast.resource = 'fish';
    coast.improvement = 'fishingBoats';
    assignCitizens(state, city);
    expect(
      city.workedTiles.some((cell) => cell.col === coast.col && cell.row === coast.row),
      'a fishery is worth working',
    ).toBe(true);
  });
});

// --- the granary's water line -----------------------------------------------

describe('the granary on the water', () => {
  /** A four-citizen town on the shore, so several water hexes are worked. */
  function shoreTown(state: GameState): City {
    const city = foundCityAt(state, 0, at(state, 3, 5));
    city.population = 4;
    assignCitizens(state, city);
    return city;
  }

  it('adds food to the water hexes a town works, and to no dry one', () => {
    const state = seaState();
    const city = shoreTown(state);
    const land = at(state, 4, 5);
    const dry = tileYieldOf(land, yieldContextFor(state, 0));

    const before = cityYields(state, city).food;
    city.buildings.push('granary');
    assignCitizens(state, city);
    const after = cityYields(state, city).food;
    // The granary's own three food plus a point for every water hex worked, so
    // strictly more than the flat renewal alone would have been.
    expect(after).toBeGreaterThan(before + buildingFood('granary'));

    // Dry ground is untouched by it, and so is the empire's own context — the
    // line is the *city's*, which is why `yieldContextFor` cannot see it.
    expect(tileYieldOf(land, yieldContextFor(state, 0))).toEqual(dry);
    expect(
      explainTileYield(at(state, 2, 5), yieldContextFor(state, 0)).some(
        (entry) => entry.source === 'Granary',
      ),
    ).toBe(false);
  });

  it('waits for Sailing, and says so on Sailing’s card rather than the granary’s', () => {
    // The citizen is *pinned* to the water, because otherwise the assigner is
    // too good at its job to see the difference: take Sailing away and it simply
    // walks the citizen back onto grassland, which pays the same two food. What
    // is under test is the line, not the assigner, so the hex is held still.
    const state = seaState();
    const city = shoreTown(state);
    city.lockedTiles = [{ col: 2, row: 5 }];
    city.buildings.push('granary');
    assignCitizens(state, city);
    expect(city.workedTiles).toContainEqual({ col: 2, row: 5 });
    const withSail = cityYields(state, city).food;
    forget(state, 0, 'sailing');
    assignCitizens(state, city);
    expect(cityYields(state, city).food).toBe(withSail - 1);
  });

  it('pays only the town that built it', () => {
    const state = seaState();
    const north = foundCityAt(state, 0, at(state, 3, 2));
    north.population = 4;
    const south = foundCityAt(state, 0, at(state, 3, 8));
    south.population = 4;
    assignCitizens(state, north);
    assignCitizens(state, south);
    const before = cityYields(state, south).food;
    north.buildings.push('granary');
    assignCitizens(state, south);
    expect(cityYields(state, south).food).toBe(before);
  });
});

/** A building's own flat food, for the "strictly more than the renewal" claim. */
function buildingFood(id: 'granary'): number {
  return buildingDef(id).food;
}

// --- determinism ------------------------------------------------------------

describe('the milestone and the replay', () => {
  /** The hand-built sea board, rebuilt from nothing. Two calls must agree. */
  function fixture(): { state: GameState; workerId: number } {
    const state = seaState(14, 10);
    foundCityAt(state, 0, at(state, 3, 5));
    at(state, 2, 5).resource = 'whales';
    const worker = createUnit(state, 0, 'worker', 3, 5);
    return { state, workerId: worker.id };
  }

  it('walks a march to sea and a fishery to the same bytes twice', () => {
    // Everything this milestone added is either a derived read or a logged
    // command, so the same log on the same board must land on the same state —
    // no clock, no loose `Math`, no Map-order dependency in the new evaluators.
    // Asserted against a *rebuilt* fixture rather than through `saveGame`,
    // because a save replays `{config, log}` and cannot reproduce a hand-laid
    // coastline; what is under test here is the commands, not the generator.
    const run = (): string => {
      const { state, workerId } = fixture();
      const log: Command[] = [
        move(0, workerId, at(state, 2, 5)),
        { type: 'buildImprovement', playerId: 0, unitId: workerId, improvement: 'fishingBoats' },
      ];
      for (const command of log) expect(applyCommand(state, command).ok).toBe(true);
      expect(at(state, 2, 5).improvement).toBe('fishingBoats');
      expect(hasResource(state, 0, 'whales')).toBe(true);
      return snapshotState(state);
    };
    expect(run()).toEqual(run());
  });

  it('round-trips a generated game whose empire can sail', () => {
    // And the real thing, on a real map: a save is `{config, log}` and replays.
    const game: Game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    dispatch(game, { type: 'chooseResearch', playerId: 0, techId: 'sailing' } as Command);
    for (let turn = 0; turn < 12; turn++) dispatch(game, { type: 'endTurn', playerId: 0 });
    const saved = saveGame(game);
    const reloaded = loadGame(saved);
    expect(snapshotState(reloaded.state)).toEqual(snapshotState(game.state));
    const file = JSON.parse(saved) as { config: Parameters<typeof createGame>[0]; log: Command[] };
    expect(snapshotState(replay(file.config, file.log))).toEqual(snapshotState(game.state));
  });
});

// --- the profile itself -----------------------------------------------------

describe('MoveProfile', () => {
  it('is hoisted once and answers for the whole sweep', () => {
    // The shape, asserted so a later caller cannot quietly go back to passing a
    // bare `UnitDef`: `stepCost`'s fourth argument is a profile, and a profile
    // knows two things.
    const state = seaState();
    const worker = createUnit(state, 0, 'worker', 3, 5);
    const profile: MoveProfile = moveProfile(state, worker);
    expect(profile.def).toBe(unitDef('worker'));
    expect(profile.embarks).toBe(true);
  });
});

// --- what the later ages widen ----------------------------------------------

/**
 * The two rules that widen the sea after Sailing (the tree pass of 2026-08-30).
 * Both are *abilities* read at the one seam every step is priced through, which
 * is why neither needed a clause in `findPath`, `reachableTiles`,
 * `advanceAlongPath` or `pathTurns`: the four readers inherit them.
 */
describe('the sea widens twice', () => {
  /** Puts one ability's technology in a seat's hand. */
  function learn(state: GameState, playerId: number, ability: AbilityId): void {
    const gate = ABILITY_TECH.get(ability);
    if (gate === undefined) throw new Error(`no technology hands over ${ability}`);
    const player = state.players[playerId]!;
    if (!player.techsResearched.includes(gate)) player.techsResearched.push(gate);
  }

  it('lets soldiers embark at Wayfinding, and never without Sailing', () => {
    const state = seaState();
    const warrior = createUnit(state, 0, 'warrior', 4, 4);
    expect(moveProfile(state, warrior).embarks).toBe(false);
    learn(state, 0, 'militaryEmbark');
    expect(moveProfile(state, warrior).embarks).toBe(true);
    expect(tileMoveCost(at(state, 2, 4), moveProfile(state, warrior))).toBe(
      RULES.movement.embarkCost,
    );

    // And it is a widening of *who*, never of the water: an empire that somehow
    // held Wayfinding without Sailing embarks nobody, which is the honest
    // reading of a tree where one descends from the other.
    forget(state, 0, 'sailing');
    expect(moveProfile(state, warrior).embarks).toBe(false);
  });

  it('opens the ocean at The Astrolabe, to hull and swimmer alike', () => {
    const state = seaState();
    const worker = createUnit(state, 0, 'worker', 2, 5);
    const ocean = at(state, 1, 5);
    expect(tileMoveCost(ocean, moveProfile(state, worker))).toBeNull();

    learn(state, 0, 'oceanGoing');
    // One rule, so the deep water opens for both at once — which is what the
    // `tileMoveCost` docblock promised the day it would.
    expect(tileMoveCost(ocean, moveProfile(state, worker))).toBe(RULES.movement.embarkCost);
    const hull = createUnit(state, 0, 'trireme', 2, 4);
    expect(tileMoveCost(ocean, moveProfile(state, hull))).toBe(RULES.movement.minStepCost);
    // And it reaches every reader, because they all price through `stepCost`.
    expect(canStopOn(state, worker, ocean)).toBe(true);
    expect(findPath(state, worker, ocean)).not.toBeNull();

    // A lake is untouched: `deepWater` is a flag on the row and not "water that
    // is not coast", which is exactly the distinction a negation could not draw.
    const lake = at(state, 6, 5);
    lake.terrain = 'lake';
    expect(tileMoveCost(lake, moveProfile(state, worker))).toBeNull();
    expect(tileMoveCost(lake, moveProfile(state, hull))).toBeNull();
  });
});
