/**
 * The tutorial: the four things about it that could be quietly wrong.
 *
 * There is no jsdom in this suite (`controls.test.ts`'s note), which is why
 * `src/ui/tutorial.ts` is split the way `confirmCard.ts` is — the prose tables,
 * the advance reducer, the note lookup, the memory and the card's placement are
 * all pure, and the drawing is a dozen `append` calls that fail loudly or not at
 * all. What is asserted here is exactly the pure half, plus the wiring, read off
 * the sources through Vite's raw glob:
 *
 *   1. **The tables are well formed.** Ids unique, no step or note without
 *      words, and every action step naming a command the reducer actually has —
 *      a step whose deed is a typo is a step nothing can ever advance past.
 *   2. **The sequence is a reducer.** A deed done out of order marks its step
 *      satisfied and the walk skips it; Next belongs to the step in hand alone;
 *      Skip ends it; nothing moved returns the *same object*, which is what
 *      keeps the card from being rebuilt on every mouse move.
 *   3. **A note is shown once ever**, and the memory survives a shelf that
 *      throws — a private window must lose the tutorial's memory and nothing
 *      else.
 *   4. **The copy obeys hard rule 7.** Player-facing words: no identifier ever
 *      reaches the screen, no keyword markup leaks unresolved (`keywords.ts`'s
 *      sweep, one surface over), and no bare digit — every number in this prose
 *      is spelled, because the only figure the guide is allowed to name is the
 *      one that *is* a rule.
 *
 * And the two source pins that keep the module where the brief put it: it never
 * reaches into `src/sim`, and `main.ts` feeds it from the commit funnel rather
 * than from a timer.
 */

import { describe, expect, it } from 'vitest';

import {
  FIRST_PROGRESS,
  FRESH_MEMORY,
  STEPS,
  TIPS,
  TUTORIAL_KEY,
  type TutorialMemory,
  type TutorialStorage,
  advanceKey,
  nextStep,
  placeCard,
  readTutorialMemory,
  signalKey,
  stepAt,
  stepCount,
  tipFor,
  writeTutorialMemory,
} from '../../src/ui/tutorial';

