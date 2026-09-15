/**
 * The settler's own mark: **ground worth putting a town on**.
 *
 * It is the board's half of one reading (`src/sim/sites.ts`, `docs/flags.md`
 * item (ttttt)): the simulation ranks the hexes a seat has charted and could
 * found on, and this is what the best of them wear while a settler is in hand.
 *
 * So it may not look like a town
 * ------------------------------
 * That is the one hard constraint on the drawing, and it is what rules out every
 * obvious picture — a hut, a wall, a tower, a hearth. A town is a thing the
 * board already draws, in three dimensions, on the hexes that actually have one;
 * a mark that looked like a small one would read as a settlement somebody else
 * founded, which is the single worst thing this mark could say. What is drawn
 * instead is **the claim rather than the thing claimed**: a stake driven into
 * the ground line, with a pennant on it. A stake is a surveyor's word, not an
 * architect's, and a pennant is the oldest mark in the world for *this one is
 * spoken for* — neither of them is a building, and neither of them is on any
 * other cell of this atlas.
 *
 * Printed on parchment, unlike the survey's
 * -----------------------------------------
 * A survey note is the surveyor's guess pencilled onto his own chart, and it is
 * drawn into the vellum in the faded hand to say so. This is not a guess and not
 * a marginale — it is the board handing the player an *answer to the question
 * the settler in his hand is asking* — so it is printed the way a charge and a
 * town mark are: ink on a small parchment disc, which reads at a glance over
 * jungle, over snow and over a dark tincture alike.
 *
 * House grid, house weight, like every other original mark here: 64 units at
 * `MARK_STROKE`, so it sets at the same optical size as the site tablets it will
 * sometimes stand beside — a recommended hex may also hold ruins, and
 * `lens3d.ts` plants the two on opposite shoulders of it for that reason.
 */

import { MARK_BOX, MARK_STROKE, type MarkPath, ink, markSvg, poly } from './resourceMarks';

/**
 * The settle marks that are drawn. A list of one, declared as a list for the
 * survey's reason: the atlas addresses cells by set *and* member, so a set with
 * one member and a set with six are the same shape to every consumer, and the
 * day a site is recommended *against* (a hex the rules would take but the
 * appraisal argues away from) it costs a row rather than a refactor.
 */
export const SETTLE_MARK_IDS = ['goodSite'] as const;
export type SettleMarkId = (typeof SETTLE_MARK_IDS)[number];

/** One settle mark's drawing, plus the sentence that says what it depicts. */
export interface SettleMark {
  note: string;
  paths: readonly MarkPath[];
}

const SETTLE_MARKS: Record<SettleMarkId, SettleMark> = {
  goodSite: {
    note: 'a stake in the ground under a pennant — this hex is spoken for',
    paths: [
      // The ground line, drawn first and short: the stake has to be *in* it or
      // the mark is a flag being carried rather than a claim being left.
      ink('M16 54H48'),
      // The stake itself, from the ground to the head. A single stroke, and the
      // only vertical on the cell — everything else leans off it.
      ink('M32 54V12'),
      // The pennant: a swallow-tailed triangle off the head, filled so that the
      // mark reads at the size a hex actually prints it. Swallow-tailed rather
      // than square because a square fly is a banner and a banner belongs to a
      // seat; a pennant belongs to nobody, which is the point — the board is
      // recommending the ground, not claiming it.
      { d: poly(32, 12, 54, 19, 44, 23, 54, 27, 32, 27), fill: true, width: 0 },
      // Two short strokes at the foot, flaring off the stake. The spoil a stake
      // throws up when it is driven, and the one detail that fixes the mark as
      // something somebody *did* to this hex rather than something standing on
      // it.
      ink('M22 54L27 49'),
      ink('M42 54L37 49'),
    ],
  },
};

/** The drawing for one settle mark. Total, by construction. */
export function settleMark(id: SettleMarkId): SettleMark {
  return SETTLE_MARKS[id];
}

/** One settle mark as a standalone SVG document, inked in `color`. */
export function settleMarkSvg(id: SettleMarkId, color = '#000'): string {
  return markSvg(settleMark(id).paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, for a DOM surface that masks it in
 * `currentColor`. Memoised exactly as the survey's is.
 */
const uriCache = new Map<string, string>();

export function settleMarkDataUri(id: SettleMarkId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(settleMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}
