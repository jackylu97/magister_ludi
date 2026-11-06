/**
 * **Doctrine batch DT4: Magisterial's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `magisterial.test.ts` holds the rows to
 * the sheet. This file checks that each row pays what its text says, in a real
 * fold. None of these rows has a drawback, so each also has a test that it costs
 * nothing or that it pays nothing where its text does not reach.
 *
 * Batch DT6 adds The Carroccio and The Gobelins. Batch DT9 adds The Arthashastra, The
 * Council of Ten and The Union of Lublin, with a replay of the refit. Batch DT10 adds
 * The Hospitium and The Jinshi, the two rows that change what an Order hand deals.
 * Later batches add the deck's other two Doctrines to this file.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { nextBotDecision, scoreCard, valueContext } from '../../../src/ai/bot';
import { scoreEffects } from '../../../src/ai/value';
import { WONDER_IDS } from '../../../src/sim/buildingData';
import { explainCardImpact, foldCardImpact } from '../../../src/sim/cardImpact';
import {
  explainGrowthPercent,
  foldGrowthPercent,
  foundCityAt,
  ownedTiles,
  realiseItem,
  refreshCityDerived,
  settleProduction,
} from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { dispatch, snapshotState } from '../../../src/sim/game';
import {
  drawGreatPersonOffer,
  greatPersonActAt,
  greatPersonWorkAt,
  settleGreatPersonChoice,
} from '../../../src/sim/greatPeople';
import { type Family, GREAT_PERSON_IDS, type GreatPersonId, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { type Tile, raiseImprovement } from '../../../src/sim/map';
import { explainAuthority, explainHappiness } from '../../../src/sim/meters';
import { RELIGION } from '../../../src/sim/religionData';
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
import { makeRng } from '../../../src/sim/rng';
import { setSlateShadow } from '../../../src/sim/slate';
import {
  type OrderOffer,
  chairCount,
  doctrineBagFor,
  drawDoctrineOffer,
  drawForeignCard,
  drawHandPositions,
  drawOrderOffer,
  drawRarityFirst,
  describeCard,
  eligibleFor,
  expectedHandBags,
  foreignCardBag,
  maliceAt,
  orderAtSlotPosition,
  positionBag,
  rarityFirstOdds,
  rarityOdds,
  slotTypesOf,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  cardActionRule,
  cardCombatLines,
  cardExtraChairs,
  cardRareWeight,
  cardRenownLines,
  cardShoreRaids,
  chairReadingsAt,
  effectsOfKind,
  explainBuildingPackage,
  explainCardCityYields,
  explainCardPercentYields,
  foldBuildingPackage,
  liveEffects,
  runPeriodicBoons,
  windfallPayout,
} from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
  type DeckId,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  type OrderRarity,
  DECK_FILE_DOCTRINES,
  DECK_IDS,
  ORDER_IDS,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  orderDef,
  poolDoctrines,
  slotCount,
} from '../../../src/sim/statecraftData';
import { ABILITY_TECH, TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { explainCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';

/** The rows built so far in this deck, each with the band its table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['theArthashastra', 1],
  ['theHospitium', 1],
  ['theJinshi', 2],
  ['theCouncilOfTen', 3],
  ['theUnionOfLublin', 4],
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

// --- batch DT9: chairs, and reading a source again -------------------------------

/** Lent rows, put back after each test, so a failed test cannot leak one into the next. */
const lent: (() => void)[] = [];
afterEach(() => {
  while (lent.length > 0) lent.pop()!();
});

/** Lends an Order a set of effects for one test, as `lendDoctrineEffects` does a Doctrine. */
function lendOrder(id: OrderId, effects: readonly CardEffect[]): void {
  const row = orderDef(id) as { effects: readonly CardEffect[] };
  const held = row.effects;
  row.effects = effects;
  lent.push(() => {
    row.effects = held;
  });
}

/** Two Orders whose rows these tests write for themselves. */
const CARD = 'waysideShrines' as OrderId;
const OTHER = 'theChoir' as OrderId;

