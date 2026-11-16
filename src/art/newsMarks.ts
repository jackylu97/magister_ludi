/**
 * The marks for the news: the bead, an age that opens, and a Triumph.
 *
 * The Scholar's Study boards (`docs/plans/mockups/scholars-study/Marks.dc.html`,
 * approved by the user on 2026-10-16) give each kind of news its own drawn
 * mark, in place of the Unicode characters that used to lead a toast:
 *
 *   - **The bead** replaces `◉` on the top bar, in the toasts and in the
 *     Compendium. It is a pierced glass bead on its wire. At 32 px and more it
 *     shows as glass (`BEAD_GLASS_PATHS`).
 *   - **An age** is the sun on the horizon.
 *   - **A Triumph** is the arch.
 *
 * The other two news marks already exist, so they are not drawn again here:
 * a great person is the laurel (`RENOWN_MARK`, `meterMarks.ts`), and research
 * is the compass star (`CORNER_STAR`, `src/ui/deviceMarks.ts`).
 *
 * The paths are copied from the board without change. They use the yield
 * marks' 24-unit grid and their 2.75 stroke, so the news marks and the yield
 * marks read as one set at toast size.
 */

import { type MarkPath, markSvg } from './resourceMarks';
import { YIELD_MARK_BOX, YIELD_MARK_STROKE } from './yieldMarks';

/** One news mark: what it shows, and its paths. */
export interface NewsMarkDrawing {
  note: string;
  paths: readonly MarkPath[];
}

function stroke(d: string): MarkPath {
  return { d, width: YIELD_MARK_STROKE };
}

/** The glass bead on its wire: the wire's two ends, the bead, and its glint. */
export const BEAD_MARK: NewsMarkDrawing = {
  note: 'a pierced glass bead on its wire',
  paths: [
    stroke('M1.6 12H5.6'),
    stroke('M18.4 12H22.4'),
    stroke('M5.6 12a6.4 6.4 0 1 0 12.8 0a6.4 6.4 0 1 0 -12.8 0Z'),
    stroke('M8.7 9.9A4.2 4.2 0 0 1 11.6 7.9'),
  ],
};

/** The sun on the horizon: an age opens. */
export const AGE_MARK: NewsMarkDrawing = {
  note: 'the sun rising on the horizon',
  paths: [
    stroke('M2.4 18H21.6'),
    stroke('M6.6 18A5.4 5.4 0 0 1 17.4 18'),
    stroke('M6.63 12.63L4.93 10.93'),
    stroke('M12 10.4L12 8'),
    stroke('M17.37 12.63L19.07 10.93'),
    stroke('M4.8 21.4H8.6M15.4 21.4H19.2'),
  ],
};

/** The arch: a Triumph. */
export const TRIUMPH_MARK: NewsMarkDrawing = {
  note: 'a triumphal arch',
  paths: [
    stroke('M4.4 21V9.6H19.6V21'),
    stroke('M3.2 6.6H20.8V9.6H3.2Z'),
    stroke('M9.4 21V15.6A2.6 2.6 0 0 1 14.6 15.6V21'),
    stroke('M2.4 21H21.6'),
  ],
};

/**
 * The bead as glass, for 32 px and more: a gilt body at 45%, a white glint,
 * then the outline at a stroke of 2. The board draws it this way; at toast
 * size the plain outline reads better, so this is only for large marks.
 */
