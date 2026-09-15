/**
 * The painted look's fog of war — the shadowed treatment, pinned.
 *
 * Four claims, and they are the ones the ruling (`docs/flags.md` (zzzz)) and
 * audit finding 2 (`docs/plans/painted-performance-audit.md`) are made of:
 *
 *  1. **A register change is light, not geometry.** A hex going from remembered
 *     to visible writes texels on the light field and nothing else — no batch
 *     changes visibility, no shadow is rebaked, no layer is rebuilt. That is
 *     what makes a soft edge and an eased reveal affordable every march.
 *  2. **The paper takes the sun's shadow and not its colour.** The chart is a
 *     lit surface on purpose, and at golden hour a lit cream page came out
 *     peach; the fold that fixes it is one scalar, and this is the register that
 *     says the sun's rgb never reaches the page.
 *  3. **One treatment.** The four-way study is over. `wash`, `drawn` and `bleed`
 *     are gone from the source and from the sheet, and so is the knob that chose
 *     between them.
 *  4. **The reveal is a comparison, never a countdown** — the same discipline
 *     the simulation's timed effects keep: an absolute stamp, an absolute now,
 *     and an ease that is a pure function of the two.
 */

import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry, BufferGeometry, Material, Mesh, MeshStandardMaterial } from 'three';

import { buildPaintedBoard, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAssets } from '../../src/render3d/paintedBoard.js';
import {
  PAINTED_CHART, PAINTED_FOG_GLSL, PAINTED_REVEAL_MS, PAINTED_VISION,
  createPaintedLightField, paintedChartGeometry, paintedFogRegister, paintedLightCoords,
  paintedLightIndex, paintedRevealEase, paintedSunWeight,
} from '../../src/render3d/paintedFogLook';
import { VIEW3D } from '../../src/render3d/lookData';
import { createMap } from '../../src/sim/map';

import viewJson from '../../data/view3d.json';

// The register tests below read source files; Node imports stay behind a
// variable specifier so the project's type surface remains vite/client.
const FS_SPECIFIER = 'node:fs';
let readFileSync: (path: URL, encoding: string) => string;
beforeAll(async () => {
  const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as { readFileSync: typeof readFileSync };
  readFileSync = fs.readFileSync;
});
const source = (name: string): string => readFileSync(new URL(`../../src/render3d/${name}`, import.meta.url), 'utf8');

const boards: PaintedBoard[] = [], disposables: (BufferGeometry | Material)[] = [];
afterEach(() => { boards.splice(0).forEach(board => board.dispose()); disposables.splice(0).forEach(item => item.dispose()); });

