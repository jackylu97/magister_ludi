/**
 * Saving and loading a game: the payload, the slots it lives in, and the one
 * gate every file has to come through to become the game on screen.
 *
 * There is no DOM in this file and no `localStorage` either. Storage arrives as
 * a `SaveStorage` — the four methods of the platform's own `Storage`, which the
 * real `localStorage` satisfies as-is and a `Map` fakes in three lines. That is
 * what lets the interesting half of save/load (the validation, the slot list,
 * the metadata) be tested in the node environment the rest of the suite runs in.
 *
 * The payload
 * -----------
 * `{ formatVersion, schemaVersion, savedAt, name, turn, config, log }` — the
 * sim's own `{config, log}` save (see `sim/game.ts`) with a shelf label wrapped
 * round it. The label is what a slot list needs so that showing the player their
 * saves does not mean replaying five games to find out what turn they are on.
 *
 * **The label is display, never truth.** `turn`, `name` and `savedAt` are read
 * from the file for the list and nothing else; the game that comes back is the
 * one `{config, log}` replays to, and if a hand-edited file claims turn 400 over
 * a three-command log, it loads as turn 4 and the list is simply wrong about it
 * until it is saved again. Nothing downstream may branch on the label.
 *
 * Two versions, both refused on mismatch
 * --------------------------------------
 * `formatVersion` is this envelope's; `schemaVersion` is the simulation's
 * (`SCHEMA_VERSION` in `sim/state.ts`), which moves whenever a rule changes what
 * a log means. Either one differing refuses the file outright. This is
 * pre-release: there are no migrations and the refusal says so, because a save
 * silently half-understood is worse than a save politely declined.
 *
 * Never partially loaded
 * ----------------------
 * `loadSave` builds an entire second game off to one side and hands it back only
 * once the last command in the log has been accepted by the real reducer. A
 * refusal anywhere — bad JSON, wrong version, a config the sim will not build, a
 * command the rules no longer take — returns an error and *no game*, so the
 * caller's live session is untouched by a file that turned out to be junk. There
 * is no path here that mutates a running game.
 */

import type { Command } from '../sim/commands';
import { type Game, tryReplay } from '../sim/game';
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  hasEndedTurn,
  normalizeConfig,
  realPlayers,
} from '../sim/state';

/**
 * This envelope's version. Bumped when the *wrapper* changes shape — a new
 * field, a renamed one — independently of the simulation's schema, which moves
 * for its own reasons and far more often.
 */
export const SAVE_FORMAT_VERSION = 1;

/** Every key this module owns starts here. Namespaced, so nothing else collides. */
export const SAVE_KEY_PREFIX = 'magisterludi:save:';

/** The rolling slot the end of every turn overwrites. */
export const AUTOSAVE_SLOT = 'autosave';

/** The slot the menu's plain "Save" writes to. */
export const QUICKSAVE_SLOT = 'quicksave';

/**
 * The cap on one serialized payload, in characters.
 *
 * `localStorage` is a handful of megabytes for the whole origin and this module
 * keeps several slots in it, so a single file is not allowed to eat the shelf.
 * A log is a few thousand small objects even in a long game — the map, which is
 * the big thing, is nowhere in the file — so this is a guard against a runaway,
 * not a budget anybody plays into.
 */
export const MAX_SAVE_CHARS = 2 * 1024 * 1024;

/**
 * The half of the platform's `Storage` this module uses.
 *
 * Structurally satisfied by the real `localStorage`, so `main.ts` passes it
 * straight through and the tests pass a `Map`. Declared rather than imported
 * because the point is that nothing here needs a browser.
 */
export interface SaveStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * A shelf that lives for as long as the tab does.
 *
 * What a browser with no usable `localStorage` gets — a private window, a
 * blocked origin — so that nothing downstream has to branch on whether storage
 * exists. Saving still works, quick-loading still works, and only *persistence*
 * is missing, which is the one part of it that cannot be faked. It is also what
 * the tests use, which is the point: if the fallback were special-cased instead
 * of being an ordinary `SaveStorage`, the untested path would be the one real
 * players in private windows are on.
 */
export function memorySaveStorage(): SaveStorage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** The on-disk shape. See the module docblock on which fields are trusted. */
export interface SavePayload {
  formatVersion: number;
  schemaVersion: number;
  /** Epoch milliseconds, from the caller's clock — the sim never reads a clock. */
  savedAt: number;
  name: string;
  turn: number;
  config: GameConfig;
  log: Command[];
}

