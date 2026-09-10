import { describe, expect, it } from 'vitest';

import { MALICE_IDS, maliceDef } from '../../src/sim/maliceData';
import {
  WAGER_AGES,
  WAGER_IDS,
  wagerBar,
  wagerDef,
} from '../../src/sim/wagerData';

/** The §4 and §3b tables both live in one file; read once, split by heading. */
const docFiles = import.meta.glob('../../docs/wager.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const DOC = Object.values(docFiles)[0] as string;

/** One markdown table's rows, keyed by their first cell. `heading` is its head row. */
function tableRows(heading: string): Map<string, string[]> {
  const start = DOC.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const end = DOC.indexOf('\n\n', start);
  const rows = new Map<string, string[]>();
  for (const line of DOC.slice(start, end).split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 3 || cells[0] !== '' || cells[1] === '') continue;
    if (/^-+$/.test(cells[1]!)) continue;
    rows.set(cells[1]!, cells);
  }
  return rows;
}

/**
 * **The wager deck's doc↔data sync test** — `statecraftDocSync.test.ts`'s
 * pattern, one system over (CLAUDE.md's spec workflow: *a doc table that mirrors
 * data carries a sync test*).
 *
 * `docs/wager.md` §3b's table is the worksheet the user edits by hand and
 * `data/wagers.json` is what the game deals. A row edited in one place and not
 * the other is exactly the failure this exists to catch — and it is a failure
 * with teeth here, because the doc's table carries the *bars*, which are the
 * whole balance of the system.
 *
 * Three claims, and each is one direction of the mirror: every data row is in
 * the table by name; every name in the table is a data row; and every row's
 * **figures** match, per age, including the per-clause groups of a compound
 * card. Deferred rows are in the table like the rest — they keep their bodies
 * and their figures, and the doc marks them — which is the one place this
 * differs from the Orders' sync test, where a retired row leaves both sides.
 */
