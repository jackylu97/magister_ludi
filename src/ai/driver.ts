/**
 * The game, arena and spectator apply bot commands through the same turn runner.
 * It can pause after any real dispatch. Planning on private copies keeps one
 * seat's actions out of another seat's plan.
 *
 * The worker records every attempt so the page can replay refusals as well as
 * accepted commands. An immediate reply to a human diplomatic offer runs
 * separately because it must answer only that offer and leave the turn open.
 */

import { aiConfigFor } from './aiConfig';
import { type BotSitting, botSitting, nextBotCommand, valueContext } from './bot';
import { pendingDealRefusal, rememberDealRefusal } from './dealMemory';
import type { BotDecision } from './decision';
import { answerPeaceOffer, answerProposal } from './diplomacy';
import {
  type CutReason,
  type SeatPlan,
  type SeatGuards,
  type SittingAsk,
  applyNextStep,
  askTheBot,
  freezeBoard,
  freshGuards,
  liveSittingAfter,
  mergeSeatMemory,
  planSeat,
  runSitting,
  startPlanRun,
} from './frozenBoard';
import type { Command, CommandResult } from '../sim/commands';
import { proposalById } from '../sim/deals';
import { type Game, dispatch } from '../sim/game';
import { type GameState, hasEndedTurn, playerById, realPlayers } from '../sim/state';
import { hasPeaceOffer } from '../sim/wars';

/**
 * The guards of one seat's loop live in `frozenBoard.ts` since stage C1, where
 * the plan and the live sitting share them. Re-exported by name for the files
 * that import them from here.
 */
export { type SentOrders, noteSentOrder, repeatsAnOrder, sentToAPiece } from './frozenBoard';

/**
 * What a bot's accepted command is reported to, and it is one function on
 * purpose.
 *
 * `controls.reportCommand` fits this signature exactly, which is the point: the
 * driver has no idea an interface exists, and a headless test drives the same
 * loop by passing nothing at all.
 */
export type BotReporter = (command: Command, result: CommandResult) => void;

interface DriveOptions {
  /**
   * Called after **every** command the driver puts to the real game, accepted
   * or refused, in order. The commands a plan sends to its own copy are not
   * reported here. The bot worker records these so the page can put the
   * same commands to its own copy of the game (`replayBotAttempts`). Refusals
   * are included because one refusal changes the state: a great-person pick
   * whose name was taken redraws the hand (`applyChooseGreatPerson`), and the
   * log, which holds accepted commands only, does not record it.
   */
  attempt?: (command: Command, result: CommandResult) => void;
  /** Called after every accepted bot command. `controls.reportCommand`. */
  report?: BotReporter;
  /** Where a refusal is said out loud. Defaults to `console.warn`. */
  warn?: (message: string, detail?: unknown) => void;
  /**
   * The policy asked for each command. Defaults to the bot (`nextBotDecision`,
   * whose command is `nextBotCommand`'s). It is an option so a test can drive
   * the loop with a fixed policy: the test suite shares one module graph per
   * worker (`isolate: false` in vite.config.ts), so replacing the bot module
   * with `vi.mock` does not work there. A plan asks it on the seat's copy of
   * the frozen board, so a policy must read the state it is handed.
   */
  decide?: typeof nextBotCommand;
}

/**
 * The paper an audience is about: who was asked, who asked, and which paper.
 *
 * `DriveOptions` with the question added rather than a shape of its own, so an
 * audience reports its command exactly the way a sitting does — the tutorial,
 * the notice log and everything else on `onCommand` hears a bot's answer at the
 * table in the same words it hears one at the sitting.
 */
export interface AudienceOptions extends DriveOptions {
  /** The seat the paper was put to. Answered only when it is not a person. */
  seatId: number;
  /** The seat that put it. */
  askerId: number;
  /**
   * The standing bargain to answer, by id. **Absent means the peace paper** on
   * the war between the two, which is the one paper that has no id of its own:
   * it rides on the war row rather than in the proposals register (`wars.ts`).
   */
  dealId?: number;
}