/** Seat 0 takes a Doctrine through the command, which is what opens its chairs. */
function take(state: GameState, id: string): void {
  seat(state).statecraft.pendingDoctrine = { options: [id as DoctrineId] };
  expect(applyCommand(state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
}

/** Puts an Order in one chair for seat 0, wherever it was. */
function seatIn(state: GameState, chair: number, card: OrderId): void {
  const sc = seat(state).statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots = sc.slots.map((held) => (held?.card === card ? null : held));
  sc.slots[chair] = { card, sealedUntil: state.turn };
  bumpRevision(state);
}

/** A capital of three citizens for seat 0. */
function capital(): { state: GameState; player: Player; city: City } {
  const state = bareState(24, 10);
  const city = town(state, 5, 5);
  return { state, player: seat(state), city };
}

/** The last index of the council. */
const lastChair = (player: Player): number => player.statecraft.slots.length - 1;

/** What one card's combat lines give a fight at this hex. */
function strengthFrom(state: GameState, unit: Unit, card: string): number {
  return cardCombatLines(state, {
    unit,
    side: 'attack',
    tile: at(state, unit.col, unit.row),
    vsBarbarians: false,
    vsCity: false,
    targetHp: 100,
    targetMaxHp: 100,
  })
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.amount, 0);
}

describe('The Council of Ten (batch DT9)', () => {
  it('opens two Wildcard chairs at once and moves no seated card', () => {
    const { state, player } = capital();
    const before = player.statecraft.slots.length;
    seatIn(state, 0, CARD);
    seatIn(state, 1, OTHER);
    const seated = player.statecraft.slots.map((held) => held?.card ?? null);

    take(state, 'theCouncilOfTen');

    const sc = player.statecraft;
    expect(sc.slots).toHaveLength(before + 2);
    expect(sc.slots.slice(0, before).map((held) => held?.card ?? null)).toEqual(seated);
    expect(sc.slots.slice(before)).toEqual([null, null]);
    expect(slotTypesOf(sc).slice(before)).toEqual(['wildcard', 'wildcard']);
    expect(chairCount(state, 0, sc.government)).toBe(before + 2);
  });

  it('keeps its chairs under a new government', () => {
    const { state, player } = capital();
    take(state, 'theCouncilOfTen');
    const tierFour = governmentsAtTier(4)[0]!;
    expect(chairCount(state, 0, tierFour)).toBe(slotCount(tierFour) + 2);
    expect(player.statecraft.doctrines).toContain('theCouncilOfTen');
  });

  it('reaches the same board whenever the slate was read, in a game of real commands', () => {
    /**
     * One game, played by command, with the law read between commands or never.
     * The same hand edits in both: culture, and which Doctrine the offer deals. A
     * refit the slate missed would seat the cards differently in the two games, as
     * The Muses' Call once did (`applyChooseDoctrine`).
     */
    const play = (warm: boolean): { snapshot: string; chairs: number; government: GovernmentId } => {
      const g = createGame({
        seed: 3,
        sizeName: 'duel',
        players: [
          { name: 'Ada', color: '#a00', isHuman: true, decks: ['magisterial', 'dominion'] },
          { name: 'Bors', color: '#00a', isHuman: true, decks: ['dominion', 'expansionist'] },
        ],
      });
      const ada = seat(g.state);
      const read = (): void => {
        if (!warm) return;
        chairCount(g.state, 0, ada.statecraft.government);
        liveEffects(g.state, 0);
        for (const city of g.state.cities) explainCardCityYields(g.state, city);
      };
      for (let turn = 0; turn < 6; turn++) {
        ada.culturePool += 10_000;
        seat(g.state, 1).culturePool += 10_000;
        bumpRevision(g.state);
        read();
        expect(dispatch(g, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
        expect(dispatch(g, { type: 'endTurn', playerId: 1 }).ok).toBe(true);
        read();
        for (const id of [0, 1]) {
          const sc = seat(g.state, id).statecraft;
          if (sc.pendingOrder !== undefined) {
            expect(dispatch(g, { type: 'chooseOrder', playerId: id, optionIndex: 0 }).ok).toBe(true);
          }
          if (sc.pendingGovernment !== undefined) {
            expect(dispatch(g, { type: 'adoptGovernment', playerId: id, choiceIndex: 0 }).ok).toBe(true);
          }
          read();
          if (sc.pendingDoctrine !== undefined) {
            if (id === 0 && !sc.doctrines.includes('theArthashastra' as DoctrineId)) {
              sc.pendingDoctrine.options = ['theArthashastra' as DoctrineId];
              expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
              read();
              // Into the chair it just opened, which only a refit can have made.
              const card = sc.orders.find((held) => !sc.slots.some((slot) => slot?.card === held));
              if (card !== undefined) {
                const chair = sc.slots.length - 1;
                expect(dispatch(g, { type: 'slotOrder', playerId: 0, cardId: card, slotIndex: chair }).ok).toBe(true);
              }
            } else {
              expect(dispatch(g, { type: 'skipDoctrineOffer', playerId: id }).ok).toBe(true);
            }
          }
          read();
        }
      }
      expect(ada.statecraft.doctrines).toContain('theArthashastra');
      return { snapshot: snapshotState(g.state), chairs: ada.statecraft.slots.length, government: ada.statecraft.government };
    };
    setSlateShadow(true);
    try {
      const warm = play(true);
      const cold = play(false);
      expect(warm.snapshot).toBe(cold.snapshot);
      expect(warm.chairs).toBe(slotCount(warm.government) + 1);
    } finally {
      setSlateShadow(false);
    }
  });
});

describe('The Arthashastra (batch DT9)', () => {
  /** The rows the chair has read again, which leaves out the Doctrine's own. */
  const secondReadings = (state: GameState) =>
    liveEffects(state, 0).filter(
      (entry) => entry.source.includes('The Arthashastra') && entry.card !== ('theArthashastra' as never),
    );

  /** A held Doctrine, with the chair it opens and a card seated in that chair. */
  function counted(effects: readonly CardEffect[]): { state: GameState; player: Player; city: City } {
    const made = capital();
    lendOrder(CARD, effects);
    take(made.state, 'theArthashastra');
    seatIn(made.state, lastChair(made.player), CARD);
    return made;
  }

  /** The same card, moved one chair up, where it counts once. */
  function moveOffTheChair(state: GameState, player: Player): void {
    seatIn(state, lastChair(player) - 1, CARD);
  }

  it('opens one Wildcard chair, the last one, and marks that chair alone', () => {
    const { state, player } = capital();
    const before = player.statecraft.slots.length;
    take(state, 'theArthashastra');
    const sc = player.statecraft;
    expect(sc.slots).toHaveLength(before + 1);
    expect(slotTypesOf(sc)[before]).toBe('wildcard');
    expect(sc.slots.map((_held, chair) => chairReadingsAt(state, 0, chair))).toEqual([
      ...new Array<number>(before).fill(1),
      2,
    ]);
  });

  it('pays a town line twice, as a line of its own, and once off the chair', () => {
    const { state, player, city } = counted([{ kind: 'pays', where: 'city', gold: 4 } as CardEffect]);
    expect(linePays(state, city, CARD, 'gold')).toBe(8);
    const lines = explainCardCityYields(state, city).filter((line) => line.card === CARD);
    expect(lines.map((line) => line.source)).toEqual([
      `Order · ${orderDef(CARD).name}`,
      `Order · ${orderDef(CARD).name} · The Arthashastra`,
    ]);
    moveOffTheChair(state, player);
    expect(linePays(state, city, CARD, 'gold')).toBe(4);
  });

  it('pays a hex line twice, and once off the chair', () => {
    const { state, player, city } = counted([
      { kind: 'pays', where: 'hex', gold: 3, on: { test: 'improvement', improvement: 'farm' } } as CardEffect,
    ]);
    const hex = at(state, 6, 5);
    raiseImprovement(hex, 'farm' as never, state.turn);
    bumpRevision(state);
    const gold = (): number => foldTileLines(explainTileYield(hex, cityContext(state, city))).gold;
    const doubled = gold();
    moveOffTheChair(state, player);
    const single = gold();
    expect(doubled - single).toBe(3);
    seat(state).statecraft.slots = seat(state).statecraft.slots.map(() => null);
    bumpRevision(state);
    expect(single - gold()).toBe(3);
  });

  it('pays a combat line twice, and once off the chair', () => {
    const { state, player } = counted([
      { kind: 'combatLine', amount: 2, when: { test: 'always' }, side: 'both' } as CardEffect,
    ]);
    const unit = createUnit(state, 0, 'warrior', 5, 6);
    bumpRevision(state);
    expect(strengthFrom(state, unit, CARD)).toBe(4);
    moveOffTheChair(state, player);
    expect(strengthFrom(state, unit, CARD)).toBe(2);
  });

  it('counts a percentage and a rider twice too, as the user’s answer says', () => {
    const { state, player, city } = counted([
      { kind: 'percentYields', yield: 'gold', percent: 10 } as CardEffect,
      { kind: 'windfallRider', occasion: 'kill', grant: { yield: 'gold', amount: 5 } } as CardEffect,
    ]);
    const percent = (): number =>
      explainCardPercentYields(state, city)
        .filter((line) => line.card === CARD)
        .reduce((sum, line) => sum + line.percent, 0);
    const rider = (): number =>
      windfallPayout(state, 0, 'kill')
        .grants.filter((grant) => grant.card === CARD)
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(percent()).toBe(20);
    expect(rider()).toBe(10);
    moveOffTheChair(state, player);
    expect(percent()).toBe(10);
    expect(rider()).toBe(5);
  });

  it('fires a periodic boon twice, which the chair walk reads itself', () => {
    const { state, player } = counted([{ kind: 'periodic', everyTurns: 10, pays: 'gold', amount: 25 } as CardEffect]);
    const fire = (): number => {
      const slot = player.statecraft.slots.find((held) => held?.card === CARD)!;
      slot.nextFiresTurn = state.turn;
      slot.firePeriod = 10;
      bumpRevision(state);
      const before = player.gold;
      runPeriodicBoons(state);
      return player.gold - before;
    };
    expect(fire()).toBe(50);
    moveOffTheChair(state, player);
    expect(fire()).toBe(25);
  });

  it('moves with the last chair when a second Doctrine adds chairs', () => {
    const { state, player, city } = counted([{ kind: 'pays', where: 'city', gold: 4 } as CardEffect]);
    const sc = player.statecraft;
    const held = lastChair(player);
    expect(orderAtSlotPosition(sc, -1, 'wildcard')).toBe(CARD);
    expect(linePays(state, city, CARD, 'gold')).toBe(8);

    take(state, 'theCouncilOfTen');

    // The card has not moved, and it has stopped counting twice.
    expect(sc.slots[held]?.card).toBe(CARD);
    expect(sc.slots).toHaveLength(held + 3);
    expect(orderAtSlotPosition(sc, -1, 'wildcard')).toBeNull();
    expect(chairReadingsAt(state, 0, held)).toBe(1);
    expect(chairReadingsAt(state, 0, lastChair(player))).toBe(2);
    expect(linePays(state, city, CARD, 'gold')).toBe(4);

    seatIn(state, lastChair(player), CARD);
    expect(linePays(state, city, CARD, 'gold')).toBe(8);
  });

  it('adds no chair for a slotRider card in that chair', () => {
    const { state, player } = counted([{ kind: 'slotRider', extra: 1 } as CardEffect]);
    const inTheChair = chairCount(state, 0, player.statecraft.government);
    const riders = cardExtraChairs(state, 0);
    moveOffTheChair(state, player);
    expect(chairCount(state, 0, player.statecraft.government)).toBe(inTheChair);
    expect(cardExtraChairs(state, 0)).toBe(riders);
    // Its own chair and The Arthashastra's, and no third for the second reading.
    expect(riders).toBe(2);
  });

  it('reads no slotRider, slotPosition or metaRule again, even inside a condition', () => {
    const { state } = counted([
      {
        kind: 'conditionRule',
        when: { test: 'cityCountAtLeast', value: 1 },
        then: [
          { kind: 'slotRider', extra: 1 },
          { kind: 'metaRule', rule: 'techCountsTwice', value: 2 },
          { kind: 'slotPosition', slot: 'economic', position: 1, factor: 2 },
          { kind: 'pays', where: 'empire', gold: 1 },
        ],
      } as unknown as CardEffect,
    ]);
    const kinds = liveEffects(state, 0)
      .filter((entry) => entry.card === CARD && entry.source.includes('The Arthashastra'))
      .map((entry) => entry.effect.kind);
    expect(kinds).toEqual(['pays']);
  });

  it('holds a rule once, because a rule is a yes or a no', () => {
    const { state, player } = counted([{ kind: 'rule', rule: 'shoreRaid' } as CardEffect]);
    const ship = createUnit(state, 0, 'trireme', 5, 6);
    bumpRevision(state);
    expect(cardShoreRaids(state, ship)).toBe(1);
    expect(effectsOfKind(state, 0, 'rule').filter((entry) => entry.card === CARD)).toHaveLength(2);
    moveOffTheChair(state, player);
    expect(cardShoreRaids(state, ship)).toBe(1);
    lendOrder(OTHER, [{ kind: 'rule', rule: 'freePillage' } as CardEffect]);
    seatIn(state, lastChair(player), OTHER);
    expect(cardActionRule(state, 0, 'freePillage' as never)).toBe(true);
  });

  it('pays nothing again from an empty chair', () => {
    const { state, player, city } = counted([{ kind: 'pays', where: 'city', gold: 4 } as CardEffect]);
    player.statecraft.slots[lastChair(player)] = null;
    bumpRevision(state);
    expect(linePays(state, city, CARD, 'gold')).toBe(0);
    expect(secondReadings(state)).toEqual([]);
  });

  it('reads nothing again while a malice holds the chair, which a Wildcard malice takes', () => {
    const { state, player, city } = capital();
    lendOrder(CARD, [{ kind: 'pays', where: 'city', gold: 4 } as CardEffect]);
    seatIn(state, 0, CARD);
    // A Wildcard malice sits in the last Wildcard chair, by its own seating rule.
    const before = lastChair(player);
    player.statecraft.slots[before] = null;
    player.malices.push({ id: 'closedSchools' as never, untilAge: 9, chair: before });
    bumpRevision(state);

    take(state, 'theArthashastra');

    // The refit re-seats malices, so it moves to the new last chair and frees the old.
    expect(maliceAt(player, lastChair(player))).toBe('closedSchools');
    expect(maliceAt(player, before)).toBeNull();
    expect(chairReadingsAt(state, 0, lastChair(player))).toBe(2);
    expect(secondReadings(state)).toEqual([]);
    expect(linePays(state, city, CARD, 'gold')).toBe(4);

    // When it leaves, the chair is free and counts twice again.
    player.malices = [];
    seatIn(state, lastChair(player), CARD);
    expect(linePays(state, city, CARD, 'gold')).toBe(8);
  });

  it('does not claim the card in today’s last chair on the offer, and prices the chair when held', () => {
    const { state, player } = capital();
    lendOrder(CARD, [{ kind: 'pays', where: 'empire', gold: 4 } as CardEffect]);
    seatIn(state, lastChair(player), CARD);
    // The new chair is empty, so taking it pays nothing yet.
    const offered = explainCardImpact(state, 0, { kind: 'doctrine', id: 'theArthashastra' as DoctrineId });
    expect(foldCardImpact(offered).gold).toBe(0);
    take(state, 'theArthashastra');
    seatIn(state, lastChair(player), CARD);
    // Held and doubling: the Doctrine's ghost loses its chair and the card with it.
    const held = explainCardImpact(state, 0, { kind: 'doctrine', id: 'theArthashastra' as DoctrineId });
    expect(foldCardImpact(held).gold).toBe(8);
  });

  it('prices its chair by the best card the seat holds, read again', () => {
    const { state, player } = capital();
    const worth = (): number => scoreCard(player, 'theArthashastra' as never, valueContext(state, player));
    const empty = worth();
    lendOrder(CARD, [{ kind: 'pays', where: 'empire', gold: 4 } as CardEffect]);
    lendOrder(OTHER, [{ kind: 'pays', where: 'empire', gold: 2 } as CardEffect]);
    player.statecraft.orders.push(CARD, OTHER);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const best = scoreEffects([{ kind: 'pays', where: 'empire', gold: 4 } as CardEffect], ctx);
    expect(best).toBeGreaterThan(0);
    expect(worth() - empty).toBeCloseTo(best, 6);
  });
});

describe('where a bot seats the chair that counts twice (batch DT9)', () => {
  /** A real game with nothing else waiting, and The Arthashastra held. */
  function holder(): { state: GameState; player: Player } {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: false, decks: ['magisterial', 'dominion'] },
        { name: 'Bors', color: '#00a', isHuman: false, decks: ['dominion', 'expansionist'] },
      ],
      barbarians: false,
    });
    const state = g.state;
    const city = town(state, 8, 8);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    const player = seat(state);
    player.researching = 'earthenware' as never;
    player.statecraft.slots = player.statecraft.slots.map(() => null);
    bumpRevision(state);
    take(state, 'theArthashastra');
    return { state, player };
  }

  /** Steps the bot until it reaches a council command, answering what stands before it. */
  function nextCouncilMove(state: GameState): { type: string; slotIndex?: number; cardId?: string } | null {
    let decision = nextBotDecision(state, 0);
    for (let guard = 0; guard < 8 && decision !== null; guard++) {
      if (decision.command.type === 'slotOrder' || decision.command.type === 'unslotOrder') break;
      expect(applyCommand(state, decision.command).ok).toBe(true);
      decision = nextBotDecision(state, 0);
    }
    return decision === null ? null : (decision.command as never);
  }

  it('seats the card with the most to read again in that chair first', () => {
    const { state, player } = holder();
    lendOrder(CARD, [{ kind: 'pays', where: 'empire', gold: 6 } as CardEffect]);
    lendOrder(OTHER, [{ kind: 'pays', where: 'empire', gold: 1 } as CardEffect]);
    player.statecraft.orders = [OTHER, CARD];
    bumpRevision(state);
    const move = nextCouncilMove(state);
    expect(move?.type).toBe('slotOrder');
    expect(move?.cardId).toBe(CARD);
    expect(move?.slotIndex).toBe(lastChair(player));
  });

  it('moves a seated card into the empty chair when the bench has nothing, and stays there', () => {
    const { state, player } = holder();
    lendOrder(CARD, [{ kind: 'pays', where: 'empire', gold: 6 } as CardEffect]);
    player.statecraft.orders = [CARD];
    seatIn(state, 0, CARD);
    player.statecraft.slots[0]!.sealedUntil = state.turn - 1;
    bumpRevision(state);

    const out = nextCouncilMove(state);
    expect(out?.type).toBe('unslotOrder');
    expect(out?.slotIndex).toBe(0);
    expect(applyCommand(state, out as never).ok).toBe(true);

    const back = nextCouncilMove(state);
    expect(back?.type).toBe('slotOrder');
    expect(back?.cardId).toBe(CARD);
    expect(back?.slotIndex).toBe(lastChair(player));
    expect(applyCommand(state, back as never).ok).toBe(true);

    // Seated in the chair, with its seal off, the arm has nothing left to do.
    player.statecraft.slots[lastChair(player)]!.sealedUntil = state.turn - 1;
    bumpRevision(state);
    const after = nextCouncilMove(state);
    expect(after === null || after.type !== 'unslotOrder').toBe(true);
  });

  it('moves no card toward a chair a malice holds', () => {
    const { state, player } = holder();
    lendOrder(CARD, [{ kind: 'pays', where: 'empire', gold: 6 } as CardEffect]);
    player.statecraft.orders = [CARD];
    seatIn(state, 0, CARD);
    player.statecraft.slots[0]!.sealedUntil = state.turn - 1;
    player.malices.push({ id: 'closedSchools' as never, untilAge: 9, chair: lastChair(player) });
    bumpRevision(state);
    const move = nextCouncilMove(state);
    expect(move === null || move.type !== 'unslotOrder').toBe(true);
  });

  it('leaves a card with nothing to read again where it sits', () => {
    const { state, player } = holder();
    lendOrder(CARD, [{ kind: 'rule', rule: 'freePillage' } as CardEffect]);
    player.statecraft.orders = [CARD];
    seatIn(state, 0, CARD);
    player.statecraft.slots[0]!.sealedUntil = state.turn - 1;
    bumpRevision(state);
    const move = nextCouncilMove(state);
    expect(move === null || move.type !== 'unslotOrder').toBe(true);
  });
});

