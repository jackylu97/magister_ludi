/**
 * End Turn's waiting list (batch UX4; the spec is
 * `docs/plans/hud-empire-panel-spec.md` §7 and `docs/plans/hud-ux-decisions.md`,
 * "End Turn").
 *
 * End Turn's label names the first thing this seat still owes the turn. Since
 * this batch the button carries the rest as well:
 *
 * - a vermilion badge at its top-left counts how many more items there are
 *   ("+2");
 * - resting the pointer on the button, or focusing it, lists every item, and
 *   each item is a button that takes the player to where it is answered.
 *
 * Where the list comes from
 * -------------------------
 * The items are `allBlockers` (`turnBlockers.ts`), which walks the same clauses
 * in the same order as `firstBlocker`, so the label and the list's first row
 * cannot disagree. After them comes the Statecraft pause (`statecraftPause` in
 * `controls.ts`): a banked charter or an Order outside its slot, which a press
 * mentions once but does not stop on. Units, carts and towns waiting on the same
 * thing share one row with a count ("3 units need orders"), and that row takes
 * the player to the first of them, as a press of End Turn would.
 *
 * The label words live here too (`END_TURN_LABELS`, `PAUSE_LABELS`), so the
 * button and its list read from one table.
 *
 * What is pure and what is not
 * ----------------------------
 * The rows and their words (`waitingRows`, `moreBadge`) are pure, so the suite,
 * which has no DOM, can test them. `createEndTurnList` fills the static markup
 * in `index.html` and shows and hides the list. It binds its listeners with one
 * `AbortController`, and `dispose` (in `gameDisposers`) removes them.
 *
 * The list is a hover card, not a card in the screen registry: it opens on
 * hover or focus and closes when both have left, like a commission chip's
 * detail card. It differs from the info cards in one way, which is why it has
 * its own module: its rows are buttons, so the pointer has to be able to move
 * from End Turn into the list without it closing.
 */

import { type GameState, cityById, unitById } from '../sim/state';
import { unitDef } from '../sim/unitData';
import { cityDisplayName } from './cityDisplay';
import type { StatecraftPause } from './controls';
import { element } from './dom';
import type { TurnBlocker } from './turnBlockers';

// --- the words -----------------------------------------------------------------

/**
 * What the End Turn button says when it may not end the turn yet: the job
 * rather than the outcome ("Choose production" is an instruction; "End Turn" is
 * a result). One label per kind of blocker.
 */
export const END_TURN_LABELS: Readonly<Record<TurnBlocker['kind'], string>> = {
  idleUnit: 'Unit needs orders',
  // The R4 ruling's own words for the prompt that replaced "Unit needs orders"
  // on a caravan: a cart is never told where to stand, it is sent.
  idleTrader: 'Send an idle trader',
  cityProduction: 'Choose production',
  research: 'Choose research',
  discovery: 'A discovery awaits',
  statecraft: 'A card awaits',
  religion: 'A god awaits',
  greatPerson: 'A great person awaits',
  wager: 'A wager awaits',
  // The one label that names a *reading* rather than a decision: nothing is
  // owed here but a look, and the verb says so.
  census: 'Read the census',
};

/**
 * What the button says for the soft pause (the user, 2026-08-30): the guide
 * line was too easy to miss, and a button that says what is waiting is the
 * reminder. "A government awaits" was "A government awaits your oath" until
 * batch UX4 gave End Turn a steady width, which the longer words overran.
 */
export const PAUSE_LABELS: Readonly<Record<StatecraftPause, string>> = {
  order: 'You have a new Order',
  government: 'A government awaits',
};

/** One thing on the list: a blocker, or the Statecraft pause. */
export type WaitingItem =
  | { kind: 'blocker'; blocker: TurnBlocker }
  | { kind: 'pause'; pause: StatecraftPause };

/** One row of the list: what it says, and the item its button goes to. */
export interface WaitingRow {
  /** The first item of the row, which is where its button takes the player. */
  item: WaitingItem;
  /** How many items the row stands for: several idle units share one row. */
  count: number;
  words: string;
}

/** The kinds that can stand several to a row: the ones with one item per piece or town. */
const GROUPED: ReadonlySet<TurnBlocker['kind']> = new Set(['idleUnit', 'idleTrader', 'cityProduction']);

