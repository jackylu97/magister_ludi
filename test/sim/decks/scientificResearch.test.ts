/**
 * **Scientific batch S6, the research record** (`docs/plans/scientific-build-
 * triage.md`, the S6 section and readings 16, 17, 39 and 40).
 *
 * What this file checks:
 *
 *   - the two tallies `settleResearch` writes: `techCompleted` for every
 *     technology and `charterTechCompleted` for a charter technology, only
 *     for a seated card, with the technology carried for a goal's `tech`
 *     floor (batch S9's The Great Instrument);
 *   - the `techCost` measure: the folded price the seat paid (reading 39);
 *   - the two counts, `techsKnown` (charter technologies included, reading
 *     17) and `chartersDrafted`;
 *   - a grant paid to each town by its own citizens (`fromTownPopulation`,
 *     reading 40);
 *   - The Age of Reason's `techCountsTwice`, read where the `tech` occasion
 *     pays an Order's riders and where the technology tallies are written;
 *   - the eleven cards on a board, and the words they print.
 */

import { describe, expect, it } from 'vitest';
import { drawOrderOffer } from '../../../src/sim/statecraft/draft';

import { explainUnitCost, foldUnitCost, foundCityAt, loseCitizen, settlePopulationWindfall } from '../../../src/sim/cities';
import { runCommissions } from '../../../src/sim/commissions';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { techsKnownCount } from '../../../src/sim/rivals';
import {
  type City,
  type GameState,
  addBuilding,
  bumpRevision,
  playerById,
} from '../../../src/sim/state';
import {
  cardProduction,
  commissionFulfilledTurn,
  countOf,
  describeCard,
  stripRefs,
  tallyOf,
  techCountsFor,
} from '../../../src/sim/statecraft';
import { windfallPayout } from '../../../src/sim/statecraft/evaluator';
import {
  type CardPaysEffect,
  type CommissionGoal,
  DOCTRINE_IDS,
  type OrderId,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';
import { explainTechCost, foldTechCost, settleResearch } from '../../../src/sim/tech';
import { CHARTER_TECH_IDS, type TechId } from '../../../src/sim/techData';
import { resetVisibility } from '../../../src/sim/visibility';
import { explainCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

// --- the bench -----------------------------------------------------------------

/** A blank grassland board, twenty by twelve, with two seats and nothing on it. */
function bench(): GameState {
  const width = 20;
  const height = 12;
  const state = newGame({
    seed: 29,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A town for a seat, with an empty queue. The first one a seat founds is its capital. */
function town(state: GameState, playerId: number, col: number, row: number, population = 1): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.queue = [];
  city.population = population;
  bumpRevision(state);
  return city;
}

/** Grants a card and seats it, the way `scientific.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Takes a card out of its chair and leaves it in the collection. */
function unseat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  sc.slots = sc.slots.filter((held) => held?.card !== id);
  bumpRevision(state);
}

/** The ordinary technologies of the first age that no seat starts with. */
const FIRST_AGE: readonly TechId[] = [
  'husbandry',
  'fletching',
  'mining',
  'earthenware',
  'stonecraft',
  'calendar',
  'divination',
];

/**
 * Completes a technology through the one completion routine, with the pool
 * holding exactly its folded price. A charter technology is drafted first, as
 * the pick leaves it.
 */
function complete(state: GameState, playerId: number, tech: TechId): number {
  const player = playerById(state, playerId)!;
  if (CHARTER_TECH_IDS.includes(tech) && !player.charteredTechs.includes(tech)) {
    player.charteredTechs.push(tech);
  }
  player.researching = tech;
  player.researchQueue = [];
  const price = foldTechCost(explainTechCost(state, player, tech));
  player.sciencePool = price;
  const done = settleResearch(state, player);
  expect(done?.techId, tech).toBe(tech);
  bumpRevision(state);
  return done!.cost;
}

/** The sum of one voice over a town's ledger lines whose label holds `name`. */
function cityLines(
  state: GameState,
  city: City,
  name: string,
  voice: 'production' | 'culture' | 'science' | 'faith',
): number {
  return explainCity(state, city)
    .lines.filter((line) => line.source.includes(name))
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The words a card prints, with the keyword marks stripped. */
function said(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

const S6: readonly OrderId[] = [
  'theRoyalWorkshops',
  'thePrizeEssay',
  'theSkyWatchers',
  'theAstronomicalDiaries',
  'theScholarsFame',
  'theCharterRolls',
  'theRoyalCharterCommission',
  'theAgeOfReason',
  'theJourneymen',
  'theSumOfKnowledge',
  'theGreatCatalogue',
];

// --- the register ----------------------------------------------------------------

describe('the register', () => {
  it('deals the eleven rows, each typed, with text and no deferred sentence, but The Prize Essay', () => {
    for (const id of S6) {
      const def = orderDef(id);
      expect(def.deferred, id).toBeUndefined();
      expect(def.text, id).toBeTruthy();
      expect(def.decks, id).toEqual(['scientific']);
      // Batch R3 retired The Prize Essay (the user, 2026-10-28: "remove, too
      // similar to royal workshops"). Its row stays for saves, untyped and
      // dealt to nobody, and a seat that holds it is still paid (below).
      if (id === 'thePrizeEssay' || id === 'theAgeOfReason') {
        expect(def.retired, id).toBe(true);
        expect(orderIsDealt(id), id).toBe(false);
        expect(def.type, id).toBeUndefined();
        continue;
      }
      expect(orderIsDealt(id), id).toBe(true);
      expect(def.type, id).toBeDefined();
    }
  });

  it('prints each card in plain words through the describers', () => {
    expect(said('theRoyalWorkshops')).toEqual([
      'completing a technology grants +15 production to your capital',
    ]);
    expect(said('thePrizeEssay')).toEqual([
      'completing a technology (before any other empire) grants +15 culture',
      'completing a technology (before any other empire) grants +15 production to your capital',
    ]);
    expect(said('theSkyWatchers')).toMatchInlineSnapshot(`
      [
        "+2 science, +1 faith in every city with a Shrine",
      ]
    `);
    // The starting science and culture are printed on the card face.
    expect(said('theAstronomicalDiaries')).toEqual([
      'Scaler',
      'Gains +1 science and +1 culture in your capital each time one of your towns grows past 8 citizens',
    ]);
    expect(said('theScholarsFame')).toEqual([
      'completing a technology grants renown equal to 5% of the science it cost you, favouring a great scholar',
    ]);
    expect(said('theCharterRolls')).toMatchInlineSnapshot(`
      [
        "your Order drafts include an extra charter if one is available",
      ]
    `);
    expect(said('theRoyalCharterCommission')).toEqual([
      'Commission',
      'Goal: complete 1 charter technology. Reward: a great scholar to call, and +100 culture',
    ]);
    expect(said('theAgeOfReason')).toEqual(['your Orders count each technology you complete twice']);
    expect(said('theJourneymen')).toEqual([
      'completing a technology grants each of your cities production equal to 3 times its population',
    ]);
    expect(said('theSumOfKnowledge')).toMatchInlineSnapshot(`
      [
        "+2 production in every city raising the Magnum Opus per technology you know",
      ]
    `);
    expect(said('theGreatCatalogue')).toEqual([
      '+10% production toward The Magnum Opus per charter you hold',
    ]);
  });
});

// --- the tallies ---------------------------------------------------------------

describe('the research record: the two tallies', () => {
  it('counts each new size above eight while seated, including a multi-citizen grant', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4, 7);
    capital.largestSize = 7;
    const sc = playerById(state, 0)!.statecraft;
    slot(state, 0, 'theAstronomicalDiaries');
    settlePopulationWindfall(state, capital, 1);
    expect(tallyOf(sc, 'theAstronomicalDiaries')).toBe(0);
    settlePopulationWindfall(state, capital, 2);
    expect(tallyOf(sc, 'theAstronomicalDiaries')).toBe(2);
    loseCitizen(state, capital);
    settlePopulationWindfall(state, capital, 1);
    expect(tallyOf(sc, 'theAstronomicalDiaries')).toBe(2);
    complete(state, 0, FIRST_AGE[0]!);
    expect(tallyOf(sc, 'theAstronomicalDiaries')).toBe(2);
    unseat(state, 0, 'theAstronomicalDiaries');
    settlePopulationWindfall(state, capital, 1);
    expect(tallyOf(sc, 'theAstronomicalDiaries')).toBe(2);
  });

  it('counts a charter technology for The Royal Charter Commission, and an ordinary one not at all', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const sc = playerById(state, 0)!.statecraft;
    slot(state, 0, 'theRoyalCharterCommission');
    complete(state, 0, FIRST_AGE[0]!);
    expect(tallyOf(sc, 'theRoyalCharterCommission')).toBe(0);
    complete(state, 0, 'herbals');
    expect(tallyOf(sc, 'theRoyalCharterCommission')).toBe(1);
  });

  it('carries the technology for a goal’s tech floor (batch S9’s The Great Instrument)', () => {
    // No live row carries a `tech` floor until S9. The test lends one to The
    // Royal Charter Commission's goal for its own length, and puts it back.
    const goal = orderDef('theRoyalCharterCommission').commission!.goals[0] as Extract<
      CommissionGoal,
      { kind: 'counted' }
    >;
    const kept = { occasion: goal.occasion };
    goal.occasion = 'techCompleted';
    goal.tech = FIRST_AGE[1]!;
    try {
      const state = bench();
      town(state, 0, 4, 4);
      const sc = playerById(state, 0)!.statecraft;
      slot(state, 0, 'theRoyalCharterCommission');
      complete(state, 0, FIRST_AGE[0]!);
      expect(tallyOf(sc, 'theRoyalCharterCommission'), 'another technology').toBe(0);
      complete(state, 0, FIRST_AGE[1]!);
      expect(tallyOf(sc, 'theRoyalCharterCommission'), 'the named technology').toBe(1);
    } finally {
      goal.occasion = kept.occasion;
      delete goal.tech;
    }
  });
});

// --- the counts ------------------------------------------------------------------

describe('the research record: the two counts', () => {
  const probe = (count: 'techsKnown' | 'chartersDrafted'): CardPaysEffect => ({
    kind: 'pays',
    where: 'capital',
    basis: 'count',
    count,
    to: 'production',
    amount: 1,
  });

  it('techsKnown is the count The Edge of the Sword compares, charter technologies included', () => {
    const state = bench();
    const player = playerById(state, 0)!;
    const before = countOf(state, 0, 'theSumOfKnowledge', probe('techsKnown'));
    expect(before).toBe(techsKnownCount(player));
    player.techsResearched.push('husbandry', 'herbals');
    bumpRevision(state);
    expect(countOf(state, 0, 'theSumOfKnowledge', probe('techsKnown'))).toBe(before + 2);
    expect(countOf(state, 0, 'theSumOfKnowledge', probe('techsKnown'))).toBe(techsKnownCount(player));
  });

  it('chartersDrafted counts the charters held from the pick, researched or not', () => {
    const state = bench();
    const sc = playerById(state, 0)!.statecraft;
    expect(countOf(state, 0, 'theCharterRolls', probe('chartersDrafted'))).toBe(0);
    sc.orders.push('theHerbalistsCharter', 'theGlassmakersCharter', 'scientificTheAlmanac');
    bumpRevision(state);
    // Two charters; The Almanac is no charter.
    expect(countOf(state, 0, 'theCharterRolls', probe('chartersDrafted'))).toBe(2);
  });
});

// --- the cards on a board --------------------------------------------------------

describe('the cards on a board', () => {
  it('The Royal Workshops: 15 production in the capital for each technology', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4);
    town(state, 0, 12, 4);
    slot(state, 0, 'theRoyalWorkshops');
    const basket = capital.hammerBasket;
    complete(state, 0, FIRST_AGE[0]!);
    expect(capital.hammerBasket - basket).toBe(15);
  });

  it('The Royal Workshops: the production settles at once and finishes what it covers', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4);
    slot(state, 0, 'theRoyalWorkshops');
    capital.queue = [{ kind: 'unit', id: 'warrior' }];
    // The basket short of a warrior by less than the grant.
    capital.hammerBasket = Math.max(0, foldUnitCost(explainUnitCost(state, 0, 'warrior')) - 10);
    bumpRevision(state);
    const warriors = () => state.units.filter((unit) => unit.ownerId === 0 && unit.type === 'warrior').length;
    const before = warriors();
    complete(state, 0, FIRST_AGE[0]!);
    expect(warriors()).toBe(before + 1);
    expect(capital.queue).toEqual([]);
  });

  it('The Prize Essay: the first empire to a technology is paid, the second is not, and a charter technology never is', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4);
    const theirs = town(state, 1, 14, 8);
    slot(state, 0, 'thePrizeEssay');
    slot(state, 1, 'thePrizeEssay');
    let basket = capital.hammerBasket;
    complete(state, 0, FIRST_AGE[0]!);
    expect(capital.hammerBasket - basket, 'first to it').toBe(15);
    const second = theirs.hammerBasket;
    complete(state, 1, FIRST_AGE[0]!);
    expect(theirs.hammerBasket - second, 'second to it').toBe(0);
    // A charter technology marks no first (reading 16).
    basket = capital.hammerBasket;
    complete(state, 0, 'herbals');
    expect(capital.hammerBasket - basket, 'a charter technology').toBe(0);
    // The culture half rides the same narrowing.
    const rides = windfallPayout(state, 0, 'tech', 0, 0, { firsts: ['techWorld'], tech: 'mining' });
    expect(rides.grants.filter((grant) => grant.card === 'thePrizeEssay').map((grant) => grant.yield)).toEqual([
      'culture',
      'production',
    ]);
    expect(windfallPayout(state, 0, 'tech', 0, 0, { firsts: [], tech: 'mining' }).grants).toEqual([]);
  });

  it('The Sky Watchers: a town with a Shrine gains +1 faith and +2 science', () => {
    const state = bench();
    const city = town(state, 0, 4, 4);
    slot(state, 0, 'theSkyWatchers');
    expect(cityLines(state, city, 'The Sky Watchers', 'faith')).toBe(0);
    addBuilding(state, city, 'shrine');
    bumpRevision(state);
    expect(cityLines(state, city, 'The Sky Watchers', 'faith')).toBe(1);
    expect(cityLines(state, city, 'The Sky Watchers', 'science')).toBe(2);
  });

  it('The Astronomical Diaries pays its starting yields and qualifying growth only to the capital', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4);
    const other = town(state, 0, 12, 4, 8);
    other.largestSize = 8;
    slot(state, 0, 'theAstronomicalDiaries');
    expect(cityLines(state, capital, 'The Astronomical Diaries', 'science')).toBe(2);
    expect(cityLines(state, capital, 'The Astronomical Diaries', 'culture')).toBe(2);
    settlePopulationWindfall(state, other, 2);
    expect(cityLines(state, capital, 'The Astronomical Diaries', 'science')).toBe(4);
    expect(cityLines(state, capital, 'The Astronomical Diaries', 'culture')).toBe(4);
    expect(cityLines(state, capital, 'The Astronomical Diaries', 'production')).toBe(0);
    expect(cityLines(state, other, 'The Astronomical Diaries', 'culture')).toBe(0);
  });

  it('The Scholars’ Fame: a twentieth of the price paid, as renown for great scholars (reading 39)', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theScholarsFame');
    const before = player.renownByFamily.scholar ?? 0;
    const paid = complete(state, 0, FIRST_AGE[0]!);
    expect((player.renownByFamily.scholar ?? 0) - before).toBeCloseTo(paid / 20, 6);
    // Renown uses the discounted charter price that the seat actually paid.
    const charter = 'herbals';
    const price = foldTechCost(explainTechCost(state, player, charter));
    const middle = player.renownByFamily.scholar ?? 0;
    expect(complete(state, 0, charter)).toBe(price);
    expect((player.renownByFamily.scholar ?? 0) - middle).toBeCloseTo(price / 20, 6);
  });

  it('The Journeymen: each town is paid three times its own citizens (reading 40)', () => {
    const state = bench();
    const small = town(state, 0, 4, 4, 3);
    const large = town(state, 0, 12, 4, 5);
    slot(state, 0, 'theJourneymen');
    const a = small.hammerBasket;
    const b = large.hammerBasket;
    complete(state, 0, FIRST_AGE[0]!);
    expect(small.hammerBasket - a).toBe(9);
    expect(large.hammerBasket - b).toBe(15);
  });

  it('The Charter Rolls deal an extra available charter after the ordinary hand', () => {
    const state = bench();
    const player = playerById(state, 0)!;
    const plain = drawOrderOffer(structuredClone(state), structuredClone(player));
    slot(state, 0, 'theCharterRolls');
    const offered = drawOrderOffer(state, player);
    expect(offered.options.slice(0, plain.options.length)).toEqual(plain.options);
    expect(offered.options).toHaveLength(plain.options.length + 1);
    expect(orderDef(offered.options[offered.options.length - 1]!).charter).toBeDefined();
    expect(new Set(offered.options).size).toBe(offered.options.length);
  });

  it('The Royal Charter Commission: met by a charter technology, it pays a great scholar and 100 culture', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const sc = playerById(state, 0)!.statecraft;
    slot(state, 0, 'theRoyalCharterCommission');
    complete(state, 0, FIRST_AGE[0]!);
    expect(runCommissions(state), 'an ordinary technology meets nothing').toEqual([]);
    complete(state, 0, 'herbals');
    const reports = runCommissions(state);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.card).toBe('theRoyalCharterCommission');
    expect(reports[0]!.lines).toContain('+100 culture');
    expect(reports[0]!.lines.some((line) => line.includes('great scholar'))).toBe(true);
    expect(commissionFulfilledTurn(sc, 'theRoyalCharterCommission')).toBe(state.turn);
    expect(sc.slots.some((held) => held?.card === 'theRoyalCharterCommission')).toBe(false);
  });

  it('The Sum of Knowledge pays the town raising the Magnum Opus for each known technology', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theSumOfKnowledge');
    const known = techsKnownCount(player);
    expect(known).toBeGreaterThan(0);
    expect(cityLines(state, capital, 'The Sum of Knowledge', 'production')).toBe(0);
    capital.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    bumpRevision(state);
    expect(cityLines(state, capital, 'The Sum of Knowledge', 'production')).toBe(known * 2);
    complete(state, 0, 'herbals');
    expect(cityLines(state, capital, 'The Sum of Knowledge', 'production')).toBe((known + 1) * 2);
  });

  it('The Great Catalogue counts held charters across decks without a cap', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theGreatCatalogue');
    const toward = (): number =>
      cardProduction(state, capital, 'building', undefined, 'theMagnumOpus')
        .filter((line) => line.card === 'theGreatCatalogue')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(toward()).toBe(0);
    player.statecraft.orders.push('theHerbalistsCharter', 'theObserversCharter');
    bumpRevision(state);
    expect(toward()).toBe(20);
    player.statecraft.orders.push('theBronzeFoundersCharter', 'theSurveyorsCharter', 'theAlchemistsCharter', 'theLibrariansCharter', 'theSchoolmensCharter');
    bumpRevision(state);
    expect(toward(), 'seven held, including shared charters and unresearched technologies').toBe(70);
    // Nothing toward an ordinary building.
    expect(
      cardProduction(state, capital, 'building', undefined, 'granary').filter(
        (line) => line.card === 'theGreatCatalogue',
      ),
    ).toEqual([]);
  });
});

