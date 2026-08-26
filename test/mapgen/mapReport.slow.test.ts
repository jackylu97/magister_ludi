/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the inspection
 * page's two readings that cost a map each.
 *
 * The seat sweep is the expensive one and unapologetically so: twenty fresh
 * standard-map games, five seeds by four roster sizes, none of them shareable
 * with the memo table because each one is a *different* game. The purity check
 * below it is here for a smaller reason — it names a seed no other test in the
 * concern names, so it pays for a standard map of its own wherever it runs, and
 * `mapReport.test.ts` keeps the same claim on the duel census and on the
 * "agrees with each of its parts" identity.
 */
import { describe, expect, it } from 'vitest';

import { mapReport } from '../../src/dev/mapReport';
import { applyCommand } from '../../src/sim/commands';
import { RULES } from '../../src/sim/rulesData';
import { unitDef } from '../../src/sim/unitData';
import { type GameConfig, type GameState, newGame } from '../../src/sim/state';
import { gameFor } from './fixtures';

function config(players: number, sizeName = 'duel', seed = 4242): GameConfig {
  return {
    seed,
    sizeName,
    players: new Array(players)
      .fill(null)
      .map((_, i) => ({ name: `Seat ${i + 1}`, color: '#fff' })),
  };
}

/** A private game for a roster and a map — see `mapReport.test.ts` and `./fixtures`. */
function state(players = 4, sizeName = 'duel', seed = 4242): GameState {
  return gameFor(config(players, sizeName, seed));
}

describe('mapReport', () => {
  it('is a pure function of the state', () => {
    const first = mapReport(state(4, 'standard', 991));
    const second = mapReport(state(4, 'standard', 991));
    expect(second.census).toEqual(first.census);
    expect(second.continents).toEqual(first.continents);
    expect(second.starts).toEqual(first.starts);
    expect(Array.from(second.continentOf)).toEqual(Array.from(first.continentOf));
  });
});

/**
 * The page's other claim, and the one it now asserts out loud: **every seat
 * founds its capital**.
 *
 * The "only two of four capitals appear" report turned out to be two flags
 * painted in board inks (`test/lookData.test.ts` holds that end), and ruling the
 * *founding* out took a sweep nobody had run. This is that sweep, kept: it costs
 * a second and it is the difference between "the page says 4/4" and "4/4 is
 * true". `foundCityAt` rather than the reducer because the question is about the
 * ground under the settler, which is what a start is chosen on.
 */
describe('every seat can plant', () => {
  it('seats a settler on ground it may found on, at every roster size', () => {
    for (const seed of [1, 7, 99, 1234, 4242]) {
      for (const seats of [2, 4, 8, RULES.game.maxPlayers]) {
        const live = newGame(config(seats, 'standard', seed));
        const where = `${seed}/${seats} seats`;
        const settlers = live.units.filter((unit) => unitDef(unit.type).foundsCity);
        expect(`${where}: ${settlers.length} settlers`).toBe(`${where}: ${seats} settlers`);

        let founded = 0;
        for (const settler of settlers) {
          const result = applyCommand(live, {
            type: 'foundCity',
            playerId: settler.ownerId,
            settlerUnitId: settler.id,
          });
          if (result.ok) founded += 1;
          else expect(`${where} seat ${settler.ownerId}: ${result.error}`).toBe(`${where} seat ${settler.ownerId}: founded`);
        }
        expect(`${where}: ${founded} capitals`).toBe(`${where}: ${seats} capitals`);
      }
    }
  });
});

