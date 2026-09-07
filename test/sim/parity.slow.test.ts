/**
 * **The parity gate for the evaluations cleanup** (`docs/flags.md`, ruling pp —
 * batches E2 and E3). One-time: it is **deleted when E3 lands**.
 *
 * The user, 2026-09-07: *"Please test thoroughly to ensure behavior remains the
 * same (make these one-time tests for parity)."* E2 moves `cityQuote` onto a
 * labelled list and E3 splits `cities.ts` and `statecraft.ts` along the layers
 * of `docs/yields.md`; neither may move a number. So four boards are played
 * out and every reading those batches will touch is written down — the state
 * hashes, each town's flats, percents and total, every fold `cityQuote`
 * composes, every worked hex's breakdown, `civYields`, `explainEmpireLines`,
 * `ledgerReading`, `deckAggregate`, and `explainCardImpact` for every card each
 * seat holds. Every later run replays the same four boards and fails on the
 * **first** difference, naming its path.
 *
 * **Writing the fixtures**: `PARITY_WRITE=1`, or simply the absence of a
 * fixture file — a board with no fixture writes one rather than failing, so a
 * new board is added by adding it to `BOARDS`.
 *
 * `slow` by kind (CLAUDE.md): four games to turn 150, and a fixture sweep.
 * Run it with one fork — the four boards are the whole of the wall clock and
 * they are already the pool's work:
 *
 *   TEST_TIER=slow npx vitest run --poolOptions.forks.maxForks=1 \
 *     test/sim/parity.slow.test.ts
 *
 * The harness itself is `parityHelpers.ts` (a non-test module, CLAUDE.md's rule
 * for a helper two files could share); the *order* these readings come out in
 * is pinned by the core sibling `test/sim/yieldOrder.test.ts`, and the sequence
 * they compose is documented in `docs/yields.md`.
 */

import { describe, expect, it } from 'vitest';

import { BOARDS, firstDifference, playBoard, readFixture, writeFixture } from './parityHelpers';

/** Long enough for a hundred and fifty turns of two bots on a standard map. */
const PATIENCE = 900_000;

// Declared rather than imported from `node:process` — `vite.config.ts`'s own
// bargain, and for its reason: this project's type surface is `vite/client`
// alone and one environment variable is not worth widening it.
declare const process: { env: Record<string, string | undefined> };

const WRITE = process.env.PARITY_WRITE === '1';

describe('the readings the evaluations cleanup must not move', () => {
  for (const board of BOARDS) {
    it(
      `holds parity on ${board.id}`,
      async () => {
        const reading = await playBoard(board);
        const fixture = WRITE ? null : await readFixture(board.id);
        if (fixture === null) {
          const size = await writeFixture(board.id, reading);
          // A written fixture is not an assertion — it is the baseline. Said out
          // loud so a run that quietly rewrote one is visible in the output.
          console.log(`parity: wrote ${board.id}.json (${size} bytes)`);
          expect(size).toBeGreaterThan(0);
          return;
        }
        const found = firstDifference(fixture, reading, board.id);
        expect(
          found === null
            ? null
            : `${found.path}: fixture ${JSON.stringify(found.expected)} — this run ${JSON.stringify(found.actual)}`,
        ).toBe(null);
      },
      PATIENCE,
    );
  }
});
