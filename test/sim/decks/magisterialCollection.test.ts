/**
 * **Magisterial batch MG4: the collection and the wonder commissions**
 * (`docs/plans/magisterial-themes-triage.md`). This file checks the new
 * counts, the new commission figure, the two new moments a commission counts,
 * and the cards that read them:
 *
 *   · the `ordersHeld` count and figure: every Order in the collection, seated
 *     or not, charters and fulfilled commissions included, and no Doctrine
 *     (reading 7). Cards: The Universal Library and Commission: The Roll of
 *     the Senate;
 *   · the `decksHeld` count: the different decks among the Orders held, where
 *     a card two decks share counts for both and the cards of no deck count
 *     as one more, and with `seated` only the cards in chairs (reading 8).
 *     Cards: The Polymath's Study and the shared Travelling Players (reading
 *     46);
 *   · the `wonderCompleted` moment, written for the empire whose town
 *     completes a world wonder (readings 3 and 4). Card: Commission: The
 *     Eighth Wonder;
 *   · the `wonderProduction` moment, the production a town banks while a world
 *     wonder or the Magnum Opus is at the front of its queue (reading 35).
 *     Card: Commission: The Wonder of the Age.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, realiseItem, refreshCityDerived } from '../../../src/sim/cities';
import { commissionFigure, commissionGoalTown, commissionProgress, runCommissions } from '../../../src/sim/commissions';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  type WindfallPayout,
  cardProduction,
  cardRenownLines,
  cardRouteYieldLines,
  commissionFulfilledTurn,
  describeCard,
  explainCardEmpireYields,
  explainCardPercentYields,
  payWindfallGrants,
  recordScalingOccasion,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  stripRefs,
  tallyOf,
} from '../../../src/sim/statecraft';
import { decksHeldCount, ordersHeldCount } from '../../../src/sim/statecraft/evaluator';
import {
  type OrderId,
  DOCTRINE_IDS,
  ORDER_IDS,
  isCharter,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { collectYields } from '../../../src/sim/yields/empire';
import { at, bareState } from '../improvementHelpers';

const EIGHTH_WONDER = 'magisterialTheEighthWonder' as OrderId;
const ROLL_OF_THE_SENATE = 'magisterialTheRollOfTheSenate' as OrderId;
const WONDER_OF_THE_AGE = 'magisterialTheWonderOfTheAge' as OrderId;
const UNIVERSAL_LIBRARY = 'theUniversalLibrary' as OrderId;
const POLYMATHS_STUDY = 'thePolymathsStudy' as OrderId;
const TRAVELLING_PLAYERS = 'travellingPlayers' as OrderId;

/** The five rows batch MG4 dealt, with the tier, rarity and type the sheet gives each. */
const MG4_ROWS: readonly [OrderId, number, string, string][] = [
  [EIGHTH_WONDER, 0, 'uncommon', 'civic'],
  [ROLL_OF_THE_SENATE, 1, 'uncommon', 'wildcard'],
  [WONDER_OF_THE_AGE, 3, 'uncommon', 'wildcard'],
  [UNIVERSAL_LIBRARY, 4, 'rare', 'economic'],
  [POLYMATHS_STUDY, 4, 'rare', 'civic'],
];

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Adds cards to this seat's collection without seating them. */
function hold(state: GameState, playerId: number, ...ids: readonly OrderId[]): void {
  const sc = playerById(state, playerId)!.statecraft;
  for (const id of ids) if (!sc.orders.includes(id)) sc.orders.push(id);
  bumpRevision(state);
}

/**
 * Seats a card for seat 0 in the first empty chair it fits, through the slot
 * verb, so a commission's reward can resize the council. Returns the chair.
 */
function seatInChair(state: GameState, id: OrderId): number {
  hold(state, 0, id);
  const player = playerById(state, 0)!;
  const chairs = slotTypesOf(player.statecraft);
  const index = player.statecraft.slots.findIndex(
    (slotted, chair) => slotted === null && orderFitsSlot(id, chairs[chair]!),
  );
  expect(index, `an empty chair for ${id}`).toBeGreaterThanOrEqual(0);
  expect(slotOrderError(state, 0, id, index)).toBeNull();
  slotOrderAt(state, player, id, index);
  bumpRevision(state);
  return index;
}

/** One town of the given size for this seat, with an empty queue. The first is the capital. */
function town(state: GameState, playerId: number, col: number, row: number, population = 3): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * Live Orders of the files, none of them a charter, a commission or a card
 * this file seats, for filling a collection. Taken in registry order.
 */
