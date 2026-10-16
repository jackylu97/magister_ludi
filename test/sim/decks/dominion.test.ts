/**
 * **The Dominion deck** (D1b, `docs/plans/decks-rework.md` "D1b — the cards").
 *
 * The deck's rows live in `data/decks/dominion.json`, and this file is the
 * register for them. What it checks:
 *
 *   · **the sheet matches the data.** The spec of record is the deck sheet,
 *     `docs/decks/dominion.md`. Since 2026-10-15 it is a compact list: five tier
 *     tables, each row giving a card's name, rarity, status and ability. The
 *     status says how the row relates to the data:
 *       - `implemented`: a data row of that name exists, is dealt, and has the
 *         same rarity, band and text;
 *       - `modify`: a data row exists but needs work, so only its presence is
 *         checked. A renamed card is written "New Name (was Old Name)", and the
 *         old name is the data row's;
 *       - `add`: no data row of that name exists yet.
 *     Every data row that is not retired is on the sheet, once, as
 *     `implemented` or `modify`. A retired row is on no table and dealt by
 *     nobody. `statecraftDocSync.test.ts` checks the live rows' printed words
 *     against `docs/orders-and-doctrines.md`;
 *   · **the Type column matches the data** (batch C1): every sheet row with a
 *     data row, the shared table's included, carries the type the sheet gives
 *     it (`orderType`). Rows marked `add` have no data row and are skipped. No
 *     other row in the game carries a type: every other deck is unsorted until
 *     its own sheet is sorted;
 *   · **one deck, one band, one rarity** on every row of the file;
 *   · **live or deferred, never half**: a row either carries effects and is
 *     dealt, or carries a stated deferral, no effects, and is in no pool
 *     (`orderIsDealt`'s own rule). A text that needs a missing shape is
 *     deferred, never bent into a near fit;
 *   · **every live row speaks**: `describeCard` says a clause for it, and no
 *     surface is handed a raw keyword ref;
 *   · **a seeded draft deals this deck's live rows and nothing else**: no
 *     deferred row, and nothing off the seat's own shelf.
 */

import { describe, expect, it } from 'vitest';

import { type Game } from '../../../src/sim/game';
import { type GameState, type Player, playerById } from '../../../src/sim/state';
import {
  type HandPosition,
  deckPoolOf,
  describeCard,
  drawOrderOffer,
  eligibleFor,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type Band,
  type CardType,
  type DeckId,
  type OrderId,
  type OrderRarity,
  BANDS,
  CARD_TYPES,
  DECK_FILE_ORDERS,
  DECK_FILES,
  DECK_WORDS,
  ORDER_IDS,
  isCardType,
  orderDef,
  orderIsDealt,
  orderType,
} from '../../../src/sim/statecraftData';
import { createGame } from '../newGameHelpers';

// --- the deck sheet, read ----------------------------------------------------

/**
 * **The deck sheet** (`docs/decks/dominion.md`), the spec of record since the
 * deck implementation batch (`docs/plans/deck-implementation.md`).
 */
