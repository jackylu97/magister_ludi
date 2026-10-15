/**
 * **The rank marks** (batch WC3, `docs/flags.md` (rrrrrr) part 3: *"a rank
 * badge on the piece"*).
 *
 * Four claims, each about a way the mark could quietly stop being shown:
 *
 *   1. **One drawing per rank**, as path data on the house grid, so both
 *      printers (the tile atlas and the DOM masks) have something to print and
 *      nothing is fetched.
 *   2. **The board can stand it up**: the tile atlas has a cell for each rank
 *      and the board geometry a standing quad for each cell.
 *   3. **A rank changes the drawing and experience alone does not** is pinned
 *      beside the rest of the fingerprint in `pieces3d.test.ts`, with the boss
 *      itself; this file only holds the art.
 *   4. **The flair cabinet shows it**, in the same pass that ships it (CLAUDE.md):
 *      the mark families list both marks, the rank stall draws the boss with
 *      knobs on the numbers the board reads, and the garrison row stall ranks
 *      two of its pieces. Read from the sources, `overlays3d.test.ts`' way.
 */

import { describe, expect, it } from 'vitest';

import { RANK_MARK_IDS, rankMark, rankMarkDataUri, rankMarkSvg } from '../../src/art/rankMarks';
import { MARK_BOX } from '../../src/art/resourceMarks';
import { RANK_MARK_CELLS, tileIconIndex } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { RANK_IDS } from '../../src/sim/ranks';

/** The flair cabinet's own sources, read as text. */
const GALLERY = import.meta.glob('../../src/flairGallery/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function gallery(name: string): string {
  const key = Object.keys(GALLERY).find((path) => path.endsWith(`/${name}`));
  const text = key === undefined ? undefined : GALLERY[key];
  if (typeof text !== 'string' || text.length === 0) throw new Error(`${name} came back empty`);
  return text;
}

describe('the rank marks', () => {
  it('draw one mark per rank, in the simulation’s rank order', () => {
    expect(RANK_MARK_IDS).toEqual(RANK_IDS);
    for (const id of RANK_IDS) {
      const mark = rankMark(id);
      expect(mark.paths.length, id).toBeGreaterThan(0);
      expect(mark.note.trim().length, id).toBeGreaterThan(0);
    }
  });

  it('count their chevrons: one for a Veteran, two for an Elite', () => {
    expect(rankMark('veteran').paths).toHaveLength(1);
    expect(rankMark('elite').paths).toHaveLength(2);
  });

  it('are path data on the house grid, kept inside the box, and nothing is fetched', () => {
    for (const id of RANK_IDS) {
      for (const path of rankMark(id).paths) {
        // Every coordinate of an open stroke, with half its weight either side,
        // stays inside the 64 box, so the mark is never clipped by its cell.
        const numbers = (path.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
        expect(numbers.length, id).toBeGreaterThan(0);
        const reach = (path.width ?? 0) / 2;
        for (const value of numbers) {
          expect(value - reach, id).toBeGreaterThanOrEqual(0);
          expect(value + reach, id).toBeLessThanOrEqual(MARK_BOX);
        }
      }
      const svg = rankMarkSvg(id);
      expect(svg).toContain(`viewBox="0 0 ${MARK_BOX} ${MARK_BOX}"`);
      expect(svg).not.toMatch(/href=|url\(/);
      expect(rankMarkDataUri(id)).toMatch(/^data:image\/svg\+xml,/);
    }
  });
});

describe('the rank marks on the board', () => {
  it('have a tile atlas cell each, and a standing quad each', () => {
    expect(RANK_MARK_CELLS).toEqual(RANK_IDS);
    const board = new BoardGeometry();
    for (const id of RANK_IDS) {
      expect(tileIconIndex({ set: 'rank', id }), id).toBeGreaterThanOrEqual(0);
      expect(board.rankMarkers[id], id).toBeDefined();
    }
    board.dispose();
  });
});

describe('the rank marks in the flair cabinet', () => {
  it('are listed among the mark families', () => {
    const marks = gallery('marks.ts');
    expect(marks).toContain('rankMarkFamily(into)');
    expect(marks).toContain('for (const id of RANK_MARK_IDS)');
    expect(marks).toContain('rankMarkDataUri(id)');
  });

  it('have a stall that draws the boss from the atlas, with a knob on each number the board reads', () => {
    const page = gallery('main.ts');
    expect(page).toContain('drawRankStall(');
    expect(page).toContain('rankStall.setIcons(icons)');
    const stall = gallery('ranks.ts');
    // The atlases' own cells, never a drawing of them.
    expect(stall).toContain('printRoundel(');
    expect(stall).toContain("tileIconIndex({ set: 'rank'");
    for (const key of ['rankDiameter', 'rankOffsetX', 'rankOffsetY'] as const) {
      expect(stall, key).toContain(`BADGE.${key} = value`);
    }
    // And no colour of its own.
    expect(stall.match(/#[0-9a-fA-F]{6}\b/)).toBeNull();
  });

  it('rank two pieces of the garrison row stall through their real experience', () => {
    const flourishes = gallery('flourishes.ts');
    expect(flourishes).toContain('unit.experience = experience');
    expect(flourishes).toContain('RULES.combat.ranks.ladder.veteran.experience');
    expect(flourishes).toContain('RULES.combat.ranks.ladder.elite.experience');
  });
});
