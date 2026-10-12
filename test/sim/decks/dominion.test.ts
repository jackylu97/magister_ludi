/**
 * **The Dominion deck, entered** (D1b, `docs/plans/decks-rework.md` "D1b — the
 * cards"; the design of record is `docs/six-decks-first-cut.md`, its
 * "Dominion" section and the "Card-reading conventions" above it).
 *
 * The deck's eighty-five rows live in `data/decks/dominion.json`, and this file
 * is the register for them. What it pins, in the order the brief asks it:
 *
 *   · **the doc is the table** — the four tier tables of the design doc's
 *     Dominion section are read here, card for card, and every one of them has
 *     a row of that name, that rarity and that band. A card the user adds to
 *     the doc and nobody enters fails here, and so does a row nobody wrote into
 *     the doc. The design doc is edited live, so this is the sync of record
 *     for the deck's *contents*; `statecraftDocSync.test.ts` is the sync for the
 *     live rows' printed words against `docs/orders-and-doctrines.md`;
 *   · **one deck, one band, one rarity** on every row of the file;
 *   · **live or deferred, never half** — a row carries effects and is dealt, or
 *     it carries a stated deferral, no effects, and is in no pool
 *     (`orderIsDealt`'s own rule). Never bent into a near-fit: the shapes the
 *     deferred rows wait on are the deck's shape audit, and D2's input;
 *   · **every live row speaks** — `describeCard` says a clause for it and no
 *     surface is handed a raw keyword ref;
 *   · **a seeded draft deals this deck's live rows and nothing else** — no
 *     deferred row, nothing off the seat's own shelf.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame } from '../../../src/sim/game';
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
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';

// --- the design doc, read ------------------------------------------------------

const docFiles = import.meta.glob('../../../docs/six-decks-first-cut.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const DOC = Object.values(docFiles)[0] as string;

/** The Rarity marks the design doc's tier tables print. */
const MARKS: Record<string, OrderRarity> = {
  C: 'common',
  U: 'uncommon',
  R: 'rare',
};

/** One card the doc's Dominion section lists: its name, its rarity, its band. */
interface DocCard {
  name: string;
  rarity: OrderRarity;
  band: Band;
  text: string;
}

/**
 * **The four tier tables of the doc's Dominion section**, in the doc's own
 * order.
 *
 * Sliced between the section's heading and the next deck's, so the tier
 * headings inside it are the only ones read — the doc numbers its tiers the
 * way the ladder numbers its rungs (`#### Tier 0 — Early`), which is the band.
 */
function docCards(): DocCard[] {
  const start = DOC.indexOf('### Dominion');
  expect(start, 'the design doc has a Dominion section').toBeGreaterThanOrEqual(0);
  const end = DOC.indexOf('\n### Expansionist', start);
  const section = DOC.slice(start, end === -1 ? undefined : end);
  const cards: DocCard[] = [];
  let band: Band | null = null;
  for (const line of section.split('\n')) {
    const heading = /^#### Tier (\d) /.exec(line);
    if (heading) {
      band = Number(heading[1]) as Band;
      continue;
    }
    if (!line.startsWith('|') || band === null) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 3) continue;
    if (cells[0] === 'Card' || cells.every((cell) => /^-+$/.test(cell))) continue;
    const rarity = MARKS[cells[1] ?? ''];
    if (rarity === undefined) continue;
    cards.push({ name: cells[0]!, rarity, band, text: cells[2]! });
  }
  return cards;
}

/** The rows of `data/decks/dominion.json`, in file order. */
const ROWS: readonly OrderId[] = DECK_FILE_ORDERS.dominion;

// A commission (batch C) is live with no effects: its goal and reward are the card.
const isLive = (id: OrderId): boolean =>
  orderDef(id).effects.length > 0 || orderDef(id).commission !== undefined;

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
      // D1b enters a deck; nothing in it is withdrawn and nothing in it is a
      // charter (the ten access rows are Scientific's, Commerce's and
      // Devotion's).
      expect(def.retired, id).toBeUndefined();
      expect(def.charter, id).toBeUndefined();
    }
    // Ids are unique across the eight files (`decks.test.ts`); within this one,
    // names are unique too — a deck that printed one name twice would deal a
    // hand a player could not read.
    const names = ROWS.map((id) => orderDef(id).name);
    expect(new Set(names).size, 'two rows share a name').toBe(names.length);
  });

  it('mirrors the design doc’s four tier tables, card for card', () => {
    const doc = docCards();
    expect(doc.length, 'the doc lists cards under every tier heading').toBeGreaterThan(0);
    const byName = new Map(ROWS.map((id) => [orderDef(id).name, id] as const));
    for (const card of doc) {
      const id = byName.get(card.name);
      expect(id, `the deck file has no row for "${card.name}"`).toBeDefined();
      const def = orderDef(id!);
      expect(def.rarity, `${card.name} — the doc's mark`).toBe(card.rarity);
      expect(def.band, `${card.name} — the doc's tier`).toBe(card.band);
      expect(def.text, `${card.name} — the doc's own words`).toBe(card.text);
    }
    const listed = new Set(doc.map((card) => card.name));
    for (const name of byName.keys()) {
      expect(listed.has(name), `"${name}" is a row the doc's Dominion tables do not list`).toBe(true);
    }
    expect(ROWS.length).toBe(doc.length);
  });

  /**
   * **Live or deferred, never half** — the brief's one rule. A row whose text
   * fits the vocabulary carries effects and is dealt; a row whose text needs a
   * shape, predicate, occasion, count or basis that does not exist carries its
   * sentence in plain words, no effects, and is in no pool. Nothing is bent
   * into a near-fit (CLAUDE.md: always defer, never bend).
   */
  it('is every row either live with effects or deferred with a stated sentence', () => {
    for (const id of ROWS) {
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
    expect(ROWS.filter(isLive).length).toBeGreaterThan(ROWS.length / 3);
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
      expect(eligible.has(id), `${id} is deferred and on the shelf`).toBe(false);
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
