/**
 * The driver skips a seat that an earlier seat knocked out in the same pass.
 *
 * Why this exists: `driveBots` reads the list of seats to drive before the
 * first one moves. A seat's turn can eliminate a seat later in that list (its
 * last town taken, its last unit killed), and elimination marks the fallen
 * seat's turn ended. Driving it anyway sent an End Turn the reducer refused
 * three times and warned about. Batch C3's six-seat duel digest met this on
 * turn 108, where seat 3 falls during an earlier seat's turn and the digest's
 * "no warnings" check failed. The stepper's `nextSeat` already asked the
 * question at each seat's own moment; the driver asks it there too now.
 *
 * Since bot batch BP16, stage C1, every seat plans its turn on its own copy of
 * the frozen board (`frozenBoard.ts`) before any command lands, so a policy
 * that changes the board it is handed changes only its copy. These tests knock
 * a seat out on the real board instead, at the moment a command lands: through
 * the driver's `attempt` hook, and between two of the stepper's steps.
 *
 * The policy is a stub that goes in through the driver's own `decide` option,
 * for the reason `aiDriverRepeat.test.ts` gives.
 */

import { describe, expect, it } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import { createBotStepper } from '../../src/ai/stepper';
import type { Command } from '../../src/sim/commands';
import { updateElimination } from '../../src/sim/combat';
import { snapshotState } from '../../src/sim/game';
import type { GameState } from '../../src/sim/state';
import { createGame } from './newGameHelpers';

/** Three bot seats, no barbarians. */
function threeSeats() {
  return createGame({
    seed: 4243,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#d4502e' },
      { name: 'Teal', color: '#1f8a85' },
      { name: 'Ochre', color: '#c9a227' },
    ],
    barbarians: false,
  });
}

/** Takes away everything seat 1 has, as a lost war would, and lets the sweep mark it out. */
function knockOutSeatOne(state: GameState): void {
  state.units = state.units.filter((unit) => unit.ownerId !== 1);
  state.cities = state.cities.filter((city) => city.ownerId !== 1);
  updateElimination(state);
}

/**
 * Seat 1 puts its first piece to sleep, once on each board it is asked about;
 * every other ask is content.
 */
function seatOneSleepsOnce(): (state: GameState, playerId: number) => Command | null {
  const asked = new WeakSet<GameState>();
  return (state, playerId) => {
    if (playerId !== 1 || asked.has(state)) return null;
    asked.add(state);
    const piece = state.units.find((unit) => unit.ownerId === 1);
    if (piece === undefined) return null;
    return { type: 'sleepUnit', playerId: 1, unitId: piece.id };
  };
}

describe('a seat knocked out earlier in the same pass', () => {
  it('is not driven, and nothing is warned about', () => {
    const game = threeSeats();
    const asked: number[] = [];
    const warnings: string[] = [];
    // Every seat is content; seat 0's End Turn knocks seat 1 out on the real
    // board, as an earlier seat's last blow would.
    const decide = (_state: GameState, playerId: number): Command | null => {
      if (!asked.includes(playerId)) asked.push(playerId);
      return null;
    };
    const reports = driveBots(game, {
      decide,
      warn: (message) => warnings.push(message),
      attempt: (command) => {
        if (command.type === 'endTurn' && command.playerId === 0) knockOutSeatOne(game.state);
      },
    });
    expect(game.state.players[1]!.eliminated).toBe(true);
    // Every seat planned on the frozen board, but seat 1's plan was never put.
    expect(asked).toEqual([0, 1, 2]);
    expect(reports.map((report) => report.playerId)).toEqual([0, 2]);
    expect(reports.every((report) => report.ended && report.refused === 0)).toBe(true);
    expect(warnings).toEqual([]);
    // Both live seats ended, so the world resolved.
    expect(game.state.turn).toBe(2);
  });

  it('ends quietly when it falls during its own turn, in both loops (bot batch BP4)', () => {
    // The six-seat duel digest met this on turn 115 after batch BP4: seat 1's
    // last piece fell in one of its own commands, elimination marked its turn
    // ended, and the driver then sent an End Turn the reducer refused.
    const viaDriver = threeSeats();
    const driverWarnings: string[] = [];
    const reports = driveBots(viaDriver, {
      decide: seatOneSleepsOnce(),
      warn: (message) => driverWarnings.push(message),
      attempt: (command) => {
        if (command.type === 'sleepUnit' && command.playerId === 1) knockOutSeatOne(viaDriver.state);
      },
    });
    expect(viaDriver.state.players[1]!.eliminated).toBe(true);
    expect(reports.map((report) => report.playerId)).toEqual([0, 1, 2]);
    expect(reports.every((report) => report.ended && report.refused === 0)).toBe(true);
    expect(driverWarnings).toEqual([]);
    expect(viaDriver.state.turn).toBe(2);

    const viaStepper = threeSeats();
    const stepperWarnings: string[] = [];
    const policy = seatOneSleepsOnce();
    const stepper = createBotStepper(viaStepper, {
      decide: (state, playerId) => {
        const command = policy(state, playerId);
        return command === null
          ? null
          : { kind: 'unitOrder', command, subject: 'the stub', summary: 'Sleeps.', candidates: [] };
      },
      warn: (message) => stepperWarnings.push(message),
    });
    for (let guard = 0; guard < 20; guard++) {
      const step = stepper.step();
      if (step === null) break;
      if (step.decision.command.type === 'sleepUnit' && step.playerId === 1) knockOutSeatOne(viaStepper.state);
      if (step.turnResolved) break;
    }
    expect(stepperWarnings).toEqual([]);
    expect(stepper.stalled()).toBe(false);
    expect(snapshotState(viaStepper.state)).toBe(snapshotState(viaDriver.state));
  });

  it('is skipped by the stepper too, so the two loops reach the same board', () => {
    const viaDriver = threeSeats();
    const viaStepper = threeSeats();
    driveBots(viaDriver, {
      decide: () => null,
      attempt: (command) => {
        if (command.type === 'endTurn' && command.playerId === 0) knockOutSeatOne(viaDriver.state);
      },
    });
    const stepper = createBotStepper(viaStepper, { decide: () => null });
    for (let guard = 0; guard < 20; guard++) {
      const step = stepper.step();
      if (step === null) break;
      if (step.decision.kind === 'endTurn' && step.playerId === 0) knockOutSeatOne(viaStepper.state);
      if (step.turnResolved) break;
    }
    expect(stepper.stalled()).toBe(false);
    expect(snapshotState(viaStepper.state)).toBe(snapshotState(viaDriver.state));
  });
});
