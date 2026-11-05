/**
 * **Doctrine batch DT4: Magisterial's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `magisterial.test.ts` holds the rows to
 * the sheet. This file checks that each row pays what its text says, in a real
 * fold. None of these rows has a drawback, so each also has a test that it costs
 * nothing or that it pays nothing where its text does not reach.
 *
 * Batch DT6 adds The Carroccio and The Gobelins. Later batches add the deck's other
 * seven Doctrines to this file.
 */

import { describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { scoreEffects } from '../../../src/ai/value';
import { WONDER_IDS } from '../../../src/sim/buildingData';
import { explainCardImpact } from '../../../src/sim/cardImpact';
import {
  explainGrowthPercent,
  foldGrowthPercent,
  foundCityAt,
  ownedTiles,
  realiseItem,
  refreshCityDerived,
  settleProduction,
} from '../../../src/sim/cities';
import {
  drawGreatPersonOffer,
  greatPersonActAt,
  greatPersonWorkAt,
  settleGreatPersonChoice,
} from '../../../src/sim/greatPeople';
import { type Family, GREAT_PERSON_IDS, type GreatPersonId, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { type Tile, raiseImprovement } from '../../../src/sim/map';
import { explainAuthority, explainHappiness } from '../../../src/sim/meters';
import { explainRenown, foldRenown, renownThreshold } from '../../../src/sim/renown';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { doctrineBagFor } from '../../../src/sim/statecraft';
import {
  cardCombatLines,
  cardRenownLines,
  explainBuildingPackage,
  explainCardCityYields,
  foldBuildingPackage,
  windfallPayout,
} from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
  type DoctrineId,
  type OrderId,
  DECK_FILE_DOCTRINES,
  ORDER_IDS,
  doctrineDef,
  orderDef,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { ABILITY_TECH, TECH_IDS, techDef } from '../../../src/sim/techData';
import { explainCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';

/** The seven rows of batch DT4 in this deck, each with the band its table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['theChoregia', 1],
  ['thePericleanWorks', 1],
  ['theMagnaura', 2],
  ['theBarmakids', 2],
  ['theBourgs', 3],
  ['theCarroccio', 3],
  ['theKitabkhana', 4],
  ['theGobelins', 4],
  ['theEscorial', 4],
];

function seat(state: GameState, id = 0): Player {
  return playerById(state, id)!;
}

/** Gives a seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, id: string, playerId = 0): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
}

/** A town of a given size for this seat, with an empty queue. */
function town(state: GameState, col: number, row: number, population = 3, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** The voices a town line can pay. */
type Voice = 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith';

/** What one card's town lines pay a town, in one voice. */
function linePays(state: GameState, city: City, card: string, voice: Voice): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** Every Order of one type, with no retired row among them. */
function ordersOfType(type: string): OrderId[] {
  return ORDER_IDS.filter((id) => orderDef(id).type === type && orderDef(id).retired !== true);
}

/** Puts an Order in a chair for seat 0. */
function slot(state: GameState, card: OrderId): void {
  const sc = seat(state).statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** The first great person of this family in the roster, in table order. */
function personOf(family: Family): GreatPersonId {
  const id = GREAT_PERSON_IDS.find((person) => greatPersonDef(person).family === family);
  expect(id, family).toBeDefined();
  return id!;
}

/** A great person of this family for seat 0, standing on this hex. */
function person(state: GameState, where: { col: number; row: number }, family: Family): Unit {
  const unit = createUnit(state, 0, 'greatPerson', where.col, where.row, personOf(family));
  bumpRevision(state);
  return unit;
}

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City): Tile[] {
  return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
}

/** Leaves seat 0 at this age, by keeping only the technologies of that age and below. */
function atAge(state: GameState, age: number): void {
  const player = seat(state);
  const known = TECH_IDS.filter((id) => techDef(id).age <= age && techDef(id).charter !== true);
  const reached = known.filter((id) => techDef(id).age === age);
  expect(reached.length, `age ${age}`).toBeGreaterThan(0);
  player.techsResearched = known;
  bumpRevision(state);
}

/** Wonders with no site rule and no bead, for the counts. */
const PLAIN_WONDERS = ['pyramids', 'greatLibrary', 'stonehenge'] as const;

/** The technology that lets a seat call great people. */
const RITES = ABILITY_TECH.get('ancestorRites')!;

describe('batch DT4: Magisterial’s rows', () => {
  it('deals each row at its tier, from the Magisterial bag and no other', () => {
    for (const [id, band] of ROWS) {
      const def = doctrineDef(id as DoctrineId);
      expect(def.band, id).toBe(band);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(def.retired, id).toBeUndefined();
      expect(poolDoctrines(def.tier), id).toContain(id);
    }
    expect([...DECK_FILE_DOCTRINES.magisterial].sort()).toEqual(ROWS.map(([id]) => id).sort());
  });

  it('offers a Magisterial seat its rows when it adopts a tier-4 government', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true, decks: ['magisterial', 'dominion'] },
        { name: 'Bors', color: '#00a', isHuman: true, decks: ['dominion', 'expansionist'] },
      ],
    });
    expect(doctrineBagFor(g.state, seat(g.state), 4)).toEqual(
      expect.arrayContaining(['theChoregia', 'thePericleanWorks']),
    );
    expect(doctrineBagFor(g.state, seat(g.state, 1), 4)).not.toContain('theChoregia');
  });

  it('gives the bots a finite price for every row, and the impact stamp reads each one', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    town(state, 15, 5, 4);
    addBuilding(state, city, 'monument');
    realiseItem(state, city, { kind: 'building', id: 'pyramids' as never });
    bumpRevision(state);
    const player = seat(state);
    for (const [id] of ROWS) {
      const score = scoreCard(player, id as never, valueContext(state, player));
      expect(Number.isFinite(score), id).toBe(true);
      expect(() => explainCardImpact(state, 0, { kind: 'doctrine', id: id as DoctrineId }), id).not.toThrow();
    }
  });

  it('has no drawback: no row adds an authority or a happiness line', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    addBuilding(state, city, 'monument');
    bumpRevision(state);
    const before = [explainAuthority(state, 0), explainHappiness(state, 0)];
    for (const [id] of ROWS) hold(state, id);
    expect([explainAuthority(state, 0), explainHappiness(state, 0)]).toEqual(before);
  });
});

