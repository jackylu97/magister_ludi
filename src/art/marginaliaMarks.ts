/**
 * The chart's marginalia: what a cartographer draws in the part of the sea he
 * has never been to.
 *
 * Two members and they are not the same kind of thing, which is the whole
 * reason this module exists rather than a row in one of the others:
 *
 *   the serpent      a drawing, in the house hand, on the house grid — the sea
 *                    serpent that swims across Terra Incognita.
 *   the inscription  *words*. `hic svnt dracones`, set rather than drawn, in
 *                    letterspaced small caps at reduced strength (Entry VII's
 *                    inscription voice, which the panels use too).
 *
 * Everything else in `src/art/` names a thing the game has: a resource, a site,
 * a yield, a seat. These name **the absence of a thing**, which is why they are
 * the only purely decorative marks in the project and why they are printed
 * without any paper under them (see `MARGINALIA_CELLS` in
 * `src/render3d/badges3d.ts`). A roundel is a token laid on the board; a
 * marginale is drawn *into* the vellum.
 *
 * Why the serpent stopped being a file
 * ------------------------------------
 * It was the last mark in the game loaded over the network — one SVG under
 * `public/`, fetched at boot, rasterised through a scratch canvas to recolour
 * it. Ported here verbatim (the five subpaths below are the file's five, to the
 * coordinate, which is how the port was checked) it buys what every other set
 * bought when it moved: no fetch that can fail, no cell that can print blank
 * because somebody renamed a file, one ink decided by data rather than baked
 * into an export — and, the new one, a **DOM printer**, so the chart's monster
 * can appear in a legend or a gallery beside the twelve charges.
 */

import { MARK_BOX, MARK_STROKE, type MarkPath, ink, markSvg } from './resourceMarks';

/**
 * The marginalia that are *drawn*. The inscription is deliberately not a member:
 * it has no paths, and a table of drawings with one wordless hole in it is a
 * table every consumer has to special-case.
 */
export const MARGINALIA_MARK_IDS = ['serpent'] as const;
export type MarginaliaMarkId = (typeof MARGINALIA_MARK_IDS)[number];

/** One marginale's drawing, plus the sentence that says what it depicts. */
export interface MarginaliaMark {
  note: string;
  paths: readonly MarkPath[];
}

const MARGINALIA_MARKS: Record<MarginaliaMarkId, MarginaliaMark> = {
  serpent: {
    note: 'a sea serpent coiled out of the water, jawed and finned',
    paths: [
      // The coil and the body, one continuous stroke from the tail's curl
      // through the arch of the back to the base of the neck. It is drawn as a
      // *single* path because a serpent in two pieces is two eels.
      ink('M9 46C9 34 21 34 21 44C21 54 6 55 6 41C6 25 26 22 36 26C46 30 50 22 46 16'),
      ink('M46 16C44 11 49 7 53 9C58 11 58 18 53 19L47 20'),
      ink('M53 12L57 12'),
      ink('M46 20L41 25'),
      ink('M52 20L52 25'),
    ],
  },
};

/** The drawing for one marginale. Total, by construction. */
export function marginaliaMark(id: MarginaliaMarkId): MarginaliaMark {
  return MARGINALIA_MARKS[id];
}

/**
 * The inscription, one line per row.
 *
 * Two lines rather than one because an atlas cell is **square** (see
 * `badgeAtlasLayout`) and a single line of thirteen letters set across it would
 * be four pixels tall on the board. Broken at the natural caesura, it sets as a
 * plate — which is what an inscription on a chart actually looks like.
 *
 * Lower case in the data and small caps on the canvas: the letterforms are the
 * printer's decision (`drawInscriptionCell`), and a caller that wanted the words
 * for a tooltip or an annal line wants them as words.
 */
export const DRACONES_LINES = ['hic svnt', 'dracones'] as const;

/**
 * The inscription as one line of prose, for anything that says it rather than
 * sets it.
 */
export const DRACONES_TEXT = DRACONES_LINES.join(' ');

/** One marginale as a standalone SVG document, inked in `color`. */
export function marginaliaMarkSvg(id: MarginaliaMarkId, color = '#000'): string {
  return markSvg(marginaliaMark(id).paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, for a DOM surface that masks it in
 * `currentColor`. Memoised exactly as the resources' and the charges' are.
 */
const uriCache = new Map<string, string>();

export function marginaliaMarkDataUri(id: MarginaliaMarkId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(marginaliaMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}
