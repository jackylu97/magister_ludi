/**
 * The scheduler (`src/ui/guideSchedule.ts`): which lesson is on screen after
 * each moment.
 *
 * Most of this file runs the engine against a small test catalogue, so each
 * rule of §5.4 and §6 of `docs/plans/tutorial.md` is checked on rows built for
 * it: deeds count only when accepted, local and live; facts complete lessons
 * out of order; at most one lesson shows; a mandatory choice owns the screen;
 * stale contexts are dropped; nothing replays after a load; a skipped
 * walkthrough is gone for that game only (§10). The last block
 * walks the real catalogue through a newcomer's, a Civilization player's and
 * an explorer's opening.
 */

import { describe, expect, it } from 'vitest';

import {
  ALWAYS,
  FRESH_PREFERENCES,
  answerGuideQuestion,
  setGuideSwitch,
  type CountName,
  type FactCondition,
  type GuideMode,
  type GuideSwitch,
  type LessonCompletion,
  type LessonDef,
  type LessonTrigger,
} from '../../src/ui/guideModel';
import { EMPTY_SESSION, guideStep, restartWalkthrough } from '../../src/ui/guideSchedule';
import {
  FRESH_GUIDE_MEMORY,
  markCompleted,
  runOf,
  withPreferences,
  type GuideMemory,
} from '../../src/ui/guideStorage';
import {
  ARRIVED,
  LOCAL,
  RIVAL,
  SCREEN_CHANGED,
  SELECTION_CHANGED,
  TURN_SETTLED,
  accepted,
  driveGuide,
  factsOf,
  factsWith,
  gotIt,
  later,
  refused,
  replayed,
  rivals,
} from './guideHelpers';

// --- a small catalogue -------------------------------------------------------

const has = (count: CountName, value = 1): FactCondition => ({ count, atLeast: value });
const holds = (when: FactCondition): LessonTrigger => ({ kind: 'holds', when });
const ACK: LessonCompletion = { by: 'acknowledge' };

function walk(row: Partial<LessonDef> & { id: string }): LessonDef {
  return {
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'none',
    group: 'opening',
    hosts: ['board'],
    trigger: holds(ALWAYS),
    completes: [ACK],
    workingTitle: row.id,
    ...row,
  };
}

function contact(row: Partial<LessonDef> & { id: string }): LessonDef {
  return {
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'empire',
    hosts: ['board'],
    trigger: holds(ALWAYS),
    completes: [ACK],
    workingTitle: row.id,
    ...row,
  };
}

const TEST_LESSONS: readonly LessonDef[] = [
  walk({ id: 'wNote', kind: 'note', newcomer: 'none', civ: 'note' }),
  walk({
    id: 'wFound',
    trigger: holds(has('settlersOwned')),
    completes: [
      { by: 'command', command: 'foundCity' },
      { by: 'fact', when: has('citiesOwned') },
    ],
  }),
  walk({
    id: 'wResearch',
    hosts: ['board', 'techTree'],
    trigger: holds(has('citiesOwned')),
    completes: [
      { by: 'command', command: 'chooseResearch' },
      { by: 'fact', when: { flag: 'researchChosen' } },
    ],
  }),
  walk({
    id: 'wBuild',
    hosts: ['board', 'city'],
    trigger: holds(has('citiesOwned')),
    completes: [
      { by: 'command', command: 'setCityProduction' },
      { by: 'fact', when: { flag: 'productionSet' } },
    ],
  }),
  walk({ id: 'wMove', completes: [{ by: 'arrival' }] }),
  walk({
    id: 'wTown',
    civ: 'note',
    hosts: ['board', 'city'],
    trigger: holds({ all: [has('citiesOwned'), has('turnsPlayed')] }),
    completes: [{ by: 'screen', host: 'city', when: has('turnsPlayed') }],
  }),
  walk({
    id: 'wCard',
    civ: 'full',
    hosts: ['orderOffer', 'board'],
    trigger: holds({ any: [{ screen: 'orderOffer' }, has('cardsUnseated')] }),
    completes: [
      { by: 'command', command: 'slotOrder' },
      { by: 'command', command: 'skipOrderOffer' },
    ],
    opportunistic: true,
    covers: ['cHand'],
  }),
  walk({ id: 'wEnd', kind: 'note', civ: 'full' }),
  contact({
    id: 'cHand',
    hosts: ['orderOffer'],
    trigger: holds({ screen: 'orderOffer' }),
    completes: [{ by: 'command', command: 'chooseOrder' }],
  }),
  contact({ id: 'cWar', civ: 'none', trigger: holds({ flag: 'atWar' }) }),
  contact({ id: 'cBeads', trigger: { kind: 'rises', count: 'beads' } }),
  contact({
    id: 'cChairs',
    trigger: { kind: 'rises', count: 'cardsHeld', when: { flag: 'cardsOutnumberChairs' } },
  }),
  contact({
    id: 'cTend',
    trigger: holds({ flag: 'tendAvailable' }),
    completes: [{ by: 'command', command: 'buildImprovement', tag: 'tendedWork' }],
  }),
];

