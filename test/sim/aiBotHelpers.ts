/**
 * The pieces every long bot game in the slow tier is built out of.
 *
 * This is a **non-test module** on purpose (CLAUDE.md's tier rule): importing a
 * `.test.ts` file re-registers its tests, and the whole point of the split these
 * helpers were lifted out of is that each long game gets a file — and therefore
 * a worker — of its own. The arena used to sit in one file with four other
 * games, and a file is the unit Vitest hands to a fork: five independent games
 * behind one filename is five games played one after another on one core.
 *
 * What a long bot game is *for* is written down here once, because the answer
 * shapes every horizon in the files that import this:
 *
 *   · **not a measurement of the game.** The bot is not a baseline (the user,
 *     2026-09-09: "we shouldn't be using the bot to measure anything, it isn't a
 *     good baseline"), so nothing here asserts that a board reaches a town
 *     count, a bead count or a verdict by a turn. Those claims were axed —
 *     `docs/audit/test-suite-speed.md` lists them one by one;
 *   · **a bot regression a short game cannot reach.** Historically two: the
 *     bankruptcy of design ledger Entry LIX (worst net gold −125 a turn, worst
 *     treasury −1,642), and a driver, stepper or replay divergence that only
 *     appears once an empire is big enough for the decision to be interesting.
 *
 * Every horizon in the importing files is the shortest one at which its own
 * claim still bites, measured rather than guessed, and each says so where it is.
 */

import { driveBots } from '../../src/ai/driver';
import { type Game, createGame } from '../../src/sim/game';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { type GameConfig, realPlayers } from '../../src/sim/state';

/**
 * A standard map, two bot seats, the wild in the fog.
 *
 * The seed is chosen rather than arbitrary: it opens both empires on ground that
 * has room for more than one town, so a claim read off this board is a claim
 * about the *bot* rather than about the map it was dropped on.
 */
export const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'standard',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/** Long enough to be a real game; the timeout is the machine's, not the test's. */
export const PATIENCE = 300_000;

/**
 * One turn's reading of one seat: the two numbers that told the story of Entry
 * LIX's collapse, plus what the seat has to show for itself.
 *
 * The last three fields are kept for the failure *message* rather than for an
 * assertion — a solvency failure that names the turn, the treasury and the size
 * of the empire behind it is a diagnosis; the same failure as a bare `false` is
 * a bisect.
 */
export interface Reading {
  turn: number;
  playerId: number;
  gold: number;
  netGold: number;
  cities: number;
  beads: number;
  techs: number;
}

export interface Played {
  game: Game;
  warnings: string[];
  stalls: number;
  /** Every seat, every turn. */
  curve: Reading[];
  /** The turn the game was decided on, or `null` if it ran to the end. */
  decidedAt: number | null;
}

/** Drives every bot seat for `turns` turns, recording a reading a seat a turn. */
export function playOut(turns: number, config: GameConfig = CONFIG): Played {
  const game = createGame(config);
  const warnings: string[] = [];
  const curve: Reading[] = [];
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
    for (const player of realPlayers(game.state)) {
      curve.push({
        turn: game.state.turn,
        playerId: player.id,
        gold: player.gold,
        netGold: foldEmpireRates(game.state, player.id).goldPerTurn ?? 0,
        cities: game.state.cities.filter((city) => city.ownerId === player.id).length,
        beads: player.beads.length,
        techs: player.techsResearched.length,
      });
    }
    if (game.state.winnerId !== null) break;
  }
  const decidedAt = game.state.winnerId !== null ? game.state.turn : null;
  return { game, warnings, stalls, curve, decidedAt };
}

/** Every reading at or after a turn — the window a solvency claim is made in. */
export function after(played: Played, turn: number): Reading[] {
  return played.curve.filter((reading) => reading.turn >= turn);
}

/** The worst reading of each seat in a window, for a failure message. */
export function worstGold(played: Played, from: number): Reading[] {
  const worst = new Map<number, Reading>();
  for (const reading of after(played, from)) {
    const held = worst.get(reading.playerId);
    if (held === undefined || reading.gold < held.gold) worst.set(reading.playerId, reading);
  }
  return [...worst.values()].sort((a, b) => a.playerId - b.playerId);
}
