import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../../src/sim/cities';
import { explainAuthority, explainHappiness, happinessOf, meterEffects } from '../../../src/sim/meters';
import { addBuilding, bumpRevision, type City, type GameState } from '../../../src/sim/state';
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import { doctrineDef, orderDef, type OrderId } from '../../../src/sim/statecraftData';
import { explainCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

function seat(state: GameState, card: OrderId): void {
  const council = state.players[0]!.statecraft;
  council.orders.push(card);
  council.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

function town(state: GameState, col: number, population: number): City {
  const city = foundCityAt(state, 0, at(state, col, 4));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  bumpRevision(state);
  return city;
}

const said = (card: OrderId): string => describeCard(card).map(({ text }) => stripRefs(text)).join('. ');

describe('the Scientific great-city cards', () => {
  it('Reading Rooms counts each Library town separately and pays no town without a Library', () => {
    const state = bareState(22, 10);
    const small = town(state, 3, 4);
    const large = town(state, 10, 14);
    town(state, 17, 15);
    addBuilding(state, small, 'library');
    addBuilding(state, large, 'library');
    seat(state, 'theReadingRooms');
    const paid = (): number => explainHappiness(state, 0)
      .filter(({ card }) => card === 'theReadingRooms').reduce((sum, line) => sum + line.value, 0);
    expect(paid()).toBe(2);
    small.population = 5;
    large.population = 15;
    bumpRevision(state);
    expect(paid()).toBe(4);
    expect(orderDef('theReadingRooms')).toMatchObject({ band: 1, rarity: 'common', type: 'civic' });
    expect(said('theReadingRooms')).toContain('Library');
  });

  it('Garden of Epicurus removes only the positive happiness cap and composes with Good Years', () => {
    const state = bareState();
    town(state, 3, 1);
    const player = state.players[0]!;
    const original = happinessOf(state, 0);
    const setHappiness = (target: number, points = 0): void => {
      player.timed = [
        { card: 'theRoyalHousehold', effect: { kind: 'happiness', amount: target - original }, expiresTurn: 10 },
        { card: 'theRoyalHousehold', effect: { kind: 'happinessTierBoost', points }, expiresTurn: 10 },
      ];
      bumpRevision(state);
      expect(happinessOf(state, 0)).toBe(target);
    };
    const bonus = () => meterEffects(state, 0).find(({ meter, growth }) => meter === 'happiness' && !growth);
    setHappiness(25);
    expect(bonus()?.percent).toBe(20);
    seat(state, 'theGardenOfEpicurus');
    expect(bonus()?.percent).toBe(50);
    seat(state, 'theGoodYears');
    expect(bonus()?.percent).toBe(100);
    setHappiness(25, 5);
    expect(bonus()?.percent).toBe(110);
    setHappiness(4);
    expect(bonus()).toBeUndefined();
    setHappiness(-10);
    expect(bonus()).toMatchObject({ percent: -20, yields: ['gold', 'science', 'culture', 'faith'] });
    expect(meterEffects(state, 0).find(({ meter, growth }) => meter === 'happiness' && growth)?.percent).toBe(-100);
    expect(said('theGardenOfEpicurus')).toContain('no upper limit');
  });

  it('Hippodamian Plan reduces demand at ten citizens and charges only founded towns extra authority', () => {
    const state = bareState(22, 10);
    const capital = town(state, 3, 9);
    const founded = town(state, 10, 10);
    const captured = town(state, 17, 10);
    captured.captured = true;
    bumpRevision(state);
    const authorityCost = (city: City): number => explainAuthority(state, 0)
      .filter(({ source, part }) => part === 'cost' && source.startsWith(city.name)).reduce((sum, line) => sum + line.value, 0);
    const foundedBefore = authorityCost(founded);
    const capturedBefore = authorityCost(captured);
    state.players[0]!.statecraft.doctrines.push('theHippodamianPlan');
    bumpRevision(state);
    const demand = (city: City): number => explainHappiness(state, 0)
      .find(({ source }) => source === `${city.name} · ${city.population} citizens`)!.value;
    expect(demand(capital)).toBe(-9);
    expect(demand(founded)).toBe(-7);
    expect(demand(captured)).toBe(-7);
    expect(authorityCost(founded)).toBe(foundedBefore - 1);
    expect(authorityCost(captured)).toBe(capturedBefore);
    expect(doctrineDef('theHippodamianPlan').band).toBe(2);
  });

  it('the Great Archive pays for held charters from other decks before their research completes', () => {
    const state = bareState();
    const capital = town(state, 3, 1);
    addBuilding(state, capital, 'greatArchive');
    const council = state.players[0]!.statecraft;
    council.orders.push('theHerbalistsCharter', 'theObserversCharter', 'theReadingRooms');
    bumpRevision(state);
    const science = explainCity(state, capital).lines.filter(({ source }) => source.includes('Great Archive'))
      .reduce((sum, line) => sum + line.science, 0);
    expect(science).toBe(10);
  });
});
