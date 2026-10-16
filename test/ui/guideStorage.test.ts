/**
 * The guide's memory (`src/ui/guideStorage.ts`): storage version 2, its
 * failures, "Reset lessons", the runs, and the migration from version 1.
 *
 * The migration is checked twice: against version 1 memory written out by
 * hand in its stored shape, and against what `tutorial.ts`'s own writer
 * produces, so a change to version 1's format or step order fails here.
 */

import { describe, expect, it } from 'vitest';

import { FRESH_PREFERENCES, MODE_PLANS, answerGuideQuestion } from '../../src/ui/guideModel';
import { lessonById } from '../../src/ui/guideLessons';
import {
  FRESH_GUIDE_MEMORY,
  GUIDE_KEY,
  MAX_RUNS,
  TUTORIAL_V1_KEY,
  V1_NOTE_LESSONS,
  V1_STEP_IDS,
  V1_STEP_LESSONS,
  createGuideStore,
  forgetLessons,
  markCompleted,
  markSeen,
  migrateTutorialV1,
  newRunKey,
  readGuideMemory,
  resetLessons,
  resumeRun,
  runOf,
  setRunWalkthrough,
  startRun,
  withPreferences,
  writeGuideMemory,
  type GuideMemory,
  type GuideStorage,
} from '../../src/ui/guideStorage';
import {
  FRESH_MEMORY,
  STEPS,
  TIPS,
  TUTORIAL_KEY,
  stepMemory,
  writeTutorialMemory,
} from '../../src/ui/tutorial';
import { brokenStorage, fakeStorage } from './guideHelpers';

/** A memory with something in every field. */
function busyMemory(): GuideMemory {
  let memory = withPreferences(FRESH_GUIDE_MEMORY, answerGuideQuestion(FRESH_PREFERENCES, 'civ'));
  memory = markSeen(memory, ['caravan']);
  memory = markCompleted(memory, ['foundCapital', 'beads']);
  memory = startRun(memory, 'run-1', 'running');
  return startRun(memory, 'run-2', 'skipped');
}

/** Version 1 memory in its stored shape (`TutorialMemory` in `tutorial.ts`). */
function v1(memory: {
  enabled?: boolean;
  step?: number;
  done?: boolean;
  satisfied?: string[];
  seen?: string[];
}): string {
  return JSON.stringify({
    ...(memory.enabled === undefined ? {} : { enabled: memory.enabled }),
    progress: { step: memory.step ?? 0, done: memory.done ?? false, satisfied: memory.satisfied ?? [] },
    seen: memory.seen ?? [],
  });
}

