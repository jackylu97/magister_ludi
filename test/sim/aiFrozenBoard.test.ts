/**
 * **Bots that decide from a frozen board** (bot batch BP16, stage C1;
 * `src/ai/frozenBoard.ts`). At the start of the turn's bot step each seat
 * plans its whole sitting on its own copy of the board, and the plans are put
 * to the real game in seat order. A plan stops at the first command the real
 * board refuses, or that would not mean what it meant on the copy, and the
 * seat finishes its turn with a live sitting.
 *
 * What these tests pin:
 *
 *   - a seat's plan does not change when another seat's commands land on the
 *     real board first, or when the plans are made in another order;
 *   - two seats that want the same hex resolve by seat order, with no warning
 *     and no lost turn;
 *   - a town founded this turn gets one id, the seat's later commands name it,
 *     and the log replays;
 *   - a person's paper put to a bot is answered in the same turn;
 *   - a great person another seat called first stops the plan before the
 *     refusal that would redraw the hand;
 *   - a cut plan leaves no piece without orders that the uncut plan gave orders;
 *   - the stepper and the driver play the same short game.
 */

import { describe, expect, it } from 'vitest';

import { botSeatsToDrive, driveBots, driveBotsAsync } from '../../src/ai/driver';
import { readHarnessMemory } from '../../src/ai/harnessMemory';
import {
  type SeatPlan,
  applyNextStep,
  freezeBoard,
  mergeSeatMemory,
  planSeat,
  startPlanRun,
} from '../../src/ai/frozenBoard';
import { createBotStepper } from '../../src/ai/stepper';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type Game, dispatch, replay, restoreState, snapshotState } from '../../src/sim/game';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { type GameConfig, type GameState, bumpRevision, createUnit, playerById, unitById } from '../../src/sim/state';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { allBlockers } from '../../src/ui/turnBlockers';
import { grownGames } from './grownGameHelpers';
import { createGame } from './newGameHelpers';

/** Four bot seats on the small map with the wild: a board where seats meet early. */
const FOUR: GameConfig = {
  seed: 3,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85', persona: 'wide' },
    { name: 'Ochre', color: '#c9a227', persona: 'warmonger' },
    { name: 'Plum', color: '#6a4c93', persona: 'tall' },
  ],
  barbarians: true,
};

const grown = grownGames(FOUR);

/** A plan's commands, as text, to compare two plans by. */
function planText(plan: SeatPlan): string {
  return JSON.stringify(plan.steps.map((step) => step.command));
}

/** Puts one plan to the real game, and the seat's memories after it. */
function putPlan(game: Game, board: ReturnType<typeof freezeBoard>, plan: SeatPlan): ReturnType<typeof startPlanRun> {
  const run = startPlanRun(plan);
  while (applyNextStep(game.state, run, (command) => dispatch(game, command)) !== null) {
    // each step lands or is refused
  }
  mergeSeatMemory(game.state, board, run);
  return run;
}

describe('a plan is a function of the frozen board and the seat', () => {
  it('does not change when another seat lands first, or when the plans are made in another order', () => {
    const game = grown(20);
    const board = freezeBoard(game.state);
    const frozen = snapshotState(board.state);
    const seats = botSeatsToDrive(game.state);
    expect(seats.length).toBe(4);
    const forward = seats.map((playerId) => planSeat(board, playerId, { warn: () => undefined }));
    const backward = [...seats].reverse().map((playerId) => planSeat(board, playerId, { warn: () => undefined }));
    backward.reverse();
    expect(backward.map(planText)).toEqual(forward.map(planText));
    // Most seats had something to do, so the comparison compared something.
    const busy = forward.filter((plan) => plan.steps.length > 0);
    expect(busy.length).toBeGreaterThanOrEqual(2);

    // The first busy seat's plan lands on the real board; every later seat's
    // plan, made again from the frozen board, is the plan it made before.
    const first = forward.indexOf(busy[0]!);
    putPlan(game, board, busy[0]!);
    expect(game.log.length).toBeGreaterThan(0);
    for (let index = first + 1; index < seats.length; index++) {
      const again = planSeat(board, seats[index]!, { warn: () => undefined });
      expect(planText(again)).toBe(planText(forward[index]!));
    }
    // Planning never writes to the frozen board.
    expect(snapshotState(board.state)).toBe(frozen);
  });
});

/**
 * A two-seat game at turn 1 with a soldier of each seat beside one free hex
 * `goal`, such that either may march onto it but not both.
 */
