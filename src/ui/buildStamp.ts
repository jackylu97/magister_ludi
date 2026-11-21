/**
 * The build stamp: which build of the game this is, and which save version it
 * reads.
 *
 * A playtester who reports a problem has to say which game they were playing.
 * The game menu prints it small under the map and the seed, in two rows (Build
 * and Saves), and a problem report (`problemReport.ts`) carries the same three
 * values.
 *
 * - `commit` is the short git commit the page was built from. `vite.config.ts`
 *   reads it once when the build starts and hands it in as `__APP_COMMIT__`.
 *   It is "dev" when the build could not ask git, and in a test run that does
 *   not load the config.
 * - `schemaVersion` is the simulation's `SCHEMA_VERSION`, which moves when a
 *   rule changes what a save means. A save from another version is refused
 *   (`saves.ts`), so this is the number that says whether a file will open.
 * - `saveFormat` is the save envelope's own version (`SAVE_FORMAT_VERSION`).
 */

import { SCHEMA_VERSION } from '../sim/state';
import { SAVE_FORMAT_VERSION } from './saves';

// Replaced at build time by `define` in `vite.config.ts`. Declared as possibly
// missing, so the guard below holds in a run that has no such define: `typeof`
// of a name nobody declared is "undefined", not an error.
declare const __APP_COMMIT__: string | undefined;

function commitOfThisBuild(): string {
  return typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ !== '' ? __APP_COMMIT__ : 'dev';
}

export interface BuildStamp {
  commit: string;
  schemaVersion: number;
  saveFormat: number;
}

/** This page's stamp. The values never change while the page is open. */
export const BUILD_STAMP: BuildStamp = {
  commit: commitOfThisBuild(),
  schemaVersion: SCHEMA_VERSION,
  saveFormat: SAVE_FORMAT_VERSION,
};

/** The menu's second row: "version 254", under the label "Saves". */
export function saveVersionLine(stamp: BuildStamp = BUILD_STAMP): string {
  return `version ${stamp.schemaVersion}`;
}

/** The stamp on one line, as the report sheet prints it: "a1b2c3d · save version 254". */
export function buildStampLine(stamp: BuildStamp = BUILD_STAMP): string {
  return `${stamp.commit} · save version ${stamp.schemaVersion}`;
}
