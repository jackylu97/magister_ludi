/**
 * **Readings kept for one bot decision** (bot batch BP14, the decision-speed
 * pass; `docs/plans/performance-pass-2026-11-06.md`, the section "BP14").
 *
 * A bot decision (`nextBotDecision`, `bot.ts`) only reads the board. Inside one
 * decision the bot often prices the same card on the same context more than
 * once: the draft plan, the chair reading and the Doctrine offer each walk the
 * decks, and their walks overlap. BP14 counted 6,153 card prices in five late
 * turns of seed 42, and 1,657 of them asked again for a price already taken in
 * the same decision on the same context. This file is the scope such readings
 * are kept in. It keeps no reading itself; the readings that use it say what
 * they key on (`explainCardEffects` and `explainEffects` in `value.ts`).
 *
 * Three rules make a kept reading the same as a fresh one:
 *
 *   - **The scope is one decision.** `inDecision` opens it, and the number it
 *     hands out (`keepingEpoch`) changes when the outermost scope opens and when
 *     it closes. A reading kept under one number is never answered under
 *     another, so nothing kept outlives the decision it was taken in. Inside one
 *     decision the bot writes nothing to the board, so the state a reading reads
 *     is the state it read the first time.
 *   - **A reading is kept under the guards open when it was taken.** Some
 *     context memos hold a stand-in value while they are first read, so that a
 *     reading which asks for them again does not recurse: `faithPrice`
 *     (`prices.ts`), `malicePrice` (`wager.ts`), and `chairReading`,
 *     `handRuleWorth` and `widerFitWorth` (`value.ts`). A price taken while one
 *     of them is being read is taken under the stand-in, and it differs from
 *     the price taken after it (BP14 found 19 such pairs in five turns: The
 *     Jinshi inside the Doctrine offer, and a card that opens a chair inside the
 *     chair reading). So each of them reads its value inside `withGuard`, which
 *     gives that one reading a number of its own, and `keepingScope` names the
 *     guards open now. A reading kept under one list of open guards is handed
 *     back only under the same list: inside the same first reading of the same
 *     memos, where every stand-in it saw is still the one in place.
 *   - **Outside a decision nothing is kept.** A caller with no scope (a test, the
 *     audience that answers a paper, the interface) gets a fresh reading every
 *     time, as before.
 *
 * Why a kept reading can be handed back: a reading is a function of its
 * arguments, the board and the memos on its context. Inside one decision the
 * board does not move. A context memo, once it holds a value, keeps it until its
 * first reading ends and then keeps its final value for the context's life.
 * Under the same open guards, a reading taken again sees every memo it saw the
 * first time with the same value: a stand-in that was in place is still in
 * place, and a memo that held its final value still holds it. So it takes the
 * same branches and gives the same answer.
 *
 * The shadow check (`setDecisionMemoShadow`) takes every kept answer again and
 * throws when the two differ. It is for tests and is off by default. Like the
 * slate's shadow, it is a module flag and never part of the state or the data.
 */

/** How many decision scopes are open now. */
let depth = 0;

/** The number of the current decision; it moves when the outermost scope opens or closes. */
let epoch = 0;

/** The guarded readings being taken now, innermost last, each by its own number. */
const guards: number[] = [];

/** The next number a guarded reading takes. Only ever rises. */
let nextGuard = 1;

/** `guards`, as the key `keepingScope` hands out. */
let scope = '';

let shadow = false;

/**
 * Runs `read` as one bot decision: readings that use this scope may keep their
 * answers until the outermost scope closes. Nested scopes share the outer one.
 */
export function inDecision<T>(read: () => T): T {
  if (depth === 0) epoch += 1;
  depth += 1;
  try {
    return read();
  } finally {
    depth -= 1;
    if (depth === 0) epoch += 1;
  }
}

/** The number readings are kept under now, or nought outside a decision. */
export function keepingEpoch(): number {
  return depth > 0 ? epoch : 0;
}

/**
 * The guarded readings open now, as a key: empty when there is none. A reading
 * kept under one key is handed back only under the same key.
 */
export function keepingScope(): string {
  return scope;
}

/**
 * Runs `compute` as a guarded reading: the first reading of a context memo that
 * holds a stand-in value while it runs. The readings kept inside it are kept
 * under its own number, so they are never handed back outside it.
 */
export function withGuard<T>(compute: () => T): T {
  guards.push(nextGuard);
  nextGuard += 1;
  scope = guards.join('.');
  try {
    return compute();
  } finally {
    guards.pop();
    scope = guards.join('.');
  }
}

/**
 * Asks answered through this scope, for the measurement and the tests: nothing
 * in a decision reads it.
 */
export const decisionMemoTally = {
  cardAsked: 0,
  cardKept: 0,
  effectsAsked: 0,
  effectsKept: 0,
  /** The beeline's table, kept for a sitting while the seat's research stands still (bot batch BP15). */
  tableAsked: 0,
  tableKept: 0,
  /**
   * The spend arm's "nothing to buy", kept for a sitting under the purse, the
   * reserve and the running routes (bot batch BP16, `bankSpend` in `bot.ts`).
   * Its kept answers are checked under this file's shadow switch too.
   */
  spendAsked: 0,
  spendKept: 0,
};

/** Switches the shadow check on or off. Tests only. */
export function setDecisionMemoShadow(on: boolean): void {
  shadow = on;
}

/** Is the shadow check on? */
export function decisionMemoShadow(): boolean {
  return shadow;
}
