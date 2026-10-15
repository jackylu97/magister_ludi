/**
 * The guide's copy, checked against the live rules.
 *
 * Principle 6 of `docs/plans/tutorial.md`: copy that states a number reads it
 * from data, and a sync test fails when a lesson names a retired system. The
 * guide that ships today is two modules: the opening walkthrough and its
 * one-time notes (`src/ui/tutorial.ts`), and the pamphlet (`src/ui/pamphlet.ts`).
 * This file holds both of them to three rules.
 *
 *   1. **No retired system is named.** The names come from data where the data
 *      has them: a bead kind whose every row is `retired: true` (feats,
 *      endeavours, quests and reckonings today) and a unit row marked retired
 *      (the augur). Two old player words have no data row to read them from,
 *      so they are listed by hand below with the reason.
 *   2. **No removed control is named.** The copy once sent players to buttons
 *      that the interface rework took away or renamed. A short hand list, since
 *      a control that no longer exists leaves nothing in the code to read.
 *   3. **The bead threshold comes from data.** The rendered notes and pamphlet
 *      state `BEAD_RULES.threshold` in words, and no string literal in either
 *      source types a bead count by hand. The source check is the one that
 *      matters: a figure typed into the copy that happens to match the data
 *      today passes every check on the rendered text, and goes stale the day
 *      the data is retuned.
 *
 * What is read: every string literal in the two sources, with comments skipped
 * and keyword refs reduced to their words. That covers the step and note
 * tables, the pamphlet's pages and captions, and the strings built inline, such
 * as the pamphlet overlay's foot note. The exported tables are also read as
 * they render, so a name or figure that arrives through an interpolation is
 * seen too.
 */

import { describe, expect, it } from 'vitest';

import { BEAD_DATA, BEAD_RULES } from '../../src/sim/beadData';
import { stripRefs } from '../../src/sim/statecraft';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { WAGER_RULES } from '../../src/sim/wagerData';
import { PAMPHLET_PAGES, pamphletEntry } from '../../src/ui/pamphlet';
import { BEAD_THRESHOLD, STEPS, TIPS, numberWords } from '../../src/ui/tutorial';
import { uiSource } from './sourceHelpers';

// --- what the guide says -----------------------------------------------------

/** The two modules the guide ships in. */
const GUIDE_FILES = ['tutorial.ts', 'pamphlet.ts'] as const;

/**
 * Every string literal in a TypeScript source, as the words it holds.
 *
 * Comments are skipped, and so are regular expressions (a `/` after an operator
 * or an opening bracket starts one, the heuristic `vocabulary.test.ts` uses).
 * A template's `${…}` interpolations are dropped, because an interpolation is
 * the permitted way to put a figure from data into the copy, and what this
 * reader is looking for is a figure typed by hand. This repeats the scanners in
 * `compendium.test.ts` and `vocabulary.test.ts` in a few lines rather than
 * importing them: importing a `.test.ts` file registers its tests a second time.
 */
function stringLiterals(source: string): string[] {
  const out: string[] = [];
  let previous = '';
  let index = 0;
  while (index < source.length) {
    const ch = source[index]!;
    const next = source[index + 1] ?? '';
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }
    if (ch === '/' && '(,=:[!&|?{};+*%<>~^'.includes(previous)) {
      let scan = index + 1;
      let inClass = false;
      while (scan < source.length && source[scan] !== '\n') {
        const c = source[scan];
        if (c === '\\') scan += 2;
        else if (c === '[') ((inClass = true), (scan += 1));
        else if (c === ']') ((inClass = false), (scan += 1));
        else if (c === '/' && !inClass) break;
        else scan += 1;
      }
      previous = '/';
      index = scan + 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let scan = index + 1;
      let text = '';
      while (scan < source.length) {
        const c = source[scan]!;
        if (c === '\\') {
          text += source[scan + 1] ?? '';
          scan += 2;
          continue;
        }
        if (c === ch) break;
        if (ch !== '`' && c === '\n') break;
        if (ch === '`' && c === '$' && source[scan + 1] === '{') {
          // Skip the interpolation, braces balanced, and keep reading the
          // template's own text after it.
          let depth = 1;
          scan += 2;
          while (scan < source.length && depth > 0) {
            if (source[scan] === '{') depth += 1;
            else if (source[scan] === '}') depth -= 1;
            scan += 1;
          }
          text += ' ';
          continue;
        }
        text += c;
        scan += 1;
      }
      out.push(text);
      previous = ch;
      index = scan + 1;
      continue;
    }
    if (ch.trim() !== '') previous = ch;
    index += 1;
  }
  return out;
}

