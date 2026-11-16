/**
 * The display face's baseline correction (batch SS1b, `src/displayFace.css`).
 *
 * Newsreader puts its capitals about 0.1 em higher in a line box than
 * Instrument Serif did, and every padding in the interface was tuned for the
 * old face. The fix is one declaration of the face with `ascent-override` and
 * `descent-override`, named first in every page's `--face-display`. These tests
 * read the stylesheets, so the correction cannot be dropped from one page or
 * left behind when a face is added.
 */
import { describe, expect, it } from 'vitest';

const SHEETS = import.meta.glob(
  [
    '../../src/displayFace.css',
    '../../src/style.css',
    '../../src/abacusSpike/style.css',
    '../../src/arenaPage/style.css',
    '../../src/mapgenPage/style.css',
    '../../src/piecesGallery/style.css',
    '../../src/spectate/style.css',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

function sheet(tail: string): string {
  const found = Object.entries(SHEETS).find(([path]) => path.endsWith(tail));
  if (found === undefined) throw new Error(`displayFace test: no stylesheet ends with ${tail}`);
  return found[1];
}

/** The body of every `@font-face` rule in a stylesheet. */
function fontFaces(css: string): string[] {
  return Array.from(css.matchAll(/@font-face\s*\{([^}]*)\}/g), (match) => match[1]!);
}

const PAGE_SHEETS = [
  'src/style.css',
  'src/abacusSpike/style.css',
  'src/arenaPage/style.css',
  'src/mapgenPage/style.css',
  'src/piecesGallery/style.css',
  'src/spectate/style.css',
];

describe('the display face', () => {
  const faces = fontFaces(sheet('src/displayFace.css'));

  it('declares the roman and the italic in all three ranges Google serves', () => {
    expect(faces).toHaveLength(6);
    for (const style of ['normal', 'italic']) {
      expect(faces.filter((body) => body.includes(`font-style: ${style};`))).toHaveLength(3);
    }
    for (const body of faces) {
      expect(body).toContain("font-family: 'Newsreader Centred';");
      expect(body).toMatch(/src: url\(https:\/\/fonts\.gstatic\.com\/s\/newsreader\//);
    }
  });

  it('moves the baseline to where the old face had it, and only that', () => {
    // Ascent minus descent is 0.68 em: Instrument Serif's 0.99 minus 0.31.
    for (const body of faces) {
      expect(body).toContain('ascent-override: 94%;');
      expect(body).toContain('descent-override: 26%;');
      expect(body).toContain('line-gap-override: 0%;');
      expect(body).not.toContain('size-adjust');
    }
  });

  it.each(PAGE_SHEETS)('is the first face %s names, with Google’s Newsreader behind it', (path) => {
    const css = sheet(path);
    expect(css).toMatch(/@import '\.{1,2}\/displayFace\.css';/);
    const stack = css.match(/--face-display:\s*([^;]+);/);
    expect(stack?.[1]).toMatch(/^'Newsreader Centred', 'Newsreader', /);
    // An @import is read only before every other rule.
    const firstRule = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    expect(firstRule.startsWith('@import')).toBe(true);
  });
});
