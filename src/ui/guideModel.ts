/**
 * The guide's vocabulary: what the lesson engine knows about the game, the
 * lessons it can teach, and the player's choice of how much help to get.
 *
 * This is version 2 of the tutorial (`docs/plans/tutorial.md`, batch T1).
 * Version 1 is `tutorial.ts`: eleven steps in a fixed order plus a list of
 * one-time notes, keyed to step numbers. Version 2 gives every lesson a stable
 * ID, describes when a lesson appears and when it is done in terms of a small
 * snapshot of facts, and lets the player pick one of three modes and flip three
 * switches independently (§5.1 of the plan).
 *
 * The guide modules
 * -----------------
 * - `guideModel.ts` (this file): the facts snapshot, the moments the interface
 *   reports, the condition language, the lesson definition, and the modes and
 *   switches.
 * - `guideLessons.ts`: the catalogue, one row per lesson the plan names.
 * - `guideSchedule.ts`: which lesson, if any, is on screen after a moment.
 * - `guideStorage.ts`: the memory in `localStorage`, and the migration from
 *   version 1.
 *
 * Interface only
 * --------------
 * The guide modules import nothing from `src/sim/`, and nothing outside the
 * guide modules themselves (`test/ui/guideModel.test.ts` pins both). They never
 * see a `GameState`: a later adapter (batch T6) reads the game through the
 * existing readers and hands the guide the plain objects declared here. The
 * guide never issues a command, never touches the save and never reads
 * `state.rng`, so turning it on or off cannot change what a seed produces
 * (principle 8). Command names are therefore plain strings here, checked
 * against the reducer's source by `test/ui/guideLessons.test.ts` rather than by
 * the compiler.
 */

// --- modes and switches ------------------------------------------------------

/**
 * The answer to the landing's one question, "How much guidance would you
 * like?" (§5.1):
 * - `newcomer`: "I'm new to games like this".
 * - `civ`: "I've played Civilization".
 * - `explore`: "Let me explore".
 */
export type GuideMode = 'newcomer' | 'civ' | 'explore';

export const GUIDE_MODES: readonly GuideMode[] = ['newcomer', 'civ', 'explore'];

/**
 * The three kinds of help, each switched on and off on its own (§5.1, after
 * Civ VII and Humankind). Warnings are batch T7's channel; the switch is kept
 * here so the preferences are complete from the start.
 */
export type GuideSwitch = 'walkthrough' | 'lessons' | 'warnings';

export type GuideSwitches = Readonly<Record<GuideSwitch, boolean>>;

/** The switch a lesson belongs to. Warnings are not lessons. */
export type LessonSwitch = Exclude<GuideSwitch, 'warnings'>;

/** What the player has chosen. Stored in the guide's memory, never in a save. */
export interface GuidePreferences {
  /** The mode chosen at the landing, or `newcomer` until the question is answered. */
  readonly mode: GuideMode;
  /**
   * Whether the landing has asked the question. It is asked once, and the answer
   * can be changed later from the options.
   */
  readonly asked: boolean;
  readonly switches: GuideSwitches;
}

/** Which form of each lesson a mode shows. See `LessonDef.newcomer` and `.civ`. */
export type GuideAudience = 'newcomer' | 'civ';

/** Everything a mode turns on. */
export interface ModePlan {
  /** The switches the mode sets when it is chosen. The player may flip each one later. */
  readonly switches: GuideSwitches;
  /**
   * Which pamphlet pages open the first game: all of them, only the pages on
   * cards and victory, or none (§5.1). The pages themselves are batch T3's.
   */
  readonly pamphlet: 'whole' | 'cardsAndVictory' | 'none';
  /**
   * Which form of each lesson this mode shows. "Let me explore" switches
   * everything off, so its audience only matters if the player switches
   * something back on. Then they get the full newcomer set for that switch,
   * because they asked for that kind of help by name.
   */
  readonly audience: GuideAudience;
}

