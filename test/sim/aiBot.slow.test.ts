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
import { empireRateReading } from '../../src/sim/cities';
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

/**
 * One turn's reading of one seat, as the arena measures it (design ledger Entry
 * LIX): the two numbers that told the story of the collapse, plus what the seat
 * has to show for itself.
 */
interface Reading {
  turn: number;
  playerId: number;
  gold: number;
  netGold: number;
  cities: number;
  beads: number;
  techs: number;
}

interface Played {
  game: Game;
  warnings: string[];
  stalls: number;
  /** Every seat, every turn — the curves the arena is for. */
  curve: Reading[];
  /** The turn the game was decided on, or `null` if it ran to the end. */
  decidedAt: number | null;
}

function playOut(turns: number, config: GameConfig = CONFIG): Played {
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
        netGold: empireRateReading(game.state, player.id).goldPerTurn ?? 0,
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

/** Every reading at or after a turn. The arena's window. */
function after(played: Played, turn: number): Reading[] {
  return played.curve.filter((reading) => reading.turn >= turn);
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
      // A decided game stops early on purpose — the loop breaks on a winner
      // rather than driving seats through a finished world.
      if (played.decidedAt === null) expect(played.game.state.turn).toBe(TURNS + 1);
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


/**
 * **The arena**, at the shape Entry LIX measured and at the length that showed
 * the collapse.
 *
 * Entry LIX's finding 1, in full: *"by t160 both seats run negative gold (worst
 * −125/turn, treasury −1,642) — late upkeep outruns supply and the arrears sweep
 * does not right it."* That is the bug this whole tier-1 pass was pointed at,
 * and this is the instrument that says whether it is gone. Two hundred turns
 * rather than a hundred and twenty because the collapse only bites in the last
 * third — a game that stops at t120 stops before the interesting part.
 *
 * Three claims, and they are three different failures:
 *
 *   · **solvency** — after t60 no seat's treasury goes below a small bound. A
 *     seat may dip (a wonder bought, a war levied) and must not *live* there;
 *   · **a decided game or a live race** — the whole point of fixing the economy
 *     is that the endgame still happens. A bot that stayed solvent by building
 *     nothing would pass the first claim and fail this one;
 *   · **replay** — the log still reproduces the board byte for byte, which is
 *     the contract every other decision in this file is written to keep. A
 *     scored decision is only safe while it is a pure function of the state.
 *
 * The curves are printed on failure rather than asserted line by line: what a
 * seat's gold looked like at t83 and t160 is the *diagnosis*, and pinning it
 * would be pinning the tuning rather than the property.
 *
 * **Measured 2026-09-03, before and after the brain-v1 pass** (personas, the
 * improvement plan, wonder patience, the gold-pressure grace, great people that
 * act, and a citizen priced off the next tile). Same seed, same map, same two
 * balanced seats:
 *
 *              before                                after
 *   t83   s0   276💰 (+5/t)  3 towns 19 tech  5 beads  272💰 (−3/t)  4 towns 13 tech  1 bead
 *         s1   347💰 (+8/t)  6 towns 17 tech  0 beads  263💰 (+12/t) 3 towns 14 tech  2 beads
 *   t160  s0   316💰 (−5/t)  6 towns 35 tech  9 beads  734💰 (+216/t) 8 towns 32 tech  4 beads
 *         s1   277💰 (+8/t)  7 towns 34 tech  5 beads  490💰 (+13/t) 8 towns 35 tech 15 beads
 *   t200  s0   266💰 (−9/t)  6 towns 44 tech  9 beads  — decided at t182
 *         s1   579💰 (−25/t) 9 towns 45 tech  5 beads
 *   net gold after t60:  worst −25/t, best +17/t   →   worst −7/t, best +242/t
 *   outcome:             undecided at t200          →   **won at t182**
 *
 * The headline is the last line: two hundred turns used to end with nobody
 * having closed the Great Work, and now a seat wins with eighteen turns to
 * spare. The rest reads as one story — patience gets the capstones started
 * (fifteen beads against five), the plan and the citizen get the towns founded
 * and improved (eight apiece against six and seven), and the grace stops the
 * opening being appraised by a bankrupt (the treasury and the rate at t160 are
 * a different empire's).
 *
 * The one cost, and it is a real one to watch: **the early tree is slower** —
 * thirteen and fourteen technologies at t83 against nineteen and seventeen.
 * A worker is worth what the ground is worth now, so the first thirty turns buy
 * more spades and fewer libraries; by t160 the two curves have converged (32/35
 * against 35/34). If that opening ever costs a game it is `workers.planTopN` and
 * `workers.planFalloff` that are too generous, and both are one edit away.
 */
const ARENA_TURNS = 200;
const ARENA_PATIENCE = 300_000;

let arenaGame: Played | null = null;
function theArena(): Played {
  arenaGame ??= playOut(ARENA_TURNS);
  return arenaGame;
}

/** The worst reading of each seat in a window, for a failure message. */
function worstGold(played: Played, from: number): Reading[] {
  const worst = new Map<number, Reading>();
  for (const reading of after(played, from)) {
    const held = worst.get(reading.playerId);
    if (held === undefined || reading.gold < held.gold) worst.set(reading.playerId, reading);
  }
  return [...worst.values()].sort((a, b) => a.playerId - b.playerId);
}

describe('the arena: two hundred turns, two bots, one economy', () => {
  it(
    'keeps every seat solvent after the opening',
    () => {
      const played = theArena();
      expect(played.warnings).toEqual([]);
      // The bound is small and deliberately not zero: a seat that spends down to
      // buy a wonder on one turn has not collapsed, and the arrears rule itself
      // needs a little room below zero to fire in. What Entry LIX found was
      // −1,642, which is three orders of magnitude the other side of this.
      const floor = -50;
      const offenders = after(played, 60).filter((reading) => reading.gold < floor);
      expect(
        offenders.slice(0, 5).map((reading) => `t${reading.turn} seat ${reading.playerId}: ${reading.gold}💰`),
      ).toEqual([]);
    },
    ARENA_PATIENCE,
  );

  it(
    'does not let net income live in the red',
    () => {
      // The other half of the same finding, and the one that actually predicts a
      // collapse: a treasury can look fine on the turn a caravan arrives. What
      // must not happen is a *sustained* negative rate — so this asks how many of
      // the late readings are bleeding rather than whether any single one is.
      const played = theArena();
      const late = after(played, 60);
      // Entry LIX measured the worst rate at **−125💰 a turn**. That is the
      // number this claim is about, and the floor is set an order of magnitude
      // the right side of it: a seat may run a small deficit for a stretch (a
      // war levy, a wonder's decade) and must never run one that compounds.
      const floor = -30;
      const worst = late.filter((reading) => reading.netGold < floor);
      expect(
        worst
          .slice(0, 5)
          .map((reading) => `t${reading.turn} seat ${reading.playerId}: ${reading.netGold}💰/t`),
      ).toEqual([]);
      expect(late.length).toBeGreaterThan(0);
    },
    ARENA_PATIENCE,
  );

  it(
    'still reaches a decided game or a live race',
    () => {
      // **Solvency must not have cost the endgame.** A bot that stopped building
      // would keep a healthy treasury forever and never clack a bead; the race
      // has to still be on. Either somebody won, or both seats are holding beads
      // and are visibly in it.
      const played = theArena();
      const decided = played.game.state.winnerId !== null;
      const beads = realPlayers(played.game.state).map((player) => player.beads.length);
      const racing = beads.every((count) => count >= 1);
      expect({ decided: decided || racing, beads }).toEqual({ decided: true, beads });
    },
    ARENA_PATIENCE,
  );

  it(
    'both empires reach a pantheon, and somebody founds a faith',
    () => {
      // **Design addendum 5**, asserted at the only scale that can answer it. A
      // band rather than a turn: what is being pinned is that the appetite works
      // at all, not the tuning that decides exactly when.
      const played = theArena();
      const gods = realPlayers(played.game.state).map((player) => ({
        seat: player.name,
        held: player.pantheon.beliefs.length > 0,
      }));
      expect(gods).toEqual(gods.map((entry) => ({ seat: entry.seat, held: true })));
      expect(played.game.state.religions.length).toBeGreaterThan(0);
    },
    ARENA_PATIENCE,
  );

  it(
    'writes a log that replays byte for byte',
    () => {
      const played = theArena();
      const rebuilt = replay(played.game.config, played.game.log);
      expect(snapshotState(rebuilt)).toBe(snapshotState(played.game.state));
    },
    ARENA_PATIENCE,
  );

  it(
    'reports the curves the arena is for',
    () => {
      // Not an assertion about balance — a **measurement**, printed so a tuning
      // pass has the numbers Entry LIX quoted without re-running anything. The
      // two turns named are the two the design ledger names: t83 is the human
      // baseline's checkpoint, t160 is where the collapse was found.
      const played = theArena();
      const sample = (turn: number): string =>
        played.curve
          .filter((reading) => reading.turn === turn)
          .map(
            (reading) =>
              `seat ${reading.playerId}: ${reading.gold}💰 (${reading.netGold >= 0 ? '+' : ''}${reading.netGold}/t) · ` +
              `${reading.cities} cities · ${reading.techs} techs · ${reading.beads} beads`,
          )
          .join(' | ');
      // eslint-disable-next-line no-console
      console.log(`[arena] t83   ${sample(83)}`);
      // eslint-disable-next-line no-console
      console.log(`[arena] t160  ${sample(160)}`);
      // eslint-disable-next-line no-console
      console.log(`[arena] t${ARENA_TURNS}  ${sample(ARENA_TURNS)}`);
      // eslint-disable-next-line no-console
      console.log(
        `[arena] worst gold after t60: ${worstGold(played, 60)
          .map((reading) => `seat ${reading.playerId} ${reading.gold}💰 at t${reading.turn}`)
          .join(' | ')}`,
      );
      const rates = after(played, 60).map((reading) => reading.netGold);
      // eslint-disable-next-line no-console
      console.log(
        `[arena] net gold after t60: worst ${Math.min(...rates)}/t · best ${Math.max(...rates)}/t`,
      );
      // eslint-disable-next-line no-console
      console.log(`[arena] decided at: ${played.decidedAt === null ? 'undecided' : `t${played.decidedAt}`}`);
      expect(played.curve.length).toBeGreaterThan(0);
    },
    ARENA_PATIENCE,
  );
});
