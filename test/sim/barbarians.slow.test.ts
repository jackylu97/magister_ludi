/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the wild, played
 * long enough to become one.
 *
 * A long replay, and long by necessity: the wild founds camps on a cadence and
 * musters out of them on another, so a game short enough to be cheap is a game
 * with nothing in its log worth reproducing. Forty-five turns is what it takes
 * for a camp to stand, a raider to walk out of it and the whole of it to be
 * reachable from `{config, log}` alone.
 *
 * `barbarians.test.ts` keeps everything the wild is *made of*, which is almost
 * the whole concern and runs on hand-built boards: the seat and where it is
 * appended, the phase, where a camp may stand, the median-tier and horse rules,
 * mustering, raiding, the +2, clearing a camp, role derivation, stealing,
 * escorting and rescue — including the theft-escort-rescue replay, which reaches
 * its fixture in twelve turns.
 */
import { describe, expect, it } from 'vitest';

import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { playerById } from '../../src/sim/state';

describe('replay', () => {
  it('reproduces a game with camps and raiders in it, byte for byte', () => {
    const game = createGame({
      seed: 777,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    // Long enough for the wild to found camps, muster and move.
    for (let turn = 0; turn < 45; turn++) {
      const pending = playerById(game.state, 0)?.pendingDiscovery;
      if (pending) dispatch(game, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 });
      dispatch(game, { type: 'endTurn', playerId: 0 });
    }
    expect(game.state.camps.length).toBeGreaterThan(0);
    expect(game.state.units.some((unit) => unit.ownerId === 1)).toBe(true);

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
  });

});
