/**
 * The six yield marks: one drawn pictogram per voice the game counts in — food,
 * production, gold, science, culture, faith.
 *
 * Vendored, not drawn
 * -------------------
 * Every other mark in `src/art/` is original work for this project. These six
 * are not, and that is a decision rather than an accident: the yield glyphs are
 * the most-read marks in the game — they are on the top bar, on every build
 * button, on every tile of the board with the switch up — and a set that has
 * been drawn by people who draw icon sets for a living reads better at twelve
 * pixels than anything this project would author for itself. The six were picked
 * by hand from two open sets and are reproduced here to the coordinate:
 *
 *   food        Lucide `carrot`         (ISC)
 *   production  Lucide `settings`       (ISC) — the gear
 *   science     Lucide `flask-conical`  (ISC)
 *   culture     Lucide `music`          (ISC)
 *   faith       Lucide `flame`          (ISC)
 *   gold        Tabler `moneybag`       (MIT)
 *
 * `public/sprites/CREDITS.md` carries the licences and the links. Both sets are
 * permissive and neither requires attribution in a running build; it is given
 * because the work deserves it, which is the same sentence that file already
 * makes about Kenney.
 *
 * Path data, and therefore two printers
 * -------------------------------------
 * This is `resourceMarks.ts`'s argument one set over, and it is why the six
 * stopped being files under `public/sprites/icons/yields/`. A file can only be
 * one colour, and these marks are printed on a coloured disc in the atlas *and*
 * as `currentColor` in a dozen DOM surfaces that set their text in four
 * different inks. As data they are traced by `Path2D` into the atlas cell
 * (`drawYieldCell`) and emitted as a `data:` URI mask by `src/ui/yieldMark.ts`,
 * from one source, with nothing to fetch and nothing to 404 at boot — which also
 * retires the whole class of failure where a yield cell rasterised blank because
 * a file had been renamed.
 *
 * The two edits made to the upstream drawings
 * -------------------------------------------
 * 1. **`<circle>` became a path.** Three of the six use a `<circle>` element
 *    upstream (the gear's hub, the two note heads). Every member of a mark in
 *    this project is a `d` string, because both printers take exactly one kind
 *    of thing — see `dot()` in `resourceMarks.ts`, whose arithmetic is grid-
 *    agnostic and is reused here unchanged.
 * 2. **The stroke was weighted up.** See `YIELD_MARK_STROKE`.
 *
 * Nothing else was touched: no path was re-fitted, no shape was re-centred, and
 * the 24-unit grid is upstream's own. `test/render/yieldMarks.test.ts` pins the
 * path data against the vendored strings so a "tidy-up" of a curve is a failing
 * test rather than a silent redraw of somebody else's icon.
 */

import { type MarkPath, dot, markSvg } from './resourceMarks';
// Type-only, and therefore erased: `badges3d` imports this module for the
// drawings, so a value import either way round would be a cycle. The atlas's
// `YIELD_KEYS` is the one authority on what the six voices are, and this table
// is keyed by it rather than by a second union that could fall out of step.
import type { YieldKey } from '../render3d/badges3d';

/**
 * The grid these marks are authored on — upstream's, not the project's.
 *
 * 24, where every original mark in `src/art/` is drawn on 64. Kept rather than
 * rescaled because rescaling path data is how a vendored drawing quietly stops
 * being the drawing that was vendored: the numbers would no longer match the
 * upstream file and nobody could check them again. Both printers take the box as
 * a parameter instead, which cost one argument each and buys an art set that can
 * be re-vendored by copy and paste.
 */
export const YIELD_MARK_BOX = 24;

/**
 * The weight the six are stroked at, in grid units.
 *
 * Upstream ships them at 2, which is drawn for a 24-pixel toolbar icon and goes
 * spidery at the sizes this game asks for — a board pip is about ten pixels
 * across and a chip's glyph is one line-height. 2.75 is the eyeballed answer,
 * within the 2.5–3 the design pass called for, and it lands almost exactly on
 * the weight the hand-drawn set it replaces was printed at: 2.75 of 24, inset by
 * `YIELD_MARK_SCALE`, comes to ten pixels at the shipped atlas cell, against the
 * old files' 7 of 64 at ten and a half. The set did not get heavier; it stayed
 * where it was and stopped being drawn by us.
 *
 * One weight for all six, deliberately. Two of these marks are mostly curve and
 * two are mostly straight line, and a per-mark weight is how a set stops reading
 * as one set.
 */
export const YIELD_MARK_STROKE = 2.75;

