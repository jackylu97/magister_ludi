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
 * **Two rows of that table were wrong, and batch M3's shadow run found them.**
 * `meterEffects` does not open `state.units` and does not read the treasury —
 * but the **card evaluator** it folds does both: The Long Watch pays "+1
 * happiness for each unit standing in one of your cities" (`count: 'garrison'`)
 * and Pilgrim Roads "+1 happiness for each 50 banked faith"
 * (`count: 'bankedFaith'`, with `bankedGold` beside it). So a piece created,
 * killed, taken or **moved**, and a bank paid into, change an empire's
 * contentment — and from M2 until M3 a seat that marched or banked read a
 * happiness one write out of date. Both are fixed the way M3 fixes everything:
 * the seams announce (`createUnit`, `removeUnit`, `captureUnit`,
 * `advanceAlongPath`, the melee advance, the two teleports; and every writer of
 * `gold`, `faithPool`, `sciencePool` and `culturePool`), so the answer is thrown
 * away where the world moved rather than where a command ends. What the economy
 * clock still buys is the four order-only commands — a fortification, a sleep,
 * an auto-explore switched on, an order cancelled — and the phases that write
 * nothing a walk reads.
 *
 * The lesson is worth stating plainly, because it is what the next such batch
 * needs: **the field list is not "what `meters.ts` reads", it is what the whole
 * fold reaches**, and the fold goes through the card evaluator, whose `count`
 * vocabulary can read almost anything on the board. A new `count` kind is a new
 * row of `test/sim/slateRegister.test.ts`.
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
 * suspended**: 44,000 of the 200,000 asks were taken inside a handler or a
 * phase, where nothing could be remembered at all. That was the shape of the
 * next batch, and it is batch M3, below.
 *
 * ---
 *
 * **Batch M3: the bump moves to the mutation, and the window closes.**
 *
 * M1 and M2 both raised their clocks *after* the fact — `applyCommand` after the
 * handler, the phase loop after each phase — so everything in between was a
 * world halfway moved, and the slate answered it by **suspending itself**: while
 * a writer held the window open every tenant computed fresh and remembered
 * nothing. That was correct and it was where the time went. Measured on a
 * 150-turn game (seed 20260903, duel, two bot seats, the wild): **57,000 asks
 * inside a window, 8% of the whole game**, and 99.8% of them would have answered
 * with the value the ask before them computed. `collectYields` alone held
 * 36,000 of them: the phase prices every town, and pricing a town asks the
 * empire's happiness, which asks what the empire holds.
 *
 * So the window is gone, and the discipline that replaces it is one sentence:
 * **a write announces itself at the write**. Every mutation in the reducer and
 * in the phases that changes what a tenant folds calls `bumpEconomy` on the line
 * it happens, rather than leaving a stale answer standing until the command or
 * the phase gets around to raising a counter. What the tenants may then remember
 * is exactly what has not moved since it was asked, inside a phase and outside
 * one alike.
 *
 * Three facts make that safe rather than merely faster:
 *
 *   · **The register is a test, not a habit.** `test/sim/slateRegister.test.ts`
 *     reads `src/sim` for every write to a field the tenants fold and fails
 *     unless the function it is in announces (or is excused by name, with the
 *     reason). A new unannounced write fails core the day it is written.
 *   · **Only two tenants can be asked mid-write, and it is the module graph that
 *     says so.** `meterEffects` and `controlledHoldings` are asked from inside
 *     the simulation; `readCity`, `readEmpire` and `readEmpirePercents` live in
 *     `readings.ts`, which **no module in `src/sim` imports** — it cannot,
 *     without the runtime cycle `test/mapgen/moduleCycles.test.ts` gates. So the
 *     three readings above are only ever asked at rest, where the command's and
 *     the phase's own bump has always answered for them; the register carries
 *     that argument and the cycle test keeps it true.
 *   · **The command's and the phase's bumps stay** — conservative, and one
 *     integer compare each. A write that announces twice costs a walk; a write
 *     that announces not at all is a wrong answer, so the direction of every
 *     doubt here is *announce*. And an announcement goes **after** the write it
 *     announces: one line early is an answer taken again one line too early.
 *
 * `setSlateShadow` is the proof: with it on, **every hit also computes fresh and
 * asserts the two are deeply equal**, naming the bucket, the key, the clock, the
 * turn and the phase when they are not. It is off by default, never in data, and
 * it stays for the next batch that touches the reducer.
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
 * **The phase the resolution is in**, for a shadow-mode failure's message and
 * nothing else.
 *
 * A module string rather than state, on the epoch's terms: no rule reads it, no
 * save carries it, and two boards resolving in one process can only ever make it
 * name the wrong phase in a message that is already a failure. `runEndOfTurn`
 * sets it around each phase and clears it after; a command outside a resolution
 * leaves it empty.
 */
