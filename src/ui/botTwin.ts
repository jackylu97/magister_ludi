/**
 * The page's half of the bot worker (`bot.worker.ts`): send the game, wait for
 * the bots' commands, and put them to the page's own game.
 *
 * Two questions go to the worker: **play every bot seat's turn** (End Turn) and
 * **answer this paper** (the diplomacy audience). Both answer with a list of
 * commands the driver put to the reducer there, and `applyTwinReply` puts the
 * same list to the page's game through `dispatch`, so the log is the one the
 * page would have written itself.
 *
 * Every way this can fail ends on the page's own thread, as before the worker
 * existed:
 *
 *   · no `Worker` in this environment (the node tests), or the worker could not
 *     be built: `available` is false and the caller drives synchronously;
 *   · the worker threw or crashed: the reply is `unavailable`;
 *   · the page's log moved while the worker thought (the player ordered
 *     something): the reply is `moved` and nothing is applied, because the
 *     bots answered a board that is no longer there;
 *   · a replayed command came out differently on the page: `diverged`. That
 *     would mean the two copies were not the same game. It is warned about, and
 *     the caller drives whatever is left synchronously.
 *
 * Determinism: the worker's copy is a structured clone of the page's state plus
 * the bots' harness memories (`harnessMemory.ts`), so the bots read exactly
 * what they would have read here. The page applies the commands in the order
 * the worker made them, refusals included (one refusal mutates; see
 * `DriveOptions.attempt`).
 */

import { type AudienceOptions, type BotReporter, answerAudience, replayBotAttempts } from '../ai/driver';
import type { BotDecision } from '../ai/decision';
import { adoptHarnessMemory, readHarnessMemory } from '../ai/harnessMemory';
import type { Game } from '../sim/game';
import type { BotWorkerReply, BotWorkerRequest } from './bot.worker';

/** How a drive in the worker ended. Only `applied` means the bots have played. */
export type TwinOutcome = 'applied' | 'moved' | 'diverged' | 'unavailable' | 'cancelled';

export interface BotTwin {
  /** False when there is no worker to ask; the caller then plays the bots on its own thread. */
  readonly available: boolean;
  /**
   * Plays every bot seat's turn in the worker and applies the commands to
   * `getGame()`. `getGame` is asked again when the reply arrives: a different
   * game by then (a restart, a load) is `cancelled` and nothing is applied.
   */
  drive(getGame: () => Game, report?: BotReporter): Promise<TwinOutcome>;
  /**
   * `answerAudience` in the worker, applied here. Falls back to asking on this
   * thread whenever the worker's answer cannot be used, so the result is always
   * what `answerAudience` would have returned. `undefined` means the game was
   * replaced while waiting, and nothing was asked.
   */
  audience(getGame: () => Game, options: AudienceOptions): Promise<BotDecision | null | undefined>;
  /** Terminates the worker. Requests still waiting resolve as `cancelled`. */
  dispose(): void;
}

export interface BotTwinOptions {
  /** Tests hand in a fake. Production builds the module worker. */
  workerFactory?: () => Worker;
  warn?: (message: string, detail?: unknown) => void;
}

function defaultWorker(): Worker {
  return new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
}

/**
 * Puts a worker's reply to the page's game. The one place the page does so;
 * exported for the tests.
 */
export function applyTwinReply(
  game: Game,
  reply: Exclude<BotWorkerReply, { kind: 'failed' }>,
  report?: BotReporter,
): TwinOutcome {
  if (game.log.length !== reply.logLength) return 'moved';
  if (!replayBotAttempts(game, reply.attempts, report ? { report } : {})) return 'diverged';
  // The war windows are written by reading, so the replay above cannot have
  // written them; the worker's copy is the one that read. The refusal memory
  // was banked by the replay already, and this sets it to the same records.
  adoptHarnessMemory(game.state, reply.memory);
  return 'applied';
}

/** Builds the request both questions share. Posting it is the structured clone. */
function requestFor(game: Game, id: number): Omit<BotWorkerRequest & { kind: 'drive' }, 'kind'> {
  return {
    id,
    config: game.config,
    state: game.state,
    logLength: game.log.length,
    memory: readHarnessMemory(game.state),
  };
}

