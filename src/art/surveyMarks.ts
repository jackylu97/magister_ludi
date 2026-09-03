/**
 * The survey's own mark: **something sleeps under this hill**.
 *
 * One drawing, and it is the only mark in the project that is deliberately about
 * a thing nobody has identified yet. Every other family names what it names — a
 * resource, a site, a yield, a seat — while this one is printed *instead* of a
 * name: an empire that holds Geomancy is shown where a seam lies and never which
 * one, because the kind is what a turn of surveying buys (see `prospectAt` in
 * `src/sim/improvements.ts`, and `seatSeesSleepingVein` beside it).
 *
 * So it may not look like a commodity
 * ------------------------------------
 * That is the one hard constraint on the drawing, and it is why the mark is not
 * a lump, a crystal or a nugget: any of those would be read against the forty-one
 * resource marks and answered as one of them, which is exactly the promise the
 * reveal gate exists to keep. What is drawn instead is *the hill and the fact* —
 * the ground line, the hill standing on it, and under it two broken courses that
 * describe strata without describing any content. A broken stroke is the
 * cartographer's own word for "surveyed by inference", and it carries no
 * identity at all.
 *
 * Printed the way a marginale is
 * ------------------------------
 * Bare ink on the vellum, no paper under it, in the chart's faded hand
 * (`icons.inscriptionColor` — "faint" in an alpha-tested atlas is a *colour*,
 * never an opacity; see `IconsLook.inscriptionScale`'s docblock for the trap).
 * A roundel is a token laid on the board and a tablet is a site standing on it;
 * this is a **note in the margin of a hex** — the surveyor's guess, not the
 * board's fact — and the printing has to say so before the drawing does.
 *
 * House grid, house weight, like every other original mark here: 64 units at
 * `MARK_STROKE`, so it sets at the same optical size as the site tablets it will
 * sometimes stand beside (a ruin may sit on a hill with a seam under it, which
 * is why `sites3d.ts` plants the two on opposite shoulders of the hex).
 */

import { MARK_BOX, MARK_STROKE, type MarkPath, ink, markSvg } from './resourceMarks';

/**
 * The survey marks that are drawn. A list of one, declared as a list for the
 * marginalia's reason: the atlas addresses cells by set *and* member, so a set
 * with one member and a set with six are the same shape to every consumer, and
 * a second sleeping-ground mark (the sea floor was discussed and parked) costs
 * a row rather than a refactor.
 */
export const SURVEY_MARK_IDS = ['sleepingVein'] as const;
export type SurveyMarkId = (typeof SURVEY_MARK_IDS)[number];

/** One survey mark's drawing, plus the sentence that says what it depicts. */
export interface SurveyMark {
  note: string;
  paths: readonly MarkPath[];
}

const SURVEY_MARKS: Record<SurveyMarkId, SurveyMark> = {
  sleepingVein: {
    note: 'a hill on the ground line, and under it two broken courses — something lies there, unread',
    paths: [
      // The surface, drawn first and full width: everything else in the mark is
      // positioned as *above* or *below* it, and a reader who cannot find the
      // ground line cannot read either half.
      ink('M5 32H59'),
      // The hill. A dome rather than a peak — a peak is a mountain, and a
      // mountain is the one terrain a survey can never be spent on.
      ink('M12 32C18 16 46 16 52 32'),
      // Two courses of broken stroke under the ground, staggered so they read as
      // strata rather than as a dashed line. Their gaps are the whole content of
      // the mark: what is down there is drawn as *interruptions*, which is the
      // only honest picture of a thing nobody has dug up.
      //
      // The two courses are set twelve units apart rather than ten, which is the
      // clearance the house weight needs before the pair merges into a slab at
      // the size a hex actually prints them.
      ink('M12 44H24'),
      ink('M30 44H42'),
      ink('M48 44H56'),
      ink('M8 56H16'),
      ink('M22 56H34'),
      ink('M40 56H52'),
    ],
  },
};

/** The drawing for one survey mark. Total, by construction. */
export function surveyMark(id: SurveyMarkId): SurveyMark {
  return SURVEY_MARKS[id];
}

/** One survey mark as a standalone SVG document, inked in `color`. */
export function surveyMarkSvg(id: SurveyMarkId, color = '#000'): string {
  return markSvg(surveyMark(id).paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, for a DOM surface that masks it in
 * `currentColor`. Memoised exactly as the marginalia's is.
 */
const uriCache = new Map<string, string>();

export function surveyMarkDataUri(id: SurveyMarkId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(surveyMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}
