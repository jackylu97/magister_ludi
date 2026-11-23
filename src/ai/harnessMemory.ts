/**
 * The bot memories that live beside the state rather than in it, as one value.
 *
 * Three memories affect decisions: refused deals, unit recruitment dates and
 * city focus choices. They belong to the bot driver rather than the saved game.
 * A worker must receive them with its copy of the board, then return changes,
 * so it makes the same decisions as the page.
 *
 * Since bot batch BP16, stage C1, each bot seat also plans its turn on its own
 * copy of the frozen board (`frozenBoard.ts`). Each copy is handed these
 * memories at the freeze, and the seat's own rows come back to the real state
 * after its plan (`mergeSeatMemory`).
 *
 * This file is the list of such memories. A new `WeakMap<GameState, …>` in
 * `src/ai/` that a bot decision reads and that is not a pure cache keyed on
 * `state.revision` joins here, or the worker's bots and the page's bots stop
 * being the same players. `test/ui/botWorker.test.ts` reads the sources and
 * fails on one that has not been listed.
 */

import { type DealRefusalRecord, adoptDealMemory, copyDealMemory } from './dealMemory';
import { type FocusChoice, adoptFocusRoll, copyFocusRoll } from './focusRoll';
import { type MusterMark, adoptMusterRoll, copyMusterRoll } from './musterRoll';
import type { GameState } from '../sim/state';

export interface HarnessMemory {
  deals: DealRefusalRecord[];
  muster: MusterMark[];
  /** The focus roll (bot batches BP9 and BP10, `focusRoll.ts`). */
  focus: FocusChoice[];
}

/** A copy of every harness memory this state holds. Plain data: it crosses `postMessage`. */
export function readHarnessMemory(state: GameState): HarnessMemory {
  return {
    deals: copyDealMemory(state),
    muster: copyMusterRoll(state),
    focus: copyFocusRoll(state),
  };
}

/** Makes this state's harness memories a copy of `memory`, replacing what it held. */
export function adoptHarnessMemory(state: GameState, memory: HarnessMemory): void {
  adoptDealMemory(state, memory.deals);
  adoptMusterRoll(state, memory.muster);
  adoptFocusRoll(state, memory.focus ?? []);
}
