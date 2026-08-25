/**
 * The two empire-meter marks: happiness and authority, drawn rather than typed.
 *
 * Vendored, not drawn — one set over
 * -----------------------------------
 * `yieldMarks.ts` retired six emoji for six vendored Lucide/Tabler pictograms;
 * these two retire the last placeholder characters the top bar carried. `☺`
 * and `⚜` were "placeholder glyphs by project policy" (design ledger, Entry
 * XIV.C — "the ledger wants theatre masks and a wax seal... and those are
 * drawn art rather than a code change"). Now that the six yield voices read as
 * drawn ink rather than platform emoji, sitting two Unicode characters beside
 * them was the interface's one remaining seam. These join the same vendored
 * language, picked by hand the way the six were:
 *
 *   happiness  Lucide `smile`  (ISC) — a face, unmistakable at chip size and
 *              legible where a comedy mask (Entry XIV.C's first suggestion)
 *              blurs into a blob at eleven pixels
 *   authority  Lucide `stamp`  (ISC) — the wax-seal/writ identity the design
 *              language already names directly: "the wax seal — a signet
 *              stamp that reads 'how far does the Magister's writ run?'"
 *
 * Both passed the squint test at chip size in a browser check, so neither of
 * the sanctioned alternates (`crown`, `scale`) was needed.
 *
 * Same grid, same weight — imported, not re-declared
 * ---------------------------------------------------
 * `YIELD_MARK_BOX` and `YIELD_MARK_STROKE` are reused rather than copied: two
 * constants naming the same numbers twice is how a future weight change
 * updates one file and silently forks the set. `YIELD_MARK_SCALE` is *not*
 * reused — that number insets a mark for the board's printed disc, and these
 * two never reach the board; they only ever sit in a DOM chip or a card
 * heading, where there is no rim to keep clear of.
 *
 * The one edit made to upstream
 * ------------------------------
 * `smile`'s face is a `<circle>` upstream, exactly as three of the six yield
 * marks were; converted to path data with `dot()`, the same helper and the
 * same reason — a mark in this project is always a `d` string, never a shape
 * element, because both printers below take exactly one kind of thing.
 *
 * `test/render/meterMarks.test.ts` pins the path data against the vendored
 * strings, the same discipline `yieldMarks.test.ts` holds the six to.
 */

import { type MarkPath, dot, markSvg } from './resourceMarks';
import { YIELD_MARK_BOX, YIELD_MARK_STROKE } from './yieldMarks';
// Type-only: `sim/meters.ts` is pure sim and imports nothing from `src/art`,
// so there is no cycle to guard against here the way `yieldMarks.ts` guards
// against one with `badges3d.ts` — but the import stays type-only anyway,
// because nothing at runtime should ever need more than the union of names.
import type { MeterId } from '../sim/meters';

/** One meter's drawing, plus where it came from. */
export interface MeterMark {
  /** What the mark is a picture of. */
  note: string;
  /** The upstream icon: set, name and licence. */
  credit: string;
  paths: readonly MarkPath[];
}

/** A stroked path at the yield set's weight — every member of both marks here. */
function stroke(d: string): MarkPath {
  return { d, width: YIELD_MARK_STROKE };
}

/**
 * Both meter marks, keyed by `MeterId` and exhaustive, for the reason
 * `YIELD_MARKS` is a `Record` rather than a table: a third meter would stop
 * this file compiling until somebody had picked it an icon.
 */
export const METER_MARKS: Readonly<Record<MeterId, MeterMark>> = {
  happiness: {
    note: 'a smiling face: two eyes, a curved mouth, a ringed outline',
    credit: 'Lucide `smile` (ISC)',
    paths: [
      stroke('M15 10V9'),
      stroke('M16.472 15a6 6 0 01-8.943 0'),
      stroke('M9 10V9'),
      // Upstream `<circle cx="12" cy="12" r="10"/>`.
      stroke(dot(12, 12, 10)),
    ],
  },
  authority: {
    note: 'a hand stamp: the head and its handle, set on the page it marks',
    credit: 'Lucide `stamp` (ISC)',
    paths: [
      stroke('M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13'),
      stroke(
        'M20 15.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z',
      ),
      stroke('M5 22h14'),
    ],
  },
};

/** The drawing for one meter. Total, by construction — see the table. */
export function meterMark(key: MeterId): MeterMark {
  return METER_MARKS[key];
}

// --- the SVG export ---------------------------------------------------------

/**
 * One meter mark as a standalone SVG document, inked in `color`.
 *
 * The same emitter the yield marks and the resource marks use — `markSvg` in
 * `resourceMarks.ts` — so a third vendored grid shares the printer rather than
 * growing a third copy that drifts.
 */
export function meterMarkSvg(mark: MeterMark, color = '#000'): string {
  return markSvg(mark.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI. Never null: there is no undrawn meter to
 * answer for, the same guarantee `yieldMarkDataUri` makes.
 *
 * Memoised for the reason the yield and resource caches are — a hover card
 * rebuilds on every pointer move and the string is the same every time.
 */
const uriCache = new Map<string, string>();

export function meterMarkDataUri(key: MeterId, color = '#000'): string {
  const cacheKey = `${key}|${color}`;
  const cached = uriCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(meterMarkSvg(meterMark(key), color))}`;
  uriCache.set(cacheKey, uri);
  return uri;
}
