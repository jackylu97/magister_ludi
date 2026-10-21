/**
 * **The Expansionist cards changed in place by the themes pass** (batch E7 of
 * `docs/plans/expansionist-themes-triage.md`). `expansionist.test.ts` checks
 * the rows against the sheet; this file checks what the ten cards now do, and
 * the rows E7 retired and retyped:
 *
 *   · The Rope Stretchers: +1 science in each town for every three improved
 *     tiles in its borders, worked or not, tended works left out (reading 34);
 *   · The Milestones and The Teeming Realm: the same counts, paying gold and
 *     culture, and science and culture;
 *   · The Measure of the Land: science, at most +10;
 *   · The Mother City: the capital alone, +5% production and culture for each
 *     town founded this game, with no cap (readings 4 and 21);
 *   · Plenty: five times the new population;
 *   · The Staked Claims: Tier II (reading 35);
 *   · the three institutions: Six Gardens (+1 culture on tended hexes, reading
 *     22), The Wide Country (borders grow 25% faster, reading 24) and The
 *     Domesday Survey (+1 science on improved or tended hexes, doubled on
 *     improved ones by The Age of Improvement, reading 23), each paid only
 *     after the goal is met and the card has left its chair;
 *   · the fifteen rows retired with no type, and the six new types (readings
 *     7 and 8).
 *
 * Batch E8 adds five new cards in shapes that already existed, and this file
 * checks what each one does:
 *
 *   · The Founding Furrow: a founding pays culture equal to five times the
 *     towns you hold, the new town included (reading 16);
 *   · The Horrea: +1 authority for each Granary you hold (reading 17);
 *   · The Land Hunger: while a met empire holds more towns, settlers are built
 *     25% faster and move one hex further. The great person shares the
 *     settler's model, so the row names the settler itself (readings 18 and
 *     39);
 *   · The Many Hands: +3% toward empire buildings for each town you hold, at
 *     most +36% (reading 19);
 *   · The Capitolia: +1 culture in each town for each empire building you hold
 *     (reading 20).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { runCommissions } from '../../../src/sim/commissions';
import { type Tile, mapRange, raiseImprovement, tileHex, tileIndex } from '../../../src/sim/map';
import { explainAuthority } from '../../../src/sim/meters';
import { layRoad } from '../../../src/sim/roads';
import {
  type City,
  type GameState,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cardRulePercent,
  commissionFulfilledTurn,
  explainCardCityYields,
  explainCardPercentYields,
  foldCardRulePercent,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type CommissionGoal,
  type OrderId,
  DECK_FILE_ORDERS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { fullMovement } from '../../../src/sim/units';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for seat 0, with an empty queue. */
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

/** Runs a commission with a smaller goal, so a small board can meet it. */
function withGoals(id: string, goals: CommissionGoal[], run: () => void): void {
  const spec = orderDef(id as OrderId).commission!;
  const before = spec.goals;
  spec.goals = goals;
  try {
    run();
  } finally {
    spec.goals = before;
  }
}

