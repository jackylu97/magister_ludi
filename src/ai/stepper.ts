/**
 * **`driveBots`, sliced one decision at a time.**
 *
 * `driver.ts` plays a whole pass of seats in one call, which is what a game
 * wants: a human presses End Turn and the rivals' turns happen. A *spectator*
 * wants the same loop stopped between any two commands — one decision, its
 * reasons, the board redrawn, and only then the next one — and that is the whole
 * of what this module adds.
 *
 * **It is the same loop, unrolled, not a second one.** The equivalence is
 * asserted rather than asserted-in-prose: `test/sim/aiBot.slow.test.ts` plays a
 * bot-vs-bot game twice, once through `driveBots` and once a step at a time
 * through this, and compares the two states byte for byte. If a guard here ever
 * drifts from a guard there, that test says so.
 *
 * The three guards being unrolled are `driveSeat`'s own, and each is a piece of
 * per-seat memory that a per-command API has to carry explicitly rather than
 * hold on a stack:
 *
 *   · the **command budget** (`ai.driver.commandsPerSeat`), counted across the
 *     seat's whole turn;
 *   · the **refused-command memo**, keyed by the command's own JSON, which stops
 *     the loop re-proposing something the rules said no to;
 *   · the **bounded End Turn attempts**, because `endTurn` is refused while the
 *     seat still owes the turn something and the answer is to run the policy
 *     again — a few times, and then leave the seat open with a warning.
 *
 * Determinism is unchanged: seats are walked in `realPlayers` order, every
 * command comes out of a pure function of the state, and every accepted one is
 * appended to the log by `dispatch`. A game watched a step at a time saves and
 * replays exactly as a game played by the driver does.
 */

import { aiConfigFor } from './aiConfig';
import { nextBotDecision } from './bot';
import type { BotDecision } from './decision';
import type { CommandResult } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { hasEndedTurn, playerById, realPlayers } from '../sim/state';

/**
 * **The roster of personas, re-exported for the page that seats them.**
 *
 * The spectate page may not import the tuning surface — a page that read a
 * weight could print a number the seat never used, and its whole value is that
 * it cannot (`test/ui/spectatePage.test.ts`). A persona *name* is not a weight:
 * it is a roster entry, the same kind of thing a seat's colour is, and a
 * dropdown that could not list them would have to hard-code four strings that
 * drift from the data file the day a fifth is added.
 *
 * So the names come through the module the page already speaks to, and the
 * numbers behind them stay where they are.
 */
export { DEFAULT_PERSONA, PERSONA_IDS, personaLabel } from './aiConfig';

/** One decision, dispatched. What the spectate feed prints a row from. */
export interface BotStep {
  decision: BotDecision;
  playerId: number;
  /** The turn the decision was made on — before this dispatch could advance it. */
  turn: number;
  result: CommandResult;
  /** True when this dispatch was the last `endTurn` and the world resolved. */
  turnResolved: boolean;
}

export interface StepperOptions {
  /** Where a refusal is said out loud. Defaults to `console.warn`, as the driver's does. */
  warn?: (message: string, detail?: unknown) => void;
}

export interface BotStepper {
  /**
   * Applies exactly one decision and returns it, or `null` when there is no seat
   * left to drive — every real seat is a person, eliminated, or has ended its
   * turn without the world resolving (a stall the caller must see).
   */
  step(): BotStep | null;
  /** Steps until the world resolves, or until nothing is left to drive. */
  playTurn(): BotStep[];
  /** True once `step` has nothing left to do on this state. */
  stalled(): boolean;
}

/** One seat's unfinished turn: exactly the memory `driveSeat` keeps on its stack. */
interface SeatRun {
  playerId: number;
  accepted: number;
  refused: number;
  attempt: number;
  redraws: number;
  /** Keyed by the command's own JSON — "the identical command", membership only. */
  refusedCommands: Set<string>;
  /** True while the seat is still being asked for ordinary commands. */
  asking: boolean;
  finished: boolean;
}

