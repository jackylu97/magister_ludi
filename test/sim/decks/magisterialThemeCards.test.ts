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
 *
 * Batch MG2 added the fourteen cards of Tiers 0 and I whose shapes already
 * existed, and this file checks each of them on a small board:
 *
 *   · Tier 0: The Prytaneion (reading 1), The Polemarch (reading 31), The
 *     Court Painter (reading 9), The Cornerstone, The Repertory and The Second
 *     Reading (reading 10);
 *   · Tier I: The Nomarchs, The Workshop at Olympia (reading 45), The
 *     Overseers of Works, The Siting Masters (reading 28), The Keepers of
 *     Wonders, The Ceremonial Guard, The Unveiling (reading 14) and The
 *     Encyclopedia.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, realiseItem, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { type Tile, raiseImprovement, tileNeighbors } from '../../../src/sim/map';
import { explainAuthority, explainHappiness } from '../../../src/sim/meters';
import { explainRerollCost, rerollDoorOpen, rihlaPaysFor, settleReroll } from '../../../src/sim/religion';
import {
  type City,
  type GameState,
  type Unit,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cardCityStat,
  cardCombatLines,
  cardProduction,
  cardRenownLines,
  describeCard,
  explainCardCityYields,
  explainCardPercentYields,
  payWindfallGrants,
  recordScalingOccasion,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type OrderId,
  DECK_FILE_ORDERS,
  ORDER_IDS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { type TechId, highestAge, techDef } from '../../../src/sim/techData';
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

// --- batch MG2: the data-only cards of Tiers 0 and I -------------------------

/** The fourteen rows of batch MG2, with the tier, rarity and type the sheet gives each. */
const MG2_ROWS: readonly [string, number, string, string][] = [
  ['thePrytaneion', 0, 'uncommon', 'economic'],
  ['thePolemarch', 0, 'common', 'military'],
  ['theCourtPainter', 0, 'common', 'civic'],
  ['theCornerstone', 0, 'common', 'economic'],
  ['theRepertory', 0, 'common', 'civic'],
  ['theSecondReading', 0, 'uncommon', 'wildcard'],
  ['theNomarchs', 1, 'uncommon', 'civic'],
  ['theWorkshopAtOlympia', 1, 'common', 'civic'],
  ['theOverseersOfWorks', 1, 'uncommon', 'economic'],
  ['theSitingMasters', 1, 'common', 'civic'],
  ['theKeepersOfWonders', 1, 'common', 'civic'],
  ['theCeremonialGuard', 1, 'common', 'military'],
  ['theUnveiling', 1, 'uncommon', 'wildcard'],
  ['theEncyclopedia', 1, 'common', 'civic'],
];

/** What one card's empire lines put on seat 0's authority. */
function authorityFrom(state: GameState, card: string): number {
  return explainAuthority(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.value, 0);
}

/** What one card's lines put on seat 0's happiness. */
function happinessFrom(state: GameState, card: string): number {
  return explainHappiness(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.value, 0);
}

/** The renown a turn one card pays seat 0. */
function renownFrom(state: GameState, card: string): number {
  return cardRenownLines(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.amount, 0);
}

/** The strength one card gives this unit in one posture, on its own hex. */
function strengthFrom(state: GameState, unit: Unit, side: 'attack' | 'defend', card: string): number {
  return cardCombatLines(state, {
    unit,
    side,
    tile: at(state, unit.col, unit.row),
    vsBarbarians: false,
    vsCity: false,
    targetHp: 100,
    targetMaxHp: 100,
  })
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.amount, 0);
}

/** Seat 0 is dealt an Order hand of these cards. */
function offer(state: GameState, ...ids: string[]): void {
  playerById(state, 0)!.statecraft.pendingOrder = { options: ids as OrderId[] };
  bumpRevision(state);
}

/** Seat 0 picks the first card of the hand, through the reducer. */
function pick(state: GameState): void {
  expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
}

describe('Magisterial batch MG2: the rows', () => {
  it('deals all fourteen from the tier, rarity and type the sheet names', () => {
    const pool = ordersForDecks(['magisterial']);
    for (const [id, band, rarity, type] of MG2_ROWS) {
      const def = orderDef(id as OrderId);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(pool, id).toContain(id);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
    }
  });

  it('prints every clause plainly, with no keyword mark left raw', () => {
    for (const [id] of MG2_ROWS) {
      const clauses = describeCard(id as OrderId);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.deferred, id).not.toBe(true);
        expect(stripRefs(clause.text), id).not.toContain('[[');
      }
    }
  });
});