/** What one card's town lines pay this town, in one voice. */
function townPays(state: GameState, city: City, card: string, voice: 'science' | 'culture' | 'production'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The percentage one card puts on this town, in one voice. */
function townPercent(state: GameState, city: City, card: string, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** What the hex lines naming one card pay on this hex, in one voice. */
function hexPays(state: GameState, tile: Tile, name: string, voice: 'science' | 'culture'): number {
  return explainTileYield(tile, yieldContextFor(state, 0))
    .filter((line) => line.source.includes(name))
    .reduce((sum, line) => sum + (line[voice] ?? 0), 0);
}

/** True while the card sits in one of seat 0's chairs. */
function seated(state: GameState, card: string): boolean {
  return playerById(state, 0)!.statecraft.slots.some((held) => held?.card === card);
}

describe('the Expansionist batch E7: the counts that changed their pay', () => {
  it('The Rope Stretchers pays science for every three improved tiles in a town, worked or not, tended works left out', () => {
    const state = bareState();
    const city = town(state, 5, 5, 1);
    slot(state, 0, 'theRopeStretchers');
    const hexes = ring(state, city);
    expect(hexes.length).toBeGreaterThanOrEqual(6);
    for (const tile of hexes.slice(0, 2)) raiseImprovement(tile, 'farm', state.turn);
    bumpRevision(state);
    expect(townPays(state, city, 'theRopeStretchers', 'science')).toBe(0);
    raiseImprovement(hexes[2]!, 'farm', state.turn);
    bumpRevision(state);
    // Three improved tiles, and the town of one citizen works at most one.
    expect(townPays(state, city, 'theRopeStretchers', 'science')).toBe(1);
    expect(townPays(state, city, 'theRopeStretchers', 'production')).toBe(0);
    // A tended work is not an improvement, so three of them add nothing.
    for (const tile of hexes.slice(3, 6)) raiseImprovement(tile, 'burnedCountry', state.turn);
    bumpRevision(state);
    expect(townPays(state, city, 'theRopeStretchers', 'science')).toBe(1);
    for (const tile of hexes.slice(3, 6)) raiseImprovement(tile, 'farm', state.turn);
    bumpRevision(state);
    expect(townPays(state, city, 'theRopeStretchers', 'science')).toBe(2);
  });

  it('The Milestones pays gold and culture for every three road hexes, and no production', () => {
    const state = bareState(16, 10);
    const home = town(state, 2, 5, 3);
    slot(state, 0, 'theMilestones');
    for (let col = 3; col <= 8; col++) layRoad(at(state, col, 5), 0);
    bumpRevision(state);
    expect(townPercent(state, home, 'theMilestones', 'gold')).toBe(2);
    expect(townPercent(state, home, 'theMilestones', 'culture')).toBe(2);
    expect(townPercent(state, home, 'theMilestones', 'production')).toBe(0);
  });

  it('The Teeming Realm pays science and culture for every ten citizens, at most +30%', () => {
    const state = bareState(16, 10);
    const home = town(state, 2, 5, 12);
    town(state, 9, 5, 9);
    slot(state, 0, 'theTeemingRealm');
    expect(townPercent(state, home, 'theTeemingRealm', 'science')).toBe(2);
    expect(townPercent(state, home, 'theTeemingRealm', 'culture')).toBe(2);
    expect(townPercent(state, home, 'theTeemingRealm', 'production')).toBe(0);
    expect(townPercent(state, home, 'theTeemingRealm', 'food')).toBe(0);
    home.population = 400;
    bumpRevision(state);
    expect(townPercent(state, home, 'theTeemingRealm', 'science')).toBe(30);
  });

  it('The Measure of the Land pays science for every 25 hexes the empire owns, at most +10', () => {
    const state = bareState(30, 20);
    const spots: [number, number][] = [
      [3, 3],
      [10, 3],
      [17, 3],
      [24, 3],
      [3, 11],
      [10, 11],
      [17, 11],
      [24, 11],
    ];
    const towns = spots.map(([col, row]) => town(state, col, row, 3));
    slot(state, 0, 'theMeasureOfTheLand');
    /** Every unowned hex within three of the town joins it. */
    const claimAll = (city: City): void => {
      for (const tile of mapRange(state.map, tileHex(at(state, city.col, city.row)), 3)) {
        const index = tileIndex(state.map, tile.col, tile.row);
        if (state.tileOwner[index] === null) state.tileOwner[index] = city.id;
      }
      bumpRevision(state);
    };
    const owned = (): number => towns.reduce((sum, city) => sum + ownedTiles(state, city).length, 0);
    claimAll(towns[0]!);
    claimAll(towns[1]!);
    // The count is the empire's, so every town is paid by the same figure.
    const two = Math.floor(owned() / 25);
    expect(two).toBeGreaterThanOrEqual(2);
    expect(two).toBeLessThan(10);
    expect(townPays(state, towns[0]!, 'theMeasureOfTheLand', 'science')).toBe(two);
    expect(townPays(state, towns[7]!, 'theMeasureOfTheLand', 'science')).toBe(two);
    expect(townPays(state, towns[0]!, 'theMeasureOfTheLand', 'production')).toBe(0);
    for (const city of towns) claimAll(city);
    expect(Math.floor(owned() / 25)).toBeGreaterThan(10);
    expect(townPays(state, towns[7]!, 'theMeasureOfTheLand', 'science')).toBe(10);
  });

  it('The Mother City gives the capital alone +5% production and culture for each town founded, with no cap', () => {
    const state = bareState(20, 10);
    const capital = town(state, 2, 5, 3);
    const second = town(state, 8, 5, 3);
    town(state, 14, 5, 3);
    slot(state, 0, 'theMotherCity');
    expect(playerById(state, 0)!.citiesFounded).toBe(3);
    expect(townPercent(state, capital, 'theMotherCity', 'production')).toBe(15);
    expect(townPercent(state, capital, 'theMotherCity', 'culture')).toBe(15);
    expect(townPercent(state, second, 'theMotherCity', 'production')).toBe(0);
    // A city-stage percentage (reading 21).
    for (const line of explainCardPercentYields(state, capital).filter((l) => l.card === 'theMotherCity')) {
      expect(line.stage).toBe('city');
    }
    // A town lost still counts, and there is no cap (reading 4).
    playerById(state, 0)!.citiesFounded = 14;
    bumpRevision(state);
    expect(townPercent(state, capital, 'theMotherCity', 'culture')).toBe(70);
  });

  it('Plenty pays five times the new population when a town grows', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    slot(state, 0, 'plenty');
    const paid = windfallPayout(state, 0, 'growth', 0, 0, { population: 6 })
      .grants.filter((grant) => grant.card === 'plenty')
      .map((grant) => [grant.yield, grant.amount]);
    expect(paid).toEqual([['production', 30]]);
  });

  it('The Staked Claims is dealt from Tier II', () => {
    expect(orderDef('theStakedClaims' as OrderId).band).toBe(2);
  });
});

describe('the Expansionist batch E7: the three institutions', () => {
  it('Six Gardens leaves +1 culture on every tended hex once six are held, and nothing on a farm', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const hexes = ring(state, city);
    for (const tile of hexes.slice(0, 6)) raiseImprovement(tile, 'burnedCountry', state.turn);
    const farm = at(state, 5, 3);
    raiseImprovement(farm, 'farm', state.turn);
    bumpRevision(state);
    slot(state, 0, 'sixGardens');
    // Seated, but the goal is not met yet: nothing on the land.
    expect(hexPays(state, hexes[0]!, 'Six Gardens', 'culture')).toBe(0);
    expect(runCommissions(state)).toHaveLength(1);
    bumpRevision(state);
    expect(commissionFulfilledTurn(playerById(state, 0)!.statecraft, 'sixGardens' as OrderId)).toBe(state.turn);
    expect(seated(state, 'sixGardens')).toBe(false);
    for (const tile of hexes.slice(0, 6)) expect(hexPays(state, tile, 'Six Gardens', 'culture')).toBe(1);
    expect(hexPays(state, farm, 'Six Gardens', 'culture')).toBe(0);
    // No lump of culture any more.
    expect(playerById(state, 0)!.culturePool).toBe(0);
  });

  it('The Wide Country leaves every town’s borders growing 25% faster once twelve hexes are claimed', () => {
    const state = bareState(16, 10);
    const home = town(state, 3, 5, 3);
    const other = town(state, 10, 5, 3);
    slot(state, 0, 'theWideCountry');
    const sc = playerById(state, 0)!.statecraft;
    const border = (city: City): number => foldCardRulePercent(cardRulePercent(state, 0, 'borderCulture', city));
    expect(border(home)).toBe(0);
    sc.tallies.push({ card: 'theWideCountry' as OrderId, count: 12 });
    const before = [home.population, other.population];
    expect(runCommissions(state)).toHaveLength(1);
    bumpRevision(state);
    expect(seated(state, 'theWideCountry')).toBe(false);
    expect(border(home)).toBe(25);
    expect(border(other)).toBe(25);
    // No citizens any more.
    expect([home.population, other.population]).toEqual(before);
  });

  it('The Domesday Survey leaves +1 science on every improved or tended hex, doubled on improved ones by The Age of Improvement', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const [field, garden, wild] = ring(state, city);
    raiseImprovement(field!, 'farm', state.turn);
    raiseImprovement(garden!, 'burnedCountry', state.turn);
    bumpRevision(state);
    // The goals are 120 hexes and 40 tiles now (the sheet's text).
    expect(orderDef('theDomesdaySurvey' as OrderId).commission!.goals).toEqual([
      { kind: 'reached', figure: 'hexesOwned', count: 120 },
      { kind: 'reached', figure: 'improvedTilesWorked', count: 40 },
    ]);
    slot(state, 0, 'theDomesdaySurvey');
    expect(hexPays(state, field!, 'Domesday', 'science')).toBe(0);
    withGoals('theDomesdaySurvey', [{ kind: 'reached', figure: 'improvedTilesWorked', count: 1 }], () => {
      expect(runCommissions(state)).toHaveLength(1);
    });
    bumpRevision(state);
    expect(seated(state, 'theDomesdaySurvey')).toBe(false);
    expect(hexPays(state, field!, 'Domesday', 'science')).toBe(1);
    expect(hexPays(state, garden!, 'Domesday', 'science')).toBe(1);
    expect(hexPays(state, wild!, 'Domesday', 'science')).toBe(0);
    // No great engineer and no lump of production any more.
    expect(city.hammerBasket ?? 0).toBe(0);
    // An institution is an Order's effect, so the amplifier reaches it on the
    // improved hex and not on the tended one.
    const science = (tile: Tile): number =>
      explainTileYield(tile, yieldContextFor(state, 0)).reduce((sum, line) => sum + (line.science ?? 0), 0);
    const fieldBefore = science(field!);
    const gardenBefore = science(garden!);
    slot(state, 0, 'theAgeOfImprovement');
    expect(science(field!)).toBe(fieldBefore + 1);
    expect(science(garden!)).toBe(gardenBefore);
  });
});

