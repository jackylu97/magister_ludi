import { describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { explainCommission, explainCommissionChair } from '../../../src/ai/value';
import { bestMeleeFor, foundCityAt, growthThreshold, spawnTileFor } from '../../../src/sim/cities';
import { previewCombat } from '../../../src/sim/combat';
import { applyCommand } from '../../../src/sim/commands';
import { commissionProgress, runCommissions } from '../../../src/sim/commissions';
import { bumpRevision, createUnit, type GameState } from '../../../src/sim/state';
import { cardCityStat, explainCardCityYields, slotOrderError, slotTypesOf } from '../../../src/sim/statecraft';
import type { OrderId } from '../../../src/sim/statecraftData';
import { explainCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

function seatOrders(state: GameState, ...orders: OrderId[]): void {
  const council = state.players[0]!.statecraft;
  council.orders.push(...orders);
  council.slots.push(...orders.map((card) => ({ card, sealedUntil: state.turn })));
  bumpRevision(state);
}

function seatCommission(state: GameState, card: OrderId): number {
  const player = state.players[0]!;
  player.statecraft.orders.push(card);
  const chair = slotTypesOf(player.statecraft).indexOf('wildcard');
  expect(applyCommand(state, { type: 'slotOrder', playerId: 0, cardId: card, slotIndex: chair }).ok).toBe(true);
  return chair;
}

describe('Generic population commissions', () => {
  it('completes The Land Register at thirty citizens and pays every current and future town', () => {
    const state = bareState(24, 12);
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const second = foundCityAt(state, 0, at(state, 9, 5));
    const rival = foundCityAt(state, 1, at(state, 16, 5));
    capital.population = 18;
    second.population = 11;
    rival.population = 30;
    const player = state.players[0]!;
    const card = 'theLandRegister';
    const chair = seatCommission(state, card);
    const linesFor = (city: typeof capital) => explainCardCityYields(state, city).filter((line) => line.card === card);
    expect(commissionProgress(state, 0, card)[0]).toMatchObject({ have: 29, need: 30, met: false });
    expect(runCommissions(state)).toEqual([]);
    expect(linesFor(capital)).toEqual([]);
    expect(explainCommission(card, valueContext(state, player))!.total).toBeGreaterThan(0);

    // A reached goal keeps no tally. It can be met while unseated and paid once reseated.
    state.turn = player.statecraft.slots[chair]!.sealedUntil;
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex: chair }).ok).toBe(true);
    second.population += 1;
    bumpRevision(state);
    expect(commissionProgress(state, 0, card)[0]).toMatchObject({ have: 30, need: 30, met: true });
    expect(runCommissions(state)).toEqual([]);
    expect(applyCommand(state, { type: 'slotOrder', playerId: 0, cardId: card, slotIndex: chair }).ok).toBe(true);
    expect(runCommissions(state).map((report) => report.card)).toEqual([card]);
    expect(player.statecraft.slots[chair]).toBeNull();
    expect(slotOrderError(state, 0, card, chair)).toMatch(/fulfilled/);

    const newTown = foundCityAt(state, 0, at(state, 3, 10));
    second.population = 9;
    state.turn += 1;
    bumpRevision(state);
    expect(runCommissions(state)).toEqual([]);
    for (const city of [capital, second, newTown]) {
      expect(linesFor(city)).toEqual([expect.objectContaining({ food: 2, production: 2 })]);
    }
    expect(linesFor(rival)).toEqual([]);
    expect(explainCommission(card, valueContext(state, player))!.total).toBe(0);
  });

  it('completes The Master Plan when its fourth town reaches twenty citizens', () => {
    const state = bareState(30, 12);
    const towns = [3, 9, 15, 21].map((col) => foundCityAt(state, 0, at(state, col, 5)));
    const fourth = towns[3]!;
    const rival = foundCityAt(state, 1, at(state, 3, 10));
    for (const town of [...towns, rival]) town.population = 20;
    fourth.population = 19;
    const card = 'theMasterPlan';
    const chair = seatCommission(state, card);
    const opus = { kind: 'building', id: 'theMagnumOpus' } as const;
    const ordinary = { kind: 'building', id: 'granary' } as const;
    const modifiers = (city: typeof fourth, toward: typeof opus | typeof ordinary) =>
      productionModifiers(state, city, toward).filter((line) => line.card === card).map((line) => line.percent);
    expect(commissionProgress(state, 0, card)[0]).toMatchObject({ have: 3, need: 4, met: false });
    expect(runCommissions(state)).toEqual([]);
    expect(modifiers(fourth, opus)).toEqual([]);

    fourth.population = 20;
    bumpRevision(state);
    expect(commissionProgress(state, 0, card)[0]).toMatchObject({ have: 4, need: 4, met: true });
    expect(runCommissions(state).map((report) => report.card)).toEqual([card]);
    expect(state.players[0]!.statecraft.slots[chair]).toBeNull();
    expect(slotOrderError(state, 0, card, chair)).toMatch(/fulfilled/);
    fourth.population = 18;
    state.turn += 1;
    bumpRevision(state);
    expect(runCommissions(state)).toEqual([]);
    expect(modifiers(fourth, opus)).toEqual([40]);
    expect(modifiers(fourth, ordinary)).toEqual([]);
    expect(modifiers(rival, opus)).toEqual([]);
  });

  it('prices the growth of four separate towns before offering a chair to The Master Plan', () => {
    const state = bareState(30, 12);
    const towns = [3, 9, 15, 21].map((col) => foundCityAt(state, 0, at(state, col, 5)));
    const player = state.players[0]!;
    const card = 'theMasterPlan';
    player.statecraft.orders.push(card);
    towns[0]!.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    for (const town of towns) town.population = 10;
    bumpRevision(state);
    const far = explainCommission(card, valueContext(state, player))!.total;

    for (const town of towns) {
      town.population = 19;
      town.foodBasket = growthThreshold(town.population);
    }
    bumpRevision(state);
    const near = valueContext(state, player);
    expect(commissionProgress(state, 0, card)[0]).toMatchObject({ have: 0, need: 4, met: false });
    expect(explainCommission(card, near)!.total).toBeGreaterThan(far);
    expect(explainCommissionChair(card, near)!.total).toBe(0);
  });
});

