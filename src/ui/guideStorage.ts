/**
 * The guide's memory: storage version 2, kept in `localStorage` and nowhere
 * else (`docs/plans/tutorial.md` §6, batch T1).
 *
 * What it holds
 * -------------
 * - **The preferences**: the mode the landing's question chose, whether it has
 *   been asked, and the three switches.
 * - **The lessons seen or completed**, across every game. A lesson is
 *   *completed* when its deed is done (or, for a lesson with no deed, when it is
 *   read). It is *seen* when the player pressed "Got it" before doing its deed,
 *   or when its moment passed while it was on screen. Either one keeps a
 *   first-contact lesson from appearing again on its own; the lesson library
 *   can still reopen it.
 * - **Per-game progress, under an interface run key.** A run is one game as
 *   this browser played it. Its record says whether the walkthrough is running
 *   in that game. The key is the interface's own (`newRunKey`), never the seed:
 *   two games on the same seed are two runs. The save stays `{config, log}`;
 *   the link from a save slot to its run key is batch T6's sidecar.
 *
 * Why the walkthrough's progress is mostly global
 * -----------------------------------------------
 * A walkthrough lesson completed in one game is not taught again in the next
 * one. Version 1 restarted its sequence for every new game (the user,
 * 2026-08-30), because its progress was a step number that made no sense on a
 * new board. Version 2 has no step numbers: each lesson waits for facts that
 * make it sensible ("found your capital" waits for a settler, "choose research"
 * for a town), so skipping what the player already learned cannot put a card on
 * a board it does not fit. The run record still decides whether the
 * walkthrough runs at all in a given game: it starts for a new game when the
 * walkthrough switch is on, and never starts by itself in a loaded game that
 * this browser has no record of, so an established empire is never asked to
 * found its first town. Skip is recorded on the run too, never on the switch,
 * so it lasts one game: the next new game's run starts the walkthrough again,
 * from its first lesson not yet completed (the user's ruling of 2026-10-16).
 *
 * Failure and versions
 * --------------------
 * - Storage arrives as an interface with two methods (`GuideStorage`, the same
 *   shape as `TutorialStorage` and `SaveStorage`), so `window.localStorage`, a
 *   private window and the tests all take the same path.
 * - A shelf that throws, a missing key, a truncated write or a value of an
 *   unknown version all read as fresh memory. A shelf that refuses a write
 *   costs the memory between sessions and nothing else: `createGuideStore`
 *   keeps the current memory in hand, so the guide runs on for this session.
 * - **Version 1 is migrated, not deleted.** When there is no version 2 memory,
 *   the version 1 memory (`tutorial.ts`, key `magisterludi:tutorial:v1`) is read
 *   and translated (`migrateTutorialV1`). Version 1 stays on the shelf, since
 *   `tutorial.ts` still runs until batch T6 replaces it; the first write of
 *   version 2 makes the translation permanent.
 */

import {
  FRESH_PREFERENCES,
  GUIDE_MODES,
  MODE_PLANS,
  answerGuideQuestion,
  type GuideMode,
  type GuidePreferences,
  type GuideSwitch,
} from './guideModel';
import type { GuideLessonId } from './guideLessons';

// --- the shape ---------------------------------------------------------------

/** The half of the platform's `Storage` the guide uses. `window.localStorage` satisfies it as it is. */
export interface GuideStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The key version 2 lives under: version 1's key with the next number. */
export const GUIDE_KEY = 'magisterludi:tutorial:v2';

/**
 * Version 1's key, copied from `tutorial.ts` rather than imported, so this
 * module keeps working when that file is retired. The test pins that the two
 * agree.
 */
export const TUTORIAL_V1_KEY = 'magisterludi:tutorial:v1';

/**
 * Whether the walkthrough runs in a game:
 * - `running`: it runs while the walkthrough switch is on;
 * - `skipped`: the player skipped it in this game. This game only: a new game
 *   gets a run of its own, which starts `running` while the switch is on;
 * - `none`: the game began without it (the switch was off, or this browser
 *   did not know the loaded game). "Replay the walkthrough" in the lesson
 *   library starts it (`restartWalkthrough`).
 */
export type RunWalkthrough = 'running' | 'skipped' | 'none';

export interface RunProgress {
  readonly key: string;
  readonly walkthrough: RunWalkthrough;
}

