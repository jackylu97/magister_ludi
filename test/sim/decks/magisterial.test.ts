/**
 * **The Magisterial deck** (`data/decks/magisterial.json`) and its sheet of
 * record, `docs/decks/magisterial.md`.
 *
 * Batch D1b entered the deck from `docs/six-decks-first-cut.md`. Since batch
 * MG1 of `docs/plans/magisterial-themes-triage.md`, the sheet is the spec of
 * record, in the sorted format of the Commerce sheet. This file checks:
 *
 *   · every row of the file folds as a Magisterial row, with a band, a rarity,
 *     a name, a flavour, its text and an id no other file uses;
 *   · the file holds 133 rows: 71 live and 62 retired (the triage's reading
 *     43). No row has been deferred since batch MG8 dealt The Last
 *     Commission. A retired row stays so that old saves load. The test that
 *     counts the rows says what each batch added;
 *   · a live row uses only shapes the evaluator reads, and every (`where`,
 *     `basis`) pair of a `pays` line is a pair in `docs/yields.md`'s register;
 *   · a live row prints through the describers with no keyword mark left raw;
 *   · a deferred row has no effects, says in plain words what it would do and
 *     why it waits, and is dealt to nobody;
 *   · the live rows pay on a board: Civic Granaries pays +1 food and +1
 *     production for a Monument;
 *   · a seeded draft for a Magisterial seat (Hypatia, Scientific and
 *     Magisterial) deals only live rows of its own decks, the generic rows and
 *     the shared rows, and never a deferred or retired row;
 *   · the sheet of record against the data: statuses and their reasons, types,
 *     the two counts tables, every listed row once, the shared table against
 *     `common.json`, and every retired row off the tables with no type.
 *
 * The full mirror of the worksheet's Magisterial shelf
 * (`docs/orders-and-doctrines.md`) is in `test/sim/statecraftDocSync.test.ts`.
 * This file checks one direction of it: the shelf names no card that this file
 * does not carry live.
 */

import { describe, expect, it } from 'vitest';

import { type BuildingId } from '../../../src/sim/buildingData';
import { refreshCityDerived } from '../../../src/sim/cities';
import { type Game } from '../../../src/sim/game';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../../src/sim/state';
import { explainCity } from '../../../src/sim/yields/town';
import { describeCard, drawOrderOffer, eligibleFor, stripRefs } from '../../../src/sim/statecraft';
import {
  type Band,
  type CardEffect,
  type CardEffectKind,
  type CardType,
  type DeckId,
  type OrderId,
  BANDS,
  DECK_FILES,
  DECK_FILE_ORDERS,
  DECK_WORDS,
  DOCTRINE_IDS,
  ORDER_IDS,
  TIER_LADDER,
  doctrineDef,
  isCardType,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';
import { TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';
import { found } from '../statecraftHelpers';
import { createGame } from '../newGameHelpers';

// --- the deck -----------------------------------------------------------------

/** Every id this deck's file carries, in file order. */
const MAGISTERIAL: readonly OrderId[] = DECK_FILE_ORDERS.magisterial;

const isRetired = (id: OrderId): boolean => orderDef(id).retired === true;
const live = (id: OrderId): boolean => orderIsDealt(id);
/** A row that waits for a shape or for its batch: not dealt, and not retired. */
const deferred = (id: OrderId): boolean => !orderIsDealt(id) && !isRetired(id);

// --- the vocabulary, read -----------------------------------------------------

/**
 * Every effect kind the evaluator has an arm for, restated from
 * `statecraft.test.ts`' register so that a row naming a shape that does not
 * exist fails in this file.
 */
const KNOWN_KINDS = new Set<CardEffectKind>([
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
]);

const yieldsDocFiles = import.meta.glob('../../../docs/yields.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const YIELDS_DOC = Object.values(yieldsDocFiles)[0] as string;

/**
 * The (`where` · `basis`) pairs in `docs/yields.md`'s register. A `pays` row
 * in a pair that is not there is a shape the register has never placed, and
 * this deck may not invent one.
 */
const REGISTERED_PAIRS: ReadonlySet<string> = (() => {
  const pairs = new Set<string>();
  for (const line of YIELDS_DOC.split('\n')) {
    if (!line.startsWith('| `pays` |')) continue;
    const cell = line.split('|')[2]?.trim() ?? '';
    const [where, basis] = cell.split('·').map((half) => half.trim());
    if (where && basis) pairs.add(`${where}·${basis}`);
  }
  return pairs;
})();

/**
 * Every effect on a row, the effects inside a `conditionRule` included, and
 * since batch MG4 the effects a commission's reward keeps for the rest of the
 * game (`CommissionReward.lasting`).
 */
function allEffects(id: OrderId): CardEffect[] {
  const out: CardEffect[] = [];
  const walk = (effects: readonly CardEffect[]): void => {
    for (const effect of effects) {
      out.push(effect);
      if (effect.kind === 'conditionRule') walk(effect.then);
    }
  };
  walk(orderDef(id).effects);
  for (const reward of orderDef(id).commission?.reward ?? []) walk(reward.lasting ?? []);
  return out;
}

// --- the seat ------------------------------------------------------------------

/** A duel with Hypatia (Scientific and Magisterial) in seat 0. */
function seated(seed: number): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Hypatia', color: '#d4502e', isHuman: true, leader: 'hypatiaOfAlexandria' },
      { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
    ],
  });
}

