/**
 * The tutorial — the guide that walks a new player through their first turns,
 * and the one-time notes that arrive later as the game opens up.
 *
 * The user's ask of 2026-08-30: *"walk new players through the major mechanics
 * and explain the bead system"*. What that turns into here is **two layers over
 * one table of prose**:
 *
 *   1. **The opening sequence** — eleven steps, linear, from "select your
 *      settler" to "end the turn". A parchment coach card sits beside a highlighted
 *      element with the rest of the screen dimmed, and an *action* step is
 *      advanced by the player's own deed rather than by a button. Nobody is ever
 *      told to press Next to found a city.
 *   2. **The triggered notes** — one card each, shown once ever, the first time
 *      the thing they are about happens: the first draft, the first ruin, the
 *      first forecast, the first caravan, the first bead. They have no
 *      spotlight, take one button, and are dismissed by Escape.
 *
 * It lives entirely in the interface
 * ----------------------------------
 * Nothing here imports `src/sim/`, and there is a source-reading pin in
 * `test/ui/tutorial.test.ts` that keeps it that way. The tutorial never issues a
 * command, never inspects a `GameState` and is not in a save: a save is
 * `{config, log}` and replays, and a guide that had written itself into one
 * would be a guide that changed what a seed produces. What it knows arrives as
 * plain **signals** — "a `foundCity` command was accepted", "a settler is
 * selected", "an offer opened" — pushed at it from `main.ts`'s commit funnel and
 * from the sites where the overlays open. That is also why the trigger is never
 * a timer and never a poll: every one of them is a moment the interface already
 * has.
 *
 * Progress lives in `localStorage` and nowhere else
 * ------------------------------------------------
 * One key, one small object: whether the tutorial is on, how far the sequence
 * got, and which notes have been seen. Storage arrives as an interface with two
 * methods rather than as `window.localStorage`, so a private window, a blocked
 * origin and the test suite all take the same path — a throwing store loses the
 * memory between sessions and costs nothing else (`saves.ts`' bargain, one
 * scale down).
 *
 * Split for a suite with no jsdom
 * -------------------------------
 * Everything that can be *quietly* wrong is pure and lives above
 * `createTutorial`: the prose tables, the advance reducer (`nextStep`), which
 * note a signal raises (`tipFor`), the memory round-trip, and where the card is
 * placed against its anchor (`placeCard`). Drawing the result is a dozen
 * `append` calls that fail loudly or not at all — `confirmCard.ts` made the same
 * split for the same reason.
 *
 * The voice is `compendiumText.ts`'s
 * ----------------------------------
 * Hard rule 7. Plain words a first-time player already owns; no identifier ever
 * reaches the screen; a number appears only where the number *is* the rule
 * (twenty beads). Every string a player reads is in the two tables at the top of
 * this file, so the copy can be edited without reading a line of the machinery.
 */

// --- the tables --------------------------------------------------------------

/**
 * What advances a step.
 *
 * `next` is the informational step's button; the other three are the player's
 * own deed — an order the reducer accepted, a piece picked up, or a screen
 * opening, which is the one kind of deed that is not a command (opening the star
 * chart changes nothing about the world). A step that names a command names it as a plain string, because this
 * module has no business importing the reducer's discriminant — the pin that
 * keeps `src/sim` out of here is worth more than the two characters of type
 * safety, and the step table is asserted against the real command names by the
 * test rather than by the compiler.
 */
export type StepAdvance =
  | { kind: 'next' }
  | { kind: 'command'; command: string }
  | { kind: 'select'; unit: string }
  | { kind: 'event'; event: string };

export interface TutorialStep {
  /** Stable, and the key the memory records as satisfied. */
  id: string;
  /**
   * A **CSS selector** for the element the spotlight cuts out and the card sits
   * beside, or `null`.
   *
   * A selector rather than an id (2026-08-30, the user's note about the meters):
   * the two things this guide most wants to ring are a *pair* of chips inside a
   * strip that also holds the six yield figures, and that pair has a wrapper of
   * its own but no id. Ringing the strip rings the yields with them, which says
   * the wrong thing; ringing `.civ-meters` rings exactly happiness and authority,
   * because that wrapper's only children are the two of them. A selector also
   * keeps the whole change inside this file — nothing in `topBar.ts` had to grow
   * an id for the guide's benefit.
   */
  anchor: string | null;
  /**
   * A thing **on the board** to ring instead, named for the host to find.
   *
   * The user's note of 2026-08-30: the settler step should ring the settler, not
   * a panel. A hex is not an element, so the step names *what* ("settler") and
   * `TutorialOptions.boardAnchor` answers *where* — that is the whole of the
   * split, and it is what keeps this module free of both the rules (which piece
   * is a settler) and the renderer (where a hex lands on screen). It wins over
   * `anchor` when it answers, and falls back to it when it does not: a piece
   * scrolled off screen has no ring, and the card still has somewhere to be.
   */
  board?: string;
  /**
   * Where the card goes when a full-window screen is up.
   *
   * `'corner'` is the star chart's step (the user, 2026-08-30): the chart fills
   * the viewport, so there is no element to sit beside and every star on it is
   * something the player is being asked to click. The card takes the bottom-left
   * — the one corner the chart's own furniture leaves alone, its close button
   * being top-right and its head top-left — and shrinks while it is there.
   */
  place?: 'corner';
  /** Display face, one line. */
  title: string;
  /** Sans body. One paragraph — a step nobody reads is a step that ran long. */
  body: string;
  advance: StepAdvance;
}