/**
 * What each mode turns on (§5.1).
 * - Newcomer: the whole pamphlet, the walkthrough, every first-contact lesson
 *   and the warnings.
 * - Civilization player: the pamphlet's pages on cards and victory, the short
 *   form of the walkthrough (see the catalogue's `civ` column), the lessons on
 *   systems that are new in this game, and the warnings.
 * - Explore: no automatic guidance. The lesson library and the switches stay
 *   available on demand.
 */
export const MODE_PLANS: Readonly<Record<GuideMode, ModePlan>> = {
  newcomer: {
    switches: { walkthrough: true, lessons: true, warnings: true },
    pamphlet: 'whole',
    audience: 'newcomer',
  },
  civ: {
    switches: { walkthrough: true, lessons: true, warnings: true },
    pamphlet: 'cardsAndVictory',
    audience: 'civ',
  },
  explore: {
    switches: { walkthrough: false, lessons: false, warnings: false },
    pamphlet: 'none',
    audience: 'newcomer',
  },
};

/**
 * The preferences of a browser that has never answered the question.
 *
 * The guide behaves as the newcomer mode until the question is answered, which
 * matches version 1 (the tutorial was on for a browser that had never said).
 */
export const FRESH_PREFERENCES: GuidePreferences = {
  mode: 'newcomer',
  asked: false,
  switches: MODE_PLANS.newcomer.switches,
};

/**
 * The landing's question answered, or the mode changed later from the options.
 *
 * Choosing a mode sets all three switches to that mode's defaults: the mode is
 * a preset, and the switches are how the player adjusts it afterwards. Returns
 * the same object when nothing changes, so a caller can skip a write.
 */
export function answerGuideQuestion(prefs: GuidePreferences, mode: GuideMode): GuidePreferences {
  const switches = MODE_PLANS[mode].switches;
  if (prefs.asked && prefs.mode === mode && sameSwitches(prefs.switches, switches)) return prefs;
  return { mode, asked: true, switches: { ...switches } };
}

/** One switch flipped, the mode and the other switches kept. Same object when nothing changes. */
export function setGuideSwitch(
  prefs: GuidePreferences,
  which: GuideSwitch,
  on: boolean,
): GuidePreferences {
  if (prefs.switches[which] === on) return prefs;
  return { ...prefs, switches: { ...prefs.switches, [which]: on } };
}

function sameSwitches(a: GuideSwitches, b: GuideSwitches): boolean {
  return a.walkthrough === b.walkthrough && a.lessons === b.lessons && a.warnings === b.warnings;
}

// --- where a lesson can show -------------------------------------------------

/**
 * What the player is looking at: the board, or the screen open over it.
 *
 * A lesson shows only on the hosts it lists, which is how "help for a screen
 * sits inside that screen" and "help never covers a screen's own controls"
 * (§6, the interface contract) reach the scheduler. These are the guide's own
 * names, not element IDs; the adapter maps each open screen to one of them.
 */
export type GuideHost =
  /** No screen is open. */
  | 'board'
  /** The pamphlet is open. No lesson shows over it. */
  | 'pamphlet'
  | 'city'
  | 'techTree'
  /** The screen where cards are seated in chairs. */
  | 'statecraft'
  | 'religion'
  | 'trade'
  | 'diplomacy'
  /** The fight preview shown while an enemy is hovered with a unit selected. */
  | 'combatForecast'
  // The mandatory choices. Each owns the screen while it is open.
  /** A hand of cards dealt by the draft. */
  | 'orderOffer'
  | 'discoveryOffer'
  | 'pantheonOffer'
  | 'followerOffer'
  | 'enhancerOffer'
  | 'greatPersonOffer'
  | 'wagerOffer'
  /** Annex, puppet or raze a captured town. */
  | 'captureChoice'
  /** Any other screen: the Compendium, the ledger, the saves. No lesson shows there. */
  | 'other';

export const GUIDE_HOSTS: readonly GuideHost[] = [
  'board',
  'pamphlet',
  'city',
  'techTree',
  'statecraft',
  'religion',
  'trade',
  'diplomacy',
  'combatForecast',
  'orderOffer',
  'discoveryOffer',
  'pantheonOffer',
  'followerOffer',
  'enhancerOffer',
  'greatPersonOffer',
  'wagerOffer',
  'captureChoice',
  'other',
];

