/**
 * **The Scientific deck**: `data/decks/scientific.json` checked against its
 * sheet, `docs/decks/scientific.md`, which is the spec of record for the deck.
 *
 * The sheet was rewritten in batch S1b (`docs/plans/scientific-build-triage.
 * md`) from the review list `docs/plans/scientific-list-proposed.md`, in
 * Dominion's sorted format: five tier tables (Card | Rarity | Status | Ability
 * | Type), a shared table (Card | Rarity | Also in | Tier | Status | Ability |
 * Type) and two counts tables. What this file checks:
 *
 *   · **the sheet matches the data.** The status says how a sheet row relates
 *     to the data:
 *       - `implemented`: a data row of that name exists, is dealt, and has the
 *         sheet's rarity, tier and text;
 *       - `modify`: a data row exists but differs. The words after the colon
 *         say how (`deferred`, `revised`, `reworked`, `moved`, `rarity`,
 *         `shared`), and the ones the data can answer are checked: a row
 *         marked `deferred` is not dealt and a row not dealt is marked
 *         `deferred`, a tier that differs is marked `moved`, a rarity that
 *         differs is marked `rarity`, and a dealt row that matches the sheet in
 *         every way must say `implemented`;
 *       - `add`: no data row of that name exists yet.
 *     Every row that is not retired is on the sheet once: on a tier table, or
 *     on the shared table marked `shared` while it waits to move to
 *     `common.json` (The Assay waited there until batch S5 moved it);
 *   · **the types** (batch S1b): every row the sheet lists, the shared ones
 *     included, carries the Type cell's type in the data, and a retired row
 *     carries none. `dominion.test.ts` checks that no other row is typed;
 *   · **the counts tables** count the sheet's rows, the charters included;
 *   · the retired rows are dealt to nobody and say in plain words why they
 *     were cut;
 *   · the live rows speak through the describers, the deferred rows carry a
 *     plain sentence and no effects, and the thirteen charters name the
 *     thirteen charter technologies;
 *   · a Scientific seat is dealt only live rows;
 *   · what the live rows do on a board, and that the rows a seat already
 *     holds keep paying after they are retired;
 *   · the Scientific shelf of `docs/orders-and-doctrines.md` says of each row
 *     what the row says of itself. `statecraftDocSync.test.ts` is the strict
 *     mirror of the live rows.
 *
 * `test/sim/charterTechs.test.ts` pins the charter technologies,
 * `test/sim/decks/scientificTraits.test.ts` the line traits and
 * `test/sim/decks/scientificCharters.test.ts` the building charters (batch
 * S4), which deal eight more charters, and
 * `test/sim/decks/scientificLand.test.ts` the learned land (batch S5), which
 * deals the last two and builds the Academy cards.
 * `test/sim/decks/scientificResearch.test.ts` pins the research record (batch
 * S6): the cards that pay for completing technologies and for the
 * technologies and charters a seat holds.
 * `test/sim/decks/scientificCards.test.ts` pins the data-only cards of Tiers
 * 0 to II (batch S7).
 */

import { describe, expect, it } from 'vitest';

import { type Game } from '../../../src/sim/game';
import { getTileAt, raiseImprovement, razeImprovement } from '../../../src/sim/map';
import { refreshCityDerived } from '../../../src/sim/cities';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { explainCity, foldCity } from '../../../src/sim/yields/town';
import {
  type GameState,
  addBuilding,
  bumpRevision,
  playerById,
} from '../../../src/sim/state';
import {
  cardAuthority,
  cardHappiness,
  cardProduction,
  deckPoolOf,
  describeCard,
  describeEffects,
  drawOrderOffer,
  eligibleFor,
  explainCardPercentYields,
  stripRefs,
} from '../../../src/sim/statecraft';
import { explainRenown } from '../../../src/sim/renown';
import { type BuildingId } from '../../../src/sim/buildingData';
import {
  type Band,
  type CardEffect,
  type CardType,
  type DeckId,
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  DECK_WORDS,
  ORDER_IDS,
  isCardType,
  isCharter,
  orderDef,
  orderIsDealt,
  orderType,
} from '../../../src/sim/statecraftData';
import {
  CHARTER_TECH_IDS,
  TECH_IDS,
  type TechAge,
  type TechId,
  isTechId,
  techDef,
} from '../../../src/sim/techData';
import { found, game } from '../statecraftHelpers';
import { createGame } from '../newGameHelpers';

/** The ids of `data/decks/scientific.json`, in file order. */
const DECK: readonly OrderId[] = DECK_FILE_ORDERS.scientific;

/** The rows the design withdrew, kept so that old saves load. */
const RETIRED = DECK.filter((id) => orderDef(id).retired === true);

/** Every row that is not retired. */
const CURRENT = DECK.filter((id) => orderDef(id).retired !== true);

/** The research charters, carrying their grant. */
const CHARTERS = CURRENT.filter((id) => isCharter(id));

