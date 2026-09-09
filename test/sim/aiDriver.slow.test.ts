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
 */

import { describe, expect, it } from 'vitest';

import { createBotStepper } from '../../src/ai/stepper';
import { createGame, snapshotState } from '../../src/sim/game';
import { aiConfigFor } from '../../src/ai/aiConfig';
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
          const unitId = (step.decision.command as { unitId?: number }).unitId;
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
