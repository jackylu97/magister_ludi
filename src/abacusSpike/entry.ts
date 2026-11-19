/**
 * The entry of `abacus.html`, the Abacus's look-dev page.
 *
 * The page has two modes:
 * - with no `?stage=`, the bench (`main.ts`): the frame alone, with the demo
 *   buttons;
 * - with `?stage=bead`, `?stage=screen` or `?stage=close`, the game's own bead
 *   page, Abacus screen or Opus close (`stages.ts`), mounted with a made-up
 *   table of three seats, so the look is judged where the player meets it.
 *
 * Each mode is loaded on its own, because each brings its own stylesheet: the
 * bench has the look-dev page's, and the stages have the game's.
 *
 * The look-dev switches, read here and nowhere in the game:
 * - `?abacusPlaces=8`: the places on a rod (an open rule question; the data says 13);
 * - `?abacusFreeze=0.5`: stops each slide at that share of its time, for a still picture;
 * - `?abacusAge=3`: the age on the plaque (the stages and the bench; default 2).
 */

import { setAbacusLookDev } from '../render3d/abacus3d';

const query = new URLSearchParams(location.search);

/** A number from the query, or null when it is absent or not a number. */
function asked(name: string): number | null {
  const raw = query.get(name);
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

setAbacusLookDev({ places: asked('abacusPlaces'), freezeAt: asked('abacusFreeze') });

const stage = query.get('stage');
if (stage === 'bead' || stage === 'screen' || stage === 'close') {
  void import('./stages').then((module) => module.mountStage(stage));
} else {
  void import('./main');
}
