/**
 * The Expansionist deck's own file, `data/decks/expansionist.json`, checked
 * against its sheet (`docs/decks/expansionist.md`).
 *
 * What is pinned here:
 *   · **the sheet matches the data.** Since 2026-10-16 the sheet is a compact
 *     list in Dominion's format: five tier tables (Card | Rarity | Status |
 *     Ability | Type) and a shared table. Since batch E7 it lists the cards of
 *     the themes pass of 2026-10-21. The status says how a row relates to
 *     the data:
 *       - `implemented`: a data row of that name exists, is dealt, and has the
 *         same rarity, tier and text;
 *       - `modify`: a data row exists but needs work, so only its presence is
 *         checked, and a row marked `modify: deferred` is not dealt;
 *       - `add`: no data row of that name exists yet, in this file or in
 *         `common.json`.
 *     Every data row that is not retired is on the tier tables once; a retired
 *     row is on none. The shared table's rows live in `common.json` and name
 *     this deck and the deck beside them. The two counts tables count the rows;
 *   · **every listed row carries the sheet's type.** Since batch E0 the deck
 *     is sorted in play: each row the sheet lists, and each shared row in its
 *     shared table, has the Type cell's type in the data. A retired row has no
 *     type. Every Type cell must be one of the four types;
 *   · every row names this deck and carries a band, rarity, name, flavour and
 *     text; the only charters are the four tended-work unlocks, one of them
 *     (The Forest Gardens) retired;
 *   · the sheet's cuts are retired and dealt to nobody;
 *   · every dealt row describes itself in words with no raw reference, and
 *     every deferred row carries a plain sentence and a note;
 *   · a seeded draft under Pachacuti (the Expansionist leader) deals only rows
 *     this seat may be offered;
 *   · the tended works: the card gate, counting as wild land, no pillage, the
 *     felled wood taking its garden with it, and Six Gardens' count;
 *   · the other shapes the deck added: the "Needs tended land" draft gate, the
 *     bought-hex tally, the founding claim, the worked-hex scope and the
 *     surveyed-hill test.
 *
 * The doc table in `docs/orders-and-doctrines.md` is checked by
 * `statecraftDocSync.test.ts`, not here.
 */

import { describe, expect, it } from 'vitest';

