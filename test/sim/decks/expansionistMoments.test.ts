/**
 * **The Expansionist moments, records and counts** (batch E2 of
 * `docs/plans/expansionist-build-triage.md`). `expansionist.test.ts` checks the
 * rows against the sheet; this file checks what the cards do:
 *
 *   · a town's largest size: written at the founding, raised by any gain, never
 *     lowered (the triage's reading 6). The Grain Census counts each citizen
 *     past the record, and The Freedom of the City pays the first time a town
 *     reaches fifteen and twenty citizens (reading 7);
 *   · The Topping Out's production for a finished wonder, from the town's size
 *     on the completion (reading 16);
 *   · The Tax Rolls' gold for every census (reading 17);
 *   · The Opening of the Roads' production for a town first joined to its
 *     capital by road, once for each owner, with nothing paid for the past
 *     (reading 18);
 *   · The Great Colonies' founding size (reading 14);
 *   · The Book of Settlements' count of towns founded;
 *   · the three Opus cards' count of towns a scope admits (reading 19);
 *   · the words of all ten.
 */

import { describe, expect, it } from 'vitest';

import { runCensus } from '../../../src/sim/census';
import {
  foundCityAt,
  growthThreshold,
  loseCitizen,
  realiseItem,
  refreshCityDerived,
  settleGrowth,
  settlePopulationWindfall,
} from '../../../src/sim/cities';
import { runRoadJoinings } from '../../../src/sim/roadJoinings';
import { layRoad } from '../../../src/sim/roads';
import {
  type City,
  type GameState,
  addBuilding,
  bumpRevision,
  playerById,
} from '../../../src/sim/state';
import {
  cardProduction,
  countOf,
  describeCard,
  explainCardCityYields,
  explainCardEmpireYields,
  explainCardPercentYields,
  foldCardYields,
  stripRefs,
  tallyOf,
} from '../../../src/sim/statecraft';
import { type OrderId } from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/**
 * One town of the given size on the bare board, with an empty queue and a
 * record equal to its size, as a town that grew there would have.
 */
function town(state: GameState, col: number, row: number, population: number, owner = 0): City {
  const city = foundCityAt(state, owner, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Grows the town by one through the growth routine, with a basket that covers it. */
function grow(state: GameState, city: City): void {
  city.foodBasket = growthThreshold(city.population);
  expect(settleGrowth(state, city)).not.toBeNull();
}

const said = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));

describe('the Expansionist batch E2: a town\'s largest size', () => {
  it('starts at the founding size and rises with any gain, but not when a lost citizen is regrown', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 3, 3));
    expect(city.largestSize).toBe(1);
    grow(state, city);
    expect(city.largestSize).toBe(2);
    // A famine or a levy takes a citizen and leaves the record alone.
    loseCitizen(state, city);
    expect(city.population).toBe(1);
    expect(city.largestSize).toBe(2);
    grow(state, city);
    expect(city.largestSize).toBe(2);
    settlePopulationWindfall(state, city, 2);
    expect(city.population).toBe(4);
    expect(city.largestSize).toBe(4);
  });

  it('The Grain Census counts each citizen past the record, only while seated, and pays from +2', () => {
    const state = bareState();
    const home = town(state, 3, 3, 4);
    const sc = playerById(state, 0)!.statecraft;
    const counted = (): number => tallyOf(sc, 'theGrainCensus' as OrderId);
    const gold = (): number => foldCardYields(explainCardEmpireYields(state, 0)).gold;
    const production = (): number =>
      explainCardCityYields(state, home).reduce((sum, line) => sum + line.production, 0);
    slot(state, 0, 'theGrainCensus');
    expect(gold()).toBe(2);
    expect(production()).toBe(2);
    grow(state, home);
    expect(counted()).toBe(1);
    // Lost and regrown: not past the record.
    loseCitizen(state, home);
    grow(state, home);
    expect(counted()).toBe(1);
    // Two citizens at once past the record count twice.
    settlePopulationWindfall(state, home, 2);
    expect(counted()).toBe(3);
    bumpRevision(state);
    expect(gold()).toBe(5);
    expect(production()).toBe(5);
    // On the bench it watches nothing, and keeps what it counted.
    sc.slots = [];
    bumpRevision(state);
    grow(state, home);
    expect(home.largestSize).toBe(8);
    expect(counted()).toBe(3);
  });

  it('counts a citizen coming home from a levy when it takes the town past its record', () => {
    const state = bareState();
    const home = town(state, 3, 3, 6);
    slot(state, 0, 'theGrainCensus');
    const sc = playerById(state, 0)!.statecraft;
    loseCitizen(state, home);
    grow(state, home);
    expect(tallyOf(sc, 'theGrainCensus' as OrderId)).toBe(0);
    // The Mit'a's return: no growth riders, but the record still rises.
    settlePopulationWindfall(state, home, 1, { riders: false });
    expect(home.population).toBe(7);
    expect(tallyOf(sc, 'theGrainCensus' as OrderId)).toBe(1);
  });

  it('The Freedom of the City pays the first time a town reaches fifteen, and again at twenty', () => {
    const state = bareState();
    slot(state, 0, 'theFreedomOfTheCity');
    const city = town(state, 3, 3, 14);
    city.hammerBasket = 0;
    grow(state, city);
    expect(city.population).toBe(15);
    expect(city.hammerBasket).toBe(40 * 15);
    // Lost and regrown: the town has already reached fifteen.
    loseCitizen(state, city);
    grow(state, city);
    expect(city.hammerBasket).toBe(40 * 15);
    // Sixteen to nineteen pay nothing; twenty pays forty times twenty.
    settlePopulationWindfall(state, city, 5);
    expect(city.population).toBe(20);
    expect(city.hammerBasket).toBe(40 * 15 + 40 * 20);
  });

  it('The Freedom of the City pays at fifteen when a grant takes a town from fourteen to sixteen', () => {
    const state = bareState();
    slot(state, 0, 'theFreedomOfTheCity');
    const city = town(state, 3, 3, 14);
    city.hammerBasket = 0;
    settlePopulationWindfall(state, city, 2);
    expect(city.population).toBe(16);
    expect(city.hammerBasket).toBe(40 * 15);
  });
});