describe('Magisterial batch MG2: the council cards', () => {
  it('The Prytaneion pays each town +1 food for each card seated, itself included', () => {
    const state = bareState(20, 10);
    const capital = town(state, 3, 5, 3);
    const other = town(state, 12, 5, 3);
    slot(state, 0, 'thePrytaneion');
    expect(townPays(state, capital, 'thePrytaneion', 'food')).toBe(1);
    expect(townPays(state, other, 'thePrytaneion', 'food')).toBe(1);
    slot(state, 0, 'theCornerstone');
    slot(state, 0, 'theRepertory');
    expect(townPays(state, capital, 'thePrytaneion', 'food')).toBe(3);
    expect(townPays(state, other, 'thePrytaneion', 'food')).toBe(3);
    // A card in the collection and not in a chair does not count (reading 1).
    playerById(state, 0)!.statecraft.orders.push('theEncyclopedia' as OrderId);
    bumpRevision(state);
    expect(townPays(state, capital, 'thePrytaneion', 'food')).toBe(3);
  });

  it('The Nomarchs pays +1 authority for every two cards seated', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    slot(state, 0, 'theNomarchs');
    expect(authorityFrom(state, 'theNomarchs')).toBe(0);
    slot(state, 0, 'theCornerstone');
    expect(authorityFrom(state, 'theNomarchs')).toBe(1);
    slot(state, 0, 'theRepertory');
    expect(authorityFrom(state, 'theNomarchs')).toBe(1);
    slot(state, 0, 'thePrytaneion');
    expect(authorityFrom(state, 'theNomarchs')).toBe(2);
  });

  it('The Polemarch gives every unit +2 strength for each Military card seated, attacking or defending', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    const soldier = createUnit(state, 0, 'warrior', 3, 3);
    // A ship counts too (reading 31).
    at(state, 8, 3).terrain = 'coast' as never;
    const ship = createUnit(state, 0, 'trireme', 8, 3);
    bumpRevision(state);
    slot(state, 0, 'thePolemarch');
    // It counts itself.
    expect(strengthFrom(state, soldier, 'attack', 'thePolemarch')).toBe(2);
    expect(strengthFrom(state, soldier, 'defend', 'thePolemarch')).toBe(2);
    expect(strengthFrom(state, ship, 'attack', 'thePolemarch')).toBe(2);
    // A second Military card adds a helping. A card of another type does not.
    slot(state, 0, 'theCeremonialGuard');
    expect(strengthFrom(state, soldier, 'attack', 'thePolemarch')).toBe(4);
    slot(state, 0, 'theSecondReading');
    slot(state, 0, 'thePrytaneion');
    expect(strengthFrom(state, soldier, 'defend', 'thePolemarch')).toBe(4);
    // A rival's unit gains nothing from this seat's card.
    const rival = createUnit(state, 1, 'warrior', 9, 7);
    bumpRevision(state);
    expect(strengthFrom(state, rival, 'attack', 'thePolemarch')).toBe(0);
  });

  it('The Second Reading frees the first reroll of each Order, Doctrine and great-person hand, and opens rerolls early', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    const player = playerById(state, 0)!;
    // A seat that does not know Chronology may not reroll at all.
    player.techsResearched = player.techsResearched.filter((id) => id !== ('theLongCount' as TechId));
    expect(techDef('theLongCount' as TechId).name).toBe('Chronology');
    bumpRevision(state);
    expect(rerollDoorOpen(state, 0)).toBe(false);
    slot(state, 0, 'theSecondReading');
    expect(rerollDoorOpen(state, 0)).toBe(true);
    offer(state, 'theCornerstone', 'theRepertory', 'thePolemarch');
    for (const kind of ['order', 'doctrine', 'greatPerson'] as const) {
      expect(rihlaPaysFor(state, player, kind), kind).toBe(true);
    }
    // A belief hand's first asking is free already, so the rule is not asked.
    expect(rihlaPaysFor(state, player, 'belief')).toBe(false);
    expect(explainRerollCost(state, 0, 'order').total).toBe(0);
    // The free reroll is spent by the hand it deals, and the next one costs.
    const faith = player.faithPool;
    expect(settleReroll(state, player)?.paid).toBe(0);
    expect(player.faithPool).toBe(faith);
    expect(explainRerollCost(state, 0, 'order').total).toBeGreaterThan(0);
    // The next hand is free again.
    offer(state, 'theCornerstone');
    expect(explainRerollCost(state, 0, 'order').total).toBe(0);
  });
});

