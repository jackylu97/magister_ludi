/**
 * **Dominion batch D7, "economy rules and Double Time"**
 * (`docs/plans/dominion-build-triage.md`). `dominion.test.ts` checks the rows
 * against the sheet. This file checks that the shapes the batch added do what
 * the cards say:
 *
 *   · a unit's age as a filter (The Spear Makers);
 *   · "an empire you have met holds more towns" (The Defiant Kingdom);
 *   · camps near a holder's towns raising their units faster, and a strength
 *     line in your own territory (The Hunting Grounds);
 *   · the fortified-unit hex test and the fortified-units count (The Farming
 *     Garrisons, The Castra, The Fortress Empire);
 *   · an empire-stage production percentage, and free upkeep (The Marian
 *     Reforms);
 *   · a town's food surplus moved into production, step 14 of
 *     `docs/yields.md` (The Laws of Lord Shang);
 *   · the end-of-turn harvest of enemy hexes (War Feeds Itself);
 *   · the disband moment (The Legions' Labour);
 *   · the weariness rules (The Funeral Oration, The Glorious Dead);
 *   · Double Time's repeats, for Orders only, and its two tiers.
 *
 * And one fix from the coordinator's notes: a completion rider that pays only
 * science toward a technology or a free draft is paid (`payCompletionRiders`).
 */

import { describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { musterCamps } from '../../../src/sim/barbarians';
import { WONDER_IDS } from '../../../src/sim/buildingData';
import {
  channelSurplus,
  foundCityAt,
  growthSurplus,
  realiseItem,
  unitProductionCost,
} from '../../../src/sim/cities';
import { previewCombat } from '../../../src/sim/combat';
import { applyCommand } from '../../../src/sim/commands';
import { type Tile, createMap, getTileAt, raiseImprovement, tileIndex } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  campMusterPercent,
  describeCard,
  explainCardPercentYields,
  musterPeriodicUnits,
  runPeriodicBoons,
  stripRefs,
  turnEffectRepeats,
} from '../../../src/sim/statecraft';
import { drillUnits, harvestEnemyHexes, unitAge } from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
  type DoctrineId,
  type OrderId,
  orderDef,
} from '../../../src/sim/statecraftData';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../../../src/sim/unitData';
import { explainUnitUpkeepRebate, unitUpkeepTotal } from '../../../src/sim/upkeep';
import { resetVisibility } from '../../../src/sim/visibility';
import { recordWarLoss, wearinessBetween } from '../../../src/sim/weariness';
import { openWar } from '../../../src/sim/wars';
import { explainTileYield, foldTile, yieldContextFor } from '../../../src/sim/yields/hex';
import {
  explainSurplusMoved,
  foldCity,
  foldCityStages,
  productionModifiers,
} from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

/** Two seats on a flat grassland rectangle, the wild seated, at war unless told otherwise. */
function flat(war = true, width = 24, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  if (war) {
    const seats = realPlayers(state);
    openWar(state, seats[0]!.id, seats[1]!.id);
  }
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

/** Re-reads the board after a write the test made by hand. */
function touch(state: GameState): void {
  bumpRevision(state);
}

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = seat(state, playerId).statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  touch(state);
}

/** Gives this seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, playerId: number, id: string): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  touch(state);
}

/** The first military unit of this age, in roster order. */
function militaryOfAge(age: number): UnitTypeId {
  const type = UNIT_TYPE_IDS.find(
    (id) => unitDef(id).category === 'military' && unitAge(id) === age && unitDef(id).retired !== true,
  );
  expect(type, `a military unit of age ${age}`).toBeDefined();
  return type!;
}

/** The percentage this card's lines put behind a build in this town. */
function cardPercent(state: GameState, city: City, item: City['queue'][number], card: string): number {
  return productionModifiers(state, city, item)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.percent, 0);
}

