/**
 * "Are you sure?" — the one place this interface asks a player to confirm
 * something it cannot take back.
 *
 * The user's ruling of 2026-08-29, alongside the disband verb it was written
 * for: *"There should be a confirmation modal (are you sure you want to delete
 * this unit?)"*. It is deliberately a **card of this game's own**, never
 * `window.confirm` — the platform dialog is a different typeface, a different
 * language, a different set of buttons, it steals the whole browser rather than
 * the page, and on some platforms it is suppressible entirely, which for a
 * destructive verb is the failure that matters. A source-reading pin in
 * `test/ui/confirmCard.test.ts` keeps `confirm(` out of `src/ui` for good.
 *
 * The mild kind of modal
 * ----------------------
 * `offerCard.ts` is the blocking screen in this interface and `triumphModal.ts`
 * is the news sheet; this is the third and smallest shape, and it borrows the
 * sheet's mount whole — one scrim, one centred parchment card, a capturing
 * `keydown` on the window so the board never sees the key. What it does *not*
 * borrow is the sheet's single affirmative control, because a question has two
 * answers:
 *
 *   · **Escape and Cancel mean no.** Escape is the one key a player presses
 *     without reading, so it must be the harmless answer;
 *   · **Enter means yes**, and focus lands on **Cancel** rather than on the
 *     confirm button — so a player who arrives here by reflex and presses the
 *     space bar keeps their unit. Enter is still the fast path for the player
 *     who meant it.
 *
 * Split for the suite that has no jsdom
 * -------------------------------------
 * Everything about this card that can be *quietly* wrong is DOM-free and lives
 * above `createConfirmCard`: what the face says (`confirmFace`, the default
 * cancel label), which answer a key is (`confirmAnswer`), and — the one that
 * would be a real bug — whether a confirmed question can be confirmed twice
 * (`createConfirmGate`). `triumphModal.ts` made the same split for the same
 * reason; drawing the result is a dozen `append` calls that fail loudly or not
 * at all.
 *
 * Data is data: every string arrives as a text node (`turnSplash.ts`'s rule).
 */

import { COURT_MARKS, courtMarkDataUri } from '../art/courtMarks';
import { element } from './dom';

/** What a caller asks. `cancelLabel` is the only thing with a default. */
export interface ConfirmRequest {
  /** The question, in the display face: "Disband the Warrior?" */
  title: string;
  /** What saying yes actually does. One or two sentences, never a paragraph. */
  body: string;
  /** The affirmative button's word. A **verb**, never "OK" — see `confirmFace`. */
  confirmLabel: string;
  /** The harmless button's word. "Cancel" when the caller does not care. */
  cancelLabel?: string;
  /** What follows, one short line each, printed as a list under the body. */
  points?: readonly string[];
  /**
   * A grave act (Declare war, version A, Quiet Table build stage 1): the
   * confirm is the war red with the blade mark, and **Enter does not
   * confirm** (`confirmAnswer`). Focus is on the harmless answer as always.
   */
  tone?: 'war';
}

/** The request with every default filled in — what the card actually draws. */
interface ConfirmFace {
  title: string;
  body: string;
  points: readonly string[];
  confirmLabel: string;
  cancelLabel: string;
  tone: 'plain' | 'war';
}

/**
 * The face a request draws.
 *
 * One rule and it is the default: a caller that names no `cancelLabel` gets
 * "Cancel". The *confirm* label has no default on purpose — "OK" on a card
 * whose whole job is to make somebody read one sentence is the interface
 * throwing away the one word that says what is about to happen.
 */
export function confirmFace(request: ConfirmRequest): ConfirmFace {
  const cancel = request.cancelLabel;
  return {
    title: request.title,
    body: request.body,
    points: request.points ?? [],
    confirmLabel: request.confirmLabel,
    cancelLabel: cancel !== undefined && cancel.length > 0 ? cancel : 'Cancel',
    tone: request.tone ?? 'plain',
  };
}

/** The two answers. There is no third — a question left open is simply open. */
type ConfirmAnswer = 'confirm' | 'cancel';

/**
 * Which answer a key is, or `null` for every key this card has no opinion
 * about.
 *
 * Pure, and separate from the listener, because the asymmetry is the whole
 * design: Escape is *not* a second way to say yes here, unlike the Triumph
 * sheet where both keys proceed. See the module docblock.
 *
 * A grave question (`tone: 'war'`) takes no Enter at all: the key falls to
 * the focused button, which is the harmless one, so a reflex Enter keeps the
 * peace.
 */
export function confirmAnswer(key: string, tone: 'plain' | 'war' = 'plain'): ConfirmAnswer | null {
  if (key === 'Enter') return tone === 'war' ? null : 'confirm';
  if (key === 'Escape') return 'cancel';
  return null;
}

/**
 * The card's decision, with no DOM in it: one question at a time, answered
 * exactly once.
 *
 * The property worth guarding is the one a click and a key can both break:
 * `settle` **takes** the callback before it runs it, so a stray Enter arriving
 * in the same tick as a click on Disband cannot let two units go. Answering a
 * gate that is not open does nothing and says so.
 */
interface ConfirmGate {
  readonly isOpen: boolean;
  /** Puts a question. A second `open` replaces the first, unanswered. */
  open(onConfirm: () => void): void;
  /** Answers. Returns whether this closed a live question. */
  settle(answer: ConfirmAnswer): boolean;
}

