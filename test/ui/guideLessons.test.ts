/**
 * The lesson catalogue (`src/ui/guideLessons.ts`) against the plan
 * (`docs/plans/tutorial.md` §5.3 and §5.4) and against the reducer.
 *
 * The words are batch T3's, so nothing here reads copy. What is held is the
 * shape: the walkthrough's order and what each mode meets, the first-contact
 * lessons the plan names, the user's rulings of 2026-10-15, and that every
 * command a lesson waits for is one the reducer actually has.
 */

import { describe, expect, it } from 'vitest';

import COMMANDS_SOURCE from '../../src/sim/commands.ts?raw';
import { GUIDE_HOSTS, isChoiceHost, type FactCondition, type LessonDef } from '../../src/ui/guideModel';
import { GUIDE_LESSONS, lessonById } from '../../src/ui/guideLessons';
import { walkthroughFor } from '../../src/ui/guideSchedule';

const LESSONS: readonly LessonDef[] = GUIDE_LESSONS;

/** §5.4's first-contact lessons, by group. Government and doctrine are deferred (§10). */
const FIRST_CONTACT: Readonly<Record<string, readonly string[]>> = {
  cards: ['firstHand', 'seatCard', 'fullChairs', 'commission', 'charter', 'levy', 'tendedWork', 'newBand'],
  empire: ['authority', 'happiness', 'workers', 'discovery', 'camps'],
  war: ['forecast', 'warAndPeace', 'capture', 'weariness', 'ranks'],
  faith: ['pantheon', 'prophet', 'followerBelief', 'enhancerBelief', 'caravan', 'greatPerson'],
  endgame: ['wager', 'beads', 'magnumOpus'],
};

/**
 * What §1's table says a Civilization player already knows, and so is not
 * taught to the Civilization mode.
 */
const FAMILIAR_TO_CIV = [
  'happiness',
  'workers',
  'discovery',
  'camps',
  'forecast',
  'warAndPeace',
  'pantheon',
  'prophet',
  'followerBelief',
  'enhancerBelief',
  'caravan',
  'greatPerson',
];

function screensIn(condition: FactCondition): string[] {
  if ('screen' in condition) return [condition.screen];
  if ('all' in condition) return condition.all.flatMap(screensIn);
  if ('any' in condition) return condition.any.flatMap(screensIn);
  if ('not' in condition) return [];
  return [];
}

describe('the catalogue', () => {
  it('gives every lesson a unique ID, a working title, a host and a way to complete', () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of LESSONS) {
      expect(lesson.id, lesson.id).toMatch(/^[a-z][A-Za-z]+$/);
      expect(lesson.workingTitle.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.hosts.length, lesson.id).toBeGreaterThan(0);
      for (const host of lesson.hosts) expect(GUIDE_HOSTS, lesson.id).toContain(host);
      expect(lesson.completes.length, lesson.id).toBeGreaterThan(0);
    }
  });

  it('matches each kind to its switch', () => {
    for (const lesson of LESSONS) {
      if (lesson.kind === 'step') expect(lesson.switch, lesson.id).toBe('walkthrough');
      if (lesson.kind === 'firstContact') expect(lesson.switch, lesson.id).toBe('lessons');
    }
  });

  it('completes every note by reading it', () => {
    for (const lesson of LESSONS.filter((row) => row.kind === 'note')) {
      expect(lesson.completes, lesson.id).toContainEqual({ by: 'acknowledge' });
    }
  });

  it('runs the walkthrough on state triggers, so a lesson there never expires unseen', () => {
    for (const lesson of LESSONS.filter((row) => row.switch === 'walkthrough')) {
      expect(lesson.trigger.kind, lesson.id).toBe('holds');
    }
  });

  it('marks only walkthrough lessons as opportunistic, and covers only first-contact lessons that exist', () => {
    for (const lesson of LESSONS) {
      if (lesson.opportunistic === true) expect(lesson.switch, lesson.id).toBe('walkthrough');
      for (const covered of lesson.covers ?? []) {
        expect(lessonById(covered)?.switch, `${lesson.id} covers ${covered}`).toBe('lessons');
      }
    }
  });

  it('shows a lesson about a mandatory choice inside that choice', () => {
    // A lesson raised by a choice opening must list the choice as a host, or
    // it could never be on screen while its trigger holds.
    for (const lesson of LESSONS) {
      if (lesson.trigger.kind !== 'holds') continue;
      for (const screen of screensIn(lesson.trigger.when)) {
        expect(lesson.hosts, `${lesson.id} waits for ${screen}`).toContain(screen);
      }
    }
    const discovery = lessonById('discovery');
    expect(discovery?.hosts).toEqual(['discoveryOffer']);
    expect(discovery !== undefined && discovery.hosts.every(isChoiceHost)).toBe(true);
  });

  it('names only commands the reducer has', () => {
    const named = new Set<string>();
    for (const lesson of LESSONS) {
      for (const completion of lesson.completes) {
        if (completion.by === 'command') named.add(completion.command);
      }
    }
    // A guide with no action lessons would be a slideshow (principle 4).
    expect(named.size).toBeGreaterThanOrEqual(10);
    for (const command of named) {
      // A lesson waiting for a command the reducer does not have could never
      // be completed by its deed.
      expect(COMMANDS_SOURCE, command).toContain(`type: '${command}';`);
    }
  });
});