describe('The Union of Lublin (batch DT9)', () => {
  /** A seat on The Estates, tier 26, holding the Doctrine. */
  function union(): { state: GameState; player: Player; city: City; others: GovernmentId[] } {
    const made = capital();
    const sc = made.player.statecraft;
    sc.government = 'theEstates' as GovernmentId;
    sc.slots = new Array(slotCount(sc.government)).fill(null);
    bumpRevision(made.state);
    take(made.state, 'theUnionOfLublin');
    const others = governmentsAtTier(26).filter((id) => id !== sc.government);
    return { ...made, others };
  }

  it('reads the three governments of the tier, each once and under one label', () => {
    const { state, others } = union();
    expect(others).toEqual(['theSultanate', 'theCuria']);
    const live = liveEffects(state, 0);
    const labelsOf = (id: GovernmentId): string[] => [
      ...new Set(live.filter((entry) => entry.card === id).map((entry) => entry.source)),
    ];
    expect(labelsOf('theEstates' as GovernmentId)).toEqual(['Government · The Estates']);
    for (const id of others) {
      const name = governmentDef(id).name;
      expect(labelsOf(id)).toEqual([`Government · ${name} · The Union of Lublin`]);
      expect(live.filter((entry) => entry.card === id)).toHaveLength(governmentDef(id).effects.length);
    }
  });

  it('pays another government’s line in a real fold, and nothing without the Doctrine', () => {
    const { state, player, city } = union();
    // The Sultanate's +25% toward units, which The Estates does not have.
    const unitLines = () =>
      productionModifiers(state, city, { kind: 'unit', id: 'warrior' as never }).filter((line) =>
        line.source.includes('The Union of Lublin'),
      );
    expect(unitLines()).toHaveLength(1);
    expect(unitLines()[0]!.source).toContain('The Sultanate');
    expect(unitLines()[0]!.percent).toBe(25);
    player.statecraft.doctrines = [];
    bumpRevision(state);
    expect(unitLines()).toEqual([]);
  });

  it('adds no chairs, and leaves the chairs to the held government', () => {
    const { state, player } = union();
    const sc = player.statecraft;
    expect(sc.slots).toHaveLength(slotCount(sc.government));
    expect(slotTypesOf(sc)).toHaveLength(slotCount(sc.government));
    expect(chairCount(state, 0, sc.government)).toBe(slotCount(sc.government));
    // A government with a chair rider of its own would still add none.
    const row = governmentDef('theCuria' as GovernmentId) as { effects: readonly CardEffect[] };
    const held = row.effects;
    row.effects = [...held, { kind: 'slotRider', extra: 3 } as CardEffect];
    lent.push(() => {
      row.effects = held;
    });
    bumpRevision(state);
    expect(cardExtraChairs(state, 0)).toBe(0);
  });

  it('follows the seat to the next government it holds', () => {
    const { state, player } = union();
    player.statecraft.government = 'theCuria' as GovernmentId;
    bumpRevision(state);
    const live = liveEffects(state, 0);
    expect(live.some((entry) => entry.source === 'Government · The Estates · The Union of Lublin')).toBe(true);
    expect(live.some((entry) => entry.source === 'Government · The Curia')).toBe(true);
    expect(live.some((entry) => entry.source === 'Government · The Curia · The Union of Lublin')).toBe(false);
  });

  it('is priced at what the other two governments pay', () => {
    const { state, player, others } = union();
    const ctx = valueContext(state, player);
    const each = others.reduce((sum, id) => sum + scoreEffects(governmentDef(id).effects, ctx), 0);
    const row = doctrineDef('theUnionOfLublin' as DoctrineId).effects;
    expect(scoreEffects(row, ctx)).toBeCloseTo(each, 6);
    expect(each).toBeGreaterThan(0);
  });
});