function fillers(count: number): OrderId[] {
  const mine = new Set<OrderId>([...MG4_ROWS.map(([id]) => id), TRAVELLING_PLAYERS]);
  const found = ORDER_IDS.filter(
    (id) =>
      orderIsDealt(id) && !isCharter(id) && orderDef(id).commission === undefined && !mine.has(id),
  ).slice(0, count);
  expect(found).toHaveLength(count);
  return found;
}

/** The first live card whose decks are exactly these. */
function cardOfDecks(...decks: readonly string[]): OrderId {
  const id = ORDER_IDS.find(
    (candidate) =>
      orderIsDealt(candidate) &&
      orderDef(candidate).commission === undefined &&
      orderDef(candidate).decks.length === decks.length &&
      decks.every((deck) => (orderDef(candidate).decks as readonly string[]).includes(deck)),
  );
  expect(id, `a live card of ${decks.join(' and ') || 'no deck'}`).toBeDefined();
  return id!;
}

/** The percentage one card puts on this town, in one voice. */
function townPercent(state: GameState, city: City, card: OrderId, voice: 'science' | 'production'): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** A windfall of production paid into the capital, the way a reward pays it. */
function productionLump(card: OrderId, amount: number): WindfallPayout {
  return {
    amount: 0,
    grants: [{ card, source: 'a test', yield: 'production', amount }],
    heal: 0,
    units: [],
    healAll: false,
    timed: [],
    renown: [],
    pressure: [],
    lines: [],
    claims: [],
  };
}

describe('Magisterial batch MG4: the rows', () => {
  it('deals all five from the tier, rarity and type the sheet names', () => {
    const pool = ordersForDecks(['magisterial']);
    for (const [id, band, rarity, type] of MG4_ROWS) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(pool, id).toContain(id);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
    }
    // Travelling Players keeps its id, its tier and its type (reading 46).
    const players = orderDef(TRAVELLING_PLAYERS);
    expect(players.decks).toEqual(['commerce', 'magisterial']);
    expect(players.band).toBe(2);
    expect(players.type).toBe('civic');
    expect(orderIsDealt(TRAVELLING_PLAYERS)).toBe(true);
  });

  it('prints every clause plainly, with no keyword mark left raw', () => {
    for (const id of [...MG4_ROWS.map(([row]) => row), TRAVELLING_PLAYERS]) {
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.deferred, id).not.toBe(true);
        expect(stripRefs(clause.text), id).not.toContain('[[');
      }
    }
    const said = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(said(ROLL_OF_THE_SENATE)[0]).toBe('Commission. Goal: hold 10 Orders, seated or not, while this card is seated');
    expect(said(EIGHTH_WONDER)[0]).toBe('Commission. Goal: complete 1 wonder, while this card is seated');
    expect(said(WONDER_OF_THE_AGE)[0]).toBe(
      'Commission. Goal: put 1500 production into wonders or the Magnum Opus, while this card is seated',
    );
    expect(said(TRAVELLING_PLAYERS)).toEqual([
      '+2 culture per different deck among the cards you have seated, on trade routes sent from a city with a Monument and that end in another empire’s city',
    ]);
  });
});

