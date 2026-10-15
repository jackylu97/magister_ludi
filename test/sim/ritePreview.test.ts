/**
 * What saying a rite in a town would change, read before it is said (batch
 * UX8b: `docs/plans/faith-screen-audit.md` §6; the Rites tab's rite mode in
 * `docs/plans/faith-screen-f1.md`).
 *
 * What is pinned here:
 *
 *   · `explainRitePreview` folds to exactly what the empire's own books show
 *     with the rite in place, and touches nothing;
 *   · it counts what lands outside the town (The Priest-Astronomers pays the
 *     capital for every town keeping a rite);
 *   · the offering's production is a one-time line, the same figure the rite
 *     puts into the build;
 *   · a town keeping a rite is read with that rite taken off; a town the seat
 *     does not hold, and a withdrawn rite, preview as nothing;
 *   · `riteVoicesByGain` orders the voices rite mode ranks towns by;
 *   · the stamp and the preview hang the same entries (`riteTimedEntries`).
 *
 * Core: one small board.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { restoreState, snapshotState } from '../../src/sim/game';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import {
  cityTimedWithRite,
  performRiteAt,
  riteCostFor,
  riteOfferingHammers,
  riteTimedEntries,
} from '../../src/sim/religion';
import {
  type CardImpactLine,
  explainRitePreview,
  foldCardImpact,
  foldCardOccasions,
  riteVoicesByGain,
} from '../../src/sim/cardImpact';
import { readEmpire } from '../../src/sim/readings';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { RULES } from '../../src/sim/rulesData';
import type { OrderId } from '../../src/sim/statecraftData';
import { createGame } from './newGameHelpers';

/** Two towns of seat 0's, each with shelves for Omen Reading to count. */
function world(): { state: GameState; capital: City; second: City } {
  const g = createGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const state = g.state;
  const player = playerById(state, 0)!;
  for (const tech of ['divination', 'stonecraft', 'mining', 'bronzeWorking', 'currency']) {
    player.techsResearched.push(tech as never);
  }
  const capital = foundCityAt(state, 0, getTileAt(state.map, 6, 6)!);
  const second = foundCityAt(state, 0, getTileAt(state.map, 9, 6)!);
  capital.buildings.push('granary');
  second.buildings.push('granary', 'monument');
  player.faithPool = 1000;
  bumpRevision(state);
  return { state, capital, second };
}

/** The empire's totals with a rite hung on one town of a copy of the board. */
function totalsWithRite(state: GameState, cityId: number, rite: Parameters<typeof cityTimedWithRite>[3]) {
  const copy = restoreState(snapshotState(state));
  const town = copy.cities.find((city) => city.id === cityId)!;
  town.timed = cityTimedWithRite(copy, 0, town, rite)!;
  bumpRevision(copy);
  return readEmpire(copy, 0).totals;
}

