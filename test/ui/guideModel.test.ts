/**
 * The guide's vocabulary (`src/ui/guideModel.ts`): the condition language, what
 * counts as a deed, the modes and switches, and the source pins that keep every
 * guide module on the interface side of principle 8.
 */

import { describe, expect, it } from 'vitest';

import {
  ALWAYS,
  CHOICE_HOSTS,
  COUNT_NAMES,
  EMPTY_COUNTS,
  EMPTY_FLAGS,
  FLAG_NAMES,
  FRESH_PREFERENCES,
  GUIDE_HOSTS,
  MODE_PLANS,
  answerGuideQuestion,
  completesOnAcknowledge,
  completionMatches,
  conditionHolds,
  formFor,
  isChoiceHost,
  isReplayed,
  setGuideSwitch,
  type LessonCompletion,
  type LessonDef,
} from '../../src/ui/guideModel';
import {
  ARRIVED,
  LOCAL,
  RIVAL,
  SCREEN_CHANGED,
  SELECTION_CHANGED,
  TURN_SETTLED,
  accepted,
  factsOf,
  gotIt,
  refused,
  replayed,
  rivals,
} from './guideHelpers';

const GUIDE_SOURCES = import.meta.glob('../../src/ui/guide*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** The four pure modules batch T1 built. Later guide modules may draw, so the purity pins name these. */
const PURE_MODULES = ['guideModel.ts', 'guideLessons.ts', 'guideSchedule.ts', 'guideStorage.ts'];

function guideSource(name: string): string {
  const key = Object.keys(GUIDE_SOURCES).find((path) => path.endsWith(`/${name}`));
  const text = key === undefined ? undefined : GUIDE_SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) throw new Error(`${name} came back empty`);
  return text;
}

/** The import paths of a source, static and dynamic, type-only included. */
function importsOf(text: string): string[] {
  const paths = [
    ...text.matchAll(/\bfrom\s+'([^']+)'/g),
    ...text.matchAll(/\bimport\s*\(\s*'([^']+)'\s*\)/g),
    ...text.matchAll(/^\s*import\s+'([^']+)'/gm),
  ];
  return paths.map((match) => match[1] ?? '');
}

/** The source with its comments removed, so a word in a docblock is not mistaken for code. */
function codeOf(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
}

describe('conditions over the facts', () => {
  const facts = factsOf({
    host: 'city',
    flags: { atWar: true },
    counts: { beads: 3, citiesOwned: 1 },
  });

  it('reads a flag, a count at or above a value, and the screen on view', () => {
    expect(conditionHolds({ flag: 'atWar' }, facts)).toBe(true);
    expect(conditionHolds({ flag: 'happinessBelowZero' }, facts)).toBe(false);
    expect(conditionHolds({ count: 'beads', atLeast: 3 }, facts)).toBe(true);
    expect(conditionHolds({ count: 'beads', atLeast: 4 }, facts)).toBe(false);
    expect(conditionHolds({ screen: 'city' }, facts)).toBe(true);
    expect(conditionHolds({ screen: 'board' }, facts)).toBe(false);
  });

  it('combines them with all, any and not', () => {
    const war = { flag: 'atWar' } as const;
    const unhappy = { flag: 'happinessBelowZero' } as const;
    expect(conditionHolds({ all: [war, { count: 'citiesOwned', atLeast: 1 }] }, facts)).toBe(true);
    expect(conditionHolds({ all: [war, unhappy] }, facts)).toBe(false);
    expect(conditionHolds({ any: [war, unhappy] }, facts)).toBe(true);
    expect(conditionHolds({ any: [] }, facts)).toBe(false);
    expect(conditionHolds({ not: unhappy }, facts)).toBe(true);
    expect(conditionHolds(ALWAYS, factsOf())).toBe(true);
  });

  it('starts every snapshot from all flags false and all counts zero', () => {
    expect(FLAG_NAMES.length).toBeGreaterThan(0);
    expect(COUNT_NAMES).toContain('turnsPlayed');
    for (const name of FLAG_NAMES) expect(EMPTY_FLAGS[name]).toBe(false);
    for (const name of COUNT_NAMES) expect(EMPTY_COUNTS[name]).toBe(0);
  });
});