describe('Magisterial batch MG2: the draft and the patrons', () => {
  it('The Court Painter grants 15 renown for each card drafted, a charter and a free hand included', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    const player = playerById(state, 0)!;
    const earned = (): number => player.renownEarned;
    // Drafting the card itself pays nothing, because it is not yet in a chair.
    offer(state, 'theCourtPainter');
    let before = earned();
    pick(state);
    expect(earned() - before).toBe(0);
    slot(state, 0, 'theCourtPainter');
    offer(state, 'marketDay');
    before = earned();
    pick(state);
    expect(earned() - before).toBe(15);
    // A charter counts (the card's second sentence).
    offer(state, 'thePlantersCharter');
    before = earned();
    pick(state);
    expect(player.charteredBuildings).toContain('plantationHouse');
    expect(earned() - before).toBe(15);
    // A pass pays nothing (reading 9).
    offer(state, 'theMineralTrade');
    before = earned();
    expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    expect(earned() - before).toBe(0);
    // The moment pays renown and nothing else.
    const payout = windfallPayout(state, 0, 'cardDrafted');
    expect(payout.grants).toHaveLength(0);
    expect(payout.renown.filter((grant) => grant.amount !== 0).map((grant) => grant.amount)).toEqual([15]);
  });

  it('The Overseers of Works sends the capital 100 production for each age reached when a great person is gained', () => {
    const state = bareState(20, 10);
    const capital = town(state, 3, 5, 3);
    const other = town(state, 12, 5, 3);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theOverseersOfWorks');
    const era = highestAge(player.techsResearched);
    expect(era).toBeGreaterThan(1);
    const production = (): number[] =>
      windfallPayout(state, 0, 'greatPersonGained')
        .grants.filter((grant) => grant.card === 'theOverseersOfWorks' && grant.yield === 'production')
        .map((grant) => grant.amount);
    expect(production()).toEqual([100 * era]);
    // In the first age it is 100.
    const firstAge = player.techsResearched.filter((id) => techDef(id).age === 1);
    player.techsResearched = firstAge;
    bumpRevision(state);
    expect(production()).toEqual([100]);
    // The hammers land in the capital, and in no other town.
    const atCapital = capital.hammerBasket;
    const atOther = other.hammerBasket;
    payWindfallGrants(state, player, windfallPayout(state, 0, 'greatPersonGained'), {
      col: other.col,
      row: other.row,
    });
    expect(capital.hammerBasket - atCapital).toBe(100);
    expect(other.hammerBasket).toBe(atOther);
  });

  it('The Encyclopedia pays the capital +1 science and +1 culture for each Order held and not seated, at most 15', () => {
    const state = bareState(20, 10);
    const capital = town(state, 3, 5, 3);
    const other = town(state, 12, 5, 3);
    slot(state, 0, 'theEncyclopedia');
    // The card itself is seated, so it does not count.
    expect(townPays(state, capital, 'theEncyclopedia', 'science')).toBe(0);
    const sc = playerById(state, 0)!.statecraft;
    const shelf = ORDER_IDS.filter((id) => !sc.orders.includes(id));
    sc.orders.push(...shelf.slice(0, 3));
    bumpRevision(state);
    expect(townPays(state, capital, 'theEncyclopedia', 'science')).toBe(3);
    expect(townPays(state, capital, 'theEncyclopedia', 'culture')).toBe(3);
    expect(townPays(state, other, 'theEncyclopedia', 'science')).toBe(0);
    // A seated card leaves the count.
    sc.slots.push({ card: shelf[0]!, sealedUntil: state.turn });
    bumpRevision(state);
    expect(townPays(state, capital, 'theEncyclopedia', 'science')).toBe(2);
    // At most fifteen of each.
    sc.orders.push(...shelf.slice(3, 30));
    bumpRevision(state);
    expect(townPays(state, capital, 'theEncyclopedia', 'science')).toBe(15);
    expect(townPays(state, capital, 'theEncyclopedia', 'culture')).toBe(15);
  });
});

