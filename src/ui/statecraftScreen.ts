/**
 * **The orders screen** (Statecraft): your government, your Doctrines, your
 * chairs and the Orders in them, and your hand, laid out as a card table.
 *
 * Interface batch SS10, part 2. The user approved the final board on
 * 2026-11-17 (*"you're free to proceed with the orders page"*,
 * `docs/plans/ui-critique-2026-10-16.md`). The board of record is
 * `docs/plans/mockups/scholars-study/orders-screen-final-board.html`, and its
 * last section is the build spec this file follows. The user's intent, from
 * rounds two to five: the Orders are a deck, the unseated ones are a hand,
 * seating is playing a card, a played card's effect is easy to see, the
 * Doctrines are prominent, and the look is an arcane Renaissance card game.
 *
 * The layout, top to bottom
 * -------------------------
 *   - **The head** (in `index.html`, with the tools added here): the title, a
 *     one-line hint, what your cards pay (`foldDeck`, the Ledger's deck
 *     figure), Revert, Confirm and the close button. A refusal prints the
 *     reducer's own sentence in place of the hint for four seconds.
 *   - **The cloth**: the whole window, dark, with a gilt rule just inside its
 *     edge (part C1: the user asked for the screen to be full screen like
 *     the star chart). The head sits on it.
 *   - **The gilt register**: the government card (its law, its tier and the
 *     next draft's progress), then each Doctrine laid wide with its name, its
 *     effect and its live line (`orderFace.ts`, `registerFaceNode`).
 *   - **The table**: one card or one empty chair for each chair, in the
 *     council's own order, six to a row. Each card carries the chair's tab on
 *     its foot (`chairTabNode`). The card form is the window's
 *     (`ordersLayout`): the large face for one row, the full face, then the
 *     two compact forms.
 *   - **The hand**: the Orders not in a chair, in the height the table
 *     leaves: named cards side by side, an indexed rank with the names down
 *     the cards' edges, or a rail of card tops.
 *
 * Every card is the emblem face (`orderFace.ts`). What a card says it pays is
 * `orderLive.ts`, which picks the right existing reading for the card's kind.
 * The two layers over the table, H for the whole hand and D for the binder,
 * are `ordersLayers.ts`; the board's six moments are `ordersMotion.ts`.
 *
 * Seating is click then click
 * ---------------------------
 * Click a card in the hand to pick it up; the chairs it fits are ringed
 * ("seat here", or "swap" for an occupied chair) and the rest fade. Click a
 * ringed chair to play the card there. Click a card in a chair to pick it up
 * out of the chair. Escape puts a held card back where it came from. The
 * keyboard does the same: the arrows move between cards and chairs, Enter
 * picks up or puts down, and the number keys 1 to 9 play the held card into
 * that chair.
 *
 * Nothing is sent until Confirm
 * -----------------------------
 * The staging is unchanged from the old screen (`statecraftStaging.ts`): the
 * user's rule is "slots should only lock after leaving the menu". Placing and
 * removing edit a local arrangement; the arrangement becomes real on Confirm
 * or on leaving the screen by any door, and Revert throws it away. A swap is a
 * removal and a placement in the same chair, both staged. The arrangement is
 * per seat and is thrown away, never signed, when the seat changes, so a
 * hot-seat handover cannot sign the last player's law.
 *
 * Every refusal is the reducer's own sentence: `placeError` and `removeError`
 * are `slotOrderError` and `unslotOrderError` asked of the staged
 * arrangement, and they decide the rings, the fades, the titles and Confirm.
 *
 * The reveal is Confirm's (`docs/history/fewer-things.md` §1, ruled
 * 2026-09-06): a card played this visit shows no figure until Confirm. On
 * Confirm the batch goes through, and the redraw counts up the figures of the
 * cards the signature made law, and the head's total.
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
  stripRefs,
  draftExhausted,
  maliceAt,
  maliceChairRefusal,
  sealRemaining,
  slotTypesOf,
} from '../sim/statecraft';
import { maliceDef } from '../sim/maliceData';
import {
  type CardEffect,
  type ChairType,
  type CountKind,
  type OrderId,
  CHAIR_TYPES,
  doctrineDef,
  isCharter,
  isDoctrineId,
  isOrderId,
  orderDef,
  orderType,
} from '../sim/statecraftData';
import { type StampFigure, STAMP_TIMING, stampCountAt, stampFigures } from './cardStamp';
import { chairWord } from './chairs';
import { element } from './dom';
import { draftGlance } from './empireDrawer';
import { foldDeck, deckCaption } from './ledgerScreen';
import { createModalShell } from './modalShell';
import { wantsMotion } from './motion';
import {
  type CardLive,
  LIVE_WORDS,
  doctrineLive,
  seatedOrderLive,
  stagedLive,
  tabletOfFigure,
} from './orderLive';
import {
  type OrderFaceState,
  chairTabNode,
  dressOrderFace,
  emptyChairFace,
  fitOrderFace,
  orderFaceNode,
  registerFaceNode,
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
  validate,
} from './statecraftStaging';
import { setYieldText, yieldMarkNode } from './yieldMark';
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
  if (effect.kind === 'slotPosition') return true;
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
  hint: 'play a card from your hand to a chair',
  held: (name: string, fits: string) => `${name} in hand: it fits ${fits} chair. Esc puts it back.`,
  payLabel: 'Your cards pay',
  payNone: 'nothing yet',
  revert: 'Revert',
  confirm: 'Confirm',
  confirmTitle: 'Seal the arrangement. Leaving the screen does the same.',
  nothingToConfirm: 'Nothing to confirm',
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
  noDoctrine:
    'No Doctrine yet. A Doctrine is offered each time you adopt a government, and it is kept for the whole game.',
  noLaw: 'This government has no law of its own.',
  nextDraft: 'next draft',
  chooseGovernment: 'choose a government',
  chooseGovernmentTitle:
    'A new government is ready to be chosen. Adopting lays out new chairs, keeps your Orders in the chairs they still fit, and lifts every seal.',
  exhausted: 'decks exhausted',
  exhaustedTitle:
    'The culture meter is full, but you already hold every card your decks can offer at your band. No draft is charged; the culture stays banked until there is a card to deal.',
  hand: 'Your hand',
  handOpens: 'opens it',
  deckCount: (count: number) => `${count} in your deck ·`,
  binderOpens: 'opens the binder',
  handEmpty: 'Your hand is empty.',
  noOrders: 'You hold no Orders yet. Culture pays for the first draft.',
  countsTwice: 'counts twice',
  sealed: (turns: number) => `Sealed for ${turns} more turn${turns === 1 ? '' : 's'}`,
} as const;

/** How long a refusal stands in place of the hint. The board's four seconds. */
const REFUSAL_MS = 4000;

