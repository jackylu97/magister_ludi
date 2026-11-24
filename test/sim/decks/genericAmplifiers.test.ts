import { describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { explainCardEffects } from '../../../src/ai/value';
import { foundCityAt } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { layRoad } from '../../../src/sim/roads';
import { addBuilding, bumpRevision, type GameState } from '../../../src/sim/state';
import {
  cardCityRenownShares,
  cardHappiness,
  cardTypeRaises,
  cardYieldConversions,
  explainBuildingPackage,
  explainCardCityYields,
  explainCardPercentYields,
  scopedCardTileLines,
  slotTypesOf,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { orderDef, orderType, slotLayout, type OrderId } from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const LODGE = 'theBuildersLodge';
const PALACE = 'theSummerPalace';
const UNION = 'thePersonalUnion';

function board(government: 'theEstates' | 'theCuria' = 'theEstates') {
  const state = bareState(28, 14);
  const capital = foundCityAt(state, 0, at(state, 3, 5));
  const town = foundCityAt(state, 0, at(state, 9, 5));
  const village = foundCityAt(state, 0, at(state, 15, 5));
  const rival = foundCityAt(state, 1, at(state, 21, 5));
  const council = state.players[0]!.statecraft;
  council.government = government;
  council.slots = slotLayout(government).map(() => null);
  capital.population = 8;
  town.population = 6;
  village.population = 4;
  bumpRevision(state);
  return { state, capital, town, village, rival };
}

function seat(state: GameState, ...cards: OrderId[]): number[] {
  const council = state.players[0]!.statecraft;
  const chairs = slotTypesOf(council);
  return cards.map((card) => {
    const type = orderType(card);
    const slotIndex = chairs.findIndex((chair, index) => chair === type && council.slots[index] == null);
    council.orders.push(card);
    const result = applyCommand(state, { type: 'slotOrder', playerId: 0, cardId: card, slotIndex });
    expect(result.ok, result.ok ? card : `${card}: ${result.error}`).toBe(true);
    return slotIndex;
  });
}

describe('The Builders’ Lodge', () => {
  it('raises Order payments from a named building or a count, and keeps the original yield stage', () => {
    const { state, capital, town, rival } = board();
    for (const id of ['barracks', 'monument', 'forum', 'watermill'] as const) {
      addBuilding(state, capital, id);
      addBuilding(state, rival, id);
    }
    seat(state, 'dominionTheGeneralStaff', 'civicGranaries', 'theMillWheels', LODGE, 'thePalaceSchool');
    state.players[0]!.statecraft.doctrines.push('theChoregia');
    bumpRevision(state);

    const rises = explainCardCityYields(state, capital).filter((line) => line.card === LODGE);
    expect(rises.some((line) => line.production === 5 && line.source === "Order · The Builders' Lodge · The General Staff")).toBe(true);
    expect(rises.filter((line) => line.source.endsWith('Civic Granaries')).map((line) => [line.food, line.production])).toEqual([[2, 0], [0, 4]]);
    expect(rises).toHaveLength(3);
    expect(explainCardCityYields(state, capital).find((line) => line.card === 'theChoregia')?.culture).toBe(6);
    expect(explainCardCityYields(state, town).filter((line) => line.card === LODGE)).toEqual([]);
    expect(explainCardCityYields(state, rival).filter((line) => line.card === LODGE)).toEqual([]);
    expect(explainCardPercentYields(state, capital).filter((line) => line.card === LODGE)).toEqual([
      expect.objectContaining({ yield: 'production', percent: 15, stage: 'city' }),
    ]);
    expect(explainCardPercentYields(state, town).filter((line) => line.card === LODGE)).toEqual([]);

    const monument = explainBuildingPackage(state, capital, 'monument');
    expect(monument.filter((line) => line.card === LODGE)).toHaveLength(2);
    expect(monument.find((line) => line.building === 'monument')?.culture).toBe(2);
  });

  it('adds its share beside The Grand Vizier, The Personal Union and a type amplifier', () => {
    const { state, capital } = board();
    addBuilding(state, capital, 'temple');
    addBuilding(state, capital, 'monument');
    seat(state, 'civicGranaries', 'commonTheTithe', 'theGrandVizier', LODGE, UNION);
    const flat = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 20 };

    const lines = explainCardCityYields(state, capital);
    expect(lines.find((line) => line.card === LODGE && line.food > 0)?.food).toBe(1);
    expect(lines.find((line) => line.card === 'theGrandVizier')?.food).toBe(1);
    expect(cardYieldConversions(state, capital, flat).map(({ card, source, gold }) => ({ card, source, gold }))).toEqual([
      { card: 'commonTheTithe', source: 'Order · The Tithe · faith → gold', gold: 5 },
      { card: 'theEstates', source: 'Government · The Estates + Order · The Personal Union · The Tithe', gold: 4 },
      { card: LODGE, source: "Order · The Builders' Lodge · The Tithe", gold: 5 },
    ]);
  });
});

it('keeps a building completion grant at its original amount', () => {
  const { state, capital } = board('theCuria');
  seat(state, 'theApprentices', LODGE, PALACE);
  const payout = windfallPayout(state, 0, 'buildingCompletion', 0, 0, {
    hex: { col: capital.col, row: capital.row }, building: 'monument', buildingCost: 30,
  });
  expect(payout.grants).toEqual([expect.objectContaining({ card: 'theApprentices', yield: 'science', amount: 6 })]);
});

describe('The Summer Palace', () => {
  it('raises capital payments at their own step and follows The Two Capitals', () => {
    const { state, capital, town, village, rival } = board('theCuria');
    seat(state, 'theRoyalHousehold', 'theHomeFields', 'theThreshingFloor', 'theHallOfFame', 'theMotherCity', PALACE);
    const rises = (city: typeof capital) => explainCardCityYields(state, city).filter((line) => line.card === PALACE);

    expect(rises(capital).map((line) => [line.culture, line.production])).toEqual([[1.5, 0], [0, 2]]);
    expect(rises(town)).toEqual([]);
    expect(rises(rival)).toEqual([]);
    expect(scopedCardTileLines(state, capital).find((line) => line.card === PALACE)).toMatchObject({
      food: 0.5, on: { test: 'hasResource' },
    });
    expect(scopedCardTileLines(state, town).filter((line) => line.card === PALACE)).toEqual([]);
    expect(cardHappiness(state, 0).find((line) => line.source === 'Order · The Summer Palace · The Royal Household')?.amount).toBe(1);
    expect(cardCityRenownShares(state, capital).find((line) => line.card === PALACE)?.percent).toBe(15);
    expect(explainCardPercentYields(state, capital).filter((line) => line.card === PALACE).map(
      (line) => [line.yield, line.percent, line.stage],
    )).toEqual([]);

    for (let col = 4; col < 9; col++) layRoad(at(state, col, capital.row), 0);
    state.players[0]!.statecraft.doctrines.push('theTwoCapitals', 'allRoadsLeadToRome');
    bumpRevision(state);
    for (const city of [capital, town]) {
      const motherCity = rises(city).filter(line => line.source.endsWith('The Mother City'));
      expect(motherCity.map(line => [line.production, line.culture])).toEqual([[3, 0], [0, 3]]);
      expect(rises(city)).toHaveLength(4);
    }
    expect(rises(village)).toEqual([]);
    expect(cardHappiness(state, 0).find((line) => line.card === PALACE)?.amount).toBe(2);
    for (const city of [capital, town]) {
      expect(explainCardPercentYields(state, city).filter(
        (line) => line.card === PALACE && line.source.endsWith('All Roads Lead to Rome'),
      ).map((line) => [line.yield, line.percent])).toEqual([['production', 1.5], ['gold', 1.5]]);
    }
  });
});

describe('The Personal Union', () => {
  it('raises the numbers of seated shared Orders and merges the percentages before rounding', () => {
    const { state, capital } = board('theCuria');
    addBuilding(state, capital, 'library');
    addBuilding(state, capital, 'monument');
    const [chair] = seat(state, 'illuminatedTreatises', 'theBlessedForges', 'thePalaceSchool', UNION);
    state.players[0]!.statecraft.orders.push('commonTheTithe');

    const raises = cardTypeRaises(state, 0);
    expect(raises.get('illuminatedTreatises')?.percent).toBe(80);
    expect(raises.get('theBlessedForges')?.percent).toBe(80);
    expect(raises.get('thePalaceSchool')?.percent).toBe(30);
    expect(raises.has('commonTheTithe')).toBe(false);
    const rises = explainCardCityYields(state, capital).filter(
      (line) => line.source === 'Government · The Curia + Order · The Personal Union · Illuminated Treatises',
    );
    expect(rises).toEqual([expect.objectContaining({ science: 1, culture: 1 })]);
    state.turn = state.players[0]!.statecraft.slots[chair!]!.sealedUntil;
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex: chair! }).ok).toBe(true);
    expect(cardTypeRaises(state, 0).has('illuminatedTreatises')).toBe(false);
  });
});

it('prices all three Orders from eligible current payments', () => {
  const { state, capital } = board();
  const player = state.players[0]!;
  const worth = (card: OrderId) => explainCardEffects(card, orderDef(card).effects, valueContext(state, player)).total;
  player.statecraft.orders.push('thePalaceSchool', 'illuminatedTreatises');
  bumpRevision(state);
  for (const card of [LODGE, PALACE, UNION] as const) expect(worth(card), card).toBe(0);

  // Use the actual commands so effects enter the bot's context the same way as a draft and seating.
  player.statecraft.orders = [];
  addBuilding(state, capital, 'monument');
  seat(state, 'thePalaceSchool', 'illuminatedTreatises');
  for (const card of [LODGE, PALACE, UNION] as const) expect(worth(card), card).toBeGreaterThan(0);
});
