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
  type TutorialSignal,
  type TutorialStorage,
  cornerCard,
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
import {
  PAMPHLET_ENTRY_ID,
  PAMPHLET_KEY,
  PAMPHLET_PAGES,
  pageStep,
  readPamphletSeen,
  shouldShowPamphlet,
  writePamphletSeen,
} from '../../src/ui/pamphlet';
import { stripRefs } from '../../src/sim/statecraft';

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

/** The signal that satisfies a step — the reducer's own reading, from outside. */
function signalOf(advance: (typeof STEPS)[number]['advance']): TutorialSignal {
  switch (advance.kind) {
    case 'next':
      return { kind: 'next' };
    case 'select':
      return { kind: 'select', unit: advance.unit };
    case 'event':
      return { kind: 'event', event: advance.event };
    default:
      return { kind: 'command', command: advance.command };
  }
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

  it('splits opening the star chart from aiming it', () => {
    // The user, 2026-08-30: one card to open the chart, a second one, out of the
    // way of the stars, to pick one. The first advances on the screen opening —
    // which is not a command, because nothing about the world changed.
    const open = STEPS.find((step) => step.id === 'openChart');
    const aim = STEPS.find((step) => step.id === 'research');
    expect(open?.advance).toEqual({ kind: 'event', event: 'techChartOpened' });
    expect(aim?.advance).toEqual({ kind: 'command', command: 'chooseResearch' });
    // The chart fills the window, so the second card takes a corner and has no
    // element to sit beside.
    expect(aim?.place).toBe('corner');
    expect(aim?.anchor).toBeNull();
    expect(STEPS.indexOf(open!)).toBeLessThan(STEPS.indexOf(aim!));
  });

  it('asks the chart to be folded away before the next card', () => {
    // The user, 2026-08-30: a city screen raised over an open star chart is two
    // screens arguing. The step between them is what stops it, and the pin is
    // the *order* plus the fact that the build step cannot be reached until the
    // chart has actually closed.
    const ids = STEPS.map((step) => step.id);
    expect(ids.indexOf('research')).toBeLessThan(ids.indexOf('closeChart'));
    expect(ids.indexOf('closeChart')).toBeLessThan(ids.indexOf('build'));
    const close = STEPS.find((step) => step.id === 'closeChart');
    expect(close?.advance).toEqual({ kind: 'event', event: 'techChartClosed' });
    // It rings the × and keeps the pick step's corner, so the card does not
    // land in the middle of the chart it is asking to be closed.
    expect(close?.anchor).toBe('#tech-close');
    expect(close?.place).toBe('corner');
  });

  it('never raises the build card while the chart is still up', () => {
    // Queueing something early marks the build step satisfied, but the sequence
    // must still be standing on "fold the chart away" — the card on screen is
    // the close step's until the chart actually closes.
    let progress = FIRST_PROGRESS;
    for (const step of STEPS) {
      if (step.id === 'research') break;
      progress = nextStep(progress, signalOf(step.advance), STEPS);
    }
    expect(stepAt(progress, STEPS)?.id).toBe('research');
    progress = nextStep(progress, { kind: 'command', command: 'chooseResearch' }, STEPS);
    expect(stepAt(progress, STEPS)?.id).toBe('closeChart');
    const early = nextStep(progress, { kind: 'command', command: 'setCityProduction' }, STEPS);
    expect(stepAt(early, STEPS)?.id).toBe('closeChart');
    expect(stepAt(nextStep(early, { kind: 'event', event: 'techChartClosed' }), STEPS)?.id).toBe(
      'move',
    );
  });

  it('rings the starting unit on the board too', () => {
    const move = STEPS.find((step) => step.id === 'move');
    expect(move?.title).toBe('Move your starting unit');
    expect(move?.board).toBe('mover');
  });

  it('rings the settler on the board rather than a panel', () => {
    const select = STEPS.find((step) => step.id === 'select');
    expect(select?.board).toBe('settler');
    // And keeps an element fallback, for the frame where the projection has no
    // answer (the piece off screen, or a renderer with no projection at all).
    expect(select?.anchor).not.toBeNull();
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

  it('advances on an event a step names, and skips it if it already happened', () => {
    const chart = [
      { id: 'p', anchor: null, title: 'P', body: 'p', advance: { kind: 'next' } },
      { id: 'q', anchor: null, title: 'Q', body: 'q', advance: { kind: 'event', event: 'techChartOpened' } },
    ] as const satisfies readonly (typeof STEPS)[number][];
    expect(nextStep({ step: 1, done: false, satisfied: [] }, { kind: 'event', event: 'techChartOpened' }, chart).done).toBe(true);
    // Opened early, from the first card: the step is satisfied and Next walks
    // straight past it.
    const early = nextStep(FIRST_PROGRESS, { kind: 'event', event: 'techChartOpened' }, chart);
    expect(early.step).toBe(0);
    expect(early.satisfied).toContain('q');
    expect(nextStep(early, { kind: 'next' }, chart).done).toBe(true);
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
      progress = nextStep(progress, signalOf(advance), STEPS);
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

describe('cornerCard', () => {
  it('takes the bottom-left, clear of the star chart\'s own furniture', () => {
    const view = { width: 1280, height: 720 };
    const card = { width: 272, height: 180 };
    const at = cornerCard(card, view);
    expect(at.left).toBeLessThan(view.width / 4);
    expect(at.top + card.height).toBeLessThanOrEqual(view.height);
    expect(at.top).toBeGreaterThan(view.height / 2);
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

  /**
   * The pamphlet audit's ruled example (2026-09-03): the tech chart is **a tree
   * with nodes** to a player who has not yet learned that the stars are the
   * technologies. "Aim at a star" and "the star chart" shipped in exactly these
   * tables, so the sweep is a hard pin rather than a review note.
   */
  it('never asks a first-time player to click a star', () => {
    for (const line of prose()) {
      expect(line, line).not.toMatch(/\bstars?\b/i);
      expect(line, line).not.toContain('star chart');
    }
    const open = STEPS.find((step) => step.id === 'openChart')!;
    const aim = STEPS.find((step) => step.id === 'research')!;
    expect(open.body).toContain('node');
    expect(aim.body).toContain('node on the tree');
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
    expect(main).toContain('createTutorial({');
    expect(main).toContain('storage: saveStorage,');
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

  /**
   * The deployed bug of 2026-08-30, pinned so it cannot come back.
   *
   * `commit` in `controls.ts` is not the only place a command is dispatched: the
   * star chart sends its own `chooseResearch` and the city screen its own
   * `setCityProduction`, each for a stated reason of its own. Both were deaf to
   * the guide until they reported into the same seam, and the two steps that ask
   * for exactly those two commands simply never advanced. So: **every command a
   * step names must be built in a file that reports.**
   */
  it('names no deed a screen could be deaf to', () => {
    const funnels: Record<string, string> = {
      'ui/controls.ts': 'reportCommand(command, result)',
      'ui/techTree.ts': 'onCommitted?.(command, result)',
      'ui/cityPanel.ts': 'options.onCommitted?.(command, result)',
    };
    for (const [file, call] of Object.entries(funnels)) {
      expect(source(file), file).toContain(call);
    }
    for (const step of STEPS) {
      if (step.advance.kind !== 'command') continue;
      const built = Object.keys(funnels).filter((file) =>
        source(file).includes(`type: '${step.advance.kind === 'command' ? step.advance.command : ''}'`),
      );
      expect(built, `${step.id} is dispatched from nowhere that reports`).not.toEqual([]);
    }
  });

  it('wires both self-dispatching screens back into the funnel', () => {
    const main = source('main.ts');
    const wired = [...main.matchAll(/onCommitted: \(command, result\) => controls\.reportCommand/g)];
    // The star chart and the city panel. A third screen that starts dispatching
    // for itself joins them here.
    expect(wired.length).toBe(2);
  });

  it('hears the chart close through the one door they all arrive at', () => {
    const chart = source('ui/techTree.ts');
    // `setOpen` is where the ×, Escape, the ink around the chart, `close()` and
    // the toggle all end up, so `onClose` is one line rather than five.
    expect([...chart.matchAll(/onClose\?\.\(\)/g)].length).toBe(1);
    expect(source('main.ts')).toContain(
      "onClose: () => tutorial.note({ kind: 'event', event: 'techChartClosed' })",
    );
  });

  it('re-projects the board ring on the renderer\'s frame beat', () => {
    const main = source('main.ts');
    expect(main).toContain('tutorial.reposition()');
    // Off the same projection the banners and the damage numbers use.
    expect(main).toContain('renderer.projectCell');
    expect(main).toContain("tutorial.note({ kind: 'event', event: 'techChartOpened' })");
  });

  it('anchors its highlights on elements that exist', () => {
    const html = source('index.html');
    for (const step of STEPS) {
      const anchor = step.anchor;
      if (anchor === null) continue;
      // A selector, not an id (2026-08-30): `#foo` is markup in the document,
      // `.foo` is a class some module builds.
      if (anchor.startsWith('#')) {
        expect(html, step.id).toContain(`id="${anchor.slice(1)}"`);
        continue;
      }
      expect(anchor.startsWith('.'), `${step.id}: ${anchor}`).toBe(true);
      // A compound selector (`.a.b`) is built as one two-class literal by
      // `element('div', 'a b')` — the build step's `.city-rail.is-right`
      // (2026-09-03, the city mode). Joined with a space, a single class is
      // the old exact check unchanged.
      const literal = anchor.slice(1).split('.').join(' ');
      const built = Object.keys(SOURCES).some((path) =>
        SOURCES[path]?.includes(`'${literal}'`),
      );
      expect(built, `${step.id}: nothing builds ${anchor}`).toBe(true);
    }
  });

  it('rings the two meters and not the yield figures beside them', () => {
    // The user, 2026-08-30. `#civ-yields` is the whole strip — six yield chips
    // *and* the meters — so the anchor is the meters' own wrapper, whose only
    // children are happiness and authority (`chip` in `topBar.ts`).
    const meters = STEPS.find((step) => step.id === 'meters');
    expect(meters?.anchor).toBe('.civ-meters');
    const bar = source('ui/topBar.ts');
    expect(bar).toContain("element('div', 'civ-meters')");
    // Every meter chip is appended to it, and nothing else is.
    expect(bar).toContain('meters.append(button)');
    expect([...bar.matchAll(/meters\.append\(/g)].length).toBe(1);
  });

  it('starts a new game at the first step, and keeps the notes', () => {
    // The user, 2026-08-30: a fresh game begins the sequence again whatever the
    // shelf remembers — progress is about *this* game's opening turns. The
    // one-time notes are a different kind of memory and stand, except on the
    // one edge where the player switched the guide off and on again.
    const text = source('ui/tutorial.ts');
    expect(text).toMatch(/begin\(\) \{[\s\S]*?progress: FIRST_PROGRESS/);
    expect(text).toMatch(/const rekindled = on && !memory\.enabled;/);
    expect(text).toMatch(/rekindled\s*\?\s*\{ enabled: true, progress: FIRST_PROGRESS, seen: \[\] \}/);
    // And a loaded save never starts it — `resume` sets nothing running.
    expect(text).toMatch(/resume\(\) \{\s*running = false;/);
  });
});

/**
 * The two meter notes (the pamphlet ruling, 2026-09-03): the pamphlet gives the
 * cursory version, and the guide says a word the FIRST time each meter bites —
 * happiness below zero, authority over capacity. They ride the existing notes
 * mechanism: a standing fact becomes an event at the one site that can read it
 * (`main.ts`, off the meters' own folds), exactly as `enemySeen` does.
 */
describe('the meter notes', () => {
  it('are one-time notes on the tips table, on their own triggers', () => {
    expect(tipFor({ kind: 'event', event: 'happinessDeficit' }, [])?.id).toBe('unhappy');
    expect(tipFor({ kind: 'event', event: 'authorityOverrun' }, [])?.id).toBe('overreach');
    // Once ever, like every note: the seen list is the whole of the memory.
    expect(tipFor({ kind: 'event', event: 'happinessDeficit' }, ['unhappy'])).toBeNull();
    expect(tipFor({ kind: 'event', event: 'authorityOverrun' }, ['overreach'])).toBeNull();
  });

  it('is fired from the commit funnel off the meters’ own folds', () => {
    const main = source('main.ts');
    // Gated on the note still being wanted (the enemy sweep's economy), and
    // read from `happinessOf`/`authorityOf` — the folds the chips print — so
    // the note cannot disagree with the number it is explaining.
    expect(main).toContain("tutorial.wantsTip('unhappy') && happinessOf(game.state, seat) < 0");
    expect(main).toContain("tutorial.wantsTip('overreach') && authorityOf(game.state, seat) < 0");
    expect(main).toContain("tutorial.note({ kind: 'event', event: 'happinessDeficit' })");
    expect(main).toContain("tutorial.note({ kind: 'event', event: 'authorityOverrun' })");
    expect(main).toContain('noteMeterPain();');
  });
});

/**
 * The pamphlet (`src/ui/pamphlet.ts`): the five-minute read shown once, before
 * the tutorial's first step, and a Compendium page forever after. What is held
 * here is the pure half — the table, the prose rules, the memory and the
 * first-run decision — plus the wiring pins that keep the ordering in
 * `main.ts` honest. The Compendium half (the anchor resolves, the refs point
 * at real pages) lives in `compendium.test.ts`, beside the book it is about.
 */
describe('the pamphlet', () => {
  it('gives every page a unique id, a title and words to say', () => {
    const ids = PAMPHLET_PAGES.map((page) => page.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PAMPHLET_PAGES.length).toBeGreaterThan(5);
    for (const page of PAMPHLET_PAGES) {
      expect(page.title.length, page.id).toBeGreaterThan(0);
      expect(page.lines.length, page.id).toBeGreaterThan(0);
      for (const text of page.lines) {
        expect(text.length, page.id).toBeGreaterThan(20);
      }
    }
  });

  it('keeps every page at caption weight — the re-ruling’s budget', () => {
    // "The screenshot is the hero, the text is caption-weight — a heading and
    // at most two short sentences" (docs/pamphlet.md, re-ruling 2026-09-03).
    // Pinned honestly off the table: two lines at most, one sentence per line,
    // and no line running to a paragraph. A page that needs more prose than
    // this belongs in the Compendium's ordinary entries instead.
    for (const page of PAMPHLET_PAGES) {
      expect(page.lines.length, page.id).toBeLessThanOrEqual(2);
      for (const text of page.lines) {
        const line = stripRefs(text);
        expect(line.length, `${page.id}: ${line}`).toBeLessThanOrEqual(180);
        // One sentence: a full stop may only end the line.
        expect(line, `${page.id}: ${line}`).not.toMatch(/\.\s+\S/);
      }
    }
  });

  it('carries the ruled contents', () => {
    // The spec's own headline items (docs/pamphlet.md), each pinned on one
    // phrase distinctive enough to survive a wording pass: selection, orders,
    // the tree, the draft, the win, the meters, the checklist.
    const all = PAMPHLET_PAGES.flatMap((page) => [
      page.title,
      ...page.lines.map((text) => stripRefs(text)),
    ]).join(' ');
    expect(all).toContain('Left-click');
    expect(all).toContain('right-click');
    expect(all).toContain('technology tree');
    expect(all).toContain('Statecraft');
    expect(all).toContain('Religion');
    expect(all).toContain('twenty beads');
    expect(all).toContain('Magnum Opus');
    expect(all).toContain('Happiness');
    expect(all).toContain('found a second city');
    expect(all).toContain('End Turn');
    expect(all).toContain('barbarian camp');
    expect(all).toContain('Compendium');
  });

  it('leads almost every page with a screenshot under public/pamphlet', () => {
    // Re-ruled 2026-09-03: the heroes are photographs of the real game, marks
    // baked into the captures (the shot list's "mark" column). The files land
    // after the fact, so what the table owes is the address and the caption
    // the frame degrades to while a file is missing.
    let panels = 0;
    for (const page of PAMPHLET_PAGES) {
      if (page.panel === undefined) continue;
      panels += 1;
      expect(page.panel.image, page.id).toMatch(/^\/pamphlet\/[a-z-]+\.png$/);
      expect(page.panel.caption.length, page.id).toBeGreaterThan(10);
    }
    expect(panels).toBeGreaterThanOrEqual(PAMPHLET_PAGES.length - 1);
    // One file per hero: two pages sharing an address would rot together.
    const images = PAMPHLET_PAGES.flatMap((p) => (p.panel ? [p.panel.image] : []));
    expect(new Set(images).size).toBe(images.length);
  });

  it('keeps rule 7 in every sentence, refs stripped first', () => {
    for (const page of PAMPHLET_PAGES) {
      const lines = [page.title, ...(page.panel ? [page.panel.caption] : [])];
      for (const text of page.lines) {
        // A line may *carry* a keyword mark — the printer resolves it — but a
        // stray bracket would reach the screen as plumbing.
        expect(stripRefs(text), page.id).not.toContain('[[');
        lines.push(stripRefs(text));
      }
      for (const line of lines) {
        // No identifier and no digit: the one figure the pamphlet names is
        // spelled ("twenty beads"), the tutorial's own bargain.
        expect(line, line).not.toMatch(/[a-z][A-Z]/);
        expect(line, line).not.toMatch(/\d/);
      }
    }
  });

  it('pages with clamped steps — a pamphlet has a first page and a last', () => {
    const count = PAMPHLET_PAGES.length;
    // The pure half of the pager: back stops at the front cover, next at the
    // last page, and neither wraps.
    expect(pageStep(0, -1, count)).toBe(0);
    expect(pageStep(0, 1, count)).toBe(1);
    expect(pageStep(count - 1, 1, count)).toBe(count - 1);
    expect(pageStep(count - 1, -1, count)).toBe(count - 2);
    expect(pageStep(3, 0, count)).toBe(3);
    // Degenerate shelves answer rather than throw.
    expect(pageStep(0, 1, 0)).toBe(0);
    expect(pageStep(99, 1, count)).toBe(count - 1);
  });

  it('builds the pager off the table: one page, one dot, both steps through pageStep', () => {
    const text = source('ui/pamphlet.ts');
    // One `.pamphlet-page` per table row and one dot each — the DOM is the
    // table's length, never a second count.
    expect(text).toContain('for (const page of PAMPHLET_PAGES)');
    expect(text).toContain('for (const [index, page] of PAMPHLET_PAGES.entries())');
    expect(text).toContain("dot.className = 'pamphlet-dot'");
    // Next and back both price their move through the one clamp.
    expect(text).toContain('show(pageStep(current, -1, sheets.length))');
    expect(text).toContain('show(pageStep(current, 1, sheets.length))');
    expect(text).toContain('back.disabled = current === 0');
    expect(text).toContain('next.disabled = current === sheets.length - 1');
    // And the position is DOM state alone: the only storage writes in the
    // module are the seen-memory's.
    expect(text.match(/storage\.setItem/g)).toHaveLength(1);
  });

  it('remembers being read, and forgives a shelf that throws', () => {
    const storage = fakeStorage();
    expect(readPamphletSeen(storage)).toBe(false);
    writePamphletSeen(storage);
    expect(storage.map.has(PAMPHLET_KEY)).toBe(true);
    expect(readPamphletSeen(storage)).toBe(true);

    expect(readPamphletSeen(brokenStorage)).toBe(false);
    expect(() => writePamphletSeen(brokenStorage)).not.toThrow();

    const junk = fakeStorage();
    junk.map.set(PAMPHLET_KEY, '{not json');
    expect(readPamphletSeen(junk)).toBe(false);
  });

  it('shows for a new player only — a returning player sees neither showing', () => {
    // The first-run decision, held still: a fresh browser with the guide on
    // gets the pamphlet; a browser that has read it never sees the overlay
    // again (the page stays in the Compendium); a player who switched the
    // guide off has asked to be told nothing, front matter included.
    expect(shouldShowPamphlet(false, true)).toBe(true);
    expect(shouldShowPamphlet(true, true)).toBe(false);
    expect(shouldShowPamphlet(false, false)).toBe(false);
    expect(shouldShowPamphlet(true, false)).toBe(false);
  });

  it('opens before the tutorial’s first step, and dismissing it starts the sequence', () => {
    const main = source('main.ts');
    // One place owns the order: `beginOpening` asks the pure decision, shows
    // the pamphlet, and hangs `tutorial.begin()` on its dismissal — so the
    // first coach card can only ever rise after the pamphlet is put away.
    expect(main).toContain('createPamphletOverlay({ storage: saveStorage, root: document.body })');
    expect(main).toContain('shouldShowPamphlet(pamphlet.seen(), tutorial.enabled())');
    expect(main).toContain('pamphlet.show(() => tutorial.begin())');
    // Both new-game sites — boot and adoptGame — go through it; a loaded save
    // takes `tutorial.resume()` and never meets either surface.
    expect([...main.matchAll(/beginOpening\(\);/g)].length).toBe(2);
    expect(main).toMatch(/if \(next === null\) beginOpening\(\);\s*else tutorial\.resume\(\);/);
    expect(main).toMatch(/if \(initial === null\) beginOpening\(\);\s*else tutorial\.resume\(\);/);
  });

  it('marks itself read before handing over, and prints through the descriptor seam', () => {
    const text = source('ui/pamphlet.ts');
    // The memory is written first, so a dismissal that then throws still never
    // shows the pamphlet twice; `onDone` is what raises the tutorial.
    expect(text).toMatch(/function dismiss\(\): void \{\s*writePamphletSeen\(storage\);/);
    // Escape is a dismissal too — same path, same memory, same hand-over.
    expect(text).toMatch(/event\.key !== 'Escape'[\s\S]{0,500}dismiss\(\);/);
    // Every line goes through `setDescriptorText` — the one printer that
    // resolves a keyword mark — so a `[[` can never reach a reader raw.
    expect(text).toContain('setDescriptorText(line, text)');
    // And the missing-file path is designed: the image removes itself and the
    // frame shows the caption; no broken-image glyph, ever.
    expect(text).toContain("img.addEventListener('error'");
  });

  it('tells the reader where it lives afterwards', () => {
    const text = source('ui/pamphlet.ts');
    expect(text).toContain('stays in the Compendium');
    // And the address it means is the entry the book actually shelves.
    expect(PAMPHLET_ENTRY_ID).toBe('intro:pamphlet');
  });
});