/**
 * The charters whose whole gift is built, so they are dealt: three since batch
 * S1 (the line traits), eight more since batch S4 (the building charters) and
 * the last two since batch S5 (the Qanat and Niter Beds). A charter has no
 * effects: its gift is the research it opens and what the technology row
 * gives.
 */
const DEALT_CHARTERS: readonly OrderId[] = [
  'theBronzeFoundersCharter',
  'theMechanistsCharter',
  'theNavalGunnersCharter',
  'theHerbalistsCharter',
  'theGlassmakersCharter',
  'theLibrariansCharter',
  'thePaperMakersCharter',
  'thePhysiciansCharter',
  'thePrintersCharter',
  'theGunfoundersCharter',
  'theMilitaryEngineersCharter',
  'theSurveyorsCharter',
  'theAlchemistsCharter',
];

/**
 * A row with effects, a dealt charter, or a commission (batch S6, The Royal
 * Charter Commission: its goal and reward are the card): the half of the deck
 * that plays.
 */
const LIVE = CURRENT.filter(
  (id) =>
    orderDef(id).effects.length > 0 ||
    DEALT_CHARTERS.includes(id) ||
    orderDef(id).commission !== undefined,
);

/** A row with a sentence and nothing to slot: what later batches un-defer. */
const DEFERRED = CURRENT.filter((id) => !LIVE.includes(id));

const RARITIES: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];

/** The worksheet's rarity marks, the sync test's own table. */
const MARK: Record<OrderRarity, string> = { common: '●', uncommon: '◆', rare: '○' };

// --- the rows ----------------------------------------------------------------

describe('the rows', () => {
  it('is the whole deck, every current row named for this deck alone, banded and rated', () => {
    // S5 moved The Assay to common.json and added six cards. S6 added eleven.
    // S7 added nine.
    expect(DECK).toHaveLength(84);
    expect(new Set(DECK).size).toBe(84);
    for (const id of CURRENT) {
      const def = orderDef(id);
      expect(def.decks, id).toEqual(['scientific']);
      expect(BANDS, id).toContain(def.band);
      expect(RARITIES, id).toContain(def.rarity);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      // A row written after the rework carries neither of the old fields.
      expect(def.pool, id).toBeUndefined();
      expect(def.slot, id).toBeUndefined();
    }
    // Names are unique in the file, retired rows included.
    const names = DECK.map((id) => orderDef(id).name);
    expect(new Set(names).size, 'two rows share a name').toBe(names.length);
  });

  it('fills the five tiers with eleven, fourteen, sixteen, eleven and six current rows', () => {
    // S0 added ten charters and two cards. S1b retired twenty-four rows and
    // left twenty-six; the sheet's `add` rows join as later batches build them.
    // S2 added one card (Tier II) and S3 six (two each in Tiers I, II and III).
    // S5 added six (one in each tier, and two in Tier III), moved The School
    // of Mines from Tier I to Tier III, and moved The Assay to common.json.
    // S6 added eleven: three in Tier 0 and two in each of the others.
    // S7 added nine: two in Tier 0, three in Tier I and four in Tier II.
    const perBand = [0, 1, 2, 3, 4].map(
      (band) => CURRENT.filter((id) => orderDef(id).band === band).length,
    );
    expect(perBand).toEqual([11, 14, 16, 11, 6]);
  });

  it('splits into live rows with effects and deferred rows with a sentence, and nothing between', () => {
    expect(LIVE.length + DEFERRED.length).toBe(CURRENT.length);
    // S4 dealt eight charters: 21 live rows became 29. S5 dealt two more
    // charters and The School of Mines, added six cards and moved The Assay
    // out: 29 became 37, and The Second Seat is the one deferred row left.
    // S6 added eleven live rows, one of them a commission: 37 became 48.
    // S7 added nine live rows: 48 became 57.
    expect(LIVE).toHaveLength(57);
    for (const id of LIVE) {
      const def = orderDef(id);
      expect(def.text, `${id} is live and carries no ratified text`).toBeTruthy();
      expect(def.deferred, `${id} is live and also deferred`).toBeUndefined();
    }
    for (const id of DEFERRED) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, `${id} defers nothing in words`).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const line of def.deferred!) expect(line.trim(), id).toBeTruthy();
      // A deferred row prints no rules text: the effects are the truth, and a
      // row with none must not promise any.
      expect(def.text, `${id} is deferred and still prints rules text`).toBeUndefined();
    }
  });

  it('keeps every deferred sentence plain: no identifiers, no figures, no marks', () => {
    for (const id of DEFERRED) {
      for (const line of orderDef(id).deferred!) {
        expect(line, id).not.toMatch(/\d/);
        expect(line, id).not.toMatch(/\[\[/);
        expect(line, id).not.toMatch(/[%+]/);
      }
    }
  });
});

// --- the retired rows ----------------------------------------------------------

