/**
 * The Compendium: every table in the game, read back off the data.
 *
 * The claims worth pinning are the ones whose failure mode is *silence*. A
 * reference page cannot crash on a row it does not understand — it prints a
 * blank clause, or drops the row, or invents a number — and every one of those
 * ships. So:
 *
 *   1. **Every row of every table is on a shelf**, counted against the table
 *      itself rather than against a figure written down here. A resource added
 *      to `resources.json` and forgotten in the reference is a resource a player
 *      cannot look up.
 *   2. **No entry prints an empty clause or an empty figure.** A bullet with
 *      nothing after it is what a describer that answered `undefined` looks
 *      like, and it looks like a design decision.
 *   3. **Every id is unique and is `kind:id`.** The id is three things at once —
 *      the DOM id, the URL hash, and `open`'s argument — so a duplicate is a
 *      deep link that lands on whichever card happens to be first.
 *   4. **The two panes' decisions**, as pure functions: which shelf a search
 *      leaves open, and where a deep link lands. This suite has no jsdom (see
 *      `vite.config.ts`), which is why `compendiumView` and `compendiumShow`
 *      exist at all — the same split `offerSpread` and `tileYieldLines` make.
 *   5. **Never hand-written prose about a number.** Read off the source, below,
 *      and it is the rule the whole module is built around.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, buildingDef, isWonder } from '../../src/sim/buildingData';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { IMPROVEMENT_IDS } from '../../src/sim/improvementData';
import {
  ALL_BELIEF_IDS,
  BELIEF_IDS,
  CONSECRATION_IDS,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  RITE_IDS,
} from '../../src/sim/religionData';
import { RESOURCE_IDS } from '../../src/sim/resourceData';
import { DOCTRINE_IDS, ORDER_IDS } from '../../src/sim/statecraftData';
import { newGame } from '../../src/sim/state';
import { TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { TRIUMPH_IDS, triumphDef } from '../../src/sim/triumphData';
import {
  BEAD_DECK_AGES,
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
  BEAD_RULES,
  beadQuestDef,
} from '../../src/sim/beadData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import {
  DEFAULT_ENTRY,
  type CompendiumSection,
  type CompendiumSectionId,
  compendiumId,
  compendiumSections,
  compendiumShow,
  compendiumView,
  filterSections,
  sectionOfId,
} from '../../src/ui/compendium';
import { SHELF_INTRO_KEY, SHELF_INTROS } from '../../src/ui/compendiumShelves';
import { CONCEPT_ENTRIES, INTRO_ENTRIES } from '../../src/ui/compendiumText';
import {
  PAMPHLET_ENTRY_ID,
  PAMPHLET_PAGES,
  pamphletEntry,
} from '../../src/ui/pamphlet';
import { techRuleClauses, techsAwaitingRuleNotes } from '../../src/ui/techRuleWords';

const BOOK = compendiumSections();

/**
 * The lead page every *generated* shelf opens on, counted against the table.
 *
 * One page of prose per shelf that is built out of data rows, and none on the
 * two shelves that are already prose — so a shelf's length is its table's length
 * plus this, and a shelf that lost its lead page fails here rather than quietly
 * dropping a reader onto a strength figure with no idea what a unit is.
 */
const LEAD = 1;

function shelf(id: CompendiumSectionId): CompendiumSection {
  const found = BOOK.find((section) => section.id === id);
  if (!found) throw new Error(`no shelf ${id}`);
  return found;
}

function everyEntry(): CompendiumSection['entries'] {
  return BOOK.flatMap((section) => section.entries);
}