describe('The Choregia', () => {
  it('pays +3 culture in a town for each culture building in that town', () => {
    const state = bareState(24, 10);
    const rich = town(state, 5, 5);
    const poor = town(state, 15, 5);
    addBuilding(state, rich, 'monument');
    addBuilding(state, rich, 'amphitheater');
    addBuilding(state, poor, 'granary');
    bumpRevision(state);
    const before = [explainCity(state, rich).flats.culture, explainCity(state, poor).flats.culture];
    hold(state, 'theChoregia');
    expect(explainCity(state, rich).flats.culture).toBe(before[0]! + 6);
    expect(explainCity(state, poor).flats.culture).toBe(before[1]!);
  });

  it('puts the line in the culture building’s package, once, and in no other building’s', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    addBuilding(state, city, 'monument');
    addBuilding(state, city, 'amphitheater');
    addBuilding(state, city, 'granary');
    bumpRevision(state);
    const before = explainCity(state, city).flats.culture;
    const withoutCard = foldBuildingPackage(explainBuildingPackage(state, city, 'monument' as never)).culture;
    hold(state, 'theChoregia');
    const onIt = (id: string) =>
      foldBuildingPackage(
        explainBuildingPackage(state, city, id as never).filter((entry) => entry.card === 'theChoregia'),
      ).culture;
    expect(onIt('monument')).toBe(3);
    expect(onIt('amphitheater')).toBe(3);
    expect(onIt('granary')).toBe(0);
    expect(foldBuildingPackage(explainBuildingPackage(state, city, 'monument' as never)).culture).toBe(withoutCard + 3);
    // The package is a view of the line. The town still banks it once.
    expect(explainCity(state, city).flats.culture).toBe(before + 6);
  });

  it('pays +2 renown a turn for each culture building in the empire, and feeds no family', () => {
    const state = bareState(24, 10);
    const first = town(state, 5, 5);
    const second = town(state, 15, 5);
    addBuilding(state, first, 'monument');
    addBuilding(state, first, 'amphitheater');
    addBuilding(state, second, 'monument');
    addBuilding(state, second, 'granary');
    bumpRevision(state);
    const before = foldRenown(explainRenown(state, 0));
    hold(state, 'theChoregia');
    const lines = cardRenownLines(state, 0).filter((line) => line.card === 'theChoregia');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.amount).toBe(6);
    expect(lines[0]!.family).toBeNull();
    // Rule 5: the total is the fold, and the line has joined it.
    expect(foldRenown(explainRenown(state, 0))).toBe(before + 6);
  });

  it('counts a rival’s culture buildings for nothing', () => {
    const state = bareState(24, 10);
    town(state, 5, 5);
    const theirs = town(state, 15, 5, 3, 1);
    addBuilding(state, theirs, 'monument');
    bumpRevision(state);
    hold(state, 'theChoregia');
    expect(cardRenownLines(state, 0).filter((line) => line.card === 'theChoregia')).toEqual([]);
    expect(linePays(state, theirs, 'theChoregia', 'culture')).toBe(0);
  });

  it('counts a wonder on the culture shelf as a culture building, as The Repertory does', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    realiseItem(state, city, { kind: 'building', id: 'notreDame' as never });
    bumpRevision(state);
    hold(state, 'theChoregia');
    expect(linePays(state, city, 'theChoregia', 'culture')).toBe(3);
    expect(cardRenownLines(state, 0).find((line) => line.card === 'theChoregia')?.amount).toBe(2);
  });
});