describe('the retired rows', () => {
  it('retires the cut rows of S0 and S1b, and nothing else', () => {
    expect(RETIRED).toEqual([
      'theCelestialRites',
      'fieldNotebooks',
      'naturalPhilosophy',
      'apprenticeEngineers',
      'theResearchAnnals',
      'practicalAstronomy',
      'patientResearch',
      'theOpenCollegium',
      'workingEstates',
      'thePracticalArts',
      'researchThroughConstruction',
      'theEndowedProvinces',
      'theMetallurgistsCharter',
      'theNaturalistsCharter',
      'theRoyalSociety',
      'theLearnedChancery',
      'theAcademyQuarter',
      'theInheritedSchool',
      'discoveriesThroughGreatPeople',
      'husbandryStudies',
      'thePatentRolls',
      'commissionsOfService',
      'masterArtificers',
      'theDistantColleges',
      'theSocietyOfArtificers',
      'theLearnedRealm',
    ]);
    // The one shared row both its sheets cut (batch S1b).
    expect(orderDef('theHydraulicCommonwealth').retired).toBe(true);
  });

  it('deals none of them, types none of them, and says in plain words why each was cut', () => {
    for (const id of [...RETIRED, 'theHydraulicCommonwealth' as OrderId]) {
      const def = orderDef(id);
      expect(orderIsDealt(id), `${id} is retired and still dealt`).toBe(false);
      expect(def.type, `${id} is retired and carries a type`).toBeUndefined();
      expect(orderType(id), id).toBe('unsorted');
      // The Compendium prints the note under the card, so it is player prose.
      expect(def.note, `${id} does not say why it was cut`).toMatch(/^Cut from (the deck|both its decks)\. /);
      expect(def.note, id).not.toMatch(/\d/);
      expect(def.note, id).not.toMatch(/\[\[/);
    }
  });
});

// --- the deck sheet, read ----------------------------------------------------

/** The deck sheet, the spec of record for the deck's cards. */
const sheetFiles = import.meta.glob('../../../docs/decks/scientific.md', {
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

/** The words a `modify` row may give after the colon (the sheet's own list). */
const REASONS = ['deferred', 'revised', 'reworked', 'moved', 'rarity', 'shared'] as const;
type Reason = (typeof REASONS)[number];

/** One card the sheet lists, in a tier table or the shared table. */
interface SheetCard {
  /** The name the sheet prints, without the bold and the "(was …)" note. */
  name: string;
  /** The name in the "(was …)" note, when the sheet gives one. */
  was?: string;
  rarity: OrderRarity;
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

/**
 * **The five tier tables**, in the sheet's own order: from the first tier
 * heading to the first level-two heading that is not a tier, so the shared
 * table and the retired rows after it are not read here.
 */
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
      rarity: cells[1] as OrderRarity,
      band,
      ...statusOf(cells[0]!, cells[2]!),
      text: cells[3]!,
      type: typeOf(cells[0]!, cells[4]),
    });
  }
  return cards;
}

/** **The shared table** ("Shared with another deck"), to the next level-two heading. */
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
    expect(alsoIn, `"${cells[0]}" is shared with Scientific itself`).not.toBe('scientific');
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
 * **A counts table**, found by its header row: each body row's first cell
 * (with the bold taken off) against its number cells, in order.
 */
function countsTable(header: string): Map<string, number[]> {
  const start = SHEET.indexOf(header);
  expect(start, `the sheet has the table "${header}"`).toBeGreaterThanOrEqual(0);
  const rows = new Map<string, number[]>();
  for (const line of SHEET.slice(start).split('\n').slice(2)) {
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

/** A charter's text, as the sheet and the data write it. */
const isCharterText = (text: string): boolean => text.startsWith('Drafting this opens ');

/**
 * The checks every sheet row with a data row shares, in either table: the
 * type, the charter mark, and what the status and its reasons claim.
 */
function checkAgainstRow(card: SheetCard, id: OrderId): void {
  const def = orderDef(id);
  expect(def.type, `${card.name}: the sheet's type`).toBe(card.type);
  expect(isCharter(id), `${card.name}: a charter on one side only`).toBe(isCharterText(card.text));
  const dealt = orderIsDealt(id);
  if (card.status === 'implemented') {
    expect(card.was, `${card.name} is implemented and renamed`).toBeUndefined();
    expect(dealt, `${card.name} is marked implemented but is not dealt`).toBe(true);
    expect(def.rarity, `${card.name}: the sheet's rarity`).toBe(card.rarity);
    expect(def.band, `${card.name}: the sheet's tier`).toBe(card.band);
    expect(def.text, `${card.name}: the sheet's ability`).toBe(card.text);
    return;
  }
  // Modify: the reasons the data can answer must be true, both ways.
  expect(card.reasons.includes('deferred'), `${card.name}: deferred on one side only`).toBe(!dealt);
  expect(card.reasons.includes('moved'), `${card.name}: a different tier on one side only`).toBe(
    def.band !== card.band,
  );
  expect(card.reasons.includes('rarity'), `${card.name}: a different rarity on one side only`).toBe(
    def.rarity !== card.rarity,
  );
  // A dealt row that matches the sheet in every way is implemented.
  const same =
    card.was === undefined && def.text === card.text && def.band === card.band && def.rarity === card.rarity;
  expect(dealt && same, `${card.name} matches its row and should say implemented`).toBe(false);
}

/** Every name in the registry: a card still to be added may reuse none of them. */
const TAKEN = new Set(ORDER_IDS.map((id) => orderDef(id).name));

describe('the Scientific deck: the sheet', () => {
  it('mirrors the five tier tables, card for card', () => {
    const sheet = sheetCards();
    const shared = sharedCards();
    expect(sheet.length, 'the sheet lists cards under every tier heading').toBeGreaterThan(0);
    const byName = new Map(CURRENT.map((id) => [orderDef(id).name, id] as const));
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
    // Every current row is on the sheet once: on a tier table, or on the shared
    // table while it waits to move to common.json.
    const listed = [
      ...sheet.filter((card) => card.status !== 'add'),
      ...shared.filter((card) => card.reasons.includes('shared')),
    ].map(dataNameOf);
    expect(new Set(listed).size, 'a data row is listed twice').toBe(listed.length);
    for (const name of byName.keys()) {
      expect(listed.includes(name), `"${name}" is a row the sheet does not list`).toBe(true);
    }
    expect(listed.length).toBe(CURRENT.length);
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
    const own = new Map(CURRENT.map((id) => [orderDef(id).name, id] as const));
    let checked = 0;
    for (const card of shared) {
      const name = dataNameOf(card);
      if (card.status === 'add') {
        expect(TAKEN.has(card.name), `"${card.name}" is marked add but the data has it`).toBe(false);
        continue;
      }
      if (card.reasons.includes('shared')) {
        // Still this deck's own row, waiting for its batch to move it.
        const id = own.get(name);
        expect(id, `"${name}" is marked shared and is not a row of this deck`).toBeDefined();
        expect(common.has(name), `"${name}" is marked shared but common.json has it`).toBe(false);
        checkAgainstRow(card, id!);
        checked += 1;
        continue;
      }
      const id = common.get(name);
      expect(id, `common.json has no row for "${name}"`).toBeDefined();
      // The row is the one the sheet means: shared by Scientific and the deck named.
      expect(orderDef(id!).decks, name).toContain('scientific');
      expect(orderDef(id!).decks, name).toContain(card.alsoIn);
      checkAgainstRow(card, id!);
      checked += 1;
    }
    expect(checked, 'every shared row in the data was checked').toBe(
      shared.filter((card) => card.status !== 'add').length,
    );
    expect(checked).toBeGreaterThan(0);
  });

  it('lists every shared row that names Scientific', () => {
    const names = new Set(sharedCards().map(dataNameOf));
    for (const id of DECK_FILE_ORDERS.common) {
      const def = orderDef(id);
      if (def.retired === true || !def.decks.includes('scientific')) continue;
      expect(names.has(def.name), `"${def.name}" names Scientific and is not on the shared table`).toBe(true);
    }
  });

  it('keeps every retired row off the tables', () => {
    const listed = new Set(
      [...sheetCards(), ...sharedCards()].flatMap((card) => [card.name, dataNameOf(card)]),
    );
    for (const id of [...RETIRED, 'theHydraulicCommonwealth' as OrderId]) {
      expect(listed.has(orderDef(id).name), `${id} is retired and still on the sheet`).toBe(false);
    }
  });

  it('counts its rows in the two counts tables, the charters included', () => {
    const sheet = sheetCards();
    const shared = sharedCards();
    const status = countsTable('| Tier | Implemented | Modify | Add | All | Charters |');
    const types = countsTable('| Tier | Military | Economic | Civic | Wildcard |');
    const byStatus = (cards: readonly SheetCard[]): number[] => [
      ...SHEET_STATUSES.map((s) => cards.filter((card) => card.status === s).length),
      cards.length,
      cards.filter((card) => isCharterText(card.text)).length,
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
    // The thirteen charters are all on the tier tables.
    expect(sheet.filter((card) => isCharterText(card.text))).toHaveLength(13);
  });
});

// --- the register ------------------------------------------------------------

describe('the live rows’ effects', () => {
  it('names only shapes the vocabulary has words for, and prints a clause for each', () => {
    for (const id of LIVE) {
      const effects = orderDef(id).effects;
      // `describeEffect` has an arm for every shape in the union and no silent
      // default, so a shape nobody wrote words for fails here.
      const speaking = effects.filter(
        (effect: CardEffect) =>
          effect.kind !== 'pays' || (effect.basis ?? 'flat') !== 'flat' || Object.keys(effect).length > 2,
      );
      const clauses = describeEffects(effects);
      expect(clauses.length, `${id} says ${speaking.length} things and prints ${clauses.length}`)
        .toBeGreaterThanOrEqual(speaking.length);
      for (const clause of clauses) expect(clause.text, id).toBeTruthy();
    }
  });

  it('prints through the describers with every keyword resolved, no raw marks on a surface', () => {
    for (const id of DECK) {
      const said = describeCard(id).map((clause) => clause.text);
      for (const text of said) {
        expect(stripRefs(text), id).toBeTruthy();
        expect(stripRefs(text), id).not.toContain('[[');
        expect(stripRefs(text), id).not.toContain(']]');
      }
    }
  });

  it('pays only through pairs the yields sequence already carries', () => {
    // `docs/yields.md`'s register: the hex at step 2, the town's flats and
    // counts at 3, and the capital's counts. A row reaching for a pair nobody
    // folds is a shape decision rather than a JSON row. The town's share of
    // its own fold left the live rows with The Society of Artificers (retired
    // in batch S1b). Batch S5 moved The Assay, the last realm count, to the
    // shared cards, and The Republic of Letters pays the capital by a count.
    // Batch S7's The Roll of Scholars and The Round City pay the empire a
    // percentage by a count, the pair Dominion's scalers already use.
    const pairs = new Set<string>();
    for (const id of LIVE) {
      for (const effect of orderDef(id).effects) {
        if (effect.kind !== 'pays') continue;
        pairs.add(`${effect.where}:${effect.basis ?? 'flat'}`);
        if (effect.where === 'hex') expect(effect.on, `${id} pays a hex with no condition`).toBeDefined();
      }
    }
    expect([...pairs].sort()).toEqual(['capital:count', 'city:count', 'city:flat', 'empire:count', 'hex:flat']);
  });
});

// --- the charters ------------------------------------------------------------

describe('the research charters', () => {
  it('names the thirteen charter technologies, one row each, deferred until their gift is built', () => {
    expect(CHARTERS).toHaveLength(13);
    const techs = CHARTERS.map((id) => orderDef(id).charter!.unlocks.tech);
    expect(new Set(techs)).toEqual(new Set(CHARTER_TECH_IDS));
    expect(techs).toHaveLength(CHARTER_TECH_IDS.length);
    for (const id of CHARTERS) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred === undefined, id).toBe(DEALT_CHARTERS.includes(id));
      expect(def.charter!.unlocks.building, id).toBeUndefined();
      expect(def.charter!.unlocks.rites, id).toBeUndefined();
    }
    for (const id of DEALT_CHARTERS) expect(CHARTERS, id).toContain(id);
  });

  it('names nodes the tree holds off the sky, and the retired rows name none it holds', () => {
    const sky = new Set<string>(TECH_IDS);
    for (const id of CHARTERS) {
      const tech = orderDef(id).charter!.unlocks.tech!;
      expect(isTechId(tech), `${id} names "${tech}", which is no technology`).toBe(true);
      expect(techDef(tech).charter, `${id} names "${tech}", which is not a charter row`).toBe(true);
      expect(sky.has(tech), `${id} names a node of the sky`).toBe(false);
    }
    for (const id of RETIRED) {
      const tech = orderDef(id).charter?.unlocks.tech;
      if (tech !== undefined) expect(isTechId(tech), id).toBe(false);
    }
  });

  /**
   * **Dealt by nobody until its gift is built.** A charter's grant is the
   * whole card, so a charter with no grant and a `deferred` sentence is in no
   * pool (`orderIsDealt`), like every other deferred row. A batch that builds
   * a charter's gift drops its `deferred` sentence, and the row is dealt from
   * the same turn.
   */
  it('is dealt by nobody until its gift is built, and neither is any other deferred row', () => {
    for (const id of CHARTERS) {
      expect(orderDef(id).effects, id).toEqual([]);
      if (DEALT_CHARTERS.includes(id)) {
        expect(orderIsDealt(id), `${id} has its whole gift and is not dealt`).toBe(true);
        continue;
      }
      expect(orderDef(id).deferred, id).toBeDefined();
      expect(orderIsDealt(id), `${id} is a deferred charter and still dealt`).toBe(false);
    }
    for (const id of DEFERRED) {
      expect(orderIsDealt(id), `${id} is deferred and still dealt`).toBe(false);
    }
    for (const id of RETIRED) expect(orderIsDealt(id), `${id} is retired and still dealt`).toBe(false);
    for (const id of LIVE) expect(orderIsDealt(id), id).toBe(true);
  });
});

// --- the draw ----------------------------------------------------------------

/** A duel with Hypatia in the first seat: Scientific and Magisterial. */
function seated(seed = 13): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Hypatia', color: '#d4502e', isHuman: true, leader: 'hypatiaOfAlexandria' },
      { name: 'Rival', color: '#3a7fe8', leader: 'pachacuti' },
    ],
  });
}

