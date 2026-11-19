import { describe, expect, it } from 'vitest';

import { aiTuning, setAiTuning } from '../../src/ai/aiConfig';
import { answerAudience, driveBots } from '../../src/ai/driver';
import { readHarnessMemory } from '../../src/ai/harnessMemory';
import { markMusterTurn } from '../../src/ai/musterRoll';
import type { Command } from '../../src/sim/commands';
import { type Game, dispatch, snapshotState } from '../../src/sim/game';
import { LIVE_GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { type BotWorkerReply, type BotWorkerRequest, answerBotWorker } from '../../src/ui/bot.worker';
import { createBotTwin } from '../../src/ui/botTwin';
import { createGame } from '../sim/newGameHelpers';

const quiet = { warn: () => {} };

function game(): Game {
  return createGame({
    seed: 77,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a' },
      { name: 'Cato', color: '#a80' },
    ],
  });
}

/** Delivers replies in test order, including a reply queued before termination. */
function transport() {
  const posted: { request: BotWorkerRequest; finish: () => void }[] = [];
  const workers = { started: 0, ended: 0 };
  function workerFactory(): Worker {
    workers.started += 1;
    const worker = {
      onmessage: null as ((event: MessageEvent<BotWorkerReply>) => void) | null,
      postMessage(request: BotWorkerRequest) {
        const copy = structuredClone(request);
        const receive = worker.onmessage!;
        posted.push({
          request: copy,
          finish: () => receive({ data: structuredClone(answerBotWorker(copy)) } as MessageEvent<BotWorkerReply>),
        });
      },
      terminate() { workers.ended += 1; },
    };
    return worker as unknown as Worker;
  }
  const twin = createBotTwin({ workerFactory, ...quiet });
  return { twin, posted, workers };
}

function sleepOrder(g: Game): Extract<Command, { type: 'sleepUnit' }> {
  const settler = g.state.units.find((unit) => unit.ownerId === 0 && unit.type === 'settler')!;
  return { type: 'sleepUnit', playerId: 0, unitId: settler.id };
}

function expectSameGame(actual: Game, expected: Game): void {
  expect(actual.log).toEqual(expected.log);
  expect(snapshotState(actual.state)).toBe(snapshotState(expected.state));
  expect(readHarnessMemory(actual.state)).toEqual(readHarnessMemory(expected.state));
}

