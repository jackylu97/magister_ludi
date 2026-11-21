import { workerAdvice, type WorkerAdvice } from '../ai/bot';
import type { GameState } from '../sim/state';
import { installBotTuning, type BotTuning } from './botPlanProtocol';

export interface AdviceRequest {
  id: number;
  playerId: number;
  unitId: number;
  board?: { state: GameState; tuning: BotTuning };
}

export interface AdviceReply {
  id: number;
  rows: readonly WorkerAdvice[] | null;
}

/** Reuse the seat's prices and the map when two workers are selected on the same revision. */
export function answerAdviceRequests(): (request: AdviceRequest) => AdviceReply {
  let board: AdviceRequest['board'];
  return (request) => {
    if (request.board) board = request.board;
    if (!board) return { id: request.id, rows: null };
    const restore = installBotTuning(board.tuning);
    try {
      return { id: request.id, rows: workerAdvice(board.state, request.playerId, request.unitId) };
    } finally {
      restore();
    }
  };
}

if (typeof self !== 'undefined' && typeof document === 'undefined' && typeof self.postMessage === 'function') {
  const answer = answerAdviceRequests();
  self.onmessage = ({ data }: MessageEvent<AdviceRequest>) => {
    try {
      self.postMessage(answer(data));
    } catch {
      self.postMessage({ id: data.id, rows: null } satisfies AdviceReply);
    }
  };
}