import { type Game } from '../../../src/sim/game';
import {
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cardUnlocksImprovement,
  cityScopeAdmits,
  describeCard,
  drawOrderOffer,
  eligibleFor,
  slotOrderAt,
  slotOrderError,
  stripRefs,
  tallyOf,
  tileConditionHolds,
} from '../../../src/sim/statecraft';
import {
  buildImprovementAt,
  chopFeatureAt,
  improvementErrorAt,
  pillageAt,
  pillageError,
} from '../../../src/sim/improvements';
import { foundCityAt, ownedTiles, purchaseTileAt } from '../../../src/sim/cities';
import { commissionFigure } from '../../../src/sim/commissions';
import { raiseImprovement } from '../../../src/sim/map';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { at, bareState, woodedWorker } from '../improvementHelpers';
import {
  type Band,
  type CardType,
  type CityScope,
  type CardEffect,
  type CardEffectKind,
  type DeckId,
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  DECK_WORDS,
  TIER_LADDER,
  ORDER_IDS,
  isCardType,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';
import { createGame } from '../newGameHelpers';

/** The deck's own rows, in file order — what every draw and every screen walks. */
const ROWS: readonly OrderId[] = DECK_FILE_ORDERS.expansionist;

// --- the deck sheet, read ----------------------------------------------------

/** The deck sheet, the spec of record for the deck's cards. */
const docFiles = import.meta.glob('../../../docs/decks/expansionist.md', {
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
  /** The Type cell, lowercased. */
  type: CardType;
}

/** One card the sheet's shared table lists. Its row lives in `data/decks/common.json`. */
interface SharedCard extends DocCard {
  /** The other deck that may draw it, from the "Also in" cell. */
  alsoIn: DeckId;
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

/** A Status cell read into its first word and the reason after the colon. */
function statusOf(card: string, cell: string): { status: DocStatus; reason?: string } {
  const [head, reason] = cell.split(':').map((part) => part.trim());
  expect(DOC_STATUSES, `"${card}" has an unknown status "${cell}"`).toContain(head);
  return { status: head as DocStatus, ...(reason ? { reason } : {}) };
}

/**
 * **The five tier tables of the sheet**, in the sheet's own order: from the
 * first tier heading to the first level-two heading that is not a tier, so the
 * shared table and the open section after it are not read here.
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
    if (cells === null || band === null || cells.length < 5) continue;
    cards.push({
      ...namesOf(cells[0]!),
      rarity: cells[1] as OrderRarity,
      band,
      ...statusOf(cells[0]!, cells[2]!),
      text: cells[3]!,
      type: typeOf(cells[0]!, cells[4]),
    });
  }
  return cards;
}

/**
 * **The shared table** ("Shared with another deck"): Card, Rarity, Also in,
 * Tier, Status, Ability and Type. Its rows live in `data/decks/common.json`.
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
    const alsoIn = deckByWord.get(cells[2]!);
    expect(alsoIn, `"${cells[0]}" is shared with an unknown deck "${cells[2]}"`).toBeDefined();
    expect(Object.keys(TIERS), `"${cells[0]}" has an unknown tier "${cells[3]}"`).toContain(cells[3]);
    cards.push({
      ...namesOf(cells[0]!),
      rarity: cells[1] as OrderRarity,
      alsoIn: alsoIn!,
      band: TIERS[cells[3]!]!,
      ...statusOf(cells[0]!, cells[4]!),
      text: cells[5]!,
      type: typeOf(cells[0]!, cells[6]),
    });
  }
  return cards;
}

/**
 * **A counts table** of the sheet, read by its header row: each body row's
 * first cell (with the bold taken off) against its number cells, in order.
 */
function countsTable(header: string): Map<string, number[]> {
  const start = DOC.indexOf(header);
  expect(start, `the sheet has the table "${header}"`).toBeGreaterThanOrEqual(0);
  const rows = new Map<string, number[]>();
  for (const line of DOC.slice(start).split('\n').slice(2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.replace(/\*\*/g, '').trim());
    rows.set(
      cells[0]!,
      cells.slice(1).filter((cell) => /^\d+$/.test(cell)).map(Number),
    );
  }
  return rows;
}

/** The name of the data row a sheet row stands for: the "(was …)" name if given. */
const dataNameOf = (card: { name: string; was?: string }): string => card.was ?? card.name;

/** The rows the sheet's tier tables must list: every row that is not retired. */
const SHEET_ROWS: readonly OrderId[] = ROWS.filter((id) => orderDef(id).retired !== true);

/**
 * A row the draft deals: one with effects, a commission (a goal and a reward)
 * or a charter (the tended-work unlocks). Since the deck implementation batch
 * (`docs/plans/deck-implementation.md`) this is `orderIsDealt`'s own answer.
 */
function isLive(id: OrderId): boolean {
  return orderIsDealt(id);
}

/** The sheet's Proposed cuts: kept for saves, out of every pool. */
const RETIRED = ROWS.filter((id) => orderDef(id).retired === true);
const LIVE = ROWS.filter(isLive);
const DEFERRED = ROWS.filter((id) => !isLive(id) && orderDef(id).retired !== true);

/**
 * The four tended-work unlocks, the only charters this deck carries. The
 * Forest Gardens is retired (the user's cut of 2026-10-16), but its row stays,
 * so a game that already holds it keeps its gardens.
 */
const TENDED_UNLOCKS: Readonly<Record<string, string>> = {
  theForestGardens: 'forestGarden',
  theFishTraps: 'fishTraps',
  theWildOrchards: 'wildOrchard',
  theBurningSeason: 'burnedCountry',
};

const RARITIES: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];

describe('the Expansionist deck, as entered', () => {
  it('carries rows at all, and they fold into the one registry', () => {
    expect(ROWS.length).toBeGreaterThan(0);
    for (const id of ROWS) {
      expect(ORDER_IDS, id).toContain(id);
      expect(orderDef(id), id).toBeDefined();
    }
  });

  it('names this deck on every row, and nothing else', () => {
    for (const id of ROWS) expect(orderDef(id).decks, id).toEqual(['expansionist']);
  });

  it('gives every row a valid band and rarity, a name, a flavour and its ratified words', () => {
    for (const id of ROWS) {
      const def = orderDef(id);
      expect(BANDS as readonly Band[], id).toContain(def.band);
      expect(RARITIES, id).toContain(def.rarity);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, id).toBeTruthy();
      // The rows are written after the rework, so neither old field is on them
      // (`OrderDef.pool` / `.slot`: "a row written after the rework carries
      // neither"). The only charters are the four tended-work unlocks, each
      // naming its own improvement row.
      expect(def.pool, id).toBeUndefined();
      expect(def.slot, id).toBeUndefined();
      const work = TENDED_UNLOCKS[id];
      if (work === undefined) expect(def.charter, id).toBeUndefined();
      else expect(def.charter, id).toEqual({ unlocks: { improvement: work } });
    }
  });

  it('retires the sheet\'s cuts, deals none of them, and types none of them', () => {
    // 31 proposed cuts, since batch E0 The Forest Gardens and Daughter Towns,
    // and since batch E7 the fifteen rows the themes pass cut (fourteen live
    // rows and the deferred Public Works).
    expect(RETIRED.length).toBe(48);
    for (const id of RETIRED) {
      expect(orderIsDealt(id), id).toBe(false);
      expect(ordersForDecks(['expansionist']), id).not.toContain(id);
      expect(orderDef(id).type, `${id} is retired and carries a type`).toBeUndefined();
    }
  });

  it('gives every row a lowerCamel id, unique across all eight files', () => {
    for (const id of ROWS) expect(id, id).toMatch(/^[a-z][A-Za-z0-9]*$/);
    // `foldOrders` throws at load on a collision; this is the register saying so
    // by name before a stack trace does.
    const seen = new Map<string, string>();
    for (const file of Object.keys(DECK_FILE_ORDERS) as (keyof typeof DECK_FILE_ORDERS)[]) {
      for (const id of DECK_FILE_ORDERS[file]) {
        expect(seen.has(id), `${id} is written twice: ${seen.get(id)} and ${file}`).toBe(false);
        seen.set(id, file);
      }
    }
    expect(new Set(ROWS).size).toBe(ROWS.length);
  });

  it('spreads the rows across the five bands the design doc’s tiers name', () => {
    const bands = new Set(ROWS.map((id) => orderDef(id).band));
    // Band 4 is Tier IV (batch F); The Corvée and The General Levy sit there.
    expect([...bands].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('the Expansionist deck — the sheet', () => {
  it('mirrors the deck sheet’s five tier tables, card for card', () => {
    const doc = docCards();
    expect(doc.length, 'the sheet lists cards under every tier heading').toBeGreaterThan(0);
    const byName = new Map(SHEET_ROWS.map((id) => [orderDef(id).name, id] as const));
    // Every name in this file, retired rows included, and every name in
    // common.json: a card still to be added may reuse none of them.
    const taken = new Set([
      ...ROWS.map((id) => orderDef(id).name),
      ...DECK_FILE_ORDERS.common.map((id) => orderDef(id).name),
    ]);
    for (const card of doc) {
      if (card.status === 'add') {
        expect(taken.has(card.name), `"${card.name}" is marked add but the data has it`).toBe(false);
        continue;
      }
      const id = byName.get(dataNameOf(card));
      expect(id, `the deck file has no row for "${dataNameOf(card)}"`).toBeDefined();
      // Sorted since batch E0: every listed row carries the sheet's type.
      expect(orderDef(id!).type, `${card.name}: the sheet's type`).toBe(card.type);
      if (card.status === 'modify') {
        // A row the sheet calls deferred is one the game does not deal yet.
        if (card.reason === 'deferred') {
          expect(orderIsDealt(id!), `${card.name} is marked deferred but is dealt`).toBe(false);
        }
        continue;
      }
      // Implemented: in the data, dealt, and printed exactly as the sheet prints it.
      const def = orderDef(id!);
      expect(card.was, `${card.name} is implemented and renamed`).toBeUndefined();
      expect(orderIsDealt(id!), `${card.name} is marked implemented but is not dealt`).toBe(true);
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
    // And the sheet prints no name twice, the shared table's included.
    const printed = [...doc, ...sharedCards()].map((card) => card.name);
    expect(new Set(printed).size, 'the sheet prints a name twice').toBe(printed.length);
  });

  it('mirrors the shared table onto its rows in common.json', () => {
    const shared = sharedCards();
    expect(shared.length, 'the shared table lists cards').toBeGreaterThan(0);
    const common = new Map(
      DECK_FILE_ORDERS.common
        .filter((id) => orderDef(id).retired !== true)
        .map((id) => [orderDef(id).name, id] as const),
    );
    let typed = 0;
    for (const card of shared) {
      const name = dataNameOf(card);
      if (card.status === 'add') {
        expect(common.has(name), `"${name}" is marked add but common.json has it`).toBe(false);
        continue;
      }
      const id = common.get(name);
      expect(id, `common.json has no row for "${name}"`).toBeDefined();
      // The row is the one the sheet means: shared by Expansionist and the deck named.
      const def = orderDef(id!);
      expect(def.decks, name).toContain('expansionist');
      expect(def.decks, name).toContain(card.alsoIn);
      // Every shared row carries the sheet's type (batch E0 typed the nine
      // shared with the four decks not yet sorted; C1 typed Dominion's five).
      expect(def.type, `${name}: the sheet's type`).toBe(card.type);
      typed += 1;
      if (card.status === 'modify') {
        if (card.reason === 'deferred') {
          expect(orderIsDealt(id!), `${name} is marked deferred but is dealt`).toBe(false);
        }
        continue;
      }
      expect(orderIsDealt(id!), `${name} is marked implemented but is not dealt`).toBe(true);
      expect(def.rarity, `${name}: the sheet's rarity`).toBe(card.rarity);
      expect(def.band, `${name}: the sheet's tier`).toBe(card.band);
      expect(def.text, `${name}: the sheet's ability`).toBe(card.text);
    }
    expect(typed, 'every shared row in the data was checked').toBe(
      shared.filter((card) => card.status !== 'add').length,
    );
    expect(typed, 'the shared rows were checked at all').toBeGreaterThan(0);
  });

  it('keeps every retired row off the sheet’s tables, and deals none of them', () => {
    const listed = new Set(docCards().flatMap((card) => [card.name, dataNameOf(card)]));
    for (const id of ROWS) {
      if (orderDef(id).retired !== true) continue;
      expect(listed.has(orderDef(id).name), `${id} is retired and still on the sheet`).toBe(false);
      expect(orderIsDealt(id), `${id} is retired and still dealt`).toBe(false);
    }
  });

  it('counts its rows in the two counts tables', () => {
    const doc = docCards();
    const shared = sharedCards();
    const tierWords = Object.keys(TIERS);
    const status = countsTable('| Tier | Implemented | Modify | Add | All |');
    const types = countsTable('| Tier | Military | Economic | Civic | Wildcard |');
    const byStatus = (cards: readonly DocCard[]): number[] => {
      const counts = DOC_STATUSES.map((s) => cards.filter((card) => card.status === s).length);
      return [...counts, cards.length];
    };
    const byType = (cards: readonly DocCard[]): number[] =>
      (['military', 'economic', 'civic', 'wildcard'] as const).map(
        (t) => cards.filter((card) => card.type === t).length,
      );
    for (const word of tierWords) {
      const cards = doc.filter((card) => card.band === TIERS[word]);
      expect(status.get(`Tier ${word}`), `Tier ${word}'s status counts`).toEqual(byStatus(cards));
      expect(types.get(`Tier ${word}`), `Tier ${word}'s type counts`).toEqual(byType(cards));
    }
    expect(status.get('All'), 'the status totals').toEqual(byStatus(doc));
    expect(types.get('All'), 'the type totals').toEqual(byType(doc));
    expect(status.get('Shared'), 'the shared status counts').toEqual(byStatus(shared));
    expect(types.get('Shared'), 'the shared type counts').toEqual(byType(shared));
  });
});

describe('the live rows', () => {
  it('deals them, and describes every clause in words', () => {
    expect(LIVE.length).toBeGreaterThan(0);
    for (const id of LIVE) {
      expect(orderIsDealt(id), id).toBe(true);
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text, id).toBeTruthy();
    }
  });

  it('leaves no keyword reference raw on any surface', () => {
    for (const id of LIVE) {
      for (const clause of describeCard(id)) {
        expect(stripRefs(clause.text), `${id}: ${clause.text}`).not.toContain('[[');
      }
    }
  });

  it('writes every effect in the vocabulary’s own kinds', () => {
    // The register at the row's scale: a `kind` the union does not carry is a
    // row the one evaluator would fall through, and a shape invented for a card
    // is exactly what the house rule forbids.
    const kinds = new Set<CardEffectKind>([
      'pays',
      'percentYields',
      'productionBonus',
      'rulePercent',
      'happiness',
      'authority',
      'happinessTierBoost',
      'combatLine',
      'unitStat',
      'unitStamp',
      'windfallRider',
      'foundingRider',
      'offerRider',
      'routeRider',
      'slotRider',
      'effectAmplifier',
      'meterRule',
      'conditionRule',
      'cityStat',
      'metaRule',
      'rule',
      'periodicOffer',
      'periodicMuster',
      'landfall',
      'unlocksBuilding',
      'unlocksUnit',
      'pantheonSlots',
      'purchaseRider',
      'projectRider',
      'renown',
      'pressureRule',
      'pressure',
      'upkeepRebate',
      'upkeepSurcharge',
      'cardYieldAmplifier',
      'buildingYieldPercent',
      'slotPosition',
      'periodic',
      'periodShorten',
      'cityRenownPercent',
      'beadPerOccasion',
      'grantsAbility',
      'levy',
      // Expansionist batch E4: a work row a seated card opens, tended works
      // beyond the borders, and the two shapes that run every ten turns.
      'unlocksImprovement',
      'worksBeyond',
      'encroach',
      'migration',
      // Expansionist batch E6: Dominion batch D7's move of a town's food
      // surplus into production (The Breadbasket).
      'surplusToProduction',
    ]);
    const walk = (effects: readonly CardEffect[], id: OrderId): void => {
      for (const effect of effects) {
        expect(kinds, `${id}: ${effect.kind}`).toContain(effect.kind);
        if (effect.kind === 'conditionRule') walk(effect.then, id);
      }
    };
    for (const id of LIVE) walk(orderDef(id).effects, id);
  });

  it('carries the four cells the deck’s doc table is written from', () => {
    // Band, rarity and the row's own words, per live row — what
    // `statecraftDocSync.test.ts` mirrors. Stated here so that a row landing
    // without them fails in the deck's own file first.
    for (const id of LIVE) {
      const def = orderDef(id);
      expect(typeof def.band, id).toBe('number');
      expect(RARITIES, id).toContain(def.rarity);
      expect(def.name.trim(), id).toBe(def.name);
      expect(def.text!.trim(), id).toBe(def.text);
    }
  });
});

describe('the deferred rows', () => {
  it('state their sentence, carry no effects, and are dealt to nobody', () => {
    // None since batch E9 of the themes triage: The Two Harvests was the last
    // deferred row, and it is built. The checks stay for the next row that
    // waits on a shape.
    expect(DEFERRED).toEqual([]);
    for (const id of DEFERRED) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, id).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const sentence of def.deferred!) expect(sentence, id).toBeTruthy();
      // The rule the plan states: in the data, in the Compendium, in no pool.
      expect(orderIsDealt(id), id).toBe(false);
      expect(ordersForDecks(['expansionist']), id).not.toContain(id);
      // A deferred half is player prose: no identifiers, and a `note` beside it
      // saying what is not built.
      expect(def.note, id).toBeTruthy();
    }
  });

  it('says its deferral in plain words, with no identifier in it', () => {
    for (const id of DEFERRED) {
      for (const sentence of [...orderDef(id).deferred!, orderDef(id).note!]) {
        expect(sentence, `${id}: ${sentence}`).not.toMatch(/[a-z][A-Z]/);
        expect(sentence, `${id}: ${sentence}`).not.toContain('`');
      }
    }
  });
});

// --- the draw ---------------------------------------------------------------

/** A duel under Pachacuti — Expansionist and Commerce (the design doc's pools). */
function seated(seed = 11): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'pachacuti' },
      { name: 'Bors', color: '#3a7fe8', leader: 'taizong' },
    ],
  });
}