describe('the opening walkthrough (§5.3)', () => {
  it('keeps the plan\'s order, closing with a pointer to the library', () => {
    expect(LESSONS.filter((lesson) => lesson.switch === 'walkthrough').map((lesson) => lesson.id)).toEqual([
      'controlsNote',
      'selectSettler',
      'foundCapital',
      'chooseResearch',
      'chooseProduction',
      'explore',
      'endTurn',
      'readTown',
      'firstCard',
      'walkthroughEnd',
    ]);
  });

  it('gives a newcomer all eight lessons and the close', () => {
    expect(walkthroughFor('newcomer')).toEqual([
      { id: 'selectSettler', form: 'full' },
      { id: 'foundCapital', form: 'full' },
      { id: 'chooseResearch', form: 'full' },
      { id: 'chooseProduction', form: 'full' },
      { id: 'explore', form: 'full' },
      { id: 'endTurn', form: 'full' },
      { id: 'readTown', form: 'full' },
      { id: 'firstCard', form: 'full' },
      { id: 'walkthroughEnd', form: 'note' },
    ]);
  });

  it('gives a Civilization player the controls note, lesson 7 as a note, and lesson 8 (§5.1, §5.3)', () => {
    expect(walkthroughFor('civ')).toEqual([
      { id: 'controlsNote', form: 'note' },
      { id: 'readTown', form: 'note' },
      { id: 'firstCard', form: 'full' },
      { id: 'walkthroughEnd', form: 'note' },
    ]);
  });

  it('lets lesson 8 wait for the first draft without stalling the rest', () => {
    const firstCard = lessonById('firstCard');
    expect(firstCard?.opportunistic).toBe(true);
    // A card seated or a hand passed completes it.
    expect(firstCard?.completes).toEqual([
      { by: 'command', command: 'slotOrder' },
      { by: 'command', command: 'skipOrderOffer' },
    ]);
    expect(firstCard?.covers).toEqual(['firstHand', 'seatCard']);
  });

  it('completes the opening deeds by the accepted command or by the facts', () => {
    // Facts satisfy lessons out of order (§6): each of these has a fact path,
    // so a player who did the thing early is never asked to do it again.
    for (const id of ['selectSettler', 'foundCapital', 'chooseResearch', 'chooseProduction', 'endTurn']) {
      expect(
        lessonById(id)?.completes.some((completion) => completion.by === 'fact'),
        id,
      ).toBe(true);
    }
    // Exploring completes on an arrival, not on the move order: an order given
    // with no movement left moves nothing.
    expect(lessonById('explore')?.completes).toEqual([{ by: 'arrival' }]);
  });
});

describe('first-contact lessons (§5.4)', () => {
  it('plans every lesson in the table, in its group', () => {
    for (const [group, ids] of Object.entries(FIRST_CONTACT)) {
      const inGroup = LESSONS.filter(
        (lesson) => lesson.switch === 'lessons' && lesson.group === group,
      ).map((lesson) => lesson.id);
      expect(inGroup, group).toEqual(ids);
    }
    const all = Object.values(FIRST_CONTACT).flat();
    expect(LESSONS.filter((lesson) => lesson.switch === 'lessons').map((lesson) => lesson.id).sort()).toEqual(
      [...all].sort(),
    );
  });

  it('teaches a Civilization player only the systems that are new here', () => {
    for (const lesson of LESSONS.filter((row) => row.switch === 'lessons')) {
      expect(lesson.newcomer, lesson.id).toBe('full');
      expect(lesson.civ, lesson.id).toBe(FAMILIAR_TO_CIV.includes(lesson.id) ? 'none' : 'full');
    }
  });

  it('defers the government and doctrine lessons, and teaches the wager and beads now (the user, 2026-10-15)', () => {
    for (const lesson of LESSONS) {
      expect(`${lesson.id} ${lesson.workingTitle}`, lesson.id).not.toMatch(/government|doctrine/i);
      for (const completion of lesson.completes) {
        if (completion.by !== 'command') continue;
        expect(['adoptGovernment', 'chooseDoctrine'], lesson.id).not.toContain(completion.command);
      }
    }
    expect(lessonById('wager')?.hosts).toEqual(['wagerOffer']);
    expect(lessonById('beads')?.trigger).toEqual({ kind: 'rises', count: 'beads' });
    expect(lessonById('magnumOpus')).toBeDefined();
  });

  it('follows a count for "the first X", where X may already exist in a loaded game', () => {
    for (const id of ['beads', 'newBand', 'ranks', 'workers', 'camps', 'caravan', 'capture', 'prophet']) {
      expect(lessonById(id)?.trigger.kind, id).toBe('rises');
    }
  });

  it('tells a tended work and the three belief hands apart by tag', () => {
    expect(lessonById('tendedWork')?.completes).toEqual([
      { by: 'command', command: 'buildImprovement', tag: 'tendedWork' },
    ]);
    for (const [id, tag] of [
      ['pantheon', 'pantheon'],
      ['followerBelief', 'followerBelief'],
      ['enhancerBelief', 'enhancerBelief'],
    ] as const) {
      expect(lessonById(id)?.completes, id).toEqual([{ by: 'command', command: 'chooseBelief', tag }]);
    }
  });
});