describe('The Periclean Works', () => {
  it('pays +2 production in every town for each wonder the seat holds', () => {
    const state = bareState(24, 10);
    const stones = town(state, 5, 5);
    const other = town(state, 15, 5);
    hold(state, 'thePericleanWorks');
    expect(linePays(state, stones, 'thePericleanWorks', 'production')).toBe(0);
    realiseItem(state, stones, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    bumpRevision(state);
    expect(linePays(state, stones, 'thePericleanWorks', 'production')).toBe(2);
    expect(linePays(state, other, 'thePericleanWorks', 'production')).toBe(2);
    realiseItem(state, stones, { kind: 'building', id: PLAIN_WONDERS[1] as never });
    bumpRevision(state);
    expect(linePays(state, stones, 'thePericleanWorks', 'production')).toBe(4);
    expect(linePays(state, other, 'thePericleanWorks', 'production')).toBe(4);
  });

  it('joins the town’s fold', () => {
    const state = bareState(24, 10);
    const stones = town(state, 5, 5);
    const other = town(state, 15, 5);
    realiseItem(state, stones, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    bumpRevision(state);
    const before = explainCity(state, other).flats.production;
    hold(state, 'thePericleanWorks');
    expect(explainCity(state, other).flats.production).toBe(before + 2);
  });

  it('follows the stones: a rival’s wonder pays nothing, and a wonder taken pays the taker', () => {
    const state = bareState(24, 10);
    const mine = town(state, 5, 5);
    const theirs = town(state, 15, 5, 3, 1);
    realiseItem(state, theirs, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    bumpRevision(state);
    hold(state, 'thePericleanWorks');
    expect(linePays(state, mine, 'thePericleanWorks', 'production')).toBe(0);
    theirs.ownerId = 0;
    bumpRevision(state);
    expect(linePays(state, mine, 'thePericleanWorks', 'production')).toBe(2);
  });
});

describe('The Magnaura', () => {
  it('pays +1 science in every town for each Civic card seated', () => {
    const state = bareState(24, 10);
    const first = town(state, 5, 5);
    const second = town(state, 15, 5);
    const [one, two] = ordersOfType('civic');
    hold(state, 'theMagnaura');
    expect(linePays(state, first, 'theMagnaura', 'science')).toBe(0);
    slot(state, one!);
    expect(linePays(state, first, 'theMagnaura', 'science')).toBe(1);
    expect(linePays(state, second, 'theMagnaura', 'science')).toBe(1);
    slot(state, two!);
    expect(linePays(state, first, 'theMagnaura', 'science')).toBe(2);
    expect(linePays(state, second, 'theMagnaura', 'science')).toBe(2);
  });

  it('counts no other type of card, and no Civic card off its chair', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    hold(state, 'theMagnaura');
    slot(state, ordersOfType('military')[0]!);
    slot(state, ordersOfType('economic')[0]!);
    slot(state, ordersOfType('wildcard')[0]!);
    expect(linePays(state, city, 'theMagnaura', 'science')).toBe(0);
    seat(state).statecraft.orders.push(ordersOfType('civic')[0]!);
    bumpRevision(state);
    expect(linePays(state, city, 'theMagnaura', 'science')).toBe(0);
  });

  it('joins the town’s fold', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    slot(state, ordersOfType('civic')[0]!);
    const before = explainCity(state, city).flats.science;
    hold(state, 'theMagnaura');
    expect(explainCity(state, city).flats.science).toBe(before + 1);
  });
});

describe('The Barmakids', () => {
  it('pays +1 food and +1 production in every town for each great person gained', () => {
    const state = bareState(24, 10);
    const first = town(state, 5, 5);
    const second = town(state, 15, 5);
    hold(state, 'theBarmakids');
    for (const city of [first, second]) {
      expect(linePays(state, city, 'theBarmakids', 'food')).toBe(0);
      expect(linePays(state, city, 'theBarmakids', 'production')).toBe(0);
    }
    const player = seat(state);
    player.greatPeopleRecruited = 3;
    bumpRevision(state);
    for (const city of [first, second]) {
      expect(linePays(state, city, 'theBarmakids', 'food')).toBe(3);
      expect(linePays(state, city, 'theBarmakids', 'production')).toBe(3);
    }
  });

  it('counts a person when the seat takes the name, and keeps counting after the person is spent', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const player = seat(state);
    hold(state, 'theBarmakids');
    player.greatPersonOffer = drawGreatPersonOffer(state, player);
    expect(linePays(state, city, 'theBarmakids', 'food')).toBe(0);
    const recruit = settleGreatPersonChoice(state, player, 0);
    expect(recruit).not.toBeNull();
    bumpRevision(state);
    expect(linePays(state, city, 'theBarmakids', 'food')).toBe(1);
    expect(linePays(state, city, 'theBarmakids', 'production')).toBe(1);
    for (const unit of state.units.filter((one) => one.type === 'greatPerson' && one.ownerId === 0)) {
      greatPersonActAt(state, player, unit);
    }
    bumpRevision(state);
    expect(state.units.filter((one) => one.type === 'greatPerson' && one.ownerId === 0)).toEqual([]);
    expect(linePays(state, city, 'theBarmakids', 'food')).toBe(1);
    expect(linePays(state, city, 'theBarmakids', 'production')).toBe(1);
  });

  it('joins the town’s fold', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    seat(state).greatPeopleRecruited = 2;
    bumpRevision(state);
    const before = explainCity(state, city).flats;
    const [food, production] = [before.food, before.production];
    hold(state, 'theBarmakids');
    const after = explainCity(state, city).flats;
    expect(after.food).toBe(food + 2);
    expect(after.production).toBe(production + 2);
  });
});