/** Opens every band for this seat: the ladder's last rung and the last age. */
function openEveryBand(player: Player): void {
  // The last rung of the ladder, which opens band 4 (Tier IV).
  player.statecraft.drafts = TIER_LADDER[TIER_LADDER.length - 1]!.drafts;
  for (const tech of TECH_IDS) {
    if (techDef(tech).age === 4 && !player.techsResearched.includes(tech)) {
      player.techsResearched.push(tech as TechId);
      break;
    }
  }
}

describe('a seeded draft under Pachacuti', () => {
  it('deals only live rows of this seat’s own decks', () => {
    const g = seated();
    const seat = playerById(g.state, 0)!;
    expect(seat.decks).toEqual(['expansionist', 'commerce']);
    openEveryBand(seat);
    const allowed = new Set(ordersForDecks(seat.decks));
    let dealt = 0;
    for (let round = 0; round < 12; round++) {
      const offer = drawOrderOffer(g.state, seat);
      for (const id of offer.options) {
        expect(allowed, `${id} is not in this seat's pool`).toContain(id);
        expect(orderIsDealt(id), id).toBe(true);
        expect(orderDef(id).retired, id).toBeUndefined();
        // Never a deferred row of this deck.
        expect(DEFERRED, id).not.toContain(id);
        dealt++;
      }
      // Hold what was dealt so the next hand deals something else.
      for (const id of offer.options) seat.statecraft.orders.push(id);
    }
    expect(dealt).toBeGreaterThan(0);
  });

  it('offers this deck’s band-0 rows to a seat that has only reached band 0', () => {
    const g = seated(23);
    const seat = playerById(g.state, 0)!;
    const eligible = eligibleFor(g.state, seat);
    const mine = eligible.filter((id) => (DECK_FILE_ORDERS.expansionist as OrderId[]).includes(id));
    // A fresh seat is at rung zero and research age one, so the early band and
    // nothing above it.
    for (const id of mine) expect(orderDef(id).band, id).toBe(0);
    expect(mine.length).toBeGreaterThan(0);
  });

  it('deals the same hand from the same generator state', () => {
    const a = seated(5);
    const b = seated(5);
    openEveryBand(playerById(a.state, 0)!);
    openEveryBand(playerById(b.state, 0)!);
    expect(drawOrderOffer(a.state, playerById(a.state, 0)!).options).toEqual(
      drawOrderOffer(b.state, playerById(b.state, 0)!).options,
    );
  });
});

