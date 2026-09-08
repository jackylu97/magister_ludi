import { describe, expect, it } from 'vitest';

import {
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  type OrderRarity,
  doctrineDef,
  governmentDef,
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
 * Doctrines by tier. Every section of the worksheet mirrors data since the
 * consolidation of 2026-09-08 (batch O1): the one PROPOSED pool that mirrored
 * nothing (Government VI) lives in `docs/history/orders-and-doctrines-as-built.md`
 * now — Government IV and V stopped being proposals on 2026-09-05, when the
 * tier-29 and tier-45 governments were wired to pools of their own.
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
    // The two late shelves, built 2026-09-05 and read here from that day: they
    // were PROPOSED tables mirroring nothing until the tier-29 and tier-45
    // governments were wired to pools of their own.
    governmentIV: '### Government IV pool',
    governmentV: '### Government V pool',
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
   * The **role** half (batch F, 2026-09-06 — `docs/history/orders-pass-3.md` §1).
   *
   * The worksheet's new Role column says which of the three kinds of card a row
   * is: an **engine** (its subject is the deck or the board's *kind*), a
   * **payoff** (it scales with what the empire has built, holds or slotted) or a
   * **standalone** (a flat, a rule, an occasion, a boon on the calendar). The
   * user balances the pass by those shares, so the column has to say what the
   * *data* says and not what somebody typed a fortnight ago.
   *
   * Unlike rarity, the role is **not a field** — it is derived from the row's
   * own effects, because a card's kind is a fact about its shapes and a second
   * place to write it down would be a second place to get it wrong. So this
   * pins the doc against the derivation rather than against a column of the
   * data, which is the same bargain one grade up: a row that changes shape
   * changes its letter here or fails the build.
   */
  type Role = 'E' | 'P' | 'S';

  /** Counts whose subject is the deck itself — the engine reading. */
  const DECK_COUNTS = new Set([
    'slottedOrders',
    'unslottedOrders',
    'slottedOrdersOfSlot',
    'rerollsWhileSlotted',
  ]);

  function roleOf(id: (typeof ORDER_IDS)[number]): Role {
    let engine = false;
    let payoff = false;
    for (const effect of orderDef(id).effects) {
      switch (effect.kind) {
        case 'cardYieldAmplifier':
        case 'slotPosition':
        case 'periodShorten':
          engine = true;
          break;
        case 'buildingYieldPercent':
          // A share taken **last** is a multiplier on what the empire raised —
          // a payoff. An ordinary share reads a class of buildings — an engine.
          if (effect.appliedLast === true) payoff = true;
          else engine = true;
          break;
        case 'countScaled':
          if (DECK_COUNTS.has(effect.count)) engine = true;
          else payoff = true;
          break;
        case 'combatLine':
          if (effect.scaled && DECK_COUNTS.has(effect.scaled.count)) engine = true;
          break;
        case 'tileYield':
          // "every hex that already supplies X" is the tile test — an engine.
          // A percentage on the works or on the ground is a doubler — a payoff.
          if ((effect.on as { test?: string }).test === 'yields') engine = true;
          else if (effect.percent !== undefined || effect.basePercent !== undefined) payoff = true;
          break;
        case 'routeYield':
          // A flat on a caravan is a standalone; a **share** of what the roads
          // already carry is a payoff, and it scales with exactly the thing a
          // payoff scales with — what the empire has built and is running. The
          // Silk Exchange (batch E4b) is the first row to carry one.
          if (effect.share !== undefined) payoff = true;
          break;
        case 'yieldConversion':
        case 'rateConversion':
        case 'effectAmplifier':
        case 'percentYields':
        case 'mirrorYield':
          payoff = true;
          break;
        case 'periodic':
          // A boon is a standalone unless its size is a fact about the realm's
          // own books, which is what makes the periodic conversions payoffs.
          if (effect.count === 'empireYield') payoff = true;
          break;
        case 'cityYields': {
          const scope = effect.scope;
          if (scope !== undefined && scope.test !== 'capital') payoff = true;
          break;
        }
        default:
          break;
      }
    }
    return engine ? 'E' : payoff ? 'P' : 'S';
  }

  /** Every row under one heading as `name → role mark`. */
  function docRole(heading: string): Map<string, string> {
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n### ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows = new Map<string, string>();
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 7 || cells[0] !== '' || cells[1] === '') continue;
      if (cells[1] === 'Order' || /^-+$/.test(cells[1])) continue;
      rows.set(cells[1], cells[5] ?? '');
    }
    return rows;
  }

  it('gives every live order the role its own effects say it is', () => {
    for (const [pool, heading] of Object.entries(POOL_HEADINGS)) {
      const marks = docRole(heading);
      const live = ORDER_IDS.filter(
        (id) => orderDef(id).pool === pool && orderDef(id).retired !== true,
      );
      expect(live.length, heading).toBeGreaterThan(0);
      for (const id of live) {
        const def = orderDef(id);
        const mark = marks.get(def.name);
        expect(mark, `${heading} has no Role cell for "${def.name}"`).toBeDefined();
        expect(mark, `${def.name} (${id}) — the row's effects read as`).toBe(roleOf(id));
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

  /**
   * The **chairs** half (batch G, 2026-09-06 — `docs/history/fewer-things.md` §6 item 9,
   * "chairs down a quarter: Government III 11 → 8, and Government IV and V
   * commensurately").
   *
   * The Governments table's `Slots M/E/W` column is the third doc table in this
   * file mirroring data, and until this batch it was the one without a sync
   * test — which is exactly how it came to be read three times in the design
   * docs and never checked once. It is a table of numbers the user tunes, so it
   * earns the rule (`CLAUDE.md`: a doc table that mirrors data carries a sync
   * test).
   *
   * Both directions, as ever: every government in the data appears in the table
   * with its own spread, and every row of the table names a government.
   */
  /**
   * Every row of the Governments table as `name → { chairs, signature }`.
   *
   * One walk for the two columns that mirror data, so a row read twice is
   * parsed once and the two pins below cannot disagree about which line is a
   * row.
   */
  function governmentRows(): Map<string, { chairs: string; signature: string }> {
    const heading = '## Governments';
    const start = DOC.indexOf(heading);
    expect(start).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n## ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows = new Map<string, { chairs: string; signature: string }>();
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 5 || cells[0] !== '' || cells[2] === '') continue;
      if (cells[2] === 'Government' || /^-+$/.test(cells[2])) continue;
      rows.set(cells[2], { chairs: cells[3] ?? '', signature: cells[4] ?? '' });
    }
    return rows;
  }

  it('prints every government’s chairs as the data lays them out', () => {
    const doc = new Map([...governmentRows()].map(([name, row]) => [name, row.chairs]));

    for (const id of GOVERNMENT_IDS) {
      const def = governmentDef(id);
      const spread = `${def.slots.military}/${def.slots.economic}/${def.slots.wildcard}`;
      const printed = doc.get(def.name);
      expect(printed, `the Governments table has no row for "${def.name}"`).toBeDefined();
      expect(printed, `${def.name} (${id}) — the data lays out`).toBe(spread);
    }
    // Doc → data: a row naming no government is a ghost, the same bargain the
    // pool tables strike above.
    const names = new Set(GOVERNMENT_IDS.map((id) => governmentDef(id).name));
    for (const name of doc.keys()) {
      expect(names.has(name), `the Governments table row "${name}" names no government`).toBe(true);
    }
    // And the tier column mirrors the ladder, so a government moved between
    // tiers cannot sit under the wrong heading row.
    expect(doc.size).toBe(GOVERNMENT_IDS.length);
  });

  /**
   * The **Signature** half (batch B1b, 2026-09-08 — `docs/flags.md` item (zz)).
   *
   * Every Order and Doctrine cell in this worksheet has always been the row's
   * own `text`, and the governments' Signature column was the one that was
   * **hand-written**: the four early chairs carried no `text` at all, so there
   * was nothing to mirror and the cells were composed in the doc — in icons and
   * middots the data never held. That is how the user's marks on War Chief,
   * Theocracy and Tyranny came to sit in this table for a fortnight describing
   * a law the data did not carry: a hand-written cell is a claim nobody checks.
   *
   * The four rows have a `text` now and the cells are those strings **verbatim**
   * — trimmed of the table's own padding and nothing else. A cell edited without
   * the row fails here, which is the whole point, and a screen and a worksheet
   * that disagree about what a government does stop being possible.
   */
  it('prints every government’s signature in the row’s own ratified words', () => {
    const doc = governmentRows();
    for (const id of GOVERNMENT_IDS) {
      const def = governmentDef(id);
      const printed = doc.get(def.name)?.signature;
      expect(printed, `the Governments table has no row for "${def.name}"`).toBeDefined();
      // Data → doc, and the `text` itself is required: a chair with no ratified
      // words has nothing to print on the government screen either.
      expect(def.text, `${def.name} (${id}) carries no ratified text`).toBeDefined();
      expect(printed, `${def.name} (${id}) — the row's own words are`).toBe(def.text);
    }
  });
});
