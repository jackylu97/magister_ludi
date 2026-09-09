/**
 * **The long game**: a hundred and twenty turns of two bots on a standard map,
 * played once and read five ways.
 *
 * The core file pins the bot's contract on ten turns of a duel map; this is the
 * long half, and it is slow *by kind* rather than by clock (CLAUDE.md's tier
 * rule). What it is for is the class of bug ten turns cannot reach: a validator
 * that only disagrees with the bot once an empire has eight towns, a settler
 * that oscillates between two sites, a seat that stops being able to end its
 * turn the first time a Doctrine is offered, a treasury that quietly runs away.
 * Every one of those shows up here as a refusal, a stall, a bleed, or a replay
 * that does not match.
 *
 * **What it is NOT for** (the user, 2026-09-09): *"we shouldn't be using the bot
 * to measure anything, it isn't a good baseline."* Nothing here asserts that the
 * board reaches a town count, a technology count, a bead count or a verdict by a
 * turn. Those claims were axed and are listed one by one in
 * `docs/audit/test-suite-speed.md`; what is left guards a **bot regression**.
 *
 * **Why a hundred and twenty turns, measured rather than guessed** (2026-09-09).
 * This game used to be played twice at two lengths — a 120-turn game here and a
 * 200-turn "arena" below it — and the two were the same seed, the same map and
 * the same two seats. The arena's extra eighty turns cost **439 seconds against
 * 53**, because a turn's price grows with the empire on the board (t120 → 53s,
 * t140 → 77s, t160 → 118s, t180 → 220s, t200 → 439s), and they bought two things
 * that are measured here:
 *
 *   · **the solvency window.** Entry LIX's collapse (worst net gold −125 a turn,
 *     worst treasury −1,642) was found at t160 on seats holding six and seven
 *     towns. This board holds **eight and eight by t120** with the same age
 *     turning under the same stepped upkeep, so the empire the solvency claim is
 *     made about is bigger than the one that broke — the horizon is short, the
 *     empire is not;
 *   · **the replay's command kinds.** The 200-turn log exercises thirty-three
 *     kinds of command and the **last new one arrives at t111** (`startRoute`
 *     and `sleepUnit`; before them `gainBelief` at t83 and `unslotOrder` at
 *     t79). A sixty-turn log is eleven kinds short — no great person, no holy
 *     site, no faith purchase, no trade route. A hundred and twenty turns is
 *     therefore the shortest log that replays everything the long one did.
 *
 * The other long games this file used to hold are now files of their own, so
 * that each gets a worker: `aiDriver.slow.test.ts` (the re-ask and the
 * determinism pin) and `aiWar.slow.test.ts` (the war arena, the siege and the
 * war loop). The shared harness is `aiBotHelpers.ts`.
 */

import { describe, expect, it } from 'vitest';

import { replay, snapshotState } from '../../src/sim/game';
import { realPlayers } from '../../src/sim/state';
import aiJson from '../../data/ai.json';
import { type Played, PATIENCE, after, playOut, worstGold } from './aiBotHelpers';

const TURNS = 120;

