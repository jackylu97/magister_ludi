/**
 * **The slate — one board's remembered readings, thrown away whole when the
 * world moves.**
 *
 * This is the machinery `readings.ts` describes and nothing more: a `WeakMap` on
 * the state, a slate kept under **two clocks**, and a lookup. It lives in a
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
 * exactly the thing batch E2 built one file to prevent — and this way a clock
 * that moves throws every remembered answer under it away in one compare,
 * whichever layer asked for it.
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
 *   · **A clock that has moved throws its whole half of the slate away** rather
 *     than invalidating an entry. One integer compare, and no question of which
 *     entries a mutation reached.
 *
 * ---
 *
 * **The two clocks** (batch M2).
 *
 * M1 keyed everything on `GameState.revision`, which moves on **every** accepted
 * command. That is right and it is also blunt: a bot seat sends dozens of
 * commands a turn — a scout steps, a spearman fortifies, a worker is put to
 * sleep — and every one of them threw away the empire's happiness walk and the
 * empire's holdings, neither of which had moved. M1's own closing finding was
 * that what remained of those two frames in the profile was **misses**: one walk
 * per command per seat rather than one per question.
 *
 * So a reading now names the clock it is a reading *of*:
 *
 *   · **`'revision'`** — `GameState.revision`, the world at command and phase
 *     granularity, unchanged in every respect. A town's own list lives here,
 *     because a town's list folds the caravans arriving (`docs/yields.md` step 6)
 *     and a caravan's yield is cut by `cityBlockaded` — which is a **unit
 *     position**. One hull moved into a harbour mouth changes what that town
 *     makes, with nothing else on the board different.
 *   · **`'economy'`** — a coarser counter beside it, moved only when a write
 *     could change what the *empire-wide* walks read: holdings, meters and the
 *     percentages they produce. Every end-of-turn phase moves it, and every
 *     command kind except the five that touch only pieces' positions and orders.
 *     The register is in `commands.ts` (`COMMAND_CLOCKS`), one row per
 *     `Command['type']`, and `test/sim/readings.test.ts` fails the day a kind is
 *     in neither list.
 *
 * The economy counter is **not a field of `GameState`**, and that is the first of
 * the three facts above rather than an omission: the state is stringified into
 * every save hash and every replay comparison in the suite, so a second counter
 * on it would be a schema change and a different byte in every snapshot for a
 * cache key nothing plays by. It is a `WeakMap` beside the slate, on the same
 * terms as the slate — per board, and gone when the board is. A board restored
 * from a save starts at nought with an empty slate, which is a miss and never a
 * stale answer, and that is the whole failure mode of keeping it here.
 *
 * The conservative direction is the one written into the writers.
 * `bumpRevision` (`state.ts`) moves **both** clocks — it is the announcement
 * "the world moved" and says nothing about how much of it, which is exactly what
 * a bench poking the state by hand means by it. Only `applyCommand`, holding a
 * result it has classified, may say the narrower thing (`bumpPiecesOnly`). A new
 * writer that forgets the distinction is therefore merely slow.
 *
 * **What it was worth, measured** (`docs/bot-priorities.md`, "Batch M2 as
 * shipped"): a quarter of a bot's commands take the narrow door and the two
 * walks miss 9–19% less often for it — and the clock barely moves, because after
 * M1 a miss at rest is no longer where the time goes. Counted over a 150-turn
 * game, the two readings cost **1.8% of it at rest and 10% of it while
 * suspended**: 44,000 of the 200,000 asks are taken inside a handler or a phase,
 * where nothing may be remembered at all. That is the shape of the next batch,
 * and it is written here rather than in a report so the next reader of this file
 * does not go looking for the win in the clocks.
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

/**
 * Which clock a reading is a reading of — see "The two clocks" above. A tenant
 * declares one and gets exactly that lifetime; nothing may be on both.
 */
export type SlateClock = 'revision' | 'economy';

/** One clock's remembered answers, at the stamp they were taken under. */
interface Half {
  stamp: number;
  epoch: number;
  buckets: Map<string, Map<string, unknown>>;
}

/** One board's slate: the two halves, each thrown away by its own clock. */
interface Slate {
  revision: Half;
  economy: Half;
}