describe('The Spear Makers: a unit filter by age', () => {
  it('reads a unit’s age off the technology that unlocks it, and the first age when none does', () => {
    expect(unitAge('warrior')).toBe(1);
    expect(unitAge(militaryOfAge(2))).toBe(2);
  });

  it('puts +30% behind first- and second-age military units and nothing behind a later one', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theSpearMakers');
    const unit = (id: UnitTypeId): City['queue'][number] => ({ kind: 'unit', id });
    expect(cardPercent(state, city, unit(militaryOfAge(1)), 'theSpearMakers')).toBe(30);
    expect(cardPercent(state, city, unit(militaryOfAge(2)), 'theSpearMakers')).toBe(30);
    expect(cardPercent(state, city, unit(militaryOfAge(3)), 'theSpearMakers')).toBe(0);
    expect(cardPercent(state, city, unit('worker'), 'theSpearMakers')).toBe(0);
    expect(stripRefs(describeCard('theSpearMakers' as OrderId)[0]!.text)).toBe(
      '+30% production toward first- and second-age military units',
    );
  });
});

describe('The Defiant Kingdom: a rival with more towns', () => {
  // Retired in batch R1 (the user, 2026-10-23: "remove"). A seat that held it
  // in an old save keeps it, so its effect is still pinned here.
  it('trains military units 25% faster only while an empire it has met holds more towns', () => {
    const state = flat(false);
    const home = foundCityAt(state, 0, at(state, 4, 4))!;
    foundCityAt(state, 1, at(state, 12, 4));
    slot(state, 0, 'theDefiantKingdom');
    const warrior: City['queue'][number] = { kind: 'unit', id: 'warrior' };
    const percent = (): number => cardPercent(state, home, warrior, 'theDefiantKingdom');
    // One town each: nobody holds more.
    seat(state, 0).metSeats = [1];
    touch(state);
    expect(percent()).toBe(0);
    // The rival founds a second town, but this empire has not met it.
    foundCityAt(state, 1, at(state, 12, 8));
    seat(state, 0).metSeats = [];
    touch(state);
    expect(percent()).toBe(0);
    // Met, it counts (the triage's reading 11).
    seat(state, 0).metSeats = [1];
    touch(state);
    expect(percent()).toBe(25);
    // A building is not a military unit.
    expect(cardPercent(state, home, { kind: 'building', id: 'monument' }, 'theDefiantKingdom')).toBe(0);
  });
});

describe('The Hunting Grounds: camps near your towns raise their units faster', () => {
  it('speeds only the camps within ten hexes of a holder’s town', () => {
    const state = flat(false, 40, 12);
    foundCityAt(state, 0, at(state, 4, 5));
    const near = { col: 10, row: 5, foundedTurn: 0 };
    const far = { col: 24, row: 5, foundedTurn: 0 };
    state.camps.push(near, far);
    touch(state);
    expect(campMusterPercent(state, near)).toBe(0);
    slot(state, 0, 'theHuntingGrounds');
    expect(campMusterPercent(state, near)).toBe(50);
    expect(campMusterPercent(state, far)).toBe(0);
    // The rule book's camp musters every five turns; +50% is every three.
    const wild = state.players.find((player) => player.barbarian === true)!;
    const bandAt = (camp: { col: number; row: number }): number =>
      state.units.filter(
        (unit) => unit.ownerId === wild.id && Math.abs(unit.col - camp.col) <= 1 && Math.abs(unit.row - camp.row) <= 1,
      ).length;
    state.turn = 3;
    musterCamps(state);
    expect(bandAt(near)).toBe(1);
    expect(bandAt(far)).toBe(0);
  });

  it('gives your units +4 strength in a fight inside your own territory', () => {
    // The fight's hex is the one asked (`ownTerritory`): a unit of yours
    // defending a hex of yours.
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theHuntingGrounds');
    const soldier = createUnit(state, 0, 'warrior', home.col + 1, home.row);
    const raider = createUnit(state, 1, 'warrior', home.col + 2, home.row);
    expect(state.tileOwner[tileIndex(state.map, soldier.col, soldier.row)]).toBe(home.id);
    touch(state);
    const view = previewCombat(state, raider.id, { col: soldier.col, row: soldier.row });
    if (!view.ok) throw new Error(view.error);
    const line = view.defenderLines
      .filter((row) => row.source.includes('Hunting Grounds'))
      .reduce((sum, row) => sum + row.amount, 0);
    expect(line).toBe(4);
  });
});

