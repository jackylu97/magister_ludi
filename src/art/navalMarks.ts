/**
 * The naval badges: five drawn **hulls**, one per age, and three **cantons**,
 * one per class — fifteen marks from eight drawings.
 *
 * Path data, never a fetched file, which is the whole of CLAUDE.md's badge trap
 * read forwards rather than repaired afterwards. The twenty-one class badges in
 * `public/sprites/icons/` are SVG files and were allowed to stay so because each
 * is printed in exactly one place and has therefore never paid the cost a file
 * charges (one colour, one fetch, one blank cell when a name is wrong). A naval
 * badge could not have taken that bargain even if it wanted to: it is
 * *composed* — a hull of one age with a class's mark in the corner — and two
 * fetched files cannot be composed without a third that is the pair, which is
 * fifteen files where there are eight drawings.
 *
 * So the set is data, it goes through `paintMarkPaths` like every mark in the
 * tile atlas, and the composition happens in the canvas at atlas build
 * (`drawNavalBadgeCell` in `src/render3d/badges3d.ts`).
 *
 * The two grids
 * -------------
 * Both sets are on **Tabler's 24-unit box** at the house's vendored weight of
 * 2.75, because that is the grid the twenty-one badge files are drawn on and a
 * naval badge stands beside them in the same atlas at the same size. A 64-unit
 * house drawing would have been a heavier mark in a lighter set.
 *
 * The five hulls, and what each rank actually changes
 * ---------------------------------------------------
 * The rank is read at twelve pixels over a piece, so each step has to change the
 * *silhouette* and not the detail — the same argument the sculpt roster made
 * when fifteen models became eight:
 *
 *     I    oars and a pennant   — a bare hull, a line of oars beneath it, one
 *                                 streamer aft. No mast at all: the absence is
 *                                 the rank, and it is the only mark in the set
 *                                 with nothing standing above the sheer.
 *     II   one square sail      — a mast and one sail. The first vertical.
 *     III  sail and a tower     — the same rig with a fighting castle aft, which
 *                                 is the one *box* in the set.
 *     IV   two masts            — two verticals, the forward one shorter, sails
 *                                 narrowed so two fit where one was.
 *     V    three masts          — three verticals under a full rig. Read against
 *                                 IV it is a count, which is the cheapest rank a
 *                                 reader can resolve at size.
 *
 * The three cantons are **Tabler outline drawings** (MIT), inlined here rather
 * than vendored as files for the reason above — see `public/sprites/CREDITS.md`,
 * which names each one. They are printed small, on the badge's parchment corner,
 * exactly as a seat's heraldic charge is: chevrons for the light line (forward,
 * fast), the rook for the heavy (the tower ship's castle, and the line), the
 * crosshair for the ranged.
 *
 * Which row wears which is the **roster's** own two fields, `UnitDef.masts` and
 * `UnitDef.canton`, so a thirteenth hull is a JSON row and this file does not
 * move — and the sculpt reads the same `masts`, which is what makes a piece and
 * its badge agree about what age it is from.
 */

import { type MarkPath, ink, solid } from './resourceMarks';

/** The grid both sets are drawn on. Tabler's, like the badge files. */
export const NAVAL_MARK_BOX = 24;

/** The weight both sets are stroked at, in grid units. The vendored house 2.75. */
export const NAVAL_MARK_STROKE = 2.2;

/** The lighter weight the canton's filled shapes are outlined at. */
const CANTON_FILLED = 1.6;

/** How a hull is rigged: the number on the roster row. */
export type NavalRig = 1 | 2 | 3 | 4 | 5;

/** Which class the canton names. `UnitDef.canton`'s three values. */
export type NavalCanton = 'chevrons' | 'rook' | 'crosshair';

/** Every rig, in rank order — the flair page reads this to lay out its rows. */
export const NAVAL_RIGS: readonly NavalRig[] = [1, 2, 3, 4, 5];

/** Every canton, in the order the three classes are listed in the design. */
export const NAVAL_CANTONS: readonly NavalCanton[] = ['chevrons', 'rook', 'crosshair'];

/** One drawing, plus the sentence that says what it depicts. `SiteMark`'s shape. */
export interface NavalMark {
  /** What the mark is a picture of. The row `CREDITS.md` prints. */
  note: string;
  paths: readonly MarkPath[];
  /** Where the drawing came from — upstream and its licence, or this hand. */
  credit: string;
}

/**
 * The hull every rank is drawn on: a shallow curve from bow to stern, closed
 * across the sheer.
 *
 * Shared rather than repeated so that five marks are unmistakably one set — a
 * rank that redrew the boat would read as a different kind of thing rather than
 * as the same thing later.
 */
const HULL = 'M3 18h18l-2.2 3.2H5.2Z';