describe('Magisterial batch MG4: the Orders held', () => {
  it('counts every Order in the collection, seated or not, charters included, and no Doctrine', () => {
    const state = bareState();
    town(state, 0, 5, 5);
    const sc = playerById(state, 0)!.statecraft;
    expect(ordersHeldCount(state, 0)).toBe(0);
    slot(state, 0, UNIVERSAL_LIBRARY);
    hold(state, 0, ...fillers(3));
    expect(ordersHeldCount(state, 0)).toBe(4);
    const charter = ORDER_IDS.find((id) => isCharter(id) && orderIsDealt(id));
    expect(charter, 'a live charter').toBeDefined();
    hold(state, 0, charter!);
    expect(ordersHeldCount(state, 0)).toBe(5);
    // A Doctrine is not an Order.
    sc.doctrines.push(DOCTRINE_IDS[0]!);
    bumpRevision(state);
    expect(ordersHeldCount(state, 0)).toBe(5);
    // The commission figure reads the same walk.
    expect(commissionFigure(state, 0, 'ordersHeld')).toBe(5);
  });

  it('The Universal Library speeds the Magnum Opus by 2% for each Order held, at most +40%, and nothing else', () => {
    const state = bareState(20, 10);
    const city = town(state, 0, 3, 5);
    slot(state, 0, UNIVERSAL_LIBRARY);
    const toward = (id: string): number =>
      cardProduction(state, city, 'building', undefined, id as never)
        .filter((line) => line.card === UNIVERSAL_LIBRARY)
        .reduce((sum, line) => sum + line.percent, 0);
    // The card counts itself.
    expect(toward('theMagnumOpus')).toBe(2);
    // Nine more held and not seated: ten in all.
    hold(state, 0, ...fillers(9));
    expect(toward('theMagnumOpus')).toBe(20);
    playerById(state, 0)!.statecraft.doctrines.push(DOCTRINE_IDS[0]!);
    bumpRevision(state);
    expect(toward('theMagnumOpus')).toBe(20);
    // Thirty in all, and the bonus stops at twenty helpings.
    hold(state, 0, ...fillers(29));
    expect(ordersHeldCount(state, 0)).toBe(30);
    expect(toward('theMagnumOpus')).toBe(40);
    // Only the Opus.
    expect(toward('granary')).toBe(0);
  });

  it('Commission: The Roll of the Senate is met at ten Orders held and gives a Wildcard chair for good', () => {
    const state = bareState();
    town(state, 0, 5, 5);
    const sc = playerById(state, 0)!.statecraft;
    const chair = seatInChair(state, ROLL_OF_THE_SENATE);
    hold(state, 0, ...fillers(8));
    // Nine held, this card among them.
    expect(commissionProgress(state, 0, ROLL_OF_THE_SENATE)[0]).toMatchObject({ have: 9, need: 10, met: false });
    expect(runCommissions(state)).toEqual([]);
    // A Doctrine does not make the tenth.
    sc.doctrines.push(DOCTRINE_IDS[0]!);
    bumpRevision(state);
    expect(commissionProgress(state, 0, ROLL_OF_THE_SENATE)[0]!.have).toBe(9);
    hold(state, 0, ...fillers(9).slice(8));
    const chairs = sc.slots.length;
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([ROLL_OF_THE_SENATE]);
    expect(reports[0]!.lines).toEqual(['one more Wildcard chair']);
    expect(sc.chairsWon).toBe(1);
    expect(sc.slots.length).toBe(chairs + 1);
    expect(sc.slots[chair]).toBeNull();
    expect(commissionFulfilledTurn(sc, ROLL_OF_THE_SENATE)).toBe(state.turn);
    // A fulfilled commission stays in the collection, and still counts.
    expect(ordersHeldCount(state, 0)).toBe(10);
  });
});

