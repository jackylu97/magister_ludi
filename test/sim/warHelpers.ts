/**
 * The one line every combat fixture in this suite grew when war became a state
 * (schema 56).
 *
 * Since the war ruling of 2026-09-03 a blow between two empires at peace is
 * refused before a single strength is folded, and a soldier may not so much as
 * enter another empire's fields. Nearly every bench in `test/sim/` builds a
 * blank two-seat board and then fights on it, so without a declaration those
 * files would be asserting the *refusal* over and over rather than the rule
 * each of them is about.
 *
 * So the fixtures declare. It is written straight into the register rather than
 * issued as a `declareWar` command, and that is deliberate: a fixture's subject
 * is what a blow, a raid or a march *does*, and how a war is opened —
 * `declareWarError`'s five clauses, the truce, the surprise war, the routes it
 * drops — is `test/sim/war.test.ts`'s whole subject. The two files would
 * otherwise both be testing the verb and only one of them on purpose.
 *
 * The wild is left out, and needs to be: a barbarian has no row in the register
 * and `atWar` answers *true* for it without looking (`src/sim/wars.ts`), so a
 * row naming it would be a row no reader ever reads.
 *
 * It lives in a non-test module because two tiers share it and importing a
 * `.test.ts` file re-registers its tests.
 */

import { type GameState, realPlayers } from '../../src/sim/state';
import { openWar } from '../../src/sim/wars';

/** Opens a war between every pair of real seats. See the module docblock. */
export function openEveryWar(state: GameState): void {
  const seats = realPlayers(state);
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      openWar(state, seats[i]!.id, seats[j]!.id);
    }
  }
}
