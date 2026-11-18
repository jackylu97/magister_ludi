/**
 * **The beeline's table, kept for a sitting while the seat's research stands
 * still** (bot batch BP15, stage 2; `techGoalTable`, `src/ai/bot.ts`).
 *
 * The re-aim arm (`reaimBeeline`) asks the table on almost every decision of a
 * sitting, and it priced every node in the horizon each time. Between two asks
 * the seat has usually sent a command that moves the economy clock, so the
 * table is kept on the research it is about instead: the techs known, the
 * plan, the pool and the cards held. This changes play a little: a later ask in
 * the sitting reads the towns as they stood at the first ask.
 *
 *   - by case: an ask after a command that leaves the research alone gets the
 *     kept table; an ask after a research order reads a fresh one;
 *   - over a short game of real bot commands: no command is refused, and the
 *     kept table is never handed to more asks than there were. Since bot batch
 *     BP16's phases a sitting asks the table about once, so it is seldom kept.
 */

import { describe, expect, it } from 'vitest';

import { bestTechGoal, botSitting } from '../../src/ai/bot';
import { decisionMemoTally } from '../../src/ai/decisionMemo';
import { driveBots } from '../../src/ai/driver';
import { applyCommand } from '../../src/sim/commands';
import { economyStamp } from '../../src/sim/slate';
import { playerById } from '../../src/sim/state';
import { availableTechs } from '../../src/sim/tech';
import { createGame } from './newGameHelpers';

const SEATS = [
  { name: 'Ada', color: '#a00' },
  { name: 'Bors', color: '#00a' },
  { name: 'Cato', color: '#0a0', persona: 'warmonger' },
  { name: 'Dido', color: '#aa0', persona: 'tall' },
];

function game(seed: number) {
  return createGame({ seed, sizeName: 'duel', players: SEATS as never, barbarians: true });
}

describe('the beeline table kept for a sitting (bot batch BP15)', () => {
  it('is kept across a command that leaves the research alone, and read afresh after a research order', () => {
    const played = game(5);
    while (played.state.turn < 14) driveBots(played, { warn: () => {} });
    const state = played.state;
    const player = playerById(state, 0)!;
    const sitting = botSitting(0);
    bestTechGoal(state, player, sitting);
    const first = sitting.beeline!.table;
    // An economy command that is not about research: a town's focus. The clock
    // moves, and the table is kept.
    const town = state.cities.find((city) => city.ownerId === 0)!;
    const focus = town.focus === 'production' ? 'food' : 'production';
    const before = economyStamp(state);
    expect(applyCommand(state, { type: 'setCitizenFocus', playerId: 0, cityId: town.id, focus }).ok).toBe(true);
    expect(economyStamp(state)).toBeGreaterThan(before);
    bestTechGoal(state, player, sitting);
    expect(sitting.beeline!.table).toBe(first);
    // A research order changes what the table is about, so it is read afresh.
    const open = availableTechs(state, 0).filter((id) => id !== player.researching);
    expect(open.length).toBeGreaterThan(0);
    expect(applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: open[0]!, queue: 'replace' }).ok).toBe(true);
    bestTechGoal(state, player, sitting);
    expect(sitting.beeline!.table).not.toBe(first);
  });

  it('keeps tables over a short game, and no command is refused', () => {
    const played = game(7);
    while (played.state.turn < 24 && played.state.winnerId === null) driveBots(played, { warn: () => {} });
    const asked = decisionMemoTally.tableAsked;
    const kept = decisionMemoTally.tableKept;
    let warnings = 0;
    while (played.state.turn < 32 && played.state.winnerId === null) {
      driveBots(played, {
        warn: () => {
          warnings += 1;
        },
      });
    }
    expect(warnings).toBe(0);
    // Since bot batch BP16's phases the research phase is asked until it has
    // nothing more to do and is then closed, so a sitting asks the table about
    // once and the kept table is seldom needed. It is still read, and a kept
    // table is never handed to more asks than there were.
    expect(decisionMemoTally.tableAsked - asked).toBeGreaterThan(0);
    expect(decisionMemoTally.tableKept - kept).toBeLessThanOrEqual(decisionMemoTally.tableAsked - asked);
  }, 180_000);
});