/** A technology of this age, for the research-age half of the band gate. */
function techOfAge(age: 1 | 2 | 3 | 4): TechId {
  const id = TECH_IDS.find((tech) => techDef(tech).age === age);
  expect(id, `a technology of age ${age}`).toBeDefined();
  return id!;
}

/** Opens every band for this seat: the ladder's last rung and the last age. */
function openEveryBand(state: GameState, player: Player): void {
  player.statecraft.drafts = 29;
  for (const age of [1, 2, 3, 4] as const) {
    const id = techOfAge(age);
    if (!player.techsResearched.includes(id)) player.techsResearched.push(id);
  }
  void state;
}

// --- the rows ------------------------------------------------------------------

describe('the Magisterial deck', () => {
  it('folds every row of its own file as a Magisterial row with a band and a rarity', () => {
    expect(MAGISTERIAL.length).toBeGreaterThan(0);
    for (const id of MAGISTERIAL) {
      const def = orderDef(id);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(BANDS, id).toContain(def.band);
      expect(['common', 'uncommon', 'rare'], id).toContain(def.rarity);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, `${id} carries no text`).toBeTruthy();
      expect(def.line, id).toBe('none');
      // The rows written since the rework carry neither of the old fields.
      expect(def.pool, id).toBeUndefined();
      expect(def.slot, id).toBeUndefined();
      expect(id, `${id} is not lowerCamel`).toMatch(/^[a-z][A-Za-z0-9]*$/);
    }
  });

  it('carries 133 rows: 71 live, none deferred and 62 retired', () => {
    // Batch MG1 retired the 61 rows the old sheet cut on 2026-10-06 and The
    // Performers' Treasury (the triage's reading 43). The rows stay so that
    // old saves load. Batch MG2 added fourteen live rows: six at Tier 0 and
    // eight at Tier I. Batch MG3 added eleven live rows (six at Tier II, three
    // at Tier III and two at Tier IV) and dealt The Golden Age and The
    // Magister's Court. Batch MG4 added five live rows: one at each of Tiers
    // 0, I and III, and two at Tier IV. Batch MG5 added three live rows: one
    // at Tier I and two at Tier II. Batch MG6 added three live rows: one at
    // each of Tiers I, III and IV. Batch MG7 added three live rows: one at
    // Tier II and two at Tier III. Batch MG8 added two live rows, one at Tier
    // II and one at Tier IV, and dealt The Last Commission, the last deferred
    // row. Batch MG9 added four live rows: one at Tier I, two at Tier II and
    // one at Tier IV. Batch MG10 added three live rows: one at Tier II and two
    // at Tier III. Batch MG11 added one live row at Tier III, and batches
    // MG12 and MG13 one more each. Batch MG14 added two live rows, one at
    // Tier III and one at Tier IV, and batch MG15 two more, one at Tier III
    // and one at Tier IV. Batch MG16 added one live row at Tier IV.
    expect(MAGISTERIAL).toHaveLength(133);
    expect(MAGISTERIAL.filter(live)).toHaveLength(71);
    expect(MAGISTERIAL.filter(deferred)).toHaveLength(0);
    expect(MAGISTERIAL.filter(isRetired)).toHaveLength(62);
    for (const id of MAGISTERIAL.filter(isRetired)) {
      expect(orderIsDealt(id), `${id} is retired and still dealt`).toBe(false);
    }
    // The rows the sheet lists, by band: Tiers 0 to IV.
    const kept = MAGISTERIAL.filter((id) => !isRetired(id)).map((id) => orderDef(id).band);
    expect(BANDS.map((band) => kept.filter((b) => b === band).length)).toEqual([10, 15, 17, 17, 12]);
  });

  it('gives every row an id nothing else in the eight files uses', () => {
    const mine = new Set<string>(MAGISTERIAL);
    expect(mine.size).toBe(MAGISTERIAL.length);
    for (const file of DECK_FILES) {
      if (file === 'magisterial') continue;
      for (const id of DECK_FILE_ORDERS[file]) expect(mine.has(id), id).toBe(false);
    }
    // The old retired shelf is every id the registry holds that no deck file does.
    const inDecks = new Set<string>(DECK_FILES.flatMap((file) => [...DECK_FILE_ORDERS[file]]));
    for (const id of ORDER_IDS) {
      if (inDecks.has(id)) continue;
      expect(mine.has(id), `${id} collides with the retired shelf`).toBe(false);
    }
  });
});

