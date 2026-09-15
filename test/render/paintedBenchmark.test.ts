/**
 * The measurement harness's own register (audit tasks #23 and #24).
 *
 * A benchmark is only worth the discipline written into it, and three of those
 * disciplines are invisible to any renderer test that draws nothing:
 *
 *  · **an absent measurement is `null`, never zero** — a browser with no timer
 *    query must report no GPU column at all, because a column of zeroes is a
 *    number somebody will one day average into a claim;
 *  · **the startup stages exist, all of them, and the harness reads back the
 *    same list main.ts writes** — a stage renamed on one side and not the other
 *    silently drops a span out of every future report;
 *  · **the probe never leaves the player's game behind it** — the workloads
 *    drive the real reducer over the live map, so the restore is load-bearing.
 *
 * All three are facts about the source, so this is a source-reading register
 * test (core tier, per CLAUDE.md) rather than a headless draw.
 */
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * `node:fs` behind a variable specifier, so the project's type surface stays
 * `vite/client` alone — the bargain `techDocSync.test.ts` struck, for its
 * reason: a source-reading register has to read source.
 */
const FS_SPECIFIER = 'node:fs';
interface MinimalFs { readFileSync(path: string, encoding: string): string }
const read = async (path: string): Promise<string> =>
  ((await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs).readFileSync(path, 'utf8');

let renderer = '', main = '', harness = '';
beforeAll(async () => {
  renderer = await read('src/render3d/renderer3d.ts');
  main = await read('src/main.ts');
  harness = await read('scripts/terrain-study/check-painted.mjs');
});

/** The benchmark suite, as one slice of the renderer's source. */
function benchmarkSource(): string {
  const from = renderer.indexOf('private benchmarkOptions()');
  const to = renderer.indexOf('/**\n   * Rasterises the badge icons');
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return renderer.slice(from, to);
}

describe('the painted benchmark reports nothing it did not measure', () => {
  it('returns null, never zero, where the measurement is unavailable', () => {
    const source = benchmarkSource();
    // The GPU column exists only when the timer-query extension does.
    expect(source).toContain('gpuMs: timer ? stat(phase.gpu) : null');
    expect(source).toContain('gpuDisjointDiscards: timer ? disjointDiscards : null');
    // The heap is Chromium's own non-standard reading; absent elsewhere.
    expect(source).toMatch(/heapMiB: memory \?[^:]+: null/);
    expect(source).toMatch(/heapTotalMiB: memory \?[^:]+: null/);
    // Every distribution folds an empty sample list to null rather than to a
    // zero-millisecond summary.
    expect(source).toContain('if (values.length === 0) return null;');
    // And nothing in the suite launders an absent reading into a zero.
    expect(source).not.toMatch(/gpu[A-Za-z]*\s*(:|=)\s*[^;,\n]*\?\?\s*0/);
    expect(source).not.toMatch(/heap[A-Za-z]*\s*(:|=)\s*[^;,\n]*\?\?\s*0/);
  });

  it('counts an undrawn frame as idle rather than as a fast one', () => {
    const source = benchmarkSource();
    expect(source).toContain('const drew = calls > lastCalls;');
    expect(source).toContain('current.idle++');
    // A query bracketing a frame nobody drew is destroyed, not banked.
    expect(source).toContain('else gl.deleteQuery(open.query);');
  });

  it('separates frame preparation from render submission', () => {
    const source = benchmarkSource();
    expect(source).toContain('const main = at - time, submit = this.lastRenderMs;');
    expect(source).toContain('current.prep.push(Math.max(0, main - submit));');
    expect(source).toContain('preparationMs: stat(phase.prep)');
  });

  it('throws away a disjoint sample instead of reporting it', () => {
    const source = benchmarkSource();
    expect(source).toContain('GPU_DISJOINT_EXT');
    expect(source).toContain('disjointDiscards += queue.length');
  });

  it('records the hardware, the policy and the populations with every run', () => {
    const source = benchmarkSource();
    for (const field of ['userAgent', 'gpu:', 'dpr:', 'viewport:', 'warmUpFrames', 'measuredFrames', 'shadowsEnabled']) {
      expect(source).toContain(field);
    }
    for (const count of ['cities:', 'walledCities:', 'units:', 'improvedTiles:', 'roadedTiles:', 'camps:']) {
      expect(source).toContain(count);
    }
    // The shadow map is asked for the size it actually allocated.
    expect(source).toContain('light.shadow.map ?? null');
    expect(source).toContain('not resident GPU memory');
  });
});

describe('the workload suite leaves the player\'s game exactly as it found it', () => {
  it('restores the state, the tiles, the focus and the seat in a finally', () => {
    const source = benchmarkSource();
    const tail = source.slice(source.indexOf('} finally {', source.indexOf('private async benchmarkWorkloads')));
    for (const line of ['this.setGameState(original);', 'restoreTiles();', 'this.setCityFocus(null, false);', 'this.setFogSeat(seat);']) {
      expect(tail).toContain(line);
    }
  });

  it('shares the live map and writes every tile field back', () => {
    const source = benchmarkSource();
    expect(source).toContain('march.map = original.map;');
    expect(source).toContain('future.map = original.map;');
    expect(source).toContain('const snapshot = map.tiles.map(tile => ({...tile}));');
  });

  it('marches through nothing a unit would consume on arrival', () => {
    const source = benchmarkSource();
    expect(source).toContain('!tile.discovery');
    expect(source).toContain('campCells.has(');
  });

  it('drives the simulation\'s own reducer rather than moving a unit by hand', () => {
    const source = benchmarkSource();
    expect(source).toContain("await import('../sim/commands')");
    expect(source).toContain("applyCommand(march, {type: 'moveUnit'");
    expect(source).toContain("applyCommand(future, {type: 'endTurn'");
  });

  it('measures the first frame of a reveal instead of warming it away', () => {
    const source = benchmarkSource();
    const phase = source.slice(source.indexOf('const phase = (name: string'), source.indexOf('const settle ='));
    expect(phase).toContain('probe.count(true)');
  });
});

describe('the startup stage marks', () => {
  const STAGES = [
    'load-start', 'replay-done', 'begin', 'assets-loaded',
    'terrain-ready', 'state-layers-built', 'first-board-frame', 'playable',
  ];

  it('are all present in main.ts, and nothing else is', () => {
    const found = [...main.matchAll(/performance\.mark\('magisterludi:([a-z-]+)'\)/g)].map(match => match[1]!);
    expect([...new Set(found)].sort()).toEqual([...STAGES].sort());
  });

  it('are the same list the harness reads back', () => {
    const read = [...harness.matchAll(/'magisterludi:([a-z-]+)'/g)].map(match => match[1]!);
    expect([...new Set(read)].sort()).toEqual([...STAGES].sort());
  });

  it('are marks and nothing more — the loading path is not rewritten around them', () => {
    // Every mark is a whole statement of its own; none of them is an argument,
    // a condition or an assignment that could change what the loader does.
    for (const line of main.split('\n').filter((text: string) => text.includes('performance.mark('))) {
      expect(line.trim()).toMatch(/^performance\.mark\('magisterludi:[a-z-]+'\);$/);
    }
  });

  it('bracket the stages the audit names', () => {
    // Where each one sits is the whole of #23's evidence: replay before the
    // renderer, assets before the terrain worker, hydration before the frame.
    const at = (mark: string) => main.indexOf(`performance.mark('magisterludi:${mark}')`);
    expect(at('load-start')).toBeLessThan(at('replay-done'));
    expect(at('assets-loaded')).toBeLessThan(at('terrain-ready'));
    expect(at('terrain-ready')).toBeLessThan(at('state-layers-built'));
  });
});
