/**
 * **`docs/units.md` is generated** — and this is the generator, and the gate.
 *
 * The user's ruling of 2026-09-09 (`docs/flags.md` item (ppp), batch D2): *"Could
 * you also create a doc with every unit and their combat strengths?"* A roster
 * the user marks up for balance is only worth marking up if it shows every row
 * there is at the figure the game charges — a piece missing from the doc is a
 * piece nobody balances, and a figure typed by hand is last week's number the
 * day after it is typed.
 *
 * So the doc's tables are not written, they are **printed**: every cell comes out
 * of `data/units.json` through the sim's own readers (`unitDef`, `unitMaxHp`,
 * `unitRosterCost`, `UNIT_UNLOCK_TECH`, `RULES`), and this file holds the one
 * implementation of that printing. Two modes, one function:
 *
 *   UNITS_DOC_WRITE=1 npx vitest run test/sim/unitsDocSync.test.ts
 *
 * rewrites everything below the `## The roster` heading; a run without the
 * variable asserts the same region **byte for byte**, so a row added, retuned,
 * retired or re-tech'd in the data fails core until the doc is regenerated.
 * `techDocSync.test.ts`' claim with the assertion turned all the way up: that one
 * reads the doc's figures back, this one owns them.
 *
 * **The Notes column is the user's and survives regeneration.** It is read off
 * the doc before the tables are rebuilt and written back into the row of the same
 * name (`greatPeopleDocSync`'s blank balance column, made round-trippable): a
 * pass that retunes twelve strengths must not cost the user the twelve sentences
 * they wrote about them. A renamed row loses its note, which is the honest
 * outcome — the note was about a name that no longer exists.
 *
 * **Retired rows are out** (`UnitDef.retired`, the augur): a piece that can never
 * be built again is a piece nobody balances. The row stays in the data because a
 * save may name it; it leaves the reference for `statecraftDocSync`'s reason.
 *
 * **Core, not slow**: it reads tables and calls readers, touching no board and no
 * seed. A source-reading register test is always core.
 */

import { describe, expect, it } from 'vitest';