/** A technology of this age, for the band gate's research half. */
function techOfAge(age: TechAge): TechId {
  const id = TECH_IDS.find((tech) => techDef(tech).age === age);
  expect(id, `a technology of age ${age}`).toBeDefined();
  return id!;
}

/** Opens every band for this seat: the ladder's last rung and the last age. */
function openEveryBand(state: GameState, playerId: number): void {
  const player = playerById(state, playerId)!;
  player.statecraft.drafts = 29;
  for (const age of [2, 3, 4] as TechAge[]) player.techsResearched.push(techOfAge(age));
}

describe('a Scientific seat’s draw', () => {
  it('holds this deck’s live rows, its partner’s, the commons, and nothing deferred or retired', () => {
    const g = seated();
    const hypatia = playerById(g.state, 0)!;
    expect(hypatia.decks).toEqual(['scientific', 'magisterial']);
    openEveryBand(g.state, 0);
    const pool = deckPoolOf(g.state, hypatia);
    for (const id of pool) {
      expect(orderDef(id).decks.some((deck) => hypatia.decks.includes(deck)) || orderDef(id).decks.length === 0, id)
        .toBe(true);
      expect(orderIsDealt(id), id).toBe(true);
      // Nothing half-built reaches a hand: a dealt row of this deck either pays
      // something, is a charter whose gift is built, or is a commission.
      if (DECK.includes(id)) {
        expect(
          orderDef(id).effects.length > 0 || isCharter(id) || orderDef(id).commission !== undefined,
          id,
        ).toBe(true);
      }
    }
    for (const id of LIVE) expect(pool, id).toContain(id);
    for (const id of DEFERRED) expect(pool, id).not.toContain(id);
    for (const id of RETIRED) expect(pool, id).not.toContain(id);
  });

  it('deals an opening seat only band-nought rows of its own pool, over twenty seeded hands', () => {
    // Hypatia also holds Magisterial, and the commons deal to everybody, so the
    // shelf is the seat's whole pool at band nought, and this deck's own share
    // of it is checked as well.
    const g = seated(21);
    const hypatia = playerById(g.state, 0)!;
    const sc = hypatia.statecraft;
    const mine = LIVE.filter((id) => orderDef(id).band === 0);
    expect(mine.length).toBeGreaterThan(0);
    const opening = deckPoolOf(g.state, hypatia).filter((id) => orderDef(id).band === 0);
    for (const id of mine) expect(opening, id).toContain(id);
    expect(eligibleFor(g.state, hypatia).slice().sort()).toEqual(opening.slice().sort());
    const seen = new Set<OrderId>();
    for (let n = 1; n <= 20; n++) {
      sc.drafts = 0;
      delete sc.pendingOrder;
      const offer = drawOrderOffer(g.state, hypatia);
      expect(new Set(offer.options).size).toBe(offer.options.length);
      for (const id of offer.options) {
        expect(opening, `hand ${n} dealt "${id}"`).toContain(id);
        seen.add(id);
      }
    }
    // Over twenty hands the draw is not stuck on one row: it reaches well past
    // a single hand's worth of the shelf.
    expect(seen.size).toBeGreaterThan(3);
  });

  it('deals a fully opened seat nothing this deck defers or retired, over forty seeded hands', () => {
    const g = seated(34);
    const hypatia = playerById(g.state, 0)!;
    const sc = hypatia.statecraft;
    openEveryBand(g.state, 0);
    const refused = new Set([...DEFERRED, ...RETIRED]);
    for (let n = 1; n <= 40; n++) {
      sc.drafts = 29;
      delete sc.pendingOrder;
      for (const id of drawOrderOffer(g.state, hypatia).options) {
        expect(refused.has(id), `hand ${n} dealt the deferred or retired "${id}"`).toBe(false);
      }
    }
  });

  it('deals the same hand from the same generator state', () => {
    const a = seated(5);
    const b = seated(5);
    for (const g of [a, b]) playerById(g.state, 0)!.statecraft.drafts = 1;
    expect(drawOrderOffer(b.state, playerById(b.state, 0)!)).toEqual(
      drawOrderOffer(a.state, playerById(a.state, 0)!),
    );
  });
});

