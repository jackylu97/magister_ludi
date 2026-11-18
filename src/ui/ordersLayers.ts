/**
 * **The orders screen's two layers** (batch SS10, part 2B): the whole hand,
 * opened with H, and the binder, opened with D.
 *
 * The final board
 * (`docs/plans/mockups/scholars-study/orders-screen-final-board.html`, "The
 * hand"):
 *
 *   - **H opens the whole hand** over the table: the hand cards in ranks of
 *     up to fifteen, 85 px apart, every name in view, sorted by type. A card
 *     rises on hover or focus and its full face opens beside it. A click picks
 *     the card up and closes the view, so the chairs can be seen.
 *   - **D opens the binder**: every Order the seat holds as a full face, six to
 *     a row, with filters by chair type, by deck, by rarity and for the seated
 *     ones, and a box to find a card by its name. A seated card carries its
 *     chair's number. It scrolls.
 *
 * Both are layers inside the sheet's cloth. Esc closes the layer first, then
 * the sheet (`statecraftScreen.ts` owns the keys). These builders draw; the
 * screen decides what a click does.
 */

import { type CardType, CHAIR_TYPES, type DeckId, type OrderId, type OrderRarity, orderDef, orderType } from '../sim/statecraftData';
import { describeCard, stripRefs } from '../sim/statecraft';
import { GENERIC_WORD, RARITY_WORD, TYPE_WORD, deckWord } from './deckBadges';
import { element } from './dom';
import { type OrderFaceState, dressOrderFace } from './orderFace';
import type { CardLive } from './orderLive';

/** The layers' words, in one table. */
export const LAYER_WORDS = {
  handTitle: 'Your hand',
  handNote: (count: number) => `${count} Order${count === 1 ? '' : 's'}, sorted by type · click one to pick it up ·`,
  binderTitle: 'Your deck',
  binderNote: (count: number) => `${count} Order${count === 1 ? '' : 's'}, every one a full face · scroll for the rest ·`,
  or: 'or',
  closes: 'closes',
  all: 'All',
  seated: 'Seated',
  find: 'Find an Order',
  inChair: (chair: number) => `in chair ${chair}`,
  played: (chair: number) => `played in chair ${chair}`,
  opened: (tech: string) => `opened ${tech}`,
  none: 'No Order matches.',
} as const;

/** A key's mark, as the board draws one: a small boxed letter in mono. */
export function keyMark(key: string): HTMLElement {
  const mark = element('kbd', 'orders-key', key);
  return mark;
}

/** The layer's head: a title in the period face, and a note ending in the keys that close it. */
function layerHead(title: string, note: string, key: string): HTMLElement {
  const head = element('div', 'orders-veil-head');
  head.append(element('h3', 'orders-veil-title', title));
  const words = element('span', 'orders-veil-note', note);
  words.append(' ', keyMark(key), ` ${LAYER_WORDS.or} `, keyMark('Esc'), ` ${LAYER_WORDS.closes}`);
  head.append(words);
  return head;
}

/** A hand-form face of a card, inside a button that the caller wires. */
export function handCardButton(id: OrderId, className: string): HTMLButtonElement {
  const button = element('button', className) as HTMLButtonElement;
  button.type = 'button';
  button.dataset.card = id;
  const face = element('div');
  dressOrderFace(face, id, { where: 'hand', inControl: true });
  face.dataset.form = 'hand';
  button.append(face);
  button.setAttribute('aria-label', orderDef(id).name);
  button.title = orderDef(id).name;
  return button;
}

// --- H: the whole hand ----------------------------------------------------

/** The most cards in one rank, as the board draws them. */
const RANK_SIZE = 15;

/** The step between two cards in a rank, in pixels: the board's 85. */
const RANK_STEP = 85;

/**
 * **The whole hand**, over the table. `onPick` is called with the card a click
 * or Enter chose; the screen picks it up and closes the view.
 */
export function handViewNode(
  hand: readonly OrderId[],
  held: OrderId | null,
  onPick: (id: OrderId, event: MouseEvent) => void,
): HTMLElement {
  const veil = element('section', 'orders-veil orders-handview');
  veil.setAttribute('aria-label', LAYER_WORDS.handTitle);
  veil.append(layerHead(LAYER_WORDS.handTitle, LAYER_WORDS.handNote(hand.length), 'H'));
  const ranks = Math.max(1, Math.ceil(hand.length / RANK_SIZE));
  const perRank = Math.ceil(hand.length / ranks);
  const rows = element('div', 'orders-ranks');
  for (let rank = 0; rank < ranks; rank += 1) {
    const row = element('div', 'orders-rank');
    for (const id of hand.slice(rank * perRank, (rank + 1) * perRank)) {
      const button = handCardButton(id, 'orders-handcard orders-rankcard');
      button.dataset.nav = `view:${id}`;
      button.dataset.preview = 'hand';
      if (held === id) button.classList.add('is-held');
      button.addEventListener('click', (event) => onPick(id, event));
      row.append(button);
    }
    rows.append(row);
  }
  veil.append(rows);
  return veil;
}

