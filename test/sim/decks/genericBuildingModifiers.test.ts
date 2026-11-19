import { describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { scoreEffects } from '../../../src/ai/value';
import type { BuildingId } from '../../../src/sim/buildingData';
import { foundCityAt } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { explainEmpireGold } from '../../../src/sim/empireGold';
import { explainDeckLedger } from '../../../src/sim/ledgerFold';
import { explainHappiness, happinessOf, meterEffects } from '../../../src/sim/meters';
import { addBuilding, bumpRevision, capitalCityOf, createUnit, type City, type GameState } from '../../../src/sim/state';
import { secondCapitalCity, slotTypesOf } from '../../../src/sim/statecraft';
import { orderDef, type OrderId } from '../../../src/sim/statecraftData';
import { TECH_IDS, techDef, type TechAge } from '../../../src/sim/techData';
import { buildingUpkeepFor } from '../../../src/sim/upkeep';
import { explainEmpireLines } from '../../../src/sim/yields/empire';
import { productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

const EXAMPLE = 'theCapitalsExample';
const PATTERNS = 'theOldPatterns';
const FOUNDATIONS = 'theOldFoundations';
const GOOD_YEARS = 'theGoodYears';

function seat(state: GameState, card: OrderId, playerId = 0): number {
  const council = state.players[playerId]!.statecraft;
  const type = orderDef(card).type;
  const types = slotTypesOf(council);
  let chair = types.findIndex((entry, index) => entry === type && council.slots[index] == null);
  if (chair < 0) chair = types.findIndex((entry, index) => entry === 'wildcard' && council.slots[index] == null);
  council.orders.push(card);
  expect(applyCommand(state, { type: 'slotOrder', playerId, cardId: card, slotIndex: chair }).ok).toBe(true);
  return chair;
}

function price(state: GameState, card: OrderId): number {
  return scoreEffects(orderDef(card).effects, valueContext(state, state.players[0]!));
}

function buildings(state: GameState, city: City, ...ids: BuildingId[]): void {
  for (const id of ids) addBuilding(state, city, id);
}

function studyThrough(state: GameState, age: TechAge): void {
  state.players[0]!.techsResearched = TECH_IDS.filter((tech) => techDef(tech).age <= age);
  bumpRevision(state);
}

describe('The Capital’s Example', () => {
  it('uses the true capital under The Two Capitals and checks its buildings after a capture', () => {
    const state = bareState(30, 12);
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    buildings(state, capital, 'library', 'pyramids');
    expect(price(state, EXAMPLE)).toBe(0);
    const second = foundCityAt(state, 0, at(state, 9, 5));
    const third = foundCityAt(state, 0, at(state, 15, 5));
    second.population = 6;
    buildings(state, second, 'market');
    state.players[0]!.statecraft.doctrines.push('theTwoCapitals');
    bumpRevision(state);
    expect(secondCapitalCity(state, 0)).toBe(second);
    expect(price(state, EXAMPLE)).toBeGreaterThan(0);
    seat(state, EXAMPLE);

    const bonus = (city: City, id: BuildingId) =>
      productionModifiers(state, city, { kind: 'building', id }).filter((line) => line.card === EXAMPLE);
    expect(bonus(capital, 'library')).toEqual([]);
    expect(bonus(second, 'library')).toMatchObject([{ percent: 25, stage: 'city' }]);
    expect(bonus(third, 'market')).toEqual([]);
    expect(bonus(third, 'pyramids')).toEqual([]);
    expect(productionModifiers(state, third, { kind: 'project', id: 'tithes' })).toEqual([]);

    capital.hp = 1;
    const rival = createUnit(state, 1, 'warrior', 4, 5);
    expect(applyCommand(state, {
      type: 'attack', playerId: 1, unitId: rival.id, target: { col: capital.col, row: capital.row },
    })).toMatchObject({ ok: true });
    expect(capital.ownerId).toBe(1);
    expect(capitalCityOf(state, 0)).toBe(second);
    expect(bonus(third, 'library')).toEqual([]);
    expect(bonus(third, 'market')).toMatchObject([{ percent: 25, stage: 'city' }]);
  });
});

describe('The Old Patterns', () => {
  it('uses research age, excludes wonders and buildings with no unlocking technology, and adds the capital bonus', () => {
    const state = bareState();
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const town = foundCityAt(state, 0, at(state, 8, 5));
    buildings(state, capital, 'library');
    studyThrough(state, 1);
    expect(price(state, PATTERNS)).toBe(0);
    seat(state, PATTERNS);
    seat(state, EXAMPLE);

    const bonuses = (id: BuildingId) =>
      productionModifiers(state, town, { kind: 'building', id }).filter((line) =>
        line.card === PATTERNS || line.card === EXAMPLE,
      ).map(({ card, percent, stage }) => ({ card, percent, stage }));
    expect(bonuses('library')).toEqual([{ card: EXAMPLE, percent: 25, stage: 'city' }]);

    studyThrough(state, 2);
    expect(price(state, PATTERNS)).toBeGreaterThan(0);
    expect(bonuses('library')).toEqual(expect.arrayContaining([
      { card: EXAMPLE, percent: 25, stage: 'city' },
      { card: PATTERNS, percent: 40, stage: 'city' },
    ]));
    expect(bonuses('market')).toEqual([]);

    studyThrough(state, 3);
    expect(bonuses('market')).toEqual([{ card: PATTERNS, percent: 40, stage: 'city' }]);
    for (const id of ['publicBath', 'cistern', 'pyramids', 'theMagnumOpus'] as const) {
      expect(bonuses(id)).toEqual([]);
    }
    expect(productionModifiers(state, town, { kind: 'unit', id: 'warrior' })
      .some(({ card }) => card === PATTERNS)).toBe(false);
  });
});

describe('The Old Foundations', () => {
  it('rebates age I and II upkeep on the same bill and covers each building once', () => {
    const state = bareState(25, 10);
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const town = foundCityAt(state, 0, at(state, 9, 5));
    const rival = foundCityAt(state, 1, at(state, 15, 5));
    buildings(state, capital, 'granary', 'monument', 'cistern', 'pyramids', 'publicBath');
    buildings(state, rival, 'library', 'market');
    createUnit(state, 0, 'warrior', 4, 5);
    expect(price(state, FOUNDATIONS)).toBe(0);

    buildings(state, capital, 'library', 'market');
    buildings(state, town, 'library', 'smithy');
    expect(price(state, FOUNDATIONS)).toBeGreaterThan(0);
    const bills = () => explainEmpireGold(state, 0);
    const before = bills();
    const chair = seat(state, FOUNDATIONS);
    expect(bills().filter(({ card }) => card === FOUNDATIONS)).toEqual([
      { source: 'Order · The Old Foundations', card: FOUNDATIONS, gold: 6, kind: 'bill' },
    ]);
    expect(bills().filter(({ card }) => card !== FOUNDATIONS)).toEqual(before);
    expect(explainEmpireGold(state, 1).some(({ card }) => card === FOUNDATIONS)).toBe(false);
    expect(explainEmpireLines(state, 0).find(({ card }) => card === FOUNDATIONS)).toMatchObject({
      gold: 6, bill: true,
    });
    expect(explainDeckLedger(state, 0).find(({ card }) => card === FOUNDATIONS)?.paid.gold).toBe(6);
    expect(buildingUpkeepFor(state, 0, 'library')).toBe(0);
    expect(buildingUpkeepFor(state, 0, 'publicBath')).toBe(3);
    expect(buildingUpkeepFor(state, 1, 'library')).toBe(1);

    // An overlapping waiver can cover the remaining baths but never refund an old bill twice.
    state.players[0]!.timed = [{
      card: 'theRoyalHousehold',
      effect: { kind: 'upkeepRebate', buildingAgeAtMost: 3 },
      expiresTurn: state.turn + 10,
    }];
    bumpRevision(state);
    expect(bills().filter(({ card }) => card !== undefined).reduce((sum, line) => sum + line.gold, 0)).toBe(9);
    state.players[0]!.timed = [];
    state.turn = state.players[0]!.statecraft.slots[chair]!.sealedUntil;
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex: chair }).ok).toBe(true);
    expect(bills()).toEqual(before);
  });
});