/** A row's words for one blocker, or for a run of blockers of one kind. */
function blockerWords(state: GameState, blocker: TurnBlocker, count: number): string {
  switch (blocker.kind) {
    case 'idleUnit': {
      if (count > 1) return `${count} units need orders`;
      const unit = unitById(state, blocker.unitId);
      return unit === undefined ? END_TURN_LABELS.idleUnit : `${unitDef(unit.type).name} needs orders`;
    }
    case 'idleTrader':
      return count > 1 ? `Send ${count} idle traders` : END_TURN_LABELS.idleTrader;
    case 'cityProduction': {
      if (count > 1) return `${count} towns need production`;
      const city = cityById(state, blocker.cityId);
      return city === undefined
        ? END_TURN_LABELS.cityProduction
        : `Choose production in ${cityDisplayName(state, city)}`;
    }
    case 'statecraft':
      return blocker.what === 'doctrine' ? 'A Doctrine awaits' : END_TURN_LABELS.statecraft;
    default:
      return END_TURN_LABELS[blocker.kind];
  }
}

/**
 * The list's rows: the blockers in End Turn's order, a run of idle units (or
 * carts, or towns) folded into one row with a count, then the Statecraft pause.
 * Empty when nothing is waiting.
 */
export function waitingRows(
  state: GameState,
  blockers: readonly TurnBlocker[],
  pause: StatecraftPause | null,
): WaitingRow[] {
  const rows: WaitingRow[] = [];
  for (let at = 0; at < blockers.length; ) {
    const first = blockers[at]!;
    let count = 1;
    if (GROUPED.has(first.kind)) {
      while (at + count < blockers.length && blockers[at + count]!.kind === first.kind) count += 1;
    }
    rows.push({ item: { kind: 'blocker', blocker: first }, count, words: blockerWords(state, first, count) });
    at += count;
  }
  if (pause !== null) rows.push({ item: { kind: 'pause', pause }, count: 1, words: PAUSE_LABELS[pause] });
  return rows;
}

/**
 * The badge: how many rows there are after the one the label names, as "+2",
 * or `null` when the label is the whole story.
 */
export function moreBadge(rows: readonly WaitingRow[]): string | null {
  return rows.length > 1 ? `+${rows.length - 1}` : null;
}

/** The list's heading. */
export const LIST_HEADING = 'Still to do this turn';

/** The line at the foot of the list: how to end the turn anyway. */
export const LIST_FOOT = 'Shift-click End Turn to end the turn anyway';

/** The rows as one string, so the list is rebuilt only when it changes. */
export function rowsFingerprint(rows: readonly WaitingRow[]): string {
  return rows.map((row) => `${row.words}|${row.count}`).join(';');
}

// --- the surface -----------------------------------------------------------------

/** How long the pointer rests on End Turn before the list opens. */
export const LIST_DELAY_MS = 150;

/** How long after the pointer leaves the button and the list it closes. */
export const LIST_LEAVE_MS = 300;

export interface EndTurnListOptions {
  /** End Turn itself. */
  button: HTMLButtonElement;
  /** The badge inside it. */
  badge: HTMLElement;
  /** The list, `#end-turn-list`. Hidden with `hidden` while closed. */
  list: HTMLElement;
  /** A row was pressed: take the player to its item. */
  onPick: (item: WaitingItem) => void;
}

export interface EndTurnList {
  /** Writes the badge and the rows. An empty list hides both. */
  render(rows: readonly WaitingRow[]): void;
  /** Closes the list. Safe when it is already closed. */
  hide(): void;
  /** Removes every listener and timer. Registered in `gameDisposers`. */
  dispose(): void;
}