/**
 * The opening sequence, in order.
 *
 * Eleven steps, and the shape of them is the argument: the eight that ask for a
 * deed (`select`, `command`, and the star chart's two `event`s) have **no Next
 * button at all**, so the only way past one is to do the thing. The three that
 * merely explain something have nothing to do and take the button. Skip is on
 * every one of them.
 */
export const STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    anchor: '#abacus-button',
    title: 'Welcome',
    body:
      'You lead one people, from a single wagon to an empire. The game is won by the Bead Race: every player has a rod, a bead is threaded onto it for a first in the world, and the first rod to twenty beads wins. Nothing is scored in secret — every bead is announced, so a rival can always see you coming and race you to it. The Abacus, on the bar above, keeps the count for everyone at the table.',
    advance: { kind: 'next' },
  },
  {
    id: 'select',
    anchor: '#unit-panel',
    board: 'settler',
    title: 'Select your settler',
    body:
      'Your first piece is a settler: a wagon of people looking for somewhere to stop. Left click it on the board. Its sheet opens on the right and lists everything it can do — that sheet is where every piece in this game is given its orders.',
    advance: { kind: 'select', unit: 'settler' },
  },
  {
    id: 'found',
    anchor: '#unit-panel',
    title: 'Found your capital',
    body:
      'Press Found City on the sheet. The wagon becomes a city, the hexes around it become yours, and its people start working the land straight away. Grass and fresh water feed a city best, but anywhere green will do — a first city founded now is worth more than a perfect one founded in five turns.',
    advance: { kind: 'command', command: 'foundCity' },
  },
  {
    id: 'openChart',
    anchor: '#hud-research',
    title: 'Open the star chart',
    body:
      'This card is what your people are learning, and right now that is nothing at all. Click it. The star chart opens over the board: every idea your people could have, and the order they have to come in.',
    advance: { kind: 'event', event: 'techChartOpened' },
  },
  {
    id: 'research',
    anchor: null,
    place: 'corner',
    title: 'Aim at a star',
    body:
      'Click any star to start learning it. A star further out needs the ones before it and the chart lines those up for you; hold Shift and click to queue more behind what you have chosen. Learning is what unlocks new pieces, new buildings and new ways to work the land, and it is what carries you into the next age.',
    advance: { kind: 'command', command: 'chooseResearch' },
  },
  {
    id: 'closeChart',
    anchor: '#tech-close',
    place: 'corner',
    title: 'Fold the chart away',
    body:
      'The stars will keep. Press Escape, or the cross in the corner, and the study comes back to the table — the card you opened it from now shows what your people are working on and how long it has left.',
    advance: { kind: 'event', event: 'techChartClosed' },
  },
  {
    id: 'build',
    anchor: '#city-panel',
    title: 'Give the city something to build',
    body:
      'Click your city to open it. Its screen lists everything it could make, with what each would cost and how long it would take. Pick one and it joins the build list. A warrior to keep the raiders off, a scout to see what is out there, or a worker to improve your land are all sound first choices.',
    advance: { kind: 'command', command: 'setCityProduction' },
  },
  {
    id: 'move',
    anchor: null,
    board: 'mover',
    title: 'Move your starting unit',
    body:
      'This one is your other piece. Select it, then right click a hex to send it there. Rough ground costs more to cross, and a piece ordered further than it can walk today keeps walking by itself tomorrow. Go and see what you have been given — every hex nobody has stood near is blank until somebody looks at it.',
    advance: { kind: 'command', command: 'moveUnit' },
  },
  {
    id: 'endTurn',
    anchor: '#end-turn',
    title: 'End the turn',
    body:
      'When you have nothing left to do, press this. Everyone plays at once: nothing moves in the world until every player has ended, and then the whole turn resolves together. If something still wants an answer the button says so and takes you to it first. Watch the hand-over — the pieces under standing orders march, the new turn is announced, and then you are put in front of the first piece with nothing to do.',
    advance: { kind: 'command', command: 'endTurn' },
  },
  {
    id: 'meters',
    // The two meter chips and nothing else — not the six yield figures beside
    // them, which are a different reading and were being ringed with them.
    anchor: '.civ-meters',
    title: 'Happiness and authority',
    body:
      'These two, on the bar, are the limits on growing. Happiness is about how big your cities are; authority is about how many you have. Neither is a wall — go over and you pay for it, in slower growth or in less learning. Hover either one to see every source that fed it, and click for the whole list. Almost every number in this game answers a hover like that, and it is the fastest way to learn what is going on.',
    advance: { kind: 'next' },
  },
  {
    id: 'close',
    anchor: null,
    title: 'The rest arrives as you reach it',
    body:
      'You will be told about each new thing the first time it happens, and then left alone. Watch the bar for the bead chip and press V when the first cards hit the table. The question mark lists every control, and the book beside it holds every rule, table and card in the game, read straight off what the game is actually using.',
    advance: { kind: 'next' },
  },
];

