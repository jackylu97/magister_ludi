/**
 * **The Expansionist works, claims and borders** (batch E4 of
 * `docs/plans/expansionist-build-triage.md`). `expansionist.test.ts` checks the
 * rows against the sheet; this file checks what the cards do:
 *
 *   · The Keeps: a work row a seated card opens, one in each town, that pays
 *     what the hexes around it pay and gives its defender +5 (reading 31);
 *   · The Polders: a work on the coast beside your land that yields as a farm on
 *     grassland (reading 32);
 *   · Outposts: a work beyond the borders that claims the unowned ring around
 *     it, and a town founded on it takes that land (reading 33);
 *   · The Garden Frontier: tended works on unowned ground near the borders
 *     (reading 34);
 *   · The Fish Traps: a worker reaches a lake as it reaches the coast, embarked
 *     with Sailing, since the lake ruling of 2026-10-16 (it replaced reading 27);
 *   · The Staked Claims: every unowned hex within two hexes of a new town
 *     (reading 15);
 *   · The Wide Country: the hexes claimed, and two citizens in each of the three
 *     smallest towns (reading 35);
 *   · The Encroaching Fields, Migration and The Great Migration: the two
 *     ten-turn phases (readings 36 to 38);
 *   · the words of all ten.
 */

import { describe, expect, it } from 'vitest';

import { settleCampBounty } from '../../../src/sim/camps';
import {
  foundCityAt,
  purchaseTileAt,
  refreshCityDerived,
  tileOwnerCityId,
  tileOwnerPlayerId,
} from '../../../src/sim/cities';
import { previewCombat } from '../../../src/sim/combat';
import { applyCommand } from '../../../src/sim/commands';
import { runCommissions } from '../../../src/sim/commissions';
import { runEncroachment, runMigrations } from '../../../src/sim/frontiers';
import { improvementCountsAs, improvementDef, improvementYield } from '../../../src/sim/improvementData';
import { improvementCardError, improvementError } from '../../../src/sim/improvements';
import { mapRange, neighborTiles, raiseImprovement, tileHex, tileIndex } from '../../../src/sim/map';
import { happinessOf } from '../../../src/sim/meters';
import { findPath, moveProfile, shoreStepCost, stepCost, tileMoveCost, zocField } from '../../../src/sim/pathfind';
import { layRoad } from '../../../src/sim/roads';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { describeCard, stripRefs, tallyOf } from '../../../src/sim/statecraft';
import { type OrderId } from '../../../src/sim/statecraftData';
import { TILE_YIELD_KEYS, readTileYield, terrainDef } from '../../../src/sim/terrainData';
import { explainTileYield, foldTile, yieldContextFor } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Puts a card in the seat's collection only: a charter, which is never seated. */
function hold(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  bumpRevision(state);
}

/** Takes every card out of this seat's chairs. */
function unseat(state: GameState, playerId: number): void {
  playerById(state, playerId)!.statecraft.slots = [];
  bumpRevision(state);
}

/** One town of the given size for a seat, with an empty queue. */
function town(state: GameState, playerId: number, col: number, row: number, population: number): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Builds through the reducer, as a player's command would. */
function build(state: GameState, unitId: number, improvement: string): void {
  const result = applyCommand(state, {
    type: 'buildImprovement',
    playerId: 0,
    unitId,
    improvement: improvement as never,
  });
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
}

const said = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));

