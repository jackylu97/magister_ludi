/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — a real
 * treasury, spent on real ground, replayed.
 *
 * A long replay, and long because nothing is hand-fed: the gold comes from the
 * luxuries the capital works, so every byte of the final state is reachable from
 * `{config, log}` alone — which is the whole point of the test. Forty-five turns
 * is how long an honest capital takes to buy several tiles, and a test that
 * granted itself the coin would prove nothing about the command.
 *
 * `territory.test.ts` keeps the border cost curve, what a tile costs, the
 * monument's early-game claim, the writ, every refusal `purchaseTile` can make,
 * and the counter's save round-trip.
 */
import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../../src/sim/game';
import { purchasableTiles } from '../../src/sim/cities';

describe('purchases in the log', () => {
  /**
   * A real game, played to a real treasury, spent on real ground.
   *
   * Nothing is hand-fed: the gold comes from the luxuries the capital works, so
   * every byte of the final state is reachable from `{config, log}` alone —
   * which is the whole point of the test. The seed is chosen because its capital
   * has something worth selling in its rings; the assertion below that the
   * treasury actually filled is what stops the test quietly passing on a map
   * where nobody could afford anything — and it is what caught seed 1 losing its
   * saleable rings when the luxury deal and the hill share were retuned. Seed 5
   * buys three tiles with room to spare, so it is the one with the most margin
   * against the next retune rather than merely the first that passes.
   */
  it('replays byte-identically, purchases and all', () => {
    const game = createGame({
      seed: 5,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#a00', isHuman: true }],
    });
    const founder = game.state.units.find((unit) => unit.type === 'settler')!;
    expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
      true,
    );
    const city = game.state.cities[0]!;

    let bought = 0;
    for (let turn = 0; turn < 45; turn++) {
      const offer = purchasableTiles(game.state, city).find((one) => one.error === null);
      if (offer) {
        expect(
          dispatch(game, {
            type: 'purchaseTile',
            playerId: 0,
            cityId: city.id,
            col: offer.col,
            row: offer.row,
          } as Command).ok,
        ).toBe(true);
        bought += 1;
      }
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }
    expect(game.state.players[0]!.gold).toBeGreaterThan(0);
    expect(bought).toBeGreaterThan(1);
    expect(game.state.players[0]!.tilesPurchased).toBe(bought);

    // Same config, same commands, same bytes — with the purchases in the log.
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
    // And through a save file, which is the same claim one layer out.
    expect(snapshotState(loadGame(saveGame(game)).state)).toBe(snapshotState(game.state));
  });

});