export function createEndTurnList(options: EndTurnListOptions): EndTurnList {
  const { button, badge, list, onPick } = options;

  const heading = element('p', 'eyebrow end-turn-list-head', LIST_HEADING);
  const rowsEl = element('ul', 'end-turn-list-rows');
  const foot = element('p', 'hint end-turn-list-foot', LIST_FOOT);
  list.replaceChildren(heading, rowsEl, foot);
  list.hidden = true;
  badge.hidden = true;

  let shown: readonly WaitingRow[] = [];
  let drawn = '';
  let overButton = false;
  let overList = false;
  let openTimer: number | null = null;
  let leaveTimer: number | null = null;
  /** True while Escape hands the keyboard back, so the focus does not reopen the list. */
  let returning = false;

  const listening = new AbortController();
  const { signal } = listening;

  function clearTimers(): void {
    if (openTimer !== null) window.clearTimeout(openTimer);
    if (leaveTimer !== null) window.clearTimeout(leaveTimer);
    openTimer = null;
    leaveTimer = null;
  }

  function keyboardInside(): boolean {
    const active = document.activeElement;
    return active !== null && (button.contains(active) || list.contains(active));
  }

  function show(): void {
    // Nothing to list, or the button is working while the others move: the
    // rows would describe a turn that has already been pressed.
    if (shown.length === 0 || button.disabled) return;
    list.hidden = false;
  }

  function hide(): void {
    clearTimers();
    list.hidden = true;
  }

  function rowNode(row: WaitingRow, index: number): HTMLElement {
    const item = element('li', 'end-turn-list-item');
    const go = element('button', 'end-turn-list-row');
    go.type = 'button';
    go.dataset.index = String(index);
    go.append(element('span', 'end-turn-list-hand', '☞'), element('span', 'end-turn-list-words', row.words));
    item.append(go);
    return item;
  }

  // --- the pointer -------------------------------------------------------------

  function entered(onButton: boolean, event: PointerEvent): void {
    if (onButton) overButton = true;
    else overList = true;
    if (leaveTimer !== null) window.clearTimeout(leaveTimer);
    leaveTimer = null;
    // A finger has no hover: a tap on End Turn is a press.
    if (!onButton || !list.hidden || event.pointerType === 'touch') return;
    if (openTimer !== null) window.clearTimeout(openTimer);
    openTimer = window.setTimeout(() => {
      openTimer = null;
      if (overButton) show();
    }, LIST_DELAY_MS);
  }

  function left(onButton: boolean): void {
    if (onButton) overButton = false;
    else overList = false;
    if (overButton || overList) return;
    if (openTimer !== null) window.clearTimeout(openTimer);
    openTimer = null;
    if (list.hidden) return;
    leaveTimer = window.setTimeout(() => {
      leaveTimer = null;
      if (overButton || overList || keyboardInside()) return;
      hide();
    }, LIST_LEAVE_MS);
  }

  button.addEventListener('pointerenter', (event) => entered(true, event), { signal });
  button.addEventListener('pointerleave', () => left(true), { signal });
  list.addEventListener('pointerenter', (event) => entered(false, event), { signal });
  list.addEventListener('pointerleave', () => left(false), { signal });

  // A press on End Turn ends the turn or goes to the first item, and the list
  // has said its piece: it closes rather than standing over what comes next.
  button.addEventListener('pointerdown', () => hide(), { signal });

  // --- the keyboard ------------------------------------------------------------

  // Keyboard focus shows it at once, so the next Tab walks into the rows. Only
  // keyboard focus: a mouse press focuses the button too, and the list opening
  // under a press that is ending the turn would be in the way.
  button.addEventListener(
    'focus',
    () => {
      if (!returning && button.matches(':focus-visible')) show();
    },
    { signal },
  );
  const keyboardLeft = (event: FocusEvent): void => {
    const to = event.relatedTarget as Node | null;
    if (to !== null && (button.contains(to) || list.contains(to))) return;
    if (!overButton && !overList) hide();
  };
  button.addEventListener('focusout', keyboardLeft, { signal });
  list.addEventListener('focusout', keyboardLeft, { signal });

  // Escape inside the list closes it and puts the keyboard back on End Turn,
  // and goes no further: the board's own Escape would drop the selection.
  list.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      hide();
      returning = true;
      button.focus({ preventScroll: true });
      returning = false;
    },
    { signal },
  );

  // One listener for the rows, because they are rebuilt whenever the list
  // changes.
  rowsEl.addEventListener(
    'click',
    (event) => {
      const go = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-index]');
      const row = go === null || go === undefined ? undefined : shown[Number(go.dataset.index)];
      if (row === undefined) return;
      hide();
      onPick(row.item);
    },
    { signal },
  );

  function render(rows: readonly WaitingRow[]): void {
    shown = rows;
    const more = moreBadge(rows);
    badge.hidden = more === null;
    badge.textContent = more ?? '';
    const printed = rowsFingerprint(rows);
    if (printed !== drawn) {
      drawn = printed;
      rowsEl.replaceChildren(...rows.map(rowNode));
    }
    if (rows.length === 0 || button.disabled) hide();
  }

  return {
    render,
    hide,
    dispose(): void {
      listening.abort();
      hide();
      shown = [];
      drawn = '';
    },
  };
}