describe('the fortified-unit hex test: The Farming Garrisons and The Castra', () => {
  /** What one card's lines pay on one hex, as seat 0 sees it. */
  function hexPaid(state: GameState, tile: Tile, card: string): Record<'food' | 'production' | 'science', number> {
    const total = { food: 0, production: 0, science: 0 };
    // The hex's own breakdown, the card's merged line read by its label.
    const name = orderDef(card as OrderId).name;
    for (const line of explainTileYield(tile, yieldContextFor(state, 0))) {
      if (!line.source.includes(name)) continue;
      total.food += line.food;
      total.production += line.production;
      total.science += line.science;
    }
    return total;
  }

  it('pays The Farming Garrisons on a worked hex and on the town’s own hex while a military unit is fortified there', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theFarmingGarrisons');
    const field = at(state, 5, 4);
    const out = createUnit(state, 0, 'warrior', field.col, field.row);
    const garrison = createUnit(state, 0, 'warrior', city.col, city.row);
    touch(state);
    expect(hexPaid(state, field, 'theFarmingGarrisons')).toEqual({ food: 0, production: 0, science: 0 });
    out.fortifiedTurns = 0;
    garrison.fortifiedTurns = 0;
    touch(state);
    expect(hexPaid(state, field, 'theFarmingGarrisons')).toEqual({ food: 1, production: 1, science: 0 });
    // The town's centre counts too (the triage's reading 25).
    expect(hexPaid(state, at(state, city.col, city.row), 'theFarmingGarrisons')).toEqual({
      food: 1,
      production: 1,
      science: 0,
    });
    // A civilian is not a military unit, and another empire's unit is not yours.
    const empty = at(state, 4, 5);
    createUnit(state, 0, 'worker', empty.col, empty.row);
    createUnit(state, 1, 'warrior', empty.col, empty.row).fortifiedTurns = 0;
    touch(state);
    expect(hexPaid(state, empty, 'theFarmingGarrisons')).toEqual({ food: 0, production: 0, science: 0 });
  });

  it('gives a fortified unit +2 strength under The Farming Garrisons', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theFarmingGarrisons');
    const defender = createUnit(state, 0, 'warrior', city.col + 2, city.row);
    const attacker = createUnit(state, 1, 'warrior', city.col + 3, city.row);
    defender.fortifiedTurns = 0;
    touch(state);
    const view = previewCombat(state, attacker.id, { col: defender.col, row: defender.row });
    if (!view.ok) throw new Error(view.error);
    const line = view.defenderLines
      .filter((row) => row.source.includes('Farming Garrisons'))
      .reduce((sum, row) => sum + row.amount, 0);
    expect(line).toBe(2);
  });

  it('pays The Castra on a hex with a fortified military unit, and on a citadel', () => {
    const state = flat(false);
    foundCityAt(state, 0, at(state, 4, 4));
    slot(state, 0, 'theCastra');
    const field = at(state, 5, 4);
    createUnit(state, 0, 'warrior', field.col, field.row).fortifiedTurns = 0;
    const keep = at(state, 3, 4);
    raiseImprovement(keep, 'citadel', state.turn);
    touch(state);
    expect(hexPaid(state, field, 'theCastra')).toEqual({ food: 0, production: 1, science: 1 });
    expect(hexPaid(state, keep, 'theCastra')).toEqual({ food: 0, production: 3, science: 3 });
  });
});

