/**
 * A unit badge as something the DOM can wear: the atlas's own cell, printed once
 * per class into a small canvas and kept as a data URL.
 *
 * The city banner's garrison row (U8, the user 2026-09-09, `docs/flags.md`
 * (ooo)) lists the pieces standing in a town as a row of roundels above the
 * plate. Those roundels have to be *the same drawing* the board floats over the
 * piece itself, or the interface would be naming one warrior two ways — so this
 * module prints them through `badges3d.ts`'s own cell painters
 * (`drawBadgeCell` / `drawNavalBadgeCell`) rather than through a second set of
 * marks. Nothing here knows what a badge looks like; it knows how to hang one on
 * an element.
 *
 * Why a canvas and not the SVG file
 * ---------------------------------
 * Half the set has no file at all — the eighteen composed naval cells are drawn
 * from path data, hull under canton — and the half that does is authored in one
 * colour and *recoloured* on the way into the atlas (`drawBadgeCell`'s
 * `source-in` pass). A `<img src="…/warrior.svg">` here would therefore be right
 * for some pieces, wrong for the wild's inverted print, and missing entirely for
 * every ship. One printer, one answer.
 *
 * The cache, and what a key is
 * ----------------------------
 * A key is the badge class and the ink pair — the same two things that decide a
 * cell in the atlas: the nation's print (bone paper, ink mark) and the wild's
 * (`wildBadgeStyle`, the red base of the user's V2 ruling with the mark inverted
 * to bone). Nothing seat-specific is baked in: a seat's own colour is the *rim*,
 * which is a border on the element and not part of the drawing, exactly as it is
 * a separate quad on the board. So twenty-odd unit classes cost at most two
 * canvases each for the whole session, however many empires are on the map.
 *
 * A print is asynchronous only because the file half has to be fetched. The
 * element is dressed the moment the drawing exists and simply carries no mark
 * until then — which is `loadIcon`'s own bargain one layer down: a roundel with
 * no mark on it is still a roundel in the right ink, and the row still says how
 * many pieces are standing there.
 */

import {
  type BadgeClass,
  type BadgeInkStyle,
  type FileBadgeClass,
  type NavalBadgeId,
  BADGE_ICON_FILES,
  BADGE_MARK_PAIRS,
  NAVAL_CLASS_CANTON,
  badgeAtlasLayout,
  drawBadgeCell,
  drawNavalBadgeCell,
  loadIcon,
  nationBadgeStyle,
  paperRadiusFraction,
  wildBadgeStyle,
} from '../render3d/badges3d';

/**
 * The pixel box one roundel is printed at.
 *
 * Well over the ~26px it is worn at, for the reason every icon in this project
 * is rasterised large: the mark is a cutout of thin strokes, and a drawing
 * printed at its display size has nothing left to give a high-density display.
 * Smaller than the board's own atlas cell (128px) because this one is never
 * mipmapped or seen across a diorama — it is a chip in a row of chips.
 */
export const ROUNDEL_CELL = 96;

/**
 * How much larger than the element the drawing is laid, so the *paper* fills it.
 *
 * `drawBadgeCell` paints the parchment disc at `paperRadiusFraction` of the
 * cell — a little under half, because on the board that cell is a quad with the
 * rim geometry standing outside the paper. Here the element **is** the paper: it
 * carries the seat's rim as its own border and clips itself to a circle. So the
 * background is zoomed by the paper's own fraction rather than by a number typed
 * into the stylesheet, which is what keeps the two in step the day the overlap
 * is dialled.
 */
export function roundelZoom(): number {
  return 1 / (2 * paperRadiusFraction());
}

/** The two prints a cell can have, keyed as the atlas keys them. */
function styleKey(wild: boolean): string {
  return wild ? 'wild' : 'nation';
}

function cellKey(badge: BadgeClass, wild: boolean): string {
  return `${badge}|${styleKey(wild)}`;
}