describe('Generic Order effects', () => {
  it('adds food only to worked resource tiles in the capital', () => {
    const state = bareState();
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const other = foundCityAt(state, 0, at(state, 8, 5));
    const capitalWheat = at(state, 3, 4);
    const unworkedWheat = at(state, 2, 5);
    const otherWheat = at(state, 8, 4);
    capitalWheat.resource = 'wheat';
    unworkedWheat.resource = 'wheat';
    otherWheat.resource = 'wheat';
    capital.workedTiles = [capitalWheat, at(state, 4, 5)];
    other.workedTiles = [otherWheat];
    seatOrders(state, 'theHomeFields');

    const capitalFood = explainCity(state, capital).lines.filter((line) => line.card === 'theHomeFields');
    const otherFood = explainCity(state, other).lines.filter((line) => line.card === 'theHomeFields');
    expect(capitalFood.map((line) => line.food)).toEqual([1]);
    expect(otherFood).toEqual([]);
  });

  it('grants culture when a worker improves a visible resource', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 3, 5));
    at(state, 3, 4).resource = 'wheat';
    const resourceWorker = createUnit(state, 0, 'worker', 3, 4);
    const plainWorker = createUnit(state, 0, 'worker', 4, 5);
    const player = state.players[0]!;
    seatOrders(state, 'firstFruitsFeasts');
    const before = player.culturePool;

    expect(applyCommand(state, {
      type: 'buildImprovement', playerId: 0, unitId: plainWorker.id, improvement: 'farm',
    })).toMatchObject({ ok: true });
    expect(player.culturePool).toBe(before);
    expect(applyCommand(state, {
      type: 'buildImprovement', playerId: 0, unitId: resourceWorker.id, improvement: 'farm',
    })).toMatchObject({ ok: true });
    expect(player.culturePool).toBe(before + 5);
  });

  it('counts citizens across the empire and pays only where the Magnum Opus is first in the queue', () => {
    const state = bareState(20, 10);
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const opusTown = foundCityAt(state, 0, at(state, 8, 5));
    const rival = foundCityAt(state, 1, at(state, 13, 5));
    capital.population = 5;
    opusTown.population = 4;
    rival.population = 20;
    const opus = { kind: 'building', id: 'theMagnumOpus' } as const;
    opusTown.queue = [opus];
    seatOrders(state, 'theGrandDesign', 'theLastWalls');

    const production = () => explainCardCityYields(state, opusTown)
      .filter((line) => line.card === 'theGrandDesign')
      .map((line) => line.production);
    const defence = () => cardCityStat(state, opusTown, 'defense')
      .filter((line) => line.card === 'theLastWalls')
      .map((line) => line.amount);
    expect(production()).toEqual([4]);
    expect(defence()).toEqual([15]);
    expect(explainCardCityYields(state, capital).some((line) => line.card === 'theGrandDesign')).toBe(false);
    expect(cardCityStat(state, capital, 'defense').some((line) => line.card === 'theLastWalls')).toBe(false);

    opusTown.queue = [{ kind: 'building', id: 'granary' }, opus];
    bumpRevision(state);
    expect(production()).toEqual([]);
    expect(defence()).toEqual([]);
  });

  it('subtracts strength from Light Kit units on attack and defence', () => {
    const state = bareState();
    const own = createUnit(state, 0, 'warrior', 3, 5);
    const rival = createUnit(state, 1, 'warrior', 4, 5);
    seatOrders(state, 'lightKit');

    const attack = previewCombat(state, own.id, rival);
    const defence = previewCombat(state, rival.id, own);
    expect(attack).toMatchObject({
      ok: true,
      attackerLines: expect.arrayContaining([{ source: 'Order · Light Kit', amount: -2 }]),
    });
    expect(defence).toMatchObject({
      ok: true,
      defenderLines: expect.arrayContaining([{ source: 'Order · Light Kit', amount: -2 }]),
    });
  });
});

