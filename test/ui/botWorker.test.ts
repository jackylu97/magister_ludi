/**
 * The bot worker (`src/ui/bot.worker.ts`, `src/ui/botTwin.ts`): the bots think
 * on a structured clone of the page's state, and the page applies their
 * commands. These tests run the worker's real body behind `structuredClone`,
 * which is the `postMessage` seam, and hold it to the page's own synchronous
 * drive: the same log, the same state digest, the same harness memories.
 *
 * The long game, where the bots fight, trade and settle, is the slow tier's
 * (`botWorker.slow.test.ts`). This file pins the mechanism on a short one and
 * on built boards.
 */

import { describe, expect, it } from 'vitest';
import { answerAudience, driveBots } from '../../src/ai/driver';
import { dealMemorySize } from '../../src/ai/dealMemory';
import { readHarnessMemory } from '../../src/ai/harnessMemory';
import { warLedgerSize } from '../../src/ai/warLedger';
import { type Command } from '../../src/sim/commands';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { bumpRevision, playerById } from '../../src/sim/state';
import { atWar, openWar } from '../../src/sim/wars';
import { type BotWorkerReply, type BotWorkerRequest, answerBotWorker } from '../../src/ui/bot.worker';
import { applyTwinReply, createBotTwin } from '../../src/ui/botTwin';
import { rosterFor } from '../../src/ui/gameSetup';
import { digestOfState } from '../sim/aiDigestHelpers';
import { playWithBotsThinking } from './botWorkerHelpers';

/** A fake `Worker` that runs the real worker body through the structured-clone seam. */
function fakeWorker(behaviour: 'answer' | 'error' = 'answer') {
  return (): Worker => {
    const fake = {
      onmessage: null as ((event: MessageEvent<BotWorkerReply>) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      onmessageerror: null as (() => void) | null,
      terminated: false,
      postMessage(request: BotWorkerRequest): void {
        const copy = structuredClone(request);
        queueMicrotask(() => {
          if (fake.terminated) return;
          if (behaviour === 'error') {
            fake.onerror?.({ preventDefault() {} } as ErrorEvent);
            return;
          }
          fake.onmessage?.({ data: structuredClone(answerBotWorker(copy)) } as MessageEvent<BotWorkerReply>);
        });
      },
      terminate(): void {
        fake.terminated = true;
      },
    };
    return fake as unknown as Worker;
  };
}

function driveRequest(game: Game): BotWorkerRequest {
  return {
    kind: 'drive',
    id: 1,
    config: game.config,
    state: game.state,
    logLength: game.log.length,
    memory: readHarnessMemory(game.state),
  };
}

/** A two-seat duel whose seat 1 is a bot: the `aiDiplomacy.test.ts` table. */
function table(): Game {
  return createGame({
    seed: 20260907,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a' },
    ],
  });
}

function propose(playerId: number, targetId: number, give: unknown, take: unknown): Command {
  return { type: 'proposeDeal', playerId, targetId, give, take } as unknown as Command;
}

const CONFIG = { seed: 3, sizeName: 'duel', players: rosterFor(4), barbarians: true };

describe('a game ended through the bot worker is the game ended on the page', () => {
  it('gives the same log and the same state, turn by turn', () => {
    const page = playWithBotsThinking(CONFIG, 12, 'page');
    const worker = playWithBotsThinking(CONFIG, 12, 'worker');
    expect(worker.outcomes.every((outcome) => outcome === 'applied')).toBe(true);
    expect(worker.digests).toEqual(page.digests);
    expect(JSON.stringify(worker.game.log)).toBe(JSON.stringify(page.game.log));
    // Every bot seat played: the log holds their orders, not only their endTurns.
    expect(page.game.log.filter((command) => command.playerId !== 0 && command.type !== 'endTurn').length)
      .toBeGreaterThan(30);
  });
});

