import { describe, expect, it } from 'vitest';
import { createWorkerAdviceReader } from '../../src/ui/workerAdvice';
import { type AdviceReply, type AdviceRequest, answerAdviceRequests } from '../../src/ui/workerAdvice.worker';
import { bumpRevision } from '../../src/sim/state';
import { game } from '../sim/statecraftHelpers';

function transport() {
  const sent: AdviceRequest[] = [];
  const fake = {
    onmessage: null as ((message: { data: AdviceReply }) => void) | null,
    postMessage(request: AdviceRequest) { sent.push(structuredClone(request)); },
    terminate() {},
  };
  const reader = createWorkerAdviceReader(() => fake as unknown as Worker);
  const answer = answerAdviceRequests();
  function finish(index: number) { fake.onmessage!({ data: answer(sent[index]!) }); }
  return { sent, reader, finish };
}

describe('worker advice in a background worker', () => {
  it('sends the map once per revision and skips intermediate selections', async () => {
    const { state } = game();
    const { sent, reader, finish } = transport();
    const first = reader.read(state, 0, -1);
    expect(reader.read(state, 0, -1)).toBe(first);
    const second = reader.read(state, 0, -2);
    const last = reader.read(state, 0, -3);
    expect(await first).toBeNull();
    expect(await second).toBeNull();
    expect(sent).toHaveLength(1);
    finish(0);
    expect(sent[1]).toMatchObject({ unitId: -3 });
    expect(sent[1]!.board).toBeUndefined();
    finish(1);
    expect(await last).toEqual([]);
    const old = reader.read(state, 0, -2);
    bumpRevision(state);
    finish(2);
    expect(await old).toBeNull();
    const fresh = reader.read(state, 0, -2);
    expect(sent[3]!.board!.state.revision).toBe(state.revision);
    reader.cancel();
    expect(await fresh).toBeNull();
    finish(3);
    reader.dispose();
    expect(await reader.read(state, 0, -2)).toBeNull();
  });

  it('returns no advice if the worker cannot start', async () => {
    const { state } = game();
    const reader = createWorkerAdviceReader(() => { throw new Error('unavailable'); });
    expect(await reader.read(state, 0, -1)).toBeNull();
    reader.dispose();
  });
});