describe('the Expansionist batch E4: The Keeps', () => {
  it('opens the Keep only while the card is seated, one in each town, and a Keep built stays', () => {
    const state = bareState();
    const city = town(state, 0, 3, 5, 6);
    const worker = createUnit(state, 0, 'worker', 4, 5);
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'townKeep')).toBe('A keep needs the card The Keeps in a chair');
    slot(state, 0, 'theKeeps');
    expect(improvementError(state, worker.id, 'townKeep')).toBeNull();
    build(state, worker.id, 'townKeep');
    expect(at(state, 4, 5).improvement).toBe('townKeep');
    // One in each town: another hex of the same town is refused.
    const second = createUnit(state, 0, 'worker', 3, 4);
    bumpRevision(state);
    expect(improvementError(state, second.id, 'townKeep')).toBe(`${city.name} already has a keep`);
    // The card leaves its chair: the row closes, and the Keep stays.
    unseat(state, 0);
    expect(improvementCardError(state, 0, 'townKeep')).toBe('A keep needs the card The Keeps in a chair');
    expect(at(state, 4, 5).improvement).toBe('townKeep');
  });

  it('pays what each hex around it pays, inside your borders only, never a town or another Keep', () => {
    const state = bareState();
    town(state, 0, 3, 5, 6);
    const keep = at(state, 4, 5);
    raiseImprovement(keep, 'townKeep', state.turn);
    // A farm on one owned neighbour, so the copy is not the bare grass alone.
    const ring = neighborTiles(state.map, tileHex(keep));
    const owned = ring.filter(
      (tile) => tileOwnerPlayerId(state, tile.col, tile.row) === 0 && tileOwnerCityId(state, tile.col, tile.row) !== null,
    );
    const farmed = owned.find((tile) => !(tile.col === 3 && tile.row === 5))!;
    raiseImprovement(farmed, 'farm', state.turn);
    // Another Keep beside it is never copied.
    const rival = owned.find((tile) => tile !== farmed && !(tile.col === 3 && tile.row === 5))!;
    raiseImprovement(rival, 'townKeep', state.turn);
    bumpRevision(state);
    const ctx = yieldContextFor(state, 0);
    const copied = ring.filter(
      (tile) =>
        tileOwnerPlayerId(state, tile.col, tile.row) === 0 &&
        !(tile.col === 3 && tile.row === 5) &&
        tile !== rival,
    );
    // Some hexes are left out: the town's centre, the other Keep, and the
    // unowned second ring.
    expect(copied.length).toBeGreaterThan(0);
    expect(copied.length).toBeLessThan(ring.length);
    const expected = improvementYield('townKeep');
    for (const tile of copied) {
      const theirs = foldTile(tile, ctx);
      for (const voice of TILE_YIELD_KEYS) expected[voice] += theirs[voice];
    }
    const line = explainTileYield(keep, ctx).find((entry) => entry.source === 'Keep')!;
    for (const voice of TILE_YIELD_KEYS) expect(line[voice], voice).toBe(expected[voice]);
    expect(line.food).toBeGreaterThan(0);
    // A context-less reading copies nothing.
    const bare = explainTileYield(keep).find((entry) => entry.source === 'Keep')!;
    expect(bare.food + bare.production + bare.gold).toBe(0);
  });

  it('gives +5 to whoever defends the hex, as the citadel does', () => {
    const state = bareState();
    town(state, 0, 3, 5, 6);
    raiseImprovement(at(state, 4, 5), 'townKeep', state.turn);
    createUnit(state, 0, 'warrior', 4, 5);
    const attacker = createUnit(state, 1, 'warrior', 5, 5);
    bumpRevision(state);
    const plan = previewCombat(state, attacker.id, { col: 4, row: 5 });
    expect(plan.ok === false ? plan.error : 'ok').toBe('ok');
    if (plan.ok) {
      expect(plan.defenderLines.find((line) => line.source === 'Keep')?.amount).toBe(5);
    }
  });
});

