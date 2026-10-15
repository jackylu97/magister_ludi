/**
 * The price column: what a thing costs to buy outright, in one of three looks.
 *
 * Who uses it:
 *   - the city screen's add list (batch UX5): every row has a cell in one
 *     right-hand column, under the heading "Buy outright · full price · you
 *     have 437 gold", and the Faith shelf prices its rows in the same column in
 *     the faith ink;
 *   - the faith sheet's Rites tab (batch UX9, `ritesTab.ts`): each free town's
 *     "Start · 72" button and each row of a town's "Start a rite" menu. A
 *     rite's gate is `riteGate` rather than `purchaseError`, so that tab hands
 *     its own answer to `priceLook`, and it passes a `label`, because there the
 *     cell is the action itself rather than a price beside one;
 *   - the HUD when it is rebuilt (`docs/plans/hud-ux-decisions.md`, "Shared
 *     components").
 *
 * The three looks are told apart by shape, never by colour alone:
 *   - `buy`: a pressable plate carrying the figure;
 *   - `short`: the plain figure, not pressable, with "need 31" under it;
 *   - `none`: a dash. The reason is said once somewhere else on the screen, at
 *     the head of the shelf or on a line under the row (`refusalLine.ts`).
 *
 * **A purchase costs the item's full price, always** (the user, 2026-10-12, and
 * `purchase.ts`: buying "does not consume the banked basket and is not
 * discounted by it"). So a cell never sits beside a progress bar and never
 * reads as "finish the rest", and the figure on a queued row is the figure an
 * unqueued copy would show.
 */

import {
  type PurchasableItem,
  type PurchaseCurrency,
  explainPurchaseCost,
  purchaseError,
  purchaseShortfall,
} from '../sim/purchase';
import type { GameState } from '../sim/state';
import { BANK_UNIT, bankHeldElement, bankHeldText } from './bankFigure';
import { element } from './dom';
import { YIELD_GLYPH } from './figures';
import { refusalMarkElement } from './refusalLine';
import { setYieldText } from './yieldMark';

/** The bank a price is paid from. The purchase gate's own two. */
export type PriceBank = PurchaseCurrency;

/** One cell of the price column, decided. */
export type PriceLook =
  | { look: 'buy'; bank: PriceBank; price: number }
  | { look: 'short'; bank: PriceBank; price: number; need: number }
  | { look: 'none'; bank: PriceBank; price: number; refusal: string };

/** What a gate said about one price: the figure, the bank, and the refusal if any. */
export interface PriceGate {
  bank: PriceBank;
  price: number;
  /** The gate's sentence, or `null` when it would take the purchase. */
  refusal: string | null;
  /**
   * How much more the bank must hold when the bank is the only reason the gate
   * refused, otherwise `null`. The caller asks its own gate for this as a
   * number (for a purchase, `purchaseShortfall`), never by reading the
   * refusal's words.
   */
  shortfall: number | null;
}

/**
 * The look one gate answer gets. Pure.
 *
 * "Cannot afford" is the `short` look and never a refusal line: it is the one
 * refusal that more of the same bank fixes, so the cell says how much more.
 * `need` is what is missing, rounded up to a whole coin, because a bank holds
 * fractions and a player can only act on whole ones.
 */
export function priceLook(gate: PriceGate): PriceLook {
  const { bank, price } = gate;
  if (gate.refusal === null) return { look: 'buy', bank, price };
  if (gate.shortfall !== null) {
    return { look: 'short', bank, price, need: Math.max(1, Math.ceil(gate.shortfall)) };
  }
  return { look: 'none', bank, price, refusal: gate.refusal };
}

/**
 * The look of buying `item` in a town from one bank, or `null` when that bank
 * does not sell it at all (no cell is drawn for that bank).
 *
 * Every figure and every refusal is the simulation's: the price is
 * `explainPurchaseCost`'s fold, the gate is `purchaseError`, and what is
 * missing is `purchaseShortfall`. So a cell a player can press is a command the
 * reducer takes, a dash carries the reducer's own sentence to the line that
 * explains it, and "need 31" is the gap the gate measured.
 */