describe('the wager doc mirrors the deck', () => {
  /** The §3b table's rows, as `{ name → cells }`. */
  function docRows(): Map<string, string[]> {
    const heading = '| Wager | Fam | Line | Reads | Kind | II · III · IV |';
    const start = DOC.indexOf(heading);
    expect(start, 'the §3b table').toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n\n', start);
    const rows = new Map<string, string[]>();
    for (const line of DOC.slice(start, end).split('\n')) {
      const cells = line.split('|').map((cell) => cell.trim());
      if (cells.length < 7 || cells[0] !== '' || cells[1] === '') continue;
      if (cells[1] === 'Wager' || /^-+$/.test(cells[1]!)) continue;
      // The deferred mark rides on the name in the doc and is not part of it.
      const name = cells[1]!.replace(/\s*\*\(deferred\)\*$/, '');
      rows.set(name, cells);
    }
    return rows;
  }

  /** The figures cell, as the doc writes them: groups of ages, `·`-joined. */
  function dataFigures(id: (typeof WAGER_IDS)[number]): string {
    const def = wagerDef(id);
    if (def.reads.shape === 'clauses') {
      return def.reads.clauses.map((clause) => clause.bars.join('·')).join(' — ');
    }
    return (def.bars ?? []).join(' · ');
  }

  it('lists every row of the deck, and nothing else', () => {
    const rows = docRows();
    expect(rows.size).toBe(WAGER_IDS.length);
    for (const id of WAGER_IDS) {
      expect(rows.has(wagerDef(id).name), wagerDef(id).name).toBe(true);
    }
    const names = new Set(WAGER_IDS.map((id) => wagerDef(id).name));
    for (const name of rows.keys()) expect(names.has(name), name).toBe(true);
  });

  it('prints each row’s family, kind and reading as the data carries them', () => {
    const rows = docRows();
    const FAMILY: Record<string, string> = {
      domination: 'D',
      culture: 'C',
      science: 'S',
      economic: 'E',
    };
    for (const id of WAGER_IDS) {
      const def = wagerDef(id);
      const cells = rows.get(def.name)!;
      expect(cells[2], def.name).toBe(FAMILY[def.family]);
      expect(cells[5], def.name).toBe(def.kind);
      const reads =
        def.reads.shape === 'clauses'
          ? `clauses: ${def.reads.clauses.map((clause) => clause.count).join(', ')}`
          : def.reads.count;
      expect(cells[4], def.name).toBe(`\`${reads}\``);
    }
  });

  it('prints each row’s bars, per age and per clause', () => {
    // The half with teeth: the doc's figures *are* the balance, so a bar tuned
    // in the data and left alone in the worksheet is a design document that
    // quietly lies about the game.
    const rows = docRows();
    for (const id of WAGER_IDS) {
      const def = wagerDef(id);
      const cell = rows.get(def.name)![6]!;
      expect(cell.startsWith(dataFigures(id)), def.name).toBe(true);
    }
  });

  it('marks a deferred row in the doc and nowhere else', () => {
    const rows = docRows();
    for (const id of WAGER_IDS) {
      const def = wagerDef(id);
      const line = [...rows.entries()].find(([name]) => name === def.name)!;
      const deferred = def.deferred !== undefined;
      // The mark was stripped off the key, so the raw cell is asked instead.
      expect(line[1][1]!.includes('*(deferred)*'), def.name).toBe(deferred);
    }
  });

  it('names every age a card can be dealt in, and no bar of nought outside them', () => {
    for (const id of WAGER_IDS) {
      const def = wagerDef(id);
      for (const age of WAGER_AGES) {
        if (def.fromAge !== undefined && age < def.fromAge) continue;
        if (def.deferred !== undefined) continue;
        expect(wagerBar(id, age), `${id} at age ${age}`).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * **The malice deck's doc↔data sync test** (batch G3) — the same mirror, held up
 * to `docs/wager.md` §4's table.
 *
 * §4's table is the one the user wrote the punishment in, and it carries the two
 * things a retune would move: the **chair** each malice takes, which is the whole
 * of what it costs beyond its effect, and the **figure**, which is the whole of
 * its balance. A row edited in one place and not the other is a design document
 * that quietly lies about the game.
 *
 * The figure is read out of the effect rather than restated: every malice is one
 * effect carrying exactly one number (`maliceDataProblems` pins the "one effect"
 * half), so "the row's figure" is a fact about the data and not a convention
 * this test invents.
 */
describe('the malice doc mirrors the deck', () => {
  const HEADING = '| Malice | Chair | Voice | Effect | Figure | What it does |';
  const VOICE: Record<string, string> = {
    domination: 'D',
    culture: 'C',
    science: 'S',
    economic: 'E',
  };

  /** Every number an effect carries, in key order — one, for every live row. */
  function figuresOf(value: unknown): number[] {
    if (typeof value === 'number') return [value];
    if (Array.isArray(value)) return value.flatMap(figuresOf);
    if (value !== null && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).flatMap(figuresOf);
    }
    return [];
  }

  it('lists every row of the deck, and nothing else', () => {
    const rows = tableRows(HEADING);
    rows.delete('Malice');
    expect(rows.size).toBe(MALICE_IDS.length);
    for (const id of MALICE_IDS) expect(rows.has(maliceDef(id).name), id).toBe(true);
    const names = new Set(MALICE_IDS.map((id) => maliceDef(id).name));
    for (const name of rows.keys()) expect(names.has(name), name).toBe(true);
  });

  it('prints each row’s chair, voice, effect kind and figure as the data carries them', () => {
    const rows = tableRows(HEADING);
    for (const id of MALICE_IDS) {
      const def = maliceDef(id);
      const cells = rows.get(def.name)!;
      expect(cells[2], def.name).toBe(def.chair);
      // The dash is the doc's word for a row that bites the deck itself rather
      // than any one voice — The Short Draft and The Heavy Writ.
      expect(cells[3], def.name).toBe(def.voice === undefined ? '—' : VOICE[def.voice]);
      expect(cells[4], def.name).toBe(`\`${def.effects[0]!.kind}\``);
      const figures = figuresOf(def.effects[0]);
      expect(figures, def.name).toHaveLength(1);
      expect(cells[5], def.name).toBe(String(figures[0]));
    }
  });
});