describe('The Fortress Empire: the fortified-units count', () => {
  it('pays +5% science and production for each fortified military unit inside a town’s borders, at most +30%', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    hold(state, 0, 'theFortressEmpire');
    const percent = (voice: 'science' | 'production'): number =>
      explainCardPercentYields(state, city)
        .filter((line) => line.card === 'theFortressEmpire' && line.yield === voice)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent('science')).toBe(0);
    // Two fortified on the town's ground, one not fortified, one outside.
    const ground = [at(state, 4, 4), at(state, 5, 4)];
    for (const tile of ground) createUnit(state, 0, 'warrior', tile.col, tile.row).fortifiedTurns = 0;
    createUnit(state, 0, 'warrior', 4, 5);
    const outside = createUnit(state, 0, 'warrior', 12, 8);
    outside.fortifiedTurns = 0;
    expect(state.tileOwner[tileIndex(state.map, 12, 8)]).toBeNull();
    touch(state);
    expect(percent('science')).toBe(10);
    expect(percent('production')).toBe(10);
    // Seven more fortified at home: the ceiling is six helpings.
    for (let n = 0; n < 7; n++) createUnit(state, 0, 'warrior', 4, 4).fortifiedTurns = 0;
    touch(state);
    expect(percent('science')).toBe(30);
  });
});

describe('The Marian Reforms: free upkeep, and half speed at the empire stage', () => {
  it('takes the military payroll off the books', () => {
    const state = flat(false);
    foundCityAt(state, 0, at(state, 4, 4));
    for (let n = 0; n < 4; n++) createUnit(state, 0, 'warrior', 6, 6);
    touch(state);
    const rebate = (): number =>
      explainUnitUpkeepRebate(state, 0).reduce((sum, line) => sum + line.gold, 0);
    const before = rebate();
    hold(state, 0, 'theMarianReforms');
    expect(unitUpkeepTotal(state, 0)).toBeGreaterThan(0);
    expect(rebate() - before).toBe(unitUpkeepTotal(state, 0) - before);
  });

  it('halves what the town makes toward a military unit after its own bonuses, and leaves buildings alone', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theSpearMakers');
    const warrior: City['queue'][number] = { kind: 'unit', id: 'warrior' };
    const monument: City['queue'][number] = { kind: 'building', id: 'monument' };
    const before = foldCityStages(state, city, warrior).production;
    const plain = foldCity(state, city, [], monument).production;
    hold(state, 0, 'theMarianReforms');
    const line = productionModifiers(state, city, warrior).find((entry) => entry.card === 'theMarianReforms');
    expect(line?.percent).toBe(-50);
    expect(line?.stage).toBe('empire');
    // The city stage keeps The Spear Makers' +30%, and the empire stage loses
    // fifty points: it multiplies what the town's own bonuses made, so they
    // soften the halving without cancelling it.
    const after = foldCityStages(state, city, warrior).production;
    expect(after.city).toBe(before.city);
    expect(after.empire).toBe(before.empire - 50);
    expect(foldCity(state, city, [], monument).production).toBe(plain);
  });
});

describe('The Laws of Lord Shang: the surplus moved (step 14)', () => {
  function grownTown(state: GameState): City {
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    return city;
  }

  it('moves the food surplus into production while the town builds a military unit, and stores none of it', () => {
    const state = flat(false);
    const city = grownTown(state);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    touch(state);
    const surplus = channelSurplus(state, city);
    expect(surplus).toBeGreaterThan(0);
    const before = foldCity(state, city, [], city.queue[0]).production;
    expect(growthSurplus(state, city)).toBe(surplus);
    hold(state, 0, 'theLawsOfLordShang');
    const moved = explainSurplusMoved(state, city, foldCity(state, city, [], city.queue[0]), city.queue[0]);
    expect(moved).toHaveLength(1);
    expect(moved[0]!.amount).toBe(surplus);
    expect(moved[0]!.card).toBe('theLawsOfLordShang');
    expect(foldCity(state, city, [], city.queue[0]).production).toBe(before + surplus);
    expect(growthSurplus(state, city)).toBe(0);
  });

  it('moves nothing while the town builds a building, while it starves, or while it is in unrest', () => {
    const state = flat(false);
    const city = grownTown(state);
    hold(state, 0, 'theLawsOfLordShang');
    city.queue = [{ kind: 'building', id: 'monument' }];
    touch(state);
    expect(explainSurplusMoved(state, city, foldCity(state, city, [], city.queue[0]), city.queue[0])).toEqual([]);
    expect(growthSurplus(state, city)).toBeGreaterThan(0);
    // A town in unrest builds nothing, so its food goes on toward growth,
    // whatever growth the unrest leaves it.
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.unrest = { target: 10, progress: 0, unguarded: 0 };
    touch(state);
    expect(explainSurplusMoved(state, city, foldCity(state, city, [], city.queue[0]), city.queue[0])).toEqual([]);
    expect(growthSurplus(state, city)).toBe(channelSurplus(state, city));
    delete city.unrest;
    // A starving town starves as before: a deficit is never moved.
    city.population = 12;
    touch(state);
    expect(channelSurplus(state, city)).toBeLessThan(0);
    expect(explainSurplusMoved(state, city, foldCity(state, city, [], city.queue[0]), city.queue[0])).toEqual([]);
    expect(growthSurplus(state, city)).toBe(channelSurplus(state, city));
  });
});

