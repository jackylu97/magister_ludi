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
 *     granularity, unchanged in every respect. What a seat can reach on the board
 *     lives here (`readRoutes`, `readSites`). A town's own list lived here until
 *     batch P1, below.
 *   · **`'economy'`** — a coarser counter beside it, moved only when a write
 *     could change what its readings fold. Every end-of-turn phase moves it, and
 *     every command kind except the five that touch only pieces' positions and
 *     orders. The register is in `commands.ts` (`COMMAND_CLOCKS`), one row per
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
 * away where the world moved rather than where a command ends. Batch P1, below,
 * narrowed what a step announces.
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
 *     mostly says so.** `meterEffects` and `controlledHoldings` are asked from
 *     inside the simulation. `readCity`, `readEmpire` and `readEmpirePercents`
 *     live in `readings.ts`, which almost nothing in `src/sim` may import —
 *     that is the runtime cycle `test/mapgen/moduleCycles.test.ts` gates — and
 *     the three modules that do are named and argued rather than assumed:
 *     `cardImpact.ts` (a reading for a card face, above the reducer and imported
 *     back by nothing), `ledgerFold.ts` and `wagers.ts`. The last two are each
 *     asked from inside a *phase* — `recordDeckTally` at the head of
 *     `collectYields`, `turnReadings` at the head of `wagers` — and both are
 *     asked **before that phase writes anything**, which is what keeps the
 *     argument rather than bending it. The register test pins the list of
 *     importers exactly, so a fourth is a decision somebody has to make on
 *     purpose.
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
 *
 * ---
 *
 * **Batch R1: a sixth tenant, and it is not on the slate.**
 *
 * The card evaluator's law (`liveEffects`, `statecraft/evaluator.ts`) keeps a
 * memo of its own — it has to, it sits below this file's tenants and they fold
 * it — and until R1 that memo was keyed on `GameState.revision` alone. The
 * revision is raised **after** a handler and **after** a phase, so inside either
 * one the counter still names the world as it was on the way in: a handler that
 * changed the law and then read it in the same call got whatever had been
 * remembered under that stamp, which is the pre-command law if a reader had
 * asked a moment earlier and the fresh one if nobody had. A played game (the
 * bot's appraisal asks every turn) and a replay of its own log (nothing asks)
 * therefore parted — `settleBeliefChoice` re-seats a town off the law it has
 * just changed, and the two boards seated it differently.
 *
 * It is keyed on `economyStamp` beside the revision now, which is to say it
 * subscribes to the counter this file already moves at the mutation. Nothing
 * here changed for it: the fields the register governs are, field for field, the
 * eleven sources of that walk, because the walk the register was derived from
 * (`meterEffects`) folds it. The lesson for the next such memo is the one M3
 * already taught and R1 paid for twice: **a cache keyed on a counter raised
 * after the fact is an input**, and the only safe counter is the one the write
 * itself moves.
 *
 * ---
 *
 * **Batch P1: a town's list moves to the economy clock, and a plain step goes quiet.**
 *
 * From M3 until P1 every step moved the economy clock, and so did every call of
 * `recomputeVisibility` and every fortification. In turns 100 to 120 of a six-seat
 * game, 3,009 of 3,034 commands moved it, so the clock bought almost nothing. And a
 * town's list sat on the revision, so a bot that gave a hundred orders priced its
 * empire a hundred times.
 *
 * So inside the five movement commands of `COMMAND_CLOCKS`, each of those writes now
 * announces only when a reading can tell:
 *
 *   · a step, when `stepIsSeen` (`movement.ts`) says so. Its docblock lists every
 *     place a town's list, an empire's lines or its meters read where a piece stands;
 *   · a road, when the walk paved a hex (`advanceAlongPath`);
 *   · a seat's sight, when a hex is newly charted or a count of what the seat can see
 *     moved (`recomputeMarchSight`);
 *   · a fortification, when the owner's law reads trenches (`lawReadsTrenches`).
 *
 * **The phases and every other seam announce as they did.** A walk inside a phase
 * still announces each step and `recomputeVisibility` still announces every sweep,
 * because a phase reads remembered answers while it runs and the register below does
 * not cover every field they fold. One such write has since been found and fixed:
 * until batch P2, `marchOneTrader` renewed `TradeRoute.expiresTurn` and said nothing,
 * so `luxuryLoans` could answer for the old term until the next step announced (the
 * shadow run, turn 102 of a bot game). Going quiet in a phase would widen any window
 * like that one.
 *
 * `readCity`, `readEmpire`, `readEmpireRates` and the bot's `townFolds` grid then sit
 * on this clock. In the same game, 1,533 of 3,034 commands move it.
 *
 * **What would make this wrong** is a new read of a piece's position, of a seat's
 * sight or of a road under those readings, with no announcement. Three things guard
 * it: `POSITION_READERS` in `test/sim/slateRegister.test.ts` fails on a new read,
 * `test/sim/stepSeen.test.ts` holds each seam to a card row that reads it, and the
 * shadow run disbelieves every hit on the boards it plays.
 *
 * **Only readers at rest may ask those readings.** The register above covers the
 * fields the meters and the law fold. A town's list folds more than that, such as
 * `City.queue` and the baskets, and a write to one of those inside a handler or a
 * phase says nothing until the command or the phase ends. That is why
 * `foldEmpireRates` has no memo of its own and `readEmpireRates` does, in
 * `readings.ts`, where nothing inside a handler can reach it.
 *
 * ---
 *
 * **Batch P2: four small tenants from the bot.** `src/ai/bot.ts` keeps `botTownsHeld`,
 * `botCampaignEnemy` and `botForeignHexes` on the revision clock, and `botGoldReserve`
 * on the economy clock. A bot only reads at rest, so the same rules hold, and the shadow
 * check disbelieves them with everything else. They are here because one sweep of a
 * seat's soldiers asks each of them once per soldier on a board that is not moving.
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
 *
 * **The law reads this flag too** (batch R1): `liveReading`
 * (`statecraft/evaluator.ts`) is a subscriber to the economy clock now, so it is
 * a subscriber to the proof as well, and `shadowCheckLaw` disbelieves a hit the
 * way `shadowCheck` below does. It earned its place on the first run: it found a
 * charter counting its chairs off the law of the charter it had just replaced.
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
 * moved, and left alone when the *other* one did. A plain step moves only the
 * revision, so everything on the economy clock survives it.
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