describe('The Bourgs', () => {
  /** A town with a work on one of its hexes, and that hex worked or not. */
  function withWork(worked: boolean, improvement = 'academy'): { state: GameState; city: City; plain: City } {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const plain = town(state, 15, 5);
    const tile = ring(state, city)[0]!;
    raiseImprovement(tile, improvement as never, state.turn);
    city.workedTiles = worked ? [{ col: tile.col, row: tile.row }] : [];
    plain.workedTiles = [];
    bumpRevision(state);
    return { state, city, plain };
  }

  const growth = (state: GameState, city: City): number => foldGrowthPercent(explainGrowthPercent(state, city));

  it('grows a town working a great-person work 25% faster, and no other town', () => {
    const { state, city, plain } = withWork(true);
    const before = [growth(state, city), growth(state, plain)];
    hold(state, 'theBourgs');
    expect(growth(state, city)).toBe(before[0]! + 25);
    expect(growth(state, plain)).toBe(before[1]!);
  });

  it('asks for a citizen on the work: a work no citizen stands on does nothing', () => {
    const { state, city } = withWork(false);
    const before = growth(state, city);
    hold(state, 'theBourgs');
    expect(growth(state, city)).toBe(before);
  });

  it('counts a prophet’s holy site as a work, and a farm as none', () => {
    const holy = withWork(true, 'holySite');
    const before = growth(holy.state, holy.city);
    hold(holy.state, 'theBourgs');
    expect(growth(holy.state, holy.city)).toBe(before + 25);

    const farm = withWork(true, 'farm');
    const unmoved = growth(farm.state, farm.city);
    hold(farm.state, 'theBourgs');
    expect(growth(farm.state, farm.city)).toBe(unmoved);
  });

  it('counts two worked works once, because the rule asks whether the town works one', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const [one, two] = ring(state, city);
    raiseImprovement(one!, 'academy' as never, state.turn);
    raiseImprovement(two!, 'academy' as never, state.turn);
    city.workedTiles = [one!, two!].map((tile) => ({ col: tile.col, row: tile.row }));
    bumpRevision(state);
    const before = growth(state, city);
    hold(state, 'theBourgs');
    expect(growth(state, city)).toBe(before + 25);
  });
});

