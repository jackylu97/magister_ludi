/**
 * The age paintings: three sets of four, and which set a game shows.
 *
 * The user made three sets of age paintings, landscapes (`form`), still lifes
 * (`still`) and abstracts (`abstract`), one painting for each of the four ages
 * (`docs/plans/ui-critique-2026-10-16.md`, "The age paintings: three sets, one
 * a game"). The files are 16:9 JPEGs in `public/art/splash/ages/`, named by
 * the set and the age (`form2.jpg`), made by `scripts/splashArt.py ages`.
 *
 * The user's ruling: "each game will have a consistent set, but game to game
 * the themes will vary and be randomly chosen." So every age plate in one game
 * shows the same set, and the set comes from a hash of the game's seed. The
 * hash is `hash3`, the interface's own integer arithmetic (`leaderSelect.ts`
 * deals the Random leader the same way), on a stream of its own. It never uses
 * the sim's `Rng` (hard rule 4), so choosing a picture cannot change a seeded
 * outcome. A save carries its seed, so a loaded game shows the set it showed
 * before.
 *
 * The list is written out, not read from the folder, for the reason
 * `wonderPaintings.ts` gives: a file in `public/` is not part of the module
 * graph. `test/ui/agePaintings.test.ts` holds the list to the folder in both
 * directions.
 */

import { hash3 } from '../render3d/hash';

/** The three sets, in the order the hash picks from. */
export const AGE_PAINTING_SETS = ['form', 'still', 'abstract'] as const;
export type AgePaintingSet = (typeof AGE_PAINTING_SETS)[number];

/** The paintings in the folder. The file is `<name>.jpg`. */
export const AGE_PAINTINGS: readonly string[] = [
  'abstract1',
  'abstract2',
  'abstract3',
  'abstract4',
  'form1',
  'form2',
  'form3',
  'form4',
  'still1',
  'still2',
  'still3',
  'still4',
];

/** The folder the page loads the paintings from (a path under `public/`). */
export const AGE_PAINTINGS_PATH = '/art/splash/ages/';

/**
 * The hash's stream. Its own number, so that this choice does not follow the
 * Random leader or the rivals' order, which hash the same seed on other streams.
 */
const SET_STREAM = 0xa9e5;

/** The set of paintings a game with this seed shows. The same seed always gives the same set. */
export function agePaintingSet(seed: number): AgePaintingSet {
  return AGE_PAINTING_SETS[hash3(seed, 0, SET_STREAM) % AGE_PAINTING_SETS.length]!;
}

const PAINTED = new Set(AGE_PAINTINGS);

/** The address of one painting, or `null` when the folder has none for that set and age. */
export function agePaintingUrl(set: AgePaintingSet, age: number): string | null {
  const name = `${set}${age}`;
  return PAINTED.has(name) ? `${AGE_PAINTINGS_PATH}${name}.jpg` : null;
}