const NEW_GAME = { kind: 'newGame', runKey: 'run-1' } as const;
const SETTLER = factsOf({ counts: { settlersOwned: 1 } });
const TOWN = factsOf({ counts: { citiesOwned: 1 } });

function memoryFor(mode: GuideMode, change?: (memory: GuideMemory) => GuideMemory): GuideMemory {
  const memory = withPreferences(FRESH_GUIDE_MEMORY, answerGuideQuestion(FRESH_PREFERENCES, mode));
  return change === undefined ? memory : change(memory);
}

function switched(memory: GuideMemory, which: GuideSwitch, on: boolean): GuideMemory {
  return withPreferences(memory, setGuideSwitch(memory.preferences, which, on));
}

/** A newcomer with the walkthrough switched off, so first-contact lessons can be watched alone. */
function lessonsOnly(): GuideMemory {
  return memoryFor('newcomer', (memory) => switched(memory, 'walkthrough', false));
}

/** A driver on the test catalogue, past its new-game moment. */
function started(memory: GuideMemory, facts = factsOf()) {
  const guide = driveGuide(TEST_LESSONS, memory);
  guide.step(NEW_GAME, facts);
  return guide;
}

// --- the walkthrough ---------------------------------------------------------

describe('the walkthrough', () => {
  it('shows its first lesson when a new game begins', () => {
    const guide = driveGuide(TEST_LESSONS);
    expect(guide.step(NEW_GAME, SETTLER)).toBe('wFound');
    expect(guide.showing()).toEqual({ id: 'wFound', kind: 'step', host: 'board' });
    expect(runOf(guide.memory(), 'run-1')?.walkthrough).toBe('running');
  });

  it('advances only on an accepted, live command from the local seat', () => {
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    expect(guide.step(accepted('foundCity'), TOWN)).toBe('wResearch');
    // Research is never chosen in these facts, so only the command can complete the lesson.
    for (const moment of [
      refused('chooseResearch'),
      rivals('chooseResearch'),
      replayed('chooseResearch'),
      SELECTION_CHANGED,
      SCREEN_CHANGED,
    ]) {
      expect(guide.step(moment, TOWN)).toBe('wResearch');
    }
    expect(guide.memory().completed).not.toContain('wResearch');
    expect(guide.step(accepted('chooseResearch'), TOWN)).toBe('wBuild');
  });

  it('lets a deed done early complete its lesson, so the walk skips it', () => {
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    guide.step(accepted('foundCity'), TOWN);
    // Production is set while the card still asks for research.
    const built = factsWith(TOWN, { flags: { productionSet: true } });
    expect(guide.step(accepted('setCityProduction'), built)).toBe('wResearch');
    expect(guide.memory().completed).toContain('wBuild');
    expect(guide.step(accepted('chooseResearch'), built)).toBe('wMove');
  });

  it('lets facts alone complete lessons, out of order', () => {
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    // The town appears with research already chosen: two lessons done at once.
    const ahead = factsWith(TOWN, { flags: { researchChosen: true } });
    expect(guide.step(SELECTION_CHANGED, ahead)).toBe('wBuild');
    expect(guide.memory().completed).toEqual(['wFound', 'wResearch']);
  });

  it('shows a lesson only on its own hosts, and waits for its trigger', () => {
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    guide.step(accepted('foundCity'), TOWN);
    expect(guide.step(SCREEN_CHANGED, factsWith(TOWN, { host: 'techTree' }))).toBe('wResearch');
    expect(guide.showing()?.host).toBe('techTree');
    expect(guide.step(SCREEN_CHANGED, factsWith(TOWN, { host: 'city' }))).toBeNull();
    expect(guide.step(SCREEN_CHANGED, TOWN)).toBe('wResearch');

    const ready = factsWith(TOWN, { flags: { researchChosen: true, productionSet: true } });
    expect(guide.step(accepted('chooseResearch'), ready)).toBe('wMove');
    // The town lesson needs a turn to have passed.
    expect(guide.step(ARRIVED, ready)).toBeNull();
    const nextTurn = factsWith(ready, { counts: { turnsPlayed: 1 } });
    expect(guide.step(TURN_SETTLED, nextTurn)).toBe('wTown');
    // Opening the town completes it; the close is a board lesson and waits.
    expect(guide.step(SCREEN_CHANGED, factsWith(nextTurn, { host: 'city' }))).toBeNull();
    expect(guide.step(SCREEN_CHANGED, nextTurn)).toBe('wEnd');
    expect(guide.showing()?.kind).toBe('note');
    expect(guide.step(gotIt('wEnd'), nextTurn)).toBeNull();
    expect(guide.memory().completed).toContain('wEnd');
  });

  it('opens the town only after a turn for the town lesson', () => {
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    // Opening the town on the first turn, to set production, is not the deed.
    guide.step(SCREEN_CHANGED, factsWith(TOWN, { host: 'city' }));
    expect(guide.memory().completed).not.toContain('wTown');
  });

  it('lets an opportunistic lesson show when its moment comes, and holds back what it covers', () => {
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    const ready = factsWith(TOWN, { flags: { researchChosen: true, productionSet: true } });
    expect(guide.step(accepted('foundCity'), ready)).toBe('wMove');
    // A hand is dealt before the walk reaches the card lesson. The choice owns
    // the screen and its lesson shows inside it; the covered lesson waits.
    expect(guide.step(SCREEN_CHANGED, factsWith(ready, { host: 'orderOffer' }))).toBe('wCard');
    expect(guide.showing()?.host).toBe('orderOffer');
    // Taking a card leaves it unseated: the lesson stays on the board to ask for a chair.
    const held = factsWith(ready, { counts: { cardsUnseated: 1 } });
    expect(guide.step(accepted('chooseOrder'), held)).toBe('wCard');
    // Seating it completes the lesson and the lesson it covers.
    expect(guide.step(accepted('slotOrder'), ready)).toBe('wMove');
    expect(guide.memory().completed).toEqual(expect.arrayContaining(['wCard', 'cHand']));
  });

  it('puts a lesson away with Later until the turn settles', () => {
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    guide.step(accepted('foundCity'), TOWN);
    expect(guide.step(later('wResearch'), TOWN)).toBeNull();
    expect(guide.step(SELECTION_CHANGED, TOWN)).toBeNull();
    expect(guide.step(TURN_SETTLED, factsWith(TOWN, { counts: { turnsPlayed: 1 } }))).toBe('wResearch');
  });

  it('is skipped for this game only, and shows again in the next game while unfinished', () => {
    // The user's ruling of 2026-10-16 (`docs/plans/tutorial.md` section 10).
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    guide.step(accepted('foundCity'), TOWN);
    expect(guide.step({ kind: 'walkthroughSkipped' }, TOWN)).toBeNull();
    expect(runOf(guide.memory(), 'run-1')?.walkthrough).toBe('skipped');
    // The skip is this game's, recorded on its run. The switch is the player's
    // setting, and stays on.
    expect(guide.memory().preferences.switches.walkthrough).toBe(true);
    // With the walkthrough gone, the first hand is taught by its own lesson.
    expect(guide.step(SCREEN_CHANGED, factsWith(TOWN, { host: 'orderOffer' }))).toBe('cHand');
    // A reload of this game finds it still skipped. (Its research lesson would
    // show here if the run were still running.)
    const reloaded = driveGuide(TEST_LESSONS, guide.memory());
    expect(reloaded.step({ kind: 'resumedGame', runKey: 'run-1' }, TOWN)).toBeNull();
    // The next game runs it again, from the first lesson not yet completed:
    // the founding was done, so it asks for research once there is a town.
    expect(guide.step({ kind: 'newGame', runKey: 'run-2' }, SETTLER)).toBeNull();
    expect(runOf(guide.memory(), 'run-2')?.walkthrough).toBe('running');
    expect(guide.step(accepted('foundCity'), TOWN)).toBe('wResearch');
  });

  it('keeps a finished walkthrough finished in the next game', () => {
    const walkthrough = TEST_LESSONS.filter((lesson) => lesson.switch === 'walkthrough');
    const finished = markCompleted(FRESH_GUIDE_MEMORY, walkthrough.map((lesson) => lesson.id));
    const guide = started(finished, SETTLER);
    expect(runOf(guide.memory(), 'run-1')?.walkthrough).toBe('running');
    const ready = factsWith(TOWN, { counts: { turnsPlayed: 1 } });
    expect(guide.step(accepted('foundCity'), ready)).toBeNull();
    expect(guide.step(TURN_SETTLED, ready)).toBeNull();
  });

  it('continues in a loaded game this browser knows, and never starts in one it does not', () => {
    const first = started(FRESH_GUIDE_MEMORY, SETTLER);
    first.step(accepted('foundCity'), TOWN);
    // A reload: the memory survives, the session does not.
    const known = driveGuide(TEST_LESSONS, first.memory());
    expect(known.step({ kind: 'resumedGame', runKey: 'run-1' }, TOWN)).toBe('wResearch');
    const unknown = driveGuide(TEST_LESSONS, first.memory());
    expect(unknown.step({ kind: 'resumedGame', runKey: null }, TOWN)).toBeNull();
    const imported = driveGuide(TEST_LESSONS, first.memory());
    expect(imported.step({ kind: 'resumedGame', runKey: 'run-9' }, TOWN)).toBeNull();
    expect(runOf(imported.memory(), 'run-9')?.walkthrough).toBe('none');
  });

  it('does not teach a lesson again in the next game once it is completed', () => {
    const first = started(FRESH_GUIDE_MEMORY, SETTLER);
    first.step(accepted('foundCity'), TOWN);
    // The second game asks for research once a town exists, not for the founding.
    const second = driveGuide(TEST_LESSONS, first.memory());
    expect(second.step({ kind: 'newGame', runKey: 'run-2' }, SETTLER)).toBeNull();
    expect(second.step(accepted('foundCity'), TOWN)).toBe('wResearch');
  });
});