// --- the tended works and the shapes the deck added ----------------------------

/** Puts a card in seat 0's collection, the way a draft would. */
function hold(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  bumpRevision(state);
}

/**
 * Seats a card for seat 0 in the first empty chair it fits, through the slot
 * verb. The deck is typed since batch E0, so a chair of another type refuses it.
 */
function seatCard(state: GameState, id: OrderId): void {
  hold(state, id);
  const player = playerById(state, 0)!;
  const index = player.statecraft.slots.findIndex(
    (slot, at) => slot === null && slotOrderError(state, 0, id, at) === null,
  );
  expect(index, `${id} fits no empty chair`).toBeGreaterThanOrEqual(0);
  slotOrderAt(state, player, id, index);
  bumpRevision(state);
}

describe('the tended works', () => {
  it('opens a tended work only to a seat holding its charter, and names the card when it refuses', () => {
    const { state, worker, tile } = woodedWorker();
    expect(improvementErrorAt(state, 0, tile, 'wildOrchard')).toBe(
      'A wild orchard needs the card The Wild Orchards',
    );
    hold(state, 'theWildOrchards' as OrderId);
    expect(cardUnlocksImprovement(state, 0, 'wildOrchard')).toBe(true);
    expect(improvementErrorAt(state, 0, tile, 'wildOrchard')).toBeNull();
    // The charter names one row; its siblings stay shut.
    expect(improvementErrorAt(state, 0, tile, 'forestGarden')).not.toBeNull();
    buildImprovementAt(state, worker, tile, 'wildOrchard');
    expect(tile.improvement).toBe('wildOrchard');
    expect(tile.feature).toBe('forest');
  });

  it('keeps the retired Forest Gardens working for a seat that already holds it', () => {
    // The user cut the card on 2026-10-16. It is dealt to nobody now, but its
    // row stays, so a collection that already holds it still opens the work.
    const { state, tile } = woodedWorker();
    expect(orderIsDealt('theForestGardens' as OrderId)).toBe(false);
    hold(state, 'theForestGardens' as OrderId);
    expect(cardUnlocksImprovement(state, 0, 'forestGarden')).toBe(true);
    expect(improvementErrorAt(state, 0, tile, 'forestGarden')).toBeNull();
  });

  it('counts a tended hex as wild: unimproved, tended, and not improved', () => {
    const { state, tile } = woodedWorker();
    raiseImprovement(tile, 'wildOrchard', state.turn);
    expect(tileConditionHolds(tile, { test: 'unimproved' })).toBe(true);
    expect(tileConditionHolds(tile, { test: 'improved' })).toBe(false);
    expect(tileConditionHolds(tile, { test: 'tended' })).toBe(true);
    raiseImprovement(tile, 'lumbermill', state.turn);
    expect(tileConditionHolds(tile, { test: 'unimproved' })).toBe(false);
    expect(tileConditionHolds(tile, { test: 'improved' })).toBe(true);
    expect(tileConditionHolds(tile, { test: 'tended' })).toBe(false);
    // `any` holds when one part does.
    expect(tileConditionHolds(tile, { test: 'any', of: [{ test: 'tended' }, { test: 'improved' }] })).toBe(true);
    expect(tileConditionHolds(tile, { test: 'any', of: [] })).toBe(false);
  });

  it('cannot be pillaged, though a road on the same hex can', () => {
    const { state, tile } = woodedWorker();
    raiseImprovement(tile, 'wildOrchard', state.turn);
    const raider = createUnit(state, 1, 'warrior', tile.col, tile.row);
    bumpRevision(state);
    expect(pillageError(state, raider.id)).toBe(`There is nothing to pillage on (${tile.col}, ${tile.row})`);
    tile.road = 0;
    expect(pillageError(state, raider.id)).toBeNull();
    const report = pillageAt(state, raider, tile);
    expect(report.road).toBe(true);
    expect(report.improvement).toBeUndefined();
    expect(tile.improvement).toBe('wildOrchard');
    expect(tile.road).toBeUndefined();
  });

  it('goes with the wood when the forest is felled', () => {
    const { state, worker, tile } = woodedWorker();
    raiseImprovement(tile, 'wildOrchard', state.turn);
    chopFeatureAt(state, worker, tile);
    expect(tile.feature).toBe('none');
    expect(tile.improvement).toBeUndefined();
  });

  it('counts the tended hexes inside the borders for Six Gardens', () => {
    const { state, tile } = woodedWorker();
    expect(commissionFigure(state, 0, 'tendedTiles')).toBe(0);
    raiseImprovement(tile, 'wildOrchard', state.turn);
    expect(commissionFigure(state, 0, 'tendedTiles')).toBe(1);
    expect(commissionFigure(state, 1, 'tendedTiles')).toBe(0);
  });
});