// --- batch DT10: the Order hand ----------------------------------------------------

const HOSPITIUM = 'theHospitium' as DoctrineId;
const JINSHI = 'theJinshi' as DoctrineId;
/** The technology that opens the reroll's door. */
const REROLL_DOOR = ABILITY_TECH.get(RELIGION.reroll.ability)!;
/** A two-deck seat: Magisterial, and one other, so four decks are foreign to it. */
const TWO_DECKS: readonly DeckId[] = ['magisterial', 'dominion'];

/** Seat 0 with one town and these decks, at the given draft count. No hand on the table. */
function handSeat(decks: readonly DeckId[] = TWO_DECKS, drafts = 5): { state: GameState; player: Player } {
  const state = bareState(20, 10);
  town(state, 3, 5);
  const player = seat(state);
  player.decks = [...decks];
  player.statecraft.drafts = drafts;
  bumpRevision(state);
  return { state, player };
}

/** Deals a new hand, as a new draft does: with no hand on the table to keep positions from. */
function deal(state: GameState, player: Player): OrderOffer {
  delete player.statecraft.pendingOrder;
  return drawOrderOffer(state, player);
}

/** Gives seat 0 a technology. */
function know(state: GameState, tech: TechId): void {
  seat(state).techsResearched.push(tech);
  bumpRevision(state);
}

