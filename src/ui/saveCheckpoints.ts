/**
 * The load checkpoint: a copy of the game state kept beside the saves so that
 * loading a long game does not have to replay every command.
 *
 * Why
 * ---
 * A save is `{config, log}` and a load replays the whole log (CLAUDE.md hard
 * rule 2). On a six-seat standard bot game that walk took 8 s for an 85-turn
 * save, 28 s at turn 150 and 75 s at turn 200 (measured in node, 2026-10-07;
 * browser performance audit 2026-10-06, finding 3). Loading the same saves
 * through a checkpoint took 13 to 23 ms. So the autosave also stores the live
 * state, and a load that can
 * prove the stored state belongs to its log starts from it and replays only the
 * commands after it.
 *
 * What stays true
 * ---------------
 * - The save format does not change. A save is still `{config, log}` and is
 *   still the only thing a game is rebuilt from when no checkpoint fits.
 * - A checkpoint is only an accelerator. Every way it can fail to fit, or fail
 *   at all, falls back to the full replay: no store, a read that throws, a
 *   record of another shape, another rules schema, another build, a log that
 *   is shorter than the checkpoint or differs from it anywhere in the covered
 *   prefix, or a tail command the reducer refuses from the checkpointed state.
 * - A checkpoint is keyed so it cannot be used for a different log, schema or
 *   build: the record carries `SCHEMA_VERSION`, a build id (`currentBuildId`),
 *   the length of the log prefix it covers, and a SHA-256 digest of the config
 *   and that prefix. The digest is recomputed from the save being loaded, never
 *   trusted from the record alone.
 * - The state is stored by structured clone (IndexedDB), never through JSON:
 *   JSON would lose `NaN`, keys written as `undefined`, and key order, and a
 *   state that differs in any of those is not the state the replay builds.
 *
 * One rolling record
 * ------------------
 * Only the autosave writes a checkpoint, and each write replaces the last. A
 * quick save or a named save of the same game taken later in the turn still
 * hits it, because its log starts with the checkpoint's prefix and only the few
 * commands after it are replayed. An older named save simply misses and loads
 * the slow way, as it always did. One record keeps the storage cost to one
 * state (about a megabyte in a late game) with nothing to clean up when a slot
 * is deleted.
 *
 * Where the state comes from
 * --------------------------
 * The autosave clones the *live* state. That is the state the replay would
 * build only because every mutation goes through the reducer (hard rule 1) and
 * the reducer is deterministic (hard rule 2), which is exactly what the save
 * format already relies on. `test/ui/saveCheckpoints.test.ts` pins it: a game
 * played by bots and loaded through its checkpoint is identical to the same
 * save loaded by full replay, compared in a form that sees key order,
 * `undefined` and `NaN` as well as every value.
 */

import type { Command } from '../sim/commands';
import type { Game } from '../sim/game';
import { type GameConfig, type GameState, SCHEMA_VERSION } from '../sim/state';

/** This record's own shape version, bumped if the fields below change. */
export const CHECKPOINT_FORMAT = 1;

/** What is stored: the key fields, then the state they vouch for. */
export interface CheckpointRecord {
  format: number;
  schemaVersion: number;
  buildId: string;
  /** How many commands of the log the state has applied. */
  logLength: number;
  /** SHA-256 (hex) of the config and `log[0..logLength)`; see `logDigest`. */
  digest: string;
  state: GameState;
}

/** Where the one rolling record lives. IndexedDB in a browser, a variable in tests. */
export interface CheckpointStore {
  read(): Promise<unknown>;
  write(record: CheckpointRecord): Promise<void>;
}

/** A store and the build id it is checked against, passed around as one thing. */
export interface SaveCheckpoints {
  store: CheckpointStore;
  /** `null` means this build cannot name itself, and checkpoints are off. */
  buildId: () => Promise<string | null>;
}

/** A checkpoint that fits a log: start from `state`, replay from `from`. */
export interface CheckpointHit {
  state: GameState;
  from: number;
}

// --- the key ------------------------------------------------------------------

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/**
 * The digest that ties a checkpoint to one game and one log prefix.
 *
 * It hashes the JSON text of the config and of the first `length` commands.
 * The log in memory is JSON-clean by construction (`dispatch` deep-copies each
 * command through JSON), and a parsed save gives back the same objects, so the
 * text is the same whether it is computed from a live game or a loaded file.
 */
export function logDigest(
  config: GameConfig,
  log: readonly Command[],
  length: number,
): Promise<string> {
  return sha256Hex(`${JSON.stringify(config)}\n${JSON.stringify(log.slice(0, length))}`);
}

/**
 * Names the code that produced a state, so a checkpoint written by one build
 * is never read by another.
 *
 * - **Built pages:** the URL of the bundled game worker. Vite names it after a
 *   hash of its content, and the worker contains `newGame`, the reducer and
 *   every data table they read, so any change to the rules gives a new name.
 *   The main thread runs the same sources from the same build.
 * - **The dev server:** there is no content hash in a module URL, so the id is
 *   a SHA-256 of the source text of every file under `src/sim/` and `data/`,
 *   which is everything the simulation imports (pinned by
 *   `test/ui/saveCheckpoints.test.ts`). It costs one request per file, once per
 *   page load, and editing a rule makes the next load miss.
 *
 * Any failure answers `null`, which turns checkpoints off for the page.
 */
