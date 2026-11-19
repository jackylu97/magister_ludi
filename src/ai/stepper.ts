/**
 * **`driveBots`, sliced one command at a time.**
 *
 * `driver.ts` plays a whole pass of seats in one call, which is what a game
 * wants: a human presses End Turn and the rivals' turns happen. A *spectator*
 * wants the same loop stopped between any two commands — one decision, its
 * reasons, the board redrawn, and only then the next one — and that is the whole
 * of what this module adds.
 *
 * **It is the same loop, unrolled, not a second one.** The equivalence is
 * asserted rather than asserted-in-prose: `test/sim/aiDecision.slow.test.ts`
 * plays a bot-vs-bot game twice, once through `driveBots` and once a step at a
 * time through this, and compares the two states byte for byte. If a guard here
 * ever drifts from a guard there, that test says so.
 *
 * **From a frozen board** (bot batch BP16, stage C1; `frozenBoard.ts`). At the
 * first step of the turn's bot step the board is frozen. When a seat's moment
 * comes, its plan is made on its own copy of that frozen board, and then each
 * step puts one command of the plan to the real game. The driver makes every
 * plan before any command lands, and this makes each one when it is needed;
 * a plan is a function of the frozen board and the seat, so the two make the
 * same plans. A plan that is cut ends in a live sitting, a decision a step,
 * as before this stage. A planned command that the real board refuses is
 * shown as its own step, with the reducer's reason.
 *
 * The four guards of the live sitting are `driveSeat`'s own (`runSitting`), and
 * each is a piece of per-seat memory that a per-command API has to carry
 * explicitly rather than hold on a stack:
 *
 *   · the **command budget** (`ai.driver.commandsPerSeat`), counted across the
 *     seat's whole turn, the plan's landed commands included;
 *   · the **refused-command memo**, keyed by the command's own JSON, which stops
 *     the loop re-proposing something the rules said no to;
 *   · the **bounded End Turn attempts**, because `endTurn` is refused while the
 *     seat still owes the turn something and the answer is to run the policy
 *     again — a few times, and then leave the seat open with a warning;
 *   · the **sent-orders memo**, which refuses to send an accepted unit order
 *     again to a piece that has not changed since (`repeatsAnOrder`).
 *
 * Determinism is unchanged: seats are walked in `realPlayers` order, every
 * command comes out of a function of the frozen board or of the live state,
 * and every accepted one is appended to the log by `dispatch`. A game watched a
 * step at a time saves and replays exactly as a game played by the driver does.
 */

import { aiConfigFor } from './aiConfig';
import { type BotSitting, botSitting, nextBotDecision } from './bot';
import { pendingDealRefusal, rememberDealRefusal } from './dealMemory';
import type { BotDecision } from './decision';
import { botSeatsToDrive } from './driver';
import {
  type FrozenBoard,
  type PlanRun,
  type SeatGuards,
  type SittingAsk,
  applyNextStep,
  freezeBoard,
  liveSittingAfter,
  mergeSeatMemory,
  noteSentOrder,
  planSeat,
  repeatsAnOrder,
  startPlanRun,
} from './frozenBoard';
import type { Command, CommandResult } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { hasEndedTurn, playerById } from '../sim/state';

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

interface StepperOptions {
  /** Where a refusal is said out loud. Defaults to `console.warn`, as the driver's does. */
  warn?: (message: string, detail?: unknown) => void;
  /** The policy asked for each decision. Defaults to `nextBotDecision`; see `DriveOptions.decide`. */
  decide?: typeof nextBotDecision;
}

interface BotStepper {
  /**
   * Applies exactly one command and returns it, or `null` when there is no seat
   * left to drive — every real seat is a person, eliminated, or has ended its
   * turn without the world resolving (a stall the caller must see).
   */
  step(): BotStep | null;
  /** Steps until the world resolves, or until nothing is left to drive. */
  playTurn(): BotStep[];
  /** True once `step` has nothing left to do on this state. */
  stalled(): boolean;
}

/** The turn's bot step: the frozen board, and the seats in the order they are put. */
interface BotPass {
  turn: number;
  board: FrozenBoard;
  seats: number[];
  /** The next seat of `seats` to plan. */
  next: number;
}