// --- first-contact lessons ---------------------------------------------------

describe('first-contact lessons', () => {
  it('shows a lesson at first contact, and never again once it is read', () => {
    const guide = started(lessonsOnly());
    const war = factsOf({ flags: { atWar: true } });
    expect(guide.step(SELECTION_CHANGED, war)).toBe('cWar');
    expect(guide.showing()).toEqual({ id: 'cWar', kind: 'firstContact', host: 'board' });
    expect(guide.step(gotIt('cWar'), war)).toBeNull();
    expect(guide.memory().completed).toContain('cWar');
    guide.step(SELECTION_CHANGED, factsOf());
    expect(guide.step(SELECTION_CHANGED, war)).toBeNull();
  });

  it('marks a lesson with a deed only seen on Got it, and completes it on the deed', () => {
    const guide = started(lessonsOnly());
    const tend = factsOf({ flags: { tendAvailable: true } });
    expect(guide.step(SELECTION_CHANGED, tend)).toBe('cTend');
    guide.step(gotIt('cTend'), tend);
    expect(guide.memory().seen).toContain('cTend');
    expect(guide.memory().completed).not.toContain('cTend');
    // Seen is enough to keep it from showing again.
    guide.step(SELECTION_CHANGED, factsOf());
    expect(guide.step(SELECTION_CHANGED, tend)).toBeNull();
    // Any other improvement is not the deed; a tended work is.
    guide.step(accepted('buildImprovement'), tend);
    expect(guide.memory().completed).not.toContain('cTend');
    guide.step(accepted('buildImprovement', ['tendedWork']), tend);
    expect(guide.memory().completed).toContain('cTend');
  });

  it('shows one lesson at a time, keeping the one on screen', () => {
    const guide = started(lessonsOnly());
    // A war and a first bead arrive together: the earlier row shows first.
    const both = factsOf({ flags: { atWar: true }, counts: { beads: 1 } });
    expect(guide.step(SELECTION_CHANGED, both)).toBe('cWar');
    expect(guide.step(gotIt('cWar'), both)).toBe('cBeads');
    // A war arriving while the bead lesson is up does not push it off.
    const again = started(lessonsOnly());
    expect(again.step(SELECTION_CHANGED, factsOf({ counts: { beads: 1 } }))).toBe('cBeads');
    expect(again.step(SELECTION_CHANGED, both)).toBe('cBeads');
  });

  it('takes the screen from a walkthrough lesson, which comes back afterwards', () => {
    // A first-contact lesson is about something happening now; the walkthrough
    // lesson will still be there once it is read.
    const guide = started(FRESH_GUIDE_MEMORY, SETTLER);
    expect(guide.step(accepted('foundCity'), TOWN)).toBe('wResearch');
    const war = factsWith(TOWN, { flags: { atWar: true } });
    expect(guide.step(SELECTION_CHANGED, war)).toBe('cWar');
    expect(guide.step(gotIt('cWar'), war)).toBe('wResearch');
  });

  it('gives a mandatory choice the screen, and brings the board lesson back after it', () => {
    const guide = started(lessonsOnly());
    const war = factsOf({ flags: { atWar: true } });
    expect(guide.step(SELECTION_CHANGED, war)).toBe('cWar');
    expect(guide.step(SCREEN_CHANGED, factsWith(war, { host: 'orderOffer' }))).toBe('cHand');
    expect(guide.showing()?.host).toBe('orderOffer');
    expect(guide.step(accepted('chooseOrder'), war)).toBe('cWar');
    expect(guide.memory().seen).not.toContain('cWar');
  });

  it('drops a stale context, counting it seen only if it was on screen', () => {
    // On screen when the war ends: it has been seen.
    const shown = started(lessonsOnly());
    shown.step(SELECTION_CHANGED, factsOf({ flags: { atWar: true } }));
    expect(shown.step(SELECTION_CHANGED, factsOf())).toBeNull();
    expect(shown.memory().seen).toContain('cWar');

    // Waiting behind another lesson when the war ends: never shown late, and
    // still to come at the next war.
    const waiting = started(lessonsOnly());
    expect(waiting.step(SELECTION_CHANGED, factsOf({ counts: { beads: 1 } }))).toBe('cBeads');
    expect(waiting.step(SELECTION_CHANGED, factsOf({ flags: { atWar: true }, counts: { beads: 1 } }))).toBe(
      'cBeads',
    );
    const peace = factsOf({ counts: { beads: 1 } });
    waiting.step(SELECTION_CHANGED, peace);
    expect(waiting.step(gotIt('cBeads'), peace)).toBeNull();
    expect(waiting.memory().seen).not.toContain('cWar');
    expect(waiting.step(SELECTION_CHANGED, factsWith(peace, { flags: { atWar: true } }))).toBe('cWar');
  });

  it('keeps a raised lesson live until the turn settles, then waits for the next rise', () => {
    const guide = started(lessonsOnly());
    // The first bead arrives while the town screen is open.
    const bead = factsOf({ host: 'city', counts: { beads: 1 } });
    expect(guide.step(SELECTION_CHANGED, bead)).toBeNull();
    const later1 = factsOf({ counts: { beads: 1, turnsPlayed: 1 } });
    expect(guide.step(TURN_SETTLED, later1)).toBeNull();
    expect(guide.step(SCREEN_CHANGED, later1)).toBeNull();
    expect(guide.step(SELECTION_CHANGED, factsWith(later1, { counts: { beads: 2 } }))).toBe('cBeads');
  });

  it('raises a guarded lesson only when its condition holds at the rise', () => {
    const guide = started(lessonsOnly());
    expect(guide.step(SELECTION_CHANGED, factsOf({ counts: { cardsHeld: 1 } }))).toBeNull();
    // The chairs fill without a new card: no moment of choice yet.
    expect(
      guide.step(
        SELECTION_CHANGED,
        factsOf({ flags: { cardsOutnumberChairs: true }, counts: { cardsHeld: 1 } }),
      ),
    ).toBeNull();
    expect(
      guide.step(
        SELECTION_CHANGED,
        factsOf({ flags: { cardsOutnumberChairs: true }, counts: { cardsHeld: 2 } }),
      ),
    ).toBe('cChairs');
  });

  it('sends a lesson put away with Later back to wait for its next contact', () => {
    const guide = started(lessonsOnly());
    const war = factsOf({ flags: { atWar: true } });
    guide.step(SELECTION_CHANGED, war);
    expect(guide.step(later('cWar'), war)).toBeNull();
    expect(guide.step(SELECTION_CHANGED, war)).toBeNull();
    expect(guide.memory().seen).not.toContain('cWar');
    guide.step(SELECTION_CHANGED, factsOf());
    expect(guide.step(SELECTION_CHANGED, war)).toBe('cWar');
  });

  it('counts a lesson seen when the turn settles with it on screen', () => {
    const guide = started(lessonsOnly());
    const war = factsOf({ flags: { atWar: true } });
    guide.step(SELECTION_CHANGED, war);
    expect(guide.step(TURN_SETTLED, factsWith(war, { counts: { turnsPlayed: 1 } }))).toBeNull();
    expect(guide.memory().seen).toContain('cWar');
  });

  it('treats everything as new in a new game, and everything as history in a loaded one', () => {
    const atWarFromTheStart = factsOf({ flags: { atWar: true } });
    const fresh = driveGuide(TEST_LESSONS, lessonsOnly());
    expect(fresh.step(NEW_GAME, atWarFromTheStart)).toBe('cWar');

    const loaded = driveGuide(TEST_LESSONS, lessonsOnly());
    const history = factsOf({ flags: { atWar: true }, counts: { beads: 3 } });
    expect(loaded.step({ kind: 'resumedGame', runKey: null }, history)).toBeNull();
    expect(loaded.step(SELECTION_CHANGED, history)).toBeNull();
    // A new contact after the load is live: a fourth bead, a war that ends and starts again.
    expect(loaded.step(SELECTION_CHANGED, factsWith(history, { counts: { beads: 4 } }))).toBe('cBeads');
    loaded.step(gotIt('cBeads'), factsOf({ counts: { beads: 4 } }));
    expect(loaded.step(SELECTION_CHANGED, factsOf({ flags: { atWar: true }, counts: { beads: 4 } }))).toBe(
      'cWar',
    );
  });

  it('meets each mode and switch with the right lessons', () => {
    const war = factsOf({ flags: { atWar: true } });
    const warAndBead = factsWith(war, { counts: { beads: 1 } });
    // A Civilization player already knows war and peace; beads are new here.
    const civ = started(memoryFor('civ', (memory) => switched(memory, 'walkthrough', false)));
    expect(civ.step(SELECTION_CHANGED, war)).toBeNull();
    expect(civ.step(SELECTION_CHANGED, warAndBead)).toBe('cBeads');
    // Lessons switched off: nothing.
    const off = started(memoryFor('newcomer', (memory) => switched(memory, 'lessons', false)));
    expect(off.step(SELECTION_CHANGED, war)).toBeNull();
    // Let me explore: nothing on its own.
    const explore = started(memoryFor('explore'));
    expect(explore.step(SELECTION_CHANGED, war)).toBeNull();
    expect(explore.step(SELECTION_CHANGED, warAndBead)).toBeNull();
    // An explorer who switches the lessons back on gets the newcomer's set.
    const curious = started(memoryFor('explore', (memory) => switched(memory, 'lessons', true)));
    expect(curious.step(SELECTION_CHANGED, war)).toBe('cWar');
  });

  it('records deeds with every switch off, so a lesson is never taught after it is done', () => {
    const explore = started(memoryFor('explore'));
    explore.step(accepted('chooseOrder'), factsOf());
    expect(explore.memory().completed).toContain('cHand');
    // Switched on later, the lesson for something already done stays away.
    explore.setMemory(switched(explore.memory(), 'lessons', true));
    expect(explore.step(SCREEN_CHANGED, factsOf({ host: 'orderOffer' }))).toBeNull();
  });
});