describe('the shelves', () => {
  it('holds every row of every table, counted against the table', () => {
    // Counted against the id lists rather than against a number written here:
    // a figure in a test is a second table, and the whole point of this page is
    // that there is only one. The two written shelves are counted against the
    // arrays they are built from, for the same reason one scale up.
    expect(shelf('intro').entries).toHaveLength(INTRO_ENTRIES.length);
    expect(shelf('concept').entries).toHaveLength(CONCEPT_ENTRIES.length);
    expect(shelf('unit').entries).toHaveLength(UNIT_TYPE_IDS.length + LEAD);
    expect(shelf('improvement').entries).toHaveLength(IMPROVEMENT_IDS.length + LEAD);
    expect(shelf('resource').entries).toHaveLength(RESOURCE_IDS.length + LEAD);
    expect(shelf('tech').entries).toHaveLength(TECH_IDS.length + LEAD);
    expect(shelf('order').entries).toHaveLength(ORDER_IDS.length + LEAD);
    expect(shelf('doctrine').entries).toHaveLength(DOCTRINE_IDS.length + LEAD);
    // **All three pools on one shelf** (religion v2), **and the cathedral's
    // patrons behind them** (Entry LV). A belief is one id space across three
    // bags, so the shelf is `ALL_BELIEF_IDS` and neither the follower nor the
    // enhancer pool may be quietly missing from it; a consecration is a card of
    // the same vocabulary out of the same file that nobody chooses, which is
    // five more rows and an eyebrow rather than a shelf of its own.
    expect(shelf('belief').entries).toHaveLength(
      ALL_BELIEF_IDS.length + CONSECRATION_IDS.length + LEAD,
    );
    expect(ALL_BELIEF_IDS.length).toBe(
      BELIEF_IDS.length + FOLLOWER_BELIEF_IDS.length + ENHANCER_BELIEF_IDS.length,
    );
    expect(shelf('rite').entries).toHaveLength(RITE_IDS.length + LEAD);
    expect(shelf('greatPerson').entries).toHaveLength(GREAT_PERSON_IDS.length + LEAD);
    expect(shelf('triumph').entries).toHaveLength(TRIUMPH_IDS.length + LEAD);

    // Buildings and wonders come off **one** table and are two shelves: a
    // wonder is a flag on a building row, not a second roster, so the two
    // together must be the whole of it and neither may be empty.
    const wonders = BUILDING_IDS.filter(isWonder);
    expect(shelf('wonder').entries).toHaveLength(wonders.length + LEAD);
    expect(shelf('building').entries).toHaveLength(BUILDING_IDS.length - wonders.length + LEAD);
    expect(shelf('building').entries.length).toBeGreaterThan(LEAD);
    expect(shelf('wonder').entries.length).toBeGreaterThan(LEAD);
  });

  it('says on every Triumph what earned it, before anything else', () => {
    // The user's ruling (2026-08-28). The shelf prints the row's own cause line
    // (`TriumphDef.text`) as the entry's first clause — the same sentence the
    // Triumph sheet prints, out of the same field, so the card that announces
    // one and the shelf that lists them cannot disagree. The epigram is the
    // entry's `flavor` and is labelled as such, which is why it is not here.
    for (const id of TRIUMPH_IDS) {
      const found = shelf('triumph').entries.find((one) => one.id === compendiumId('triumph', id));
      expect(found, id).toBeDefined();
      expect(found!.clauses[0]!.text, id).toBe(triumphDef(id).text);
      expect(found!.flavor, id).toBe(triumphDef(id).epigram);
    }
  });

  it('opens every generated shelf on a page that says what the shelf is', () => {
    // The ruling this pass is built on: a card read off a data row can say what
    // a thing *costs* and never what a thing *is*. So every shelf that is
    // generated opens on prose, at a stable address (`unit:about`) something
    // else in the interface can link to — and the two shelves that are already
    // prose deliberately have none.
    for (const section of BOOK) {
      const written = section.id === 'intro' || section.id === 'concept';
      const lead = section.entries[0]!;
      if (written) {
        expect(SHELF_INTROS[section.id], section.id).toBeUndefined();
        continue;
      }
      expect(lead.id, section.id).toBe(`${section.id}:${SHELF_INTRO_KEY}`);
      expect(lead, section.id).toBe(SHELF_INTROS[section.id]);
      expect(lead.written, section.id).toBe(true);
      expect(lead.rows, section.id).toEqual([]);
      // Two to four paragraphs, each of them saying something. A lead page that
      // came back with one empty paragraph is the failure mode this whole suite
      // is about: it looks like a design decision.
      expect(lead.clauses.length, section.id).toBeGreaterThan(1);
      for (const clause of lead.clauses) {
        expect(clause.text.trim().length, section.id).toBeGreaterThan(0);
      }
    }
  });

  it('has seventeen of them, every one with something on it', () => {
    // The index the brief names, plus the Bead Race's — the seventeenth, added
    // with the win condition. A shelf that came back empty would be a section
    // heading a reader clicks and learns nothing from.
    expect(BOOK).toHaveLength(17);
    for (const section of BOOK) {
      expect(section.name.length, section.id).toBeGreaterThan(0);
      expect(section.entries.length, section.id).toBeGreaterThan(0);
    }
  });

  it('puts the two written shelves first, ahead of Units', () => {
    expect(BOOK[0]!.id).toBe('intro');
    expect(BOOK[0]!.name).toBe('Introduction');
    expect(BOOK[1]!.id).toBe('concept');
    expect(BOOK[1]!.name).toBe('Concepts');
    expect(BOOK[2]!.id).toBe('unit');
  });

  it('builds the two written shelves from compendiumText’s own arrays', () => {
    // Every entry the module exports, and nothing it doesn't — the shelf is
    // exactly the array, not a paraphrase or a subset of it.
    expect(shelf('intro').entries).toEqual(INTRO_ENTRIES);
    expect(shelf('concept').entries).toEqual(CONCEPT_ENTRIES);
  });

  it('reads the technologies in age order', () => {
    // A reference is read forwards through the tree, which is not the order
    // `techs.json` happens to list its rows in.
    const ages = shelf('tech')
      .entries.filter((entry) => entry.written !== true)
      .map((entry) => techDef(entry.id.split(':')[1]! as never).age);
    expect([...ages].sort((a, b) => a - b)).toEqual(ages);
  });
});

