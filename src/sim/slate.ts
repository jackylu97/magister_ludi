/**
 * **The slate — one board's remembered readings, thrown away whole when the
 * world moves.**
 *
 * This is the machinery `readings.ts` describes and nothing more: a `WeakMap` on
 * the state, a slate keyed on `GameState.revision`, and a lookup. It lives in a
 * file of its own because since batch M1 the slate has two kinds of tenant and
 * they sit on opposite sides of the graph:
 *
 *   · the **readings** (`readCity`, `readEmpire`, `readEmpirePercents`) — above
 *     `cities.ts`, where the third verb belongs and where it stays;
 *   · the two **empire-wide walks** the profile named — `meterEffects`
 *     (`meters.ts`) and `controlledHoldings` (`cities.ts`) — which are asked from
 *     *inside* the simulation, by `empirePercents`, `borderGrowth`,
 *     `explainGrowthPercent` and `tilePurchaseError`, all of them below
 *     `readings.ts` and none of them able to import it without a runtime cycle
 *     (`test/mapgen/moduleCycles.test.ts`). A memo those callers can reach has to
 *     sit under them, and this is the leaf it sits in: a type-only import of
 *     `GameState` and no runtime edge to anything at all.
 *
 * Keeping them on **one** slate rather than two is the point of the file. Two
 * `WeakMap`s keyed on the same integer would be two caches with two lifetimes —
 * exactly the thing batch E2 built one file to prevent — and this way a revision
 * that moves throws every remembered answer away in one compare, whichever layer
 * asked for it.
 *
 * ---
 *
 * **Three facts, each load-bearing** (they are `readings.ts`'s and they are
 * repeated here because this is now where they are implemented):
 *
 *   · **A `WeakMap` on the state, never a field of it.** `snapshotState` is
 *     `JSON.stringify(state)`; anything hung on `GameState` would be in every
 *     save hash and every replay comparison in the suite. A cache that changed a
 *     snapshot would not be a cache, it would be a rule.
 *   · **Read by lookup only** (CLAUDE.md rule 2). Nothing here iterates a `Map`.
 *     No outcome can depend on insertion order because no order is ever walked.
 *   · **A revision that has moved throws the whole slate away** rather than
 *     invalidating an entry. One integer compare, and no question of which
 *     entries a mutation reached.
 *
 * ---
 *
 * **The one thing this file adds to that bargain: the world is not remembered
 * while it is moving.**
 *
 * `GameState.revision`'s guarantee is stated at command and phase granularity
 * and no finer — the counter is raised *after* a command's handler has run and
 * *after* each end-of-turn phase, so a reading taken between the mutation and
 * the bump is a reading of a world halfway moved. That was harmless while the
 * only tenants were `readings.ts`', which nothing inside a handler asks. It is
 * not harmless for `meterEffects`: `expandBorders` claims hexes and `collectYields`
 * prices towns while the world is halfway moved, and a happiness walk remembered
 * across one of those mutations would be a rule change dressed as a cache.
 *
 * So the slate is **suspended while a writer holds it**. `applyCommand` and each
 * end-of-turn phase announce themselves through `beginWrite`/`endWrite`, and
 * inside that window every tenant computes fresh and remembers nothing — byte
 * for byte the behaviour of the tree before the memo existed. Outside it the
 * world is at rest, the revision is the subscription, and asking twice is one
 * integer compare.
 *
 * The depth is a **module variable and not state**, and that is safe for the one
 * reason it would not be safe as a memo: it is only ever read as "is somebody
 * writing", and two boards resolving in one process can only ever make the
 * answer *yes* more often than it needs to be — which costs a walk and cannot
 * change an answer. The slate itself is per-board, because it is on the board.
 *
 * A caller that pokes the state by hand — a bench, a fixture — is a writer and
 * calls `bumpRevision` the way a command does. That was already the contract
 * (`GameState.revision`); this file is the first tenant that can tell.
 */

import type { GameState } from './state';

/** One board's remembered readings at one revision. */
interface Slate {
  revision: number;
  epoch: number;
  buckets: Map<string, Map<string, unknown>>;
}

const SLATES = new WeakMap<GameState, Slate>();

/**
 * **The table under the world** — raised when the *data* a reading folds is
 * swapped out from under it, which the revision cannot see.
 *
 * There is exactly one such swap and it is a proof obligation rather than a
 * mechanic: `withExtraResources` (`resourceData.ts`) installs an invented
 * resource row for the length of a test, to hold the claim that a resource is
 * entirely data. A happiness walk remembered across that swap would answer the
 * invented luxury's question with the table's old answer. A board's state has
 * not moved, so the revision has not either — hence a second integer, compared
 * beside it.
 */
let epoch = 0;

/** The rows changed: every remembered answer on every board is void. */
export function discardSlates(): void {
  epoch += 1;
}

/**
 * How many writers are holding the world open.
 *
 * A counter rather than a flag because the two announcers nest: a command
 * dispatched from inside a phase would otherwise close the window early. Nothing
 * compares two depths; the only question asked is whether it is nought.
 */
let writing = 0;

/** A command handler or an end-of-turn phase is about to move the world. */
export function beginWrite(): void {
  writing += 1;
}

/** It has finished. Paired with `beginWrite` in a `finally`, always. */
export function endWrite(): void {
  writing = Math.max(0, writing - 1);
}

/**
 * True while the world is halfway moved — see the module docblock.
 *
 * Exported so `test/sim/readings.test.ts` can assert the window closes even when
 * a handler throws, which is the one way a leaked depth would be invisible: a
 * slate suspended for ever is a tree that is merely slow, never wrong.
 */
export function slateSuspended(): boolean {
  return writing > 0;
}

/** This board's slate at this revision — a fresh one the moment the world moved. */
function slateOf(state: GameState): Slate {
  const held = SLATES.get(state);
  if (held !== undefined && held.revision === state.revision && held.epoch === epoch) return held;
  const fresh: Slate = { revision: state.revision, epoch, buckets: new Map() };
  SLATES.set(state, fresh);
  return fresh;
}

/**
 * **Remember one answer** — `compute` asked once per `(revision, bucket, key)`,
 * and asked every time while a writer holds the world open.
 *
 * `bucket` names the reading and `key` names what it is about (a seat, a town, a
 * seat and a kind). Both are strings so that the pair is one lookup and never a
 * walk; nothing iterates either map.
 */
export function slateMemo<T>(
  state: GameState,
  bucket: string,
  key: string,
  compute: () => T,
): T {
  if (writing > 0) return compute();
  const slate = slateOf(state);
  let entries = slate.buckets.get(bucket);
  if (entries === undefined) {
    entries = new Map();
    slate.buckets.set(bucket, entries);
  }
  const held = entries.get(key);
  // `has` rather than `!== undefined`, so a reading whose honest answer is
  // `undefined` is remembered rather than recomputed for ever.
  if (held !== undefined || entries.has(key)) return held as T;
  const fresh = compute();
  entries.set(key, fresh);
  return fresh;
}