function fixture(width = 12, height = 4) {
  const map = createMap({ width, height, terrain: 'grassland' });
  map.tiles.forEach(tile => { tile.feature = 'forest'; });
  const mat = (color = '#799741') => { const m = new MeshStandardMaterial({ color, vertexColors: true }); disposables.push(m); return m; };
  const materials: PaintedBoardMaterials = {
    ground: Object.fromEntries(['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'ocean', 'coast', 'lake', 'oasis', 'floodplain'].map(k => [k, mat()])),
    earth: mat('#948653'), mergedLand: mat('#ffffff'), mergedWater: mat('#ffffff'), mergedDetails: mat('#ffffff'),
    water: { river: mat('#8198d0'), bank: mat(), shallows: mat(), foam: mat() },
    features: { shrub: mat(), stone: mat(), fertile: mat(), bank: mat(), pool: mat(), shallow: mat(), reeds: mat() },
  };
  const geometry = new BoxGeometry(.3, .8, .3); disposables.push(geometry);
  const asset = { geometry, shoulderGeometry: geometry, material: mat() };
  const assets: PaintedVegetationAssets = { broadleaves: [asset, asset, asset], cypresses: [asset, asset], escarpments: [asset, asset, asset], limestone: asset, broadleaf: asset, rangeMaterial: mat() };
  const board = buildPaintedBoard(map, assets, materials); boards.push(board);
  /** Every mesh currently submitted, and how many of them cast. The bake's view. */
  const drawn = (): { meshes: number; casters: number } => {
    let meshes = 0, casters = 0;
    board.group.traverseVisible(object => { if (object instanceof Mesh) { meshes++; if (object.castShadow) casters++; } });
    return { meshes, casters };
  };
  return { map, board, drawn, levels: (fill: number) => new Uint8Array(map.tiles.length).fill(fill) };
}

describe('the fog register: light, not geometry', () => {
  it('spells the three registers in one place', () => {
    expect(paintedFogRegister(PAINTED_VISION.uncharted)).toEqual({ drawn: false, sun: 0 });
    expect(paintedFogRegister(PAINTED_VISION.remembered)).toEqual({ drawn: true, sun: 0 });
    expect(paintedFogRegister(PAINTED_VISION.visible)).toEqual({ drawn: true, sun: 1 });
  });

  it('moves a remembered hex to visible with texel writes and nothing else', () => {
    const { board, drawn, levels } = fixture();
    board.applyFog(levels(1));
    const remembered = drawn(), revision = board.shadowRevision;
    const field = board.fogUniforms.paintedLight.value as { version: number };
    const version = field.version;

    board.applyFog(levels(2));
    // The picture changed; the world did not. Same meshes, same casters, same
    // shadow revision — and the light texture is the one thing that was written.
    expect(drawn()).toEqual(remembered);
    expect(board.shadowRevision).toBe(revision);
    expect(field.version).toBeGreaterThan(version);
  });

  it('charges one rebake for ground crossing out of the dark, and none for the wash', () => {
    const { board, levels } = fixture();
    board.applyFog(levels(0));
    const dark = board.shadowRevision;
    board.applyFog(levels(2));
    const charted = board.shadowRevision;
    expect(charted).toBeGreaterThan(dark);
    for (const level of [1, 2, 1, 2]) {
      board.applyFog(levels(level));
      expect(board.shadowRevision).toBe(charted);
    }
  });

  it('reads the same lit weight the shader does, on both sides of the edge', () => {
    // The GLSL is `smoothstep(.5 - e*.5, .5 + e*.5, sample)`; this is its dual,
    // and the two are held together here so a knob change cannot part them.
    const edge = VIEW3D.painted.fog.sunFalloff;
    expect(PAINTED_FOG_GLSL.registerWeight).toContain('smoothstep(.5 - paintedFogEdge * .5, .5 + paintedFogEdge * .5');
    expect(paintedSunWeight(0.5, edge)).toBeCloseTo(0.5, 6);
    expect(paintedSunWeight(0.5 - edge, edge)).toBe(0);
    expect(paintedSunWeight(0.5 + edge, edge)).toBe(1);
    expect(paintedSunWeight(0.56, edge)).toBeGreaterThan(paintedSunWeight(0.54, edge));
  });

  it('puts every cell’s texel under its own hex centre, doubled in x', () => {
    const width = 7;
    for (const [col, row] of [[0, 0], [3, 0], [0, 1], [3, 1], [6, 3]] as const) {
      const index = paintedLightIndex(row * width + col, width);
      const world = { x: Math.sqrt(3) * (col + (row % 2) * .5), z: row * 1.5 };
      const coords = paintedLightCoords(world.x, world.z);
      expect(coords.x).toBeCloseTo(index.x, 6);
      expect(coords.y).toBeCloseTo(index.y, 6);
    }
  });

  it('means the texel between two cells, so the ramp across a row stays straight', () => {
    const field = createPaintedLightField(4, 2);
    field.write(0, 255, 255);
    const world = { x: Math.sqrt(3) * .5, z: 0 };
    // Halfway between a lit cell and a dark one: the sample is the mean, which
    // is the edge the falloff is centred on.
    expect(field.read(world.x, world.z).lit).toBeCloseTo(0.5, 2);
    expect(field.read(0, 0).lit).toBe(1);
    field.dispose();
  });
});

describe('the paper: the sun’s shadow, not the sun’s colour', () => {
  it('folds the light to one scalar before it touches the page', () => {
    const paint = PAINTED_FOG_GLSL.chartPaint;
    // The whole of the rule: what the rig contributed, reduced to a luminance,
    // re-applied to the page's own colour. Nothing else may reach the page.
    expect(paint).toContain('outgoingLight / max(diffuseColor.rgb, vec3(1e-4))');
    expect(paint).toContain('dot(paintedPaperLight, vec3(.2126, .7152, .0722))');
    expect(paint).toContain('outgoingLight = diffuseColor.rgb * paintedPaperShade;');
    // And it is assigned, not blended into: a `mix` with the lit colour would
    // leave a share of the sun's hue behind, which is the bug this fixes.
    const assignments = paint.split('\n').filter(line => line.trim().startsWith('outgoingLight ='));
    expect(assignments).toHaveLength(2);
    expect(assignments[1]).toContain('paintedFogInk');
  });

  it('draws only where the board discards, and dissolves as the world soaks in', () => {
    expect(PAINTED_FOG_GLSL.chartDiscard).toContain('if (paintedCharted > .98) discard;');
    expect(PAINTED_FOG_GLSL.chartDiscard).toContain('paintedSoakNoise');
  });

  it('builds six front-facing triangles a cell and washes only a whole disc of sea', () => {
    const region = PAINTED_CHART.sea.region;
    const width = 2 * region + 3, height = 2 * region + 3;
    const tiles = [];
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      // Everything is sea but one hex of land in the corner, so exactly the
      // cells within `region` of it are denied the margin's wash.
      tiles.push({ col, row, water: !(col === 0 && row === 0) });
    }
    const geometry = paintedChartGeometry(tiles, width, height, PAINTED_CHART.lift, PAINTED_CHART.sea);
    disposables.push(geometry);
    const position = geometry.getAttribute('position');
    expect(position.count).toBe(tiles.length * 18);
    // Wound anticlockwise in (x, z), which is the face an overhead camera sees.
    const cross = (position.getX(1) - position.getX(0)) * (position.getZ(2) - position.getZ(0))
      - (position.getZ(1) - position.getZ(0)) * (position.getX(2) - position.getX(0));
    expect(cross).toBeLessThan(0);
    for (let i = 0; i < position.count; i++) expect(position.getY(i)).toBeCloseTo(PAINTED_CHART.lift, 6);

    // The land hex and everything inside its region keep the plain page; a hex
    // one step further out is open sea and takes the margin's wash.
    const colors = geometry.getAttribute('color');
    const paperAt = (col: number, row: number): number[] => {
      const v = (row * width + col) * 18;
      return [colors.getX(v), colors.getY(v), colors.getZ(v)];
    };
    const plain = paperAt(0, 0);
    expect(paperAt(region, 0)).toEqual(plain);
    expect(paperAt(region + 2, region + 2)).not.toEqual(plain);
  });

  it('is a surface that receives the relief’s shadows and casts none of its own', () => {
    const { board } = fixture();
    const chart = board.createChartTable();
    expect(chart.receiveShadow).toBe(true);
    expect(chart.castShadow).toBe(false);
    // White material, page colour on the vertices: a tint on both would square
    // the cream and put the margin's sea wash under a second filter.
    expect((chart.material as MeshStandardMaterial).color.getHex()).toBe(0xffffff);
    expect((chart.material as MeshStandardMaterial).vertexColors).toBe(true);
    // One page a wrap copy, and outside the visibility batches: every other
    // batch hides while its hexes are uncharted; the paper is drawn because
    // they are.
    let pages = 0;
    board.group.traverse(object => { if (object.name === 'painted-chart-table') pages++; });
    expect(pages).toBe(3);
    board.applyFog(new Uint8Array(board.tileCount));
    let visiblePages = 0;
    board.group.traverseVisible(object => { if (object.name === 'painted-chart-table') visiblePages++; });
    expect(visiblePages).toBe(3);
  });
});

describe('one treatment, and the knobs that are left', () => {
  it('has no treatment switch, and no wash, drawn or bleed, anywhere in the fog', () => {
    const files = ['paintedFogLook.ts', 'paintedFog.js'].map(source);
    for (const text of files) {
      for (const gone of ['paintedFogTreatment', 'PAINTED_TREATMENTS', 'Hatch', 'Bleed', 'paintedFogWash', 'LegacyMix']) {
        expect(`${gone}: ${text.includes(gone)}`).toBe(`${gone}: false`);
      }
    }
    // The composed shader, too: what a board material is actually handed.
    const shader = PAINTED_FOG_GLSL.registerHead + PAINTED_FOG_GLSL.registerWeight + PAINTED_FOG_GLSL.registerPaint;
    expect(shader).not.toContain('paintedFogTreatment');
    expect(shader).toContain('paintedFogShadowedSun');
  });

  it('keeps no treatment row in the sheet, and every row it does keep is read', () => {
    const fog = viewJson.painted.fog as Record<string, unknown>;
    expect(Object.keys(fog).sort()).toEqual([
      'chartLift', 'chartRule', 'chartSea', 'chartSeaMix', 'chartSeaRegion', 'chartSoak',
      'ink', 'paper', 'revealMs', 'ruleWidth', 'shadowedCool', 'shadowedShade', 'shadowedSun', 'sunFalloff',
    ]);
    expect(fog.treatment).toBeUndefined();
    // The inks are palette names, never written out here.
    expect(VIEW3D.palette[String(fog.paper)]).toBeDefined();
    expect(VIEW3D.palette[String(fog.ink)]).toBeDefined();
  });

  it('leaves the board’s own remembered wash behind with them', () => {
    // The shipped treatment was one line in the fog installer — a mix toward a
    // flat tone, knocked back. It is the thing `shadowed` replaces.
    const fog = source('paintedFog.js');
    expect(fog).not.toContain('outgoingLight = mix(outgoingLight, paintedFogWash');
    expect(fog).toContain('PAINTED_FOG_GLSL.registerPaint');
  });
});

describe('the reveal: a comparison, never a countdown', () => {
  it('eases both channels from the stamp, in absolute time', () => {
    const { board, levels } = fixture();
    board.applyFog(levels(0));
    const start = 10_000;
    board.applyFog(levels(2), start);
    expect(board.revealing).toBeGreaterThan(0);
    const stamps = board.revealStamps;

    const field = board.fogUniforms.paintedLight.value as { image: { data: Uint8Array } };
    const litAt = (at: number): number => { board.advanceReveal(at); return field.image.data[0]!; };
    const half = litAt(start + PAINTED_REVEAL_MS / 2);
    expect(half).toBeCloseTo(Math.round(255 * paintedRevealEase(0.5)), 0);

    // Asked twice at the same moment, the answer is the same: nothing ticked.
    expect(litAt(start + PAINTED_REVEAL_MS / 2)).toBe(half);
    // And a clock that jumps straight to the end settles, whatever it missed.
    expect(litAt(start + PAINTED_REVEAL_MS)).toBe(255);
    expect(board.revealing).toBe(0);
    expect(board.revealStamps).toBe(stamps);
  });

  it('arrives whole when no clock is offered', () => {
    const { board, levels } = fixture();
    board.applyFog(levels(0));
    board.applyFog(levels(2));
    expect(board.revealing).toBe(0);
    expect(board.revealStamps).toBe(0);
  });

  it('holds no counter to decrement', () => {
    // The simulation's discipline, in the renderer: `TimedEffect` carries an
    // absolute turn and `pruneTimedEffects` is a broom. The reveal is the same
    // shape — a stamp, a now, and a pure ease between them.
    const fog = source('paintedFog.js');
    expect(fog).toContain('const eased = paintedRevealEase((now - stamped[cell]) / revealMs);');
    // No state is subtracted from anywhere in the walk: the only arithmetic on
    // a moving cell is the difference between two absolute times.
    expect(fog.split('\n').filter(line => /-=|--[;)\s]/.test(line) && !line.trim().startsWith('*')))
      .toEqual([]);
    expect(paintedRevealEase(-1)).toBe(0);
    expect(paintedRevealEase(2)).toBe(1);
    expect(paintedRevealEase(0.5)).toBe(0.5);
  });

  it('is drawn to the end: the loop asks what is moving before it steps', () => {
    // A gate that read what was *left* after the step would throw away the frame
    // that settled the last cell — the frame carrying the finished picture.
    const loop = readFileSync(new URL('../../src/render3d/renderer3d.ts', import.meta.url), 'utf8');
    const gate = loop.slice(loop.indexOf('const revealing ='), loop.indexOf('const refreshState'));
    expect(gate).toContain('(this.paintedBoard?.revealing ?? 0) > 0');
    expect(gate.indexOf('advanceReveal')).toBeGreaterThan(gate.indexOf('const revealing ='));
    expect(gate).toContain('!revealing) return;');
  });
});