export interface GuideMemory {
  readonly version: 2;
  readonly preferences: GuidePreferences;
  /** Lessons that have been on screen and put away without their deed. */
  readonly seen: readonly string[];
  /** Lessons whose deed is done, or that were read to the end. */
  readonly completed: readonly string[];
  /** Runs, oldest first. Touching a run moves it to the end; the oldest are dropped past `MAX_RUNS`. */
  readonly runs: readonly RunProgress[];
  /** How many runs this browser has started. `newRunKey` counts from it. */
  readonly runsStarted: number;
}

/** What a browser that has never been here gets. */
export const FRESH_GUIDE_MEMORY: GuideMemory = {
  version: 2,
  preferences: FRESH_PREFERENCES,
  seen: [],
  completed: [],
  runs: [],
  runsStarted: 0,
};

/** How many runs are remembered. A run is a few bytes; this bounds the shelf over years of play. */
export const MAX_RUNS = 20;

// --- changing it -------------------------------------------------------------
//
// Every function below returns the same object when nothing changes, so a
// caller can compare by identity and skip the write.

export function withPreferences(memory: GuideMemory, preferences: GuidePreferences): GuideMemory {
  return memory.preferences === preferences ? memory : { ...memory, preferences };
}

export function markSeen(memory: GuideMemory, ids: readonly string[]): GuideMemory {
  const seen = addAll(memory.seen, ids);
  return seen === memory.seen ? memory : { ...memory, seen };
}

export function markCompleted(memory: GuideMemory, ids: readonly string[]): GuideMemory {
  const completed = addAll(memory.completed, ids);
  return completed === memory.completed ? memory : { ...memory, completed };
}

/** Takes lessons off both lists, so they can be taught again. */
export function forgetLessons(memory: GuideMemory, ids: readonly string[]): GuideMemory {
  const seen = memory.seen.filter((id) => !ids.includes(id));
  const completed = memory.completed.filter((id) => !ids.includes(id));
  if (seen.length === memory.seen.length && completed.length === memory.completed.length) {
    return memory;
  }
  return { ...memory, seen, completed };
}

/**
 * "Reset lessons" in the options (§5.6): every lesson can be taught again, and
 * the preferences stay as they are.
 *
 * The runs go too, because they are lesson progress. The game in progress then
 * has no record, so its walkthrough does not restart halfway through an
 * established empire; first-contact lessons come back at their next live
 * contact, and the next new game starts the walkthrough from the top.
 */
export function resetLessons(memory: GuideMemory): GuideMemory {
  if (memory.seen.length === 0 && memory.completed.length === 0 && memory.runs.length === 0) {
    return memory;
  }
  return { ...memory, seen: [], completed: [], runs: [] };
}

export function runOf(memory: GuideMemory, key: string | null): RunProgress | undefined {
  if (key === null) return undefined;
  return memory.runs.find((run) => run.key === key);
}

/**
 * A key for the next new game: unique in this browser, made from a counter
 * rather than a clock or a random draw, so it is the same in a test as in play.
 */
export function newRunKey(memory: GuideMemory): string {
  return `run-${memory.runsStarted + 1}`;
}

/** A new game's record. A key that is already known starts over. */
export function startRun(memory: GuideMemory, key: string, walkthrough: RunWalkthrough): GuideMemory {
  return {
    ...memory,
    runs: newestLast(memory.runs, { key, walkthrough }),
    runsStarted: memory.runsStarted + 1,
  };
}

/**
 * A loaded game's record: the one this browser kept for the key, or a new one
 * with no walkthrough, since a loaded game this browser has no record of is
 * never walked through from the top.
 */
export function resumeRun(memory: GuideMemory, key: string): GuideMemory {
  const known = runOf(memory, key);
  if (known !== undefined && memory.runs[memory.runs.length - 1] === known) return memory;
  return { ...memory, runs: newestLast(memory.runs, known ?? { key, walkthrough: 'none' }) };
}

/** Changes a known run's walkthrough state. An unknown key changes nothing. */
export function setRunWalkthrough(
  memory: GuideMemory,
  key: string,
  walkthrough: RunWalkthrough,
): GuideMemory {
  const known = runOf(memory, key);
  if (known === undefined || known.walkthrough === walkthrough) return memory;
  return { ...memory, runs: memory.runs.map((run) => (run.key === key ? { key, walkthrough } : run)) };
}

/** The run moved (or added) to the end, and the oldest dropped past `MAX_RUNS`. */
function newestLast(runs: readonly RunProgress[], run: RunProgress): RunProgress[] {
  const others = runs.filter((other) => other.key !== run.key);
  return [...others, run].slice(-MAX_RUNS);
}

