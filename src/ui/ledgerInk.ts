/**
 * **One ink per Ledger class, said once** — the palette the sheet paints from.
 *
 * The user's ruling of 2026-09-15 (`docs/flags.md` (vvvvv)): *"let's add more
 * colors to the ledger … the other colors should be glanceable."* Before it the
 * bar was plain ink at seven weights with the deck's grape in the middle of it,
 * which is the specimen's way of saying *these are the same kind of thing* — and
 * they are not. A class is the answer to "who is making my science", and eight
 * answers a player is meant to tell apart at a glance want eight colours.
 *
 * Where the colours are
 * ---------------------
 * In the stylesheet, with the rest of the interface's palette (`:root`,
 * `src/style.css`, the group named for this sheet) — because that is where the
 * sheet's inks lived already, because a custom property can be reused by a rule
 * without a module being imported into it, and because the values are then one
 * block a designer can retune without opening a screen. This module holds only
 * the **mapping**: which property a class paints from.
 *
 * Why an inline property rather than eight rules a surface
 * --------------------------------------------------------
 * Every surface that draws a class — a bar's slice, the legend's swatch, a
 * curve's shaded band, and whatever band 3 grows when it has figures in it —
 * would otherwise carry eight colour rules of its own, and a ninth class would
 * mean editing every one of them. So a surface is painted by *one* rule reading
 * `--ldg-ink`, and the class's own ink is written onto the element here
 * (`paintLedgerInk`) beside a `data-ledger-class` attribute that says, in the
 * DOM, which class the thing is. One place decides what a class looks like.
 */

import type { LedgerClass } from '../sim/ledgerClass';

/**
 * The custom property each class paints from. Named for the class itself, so a
 * property and the class it belongs to cannot drift apart, and declared as a
 * full record rather than built from a template: a class added to `LedgerClass`
 * must be given an ink here or the build fails, which is the whole point of the
 * palette being one table.
 */
export const LEDGER_INK: Record<LedgerClass, string> = {
  tiles: '--ldg-tiles',
  buildings: '--ldg-buildings',
  deck: '--ldg-deck',
  religion: '--ldg-religion',
  people: '--ldg-people',
  trade: '--ldg-trade',
  wonders: '--ldg-wonders',
  other: '--ldg-other',
};

/** What a painted surface reads its colour out of. One rule, per surface. */
export const LEDGER_INK_PROPERTY = '--ldg-ink';

/** One class's ink, as the value a rule can be handed. */
export function ledgerInk(cls: LedgerClass): string {
  return `var(${LEDGER_INK[cls]})`;
}

/**
 * Paint one element as one class: its ink, and the attribute that says which
 * class it is.
 *
 * The attribute is not decoration — it is how a sheet that cannot be mounted in
 * this test suite is still checkable in a browser, and how a hover or a future
 * focus rule can pick a class out without a second table of selectors.
 */
export function paintLedgerInk(node: HTMLElement | SVGElement, cls: LedgerClass): void {
  node.style.setProperty(LEDGER_INK_PROPERTY, ledgerInk(cls));
  node.dataset.ledgerClass = cls;
}