export function purchaseLook(
  state: GameState,
  playerId: number,
  cityId: number,
  item: PurchasableItem,
  bank: PriceBank,
): PriceLook | null {
  const price = explainPurchaseCost(state, playerId, cityId, item, bank);
  if (!price) return null;
  const refusal = purchaseError(state, playerId, cityId, item, bank);
  return priceLook({
    bank,
    price: price.total,
    refusal,
    // Asked only after a refusal: a purchase the gate takes is short of nothing.
    shortfall:
      refusal === null ? null : purchaseShortfall(state, playerId, cityId, item, bank),
  });
}

/** "468💰" or "120🕯": the figure in the bank's own mark. Composed here, drawn by `setYieldText`. */
export function priceFigureText(bank: PriceBank, price: number): string {
  return `${price}${bank === 'faith' ? YIELD_GLYPH.faith : YIELD_GLYPH.gold}`;
}

/** "need 31", the line under a short price. */
export function priceNeedText(need: number): string {
  return `need ${need}`;
}

/**
 * "Start · 72🕯": a labelled cell's words, the label and then the figure. The
 * faith sheet's rite buttons read this way because the user ruled that the
 * button carries the price (2026-10-12).
 */
export function priceLabelText(label: string, bank: PriceBank, price: number): string {
  return `${label} · ${priceFigureText(bank, price)}`;
}

/**
 * "short 7", the line beside a labelled cell the bank cannot pay for yet. The
 * user's words for a rite button that has run out of faith ("every remaining
 * button greys out with 'short N'"); a bare price says "need 7" instead.
 */
export function priceShortText(need: number): string {
  return `short ${need}`;
}

/** One bank's part of the column heading. */
export interface PriceHeadBank {
  bank: PriceBank;
  held: number;
}

/**
 * "Buy outright · full price · you have 437 gold", with every bank whose prices
 * are in view: "… · you have 437 gold · 51 faith". The words every cell under
 * it would otherwise have to carry, said once.
 */
export function priceHeadText(banks: readonly PriceHeadBank[]): string {
  const held = banks.map(({ bank, held }) => `${bankHeldText(held)} ${BANK_UNIT[bank]}`);
  return held.length === 0
    ? 'Buy outright · full price'
    : `Buy outright · full price · you have ${held.join(' · ')}`;
}

/** The heading as an element, each held figure in its bank's ink (`bankHeldElement`). */
export function priceHeadElement(banks: readonly PriceHeadBank[]): HTMLElement {
  const head = element('p', 'price-head');
  head.append(element('span', 'price-head-rule', 'Buy outright · full price'));
  if (banks.length > 0) {
    const have = element('span', 'price-head-banks');
    have.append(document.createTextNode('you have '));
    banks.forEach(({ bank, held }, index) => {
      if (index > 0) have.append(document.createTextNode(' · '));
      have.append(bankHeldElement(bank, held));
      have.append(document.createTextNode(` ${BANK_UNIT[bank]}`));
    });
    head.append(have);
  }
  return head;
}

/** What drawing one cell needs besides its look. */
export interface PriceCellOptions {
  /** The thing's name, for the spoken label: "Buy Settler outright for 112 gold". */
  name: string;
  /**
   * Words before the figure, for a cell that is the action itself rather than a
   * price beside one: the faith sheet passes "Start", so its plate reads
   * "Start · 72🕯" and is read aloud as "Start Omen Reading in Larkspur for 72
   * faith". A labelled cell the bank cannot pay for yet shows the same words
   * with "short 7" beside them. Without a label the cell is a bare price, as
   * the city screen's column draws it.
   */
  label?: string;
  /**
   * Words for the spoken form only, for a bare price that is the action itself
   * rather than a price beside one: the city screen's Faith card passes
   * "Start", so its cell still shows "72🕯" and is read aloud as "Start Omen
   * Reading in Uruk for 72 faith" (batch UX7b). It is spoken exactly as a
   * `label` is, and draws nothing. Ignored when `label` is set, which speaks
   * its own words.
   */
  spokenLabel?: string;
  /** What pressing a `buy` cell does. Without it the plate is drawn but not pressable. */
  onBuy?: () => void;
  /**
   * Why a `buy` cell may not be pressed now although the gate would take it:
   * the seat has ended its turn. That is a state rather than a lack, so the
   * plate goes quiet instead of wearing the wanting voice.
   */
  paused?: string | null;
  /** The head line's number this cell's dash answers to (`planRefusals`), if any. */
  mark?: string | null;
  /** The reason a dash stands for, read to a screen reader in place of the dash. */
  reason?: string | null;
}

