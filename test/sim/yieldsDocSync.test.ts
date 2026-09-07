import { describe, expect, it } from 'vitest';

/**
 * **`docs/yields.md` ↔ the source** — the sync test the sequence of record
 * earns (CLAUDE.md: a doc table that mirrors data carries a sync test; the
 * `statecraftDocSync.test.ts` pattern, one system over).
 *
 * `docs/yields.md` states the order every yield is computed in, step by step.
 * That order is not written anywhere else — it is the *walk order of two
 * functions' bodies* — so a doc stating it is a doc that goes stale silently.
 * Two halves, and both read the source rather than a second copy of the claim:
 *
 *   1. **The steps appear in the source in the doc's order.** Each step names
 *      its anchor — the function the step *is* — and the anchors are searched
 *      for as calls (`name(`) in the concatenated bodies of the five functions
 *      the pipeline runs through, in pipeline order. A step moved in the code
 *      and not in the doc fails here, and so does a step moved in the doc.
 *   2. **Every `CardEffect` kind is classified.** Every kind in
 *      `statecraftData.ts` is in the doc's register table (it lands in a step)
 *      or in the doc's "moves a voice but not through this sequence" list, or
 *      in neither — and which of the three is *pinned here*, so a new kind has
 *      to say where it lands before the suite is green.
 *
 * Core tier, and it is a source-reading register test — always core (CLAUDE.md).
 */