describe('a rite, previewed', () => {
  it("is the change a turn the empire's own books show with the rite in place", () => {
    const { state, second } = world();
    const lines = explainRitePreview(state, 0, second.id, 'omenReading');
    const folded = foldCardImpact(lines);
    const before = readEmpire(state, 0).totals;
    const after = totalsWithRite(state, second.id, 'omenReading');
    for (const key of CITY_YIELD_KEYS) {
      expect(folded[key], key).toBeCloseTo(after[key] - before[key], 9);
    }
    expect(folded.science).toBeGreaterThan(0);
  });

  it('touches nothing, and says the same thing twice', () => {
    const { state, second } = world();
    const before = snapshotState(state);
    const first = explainRitePreview(state, 0, second.id, 'riteOfTheHarvest');
    expect(snapshotState(state)).toBe(before);
    expect(explainRitePreview(state, 0, second.id, 'riteOfTheHarvest')).toEqual(first);
  });

  it('counts what lands outside the town: The Priest-Astronomers pays the capital', () => {
    const { state, second } = world();
    const card = 'thePriestAstronomers' as OrderId;
    const player = playerById(state, 0)!;
    player.statecraft.orders = [card];
    player.statecraft.slots = [{ card, sealedUntil: 0 }];
    bumpRevision(state);
    const lines = explainRitePreview(state, 0, second.id, 'omenReading');
    // Omen Reading pays no faith; the capital's two do, for one more town
    // keeping a rite.
    const capitalLine = lines.find((line) => line.source.includes('The Priest-Astronomers'));
    expect(capitalLine?.faith).toBe(2);
    const folded = foldCardImpact(lines);
    const before = readEmpire(state, 0).totals;
    const after = totalsWithRite(state, second.id, 'omenReading');
    for (const key of CITY_YIELD_KEYS) {
      expect(folded[key], key).toBeCloseTo(after[key] - before[key], 9);
    }
  });

  it("puts the offering's production in a one-time line, the figure the rite pays", () => {
    const { state, second } = world();
    second.queue = [{ kind: 'building', id: 'temple' }];
    bumpRevision(state);
    const lines = explainRitePreview(state, 0, second.id, 'votiveOffering');
    const hammers = riteOfferingHammers(state, 0, 'votiveOffering');
    expect(hammers).toBe(
      Math.floor(riteCostFor(state, 0) / RULES.production.faithPerHammer),
    );
    expect(foldCardOccasions(lines).production).toBe(hammers);
    // Nothing a turn: the offering's mark pays nothing standing.
    for (const key of CITY_YIELD_KEYS) expect(foldCardImpact(lines)[key], key).toBe(0);
    // And it is what saying the rite actually puts into the build.
    const basket = second.hammerBasket;
    performRiteAt(state, playerById(state, 0)!, second, 'votiveOffering');
    expect(second.hammerBasket - basket).toBe(hammers);
    expect(riteOfferingHammers(state, 0, 'omenReading')).toBe(0);
  });

  it('reads a town keeping a rite with that rite taken off', () => {
    const { state, second } = world();
    performRiteAt(state, playerById(state, 0)!, second, 'omenReading');
    bumpRevision(state);
    // Rite of Plenty in its place: Omen Reading's science comes off.
    const lines = explainRitePreview(state, 0, second.id, 'riteOfPlenty');
    expect(foldCardImpact(lines).science).toBeLessThan(0);
  });

  it('is nothing for a town the seat does not hold, or for a withdrawn rite', () => {
    const { state, second } = world();
    const theirs = foundCityAt(state, 1, getTileAt(state.map, 9, 9)!);
    bumpRevision(state);
    expect(explainRitePreview(state, 0, theirs.id, 'omenReading')).toEqual([]);
    expect(explainRitePreview(state, 0, 9999, 'omenReading')).toEqual([]);
    expect(explainRitePreview(state, 0, second.id, 'thePreaching')).toEqual([]);
  });
});

describe('the voices rite mode ranks by', () => {
  it('names the voice a rite adds across the towns, and none for a rite that adds no yield', () => {
    const { state, capital, second } = world();
    const omen = [capital, second].map((city) => explainRitePreview(state, 0, city.id, 'omenReading'));
    expect(riteVoicesByGain(omen)).toEqual(['science']);
    const arms = [capital, second].map((city) =>
      explainRitePreview(state, 0, city.id, 'blessingOfArms'),
    );
    expect(riteVoicesByGain(arms)).toEqual([]);
    expect(riteVoicesByGain([])).toEqual([]);
  });

  it('puts the larger total first, and keeps the six voices’ order on a tie', () => {
    const line = (food: number, gold: number): CardImpactLine => ({
      source: 'a rite',
      kind: 'city',
      food,
      production: 0,
      gold,
      science: 0,
      culture: 0,
      faith: 0,
    });
    expect(riteVoicesByGain([[line(1, 2)], [line(0, 1)]])).toEqual(['gold', 'food']);
    expect(riteVoicesByGain([[line(2, 2)]])).toEqual(['food', 'gold']);
    // A voice that only fell is never the main one.
    expect(riteVoicesByGain([[line(-3, 1)]])).toEqual(['gold']);
  });
});

describe('the stamp and the preview hang the same entries', () => {
  it('stamps exactly what `riteTimedEntries` answers', () => {
    const { state, second } = world();
    const entries = riteTimedEntries(state, 0, 'omenReading');
    expect(cityTimedWithRite(state, 0, second, 'omenReading')).toEqual(entries);
    performRiteAt(state, playerById(state, 0)!, second, 'omenReading');
    expect(JSON.stringify(second.timed)).toBe(JSON.stringify(entries));
    expect(riteTimedEntries(state, 0, 'recastingTheOmens')).toBeNull();
  });
});
