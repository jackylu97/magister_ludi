/**
 * **The muster roll: which units a seat raised recently** (batch BP1 of bot pass
 * 3, `docs/flags.md` (ooooooo) P2).
 *
 * The disband arm must not let go of a unit raised within the last
 * `solvency.keepRecruitsTurns` turns, so that a seat cannot train a soldier one
 * turn and disband it the next (the audit's build-and-disband loops,
 * `docs/audit/bot-pass-3-competitiveness.md` §3.2). A `Unit` carries no turn of
 * birth, and the bot may store nothing in `GameState`. So the bot keeps the date
 * itself, like the refusal memory (`dealMemory.ts`):
 *
 *   - **beside the state, never in it.** The roll hangs off the live state
 *     object in a `WeakMap`. Nothing in a save can see it and no rule reads it.
 *   - **one mark a turn.** Ids come from one counter (`GameState.nextEntityId`)
 *     and only go up. At the first bot decision of each turn the roll writes
 *     down the next id the counter will hand out. A unit whose id is at or
 *     above the mark for turn `t` was raised on turn `t` or later. A unit that a
 *     town finishes at the end of a turn gets an id below the next turn's mark,
 *     so it counts as raised on the turn its town finished it.
 *   - **a save loaded mid-game forgets.** The roll then starts at the turn of
 *     the load. A unit older than the first mark is read as old, so the only
 *     effect is that the guard is off for the units raised before the load. That
 *     is the war ledger's amnesia, accepted for the same reason.
 *
 * The bot worker thinks on a copy of the state, so the roll is a harness memory
 * (`harnessMemory.ts`): every request carries it and every reply brings it back.
 */

import type { GameState, Unit } from '../sim/state';

/** The first id the counter handed out on or after a turn's first bot decision. */
export interface MusterMark {
  /** `state.turn` when the mark was written. Absolute; nothing ticks. */
  turn: number;
  /** `state.nextEntityId` at that moment. */
  nextId: number;
}

const ROLLS = new WeakMap<GameState, MusterMark[]>();

/**
 * Writes this turn's mark if the roll has none yet. Asked at the top of every
 * bot decision. It is cheap: one lookup and one compare once the mark is
 * written, so the first decision of the turn writes it and every later one
 * returns at once.
 */
export function markMusterTurn(state: GameState): void {
  let roll = ROLLS.get(state);
  if (roll === undefined) {
    roll = [];
    ROLLS.set(state, roll);
  }
  const last = roll[roll.length - 1];
  if (last !== undefined && last.turn >= state.turn) return;
  roll.push({ turn: state.turn, nextId: state.nextEntityId });
}

/**
 * Was this unit raised within the last `turns` turns, as far as the roll
 * knows?
 *
 * The answer is the earliest mark on or after turn `state.turn − turns`: a unit
 * whose id is at or above it was raised in the window. When the roll does not
 * reach back that far (a save loaded recently), the earliest mark it does hold
 * is used, which can only call a unit old that was in fact new, never the
 * reverse. No mark at all answers `false`.
 */
export function raisedWithin(state: GameState, unit: Unit, turns: number): boolean {
  const roll = ROLLS.get(state);
  if (roll === undefined || turns <= 0) return false;
  const since = state.turn - turns;
  // Walked from the newest mark back, since the window is the last few turns.
  let earliest: MusterMark | null = null;
  for (let index = roll.length - 1; index >= 0; index--) {
    const mark = roll[index]!;
    if (mark.turn < since) break;
    earliest = mark;
  }
  return earliest !== null && unit.id >= earliest.nextId;
}

/** How many marks this state's roll holds. For the tests. */
export function musterRollSize(state: GameState): number {
  return ROLLS.get(state)?.length ?? 0;
}

/** A copy of the roll, as plain data. It crosses `postMessage` (`harnessMemory.ts`). */
export function copyMusterRoll(state: GameState): MusterMark[] {
  return (ROLLS.get(state) ?? []).map((mark) => ({ ...mark }));
}

/** Makes this state's roll a copy of `marks`, replacing what it held. */
export function adoptMusterRoll(state: GameState, marks: readonly MusterMark[]): void {
  ROLLS.set(
    state,
    marks.map((mark) => ({ ...mark })),
  );
}
