/**
 * The simulation's two slow entry points, run off the main thread.
 *
 * A worker that does nothing of its own: it calls the same `newGame` and the
 * same `tryReplay` the main thread used to call, in the same order, and posts
 * back what they produced. **Determinism is the whole reason it may exist**
 * (CLAUDE.md hard rule 2) — the sim is pure and synchronous, no command is
 * distributed, no walk is split, and a state built here is byte-identical to one
 * built on the main thread because it was built by the same code from the same
 * `{config, log}`. `test/ui/gameLoader.test.ts` pins that against the
 * synchronous path rather than trusting the argument.
 *
 * Why it is worth a worker: a hundred-turn save is a thousand commands and the
 * turn resolutions inside them, and walking that log measured **3.9 seconds of
 * blocked main thread** in the browser (P7, `docs/plans/painted-performance-audit.md`
 * #22) against **6 ms** to hand the finished state back. The landing keeps
 * drawing, and a longer game only makes the gap wider.
 *
 * Nothing here touches the DOM, and `src/sim/` stays pure: this file is in
 * `src/ui/` precisely because `self`/`postMessage` are platform facts the
 * simulation is not allowed to know about.
 */

import type { Command } from '../sim/commands';
import { tryReplay } from '../sim/game';
import { type GameConfig, newGame } from '../sim/state';

/** Main thread → worker. One message, one reply, then the worker is terminated. */
export type GameWorkerRequest =
  | { kind: 'create'; config: GameConfig }
  | { kind: 'replay'; config: GameConfig; log: Command[] };

/**
 * Worker → main thread.
 *
 * `unbuildable` is `newGame`'s own throw carried as data — an exception does not
 * cross the seam, and the sentence it carries is the one the player is owed.
 * `refused` is the reducer's refusal with the index the log stopped at, exactly
 * as `tryReplay` reported it.
 */
export type GameWorkerReply =
  | { kind: 'state'; state: unknown; walkMs: number }
  | { kind: 'refused'; index: number; type: string; error: string; walkMs: number }
  | { kind: 'unbuildable'; message: string };

/**
 * Sent while the log walks, **once per turn it crosses into** — the rate
 * `ReplayWatcher` exists to fix. A hundred-and-twenty-turn save sends about a
 * hundred and twenty of these; per command it would send four thousand, which
 * is a message pump rather than a progress bar.
 */
export interface GameWorkerProgress {
  kind: 'progress';
  turn: number;
}

export type GameWorkerMessage = GameWorkerReply | GameWorkerProgress;

/**
 * The whole of the worker, as a function of its request.
 *
 * Pulled out of the message handler so the test can run **this** — rather than a
 * second copy of it written in the test file — against the synchronous path and
 * compare the two states byte for byte. The wiring below is three lines and
 * carries no logic of its own for a copy to drift from.
 */
export function answerGameWorker(
  request: GameWorkerRequest,
  onTurn?: (turn: number) => void,
): GameWorkerReply {
  const started = performance.now();
  try {
    if (request.kind === 'create') {
      // `createGame`'s state half. The log and the normalised config are the
      // caller's to keep — only the state is expensive enough to be here. A new
      // world has no log, so there is nothing to report the progress of.
      return { kind: 'state', state: newGame(request.config), walkMs: performance.now() - started };
    }
    const replayed = tryReplay(request.config, request.log, (turn) => onTurn?.(turn));
    if (!replayed.ok) {
      const { index, type, error } = replayed.failure;
      return { kind: 'refused', index, type, error, walkMs: performance.now() - started };
    }
    return { kind: 'state', state: replayed.state, walkMs: performance.now() - started };
  } catch (error) {
    return { kind: 'unbuildable', message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The half of a worker's global this file uses. Declared rather than pulled in
 * from the `WebWorker` lib, which cannot share a project with `DOM` — and the
 * rest of the tree is DOM.
 */
interface WorkerScope {
  onmessage: ((event: MessageEvent<GameWorkerRequest>) => void) | null;
  postMessage(message: GameWorkerMessage): void;
}

// Wired only where there is a worker to wire it to, so the node test run can
// import the answer above without a `self` to stand in.
if (typeof self !== 'undefined' && typeof (self as { postMessage?: unknown }).postMessage === 'function') {
  const scope = self as unknown as WorkerScope;
  scope.onmessage = ({ data }): void =>
    scope.postMessage(
      answerGameWorker(data, (turn) => scope.postMessage({ kind: 'progress', turn })),
    );
}