/** A seat whose plan is being put to the real game, a command a step. */
interface PlannedSeat {
  kind: 'plan';
  playerId: number;
  run: PlanRun;
}

/** One seat's live sitting: exactly the memory `driveSeat` keeps on its stack. */
interface LiveSeat {
  kind: 'live';
  playerId: number;
  /** The loop's guards. A sitting after a cut starts with the plan's. */
  guards: SeatGuards;
  attempt: number;
  /** True while the seat is still being asked for ordinary commands. */
  asking: boolean;
  /**
   * True when the seat's plan ran to its end: it only hands over, and a
   * refused End Turn is warned about and not answered with more asks, as the
   * driver's `handOver` does.
   */
  handsOverOnly: boolean;
  finished: boolean;
  /**
   * **The seat's sitting** — its one appraisal context for this whole turn
   * (batch 6 of `docs/bot-priorities.md`), and the fourth piece of per-seat
   * memory this loop has to carry explicitly where `driveSeat` holds it on a
   * stack. The two loops open it in the same place and drop it in the same
   * place, which is what keeps the byte-for-byte equivalence pin honest.
   */
  sitting: BotSitting;
}

export function createBotStepper(game: Game, options: StepperOptions = {}): BotStepper {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  const decide = options.decide ?? nextBotDecision;
  const ask: SittingAsk = (state, playerId, sitting) => {
    const decision = decide(state, playerId, sitting);
    return decision === null ? null : { command: decision.command, decision };
  };
  let pass: BotPass | null = null;
  let seat: PlannedSeat | LiveSeat | null = null;

  /**
   * The next seat of the pass that can still play, planned on its own copy of
   * the frozen board; `null` when the pass has none left. A seat an earlier
   * seat knocked out is skipped, as `driveBots` skips it.
   */
  function nextPlannedSeat(): PlannedSeat | null {
    if (pass !== null && pass.turn !== game.state.turn) pass = null;
    if (pass === null) {
      const seats = botSeatsToDrive(game.state);
      if (seats.length === 0) return null;
      pass = { turn: game.state.turn, board: freezeBoard(game.state), seats, next: 0 };
    }
    while (pass.next < pass.seats.length) {
      const playerId = pass.seats[pass.next]!;
      pass.next += 1;
      const player = playerById(game.state, playerId);
      if (player === undefined || player.eliminated || hasEndedTurn(game.state, playerId)) continue;
      const last = pass.next === pass.seats.length;
      return { kind: 'plan', playerId, run: startPlanRun(planSeat(pass.board, playerId, { ask, warn }, last)) };
    }
    return null;
  }

  /**
   * What a live seat wants next: an ordinary decision, or the hand-over.
   *
   * The three ways `runSitting`'s loop ends — the policy is content, the
   * policy is repeating something refused, the budget is spent — all land in
   * the same place, which is the `endTurn` dispatch below the loop. Here they
   * set `asking` false and fall through to the same line, which is that
   * `break` written as a state rather than as control flow.
   */
  function pending(live: LiveSeat): BotDecision {
    // The seat's own sheet, exactly as `driveSeat` reads it — a persona may
    // override the `driver` block, and the two loops have to agree or the pin
    // that says they play the same game would fail.
    const ai = aiConfigFor(playerById(game.state, live.playerId)?.persona, live.playerId);
    const guards = live.guards;
    if (live.asking) {
      if (guards.accepted + guards.refused < ai.driver.commandsPerSeat) {
        const decision = decide(game.state, live.playerId, live.sitting);
        if (decision !== null) {
          const key = JSON.stringify(decision.command);
          if (guards.refusedCommands.has(key)) {
            // Still asking for something refused: stop asking, as `driveSeat` does.
          } else if (repeatsAnOrder(guards.sentOrders, game.state, decision.command, key)) {
            // `driveSeat`'s fourth guard: an accepted unit order is not sent
            // again to a piece that has not changed since.
            guards.repeated += 1;
            warn(
              `[ai] seat ${live.playerId}: asked again for the same ${decision.command.type} — ${key}`,
              decision.command,
            );
          } else {
            return decision;
          }
        }
      }
      live.asking = false;
    }
    return handOver(live.playerId);
  }

  /** One live decision, dispatched, with `driveSeat`'s bookkeeping. */
  function liveStep(live: LiveSeat): BotStep {
    const decision = pending(live);
    const turn = game.state.turn;
    // **The paper remembers** (X4), and it is `runSitting`'s line unrolled:
    // read while the paper is still on the table, banked once the reducer has
    // taken the answer. The memory hangs off the state both loops drive, so the
    // two play one game the way the byte-for-byte pin says they do.
    const refusal = pendingDealRefusal(game.state, decision.command);
    const result = dispatch(game, decision.command);
    if (result.ok && refusal !== null) rememberDealRefusal(game.state, refusal);
    const turnResolved = game.state.turn > turn;

    const ai = aiConfigFor(playerById(game.state, live.playerId)?.persona, live.playerId);
    const guards = live.guards;
    if (decision.kind === 'endTurn') {
      if (result.ok) {
        guards.accepted += 1;
        live.finished = true;
      } else {
        // Refused: something is still owed, and `nextBotDecision` reads the very
        // blocker that refused this. One more pass of the asking loop is the
        // answer — a bounded number of times.
        live.attempt += 1;
        if (live.handsOverOnly || live.attempt >= Math.max(1, ai.driver.endTurnAttempts)) {
          warn(`[ai] seat ${live.playerId}: could not end its turn — ${result.error}`);
          live.finished = true;
        } else {
          live.asking = true;
        }
      }
    } else if (result.ok) {
      guards.accepted += 1;
      noteSentOrder(guards.sentOrders, game.state, decision.command, JSON.stringify(decision.command));
    } else if (decision.command.type === 'chooseGreatPerson' && guards.redraws < ai.driver.greatPersonRedraws) {
      // The one refusal that is not a bug: a hand another seat has emptied is
      // refused *and redrawn*, so asking again asks about a new hand.
      guards.redraws += 1;
    } else {
      guards.refused += 1;
      guards.refusedCommands.add(JSON.stringify(decision.command));
      warn(
        `[ai] seat ${live.playerId}: the reducer refused ${decision.command.type} — ${result.error}`,
        decision.command,
      );
    }
    return { decision, playerId: live.playerId, turn, result, turnResolved };
  }

  function step(): BotStep | null {
    for (;;) {
      if (seat !== null && seat.kind === 'live' && seat.finished) seat = null;
      // **A seat that fell during its own turn** (bot batch BP4): elimination
      // marked its turn ended, so its run is over and nothing more is sent, as
      // `driveSeat` stops at the same point.
      if (seat !== null && seat.kind === 'live' && hasEndedTurn(game.state, seat.playerId)) seat = null;
      if (seat === null) {
        seat = nextPlannedSeat();
        if (seat === null) return null;
      }
      if (seat.kind === 'live') return liveStep(seat);

      const planned = seat;
      const turn = game.state.turn;
      const landed = applyNextStep(game.state, planned.run, (command) => dispatch(game, command));
      if (landed !== null) {
        return {
          decision: landed.step.decision ?? plannedDecision(landed.command),
          playerId: planned.playerId,
          turn,
          result: landed.result,
          turnResolved: game.state.turn > turn,
        };
      }
      // The plan is done, or cut before a command. Its memories join the real
      // state's, as `driveBots` merges them at the same point.
      if (pass !== null) mergeSeatMemory(game.state, pass.board, planned.run);
      seat = {
        kind: 'live',
        playerId: planned.playerId,
        guards: planned.run.guards,
        attempt: 0,
        // A plan that ran to its end asks nothing again: the seat hands over.
        asking: planned.run.cut !== null,
        handsOverOnly: planned.run.cut === null,
        finished: false,
        // The plan's sitting at its last landed command, as `driveBots` hands it on.
        sitting: planned.run.cut === null ? botSitting(planned.playerId) : liveSittingAfter(planned.run),
      };
    }
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
      const idle = seat === null || (seat.kind === 'live' && seat.finished);
      return idle && botSeatsToDrive(game.state).length === 0;
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

/**
 * A planned command whose policy gave no reasons (a test's fixed policy), as a
 * decision, so the feed has a row to print.
 */
function plannedDecision(command: Command): BotDecision {
  return {
    kind: command.type === 'endTurn' ? 'endTurn' : 'unitOrder',
    command,
    subject: 'the seat',
    summary: 'A planned command, sent with no reasons kept.',
    candidates: [],
  };
}
