/**
 * **Bots that decide from a frozen board** (bot batch BP16, stage C1;
 * `docs/flags.md`, "Bots after BP16 stage B", item 3).
 *
 * Turns are simultaneous (hard rule 3). So at the start of the turn's bot step
 * each bot seat decides its whole sitting against its own private copy of the
 * state as it stood at that moment. It applies its own commands to its copy as
 * it goes, as a sitting always has. The result is one ordered list of commands
 * a seat (a **plan**). Then the plans are applied to the real state in seat
 * order, each command through `dispatch` (hard rule 1), and the log holds the
 * commands in the order they were applied (hard rule 2).
 *
 * Before this stage seat 3 decided on a board that already held every command
 * seats 0 to 2 sent this turn. Now no seat sees what another seat did this
 * turn. A plan is a function of the frozen board and the seat only, so the
 * plans can be made in any order, and stage C2 can make them in parallel
 * workers and get the same log.
 *
 * What this file holds:
 *
 *   - **the guards of one seat's loop** (`SeatGuards`, `runSitting`): the
 *     command budget, the refused-command memo, the great-person redraw and
 *     the sent-orders memo. They moved here from `driver.ts` so that the plan
 *     and the live loops share one copy of them;
 *   - **the frozen board** (`freezeBoard`) and **the plan** (`planSeat`);
 *   - **the applier** (`startPlanRun`, `applyNextStep`): it puts a plan's
 *     commands to the real state one at a time and stops at the first one that
 *     cannot mean on the real board what it meant on the copy.
 *
 * Why a plan stops (a **cut**)
 * ----------------------------
 * An earlier seat's commands can change the board under a later seat's plan:
 * a hex now taken, a target dead or moved, a hex bought, a wonder claimed, a
 * paper withdrawn. A refused command leaves the state byte-identical, so a
 * refusal is safe, but the commands after it may depend on it. So the applier
 * stops at the first command that is refused, and the seat finishes its turn
 * with a live sitting on the real state (`driveSeat`, the code before this
 * stage). That sitting carries the plan's budget and landed orders
 * (`SeatGuards`) and the plan's marks at its last landed command
 * (`liveSittingAfter`), so it goes on where the plan stopped and does not ask a
 * piece again that the plan had already asked. It also stops in five cases
 * where the command would be accepted but would not do what the copy did:
 *
 *   - **a new id it cannot name.** Units, towns, deals and papers take their
 *     ids from one counter (`allocateEntityId`). Each copy starts from the same
 *     counter, so two seats' copies hand out the same ids. A plan's command
 *     names a new piece by the id its copy gave it, and the applier maps that
 *     id to the one the real state gave (`ids`). An id with no mapping stops
 *     the plan.
 *   - **a different count of new ids.** When the real state hands out more or
 *     fewer ids for a command than the copy did, the mapping is unknown from
 *     there on.
 *   - **a different offer.** An offer drawn mid-sitting (a discovery from a
 *     ruin, a draft from a culture windfall, a great person's hand) is drawn
 *     from the state's random stream, which earlier seats have moved on the
 *     real state. A choice by index from a different offer is a different
 *     choice, so the applier compares the offer first.
 *   - **a great person already called.** Ask the live policy for its next
 *     choice so it can take a remaining name or request a fresh offer.
 *   - **changed combat facts.** An attack names a coordinate. If the defender,
 *     owner, siege phase, health or strength changed, choose again before
 *     sending a legal command whose combat no longer matches the plan.
 *
 * What does not stop a plan: a blow that came out differently (the roll is
 * drawn from the real state's stream at the moment the command lands), or a
 * march that stopped short. Both are counted (`frozenTally.unlike`). Later
 * attacks check their combat facts before dispatch. Other dependent
 * commands can still stop the plan through a reducer refusal.
 *
 * Determinism
 * -----------
 * A bot decision draws nothing from the random stream (`aiBot.test.ts` pins
 * that no file here names it). The commands a plan sends on its copy do draw
 * from the copy's stream, and every copy starts from the same point, so two
 * seats' copies draw the same numbers. Those draws stay on the copies, which
 * are dropped. The real state draws only when a command lands on it, in the
 * fixed seat order. So the log does not depend on the order in which the plans
 * were made, or on how many threads made them.
 */