function addAll(list: readonly string[], ids: readonly string[]): readonly string[] {
  const missing = ids.filter((id, index) => !list.includes(id) && ids.indexOf(id) === index);
  return missing.length === 0 ? list : [...list, ...missing];
}

// --- reading and writing -----------------------------------------------------

/**
 * Reads the memory, tolerating everything a shelf can do to it: version 2 if
 * it is there and readable, otherwise version 1 translated, otherwise fresh.
 * Never throws, because the worst a broken guide memory may cost is some
 * lessons, never the page.
 */
export function readGuideMemory(storage: GuideStorage): GuideMemory {
  const current = readKey(storage, GUIDE_KEY);
  if (current === undefined) return FRESH_GUIDE_MEMORY;
  if (current !== null) {
    const parsed = parseGuideMemory(current);
    if (parsed !== null) return parsed;
  }
  const older = readKey(storage, TUTORIAL_V1_KEY);
  if (older === undefined || older === null) return FRESH_GUIDE_MEMORY;
  return migrateTutorialV1(older) ?? FRESH_GUIDE_MEMORY;
}

/**
 * Writes the memory. Returns false when the shelf refused it (a private
 * window, a blocked origin, a full shelf); the caller keeps running on the
 * memory it holds.
 */
export function writeGuideMemory(storage: GuideStorage, memory: GuideMemory): boolean {
  try {
    storage.setItem(GUIDE_KEY, JSON.stringify(memory));
    return true;
  } catch {
    return false;
  }
}

/** The memory the guide works from, and the one place it is written. */
export interface GuideStore {
  /** The memory as this session knows it. */
  read(): GuideMemory;
  /**
   * Replaces it. The new memory is kept in hand whether or not the shelf takes
   * it, which is the fallback: a storage failure loses the memory between
   * sessions, not within one. Writing the object already held does nothing.
   */
  write(memory: GuideMemory): void;
}

export function createGuideStore(storage: GuideStorage): GuideStore {
  let current = readGuideMemory(storage);
  return {
    read: () => current,
    write(memory) {
      if (memory === current) return;
      current = memory;
      writeGuideMemory(storage, memory);
    },
  };
}

/** The stored text, `null` when the key is absent, `undefined` when the shelf threw. */
function readKey(storage: GuideStorage, key: string): string | null | undefined {
  try {
    return storage.getItem(key);
  } catch {
    return undefined;
  }
}

/**
 * Version 2 from its stored text, or `null` when it is not version 2 at all.
 *
 * Field by field, so one bad field costs that field rather than the whole
 * memory: an unknown mode reads as the newcomer's, a missing switch takes the
 * mode's default, and ill-formed list entries are dropped.
 */
export function parseGuideMemory(text: string): GuideMemory | null {
  const row = recordOf(parseJson(text));
  if (row === null || row.version !== 2) return null;
  return {
    version: 2,
    preferences: preferencesOf(row.preferences),
    seen: idsOf(row.seen),
    completed: idsOf(row.completed),
    runs: runsOf(row.runs),
    runsStarted: wholeNumberOf(row.runsStarted),
  };
}

function preferencesOf(value: unknown): GuidePreferences {
  const row = recordOf(value);
  if (row === null) return FRESH_PREFERENCES;
  const mode: GuideMode = GUIDE_MODES.find((known) => known === row.mode) ?? 'newcomer';
  const stored = recordOf(row.switches);
  const defaults = MODE_PLANS[mode].switches;
  const switchOf = (which: GuideSwitch): boolean => {
    const on = stored?.[which];
    return typeof on === 'boolean' ? on : defaults[which];
  };
  return {
    mode,
    asked: row.asked === true,
    switches: {
      walkthrough: switchOf('walkthrough'),
      lessons: switchOf('lessons'),
      warnings: switchOf('warnings'),
    },
  };
}

function runsOf(value: unknown): RunProgress[] {
  if (!Array.isArray(value)) return [];
  let runs: RunProgress[] = [];
  for (const entry of value) {
    const row = recordOf(entry);
    if (row === null || !isKey(row.key)) continue;
    const walkthrough = RUN_STATES.find((state) => state === row.walkthrough);
    if (walkthrough === undefined) continue;
    runs = newestLast(runs, { key: row.key, walkthrough });
  }
  return runs;
}

const RUN_STATES: readonly RunWalkthrough[] = ['running', 'skipped', 'none'];

function idsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (isKey(entry) && !ids.includes(entry)) ids.push(entry);
  }
  return ids;
}