let currentPhase = '';

/** Named by the phase loop, read only by the shadow check's message. */
export function setSlatePhase(name: string): void {
  currentPhase = name;
}

/**
 * **Shadow mode** — every hit computes fresh as well, and the two must agree.
 *
 * The proof of batch M3, kept for the next batch that touches the reducer: with
 * the window gone, what makes the slate a cache rather than a rule is that every
 * write announces itself, and the only honest way to test a register of writes
 * is to disbelieve it. On, a hit is answered from the slate *and* recomputed,
 * and a difference throws naming the bucket, the key, the clock, the turn and
 * the phase — which is enough to find the write that said nothing.
 *
 * Test-only, off by default, and **never in data**: it doubles the cost of every
 * reading, so nothing but a test may switch it on. It is a module flag rather
 * than a field for `epoch`'s reason exactly — the state is stringified into
 * every save hash.
 */
let shadow = false;

/** Switch the shadow check on or off. `test/sim` only; see the docblock. */
export function setSlateShadow(on: boolean): void {
  shadow = on;
}

/** Is the shadow check running? Exported so a test can restore what it found. */
export function slateShadow(): boolean {
  return shadow;
}

/**
 * The remembered answer and the fresh one, printed the same way — `undefined`
 * included, so a reading whose honest answer is nothing is compared rather than
 * skipped. Deep equality by print because every tenant's answer is plain data
 * (`MeterEffect[]`, `ResourceHolding[]`, `CityReading`), which is also what
 * `snapshotState` relies on.
 */
function shadowPrint(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

/** An empty half, at a stamp nothing can be remembered under. */
function emptyHalf(): Half {
  return { stamp: -1, epoch: -1, buckets: new Map() };
}

/**
 * This board's half of the slate for one clock — emptied the moment that clock
 * moved, and left alone when the *other* one did. That is the whole of batch M2:
 * a scout's step moves the revision and the town lists go with it, while the
 * empire's **ground** stays where it is, because no step can reach it.
 *
 * The step *can* reach the empire's meters, which is M3's correction to M2's
 * table above — and since the two walks share one half, a march now takes both.
 * Sharpening that would be a third clock, and a third clock is a batch.
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
 * key)`, inside a write and outside one alike (batch M3: the writes announce
 * themselves, so there is no longer such a thing as a world halfway moved that
 * a tenant can see).
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
  const slate = halfOf(state, clock);
  let entries = slate.buckets.get(bucket);
  if (entries === undefined) {
    entries = new Map();
    slate.buckets.set(bucket, entries);
  }
  const held = entries.get(key);
  // `has` rather than `!== undefined`, so a reading whose honest answer is
  // `undefined` is remembered rather than recomputed for ever.
  if (held !== undefined || entries.has(key)) {
    if (shadow) shadowCheck(state, clock, bucket, key, held, compute);
    return held as T;
  }
  const fresh = compute();
  entries.set(key, fresh);
  return fresh;
}

/**
 * The hit, disbelieved — see `setSlateShadow`. Throws rather than reports,
 * because a stale reading is a wrong game and the failure has to land on the
 * ask that saw it rather than on whatever compared two boards afterwards.
 */
function shadowCheck(
  state: GameState,
  clock: SlateClock,
  bucket: string,
  key: string,
  held: unknown,
  compute: () => unknown,
): void {
  const remembered = shadowPrint(held);
  const now = shadowPrint(compute());
  if (remembered === now) return;
  const where = currentPhase === '' ? '' : ` in phase ${currentPhase}`;
  throw new Error(
    `slate shadow: ${bucket}[${key}] on the ${clock} clock is stale at turn ${state.turn}${where}` +
      `\n  remembered: ${remembered.slice(0, 400)}` +
      `\n  fresh:      ${now.slice(0, 400)}`,
  );
}