describe('applying a reply', () => {
  it('applies nothing when the page has moved since it asked', () => {
    const game = createGame(CONFIG);
    const reply = structuredClone(answerBotWorker(structuredClone(driveRequest(game))));
    if (reply.kind !== 'driven') throw new Error('the worker did not drive');
    // The person ordered something while the bots thought.
    expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    const before = digestOfState(game.state);
    expect(applyTwinReply(game, reply)).toBe('moved');
    expect(digestOfState(game.state)).toBe(before);
  });

  it('stops at the first command that comes out differently', () => {
    const game = createGame(CONFIG);
    const reply = structuredClone(answerBotWorker(structuredClone(driveRequest(game))));
    if (reply.kind !== 'driven') throw new Error('the worker did not drive');
    expect(reply.attempts.length).toBeGreaterThan(3);
    // Claim the first accepted order was refused there: the copies disagree.
    const first = reply.attempts.findIndex((attempt) => attempt.ok);
    reply.attempts[first] = { ...reply.attempts[first]!, ok: false };
    expect(applyTwinReply(game, reply)).toBe('diverged');
    expect(game.log.length).toBe(first + 1);
  });

  it('records refusals too, and the page replays them in their place', () => {
    const game = table();
    const request = driveRequest(game);
    const reply = structuredClone(answerBotWorker(structuredClone(request)));
    if (reply.kind !== 'driven') throw new Error('the worker did not drive');
    // Every accepted command in the worker's list is one the page's log gains.
    const accepted = reply.attempts.filter((attempt) => attempt.ok).length;
    expect(applyTwinReply(game, reply)).toBe('applied');
    expect(game.log.length).toBe(accepted);
  });
});

describe('the audience through the worker', () => {
  it('banks the bot’s refusal in the page’s memory, as the page’s own answer does', () => {
    const answerHere = table();
    const answerThere = table();
    for (const g of [answerHere, answerThere]) {
      playerById(g.state, 0)!.gold = 10;
      playerById(g.state, 1)!.gold = 200;
      bumpRevision(g.state);
      expect(dispatch(g, propose(0, 1, { gold: 1 }, { gold: 100 })).ok).toBe(true);
    }
    const dealId = answerHere.state.dealProposals[0]!.id;
    const here = answerAudience(answerHere, { seatId: 1, askerId: 0, dealId });
    const reply = structuredClone(
      answerBotWorker(structuredClone({ ...driveRequest(answerThere), kind: 'audience', seatId: 1, askerId: 0, dealId })),
    );
    if (reply.kind !== 'answered') throw new Error('the worker did not answer');
    expect(applyTwinReply(answerThere, reply)).toBe('applied');
    expect(reply.decision?.command).toEqual(here?.command);
    expect(dealMemorySize(answerThere.state)).toBe(1);
    expect(readHarnessMemory(answerThere.state)).toEqual(readHarnessMemory(answerHere.state));
    expect(digestOfState(answerThere.state)).toBe(digestOfState(answerHere.state));
  });

  it('brings back the war window the bot opened by reading it', () => {
    const answerHere = table();
    const answerThere = table();
    for (const g of [answerHere, answerThere]) {
      openWar(g.state, 0, 1);
      expect(dispatch(g, { type: 'proposePeace', playerId: 0, targetId: 1 }).ok).toBe(true);
    }
    answerAudience(answerHere, { seatId: 1, askerId: 0 });
    const reply = structuredClone(
      answerBotWorker(structuredClone({ ...driveRequest(answerThere), kind: 'audience', seatId: 1, askerId: 0 })),
    );
    if (reply.kind !== 'answered') throw new Error('the worker did not answer');
    expect(applyTwinReply(answerThere, reply)).toBe('applied');
    expect(atWar(answerThere.state, 0, 1)).toBe(false);
    expect(warLedgerSize(answerThere.state)).toBeGreaterThan(0);
    expect(readHarnessMemory(answerThere.state)).toEqual(readHarnessMemory(answerHere.state));
  });
});

