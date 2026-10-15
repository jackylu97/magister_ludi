/**
 * Every chip's list adds up to the chip in a game the bots have played forward.
 *
 * The slow half of `cityModifiers.test.ts`. The core file builds its developed
 * empire by hand, which keeps it quick and reaches every kind of row, but only
 * the rows someone thought to build. A played game reaches the rest: towns
 * working mines, pastures and rivers, caravans, beliefs and rites, Orders and a
 * government, luxuries, and whatever the bots did that nobody thought of. It is
 * slow by kind (a multi-decade bot game), so it lives in this file.
 *
 * Checked at two horizons on the bots' duel: every town on the board, every one
 * of the six chips. A row that is not accounted for (`UNACCOUNTED_SOURCE`) is a
 * failure here, because it means the simulation folded something into a chip
 * that no reading names.
 */

import { describe, expect, it } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import { readCity, readEmpire } from '../../src/sim/readings';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { type GameConfig } from '../../src/sim/state';
import { foldCity } from '../../src/sim/yields/town';
import { chipLedgerRows } from '../../src/ui/cityPanel';
import { createGame } from '../sim/newGameHelpers';

/** The bots' duel, the same seats and seed `aiBot.test.ts` plays. */
const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

const HORIZONS = [40, 80] as const;

describe('every chip’s list adds up to the chip in a played game', () => {
  it('folds to the banked figure for every town and every chip, with nothing unaccounted', () => {
    const game = createGame(CONFIG);
    let checked = 0;
    for (const horizon of HORIZONS) {
      // Bounded, in case the game ends early and a turn stops passing.
      for (let guard = 0; game.state.turn < horizon && guard < 4 * horizon; guard += 1) {
        driveBots(game, { warn: () => {} });
      }
      expect(game.state.turn).toBeGreaterThanOrEqual(horizon);
      const { state } = game;
      expect(state.cities.length).toBeGreaterThan(1);
      for (const city of state.cities) {
        const quote = readCity(state, city);
        const banked = readEmpire(state, city.ownerId).towns.find((town) => town.city.id === city.id);
        for (const key of CITY_YIELD_KEYS) {
          const ledger = chipLedgerRows(state, city, quote, key);
          const where = `turn ${state.turn}, ${city.name}, ${key}`;
          expect(ledger.total, where).toBe(foldCity(state, city, [], city.queue[0], quote)[key]);
          if (banked !== undefined) expect(ledger.total, where).toBe(banked.total[key]);
          let fold = 0;
          for (const row of ledger.rows) fold += row.amount;
          expect(Math.abs(fold - ledger.total), where).toBeLessThan(1e-9);
          expect(
            ledger.rows.filter((row) => row.kind === 'unaccounted').map((row) => row.amount),
            where,
          ).toEqual([]);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
