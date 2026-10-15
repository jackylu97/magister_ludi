/**
 * The scheduler: after each moment, which lesson (if any) is on screen.
 *
 * `guideStep` is a pure function of the memory, the session, the moment and a
 * fresh facts snapshot. The adapter (batch T6) calls it at exactly the moments
 * listed on `GuideMoment` (an accepted action, the turn settling, a screen
 * opening or closing, the selection changing, a new or loaded game, a press on
 * the lesson card) and at no other time. There is no timer, no polling and no
 * per-frame scan; a call walks a catalogue of a few dozen rows.
 *
 * The rules (§5.4 and §6 of `docs/plans/tutorial.md`)
 * ---------------------------------------------------
 * 1. **At most one lesson is on screen.** A first-contact lesson that is
 *    showing stays until it is closed, completed, its moment passes, or the
 *    turn settles; nothing else pushes it off. A walkthrough lesson that is
 *    showing gives way to a first-contact lesson, because the first-contact
 *    lesson is about something happening now and the walkthrough lesson will
 *    still be there afterwards (version 1's rule).
 * 2. **A mandatory choice owns the screen first.** A lesson shows only on the
 *    hosts it lists (`LessonDef.hosts`), so while a choice is open only that
 *    choice's own lesson can show, inside it. A board lesson that was showing
 *    steps aside without being marked seen, and comes back when the choice
 *    closes if its moment is still live.
 * 3. **Stale contexts are dropped.** A lesson whose trigger no longer holds is
 *    not shown late. If it was on screen when its moment passed, it counts as
 *    seen; if it never got on screen, it waits for its next live contact.
 * 4. **No lesson replays history after a load.** A loaded game takes a
 *    baseline: a `holds` trigger that is already true raises nothing until it
 *    has been false and become true again, and a `rises` trigger compares
 *    against the loaded counts. Replayed commands change nothing at all.
 * 5. **Deeds and facts complete lessons out of order**, whether or not the
 *    lesson is on screen and whatever the switches say: a lesson the player
 *    has already done is never taught afterwards.
 * 6. **Only an accepted, live command by the local seat is a deed**
 *    (`completionMatches` in `guideModel.ts`).
 *
 * The session
 * -----------
 * What this file remembers between moments within one sitting lives in
 * `GuideSession` and is never stored. Losing it on a reload is the point: a
 * reload is a new baseline, so nothing from before it is replayed.
 *
 * How batches T5 and T6 use it
 * ----------------------------
 * - Hold one `GuideStore` (`createGuideStore(window.localStorage)`) and one
 *   session, starting from `EMPTY_SESSION`.
 * - At each moment, build the local seat's `GuideFacts`, call `guideStep` with
 *   `store.read()` as the memory (so a change made in the options is seen),
 *   then `store.write(result.memory)` (nothing happens when it is unchanged),
 *   keep `result.session`, and hand `result.showing` to the coach surface.
 * - A new game reports `newGame` with a key from `newRunKey(store.read())`,
 *   and the key is kept beside the save slot. A loaded game reports
 *   `resumedGame` with that key, or `null` when there is none.
 * - Every dispatch site reports its command result once, with `accepted` set
 *   from `result.ok`; replaying a saved log reports nothing, or reports with
 *   `replayed: true`.
 * - The options change the preferences with `answerGuideQuestion` and
 *   `setGuideSwitch`, and "Reset lessons" is `resetLessons`; the landing asks
 *   its question while `preferences.asked` is false.
 */

import {
  EMPTY_COUNTS,
  completesOnAcknowledge,
  completionMatches,
  conditionHolds,
  formFor,
  isReplayed,
  setGuideSwitch,
  type GuideFacts,
  type GuideHost,
  type GuideMode,
  type GuideMoment,
  type LessonDef,
  type LessonKind,
} from './guideModel';
import { GUIDE_LESSONS, lessonById } from './guideLessons';
import {
  forgetLessons,
  markCompleted,
  markSeen,
  resumeRun,
  runOf,
  setRunWalkthrough,
  startRun,
  withPreferences,
  type GuideMemory,
  type RunProgress,
} from './guideStorage';

