/**
 * The loop that plays every seat nobody is sitting in.
 *
 * `bot.ts` answers *what would this seat like to do next?* one command at a
 * time and has no memory; this file is the other half — ask, dispatch, ask
 * again, and finally end the turn. Two things live here and nowhere else: the
 * **funnel** (a bot's command must reach the same listeners a human's does) and
 * the **guards** (a bot must never spin forever, and must never quietly swallow
 * a refusal).
 *
 * Since §12 of `docs/war-diplomacy.md` there are two doors rather than one:
 * `driveBots` plays a seat's whole turn, and `answerAudience` asks one seat one
 * question — the paper a player has just put on the table — and dispatches the
 * answer through the same funnel. Nothing about the funnel or the guards
 * changes; what changes is that a bot no longer makes a player wait a turn for
 * a yes.
 *
 * Why the commands go through the interface's funnel
 * ---------------------------------------------------
 * The star chart and the city panel already dispatch for themselves and then
 * call `GameControls.reportCommand`, so that the tutorial, the notice log and
 * everything else hanging off `onCommand` hears an order however it was given
 * (see `reportCommand`'s docblock in `controls.ts`). A bot is a third such
 * caller and takes the same road. It deliberately does **not** go through
 * `commit`: that funnel is a *seat's* after-effects — the sighting poll, the
 * raid report, the toast stack — and running them for a rival's order would
 * announce another empire's business to the player.
 *
 * Why a refusal is a bug
 * ----------------------
 * `bot.ts` puts every candidate to the simulation's own validator before it
 * proposes it, so the reducer should never say no. A refusal therefore means
 * the bot and the rules have drifted, and the honest response is a loud console
 * warning plus a *stop asking for that command this turn* — retrying an
 * identical refused command is the one way this loop could run forever.
 *
 * Since stage C1 there is a second kind of refusal, and it is not a bug: a
 * command a seat planned on its copy of the frozen board that the real board
 * refuses because an earlier seat moved first. That is a **conflict**. It is
 * not warned about; it stops the seat's plan, and the seat finishes its turn
 * with a live sitting (`frozenBoard.ts`).
 *
 * The single documented exception is `chooseGreatPerson`: the roster is shared
 * by every seat, and a hand naming somebody another empire has already called is
 * refused **and redrawn** by the reducer (the one refusal in the game that
 * mutates). That one is retried, because the retry is answering a *different*
 * hand — bounded by `ai.driver.greatPersonRedraws` so a data fault cannot spin.
 *
 * Determinism
 * -----------
 * Nothing here rolls a die, reads a clock or asks a renderer anything. The seats
 * are walked in `realPlayers` order, each seat's plan is a function of the
 * frozen board and the seat, the plans are put to the real game in that order,
 * and every accepted command is appended to the log by `dispatch` — so a save
 * of a game against bots replays to the same board, and a bot's whole game is
 * in the file exactly as a human's is. `frozenBoard.ts` says why the order in
 * which the plans are made cannot change the log.
 */

