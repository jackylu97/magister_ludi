/**
 * **The landing in three steps** — batch L7, `docs/flags.md` (yyyy), drawn
 * against `mockups/new-game-flow.html`.
 *
 * The landing used to be one leaf: a masthead, the map card and the seat card,
 * with Continue and Load in the map card's foot. It is three screens now — the
 * title, the world, the civ — and **all three are the same `#landing`**. Nothing
 * routes, nothing is built twice, and no form field is rebuilt between steps:
 * the whole of a step is `data-step` on the one element, which the stylesheet
 * reads to decide which block of the leaf is on screen. That is what keeps
 * `currentConfig` byte-identical for the same choices — it reads the same
 * `<input>`, the same `<select>` and the same `<output>` it always read, and
 * those elements never stop existing.
 *
 * What is *here* rather than in `main.ts` is the part that can be wrong quietly:
 * which step follows which, what a breadcrumb says, what the summary strip says,
 * and which key means what. Every one of them is a pure function over plain
 * values, so a suite with no document holds them (this directory's discipline —
 * `leaderSelect.ts`' note). The DOM half below is a dozen lines of attribute
 * writing and one guarded listener.
 */

/** The three screens, in the order a new game walks them. */
export type LandingStep = 'title' | 'world' | 'civ';

/** In order. The register of what a step may be. */
export const LANDING_STEPS: readonly LandingStep[] = ['title', 'world', 'civ'];

/** Where the landing opens, and where `showLanding` puts it back. */
export const FIRST_STEP: LandingStep = 'title';

/**
 * The small mono line that stands in for the masthead once the player is inside
 * a new game. The poster is shown **once**, on the title step, and never again on
 * the way into a game (the ruling's own words), so the two setup steps say where
 * they are instead of announcing the product a second time.
 *
 * The title step has none: it has the poster.
 */
export const STEP_CRUMB: Record<LandingStep, string> = {
  title: '',
  world: 'new game · step one of two',
  civ: 'new game · step two of two',
};

/** The step a forward press leads to, or `null` where the walk ends. */
export function stepAfter(step: LandingStep): LandingStep | null {
  return step === 'title' ? 'world' : step === 'world' ? 'civ' : null;
}

/** The step Back leads to, or `null` at the front of the walk. */
export function stepBefore(step: LandingStep): LandingStep | null {
  return step === 'civ' ? 'world' : step === 'world' ? 'title' : null;
}

/**
 * **The summary strip** under the map card: what the controls above it currently
 * say, in one mono line.
 *
 * It is a *reading of the controls*, never a second place a default lives — the
 * size word is the size picker's own value, the count is the stepper's, the seed
 * is the field's — so a strip that disagrees with the card above it is a bug in
 * one line of wiring rather than a second opinion about the game.
 *
 * Hot-seat leads where it is on, because it is the one choice on the step that
 * changes who is at the table rather than what the table is dealt.
 */
export function summaryStrip(reading: {
  size: string;
  seats: number;
  seed: number;
  hotSeat: boolean;
}): string {
  const parts = [
    reading.size,
    reading.seats === 1 ? '1 seat' : `${reading.seats} seats`,
    `seed ${reading.seed}`,
  ];
  if (reading.hotSeat) parts.unshift('hot-seat');
  return parts.join(' · ');
}

/** What a key on the title screen asks for. */
export type LandingKeyAction = 'continue' | 'new' | 'load' | 'book';

/**
 * **The title screen's four keys**, and the whole of the mapping.
 *
 * Enter continues, N starts a new game, L opens the shelf, ? opens the book —
 * the same four verbs the menu card prints, each with its key beside it, so the
 * keyboard and the card cannot drift apart. Case-insensitive, because a player
 * holding shift for `?` is not asking for a different thing.
 *
 * The keys are the **title step's alone**: on the two setup steps the letters
 * belong to the seed field, and a keyboard shortcut that eats a keystroke in a
 * text input is the oldest bug in this interface's family.
 */
export function landingKeyAction(key: string): LandingKeyAction | null {
  if (key === 'Enter') return 'continue';
  const lower = key.toLowerCase();
  if (lower === 'n') return 'new';
  if (lower === 'l') return 'load';
  if (key === '?') return 'book';
  return null;
}

/**
 * Whether a keystroke landing on this element is the page's to read.
 *
 * Two different refusals, and conflating them broke the keys outright once: a
 * press inside a **text control** is that control's whatever the key is — `n` in
 * the seed field is a seed, not a new game — while a press on a **button** is
 * the button's only when the key is the one that presses it. The title screen
 * opens with a menu button focused, so a blanket refusal for buttons was a
 * keyboard that answered nothing at all.
 */
export function keyIsThePage(key: string, target: EventTarget | null): boolean {
  // Read off the object rather than through `instanceof HTMLElement`: the rest
  // of this module is a fold a suite with no document holds, and one `instanceof`
  // against a global that does not exist there would take the whole file with it.
  const node = target as { tagName?: string; isContentEditable?: boolean } | null;
  const tag = node?.tagName?.toLowerCase() ?? '';
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return false;
  if (node?.isContentEditable === true) return false;
  // Enter and Space on a focused button are that button's own activation, and
  // reading either here as well would run the verb twice.
  return !(tag === 'button' && (key === 'Enter' || key === ' '));
}

// --- the screen -------------------------------------------------------------

export interface LandingFlow {
  /** Which of the three is on screen. */
  readonly step: LandingStep;
  /** Shows one. Raises `onStep` for whatever the step needs refreshed. */
  go(step: LandingStep): void;
  /** Back one, or nothing at the title. */
  back(): void;
  /** Unbinds the one document listener. The landing is never disposed today. */
  dispose(): void;
}

export interface LandingFlowOptions {
  /** `#landing` itself: `data-step` on it is the whole of the screen state. */
  root: HTMLElement;
  /** Raised after every change, including the first. */
  onStep?: (step: LandingStep) => void;
  /**
   * Whether something is standing over the landing — the save shelf, the book.
   * The keys are refused while one is up: that surface owns the keyboard.
   */
  busy?: () => boolean;
  /** A title-screen key, already filtered. */
  onKey?: (action: LandingKeyAction) => void;
}

/**
 * The screen state, and the one listener that reads the keyboard for it.
 *
 * **One guarded document handler**, bound once for the life of the page. The
 * landing is not a per-game screen — it is the page's own first surface and it
 * comes back over a finished game — so it has nothing to register in
 * `gameDisposers`, and a listener added on every showing is the leak that
 * register exists to prevent. `dispose` is here for symmetry and for a test.
 */
export function createLandingFlow(options: LandingFlowOptions): LandingFlow {
  const { root } = options;
  let step: LandingStep = FIRST_STEP;

  function go(next: LandingStep): void {
    step = next;
    root.dataset.step = next;
    // The leaf is walked from its own top: a step opened half-scrolled shows the
    // middle of a card the player has never seen.
    root.scrollTop = 0;
    options.onStep?.(next);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (root.hidden || step !== 'title') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (options.busy?.() === true) return;
    if (!keyIsThePage(event.key, event.target)) return;
    const action = landingKeyAction(event.key);
    if (action === null) return;
    event.preventDefault();
    options.onKey?.(action);
  }

  document.addEventListener('keydown', onKeyDown);
  go(FIRST_STEP);

  return {
    get step(): LandingStep {
      return step;
    },
    go,
    back: () => {
      const previous = stepBefore(step);
      if (previous !== null) go(previous);
    },
    dispose: () => document.removeEventListener('keydown', onKeyDown),
  };
}