// --- the shapes --------------------------------------------------------------

/** A lesson raised by a count going up, and the turn that raise belongs to. */
export interface RaisedLesson {
  readonly id: string;
  readonly turn: number;
}

/** What the scheduler remembers between moments within one sitting. Never stored. */
export interface GuideSession {
  /** The run being played, or `null` when the loaded game's run is unknown. */
  readonly runKey: string | null;
  /** The seat the baseline was taken for. A different seat takes a new baseline. */
  readonly seat: number | null;
  /** The previous moment's facts, to tell when a count went up. */
  readonly previous: GuideFacts | null;
  /**
   * First-contact lessons with a `holds` trigger that may be raised: their
   * condition has been false at some point in this sitting, or the game is new.
   * "Later" takes a lesson off this list until its condition is false again.
   */
  readonly armed: readonly string[];
  /** First-contact lessons with a `rises` trigger whose count went up this turn. */
  readonly raised: readonly RaisedLesson[];
  /** Walkthrough lessons put away with "Later", until the turn settles. */
  readonly snoozed: readonly string[];
  /** The one lesson on screen. */
  readonly visible: string | null;
}

/** The session before any moment. The first moment takes a baseline. */
export const EMPTY_SESSION: GuideSession = {
  runKey: null,
  seat: null,
  previous: null,
  armed: [],
  raised: [],
  snoozed: [],
  visible: null,
};

/** What the coach surface (batch T5) draws. */
export interface GuideShowing {
  readonly id: string;
  /**
   * How to draw it. A lesson shown in its short form is a `note`, whatever its
   * own kind, which is how a Civilization player sees walkthrough lesson 7.
   * A `step` has no "Got it" button: the deed is the button.
   */
  readonly kind: LessonKind;
  /** Where it is drawn: on the board, or inside the screen that is open. */
  readonly host: GuideHost;
}

export interface GuideStepInput {
  readonly memory: GuideMemory;
  readonly session: GuideSession;
  readonly moment: GuideMoment;
  readonly facts: GuideFacts;
  /** The lessons to schedule. The real catalogue unless a test passes its own. */
  readonly catalogue?: readonly LessonDef[];
}

export interface GuideStepResult {
  /**
   * The memory after this moment: the same object when nothing that is stored
   * changed, so the caller writes only when it differs.
   */
  readonly memory: GuideMemory;
  readonly session: GuideSession;
  /** The lesson on screen now, or `null`. */
  readonly showing: GuideShowing | null;
}

// --- one moment --------------------------------------------------------------

export function guideStep(input: GuideStepInput): GuideStepResult {
  const catalogue = input.catalogue ?? GUIDE_LESSONS;
  const { moment, facts } = input;
  let memory = input.memory;
  let session = input.session;

  // Replayed history changes nothing, and is not even a new baseline.
  if (isReplayed(moment)) {
    const lesson = session.visible === null ? undefined : lessonById(session.visible, catalogue);
    return {
      memory,
      session,
      showing: lesson === undefined ? null : showingOf(lesson, memory.preferences.mode, facts.host),
    };
  }

  // A new game, a loaded game, or a different seat at the screen: a baseline.
  if (moment.kind === 'newGame') {
    const walkthrough = memory.preferences.switches.walkthrough ? 'running' : 'none';
    memory = startRun(memory, moment.runKey, walkthrough);
    session = baseline(catalogue, facts, moment.runKey, 'new');
  } else if (moment.kind === 'resumedGame') {
    if (moment.runKey !== null) memory = resumeRun(memory, moment.runKey);
    session = baseline(catalogue, facts, moment.runKey, 'loaded');
  } else if (session.seat !== facts.localPlayerId) {
    session = baseline(catalogue, facts, session.runKey, 'loaded');
  }

  // What the moment itself asks for.
  ({ memory, session } = applyMoment(catalogue, memory, session, moment));

  // Deeds and facts complete lessons, on screen or not.
  memory = completeLessons(catalogue, memory, moment, facts);

  // Triggers: arm what is false, raise what went up.
  session = armAndRaise(catalogue, session, facts);

  // Keep what is on screen if it still belongs there, or choose again.
  let context: Context = {
    catalogue,
    memory,
    session,
    facts,
    mode: memory.preferences.mode,
    run: runOf(memory, session.runKey),
  };
  const kept = session.visible === null ? undefined : lessonById(session.visible, catalogue);
  if (kept !== undefined && !isEligible(kept, context) && leftBecauseStale(kept, context)) {
    // Its moment passed while it was on screen: it has been seen.
    memory = markSeen(memory, [kept.id]);
    context = { ...context, memory };
  }
  const chosen = choose(kept, context);

  session = { ...session, previous: facts, visible: chosen?.id ?? null };
  return {
    memory,
    session,
    showing: chosen === undefined ? null : showingOf(chosen, context.mode, facts.host),
  };
}