describe('the Expansionist batch E4: The Polders', () => {
  it('raises a polder on a coast hex beside three of your land hexes, for two charges', () => {
    const state = bareState();
    town(state, 0, 3, 5, 3);
    const coast = at(state, 4, 5);
    coast.terrain = 'coast';
    const worker = createUnit(state, 0, 'worker', 4, 5);
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'polder')).toBe('A polder needs the card The Polders in a chair');
    slot(state, 0, 'thePolders');
    expect(improvementError(state, worker.id, 'polder')).toBeNull();
    // With too little of your land beside it, refused by the count.
    const land = neighborTiles(state.map, tileHex(coast)).filter(
      (tile) => tile.terrain !== 'coast' && tileOwnerPlayerId(state, tile.col, tile.row) === 0,
    );
    expect(land.length).toBeGreaterThanOrEqual(3);
    const drowned = land.slice(0, land.length - 2);
    for (const tile of drowned) tile.terrain = 'coast';
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'polder')).toBe('A polder needs 3 of your land hexes beside it');
    for (const tile of drowned) tile.terrain = 'grassland';
    bumpRevision(state);
    const before = worker.chargesLeft!;
    build(state, worker.id, 'polder');
    expect(coast.improvement).toBe('polder');
    expect(worker.chargesLeft).toBe(before - 2);
  });

  it('yields as a farm on grassland, stays water, and is not a farm to the cards', () => {
    const state = bareState();
    town(state, 0, 3, 5, 3);
    const coast = at(state, 4, 5);
    coast.terrain = 'coast';
    raiseImprovement(coast, 'polder', state.turn);
    bumpRevision(state);
    const paid = foldTile(coast, yieldContextFor(state, 0));
    const grass = readTileYield(terrainDef('grassland').yield);
    const farm = improvementYield('farm');
    for (const voice of TILE_YIELD_KEYS) expect(paid[voice], voice).toBe(grass[voice] + farm[voice]);
    // No Irrigation renewal: that one needs fresh water, and the row takes only
    // the dry renewals of the farm.
    expect(explainTileYield(coast, yieldContextFor(state, 0)).some((line) => line.source === 'Irrigation')).toBe(
      false,
    );
    expect(coast.terrain).toBe('coast');
    expect(improvementCountsAs('polder', 'farm')).toBe(false);
  });
});

describe('the Expansionist batch E4: Outposts', () => {
  it('goes only on unowned wild ground within three hexes of the borders', () => {
    const state = bareState(16, 10);
    town(state, 0, 2, 5, 3);
    const worker = createUnit(state, 0, 'worker', 5, 5);
    bumpRevision(state);
    // The ground takes it; the card is what is missing.
    expect(improvementError(state, worker.id, 'outpost')).toBe('An outpost needs the card Outposts in a chair');
    slot(state, 0, 'outposts');
    expect(improvementError(state, worker.id, 'outpost')).toBeNull();
    // Inside the borders: refused.
    worker.col = 3;
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'outpost')).toBe('An outpost needs unowned ground beyond your borders');
    // Too far out: refused with the reach.
    worker.col = 8;
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'outpost')).toBe('(8, 5) is more than 3 hexes beyond your borders');
  });

  it('claims its hex and the unowned ring around it for the nearest town, and counts toward The Wide Country', () => {
    const state = bareState(16, 10);
    const home = town(state, 0, 2, 5, 3);
    slot(state, 0, 'outposts');
    slot(state, 0, 'theWideCountry');
    const worker = createUnit(state, 0, 'worker', 6, 5);
    bumpRevision(state);
    build(state, worker.id, 'outpost');
    const ring = [...mapRange(state.map, tileHex(at(state, 6, 5)), 1)];
    for (const tile of ring) expect(tileOwnerCityId(state, tile.col, tile.row), `${tile.col},${tile.row}`).toBe(home.id);
    const sc = playerById(state, 0)!.statecraft;
    expect(tallyOf(sc, 'theWideCountry' as OrderId)).toBe(ring.length);
  });

  it('gives a town founded on it the land it claimed, and the town stands in its place', () => {
    const state = bareState(16, 10);
    const home = town(state, 0, 2, 5, 3);
    slot(state, 0, 'outposts');
    const worker = createUnit(state, 0, 'worker', 6, 5);
    bumpRevision(state);
    build(state, worker.id, 'outpost');
    const ring = [...mapRange(state.map, tileHex(at(state, 6, 5)), 1)];
    const city = foundCityAt(state, 0, at(state, 6, 5));
    for (const tile of ring) expect(tileOwnerCityId(state, tile.col, tile.row)).toBe(city.id);
    expect(at(state, 6, 5).improvement).toBeUndefined();
    expect(home.id).not.toBe(city.id);
  });
});