/** What one seat's turn cost, for tests and for a future profiler. */
interface SeatDriveReport {
  playerId: number;
  /** Commands accepted, the seat's own `endTurn` included. */
  accepted: number;
  /**
   * Commands the reducer refused that the policy proposed, on the seat's copy
   * or on the live board. Any number above zero is a bug. A planned command
   * the real board refused because an earlier seat moved first is not counted
   * here: that is a conflict, and it is `cut`.
   */
  refused: number;
  /**
   * Unit orders the bot asked for again, identical, while the piece was still
   * exactly as the accepted copy left it (`repeatsAnOrder`). The driver does not
   * send them. Any number above zero is a bug in an arm of the policy.
   */
  repeated: number;
  /** True when the seat ended its turn. False is a stall the caller must see. */
  ended: boolean;
  /** The commands in the seat's plan (`frozenBoard.ts`). Nought for `driveSeat` alone. */
  planned: number;
  /** How many of them landed on the real board. */
  landed: number;
  /** Why the plan stopped before its end, or `null`. A cut seat finished with a live sitting. */
  cut: CutReason | null;
}

/** One real dispatch. The spectator uses the turn before dispatch to label the final End Turn. */
export interface BotStep {
  decision: BotDecision;
  playerId: number;
  turn: number;
  result: CommandResult;
  turnResolved: boolean;
}

interface TurnOptions {
  ask?: SittingAsk;
  planOnDemand?: boolean;
  warn?: DriveOptions['warn'];
  attempt?: DriveOptions['attempt'];
  report?: BotReporter;
}

type SeatSteps = Generator<BotStep, SeatDriveReport>;
type TurnSteps = Generator<BotStep, SeatDriveReport[]>;