describe('the page’s client', () => {
  it('drives through a worker and applies the result', async () => {
    const page = createGame(CONFIG);
    const worker = createGame(CONFIG);
    const twin = createBotTwin({ workerFactory: fakeWorker() });
    expect(twin.available).toBe(true);
    const reported: string[] = [];
    expect(await twin.drive(() => worker, (command) => reported.push(command.type))).toBe('applied');
    driveBots(page, { warn: () => {} });
    expect(JSON.stringify(worker.log)).toBe(JSON.stringify(page.log));
    expect(digestOfState(worker.state)).toBe(digestOfState(page.state));
    expect(reported.length).toBe(worker.log.length);
    twin.dispose();
  });

  it('answers unavailable when the worker fails, and the page is untouched', async () => {
    const game = createGame(CONFIG);
    const before = digestOfState(game.state);
    const twin = createBotTwin({ workerFactory: fakeWorker('error'), warn: () => {} });
    expect(await twin.drive(() => game)).toBe('unavailable');
    expect(digestOfState(game.state)).toBe(before);
    twin.dispose();
  });

  it('applies nothing to a game that was replaced while it waited', async () => {
    let game = createGame(CONFIG);
    const first = game;
    const twin = createBotTwin({ workerFactory: fakeWorker() });
    const waiting = twin.drive(() => game);
    game = createGame(CONFIG);
    expect(await waiting).toBe('cancelled');
    expect(first.log).toEqual([]);
    expect(game.log).toEqual([]);
    twin.dispose();
  });

  it('gives up on a worker that cannot be built, and says so once', () => {
    const warnings: string[] = [];
    let built = 0;
    const twin = createBotTwin({
      workerFactory: () => {
        built += 1;
        throw new Error('no workers here');
      },
      warn: (message) => warnings.push(message),
    });
    expect(twin.available).toBe(false);
    expect(twin.available).toBe(false);
    expect(built).toBe(1);
    expect(warnings).toHaveLength(1);
  });

  it('is not available where there is no Worker, so the page drives itself', () => {
    expect(typeof Worker).toBe('undefined');
    expect(createBotTwin().available).toBe(false);
  });

  it('answers an audience through the worker, and falls back to the page when it cannot', async () => {
    const viaWorker = table();
    const viaPage = table();
    for (const g of [viaWorker, viaPage]) {
      playerById(g.state, 0)!.gold = 200;
      bumpRevision(g.state);
      expect(dispatch(g, propose(0, 1, { gold: 100 }, {})).ok).toBe(true);
    }
    const dealId = viaWorker.state.dealProposals[0]!.id;
    const good = createBotTwin({ workerFactory: fakeWorker() });
    const broken = createBotTwin({ workerFactory: fakeWorker('error'), warn: () => {} });
    const there = await good.audience(() => viaWorker, { seatId: 1, askerId: 0, dealId });
    const fallback = await broken.audience(() => viaPage, { seatId: 1, askerId: 0, dealId });
    expect(there?.command.type).toBe('acceptDeal');
    expect(fallback?.command).toEqual(there?.command);
    expect(JSON.stringify(viaWorker.log)).toBe(JSON.stringify(viaPage.log));
    expect(digestOfState(viaWorker.state)).toBe(digestOfState(viaPage.state));
    good.dispose();
    broken.dispose();
  });
});

/** The harness memories register (`harnessMemory.ts`'s docblock). */
const AI_SOURCES = import.meta.glob('../../src/ai/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

describe('the bots’ memories beside the state', () => {
  it('are all carried to the worker, or are caches keyed on the revision', () => {
    // Carried: a bot reads them, a save does not hold them, so the worker's copy
    // must be handed them (`harnessMemory.ts`). Caches: rebuilt on any copy,
    // with the same answer, because they are keyed on `state.revision`.
    const carried = ['dealMemory.ts', 'warLedger.ts'];
    const caches = ['townFolds.ts'];
    const found: string[] = [];
    for (const [path, text] of Object.entries(AI_SOURCES)) {
      if (/new WeakMap<GameState\b/.test(text)) found.push(path.split('/').pop()!);
    }
    expect(found.sort()).toEqual([...carried, ...caches].sort());
    const register = AI_SOURCES['../../src/ai/harnessMemory.ts']!;
    for (const file of carried) expect(register).toContain(`from './${file.replace('.ts', '')}'`);
    expect(AI_SOURCES['../../src/ai/townFolds.ts']).toContain('held.revision === state.revision');
  });
});