// --- the moment rules --------------------------------------------------------

describe('one moment', () => {
  it('returns the same memory object when nothing stored changed', () => {
    const first = guideStep({
      memory: FRESH_GUIDE_MEMORY,
      session: EMPTY_SESSION,
      moment: NEW_GAME,
      facts: SETTLER,
      catalogue: TEST_LESSONS,
    });
    const second = guideStep({
      memory: first.memory,
      session: first.session,
      moment: SELECTION_CHANGED,
      facts: SETTLER,
      catalogue: TEST_LESSONS,
    });
    expect(second.memory).toBe(first.memory);
    expect(second.showing?.id).toBe('wFound');
  });

  it('ignores a replayed moment entirely', () => {
    const first = guideStep({
      memory: FRESH_GUIDE_MEMORY,
      session: EMPTY_SESSION,
      moment: NEW_GAME,
      facts: SETTLER,
      catalogue: TEST_LESSONS,
    });
    for (const moment of [
      replayed('foundCity'),
      { kind: 'unitArrived', ownerId: LOCAL, replayed: true } as const,
      { kind: 'turnSettled', replayed: true } as const,
    ]) {
      const after = guideStep({
        memory: first.memory,
        session: first.session,
        moment,
        facts: TOWN,
        catalogue: TEST_LESSONS,
      });
      expect(after.memory).toBe(first.memory);
      expect(after.session).toBe(first.session);
      expect(after.showing?.id).toBe('wFound');
    }
  });

  it('takes a new baseline when a different seat sits down', () => {
    const guide = started(lessonsOnly());
    // The rival seat is already at war: history for that seat, not a contact.
    const rivalAtWar = factsOf({ localPlayerId: RIVAL, flags: { atWar: true } });
    expect(guide.step(SELECTION_CHANGED, rivalAtWar)).toBeNull();
    expect(guide.session().seat).toBe(RIVAL);
    guide.step(SELECTION_CHANGED, factsOf({ localPlayerId: RIVAL }));
    expect(guide.step(SELECTION_CHANGED, rivalAtWar)).toBe('cWar');
  });

  it('takes a safe baseline when the first moment is not a game starting', () => {
    const guide = driveGuide(TEST_LESSONS);
    // No new-game moment: treated as a loaded game, so no walkthrough and no history.
    expect(guide.step(SELECTION_CHANGED, factsOf({ flags: { atWar: true }, counts: { settlersOwned: 1 } }))).toBeNull();
  });
});