describe('the deck’s other shapes', () => {
  it('deals the cards marked "Needs tended land" only to a seat holding an unlock', () => {
    const g = seated();
    const seat = playerById(g.state, 0)!;
    openEveryBand(seat);
    const gated = ROWS.filter((id) => orderDef(id).needsTendedWork === true && orderIsDealt(id));
    expect(gated.length).toBeGreaterThan(0);
    // A seat is dealt only its current band (the ruling of 2026-10-13), so the
    // bag is read at every rung of the ladder and the bands are put together.
    const everyBand = (): OrderId[] =>
      TIER_LADDER.flatMap((rung) => eligibleFor(g.state, seat, rung.drafts));
    const shut = everyBand();
    for (const id of gated) expect(shut, id).not.toContain(id);
    seat.statecraft.orders.push('theFishTraps' as OrderId);
    const open = everyBand();
    for (const id of gated) expect(open, id).toContain(id);
  });

  it('counts a bought hex toward The Wide Country while it is seated', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    bumpRevision(state);
    seatCard(state, 'theWideCountry' as OrderId);
    const sc = playerById(state, 0)!.statecraft;
    expect(tallyOf(sc, 'theWideCountry' as OrderId)).toBe(0);
    playerById(state, 0)!.gold = 5000;
    purchaseTileAt(state, city, at(state, 7, 5));
    expect(tallyOf(sc, 'theWideCountry' as OrderId)).toBe(1);
  });

  it('claims one more hex at founding under The Beating of the Bounds', () => {
    // Retired in batch E7. A save may still hold the card, so its shape stays
    // and this test seats the row directly (the triage's reading 7).
    const plain = bareState();
    const before = ownedTiles(plain, foundCityAt(plain, 0, at(plain, 5, 5))).length;
    const state = bareState();
    seatCard(state, 'theBeatingOfTheBounds' as OrderId);
    const after = ownedTiles(state, foundCityAt(state, 0, at(state, 5, 5))).length;
    expect(after).toBe(before + 1);
  });

  it('admits a town by the hexes its citizens work, through any hex condition', () => {
    const { state, city, tile } = woodedWorker();
    const scope: CityScope = { test: 'workingTiles', on: { test: 'tended' } };
    raiseImprovement(tile, 'wildOrchard', state.turn);
    city.workedTiles = city.workedTiles.filter((cell) => !(cell.col === tile.col && cell.row === tile.row));
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, scope)).toBe(false);
    city.workedTiles.push({ col: tile.col, row: tile.row });
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, scope)).toBe(true);
    expect(cityScopeAdmits(state, city, { ...scope, atLeast: 2 })).toBe(false);
  });

  it('pays The Farming Garrisons, shared with Dominion, on a hex where a military unit is fortified', () => {
    // The row lives in common.json since Dominion batch D7, shared by both decks.
    expect(orderDef('theFarmingGarrisons' as OrderId).decks).toEqual(['dominion', 'expansionist']);
    const { state, tile } = woodedWorker();
    seatCard(state, 'theFarmingGarrisons' as OrderId);
    tile.feature = 'none';
    const spear = createUnit(state, 0, 'spearman', tile.col, tile.row);
    bumpRevision(state);
    const paid = (): { food: number; production: number } => {
      const lines = explainTileYield(tile, yieldContextFor(state, 0)).filter(
        (line) => line.source === 'Order · The Farming Garrisons',
      );
      return {
        food: lines.reduce((sum, line) => sum + line.food, 0),
        production: lines.reduce((sum, line) => sum + line.production, 0),
      };
    };
    expect(paid()).toEqual({ food: 0, production: 0 });
    spear.fortifiedTurns = 0;
    bumpRevision(state);
    expect(paid()).toEqual({ food: 1, production: 1 });
  });

  it('pays The Prospectors only on a mine over a seam this empire surfaced', () => {
    // Since Expansionist batch E3 the bonus reads who struck the seam
    // (`Tile.surfacedBy`), not only that the hill was surveyed. Retired in
    // batch E7; the test seats the row directly, as a save may hold it.
    const { state, tile } = woodedWorker();
    seatCard(state, 'theProspectors' as OrderId);
    tile.feature = 'none';
    tile.hills = true;
    tile.resource = 'iron';
    raiseImprovement(tile, 'mine', state.turn);
    bumpRevision(state);
    const paid = (): number =>
      explainTileYield(tile, yieldContextFor(state, 0))
        .filter((line) => line.source === 'Order · The Prospectors')
        .reduce((sum, line) => sum + (line.production ?? 0), 0);
    expect(paid()).toBe(0);
    tile.surveyed = true;
    tile.surfacedBy = 1;
    bumpRevision(state);
    expect(paid()).toBe(0);
    tile.surfacedBy = 0;
    bumpRevision(state);
    expect(tileConditionHolds(tile, { test: 'surfaced' }, undefined, undefined, undefined, { player: 0 })).toBe(
      true,
    );
    expect(paid()).toBe(3);
  });
});
