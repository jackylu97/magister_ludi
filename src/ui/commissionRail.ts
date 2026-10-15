/**
 * The commission chips: one small chip per **seated** commission, in the HUD's
 * left column directly under the empire panel (batch C; the layout the user
 * picked in the commissions mockup, "A on the card, plus chips in the left
 * column"; moved under the panel in batch UX3,
 * `docs/plans/hud-empire-panel-spec.md` §6).
 *
 * What a chip shows
 * -----------------
 * A ring that fills, the card's name, and the count in words ("1 / 2 camps
 * cleared"), on a see-through parchment ground with a solid left edge in the
 * deck's ink so it reads over any terrain. Hovering or focusing it opens the
 * full goal and reward beside it; on a touch screen the first tap opens that
 * and the second opens the sheet. A click opens the government sheet at the
 * card.
 *
 * On the turn after a goal is met (the resolution that met it has just run),
 * the chip reads "Fulfilled · reward paid"; the card has already left its
 * chair, and the turn after that the chip is gone. A commission on the shelf
 * and not in a chair has no chip: its kept progress is on its card face.
 *
 * With no commission seated and none just fulfilled, the rail is hidden and
 * the board is clear.
 *
 * Layout
 * ------
 * The rail is `position: fixed` 10px under the empire panel and as wide as it.
 * The empire drawer opens to the right of the panel, so it never covers a chip
 * and no chip moves when it opens.
 *
 * At most four chips show (`chipCap`); a fifth or more turns into a "+N more"
 * line that opens Statecraft. On a window under 720px tall the cap is three,
 * so four chips cannot reach down to the hover card at the bottom-left (spec
 * §10). The cap is read from the window's height on each render rather than
 * from a resize listener: `render` runs on pointer movement anyway, so a resize
 * is picked up the next time the pointer moves.
 *
 * Listeners
 * ---------
 * Only on the chips themselves, which go away with the chips. `dispose` empties
 * the rail, and `main.ts` registers it in `gameDisposers`.
 *
 * Kept fresh by the revision, the seat and the cap, since `render` is called on
 * pointer movement.
 */

import type { Game } from '../sim/game';
import type { GameState } from '../sim/state';
import { describeCard, stripRefs } from '../sim/statecraft';
import { type OrderId, orderDef } from '../sim/statecraftData';
import { seatedCommissions } from '../sim/commissions';
import { commissionCounters } from './commissionGoal';
import { deckFaceOf } from './deckBadges';
import { element } from './dom';
import { type GoalCounter, counterFigure, counterShare, goalCounterNode } from './goalCounter';

export interface CommissionRail {
  /** The fixed column. `main.ts` mounts it; nothing else touches it. */
  readonly root: HTMLElement;
  /** Re-reads the seat's seated commissions and redraws when they changed. */
  render(): void;
  /** Empties the rail. */
  dispose(): void;
}

export interface CommissionRailOptions {
  getGame: () => Game;
  localPlayerId: () => number;
  /** Opens the government sheet at this card. */
  openAt: (card: OrderId) => void;
  /** Opens Statecraft: the "+N more" line's door. */
  openAll: () => void;
}

/** The most chips the column shows (spec §6). */
export const CHIP_CAP = 4;

/** The cap on a short window, so the column stays clear of the hover card. */
export const SHORT_WINDOW_CHIP_CAP = 3;

/** A window shorter than this is short (spec §10: "At 720 px tall, keep the cap at three"). */
export const SHORT_WINDOW_PX = 720;

/** How many chips a window this tall shows. */
export function chipCap(windowHeight: number): number {
  return windowHeight < SHORT_WINDOW_PX ? SHORT_WINDOW_CHIP_CAP : CHIP_CAP;
}

/**
 * The chips that show and how many are folded into "+N more". With exactly the
 * cap there is no "+N more" line: a line saying "+0 more" would be noise, and a
 * line standing in for one chip would take the chip's own place.
 */
export function capChips<T>(chips: readonly T[], cap: number): { shown: T[]; more: number } {
  if (chips.length <= cap) return { shown: [...chips], more: 0 };
  return { shown: chips.slice(0, cap), more: chips.length - cap };
}

/** The line after the cap: "+2 more". */
export function moreWords(more: number): string {
  return `+${more} more`;
}

/** The chip's second line once its goal is met. */
export const FULFILLED_WORDS = 'Fulfilled · reward paid';

/** One chip's worth of reading: plain data, so the fingerprint is a string compare. */
export interface CommissionChip {
  card: OrderId;
  name: string;
  /** The deck face key, for `data-line`. */
  line: string;
  counters: GoalCounter[];
  fulfilled: boolean;
}

/**
 * The chips this seat should see now: every seated commission in chair order,
 * then every commission fulfilled in the resolution that has just run.
 */
export function commissionChips(state: GameState, playerId: number): CommissionChip[] {
  const sc = state.players[playerId]?.statecraft;
  if (!sc) return [];
  const chips: CommissionChip[] = [];
  for (const card of seatedCommissions(sc)) {
    chips.push(chipFor(state, playerId, card, false));
  }
  for (const row of sc.commissionsFulfilled ?? []) {
    if (row.turn !== state.turn - 1) continue;
    chips.push(chipFor(state, playerId, row.card, true));
  }
  return chips;
}

function chipFor(state: GameState, playerId: number, card: OrderId, fulfilled: boolean): CommissionChip {
  const def = orderDef(card);
  return {
    card,
    name: chipName(def.name),
    line: deckFaceOf(def),
    counters: commissionCounters(state, playerId, card),
    fulfilled,
  };
}