describe('docs/yields.md mirrors the sequence the sim runs', () => {
  // Vite's raw import, the repo's source-reading pattern: the test runs in the
  // same loader as everything else and needs no node typings.
  const raw = <T>(files: Record<string, unknown>): T => Object.values(files)[0] as T;
  const DOC = raw<string>(
    import.meta.glob('../../docs/yields.md', { eager: true, query: '?raw', import: 'default' }),
  );
  const CITIES = raw<string>(
    import.meta.glob('../../src/sim/cities.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }),
  );
  const STATECRAFT_DATA = raw<string>(
    import.meta.glob('../../src/sim/statecraftData.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }),
  );

  /** Every `| … |` row of the doc, as trimmed cells. Headings and rules dropped. */
  function docRows(): string[][] {
    const rows: string[][] = [];
    for (const raw of DOC.split('\n')) {
      const cells = raw.split('|').map((cell) => cell.trim());
      if (cells.length < 4 || cells[0] !== '') continue;
      if (/^-+$/.test(cells[1] ?? '')) continue;
      rows.push(cells);
    }
    return rows;
  }

  /** The first `` `identifier` `` in a cell, or undefined. */
  function firstTicked(cell: string): string | undefined {
    return /`([A-Za-z][A-Za-z0-9]*)`/.exec(cell)?.[1];
  }

  /**
   * The doc's numbered steps, in the doc's own order: `[number, anchor]`.
   *
   * A step row is one whose first cell is a bare number — which is exactly the
   * two sequence tables and nothing else in the file.
   */
  function docSteps(): { step: number; anchor: string }[] {
    const steps: { step: number; anchor: string }[] = [];
    for (const cells of docRows()) {
      if (!/^\d+$/.test(cells[1] ?? '')) continue;
      const anchor = firstTicked(cells[2] ?? '');
      expect(anchor, `step ${cells[1]} names no anchor function`).toBeDefined();
      steps.push({ step: Number(cells[1]), anchor: anchor! });
    }
    return steps;
  }

  /**
   * One function's body, from its `export function name(` (or `function name(`)
   * to the first line that closes it at column zero.
   *
   * The signature is included and the docblock above it is not, which is what
   * makes a call inside a *comment* about a neighbouring function invisible
   * here — and the anchors are searched for as `name(` in any case.
   */
  function body(source: string, name: string): string {
    const start = source.search(new RegExp(`\\n(?:export )?function ${name}\\(`));
    expect(start, `${name} is not a function in cities.ts`).toBeGreaterThanOrEqual(0);
    const end = source.indexOf('\n}\n', start);
    expect(end, `${name} has no closing brace at column zero`).toBeGreaterThan(start);
    return source.slice(start, end);
  }

  /**
   * The pipeline as one text, in the order it runs: the town's list, the town's
   * multiplication, the empire's standing lines, the empire's own list, and the
   * phase that banks the fold.
   *
   * Concatenated rather than searched one at a time so that "in the doc's order"
   * is one monotone walk — which is the claim, and which a per-function search
   * could not make across a boundary.
   */
  function pipeline(): string {
    return [
      body(CITIES, 'cityQuote'),
      body(CITIES, 'cityYields'),
      body(CITIES, 'empireStandingLines'),
      body(CITIES, 'explainEmpireLines'),
      body(CITIES, 'collectYields'),
    ].join('\n/* --- */\n');
  }

  it('runs the twelve town steps and the six empire steps in the doc’s order', () => {
    const steps = docSteps();
    // Eighteen: twelve for the town, six for the empire. Written down so that a
    // table quietly losing a row is a failure rather than a shorter pass.
    expect(steps.map((entry) => entry.step)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    );

    const text = pipeline();
    let previous = -1;
    let previousStep = '';
    for (const { step, anchor } of steps) {
      const at = text.indexOf(`${anchor}(`);
      expect(at, `step ${step}: the source never calls ${anchor}()`).toBeGreaterThanOrEqual(0);
      expect(
        at > previous,
        `step ${step} (${anchor}) is called before step ${previousStep} in the source — ` +
          'the doc and the pipeline disagree about the order',
      ).toBe(true);
      previous = at;
      previousStep = `${step}`;
    }
  });

  /**
   * The steps a kind's register row may name — the same eighteen.
   */
  it('gives every register row a step that exists', () => {
    const steps = new Set(docSteps().map((entry) => String(entry.step)));
    for (const cells of registerRows()) {
      const named = (cells[2] ?? '').split(',').map((part) => part.trim());
      expect(named.length, `${cells[1]} names no step`).toBeGreaterThan(0);
      for (const step of named) {
        expect(steps.has(step), `${cells[1]} names step ${step}, which the doc has no row for`)
          .toBe(true);
      }
    }
  });

  /** The register table's rows: the ones whose first cell is a backticked kind. */
  function registerRows(): string[][] {
    return docRows().filter((cells) => /^`[a-zA-Z]+`$/.test(cells[1] ?? ''));
  }

  /** The kinds the register table names, in the doc's order. */
  function registerKinds(): string[] {
    return registerRows().map((cells) => firstTicked(cells[1] ?? '')!);
  }

  /** The kinds named in the "moves a voice but not through this sequence" list. */
  function outsideKinds(): string[] {
    const heading = '### Kinds that move a voice but not through this sequence';
    const start = DOC.indexOf(heading);
    expect(start, 'the doc has no “outside the sequence” list').toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n---', start);
    const section = DOC.slice(start + heading.length, end === -1 ? undefined : end);
    // Only the run-on list of names, which is the one paragraph made of nothing
    // but backticked kinds separated by middots — the prose beneath it names
    // functions, not kinds, and must not be read as a classification.
    const names: string[] = [];
    for (const line of section.split('\n')) {
      if (line.trim() === '' || !/^[`·\s\w]+$/.test(line)) continue;
      for (const match of line.matchAll(/`([a-zA-Z]+)`/g)) names.push(match[1]!);
    }
    return names;
  }

  /**
   * **Every kind in the union, and which of the three buckets it is in.**
   *
   * `LANDS` is the sequence — every kind that pays one of the six voices through
   * `cityQuote` or `explainEmpireLines`, and therefore every kind the doc's
   * register table must have a row for. `OUTSIDE` moves a voice by some other
   * road (an occasion, a bill, renown) and is named in the doc's second list.
   * `SILENT` moves no voice at all — a rule, a stat, a meter, a stamp, an
   * unlock, an offer — and must appear in **neither**, so the doc cannot
   * quietly grow a row for something that pays nothing.
   *
   * The three together are pinned against the source below: a shape added to
   * `statecraftData.ts` is in none of them, and the suite says so until somebody
   * decides which it is.
   */
  const LANDS = [
    'tileYield',
    'cityYields',
    'countScaled',
    'mirrorYield',
    'cardYieldAmplifier',
    'routeYield',
    'buildingYieldPercent',
    'yieldConversion',
    'percentYields',
    'productionBonus',
    'empireYields',
    'rateConversion',
  ];

  const OUTSIDE = [
    'windfallRider',
    'periodic',
    'foundingRider',
    'offerRider',
    'projectRider',
    'purchaseRider',
    'routeRider',
    'upkeepRebate',
    'upkeepSurcharge',
    'beadPerOccasion',
    'renown',
    'cityRenownPercent',
  ];

  const SILENT = [
    'authority',
    'cityStat',
    'combatLine',
    'conditionRule',
    'effectAmplifier',
    'happiness',
    'happinessTierBoost',
    'metaRule',
    'meterRule',
    'pantheonSlots',
    'periodicMuster',
    'periodicOffer',
    'periodShorten',
    'pressure',
    'pressureRule',
    'rule',
    'rulePercent',
    'slotPosition',
    'unitStamp',
    'unitStat',
    'unlocksBuilding',
  ];

  /** Every `kind: '…'` discriminant declared in the union's shapes. */
  function sourceKinds(): string[] {
    const found = new Set<string>();
    for (const match of STATECRAFT_DATA.matchAll(/^\s*kind: '([a-zA-Z]+)';/gm)) {
      found.add(match[1]!);
    }
    return [...found].sort();
  }

  it('classifies every effect kind the union declares', () => {
    const classified = [...LANDS, ...OUTSIDE, ...SILENT].sort();
    // No kind in two buckets, and none forgotten.
    expect(new Set(classified).size).toBe(classified.length);
    expect(classified).toEqual(sourceKinds());
  });

  it('gives every yield-paying kind exactly one register row', () => {
    const rows = registerKinds();
    // Exactly one row apiece, in the doc's own order — a kind named twice would
    // be a kind whose layer is ambiguous, which is the thing this table exists
    // to settle.
    expect(new Set(rows).size, 'a kind is named twice in the register').toBe(rows.length);
    expect([...rows].sort()).toEqual([...LANDS].sort());
  });

  it('names every other voice-moving kind in the list beside it', () => {
    const named = outsideKinds();
    expect(new Set(named).size, 'a kind is named twice outside the sequence').toBe(named.length);
    expect([...named].sort()).toEqual([...OUTSIDE].sort());
  });

  it('keeps the kinds that pay nothing out of both lists', () => {
    const listed = new Set([...registerKinds(), ...outsideKinds()]);
    for (const kind of SILENT) {
      expect(listed.has(kind), `${kind} pays no yield and is listed as if it did`).toBe(false);
    }
  });
});