/** One card of a note. A note with several is read with Next, like a leaflet. */
export interface TutorialPage {
  title: string;
  body: string;
}

export interface TutorialTip {
  id: string;
  /**
   * Every signal that raises this note. More than one where two moments are
   * the same lesson — the first bead and the first age to open both want the
   * Bead Race explained, and whichever comes first is the one that explains it.
   */
  triggers: readonly string[];
  pages: readonly TutorialPage[];
}

/**
 * The one-time notes, each shown at the first moment it is about.
 *
 * Order matters only for a signal that two notes claim, which nothing does
 * today; `tipFor` takes the first match and the test pins that the triggers are
 * unique across the table.
 */
export const TIPS: readonly TutorialTip[] = [
  {
    id: 'statecraft',
    triggers: ['event:statecraftOffer'],
    pages: [
      {
        title: 'A draft is ready',
        body:
          'Culture fills a draft, and a draft deals you a choice of Orders. An Order is a standing law — cheaper land, harder soldiers, happier towns — and it only does anything while it sits in one of your government\'s slots. Take one now. The Statecraft screen is where the slots are arranged, and a newly placed card is sealed in for a few turns before it can be moved again.',
      },
    ],
  },
  {
    id: 'discovery',
    triggers: ['event:discoveryOffer'],
    pages: [
      {
        title: 'Something is waiting in the stones',
        body:
          'A ruin or a friendly village pays whoever walks into it first, and only once. Choose what it hands over. There is no coming back to this card by any other route, which is why nothing else on the screen will move until you have answered it.',
      },
    ],
  },
  {
    id: 'combat',
    triggers: ['event:combatForecast'],
    pages: [
      {
        title: 'Look before you strike',
        body:
          'With a piece selected, hovering an enemy tells you what would happen before you commit any of it: both sides\' strength, every line that went into each, and the damage both would take. High ground, digging in and a great general standing nearby all count, and they are all listed. Right click when you like the odds.',
      },
    ],
  },
  {
    id: 'religion',
    triggers: ['event:religionOffer'],
    pages: [
      {
        title: 'A god to keep',
        body:
          'Faith buys augurs and prophets, and that is the whole of what faith does. An augur can add a god to your pantheon: a bonus in every city you own, for the rest of the game. A prophet founds a religion out of the gods you already keep. A faith spreads to people rather than to places, one citizen at a time, and a city follows whichever faith more than half its people do.',
      },
    ],
  },
  {
    id: 'trader',
    triggers: ['select:trader'],
    pages: [
      {
        title: 'A caravan is a route, not a piece you steer',
        body:
          'Do not walk this one anywhere. Choose Start route, pick the pair of cities you want on the Trade screen, and the caravan takes itself to the first of them and begins. It pays the far city every turn for as long as it runs, and it lays road behind it as it travels — and road is what makes everything else you own move faster.',
      },
    ],
  },
  {
    id: 'greatPerson',
    triggers: ['event:greatPersonOffer'],
    pages: [
      {
        title: 'A name the age offers you',
        body:
          'Renown attracts great people. Take one and they arrive in your capital, where you either spend them at once for something immediate, or send them out to plant a great work on a hex that stands there for the rest of the game. Either way their legacy stays with your government afterwards. Each name can be taken by only one player in the world, so a name left on the table is a name a rival may take.',
      },
    ],
  },
  {
    id: 'beads',
    triggers: ['event:bead', 'event:ageOpened'],
    pages: [
      {
        title: 'The Bead Race',
        body:
          'This is the only way the game is won, and it is one race rather than several — there is no separate path for war or for learning. Every player has a rod on the Abacus, everyone can see every rod, and the first to twenty beads takes the game. If nobody gets there, the fullest rod wins when the last age closes.',
      },
      {
        title: 'Four kinds of bead',
        body:
          'A feat is a first in the world — the first faith founded, the first empire into a new age — and it is always in play whether or not anybody is looking for it. A race project is a card that puts a row in every empire\'s build list at once; the first to finish takes the bead and the reward, and everyone else\'s work is spent for nothing. A quest is a deed you go and do. A reckoning is the age measuring everybody at the same moment and naming one winner, and a tie pays nobody.',
      },
      {
        title: 'The table',
        body:
          'Cards are dealt face down through an age and turn face up the moment the first empire reaches that age, so everyone gets the same table at the same time. Press V to see it: what is on offer, what has been claimed, and by whom. Most beads pay something once as well — a windfall, a free piece, a permanent step in one of the meters, or a die. The last slot on every rod is golden, it sits empty from the first turn, and only the Magnum Opus fills it.',
      },
    ],
  },
  {
    id: 'enemy',
    triggers: ['event:enemySeen'],
    pages: [
      {
        title: 'Somebody else is out there',
        body:
          'That piece is not yours. Nobody declares war in this game — anyone may attack anyone, on any turn, so a border is only as quiet as the soldiers standing on it. Keep one in each city, heal the hurt ones on ground of your own, and read the forecast before you start anything.',
      },
    ],
  },
  {
    id: 'starving',
    triggers: ['event:starved'],
    pages: [
      {
        title: 'A city is going hungry',
        body:
          'It is eating more than it grows, and it will lose one of its people if that stays true. Open it and look at where they are working: a farm on grass, a hex beside fresh water, or locking a citizen onto the best food hex will all turn it round. A city building a settler also stops growing until the settler is done, which is usually the answer.',
      },
    ],
  },
];

