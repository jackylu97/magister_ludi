/**
 * **The empire's own lines, read at rest** (bot batch BP15, stage 1).
 *
 * A `pays` rate row (the Bourse: a culture for each four gold the empire makes
 * a turn) reads the empire's books. `explainEmpireLines` took those books by
 * folding every town of the empire again, inside `readEmpire`, which had just
 * folded every town for its own list. BP14's profile found that second fold at
 * 5.7% of seed 42's turns 120 to 130.
 *
 * `readEmpire` now hands in `readEmpireRates`: the same fold, taken off the town
 * lists it read. These tests hold the three facts that make it safe:
 *
 *   - the lines `readEmpire` holds are the lines a fresh `explainEmpireLines`
 *     gives, with the rate row's line among them;
 *   - only the reading at rest hands the books in; a caller inside a write
 *     (`collectYields`) still folds fresh;
 *   - with the slate's shadow check on, a short bot game gives the same lines on
 *     every seat at every turn as the fresh fold.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { readEmpire } from '../../src/sim/readings';
import { setSlateShadow, slateShadow } from '../../src/sim/slate';
import { type City, type GameState, bumpRevision, realPlayers } from '../../src/sim/state';
import { explainEmpireLines, foldEmpireLines } from '../../src/sim/yields/empire';
import { driveBots } from '../../src/ai/driver';
import { at, bareState } from './improvementHelpers';
import { createGame } from './newGameHelpers';

const SOURCES = import.meta.glob(['../../src/sim/readings.ts', '../../src/sim/yields/empire.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** One town of seat 0 with the given citizens and buildings. */
function town(state: GameState, col: number, row: number, population: number, buildings: string[]): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  for (const id of buildings) if (!city.buildings.includes(id as never)) city.buildings.push(id as never);
  bumpRevision(state);
  refreshCityDerived(state, city);
  return city;
}

/** Three towns of seat 0, the capital with a Bourse and enough gold buildings to make a rate. */
function realm(): GameState {
  const state = bareState(24, 12);
  town(state, 3, 3, 12, ['bourse', 'market', 'mint', 'gildedHall', 'colossus', 'petra', 'mausoleum']);
  town(state, 11, 3, 6, ['market', 'mint']);
  town(state, 19, 3, 4, []);
  bumpRevision(state);
  return state;
}

describe('the empire lines at rest (bot batch BP15)', () => {
  it('holds the lines a fresh fold gives, the Bourse line among them', () => {
    const state = realm();
    const fresh = explainEmpireLines(state, 0);
    const bourse = fresh.filter((line) => line.source.includes('Bourse'));
    expect(bourse.length, 'the Bourse pays a line off the empire’s gold').toBeGreaterThan(0);
    expect(bourse.reduce((sum, line) => sum + line.culture, 0)).toBeGreaterThan(0);
    expect(readEmpire(state, 0).lines).toEqual(fresh);
    expect(foldEmpireLines(readEmpire(state, 0).lines)).toEqual(foldEmpireLines(fresh));
  });

  it('hands the books in only from the reading at rest', () => {
    const readings = SOURCES['../../src/sim/readings.ts']!;
    expect(readings).toContain(
      'const lines = explainEmpireLines(state, playerId, empire, () => readEmpireRates(state, playerId));',
    );
    // The phase that banks the lines asks with no books, so it folds fresh.
    const empire = SOURCES['../../src/sim/yields/empire.ts']!;
    expect(empire).toContain('const lines = explainEmpireLines(state, player.id);');
    expect(empire).toContain('rates: () => EmpireRates = () => foldEmpireRates(state, playerId),');
  });

  it('agrees with a fresh fold on every seat at every turn of a bot game, under the shadow check', () => {
    const game = createGame({
      seed: 31,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00' },
        { name: 'B', color: '#00a' },
        { name: 'C', color: '#0a0' },
      ],
      barbarians: true,
    });
    const was = slateShadow();
    setSlateShadow(true);
    try {
      let compared = 0;
      while (game.state.turn <= 30 && game.state.winnerId === null) {
        driveBots(game, { warn: () => {} });
        for (const player of realPlayers(game.state)) {
          expect(readEmpire(game.state, player.id).lines).toEqual(explainEmpireLines(game.state, player.id));
          compared += 1;
        }
      }
      expect(compared).toBeGreaterThan(60);
    } finally {
      setSlateShadow(was);
    }
  }, 120_000);
});