/** Finished prints, by cell key. Never evicted: there are at most two per class. */
const printed = new Map<string, string>();
/** Prints in flight, so a row of six warriors fetches one file and not six. */
const printing = new Map<string, Promise<string | null>>();

/**
 * The data URL for one cell, or `null` if it has not been printed yet.
 *
 * The synchronous half, for a caller that has one — and for a test, which is the
 * only way to read this cache back without a canvas.
 */
export function roundelMark(badge: BadgeClass, wild: boolean): string | null {
  return printed.get(cellKey(badge, wild)) ?? null;
}

/**
 * Prints one cell, or returns the print already made (or in flight).
 *
 * The three-way branch is `UnitBadges.load`'s own, in its order and for its
 * reason: the **drawn** half first, so a composed naval cell is never mistaken
 * for a file class whose artwork failed to load; then a naval row that named a
 * class but no rig, which gets its line's mark alone; then the file half, whose
 * icon may resolve to `null` and still leaves a roundel rather than nothing.
 */
export function printRoundel(badge: BadgeClass, wild: boolean): Promise<string | null> {
  const key = cellKey(badge, wild);
  const done = printed.get(key);
  if (done !== undefined) return Promise.resolve(done);
  const flight = printing.get(key);
  if (flight !== undefined) return flight;
  const run = print(badge, wild ? wildBadgeStyle() : nationBadgeStyle()).then((uri) => {
    if (uri !== null) printed.set(key, uri);
    printing.delete(key);
    return uri;
  });
  printing.set(key, run);
  return run;
}

async function print(badge: BadgeClass, style: BadgeInkStyle): Promise<string | null> {
  // A one-cell atlas: the layout arithmetic is a function of the count, so
  // asking it for one is asking the shipping function rather than working out
  // an origin here.
  const layout = badgeAtlasLayout(1, 1, ROUNDEL_CELL);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext('2d');
  // No 2D context at all — a headless page, or a browser refusing one. The row
  // draws rims with no marks in them, which is the same visible-but-harmless
  // fallback the atlas makes when it cannot print.
  if (!context) return null;

  const pair = BADGE_MARK_PAIRS.get(badge as NavalBadgeId);
  if (pair) {
    drawNavalBadgeCell(context, 0, layout, pair.canton, pair.rig, style);
    return canvas.toDataURL('image/png');
  }
  const fallback = NAVAL_CLASS_CANTON[badge as keyof typeof NAVAL_CLASS_CANTON];
  if (fallback !== undefined) {
    drawNavalBadgeCell(context, 0, layout, fallback, null, style);
    return canvas.toDataURL('image/png');
  }
  const file = BADGE_ICON_FILES[badge as FileBadgeClass];
  const icon = file === undefined ? null : await loadIcon(file);
  drawBadgeCell(context, icon, 0, layout, style);
  return canvas.toDataURL('image/png');
}

/**
 * Hangs one cell's drawing on an element, now or as soon as it is printed.
 *
 * The element carries the mark as a custom property rather than as an `<img>`
 * child, so the stylesheet decides how it is laid, clipped and rimmed — and so a
 * roundel whose print has not arrived is an element with one property missing
 * rather than an element with a broken picture in it.
 *
 * `dataset.roundel` is the stamp that makes the late arrival safe. A banner's
 * row is rebuilt when the pieces standing in the town change, and an element may
 * well have been repainted for a different piece by the time an icon comes back
 * off the network; the stamp says whether the drawing that just finished is
 * still the one this element is waiting for.
 */
export function dressRoundel(element: HTMLElement, badge: BadgeClass, wild: boolean): void {
  const key = cellKey(badge, wild);
  element.dataset.roundel = key;
  const done = printed.get(key);
  if (done !== undefined) {
    element.style.setProperty('--roundel-mark', `url("${done}")`);
    return;
  }
  element.style.removeProperty('--roundel-mark');
  void printRoundel(badge, wild).then((uri) => {
    if (uri === null || element.dataset.roundel !== key) return;
    element.style.setProperty('--roundel-mark', `url("${uri}")`);
  });
}