export function beadGlassSvg(color = '#1d1a20'): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M5.6 12a6.4 6.4 0 1 0 12.8 0a6.4 6.4 0 1 0 -12.8 0Z" fill="#ecc154" fill-opacity="0.45"/>' +
    '<path d="M8.4 9.2A4.4 4.4 0 0 1 11.4 7.4" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.4" stroke-linecap="round"/>' +
    `<g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    '<path d="M1.6 12H5.6"/><path d="M18.4 12H22.4"/>' +
    '<path d="M5.6 12a6.4 6.4 0 1 0 12.8 0a6.4 6.4 0 1 0 -12.8 0Z"/>' +
    '<path d="M8.7 9.9A4.2 4.2 0 0 1 11.6 7.9"/></g></svg>'
  );
}

const uriCache = new Map<string, string>();

/** One news mark as a `data:` URI, for a CSS mask. Memoised. */
export function newsMarkDataUri(mark: NewsMarkDrawing, color = '#000'): string {
  const key = `${mark.note}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(markSvg(mark.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color))}`;
  uriCache.set(key, uri);
  return uri;
}

/**
 * A wax seal's edge: a scalloped disc on the 64-unit grid, copied from the
 * Ornament board's war seal. Filled, not stroked.
 */
export const SEAL_EDGE =
  'M60.8 32L60.21 33.85L58.77 35.52L57.23 37.02L56.34 38.52L56.36 40.27L56.94 42.33L57.36 44.5L56.94 46.4L55.51 47.71L53.42 48.44L51.34 48.96L49.82 49.82L48.96 51.34L48.44 53.42L47.71 55.51L46.4 56.94L44.5 57.36L42.33 56.94L40.27 56.36L38.52 56.34L37.02 57.23L35.52 58.77L33.85 60.21L32 60.8L30.15 60.21L28.48 58.77L26.98 57.23L25.48 56.34L23.73 56.36L21.67 56.94L19.5 57.36L17.6 56.94L16.29 55.51L15.56 53.42L15.04 51.34L14.18 49.82L12.66 48.96L10.58 48.44L8.49 47.71L7.06 46.4L6.64 44.5L7.06 42.33L7.64 40.27L7.66 38.52L6.77 37.02L5.23 35.52L3.79 33.85L3.2 32L3.79 30.15L5.23 28.48L6.77 26.98L7.66 25.48L7.64 23.73L7.06 21.67L6.64 19.5L7.06 17.6L8.49 16.29L10.58 15.56L12.66 15.04L14.18 14.18L15.04 12.66L15.56 10.58L16.29 8.49L17.6 7.06L19.5 6.64L21.67 7.06L23.73 7.64L25.48 7.66L26.98 6.77L28.48 5.23L30.15 3.79L32 3.2L33.85 3.79L35.52 5.23L37.02 6.77L38.52 7.66L40.27 7.64L42.33 7.06L44.5 6.64L46.4 7.06L47.71 8.49L48.44 10.58L48.96 12.66L49.82 14.18L51.34 15.04L53.42 15.56L55.51 16.29L56.94 17.6L57.36 19.5L56.94 21.67L56.36 23.73L56.34 25.48L57.23 26.98L58.77 28.48L60.21 30.15L60.8 32Z';

/**
 * A seal: the scalloped disc in `ground`, with a device pressed into it in
 * `device`. The device is drawn on its own 64 grid and set in the middle 36
 * units, as the board sets the war seal's crossed swords.
 */
function sealSvg(ground: string, device: string, deviceInk: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    `<path d="${SEAL_EDGE}" fill="${ground}"/>` +
    `<svg x="14" y="14" width="36" height="36" viewBox="0 0 64 64">` +
    `<g fill="none" stroke="${deviceInk}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${device}</g>` +
    '</svg></svg>'
  );
}

/** The crossed swords of the war seal (the Ornament board). */
const CROSSED_SWORDS =
  '<path d="M12 54L44 18"/><path d="M54 8L47.5 21.5L40.5 14.5Z" fill="#f7f2e1"/>' +
  '<path d="M52 54L20 18"/><path d="M10 8L23.5 14.5L16.5 21.5Z" fill="#f7f2e1"/>';

/**
 * The war seal: war red, with crossed swords in parchment. It stands beside an
 * empire's name in the diplomacy roster when the two of you are at war, in
 * place of the red stripe down the seat's edge (the Ornament board,
 * approved). The colours are the tokens' values (`--war-red`, `--parchment`),
 * because an image cannot read a custom property.
 */
export function warSealDataUri(): string {
  return `data:image/svg+xml,${encodeURIComponent(sealSvg('#9b1b3a', CROSSED_SWORDS, '#f7f2e1'))}`;
}

/**
 * The page's seal: iron-gall ink, with a ring pressed into it. It leads the
 * card that says a newer build is out, in place of its red stripe: that card
 * is about the page, not the game, so it is in ink (the Ornament board).
 */
export function pageSealDataUri(): string {
  return `data:image/svg+xml,${encodeURIComponent(
    sealSvg('#1d1a20', '<path d="M18 32a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/>', '#f7f2e1'),
  )}`;
}
