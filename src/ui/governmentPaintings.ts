/**
 * Which governments have a painted banner, and where the file is.
 *
 * The paintings are the user's splash art: one 3:1 JPEG a government in
 * `public/art/splash/governments/`, named by the government's row id
 * (`public/art/splash/README.md`), made by `scripts/splashArt.py governments`.
 * The thirteen live governments have one (2026-11-21). A government with none
 * shows the drawn mark in its window (`governmentPicture` in
 * `governmentBanner.ts`).
 *
 * The list is written out, not read from the folder, for the reason
 * `wonderPaintings.ts` gives: a file in `public/` is not part of the module
 * graph, so the page cannot ask which files exist.
 * `test/ui/governmentPaintings.test.ts` holds the list to the folder in both
 * directions.
 */

/** Row ids of the governments with a painting. The file is `<id>.jpg`. */
export const GOVERNMENT_PAINTINGS: readonly string[] = [
  'aristocracy',
  'chiefdom',
  'councilOfElders',
  'divineMandate',
  'imperium',
  'merchantLeague',
  'priestKing',
  'republic',
  'theCuria',
  'theEstates',
  'theSultanate',
  'tyranny',
  'warChief',
];

/** The folder the page loads the paintings from (a path under `public/`). */
export const GOVERNMENT_PAINTINGS_PATH = '/art/splash/governments/';

const PAINTED = new Set(GOVERNMENT_PAINTINGS);

/** The address of a government's painting, or `null` when it has none. */
export function governmentPaintingUrl(id: string): string | null {
  return PAINTED.has(id) ? `${GOVERNMENT_PAINTINGS_PATH}${id}.jpg` : null;
}
