/**
 * The lesson catalogue: one row for every lesson `docs/plans/tutorial.md` plans
 * in §5.3 (the opening walkthrough) and §5.4 (first-contact lessons).
 *
 * Each row says when the lesson appears and what completes it, as data over the
 * facts snapshot (`guideModel.ts`). The words are batch T3's: they are written
 * from the live rules at build time (principle 6), so a row carries only a
 * working title. The engine never reads the title.
 *
 * How the rows were chosen
 * ------------------------
 * - **Order matters.** Walkthrough lessons run in the order they appear here,
 *   and the scheduler prefers earlier rows when two are ready at once.
 * - **The `civ` column** follows §1's table of what a Civilization player
 *   already knows (selection, founding, research, production, workers, ruins,
 *   camps, happiness, war and peace, religion, caravans, great people). Those
 *   lessons are `none` for that mode; everything new in this game is `full`.
 *   In the walkthrough, a Civilization player skips lessons 1 to 6, meets
 *   lesson 7 as a one-card note, keeps lesson 8, and gets a one-card controls
 *   note in place of the basics (§5.1, §5.3).
 * - **Triggers that follow a count** (`rises`) are used for "the first X" where
 *   X can already exist in a loaded game: the first bead, a new band, a
 *   veteran. Triggers that follow a state (`holds`) are used where the lesson
 *   is about a situation that comes and goes: an offer on screen, a meter below
 *   zero, a war.
 * - **Completions** prefer the deed (principle 4). A lesson with no deed of its
 *   own completes when the player reads it. A lesson with a deed is put away by
 *   "Got it" too, but is only marked completed when the deed happens.
 *
 * What is deliberately not here
 * -----------------------------
 * - **Government and doctrine lessons**: deferred until their rework (A4), the
 *   user's answer of 2026-10-15 (§10). `test/ui/guideLessons.test.ts` pins the
 *   absence.
 * - **Wager and bead lessons are here**, taught now (§10).
 * - **Multiplayer**: deferred (§10). Every fact is about the one local seat.
 * - **A smaller first hand**: the user said no (§10). The first draft deals the
 *   normal hand, and lesson 8 waits for it.
 */

import { ALWAYS, type CountName, type FactCondition, type FlagName, type GuideHost, type LessonDef } from './guideModel';

const atLeast = (count: CountName, value: number): FactCondition => ({ count, atLeast: value });
const flag = (name: FlagName): FactCondition => ({ flag: name });
const onScreen = (host: GuideHost): FactCondition => ({ screen: host });

/** A town exists: the condition most of the opening waits on. */
const HAS_TOWN = atLeast('citiesOwned', 1);
/** The first world turn has resolved. */
const AFTER_FIRST_TURN = atLeast('turnsPlayed', 1);

