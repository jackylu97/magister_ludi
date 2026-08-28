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

import { BUILDING_IDS, isWonder } from '../../src/sim/buildingData';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { IMPROVEMENT_IDS } from '../../src/sim/improvementData';
import {
  ALL_BELIEF_IDS,
  BELIEF_IDS,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  RITE_IDS,
} from '../../src/sim/religionData';
import { RESOURCE_IDS } from '../../src/sim/resourceData';
import { DOCTRINE_IDS, ORDER_IDS } from '../../src/sim/statecraftData';
import { newGame } from '../../src/sim/state';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { TRIUMPH_IDS } from '../../src/sim/triumphData';
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
    // **All three pools on one shelf** (religion v2). A belief is one id space
    // across three bags, so the shelf is `ALL_BELIEF_IDS` and neither the
    // follower nor the enhancer pool may be quietly missing from it.
    expect(shelf('belief').entries).toHaveLength(ALL_BELIEF_IDS.length + LEAD);
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

  it('has sixteen of them, every one with something on it', () => {
    // The index the brief names. A shelf that came back empty would be a
    // section heading a reader clicks and learns nothing from.
    expect(BOOK).toHaveLength(16);
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
