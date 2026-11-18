/**
 * **The world's clock** (`docs/wager.md`, "Rules"; batch G1, and the faster
 * turn-over rule of 2026-11-18 in `docs/flags.md`, "Age turn-over: a missing
 * plate, the abacus motion, and a faster clock").
 *
 * One calendar for every empire. An empire's own age is the age of its highest
 * researched technology (`highestAge`). The world's age follows the empires.
 *
 * When an age starts to close
 * ---------------------------
 * The countdown that closes age N starts on the first turn either of these
 * holds:
 *
 *   - any living seat has reached age N + 2 or later (`rules.wager.leadAges`);
 *   - at least half of the living seats have reached age N + 1 or later
 *     (`rules.wager.shareOfSeats`, a fraction of two whole numbers). Half of an
 *     odd count rounds up: three of five, two of three, and a lone seat is its
 *     own half.
 *
 * "Living seats" are the real players that are not eliminated. The user asked
 * for this rule on 2026-11-18 because the old rule, the floored mean of every
 * seat's age, turned the world over too late: one slow empire held every other
 * empire's calendar back.
 *
 * The world moves one age at a time. If one seat is far ahead, the rule holds
 * for several ages at once, but the phase (`runWorldClock`, `beads.ts`) closes
 * only the age the world is in. When that age closes, the phase asks the rule
 * again for the new age in the same resolution, and that age gets its own full
 * countdown. So the world can end up at most one age behind the leader on the
 * lead rule alone, and every age it passes through lasts at least the
 * countdown.
 *
 * Two readings, and they answer different questions
 * --------------------------------------------------
 *   - `worldAge` is the world's **progress**: the latest age the rule says the
 *     world has moved into, asked of the board as it stands. It changes as soon
 *     as a seat learns something.
 *   - `currentWorldAge` is the age the world **is in**: the calendar. It moves
 *     only at a close, `rules.wager.countdown` turns after the progress first
 *     passed the calendar. The countdown is the point of the wager: an age that
 *     is ending is announced before it ends, so a bar staked on it has a
 *     deadline a player can see.
 *
 * Nothing is stored and nothing counts down
 * -----------------------------------------
 * The only thing on the state is `GameState.ageClose`: one absolute
 * `{ age, turn }` stamp, written again each time a close is decided. Both
 * readings are derived from it and from the seats' technologies. This is the
 * `TimedEffect` rule (`state.ts`): a countdown is state that something has to
 * remember to decrement, and an absolute turn is a comparison. `ageClose`
 * absent means no age has closed yet, which is also what a save written before
 * batch G1 looks like.
 *
 * What the clock gates
 * --------------------
 * Only the calendar: the wager's deal and judgement, the age's per-age
 * counters, and the age plate. It does not gate research or the tree. An
 * empire may research as far ahead of the world as it likes. `worldTechReached`
 * (`tech.ts`) is a different question (has anybody anywhere reached this
 * node), and it is what opens the Magnum Opus.
 *
 * Why a leaf: `beads.ts` owns the phase that writes `ageClose`, and the UI, the
 * bots and the wagers all ask the clock without importing that module. So the
 * readings live here and import only the state, the tree's own age reading and
 * the rules sheet. No number of ages is written here: the first and last age
 * come from the tech data (`TECH_AGES`, `LAST_TECH_AGE`), so a fifth age needs
 * no change to this file.
 */

import { type GameState, type Player, realPlayers } from './state';
import { RULES } from './rulesData';
import { type TechAge, LAST_TECH_AGE, TECH_AGES, highestAge } from './techData';

/** The age a world begins in. The chart's own first, never a numeral here. */
const FIRST_TECH_AGE: TechAge = TECH_AGES[0]!;

/** Every seat the clock counts: real, and still in the game. */
function livingSeats(state: GameState): Player[] {
  // `realPlayers` is the register for "who counts", and the wild is never in
  // it: it keeps no research and has no age. An **eliminated** seat is dropped
  // too, as in `barbarianTier`. An empire that is gone does not decide what age
  // the world is in, and a conquered rival frozen in the first age would
  // otherwise hold the survivors back for the rest of the game.
  return realPlayers(state).filter((player) => !player.eliminated);
}

/** Keeps an age inside the chart. The last age is the last the chart has. */
function clampAge(age: number): TechAge {
  if (age <= FIRST_TECH_AGE) return FIRST_TECH_AGE;
  if (age >= LAST_TECH_AGE) return LAST_TECH_AGE;
  return age as TechAge;
}

/**
 * The two thresholds that start a countdown, read from `rules.wager` as whole
 * numbers.
 *
 * Each is floored and kept at one or more, as `ageCountdownTurns` does for the
 * countdown. A lead of nought would close every age at once, and a share of
 * nought would close an age that nobody has left.
 */
export interface TurnOverRule {
  /** How many ages past the closing age one seat must be. */
  leadAges: number;
  /** The share of living seats that must be one age past it: numerator ... */
  shareNumerator: number;
  /** ... over denominator. */
  shareDenominator: number;
}

