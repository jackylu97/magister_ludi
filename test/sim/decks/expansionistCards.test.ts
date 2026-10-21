/**
 * **The Expansionist cards built from existing shapes** (batch E0 of
 * `docs/plans/expansionist-build-triage.md`), one test for each reading that
 * decides what a card pays. `expansionist.test.ts` checks the rows against the
 * sheet; this file checks that the rows pay what their text says:
 *
 *   · The Stationes: +3 for a land unit defending a town joined to the
 *     capital by road, and nowhere else (the triage's reading 29: a defence
 *     line, and the capital is never "joined");
 *   · The Theodosian Walls: +1 defence for every two citizens;
 *   · The Old Fields: one percent for every three works that have stood
 *     thirty turns (reading 3);
 *   · The Quitrents: every hex the empire owns counts;
 *   · The Public Fountains: towns beside fresh water, one for every four
 *     citizens, at most three;
 *   · The Polis: four towns or fewer;
 *   · The Megalopolis: towns of ten citizens or more;
 *   · The Ambarvalia and The Wild Marches: improved hexes and wild hexes, a
 *     tended work counting as wild (readings 1 and 2);
 *   · Plenty and The Assay Office: the growth and seam riders;
 *   · The Pyramid Builders: wonders in the capital only.
 *
 * The Polis, The Assay Office and The Pyramid Builders are retired since batch
 * E7 of `docs/plans/expansionist-themes-triage.md`. A save may still hold one,
 * so their tests stay and seat the rows directly (that triage's reading 7).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles } from '../../../src/sim/cities';
import { raiseImprovement } from '../../../src/sim/map';
import { type City, type GameState, bumpRevision, createUnit, playerById } from '../../../src/sim/state';
import {
  cardCityStat,
  cardCombatLines,
  cardHappiness,
  cardProduction,
  explainCardCityYields,
  explainCardEmpireYields,
  explainCardPercentYields,
  foldCardYields,
  foldCityStat,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { type OrderId } from '../../../src/sim/statecraftData';
import { computeFreshwater } from '../../../src/sim/water';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City) {
  return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
}

describe('the Expansionist batch E0: strength and walls', () => {
  it('The Stationes strengthens a land unit defending a town joined to the capital, and nowhere else', () => {
    const state = bareState(16, 8);
    foundCityAt(state, 0, at(state, 2, 3));
    foundCityAt(state, 0, at(state, 8, 3));
    foundCityAt(state, 0, at(state, 13, 6));
    // A road from the capital to the second town; the third has none.
    for (let col = 3; col <= 7; col++) at(state, col, 3).road = 0;
    bumpRevision(state);
    slot(state, 0, 'theStationes');
    const stationes = (col: number, row: number, side: 'attack' | 'defend'): number => {
      const unit = createUnit(state, 0, 'warrior', col, row);
      bumpRevision(state);
      const total = cardCombatLines(state, {
        unit,
        side,
        tile: at(state, col, row),
        vsBarbarians: false,
        vsCity: false,
        targetHp: 100,
        targetMaxHp: 100,
      })
        .filter((line) => line.card === 'theStationes')
        .reduce((sum, line) => sum + line.amount, 0);
      state.units = state.units.filter((other) => other.id !== unit.id);
      bumpRevision(state);
      return total;
    };
    expect(stationes(8, 3, 'defend')).toBe(3);
    // A defence line only: the condition reads the contested hex.
    expect(stationes(8, 3, 'attack')).toBe(0);
    // The capital is not joined to itself, the third town has no road, and a
    // unit on the road between is in no town.
    expect(stationes(2, 3, 'defend')).toBe(0);
    expect(stationes(13, 6, 'defend')).toBe(0);
    expect(stationes(5, 3, 'defend')).toBe(0);
  });

  it('The Theodosian Walls adds a point of defence for every two citizens', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    slot(state, 0, 'theTheodosianWalls');
    const walls = (): number =>
      foldCityStat(cardCityStat(state, city, 'defense').filter((line) => line.card === 'theTheodosianWalls'));
    city.population = 1;
    bumpRevision(state);
    expect(walls()).toBe(0);
    city.population = 7;
    bumpRevision(state);
    expect(walls()).toBe(3);
  });
});

describe('the Expansionist batch E0: counted land', () => {
  it('The Old Fields pays a percent for every three works that have stood thirty turns', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    slot(state, 0, 'theOldFields');
    const hexes = ring(state, city);
    expect(hexes.length).toBeGreaterThanOrEqual(6);
    // On turn 40, four works raised on turn 5 have stood thirty-five turns, and
    // two raised on turn 30 have stood ten, so they do not count yet.
    state.turn = 40;
    for (const tile of hexes.slice(0, 4)) raiseImprovement(tile, 'farm', 5);
    for (const tile of hexes.slice(4, 6)) raiseImprovement(tile, 'farm', 30);
    bumpRevision(state);
    const percent = (key: 'food' | 'production'): number =>
      explainCardPercentYields(state, city)
        .filter((line) => line.card === 'theOldFields' && line.yield === key)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent('food')).toBe(1);
    // On turn 60 all six have stood thirty turns: two helpings of three.
    state.turn = 60;
    bumpRevision(state);
    expect(percent('food')).toBe(2);
    expect(percent('production')).toBe(2);
  });

  it('The Quitrents counts every hex the empire owns, improved or wild', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    slot(state, 0, 'theQuitrents');
    raiseImprovement(ring(state, city)[0]!, 'farm', state.turn);
    bumpRevision(state);
    const gold = explainCardEmpireYields(state, 0)
      .filter((line) => line.card === 'theQuitrents')
      .reduce((sum, line) => sum + line.gold, 0);
    expect(gold).toBeGreaterThan(0);
    expect(gold).toBe(Math.floor(ownedTiles(state, city).length / 2));
  });

  it('The Ambarvalia counts improved hexes and The Wild Marches wild ones, a tended work among the wild', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    // The Ambarvalia keeps The Spirits of Place's id.
    slot(state, 0, 'theSpiritsOfPlace');
    slot(state, 0, 'theWildMarches');
    const hexes = ring(state, city);
    for (const tile of hexes.slice(0, 4)) raiseImprovement(tile, 'farm', state.turn);
    raiseImprovement(hexes[4]!, 'wildOrchard', state.turn);
    bumpRevision(state);
    const faith = explainCardCityYields(state, city)
      .filter((line) => line.card === 'theSpiritsOfPlace')
      .reduce((sum, line) => sum + line.faith, 0);
    // The capital's +1, and +1 for every two of the four farms.
    expect(faith).toBe(1 + 2);
    const culture = explainCardEmpireYields(state, 0)
      .filter((line) => line.card === 'theWildMarches')
      .reduce((sum, line) => sum + line.culture, 0);
    const wild = ownedTiles(state, city).length - 4;
    expect(culture).toBe(Math.floor(wild / 4));
  });
});

describe('the Expansionist batch E0: towns', () => {
  it('The Public Fountains pays towns beside fresh water, one for every four citizens, at most three', () => {
    const state = bareState(16, 8);
    const wet = foundCityAt(state, 0, at(state, 3, 3));
    const dry = foundCityAt(state, 0, at(state, 11, 3));
    at(state, 3, 2).terrain = 'lake';
    computeFreshwater(state.map);
    slot(state, 0, 'thePublicFountains');
    const fountains = (): number =>
      cardHappiness(state, 0)
        .filter((line) => line.card === 'thePublicFountains')
        .reduce((sum, line) => sum + line.amount, 0);
    wet.population = 9;
    dry.population = 9;
    bumpRevision(state);
    expect(fountains()).toBe(2);
    wet.population = 20;
    bumpRevision(state);
    expect(fountains()).toBe(3);
  });

  it('The Polis feeds every town while the empire holds four or fewer', () => {
    const state = bareState(24, 10);
    const first = foundCityAt(state, 0, at(state, 2, 2));
    for (const [col, row] of [
      [8, 2],
      [14, 2],
      [20, 2],
    ] as const) {
      foundCityAt(state, 0, at(state, col, row));
    }
    slot(state, 0, 'thePolis');
    const food = (): number =>
      explainCardPercentYields(state, first)
        .filter((line) => line.card === 'thePolis' && line.yield === 'food')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(food()).toBe(25);
    foundCityAt(state, 0, at(state, 11, 7));
    bumpRevision(state);
    expect(food()).toBe(0);
  });

  it('The Megalopolis pays a town of ten or more a science and a production for each citizen', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    slot(state, 0, 'theMegalopolis');
    const paid = () => foldCardYields(explainCardCityYields(state, city).filter((line) => line.card === 'theMegalopolis'));
    city.population = 9;
    bumpRevision(state);
    expect(paid().science).toBe(0);
    city.population = 12;
    bumpRevision(state);
    expect(paid().science).toBe(12);
    expect(paid().production).toBe(12);
  });

  it('The Pyramid Builders speeds wonders in the capital, and nowhere else', () => {
    const state = bareState(16, 8);
    const capital = foundCityAt(state, 0, at(state, 3, 3));
    const other = foundCityAt(state, 0, at(state, 11, 3));
    slot(state, 0, 'thePyramidBuilders');
    const speed = (city: City): number =>
      cardProduction(state, city, 'wonder')
        .filter((line) => line.card === 'thePyramidBuilders')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(speed(capital)).toBe(25);
    expect(speed(other)).toBe(0);
  });
});

describe('the Expansionist batch E0: riders', () => {
  it('Plenty pays five hammers a citizen when a town grows, and The Assay Office sixty beakers a seam', () => {
    // Plenty pays five times the new population since batch E7 (the user's
    // revision of 2026-10-21). The Assay Office is retired since E7; the test
    // seats the row directly, as a save may hold it.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    slot(state, 0, 'plenty');
    slot(state, 0, 'theAssayOffice');
    const grants = (payout: ReturnType<typeof windfallPayout>, card: string): [string, number][] =>
      payout.grants.filter((grant) => grant.card === card).map((grant) => [grant.yield, grant.amount]);
    expect(grants(windfallPayout(state, 0, 'growth', 0, 0, { population: 6 }), 'plenty')).toEqual([
      ['production', 30],
    ]);
    expect(grants(windfallPayout(state, 0, 'veinFound'), 'theAssayOffice')).toEqual([['science', 60]]);
  });
});
