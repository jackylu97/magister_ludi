/** The spectator pauses between real dispatches so it can show each decision with its original scores. */
import type { nextBotDecision } from './bot';
import { botSeatsToDrive, runBotTurn, type BotStep } from './driver';
import type { SittingAsk, Warn } from './frozenBoard';
import type { Game } from '../sim/game';

export { DEFAULT_PERSONA, PERSONA_IDS, personaLabel } from './aiConfig';
export type { BotStep } from './driver';

interface StepperOptions {
  warn?: Warn;
  decide?: typeof nextBotDecision;
}

interface BotStepper {
  step(): BotStep | null;
  playTurn(): BotStep[];
  stalled(): boolean;
}

export function createBotStepper(game: Game, options: StepperOptions = {}): BotStepper {
  const decide = options.decide;
  const ask: SittingAsk | undefined = decide && ((state, playerId, sitting) => {
    const decision = decide(state, playerId, sitting);
    return decision === null ? null : { command: decision.command, decision };
  });
  let steps: ReturnType<typeof runBotTurn> | undefined;
  let turn: number | undefined;

  function step(): BotStep | null {
    if (steps === undefined || turn !== game.state.turn) {
      if (botSeatsToDrive(game.state).length === 0) return null;
      turn = game.state.turn;
      steps = runBotTurn(game, { ask, warn: options.warn, planOnDemand: true });
    }
    const next = steps.next();
    return next.done ? null : next.value;
  }

  return {
    step,
    playTurn(): BotStep[] {
      const taken: BotStep[] = [];
      for (;;) {
        const next = step();
        if (next === null) return taken;
        taken.push(next);
        if (next.turnResolved) return taken;
      }
    },
    stalled: () => botSeatsToDrive(game.state).length === 0,
  };
}
