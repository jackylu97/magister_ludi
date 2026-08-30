/**
 * The victory sheet: **the Bead Race is decided, and everybody is told.**
 *
 * `triumphModal.ts`'s sibling and deliberately the same dress — the turn card's
 * `gilt-frame` double rule, the display face for the name, one affirmative
 * control, Enter and Escape both meaning "proceed" because there is no second
 * answer for Escape to mean. The two differ in exactly one way, and it is the
 * reason this file exists rather than a third `TriumphNews` shape: a Triumph is
 * *yours* and is shown to you alone, and a win is the **world's** and is shown
 * to every seat. A player who lost wants to be told they lost, by name, at the
 * moment it happened — a chronicle line three scrolls down is not that.
 *
 * Raised at the hand-over, behind the turn card (`scheduleHandOver` in
 * `controls.ts`, CLAUDE.md's three beats), or at once for a win decided by a
 * command the player just issued.
 *
 * There is no queue: a game is won once. `show` on an already-standing sheet
 * replaces nothing and does nothing, which is what stops a second End Turn on a
 * finished game re-raising it.
 *
 * Data is data: every string arrives as a text node (`turnSplash.ts`'s rule).
 */

/** One decided game, as this sheet needs to read it. */
export interface VictoryNews {
  /** "Crimson". The winner's own name, whoever is reading. */
  winner: string;
  /** True when the seat reading this is the one that won. */
  mine: boolean;
  /** How many beads carried them over the line. */
  beads: number;
  /** The threshold that was reached. */
  threshold: number;
}

/**
 * The sheet, as data — everything on it except the DOM.
 *
 * Split out for `triumphFace`'s reason exactly: this suite has no jsdom, and
 * the three things that can be *quietly wrong* here are all sentences.
 */
export interface VictoryFace {
  /** "Victory" or "The Bead Race is decided". */
  eyebrow: string;
  /** "Crimson has won the Bead Race". The one line the sheet exists to say. */
  headline: string;
  /** What it took, in the tabular voice: "20 of 20 beads". */
  figure: string;
  /** The sentence under it, which differs for the winner and for everyone else. */
  text: string;
}

/**
 * What the sheet says.
 *
 * The headline names the winner **in the third person even for the winner**,
 * because it is the world's announcement and the sheet is the same object on
 * every screen; the second person belongs to the line underneath, which is the
 * only part that is about the reader.
 */
export function victoryFace(news: VictoryNews): VictoryFace {
  return {
    eyebrow: news.mine ? 'victory' : 'the race is decided',
    headline: `${news.winner} has won the Bead Race`,
    figure: `${news.beads} of ${news.threshold} beads`,
    text: news.mine
      ? 'The frame is full. The reckoning is yours.'
      : 'The frame is full on another rod. The reckoning has gone elsewhere.',
  };
}

export interface VictoryModal {
  /** Raises the sheet. A second call while it stands does nothing. */
  show(news: VictoryNews): void;
  readonly isOpen: boolean;
  /** Takes the sheet down. Called on a new game. */
  clear(): void;
  dispose(): void;
}

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createVictoryModal(container: HTMLElement): VictoryModal {
  let standing: VictoryNews | null = null;
  let restoreFocus: HTMLElement | null = null;

  function clear(): void {
    standing = null;
    container.replaceChildren();
    container.hidden = true;
    const back = restoreFocus;
    restoreFocus = null;
    back?.focus({ preventScroll: true });
  }

  function render(news: VictoryNews): void {
    const face = victoryFace(news);
    container.replaceChildren();

    const sheet = element('div', 'triumph-sheet victory-sheet gilt-frame');
    sheet.append(element('p', 'triumph-eyebrow', face.eyebrow));
    sheet.append(element('h2', 'triumph-name', face.headline));
    sheet.append(element('p', 'triumph-text', face.text));

    const pays = element('p', 'triumph-pays');
    pays.append(element('span', 'triumph-pays-figure', face.figure));
    sheet.append(pays);

    const foot = element('div', 'triumph-foot');
    const button = document.createElement('button');
    button.className = 'triumph-proceed';
    button.type = 'button';
    button.append(element('span', 'triumph-proceed-label', 'Proceed'));
    button.append(element('kbd', 'triumph-proceed-key', 'Enter'));
    button.addEventListener('click', () => clear());
    foot.append(button);
    sheet.append(foot);

    container.append(sheet);
    container.hidden = false;
    button.focus({ preventScroll: true });
  }

  // Capturing, like the Triumph sheet's, so this answers a key before the
  // board's own handlers see it.
  function onKeyDown(event: KeyboardEvent): void {
    if (container.hidden || standing === null) return;
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    clear();
  }
  window.addEventListener('keydown', onKeyDown, true);

  return {
    show(news: VictoryNews): void {
      if (standing !== null) return;
      const active = document.activeElement as HTMLElement | null;
      restoreFocus = active && active !== document.body ? active : null;
      standing = news;
      render(news);
    },
    get isOpen(): boolean {
      return !container.hidden;
    },
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      clear();
    },
  };
}