/** A mast at `x`, standing from the sheer up to `top`. */
const mast = (x: number, top: number): string => `M${x} 18V${top}`;

export const NAVAL_HULLS: Record<NavalRig, NavalMark> = {
  1: {
    note: 'a bare hull over a line of oars, one pennant streaming aft',
    credit: 'drawn here, in Tabler’s geometry',
    paths: [
      ink(HULL),
      // The oars: four short strokes under the sheer, angled aft. They are the
      // only thing below the hull line in the set, which is what makes the
      // absence of a mast read as *oars* rather than as an unfinished drawing.
      ink('M6 21.5l-1.6 1.6M10 21.5l-1.6 1.6M14 21.5l-1.6 1.6M18 21.5l-1.6 1.6'),
      // The staff and its streamer, aft, held low so the mark has no vertical to
      // be confused with rank II's mast.
      ink('M4.5 18V13'),
      ink('M4.5 13.4c2.2-1.2 4-.2 6 .9'),
    ],
  },
  2: {
    note: 'one mast under a single square sail',
    credit: 'drawn here, in Tabler’s geometry',
    paths: [
      ink(HULL),
      ink(mast(12, 3)),
      // The yard, then the sail as a bellied rectangle. Bellied rather than
      // square because a rectangle at this weight is a flag, and a curve on the
      // leech is the cheapest mark that says canvas.
      ink('M7 6h10'),
      ink('M7 6v8c3.4 1.4 6.6 1.4 10 0V6'),
    ],
  },
  3: {
    note: 'a square sail with a fighting castle aft',
    credit: 'drawn here, in Tabler’s geometry',
    paths: [
      ink(HULL),
      ink(mast(11, 3)),
      ink('M6.5 6h9'),
      ink('M6.5 6v7.5c3 1.3 6 1.3 9 0V6'),
      // The castle: the one box in the set, and the whole of rank III. Solid so
      // it reads as mass at size — a tower drawn open is a window frame.
      solid('M17 18v-5h4.5v5Z'),
    ],
  },
  4: {
    note: 'two masts, the forward one shorter, under narrowed sails',
    credit: 'drawn here, in Tabler’s geometry',
    paths: [
      ink(HULL),
      ink(mast(8.5, 5)),
      ink(mast(15.5, 3)),
      ink('M5.5 7.5h6'),
      ink('M5.5 7.5v6c2 .9 4 .9 6 0V7.5'),
      ink('M12.5 5.5h6'),
      ink('M12.5 5.5v8c2 .9 4 .9 6 0V5.5'),
    ],
  },
  5: {
    note: 'three masts under a full rig',
    credit: 'drawn here, in Tabler’s geometry',
    paths: [
      ink(HULL),
      ink(mast(6.5, 7)),
      ink(mast(12, 3)),
      ink(mast(17.5, 7)),
      // Three sails, the middle one taller. The outer pair are held short so the
      // silhouette has a peak rather than a wall — a rig of three equal sails is
      // a comb.
      ink('M4.5 9h4M4.5 9v5c1.4.7 2.6.7 4 0V9'),
      ink('M9.5 5.5h5M9.5 5.5v8.5c1.7.8 3.3.8 5 0V5.5'),
      ink('M15.5 9h4M15.5 9v5c1.4.7 2.6.7 4 0V9'),
    ],
  },
};

/**
 * The three class marks, printed on the badge's parchment corner.
 *
 * Tabler outline drawings, inlined. Each is scaled and placed by the atlas
 * painter, so the coordinates here are the full 24-unit box exactly as upstream
 * authored them — a mark pre-shrunk into a corner would be a mark nobody could
 * check against its source.
 */
export const NAVAL_CANTON_MARKS: Record<NavalCanton, NavalMark> = {
  chevrons: {
    note: 'two chevrons pointing forward — the light line: nimble, and gone',
    credit: 'Tabler Icons “chevrons-right” (MIT)',
    paths: [ink('M7 7l5 5l-5 5'), ink('M13 7l5 5l-5 5')],
  },
  rook: {
    note: 'a chess rook — the heavy line: the tower ship’s castle, and the line',
    credit: 'Tabler Icons “chess-rook” (MIT)',
    paths: [
      ink('M8 9V5h2v2h4V5h2v4'),
      ink('M8 9h8l-1 5H9Z'),
      ink('M9 14l-1 5h8l-1-5'),
      ink('M6.5 19h11'),
    ],
  },
  crosshair: {
    note: 'a ringed crosshair — the ranged line: it strikes at a distance',
    credit: 'Tabler Icons “crosshair” (MIT)',
    paths: [
      ink('M12 5.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13'),
      ink('M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4'),
      { d: 'M12 10.6a1.4 1.4 0 1 0 0 2.8a1.4 1.4 0 1 0 0-2.8', fill: true, width: CANTON_FILLED },
    ],
  },
};
