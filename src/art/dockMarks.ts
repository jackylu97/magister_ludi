/**
 * The HUD dock's own mark: Statecraft's scroll.
 *
 * A fourth vendored set, one icon deep
 * -------------------------------------
 * `yieldMarks.ts` and `meterMarks.ts` each carry a closed, exhaustive table
 * because each keys off a closed union the sim declares (`YieldKey`,
 * `MeterId`). The HUD dock's two buttons are not that: Statecraft is a screen,
 * not a meter, and Religion's button is the faith **yield**'s own mark worn at
 * dock scale — see `src/ui/hudDock.ts` for why that one is a reuse rather than
 * a second drawing of the same flame. So there is exactly one icon to vendor
 * here, not a table shaped to hold more; a third dock button would earn this
 * file a table the way the second one did not.
 *
 *   statecraft  Lucide `scroll-text`  (ISC) — a scroll: an Order is a writ,
 *               and the dock's button opens the screen that reads them
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
  const cached = uriCache.get(color);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(statecraftMarkSvg(color))}`;
  uriCache.set(color, uri);
  return uri;
}