describe('War Feeds Itself: the harvest of enemy hexes', () => {
  function front(state: GameState): { home: City; enemy: City; tile: Tile } {
    const home = foundCityAt(state, 0, at(state, 4, 4))!;
    const enemy = foundCityAt(state, 1, at(state, 12, 4))!;
    const tile = at(state, 13, 4);
    expect(state.tileOwner[tileIndex(state.map, tile.col, tile.row)]).toBe(enemy.id);
    return { home, enemy, tile };
  }

  it('yields your empire the hex’s yields at the end of the turn, and costs the owner nothing', () => {
    const state = flat();
    const { home, enemy, tile } = front(state);
    slot(state, 0, 'warFeedsItself');
    createUnit(state, 0, 'warrior', tile.col, tile.row);
    home.foodBasket = 0;
    home.hammerBasket = 0;
    const theirs = { food: enemy.foodBasket, hammers: enemy.hammerBasket };
    touch(state);
    const bag = foldTile(tile, yieldContextFor(state, 0));
    expect(bag.food).toBeGreaterThan(0);
    harvestEnemyHexes(state);
    expect(home.foodBasket).toBe(bag.food);
    expect(enemy.foodBasket).toBe(theirs.food);
    expect(enemy.hammerBasket).toBe(theirs.hammers);
  });

  it('yields nothing at peace, and nothing for a civilian', () => {
    const state = flat(false);
    const { home, tile } = front(state);
    slot(state, 0, 'warFeedsItself');
    createUnit(state, 0, 'warrior', tile.col, tile.row);
    home.foodBasket = 0;
    touch(state);
    harvestEnemyHexes(state);
    expect(home.foodBasket).toBe(0);
    const war = flat();
    const fronts = front(war);
    slot(war, 0, 'warFeedsItself');
    createUnit(war, 0, 'worker', fronts.tile.col, fronts.tile.row);
    fronts.home.foodBasket = 0;
    touch(war);
    harvestEnemyHexes(war);
    expect(fronts.home.foodBasket).toBe(0);
  });
});

describe('The Legions’ Labour: the disband moment', () => {
  const WONDER = WONDER_IDS[0]!;

  function town(state: GameState, building: string): City {
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    city.queue = [{ kind: 'building', id: building } as City['queue'][number]];
    city.hammerBasket = 0;
    return city;
  }

  it('adds half the unit’s production cost toward the wonder the town is building', () => {
    const state = flat(false);
    const city = town(state, WONDER);
    slot(state, 0, 'dominionTheLegionsLabour');
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    const cost = unitProductionCost(state, 0, 'warrior');
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: soldier.id }).ok).toBe(true);
    expect(city.hammerBasket).toBe(cost / 2);
  });

  it('adds nothing for a unit raised for free, outside a town, or in a town building something else', () => {
    const state = flat(false);
    const city = town(state, WONDER);
    slot(state, 0, 'dominionTheLegionsLabour');
    const free = createUnit(state, 0, 'warrior', city.col, city.row);
    free.freeUpkeep = true;
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: free.id }).ok).toBe(true);
    expect(city.hammerBasket).toBe(0);
    const afield = createUnit(state, 0, 'warrior', city.col + 2, city.row);
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: afield.id }).ok).toBe(true);
    expect(city.hammerBasket).toBe(0);
    const worker = createUnit(state, 0, 'worker', city.col, city.row);
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: worker.id }).ok).toBe(true);
    expect(city.hammerBasket).toBe(0);
    city.queue = [{ kind: 'building', id: 'monument' }];
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: soldier.id }).ok).toBe(true);
    expect(city.hammerBasket).toBe(0);
  });

  it('counts a unit a levy raised, which is not a free unit', () => {
    const state = flat(false);
    const city = town(state, 'theMagnumOpus');
    slot(state, 0, 'dominionTheLegionsLabour');
    const levied = createUnit(state, 0, 'warrior', city.col, city.row);
    levied.levied = 'conscript';
    const cost = unitProductionCost(state, 0, 'warrior');
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: levied.id }).ok).toBe(true);
    // The Magnum Opus is not a world wonder, so the card names it beside them.
    expect(city.hammerBasket).toBe(cost / 2);
  });
});