/** Six chairs to a row, at every size the board draws. */
const CHAIRS_PER_ROW = 6;

// --- the layout: which card form and which hand a window gets ---------------

/**
 * The card's forms, in pixels (the final board's build spec, "The card, by
 * form"): the large face for a table of one row, the full face, the compact
 * form with its short picture band, and the narrow compact form.
 */
export const ORDERS_FORMS = {
  large: { width: 244, height: 299 },
  full: { width: 210, height: 258 },
  compact: { width: 187, height: 180 },
  narrow: { width: 145, height: 206 },
} as const;

export type OrdersForm = keyof typeof ORDERS_FORMS;

/** The room the screen's own parts take, in pixels, on a roomy window and a tight one. */
const ORDERS_FRAME = {
  roomy: { head: 52, top: 12, side: 24, bottom: 16 },
  tight: { head: 44, top: 8, side: 16, bottom: 12 },
  /** A window under this height or width is tight. */
  tightBelow: { height: 780, width: 1240 },
  /** The widest the table runs on a very wide window. */
  maxWidth: 1640,
  register: 104,
  gap: 12,
  rowGap: 14,
  cardGap: 10,
  label: 18,
  /** The rail of card tops, the least a hand takes. */
  rail: 28,
  /** A hand of named cards side by side needs this height at least; under it the name would go below 11 px. */
  spreadMin: 144,
  /** An indexed rank, the names set down each card's edge, needs this height at least. */
  stripMin: 120,
  handGap: 12,
} as const;

/** Which card form and which hand a window gets, worked out from its size (`ordersLayout`). */
export interface OrdersLayout {
  tight: boolean;
  form: OrdersForm;
  rows: number;
  /** The hand: named cards side by side in ranks, an indexed rank, or the rail of tops. */
  hand: 'spread' | 'strip' | 'rail';
  /** The hand card's size, and the ranks a spread hand takes. */
  handCard: { width: number; height: number };
  handRanks: number;
}

