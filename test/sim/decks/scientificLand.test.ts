/**
 * **Scientific batch S5, the learned land** (`docs/plans/scientific-build-
 * triage.md`, the S5 section and readings 29 to 35; the rulings are in
 * `docs/plans/scientific-themes.md` sections 14 and 15).
 *
 * What this file checks:
 *
 *   - the Surveyors' Charter: the Aqueduct before Engineering at Engineering's
 *     price (reading 29), and the Qanat, which waters the farms beside it for
 *     every fresh-water question about a farm (reading 30);
 *   - the Alchemists' Charter: batch S5 gave it Niter Beds (reading 31), and
 *     batch DS6 removed them, so Chemistry opens no work now. A niter seam is
 *     checked in their place, for the copies and the kinds count;
 *   - The School of Mines' extra copy for an Academy on a strategic resource
 *     (reading 32);
 *   - The Studium Generale: a great person's work beside one of your Academies
 *     counts as an Academy for every card reading, and never for the
 *     Academy's own science (reading 33);
 *   - The Prospectors' Notes and The Founding Gift, paid to the town nearest
 *     the work (reading 35);
 *   - The Latin Quarter, The Nizamiyya, The Republic of Letters and the shared
 *     The Assay on a board;
 *   - two readings with no live row since this batch: `workingGreatWork`'s
 *     age term and the `uniqueStrategicResources` count;
 *   - the words the new rows print.
 *
 * The Long Inheritance is checked in `scientific.test.ts`, beside the other
 * age-stamp cards.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../../src/sim/buildingData';
import {
  claimTile,
  controlledResources,
  explainBuildingCost,
  foundCityAt,
  hasResource,
  resourceCopies,
} from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { IMPROVEMENT_IDS, improvementDef } from '../../../src/sim/improvementData';
import {
  improvementGroundError,
  improvementTechError,
  refreshWateredNeighbours,
} from '../../../src/sim/improvements';
import {
  type Tile,
  createMap,
  getTileAt,
  raiseImprovement,
  razeImprovement,
  tileIndex,
} from '../../../src/sim/map';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cityScopeAdmits,
  cityScopeWords,
  countOf,
  describeCard,
  groundFactsFor,
  stripRefs,
  tileConditionHolds,
} from '../../../src/sim/statecraft';
import { windfallPayout } from '../../../src/sim/statecraft/evaluator';
import { type CityScope, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { gatingTech, isUnlocked } from '../../../src/sim/tech';
import { type TechId, techDef } from '../../../src/sim/techData';
import { resetVisibility } from '../../../src/sim/visibility';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { explainCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

// --- the bench -----------------------------------------------------------------

/** A blank grassland board, twenty by twelve, with two seats and nothing on it. */
function bench(): GameState {
  const width = 20;
  const height = 12;
  const state = newGame({
    seed: 23,
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
function town(state: GameState, playerId: number, col: number, row: number): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.queue = [];
  bumpRevision(state);
  return city;
}

/** Teaches a seat technologies, as a finished research leaves them. */
function learn(state: GameState, playerId: number, ...techs: TechId[]): void {
  playerById(state, playerId)!.techsResearched.push(...techs);
  bumpRevision(state);
}

/** Lays a work on a hex at this turn, as a finished build leaves it. */
function lay(state: GameState, tile: Tile, id: Parameters<typeof raiseImprovement>[1]): void {
  raiseImprovement(tile, id, state.turn);
  bumpRevision(state);
}

/** Grants a card and seats it, the way `statecraft.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** The sum of one voice over a hex's lines whose label holds `name`. */
function hexLines(
  state: GameState,
  tile: Tile,
  name: string,
  voice: 'food' | 'production' | 'science' | 'culture',
): number {
  return explainTileYield(tile, yieldContextFor(state, 0))
    .filter((line) => line.source.includes(name))
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The words a card prints, with the keyword marks stripped. */
function said(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

// --- the register ----------------------------------------------------------------

describe('the register', () => {
  it('deals the two charters with the sheet’s text, and each gift sits on its technology', () => {
    for (const [charter, tech] of [
      ['theSurveyorsCharter', 'surveying'],
      ['theAlchemistsCharter', 'chemistry'],
    ] as [OrderId, TechId][]) {
      const def = orderDef(charter);
      expect(orderIsDealt(charter), charter).toBe(true);
      expect(def.deferred, charter).toBeUndefined();
      expect(def.effects, charter).toEqual([]);
      expect(def.charter!.unlocks.tech, charter).toBe(tech);
      // Batch DS6 gave both the keyword form of the text.
      expect(def.text, charter).toMatch(new RegExp(`^Charter\\. Opens ${techDef(tech).name}: `));
    }
    expect(techDef('surveying').effects).toEqual([{ kind: 'unlocksBuilding', building: 'aqueduct' }]);
    expect(improvementDef('qanat').requiresTech).toBe('surveying');
    expect(improvementDef('qanat').watersBeside).toBe(true);
  });

  it('opens no work on Chemistry since batch DS6, and Chemistry still does not open the Magnum Opus', () => {
    // The Alchemists' Charter's Niter Beds went in batch DS6: no worker row
    // asks for Chemistry, and its one gift is the Grenadier trait.
    expect(IMPROVEMENT_IDS.filter((id) => improvementDef(id).requiresTech === 'chemistry')).toEqual([]);
    expect((IMPROVEMENT_IDS as readonly string[]).includes('niterBeds')).toBe(false);
    expect(techDef('chemistry').traits!.map((trait) => trait.name)).toEqual(['Grenadier']);
    // The Opus is opened by Alchemy, which no charter row is.
    expect(buildingDef('theMagnumOpus').worldUnlockTech).toBe('alchemy');
    expect(techDef('chemistry').unlocks).toEqual({});
  });

  it('deals the eight cards, The Assay from the shared shelf, but the three batch DS1 retired', () => {
    // Batch DS1 (`docs/plans/deck-simplification-2026-11-10.md`) retired The
    // Studium Generale, The School of Mines and The Long Inheritance. Their
    // rows and effects stay for saves, so the tests below still read them.
    const retiredInDs1 = ['theStudiumGenerale', 'theStrategicReserves', 'theLongInheritance'];
    for (const id of [
      'theProspectorsNotes',
      'theFoundingGift',
      'theLatinQuarter',
      'theStudiumGenerale',
      'theNizamiyya',
      'theRepublicOfLetters',
      'theStrategicReserves',
      'theLongInheritance',
      'scientificTheAssay',
    ] as OrderId[]) {
      const retired = retiredInDs1.includes(id);
      expect(orderDef(id).retired === true, id).toBe(retired);
      expect(orderIsDealt(id), id).toBe(!retired);
      expect(orderDef(id).deferred, id).toBeUndefined();
    }
    expect(orderDef('theStrategicReserves').name).toBe('The School of Mines');
    expect(orderDef('scientificTheAssay').decks).toEqual(['expansionist', 'scientific']);
    expect(orderDef('scientificTheAssay').type).toBe('civic');
  });
});

// --- the Aqueduct, early -----------------------------------------------------------

describe('the Aqueduct before Engineering (reading 29)', () => {
  it('opens with Surveying or with Engineering, and costs Engineering’s price either way', () => {
    const state = bench();
    town(state, 0, 4, 5);
    expect(gatingTech('building', 'aqueduct')).toBe('engineering');
    expect(buildingDef('aqueduct').unlockedByCard).toBe(true);
    expect(isUnlocked(state, 0, 'building', 'aqueduct')).toBe(false);
    learn(state, 0, 'surveying');
    expect(isUnlocked(state, 0, 'building', 'aqueduct')).toBe(true);
    const early = explainBuildingCost('aqueduct', state, 0);
    // Engineering alone opens it for everyone else, at the same price.
    const other = bench();
    town(other, 0, 4, 5);
    learn(other, 0, 'engineering');
    expect(isUnlocked(other, 0, 'building', 'aqueduct')).toBe(true);
    expect(explainBuildingCost('aqueduct', other, 0)).toEqual(early);
  });
});

// --- the Qanat ------------------------------------------------------------------

describe('the Qanat (reading 30)', () => {
  /** A town at (4,5), a Qanat at (6,5) in its borders, and dry farms beside and beyond it. */
  function irrigated(): { state: GameState; city: City; qanat: Tile; beside: Tile; beyond: Tile } {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const qanat = at(state, 6, 5);
    const beside = at(state, 7, 5);
    const beyond = at(state, 8, 5);
    for (const tile of [qanat, beside, beyond]) claimTile(state, city, tile);
    lay(state, beside, 'farm');
    lay(state, beyond, 'farm');
    learn(state, 0, 'irrigation');
    return { state, city, qanat, beside, beyond };
  }

  it('needs Surveying and flat land', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const ground = at(state, 5, 5);
    expect(improvementTechError(state, 0, 'qanat')).toMatch(/Surveying/);
    learn(state, 0, 'surveying');
    expect(improvementTechError(state, 0, 'qanat')).toBeNull();
    expect(improvementGroundError(state, 0, ground, 'qanat')).toBeNull();
    ground.hills = true;
    expect(improvementGroundError(state, 0, ground, 'qanat')).toMatch(/flat/);
    ground.hills = false;
    ground.terrain = 'coast';
    expect(improvementGroundError(state, 0, ground, 'qanat')).not.toBeNull();
  });

  it('waters the farms beside it for the Irrigation renewal, and only those', () => {
    const { state, qanat, beside, beyond } = irrigated();
    const irrigation = techDef('irrigation').name;
    expect(hexLines(state, beside, irrigation, 'food')).toBe(0);
    lay(state, qanat, 'qanat');
    expect(hexLines(state, beside, irrigation, 'food')).toBe(1);
    // Two hexes away is not beside it: the water goes no further by itself.
    expect(hexLines(state, beyond, irrigation, 'food')).toBe(0);
    // Pillaged, it waters nothing.
    razeImprovement(qanat);
    bumpRevision(state);
    expect(hexLines(state, beside, irrigation, 'food')).toBe(0);
  });

  it('counts for the cards’ fresh-water test and for a farm built on dry ground', () => {
    const { state, city, qanat, beside } = irrigated();
    const fresh = (tile: Tile): boolean =>
      tileConditionHolds(tile, { test: 'freshwater' }, undefined, undefined, state.turn, groundFactsFor(state, 0));
    expect(fresh(beside)).toBe(false);
    // A dry desert hex beside the Qanat refuses a farm for the water.
    const desert = at(state, 6, 4);
    desert.terrain = 'desert';
    claimTile(state, city, desert);
    bumpRevision(state);
    expect(improvementGroundError(state, 0, desert, 'farm')).toMatch(/fresh water/);
    lay(state, qanat, 'qanat');
    expect(fresh(beside)).toBe(true);
    expect(improvementGroundError(state, 0, desert, 'farm')).toBeNull();
  });

  it('waters only its own empire’s farms', () => {
    const { state, qanat } = irrigated();
    const rival = town(state, 1, 10, 5);
    const theirs = at(state, 7, 6);
    claimTile(state, rival, theirs);
    lay(state, theirs, 'farm');
    learn(state, 1, 'irrigation');
    lay(state, qanat, 'qanat');
    const irrigation = techDef('irrigation').name;
    const paid = explainTileYield(theirs, yieldContextFor(state, 1))
      .filter((line) => line.source === irrigation)
      .reduce((sum, line) => sum + line.food, 0);
    expect(paid).toBe(0);
  });

  it('re-seats every town beside it when it is built', () => {
    // The register's entry 30 (`refreshCityDerived`): a farm beside the Qanat
    // may belong to another town than the Qanat's hex.
    const { state, city, qanat } = irrigated();
    const second = town(state, 0, 9, 3);
    claimTile(state, second, at(state, 7, 4));
    lay(state, qanat, 'qanat');
    second.workedTiles = [];
    city.workedTiles = [];
    refreshWateredNeighbours(state, qanat, 'qanat');
    // The town on the Qanat's own hex is `refreshTileDerived`'s, so only the
    // other town beside it is re-seated here.
    expect(second.workedTiles.length).toBeGreaterThan(0);
    expect(city.workedTiles).toEqual([]);
  });
});

// --- a niter seam ------------------------------------------------------------------

/**
 * **Niter from the ground alone.** Batch S5's Niter Beds supplied one niter
 * with no seam, and batch DS6 removed the row. These checks keep the copies
 * and the kinds count honest on a mined niter seam, the only source left.
 */
describe('a niter seam, since the Niter Beds went (batch DS6)', () => {
  function seam(): { state: GameState; city: City; ground: Tile } {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const ground = at(state, 5, 5);
    ground.resource = 'niter';
    bumpRevision(state);
    return { state, city, ground };
  }

  it('supplies niter only while mined and only once the empire can see niter', () => {
    const { state, ground } = seam();
    expect(resourceCopies(state, 0, 'niter')).toBe(0);
    lay(state, ground, 'mine');
    // Niter is a word Physics teaches: before it, the seam supplies nothing.
    expect(resourceCopies(state, 0, 'niter')).toBe(0);
    learn(state, 0, 'physics');
    expect(resourceCopies(state, 0, 'niter')).toBeGreaterThan(0);
    expect(hasResource(state, 0, 'niter')).toBe(true);
    expect(controlledResources(state, 0, 'strategic')).toContain('niter');
    // Pillaged, it supplies nothing.
    razeImprovement(ground);
    bumpRevision(state);
    expect(resourceCopies(state, 0, 'niter')).toBe(0);
    expect(controlledResources(state, 0, 'strategic')).not.toContain('niter');
  });

  it('is counted by the kinds of strategic resource held, a count with no live row', () => {
    const { state, ground, city } = seam();
    learn(state, 0, 'physics');
    const ask = (): number =>
      countOf(
        state,
        0,
        '' as never,
        { kind: 'pays', where: 'empire', basis: 'count', count: 'uniqueStrategicResources', to: 'science', amount: 1 },
        city,
      );
    expect(ask()).toBe(0);
    lay(state, ground, 'mine');
    expect(ask()).toBe(1);
  });
});

// --- The School of Mines ------------------------------------------------------------

describe('The School of Mines (reading 32)', () => {
  function deposit(): { state: GameState; city: City; iron: Tile } {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const iron = at(state, 5, 5);
    iron.resource = 'iron';
    learn(state, 0, 'bronzePanoply');
    return { state, city, iron };
  }

  it('adds one copy for an Academy on a strategic resource, and none for a mine', () => {
    const { state, iron } = deposit();
    lay(state, iron, 'academy');
    expect(resourceCopies(state, 0, 'iron')).toBe(1);
    slot(state, 0, 'theStrategicReserves');
    expect(resourceCopies(state, 0, 'iron')).toBe(2);
    razeImprovement(iron);
    lay(state, iron, 'mine');
    expect(resourceCopies(state, 0, 'iron')).toBe(1);
  });

  it('adds nothing for an Academy on a resource the empire cannot see', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const iron = at(state, 5, 5);
    iron.resource = 'iron';
    lay(state, iron, 'academy');
    slot(state, 0, 'theStrategicReserves');
    expect(resourceCopies(state, 0, 'iron')).toBe(0);
  });
});

// --- The Studium Generale ----------------------------------------------------------

describe('The Studium Generale (reading 33)', () => {
  /** A town with an Academy at (5,5) and a Landmark beside it at (5,4), both old. */
  function campus(): { state: GameState; city: City; academy: Tile; landmark: Tile } {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const academy = at(state, 5, 5);
    const landmark = at(state, 5, 4);
    state.turn = 2;
    lay(state, academy, 'academy');
    lay(state, landmark, 'landmark');
    state.turn = 30;
    bumpRevision(state);
    return { state, city, academy, landmark };
  }

  it('makes a work beside one of your Academies an Academy for the hex cards', () => {
    const { state, landmark } = campus();
    slot(state, 0, 'theOldAcademy');
    slot(state, 0, 'theNizamiyya');
    expect(hexLines(state, landmark, 'The Old Academy', 'food')).toBe(0);
    expect(hexLines(state, landmark, 'The Nizamiyya', 'culture')).toBe(0);
    slot(state, 0, 'theStudiumGenerale');
    expect(hexLines(state, landmark, 'The Old Academy', 'food')).toBe(3);
    expect(hexLines(state, landmark, 'The Nizamiyya', 'culture')).toBeGreaterThan(0);
    // Never the Academy's own science: that is the work's row, not a card.
    expect(hexLines(state, landmark, improvementDef('academy').name, 'science')).toBe(0);
  });

  it('counts it for the counts, the town scopes and the deposits', () => {
    const { state, city, academy, landmark } = campus();
    slot(state, 0, 'theRepublicOfLetters');
    const capital = (): number =>
      explainCity(state, city)
        .lines.filter((line) => line.source.includes('The Republic of Letters'))
        .reduce((sum, line) => sum + line.production, 0);
    expect(capital()).toBe(4);
    // A second town whose borders hold the Landmark and not the Academy.
    const second = town(state, 0, 7, 2);
    state.tileOwner[tileIndex(state.map, landmark.col, landmark.row)] = second.id;
    bumpRevision(state);
    const scope = { test: 'hasImprovement', improvement: 'academy' } as const;
    expect(cityScopeAdmits(state, second, scope)).toBe(false);
    // And a citadel on an iron deposit beside the Academy.
    const iron = at(state, 6, 5);
    iron.resource = 'iron';
    claimTile(state, city, iron);
    learn(state, 0, 'bronzePanoply');
    lay(state, iron, 'citadel');
    slot(state, 0, 'theStrategicReserves');
    expect(resourceCopies(state, 0, 'iron')).toBe(1);

    slot(state, 0, 'theStudiumGenerale');
    expect(capital()).toBe(12);
    expect(cityScopeAdmits(state, second, scope)).toBe(true);
    expect(resourceCopies(state, 0, 'iron')).toBe(2);
    // The Academy itself is what the works stand beside: without it, nothing.
    razeImprovement(academy);
    bumpRevision(state);
    expect(capital()).toBe(0);
    expect(cityScopeAdmits(state, second, scope)).toBe(false);
  });

  it('counts only a work beside an Academy inside your own borders', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const rival = town(state, 1, 9, 5);
    const theirs = at(state, 7, 5);
    claimTile(state, rival, theirs);
    lay(state, theirs, 'academy');
    const mine = at(state, 6, 5);
    claimTile(state, state.cities[0]!, mine);
    state.turn = 2;
    lay(state, mine, 'landmark');
    state.turn = 30;
    slot(state, 0, 'theOldAcademy');
    slot(state, 0, 'theStudiumGenerale');
    expect(hexLines(state, mine, 'The Old Academy', 'food')).toBe(0);
  });
});

// --- the moments ---------------------------------------------------------------

describe('the moments a work is laid (reading 35)', () => {
  it('The Prospectors’ Notes: a mine pays the town nearest it', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    learn(state, 0, 'mining');
    slot(state, 0, 'theProspectorsNotes');
    const hill = at(state, 5, 5);
    hill.hills = true;
    const worker = createUnit(state, 0, 'worker', hill.col, hill.row);
    const grant = windfallPayout(state, 0, 'improvementBuilt', 0, 0, { improvement: 'mine' }).grants;
    expect(grant.map((line) => [line.yield, line.amount])).toEqual([['production', 25]]);
    const before = city.hammerBasket;
    expect(applyCommand(state, { type: 'buildImprovement', playerId: 0, unitId: worker.id, improvement: 'mine' }).ok)
      .toBe(true);
    expect(city.hammerBasket - before).toBe(25);
    // A farm is neither a mine nor a quarry.
    expect(windfallPayout(state, 0, 'improvementBuilt', 0, 0, { improvement: 'farm' }).grants).toEqual([]);
  });

  it('The Founding Gift: a great scholar’s Academy pays the town nearest it', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    slot(state, 0, 'theFoundingGift');
    state.recruited.push('ahmes');
    const scholar = createUnit(state, 0, 'greatPerson', 5, 5, 'ahmes');
    const before = city.hammerBasket;
    expect(applyCommand(state, { type: 'greatPersonWork', playerId: 0, unitId: scholar.id }).ok).toBe(true);
    expect(at(state, 5, 5).improvement).toBe('academy');
    expect(city.hammerBasket - before).toBe(150);
  });
});