export const GUIDE_LESSONS = [
  // --- the opening walkthrough (§5.3) ----------------------------------------
  {
    // §5.1: a Civilization player gets one card on the controls in place of
    // the walkthrough's basics.
    id: 'controlsNote',
    kind: 'note',
    switch: 'walkthrough',
    newcomer: 'none',
    civ: 'note',
    group: 'opening',
    hosts: ['board'],
    trigger: { kind: 'holds', when: ALWAYS },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'The controls',
  },
  {
    // 1. Teaches selection and the unit panel.
    id: 'selectSettler',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'none',
    group: 'opening',
    hosts: ['board'],
    trigger: { kind: 'holds', when: atLeast('settlersOwned', 1) },
    completes: [
      { by: 'fact', when: flag('settlerSelected') },
      { by: 'fact', when: HAS_TOWN },
    ],
    workingTitle: 'Select your settler',
  },
  {
    // 2. Teaches founding.
    id: 'foundCapital',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'none',
    group: 'opening',
    hosts: ['board'],
    trigger: { kind: 'holds', when: atLeast('settlersOwned', 1) },
    completes: [
      { by: 'command', command: 'foundCity' },
      { by: 'fact', when: HAS_TOWN },
    ],
    workingTitle: 'Found your capital',
  },
  {
    // 3. Teaches the technology tree. Opening and closing the tree are no
    // longer steps of their own: the lesson shows on the board, then inside
    // the tree once it is open.
    id: 'chooseResearch',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'none',
    group: 'opening',
    hosts: ['board', 'techTree'],
    trigger: { kind: 'holds', when: HAS_TOWN },
    completes: [
      { by: 'command', command: 'chooseResearch' },
      { by: 'fact', when: flag('researchChosen') },
    ],
    workingTitle: 'Choose research',
  },
  {
    // 4. Teaches the build list.
    id: 'chooseProduction',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'none',
    group: 'opening',
    hosts: ['board', 'city'],
    trigger: { kind: 'holds', when: HAS_TOWN },
    completes: [
      { by: 'command', command: 'setCityProduction' },
      { by: 'fact', when: flag('productionSet') },
    ],
    workingTitle: 'Choose production',
  },
  {
    // 5. Teaches moving, and routes over several turns. A move ordered with no
    // movement left is accepted as orders and moves nothing, so the deed is
    // the arrival rather than the `moveUnit` command.
    id: 'explore',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'none',
    group: 'opening',
    hosts: ['board'],
    trigger: { kind: 'holds', when: ALWAYS },
    completes: [{ by: 'arrival' }],
    workingTitle: 'Explore',
  },
  {
    // 6. Teaches what End Turn waits for. A seat's own End Turn is not the
    // deed: the lesson completes when the world turn resolves.
    id: 'endTurn',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'none',
    group: 'opening',
    hosts: ['board'],
    trigger: { kind: 'holds', when: ALWAYS },
    completes: [{ by: 'turn' }, { by: 'fact', when: AFTER_FIRST_TURN }],
    workingTitle: 'End the turn',
  },
  {
    // 7. Teaches worked tiles, food and production, and that every number has
    // a breakdown. Completes when the town is opened after a turn; a
    // Civilization player meets it as a one-card note instead.
    id: 'readTown',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'note',
    group: 'opening',
    hosts: ['board', 'city'],
    trigger: { kind: 'holds', when: { all: [HAS_TOWN, AFTER_FIRST_TURN] } },
    completes: [{ by: 'screen', host: 'city', when: AFTER_FIRST_TURN }],
    workingTitle: 'Read your town',
  },
  {
    // 8. Teaches the draft, then seating (§5.5). It waits for the first draft
    // rather than forcing one, so it is opportunistic: it never holds up the
    // walkthrough's close. It stays up after a card is taken, while that card
    // sits in no chair, and completes when a card is seated or a hand is
    // passed. It teaches the first two card lessons, so they wait for it.
    id: 'firstCard',
    kind: 'step',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'full',
    group: 'opening',
    hosts: ['orderOffer', 'statecraft', 'board'],
    trigger: {
      kind: 'holds',
      when: { any: [onScreen('orderOffer'), atLeast('cardsUnseated', 1)] },
    },
    completes: [
      { by: 'command', command: 'slotOrder' },
      { by: 'command', command: 'skipOrderOffer' },
    ],
    opportunistic: true,
    covers: ['firstHand', 'seatCard'],
    workingTitle: 'Your first card',
  },
  {
    // The close, with a pointer to the lesson library.
    id: 'walkthroughEnd',
    kind: 'note',
    switch: 'walkthrough',
    newcomer: 'full',
    civ: 'full',
    group: 'opening',
    hosts: ['board'],
    trigger: { kind: 'holds', when: ALWAYS },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'The rest arrives as you reach it',
  },

  // --- cards and chairs (§5.4) -----------------------------------------------
  {
    id: 'firstHand',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['orderOffer'],
    trigger: { kind: 'holds', when: onScreen('orderOffer') },
    completes: [
      { by: 'command', command: 'chooseOrder' },
      { by: 'command', command: 'skipOrderOffer' },
    ],
    workingTitle: 'First hand',
  },
  {
    id: 'seatCard',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['board', 'statecraft'],
    trigger: { kind: 'rises', count: 'cardsUnseated' },
    completes: [{ by: 'command', command: 'slotOrder' }],
    workingTitle: 'Seat a card',
  },
  {
    // §5.5 point 3: nothing explains choosing what to seat until the choice is
    // real, which is a new card arriving with no chair free for it.
    id: 'fullChairs',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['board', 'statecraft'],
    trigger: { kind: 'rises', count: 'cardsHeld', when: flag('cardsOutnumberChairs') },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Full chairs',
  },
  {
    id: 'commission',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['board', 'statecraft'],
    trigger: { kind: 'rises', count: 'commissionsSeated' },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Commission',
  },
  {
    id: 'charter',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['board', 'statecraft'],
    trigger: { kind: 'rises', count: 'chartersHeld' },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Charter',
  },
  {
    id: 'levy',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['board', 'city'],
    trigger: { kind: 'holds', when: flag('levyAvailable') },
    completes: [{ by: 'command', command: 'levyCitizen' }],
    workingTitle: 'Levy',
  },
  {
    id: 'tendedWork',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['board'],
    trigger: { kind: 'holds', when: flag('tendAvailable') },
    completes: [{ by: 'command', command: 'buildImprovement', tag: 'tendedWork' }],
    workingTitle: 'Tended work',
  },
  {
    id: 'newBand',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'cards',
    hosts: ['board', 'statecraft'],
    trigger: { kind: 'rises', count: 'cardBand' },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'A new band',
  },

  // --- the empire (§5.4) -----------------------------------------------------
  {
    id: 'authority',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'empire',
    hosts: ['board'],
    trigger: {
      kind: 'holds',
      when: { any: [flag('secondTownInProspect'), flag('authorityBelowZero')] },
    },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Authority',
  },
  {
    id: 'happiness',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'empire',
    hosts: ['board'],
    trigger: { kind: 'holds', when: flag('happinessBelowZero') },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Happiness',
  },
  {
    id: 'workers',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'empire',
    hosts: ['board'],
    trigger: { kind: 'rises', count: 'workersOwned' },
    completes: [
      { by: 'command', command: 'buildImprovement' },
      { by: 'command', command: 'chopFeature' },
    ],
    workingTitle: 'Workers',
  },
  {
    id: 'discovery',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'empire',
    hosts: ['discoveryOffer'],
    trigger: { kind: 'holds', when: onScreen('discoveryOffer') },
    completes: [{ by: 'command', command: 'chooseDiscovery' }],
    workingTitle: 'Discovery',
  },
  {
    id: 'camps',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'empire',
    hosts: ['board'],
    trigger: { kind: 'rises', count: 'campsSeen' },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Camps',
  },

  // --- war (§5.4) ------------------------------------------------------------
  {
    id: 'forecast',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'war',
    hosts: ['combatForecast'],
    trigger: { kind: 'holds', when: onScreen('combatForecast') },
    completes: [{ by: 'command', command: 'attack' }],
    workingTitle: 'Forecast',
  },
  {
    id: 'warAndPeace',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'war',
    hosts: ['board', 'diplomacy'],
    trigger: { kind: 'holds', when: flag('atWar') },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'War and peace',
  },
  {
    // Puppet is the town's state already, chosen by closing the sheet, so
    // only annexing and razing are deeds.
    id: 'capture',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'war',
    hosts: ['captureChoice', 'board'],
    trigger: { kind: 'rises', count: 'townsCaptured' },
    completes: [
      { by: 'command', command: 'annexCity' },
      { by: 'command', command: 'razeCity' },
    ],
    workingTitle: 'Capture',
  },
  {
    id: 'weariness',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'war',
    hosts: ['board'],
    trigger: { kind: 'holds', when: flag('wearinessShowing') },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Weariness',
  },
  {
    id: 'ranks',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'war',
    hosts: ['board'],
    trigger: { kind: 'rises', count: 'veteransOwned' },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Ranks',
  },

  // --- faith, trade, great people (§5.4, and the September plan's §8) --------
  {
    id: 'pantheon',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'faith',
    hosts: ['pantheonOffer'],
    trigger: { kind: 'holds', when: onScreen('pantheonOffer') },
    completes: [{ by: 'command', command: 'chooseBelief', tag: 'pantheon' }],
    workingTitle: 'Pantheon',
  },
  {
    // Founding a religion is raising the first holy site.
    id: 'prophet',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'faith',
    hosts: ['board'],
    trigger: { kind: 'rises', count: 'prophetsOwned' },
    completes: [{ by: 'command', command: 'plantHolySite' }],
    workingTitle: 'Prophet',
  },
  {
    id: 'followerBelief',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'faith',
    hosts: ['followerOffer'],
    trigger: { kind: 'holds', when: onScreen('followerOffer') },
    completes: [{ by: 'command', command: 'chooseBelief', tag: 'followerBelief' }],
    workingTitle: 'Follower beliefs',
  },
  {
    id: 'enhancerBelief',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'faith',
    hosts: ['enhancerOffer'],
    trigger: { kind: 'holds', when: onScreen('enhancerOffer') },
    completes: [{ by: 'command', command: 'chooseBelief', tag: 'enhancerBelief' }],
    workingTitle: 'Enhancer beliefs',
  },
  {
    id: 'caravan',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'faith',
    hosts: ['board', 'trade'],
    trigger: { kind: 'rises', count: 'caravansOwned' },
    completes: [{ by: 'command', command: 'startRoute' }],
    workingTitle: 'Caravan',
  },
  {
    id: 'greatPerson',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'none',
    group: 'faith',
    hosts: ['greatPersonOffer'],
    trigger: { kind: 'holds', when: onScreen('greatPersonOffer') },
    completes: [{ by: 'command', command: 'chooseGreatPerson' }],
    workingTitle: 'Great person',
  },

  // --- the endgame (§5.4) ----------------------------------------------------
  {
    id: 'wager',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'endgame',
    hosts: ['wagerOffer'],
    trigger: { kind: 'holds', when: onScreen('wagerOffer') },
    completes: [{ by: 'command', command: 'chooseWager' }],
    workingTitle: 'Wager',
  },
  {
    id: 'beads',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'endgame',
    hosts: ['board'],
    trigger: { kind: 'rises', count: 'beads' },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Beads',
  },
  {
    id: 'magnumOpus',
    kind: 'firstContact',
    switch: 'lessons',
    newcomer: 'full',
    civ: 'full',
    group: 'endgame',
    hosts: ['board', 'city'],
    trigger: { kind: 'holds', when: flag('opusBuildable') },
    completes: [{ by: 'acknowledge' }],
    workingTitle: 'Magnum Opus',
  },
] as const satisfies readonly LessonDef[];

/**
 * Every lesson ID in the catalogue. Batch T3 can key the copy table on this
 * type, so a lesson without words fails the typecheck.
 */
export type GuideLessonId = (typeof GUIDE_LESSONS)[number]['id'];

/** The catalogue row with this ID, or `undefined`. */
export function lessonById(
  id: string,
  catalogue: readonly LessonDef[] = GUIDE_LESSONS,
): LessonDef | undefined {
  return catalogue.find((lesson) => lesson.id === id);
}
