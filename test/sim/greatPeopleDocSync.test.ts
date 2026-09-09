import { describe, expect, it } from 'vitest';

import {
  GREAT_PERSON_IDS,
  LIVE_GREAT_PERSON_IDS,
  ROSTER_AGES,
  greatPersonDef,
} from '../../src/sim/greatPeopleData';
import { RULES } from '../../src/sim/rulesData';

/**
 * The doc↔data sync test, `statecraftDocSync.test.ts`'s twin one table over (the
 * user's workflow ruling, 2026-09-03): a doc table that mirrors data carries a
 * sync test. `docs/great-people.md` is the system's **reference** — the roster
 * generated from the rows, with a blank *Notes* column for a balance pass — and
 * a reference is only worth marking up if it shows every row there is: a name
 * that fell out of the doc is a name nobody balances, and a name that fell out of
 * the data is a note written against a ghost.
 *
 * So both directions are read, per age: every roster row appears in its own
 * age's table by name, and every name in an age's table names a roster row of
 * that age. The section is the **age** here, where an Order's is its pool and a
 * Doctrine's is its tier — the ages come from `ROSTER_AGES`, derived from the
 * data, so an Æra VI would fail here until its heading is written rather than
 * being quietly skipped.
 *
 * The **figures** are read the same way (batch B4, 2026-09-09, widened by B5):
 * the doc's table of figures carries every `rules.greatPeople` knob and all three
 * terms of the `rules.renown` curve — `base`, `linear`, `exponent` — at the value
 * the rules charge, so a ladder retuned in the data and not in the doc fails here
 * rather than being discovered by a user reading last week's numbers. It is the
 * same claim as the roster's, one table down.
 *
 * **Retired rows are excluded**, `statecraftDocSync`'s own rule (batch GP1,
 * 2026-09-09): a great person is consumed rather than withdrawn from a pool, so
 * the table had no such concept until the pass of that day cut eight names — and
 * a row that can never be dealt is a row nobody balances. The rows stay in the
 * data (a save names a legacy by id) and leave the reference, which is
 * `LIVE_GREAT_PERSON_IDS`' whole reason for existing. A row with an empty
 * `legacy` is *not* excluded: it is still a name that can be drawn, and the
 * describer prints its deferred half struck through, which is exactly the row
 * the user most wants to see.
 */