describe('the Expansionist batch E4: The Garden Frontier', () => {
  it('lets tended works go on unowned ground up to two hexes out, and the hex joins the nearest town', () => {
    const state = bareState(16, 10);
    const home = town(state, 0, 2, 5, 3);
    hold(state, 0, 'theBurningSeason');
    const worker = createUnit(state, 0, 'worker', 5, 5);
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'burnedCountry')).toBe('(5, 5) is not in your territory');
    slot(state, 0, 'theGardenFrontier');
    slot(state, 0, 'theWideCountry');
    expect(improvementError(state, worker.id, 'burnedCountry')).toBeNull();
    // Only tended works: a farm out there is still refused.
    expect(improvementError(state, worker.id, 'farm')).toBe('(5, 5) is not in your territory');
    worker.col = 6;
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'burnedCountry')).toBe('(6, 5) is more than 2 hexes beyond your borders');
    worker.col = 5;
    bumpRevision(state);
    build(state, worker.id, 'burnedCountry');
    expect(tileOwnerCityId(state, 5, 5)).toBe(home.id);
    // The hex alone, and it is not one of The Wide Country's three ways.
    expect(tileOwnerCityId(state, 6, 5)).toBeNull();
    expect(tallyOf(playerById(state, 0)!.statecraft, 'theWideCountry' as OrderId)).toBe(0);
  });
});

/**
 * **The Fish Traps since the lake ruling** (the user, 2026-10-16, `docs/flags.md`
 * (wwwwww)): a lake is water like the coast. A worker lays fish traps on a coast
 * hex by standing on it, embarked, which needs Sailing. It lays them on a lake
 * the same way now, so the charter opens the row and changes nothing about
 * movement. E4's lake rule for workers (`MoveProfile.wades`) is gone.
 */
describe('the Expansionist batch E4: The Fish Traps', () => {
  it('reaches a lake as it reaches the coast: embarked, with Sailing, charter or not', () => {
    const state = bareState();
    town(state, 0, 3, 5, 3);
    const lake = at(state, 4, 5);
    lake.terrain = 'lake';
    const coast = at(state, 3, 3);
    coast.terrain = 'coast';
    const worker = createUnit(state, 0, 'worker', 3, 4);
    bumpRevision(state);
    // The fixture holds Sailing, so the worker embarks onto either water at
    // one price, before the charter.
    expect(tileMoveCost(lake, moveProfile(state, worker))).toBe(RULES.movement.embarkCost);
    expect(tileMoveCost(coast, moveProfile(state, worker))).toBe(RULES.movement.embarkCost);
    // The charter opens the row. It does not change where the worker may go.
    hold(state, 0, 'theFishTraps');
    expect(tileMoveCost(lake, moveProfile(state, worker))).toBe(RULES.movement.embarkCost);
    // The step onto the lake is a shore crossing, priced by the one step price.
    const mover = moveProfile(state, worker);
    const price = stepCost(state.map, at(state, 3, 4), lake, mover, zocField(state, 0));
    expect(price?.cost).toBe(shoreStepCost(mover, at(state, 3, 4), lake));
    expect(findPath(state, worker, lake)).not.toBeNull();
    // Without Sailing neither water is open, and the charter does not open it.
    const owner = playerById(state, 0)!;
    owner.techsResearched = owner.techsResearched.filter((id) => id !== 'sailing');
    bumpRevision(state);
    expect(tileMoveCost(lake, moveProfile(state, worker))).toBeNull();
    expect(tileMoveCost(coast, moveProfile(state, worker))).toBeNull();
    expect(findPath(state, worker, lake)).toBeNull();
  });

  it('walks onto the lake through the reducer, and lays fish traps and floating gardens there', () => {
    const state = bareState();
    town(state, 0, 3, 5, 3);
    const lake = at(state, 4, 5);
    lake.terrain = 'lake';
    hold(state, 0, 'theFishTraps');
    const walker = createUnit(state, 0, 'worker', 3, 4);
    bumpRevision(state);
    const moved = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: walker.id,
      target: { col: lake.col, row: lake.row },
    });
    expect(moved.ok, moved.ok ? '' : moved.error).toBe(true);
    expect([walker.col, walker.row]).toEqual([lake.col, lake.row]);
    // A second worker already on the lake, with its movement, lays the work.
    const worker = createUnit(state, 0, 'worker', 4, 5);
    bumpRevision(state);
    expect(improvementError(state, worker.id, 'fishTraps')).toBeNull();
    // Floating gardens need Irrigation, which the fixture holds, and no card.
    expect(improvementError(state, worker.id, 'floatingGardens')).toBeNull();
    build(state, worker.id, 'fishTraps');
    expect(lake.improvement).toBe('fishTraps');
    expect(improvementDef('fishTraps').deferred).toBeUndefined();
    expect(improvementDef('floatingGardens').deferred).toBeUndefined();
  });
});

