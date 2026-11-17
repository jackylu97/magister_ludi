/**
 * **The parchment sheet's frame** — the contract eight full-screen screens
 * share, written once.
 *
 * Statecraft, Religion, Trade, Diplomacy, the Ledger, the Reliquary, the Bead
 * table and the Compendium are eight different documents on one piece of
 * furniture. Each of them used to carry its own copy of the furniture: the
 * same `isOpen`/`open`/`close`/`toggle`/`refresh`/`dispose` six, the same
 * `hidden`-is-the-whole-of-the-screen-state rule, the same three doors, the
 * same `aria-expanded` mirror on the bar control that opens it, and the same
 * teardown. Eight copies of one contract, and by the time the audit counted
 * them (`docs/audit/simplify.md` §2) they had drifted in four places nobody
 * had chosen:
 *
 *   · three of the eight closed on a `mousedown` on the ground and five on a
 *     `click` — and a `click` also fires when a *drag* that began inside the
 *     sheet is released on the ground, so on five of them selecting a line of
 *     text and letting go past the edge of the paper shut the sheet;
 *   · three restored the keyboard to the control that opened them and five
 *     dropped focus on the floor;
 *   · four guarded `open` against being called on a sheet already up and four
 *     did not, so on those four a second press re-ran the "shut everything
 *     else" hook against a HUD that had nothing left to shut;
 *   · two emptied their body on dispose and six left a game's worth of DOM
 *     standing behind the landing screen.
 *
 * This module is that contract, and every one of the four now has one answer.
 *
 * The contract
 * ------------
 * **`hidden` is the whole of the screen state.** There is no boolean beside it
 * — `isOpen` reads the attribute, so the stylesheet, `inputBlocked` in
 * `main.ts` and this module can never disagree about whether a sheet is up.
 * Entry LVII is what that rule is for: a screen that kept its own flag froze
 * when a stale closure answered for a live sheet.
 *
 * **Three doors and one function.** The ×, Escape, and a press on the ground
 * around the paper all arrive at `close`, so a screen with something to do on
 * the way out (Statecraft signs its arrangement; Trade forgets which chooser
 * was open) writes it once instead of at each door.
 *
 * **Escape is claimed on the window, capturing.** The board reads keys too, and
 * a sheet that let the press through would pan the map on the way out. It is
 * claimed only while the sheet is up — a listener that swallowed Escape from
 * behind a hidden overlay is the leaked-listener bug in a different costume —
 * and it is unbound by `dispose`.
 *
 * **The keyboard goes to the ×, and comes back to the trigger.** There is
 * nothing on a freshly opened sheet to press but the way out, and a player who
 * opened it from the bar is put back on the bar. `preventScroll` throughout: the
 * sheet has just been shown at its own scroll-top and a focus that scrolled it
 * would undo that.
 *
 * **Disposal replaces a screen; closing preserves it.** Each screen's `dispose`
 * goes into `gameDisposers` in `main.ts`, swept at the top of `boot`. Restart
 * and load reuse the booted screens, so they close them and keep their listeners
 * (`test/ui/screenLifecycle.test.ts` is the register).
 *
 * How a sheet comes and goes (batch SS8, the Ornament board)
 * -----------------------------------------------------------
 * A sheet **settles**: it rises from 8 px below in 240 ms on
 * `cubic-bezier(0.16, 1, 0.3, 1)`, a curve that slows into place without an
 * overshoot, while the ground fades in. That is the stylesheet's, on the class
 * every sheet on this frame wears (`.statecraft-sheet`).
 *
 * It **leaves** the same way back: it sinks the same 8 px and fades in 160 ms.
 * `hidden` still goes on the moment `close` runs, so the screen state is right
 * at once and nothing waits on the picture: the overlay keeps being drawn under
 * `is-leaving`, and `inert`, so no press or key can reach the sheet on its way
 * out, and every press lands on the board behind it. The class comes off when
 * the animation ends, or after `LEAVE_FALLBACK_MS` if no animation runs. A sheet
 * opened again while it leaves drops the class and settles from where it is.
 *
 * Opening never waits either: the sheet is painted, and the keyboard is on its
 * ×, before the first frame of the rise. With reduced motion the sheet only
 * fades in and out, and does not move.
 *
 * The two screens that are not on this frame, and why
 * ---------------------------------------------------
 * The **star chart** (`techTree.ts`) and the **Abacus** (`abacusScreen.ts`) are
 * the other two full-screen overlays, and they stay on their own. Both own a
 * *measured stage* rather than a document — a chart laid out from the height of
 * the element it is going into, a WebGL canvas that measures zero while
 * `display: none` — so their opening is a sequence with the sizing in the
 * middle of it rather than a paint at the end. Both remember the element that
 * had the keyboard before they opened and give it back, rather than handing it
 * to a bar control. And both claim Escape on the *overlay* instead of the
 * window, precisely so they can swallow their own hotkey in the same handler:
 * `T` and `A` reach `controls.ts` through a window listener, and a chart that
 * closed on `T` without stopping the press would be reopened by it on the way
 * out. Putting either on this frame would mean adding all three of those as
 * knobs, and a frame with a knob for every screen is eight copies wearing one
 * name.
 */