describe('the Expansionist batch E2: completions, censuses and roads', () => {
  it('The Topping Out pays twenty times the town\'s size for a wonder, and nothing for a building', () => {
    const basket = (withCard: boolean, building: 'pyramids' | 'granary'): number => {
      const state = bareState();
      if (withCard) slot(state, 0, 'theToppingOut');
      const city = town(state, 3, 3, 6);
      city.hammerBasket = 0;
      realiseItem(state, city, { kind: 'building', id: building });
      return city.hammerBasket;
    };
    expect(basket(true, 'pyramids') - basket(false, 'pyramids')).toBe(20 * 6);
    expect(basket(true, 'granary') - basket(false, 'granary')).toBe(0);
  });

  it('The Tax Rolls pays five gold a citizen on a census, to the empire holding it alone', () => {
    const state = bareState(16, 10);
    slot(state, 0, 'theTaxRolls');
    town(state, 2, 2, 5);
    town(state, 8, 6, 3);
    town(state, 13, 2, 4, 1);
    const ours = playerById(state, 0)!;
    const theirs = playerById(state, 1)!;
    const before = [ours.gold, theirs.gold];
    state.turn = state.census!.nextTurn;
    runCensus(state);
    expect(ours.gold - before[0]!).toBe(5 * 8);
    expect(theirs.gold - before[1]!).toBe(0);
  });

  it('The Opening of the Roads pays once, the first time the road joins a town to the capital', () => {
    const state = bareState(16, 10);
    slot(state, 0, 'theOpeningOfTheRoads');
    town(state, 2, 4, 3);
    const other = town(state, 8, 4, 4);
    other.hammerBasket = 0;
    runRoadJoinings(state);
    expect(other.joinedBy).toBeUndefined();
    expect(other.hammerBasket).toBe(0);
    for (let col = 3; col <= 7; col++) layRoad(at(state, col, 4), 0);
    bumpRevision(state);
    runRoadJoinings(state);
    expect(other.joinedBy).toEqual([0]);
    expect(other.hammerBasket).toBe(20 * 4);
    runRoadJoinings(state);
    expect(other.hammerBasket).toBe(20 * 4);
  });

  it('records every joining with or without the card, so a card seated later pays nothing for the past', () => {
    const state = bareState(16, 10);
    town(state, 2, 4, 3);
    const other = town(state, 8, 4, 4);
    other.hammerBasket = 0;
    for (let col = 3; col <= 7; col++) layRoad(at(state, col, 4), 0);
    bumpRevision(state);
    runRoadJoinings(state);
    expect(other.joinedBy).toEqual([0]);
    slot(state, 0, 'theOpeningOfTheRoads');
    runRoadJoinings(state);
    expect(other.hammerBasket).toBe(0);
  });

  it('pays a town\'s new owner once when the town is joined to that owner\'s capital', () => {
    const state = bareState(16, 10);
    slot(state, 1, 'theOpeningOfTheRoads');
    town(state, 2, 4, 3);
    const other = town(state, 8, 4, 4);
    town(state, 14, 4, 3, 1);
    for (let col = 3; col <= 7; col++) layRoad(at(state, col, 4), 0);
    for (let col = 9; col <= 13; col++) layRoad(at(state, col, 4), 1);
    bumpRevision(state);
    runRoadJoinings(state);
    expect(other.joinedBy).toEqual([0]);
    // The town is taken, as `captureCity` would leave it.
    other.ownerId = 1;
    other.captured = true;
    other.hammerBasket = 0;
    bumpRevision(state);
    runRoadJoinings(state);
    expect(other.joinedBy).toEqual([0, 1]);
    expect(other.hammerBasket).toBe(20 * 4);
  });
});

