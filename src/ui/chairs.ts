/**
 * **A chair's type, on every surface that shows one** (batch C2b of
 * `docs/plans/chairs-build.md`).
 *
 * Since batch C2a a government lays out a mix of Military, Economic, Civic and
 * Wildcard chairs (`slotLayout`), and a card fits a chair of its own type or a
 * Wildcard chair, an unsorted card fits any chair, and a Wildcard card fits only
 * a Wildcard chair (`orderFitsSlot`). This module is the screens' half of that:
 *
 *   · **the chair as the A3 board draws it**: a plate under the chair with the
 *     type's swatch and word, and an empty chair outlined in its type's ink with
 *     the type's mark faint inside it (`chairNode`, `emptyChairNode`). The
 *     Statecraft screen's council and the flair gallery build their chairs here,
 *     so the two cannot draw a chair two ways;
 *   · **a government's chairs in words**, for the government card and the
 *     council's heading: "2 Military · 1 Economic · 1 Civic · 1 Wildcard"
 *     (`chairMixOf`, `chairMixWords`);
 *   · **what an adoption did to a council**, worked out on the screen from the
 *     council before and after (`councilChange`, `adoptionWords`), because the
 *     reducer's result does not carry it.
 *
 * Nothing here decides whether a card fits a chair. The council asks
 * `placeError` (`statecraftStaging.ts`), which is the reducer's own
 * `slotOrderError`, and prints the sentence it answers with.
 */

import type { SlottedOrder } from '../sim/statecraft';
import {
  type ChairType,
  type GovernmentId,
  type OrderId,
  CHAIR_TYPES,
  orderDef,
  slotSpread,
} from '../sim/statecraftData';
import { slotMarkUrl } from './cardLine';
import { TYPE_WORD } from './deckBadges';
import { element } from './dom';

// --- words ----------------------------------------------------------------

/** A chair type in words, as the plates print it: "Military". */
export function chairWord(type: ChairType): string {
  return TYPE_WORD[type];
}

/** How many chairs of one type a council has. */
export interface ChairMixEntry {
  readonly type: ChairType;
  readonly count: number;
}

/**
 * **A government's chairs by type**, Military first and Wildcard last, leaving
 * out a type it opens none of. Read off the row's mix (`slotSpread`), so the
 * government card says what adopting it would lay out.
 */
export function chairMixOf(id: GovernmentId): ChairMixEntry[] {
  const spread = slotSpread(id);
  return CHAIR_TYPES.filter((type) => spread[type] > 0).map((type) => ({ type, count: spread[type] }));
}

/**
 * **A council's chairs by type**, from its laid-out chairs (`slotTypesOf`). It
 * differs from the government's mix only by the Wildcard chairs a leader or a
 * card adds.
 */
export function chairMixOfLayout(layout: readonly ChairType[]): ChairMixEntry[] {
  return CHAIR_TYPES.map((type) => ({ type, count: layout.filter((one) => one === type).length })).filter(
    (entry) => entry.count > 0,
  );
}

/** "2 Military · 1 Economic · 1 Civic · 1 Wildcard". */
export function chairMixWords(mix: readonly ChairMixEntry[]): string {
  return mix.map((entry) => `${entry.count} ${chairWord(entry.type)}`).join(' · ');
}

/**
 * A government's chairs as the offer card takes them: plain strings and
 * numbers, because `offerCard.ts` knows nothing about cards. The ink is the
 * chair type's key, which `style.css` resolves (`data-ink`).
 */
export function offerChairsOf(id: GovernmentId): { ink: string; count: number; word: string }[] {
  return chairMixOf(id).map((entry) => ({ ink: entry.type, count: entry.count, word: chairWord(entry.type) }));
}

// --- the chair, drawn -------------------------------------------------------

/**
 * **The plate under a chair**: the type's swatch and its word, as on the A3
 * board's council. The swatch takes the chair's ink from the chair around it
 * (`--chair-ink`, set by its `sc-slot-<type>` class), and the Wildcard plate is
 * purple, as the board draws it.
 */
export function chairPlateNode(type: ChairType): HTMLElement {
  const plate = element('span', 'sc-chair-plate');
  const swatch = element('b', 'sc-chair-swatch');
  swatch.setAttribute('aria-hidden', 'true');
  plate.append(swatch, element('span', 'sc-slot-type', chairWord(type)));
  return plate;
}