// --- the live rows, on a board -------------------------------------------------

/** Grants a card and seats it, the way `statecraft.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

describe('what the live rows do on a board', () => {
  it('The Almanac: a Library town works one point harder, and the shelf is cheaper', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library');
    refreshCityDerived(g.state, city);
    // The line hangs on the shelf it names (`cardLinesOnBuilding`), so the
    // ledger says which building the point came from.
    const named = () =>
      explainCity(g.state, city).lines.filter((line) => line.source.startsWith('Order · The Almanac'));
    expect(named()).toEqual([]);
    slot(g.state, 0, 'scientificTheAlmanac');
    const line = named();
    expect(line).toHaveLength(1);
    expect(line[0]!.production).toBe(1);
    // And a town with no Library is untouched: the scope is the whole rule.
    city.buildings.splice(city.buildings.indexOf('library'), 1);
    refreshCityDerived(g.state, city);
    expect(named()).toEqual([]);
  });

  it('The Scribes’ Hall: a Library town pays by its own citizens, not the realm’s', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library');
    city.population = 12;
    refreshCityDerived(g.state, city);
    const before = foldCity(g.state, city);
    slot(g.state, 0, 'scientificTheScribesHall');
    const after = foldCity(g.state, city);
    expect(after.science).toBe(before.science + 3);
    expect(after.culture).toBe(before.culture + 4);
  });

  // --- D2d, the age stamp ----------------------------------------------------
  //
  // These rows read `City.buildingTurns`, `Tile.improvedOn` and the scopes that
  // read them. Each test checks both sides of the threshold, "not yet, and
  // then yes", because a test that only checked the paying side would also
  // pass if the scope admitted everything.

  it('The Long Study: a young Library pays nothing, an old one pays, and a very old one pays twice', () => {
    const g = game();
    const city = found(g.state, 0);
    g.state.turn = 10;
    addBuilding(g.state, city, 'library');
    refreshCityDerived(g.state, city);
    slot(g.state, 0, 'theLongStudy');
    const lines = () =>
      explainCity(g.state, city).lines.filter((line) =>
        line.source.startsWith('Order · The Long Study'),
      );
    const renown = () =>
      explainRenown(g.state, 0).filter((line: { source: string }) =>
        line.source.includes('The Long Study'),
      );
    expect(lines(), 'a Library raised this turn is not an old Library').toEqual([]);
    expect(renown()).toEqual([]);

    g.state.turn = 30;
    bumpRevision(g.state);
    refreshCityDerived(g.state, city);
    const twenty = lines();
    expect(twenty).toHaveLength(1);
    expect(twenty[0]!.culture).toBe(2);
    expect(renown()).toHaveLength(1);

    // At forty the second clause joins the first, so the card's printed "+4
    // culture" is two labelled lines and not a figure computed beside them.
    g.state.turn = 50;
    bumpRevision(g.state);
    refreshCityDerived(g.state, city);
    const forty = lines();
    expect(forty).toHaveLength(2);
    expect(forty.reduce((sum, line) => sum + line.culture, 0)).toBe(4);
    expect(renown()).toHaveLength(2);
  });

  it('The Old Academy: an old Academy pays on its hex, and a young one does not', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const ctx = () => yieldContextFor(g.state, 0);
    g.state.turn = 6;
    raiseImprovement(tile, 'academy', g.state.turn);
    slot(g.state, 0, 'theOldAcademy');
    const paid = () =>
      explainTileYield(tile, ctx()).filter((line) =>
        line.source.startsWith('Order · The Old Academy'),
      );
    expect(paid()).toEqual([]);

    g.state.turn = 26;
    expect(paid()).toHaveLength(1);
    expect(paid()[0]!.food).toBe(3);
    expect(paid()[0]!.production).toBe(3);

    // At forty the second clause joins the first. `explainTileYield` folds rows
    // of one source together, so the two clauses read as one labelled entry,
    // and the "+6 of each" is still their sum (rule 5).
    g.state.turn = 46;
    const old = paid();
    expect(old.reduce((sum, line) => sum + line.food, 0)).toBe(6);
    expect(old.reduce((sum, line) => sum + line.production, 0)).toBe(6);

    // An Academy raised again on the same ground is a new Academy: the stamp
    // belongs to the work.
    razeImprovement(tile);
    raiseImprovement(tile, 'academy', g.state.turn);
    expect(paid()).toEqual([]);
  });

  it('Enduring Institutions: the oldest empire building is the one that admits the town', () => {
    // Batch S7 brought the row to the sheet's text: +25% production, and no
    // happiness. `scientificCards.test.ts` checks the card in full.
    const g = game();
    const city = found(g.state, 0);
    g.state.turn = 4;
    addBuilding(g.state, city, 'forum');
    slot(g.state, 0, 'enduringInstitutions');
    const share = () =>
      explainCardPercentYields(g.state, city).filter((line) => line.card === 'enduringInstitutions');
    expect(share()).toEqual([]);

    g.state.turn = 24;
    bumpRevision(g.state);
    expect(share()).toHaveLength(1);
    expect(share()[0]!.yield).toBe('production');
    expect(share()[0]!.percent).toBe(25);

    // A second empire building raised this turn does not make the town's
    // institutions young again: the reading is the oldest one.
    addBuilding(g.state, city, 'caravanserai');
    bumpRevision(g.state);
    expect(share()).toHaveLength(1);
    expect(cardHappiness(g.state, 0).filter((line) => line.card === 'enduringInstitutions')).toEqual([]);
  });

  it('The Long Inheritance: the production waits on the age of the Academy the citizens stand on', () => {
    // Batch S5 brought the row to the sheet's text: an Academy, not any
    // great-person work, and +30% toward empire buildings, wonders and the
    // Magnum Opus (an empire building), with no second clause.
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    tile.terrain = 'grassland';
    tile.hills = false;
    tile.feature = 'none';
    g.state.turn = 2;
    raiseImprovement(tile, 'academy', g.state.turn);
    city.workedTiles = [{ col: tile.col, row: tile.row }];
    slot(g.state, 0, 'theLongInheritance');
    const toward = (category: 'building' | 'wonder', id: BuildingId) =>
      cardProduction(g.state, city, category, undefined, id).filter(
        (line) => line.card === 'theLongInheritance',
      );
    expect(toward('building', 'forum'), 'an academy laid this turn is not an old academy').toEqual([]);

    g.state.turn = 22;
    bumpRevision(g.state);
    expect(toward('building', 'forum')).toHaveLength(1);
    expect(toward('building', 'forum')[0]!.percent).toBe(30);
    expect(toward('building', 'theMagnumOpus')[0]!.percent).toBe(30);
    expect(toward('wonder', 'pyramids')[0]!.percent).toBe(30);
    // An ordinary building is not an empire building and takes nothing.
    expect(toward('building', 'granary')).toEqual([]);

    // Another great person's work is not an Academy.
    razeImprovement(tile);
    raiseImprovement(tile, 'landmark', 2);
    bumpRevision(g.state);
    expect(toward('building', 'forum')).toEqual([]);
  });
});

// --- retired rows a seat already holds ---------------------------------------

/**
 * **A retired card still pays a seat that holds it.** Retiring a row takes it
 * out of every pool, but a seat that drafted it before keeps it, and it pays
 * what it says (the Compendium's "Withdrawn" line). These rows were retired in
 * batch S1b; the tests stay because they are the board checks for the shapes
 * the rows use.
 */