describe('Magisterial batch MG2: towns, works and wonders', () => {
  it('The Repertory pays +1 culture for each culture building in a town', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 0, 'theRepertory');
    expect(townPays(state, city, 'theRepertory', 'culture')).toBe(0);
    addBuilding(state, city, 'monument');
    addBuilding(state, city, 'amphitheater');
    addBuilding(state, city, 'granary');
    refreshCityDerived(state, city);
    bumpRevision(state);
    expect(townPays(state, city, 'theRepertory', 'culture')).toBe(2);
  });

  it('The Cornerstone speeds wonders by 30% in a town that holds no wonder, and in no other', () => {
    const state = bareState(20, 10);
    const bare = town(state, 3, 5, 3);
    const holder = town(state, 12, 5, 3);
    addBuilding(state, holder, 'pyramids');
    refreshCityDerived(state, holder);
    slot(state, 0, 'theCornerstone');
    const toward = (city: City, category: 'wonder' | 'building', id: string): number =>
      cardProduction(state, city, category, undefined, id as never)
        .filter((line) => line.card === 'theCornerstone')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(toward(bare, 'wonder', 'greatLibrary')).toBe(30);
    expect(toward(holder, 'wonder', 'greatLibrary')).toBe(0);
    // Wonders only.
    expect(toward(bare, 'building', 'granary')).toBe(0);
  });

  it('The Workshop at Olympia pays +2 renown a turn and The Keepers of Wonders +2 happiness for each wonder held', () => {
    const state = bareState(20, 10);
    const first = town(state, 3, 5, 3);
    const second = town(state, 12, 5, 3);
    slot(state, 0, 'theWorkshopAtOlympia');
    slot(state, 0, 'theKeepersOfWonders');
    expect(renownFrom(state, 'theWorkshopAtOlympia')).toBe(0);
    expect(happinessFrom(state, 'theKeepersOfWonders')).toBe(0);
    addBuilding(state, first, 'pyramids');
    addBuilding(state, second, 'greatLibrary');
    addBuilding(state, second, 'stonehenge');
    for (const city of [first, second]) refreshCityDerived(state, city);
    bumpRevision(state);
    expect(renownFrom(state, 'theWorkshopAtOlympia')).toBe(6);
    expect(happinessFrom(state, 'theKeepersOfWonders')).toBe(6);
  });

  it('The Ceremonial Guard gives a town holding a wonder +5 defence', () => {
    const state = bareState(20, 10);
    const bare = town(state, 3, 5, 3);
    const holder = town(state, 12, 5, 3);
    slot(state, 0, 'theCeremonialGuard');
    const defence = (city: City): number =>
      cardCityStat(state, city, 'defense')
        .filter((line) => line.card === 'theCeremonialGuard')
        .reduce((sum, line) => sum + line.amount, 0);
    expect(defence(holder)).toBe(0);
    addBuilding(state, holder, 'pyramids');
    refreshCityDerived(state, holder);
    bumpRevision(state);
    expect(defence(holder)).toBe(5);
    expect(defence(bare)).toBe(0);
  });

  it('The Siting Masters pays a work +1 culture for each hill, mountain, forest or water hex beside it, at most +3', () => {
    const state = bareState(20, 12);
    const city = town(state, 8, 6, 3);
    slot(state, 0, 'theSitingMasters');
    // A work two hexes from the centre, so its six neighbours are ours to shape.
    const work = at(state, 8, 4);
    raiseImprovement(work, 'academy' as never, state.turn);
    const beside = tileNeighbors(state.map, work).filter(
      (tile) => !(tile.col === city.col && tile.row === city.row),
    );
    expect(beside.length).toBeGreaterThanOrEqual(5);
    refreshCityDerived(state, city);
    bumpRevision(state);
    const culture = (): number => hexPays(state, city, work, 'theSitingMasters').culture;
    expect(culture()).toBe(0);
    // A forested hill is one hex, so it counts once (reading 28).
    beside[0]!.hills = true;
    beside[0]!.feature = 'forest' as never;
    bumpRevision(state);
    expect(culture()).toBe(1);
    beside[1]!.terrain = 'mountain' as never;
    bumpRevision(state);
    expect(culture()).toBe(2);
    beside[2]!.terrain = 'coast' as never;
    bumpRevision(state);
    expect(culture()).toBe(3);
    // At most +3.
    beside[3]!.feature = 'forest' as never;
    bumpRevision(state);
    expect(culture()).toBe(3);
    // A hex that is not a great-person work is paid nothing.
    const farm = beside[4]!;
    raiseImprovement(farm, 'farm' as never, state.turn);
    bumpRevision(state);
    expect(hexPays(state, city, farm, 'theSitingMasters').culture).toBe(0);
  });

  it('The Unveiling deals a free Order hand when a wonder is completed, and only when no hand waits', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theUnveiling');
    expect(windfallPayout(state, 0, 'completion', 0, 0, { wonder: true }).freeDraft).toBe(true);
    expect(windfallPayout(state, 0, 'completion').freeDraft).not.toBe(true);
    // A building that is not a wonder deals nothing.
    const drafts = player.statecraft.drafts;
    realiseItem(state, city, { kind: 'building', id: 'granary' as never });
    expect(player.statecraft.pendingOrder).toBeUndefined();
    // A wonder deals a hand, and the draft count does not move.
    realiseItem(state, city, { kind: 'building', id: 'pyramids' as never });
    const hand = player.statecraft.pendingOrder;
    expect(hand).toBeDefined();
    expect(hand!.options.length).toBeGreaterThan(0);
    expect(player.statecraft.drafts).toBe(drafts);
    // While that hand waits, a second wonder deals nothing (reading 14).
    realiseItem(state, city, { kind: 'building', id: 'greatLibrary' as never });
    expect(player.statecraft.pendingOrder).toBe(hand);
  });
});
