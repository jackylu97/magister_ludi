/**
 * `data/mapgen.json` ↔ `docs/mapgen.md`: every knob the generator reads is a
 * knob the reference names.
 *
 * The `statecraftDocSync` pattern one system over, and it exists for that test's
 * reason: `docs/mapgen.md` documents the sheet, a knob added in one place and
 * not the other is a reference that lies, and the only reliable way to keep two
 * files in step is to fail the build when they are not. The direction that
 * matters is data → doc — a new number nobody wrote down — and the two tables
 * at the foot of the reference are where it is written.
 *
 * A key is "named" when it appears in backticks, either whole or as the head of
 * a dotted path (`luxuryCopiesPerKind.min` names `luxuryCopiesPerKind`), which
 * is how the reference already prints the one nested row.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import mapgenJson from '../../data/mapgen.json';

/**
 * `node:fs` behind a **variable** specifier, `techDocSync.test.ts`'s bargain and
 * for its reason: the project's type surface stays `vite/client` alone.
 */
const FS_SPECIFIER = 'node:fs';

interface MinimalFs {
  readFileSync(path: string, encoding: string): string;
}

const DOC_PATH = new URL('../../docs/mapgen.md', import.meta.url).pathname;

let DOC = '';
beforeAll(async () => {
  const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs;
  DOC = fs.readFileSync(DOC_PATH, 'utf8');
});

/**
 * Every block of the sheet whose keys the reference tabulates.
 *
 * `veins` is deliberately absent: pass 8 is documented in its own module and its
 * two keys have never been named here, so listing it would be this test failing
 * for a gap it did not find. A block joins this list when the reference gains
 * its table, and never the other way round.
 */
const BLOCKS = ['starts', 'resources', 'rivers', 'coast', 'lakes'] as const;

function names(doc: string, key: string): boolean {
  return doc.includes(`\`${key}\``) || doc.includes(`\`${key}.`);
}

describe('the mapgen reference', () => {
  for (const block of BLOCKS) {
    it(`names every knob in ${block}`, () => {
      const rows = (mapgenJson as unknown as Record<string, Record<string, unknown>>)[block];
      expect(rows).toBeTruthy();
      const missing = Object.keys(rows!).filter((key) => !names(DOC, key));
      expect(`${block}: ${missing.join(', ')}`).toBe(`${block}: `);
    });
  }

  it('names the three stages a leader biases the world in', () => {
    // The section the two new knobs hang off. A reference that carries the
    // knobs and not the rule is a reference nobody can read them with.
    expect(DOC).toContain("The leaders' three stages");
    for (const key of ['startBiasRadius', 'startFurnishRadius', 'biasCap']) {
      expect(names(DOC, key)).toBe(true);
    }
  });
});
