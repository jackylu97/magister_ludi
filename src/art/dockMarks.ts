/**
 * The marks for the screens the HUD opens: Statecraft's scroll, Diplomacy's
 * banner, Trade's cart and the standings' ranking.
 *
 * Where they are worn
 * -------------------
 * They were drawn for the HUD dock, a row of square buttons under the research
 * card. The dock is gone: since batch UX1 the banner, the cart and the ranking
 * are the marks on the top bar's Diplomacy, Trade and Standings tabs
 * (`topBar.ts`), and since batch UX3 the empire drawer opens Statecraft from
 * its culture section, so the scroll is shown only in the flair gallery
 * (`src/flairGallery/marks.ts`). It is kept for the next surface that needs a
 * mark for Statecraft. The file keeps its name so the history reads straight.
 *
 * A fourth vendored set
 * ---------------------
 * `yieldMarks.ts` and `meterMarks.ts` each carry a closed, exhaustive table
 * because each keys off a closed union the sim declares (`YieldKey`,
 * `MeterId`). These are not that: each is a screen, not a meter, so this file
 * holds one drawing per screen and no table shaped to hold more. (The dock's
 * Religion button wore the faith **yield**'s own flame rather than a second
 * drawing of it.)
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
 * other three sets. `test/ui/topBar.test.ts` pins the tabs' marks and the
 * shared printer they go through.
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

/**
 * **The cart** — the Trade sheet's door (the Trade tab's mark since batch UX1),
 * and the third mark in this set (batch R2, the user's ruling of 2026-09-09:
 * *"The trade screen should have an icon next to the statecraft/religion/
 * diplomacy buttons"*).
 *
 * Drawn here rather than vendored, which is the one member of this file that is:
 * the outline sets carry an office, a herald and a flame, and none of them
 * carries a **bale on two wheels**. Lucide's nearest is a lorry, which is an
 * anachronism on a board where the newest thing on a road is a cart. Same grid,
 * same weight, same caps and joins as its two neighbours, so it masks and prints
 * identically and no fifth mechanism was written for it.
 *
 * A bale rather than a coin, and that is the reading: what a route *is* is goods
 * moving between two towns, and the gold is what it pays rather than what it is.
 * It is the same subject as the caravan piece's own sculpt on the board
 * (`src/render3d/geometry.ts`, the pack beast with its panniers) one scale down.
 */
export const TRADE_MARK: { note: string; credit: string; paths: readonly MarkPath[] } = {
  note: 'a cart: a strapped bale on a bed, two wheels under it',
  credit: 'drawn for Magister Ludi',
  paths: [
    // The bed, overhanging at the left where the shaft would be.
    stroke('M2 14h19'),
    // The bale, sitting on the bed, and the strap across it.
    stroke('M6 14V6h10v8'),
    stroke('M11 6v8'),
    // Two wheels, hung just under the bed.
    stroke('M10 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0'),
    stroke('M19 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0'),
  ],
};

/** The cart as a standalone SVG document, inked in `color`. */
export function tradeMarkSvg(color = '#000'): string {
  return markSvg(TRADE_MARK.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color);
}

/** The cart as a `data:` URI. `statecraftMarkDataUri`'s twin, same cache. */
export function tradeMarkDataUri(color = '#000'): string {
  const cached = uriCache.get(`trade:${color}`);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(tradeMarkSvg(color))}`;
  uriCache.set(`trade:${color}`, uri);
  return uri;
}

/**
 * **The ranking** — the standings sheet's door, and the fourth mark in this set
 * (`docs/flags.md` item (uuuuu)).
 *
 * Drawn here rather than vendored, the cart's reason exactly: the outline sets
 * carry a scroll, a herald and a flame, and none of them carries a **ranking**.
 * Three rules, longest first, each with its **bead** at the head — the game's
 * own counting vocabulary (design ledger Entry VI) rather than a bar chart,
 * which is a picture this interface has never drawn.
 *
 * Three rules and not a counting frame, which was the first drawing: a frame's
 * two uprights and two rods come out at a button's scale as a shape with dots
 * in it, where descending rules read as an order of finish at any size. It is
 * the Standings tab's mark since batch UX1; the Abacus opens from the standings
 * sheet, not from this mark.
 *
 * Same grid, same weight, same caps and joins as the three beside it, so it
 * masks and prints identically and no fifth mechanism was written for it.
 */
export const STANDINGS_MARK: { note: string; credit: string; paths: readonly MarkPath[] } = {
  note: 'a ranking: three rules, longest first, a bead at the head of each',
  credit: 'drawn for Magister Ludi',
  paths: [
    // The three places, longest first.
    stroke('M9 7h11'),
    stroke('M9 12h8'),
    stroke('M9 17h5'),
    // And the bead at the head of each.
    stroke('M6 7a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 1 1 3.2 0'),
    stroke('M6 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 1 1 3.2 0'),
    stroke('M6 17a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 1 1 3.2 0'),
  ],
};

/** The counting frame as a standalone SVG document, inked in `color`. */
export function standingsMarkSvg(color = '#000'): string {
  return markSvg(STANDINGS_MARK.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color);
}

/** The frame as a `data:` URI. `statecraftMarkDataUri`'s twin, same cache. */
export function standingsMarkDataUri(color = '#000'): string {
  const cached = uriCache.get(`standings:${color}`);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(standingsMarkSvg(color))}`;
  uriCache.set(`standings:${color}`, uri);
  return uri;
}