function sameHexBoard(): { game: Game; goal: { col: number; row: number }; mine: [number, number] } {
  const game = createGame({
    seed: 4242,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#d4502e' },
      { name: 'Teal', color: '#1f8a85' },
    ],
    barbarians: false,
  });
  const { state } = game;
  const taken = (col: number, row: number): boolean => state.units.some((unit) => unit.col === col && unit.row === row);
  const free = (col: number, row: number): boolean => {
    const tile = getTileAt(state.map, col, row);
    return tile !== undefined && !isWaterTerrain(tile.terrain) && !taken(col, row);
  };
  for (const goal of state.map.tiles) {
    if (!free(goal.col, goal.row)) continue;
    if (mapRange(state.map, tileHex(goal), 3).some((tile) => taken(tile.col, tile.row))) continue;
    const beside = mapRange(state.map, tileHex(goal), 1).filter(
      (tile) => !(tile.col === goal.col && tile.row === goal.row) && free(tile.col, tile.row),
    );
    if (beside.length < 2) continue;
    const trial = restoreState(snapshotState(state));
    const a = createUnit(trial, 0, 'warrior', beside[0]!.col, beside[0]!.row);
    const b = createUnit(trial, 1, 'warrior', beside[1]!.col, beside[1]!.row);
    const target = { col: goal.col, row: goal.row };
    const first = applyCommand(trial, { type: 'moveUnit', playerId: 0, unitId: a.id, target });
    if (!first.ok || unitById(trial, a.id)?.col !== goal.col || unitById(trial, a.id)?.row !== goal.row) continue;
    const second = applyCommand(trial, { type: 'moveUnit', playerId: 1, unitId: b.id, target });
    if (second.ok) continue;
    const w0 = createUnit(state, 0, 'warrior', beside[0]!.col, beside[0]!.row);
    const w1 = createUnit(state, 1, 'warrior', beside[1]!.col, beside[1]!.row);
    bumpRevision(state);
    return { game, goal: target, mine: [w0.id, w1.id] };
  }
  throw new Error('no free hex with two free hexes beside it');
}

describe('two seats that want the same hex', () => {
  it('resolve by seat order, with no warning and no lost turn', () => {
    const { game, goal, mine } = sameHexBoard();
    // The policy: march this seat's soldier onto the goal while the goal is
    // free on the board it is handed; otherwise nothing.
    const decide = (state: GameState, playerId: number): Command | null => {
      const unitId = mine[playerId];
      if (unitId === undefined) return null;
      if (state.units.some((unit) => unit.col === goal.col && unit.row === goal.row)) return null;
      return { type: 'moveUnit', playerId, unitId, target: goal };
    };
    const warnings: string[] = [];
    const reports = driveBots(game, { decide, warn: (message) => warnings.push(message) });
    expect(warnings).toEqual([]);
    // Both seats planned the march on their copies; seat 0's landed first.
    expect(reports.map((report) => [report.playerId, report.planned, report.landed, report.cut])).toEqual([
      [0, 1, 1, null],
      [1, 1, 0, 'refused'],
    ]);
    const first = unitById(game.state, mine[0])!;
    const second = unitById(game.state, mine[1])!;
    expect([first.col, first.row]).toEqual([goal.col, goal.row]);
    expect([second.col, second.row]).not.toEqual([goal.col, goal.row]);
    // Both seats ended, so the world resolved.
    expect(reports.every((report) => report.ended)).toBe(true);
    expect(game.state.turn).toBe(2);
  });
});

describe('a piece or town made this turn', () => {
  it('gets one id, the later commands name it, and the log replays', () => {
    const game = createGame(FOUR);
    const warnings: string[] = [];
    // Every command that names a town or a piece names one of its own seat's,
    // at the moment it lands: a copy's id handed on unmapped would name another
    // seat's town or piece, or nothing.
    const misnamed: string[] = [];
    const report = (command: Command): void => {
      const fields = command as unknown as { cityId?: number; unitId?: number };
      if (fields.cityId !== undefined) {
        const city = game.state.cities.find((town) => town.id === fields.cityId);
        if (city !== undefined && city.ownerId !== command.playerId) misnamed.push(JSON.stringify(command));
      }
      if (fields.unitId !== undefined) {
        const unit = unitById(game.state, fields.unitId);
        if (unit !== undefined && unit.ownerId !== command.playerId) misnamed.push(JSON.stringify(command));
      }
    };
    let shared = 0;
    for (let turn = 0; turn < 8; turn++) {
      // On every copy the first new id is the frozen counter, so two seats
      // that make something on the same turn hand out the same id.
      const board = freezeBoard(structuredClone(game.state));
      const plans = botSeatsToDrive(game.state).map((playerId) => planSeat(board, playerId, { warn: () => undefined }));
      const makers = plans.filter((plan) => plan.steps.some((step) => step.minted > 0));
      for (const plan of makers) {
        expect(plan.steps.find((step) => step.minted > 0)!.firstMinted).toBe(board.firstNewId);
      }
      if (makers.length >= 2) shared += 1;
      driveBots(game, { warn: (message) => warnings.push(message), report });
    }
    expect(shared).toBeGreaterThan(0);
    expect(warnings).toEqual([]);
    expect(misnamed).toEqual([]);
    expect(new Set([...game.state.cities, ...game.state.units].map((thing) => thing.id)).size).toBe(
      game.state.cities.length + game.state.units.length,
    );
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });
});