import { aiConfigFor } from './aiConfig';
import { tacticalDependencies, sameTacticalDependencies, type TacticalDependencies } from './tactics/dependencies';
import { type BotSitting, type SittingMarks, botSitting, nextBotCommand, nextBotDecision, resumedSitting, sittingMarks } from './bot';
import { pendingDealRefusal, rememberDealRefusal } from './dealMemory';
import type { BotDecision } from './decision';
import { type FocusChoice, adoptFocusRoll, copyFocusRoll } from './focusRoll';
import { type HarnessMemory, adoptHarnessMemory, readHarnessMemory } from './harnessMemory';
import { markMusterTurn } from './musterRoll';
import { type Command, type CommandResult, applyCommand } from '../sim/commands';
import { type CityAttackPhase, previewCombat } from '../sim/combat';
import { greatPersonChoiceError } from '../sim/greatPeople';
import { type GameState, cityById, playerById, unitById } from '../sim/state';

// --- the guards of one seat's loop ------------------------------------------

/** Each accepted attempt maps to the piece as it stood after dispatch, for this seat and turn. */
export type SentOrders = Map<string, string>;

/** Read before dispatch so a second attack or Great Person use has a distinct key. */
export function orderAttemptKey(state: GameState, command: Command): string {
  const key = JSON.stringify(command);
  if (command.type === 'attack' && unitById(state, command.unitId)?.firstAttackTurn === state.turn) return `${key}#second`;
  if (command.type !== 'greatPersonAct' && command.type !== 'greatPersonWork') return key;
  const uses = unitById(state, command.unitId)?.extraUsesTaken ?? 0;
  return `${key}#${uses}`;
}

/**
 * Whether a command is an order to one piece. Only those are held to
 * `repeatsAnOrder`, because other commands repeat legitimately: two belief
 * drafts in one turn are both answered with option nought, and a town can be
 * handed the same queue again after its last item finished.
 */
export function sentToAPiece(command: Command): boolean {
  return 'unitId' in command || 'settlerUnitId' in command;
}

/**
 * Whether sending this order now would repeat one already accepted this turn:
 * the identical command, to a piece that is still exactly as that copy left it.
 *
 * The piece is part of the test because the same order can be a new decision
 * once the piece has changed: a worker pushed off its route by a swap and
 * re-sent to the same hex, or a soldier whose march was cut short. What cannot
 * be a new decision is the same order to the same piece in the same state.
 * That is the loop the browser performance audit of 2026-10-06 found (finding
 * 1): a dug-in warrior, jammed behind a friend, was sent the march it already
 * held about 390 times in one turn, and every copy was accepted and changed
 * nothing.
 */
export function repeatsAnOrder(sent: SentOrders, state: GameState, command: Command, key: string): boolean {
  const stamp = sent.get(key);
  return stamp !== undefined && stamp === pieceStamp(state, command);
}

/** Remembers an accepted order to a piece, with the piece as it now stands. */
export function noteSentOrder(sent: SentOrders, state: GameState, command: Command, key: string): void {
  if (sentToAPiece(command)) sent.set(key, pieceStamp(state, command));
}

/** The named piece, printed; `null` once it is gone (founded, spent, killed). */
function pieceStamp(state: GameState, command: Command): string {
  let id: number | undefined;
  if ('unitId' in command) id = command.unitId;
  else if ('settlerUnitId' in command) id = command.settlerUnitId;
  return JSON.stringify(id === undefined ? null : (unitById(state, id) ?? null));
}

/**
 * **What one seat's loop remembers for its turn.** `driveSeat` and the stepper
 * kept these on their own stacks before this stage. They are one value now, so
 * a seat whose plan was cut can hand them to the live sitting that finishes
 * its turn: the budget it has spent, and the orders the plan already landed.
 */