describe('The Funeral Oration and The Glorious Dead: the weariness rules', () => {
  it('counts your unit losses at half, rounded down, and leaves the enemy’s reading whole', () => {
    const state = flat();
    for (let n = 0; n < 3; n++) recordWarLoss(state, 0, 1, 'unit');
    recordWarLoss(state, 1, 0, 'unit');
    expect(wearinessBetween(state, 0, 1).suffered).toBe(3);
    slot(state, 0, 'theFuneralOration');
    expect(wearinessBetween(state, 0, 1).suffered).toBe(1);
    expect(wearinessBetween(state, 0, 1).points).toBe(0);
    // The enemy's line still counts this empire's losses whole as its offset.
    expect(wearinessBetween(state, 1, 0).inflicted).toBe(3);
    // A town lost still counts in full.
    recordWarLoss(state, 0, 1, 'town');
    expect(wearinessBetween(state, 0, 1).suffered).toBe(1 + 8);
  });

  it('counts none of your losses under The Glorious Dead', () => {
    const state = flat();
    recordWarLoss(state, 0, 1, 'unit');
    recordWarLoss(state, 0, 1, 'town');
    slot(state, 0, 'theGloriousDead');
    expect(wearinessBetween(state, 0, 1).suffered).toBe(0);
    expect(wearinessBetween(state, 0, 1).happiness).toBe(0);
    expect(wearinessBetween(state, 1, 0).inflicted).toBe(9);
  });
});

describe('Double Time: Orders’ turn effects happen twice', () => {
  it('repeats an Order’s and never a Doctrine’s', () => {
    const state = flat(false);
    expect(turnEffectRepeats(state, 0, 'theKingsLevy' as OrderId)).toBe(1);
    slot(state, 0, 'doubleTime');
    expect(turnEffectRepeats(state, 0, 'theKingsLevy' as OrderId)).toBe(2);
    expect(turnEffectRepeats(state, 0, 'totalMobilisation' as DoctrineId)).toBe(1);
  });

  it('raises two units from one periodic muster', () => {
    const muster = (double: boolean): number => {
      const state = flat(false);
      foundCityAt(state, 0, at(state, 4, 4));
      slot(state, 0, 'theKingsLevy');
      if (double) slot(state, 0, 'doubleTime');
      state.turn = 15;
      musterPeriodicUnits(state);
      return state.units.filter((unit) => unit.ownerId === 0).length;
    };
    expect(muster(false)).toBe(1);
    expect(muster(true)).toBe(2);
  });

  it('does not repeat a Doctrine’s muster', () => {
    const state = flat();
    const big = foundCityAt(state, 0, at(state, 4, 4))!;
    big.population = 6;
    hold(state, 0, 'totalMobilisation');
    slot(state, 0, 'doubleTime');
    state.turn = 10;
    musterPeriodicUnits(state);
    expect(state.units.filter((unit) => unit.ownerId === 0)).toHaveLength(1);
  });

  it('drills twice', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theDrillGrounds');
    slot(state, 0, 'doubleTime');
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    // The Drill Grounds drill every third turn (batch R1).
    state.turn = 9;
    drillUnits(state);
    expect(soldier.experience).toBe(2);
  });

  it('pays a seated Order’s periodic boon twice', () => {
    const levy = orderDef('theKingsLevy' as OrderId);
    const kept = levy.effects;
    // A boon on the calendar, lent to a live row for the length of the test.
    (levy as { effects: CardEffect[] }).effects = [
      { kind: 'periodic', everyTurns: 5, pays: 'gold', amount: 10 },
    ];
    try {
      const boon = (double: boolean): number => {
        const state = flat(false);
        foundCityAt(state, 0, at(state, 4, 4));
        slot(state, 0, 'theKingsLevy');
        if (double) slot(state, 0, 'doubleTime');
        const player = seat(state, 0);
        // The first sweep stamps the clock, and the fifth turn after it pays.
        runPeriodicBoons(state);
        const before = player.gold;
        state.turn += 5;
        touch(state);
        runPeriodicBoons(state);
        return player.gold - before;
      };
      expect(boon(false)).toBe(10);
      expect(boon(true)).toBe(20);
    } finally {
      (levy as { effects: CardEffect[] }).effects = kept;
    }
  });

  it('harvests twice', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 4, 4))!;
    foundCityAt(state, 1, at(state, 12, 4));
    slot(state, 0, 'warFeedsItself');
    slot(state, 0, 'doubleTime');
    const tile = at(state, 13, 4);
    createUnit(state, 0, 'warrior', tile.col, tile.row);
    home.foodBasket = 0;
    touch(state);
    const bag = foldTile(tile, yieldContextFor(state, 0));
    harvestEnemyHexes(state);
    expect(home.foodBasket).toBe(bag.food * 2);
  });

  it('is a rare Wildcard dealt in Tiers II and III', () => {
    const def = orderDef('doubleTime' as OrderId);
    expect(def.rarity).toBe('rare');
    expect(def.type).toBe('wildcard');
    expect(def.band).toBe(2);
    expect(def.lastBand).toBe(3);
  });
});