describe('what counts as a deed', () => {
  const found: LessonCompletion = { by: 'command', command: 'foundCity' };
  const facts = factsOf();

  it('is an accepted command from the local seat in the live game', () => {
    expect(completionMatches(found, accepted('foundCity'), facts)).toBe(true);
  });

  it('is never a rejected command, a rival or bot command, or a replayed one', () => {
    expect(completionMatches(found, refused('foundCity'), facts)).toBe(false);
    expect(completionMatches(found, rivals('foundCity'), facts)).toBe(false);
    expect(completionMatches(found, replayed('foundCity'), facts)).toBe(false);
    expect(isReplayed(replayed('foundCity'))).toBe(true);
    expect(isReplayed(accepted('foundCity'))).toBe(false);
  });

  it('is never a click: a selection, a screen opening or a card button', () => {
    for (const moment of [SELECTION_CHANGED, SCREEN_CHANGED, gotIt('foundCapital')]) {
      expect(completionMatches(found, moment, facts)).toBe(false);
    }
  });

  it('matches the named command only, and the named use of it when a tag is asked for', () => {
    expect(completionMatches(found, accepted('moveUnit'), facts)).toBe(false);
    const tend: LessonCompletion = { by: 'command', command: 'buildImprovement', tag: 'tendedWork' };
    expect(completionMatches(tend, accepted('buildImprovement'), facts)).toBe(false);
    expect(completionMatches(tend, accepted('buildImprovement', ['tendedWork']), facts)).toBe(true);
    // An untagged completion takes any use of the command.
    const build: LessonCompletion = { by: 'command', command: 'buildImprovement' };
    expect(completionMatches(build, accepted('buildImprovement', ['tendedWork']), facts)).toBe(true);
  });

  it('counts an arrival only for a unit of the local seat, and a turn only when it is live', () => {
    const arrival: LessonCompletion = { by: 'arrival' };
    expect(completionMatches(arrival, ARRIVED, facts)).toBe(true);
    expect(
      completionMatches(arrival, { kind: 'unitArrived', ownerId: RIVAL, replayed: false }, facts),
    ).toBe(false);
    expect(
      completionMatches(arrival, { kind: 'unitArrived', ownerId: LOCAL, replayed: true }, facts),
    ).toBe(false);
    const turn: LessonCompletion = { by: 'turn' };
    expect(completionMatches(turn, TURN_SETTLED, facts)).toBe(true);
    expect(completionMatches(turn, { kind: 'turnSettled', replayed: true }, facts)).toBe(false);
  });

  it('counts a screen when it opens, and only while the guard agrees', () => {
    const town: LessonCompletion = {
      by: 'screen',
      host: 'city',
      when: { count: 'turnsPlayed', atLeast: 1 },
    };
    expect(completionMatches(town, SCREEN_CHANGED, factsOf({ host: 'city' }))).toBe(false);
    expect(
      completionMatches(town, SCREEN_CHANGED, factsOf({ host: 'city', counts: { turnsPlayed: 1 } })),
    ).toBe(true);
    expect(
      completionMatches(town, SCREEN_CHANGED, factsOf({ host: 'board', counts: { turnsPlayed: 1 } })),
    ).toBe(false);
  });

  it('lets a fact complete a lesson at any moment, and leaves Got it to the scheduler', () => {
    const fact: LessonCompletion = { by: 'fact', when: { flag: 'researchChosen' } };
    expect(completionMatches(fact, SELECTION_CHANGED, factsOf({ flags: { researchChosen: true } }))).toBe(
      true,
    );
    expect(completionMatches({ by: 'acknowledge' }, gotIt('x'), facts)).toBe(false);
  });
});