describe('the great-people doc mirrors the roster', () => {
  // The repo's source-reading pattern: Vite's raw import, so the test runs in
  // the same loader as everything else and needs no node types.
  const docFiles = import.meta.glob('../../docs/great-people.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  /** The doc's section heading for each roster age. */
  const AGE_HEADINGS: Record<number, string> = {
    2: '### Æra II',
    3: '### Æra III',
    4: '### Æra IV',
    5: '### Æra V',
  };

  /** First-column names of every table row under one heading. */
  function docNames(heading: string): Set<string> {
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n### ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const names = new Set<string>();
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 4 || cells[0] !== '' || cells[1] === '') continue;
      if (cells[1] === 'Person' || /^-+$/.test(cells[1])) continue;
      names.add(cells[1]);
    }
    return names;
  }

  /**
   * The doc's table of figures, read as name → the figure printed beside it.
   *
   * The section is "## The figures" and it ends at the next `## `; the name cell
   * wears backticks (`` `merchantGold` ``), which are markdown rather than part
   * of the name, so they come off.
   */
  function docFigures(): Map<string, string> {
    const heading = '## The figures';
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n## ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows = new Map<string, string>();
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 4 || cells[0] !== '' || cells[1] === '') continue;
      if (cells[1] === 'Figure' || /^-+$/.test(cells[1])) continue;
      rows.set(cells[1]!.replace(/`/g, ''), cells[2]!);
    }
    return rows;
  }

  it('gives every roster age a table', () => {
    // Derived from the data rather than restated: the day a sixth age is added
    // to the roster, this fails until somebody writes its heading — which is the
    // failure we want, rather than a table nobody notices is missing.
    for (const age of ROSTER_AGES) {
      expect(AGE_HEADINGS[age], `no heading written for roster age ${age}`).toBeDefined();
    }
  });

  it('lists every name of every age, and nothing else', () => {
    for (const age of ROSTER_AGES) {
      const heading = AGE_HEADINGS[age]!;
      const live = LIVE_GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).age === age).map(
        (id) => greatPersonDef(id).name,
      );
      const doc = docNames(heading);
      // Data → doc: a name added (or moved between ages) in the data must be
      // written into the reference's table, or the user is balancing rows they
      // cannot see.
      for (const name of live) expect([...doc], `${heading} is missing "${name}"`).toContain(name);
      // Doc → data: a row in the reference that names no roster row of this age
      // is a ghost — either it was cut from the data (delete the row here too),
      // it moved age (move the row), or its name drifted (ids are forever, names
      // follow the data).
      const liveSet = new Set(live);
      for (const name of doc) {
        expect(liveSet.has(name), `${heading} row "${name}" names no roster row of this age`).toBe(
          true,
        );
      }
    }
  });

  /**
   * **The tally under each heading is the table's own length.**
   *
   * The line reads "24 names — one row per name, in the data's own order", and
   * it is the first thing a reader trusts and the first thing a pass forgets:
   * the great-person pass of 2026-09-09 moved five rows between ages and retired
   * eight, and every one of the four sentences was wrong the moment it did. Read
   * off the live roster rather than off the rows the table happens to hold, so a
   * row dropped from a table fails the test above and the count fails here.
   */
  it('counts the names under each heading', () => {
    for (const age of ROSTER_AGES) {
      const heading = AGE_HEADINGS[age]!;
      const start = DOC.indexOf(heading);
      const end = DOC.indexOf('\n### ', start + heading.length);
      const section = DOC.slice(start, end === -1 ? undefined : end);
      const said = /(\d+) names — one row per name/.exec(section);
      expect(said, `${heading} does not say how many names it holds`).not.toBeNull();
      const live = LIVE_GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).age === age).length;
      expect(Number(said![1]), `${heading} miscounts its names`).toBe(live);
    }
  });

  /**
   * **A withdrawn name is not on the reference.** The doc→data direction above
   * already refuses one (a retired row is not in `live`), and this says the rule
   * out loud from the other end so the reason is legible: the tables are what
   * the game *deals*, and a row nobody can be dealt is a row nobody balances.
   */
  it('leaves every retired row out of the tables', () => {
    const withdrawn = GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).retired === true);
    expect(withdrawn.length).toBeGreaterThan(0);
    for (const id of withdrawn) {
      const name = greatPersonDef(id).name;
      for (const age of ROSTER_AGES) {
        expect([...docNames(AGE_HEADINGS[age]!)], name).not.toContain(name);
      }
    }
  });

  it('prints every figure the rules charge, at the value they charge', () => {
    const figures = docFigures();
    // Data → doc, both blocks: every `rules.greatPeople` knob and both rungs of
    // `rules.renown`. A knob added to the rules is a row here the day it exists,
    // and a knob retuned is a row that has to be retuned with it — which is the
    // whole reason this table is in the doc rather than a sentence about it.
    for (const [key, value] of Object.entries(RULES.greatPeople)) {
      expect(figures.has(key), `the figures table is missing "${key}"`).toBe(true);
      expect(figures.get(key), `the figures table prices "${key}"`).toBe(String(value));
    }
    for (const rung of ['base', 'linear', 'exponent'] as const) {
      const key = `renown.${rung}`;
      expect(figures.has(key), `the figures table is missing "${key}"`).toBe(true);
      expect(figures.get(key), `the figures table prices "${key}"`).toBe(
        String(RULES.renown[rung]),
      );
    }
    // Doc → data: a figure in the table that names no rule is a ghost — a knob
    // that was cut, or a name that drifted.
    const live = new Set([
      ...Object.keys(RULES.greatPeople),
      'renown.base',
      'renown.linear',
      'renown.exponent',
    ]);
    for (const key of figures.keys()) {
      expect(live.has(key), `the figures table row "${key}" names no rule`).toBe(true);
    }
  });
});