describe('the live rows', () => {
  it('say only things the vocabulary can say', () => {
    const lived = MAGISTERIAL.filter(live);
    expect(lived.length).toBeGreaterThan(0);
    for (const id of lived) {
      const effects = allEffects(id);
      // A commission says its goal and its reward, and may keep no effect at
      // all (Commission: The Roll of the Senate pays a chair). Batch MG4 built
      // the deck's first three. A card whose whole text is a grant on the
      // draft keeps no effect either (The Wandering Muse, batch MG6).
      const says =
        effects.length > 0 || orderDef(id).commission !== undefined || orderDef(id).onDraft !== undefined;
      expect(says, `${id} is live and says nothing`).toBe(true);
      for (const effect of effects) {
        expect(KNOWN_KINDS.has(effect.kind), `${id}: "${effect.kind}"`).toBe(true);
        if (effect.kind !== 'pays') continue;
        const pair = `${effect.where}·${effect.basis ?? 'flat'}`;
        expect(REGISTERED_PAIRS.has(pair), `${id}: the pair ${pair} is in no register`).toBe(true);
      }
    }
  });

  it('print through the describers, with no keyword mark left raw', () => {
    for (const id of MAGISTERIAL.filter(live)) {
      const clauses = describeCard(id);
      expect(clauses.length, `${id} prints nothing`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.text, id).toBeTruthy();
        expect(stripRefs(clause.text), `${id}: a raw keyword mark`).not.toMatch(/\[\[/);
      }
    }
  });
});

describe('the deferred rows', () => {
  it('carry no effects, say what they wait for in plain words, and are dealt by nobody', () => {
    // Batch MG1 gave The Golden Age, The Magister's Court and The Last
    // Commission their new text and tier (the triage's reading 44). Batch MG3
    // dealt the first two, and batch MG8 dealt The Last Commission, so no
    // row waits. The checks below hold for any row that is deferred again.
    const held = MAGISTERIAL.filter(deferred);
    expect(held.map((id) => orderDef(id).name)).toEqual([]);
    for (const id of held) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.charter, id).toBeUndefined();
      expect(def.deferred, `${id} is deferred and does not say why`).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const sentence of def.deferred!) {
        expect(sentence, id).toBeTruthy();
        // Player prose: no keyword marks, no identifiers and no figures.
        expect(sentence, id).not.toMatch(/\[\[/);
        expect(sentence, id).not.toMatch(/[a-z][A-Z]/);
        expect(sentence, id).not.toMatch(/[0-9]/);
      }
      // The reason it waits is on the row too, in the same voice.
      expect(def.note, `${id} does not say why it waits`).toBeTruthy();
      expect(def.note!, id).not.toMatch(/[a-z][A-Z]/);
      expect(orderIsDealt(id), `${id} is deferred and still dealt`).toBe(false);
    }
  });

  it('print their deferred halves through the describers', () => {
    for (const id of MAGISTERIAL.filter(deferred)) {
      const clauses = describeCard(id);
      expect(clauses.length, `${id} prints nothing`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(stripRefs(clause.text), `${id}: a raw keyword mark`).not.toMatch(/\[\[/);
      }
    }
  });
});

describe('the fold', () => {
  /**
   * **The rows on a board, not only in a table.** A scope that admits nothing
   * and a count that reads nothing both typecheck, and both pay nothing. So
   * every live row is seated at once in a town that has raised what the deck
   * names, and the town's own list is read (rule 5's list, which the totals
   * are the sum of).
   */
  function seatedWithEveryLiveRow(): { g: Game; seat: Player; city: City } {
    const g = seated(31);
    const seat = playerById(g.state, 0)!;
    openEveryBand(g.state, seat);
    const city = found(g.state, seat.id);
    for (const id of [
      'monument',
      'shrine',
      'granary',
      'library',
      'temple',
      'market',
      'garden',
      'amphitheater',
    ] as BuildingId[]) {
      if (!city.buildings.includes(id)) city.buildings.push(id);
    }
    const lived = MAGISTERIAL.filter(live);
    seat.statecraft.orders = [...lived];
    seat.statecraft.slots = lived.map((card) => ({ card, sealedUntil: 0 }));
    bumpRevision(g.state);
    refreshCityDerived(g.state, city);
    return { g, seat, city };
  }

  it('reads every live row into a town’s list without throwing', () => {
    const { g, city } = seatedWithEveryLiveRow();
    const reading = explainCity(g.state, city);
    expect(reading.lines.length).toBeGreaterThan(0);
    expect(Number.isFinite(reading.flats.food)).toBe(true);
  });

  it('pays what Civic Granaries prints, in the town that raised a Monument', () => {
    // +1 food and +1 production since batch MG1 (it was +2 of each).
    const { g, city } = seatedWithEveryLiveRow();
    const lines = explainCity(g.state, city).lines.filter((line) => line.card === 'civicGranaries');
    const food = lines.reduce((sum, line) => sum + line.food, 0);
    const production = lines.reduce((sum, line) => sum + line.production, 0);
    expect(food).toBe(1);
    expect(production).toBe(1);
  });
});

describe('the draft', () => {
  it('deals a Magisterial seat only live rows of its own decks, the commons and the crosses', () => {
    const magisterialLive = new Set<string>(MAGISTERIAL.filter(live));
    for (const seed of [1, 7, 23, 101]) {
      const g = seated(seed);
      const seat = playerById(g.state, 0)!;
      expect(seat.decks).toEqual(['scientific', 'magisterial']);
      openEveryBand(g.state, seat);
      // The bag first: nothing eligible that is not this seat's to draw.
      for (const id of eligibleFor(g.state, seat)) {
        const home = orderDef(id).decks;
        expect(orderIsDealt(id), `${id} is eligible and dealt by nobody`).toBe(true);
        if (home.length === 0) continue;
        expect(home.some((deck) => seat.decks.includes(deck)), id).toBe(true);
        if (home.includes('magisterial') && home.length === 1) {
          expect(magisterialLive.has(id), `${id} is a deferred or retired row in the bag`).toBe(true);
        }
      }
      // Then twenty hands, so the third card of the hand walks through its
      // generic, shared, generic and single-deck turns.
      for (let draft = 0; draft < 20; draft += 1) {
        seat.statecraft.drafts = 29 + draft;
        for (const id of drawOrderOffer(g.state, seat).options) {
          expect(orderIsDealt(id), `${id} was dealt and is dealt by nobody`).toBe(true);
          const home = orderDef(id).decks;
          if (home.length === 0) continue;
          expect(home.some((deck) => seat.decks.includes(deck)), id).toBe(true);
        }
      }
    }
  });

  it('keeps every deferred and retired row of this deck out of a Magisterial seat’s bag', () => {
    const g = seated(5);
    const seat = playerById(g.state, 0)!;
    openEveryBand(g.state, seat);
    // A seat is dealt only its current band (the ruling of 2026-10-13), so the
    // bag is read at every rung of the ladder and the bands are put together.
    const bag = new Set<string>(
      TIER_LADDER.flatMap((rung) => eligibleFor(g.state, seat, rung.drafts)),
    );
    for (const id of MAGISTERIAL.filter((row) => !live(row))) expect(bag.has(id), id).toBe(false);
    for (const id of MAGISTERIAL.filter(live)) expect(bag.has(id), id).toBe(true);
    // The two shared rows MG1 retired are out of it too.
    for (const id of ['theImperialExaminations', 'triumphalArches']) {
      expect(bag.has(id), id).toBe(false);
    }
  });
});

/**
 * **The worksheet's own table** (`docs/orders-and-doctrines.md`, "### Magisterial").
 *
 * The full mirror is in `statecraftDocSync.test.ts`. This checks one direction
 * of it: a name in the Magisterial table that names no live row of this file.
 */
describe('the worksheet', () => {
  const worksheetFiles = import.meta.glob('../../../docs/orders-and-doctrines.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const WORKSHEET = Object.values(worksheetFiles)[0] as string;

  it('names no card in its Magisterial table that this file does not carry live', () => {
    const start = WORKSHEET.indexOf('### Magisterial');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = WORKSHEET.indexOf('\n### ', start + 1);
    const block = WORKSHEET.slice(start, end === -1 ? undefined : end);
    const names = new Set(MAGISTERIAL.filter(live).map((id) => orderDef(id).name));
    for (const line of block.split('\n')) {
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells[0] === 'Order' || cells.every((cell) => /^-+$/.test(cell))) continue;
      expect(names.has(cells[0]!), `the table names "${cells[0]}"`).toBe(true);
    }
  });
});

// --- the sheet of record (batch MG1) ------------------------------------------

/**
 * **The deck sheet**, `docs/decks/magisterial.md`, the spec of record since
 * batch MG1. It is in the sorted format of the Commerce sheet: five tier tables
 * (Card | Rarity | Status | Ability | Type) and a shared table (Card | Rarity |
 * Also in | Tier | Status | Ability | Type). The empty Doctrine tables have
 * three columns, so the reader below skips them.
 */
const sheetFiles = import.meta.glob('../../../docs/decks/magisterial.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const SHEET = Object.values(sheetFiles)[0] as string;

/** The sheet's tier headings, which are the bands. */
const TIERS: Record<string, Band> = { '0': 0, I: 1, II: 2, III: 3, IV: 4 };

/** How a sheet row relates to the data: the first word of its Status cell. */
type SheetStatus = 'implemented' | 'modify' | 'add';
const SHEET_STATUSES: readonly SheetStatus[] = ['implemented', 'modify', 'add'];

/** The words a `modify` row may give after the colon: the sheet's own list. */
const REASONS = ['deferred', 'revised', 'reworked', 'moved', 'rarity', 'shared', 'as built'] as const;
type Reason = (typeof REASONS)[number];

/** One card the sheet lists, in a tier table or the shared table. */
interface SheetCard {
  /** The name the sheet prints, without the bold and the "(was …)" note. */
  name: string;
  /** The name in the "(was …)" note, when the sheet gives one. */
  was?: string;
  rarity: string;
  band: Band;
  status: SheetStatus;
  /** The words after the colon in the Status cell. */
  reasons: Reason[];
  text: string;
  /** The Type cell, lowercased. */
  type: CardType;
}

/** One card of the shared table. Its row lives in `data/decks/common.json`. */
interface SharedCard extends SheetCard {
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

/** A Status cell read into its first word and the reasons after the colon. */
function statusOf(card: string, cell: string): { status: SheetStatus; reasons: Reason[] } {
  const colon = cell.indexOf(':');
  const head = (colon < 0 ? cell : cell.slice(0, colon)).trim();
  expect(SHEET_STATUSES, `"${card}" has an unknown status "${cell}"`).toContain(head);
  const reasons = colon < 0 ? [] : cell.slice(colon + 1).split(';').map((word) => word.trim());
  for (const reason of reasons) {
    expect(REASONS, `"${card}" gives an unknown reason "${reason}"`).toContain(reason);
  }
  if (head === 'modify') expect(reasons.length, `"${card}" says modify and gives no reason`).toBeGreaterThan(0);
  else expect(reasons, `"${card}" gives a reason with "${head}"`).toEqual([]);
  return { status: head as SheetStatus, reasons: reasons as Reason[] };
}

/** The five tier tables, from the first tier heading to the first other level-two heading. */
function sheetCards(): SheetCard[] {
  const start = SHEET.indexOf('\n## Tier 0');
  expect(start, 'the sheet has a Tier 0 table').toBeGreaterThanOrEqual(0);
  const cards: SheetCard[] = [];
  let band: Band | null = null;
  for (const line of SHEET.slice(start + 1).split('\n')) {
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
      rarity: cells[1]!,
      band,
      ...statusOf(cells[0]!, cells[2]!),
      text: cells[3]!,
      type: typeOf(cells[0]!, cells[4]),
    });
  }
  return cards;
}

/** The shared table ("Shared with another deck"), to the next level-two heading. */
function sharedCards(): SharedCard[] {
  const start = SHEET.indexOf('\n## Shared with another deck');
  expect(start, 'the sheet has a shared table').toBeGreaterThanOrEqual(0);
  const deckByWord = new Map(
    (Object.entries(DECK_WORDS) as [DeckId, string][]).map(([deck, word]) => [word, deck] as const),
  );
  const cards: SharedCard[] = [];
  for (const line of SHEET.slice(start + 1).split('\n').slice(1)) {
    if (line.startsWith('## ')) break;
    const cells = cellsOf(line);
    if (cells === null || cells.length < 7) continue;
    const alsoIn = deckByWord.get(cells[2]!);
    expect(alsoIn, `"${cells[0]}" is shared with an unknown deck "${cells[2]}"`).toBeDefined();
    expect(alsoIn, `"${cells[0]}" is shared with Magisterial itself`).not.toBe('magisterial');
    expect(Object.keys(TIERS), `"${cells[0]}" has an unknown tier "${cells[3]}"`).toContain(cells[3]);
    cards.push({
      ...namesOf(cells[0]!),
      rarity: cells[1]!,
      alsoIn: alsoIn!,
      band: TIERS[cells[3]!]!,
      ...statusOf(cells[0]!, cells[4]!),
      text: cells[5]!,
      type: typeOf(cells[0]!, cells[6]),
    });
  }
  return cards;
}

/** A counts table, found by its header row: each body row's first cell against its numbers. */
function countsTable(header: string): Map<string, number[]> {
  const start = SHEET.indexOf(header);
  expect(start, `the sheet has the table "${header}"`).toBeGreaterThanOrEqual(0);
  const rows = new Map<string, number[]>();
  for (const line of SHEET.slice(start).split('\n').slice(2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.replace(/\*\*/g, '').trim());
    rows.set(cells[0]!, cells.slice(1).filter((cell) => /^\d+$/.test(cell)).map(Number));
  }
  return rows;
}

/** The name of the data row a sheet row stands for: the "(was …)" name if given. */
const dataNameOf = (card: { name: string; was?: string }): string => card.was ?? card.name;

/** The rows the sheet's tier tables must list: every row of this file that is not retired. */
const LISTED: readonly OrderId[] = MAGISTERIAL.filter((id) => !isRetired(id));

/**
 * The names a card still to be added may not use: every name in this file,
 * retired rows included (no new card takes over a cut row, the triage's
 * reading 45), and the name of every live or deferred row in any file. A
 * retired row of another deck may share a name with a card to be added.
 *
 * The Quarter of Masters is the case in point. It was cut from Expansionist,
 * and its retired row there keeps the name and the id `theQuarterOfMasters`.
 * Batch MG3 built the Magisterial card as a new row with a new id,
 * `magisterialTheQuarterOfMasters`, so every lookup of this sheet by name
 * reads this file's rows and finds the Magisterial card.
 */
const TAKEN = new Set([
  ...MAGISTERIAL.map((id) => orderDef(id).name),
  ...ORDER_IDS.filter((id) => orderDef(id).retired !== true).map((id) => orderDef(id).name),
]);

/**
 * The checks every sheet row with a data row shares, in either table: the
 * type, and what the status and its reasons claim. Each reason the data can
 * answer must be true both ways.
 */
function checkAgainstRow(card: SheetCard, id: OrderId): void {
  const def = orderDef(id);
  expect(def.type, `${card.name}: the sheet's type`).toBe(card.type);
  const dealt = orderIsDealt(id);
  const sameText = def.text === card.text;
  if (card.status === 'implemented') {
    expect(card.was, `${card.name} is implemented and renamed`).toBeUndefined();
    expect(dealt, `${card.name} is marked implemented but is not dealt`).toBe(true);
    expect(def.rarity, `${card.name}: the sheet's rarity`).toBe(card.rarity);
    expect(def.band, `${card.name}: the sheet's tier`).toBe(card.band);
    expect(def.text, `${card.name}: the sheet's ability`).toBe(card.text);
    return;
  }
  const has = (reason: Reason): boolean => card.reasons.includes(reason);
  expect(has('deferred'), `${card.name}: deferred on one side only`).toBe(!dealt);
  expect(has('moved'), `${card.name}: a different tier on one side only`).toBe(def.band !== card.band);
  expect(has('rarity'), `${card.name}: a different rarity on one side only`).toBe(
    def.rarity !== card.rarity,
  );
  expect(has('revised') || has('reworked'), `${card.name}: different words on one side only`).toBe(
    !sameText,
  );
  if (has('as built')) {
    // The game does something slightly different, and the words are the same.
    expect(dealt, `${card.name} plays as built but is not dealt`).toBe(true);
    expect(sameText, `${card.name} plays as built, so its words are the data's`).toBe(true);
    return;
  }
  // A dealt row that matches the sheet in every way is implemented.
  const same = card.was === undefined && sameText && def.band === card.band && def.rarity === card.rarity;
  expect(dealt && same, `${card.name} matches its row and should say implemented`).toBe(false);
}

describe('the Magisterial deck: the sheet of record', () => {
  it('mirrors the five tier tables, card for card', () => {
    const sheet = sheetCards();
    const shared = sharedCards();
    expect(sheet.length, 'the sheet lists cards under every tier heading').toBeGreaterThan(0);
    const byName = new Map(LISTED.map((id) => [orderDef(id).name, id] as const));
    for (const card of sheet) {
      if (card.status === 'add') {
        expect(TAKEN.has(card.name), `"${card.name}" is marked add but the data has it`).toBe(false);
        continue;
      }
      const id = byName.get(dataNameOf(card));
      expect(id, `the deck file has no row for "${dataNameOf(card)}"`).toBeDefined();
      expect(card.reasons, `${card.name} is in a tier table and marked shared`).not.toContain('shared');
      checkAgainstRow(card, id!);
    }
    // Every row that is not retired is on the sheet once.
    const listed = sheet.filter((card) => card.status !== 'add').map(dataNameOf);
    expect(new Set(listed).size, 'a data row is listed twice').toBe(listed.length);
    for (const name of byName.keys()) {
      expect(listed.includes(name), `"${name}" is a row the sheet does not list`).toBe(true);
    }
    expect(listed.length).toBe(LISTED.length);
    // And the sheet prints no name twice, the shared table's included.
    const printed = [...sheet, ...shared].map((card) => card.name);
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
    let checked = 0;
    for (const card of shared) {
      const name = dataNameOf(card);
      if (card.status === 'add') {
        expect(TAKEN.has(card.name), `"${card.name}" is marked add but the data has it`).toBe(false);
        continue;
      }
      const id = common.get(name);
      expect(id, `common.json has no row for "${name}"`).toBeDefined();
      // The row is the one the sheet means: shared by Magisterial and the deck named.
      expect(orderDef(id!).decks, name).toContain('magisterial');
      expect(orderDef(id!).decks, name).toContain(card.alsoIn);
      checkAgainstRow(card, id!);
      checked += 1;
    }
    expect(checked, 'every shared row in the data was checked').toBe(
      shared.filter((card) => card.status !== 'add').length,
    );
    expect(checked).toBeGreaterThan(0);
  });

  it('lists every shared row that names Magisterial', () => {
    const names = new Set(sharedCards().map(dataNameOf));
    for (const id of DECK_FILE_ORDERS.common) {
      const def = orderDef(id);
      if (def.retired === true || !def.decks.includes('magisterial')) continue;
      expect(names.has(def.name), `"${def.name}" names Magisterial and is not on the shared table`).toBe(true);
    }
  });

  it('keeps every retired row off the tables, with no type', () => {
    const listed = new Set(
      [...sheetCards(), ...sharedCards()].flatMap((card) => [card.name, dataNameOf(card)]),
    );
    const retired = [
      ...MAGISTERIAL.filter(isRetired),
      ...DECK_FILE_ORDERS.common.filter((id) => isRetired(id) && orderDef(id).decks.includes('magisterial')),
    ];
    // 62 of this file, and the shared The Imperial Examinations and Triumphal Arches.
    expect(retired).toHaveLength(64);
    for (const id of retired) {
      expect(listed.has(orderDef(id).name), `${id} is retired and still on the sheet`).toBe(false);
      expect(orderDef(id).type, `${id} is retired and carries a type`).toBeUndefined();
      expect(orderIsDealt(id), `${id} is retired and still dealt`).toBe(false);
    }
  });

  it('counts its rows in the two counts tables', () => {
    const sheet = sheetCards();
    const shared = sharedCards();
    const status = countsTable('| Tier | Implemented | Modify | Add | All |');
    const types = countsTable('| Tier | Military | Economic | Civic | Wildcard |');
    const byStatus = (cards: readonly SheetCard[]): number[] => [
      ...SHEET_STATUSES.map((s) => cards.filter((card) => card.status === s).length),
      cards.length,
    ];
    const byType = (cards: readonly SheetCard[]): number[] =>
      (['military', 'economic', 'civic', 'wildcard'] as const).map(
        (t) => cards.filter((card) => card.type === t).length,
      );
    for (const word of Object.keys(TIERS)) {
      const cards = sheet.filter((card) => card.band === TIERS[word]);
      expect(status.get(`Tier ${word}`), `Tier ${word}'s status counts`).toEqual(byStatus(cards));
      expect(types.get(`Tier ${word}`), `Tier ${word}'s type counts`).toEqual(byType(cards));
    }
    expect(status.get('All'), 'the status totals').toEqual(byStatus(sheet));
    expect(types.get('All'), 'the type totals').toEqual(byType(sheet));
    expect(status.get('Shared'), 'the shared status counts').toEqual(byStatus(shared));
    expect(types.get('Shared'), 'the shared type counts').toEqual(byType(shared));
    // Batch MG1's sheet: the 71 cards of the triage's tier tables, and 19
    // shared cards. Batch MG1 listed 16. Devotion batch DV1 moved The Painted
    // Chapels, The Festival Calendar and The Penitents' Roll to the shared
    // file, and the merge of the two batches added them here.
    expect(sheet).toHaveLength(71);
    expect(shared).toHaveLength(19);
  });

  it('types every listed row, 71 of this file and 19 shared, and nothing else of this file', () => {
    // 15 since batch MG1, the fourteen rows of batch MG2, the eleven new rows
    // of batch MG3, the five of batch MG4, the three of batch MG5, the three
    // of batch MG6, the three of batch MG7, the two new rows of batch MG8, the
    // four of batch MG9, the three of batch MG10, the one each of batches
    // MG11, MG12 and MG13, the two each of batches MG14 and MG15, and the
    // one of batch MG16.
    expect(LISTED).toHaveLength(71);
    for (const id of MAGISTERIAL) {
      const def = orderDef(id);
      if (isRetired(id)) expect(def.type, id).toBeUndefined();
      else expect(isCardType(def.type ?? ''), `${id} is listed and has no type`).toBe(true);
    }
    const sharedRows = DECK_FILE_ORDERS.common.filter((id) => {
      const def = orderDef(id);
      return def.retired !== true && def.decks.includes('magisterial');
    });
    // The 19 rows of the shared table. The Rising Nave, the last of them, has
    // had a data row since Devotion batch DV3.
    expect(sharedRows).toHaveLength(19);
    for (const id of sharedRows) expect(isCardType(orderDef(id).type ?? ''), id).toBe(true);
  });

  it('says the deck has no Doctrines yet, and none is in the data', () => {
    // An empty Doctrine table under each of Tiers I to IV (the triage's
    // "Doctrines" section).
    expect(SHEET).toContain('- **Doctrines:** none yet.');
    for (const word of ['I', 'II', 'III', 'IV']) {
      const start = SHEET.indexOf(`\n## Tier ${word}\n`);
      const end = SHEET.indexOf('\n## ', start + 1);
      const block = SHEET.slice(start, end);
      expect(block, `Tier ${word} has an empty Doctrine table`).toContain(
        '**Doctrines:** none yet.\n\n| Doctrine | Build | Text |\n|---|---|---|\n\n**Orders:**',
      );
    }
    expect(DOCTRINE_IDS.filter((id) => doctrineDef(id).decks.includes('magisterial'))).toEqual([]);
  });
});