/** Every string literal in both guide modules, refs reduced to their words. */
function literalCopy(): { file: string; text: string }[] {
  return GUIDE_FILES.flatMap((file) =>
    stringLiterals(uiSource(file)).map((text) => ({ file, text: stripRefs(text) })),
  );
}

/** The guide as it renders: both tables of the tutorial, the pamphlet's pages. */
function renderedCopy(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const step of STEPS) {
    out.push({ where: `step ${step.id}`, text: `${step.title}. ${step.body}` });
  }
  for (const tip of TIPS) {
    for (const page of tip.pages) {
      out.push({ where: `note ${tip.id}`, text: `${page.title}. ${page.body}` });
    }
  }
  for (const page of PAMPHLET_PAGES) {
    const words = [page.title, ...page.lines.map((line) => stripRefs(line))];
    if (page.panel !== undefined) words.push(page.panel.caption);
    out.push({ where: `pamphlet ${page.id}`, text: words.join(' ') });
  }
  const entry = pamphletEntry();
  out.push({ where: 'pamphlet entry', text: `${entry.name}. ${entry.eyebrow}` });
  return out;
}

// --- rule 1: retired systems -------------------------------------------------

/**
 * The bead kinds that are retired as a whole: every row of the kind carries
 * `retired: true`. "Every row" is the test, because a kind with some live rows
 * is still a live system (the grants keep the wager's four rows and the golden
 * bead beside their retired ones).
 */
function retiredBeadKinds(): string[] {
  return Object.entries(BEAD_DATA as unknown as Record<string, unknown>)
    .filter(([kind]) => kind !== 'rules')
    .filter(([, rows]) => {
      const list = Object.values(rows as Record<string, { retired?: boolean }>);
      return list.length > 0 && list.every((row) => row.retired === true);
    })
    .map(([kind]) => kind);
}

