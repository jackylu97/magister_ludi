/**
 * The two vendored meter marks: that they are both there, that they are the
 * drawings that were vendored, and that both printers can still print them.
 *
 * The yield suite's argument, one set over: `test/render/yieldMarks.test.ts`
 * pins the six yield voices' path data because a "tidy-up" of a vendored curve
 * is otherwise a silent redraw of somebody else's icon, and a mark that came
 * out empty rasterises as blank ink nobody would notice missing. Happiness and
 * authority join the same vendored language and want the same net.
 */

import { describe, expect, it } from 'vitest';

import { METER_MARKS, meterMark, meterMarkDataUri, meterMarkSvg } from '../../src/art/meterMarks';
import { YIELD_MARK_BOX, YIELD_MARK_STROKE } from '../../src/art/yieldMarks';

const METER_KEYS = ['happiness', 'authority'] as const;

describe('the vendored meter marks', () => {
  it('has one for each of the two meters, and nothing else', () => {
    expect(Object.keys(METER_MARKS).sort()).toEqual([...METER_KEYS].sort());
  });

  it('is the drawing that was vendored, to the coordinate', () => {
    // Pinned literally, exactly as the six yield marks are: the only
    // legitimate way to change this is to re-vendor from upstream and paste
    // the new string in.
    expect(meterMark('happiness').paths.map((path) => path.d)).toEqual([
      'M15 10V9',
      'M16.472 15a6 6 0 01-8.943 0',
      'M9 10V9',
      // The converted `<circle cx="12" cy="12" r="10"/>` — see below.
      'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0Z',
    ]);
    expect(meterMark('authority').paths.map((path) => path.d)).toEqual([
      'M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13',
      'M20 15.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z',
      'M5 22h14',
    ]);
  });

  it('turned the one upstream circle into path data', () => {
    for (const key of METER_KEYS) {
      for (const path of meterMark(key).paths) expect(path.d).toMatch(/^[Mm]/);
    }
    const face = meterMark('happiness').paths;
    expect(face).toHaveLength(4);
    expect(face[3]!.d).toContain('a');
    expect(face[3]!.d.endsWith('Z')).toBe(true);
  });

  it('draws every meter with ink in it, at the yield set\'s own weight', () => {
    for (const key of METER_KEYS) {
      const mark = meterMark(key);
      expect(mark.paths.length).toBeGreaterThan(0);
      for (const path of mark.paths) {
        expect(path.d.length).toBeGreaterThan(0);
        // Pure outline, exactly like the six yield marks — no fills, which is
        // what makes them work as CSS masks (`src/ui/meterMark.ts`).
        expect(path.fill ?? false).toBe(false);
        expect(path.width).toBe(YIELD_MARK_STROKE);
      }
    }
  });

  it('carries the courtesy note CREDITS.md prints, per mark', () => {
    for (const key of METER_KEYS) {
      const mark = meterMark(key);
      expect(mark.note.length).toBeGreaterThan(0);
      expect(mark.credit).toMatch(/^Lucide `[a-z-]+` \(ISC\)$/);
    }
    expect(meterMark('happiness').credit).toContain('smile');
    expect(meterMark('authority').credit).toContain('stamp');
  });

  it('shares the yield voices\' grid and weight rather than declaring its own', () => {
    // `meterMarks.ts` imports these from `yieldMarks.ts` instead of
    // re-declaring them — the same numbers named twice is how the two sets
    // quietly drift apart.
    for (const key of METER_KEYS) {
      for (const path of meterMark(key).paths) expect(path.width).toBe(YIELD_MARK_STROKE);
    }
    expect(meterMarkSvg(meterMark('happiness'), '#123456')).toContain(
      `viewBox="0 0 ${YIELD_MARK_BOX} ${YIELD_MARK_BOX}"`,
    );
  });
});

describe('the SVG export', () => {
  it('exports a non-empty document for every meter', () => {
    for (const key of METER_KEYS) {
      const svg = meterMarkSvg(meterMark(key), '#123456');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain(`viewBox="0 0 ${YIELD_MARK_BOX} ${YIELD_MARK_BOX}"`);
      expect(svg).toContain('stroke="#123456"');
      expect(svg).toContain(`stroke-width="${YIELD_MARK_STROKE}"`);
      expect(svg).toContain('stroke-linecap="round"');
      const paths = svg.match(/<path /g) ?? [];
      expect(paths).toHaveLength(meterMark(key).paths.length);
      expect(svg).not.toContain('d=""');
      expect(svg).not.toContain('fill="#123456"');
    }
  });

  it('resolves every meter to a data URI that decodes back to its document', () => {
    for (const key of METER_KEYS) {
      const uri = meterMarkDataUri(key);
      expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
      const decoded = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
      expect(decoded).toBe(meterMarkSvg(meterMark(key), '#000'));
      for (const path of meterMark(key).paths) expect(decoded).toContain(path.d);
    }
  });

  it('memoises per colour rather than per call', () => {
    expect(meterMarkDataUri('happiness')).toBe(meterMarkDataUri('happiness'));
    expect(meterMarkDataUri('happiness', '#fff')).not.toBe(meterMarkDataUri('happiness', '#000'));
  });
});
