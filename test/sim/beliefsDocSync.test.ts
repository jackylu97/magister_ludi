import { describe, expect, it } from 'vitest';

import {
  BELIEF_IDS,
  CONSECRATION_IDS,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  LIVE_RITE_IDS,
  beliefDef,
  consecrationDef,
  riteDef,
} from '../../src/sim/religionData';

/**
 * The doc↔data sync test for the beliefs worksheet (the user, 2026-09-08:
 * *"draft a current copy of all the possible religious beliefs, i'd like to
 * make some edits"*).
 *
 * `docs/beliefs.md` is `docs/orders-and-doctrines.md`'s twin one system over: a
 * worksheet the user edits by hand, mirroring `data/religion.json` row for row.
 * The rule it earns is the workflow rule (`CLAUDE.md`) and it is the same
 * bargain in both directions — every live data row appears in its own table by
 * name, and every name in a table names a live data row. **Retired rows are
 * excluded on both sides**: they leave the pools and the doc alike, and they
 * stay in the id lists because a save may name one (`BeliefDef.retired`,
 * `RiteDef.retired`).
 *
 * Two columns beyond the names are pinned, and only two, because only two are
 * fields the user tunes here: a pantheon belief's **axis** (the synergy thread
 * the screen groups on and the religion's name is generated from) and a rite's
 * **duration** (the turns its season runs). The Effect cell is the row's own
 * `text` and is not compared — it is prose the describers never see, and a
 * character-exact pin on it would fail on a typo fix rather than on a drift
 * that matters. The Building column names the building whose completion rolls a
 * consecration, which is a marker on the building row (`BuildingDef.consecrated`)
 * and not a field here, so it is prose too.
 */
describe('the beliefs doc mirrors the data', () => {
  // The repo's source-reading pattern: Vite's raw import, so the test runs in
  // the same loader as everything else and needs no node types.
  const docFiles = import.meta.glob('../../docs/beliefs.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  /** The doc's section heading for each table in the data. */
  const HEADINGS = {
    beliefs: '## Pantheon beliefs',
    followerBeliefs: '## Follower beliefs',
    enhancerBeliefs: '## Enhancer beliefs',
    rites: '## Rites',
    consecrations: '## Consecrations',
  } as const;

  /** Every table row under one heading, as its cells, in the doc's own order. */
  function docRows(heading: string): string[][] {
    const start = DOC.indexOf(`\n${heading}\n`);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n## ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows: string[][] = [];
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 5 || cells[0] !== '' || cells[1] === '') continue;
      if (/^-+$/.test(cells[1] ?? '')) continue;
      // The header row of the table names its own first column.
      if (cells[1] === 'Belief' || cells[1] === 'Rite' || cells[1] === 'Consecration') continue;
      rows.push(cells);
    }
    return rows;
  }

  /** First-column names of every table row under one heading. */
  function docNames(heading: string): string[] {
    return docRows(heading).map((cells) => cells[1] ?? '');
  }

  /** The live rows of each table, in file order, as the doc must print them. */
  const LIVE: Record<keyof typeof HEADINGS, string[]> = {
    beliefs: BELIEF_IDS.filter((id) => beliefDef(id).retired !== true).map(
      (id) => beliefDef(id).name,
    ),
    followerBeliefs: FOLLOWER_BELIEF_IDS.filter((id) => beliefDef(id).retired !== true).map(
      (id) => beliefDef(id).name,
    ),
    enhancerBeliefs: ENHANCER_BELIEF_IDS.filter((id) => beliefDef(id).retired !== true).map(
      (id) => beliefDef(id).name,
    ),
    rites: LIVE_RITE_IDS.map((id) => riteDef(id).name),
    consecrations: CONSECRATION_IDS.map((id) => consecrationDef(id).name),
  };

  it('lists every live row in its own table, and nothing else', () => {
    for (const [table, heading] of Object.entries(HEADINGS)) {
      const live = LIVE[table as keyof typeof HEADINGS];
      expect(live.length, heading).toBeGreaterThan(0);
      const doc = docNames(heading);
      // Data → doc: a row added to the data must be written into the worksheet,
      // or the user is balancing rows they cannot see.
      for (const name of live) expect(doc, `${heading} is missing "${name}"`).toContain(name);
      // Doc → data: a row in the worksheet naming no live data row is a ghost —
      // either it was cut from the data (delete the row here too) or its name
      // drifted (ids are forever, names follow the data).
      const liveSet = new Set(live);
      for (const name of doc) {
        expect(liveSet.has(name), `${heading} row "${name}" names no live data row`).toBe(true);
      }
    }
  });

  /**
   * A **retired** row is out of the doc, on both sides of the rule. Written out
   * rather than left to the loop above, because "the doc does not name it" is
   * the half a widened loop would silently stop checking the day somebody added
   * a section for withdrawn rows.
   */
  it('keeps every retired row out of every table', () => {
    const withdrawn = [
      ...[...BELIEF_IDS, ...FOLLOWER_BELIEF_IDS, ...ENHANCER_BELIEF_IDS]
        .filter((id) => beliefDef(id).retired === true)
        .map((id) => beliefDef(id).name),
    ];
    const printed = new Set(Object.values(HEADINGS).flatMap((heading) => docNames(heading)));
    for (const name of withdrawn) {
      expect(printed.has(name), `"${name}" is retired and must not appear in a table`).toBe(false);
    }
  });

  /**
   * The **axis** half. The Axis column is where the user assigns a belief its
   * synergy thread, and `BeliefDef.axis` is what the screen groups on and what
   * the religion's generated name is built from. They are one decision written
   * twice, which is precisely the drift this file exists to catch: an axis moved
   * in the doc and not in the data is a thread the user believes they have
   * rewoven and have not. Printed as the data spells it, `none` included, so the
   * two sides can be compared without a table of prettier words in between.
   */
  it('gives every pantheon belief the axis its worksheet column says', () => {
    const doc = new Map(docRows(HEADINGS.beliefs).map((cells) => [cells[1] ?? '', cells[2] ?? '']));
    for (const id of BELIEF_IDS) {
      const def = beliefDef(id);
      if (def.retired === true) continue;
      const printed = doc.get(def.name);
      expect(printed, `the Pantheon table has no Axis cell for "${def.name}"`).toBeDefined();
      expect(printed, `${def.name} (${id}) — the data says`).toBe(def.axis);
    }
  });

  /**
   * The **duration** half. A rite is a season and its length is the whole of the
   * balance decision — a number the user tunes in this table, read by
   * `performRite` as the absolute turn its `TimedEffect` expires on. Ten for
   * every live row today, which is exactly the sort of agreement that rots
   * quietly the first time one row moves.
   */
  it('gives every live rite the duration its worksheet column says', () => {
    const doc = new Map(docRows(HEADINGS.rites).map((cells) => [cells[1] ?? '', cells[2] ?? '']));
    for (const id of LIVE_RITE_IDS) {
      const def = riteDef(id);
      const printed = doc.get(def.name);
      expect(printed, `the Rites table has no Duration cell for "${def.name}"`).toBeDefined();
      expect(printed, `${def.name} (${id}) — the data says`).toBe(String(def.duration));
    }
  });
});
