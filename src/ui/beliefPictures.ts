/**
 * Which beliefs have a painted vignette, and where the file is.
 *
 * The vignettes are the user's splash art: one 1:1 JPEG a belief in
 * `public/art/splash/beliefs/`, named by the belief's row id
 * (`public/art/splash/README.md`), made by `scripts/splashArt.py beliefs`.
 * The 23 pantheon beliefs have one (2026-11-19), and the 17 follower beliefs
 * and 15 of the enhancer beliefs (2026-11-21). The Long Prayer and the retired
 * rows have none. A belief with none shows its
 * drawn mark in the arched window of its tablet on the Faith sheet's Bonuses
 * tab (`beliefPicture`).
 *
 * The list is written out, not read from the folder, for the reason
 * `wonderPaintings.ts` gives. `test/ui/beliefPictures.test.ts` holds the list to
 * the folder in both directions.
 *
 * `beliefWindowNode` draws the window itself. Three surfaces use it: the
 * tablets on the Bonuses tab, the belief tablet on the In play screen, and the
 * cards of the belief offer. So a belief looks the same when it is offered,
 * when it is held and when it is in play.
 */

import { type InPlayMarkId, inPlayMarkDataUri } from '../art/inPlayMarks';
import { element } from './dom';

/** Row ids of the beliefs with a vignette. The file is `<id>.jpg`. */
export const BELIEF_PICTURES: readonly string[] = [
  'ancestorWorship',
  'apostles',
  'cathedralsOfTheSky',
  'choirs',
  'commonTable',
  'congregation',
  'courtAugurs',
  'cultOfHeroes',
  'desertFathers',
  'ecclesia',
  'feastDays',
  'godOfTheForge',
  'goddessOfTheHarvest',
  'guildOfTheFaithful',
  'harvestBlessing',
  'herdGods',
  'holyOrder',
  'holyWater',
  'inquisition',
  'itinerantPreachers',
  'keeperOfTheCalendar',
  'keeperOfTheHearth',
  'ladyOfTheHunt',
  'lampsOfTheShrine',
  'lordOfTheHoard',
  'lordOfTheSea',
  'marvelsOfTheFaith',
  'minarets',
  'oracleOfTheCrossroads',
  'patronOfMerchants',
  'pilgrimage',
  'pilgrimsCoin',
  'reliquaries',
  'ritesOfBlood',
  'riverMother',
  'sacredCartography',
  'sacredFire',
  'spiritsOfTheWood',
  'starReaders',
  'templeSpires',
  'theAlmsBox',
  'theCrusade',
  'theEternalFlame',
  'theLongRoad',
  'theMuses',
  'theOpenKitchen',
  'thePulseOfBells',
  'theQuietHours',
  'theScriptoria',
  'theStandingStones',
  'titheHouses',
  'vineyardRites',
  'warriorMonks',
  'winterMother',
  'worldChurch',
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

/**
 * **A belief's arched window**, as one element: the vignette when the belief
 * has one (`beliefPicture`), and the drawn mark otherwise. `.faith-window` in
 * `style.css` gives the arch and the border; each surface sets the size in its
 * own rules.
 *
 * `belief` is `null` for a tablet that stands for no belief (the holy city's
 * share). `mark` is the drawn mark the window holds when there is no vignette.
 * The window is a picture only, so it is hidden from a screen reader: the name
 * beside it says what it shows.
 */
export function beliefWindowNode(belief: string | null, mark: InPlayMarkId = 'belief'): HTMLElement {
  const window = element('span', 'faith-window');
  window.setAttribute('aria-hidden', 'true');
  const picture = belief === null ? ({ kind: 'mark' } as const) : beliefPicture(belief);
  if (picture.kind === 'painted') {
    window.dataset.picture = 'painted';
    window.style.backgroundImage = `url("${picture.url}")`;
    return window;
  }
  window.dataset.picture = 'mark';
  const drawn = element('span', 'faith-window-mark');
  drawn.style.setProperty('--faith-mark', `url("${inPlayMarkDataUri(mark)}")`);
  window.append(drawn);
  return window;
}