export interface ModalShell {
  /** True while the overlay is showing. Reads `hidden`; there is no second flag. */
  readonly isOpen: boolean;
  /** Shows and paints. On a sheet already up, repaints and nothing else. */
  open(): void;
  /** Hides, forgets, and hands the keyboard back. Safe on a sheet already down. */
  close(): void;
  toggle(): void;
  /** Repaints iff the sheet is up. Cheap enough to call on every state change. */
  refresh(): void;
  /** Unbinds every listener, hides the overlay and empties the body. */
  dispose(): void;
}

interface ModalShellOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /**
   * The element the sheet's body is built into, emptied on `dispose`.
   *
   * Optional for the one screen whose body is built once at construction rather
   * than on every open (the Compendium): emptying that one would take the book
   * apart.
   */
  body?: HTMLElement;
  /** The overlay's own × button. Holds the keyboard while the sheet is up. */
  closeButton: HTMLElement;
  /** The bar control that opens it, for the `aria-expanded` mirror and the focus return. */
  trigger?: HTMLElement | null;
  /**
   * The other controls that open this sheet (batch SS2: a corner panel quick
   * button beside a bar tab). Each mirrors `aria-expanded` as the trigger does,
   * and the keyboard goes back to whichever of them held it when the sheet
   * opened; otherwise to the trigger. Asked each time, because some of them are
   * built after the sheet is.
   */
  doors?: () => readonly (HTMLElement | null | undefined)[];
  /** What this sheet paints. Called on every open and on every `refresh` while up. */
  draw: () => void;
  /** Shuts whatever else the HUD has up. Raised on a genuine opening, before the sheet shows. */
  onOpen?: () => void;
  /**
   * The sheet's own start-of-visit, run on a genuine opening after the overlay
   * is shown and before `draw` — what a fresh sheet of paper forgets.
   */
  onShow?: () => void;
  /**
   * The sheet's own end-of-visit, run on a genuine close after the overlay is
   * hidden and before the keyboard goes back. Leaving is where a screen with a
   * proposal on it signs or discards.
   */
  onClose?: () => void;
  /**
   * Keys this sheet claims beyond Escape, while it is up. Return `true` when the
   * press was handled; the shell then does nothing else with it. The Reliquary's
   * ‹ › are the only user today.
   */
  onKey?: (event: KeyboardEvent) => boolean;
  /** Extra teardown, run before the listeners come off. */
  onDispose?: () => void;
}

/** The class that keeps a closed overlay drawn while it fades out. See the docblock. */
const LEAVING = 'is-leaving';

/**
 * How long a leaving overlay may stay drawn if its animation never reports
 * that it ended (no animation, or a stylesheet that has none). Longer than the
 * stylesheet's 160 ms, so it never cuts an animation short.
 */
const LEAVE_FALLBACK_MS = 400;

