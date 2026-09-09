import { describe, expect, it } from 'vitest';

/**
 * **The three verbs, asserted** — batch E3b (`docs/flags.md` item pp;
 * `docs/audit/evaluations.md` §4b step 7; the vocabulary is stated on
 * `src/sim/readings.ts` and tabled in `docs/yields.md`, "The three verbs").
 *
 * Every exported reading of a yield is one of three, and the point of writing
 * that down is that a fourth spelling can be *refused* rather than argued about
 * in review:
 *
 *   · **`explainX(…)`** returns a labelled **list** and never a bare number.
 *   · **`foldX(…)`** is the one **sum** of such a list.
 *   · **`readX(state, …)`** is the **memo** — `explain` + `fold`, keyed on the
 *     revision — and it lives in `src/sim/readings.ts` and nowhere else.
 *
 * Before this batch there were eight ways to say "pays a yield" across these
 * modules (§3d): `cityQuote`, `cityYields`, `civYields`, `empireRateReading`,
 * `ledgerReading`, `deckAggregate`, `cityStageSums`, `tileYieldOf`. Each is
 * gone or renamed, and this file is what stops them coming back one at a time.
 *
 * **Source-reading, therefore core tier** (CLAUDE.md). It reads the modules'
 * text rather than importing them, for the reason every register test here
 * does: a name is a fact about the file, and a test that imported the module
 * could only see what the module still exports rather than what it *calls*
 * things.
 */
