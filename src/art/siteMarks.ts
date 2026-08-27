/**
 * The drawn site marks: one ink pictogram per kind of discovery site, on the
 * **house 64-unit grid** at the house weight.
 *
 * Why a second file rather than two more rows over there
 * -----------------------------------------------------
 * The house drawing language is shared and deliberately so — `MARK_BOX`,
 * `MARK_STROKE`, `ink` and `solid`, and every silhouette helper come from
 * `resourceMarks.ts`, which is where that language lives. The *resource* table
 * itself no longer speaks it: since the one-hand pass (2026-08-27) all forty-one
 * resource marks are on Tabler's 24-unit box at 2.75, because a resource mark is
 * read at twelve pixels on a hex. A site marker is read on its own hex tablet
 * with nothing competing, so it stays where the heraldry and the card lines are —
 * 64 units is the right grid for a drawing that is allowed detail, and
 * `public/sprites/CREDITS.md` records the split.
 *
 * What is *not* shared, and never was, is the thing being drawn. A resource mark names a commodity: something the ground
 * carries, that a citizen works, that shows up in a yield. A site mark names an
 * **event**: something that happens once, to whoever gets there first, and then
 * is gone. Keying both off one registry would invite exactly the confusion the
 * board is trying to avoid, which is a player reading a ruin as an economy.
 *
 * The board says the same thing a second way, in the paper under the mark: site
 * markers are printed on a hex tablet in their own rim ink rather than on any of
 * the three resource silhouettes (see `icons.sitePaper` in `data/view3d.json` and
 * `drawSiteCell` in `src/render3d/badges3d.ts`). Shape *and* colour, for the
 * reason the resource kinds carry both — colour alone fails a colourblind player.
 *
 * Two kinds and no fallback
 * -------------------------
 * `DiscoveryKind` is a closed union of two members declared in TypeScript, not an
 * open table of JSON rows, so there is no "a kind nobody drew" case to fall back
 * from: the record is exhaustive and the compiler says so. That is the one place
 * this file is *unlike* the resource marks, and it follows from the data rather
 * than from a preference — see `resourceMark`'s `null` contract for the other
 * shape, and why that table needs one.
 *
 * The camp is not here on purpose. A barbarian camp is an occupation rather than
 * ground (see the two fog rules in `src/render3d/sites3d.ts`): it is drawn only
 * where a seat can see it *right now*, it is already unmistakable as a black
 * stockade in the diorama, and a standing pin over it would be a label on a thing
 * that is about to be burnt down. The explorer lens marks camps with a hostile
 * ring instead, which is a warning and not a name.
 */

import { type MarkPath, ink, poly } from './resourceMarks';
import type { DiscoveryKind } from '../sim/discoveryData';

/**
 * One site's drawing, plus the sentence that says what it depicts.
 *
 * Structurally `ResourceMark`, and identical on purpose rather than by accident:
 * both are fed to the same tracer in the atlas and to the same SVG emitter, so
 * the shape is the interface between the drawing language and its two printers.
 * A separate name because the two tables answer different questions — see the
 * module docblock — and a shared one would make `siteMark('wheat')` typecheck.
 */
export interface SiteMark {
  /** What the mark is a picture of. The row `CREDITS.md` prints. */
  note: string;
  paths: readonly MarkPath[];
}

/**
 * Every drawn site mark, keyed by kind. Exhaustive by type, unlike the resource
 * table — see the module docblock.
 *
 * Both are drawn as *architecture on a ground line*, which is the whole of what
 * separates them at a glance: a ruin is stone that has fallen, a village is
 * thatch that is standing. Nothing in either is a plant, a tool or a lump of
 * metal, so neither can be mistaken for a member of the resource set even before
 * the paper under it disagrees.
 */
const SITE_MARKS: Record<DiscoveryKind, SiteMark> = {
  ruins: {
    note: 'a snapped column on its plinth, a second stump beside it',
    paths: [
      // The ground, then the plinth both stones stand on: what makes the two
      // shafts read as one *place* rather than as two loose objects.
      //
      // Both are held well short of the grid's full width, unlike most resource
      // marks, and that is the hex paper's doing: a hexagon narrows toward its
      // point, so the widest ink in a site mark sits where a circle would have
      // had room to spare and a hexagon has none. See `MarkerPaperStyle.shape`.
      ink('M8 58H56'),
      ink(poly(12, 52, 52, 52, 55, 58, 9, 58)),
      ink(poly(17, 46, 40, 46, 40, 52, 17, 52)),
      // The shaft, walked up its left edge, across a jagged break, and back down
      // the right. The break rises to the right so the silhouette is asymmetric
      // — a clean horizontal top would read as a pillar somebody built that way.
      ink('M21 46V22L26 27L30 17L34 24L38 13V46'),
      // Two flutes, stopping short of the break: fluting is what says the stone
      // was *dressed*, which is the difference between a ruin and a boulder.
      ink('M26 42V30M33 42V28'),
      ink('M44 52V36L47 40L50 34V52'),
    ],
  },
  village: {
    note: 'two thatched cones on the ground, the near one with its doorway',
    paths: [
      ink('M6 52H58'),
      ink('M10 52L26 15L42 52'),
      // One band of thatch, bowed: a plain triangle is a tent or a mountain, and
      // the sag of a lashed course is the cheapest mark that says neither.
      ink('M15 41C21 38 31 38 37 41'),
      ink('M22 52V44A4 4 0 0 1 30 44V52'),
      // The second cone, smaller and set to one side. A single hut is a dwelling;
      // two are a settlement, which is what the site actually is.
      ink('M42 52L50 29L58 52'),
    ],
  },
};

/** The drawing for one kind of discovery site. Total, by construction. */
export function siteMark(kind: DiscoveryKind): SiteMark {
  return SITE_MARKS[kind];
}
