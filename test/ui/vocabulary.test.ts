/**
 * **Two words the game does not say any more.**
 *
 * The user's ruling of 2026-09-09 (`docs/flags.md` item (ppp) 7): *"Let's also
 * use happiness and authority as the correct terminology instead of writ and
 * cheer, its confusing to players to use multiple words."* The two meters had
 * three names each — the label on the chip, the word on a card, the word in a
 * note — and a first-time player reading "your writ grows thin" beside an
 * "Authority" chip has no way to know they are the same number.
 *
 * So: **authority** and **happiness**, in exactly those words, everywhere a
 * player reads. This is the register that keeps it true.
 *
 * What is swept, and what is not
 * ------------------------------
 * The sweep reads *string literals and templates* out of the surfaces listed in
 * `SURFACES`, and the *prose fields* of every data row. Deliberately not:
 *
 *   · **comments and docblocks.** They are the files' own voice, written for the
 *     next person to read the code, and CLAUDE.md rule 6 asks them to explain
 *     *why* rather than to match a chip's label. `stringsIn` skips them.
 *   · **identifiers.** The ruling says so outright — `puppetWrit` is code, and a
 *     variable named `writ` beside `tierPercent` is a local. Only quoted text is
 *     read, so an identifier is invisible here by construction.
 *   · **`name`, `flavor` and `epigram`.** A card *called* The Elders' Writ is a
 *     title the user named (`docs/flags.md` item (xx)), not the meter's word;
 *     flavour is the one place rule 7 lets the game be literary, and it is
 *     always labelled Flavour on the surface that prints it. Rules prose is
 *     `note` / `deferred` / `summary` / `text`, and that is what is swept.
 *
 * **The register is the point.** A new player-facing surface joins this sweep by
 * being listed in `SURFACES`, and `it('names the surfaces it read')` fails if a
 * pattern resolves to nothing — so a file moved out from under the glob is a red
 * test rather than a silent gap.
 */

import { describe, expect, it } from 'vitest';

/** The retired words, each with what it became. Case-insensitive, whole words. */
const RETIRED: readonly { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bwrits?\b/i, replacement: 'authority' },
  { pattern: /\bcheer(s|ful|fully)?\b/i, replacement: 'happiness' },
  { pattern: /\bcontentment\b/i, replacement: 'happiness' },
];

/**
 * **The surfaces a player reads**, by glob, each with why it is here. Adding a
 * surface is adding a row; nothing else in this file names a file.
 */
const SURFACES: readonly { glob: string; why: string }[] = [
  { glob: 'src/ui/*.ts', why: 'every screen, panel, sheet, chip and hover card' },
  { glob: 'src/art/*.ts', why: 'the dock and meter marks — their labels and tooltips' },
  {
    glob: 'src/sim/statecraft/describers.ts',
    why: 'the word tables every card, belief, rite and legacy is printed through',
  },
  {
    glob: 'src/sim/meters.ts',
    why: 'the two meters write their own ledger lines — "Palace", "Ur · puppet"',
  },
  {
    glob: 'src/sim/resourceEffects.ts',
    why: 'a luxury’s ledger line names what it pays — "Amber · happiness"',
  },
  {
    glob: 'src/sim/statecraft/evaluator.ts',
    why: 'a card’s ledger line does the same, through the one evaluator',
  },
  { glob: '*.html', why: 'the root pages’ own markup — headings, hints, aria labels' },
];

/** Everything the globs above resolve to, as raw text, path → source. */
const SOURCES: Record<string, string> = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/art/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
  ...(import.meta.glob(
    '../../src/sim/{meters.ts,resourceEffects.ts,statecraft/describers.ts,statecraft/evaluator.ts}',
    { eager: true, query: '?raw', import: 'default' },
  ) as Record<string, string>),
};

