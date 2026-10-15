/**
 * Builders shared by the guide's tests (`test/ui/guide*.test.ts`).
 *
 * A non-test module, because importing a `.test.ts` file registers its tests
 * again (CLAUDE.md).
 */

import {
  EMPTY_COUNTS,
  EMPTY_FLAGS,
  type CommandTag,
  type GuideCounts,
  type GuideFacts,
  type GuideFlags,
  type GuideHost,
  type GuideMoment,
  type LessonDef,
} from '../../src/ui/guideModel';
import {
  EMPTY_SESSION,
  guideStep,
  type GuideSession,
  type GuideShowing,
} from '../../src/ui/guideSchedule';
import { FRESH_GUIDE_MEMORY, type GuideMemory, type GuideStorage } from '../../src/ui/guideStorage';

/** The seat at the screen in every test, and a rival seat. */
export const LOCAL = 0;
export const RIVAL = 1;

export interface FactsChange {
  readonly localPlayerId?: number;
  readonly host?: GuideHost;
  readonly flags?: Partial<GuideFlags>;
  readonly counts?: Partial<GuideCounts>;
}

/** A snapshot: everything false and zero, on the board, for the local seat, except what is named. */
export function factsOf(change: FactsChange = {}): GuideFacts {
  return {
    localPlayerId: change.localPlayerId ?? LOCAL,
    host: change.host ?? 'board',
    flags: { ...EMPTY_FLAGS, ...change.flags },
    counts: { ...EMPTY_COUNTS, ...change.counts },
  };
}

/** The same snapshot with some fields changed. Flags and counts merge rather than replace. */
export function factsWith(base: GuideFacts, change: FactsChange): GuideFacts {
  return {
    localPlayerId: change.localPlayerId ?? base.localPlayerId,
    host: change.host ?? base.host,
    flags: { ...base.flags, ...change.flags },
    counts: { ...base.counts, ...change.counts },
  };
}

/** A command the reducer accepted from the local seat, in the live game. */
export function accepted(command: string, tags?: readonly CommandTag[]): GuideMoment {
  return {
    kind: 'command',
    command,
    playerId: LOCAL,
    accepted: true,
    replayed: false,
    ...(tags === undefined ? {} : { tags }),
  };
}

/** The three commands that must never count: refused, a rival's, and one replayed from a save. */
export function refused(command: string): GuideMoment {
  return { kind: 'command', command, playerId: LOCAL, accepted: false, replayed: false };
}
export function rivals(command: string): GuideMoment {
  return { kind: 'command', command, playerId: RIVAL, accepted: true, replayed: false };
}
export function replayed(command: string): GuideMoment {
  return { kind: 'command', command, playerId: LOCAL, accepted: true, replayed: true };
}

export const TURN_SETTLED: GuideMoment = { kind: 'turnSettled', replayed: false };
export const SCREEN_CHANGED: GuideMoment = { kind: 'screenChanged' };
export const SELECTION_CHANGED: GuideMoment = { kind: 'selectionChanged' };
export const ARRIVED: GuideMoment = { kind: 'unitArrived', ownerId: LOCAL, replayed: false };

export function gotIt(lessonId: string): GuideMoment {
  return { kind: 'acknowledged', lessonId };
}
export function later(lessonId: string): GuideMoment {
  return { kind: 'dismissed', lessonId };
}

/**
 * Threads the memory and the session through `guideStep`, the way the adapter
 * will: one call per moment, each with the current facts.
 */
export interface GuideDriver {
  /** Reports a moment; answers the ID of the lesson on screen afterwards, or `null`. */
  step(moment: GuideMoment, facts: GuideFacts): string | null;
  /** The full description of what is on screen after the last step. */
  showing(): GuideShowing | null;
  memory(): GuideMemory;
  session(): GuideSession;
  /** Replaces the memory between moments, as the options screen would. */
  setMemory(memory: GuideMemory): void;
}

export function driveGuide(
  catalogue: readonly LessonDef[] | undefined,
  memory: GuideMemory = FRESH_GUIDE_MEMORY,
): GuideDriver {
  let state = { memory, session: EMPTY_SESSION };
  let shown: GuideShowing | null = null;
  return {
    step(moment, facts) {
      const result = guideStep({ ...state, moment, facts, ...(catalogue ? { catalogue } : {}) });
      state = { memory: result.memory, session: result.session };
      shown = result.showing;
      return shown?.id ?? null;
    },
    showing: () => shown,
    memory: () => state.memory,
    session: () => state.session,
    setMemory(next) {
      state = { ...state, memory: next };
    },
  };
}

/** A shelf that lasts as long as the test. */
export function fakeStorage(): GuideStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

/** What a private window does: every call throws. */
export const brokenStorage: GuideStorage = {
  getItem() {
    throw new Error('this browser will not store anything');
  },
  setItem() {
    throw new Error('this browser will not store anything');
  },
};