export function createBotTwin(options: BotTwinOptions = {}): BotTwin {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  let worker: Worker | null = null;
  let disposed = false;
  let nextId = 1;
  const waiting = new Map<number, (reply: BotWorkerReply | null) => void>();

  /** Resolves every request still waiting with "no answer", and drops the worker. */
  function fail(reason: string): void {
    if (worker !== null) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
    }
    worker = null;
    if (waiting.size > 0 && reason !== 'disposed') warn(`[bots] the bot worker stopped (${reason}); the bots play on the page instead`);
    // A copy of the entries: each resolver deletes nothing, but a caller's
    // continuation may post a new request before this loop ends.
    const resolvers = [...waiting.values()];
    waiting.clear();
    for (const resolve of resolvers) resolve(null);
  }

  function start(): Worker | null {
    if (worker !== null) return worker;
    if (disposed) return null;
    if (options.workerFactory === undefined && typeof Worker === 'undefined') return null;
    try {
      worker = (options.workerFactory ?? defaultWorker)();
    } catch (error) {
      warn('[bots] could not start the bot worker; the bots play on the page', error);
      worker = null;
      // A worker that cannot be built now will not be built later either, and
      // `available` is asked on every End Turn: do not try, and warn, each time.
      disposed = true;
      return null;
    }
    worker.onmessage = ({ data }: MessageEvent<BotWorkerReply>): void => {
      const resolve = waiting.get(data.id);
      if (resolve === undefined) return;
      waiting.delete(data.id);
      resolve(data);
    };
    worker.onerror = (event): void => {
      event.preventDefault?.();
      fail('an error in the worker');
    };
    worker.onmessageerror = (): void => fail('a reply that could not be read');
    return worker;
  }

  /** Posts a request and waits for its reply; `null` when there is no usable reply. */
  function ask(request: BotWorkerRequest): Promise<BotWorkerReply | null> {
    const target = start();
    if (target === null) return Promise.resolve(null);
    return new Promise((resolve) => {
      waiting.set(request.id, resolve);
      try {
        target.postMessage(request);
      } catch (error) {
        waiting.delete(request.id);
        warn('[bots] could not send the game to the bot worker', error);
        resolve(null);
      }
    });
  }

  // Started now rather than on the first End Turn, so the worker has loaded the
  // rules while the player was still playing their first turn.
  start();

  return {
    get available(): boolean {
      return worker !== null || start() !== null;
    },

    async drive(getGame, report) {
      const game = getGame();
      const reply = await ask({ kind: 'drive', ...requestFor(game, nextId++) });
      if (getGame() !== game) return 'cancelled';
      if (reply === null) return 'unavailable';
      if (reply.kind === 'failed') {
        warn(`[bots] the bot worker failed: ${reply.message}`);
        return 'unavailable';
      }
      if (reply.kind !== 'driven') return 'unavailable';
      const outcome = applyTwinReply(game, reply, report);
      if (outcome === 'diverged') warn('[bots] a bot command came out differently on the page than in the worker');
      return outcome;
    },

    async audience(getGame, audienceOptions) {
      const game = getGame();
      const { seatId, askerId, dealId } = audienceOptions;
      const reply = await ask({
        kind: 'audience',
        ...requestFor(game, nextId++),
        seatId,
        askerId,
        ...(dealId === undefined ? {} : { dealId }),
      });
      if (getGame() !== game) return undefined;
      if (reply !== null && reply.kind === 'answered') {
        const outcome = applyTwinReply(game, reply, audienceOptions.report);
        if (outcome === 'applied') return reply.decision;
        if (outcome === 'diverged') {
          warn('[bots] an answer came out differently on the page than in the worker');
          return reply.decision;
        }
      } else if (reply !== null && reply.kind === 'failed') {
        warn(`[bots] the bot worker failed: ${reply.message}`);
      }
      // No usable answer from the worker: ask here, on the board as it now stands.
      return answerAudience(game, audienceOptions);
    },

    dispose() {
      disposed = true;
      fail('disposed');
    },
  };
}