/** The one long game, played on first ask and shared by every claim below. */
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
    'opens both banks rather than hoarding them',
    () => {
      const played = theLongGame();
      const bought = played.game.log.filter((command) => command.type === 'purchaseItem');
      const banks = new Set(bought.map((command) => command.currency));
      // A bot that spends nothing is a broken bot, which is why this survived
      // the pacing axe: the subject is the **spend arms**, not how fast the
      // game moves. Gold buys the building order and a garrison. Faith's sink
      // moved on 2026-09-06: the augur it used to buy is retired (batch C2),
      // and the faith ladder now spends the bank at the deal (ruling i) — a
      // pantheon rung climbed IS faith spent. A rite (`performRite`, a town's
      // verb) or a prophet bought for faith are the other two sinks, and any of
      // the three answers the claim; a seat that hoarded faith would hold no
      // rung and say no rite.
      expect(banks.has('gold')).toBe(true);
      const faithSpent =
        banks.has('faith') ||
        played.game.log.some((command) => command.type === 'performRite') ||
        realPlayers(played.game.state).some((player) => player.pantheon.rungs > 0);
      expect(faithSpent).toBe(true);

      // The treasury never runs away — the mirror of the solvency floor below,
      // and the same kind of claim. A bot with no sink ends a game like this
      // one nearer four figures; the bar is a loose one on purpose, because
      // what is asserted is "something spends it", not a balance the tuning is
      // allowed to move.
      //
      // **The number is unchanged**: it was `4 × (spending.goldSpendAbove +
      // spending.goldReserve)`, which was `4 × (150 + 100)`, and those two knobs
      // are the ones the want book retired (`wants.ts`). There is no threshold
      // left to take a multiple of, so the same figure is written out.
      const ceiling = 1000;
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
    'keeps every seat solvent after the opening',
    () => {
      // Entry LIX's finding 1, and the reason a long bot game exists at all:
      // *"by t160 both seats run negative gold (worst −125/turn, treasury
      // −1,642) — late upkeep outruns supply and the arrears sweep does not
      // right it."* This is the instrument that says whether it is gone.
      const played = theLongGame();
      expect(played.warnings).toEqual([]);
      // The bound is small and deliberately not zero: a seat that spends down to
      // buy a wonder on one turn has not collapsed, and the arrears rule itself
      // needs a little room below zero to fire in. What Entry LIX found was
      // −1,642, which is three orders of magnitude the other side of this.
      const floor = -50;
      const offenders = after(played, 60).filter((reading) => reading.gold < floor);
      expect(
        offenders
          .slice(0, 5)
          .map((reading) => `t${reading.turn} seat ${reading.playerId}: ${reading.gold}💰`),
      ).toEqual([]);
      // Printed rather than asserted, and printed for the *failure* rather than
      // for a tuning pass: when the floor is crossed, the worst reading of each
      // seat is the diagnosis.
      expect(worstGold(played, 60).length).toBeGreaterThan(0);
    },
    PATIENCE,
  );

  it(
    'does not let net income live in the red',
    () => {
      // The other half of the same finding, and the one that actually predicts a
      // collapse: a treasury can look fine on the turn a caravan arrives. What
      // must not happen is a *sustained* negative rate — so this asks how many of
      // the late readings are bleeding rather than whether any single one is.
      const played = theLongGame();
      const late = after(played, 60);
      // Entry LIX measured the worst rate at **−125💰 a turn**. That is the
      // number this claim is about, and the floor is set an order of magnitude
      // the right side of it: a seat may run a small deficit for a stretch (a
      // war levy, a wonder's decade) and must never run one that compounds.
      //
      // **What "compounds" means, written down** (2026-09-09, batches X8 and
      // X5b landing together). The rate alone tripped this on a seat that was
      // nothing like Entry LIX's: sixteen towns, a ninety-piece army in a war
      // it had chosen, and a treasury of four to eight hundred coin that *rose*
      // through the nine turns its rate read −43 to −35 — the age turned and
      // every piece's keep stepped up at once, and the war's plunder more than
      // paid the difference. A deficit that compounds is one the treasury cannot
      // carry, so a reading counts only where the rate is under the floor AND
      // the purse behind it is thin — ten times the arrears bar, the point past
      // which the solvency arm itself would already be selling. A rich empire
      // running a war at a loss for a decade is a war economy, not a bleed.
      const floor = -30;
      const cushion = 10 * aiJson.solvency.arrearsTreasury;
      const worst = late.filter((reading) => reading.netGold < floor && reading.gold < cushion);
      expect(
        worst
          .slice(0, 5)
          .map((reading) => `t${reading.turn} seat ${reading.playerId}: ${reading.netGold}💰/t`),
      ).toEqual([]);
      expect(late.length).toBeGreaterThan(0);
    },
    PATIENCE,
  );

  it(
    'writes a log that replays byte for byte',
    () => {
      // The contract every decision in the bot is written to keep: a scored
      // decision is only safe while it is a pure function of the state. See the
      // file docblock for why a hundred and twenty turns is the shortest log
      // that still exercises every kind of command the bot ever issues.
      const played = theLongGame();
      const rebuilt = replay(played.game.config, played.game.log);
      expect(snapshotState(rebuilt)).toBe(snapshotState(played.game.state));
    },
    PATIENCE,
  );
});
