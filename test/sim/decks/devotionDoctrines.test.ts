/**
 * **Doctrine batch DT4: Devotion's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `devotion.test.ts` holds the rows to the
 * sheet. This file checks that each row pays what its text says, in a real fold.
 * None of these rows has a drawback, so each also has a test that it pays nothing
 * where its text does not reach.
 *
 * Later batches add the deck's other thirteen Doctrines to this file.
 */

import { describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { explainCardImpact } from '../../../src/sim/cardImpact';
import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { explainAuthority, explainHappiness } from '../../../src/sim/meters';
import { cityRite, empireRiteAt, performRiteAt } from '../../../src/sim/religion';
import { type RiteId } from '../../../src/sim/religionData';
import {
  type City,
  type GameState,
  type Player,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
  spendFaith,
} from '../../../src/sim/state';
import { doctrineBagFor } from '../../../src/sim/statecraft';
import { cardProduction, explainCardCityYields } from '../../../src/sim/statecraft/evaluator';
import {
  type DoctrineId,
  DECK_FILE_DOCTRINES,
  doctrineDef,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { collectYields, explainEmpireCardYields, foldEmpireRates } from '../../../src/sim/yields/empire';
import { explainCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';

/** The three rows of batch DT4 in this deck, each with the band its table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['theTheoricFund', 1],
  ['theRitesOfZhou', 1],
  ['theSaintPetersIndulgence', 4],
];

const FASTING = 'riteOfFasting' as RiteId;

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

/** Lets seat 0 start rites, with faith to spare. */
function faithful(state: GameState): Player {
  const player = seat(state);
  player.faithPool = 100_000;
  if (!player.charteredRites.includes(FASTING)) player.charteredRites.push(FASTING);
  bumpRevision(state);
  return player;
}

/** What one card's town lines pay a town, in one voice. */
function linePays(state: GameState, city: City, card: string, voice: 'food' | 'culture'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** What one card puts on seat 0's happiness. */
function happinessFrom(state: GameState, card: string): number {
  return explainHappiness(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.value, 0);
}

describe('batch DT4: Devotion’s rows', () => {
  it('deals each row at its tier, from the Devotion bag and no other', () => {
    for (const [id, band] of ROWS) {
      const def = doctrineDef(id as DoctrineId);
      expect(def.band, id).toBe(band);
      expect(def.decks, id).toEqual(['devotion']);
      expect(def.retired, id).toBeUndefined();
      expect(poolDoctrines(def.tier), id).toContain(id);
    }
    expect([...DECK_FILE_DOCTRINES.devotion].sort()).toEqual(ROWS.map(([id]) => id).sort());
  });

  it('offers a Devotion seat its rows when it adopts a tier-4 government', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true, decks: ['devotion', 'dominion'] },
        { name: 'Bors', color: '#00a', isHuman: true, decks: ['dominion', 'expansionist'] },
      ],
    });
    expect(doctrineBagFor(seat(g.state), 4)).toEqual(
      expect.arrayContaining(['theTheoricFund', 'theRitesOfZhou']),
    );
    expect(doctrineBagFor(seat(g.state, 1), 4)).not.toContain('theTheoricFund');
  });

  it('gives the bots a finite price for every row, and the impact stamp reads each one', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    town(state, 15, 5, 4);
    addBuilding(state, city, 'temple');
    const player = faithful(state);
    performRiteAt(state, player, city, FASTING);
    bumpRevision(state);
    for (const [id] of ROWS) {
      const score = scoreCard(player, id as never, valueContext(state, player));
      expect(Number.isFinite(score), id).toBe(true);
      expect(() => explainCardImpact(state, 0, { kind: 'doctrine', id: id as DoctrineId }), id).not.toThrow();
    }
  });

  it('has no drawback: no row adds an authority line, and only a rite town gains happiness', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    addBuilding(state, city, 'temple');
    bumpRevision(state);
    const before = [explainAuthority(state, 0), explainHappiness(state, 0)];
    for (const [id] of ROWS) hold(state, id);
    expect([explainAuthority(state, 0), explainHappiness(state, 0)]).toEqual(before);
  });
});