const SLATES = new WeakMap<GameState, Slate>();

/**
 * **The economy clock**, one integer a board, beside the slate and never on it.
 *
 * A `WeakMap` for `SLATES`' reason exactly, stated in the docblock above: the
 * state is stringified into every save hash, so a counter on it would be a
 * schema change and a byte in every snapshot for a key no rule reads. Absent
 * means nought, so a board nobody has moved yet — and a board just restored from
 * a save — reads zero against an empty slate, which is a miss and cannot be a
 * stale answer.
 */
const ECONOMY = new WeakMap<GameState, number>();

/**
 * **Something that the empire-wide walks read has changed.**
 *
 * Called by `bumpRevision` — the world moved, and a plain announcement says
 * nothing about how much of it — and never by `bumpPiecesOnly`. That asymmetry
 * is the safety: the default is conservative and only a caller holding a
 * classified command result may take the narrow door.
 */
export function bumpEconomy(state: GameState): void {
  ECONOMY.set(state, (ECONOMY.get(state) ?? 0) + 1);
}

/** This board's economy clock. Nought until something moves it. */
export function economyStamp(state: GameState): number {
  return ECONOMY.get(state) ?? 0;
}

/**
 * **A write inside this command that the command's own result cannot carry.**
 *
 * `applyCommand` classifies a movement command by what it *reported* — a march
 * that claimed a ruin, burnt a camp, took a civilian or plundered a caravan says
 * so in `CommandResult.arrivals`, and a plain step says nothing. Two things
 * `arriveOnTile` does are not in that report and never were, because nothing
 * outside the simulation has any use for them: a legacy revoked because a
 * soldier walked into a capital (`revokeLegacies`), and a road worn under a
 * laden caravan (`layRoadUnder`). Both change what a reading folds, so both
 * raise this rather than being re-derived from the board afterwards — which is
 * `CommandResult`'s own argument about differences that stop existing.
 *
 * A module flag rather than state, on `writing`'s terms: it is read once, by the
 * command that opened the window, and cleared when the next one opens.
 */
let economyNote = false;

/** Raised by a seam whose write the command's result does not report. */
export function noteEconomyWrite(): void {
  economyNote = true;
}

/** Was one raised since this write window opened? See `noteEconomyWrite`. */
export function economyNoted(): boolean {
  return economyNote;
}

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
  // The outermost writer clears the note: it belongs to *this* command, and the
  // command that reads it is the one that opened the window.
  if (writing === 0) economyNote = false;
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

/** An empty half, at a stamp nothing can be remembered under. */
function emptyHalf(): Half {
  return { stamp: -1, epoch: -1, buckets: new Map() };
}

/**
 * This board's half of the slate for one clock — emptied the moment that clock
 * moved, and left alone when the *other* one did. That is the whole of batch M2:
 * a scout's step moves the revision and the town lists go with it, while the
 * empire's holdings and meters, which no step can reach, stay where they are.
 */
function halfOf(state: GameState, clock: SlateClock): Half {
  let slate = SLATES.get(state);
  if (slate === undefined) {
    slate = { revision: emptyHalf(), economy: emptyHalf() };
    SLATES.set(state, slate);
  }
  const half = slate[clock];
  const stamp = clock === 'revision' ? state.revision : economyStamp(state);
  if (half.stamp !== stamp || half.epoch !== epoch) {
    half.stamp = stamp;
    half.epoch = epoch;
    half.buckets = new Map();
  }
  return half;
}

/**
 * **Remember one answer** — `compute` asked once per `(clock stamp, bucket,
 * key)`, and asked every time while a writer holds the world open.
 *
 * `clock` is the reading's own declaration of what could change it (see "The two
 * clocks"), `bucket` names the reading and `key` names what it is about (a seat,
 * a town, a seat and a kind). The last two are strings so that the pair is one
 * lookup and never a walk; nothing iterates either map.
 */
export function slateMemo<T>(
  state: GameState,
  clock: SlateClock,
  bucket: string,
  key: string,
  compute: () => T,
): T {
  if (writing > 0) return compute();
  const slate = halfOf(state, clock);
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