describe('reading and writing', () => {
  it('round-trips through a shelf', () => {
    const storage = fakeStorage();
    const memory = busyMemory();
    expect(writeGuideMemory(storage, memory)).toBe(true);
    expect(storage.map.has(GUIDE_KEY)).toBe(true);
    expect(readGuideMemory(storage)).toEqual(memory);
  });

  it('gives a browser that has never been here fresh memory, with the question still to ask', () => {
    const memory = readGuideMemory(fakeStorage());
    expect(memory).toEqual(FRESH_GUIDE_MEMORY);
    expect(memory.preferences.asked).toBe(false);
  });

  it('survives a shelf that throws', () => {
    expect(readGuideMemory(brokenStorage)).toEqual(FRESH_GUIDE_MEMORY);
    expect(writeGuideMemory(brokenStorage, busyMemory())).toBe(false);
  });

  it('falls back to memory when the shelf fails, for the rest of the session', () => {
    const store = createGuideStore(brokenStorage);
    const memory = busyMemory();
    expect(() => store.write(memory)).not.toThrow();
    expect(store.read()).toBe(memory);

    // A shelf that reads but refuses writes (a full one) keeps working the same way.
    const full = fakeStorage();
    writeGuideMemory(full, busyMemory());
    const refusing: GuideStorage = {
      getItem: (key) => full.getItem(key),
      setItem() {
        throw new Error('quota exceeded');
      },
    };
    const kept = createGuideStore(refusing);
    expect(kept.read()).toEqual(busyMemory());
    const reset = resetLessons(kept.read());
    kept.write(reset);
    expect(kept.read()).toBe(reset);
  });

  it('writes through the store, and skips a write of the memory it already holds', () => {
    const storage = fakeStorage();
    const store = createGuideStore(storage);
    store.write(store.read());
    expect(storage.map.has(GUIDE_KEY)).toBe(false);
    store.write(busyMemory());
    expect(readGuideMemory(storage)).toEqual(busyMemory());
  });

  it('reads nonsense as fresh, and repairs a damaged memory field by field', () => {
    const junk = fakeStorage();
    junk.map.set(GUIDE_KEY, '{not json');
    expect(readGuideMemory(junk)).toEqual(FRESH_GUIDE_MEMORY);

    const future = fakeStorage();
    future.map.set(GUIDE_KEY, JSON.stringify({ ...busyMemory(), version: 3 }));
    expect(readGuideMemory(future)).toEqual(FRESH_GUIDE_MEMORY);

    const damaged = fakeStorage();
    damaged.map.set(
      GUIDE_KEY,
      JSON.stringify({
        version: 2,
        preferences: { mode: 'expert', asked: 'yes', switches: { lessons: false, warnings: 'on' } },
        seen: ['caravan', 3, 'caravan', '__proto__', 'not a key!'],
        completed: 'beads',
        runs: [
          { key: 'run-1', walkthrough: 'running' },
          { key: '', walkthrough: 'none' },
          { key: 'run-2', walkthrough: 'flying' },
          'run-3',
          { key: 'run-1', walkthrough: 'skipped' },
        ],
        runsStarted: -4,
      }),
    );
    expect(readGuideMemory(damaged)).toEqual({
      version: 2,
      preferences: {
        mode: 'newcomer',
        asked: false,
        switches: { walkthrough: true, lessons: false, warnings: true },
      },
      seen: ['caravan'],
      completed: [],
      runs: [{ key: 'run-1', walkthrough: 'skipped' }],
      runsStarted: 0,
    });
  });
});

describe('changing it', () => {
  it('returns the same object when nothing changes, so a caller can skip the write', () => {
    const memory = busyMemory();
    expect(markSeen(memory, [])).toBe(memory);
    expect(markSeen(memory, ['caravan'])).toBe(memory);
    expect(markCompleted(memory, ['beads', 'beads'])).toBe(memory);
    expect(forgetLessons(memory, ['explore'])).toBe(memory);
    expect(withPreferences(memory, memory.preferences)).toBe(memory);
    expect(setRunWalkthrough(memory, 'run-9', 'running')).toBe(memory);
    expect(setRunWalkthrough(memory, 'run-1', 'running')).toBe(memory);
    expect(resumeRun(memory, 'run-2')).toBe(memory);
    expect(resetLessons(FRESH_GUIDE_MEMORY)).toBe(FRESH_GUIDE_MEMORY);
  });

  it('adds each lesson once, in the order given', () => {
    const memory = markCompleted(FRESH_GUIDE_MEMORY, ['explore', 'endTurn', 'explore']);
    expect(memory.completed).toEqual(['explore', 'endTurn']);
    expect(forgetLessons(memory, ['explore']).completed).toEqual(['endTurn']);
  });

  it('resets the lessons and the runs, and keeps the preferences (§5.6)', () => {
    const memory = busyMemory();
    const reset = resetLessons(memory);
    expect(reset.seen).toEqual([]);
    expect(reset.completed).toEqual([]);
    expect(reset.runs).toEqual([]);
    expect(reset.preferences).toBe(memory.preferences);
    // The run counter stays, so a key is never handed out twice.
    expect(newRunKey(reset)).toBe(newRunKey(memory));
  });

  it('numbers new runs from a counter, and remembers only the newest', () => {
    let memory = FRESH_GUIDE_MEMORY;
    expect(newRunKey(memory)).toBe('run-1');
    for (let index = 0; index < MAX_RUNS + 5; index += 1) {
      memory = startRun(memory, newRunKey(memory), 'running');
    }
    expect(memory.runsStarted).toBe(MAX_RUNS + 5);
    expect(memory.runs).toHaveLength(MAX_RUNS);
    expect(memory.runs[0]?.key).toBe('run-6');
    expect(runOf(memory, 'run-5')).toBeUndefined();
    expect(newRunKey(memory)).toBe(`run-${MAX_RUNS + 6}`);
  });

  it('moves a resumed run to the newest place, and gives an unknown one no walkthrough', () => {
    let memory = busyMemory();
    memory = resumeRun(memory, 'run-1');
    expect(memory.runs.map((run) => run.key)).toEqual(['run-2', 'run-1']);
    expect(runOf(memory, 'run-1')?.walkthrough).toBe('running');
    memory = resumeRun(memory, 'imported');
    expect(runOf(memory, 'imported')?.walkthrough).toBe('none');
    expect(runOf(memory, null)).toBeUndefined();
  });

  it('starts a known key over', () => {
    const memory = startRun(busyMemory(), 'run-1', 'none');
    expect(memory.runs).toEqual([
      { key: 'run-2', walkthrough: 'skipped' },
      { key: 'run-1', walkthrough: 'none' },
    ]);
  });
});

