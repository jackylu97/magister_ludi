/**
 * The turn announcement: "Your *turn*, Magister".
 *
 * A card that drops onto the middle of the board for a beat and a half when a
 * turn resolves, and a smaller one when the development harness moves you to
 * another seat. It is the loudest thing in the interface on purpose — the rest
 * of the HUD is deliberately quiet so that this lands (see
 * `docs/design-specimen.html`).
 *
 * Why DOM rather than something drawn into the scene: it is an interface event,
 * not a board event. Nothing about it should survive a camera move, it wants the
 * display face at a real type size, and it must be readable by a screen reader —
 * all three are free in a `<div>` and all three are work in WebGL.
 *
 * Behaviour
 * ---------
 * One announcement at a time: a second one replaces the first rather than
 * stacking, because two overlapping cards say less than one. It dismisses on its
 * own timer, and early on any click or key press — an announcement that steals a
 * moment from a player who is already moving is a nuisance, and the fastest way
 * to prove it is not modal is to let anything at all dismiss it.
 *
 * The container never takes pointer events (see `#turn-splash` in style.css), so
 * the board underneath stays draggable while a splash is up.
 */

/** How long a full turn announcement stays up. */
const TURN_MS = 1600;
/** The seat hop is housekeeping, so it says its piece and goes. */
const SEAT_MS = 1100;
/** Matches the `splash-out` animation in style.css. */
const FADE_MS = 200;

export interface TurnSplash {
  /** "Your turn, <name>" — a new turn has begun and it is yours to play. */
  announceTurn(playerName: string): void;
  /** "Now seated: <name>" — the harness has moved you to another seat. */
  announceSeat(playerName: string): void;
  /**
   * "<Tech> mastered" — a technology completed in the resolution that just ran,
   * with whatever it did to the army underneath it.
   *
   * It takes the same slot as the turn announcement and, when both are true at
   * once, it is the one that gets shown: "your turn" happens every turn and a
   * discovery happens twenty times a game.
   */
  announceTech(techName: string, notes: readonly string[]): void;
  /** Takes down whatever is showing. Called on a new game. */
  clear(): void;
  dispose(): void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createTurnSplash(container: HTMLElement): TurnSplash {
  /** The card currently on screen, if any. Only ever one. */
  let current: HTMLElement | null = null;
  let hideTimer: number | null = null;
  let removeTimer: number | null = null;

  function cancelTimers(): void {
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    if (removeTimer !== null) window.clearTimeout(removeTimer);
    hideTimer = null;
    removeTimer = null;
  }

  /** Takes the card down immediately, without the fade. */
  function clear(): void {
    cancelTimers();
    current?.remove();
    current = null;
  }

  /** Fades the card out, then removes it. Safe to call when nothing is up. */
  function dismiss(): void {
    if (!current) return;
    const leaving = current;
    current = null;
    cancelTimers();
    leaving.classList.add('is-leaving');
    removeTimer = window.setTimeout(() => {
      leaving.remove();
      removeTimer = null;
    }, prefersReducedMotion() ? FADE_MS / 2 : FADE_MS);
  }

  function show(card: HTMLElement, ms: number): void {
    clear();
    current = card;
    container.append(card);
    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      dismiss();
    }, ms);
  }

  function announceTurn(playerName: string): void {
    const card = document.createElement('div');
    card.className = 'turn-splash';
    // Built as nodes rather than innerHTML: a player name is data, and data
    // never gets to be markup.
    card.append(document.createTextNode('Your '));
    const accent = document.createElement('em');
    accent.textContent = 'turn';
    card.append(accent, document.createTextNode(`, ${playerName}`));
    show(card, TURN_MS);
  }

  function announceSeat(playerName: string): void {
    const card = document.createElement('div');
    card.className = 'turn-splash is-seat';
    card.append(document.createTextNode('Now seated: '));
    const name = document.createElement('span');
    name.className = 'turn-splash-name';
    name.textContent = playerName;
    card.append(name);
    show(card, SEAT_MS);
  }

  function announceTech(techName: string, notes: readonly string[]): void {
    const card = document.createElement('div');
    card.className = 'turn-splash is-tech';
    const name = document.createElement('span');
    name.className = 'turn-splash-name';
    name.textContent = techName;
    card.append(name, document.createTextNode(' mastered'));
    // The auto-upgrade line, when there is one: what a discovery did to the
    // pieces already on the board is the part a player would otherwise miss.
    if (notes.length > 0) {
      const note = document.createElement('span');
      note.className = 'turn-splash-note';
      note.textContent = notes.join(' · ');
      card.append(note);
    }
    show(card, TURN_MS);
  }

  // Any input at all takes it down. Capturing listeners on the window, so a
  // click on a button dismisses the splash *and* still presses the button.
  const onInput = (): void => dismiss();
  window.addEventListener('pointerdown', onInput, true);
  window.addEventListener('keydown', onInput, true);

  return {
    announceTurn,
    announceSeat,
    announceTech,
    clear,
    dispose(): void {
      window.removeEventListener('pointerdown', onInput, true);
      window.removeEventListener('keydown', onInput, true);
      clear();
    },
  };
}