/** The game needs the reports after the whole pass. The spectator reads the same iterator one step at a time. */
function finish<T>(steps: Generator<BotStep, T>): T {
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

export function driveBots(game: Game, options: DriveOptions = {}): SeatDriveReport[] {
  return finish(runBotTurn(game, { ...options, ask: askOf(options) }));
}

function askOf(options: DriveOptions): SittingAsk {
  const decide = options.decide;
  if (decide === undefined) return askTheBot;
  return (state, playerId, sitting) => {
    const command = decide(state, playerId, sitting);
    return command === null ? null : { command, decision: null };
  };
}

/** Freeze once per pass. A seat can plan just before its first step because it still sees the frozen board. */
export function* runBotTurn(game: Game, options: TurnOptions = {}): TurnSteps {
  const seats = botSeatsToDrive(game.state);
  const reports: SeatDriveReport[] = [];
  if (seats.length === 0) return reports;
  const board = freezeBoard(game.state);

  const planFor = (playerId: number, index: number): SeatPlan =>
    planSeat(board, playerId, options, index === seats.length - 1);
  // The game prepares every plan before dispatch. A paused spectator only needs the next seat.
  const prepared = options.planOnDemand ? undefined : seats.map(planFor);
  for (const [index, playerId] of seats.entries()) {
    // An earlier seat can eliminate a rival before its first command.
    const player = playerById(game.state, playerId);
    if (player === undefined || player.eliminated || hasEndedTurn(game.state, playerId)) continue;
    const plan = prepared?.[index] ?? planFor(playerId, index);
    const run = startPlanRun(plan);
    const put = (command: Command): CommandResult => {
      const result = dispatchAttempt(game, command, options);
      if (result.ok) options.report?.(command, result);
      return result;
    };
    for (;;) {
      const turn = game.state.turn;
      const landed = applyNextStep(game.state, run, put);
      if (landed === null) break;
      yield stepFor(game, playerId, turn, landed.command, landed.step.decision, landed.result);
    }
    mergeSeatMemory(game.state, board, run);
    const landed = run.guards.accepted;
    const sitting = run.cut === null ? null : liveSittingAfter(run);
    const report = yield* finishSeat(game, playerId, sitting, run.guards, options);
    reports.push({
      ...report,
      refused: report.refused + plan.refused,
      repeated: report.repeated + plan.repeated,
      planned: plan.steps.length,
      landed,
      cut: run.cut,
    });
  }
  return reports;
}

/** The worker replays even a refused attempt because a refused great-person pick can redraw the hand. */
function dispatchAttempt(game: Game, command: Command, options: TurnOptions): CommandResult {
  const result = dispatch(game, command);
  options.attempt?.(command, result);
  return result;
}

function stepFor(
  game: Game,
  playerId: number,
  turn: number,
  command: Command,
  decision: BotDecision | null,
  result: CommandResult,
): BotStep {
  if (decision === null) {
    const endTurn = command.type === 'endTurn';
    decision = {
      kind: endTurn ? 'endTurn' : 'unitOrder',
      command,
      subject: 'the seat',
      summary: endTurn ? 'Nothing further it wants: hands the turn over.' : 'A planned command, sent with no reasons kept.',
      candidates: [],
    };
  } else if (decision.command !== command) {
    // The explanation came from the planning copy. Show the id used by the real command.
    decision = { ...decision, command };
  }
  return { decision, playerId, turn, result, turnResolved: game.state.turn > turn };
}

/** A complete plan only needs an End Turn. A cut plan resumes its decisions with the budget it has left. */
function* finishSeat(
  game: Game,
  playerId: number,
  sitting: BotSitting | null,
  guards: SeatGuards,
  options: TurnOptions,
): SeatSteps {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  const ai = aiConfigFor(playerById(game.state, playerId)?.persona, playerId);
  const attempts = sitting === null ? 1 : Math.max(1, ai.driver.endTurnAttempts);
  let ended = false;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (sitting !== null && !hasEndedTurn(game.state, playerId)) {
      const steps = runSitting(
        game.state, playerId, sitting, guards, options.ask ?? askTheBot,
        ({ command }) => dispatchAttempt(game, command, options),
        warn,
      );
      for (const { command, decision, turn, result } of steps) {
        if (result.ok) options.report?.(command, result);
        yield stepFor(game, playerId, turn, command, decision, result);
        if (hasEndedTurn(game.state, playerId)) break;
      }
    }
    if (hasEndedTurn(game.state, playerId)) {
      ended = true;
      break;
    }
    const command: Command = { type: 'endTurn', playerId };
    const turn = game.state.turn;
    const result = dispatchAttempt(game, command, options);
    ended = result.ok;
    if (result.ok) {
      guards.accepted += 1;
      options.report?.(command, result);
    } else if (attempt === attempts) {
      warn(`[ai] seat ${playerId}: could not end its turn — ${result.error}`);
    }
    yield stepFor(game, playerId, turn, command, null, result);
    if (ended) break;
  }
  return {
    playerId,
    accepted: guards.accepted,
    refused: guards.refused,
    repeated: guards.repeated,
    ended,
    planned: 0,
    landed: 0,
    cut: null,
  };
}

/**
 * The seats `driveBots` would play now, in the order it would play them. The
 * page asks this before it sends the bots to the worker: with none to play
 * there is nothing to wait for.
 */
export function botSeatsToDrive(state: GameState): number[] {
  const seats: number[] = [];
  for (const player of realPlayers(state)) {
    if (player.isHuman) continue;
    if (player.eliminated) continue;
    if (hasEndedTurn(state, player.id)) continue;
    seats.push(player.id);
  }
  return seats;
}

/** One command a bot driver put to the reducer, and whether it was accepted. */
export interface BotAttempt {
  command: Command;
  ok: boolean;
}

/**
 * Puts to this game, in order, the commands a bot driver put to another copy of
 * it (`DriveOptions.attempt`), with the same bookkeeping the driver does at its
 * own dispatch: the refusal memory is read before and banked after, and every
 * accepted command is reported.
 *
 * Returns false, and stops, at the first command whose outcome differs from
 * the recorded one. That means the two copies were not the same game, and the
 * caller must not trust the rest of the list.
 */