describe('the bot prices the new shapes off the board as it stands', () => {
  it('prices War Feeds Itself only with an army in enemy territory, and Lord Shang only with a town building soldiers', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 4, 4))!;
    foundCityAt(state, 1, at(state, 12, 4));
    const player = seat(state, 0);
    const worth = (id: string): number => scoreCard(player, id as OrderId, valueContext(state, player));
    expect(worth('warFeedsItself')).toBe(0);
    createUnit(state, 0, 'warrior', 13, 4);
    touch(state);
    expect(worth('warFeedsItself')).toBeGreaterThan(0);
    home.queue = [{ kind: 'building', id: 'monument' }];
    touch(state);
    expect(worth('theLawsOfLordShang')).toBe(0);
    home.queue = [{ kind: 'unit', id: 'warrior' }];
    touch(state);
    expect(worth('theLawsOfLordShang')).not.toBe(0);
    for (const id of ['theSpearMakers', 'theDefiantKingdom', 'theHuntingGrounds', 'theCastra', 'doubleTime',
      'theFuneralOration', 'theGloriousDead', 'dominionTheLegionsLabour', 'theFarmingGarrisons']) {
      expect(Number.isFinite(worth(id)), id).toBe(true);
    }
  });
});

describe('a completion rider that pays only science toward a technology or a free draft', () => {
  it('is paid: the completion riders ask the evaluator whether a payout is empty', () => {
    const code = orderDef('theNewCode' as OrderId);
    const kept = code.effects;
    // The New Code's free draft, lent to the completion of a unit.
    (code as { effects: CardEffect[] }).effects = [
      { kind: 'windfallRider', occasion: 'unitCompletion', grant: { freeDraft: true } },
    ];
    try {
      const state = flat(false);
      const city = foundCityAt(state, 0, at(state, 4, 4))!;
      slot(state, 0, 'theNewCode');
      const player = seat(state, 0);
      expect(player.statecraft.pendingOrder).toBeUndefined();
      realiseItem(state, city, { kind: 'unit', id: 'warrior', tile: at(state, 4, 4) });
      expect(player.statecraft.pendingOrder?.options.length ?? 0).toBeGreaterThan(0);
    } finally {
      (code as { effects: CardEffect[] }).effects = kept;
    }
  });
});
