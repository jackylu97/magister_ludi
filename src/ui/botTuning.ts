import { type PersonaOverride, aiTuning, setAiTuning } from '../ai/aiConfig';
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