async function computeBuildId(): Promise<string | null> {
  if (import.meta.env.PROD) {
    const { default: workerUrl } = await import('./game.worker.ts?worker&url');
    return `build:${workerUrl}`;
  }
  const sources = import.meta.glob(['../sim/**/*.ts', '../../data/**/*.json'], {
    query: '?raw',
    import: 'default',
  });
  const names = Object.keys(sources).sort();
  const texts = await Promise.all(names.map((name) => sources[name]!() as Promise<string>));
  return `dev:${await sha256Hex(names.map((name, i) => `${name}\n${texts[i]}`).join('\u0000'))}`;
}

let buildIdOnce: Promise<string | null> | null = null;

/** The build id, computed once per page. */
export function currentBuildId(): Promise<string | null> {
  buildIdOnce ??= computeBuildId().catch((error: unknown) => {
    console.warn('[magister-ludi] load checkpoints are off: this build cannot name itself', error);
    return null;
  });
  return buildIdOnce;
}

// --- writing --------------------------------------------------------------------

/**
 * Stores the game's current state as the rolling checkpoint.
 *
 * The state is cloned and the log length read **synchronously, before the
 * first await**, so the pair is taken at one instant: nothing can dispatch a
 * command between them. Everything after that (the digest, the store write)
 * works on the copy. Never throws; a checkpoint that cannot be written is
 * simply not there next time.
 */
export async function writeCheckpoint(checkpoints: SaveCheckpoints, game: Game): Promise<boolean> {
  let state: GameState;
  const logLength = game.log.length;
  const { config, log } = game;
  try {
    state = structuredClone(game.state);
  } catch (error) {
    console.warn('[magister-ludi] could not copy the state for a load checkpoint', error);
    return false;
  }
  try {
    const buildId = await checkpoints.buildId();
    if (buildId === null) return false;
    const digest = await logDigest(config, log, logLength);
    await checkpoints.store.write({
      format: CHECKPOINT_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      buildId,
      logLength,
      digest,
      state,
    });
    return true;
  } catch (error) {
    console.warn('[magister-ludi] could not store a load checkpoint', error);
    return false;
  }
}

// --- reading --------------------------------------------------------------------

/**
 * The stored checkpoint, if it provably belongs to this config and log.
 *
 * `null` for every kind of miss, so the caller's only branch is "start from
 * here" or "replay from the start". The returned state is the store's own
 * fresh copy and the caller may mutate it.
 */
export async function findCheckpoint(
  checkpoints: SaveCheckpoints | null,
  config: GameConfig,
  log: readonly Command[],
): Promise<CheckpointHit | null> {
  if (checkpoints === null) return null;
  try {
    const buildId = await checkpoints.buildId();
    if (buildId === null) return null;
    const record = (await checkpoints.store.read()) as Partial<CheckpointRecord> | undefined;
    if (typeof record !== 'object' || record === null) return null;
    if (record.format !== CHECKPOINT_FORMAT) return null;
    if (record.schemaVersion !== SCHEMA_VERSION) return null;
    if (record.buildId !== buildId) return null;
    const length = record.logLength;
    if (typeof length !== 'number' || !Number.isInteger(length)) return null;
    if (length < 0 || length > log.length) return null;
    const state = record.state;
    if (typeof state !== 'object' || state === null) return null;
    if (state.schemaVersion !== SCHEMA_VERSION) return null;
    if (record.digest !== (await logDigest(config, log, length))) return null;
    return { state, from: length };
  } catch (error) {
    console.warn('[magister-ludi] load checkpoint unreadable; replaying the whole log', error);
    return null;
  }
}

// --- stores -----------------------------------------------------------------------

/**
 * A store in a variable, for tests. It copies on the way in and on the way
 * out, as IndexedDB does, so a test cannot pass by sharing an object.
 */
export function memoryCheckpointStore(): CheckpointStore & { record: unknown } {
  const store = {
    record: undefined as unknown,
    read: async (): Promise<unknown> => structuredClone(store.record),
    write: async (record: CheckpointRecord): Promise<void> => {
      store.record = structuredClone(record);
    },
  };
  return store;
}

const DB_NAME = 'magisterludi-checkpoints';
const DB_STORE = 'checkpoints';
const ROLLING_KEY = 'rolling';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB, or `null` where there is none (node, some private windows). */
export function indexedDbCheckpointStore(): CheckpointStore | null {
  if (typeof indexedDB === 'undefined') return null;
  let db: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => {
    db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('checkpoint database blocked'));
    }).catch((error: unknown) => {
      db = null;
      throw error;
    });
    return db;
  };
  return {
    async read() {
      const tx = (await open()).transaction(DB_STORE, 'readonly');
      return request(tx.objectStore(DB_STORE).get(ROLLING_KEY));
    },
    async write(record) {
      const tx = (await open()).transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(record, ROLLING_KEY);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
  };
}

let browserOnce: SaveCheckpoints | null | undefined;

/** The page's checkpoints: IndexedDB and the build id, or `null` where there is no IndexedDB. */
export function browserCheckpoints(): SaveCheckpoints | null {
  if (browserOnce === undefined) {
    const store = indexedDbCheckpointStore();
    browserOnce = store === null ? null : { store, buildId: currentBuildId };
  }
  return browserOnce;
}
