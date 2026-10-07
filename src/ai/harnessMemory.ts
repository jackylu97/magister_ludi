/**
 * The bot memories that live beside the state rather than in it, as one value.
 *
 * Two bot memories hang off the live state object in a `WeakMap` instead of
 * being saved: the refusal memory (`dealMemory.ts`) and the war windows
 * (`warLedger.ts`). Both read the rulings in their own docblocks: they are not
 * facts about the world, so a save does not carry them.
 *
 * A second copy of the same game does not carry them either, and the bot
 * worker (`src/ui/bot.worker.ts`) drives the bots on exactly such a copy: a
 * structured clone of the page's state. Without these memories the copy's bots
 * would re-send a paper the page's bots remember was refused, or open a war
 * window on a later turn, and the two games would part. So every request to
 * the worker carries this value, and every reply brings it back.
 *
 * This file is the list of such memories. A new `WeakMap<GameState, …>` in
 * `src/ai/` that a bot decision reads and that is not a pure cache keyed on
 * `state.revision` joins here, or the worker's bots and the page's bots stop
 * being the same players. `test/ui/botWorker.test.ts` reads the sources and
 * fails on one that has not been listed.
 */

import { type DealRefusalRecord, adoptDealMemory, copyDealMemory } from './dealMemory';
import { type WarLedgerEntry, adoptWarLedger, copyWarLedger } from './warLedger';
import type { GameState } from '../sim/state';

export interface HarnessMemory {
  deals: DealRefusalRecord[];
  wars: WarLedgerEntry[];
}

/** A copy of every harness memory this state holds. Plain data: it crosses `postMessage`. */
export function readHarnessMemory(state: GameState): HarnessMemory {
  return { deals: copyDealMemory(state), wars: copyWarLedger(state) };
}

/** Makes this state's harness memories a copy of `memory`, replacing what it held. */
export function adoptHarnessMemory(state: GameState, memory: HarnessMemory): void {
  adoptDealMemory(state, memory.deals);
  adoptWarLedger(state, memory.wars);
}
