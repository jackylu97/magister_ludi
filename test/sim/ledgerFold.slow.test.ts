/**
 * **The lifetime tally replays** — batch S2's determinism pin, slow by kind
 * (CLAUDE.md: a byte-for-byte replay is slow whatever it costs today).
 *
 * A save is a config and a log, so the tally a loaded game carries is the tally
 * the replay writes — which is only true if the writer is deterministic in the
 * log alone. Sixty turns of two bots on the standard bench, by which point the
 * seats have drafted and slotted cards and the tally has rows in it; then the
 * log replayed from scratch and the two states compared as prints.
 */

import { describe, expect, it } from 'vitest';

import { replay, snapshotState } from '../../src/sim/game';
import { realPlayers } from '../../src/sim/state';
import { PATIENCE, playOut } from './aiBotHelpers';

describe('the lifetime tally, replayed', () => {
  it(
    'is byte-identical after sixty bot turns replayed from the log',
    () => {
      const played = playOut(60);
      const rows = realPlayers(played.game.state).reduce(
        (sum, player) => sum + player.statecraft.yieldTallies.length,
        0,
      );
      // A pin over a game whose decks paid nothing would be green for the
      // wrong reason.
      expect(rows).toBeGreaterThan(0);
      const again = replay(played.game.config, played.game.log);
      expect(snapshotState(again)).toBe(snapshotState(played.game.state));
    },
    PATIENCE,
  );
});