/**
 * The hosts that are mandatory choices (§5.4: "a mandatory choice owns the
 * screen first, and its own lesson shows inside it"). While one is open, only a
 * lesson that lists it can be on screen. The coach surface (batch T5) draws a
 * lesson on one of these inside the choice rather than beside it.
 */
export const CHOICE_HOSTS: readonly GuideHost[] = [
  'orderOffer',
  'discoveryOffer',
  'pantheonOffer',
  'followerOffer',
  'enhancerOffer',
  'greatPersonOffer',
  'wagerOffer',
  'captureChoice',
];

export function isChoiceHost(host: GuideHost): boolean {
  return CHOICE_HOSTS.includes(host);
}

// --- the facts snapshot ------------------------------------------------------

/**
 * Yes-or-no facts about the local seat.
 *
 * Every field is something the adapter (batch T6) reads off the existing
 * readers, for the local seat only, at the moments listed on `GuideMoment`.
 * Comparisons such as "below zero" are made by the adapter, so the guide never
 * needs the numbers behind them.
 */
export interface GuideFlags {
  /** One of the seat's settlers is the selected piece. */
  readonly settlerSelected: boolean;
  /** The seat is researching something. */
  readonly researchChosen: boolean;
  /** At least one of the seat's towns has something in production. */
  readonly productionSet: boolean;
  /** The seat holds more cards that need a chair than it has chairs. */
  readonly cardsOutnumberChairs: boolean;
  /** A held card offers a levy, and one of the seat's towns may levy now. */
  readonly levyAvailable: boolean;
  /** One of the seat's workers may tend a hex now (a tended work is open to it). */
  readonly tendAvailable: boolean;
  /** The seat's authority is below zero. */
  readonly authorityBelowZero: boolean;
  /** The seat has exactly one town and a settler that could found a second. */
  readonly secondTownInProspect: boolean;
  /** The seat's happiness is below zero. */
  readonly happinessBelowZero: boolean;
  /** The seat is at war with another empire, whichever side declared. */
  readonly atWar: boolean;
  /** War weariness is one of the lines in the seat's happiness. */
  readonly wearinessShowing: boolean;
  /** The seat may begin the Magnum Opus. */
  readonly opusBuildable: boolean;
}

/**
 * Counts about the local seat. A lesson can wait for a count to reach a value,
 * or appear at the moment a count goes up (`LessonTrigger`'s `rises`).
 */
export interface GuideCounts {
  /**
   * World turns resolved since this game began: 0 on the first turn. The
   * adapter subtracts the game's starting turn from the current one, so no
   * lesson depends on which number the first turn carries.
   */
  readonly turnsPlayed: number;
  readonly citiesOwned: number;
  readonly settlersOwned: number;
  /** Cards the seat holds that need a chair to work. Charters need none and are not counted. */
  readonly cardsHeld: number;
  /** Of those, how many sit in no chair. */
  readonly cardsUnseated: number;
  readonly commissionsSeated: number;
  readonly chartersHeld: number;
  /** The band of the decks being dealt now: 0 for the first band. */
  readonly cardBand: number;
  readonly workersOwned: number;
  /** Barbarian camps the seat knows about. */
  readonly campsSeen: number;
  /** Towns the seat holds that it took by force. */
  readonly townsCaptured: number;
  /** The seat's units with at least one rank. */
  readonly veteransOwned: number;
  readonly prophetsOwned: number;
  readonly caravansOwned: number;
  readonly beads: number;
}

export type FlagName = keyof GuideFlags;
export type CountName = keyof GuideCounts;

/**
 * Everything the guide knows about the game at one moment.
 *
 * A plain object, built fresh by the adapter at each moment it reports. It is
 * never a `GameState` and never holds one, which is what keeps the guide on the
 * interface side of principle 8.
 */
export interface GuideFacts {
  /** The seat at this screen. Lessons are for this seat alone; multiplayer is deferred (§10). */
  readonly localPlayerId: number;
  /** What the player is looking at right now. */
  readonly host: GuideHost;
  readonly flags: GuideFlags;
  readonly counts: GuideCounts;
}

