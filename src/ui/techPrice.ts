/**
 * What a technology costs this empire, as every screen quotes it.
 *
 * Since Scientific batch S0 a technology's price is a list: the column price,
 * the charter premium for a charter technology, and one line for each card
 * that changes the price (`explainTechCost` in `src/sim/tech.ts`). The total is
 * the fold of that list (`foldTechCost`). Before S0 every surface read
 * `techDef(id).cost`, which is now only the first line.
 *
 * This module is the one place the interface asks for either. The star
 * chart's node, its hover card, its plan strip, the drawer's research section
 * and the empire panel's research bar all quote the fold through
 * `techCostFor`, and the hover card and the charter card's slip print the list
 * through `techPriceList`. So the drawer and the chart can never show two
 * different totals for one technology (hard rule 5, said about a price).
 *
 * Nothing here works a price out. Each function reads the simulation's list
 * and labels it for print.
 */

import type { GameState, Player } from '../sim/state';
import { type TechCostLine, explainTechCost, foldTechCost } from '../sim/tech';
import { type TechId, isCharterTech } from '../sim/techData';

/**
 * What this technology costs this empire: the fold of its price list.
 *
 * The one reader of the fold in the interface. An ordinary technology with no
 * card on it costs exactly its column, so the figure is the old one there.
 */
export function techCostFor(state: GameState, player: Player, tech: TechId): number {
  return foldTechCost(explainTechCost(state, player, tech));
}

/** One printed line of a price list. */
export interface PriceLine {
  /** What the line is, as the simulation labels it: "Column 7", "Charter +50%". */
  label: string;
  /** Beakers this line adds. The first line is the column price itself. */
  amount: number;
  /**
   * True on the charter premium, which the hover card and the slip ink in the
   * charter sepia, so the one line that says "only you" stands out.
   */
  premium: boolean;
}

/** A technology's whole price, ready to print. */
export interface TechPriceList {
  lines: PriceLine[];
  /** The fold of `lines`, which is the figure on the node's face. */
  total: number;
}

/**
 * Is this line the charter premium?
 *
 * `explainTechCost` writes the premium second, and only for a charter row, so
 * the position and the row's marker together decide it. The label is not
 * parsed, because a label is words and words change.
 */
function isPremiumLine(tech: TechId, index: number): boolean {
  return index === 1 && isCharterTech(tech);
}

/**
 * The price list of one technology for this empire, and its total.
 *
 * Read off `explainTechCost` once; the total is `foldTechCost` of the same
 * lines. A surface prints the list only when it has more than one line: a
 * list of one line ("Column 4", then a total that repeats it) says nothing
 * the node's face does not already say.
 */
export function techPriceList(state: GameState, player: Player, tech: TechId): TechPriceList {
  const lines: readonly TechCostLine[] = explainTechCost(state, player, tech);
  return {
    lines: lines.map((line, index) => ({
      label: line.source,
      amount: line.amount,
      premium: isPremiumLine(tech, index),
    })),
    total: foldTechCost(lines),
  };
}

/**
 * The figure a price line prints: the first line plain ("1150"), every later
 * line signed ("+575", "−258"), because the later lines change the first.
 * A real minus sign, as every signed figure in this interface is written.
 */
export function priceLineFigure(line: PriceLine, index: number): string {
  if (index === 0) return String(line.amount);
  return line.amount < 0 ? `−${Math.abs(line.amount)}` : `+${line.amount}`;
}