export function createModalShell(options: ModalShellOptions): ModalShell {
  const { overlay, body, closeButton, trigger } = options;
  /** The control the keyboard goes back to on close: the door it left, or the trigger. */
  let returnTo: HTMLElement | null = trigger ?? null;
  /** The fallback timer of a leave in progress, or `undefined`. */
  let leaveTimer: number | undefined;

  /** Stops drawing a closed overlay: the leave has ended, or the sheet opens again. */
  function endLeave(): void {
    if (leaveTimer !== undefined) {
      window.clearTimeout(leaveTimer);
      leaveTimer = undefined;
    }
    overlay.classList.remove(LEAVING);
    overlay.inert = false;
  }

  /** Keeps the just-closed overlay drawn, inert, while it fades out. */
  function startLeave(): void {
    endLeave();
    overlay.inert = true;
    overlay.classList.add(LEAVING);
    leaveTimer = window.setTimeout(endLeave, LEAVE_FALLBACK_MS);
  }

  /** The leave's own animation has ended on the overlay. */
  function onAnimationEnd(event: AnimationEvent): void {
    if (event.target === overlay && overlay.classList.contains(LEAVING)) endLeave();
  }

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  /** The trigger and every other door, present ones only. */
  function allDoors(): HTMLElement[] {
    const doors = [trigger, ...(options.doors?.() ?? [])];
    return doors.filter((door): door is HTMLElement => door !== null && door !== undefined);
  }

  /** The bar control's mirror of the one flag. A screen with no trigger has none to keep. */
  function setExpanded(): void {
    for (const door of allDoors()) door.setAttribute('aria-expanded', String(isOpen()));
  }

  function open(): void {
    // A sheet already up is repainted and left alone: its `onOpen` has nothing
    // left to shut, its `onShow` would throw away the visit in progress, and
    // stealing the keyboard back to the × mid-read is the one thing a second
    // press must not do. Which is what makes `open(argument)` safe to call as
    // "show me this instead" — the screens that take one set it and call here.
    if (isOpen()) {
      options.draw();
      return;
    }
    // Asked before `onOpen`, which may fold the panel the door sits in.
    const active = document.activeElement;
    returnTo = allDoors().find((door) => door === active) ?? trigger ?? null;
    options.onOpen?.();
    endLeave();
    overlay.hidden = false;
    setExpanded();
    options.onShow?.();
    options.draw();
    closeButton.focus({ preventScroll: true });
  }

  /**
   * The one way out, and the reason there is only one: leaving is a decision on
   * some of these sheets (Statecraft's arrangement becomes law), and a rule
   * enforced at three doors is a rule with three chances to be wrong.
   *
   * The overlay is hidden **first**, so a repaint provoked by whatever `onClose`
   * does cannot draw a screen that is on its way out.
   */
  function close(): void {
    if (!isOpen()) return;
    overlay.hidden = true;
    startLeave();
    setExpanded();
    options.onClose?.();
    returnTo?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen() || event.defaultPrevented) return;
    if (options.onKey?.(event) === true) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  /**
   * A press on the ground around the sheet closes it — on `mousedown` rather
   * than `click`, because a `click` fires on the nearest common ancestor of the
   * press and the release, so a selection dragged from inside the paper and let
   * go past its edge counts as a click on the overlay. The gesture is "press the
   * table", not "finish a drag somewhere near it".
   */
  function onGround(event: MouseEvent): void {
    if (event.target === overlay) close();
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('mousedown', onGround);
  overlay.addEventListener('animationend', onAnimationEnd);
  window.addEventListener('keydown', onKeyDown, true);
  setExpanded();

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    open,
    close,
    toggle(): void {
      if (isOpen()) close();
      else open();
    },
    refresh(): void {
      if (isOpen()) options.draw();
    },
    dispose(): void {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('mousedown', onGround);
      overlay.removeEventListener('animationend', onAnimationEnd);
      window.removeEventListener('keydown', onKeyDown, true);
      endLeave();
      overlay.hidden = true;
      options.onDispose?.();
      body?.replaceChildren();
    },
  };
}