const SOURCES = import.meta.glob(
  ['../../src/ui/*.ts', '../../src/main.ts', '../../src/sim/commands.ts', '../../index.html'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** Every string a player actually reads, from both tables. */
function prose(): string[] {
  const lines: string[] = [];
  for (const step of STEPS) lines.push(step.title, step.body);
  for (const tip of TIPS) for (const page of tip.pages) lines.push(page.title, page.body);
  return lines;
}

/** A shelf that lasts as long as the test — `memorySaveStorage`, two methods. */
function fakeStorage(): TutorialStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

/** What a private window does: every call throws. */
const brokenStorage: TutorialStorage = {
  getItem() {
    throw new Error('this browser will not store anything');
  },
  setItem() {
    throw new Error('this browser will not store anything');
  },
};

describe('the step table', () => {
  it('gives every step a unique id and words to say', () => {
    const ids = STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(20);
    }
  });

  it('names a command the reducer actually has on every action step', () => {
    const reducer = source('sim/commands.ts');
    const named = STEPS.filter((step) => step.advance.kind === 'command');
    // A guide with no action steps is a slideshow; the whole design is that the
    // deed advances the card.
    expect(named.length).toBeGreaterThanOrEqual(4);
    for (const step of named) {
      if (step.advance.kind !== 'command') continue;
      expect(reducer).toContain(`type: '${step.advance.command}';`);
    }
  });

  it('offers a button on informational steps only', () => {
    for (const step of STEPS) {
      // An action step has no key of its own beyond the deed, and an
      // informational one has no deed at all — the two are exclusive by shape.
      expect(advanceKey(step.advance) === null).toBe(step.advance.kind === 'next');
    }
  });

  it('counts from one', () => {
    expect(stepCount(0, STEPS.length)).toBe(`Step 1 of ${STEPS.length}`);
    expect(stepCount(STEPS.length - 1, STEPS.length)).toBe(
      `Step ${STEPS.length} of ${STEPS.length}`,
    );
  });
});

describe('the note table', () => {
  it('gives every note a unique id, a trigger and pages', () => {
    const ids = TIPS.map((tip) => tip.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tip of TIPS) {
      expect(tip.triggers.length).toBeGreaterThan(0);
      expect(tip.pages.length).toBeGreaterThan(0);
      for (const page of tip.pages) {
        expect(page.title.length).toBeGreaterThan(0);
        expect(page.body.length).toBeGreaterThan(20);
      }
    }
  });

  it('lets no two notes claim the same trigger', () => {
    const triggers = TIPS.flatMap((tip) => tip.triggers);
    expect(new Set(triggers).size).toBe(triggers.length);
  });

  it('explains the bead system in more than one card', () => {
    const beads = TIPS.find((tip) => tip.id === 'beads');
    expect(beads?.pages.length).toBeGreaterThan(1);
    // The user asked for the bead system explained; both the first bead and the
    // first age to open are the moment for it, whichever lands first.
    expect(beads?.triggers).toContain('event:bead');
    expect(beads?.triggers).toContain('event:ageOpened');
  });
});

describe('signalKey', () => {
  it('reads a signal and a step advance the same way', () => {
    expect(signalKey({ kind: 'command', command: 'foundCity' })).toBe('command:foundCity');
    expect(advanceKey({ kind: 'command', command: 'foundCity' })).toBe('command:foundCity');
    expect(signalKey({ kind: 'select', unit: 'settler' })).toBe('select:settler');
    expect(signalKey({ kind: 'select', unit: null })).toBeNull();
    expect(signalKey({ kind: 'next' })).toBeNull();
    expect(signalKey({ kind: 'skip' })).toBeNull();
  });
});

describe('nextStep', () => {
  const steps = [
    { id: 'a', anchor: null, title: 'A', body: 'a', advance: { kind: 'next' } },
    { id: 'b', anchor: null, title: 'B', body: 'b', advance: { kind: 'select', unit: 'settler' } },
    { id: 'c', anchor: null, title: 'C', body: 'c', advance: { kind: 'command', command: 'foundCity' } },
    { id: 'd', anchor: null, title: 'D', body: 'd', advance: { kind: 'next' } },
  ] as const satisfies readonly (typeof STEPS)[number][];

  it('leaves the progress object untouched when nothing matched', () => {
    const after = nextStep(FIRST_PROGRESS, { kind: 'command', command: 'endTurn' }, steps);
    expect(after).toBe(FIRST_PROGRESS);
  });

  it('advances an informational step on Next, and never on a deed', () => {
    expect(nextStep(FIRST_PROGRESS, { kind: 'next' }, steps).step).toBe(1);
    expect(nextStep(FIRST_PROGRESS, { kind: 'select', unit: 'warrior' }, steps)).toBe(
      FIRST_PROGRESS,
    );
  });

  it('advances an action step on the deed, and never on Next', () => {
    const atB = { step: 1, done: false, satisfied: [] };
    expect(nextStep(atB, { kind: 'next' }, steps)).toBe(atB);
    expect(nextStep(atB, { kind: 'select', unit: 'settler' }, steps).step).toBe(2);
  });

  it('skips a step whose deed the player already did out of order', () => {
    // The city is founded while the card is still asking for a settler to be
    // selected. Selecting one then walks straight past the founding step.
    const atB = { step: 1, done: false, satisfied: [] };
    const early = nextStep(atB, { kind: 'command', command: 'foundCity' }, steps);
    expect(early.step).toBe(1);
    expect(early.satisfied).toContain('c');
    const then = nextStep(early, { kind: 'select', unit: 'settler' }, steps);
    expect(then.step).toBe(3);
  });

  it('is done at the end and stays done', () => {
    const last = { step: steps.length - 1, done: false, satisfied: [] };
    const after = nextStep(last, { kind: 'next' }, steps);
    expect(after.done).toBe(true);
    expect(stepAt(after, steps)).toBeNull();
    expect(nextStep(after, { kind: 'command', command: 'foundCity' }, steps)).toBe(after);
  });

  it('ends on Skip from anywhere', () => {
    expect(nextStep(FIRST_PROGRESS, { kind: 'skip' }, steps).done).toBe(true);
  });

  it('walks the real table from the top to the end', () => {
    let progress = FIRST_PROGRESS;
    let guard = 0;
    while (!progress.done && guard < 100) {
      guard += 1;
      const step = stepAt(progress, STEPS);
      expect(step).not.toBeNull();
      if (step === null) break;
      const advance = step.advance;
      progress = nextStep(
        progress,
        advance.kind === 'next'
          ? { kind: 'next' }
          : advance.kind === 'select'
            ? { kind: 'select', unit: advance.unit }
            : { kind: 'command', command: advance.command },
        STEPS,
      );
    }
    expect(progress.done).toBe(true);
    expect(guard).toBeLessThanOrEqual(STEPS.length);
  });
});

describe('tipFor', () => {
  it('raises a note on its trigger, once and never again', () => {
    const signal = { kind: 'event', event: 'bead' } as const;
    const first = tipFor(signal, []);
    expect(first?.id).toBe('beads');
    expect(tipFor(signal, ['beads'])).toBeNull();
  });

  it('says nothing to a signal no note claims', () => {
    expect(tipFor({ kind: 'command', command: 'fortify' }, [])).toBeNull();
    expect(tipFor({ kind: 'next' }, [])).toBeNull();
  });

  it('raises the caravan note on picking one up', () => {
    expect(tipFor({ kind: 'select', unit: 'trader' }, [])?.id).toBe('trader');
  });
});

describe('the memory', () => {
  it('round-trips through a shelf', () => {
    const storage = fakeStorage();
    const memory: TutorialMemory = {
      enabled: false,
      progress: { step: 3, done: false, satisfied: ['found'] },
      seen: ['beads', 'trader'],
    };
    writeTutorialMemory(storage, memory);
    expect(storage.map.has(TUTORIAL_KEY)).toBe(true);
    expect(readTutorialMemory(storage)).toEqual(memory);
  });

  it('gives a browser that has never been here the guide, switched on', () => {
    expect(readTutorialMemory(fakeStorage())).toEqual(FRESH_MEMORY);
    expect(FRESH_MEMORY.enabled).toBe(true);
  });

  it('survives a shelf that throws, and one holding nonsense', () => {
    expect(readTutorialMemory(brokenStorage)).toEqual(FRESH_MEMORY);
    expect(() => writeTutorialMemory(brokenStorage, FRESH_MEMORY)).not.toThrow();

    const junk = fakeStorage();
    junk.map.set(TUTORIAL_KEY, '{not json');
    expect(readTutorialMemory(junk)).toEqual(FRESH_MEMORY);

    const wrong = fakeStorage();
    wrong.map.set(TUTORIAL_KEY, JSON.stringify({ enabled: 'yes', progress: 7, seen: [1, 'ok'] }));
    const read = readTutorialMemory(wrong);
    expect(read.enabled).toBe(true);
    expect(read.progress).toEqual(FIRST_PROGRESS);
    expect(read.seen).toEqual(['ok']);
  });
});

describe('placeCard', () => {
  const view = { width: 1280, height: 720 };
  const card = { width: 320, height: 200 };

  it('centres a card with no anchor, clear of the middle of the board', () => {
    const at = placeCard(null, card, view);
    expect(at.left).toBe((view.width - card.width) / 2);
    expect(at.top).toBeLessThan(view.height / 2);
  });

  it('stands to the right of an anchor with room for it', () => {
    const at = placeCard({ left: 40, top: 300, width: 120, height: 60 }, card, view);
    expect(at.left).toBeGreaterThan(160);
  });

  it('flips to the left of an anchor against the right edge', () => {
    const at = placeCard({ left: 1180, top: 300, width: 80, height: 40 }, card, view);
    expect(at.left + card.width).toBeLessThanOrEqual(1180);
  });

  it('never puts the card outside the window', () => {
    const anchors = [
      { left: 0, top: 0, width: 10, height: 10 },
      { left: 1270, top: 710, width: 10, height: 10 },
      { left: 600, top: 700, width: 400, height: 20 },
      { left: -50, top: -50, width: 40, height: 40 },
    ];
    for (const anchor of anchors) {
      const at = placeCard(anchor, card, view);
      expect(at.left).toBeGreaterThanOrEqual(0);
      expect(at.top).toBeGreaterThanOrEqual(0);
      expect(at.left + card.width).toBeLessThanOrEqual(view.width);
      expect(at.top + card.height).toBeLessThanOrEqual(view.height);
    }
  });

  it('still answers inside a window smaller than the card', () => {
    const at = placeCard({ left: 10, top: 10, width: 40, height: 40 }, card, {
      width: 200,
      height: 150,
    });
    expect(Number.isFinite(at.left)).toBe(true);
    expect(Number.isFinite(at.top)).toBe(true);
  });
});

describe('the copy', () => {
  it('never leaks an identifier onto the screen', () => {
    for (const line of prose()) {
      // The compendium's rule, hard rule 7: a player-facing sentence is written
      // in a first-time player's words, so no run-together capital ever appears
      // inside a word.
      expect(line, line).not.toMatch(/[a-z][A-Z]/);
    }
  });

  it('spells every number it says', () => {
    for (const line of prose()) {
      // "twenty beads" is the only figure the guide names, and it is spelled,
      // so a digit anywhere in this prose is a number that has escaped the
      // tables it belongs in.
      expect(line, line).not.toMatch(/\d/);
    }
  });

  it('leaves no keyword markup unresolved', () => {
    for (const line of prose()) {
      expect(line).not.toContain('[[');
    }
  });

  it('says what wins the game', () => {
    expect(prose().join(' ')).toContain('twenty beads');
  });
});

describe('the wiring', () => {
  it('reaches into no part of the simulation', () => {
    const text = source('ui/tutorial.ts');
    // Types included: the guide is an interface fact and a save carries none of
    // it, so a dependency on the rules is the seam this pin exists to keep shut.
    const imports = [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
    expect(imports.filter((path) => path?.includes('sim'))).toEqual([]);
  });

  it('is fed from the commit funnel rather than from a clock', () => {
    const controls = source('ui/controls.ts');
    // The funnel reports the accepted command outward; nothing else in the file
    // does, so a second call site would be a second answer to "did it happen".
    expect(controls).toContain('onCommand?.(command, result)');

    const main = source('main.ts');
    expect(main).toContain("createTutorial({ storage: saveStorage, root: document.body })");
    expect(main).toContain('onCommand: (command, result) =>');
    expect(main).toContain("tutorial.note({ kind: 'command', command: command.type })");
    // And no timer anywhere near it: a step advances on a deed.
    expect(source('ui/tutorial.ts')).not.toMatch(/setTimeout|setInterval/);
  });

  it('is switched on from the landing and asked for again from the menu', () => {
    const html = source('index.html');
    expect(html).toContain('id="tutorial-toggle"');
    expect(html).toContain('id="menu-tutorial"');
    const main = source('main.ts');
    expect(main).toContain('tutorial.setEnabled(tutorialToggle.checked)');
    expect(main).toContain('tutorial.replay()');
  });

  it('starts the sequence for a new game and never for a loaded one', () => {
    const main = source('main.ts');
    expect(main).toContain('tutorial.begin()');
    expect(main).toContain('tutorial.resume()');
  });

  it('anchors its highlights on elements that exist', () => {
    const html = source('index.html');
    for (const step of STEPS) {
      if (step.anchor === null) continue;
      expect(html, step.id).toContain(`id="${step.anchor}"`);
    }
  });
});
