/**
 * **The Expansionist public works and empire buildings** (batch E11 of
 * `docs/plans/expansionist-themes-triage.md`). `expansionist.test.ts` checks
 * the rows against the sheet, and `expansionistMoments.test.ts` checks The
 * Topping Out's pay. This file checks the shapes the batch added:
 *
 *   · the `publicWork` marker: exactly six rows carry it, read by
 *     `isPublicWork` (reading 30);
 *   · the `publicWorkCompleted` tally: The Aediles counts each public work
 *     one of your towns finishes, built or bought, only while it is seated.
 *     A captured town's public works add nothing (reading 29);
 *   · the `publicWorks` count: The Public Good counts every public work
 *     standing in your towns, captured towns included, at most +25%
 *     (reading 31). `within: 'city'` narrows it to one town;
 *   · The Topping Out pays for an empire building bought with gold too
 *     (reading 32);
 *   · the words of the three cards.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../../src/sim/commands';
import { foundCityAt, realiseItem, refreshCityDerived } from '../../../src/sim/cities';
import {
  type BuildingId,
  BUILDING_IDS,
  isEmpireBuilding,
  isPublicWork,
  isWonder,
} from '../../../src/sim/buildingData';
import { type City, type GameState, addBuilding, bumpRevision, playerById } from '../../../src/sim/state';
import {
  countOf,
  describeCard,
  describeEffects,
  explainCardCityYields,
  explainCardEmpireYields,
  explainCardPercentYields,
  foldCardYields,
  stripRefs,
  tallyOf,
} from '../../../src/sim/statecraft';
import { type CardPaysEffect, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for this seat, at its largest size, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** A building finished in a town, as a completion leaves it. */
function finish(state: GameState, city: City, id: BuildingId): void {
  realiseItem(state, city, { kind: 'building', id });
  bumpRevision(state);
}

/** A building bought with gold through the command, with gold enough to pay. */
function buy(state: GameState, city: City, id: BuildingId): void {
  playerById(state, city.ownerId)!.gold = 100000;
  const result = applyCommand(state, {
    type: 'purchaseItem',
    playerId: city.ownerId,
    cityId: city.id,
    item: { kind: 'building', id },
    currency: 'gold',
  });
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
}

/** The town is taken, as `captureCity` would leave it. */
function takeOver(state: GameState, city: City, playerId: number): void {
  city.ownerId = playerId;
  city.captured = true;
  bumpRevision(state);
}

const said = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));

const COUNT: CardPaysEffect = { kind: 'pays', where: 'empire', basis: 'count', count: 'publicWorks' };

describe('the Expansionist batch E11: the public works', () => {
  it('marks exactly the six public works, and no wonder, empire building, Lighthouse or Workshop', () => {
    // The register (reading 30): the marker is on the rows, so a seventh row
    // marked in the data would fail here until the triage says so.
    expect(BUILDING_IDS.filter(isPublicWork)).toEqual([
      'granary',
      'aqueduct',
      'watermill',
      'harbour',
      'publicBath',
      'cistern',
    ]);
    for (const id of BUILDING_IDS.filter(isPublicWork)) {
      expect(isWonder(id), id).toBe(false);
      expect(isEmpireBuilding(id), id).toBe(false);
    }
    expect(isPublicWork('lighthouse')).toBe(false);
    expect(isPublicWork('workshop')).toBe(false);
  });
});

describe('the Expansionist batch E11: The Aediles (the publicWorkCompleted tally)', () => {
  it('starts at +2 production in the capital and +2 culture, and gains +1 of each for each public work finished', () => {
    const state = bareState(16, 10);
    const home = town(state, 3, 3, 4);
    const second = town(state, 9, 3, 3);
    slot(state, 0, 'theAediles');
    const sc = playerById(state, 0)!.statecraft;
    const counted = (): number => tallyOf(sc, 'theAediles' as OrderId);
    const culture = (): number => foldCardYields(explainCardEmpireYields(state, 0)).culture;
    const production = (city: City): number =>
      explainCardCityYields(state, city).reduce((sum, line) => sum + line.production, 0);
    expect(culture()).toBe(2);
    expect(production(home)).toBe(2);
    expect(production(second)).toBe(0);
    finish(state, home, 'granary');
    finish(state, second, 'watermill');
    expect(counted()).toBe(2);
    expect(culture()).toBe(4);
    expect(production(home)).toBe(4);
    // The production is the capital's alone.
    expect(production(second)).toBe(0);
    // A building that is not a public work counts nothing.
    finish(state, home, 'monument');
    finish(state, home, 'forum');
    expect(counted()).toBe(2);
  });

  it('counts a public work bought with gold', () => {
    const state = bareState(16, 10);
    const home = town(state, 3, 3, 4);
    slot(state, 0, 'theAediles');
    buy(state, home, 'granary');
    expect(home.buildings).toContain('granary');
    expect(tallyOf(playerById(state, 0)!.statecraft, 'theAediles' as OrderId)).toBe(1);
  });

  it('counts nothing on the bench and keeps what it counted, and counts nothing for another empire', () => {
    const state = bareState(16, 10);
    const home = town(state, 3, 3, 4);
    const rival = town(state, 13, 7, 4, 1);
    slot(state, 0, 'theAediles');
    const sc = playerById(state, 0)!.statecraft;
    finish(state, home, 'granary');
    finish(state, rival, 'granary');
    expect(tallyOf(sc, 'theAediles' as OrderId)).toBe(1);
    sc.slots = [];
    bumpRevision(state);
    finish(state, home, 'watermill');
    expect(tallyOf(sc, 'theAediles' as OrderId)).toBe(1);
  });

  it('adds nothing for the public works a captured town already holds', () => {
    const state = bareState(16, 10);
    town(state, 3, 3, 4);
    const taken = town(state, 13, 7, 4, 1);
    addBuilding(state, taken, 'granary');
    addBuilding(state, taken, 'watermill');
    bumpRevision(state);
    slot(state, 0, 'theAediles');
    takeOver(state, taken, 0);
    expect(tallyOf(playerById(state, 0)!.statecraft, 'theAediles' as OrderId)).toBe(0);
  });
});