describe('migrating version 1', () => {
  it('turns version 1 switched off into "Let me explore", already asked', () => {
    const memory = migrateTutorialV1(v1({ enabled: false }));
    expect(memory?.preferences).toEqual({
      mode: 'explore',
      asked: true,
      switches: MODE_PLANS.explore.switches,
    });
  });

  it('keeps version 1 switched on as the newcomer default, so the new question is asked once', () => {
    expect(migrateTutorialV1(v1({ enabled: true }))?.preferences).toEqual(FRESH_PREFERENCES);
    // Version 1 read a missing flag as on.
    expect(migrateTutorialV1(v1({}))?.preferences).toEqual(FRESH_PREFERENCES);
  });

  it('marks the completed steps that have a matching lesson', () => {
    // Standing on step 5 (welcome, select, found, open the tree and research
    // done), with production set ahead of its turn.
    const memory = migrateTutorialV1(v1({ step: 5, satisfied: ['build'] }));
    expect(memory?.completed).toEqual([
      'selectSettler',
      'foundCapital',
      'chooseResearch',
      'chooseProduction',
    ]);
    expect(memory?.runs).toEqual([]);
  });

  it('marks every matching lesson for a finished walkthrough, and the steps before the skip for a skipped one', () => {
    const finished = migrateTutorialV1(v1({ step: V1_STEP_IDS.length, done: true }));
    expect(finished?.completed).toEqual(V1_STEP_LESSONS.map(([, lesson]) => lesson));
    // A skip leaves the guide on (since 2026-10-16), so the walkthrough is
    // unfinished rather than unwanted: the newcomer default, with the rest of
    // it still to teach.
    const skipped = migrateTutorialV1(v1({ step: 3, done: true }));
    expect(skipped?.completed).toEqual(['selectSettler', 'foundCapital']);
    expect(skipped?.preferences).toEqual(FRESH_PREFERENCES);
    // Before then a skip also stored "off", which reads as an opt-out: the two
    // cannot be told apart.
    const olderSkip = migrateTutorialV1(v1({ enabled: false, step: 3, done: true }));
    expect(olderSkip?.completed).toEqual(['selectSettler', 'foundCapital']);
    expect(olderSkip?.preferences.mode).toBe('explore');
    // A position past the end is read as the end.
    expect(migrateTutorialV1(v1({ step: 99 }))?.completed).toEqual(finished?.completed);
  });

  it('marks seen only the notes whose idea is unchanged', () => {
    const memory = migrateTutorialV1(v1({ seen: TIPS.map((tip) => tip.id) }));
    expect(memory?.seen).toEqual(['discovery', 'forecast', 'caravan', 'greatPerson', 'happiness']);
    // The notes that described a retired or changed system teach again.
    for (const stale of ['statecraft', 'religion', 'beads', 'overreach']) {
      expect(V1_NOTE_LESSONS.map(([note]) => note), stale).not.toContain(stale);
    }
  });

  it('translates only into lessons the catalogue has', () => {
    for (const [, lesson] of [...V1_STEP_LESSONS, ...V1_NOTE_LESSONS]) {
      expect(lessonById(lesson), lesson).toBeDefined();
    }
  });

  it('reads version 1 only when version 2 is absent, and leaves it on the shelf', () => {
    const storage = fakeStorage();
    storage.map.set(TUTORIAL_V1_KEY, v1({ enabled: false, step: 3 }));
    expect(readGuideMemory(storage).preferences.mode).toBe('explore');
    // Reading writes nothing: version 1 stays until version 2 is first written.
    expect(storage.map.has(GUIDE_KEY)).toBe(false);
    const store = createGuideStore(storage);
    store.write(markSeen(store.read(), ['beads']));
    expect(storage.map.get(TUTORIAL_V1_KEY)).toBe(v1({ enabled: false, step: 3 }));
    // From then on version 2 wins, even if version 1 changes underneath.
    storage.map.set(TUTORIAL_V1_KEY, v1({ enabled: true }));
    expect(readGuideMemory(storage).seen).toEqual(['beads']);
    expect(readGuideMemory(storage).preferences.mode).toBe('explore');
  });

  it('falls back to version 1 when version 2 is unreadable, and to fresh memory when both are', () => {
    const storage = fakeStorage();
    storage.map.set(GUIDE_KEY, '{truncated');
    storage.map.set(TUTORIAL_V1_KEY, v1({ enabled: false }));
    expect(readGuideMemory(storage).preferences.mode).toBe('explore');
    storage.map.set(TUTORIAL_V1_KEY, 'null');
    expect(readGuideMemory(storage)).toEqual(FRESH_GUIDE_MEMORY);
    expect(migrateTutorialV1('[1, 2]')).toBeNull();
  });
});