export function createConfirmGate(): ConfirmGate {
  /** Presence is the state: a live question is a callback waiting. */
  let pending: (() => void) | null = null;

  return {
    get isOpen(): boolean {
      return pending !== null;
    },
    open(onConfirm: () => void): void {
      pending = onConfirm;
    },
    settle(answer: ConfirmAnswer): boolean {
      const run = pending;
      if (run === null) return false;
      // Cleared *before* the callback, never after: the callback re-renders
      // panels, and a panel that raised another question during that render
      // must not find this one still standing.
      pending = null;
      if (answer === 'confirm') run();
      return true;
    },
  };
}

export interface ConfirmCard {
  /**
   * Raises the card. `onConfirm` runs only if the player says yes, and at most
   * once. A second `ask` replaces whatever was up, unanswered.
   */
  ask(request: ConfirmRequest, onConfirm: () => void): void;
  /** Takes the card down as a "no". The Escape route, and a new game's. */
  close(): void;
  readonly isOpen: boolean;
  dispose(): void;
}

/** The blade mark of Declare war (`courtMarks.ts`), for the grave confirm. Text-coloured. */
export function bladeMark(): HTMLElement {
  const node = element('span', 'court-mark is-war');
  node.setAttribute('aria-hidden', 'true');
  node.style.setProperty('--court-mark', `url("${courtMarkDataUri('war')}")`);
  node.style.setProperty('--court-mark-w', `${COURT_MARKS.war.width}px`);
  node.style.setProperty('--court-mark-h', `${COURT_MARKS.war.height}px`);
  return node;
}

export function createConfirmCard(container: HTMLElement): ConfirmCard {
  const gate = createConfirmGate();
  /** Where focus goes back to once the question is answered. */
  let restoreFocus: HTMLElement | null = null;
  /** The tone of the question on the card, for the keys. */
  let tone: 'plain' | 'war' = 'plain';

  function takeDown(): void {
    container.replaceChildren();
    container.hidden = true;
    const back = restoreFocus;
    restoreFocus = null;
    back?.focus({ preventScroll: true });
  }

  function settle(answer: ConfirmAnswer): void {
    if (!gate.isOpen) return;
    // The card comes down *first*, so the callback runs against a page with
    // nothing of ours on it — `controls.ts` drops the selection and re-renders
    // the sheet underneath, and a card still standing over that would be a card
    // asking about a piece that is gone.
    takeDown();
    gate.settle(answer);
  }

  function render(face: ConfirmFace): void {
    container.replaceChildren();

    const card = element('div', face.tone === 'war' ? 'confirm-card is-war' : 'confirm-card');
    card.append(element('h2', 'confirm-title', face.title));
    card.append(element('p', 'confirm-body', face.body));
    if (face.points.length > 0) {
      const list = element('ul', 'confirm-points');
      for (const point of face.points) list.append(element('li', undefined, point));
      card.append(list);
    }

    const foot = element('div', 'confirm-foot');

    // Cancel first in the tree as well as in the tab order: it is the answer
    // this card is defending, and the one focus lands on below.
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-quiet confirm-cancel';
    cancel.type = 'button';
    cancel.textContent = face.cancelLabel;
    cancel.addEventListener('click', () => settle('cancel'));
    foot.append(cancel);

    const confirm = document.createElement('button');
    confirm.className = face.tone === 'war' ? 'btn btn-primary confirm-yes is-war' : 'btn btn-primary confirm-yes';
    confirm.type = 'button';
    if (face.tone === 'war') confirm.append(bladeMark());
    confirm.append(face.confirmLabel);
    confirm.addEventListener('click', () => settle('confirm'));
    foot.append(confirm);

    card.append(foot);
    container.append(card);
    container.hidden = false;
    cancel.focus({ preventScroll: true });
  }

  // Capturing, so the card answers a key before the board's own handlers see it
  // — `controls.ts` binds on the window too, and `main.ts` reports this as a
  // blocking surface so Escape here never also backs something out there.
  function onKeyDown(event: KeyboardEvent): void {
    if (!gate.isOpen) return;
    const answer = confirmAnswer(event.key, tone);
    // A grave card's Enter is the focused button's own press, and nobody
    // else's: the board never sees it, and the default (the harmless answer,
    // where focus starts) is left to happen.
    if (event.key === 'Enter' && tone === 'war') {
      event.stopPropagation();
      return;
    }
    if (answer === null) return;
    event.preventDefault();
    event.stopPropagation();
    settle(answer);
  }
  window.addEventListener('keydown', onKeyDown, true);

  return {
    ask(request: ConfirmRequest, onConfirm: () => void): void {
      const active = document.activeElement as HTMLElement | null;
      // Only remembered for a question raised over a settled page: a second
      // `ask` keeps whatever the first one was going to return focus to.
      if (!gate.isOpen) restoreFocus = active && active !== document.body ? active : null;
      gate.open(onConfirm);
      const face = confirmFace(request);
      tone = face.tone;
      render(face);
    },
    close(): void {
      settle('cancel');
    },
    get isOpen(): boolean {
      return gate.isOpen;
    },
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      settle('cancel');
    },
  };
}
