/**
 * **The shadow run's switch** — batch M3 (`src/sim/slate.ts`, `setSlateShadow`).
 *
 * Not a test and not in the default configuration: it is a Vitest **setup file**
 * named by `test/vitest.shadow.config.ts`, so the whole suite can be run with
 * every slate hit disbelieved —
 *
 *     TEST_TIER=all npx vitest run --config test/vitest.shadow.config.ts
 *
 * — and every remembered answer recomputed and compared. A stale reading throws
 * where it is asked, naming the bucket, the key, the clock, the turn and the
 * phase, which is what turns "the register looks complete" into "the register is
 * complete on every board the suite plays".
 *
 * It costs roughly double on every reading, so it is deliberately **not** wired
 * into `vite.config.ts`: the run is a proof taken when the reducer changes, not
 * a price the suite pays every day. A test that wants the check for one claim
 * calls `setSlateShadow` itself and restores it in a `finally`
 * (`test/sim/readings.test.ts` has two).
 */

import { afterAll, beforeAll } from 'vitest';

import { setSlateShadow } from '../src/sim/slate';

beforeAll(() => {
  setSlateShadow(true);
});

afterAll(() => {
  setSlateShadow(false);
});
