/**
 * The title page.
 *
 * The landing screen is the first thing anybody sees and was, until this pass,
 * the plainest surface in the game: a marquee card with the name on it and a
 * form underneath. Entry VII's fiction says the interface is the magister's
 * apparatus, and the front of an apparatus is a **frontispiece** — the engraved
 * title page of a book, with generous margins, a rule under the title, the
 * printing house's device beneath that, and an epigraph in the margin.
 *
 * What this module owns is the two things on that page that are not fixed
 * markup: which epigraph is showing, and the device's picture. Everything else
 * — the title, the subtitle, the stamp, every button caption — is `index.html`,
 * unchanged and deliberately so. **No string on this screen is renamed.** The
 * epigraph is the one line of new copy, and it carries no rules information,
 * which is the naming bible's own condition on flavour.
 *
 * `Math.random`, and why it is allowed here
 * -----------------------------------------
 * The sim may not touch it (CLAUDE.md, rule: all randomness through the seeded
 * `Rng` in `GameState`). This is not the sim: there is no game yet when this
 * screen is up, the choice is never logged, never saved and never replayed, and
 * two players who see two different epigraphs are looking at two title pages
 * rather than at two worlds. So the roll is an argument with a default, which
 * costs nothing and makes the pick testable without a DOM.
 */

import { printerDeviceMarkUrl } from './deviceMarks';

/**
 * The epigraphs, one drawn per visit.
 *
 * Latin tags with their sense after the dash, which is how a title page has
 * always set one — the tag is the ornament and the gloss is the courtesy. Two
 * rules held every line here:
 *
 *   · **Nothing carries rules information.** An epigraph that hinted at a
 *     mechanic would be flavour text doing a tooltip's job, which the naming
 *     bible forbids outright.
 *   · **Nothing is quoted from Hesse.** The game's name is a homage and the
 *     text is not ours to print.
 *
 * The register is Entry VII's: hermetic, courtly, a scholar at a table. Never
 * portentous — this is a person about to play a game, not a person about to
 * open a tomb.
 */
export const EPIGRAPHS: readonly string[] = [
  'Ars longa, vita brevis — the craft is long, the life is short.',
  'Sic itur ad astra — thus one goes to the stars.',
  'Non omnis moriar — not all of me shall die.',
  'Festina lente — make haste, slowly.',
  'Qui docet, discit — whoever teaches, learns.',
  'Ludus speculum mundi — the game is a mirror of the world.',
];

/**
 * One epigraph, chosen by a roll in `[0, 1)`.
 *
 * Total for every finite `roll`, including the ones no sane caller passes: a
 * title page that threw because a number came back as exactly 1 would be a
 * blank first screen, which is the worst possible place in this program to have
 * an exception. Clamped rather than modulo'd, because clamping is the reading
 * that stays right if the pool ever changes length.
 */
export function pickEpigraph(roll: number): string {
  const count = EPIGRAPHS.length;
  const index = Number.isFinite(roll) ? Math.floor(roll * count) : 0;
  return EPIGRAPHS[Math.min(count - 1, Math.max(0, index))]!;
}

/** The elements the title page fills in. Absent ones are simply not dressed. */
export interface FrontispieceElements {
  /** The printer's device — masked, so it takes the page's ink. */
  device: HTMLElement | null;
  /** The epigraph line under it. */
  epigraph: HTMLElement | null;
}

/**
 * Dresses the title page: the device's picture, and a fresh epigraph.
 *
 * Called every time the landing is *shown*, not once at boot, which is the
 * whole of what "per visit" means — a player who restarts is opening the book
 * again and gets a different line in the margin. The device is written every
 * time too, and costs nothing: `printerDeviceMarkUrl` is memoised.
 *
 * Text, never markup. An epigraph is data like a city's name is data, and data
 * never gets to be HTML (`turnSplash.ts`'s rule, and the same one here).
 */
export function dressFrontispiece(
  elements: FrontispieceElements,
  roll: number = Math.random(),
): void {
  const { device, epigraph } = elements;
  if (device) device.style.setProperty('--device-mark', printerDeviceMarkUrl());
  if (epigraph) epigraph.textContent = pickEpigraph(roll);
}
