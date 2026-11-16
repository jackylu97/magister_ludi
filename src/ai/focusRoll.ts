/**
 * **The focus roll: the citizen focus the bot chose for each town, and the build
 * it chose it for** (bot batch BP10, `docs/flags.md` (ooooooo), the bullet
 * "BP10"; first written in batch BP9 for fault 4).
 *
 * `focusCommand` (`bot.ts`) compares two placements of a town's citizens and
 * prices the difference at the seat's live prices. Those prices come from the
 * seat's want book and change from turn to turn with what the seat could buy, so
 * where the lean on the hammers won or lost by a few points the answer flipped
 * nearly every turn (BP9 measured two thirds of all focus orders going back to a
 * focus the town held in the last five turns).
 *
 * The user's ruling of 2026-11-15: *"the bot should simply just complete what
 * it's working on without swapping focus in cities"*. So the bot chooses a
 * town's focus when the town starts a build, and keeps it until that build is
 * finished or leaves the head of the queue. This roll is what lets the arm know
 * that a build is the same build:
 *
 *   - **one row a town**: the focus the bot chose, the head of the queue it chose
 *     it for (`queueItemKey`, or `-` for an empty queue), and the hammers in the
 *     head's basket when it last looked. A choice to keep the focus the town
 *     already has is written down too, because it is a choice for the build.
 *   - **the same build** is the same head with a basket that has not fallen. A
 *     finished row leaves its overflow in the basket, which is less than the
 *     basket it finished with, so a second copy of the same unit after the first
 *     reads as a new build. The arm updates the basket each time it looks, which
 *     is at least once a turn for every town of the seat.
 *   - **a project** never finishes, and its basket only grows. So a focus chosen
 *     for a project is kept while the project heads the queue. The production
 *     arm puts a better row ahead of a project when one appears
 *     (`projectIdleCommand`), and that is a new build.
 *   - **beside the state, never in it.** A `WeakMap` on the live state object.
 *     Nothing in a save can see it and no rule reads it. A save loaded mid-game
 *     forgets, and the bot then chooses once more for each town; that is the
 *     muster roll's amnesia (`musterRoll.ts`), accepted for the same reason.
 *
 * The bot worker thinks on a copy of the state, so the roll is a harness memory
 * (`harnessMemory.ts`): every request carries it and every reply brings it back.
 *
 * BP9's guard was a hold of five turns after an order. A hold that ended when
 * the build changed was tried there and dropped. BP10 measured why: builds are
 * short (half of them take two turns or less), and of the orders that undid
 * the town's last order within four turns, 42% came after the town had started
 * a new build. Those are changes this rule allows (the plan file's section
 * "BP10").
 */

import type { CitizenFocus } from '../sim/rulesData';
import type { GameState } from '../sim/state';

/** The focus the bot chose for one town, and the build it chose it for. */
export interface FocusChoice {
  cityId: number;
  /** `state.turn` when the choice was made. Absolute; nothing ticks. */
  turn: number;
  /** The focus chosen. */
  focus: CitizenFocus;
  /** The head of the town's queue the choice was made for (`queueItemKey`), or `-`. */
  head: string;
  /** The hammers in the head's basket when the arm last looked at the town. */
  basket: number;
}

/** Where a town's build stands: its head and the hammers banked toward it. */
export interface BuildMark {
  head: string;
  basket: number;
}

const ROLLS = new WeakMap<GameState, FocusChoice[]>();

/** Writes down the focus chosen for this town's build now. Replaces the town's last row. */
export function noteFocusChoice(
  state: GameState,
  cityId: number,
  focus: CitizenFocus,
  build: BuildMark,
): void {
  let roll = ROLLS.get(state);
  if (roll === undefined) {
    roll = [];
    ROLLS.set(state, roll);
  }
  const fresh: FocusChoice = { cityId, turn: state.turn, focus, head: build.head, basket: build.basket };
  const index = roll.findIndex((row) => row.cityId === cityId);
  if (index < 0) roll.push(fresh);
  else roll[index] = fresh;
}

/** The focus the bot last chose for this town, or `null` when the roll holds none. */
export function focusChoiceFor(state: GameState, cityId: number): FocusChoice | null {
  return ROLLS.get(state)?.find((row) => row.cityId === cityId) ?? null;
}

/**
 * True when the town is still on the build the choice was made for, and the
 * basket seen is written down for the next look. A different head, or a basket
 * that has fallen (a row finished), is a new build.
 */
export function stillOnBuild(choice: FocusChoice, build: BuildMark): boolean {
  if (choice.head !== build.head || build.basket < choice.basket) return false;
  choice.basket = build.basket;
  return true;
}

/** A copy of the roll, as plain data. It crosses `postMessage` (`harnessMemory.ts`). */
export function copyFocusRoll(state: GameState): FocusChoice[] {
  return (ROLLS.get(state) ?? []).map((row) => ({ ...row }));
}

/** Makes this state's roll a copy of `rows`, replacing what it held. */
export function adoptFocusRoll(state: GameState, rows: readonly FocusChoice[]): void {
  ROLLS.set(
    state,
    rows.map((row) => ({ ...row })),
  );
}