/** Every flag false. A starting point for building facts, and the shape tests check against. */
export const EMPTY_FLAGS: GuideFlags = {
  settlerSelected: false,
  researchChosen: false,
  productionSet: false,
  cardsOutnumberChairs: false,
  levyAvailable: false,
  tendAvailable: false,
  authorityBelowZero: false,
  secondTownInProspect: false,
  happinessBelowZero: false,
  atWar: false,
  wearinessShowing: false,
  opusBuildable: false,
};

/** Every count zero. The scheduler compares a new game's first snapshot against this. */
export const EMPTY_COUNTS: GuideCounts = {
  turnsPlayed: 0,
  citiesOwned: 0,
  settlersOwned: 0,
  cardsHeld: 0,
  cardsUnseated: 0,
  commissionsSeated: 0,
  chartersHeld: 0,
  cardBand: 0,
  workersOwned: 0,
  campsSeen: 0,
  townsCaptured: 0,
  veteransOwned: 0,
  prophetsOwned: 0,
  caravansOwned: 0,
  beads: 0,
};

export const FLAG_NAMES = Object.keys(EMPTY_FLAGS) as readonly FlagName[];
export const COUNT_NAMES = Object.keys(EMPTY_COUNTS) as readonly CountName[];

// --- conditions over the facts -----------------------------------------------

/**
 * A question about one snapshot, written as data so a catalogue row can carry
 * it.
 *
 * Deliberately small: a flag, a count at or above a value, the screen on view,
 * and the three ways of combining them. Anything more particular is a new flag
 * the adapter computes, which keeps the rules of the game out of the catalogue.
 */
export type FactCondition =
  | { readonly flag: FlagName }
  | { readonly count: CountName; readonly atLeast: number }
  | { readonly screen: GuideHost }
  | { readonly all: readonly FactCondition[] }
  | { readonly any: readonly FactCondition[] }
  | { readonly not: FactCondition };

/** The condition that always holds: all of nothing. */
export const ALWAYS: FactCondition = { all: [] };

export function conditionHolds(condition: FactCondition, facts: GuideFacts): boolean {
  if ('flag' in condition) return facts.flags[condition.flag];
  if ('count' in condition) return facts.counts[condition.count] >= condition.atLeast;
  if ('screen' in condition) return facts.host === condition.screen;
  if ('all' in condition) return condition.all.every((part) => conditionHolds(part, facts));
  if ('any' in condition) return condition.any.some((part) => conditionHolds(part, facts));
  return !conditionHolds(condition.not, facts);
}

// --- what the interface reports ----------------------------------------------

/**
 * What the adapter reads off a command and the data rows to tell one use of a
 * command from another. `buildImprovement` builds every improvement, and only a
 * tended one completes the tended-work lesson; `chooseBelief` answers three
 * different hands. The adapter sets a tag from a data marker, never by comparing
 * a name (CLAUDE.md, "markers not names").
 */
export type CommandTag = 'tendedWork' | 'pantheon' | 'followerBelief' | 'enhancerBelief';

/**
 * Something that just happened, reported by the adapter with a fresh
 * `GuideFacts`. The scheduler runs once per moment and at no other time: there
 * is no timer, no polling and no per-frame scan.
 *
 * The moments are accepted actions, turn settlement, screen changes, a change
 * of selection, a new or loaded game, and the player's presses on the lesson
 * card itself.
 */
