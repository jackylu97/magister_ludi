/**
 * The painted look's performance knobs — the register.
 *
 * CLAUDE.md: "code holds algorithms, never tuned constants". The shadow map
 * sizes, the LOD band and the whole of the contact pass used to be literals
 * sitting in `paintedLook.js`, `paintedBoard.js` and `terrainStudy/lighting.js`,
 * which meant a weak device could not be dialled down without an edit to the
 * renderer. They are rows of `data/view3d.json` now, and this is the test that
 * keeps the sheet and the source honest about each other: a row nothing reads
 * is a knob that does nothing, and a read of a row that is not there is
 * `undefined` reaching three.js as `NaN`.
 */

import { describe, expect, it } from 'vitest';

import viewJson from '../../data/view3d.json';
import { VIEW3D } from '../../src/render3d/lookData';

// A row is usually a plain number; `lod.distantCells` is a small table of them,
// one entry per prop family, and the register cares about the row names either way.
const SHEET = viewJson.painted as Record<string, Record<string, unknown>>;

/**
 * Every renderer source, as text — through Vite's raw glob rather than
 * `node:fs`, the way the other source-reading registers here do it, because the
 * project carries no node typings.
 */
const SOURCES = {
  ...import.meta.glob('../../src/render3d/**/*.{ts,js}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../../src/terrainStudy/**/*.{ts,js}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../../src/ui/**/*.ts', { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>;

function sources(): string[] {
  return Object.entries(SOURCES)
    .filter(([path]) => !path.endsWith('lookData.ts') && !path.endsWith('.d.ts'))
    .map(([, text]) => text);
}

function fileText(path: string): string {
  const found = Object.entries(SOURCES).find(([key]) => key.endsWith(path));
  expect(`${path}: ${found !== undefined}`).toBe(`${path}: true`);
  return found![1];
}

/** What the source actually reads, group by group — through an alias or straight. */
function readsInSource(): Map<string, Set<string>> {
  const reads = new Map<string, Set<string>>();
  const note = (group: string, leaf: string): void => {
    if (!reads.has(group)) reads.set(group, new Set());
    reads.get(group)!.add(leaf);
  };
  for (const text of sources()) {
    if (!text.includes('VIEW3D.painted')) continue;
    for (const match of text.matchAll(/VIEW3D\.painted\.(\w+)/g)) note(match[1]!, '');
    for (const match of text.matchAll(/VIEW3D\.painted\.(\w+)\.(\w+)/g)) note(match[1]!, match[2]!);
    // The common shape is a hoisted alias — `const knobs = VIEW3D.painted.contact`
    // — and every `knobs.thing` after it is a read of that group.
    for (const match of text.matchAll(/(?:const|let)\s*(\w+)\s*=\s*VIEW3D\.painted\.(\w+)/g)) {
      const [, alias, group] = match;
      for (const use of text.matchAll(new RegExp(`\\b${alias}\\.(\\w+)`, 'g'))) note(group!, use[1]!);
    }
  }
  return reads;
}

describe('the painted performance knobs', () => {
  const reads = readsInSource();

  it('parses the whole sheet into VIEW3D', () => {
    expect(VIEW3D.painted).toEqual(SHEET);
  });

  it('is read group for group, with nothing in the sheet unread', () => {
    expect([...reads.keys()].sort()).toEqual(Object.keys(SHEET).sort());
    for (const [group, rows] of Object.entries(SHEET)) {
      const used = [...(reads.get(group) ?? [])].filter(Boolean).sort();
      expect(`${group}: ${used.join(',')}`).toBe(`${group}: ${Object.keys(rows).sort().join(',')}`);
    }
  });

  it('ships exactly the figures the literals held', () => {
    // That batch moved the numbers out of the code; it changed none of them.
    // `lod.distantCells` arrived later and held no literal: it is the grid the
    // overview's stand-in sculpts are clustered on, one entry per prop family.
    // `fog` arrived with the shadowed treatment and carries the figures the
    // user dialled in on the four-way review — `docs/plans/painted-fog-study.md`
    // — including two that are palette *names* rather than inks.
    expect(SHEET).toEqual({
      shadows: { staticMapSize: 8192, counterMapSize: 2048, counterCoverage: 0.1 },
      lod: { nearPixels: 25, farPixels: 29, distantCells: { groves: { x: 2, y: 3, z: 2 } } },
      contact: {
        resolution: 512, radius: 0.1, thickness: 0.25, distanceExponent: 2, samples: 12,
        denoiseRadius: 4, denoiseDepthPhi: 2, denoiseNormalPhi: 6,
        renderScale: 0.5, scaledDenoiseRadius: 2,
        blendIntensity: 0.32, paintedBlendIntensity: 0.12,
        fadeStartPixels: 1.5, fadeRangePixels: 1.5,
      },
      fog: {
        paper: 'cream', ink: 'inkBlue',
        sunFalloff: 0.5, revealMs: 300,
        shadowedSun: 0.35, shadowedCool: 0.22, shadowedShade: 0.88,
        chartRule: 0.22, ruleWidth: 0.055,
        chartLift: 0.055, chartSea: 'teal', chartSeaMix: 0.35, chartSeaRegion: 2, chartSoak: 7,
      },
    });
  });

  it('leaves no literal behind in the code the knobs came out of', () => {
    const look = fileText('src/render3d/paintedLook.js');
    const board = fileText('src/render3d/paintedBoard.js');
    const lighting = fileText('src/terrainStudy/lighting.js');
    expect(look).not.toContain('8192');
    expect(look).not.toContain('2048');
    expect(board.split('\n').find((line: string) => line.includes('showingDistant = pixels <'))).toContain('lod.');
    expect(lighting).not.toContain('512, 512');
    expect(lighting).not.toContain('samples: 12');
  });
});
