/**
 * The price column: what a thing costs to buy outright, in one of three looks.
 *
 * Who uses it:
 *   - the city screen's add list (batch UX5): every row has a cell in one
 *     right-hand column, under the heading "Buy outright · full price · you
 *     have 437 gold", and the Faith shelf prices its rows in the same column in
 *     the faith ink;
 *   - the faith screen's rites and the HUD when they are rebuilt (batches UX3
 *     and UX9 to UX11 in `docs/plans/hud-ux-decisions.md`, "Shared
 *     components"). A rite's gate is `riteError` rather than `purchaseError`, so
 *     that screen hands its own answer to `priceLook`.
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
  bankOf,
  explainPurchaseCost,
  purchasableName,
  purchaseError,
} from '../sim/purchase';
import { type GameState, playerById } from '../sim/state';
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
  /** What the bank holds now. */
  held: number;
  /** The gate's sentence, or `null` when it would take the purchase. */
  refusal: string | null;
  /**
   * True when the gate refused only because the bank cannot cover the price.
   * The caller says so, because only the caller knows its gate (see
   * `purchaseLook`).
   */
  onlyShortOfBank: boolean;
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
  if (gate.onlyShortOfBank) {
    return { look: 'short', bank, price, need: Math.max(1, Math.ceil(price - gate.held)) };
  }
  return { look: 'none', bank, price, refusal: gate.refusal };
}

/**
 * The look of buying `item` in a town from one bank, or `null` when that bank
 * does not sell it at all (no cell is drawn for that bank).
 *
 * Every figure and every refusal is the simulation's: the price is
 * `explainPurchaseCost`'s fold, the gate is `purchaseError`, and the bank is
 * `bankOf`. So a cell a player can press is a command the reducer takes, and a
 * dash carries the reducer's own sentence to the line that explains it.
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
  const player = playerById(state, playerId);
  const held = player === undefined ? 0 : bankOf(player, bank);
  return priceLook({
    bank,
    price: price.total,
    held,
    refusal,
    onlyShortOfBank:
      refusal !== null &&
      player !== undefined &&
      refusal === shortOfBankSentence(player.name, item, bank, price.total, held),
  });
}

/**
 * The sentence `purchaseError` ends on when every other clause has passed and
 * the bank cannot cover the price: "Settler costs 112 gold; Ada has 80".
 *
 * That clause is the gate's last, so a refusal equal to this sentence is a
 * refusal for the money and nothing else. Recognising it by its words is a cost
 * this module pays knowingly: it is the same comparison the bot makes for the
 * same clause (`outOfReachFor`, `src/ai/wants.ts`), and the simulation has no
 * reading yet that answers "short of the bank, and only that" the way
 * `purchaseHexBlocker` answers for the town's hex. If that reading is added,
 * this function goes. Until then `test/ui/priceCell.test.ts` asks the real gate
 * for both banks, so a reworded sentence fails a test instead of quietly
 * turning every short price into a dash.
 */
export function shortOfBankSentence(
  playerName: string,
  item: PurchasableItem,
  bank: PriceBank,
  price: number,
  held: number,
): string {
  return `${purchasableName(item)} costs ${price} ${bank}; ${playerName} has ${Math.floor(held)}`;
}

/** "468💰" or "120🕯": the figure in the bank's own mark. Composed here, drawn by `setYieldText`. */
export function priceFigureText(bank: PriceBank, price: number): string {
  return `${price}${bank === 'faith' ? YIELD_GLYPH.faith : YIELD_GLYPH.gold}`;
}

/** "need 31", the line under a short price. */
export function priceNeedText(need: number): string {
  return `need ${need}`;
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
 * One cell of the price column. The `buy` look is a button; the other two are
 * not controls at all, so they are drawn as plain text and nothing about them
 * looks pressable.
 */
export function priceCellElement(look: PriceLook, options: PriceCellOptions): HTMLElement {
  const bankClass = `is-${look.bank}`;
  const amount = `${look.price} ${BANK_UNIT[look.bank]}`;
  if (look.look === 'buy') {
    const button = element('button', `price-cell is-buy ${bankClass}`);
    button.type = 'button';
    setYieldText(button, priceFigureText(look.bank, look.price));
    const paused = options.paused ?? null;
    button.disabled = paused !== null || options.onBuy === undefined;
    button.setAttribute('aria-label', paused ?? `Buy ${options.name} outright for ${amount}`);
    if (paused !== null) button.title = paused;
    const onBuy = options.onBuy;
    if (onBuy !== undefined) button.addEventListener('click', () => onBuy());
    return button;
  }
  if (look.look === 'short') {
    const cell = element('span', `price-cell is-short ${bankClass}`);
    const figure = element('span', 'price-cell-figure');
    setYieldText(figure, priceFigureText(look.bank, look.price));
    figure.setAttribute('aria-hidden', 'true');
    const need = element('span', 'price-cell-need wanting', priceNeedText(look.need));
    need.setAttribute('aria-hidden', 'true');
    cell.append(figure, need);
    cell.append(
      element(
        'span',
        'sr-only',
        `${options.name} costs ${amount} to buy outright; ${look.need} more ${BANK_UNIT[look.bank]} needed`,
      ),
    );
    return cell;
  }
  const cell = element('span', `price-cell is-none ${bankClass}`);
  const dash = element('span', 'price-cell-dash', '—');
  dash.setAttribute('aria-hidden', 'true');
  cell.append(dash);
  const mark = options.mark ?? null;
  if (mark !== null) cell.append(refusalMarkElement(mark));
  const reason = options.reason ?? look.refusal;
  cell.append(element('span', 'sr-only', `${options.name} cannot be bought here: ${reason}`));
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
