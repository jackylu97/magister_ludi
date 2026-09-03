/**
 * The HUD dock's own marks: Statecraft's scroll and Diplomacy's banner.
 *
 * A fourth vendored set, two icons deep
 * -------------------------------------
 * `yieldMarks.ts` and `meterMarks.ts` each carry a closed, exhaustive table
 * because each keys off a closed union the sim declares (`YieldKey`,
 * `MeterId`). The HUD dock's three buttons are not that: Statecraft and
 * Diplomacy are screens, not meters, and Religion's button is the faith
 * **yield**'s own mark worn at dock scale — see `src/ui/hudDock.ts` for why
 * that one is a reuse rather than a second drawing of the same flame. So this
 * file holds the two the dock had to have drawn and no table shaped to hold
 * more.
 *
 *   statecraft  Lucide `scroll-text`  (ISC) — a scroll: an Order is a writ,
 *               and the dock's button opens the screen that reads them
 *   diplomacy   Lucide `flag`         (ISC) — a herald's banner: the mark an
 *               envoy carries, and the one thing a declaration and a peace
 *               have in common. Deliberately **not** crossed swords: the
 *               screen behind it is where a war is ended as well as begun,
 *               and an icon that only meant war would be lying half the time
 *
 * Same grid, same weight, same two printers
 * ------------------------------------------
 * `YIELD_MARK_BOX`/`YIELD_MARK_STROKE` are imported rather than redeclared —
 * one number for "the grid" and one for "the weight" is what keeps a future
 * change from silently forking a set — and `markSvg` is the same emitter the
 * other three vendored sets use, so a fifth mask mechanism was never written.
 *
 * The upstream drawing is reproduced to the coordinate, pure outline
 * (`fill="none"`, one weight, round caps and joins) like every member of the
 * other three sets; `test/ui/hudDock.test.ts` pins the path data against the
 * vendored string.
 */

import { type MarkPath, markSvg } from './resourceMarks';
import { YIELD_MARK_BOX, YIELD_MARK_STROKE } from './yieldMarks';

function stroke(d: string): MarkPath {
  return { d, width: YIELD_MARK_STROKE };
}

/** The scroll: two written lines, a rolled edge at each end. */
export const STATECRAFT_MARK: { note: string; credit: string; paths: readonly MarkPath[] } = {
  note: 'a scroll: two written lines, a rolled edge at each end',
  credit: 'Lucide `scroll-text` (ISC)',
  paths: [
    stroke('M15 12h-5'),
    stroke('M15 8h-5'),
    stroke('M19 17V5a2 2 0 0 0-2-2H4'),
    stroke(
      'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3',
    ),
  ],
};

/** The banner: a herald's flag on its staff. */
export const DIPLOMACY_MARK: { note: string; credit: string; paths: readonly MarkPath[] } = {
  note: "a herald's banner on its staff",
  credit: 'Lucide `flag` (ISC)',
  paths: [
    stroke('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'),
    stroke('M4 22v-7'),
  ],
};

/** The scroll as a standalone SVG document, inked in `color`. */
export function statecraftMarkSvg(color = '#000'): string {
  return markSvg(STATECRAFT_MARK.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI. Memoised for the reason every other
 * mark cache here is: a card that rebuilds on every HUD refresh should not be
 * re-encoding the same string every time.
 */
const uriCache = new Map<string, string>();

export function statecraftMarkDataUri(color = '#000'): string {
  const cached = uriCache.get(`statecraft:${color}`);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(statecraftMarkSvg(color))}`;
  uriCache.set(`statecraft:${color}`, uri);
  return uri;
}

/** The banner as a standalone SVG document, inked in `color`. */
export function diplomacyMarkSvg(color = '#000'): string {
  return markSvg(DIPLOMACY_MARK.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color);
}

/** The banner as a `data:` URI. `statecraftMarkDataUri`'s twin, same cache. */
export function diplomacyMarkDataUri(color = '#000'): string {
  const cached = uriCache.get(`diplomacy:${color}`);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(diplomacyMarkSvg(color))}`;
  uriCache.set(`diplomacy:${color}`, uri);
  return uri;
}
