/**
 * Building a game without stopping the page: the same `newGame` and the same
 * log walk, asked of a worker.
 *
 * Why
 * ---
 * A load is two long things in a row and only one of them was ever off-thread.
 * The board build has had a worker since the painted renderer landed; the
 * *simulation* half — `newGame` for a fresh game, `newGame` plus every command
 * in the log for a saved one — ran on the main thread, so pressing Continue on a
 * developed save froze the tab. Measured on a standard map (P7,
 * `docs/plans/painted-performance-audit.md` #22):
 *
 *   · `newGame` (state + map)            ~265 ms
 *   · the log walk, a 6-turn save          ~24 ms
 *   · the log walk, a 121-turn save      ~3,855 ms
 *   · handing the finished state back        ~6 ms
 *
 * The last line is the whole argument. A structured clone of a finished state is
 * three orders of magnitude cheaper than building it, and the walk only gets
 * longer as the game does — a save twice as deep pays twice, the clone pays the
 * same 6 ms, because the map is the bulk of a state and the map is one size.
 *
 * What is *not* moved
 * -------------------
 * The sim stays pure and synchronous (CLAUDE.md, `src/sim/` is PURE): the worker
 * runs one walk, in order, start to finish. No command is distributed, no
 * validation is weakened, the rejected command's index and the reducer's own
 * sentence come back exactly as `tryReplay` produced them, and a load is still
 * all-or-nothing — the caller gets a whole `Game` or a sentence and no game.
 * The save format is untouched; nothing is snapshotted or cached.
 *
 * Why it may be a worker at all
 * -----------------------------
 * Determinism (hard rule 2). A state built here is byte-identical to one built
 * on the main thread because it is built by the same pure code from the same
 * `{config, log}` — there is no clock, no `Math.random`, and no Map/Set order in
 * an outcome. The structured-clone seam preserves what JSON would not (`NaN`, a
 * key written as `undefined`, key order), which is why the state travels as a
 * live object rather than through `snapshotState`.
 * `test/ui/gameLoader.test.ts` pins both paths against each other, including the
 * refusal.
 *
 * Falling back
 * ------------
 * Every failure of the *seam* — no `Worker` in this environment (the node test
 * run is one), a worker that will not construct, one that errors before it
 * answers — falls through to the synchronous path and produces the same game a
 * little later. Only an answer the worker actually gave (a refused command, a
 * config the sim will not build) is taken as an answer.
 */

import type { Command } from '../sim/commands';
import { type Game, createGame } from '../sim/game';
import { type GameConfig, normalizeConfig } from '../sim/state';
import type { GameState } from '../sim/state';
import {
  type LoadResult,
  type LoadWalk,
  type SaveEnvelope,
  type SaveStorage,
  finishLoad,
  readSaveEnvelope,
  storageKey,
  walkHere,
} from './saves';
import type { GameWorkerMessage, GameWorkerReply, GameWorkerRequest } from './game.worker';

export interface LoaderOptions {
  /** Terminates the worker and rejects with an `AbortError`. Nothing is adopted. */
  signal?: AbortSignal;
  /** Tests hand in their own worker. Production takes the module URL below. */
  workerFactory?: () => Worker;
  /**
   * How far the log has walked, **once per turn** (`ReplayWatcher` in
   * `sim/game.ts`), with the turn the file's own label expects it to reach.
   * The loading sheet's second stage is this and nothing else; a new world
   * never calls it, because a new world has no log.
   */
  onReplayTurn?: (turn: number, expected: number) => void;
}

/** Which way a build actually went, for the profile panel and for tests. */
export interface LoaderMetrics {
  mode: 'worker' | 'synchronous';
  /** Wall time of the whole call, main thread included. */
  totalMs: number;
  /** What the walk itself cost, wherever it ran. */
  walkMs: number;
}

/**
 * One worker per build, terminated the moment it has answered.
 *
 * The same discipline the board builder keeps: a worker that is not pooled
 * cannot carry a previous game's module state into this one, and terminating it
 * is the one cancellation primitive that is guaranteed to stop CPU work.
 */