/** The share of a rung among the cards drawn. */
function rungShare(cards: readonly OrderId[], rarity: OrderRarity): number {
  return cards.filter((id) => orderDef(id).rarity === rarity).length / cards.length;
}

/** What `rarityFirstOdds` gives a rung, summed over the bag's cards. */
function oddsOfRung(odds: readonly { id: OrderId; chance: number }[], rarity: OrderRarity): number {
  return odds.filter(({ id }) => orderDef(id).rarity === rarity).reduce((sum, { chance }) => sum + chance, 0);
}

/** Holds every card of the seat's foreign bag, leaving `keep`. Holding a card can open others. */
function narrowForeignBagTo(state: GameState, player: Player, keep?: OrderId): void {
  for (let round = 0; round < 10; round++) {
    const others = foreignCardBag(state, player).filter((id) => id !== keep);
    if (others.length === 0) break;
    player.statecraft.orders.push(...others);
    bumpRevision(state);
  }
  expect(foreignCardBag(state, player)).toEqual(keep === undefined ? [] : [keep]);
}

describe('The Hospitium', () => {
  it('says what its text says, and states what happens at the edges', () => {
    const clauses = describeCard(HOSPITIUM).map((clause) => stripRefs(clause.text));
    expect(clauses).toEqual(['the third card in each of your Order hands comes from a deck you do not hold']);
    expect(doctrineDef(HOSPITIUM).note).toContain('fits the chair of its type');
  });

  it('deals a card of a deck the seat does not hold third, over a thousand seeds’ hands', () => {
    const { state, player } = handSeat();
    hold(state, HOSPITIUM);
    const seen = new Set<OrderId>();
    for (let seed = 1; seed <= 1000; seed++) {
      state.rng = makeRng(seed);
      // Every turn of the cadence, because the rule takes the third position whatever it says.
      player.statecraft.drafts = 5 + (seed % 4);
      const offer = deal(state, player);
      expect(offer.positions).toEqual([
        { kind: 'deck', deck: 'magisterial' },
        { kind: 'deck', deck: 'dominion' },
        { kind: 'foreign' },
      ]);
      expect(offer.options).toHaveLength(3);
      expect(orderDef(offer.options[0]!).decks).toEqual(['magisterial']);
      expect(orderDef(offer.options[1]!).decks).toEqual(['dominion']);
      const third = offer.options[2]!;
      const home = orderDef(third).decks;
      expect(home.length, third).toBeGreaterThan(0);
      expect(home.some((deck) => TWO_DECKS.includes(deck)), third).toBe(false);
      expect(foreignCardBag(state, player), third).toContain(third);
      seen.add(third);
    }
    // More than a fixed card: the bag is spread over the decks the seat does not hold.
    const homes = new Set([...seen].flatMap((id) => orderDef(id).decks));
    expect(homes.size).toBeGreaterThan(1);
  });

  it('leaves the cadence alone for a seat that does not hold it', () => {
    const { state, player } = handSeat();
    expect(drawHandPositions(state, player, 1)[2]).toEqual({ kind: 'generic' });
    expect(drawHandPositions(state, player, 2)[2]).toEqual({ kind: 'cross' });
    expect(drawHandPositions(state, player, 4)[2]).toEqual({ kind: 'deck', deck: 'magisterial' });
    hold(state, HOSPITIUM);
    for (const draft of [1, 2, 3, 4]) {
      expect(drawHandPositions(state, player, draft)[2]).toEqual({ kind: 'foreign' });
    }
  });

  it('deals by the deal’s own gates: a card the seat holds, or of another band, never comes', () => {
    const { state, player } = handSeat();
    hold(state, HOSPITIUM);
    const bag = foreignCardBag(state, player);
    expect(bag.length).toBeGreaterThan(1);
    const keep = bag[0]!;
    narrowForeignBagTo(state, player, keep);
    for (let seed = 1; seed <= 20; seed++) {
      state.rng = makeRng(seed);
      expect(deal(state, player).options[2]).toBe(keep);
    }
    // The next draft's reading sees the next band.
    const band = (drafts: number) => foreignCardBag(state, player, drafts).map((id) => orderDef(id).band);
    expect(new Set(band(player.statecraft.drafts))).toEqual(new Set([orderDef(keep).band]));
  });

  it('falls back to the seat’s own cards when the foreign bag is empty, and keeps the position', () => {
    const { state, player } = handSeat();
    hold(state, HOSPITIUM);
    narrowForeignBagTo(state, player);
    const offer = deal(state, player);
    expect(offer.positions![2]).toEqual({ kind: 'foreign' });
    expect(offer.options).toHaveLength(3);
    expect(eligibleFor(state, player)).toContain(offer.options[2]);
    expect(new Set(offer.options).size).toBe(3);
  });

  it('spends one roll for each card, as any hand does', () => {
    const { state, player } = handSeat();
    hold(state, HOSPITIUM);
    state.rng = makeRng(7);
    deal(state, player);
    const plain = handSeat();
    plain.state.rng = makeRng(7);
    deal(plain.state, plain.player);
    expect(state.rng.state).toBe(plain.state.rng.state);
  });

  it('keeps the position through a reroll, and a hand dealt before it keeps its own', () => {
    const { state, player } = handSeat();
    know(state, REROLL_DOOR);
    player.faithPool = 5_000;
    hold(state, HOSPITIUM);
    player.statecraft.pendingOrder = deal(state, player);
    const before = player.statecraft.pendingOrder.positions;
    expect(applyCommand(state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(true);
    const after = player.statecraft.pendingOrder!;
    expect(after.positions).toEqual(before);
    expect(foreignCardBag(state, player)).toContain(after.options[2]);

    // A hand on the table when the Doctrine is taken: a redraw asks what it asked.
    const old = handSeat();
    know(old.state, REROLL_DOOR);
    old.player.faithPool = 5_000;
    old.player.statecraft.pendingOrder = deal(old.state, old.player);
    const asked = old.player.statecraft.pendingOrder.positions;
    expect(asked![2]!.kind).not.toBe('foreign');
    hold(old.state, HOSPITIUM);
    expect(applyCommand(old.state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(true);
    expect(old.player.statecraft.pendingOrder!.positions).toEqual(asked);
  });

  it('changes nothing for a rainbow seat: the same hands, and the same rolls', () => {
    const { state, player } = handSeat(DECK_IDS);
    const twin = handSeat(DECK_IDS);
    hold(state, HOSPITIUM);
    expect(foreignCardBag(state, player)).toEqual([]);
    for (let n = 0; n < 40; n++) {
      player.statecraft.drafts = 5 + (n % 4);
      twin.player.statecraft.drafts = 5 + (n % 4);
      const hand = deal(state, player);
      expect(hand.positions!.some((position) => position.kind === 'foreign')).toBe(false);
      expect(hand).toEqual(deal(twin.state, twin.player));
      expect(state.rng.state).toBe(twin.state.rng.state);
    }
  });

  it('seats a foreign card in the chair of its type, through the reducer', () => {
    const { state, player } = handSeat();
    hold(state, HOSPITIUM);
    const types = slotTypesOf(player.statecraft);
    const card = foreignCardBag(state, player).find((id) => types.includes(orderDef(id).type as never));
    expect(card).toBeDefined();
    narrowForeignBagTo(state, player, card);
    player.statecraft.pendingOrder = deal(state, player);
    expect(player.statecraft.pendingOrder.options[2]).toBe(card);
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 2 }).ok).toBe(true);
    expect(player.statecraft.orders).toContain(card);
    const chair = slotTypesOf(player.statecraft).indexOf(orderDef(card!).type as never);
    expect(chair).toBeGreaterThanOrEqual(0);
    expect(
      applyCommand(state, { type: 'slotOrder', playerId: 0, cardId: card!, slotIndex: chair }).ok,
    ).toBe(true);
    expect(player.statecraft.slots[chair]?.card).toBe(card);
  });

  it('replays: one state and one log deal one hand', () => {
    const { state, player } = handSeat();
    hold(state, HOSPITIUM);
    hold(state, JINSHI);
    state.rng = makeRng(99);
    const saved = snapshotState(state);
    const first = deal(state, player);
    const copy = JSON.parse(saved) as GameState;
    const second = deal(copy, seat(copy));
    expect(second).toEqual(first);
    expect(copy.rng.state).toBe(state.rng.state);
  });

  it('teaches the bots’ view of the next hand, and of a hand on the table', () => {
    const { state, player } = handSeat();
    const draft = player.statecraft.drafts + 1;
    const ordinary = expectedHandBags(state, player);
    hold(state, HOSPITIUM);
    const bags = expectedHandBags(state, player);
    expect(bags).toHaveLength(3);
    expect(bags[0]).toEqual(ordinary[0]);
    expect(bags[1]).toEqual(ordinary[1]);
    expect(bags[2]).toEqual(foreignCardBag(state, player, draft));
    expect(bags[2]).toEqual(positionBag(foreignCardBag(state, player, draft), { kind: 'foreign' }, player.decks));
    // The two answers the price asks for, whatever the seat holds.
    expect(expectedHandBags(state, player, false)).toEqual(ordinary);
    expect(expectedHandBags(state, player, true)).toEqual(bags);
    // An ordinary hand on the table: the bots read what it asked.
    player.statecraft.pendingOrder = { options: [], positions: [{ kind: 'generic' }] };
    expect(expectedHandBags(state, player)[0]!.every((id) => orderDef(id).decks.length === 0)).toBe(true);
    // A foreign bag with nothing left falls back to the union, as the deal does.
    delete player.statecraft.pendingOrder;
    narrowForeignBagTo(state, player);
    expect(expectedHandBags(state, player)[2]).toEqual(eligibleFor(state, player, draft));
  });
});

describe('The Jinshi', () => {
  it('says what its text says', () => {
    expect(describeCard(JINSHI).map((clause) => stripRefs(clause.text))).toEqual([
      'rare cards come up twice as often in your Order hands',
    ]);
  });

  it('reads about 55 / 27 / 18 on a bag that holds all three rungs', () => {
    const { state, player } = handSeat(['magisterial', 'dominion'], 12);
    const bag = eligibleFor(state, player);
    for (const rarity of ['common', 'uncommon', 'rare'] as const) {
      expect(bag.some((id) => orderDef(id).rarity === rarity), rarity).toBe(true);
    }
    expect(rarityOdds(0, 100)).toEqual({ common: 60, uncommon: 30, rare: 20 });
    const odds = rarityFirstOdds(bag, 0, 100);
    expect(oddsOfRung(odds, 'common')).toBeCloseTo(60 / 110, 8);
    expect(oddsOfRung(odds, 'uncommon')).toBeCloseTo(30 / 110, 8);
    expect(oddsOfRung(odds, 'rare')).toBeCloseTo(20 / 110, 8);
    expect(odds.reduce((sum, { chance }) => sum + chance, 0)).toBeCloseTo(1, 8);
    // The bare table is untouched.
    expect(rarityOdds(0)).toEqual({ common: 60, uncommon: 30, rare: 10 });
  });

  it('lets the pity still move points: a pass moves them, and the rise doubles what the rung holds', () => {
    expect(rarityOdds(1, 100)).toEqual({ common: 45, uncommon: 40, rare: 30 });
    expect(rarityOdds(2, 100)).toEqual({ common: 30, uncommon: 50, rare: 40 });
    // Common's floor still bounds the shift.
    expect(rarityOdds(50, 100).common).toBe(0);
    expect(rarityOdds(50, 100).rare).toBeCloseTo(rarityOdds(50).rare * 2, 8);
    expect(rarityOdds(4, 100).rare).toBeGreaterThan(rarityOdds(3, 100).rare);
  });

  it('agrees with the draw: `rarityFirstOdds` is what `drawRarityFirst` samples', () => {
    const { state, player } = handSeat(['magisterial', 'dominion'], 12);
    const bag = eligibleFor(state, player);
    for (const [skips, rarePercent] of [[0, 100], [2, 100], [0, 0]] as const) {
      const odds = rarityFirstOdds(bag, skips, rarePercent);
      const draws: OrderId[] = [];
      for (let n = 0; n < 8000; n++) draws.push(drawRarityFirst(state, bag, skips, rarePercent)!);
      for (const rarity of ['common', 'uncommon', 'rare'] as const) {
        expect(Math.abs(rungShare(draws, rarity) - oddsOfRung(odds, rarity)), `${skips} ${rarity}`).toBeLessThan(0.025);
      }
    }
  });

  it('reads one figure off the seat: a hundred for a holder, nothing for another', () => {
    const { state } = handSeat();
    expect(cardRareWeight(state, 0)).toBe(0);
    hold(state, JINSHI);
    expect(cardRareWeight(state, 0)).toBe(100);
    expect(cardRareWeight(state, 1)).toBe(0);
  });

  it('deals an Order hand at those odds, for its holder only', () => {
    const { state, player } = handSeat(['magisterial', 'dominion'], 12);
    const twin = handSeat(['magisterial', 'dominion'], 12);
    hold(state, JINSHI);
    const own = positionBag(eligibleFor(state, player), { kind: 'deck', deck: 'magisterial' }, player.decks);
    const held: OrderId[] = [];
    const plain: OrderId[] = [];
    for (let seed = 1; seed <= 4000; seed++) {
      state.rng = makeRng(seed);
      twin.state.rng = makeRng(seed);
      held.push(deal(state, player).options[0]!);
      plain.push(deal(twin.state, twin.player).options[0]!);
    }
    expect(Math.abs(rungShare(held, 'rare') - oddsOfRung(rarityFirstOdds(own, 0, 100), 'rare'))).toBeLessThan(0.03);
    expect(Math.abs(rungShare(plain, 'rare') - oddsOfRung(rarityFirstOdds(own, 0), 'rare'))).toBeLessThan(0.03);
    expect(rungShare(held, 'rare')).toBeGreaterThan(rungShare(plain, 'rare') * 1.5);
  });

  it('reaches The Hospitium’s third card as well, because that card is part of the hand', () => {
    const { state, player } = handSeat(['magisterial', 'dominion'], 12);
    hold(state, HOSPITIUM);
    hold(state, JINSHI);
    const bag = foreignCardBag(state, player);
    const thirds: OrderId[] = [];
    for (let seed = 1; seed <= 4000; seed++) {
      state.rng = makeRng(seed);
      thirds.push(deal(state, player).options[2]!);
    }
    expect(Math.abs(rungShare(thirds, 'rare') - oddsOfRung(rarityFirstOdds(bag, 0, 100), 'rare'))).toBeLessThan(0.03);
  });

  it('does not change The Cabinet of Curiosities’ draw', () => {
    const { state, player } = handSeat(['magisterial', 'dominion'], 12);
    const twin = handSeat(['magisterial', 'dominion'], 12);
    hold(state, JINSHI);
    for (let seed = 1; seed <= 200; seed++) {
      state.rng = makeRng(seed);
      twin.state.rng = makeRng(seed);
      expect(drawForeignCard(state, player)).toBe(drawForeignCard(twin.state, twin.player));
      expect(state.rng.state).toBe(twin.state.rng.state);
    }
  });

  it('does not change a Doctrine offer', () => {
    const { state, player } = handSeat();
    const twin = handSeat();
    // The Jinshi is of tier 10, so holding it leaves the two seats' tier-4 bags alike.
    hold(state, JINSHI);
    state.rng = makeRng(5);
    twin.state.rng = makeRng(5);
    expect(drawDoctrineOffer(state, player, 4)).toEqual(drawDoctrineOffer(twin.state, twin.player, 4));
  });
});
