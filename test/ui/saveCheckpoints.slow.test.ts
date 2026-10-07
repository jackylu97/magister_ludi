/**
 * The load checkpoint on a longer game: slow by kind (a long bot game and
 * full replays compared state for state), so it sits beside
 * `saveCheckpoints.test.ts` in the slow tier.
 *
 * Four bot seats on a standard map with the wild, forty turns. The autosave
 * at turn thirty takes a checkpoint; the game plays ten more turns and is
 * quick-saved. Loading the autosave must use the checkpoint with nothing to
 * walk, loading the quick save must walk only the ten turns after it, and both
 * must equal the full replay of their logs.
 */

import { describe, expect, it } from 'vitest';

import { createGame } from '../../src/sim/game';
import { lastLoaderMetrics, loadSlotAsync } from '../../src/ui/gameLoader';
import { rosterFor } from '../../src/ui/gameSetup';
import {
  AUTOSAVE_SLOT,
  QUICKSAVE_SLOT,
  createAutosaver,
  makeSavePayload,
  memorySaveStorage,
  writeSave,
} from '../../src/ui/saves';
import {
  checkpointsFor,
  fakeWorkerFactory,
  playBots,
  replayedState,
  stateText,
} from './gameLoaderHelpers';

describe('the load checkpoint on a long game', () => {
  it('a checkpoint and its tail land on the same state as the full replay', async () => {
    const game = createGame({
      seed: 777,
      sizeName: 'standard',
      players: rosterFor(4).map((seat) => ({ ...seat, isHuman: false })),
      barbarians: true,
    });
    playBots(game, 30);
    const autosaveState = stateText(replayedState(game));
    const storage = memorySaveStorage();
    const { checkpoints } = checkpointsFor();
    const auto = createAutosaver({ storage, onWarn: () => undefined, checkpoints, defer: (t) => t() });
    auto.save(game, 1000);
    await auto.flush();
    const at = game.log.length;

    playBots(game, 10);
    await writeSave(storage, QUICKSAVE_SLOT, makeSavePayload(game, 'Quick Save', 2000));

    const whole = await loadSlotAsync(storage, AUTOSAVE_SLOT, { checkpoints });
    if (whole === null || !whole.ok) throw new Error('expected the autosave to load');
    expect(lastLoaderMetrics()).toMatchObject({ mode: 'checkpoint', resumedFrom: at });
    expect(stateText(whole.game.state)).toBe(autosaveState);

    const tail = await loadSlotAsync(storage, QUICKSAVE_SLOT, {
      checkpoints,
      workerFactory: fakeWorkerFactory(),
    });
    if (tail === null || !tail.ok) throw new Error('expected the quick save to load');
    expect(lastLoaderMetrics()).toMatchObject({ mode: 'worker', resumedFrom: at });
    expect(stateText(tail.game.state)).toBe(stateText(replayedState(game)));
    expect(stateText(tail.game.state)).toBe(stateText(game.state));
  }, 600_000);
});