export type SlotKind = 'auto' | 'quick' | 'named';

/** One row of the load list: the shelf label, plus which slot it came off. */
export interface SaveSlot {
  /** The key suffix under `SAVE_KEY_PREFIX`. Unique per slot. */
  id: string;
  kind: SlotKind;
  name: string;
  turn: number;
  savedAt: number;
  seed: number;
  sizeName: string;
  /** How many seats the game was set up with. Solo games say 1. */
  seats: number;
}

// --- keys and names ---------------------------------------------------------

export function storageKey(slotId: string): string {
  return SAVE_KEY_PREFIX + slotId;
}

/**
 * A name reduced to something safe in a key and in a filename.
 *
 * Lossy on purpose: two saves called "Rome" and "rome!" are one slot, which is
 * the behaviour a player naming a save twice expects (the second overwrites the
 * first, after being asked). Empty input answers `untitled` rather than an empty
 * key.
 */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug === '' ? 'untitled' : slug;
}

/** The slot a named save lands in. Prefixed so no name can claim the two fixed slots. */
export function namedSlotId(name: string): string {
  return `named:${slugify(name)}`;
}

function slotKind(slotId: string): SlotKind {
  if (slotId === AUTOSAVE_SLOT) return 'auto';
  if (slotId === QUICKSAVE_SLOT) return 'quick';
  return 'named';
}

/**
 * The line under a slot's name in the load list: what game this is, in the
 * order a player scanning a list of six saves asks it in — how far along, then
 * which world.
 *
 * Every number is from the shelf label, so this is display and only display (see
 * the module docblock). It is here rather than in the panel because it is pure
 * text over a plain object, and the panel around it is not testable in this
 * suite's environment.
 */
export function slotSummary(slot: SaveSlot): string {
  const seats = slot.seats === 1 ? 'solo' : `${slot.seats} seats`;
  return `Turn ${slot.turn} · ${slot.sizeName} · ${seats} · seed ${slot.seed}`;
}

/** `rome-turn-42.json` — the name the browser's download picker opens with. */
export function exportFilename(payload: SavePayload): string {
  return `${slugify(payload.name)}-turn-${payload.turn}.json`;
}

// --- writing ----------------------------------------------------------------

/**
 * Wraps a live game as a payload. Derived entirely from the game plus the two
 * things a game cannot know about itself — what the player called it, and what
 * time it is.
 */
export function makeSavePayload(game: Game, name: string, savedAt: number): SavePayload {
  return {
    formatVersion: SAVE_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    savedAt,
    name,
    turn: game.state.turn,
    config: game.config,
    log: game.log,
  };
}

export type WriteResult = { ok: true; bytes: number } | { ok: false; error: string };

/**
 * Puts a payload in a slot, or says why it could not.
 *
 * Every way this fails is a way it fails *in the browser the player is actually
 * using* — a full quota, a private window that refuses to persist anything, a
 * game long enough to trip the cap — and none of them is a reason to take the
 * game down. So it returns a sentence instead of throwing, and the caller
 * decides how loudly to say it (the autosaver says it once; a menu press says it
 * every time, because the player pressed the button).
 */
export function writeSave(
  storage: SaveStorage,
  slotId: string,
  payload: SavePayload,
): WriteResult {
  let json: string;
  try {
    json = JSON.stringify(payload);
  } catch {
    return { ok: false, error: 'This game could not be turned into a save file.' };
  }
  if (json.length > MAX_SAVE_CHARS) {
    return {
      ok: false,
      error: `This game is too large to save in the browser (${Math.round(json.length / 1024)} kB).`,
    };
  }
  try {
    storage.setItem(storageKey(slotId), json);
  } catch {
    // Quota, or a browser that refuses storage outright. Both arrive as a throw
    // and neither is distinguishable from the other portably, so one sentence
    // covers them and it names the two things a player can do about it.
    return {
      ok: false,
      error: 'The browser would not store this save — its storage may be full or blocked.',
    };
  }
  return { ok: true, bytes: json.length };
}

export function deleteSave(storage: SaveStorage, slotId: string): void {
  storage.removeItem(storageKey(slotId));
}

// --- reading the shelf ------------------------------------------------------

