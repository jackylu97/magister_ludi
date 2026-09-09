/**
 * **The world's clock** (`docs/wager.md` §1, batch G1).
 *
 * One calendar for everybody, and it is the **mean** of the empires on the
 * board rather than the first seat's tree.
 *
 * What it replaced
 * ----------------
 * Until this batch the world entered an age the turn the *first* seat reached
 * it (`state.beads.worldAge`, a stored number raised by `Math.max` over
 * `realPlayers`). That is the reading the user overruled: a runaway leader
 * dragged the whole world into an age nobody else had entered, and every table
 * that opened "on the world's clock" opened for a realm still two columns back.
 * The clock is now the **mean age of each empire's highest researched
 * technology, floored** — so the world turns over when the *middle* of the
 * board does, and a rush buys the rusher an age of their own rather than the
 * world's.
 *
 * Two readings, and they are different questions
 * ----------------------------------------------
 *   · `worldAge` is the world's **progress** — the mean, asked of the board as
 *     it stands. It moves the moment the middle of the pack learns something.
 *   · `currentWorldAge` is the age the world **is in** — the calendar. It moves
 *     only at a close, ten turns (`rules.wager.countdown`) after the progress
 *     first crossed into the next age, which is the whole point of the wager:
 *     an age that is ending is announced before it ends, so a bar staked on it
 *     has a deadline a player can see.
 *
 * Everything derived, nothing ticking
 * -----------------------------------
 * Neither number is stored. The only thing on the state is
 * `GameState.ageClose` — one absolute `{ age, turn }` stamp, overwritten each
 * time a close is decided — and both readings are folds of it, exactly the
 * `TimedEffect` discipline (`state.ts`): a countdown is state somebody has to
 * remember to tick, an absolute turn is a comparison. `ageClose` absent is the
 * honest reading of a world that has never closed an age, which is also what a
 * save written before this batch looks like.
 *
 * What the clock gates
 * --------------------
 * **Only the calendar** (§1): the age's deed tables, the age-entry moments,
 * and — from G2 — the wager's deal and judgement. It does not gate research,
 * it does not gate the tree, and it does not move the Opus door: an empire may
 * research as far ahead of the world as it likes, and `worldTechReached`
 * (`tech.ts`) is a different question with a different answer — *has anybody
 * anywhere reached this node* — which is what opens the Magnum Opus and is
 * deliberately still the first seat's reading.
 *
 * A leaf, on purpose: `beads.ts` owns the phase that writes `ageClose` and the
 * table it opens, and the UI, the bot and (from G2) the wager all need to *ask*
 * the clock without importing any of that. So the readings live here and import
 * nothing but the state, the tree's own age derivation and the rules sheet.
 */

import { type GameState, type Player, realPlayers } from './state';
import { RULES } from './rulesData';
import { type TechAge, LAST_TECH_AGE, TECH_AGES, highestAge } from './techData';

/** The age a world begins in. The chart's own first, never a numeral here. */
export const FIRST_TECH_AGE: TechAge = TECH_AGES[0]!;

/** Every seat the clock counts: real, and still in the game. */
function livingSeats(state: GameState): Player[] {
  // `realPlayers` is the register for "who counts" and the wild is never in it
  // — it keeps no research and has no age to average. An **eliminated** seat is
  // dropped on top of that, `barbarianTier`'s own line one system over: an
  // empire that is gone does not get a vote on what age the world is in, and a
  // conquered rival frozen in Æra I would otherwise hold the survivors back for
  // the rest of the game.
  return realPlayers(state).filter((player) => !player.eliminated);
}

/** Keeps a mean inside the chart. The last age is the last the chart *has*. */
function clampAge(age: number): TechAge {
  if (age <= FIRST_TECH_AGE) return FIRST_TECH_AGE;
  if (age >= LAST_TECH_AGE) return LAST_TECH_AGE;
  return age as TechAge;
}

/**
 * **The world's progress**: the mean age of each living empire's highest
 * researched technology, floored (`docs/wager.md` §1, §7 item 1, §11).
 *
 * Floored rather than rounded, and the difference is the ruling: two seats in
 * Æra I of which one reaches Æra II average one and a half, and the world stays
 * in Æra I until the *second* of them arrives. Rounding would have turned the
 * world over on one empire's technology, which is the first-seat rule wearing a
 * fraction.
 *
 * `highestAge` is the tree's own single age derivation and this asks it rather
 * than counting nodes, so an empire's age here is the same number its own
 * screens print.
 *
 * A world with no living seat left answers the first age. It is a state the
 * game is already over in, and the honest reading of a mean over nothing is not
 * a division by zero.
 */
export function worldAge(state: GameState): TechAge {
  const seats = livingSeats(state);
  if (seats.length === 0) return FIRST_TECH_AGE;
  let sum = 0;
  for (const player of seats) sum += highestAge(player.techsResearched);
  return clampAge(Math.floor(sum / seats.length));
}

/**
 * **The age the world is in** — the calendar, and the number every table that
 * opens "on the world's clock" reads.
 *
 * A fold of one stamp: before a close the world is still in the age that is
 * closing; from the close turn on it is in the next one. A world that has never
 * closed an age is in the first, which is also what a save from before this
 * batch reads as — `ageClose` absent *is* "no age has closed yet", presence
 * being state exactly as `researchPlan`'s queue is.
 *
 * `>=` rather than `>`, so the close turn is the first turn of the new age: the
 * phase that fires the close runs inside that turn's resolution, and a world
 * whose deed tables disagreed with the announcement they were made by would be
 * two clocks again.
 */
export function currentWorldAge(state: GameState): TechAge {
  const close = state.ageClose;
  if (close === undefined) return FIRST_TECH_AGE;
  return clampAge(state.turn >= close.turn ? close.age + 1 : close.age);
}

/** A countdown, as the age card prints it. `null` when no age is closing. */
export interface AgeCountdown {
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
 * Derived from the same one stamp and never from a second field, which is what
 * keeps the age card, the Abacus and the wager sheet from being three clocks. A
 * close already reached answers `null`: the age it named is over, and "closes in
 * −4 turns" is not a sentence.
 */
export function worldAgeCountdown(state: GameState): AgeCountdown | null {
  const close = state.ageClose;
  if (close === undefined || state.turn >= close.turn) return null;
  return { age: clampAge(close.age), closesOn: close.turn, turnsLeft: close.turn - state.turn };
}

/**
 * Does an age close on **this** turn? The phase's own question.
 *
 * An equality rather than a comparison, so the moment is announced exactly once:
 * `state.turn` only ever rises, and a close that had already been fired must not
 * be fired again on every turn after it.
 */
export function ageClosesThisTurn(state: GameState): boolean {
  return state.ageClose !== undefined && state.ageClose.turn === state.turn;
}

/** How many turns an age is given to close once the mean has crossed. */
export function ageCountdownTurns(): number {
  return Math.max(1, Math.floor(RULES.wager.countdown));
}

/** How long the last age runs before it closes on its own. See `WagerRules`. */
export function lastAgeTurns(): number {
  return Math.max(1, Math.floor(RULES.wager.lastAgeTurns));
}
