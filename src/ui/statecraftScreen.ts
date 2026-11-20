/**
 * **Orders & Doctrines, the Council screen** (Statecraft): your government with
 * its Doctrines tucked under it, your chairs and the Orders in them, and your
 * hand fanned at the foot.
 *
 * Stage 1 of the approved Council and In play board
 * (`docs/plans/mockups/scholars-study/council-and-in-play/council-and-in-play.html`,
 * frames PL, PM, N4, C6, C8, C11 and CH). The rulings, in the user's words,
 * are in `docs/plans/ui-critique-2026-10-16.md`, from "Two tabs: Council and
 * In play" to the approval of the Council and In play board (2026-11-18). The
 * screen it replaces was batch SS10's card table
 * (`docs/plans/mockups/scholars-study/orders-screen-final-board.html`); its
 * staging, its keys, its layers and its moments are kept.
 *
 * The layout, top to bottom
 * -------------------------
 *   - **The head**: the title, the totals line and the star chart's "×", on
 *     one centre line (the user: "please make sure these are vertically
 *     centered in the real build"; "re-use the convention of the 'x' to close
 *     as in the technology screen"). It is taller than the board's, and the
 *     hand shorter: the government and its chairs are the focus of the page,
 *     and the height the hand gives up goes round them (`councilLayout`). Six
 *     chairs or fewer sit in a cluster, right of the government. The totals line
 *     is eight figures: the six yields, a hairline, then happiness and
 *     authority (`councilTotals.ts`). While a card is held over a chair, a
 *     chip beside each figure says what the
 *     total would gain or lose if the card were dropped there (frame CH).
 *     Beside the title, the link to In play ("In play · 9", and the I key)
 *     opens the screen of everything in force (stage 3, `inPlayScreen.ts`).
 *   - **The government column** at the left: the government as a full card
 *     with its own pay plate, and each Doctrine tucked under it as a strip
 *     with its name and its figures. A strip lifts the Doctrine's full face
 *     on hover or focus.
 *   - **The chairs**: each chair a gilt frame with its label on the top edge
 *     ("2 · Economic"), holding a card or the empty chair's words. The card
 *     form is the window's (`councilLayout`): the full 210 px face up to
 *     eight chairs at 1440 by 900, the 176 px card at eleven, and the compact
 *     forms on small windows.
 *   - **The band**: the hand's label and the hint at the left; the changes,
 *     Revert and Confirm at the right, above the hand, where the main
 *     screen's End Turn is (the user: "the player expects the 'next action'
 *     button to be there").
 *   - **The fan**: the hand's cards as full faces, overlapped and cut by the
 *     window's edge, and the draft pile at the left (the next draft, the deck,
 *     and the door to the binder).
 *
 * Every card is the emblem face (`orderFace.ts`) with its pay plate: what the
 * card pays each turn, in the card's own typeface and the yield colours
 * (`orderLive.ts` picks the reading). The two layers over the table, H for the
 * whole hand and D for the binder, are `ordersLayers.ts`; the moments are
 * `ordersMotion.ts`.
 *
 * Seating is click then click
 * ---------------------------
 * Click a card in the hand to pick it up; the frames of the chairs it fits
 * light and the rest fade, and the chair under the card glows while the card
 * seated there dims (frame CH). Click a lit chair to play the card there. **Click a card in a chair to hold it**;
 * then click a chair to move it there, or click anywhere away from the chairs
 * to take it off its chair and back to the hand (the user, 2026-11-18:
 * "dropping away from a slot should remove it from a slot. useful if players
 * just want to remove a card and not replace it with anything"). The rules
 * allow an empty chair: it is the `unslotOrder` command, which a sealed card
 * refuses with the reducer's own sentence. Escape puts a held card back where
 * it came from; Delete or Backspace takes a card off its chair. The arrows
 * move between cards and chairs, Enter picks up or puts down, and the number
 * keys 1 to 9 play the held card into that chair.
 *
 * **Drag and drop does the same** (stage 2, Part B; the user: "could we
 * support both?"). A press on a card in the fan or in a chair that moves six
 * pixels picks the card up by the same functions a click uses; the release
 * puts it down by the same functions a second click uses: on a chair it seats
 * or swaps, away from every chair a seated card leaves its chair and a hand
 * card goes back. A chair that refuses sends the card back with the reason.
 * Escape cancels. It works by finger too, and the click a release sends is
 * ignored.
 *
 * The figures are one reading (stage 2, Part A): the totals line is what the
 * whole council pays, a card's plate is what the totals lose without it, and
 * a chip is the difference of two totals (`councilTotals.ts`).
 *
 * Nothing is sent until Confirm
 * -----------------------------
 * The staging is unchanged (`statecraftStaging.ts`): the user's rule is "slots
 * should only lock after leaving the menu". Placing and removing edit a local
 * arrangement; the arrangement becomes real on Confirm or on leaving the
 * screen by any door, and Revert throws it away. The arrangement is per seat
 * and is thrown away, never signed, when the seat changes, so a hot-seat
 * handover cannot sign the last player's law.
 *
 * Every refusal is the reducer's own sentence: `placeError` and `removeError`
 * are `slotOrderError` and `unslotOrderError` asked of the staged
 * arrangement, and they decide the rings, the fades, the titles and Confirm.
 *
 * The reveal is Confirm's (`docs/history/fewer-things.md` §1, ruled
 * 2026-09-06): a card played this visit shows no plate until Confirm. On
 * Confirm the batch goes through, and the redraw counts up the plates of the
 * cards the signature made law, and the totals. The chips on the totals line
 * are the one figure shown before Confirm, by the later ruling that a held
 * card shows the pending change.
 *
 * Nothing on this screen is state except the arrangement and the card in
 * hand, which are proposals rather than facts.
 */

import './statecraftScreen.css';

import type { CardImpactSheet } from '../sim/cardImpact';
import { cardImpactSheet } from '../sim/cardImpact';
import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';
import { roundYield } from '../sim/yieldFormat';
import {
  type PlayerStatecraft,
  SLOT_WORDS,
  chairReadingsAt,
  chairsActedOn,
  draftExhausted,
  maliceAt,
  maliceChairRefusal,
  sealRemaining,
  slotTypesOf,
} from '../sim/statecraft';
import { maliceDef } from '../sim/maliceData';
import {
  type CardEffect,
  type CardId,
  type ChairType,
  type CountKind,
  type OrderId,
  CHAIR_TYPES,
  cardDef,
  doctrineDef,
  isCharter,
  isDoctrineId,
  isGovernmentId,
  isOrderId,
  orderDef,
  orderType,
} from '../sim/statecraftData';
import { STAMP_TIMING, stampCountAt } from './cardStamp';
import { chairWord } from './chairs';
import { dressGovernmentBanner, fitGovernmentBanner, governmentBannerNode } from './governmentBanner';
import { type CouncilLayout, COUNCIL_FORMS, COUNCIL_FRAME, councilLayout, fanPlacement } from './councilLayout';
import {
  type CouncilFigures,
  COUNCIL_VOICES,
  councilChange,
  councilFigures,
  explainCouncil,
  foldImpactVoices,
} from './councilTotals';
import { element } from './dom';
import { draftGlance } from './empireDrawer';
import { createModalShell } from './modalShell';
import { wantsMotion } from './motion';
import { type CardLive, doctrineLive, governmentLive, seatedOrderLive, stagedLive } from './orderLive';
import {
  type OrderFacePlate,
  type OrderFaceState,
  dressOrderFace,
  fitOrderFace,
  orderBackNode,
  orderFaceNode,
  plateFigureNode,
  plateFigureText,
  tuckedDoctrineNode,
} from './orderFace';
import {
  type SlotCommand,
  type StagedSlots,
  changedOffices,
  councilDiff,
  place,
  placeError,
  remove,
  removeError,
  sameChairs,
  stage,
  stagedFit,
  stagedState,
  validate,
} from './statecraftStaging';
import { charterTechOf } from './charterTech';
import { techDef } from '../sim/techData';
import {
  type BinderEntry,
  allOrders,
  binderNode,
  handViewNode,
  keyMark,
  layHandView,
} from './ordersLayers';
import {
  ORDERS_MOTION,
  animateLanding,
  flyToHand,
  placeGhost,
  settleConfirmed,
  showPreview,
} from './ordersMotion';

// --- the ties (stage 8) ------------------------------------------------------

/**
 * A card that acts on another chair, both ways round, as one draw reads it
 * (`chairTies` inside the screen): each chair acted on and the cards acting on
 * it, every card that acts on a chair, and the chairs the held card would act on.
 */
interface ChairTies {
  targets: Map<number, CardId[]>;
  actors: Set<CardId>;
  held: Set<number>;
}

// --- the position word (kept from the old screen) ----------------------------

/**
 * The count shapes that read a **slot's position**. Empty today, and a list of
 * the simulation's own `CountKind` members rather than a boolean, so the day a
 * count reads a position, adding it here is the whole of the wiring.
 */
const POSITION_READING_COUNTS: readonly CountKind[] = [];

/** Does this one effect read a slot's position? See the list above. */
function readsSlotPosition(effect: CardEffect): boolean {
  // Batch A shipped the position reader as a modifier (`slotPosition`), not a
  // count: "the Order in your first economic slot pays twice" reads a chair.
  if (effect.kind === 'slotPosition') return effect.position !== 'all';
  if (effect.kind !== 'pays' || effect.basis !== 'count' || effect.count === undefined) {
    return false;
  }
  return POSITION_READING_COUNTS.includes(effect.count);
}

/**
 * Does anything in this empire's law read a slot's position? Asked of the
 * seated Orders, because that is where a card's effects reach the ledgers
 * from, and of the Doctrines, which are always in force (batch DT9).
 */
export function deckReadsSlotPosition(sc: PlayerStatecraft): boolean {
  for (const slot of sc.slots) {
    if (slot === null || !isOrderId(slot.card)) continue;
    for (const effect of orderDef(slot.card).effects) {
      if (readsSlotPosition(effect)) return true;
    }
  }
  for (const id of sc.doctrines) {
    if (!isDoctrineId(id)) continue;
    if (doctrineDef(id).effects.some(readsSlotPosition)) return true;
  }
  return false;
}

/** `1st`, `2nd`, `3rd`, `11th`: the English rule, teens and all. */
function ordinal(rank: number): string {
  const teens = rank % 100;
  if (teens >= 11 && teens <= 13) return `${String(rank)}th`;
  return `${String(rank)}${['th', 'st', 'nd', 'rd'][rank % 10] ?? 'th'}`;
}

/**
 * What this chair is called by **position**: "1st economic", "2nd wildcard".
 * The rank is counted within the type and in array order, which is the order
 * the simulation's own reader uses (`slotLayout` groups the chairs by type).
 */