/** The root pages' markup, path → source. */
const PAGES: Record<string, string> = import.meta.glob('../../*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Every data deck, as raw text, path → source. */
const DATA: Record<string, string> = import.meta.glob('../../data/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/**
 * The fields that carry **rules prose** — what a row says a thing does, in a
 * first-time player's terms (CLAUDE.md rule 7). `name`, `flavor` and `epigram`
 * are excluded on purpose; see the module docblock.
 */
const PROSE_FIELDS: readonly string[] = ['note', 'deferred', 'summary', 'text'];

/**
 * **One file another agent holds**, and the reason, so the exception is a row
 * here rather than a hole in the sweep.
 *
 * `data/beads.json` is batch Q1's fence this week and two of its `text` rows
 * still say "contentment" ("a lasting step of contentment", on the Games and the
 * Founders deeds). They are named in K1's report for Q1 to take; this row and
 * its file come out together.
 */
const PENDING: readonly { file: string; why: string }[] = [
  { file: 'beads.json', why: 'batch Q1 holds data/beads.json; two `text` rows still say the old word' },
];

/**
 * Every quoted string and template in a TypeScript source, with comments and
 * regular expressions skipped.
 *
 * Hand-rolled rather than parsed, for the reason every source-reading test in
 * this suite is: there is no compiler in this tier, and the question — "does any
 * text this file *prints* say the word" — is answerable by walking the quotes.
 * Comments go first so an apostrophe in a docblock cannot open a string, and a
 * regex literal is skipped by the usual heuristic (a `/` after an operator or an
 * opening bracket starts one) so a character class holding a quote cannot
 * either.
 */
export function stringsIn(source: string): string[] {
  const out: string[] = [];
  /** The last character that was neither whitespace nor part of a comment. */
  let previous = '';
  let index = 0;
  while (index < source.length) {
    const ch = source[index];
    if (ch === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (ch === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }
    if (ch === '/' && '(,=:[!&|?{};+*%<>~^'.includes(previous)) {
      // A regular expression. Skip to its unescaped closing slash.
      let scan = index + 1;
      let inClass = false;
      while (scan < source.length) {
        const c = source[scan];
        if (c === '\\') scan += 2;
        else if (c === '[') (inClass = true), (scan += 1);
        else if (c === ']') (inClass = false), (scan += 1);
        else if (c === '/' && !inClass) break;
        else if (c === '\n') break;
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
        const c = source[scan];
        if (c === '\\') {
          text += source[scan + 1] ?? '';
          scan += 2;
          continue;
        }
        if (c === ch) break;
        // A single- or double-quoted string never spans a line; a lone
        // apostrophe that reached here is not one, and bailing keeps the walk
        // in step with the code rather than swallowing the rest of the file.
        if (ch !== '`' && c === '\n') break;
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

/** Every prose string in one parsed data deck, with the path that reached it. */
function proseIn(value: unknown, at = ''): { where: string; text: string }[] {
  const found: { where: string; text: string }[] = [];
  const walk = (node: unknown, path: string, prose: boolean): void => {
    if (typeof node === 'string') {
      if (prose) found.push({ where: path, text: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((row, at) => walk(row, `${path}[${at}]`, prose));
      return;
    }
    if (node !== null && typeof node === 'object') {
      for (const [key, row] of Object.entries(node as Record<string, unknown>)) {
        walk(row, path === '' ? key : `${path}.${key}`, prose || PROSE_FIELDS.includes(key));
      }
    }
  };
  walk(value, at, false);
  return found;
}

/** The file name at the end of a glob key — `'captureSheet.ts'`, `'beads.json'`. */
function fileOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Every retired word in one piece of text, named. */
function offences(text: string): string[] {
  return RETIRED.filter((word) => word.pattern.test(text)).map(
    (word) => `${word.pattern.source} (say "${word.replacement}")`,
  );
}

describe('the two retired words', () => {
  it('names the surfaces it read, and every one of them resolves', () => {
    // A glob that resolves to nothing is the failure this register exists to
    // prevent: the sweep would pass on a file it never opened.
    expect(SURFACES.length).toBeGreaterThan(0);
    const read = Object.keys(SOURCES).map(fileOf);
    for (const named of [
      'captureSheet.ts',
      'cityPanel.ts',
      'topBar.ts',
      'unitPanel.ts',
      'cardStamp.ts',
      'compendium.ts',
      'compendiumShelves.ts',
      'compendiumText.ts',
      'figures.ts',
      'meterMark.ts',
      'controls.ts',
      'meterMarks.ts',
      'dockMarks.ts',
      'describers.ts',
      'meters.ts',
      'resourceEffects.ts',
      'evaluator.ts',
    ]) {
      expect(read, `${named} is a surface a player reads`).toContain(named);
    }
    expect(Object.keys(PAGES).map(fileOf)).toContain('index.html');
    expect(Object.keys(DATA).length).toBeGreaterThan(10);
    for (const named of ['statecraft.json', 'buildings.json', 'techs.json', 'religion.json']) {
      expect(Object.keys(DATA).map(fileOf), named).toContain(named);
    }
  });

  it('says neither word on any surface a player reads', () => {
    const wrong: string[] = [];
    for (const [path, source] of Object.entries(SOURCES)) {
      for (const text of stringsIn(source)) {
        for (const said of offences(text)) {
          wrong.push(`${fileOf(path)}: ${said} — ${text.slice(0, 90)}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  /**
   * The markup a page ships with — a heading, a hint under a popover, an aria
   * label. HTML comments go first, the way a docblock does above; nothing else
   * on these pages is anything but words a player reads.
   */
  it('says neither word in any root page’s markup', () => {
    const wrong: string[] = [];
    for (const [path, raw] of Object.entries(PAGES)) {
      const markup = raw.replace(/<!--[\s\S]*?-->/g, ' ');
      for (const line of markup.split('\n')) {
        for (const said of offences(line)) wrong.push(`${fileOf(path)}: ${said} — ${line.trim()}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('says neither word in any data row’s prose', () => {
    const held = new Set(PENDING.map((row) => row.file));
    const wrong: string[] = [];
    for (const [path, raw] of Object.entries(DATA)) {
      const file = fileOf(path);
      if (held.has(file)) continue;
      for (const line of proseIn(JSON.parse(raw))) {
        for (const said of offences(line.text)) {
          wrong.push(`${file} ${line.where}: ${said} — ${line.text.slice(0, 90)}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  /**
   * The exception is a row with a reason and a file that exists, so it cannot
   * quietly outlive the batch that owns it.
   */
  it('holds its exceptions by name, with the reason', () => {
    const files = new Set(Object.keys(DATA).map(fileOf));
    for (const row of PENDING) {
      expect(files, row.file).toContain(row.file);
      expect(row.why.length).toBeGreaterThan(20);
    }
  });

  /** The scanner itself, since everything above is only as true as it is. */
  it('reads quotes and skips comments, regexes and identifiers', () => {
    expect(stringsIn("const writ = 1; // the writ\nconst a = 'said aloud';")).toEqual([
      'said aloud',
    ]);
    expect(stringsIn("/** the writ */ const b = `a ${x} template`;")).toEqual(['a ${x} template']);
    expect(stringsIn("const c = /['\"]/; const d = 'after';")).toEqual(['after']);
    expect(offences('It asks less of your writ')).toHaveLength(1);
    expect(offences('It asks less of your authority')).toHaveLength(0);
    expect(offences('rewritten, written, writer')).toHaveLength(0);
  });
});
