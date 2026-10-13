/**
 * The load checkpoint, pinned against the full replay it stands in for.
 *
 * A checkpoint is allowed to exist only as an accelerator (CLAUDE.md hard rule
 * 2: same config and log give a bit-identical state, and saves are
 * `{config, log}`). So the two claims tested here are:
 *
 * - A game loaded through a checkpoint is the same game, compared through
 *   `bytes` below: a text form that, unlike `snapshotState`, also sees key
 *   order, a key set to `undefined`, `NaN` and `-0`, which JSON would hide.
 *   Those are exactly what a structured clone (IndexedDB, `postMessage`)
 *   keeps and a JSON round trip would not.
 * - Every stale or wrong checkpoint is ignored, and the load is then the full
 *   replay, identical in the same sense.
 *
 * The games are played by the bots through `driveBots`, so the live state the
 * autosave copies has been read by bot code all game, as in a real session.
 */

import { describe, expect, it, vi } from 'vitest';

import { type Game, tryReplay, tryReplayResuming } from '../../src/sim/game';
import { type GameConfig, type GameState, SCHEMA_VERSION } from '../../src/sim/state';
import { lastLoaderMetrics, loadSlotAsync } from '../../src/ui/gameLoader';
import {
  CHECKPOINT_FORMAT,
  type CheckpointRecord,
  type SaveCheckpoints,
  currentBuildId,
  findCheckpoint,
  logDigest,
  writeCheckpoint,
} from '../../src/ui/saveCheckpoints';
import {
  AUTOSAVE_SLOT,
  QUICKSAVE_SLOT,
  createAutosaver,
  makeSavePayload,
  memorySaveStorage,
  writeSave,
} from '../../src/ui/saves';
import {
  stateText as bytes,
  checkpointsFor,
  fakeWorkerFactory,
  playBots as play,
  replayedState as replayed,
} from './gameLoaderHelpers';
import { createGame } from '../sim/newGameHelpers';
import { grownGames } from '../sim/grownGameHelpers';