export interface SeatGuards {
  /** Commands accepted, the seat's own `endTurn` included once it lands. */
  accepted: number;
  /** Commands the reducer refused that the policy proposed. Any number above zero is a bug. */
  refused: number;
  /** Unit orders asked for again to an unchanged piece. Any number above zero is a bug. */
  repeated: number;
  /** Redraws that used the extra allowance for contested great person choices. */
  redraws: number;
  /** Refused attempts for this sitting. */
  refusedCommands: Set<string>;
  /** The unit orders accepted this turn, with their pieces (`repeatsAnOrder`). */
  sentOrders: SentOrders;
}

export function freshGuards(): SeatGuards {
  return { accepted: 0, refused: 0, repeated: 0, redraws: 0, refusedCommands: new Set(), sentOrders: new Map() };
}

/** What the policy said: the command, and the decision with its reasons when the policy gives one. */
export interface Asked {
  command: Command;
  decision: BotDecision | null;
}

/** The policy, asked for one command. */
export type SittingAsk = (state: GameState, playerId: number, sitting: BotSitting) => Asked | null;

/** Where a refusal or a repeat is said out loud. */
export type Warn = (message: string, detail?: unknown) => void;

/** The result is available before the next decision so a spectator can pause here. */
export interface SittingStep extends Asked {
  result: CommandResult;
  turn: number;
}

/** Runs the same guards on a planning copy and after a conflict on the real board. */
export function* runSitting(
  state: GameState,
  playerId: number,
  sitting: BotSitting,
  guards: SeatGuards,
  ask: SittingAsk,
  put: (asked: Asked) => CommandResult,
  warn: Warn,
): Generator<SittingStep, void> {
  // **The seat's own sheet**, not a module global: a persona is a sparse
  // override of the whole configuration, the `driver` block included, so two
  // seats may be allowed different budgets in the same pass.
  const ai = aiConfigFor(playerById(state, playerId)?.persona, playerId);
  while (guards.accepted + guards.refused - guards.redraws < ai.driver.commandsPerSeat) {
    const asked = ask(state, playerId, sitting);
    if (asked === null) break;
    const { command } = asked;
    const key = orderAttemptKey(state, command);
    // The bot is still asking for something the rules refused. Nothing this
    // loop can do about it; the caller's End Turn ends the seat.
    if (guards.refusedCommands.has(key)) break;
    if (repeatsAnOrder(guards.sentOrders, state, command, key)) {
      // The same order to the same piece, already accepted this turn, and the
      // piece has not changed since. The policy is a pure function of the
      // state, so it would keep asking; sending it again changes nothing and
      // used to run the seat to its command budget. Stop asking, exactly as
      // for a refusal, and say so.
      guards.repeated += 1;
      warn(`[ai] seat ${playerId}: asked again for the same ${command.type} — ${key}`, command);
      break;
    }
    // **The paper remembers** (X4). Read while the paper is still on the
    // table (the decline takes the row off the register), and banked only if
    // the reducer took the answer.
    const refusal = pendingDealRefusal(state, command);
    const turn = state.turn;
    const result = put(asked);
    if (result.ok) {
      if (refusal !== null) rememberDealRefusal(state, refusal);
      noteSentOrder(guards.sentOrders, state, command, key);
      guards.accepted += 1;
      // A contested choice can leave the seat with another offer to answer.
      if (result.greatPersonOfferRefreshed && guards.redraws < ai.driver.greatPersonRedraws) guards.redraws += 1;
    } else {
      guards.refused += 1;
      guards.refusedCommands.add(key);
      warn(`[ai] seat ${playerId}: the reducer refused ${command.type} — ${result.error}`, command);
    }
    yield { ...asked, turn, result };
  }
}

// --- the frozen board -------------------------------------------------------