// --- the other cards on a board ------------------------------------------------------

describe('the other cards on a board', () => {
  it('The Latin Quarter pays a work beside an Academy, and not the work alone', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const landmark = at(state, 5, 4);
    lay(state, landmark, 'landmark');
    slot(state, 0, 'theLatinQuarter');
    expect(hexLines(state, landmark, 'The Latin Quarter', 'culture')).toBe(0);
    lay(state, at(state, 5, 5), 'academy');
    expect(hexLines(state, landmark, 'The Latin Quarter', 'culture')).toBe(2);
    expect(hexLines(state, landmark, 'The Latin Quarter', 'production')).toBe(1);
  });

  it('The Nizamiyya pays half again of the Academy hex', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const academy = at(state, 5, 5);
    lay(state, academy, 'academy');
    const total = (): number =>
      explainTileYield(academy, yieldContextFor(state, 0)).reduce((sum, line) => sum + line.science, 0);
    const plain = total();
    slot(state, 0, 'theNizamiyya');
    expect(total()).toBe(plain * 1.5);
  });

  it('The Assay pays a strategic hex the seat can see, and nothing before', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const iron = at(state, 5, 5);
    iron.resource = 'iron';
    slot(state, 0, 'scientificTheAssay');
    expect(hexLines(state, iron, 'The Assay', 'science')).toBe(0);
    learn(state, 0, 'bronzePanoply');
    expect(hexLines(state, iron, 'The Assay', 'science')).toBe(2);
  });

  it('workingGreatWork still reads a work’s age, with no live row since this batch', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const tile = at(state, 5, 5);
    state.turn = 2;
    lay(state, tile, 'landmark');
    city.workedTiles = [{ col: tile.col, row: tile.row }];
    const scope = { test: 'workingGreatWork', standingTurns: 20 } as const;
    expect(cityScopeAdmits(state, city, scope)).toBe(false);
    state.turn = 22;
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, scope)).toBe(true);
    // And `workingImprovement` reads the same age (The Long Inheritance).
    const academy: CityScope = { test: 'workingImprovement', improvements: ['academy'], standingTurns: 20 };
    expect(cityScopeAdmits(state, city, academy)).toBe(false);
    expect(stripRefs(cityScopeWords(academy))).toBe(
      'every city working an Academy that has stood at least 20 turns',
    );
  });
});

