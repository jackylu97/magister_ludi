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
 *   · the game or the bot's inputs changed while the worker thought: the
 *     reply is `moved` and nothing is applied;
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

import type { BotDecision } from '../ai/decision';
import { type AudienceOptions, type BotReporter, answerAudience, botSeatsToDrive, replayBotAttempts } from '../ai/driver';
import { adoptHarnessMemory, readHarnessMemory } from '../ai/harnessMemory';
import type { Game } from '../sim/game';
import { realPlayers } from '../sim/state';
import type { BotWorkerReply, BotWorkerRequest } from './bot.worker';
import { readBotTuning } from './botPlanProtocol';

/** How a drive in the worker ended. Only `applied` means the bots have played. */
export type TwinOutcome = 'applied' | 'moved' | 'diverged' | 'unavailable' | 'cancelled';

interface BotTwin {
  /** False when there is no worker to ask; the caller then plays the bots on its own thread. */
  readonly available: boolean;
  /** Prepares a drive on a copy. Only `drive` can apply its reply. */
  prepare(game: Game): void;
  /** Drops the prepared reply and any request queued behind it. */
  invalidate(): void;
  /** Cancels pending replies before they can reach a suspended game. */
  cancel(): void;
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

interface BotTwinOptions {
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
function requestFor(game: Game, id: number) {
  return {
    id,
    config: game.config,
    state: game.state,
    logLength: game.log.length,
    memory: readHarnessMemory(game.state),
    tuning: readBotTuning(game.state),
  };
}

interface BotInput {
  game: Game;
  state: Game['state'];
  logLength: number;
  turn: number;
  revision: number;
  randomState: number;
  offers: string;
  botSeats: string;
  memory: string;
  tuning: string;
}

function personOffers(state: Game['state']): string {
  // A refused pick of a taken great person can redraw an offer without
  // adding a command to the log or changing the revision.
  return JSON.stringify(realPlayers(state).map((player) => player.greatPersonOffer));
}

function botInput(game: Game, { memory, tuning }: ReturnType<typeof requestFor>): BotInput {
  const { state } = game;
  return {
    game,
    state,
    logLength: game.log.length,
    turn: state.turn,
    revision: state.revision,
    randomState: state.rng.state,
    offers: personOffers(state),
    botSeats: botSeatsToDrive(state).join(','),
    memory: JSON.stringify(memory),
    tuning: JSON.stringify(tuning),
  };
}

function sameInput(input: BotInput, game: Game): boolean {
  const { state } = game;
  return input.game === game && input.state === state &&
    input.logLength === game.log.length && input.turn === state.turn &&
    input.revision === state.revision && input.randomState === state.rng.state &&
    input.botSeats === botSeatsToDrive(state).join(',') &&
    input.offers === personOffers(state) &&
    input.memory === JSON.stringify(readHarnessMemory(state)) &&
    input.tuning === JSON.stringify(readBotTuning(state));
}

interface PreparedDrive {
  input: BotInput;
  reply: Promise<BotWorkerReply | null>;
  postedAt: number;
}

const MIN_DRIVE_DEADLINE_MS = 60;
const MAX_STALE_WAIT_MS = 80;

export function createBotTwin(options: BotTwinOptions = {}): BotTwin {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  let worker: Worker | null = null;
  let disposed = false;
  let nextId = 1;
  let generation = 0;
  let foreground = 0;
  // Only a matching prepared reply can be claimed. An invalidated drive can
  // still be running, so keep only the latest game to read when it finishes.
  let prepared: PreparedDrive | null = null;
  let runningBackground: PreparedDrive | null = null;
  let queued: Game | null = null;
  let backgroundAvailable = true;
  let lastDriveMs = 0;
  const waiting = new Map<number, (reply: BotWorkerReply | null) => void>();

  /** Resolves every request still waiting with "no answer", and drops the worker. */
  function fail(reason: string, report = runningBackground === null): void {
    if (worker !== null) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
    }
    worker = null;
    if (waiting.size > 0 && report) warn(`[bots] the bot worker stopped (${reason}); the bots play on the page instead`);
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
  function ask(request: BotWorkerRequest, report = true): Promise<BotWorkerReply | null> {
    const target = start();
    if (target === null) return Promise.resolve(null);
    return new Promise((resolve) => {
      waiting.set(request.id, resolve);
      try {
        target.postMessage(request);
      } catch (error) {
        waiting.delete(request.id);
        if (report) warn('[bots] could not send the game to the bot worker', error);
        resolve(null);
      }
    });
  }

  function invalidate(): void {
    prepared = null;
    queued = null;
  }

  function prepareQueued(): void {
    if (foreground > 0 || runningBackground !== null || queued === null) return;
    const game = queued;
    queued = null;
    prepare(game);
  }

  function prepare(game: Game): void {
    if (disposed || !backgroundAvailable || game.state.winnerId !== null) return;
    if (botSeatsToDrive(game.state).length === 0) return;
    if (prepared !== null && sameInput(prepared.input, game)) return;
    prepared = null;
    if (foreground > 0 || runningBackground !== null) {
      queued = game;
      return;
    }
    const work = askDrive(game, false);
    prepared = work;
    runningBackground = work;
    void work.reply.then((result) => {
      if (runningBackground !== work) return;
      runningBackground = null;
      if (result?.kind !== 'driven') {
        if (prepared === work) prepared = null;
        // Let the next actual drive or audience use the normal fallback.
        backgroundAvailable = false;
        queued = null;
      }
      prepareQueued();
    });
  }

  function askDrive(game: Game, report: boolean): PreparedDrive {
    const request = requestFor(game, nextId++);
    const input = botInput(game, request);
    const postedAt = performance.now();
    const started = generation;
    const reply = ask({ kind: 'drive', ...request }, report);
    void reply.then((result) => {
      if (generation === started && result?.kind === 'driven') {
        lastDriveMs = performance.now() - postedAt;
      }
    });
    return { input, reply, postedAt };
  }

  function takePrepared(game: Game): PreparedDrive | null {
    const work = prepared;
    invalidate();
    if (work !== null && sameInput(work.input, game)) {
      // The same request is now foreground work. An audience must leave it alone.
      if (runningBackground === work) runningBackground = null;
      return work;
    }
    return null;
  }

  /** A short wait can keep the coordinator and its seat workers warm. */
  function waitForBackground(): Promise<void> | null {
    const work = runningBackground;
    if (work === null || waiting.size === 0) return null;
    const age = performance.now() - work.postedAt;
    const deadline = Math.max(MIN_DRIVE_DEADLINE_MS, lastDriveMs * 2);
    const wait = Math.min(MAX_STALE_WAIT_MS, deadline - age);
    if (wait <= 0) {
      interruptBackground();
      return null;
    }
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (runningBackground === work) interruptBackground();
        resolve();
      }, wait);
      void work.reply.then(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  function interruptBackground(): void {
    if (runningBackground === null) return;
    // A worker cannot interrupt a synchronous planner. Drop it only when a
    // foreground request would otherwise have to wait for stale work.
    runningBackground = null;
    if (waiting.size > 0) fail('background drive cancelled', false);
  }

  function cancel(): void {
    generation += 1;
    lastDriveMs = 0;
    invalidate();
    runningBackground = null;
    if (waiting.size > 0) fail('cancelled', false);
  }

  // Started now rather than on the first End Turn, so the worker has loaded the
  // rules while the player was still playing their first turn.
  start();

  return {
    get available(): boolean {
      return worker !== null || start() !== null;
    },

    prepare,
    invalidate,
    cancel,

    async drive(getGame, report) {
      const game = getGame();
      const started = generation;
      foreground += 1;
      try {
        let work = takePrepared(game);
        if (work === null) {
          const waitingForWorker = waitForBackground();
          if (waitingForWorker !== null) await waitingForWorker;
          if (generation !== started || getGame() !== game) return 'cancelled';
          work = askDrive(game, true);
        }
        const reply = await work.reply;
        if (generation !== started || getGame() !== game) return 'cancelled';
        if (!sameInput(work.input, game)) return 'moved';
        if (reply === null) return 'unavailable';
        if (reply.kind === 'failed') {
          warn(`[bots] the bot worker failed: ${reply.message}`);
          return 'unavailable';
        }
        if (reply.kind !== 'driven') return 'unavailable';
        backgroundAvailable = true;
        const outcome = applyTwinReply(game, reply, report);
        if (outcome === 'diverged') warn('[bots] a bot command came out differently on the page than in the worker');
        return outcome;
      } finally {
        foreground -= 1;
        prepareQueued();
      }
    },

    async audience(getGame, audienceOptions) {
      const game = getGame();
      const started = generation;
      invalidate();
      interruptBackground();
      foreground += 1;
      try {
        const { seatId, askerId, dealId } = audienceOptions;
        const request = requestFor(game, nextId++);
        const input = botInput(game, request);
        const reply = await ask({
          kind: 'audience',
          ...request,
          seatId,
          askerId,
          ...(dealId === undefined ? {} : { dealId }),
        });
        if (generation !== started || getGame() !== game) return undefined;
        if (reply !== null && reply.kind === 'answered' && sameInput(input, game)) {
          backgroundAvailable = true;
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
      } finally {
        foreground -= 1;
        prepareQueued();
      }
    },

    dispose() {
      disposed = true;
      cancel();
      fail('disposed', false);
    },
  };
}