/**
 * **The layout for a window** (part C): the largest card form whose table
 * fits beside the register and the least hand, then the best hand the height
 * left over allows. Pure, so the tests can sweep window sizes.
 *
 *   - The form: the large face for a table of one row, then the full face,
 *     then the compact form, then the narrow compact form.
 *   - The hand: named cards side by side, in as many ranks as the height
 *     allows, as large as fits with the name at 11 px or more; else an
 *     indexed rank with the names set down the cards' edges; else the rail of
 *     card tops.
 */
export function ordersLayout(window: { width: number; height: number }, chairs: number, handCount: number): OrdersLayout {
  const tight = window.height < ORDERS_FRAME.tightBelow.height || window.width < ORDERS_FRAME.tightBelow.width;
  const frame = tight ? ORDERS_FRAME.tight : ORDERS_FRAME.roomy;
  const width = Math.min(ORDERS_FRAME.maxWidth, window.width - 2 * frame.side);
  const height = window.height - frame.head - frame.top - frame.bottom;
  const rows = Math.max(1, Math.ceil(chairs / CHAIRS_PER_ROW));
  const cols = Math.max(1, Math.min(CHAIRS_PER_ROW, chairs));
  const fixed = ORDERS_FRAME.register + 2 * ORDERS_FRAME.gap + ORDERS_FRAME.label;
  const tableHeight = (form: OrdersForm): number =>
    rows * ORDERS_FORMS[form].height + (rows - 1) * ORDERS_FRAME.rowGap;
  const order: readonly OrdersForm[] = rows === 1 ? ['large', 'full', 'compact', 'narrow'] : ['full', 'compact', 'narrow'];
  const form =
    order.find(
      (one) =>
        cols * ORDERS_FORMS[one].width + (cols - 1) * ORDERS_FRAME.cardGap <= width &&
        fixed + tableHeight(one) + ORDERS_FRAME.rail <= height,
    ) ?? 'narrow';
  const room = height - fixed - tableHeight(form);
  const most = rows === 1 ? 202 : 162;
  for (let cardHeight = Math.min(most, room); cardHeight >= ORDERS_FRAME.spreadMin; cardHeight -= 2) {
    const cardWidth = Math.round((cardHeight * 104) / 162);
    const perRank = Math.max(1, Math.floor((width + ORDERS_FRAME.handGap) / (cardWidth + ORDERS_FRAME.handGap)));
    const ranks = Math.floor((room + ORDERS_FRAME.handGap) / (cardHeight + ORDERS_FRAME.handGap));
    if (ranks >= 1 && perRank * ranks >= handCount) {
      return {
        tight,
        form,
        rows,
        hand: 'spread',
        handCard: { width: cardWidth, height: cardHeight },
        handRanks: Math.max(1, Math.ceil(handCount / perRank)),
      };
    }
  }
  if (room >= ORDERS_FRAME.stripMin) {
    const cardHeight = Math.min(162, room);
    return {
      tight,
      form,
      rows,
      hand: 'strip',
      handCard: { width: Math.round((cardHeight * 104) / 162), height: cardHeight },
      handRanks: 1,
    };
  }
  return { tight, form, rows, hand: 'rail', handCard: { width: 104, height: 162 }, handRanks: 1 };
}

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
  /** The overlay's own × button. */
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
}

/** A card's type, for sorting the hand: the chair types in order, then the rest. */
function typeRank(id: OrderId): number {
  const index = (CHAIR_TYPES as readonly string[]).indexOf(orderType(id));
  return index < 0 ? CHAIR_TYPES.length : index;
}

