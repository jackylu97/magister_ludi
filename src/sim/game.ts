/**
 * The session wrapper: a config, the live state it produced, and the log of
 * every command that has been applied to it.
 *
 * Saves store `{ schemaVersion, config, log }` — **not** the state. The state is
 * derived data: `replay(config, log)` rebuilds it exactly, because `newGame` is
 * a pure function of the config and every mutation goes through the reducer.
 * Two things fall out of that:
 *
 *   - Saves are tiny and version-tolerant. A 180x112 map is megabytes of tiles;
 *     the config and a few thousand `{type}` objects are kilobytes, and they
 *     stay readable when the tile format changes underneath them.
 *   - It keeps replay honest. If a rule ever depended on something outside the
 *     state — the clock, `Math.random`, iteration order of a Map — loading a
 *     save would visibly diverge. The save format is the same log a network
 *     peer would receive, so the bug surfaces in single player first.
 *
 * One log, many players
 * ---------------------
 * Turns are simultaneous, so the log is not a rotation — it is the interleaving
 * of every seat's commands in the order they were applied, each stamped with its
 * author (see `PlayerCommand` in `commands.ts`). That is already the shape a
 * networked game needs: the server's ordering of arriving commands *is* the log,
 * and replaying it reproduces every contested tile the same way round.
 *
 * The price is that loading replays the whole game. That is fine at this scale
 * (map generation dominates, and it happens once), and `snapshotState` /
 * `restoreState` are here for the cases that genuinely want a full-state dump:
 * debugging, test fixtures, and eventually mid-game AI experiments.
 */

import { type Command, type CommandResult, applyCommand } from './commands';
import { type GameConfig, type GameState, SCHEMA_VERSION, newGame, normalizeConfig } from './state';

export interface Game {
  /** Normalised (see `normalizeConfig`); owned by the game, never aliased. */
  config: GameConfig;
  /** Live state. Mutated in place by `dispatch`. */
  state: GameState;
  /** Every command that succeeded, in order. The save file. */
  log: Command[];
}

/** On-disk / on-wire shape produced by `saveGame`. */
export interface SaveFile {
  schemaVersion: number;
  config: GameConfig;
  log: Command[];
}

/** Deep copy through JSON. Also asserts, by construction, that the value is serializable. */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// --- session ----------------------------------------------------------------

export function createGame(config: GameConfig): Game {
  const normalized = normalizeConfig(config);
  return {
    config: normalized,
    state: newGame(normalized),
    log: [],
  };
}

/**
 * Applies a command and, only if it succeeded, appends it to the log. A
 * rejected command leaves both the state and the log untouched, so the log is
 * always a script that reproduces the current state exactly.
 *
 * The command is copied on the way in: the log is the save file, and a caller
 * that reuses and mutates one command object must not rewrite history.
 */
export function dispatch(game: Game, command: Command): CommandResult {
  const result = applyCommand(game.state, command);
  if (result.ok) game.log.push(cloneJson(command));
  return result;
}

/** Which command a replay stopped on, and what the reducer said about it. */
export interface ReplayFailure {
  /** Index into the log. The one number a corrupt-save report is worth having. */
  index: number;
  /** The command's `type`, as read off the log — untrusted, for the console only. */
  type: string;
  /** The reducer's own refusal. */
  error: string;
}

export type ReplayResult =
  | { ok: true; state: GameState }
  | { ok: false; failure: ReplayFailure };

/**
 * Rebuilds a state from scratch, reporting a rejected command rather than
 * throwing on it.
 *
 * This is the loop; `replay` is its throwing façade. The split exists because a
 * *file* the player chose is a different thing from a log the program produced:
 * a save picked off a disk may be from another build, hand-edited, or truncated,
 * and the loader owes the player a sentence and the console an index rather than
 * an exception it would have to read a message out of. Same walk either way, so
 * there is one implementation of "apply the log in order and stop at the first
 * refusal".
 *
 * A bad *config* still throws — from `newGame`, which validates it — because
 * that is not a command the log got wrong, it is a game that cannot be built.
 */
export function tryReplay(config: GameConfig, log: readonly Command[]): ReplayResult {
  const state = newGame(config);
  for (let i = 0; i < log.length; i++) {
    const command = log[i]!;
    const result = applyCommand(state, command);
    if (!result.ok) {
      return {
        ok: false,
        failure: { index: i, type: String(command.type), error: result.error },
      };
    }
  }
  return { ok: true, state };
}

/**
 * Rebuilds a state from scratch. Throws if a logged command is rejected, which
 * can only mean the log and the rules have drifted apart — silently skipping it
 * would produce a state that looks fine and is wrong.
 */
export function replay(config: GameConfig, log: readonly Command[]): GameState {
  const result = tryReplay(config, log);
  if (!result.ok) {
    const { index, type, error } = result.failure;
    throw new Error(`Replay failed at command ${index} (${type}): ${error}`);
  }
  return result.state;
}

// --- saving -----------------------------------------------------------------

export function saveGame(game: Game): string {
  const save: SaveFile = {
    schemaVersion: SCHEMA_VERSION,
    config: game.config,
    log: game.log,
  };
  return JSON.stringify(save);
}

/** Parses a save file and replays it into a live game. */
export function loadGame(json: string): Game {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Save file is not an object');
  }
  const save = parsed as Partial<SaveFile>;
  if (save.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Save file schema ${String(save.schemaVersion)} is not supported ` +
        `(expected ${SCHEMA_VERSION})`,
    );
  }
  if (typeof save.config !== 'object' || save.config === null) {
    throw new Error('Save file has no config');
  }
  if (!Array.isArray(save.log)) throw new Error('Save file has no command log');

  const config = normalizeConfig(save.config);
  const log = save.log as Command[];
  return { config, state: replay(config, log), log };
}

// --- full-state snapshots ---------------------------------------------------

/**
 * The entire state as JSON, map included. Not the save format (see the module
 * docblock) — this exists for debugging, test fixtures and diffing two states.
 */
export function snapshotState(state: GameState): string {
  return JSON.stringify(state);
}

/** Inverse of `snapshotState`. The state is plain data, so parsing is enough. */
export function restoreState(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Snapshot is not an object');
  }
  const state = parsed as Partial<GameState>;
  if (state.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Snapshot schema ${String(state.schemaVersion)} is not supported ` +
        `(expected ${SCHEMA_VERSION})`,
    );
  }
  return state as GameState;
}
