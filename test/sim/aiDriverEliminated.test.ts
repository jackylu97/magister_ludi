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

describe('a seat knocked out earlier in the same pass', () => {
  it('is not driven, and nothing is warned about', () => {
    const game = threeSeats();
    const driven: number[] = [];
    const warnings: string[] = [];
    let knocked = false;
    // The stub: seat 0's first ask knocks seat 1 out, then every seat is content.
    const decide = (state: GameState, playerId: number): Command | null => {
      if (!driven.includes(playerId)) driven.push(playerId);
      if (playerId === 0 && !knocked) {
        knocked = true;
        knockOutSeatOne(state);
      }
      return null;
    };
    const reports = driveBots(game, { decide, warn: (message) => warnings.push(message) });
    expect(game.state.players[1]!.eliminated).toBe(true);
    expect(driven).toEqual([0, 2]);
    expect(reports.map((report) => report.playerId)).toEqual([0, 2]);
    expect(reports.every((report) => report.ended && report.refused === 0)).toBe(true);
    expect(warnings).toEqual([]);
    // Both live seats ended, so the world resolved.
    expect(game.state.turn).toBe(2);
  });

  it('is skipped by the stepper too, so the two loops reach the same board', () => {
    const viaDriver = threeSeats();
    const viaStepper = threeSeats();
    const stub = () => {
      let knocked = false;
      return (state: GameState, playerId: number) => {
        if (playerId === 0 && !knocked) {
          knocked = true;
          knockOutSeatOne(state);
        }
        return null;
      };
    };
    const driverDecide = stub();
    driveBots(viaDriver, { decide: driverDecide });
    const stepperDecide = stub();
    const stepper = createBotStepper(viaStepper, {
      decide: (state, playerId) => {
        stepperDecide(state, playerId);
        return null;
      },
    });
    stepper.playTurn();
    expect(stepper.stalled()).toBe(false);
    expect(snapshotState(viaStepper.state)).toBe(snapshotState(viaDriver.state));
  });
});
