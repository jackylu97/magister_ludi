/**
 * Which great people have a painted portrait, and where the file is.
 *
 * The portraits are the user's splash art: one 5:6 JPEG a person in
 * `public/art/splash/people/`, named by the person's row id and made from the
 * full-size masters by `scripts/splashArt.py people`
 * (`public/art/splash/README.md`). The first twenty arrived on 2026-11-19. A
 * person with no portrait shows their family's emblem in the window
 * (`greatPersonPicture` in `greatPersonCard.ts`).
 *
 * The list is written out, not read from the folder, for the reason
 * `wonderPaintings.ts` gives: a file in `public/` is not part of the module
 * graph, so the page cannot ask which files exist.
 * `test/ui/greatPersonPaintings.test.ts` holds the list to the folder in both
 * directions.
 */

/** Row ids of the great people with a portrait. The file is `<id>.jpg`. */
export const GREAT_PERSON_PAINTINGS: readonly string[] = [
  'alJazari',
  'alKhwarizmi',
  'archimedes',
  'aristotle',
  'boudica',
  'eaNasir',
  'enheduanna',
  'hannibal',
  'homer',
  'ibnSina',
  'imhotep',
  'marcoPolo',
  'mimarSinan',
  'murasakiShikibu',
  'rumi',
  'sappho',
  'subutai',
  'tomoeGozen',
  'vitruvius',
  'zhangQian',
];

/** The folder the page loads the portraits from (a path under `public/`). */
export const GREAT_PERSON_PAINTINGS_PATH = '/art/splash/people/';

const PAINTED = new Set(GREAT_PERSON_PAINTINGS);

/** The address of a great person's portrait, or `null` when there is none. */
export function greatPersonPaintingUrl(id: string): string | null {
  return PAINTED.has(id) ? `${GREAT_PERSON_PAINTINGS_PATH}${id}.jpg` : null;
}
