import { describe, expect, it } from 'vitest';

import { GREAT_PERSON_IDS, ROSTER_AGES, greatPersonDef } from '../../src/sim/greatPeopleData';

/**
 * The doc↔data sync test, `statecraftDocSync.test.ts`'s twin one table over (the
 * user's workflow ruling, 2026-09-03): a doc table that mirrors data carries a
 * sync test. `docs/great-people.md` became the **nerf worksheet** the day the
 * great-people pass opened ("unfortunately i think we need to nerf great
 * people"), and a worksheet is only worth editing if it shows every row there
 * is: a name that fell out of the doc is a name nobody balances, and a name that
 * fell out of the data is a nerf written against a ghost.
 *
 * So both directions are read, per age: every roster row appears in its own
 * age's table by name, and every name in an age's table names a roster row of
 * that age. The section is the **age** here, where an Order's is its pool and a
 * Doctrine's is its tier — the ages come from `ROSTER_AGES`, derived from the
 * data, so an Æra VI would fail here until its heading is written rather than
 * being quietly skipped.
 *
 * There is no retired concept on this table (a great person is consumed, never
 * withdrawn from a pool), so nothing is excluded: a row with an empty `legacy`
 * is still a name that can be drawn, and it is still on the worksheet — the
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
      const live = GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).age === age).map(
        (id) => greatPersonDef(id).name,
      );
      const doc = docNames(heading);
      // Data → doc: a name added (or moved between ages) in the data must be
      // written into the worksheet's table, or the user is balancing rows they
      // cannot see.
      for (const name of live) expect([...doc], `${heading} is missing "${name}"`).toContain(name);
      // Doc → data: a row in the worksheet that names no roster row of this age
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
});