describe('the Expansionist batch E7: retirements and types', () => {
  it('retires the fifteen rows the themes pass cut, with no type, and deals none of them', () => {
    const cut = [
      'thePyramidBuilders',
      'theBeatingOfTheBounds',
      'theProspectors',
      'theGardenFrontier',
      'theBuildersLevy',
      'thePloughTeams',
      'thePolis',
      'theLandscapeGarden',
      'theCommonDomain',
      'theWoodwrights',
      'publicWorks',
      'theManors',
      'theAssayOffice',
      'theManagedWild',
      'theLandsGreatWork',
    ] as OrderId[];
    const pool = ordersForDecks(['expansionist']);
    for (const id of cut) {
      expect(DECK_FILE_ORDERS.expansionist, id).toContain(id);
      expect(orderDef(id).retired, id).toBe(true);
      expect(orderDef(id).type, id).toBeUndefined();
      expect(orderIsDealt(id), id).toBe(false);
      expect(pool, id).not.toContain(id);
    }
  });

  it('types the five reworked counts civic, and The Two Harvests wildcard while it waits', () => {
    for (const id of ['theRopeStretchers', 'theMilestones', 'theTeemingRealm', 'theMeasureOfTheLand', 'theMotherCity']) {
      expect(orderDef(id as OrderId).type, id).toBe('civic');
    }
    const harvests = 'theTwoHarvests' as OrderId;
    expect(orderDef(harvests).type).toBe('wildcard');
    expect(orderIsDealt(harvests)).toBe(false);
    expect(orderDef(harvests).needsTendedWork).toBe(true);
  });
});

