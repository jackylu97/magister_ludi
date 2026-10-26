/**
 * The two banks an empire spends from, the treasury and the faith pool, written
 * the same way wherever a screen shows them.
 *
 * Who uses it:
 *   - the city screen's band, "Treasury 437 (+21) · Faith 51 (+2)", just left
 *     of the six yield chips (batch UX5);
 *   - the city screen's price column heading, "you have 437 gold", through
 *     `bankHeldElement` (`priceCell.ts`);
 *   - the faith screen and the HUD when they are rebuilt (batches UX3 and UX9
 *     to UX11 in `docs/plans/hud-ux-decisions.md`, "Shared components").
 *
 * The figure is the top bar's own: `poolFigure` in `figures.ts` writes the bank
 * and then its rate per turn in brackets, and this module adds only the label
 * and the ink. The bank is `bankOf` (the simulation's one reading of a purse)
 * and the rate is `readEmpire`'s total for that yield, which is the number the
 * top bar's chip prints. So the band and the top bar cannot disagree, even
 * though the top bar is hidden while a town is open.
 *
 * Split in two, like `levyMenu.ts`: the readings and the words are pure and
 * tested without a document; the element builders only lay them out.
 */

import { type PurchaseCurrency, bankOf } from '../sim/purchase';
import { readEmpire } from '../sim/readings';
import { type GameState, playerById } from '../sim/state';
import { element } from './dom';
import { netFigure, poolFigure } from './figures';

/**
 * A bank, named by the currency it holds. The purchase gate's own three: gold,
 * faith and, since Magisterial batch MG11, culture (the draft pool, which
 * Magnificence lets buy a wonder).
 */
export type BankId = PurchaseCurrency;

/**
 * The banks the band lists, in the order every surface lists them: money
 * first, then faith. Culture is not in the band: the top bar already shows the
 * draft pool, and culture buys only one row under one card. The price column
 * lists it when it prices something (`PRICE_BANKS`, `priceCell.ts`).
 */
export const BANKS: readonly BankId[] = ['gold', 'faith'];

/** What a bank is called when it leads its own figure: "Treasury 437 (+21)". */
export const BANK_LABEL: Readonly<Record<BankId, string>> = {
  gold: 'Treasury',
  faith: 'Faith',
  culture: 'Culture',
};

/** The word after a figure in a bank's currency: "437 gold", "51 faith". */
export const BANK_UNIT: Readonly<Record<BankId, string>> = {
  gold: 'gold',
  faith: 'faith',
  culture: 'culture',
};

/** One bank as a screen shows it: what is held and what arrives each turn. */
export interface BankFigure {
  bank: BankId;
  held: number;
  perTurn: number;
}

/**
 * One bank of one seat. A seat that does not exist reads as an empty bank, the
 * top bar's own answer for the same case.
 */
export function readBank(state: GameState, playerId: number, bank: BankId): BankFigure {
  const player = playerById(state, playerId);
  return {
    bank,
    held: player === undefined ? 0 : bankOf(player, bank),
    perTurn: readEmpire(state, playerId).totals[bank],
  };
}

/** Both banks of one seat, treasury first. */
export function readBanks(state: GameState, playerId: number): BankFigure[] {
  return BANKS.map((bank) => readBank(state, playerId, bank));
}

/** "437 (+21)": the bank, then its rate in brackets. `poolFigure`, unchanged. */
export function bankValueText(figure: BankFigure): string {
  return poolFigure(figure.held, figure.perTurn);
}

/** "Treasury 437 (+21)". */
export function bankText(figure: BankFigure): string {
  return `${BANK_LABEL[figure.bank]} ${bankValueText(figure)}`;
}

/** "Treasury 437 (+21) · Faith 51 (+2)": every bank given, in the order given. */
export function bankLineText(figures: readonly BankFigure[]): string {
  return figures.map(bankText).join(' · ');
}

/**
 * The line of banks, each label in the quiet ink and each figure in its bank's
 * own ink (gold, faith), set in the tabular mono every number uses.
 */
export function bankLineElement(figures: readonly BankFigure[]): HTMLElement {
  const line = element('p', 'bank-line');
  figures.forEach((figure, index) => {
    if (index > 0) {
      const gap = element('span', 'bank-line-gap', '·');
      gap.setAttribute('aria-hidden', 'true');
      line.append(gap);
    }
    const part = element('span', `bank-figure is-${figure.bank}`);
    part.append(element('span', 'bank-figure-label', BANK_LABEL[figure.bank]));
    part.append(document.createTextNode(' '));
    part.append(element('span', 'bank-figure-value', bankValueText(figure)));
    line.append(part);
  });
  return line;
}

/**
 * Only what is held, with no rate: "437". For a sentence that already says what
 * the number is, such as the price column's "you have 437 gold". Written by
 * `netFigure`, the same rule `poolFigure` uses for the bank, so a treasury in
 * debt reads "−22" here as it does on the top bar.
 */
export function bankHeldText(held: number): string {
  return netFigure(held);
}

/** `bankHeldText` in the bank's own ink. */
export function bankHeldElement(bank: BankId, held: number): HTMLElement {
  return element('span', `bank-held is-${bank}`, bankHeldText(held));
}