describe('version 1 as tutorial.ts writes it', () => {
  it('shares the key and the step order this module copies', () => {
    expect(TUTORIAL_V1_KEY).toBe(TUTORIAL_KEY);
    expect(STEPS.map((step) => step.id)).toEqual([...V1_STEP_IDS]);
    const steps = STEPS.map((step) => step.id);
    for (const [step] of V1_STEP_LESSONS) expect(steps, step).toContain(step);
    const notes = TIPS.map((tip) => tip.id);
    for (const [note] of V1_NOTE_LESSONS) expect(notes, note).toContain(note);
  });

  it('migrates what the version 1 writer stored', () => {
    const storage = fakeStorage();
    writeTutorialMemory(storage, {
      enabled: false,
      progress: { step: 4, done: false, satisfied: ['build'] },
      seen: ['trader', 'beads'],
    });
    const memory = readGuideMemory(storage);
    expect(memory.preferences.mode).toBe('explore');
    expect(memory.completed).toEqual(['selectSettler', 'foundCapital', 'chooseProduction']);
    expect(memory.seen).toEqual(['caravan']);
  });

  it('migrates a version 1 Skip as an unfinished walkthrough, with the guide still on', () => {
    // Version 1's own reducer: the welcome read, the settler selected, then Skip.
    let v1Memory = stepMemory(FRESH_MEMORY, { kind: 'next' });
    v1Memory = stepMemory(v1Memory, { kind: 'select', unit: 'settler' });
    v1Memory = stepMemory(v1Memory, { kind: 'skip' });
    expect(v1Memory.enabled).toBe(true);
    const storage = fakeStorage();
    writeTutorialMemory(storage, v1Memory);
    const memory = readGuideMemory(storage);
    expect(memory.preferences).toEqual(FRESH_PREFERENCES);
    expect(memory.preferences.switches.walkthrough).toBe(true);
    expect(memory.completed).toEqual(['selectSettler']);
  });
});