describe('the Expansionist batch E4: The Staked Claims', () => {
  it('claims every unowned hex within two hexes of a new town, and leaves another empire’s alone', () => {
    const state = bareState(16, 10);
    const theirs = town(state, 1, 12, 5, 3);
    // A hex of theirs inside the new town's reach.
    state.tileOwner[tileIndex(state.map, 7, 5)] = theirs.id;
    slot(state, 0, 'theStakedClaims');
    const city = foundCityAt(state, 0, at(state, 5, 5));
    for (const tile of mapRange(state.map, tileHex(at(state, 5, 5)), 2)) {
      const owner = tileOwnerCityId(state, tile.col, tile.row);
      if (tile.col === 7 && tile.row === 5) expect(owner).toBe(theirs.id);
      else expect(owner, `${tile.col},${tile.row}`).toBe(city.id);
    }
  });
});

describe('the Expansionist batch E4: The Wide Country', () => {
  it('counts hexes claimed by buying and by a cleared camp', () => {
    const state = bareState(16, 10, true);
    const home = town(state, 0, 3, 5, 3);
    slot(state, 0, 'theWideCountry');
    playerById(state, 0)!.gold = 1000;
    purchaseTileAt(state, home, at(state, 5, 5));
    const sc = playerById(state, 0)!.statecraft;
    expect(tallyOf(sc, 'theWideCountry' as OrderId)).toBe(1);
    // A camp's claim counts only under The Barbarian Frontier's rule.
    slot(state, 0, 'theBarbarianFrontier');
    createUnit(state, 0, 'warrior', 3, 7);
    settleCampBounty(state, 0, { col: 3, row: 7 });
    expect(tallyOf(sc, 'theWideCountry' as OrderId)).toBeGreaterThan(1);
  });

  it('pays two citizens to each of the three smallest towns, ties to the earlier town', () => {
    const state = bareState(20, 10);
    const towns = [
      town(state, 0, 2, 5, 6),
      town(state, 0, 6, 5, 2),
      town(state, 0, 10, 5, 3),
      town(state, 0, 14, 5, 2),
      town(state, 0, 18, 5, 4),
    ];
    slot(state, 0, 'theWideCountry');
    const sc = playerById(state, 0)!.statecraft;
    sc.tallies.push({ card: 'theWideCountry' as OrderId, count: 12 });
    const before = towns.map((city) => city.population);
    runCommissions(state);
    expect(towns.map((city) => city.population)).toEqual([
      before[0],
      before[1]! + 2,
      before[2]! + 2,
      before[3]! + 2,
      before[4],
    ]);
  });
});

describe('the Expansionist batch E4: The Encroaching Fields', () => {
  /** A large town of seat 0 beside a smaller town of seat 1, borders touching. */
  function neighbours(): { state: GameState; mine: City; theirs: City } {
    const state = bareState(16, 10);
    const mine = town(state, 0, 2, 5, 12);
    const theirs = town(state, 1, 5, 5, 3);
    // Their citizens work the far side, so the hex beside our border is free.
    theirs.lockedTiles = [
      { col: 6, row: 4 },
      { col: 6, row: 5 },
      { col: 6, row: 6 },
    ];
    refreshCityDerived(state, theirs);
    slot(state, 0, 'theEncroachingFields');
    return { state, mine, theirs };
  }

  it('takes one unworked hex of a smaller foreign town beside it, every ten turns', () => {
    const { state, mine, theirs } = neighbours();
    state.turn = 11;
    runEncroachment(state);
    const owned = (cityId: number): number => state.tileOwner.filter((id) => id === cityId).length;
    const mineBefore = owned(mine.id);
    expect(mineBefore).toBe(7);
    state.turn = 10;
    runEncroachment(state);
    expect(owned(mine.id)).toBe(mineBefore + 1);
    expect(owned(theirs.id)).toBe(6);
    expect(tileOwnerCityId(state, 4, 5)).toBe(mine.id);
    // Never the centre, and never a hex their town works.
    expect(tileOwnerCityId(state, theirs.col, theirs.row)).toBe(theirs.id);
    for (const cell of theirs.workedTiles) expect(tileOwnerCityId(state, cell.col, cell.row)).toBe(theirs.id);
  });

  it('takes nothing from a town at least as large', () => {
    const { state, mine, theirs } = neighbours();
    theirs.population = 12;
    refreshCityDerived(state, theirs);
    state.turn = 10;
    runEncroachment(state);
    expect(state.tileOwner.filter((id) => id === mine.id).length).toBe(7);
  });
});