// --- the signals -------------------------------------------------------------

/**
 * What the interface tells the tutorial. Everything else here is a fold of one
 * of these.
 *
 * `select` carries the *type* of the selected piece as a plain string, or `null`
 * for no selection, so this file never sees a `Unit`. `event` names a moment
 * rather than a command — an overlay opening, a report the reducer handed back —
 * and the names are the keys the tip table triggers on.
 */
export type TutorialSignal =
  | { kind: 'command'; command: string }
  | { kind: 'select'; unit: string | null }
  | { kind: 'event'; event: string }
  | { kind: 'next' }
  | { kind: 'skip' };

/**
 * The signal as a trigger key, or `null` for the two that are the player
 * pressing a button on the card itself.
 *
 * One function, so the step table and the tip table cannot come to disagree
 * about what a signal is called.
 */
export function signalKey(signal: TutorialSignal): string | null {
  switch (signal.kind) {
    case 'command':
      return `command:${signal.command}`;
    case 'select':
      return signal.unit === null ? null : `select:${signal.unit}`;
    case 'event':
      return `event:${signal.event}`;
    default:
      return null;
  }
}

/** The same reading of a step's advance, so `nextStep` compares two keys. */
export function advanceKey(advance: StepAdvance): string | null {
  switch (advance.kind) {
    case 'command':
      return `command:${advance.command}`;
    case 'select':
      return `select:${advance.unit}`;
    case 'event':
      return `event:${advance.event}`;
    default:
      return null;
  }
}

// --- the sequence, as a pure reducer -----------------------------------------

export interface TutorialProgress {
  /** How far along `STEPS` the player is. */
  step: number;
  /** True once the sequence is finished or skipped — nothing more is shown. */
  done: boolean;
  /**
   * Ids of steps whose deed the player has *already* done, ahead of being asked.
   *
   * The sequence is linear but the player is not: somebody who queues a warrior
   * before choosing what to learn should not be asked to queue a second one when
   * the card catches up. A deed that matches any step from here on marks that
   * step satisfied, and the walk forward skips every satisfied step it meets.
   */
  satisfied: readonly string[];
}

export const FIRST_PROGRESS: TutorialProgress = { step: 0, done: false, satisfied: [] };

/**
 * One signal, one step of the sequence.
 *
 * Returns the **same object** when nothing moved, so a caller can compare by
 * identity and redraw only when there is something new to draw — which is what
 * keeps a card from being torn down and rebuilt on every mouse move (Entry
 * XLVII's rule, applied to the one surface that is rebuilt from a signal rather
 * than from a commit).
 */
export function nextStep(
  progress: TutorialProgress,
  signal: TutorialSignal,
  steps: readonly TutorialStep[] = STEPS,
): TutorialProgress {
  if (progress.done) return progress;
  if (signal.kind === 'skip') return { ...progress, done: true };

  const current = steps[progress.step];
  if (current === undefined) return { ...progress, done: true };

  // `next` is the card's own button and belongs to the step in hand alone — a
  // press must never satisfy some later step that happens to be informational.
  if (signal.kind === 'next') {
    if (current.advance.kind !== 'next') return progress;
    return walk(progress, progress.step + 1, progress.satisfied, steps);
  }

  const key = signalKey(signal);
  if (key === null) return progress;

  const matched: string[] = [];
  for (let i = progress.step; i < steps.length; i += 1) {
    const step = steps[i];
    if (step !== undefined && advanceKey(step.advance) === key) matched.push(step.id);
  }
  if (matched.length === 0) return progress;

  const satisfied = [...progress.satisfied];
  for (const id of matched) if (!satisfied.includes(id)) satisfied.push(id);
  const from = matched.includes(current.id) ? progress.step + 1 : progress.step;
  return walk(progress, from, satisfied, steps);
}

