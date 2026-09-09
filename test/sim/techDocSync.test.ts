import { describe, expect, it } from 'vitest';

import { TECH_AGES, TECH_IDS, techDef } from '../../src/sim/techData';

/**
 * The doc↔data sync test for the tree, `statecraftDocSync.test.ts`'s pattern one
 * table over (the user's workflow ruling: a doc table that mirrors data carries
 * a sync test).
 *
 * `docs/tech-tree.md` Part 2 prints a table per age — node, price, prereqs, what
 * the node hands over — and the price column is the one a balance pass reads.
 * Since **a column is a price**, that column mirrors `data/techs.json` exactly,
 * and a ladder retuned in the data and not in the doc leaves the user reading
 * last week's chart. Both directions, per age: every row of the data appears in
 * its age's table at the price the data charges, and every row of the table
 * names a live node of that age.
 *
 * The section heading carries the age's own band ("12 nodes, 5–53🔬"), which is
 * three more figures the data can answer, so they are read too — a node added to
 * an age moves the count, and a retuned column moves the band.
 *
 * There is no retired concept on the tree: a technology is never withdrawn (ids
 * are forever, and a save that named one replays), so nothing is excluded here.
 */
describe('the tech-tree doc mirrors the rows', () => {
  // The repo's source-reading pattern: Vite's raw import, so the test runs in
  // the same loader as everything else and needs no node types.
  const docFiles = import.meta.glob('../../docs/tech-tree.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  /** The doc's section heading for each age, matched by its opening. */
  const AGE_HEADINGS: Record<number, string> = {
    1: '### Æra I',
    2: '### Æra II',
    3: '### Æra III',
    4: '### Æra IV',
    5: '### Æra V',
  };

  /** One age's section, heading line included. */
  function section(heading: string): string {
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n### ', start + heading.length);
    return DOC.slice(start, end === -1 ? undefined : end);
  }

  /**
   * The node rows of one age's table: name → price.
   *
   * The name cell carries the doc's own marks — † a deferred half, ‡ one to a
   * realm, ◇ granted and never built — which are prose about the row rather than
   * part of its name, so they come off. Nothing else is trimmed: a name that
   * drifted from the data is exactly the failure this test is for.
   */
  function docCosts(heading: string): Map<string, number> {
    const rows = new Map<string, number>();
    for (const line of section(heading).split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 4 || cells[0] !== '' || cells[1] === '') continue;
      if (cells[1] === 'node' || /^-+$/.test(cells[1])) continue;
      const name = cells[1]!.replace(/[†‡◇*]/g, '').trim();
      rows.set(name, Number(cells[2]));
    }
    return rows;
  }

  it('gives every age a table', () => {
    // Derived from the data rather than restated: the day Æra V takes its first
    // node, this fails until somebody writes its section — which is the failure
    // we want, rather than an age nobody notices is missing from the reference.
    for (const age of TECH_AGES) {
      expect(AGE_HEADINGS[age], `no heading written for age ${age}`).toBeDefined();
    }
  });

  it('prints every node of every age at the price the rows charge', () => {
    for (const age of TECH_AGES) {
      const heading = AGE_HEADINGS[age]!;
      const doc = docCosts(heading);
      const live = TECH_IDS.filter((id) => techDef(id).age === age);
      // Data → doc, name and price together: a node added, moved between ages or
      // re-priced in `data/techs.json` must be written into the table, because
      // the table is what a balance pass marks up.
      for (const id of live) {
        const def = techDef(id);
        expect(doc.has(def.name), `${heading} is missing "${def.name}"`).toBe(true);
        expect(doc.get(def.name), `${heading} prices "${def.name}"`).toBe(def.cost);
      }
      // Doc → data: a row in the table that names no live node of this age is a
      // ghost — cut from the data, moved age, or a name that drifted.
      const liveNames = new Set(live.map((id) => techDef(id).name));
      for (const name of doc.keys()) {
        expect(liveNames.has(name), `${heading} row "${name}" names no node of this age`).toBe(
          true,
        );
      }
    }
  });

  it('heads each age with its own count and band', () => {
    for (const age of TECH_AGES) {
      const heading = AGE_HEADINGS[age]!;
      const live = TECH_IDS.filter((id) => techDef(id).age === age).map((id) => techDef(id));
      const costs = live.map((def) => def.cost);
      const low = Math.min(...costs);
      const high = Math.max(...costs);
      // The heading line is the age's summary — "(15 nodes, 1650–2550🔬)" — and
      // every figure in it is the data's. An age that grew a node or moved a
      // column says so here before the table below it is read.
      const line = section(heading).split('\n')[0]!;
      expect(line, `${heading} heading`).toContain(`${live.length} nodes`);
      expect(line, `${heading} heading`).toContain(`${low}–${high}🔬`);
    }
  });
});