import { aiConfigFor } from './aiConfig';
import { type BotSitting, botSitting, nextBotCommand, valueContext } from './bot';
import { pendingDealRefusal, rememberDealRefusal } from './dealMemory';
import type { BotDecision } from './decision';
import { answerPeaceOffer, answerProposal } from './diplomacy';
import {
  type Asked,
  type CutReason,
  type FrozenBoard,
  type SeatGuards,
  type SeatPlan,
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

/**
 * Plays every seat that is not a person and has not ended its turn.
 *
 * **From a frozen board** (bot batch BP16, stage C1; `frozenBoard.ts`). The
 * board is frozen once, before any seat moves. Each seat decides its whole
 * sitting on its own copy of that board (a plan), and then the plans are put
 * to the real game in seat order. A plan that meets a command the real board
 * refuses, or one that would not mean what it meant on the copy, stops there,
 * and the seat finishes its turn with a live sitting on the real board
 * (`driveSeat`). Turns are simultaneous (hard rule 3), so no seat sees what
 * another seat did this turn, unless its plan was cut.
 *
 * `realPlayers` is the register for "who counts" (CLAUDE.md), so the wild is
 * excluded by construction rather than by a hand-rolled `!barbarian` — the wild
 * has no screen, sends no `endTurn`, and is driven by `barbarians.ts` inside the
 * resolution. Eliminated seats are skipped for the reason `firstBlocker` skips
 * them: they have nothing to act with, and the reducer already re-raises their
 * turn flag every resolution.
 *
 * Returns one report per seat it put to the board, in the order it put them.
 */
export function driveBots(game: Game, options: DriveOptions = {}): SeatDriveReport[] {
  const seats = botSeatsToDrive(game.state);
  if (seats.length === 0) return [];
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  const board = freezeBoard(game.state);
  // Every plan before any command lands, each on its own copy. The last seat
  // takes the frozen copy itself, since nothing needs it after.
  const plans = seats.map((playerId, index) =>
    planSeat(board, playerId, { ask: askOf(options), warn }, index === seats.length - 1),
  );
  const reports: SeatDriveReport[] = [];
  for (const plan of plans) {
    // **Asked again at the seat's own moment.** An earlier seat's commands can
    // knock a later one out (its last town taken, its last unit killed).
    // Elimination marks that seat's turn ended, so it has nothing to put: its
    // plan is dropped, and its End Turn would be refused. The stepper asks the
    // same question at the same point. Found in batch C3's six-seat duel,
    // where seat 3 falls on turn 108.
    const player = playerById(game.state, plan.playerId);
    if (player === undefined || player.eliminated || hasEndedTurn(game.state, plan.playerId)) continue;
    reports.push(putPlan(game, board, plan, options));
  }
  return reports;
}

/** The policy `planSeat` and `driveSeat` ask: the caller's, or the bot with its reasons. */
function askOf(options: DriveOptions): SittingAsk {
  const decide = options.decide;
  if (decide === undefined) return askTheBot;
  return (state, playerId, sitting) => {
    const command = decide(state, playerId, sitting);
    return command === null ? null : { command, decision: null };
  };
}

/**
 * Puts one seat's plan to the real game, then ends the seat's turn: with its
 * End Turn when the plan ran to its end, or with a live sitting when it was
 * cut. Every command sent here is reported to `attempt`, and every accepted
 * one to `report`, as `driveSeat` reports them.
 */
function putPlan(game: Game, board: FrozenBoard, plan: SeatPlan, options: DriveOptions): SeatDriveReport {
  const run = startPlanRun(plan);
  const put = (command: Command): CommandResult => {
    const result = dispatch(game, command);
    options.attempt?.(command, result);
    if (result.ok) options.report?.(command, result);
    return result;
  };
  while (applyNextStep(game.state, run, put) !== null) {
    // Each step lands, or is refused and cuts the plan after it.
  }
  mergeSeatMemory(game.state, board, run);
  const landed = run.guards.accepted;
  const seat =
    run.cut === null
      ? handOver(game, plan.playerId, options, run.guards)
      : driveSeat(game, plan.playerId, options, run.guards, liveSittingAfter(run));
  return {
    ...seat,
    refused: seat.refused + plan.refused,
    repeated: seat.repeated + plan.repeated,
    planned: plan.steps.length,
    landed,
    cut: run.cut,
  };
}

/**
 * The End Turn of a seat whose plan ran to its end: nothing is asked again.
 * A seat that fell during its own turn has nothing to send.
 */
function handOver(game: Game, playerId: number, options: DriveOptions, guards: SeatGuards): SeatDriveReport {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  const refused = endTheTurn(game, playerId, options, guards);
  if (refused !== null) warn(`[ai] seat ${playerId}: could not end its turn — ${refused}`);
  return reportOf(playerId, guards, refused === null);
}

/**
 * Sends the seat's End Turn. `null` when the turn is over (it landed, or the
 * seat fell during its own turn and has nothing to send), or the reducer's
 * reason when it was refused.
 */
function endTheTurn(game: Game, playerId: number, options: DriveOptions, guards: SeatGuards): string | null {
  // **A seat that fell during its own turn** (bot batch BP4). Its last town or
  // its last piece went in one of its own commands, and elimination marks its
  // turn ended at once (`updateElimination`). Its turn is over, so there is
  // nothing to send: an End Turn now would be refused three times and warned
  // about. The stepper stops the same seat at the same point. Found in the
  // six-seat duel digest, where seat 1 falls on turn 115.
  if (hasEndedTurn(game.state, playerId)) return null;
  const command: Command = { type: 'endTurn', playerId };
  const ended = dispatch(game, command);
  options.attempt?.(command, ended);
  if (!ended.ok) return ended.error;
  guards.accepted += 1;
  options.report?.(command, ended);
  return null;
}

function reportOf(playerId: number, guards: SeatGuards, ended: boolean): SeatDriveReport {
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

/**
 * One seat, from its first decision to its `endTurn`, on the live board. Since
 * stage C1 this is the live sitting that finishes a seat's turn after its plan
 * was cut (`driveBots`), with the plan's guards carried on, and the loop that
 * tests drive one seat with. The loop itself is `runSitting` (`frozenBoard.ts`),
 * which a plan runs on its copy too.
 *
 * Four guards, and each one closes a different way this could hang:
 *
 *   · **A command budget** (`ai.driver.commandsPerSeat`). A bot whose valuation
 *     oscillates — march here, march back — is bounded by the movement it
 *     spends, but a rule change could break that reasoning and a budget is what
 *     turns "the browser froze" into "the console said so".
 *   · **A refused-command memo.** A refusal means the bot proposed something the
 *     rules do not allow; re-proposing it would loop, so the identical command
 *     is banned for the rest of this seat's turn and the next decision is asked
 *     for instead.
 *   · **Bounded End Turn attempts.** `endTurn` is refused while the seat still
 *     owes the turn something, so a refusal is answered by running the bot again
 *     to clear whatever it names — a few times, and then the seat is left open
 *     with a warning rather than spun on.
 *   · **An accepted unit order is not sent again to an unchanged piece.** The
 *     reducer accepts a march that cannot take its first step and changes
 *     nothing, so an arm that keeps naming it is a loop the refused-command memo
 *     cannot see. The repeat is treated like a refusal: not sent, warned about,
 *     and the asking stops (`repeatsAnOrder`).
 */
export function driveSeat(
  game: Game,
  playerId: number,
  options: DriveOptions = {},
  guards: SeatGuards = freshGuards(),
  /**
   * The sitting to go on with. A cut plan hands its own, as it stood at its
   * last landed command (`liveSittingAfter`); every other caller gets a fresh one.
   */
  sitting: BotSitting = botSitting(playerId),
): SeatDriveReport {
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  // **The seat's own sheet**, not a module global: a persona is a sparse
  // override of the whole configuration, the `driver` block included, so two
  // seats may be allowed different budgets in the same pass.
  const ai = aiConfigFor(playerById(game.state, playerId)?.persona, playerId);
  // **One sitting for the seat's whole turn** (batch 6 of
  // `docs/bot-priorities.md`), the `sitting` argument. The appraisal context —
  // the empire's books, the shadow prices, the chains and the want book — is
  // built by the first arm that asks for it and read by every arm after it,
  // rather than rebuilt for each of the thirty or forty decisions a busy seat
  // makes. Anything a mid-turn mutation invalidates is re-read from the state
  // by the arm that needs it (`bankSpend` asks `purchaseError` and the treasury
  // at the moment it fires); see `BotSitting` for the whole of that bargain.
  const ask = askOf(options);
  const put = (command: Command): CommandResult => {
    const result = dispatch(game, command);
    options.attempt?.(command, result);
    return result;
  };
  const report = options.report;
  const landed = report === undefined ? undefined : (asked: Asked, result: CommandResult) => report(asked.command, result);

  for (let attempt = 0; attempt < Math.max(1, ai.driver.endTurnAttempts); attempt++) {
    runSitting(game.state, playerId, sitting, guards, ask, put, warn, landed);
    const refused = endTheTurn(game, playerId, options, guards);
    if (refused === null) return reportOf(playerId, guards, true);
    // Refused: something is still owed. One more pass of the loop above is the
    // answer, because `nextBotCommand` reads the very blocker that refused this.
    if (attempt + 1 >= Math.max(1, ai.driver.endTurnAttempts)) {
      warn(`[ai] seat ${playerId}: could not end its turn — ${refused}`);
    }
  }
  return reportOf(playerId, guards, false);
}