// --- The Age of Reason -------------------------------------------------------------

describe('The Age of Reason', () => {
  it('counts each technology twice for an Order, and once for anything else', () => {
    const state = bench();
    town(state, 0, 4, 4);
    expect(techCountsFor(state, 0)).toBe(1);
    slot(state, 0, 'theAgeOfReason');
    expect(techCountsFor(state, 0)).toBe(2);
    expect(techCountsFor(state, 0, 'theRoyalWorkshops')).toBe(2);
    expect(techCountsFor(state, 0, DOCTRINE_IDS[0]!), 'a Doctrine').toBe(1);
  });

  it('pays an Order’s technology riders twice', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4, 2);
    town(state, 0, 12, 4, 4);
    slot(state, 0, 'theRoyalWorkshops');
    slot(state, 0, 'theJourneymen');
    slot(state, 0, 'theAgeOfReason');
    const basket = capital.hammerBasket;
    complete(state, 0, FIRST_AGE[0]!);
    // Twice 15, and twice 3 × 2 citizens.
    expect(capital.hammerBasket - basket).toBe(30 + 12);
  });

  it('writes charter completion tallies twice without advancing the growth card', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const sc = playerById(state, 0)!.statecraft;
    slot(state, 0, 'theRoyalCharterCommission');
    slot(state, 0, 'theAstronomicalDiaries');
    slot(state, 0, 'theAgeOfReason');
    complete(state, 0, 'herbals');
    expect(tallyOf(sc, 'theRoyalCharterCommission')).toBe(2);
    expect(tallyOf(sc, 'theAstronomicalDiaries')).toBe(0);
  });

  it('pays nothing twice on any other occasion', () => {
    const state = bench();
    town(state, 0, 4, 4);
    slot(state, 0, 'theAgeOfReason');
    slot(state, 0, 'theProspectorsNotes');
    const built = windfallPayout(state, 0, 'improvementBuilt', 0, 0, { improvement: 'mine' });
    expect(built.grants.filter((grant) => grant.card === 'theProspectorsNotes')).toHaveLength(1);
  });
});
