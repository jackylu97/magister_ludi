import { type PersonaOverride, aiTuning, setAiTuning } from '../ai/aiConfig';
import { type FrozenBoard, type SeatPlan, askForCommands, planSeat } from '../ai/frozenBoard';
import { type GameState, realPlayers } from '../sim/state';

export interface BotTuning {
  global: PersonaOverride | null;
  seats: [number, PersonaOverride | null][];
}

export function readBotTuning(state: GameState): BotTuning {
  return {
    global: aiTuning(),
    seats: realPlayers(state).map(({ id }) => [id, aiTuning({ playerId: id })]),
  };
}

/** Holds the request's tuning until the worker is done applying its plans. */
export function installBotTuning(tuning: BotTuning): () => void {
  const heldGlobal = aiTuning();
  if (heldGlobal !== tuning.global) setAiTuning(tuning.global);
  const heldSeats: BotTuning['seats'] = [];
  for (const [playerId, sheet] of tuning.seats) {
    const held = aiTuning({ playerId });
    if (held === sheet) continue;
    heldSeats.push([playerId, held]);
    setAiTuning(sheet, { playerId });
  }
  return () => {
    if (heldGlobal !== tuning.global) setAiTuning(heldGlobal);
    for (const [playerId, sheet] of heldSeats) setAiTuning(sheet, { playerId });
  };
}

export interface BotPlanRequest {
  id: number;
  board: FrozenBoard;
  seats: readonly number[];
  tuning: BotTuning;
  includeDecisions?: boolean;
}

interface PlanWarning {
  message: string;
  detail?: unknown;
}

export type BotPlanReply =
  | { kind: 'planned'; id: number; seats: { plan: SeatPlan; warnings: PlanWarning[] }[] }
  | { kind: 'failed'; id: number; message: string };

/** The last seat can use the worker's own copy of the message. */
export function answerBotPlan(request: BotPlanRequest): BotPlanReply {
  const restore = installBotTuning(request.tuning);
  try {
    const ask = request.includeDecisions === false ? askForCommands() : undefined;
    const seats = request.seats.map((playerId, index) => {
      const warnings: PlanWarning[] = [];
      const plan = planSeat(request.board, playerId, {
        ask,
        warn: (message, detail) => warnings.push({ message, detail }),
      }, index === request.seats.length - 1);
      return { plan, warnings };
    });
    return { kind: 'planned', id: request.id, seats };
  } catch (error) {
    return { kind: 'failed', id: request.id, message: error instanceof Error ? error.message : String(error) };
  } finally {
    restore();
  }
}
