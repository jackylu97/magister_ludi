/**
 * The mapgen suite's memo table: one generation per `(seed, size, sheet)`.
 *
 * Why this exists
 * ---------------
 * Almost every claim in this directory is a *sweep* — "on every seed and size",
 * "at every map size" — and the sweeps overlap heavily: `mapgen.test.ts` alone
 * asks for `(1, 'giant')` from four different tests, and a giant map costs about
 * three and a half seconds to make. Generation is a pure function of
 * `(seed, sizeName, overrides)` (see `generateMapDetail`), so the second, third
 * and fourth answer are the first one again, bought at full price.
 *
 * The sweeps are the coverage and none of them are dropped here; what is dropped
 * is the *repetition*. Every seed and every size a test named before still runs
 * through the same assertions, off a map generated once.
 *
 * The contract, and it is a sharp one
 * -----------------------------------
 * `mapFor` and `detailFor` hand back a **shared, cached** object. A test that
 * writes to the map it is given — an improvement, a chopped feature, a founded
 * city, anything at all — would be poisoning every later test that asks for the
 * same seed. Such a test calls `generateMap` directly and says in a comment that
 * it is mutating, which is why it is paying. **Read-only ⇒ `mapFor`; mutated ⇒
 * `generateMap`.** Three kinds of caller stay on `generateMap`, and each says so
 * where it is:
 *
 *   - the tests that write to the map they were handed;
 *   - the determinism tests, whose subject *is* generating twice — a memo would
 *     make them assert that a cache returns what it stored, and that includes
 *     the whole of `mapgenOverrides.test.ts`, which is about what a sheet does
 *     to a generation and compares one against another throughout;
 *   - the one `withExtraResources` test, where the resource table is swapped for
 *     the length of a callback, so `(seed, size)` is not the whole of what the
 *     map is a function of.
 *
 * `gameFor` is the same bargain one scale out, with one difference: a
 * `GameState` is mutable by nature and half the tests that ask for one poke it,
 * so it never shares. What is cached is the *snapshot string* of a fresh
 * `newGame`, and every caller gets its own `restoreState` of it — a JSON round
 * trip instead of a map generation plus a start placement. `newGame` is
 * deterministic in its config, so the restored state is the state `newGame`
 * would have returned.
 */
import { type GameMap } from '../../src/sim/map';
import { type MapDetail, type MapgenOverrides, generateMapDetail } from '../../src/sim/mapgen';
import { restoreState, snapshotState } from '../../src/sim/game';
import { type GameConfig, type GameState, newGame } from '../../src/sim/state';

/**
 * The cache key. `JSON.stringify` of the sheet rather than the sheet itself,
 * because the sweeps pass object literals and two literals that say the same
 * thing must hit the same entry. Key order inside a sheet is the author's, and a
 * sheet written two different ways is two entries — which costs a generation and
 * is never wrong.
 */
function key(seed: number, sizeName: string, overrides?: MapgenOverrides): string {
  return `${seed}|${sizeName}|${overrides === undefined ? '' : JSON.stringify(overrides)}`;
}

const details = new Map<string, MapDetail>();

/** The full generation output for a seed and size, generated at most once. */
export function detailFor(
  seed: number,
  sizeName: string,
  overrides?: MapgenOverrides,
): MapDetail {
  const id = key(seed, sizeName, overrides);
  let detail = details.get(id);
  if (detail === undefined) {
    detail = generateMapDetail(seed, sizeName, overrides);
    details.set(id, detail);
  }
  return detail;
}

/**
 * The map for a seed and size, generated at most once. **Do not mutate it** —
 * see the module docblock: a caller that writes to a map calls `generateMap`.
 */
export function mapFor(seed: number, sizeName: string, overrides?: MapgenOverrides): GameMap {
  return detailFor(seed, sizeName, overrides).map;
}

const snapshots = new Map<string, string>();

/**
 * A fresh `GameState` for a config, without paying for the map twice.
 *
 * The config is keyed by its own JSON, which is exactly the identity `newGame`
 * cares about — it reads nothing else. Every caller gets a private state, so
 * this is safe for the tests that end turns, found cities and march units.
 */
export function gameFor(config: GameConfig): GameState {
  const id = JSON.stringify(config);
  let snapshot = snapshots.get(id);
  if (snapshot === undefined) {
    snapshot = snapshotState(newGame(config));
    snapshots.set(id, snapshot);
  }
  return restoreState(snapshot);
}
