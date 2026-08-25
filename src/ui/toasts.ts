/**
 * The toast stack: news, said where it will be read, for as long as it takes to
 * read it.
 *
 * One card per announcement, under the top bar and centred. That position is
 * chosen against three things it must not cover: the empire chips at the left of
 * the bar and the research card under them, the popover column under the right
 * of it, and the middle of the board, which is where the player is actually
 * looking at the game. Under the bar and centred is the one place that is
 * neither a control nor the map's centre of attention, and it is directly below
 * the strip the same news changes the numbers in.
 *
 * Newest on top, three at a time
 * -----------------------------
 * A resolution can announce several things at once — a completion, a sighting, a
 * meter going under — and a stack that grew without limit would be a column down
 * the screen. Three is what fits without reaching the middle of the board; a
 * fourth pushes the oldest out immediately rather than waiting for its timer,
 * because the oldest is the one already read.
 *
 * Prepended rather than appended, so the newest is nearest the bar it came from
 * and the older ones sink away from it.
 *
 * Motion
 * ------
 * `prefers-reduced-motion` skips the **animation**, never the message: the card
 * appears, holds for the same beat, and is removed. That is the same bargain
 * `damageNumbers.ts` strikes, and the important half of it is that the timing is
 * identical either way — a reader who has asked for less motion is not also
 * asking to be told less, or told for a shorter time.
 *
 * Click to act
 * ------------
 * An entry that carries an action becomes a button: clicking it runs the
 * action *and* dismisses the card immediately, rather than waiting out the
 * timer. That is the whole reason `action` is on `NotificationEntry`:
 * "Granary completed in Uruk" is only half an answer if the player then has
 * to find Uruk. This module does not know what an action *does* — `onAction`
 * is the one switch, shared with the chronicle (`main.ts`'s `runAction`), so
 * a toast and its log entry can never disagree about what a click means.
 */

import { type NotificationAction, type NotificationEntry, isActionable } from './notifications';
import { setYieldText } from './yieldMark';

/** How long a toast stays up before it starts leaving. */
const TOAST_MS = 5200;

/** How long the leaving animation runs. Must match `.toast.is-leaving` in the CSS. */
const TOAST_FADE_MS = 260;

/** How many are on screen at once. See the module docblock. */
const TOAST_MAX = 3;

/**
 * Does this viewer want animation suppressed? Read at the moment of use rather
 * than cached, exactly as `controls.ts` and `damageNumbers.ts` read it: the
 * setting can change while the page is open.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export interface ToastStack {
  /** Puts one announcement up. */
  show(entry: NotificationEntry): void;
  /** Takes everything down at once. A new game, a load, the landing screen. */
  clear(): void;
}

export interface ToastStackOptions {
  /** The fixed box the cards are stacked in. Emptied on `clear`. */
  container: HTMLElement;
  /**
   * Run an entry's action. Optional for `panToCells`'s reason (see
   * `mapView.ts`): the frozen 2D renderers cannot pan, and a toast under one of
   * them is simply not clickable. `main.ts`'s `runAction` is the one
   * implementation, shared with the chronicle.
   */
  onAction?: (action: NotificationAction) => void;
}

export function createToastStack(options: ToastStackOptions): ToastStack {
  const { container, onAction } = options;
  /** Every live timer, so `clear` can cancel rather than fire into a dead card. */
  const timers = new Set<number>();

  function forget(id: number): void {
    window.clearTimeout(id);
    timers.delete(id);
  }

  function after(ms: number, run: () => void): void {
    const id = window.setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
  }

  /** Takes one card off, with the fade if this viewer wants one. */
  function dismiss(card: HTMLElement): void {
    if (!card.isConnected) return;
    if (prefersReducedMotion()) {
      card.remove();
      return;
    }
    card.classList.add('is-leaving');
    after(TOAST_FADE_MS, () => card.remove());
  }

  /** Drops the oldest cards until only `TOAST_MAX` remain. Oldest is last. */
  function trim(): void {
    while (container.childElementCount > TOAST_MAX) {
      container.lastElementChild?.remove();
    }
  }

  return {
    show(entry): void {
      const clickable = isActionable(entry, onAction !== undefined);
      // A button when it does something, a paragraph when it does not. Not a
      // button-that-does-nothing: a control the keyboard can reach and then
      // gets nothing from is worse than no control.
      const card = document.createElement(clickable ? 'button' : 'div');
      card.className = clickable ? 'toast is-clickable' : 'toast';
      if (card instanceof HTMLButtonElement) {
        card.type = 'button';
        const action = entry.action!;
        card.title = 'Show me';
        // A click both runs the action and takes the card down: the player
        // asked to be shown the thing, not to keep looking at a card about it.
        card.addEventListener('click', () => {
          onAction?.(action);
          dismiss(card);
        });
      }

      const turn = document.createElement('span');
      turn.className = 'toast-turn';
      turn.textContent = String(entry.turn);
      // Decoration with a word behind it: a screen reader gets "turn 12", not a
      // bare number leading the sentence.
      turn.setAttribute('aria-label', `turn ${entry.turn}`);

      const text = document.createElement('span');
      text.className = 'toast-text';
      // The entry's own string stays the sentence — it is what the log replays
      // and what a screen reader is given — but any yield glyph in it is *drawn*
      // here rather than printed as an emoji, which is the whole of the retiral
      // (see `src/ui/yieldMark.ts`). The marks are `aria-hidden`, so the spoken
      // line is unchanged: `setYieldText` leaves the text nodes alone.
      setYieldText(text, entry.text);

      card.append(turn, text);
      container.prepend(card);
      trim();

      after(TOAST_MS, () => dismiss(card));
    },
    clear(): void {
      for (const id of [...timers]) forget(id);
      container.replaceChildren();
    },
  };
}