describe('the Expansionist batch E2: founding and the counts', () => {
  it('The Great Colonies starts a town at a third of the largest town, and The Seed Grain adds one', () => {
    const state = bareState(16, 10);
    slot(state, 0, 'theGreatColonies');
    town(state, 2, 2, 10);
    const first = foundCityAt(state, 0, at(state, 9, 6));
    expect(first.population).toBe(3);
    expect(first.largestSize).toBe(3);
    slot(state, 0, 'theSeedGrain');
    const second = foundCityAt(state, 0, at(state, 13, 2));
    expect(second.population).toBe(4);
  });

  it('The Great Colonies never starts a town smaller than usual', () => {
    const state = bareState(16, 10);
    slot(state, 0, 'theGreatColonies');
    town(state, 2, 2, 2);
    expect(foundCityAt(state, 0, at(state, 9, 6)).population).toBe(1);
  });

  it('The Book of Settlements pays 3% for every town founded, at most 30%', () => {
    const state = bareState(16, 10);
    slot(state, 0, 'theBookOfSettlements');
    const home = town(state, 2, 2, 3);
    const percent = (voice: string): number =>
      explainCardPercentYields(state, home)
        .filter((line) => line.yield === voice)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent('production')).toBe(3);
    expect(percent('gold')).toBe(3);
    town(state, 8, 6, 2);
    town(state, 13, 2, 2);
    expect(percent('production')).toBe(9);
    // A town lost still counts: the record is of towns founded.
    playerById(state, 0)!.citiesFounded = 14;
    bumpRevision(state);
    expect(percent('gold')).toBe(30);
  });

  it('counts the towns a scope admits for the three Opus cards, the capital never joined to itself', () => {
    // The Land's Great Work is retired since batch E7. A save may still hold it,
    // so the row is seated directly (the themes triage's reading 7).
    const state = bareState(20, 10);
    slot(state, 0, 'theLandsGreatWork');
    slot(state, 0, 'theGreatAqueducts');
    slot(state, 0, 'theImperialHighways');
    const capital = town(state, 2, 4, 9);
    const second = town(state, 8, 4, 8);
    const third = town(state, 14, 4, 3);
    const percent = (card: string): number =>
      cardProduction(state, capital, 'building', undefined, 'theMagnumOpus')
        .filter((line) => line.card === card)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent('theLandsGreatWork')).toBe(10);
    expect(percent('theGreatAqueducts')).toBe(0);
    expect(percent('theImperialHighways')).toBe(0);
    addBuilding(state, second, 'aqueduct');
    addBuilding(state, third, 'aqueduct');
    bumpRevision(state);
    expect(percent('theGreatAqueducts')).toBe(10);
    for (let col = 3; col <= 7; col++) layRoad(at(state, col, 4), 0);
    bumpRevision(state);
    expect(percent('theImperialHighways')).toBe(3);
    // A row that names no scope counts nothing.
    expect(
      countOf(state, 0, 'theGreatAqueducts' as OrderId, {
        kind: 'pays',
        where: 'empire',
        basis: 'count',
        count: 'citiesAdmitted',
      }),
    ).toBe(0);
  });
});

describe('the Expansionist batch E2: the words', () => {
  it('prints all ten cards in plain words', () => {
    expect(said('theGrainCensus')).toEqual([
      '+2 gold to the empire',
      '+2 production in your capital',
      '+1 gold per citizen your cities have grown past their largest size, counted while this Order stands in a slot',
      '+1 production in your capital per citizen your cities have grown past their largest size, counted while this Order stands in a slot',
    ]);
    expect(said('theBookOfSettlements')).toEqual([
      '+3% production per city you have founded this game (at most +30% production)',
      '+3% gold per city you have founded this game (at most +30% gold)',
    ]);
    expect(said('theFreedomOfTheCity')).toEqual([
      'a city reaching 15 citizens for the first time grants production equal to 40 times its population',
      'a city reaching 20 citizens for the first time grants production equal to 40 times its population',
    ]);
    expect(said('theToppingOut')).toEqual([
      "completing a wonder grants production equal to 20 times the city's population",
    ]);
    expect(said('theTaxRolls')).toEqual([
      'the world taking a census grants gold equal to 5 times your citizens',
    ]);
    expect(said('theOpeningOfTheRoads')).toEqual([
      'a city being joined to your capital by road for the first time grants production equal to 20 times its population',
    ]);
    expect(said('theGreatColonies')).toEqual([
      'new cities start with a third of the citizens of your largest city, rounded down',
    ]);
    expect(said('theLandsGreatWork')).toEqual([
      '+5% production toward The Magnum Opus per city of 8 or more citizens (at most +40%)',
    ]);
    expect(said('theGreatAqueducts')).toEqual([
      '+5% production toward The Magnum Opus per city with an Aqueduct (at most +40%)',
    ]);
    expect(said('theImperialHighways')).toEqual([
      '+3% production toward The Magnum Opus per city joined to your capital by road (at most +45%)',
    ]);
  });
});