/** The board as it stood when the turn's bot step began. */
export interface FrozenBoard {
  /** A private copy of the state. Nothing is ever sent to it; each plan copies it. */
  state: GameState;
  /** The bots' memories beside the state at that moment (`harnessMemory.ts`). */
  memory: HarnessMemory;
  /** `nextEntityId` at that moment. Every id at or above it was handed out during the bot step. */
  firstNewId: number;
}

/**
 * Freezes the board for the turn's bot step.
 *
 * The muster roll's mark for the turn (`musterRoll.ts`) is written on the real
 * state first. Before this stage the first bot decision of the turn wrote it,
 * which was the same moment; now every copy reads the mark the real state
 * holds, and none of them writes one.
 */
export function freezeBoard(state: GameState): FrozenBoard {
  markMusterTurn(state);
  return { state: structuredClone(state), memory: readHarnessMemory(state), firstNewId: state.nextEntityId };
}

// --- the plan ---------------------------------------------------------------

/** A legal attack can face a different defender or use health and strength that changed after planning. */
interface PlannedCombat {
  unitId: number | null;
  cityId: number | null;
  ownerId: number;
  phase: CityAttackPhase | null;
  attackerHp: number;
  defenderHp: number;
  attackerStrength: number;
  defenderStrength: number;
}

/** One command a seat's sitting sent on its copy, and what the applier checks it against. */
export interface PlannedStep {
  command: Command;
  /** The decision with its reasons, when the policy gave one (the spectator prints it). */
  decision: BotDecision | null;
  /** The copy's `nextEntityId` before the command. */
  firstMinted: number;
  /** How many ids the copy handed out for it. */
  minted: number;
  /** For a choice from an offer: the offers the seat held on the copy just before. */
  offer: string | null;
  /** The direct combat facts on the planning copy, before an attack changes them. */
  combat: PlannedCombat | null;
  tactics?: TacticalDependencies | null;
  /**
   * For a march or a blow: what it left on the copy (`outcomePrint`), for the
   * tally of commands that landed and did not do what the copy did.
   */
  after: string | null;
  /**
   * The sitting's marks just after this command (`sittingMarks`, `bot.ts`).
   * A live sitting after a cut starts from the marks of the last command
   * that landed.
   */
  marks: SittingMarks;
}

/** One seat's plan: its sitting on the frozen board, as a list. */
export interface SeatPlan {
  playerId: number;
  /** The accepted commands in order. The seat's End Turn is not in it. */
  steps: PlannedStep[];
  /** The harness memories of the copy at the end of the sitting. */
  memory: HarnessMemory;
  /** The copy's id counter at the freeze, for mapping new ids. */
  firstNewId: number;
  /** Refusals and repeats on the copy: bugs, warned about as the live loop warns. */
  refused: number;
  repeated: number;
  /** How many times the policy was asked. */
  asks: number;
}

interface PlanOptions {
  ask?: SittingAsk;
  warn?: Warn;
}

/** `nextBotDecision`, as the loop asks it. */
export const askTheBot: SittingAsk = (state, playerId, sitting) => {
  const decision = nextBotDecision(state, playerId, sitting);
  return decision === null ? null : { command: decision.command, decision };
};

/** Ordinary games need only the command. Release its score tree before recording the step. */
export function askForCommands(decide = nextBotCommand): SittingAsk {
  return (state, playerId, sitting) => {
    const command = decide(state, playerId, sitting);
    return command === null ? null : { command, decision: null };
  };
}

/**
 * **One seat's sitting on its own copy of the frozen board.**
 *
 * `consume` hands the frozen copy itself to this plan, for the last seat a
 * caller will plan: nobody needs the board after it, so one copy is saved.
 */
