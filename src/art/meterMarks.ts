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
 * The third mark, and the file's own exception closing
 * -----------------------------------------------------
 * `RENOWN_MARK` at the foot of the file is the family's third member and is
 * vendored on the same terms — Tabler `laurel-wreath`, 24 grid, stroke 2.75.
 * It was the one drawing here in the house hand, and the paragraphs above did
 * not apply to it; they do now. See its own docblock for what changed and why.
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

// --- renown -----------------------------------------------------------------

/**
 * The laurel: the mark for **renown**, the fifth Entry XVIII bucket
 * (`docs/great-people.md`).
 *
 * It sits in this file rather than in `yieldMarks.ts` because renown is not a
 * yield — no citizen works a tile for it, no city banks it, and it never
 * appears on the board — and it is not a member of `METER_MARKS` either,
 * because that record is keyed by `MeterId` and exhaustive **on purpose** (a
 * third meter must stop this file compiling). So it is the family's third
 * member and its own export: same grid, same weight, same printer, one more
 * drawing.
 *
 * Vendored, and no longer the exception (2026-08-27)
 * --------------------------------------------------
 * This used to be **drawn in the house hand**, computed from an arc and a lean
 * angle, because the docblock above it said neither Lucide nor Tabler carried a
 * laurel. That was wrong about Tabler, which ships `laurel-wreath`, and the
 * playtest found the consequence before the catalogue did: the hand-drawn wreath
 * "isn't very readable, needs to be same style as the other icons". Three leaves
 * a side on a bare arc is a horseshoe at chip size, and a set with one member
 * drawn by us is a set with one member that looks drawn by us.
 *
 * So the geometry is gone rather than tuned, and what replaces it is **the mark
 * the badge already wears**: `public/sprites/icons/greatPerson.svg` is this same
 * Tabler drawing at this same weight, so the HUD chip, the renown hover and the
 * badge over a great person's piece are now one picture in three places rather
 * than two pictures that have to be kept looking alike by hand.
 *
 * Pinned literally, exactly as the two meters above are: eight paths, upstream's
 * own 24-unit grid, stroke lifted 2 → 2.75 to join the family, and nothing else
 * touched. `test/render/meterMarks.test.ts` holds it to the vendored strings.
 */
export const RENOWN_MARK: MeterMark = {
  note: 'a laurel wreath: two sprays of leaves closing under a tied crown',
  credit: 'Tabler `laurel-wreath` (MIT)',
  paths: [
    stroke('M6.436 8a8.6 8.6 0 0 0 -.436 2.727c0 4.017 2.686 7.273 6 7.273s6 -3.256 6 -7.273a8.6 8.6 0 0 0 -.436 -2.727'),
    stroke('M14.5 21s-.682 -3 -2.5 -3s-2.5 3 -2.5 3'),
    stroke('M18.52 5.23c.292 1.666 -1.02 2.77 -1.02 2.77s-1.603 -.563 -1.895 -2.23c-.292 -1.666 1.02 -2.77 1.02 -2.77s1.603 .563 1.895 2.23'),
    stroke('M21.094 12.14c-1.281 1.266 -3.016 .76 -3.016 .76s-.454 -1.772 .828 -3.04c1.28 -1.266 3.016 -.76 3.016 -.76s.454 1.772 -.828 3.04'),
    stroke('M17.734 18.826c-1.5 -.575 -1.734 -2.19 -1.734 -2.19s1.267 -1.038 2.767 -.462c1.5 .575 1.733 2.19 1.733 2.19s-1.267 1.038 -2.767 .462'),
    stroke('M6.267 18.826c1.5 -.575 1.733 -2.19 1.733 -2.19s-1.267 -1.038 -2.767 -.462c-1.5 .575 -1.733 2.19 -1.733 2.19s1.267 1.038 2.767 .462'),
    stroke('M2.906 12.14c1.281 1.266 3.016 .76 3.016 .76s.454 -1.772 -.828 -3.04c-1.281 -1.265 -3.016 -.76 -3.016 -.76s-.454 1.772 .828 3.04'),
    stroke('M5.48 5.23c-.292 1.666 1.02 2.77 1.02 2.77s1.603 -.563 1.895 -2.23c.292 -1.666 -1.02 -2.77 -1.02 -2.77s-1.603 .563 -1.895 2.23'),
  ],
};

/** The laurel as a `data:` URI, memoised beside the two meters'. */
export function renownMarkDataUri(color = '#000'): string {
  const cacheKey = `renown|${color}`;
  const cached = uriCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(meterMarkSvg(RENOWN_MARK, color))}`;
  uriCache.set(cacheKey, uri);
  return uri;
}