/** Forward over any step whose deed is already done, then answer. */
function walk(
  progress: TutorialProgress,
  from: number,
  satisfied: readonly string[],
  steps: readonly TutorialStep[],
): TutorialProgress {
  let index = from;
  for (;;) {
    const step = steps[index];
    if (step === undefined || !satisfied.includes(step.id)) break;
    index += 1;
  }
  const done = index >= steps.length;
  if (index === progress.step && !done && satisfied.length === progress.satisfied.length) {
    return progress;
  }
  return { step: Math.min(index, steps.length), done, satisfied };
}

/** The step on screen right now, or `null` when the sequence is over. */
export function stepAt(
  progress: TutorialProgress,
  steps: readonly TutorialStep[] = STEPS,
): TutorialStep | null {
  if (progress.done) return null;
  return steps[progress.step] ?? null;
}

// --- the notes ---------------------------------------------------------------

/**
 * Which note this signal raises, or `null`.
 *
 * A note already seen raises nothing, which is the whole of "once ever": the
 * seen list is the state and there is no second flag saying a note is closed.
 */
export function tipFor(
  signal: TutorialSignal,
  seen: readonly string[],
  tips: readonly TutorialTip[] = TIPS,
): TutorialTip | null {
  const key = signalKey(signal);
  if (key === null) return null;
  for (const tip of tips) {
    if (seen.includes(tip.id)) continue;
    if (tip.triggers.includes(key)) return tip;
  }
  return null;
}

// --- the memory --------------------------------------------------------------

/**
 * The half of the platform's `Storage` this module uses.
 *
 * Two methods, declared rather than imported, for `SaveStorage`'s reason: the
 * point is that nothing here needs a browser, and the real `localStorage`
 * satisfies it as-is.
 */
export interface TutorialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The one key this module owns. Versioned, so a shape change starts fresh. */
export const TUTORIAL_KEY = 'magisterludi:tutorial:v1';

export interface TutorialMemory {
  /** Whether the guide is wanted at all. On for a browser that has never said. */
  enabled: boolean;
  progress: TutorialProgress;
  seen: readonly string[];
}

/** What a browser that has never been here gets: the guide, from the top. */
export const FRESH_MEMORY: TutorialMemory = {
  enabled: true,
  progress: FIRST_PROGRESS,
  seen: [],
};

/**
 * Reads the memory, tolerating everything a shelf can do to it.
 *
 * A throwing store, a missing key, a truncated write, a value from a future
 * shape — all of them come back as `FRESH_MEMORY`, because the worst thing a
 * broken tutorial memory can cost is one tutorial, and the worst thing an
 * exception here can cost is the whole page.
 */
export function readTutorialMemory(storage: TutorialStorage): TutorialMemory {
  let raw: string | null = null;
  try {
    raw = storage.getItem(TUTORIAL_KEY);
  } catch {
    return FRESH_MEMORY;
  }
  if (raw === null) return FRESH_MEMORY;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return FRESH_MEMORY;
  }
  if (typeof parsed !== 'object' || parsed === null) return FRESH_MEMORY;
  const row = parsed as Record<string, unknown>;
  const progress = row.progress as Record<string, unknown> | undefined;
  return {
    enabled: row.enabled !== false,
    progress: {
      step: numberOr(progress?.step, 0),
      done: progress?.done === true,
      satisfied: stringsOf(progress?.satisfied),
    },
    seen: stringsOf(row.seen),
  };
}

