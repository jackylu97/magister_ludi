/**
 * The three grains are scalar noise fields, not pictures. Every shader that
 * samples one reads the red channel — the pigment and paper taps write `.r`, and
 * three's bump chunk reads `.x` — so they are shipped as one-channel PNGs
 * (`scripts/terrain-study/build_grains.mjs`) and uploaded with `RedFormat`.
 *
 * That is a two-sided rule, and only one side is a file on disk. The bytes are
 * the build script's own business: it re-decodes what it wrote and refuses to
 * ship a grain whose red channel moved, and `--check` re-derives the shipped
 * PNGs from the authored RGB sources in `grain-source/`. This test owns the
 * other side — that the renderer still asks for one channel, and that no shader
 * has started reading a channel a one-channel upload does not carry. A grain
 * sampled as `.g` would be black everywhere and nothing else would notice.
 */
import { describe, expect, it } from 'vitest';

const source = (pattern: string) => {
  const files = import.meta.glob('../../src/**/*.{js,ts}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const found = Object.entries(files).find(([path]) => path.endsWith(pattern));
  if (!found) throw new Error(`no source matching ${pattern}`);
  return found[1];
};

const GRAINS = ['mineral-grain', 'flocking-grain', 'gouache-grain'];
/** The uniform names the three grains are bound to in the painted programs. */
const SAMPLERS = ['paintGrain', 'studyMineral', 'studyFlock'];

const PAINTED_SOURCES = (() => {
  const files = import.meta.glob('../../src/**/*.{js,ts}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  return Object.entries(files);
})();

describe('the grains are one channel', () => {
  it('names all three grain files and asks for one channel each', () => {
    const look = source('render3d/paintedLook.js');
    for (const grain of GRAINS) expect(look, grain).toContain(`'${grain}'`);
    // One loop, one format: a grain added beside these gets the same upload.
    expect(look).toMatch(/grain\.format\s*=\s*T\.RedFormat/);
    const uploads = look.match(/\.format\s*=\s*T\.RedFormat/g) ?? [];
    expect(uploads).toHaveLength(1);
    expect(look.slice(look.indexOf('grainRequests'), look.indexOf('const mineralUniform'))).toContain('RedFormat');
  });

  /**
   * The study page has its own upload site, and it loads the same three files.
   * It went on asking for four channels after the grains became one, which is
   * not a crash and not a visible error — the page simply stops looking like the
   * board it exists to study.
   */
  it('uploads the study page\'s three grains the same way', () => {
    const study = source('terrainStudy/main.js');
    for (const grain of GRAINS) expect(study, grain).toContain(`'/terrain-study/${grain}.png'`);
    const uploads = study.match(/\.format\s*=\s*T\.RedFormat/g) ?? [];
    expect(uploads).toHaveLength(GRAINS.length);
  });

  it('samples every grain on the red channel alone', () => {
    const taps: string[] = [];
    for (const [path, text] of PAINTED_SOURCES) {
      for (const sampler of SAMPLERS) {
        const pattern = new RegExp(`texture2D\\(\\s*${sampler}\\s*,`, 'g');
        for (const match of text.matchAll(pattern)) {
          // Walk to this call's own closing parenthesis, then read the swizzle.
          let depth = 0, at = match.index + match[0].indexOf('(');
          for (; at < text.length; at++) {
            if (text[at] === '(') depth++;
            else if (text[at] === ')' && --depth === 0) break;
          }
          taps.push(`${path.split('/').pop()}:${sampler}${text.slice(at + 1, at + 3)}`);
        }
      }
    }
    expect(taps.length).toBeGreaterThanOrEqual(4);
    for (const tap of taps) expect(tap, tap).toMatch(/\.r$/);
  });

  it('gives a bump map nothing but a grain', () => {
    for (const [path, text] of PAINTED_SOURCES) {
      for (const match of text.matchAll(/bumpMap\s*[:=]\s*([A-Za-z0-9_.]+)/g))
        expect(match[1], `${path} bumpMap`).toMatch(/[Mm]ineral|[Ff]lock/);
    }
  });
});