export function planSeat(
  board: FrozenBoard,
  playerId: number,
  options: PlanOptions = {},
  consume = false,
): SeatPlan {
  const state = consume ? board.state : structuredClone(board.state);
  adoptHarnessMemory(state, board.memory);
  const ask = options.ask ?? askTheBot;
  const warn = options.warn ?? ((message: string, detail?: unknown) => console.warn(message, detail));
  const steps: PlannedStep[] = [];
  const guards = freshGuards();
  const sitting = botSitting(playerId);
  let asks = 0;
  const counted: SittingAsk = (at, seat, held) => {
    asks += 1;
    return ask(at, seat, held);
  };
  const put = ({ command, decision }: Asked): CommandResult => {
    const firstMinted = state.nextEntityId;
    const offer = choosesFromAnOffer(command) ? offerPrint(state, playerId) : null;
    const combat = command.type === 'attack' ? combatFactsFor(state, command) : null;
    const ai = aiConfigFor(state.players[playerId]?.persona, playerId);
    const tactics = ai.tactics.enabled > 0 && (decision?.tacticalOrigin || command.type === 'attack')
      ? tacticalDependencies(state, playerId, command, ai.tactics.radius,
        decision?.tacticalOrigin ? [decision.tacticalOrigin, ...('target' in command ? [command.target] : [])] : undefined)
      : null;
    const result = applyCommand(state, command);
    if (result.ok) {
      steps.push({
        command,
        decision,
        firstMinted,
        minted: state.nextEntityId - firstMinted,
        offer,
        combat,
        tactics,
        after: outcomePrint(state, command, board.firstNewId),
        marks: sittingMarks(sitting),
      });
    }
    return result;
  };
  for (const _step of runSitting(state, playerId, sitting, guards, counted, put, warn)) {
    // Finish planning on the private copy before any of its commands enter the game.
  }
  return {
    playerId,
    steps,
    memory: readHarnessMemory(state),
    firstNewId: board.firstNewId,
    refused: guards.refused,
    repeated: guards.repeated,
    asks,
  };
}

/** The commands that choose from an offer by index, or spend or redraw one. */
function choosesFromAnOffer(command: Command): boolean {
  switch (command.type) {
    case 'chooseDiscovery':
    case 'chooseOrder':
    case 'skipOrderOffer':
    case 'rerollOffer':
    case 'adoptGovernment':
    case 'chooseDoctrine':
    case 'skipDoctrineOffer':
    case 'chooseBelief':
    case 'chooseGreatPerson':
      return true;
    default:
      return false;
  }
}

/** Every offer a seat holds, printed. Two equal prints are two equal hands. */
function offerPrint(state: GameState, playerId: number): string {
  const player = playerById(state, playerId);
  if (player === undefined) return '';
  return JSON.stringify([
    player.pendingDiscovery ?? null,
    player.statecraft.pendingOrder ?? null,
    player.statecraft.pendingGovernment ?? null,
    player.statecraft.pendingDoctrine ?? null,
    player.pantheon.pending ?? null,
    player.greatPersonOffer ?? null,
  ]);
}

/**
 * **What a march or a blow left on the board**, printed, or `null` for any
 * other command. A march: where the piece stands and the movement it has left.
 * A blow: where the attacker stands (or that it fell), the pieces on the
 * struck hex, and who holds a town there. The roll of a blow is not in it,
 * because it is drawn from each board's own stream and differs on nearly every
 * blow; who fell and who moved is what a later command depends on. An id handed
 * out during the bot step prints as `*`, since the copy and the real state give
 * such ids different numbers.
 */
function outcomePrint(state: GameState, command: Command, firstNewId: number): string | null {
  if (command.type !== 'moveUnit' && command.type !== 'attack') return null;
  const unit = unitById(state, command.unitId);
  const stands = unit === undefined ? 'gone' : `${unit.col},${unit.row}`;
  if (command.type === 'moveUnit') return unit === undefined ? stands : `${stands},${unit.movesLeft}`;
  const { col, row } = command.target;
  const id = (value: number): string => (value < firstNewId ? String(value) : '*');
  const there = state.units.filter((piece) => piece.col === col && piece.row === row).map((piece) => id(piece.id));
  const town = state.cities.find((city) => city.col === col && city.row === row);
  return `${stands}|${there.join(',')}|${town === undefined ? '' : `${id(town.id)}:${town.ownerId}`}`;
}