export function slotPositionWord(layout: readonly ChairType[], index: number): string {
  const type = layout[index];
  if (type === undefined) return '';
  let rank = 0;
  for (let at = 0; at <= index; at++) {
    if (layout[at] === type) rank++;
  }
  return `${ordinal(rank)} ${SLOT_WORDS[type]}`;
}

/**
 * The chair types a card fits, as a phrase: "a Military or Wildcard",
 * "an Economic or Wildcard". The article is the first word's.
 */
export function fitsWords(words: readonly string[]): string {
  if (words.length === 0) return 'no';
  const first = words[0]!;
  const article = /^[AEIOU]/.test(first) ? 'an' : 'a';
  if (words.length === 1) return `${article} ${first}`;
  return `${article} ${words.slice(0, -1).join(', ')} or ${words[words.length - 1]!}`;
}

// --- the screen's words ------------------------------------------------------

/** Every sentence the screen writes itself, in one table. */
export const ORDERS_WORDS = {
  hint: 'Drag a card onto a chair, or click it and then a chair. Each figure is what one card adds alone, so the figures need not add up to the total.',
  held: (name: string, fits: string) => `${name} in hand: it fits ${fits} chair. Esc puts it back.`,
  heldFromChair: (name: string, fits: string) =>
    `${name} in hand: it fits ${fits} chair. Esc puts it back. Delete, or putting it down away from the chairs, takes it off.`,
  totalsLabel: 'What your council pays each turn',
  totalsTitle:
    'What your council pays each turn. A card’s figure is what it adds by itself, so when cards multiply each other the figures need not add up to the total.',
  revert: 'Revert',
  confirm: 'Confirm',
  confirmTitle: 'Seal the arrangement. Leaving the screen does the same.',
  nothingToConfirm: 'nothing to confirm yet',
  revertTitle: 'Put the chairs back the way the law has them',
  changes: (count: number) => `${count} unconfirmed change${count === 1 ? '' : 's'}`,
  staged: 'played, not confirmed',
  seatHere: 'seat here',
  swap: 'swap',
  emptyChair: 'An empty chair.',
  takes: (type: string) => `It takes ${type} cards.`,
  takesAny: 'It takes any card.',
  paysNothing: 'It pays nothing.',
  takenOut: 'Taken out, not confirmed.',
  government: 'Government',
  doctrineCount: (count: number) => `${count} Doctrine${count === 1 ? '' : 's'}`,
  noDoctrine: 'No Doctrine yet. A Doctrine is offered each time you adopt a government.',
  nextDraft: 'next draft',
  chooseGovernment: 'choose a government',
  chooseGovernmentTitle:
    'A new government is ready to be chosen. Adopting lays out new chairs, keeps your Orders in the chairs they still fit, and lifts every seal.',
  exhausted: 'decks exhausted',
  exhaustedTitle:
    'The culture meter is full, but you already hold every card your decks can offer at your band. No draft is charged; the culture stays banked until there is a card to deal.',
  pile: 'Draft pile',
  pileTitle: 'Every Order you hold, in the binder. D opens it too.',
  hand: 'Your hand',
  handCards: (count: number) => `${count} card${count === 1 ? '' : 's'}`,
  handOpens: 'opens it',
  deckCount: (count: number) => `${count} in your deck`,
  handEmpty: 'Your hand is empty.',
  noOrders: 'You hold no Orders yet. Culture pays for the first draft.',
  countsTwice: 'counts twice',
  /** Stage 8: the tie between a card and the chair it acts on, in the marks' titles. */
  tieTarget: (names: string) => `${names}: acts on this chair`,
  tieActor: 'Acts on the chair with the same mark',
  tieHeld: 'The card you hold would act on this chair',
  sealed: (turns: number) => `Sealed for ${turns} more turn${turns === 1 ? '' : 's'}`,
  /** The head's link to In play (stage 3): the screen's name and how many pieces are in force. */
  inPlayLink: (count: number) => `In play · ${count} →`,
} as const;

/** How long a refusal stands in place of the hint. The board's four seconds. */
const REFUSAL_MS = 4000;

// --- the screen --------------------------------------------------------------

export interface StatecraftScreen {
  readonly isOpen: boolean;
  open(): void;
  /**
   * Opens the sheet and brings this card into view, marked for a moment. The
   * commission chips' door (batch C).
   */
  openAt(card: OrderId): void;
  close(): void;
  toggle(): void;
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
  refresh(): void;
  dispose(): void;
}

interface StatecraftScreenOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /** The element the sheet's body is built into. */
  body: HTMLElement;
  /** The overlay's own close control: the star chart's "×" (`.tech-close`). Escape closes too. */
  closeButton: HTMLElement;
  /** The bar control that opens it, for the `aria-expanded` mirror. */
  trigger?: HTMLElement;
  /** The live game and the seat being looked at. Read on every draw. */
  getState: () => GameState;
  getPlayerId: () => number;
  /**
   * Sends the staged arrangement as one batch: every `unslotOrder`, then every
   * `slotOrder` (`councilDiff` decides the order). Answers the refusal that
   * stopped the batch, or `null` when every command was taken.
   */
  send: (commands: readonly SlotCommand[]) => string | null;
  /** Opens the banked government offer's card. */
  adopt?: () => void;
  /** Said in the manicule line: a refusal, in the reducer's own words. */
  onRefuse?: (message: string) => void;
  /** Called when this screen opens, so the others can close. */
  onOpen?: () => void;
  /**
   * The In play screen (stage 3): the link in the head says how many pieces
   * are in force, and it and the I key open that screen. Opening it closes
   * this one through the screen registry, which signs the arrangement.
   */
  inPlay?: { count: () => number; open: () => void };
}

/** A card's type, for sorting the hand: the chair types in order, then the rest. */
function typeRank(id: OrderId): number {
  const index = (CHAIR_TYPES as readonly string[]).indexOf(orderType(id));
  return index < 0 ? CHAIR_TYPES.length : index;
}

/**
 * Counts the signed numbers in these nodes up from nothing, over the stamp's
 * count (`STAMP_TIMING.countMs`, 750 ms). Returns a canceller. With less
 * motion the numbers are simply there, and nothing runs.
 */
function countUp(nodes: readonly Element[]): () => void {
  if (!wantsMotion() || nodes.length === 0) return () => {};
  const targets = nodes.map((node) => {
    const text = node.textContent ?? '';
    const match = /([+\-−]?)(\d+)/.exec(text);
    return match === null ? null : { node, text, match };
  });
  const start = performance.now();
  let frame = 0;
  const tick = (now: number): void => {
    const elapsed = now - start - STAMP_TIMING.anticipationMs;
    let done = true;
    for (const target of targets) {
      if (target === null) continue;
      const value = Number(target.match[2]);
      const shown = stampCountAt(value, elapsed);
      if (shown !== value) done = false;
      const index = target.match.index;
      target.node.textContent =
        target.text.slice(0, index) + target.match[1] + String(shown) + target.text.slice(index + target.match[0].length);
    }
    if (!done) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    for (const target of targets) if (target !== null) target.node.textContent = target.text;
  };
}