describe('Magisterial batch MG4: the decks among the cards', () => {
  it('counts each deck once, a shared card for both its decks, and the cards of no deck as one more', () => {
    const state = bareState();
    town(state, 0, 5, 5);
    const expansionist = cardOfDecks('expansionist');
    const shared = cardOfDecks('dominion', 'scientific');
    const deckless = cardOfDecks();
    const secondDeckless = ORDER_IDS.find(
      (id) => id !== deckless && orderIsDealt(id) && orderDef(id).decks.length === 0,
    )!;
    slot(state, 0, POLYMATHS_STUDY);
    expect(decksHeldCount(state, 0, false)).toBe(1);
    hold(state, 0, expansionist);
    expect(decksHeldCount(state, 0, false)).toBe(2);
    // Seated, only the Polymath's Study: one deck.
    expect(decksHeldCount(state, 0, true)).toBe(1);
    hold(state, 0, shared);
    expect(decksHeldCount(state, 0, false)).toBe(4);
    hold(state, 0, deckless, secondDeckless);
    expect(decksHeldCount(state, 0, false)).toBe(5);
    // A Doctrine is not an Order, whatever its deck.
    playerById(state, 0)!.statecraft.doctrines.push(DOCTRINE_IDS[0]!);
    bumpRevision(state);
    expect(decksHeldCount(state, 0, false)).toBe(5);
  });

  it('The Polymath’s Study gives every town +8% science and production for each deck held, at most +40%', () => {
    const state = bareState(20, 10);
    const capital = town(state, 0, 3, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, POLYMATHS_STUDY);
    for (const city of [capital, other]) {
      expect(townPercent(state, city, POLYMATHS_STUDY, 'science')).toBe(8);
      expect(townPercent(state, city, POLYMATHS_STUDY, 'production')).toBe(8);
    }
    // Held and not seated still counts: Expansionist, then Dominion and
    // Scientific on one shared card.
    hold(state, 0, cardOfDecks('expansionist'), cardOfDecks('dominion', 'scientific'));
    expect(townPercent(state, capital, POLYMATHS_STUDY, 'science')).toBe(32);
    // Commerce and the cards of no deck make six, and the bonus stops at five.
    hold(state, 0, cardOfDecks('commerce'), cardOfDecks());
    expect(decksHeldCount(state, 0, false)).toBe(6);
    expect(townPercent(state, capital, POLYMATHS_STUDY, 'science')).toBe(40);
    expect(townPercent(state, other, POLYMATHS_STUDY, 'production')).toBe(40);
  });

  it('Travelling Players pays a foreign route from a Monument town +2 culture for each deck among the seated cards', () => {
    const state = bareState(20, 10);
    const home = town(state, 0, 3, 5);
    const second = town(state, 0, 3, 8);
    const abroad = town(state, 1, 14, 5);
    home.buildings.push('monument');
    second.buildings.push('monument');
    bumpRevision(state);
    slot(state, 0, TRAVELLING_PLAYERS);
    const culture = (from: City, to: City): number =>
      cardRouteYieldLines(state, from, to)
        .filter((line) => line.card === TRAVELLING_PLAYERS)
        .reduce((sum, line) => sum + line.culture, 0);
    // The card itself is Commerce and Magisterial: two decks.
    expect(culture(home, abroad)).toBe(4);
    // A card held and not seated does not count (reading 8).
    hold(state, 0, cardOfDecks('expansionist'));
    expect(culture(home, abroad)).toBe(4);
    // Seated cards do: the cards of no deck make one more, and a Dominion card
    // another.
    slot(state, 0, cardOfDecks());
    expect(culture(home, abroad)).toBe(6);
    slot(state, 0, cardOfDecks('dominion'));
    expect(culture(home, abroad)).toBe(8);
    // A route between two of your own towns is not foreign, and a town with no
    // Monument sends nothing.
    expect(culture(home, second)).toBe(0);
    home.buildings = home.buildings.filter((id) => id !== 'monument');
    bumpRevision(state);
    expect(culture(home, abroad)).toBe(0);
  });
});

describe('Magisterial batch MG4: Commission: The Eighth Wonder', () => {
  it('counts a wonder this empire completes while seated, and no other', () => {
    const state = bareState(20, 10);
    const own = town(state, 0, 3, 5);
    const rival = town(state, 1, 14, 5);
    const sc = playerById(state, 0)!.statecraft;
    // Held and not yet seated, the card counts nothing.
    hold(state, 0, EIGHTH_WONDER);
    realiseItem(state, own, { kind: 'building', id: 'stonehenge' as never });
    seatInChair(state, EIGHTH_WONDER);
    expect(tallyOf(sc, EIGHTH_WONDER)).toBe(0);
    // A rival's wonder is not this empire's, and a building is not a wonder.
    realiseItem(state, rival, { kind: 'building', id: 'greatLibrary' as never });
    realiseItem(state, own, { kind: 'building', id: 'granary' as never });
    expect(tallyOf(sc, EIGHTH_WONDER)).toBe(0);
    // A captured wonder passes through no claim, so it is not counted either.
    rival.ownerId = 0;
    rival.captured = true;
    bumpRevision(state);
    expect(tallyOf(sc, EIGHTH_WONDER)).toBe(0);
    realiseItem(state, own, { kind: 'building', id: 'pyramids' as never });
    expect(tallyOf(sc, EIGHTH_WONDER)).toBe(1);
    expect(commissionGoalTown(state, 0, EIGHTH_WONDER)?.id).toBe(own.id);
  });

  it('pays +3 culture and +5 renown a turn for every wonder held once the goal is met, captured ones included', () => {
    const state = bareState(20, 10);
    const own = town(state, 0, 3, 5);
    const rival = town(state, 1, 14, 5);
    const sc = playerById(state, 0)!.statecraft;
    realiseItem(state, rival, { kind: 'building', id: 'greatLibrary' as never });
    seatInChair(state, EIGHTH_WONDER);
    const culture = (): number =>
      explainCardEmpireYields(state, 0)
        .filter((line) => line.card === EIGHTH_WONDER)
        .reduce((sum, line) => sum + line.culture, 0);
    const renown = (): number =>
      cardRenownLines(state, 0)
        .filter((line) => line.card === EIGHTH_WONDER)
        .reduce((sum, line) => sum + line.amount, 0);
    realiseItem(state, own, { kind: 'building', id: 'pyramids' as never });
    // Seated and not yet met, the card pays nothing.
    expect(culture()).toBe(0);
    expect(renown()).toBe(0);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([EIGHTH_WONDER]);
    expect(commissionFulfilledTurn(sc, EIGHTH_WONDER)).toBe(state.turn);
    bumpRevision(state);
    expect(culture()).toBe(3);
    expect(renown()).toBe(5);
    // A wonder captured after the goal pays too (reading 3).
    rival.ownerId = 0;
    rival.captured = true;
    bumpRevision(state);
    expect(culture()).toBe(6);
    expect(renown()).toBe(10);
  });
});