import { unitRosterCost } from '../../src/sim/cities';
import { resourceDef } from '../../src/sim/resourceData';
import { RULES } from '../../src/sim/rulesData';
import { UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import {
  UNIT_TYPE_IDS,
  type UnitCategory,
  type UnitDef,
  type UnitTypeId,
  unitDef,
  unitMaxHp,
} from '../../src/sim/unitData';

// Declared rather than imported from `node:process` — `cardTextSnapshot.test.ts`'
// bargain and `vite.config.ts`', for their reason: this project's type surface is
// `vite/client` alone and one environment variable is not worth widening it.
declare const process: { env: Record<string, string | undefined> };

const WRITE = process.env.UNITS_DOC_WRITE === '1';

/**
 * `node:fs` behind a **variable** specifier, `cardTextSnapshot.test.ts`' pattern:
 * a glob cannot write, and this test writes the doc it otherwise asserts. Reading
 * goes through the same handle rather than through `import.meta.glob` so that the
 * bytes compared and the bytes rewritten are read by one mechanism — a glob is
 * resolved once at module load, and the write mode has to see the Notes the user
 * saved a moment ago.
 */
const FS_SPECIFIER = 'node:fs';

interface MinimalFs {
  readFileSync(path: string, encoding: string): string;
  writeFileSync(path: string, data: string): void;
}

async function fs(): Promise<MinimalFs> {
  return (await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs;
}

const DOC_PATH = new URL('../../docs/units.md', import.meta.url).pathname;

/**
 * Everything below this heading is printed; everything above it is written.
 *
 * Matched **anchored to a line**, and that is not fussiness: the hand-written
 * half above it names the heading in a sentence ("everything below the
 * `## The roster` heading"), and a bare `indexOf` would find that mention and eat
 * the prose it sits in the first time the doc was generated. It did.
 */
const GENERATED_FROM = '## The roster';

/** Where the generated region starts, or −1. */
function regionStart(doc: string): number {
  const found = doc.indexOf(`\n${GENERATED_FROM}\n`);
  return found === -1 ? -1 : found + 1;
}

// --- the roster --------------------------------------------------------------

/**
 * The tables, in the order the doc prints them, and the register of which
 * categories have one.
 *
 * Derived nothing: a fifth `UnitCategory` fails the first test below rather than
 * being quietly left off the reference. The order is the order a reader wants
 * them — the things that fight, then the things that do not.
 */
const CATEGORIES: readonly { category: UnitCategory; heading: string }[] = [
  { category: 'military', heading: 'Military' },
  { category: 'naval', heading: 'Naval' },
  { category: 'civilian', heading: 'Civilian' },
  { category: 'trader', heading: 'Trader' },
];

/** Every row still on the roster, in the data's own file order. */
const LIVE: readonly UnitTypeId[] = UNIT_TYPE_IDS.filter((id) => unitDef(id).retired !== true);

/** A figure, or the doc's dash for a field the row does not carry. */
function figure(value: number | undefined): string {
  return value === undefined ? '—' : String(value);
}

/** A count and its noun, so a one-row table does not read "1 rows". */
function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * The **marks** a row wears: every marker on it that changes what the piece is
 * for, in one cell.
 *
 * Markers and never names (the roster's own discipline): each clause reads a
 * field, so a second caravan or a second bombard joins the reference by carrying
 * the field rather than by being remembered here. The order is fixed — how it is
 * acquired, then what it does — so the cell is stable under a regeneration.
 */
function marks(def: UnitDef): string {
  const out: string[] = [];
  if (def.awaitsTech === true) out.push('awaits its node');
  if (def.unlockedByCard === true) out.push('opened by a card');
  if (def.routeOnly === true) out.push('route only');
  if (def.purchase !== undefined) {
    const bank = def.purchase.currency === 'faith' ? 'faith' : 'gold';
    out.push(def.purchase.exclusive === true ? `bought with ${bank} only` : `bought with ${bank}`);
  }
  if (def.mirrors !== undefined) out.push(`mirrors the best ${def.mirrors.modelClass}`);
  if (def.requiresResource !== undefined) {
    out.push(`needs improved ${resourceDef(def.requiresResource).name}`);
  }
  if (def.greatWork === true) out.push('great person');
  if (def.foundsCity) out.push('founds cities');
  if (def.charges !== undefined) out.push(plural(def.charges, 'charge'));
  if (def.hitAndRun === true) out.push('hit and run');
  if (def.blockades === true) out.push('blockades');
  if (def.bombard === true) out.push('bombards');
  if (def.ignoresTerrainCost === true) out.push('ignores terrain');
  if (def.haltsGrowth) out.push('halts growth');
  if (def.minCityPop > 0) out.push(`needs ${plural(def.minCityPop, 'citizen')}`);
  return out.length === 0 ? '—' : out.join(' · ');
}

/** One roster row, every cell read through a reader. */
function rosterRow(id: UnitTypeId, note: string): string {
  const def = unitDef(id);
  const unlock = UNIT_UNLOCK_TECH.get(id);
  const cells = [
    def.name,
    def.modelClass,
    String(def.combatStrength),
    figure(def.rangedStrength),
    figure(def.range),
    String(def.movement),
    String(unitMaxHp({ type: id })),
    String(def.sight),
    def.size,
    String(unitRosterCost(id)),
    figure(def.escalation),
    unlock === undefined ? '—' : techDef(unlock).name,
    def.upgradesTo === undefined ? '—' : unitDef(def.upgradesTo).name,
    marks(def),
    note,
  ];
  return `| ${cells.join(' | ')} |`;
}

/** The header the Notes reader recognises a roster row by. */
const ROSTER_HEADER =
  '| Unit | Class | Str | Ranged | Range | Move | HP | Sight | Size | Cost | Escalation | Unlocked by | Upgrades to | Marks | Notes |';
const ROSTER_RULE = '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
/** Cells a roster row splits into on `|`, empty ends included. */
const ROSTER_CELLS = 17;

// --- the rows' own strength lines --------------------------------------------

/** When one of a row's `combatLines` pays, in the fewest words that say it. */
function whenLine(line: NonNullable<UnitDef['combatLines']>[number]): string {
  const out: string[] = [];
  if (line.side === 'attack') out.push('attacking');
  else if (line.side === 'defend') out.push('defending');
  else out.push('always');
  if (line.vsModelClass !== undefined) out.push(`vs ${line.vsModelClass}`);
  if (line.vsCity === true) out.push('vs cities');
  if (line.vsCity === false) out.push('vs pieces');
  if (line.vsKind !== undefined) out.push(`${line.vsKind} only`);
  return out.join(' · ');
}

// --- the figures --------------------------------------------------------------

/** The rule blocks the doc mirrors, in the order it prints them. */
const FIGURE_BLOCKS: readonly { key: 'combat' | 'naval'; heading: string }[] = [
  { key: 'combat', heading: 'combat' },
  { key: 'naval', heading: 'naval' },
];

// --- printing -----------------------------------------------------------------

/**
 * The whole generated region, `## The roster` heading included.
 *
 * One function, both modes, which is the only way the written file and the
 * asserted file cannot drift: a run with the variable writes what this returns
 * and a run without it compares against what this returns.
 */
function printRegion(notes: ReadonlyMap<string, string>): string {
  const out: string[] = [GENERATED_FROM, ''];
  out.push(
    'Generated — do not hand-edit anything below this line except the **Notes**',
    'column, which is carried through every regeneration.',
    '',
  );
  for (const { category, heading } of CATEGORIES) {
    const ids = LIVE.filter((id) => unitDef(id).category === category);
    out.push(`### ${heading} — ${plural(ids.length, 'row')}`, '');
    out.push(ROSTER_HEADER, ROSTER_RULE);
    for (const id of ids) out.push(rosterRow(id, notes.get(unitDef(id).name) ?? ''));
    out.push('');
  }

  out.push("### The rows' own strength lines", '');
  out.push(
    'Flat labelled points a **type** carries into every fight it is in',
    '(`UnitDef.combatLines`, folded by `planCombat` beside the ground and the',
    'trench). This is the whole of the naval triangle in the simulation.',
    '',
  );
  out.push('| Unit | Line | Points | When |', '|---|---|---|---|');
  for (const id of LIVE) {
    const def = unitDef(id);
    for (const line of def.combatLines ?? []) {
      // Signed, and with the doc's own minus: a fragile hull takes points away.
      const points = line.amount < 0 ? `−${-line.amount}` : `+${line.amount}`;
      out.push(`| ${def.name} | ${line.label} | ${points} | ${whenLine(line)} |`);
    }
  }
  out.push('');

  out.push('### The figures (`data/rules.json`)', '');
  for (const { key, heading } of FIGURE_BLOCKS) {
    out.push(`\`rules.${heading}\``, '', '| Figure | Value |', '|---|---|');
    for (const [name, value] of Object.entries(RULES[key])) {
      out.push(`| \`${name}\` | ${String(value)} |`);
    }
    out.push('');
  }
  return `${out.join('\n')}`;
}

/**
 * What the user wrote in the Notes column, by unit name.
 *
 * Read off roster rows alone — a line splits into exactly `ROSTER_CELLS` cells —
 * so the strength-line and figures tables below cannot be mistaken for one. A
 * blank cell is not stored: an absent note and an empty note print the same, and
 * storing the blanks would only make the map bigger.
 */
function readNotes(doc: string): Map<string, string> {
  const notes = new Map<string, string>();
  for (const line of doc.split('\n')) {
    const cells = line.split('|').map((cell: string) => cell.trim());
    if (cells.length !== ROSTER_CELLS || cells[0] !== '') continue;
    if (cells[1] === '' || cells[1] === 'Unit' || /^-+$/.test(cells[1]!)) continue;
    const note = cells[ROSTER_CELLS - 2]!;
    if (note !== '') notes.set(cells[1]!, note);
  }
  return notes;
}

describe('the units doc is the roster, printed', () => {
  it('gives every live category a table', () => {
    // Derived from the data rather than restated: a fifth `UnitCategory` fails
    // here until somebody writes its section, rather than a whole class of piece
    // quietly missing from the reference.
    const written = new Set(CATEGORIES.map((entry) => entry.category));
    for (const id of LIVE) {
      const category = unitDef(id).category;
      expect(written.has(category), `no table written for the ${category} category`).toBe(true);
    }
    // And nothing is written for a category with no rows left: an empty table is
    // a heading a reader trusts and finds nothing under.
    for (const { category } of CATEGORIES) {
      expect(
        LIVE.some((id) => unitDef(id).category === category),
        `the ${category} table has no live rows`,
      ).toBe(true);
    }
  });

  it('reads exactly as the printed roster', async () => {
    const io = await fs();
    const doc = io.readFileSync(DOC_PATH, 'utf8');
    const start = regionStart(doc);
    expect(start, `docs/units.md has no "${GENERATED_FROM}" heading`).toBeGreaterThanOrEqual(0);
    const region = printRegion(readNotes(doc));
    if (WRITE) {
      io.writeFileSync(DOC_PATH, `${doc.slice(0, start)}${region}`);
      // A written doc is not an assertion — it is the baseline. Said out loud so
      // a run that quietly rewrote one is visible in the output.
      console.log(`units: wrote ${DOC_PATH} (${region.length} generated bytes)`);
      expect(region.length).toBeGreaterThan(0);
      return;
    }
    // Byte for byte, and the message says the one command that fixes it: a row
    // retuned in `data/units.json` and not regenerated here is the user reading
    // last week's chart, which is the whole reason the doc is generated.
    expect(
      doc.slice(start),
      'docs/units.md is stale — UNITS_DOC_WRITE=1 npx vitest run test/sim/unitsDocSync.test.ts',
    ).toBe(region);
  });

  it('leaves every retired row out of the tables', async () => {
    // The rule said from the other end, so the reason is legible: the tables are
    // what an empire can raise, and a row nobody can raise is a row nobody
    // balances. The row itself stays in the data — a save may name it.
    const withdrawn = UNIT_TYPE_IDS.filter((id) => unitDef(id).retired === true);
    expect(withdrawn.length).toBeGreaterThan(0);
    const io = await fs();
    const doc = io.readFileSync(DOC_PATH, 'utf8');
    const region = doc.slice(regionStart(doc));
    for (const id of withdrawn) {
      expect(region, unitDef(id).name).not.toContain(`| ${unitDef(id).name} |`);
    }
  });

  it('keeps the notes the user wrote', async () => {
    // The round trip, pinned: whatever stands in a Notes cell is what the next
    // regeneration prints back into it. Without this the balance pass is one
    // regeneration away from losing every sentence the user wrote.
    const io = await fs();
    const doc = io.readFileSync(DOC_PATH, 'utf8');
    const name = unitDef(LIVE[0]!).name;
    const kept = printRegion(new Map([[name, 'a note the user wrote']]));
    expect(kept).toContain('| a note the user wrote |');
    // And the doc's own notes survive a round trip through the printer.
    const notes = readNotes(doc);
    const reprinted = readNotes(printRegion(notes));
    expect([...reprinted.entries()]).toEqual([...notes.entries()]);
  });
});