/** Lays each rank's cards out at the board's step, closer when a rank is wider than the cloth. */
export function layHandView(view: HTMLElement): void {
  for (const row of view.querySelectorAll<HTMLElement>('.orders-rank')) {
    const cards = [...row.querySelectorAll<HTMLElement>('.orders-rankcard')];
    if (cards.length === 0) continue;
    const width = row.clientWidth;
    const cardWidth = cards[0]!.offsetWidth || 104;
    const step = cards.length > 1 ? Math.min(RANK_STEP, (width - cardWidth) / (cards.length - 1)) : 0;
    cards.forEach((card, index) => {
      card.style.left = `${Math.round(index * step)}px`;
      card.style.zIndex = String(index + 1);
    });
  }
}

// --- D: the binder ----------------------------------------------------------

/** One Order in the binder, with what the screen knows of it now. */
export interface BinderEntry {
  id: OrderId;
  /** Its chair, counted from 1, or null when it is in the hand. */
  chair: number | null;
  /** Played this visit and not confirmed. */
  staged: boolean;
  /** Its live reading when it sits in a chair and is confirmed. */
  live: CardLive | null;
  /** The technology a charter opened, in words, or null. */
  opened: string | null;
}

/** The binder's filters. The caller keeps the object, so a redraw keeps them. */
export interface BinderFilter {
  type: CardType | null;
  deck: DeckId | 'generic' | null;
  rarity: OrderRarity | null;
  seated: boolean;
  find: string;
}

/** A fresh filter: every Order. */
export function allOrders(): BinderFilter {
  return { type: null, deck: null, rarity: null, seated: false, find: '' };
}

/** Does this entry pass the filter? Pure, for the tests. */
export function binderAdmits(entry: BinderEntry, filter: BinderFilter): boolean {
  const def = orderDef(entry.id);
  if (filter.type !== null && orderType(entry.id) !== filter.type) return false;
  if (filter.deck === 'generic' && def.decks.length > 0) return false;
  if (filter.deck !== null && filter.deck !== 'generic' && !def.decks.includes(filter.deck)) return false;
  if (filter.rarity !== null && def.rarity !== filter.rarity) return false;
  if (filter.seated && entry.chair === null) return false;
  const find = filter.find.trim().toLowerCase();
  if (find !== '') {
    const words = `${def.name} ${describeCard(entry.id).map((clause) => stripRefs(clause.text)).join(' ')}`.toLowerCase();
    if (!words.includes(find)) return false;
  }
  return true;
}

/**
 * The face state of a binder entry. A seated card wears its pay plate, as it
 * does in its chair (the Council screen, stage 1); a card in the hand wears
 * no figure, as it does in the fan. A charter keeps the line that says which
 * technology it opened, because that is not a figure.
 */
function entryState(entry: BinderEntry): OrderFaceState {
  if (entry.staged) return { where: 'played', inControl: true, staged: true, plate: null };
  if (entry.live !== null) {
    return {
      where: 'played',
      inControl: true,
      liveLine: entry.live.line,
      unmet: entry.live.unmet,
      plate: entry.live.plate,
    };
  }
  if (entry.opened !== null) {
    return { where: 'played', inControl: true, tablet: null, liveLine: { kind: 'standing', text: LAYER_WORDS.opened(entry.opened) } };
  }
  return { where: 'hand', inControl: true, plate: null };
}

/** A filter chip: its words, an optional count, and whether it is on. */
function chip(words: string, count: number | null, on: boolean, click: () => void, ink?: string): HTMLButtonElement {
  const button = element('button', on ? 'orders-chip is-on' : 'orders-chip') as HTMLButtonElement;
  button.type = 'button';
  button.setAttribute('aria-pressed', String(on));
  if (ink !== undefined) {
    const swatch = element('i', 'orders-chip-swatch');
    swatch.dataset.ink = ink;
    button.append(swatch);
  }
  button.append(element('span', undefined, words));
  if (count !== null) button.append(element('em', undefined, String(count)));
  button.addEventListener('click', click);
  return button;
}

