import { beforeAll, describe, expect, it } from 'vitest';
import { SCENE_LAYER_NAMES } from '../../src/render3d/renderer3d';

/**
 * `node:fs` behind a variable specifier, so the project's type surface stays
 * `vite/client` alone — the bargain `paintedBenchmark.test.ts` struck, for the
 * same reason: a source-reading register has to read source.
 */
const FS_SPECIFIER = 'node:fs';
interface MinimalFs { readFileSync(path: string, encoding: string): string }
const read = async (path: string): Promise<string> =>
  ((await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs).readFileSync(path, 'utf8');

let renderer = '', cities = '', works = '', board = '', ground = '', sites = '';
beforeAll(async () => {
  renderer = await read('src/render3d/renderer3d.ts');
  cities = await read('src/render3d/paintedCities.ts');
  works = await read('src/render3d/paintedWorks.ts');
  board = await read('src/render3d/paintedBoard.js');
  ground = await read('src/render3d/paintedGround.ts');
  sites = await read('src/render3d/paintedSites.ts');
});

/**
 * Every layer in the scene answers to a name.
 *
 * `Renderer3D.sampleColourPass` attributes a frame to whoever submitted it by
 * walking up to the scene child and reading its name, so a group added without
 * one is reported as "unnamed layer" and its triangles are indistinguishable
 * from anybody else's. P6's overview attribution found the second-largest row
 * at overview in exactly that state — 410k triangles over 27,855 instances with
 * no name on them — which is why this register exists and why it is read out of
 * the source rather than trusted.
 *
 * A source test rather than a live one: constructing `Renderer3D` needs a WebGL
 * context, and what is being pinned is the *code's* promise, not a frame's.
 */
describe('the scene layers and their names', () => {
  it('names every group it adds, and the register lists exactly those names', () => {
    // The constructor's own list, `['units', this.units.group]` a row.
    const listed = [...renderer.matchAll(/\['([a-z-]+)', this\.\w+\.(?:group|mesh)\]/g)].map(match => match[1]!);
    // And the layers built later, which name themselves where they are made.
    const assigned = [...renderer.matchAll(/(?:group|this\.fog\.group)\.name = '([a-z-]+)'/g)].map(match => match[1]!);
    expect(listed.length).toBeGreaterThan(0);
    expect([...listed, ...assigned].sort()).toEqual([...SCENE_LAYER_NAMES].sort());
    expect(new Set(SCENE_LAYER_NAMES).size).toBe(SCENE_LAYER_NAMES.length);
  });

  it('accounts for every `scene.add` in the file', () => {
    const adds = [...renderer.matchAll(/this\.scene\.add\(\s*([^;]*?)\);/gs)].map(match => match[1]!.trim());
    // A light is not a layer and draws nothing; the board's own meshes carry
    // `paintedFamily`, which is finer than a name; everything else is either a
    // painted layer that names its own group or a local the file just named.
    const excused = (argument: string): boolean =>
      /Light\(|this\.key/.test(argument) || argument === 'this.board.group' ||
      /^this\.painted\w+\.group(, this\.painted\w+\.group)*$/.test(argument) ||
      argument === 'layer' || argument === 'group' || argument === 'this.fog.group';
    for (const argument of adds) expect(excused(argument), argument).toBe(true);
    // The three transient groups the marches build are all named `group`, and
    // each one has to have been named before it is added.
    expect(adds.filter(argument => argument === 'group')).toHaveLength(3);
  });

  it('lets the painted layers name their own groups', () => {
    const named = (source: string, pattern: RegExp): string[] =>
      [...source.matchAll(pattern)].map(match => match[1]!);
    expect(named(cities, /this\.group\.name = '([a-z-]+)'/g)).toEqual(['painted-cities']);
    expect(named(works, /this\.group\.name = source\?\.name \?\? '([a-z-]+)'/g)).toEqual(['painted-works']);
    expect(named(board, /group\.name = '([a-z-]+)'/g)).toEqual(['painted-board']);
    // The ground layer takes its name from the renderer, which passes both.
    expect(renderer).toContain("new PaintedGroundLayer('painted-roads'");
    expect(renderer).toContain("new PaintedGroundLayer('painted-territory'");
    expect(ground).toContain('this.group.name = name;');
    expect(sites).toContain("name: 'painted-sites'");
  });
});
