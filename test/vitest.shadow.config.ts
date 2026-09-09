/**
 * **The shadow run's configuration** — batch M3 (`src/sim/slate.ts`,
 * `setSlateShadow`; `test/slateShadow.ts`).
 *
 * The ordinary configuration plus one setup file, and it exists because Vitest 2
 * takes `setupFiles` from a config rather than from the command line. The proof
 * is taken with:
 *
 *     TEST_TIER=all npx vitest run --config test/vitest.shadow.config.ts
 *
 * which plays the whole suite — core and slow, every bot arena, every
 * byte-for-byte replay — with **every slate hit disbelieved**: answered from the
 * slate and recomputed, and thrown at if the two differ. That is what makes the
 * register in `test/sim/slateRegister.test.ts` a proof rather than a claim.
 *
 * It is deliberately a second config rather than a line in `vite.config.ts`: the
 * check roughly doubles the cost of every reading, so it is what you run when
 * the reducer changes, not what the suite pays every day.
 *
 * `root` is stated because a config is otherwise resolved against **its own**
 * directory, and every glob in the base config is written from the repo root.
 */

import base from '../vite.config';

const config = base as { root?: string; test?: Record<string, unknown> };

config.root = '.';
config.test = { ...(config.test ?? {}), setupFiles: ['./test/slateShadow.ts'] };

export default config;
