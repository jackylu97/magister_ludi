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
 * The worker coordinates the plans on that copy and records every command
 * that reaches its reducer, accepted or refused. Its seat workers only plan.
 * The coordinator applies the plans in seat order and handles any conflicts.
 * The page then puts the same commands, in the same order, to its own state
 * through `dispatch` (`replayBotAttempts`), so its log and its state come out
 * exactly as if the bots had thought on the page. Nothing here decides
 * anything the page could not have decided: the bot is a function of the state
 * and those memories, and both arrive whole.
 *
 * The seat workers live across requests. Each request starts from a new copy
 * because a copy kept across turns could miss a command from the page.
 *
 * `test/ui/botWorker.test.ts` and `test/ui/botWorker.slow.test.ts` run
 * `answerBotWorker` below, through `structuredClone`, against the page's own
 * synchronous drive and compare the logs and state digests.
 */

import { type BotAttempt, answerAudience, botSeatsToDrive, driveBots, driveBotsAsync } from '../ai/driver';
import type { BotDecision } from '../ai/decision';
import { type HarnessMemory, adoptHarnessMemory, readHarnessMemory } from '../ai/harnessMemory';
import type { Command, CommandResult } from '../sim/commands';
import type { Game } from '../sim/game';
import type { GameConfig, GameState } from '../sim/state';
import { createBotPlanPool } from './botPlanPool';
import { type BotTuning, installBotTuning } from './botPlanProtocol';

/** What every request carries: the page's game as it stands, and an id to answer by. */
interface TwinRequest {
  id: number;
  config: GameConfig;
  state: GameState;
  /** The page's log length when it asked. Echoed back so the page can tell whether it has moved since. */
  logLength: number;
  memory: HarnessMemory;
  tuning?: BotTuning;
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

function startRequest(request: BotWorkerRequest) {
  const started = performance.now();
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
  return { game, attempt, reply };
}

function failedReply(request: BotWorkerRequest, error: unknown): BotWorkerReply {
  return { kind: 'failed', id: request.id, message: error instanceof Error ? error.message : String(error) };
}

/** The synchronous path takes ownership of the supplied state copy. */
export function answerBotWorker(request: BotWorkerRequest): BotWorkerReply {
  const restore = request.tuning === undefined ? undefined : installBotTuning(request.tuning);
  try {
    const { game, attempt, reply } = startRequest(request);
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
    return failedReply(request, error);
  } finally {
    restore?.();
  }
}

/** A single seat and diplomacy already run off the page thread. */
export async function answerBotWorkerAsync(
  request: BotWorkerRequest,
  pool: ReturnType<typeof createBotPlanPool>,
): Promise<BotWorkerReply> {
  if (request.kind !== 'drive' || !pool.available || botSeatsToDrive(request.state).length < 2) {
    return answerBotWorker(request);
  }
  const restore = request.tuning === undefined ? undefined : installBotTuning(request.tuning);
  try {
    const { game, attempt, reply } = startRequest(request);
    await driveBotsAsync(game, pool.plan(), { attempt });
    return { kind: 'driven', ...reply() };
  } catch (error) {
    return failedReply(request, error);
  } finally {
    restore?.();
  }
}

/** The half of a worker's global this file uses (the `WebWorker` lib cannot share a project with `DOM`). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<BotWorkerRequest>) => void) | null;
  postMessage(message: BotWorkerReply): void;
}

// Wired only where there is a worker, so the node tests can import the function above.
if (typeof self !== 'undefined' && typeof document === 'undefined' && typeof self.postMessage === 'function') {
  const scope = self as unknown as WorkerScope;
  const pool = createBotPlanPool();
  let queued = Promise.resolve();
  scope.onmessage = ({ data }): void => {
    // Finish the current request before installing the next request's tuning.
    const respond = async (): Promise<void> => {
      try {
        scope.postMessage(await answerBotWorkerAsync(data, pool));
      } catch (error) {
        scope.postMessage(failedReply(data, error));
      }
    };
    queued = queued.then(respond, respond);
  };
}