/**
 * Reads a slot's label without replaying it.
 *
 * Returns `null` for anything it cannot describe — absent, unparseable, or from
 * another version — because this feeds a *list*, and a list is not the place to
 * argue with a file. The argument happens in `loadSave` when the player picks
 * one, which is where a sentence about versions is worth reading. A slot too
 * broken to describe is simply not offered.
 */
export function readSlot(storage: SaveStorage, slotId: string): SaveSlot | null {
  const json = storage.getItem(storageKey(slotId));
  if (json === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const payload = parsed as Partial<SavePayload>;
  if (payload.formatVersion !== SAVE_FORMAT_VERSION) return null;
  if (payload.schemaVersion !== SCHEMA_VERSION) return null;
  const config = payload.config;
  if (typeof config !== 'object' || config === null) return null;
  return {
    id: slotId,
    kind: slotKind(slotId),
    name: typeof payload.name === 'string' && payload.name !== '' ? payload.name : slotId,
    turn: typeof payload.turn === 'number' ? payload.turn : 0,
    savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : 0,
    seed: typeof config.seed === 'number' ? config.seed : 0,
    sizeName: typeof config.sizeName === 'string' ? config.sizeName : '—',
    seats: Array.isArray(config.players) ? config.players.length : 0,
  };
}

/**
 * Every slot on the shelf, newest first.
 *
 * The store is iterated by index rather than by any remembered index of our own,
 * so a save written by another tab — or left behind by a build that has since
 * been reloaded — is found rather than orphaned. Ties on the clock break by slot
 * id, so the list is stable rather than dependent on the store's own order.
 */
export function listSaves(storage: SaveStorage): SaveSlot[] {
  const ids: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === null || !key.startsWith(SAVE_KEY_PREFIX)) continue;
    ids.push(key.slice(SAVE_KEY_PREFIX.length));
  }
  const slots: SaveSlot[] = [];
  for (const id of ids) {
    const slot = readSlot(storage, id);
    if (slot) slots.push(slot);
  }
  slots.sort((a, b) => (b.savedAt - a.savedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return slots;
}

/** What "Continue" resumes: the most recent save of any kind, or `null`. */
export function newestSlot(storage: SaveStorage): SaveSlot | null {
  return listSaves(storage)[0] ?? null;
}

// --- loading ----------------------------------------------------------------

export type LoadResult =
  | { ok: true; game: Game; payload: SavePayload }
  | { ok: false; error: string; detail?: string };

/** What every version refusal says after the numbers. No migrations, pre-release. */
const NO_MIGRATIONS =
  'This is a pre-release build: saves are not migrated between versions.';

/**
 * The gate. Text in, a fully replayed game out — or a sentence and nothing.
 *
 * The order of the checks is the order in which a file stops being trustworthy,
 * and each one is cheaper than the one after it:
 *
 *   1. **It parses.** A file picker hands over whatever the player picked.
 *   2. **The versions match**, both of them. Refused with the numbers in the
 *      sentence, because "from an older version" is answerable ("keep the tab
 *      open until you have finished the game") and "corrupt" is not.
 *   3. **The config builds.** `newGame` inside `tryReplay` runs the simulation's
 *      own `validateConfig` — the size key, the seat count, the mapgen override
 *      sheet — so a bad setup is caught by the one implementation that decides
 *      what a valid setup is, and never by a copy of it living here.
 *   4. **The log replays**, command by command, through the real reducer. This
 *      is the whole security of the format: a save is a *script*, and a script
 *      that the rules will not run is not a game. The failing index goes to the
 *      console, where a developer can find it, and the player gets a sentence.
 *
 * Only after (4) does a `Game` exist to return. See the module docblock.
 */
export function loadSave(json: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'That file is not a save — it is not even JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'That file is not a save.' };
  }
  const payload = parsed as Partial<SavePayload>;

  if (payload.formatVersion !== SAVE_FORMAT_VERSION) {
    return {
      ok: false,
      error:
        `That save is in format ${String(payload.formatVersion)}; this build reads ` +
        `format ${SAVE_FORMAT_VERSION}. ${NO_MIGRATIONS}`,
    };
  }
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        `That save is from rules version ${String(payload.schemaVersion)}; this build ` +
        `plays version ${SCHEMA_VERSION}. ${NO_MIGRATIONS}`,
    };
  }
  if (typeof payload.config !== 'object' || payload.config === null) {
    return { ok: false, error: 'That save has no game setup in it.' };
  }
  if (!Array.isArray(payload.log)) {
    return { ok: false, error: 'That save has no command log in it.' };
  }

  const config = normalizeConfig(payload.config);
  const log = payload.log as Command[];

  let replayed;
  try {
    replayed = tryReplay(config, log);
  } catch (error) {
    // A config the simulation will not build: an unknown map size, too many
    // seats, a mapgen override that names nothing. The sim's own sentence is
    // better than any paraphrase.
    return {
      ok: false,
      error: `That save's setup is not one this build can play: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  if (!replayed.ok) {
    const { index, type, error } = replayed.failure;
    return {
      ok: false,
      error: 'That save is corrupt or from an incompatible build.',
      detail: `Replay stopped at command ${index} (${type}): ${error}`,
    };
  }

  const trusted: SavePayload = {
    formatVersion: SAVE_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : 0,
    name: typeof payload.name === 'string' && payload.name !== '' ? payload.name : 'Saved game',
    // Derived from the replay, not read off the file: the label was never truth
    // (see the module docblock) and this is the one place the difference could
    // reach the game rather than the list.
    turn: replayed.state.turn,
    config,
    log,
  };
  return { ok: true, game: { config, state: replayed.state, log }, payload: trusted };
}

/** Reads a slot and loads it. `null` when the slot is simply not there. */
export function loadSlot(storage: SaveStorage, slotId: string): LoadResult | null {
  const json = storage.getItem(storageKey(slotId));
  if (json === null) return null;
  return loadSave(json);
}

// --- which seat a loaded game sits down at ----------------------------------

/**
 * The seat a loaded game resumes at: **the first seat that has not yet ended the
 * current turn**, and seat 0 when they all have.
 *
 * A save has no record of who was looking at the screen — `localPlayerId` is an
 * interface fact and the simulation has never heard of it (CLAUDE.md, hard rule
 * 3) — so the seat has to be *derived*, and this is the simplest rule that is
 * honest about both games we can be resuming:
 *
 *   · A solo game has one real seat, which has not ended its turn in any state
 *     a save can be taken from (the flags clear the instant the turn resolves),
 *     so this answers 0 and single player never notices there was a question.
 *   · The multi-seat dev harness is played by one tester moving down the table,
 *     and the first unfinished seat is exactly where that tester was — it is the
 *     same seat `endTurn` would have handed them next.
 *
 * `realPlayers` is what it asks, not `state.players`: the wild's seat and an
 * eliminated one are auto-ended every turn (`state.ts`), so they can never be
 * "first unfinished", but a table where everybody real has ended must not fall
 * through to sitting the player down as the barbarians.
 */
export function resumeSeat(state: GameState): number {
  for (const player of realPlayers(state)) {
    if (!hasEndedTurn(state, player.id)) return player.id;
  }
  return realPlayers(state)[0]?.id ?? 0;
}

// --- the autosave -----------------------------------------------------------

export interface Autosaver {
  /** Writes the rolling slot, unless this turn has already been written. */
  save(game: Game, now: number): void;
  /** Forgets which turn was last written. Called when the game is replaced. */
  reset(): void;
}

export interface AutosaverOptions {
  storage: SaveStorage;
  /** Said once per session, however many times the write fails after that. */
  onWarn: (message: string) => void;
  /** The name the rolling slot wears in the list. */
  name?: string;
}

/**
 * The rolling autosave: one slot, overwritten after every turn resolution.
 *
 * Two guards, and both are about a browser rather than about the game. The
 * *turn* guard is the debounce — the hook it hangs off fires once per resolved
 * turn, but a caller is not required to be careful and rewriting the same turn's
 * save is pure cost. The *failure* guard is the one that matters: a full quota
 * fails on every turn for the rest of the session, and a warning that reappeared
 * every turn would be the crash loop the storage error was not.
 */
export function createAutosaver(options: AutosaverOptions): Autosaver {
  const { storage, onWarn, name = 'Autosave' } = options;
  let lastTurn: number | null = null;
  let warned = false;

  return {
    save(game, now) {
      if (lastTurn === game.state.turn) return;
      lastTurn = game.state.turn;
      const result = writeSave(storage, AUTOSAVE_SLOT, makeSavePayload(game, name, now));
      if (result.ok || warned) return;
      warned = true;
      onWarn(`Autosave failed. ${result.error}`);
    },
    reset() {
      lastTurn = null;
    },
  };
}