// --- the applier ------------------------------------------------------------

/** Why a plan stopped before its end. */
export type CutReason = 'refused' | 'unmapped' | 'offer' | 'taken' | 'minted' | 'combat';

/** One plan being put to the real state. */
export interface PlanRun {
  plan: SeatPlan;
  /** The next step to put. */
  next: number;
  /** New ids: the copy's id, mapped to the real state's. */
  ids: Map<number, number>;
  /** The loop's guards, filled as the plan's commands land. A live sitting after a cut carries them on. */
  guards: SeatGuards;
  /** Why the plan stopped, or `null` while it has not. */
  cut: CutReason | null;
  /** What differed, in words: the reducer's reason for a refusal, or what the check found. */
  error: string | null;
  /** Marches and blows that landed and did not leave what the copy's left (`outcomePrint`). */
  unlike: number;
  /** The sitting's marks at the last command that landed, or `null` while none has. */
  resume: SittingMarks | null;
}

export function startPlanRun(plan: SeatPlan): PlanRun {
  return { plan, next: 0, ids: new Map(), guards: freshGuards(), cut: null, error: null, unlike: 0, resume: null };
}

/**
 * Resume from the last accepted command. A re-ask spends its budget when the
 * bot checks the march, so keep those marks even if the reducer refused its order.
 */
export function liveSittingAfter(run: PlanRun): BotSitting {
  const playerId = run.plan.playerId;
  const attempted = run.plan.steps[run.next - 1];
  if (attempted === undefined) return botSitting(playerId);
  const accepted = run.resume ?? sittingMarks(botSitting(playerId));
  const marks = { ...accepted, reasked: attempted.marks.reasked };
  const first = run.plan.firstNewId;
  return resumedSitting(playerId, marks, (id) => (id < first ? id : (run.ids.get(id) ?? null)));
}

/** What one step did on the real state. */
export interface LandedStep {
  step: PlannedStep;
  /** The command as sent, with its new ids mapped. */
  command: Command;
  result: CommandResult;
}

/**
 * Puts the run's next planned command to the real state through `put`, or
 * stops the run. `null` means nothing was sent: the plan is done, or it was cut
 * before the command (`run.cut` says which). A refused command is sent, and
 * returned, and cuts the plan after it.
 */
