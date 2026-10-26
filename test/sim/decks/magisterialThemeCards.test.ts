/**
 * **The Magisterial cards changed in place by the themes pass** (batch MG1 of
 * `docs/plans/magisterial-themes-triage.md`). `magisterial.test.ts` checks the
 * rows against the sheet. This file checks what the four changed cards now do,
 * and the rows MG1 moved, retyped and retired:
 *
 *   · Civic Granaries: +1 food and +1 production for a Monument (it was +2 of
 *     each);
 *   · The Honoured Dead: Tier II, +2 science and +4 production in the capital
 *     for each great person spent while it is seated, at most fifteen times
 *     (+30 and +60);
 *   · The Living Canon: +4% food and +4% production for each family whose
 *     legacy you hold, at most five (+20%), in every town. It no longer asks
 *     for three culture buildings;
 *   · The Masters' Domain: +3 food and +3 production on a great-person work,
 *     and no gold percentage;
 *   · the three deferred rows' new text and tier (the triage's reading 44);
 *   · the 64 retirements (reading 43). A retired card that a save holds keeps
 *     its effects;
 *   · the types of the fifteen kept rows and of the two shared Devotion rows
 *     (reading 47).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { type Tile, raiseImprovement } from '../../../src/sim/map';
import { type City, type GameState, addBuilding, bumpRevision, playerById } from '../../../src/sim/state';
import {
  describeCard,
  explainCardCityYields,
  explainCardPercentYields,
  recordScalingOccasion,
  stripRefs,
} from '../../../src/sim/statecraft';
import { type OrderId, DECK_FILE_ORDERS, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { cityContext, explainTileYield } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for seat 0, with an empty queue. The first is the capital. */
function town(state: GameState, col: number, row: number, population: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City): Tile[] {
  return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
}

type Voice = 'food' | 'production' | 'gold' | 'science' | 'culture';

/** What one card's town lines pay this town, in one voice. */
function townPays(state: GameState, city: City, card: string, voice: Voice): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The percentage one card puts on this town, in one voice. */
function townPercent(state: GameState, city: City, card: string, voice: Voice): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** What one card's lines pay on a hex the town works, read off the hex's own list. */
function hexPays(state: GameState, city: City, tile: Tile, card: string): Record<Voice, number> {
  const total: Record<Voice, number> = { food: 0, production: 0, gold: 0, science: 0, culture: 0 };
  for (const line of explainTileYield(tile, cityContext(state, city))) {
    if (line.card !== card) continue;
    for (const voice of Object.keys(total) as Voice[]) total[voice] += line[voice];
  }
  return total;
}

describe('Magisterial batch MG1: the four cards changed in place', () => {
  it('Civic Granaries pays +1 food and +1 production in a town with a Monument, and nothing without one', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 0, 'civicGranaries');
    expect(townPays(state, city, 'civicGranaries', 'food')).toBe(0);
    addBuilding(state, city, 'monument');
    refreshCityDerived(state, city);
    bumpRevision(state);
    expect(townPays(state, city, 'civicGranaries', 'food')).toBe(1);
    expect(townPays(state, city, 'civicGranaries', 'production')).toBe(1);
  });

  it('The Honoured Dead pays the capital +2 science and +4 production for each person spent while seated, at most fifteen', () => {
    const state = bareState();
    const capital = town(state, 3, 5, 3);
    const other = town(state, 8, 5, 3);
    // A person spent before the card is seated is not counted.
    recordScalingOccasion(state, 0, 'greatPersonSpent');
    slot(state, 0, 'theHonouredDead');
    expect(townPays(state, capital, 'theHonouredDead', 'science')).toBe(0);
    recordScalingOccasion(state, 0, 'greatPersonSpent');
    bumpRevision(state);
    expect(townPays(state, capital, 'theHonouredDead', 'science')).toBe(2);
    expect(townPays(state, capital, 'theHonouredDead', 'production')).toBe(4);
    // Only the capital is paid.
    expect(townPays(state, other, 'theHonouredDead', 'science')).toBe(0);
    // Twenty in all, and the pay stops at fifteen: +30 science and +60 production.
    for (let spent = 1; spent < 20; spent += 1) recordScalingOccasion(state, 0, 'greatPersonSpent');
    bumpRevision(state);
    expect(townPays(state, capital, 'theHonouredDead', 'science')).toBe(30);
    expect(townPays(state, capital, 'theHonouredDead', 'production')).toBe(60);
  });

  it('The Living Canon pays +4% food and production for each family held, at most +20%, in a town with no culture building', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 0, 'theLivingCanon');
    expect(townPercent(state, city, 'theLivingCanon', 'food')).toBe(0);
    // One person of each family, in registry order.
    const families = new Map<string, (typeof GREAT_PERSON_IDS)[number]>();
    for (const id of GREAT_PERSON_IDS) {
      const family = greatPersonDef(id).family;
      if (!families.has(family)) families.set(family, id);
    }
    const people = [...families.values()];
    expect(people.length, 'five families of great people').toBeGreaterThanOrEqual(5);
    const seat = playerById(state, 0)!;
    seat.legacies.push({ id: people[0]!, age: 1 });
    bumpRevision(state);
    expect(townPercent(state, city, 'theLivingCanon', 'food')).toBe(4);
    expect(townPercent(state, city, 'theLivingCanon', 'production')).toBe(4);
    // A second person of a family already held adds nothing.
    const sameFamily = GREAT_PERSON_IDS.find(
      (id) => id !== people[0] && greatPersonDef(id).family === greatPersonDef(people[0]!).family,
    );
    expect(sameFamily, 'a second person of the first family').toBeDefined();
    seat.legacies.push({ id: sameFamily!, age: 1 });
    bumpRevision(state);
    expect(townPercent(state, city, 'theLivingCanon', 'food')).toBe(4);
    for (const id of people.slice(1)) seat.legacies.push({ id, age: 1 });
    bumpRevision(state);
    expect(townPercent(state, city, 'theLivingCanon', 'food')).toBe(Math.min(people.length, 5) * 4);
    expect(townPercent(state, city, 'theLivingCanon', 'production')).toBe(Math.min(people.length, 5) * 4);
    // The game has five families, so the cap of five helpings (+20%) is the
    // whole of them. The row says so too.
    for (const effect of orderDef('theLivingCanon' as OrderId).effects) {
      expect(effect.kind === 'pays' && effect.max, 'at most five helpings').toBe(5);
    }
    // A revoked legacy leaves the count.
    for (const held of seat.legacies) held.revoked = true;
    bumpRevision(state);
    expect(townPercent(state, city, 'theLivingCanon', 'food')).toBe(0);
  });

  it('The Masters’ Domain pays +3 food and +3 production on a great-person work, and no gold percentage', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 0, 'theMastersDomain');
    const [work, farm] = ring(state, city);
    raiseImprovement(work!, 'academy' as never, state.turn);
    raiseImprovement(farm!, 'farm' as never, state.turn);
    refreshCityDerived(state, city);
    bumpRevision(state);
    expect(hexPays(state, city, work!, 'theMastersDomain')).toEqual({
      food: 3,
      production: 3,
      gold: 0,
      science: 0,
      culture: 0,
    });
    expect(hexPays(state, city, farm!, 'theMastersDomain').food).toBe(0);
    expect(townPercent(state, city, 'theMastersDomain', 'gold')).toBe(0);
    expect(orderDef('theMastersDomain' as OrderId).effects.map((effect) => effect.kind)).toEqual(['pays']);
  });
});