describe('the three verbs', () => {
  /**
   * The layers the vocabulary governs — the yields pipeline, the card
   * evaluator, the memos, and the two surfaces that fold a yield of their own.
   *
   * A glob rather than a list, so a file added under `src/sim/yields/` or
   * `src/sim/statecraft/` tomorrow is governed the day it exists —
   * `moduleCycles.test.ts`'s bargain, one system over.
   */
  const SOURCES = {
    ...import.meta.glob('../../src/sim/yields/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }),
    ...import.meta.glob('../../src/sim/statecraft/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }),
    ...import.meta.glob(
      [
        '../../src/sim/cities.ts',
        '../../src/sim/statecraft.ts',
        '../../src/sim/readings.ts',
        '../../src/sim/cardImpact.ts',
        '../../src/sim/modifiers.ts',
        '../../src/ui/ledgerScreen.ts',
        '../../src/ui/topBar.ts',
      ],
      { eager: true, query: '?raw', import: 'default' },
    ),
  } as Record<string, string>;

  /** `path → source`, with the repo-relative path a failure can be searched by. */
  function modules(): { path: string; text: string }[] {
    return Object.entries(SOURCES)
      .map(([path, text]) => ({ path: path.replace('../../', ''), text }))
      .sort((a, b) => (a.path < b.path ? -1 : 1));
  }

  /**
   * One exported function per entry: its name, and everything from `export
   * function name(` to the `{` that opens its body — which is where the
   * declared return type is.
   */
  function exportedFunctions(text: string): { name: string; signature: string }[] {
    const found: { name: string; signature: string }[] = [];
    for (const match of text.matchAll(/\nexport function ([A-Za-z0-9_]+)\(/g)) {
      const from = match.index!;
      // Balanced from the parameter list's own bracket, because a default of
      // `= {}` or `= () => …` would otherwise end the signature early.
      let depth = 0;
      let close = from;
      for (let at = text.indexOf('(', from); at < text.length; at += 1) {
        if (text[at] === '(') depth += 1;
        else if (text[at] === ')') {
          depth -= 1;
          if (depth === 0) {
            close = at;
            break;
          }
        }
      }
      const open = text.indexOf('{', close);
      found.push({ name: match[1]!, signature: text.slice(from, open === -1 ? close : open) });
    }
    return found;
  }

  /** Every exported `const`, so a fold hidden behind an arrow is seen too. */
  function exportedConsts(text: string): string[] {
    return [...text.matchAll(/\nexport const ([A-Za-z0-9_]+)/g)].map((match) => match[1]!);
  }

  /**
   * The vocabulary this batch retired. A name ending in one of these is a name
   * that says *what it is about* where it should say *what it does*.
   */
  const RETIRED = /(Yield|Yields|Total|Rate|Rates|Reading|Quote|Aggregate|Sums)$/;

  const VERBS = /^(explain|fold|read)/;

  /**
   * The two exports that keep a retired suffix, each because it is not a
   * reading at all. Stated here rather than pattern-matched, so adding a third
   * is a decision somebody writes down.
   */
  const EXCEPTIONS: Record<string, string> = {
    emptyCityYields: 'a constructor of the six-voice bag — it reads nothing',
    collectYields: 'the turn phase that banks; a mutation, not a reading',
  };

  it('gives every exported reading one of the three verbs', () => {
    const offenders: string[] = [];
    for (const { path, text } of modules()) {
      const names = [
        ...exportedFunctions(text).map((entry) => entry.name),
        ...exportedConsts(text),
      ];
      for (const name of names) {
        if (!RETIRED.test(name)) continue;
        if (VERBS.test(name)) continue;
        if (EXCEPTIONS[name] !== undefined) continue;
        offenders.push(`${path}: ${name}`);
      }
    }
    expect(offenders, 'these exports carry a retired suffix and no verb').toEqual([]);
  });

  it('keeps the stated exceptions and no others', () => {
    // The other half of the rule above: an exception that stopped existing is
    // an exception nobody should still be able to claim.
    const live = new Set<string>();
    for (const { text } of modules()) {
      for (const entry of exportedFunctions(text)) live.add(entry.name);
    }
    for (const name of Object.keys(EXCEPTIONS)) {
      expect(live.has(name), `${name} is listed as an exception but is not exported`).toBe(true);
    }
  });

  it('holds every `read…` in readings.ts and nowhere else', () => {
    // The third verb is the memo, and a memo outside the leaf is a second cache
    // with a second lifetime — the thing E2 built one file to prevent.
    for (const { path, text } of modules()) {
      if (path === 'src/sim/readings.ts') continue;
      const strays = exportedFunctions(text)
        .map((entry) => entry.name)
        .filter((name) => /^read[A-Z]/.test(name));
      expect(strays, `${path} exports a read… that is not in readings.ts`).toEqual([]);
    }
    const readings = modules().find((entry) => entry.path === 'src/sim/readings.ts');
    expect(readings, 'readings.ts is not in the glob').toBeDefined();
    const memos = exportedFunctions(readings!.text)
      .map((entry) => entry.name)
      .filter((name) => /^read[A-Z]/.test(name));
    expect(memos.sort()).toEqual([
      'readCity',
      'readEmpire',
      'readEmpirePercents',
      // The Trade screen's whole subject, once per revision (batch R1): every
      // pair a caravan could join, gated, priced and paid.
      'readRoutes',
    ]);
  });

  it('makes every `explain…` return a list', () => {
    // Rule 5 in one assertion: an `explain…` that returned a number would be a
    // total computed beside its list rather than folded out of it.
    //
    // `explainCity` is the one that returns a *record around* its list — the
    // lines, their fold and the percent list that is not applied to them —
    // because steps 1–11 of `docs/yields.md` produce two artefacts and every
    // caller wants both. It is admitted by the shape of what it returns rather
    // than by name: an interface carrying a `lines:` array.
    const declarations = modules()
      .map((entry) => entry.text)
      .join('\n');
    const carriesLines = (type: string): boolean => {
      const at = declarations.indexOf(`export interface ${type} {`);
      if (at < 0) return false;
      const end = declarations.indexOf('\n}\n', at);
      return /\n {2}lines: /.test(declarations.slice(at, end === -1 ? undefined : end));
    };
    const offenders: string[] = [];
    for (const { path, text } of modules()) {
      for (const { name, signature } of exportedFunctions(text)) {
        if (!/^explain[A-Z]/.test(name)) continue;
        // One line, so a signature broken over five of them reads the same as
        // one written inline.
        const flat = signature.replace(/\s+/g, ' ').trimEnd();
        const returns = /\):\s*([A-Za-z0-9_[\]<>, |]+?)\s*$/.exec(flat)?.[1] ?? '';
        if (returns.endsWith('[]')) continue;
        if (carriesLines(returns)) continue;
        offenders.push(`${path}: ${name} returns ${returns || '(nothing declared)'}`);
      }
    }
    expect(offenders, 'an explain… that is not a list').toEqual([]);
  });

  it('has no second spelling of the readings the batch renamed', () => {
    // The eight names of §3d, by their own text, across the whole of `src`.
    const ALL = import.meta.glob('../../src/**/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;
    const GONE = [
      'cityQuote',
      'foldQuoteLines',
      'cityStageSums',
      'stageSumsFor',
      'centreYield',
      'tileYieldOf',
      'foldTileYield',
      'empireRateReading',
      'ledgerReading',
      'deckAggregate',
    ];
    // Comments stripped first: a docblock is allowed — and asked — to say what
    // a thing used to be called. What must be gone is the *call*.
    const code = (text: string): string =>
      text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const found: string[] = [];
    for (const [path, text] of Object.entries(ALL)) {
      const body = code(text);
      for (const name of GONE) {
        // Word-bounded, so `explainCentreYield` and `emptyCityYields` are not
        // read as their retired neighbours.
        if (new RegExp(`\\b${name}\\b`).test(body)) {
          found.push(`${path.replace('../../', '')}: ${name}`);
        }
      }
    }
    expect(found.sort(), 'a retired name is still written somewhere in src').toEqual([]);
  });
});