const docFiles = import.meta.glob('../../../docs/decks/dominion.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const DOC = Object.values(docFiles)[0] as string;

/** The sheet's tier headings, which are the bands. */
const TIERS: Record<string, Band> = { '0': 0, I: 1, II: 2, III: 3, IV: 4 };

/** How a sheet row relates to the data: the first word of its Status cell. */
type DocStatus = 'implemented' | 'modify' | 'add';
const DOC_STATUSES: readonly DocStatus[] = ['implemented', 'modify', 'add'];

/** One card the sheet's tier tables list. */
interface DocCard {
  /** The name the sheet prints, without the bold and the "(was …)" note. */
  name: string;
  /** The name in the "(was …)" note, when the sheet gives one. */
  was?: string;
  rarity: OrderRarity;
  band: Band;
  status: DocStatus;
  /** The word after the colon in the Status cell ("deferred", "revised" …), if any. */
  reason?: string;
  text: string;
  /** The Type cell, lowercased: the chair the card fits once batch C2 lands. */
  type: CardType;
}

/** The Type cell read as a type. A row without one fails here, by name. */
function typeOf(card: string, cell: string | undefined): CardType {
  const type = (cell ?? '').toLowerCase();
  expect(isCardType(type), `"${card}" has no type the game knows ("${cell ?? ''}")`).toBe(true);
  return type as CardType;
}

/** A table row's cells, or `null` for a header, a rule or a line that is not a row. */
function cellsOf(line: string): string[] | null {
  if (!line.startsWith('|')) return null;
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  if (cells[0] === 'Card' || cells.every((cell) => /^-+$/.test(cell))) return null;
  return cells;
}

/** A Card cell read into the printed name and the "(was …)" name, if any. */
function namesOf(cell: string): { name: string; was?: string } {
  const plain = cell.replace(/\*\*/g, '').trim();
  const match = /^(.*?)\s*\(was (.+)\)$/.exec(plain);
  if (match === null) return { name: plain };
  return { name: match[1]!.trim(), was: match[2]!.trim() };
}

/**
 * **The five tier tables of the sheet**, in the sheet's own order. Read from
 * the first tier heading to the first level-two heading that is not a tier, so
 * the shared table (whose rows live in `common.json`) and the notes after it
 * are not read here.
 */
function docCards(): DocCard[] {
  const start = DOC.indexOf('\n## Tier 0');
  expect(start, 'the sheet has a Tier 0 table').toBeGreaterThanOrEqual(0);
  const cards: DocCard[] = [];
  let band: Band | null = null;
  for (const line of DOC.slice(start + 1).split('\n')) {
    const heading = /^## Tier (0|I|II|III|IV)$/.exec(line);
    if (heading) {
      band = TIERS[heading[1]!]!;
      continue;
    }
    if (line.startsWith('## ')) break;
    const cells = cellsOf(line);
    if (cells === null || band === null || cells.length < 4) continue;
    const [head, reason] = cells[2]!.split(':').map((part) => part.trim());
    const status = head as DocStatus;
    expect(DOC_STATUSES, `"${cells[0]}" has an unknown status "${cells[2]}"`).toContain(status);
    cards.push({
      ...namesOf(cells[0]!),
      rarity: cells[1] as OrderRarity,
      band,
      status,
      ...(reason ? { reason } : {}),
      text: cells[3]!,
      type: typeOf(cells[0]!, cells[4]),
    });
  }
  return cards;
}

/** One card the sheet's shared table lists. Its row lives in `data/decks/common.json`. */
interface SharedCard {
  name: string;
  was?: string;
  /** The other deck that may draw it, from the "Also in" cell. */
  alsoIn: DeckId;
  status: DocStatus;
  reason?: string;
  type: CardType;
}

/**
 * **The shared table** ("Shared with another deck"): the cards Dominion shares
 * with one other deck. Its columns are Card, Rarity, Also in, Tier, Status,
 * Ability and Type, and its rows live in `data/decks/common.json`.
 */
function sharedCards(): SharedCard[] {
  const start = DOC.indexOf('\n## Shared with another deck');
  expect(start, 'the sheet has a shared table').toBeGreaterThanOrEqual(0);
  const deckByWord = new Map(
    (Object.entries(DECK_WORDS) as [DeckId, string][]).map(([deck, word]) => [word, deck] as const),
  );
  const cards: SharedCard[] = [];
  // From the line after the heading to the next level-two heading.
  for (const line of DOC.slice(start + 1).split('\n').slice(1)) {
    if (line.startsWith('## ')) break;
    const cells = cellsOf(line);
    if (cells === null || cells.length < 7) continue;
    const [head, reason] = cells[4]!.split(':').map((part) => part.trim());
    const status = head as DocStatus;
    expect(DOC_STATUSES, `"${cells[0]}" has an unknown status "${cells[4]}"`).toContain(status);
    const alsoIn = deckByWord.get(cells[2]!);
    expect(alsoIn, `"${cells[0]}" is shared with an unknown deck "${cells[2]}"`).toBeDefined();
    cards.push({
      ...namesOf(cells[0]!),
      alsoIn: alsoIn!,
      status,
      ...(reason ? { reason } : {}),
      type: typeOf(cells[0]!, cells[6]),
    });
  }
  return cards;
}

/** The name of the data row a sheet row stands for: the "(was …)" name if given. */
const dataNameOf = (card: { name: string; was?: string }): string => card.was ?? card.name;

/** The rows of `data/decks/dominion.json`, in file order. */
const ROWS: readonly OrderId[] = DECK_FILE_ORDERS.dominion;

// A commission (batch C) is live with no effects: its goal and reward are the card.
const isLive = (id: OrderId): boolean =>
  orderDef(id).retired !== true &&
  (orderDef(id).effects.length > 0 || orderDef(id).commission !== undefined);

/** The retired rows: kept for saves, dealt by nobody, and off the sheet. */
const isRetired = (id: OrderId): boolean => orderDef(id).retired === true;

/** The rows the sheet's tier tables must list: every row that is not retired. */
const SHEET_ROWS: readonly OrderId[] = ROWS.filter((id) => !isRetired(id));

describe('the Dominion deck — the file', () => {
  it('names one deck, a band and a rarity on every row, and nothing but Dominion', () => {
    expect(ROWS.length).toBeGreaterThan(0);
    for (const id of ROWS) {
      const def = orderDef(id);
      expect(def.decks, id).toEqual(['dominion']);
      expect(BANDS, id).toContain(def.band);
      expect(['common', 'uncommon', 'rare'], id).toContain(def.rarity);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, `${id} carries no ratified text`).toBeTruthy();
      // Nothing in it is a charter (the ten access rows are Scientific's,
      // Commerce's and Devotion's). Retired rows are kept for saves.
      expect(def.charter, id).toBeUndefined();
    }
    // Ids are unique across the eight files (`decks.test.ts`); within this one,
    // names are unique too — a deck that printed one name twice would deal a
    // hand a player could not read.
    const names = ROWS.map((id) => orderDef(id).name);
    expect(new Set(names).size, 'two rows share a name').toBe(names.length);
  });

  it('mirrors the deck sheet’s five tier tables, card for card', () => {
    const doc = docCards();
    expect(doc.length, 'the doc lists cards under every tier heading').toBeGreaterThan(0);
    const byName = new Map(SHEET_ROWS.map((id) => [orderDef(id).name, id] as const));
    // Every name in the file, retired rows included: names are unique in the
    // file, so a card still to be added may not reuse a retired row's name.
    const everyName = new Set(ROWS.map((id) => orderDef(id).name));
    for (const card of doc) {
      if (card.status === 'add') {
        expect(everyName.has(card.name), `"${card.name}" is marked add but the data has it`).toBe(false);
        if (card.was !== undefined) {
          expect(everyName.has(card.was), `"${card.was}" is marked add but the data has it`).toBe(false);
        }
        continue;
      }
      const id = byName.get(dataNameOf(card));
      expect(id, `the deck file has no row for "${dataNameOf(card)}"`).toBeDefined();
      // Every row the sheet speaks for carries the sheet's type, whatever its status.
      expect(orderType(id!), `${card.name}: the sheet's type`).toBe(card.type);
      if (card.status === 'modify') {
        // A row the sheet calls deferred is one the game does not deal yet.
        if (card.reason === 'deferred') {
          expect(isLive(id!), `${card.name} is marked deferred but is dealt`).toBe(false);
        }
        continue;
      }
      // Implemented: in the data, dealt, and printed exactly as the sheet prints it.
      const def = orderDef(id!);
      expect(card.was, `${card.name} is implemented and renamed`).toBeUndefined();
      expect(isLive(id!), `${card.name} is marked implemented but is not dealt`).toBe(true);
      expect(def.rarity, `${card.name}: the sheet's rarity`).toBe(card.rarity);
      expect(def.band, `${card.name}: the sheet's tier`).toBe(card.band);
      expect(def.text, `${card.name}: the sheet's ability`).toBe(card.text);
    }
    // Every row that is not retired is on the sheet once, as implemented or modify.
    const listed = doc.filter((card) => card.status !== 'add').map(dataNameOf);
    expect(new Set(listed).size, 'a data row is listed twice').toBe(listed.length);
    for (const name of byName.keys()) {
      expect(listed.includes(name), `"${name}" is a row the sheet's tier tables do not list`).toBe(true);
    }
    expect(listed.length).toBe(SHEET_ROWS.length);
    // And the sheet prints no name twice.
    const printed = doc.map((card) => card.name);
    expect(new Set(printed).size, 'the sheet prints a name twice').toBe(printed.length);
  });

  it('mirrors the shared table’s Type column onto its rows in common.json', () => {
    const shared = sharedCards();
    expect(shared.length, 'the shared table lists cards').toBeGreaterThan(0);
    const common = new Map(DECK_FILE_ORDERS.common.map((id) => [orderDef(id).name, id] as const));
    const everyName = new Set(ORDER_IDS.map((id) => orderDef(id).name));
    let checked = 0;
    for (const card of shared) {
      const name = dataNameOf(card);
      if (card.status === 'add') {
        expect(common.has(name), `"${name}" is marked add but common.json has it`).toBe(false);
        continue;
      }
      const id = common.get(name);
      if (id === undefined) {
        // A merged card keeps its row in its old deck file until the merge is
        // built, which moves the row here (the sheet's `merged` status). Its type
        // is checked from then on; until then the row must exist somewhere.
        expect(card.reason, `common.json has no row for "${name}"`).toBe('merged');
        expect(everyName.has(name), `no deck file has a row for "${name}"`).toBe(true);
        continue;
      }
      // The row is the one the sheet means: shared by Dominion and the deck named.
      expect(orderDef(id).decks, name).toContain('dominion');
      expect(orderDef(id).decks, name).toContain(card.alsoIn);
      expect(orderType(id), `${name}: the sheet's type`).toBe(card.type);
      checked += 1;
    }
    expect(checked, 'the shared rows were checked at all').toBeGreaterThan(0);
  });

  it('types only the rows its sheet lists, and leaves every other row unsorted', () => {
    // The rows this sheet speaks for: its own file's live rows, and the rows of
    // common.json its shared table lists.
    const sharedNames = new Set(
      sharedCards()
        .filter((card) => card.status !== 'add')
        .map(dataNameOf),
    );
    const sorted = new Set<OrderId>([
      ...SHEET_ROWS,
      ...DECK_FILE_ORDERS.common.filter((id) => sharedNames.has(orderDef(id).name)),
    ]);
    expect(sorted.size).toBeGreaterThan(SHEET_ROWS.length);
    for (const id of ORDER_IDS) {
      if (sorted.has(id)) {
        expect(CARD_TYPES, `${id} is on the sheet and has no type`).toContain(orderDef(id).type);
        expect(orderType(id), id).toBe(orderDef(id).type);
        continue;
      }
      // Every other deck, the generic rows, the shared rows Dominion's sheet
      // does not list, and every retired row: unsorted until a sheet sorts them.
      expect(orderDef(id).type, `${id} carries a type no sorted sheet gives it`).toBeUndefined();
      expect(orderType(id), id).toBe('unsorted');
    }
    // And the other five deck files are untouched by this sheet.
    for (const file of DECK_FILES) {
      if (file === 'dominion' || file === 'common') continue;
      for (const id of DECK_FILE_ORDERS[file]) expect(orderType(id), id).toBe('unsorted');
    }
  });

  it('keeps every retired row off the sheet’s tables, and deals none of them', () => {
    const listed = new Set(docCards().flatMap((card) => [card.name, dataNameOf(card)]));
    for (const id of ROWS) {
      if (!isRetired(id)) continue;
      expect(listed.has(orderDef(id).name), `${id} is retired and still on the sheet`).toBe(false);
      expect(orderIsDealt(id), `${id} is retired and still dealt`).toBe(false);
    }
  });

  /**
   * **Live or deferred, never half** — the brief's one rule. A row whose text
   * fits the vocabulary carries effects and is dealt; a row whose text needs a
   * shape, predicate, occasion, count or basis that does not exist carries its
   * sentence in plain words, no effects, and is in no pool. Nothing is bent
   * into a near-fit (CLAUDE.md: always defer, never bend).
   */
  it('is every row either live with effects or deferred with a stated sentence', () => {
    for (const id of SHEET_ROWS) {
      const def = orderDef(id);
      if (isLive(id)) {
        expect(def.deferred, `${id} is live and still carries a deferral`).toBeUndefined();
        expect(orderIsDealt(id), id).toBe(true);
        continue;
      }
      const deferred = def.deferred ?? [];
      expect(deferred.length, `${id} has no effects and no stated deferral`).toBeGreaterThan(0);
      for (const sentence of deferred) {
        expect(sentence, id).toBeTruthy();
        // Player prose: no identifiers, and no keyword refs to strip.
        expect(sentence, id).not.toMatch(/\[\[/);
      }
      expect(orderIsDealt(id), `${id} is deferred and still dealt`).toBe(false);
    }
    // The deck is not all deferral: the shapes that exist carry most of it.
    expect(SHEET_ROWS.filter(isLive).length).toBeGreaterThan(SHEET_ROWS.length / 3);
  });

  it('describes every live row in words, with no raw keyword left on a surface', () => {
    for (const id of ROWS) {
      if (!isLive(id)) continue;
      const clauses = describeCard(id);
      expect(clauses.length, `${id} says nothing`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.text, id).toBeTruthy();
        expect(stripRefs(clause.text), `${id}: "${clause.text}"`).not.toMatch(/\[\[/);
      }
    }
  });
});

// --- the draw -------------------------------------------------------------------

/** A seat holding Dominion, beside a plain neighbour. */
function seated(seed = 7): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, decks: ['dominion', 'magisterial'] },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

/** Every card this seat is dealt over a run of seeded hands. */
function dealt(state: GameState, player: Player, hands: number): OrderId[] {
  const seen: OrderId[] = [];
  for (let n = 1; n <= hands; n++) {
    player.statecraft.drafts = n;
    delete player.statecraft.pendingOrder;
    const offer = drawOrderOffer(state, player);
    expect(offer.positions, `hand ${n}`).toBeDefined();
    for (const position of offer.positions as HandPosition[]) expect(position).toBeDefined();
    seen.push(...offer.options);
  }
  return seen;
}

describe('the Dominion deck — the draw', () => {
  it('deals a Dominion seat this deck’s live rows, its commons and its crosses, and nothing else', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const pool = new Set(deckPoolOf(g.state, ada));
    const dominion = new Set<OrderId>(ROWS);
    let fromDeck = 0;
    for (const id of dealt(g.state, ada, 24)) {
      expect(pool.has(id), `${id} was dealt off this seat's shelf`).toBe(true);
      expect(orderIsDealt(id), `${id} is dealt and not dealt`).toBe(true);
      if (!dominion.has(id)) continue;
      fromDeck += 1;
      // Never a deferred row, and never a row above the band the seat has
      // reached: a fresh seat is at the opening rung and in the first age.
      expect(isLive(id), `${id} is deferred and was dealt`).toBe(true);
      expect(orderDef(id).band, `${id} is above the seat's band`).toBe(0);
    }
    expect(fromDeck, 'the seat was dealt Dominion cards at all').toBeGreaterThan(0);
  });

  it('keeps every deferred row out of the eligible shelf, at every band', () => {
    const g = seated(11);
    const ada = playerById(g.state, 0)!;
    // Open every rung and every age: the whole deck is on the shelf except the
    // rows that wait on a shape.
    ada.statecraft.drafts = 29;
    for (const tech of ['bronzeWorking', 'ironWorking', 'alchemy']) {
      if (!ada.techsResearched.includes(tech as never)) ada.techsResearched.push(tech as never);
    }
    const eligible = new Set(eligibleFor(g.state, ada));
    for (const id of ROWS) {
      if (isLive(id)) continue;
      expect(eligible.has(id), `${id} is deferred or retired and on the shelf`).toBe(false);
    }
  });

  it('deals the same hand from the same generator state', () => {
    const a = seated(3);
    const b = seated(3);
    expect(dealt(b.state, playerById(b.state, 0)!, 8)).toEqual(
      dealt(a.state, playerById(a.state, 0)!, 8),
    );
  });
});
