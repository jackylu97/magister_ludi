import { describe, expect, it, vi } from 'vitest';

import { aiTuning } from '../../src/ai/aiConfig';
import { freezeBoard, planSeat } from '../../src/ai/frozenBoard';
import { readHarnessMemory } from '../../src/ai/harnessMemory';
import { snapshotState } from '../../src/sim/game';
import { type BotWorkerRequest, answerBotWorker, answerBotWorkerAsync } from '../../src/ui/bot.worker';
import { createBotPlanPool } from '../../src/ui/botPlanPool';
import { type BotPlanReply, type BotPlanRequest, answerBotPlan } from '../../src/ui/botPlanProtocol';
import { applyTwinReply } from '../../src/ui/botTwin';
import { rosterFor } from '../../src/ui/gameSetup';
import { createGame } from '../sim/newGameHelpers';

const CONFIG = { seed: 3, sizeName: 'duel', players: rosterFor(4), barbarians: true };

function workerHarness() {
  const requests: { request: BotPlanRequest; reply(reply: BotPlanReply): void }[] = [];
  const terminations: number[] = [];
  let started = 0;
  function workerFactory(): Worker {
    const id = ++started;
    const worker = {
      onmessage: null as ((event: MessageEvent<BotPlanReply>) => void) | null,
      onerror: null,
      onmessageerror: null,
      postMessage(request: BotPlanRequest): void {
        requests.push({
          request: structuredClone(request),
          reply(data) { worker.onmessage?.({ data: structuredClone(data) } as MessageEvent<BotPlanReply>); },
        });
      },
      terminate(): void { terminations.push(id); },
    };
    return worker as unknown as Worker;
  }
  return { workerFactory, requests, terminations, get started() { return started; } };
}

function requestFor(game: ReturnType<typeof createGame>): BotWorkerRequest {
  return { kind: 'drive', id: 1, config: game.config, state: game.state, logLength: 0, memory: readHarnessMemory(game.state) };
}

describe('browser seat planning', () => {
  it('reuses a bounded pool and delivers complete plans and warnings in seat order', async () => {
    const game = createGame(CONFIG);
    const board = freezeBoard(game.state);
    const seats = [1, 2, 3];
    const workers = workerHarness();
    const pool = createBotPlanPool({ ...workers, concurrency: 2, includeDecisions: true });
    const warn = vi.fn();
    const expected = seats.map((id) => planSeat(board, id));
    try {
      for (let turn = 0; turn < 2; turn++) {
        const run = pool.plan(warn)(board, seats);
        const requests = workers.requests.splice(0);
        expect(requests.map(({ request }) => request.seats)).toEqual([[1, 3], [2]]);
        for (const { request, reply } of requests.reverse()) {
          const output = answerBotPlan(request);
          if (output.kind !== 'planned') throw new Error(output.message);
          for (const { plan, warnings } of output.seats) warnings.push({ message: String(plan.playerId) });
          reply(output);
        }
        expect(await run).toEqual(expected);
        expect(warn.mock.calls.map(([message]) => message)).toEqual(['1', '2', '3']);
        warn.mockClear();
      }
      expect(workers.started).toBe(2);
    } finally {
      pool.dispose();
    }
    expect(workers.terminations).toEqual([1, 2]);
  });

  it('uses request tuning for both planning and replay, then restores the previous tuning', async () => {
    const page = createGame(CONFIG);
    const serial = createGame(CONFIG);
    const request = requestFor(page);
    request.tuning = { global: { driver: { commandsPerSeat: 1 } }, seats: [[2, { driver: { commandsPerSeat: 3 } }]] };
    const held = [aiTuning(), aiTuning({ playerId: 2 })];
    const workers = workerHarness();
    const pool = createBotPlanPool({ ...workers, concurrency: 2 });
    try {
      const expected = answerBotWorker(structuredClone(request));
      const run = answerBotWorkerAsync(structuredClone(request), pool);
      expect(workers.requests.length).toBe(2);
      for (const { request: planRequest, reply } of workers.requests.reverse()) {
        expect(planRequest.tuning.global).toEqual(request.tuning.global);
        expect(planRequest.tuning.seats).toContainEqual(request.tuning.seats[0]);
        const full = answerBotPlan(structuredClone({ ...planRequest, includeDecisions: true }));
        if (full.kind !== 'planned') throw new Error(full.message);
        expect(full.seats.some(({ plan }) => plan.steps.some(({ decision }) => decision !== null))).toBe(true);
        const compact = answerBotPlan(planRequest);
        for (const { plan } of full.seats) {
          for (const step of plan.steps) step.decision = null;
        }
        expect(compact).toEqual(full);
        reply(compact);
      }
      const result = await run;
      if (expected.kind !== 'driven' || result.kind !== 'driven') throw new Error('The worker did not drive');
      expect(result.attempts).toEqual(expected.attempts);
      expect(result.memory).toEqual(expected.memory);
      expect(applyTwinReply(page, result)).toBe('applied');
      expect(applyTwinReply(serial, expected)).toBe('applied');
      expect(page.log).toEqual(serial.log);
      expect(snapshotState(page.state)).toBe(snapshotState(serial.state));
      expect([aiTuning(), aiTuning({ playerId: 2 })]).toEqual(held);
    } finally {
      pool.dispose();
    }
  });

  it('discards a partially successful turn and replans it synchronously on worker failure', async () => {
    const request = requestFor(createGame(CONFIG));
    const workers = workerHarness();
    const pool = createBotPlanPool({ ...workers, concurrency: 2 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const expected = answerBotWorker(structuredClone(request));
      const run = answerBotWorkerAsync(structuredClone(request), pool);
      const [first, second] = workers.requests;
      const output = answerBotPlan(first!.request);
      if (output.kind !== 'planned') throw new Error(output.message);
      output.seats[0]!.warnings.push({ message: 'An unused plan warned' });
      first!.reply(output);
      second!.reply({ kind: 'failed', id: second!.request.id, message: 'The worker stopped' });
      const result = await run;
      if (expected.kind !== 'driven' || result.kind !== 'driven') throw new Error('The worker did not drive');
      expect(result.attempts).toEqual(expected.attempts);
      expect(result.memory).toEqual(expected.memory);
      expect(warn.mock.calls.map(([message]) => message)).not.toContain('An unused plan warned');
      expect(workers.terminations).toEqual([1, 2]);
    } finally {
      warn.mockRestore();
      pool.dispose();
    }
  });

  it('stops every seat worker if one reply times out', async () => {
    const workers = workerHarness();
    const pool = createBotPlanPool({ ...workers, concurrency: 2, timeoutMs: 10 });
    try {
      const board = freezeBoard(createGame(CONFIG).state);
      await expect(pool.plan()(board, [1, 2])).rejects.toThrow('timed out');
      expect(workers.terminations).toEqual([1, 2]);
    } finally {
      pool.dispose();
    }
  });
});