/** Writes it back. A store that will not take it loses the memory and nothing else. */
export function writeTutorialMemory(storage: TutorialStorage, memory: TutorialMemory): void {
  try {
    storage.setItem(TUTORIAL_KEY, JSON.stringify(memory));
  } catch {
    // A private window, a blocked origin, a full shelf. The guide still runs for
    // this session; it simply will not be remembered for the next one.
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function stringsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

// --- placing the card --------------------------------------------------------

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** How far the card stands off its anchor, and off the window's edge. */
export const CARD_GAP = 18;
const EDGE = 12;

/**
 * Where the coach card goes.
 *
 * Pure, and separated for exactly the reason `offerSpread` is: it is the half of
 * a floating card that can be silently wrong — a card half off the bottom of a
 * short window is a card whose buttons cannot be pressed — and it is a question
 * a test can ask without a browser.
 *
 * Right of the anchor, then left, then below, then above, taking the first side
 * the card fits on whole; and whatever happens the answer is clamped inside the
 * window, because a card that has nowhere to fit still has to be readable. With
 * no anchor at all it sits centred, high enough to leave the board's middle
 * clear.
 */
export function placeCard(
  anchor: Rect | null,
  card: Size,
  view: Size,
  gap: number = CARD_GAP,
): { left: number; top: number } {
  if (anchor === null) {
    return clamp(
      { left: (view.width - card.width) / 2, top: view.height * 0.24 },
      card,
      view,
    );
  }
  const right = anchor.left + anchor.width + gap;
  const left = anchor.left - gap - card.width;
  const below = anchor.top + anchor.height + gap;
  const above = anchor.top - gap - card.height;
  const midY = anchor.top + anchor.height / 2 - card.height / 2;
  const midX = anchor.left + anchor.width / 2 - card.width / 2;

  if (right + card.width + EDGE <= view.width) return clamp({ left: right, top: midY }, card, view);
  if (left >= EDGE) return clamp({ left, top: midY }, card, view);
  if (below + card.height + EDGE <= view.height) return clamp({ left: midX, top: below }, card, view);
  if (above >= EDGE) return clamp({ left: midX, top: above }, card, view);
  return clamp({ left: midX, top: midY }, card, view);
}

function clamp(at: { left: number; top: number }, card: Size, view: Size): { left: number; top: number } {
  return {
    left: Math.max(EDGE, Math.min(at.left, view.width - card.width - EDGE)),
    top: Math.max(EDGE, Math.min(at.top, view.height - card.height - EDGE)),
  };
}

/**
 * Where the card goes when a full-window screen owns the viewport.
 *
 * No anchor is involved: the screen *is* the anchor, and the only question is
 * which corner of it is free. Bottom-left, because the star chart's head sits
 * top-left, its close button top-right, and its plan strip is hidden for the
 * whole of the turn this step happens on.
 */
export function cornerCard(card: Size, view: Size): { left: number; top: number } {
  return clamp({ left: EDGE, top: view.height - card.height - EDGE }, card, view);
}

/** "Step 3 of 9" — the mono line, and the one place the sequence counts. */
export function stepCount(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`;
}

// --- the surface -------------------------------------------------------------

export interface TutorialOptions {
  /** Where the memory lives. `window.localStorage` in the game, a map in tests. */
  storage: TutorialStorage;
  /** Where the scrim and the card are mounted — `document.body`. */
  root: HTMLElement;
  /** Resolves a step's anchor selector. Defaults to the document's own lookup. */
  anchor?: (selector: string) => HTMLElement | null;
  /**
   * Finds a step's *board* anchor — the rectangle a named piece occupies on
   * screen right now, or `null` when there is no such piece or it is off screen.
   *
   * Optional, like every renderer-specific feature on `MapView`: under the
   * frozen 2D pipelines there is no projection, so this is simply never given
   * and every step falls back to its element anchor.
   */
  boardAnchor?: (what: string) => Rect | null;
  /** True when the viewer has asked for less motion; the highlight then rests. */
  reducedMotion?: () => boolean;
}

export interface Tutorial {
  /** Whether the guide is wanted at all — the landing's checkbox reads this. */
  enabled(): boolean;
  /** The landing's checkbox writes it. Turning it off puts everything away. */
  setEnabled(on: boolean): void;
  /** A brand new game: the opening sequence, from wherever it last got to. */
  begin(): void;
  /**
   * A loaded game: no opening sequence, ever.
   *
   * A save carries no tutorial state (it carries `{config, log}` and nothing
   * else), so a resumed game has no way of knowing which of these steps the
   * player did forty turns ago — and walking somebody through founding their
   * capital in the middle of an empire is worse than saying nothing. The notes
   * still fire, because each of those is about a moment that is happening now.
   */
  resume(): void;
  /** From the top, notes and all. The menu's "Show the tutorial again". */
  replay(): void;
  /** Feed it. Cheap and idempotent — most signals match nothing. */
  note(signal: TutorialSignal): void;
  /**
   * Is this note still wanted?
   *
   * For a caller whose trigger costs something to detect — sweeping the board
   * for a foreign piece this seat can see — so the sweep stops happening the
   * moment the note has been read.
   */
  wantsTip(id: string): boolean;
  /** Re-places whatever is up. Called on resize and wherever the panels rebuild. */
  refresh(): void;
  /**
   * Re-projects the ring, on the renderer's own frame beat.
   *
   * `refresh`'s cheap twin, and the split is `cityBanners`': a ring hung on a
   * *hex* moves whenever the camera does, so it has to be driven by the frame
   * listener — but the card's own size cannot have changed since the last draw,
   * so this one never measures it. Measuring per frame is a forced layout per
   * frame, which is the cost the render-on-demand loop exists to avoid.
   */
  reposition(): void;
  /** Puts the card away without deciding anything. A new game, a restart. */
  close(): void;
}

/** How the tip card walks its pages; `null` when no note is up. */
interface TipShowing {
  tip: TutorialTip;
  page: number;
}

export function createTutorial(options: TutorialOptions): Tutorial {
  const { storage, root, boardAnchor } = options;
  const findAnchor =
    options.anchor ??
    ((selector: string) => root.ownerDocument.querySelector<HTMLElement>(selector));
  const reducedMotion =
    options.reducedMotion ??
    (() => {
      const view = root.ownerDocument.defaultView;
      return view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    });

  let memory = readTutorialMemory(storage);
  /** Whether the sequence is allowed to draw. Off until a game says otherwise. */
  let running = false;
  let tip: TipShowing | null = null;

  const doc = root.ownerDocument;

  /**
   * The dimmer, and the cutout in it.
   *
   * One element rather than four panels: a huge spread on `box-shadow` paints
   * everything *outside* this box and nothing inside it, so the hole is the
   * element's own rectangle and there is no arithmetic to get wrong on a resize.
   * It never takes a pointer event, which is the rule the whole surface is built
   * on — the player can always act, and the card follows them.
   */
  const scrim = doc.createElement('div');
  scrim.className = 'tutorial-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  scrim.hidden = true;

  const card = doc.createElement('aside');
  card.className = 'tutorial-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-live', 'polite');
  card.hidden = true;

  const eyebrow = doc.createElement('p');
  eyebrow.className = 'tutorial-eyebrow';
  const title = doc.createElement('h2');
  title.className = 'tutorial-title';
  const body = doc.createElement('p');
  body.className = 'tutorial-body';
  const actions = doc.createElement('div');
  actions.className = 'tutorial-actions';
  const goButton = doc.createElement('button');
  goButton.type = 'button';
  goButton.className = 'btn btn-primary tutorial-go';
  const skipButton = doc.createElement('button');
  skipButton.type = 'button';
  skipButton.className = 'btn btn-quiet tutorial-skip';
  skipButton.textContent = 'Skip tutorial';
  actions.append(goButton, skipButton);
  card.append(eyebrow, title, body, actions);

  root.append(scrim, card);

  goButton.addEventListener('click', () => {
    if (tip !== null) {
      advanceTip();
      return;
    }
    note({ kind: 'next' });
  });
  skipButton.addEventListener('click', () => note({ kind: 'skip' }));

  /**
   * Escape dismisses a **note** and nothing else.
   *
   * Captured, and the propagation stopped, so the board's own Escape (which
   * backs out move mode, then a popover, then the selection) never sees the same
   * keystroke — a player putting a card away has not asked to drop their
   * selection. The opening sequence deliberately has no Escape: it has a Skip
   * button that says what it does, and Escape is the key people press without
   * reading.
   */
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || tip === null) return;
    event.stopPropagation();
    event.preventDefault();
    closeTip();
  };
  doc.defaultView?.addEventListener('keydown', onKey, true);
  doc.defaultView?.addEventListener('resize', () => place());

  function save(): void {
    writeTutorialMemory(storage, memory);
  }

  function note(signal: TutorialSignal): void {
    if (!memory.enabled) return;

    // A note outranks the sequence: it is about a thing that is happening on
    // screen right now, where a step is about a thing the player has yet to do.
    // It is raised first and the sequence still advances underneath it, so
    // putting the note away comes back to the step the deed had already reached.
    const raised = tip === null ? tipFor(signal, memory.seen) : null;

    if (running) {
      const after = nextStep(memory.progress, signal);
      if (after !== memory.progress) {
        memory = { ...memory, progress: after };
        if (signal.kind === 'skip') memory = { ...memory, enabled: false };
        save();
      }
    } else if (signal.kind === 'skip') {
      memory = { ...memory, enabled: false };
      save();
    }

    if (raised !== null) {
      tip = { tip: raised, page: 0 };
      memory = { ...memory, seen: [...memory.seen, raised.id] };
      save();
    }
    draw();
  }

  function advanceTip(): void {
    if (tip === null) return;
    if (tip.page + 1 < tip.tip.pages.length) {
      tip = { tip: tip.tip, page: tip.page + 1 };
      draw();
      return;
    }
    closeTip();
  }

  function closeTip(): void {
    tip = null;
    draw();
  }

  /** What the card should be showing, drawn from scratch. Never a partial edit. */
  function draw(): void {
    if (!memory.enabled) {
      hide();
      return;
    }
    if (tip !== null) {
      const page = tip.tip.pages[tip.page];
      if (page === undefined) {
        closeTip();
        return;
      }
      card.classList.add('is-tip');
      eyebrow.textContent =
        tip.tip.pages.length > 1 ? stepCount(tip.page, tip.tip.pages.length) : 'a note';
      title.textContent = page.title;
      body.textContent = page.body;
      goButton.textContent = tip.page + 1 < tip.tip.pages.length ? 'Next' : 'Got it';
      goButton.hidden = false;
      skipButton.hidden = true;
      card.hidden = false;
      scrim.hidden = true;
      place();
      return;
    }

    const step = running ? stepAt(memory.progress) : null;
    if (step === null) {
      hide();
      return;
    }
    card.classList.remove('is-tip');
    card.classList.toggle('is-corner', step.place === 'corner');
    eyebrow.textContent = stepCount(memory.progress.step, STEPS.length);
    title.textContent = step.title;
    body.textContent = step.body;
    // An action step has no button past it on purpose: the deed is the button.
    goButton.hidden = step.advance.kind !== 'next';
    goButton.textContent =
      memory.progress.step === STEPS.length - 1 ? 'Begin' : 'Next';
    skipButton.hidden = false;
    card.hidden = false;
    // `place` has the last word on the dimmer — it is the half that knows
    // whether there turned out to be anything to cut a hole in.
    scrim.hidden = false;
    place();
  }

  function hide(): void {
    card.hidden = true;
    scrim.hidden = true;
  }

  /**
   * Puts the scrim's hole over the step's anchor and the card beside it.
   *
   * Read fresh every time rather than remembered, because the elements this
   * points at are rebuilt constantly — the unit sheet and the city screen are
   * torn down and rebuilt on every accepted command — so a stored rectangle
   * would be a highlight one commit behind the panel it is highlighting.
   */
  /**
   * The card's own box, measured at the last draw.
   *
   * Kept rather than read per frame: `offsetWidth` forces a layout, and the
   * frame beat below runs on every frame the renderer draws. The content is the
   * only thing that changes it, so it is re-measured exactly where the content
   * is written.
   */
  let cardSize: Size = { width: 320, height: 200 };

  function place(measure = true): void {
    if (card.hidden) return;
    const view = doc.defaultView;
    if (measure) {
      cardSize = { width: card.offsetWidth || 320, height: card.offsetHeight || 200 };
    }
    const size = cardSize;
    const viewport: Size = {
      width: view?.innerWidth ?? 1280,
      height: view?.innerHeight ?? 720,
    };
    const step = tip === null && running ? stepAt(memory.progress) : null;
    const anchorId = step?.anchor ?? null;
    const anchor = anchorId === null ? null : findAnchor(anchorId);
    // The board wins where it answers. A piece is what the step is *about*, and
    // a panel that happens to be open is only ever the fallback.
    const onBoard =
      step?.board !== undefined && boardAnchor !== undefined ? boardAnchor(step.board) : null;
    const rect = onBoard ?? (anchor === null || anchor.hidden ? null : boxOf(anchor));

    if (rect === null) {
      // No hole: the shadow's spread still dims the window, and the collapsed
      // box is parked off-screen so no stray outline is drawn over the board.
      scrim.style.left = '-40px';
      scrim.style.top = '-40px';
      scrim.style.width = '0px';
      scrim.style.height = '0px';
    } else {
      scrim.style.left = `${rect.left - 6}px`;
      scrim.style.top = `${rect.top - 6}px`;
      scrim.style.width = `${rect.width + 12}px`;
      scrim.style.height = `${rect.height + 12}px`;
    }
    if (step !== null) {
      // **A corner step with nothing to ring gets no dimmer at all.** Aiming at
      // a star is the one step where a dim would obscure the very thing being
      // pointed at; folding the chart away is its opposite — the chart's work is
      // done, so it dims with a hole cut over the one control left to press.
      scrim.hidden = step.place === 'corner' && rect === null;
      // And a hole over a *screen* has to be drawn on top of it: the chart owns
      // z 40, and the scrim sits under the HUD's cards otherwise.
      scrim.classList.toggle('is-over', step.place === 'corner');
    }
    scrim.classList.toggle('has-hole', rect !== null);
    // A piece is round and a button is not: the cutout takes the shape of the
    // thing it is ringing, or the ring reads as a box drawn over the board.
    scrim.classList.toggle('is-round', onBoard !== null);
    scrim.classList.toggle('is-still', reducedMotion());

    const at =
      step?.place === 'corner' ? cornerCard(size, viewport) : placeCard(rect, size, viewport);
    card.style.left = `${at.left}px`;
    card.style.top = `${at.top}px`;
  }

  function boxOf(element: HTMLElement): Rect | null {
    const box = element.getBoundingClientRect?.();
    if (!box || (box.width === 0 && box.height === 0)) return null;
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  }

  return {
    enabled: () => memory.enabled,
    setEnabled(on) {
      // Off and on again is a player asking for the guide back, and the notes go
      // with it: somebody who switched it off, played, and switched it on has
      // said they want to be told things, and half the table already marked seen
      // would leave them told almost nothing. Ticking a box that was already
      // ticked changes nothing at all.
      const rekindled = on && !memory.enabled;
      memory = rekindled
        ? { enabled: true, progress: FIRST_PROGRESS, seen: [] }
        : { ...memory, enabled: on };
      save();
      if (!on) {
        tip = null;
        running = false;
      }
      draw();
    },
    begin() {
      // **A new game restarts the sequence** (the user, 2026-08-30). Progress is
      // about *this* game's opening turns — which settler, which capital — so
      // carrying it across a restart would drop somebody into "end the turn" on
      // a board with no city on it. The one-time notes are the opposite kind of
      // memory: each is a lesson about a mechanic, learned once, so they stand.
      // (`setEnabled` is where a player asking for the guide back gets those
      // cleared too.)
      memory = { ...memory, progress: FIRST_PROGRESS };
      save();
      running = memory.enabled;
      draw();
    },
    resume() {
      running = false;
      draw();
    },
    replay() {
      memory = { enabled: true, progress: FIRST_PROGRESS, seen: [] };
      save();
      tip = null;
      running = true;
      draw();
    },
    note,
    wantsTip(id) {
      return memory.enabled && !memory.seen.includes(id);
    },
    refresh: () => place(true),
    reposition: () => place(false),
    close() {
      tip = null;
      running = false;
      hide();
    },
  };
}
