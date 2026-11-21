import type { WorkerAdvice } from '../ai/bot';
export type { WorkerAdvice } from '../ai/bot';
import type { GameState } from '../sim/state';
import { readBotTuning } from './botTuning';
import type { AdviceReply, AdviceRequest } from './workerAdvice.worker';

type Answer = readonly WorkerAdvice[] | null;

interface Request {
  state: GameState;
  revision: number;
  playerId: number;
  unitId: number;
  answer: Promise<Answer>;
  resolve: (rows: Answer) => void;
  id: number;
}

/** Make one reader per game view. A null answer means the selection changed or the worker was unavailable. */
export function createWorkerAdviceReader(
  open: () => Worker = () => new Worker(new URL('./workerAdvice.worker.ts', import.meta.url), { type: 'module' }),
) {
  let worker: Worker | undefined;
  let sent: { state: GameState; revision: number } | undefined;
  let active: Request | undefined;
  let latest: Request | undefined;
  let nextId = 0;
  let disposed = false;

  function clear(): void {
    latest?.resolve(null);
    active?.resolve(null);
    latest = undefined;
    active = undefined;
    sent = undefined;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      worker = undefined;
    }
  }

  function send(request: Request): void {
    if (request.state.revision !== request.revision) {
      request.resolve(null);
      return;
    }
    try {
      if (!worker) {
        worker = open();
        worker.onerror = clear;
        worker.onmessage = ({ data }: MessageEvent<AdviceReply>) => {
          if (!active || data.id !== active.id) return;
          const completed = active;
          active = undefined;
          if (data.rows === null) sent = undefined;
          completed.resolve(completed === latest && completed.revision === completed.state.revision ? data.rows : null);
          if (latest && latest !== completed) send(latest);
        };
      }
      active = request;
      const message: AdviceRequest = { id: request.id, playerId: request.playerId, unitId: request.unitId };
      if (sent?.state !== request.state || sent.revision !== request.revision) {
        message.board = { state: request.state, tuning: readBotTuning(request.state) };
      }
      worker.postMessage(message);
      sent = { state: request.state, revision: request.revision };
    } catch {
      clear();
    }
  }

  return {
    read(state: GameState, playerId: number, unitId: number): Promise<Answer> {
      if (disposed) return Promise.resolve(null);
      if (latest && latest.state === state && latest.revision === state.revision &&
          latest.playerId === playerId && latest.unitId === unitId) return latest.answer;
      latest?.resolve(null);
      let finish!: (rows: Answer) => void;
      const answer = new Promise<Answer>(resolve => { finish = resolve; });
      latest = { state, revision: state.revision, playerId, unitId, answer, resolve: finish, id: ++nextId };
      if (!active) send(latest);
      return answer;
    },
    /** Clear the selected worker's pending reply as soon as the player deselects it. */
    cancel(): void {
      latest?.resolve(null);
      latest = undefined;
    },
    dispose(): void {
      disposed = true;
      clear();
    },
  };
}