function defaultWorker(): Worker {
  return new Worker(new URL('./game.worker.ts', import.meta.url), { type: 'module' });
}

/**
 * One worker, built early and standing idle until a press needs it.
 *
 * Constructing it is free; *filling* it is not. A fresh worker has to fetch and
 * evaluate the whole simulation — every rules table in `data/` — before it can
 * answer anything, and that measured **~400 ms** on the built bundle, which is
 * longer than building a new game takes. Off the critical path it costs nothing:
 * the landing is up, the player is choosing a seed, and the worker is reading
 * the rules. So one is raised whenever there is none, and a fresh one takes its
 * place as soon as the last is spent — the discipline is still *one worker per
 * build*, it has simply started reading earlier.
 */
let warm: Worker | null = null;

export function warmGameWorker(): void {
  if (warm !== null || typeof Worker === 'undefined') return;
  try {
    warm = defaultWorker();
  } catch {
    // No worker in this browser. `ask` will say so once, and build here.
    warm = null;
  }
}

/** The idle worker if there is one, else a new one. Never the same one twice. */
function takeWorker(): Worker {
  const ready = warm;
  warm = null;
  return ready ?? defaultWorker();
}

/** True when the seam is available at all. The node test run answers `false`. */
function workersExist(options: LoaderOptions): boolean {
  return options.workerFactory !== undefined || typeof Worker !== 'undefined';
}

function aborted(): DOMException {
  return new DOMException('Loading cancelled', 'AbortError');
}

/**
 * Sends one request, resolves with the one reply.
 *
 * Resolves `null` — rather than rejecting — for every failure of the seam
 * itself, so the caller can fall back to walking here. A reply the worker
 * actually sent is never `null`, however unhappy it is.
 */
async function ask(
  request: GameWorkerRequest,
  options: LoaderOptions,
  onProgress?: (turn: number) => void,
): Promise<GameWorkerReply | null> {
  if (options.signal?.aborted) throw aborted();
  let worker: Worker;
  try {
    worker = options.workerFactory ? options.workerFactory() : takeWorker();
  } catch (error) {
    console.warn('[magister-ludi load] no simulation worker; building on the main thread', error);
    return null;
  }
  return new Promise<GameWorkerReply | null>((resolve, reject) => {
    let done = false;
    const finish = (settle: () => void): void => {
      if (done) return;
      done = true;
      options.signal?.removeEventListener('abort', abort);
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
      // The next press should not wait for a worker to read the rules either.
      if (options.workerFactory === undefined) warmGameWorker();
      settle();
    };
    const abort = (): void => finish(() => reject(aborted()));
    options.signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = (event): void => {
      event.preventDefault?.();
      console.warn('[magister-ludi load] simulation worker failed; building on the main thread');
      finish(() => resolve(null));
    };
    // A state the seam will not carry is a seam failure, not a bad save.
    worker.onmessageerror = (): void => finish(() => resolve(null));
    worker.onmessage = ({ data }: MessageEvent<GameWorkerMessage>): void => {
      // A progress line is not an answer: the worker is still walking, and the
      // one message that ends the exchange is the one carrying a state or a
      // refusal.
      if (data.kind === 'progress') {
        onProgress?.(data.turn);
        return;
      }
      finish(() => resolve(data));
    };
    try {
      worker.postMessage(request);
    } catch (error) {
      console.warn('[magister-ludi load] could not send to the simulation worker', error);
      finish(() => resolve(null));
    }
  });
}

/**
 * `createGame`, off-thread.
 *
 * Throws what `createGame` throws for a config the simulation will not build —
 * the caller's `catch` is the same one it always was — and an `AbortError` if
 * the signal fires. The config and the (empty) log are the main thread's: only
 * the state is expensive enough to cross.
 */