export function applyNextStep(
  state: GameState,
  run: PlanRun,
  put: (command: Command) => CommandResult,
): LandedStep | null {
  if (run.cut !== null || run.next >= run.plan.steps.length) return null;
  const step = run.plan.steps[run.next]!;
  const playerId = run.plan.playerId;
  const command = withRealIds(step.command, run);
  if (command === null) return cut(run, 'unmapped', step.command.type);
  if (step.offer !== null) {
    const real = offerPrint(state, playerId);
    if (real !== step.offer) return cut(run, 'offer', `${command.type}: ${offerDifference(step.offer, real)}`);
  }
  if (command.type === 'chooseGreatPerson') {
    const taken = greatPersonChoiceError(state, playerId, command.optionIndex);
    if (taken !== null) return cut(run, 'taken', taken);
  }
  if (step.tactics) {
    const actual = tacticalDependencies(state, playerId, command, step.tactics.radius, step.tactics.centres);
    if (!actual || !sameTacticalDependencies(step.tactics, actual, id => mappedEntityId(run, id))) {
      return cut(run, 'combat', 'local tactical position changed');
    }
  }
  if (command.type === 'attack') {
    const expected = step.combat;
    const actual = combatFactsFor(state, command);
    if (!expected || actual === null) return cut(run, 'combat', 'attack target is unavailable');
    const unitId = expected.unitId === null ? null : mappedEntityId(run, expected.unitId);
    const cityId = expected.cityId === null ? null : mappedEntityId(run, expected.cityId);
    if ((expected.unitId !== null && unitId === null) || (expected.cityId !== null && cityId === null)) {
      return cut(run, 'unmapped', 'attack target');
    }
    if (unitId !== actual.unitId || cityId !== actual.cityId ||
        expected.ownerId !== actual.ownerId || expected.phase !== actual.phase) {
      return cut(run, 'combat', 'defender or siege phase changed');
    }
    if (expected.attackerHp !== actual.attackerHp || expected.defenderHp !== actual.defenderHp ||
        expected.attackerStrength !== actual.attackerStrength || expected.defenderStrength !== actual.defenderStrength) {
      return cut(run, 'combat', 'health or strength changed');
    }
  }
  const firstMinted = state.nextEntityId;
  const refusal = pendingDealRefusal(state, command);
  const key = orderAttemptKey(state, command);
  const result = put(command);
  run.next += 1;
  if (!result.ok) {
    run.cut = 'refused';
    run.error = result.error;
    tallyOne(frozenTally.cut, 'refused');
    tallyOne(frozenTally.cutWhy, `refused: ${command.type}${run.unlike > 0 ? ', after an unlike outcome' : ''}`);
    tallyOne(frozenTally.refused, command.type);
    tallyOne(frozenTally.refusedWhy, `${command.type}: ${result.error.replace(/\d+/g, 'N').slice(0, 60)}`);
    return { step, command, result };
  }
  if (refusal !== null) rememberDealRefusal(state, refusal);
  noteSentOrder(run.guards.sentOrders, state, command, key);
  run.guards.accepted += 1;
  run.resume = step.marks;
  frozenTally.landed += 1;
  const minted = state.nextEntityId - firstMinted;
  if (minted !== step.minted) {
    cut(run, 'minted', `${command.type}: ${step.minted} on the copy, ${minted} here`);
  } else {
    for (let index = 0; index < minted; index++) run.ids.set(step.firstMinted + index, firstMinted + index);
  }
  if (step.after !== null && outcomePrint(state, command, run.plan.firstNewId) !== step.after) {
    run.unlike += 1;
    tallyOne(frozenTally.unlike, command.type);
  }
  return { step, command, result };
}

function cut(run: PlanRun, reason: CutReason, why: string): null {
  run.cut = reason;
  run.error = why;
  tallyOne(frozenTally.cut, reason);
  tallyOne(frozenTally.cutWhy, `${reason}: ${why.replace(/\d+/g, 'N').slice(0, 60)}`);
  return null;
}

/** Which of the offers differ between two prints, by name. */
function offerDifference(planned: string, real: string): string {
  const names = ['discovery', 'order', 'government', 'doctrine', 'belief', 'great person'];
  const a = JSON.parse(planned) as unknown[];
  const b = JSON.parse(real) as unknown[];
  return names.filter((_, index) => JSON.stringify(a[index]) !== JSON.stringify(b[index])).join(', ');
}

/** Use the reducer's target selection and strength calculation, including all siege phases. */
function combatFactsFor(state: GameState, command: Extract<Command, { type: 'attack' }>): PlannedCombat | null {
  const forecast = previewCombat(state, command.unitId, command.target);
  if (!forecast.ok) return null;
  const unitId = forecast.defenderUnitId;
  const cityId = forecast.defenderCityId;
  const ownerId = unitId !== null ? unitById(state, unitId)?.ownerId
    : cityId !== null ? cityById(state, cityId)?.ownerId : undefined;
  if (ownerId === undefined) return null;
  return {
    unitId, cityId, ownerId, phase: forecast.cityPhase ?? null,
    attackerHp: forecast.attackerHp, defenderHp: forecast.defenderHp,
    attackerStrength: forecast.attackerStrength, defenderStrength: forecast.defenderStrength,
  };
}

/** Commands and their planned targets must use the same mapping for new entities. */
function mappedEntityId(run: PlanRun, id: number): number | null {
  return id < run.plan.firstNewId ? id : (run.ids.get(id) ?? null);
}

/** The id fields a command may carry. Every entity id comes from the one counter. */
const ID_FIELDS = ['unitId', 'settlerUnitId', 'cityId', 'fromCityId', 'toCityId', 'dealId'] as const;