export function createStatecraftScreen(options: StatecraftScreenOptions): StatecraftScreen {
  const { overlay, body, closeButton, trigger } = options;
  const sheetNode = overlay.querySelector<HTMLElement>('.statecraft-sheet');
  const head = overlay.querySelector<HTMLElement>('.statecraft-head');
  const hintNode = overlay.querySelector<HTMLElement>('.statecraft-hint');

  /**
   * The card in hand, or `null`. Not state: it is which card the player has
   * picked up and not yet put down, cleared when the screen closes.
   */
  let held: OrderId | null = null;
  /**
   * The arrangement before the held card was picked up out of a chair, so
   * Escape can put it back where it came from. `null` for a card picked up
   * from the hand.
   */
  let beforeLift: StagedSlots | null = null;
  /**
   * The arrangement the player is building, or `null`. A copy of
   * `PlayerStatecraft.slots` with this visit's edits on it; every question
   * asked of it goes through the simulation's own evaluators.
   */
  let staged: StagedSlots | null = null;
  /** Whose arrangement it is, `-1` for nobody. The hot-seat guard. */
  let stagedSeat = -1;
  /** The chairs the arrangement was laid out against, or `null`. See `ensureStaging`. */
  let stagedChairs: readonly ChairType[] | null = null;
  /** The cards Confirm just made law, waiting for their count-up. Spent by the next draw. */
  let justConfirmed: OrderId[] = [];
  /** Count the totals up on the next draw, because Confirm just went through. */
  let countTotal = false;
  /** The count-ups still running, so the next draw can stop them. */
  let counting: (() => void)[] = [];
  /** The refusal standing in the hint, and its timer. */
  let refusal: string | null = null;
  let refusalTimer: ReturnType<typeof setTimeout> | null = null;
  /** The card or chair the keyboard was on, kept across a redraw. */
  let focusKey: string | null = null;
  /** A card to mark once after a redraw (`openAt`). */
  let markCard: OrderId | null = null;
  /** The layer open over the table: the whole hand (H), the binder (D), or none. */
  let layer: 'hand' | 'binder' | null = null;
  /** The binder's filters and its scroll, kept while the sheet is open. */
  let binderFilter = allOrders();
  let binderScroll = 0;
  /** Where the pointer was last seen over the sheet, for the card that follows it. */
  let pointer: { x: number; y: number } | null = null;
  /** True when the held card was picked up by the pointer, so it follows the pointer. */
  let ghostArmed = false;
  /** The card that follows the pointer while one is held (moment 2). */
  let ghost: HTMLElement | null = null;
  /** A landing to play after the next draw (moment 3): the chair, and where the card flew from. */
  let landing: { index: number; from: DOMRect } | null = null;
  /** A card's slide to the hand after the next draw (moment 6): swapped out, or taken off its chair. */
  let slide: { card: OrderId; from: DOMRect } | null = null;
  /** The full face shown on hover or focus (moment 1), and its timer. */
  let preview: HTMLElement | null = null;
  let previewSource: HTMLElement | null = null;
  let previewTimer: ReturnType<typeof setTimeout> | null = null;
  /** What each card's full face shows when it is lifted, for this draw. */
  let previewStates = new Map<string, OrderFaceState>();
  /** The faces Confirm just made law, to settle once they are on the page (moment 4). */
  let settling: HTMLElement[] = [];
  /** The window's size at the last draw, so a resize that changes nothing draws nothing. */
  let drawnSize = '';
  /** This draw's layout: the card form and the rows (`councilLayout`). */
  let screenLayout: CouncilLayout = councilLayout({ width: 1440, height: 900 }, 6);
  /**
   * The chair the held card is over, and the change dropping it there would
   * make to the totals (frame CH). Measured once when the chair changes,
   * never on a pointer move.
   */
  let over: { index: number; change: CouncilFigures | null } | null = null;

  // The head: the totals line, and the close button drawn as the board's
  // "Esc closes". Built once and filled on every draw.
  const totalsNode = element('div', 'council-totals');
  totalsNode.setAttribute('role', 'group');
  totalsNode.setAttribute('aria-label', ORDERS_WORDS.totalsLabel);
  const totalCells = new Map<string, { figure: HTMLElement; chip: HTMLElement }>();
  COUNCIL_VOICES.forEach((voice, index) => {
    if (index === 6) totalsNode.append(element('span', 'council-totals-rule'));
    const cell = element('span', 'council-total');
    cell.dataset.voice = voice;
    const figure = plateFigureNode({ voice, amount: 0 }, 'council-total-fig');
    const chip = element('i', 'council-chip');
    chip.hidden = true;
    cell.append(figure, chip);
    totalsNode.append(cell);
    totalCells.set(voice, { figure, chip });
  });
  // The close control is the star chart's "×" (`index.html`, `.tech-close`;
  // the user, 2026-11-18). Its title says Escape closes too, so the head has
  // one close control and no second hint.
  if (head !== null) head.insertBefore(totalsNode, closeButton);
  // The head's height is the layout's, from the first paint on. So are the
  // sheet's sides and the gap after the government's column, which together
  // place the room the chairs are centred in (`CouncilLayout.cluster`).
  sheetNode?.style.setProperty('--council-head-h', `${COUNCIL_FRAME.head}px`);
  sheetNode?.style.setProperty('--council-side', `${COUNCIL_FRAME.side}px`);
  sheetNode?.style.setProperty('--council-gap', `${COUNCIL_FRAME.columnGap}px`);
  // The link to In play (stage 3), beside the title: "In play · 9" and its key.
  const inPlayLink = element('button', 'council-inplay-link') as HTMLButtonElement;
  inPlayLink.type = 'button';
  const inPlayCount = element('span');
  inPlayLink.append(inPlayCount, keyMark('I'));
  inPlayLink.addEventListener('click', () => options.inPlay?.open());
  if (options.inPlay !== undefined) head?.querySelector('.statecraft-head-titles')?.after(inPlayLink);

  // The band's tools: the changes, Revert and Confirm, at the right above the
  // hand. Built once, so the buttons keep their place in the tab order.
  const tools = element('div', 'orders-head-tools');
  const changesNode = element('span', 'orders-changes');
  const revertButton = element('button', 'btn orders-revert', ORDERS_WORDS.revert) as HTMLButtonElement;
  revertButton.type = 'button';
  // The main screen's End Turn control: cinnabar, the thick ink edge and the hard shadow.
  const confirmButton = element('button', 'btn btn-primary btn-end orders-confirm', ORDERS_WORDS.confirm) as HTMLButtonElement;
  confirmButton.type = 'button';
  tools.append(changesNode, revertButton, confirmButton);
  sheetNode?.classList.add('orders-sheet');
  body.classList.add('orders-body');
  // The layer the moving and lifted cards are drawn in: the sheet itself, so a
  // card can travel from the hand to a chair over everything between.
  const layerHost = sheetNode ?? body;

  /** Stops every count still running. The start of a draw, and the way out. */
  function stopCounting(): void {
    for (const cancel of counting) cancel();
    counting = [];
  }

  /** The hint, or the refusal standing in its place. */
  function paintHint(): void {
    if (hintNode === null) return;
    // A refusal wears `wanting`, the one voice of every refusal line.
    hintNode.classList.toggle('wanting', refusal !== null);
    if (refusal !== null) {
      hintNode.textContent = refusal;
      return;
    }
    const state = options.getState();
    const seat = options.getPlayerId();
    if (held !== null && staged !== null) {
      const fit = stagedFit(state, seat, staged);
      const card = held;
      const fits = CHAIR_TYPES.filter((type) => fit(card, type)).map((type) => chairWord(type));
      const words = beforeLift !== null ? ORDERS_WORDS.heldFromChair : ORDERS_WORDS.held;
      hintNode.textContent = words(orderDef(card).name, fitsWords(fits));
      return;
    }
    hintNode.textContent = ORDERS_WORDS.hint;
  }

  /** Prints the reducer's sentence in place of the hint for four seconds, and in the manicule line. */
  function refuse(message: string): void {
    options.onRefuse?.(message);
    refusal = message;
    if (refusalTimer !== null) clearTimeout(refusalTimer);
    refusalTimer = setTimeout(() => {
      refusal = null;
      refusalTimer = null;
      paintHint();
    }, REFUSAL_MS);
    paintHint();
  }

  function clearRefusal(): void {
    if (refusalTimer !== null) clearTimeout(refusalTimer);
    refusalTimer = null;
    refusal = null;
  }

  /** Throws the arrangement away. Revert, seat changes, and the way out of a game. */
  function discardStaging(): void {
    staged = null;
    stagedSeat = -1;
    stagedChairs = null;
    held = null;
    beforeLift = null;
    over = null;
    justConfirmed = [];
    countTotal = false;
  }

  /**
   * The arrangement this draw is about. Re-taken from the live slots when
   * nothing is staged, when the seat has changed, and when the chairs have
   * changed (their number or any one's type): an adoption rebuilds the slots,
   * and an arrangement indexed into the old chairs would be wrong.
   */
  function ensureStaging(sc: PlayerStatecraft, seat: number): StagedSlots {
    const chairs = slotTypesOf(sc);
    if (staged === null || stagedSeat !== seat || !sameChairs(stagedChairs, chairs)) {
      staged = stage(sc.slots);
      stagedSeat = seat;
      stagedChairs = chairs;
      held = null;
      beforeLift = null;
      return staged;
    }
    // Clean means "says exactly what the law says", so re-taking it costs
    // nothing, and it keeps a lifted seal current.
    if (changedOffices(sc.slots, staged) === 0 && held === null) staged = stage(sc.slots);
    return staged;
  }

  /**
   * Signs the arrangement: the diff, as one batch, through the one seam. Called
   * by Confirm and by every way out of the screen. Silent when nothing is
   * staged. Validated against the live state first, because the game may
   * have moved since the last draw. Answers the cards the signature made law,
   * read back from the live slots.
   */
  function commitStaging(): OrderId[] {
    const arrangement = staged;
    if (arrangement === null) return [];
    const state = options.getState();
    const seat = options.getPlayerId();
    // Somebody else's arrangement. Thrown away, never signed.
    if (stagedSeat !== seat) {
      discardStaging();
      return [];
    }
    const player = playerById(state, seat);
    if (!player) {
      discardStaging();
      return [];
    }
    // Ordered by the council's chairs, so a card that only a widened council
    // seats goes in after the card that widens it and comes out before it
    // (Magisterial batch MG12).
    const commands = councilDiff(state, seat, arrangement);
    if (commands.length === 0) return [];
    const problem = validate(state, seat, arrangement);
    if (problem !== null) {
      refuse(problem);
      staged = stage(player.statecraft.slots);
      return [];
    }
    const proposed: OrderId[] = [];
    for (const entry of arrangement) {
      if (entry !== null && entry.staged) proposed.push(entry.card);
    }
    options.send(commands);
    const live = playerById(options.getState(), seat)?.statecraft.slots ?? [];
    staged = stage(live);
    return proposed.filter((card) => live.some((slot) => slot?.card === card));
  }

  /** The seat's statecraft and its arrangement, or null with no seat. */
  function context(): { state: GameState; seat: number; sc: PlayerStatecraft; arrangement: StagedSlots } | null {
    const state = options.getState();
    const seat = options.getPlayerId();
    const sc = playerById(state, seat)?.statecraft;
    if (!sc) return null;
    return { state, seat, sc, arrangement: ensureStaging(sc, seat) };
  }

  /**
   * Notes whether a click came from the pointer, so the card picked up
   * follows it (moment 2). A click from the keyboard (Enter) has no pointer.
   */
  function notePointer(event: MouseEvent | null): void {
    ghostArmed = event !== null && event.detail > 0;
    if (ghostArmed && event !== null) pointer = { x: event.clientX, y: event.clientY };
  }

  /**
   * Picks a card up from the hand, or puts the held one down. A card held out
   * of a chair is taken off its chair when the player clicks the hand: the
   * hand is away from every chair.
   */
  function take(id: OrderId, event: MouseEvent | null = null): void {
    if (held === id) {
      if (beforeLift !== null) takeOff();
      else putBack();
      draw();
      return;
    }
    if (held !== null) {
      if (beforeLift !== null) takeOff();
      else putBack();
    }
    notePointer(event);
    held = id;
    beforeLift = null;
    focusKey = `hand:${id}`;
    draw();
  }

  /**
   * Picks a card up **out of its chair** and holds it: a staged removal, then
   * the card is held (the user, 2026-11-18: "clicking an already slotted card
   * should make it 'held'"). A sealed card answers with the reducer's own
   * sentence and does not move.
   */
  function lift(index: number, event: MouseEvent | null = null): void {
    const ctx = context();
    if (ctx === null) return;
    const entry = ctx.arrangement[index];
    if (!entry) return;
    const problem = removeError(ctx.state, ctx.seat, ctx.arrangement, index);
    if (problem !== null) {
      refuse(problem);
      shake(index);
      return;
    }
    if (held !== null) putBack();
    notePointer(event);
    beforeLift = staged;
    staged = remove(ctx.arrangement, index);
    held = entry.card;
    focusKey = `chair:${index}`;
    draw();
  }

  /** Puts the held card back where it came from: its chair, or the hand. */
  function putBack(): void {
    if (held === null) return;
    if (beforeLift !== null) staged = beforeLift;
    focusKey = beforeLift === null ? `hand:${held}` : focusKey;
    held = null;
    beforeLift = null;
    over = null;
  }

  /**
   * **Takes the held card off its chair**: the card was lifted out of a chair
   * and is put down away from every chair, so the chair stays empty and the
   * card goes back to the hand. The removal is staged like any other and is
   * signed on Confirm. A card held from the hand simply goes back.
   */
  function takeOff(): void {
    if (held === null) return;
    if (beforeLift === null) {
      putBack();
      return;
    }
    const card = held;
    const from = ghost?.isConnected === true ? ghost.getBoundingClientRect() : chairFaceRect(beforeLift, card);
    slide = from === null ? null : { card, from };
    held = null;
    beforeLift = null;
    over = null;
    focusKey = `hand:${card}`;
  }

  /** Where a card's face was in its chair, for the slide to the hand. */
  function chairFaceRect(arrangement: StagedSlots, card: OrderId): DOMRect | null {
    const index = arrangement.findIndex((entry) => entry?.card === card);
    if (index < 0) return null;
    return body.querySelector(`[data-chair="${index}"] .council-slot`)?.getBoundingClientRect() ?? null;
  }

  /**
   * **Delete or Backspace**: takes a card off its chair. The held card, if it
   * came out of a chair; else the card in the chair the keyboard is on, asked
   * of the reducer first, so a sealed card refuses with its own sentence.
   */
  function takeOffByKey(): boolean {
    if (held !== null) {
      if (beforeLift === null) return false;
      takeOff();
      draw();
      return true;
    }
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const nav = active?.dataset.nav ?? '';
    if (!nav.startsWith('chair:')) return false;
    const index = Number(nav.slice('chair:'.length));
    const ctx = context();
    if (ctx === null || !ctx.arrangement[index]) return false;
    const problem = removeError(ctx.state, ctx.seat, ctx.arrangement, index);
    if (problem !== null) {
      refuse(problem);
      shake(index);
      return true;
    }
    const card = ctx.arrangement[index]!.card;
    const from = body.querySelector(`[data-chair="${index}"] .council-slot`)?.getBoundingClientRect();
    slide = from === undefined ? null : { card, from };
    staged = remove(ctx.arrangement, index);
    focusKey = `chair:${index}`;
    draw();
    return true;
  }

  /** Shakes a sealed card, for the click that it refused. */
  function shake(index: number): void {
    const node = body.querySelector<HTMLElement>(`[data-chair="${index}"] .order-face`);
    if (node === null || !wantsMotion()) return;
    node.classList.remove('is-shaking');
    void node.offsetWidth;
    node.classList.add('is-shaking');
  }

  /**
   * A click on a chair. With a card in hand: play it into an empty chair, or
   * swap it with the card in an occupied one. With nothing in hand: hold the
   * card in the chair. Edits the arrangement; sends nothing.
   */
  function drop(index: number, event: MouseEvent | null = null): void {
    const ctx = context();
    if (ctx === null) return;
    const { state, seat, arrangement } = ctx;
    const player = playerById(state, seat);
    const malice = player === undefined ? null : maliceAt(player, index);
    if (malice !== null) {
      refuse(maliceChairRefusal(index, malice));
      return;
    }
    if (held === null) {
      if (arrangement[index]) lift(index, event);
      return;
    }
    let base = arrangement;
    const swapped = arrangement[index]?.card ?? null;
    if (arrangement[index]) {
      const problem = removeError(state, seat, arrangement, index);
      if (problem !== null) {
        refuse(problem);
        shake(index);
        return;
      }
      base = remove(arrangement, index);
    }
    const problem = placeError(state, seat, base, held, index);
    if (problem !== null) {
      refuse(problem);
      return;
    }
    // Where the card flies from (moment 3): the card following the pointer, or
    // the card in the hand. And the card it replaces slides to the hand (6).
    const from = ghost?.isConnected === true ? ghost.getBoundingClientRect() : body.querySelector(`[data-nav="hand:${held}"] .order-face`)?.getBoundingClientRect();
    landing = from === undefined ? null : { index, from };
    const out = body.querySelector(`[data-chair="${index}"] .order-face`)?.getBoundingClientRect();
    slide = swapped !== null && out !== undefined ? { card: swapped, from: out } : null;
    staged = place(base, index, held, state.turn);
    // No plate here: the figure is Confirm's (the reveal ruling).
    held = null;
    beforeLift = null;
    over = null;
    focusKey = `chair:${index}`;
    draw();
  }

  /**
   * The arrangement with `card` dropped on chair `index`: seated in an empty
   * chair, or swapped for the card there. The reducer's own sentence when it
   * would be refused.
   */
  function dropTarget(
    state: GameState,
    seat: number,
    arrangement: StagedSlots,
    card: OrderId,
    index: number,
  ): StagedSlots | string {
    let base = arrangement;
    if (arrangement[index]) {
      const problem = removeError(state, seat, arrangement, index);
      if (problem !== null) return problem;
      base = remove(arrangement, index);
    }
    const problem = placeError(state, seat, base, card, index);
    if (problem !== null) return problem;
    return place(base, index, card, state.turn);
  }

  /** Confirm: sign the arrangement, then redraw with the count-ups. */
  function confirmStaging(): void {
    justConfirmed = commitStaging();
    countTotal = justConfirmed.length > 0;
    held = null;
    beforeLift = null;
    over = null;
    draw();
  }

  /** Revert: put the chairs back the way the law has them. */
  function revert(): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const sc = playerById(state, seat)?.statecraft;
    if (!sc) return;
    staged = stage(sc.slots);
    stagedSeat = seat;
    stagedChairs = slotTypesOf(sc);
    held = null;
    beforeLift = null;
    over = null;
    draw();
  }

  revertButton.addEventListener('click', revert);
  confirmButton.addEventListener('click', confirmStaging);

  // --- the head -------------------------------------------------------------

  /**
   * The totals line: what the whole council pays each turn, the fold of the
   * council's own impact list (`explainCouncil`, stage 2), never a sum of the
   * cards' plates (rule 5). The chips are the change a held card would make,
   * written by `paintChips`.
   */
  function paintHead(exact: Readonly<CouncilFigures>): void {
    const figures = councilFigures(exact);
    for (const voice of COUNCIL_VOICES) {
      const cell = totalCells.get(voice)!;
      const amount = figures[voice];
      const number = cell.figure.querySelector('b');
      if (number !== null) number.textContent = plateFigureText(amount);
      if (amount < 0) cell.figure.dataset.sign = 'minus';
      else delete cell.figure.dataset.sign;
    }
    totalsNode.title = ORDERS_WORDS.totalsTitle;
    if (options.inPlay !== undefined) inPlayCount.textContent = ORDERS_WORDS.inPlayLink(options.inPlay.count());
    if (countTotal) counting.push(countUp([...totalsNode.querySelectorAll('.council-total-fig b')]));
    paintChips();
  }

  /** The chips beside the totals: what each would gain or lose if the held card were dropped on the chair under it. */
  function paintChips(): void {
    const change = held !== null ? (over?.change ?? null) : null;
    for (const voice of COUNCIL_VOICES) {
      const { chip } = totalCells.get(voice)!;
      const amount = change?.[voice] ?? 0;
      chip.hidden = amount === 0;
      chip.textContent = amount === 0 ? '' : plateFigureText(amount);
      chip.classList.toggle('is-down', amount < 0);
    }
    totalsNode.toggleAttribute('data-pending', change !== null);
  }

  /** The band's tools: Confirm and Revert, dim until a change is staged, and what is staged. */
  function paintTools(state: GameState, seat: number, sc: PlayerStatecraft, arrangement: StagedSlots): void {
    const changes = changedOffices(sc.slots, arrangement);
    const problem = changes === 0 ? null : validate(state, seat, arrangement);
    confirmButton.disabled = changes === 0 || problem !== null;
    confirmButton.classList.toggle('is-unconfirmed', changes > 0);
    confirmButton.title = problem ?? (changes === 0 ? ORDERS_WORDS.nothingToConfirm : ORDERS_WORDS.confirmTitle);
    revertButton.disabled = changes === 0;
    revertButton.title = ORDERS_WORDS.revertTitle;
    // An arrangement that will not seal prints the reducer's sentence, and the
    // refusal wears `wanting`, the one vermilion italic every unmet condition
    // is printed in (the user's ruling of 2026-09-08).
    changesNode.className = problem !== null ? 'orders-changes wanting' : 'orders-changes';
    changesNode.textContent = problem ?? (changes > 0 ? ORDERS_WORDS.changes(changes) : ORDERS_WORDS.nothingToConfirm);
  }

  // --- the ties: a card that acts on another chair (stage 8) -------------------

  /**
   * **Which chairs the cards in force act on** (the user, 2026-11-19, on The
   * Grand Vizier: "could we add a highlight effect to the chair that it targets
   * when slotted?"). Read off the sim's own resolution (`chairsActedOn`) on the
   * board as this visit stages it, for the government, each Doctrine and each
   * Order in a chair, and for the card held over the council.
   */
  function chairTies(state: GameState, seat: number, sc: PlayerStatecraft, arrangement: StagedSlots): ChairTies {
    const board = stagedState(state, seat, arrangement);
    const targets = new Map<number, CardId[]>();
    const actors = new Set<CardId>();
    const acting: CardId[] = [sc.government, ...sc.doctrines, ...arrangement.flatMap((entry) => (entry === null ? [] : [entry.card]))];
    for (const id of acting) {
      const chairs = chairsActedOn(board, seat, id);
      if (chairs.length === 0) continue;
      actors.add(id);
      for (const chair of chairs) targets.set(chair, [...(targets.get(chair) ?? []), id]);
    }
    return { targets, actors, held: new Set(held === null ? [] : chairsActedOn(board, seat, held)) };
  }

  /** A tie-mark: a small gilt lozenge, filled on the acting card, open on the chair it acts on. */
  function tieMark(kind: 'actor' | 'target' | 'held', title: string): HTMLElement {
    const mark = element('span', `council-tie is-${kind}`);
    mark.title = title;
    return mark;
  }

  /**
   * Lights a card and the chairs it acts on together, while the pointer or the
   * keyboard is on either. Everything else drops back to quiet.
   */
  function lightTies(from: EventTarget | null): void {
    for (const lit of body.querySelectorAll('.is-tie-lit')) lit.classList.remove('is-tie-lit');
    const holder = from instanceof Element ? from.closest<HTMLElement>('[data-tie-actor], [data-tie-target]') : null;
    if (holder === null) return;
    const tied = (node: HTMLElement): string[] => [
      ...(node.dataset.tieActor === undefined ? [] : [node.dataset.tieActor]),
      ...(node.dataset.tieTarget === undefined ? [] : node.dataset.tieTarget.split(' ')),
    ];
    const ids = new Set(tied(holder));
    for (const node of body.querySelectorAll<HTMLElement>('[data-tie-actor], [data-tie-target]')) {
      if (tied(node).some((id) => ids.has(id))) node.classList.add('is-tie-lit');
    }
  }
  body.addEventListener('pointerover', (event) => lightTies(event.target));
  body.addEventListener('focusin', (event) => lightTies(event.target));
  body.addEventListener('pointerleave', () => lightTies(null));

  // --- the register: the government, and the Doctrines tucked under it -------

  /**
   * The government column: the government on its banner with its own plate
   * (`governmentLive`), and each Doctrine tucked under it with its plate
   * (`doctrineLive`). Each plate is the card's share of the totals, as every
   * chair's is. The government and a strip lift their full faces after the
   * pause.
   *
   * **The banner** (Quiet Table, frame 7: "The same banner can head the
   * government card on the Council screen later"): the banner window heads
   * the card, then the rules, the chairs this council has (`slotTypesOf`) and
   * the plate (`governmentBanner.ts`). It is the column's width, the full
   * column or the narrow one (`COUNCIL_FRAME.government`).
   */
  function drawRegister(state: GameState, seat: number, sc: PlayerStatecraft, sheet: CardImpactSheet | undefined, ties: ChairTies): HTMLElement {
    const column = element('section', 'council-gov');
    column.setAttribute('aria-label', 'Government and Doctrines');
    const label = element('div', 'council-label');
    label.append(element('span', undefined, ORDERS_WORDS.government));
    if (sc.doctrines.length > 0) label.append(element('span', undefined, ORDERS_WORDS.doctrineCount(sc.doctrines.length)));
    column.append(label);
    const law = governmentLive(state, seat, sc.government, sheet, council ?? undefined);
    const plate: OrderFacePlate | null = law.plate;
    const card = element('div', 'council-gov-card');
    const face = element('div');
    dressGovernmentBanner(face, sc.government, { form: 'seat', layout: slotTypesOf(sc), plate });
    face.dataset.card = sc.government;
    card.append(face);
    card.dataset.preview = 'register';
    card.dataset.card = sc.government;
    card.tabIndex = 0;
    card.dataset.nav = 'government';
    if (ties.actors.has(sc.government)) {
      card.dataset.tieActor = sc.government;
      card.append(tieMark('actor', ORDERS_WORDS.tieActor));
    }
    previewStates.set(sc.government, { where: 'played', plate });
    column.append(card);
    const tucks = element('div', 'council-tucks');
    sc.doctrines.forEach((id, index) => {
      const live = isDoctrineId(id) ? doctrineLive(state, seat, id, sheet, council ?? undefined) : null;
      const strip = tuckedDoctrineNode(id, live?.plate ?? null);
      strip.classList.add('council-tuck');
      strip.style.setProperty('--tuck', String(index + 1));
      strip.style.zIndex = String(sc.doctrines.length - index);
      strip.dataset.card = id;
      strip.dataset.nav = `doctrine:${id}`;
      strip.dataset.preview = 'register';
      strip.tabIndex = 0;
      strip.setAttribute('aria-label', `${cardDef(id).name}, Doctrine`);
      if (live !== null) previewStates.set(id, { where: 'played', unmet: live.unmet, liveLine: live.line, plate: live.plate });
      if (live?.unmet !== null && live?.unmet !== undefined) strip.dataset.unmet = 'true';
      if (ties.actors.has(id)) {
        strip.dataset.tieActor = id;
        strip.append(tieMark('actor', ORDERS_WORDS.tieActor));
      }
      tucks.append(strip);
    });
    column.append(tucks);
    if (sc.doctrines.length === 0) column.append(element('p', 'orders-nodoctrine', ORDERS_WORDS.noDoctrine));
    return column;
  }

  // --- the table: the chairs ---------------------------------------------------

  /** The words in an empty chair: what it takes, and that it pays nothing. */
  function emptyChairWords(type: ChairType, takesAny: boolean, takenOut: boolean): string {
    // One sentence a line (`white-space: pre-line`).
    if (takenOut) return `${ORDERS_WORDS.takenOut}\n${ORDERS_WORDS.paysNothing}`;
    const takes = type === 'wildcard' || takesAny ? ORDERS_WORDS.takesAny : ORDERS_WORDS.takes(chairWord(type));
    return `${ORDERS_WORDS.emptyChair}\n${takes}\n${ORDERS_WORDS.paysNothing}`;
  }

  /** The chair's label on its frame's top edge: "2 · Economic", a position the law reads, and the seal. */
  function chairLegend(type: ChairType, index: number, note: string, sealedTurns: number): HTMLElement {
    const legend = element('span', 'council-leg');
    legend.dataset.ink = type;
    legend.append(element('span', undefined, `${index + 1} · ${chairWord(type)}`));
    if (note !== '') legend.append(element('span', 'council-leg-note', note));
    if (sealedTurns > 0) {
      const lock = element('span', 'council-leg-lock');
      lock.append(element('i', 'of-lock'), `${sealedTurns}t`);
      legend.append(lock);
    }
    return legend;
  }

  function drawTable(
    state: GameState,
    seat: number,
    sc: PlayerStatecraft,
    arrangement: StagedSlots,
    sheet: CardImpactSheet | undefined,
    ties: ChairTies,
  ): HTMLElement {
    const table = element('section', 'orders-table');
    table.setAttribute('aria-label', 'Chairs');
    const layout = slotTypesOf(sc);
    const player = playerById(state, seat);
    const positions = deckReadsSlotPosition(sc);
    const fit = stagedFit(state, seat, arrangement);
    const compact = screenLayout.form === 'full' ? null : screenLayout.form;
    layout.forEach((type, index) => {
      const filled = arrangement[index] ?? null;
      const malice = player === undefined ? null : maliceAt(player, index);
      const live = sc.slots[index] ?? null;
      const cell = element('div', 'orders-chair');
      cell.dataset.chair = String(index);
      cell.dataset.type = type;

      // What a held card would do here: seat, swap, or be refused.
      let ring: 'seat' | 'swap' | null = null;
      let refused: string | null = null;
      if (held !== null) {
        if (malice !== null) refused = maliceChairRefusal(index, malice);
        else if (filled) {
          refused =
            removeError(state, seat, arrangement, index) ??
            placeError(state, seat, remove(arrangement, index), held, index);
          if (refused === null) ring = 'swap';
        } else {
          refused = placeError(state, seat, arrangement, held, index);
          if (refused === null) ring = 'seat';
        }
      }

      const note: string[] = [];
      if (positions) note.push(slotPositionWord(layout, index));
      if (positions && chairReadingsAt(state, seat, index) === 2) note.push(ORDERS_WORDS.countsTwice);
      const sealedTurns = filled && !filled.staged ? sealRemaining(state, filled) : 0;

      const frame = element('div', 'council-slot');
      const legend = chairLegend(type, index, note.join(' · '), sealedTurns);
      // The ties (stage 8): this chair's card acts on another chair, another
      // card acts on this chair, or the card held would.
      if (filled && ties.actors.has(filled.card)) {
        cell.dataset.tieActor = filled.card;
        legend.append(tieMark('actor', ORDERS_WORDS.tieActor));
      }
      const actedBy = ties.targets.get(index);
      if (actedBy !== undefined) {
        cell.dataset.tieTarget = actedBy.join(' ');
        legend.append(tieMark('target', ORDERS_WORDS.tieTarget(actedBy.map((id) => cardDef(id).name).join(' and '))));
      }
      if (ties.held.has(index)) {
        cell.dataset.tieHeld = '';
        legend.append(tieMark('held', ORDERS_WORDS.tieHeld));
      }
      frame.append(legend);
      const button = element('button', 'orders-seat') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.nav = `chair:${index}`;
      if (malice !== null) {
        // The bad face: a chair a malice holds. Not empty and not takeable.
        const face = element('div', 'orders-malice');
        face.append(element('span', 'orders-malice-mark', '✕'));
        face.append(element('span', 'orders-malice-name', maliceDef(malice).name));
        face.append(element('span', 'orders-malice-note', maliceDef(malice).note));
        button.append(face);
        button.title = maliceChairRefusal(index, malice);
        cell.dataset.state = 'malice';
      } else if (filled) {
        const id = filled.card;
        const reading: CardLive = filled.staged ? stagedLive() : seatedOrderLive(state, seat, id, sheet, council ?? undefined);
        const face = element('div');
        const faceState: OrderFaceState = {
          where: 'played',
          sealedTurns,
          staged: filled.staged,
          liveLine: reading.line,
          unmet: reading.unmet,
          plate: reading.plate,
        };
        // A card played this visit says so at its foot, where its plate will
        // land on Confirm ("awaits your seal: on Confirm"), so no tag sits on
        // the chair's label.
        dressOrderFace(face, id, { ...faceState, inControl: true });
        // The smaller forms: the same emblem with a short picture band.
        if (compact !== null) face.dataset.compact = compact;
        button.append(face);
        button.dataset.preview = 'chair';
        button.dataset.card = id;
        previewStates.set(id, faceState);
        button.setAttribute('aria-label', `${orderDef(id).name}, chair ${index + 1}, ${reading.line.text}`);
        button.title =
          sealedTurns > 0
            ? ORDERS_WORDS.sealed(sealedTurns)
            : filled.staged
              ? `${orderDef(id).name}, ${ORDERS_WORDS.staged}`
              : orderDef(id).name;
        cell.dataset.state = filled.staged ? 'staged' : 'seated';
        cell.dataset.live = reading.kind;
        if (justConfirmed.includes(id)) {
          counting.push(countUp([...face.querySelectorAll('.of-pay-fig b')]));
          settling.push(face);
        }
        if (markCard === id) cell.classList.add('is-marked');
      } else {
        // "Any card" when every Order this seat could seat fits the chair: a
        // Wildcard chair, or every chair under a law that lets any card sit anywhere.
        const seatable = sc.orders.filter((one) => !isCharter(one));
        const takesAny = seatable.length > 0 && seatable.every((one) => fit(one, type));
        const takenOut = live !== null;
        const empty = element('div', 'council-empty');
        empty.dataset.ink = type;
        empty.append(element('span', 'council-empty-type', chairWord(type)));
        empty.append(element('span', 'council-empty-words', emptyChairWords(type, takesAny, takenOut)));
        button.append(empty);
        button.setAttribute('aria-label', `Chair ${index + 1}, ${chairWord(type)}, empty`);
        cell.dataset.state = takenOut ? 'emptied' : 'empty';
      }
      if (ring !== null) {
        // The frame lights, as the board's CH draws it; the word is the title,
        // so no tag sits on a frame where the row below has its labels.
        cell.classList.add('is-fit');
        cell.dataset.ring = ring;
        button.title = ring === 'swap' ? `${ORDERS_WORDS.swap}: ${orderDef(held!).name}` : ORDERS_WORDS.seatHere;
      } else if (held !== null) {
        cell.classList.add('is-faded');
        if (refused !== null) button.title = refused;
      }
      if (over?.index === index && held !== null) cell.classList.add('is-over');
      button.addEventListener('click', (event) => drop(index, event));
      frame.append(button);
      cell.append(frame);
      table.append(cell);
    });
    return table;
  }

  // --- the hand: the band, the draft pile and the fan --------------------------

  /** The Orders not in a chair, sorted by type, each type in the collection's own order. */
  function handOf(sc: PlayerStatecraft, arrangement: StagedSlots): OrderId[] {
    const seated = new Set<OrderId>();
    for (const entry of arrangement) if (entry !== null) seated.add(entry.card);
    const hand = sc.orders.filter((id) => !seated.has(id));
    return hand
      .map((id, at) => ({ id, at }))
      .sort((a, b) => typeRank(a.id) - typeRank(b.id) || a.at - b.at)
      .map((entry) => entry.id);
  }

  /** The band: the hand's label and the hint at the left, the tools at the right. */
  function drawBand(hand: readonly OrderId[]): HTMLElement {
    const band = element('div', 'council-band');
    const label = element('div', 'orders-hand-label');
    label.append(element('span', 'orders-hand-title', ORDERS_WORDS.hand));
    label.append(element('span', 'orders-hand-count', ORDERS_WORDS.handCards(hand.length)));
    const opens = element('span', 'orders-hand-key');
    opens.append(keyMark('H'), ` ${ORDERS_WORDS.handOpens}`);
    label.append(opens);
    if (hintNode !== null) label.append(hintNode);
    band.append(label, tools);
    return band;
  }

  /** The draft pile: the next draft, the deck, and the door to the binder. */
  function drawPile(state: GameState, seat: number, sc: PlayerStatecraft): HTMLElement {
    const pile = element('div', 'council-pile');
    const player = playerById(state, seat)!;
    const door = element('button', 'council-pile-door') as HTMLButtonElement;
    door.type = 'button';
    door.title = ORDERS_WORDS.pileTitle;
    door.dataset.nav = 'pile';
    door.append(orderBackNode());
    door.append(element('span', 'council-pile-name', ORDERS_WORDS.pile));
    door.addEventListener('click', () => toggleLayer('binder'));
    pile.append(door);
    if (sc.pendingGovernment !== undefined && options.adopt !== undefined) {
      const adopt = element('button', 'orders-adopt', ORDERS_WORDS.chooseGovernment) as HTMLButtonElement;
      adopt.type = 'button';
      adopt.title = ORDERS_WORDS.chooseGovernmentTitle;
      adopt.addEventListener('click', () => options.adopt?.());
      pile.append(adopt);
    } else if (draftExhausted(state, player)) {
      const line = element('span', 'council-pile-line', ORDERS_WORDS.exhausted);
      line.title = ORDERS_WORDS.exhaustedTitle;
      pile.append(line);
    } else {
      const glance = draftGlance(state, player);
      const line = element('span', 'council-pile-line');
      line.append(`${ORDERS_WORDS.nextDraft} ${glance.turns !== null ? `${glance.turns}t` : ''}`);
      const bar = element('span', 'orders-bar');
      const fill = element('i');
      fill.style.width = `${Math.round(glance.fraction * 100)}%`;
      bar.append(fill);
      line.append(bar);
      // Rounded at the eye (batch X): the pool is exact, the meter reads whole.
      const banked = Math.max(0, roundYield(player.culturePool));
      line.title = `${ORDERS_WORDS.nextDraft}: ${banked}/${glance.cost} culture`;
      pile.append(line);
    }
    const deck = element('span', 'council-pile-line orders-hand-deck', `${ORDERS_WORDS.deckCount(sc.orders.length)} `);
    deck.append(keyMark('D'));
    pile.append(deck);
    return pile;
  }

  /** The fan of the hand's cards, set down at the foot and cut by the window's edge. */
  function drawHand(sc: PlayerStatecraft, hand: readonly OrderId[]): HTMLElement {
    const fan = element('section', 'orders-hand council-fan');
    fan.setAttribute('aria-label', ORDERS_WORDS.hand);
    const cards = element('div', 'council-fan-cards');
    if (sc.orders.length === 0 || hand.length === 0) {
      cards.append(element('p', 'orders-hand-empty', sc.orders.length === 0 ? ORDERS_WORDS.noOrders : ORDERS_WORDS.handEmpty));
      fan.append(cards);
      return fan;
    }
    hand.forEach((id) => {
      const button = element('button', 'orders-handcard') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.nav = `hand:${id}`;
      button.dataset.card = id;
      const face = element('div');
      dressOrderFace(face, id, { where: 'hand', inControl: true, plate: null });
      face.dataset.form = 'fan';
      button.append(face);
      button.dataset.preview = 'hand';
      button.setAttribute('aria-label', `${orderDef(id).name}, in your hand`);
      button.title = orderDef(id).name;
      if (held === id) button.classList.add(ghostArmed ? 'is-carried' : 'is-held');
      if (markCard === id) button.classList.add('is-marked');
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        take(id, event);
      });
      cards.append(button);
    });
    fan.append(cards);
    return fan;
  }

  /** Sets the fan's cards over its width, once the fan is on the page. */
  function layFan(fan: HTMLElement): void {
    const buttons = [...fan.querySelectorAll<HTMLElement>('.orders-handcard')];
    const placement = fanPlacement(buttons.length, fan.clientWidth);
    buttons.forEach((button, index) => {
      const at = placement.cards[index]!;
      button.style.left = `${at.left}px`;
      button.style.top = `${at.drop}px`;
      button.style.rotate = `${at.rotate}deg`;
      button.style.zIndex = String(index + 1);
    });
  }

  // --- the draw -------------------------------------------------------------

  /** The shared reading of the real board for this draw's plates. Its lifetime is one draw. */
  let sheet: CardImpactSheet | null = null;
  /**
   * **What the whole council pays on the real board**, exact (stage 2): the
   * totals line, and the figure every plate on this draw is a share of. Taken
   * once a draw, with the draw's sheet, and kept for the chips until the next
   * draw, because the chips measure from it when nothing is staged.
   */
  let council: CouncilFigures | null = null;
  /** The real board's revision `council` was read at, so a chip never measures from a board that has moved. */
  let councilRevision = -1;

  function draw(): void {
    sheet = cardImpactSheet(options.getState(), options.getPlayerId());
    try {
      council = foldImpactVoices(explainCouncil(sheet.state, sheet.playerId, sheet));
      councilRevision = sheet.revision;
      paint();
    } finally {
      sheet = null;
    }
  }

  function paint(): void {
    stopCounting();
    hidePreview();
    previewStates = new Map();
    settling = [];
    const binderGrid = body.querySelector<HTMLElement>('.orders-binder-grid');
    if (binderGrid !== null) binderScroll = binderGrid.scrollTop;
    const active = document.activeElement;
    const activeKey = active instanceof HTMLElement && body.contains(active) ? (active.dataset.nav ?? null) : null;
    if (focusKey === null) focusKey = activeKey;
    body.replaceChildren();
    const ctx = context();
    if (ctx === null) return;
    const { state, seat, sc, arrangement } = ctx;
    // A card in hand that is spoken for, staged or seated by another route, is
    // a card nobody is holding.
    if (held !== null && arrangement.some((entry) => entry?.card === held)) held = null;
    if (held === null) over = null;

    const chairs = slotTypesOf(sc).length;
    const hand = handOf(sc, arrangement);
    const size = { width: sheetNode?.clientWidth ?? window.innerWidth, height: sheetNode?.clientHeight ?? window.innerHeight };
    screenLayout = councilLayout(size, chairs);
    drawnSize = `${window.innerWidth}x${window.innerHeight}`;
    const form = COUNCIL_FORMS[screenLayout.form];
    sheetNode?.setAttribute('data-chairs', String(chairs));
    sheetNode?.setAttribute('data-form', screenLayout.form);
    sheetNode?.toggleAttribute('data-cramped', screenLayout.cramped);
    sheetNode?.style.setProperty('--council-card-w', `${form.width}px`);
    sheetNode?.style.setProperty('--council-card-h', `${form.height}px`);
    sheetNode?.style.setProperty('--council-inset', `${form.inset}px`);
    sheetNode?.style.setProperty('--council-cols', String(screenLayout.cols));
    sheetNode?.style.setProperty('--council-gov-w', `${screenLayout.government}px`);
    // The heights are the layout's (the user's comments on stage 3): the hand
    // keeps at most `fanMax`, and what that leaves goes round the council.
    sheetNode?.style.setProperty('--council-head-h', `${COUNCIL_FRAME.head}px`);
    sheetNode?.style.setProperty('--council-fan-h', `${screenLayout.fanView}px`);
    sheetNode?.style.setProperty('--council-spare-top', `${Math.floor(screenLayout.spare / 2)}px`);
    // A few chairs sit in a cluster in the middle of the room right of the
    // government (`COUNCIL_FRAME.cluster`).
    sheetNode?.toggleAttribute('data-cluster', screenLayout.cluster !== null);
    sheetNode?.style.setProperty('--council-cluster-w', `${screenLayout.cluster?.width ?? 0}px`);
    sheetNode?.toggleAttribute('data-holding', held !== null);

    if (council !== null) paintHead(council);
    paintTools(state, seat, sc, arrangement);
    paintHint();

    const cloth = element('div', 'orders-cloth');
    const main = element('div', 'council-main');
    const ties = chairTies(state, seat, sc, arrangement);
    main.append(drawRegister(state, seat, sc, sheet ?? undefined, ties));
    main.append(drawTable(state, seat, sc, arrangement, sheet ?? undefined, ties));
    cloth.append(main);
    cloth.append(drawBand(hand));
    const foot = element('div', 'council-foot');
    foot.append(drawPile(state, seat, sc), drawHand(sc, hand));
    cloth.append(foot);
    sheetNode?.setAttribute('data-layer', layer ?? 'none');
    body.append(cloth);
    // The layers fill the window under the head, so they sit beside the cloth
    // rather than inside it.
    if (layer === 'hand') {
      body.append(
        handViewNode(hand, held, (id, event) => {
          layer = null;
          take(id, event);
        }),
      );
    } else if (layer === 'binder') {
      body.append(drawBinder(state, seat, sc, arrangement, sheet ?? undefined));
    }

    // The ceremony belongs to the signature: spent by the draw that played it.
    justConfirmed = [];
    countTotal = false;

    // Fit every card's words now that the faces are on the page, and again
    // once the card fonts have loaded.
    const faces = [...body.querySelectorAll<HTMLElement>('.orders-table .order-face, .council-gov-card .order-face')];
    for (const face of faces) fitOrderFace(face);
    // The government's banner fits its name the same way.
    const banners = [...body.querySelectorAll<HTMLElement>('.council-gov-card .gov-banner')];
    for (const banner of banners) fitGovernmentBanner(banner);
    void document.fonts?.ready.then(() => {
      for (const face of faces) if (face.isConnected) fitOrderFace(face);
      for (const banner of banners) if (banner.isConnected) fitGovernmentBanner(banner);
    });
    const fan = body.querySelector<HTMLElement>('.council-fan-cards');
    if (fan !== null) layFan(fan);
    const view = body.querySelector<HTMLElement>('.orders-handview');
    if (view !== null) layHandView(view);
    const grid = body.querySelector<HTMLElement>('.orders-binder-grid');
    if (grid !== null) {
      fitGrid(grid);
      grid.scrollTop = binderScroll;
    }
    paintGhost();
    playMoments();

    if (focusKey !== null) {
      body.querySelector<HTMLElement>(`[data-nav="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
    } else if (layer !== null && !body.contains(document.activeElement)) {
      body.querySelector<HTMLElement>('.orders-veil [data-nav]')?.focus({ preventScroll: true });
    }
    focusKey = null;
    markCard = null;
  }

  // --- the change a held card would make (frame CH) ---------------------------

  /**
   * The held card is over chair `index` (or over no chair). Measured once when
   * the chair changes: the totals as staged, against the totals with the card
   * dropped there (`councilChange`). A chair the card may not go in shows no
   * change.
   */
  function noteOver(index: number | null): void {
    if (held === null) return;
    if ((over?.index ?? null) === index) return;
    for (const cell of body.querySelectorAll('.orders-chair.is-over')) cell.classList.remove('is-over');
    if (index === null) {
      over = null;
      paintChips();
      return;
    }
    const ctx = context();
    if (ctx === null) return;
    const target = dropTarget(ctx.state, ctx.seat, ctx.arrangement, held, index);
    const malice = maliceAt(playerById(ctx.state, ctx.seat)!, index);
    // Measured against the chairs as they stood before the card was picked
    // up, so a card moved from one chair to another shows what the move
    // changes, and a card put back in its own chair shows nothing.
    const base = beforeLift ?? ctx.arrangement;
    // When the chairs before the drop are the law, the totals line's own
    // figures are the starting point, and only the board after is read.
    const live = changedOffices(ctx.sc.slots, base) === 0 && councilRevision === ctx.state.revision ? council : null;
    const change =
      typeof target === 'string' || malice !== null
        ? null
        : councilChange(ctx.state, ctx.seat, base, target, live ?? undefined);
    over = { index, change };
    if (change !== null) body.querySelector(`[data-chair="${index}"]`)?.classList.add('is-over');
    paintChips();
  }

  function onChairOver(event: Event): void {
    if (held === null) return;
    const cell = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-chair]') : null;
    if (cell === null || !body.contains(cell)) return;
    noteOver(Number(cell.dataset.chair));
  }

  function onChairOut(event: Event): void {
    if (held === null || over === null) return;
    const next = (event as PointerEvent | FocusEvent).relatedTarget;
    const cell = next instanceof Element ? next.closest<HTMLElement>('[data-chair]') : null;
    if (cell !== null && Number(cell.dataset.chair) === over.index) return;
    noteOver(cell === null ? null : Number(cell.dataset.chair));
  }

  /**
   * **A click away from the chairs** puts the held card down there: a card
   * held out of a chair is taken off it, and a card from the hand goes back.
   * A click on a control (a chair, a hand card, a button, the layers) is that
   * control's, so it is left alone.
   */
  function onClothClick(event: MouseEvent): void {
    if (held === null || layer !== null) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target === null || target.closest('button, [data-chair], .orders-veil, input, a, [data-nav]') !== null) return;
    if (beforeLift !== null) takeOff();
    else putBack();
    draw();
  }

  body.addEventListener('pointerover', onChairOver);
  body.addEventListener('pointerout', onChairOut);
  body.addEventListener('focusin', onChairOver);
  body.addEventListener('focusout', onChairOut);
  body.addEventListener('click', onClothClick);

  // --- drag and drop, beside click then click (stage 2, Part B) ----------------

  /**
   * **A press on a card that may become a drag** (the user, 2026-11-18: "could
   * we support both?"). A press on a card in the fan or in a chair waits for
   * the pointer to move `DRAG_THRESHOLD` pixels; until then it is a click, and
   * the click does what it always did. Once it moves, the card is picked up by
   * the very functions a click uses (`holdFromHand`, `lift`) and follows the
   * pointer; the release drops it by the very functions a second click uses
   * (`drop`, `takeOff`, `putBack`). So a drag stages exactly what the same
   * clicks would.
   */
  let press: {
    pointerId: number;
    x: number;
    y: number;
    from: { kind: 'hand'; id: OrderId } | { kind: 'chair'; index: number };
  } | null = null;
  /** True once a press has moved far enough to be a drag. */
  let dragging = false;
  /** The click the browser sends after a drag's release belongs to the drag, so the next click is ignored. */
  let swallowClick = false;
  /** The pointer of a drag that Escape or a seal cancelled, so its release does nothing. */
  let cancelledPointer: number | null = null;

  /** How far the pointer must move, in pixels, before a press is a drag. */
  const DRAG_THRESHOLD = 6;

  /** The chair under a point, or null: asked of the page, because a touch keeps sending its events to where it began. */
  function chairUnder(x: number, y: number): number | null {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-chair]') ?? null;
    if (cell === null || !body.contains(cell)) return null;
    return Number(cell.dataset.chair);
  }

  /** Holds a card from the hand so it follows the pointer: a drag's pick-up, as `take` holds one on a click. */
  function holdFromHand(id: OrderId, at: { x: number; y: number }): void {
    held = id;
    beforeLift = null;
    ghostArmed = true;
    pointer = at;
    focusKey = `hand:${id}`;
    draw();
  }

  function onPressStart(event: PointerEvent): void {
    swallowClick = false;
    cancelledPointer = null;
    if (event.button !== 0 || layer !== null || held !== null) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target === null) return;
    const handCard = target.closest<HTMLElement>('.council-fan .orders-handcard');
    const cell = target.closest<HTMLElement>('[data-chair]');
    let from: NonNullable<typeof press>['from'] | null = null;
    if (handCard?.dataset.card !== undefined) from = { kind: 'hand', id: handCard.dataset.card as OrderId };
    else if (cell !== null && (cell.dataset.state === 'seated' || cell.dataset.state === 'staged')) {
      from = { kind: 'chair', index: Number(cell.dataset.chair) };
    }
    if (from === null) return;
    // A touch sends every event to where it began until it is let go; let it
    // go, so a chair under the finger hears the finger.
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, from };
  }

  /** Starts a drag: picks the card up as a click would. False when the card refuses (a seal). */
  function beginDrag(from: NonNullable<typeof press>['from'], at: { x: number; y: number }): boolean {
    if (from.kind === 'hand') {
      holdFromHand(from.id, at);
      return true;
    }
    lift(from.index, null);
    if (held === null) return false;
    ghostArmed = true;
    pointer = at;
    paintGhost();
    return true;
  }

  function onPressMove(event: PointerEvent): void {
    if (press === null || event.pointerId !== press.pointerId) return;
    const at = { x: event.clientX, y: event.clientY };
    if (!dragging) {
      if (Math.hypot(at.x - press.x, at.y - press.y) < DRAG_THRESHOLD) return;
      dragging = true;
      if (!beginDrag(press.from, at)) {
        // A sealed card refused, with its reason; the release that follows
        // does nothing, as after Escape.
        cancelledPointer = press.pointerId;
        press = null;
        dragging = false;
        return;
      }
    }
    // No text is selected and nothing scrolls while a card is carried.
    event.preventDefault();
    pointer = at;
    if (ghost !== null) placeGhost(ghost, layerHost, at.x, at.y);
    noteOver(chairUnder(at.x, at.y));
  }

  function onPressEnd(event: PointerEvent): void {
    // The release of a drag Escape cancelled: its click is the drag's too.
    if (press === null && cancelledPointer === event.pointerId) {
      cancelledPointer = null;
      swallowNextClick();
      return;
    }
    if (press === null || event.pointerId !== press.pointerId) return;
    const wasDragging = dragging;
    press = null;
    dragging = false;
    // A press that never moved is a click, and the click handlers do the rest.
    if (!wasDragging) return;
    swallowNextClick();
    if (held === null) return;
    // The browser took the pointer away (a touch turned into a gesture): the
    // card goes back where it came from, as Escape sends it.
    if (event.type === 'pointercancel') {
      putBack();
      draw();
      return;
    }
    const index = chairUnder(event.clientX, event.clientY);
    if (index !== null) {
      drop(index, null);
      // A chair that refused leaves the card in hand; a drag lets go of it,
      // so it goes back where it came from, the refusal still said.
      if (held !== null) {
        putBack();
        draw();
      }
      return;
    }
    // Let go away from every chair: a seated card leaves its chair, and a card
    // from the hand goes back to it.
    if (beforeLift !== null) takeOff();
    else putBack();
    draw();
  }

  /**
   * Marks the click a release sends as the drag's. The browser sends it in the
   * same turn as the release, so the mark is gone by the next task: a touch
   * that sends no click leaves nothing behind for a later click to trip on.
   */
  function swallowNextClick(): void {
    swallowClick = true;
    setTimeout(() => {
      swallowClick = false;
    }, 0);
  }

  /** Ignores the one click a drag's release sends, wherever it lands. */
  function onDragClick(event: MouseEvent): void {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  /** Escape during a drag: the card goes back, and the press is over. */
  function cancelDrag(): void {
    if (press === null && !dragging) return;
    cancelledPointer = press?.pointerId ?? null;
    press = null;
    dragging = false;
  }

  body.addEventListener('pointerdown', onPressStart);
  window.addEventListener('pointermove', onPressMove, { passive: false });
  window.addEventListener('pointerup', onPressEnd);
  window.addEventListener('pointercancel', onPressEnd);
  layerHost.addEventListener('click', onDragClick, true);

  // --- the binder (D) --------------------------------------------------------

  /** Every Order the seat holds, as the binder shows it: its chair, and its reading when it pays. */
  function drawBinder(
    state: GameState,
    seat: number,
    sc: PlayerStatecraft,
    arrangement: StagedSlots,
    impact: CardImpactSheet | undefined,
  ): HTMLElement {
    const sorted = sc.orders
      .map((id, at) => ({ id, at }))
      .sort((a, b) => typeRank(a.id) - typeRank(b.id) || a.at - b.at)
      .map((entry) => entry.id);
    const entries: BinderEntry[] = sorted.map((id) => {
      const index = arrangement.findIndex((entry) => entry?.card === id);
      const entry = index >= 0 ? arrangement[index]! : null;
      const tech = charterTechOf(id);
      return {
        id,
        chair: index >= 0 ? index + 1 : null,
        staged: entry?.staged === true,
        live: entry !== null && !entry.staged ? seatedOrderLive(state, seat, id, impact, council ?? undefined) : null,
        opened: tech === null ? null : techDef(tech).name,
      };
    });
    const decks = playerById(state, seat)?.decks ?? [];
    return binderNode(
      entries,
      decks,
      binderFilter,
      (entry, event) => {
        layer = null;
        if (entry.chair === null) take(entry.id, event);
        else drop(entry.chair - 1, event);
      },
      (grid) => {
        if (grid.isConnected) fitGrid(grid);
      },
    );
  }

  /** Fits the binder's faces now, and again once the card fonts have loaded. */
  function fitGrid(grid: HTMLElement): void {
    const faces = [...grid.querySelectorAll<HTMLElement>('.order-face')];
    for (const face of faces) fitOrderFace(face);
    void document.fonts?.ready.then(() => {
      for (const face of faces) if (face.isConnected) fitOrderFace(face);
    });
  }

  // --- the motion -------------------------------------------------------------

  /** The card that follows the pointer while one is held (moment 2): the full face, as the board's CH draws it. */
  function paintGhost(): void {
    if (held === null || !ghostArmed || pointer === null || layer !== null) {
      ghost?.remove();
      ghost = null;
      return;
    }
    if (ghost === null || ghost.dataset.card !== held) {
      ghost?.remove();
      ghost = element('div', 'orders-ghost');
      ghost.dataset.card = held;
      ghost.setAttribute('aria-hidden', 'true');
      const face = element('div');
      // No plate: the figure is Confirm's. The totals line shows the change.
      dressOrderFace(face, held, { where: 'hand', inControl: true, plate: null });
      ghost.append(face);
      layerHost.append(ghost);
      fitOrderFace(face);
    }
    placeGhost(ghost, layerHost, pointer.x, pointer.y);
  }

  /** The moments a redraw plays: a landing, a card's slide to the hand, and Confirm's settling. */
  function playMoments(): void {
    if (landing !== null) {
      const face = body.querySelector<HTMLElement>(`[data-chair="${landing.index}"] .order-face`);
      if (face !== null) animateLanding(face, landing.from);
      landing = null;
    }
    if (slide !== null) {
      const target = body.querySelector<HTMLElement>(`[data-nav="hand:${slide.card}"]`);
      if (target !== null) {
        const copy = element('div');
        dressOrderFace(copy, slide.card, { where: 'hand', inControl: true, plate: null });
        copy.dataset.form = 'fan';
        flyToHand(layerHost, copy, slide.from, target);
      }
      slide = null;
    }
    for (const face of settling) settleConfirmed(face);
    settling = [];
  }

  function onPointerMove(event: PointerEvent): void {
    pointer = { x: event.clientX, y: event.clientY };
    if (ghost !== null) placeGhost(ghost, layerHost, event.clientX, event.clientY);
  }

  function onPointerLeave(): void {
    ghost?.remove();
    ghost = null;
  }

  /** Takes the lifted face away, and stops a lift that is waiting. */
  function hidePreview(): void {
    if (previewTimer !== null) clearTimeout(previewTimer);
    previewTimer = null;
    preview?.remove();
    preview = null;
    previewSource?.querySelector('.order-face')?.removeAttribute('data-lifted');
    previewSource = null;
  }

  /**
   * **A card lifts to its full face** on hover or keyboard focus. A hand card
   * at once (moment 1); a chair card in a smaller form, a chair card whose
   * text is cut, the government and a tucked Doctrine after the 300 ms pause.
   * A chair card that is already the full face lifts itself, so its text
   * scrolls inside it.
   */
  function onPreviewEnter(event: Event): void {
    const source = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-preview]') : null;
    if (source === null || source === previewSource) return;
    if (held !== null && source.dataset.preview !== 'hand') return;
    // A card being carried shows no other card's face as it passes over them.
    if (dragging) return;
    hidePreview();
    const card = source.dataset.card;
    if (card === undefined) return;
    previewSource = source;
    const kind = source.dataset.preview;
    if (kind === 'hand') {
      liftNow(source, card, 'hand');
      return;
    }
    if (kind === 'register') {
      previewTimer = setTimeout(() => {
        previewTimer = null;
        if (previewSource === source) liftNow(source, card, 'register');
      }, ORDERS_MOTION.previewDelayMs);
      return;
    }
    const face = source.matches('.order-face') ? source : source.querySelector<HTMLElement>('.order-face');
    if (face === null) return;
    const compact = face.dataset.compact !== undefined;
    if (!compact && !face.hasAttribute('data-overflow')) return;
    previewTimer = setTimeout(() => {
      previewTimer = null;
      if (previewSource !== source) return;
      if (kind === 'chair' && !compact) face.setAttribute('data-lifted', '');
      else liftNow(source, card, 'chair');
    }, ORDERS_MOTION.previewDelayMs);
  }

  function onPreviewLeave(event: Event): void {
    if (previewSource === null) return;
    const next = (event as PointerEvent | FocusEvent).relatedTarget;
    if (next instanceof Node && previewSource.contains(next)) return;
    hidePreview();
  }

  /**
   * Shows the full face of `card` beside its source. The government lifts its
   * banner, larger than the column holds it.
   */
  function liftNow(source: HTMLElement, card: string, kind: 'hand' | 'chair' | 'register'): void {
    const state: OrderFaceState = previewStates.get(card) ?? { where: 'hand', plate: null };
    const place = kind === 'hand' ? 'above' : 'beside';
    if (isGovernmentId(card)) {
      const sc = playerById(options.getState(), options.getPlayerId())?.statecraft;
      const { banner } = governmentBannerNode(card, {
        form: 'seat',
        ...(sc === undefined ? {} : { layout: slotTypesOf(sc) }),
        plate: state.plate ?? null,
        inControl: true,
      });
      banner.classList.add('is-lifted');
      preview = showPreview(layerHost, source.getBoundingClientRect(), banner, place);
      fitGovernmentBanner(banner);
      return;
    }
    const face = orderFaceNode(card as OrderId, { ...state, inControl: true });
    face.setAttribute('data-lifted', '');
    preview = showPreview(layerHost, source.getBoundingClientRect(), face, place);
    fitOrderFace(face);
  }

  /** The end of a visit: no layer, no lifted card, nothing following the pointer. */
  function endVisit(): void {
    hidePreview();
    ghost?.remove();
    ghost = null;
    layer = null;
    landing = null;
    slide = null;
    over = null;
    binderFilter = allOrders();
  }

  /**
   * The window changed size: the card form is the window's (`councilLayout`),
   * so the screen is drawn again while it is up.
   */
  function onWindowResize(): void {
    if (overlay.hidden) return;
    const size = `${window.innerWidth}x${window.innerHeight}`;
    if (size === drawnSize) return;
    draw();
  }
  window.addEventListener('resize', onWindowResize);

  layerHost.addEventListener('pointermove', onPointerMove);
  layerHost.addEventListener('pointerleave', onPointerLeave);
  layerHost.addEventListener('pointerover', onPreviewEnter);
  layerHost.addEventListener('pointerout', onPreviewLeave);
  layerHost.addEventListener('focusin', onPreviewEnter);
  layerHost.addEventListener('focusout', onPreviewLeave);

  // --- the keyboard ---------------------------------------------------------

  /** Moves the keyboard to the nearest card or chair in the arrow's direction, inside the open layer if there is one. */
  function moveFocus(key: string): boolean {
    const scope = body.querySelector<HTMLElement>('.orders-veil') ?? body;
    const items = [...scope.querySelectorAll<HTMLElement>('[data-nav]')];
    if (items.length === 0) return false;
    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const from = current !== null && items.includes(current) ? current : null;
    if (from === null) {
      items[0]!.focus();
      return true;
    }
    const a = from.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const item of items) {
      if (item === from) continue;
      const b = item.getBoundingClientRect();
      const dx = b.left + b.width / 2 - ax;
      const dy = b.top + b.height / 2 - ay;
      const along = key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy;
      const across = key === 'ArrowRight' || key === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 1) continue;
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    best?.focus();
    return true;
  }

  /** Opens a layer, or closes it when it is the one open. */
  function toggleLayer(which: 'hand' | 'binder'): void {
    layer = layer === which ? null : which;
    if (layer === 'binder') binderScroll = 0;
    focusKey = null;
    draw();
  }

  function onKey(event: KeyboardEvent): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    // Esc closes the open layer first, even from the binder's search box.
    if (event.key === 'Escape' && layer !== null) {
      event.preventDefault();
      event.stopPropagation();
      layer = null;
      draw();
      return true;
    }
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return false;
    if (event.key === 'h' || event.key === 'H' || event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      event.stopPropagation();
      toggleLayer(event.key.toLowerCase() === 'h' ? 'hand' : 'binder');
      return true;
    }
    // I goes to In play (stage 3), as the link in the head does. Leaving signs
    // the arrangement, as every door out of this screen does.
    if ((event.key === 'i' || event.key === 'I') && options.inPlay !== undefined && held === null) {
      event.preventDefault();
      event.stopPropagation();
      options.inPlay.open();
      return true;
    }
    if (event.key === 'Escape' && held !== null) {
      event.preventDefault();
      event.stopPropagation();
      // A drag in progress ends here too: the card goes back, and the release
      // that follows does nothing.
      cancelDrag();
      putBack();
      draw();
      return true;
    }
    // Delete or Backspace takes a card off its chair: the held one, or the one
    // in the chair the keyboard is on.
    if ((event.key === 'Delete' || event.key === 'Backspace') && layer === null) {
      if (!takeOffByKey()) return false;
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    // The keys the sheet claims stop here, so the board behind it never moves.
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      event.stopPropagation();
      return moveFocus(event.key);
    }
    if (/^[1-9]$/.test(event.key) && layer === null) {
      const index = Number(event.key) - 1;
      const chair = body.querySelector<HTMLElement>(`[data-nav="chair:${index}"]`);
      if (chair === null) return false;
      event.preventDefault();
      event.stopPropagation();
      if (held !== null) drop(index);
      else chair.focus();
      return true;
    }
    return false;
  }

  // --- the frame ------------------------------------------------------------

  /**
   * The frame (`modalShell.ts`): `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`. An opening
   * throws away whatever the last visit proposed, and a closing signs it: the
   * user's rule that leaving locks the arrangement in, at every door.
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    onShow: () => {
      discardStaging();
      clearRefusal();
    },
    draw,
    onKey,
    onClose: () => {
      stopCounting();
      clearRefusal();
      commitStaging();
      discardStaging();
      endVisit();
    },
    /**
     * The game is going away (the landing screen). The arrangement is thrown
     * away, not signed: it is a proposal about a government that is about to
     * stop existing.
     */
    onDispose: () => {
      stopCounting();
      clearRefusal();
      discardStaging();
      endVisit();
      window.removeEventListener('resize', onWindowResize);
      layerHost.removeEventListener('pointermove', onPointerMove);
      layerHost.removeEventListener('pointerleave', onPointerLeave);
      layerHost.removeEventListener('pointerover', onPreviewEnter);
      layerHost.removeEventListener('pointerout', onPreviewLeave);
      layerHost.removeEventListener('focusin', onPreviewEnter);
      layerHost.removeEventListener('focusout', onPreviewLeave);
      body.removeEventListener('pointerover', onChairOver);
      body.removeEventListener('pointerout', onChairOut);
      body.removeEventListener('focusin', onChairOver);
      body.removeEventListener('focusout', onChairOut);
      body.removeEventListener('click', onClothClick);
      body.removeEventListener('pointerdown', onPressStart);
      window.removeEventListener('pointermove', onPressMove);
      window.removeEventListener('pointerup', onPressEnd);
      window.removeEventListener('pointercancel', onPressEnd);
      layerHost.removeEventListener('click', onDragClick, true);
      tools.remove();
      totalsNode.remove();
      inPlayLink.remove();
      // The hint lives in the band while the screen is up; it goes back to the
      // head it came from, so the next screen built on this overlay finds it.
      if (head !== null && hintNode !== null) head.insertBefore(hintNode, closeButton);
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    openAt(card: OrderId): void {
      markCard = card;
      shell.open();
      if (!shell.isOpen) return;
      const face = body.querySelector<HTMLElement>(`[data-card="${card}"], [data-nav="hand:${card}"]`);
      const seated = staged?.findIndex((entry) => entry?.card === card) ?? -1;
      const target = seated >= 0 ? body.querySelector<HTMLElement>(`[data-nav="chair:${seated}"]`) : face;
      target?.focus({ preventScroll: true });
    },
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