/** The retired unit rows' names, leaving out any name a live row still carries. */
function retiredUnitNames(): string[] {
  const live = new Set(
    UNIT_TYPE_IDS.filter((id) => unitDef(id).retired !== true).map((id) => unitDef(id).name),
  );
  return UNIT_TYPE_IDS.filter((id) => unitDef(id).retired === true)
    .map((id) => unitDef(id).name)
    .filter((name) => !live.has(name));
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The words the old copy used that no data row holds.
 *
 * The data names these systems by their kind keys (`endeavours`, `feats`), but
 * the copy described them in other words, and those words are what a stale line
 * would say again. "The Bead Race" stays: it is the live name of the win
 * condition, so it is removed before the "race" check runs.
 */
const OLD_WORDS: readonly { pattern: RegExp; why: string; allow?: RegExp }[] = [
  {
    pattern: /\braces?\b/i,
    why: 'the old copy called the endeavours "races"',
    allow: /\bBead Race\b/g,
  },
  { pattern: /\bfirsts? in the world\b/i, why: 'the feats, as the old copy described them' },
  { pattern: /\bworld firsts?\b/i, why: 'the feats, as the old copy described them' },
];

/** Every retired name, as a whole-word pattern with the reason it is retired. */
function retiredNames(): { pattern: RegExp; why: string; allow?: RegExp }[] {
  const names: { pattern: RegExp; why: string; allow?: RegExp }[] = [];
  for (const kind of retiredBeadKinds()) {
    // `feats` → "feat" or "feats".
    const stem = kind.endsWith('s') ? kind.slice(0, -1) : kind;
    names.push({
      pattern: new RegExp(`\\b${escaped(stem)}s?\\b`, 'i'),
      why: `every row of data/beads.json's ${kind} is retired`,
    });
  }
  for (const name of retiredUnitNames()) {
    names.push({
      pattern: new RegExp(`\\b${escaped(name)}s?\\b`, 'i'),
      why: `the ${name} is a retired row in data/units.json`,
    });
  }
  return [...names, ...OLD_WORDS];
}

const RETIRED_NAMES = retiredNames();

/** The retired names one line says, each with its reason. */
function retiredNamesIn(text: string): string[] {
  const found: string[] = [];
  for (const name of RETIRED_NAMES) {
    const checked = name.allow === undefined ? text : text.replace(name.allow, ' ');
    if (name.pattern.test(checked)) found.push(`${name.pattern.source} (${name.why})`);
  }
  return found;
}

describe('the guide names no retired system', () => {
  it('reads the retired names from data', () => {
    const kinds = retiredBeadKinds();
    expect(kinds.length).toBeGreaterThan(0);
    // A kind with live rows beside retired ones is still live.
    expect(kinds).not.toContain('grants');
    const units = retiredUnitNames();
    expect(units.length).toBeGreaterThan(0);
    for (const name of units) {
      const ids = UNIT_TYPE_IDS.filter((id) => unitDef(id).name === name);
      expect(ids.every((id) => unitDef(id).retired === true), name).toBe(true);
    }
  });

  it('reads both modules, and the strings built inline as well as the tables', () => {
    const literals = literalCopy();
    const reads = (file: string, words: string): boolean =>
      literals.some((line) => line.file === file && line.text.includes(words));
    expect(reads('tutorial.ts', 'Standings tab')).toBe(true);
    // The overlay's foot note is built inside `createPamphletOverlay`, not in a table.
    expect(reads('pamphlet.ts', 'Put it away freely')).toBe(true);
  });

  it('says no retired name in any string of either module', () => {
    const wrong: string[] = [];
    for (const line of literalCopy()) {
      for (const said of retiredNamesIn(line.text)) {
        wrong.push(`${line.file}: ${said} — ${line.text.slice(0, 90)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('says no retired name in the copy as it renders', () => {
    const wrong: string[] = [];
    for (const line of renderedCopy()) {
      for (const said of retiredNamesIn(line.text)) {
        wrong.push(`${line.where}: ${said} — ${line.text.slice(0, 90)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('would catch the old bead note', () => {
    // The check itself, held still against the lines this batch replaced.
    expect(retiredNamesIn('Feats: world firsts, always in play.')).not.toEqual([]);
    expect(retiredNamesIn('Races: a project every empire can build.')).not.toEqual([]);
    expect(retiredNamesIn('Quests: deeds you go and do.')).not.toEqual([]);
    expect(retiredNamesIn('Reckonings: everyone is measured at once.')).not.toEqual([]);
    expect(retiredNamesIn('Faith pays for augurs and prophets.')).not.toEqual([]);
    expect(retiredNamesIn('Points for doing things first in the world.')).not.toEqual([]);
    // And lets the live name of the win condition through.
    expect(retiredNamesIn('The Bead Race')).toEqual([]);
  });
});

// --- rule 2: removed controls ------------------------------------------------

/**
 * Controls the copy used to name that are gone or renamed. Nothing in the code
 * records a removed button, so this list is kept by hand.
 */
const REMOVED_CONTROLS: readonly { pattern: RegExp; why: string }[] = [
  {
    pattern: /\bbook button\b/i,
    why: 'the Compendium button left the top bar in batch UX1; it opens from the menu',
  },
  {
    pattern: /\bReligion screen\b/i,
    why: 'the faith screen is named Faith since the interface rework (2026-10-15)',
  },
  {
    pattern: /\bStart Route\b/i,
    why: 'the caravan panel lost its Start Route button in batch R2; routes are sent from the Trade sheet',
  },
];

describe('the guide names no removed control', () => {
  it('says none of them in any string of either module', () => {
    const wrong: string[] = [];
    for (const line of literalCopy()) {
      for (const control of REMOVED_CONTROLS) {
        if (!control.pattern.test(line.text)) continue;
        wrong.push(
          `${line.file}: ${control.pattern.source} (${control.why}) — ${line.text.slice(0, 90)}`,
        );
      }
    }
    expect(wrong).toEqual([]);
  });
});

// --- rule 3: the bead threshold ----------------------------------------------

/** Every whole number the guide can write in words, mapped back to its value. */
const WORD_VALUES = new Map<string, number>(
  Array.from({ length: 100 }, (_, value) => [numberWords(value), value] as const),
);

/**
 * A count of beads: a number, in digits or in words, right before "bead" or
 * "beads". "Twenty-one" and "twenty one" are both read.
 */
const BEAD_COUNT = new RegExp(
  `\\b(\\d+|(?:${[...WORD_VALUES.keys()].map(escaped).join('|')})(?:[\\s-](?:one|two|three|four|five|six|seven|eight|nine))?)\\s+beads?\\b`,
  'gi',
);

/** The bead counts one line states, as numbers. */
function beadCountsIn(text: string): number[] {
  return [...text.matchAll(BEAD_COUNT)].map((match) => {
    const said = match[1]!.toLowerCase().replace(/\s+/, '-');
    return /^\d+$/.test(said) ? Number(said) : (WORD_VALUES.get(said) ?? Number.NaN);
  });
}

describe('the guide states the bead threshold from data', () => {
  it('reads the same figure the simulation enforces', () => {
    expect(BEAD_THRESHOLD).toBe(BEAD_RULES.threshold);
  });

  it('writes whole numbers in words', () => {
    expect(numberWords(0)).toBe('zero');
    expect(numberWords(7)).toBe('seven');
    expect(numberWords(13)).toBe('thirteen');
    expect(numberWords(20)).toBe('twenty');
    expect(numberWords(21)).toBe('twenty-one');
    expect(numberWords(99)).toBe('ninety-nine');
    // Out of range comes back as digits, which the copy tests then refuse.
    expect(numberWords(100)).toBe('100');
  });

  it('says the threshold in the bead note and on the pamphlet page about winning', () => {
    const phrase = `${numberWords(BEAD_RULES.threshold)} beads`;
    const note = TIPS.find((tip) => tip.id === 'beads');
    expect(note).toBeDefined();
    expect(note!.pages.map((page) => page.body).join(' ')).toContain(phrase);
    const winning = PAMPHLET_PAGES.find((page) => page.id === 'winning');
    expect(winning).toBeDefined();
    expect(winning!.lines.map((line) => stripRefs(line)).join(' ')).toContain(phrase);
  });

  it('types no bead count into any string of either module', () => {
    // A bead count in the copy must arrive through an interpolation from data.
    // A count typed into a literal fails here even if it matches the data today.
    const wrong: string[] = [];
    for (const line of literalCopy()) {
      if (beadCountsIn(line.text).length === 0) continue;
      wrong.push(`${line.file}: ${line.text.slice(0, 90)}`);
    }
    expect(wrong).toEqual([]);
  });

  it('states only bead counts that the data holds, as the copy renders', () => {
    // The threshold, and what a met wager pays (`data/wagers.json`).
    const held = new Set([BEAD_RULES.threshold, WAGER_RULES.stakeBeads, WAGER_RULES.otherBeads]);
    const wrong: string[] = [];
    let counted = 0;
    for (const line of renderedCopy()) {
      for (const count of beadCountsIn(line.text)) {
        counted += 1;
        if (held.has(count)) continue;
        wrong.push(`${line.where}: ${count} beads — ${line.text.slice(0, 90)}`);
      }
    }
    expect(wrong).toEqual([]);
    // Not vacuous: the threshold is stated at least twice, once in each module.
    expect(counted).toBeGreaterThanOrEqual(2);
  });

  it('would catch a count typed by hand', () => {
    expect(beadCountsIn('Hold twenty beads and you may begin.')).toEqual([20]);
    expect(beadCountsIn('Hold 20 beads.')).toEqual([20]);
    expect(beadCountsIn('a rod of twenty-one beads')).toEqual([21]);
    expect(beadCountsIn('a rod of twenty one beads')).toEqual([21]);
    expect(beadCountsIn('Hold  beads to begin.')).toEqual([]);
    expect(beadCountsIn('A few things hand a bead over.')).toEqual([]);
    // A figure interpolated from data passes; the same figure typed does not.
    const literals = stringLiterals(
      'const a = `Hold ${numberWords(n)} beads`; const b = \'Hold seven beads\';',
    );
    expect(literals.filter((text) => beadCountsIn(text).length > 0)).toEqual(['Hold seven beads']);
  });
});