/**
 * The walkthrough lessons a mode meets, in order, with the form each takes.
 * For the coach card's chapter line and the lesson library.
 */
export function walkthroughFor(
  mode: GuideMode,
  catalogue: readonly LessonDef[] = GUIDE_LESSONS,
): { readonly id: string; readonly form: 'full' | 'note' }[] {
  const lessons: { id: string; form: 'full' | 'note' }[] = [];
  for (const lesson of catalogue) {
    if (lesson.switch !== 'walkthrough') continue;
    const form = formFor(lesson, mode);
    if (form !== null) lessons.push({ id: lesson.id, form });
  }
  return lessons;
}

/**
 * "Replay the walkthrough" from the lesson library: its lessons are forgotten
 * and it runs in this game again. Lessons whose facts already hold complete
 * again at the next moment, so a replay in an established empire starts at the
 * first lesson it has not already done.
 */
export function restartWalkthrough(
  memory: GuideMemory,
  runKey: string,
  catalogue: readonly LessonDef[] = GUIDE_LESSONS,
): GuideMemory {
  const ids = catalogue.filter((lesson) => lesson.switch === 'walkthrough').map((lesson) => lesson.id);
  return setRunWalkthrough(resumeRun(forgetLessons(memory, ids), runKey), runKey, 'running');
}

// --- the steps of a moment ---------------------------------------------------

/**
 * A fresh session for a new or a loaded game.
 *
 * A new game has no history, so every first-contact lesson is armed and counts
 * are compared against zero. A loaded game's present is all history: only
 * lessons whose condition is false are armed, and counts are compared against
 * the loaded values.
 */
function baseline(
  catalogue: readonly LessonDef[],
  facts: GuideFacts,
  runKey: string | null,
  game: 'new' | 'loaded',
): GuideSession {
  const armed: string[] = [];
  for (const lesson of catalogue) {
    if (lesson.switch !== 'lessons' || lesson.trigger.kind !== 'holds') continue;
    if (game === 'new' || !conditionHolds(lesson.trigger.when, facts)) armed.push(lesson.id);
  }
  return {
    runKey,
    seat: facts.localPlayerId,
    previous: game === 'new' ? { ...facts, counts: EMPTY_COUNTS } : facts,
    armed,
    raised: [],
    snoozed: [],
    visible: null,
  };
}

