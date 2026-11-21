/**
 * Which leaders have a painted portrait, and where the file is.
 *
 * The portraits are the user's splash art: one 3:4 JPEG a leader in
 * `public/art/splash/leaders/`, named by the leader's row id
 * (`public/art/splash/README.md`), made by `scripts/splashArt.py leaders`.
 * Fifteen of the sixteen leaders have one (2026-11-21); Joan of Arc has none.
 * A leader with none shows the seat's charge on its ink in the portrait
 * window (`leaderPicture` in `leaderSelect.ts`).
 *
 * The list is written out, not read from the folder, for the reason
 * `wonderPaintings.ts` gives: a file in `public/` is not part of the module
 * graph, so the page cannot ask which files exist. `test/ui/leaderPortraits.test.ts`
 * holds the list to the folder in both directions.
 */

/** Row ids of the leaders with a portrait. The file is `<id>.jpg`. */
export const LEADER_PORTRAITS: readonly string[] = [
  'alexanderTheGreat',
  'cleopatra',
  'cyrusTheGreat',
  'genghisKhan',
  'harunAlRashid',
  'ibnBattutaOfTangier',
  'jayavarmanVII',
  'justinian',
  'lorenzoDeMedici',
  'mansaMusa',
  'mehmedTheConqueror',
  'nezahualcoyotl',
  'pachacuti',
  'qinShiHuang',
  'sejongTheGreat',
];

/** The folder the page loads the portraits from (a path under `public/`). */
export const LEADER_PORTRAITS_PATH = '/art/splash/leaders/';

const PAINTED = new Set(LEADER_PORTRAITS);

/** The address of a leader's portrait, or `null` when there is none. */
export function leaderPortraitUrl(id: string): string | null {
  return PAINTED.has(id) ? `${LEADER_PORTRAITS_PATH}${id}.jpg` : null;
}
