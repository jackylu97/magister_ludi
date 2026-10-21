/**
 * **Scientific batch S8, great people and the great houses**
 * (`docs/plans/scientific-build-triage.md`, the S8 section and readings 36 to
 * 38, 47 and 53, and the new readings 88 to 94, which the report lists).
 *
 * What this file checks:
 *
 *   - the eleven rows are dealt, typed and worded as `docs/decks/scientific.md`
 *     writes them, and print in plain words through the describers;
 *   - the new shapes:
 *       - a great person granted by a rider (`WindfallGrantSpec.greatPerson`),
 *         dealt as an offer the way a commission's great person is;
 *       - an any-of filter on the completion rider (`anyOf`), which pays once
 *         for a building in two of the named classes;
 *       - the `scholarLadderStep` rule, read by `renownThreshold`, which takes
 *         the state now;
 *       - a counted lift of the one-to-a-realm limit with a town scope
 *         (`buildsEverywhere` with `empireBuilding`, `max` and `scope`);
 *       - a town scope on `unlocksBuilding`, read by `isUnlocked` and
 *         `buildError` with the town in hand;
 *       - the `academyHexes` commission figure, and `eachTown` with a scope;
 *   - each card on a board, one test per card, each checking both sides of the
 *     line it draws.
 */

import { describe, expect, it } from 'vitest';