/**
 * **An empty chair**: the dashed outline in its type's ink, the ghost of a card
 * with the type's mark inside it, and one word under the ghost. An empty chair
 * keeps its ink (the board's note: *"the empty chair keeps its vermilion"*), so
 * a council reads as a row of typed places before any card is in it.
 */
export function emptyChairNode(type: ChairType, word: string): HTMLElement {
  const card = element('span', 'sc-chair-card sc-chair-empty');
  const ghost = element('span', 'sc-chair-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  const mark = element('span', 'line-mark sc-chair-mark');
  mark.style.setProperty('--line-mark', slotMarkUrl(type));
  ghost.append(mark);
  card.append(ghost, element('span', 'sc-slot-empty', word));
  return card;
}

/** A chair's parts, so the caller can add its states, its seal and its click. */
export interface ChairParts {
  /** The chair itself, a button in its type's ink. */
  readonly button: HTMLButtonElement;
  /** The line under the card: the plate, and the seal where there is one. */
  readonly foot: HTMLElement;
  /** The plate, for the position word where a card could read it. */
  readonly plate: HTMLElement;
}

/**
 * **A chair**, holding `card` (a seated card, an empty chair or a malice's
 * face) over its plate. The class carries the type, and the type carries the
 * ink: `sc-slot-civic` resolves `--chair-ink` to the Civic lapis in
 * `style.css`.
 */
export function chairNode(type: ChairType, card: HTMLElement): ChairParts {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `sc-slot sc-chair sc-slot-${type}`;
  button.dataset.chair = type;
  const foot = element('span', 'sc-chair-foot');
  const plate = chairPlateNode(type);
  foot.append(plate);
  button.append(card, foot);
  return { button, foot, plate };
}

// --- what an adoption did -----------------------------------------------------

/** What an adoption did to a council, card by card, in the old seat order. */
export interface CouncilChange {
  /** Cards in the same chair before and after. */
  readonly stayed: readonly OrderId[];
  /** Cards that kept a chair but not the same one: the chair each left and the one it took. */
  readonly moved: readonly { readonly card: OrderId; readonly from: number; readonly to: number }[];
  /** Cards seated before and in no chair after: back in the collection. */
  readonly returned: readonly OrderId[];
}

/**
 * **Compares a council before and after an adoption.** Computed on the screen
 * because the command's result does not carry it, and computed from the two
 * councils alone, so it says what happened whatever rule the re-seating used.
 */
export function councilChange(
  before: readonly (SlottedOrder | null)[],
  after: readonly (SlottedOrder | null)[],
): CouncilChange {
  const stayed: OrderId[] = [];
  const moved: { card: OrderId; from: number; to: number }[] = [];
  const returned: OrderId[] = [];
  before.forEach((slot, from) => {
    if (slot === null) return;
    const to = after.findIndex((one) => one?.card === slot.card);
    if (to < 0) returned.push(slot.card);
    else if (to === from) stayed.push(slot.card);
    else moved.push({ card: slot.card, from, to });
  });
  return { stayed, moved, returned };
}

/**
 * **The adoption in one notice**: the new government, then what moved and what
 * went back to the collection. Chairs are numbered from one, as the reducer's
 * own sentences number them, and each move names the type of the chair taken.
 *
 *   "New government: Council of Elders. Moved: The Tagmata to chair 5
 *   (Wildcard). Back in your collection: Salt Tithes."
 */
export function adoptionWords(government: string, change: CouncilChange, layout: readonly ChairType[]): string {
  const parts = [`New government: ${government}.`];
  if (change.moved.length === 0 && change.returned.length === 0) {
    if (change.stayed.length > 0) parts.push('Every seated Order kept its chair.');
    return parts.join(' ');
  }
  if (change.moved.length > 0) {
    const moves = change.moved.map(
      (move) => `${orderDef(move.card).name} to chair ${move.to + 1} (${chairWord(layout[move.to] ?? 'wildcard')})`,
    );
    parts.push(`Moved: ${moves.join(', ')}.`);
  }
  if (change.returned.length > 0) {
    parts.push(`Back in your collection: ${change.returned.map((card) => orderDef(card).name).join(', ')}.`);
  }
  return parts.join(' ');
}