describe('The Theoric Fund', () => {
  /** What the card's empire line pays in culture. */
  const fund = (state: GameState): number =>
    explainEmpireCardYields(state, 0)
      .filter((line) => line.card === 'theTheoricFund')
      .reduce((sum, line) => sum + line.culture, 0);

  /** The faith seat 0 makes this turn. */
  const faith = (state: GameState): number => foldEmpireRates(state, 0).faithPerTurn;

  it('pays nothing at a rate below three', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    hold(state, 'theTheoricFund');
    expect(faith(state)).toBe(0);
    expect(fund(state)).toBe(0);
    addBuilding(state, city, 'temple');
    bumpRevision(state);
    expect(faith(state)).toBe(2);
    expect(fund(state)).toBe(0);
    // And no line at all, rather than a line of nought.
    expect(explainEmpireCardYields(state, 0).filter((line) => line.card === 'theTheoricFund')).toEqual([]);
  });

  it('pays +1 at three and +3 at nine, in whole helpings', () => {
    const state = bareState(30, 10);
    const first = town(state, 3, 5);
    const second = town(state, 12, 5);
    const third = town(state, 21, 5);
    hold(state, 'theTheoricFund');
    addBuilding(state, first, 'temple');
    addBuilding(state, first, 'shrine');
    bumpRevision(state);
    expect(faith(state)).toBe(3);
    expect(fund(state)).toBe(1);
    addBuilding(state, second, 'temple');
    addBuilding(state, second, 'shrine');
    addBuilding(state, third, 'temple');
    bumpRevision(state);
    expect(faith(state)).toBe(8);
    expect(fund(state)).toBe(2);
    addBuilding(state, third, 'shrine');
    bumpRevision(state);
    expect(faith(state)).toBe(9);
    expect(fund(state)).toBe(3);
  });

  it('banks the culture in the empire’s pool, and spends none of the faith', () => {
    const build = (held: boolean): GameState => {
      const state = bareState(24, 10);
      const city = town(state, 5, 5);
      addBuilding(state, city, 'temple');
      addBuilding(state, city, 'shrine');
      if (held) hold(state, 'theTheoricFund');
      bumpRevision(state);
      return state;
    };
    const without = build(false);
    const withIt = build(true);
    collectYields(without);
    collectYields(withIt);
    expect(seat(withIt).culturePool).toBe(seat(without).culturePool + 1);
    expect(seat(withIt).faithPool).toBe(seat(without).faithPool);
  });

  it('reads the seat’s own faith and no rival’s', () => {
    const state = bareState(24, 10);
    town(state, 5, 5);
    const theirs = town(state, 15, 5, 3, 1);
    addBuilding(state, theirs, 'temple');
    addBuilding(state, theirs, 'shrine');
    bumpRevision(state);
    hold(state, 'theTheoricFund');
    expect(fund(state)).toBe(0);
  });
});

