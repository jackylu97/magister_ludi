/**
 * The worker load, pinned against the load it replaces.
 *
 * Moving `newGame` and the log walk off the main thread is only allowed if the
 * game that comes back is the *same game* — CLAUDE.md hard rule 2, and the one
 * claim a performance change to a deterministic simulation has to earn. So
 * every test here runs both paths on one `{config, log}` and compares
 * `snapshotState`, which is the whole state as text: a single different number
 * anywhere in four thousand tiles fails.
 *
 * The worker is modelled, not launched. Vitest runs in node, where there is no
 * `Worker` — so the fake below does exactly what the real seam does and nothing
 * else: it calls `answerGameWorker` (the real worker's real body, exported for
 * this) and puts the reply through `structuredClone`, which is the seam. What is
 * left untested here is the browser's `postMessage` itself, and that is the
 * platform's.
 */

import { describe, expect, it, vi } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import { type Game, createGame, snapshotState, tryReplay } from '../../src/sim/game';
import { type GameConfig, normalizeConfig } from '../../src/sim/state';
import { answerGameWorker } from '../../src/ui/game.worker';
import type { GameWorkerMessage, GameWorkerRequest } from '../../src/ui/game.worker';
import { createGameAsync, loadSaveAsync, loadSlotAsync } from '../../src/ui/gameLoader';
import {
  QUICKSAVE_SLOT,
  loadSave,
  makeSavePayload,
  memorySaveStorage,
  writeSave,
} from '../../src/ui/saves';
import { uiSource } from './sourceHelpers';

const CONFIG: GameConfig = {
  seed: 20260914,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/**
 * The seam, standing in for a browser's.
 *
 * `structuredClone` on the way out is the point: it is the same algorithm
 * `postMessage` uses, so a state that would not survive the crossing does not
 * survive this either. `queueMicrotask` keeps the reply asynchronous, so a
 * caller that accidentally depended on the old synchronous timing fails here.
 */
function fakeWorkerFactory(behaviour: 'answer' | 'error' | 'throw-on-construct' = 'answer') {
  return (): Worker => {
    if (behaviour === 'throw-on-construct') throw new Error('no worker here');
    const worker = {
      onmessage: null as ((event: MessageEvent<GameWorkerMessage>) => void) | null,
      onerror: null as ((event: Event & { message?: string }) => void) | null,
      onmessageerror: null as (() => void) | null,
      terminated: false,
      terminate(): void {
        this.terminated = true;
      },
      postMessage(request: GameWorkerRequest): void {
        queueMicrotask(() => {
          if (this.terminated) return;
          if (behaviour === 'error') {
            this.onerror?.({ type: 'error', message: 'worker died' } as Event & { message: string });
            return;
          }
          // Progress first, then the answer — the order the real worker sends
          // them in, and the order the loader has to survive.
          const reply = structuredClone(
            answerGameWorker(request, (turn) =>
              this.onmessage?.({ data: { kind: 'progress', turn } } as MessageEvent<GameWorkerMessage>),
            ),
          );
          this.onmessage?.({ data: reply } as MessageEvent<GameWorkerMessage>);
        });
      },
    };
    return worker as unknown as Worker;
  };
}

/** A save with enough game behind it that the walk is a real walk. */
function developedSave(turns: number): { json: string; game: Game } {
  const game = createGame(CONFIG);
  for (let turn = 0; turn < turns; turn++) {
    driveBots(game, { warn: () => undefined });
    if (game.state.winnerId !== null) break;
  }
  return { json: JSON.stringify(makeSavePayload(game, 'Pinned', 1_757_000_000_000)), game };
}

describe('createGameAsync', () => {
  it('builds byte-identically to createGame', async () => {
    const here = createGame(CONFIG);
    const there = await createGameAsync(CONFIG, { workerFactory: fakeWorkerFactory() });
    expect(snapshotState(there.state)).toBe(snapshotState(here.state));
    expect(there.config).toEqual(normalizeConfig(CONFIG));
    expect(there.log).toEqual([]);
  });

  it('throws the simulation’s own sentence for a config it will not build', async () => {
    const bad = { ...CONFIG, sizeName: 'gigantic-nonsense' };
    let sync = '';
    try {
      createGame(bad);
    } catch (error) {
      sync = error instanceof Error ? error.message : String(error);
    }
    expect(sync).not.toBe('');
    await expect(
      createGameAsync(bad, { workerFactory: fakeWorkerFactory() }),
    ).rejects.toThrow(sync);
  });

  it('builds on this thread when there is no worker to build on', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const there = await createGameAsync(CONFIG, {
      workerFactory: fakeWorkerFactory('throw-on-construct'),
    });
    expect(snapshotState(there.state)).toBe(snapshotState(createGame(CONFIG).state));
    warn.mockRestore();
  });
});