/**
 * The command with every id the copy handed out replaced by the id the real
 * state handed out, or `null` when one of them has no mapping. An id below the
 * frozen counter names the same thing on both boards and is kept.
 */
function withRealIds(command: Command, run: PlanRun): Command | null {
  const real = (id: number): number | null => mappedEntityId(run, id);
  let out: Record<string, unknown> | null = null;
  const fields = command as unknown as Record<string, unknown>;
  for (const field of ID_FIELDS) {
    const id = fields[field];
    if (typeof id !== 'number') continue;
    const mapped = real(id);
    if (mapped === null) return null;
    if (mapped !== id) {
      out ??= { ...fields };
      out[field] = mapped;
    }
  }
  // A peace paper may cede towns by id (`DealTerms.cities`).
  for (const side of ['give', 'take'] as const) {
    const terms = fields[side] as { cities?: number[] } | undefined;
    if (terms?.cities === undefined) continue;
    const cities: number[] = [];
    for (const id of terms.cities) {
      const mapped = real(id);
      if (mapped === null) return null;
      cities.push(mapped);
    }
    if (cities.some((id, index) => id !== terms.cities![index])) {
      out ??= { ...fields };
      out[side] = { ...terms, cities };
    }
  }
  return out === null ? command : (out as unknown as Command);
}

/**
 * **The seat's memories from its copy, onto the real state**, once its plan has
 * been put (whether it ran to the end or was cut), and before a live sitting
 * finishes the seat's turn.
 *
 *   - **The focus roll** (`focusRoll.ts`) is keyed by town. The rows this
 *     seat's copy wrote or changed are written onto the real roll, with a new
 *     town's id mapped. A row for a command that was cut does no harm: the
 *     focus arm chooses again for a town whose focus is not the one its row
 *     names.
 *   - **The refusal memory** (`dealMemory.ts`) is banked by the applier as each
 *     answer lands on the real state, as the page's replay banks it.
 *   - **The muster roll** was marked on the real state at the freeze.
 */
export function mergeSeatMemory(state: GameState, board: FrozenBoard, run: PlanRun): void {
  const seat = run.plan.playerId;
  const before = new Map(board.memory.focus.map((row) => [row.cityId, JSON.stringify(row)]));
  const roll = copyFocusRoll(state);
  let changed = false;
  for (const row of run.plan.memory.focus) {
    if (before.get(row.cityId) === JSON.stringify(row)) continue;
    const cityId = row.cityId < run.plan.firstNewId ? row.cityId : run.ids.get(row.cityId);
    if (cityId === undefined) continue;
    const city = state.cities.find((town) => town.id === cityId);
    if (city === undefined || city.ownerId !== seat) continue;
    const fresh: FocusChoice = { ...row, cityId };
    const index = roll.findIndex((other) => other.cityId === cityId);
    if (index < 0) roll.push(fresh);
    else roll[index] = fresh;
    changed = true;
  }
  if (changed) adoptFocusRoll(state, roll);
}

// --- the tally --------------------------------------------------------------

/**
 * **What the applier met**, counted across a process, for the measurements
 * of stage C1 (`docs/plans/performance-pass-2026-11-06.md`, "Stage C"). A tally
 * only: nothing reads it to decide.
 */
export const frozenTally = {
  /** Planned commands that landed on the real state. */
  landed: 0,
  /** Refused planned commands, by command type. */
  refused: {} as Record<string, number>,
  /** The same, by the first words of the reducer's reason. */
  refusedWhy: {} as Record<string, number>,
  /** Plans stopped, by reason. */
  cut: {} as Record<string, number>,
  /** The same, with what differed. */
  cutWhy: {} as Record<string, number>,
  /** Commands that landed and did not do what the copy did (a fight, a march), by kind. */
  unlike: {} as Record<string, number>,
};

function tallyOne(table: Record<string, number>, key: string): void {
  table[key] = (table[key] ?? 0) + 1;
}
