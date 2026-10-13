/**
 * `newGame` and `createGame` for tests, built once per config and copied.
 *
 * Building a duel game costs about a hundred milliseconds, almost all of it
 * map generation. Before this helper the core tier built more than four
 * thousand of them, mostly the same handful of configs again and again, and
 * that was well over half of the tier's total test time. Both functions are
 * pure in their config, so every build after the first returns the same state.
 *
 * Each config is built once per worker with the real functions and kept as a
 * pristine original that is never handed out. Every caller gets a
 * `structuredClone` of it, so a test can change the state it is given freely.
 * `structuredClone` rather than a JSON round trip, so a field set to
 * `undefined` or a non-finite number comes back exactly as `newGame` wrote it.
 *
 * The cache key is the config's JSON. The one thing outside the config that
 * can change what `newGame` returns is a data table changed at runtime, and
 * the tests do that in two ways, both restored afterwards:
 *
 *   - the stocking helpers in `statecraftHelpers.ts` edit Order and Doctrine
 *     rows in place. They call `forgetBuiltGames` on the way in and out;
 *   - `withExtraResources` (`src/sim/resourceData.ts`) swaps the resource
 *     table and with it the `RESOURCE_IDS` array. A kept game remembers the
 *     array it was built under and is rebuilt if the array is not the same
 *     object any more.
 *
 * `GAME_MEMO_VERIFY=1` is the check that nothing else slips through: with it
 * set, every cache hit also builds the game for real and throws if the two
 * differ. The whole core tier has been run that way.
 *
 * Tests whose subject is that building twice gives the same game (the
 * determinism tests in `state.test.ts`, `game.test.ts` and the like) must not
 * use this module, or they would only be checking that a copy equals its
 * original. They import from `src/sim/state` or `src/sim/game` directly.
 *
 * Kept at a bounded size: the module graph outlives a test file (`isolate` is
 * off in `vite.config.ts`), so without a cap a worker would keep every config
 * it ever saw.
 */
import { type Game, createGame as buildGame } from '../../src/sim/game';
import { type GameConfig, type GameState, newGame as buildState } from '../../src/sim/state';
import { RESOURCE_IDS } from '../../src/sim/resourceData';

// Declared rather than imported from `node:process`, as in `vite.config.ts`:
// the project has no node typings.
declare const process: { env: Record<string, string | undefined> };

const VERIFY = process.env.GAME_MEMO_VERIFY === '1';

/** How many configs a worker keeps. Enough for any one file several times over. */
const CAPACITY = 64;

const built = new Map<string, { game: Game; resources: readonly string[] }>();

/** Drops every kept game. Called by any helper that changes a data table. */
export function forgetBuiltGames(): void {
  built.clear();
}

function pristine(config: GameConfig): Game {
  const key = JSON.stringify(config);
  const kept = built.get(key);
  if (kept !== undefined && kept.resources === RESOURCE_IDS) {
    const held = kept.game;
    // Most recently used goes to the back, so the cap evicts the oldest.
    built.delete(key);
    built.set(key, kept);
    if (VERIFY) {
      const fresh = buildGame(config);
      if (JSON.stringify(fresh) !== JSON.stringify(held)) {
        throw new Error(`newGameHelpers: a kept game no longer matches a fresh build for ${key}`);
      }
    }
    return held;
  }
  const game = buildGame(config);
  built.delete(key);
  built.set(key, { game, resources: RESOURCE_IDS });
  if (built.size > CAPACITY) built.delete(built.keys().next().value!);
  return game;
}

/** `createGame` from `src/sim/game`, built once per config. A private copy. */
export function createGame(config: GameConfig): Game {
  const game = pristine(config);
  return { config: structuredClone(game.config), state: structuredClone(game.state), log: [] };
}

/** `newGame` from `src/sim/state`, built once per config. A private copy. */
export function newGame(config: GameConfig): GameState {
  const state = structuredClone(pristine(config).state);
  if (VERIFY) {
    // `createGame` normalises the config before `newGame` normalises it again;
    // check the state really is the one `newGame` alone returns.
    if (JSON.stringify(state) !== JSON.stringify(buildState(config))) {
      throw new Error(`newGameHelpers: newGame and createGame disagree for ${JSON.stringify(config)}`);
    }
  }
  return state;
}
