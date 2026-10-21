/**
 * **Scientific batch S7, the data-only cards of Tiers 0 to II**
 * (`docs/plans/scientific-build-triage.md`, the S7 section).
 *
 * Every card here is a data row in shapes that already existed. What this
 * file checks:
 *
 *   - the twelve rows are dealt, typed and worded as `docs/decks/scientific.md`
 *     writes them, and print in plain words through the describers;
 *   - Learned Commissions is now Learned Foundations under the same id, with
 *     one effect and no riders;
 *   - Enduring Institutions pays no happiness, and The Quiet Faculties reads an
 *     Academy, not any great person's work;
 *   - each card on a board: one test per card, each checking both sides of the
 *     line it draws.
 *
 * The Roll of Scholars reads "at most +28%": a count's `max` is in helpings,
 * so seven great scholars at +4% reach +28% and the eighth adds nothing. This
 * is The Res Gestae's reading (Dominion triage, reading 19), and the
 * Scientific triage's reading 85.
 */

import { describe, expect, it } from 'vitest';

import { type BuildingId } from '../../../src/sim/buildingData';
import { foundCityAt, realiseItem, refreshCityDerived } from '../../../src/sim/cities';
import { type Tile, createMap, getTileAt, raiseImprovement, razeImprovement } from '../../../src/sim/map';
import { explainRenown } from '../../../src/sim/renown';
import {
  type City,
  type GameState,
  addBuilding,
  bumpRevision,
  playerById,
} from '../../../src/sim/state';
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import {
  cardHappiness,
  cardProduction,
  cardUnitStamp,
  explainCardPercentYields,
} from '../../../src/sim/statecraft/evaluator';
import { type CardType, type OrderId, type OrderRarity, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { unitStampStrength } from '../../../src/sim/unitData';
import { resetVisibility } from '../../../src/sim/visibility';
import { explainCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

// --- the bench -----------------------------------------------------------------

/** A blank grassland board, twenty by twelve, with two seats and nothing on it. */
function bench(): GameState {
  const width = 20;
  const height = 12;
  const state = newGame({
    seed: 17,
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

/** Raises a building in a town, as a finished queue row leaves it. */
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

/** The sum of one voice over a town's ledger lines whose label holds the card's name. */
function townLines(state: GameState, city: City, id: OrderId, voice: 'food' | 'production'): number {
  const name = orderDef(id).name;
  return explainCity(state, city)
    .lines.filter((line) => line.source.includes(name))
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The percentage one card puts on one voice in one town. */
function percentOn(state: GameState, city: City, id: OrderId, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === id && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** The production percentage one card adds toward one queue row in one town. */
function toward(
  state: GameState,
  city: City,
  id: OrderId,
  category: 'building' | 'wonder' | 'unit',
  what: string,
): number {
  const lines =
    category === 'unit'
      ? cardProduction(state, city, 'unit', what as never)
      : cardProduction(state, city, category, undefined, what as BuildingId);
  return lines.filter((line) => line.card === id).reduce((sum, line) => sum + line.percent, 0);
}

/** A unit gained in a town through the one completion routine, and its stamped strength. */
function trainedStrength(state: GameState, city: City, type: 'warrior' | 'worker'): number {
  const tile = at(state, city.col, city.row);
  const made = realiseItem(state, city, { kind: 'unit', id: type, tile }, { free: true });
  const unit = state.units.find((piece) => piece.id === made.unitId);
  expect(unit, `no ${type} was gained`).toBeDefined();
  return unitStampStrength(unit!);
}

/** The words a card prints, with the keyword marks stripped. */
function said(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

/** The twelve rows, with the sheet's tier, rarity, type and text. */
const S7: readonly { id: OrderId; band: number; rarity: OrderRarity; type: CardType; text: string }[] = [
  {
    id: 'theRoyalTutors',
    band: 0,
    rarity: 'common',
    type: 'civic',
    text: '+1 renown a turn for each science building you have, favouring great scholars.',
  },
  {
    id: 'theWarManuals',
    band: 0,
    rarity: 'common',
    type: 'military',
    text: 'Units gained in a town with a Library start with +2 strength.',
  },
  {
    id: 'learnedCommissions',
    band: 1,
    rarity: 'common',
    type: 'economic',
    text: 'Cities with a Library build empire buildings 25% faster.',
  },
  {
    id: 'theRoyalEstates',
    band: 1,
    rarity: 'common',
    type: 'economic',
    text: 'Each empire building gives its town +2 food and +2 production.',
  },
  {
    id: 'theCommonTables',
    band: 1,
    rarity: 'common',
    type: 'economic',
    text: 'Towns gain +2 food for each science building in them.',
  },
  {
    id: 'theFreeCities',
    band: 1,
    rarity: 'uncommon',
    type: 'economic',
    text: 'While you hold at most five towns, your towns build buildings and wonders 20% faster.',
  },
  {
    id: 'enduringInstitutions',
    band: 2,
    rarity: 'uncommon',
    type: 'economic',
    text: 'A town with an empire building at least twenty turns old gains +25% production.',
  },
  {
    id: 'theQuietFaculties',
    band: 2,
    rarity: 'rare',
    type: 'economic',
    text: 'Cities working an Academy gain +25% food and +20% production, but produce military units 25% more slowly.',
  },
  {
    id: 'theRollOfScholars',
    band: 2,
    rarity: 'uncommon',
    type: 'civic',
    text: '+4% production and culture for each great scholar you have gained this game, at most +28%.',
  },
  {
    id: 'thePalaceSchools',
    band: 2,
    rarity: 'uncommon',
    type: 'military',
    text: 'Units gained in a town with an empire building start with +4 strength.',
  },
  {
    id: 'theRoundCity',
    band: 2,
    rarity: 'uncommon',
    type: 'civic',
    text: '+1% production and culture for each citizen in your capital, at most +30%.',
  },
  {
    id: 'theCityArchitects',
    band: 2,
    rarity: 'common',
    type: 'economic',
    text: 'Towns of at least eight citizens build wonders 25% faster.',
  },
];

// --- the register ----------------------------------------------------------------

describe('the register', () => {
  it('deals the twelve rows with the sheet’s tier, rarity, type and text', () => {
    for (const { id, band, rarity, type, text } of S7) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(def.deferred, id).toBeUndefined();
      expect(def.retired, id).toBeUndefined();
      expect(def.decks, id).toEqual(['scientific']);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.text, id).toBe(text);
      expect(def.effects.length, id).toBeGreaterThan(0);
    }
  });

  it('renames Learned Commissions to Learned Foundations and keeps the id, with one effect', () => {
    const def = orderDef('learnedCommissions');
    expect(def.name).toBe('Learned Foundations');
    expect(def.effects).toEqual([
      {
        kind: 'productionBonus',
        category: 'building',
        empireBuilding: true,
        percent: 25,
        scope: { test: 'hasBuilding', building: 'library' },
      },
    ]);
  });

  it('prints each card in plain words through the describers', () => {
    expect(said('theRoyalTutors')).toEqual([
      '+1 renown per turn in every city, per building there that supplies science, favouring scholars',
    ]);
    expect(said('theWarManuals')).toEqual([
      'newly created military units in every city with a Library gain +2 combat strength',
    ]);
    expect(said('learnedCommissions')).toEqual([
      '+25% production toward empire buildings, in every city with a Library',
    ]);
    expect(said('theRoyalEstates')).toEqual([
      '+2 food in every city per empire building you hold there',
      '+2 production in every city per empire building you hold there',
    ]);
    expect(said('theCommonTables')).toEqual(['+2 food in every city per building there that supplies science']);
    expect(said('theFreeCities')).toEqual([
      'while you hold at most 5 cities: +20% production toward buildings; +20% production toward wonders',
    ]);
    expect(said('enduringInstitutions')).toEqual([
      '+25% production in every city holding an empire building that has stood at least 20 turns',
    ]);
    expect(said('theQuietFaculties')).toEqual([
      '+25% food in every city working an Academy',
      '+20% production in every city working an Academy',
      '-25% production toward military units, in every city working an Academy',
    ]);
    expect(said('theRollOfScholars')).toEqual([
      '+4% production per great scholar you have gained this game (at most +28% production)',
      '+4% culture per great scholar you have gained this game (at most +28% culture)',
    ]);
    expect(said('thePalaceSchools')).toEqual([
      'newly created military units in every city holding an empire building gain +4 combat strength',
    ]);
    expect(said('theRoundCity')).toEqual([
      '+1% production per citizen in your capital (at most +30% production)',
      '+1% culture per citizen in your capital (at most +30% culture)',
    ]);
    expect(said('theCityArchitects')).toEqual([
      '+25% production toward wonders, in every city of 8 or more citizens',
    ]);
  });
});

// --- Tier 0 ----------------------------------------------------------------------

describe('Tier 0', () => {
  it('The Royal Tutors: one renown a turn for each science building in each town, favouring scholars', () => {
    const state = bench();
    const capital = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, 'theRoyalTutors');
    const tutors = () =>
      explainRenown(state, 0).filter((line) => line.source.includes('The Royal Tutors'));
    // No science building anywhere: nothing.
    expect(tutors()).toEqual([]);
    // A Monument supplies no science and counts for nothing.
    raise(state, capital, 'monument');
    expect(tutors()).toEqual([]);
    raise(state, capital, 'library');
    expect(tutors().map((line) => line.amount)).toEqual([1]);
    expect(tutors()[0]!.family).toBe('scholar');
    expect(tutors()[0]!.perTurn).toBe(true);
    // A University is a second science building in the same town, and a
    // Library in another town is a third: the trickle counts every town.
    raise(state, capital, 'university');
    raise(state, other, 'library');
    expect(tutors().reduce((sum, line) => sum + line.amount, 0)).toBe(3);
    // A rival's Library pays this seat nothing.
    const rival = town(state, 1, 4, 10);
    raise(state, rival, 'library');
    expect(tutors().reduce((sum, line) => sum + line.amount, 0)).toBe(3);
  });

  it('The War Manuals: a military unit gained in a Library town starts two stronger, and nothing else does', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, 'theWarManuals');
    expect(trainedStrength(state, city, 'warrior'), 'no Library yet').toBe(0);
    raise(state, city, 'library');
    expect(trainedStrength(state, city, 'warrior')).toBe(2);
    expect(cardUnitStamp(state, 0, { col: city.col, row: city.row }, 'worker').strength ?? 0).toBe(0);
    expect(trainedStrength(state, other, 'warrior'), 'a town without a Library').toBe(0);
  });
});

// --- Tier I ----------------------------------------------------------------------

describe('Tier I', () => {
  it('Learned Foundations: a Library town builds empire buildings a quarter faster, and nothing else', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, 'learnedCommissions');
    expect(toward(state, city, 'learnedCommissions', 'building', 'forum'), 'no Library yet').toBe(0);
    raise(state, city, 'library');
    expect(toward(state, city, 'learnedCommissions', 'building', 'forum')).toBe(25);
    expect(toward(state, city, 'learnedCommissions', 'building', 'theMagnumOpus')).toBe(25);
    expect(toward(state, city, 'learnedCommissions', 'building', 'granary')).toBe(0);
    expect(toward(state, city, 'learnedCommissions', 'wonder', 'pyramids')).toBe(0);
    expect(toward(state, other, 'learnedCommissions', 'building', 'forum')).toBe(0);
    // The riders are gone: completing a first empire building grants nothing.
    const before = playerById(state, 0)!.culturePool;
    realiseItem(state, city, { kind: 'building', id: 'forum' });
    expect(playerById(state, 0)!.culturePool).toBe(before);
  });

  it('The Royal Estates: each empire building gives its own town two food and two production', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, 'theRoyalEstates');
    expect(townLines(state, city, 'theRoyalEstates', 'food')).toBe(0);
    // An ordinary building is not an empire building.
    raise(state, city, 'granary');
    expect(townLines(state, city, 'theRoyalEstates', 'food')).toBe(0);
    raise(state, city, 'forum');
    expect(townLines(state, city, 'theRoyalEstates', 'food')).toBe(2);
    expect(townLines(state, city, 'theRoyalEstates', 'production')).toBe(2);
    // A second house in the same town pays again (section 14's ruling: per
    // empire building, not per town).
    raise(state, city, 'caravanserai');
    expect(townLines(state, city, 'theRoyalEstates', 'food')).toBe(4);
    expect(townLines(state, city, 'theRoyalEstates', 'production')).toBe(4);
    // The other town holds none, and the houses in the first pay it nothing.
    expect(townLines(state, other, 'theRoyalEstates', 'food')).toBe(0);
  });

  it('The Common Tables: two food for each science building in the town', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, 'theCommonTables');
    raise(state, city, 'monument');
    expect(townLines(state, city, 'theCommonTables', 'food')).toBe(0);
    raise(state, city, 'library');
    expect(townLines(state, city, 'theCommonTables', 'food')).toBe(2);
    raise(state, city, 'university');
    expect(townLines(state, city, 'theCommonTables', 'food')).toBe(4);
    expect(townLines(state, city, 'theCommonTables', 'production')).toBe(0);
    expect(townLines(state, other, 'theCommonTables', 'food')).toBe(0);
  });

  it('The Free Cities: buildings and wonders a fifth faster while the seat holds five towns, and not at six', () => {
    const state = bench();
    const sites: readonly [number, number][] = [
      [2, 2],
      [8, 2],
      [14, 2],
      [2, 8],
      [8, 8],
    ];
    const towns = sites.map(([col, row]) => town(state, 0, col, row));
    const city = towns[0]!;
    slot(state, 0, 'theFreeCities');
    expect(toward(state, city, 'theFreeCities', 'building', 'granary')).toBe(20);
    expect(toward(state, city, 'theFreeCities', 'building', 'forum')).toBe(20);
    expect(toward(state, city, 'theFreeCities', 'wonder', 'pyramids')).toBe(20);
    expect(toward(state, towns[4]!, 'theFreeCities', 'building', 'granary')).toBe(20);
    expect(toward(state, city, 'theFreeCities', 'unit', 'warrior')).toBe(0);
    // A sixth town switches it off everywhere.
    town(state, 0, 14, 8);
    expect(toward(state, city, 'theFreeCities', 'building', 'granary')).toBe(0);
    expect(toward(state, city, 'theFreeCities', 'wonder', 'pyramids')).toBe(0);
  });
});

