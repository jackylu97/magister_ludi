import { describe, expect, it } from 'vitest';

import { copyMusterRoll, markMusterTurn } from '../../src/ai/musterRoll';
import { playedGameFixture } from './grownGameHelpers';
import { createGame } from './newGameHelpers';

describe('copies of a played game', () => {
  it('builds once and gives each caller its own state, log and bot memory', () => {
    let builds = 0;
    const opening = playedGameFixture(() => {
      builds++;
      const game = createGame({ seed: 7, sizeName: 'duel', players: [{ name: 'Ada', color: '#a00' }] });
      markMusterTurn(game.state);
      return game;
    });
    const first = opening();
    const memory = copyMusterRoll(first.state);
    expect(memory).toHaveLength(1);
    first.state.turn++;
    markMusterTurn(first.state);
    first.log.push({ type: 'endTurn', playerId: 0 });

    const second = opening();
    expect(builds).toBe(1);
    expect(second.state.turn).toBe(first.state.turn - 1);
    expect(second.log).toEqual([]);
    expect(copyMusterRoll(first.state)).toHaveLength(2);
    expect(copyMusterRoll(second.state)).toEqual(memory);
  });
});