describe('an entry', () => {
  it('never prints an empty clause, figure or name', () => {
    for (const entry of everyEntry()) {
      expect(entry.name.trim().length, entry.id).toBeGreaterThan(0);
      expect(entry.eyebrow.trim().length, entry.id).toBeGreaterThan(0);
      for (const clause of entry.clauses) {
        expect(clause.text.trim().length, `${entry.id} clause`).toBeGreaterThan(0);
      }
      for (const row of entry.rows) {
        expect(row.label.trim().length, `${entry.id} row label`).toBeGreaterThan(0);
        expect(row.figures.trim().length, `${entry.id}: ${row.label}`).toBeGreaterThan(0);
      }
      if (entry.flavor !== null) {
        expect(entry.flavor.trim().length, `${entry.id} flavor`).toBeGreaterThan(0);
      }
    }
  });

  it('has at least one clause for every written entry', () => {
    // A written card is nothing but prose (`rows` is always empty, see below),
    // so a card with no clauses at all would be a blank page.
    for (const entry of [
      ...INTRO_ENTRIES,
      ...CONCEPT_ENTRIES,
      ...Object.values(SHELF_INTROS),
    ]) {
      expect(entry.written, entry.id).toBe(true);
      expect(entry.rows, entry.id).toEqual([]);
      expect(entry.clauses.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('says something about itself — a figure, a clause, or both', () => {
    // The weakest thing a card may be and still be worth a card. A row that
    // produced neither would be a name in a list, which is what the index
    // already is.
    for (const entry of everyEntry()) {
      expect(entry.rows.length + entry.clauses.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('carries a unique id, and every id is its shelf and its row', () => {
    const seen = new Set<string>();
    for (const section of BOOK) {
      for (const entry of section.entries) {
        expect(seen.has(entry.id), entry.id).toBe(false);
        seen.add(entry.id);
        // `kind:id` — exactly one colon, the shelf on the left, something on
        // the right, and the shelf resolves back to the section it is on.
        const parts = entry.id.split(':');
        expect(parts, entry.id).toHaveLength(2);
        expect(parts[0]).toBe(section.id);
        expect(parts[1]!.length, entry.id).toBeGreaterThan(0);
        expect(sectionOfId(entry.id)).toBe(section.id);
        expect(entry.section).toBe(section.id);
      }
    }
  });

  it('is addressed by the id scheme the rest of the interface will link with', () => {
    // The three examples the brief names, spelled out — a change to the scheme
    // has to be a decision rather than a rename that quietly breaks every link.
    expect(compendiumId('unit', 'swordsman')).toBe('unit:swordsman');
    expect(compendiumId('tech', 'ironWorking')).toBe('tech:ironWorking');
    expect(compendiumId('order', 'bloodedSpears')).toBe('order:bloodedSpears');
    for (const id of ['unit:swordsman', 'tech:ironWorking'] as const) {
      expect(everyEntry().some((entry) => entry.id === id), id).toBe(true);
    }
    // Anything that is not a shelf is not an address.
    expect(sectionOfId('top')).toBeNull();
    expect(sectionOfId('nonsense:swordsman')).toBeNull();
  });

  it('wears the mark its own kind is drawn with, and no new ones', () => {
    // Three kinds and no fourth: the piece's badge, the resource's drawn mark,
    // the table's own glyph. A fourth would be an icon this pass invented.
    for (const entry of everyEntry()) {
      if (entry.mark === null) continue;
      expect(['badge', 'resource', 'glyph'], entry.id).toContain(entry.mark.kind);
    }
    // A unit wears its piece's badge class; a resource is drawn by the printer
    // resources are always drawn by.
    const swordsman = everyEntry().find((entry) => entry.id === 'unit:swordsman');
    expect(swordsman?.mark).toEqual({ kind: 'badge', badge: unitDef('swordsman').modelClass });
    const wheat = everyEntry().find((entry) => entry.id === 'resource:wheat');
    expect(wheat?.mark).toEqual({ kind: 'resource', resource: 'wheat' });
  });
});

describe('a live game changes one figure and no others', () => {
  it('prices a unit off explainUnitCost’s roster line, which is the row’s own', () => {
    // The whole claim the standalone page rests on: the book is the same book
    // with a game behind it and without one. The *only* figure that could move
    // is a unit's price, and the Compendium prints the fold's first line —
    // the roster's own — which is state-independent by construction.
    const state = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#a00', isHuman: true },
        { name: 'Cobalt', color: '#00a', isHuman: true },
      ],
    });
    const withGame = compendiumSections(state);
    expect(withGame.map((section) => section.entries.length)).toEqual(
      BOOK.map((section) => section.entries.length),
    );
    for (const section of withGame) {
      const bare = shelf(section.id);
      for (const [index, entry] of section.entries.entries()) {
        expect(entry, entry.id).toEqual(bare.entries[index]);
      }
    }
  });
});

describe('the index', () => {
  it('opens on the Introduction’s first page by default', () => {
    expect(DEFAULT_ENTRY).toBe('intro:howToPlay');
    expect(everyEntry().some((entry) => entry.id === DEFAULT_ENTRY)).toBe(true);
    const landing = compendiumShow(BOOK, '', DEFAULT_ENTRY);
    expect(landing).toEqual({ openSection: 'intro', marked: 'intro:howToPlay', clearSearch: false });
  });

  it('finds “trader” on the Concepts shelf, in the prose rather than a name', () => {
    const filtered = filterSections(BOOK, 'trader');
    const hits = filtered.find((section) => section.id === 'concept')!.entries;
    expect(hits.length).toBeGreaterThan(0);
    for (const entry of hits) {
      expect(entry.written).toBe(true);
      expect(entry.clauses.some((clause) => clause.text.toLowerCase().includes('trader'))).toBe(
        true,
      );
    }
  });

  it('filters by a plain substring over the names, keeping every shelf’s row', () => {
    const filtered = filterSections(BOOK, 'sword');
    // Every shelf survives, so the index never reflows under the cursor.
    expect(filtered).toHaveLength(BOOK.length);
    expect(filtered.map((section) => section.id)).toEqual(BOOK.map((section) => section.id));
    const hits = filtered.flatMap((section) => section.entries);
    expect(hits.length).toBeGreaterThan(0);
    for (const entry of hits) expect(entry.name.toLowerCase()).toContain('sword');

    // Case-folded, and trimmed — a search box is typed into.
    expect(filterSections(BOOK, '  SWORD ').flatMap((s) => s.entries).map((e) => e.id)).toEqual(
      hits.map((entry) => entry.id),
    );
    // An empty box is the whole book.
    expect(filterSections(BOOK, '').flatMap((s) => s.entries)).toHaveLength(everyEntry().length);
  });

  it('moves off a shelf a search has emptied, and only then', () => {
    // The rule that keeps a reader from staring at a blank page beside an index
    // full of matches.
    const stays = compendiumView(BOOK, '', 'resource');
    expect(stays.openSection).toBe('resource');

    // "swordsman" is on the unit shelf and nowhere else, so an open Resources
    // shelf has to give way to it.
    const moved = compendiumView(BOOK, 'swordsman', 'resource');
    expect(moved.openSection).toBe('unit');
    const hits = moved.sections.find((section) => section.id === 'unit')!.entries;
    expect(hits.length).toBeGreaterThan(0);
    for (const entry of hits) expect(entry.name.toLowerCase()).toContain('swordsman');
    // And nothing else on any other shelf, which is what made the move forced.
    for (const section of moved.sections) {
      if (section.id !== 'unit') expect(section.entries, section.id).toHaveLength(0);
    }

    // A search that matches nothing at all moves nowhere: there is no better
    // shelf to be on, and jumping would be the page deciding for the reader.
    const nothing = compendiumView(BOOK, 'zzzznothing', 'resource');
    expect(nothing.openSection).toBe('resource');
    for (const section of nothing.sections) expect(section.entries).toHaveLength(0);
  });
});

describe('a deep link', () => {
  it('opens the shelf and marks the entry', () => {
    const landing = compendiumShow(BOOK, '', 'unit:swordsman');
    expect(landing).toEqual({ openSection: 'unit', marked: 'unit:swordsman', clearSearch: false });
  });

  it('outranks the search box rather than failing silently', () => {
    // The caller asked for one entry by name. A filter that hid it would be the
    // address doing nothing, which is the worst answer a link can give.
    const landing = compendiumShow(BOOK, 'granary', 'unit:swordsman');
    expect(landing?.marked).toBe('unit:swordsman');
    expect(landing?.clearSearch).toBe(true);
  });

  it('answers nothing at all for an address that names no entry', () => {
    expect(compendiumShow(BOOK, '', 'top')).toBeNull();
    expect(compendiumShow(BOOK, '', 'unit:nosuchunit')).toBeNull();
    expect(compendiumShow(BOOK, '', 'unit')).toBeNull();
  });
});

/**
 * **The Pamphlet's page** (`src/ui/pamphlet.ts`, ruled 2026-09-03): the
 * five-minute read a new player skims before the tutorial lives on the
 * Introduction shelf forever after, at a stable anchor the overlay's dismissal
 * note and the tutorial's last card can point to. What is held here is the
 * book's half of the bargain — the anchor resolves, a deep link lands, the
 * search reaches the prose, and every keyword mark in it points at a page the
 * book actually has. The first-run half (the memory, the ordering against the
 * tutorial) is in `tutorial.test.ts`, beside the guide it front-runs.
 */
describe('the pamphlet page', () => {
  it('stands first on the Introduction shelf, at its stable anchor', () => {
    const intro = shelf('intro');
    expect(intro.entries[0]!.id).toBe(PAMPHLET_ENTRY_ID);
    // The literal in `pamphlet.ts` and the composer agree — the entry id is
    // the DOM id, the URL hash and `open`'s argument, so a drifted spelling
    // would be a link that lands nowhere.
    expect(PAMPHLET_ENTRY_ID).toBe(compendiumId('intro', 'pamphlet'));
    // And the book still opens on How to play: the pamphlet is the front
    // matter a reader is *sent* to, not the page every open lands on.
    expect(DEFAULT_ENTRY).toBe('intro:howToPlay');
  });

  it('is a written page whose clauses are the pages’ own lines', () => {
    const entry = pamphletEntry();
    expect(entry.written).toBe(true);
    expect(entry.pamphlet).toBe(true);
    expect(entry.rows).toEqual([]);
    // Every line of every page, in flipping order — that is what the index's
    // search walks, so a page left out of the clauses would be a page no
    // search could find.
    expect(entry.clauses.map((clause) => clause.text)).toEqual(
      PAMPHLET_PAGES.flatMap((page) => [...page.lines]),
    );
  });

  it('lands a deep link and answers a search over its prose', () => {
    const landing = compendiumShow(BOOK, '', PAMPHLET_ENTRY_ID);
    expect(landing).toEqual({ openSection: 'intro', marked: PAMPHLET_ENTRY_ID, clearSearch: false });
    // "balks" appears only on the pamphlet's End Turn page; a reader typing
    // it is looking for the sentence, and `entry.written` is what widens the
    // search to it.
    const hits = filterSections(BOOK, 'balks').flatMap((section) => section.entries);
    expect(hits.map((entry) => entry.id)).toContain(PAMPHLET_ENTRY_ID);
  });

  it('points every keyword mark at a page the book actually has', () => {
    const mark = /\[\[([a-zA-Z]+):([A-Za-z0-9_]+)\|([^[\]|]*)\]\]/g;
    const ids = new Set(everyEntry().map((entry) => entry.id));
    let refs = 0;
    for (const page of PAMPHLET_PAGES) {
      for (const text of page.lines) {
        for (const found of text.matchAll(new RegExp(mark.source, 'g'))) {
          refs += 1;
          const target = `${found[1]}:${found[2]}`;
          expect(ids.has(target), `${page.id} → ${target}`).toBe(true);
          expect(found[3]!.length, `${page.id} → ${target}`).toBeGreaterThan(0);
        }
      }
    }
    // The sweep is not vacuous: the pamphlet does name things the book keeps.
    expect(refs).toBeGreaterThan(3);
  });

  it('is drawn by its own printer on the card, not as flat paragraphs', () => {
    const source = sourceOf('compendium.ts');
    expect(source).toContain("import { renderPamphletBody } from './pamphlet'");
    expect(source).toMatch(/entry\.pamphlet === true/);
    expect(source).toContain('renderPamphletBody(leaf)');
  });
});

/**
 * The rule the whole module exists for, read off its own source.
 *
 * **Never hand-written prose about a number.** Every figure on this page has to
 * arrive by interpolation from a data row or an evaluator, which makes the rule
 * mechanical: *no string literal in `compendium.ts` may contain a digit*. A
 * sentence that says "a route pays 3 gold" fails; one that says
 * `` `pays ${figure(trade.goldPerCombinedPop)}` `` passes, and stays true when a
 * designer retunes the row.
 *
 * A source-reading test rather than a behavioural one for the reason
 * `test/ui/seatRoster.test.ts` gives where it does the same thing: the only
 * property that distinguishes a correct file from a nearly-correct one is *where
 * the number came from*, and a hard-coded figure that happens to match today
 * passes every behavioural test there is.
 */
const UI_SOURCE = import.meta.glob('../../src/ui/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function sourceOf(file: string): string {
  const key = Object.keys(UI_SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(key === undefined ? `${file} missing` : `${file} readable`).toBe(`${file} readable`);
  return UI_SOURCE[key!]!;
}

/**
 * Every string and template-literal chunk in a TypeScript source, with comments
 * and interpolations removed.
 *
 * A small state machine rather than a regex, for the one reason a regex cannot
 * be trusted here: `//` inside a string and a quote inside a comment each break
 * the naive version, in opposite directions. Interpolated expressions are
 * dropped because that is exactly what this rule *permits* — `${figure(n)}` is
 * the correct way to put a number on the page.
 */
function stringLiterals(source: string): string[] {
  const out: string[] = [];
  let i = 0;
  let current: string | null = null;
  let quote = '';
  let depth = 0;
  while (i < source.length) {
    const ch = source[i]!;
    const next = source[i + 1] ?? '';
    if (current === null) {
      if (ch === '/' && next === '/') {
        while (i < source.length && source[i] !== '\n') i += 1;
        continue;
      }
      if (ch === '/' && next === '*') {
        i += 2;
        while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
        i += 2;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        current = '';
        quote = ch;
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (ch === '\\') {
      i += 2;
      continue;
    }
    // An interpolation: skip its expression, braces balanced, and keep reading
    // the template's own text on the other side.
    if (quote === '`' && ch === '$' && next === '{') {
      i += 2;
      depth = 1;
      while (i < source.length && depth > 0) {
        if (source[i] === '{') depth += 1;
        else if (source[i] === '}') depth -= 1;
        i += 1;
      }
      continue;
    }
    if (ch === quote) {
      out.push(current);
      current = null;
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  return out;
}

/**
 * The one stated exception: an HTML **heading level**.
 *
 * `h3` and `h4` are tag names handed to `document.createElement`, never text
 * anybody reads, and they are the only strings in the module with a digit that
 * are not a claim about the game. Written as a rule with a reason rather than as
 * an allowlist of offenders, so a fourth heading level costs nothing and
 * `'2 gold'` still fails.
 */
function isHeadingTag(text: string): boolean {
  return /^h[1-6]$/.test(text);
}

/**
 * The Bead Race's shelf — the game's one win condition, read back off its own
 * table (design ledger Entry VI).
 *
 * Three claims, and each is a way the shelf could be quietly wrong: an entry
 * that carried no stable anchor (so a keyword could never link to it), a page
 * that named a figure in prose (the module's standing rule, which the scanner
 * above already holds over `compendiumShelves.ts`), and a shelf that listed the
 * feats but not the cards actually dealt.
 */
describe('the Bead Race shelf', () => {
  const shelf = BOOK.find((section) => section.id === 'bead')!;

  it('is on the index, named for what it is', () => {
    expect(shelf).toBeDefined();
    expect(shelf.name).toBe('The Bead Race');
  });

  it('opens on a lead page and then lists every card in the table', () => {
    const ids = shelf.entries.map((entry) => entry.id);
    expect(ids[0]).toBe('bead:about');
    expect(ids[1]).toBe('bead:rules');
    for (const id of [
      ...BEAD_FEAT_IDS,
      ...BEAD_ENDEAVOUR_IDS,
      ...BEAD_QUEST_IDS,
      ...BEAD_RECKONING_IDS,
    ]) {
      expect(ids, id).toContain(`bead:${id}`);
    }
  });

  it('gives every entry a stable anchor of its own', () => {
    for (const entry of shelf.entries) {
      expect(entry.id.startsWith('bead:'), entry.id).toBe(true);
      expect(sectionOfId(entry.id)).toBe('bead');
      expect(entry.name.length, entry.id).toBeGreaterThan(0);
      expect(entry.clauses.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('prints the threshold and the hand sizes from the rules row', () => {
    const rules = shelf.entries.find((entry) => entry.id === 'bead:rules')!;
    const labels = rules.rows.map((row) => row.label);
    expect(labels).toContain('Beads that win the game');
    const winning = rules.rows.find((row) => row.label === 'Beads that win the game')!;
    expect(winning.figures).toBe(String(BEAD_RULES.threshold));
    // One row per deck, and each carries that deck's own hand size.
    for (const age of BEAD_DECK_AGES) {
      const row = rules.rows.find((one) => one.label.startsWith('Cards on the table'));
      expect(row, String(age)).toBeDefined();
    }
    expect(rules.rows).toHaveLength(2 + BEAD_DECK_AGES.length);
  });

  it('says what a card does in the row’s own words', () => {
    for (const id of BEAD_QUEST_IDS) {
      const entry = shelf.entries.find((one) => one.id === `bead:${id}`)!;
      expect(entry.clauses[0]!.text, id).toBe(beadQuestDef(id).text);
    }
  });
});

describe('never hand-written prose about a number', () => {
  it('has no digit in any string the Compendium prints', () => {
    const offenders = stringLiterals(sourceOf('compendium.ts')).filter(
      (text) => /\d/.test(text) && !isHeadingTag(text),
    );
    expect(offenders).toEqual([]);
  });

  it('has no digit in the written shelves’ prose either', () => {
    // `compendiumText.ts` carries the same promise — "never about a number" —
    // in its own docblock, and the same scanner holds it, reused rather than
    // duplicated. `compendiumShelves.ts` is the third file under the rule: a
    // shelf's lead page is prose about a *kind* of thing, and the moment one of
    // them names a cost it is a second table beside the cards below it.
    for (const file of ['compendiumText.ts', 'compendiumShelves.ts']) {
      const offenders = stringLiterals(sourceOf(file)).filter((text) => /\d/.test(text));
      expect(offenders, file).toEqual([]);
    }
  });

  it('would catch a figure written by hand', () => {
    // The scanner itself, held still: it has to see through a comment and a
    // template's interpolation and still find prose that states a number.
    expect(stringLiterals("const a = 'pays 3 gold';").filter((t) => /\d/.test(t))).toEqual([
      'pays 3 gold',
    ]);
    expect(stringLiterals('const a = `pays ${figure(n)} gold`;').filter((t) => /\d/.test(t)))
      .toEqual([]);
    expect(stringLiterals("// dated 2026-08-27\nconst a = 'fine';").filter((t) => /\d/.test(t)))
      .toEqual([]);
    expect(stringLiterals("/* 2026 */ const a = 'fine';").filter((t) => /\d/.test(t))).toEqual([]);
  });

  it('reads every sentence about a rule out of the simulation’s own describers', () => {
    // The other half of the rule: the figures are interpolated *from somewhere*,
    // and that somewhere has to be the game rather than this file. Named one by
    // one because each is a describer whose absence would mean a paraphrase had
    // been written instead.
    const source = sourceOf('compendium.ts');
    for (const describer of [
      'describeCard', // the one place a card effect becomes words
      'describeResourceSignature', // the same bargain for a luxury
      'techGifts', // what a technology hands over
      'explainUnitCost', // the roster's own price
      'riteGrantWords', // a rite's instant half
      'gatingTech', // which technology unlocks a thing
      'improvementForResource', // which improvement opens a seam
      'RULES', // every tuned number in the game
    ]) {
      expect(source, describer).toContain(describer);
    }
    // And it imports them from the simulation rather than reimplementing them.
    expect(source).toContain("from '../sim/statecraft'");
    expect(source).toContain("from '../sim/resourceEffects'");
    expect(source).toContain("from '../sim/techUnlocks'");
    expect(source).toContain("from '../sim/rulesData'");
  });

  /**
   * The dry-settle rule reaches the reader on both shelves it belongs to (the
   * ruling of 2026-09-03), and off the **marker** rather than off a name: the
   * building entry says what raising it lifts, and the Cities concept says the
   * rule a player needs before they choose where to plant a town. Neither states
   * the number — a percentage in written prose is the one thing rule 7 forbids
   * — and neither names the row, so a second building that waters a town joins
   * the first sentence for free.
   */
  it('tells a reader that a town off fresh water grows slowly until it is watered', () => {
    const watering = BUILDING_IDS.filter((id) => buildingDef(id).waters === true);
    expect(watering.length).toBeGreaterThan(0);
    for (const id of watering) {
      const entry = everyEntry().find((row) => row.id === `building:${id}`);
      const prose = entry!.clauses.map((clause) => clause.text).join(' ');
      expect(prose, id).toContain('not beside fresh water');
      expect(prose, id).toContain('until this is built');
    }
    // And the concept a player reads before founding anything says the same
    // thing in the same words.
    const cities = everyEntry().find((row) => row.id === 'concept:cities');
    const concept = cities!.clauses.map((clause) => clause.text).join(' ');
    expect(concept).toContain('fresh water');
    expect(concept).toContain('aqueduct');
    expect(concept).not.toMatch(/\d/);
  });

  it('says which end of a trade route is read and which end is paid', () => {
    // The one sentence on this page that reads just as plausibly backwards, and
    // it *was* backwards until the user's reversal of 2026-08-27 (`trade.ts`,
    // `explainRouteYield`): the **origin's** buildings set the food and the
    // production, and the **destination** banks them. Pinned on the shape of the
    // claim rather than on the whole sentence, so the wording may be improved
    // and the direction may not be silently flipped back.
    const routes = everyEntry().find((entry) => entry.id === 'trade:routes');
    const prose = routes!.clauses.map((clause) => clause.text).join(' ');
    expect(prose).toContain('pays the city it goes to');
    expect(prose).toContain('depends on the buildings in the city it came from');
    // And the gold line is the one that is not read off either end alone.
    expect(prose).toContain('across the two cities together');
  });

  /**
   * The verb, in one wording everywhere (the user's ruling, 2026-08-28).
   *
   * Four surfaces say how a route is opened — the trader's own entry, the Trade
   * concept, the trade shelf's lead paragraph and the help card in
   * `index.html` — and before this pass three of them described a mode on the
   * board that no longer exists. Pinned on the two nouns the gesture *is*
   * ("Start route", the Trade screen) rather than on whole sentences, so the
   * prose may be improved and the mechanism may not silently drift back.
   */
  it('describes the one way a route is opened, in the same words on every shelf', () => {
    const written = everyEntry()
      .filter((entry) => entry.written === true)
      .map((entry) => entry.clauses.map((clause) => clause.text).join(' '));
    const concept = written.find((prose) => prose.includes('Once you have researched Currency'))!;
    expect(concept).toContain('Select a trader and choose Start route');
    expect(concept).toContain('the trader moves to the origin city and begins');

    // The trader's own roster entry, generated off `UnitDef.trades`.
    const trader = everyEntry().find((entry) => entry.id === 'unit:trader')!;
    const roster = trader.clauses.map((clause) => clause.text).join(' ');
    expect(roster).toContain('Start route');
    expect(roster).toContain('Trade screen');

    // And nothing anywhere still describes the deleted mode.
    for (const prose of written) {
      expect(prose).not.toContain('Send Caravan');
      expect(prose).not.toContain('send it from one of your cities');
    }
  });

  it('says the capacity refusal in the user’s own sentence', () => {
    // The one line the interface does not take from the reducer, and the
    // Compendium is a fourth surface that would otherwise word it a fifth way.
    const concept = everyEntry()
      .filter((entry) => entry.written === true)
      .map((entry) => entry.clauses.map((clause) => clause.text).join(' '))
      .find((prose) => prose.includes('each market provides one route slot'))!;
    expect(concept).toContain('Not enough trade route capacity');
  });

  it('keeps one describer for a rite, shared with the screen that performs one', () => {
    // `riteGrantWords` lives in `religionScreen.ts` because that is where a rite
    // is performed; the Compendium reads it rather than growing a second copy.
    expect(sourceOf('religionScreen.ts')).toContain('export function riteGrantWords');
    expect(sourceOf('compendium.ts')).toContain("from './religionScreen'");
  });

  it('describes a defender’s edge as points, never a percentage, and names siege', () => {
    // Combat moved to flat points (2026-08-28); the Compendium's own words for
    // it must never regress to "%", and the written-shelf rule (below) already
    // forbids a digit outright.
    const combat = CONCEPT_ENTRIES.find((entry) => entry.id === 'concept:combat')!;
    const prose = combat.clauses.map((clause) => clause.text).join(' ');
    expect(prose).not.toContain('%');
    expect(prose).toContain('Hills and forests add to a defender');
    expect(prose).toContain('fortifying adds more each turn it stays');
    expect(prose).toContain('the best unit its owner could build');
    expect(prose).toContain('under siege');
    expect(prose).toContain('only an attack can capture it');
  });

  it('states the zone of control as a toll and the general’s aura as a bonus', () => {
    // The user's 2026-08-28 rulings, in the two sentences a player reads. The
    // zone of control stopped ending a unit's movement and became a price, and
    // the Compendium must not keep describing the rule it replaced.
    const combat = CONCEPT_ENTRIES.find((entry) => entry.id === 'concept:combat')!;
    const prose = combat.clauses.map((clause) => clause.text).join(' ');
    expect(prose).toContain(
      'moving from one hex next to an enemy to another hex next to the same enemy costs one extra movement point',
    );
    expect(prose).not.toContain('ends your movement');
    // And the general: what it does, that it is passive, and its two limits.
    expect(prose).toContain('great general');
    expect(prose).toContain('left standing on the map');
    expect(prose).toContain('does not stack with a second general');
  });
});

/**
 * **The card and the book say the same words** (the playtest notes, 2026-09-03).
 *
 * The user's complaint was that a node's effects were unreadable — "I'm having
 * trouble understanding what the effects are and I designed the technologies" —
 * and the fix was to prefer the row's own hand-written `note` over
 * `describeCard`'s generated sentences. What makes that a *fix* rather than a
 * second wording is that both surfaces read one function, which is what this
 * block holds.
 */
describe('a technology says its rules once', () => {
  /** Every node that carries rules at all — the only ones with a clause here. */
  function ruleNodes(): TechId[] {
    return TECH_IDS.filter((id) => (techDef(id).effects ?? []).length > 0);
  }

  it('prints the row\u2019s own note, one sentence per clause', () => {
    const nodes = ruleNodes();
    expect(nodes.length, 'the sweep is not vacuous').toBeGreaterThan(0);
    for (const id of nodes) {
      const note = techDef(id).note;
      if (note === undefined) continue;
      const said = techRuleClauses(id);
      // Every sentence of the note is a clause of its own, and nothing has been
      // added to it or taken away: the join is the note back again.
      expect(said.length, id).toBeGreaterThan(0);
      expect(said.join(' '), id).toBe(note.trim());
      for (const clause of said) expect(clause, id).not.toContain('[[');
    }
  });

  it('lays those clauses out one to a line on the shelf', () => {
    const entries = shelf('tech').entries;
    for (const id of ruleNodes()) {
      const entry = entries.find((row) => row.id === compendiumId('tech', id));
      expect(entry, id).toBeDefined();
      const texts = entry!.clauses.map((clause) => clause.text);
      // The book carries each of the card's lines as its own clause rather than
      // joining them into a paragraph — the same shape, so a reader moving from
      // the hover card to the shelf is reading the identical sentences.
      for (const clause of techRuleClauses(id)) {
        expect(texts, `${id}: ${clause}`).toContain(clause);
      }
    }
  });

  it('has a written note for every node that carries rules', () => {
    // The fallback exists and is correct, but a generated sentence is what the
    // user could not read — so a row landing here is a paragraph somebody owes,
    // and the list is how that stays visible instead of being found in play.
    expect(techsAwaitingRuleNotes(TECH_IDS)).toEqual([]);
  });
});

/**
 * **What later technologies do for a building, told on the building's shelf.**
 *
 * The other half of the same playtest ruling: the star chart stopped printing
 * "Buildings pay new ground" — a fact about a granary filed under a technology —
 * and this is where that information went instead.
 */
describe('a building carries its own later gifts', () => {
  it('names the technology and says what it changes', () => {
    // Re-aimed 2026-09-04 (the renewals axe). This used to sweep two shapes and
    // the renewals were the half with rows in it: a granary's shelf had to name
    // The Wheel. Those rows are struck and the field with them, so what is left
    // to sweep is the **tech-gated tile line** — live, and fed by nothing today,
    // which is why the count below is not asserted to be non-zero. The pin that
    // does bite is the second one: no row carries a renewal any more, so a shelf
    // cannot promise growth the simulation will not pay.
    const entries = [...shelf('building').entries, ...shelf('wonder').entries];
    for (const id of BUILDING_IDS) {
      expect(Object.keys(buildingDef(id)), id).not.toContain('upgrades');
      const gated = (buildingDef(id).tileYields ?? []).filter(
        (line) => line.requiresTech !== undefined,
      );
      if (gated.length === 0) continue;
      const entry = entries.find(
        (row) => row.id === compendiumId(isWonder(id) ? 'wonder' : 'building', id),
      );
      expect(entry, id).toBeDefined();
      const said = entry!.clauses.map((clause) => clause.text).join(' ');
      for (const line of gated) {
        expect(said, `${id} ← ${line.requiresTech!}`).toContain(techDef(line.requiresTech!).name);
      }
    }
  });

  it('states an ungated tile line too, naming the hexes it lands on', () => {
    // The Lighthouse's food on water was a sentence in its `note` and a number
    // in the simulation with nothing joining them — no technology hands it over,
    // so `techGifts` never saw it. Now the shelf says the figure and says which
    // ground, in the card describer\u2019s own words for that condition.
    const entry = shelf('building').entries.find(
      (row) => row.id === compendiumId('building', 'lighthouse'),
    );
    expect(entry).toBeDefined();
    const said = entry!.clauses.map((clause) => clause.text).join(' ');
    expect(said).toContain('water hex');
  });
});