// --- Tier II ---------------------------------------------------------------------

describe('Tier II', () => {
  it('Enduring Institutions: +25% production once the oldest empire building has stood twenty turns, and no happiness', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    state.turn = 4;
    raise(state, city, 'forum');
    slot(state, 0, 'enduringInstitutions');
    expect(percentOn(state, city, 'enduringInstitutions', 'production')).toBe(0);
    state.turn = 24;
    bumpRevision(state);
    expect(percentOn(state, city, 'enduringInstitutions', 'production')).toBe(25);
    // A second house raised this turn does not make the town's institutions
    // young again: the reading is the oldest one, and it pays once.
    raise(state, city, 'caravanserai');
    expect(percentOn(state, city, 'enduringInstitutions', 'production')).toBe(25);
    // The happiness is gone (the themes doc's ruling: civic life is not
    // Scientific's).
    expect(cardHappiness(state, 0).filter((line) => line.card === 'enduringInstitutions')).toEqual([]);
  });

  it('The Quiet Faculties: a town working an Academy grows and builds faster, and trains soldiers slower', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const tile = at(state, city.col + 1, city.row);
    state.turn = 3;
    raiseImprovement(tile, 'academy', state.turn);
    slot(state, 0, 'theQuietFaculties');
    // An Academy nobody works admits nothing.
    city.workedTiles = [];
    bumpRevision(state);
    expect(percentOn(state, city, 'theQuietFaculties', 'food')).toBe(0);
    city.workedTiles = [{ col: tile.col, row: tile.row }];
    bumpRevision(state);
    expect(percentOn(state, city, 'theQuietFaculties', 'food')).toBe(25);
    expect(percentOn(state, city, 'theQuietFaculties', 'production')).toBe(20);
    expect(toward(state, city, 'theQuietFaculties', 'unit', 'warrior')).toBe(-25);
    expect(toward(state, city, 'theQuietFaculties', 'unit', 'worker')).toBe(0);
    // Another great person's work is not an Academy.
    razeImprovement(tile);
    raiseImprovement(tile, 'landmark', state.turn);
    bumpRevision(state);
    expect(percentOn(state, city, 'theQuietFaculties', 'food')).toBe(0);
    expect(toward(state, city, 'theQuietFaculties', 'unit', 'warrior')).toBe(0);
  });

  it('The Roll of Scholars: +4% production and culture for each great scholar gained, at most +28%', () => {
    const state = bench();
    const capital = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, 'theRollOfScholars');
    const player = playerById(state, 0)!;
    expect(percentOn(state, capital, 'theRollOfScholars', 'production')).toBe(0);
    // Great people of another family count for nothing.
    player.greatPeopleByFamily = { general: 4 };
    bumpRevision(state);
    expect(percentOn(state, capital, 'theRollOfScholars', 'production')).toBe(0);
    player.greatPeopleByFamily = { general: 4, scholar: 3 };
    bumpRevision(state);
    expect(percentOn(state, capital, 'theRollOfScholars', 'production')).toBe(12);
    expect(percentOn(state, capital, 'theRollOfScholars', 'culture')).toBe(12);
    // Every town of the empire, at the empire stage.
    expect(percentOn(state, other, 'theRollOfScholars', 'production')).toBe(12);
    expect(
      explainCardPercentYields(state, other)
        .filter((line) => line.card === 'theRollOfScholars')
        .every((line) => line.stage === 'empire'),
    ).toBe(true);
    // The eighth scholar adds nothing.
    player.greatPeopleByFamily = { scholar: 8 };
    bumpRevision(state);
    expect(percentOn(state, capital, 'theRollOfScholars', 'production')).toBe(28);
    expect(percentOn(state, capital, 'theRollOfScholars', 'culture')).toBe(28);
  });

  it('The Palace Schools: a military unit gained in a town with an empire building starts four stronger', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    slot(state, 0, 'thePalaceSchools');
    raise(state, city, 'granary');
    expect(trainedStrength(state, city, 'warrior'), 'an ordinary building').toBe(0);
    raise(state, city, 'forum');
    expect(trainedStrength(state, city, 'warrior')).toBe(4);
    expect(cardUnitStamp(state, 0, { col: city.col, row: city.row }, 'worker').strength ?? 0).toBe(0);
    expect(trainedStrength(state, other, 'warrior'), 'a town with no empire building').toBe(0);
  });

  it('The Round City: +1% production and culture for each citizen in the capital, in every town, at most +30%', () => {
    const state = bench();
    const capital = town(state, 0, 4, 5, 6);
    const other = town(state, 0, 12, 5, 15);
    slot(state, 0, 'theRoundCity');
    // The capital's citizens, not the other town's.
    expect(percentOn(state, capital, 'theRoundCity', 'production')).toBe(6);
    expect(percentOn(state, capital, 'theRoundCity', 'culture')).toBe(6);
    expect(percentOn(state, other, 'theRoundCity', 'production')).toBe(6);
    capital.population = 40;
    bumpRevision(state);
    expect(percentOn(state, capital, 'theRoundCity', 'production')).toBe(30);
    expect(percentOn(state, other, 'theRoundCity', 'culture')).toBe(30);
  });

  it('The City Architects: a town of eight citizens builds wonders a quarter faster, and a town of seven does not', () => {
    const state = bench();
    const city = town(state, 0, 4, 5, 7);
    slot(state, 0, 'theCityArchitects');
    expect(toward(state, city, 'theCityArchitects', 'wonder', 'pyramids')).toBe(0);
    city.population = 8;
    bumpRevision(state);
    expect(toward(state, city, 'theCityArchitects', 'wonder', 'pyramids')).toBe(25);
    expect(toward(state, city, 'theCityArchitects', 'building', 'forum')).toBe(0);
    expect(toward(state, city, 'theCityArchitects', 'building', 'granary')).toBe(0);
  });
});