/**
 * What a screen reader is told about one cell, in place of what is drawn. Pure,
 * so the words are tested without a document.
 *
 *   - bare: "Buy Settler outright for 112 gold", "Settler costs 112 gold to buy
 *     outright; 31 more gold needed", "Settler cannot be bought here: …";
 *   - labelled: "Start Omen Reading in Larkspur for 72 faith", "… for 72 faith:
 *     7 more faith needed", "Start Votive Offering in Larkspur: not possible. …".
 *     A bare cell with a `spokenLabel` is spoken the same way.
 */
export function priceCellSpoken(
  look: PriceLook,
  options: Pick<PriceCellOptions, 'name' | 'label' | 'spokenLabel' | 'reason'>,
): string {
  const amount = `${look.price} ${BANK_UNIT[look.bank]}`;
  const label = options.label ?? options.spokenLabel;
  if (look.look === 'buy') {
    return label === undefined
      ? `Buy ${options.name} outright for ${amount}`
      : `${label} ${options.name} for ${amount}`;
  }
  if (look.look === 'short') {
    const more = `${look.need} more ${BANK_UNIT[look.bank]} needed`;
    return label === undefined
      ? `${options.name} costs ${amount} to buy outright; ${more}`
      : `${label} ${options.name} for ${amount}: ${more}`;
  }
  const reason = options.reason ?? look.refusal;
  return label === undefined
    ? `${options.name} cannot be bought here: ${reason}`
    : `${label} ${options.name}: not possible. ${reason}`;
}

/**
 * One cell of the price column. The `buy` look is a button; the other two are
 * not controls at all, so they are drawn as plain text and nothing about them
 * looks pressable. A labelled cell (`PriceCellOptions.label`) wears
 * `is-labelled` as well, so a screen can lay its words out on one line.
 */
export function priceCellElement(look: PriceLook, options: PriceCellOptions): HTMLElement {
  const labelled = options.label !== undefined;
  const classes = `is-${look.bank}${labelled ? ' is-labelled' : ''}`;
  const text = labelled
    ? priceLabelText(options.label!, look.bank, look.price)
    : priceFigureText(look.bank, look.price);
  const spoken = priceCellSpoken(look, options);
  if (look.look === 'buy') {
    const button = element('button', `price-cell is-buy ${classes}`);
    button.type = 'button';
    setYieldText(button, text);
    const paused = options.paused ?? null;
    button.disabled = paused !== null || options.onBuy === undefined;
    button.setAttribute('aria-label', paused ?? spoken);
    if (paused !== null) button.title = paused;
    const onBuy = options.onBuy;
    if (onBuy !== undefined) button.addEventListener('click', () => onBuy());
    return button;
  }
  if (look.look === 'short') {
    const cell = element('span', `price-cell is-short ${classes}`);
    const figure = element('span', 'price-cell-figure');
    setYieldText(figure, text);
    figure.setAttribute('aria-hidden', 'true');
    const need = labelled
      ? element('span', 'price-cell-need wanting', priceShortText(look.need))
      : element('span', 'price-cell-need wanting', priceNeedText(look.need));
    need.setAttribute('aria-hidden', 'true');
    cell.append(figure, need);
    cell.append(element('span', 'sr-only', spoken));
    return cell;
  }
  const cell = element('span', `price-cell is-none ${classes}`);
  const dash = element('span', 'price-cell-dash', '—');
  dash.setAttribute('aria-hidden', 'true');
  cell.append(dash);
  const mark = options.mark ?? null;
  if (mark !== null) cell.append(refusalMarkElement(mark));
  cell.append(element('span', 'sr-only', spoken));
  return cell;
}

/**
 * An empty cell, for a row that nothing could ever buy (a project is a
 * conversion and never a thing). It keeps the column's width so the rows
 * above and below stay aligned, and says nothing.
 */
export function emptyPriceCellElement(): HTMLElement {
  const cell = element('span', 'price-cell is-empty');
  cell.setAttribute('aria-hidden', 'true');
  return cell;
}
