/**
 * **The six-seat 120-turn digest, pinned** (`docs/plans/bot-evolution.md`
 * §3.5, ruling 7; the procedure of `docs/flags.md` (jjjjj) and (ttttt), where
 * it was the orchestrator's scratch: *"the 120-turn digests identical at two
 * seeds"* — here at the measured seed on the two boards the harness plays).
 *
 * What it pins: the bots decide **identically** — the whole state,
 * `snapshotState` hashed (`aiDigestHelpers.ts`'s FNV, the `explore.test.ts`
 * `RANGED_BOARDS` print), after a hundred and twenty turns of six personas on
 * the duel board and on the standard board. A refactor that means to change no
 * decision leaves both literals where they are; a change that moves one is a
 * finding, and the literal is **re-cut with the reason printed** in the commit
 * that moves it — never quietly. A schema bump moves both by construction (the
 * state's own bytes change) and is re-cut with the bump's changelog line as the
 * reason.
 *
 * The harness's sentinel (`scripts/evolve.ts`) reads the very same
 * `digestOfState`, so the suite's pin and the run's halt are one reading.
 *
 * Slow by kind: two full six-seat games, the standard board's alone near three
 * minutes on one core.
 */

import { describe, expect, it } from 'vitest';

import { digestOfState, playSeatedGame, sixSeatSpec } from './aiDigestHelpers';

/**
 * The literals. Cut 2026-09-15 at schema 117 (L1's lifetime deck tally,
 * `91326ba`, moved both from schema 116's `4a422d67:248888` /
 * `eaf58d1f:887156` — the state's own bytes changed); E1a's rows at today's
 * defaults (`60543d2`) then moved neither — a default that reproduces today's
 * play moves no digest, measured on both boards.
 *
 * Re-cut for M2 (`dd69463`, the War Hall and the Armoury, the Courthouse to
 * Iron Working): two buildable rows joined the tree and one moved, so the
 * bot's node valuer (`readNodeGifts`, which prices a technology by what it
 * unlocks) found Bronze Panoply, Mathematics and Iron Working richer and
 * Machinery and Divine Right poorer, and every seat's research order moved
 * from the first of those choices on — duel `ecfb7314:251149` →
 * `3e710249:248825`, standard `586ca4e0:892118` → `592eb05b:904802`. No rule
 * of play changed; a data row the bot can build is a reason the digest moves.
 */
const DIGESTS: Record<string, string> = {
  duel: '3e710249:248825',
  standard: '592eb05b:904802',
};

/**
 * Long enough for the standard board on a loaded machine (171 s alone at the
 * plan's measurement; five times that beside a whole slow suite). The timeout
 * is the machine's, not the test's.
 */
const PATIENCE = 900_000;

describe('the six-seat digest', () => {
  for (const sizeName of ['duel', 'standard']) {
    it(
      `plays a hundred and twenty turns on the ${sizeName} board to the state it always reaches`,
      () => {
        const played = playSeatedGame(sixSeatSpec(sizeName));
        // A bot that refuses its own commands or stalls is a bug before it is a
        // digest; say which before the hash disagrees.
        expect({ sizeName, warnings: played.warnings, stalled: played.stalled }).toEqual({
          sizeName,
          warnings: 0,
          stalled: false,
        });
        expect({ sizeName, digest: digestOfState(played.game.state) }).toEqual({
          sizeName,
          digest: DIGESTS[sizeName],
        });
      },
      PATIENCE,
    );
  }
});
