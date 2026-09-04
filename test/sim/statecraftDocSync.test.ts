import { describe, expect, it } from 'vitest';

import {
  DOCTRINE_IDS,
  ORDER_IDS,
  type OrderRarity,
  doctrineDef,
  orderDef,
} from '../../src/sim/statecraftData';

/**
 * The doc↔data sync test (the user's workflow ruling, 2026-09-03): the pool
 * tables in `docs/orders-and-doctrines.md` are the design worksheet the user
 * edits by hand, and twice now a row has fallen out of one side without the
 * other noticing (Curious Elders and Triumphs vanished from the doc's tables
 * during an edit pass and were only found by accident). A doc table that
 * mirrors data carries a sync test from here on: every live data row appears
 * in its own table by name, and every name in a BUILT table names a data row.
 * Retired rows are excluded on both sides — they leave the pools and the doc
 * alike. Both halves of the worksheet are read: the Orders by pool and the
 * Doctrines by tier. The PROPOSED Order pool sections (Government IV/V/VI)
 * mirror nothing yet and are not read.
 */
describe('the orders and doctrines doc mirrors the data', () => {
  // The repo's source-reading pattern: Vite's raw import, so the test runs in
  // the same loader as everything else and needs no node types.
  const docFiles = import.meta.glob('../../docs/orders-and-doctrines.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  /** The doc's section heading for each built pool. */
  const POOL_HEADINGS: Record<string, string> = {
    chiefdom: '### Chiefdom pool',
    governmentI: '### Government I pool',
    governmentII: '### Government II pool',
    governmentIII: '### Government III pool',
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
      if (cells[1] === 'Order' || cells[1] === 'Doctrine' || /^-+$/.test(cells[1])) continue;
      names.add(cells[1]);
    }
    return names;
  }

  it('lists every live order in its pool, and nothing else', () => {
    for (const [pool, heading] of Object.entries(POOL_HEADINGS)) {
      const live = ORDER_IDS.filter(
        (id) => orderDef(id).pool === pool && orderDef(id).retired !== true,
      ).map((id) => orderDef(id).name);
      const doc = docNames(heading);
      // Data → doc: an order added (or moved) in the data must be written into
      // the worksheet's table, or the user is balancing rows they cannot see.
      for (const name of live) expect([...doc], `${heading} is missing "${name}"`).toContain(name);
      // Doc → data: a row in the worksheet that names no live data row is a
      // ghost — either it was cut from the data (delete the row here too) or
      // its name drifted (fix whichever side is wrong; ids are forever, names
      // follow the data).
      const liveSet = new Set(live);
      for (const name of doc) {
        expect(liveSet.has(name), `${heading} row "${name}" names no live data row`).toBe(true);
      }
    }
  });

  /**
   * The **rarity** half (the levelling ruling of 2026-09-04).
   *
   * The Rarity column of the worksheet's pool tables is where the user assigns
   * ● ◆ ○, and `OrderDef.rarity` is what the draw reads. They are one decision
   * written twice, which is precisely the drift this file exists to catch: a
   * mark moved in the doc and not in the data is a card the user believes they
   * have made rarer and has not.
   *
   * A **blank** mark is common, deliberately and by the same rule the data file
   * defaulted 26 rows under: an untiered card is an ordinary card. It is read
   * as an assignment rather than as "unset" so that the two sides can still be
   * compared — nothing here excuses a row from the pin.
   *
   * Keyed by pool **and** name because two live rows share a name across pools
   * (the chiefdom's First Fruits and Government III's), which is legal — ids
   * are what is unique — and would otherwise make one of them shadow the other.
   */
  const MARKS: Record<string, OrderRarity> = {
    '●': 'common',
    '◆': 'uncommon',
    '○': 'rare',
    '': 'common',
  };

  /** Every row under one heading as `name → rarity mark`, in the doc's own order. */
  function docRarity(heading: string): Map<string, string> {
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n### ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows = new Map<string, string>();
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 6 || cells[0] !== '' || cells[1] === '') continue;
      if (cells[1] === 'Order' || /^-+$/.test(cells[1])) continue;
      rows.set(cells[1], cells[4] ?? '');
    }
    return rows;
  }

  it('gives every live order the rarity its worksheet mark says', () => {
    for (const [pool, heading] of Object.entries(POOL_HEADINGS)) {
      const marks = docRarity(heading);
      const live = ORDER_IDS.filter(
        (id) => orderDef(id).pool === pool && orderDef(id).retired !== true,
      );
      expect(live.length, heading).toBeGreaterThan(0);
      for (const id of live) {
        const def = orderDef(id);
        const mark = marks.get(def.name);
        expect(mark, `${heading} has no Rarity cell for "${def.name}"`).toBeDefined();
        const wanted = MARKS[mark ?? ''];
        expect(wanted, `${heading}: "${def.name}" carries an unknown mark "${mark ?? ''}"`)
          .toBeDefined();
        expect(def.rarity, `${def.name} (${id}) — the doc says "${mark ?? ''}"`).toBe(wanted);
      }
    }
  });

  /**
   * A retired row is out of the doc and out of the pools, and it still carries
   * a rarity — the field is required on the row rather than on the live subset,
   * so restoring a withdrawn card is one flag rather than two.
   */
  it('gives every row a rarity at all, retired ones included', () => {
    for (const id of ORDER_IDS) {
      expect(Object.values(MARKS), id).toContain(orderDef(id).rarity);
    }
  });

  /**
   * The Doctrine half, added the day the first Doctrine was ever withdrawn
   * (Athenaeum of the Road, 2026-09-03): the tier tables mirror the data
   * exactly as the pool tables do, so they earn the same test rather than a
   * second convention.
   *
   * A Doctrine's section is its **tier**, where an Order's is its pool — the
   * one difference, and the reason this is a second loop rather than a widened
   * first. Tier 0 is deliberately unread: those rows are in no live pool and no
   * table, and they say so in `deferred`.
   */
  const TIER_HEADINGS: Record<number, string> = {
    4: '### Pool I (tier 4)',
    10: '### Pool II (tier 10)',
    18: '### Pool III (tier 18)',
    29: '### Pool IV (tier 29)',
    45: '### Pool V (tier 45)',
  };

  it('lists every live doctrine in its tier, and nothing else', () => {
    for (const [tier, heading] of Object.entries(TIER_HEADINGS)) {
      const live = DOCTRINE_IDS.filter(
        (id) => doctrineDef(id).tier === Number(tier) && doctrineDef(id).retired !== true,
      ).map((id) => doctrineDef(id).name);
      const doc = docNames(heading);
      for (const name of live) expect([...doc], `${heading} is missing "${name}"`).toContain(name);
      const liveSet = new Set(live);
      for (const name of doc) {
        expect(liveSet.has(name), `${heading} row "${name}" names no live data row`).toBe(true);
      }
    }
  });
});