describe('a paper a person puts to a bot', () => {
  it('is answered in the same turn, by the bot’s plan', () => {
    const game = createGame({
      seed: 20260907,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true },
        { name: 'Bors', color: '#00a' },
      ],
    });
    playerById(game.state, 0)!.gold = 200;
    bumpRevision(game.state);
    const gift = { type: 'proposeDeal', playerId: 0, targetId: 1, give: { gold: 100 }, take: {} } as unknown as Command;
    expect(dispatch(game, gift).ok).toBe(true);
    expect(game.state.dealProposals.length).toBe(1);
    expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    driveBots(game, { warn: () => undefined });
    expect(game.state.turn).toBe(2);
    expect(game.state.dealProposals).toEqual([]);
    expect(game.log.some((command) => command.type === 'acceptDeal' && command.playerId === 1)).toBe(true);
  });
});

describe('a great person another seat called first', () => {
  it('stops the plan before the refusal, and the seat calls another', () => {
    const game = grown(12);
    const { state } = game;
    const free = GREAT_PERSON_IDS.filter((id) => !state.recruited.includes(id));
    // First ask which name seat 1 would call from a hand of two.
    const hand = [free[0]!, free[1]!];
    playerById(state, 1)!.greatPersonOffer = { options: [...hand] };
    bumpRevision(state);
    const probe = planSeat(freezeBoard(state), 1, { warn: () => undefined });
    const call = probe.steps.find((step) => step.command.type === 'chooseGreatPerson');
    expect(call).toBeDefined();
    const wanted = hand[(call!.command as { optionIndex: number }).optionIndex]!;
    // Then seat 0 holds only that name, and moves first.
    playerById(state, 0)!.greatPersonOffer = { options: [wanted] };
    bumpRevision(state);
    const warnings: string[] = [];
    const reports = driveBots(game, { warn: (message) => warnings.push(message) });
    expect(warnings).toEqual([]);
    expect(reports.find((report) => report.playerId === 1)?.cut).toBe('taken');
    // Seat 0 has the name; seat 1 called the other one, from the hand it held.
    const other = hand.find((id) => id !== wanted)!;
    expect(game.state.recruited).toContain(wanted);
    expect(game.state.recruited).toContain(other);
    expect(game.state.units.some((unit) => unit.ownerId === 0 && unit.person === wanted)).toBe(true);
    expect(game.state.units.some((unit) => unit.ownerId === 1 && unit.person === other)).toBe(true);
  });
});

describe('a cut plan', () => {
  it('leaves no piece without orders that the whole plan gave orders', () => {
    // Seat 3 is a person who has not ended, so the turn does not resolve and
    // each seat's blockers can be read after the bot step.
    const base = grown(20);
    playerById(base.state, 3)!.isHuman = true;
    bumpRevision(base.state);
    // The plans the seats after seat 0 make on this board; the target is the
    // first of them that orders a piece, and the piece is the first it orders.
    const board = freezeBoard(structuredClone(base).state);
    const orderedIn = (plan: SeatPlan): number => plan.steps.findIndex((step) => 'unitId' in step.command);
    const plans = [1, 2].map((playerId) => planSeat(board, playerId, { warn: () => undefined }));
    const plan = plans.find((one) => orderedIn(one) >= 0);
    expect(plan).toBeDefined();
    const target = plan!.playerId;
    const ordered = orderedIn(plan!);
    const lost = (plan!.steps[ordered]!.command as { unitId: number }).unitId;

    const idleAfter = (game: Game): string[] =>
      allBlockers(game.state, target)
        .filter((blocker) => blocker.kind === 'idleUnit' || blocker.kind === 'cityProduction')
        .map((blocker) => JSON.stringify(blocker));

    const whole = structuredClone(base);
    const wholeReports = driveBots(whole, { warn: () => undefined });
    expect(wholeReports.find((report) => report.playerId === target)?.cut).toBeNull();

    // The same board, but the piece is gone when seat 1's plan comes to it,
    // as if an earlier seat had killed it: the plan is cut there.
    const cut = structuredClone(base);
    const warnings: string[] = [];
    const cutReports = driveBots(cut, {
      warn: (message) => warnings.push(message),
      attempt: (command) => {
        if (command.type === 'endTurn' && command.playerId === 0) {
          cut.state.units = cut.state.units.filter((unit) => unit.id !== lost);
          bumpRevision(cut.state);
        }
      },
    });
    expect(warnings).toEqual([]);
    const report = cutReports.find((one) => one.playerId === target)!;
    expect(report.cut).toBe('refused');
    expect(report.landed).toBe(ordered);
    expect(report.ended).toBe(true);
    // The live sitting gave its other pieces and towns their orders.
    const missing = idleAfter(cut).filter((blocker) => !idleAfter(whole).includes(blocker));
    expect(missing).toEqual([]);
  });
});