import { type BuildingId } from '../../../src/sim/buildingData';
import { foundCityAt, payOccasionRiders, realiseItem, refreshCityDerived } from '../../../src/sim/cities';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { commissionFigure, runCommissions } from '../../../src/sim/commissions';
import { greatPersonDef } from '../../../src/sim/greatPeopleData';
import { type Tile, createMap, getTileAt, raiseImprovement } from '../../../src/sim/map';
import { renownThreshold } from '../../../src/sim/renown';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  addBuilding,
  bumpRevision,
  playerById,
} from '../../../src/sim/state';
import {
  cardBuildsEverywhere,
  cardLimitLifts,
  commissionFulfilledTurn,
  describeCard,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  cardCityStat,
  explainCardPercentYields,
  windfallPayout,
} from '../../../src/sim/statecraft/evaluator';
import { type CardType, type OrderId, type OrderRarity, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { buildError, gatingTech, isUnlocked } from '../../../src/sim/tech';
import { resetVisibility } from '../../../src/sim/visibility';
import { foldEmpireRates } from '../../../src/sim/yields/empire';
import { explainCity, foldCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';
import { keepTheRites } from '../statecraftHelpers';

// --- the bench -----------------------------------------------------------------

/** A blank grassland board, twenty by twelve, with two seats and nothing on it. */
function bench(): GameState {
  const width = 20;
  const height = 12;
  const state = newGame({
    seed: 31,
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

/** Raises a building in a town, as a finished queue row leaves it, with no riders paid. */
function raise(state: GameState, city: City, id: BuildingId): void {
  addBuilding(state, city, id);
  bumpRevision(state);
  refreshCityDerived(state, city);
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

/** Teaches a seat the technology that opens a building row. */
function learnFor(state: GameState, playerId: number, building: BuildingId): void {
  const tech = gatingTech('building', building);
  expect(tech, `${building} has a technology`).not.toBeNull();
  const player = playerById(state, playerId)!;
  if (!player.techsResearched.includes(tech!)) player.techsResearched.push(tech!);
  bumpRevision(state);
}

/** The percentage one card puts on one voice in one town. */
function percentOn(state: GameState, city: City, id: OrderId, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === id && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** The words a card prints, with the keyword marks stripped. */
function said(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

/** The draft ladder's price for `n` steps, as `renownThreshold` computes it. */
function rung(n: number): number {
  const ladder = RULES.renown;
  return Math.floor(ladder.base + ladder.linear * n + n ** ladder.exponent);
}

// --- the rows --------------------------------------------------------------------

const S8: readonly { id: OrderId; band: number; rarity: OrderRarity; type: CardType; text: string }[] = [
  {
    id: 'theForwardPlans',
    band: 1,
    rarity: 'rare',
    type: 'civic',
    text: 'You may build a University in any city whose Library has stood at least 30 turns, before you know Scholarship.',
  },
  {
    id: 'theDedications',
    band: 1,
    rarity: 'uncommon',
    type: 'civic',
    text: "Finishing a science building or an empire building grants culture equal to ten times the town's population.",
  },
  {
    id: 'theRoyalReaders',
    band: 2,
    rarity: 'rare',
    type: 'civic',
    text: 'Great scholars raise the price of your next great person by half as much.',
  },
  {
    id: 'theInvitations',
    band: 2,
    rarity: 'rare',
    type: 'civic',
    text: 'Completing an empire building grants a great scholar.',
  },
  {
    id: 'theSecondSeat',
    band: 3,
    rarity: 'rare',
    type: 'civic',
    text: 'You may build one second copy of an empire building, in a city with a University.',
  },
  {
    id: 'theDoctorate',
    band: 3,
    rarity: 'common',
    type: 'civic',
    text: 'Gaining a great scholar grants culture equal to eight turns of your culture.',
  },
  {
    id: 'theRoyalAcademies',
    band: 3,
    rarity: 'uncommon',
    type: 'civic',
    text: '+5% production and culture for each empire building you hold.',
  },
  {
    id: 'theQueenOfCities',
    band: 3,
    rarity: 'rare',
    type: 'economic',
    text: 'Towns of at least 15 citizens produce twice their food and production.',
  },
  {
    id: 'theHumanists',
    band: 3,
    rarity: 'uncommon',
    type: 'civic',
    text: 'Cities with a University gain culture equal to half their base science.',
  },
  {
    id: 'theWallsOfLearning',
    band: 4,
    rarity: 'common',
    type: 'military',
    text: 'Cities with a University gain +6 strength, and the city building your Magnum Opus gains +12 more.',
  },
  {
    id: 'theLynxEyedAcademy',
    band: 4,
    rarity: 'rare',
    type: 'wildcard',
    text: 'Commission. Hold four Academies while this is seated. Reward: a great scholar, and 300 production in each city with an Academy toward what it is building. Then it leaves its chair.',
  },
];

describe('the rows', () => {
  it('deals the eleven rows with the sheet’s tier, rarity, type and text', () => {
    for (const { id, band, rarity, type, text } of S8) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(def.deferred, id).toBeUndefined();
      expect(def.retired, id).toBeUndefined();
      expect(def.decks, id).toEqual(['scientific']);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.text, id).toBe(text);
      expect(def.effects.length > 0 || def.commission !== undefined, id).toBe(true);
    }
  });

  it('prints each card in plain words through the describers', () => {
    expect(said('theForwardPlans')[0]).toMatch(
      /^unlocks the University in any city with a Library that has stood at least 30 turns/,
    );
    expect(said('theDedications')).toEqual([
      "completing a building (a science building or an empire building) grants culture equal to 10 times the city's population",
    ]);
    expect(said('theRoyalReaders')).toEqual([
      'great scholars raise the price of your next great person by half as much',
    ]);
    expect(said('theInvitations')).toEqual([
      'completing a building (an empire building) grants a great scholar to call',
    ]);
    expect(said('theSecondSeat')).toEqual([
      'you may build one second copy of an empire building, in a city with a University',
    ]);
    expect(said('theDoctorate')).toEqual(['gaining a great scholar grants 8 extra turns of culture']);
    expect(said('theRoyalAcademies')).toEqual([
      '+5% production per empire building you hold',
      '+5% culture per empire building you hold',
    ]);
    expect(said('theQueenOfCities')).toEqual([
      '+100% food in every city of 15 or more citizens',
      '+100% production in every city of 15 or more citizens',
    ]);
    expect(said('theHumanists')).toEqual([
      '50% of the science in every city with a University is gained again as culture',
    ]);
    expect(said('theWallsOfLearning')).toEqual([
      'every city with a University: +6 city defence',
      'every city raising the Magnum Opus: +12 city defence',
    ]);
    expect(said('theLynxEyedAcademy')).toEqual([
      'Commission. Goal: hold 4 Academies inside your borders, while this card is seated',
      'Reward: a great scholar to call, and +300 production in every city with an Academy',
      'then this card leaves its chair and is never seated again',
    ]);
  });
});

// --- the great people -------------------------------------------------------------

describe('great people', () => {
  it('The Invitations: an empire building completed deals a great scholar to call', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    keepTheRites(state);
    slot(state, 0, 'theInvitations');
    const player = playerById(state, 0)!;
    // An ordinary building is not an empire building.
    realiseItem(state, city, { kind: 'building', id: 'granary' });
    expect(player.greatPersonOffer).toBeUndefined();
    // A great house is, built or bought: both go through the one completion
    // routine (the triage's reading 37).
    realiseItem(state, city, { kind: 'building', id: 'forum' });
    const offer = player.greatPersonOffer;
    expect(offer).toBeDefined();
    expect(offer!.options.length).toBeGreaterThan(0);
    for (const id of offer!.options) expect(greatPersonDef(id).family, id).toBe('scholar');
    // No renown changed hands: the offer was dealt outright.
    expect(player.renownPool).toBe(0);
  });

  it('The Invitations: with an offer already waiting, or before the rites, the renown for the next rung is paid', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    slot(state, 0, 'theInvitations');
    const player = playerById(state, 0)!;
    // Before the ancestor rites nobody can be called, so the ladder is filled
    // to its next rung and the scholar's family is fed.
    realiseItem(state, city, { kind: 'building', id: 'forum' });
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownPool).toBe(renownThreshold(state, player));
    expect(player.renownByFamily.scholar).toBe(renownThreshold(state, player));
    // Not paid again by a building that is not a great house.
    realiseItem(state, city, { kind: 'building', id: 'granary' });
    expect(player.renownPool).toBe(renownThreshold(state, player));
  });

  it('The Royal Readers: each great scholar is half a step on the price ladder', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const player = playerById(state, 0)!;
    player.greatPeopleRecruited = 4;
    player.greatPeopleByFamily = { scholar: 4 };
    bumpRevision(state);
    expect(renownThreshold(state, player)).toBe(rung(4));
    expect(renownThreshold(state, player)).toBe(834);
    slot(state, 0, 'theRoyalReaders');
    // Four scholars and nobody else: two steps, so 441 instead of 834 (the
    // themes doc's own figure).
    expect(renownThreshold(state, player)).toBe(rung(2));
    expect(renownThreshold(state, player)).toBe(441);
    // A general is still a whole step: two generals and two scholars are three.
    player.greatPeopleByFamily = { general: 2, scholar: 2 };
    bumpRevision(state);
    expect(renownThreshold(state, player)).toBe(rung(3));
    // Three scholars are a step and a half, and only the price is floored.
    player.greatPeopleRecruited = 3;
    player.greatPeopleByFamily = { scholar: 3 };
    bumpRevision(state);
    expect(renownThreshold(state, player)).toBe(rung(1.5));
    expect(rung(1.5)).toBeLessThan(rung(2));
    // Unseated, the ladder is the ordinary one again.
    unseat(state, 0, 'theRoyalReaders');
    expect(renownThreshold(state, player)).toBe(rung(3));
  });

  it('The Doctorate: a great scholar gained pays eight turns of culture, and a general pays nothing', () => {
    const state = bench();
    const capital = town(state, 0, 4, 5);
    raise(state, capital, 'monument');
    slot(state, 0, 'theDoctorate');
    const rate = foldEmpireRates(state, 0).culturePerTurn;
    expect(rate).toBeGreaterThan(0);
    const paid = (family: 'scholar' | 'general') =>
      windfallPayout(state, 0, 'greatPersonGained', 0, 0, { family })
        .grants.filter((grant) => grant.card === 'theDoctorate' && grant.yield === 'culture')
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(paid('scholar')).toBeCloseTo(8 * rate, 9);
    expect(paid('general')).toBe(0);
    // Paid into the pool through the one seam the moment pays through. The
    // next draft is put out of reach so the pool is not spent on one.
    const player = playerById(state, 0)!;
    player.statecraft.drafts = 29;
    const before = player.culturePool;
    payOccasionRiders(state, player, 'greatPersonGained', undefined, { family: 'scholar' });
    expect(player.culturePool - before).toBeCloseTo(8 * rate, 9);
  });

  it('The Dedications: a science building or an empire building pays ten times the town, and a building in both pays once', () => {
    const state = bench();
    const city = town(state, 0, 4, 5, 6);
    slot(state, 0, 'theDedications');
    const culture = (id: BuildingId) =>
      windfallPayout(state, 0, 'buildingCompletion', 0, 0, { building: id, population: city.population })
        .grants.filter((grant) => grant.card === 'theDedications')
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(culture('granary')).toBe(0);
    expect(culture('library')).toBe(60);
    expect(culture('forum')).toBe(60);
    // Chart the Stars is a science building and an empire building: once
    // (the triage's reading 36).
    expect(culture('chartTheStars')).toBe(60);
    // On the board, through the one completion routine. The next draft is put
    // out of reach so the pool is not spent on one.
    const player = playerById(state, 0)!;
    player.statecraft.drafts = 29;
    const before = player.culturePool;
    realiseItem(state, city, { kind: 'building', id: 'library' });
    expect(player.culturePool - before).toBe(60);
  });
});

// --- the great houses -------------------------------------------------------------

describe('the great houses', () => {
  /** Three towns, the Forum standing in the first, and the technologies for two houses. */
  function houses(): { state: GameState; a: City; b: City; c: City } {
    const state = bench();
    const a = town(state, 0, 4, 3);
    const b = town(state, 0, 12, 3);
    const c = town(state, 0, 8, 9);
    learnFor(state, 0, 'forum');
    learnFor(state, 0, 'heroicEpic');
    raise(state, a, 'forum');
    return { state, a, b, c };
  }

  it('The Second Seat: one second copy, only in a town with a University', () => {
    const { state, a, b } = houses();
    expect(buildError(state, 0, 'building', 'forum', b)).toBe(`Forum already stands in ${a.name}`);
    slot(state, 0, 'theSecondSeat');
    // The panel shows the row in every town now (`cardBuildsEverywhere`), and
    // the gate says why a town without a University is refused.
    expect(cardBuildsEverywhere(state, 0, 'forum')).toBe(true);
    expect(buildError(state, 0, 'building', 'forum', b)).toBe(
      `Forum already stands in ${a.name}; your Order allows another copy only in a city with a University`,
    );
    raise(state, b, 'university');
    expect(buildError(state, 0, 'building', 'forum', b)).toBeNull();
    // A caller with no town in hand gets the stricter reading.
    expect(buildError(state, 0, 'building', 'forum')).toBe(`Forum already stands in ${a.name}`);
    // And a town never holds two copies of one row.
    raise(state, b, 'forum');
    expect(buildError(state, 0, 'building', 'forum', b)).toBe(`Forum already stands in ${b.name}`);
    b.buildings = b.buildings.filter((row) => row !== 'forum');
    bumpRevision(state);
    // Unseated, the limit is back.
    unseat(state, 0, 'theSecondSeat');
    expect(buildError(state, 0, 'building', 'forum', b)).toBe(`Forum already stands in ${a.name}`);
  });

  it('The Second Seat: one extra copy in all, standing or being built (reading 47)', () => {
    const { state, a, b, c } = houses();
    slot(state, 0, 'theSecondSeat');
    raise(state, b, 'university');
    raise(state, c, 'university');
    raise(state, a, 'heroicEpic');
    b.queue = [{ kind: 'building', id: 'forum' }];
    bumpRevision(state);
    // The second Forum is being built in B, so no other house may have a
    // second copy, and the Forum may not have a third.
    expect(buildError(state, 0, 'building', 'heroicEpic', c)).toMatch(/your Order's one extra copy is already standing or being built/);
    expect(buildError(state, 0, 'building', 'forum', c)).toMatch(/your Order's one extra copy is already standing or being built/);
    // B re-sending its own queue is fine: it is the row being asked about.
    expect(buildError(state, 0, 'building', 'forum', b)).toBeNull();
    // Once it stands, the copy still counts.
    b.queue = [];
    realiseItem(state, b, { kind: 'building', id: 'forum' });
    expect(b.buildings).toContain('forum');
    expect(buildError(state, 0, 'building', 'heroicEpic', c)).toMatch(/your Order's one extra copy is already standing or being built/);
  });

  it('The Second Seat: two second copies sent in one queue are refused, one is taken', () => {
    const { state, a, b } = houses();
    slot(state, 0, 'theSecondSeat');
    raise(state, b, 'university');
    raise(state, a, 'heroicEpic');
    const send = (queue: BuildingId[]) =>
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: b.id,
        queue: queue.map((id) => ({ kind: 'building', id })),
      } as Command);
    const refused = send(['forum', 'heroicEpic']);
    expect(refused.ok).toBe(false);
    expect(refused.ok === false && refused.error).toMatch(/your Order's one extra copy is already standing or being built/);
    expect(b.queue).toEqual([]);
    expect(send(['forum']).ok).toBe(true);
    expect(b.queue).toEqual([{ kind: 'building', id: 'forum' }]);
    // And a second command adding the Heroic Epic is refused the same way.
    expect(send(['forum', 'heroicEpic']).ok).toBe(false);
  });

  it('The Second Seat: never reaches the Magnum Opus, and Caravanserai Cities still lifts its yard outright', () => {
    const state = bench();
    town(state, 0, 4, 5);
    slot(state, 0, 'theSecondSeat');
    expect(cardLimitLifts(state, 0, 'forum')).toEqual([
      { card: 'theSecondSeat', max: 1, scope: { test: 'hasBuilding', building: 'university' } },
    ]);
    expect(cardLimitLifts(state, 0, 'theMagnumOpus')).toEqual([]);
    expect(cardLimitLifts(state, 0, 'granary')).toEqual([]);
  });

  it('The Forward Plans: a University early, only in a town whose Library has stood thirty turns', () => {
    const state = bench();
    state.turn = 1;
    const a = town(state, 0, 4, 5);
    const b = town(state, 0, 12, 5);
    learnFor(state, 0, 'library');
    raise(state, a, 'library');
    state.turn = 20;
    raise(state, b, 'library');
    expect(isUnlocked(state, 0, 'building', 'university')).toBe(false);
    slot(state, 0, 'theForwardPlans');
    // Not yet thirty turns anywhere.
    state.turn = 25;
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', 'university')).toBe(false);
    const words = 'University needs Scholarship; until then your Order opens it only in a city with a Library that has stood at least 30 turns';
    expect(buildError(state, 0, 'building', 'university', a)).toBe(words);
    // Thirty turns in the first town, eleven in the second.
    state.turn = 31;
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', 'university')).toBe(true);
    expect(isUnlocked(state, 0, 'building', 'university', a)).toBe(true);
    expect(isUnlocked(state, 0, 'building', 'university', b)).toBe(false);
    expect(buildError(state, 0, 'building', 'university', a)).toBeNull();
    expect(buildError(state, 0, 'building', 'university', b)).toBe(words);
    // Scholarship opens it everywhere, card or no card.
    learnFor(state, 0, 'university');
    expect(buildError(state, 0, 'building', 'university', b)).toBeNull();
    unseat(state, 0, 'theForwardPlans');
    expect(buildError(state, 0, 'building', 'university', b)).toBeNull();
  });

  it('The Royal Academies: +5% production and culture in every town for each empire building held', () => {
    const state = bench();
    const a = town(state, 0, 4, 5);
    const b = town(state, 0, 12, 5);
    slot(state, 0, 'theRoyalAcademies');
    expect(percentOn(state, a, 'theRoyalAcademies', 'production')).toBe(0);
    raise(state, a, 'granary');
    expect(percentOn(state, a, 'theRoyalAcademies', 'production')).toBe(0);
    raise(state, a, 'forum');
    raise(state, b, 'heroicEpic');
    expect(percentOn(state, a, 'theRoyalAcademies', 'production')).toBe(10);
    expect(percentOn(state, b, 'theRoyalAcademies', 'culture')).toBe(10);
    expect(
      explainCardPercentYields(state, b)
        .filter((line) => line.card === 'theRoyalAcademies')
        .every((line) => line.stage === 'empire'),
    ).toBe(true);
  });

  it('The Walls of Learning: +6 in a University town, +12 in the town raising the Opus, and both together', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    slot(state, 0, 'theWallsOfLearning');
    const walls = () =>
      cardCityStat(state, city, 'defense')
        .filter((line) => line.card === 'theWallsOfLearning')
        .reduce((sum, line) => sum + line.amount, 0);
    expect(walls()).toBe(0);
    raise(state, city, 'university');
    expect(walls()).toBe(6);
    city.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    bumpRevision(state);
    expect(walls()).toBe(18);
    city.buildings = city.buildings.filter((id) => id !== 'university');
    bumpRevision(state);
    expect(walls()).toBe(12);
  });
});

// --- great cities -------------------------------------------------------------------

describe('great cities', () => {
  it('The Queen of Cities: a town of fifteen doubles its food and production, and a town of fourteen does not', () => {
    const state = bench();
    const city = town(state, 0, 4, 5, 15);
    const small = town(state, 0, 12, 5, 14);
    slot(state, 0, 'theQueenOfCities');
    expect(percentOn(state, city, 'theQueenOfCities', 'food')).toBe(100);
    expect(percentOn(state, city, 'theQueenOfCities', 'production')).toBe(100);
    expect(percentOn(state, small, 'theQueenOfCities', 'food')).toBe(0);
    expect(percentOn(state, small, 'theQueenOfCities', 'production')).toBe(0);
  });

  it('The Humanists: a University town gains culture equal to half its science, and a town without one nothing', () => {
    const state = bench();
    const city = town(state, 0, 4, 5, 6);
    const plain = town(state, 0, 12, 5, 6);
    raise(state, city, 'library');
    raise(state, city, 'university');
    raise(state, plain, 'library');
    const science = foldCity(state, city).science;
    expect(science).toBeGreaterThan(0);
    slot(state, 0, 'theHumanists');
    const culture = (where: City) =>
      explainCity(state, where)
        .lines.filter((line) => line.source.includes('The Humanists'))
        .reduce((sum, line) => sum + line.culture, 0);
    expect(culture(city)).toBeCloseTo(science / 2, 9);
    expect(culture(plain)).toBe(0);
  });
});

// --- the commission ---------------------------------------------------------------

describe('The Lynx-Eyed Academy', () => {
  it('counts the Academies inside the borders, as The Republic of Letters does', () => {
    const state = bench();
    const city = town(state, 0, 6, 5);
    expect(commissionFigure(state, 0, 'academyHexes')).toBe(0);
    const ring = [at(state, 7, 5), at(state, 5, 5)];
    for (const tile of ring) raiseImprovement(tile, 'academy', state.turn);
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'academyHexes')).toBe(2);
    // A hex outside the borders counts for nothing.
    raiseImprovement(at(state, 15, 10), 'academy', state.turn);
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'academyHexes')).toBe(2);
    expect(city.ownerId).toBe(0);
  });

  it('met at four Academies: a great scholar, and 300 production in each town with an Academy', () => {
    const state = bench();
    keepTheRites(state);
    const a = town(state, 0, 4, 5);
    const b = town(state, 0, 12, 5);
    const c = town(state, 0, 8, 10);
    slot(state, 0, 'theLynxEyedAcademy');
    const sc = playerById(state, 0)!.statecraft;
    // Three in the first town's borders and one in the second's.
    for (const [col, row] of [
      [5, 5],
      [3, 5],
      [4, 4],
    ] as const) {
      raiseImprovement(at(state, col, row), 'academy', state.turn);
    }
    bumpRevision(state);
    expect(runCommissions(state), 'three Academies meet nothing').toEqual([]);
    raiseImprovement(at(state, 13, 5), 'academy', state.turn);
    bumpRevision(state);
    const basket = (city: City) => city.hammerBasket;
    const before = [basket(a), basket(b), basket(c)];
    const reports = runCommissions(state);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.card).toBe('theLynxEyedAcademy');
    expect(reports[0]!.lines.some((line) => line.includes('great scholar'))).toBe(true);
    expect(basket(a) - before[0]!).toBe(300);
    expect(basket(b) - before[1]!).toBe(300);
    expect(basket(c) - before[2]!).toBe(0);
    const offer = playerById(state, 0)!.greatPersonOffer;
    expect(offer).toBeDefined();
    for (const id of offer!.options) expect(greatPersonDef(id).family, id).toBe('scholar');
    expect(commissionFulfilledTurn(sc, 'theLynxEyedAcademy')).toBe(state.turn);
    expect(sc.slots.some((held) => held?.card === 'theLynxEyedAcademy')).toBe(false);
  });
});