/** The card's own buttons, skipping the walkthrough, and the turn settling. */
function applyMoment(
  catalogue: readonly LessonDef[],
  memory: GuideMemory,
  session: GuideSession,
  moment: GuideMoment,
): { memory: GuideMemory; session: GuideSession } {
  switch (moment.kind) {
    case 'acknowledged': {
      // "Got it". A lesson with nothing left to do is completed; a lesson that
      // still has a deed is only seen, and the deed completes it later.
      const lesson = lessonById(moment.lessonId, catalogue);
      if (lesson !== undefined) {
        const form = formFor(lesson, memory.preferences.mode);
        memory = completesOnAcknowledge(lesson, form)
          ? markCompleted(memory, [lesson.id, ...(lesson.covers ?? [])])
          : markSeen(memory, [lesson.id]);
      }
      return { memory, session: hide(session, moment.lessonId) };
    }
    case 'dismissed': {
      // "Later". A walkthrough lesson comes back when the turn settles; a
      // first-contact lesson comes back at its next live contact.
      const lesson = lessonById(moment.lessonId, catalogue);
      if (lesson !== undefined && lesson.switch === 'walkthrough') {
        session = { ...session, snoozed: [...without(session.snoozed, lesson.id), lesson.id] };
      } else if (lesson !== undefined) {
        session = {
          ...session,
          armed: without(session.armed, lesson.id),
          raised: session.raised.filter((raise) => raise.id !== lesson.id),
        };
      }
      return { memory, session: hide(session, moment.lessonId) };
    }
    case 'walkthroughSkipped': {
      // Skipping ends the walkthrough in this game and switches it off for the
      // games after, as version 1's Skip switched the whole tutorial off. The
      // options can switch it back on.
      if (session.runKey !== null) memory = setRunWalkthrough(memory, session.runKey, 'skipped');
      memory = withPreferences(memory, setGuideSwitch(memory.preferences, 'walkthrough', false));
      const showing = session.visible === null ? undefined : lessonById(session.visible, catalogue);
      return {
        memory,
        session: showing?.switch === 'walkthrough' ? hide(session, showing.id) : session,
      };
    }
    case 'turnSettled': {
      // Snoozes end with the turn. A first-contact lesson still on screen when
      // the turn settles has had its moment: it counts as seen and makes room
      // for the next one, so an ignored card never holds the screen for good.
      session = { ...session, snoozed: [] };
      const showing = session.visible === null ? undefined : lessonById(session.visible, catalogue);
      if (showing !== undefined && showing.switch === 'lessons') {
        memory = markSeen(memory, [showing.id]);
        session = hide(session, showing.id);
      }
      return { memory, session };
    }
    default:
      return { memory, session };
  }
}

/** Every lesson this moment's deed or these facts complete, with the lessons they cover. */
function completeLessons(
  catalogue: readonly LessonDef[],
  memory: GuideMemory,
  moment: GuideMoment,
  facts: GuideFacts,
): GuideMemory {
  const done: string[] = [];
  for (const lesson of catalogue) {
    if (memory.completed.includes(lesson.id)) continue;
    if (lesson.completes.some((completion) => completionMatches(completion, moment, facts))) {
      done.push(lesson.id, ...(lesson.covers ?? []));
    }
  }
  return markCompleted(memory, done);
}

/**
 * Arms every `holds` lesson whose condition is false, and raises every `rises`
 * lesson whose count went up since the previous moment (while its condition,
 * if it has one, holds). Raises from an earlier turn are dropped: their moment
 * has passed.
 */
function armAndRaise(
  catalogue: readonly LessonDef[],
  session: GuideSession,
  facts: GuideFacts,
): GuideSession {
  const turn = facts.counts.turnsPlayed;
  let armed = session.armed;
  let raised = session.raised.filter((raise) => raise.turn === turn);
  const previous = session.previous;
  for (const lesson of catalogue) {
    if (lesson.switch !== 'lessons') continue;
    const trigger = lesson.trigger;
    if (trigger.kind === 'holds') {
      if (!armed.includes(lesson.id) && !conditionHolds(trigger.when, facts)) {
        armed = [...armed, lesson.id];
      }
      continue;
    }
    const rose = previous !== null && facts.counts[trigger.count] > previous.counts[trigger.count];
    if (rose && (trigger.when === undefined || conditionHolds(trigger.when, facts))) {
      raised = [...raised.filter((raise) => raise.id !== lesson.id), { id: lesson.id, turn }];
    }
  }
  return { ...session, armed, raised };
}

// --- who may be on screen ----------------------------------------------------

/** What every eligibility question in one moment reads. */
interface Context {
  readonly catalogue: readonly LessonDef[];
  readonly memory: GuideMemory;
  readonly session: GuideSession;
  readonly facts: GuideFacts;
  readonly mode: GuideMode;
  readonly run: RunProgress | undefined;
}

/**
 * The lesson on screen after this moment.
 *
 * A first-contact lesson already on screen stays. Otherwise the first eligible
 * first-contact lesson in catalogue order wins, then the walkthrough lesson
 * already on screen, then the first eligible walkthrough lesson.
 */