describe('retired rows a seat already holds', () => {
  it('Working Estates and Master Artificers: the works pay, and the ordinary ground does not', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const ctx = () => yieldContextFor(g.state, 0);
    const bare = explainTileYield(tile, ctx()).length;
    tile.improvement = 'academy';
    const plain = explainTileYield(tile, ctx());
    slot(g.state, 0, 'workingEstates');
    slot(g.state, 0, 'masterArtificers');
    const paid = explainTileYield(tile, ctx());
    expect(paid).toHaveLength(plain.length + 2);
    const added = paid.slice(plain.length);
    expect(added.map((line) => line.source)).toEqual([
      'Order · Working Estates',
      'Order · Master Artificers',
    ]);
    expect(added[0]!.food).toBe(5);
    expect(added[0]!.gold).toBe(3);
    expect(added[1]!.production).toBe(9);
    expect(added[1]!.gold).toBe(9);
    // A holy site is a great person's work and is not one of the five these
    // rows name: the Academy, the Landmark, the Manufactory, the Customs House
    // and the Citadel.
    tile.improvement = 'holySite';
    expect(explainTileYield(tile, ctx()).length).toBeLessThan(paid.length);
    delete tile.improvement;
    expect(explainTileYield(tile, ctx())).toHaveLength(bare);
  });

  it('The Learned Realm: authority counts every such town, happiness only the old libraries', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    tile.terrain = 'grassland';
    tile.hills = false;
    tile.feature = 'none';
    g.state.turn = 3;
    raiseImprovement(tile, 'manufactory', g.state.turn);
    city.workedTiles = [{ col: tile.col, row: tile.row }];
    addBuilding(g.state, city, 'library');
    slot(g.state, 0, 'theLearnedRealm');
    const authority = () =>
      cardAuthority(g.state, 0).filter((line) => line.card === 'theLearnedRealm');
    const glad = () =>
      cardHappiness(g.state, 0).filter((line) => line.card === 'theLearnedRealm');
    // The authority asks nothing about age: a town working a great work counts
    // the turn the citizen is placed.
    expect(authority()).toHaveLength(1);
    expect(authority()[0]!.amount).toBe(1);
    expect(glad(), 'a Library raised this turn is not an old Library').toEqual([]);

    g.state.turn = 23;
    bumpRevision(g.state);
    expect(glad()).toHaveLength(1);
    expect(glad()[0]!.amount).toBe(2);
  });
});