export type GuideMoment =
  /** A new game is ready. `runKey` names the new run (see `newRunKey` in `guideStorage.ts`). */
  | { readonly kind: 'newGame'; readonly runKey: string }
  /**
   * A loaded game is ready. `runKey` is the run the save belonged to when this
   * browser knows it, and `null` otherwise. Everything already true in the
   * loaded world counts as history and raises no lesson.
   */
  | { readonly kind: 'resumedGame'; readonly runKey: string | null }
  /**
   * A command came back from the reducer.
   *
   * Every field the guide needs to refuse it is on the object, so the rule
   * "only an accepted command by the local player, in the live game, completes
   * a lesson" is checked here rather than trusted to the caller: `accepted` is
   * `result.ok`, `playerId` is the command's seat, and `replayed` is true while
   * a saved log is being replayed.
   */
  | {
      readonly kind: 'command';
      readonly command: string;
      readonly playerId: number;
      readonly accepted: boolean;
      readonly replayed: boolean;
      readonly tags?: readonly CommandTag[];
    }
  /**
   * One of a seat's units came to rest on a different hex, from a move order or
   * from a march resolved at the end of the turn. `ownerId` is the unit's owner,
   * which is not always the seat whose command resolved the turn.
   */
  | { readonly kind: 'unitArrived'; readonly ownerId: number; readonly replayed: boolean }
  /** The world turn resolved. `counts.turnsPlayed` in the facts is the new count. */
  | { readonly kind: 'turnSettled'; readonly replayed: boolean }
  /** A screen opened or closed. `host` in the facts names what is on view now. */
  | { readonly kind: 'screenChanged' }
  /**
   * The selection changed. The first walkthrough lesson completes when a
   * settler is selected (§5.3), so the selection is part of the facts and the
   * adapter reports when it changes.
   */
  | { readonly kind: 'selectionChanged' }
  /** The player pressed the card's main button ("Got it"). */
  | { readonly kind: 'acknowledged'; readonly lessonId: string }
  /** The player put the card away for now ("Later", or the card's close button). */
  | { readonly kind: 'dismissed'; readonly lessonId: string }
  /** The player chose to skip the walkthrough. */
  | { readonly kind: 'walkthroughSkipped' };

/** True for a moment that comes from replaying a saved log. Replays change nothing in the guide. */
export function isReplayed(moment: GuideMoment): boolean {
  return (
    (moment.kind === 'command' || moment.kind === 'unitArrived' || moment.kind === 'turnSettled') &&
    moment.replayed
  );
}

// --- lessons -----------------------------------------------------------------

/**
 * How a lesson is presented.
 * - `step`: a walkthrough step. It points at the control and completes when
 *   the player does the deed; there is no "Got it" button past it.
 * - `firstContact`: one idea, shown the first time its system appears, with
 *   "Show me" and "Why" (§5.4).
 * - `note`: one informational card, completed by reading it.
 */
export type LessonKind = 'step' | 'firstContact' | 'note';

/**
 * How one audience meets a lesson: in full, as a one-card note, or not at all.
 * A Civilization player meets walkthrough lesson 7 as a note, for example
 * (§5.3).
 */
export type LessonForm = 'full' | 'note' | 'none';

/** The library's shelves, which are §5.4's groups plus the walkthrough. */
export type LessonGroup = 'opening' | 'cards' | 'empire' | 'war' | 'faith' | 'endgame';

/**
 * When a lesson appears.
 * - `holds`: while a condition holds. After a loaded game, a condition that was
 *   already true counts as history and raises nothing until it has been false
 *   and become true again.
 * - `rises`: the moment a count goes up (the first bead, a new band), optionally
 *   only while a condition holds. The moment stays live until the turn
 *   settles; if the lesson could not be shown by then, it waits for the next
 *   rise.
 */
export type LessonTrigger =
  | { readonly kind: 'holds'; readonly when: FactCondition }
  | { readonly kind: 'rises'; readonly count: CountName; readonly when?: FactCondition };

/**
 * One way a lesson can be completed. A lesson lists every way that counts, and
 * any one of them completes it.
 *
 * - `command`: an accepted command of this name from the local seat, in the
 *   live game, carrying `tag` when one is named. A click, a rejected command,
 *   a bot's command and replayed history never match.
 * - `arrival`: one of the local seat's units came to rest on a new hex.
 * - `turn`: the world turn resolved.
 * - `screen`: the player opened this screen.
 * - `fact`: the snapshot shows the thing is already done. This is how facts
 *   satisfy lessons out of order: a player who set production before choosing
 *   research is not asked to set it again.
 * - `acknowledge`: the player read the card and pressed "Got it".
 *
 * `when` narrows an event to the moments where the facts also agree, such as
 * opening the town screen only after the first turn.
 */
