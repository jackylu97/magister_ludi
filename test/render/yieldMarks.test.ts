/**
 * The six vendored yield marks: that they are all there, that they are all the
 * drawings that were vendored, and that both printers can still print them.
 *
 * Why a suite for six icons at all
 * --------------------------------
 * These are the only drawings in the project that are **not ours** (Lucide, ISC;
 * Tabler, MIT — see `public/sprites/CREDITS.md`), and the failure mode that
 * comes with vendored art is quiet: somebody tidies a curve, re-fits a path,
 * "fixes" a stroke, and the icon is no longer the icon anybody agreed to. So the
 * path data is pinned literally. A change here is meant to be a change somebody
 * had to type out, next to the upstream file, on purpose.
 *
 * The other half is the one the board cares about: a voice whose mark came out
 * empty rasterises as a blank coloured disc, which still looks like a token and
 * still counts, so nothing else in the render suite would notice. That used to
 * be reachable through a renamed file; it is now only reachable through an empty
 * path list, and this is where that is caught.
 */

import { describe, expect, it } from 'vitest';

import { MARK_BOX, MARK_STROKE, markSvg } from '../../src/art/resourceMarks';
import {
  YIELD_MARKS,
  YIELD_MARK_BOX,
  YIELD_MARK_SCALE,
  YIELD_MARK_STROKE,
  yieldMark,
  yieldMarkDataUri,
  yieldMarkSvg,
} from '../../src/art/yieldMarks';
import { YIELD_KEYS } from '../../src/render3d/badges3d';

/**
 * The atlas builder's own text. Read through Vite's raw glob rather than through
 * `node:fs`, for the reason `test/ui/seatRoster.test.ts` gives where it does the
 * same thing: this project has no node typings and a source assertion is not
 * worth a dependency.
 */