export async function createGameAsync(
  config: GameConfig,
  options: LoaderOptions = {},
): Promise<Game> {
  const started = performance.now();
  if (!workersExist(options)) return note('synchronous', started, () => createGame(config));
  const reply = await ask({ kind: 'create', config }, options);
  if (options.signal?.aborted) throw aborted();
  if (reply === null) return note('synchronous', started, () => createGame(config));
  if (reply.kind === 'unbuildable') throw new Error(reply.message);
  // A fresh game has no log, so there is nothing for the reducer to refuse; if
  // one ever comes back the state is not to be trusted and the caller is told.
  if (reply.kind !== 'state') throw new Error(`A new game refused its own log: ${reply.error}`);
  lastMetrics = { mode: 'worker', totalMs: performance.now() - started, walkMs: reply.walkMs };
  return { config: normalizeConfig(config), state: reply.state as GameState, log: [] };
}

/** The log walk, asked of a worker; `null` when the seam was not there to ask. */
async function walkThere(
  envelope: SaveEnvelope,
  options: LoaderOptions,
): Promise<{ walk: LoadWalk; walkMs: number } | null> {
  const reply = await ask(
    { kind: 'replay', config: envelope.config, log: envelope.log as Command[] },
    options,
    (turn) => options.onReplayTurn?.(turn, envelope.turn),
  );
  if (reply === null) return null;
  if (reply.kind === 'unbuildable') {
    return { walk: { ok: false, unbuildable: reply.message }, walkMs: 0 };
  }
  if (reply.kind === 'refused') {
    return {
      walk: { ok: false, failure: { index: reply.index, type: reply.type, error: reply.error } },
      walkMs: reply.walkMs,
    };
  }
  return { walk: { ok: true, state: reply.state as GameState }, walkMs: reply.walkMs };
}

/**
 * `loadSave`, with the walk off-thread. Same gate, same sentences, same
 * all-or-nothing: `readSaveEnvelope` and `finishLoad` are `saves.ts`'s own, so
 * there is nothing here for the two paths to drift apart on.
 */
export async function loadSaveAsync(
  json: string,
  options: LoaderOptions = {},
): Promise<LoadResult> {
  const started = performance.now();
  const read = readSaveEnvelope(json);
  if (!read.ok) return { ok: false, error: read.error };
  const envelope = read.envelope;
  const there = workersExist(options) ? await walkThere(envelope, options) : null;
  if (options.signal?.aborted) throw aborted();
  if (there === null) {
    // The thread is about to be blocked, so nothing will repaint between these
    // calls — but the stage list is the same list either way, and a sheet that
    // never heard of the walk would be stuck on "Opening the save".
    return note('synchronous', started, () =>
      finishLoad(
        envelope,
        walkHere(envelope, (turn: number) => options.onReplayTurn?.(turn, envelope.turn)),
      ),
    );
  }
  lastMetrics = { mode: 'worker', totalMs: performance.now() - started, walkMs: there.walkMs };
  return finishLoad(envelope, there.walk);
}

/** Runs the fallback and stamps it, so the profile panel says which path ran. */
function note<T>(mode: LoaderMetrics['mode'], started: number, build: () => T): T {
  const here = performance.now();
  const value = build();
  lastMetrics = { mode, totalMs: performance.now() - started, walkMs: performance.now() - here };
  return value;
}

/** Reads a slot and loads it. `null` when the slot is simply not there. */
export async function loadSlotAsync(
  storage: SaveStorage,
  slotId: string,
  options: LoaderOptions = {},
): Promise<LoadResult | null> {
  const json = storage.getItem(storageKey(slotId));
  if (json === null) return null;
  return loadSaveAsync(json, options);
}

/**
 * What the last build cost, for the `?profile` panel. A module-level reading
 * rather than a return value because every caller of these two functions wants
 * the game and none of them wants the stopwatch.
 */
let lastMetrics: LoaderMetrics | null = null;

export function lastLoaderMetrics(): LoaderMetrics | null {
  return lastMetrics;
}