// --- the words ---------------------------------------------------------------------

describe('the words', () => {
  it('says each charter’s gifts, led by “once you know”', () => {
    expect(said('theSurveyorsCharter')).toEqual([
      'once drafted, opens Surveying for you to research; only an empire holding this charter may research it; this card takes no chair',
      expect.stringMatching(/^once you know Surveying, you may build the Aqueduct before Engineering: /),
      'once you know Surveying, your workers may build the Qanat: on flat land; your farms beside it count as having fresh water',
    ]);
    // Batch DS6: the Niter Beds clause went, and the Grenadier is one scaled line.
    const alchemists = said('theAlchemistsCharter');
    expect(alchemists.some((text) => text.includes('Niter'))).toBe(false);
    expect(alchemists).toContain('+1 combat strength for units of the Warrior line per charter technology you know');
  });

  it('says the new cards plainly, with no struck half', () => {
    expect(said('theStrategicReserves')).toEqual([
      'each Academy of yours standing on a strategic resource supplies one more copy of it',
    ]);
    expect(said('theStudiumGenerale')).toEqual([
      "a great person's work beside an Academy of yours counts as an Academy for your cards",
    ]);
    expect(said('theFoundingGift')).toEqual(['a great scholar founding an Academy grants +150 production']);
    for (const id of [
      'theProspectorsNotes',
      'theFoundingGift',
      'theLatinQuarter',
      'theStudiumGenerale',
      'theNizamiyya',
      'theRepublicOfLetters',
      'theStrategicReserves',
      'theLongInheritance',
      'theSurveyorsCharter',
      'theAlchemistsCharter',
    ] as OrderId[]) {
      expect(describeCard(id).some((clause) => clause.deferred === true), id).toBe(false);
    }
  });
});