describe('the Expansionist batch E8: five new cards in shapes that already existed', () => {
  /** What one card's grants pay at a founding right now, as [voice, amount]. */
  function foundingPays(state: GameState, card: string): [string, number][] {
    return windfallPayout(state, 0, 'found')
      .grants.filter((grant) => grant.card === card)
      .map((grant) => [grant.yield, grant.amount]);
  }

  /** What one card's lines put on seat 0's authority. */
  function cardAuthority(state: GameState, card: string): number {
    return explainAuthority(state, 0)
      .filter((line) => line.card === card)
      .reduce((sum, line) => sum + line.value, 0);
  }

  /** The percentage one card's lines put behind a build in this town. */
  function buildPercent(state: GameState, city: City, item: City['queue'][number], card: string): number {
    return productionModifiers(state, city, item)
      .filter((line) => line.card === card)
      .reduce((sum, line) => sum + line.percent, 0);
  }

  it('deals all five from the tier the sheet names', () => {
    const tiers: [string, number][] = [
      ['theFoundingFurrow', 0],
      ['theHorrea', 0],
      ['theLandHunger', 1],
      ['theManyHands', 2],
      ['theCapitolia', 3],
    ];
    const pool = ordersForDecks(['expansionist']);
    for (const [id, band] of tiers) {
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(pool, id).toContain(id);
      expect(orderDef(id as OrderId).band, id).toBe(band);
    }
  });

  it('The Founding Furrow pays five culture for each town you hold, the new town included', () => {
    const state = bareState(20, 10);
    slot(state, 0, 'theFoundingFurrow');
    const seat = playerById(state, 0)!;
    // The real founding: one town held after it, so 5 culture.
    const before = seat.culturePool;
    town(state, 2, 5, 1);
    expect(seat.culturePool - before).toBe(5);
    // The moment is paid after the town exists, so the second town pays 10
    // (reading 16).
    town(state, 9, 5, 1);
    expect(foundingPays(state, 'theFoundingFurrow')).toEqual([['culture', 10]]);
    // A rival's town is not yours.
    foundCityAt(state, 1, at(state, 16, 5));
    bumpRevision(state);
    expect(foundingPays(state, 'theFoundingFurrow')).toEqual([['culture', 10]]);
  });

  it('The Horrea gives +1 authority for each Granary you hold', () => {
    const state = bareState(20, 10);
    const home = town(state, 2, 5, 3);
    const other = town(state, 9, 5, 3);
    const rival = foundCityAt(state, 1, at(state, 16, 5));
    slot(state, 0, 'theHorrea');
    expect(cardAuthority(state, 'theHorrea')).toBe(0);
    addBuilding(state, home, 'granary');
    bumpRevision(state);
    expect(cardAuthority(state, 'theHorrea')).toBe(1);
    addBuilding(state, other, 'granary');
    // A rival's Granary pays the rival, not you.
    addBuilding(state, rival, 'granary');
    bumpRevision(state);
    expect(cardAuthority(state, 'theHorrea')).toBe(2);
  });

  it('The Land Hunger speeds and moves settlers only while a met empire holds more towns', () => {
    const state = bareState(20, 10);
    const home = town(state, 2, 5, 3);
    foundCityAt(state, 1, at(state, 12, 3));
    slot(state, 0, 'theLandHunger');
    const settler = createUnit(state, 0, 'settler', 4, 5);
    const person = createUnit(state, 0, 'greatPerson', 4, 6);
    const worker = createUnit(state, 0, 'worker', 4, 7);
    const toward = (id: 'settler' | 'worker'): number => buildPercent(state, home, { kind: 'unit', id }, 'theLandHunger');
    const settlerBase = fullMovement(settler);
    const personBase = fullMovement(person);
    const workerBase = fullMovement(worker);
    // One town each: nobody holds more.
    playerById(state, 0)!.metSeats = [1];
    bumpRevision(state);
    expect(toward('settler')).toBe(0);
    expect(fullMovement(settler, state)).toBe(settlerBase);
    // The rival founds a second town, but this empire has not met it.
    foundCityAt(state, 1, at(state, 12, 7));
    playerById(state, 0)!.metSeats = [];
    bumpRevision(state);
    expect(toward('settler')).toBe(0);
    expect(fullMovement(settler, state)).toBe(settlerBase);
    // Met, it counts (reading 18).
    playerById(state, 0)!.metSeats = [1];
    bumpRevision(state);
    expect(toward('settler')).toBe(25);
    expect(fullMovement(settler, state)).toBe(settlerBase + 1);
    // Settlers only: not workers, and not the great person, who shares the
    // settler's model (reading 39).
    expect(toward('worker')).toBe(0);
    expect(fullMovement(worker, state)).toBe(workerBase);
    expect(fullMovement(person, state)).toBe(personBase);
  });

  it('The Many Hands puts +3% behind empire buildings for each town you hold, at most +36%', () => {
    const state = bareState(30, 20);
    const towns: City[] = [];
    for (const row of [3, 11]) {
      for (const col of [2, 6, 10, 14, 18, 22, 26]) towns.push(town(state, col, row, 1));
    }
    expect(towns).toHaveLength(14);
    slot(state, 0, 'theManyHands');
    const forum: City['queue'][number] = { kind: 'building', id: 'forum' };
    const granary: City['queue'][number] = { kind: 'building', id: 'granary' };
    // Fourteen towns, but twelve is the most that pays.
    expect(buildPercent(state, towns[0]!, forum, 'theManyHands')).toBe(36);
    // An ordinary building and a unit gain nothing.
    expect(buildPercent(state, towns[0]!, granary, 'theManyHands')).toBe(0);
    expect(buildPercent(state, towns[0]!, { kind: 'unit', id: 'settler' }, 'theManyHands')).toBe(0);
    // Three towns pay 9%: the capital counts too (reading 19).
    for (const city of towns.slice(3)) city.ownerId = 1;
    bumpRevision(state);
    expect(buildPercent(state, towns[0]!, forum, 'theManyHands')).toBe(9);
  });

  it('The Capitolia gives each town +1 culture for each empire building you hold', () => {
    const state = bareState(20, 10);
    const home = town(state, 2, 5, 3);
    const other = town(state, 9, 5, 3);
    slot(state, 0, 'theCapitolia');
    expect(townPays(state, home, 'theCapitolia', 'culture')).toBe(0);
    addBuilding(state, home, 'forum');
    bumpRevision(state);
    // The count is the empire's, so the town without one is paid too.
    expect(townPays(state, home, 'theCapitolia', 'culture')).toBe(1);
    expect(townPays(state, other, 'theCapitolia', 'culture')).toBe(1);
    addBuilding(state, other, 'heroicEpic');
    // An ordinary building is not an empire building.
    addBuilding(state, other, 'granary');
    bumpRevision(state);
    expect(townPays(state, home, 'theCapitolia', 'culture')).toBe(2);
    expect(townPays(state, other, 'theCapitolia', 'culture')).toBe(2);
    expect(townPays(state, other, 'theCapitolia', 'science')).toBe(0);
  });
});