describe('Magisterial batch MG1: the rows', () => {
  it('moves The Honoured Dead to Tier II, and The Magister’s Court and The Last Commission to Tier IV', () => {
    expect(orderDef('theHonouredDead' as OrderId).band).toBe(2);
    expect(orderDef('magisterialTheMagistersCourt' as OrderId).band).toBe(4);
    expect(orderDef('theLastCommission' as OrderId).band).toBe(4);
  });

  it('gives the three deferred rows their new text and keeps them out of every pool', () => {
    expect(orderDef('theGoldenAge' as OrderId).text).toBe(
      'Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns.',
    );
    expect(orderDef('magisterialTheMagistersCourt' as OrderId).text).toBe(
      'Cities containing a wonder gain +25% production toward the Magnum Opus.',
    );
    for (const id of ['theGoldenAge', 'magisterialTheMagistersCourt', 'theLastCommission']) {
      const def = orderDef(id as OrderId);
      expect(orderIsDealt(id as OrderId), id).toBe(false);
      expect(def.retired, id).toBeUndefined();
      expect(def.effects, id).toEqual([]);
      // The card prints what it would do, struck as not built yet.
      const clauses = describeCard(id as OrderId);
      expect(clauses.some((clause) => clause.deferred === true), id).toBe(true);
      for (const clause of clauses) expect(stripRefs(clause.text), id).not.toContain('[[');
    }
  });

  it('retires 62 Magisterial rows and the two shared rows both sheets cut, and deals none of them', () => {
    const retired = DECK_FILE_ORDERS.magisterial.filter((id) => orderDef(id).retired === true);
    expect(retired).toHaveLength(62);
    // The one card this pass cut that still had a live row.
    expect(retired).toContain('thePerformersTreasury');
    for (const id of [...retired, 'theImperialExaminations', 'triumphalArches'] as OrderId[]) {
      expect(orderDef(id).retired, id).toBe(true);
      expect(orderIsDealt(id), id).toBe(false);
      expect(orderDef(id).type, id).toBeUndefined();
    }
  });

  it('lets a save that holds a retired card keep its effects', () => {
    // Reading 43: a retired row keeps its effects, so a card seated before
    // MG1 still pays. The Grand Fairs: +5 culture and +5 gold in a town with a
    // Market and a Monument.
    const state = bareState();
    const city = town(state, 5, 5, 3);
    addBuilding(state, city, 'monument');
    addBuilding(state, city, 'market');
    refreshCityDerived(state, city);
    slot(state, 0, 'theGrandFairs');
    expect(orderDef('theGrandFairs' as OrderId).retired).toBe(true);
    expect(townPays(state, city, 'theGrandFairs', 'gold')).toBe(5);
    expect(townPays(state, city, 'theGrandFairs', 'culture')).toBe(5);
  });

  it('types the fifteen kept rows by the sheet, and the two shared Devotion rows as the Devotion plan does', () => {
    const types: Record<string, string> = {
      magisterialMasterMasons: 'economic',
      civicGranaries: 'economic',
      theTempleOfTheMuses: 'civic',
      magisterialTheLaureate: 'civic',
      magisterialTheGuildOfMasons: 'economic',
      theWorkingCourt: 'economic',
      theLearnedPatron: 'civic',
      theSenateCharter: 'civic',
      theMastersDomain: 'economic',
      theHonouredDead: 'civic',
      theLivingCanon: 'economic',
      theWonderCommonwealth: 'economic',
      theGoldenAge: 'civic',
      magisterialTheMagistersCourt: 'economic',
      theLastCommission: 'economic',
      sacredCommissions: 'economic',
      sacredPatronage: 'civic',
    };
    for (const [id, type] of Object.entries(types)) expect(orderDef(id as OrderId).type, id).toBe(type);
  });
});