describe('The Good Years', () => {
  it('doubles both science and culture bonus tiers after the cap and preserves the growth penalty', () => {
    const state = bareState();
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    buildings(state, capital, 'library', 'monument');
    const player = state.players[0]!;
    const original = happinessOf(state, 0);

    const happiness = (target: number, fixed = 0): void => {
      player.timed = [
        { card: 'theRoyalHousehold', effect: { kind: 'happiness', amount: target - original }, expiresTurn: 10 },
        { card: 'theRoyalHousehold', effect: { kind: 'happinessTierBoost', points: fixed }, expiresTurn: 10 },
      ];
      bumpRevision(state);
      expect(happinessOf(state, 0)).toBe(target);
    };
    const tier = () => meterEffects(state, 0).find(({ meter, growth }) => meter === 'happiness' && !growth);
    const stifle = () => meterEffects(state, 0).find(({ meter, growth }) => meter === 'happiness' && growth)?.percent;

    happiness(-10);
    const penalty = stifle();
    expect(penalty).toBeLessThan(0);
    const lowPrice = price(state, GOOD_YEARS);
    seat(state, GOOD_YEARS);
    expect(tier()).toBeUndefined();
    expect(stifle()).toBe(penalty);
    expect(lowPrice).toBe(0);
    happiness(4);
    expect(tier()).toBeUndefined();
    expect(price(state, GOOD_YEARS)).toBe(0);
    happiness(5);
    expect(tier()).toMatchObject({ percent: 20, yields: ['science', 'culture'] });
    const first = price(state, GOOD_YEARS);
    expect(first).toBeGreaterThan(0);
    happiness(10);
    expect(tier()).toMatchObject({ percent: 40 });
    expect(price(state, GOOD_YEARS)).toBeGreaterThan(first);
    happiness(20, 5);
    expect(tier()).toMatchObject({ percent: 50 });
    expect(explainHappiness(state, 0)).toContainEqual(expect.objectContaining({
      source: expect.stringContaining('The Good Years'), card: GOOD_YEARS, value: 0,
    }));
  });
});
