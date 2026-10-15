/**
 * The marks a unit's **rank** is shown by (batch WC3, `docs/flags.md` (rrrrrr)
 * part 3: *"a rank badge on the piece"*). One mark per rank, keyed by the
 * simulation's own rank ids (`RANK_IDS`, `src/sim/ranks.ts`).
 *
 * The drawing is chevrons, the oldest way an army marks a soldier's standing:
 * one for a Veteran, two for an Elite. The count is the whole message, so the
 * two marks are the same chevron drawn once and twice, and a player who has
 * learned one has learned the other.
 *
 * Drawn as heavy open strokes rather than filled bands. A filled chevron keeps
 * its outline stroke on top of its fill (`solid`), and two of them stacked in a
 * mark printed at a dozen pixels close up into one shape. A heavy stroke with
 * round caps keeps a clear gap between the two at that size. The weights are
 * set per path, heavier than the house weight, because the mark is printed
 * smaller than any other mark on the board: a corner boss on a unit's badge.
 *
 * The same grid as every house mark (`MARK_BOX`, 64), so it prints through the
 * same two printers: the tile atlas traces it onto a parchment boss at the
 * badge's corner (`drawRankCell`, `src/render3d/badges3d.ts`), and the DOM masks
 * the SVG below in the colour of the surface (the unit panel, the garrison row
 * on a city banner).
 */

import { MARK_BOX, MARK_STROKE, type MarkPath, markSvg } from './resourceMarks';
import type { RankId } from '../sim/rulesData';

/** The rank marks, in the simulation's rank order. The list is the atlas's cell order. */
export const RANK_MARK_IDS: readonly RankId[] = ['veteran', 'elite'];

export interface RankMark {
  /** What it depicts, for the reader of this file. Never printed. */
  note: string;
  paths: readonly MarkPath[];
}

/**
 * The two drawings.
 *
 * Every chevron has the same shape: feet nineteen units either side of the
 * centre line, the point eighteen units above them. The Veteran's single
 * chevron sits on the centre of the box. The Elite's two are twenty units
 * apart, which leaves a gap of about eight units between them across the
 * strokes, and are drawn a little lighter so the pair takes up no more room
 * than the single chevron does in weight.
 */
const RANK_MARKS: Record<RankId, RankMark> = {
  veteran: {
    note: 'one chevron, point up',
    paths: [{ d: 'M13 41L32 23L51 41', width: 11 }],
  },
  elite: {
    note: 'two chevrons, point up, one above the other',
    paths: [
      { d: 'M13 31L32 13L51 31', width: 9 },
      { d: 'M13 51L32 33L51 51', width: 9 },
    ],
  },
};

/** One mark by id. Total over the union, because the table is a `Record`. */
export function rankMark(id: RankId): RankMark {
  return RANK_MARKS[id];
}

/** One mark as a standalone SVG document, inked in `color`. */
export function rankMarkSvg(id: RankId, color = '#000'): string {
  return markSvg(rankMark(id).paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, for a DOM surface that masks it in
 * `currentColor`. Memoised, because the unit panel and the city banners are
 * rebuilt often and the string never changes.
 */
const uriCache = new Map<string, string>();

export function rankMarkDataUri(id: RankId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(rankMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}