export function replayBotAttempts(
  game: Game,
  attempts: readonly BotAttempt[],
  options: Pick<DriveOptions, 'report'> = {},
): boolean {
  for (const { command, ok } of attempts) {
    const refusal = pendingDealRefusal(game.state, command);
    const result = dispatch(game, command);
    if (result.ok !== ok) return false;
    if (!result.ok) continue;
    if (refusal !== null) rememberDealRefusal(game.state, refusal);
    options.report?.(command, result);
  }
  return true;
}

/**
 * **The audience**: a paper has just been put to a bot seat, and the bot
 * answers it now (`docs/war-diplomacy.md` §12).
 *
 * `driveBots`' opposite number and the second thing in this file that dispatches
 * a bot's command: that one plays a seat's whole turn, this one asks a seat
 * exactly one question — *what do you say to this?* — and sends the answer. It
 * **never ends the seat's turn** and runs no other arm; the seat's own sitting,
 * whenever it comes, is unchanged and will simply find one fewer paper on the
 * table.
 *
 * Determinism holds for the same reason a sitting's does, and it is worth
 * saying plainly because "the bot answered while I was still playing" sounds
 * like a client acting outside the log: the answer is a pure function of the
 * state, and it lands in the log as the bot's own command. A replay replays it.
 *
 * `null` — and the paper stands exactly as it did before — for every case this
 * is not for: **a human seat** (hot-seat, remote: nobody may answer for a
 * person), a seat that has ended its turn or is gone, a paper that is not on
 * the table, and a paper that was not put to this seat. Bot-to-bot papers are
 * not answered here either; they are answered at the sitting, as they always
 * were.
 *
 * The decision comes back so the sheet can print the envoy's own sentence and
 * the reasons under it — even when the reducer refused the command, which is a
 * bug the warning names and not something to hide from the player.
 */
export function answerAudience(game: Game, options: AudienceOptions): BotDecision | null {
  const { state } = game;
  const seat = playerById(state, options.seatId);
  const asker = playerById(state, options.askerId);
  if (!seat || !asker) return null;
  if (seat.isHuman) return null;
  if (seat.eliminated) return null;
  if (hasEndedTurn(state, seat.id)) return null;

  // **A fresh context, for one question.** A sitting is a seat's whole turn
  // (`botSitting`), and this is not a turn: the seat is being asked something in
  // the middle of somebody else's, so it opens its books, answers, and closes
  // them again rather than keeping a reading that would outlive the question.
  const ctx = valueContext(state, seat);
  let decision: BotDecision | null = null;
  if (options.dealId === undefined) {
    if (!hasPeaceOffer(state, asker.id, seat.id)) return null;
    decision = answerPeaceOffer(state, seat, asker, ctx);
  } else {
    const row = proposalById(state, options.dealId);
    if (!row || row.to !== seat.id || row.by !== asker.id) return null;
    decision = answerProposal(state, seat, row, ctx);
  }
  if (decision === null) return null;

  // The same seam as the sitting's, for the same reason: a paper this seat sends
  // back at the table is a paper it has answered, and the arm that writes papers
  // reads one memory wherever the answer was given.
  const refusal = pendingDealRefusal(state, decision.command);
  const result = dispatch(game, decision.command);
  options.attempt?.(decision.command, result);
  if (result.ok) {
    if (refusal !== null) rememberDealRefusal(state, refusal);
    options.report?.(decision.command, result);
    return decision;
  }
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  warn(
    `[ai] seat ${seat.id}: the reducer refused ${decision.command.type} at the table — ${result.error}`,
    decision.command,
  );
  return decision;
}

/** Runs one live seat for callers that supply a sitting or a fixed policy. */
export function driveSeat(
  game: Game,
  playerId: number,
  options: DriveOptions = {},
  guards: SeatGuards = freshGuards(),
  sitting: BotSitting = botSitting(playerId),
): SeatDriveReport {
  return finish(finishSeat(game, playerId, sitting, guards, { ...options, ask: askOf(options) }));
}