function choose(kept: LessonDef | undefined, context: Context): LessonDef | undefined {
  const keep = kept !== undefined && isEligible(kept, context) ? kept : undefined;
  if (keep?.switch === 'lessons') return keep;
  const contact = context.catalogue.find(
    (lesson) => lesson.switch === 'lessons' && isEligible(lesson, context),
  );
  if (contact !== undefined) return contact;
  if (keep !== undefined) return keep;
  return context.catalogue.find(
    (lesson) => lesson.switch === 'walkthrough' && isEligible(lesson, context),
  );
}

/** Whether a lesson may be on screen right now. */
function isEligible(lesson: LessonDef, context: Context): boolean {
  const { memory, session, facts, mode } = context;
  if (memory.completed.includes(lesson.id)) return false;
  if (formFor(lesson, mode) === null) return false;
  if (!memory.preferences.switches[lesson.switch]) return false;
  if (!lesson.hosts.includes(facts.host)) return false;

  if (lesson.switch === 'walkthrough') {
    if (context.run?.walkthrough !== 'running') return false;
    if (session.snoozed.includes(lesson.id)) return false;
    // Walkthrough lessons follow a state; a `rises` row there is a catalogue
    // mistake the tests catch, and never shows.
    if (lesson.trigger.kind !== 'holds' || !conditionHolds(lesson.trigger.when, facts)) return false;
    return lesson.opportunistic === true || earlierLessonsDone(lesson, context);
  }

  if (memory.seen.includes(lesson.id)) return false;
  if (coveredByWaitingWalkthrough(lesson, context)) return false;
  return triggerLive(lesson, context);
}

/** A walkthrough lesson waits for every earlier one this mode meets, except the opportunistic ones. */
function earlierLessonsDone(lesson: LessonDef, context: Context): boolean {
  for (const earlier of context.catalogue) {
    if (earlier === lesson) return true;
    if (earlier.switch !== 'walkthrough' || earlier.opportunistic === true) continue;
    if (formFor(earlier, context.mode) === null) continue;
    if (!context.memory.completed.includes(earlier.id)) return false;
  }
  return true;
}

/** Whether a walkthrough lesson that teaches this one is still to come in this game. */
function coveredByWaitingWalkthrough(lesson: LessonDef, context: Context): boolean {
  if (!context.memory.preferences.switches.walkthrough) return false;
  if (context.run?.walkthrough !== 'running') return false;
  return context.catalogue.some(
    (walkthrough) =>
      walkthrough.switch === 'walkthrough' &&
      (walkthrough.covers ?? []).includes(lesson.id) &&
      formFor(walkthrough, context.mode) !== null &&
      !context.memory.completed.includes(walkthrough.id),
  );
}

/**
 * Whether a first-contact lesson's trigger is live: armed and holding, or
 * raised this turn. Raises from earlier turns are already gone (`armAndRaise`
 * drops them before anything asks).
 */
function triggerLive(lesson: LessonDef, context: Context): boolean {
  const { session, facts } = context;
  const trigger = lesson.trigger;
  if (trigger.kind === 'holds') {
    return session.armed.includes(lesson.id) && conditionHolds(trigger.when, facts);
  }
  return (
    session.raised.some((raise) => raise.id === lesson.id) &&
    (trigger.when === undefined || conditionHolds(trigger.when, facts))
  );
}

/**
 * Whether a first-contact lesson that was on screen left because its moment
 * passed, rather than because a screen opened over it or a switch went off.
 * Only the first counts as seen; after the second it can come back.
 */
function leftBecauseStale(lesson: LessonDef, context: Context): boolean {
  if (lesson.switch !== 'lessons') return false;
  if (context.memory.completed.includes(lesson.id)) return false;
  return !triggerLive(lesson, context);
}

function showingOf(lesson: LessonDef, mode: GuideMode, host: GuideHost): GuideShowing {
  return { id: lesson.id, kind: formFor(lesson, mode) === 'note' ? 'note' : lesson.kind, host };
}

function hide(session: GuideSession, id: string): GuideSession {
  return session.visible === id ? { ...session, visible: null } : session;
}

function without(list: readonly string[], id: string): readonly string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : list;
}