describe('background bot drives', () => {
  it.each([true, false])('reuses one drive across an ordinary refusal, ready before End Turn: %s', async (ready) => {
    const { twin, posted } = transport();
    const actual = game();
    const expected = game();
    const orders: Command[] = [];
    twin.prepare(actual);
    twin.prepare(actual);
    expect(posted).toHaveLength(1);
    expect(dispatch(actual, { type: 'sleepUnit', playerId: 0, unitId: -1 }).ok).toBe(false);
    if (ready) {
      posted[0]!.finish();
      await Promise.resolve();
      expectSameGame(actual, expected);
    }
    const played = twin.drive(() => actual, (command) => orders.push(command));
    expect(posted).toHaveLength(1);
    expectSameGame(actual, expected);
    expect(orders).toEqual([]);
    if (!ready) posted[0]!.finish();
    expect(await played).toBe('applied');

    driveBots(expected, quiet);
    expectSameGame(actual, expected);
    expect(orders).toEqual(expected.log);
    twin.dispose();
  });

  it('keeps one worker and coalesces changes into the latest background request', async () => {
    const { twin, posted, workers } = transport();
    const actual = game();
    const expected = game();
    const sleep = sleepOrder(actual);
    const wake = { type: 'cancelOrder', playerId: 0, unitId: sleep.unitId } as const;
    twin.prepare(actual);

    for (const command of [sleep, wake]) {
      expect(dispatch(actual, command).ok).toBe(true);
      expect(dispatch(expected, command).ok).toBe(true);
      twin.invalidate();
      twin.prepare(actual);
    }
    expect(posted).toHaveLength(1);
    expect(workers.started).toBe(1);

    posted[0]!.finish();
    await Promise.resolve();
    expect(posted).toHaveLength(2);
    expect(posted[1]!.request.logLength).toBe(2);
    expect(workers.started).toBe(1);
    expectSameGame(actual, expected);

    const played = twin.drive(() => actual);
    expect(posted).toHaveLength(2);
    posted[1]!.finish();
    expect(await played).toBe('applied');
    driveBots(expected, quiet);
    expectSameGame(actual, expected);
    twin.dispose();
  });

  it('gives End Turn priority over a stale drive that is still running', async () => {
    const { twin, posted, workers } = transport();
    const actual = game();
    const expected = game();
    twin.prepare(actual);
    expect(dispatch(actual, sleepOrder(actual)).ok).toBe(true);
    expect(dispatch(expected, sleepOrder(expected)).ok).toBe(true);
    twin.invalidate();

    const played = twin.drive(() => actual);
    expect(workers).toEqual({ started: 2, ended: 1 });
    expect(posted).toHaveLength(2);
    expect(posted[1]!.request.logLength).toBe(1);
    posted[0]!.finish();
    await Promise.resolve();
    expectSameGame(actual, expected);
    posted[1]!.finish();
    expect(await played).toBe('applied');
    driveBots(expected, quiet);
    expectSameGame(actual, expected);
    twin.dispose();
  });

  it.each([true, false])('rejects a reply after a refused great-person pick, roster exhausted: %s', async (exhausted) => {
    const { twin, posted } = transport();
    const actual = game();
    const id = LIVE_GREAT_PERSON_IDS[0]!;
    actual.state.players[0]!.greatPersonOffer = { options: [id] };
    actual.state.recruited = exhausted ? [...LIVE_GREAT_PERSON_IDS] : [id];
    const before = actual.state.revision;
    const random = actual.state.rng.state;

    twin.prepare(actual);
    const played = twin.drive(() => actual);
    expect(posted).toHaveLength(1);
    expect(dispatch(actual, { type: 'chooseGreatPerson', playerId: 0, optionIndex: 0 }).ok).toBe(false);
    expect(actual.state.players[0]!.greatPersonOffer?.options).not.toEqual([id]);
    expect(actual.log).toEqual([]);
    expect(actual.state.revision).toBe(before);
    if (exhausted) expect(actual.state.rng.state).toBe(random);
    const afterRedraw = snapshotState(actual.state);

    posted[0]!.finish();
    expect(await played).toBe('moved');
    expect(snapshotState(actual.state)).toBe(afterRedraw);
    expect(actual.log).toEqual([]);
    twin.dispose();
  });

  it('rejects a reply when a harness memory changes without a command', async () => {
    const { twin, posted } = transport();
    const actual = game();
    const played = twin.drive(() => actual);
    markMusterTurn(actual.state);
    const memory = readHarnessMemory(actual.state);
    posted[0]!.finish();
    expect(await played).toBe('moved');
    expect(actual.log).toEqual([]);
    expect(readHarnessMemory(actual.state)).toEqual(memory);
    twin.dispose();
  });

  it('rejects a reply when the tuning for a seat changes', async () => {
    const { twin, posted } = transport();
    const actual = game();
    const held = aiTuning({ playerId: 1 });
    try {
      const played = twin.drive(() => actual);
      setAiTuning({ weights: { city: 1234 } }, { playerId: 1 });
      posted[0]!.finish();
      expect(await played).toBe('moved');
      expect(actual.log).toEqual([]);
    } finally {
      setAiTuning(held, { playerId: 1 });
      twin.dispose();
    }
  });

  it('drops a late claimed reply when the game is suspended and works after a load', async () => {
    const { twin, posted } = transport();
    const old = game();
    let actual = old;
    twin.prepare(old);
    const cancelled = twin.drive(() => actual);
    posted[0]!.finish();
    twin.cancel();
    // Landing still holds the same game until the new map has loaded.
    expect(await cancelled).toBe('cancelled');
    expectSameGame(old, game());

    actual = game();
    twin.prepare(actual);
    const played = twin.drive(() => actual);
    posted[1]!.finish();
    expect(await played).toBe('applied');
    const expected = game();
    driveBots(expected, quiet);
    expectSameGame(actual, expected);
    twin.dispose();
  });

  it('answers diplomacy ahead of a stale drive and ignores the old drive reply', async () => {
    const { twin, posted, workers } = transport();
    const actual = game();
    const expected = game();
    twin.prepare(actual);
    for (const g of [actual, expected]) {
      g.state.players[0]!.gold = 10;
      g.state.players[1]!.gold = 200;
      expect(dispatch(g, { type: 'proposeDeal', playerId: 0, targetId: 1, give: { gold: 1 }, take: { gold: 100 } }).ok).toBe(true);
    }
    const options = { seatId: 1, askerId: 0, dealId: actual.state.dealProposals[0]!.id, ...quiet };
    const reply = twin.audience(() => actual, options);
    expect(workers).toEqual({ started: 2, ended: 1 });
    expect(posted[1]!.request.kind).toBe('audience');
    posted[0]!.finish();
    await Promise.resolve();
    expectSameGame(actual, expected);

    posted[1]!.finish();
    const decision = answerAudience(expected, options);
    expect(decision?.command.type).toBe('declineDeal');
    expect((await reply)?.command).toEqual(decision?.command);
    expectSameGame(actual, expected);
    twin.dispose();
  });

  it('ignores an audience reply after suspension, even while the same game is still held', async () => {
    const { twin, posted } = transport();
    const actual = game();
    actual.state.players[0]!.gold = 10;
    actual.state.players[1]!.gold = 200;
    expect(dispatch(actual, { type: 'proposeDeal', playerId: 0, targetId: 1, give: { gold: 1 }, take: { gold: 100 } }).ok).toBe(true);
    const old = snapshotState(actual.state);
    const reply = twin.audience(() => actual, { seatId: 1, askerId: 0, dealId: actual.state.dealProposals[0]!.id });
    twin.cancel();
    posted[0]!.finish();
    expect(await reply).toBeUndefined();
    expect(snapshotState(actual.state)).toBe(old);
    expect(actual.log).toHaveLength(1);
    expect(readHarnessMemory(actual.state).deals).toEqual([]);
    twin.dispose();
  });
});