const CONFIG: GameConfig = {
  seed: 20261006,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/**
 * The duel after any number of bot turns, played forward once for the file
 * (`test/sim/grownGameHelpers.ts`). Every call hands back a private copy.
 */
const grownDuel = grownGames(CONFIG);

/** Plays `turns`, autosaves through the real autosaver with checkpoints on. */
async function autosaved(turns: number) {
  const game = grownDuel(turns);
  if (game.state.winnerId !== null) throw new Error('autosaved: the duel was won; pick a shorter horizon');
  const storage = memorySaveStorage();
  const { store, checkpoints } = checkpointsFor();
  const auto = createAutosaver({ storage, onWarn: () => undefined, checkpoints, defer: (t) => t() });
  auto.save(game, 1000);
  await auto.flush();
  return { game, storage, store, checkpoints };
}

describe('loading through a checkpoint', () => {
  it('lands on the same bytes as the full replay when the checkpoint covers the whole log', async () => {
    const { game, storage, checkpoints } = await autosaved(12);
    const factory = vi.fn(fakeWorkerFactory());
    const loaded = await loadSlotAsync(storage, AUTOSAVE_SLOT, { checkpoints, workerFactory: factory });
    if (loaded === null || !loaded.ok) throw new Error('expected the autosave to load');
    // No walk at all: no worker was even asked.
    expect(lastLoaderMetrics()).toMatchObject({ mode: 'checkpoint', resumedFrom: game.log.length });
    expect(factory).not.toHaveBeenCalled();
    expect(bytes(loaded.game.state)).toBe(bytes(replayed(game)));
    // And the live state the autosave copied is that same state.
    expect(bytes(loaded.game.state)).toBe(bytes(game.state));
    expect(loaded.game.log).toEqual(game.log);
    expect(loaded.payload.turn).toBe(game.state.turn);
  });

  it('walks only the commands after the checkpoint, in the worker or here, to the same bytes', async () => {
    const { game, storage, checkpoints } = await autosaved(8);
    const at = game.log.length;
    // The game goes on past the autosave and is saved again with no checkpoint
    // of its own, as a quick save later in the session would be.
    play(game, 3);
    expect(game.log.length).toBeGreaterThan(at);
    await writeSave(storage, QUICKSAVE_SLOT, makeSavePayload(game, 'Quick Save', 2000));
    const reference = bytes(replayed(game));

    const there = await loadSlotAsync(storage, QUICKSAVE_SLOT, {
      checkpoints,
      workerFactory: fakeWorkerFactory(),
    });
    if (there === null || !there.ok) throw new Error('expected the quick save to load');
    expect(lastLoaderMetrics()).toMatchObject({ mode: 'worker', resumedFrom: at });
    expect(bytes(there.game.state)).toBe(reference);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const here = await loadSlotAsync(storage, QUICKSAVE_SLOT, {
      checkpoints,
      workerFactory: fakeWorkerFactory('throw-on-construct'),
    });
    warn.mockRestore();
    if (here === null || !here.ok) throw new Error('expected the quick save to load here too');
    expect(lastLoaderMetrics()).toMatchObject({ mode: 'synchronous', resumedFrom: at });
    expect(bytes(here.game.state)).toBe(reference);
  });

  it('keeps playing in lockstep with the replayed game after the load', async () => {
    const { game, storage, checkpoints } = await autosaved(10);
    const loaded = await loadSlotAsync(storage, AUTOSAVE_SLOT, { checkpoints });
    if (loaded === null || !loaded.ok) throw new Error('expected the autosave to load');
    const reference = createGame(CONFIG);
    reference.state = replayed(game);
    reference.log = [...game.log];
    play(loaded.game, 3);
    play(reference, 3);
    expect(loaded.game.log).toEqual(reference.log);
    expect(bytes(loaded.game.state)).toBe(bytes(reference.state));
  });
});

describe('a checkpoint that does not fit is ignored', () => {
  /** Loads the autosave with the stored record changed by `spoil`, and checks the full replay ran. */
  async function loadSpoiled(spoil: (record: CheckpointRecord) => unknown, buildId = 'test-build') {
    const { game, storage, store } = await autosaved(6);
    store.record = spoil(store.record as CheckpointRecord);
    const checkpoints: SaveCheckpoints = { store, buildId: async () => buildId };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const loaded = await loadSlotAsync(storage, AUTOSAVE_SLOT, {
      checkpoints,
      workerFactory: fakeWorkerFactory(),
    });
    warn.mockRestore();
    if (loaded === null || !loaded.ok) throw new Error('expected the full replay to load it');
    expect(lastLoaderMetrics()).toMatchObject({ mode: 'worker', resumedFrom: 0 });
    expect(bytes(loaded.game.state)).toBe(bytes(replayed(game)));
  }

  const poisoned = (record: CheckpointRecord): GameState => {
    // A state that would be wrong if it were ever adopted.
    const state = structuredClone(record.state);
    state.turn += 1000;
    return state;
  };

  it('from another build', async () => {
    await loadSpoiled((r) => ({ ...r, state: poisoned(r), buildId: 'another-build' }));
  });

  it('when this build cannot name itself', async () => {
    await loadSpoiled((r) => ({ ...r, state: poisoned(r) }), null as unknown as string);
  });

  it('from other rules', async () => {
    await loadSpoiled((r) => ({ ...r, state: poisoned(r), schemaVersion: SCHEMA_VERSION - 1 }));
  });

  it('of another record shape', async () => {
    await loadSpoiled((r) => ({ ...r, state: poisoned(r), format: CHECKPOINT_FORMAT + 1 }));
  });

  it('whose digest does not match the log', async () => {
    await loadSpoiled((r) => ({ ...r, state: poisoned(r), digest: '0'.repeat(64) }));
  });

  it('that covers more of the log than the save has', async () => {
    await loadSpoiled((r) => ({ ...r, state: poisoned(r), logLength: r.logLength + 1 }));
  });

  it('that covers less of the log but claims the old digest', async () => {
    // A prefix shorter than the one the digest was taken over: the recomputed
    // digest differs, so a state for one prefix is never used for another.
    await loadSpoiled((r) => ({ ...r, state: poisoned(r), logLength: r.logLength - 1 }));
  });

  it('whose state is not a state', async () => {
    await loadSpoiled((r) => ({ ...r, state: null }));
    await loadSpoiled((r) => ({ ...r, state: { ...poisoned(r), schemaVersion: -1 } }));
  });

  it('that is not a record at all', async () => {
    await loadSpoiled(() => 'nonsense');
    await loadSpoiled(() => undefined);
  });

  it('when the store cannot be read', async () => {
    const { game, storage } = await autosaved(4);
    const checkpoints: SaveCheckpoints = {
      store: {
        read: () => Promise.reject(new Error('IndexedDB is broken')),
        write: () => Promise.resolve(),
      },
      buildId: async () => 'test-build',
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const loaded = await loadSlotAsync(storage, AUTOSAVE_SLOT, { checkpoints });
    warn.mockRestore();
    if (loaded === null || !loaded.ok) throw new Error('expected the full replay to load it');
    expect(lastLoaderMetrics()?.resumedFrom).toBe(0);
    expect(bytes(loaded.game.state)).toBe(bytes(replayed(game)));
  });

  it('when it belongs to a different game with a log of the same length', async () => {
    const { store } = await autosaved(6);
    const other = createGame({ ...CONFIG, seed: CONFIG.seed + 1 });
    play(other, 6);
    expect(await findCheckpoint({ store, buildId: async () => 'test-build' }, other.config, other.log)).toBeNull();
  });
});

describe('the pieces', () => {
  it('the comparison sees what JSON hides', () => {
    expect(bytes({ a: 1, b: 2 })).not.toBe(bytes({ b: 2, a: 1 }));
    expect(bytes({ a: undefined })).not.toBe(bytes({}));
    expect(bytes([NaN])).not.toBe(bytes([null]));
    expect(bytes([-0])).not.toBe(bytes([0]));
    expect(bytes([, 1])).not.toBe(bytes([undefined, 1]));
    expect(bytes({ a: [1, { b: 'x' }] })).toBe(bytes(structuredClone({ a: [1, { b: 'x' }] })));
  });

  it('the digest covers the config and every command of the prefix, and survives a JSON round trip', async () => {
    const game = createGame(CONFIG);
    play(game, 4);
    const digest = await logDigest(game.config, game.log, game.log.length);
    const parsed = JSON.parse(JSON.stringify({ config: game.config, log: game.log })) as Game;
    expect(await logDigest(parsed.config, parsed.log, game.log.length)).toBe(digest);
    expect(await logDigest({ ...game.config, seed: 1 }, game.log, game.log.length)).not.toBe(digest);
    expect(await logDigest(game.config, game.log, game.log.length - 1)).not.toBe(digest);
    const changed = structuredClone(game.log);
    (changed[0] as { playerId: number }).playerId = 99;
    expect(await logDigest(game.config, changed, game.log.length)).not.toBe(digest);
  });

  it('a refused command on the way from a resume point falls back to the full walk', () => {
    const game = createGame(CONFIG);
    play(game, 6);
    const at = Math.floor(game.log.length / 2);
    const partway = tryReplay(game.config, game.log.slice(0, at));
    if (!partway.ok) throw new Error('expected the prefix to replay');
    // A wrong state under a resume point: no units, so the first unit order in
    // the tail is refused.
    partway.state.units = [];
    const result = tryReplayResuming(game.config, game.log, { state: partway.state, from: at });
    expect(result.resumedFrom).toBeNull();
    if (!result.ok) throw new Error('expected the full walk to load it');
    expect(bytes(result.state)).toBe(bytes(replayed(game)));
  });

  it('the autosave takes no checkpoint if the game moved on before the deferred write', async () => {
    const game = createGame(CONFIG);
    play(game, 3);
    const storage = memorySaveStorage();
    const { store, checkpoints } = checkpointsFor();
    const tasks: Array<() => void> = [];
    const auto = createAutosaver({
      storage,
      onWarn: () => undefined,
      checkpoints,
      defer: (task) => void tasks.push(task),
    });
    auto.save(game, 1000);
    play(game, 1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    tasks.splice(0).forEach((task) => task());
    await auto.flush();
    // The save went in; the checkpoint did not, because the state no longer
    // matched the saved log.
    expect(storage.getItem('magisterludi:save:autosave')).not.toBeNull();
    expect(store.record).toBeUndefined();
  });

  it('writeCheckpoint copies the state at the call, before its first await', async () => {
    const game = createGame(CONFIG);
    play(game, 3);
    const { store, checkpoints } = checkpointsFor();
    const expected = bytes(game.state);
    const writing = writeCheckpoint(checkpoints, game);
    game.state.turn += 1;
    expect(await writing).toBe(true);
    expect(bytes((store.record as CheckpointRecord).state)).toBe(expected);
  });

  it('the dev build id hashes every file the simulation can import', async () => {
    // The dev id is a digest of `src/sim/**` and `data/**`, so it is only safe
    // while the simulation imports nothing else. Every relative import in the
    // simulation must resolve inside those two folders.
    const sources = import.meta.glob('../../src/sim/**/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const outside: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      const dir = file.split('/').slice(0, -1);
      for (const match of text.matchAll(/from '([^']+)'/g)) {
        const spec = match[1]!;
        if (!spec.startsWith('.')) {
          outside.push(`${file}: ${spec}`);
          continue;
        }
        const parts = [...dir];
        for (const step of spec.split('/')) {
          if (step === '..') parts.pop();
          else if (step !== '.') parts.push(step);
        }
        const resolved = parts.join('/');
        if (!resolved.startsWith('../../src/sim/') && !resolved.startsWith('../../data/')) {
          outside.push(`${file}: ${spec}`);
        }
      }
    }
    expect(outside).toEqual([]);
    const id = await currentBuildId();
    expect(id).toMatch(/^dev:[0-9a-f]{64}$/);
    expect(await currentBuildId()).toBe(id);
  });
});