/**
 * **The binder**: every Order the seat holds as a full face. The chips and the
 * box change `filter` in place and redraw the grid; nothing else is redrawn,
 * so the box keeps the keyboard. `onPick` is called with the card a click
 * chose. `afterGrid` is called each time the grid is drawn, so the caller can
 * fit the faces on the page.
 */
export function binderNode(
  entries: readonly BinderEntry[],
  decks: readonly DeckId[],
  filter: BinderFilter,
  onPick: (entry: BinderEntry, event: MouseEvent) => void,
  afterGrid: (grid: HTMLElement) => void,
): HTMLElement {
  const veil = element('section', 'orders-veil orders-binder');
  veil.setAttribute('aria-label', LAYER_WORDS.binderTitle);
  const head = layerHead(LAYER_WORDS.binderTitle, LAYER_WORDS.binderNote(entries.length), 'D');
  veil.append(head);
  const chips = element('div', 'orders-chips');
  const grid = element('div', 'orders-binder-grid');
  const find = element('input', 'orders-find') as HTMLInputElement;
  find.type = 'search';
  find.placeholder = LAYER_WORDS.find;
  find.setAttribute('aria-label', LAYER_WORDS.find);
  find.value = filter.find;
  find.addEventListener('input', () => {
    filter.find = find.value;
    drawGrid();
  });
  // The search box sits at the right of the head, as the board draws it.
  head.append(find);

  function drawChips(): void {
    chips.replaceChildren();
    const set = (change: () => void) => () => {
      change();
      drawChips();
      drawGrid();
    };
    chips.append(
      chip(LAYER_WORDS.all, entries.length, filter.type === null && filter.deck === null && filter.rarity === null && !filter.seated, set(() => {
        filter.type = null;
        filter.deck = null;
        filter.rarity = null;
        filter.seated = false;
      })),
    );
    for (const type of CHAIR_TYPES) {
      const count = entries.filter((entry) => orderType(entry.id) === type).length;
      if (count === 0) continue;
      chips.append(chip(TYPE_WORD[type], count, filter.type === type, set(() => {
        filter.type = filter.type === type ? null : type;
      }), type));
    }
    chips.append(element('span', 'orders-chip-rule'));
    const deckChoices: (DeckId | 'generic')[] = [...decks];
    if (entries.some((entry) => orderDef(entry.id).decks.length === 0)) deckChoices.push('generic');
    for (const deck of deckChoices) {
      const words = deck === 'generic' ? GENERIC_WORD : deckWord(deck);
      chips.append(chip(words, null, filter.deck === deck, set(() => {
        filter.deck = filter.deck === deck ? null : deck;
      })));
    }
    chips.append(element('span', 'orders-chip-rule'));
    for (const rarity of ['common', 'uncommon', 'rare'] as const) {
      const count = entries.filter((entry) => orderDef(entry.id).rarity === rarity).length;
      if (count === 0) continue;
      chips.append(chip(RARITY_WORD[rarity], count, filter.rarity === rarity, set(() => {
        filter.rarity = filter.rarity === rarity ? null : rarity;
      })));
    }
    chips.append(element('span', 'orders-chip-rule'));
    const seated = entries.filter((entry) => entry.chair !== null).length;
    chips.append(chip(LAYER_WORDS.seated, seated, filter.seated, set(() => {
      filter.seated = !filter.seated;
    })));
  }

  function drawGrid(): void {
    grid.replaceChildren();
    const shown = entries.filter((entry) => binderAdmits(entry, filter));
    if (shown.length === 0) grid.append(element('p', 'orders-binder-none', LAYER_WORDS.none));
    for (const entry of shown) {
      const button = element('button', 'orders-bindercard') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.nav = `binder:${entry.id}`;
      button.dataset.card = entry.id;
      const face = element('div');
      dressOrderFace(face, entry.id, entryState(entry));
      button.append(face);
      if (entry.chair !== null) {
        button.append(element('span', 'orders-binder-chair', entry.staged ? LAYER_WORDS.played(entry.chair) : LAYER_WORDS.inChair(entry.chair)));
      }
      button.setAttribute('aria-label', orderDef(entry.id).name);
      button.addEventListener('click', (event) => onPick(entry, event));
      grid.append(button);
    }
    afterGrid(grid);
  }

  drawChips();
  veil.append(chips, grid);
  drawGrid();
  return veil;
}