describe('The General Summons', () => {
  it('raises three free units through the ordinary placement rules', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 3, 5));
    const player = state.players[0]!;
    const type = bestMeleeFor(state, 0)!;
    player.statecraft.pendingOrder = { options: ['theGeneralSummons'] };
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    const units = state.units.filter((unit) => unit.ownerId === 0);
    expect(units).toHaveLength(3);
    expect(units.every((unit) => unit.type === type && unit.freeUpkeep === true)).toBe(true);
    expect(new Set(units.map((unit) => `${unit.col},${unit.row}`)).size).toBe(3);
  });

  it.each([0, 1])('fills only the %i free spaces beside a crowded capital', (freeSpaces) => {
    const state = bareState();
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const type = bestMeleeFor(state, 0)!;
    let tile = spawnTileFor(state, capital, type);
    while (tile) {
      createUnit(state, 0, type, tile.col, tile.row);
      tile = spawnTileFor(state, capital, type);
    }
    const available = state.units.splice(state.units.length - freeSpaces);
    const before = state.units.length;
    const player = state.players[0]!;
    player.statecraft.pendingOrder = { options: ['theGeneralSummons'] };
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    const raised = state.units.slice(before);
    expect(raised.map(({ col, row }) => [col, row])).toEqual(available.map(({ col, row }) => [col, row]));
    expect(raised.every((unit) => unit.freeUpkeep === true)).toBe(true);
    expect(player.statecraft.orders).toContain('theGeneralSummons');
  });

  it('grants no units when there is no capital', () => {
    const state = bareState();
    const player = state.players[0]!;
    player.statecraft.pendingOrder = { options: ['theGeneralSummons'] };
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(state.units.filter((unit) => unit.ownerId === 0)).toHaveLength(0);
  });
});