/** The card's name without a leading "Commission:", which the chip already is. */
export function chipName(name: string): string {
  return name.replace(/^Commission:\s*/, '');
}

/** The count line under the name: the first part still to do, or the met one. */
export function chipCountWords(chip: CommissionChip): string {
  if (chip.fulfilled) return FULFILLED_WORDS;
  const open = chip.counters.find((counter) => counter.have < counter.need) ?? chip.counters[0];
  if (!open) return '';
  return `${counterFigure(open)} ${open.label}`;
}

/** How full the ring is, from 0 to 100: the mean of the parts. */
export function chipRing(chip: CommissionChip): number {
  if (chip.fulfilled || chip.counters.length === 0) return 100;
  const total = chip.counters.reduce((sum, counter) => sum + counterShare(counter), 0);
  return Math.round((total / chip.counters.length) * 100);
}

/** The chips as one string, for the redraw check and for tests. */
export function chipsFingerprint(chips: readonly CommissionChip[], playerId: number): string {
  return `${playerId}|${chips
    .map((chip) => `${chip.card}:${chip.fulfilled ? 'done' : chip.counters.map(counterFigure).join(',')}`)
    .join(';')}`;
}

export function createCommissionRail(options: CommissionRailOptions): CommissionRail {
  const { getGame, localPlayerId, openAt, openAll } = options;

  const root = element('div', 'commission-rail');
  root.id = 'hud-commissions';
  root.setAttribute('aria-label', 'Your seated commissions');
  root.hidden = true;
  const list = element('ul', 'commission-list');
  root.append(list);

  let drawnState: GameState | null = null;
  let drawnRevision = -1;
  let drawnSeat = -1;
  let drawnTurn = -1;
  let drawnCap = -1;
  let drawnChips = '';

  function chipNode(chip: CommissionChip, index: number): HTMLElement {
    const item = element('li', 'commission-item');
    const button = element('button', chip.fulfilled ? 'commission-chip is-done' : 'commission-chip');
    button.type = 'button';
    button.dataset.line = chip.line;
    button.dataset.card = chip.card;
    const popId = `commission-pop-${index}`;
    button.setAttribute('aria-describedby', popId);
    const ring = element('span', 'commission-ring');
    ring.style.setProperty('--p', String(chipRing(chip)));
    ring.setAttribute('aria-hidden', 'true');
    const text = element('span', 'commission-text');
    text.append(element('span', 'commission-name', chip.name));
    text.append(element('span', 'commission-count', chipCountWords(chip)));
    button.append(ring, text);

    // The full goal and reward, in the card's own words and with the same
    // counters the card face prints.
    const pop = element('div', 'commission-pop');
    pop.id = popId;
    pop.setAttribute('role', 'tooltip');
    pop.dataset.line = chip.line;
    pop.append(element('p', 'commission-pop-name', orderDef(chip.card).name));
    for (const clause of describeCard(chip.card)) {
      pop.append(element('p', 'commission-pop-clause', stripRefs(clause.text)));
    }
    if (chip.fulfilled) pop.append(element('p', 'goal-note', FULFILLED_WORDS));
    else pop.append(goalCounterNode(chip.counters));

    // A touch has no hover: the first tap shows the goal, the second opens
    // the sheet. A mouse or a key goes straight to the sheet.
    let touched = false;
    button.addEventListener('pointerdown', (event) => {
      touched = event.pointerType === 'touch';
    });
    button.addEventListener('click', () => {
      if (touched && !item.classList.contains('is-open')) {
        item.classList.add('is-open');
        return;
      }
      item.classList.remove('is-open');
      openAt(chip.card);
    });
    button.addEventListener('blur', () => item.classList.remove('is-open'));
    item.append(button, pop);
    return item;
  }

  /** The "+N more" line: one button that opens Statecraft. */
  function moreNode(more: number): HTMLElement {
    const item = element('li', 'commission-item is-more');
    const button = element('button', 'commission-more', moreWords(more));
    button.type = 'button';
    button.setAttribute(
      'aria-label',
      `${more} more ${more === 1 ? 'commission' : 'commissions'}; opens Statecraft`,
    );
    button.addEventListener('click', () => openAll());
    item.append(button);
    return item;
  }

  function render(): void {
    const { state } = getGame();
    const seat = localPlayerId();
    const cap = chipCap(window.innerHeight);
    if (
      state === drawnState &&
      state.revision === drawnRevision &&
      seat === drawnSeat &&
      state.turn === drawnTurn &&
      cap === drawnCap
    ) {
      return;
    }
    drawnState = state;
    drawnRevision = state.revision;
    drawnSeat = seat;
    drawnTurn = state.turn;
    drawnCap = cap;

    const chips = commissionChips(state, seat);
    const printed = `${chipsFingerprint(chips, seat)}|${cap}`;
    if (printed === drawnChips) return;
    drawnChips = printed;
    root.hidden = chips.length === 0;
    const { shown, more } = capChips(chips, cap);
    const nodes = shown.map((chip, index) => chipNode(chip, index));
    if (more > 0) nodes.push(moreNode(more));
    list.replaceChildren(...nodes);
  }

  function dispose(): void {
    list.replaceChildren();
    root.hidden = true;
    drawnChips = '';
    drawnState = null;
    drawnCap = -1;
  }

  return { root, render, dispose };
}
