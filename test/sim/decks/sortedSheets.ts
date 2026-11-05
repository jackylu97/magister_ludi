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

import { expect } from 'vitest';

import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import {
  type Band,
  type DeckId,
  type OrderId,
  DECK_FILE_DOCTRINES,
  DECK_FILE_ORDERS,
  doctrineDef,
  governmentTierForDoctrineBand,
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

// --- the Doctrine tables ---------------------------------------------------------

/** The sheets' tier headings, which are the bands. */
const SHEET_TIERS: Record<string, Band> = { '0': 0, I: 1, II: 2, III: 3, IV: 4 };

/** One Doctrine a sheet's tier tables list. */
export interface SheetDoctrine {
  name: string;
  /** The tier heading the table sits under, as a band. */
  band: Band;
  /** The government tier the line above the table says offers it. */
  offeredAt: number;
  text: string;
}

/**
 * **A sheet's Doctrine tables** (moved here from `dominion.test.ts` in batch DT1,
 * so all six decks read theirs one way). Under each tier heading, the table after
 * "**Doctrines,** offered with the tier-N governments:", up to the next bold line
 * or heading. Three columns: Doctrine, Build and Text.
 *
 * A table under any other line is not read. So a sheet whose Doctrines are still
 * proposed, under a heading of its own, reads as having none.
 */
export function sheetDoctrines(deck: DeckId): SheetDoctrine[] {
  const sheet = sheetOf(deck);
  const start = sheet.indexOf('\n## Tier 0');
  expect(start, `the ${deck} sheet has a Tier 0 table`).toBeGreaterThanOrEqual(0);
  const doctrines: SheetDoctrine[] = [];
  let band: Band | null = null;
  let offeredAt: number | null = null;
  for (const line of sheet.slice(start + 1).split('\n')) {
    const heading = /^## Tier (0|I|II|III|IV)$/.exec(line);
    if (heading) {
      band = SHEET_TIERS[heading[1]!]!;
      offeredAt = null;
      continue;
    }
    if (line.startsWith('## ')) break;
    const offered = /^\*\*Doctrines,\*\* offered with the tier-(\d+) governments:/.exec(line);
    if (offered) {
      offeredAt = Number(offered[1]);
      continue;
    }
    if (line.startsWith('**')) {
      offeredAt = null;
      continue;
    }
    if (offeredAt === null || band === null || !line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells[0] === 'Doctrine' || cells.every((cell) => /^-+$/.test(cell))) continue;
    doctrines.push({ name: cells[0]!.replace(/\*\*/g, '').trim(), band, offeredAt, text: cells[2]! });
  }
  return doctrines;
}

/**
 * **Holds a deck's Doctrine rows to its sheet** (batch DT1). Each data row that is
 * not retired is on the sheet, in the same name, tier and text, and it is complete:
 * effects, a flavour line, and clauses with no raw keyword ref. A retired row is
 * on no table.
 *
 * **A sheet row with no data row passes**, so a sheet can carry its whole table
 * while the batches fill it. Batch DT20 makes that a failure.
 */
export function expectSheetDoctrinesMatchData(deck: DeckId): void {
  const sheet = sheetDoctrines(deck);
  // Names are unique across the tables.
  expect(new Set(sheet.map((row) => row.name)).size, `${deck}: a name is listed twice`).toBe(sheet.length);
  for (const row of sheet) {
    // There are no Tier 0 Doctrines (the user, 2026-10-15), and the heading names
    // the government tier the one pairing says.
    expect(row.band, `${row.name}'s tier`).toBeGreaterThan(0);
    expect(row.offeredAt, row.name).toBe(governmentTierForDoctrineBand(row.band));
  }
  for (const id of DECK_FILE_DOCTRINES[deck]) {
    const def = doctrineDef(id);
    const row = sheet.find((doctrine) => doctrine.name === def.name);
    if (def.retired === true) {
      expect(row, `${id} is retired and still on the sheet`).toBeUndefined();
      continue;
    }
    expect(row, `${id} ("${def.name}") is not on the ${deck} sheet`).toBeDefined();
    expect(def.band, `${id}'s tier`).toBe(row!.band);
    expect(def.text, `${id}'s text`).toBe(row!.text);
    expect(def.tier, `${id}'s government tier`).toBe(row!.offeredAt);
    expect(def.decks, id).toEqual([deck]);
    expect(def.deferred, id).toBeUndefined();
    expect(def.effects.length, `${id} has no effects`).toBeGreaterThan(0);
    expect(def.flavor, `${id} has no flavour line`).toBeTruthy();
    // A live Doctrine speaks, in clauses with no raw keyword ref.
    const clauses = describeCard(id);
    expect(clauses.length, `${id} has no clauses`).toBeGreaterThan(0);
    for (const clause of clauses) expect(stripRefs(clause.text), id).not.toContain('[[');
  }
}
