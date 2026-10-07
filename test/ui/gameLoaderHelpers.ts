/**
 * What the loader and checkpoint suites share: the modelled simulation worker,
 * a state comparison, and the bot-game helpers. Used by `gameLoader.test.ts`,
 * `saveCheckpoints.test.ts` and its slow sibling, so it lives in a non-test
 * module: importing a `.test.ts` file re-registers its tests.
 *
 * The worker:
 * Vitest runs in node, where there is no `Worker`, so the fake does exactly what
 * the real seam does and nothing else: it calls `answerGameWorker` (the real
 * worker's body) and puts the request and the reply through `structuredClone`,
 * which is the algorithm `postMessage` uses. `queueMicrotask` keeps the reply
 * asynchronous, so a caller that depended on synchronous timing fails here.
 */

import { driveBots } from '../../src/ai/driver';
import { type Game, tryReplay } from '../../src/sim/game';
import type { GameState } from '../../src/sim/state';
import { answerGameWorker } from '../../src/ui/game.worker';
import type { GameWorkerMessage, GameWorkerRequest } from '../../src/ui/game.worker';
import { type SaveCheckpoints, memoryCheckpointStore } from '../../src/ui/saveCheckpoints';

/**
 * A state as text that sees everything a structured clone carries and JSON
 * drops: key order, a key set to `undefined` (kept apart from a missing key),
 * `NaN`, `-0`, `Infinity`, and holes in arrays. Two states are the same state
 * when their texts are equal.
 *
 * `v8.serialize` bytes were tried first and are not usable for this: V8
 * writes a whole number as a small integer or as a double depending on how it
 * happened to be stored, so two full replays of one log already differ in
 * those bytes while being the same state by every rule the game reads.
 */
export function stateText(value: unknown): string {
  if (value === undefined) return 'u';
  if (value === null) return 'n';
  switch (typeof value) {
    case 'number':
      return Object.is(value, -0) ? '-0' : Number.isNaN(value) ? 'NaN' : `#${value}`;
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 't' : 'f';
    case 'object':
      break;
    default:
      throw new Error(`a state should not hold a ${typeof value}`);
  }
  if (Array.isArray(value)) {
    const items: string[] = [];
    for (let i = 0; i < value.length; i++) items.push(i in value ? stateText(value[i]) : 'hole');
    return `[${items.join(',')}]`;
  }
  if (value instanceof Map) {
    return `Map{${[...value].map(([k, v]) => `${stateText(k)}=>${stateText(v)}`).join(',')}}`;
  }
  if (value instanceof Set) return `Set{${[...value].map(stateText).join(',')}}`;
  if (ArrayBuffer.isView(value)) {
    return `${value.constructor.name}(${Array.from(value as unknown as ArrayLike<number>).join(',')})`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .map((key) => `${JSON.stringify(key)}:${stateText(record[key])}`)
    .join(',')}}`;
}

/** Whole turns played by the bots, every seat, through the driver. */
export function playBots(game: Game, turns: number): void {
  for (let i = 0; i < turns && game.state.winnerId === null; i++) {
    driveBots(game, { warn: () => undefined });
  }
}

/** A memory checkpoint store and the build id it is checked against. */
export function checkpointsFor(buildId: string | null = 'test-build') {
  const store = memoryCheckpointStore();
  const checkpoints: SaveCheckpoints = { store, buildId: async () => buildId };
  return { store, checkpoints };
}

/** The full replay of a game's log: what every load must equal. */
export function replayedState(game: Game): GameState {
  const result = tryReplay(game.config, game.log);
  if (!result.ok) throw new Error('the reference replay refused its own log');
  return result.state;
}

export function fakeWorkerFactory(behaviour: 'answer' | 'error' | 'throw-on-construct' = 'answer') {
  return (): Worker => {
    if (behaviour === 'throw-on-construct') throw new Error('no worker here');
    const worker = {
      onmessage: null as ((event: MessageEvent<GameWorkerMessage>) => void) | null,
      onerror: null as ((event: Event & { message?: string }) => void) | null,
      onmessageerror: null as (() => void) | null,
      terminated: false,
      terminate(): void {
        this.terminated = true;
      },
      postMessage(request: GameWorkerRequest): void {
        // The request crosses the seam too: a checkpoint state sent to the
        // worker is a copy, never the main thread's object.
        const sent = structuredClone(request);
        queueMicrotask(() => {
          if (this.terminated) return;
          if (behaviour === 'error') {
            this.onerror?.({ type: 'error', message: 'worker died' } as Event & { message: string });
            return;
          }
          // Progress first, then the answer — the order the real worker sends
          // them in, and the order the loader has to survive.
          const reply = structuredClone(
            answerGameWorker(sent, (turn) =>
              this.onmessage?.({ data: { kind: 'progress', turn } } as MessageEvent<GameWorkerMessage>),
            ),
          );
          this.onmessage?.({ data: reply } as MessageEvent<GameWorkerMessage>);
        });
      },
    };
    return worker as unknown as Worker;
  };
}