// --- the worksheet -------------------------------------------------------------

/**
 * **The worksheet's Scientific shelf** (`docs/orders-and-doctrines.md`). The
 * strict mirror (every live row on the shelf, and every shelf row a live row)
 * is `statecraftDocSync.test.ts`'s. This checks the part this deck can answer:
 * whatever the shelf says about a row of this deck agrees with the row.
 */
describe('the worksheet’s Scientific shelf', () => {
  const docFiles = import.meta.glob('../../../docs/orders-and-doctrines.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  function shelfRows(): string[][] {
    const start = DOC.indexOf('### Scientific');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n### ', start + '### Scientific'.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows: string[][] = [];
    for (const line of section.split('\n')) {
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells[0] === 'Order' || cells.every((cell) => /^-+$/.test(cell))) continue;
      rows.push(cells);
    }
    return rows;
  }

  it('says of every row it carries exactly what that row says of itself', () => {
    const byName = new Map(DECK.map((id) => [orderDef(id).name, id] as const));
    const rows = shelfRows();
    expect(rows).toHaveLength(LIVE.length);
    for (const cells of rows) {
      const id = byName.get(cells[0]!);
      expect(id, `the shelf names "${cells[0]}", which is no row of this deck`).toBeDefined();
      const def = orderDef(id!);
      expect(LIVE, `${cells[0]} is deferred or retired and on the shelf`).toContain(id);
      expect(Number(cells[1]), `${cells[0]}: band`).toBe(def.band);
      expect(cells[2], `${cells[0]}: rarity`).toBe(MARK[def.rarity]);
      expect(cells[4], `${cells[0]}: the row's own words`).toBe(def.text);
    }
  });
});
