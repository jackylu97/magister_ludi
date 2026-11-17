/**
 * The three small line marks of the diplomacy sheet (batch SS6): the envelope
 * of an offer that waits for an answer, the crossed blades on Declare war, and
 * the arrow on a Read button.
 *
 * The shapes are the approved board's
 * (`docs/plans/mockups/scholars-study/diplomacy-options.html`), copied without
 * change: each keeps the board's own small box and stroke, because the marks
 * are drawn at that size and nowhere larger. The deal notice by the turn
 * button uses the same envelope, so the two places that say "an offer waits"
 * draw one mark.
 *
 * Like the other mark modules, this file emits SVG text and a `data:` URI and
 * touches no page. The interface masks `currentColor` through the URI
 * (`.court-mark` in `src/ui/diplomacyScreen.css`), so a mark takes the ink of
 * the text beside it. The Flair Cabinet shows all three.
 */

/** One court mark: what it shows, its box, and its stroked shapes. */
export interface CourtMarkDrawing {
  note: string;
  /** The board's own drawing box. */
  viewBox: string;
  width: number;
  height: number;
  stroke: number;
  /** SVG shape elements, stroked in the mark's colour and never filled. */
  shapes: string;
}

export const COURT_MARK_IDS = ['envelope', 'war', 'arrow'] as const;
export type CourtMarkId = (typeof COURT_MARK_IDS)[number];

export const COURT_MARKS: Record<CourtMarkId, CourtMarkDrawing> = {
  envelope: {
    note: 'an envelope: an offer from another empire waits for your answer (the rail, the column, the notice)',
    viewBox: '0 0 16 12',
    width: 16,
    height: 12,
    stroke: 1.5,
    shapes: '<rect x="0.75" y="0.75" width="14.5" height="10.5"/><path d="M1 1l7 6 7-6"/>',
  },
  war: {
    note: 'two crossed blades, on Declare war',
    viewBox: '0 0 14 14',
    width: 13,
    height: 13,
    stroke: 1.6,
    shapes: '<path d="M2 2l9 9M12 2l-9 9M9 12l3-3M5 12L2 9" stroke-linecap="round"/>',
  },
  arrow: {
    note: 'a small right arrow, on a button that opens an offer',
    viewBox: '0 0 11 9',
    width: 11,
    height: 9,
    stroke: 1.4,
    shapes: '<path d="M0 4.5h9M6 1l3.5 3.5L6 8"/>',
  },
};

/** One court mark as SVG text, stroked in `color`. */
export function courtMarkSvg(id: CourtMarkId, color = '#000'): string {
  const mark = COURT_MARKS[id];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.viewBox}" width="${mark.width}" height="${mark.height}">` +
    `<g fill="none" stroke="${color}" stroke-width="${mark.stroke}">${mark.shapes}</g></svg>`
  );
}

const uriCache = new Map<string, string>();

/** One court mark as a `data:` URI, for a CSS mask. Memoised. */
export function courtMarkDataUri(id: CourtMarkId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(courtMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}