describe('The Kitabkhana', () => {
  /** A capital, with a working hex beside it for a person's work. */
  function board(): { state: GameState; player: Player; capital: City; site: Tile } {
    const state = bareState(24, 10);
    const capital = town(state, 5, 5);
    const player = seat(state);
    player.renownPool = 0;
    bumpRevision(state);
    return { state, player, capital, site: ring(state, capital)[0]! };
  }

  /** The renown this runs adds. `renownEarned` is never lowered, so it survives an offer opening. */
  function earned(player: Player, run: () => void): number {
    const before = player.renownEarned;
    run();
    return player.renownEarned - before;
  }

  for (const age of [1, 2, 3, 4]) {
    it(`pays ${200 * age} renown for an act at age ${age}`, () => {
      const { state, player, capital } = board();
      hold(state, 'theKitabkhana');
      atAge(state, age);
      const merchant = person(state, capital, 'merchant');
      expect(earned(player, () => greatPersonActAt(state, player, merchant))).toBe(200 * age);
      expect(state.units.some((unit) => unit.id === merchant.id)).toBe(false);
    });

    it(`pays ${200 * age} renown for a work at age ${age}`, () => {
      const { state, player, site } = board();
      hold(state, 'theKitabkhana');
      atAge(state, age);
      const scholar = person(state, site, 'scholar');
      expect(earned(player, () => greatPersonWorkAt(state, player, scholar, site))).toBe(200 * age);
      expect(state.units.some((unit) => unit.id === scholar.id)).toBe(false);
    });
  }

  it('pays nothing to a seat that does not hold it', () => {
    const { state, player, capital } = board();
    const merchant = person(state, capital, 'merchant');
    expect(earned(player, () => greatPersonActAt(state, player, merchant))).toBe(0);
  });

  it('has no limit in a turn: two people spent pay twice', () => {
    const { state, player, capital, site } = board();
    hold(state, 'theKitabkhana');
    atAge(state, 2);
    const merchant = person(state, capital, 'merchant');
    const scholar = person(state, site, 'scholar');
    expect(
      earned(player, () => {
        greatPersonActAt(state, player, merchant);
        greatPersonWorkAt(state, player, scholar, site);
      }),
    ).toBe(800);
  });

  it('banks through the ladder, so a spending that reaches the rung opens the next offer', () => {
    const { state, player, capital } = board();
    hold(state, 'theKitabkhana');
    atAge(state, 4);
    // The rites are known on this board, so the ladder is live.
    expect(player.techsResearched).toContain(RITES);
    const merchant = person(state, capital, 'merchant');
    expect(player.greatPersonOffer).toBeUndefined();
    greatPersonActAt(state, player, merchant);
    expect(player.greatPersonOffer).toBeDefined();
  });

  it('pays at the work and not the act under The Universal Genius, so a person pays once', () => {
    const { state, player, capital, site } = board();
    hold(state, 'theKitabkhana');
    atAge(state, 3);
    slot(state, 'theUniversalGenius' as OrderId);
    const merchant = person(state, capital, 'merchant');
    expect(earned(player, () => greatPersonActAt(state, player, merchant))).toBe(0);
    expect(state.units.some((unit) => unit.id === merchant.id)).toBe(true);
    merchant.col = site.col;
    merchant.row = site.row;
    bumpRevision(state);
    expect(earned(player, () => greatPersonWorkAt(state, player, merchant, site))).toBe(600);
  });

  it('names the card and the figure in the announcement', () => {
    const { state } = board();
    hold(state, 'theKitabkhana');
    atAge(state, 3);
    const payout = windfallPayout(state, 0, 'greatPersonSpent');
    expect(payout.renown).toHaveLength(1);
    expect(payout.renown[0]).toMatchObject({ card: 'theKitabkhana', amount: 600 });
  });

  it('is priced by the bots at the seat’s pace and age, and at nothing with no person in sight', () => {
    const { state, player, capital } = board();
    atAge(state, 1);
    const price = (): number => scoreCard(player, 'theKitabkhana' as never, valueContext(state, player));
    // No renown a turn and nobody standing: the moment never comes.
    expect(price()).toBe(0);
    person(state, capital, 'merchant');
    const firstAge = price();
    expect(firstAge).toBeGreaterThan(0);
    // The same person is worth twice as much at the second age.
    atAge(state, 2);
    expect(price()).toBeCloseTo(firstAge * 2, 8);
  });
});

