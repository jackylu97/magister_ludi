/**
 * The marks a **town** flies beside its seat's charge — one today, and the set
 * is opened rather than the charge table widened.
 *
 * The user's ruling of 2026-09-09 (`docs/flags.md`, (hhh) 5: *"cities that are
 * puppeted should have an indicator in their banner"*). A banner already says
 * two things — whose town this is (the seat's charge, on the hoist) and what it
 * believes (the religion's canton, on the fly) — and a puppet is a third fact of
 * exactly that kind: a standing condition of the town, legible across the table,
 * that a player needs to be able to read without clicking anything.
 *
 * Why its own table and not a thirteenth charge
 * --------------------------------------------
 * A charge belongs to a **seat** and is chosen by the player; twelve of them are
 * a closed union whose *order* re-banners every game that never named one
 * (`heraldryMarks.ts` says so). A town mark belongs to the **town** and is
 * chosen by the rules. Putting the yoke in that list would have made it a charge
 * a seat could fly, and moved every seat past it one place along.
 *
 * The hand is the same, and that is not negotiable: same grid (`MARK_BOX` 64),
 * same weight (`MARK_STROKE`), same helpers, so a yoke and a crescent an inch
 * apart on the same flag read as two marks in one alphabet rather than as one
 * mark and a sticker. It is traced into the tile atlas by `drawCityMarkCell`
 * (`src/render3d/badges3d.ts`) exactly as a charge is — ink on a little field of
 * parchment, for the argument `CHARGE_CELLS` makes at length: twelve seat
 * colours run from `sky` to `ink`, and one ink cannot read on both.
 */

import {
  MARK_BOX,
  MARK_STROKE,
  type MarkPath,
  dot,
  ink,
  markSvg,
} from './resourceMarks';

/** The town marks, as ids. One today; the list is the atlas's cell order. */
export type CityMarkId = 'puppet';

/** In table order. Appended to, never reordered — an index is a texture coordinate. */
export const CITY_MARK_IDS: readonly CityMarkId[] = ['puppet'];

export interface CityMark {
  /** What it depicts, for the reader of this file. Never printed. */
  note: string;
  paths: readonly MarkPath[];
}

/**
 * The **yoke**: a bowed beam with two bows hanging under it.
 *
 * Chosen over a chain, which was the other candidate and is the wrong drawing at
 * this size — a chain is a row of small closed shapes, and a row of small closed
 * shapes at twenty pixels is a smudge. A yoke is one long horizontal stroke with
 * two hoops under it, which is a silhouette that survives being small and is not
 * confusable with any charge in the other table (nothing there is a bar).
 *
 * It also says the right thing. A yoke is what a beast draws a plough in: the
 * town works, and it works for somebody else. That is precisely what a puppet is
 * in the rules — everything it makes is its captor's, and none of what it does
 * is its captor's to choose.
 */
const CITY_MARKS: Record<CityMarkId, CityMark> = {
  puppet: {
    note: 'a yoke — a bowed beam over two bows',
    paths: [
      // The beam, bowed a little so it reads as a shaped timber rather than as
      // an underline. Ends squared off by the round cap, which is the same cap
      // every stroke in this hand wears.
      ink('M11 27Q32 20 53 27'),
      // The two bows. Half-circles rather than full ones: a closed ring under a
      // beam is a keyhole, and the open shape is what makes the pair read as
      // something a neck goes through.
      ink('M17 27A9.5 9.5 0 0 0 32 27'),
      ink('M32 27A9.5 9.5 0 0 0 47 27'),
      // The peg through the beam's middle — the one detail that fixes the mark
      // as a fitting rather than as a bridge, and the only filled shape on it.
      { d: dot(32, 23.5, 3.2), fill: true, width: 0 },
    ],
  },
};

/** One mark by id. Total over the union — the table is a `Record`. */
export function cityMark(id: CityMarkId): CityMark {
  return CITY_MARKS[id];
}

/**
 * One mark as a standalone SVG document, inked in `color`.
 *
 * `heraldryMarkSvg`'s sibling through the same emitter on the same grid at the
 * same weight, which is the whole of why the two sets are one hand. The flair
 * gallery draws its stall from this.
 */
export function cityMarkSvg(id: CityMarkId, color = '#000'): string {
  return markSvg(cityMark(id).paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, for a DOM surface that masks it in
 * `currentColor`. Memoised exactly as heraldry's is, and for its reason: a panel
 * rebuilt on every state change would otherwise re-encode an SVG a frame.
 */
const uriCache = new Map<string, string>();

export function cityMarkDataUri(id: CityMarkId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(cityMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}
