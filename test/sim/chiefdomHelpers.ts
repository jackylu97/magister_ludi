/**
 * **The chiefdom's old typed chairs, as a test fixture** (batch DS9).
 *
 * Until batch DS9 the chiefdom's three chairs were one Military, one Economic
 * and one Wildcard chair. DS9 made all three Wildcard chairs (`docs/flags.md`
 * items (hhhhhhh) and (jjjjjjj)), so no card can misfit a chair at the start of
 * the game.
 *
 * Many tests of the fit rule were built on that small typed council: The Mixed
 * Constitution, Scutage, The Golden Bull, the council screen's staging and the
 * bots' choice of chair. Their subject is the rule, not the chiefdom. So a
 * describe block that needs a typed council of three calls
 * `typedChiefdomInThisBlock()`, which lends the chiefdom's row its old mix
 * before each test and gives the row back after it. It is the pattern
 * `test/sim/decks/dominion.test.ts` uses to borrow a last band, and
 * `test/sim/aiAppraisal.test.ts` to borrow a row's effects.
 *
 * It lives in a plain module because two tiers and two folders share it:
 * importing a `.test.ts` file re-registers its tests.
 */
import { afterEach, beforeEach } from 'vitest';

import { governmentDef } from '../../src/sim/statecraftData';

type Mix = { military: number; economic: number; civic: number; wildcard: number };

/** The chiefdom's mix before batch DS9: Military, Economic and Wildcard. */
export const OLD_CHIEFDOM_MIX: Readonly<Mix> = { military: 1, economic: 1, civic: 0, wildcard: 1 };

/** Lends the chiefdom its old typed mix for each test of the enclosing block. */
export function typedChiefdomInThisBlock(): void {
  let held: Mix | undefined;
  beforeEach(() => {
    const row = governmentDef('chiefdom') as { chairMix?: Mix };
    held = row.chairMix;
    row.chairMix = { ...OLD_CHIEFDOM_MIX };
  });
  afterEach(() => {
    (governmentDef('chiefdom') as { chairMix?: Mix }).chairMix = held;
  });
}