describe('the Expansionist batch E11: The Public Good (the publicWorks count)', () => {
  it('counts the public works standing in your towns, for the empire or for one town', () => {
    const state = bareState(16, 10);
    const home = town(state, 3, 3, 4);
    const second = town(state, 9, 3, 3);
    const rival = town(state, 13, 7, 4, 1);
    addBuilding(state, home, 'granary');
    addBuilding(state, home, 'monument');
    addBuilding(state, second, 'watermill');
    addBuilding(state, second, 'publicBath');
    addBuilding(state, rival, 'granary');
    bumpRevision(state);
    const card = 'thePublicGood' as OrderId;
    expect(countOf(state, 0, card, COUNT)).toBe(3);
    expect(countOf(state, 0, card, { ...COUNT, within: 'city' }, home)).toBe(1);
    expect(countOf(state, 0, card, { ...COUNT, within: 'city' }, second)).toBe(2);
    // A town-narrowed count with no town in hand counts nothing.
    expect(countOf(state, 0, card, { ...COUNT, within: 'city' })).toBe(0);
    // Pay follows the stones: a captured town's public works count for its new owner.
    takeOver(state, rival, 0);
    expect(countOf(state, 0, card, COUNT)).toBe(4);
    expect(countOf(state, 1, card, COUNT)).toBe(0);
  });

  it('pays +1% science and culture at the empire stage for each public work, at most +25%', () => {
    const state = bareState(20, 12);
    slot(state, 0, 'thePublicGood');
    const home = town(state, 2, 2, 4);
    const percent = (voice: string): number =>
      explainCardPercentYields(state, home)
        .filter((line) => line.card === 'thePublicGood' && line.yield === voice)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent('science')).toBe(0);
    addBuilding(state, home, 'granary');
    addBuilding(state, home, 'aqueduct');
    bumpRevision(state);
    expect(percent('science')).toBe(2);
    expect(percent('culture')).toBe(2);
    expect(percent('production')).toBe(0);
    for (const line of explainCardPercentYields(state, home)) {
      if (line.card === 'thePublicGood') expect(line.stage).toBe('empire');
    }
    // Five towns of six public works are thirty, and the card stops at 25.
    const works = BUILDING_IDS.filter(isPublicWork);
    const others = [town(state, 8, 2, 3), town(state, 14, 2, 3), town(state, 2, 8, 3), town(state, 8, 8, 3)];
    for (const city of [home, ...others]) {
      for (const id of works) {
        if (!city.buildings.includes(id)) addBuilding(state, city, id);
      }
    }
    bumpRevision(state);
    expect(countOf(state, 0, 'thePublicGood' as OrderId, COUNT)).toBe(30);
    expect(percent('science')).toBe(25);
    expect(percent('culture')).toBe(25);
  });
});

describe('the Expansionist batch E11: The Topping Out, bought', () => {
  it('pays every town for an empire building bought with gold', () => {
    const baskets = (withCard: boolean): number[] => {
      const state = bareState(16, 10);
      if (withCard) slot(state, 0, 'theToppingOut');
      const home = town(state, 3, 3, 4);
      const far = town(state, 9, 3, 2);
      for (const city of [home, far]) city.hammerBasket = 0;
      buy(state, home, 'forum');
      return [home.hammerBasket, far.hammerBasket];
    };
    const withCard = baskets(true);
    const without = baskets(false);
    expect(withCard.map((value, index) => value - without[index]!)).toEqual([5 * 4, 5 * 2]);
  });
});

describe('the Expansionist batch E11: the rows', () => {
  it('deals both new cards, as Civic Orders', () => {
    for (const id of ['theAediles', 'thePublicGood'] as OrderId[]) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(orderDef(id).type, id).toBe('civic');
    }
    expect(orderDef('theAediles' as OrderId).band).toBe(1);
    expect(orderDef('thePublicGood' as OrderId).band).toBe(4);
  });

  it('says what each does in plain words', () => {
    expect(said('theAediles')).toEqual([
      '+2 culture to the empire',
      '+2 production in your capital',
      '+1 culture per public work you have finished, counted while this Order stands in a slot',
      '+1 production in your capital per public work you have finished, counted while this Order stands in a slot',
    ]);
    expect(said('thePublicGood')).toEqual([
      '+1% science per public work you hold (at most +25% science)',
      '+1% culture per public work you hold (at most +25% culture)',
    ]);
    expect(said('theToppingOut')).toEqual([
      'completing a building (an empire building) grants each of your cities production equal to 5 times its population',
    ]);
    // The count narrowed to one town names the town once.
    const narrowed = describeEffects([
      { kind: 'pays', where: 'city', basis: 'count', to: 'culture', amount: 1, count: 'publicWorks', within: 'city' },
    ]).map((clause) => stripRefs(clause.text));
    expect(narrowed).toEqual(['+1 culture in every city per public work standing there']);
  });
});
