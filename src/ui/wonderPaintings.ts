/**
 * Which wonders have a painted picture, and where the file is.
 *
 * The paintings are the user's splash art: one 16:9 JPEG a wonder in
 * `public/art/splash/wonders/`, named by the wonder's row id and made from the
 * full-size masters by `scripts/splashArt.py` (`public/art/splash/README.md`).
 *
 * The list is written out, not read from the folder, because a file in
 * `public/` is not part of the module graph: the page cannot ask which files
 * exist without a request that may fail. `test/ui/wonderPaintings.test.ts`
 * holds the list to the folder in both directions, so a painting added without
 * a line here, or a line without its file, fails the core tests.
 *
 * Some ids are wonders that the wonders rework adds
 * (`docs/plans/wonders-review-2026-11-18.md`) and that have no row yet. Their
 * paintings wait here and show when a row with that id lands. If the build
 * gives a row another id, rename the file and the line.
 */

/** Row ids of the wonders with a painting. The file is `<id>.jpg`. */
export const WONDER_PAINTINGS: readonly string[] = [
  'alhambra',
  'angkorWat',
  'chichenItza',
  'circusMaximus',
  'colossus',
  'forbiddenCity',
  'greatLibrary',
  'greatLighthouse',
  'greatMosqueOfDjenne',
  'greatSphinx',
  'greatStelaeOfAksum',
  'greatWall',
  'greatZiggurat',
  'hagiaSophia',
  'hangingGardens',
  'houseOfWisdom',
  'ironPillar',
  'libraryOfAshurbanipal',
  'machuPicchu',
  'mausoleum',
  'notreDame',
  'petra',
  'pyramidOfTheSun',
  'pyramids',
  'solomonsTemple',
  'statueOfZeus',
  'stonehenge',
  'templeOfArtemis',
  'templeOfThoth',
  'terracottaArmy',
  'theOracle',
  'theatreOfDionysus',
  'wallsOfUruk',
  'weiyangPalace',
];

/** The folder the page loads the paintings from (a path under `public/`). */
export const WONDER_PAINTINGS_PATH = '/art/splash/wonders/';

const PAINTED = new Set(WONDER_PAINTINGS);

/** The address of a wonder's painting, or `null` when it has none. */
export function wonderPaintingUrl(id: string): string | null {
  return PAINTED.has(id) ? `${WONDER_PAINTINGS_PATH}${id}.jpg` : null;
}