/** A lesson ID or a run key: a short word, nothing a hostile shelf could use. */
function isKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/.test(value);
}

function wholeNumberOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// --- migrating version 1 -----------------------------------------------------

/**
 * Version 1's walkthrough steps in the order `tutorial.ts` shipped them. Its
 * memory records a position in this list (`progress.step`), so the order is
 * part of the stored format and is copied here; the test pins it against
 * `tutorial.ts`'s `STEPS`.
 */
export const V1_STEP_IDS = [
  'welcome',
  'select',
  'found',
  'openChart',
  'research',
  'closeChart',
  'build',
  'move',
  'endTurn',
  'meters',
  'close',
] as const;

/**
 * Version 1 steps that teach the same thing as a version 2 lesson.
 *
 * No mapping for the welcome (the pamphlet does its job now), for opening and
 * closing the technology tree (no longer steps, §5.3), or for the meters step
 * (its ideas are now the authority and happiness lessons, which teach more).
 */
export const V1_STEP_LESSONS: readonly (readonly [string, GuideLessonId])[] = [
  ['select', 'selectSettler'],
  ['found', 'foundCapital'],
  ['research', 'chooseResearch'],
  ['build', 'chooseProduction'],
  ['move', 'explore'],
  ['endTurn', 'endTurn'],
  ['close', 'walkthroughEnd'],
];

/**
 * Version 1 notes whose idea is unchanged in version 2. A note that was seen in
 * version 1 is marked seen in version 2.
 *
 * Left out on purpose, following the September plan's rule that a version 1
 * note is no proof that a lesson which has since changed was understood:
 * - `statecraft`: written before the two decks, passing a hand and chairs;
 * - `religion`: described the retired augur until batch T0;
 * - `beads`: described twenty beads in four kinds until batch T0;
 * - `overreach`: described a different penalty until batch T0;
 * - `enemy` and `starving`: version 2 has no such lessons.
 */
export const V1_NOTE_LESSONS: readonly (readonly [string, GuideLessonId])[] = [
  ['discovery', 'discovery'],
  ['combat', 'forecast'],
  ['trader', 'caravan'],
  ['greatPerson', 'greatPerson'],
  ['unhappy', 'happiness'],
];

/**
 * Version 2 memory translated from version 1's stored text, or `null` when the
 * text is not version 1 memory at all.
 *
 * Version 1 stored `{ enabled, progress: { step, done, satisfied }, seen }`
 * (`TutorialMemory` in `tutorial.ts`):
 * - **"Off" becomes "Let me explore"**, already asked, so a player who opted
 *   out is never switched back on by the upgrade. "On" was version 1's default
 *   for a browser that had never said, so it keeps the newcomer default and the
 *   landing asks the new question once. Until 2026-10-16 version 1's Skip
 *   stored "off" as well, so an older "off" may be a Skip rather than an opt-out;
 *   the stored memory cannot tell the two apart, and both migrate as "off". A
 *   Skip since then stores "on", and migrates as an unfinished walkthrough.
 * - **Completed steps** are every step before `progress.step` (a finished
 *   walkthrough stands at the end of the list, a skipped one where it was
 *   skipped) plus the steps in `satisfied`, done ahead of their turn. Each one
 *   with a version 2 lesson is marked completed.
 * - **Seen notes** with an unchanged idea are marked seen.
 *
 * Version 1's progress belonged to whichever game was last begun and had no run
 * key, so no run is created.
 */
export function migrateTutorialV1(text: string): GuideMemory | null {
  const row = recordOf(parseJson(text));
  if (row === null) return null;
  const progress = recordOf(row.progress);
  const step = Math.min(wholeNumberOf(progress?.step), V1_STEP_IDS.length);
  const doneSteps = [...V1_STEP_IDS.slice(0, step), ...stringsOf(progress?.satisfied)];
  return {
    ...FRESH_GUIDE_MEMORY,
    preferences:
      row.enabled === false ? answerGuideQuestion(FRESH_PREFERENCES, 'explore') : FRESH_PREFERENCES,
    completed: translate(doneSteps, V1_STEP_LESSONS),
    seen: translate(stringsOf(row.seen), V1_NOTE_LESSONS),
  };
}

function translate(
  ids: readonly string[],
  table: readonly (readonly [string, GuideLessonId])[],
): string[] {
  const lessons: string[] = [];
  for (const [from, to] of table) {
    if (ids.includes(from) && !lessons.includes(to)) lessons.push(to);
  }
  return lessons;
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}