describe('the stepper and the driver', () => {
  it('shows the city id used by the reducer and keeps the reasons from the plan', () => {
    const walked = createGame(FOUR);
    const stepper = createBotStepper(walked);
    stepper.playTurn();
    const start = walked.log.length;
    const playerId = 3;
    const board = freezeBoard(structuredClone(walked.state));
    const plan = planSeat(board, playerId, { warn: () => undefined });
    const planned = plan.steps.find(({ command }) => command.type === 'setCityProduction');
    if (planned?.command.type !== 'setCityProduction' || planned.decision === null) {
      throw new Error('Expected the seat to plan production in its new city');
    }
    expect(planned.decision.candidates.length).toBeGreaterThan(0);

    const steps = stepper.playTurn();
    const sent = walked.log.slice(start).find(
      (command) => command.playerId === playerId && command.type === 'setCityProduction',
    );
    if (sent?.type !== 'setCityProduction') throw new Error('Expected the seat to set production');
    // An earlier seat founded a city and used the id from this seat's copy.
    expect(sent.cityId).not.toBe(planned.command.cityId);
    expect(walked.state.cities.find((city) => city.id === sent.cityId)?.ownerId).toBe(playerId);

    const step = steps.find((step) => step.playerId === playerId && step.decision.kind === 'build');
    expect(step?.result.ok).toBe(true);
    expect(step?.decision).toEqual({ ...planned.decision, command: sent });
  });

  it('play the same short game, and its log replays', () => {
    const driven = createGame(FOUR);
    const walked = createGame(FOUR);
    const warnings: string[] = [];
    const stepper = createBotStepper(walked, { warn: (message) => warnings.push(message) });
    for (let turn = 0; turn < 8; turn++) {
      driveBots(driven, { warn: (message) => warnings.push(message) });
      stepper.playTurn();
    }
    expect(warnings).toEqual([]);
    expect(driven.state.turn).toBe(9);
    expect(JSON.stringify(walked.log)).toBe(JSON.stringify(driven.log));
    expect(snapshotState(walked.state)).toBe(snapshotState(driven.state));
    expect(snapshotState(replay(driven.config, driven.log))).toBe(snapshotState(driven.state));
  });
});


describe('worker seat planning', () => {
  it.each([[0, 1, 2, 3], [3, 2, 1, 0], [2, 0, 3, 1]])(
    'applies replies in seat order when the first reply is seat %i',
    async (...order) => {
      const serial = createGame(FOUR);
      const parallel = createGame(FOUR);
      const expected: Command[] = [];
      const actual: Command[] = [];
      const reports = driveBots(serial, { attempt: (command) => expected.push(command) });
      const workerReports = await driveBotsAsync(parallel, async (board, seats) => {
        expect(seats).toHaveLength(order.length);
        return order.map((index) => {
          const copy = structuredClone(board);
          return structuredClone(planSeat(copy, seats[index]!, {}, true));
        });
      }, { attempt: (command) => actual.push(command) });

      expect(actual).toEqual(expected);
      expect(workerReports).toEqual(reports);
      expect(parallel.log).toEqual(serial.log);
      expect(snapshotState(parallel.state)).toBe(snapshotState(serial.state));
      expect(readHarnessMemory(parallel.state)).toEqual(readHarnessMemory(serial.state));
    },
  );

  it('replans every seat after an incomplete response and reports commands once', async () => {
    const serial = createGame(FOUR);
    const parallel = createGame(FOUR);
    const reports = driveBots(serial);
    const warnings: string[] = [];
    const actual = await driveBotsAsync(parallel, async (board, seats) => {
      return [planSeat(structuredClone(board), seats[0]!, {}, true)];
    }, { warn: (message) => warnings.push(message) });

    expect(warnings).toHaveLength(1);
    expect(actual).toEqual(reports);
    expect(parallel.log).toEqual(serial.log);
    expect(snapshotState(parallel.state)).toBe(snapshotState(serial.state));
    expect(readHarnessMemory(parallel.state)).toEqual(readHarnessMemory(serial.state));
  });
});
