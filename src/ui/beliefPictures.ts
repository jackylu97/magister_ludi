/**
 * Which beliefs have a painted vignette, and where the file is.
 *
 * The vignettes are the user's splash art: one 1:1 JPEG a belief in
 * `public/art/splash/beliefs/`, named by the belief's row id
 * (`public/art/splash/README.md`), made by `scripts/splashArt.py beliefs`.
 * The 23 pantheon beliefs have one (2026-11-19). A belief with none shows its
 * drawn mark in the round window of its tablet on the Faith sheet's Bonuses
 * tab (`beliefPicture`).
 *
 * The list is written out, not read from the folder, for the reason
 * `wonderPaintings.ts` gives. `test/ui/beliefPictures.test.ts` holds the list to
 * the folder in both directions.
 */

/** Row ids of the beliefs with a vignette. The file is `<id>.jpg`. */
export const BELIEF_PICTURES: readonly string[] = [
  'ancestorWorship',
  'courtAugurs',
  'cultOfHeroes',
  'desertFathers',
  'godOfTheForge',
  'goddessOfTheHarvest',
  'herdGods',
  'keeperOfTheCalendar',
  'keeperOfTheHearth',
  'ladyOfTheHunt',
  'lordOfTheHoard',
  'lordOfTheSea',
  'oracleOfTheCrossroads',
  'patronOfMerchants',
  'ritesOfBlood',
  'riverMother',
  'sacredFire',
  'spiritsOfTheWood',
  'starReaders',
  'theMuses',
  'theStandingStones',
  'vineyardRites',
  'winterMother',
];

/** The folder the page loads the vignettes from (a path under `public/`). */
export const BELIEF_PICTURES_PATH = '/art/splash/beliefs/';

const PAINTED = new Set(BELIEF_PICTURES);

/** The address of a belief's vignette, or `null` when there is none. */
export function beliefPictureUrl(id: string): string | null {
  return PAINTED.has(id) ? `${BELIEF_PICTURES_PATH}${id}.jpg` : null;
}

/** What fills a tablet's round window: a vignette, or the belief's drawn mark. */
export type BeliefPicture = { kind: 'painted'; url: string } | { kind: 'mark' };

/**
 * **The one answer to "what is in a belief's window"**, as `wonderPicture` is
 * for a wonder: the vignette's address when the list names one, and the drawn
 * mark otherwise.
 */
export function beliefPicture(id: string): BeliefPicture {
  const url = beliefPictureUrl(id);
  return url === null ? { kind: 'mark' } : { kind: 'painted', url };
}
