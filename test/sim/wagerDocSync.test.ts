import { describe, expect, it } from 'vitest';

import { MALICE_IDS, maliceDef } from '../../src/sim/maliceData';
import {
  WAGER_AGES,
  WAGER_IDS,
  wagerAgeIndex,
  wagerBar,
  wagerDef,
} from '../../src/sim/wagerData';

/** Both tables live in one file; read once, split by heading. */
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
 * `docs/wager.md`'s deck table is the sheet the user edits by hand and
 * `data/wagers.json` is what the game deals. A row edited in one place and not
 * the other is exactly the failure this exists to catch — and it is a failure
 * with teeth here, because the doc's table carries the *bars*, which are the
 * whole balance of the system, **and the notes**, which are the whole of what a
 * player is told a card asks (the user's ruling of 2026-09-09: the reading
 * first, the span, and nothing else).
 *
 * The table was consolidated on 2026-09-09 into the one the user edits: three
 * separate age columns rather than one `·`-joined cell, so a single bar can be
 * retuned in place, and the note beside them. The worksheet it was cut from —
 * the bench every figure was derived on, the cut/keep list, the rulings' history
 * — is `docs/audit/wager-worksheet.md` and is **not** synced: it is history, and
 * history that had to be kept current would be a second live table.
 *
 * Four claims, each one direction of the mirror: every data row is in the table
 * by name; every name in the table is a data row; every row's **figures** match,
 * per age, including the per-clause groups of a compound card; and every row's
 * **note** matches to the character. Deferred rows are in the table like the rest
 * — they keep their bodies and their figures, and the doc marks them — which is
 * the one place this differs from the Orders' sync test, where a retired row
 * leaves both sides.
 */
describe('the wager doc mirrors the deck', () => {
  const HEADING =
    '| Wager | Fam | Line | Reads | Kind | Æra II | Æra III | Æra IV | Note | Notes |';

  /** The deck table's rows, as `{ name → cells }`. */
  function docRows(): Map<string, string[]> {
    const start = DOC.indexOf(HEADING);
    expect(start, 'the deck table').toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n\n', start);
    const rows = new Map<string, string[]>();
    for (const line of DOC.slice(start, end).split('\n')) {
      const cells = line.split('|').map((cell) => cell.trim());
      if (cells.length < 11 || cells[0] !== '' || cells[1] === '') continue;
      if (cells[1] === 'Wager' || /^-+$/.test(cells[1]!)) continue;
      // The deferred mark rides on the name in the doc and is not part of it.
      const name = cells[1]!.replace(/\s*\*\(deferred\)\*$/, '');
      rows.set(name, cells);
    }
    return rows;
  }

  /**
   * One age column, as the doc writes it: the row's bar at that age, or the
   * clause row's figures in clause order, or an em dash for an age the row is
   * not dealt in (`fromAge` — The Tithe's Æra II, and nothing else today).
   */
  function dataFigures(id: (typeof WAGER_IDS)[number], age: number): string {
    const def = wagerDef(id);
    if (def.fromAge !== undefined && age < def.fromAge) return '—';
    const at = wagerAgeIndex(age);
    if (def.reads.shape === 'clauses') {
      return def.reads.clauses.map((clause) => String(clause.bars[at] ?? 0)).join(' · ');
    }
    return String(def.bars?.[at] ?? 0);
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

  it('prints each row’s bars, one column an age and one figure a clause', () => {
    // The half with teeth: the doc's figures *are* the balance, so a bar tuned
    // in the data and left alone in the sheet is a design document that quietly
    // lies about the game. One column per age is what lets the user retune a
    // single bar in place, which is the whole reason the table was consolidated.
    const rows = docRows();
    for (const id of WAGER_IDS) {
      const def = wagerDef(id);
      const cells = rows.get(def.name)!;
      WAGER_AGES.forEach((age, at) => {
        expect(cells[6 + at], `${def.name} · age ${age}`).toBe(dataFigures(id, age));
      });
    }
  });

  it('prints each row’s note, to the character', () => {
    // The other half the user edits. A note is the only thing on any surface
    // that says what a card asks, so a note rewritten in the doc and not in the
    // data is a promise the game does not keep — and the reverse is a design
    // document nobody can read the deck off.
    const rows = docRows();
    for (const id of WAGER_IDS) {
      const def = wagerDef(id);
      expect(rows.get(def.name)![9], def.name).toBe(def.note);
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
 * to `docs/wager.md`'s second table.
 *
 * That table is the one the user wrote the punishment in, and it carries the two
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