describe('The Escorial', () => {
  /** A capital for seat 0, with the technology that lets it call great people. */
  function board(): { state: GameState; player: Player; city: City } {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const player = seat(state);
    player.renownPool = 0;
    player.techsResearched.push(RITES);
    bumpRevision(state);
    return { state, player, city };
  }

  it('deals a great-person offer when a wonder is completed, and adds no renown of its own', () => {
    // A wonder's Triumph pays renown with or without the card, so the seat
    // without the card is the measure.
    const plain = board();
    realiseItem(plain.state, plain.city, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    expect(plain.player.greatPersonOffer).toBeUndefined();

    const { state, player, city } = board();
    hold(state, 'theEscorial');
    expect(player.greatPersonOffer).toBeUndefined();
    realiseItem(state, city, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    expect(player.greatPersonOffer).toBeDefined();
    expect(player.greatPersonOffer!.options.length).toBeGreaterThan(0);
    expect(player.renownEarned).toBe(plain.player.renownEarned);
    expect(player.renownPool).toBe(plain.player.renownPool);
  });

  it('deals it from the phase that finishes a wonder, off the town’s own hammers', () => {
    const { state, player, city } = board();
    hold(state, 'theEscorial');
    city.queue = [{ kind: 'building', id: PLAIN_WONDERS[0] as never }];
    city.hammerBasket = 100_000;
    bumpRevision(state);
    const done = settleProduction(state, city);
    expect(done).not.toBeNull();
    expect(state.wonders.some((row) => row.building === PLAIN_WONDERS[0])).toBe(true);
    expect(player.greatPersonOffer).toBeDefined();
  });

  it('deals nothing for a building that is not a wonder, or to a seat without the card', () => {
    const { state, player, city } = board();
    realiseItem(state, city, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    expect(player.greatPersonOffer).toBeUndefined();
    hold(state, 'theEscorial');
    realiseItem(state, city, { kind: 'building', id: 'granary' as never });
    expect(player.greatPersonOffer).toBeUndefined();
    realiseItem(state, city, { kind: 'unit', id: 'warrior' as never, tile: at(state, city.col, city.row) });
    expect(player.greatPersonOffer).toBeUndefined();
  });

  it('pays only its builder: a rival’s wonder deals no offer', () => {
    const { state, player } = board();
    const theirs = town(state, 15, 5, 3, 1);
    hold(state, 'theEscorial');
    realiseItem(state, theirs, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    expect(player.greatPersonOffer).toBeUndefined();
    expect(seat(state, 1).greatPersonOffer).toBeUndefined();
  });

  it('counts the person as recruited when the seat takes the name', () => {
    const { state, player, city } = board();
    hold(state, 'theEscorial');
    realiseItem(state, city, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    const before = player.greatPeopleRecruited;
    expect(settleGreatPersonChoice(state, player, 0)).not.toBeNull();
    expect(player.greatPeopleRecruited).toBe(before + 1);
  });

  it('with an offer already waiting, gives the renown that fills the ladder instead', () => {
    const { state, player, city } = board();
    hold(state, 'theEscorial');
    realiseItem(state, city, { kind: 'building', id: PLAIN_WONDERS[0] as never });
    const waiting = player.greatPersonOffer;
    expect(waiting).toBeDefined();
    const before = player.renownEarned;
    const rung = renownThreshold(state, player);
    player.renownPool = 0;
    bumpRevision(state);
    realiseItem(state, city, { kind: 'building', id: PLAIN_WONDERS[1] as never });
    expect(player.greatPersonOffer).toBe(waiting);
    // The grant fills the ladder to its next rung. The second wonder's Triumph
    // may add to that, so this is a floor.
    expect(player.renownPool).toBeGreaterThanOrEqual(rung);
    expect(player.renownEarned - before).toBeGreaterThanOrEqual(rung);
  });

  it('asks the wonder fact of the moment, and the Magnum Opus is not a wonder', () => {
    const { state } = board();
    hold(state, 'theEscorial');
    expect(windfallPayout(state, 0, 'completion', 0, 0, { wonder: true }).people).toHaveLength(1);
    expect(windfallPayout(state, 0, 'completion', 0, 0, { wonder: false }).people ?? []).toEqual([]);
    expect(WONDER_IDS).not.toContain('theMagnumOpus');
  });
});

describe('The Carroccio (batch DT6)', () => {
  /** The strength this card gives a piece attacking, read off the fight's own lines. */
  function strength(state: GameState, unit: Unit, side: 'attack' | 'defend' = 'attack'): number {
    return cardCombatLines(state, {
      unit,
      side,
      tile: at(state, unit.col, unit.row),
      vsBarbarians: false,
      vsCity: false,
      targetHp: 100,
      targetMaxHp: 100,
    })
      .filter((line) => line.card === 'theCarroccio')
      .reduce((sum, line) => sum + line.amount, 0);
  }

  it('gives +1 strength for each wonder held, attacking and defending', () => {
    const state = bareState();
    const city = town(state, 5, 5);
    const piece = createUnit(state, 0, 'warrior', 7, 5);
    hold(state, 'theCarroccio');
    expect(strength(state, piece)).toBe(0);
    addBuilding(state, city, WONDER_IDS[0]!);
    addBuilding(state, city, WONDER_IDS[1]!);
    bumpRevision(state);
    expect(strength(state, piece)).toBe(2);
    expect(strength(state, piece, 'defend')).toBe(2);
  });

  it('stops at +8', () => {
    const state = bareState();
    const city = town(state, 5, 5);
    const piece = createUnit(state, 0, 'warrior', 7, 5);
    hold(state, 'theCarroccio');
    for (const id of WONDER_IDS.slice(0, 10)) addBuilding(state, city, id);
    bumpRevision(state);
    expect(strength(state, piece)).toBe(8);
  });

  it('stops counting a wonder when its town changes hands', () => {
    const state = bareState();
    const city = town(state, 5, 5);
    const piece = createUnit(state, 0, 'warrior', 7, 5);
    addBuilding(state, city, WONDER_IDS[0]!);
    hold(state, 'theCarroccio');
    expect(strength(state, piece)).toBe(1);
    city.ownerId = 1;
    bumpRevision(state);
    expect(strength(state, piece)).toBe(0);
  });

  it('adds nothing for a rival’s piece', () => {
    const state = bareState();
    const city = town(state, 5, 5);
    addBuilding(state, city, WONDER_IDS[0]!);
    const theirs = createUnit(state, 1, 'warrior', 7, 5);
    hold(state, 'theCarroccio');
    expect(strength(state, theirs)).toBe(0);
  });

  it('prices the bots’ line by the wonders held and the cap', () => {
    const state = bareState();
    const city = town(state, 5, 5);
    const line = doctrineDef('theCarroccio').effects;
    const none = scoreEffects(line, valueContext(state, seat(state)));
    addBuilding(state, city, WONDER_IDS[0]!);
    bumpRevision(state);
    const one = scoreEffects(line, valueContext(state, seat(state)));
    expect(one).toBeGreaterThan(none);
    for (const id of WONDER_IDS.slice(1, 12)) addBuilding(state, city, id);
    bumpRevision(state);
    const many = scoreEffects(line, valueContext(state, seat(state)));
    const flat: CardEffect = { kind: 'combatLine', amount: 8, side: 'both', when: { test: 'always' } };
    expect(many).toBeCloseTo(scoreEffects([flat], valueContext(state, seat(state))), 6);
  });
});

describe('The Gobelins (batch DT6)', () => {
  const NAME = 'theGobelins';

  /** What this card puts behind one row in this town. */
  function percent(state: GameState, city: City, id: string): number {
    return productionModifiers(state, city, { kind: 'building', id: id as never })
      .filter((entry) => entry.card === NAME)
      .reduce((sum, entry) => sum + entry.percent, 0);
  }

  it('gives +4% toward the Opus for each great-person work in the borders, in any of the seat’s towns', () => {
    const state = bareState(30, 10);
    const first = town(state, 5, 5);
    const second = town(state, 20, 5);
    raiseImprovement(at(state, 5, 4), 'academy', 0);
    raiseImprovement(at(state, 20, 4), 'manufactory', 0);
    bumpRevision(state);
    hold(state, NAME);
    expect(percent(state, first, 'theMagnumOpus')).toBe(8);
    expect(percent(state, second, 'theMagnumOpus')).toBe(8);
  });

  it('counts a holy site, and no farm, and no work outside the borders', () => {
    const state = bareState(30, 10);
    const city = town(state, 5, 5);
    raiseImprovement(at(state, 5, 4), 'holySite', 0);
    raiseImprovement(at(state, 6, 5), 'farm', 0);
    raiseImprovement(at(state, 25, 5), 'academy', 0);
    bumpRevision(state);
    hold(state, NAME);
    expect(percent(state, city, 'theMagnumOpus')).toBe(4);
  });

  it('stops at +40%', () => {
    const state = bareState(30, 10);
    const city = town(state, 8, 5);
    const owned = ownedTiles(state, city).filter((tile) => tile.col !== city.col || tile.row !== city.row);
    expect(owned.length).toBeGreaterThanOrEqual(6);
    // Claim a wider ring, so the count passes ten.
    for (const tile of state.map.tiles) {
      const near = Math.abs(tile.col - city.col) <= 3 && Math.abs(tile.row - city.row) <= 3;
      if (near) {
        state.tileOwner[tile.row * state.map.width + tile.col] = city.id;
        if (tile.col !== city.col || tile.row !== city.row) raiseImprovement(tile, 'academy', 0);
      }
    }
    bumpRevision(state);
    expect(ownedTiles(state, city).length).toBeGreaterThan(11);
    hold(state, NAME);
    expect(percent(state, city, 'theMagnumOpus')).toBe(40);
  });

  it('reaches nothing but the Magnum Opus', () => {
    const state = bareState(30, 10);
    const city = town(state, 5, 5);
    raiseImprovement(at(state, 5, 4), 'academy', 0);
    bumpRevision(state);
    hold(state, NAME);
    expect(percent(state, city, 'monument')).toBe(0);
    const unit = productionModifiers(state, city, { kind: 'unit', id: 'settler' as never });
    expect(unit.filter((entry) => entry.card === NAME)).toEqual([]);
    const wonder = productionModifiers(state, city, { kind: 'building', id: WONDER_IDS[0]! });
    expect(wonder.filter((entry) => entry.card === NAME)).toEqual([]);
  });

  it('prices the bots’ bonus by the works in the borders, up to its cap', () => {
    const state = bareState(30, 10);
    const city = town(state, 5, 5);
    const row = doctrineDef(NAME).effects;
    expect(scoreEffects(row, valueContext(state, seat(state)))).toBe(0);
    raiseImprovement(at(state, 5, 4), 'academy', 0);
    bumpRevision(state);
    const one = scoreEffects(row, valueContext(state, seat(state)));
    expect(one).toBeGreaterThan(0);
    raiseImprovement(at(state, 6, 5), 'academy', 0);
    bumpRevision(state);
    expect(scoreEffects(row, valueContext(state, seat(state)))).toBeCloseTo(one * 2, 6);
    expect(city.ownerId).toBe(0);
  });
});
