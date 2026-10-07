/**
 * The bots' thinking, run off the main thread.
 *
 * The browser performance audit of 2026-10-06 (findings 2 and 8) measured End
 * Turn blocking the page for 0.6 s at turn 50, 1.5 s at turn 100 and several
 * seconds later on, and about four fifths of that is the bots deciding what to
 * do, not the reducer applying it. A diplomacy click also froze the page while
 * a bot built its appraisal to answer the paper.
 *
 * How it stays the same game
 * --------------------------
 * Each request carries a structured clone of the page's state (the same seam
 * the loader's worker hands a finished state back through) and the bots' two
 * memories that live beside the state rather than in it (`harnessMemory.ts`).
 * The worker runs the ordinary `driveBots` or `answerAudience` on that copy and
 * records every command the driver put to the reducer, accepted or refused.
 * The page then puts the same commands, in the same order, to its own state
 * through `dispatch` (`replayBotAttempts`), so its log and its state come out
 * exactly as if the bots had thought on the page. Nothing here decides
 * anything the page could not have decided: the bot is a function of the state
 * and those memories, and both arrive whole.
 *
 * The worker keeps nothing between requests. A copy that lived across turns
 * would have to be fed every command the page accepts and could drift if one
 * was missed; a fresh copy per request cannot drift, and costs the page one
 * structured clone of the state (about 10 ms at turn 150).
 *
 * `test/ui/botWorker.test.ts` and `test/ui/botWorker.slow.test.ts` run
 * `answerBotWorker` below, through `structuredClone`, against the page's own
 * synchronous drive and compare the logs and state digests.
 */

import { type BotAttempt, answerAudience, driveBots } from '../ai/driver';
import type { BotDecision } from '../ai/decision';
import { type HarnessMemory, adoptHarnessMemory, readHarnessMemory } from '../ai/harnessMemory';
import type { Command, CommandResult } from '../sim/commands';
import type { Game } from '../sim/game';
import type { GameConfig, GameState } from '../sim/state';

/** What every request carries: the page's game as it stands, and an id to answer by. */
interface TwinRequest {
  id: number;
  config: GameConfig;
  state: GameState;
  /** The page's log length when it asked. Echoed back so the page can tell whether it has moved since. */
  logLength: number;
  memory: HarnessMemory;
}

/** Page → worker. */
export type BotWorkerRequest =
  | (TwinRequest & { kind: 'drive' })
  | (TwinRequest & { kind: 'audience'; seatId: number; askerId: number; dealId?: number });

/** What the worker did, for the page to do again. */
interface TwinReply {
  id: number;
  logLength: number;
  attempts: BotAttempt[];
  memory: HarnessMemory;
  /** How long the bots took to think, in the worker. For the console and for measuring. */
  thinkMs: number;
}

/** Worker → page. `failed` is a thrown error carried as data; the page then drives on its own thread. */
export type BotWorkerReply =
  | (TwinReply & { kind: 'driven' })
  | (TwinReply & { kind: 'answered'; decision: BotDecision | null })
  | { kind: 'failed'; id: number; message: string };

/**
 * The whole of the worker, as a function of its request. Exported so the tests
 * run this function rather than a copy of it.
 *
 * It takes ownership of `request.state` and changes it; the page's own state is
 * never this object.
 */
export function answerBotWorker(request: BotWorkerRequest): BotWorkerReply {
  const started = performance.now();
  try {
    const game: Game = { config: request.config, state: request.state, log: [] };
    adoptHarnessMemory(game.state, request.memory);
    const attempts: BotAttempt[] = [];
    const attempt = (command: Command, result: CommandResult): void => {
      attempts.push({ command, ok: result.ok });
    };
    const reply = (): TwinReply => ({
      id: request.id,
      logLength: request.logLength,
      attempts,
      memory: readHarnessMemory(game.state),
      thinkMs: performance.now() - started,
    });
    if (request.kind === 'drive') {
      driveBots(game, { attempt });
      return { kind: 'driven', ...reply() };
    }
    const decision = answerAudience(game, {
      seatId: request.seatId,
      askerId: request.askerId,
      ...(request.dealId === undefined ? {} : { dealId: request.dealId }),
      attempt,
    });
    return { kind: 'answered', ...reply(), decision };
  } catch (error) {
    return { kind: 'failed', id: request.id, message: error instanceof Error ? error.message : String(error) };
  }
}

/** The half of a worker's global this file uses (the `WebWorker` lib cannot share a project with `DOM`). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<BotWorkerRequest>) => void) | null;
  postMessage(message: BotWorkerReply): void;
}

// Wired only where there is a worker, so the node tests can import the function above.
if (typeof self !== 'undefined' && typeof (self as { postMessage?: unknown }).postMessage === 'function') {
  const scope = self as unknown as WorkerScope;
  scope.onmessage = ({ data }): void => scope.postMessage(answerBotWorker(data));
}
