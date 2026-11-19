/**
 * The two ending paintings and where the files are.
 *
 * The ending page of the Opus close (`opusClose.ts`) shows one painting over
 * the whole window: `win.jpg` when the seat reading the page closed the Great
 * Work, and `loss.jpg` when another seat did. The files are the user's splash
 * art in `public/art/splash/endings/`, made from the full-size masters by
 * `scripts/splashArt.py endings` (`public/art/splash/README.md`).
 *
 * The list is written out, not read from the folder, because a file in
 * `public/` is not part of the module graph (the reason `wonderPaintings.ts`
 * gives). `test/ui/endingPaintings.test.ts` holds the list to the folder in
 * both directions.
 */

/** The ending paintings by name. The file is `<name>.jpg`. */
export const ENDING_PAINTINGS = ['loss', 'win'] as const;

/** The folder the page loads the paintings from (a path under `public/`). */
export const ENDING_PAINTINGS_PATH = '/art/splash/endings/';

/** The address of the painting for a win (`true`) or a loss (`false`). */
export function endingPaintingUrl(win: boolean): string {
  return `${ENDING_PAINTINGS_PATH}${win ? 'win' : 'loss'}.jpg`;
}
