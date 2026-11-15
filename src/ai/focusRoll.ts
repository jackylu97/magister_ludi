/**
 * **The focus roll: when the bot last pointed each town's citizens** (bot batch
 * BP9, `docs/flags.md` (ooooooo), fault 4).
 *
 * `focusCommand` (`bot.ts`) compares two placements of a town's citizens and
 * prices the difference at the seat's live prices. The comparison itself does not
 * read the focus the town stands on: priced on both foci at the same turn, a town
 * gets the same answer (BP9 checked two towns of seed 7 over four turns each). What moves is the
 * price of gold and of science, which comes from the seat's want book and changes
 * from turn to turn with what the seat could buy. Elmsgate (seed 7, seat 4)
 * priced a coin at 19.8, 22.3, 11.4 and 21.2 on turns 60 to 63, while its lean on
 * the hammers won or lost by one to twenty points. So the answer flipped nearly
 * every turn. The end check of bot pass 3 found two thirds of all focus orders
 * going back to a focus the town held in the last five turns.
 *
 * The user allowed a plain guard (2026-11-14): the bot does not undo its own
 * focus order within a few turns (`driver.focusHoldTurns`). A hold that ended
 * when the town's build changed was tried and dropped: builds end often, and on
 * four seeds it left three in four of the quick undos standing. The bot may
 * store nothing in `GameState`, so this roll keeps the date of each order the
 * way `musterRoll.ts` keeps the date of each unit:
 *
 *   - **beside the state, never in it.** A `WeakMap` on the live state object.
 *     Nothing in a save can see it and no rule reads it.
 *   - **one row a town**, the last order the bot gave it: the turn and the
 *     focus. A town ordered again replaces its row.
 *   - **a save loaded mid-game forgets.** The guard is then off until the bot
 *     next points each town, which is the muster roll's amnesia, accepted for
 *     the same reason.
 *
 * The bot worker thinks on a copy of the state, so the roll is a harness memory
 * (`harnessMemory.ts`): every request carries it and every reply brings it back.
 */

import type { CitizenFocus } from '../sim/rulesData';
import type { GameState } from '../sim/state';

/** The last focus order the bot gave one town. */
export interface FocusOrder {
  cityId: number;
  /** `state.turn` when the order was given. Absolute; nothing ticks. */
  turn: number;
  /** The focus the order named. */
  focus: CitizenFocus;
}

const ROLLS = new WeakMap<GameState, FocusOrder[]>();

/** Writes down that the bot is pointing this town now. Replaces the town's last row. */
export function noteFocusOrder(state: GameState, cityId: number, focus: CitizenFocus): void {
  let roll = ROLLS.get(state);
  if (roll === undefined) {
    roll = [];
    ROLLS.set(state, roll);
  }
  const row = roll.find((order) => order.cityId === cityId);
  if (row === undefined) roll.push({ cityId, turn: state.turn, focus });
  else {
    row.turn = state.turn;
    row.focus = focus;
  }
}

/** The last focus order the bot gave this town, or `null` when the roll holds none. */
export function lastFocusOrder(state: GameState, cityId: number): FocusOrder | null {
  return ROLLS.get(state)?.find((order) => order.cityId === cityId) ?? null;
}

/** A copy of the roll, as plain data. It crosses `postMessage` (`harnessMemory.ts`). */
export function copyFocusRoll(state: GameState): FocusOrder[] {
  return (ROLLS.get(state) ?? []).map((order) => ({ ...order }));
}

/** Makes this state's roll a copy of `orders`, replacing what it held. */
export function adoptFocusRoll(state: GameState, orders: readonly FocusOrder[]): void {
  ROLLS.set(
    state,
    orders.map((order) => ({ ...order })),
  );
}