export function createBotStepper(game: Game, options: StepperOptions = {}): BotStepper {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  let run: SeatRun | null = null;

  /** The next seat that is not a person, not out, and has not handed the turn over. */
  function nextSeat(): number | null {
    for (const player of realPlayers(game.state)) {
      if (player.isHuman) continue;
      if (player.eliminated) continue;
      if (hasEndedTurn(game.state, player.id)) continue;
      return player.id;
    }
    return null;
  }

  /**
   * What this seat wants next: an ordinary decision, or the hand-over.
   *
   * The three ways `driveSeat`'s inner `while` ends — the policy is content, the
   * policy is repeating something refused, the budget is spent — all land in the
   * same place, which is the `endTurn` dispatch below the loop. Here they set
   * `asking` false and fall through to the same line, which is that `break`
   * written as a state rather than as control flow.
   */
  function pending(seat: SeatRun): BotDecision {
    // The seat's own sheet, exactly as `driveSeat` reads it — a persona may
    // override the `driver` block, and the two loops have to agree or the pin
    // that says they play the same game would fail.
    const ai = aiConfigFor(playerById(game.state, seat.playerId)?.persona);
    if (seat.asking) {
      if (seat.accepted + seat.refused < ai.driver.commandsPerSeat) {
        const decision = nextBotDecision(game.state, seat.playerId);
        if (decision !== null) {
          if (!seat.refusedCommands.has(JSON.stringify(decision.command))) return decision;
        }
      }
      seat.asking = false;
    }
    return handOver(seat.playerId);
  }

  function step(): BotStep | null {
    if (run !== null && run.finished) run = null;
    if (run === null) {
      const playerId = nextSeat();
      if (playerId === null) return null;
      run = {
        playerId,
        accepted: 0,
        refused: 0,
        attempt: 0,
        redraws: 0,
        refusedCommands: new Set<string>(),
        asking: true,
        finished: false,
      };
    }
    const seat = run;
    const decision = pending(seat);
    const turn = game.state.turn;
    const result = dispatch(game, decision.command);
    const turnResolved = game.state.turn > turn;

    const ai = aiConfigFor(playerById(game.state, seat.playerId)?.persona);
    if (decision.kind === 'endTurn') {
      if (result.ok) {
        seat.accepted += 1;
        seat.finished = true;
      } else {
        // Refused: something is still owed, and `nextBotDecision` reads the very
        // blocker that refused this. One more pass of the asking loop is the
        // answer — a bounded number of times.
        seat.attempt += 1;
        if (seat.attempt >= Math.max(1, ai.driver.endTurnAttempts)) {
          warn(`[ai] seat ${seat.playerId}: could not end its turn — ${result.error}`);
          seat.finished = true;
        } else {
          seat.asking = true;
        }
      }
    } else if (result.ok) {
      seat.accepted += 1;
    } else if (decision.command.type === 'chooseGreatPerson' && seat.redraws < ai.driver.greatPersonRedraws) {
      // The one refusal that is not a bug: a hand another seat has emptied is
      // refused *and redrawn*, so asking again asks about a new hand.
      seat.redraws += 1;
    } else {
      seat.refused += 1;
      seat.refusedCommands.add(JSON.stringify(decision.command));
      warn(
        `[ai] seat ${seat.playerId}: the reducer refused ${decision.command.type} — ${result.error}`,
        decision.command,
      );
    }

    return { decision, playerId: seat.playerId, turn, result, turnResolved };
  }

  return {
    step,
    playTurn(): BotStep[] {
      const steps: BotStep[] = [];
      for (;;) {
        const taken = step();
        if (taken === null) return steps;
        steps.push(taken);
        if (taken.turnResolved) return steps;
      }
    },
    stalled(): boolean {
      return (run === null || run.finished) && nextSeat() === null;
    },
  };
}

/**
 * The hand-over, as a decision.
 *
 * It carries no candidates because nothing is weighed: `driver.ts` sends
 * `endTurn` when the policy is content, and *that* is the decision — the
 * candidates were all the decisions before it. Giving it the same shape as every
 * other step is what lets the feed print one row per command with no special
 * case, which is the same bargain `RealisedItem` makes one system over.
 */
function handOver(playerId: number): BotDecision {
  return {
    kind: 'endTurn',
    command: { type: 'endTurn', playerId },
    subject: 'the seat',
    summary: 'Nothing further it wants: hands the turn over.',
    candidates: [],
  };
}

/** A decision's seat, named — the feed's swatch and label read this. */
export function seatName(game: Game, playerId: number): string {
  return playerById(game.state, playerId)?.name ?? `Seat ${playerId + 1}`;
}