/** The yields of a stamp as the head prints them: a mono figure and its mark, in the yield's ink. */
function payFigureNode(figure: StampFigure): HTMLElement {
  const tablet = tabletOfFigure(figure);
  const node = element('span', 'orders-pay-figure');
  if (tablet.yield !== null) node.dataset.yield = tablet.yield;
  if (tablet.yield !== null) node.append(yieldMarkNode(tablet.yield));
  else node.append(element('span', 'orders-pay-glyph', figure.glyph));
  node.append(element('b', undefined, tablet.figure));
  return node;
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
  /** Count the head's total up on the next draw, because Confirm just went through. */
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
  /** A swapped-out card's slide to the hand after the next draw (moment 6). */
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
  /** This draw's layout: the card form and the hand (`ordersLayout`). */
  let screenLayout: OrdersLayout = ordersLayout({ width: 1440, height: 900 }, 0, 0);

  // The head's tools: what your cards pay, Revert and Confirm. Built once and
  // filled on every draw, so the buttons keep their place in the tab order.
  const tools = element('div', 'orders-head-tools');
  const payNode = element('div', 'orders-pay');
  const revertButton = element('button', 'btn orders-revert', ORDERS_WORDS.revert) as HTMLButtonElement;
  revertButton.type = 'button';
  const confirmButton = element('button', 'btn btn-primary orders-confirm', ORDERS_WORDS.confirm) as HTMLButtonElement;
  confirmButton.type = 'button';
  const changesNode = element('span', 'orders-changes');
  tools.append(payNode, changesNode, revertButton, confirmButton);
  if (head !== null) head.insertBefore(tools, closeButton);
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
      hintNode.textContent = ORDERS_WORDS.held(orderDef(card).name, fitsWords(fits));
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

  /** Picks a card up from the hand, or puts the held one back. */
  function take(id: OrderId, event: MouseEvent | null = null): void {
    if (held === id) {
      putBack();
      draw();
      return;
    }
    if (held !== null) putBack();
    notePointer(event);
    held = id;
    beforeLift = null;
    focusKey = `hand:${id}`;
    draw();
  }

  /**
   * Picks a card up **out of its chair**: the first half of moving it. A
   * staged removal, then the card is held. A sealed card answers with the
   * reducer's own sentence and does not move.
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
   * swap it with the card in an occupied one. With nothing in hand: pick up
   * the card in the chair. Edits the arrangement; sends nothing.
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
    // No figure here: the figure is Confirm's (the reveal ruling).
    held = null;
    beforeLift = null;
    focusKey = `chair:${index}`;
    draw();
  }

  /** Confirm: sign the arrangement, then redraw with the count-ups. */
  function confirmStaging(): void {
    justConfirmed = commitStaging();
    countTotal = justConfirmed.length > 0;
    held = null;
    beforeLift = null;
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
    draw();
  }

  revertButton.addEventListener('click', revert);
  confirmButton.addEventListener('click', confirmStaging);

  // --- the head -------------------------------------------------------------

  function paintHead(state: GameState, seat: number, sc: PlayerStatecraft, arrangement: StagedSlots): void {
    const reading = foldDeck(state, seat);
    payNode.replaceChildren(element('span', 'orders-pay-label', ORDERS_WORDS.payLabel));
    const figures = stampFigures(reading);
    if (figures.length === 0) payNode.append(element('span', 'orders-pay-none', ORDERS_WORDS.payNone));
    for (const figure of figures) payNode.append(payFigureNode(figure));
    payNode.title = deckCaption(reading);
    payNode.setAttribute('aria-label', deckCaption(reading));
    if (countTotal) counting.push(countUp([...payNode.querySelectorAll('.orders-pay-figure b')]));

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
    changesNode.textContent = problem ?? (changes > 0 ? ORDERS_WORDS.changes(changes) : '');
  }

  // --- the register ---------------------------------------------------------

  /** A live plate for the register: the short form of the card's live line. */
  function livePlate(live: CardLive): HTMLElement {
    const plate = element('span', 'orders-livep');
    plate.dataset.live = live.kind;
    const words = element('span', 'orders-livep-words');
    setYieldText(words, stripRefs(live.short));
    plate.append(words);
    plate.title = live.unmet?.reason !== undefined ? `${LIVE_WORDS.idle}: ${stripRefs(live.unmet.reason)}` : stripRefs(live.line.text);
    return plate;
  }

  /** The government's live plate: the next draft's progress, or what waits on the player. */
  function governmentPlate(state: GameState, seat: number, sc: PlayerStatecraft): HTMLElement {
    const player = playerById(state, seat)!;
    if (sc.pendingGovernment !== undefined && options.adopt !== undefined) {
      const button = element('button', 'orders-livep orders-adopt', ORDERS_WORDS.chooseGovernment) as HTMLButtonElement;
      button.type = 'button';
      button.title = ORDERS_WORDS.chooseGovernmentTitle;
      button.addEventListener('click', () => options.adopt?.());
      return button;
    }
    if (draftExhausted(state, player)) {
      const plate = element('span', 'orders-livep', ORDERS_WORDS.exhausted);
      plate.title = ORDERS_WORDS.exhaustedTitle;
      return plate;
    }
    const glance = draftGlance(state, player);
    const plate = element('span', 'orders-livep orders-draft');
    plate.append(element('span', 'orders-livep-words', ORDERS_WORDS.nextDraft));
    const bar = element('span', 'orders-bar');
    const fill = element('i');
    fill.style.width = `${Math.round(glance.fraction * 100)}%`;
    bar.append(fill);
    plate.append(bar);
    if (glance.turns !== null) plate.append(element('em', 'orders-draft-turns', `${glance.turns}t`));
    // Rounded at the eye (batch X): the pool is exact, the meter reads whole.
    const banked = Math.max(0, roundYield(player.culturePool));
    plate.title = `${ORDERS_WORDS.nextDraft}: ${banked}/${glance.cost} culture`;
    return plate;
  }

  function drawRegister(state: GameState, seat: number, sc: PlayerStatecraft, sheet: CardImpactSheet | undefined): HTMLElement {
    const register = element('section', 'orders-register');
    register.setAttribute('aria-label', 'Government and Doctrines');
    // More than four Doctrines (the most a seat can hold is six: one at each of
    // the four government tiers, and two from a wonder and a commission): they
    // give up their pictures to their words.
    register.toggleAttribute('data-many', sc.doctrines.length > 4);
    const government = registerFaceNode({
      id: sc.government,
      kind: 'government',
      plate: `Tier ${sc.drafts}`,
      live: governmentPlate(state, seat, sc),
      noLaw: ORDERS_WORDS.noLaw,
    });
    government.classList.add('orders-gov');
    register.append(government);
    if (sc.doctrines.length === 0) {
      register.append(element('p', 'orders-nodoctrine', ORDERS_WORDS.noDoctrine));
      return register;
    }
    for (const id of sc.doctrines) {
      const live = isDoctrineId(id) ? doctrineLive(state, seat, id, sheet) : null;
      const card = registerFaceNode({
        id,
        kind: 'doctrine',
        plate: 'Doctrine',
        live: live === null ? null : livePlate(live),
      });
      card.classList.add('orders-doctrine');
      card.dataset.card = id;
      card.dataset.nav = `doctrine:${id}`;
      card.dataset.preview = 'register';
      card.tabIndex = 0;
      if (live !== null && isDoctrineId(id)) {
        previewStates.set(id, { where: 'played', liveLine: live.line, unmet: live.unmet, tablet: live.tablet });
      }
      if (live?.unmet !== null && live?.unmet !== undefined) card.dataset.unmet = 'true';
      register.append(card);
    }
    return register;
  }

  // --- the table ------------------------------------------------------------

  /** The words in an empty chair: what it takes, and that it pays nothing. */
  function emptyChairWords(type: ChairType, takesAny: boolean, takenOut: boolean): string {
    // One sentence a line, as the board sets them (`white-space: pre-line`).
    if (takenOut) return `${ORDERS_WORDS.takenOut}\n${ORDERS_WORDS.paysNothing}`;
    const takes = type === 'wildcard' || takesAny ? ORDERS_WORDS.takesAny : ORDERS_WORDS.takes(chairWord(type));
    return `${ORDERS_WORDS.emptyChair}\n${takes}\n${ORDERS_WORDS.paysNothing}`;
  }

  function drawTable(
    state: GameState,
    seat: number,
    sc: PlayerStatecraft,
    arrangement: StagedSlots,
    sheet: CardImpactSheet | undefined,
  ): HTMLElement {
    const table = element('section', 'orders-table');
    table.setAttribute('aria-label', 'Chairs');
    const layout = slotTypesOf(sc);
    const player = playerById(state, seat);
    const positions = deckReadsSlotPosition(sc);
    const fit = stagedFit(state, seat, arrangement);
    let row: HTMLElement | null = null;
    layout.forEach((type, index) => {
      if (index % CHAIRS_PER_ROW === 0) {
        row = element('div', 'orders-row');
        table.append(row);
      }
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
      const tab = chairTabNode({
        type,
        number: index + 1,
        word: chairWord(type),
        sealedTurns,
        note: note.join(' · '),
      });

      const button = element('button', 'orders-seat') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.nav = `chair:${index}`;
      if (malice !== null) {
        // The bad face: a chair a malice holds. Not empty and not takeable.
        const face = element('div', 'orders-malice');
        face.append(element('span', 'orders-malice-mark', '✕'));
        face.append(element('span', 'orders-malice-name', maliceDef(malice).name));
        face.append(element('span', 'orders-malice-note', maliceDef(malice).note));
        face.append(tab);
        button.append(face);
        button.title = maliceChairRefusal(index, malice);
        cell.dataset.state = 'malice';
      } else if (filled) {
        const id = filled.card;
        const reading: CardLive = filled.staged ? stagedLive() : seatedOrderLive(state, seat, id, sheet);
        const face = element('div');
        dressOrderFace(face, id, {
          where: 'played',
          inControl: true,
          sealedTurns,
          staged: filled.staged,
          liveLine: reading.line,
          unmet: reading.unmet,
          tablet: reading.tablet,
          ...(filled.staged ? { tag: ORDERS_WORDS.staged } : {}),
        });
        // The compact forms (part C): the same emblem with a short picture band.
        if (screenLayout.form === 'compact' || screenLayout.form === 'narrow') face.dataset.compact = screenLayout.form;
        face.append(tab);
        button.append(face);
        button.dataset.preview = 'chair';
        button.dataset.card = id;
        previewStates.set(id, {
          where: 'played',
          sealedTurns,
          staged: filled.staged,
          liveLine: reading.line,
          unmet: reading.unmet,
          tablet: reading.tablet,
        });
        button.setAttribute('aria-label', `${orderDef(id).name}, chair ${index + 1}, ${reading.line.text}`);
        button.title = sealedTurns > 0 ? ORDERS_WORDS.sealed(sealedTurns) : orderDef(id).name;
        cell.dataset.state = filled.staged ? 'staged' : 'seated';
        cell.dataset.live = reading.kind;
        if (justConfirmed.includes(id)) {
          counting.push(countUp([...face.querySelectorAll('.of-tablet b, .of-sig')]));
          settling.push(face);
        }
        if (markCard === id) cell.classList.add('is-marked');
      } else {
        // "Any card" when every Order this seat could seat fits the chair: a
        // Wildcard chair, or every chair under a law that lets any card sit anywhere.
        const seatable = sc.orders.filter((id) => !isCharter(id));
        const takesAny = seatable.length > 0 && seatable.every((id) => fit(id, type));
        const takenOut = live !== null;
        const face = emptyChairFace(type, emptyChairWords(type, takesAny, takenOut));
        if (screenLayout.form === 'compact' || screenLayout.form === 'narrow') face.dataset.compact = screenLayout.form;
        face.append(tab);
        button.append(face);
        button.setAttribute('aria-label', `Chair ${index + 1}, ${chairWord(type)}, empty`);
        cell.dataset.state = takenOut ? 'emptied' : 'empty';
      }
      if (ring !== null) {
        cell.classList.add('is-fit');
        cell.append(element('span', 'orders-ring-tag', ring === 'swap' ? ORDERS_WORDS.swap : ORDERS_WORDS.seatHere));
        button.title = ring === 'swap' ? `${ORDERS_WORDS.swap}: ${orderDef(held!).name}` : ORDERS_WORDS.seatHere;
      } else if (held !== null) {
        cell.classList.add('is-faded');
        if (refused !== null) button.title = refused;
      }
      button.addEventListener('click', (event) => drop(index, event));
      cell.prepend(button);
      row!.append(cell);
    });
    return table;
  }

  // --- the hand -------------------------------------------------------------

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

  function drawHand(sc: PlayerStatecraft, hand: readonly OrderId[], layout: OrdersLayout): HTMLElement {
    const spread = layout.hand === 'spread';
    const block = element('section', 'orders-hand');
    block.dataset.hand = layout.hand;
    block.style.setProperty('--orders-hand-w', `${layout.handCard.width}px`);
    block.style.setProperty('--orders-hand-h', `${layout.handCard.height}px`);
    const label = element('div', 'orders-hand-label');
    label.append(element('span', 'orders-hand-title', ORDERS_WORDS.hand));
    label.append(element('span', 'orders-hand-count', String(hand.length)));
    for (const type of CHAIR_TYPES) {
      const count = hand.filter((id) => orderType(id) === type).length;
      if (count > 0) label.append(element('span', 'orders-hand-type', `${chairWord(type)} ${count}`));
    }
    const opens = element('span', 'orders-hand-key');
    opens.append(keyMark('H'), ` ${ORDERS_WORDS.handOpens}`);
    label.append(opens);
    const binder = element('span', 'orders-hand-deck', `${ORDERS_WORDS.deckCount(sc.orders.length)} `);
    binder.append(keyMark('D'), ` ${ORDERS_WORDS.binderOpens}`);
    label.append(binder);
    block.append(label);
    const cards = element('div', spread ? 'orders-spread' : layout.hand === 'strip' ? 'orders-rail is-strip' : 'orders-rail');
    if (sc.orders.length === 0 || hand.length === 0) {
      cards.append(element('p', 'orders-hand-empty', sc.orders.length === 0 ? ORDERS_WORDS.noOrders : ORDERS_WORDS.handEmpty));
      block.append(cards);
      return block;
    }
    let previous: number | null = null;
    hand.forEach((id, at) => {
      const button = element('button', 'orders-handcard') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.nav = `hand:${id}`;
      button.dataset.card = id;
      const rank = typeRank(id);
      if (previous !== null && rank !== previous) button.dataset.newType = 'true';
      previous = rank;
      button.style.setProperty('--at', String(at));
      const face = element('div');
      dressOrderFace(face, id, { where: 'hand', inControl: true });
      face.dataset.form = 'hand';
      // An indexed rank sets each card's name down its edge (part C).
      if (layout.hand === 'strip') face.dataset.strip = '';
      button.append(face);
      button.dataset.preview = 'hand';
      button.setAttribute('aria-label', `${orderDef(id).name}, in your hand`);
      button.title = orderDef(id).name;
      if (held === id) button.classList.add(ghostArmed ? 'is-carried' : 'is-held');
      if (markCard === id) button.classList.add('is-marked');
      button.addEventListener('click', (event) => take(id, event));
      cards.append(button);
    });
    block.append(cards);
    return block;
  }

  /**
   * Lays the rail's cards out: overlapped, a gap between types, and spread
   * over the rail's width. Run after the rail is on the page, because the
   * width is the page's.
   */
  function layRail(rail: HTMLElement): void {
    const cards = [...rail.querySelectorAll<HTMLElement>('.orders-handcard')];
    if (cards.length === 0) return;
    const width = rail.clientWidth;
    const cardWidth = cards[0]!.offsetWidth || 104;
    const typeGap = 10;
    const breaks = cards.filter((card) => card.dataset.newType === 'true').length;
    const room = Math.max(0, width - cardWidth - breaks * typeGap);
    const step = cards.length > 1 ? Math.min(cardWidth + 6, room / (cards.length - 1)) : 0;
    let x = 0;
    cards.forEach((card, index) => {
      if (index > 0) x += step + (card.dataset.newType === 'true' ? typeGap : 0);
      card.style.left = `${Math.round(x)}px`;
      card.style.zIndex = String(index + 1);
    });
  }

  // --- the draw -------------------------------------------------------------

  /** The shared reading of the real board for this draw's stamps. Its lifetime is one draw. */
  let sheet: CardImpactSheet | null = null;

  function draw(): void {
    sheet = cardImpactSheet(options.getState(), options.getPlayerId());
    try {
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

    const chairs = slotTypesOf(sc).length;
    const hand = handOf(sc, arrangement);
    const oneRow = chairs <= CHAIRS_PER_ROW;
    const size = { width: sheetNode?.clientWidth ?? window.innerWidth, height: sheetNode?.clientHeight ?? window.innerHeight };
    screenLayout = ordersLayout(size, chairs, hand.length);
    drawnSize = `${window.innerWidth}x${window.innerHeight}`;
    sheetNode?.setAttribute('data-chairs', String(chairs));
    sheetNode?.setAttribute('data-table', oneRow ? 'one-row' : 'two-rows');
    sheetNode?.setAttribute('data-form', screenLayout.form);
    sheetNode?.toggleAttribute('data-tight', screenLayout.tight);
    sheetNode?.toggleAttribute('data-narrow', size.width < ORDERS_FRAME.tightBelow.width);
    sheetNode?.style.setProperty('--orders-card-w', `${ORDERS_FORMS[screenLayout.form].width}px`);
    sheetNode?.style.setProperty('--orders-card-h', `${ORDERS_FORMS[screenLayout.form].height}px`);
    // A table of two rows sets the register's and the table's width, so the
    // two line up and sit centred on the cloth. A table of one row spreads
    // over the cloth's whole width. The hand takes the cloth's width.
    const cols = Math.min(CHAIRS_PER_ROW, chairs);
    const tableWidth = cols * ORDERS_FORMS[screenLayout.form].width + (cols - 1) * ORDERS_FRAME.cardGap;
    sheetNode?.style.setProperty('--orders-table-max', oneRow ? `${ORDERS_FRAME.maxWidth}px` : `${tableWidth}px`);
    sheetNode?.toggleAttribute('data-holding', held !== null);

    paintHead(state, seat, sc, arrangement);
    paintHint();

    const cloth = element('div', 'orders-cloth');
    cloth.append(drawRegister(state, seat, sc, sheet ?? undefined));
    cloth.append(drawTable(state, seat, sc, arrangement, sheet ?? undefined));
    cloth.append(drawHand(sc, hand, screenLayout));
    sheetNode?.setAttribute('data-layer', layer ?? 'none');
    body.append(cloth);
    // The layers fill the window under the head (part C1), so they sit beside
    // the cloth rather than inside it.
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
    const faces = [...body.querySelectorAll<HTMLElement>('.orders-table .order-face')];
    for (const face of faces) fitOrderFace(face);
    void document.fonts?.ready.then(() => {
      for (const face of faces) if (face.isConnected) fitOrderFace(face);
    });
    const rail = body.querySelector<HTMLElement>('.orders-rail');
    if (rail !== null) layRail(rail);
    const view = body.querySelector<HTMLElement>('.orders-handview');
    if (view !== null) layHandView(view);
    const grid = body.querySelector<HTMLElement>('.orders-binder-grid');
    if (grid !== null) {
      fitGrid(grid);
      grid.scrollTop = binderScroll;
    }
    markCutRegister();
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
        live: entry !== null && !entry.staged ? seatedOrderLive(state, seat, id, impact) : null,
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

  /**
   * A register card whose effect is longer than its four lines is cut with a
   * fade, and lifts to a full face on hover or focus (the build spec's
   * "Register text").
   */
  function markCutRegister(): void {
    for (const card of body.querySelectorAll<HTMLElement>('.orders-register .order-face[data-form="wide"]')) {
      const sub = card.querySelector<HTMLElement>('.of-sub');
      const cut = sub !== null && sub.scrollHeight > sub.clientHeight + 1;
      card.toggleAttribute('data-overflow', cut);
    }
  }

  /** The card that follows the pointer while one is held (moment 2). */
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
      dressOrderFace(face, held, { where: 'hand', inControl: true });
      face.dataset.form = 'hand';
      ghost.append(face);
      layerHost.append(ghost);
    }
    placeGhost(ghost, layerHost, pointer.x, pointer.y);
  }

  /** The moments a redraw plays: a landing, a swapped card's slide, and Confirm's settling. */
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
        dressOrderFace(copy, slide.card, { where: 'hand', inControl: true });
        copy.dataset.form = 'hand';
        copy.style.setProperty('--order-face-width', `${target.offsetWidth}px`);
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
   * at once (moment 1); a played card whose text is cut, and a register card,
   * after the build spec's 300 ms. A played card that is already the full
   * face lifts itself, so its text scrolls inside it.
   */
  function onPreviewEnter(event: Event): void {
    const source = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-preview]') : null;
    if (source === null || source === previewSource) return;
    if (held !== null && source.dataset.preview !== 'hand') return;
    hidePreview();
    const card = source.dataset.card;
    if (card === undefined) return;
    previewSource = source;
    const kind = source.dataset.preview;
    if (kind === 'hand') {
      liftNow(source, card, 'hand');
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
      else liftNow(source, card, kind === 'register' ? 'register' : 'chair');
    }, ORDERS_MOTION.previewDelayMs);
  }

  function onPreviewLeave(event: Event): void {
    if (previewSource === null) return;
    const next = (event as PointerEvent | FocusEvent).relatedTarget;
    if (next instanceof Node && previewSource.contains(next)) return;
    hidePreview();
  }

  /** Shows the full face of `card` beside its source. */
  function liftNow(source: HTMLElement, card: string, kind: 'hand' | 'chair' | 'register'): void {
    const state: OrderFaceState = previewStates.get(card) ?? { where: 'hand' };
    const face = orderFaceNode(card as OrderId, { ...state, inControl: true });
    face.setAttribute('data-lifted', '');
    const inRail = source.closest('.orders-rail') !== null;
    const place = kind === 'register' ? 'below' : inRail ? 'above' : 'beside';
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
    binderFilter = allOrders();
  }

  /**
   * The window changed size: the card form and the hand are the window's
   * (`ordersLayout`), so the screen is drawn again while it is up.
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
    if (event.key === 'Escape' && held !== null) {
      event.preventDefault();
      event.stopPropagation();
      putBack();
      draw();
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
      tools.remove();
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