// --- the real catalogue ------------------------------------------------------

describe('the real catalogue', () => {
  it('walks a newcomer through the whole opening by deeds', () => {
    const guide = driveGuide(undefined);
    let facts = factsOf({ counts: { settlersOwned: 1 } });
    expect(guide.step(NEW_GAME, facts)).toBe('selectSettler');

    facts = factsWith(facts, { flags: { settlerSelected: true } });
    expect(guide.step(SELECTION_CHANGED, facts)).toBe('foundCapital');

    facts = factsOf({ counts: { citiesOwned: 1 } });
    expect(guide.step(accepted('foundCity'), facts)).toBe('chooseResearch');
    facts = factsWith(facts, { host: 'techTree' });
    expect(guide.step(SCREEN_CHANGED, facts)).toBe('chooseResearch');

    facts = factsWith(facts, { flags: { researchChosen: true } });
    // The next lesson is for the board and the town, so nothing shows over the tree.
    expect(guide.step(accepted('chooseResearch'), facts)).toBeNull();
    facts = factsWith(facts, { host: 'board' });
    expect(guide.step(SCREEN_CHANGED, facts)).toBe('chooseProduction');

    facts = factsWith(facts, { flags: { productionSet: true } });
    expect(guide.step(accepted('setCityProduction'), facts)).toBe('explore');
    expect(guide.step(ARRIVED, facts)).toBe('endTurn');

    facts = factsWith(facts, { counts: { turnsPlayed: 1 } });
    expect(guide.step(TURN_SETTLED, facts)).toBe('readTown');
    expect(guide.step(SCREEN_CHANGED, factsWith(facts, { host: 'city' }))).toBeNull();
    expect(guide.step(SCREEN_CHANGED, facts)).toBe('walkthroughEnd');
    expect(guide.showing()?.kind).toBe('note');
    expect(guide.step(gotIt('walkthroughEnd'), facts)).toBeNull();

    // Turns later, the first hand.
    facts = factsWith(facts, { counts: { turnsPlayed: 6 } });
    guide.step(TURN_SETTLED, facts);
    expect(guide.step(SCREEN_CHANGED, factsWith(facts, { host: 'orderOffer' }))).toBe('firstCard');
    facts = factsWith(facts, { counts: { cardsHeld: 1, cardsUnseated: 1 } });
    expect(guide.step(accepted('chooseOrder'), facts)).toBe('firstCard');
    facts = factsWith(facts, { counts: { cardsUnseated: 0 } });
    expect(guide.step(accepted('slotOrder'), facts)).toBeNull();

    expect(guide.memory().completed).toEqual(
      expect.arrayContaining([
        'selectSettler',
        'foundCapital',
        'chooseResearch',
        'chooseProduction',
        'explore',
        'endTurn',
        'readTown',
        'walkthroughEnd',
        'firstCard',
        'firstHand',
        'seatCard',
      ]),
    );
  });

  it('gives a Civilization player the controls note, lesson 7 as a note, and the close', () => {
    const guide = driveGuide(undefined, memoryFor('civ'));
    let facts = factsOf({ counts: { settlersOwned: 1 } });
    expect(guide.step(NEW_GAME, facts)).toBe('controlsNote');
    expect(guide.showing()?.kind).toBe('note');
    expect(guide.step(gotIt('controlsNote'), facts)).toBeNull();

    facts = factsOf({ counts: { citiesOwned: 1 } });
    expect(guide.step(accepted('foundCity'), facts)).toBeNull();
    // Founding is recorded even though this mode is never taught it.
    expect(guide.memory().completed).toContain('foundCapital');

    facts = factsWith(facts, { counts: { turnsPlayed: 1 } });
    expect(guide.step(TURN_SETTLED, facts)).toBe('readTown');
    expect(guide.showing()).toEqual({ id: 'readTown', kind: 'note', host: 'board' });
    expect(guide.step(gotIt('readTown'), facts)).toBe('walkthroughEnd');
    expect(guide.step(gotIt('walkthroughEnd'), facts)).toBeNull();
    // Lesson 8 is kept, and waits for the first hand.
    expect(guide.step(SCREEN_CHANGED, factsWith(facts, { host: 'orderOffer' }))).toBe('firstCard');
  });

  it('brings a walkthrough skipped in one game back at the start of the next', () => {
    const guide = driveGuide(undefined);
    const start = factsOf({ counts: { settlersOwned: 1 } });
    expect(guide.step(NEW_GAME, start)).toBe('selectSettler');
    expect(guide.step({ kind: 'walkthroughSkipped' }, start)).toBeNull();
    expect(guide.step(SELECTION_CHANGED, start)).toBeNull();
    // Nothing of it was done, so the next game starts it at the first lesson.
    expect(guide.step({ kind: 'newGame', runKey: 'run-2' }, start)).toBe('selectSettler');
  });

  it('leaves an explorer alone', () => {
    const guide = driveGuide(undefined, memoryFor('explore'));
    let facts = factsOf({ counts: { settlersOwned: 1 } });
    expect(guide.step(NEW_GAME, facts)).toBeNull();
    facts = factsOf({ counts: { citiesOwned: 1, beads: 1 }, flags: { atWar: true } });
    expect(guide.step(accepted('foundCity'), facts)).toBeNull();
    expect(guide.step(SCREEN_CHANGED, factsWith(facts, { host: 'orderOffer' }))).toBeNull();
    expect(runOf(guide.memory(), 'run-1')?.walkthrough).toBe('none');
  });

  it('replays the walkthrough from the first lesson an established empire has not done', () => {
    const guide = driveGuide(undefined);
    const empire = factsOf({
      flags: { researchChosen: true, productionSet: true },
      counts: { citiesOwned: 3, turnsPlayed: 40 },
    });
    expect(guide.step({ kind: 'resumedGame', runKey: 'run-5' }, empire)).toBeNull();
    guide.setMemory(restartWalkthrough(guide.memory(), 'run-5'));
    expect(runOf(guide.memory(), 'run-5')?.walkthrough).toBe('running');
    // Founding, research and production are done by the facts; exploring is next.
    expect(guide.step(SELECTION_CHANGED, empire)).toBe('explore');
  });
});
