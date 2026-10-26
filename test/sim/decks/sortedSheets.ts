/**
 * **The sorted deck sheets, and the rows they list.** A deck is *sorted* when
 * its sheet's Type column is in the data: each of its rows carries a `type`, so
 * each card fits only a chair of its own type or a Wildcard chair.
 *
 * Dominion was sorted in batch C1, Expansionist in batch E0, Scientific in
 * batch S1b, Commerce in batch T1, Devotion in batch DV1 and Magisterial in
 * batch MG1. A row may carry a type only if one of these sheets lists it: a
 * live or deferred row of a sorted deck's own file, or a shared row in
 * `common.json` that a sorted sheet's shared table lists. Every other row is
 * unsorted. The rule is checked in `dominion.test.ts`; each sorted deck's own
 * test checks that its rows carry the sheet's type.
 *
 * A non-test module, so two test files can share it (CLAUDE.md: importing a
 * `.test.ts` file runs its tests again). The next deck to be sorted joins by
 * one entry in `SORTED_DECKS`.
 */

import {
  type DeckId,
  type OrderId,
  DECK_FILE_ORDERS,
  orderDef,
} from '../../../src/sim/statecraftData';

/** The decks whose types are in the data. */
export const SORTED_DECKS: readonly DeckId[] = [
  'dominion',
  'expansionist',
  'scientific',
  'commerce',
  'devotion',
  'magisterial',
];

const SHEETS = import.meta.glob('../../../docs/decks/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** One deck's sheet, by its file name. */
function sheetOf(deck: DeckId): string {
  const text = SHEETS[`../../../docs/decks/${deck}.md`];
  if (text === undefined) throw new Error(`no sheet for the sorted deck ${deck}`);
  return text;
}

/**
 * The data names of the rows a sheet's shared table lists, rows marked `add`
 * left out (they have no data row yet). The table's columns are Card, Rarity,
 * Also in, Tier, Status, Ability and Type. A "(was …)" note names the data row.
 */
function sharedNames(sheet: string): string[] {
  const start = sheet.indexOf('\n## Shared with another deck');
  if (start < 0) return [];
  const names: string[] = [];
  for (const line of sheet.slice(start + 1).split('\n').slice(1)) {
    if (line.startsWith('## ')) break;
    if (!line.startsWith('| **')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 7 || cells[4]!.startsWith('add')) continue;
    const plain = cells[0]!.replace(/\*\*/g, '').trim();
    const was = /\(was (.+)\)$/.exec(plain);
    names.push(was === null ? plain : was[1]!.trim());
  }
  return names;
}

/** Every row a sorted sheet lists: the rows that may carry a type. */
export function rowsListedOnSortedSheets(): Set<OrderId> {
  const listed = new Set<OrderId>();
  for (const deck of SORTED_DECKS) {
    for (const id of DECK_FILE_ORDERS[deck]) {
      if (orderDef(id).retired !== true) listed.add(id);
    }
    const shared = new Set(sharedNames(sheetOf(deck)));
    for (const id of DECK_FILE_ORDERS.common) {
      const def = orderDef(id);
      if (def.retired !== true && shared.has(def.name) && def.decks.includes(deck)) listed.add(id);
    }
  }
  return listed;
}
