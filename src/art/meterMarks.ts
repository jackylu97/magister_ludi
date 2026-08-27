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

import { type MarkPath, dot, leaf, markSvg } from './resourceMarks';
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
 * **Drawn rather than vendored**, which is the one place this file departs from
 * its own docblock, and the departure is the subject's fault: neither Lucide nor
 * Tabler carries a laurel, and the nearest thing in either (`award`, a medal on
 * a ribbon) says *a prize somebody was given* where renown means *what the world
 * says about you*. The house hand already draws when a set has no answer — see
 * the sea serpent in `marginaliaMarks.ts` — and the `leaf` helper the resource
 * marks are built out of is exactly the primitive a wreath is made of, so the
 * drawing is in the same hand by construction rather than by care.
 *
 * The geometry is **computed, not typed**, for `dot`'s reason one step further:
 * a wreath is two mirrored branches and eight leaves growing off them at angles
 * that follow the arc, and sixteen hand-tuned coordinate pairs would be sixteen
 * chances for one leaf to sit crooked. Two numbers describe it — where a leaf
 * sits on the arc, and how far the arc has come round — and everything else
 * falls out of them.
 */

/** Where the wreath is centred, and how wide it opens. The whole tuning. */
const LAUREL = {
  cx: 12,
  cy: 12.2,
  radius: 5.6,
  /** Degrees along the arc, from the bottom of the wreath, per branch. */
  from: 8,
  to: 132,
  /** How far a leaf leans out of the arc, in degrees. 0 would lie flat on it. */
  lean: 14,
  /**
   * The spine's weight, lighter than the set's.
   *
   * The one place this drawing overrides the family, and it is the wreath's own
   * proportion that asks for it: at the set's 2.75 the branch is nearly half the
   * radius it is bending round, and the leaves grow out of a rope rather than a
   * stem. `markSvg` takes a per-path width for exactly this.
   */
  spine: 2.2,
} as const;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A point on the wreath's arc, at `theta` degrees in SVG's own (y-down) frame. */
function onArc(theta: number): { x: number; y: number } {
  return {
    x: LAUREL.cx + LAUREL.radius * Math.cos(radians(theta)),
    y: LAUREL.cy + LAUREL.radius * Math.sin(radians(theta)),
  };
}

/**
 * One branch: the spine, then its leaves from the foot of the wreath upward.
 *
 * `side` is `1` for the left branch (which sweeps clockwise in SVG's frame, so
 * its angles *increase* from the bottom) and `-1` for the right, which is the
 * same walk mirrored. Everything below is written once and run twice.
 *
 * A leaf's *base* sits on the arc and its body grows outward, so the centre the
 * `leaf` helper wants is offset half a leaf along its own direction — which is
 * the tangent leaned `LAUREL.lean` degrees toward the outside, so the leaves
 * fan the way a real branch's do rather than standing perpendicular.
 */
function laurelBranch(side: 1 | -1): MarkPath[] {
  // 90° is the bottom of the circle in SVG's y-down frame; the branch walks
  // away from it in whichever direction this side turns.
  const start = 90 + side * LAUREL.from;
  const end = 90 + side * LAUREL.to;
  const head = onArc(start);
  const tail = onArc(end);
  const paths: MarkPath[] = [
    // `sweep` is 1 for increasing angles, which is the left branch — the same
    // `side` that decides everything else.
    {
      d:
        `M${round(head.x)} ${round(head.y)}A${LAUREL.radius} ${LAUREL.radius} 0 0 ` +
        `${side === 1 ? 1 : 0} ${round(tail.x)} ${round(tail.y)}`,
      width: LAUREL.spine,
    },
  ];
  // **Three** leaves per branch rather than four, and it is a legibility
  // decision rather than a botanical one: this mark is read at 12.5px on the
  // top bar, where four leaves a side merge into a rope and the wreath reads as
  // a horseshoe. Three, each half again as long, keep their gaps at chip size.
  // The last is shorter so the wreath tapers into its opening rather than
  // ending on a full leaf.
  const stops = [20, 62, 104];
  const lengths = [5.2, 5.4, 4.6];
  stops.forEach((along, index) => {
    const theta = 90 + side * along;
    const base = onArc(theta);
    // The tangent, leaned outward: a leaf points along the branch's travel and
    // a little away from its centre.
    const angle = theta + side * (90 - LAUREL.lean);
    const length = lengths[index]!;
    // Half a leaf, plus a hair, so the base *meets* the spine rather than
    // swallowing it — a leaf drawn through the branch reads as a blot.
    const reach = length / 2 + 0.7;
    const cx = base.x + reach * Math.cos(radians(angle));
    const cy = base.y + reach * Math.sin(radians(angle));
    // Filled with **no outline at all** — `markSvg`'s "weight zero" convention —
    // rather than through `solid`, whose lighter stroke is calibrated for the
    // resource marks' 64-unit grid and would swell a 4-unit leaf into a blob on
    // this one. A leaf is a silhouette; it has no rim.
    paths.push({ d: leaf(round(cx), round(cy), length, 1.45, angle), fill: true, width: 0 });
  });
  return paths;
}

/** The laurel, in the same shape a meter mark takes. */
export const RENOWN_MARK: MeterMark = {
  note: 'a laurel wreath: two branches of four leaves, open at the crown',
  credit: 'drawn in the house hand — see the docblock',
  paths: [...laurelBranch(1), ...laurelBranch(-1)],
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