describe('Magisterial batch MG4: Commission: The Wonder of the Age', () => {
  /**
   * What one town banks in one `collectYields`, read off its basket. A
   * town's production is an exact fraction, so the tally is compared to the
   * basket's rise to within rounding.
   */
  function banked(state: GameState, city: City): number {
    const before = city.hammerBasket;
    collectYields(state);
    return city.hammerBasket - before;
  }

  it('counts the production a town banks into a front-row wonder or the Opus, and nothing else', () => {
    const state = bareState(20, 10);
    const city = town(state, 0, 3, 5, 6);
    const rival = town(state, 1, 14, 5);
    const player = playerById(state, 0)!;
    const sc = player.statecraft;
    city.queue = [{ kind: 'building', id: 'pyramids' as never }];
    bumpRevision(state);
    // Held and not seated: nothing is counted.
    hold(state, 0, WONDER_OF_THE_AGE);
    expect(banked(state, city)).toBeGreaterThan(0);
    expect(tallyOf(sc, WONDER_OF_THE_AGE)).toBe(0);
    seatInChair(state, WONDER_OF_THE_AGE);
    const first = banked(state, city);
    expect(first).toBeGreaterThan(0);
    expect(tallyOf(sc, WONDER_OF_THE_AGE)).toBeCloseTo(first, 9);
    // A building at the front is not a wonder.
    city.queue = [{ kind: 'building', id: 'granary' as never }];
    bumpRevision(state);
    expect(banked(state, city)).toBeGreaterThan(0);
    expect(tallyOf(sc, WONDER_OF_THE_AGE)).toBeCloseTo(first, 9);
    // The Opus counts.
    city.queue = [{ kind: 'building', id: 'theMagnumOpus' as never }];
    bumpRevision(state);
    const opus = banked(state, city);
    expect(opus).toBeGreaterThan(0);
    expect(tallyOf(sc, WONDER_OF_THE_AGE)).toBeCloseTo(first + opus, 9);
    // A lump of production is not counted.
    payWindfallGrants(state, player, productionLump(WONDER_OF_THE_AGE, 40));
    expect(tallyOf(sc, WONDER_OF_THE_AGE)).toBeCloseTo(first + opus, 9);
    // Production in a wonder a rival finishes first still counts.
    city.queue = [{ kind: 'building', id: 'pyramids' as never }];
    bumpRevision(state);
    const put = banked(state, city);
    realiseItem(state, rival, { kind: 'building', id: 'pyramids' as never });
    expect(city.queue.some((item) => item.kind === 'building' && item.id === 'pyramids')).toBe(false);
    expect(tallyOf(sc, WONDER_OF_THE_AGE)).toBeCloseTo(first + opus + put, 9);
  });

  it('pays 250 culture and a Wildcard chair for good at 1,500 production', () => {
    const state = bareState(20, 10);
    town(state, 0, 3, 5);
    const player = playerById(state, 0)!;
    const sc = player.statecraft;
    const chair = seatInChair(state, WONDER_OF_THE_AGE);
    recordScalingOccasion(state, 0, 'wonderProduction', 1499);
    expect(runCommissions(state)).toEqual([]);
    recordScalingOccasion(state, 0, 'wonderProduction', 1);
    // A hand waits, so the culture stays in the pool.
    sc.pendingOrder = { options: [UNIVERSAL_LIBRARY] };
    const culture = player.culturePool;
    const chairs = sc.slots.length;
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([WONDER_OF_THE_AGE]);
    expect(player.culturePool - culture).toBe(250);
    expect(sc.chairsWon).toBe(1);
    expect(sc.slots.length).toBe(chairs + 1);
    expect(sc.slots[chair]).toBeNull();
  });
});