describe('loadSaveAsync', () => {
  it('replays a developed save to the same state as the synchronous path', async () => {
    const { json } = developedSave(24);
    const here = loadSave(json);
    const there = await loadSaveAsync(json, { workerFactory: fakeWorkerFactory() });
    expect(here.ok && there.ok).toBe(true);
    if (!here.ok || !there.ok) return;
    expect(snapshotState(there.game.state)).toBe(snapshotState(here.game.state));
    expect(there.game.log).toEqual(here.game.log);
    expect(there.game.config).toEqual(here.game.config);
    expect(there.payload).toEqual(here.payload);
    // The label is derived from the replay on both paths, never read off the file.
    expect(there.payload.turn).toBe(there.game.state.turn);
  });

  it('reports a rejected command with the same index and sentence as the synchronous path', async () => {
    const { json, game } = developedSave(6);
    const payload = JSON.parse(json) as { log: unknown[] };
    // A command the reducer will refuse, wedged into the middle of a good log.
    const at = Math.floor(game.log.length / 2);
    payload.log.splice(at, 0, { type: 'moveUnit', playerId: 0, unitId: 9_999, col: 0, row: 0 });
    const broken = JSON.stringify(payload);

    const here = loadSave(broken);
    const there = await loadSaveAsync(broken, { workerFactory: fakeWorkerFactory() });
    expect(here.ok).toBe(false);
    expect(there.ok).toBe(false);
    if (here.ok || there.ok) return;
    expect(there.error).toBe(here.error);
    expect(there.detail).toBe(here.detail);
    expect(there.detail).toContain(`command ${at}`);

    // And the third path: no worker to ask at all, the walk run on this thread
    // inside `loadSaveAsync` itself. It is the one the node test run and an old
    // browser take, and a refusal the sheet can print has to come back from it
    // character for character or the fix only works where the seam does
    // (`docs/flags.md` (yyyyy)).
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fallen = await loadSaveAsync(broken, {
      workerFactory: fakeWorkerFactory('throw-on-construct'),
    });
    warn.mockRestore();
    if (fallen.ok) throw new Error('expected the fallback to refuse it too');
    expect(fallen.error).toBe(here.error);
    expect(fallen.detail).toBe(here.detail);
  });

  it('leaves a good save opening exactly as it did, with nothing to refuse', async () => {
    // The other half of the refusal pin: the paths that used to work still work,
    // and a loaded game carries no sentence for the sheet to print.
    const { json } = developedSave(6);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const here = loadSave(json);
    const worker = await loadSaveAsync(json, { workerFactory: fakeWorkerFactory() });
    const fallen = await loadSaveAsync(json, {
      workerFactory: fakeWorkerFactory('throw-on-construct'),
    });
    warn.mockRestore();
    if (!here.ok || !worker.ok || !fallen.ok) throw new Error('expected every path to open it');
    expect(snapshotState(worker.game.state)).toBe(snapshotState(here.game.state));
    expect(snapshotState(fallen.game.state)).toBe(snapshotState(here.game.state));
    expect(fallen.payload).toEqual(here.payload);
  });

  it('refuses a config the simulation will not build with the same sentence', async () => {
    const { json } = developedSave(1);
    const payload = JSON.parse(json) as { config: GameConfig };
    payload.config = { ...payload.config, sizeName: 'gigantic-nonsense' };
    const broken = JSON.stringify(payload);

    const here = loadSave(broken);
    const there = await loadSaveAsync(broken, { workerFactory: fakeWorkerFactory() });
    if (here.ok || there.ok) throw new Error('expected both to refuse');
    expect(there.error).toBe(here.error);
    expect(there.error).toMatch(/not one this build can play/);
  });

  it('refuses a bad envelope without ever asking a worker', async () => {
    const asked = vi.fn(fakeWorkerFactory());
    expect(await loadSaveAsync('{ not json', { workerFactory: asked })).toMatchObject({
      ok: false,
      error: /not even JSON/,
    });
    expect(asked).not.toHaveBeenCalled();
  });

  it('falls back to this thread when the worker dies, and lands the same game', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { json } = developedSave(8);
    const here = loadSave(json);
    const there = await loadSaveAsync(json, { workerFactory: fakeWorkerFactory('error') });
    if (!here.ok || !there.ok) throw new Error('expected both to load');
    expect(snapshotState(there.game.state)).toBe(snapshotState(here.game.state));
    warn.mockRestore();
  });

  it('cancelling rejects and produces no game', async () => {
    const { json } = developedSave(4);
    const controller = new AbortController();
    const promise = loadSaveAsync(json, {
      workerFactory: fakeWorkerFactory(),
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('loadSlotAsync', () => {
  it('answers null for a slot that is not there, and the game for one that is', async () => {
    const storage = memorySaveStorage();
    expect(await loadSlotAsync(storage, QUICKSAVE_SLOT)).toBeNull();
    const { json } = developedSave(3);
    writeSave(storage, QUICKSAVE_SLOT, JSON.parse(json) as never);
    const result = await loadSlotAsync(storage, QUICKSAVE_SLOT, {
      workerFactory: fakeWorkerFactory(),
    });
    if (result === null || !result.ok) throw new Error('expected a loaded game');
    const here = loadSave(json);
    if (!here.ok) throw new Error('expected the synchronous path to load too');
    expect(snapshotState(result.game.state)).toBe(snapshotState(here.game.state));
  });
});

describe('the surfaces that build a game', () => {
  // A register, not a style check: every way into a game has to be the
  // off-thread one, or a developed save quietly goes back to freezing the tab
  // and nothing else in the suite notices.
  it('boot, restart and every load go through the worker loader', () => {
    const main = uiSource('main.ts');
    expect(main).toContain(
      "import { createGameAsync, loadSlotAsync, warmGameWorker } from './ui/gameLoader'",
    );
    // The worker reads the rules while the landing is up, not while a press waits.
    expect(main).toContain('warmGameWorker();');
    expect(main).toContain('let game: Game = initial ?? (await createGameAsync(currentConfig()))');
    expect(main).toContain('const replacement = next ?? (await createGameAsync(currentConfig()))');
    expect(main).toContain('await loadSlotAsync(saveStorage, slotId, { onReplayTurn: replayProgress })');
    // The synchronous builders are `saves.ts`'s and the headless pages'; main
    // no longer calls either of them.
    expect(main).not.toContain('createGame(currentConfig())');
    expect(main).not.toContain('loadSlot(saveStorage');

    // The panel's two routes in — a shelf row and an imported file — funnel
    // through the same gate.
    expect(uiSource('savesPanel.ts')).toContain("import { loadSaveAsync } from './gameLoader'");
    expect(uiSource('savesPanel.ts')).toContain(
      'result = await loadSaveAsync(json, { onReplayTurn: loading?.replayed })',
    );
  });

  it('the worker body is the simulation’s own two entry points and nothing else', () => {
    const worker = uiSource('game.worker.ts');
    expect(worker).toContain("import { tryReplay } from '../sim/game'");
    expect(worker).toContain('newGame(request.config)');
    // One walk, with an observer hung on it — never a second loop of its own.
    expect(worker).toContain('tryReplay(request.config, request.log, (turn) => onTurn?.(turn))');
    expect(worker).not.toContain('applyCommand');
  });
});

describe('the seam itself', () => {
  it('carries a finished state across structuredClone unchanged', () => {
    // The one property the worker relies on and JSON would not give it: a clone
    // of the state is the state, key for key, including anything `undefined`.
    const replayed = tryReplay(normalizeConfig(CONFIG), []);
    if (!replayed.ok) throw new Error('expected a state');
    expect(snapshotState(structuredClone(replayed.state))).toBe(snapshotState(replayed.state));
  });
});