describe('The Rites of Zhou', () => {
  it('gives a town keeping a rite +2 food and +2 happiness, and no other town', () => {
    const state = bareState(24, 10);
    const keeping = town(state, 5, 5);
    const plain = town(state, 15, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    expect(linePays(state, keeping, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(0);
    performRiteAt(state, player, keeping, FASTING);
    bumpRevision(state);
    expect(cityRite(state, keeping)).toBe(FASTING);
    expect(linePays(state, keeping, 'theRitesOfZhou', 'food')).toBe(2);
    expect(linePays(state, plain, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(2);
  });

  it('pays the food in the town’s own fold, and not to the empire', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const player = faithful(state);
    performRiteAt(state, player, city, FASTING);
    bumpRevision(state);
    const before = explainCity(state, city).flats.food;
    hold(state, 'theRitesOfZhou');
    expect(explainCity(state, city).flats.food).toBe(before + 2);
    expect(explainEmpireCardYields(state, 0).filter((line) => line.card === 'theRitesOfZhou')).toEqual([]);
  });

  it('pays each town that keeps a rite, so two towns give +4 happiness', () => {
    const state = bareState(24, 10);
    const first = town(state, 5, 5);
    const second = town(state, 15, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    performRiteAt(state, player, first, FASTING);
    performRiteAt(state, player, second, FASTING);
    bumpRevision(state);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(4);
  });

  it('counts a prophet’s rite over the empire in every town it reaches', () => {
    const state = bareState(30, 10);
    const first = town(state, 3, 5);
    const second = town(state, 12, 5);
    const third = town(state, 21, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    const prophet = createUnit(state, 0, 'prophet', first.col, first.row);
    bumpRevision(state);
    const done = empireRiteAt(state, player, prophet, FASTING);
    expect(done.cities).toHaveLength(3);
    bumpRevision(state);
    for (const city of [first, second, third]) expect(linePays(state, city, 'theRitesOfZhou', 'food')).toBe(2);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(6);
  });

  it('stops paying on the turn the rite runs out, by comparing the stamp', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    performRiteAt(state, player, city, FASTING);
    bumpRevision(state);
    expect(linePays(state, city, 'theRitesOfZhou', 'food')).toBe(2);
    const last = Math.max(...(city.timed ?? []).map((effect) => effect.expiresTurn));
    state.turn = last + 1;
    bumpRevision(state);
    expect(cityRite(state, city)).toBeNull();
    expect(linePays(state, city, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(0);
  });

  it('pays no rival’s town', () => {
    const state = bareState(24, 10);
    town(state, 5, 5);
    const theirs = town(state, 15, 5, 3, 1);
    const rival = seat(state, 1);
    rival.faithPool = 100_000;
    rival.charteredRites.push(FASTING);
    bumpRevision(state);
    hold(state, 'theRitesOfZhou');
    performRiteAt(state, rival, theirs, FASTING);
    bumpRevision(state);
    expect(cityRite(state, theirs)).toBe(FASTING);
    expect(linePays(state, theirs, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(0);
  });
});

describe('The Saint Peter’s Indulgence', () => {
  /** The percent the card puts on a town's row. */
  const toward = (state: GameState, city: City, id: string): number =>
    cardProduction(state, city, 'building', undefined, id as never)
      .filter((line) => line.card === 'theSaintPetersIndulgence')
      .reduce((sum, line) => sum + line.percent, 0);

  function board(): { state: GameState; city: City; player: Player } {
    const state = bareState();
    const city = town(state, 5, 5);
    const player = seat(state);
    hold(state, 'theSaintPetersIndulgence');
    return { state, city, player };
  }

  it('gives +1% toward the Magnum Opus for every 150 faith spent, in whole helpings', () => {
    const { state, city, player } = board();
    expect(toward(state, city, 'theMagnumOpus')).toBe(0);
    player.faithSpent = 149;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(0);
    player.faithSpent = 150;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(1);
    player.faithSpent = 449;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(2);
  });

  it('has no cap', () => {
    const { state, city, player } = board();
    player.faithSpent = 30_000;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(200);
  });

  it('reads the Magnum Opus and nothing else', () => {
    const { state, city, player } = board();
    player.faithSpent = 1500;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(10);
    expect(toward(state, city, 'granary')).toBe(0);
    expect(toward(state, city, 'observatory')).toBe(0);
    expect(
      cardProduction(state, city, 'wonder', undefined, 'pyramids' as never).filter(
        (line) => line.card === 'theSaintPetersIndulgence',
      ),
    ).toEqual([]);
  });

  it('counts faith as it is spent, through the one seam', () => {
    const { state, city, player } = board();
    player.faithPool = 1000;
    spendFaith(state, player, 300);
    expect(toward(state, city, 'theMagnumOpus')).toBe(2);
  });

  it('reaches the town’s production list as a labelled line', () => {
    const { state, city, player } = board();
    player.faithSpent = 600;
    bumpRevision(state);
    const lines = productionModifiers(state, city, { kind: 'building', id: 'theMagnumOpus' as never });
    const line = lines.find((one) => one.source.includes('The Saint Peter'));
    expect(line).toBeDefined();
    expect(line!.percent).toBe(4);
    expect(productionModifiers(state, city, { kind: 'building', id: 'granary' as never })).not.toContainEqual(line);
  });
});