const BADGES_SOURCE = (
  import.meta.glob('../../src/render3d/badges3d.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/render3d/badges3d.ts']!;

describe('the vendored yield marks', () => {
  it('has one for every voice the atlas prints, and nothing else', () => {
    // Keyed by `YieldKey`, so the compiler already holds this — but the atlas's
    // cell list is what decides which marks are *asked* for, and the two are
    // declared in different files. A seventh voice added to `YIELD_KEYS` without
    // a drawing is a blank disc on the board.
    expect(Object.keys(YIELD_MARKS).sort()).toEqual([...YIELD_KEYS].sort());
  });

  it('is the drawing that was vendored, to the coordinate', () => {
    // Pinned literally, and deliberately unreadable-as-prose: this is upstream's
    // path data, and the only legitimate way to change it is to re-vendor from
    // upstream and paste the new string in. See the module docblock.
    expect(yieldMark('food').paths.map((path) => path.d)).toEqual([
      'M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3',
      'M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7',
      'm8 15-2.58-2.58',
    ]);
    expect(yieldMark('faith').paths.map((path) => path.d)).toEqual([
      'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
    ]);
    expect(yieldMark('science').paths.map((path) => path.d)).toEqual([
      'M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2',
      'M6.453 15h11.094',
      'M8.5 2h7',
    ]);
    expect(yieldMark('gold').paths.map((path) => path.d)).toEqual([
      'M9.5 3h5a1.5 1.5 0 0 1 1.5 1.5a3.5 3.5 0 0 1 -3.5 3.5h-1a3.5 3.5 0 0 1 -3.5 -3.5a1.5 1.5 0 0 1 1.5 -1.5',
      'M4 17v-1a8 8 0 1 1 16 0v1a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4',
    ]);
  });

  /**
   * The one *edit* the vendoring made to a shape, and the reason it is safe: a
   * `<circle>` is not path data, and both printers here take exactly one kind of
   * thing. The gear's hub and the two note heads are `dot()` — the same helper
   * the resource marks draw a pearl with, whose arithmetic is grid-agnostic.
   */
  it('turned the three upstream circles into path data', () => {
    // Nothing left that is not a `d`, and the converted circles are closed arcs.
    for (const key of YIELD_KEYS) {
      for (const path of yieldMark(key).paths) {
        expect(path.d).toMatch(/^[Mm]/);
      }
    }
    const gear = yieldMark('production').paths;
    expect(gear).toHaveLength(2);
    expect(gear[1]!.d).toContain('a');
    expect(gear[1]!.d.endsWith('Z')).toBe(true);
    // Two note heads, one beam.
    expect(yieldMark('culture').paths).toHaveLength(3);
  });

  it('draws every voice with ink in it', () => {
    for (const key of YIELD_KEYS) {
      const mark = yieldMark(key);
      expect(mark.paths.length).toBeGreaterThan(0);
      for (const path of mark.paths) {
        expect(path.d.length).toBeGreaterThan(0);
        // Every one of the six is an *outline* icon: no fills, one weight. That
        // is what makes them work as CSS masks (`src/ui/yieldMark.ts`) — a mask
        // takes the painted stroke — and a path that arrived filled-only, at
        // weight zero, would be invisible in the DOM while looking fine on the
        // board. The one way the two printers could disagree.
        expect(path.fill ?? false).toBe(false);
        expect(path.width).toBe(YIELD_MARK_STROKE);
      }
    }
  });

  it('carries the courtesy note CREDITS.md prints, per mark', () => {
    for (const key of YIELD_KEYS) {
      const mark = yieldMark(key);
      expect(mark.note.length).toBeGreaterThan(0);
      // Which upstream icon, from which set, under which licence. The thing a
      // re-vendoring has to keep and the thing the credits file is generated
      // from by hand.
      expect(mark.credit).toMatch(/^(Lucide|Tabler Icons) `[a-z-]+` \((ISC|MIT)\)$/);
    }
    expect(yieldMark('gold').credit).toContain('Tabler');
    expect(yieldMark('gold').credit).toContain('moneybag');
    // Five of the six are Lucide's; only the money bag is Tabler's.
    const tabler = YIELD_KEYS.filter((key) => yieldMark(key).credit.includes('Tabler'));
    expect(tabler).toEqual(['gold']);
  });
});

describe('the weight and the grid', () => {
  it('keeps upstream\'s grid rather than rescaling onto ours', () => {
    // 24, where every original mark in `src/art/` is drawn on 64. Rescaling path
    // data is how a vendored drawing quietly stops being the drawing that was
    // vendored — the numbers would no longer match the upstream file and nobody
    // could check them again. Both printers take the box as a parameter instead.
    expect(YIELD_MARK_BOX).toBe(24);
    expect(MARK_BOX).toBe(64);
    expect(YIELD_MARK_BOX).not.toBe(MARK_BOX);
  });

  it('strokes heavier than upstream, inside the band the design pass called for', () => {
    // Upstream ships 2/24, drawn for a 24-pixel toolbar icon; a board pip here
    // is about ten pixels across and 2/24 goes spidery at that size.
    expect(YIELD_MARK_STROKE).toBeGreaterThan(2);
    expect(YIELD_MARK_STROKE).toBeGreaterThanOrEqual(2.5);
    expect(YIELD_MARK_STROKE).toBeLessThanOrEqual(3);
  });

  /**
   * The claim the weight was actually chosen against, and the one worth pinning:
   * the set did not get *heavier*, it stopped being drawn by us. The hand-drawn
   * files this replaces were 7 units of a 64 grid; these are 2.75 of 24, inset by
   * `YIELD_MARK_SCALE` so the two grids' padding conventions agree. Printed at
   * one atlas cell those come out within a few percent of each other.
   */
  it('lands on the optical weight of the set it replaces', () => {
    const cell = 128; // `icons.atlasCell`, the shipped value.
    const iconScale = 0.74; // `icons.iconScale`.
    const wasBefore = (7 / MARK_BOX) * iconScale * cell;
    const isNow = (YIELD_MARK_STROKE / YIELD_MARK_BOX) * YIELD_MARK_SCALE * iconScale * cell;
    expect(isNow).toBeGreaterThan(wasBefore * 0.9);
    expect(isNow).toBeLessThan(wasBefore * 1.1);
  });

  it('insets the vendored grid so both sets print at one optical size', () => {
    // Geometry, not taste: this project's marks reach about 78% of their box and
    // Lucide's reach about 83% of theirs, and the yield cells print on a disc
    // whose rim the wider set would otherwise run into.
    expect(YIELD_MARK_SCALE).toBeGreaterThan(0.85);
    expect(YIELD_MARK_SCALE).toBeLessThan(1);
  });
});

describe('the SVG export', () => {
  it('exports a non-empty document for every voice', () => {
    for (const key of YIELD_KEYS) {
      const svg = yieldMarkSvg(yieldMark(key), '#123456');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain(`viewBox="0 0 ${YIELD_MARK_BOX} ${YIELD_MARK_BOX}"`);
      expect(svg).toContain(`stroke="#123456"`);
      expect(svg).toContain(`stroke-width="${YIELD_MARK_STROKE}"`);
      expect(svg).toContain('stroke-linecap="round"');
      // One `<path>` per authored path, and every one of them carrying data:
      // the emptiness this whole suite is about, checked at the far end.
      const paths = svg.match(/<path /g) ?? [];
      expect(paths).toHaveLength(yieldMark(key).paths.length);
      expect(svg).not.toContain('d=""');
      // Outline art: nothing in the document is filled, so the mask takes the
      // stroke and nothing else.
      expect(svg).not.toContain('fill="#123456"');
    }
  });

  it('resolves every voice to a data URI that decodes back to its document', () => {
    for (const key of YIELD_KEYS) {
      const uri = yieldMarkDataUri(key);
      expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
      const decoded = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
      expect(decoded).toBe(yieldMarkSvg(yieldMark(key), '#000'));
      // Every path's data survived the round trip — a percent-encoding bug in a
      // `d` string is the other way a mask comes out blank.
      for (const path of yieldMark(key).paths) expect(decoded).toContain(path.d);
    }
  });

  it('memoises per colour rather than per call', () => {
    expect(yieldMarkDataUri('food')).toBe(yieldMarkDataUri('food'));
    expect(yieldMarkDataUri('food', '#fff')).not.toBe(yieldMarkDataUri('food', '#000'));
  });

  /**
   * One emitter for two sets, which is the point of `markSvg` taking the grid
   * and the weight. A second copy for the vendored grid is exactly the drift
   * this project keeps one drawing to avoid, and it would have shown up as one
   * set quietly losing its round caps.
   */
  it('is the same emitter the resource marks use', () => {
    expect(yieldMarkSvg(yieldMark('gold'), '#abc')).toBe(
      markSvg(yieldMark('gold').paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, '#abc'),
    );
    // And it still prints this project's own grid at this project's own weight.
    expect(markSvg([{ d: 'M0 0H1' }], MARK_BOX, MARK_STROKE)).toContain(
      `stroke-width="${MARK_STROKE}"`,
    );
  });
});

/**
 * The regression the coordinator asked to be made impossible rather than
 * merely fixed: a yield cell that rasterises blank.
 *
 * It used to be reachable — the six marks were files under `public/`, and a
 * rename, a 404 or a blocked fetch left `loadIcon` resolving null, which
 * `drawYieldCell` drew as a bare coloured disc. Nothing failed; the board simply
 * stopped saying what a tile paid. Since the re-cut there is nothing to fetch,
 * and this reads the source to hold that: the yields must not come back as
 * files, and the one set that still is one must say so out loud when it fails.
 */
describe('the atlas can no longer lose a yield mark', () => {
  const source = BADGES_SOURCE;

  it('sources no yield artwork over the network', () => {
    expect(source).not.toContain('YIELD_ICON_FILES');
    expect(source).not.toContain('sprites/icons/yields');
    // The marginalia are the last set with a file, and the only place a null
    // icon is still reachable.
    expect(source).toContain('MARGINALIA_ICON_FILES');
    const files = source.slice(source.indexOf('const files = TILE_ICON_CELLS.map'));
    expect(files.slice(0, 240)).toContain("cell.set === 'marginalia'");
    expect(files.slice(0, 240)).not.toContain("cell.set === 'yield'");
  });

  it('draws the yield cells from path data', () => {
    // `drawYieldCell` traces the vendored marks rather than stamping a loaded
    // image, so an empty cell can only come from an empty mark — which the
    // suites above forbid.
    const draw = source.slice(source.indexOf('function drawYieldCell'));
    expect(draw.slice(0, 1600)).toContain('paintMarkPaths');
    expect(draw.slice(0, 1600)).toContain('yieldMark(key)');
  });

  it('says so on the console when the one remaining file does not load', () => {
    // A missing artwork used to be indistinguishable from a mark nobody had
    // drawn: the cell rasterised blank and the only way to find out was to
    // notice. It still does not reject — the atlas is a garnish and a renderer
    // that refused to start over a serpent would be worse — but it is no longer
    // quiet.
    const loader = source.slice(source.indexOf('function loadIcon'));
    expect(loader.slice(0, 800)).toContain('console.error');
    expect(loader.slice(0, 800)).toContain('did not load');
  });
});