export type LessonCompletion =
  | {
      readonly by: 'command';
      readonly command: string;
      readonly tag?: CommandTag;
      readonly when?: FactCondition;
    }
  | { readonly by: 'arrival'; readonly when?: FactCondition }
  | { readonly by: 'turn'; readonly when?: FactCondition }
  | { readonly by: 'screen'; readonly host: GuideHost; readonly when?: FactCondition }
  | { readonly by: 'fact'; readonly when: FactCondition }
  | { readonly by: 'acknowledge' };

/** One row of the catalogue. */
export interface LessonDef {
  /** Stable for good: the memory records lessons by this ID. Never printed. */
  readonly id: string;
  readonly kind: LessonKind;
  /**
   * The switch that turns it on. Walkthrough lessons run in order, once per
   * game; first-contact lessons appear when their system first shows up.
   */
  readonly switch: LessonSwitch;
  /** How the newcomer mode meets it. */
  readonly newcomer: LessonForm;
  /** How the Civilization mode meets it. A system a Civilization player already knows is `none`. */
  readonly civ: LessonForm;
  readonly group: LessonGroup;
  /** Where its card may show. A mandatory choice's lesson lists that choice. */
  readonly hosts: readonly GuideHost[];
  readonly trigger: LessonTrigger;
  readonly completes: readonly LessonCompletion[];
  /**
   * Walkthrough only: shows whenever its trigger holds rather than waiting its
   * turn in the order. Lesson 8 waits for the first draft this way, so the
   * walkthrough never stalls on it (§5.3).
   */
  readonly opportunistic?: boolean;
  /**
   * First-contact lessons this one teaches too. While this lesson is still to
   * come in a running walkthrough, those lessons wait; when it completes, they
   * complete with it. This keeps one idea from being taught twice.
   */
  readonly covers?: readonly string[];
  /** A name to work with until batch T3 writes the copy from the live rules. */
  readonly workingTitle: string;
}

/**
 * How a mode meets a lesson: `full`, `note`, or `null` for not at all.
 *
 * A note-kind lesson is always shown as a note. "Let me explore" uses the
 * newcomer's column (see `ModePlan.audience`), and its switches decide whether
 * anything shows at all.
 */
export function formFor(lesson: LessonDef, mode: GuideMode): 'full' | 'note' | null {
  const form = MODE_PLANS[mode].audience === 'civ' ? lesson.civ : lesson.newcomer;
  if (form === 'none') return null;
  return lesson.kind === 'note' ? 'note' : form;
}

/**
 * Whether one completion is met by this moment and these facts.
 *
 * `acknowledge` never matches here: what a press of "Got it" does depends on
 * the lesson as a whole (it may only mark the lesson seen), so the scheduler
 * handles it.
 */
export function completionMatches(
  completion: LessonCompletion,
  moment: GuideMoment,
  facts: GuideFacts,
): boolean {
  switch (completion.by) {
    case 'command':
      return (
        moment.kind === 'command' &&
        moment.accepted &&
        !moment.replayed &&
        moment.playerId === facts.localPlayerId &&
        moment.command === completion.command &&
        (completion.tag === undefined || (moment.tags ?? []).includes(completion.tag)) &&
        guardHolds(completion.when, facts)
      );
    case 'arrival':
      return (
        moment.kind === 'unitArrived' &&
        !moment.replayed &&
        moment.ownerId === facts.localPlayerId &&
        guardHolds(completion.when, facts)
      );
    case 'turn':
      return moment.kind === 'turnSettled' && !moment.replayed && guardHolds(completion.when, facts);
    case 'screen':
      return (
        moment.kind === 'screenChanged' &&
        facts.host === completion.host &&
        guardHolds(completion.when, facts)
      );
    case 'fact':
      return conditionHolds(completion.when, facts);
    case 'acknowledge':
      return false;
  }
}

function guardHolds(when: FactCondition | undefined, facts: GuideFacts): boolean {
  return when === undefined || conditionHolds(when, facts);
}

/** Whether "Got it" completes this lesson in this form, rather than only marking it seen. */
export function completesOnAcknowledge(lesson: LessonDef, form: 'full' | 'note' | null): boolean {
  return (
    form === 'note' ||
    lesson.kind === 'note' ||
    lesson.completes.some((completion) => completion.by === 'acknowledge')
  );
}