/**
 * How much of a resource mark's box a yield mark is printed in, on the board.
 *
 * The reconciliation between two grids' padding conventions, and the same kind
 * of number as `SITE_MARK_SCALE` in `badges3d.ts`: geometry, not taste. This
 * project's 64-grid marks are drawn inside a safe circle and reach about 78% of
 * their box; Lucide's 24-grid marks reach about 83% of theirs. Printing both at
 * one nominal size would make the vendored set visibly the larger, and — because
 * the yield cells print on a disc rather than on the full cell — would push the
 * widest marks into the disc's rim. 0.92 puts the two sets at the same optical
 * size inside the same roundel.
 *
 * 0.88 rather than the 0.92 the extents alone suggest, and the difference is the
 * *stroke*: a mark's painted reach is its path extents plus half a stroke on
 * every side, which at this weight is another 1.4 units of 24 — enough to put
 * the carrot's leaves on the rim of their disc at the shipped cell size, which
 * reads as a printing fault rather than as a token. Eyeballed on the board,
 * where the question actually lives.
 *
 * The DOM side does not want it: a mask is sized by the text it sits beside and
 * has no rim to run into, so `.yield-mark` in `style.css` owns that end.
 */
export const YIELD_MARK_SCALE = 0.88;

/** One yield voice's drawing, plus where it came from. */
export interface YieldMark {
  /** What the mark is a picture of. The row `CREDITS.md` prints. */
  note: string;
  /** The upstream icon: set, name and licence. */
  credit: string;
  paths: readonly MarkPath[];
}

/**
 * A stroked path at this set's weight — every member of every mark here.
 *
 * All six upstream drawings are pure outline: `fill="none"`, one weight, round
 * caps and joins. Not one of them has a filled lobe, which is why there is no
 * `solid` counterpart in this file and why a mark that needed one would be a
 * mark that had stopped matching its source.
 */
function stroke(d: string): MarkPath {
  return { d, width: YIELD_MARK_STROKE };
}

/**
 * Every yield mark, keyed by voice, in `YIELD_KEYS` order.
 *
 * `Record<YieldKey, …>` and exhaustive, unlike `RESOURCE_MARKS`: the six yields
 * are a closed union declared in TypeScript rather than an open table of JSON
 * rows, so there is no "a voice nobody drew" case and no fallback to build. A
 * seventh yield would stop this file compiling until somebody had picked it an
 * icon, which is the right moment to be asked.
 */
export const YIELD_MARKS: Readonly<Record<YieldKey, YieldMark>> = {
  food: {
    note: 'a carrot, pulled, with its two leaves',
    credit: 'Lucide `carrot` (ISC)',
    paths: [
      stroke(
        'M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3',
      ),
      stroke('M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7'),
      stroke('m8 15-2.58-2.58'),
    ],
  },
  production: {
    note: 'a cogwheel, eight teeth around a hub',
    credit: 'Lucide `settings` (ISC)',
    paths: [
      stroke(
        'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915',
      ),
      // Upstream `<circle cx="12" cy="12" r="3"/>`.
      stroke(dot(12, 12, 3)),
    ],
  },
  gold: {
    note: 'a drawstring money bag',
    credit: 'Tabler Icons `moneybag` (MIT)',
    paths: [
      stroke(
        'M9.5 3h5a1.5 1.5 0 0 1 1.5 1.5a3.5 3.5 0 0 1 -3.5 3.5h-1a3.5 3.5 0 0 1 -3.5 -3.5a1.5 1.5 0 0 1 1.5 -1.5',
      ),
      stroke('M4 17v-1a8 8 0 1 1 16 0v1a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4'),
    ],
  },
  science: {
    note: 'a conical flask, filled to its line',
    credit: 'Lucide `flask-conical` (ISC)',
    paths: [
      stroke(
        'M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2',
      ),
      stroke('M6.453 15h11.094'),
      stroke('M8.5 2h7'),
    ],
  },
  culture: {
    note: 'a beamed pair of notes',
    credit: 'Lucide `music` (ISC)',
    paths: [
      stroke('M9 18V5l12-2v13'),
      // Upstream `<circle cx="6" cy="18" r="3"/>` and `<circle cx="18" cy="16" r="3"/>`.
      stroke(dot(6, 18, 3)),
      stroke(dot(18, 16, 3)),
    ],
  },
  faith: {
    note: 'a flame with its inner tongue',
    credit: 'Lucide `flame` (ISC)',
    paths: [
      stroke(
        'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
      ),
    ],
  },
};

/** The drawing for one yield voice. Total, by construction — see the table. */
export function yieldMark(key: YieldKey): YieldMark {
  return YIELD_MARKS[key];
}

// --- the SVG export ---------------------------------------------------------

/**
 * One yield mark as a standalone SVG document, inked in `color`.
 *
 * The DOM's half of "one source of truth", and the same emitter the resource
 * marks use — `markSvg` in `resourceMarks.ts`, which takes the grid and the
 * house weight as arguments precisely so a vendored set on a foreign grid could
 * share it rather than grow a second copy that drifts.
 */
export function yieldMarkSvg(mark: YieldMark, color = '#000'): string {
  return markSvg(mark.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI. Never null, unlike the resource side:
 * there is no undrawn voice to answer for.
 *
 * Memoised for the reason the resource cache is — a hover card rebuilds on every
 * pointer move and the string is the same every time.
 */
const uriCache = new Map<string, string>();

export function yieldMarkDataUri(key: YieldKey, color = '#000'): string {
  const cacheKey = `${key}|${color}`;
  const cached = uriCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(yieldMarkSvg(yieldMark(key), color))}`;
  uriCache.set(cacheKey, uri);
  return uri;
}