describe('the Expansionist batch E4: Migration and The Great Migration', () => {
  it('sends a citizen from the largest town to the smallest joined one while the empire is unhappy', () => {
    const state = bareState(16, 10);
    const capital = town(state, 0, 2, 5, 8);
    const small = town(state, 0, 6, 5, 2);
    for (let col = 3; col <= 5; col++) layRoad(at(state, col, 5), 0);
    slot(state, 0, 'migration');
    while (happinessOf(state, 0) > 0 && capital.population < 60) {
      capital.population += 4;
      bumpRevision(state);
    }
    expect(happinessOf(state, 0)).toBeLessThanOrEqual(0);
    const before = [capital.population, small.population];
    state.turn = 10;
    runMigrations(state);
    expect([capital.population, small.population]).toEqual([before[0]! - 1, before[1]! + 1]);
  });

  it('moves nobody while the empire has happiness to spare', () => {
    const state = bareState(16, 10);
    const capital = town(state, 0, 2, 5, 2);
    const small = town(state, 0, 6, 5, 1);
    for (let col = 3; col <= 5; col++) layRoad(at(state, col, 5), 0);
    slot(state, 0, 'migration');
    expect(happinessOf(state, 0)).toBeGreaterThan(0);
    state.turn = 10;
    runMigrations(state);
    expect([capital.population, small.population]).toEqual([2, 1]);
  });

  it('draws a citizen from an unhappier empire’s town near the borders to the nearest town', () => {
    const state = bareState(16, 10);
    const mine = town(state, 0, 2, 5, 2);
    const theirs = town(state, 1, 6, 5, 4);
    const far = town(state, 1, 13, 5, 4);
    slot(state, 0, 'theGreatMigration');
    while (happinessOf(state, 1) >= happinessOf(state, 0) && theirs.population < 60) {
      theirs.population += 4;
      far.population += 4;
      bumpRevision(state);
    }
    expect(happinessOf(state, 0)).toBeGreaterThan(0);
    expect(happinessOf(state, 1)).toBeLessThan(happinessOf(state, 0));
    const before = [mine.population, theirs.population, far.population];
    state.turn = 10;
    runMigrations(state);
    // The town near the borders gives one; the far town is out of reach.
    expect([mine.population, theirs.population, far.population]).toEqual([
      before[0]! + 1,
      before[1]! - 1,
      before[2],
    ]);
  });
});

describe('the Expansionist batch E4: the words', () => {
  it('says what each of the ten cards does', () => {
    expect(said('theKeeps').join(' ')).toContain('while this card is seated, your workers may build a Keep');
    expect(said('theKeeps').join(' ')).toContain('one in each city');
    expect(said('thePolders').join(' ')).toContain('it yields as a farm on grassland');
    expect(said('outposts').join(' ')).toContain('up to 3 hexes beyond your borders');
    expect(said('theGardenFrontier').join(' ')).toContain('up to 2 hexes beyond your borders');
    expect(said('theFishTraps').join(' ')).toContain('Fish Traps');
    expect(said('theStakedClaims').join(' ')).toContain('every unowned hex within 2 hexes');
    expect(said('theWideCountry').join(' ')).toContain('claim 12 hexes by outposts, cleared camps or buying');
    expect(said('theWideCountry').join(' ')).toContain('+2 citizens in each of your 3 smallest cities');
    expect(said('theEncroachingFields').join(' ')).toContain('every 10 turns, each of your cities of at least 12 citizens');
    expect(said('migration').join(' ')).toContain('your largest city sends one citizen');
    expect(said('theGreatMigration').join(' ')).toContain('within 3 hexes of your borders');
  });
});
