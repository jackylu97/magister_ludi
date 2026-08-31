/**
 * A whole game, played by nobody.
 *
 * The core file pins the bot's contract on ten turns of a duel map; this is the
 * long half, and it is slow *by kind* rather than by clock (CLAUDE.md's tier
 * rule): a hundred-and-twenty-turn simulation on a full-sized map, and a
 * byte-for-byte replay of the log it produced. Both shapes belong in the slow
 * tier even when they happen to be quick.
 *
 * What it is actually for is the class of bug ten turns cannot reach: a
 * validator that only disagrees with the bot once an empire has five towns, a
 * settler that oscillates between two sites, a seat that stops being able to end
 * its turn the first time a Doctrine is offered. Every one of those shows up
 * here as a refusal, a stall, or a replay that does not match.
 *
 * **The long game is played once and shared.** Nearly all of the wall clock is
 * the *simulation's* end of turn at sixteen cities and a hundred pieces — the
 * bot's own deliberation is a rounding error against it (measured: under a
 * fiftieth) — so playing it per assertion would be paying the same long bill for
 * the same board four times over.
 */

import { describe, expect, it } from 'vitest';

import { AI } from '../../src/ai/bot';
import { driveBots } from '../../src/ai/driver';
import { type Game, createGame, replay, snapshotState } from '../../src/sim/game';
import { type GameConfig, realPlayers } from '../../src/sim/state';

const TURNS = 120;

/** Long enough to be a real game; the timeout is the machine's, not the test's. */
const PATIENCE = 120_000;

/**
 * A standard map, two bot seats, the wild in the fog.
 *
 * The seed is chosen rather than arbitrary: it opens both empires on ground that
 * has room for more than one town, which is what makes "founded at least two
 * cities" a claim about the *bot* rather than about the map it was dropped on.
 */
const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'standard',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

interface Played {
  game: Game;
  warnings: string[];
  stalls: number;
}

function playOut(turns: number, config: GameConfig = CONFIG): Played {
  const game = createGame(config);
  const warnings: string[] = [];
  let stalls = 0;
  for (let turn = 0; turn < turns; turn++) {
    for (const report of driveBots(game, { warn: (message) => warnings.push(message) })) {
      if (report.refused > 0) {
        warnings.push(
          `seat ${report.playerId} had ${report.refused} refusals on turn ${game.state.turn}`,
        );
      }
      if (!report.ended) stalls += 1;
    }
  }
  return { game, warnings, stalls };
}

/** The one long game, played on first ask. */
let longGame: Played | null = null;
function theLongGame(): Played {
  longGame ??= playOut(TURNS);
  return longGame;
}

describe('a hundred and twenty turns of bots', () => {
  it(
    'plays them out with nothing refused and nothing stalled',
    () => {
      const played = theLongGame();
      expect(played.warnings).toEqual([]);
      expect(played.stalls).toBe(0);
      expect(played.game.state.turn).toBe(TURNS + 1);
    },
    PATIENCE,
  );

  it(
    'leaves both empires with something to show for it',
    () => {
      const played = theLongGame();
      for (const player of realPlayers(played.game.state)) {
        const towns = played.game.state.cities.filter((city) => city.ownerId === player.id);
        // Two towns is the bar for "the expansion branch works at all": one is
        // the capital every empire opens with, so the second is the first thing
        // the bot did on its own. Written as an object so a failure names the
        // seat and the count rather than saying `false !== true`.
        expect({ seat: player.name, towns: towns.length >= 2 }).toEqual({
          seat: player.name,
          towns: true,
        });
        expect({ seat: player.name, techs: player.techsResearched.length >= 6 }).toEqual({
          seat: player.name,
          techs: true,
        });
      }
    },
    PATIENCE,
  );

  it(
    'opens both banks rather than hoarding them',
    () => {
      const played = theLongGame();
      const bought = played.game.log.filter((command) => command.type === 'purchaseItem');
      const banks = new Set(bought.map((command) => command.currency));
      // Both sinks ran. Gold buys the building order and a garrison; faith buys
      // the augur, whose whole existence *is* the faith sink.
      expect([...banks].sort()).toEqual(['faith', 'gold']);
      // And the augur was used rather than parked — a bought piece that sleeps
      // for a hundred turns is faith that bought nothing.
      const spoke = played.game.log.some(
        (command) => command.type === 'performRite' || command.type === 'consecrate',
      );
      expect(spoke).toBe(true);

      // The treasury never runs away. A bot with no sink ends a game like this
      // one nearer four figures; the bar is a loose multiple of the threshold on
      // purpose, because what is being asserted is "something spends it", not a
      // balance the tuning is allowed to move.
      const ceiling = 4 * (AI.spending.goldSpendAbove + AI.spending.goldReserve);
      for (const player of realPlayers(played.game.state)) {
        expect({ seat: player.name, rich: player.gold < ceiling }).toEqual({
          seat: player.name,
          rich: true,
        });
      }
    },
    PATIENCE,
  );

  it(
    'writes a log that replays byte for byte',
    () => {
      const played = theLongGame();
      const rebuilt = replay(played.game.config, played.game.log);
      expect(snapshotState(rebuilt)).toBe(snapshotState(played.game.state));
    },
    PATIENCE,
  );

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