describe('modes and switches', () => {
  it('turns everything on for a newcomer and a Civilization player, and nothing on for an explorer', () => {
    expect(MODE_PLANS.newcomer.switches).toEqual({ walkthrough: true, lessons: true, warnings: true });
    expect(MODE_PLANS.civ.switches).toEqual({ walkthrough: true, lessons: true, warnings: true });
    expect(MODE_PLANS.explore.switches).toEqual({ walkthrough: false, lessons: false, warnings: false });
  });

  it('shows the whole pamphlet, the pages on cards and victory, or none (§5.1)', () => {
    expect(MODE_PLANS.newcomer.pamphlet).toBe('whole');
    expect(MODE_PLANS.civ.pamphlet).toBe('cardsAndVictory');
    expect(MODE_PLANS.explore.pamphlet).toBe('none');
  });

  it('behaves as the newcomer mode until the question is asked', () => {
    expect(FRESH_PREFERENCES.asked).toBe(false);
    expect(FRESH_PREFERENCES.mode).toBe('newcomer');
    expect(FRESH_PREFERENCES.switches).toEqual(MODE_PLANS.newcomer.switches);
  });

  it('asks once, and sets the switches to the chosen mode', () => {
    const civ = answerGuideQuestion(FRESH_PREFERENCES, 'civ');
    expect(civ).toEqual({ mode: 'civ', asked: true, switches: MODE_PLANS.civ.switches });
    // Answering the same again changes nothing, down to the object.
    expect(answerGuideQuestion(civ, 'civ')).toBe(civ);
    // The mode can be changed later, and it resets the switches to its preset.
    const quiet = setGuideSwitch(civ, 'warnings', false);
    const explore = answerGuideQuestion(quiet, 'explore');
    expect(explore.switches).toEqual(MODE_PLANS.explore.switches);
  });

  it('flips each switch on its own, keeping the mode', () => {
    const civ = answerGuideQuestion(FRESH_PREFERENCES, 'civ');
    const noWalkthrough = setGuideSwitch(civ, 'walkthrough', false);
    expect(noWalkthrough.mode).toBe('civ');
    expect(noWalkthrough.switches).toEqual({ walkthrough: false, lessons: true, warnings: true });
    expect(setGuideSwitch(noWalkthrough, 'walkthrough', false)).toBe(noWalkthrough);
  });

  it('decides the form each mode meets a lesson in', () => {
    const lesson: LessonDef = {
      id: 'town',
      kind: 'step',
      switch: 'walkthrough',
      newcomer: 'full',
      civ: 'note',
      group: 'opening',
      hosts: ['board'],
      trigger: { kind: 'holds', when: ALWAYS },
      completes: [{ by: 'arrival' }],
      workingTitle: 'Town',
    };
    expect(formFor(lesson, 'newcomer')).toBe('full');
    expect(formFor(lesson, 'civ')).toBe('note');
    // An explorer who switches help back on gets the newcomer's form.
    expect(formFor(lesson, 'explore')).toBe('full');
    expect(formFor({ ...lesson, civ: 'none' }, 'civ')).toBeNull();
    // A note is always drawn as a note.
    expect(formFor({ ...lesson, kind: 'note' }, 'newcomer')).toBe('note');
    // Got it completes a lesson shown as a note, and only marks an action step seen.
    expect(completesOnAcknowledge(lesson, 'note')).toBe(true);
    expect(completesOnAcknowledge(lesson, 'full')).toBe(false);
  });

  it('names the mandatory choices among the hosts', () => {
    for (const host of CHOICE_HOSTS) expect(GUIDE_HOSTS).toContain(host);
    expect(isChoiceHost('orderOffer')).toBe(true);
    expect(isChoiceHost('wagerOffer')).toBe(true);
    expect(isChoiceHost('board')).toBe(false);
    expect(isChoiceHost('city')).toBe(false);
  });
});

describe('the wiring', () => {
  it('finds the guide modules it pins, and reads their imports', () => {
    for (const name of PURE_MODULES) expect(guideSource(name).length).toBeGreaterThan(100);
    // The reader itself, on the forms an import can take, so the pins below
    // cannot pass by reading nothing.
    expect(
      importsOf("import type { A } from '../sim/state';\nconst b = import('../sim/b');\nimport './c';"),
    ).toEqual(['../sim/state', '../sim/b', './c']);
    expect(importsOf(guideSource('guideSchedule.ts'))).toEqual([
      './guideModel',
      './guideLessons',
      './guideStorage',
    ]);
  });

  it('keeps every guide module out of the simulation', () => {
    // Types included: the guide is an interface fact and a save carries none
    // of it, so a dependency on the rules is the seam this pin keeps shut.
    for (const [path, text] of Object.entries(GUIDE_SOURCES)) {
      const intoSim = importsOf(text).filter((target) => /(^|\/)sim(\/|$)/.test(target));
      expect(intoSim, path).toEqual([]);
    }
  });

  it('lets the pure modules import only each other', () => {
    // Nothing reaches the rules by way of another interface module either.
    for (const name of PURE_MODULES) {
      for (const target of importsOf(guideSource(name))) {
        expect(target, `${name} imports ${target}`).toMatch(/^\.\/guide[A-Z][A-Za-z]*$/);
      }
    }
  });

  it('keeps the pure modules free of the page, timers, randomness, the clock and the seeded generator', () => {
    for (const name of PURE_MODULES) {
      const code = codeOf(guideSource(name));
      expect(code, name).not.toMatch(/\b(document|window|navigator|localStorage|sessionStorage)\s*\./);
      expect(code, name).not.toMatch(/\bHTML[A-Za-z]*Element\b/);
      expect(code, name).not.toMatch(/\b(setTimeout|setInterval|requestAnimationFrame)\b/);
      expect(code, name).not.toMatch(/\bMath\.random\b/);
      expect(code, name).not.toMatch(/\bDate\b|\bperformance\s*\./);
      expect(code, name).not.toMatch(/\brng\b/);
      expect(code, name).not.toMatch(/\bGameState\b/);
    }
  });
});
