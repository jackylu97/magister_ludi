/**
 * Reading `src/` as text, said once.
 *
 * Most of this suite cannot mount a DOM (`controls.test.ts`'s note), and most of
 * what it wants to assert is a *structural* fact anyway — which function reads
 * which field, which list has which members, which rule is written in one place
 * rather than four. Those are read off the source through Vite's `?raw` glob,
 * and by the time the simplification audit counted them the same three helpers
 * had been retyped in a dozen files: the glob plus a `source(name)` that finds a
 * module in it, a brace-matched `body of one declaration`, and a `between(a, b)`
 * that slices a file between two landmarks (`docs/audit/simplify.md` §2 and §5).
 *
 * They live in a **non-test module** for the rule CLAUDE.md gives: importing a
 * `.test.ts` file re-registers its tests, so a helper two suites share cannot
 * live in either of them.
 *
 * One glob for everything under `src/ui/` plus `main.ts`, `index.html` and the
 * stylesheet, rather than a narrow glob per suite. A narrow glob is a second
 * list to keep true — three suites already globbed `{main,ui/controls,…}` in
 * three different shapes — and an eagerly-globbed string costs nothing a suite
 * does not read.
 *
 * What does **not** belong here is an assertion. These return text; the reason a
 * given slice must contain a given phrase is the suite's own, and it belongs in
 * the suite beside the phrase.
 */

const SOURCES = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/{main.ts,style.css}', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
  ...(import.meta.glob('../../index.html', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
};

/**
 * One module's source by its file name — `'techTree.ts'`, `'main.ts'`,
 * `'style.css'`, `'index.html'`.
 *
 * Throws rather than answering `''` when the name is not in the glob: an
 * assertion against an empty string passes for `not.toContain` and fails
 * mysteriously for everything else, which is the worst of both.
 */
export function uiSource(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${name}`));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`source not globbed, or empty: ${name}`);
  }
  return text;
}

/**
 * The body of one declaration, brace-matched from its opening line.
 *
 * Deliberately literal and deliberately brace-matched: an assertion that merely
 * searched a whole file for a token would pass on a mention in a comment, and
 * half of what these suites check is *which* function does a thing.
 */
export function braceBody(source: string, declaration: string): string {
  const at = source.indexOf(declaration);
  if (at < 0) throw new Error(`no "${declaration}" in this source`);
  let depth = 0;
  for (let index = source.indexOf('{', at); index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(at, index + 1);
    }
  }
  throw new Error(`"${declaration}" is never closed`);
}

/**
 * The text between two landmarks, both of which must exist.
 *
 * For the facts that are about a *region* rather than a function — an interface
 * declaration, the block between two banner comments.
 */
export function between(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  if (start < 0) throw new Error(`no "${from}" in this source`);
  const end = source.indexOf(to, start + from.length);
  if (end < 0) throw new Error(`no "${to}" after "${from}"`);
  return source.slice(start, end);
}
