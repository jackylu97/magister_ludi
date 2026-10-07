/**
 * **The driver and the stepper on a board nobody arranged** — two claims, two
 * games, and a file of their own.
 *
 * Both used to sit inside `aiBot.slow.test.ts` behind four other games. A file
 * is the unit Vitest hands to a fork, so five independent games behind one
 * filename is five games played one after another on one core; each of them is
 * now a file (see that file's docblock for the whole split). Nothing about
 * either claim changed in the move.
 *
 * The core coverage for both lives in `aiBot.test.ts` — the ten-turn purity pin
 * and the arranged-board re-ask tests of batch X7. What only a played game can
 * say is here, and both are **bot-regression** claims rather than measurements:
 * the re-ask arm fires on boards nobody arranged and never doubles up, and the
 * policy is still a pure function of the state at sixty turns.
 *
 * A third claim was added on 2026-10-06: no seat sends the same unit order
 * again to a piece the previous copy left unchanged. Its core coverage, with a
 * stubbed policy, is `aiDriverRepeat.test.ts`; the game here is one that
 * looped before the fix.
 */

import { describe, expect, it } from 'vitest';

import { driveBots, sentToAPiece } from '../../src/ai/driver';
import { createBotStepper } from '../../src/ai/stepper';
import { createGame, snapshotState } from '../../src/sim/game';
import { rosterFor } from '../../src/ui/gameSetup';
import { aiConfigFor } from '../../src/ai/aiConfig';
import type { Command } from '../../src/sim/commands';
import { CONFIG, PATIENCE, playOut } from './aiBotHelpers';

describe('the march is re-asked on a played board (X7)', () => {
  it(
    're-asks a standing march, and never twice about one piece in one turn',
    () => {
      // The bound, read off a **played** game rather than off an arranged one:
      // the core file pins that a re-ask happens and that it is silent on a board
      // that has not moved, and what only a long game can say is that the arm
      // fires on boards nobody arranged and that the ask never doubles up.
      //
      // The stepper rather than `driveBots` because the claim is about
      // *decisions* — a re-issue is an ordinary `moveUnit` in the log and the
      // only thing that marks it as this arm's is the sentence it carries.
      const game = createGame(CONFIG);
      const stepper = createBotStepper(game, { warn: () => undefined });
      const asked = new Map<string, number>();
      let reissues = 0;
      let commands = 0;
      let seatTurns = 0;
      for (let turn = 0; turn < 60; turn++) {
        for (const step of stepper.playTurn()) {
          if (step.decision.kind === 'endTurn') {
            seatTurns += 1;
            continue;
          }
          commands += 1;
          if (!step.decision.summary.startsWith('Re-asks a piece already under orders')) continue;
          reissues += 1;
          // A settler's answer is `foundCity`, whose piece is `settlerUnitId`; every
          // other re-asked order names its `unitId`. Two settlers re-asked in one
          // seat-turn used to share the key "undefined" and read as one piece
          // asked twice (2026-09-09, the X1d landing).
          const order = step.decision.command as { unitId?: number; settlerUnitId?: number };
          const unitId = order.unitId ?? order.settlerUnitId;
          const key = `${step.turn}/${step.playerId}/${String(unitId)}`;
          asked.set(key, (asked.get(key) ?? 0) + 1);
        }
      }
      // It fires: a sixty-turn game on a full map moves under its own columns.
      expect(reissues).toBeGreaterThan(0);
      // And never twice about one piece in one seat's turn — the sheet's bound,
      // asked of the commands rather than of the counter that enforces it.
      const budget = aiConfigFor(undefined, 0).driver.reaskPerTurn;
      const worst = [...asked.entries()].sort((a, b) => b[1] - a[1])[0]!;
      expect({ where: worst[0], asks: worst[1] <= budget }).toEqual({
        where: worst[0],
        asks: true,
      });
      // The command count does not run away with the empire: the arm can add at
      // most one order per marching piece per turn, and a seat marching that many
      // pieces would be a seat with nothing else to spend a turn on.
      expect(commands / seatTurns).toBeLessThan(20);
    },
    PATIENCE,
  );
});

describe('the driver is a pure function of the state', () => {
  it(
    'plays the same game twice',
    () => {
      // Shorter on purpose: determinism is a property of every decision, so a
      // divergence fails on the first one. Sixty turns is already hundreds of
      // commands, at a fraction of the long game's cost.
      const first = playOut(60);
      const second = playOut(60);
      expect(JSON.stringify(second.game.log)).toBe(JSON.stringify(first.game.log));
      expect(snapshotState(second.game.state)).toBe(snapshotState(first.game.state));
    },
    PATIENCE,
  );
});

/** Past the turn this game first looped on before the fix. */
const TURNS_TO_LOOP = 60;

describe('no seat sends the same unit order twice to an unchanged piece', () => {
  it(
    'plays the six-seat game that used to loop, with no repeated order and no guard firing',
    () => {
      // Seed 3, six bot seats on the standard board, the landing screen's own
      // roster. Before the fix a seat in a game like this one sent one
      // `moveUnit` hundreds of times in a turn: a dug-in warrior jammed behind a
      // friend, called back by `wakeTheCampaign` with the march it already held
      // (browser performance audit, 2026-10-06, finding 1). Two readings,
      // because they fail for different reasons. The log is asked whether an
      // identical order to a piece went out again in one seat's turn and left
      // the piece exactly as the copy before it had (the driver's guard). The
      // driver's report is asked whether the guard ever had to stop a seat (an
      // arm of the policy asking again).
      const players = rosterFor(6).map((spec) => ({ ...spec, isHuman: false }));
      const game = createGame({ seed: 3, sizeName: 'standard', players, barbarians: true });
      const pieceOf = (command: Command): string => {
        const id = 'unitId' in command ? command.unitId : (command as { settlerUnitId: number }).settlerUnitId;
        return JSON.stringify(game.state.units.find((unit) => unit.id === id) ?? null);
      };
      const idle: string[] = [];
      let repeated = 0;
      while (game.state.turn <= TURNS_TO_LOOP && game.state.winnerId === null) {
        const turn = game.state.turn;
        const after = new Map<string, string>();
        const reports = driveBots(game, {
          warn: () => undefined,
          report: (command) => {
            if (!sentToAPiece(command)) return;
            const key = `${command.playerId}|${JSON.stringify(command)}`;
            const piece = pieceOf(command);
            if (after.get(key) === piece) idle.push(`turn ${turn}: ${key}`);
            after.set(key, piece);
          },
        });
        for (const report of reports) repeated += report.repeated;
        if (game.state.turn === turn) break;
      }
      expect(game.state.turn).toBeGreaterThan(TURNS_TO_LOOP);
      expect(idle.slice(0, 5)).toEqual([]);
      expect(repeated).toBe(0);
    },
    PATIENCE,
  );
});
