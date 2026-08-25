/**
 * The chronicle: every toast this seat has been shown, kept where it can be gone
 * back to.
 *
 * A toast is gone in five seconds and that is correct — it is a notice, not a
 * document — but a player who was reading a city screen when their frontier was
 * raided should be able to find out what they missed. So the same entries file
 * themselves into a per-seat list behind a button in the bar, in the popover
 * idiom every other card in that bar uses (`popover.ts`: no scrim, Esc through
 * `controls`, focus trapped while it is up and handed back on close).
 *
 * Newest first, because that is what the button is pressed to find out, and
 * turn-stamped in mono like every other number in this interface.
 *
 * The unread badge
 * ----------------
 * A count since the last open, not a dot: "three things happened" and "eleven
 * things happened" are different amounts of urgency, and the list behind the
 * button is capped anyway so the number is never absurd. Cleared *on open* and
 * not on close — the player has seen it the moment the card is up.
 *
 * Not a record
 * ------------
 * The list is view state and says so at the bottom of the card. It is cleared by
 * a new game or a load, it is not saved, and the thing that actually reproduces a
 * game is the command log in the save file (`sim/game.ts`). See the docblock in
 * `notifications.ts`.
 */

import {
  type NotificationAction,
  type NotificationEntry,
  type NotificationLog,
  isActionable,
} from './notifications';
import { type Popover, createPopover } from './popover';
import { setYieldText } from './yieldMark';

/** Above this the badge stops counting and starts gesturing. */
const BADGE_MAX = 99;

export interface NotificationsPanel {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  /**
   * Re-reads the log for whichever seat is playing: the badge always, and the
   * list too while the card is up. Called wherever the rest of the HUD is
   * refreshed, so a seat change swaps both.
   */
  refresh(): void;
}

export interface NotificationsPanelOptions {
  /** The card. Hidden with `hidden` while closed, like every other popover. */
  panel: HTMLElement;
  /** The bar button that opens it, and carries the badge. */
  trigger: HTMLElement;
  /** The card's own ×. */
  closeButton: HTMLElement;
  /** The element the entries are written into. Rewritten on every render. */
  list: HTMLElement;
  /** The count bubble on the trigger. Hidden at zero. */
  badge: HTMLElement;
  log: NotificationLog;
  /** Whose chronicle to show. Asked afresh: the seat can change under the card. */
  localPlayerId: () => number;
  /**
   * Run an entry's action. Absent under the frozen 2D renderers. `main.ts`'s
   * `runAction` is the one implementation, shared with the toast stack.
   */
  onAction?: (action: NotificationAction) => void;
  /** Told when this opens, so the HUD's other cards can shut. */
  onOpenPopover?: () => void;
}

export function createNotificationsPanel(
  options: NotificationsPanelOptions,
): NotificationsPanel {
  const { panel, trigger, closeButton, list, badge, log, localPlayerId, onAction, onOpenPopover } =
    options;

  /** One entry, as a row: the turn in mono, then what happened. */
  function row(entry: NotificationEntry): HTMLElement {
    const clickable = isActionable(entry, onAction !== undefined);
    const el = document.createElement(clickable ? 'button' : 'div');
    el.className = clickable ? 'log-entry is-clickable' : 'log-entry';
    if (el instanceof HTMLButtonElement) {
      el.type = 'button';
      const action = entry.action!;
      el.title = 'Show me';
      el.addEventListener('click', () => onAction?.(action));
    }

    const turn = document.createElement('span');
    turn.className = 'log-entry-turn';
    turn.textContent = String(entry.turn);
    turn.setAttribute('aria-label', `turn ${entry.turn}`);

    const text = document.createElement('span');
    text.className = 'log-entry-text';
    // The same treatment the toast gives the same sentence — the string is the
    // record, the glyphs in it are drawn. See `src/ui/yieldMark.ts`.
    setYieldText(text, entry.text);

    el.append(turn, text);
    return el;
  }

  /** Writes the whole list. Cheap: it is capped, and this runs on open only. */
  function renderList(): void {
    const entries = log.entries(localPlayerId());
    list.replaceChildren();
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'Nothing has happened yet.';
      list.append(empty);
      return;
    }
    for (const entry of entries) list.append(row(entry));
  }

  function renderBadge(): void {
    const unread = log.unread(localPlayerId());
    badge.hidden = unread === 0;
    badge.textContent = unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread);
    trigger.setAttribute(
      'aria-label',
      unread === 0 ? 'Chronicle' : `Chronicle, ${unread} unread`,
    );
  }

  const card: Popover = createPopover({
    panel,
    trigger,
    closeButton,
    onOpen: () => {
      onOpenPopover?.();
      // Read before the list is written, so the badge the player is looking at
      // goes out in the same frame the entries it was counting appear.
      log.markRead(localPlayerId());
      renderBadge();
      renderList();
    },
  });

  renderBadge();

  return {
    get isOpen() {
      return card.isOpen;
    },
    open: () => card.open(),
    close: () => card.close(),
    refresh(): void {
      renderBadge();
      // An open card is showing a list from before whatever just happened —
      // the same reason the meter cards re-render themselves on every HUD pass.
      if (card.isOpen) {
        log.markRead(localPlayerId());
        renderBadge();
        renderList();
      }
    },
  };
}
