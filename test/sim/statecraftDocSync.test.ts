import { describe, expect, it } from 'vitest';

import {
  type Band,
  type CardEffect,
  type DeckId,
  type OrderRarity,
  DECK_IDS,
  DECK_WORDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  TIER_LADDER,
  governmentDef,
  orderDef,
  orderIsDealt,
} from '../../src/sim/statecraftData';

/**
 * The doc↔data sync test (the user's workflow ruling, 2026-09-03): the tables
 * in `docs/orders-and-doctrines.md` are the design worksheet the user edits by
 * hand, and twice now a row has fallen out of one side without the other
 * noticing (Curious Elders and Triumphs vanished from the doc's tables during
 * an edit pass and were only found by accident). A doc table that mirrors data
 * carries a sync test from here on: every live data row appears in its own
 * table by name, and every name in a table names a data row. Retired rows are
 * excluded on both sides — they leave the pools and the doc alike.
 *
 * **Re-cut for the decks rework** (D1a, `docs/plans/decks-rework.md`): the
 * pool tables are deck tables now — one a deck, then the cross-types and the
 * generic pool — with a Band column beside Rarity and Role, the Governments
 * table prints a chair count in place of the M/E/W spread, and the ladder is
 * a table of its own. Every pre-rework Order and Doctrine row is retired, so
 * in D1a the deck tables are empty on both sides and this test holds them
 * empty: the pre-rework tables moved verbatim to
 * `docs/history/orders-and-doctrines-retired.md`, which mirrors nothing. D1b
 * fills the decks, one agent a deck, and a row landed on one side alone fails
 * here.
 */