/** The rule as the rules sheet sets it. */
export function turnOverRule(): TurnOverRule {
  const wager = RULES.wager;
  return {
    leadAges: Math.max(1, Math.floor(wager.leadAges)),
    shareNumerator: Math.max(1, Math.floor(wager.shareOfSeats.numerator)),
    shareDenominator: Math.max(1, Math.floor(wager.shareOfSeats.denominator)),
  };
}

/**
 * Has the world moved out of `closing` into `next`, for seats at `seatAges`?
 *
 * True when one seat is `leadAges` past `closing`, or when the seats at `next`
 * or later are at least the rule's share of all of them. The share test is
 * `count × denominator ≥ numerator × seats`, in whole numbers, so half of an
 * odd count rounds up and no float is compared.
 */
function movedPast(
  seatAges: readonly number[],
  closing: number,
  next: number,
  rule: TurnOverRule,
): boolean {
  let reached = 0;
  for (const age of seatAges) {
    if (age >= closing + rule.leadAges) return true;
    if (age >= next) reached += 1;
  }
  return reached * rule.shareDenominator >= rule.shareNumerator * seatAges.length;
}

/**
 * **The world's progress** for seats at `seatAges`, on the age list `ages`
 * (first to last, in order): the latest age the world has moved into.
 *
 * It walks up the list and stops at the first age the rule does not reach.
 * Both halves of the rule only get harder to meet as the age rises, so the
 * walk never skips a gap. It never answers past the last age of the list, so
 * the last age never closes on this rule (its own backstop closes it,
 * `lastAgeTurns`).
 *
 * It takes the list of ages, and not the tech data, so a test can check the
 * rule on a chart with more ages than the data has today. No living seat
 * answers the first age: that is a world where the game is already over.
 */
export function worldProgress(
  seatAges: readonly number[],
  ages: readonly number[],
  rule: TurnOverRule = turnOverRule(),
): number {
  let progress = ages[0]!;
  if (seatAges.length === 0) return progress;
  for (let index = 1; index < ages.length; index++) {
    if (!movedPast(seatAges, ages[index - 1]!, ages[index]!, rule)) break;
    progress = ages[index]!;
  }
  return progress;
}

/**
 * **The world's progress** on this board: the latest age the rule says the
 * world has moved into, from every living seat's highest researched
 * technology.
 *
 * When this is above the age the world is in, the countdown that closes the
 * current age is due (`runWorldClock`). `highestAge` is the tree's own age
 * reading, so an empire's age here is the same number its own screens print.
 */
export function worldAge(state: GameState): TechAge {
  const seatAges = livingSeats(state).map((player) => highestAge(player.techsResearched));
  return clampAge(worldProgress(seatAges, TECH_AGES));
}

/**
 * **The age the world is in**: the calendar, and the number every table that
 * opens "on the world's clock" reads.
 *
 * Derived from one stamp: before a close the world is still in the age that is
 * closing, and from the close turn on it is in the next one. A world that has
 * never closed an age is in the first, which is also what a save from before
 * batch G1 reads as. `ageClose` absent *is* "no age has closed yet", in the
 * same way an empty research queue is state in `researchPlan`.
 *
 * `>=` and not `>`, so the close turn is the first turn of the new age: the
 * phase that fires the close runs inside that turn's resolution, and the age
 * the tables read must agree with the announcement.
 */
export function currentWorldAge(state: GameState): TechAge {
  const close = state.ageClose;
  if (close === undefined) return FIRST_TECH_AGE;
  return clampAge(state.turn >= close.turn ? close.age + 1 : close.age);
}

/** A countdown, as the age card prints it. `null` when no age is closing. */
interface AgeCountdown {
  /** The age that is closing. */
  age: TechAge;
  /** The absolute turn it closes on. */
  closesOn: number;
  /** Turns from now until then. Nought means it closes on this very turn. */
  turnsLeft: number;
}

/**
 * The countdown now running, or `null`.
 *
 * Derived from the same one stamp and never from a second field, so the age
 * card, the Abacus and the wager sheet cannot disagree. A close already
 * reached answers `null`: the age it named is over.
 */
export function worldAgeCountdown(state: GameState): AgeCountdown | null {
  const close = state.ageClose;
  if (close === undefined || state.turn >= close.turn) return null;
  return { age: clampAge(close.age), closesOn: close.turn, turnsLeft: close.turn - state.turn };
}

/**
 * Does an age close on **this** turn? The phase's own question.
 *
 * An equality and not a comparison, so the close is announced exactly once:
 * `state.turn` only rises, and a close that has fired must not fire again on
 * every later turn.
 */
export function ageClosesThisTurn(state: GameState): boolean {
  return state.ageClose !== undefined && state.ageClose.turn === state.turn;
}

/** How many turns an age is given to close once its countdown starts. */
export function ageCountdownTurns(): number {
  return Math.max(1, Math.floor(RULES.wager.countdown));
}

/** How long the last age runs before it closes on its own. See `WagerRules`. */
export function lastAgeTurns(): number {
  return Math.max(1, Math.floor(RULES.wager.lastAgeTurns));
}
