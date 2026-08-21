/**
 * The HUD's transient surfaces: the game-setup menu and the controls sheet.
 *
 * Both are the same object — a card anchored under the top-left HUD card, opened
 * from a small quiet button, closed by Esc, by a click outside, or by pressing
 * that button again. They live here rather than in `main.ts` because the *only*
 * interesting thing about them is the part that is easy to get wrong, and it is
 * the same part twice: keyboard focus.
 *
 * Focus discipline
 * ----------------
 * Opening remembers what was focused, then moves focus to the first control in
 * the card. While it is open, Tab cycles inside it and never escapes to the
 * board behind. Closing puts focus back exactly where it was, which is what
 * makes these buttons usable by keyboard alone: press, adjust, Esc, and you
 * are back on the button you started from.
 *
 * Not a modal
 * -----------
 * There is no scrim and `aria-modal` is not set: the board keeps playing behind
 * it, and a popover that greyed out a live game would be lying about what it
 * costs to leave it open. Focus is trapped, but attention is not.
 *
 * Escape
 * ------
 * Deliberately *not* handled here. `src/ui/controls.ts` owns the one Escape key
 * and the order it backs things out in (move mode, then popovers, then the city
 * panel, then the selection); it reaches these through its `closePopovers`
 * option, which `main.ts` wires to `close()` on both cards. Two modules both
 * listening for Escape is how you get a key that does two things at once.
 */

/** Elements that can hold focus inside a popover. Buttons, fields, links. */
const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), ' +
  'textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface Popover {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
}

export interface PopoverOptions {
  /** The card itself. Hidden with the `hidden` attribute while closed. */
  panel: HTMLElement;
  /** The button that opens it. Carries `aria-expanded` and takes focus back. */
  trigger: HTMLElement;
  /**
   * The card's own × button.
   *
   * Not decoration: it is what gives a card of pure text — the controls sheet —
   * something for the focus trap to hold and for a touch or trackpad user to
   * aim at. Every popover has one, so every popover can be closed the same way.
   */
  closeButton: HTMLElement;
  /** Told whenever this popover opens, so a sibling can shut itself. */
  onOpen?: () => void;
}

export function createPopover(options: PopoverOptions): Popover {
  const { panel, trigger, closeButton, onOpen } = options;
  let open = false;
  let restoreTo: HTMLElement | null = null;

  function focusables(): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }

  function setOpen(next: boolean): void {
    if (open === next) return;
    // Asked before the card is hidden: once it is, the browser has already
    // moved focus off whatever was inside it and the question cannot be
    // answered any more.
    const heldFocus = panel.contains(document.activeElement);

    open = next;
    panel.hidden = !next;
    trigger.setAttribute('aria-expanded', String(next));

    if (next) {
      const active = document.activeElement as HTMLElement | null;
      // The trigger is the fallback rather than `null`: whatever route opened
      // this, closing it should always leave the keyboard somewhere sensible,
      // and "on the button you just used" is the only universally sensible
      // place. `document.body` is not a place.
      restoreTo = active && active !== document.body ? active : trigger;
      onOpen?.();
      // The first control, not the card: a popover that opens with focus on a
      // container gives the screen reader nothing to read and the keyboard
      // nowhere to go. The × is skipped when there is anything else — opening
      // a card with the cursor already on "close" is an odd greeting — and
      // taken when there is not, which is the controls sheet's case.
      const items = focusables();
      (items.find((el) => el !== closeButton) ?? items[0])?.focus();
      return;
    }
    // Only take focus back if it was still inside the card being closed —
    // clicking a seat chip outside also closes this, and stealing focus back
    // from what the player just clicked would be rude.
    if (heldFocus) (restoreTo ?? trigger).focus();
    restoreTo = null;
  }

  // Tab wraps inside the card. Shift+Tab wraps the other way.
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  trigger.addEventListener('click', () => setOpen(!open));
  closeButton.addEventListener('click', () => setOpen(false));

  // Click-away. `pointerdown` rather than `click` so that pressing on the board
  // closes the card before the board's own press handling starts panning under
  // it — the card is gone by the time the drag begins, not after it ends.
  document.addEventListener('pointerdown', (event) => {
    if (!open) return;
    const target = event.target as Node | null;
    if (target && (panel.contains(target) || trigger.contains(target))) return;
    setOpen(false);
  });

  return {
    get isOpen() {
      return open;
    },
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
  };
}
