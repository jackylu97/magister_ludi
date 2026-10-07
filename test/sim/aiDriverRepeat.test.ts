/**
 * The driver and the stepper never send an accepted unit order again, in the
 * same seat's turn, to a piece that has not changed since.
 *
 * Why this exists: the reducer accepts a march that cannot take its first step
 * as a standing order (CLAUDE.md, "a move ordered at zero movement is accepted
 * as orders"), and nothing about the state changes. A bot arm that kept naming
 * such an order used to be asked again and again until the seat's command
 * budget ran out, about 390 identical `moveUnit`s in one turn (the browser
 * performance audit of 2026-10-06, finding 1). The arm that did it is fixed in
 * `bot.ts` (`wakeTheCampaign`); this file pins the loops' own guard, so the
 * next arm with the same fault costs one warning instead of a turn.
 *
 * The policy is replaced with a stub that always asks for the same march. That
 * is the fault exactly, with nothing else in the way, and it is why this file
 * is separate: `vi.mock` replaces the module for the whole file.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BotDecision } from '../../src/ai/decision';
import type { Command, MoveUnitCommand } from '../../src/sim/commands';

const stub = vi.hoisted(() => ({
  command: null as Command | null,
  asks: 0,
  /** Called on every ask before the stub answers; lets a test change the piece. */
  onAsk: null as ((asks: number) => void) | null,
}));

vi.mock('../../src/ai/bot', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/bot')>();
  const decide = (): BotDecision | null => {
    stub.asks += 1;
    stub.onAsk?.(stub.asks);
    if (stub.command === null) return null;
    return {
      kind: 'unitOrder',
      command: stub.command,
      subject: 'the stub',
      summary: 'Always asks for the same march.',
      candidates: [],
    };
  };
  return {
    ...actual,
    nextBotDecision: decide,
    nextBotCommand: () => decide()?.command ?? null,
  };
});

const { driveSeat } = await import('../../src/ai/driver');
const { createBotStepper } = await import('../../src/ai/stepper');
const { applyCommand } = await import('../../src/sim/commands');
const { createGame, restoreState, snapshotState } = await import('../../src/sim/game');
const { getTileAt, mapRange, tileHex } = await import('../../src/sim/map');

type Game = ReturnType<typeof createGame>;

/**
 * A two-seat game where seat 0's first piece has no movement left, and a march
 * for it that the reducer accepts without moving anything: the exact shape of
 * the audit's loop.
 */
function stuckMarch(): { game: Game; command: MoveUnitCommand } {
  const game = createGame({
    seed: 4242,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#d4502e' },
      { name: 'Teal', color: '#1f8a85' },
    ],
    barbarians: false,
  });
  const unit = game.state.units.find((piece) => piece.ownerId === 0)!;
  unit.movesLeft = 0;
  const here = getTileAt(game.state.map, unit.col, unit.row)!;
  for (const tile of mapRange(game.state.map, tileHex(here), 3)) {
    if (tile.col === unit.col && tile.row === unit.row) continue;
    const command: MoveUnitCommand = {
      type: 'moveUnit',
      playerId: 0,
      unitId: unit.id,
      target: { col: tile.col, row: tile.row },
    };
    // Try it on a copy, so the game itself is untouched until the loop runs.
    const trial = restoreState(snapshotState(game.state));
    if (applyCommand(trial, command).ok) return { game, command };
  }
  throw new Error('no accepted march within three hexes of the first piece');
}

beforeEach(() => {
  stub.command = null;
  stub.asks = 0;
  stub.onAsk = null;
});

describe('an accepted unit order is not sent again to an unchanged piece', () => {
  it('is accepted by the reducer and changes nothing the second time (the fault itself)', () => {
    const { game, command } = stuckMarch();
    expect(applyCommand(game.state, command).ok).toBe(true);
    const unit = game.state.units.find((piece) => piece.id === command.unitId)!;
    const before = JSON.stringify(unit);
    expect(applyCommand(game.state, command).ok).toBe(true);
    expect(JSON.stringify(unit)).toBe(before);
  });

  it('driveSeat sends it once, warns, and stops asking', () => {
    const { game, command } = stuckMarch();
    stub.command = command;
    const warnings: string[] = [];
    const report = driveSeat(game, 0, { warn: (message) => warnings.push(message) });
    const sent = game.log.filter((entry) => JSON.stringify(entry) === JSON.stringify(command));
    expect(sent.length).toBe(1);
    expect(report.repeated).toBeGreaterThanOrEqual(1);
    expect(report.refused).toBe(0);
    expect(warnings.some((message) => message.includes('asked again for the same moveUnit'))).toBe(true);
    // Before the guard, the seat was asked until `driver.commandsPerSeat` (400).
    expect(stub.asks).toBeLessThan(10);
  });

  it('the stepper does the same, one decision at a time', () => {
    const { game, command } = stuckMarch();
    stub.command = command;
    const warnings: string[] = [];
    const stepper = createBotStepper(game, { warn: (message) => warnings.push(message) });
    const sent: Command[] = [];
    for (let guard = 0; guard < 20; guard++) {
      const step = stepper.step();
      if (step === null || step.playerId !== 0) break;
      if (step.decision.command.type === 'moveUnit') sent.push(step.decision.command);
      if (step.decision.kind === 'endTurn' && stepper.stalled()) break;
    }
    expect(sent.length).toBe(1);
    expect(warnings.some((message) => message.includes('asked again for the same moveUnit'))).toBe(true);
    expect(stub.asks).toBeLessThan(10);
  });

  it('sends the same order again once the piece has changed', () => {
    // A worker pushed off its route, or a soldier whose march was cut short,
    // may be sent to the same hex again: that is a new decision about a piece
    // in a new place. Here the piece is hurt between the first and second asks.
    const { game, command } = stuckMarch();
    stub.command = command;
    stub.onAsk = (asks) => {
      if (asks !== 2) return;
      const unit = game.state.units.find((piece) => piece.id === command.unitId)!;
      unit.hp -= 1;
    };
    const report = driveSeat(game, 0, { warn: () => undefined });
    const sent = game.log.filter((entry) => JSON.stringify(entry) === JSON.stringify(command));
    expect(sent.length).toBe(2);
    expect(report.repeated).toBeGreaterThanOrEqual(1);
  });

  it('does not hold commands that are not orders to a piece to the rule', async () => {
    // Two belief drafts in one turn are both answered with option nought, and
    // both are real decisions; only an order to a piece is held to "once".
    const { sentToAPiece } = await import('../../src/ai/driver');
    expect(sentToAPiece({ type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command)).toBe(false);
    expect(sentToAPiece({ type: 'endTurn', playerId: 0 })).toBe(false);
    expect(
      sentToAPiece({ type: 'moveUnit', playerId: 0, unitId: 1, target: { col: 0, row: 0 } }),
    ).toBe(true);
    expect(sentToAPiece({ type: 'foundCity', playerId: 0, settlerUnitId: 1 } as Command)).toBe(true);
  });
});
