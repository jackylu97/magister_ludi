/**
 * One arena game, in a thread of its own.
 *
 * A 75-turn game against two bots is about six seconds of pathfinding and
 * appraisal, and five of them on the main thread would be half a minute of a
 * frozen page. So each game gets a worker, all of them are launched at once, and
 * the page's only job while they run is to draw progress lines.
 *
 * The worker is a *shell*: it unpacks a task, calls `runArenaGame` and posts what
 * comes back. Everything that is actually the arena lives in `run.ts`, which is
 * pure and therefore testable — a worker cannot be asserted about in this suite
 * (there is no jsdom, see `controls.test.ts`), and a worker that held logic would
 * be logic nothing can check.
 *
 * The tuning sheet rides in on the task and is installed **inside** this module
 * instance and no other, which is what makes a page-level dial safe: two runs
 * with two sheets are two threads with two copies of `src/ai/aiConfig.ts`.
 */

import type { ArenaMessage, ArenaTask } from './protocol';
import { runArenaGame } from './run';

/**
 * The worker's global, declared rather than imported.
 *
 * `vite.config.ts` does the same thing with `process` and for the same reason:
 * the tsconfig types this project with the DOM lib alone, where `self` is a
 * `Window` whose `postMessage` demands a target origin. Pulling in the WebWorker
 * lib to fix one call would redefine half the DOM for every file. Two members are
 * all this file uses.
 */
declare const self: {
  postMessage(message: ArenaMessage): void;
  addEventListener(type: 'message', listener: (event: { data: ArenaTask }) => void): void;
};

self.addEventListener('message', (event) => {
  const task = event.data;
  try {
    const every = Math.max(1, task.progressEvery);
    const reading = runArenaGame(task.spec, (turn) => {
      // Every turn would be a message per six milliseconds of work per game, all
      // of them landing on the thread that has to stay responsive.
      if (turn % every === 0) self.postMessage({ kind: 'progress', index: task.index, turn });
    });
    self.postMessage({ kind: 'done', index: task.index, reading });
  } catch (error) {
    // A thrown simulation is a bug worth seeing rather than a run that quietly
    // never finishes: the page prints this against the game that raised it.
    self.postMessage({
      kind: 'failed',
      index: task.index,
      error: error instanceof Error ? `${error.message}` : String(error),
    });
  }
});