describe('the orders and doctrines doc mirrors the data', () => {
  // The repo's source-reading pattern: Vite's raw import, so the test runs in
  // the same loader as everything else and needs no node types.
  const docFiles = import.meta.glob('../../docs/orders-and-doctrines.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  /** The doc's section heading for each deck, and for the two shared shelves. */
  const DECK_HEADINGS: Record<DeckId | 'cross' | 'generic', string> = {
    dominion: `### ${DECK_WORDS.dominion}`,
    expansionist: `### ${DECK_WORDS.expansionist}`,
    commerce: `### ${DECK_WORDS.commerce}`,
    devotion: `### ${DECK_WORDS.devotion}`,
    scientific: `### ${DECK_WORDS.scientific}`,
    magisterial: `### ${DECK_WORDS.magisterial}`,
    cross: '### Cross-type',
    generic: '### Generic',
  };

  /** Which shelf a live row belongs on: its one deck, the cross shelf, or the generic one. */
  function shelfOf(id: (typeof ORDER_IDS)[number]): DeckId | 'cross' | 'generic' {
    const home = orderDef(id).decks;
    if (home.length === 0) return 'generic';
    if (home.length === 2) return 'cross';
    return home[0]!;
  }

  /** Every live row on one shelf, in file order. */
  function liveOn(shelf: DeckId | 'cross' | 'generic'): (typeof ORDER_IDS)[number][] {
    return ORDER_IDS.filter((id) => orderIsDealt(id) && shelfOf(id) === shelf);
  }

  /** The table rows under one heading, as cell lists, header and rule skipped. */
  function docRows(heading: string, until = '\n### '): string[][] {
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf(until, start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows: string[][] = [];
    for (const line of section.split('\n')) {
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell: string) => cell.trim());
      if (cells[0] === 'Order' || cells.every((cell) => /^-+$/.test(cell))) continue;
      rows.push(cells);
    }
    return rows;
  }

  /** The Rarity marks (the levelling ruling of 2026-09-04). A blank mark is common. */
  const MARKS: Record<string, OrderRarity> = {
    '●': 'common',
    '◆': 'uncommon',
    '○': 'rare',
    '': 'common',
  };

  /**
   * The **role** (batch F, 2026-09-06 — `docs/history/orders-pass-3.md` §1),
   * derived from the row's own effects rather than read off a field, because a
   * card's kind is a fact about its shapes and a second place to write it down
   * would be a second place to get it wrong.
   */
  type Role = 'E' | 'P' | 'S';

  const DECK_COUNTS = new Set([
    'slottedOrders',
    'unslottedOrders',
    'slottedOrdersOfSlot',
    'rerollsWhileSlotted',
  ]);

  function roleOf(id: (typeof ORDER_IDS)[number]): Role {
    let engine = false;
    let payoff = false;
    function markPays(effect: Extract<CardEffect, { kind: 'pays' }>): void {
      const basis = effect.basis ?? 'flat';
      if (basis === 'count') {
        if (effect.count !== undefined && DECK_COUNTS.has(effect.count)) engine = true;
        else payoff = true;
        return;
      }
      if (basis !== 'flat') {
        payoff = true;
        return;
      }
      if (effect.where === 'hex') {
        if ((effect.on as { test?: string } | undefined)?.test === 'yields') engine = true;
        else if (effect.percent !== undefined || effect.basePercent !== undefined) payoff = true;
        return;
      }
      if (effect.where === 'route') {
        if (effect.share !== undefined) payoff = true;
        return;
      }
      if (effect.where === 'city') {
        const scope = effect.scope;
        if (scope !== undefined && scope.test !== 'capital') payoff = true;
      }
    }
    for (const effect of orderDef(id).effects) {
      switch (effect.kind) {
        case 'cardYieldAmplifier':
        case 'slotPosition':
        case 'periodShorten':
          engine = true;
          break;
        case 'buildingYieldPercent':
          if (effect.appliedLast === true) payoff = true;
          else engine = true;
          break;
        case 'pays':
          markPays(effect);
          break;
        case 'combatLine':
          if (effect.scaled && DECK_COUNTS.has(effect.scaled.count)) engine = true;
          break;
        case 'effectAmplifier':
        case 'percentYields':
          payoff = true;
          break;
        case 'periodic':
          if (effect.count === 'empireYield') payoff = true;
          break;
        default:
          break;
      }
    }
    return engine ? 'E' : payoff ? 'P' : 'S';
  }

  /** The column each mirrored cell sits in, per shelf: the cross table carries a Decks column. */
  function columns(shelf: DeckId | 'cross' | 'generic'): { band: number; rarity: number; role: number; effect: number; decks?: number } {
    return shelf === 'cross'
      ? { decks: 1, band: 2, rarity: 3, role: 4, effect: 5 }
      : { band: 1, rarity: 2, role: 3, effect: 4 };
  }

  it('lists every live order on its deck’s shelf, and nothing else', () => {
    for (const [shelf, heading] of Object.entries(DECK_HEADINGS) as [DeckId | 'cross' | 'generic', string][]) {
      const live = liveOn(shelf).map((id) => orderDef(id).name);
      const doc = docRows(heading).map((cells) => cells[0]!);
      for (const name of live) expect(doc, `${heading} is missing "${name}"`).toContain(name);
      const liveSet = new Set(live);
      for (const name of doc) {
        expect(liveSet.has(name), `${heading} row "${name}" names no live data row`).toBe(true);
      }
    }
  });

  it('gives every live order the band, rarity, role and words its row says', () => {
    for (const [shelf, heading] of Object.entries(DECK_HEADINGS) as [DeckId | 'cross' | 'generic', string][]) {
      const at = columns(shelf);
      const rows = new Map(docRows(heading).map((cells) => [cells[0]!, cells] as const));
      for (const id of liveOn(shelf)) {
        const def = orderDef(id);
        const cells = rows.get(def.name);
        expect(cells, `${heading} has no row for "${def.name}"`).toBeDefined();
        expect(Number(cells![at.band]), `${def.name} (${id}) — the row's band`).toBe(def.band);
        const mark = cells![at.rarity] ?? '';
        expect(MARKS[mark], `${heading}: "${def.name}" carries an unknown mark "${mark}"`).toBeDefined();
        expect(def.rarity, `${def.name} (${id}) — the doc says "${mark}"`).toBe(MARKS[mark]);
        expect(cells![at.role], `${def.name} (${id}) — the row's effects read as`).toBe(roleOf(id));
        expect(def.text, `${def.name} (${id}) carries no ratified text`).toBeDefined();
        expect(cells![at.effect], `${def.name} (${id}) — the row's own words are`).toBe(def.text);
        if (at.decks !== undefined) {
          expect(cells![at.decks], `${def.name} (${id}) — the row's decks`).toBe(
            def.decks.map((deck) => DECK_WORDS[deck]).join(' · '),
          );
        }
      }
    }
  });

  /**
   * A retired row is out of the doc and out of the pools, and it still carries
   * a rarity, a band and a deck list — the fields are required on the row
   * rather than on the live subset, so restoring a withdrawn card is one flag
   * rather than four.
   */
  it('gives every row a rarity, a band and a deck list at all, retired ones included', () => {
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      expect(Object.values(MARKS), id).toContain(def.rarity);
      expect([0, 1, 2, 3] as Band[], id).toContain(def.band);
      expect(Array.isArray(def.decks), id).toBe(true);
      for (const deck of def.decks) expect(DECK_IDS, `${id}: ${deck}`).toContain(deck);
    }
  });

  /**
   * **The ladder** (D1a): the doc's table is `tierLadder` rung for rung — the
   * regular draft count a rung opens at, the chairs it supplies, and its band
   * number, which is its index.
   */
  it('prints the ladder rung for rung', () => {
    const rows = docRows('## The ladder', '\n## ').filter((cells) => cells[0] !== 'Rung');
    expect(rows.length).toBe(TIER_LADDER.length);
    rows.forEach((cells, index) => {
      expect(Number(cells[1]), cells[0]).toBe(index);
      expect(Number(cells[2]), cells[0]).toBe(TIER_LADDER[index]!.drafts);
      expect(Number(cells[3]), cells[0]).toBe(TIER_LADDER[index]!.chairs);
    });
  });

  /** Every row of the Governments table as `name → { chairs, signature }`. */
  function governmentRows(): Map<string, { chairs: string; signature: string }> {
    const heading = '## Governments';
    const start = DOC.indexOf(heading);
    expect(start).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n## ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows = new Map<string, { chairs: string; signature: string }>();
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 5 || cells[0] !== '' || cells[2] === '') continue;
      if (cells[2] === 'Government' || /^-+$/.test(cells[2])) continue;
      rows.set(cells[2], { chairs: cells[3] ?? '', signature: cells[4] ?? '' });
    }
    return rows;
  }

  /**
   * **The chairs** (D1a, universal chairs): the Governments table's Chairs
   * column is `GovernmentDef.chairs`, the one number a government says about
   * seating now. Both directions, as ever.
   */
  it('prints every government’s chairs as the data counts them', () => {
    const doc = new Map([...governmentRows()].map(([name, row]) => [name, row.chairs]));
    for (const id of GOVERNMENT_IDS) {
      const def = governmentDef(id);
      const printed = doc.get(def.name);
      expect(printed, `the Governments table has no row for "${def.name}"`).toBeDefined();
      expect(Number(printed), `${def.name} (${id}) — the data counts`).toBe(def.chairs);
    }
    const names = new Set(GOVERNMENT_IDS.map((id) => governmentDef(id).name));
    for (const name of doc.keys()) {
      expect(names.has(name), `the Governments table row "${name}" names no government`).toBe(true);
    }
    expect(doc.size).toBe(GOVERNMENT_IDS.length);
  });

  /**
   * The **Signature** half (batch B1b, 2026-09-08 — `docs/flags.md` item (zz)):
   * the cells are the rows' `text` **verbatim** — trimmed of the table's own
   * padding and nothing else.
   */
  it('prints every government’s signature in the row’s own ratified words', () => {
    const doc = governmentRows();
    for (const id of GOVERNMENT_IDS) {
      const def = governmentDef(id);
      const printed = doc.get(def.name)?.signature;
      expect(printed, `the Governments table has no row for "${def.name}"`).toBeDefined();
      expect(def.text, `${def.name} (${id}) carries no ratified text`).toBeDefined();
      expect(printed, `${def.name} (${id}) — the row's own words are`).toBe(def.text);
    }
  });
});
