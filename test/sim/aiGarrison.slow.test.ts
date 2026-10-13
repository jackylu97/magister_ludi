/**
 * The two played-game pins of batch X13 (`docs/flags.md` (sss)), moved here from
 * `aiGarrison.test.ts` because each is forty turns of bot play on a standard map.
 * The four arranged-board pins of the same ruling stay in the core file.
 *
 * Both tests read the same game (seed 7 under the bot stepper). It used to be
 * played once per test; it is now played once, and every turn's reading that
 * either test needs is recorded as it goes.
 */

import { describe, expect, it } from 'vitest';

import { bestTechGoal } from '../../src/ai/bot';
import { aiConfigFor } from '../../src/ai/aiConfig';
import { createBotStepper } from '../../src/ai/stepper';
import type { Game } from '../../src/sim/game';
import { type GameConfig, type Unit, playerById } from '../../src/sim/state';
import { isExplorer, unitDef } from '../../src/sim/unitData';
import { createGame } from './newGameHelpers';

/** Seed 7, standard, two seats and the wild — the audit's own board. */
const SEED_SEVEN: GameConfig = {
  seed: 7,
  sizeName: 'standard',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/** What the two tests read after each stepper turn. */
interface Sitting {
  /** The game turn before this stepper turn was played. */
  turnBefore: number;
  /** How many technologies seat 0 knows afterwards. */
  techs: number;
  /** Seat 0's research goal afterwards. */
  goal: string | null;
  /** Every unit on the board afterwards, copied. */
  units: Unit[];
}

/** The longest either test plays. */
const TURNS = 40;

let played: { game: Game; sittings: Sitting[] } | null = null;

/** Seed 7 played `TURNS` stepper turns, once for the file, stopping early on a stall. */
function playedOpening(): { game: Game; sittings: Sitting[] } {
  if (played !== null) return played;
  const game = createGame(SEED_SEVEN);
  const stepper = createBotStepper(game, { warn: () => {} });
  const sittings: Sitting[] = [];
  for (let guard = 0; guard < TURNS; guard++) {
    const turnBefore = game.state.turn;
    stepper.playTurn();
    if (stepper.stalled()) break;
    const player = playerById(game.state, 0)!;
    sittings.push({
      turnBefore,
      techs: player.techsResearched.length,
      goal: bestTechGoal(game.state, player),
      units: structuredClone(game.state.units),
    });
  }
  played = { game, sittings };
  return played;
}

describe('the played opening (batch X13)', () => {
  it('does not thrash the research goal while the empire’s knowledge is unchanged', () => {
    // The audit: *"Sailing scores 125 / absent / 125 / absent across t2–t7"*,
    // because its Lighthouse line is priced in gold and gold's price was
    // swinging six-fold on alternate turns. Beakers are a pool so nothing was
    // lost, but the plan and the feed were unstable.
    //
    // The claim, stated so it cannot pass by accident: within a stretch of turns
    // over which the empire **learns nothing new**, the goal may move on, but it
    // may never come *back* to a goal it has already left. A goal that returns is
    // a goal that changed its mind about a board that did not change.
    let known = -1;
    let left: string[] = [];
    let last: string | null = null;
    const returns: string[] = [];
    for (const sitting of playedOpening().sittings) {
      // The turns this test has always read: up to turn thirty.
      if (sitting.turnBefore >= 30) break;
      if (sitting.techs !== known) {
        known = sitting.techs;
        left = [];
        last = null;
      }
      const goal = sitting.goal;
      if (goal === null) continue;
      if (last !== null && goal !== last) left.push(last);
      if (goal !== last && left.includes(goal)) returns.push(`t${sitting.turnBefore + 1}:${goal}`);
      last = goal;
    }
    expect(returns).toEqual([]);
  });

  it('opens on a soldier, and never raises more rangers than its own cap wants', () => {
    // (d)'s last pin, and the one place the ruling's words and the sheet's
    // numbers have to be reconciled. The audit's symptom was *"seat 0 builds
    // three scouts by t5 and seven by t66"*, and its mechanism was the table:
    // with the Warrior row struck out by the old null worth, the Scout won by
    // **default** on the turn a fresh ranger stood in the town. Two claims
    // follow from the fix and both are pinned:
    //
    //   · **the first thing the capital raises is not a ranger.** Every seat
    //     starts with a scout (`rules.startingUnits`), so the opening book
    //     declines by design and this is the scored table's own answer — the
    //     answer the null was corrupting.
    //   · **the count never passes `military.scoutCap`.** The ruling says "at
    //     most one scout beyond the starting one", which is a cap of two; the
    //     sheet says three, and a cap is a balance number that lives in
    //     `data/ai.json` rather than in a test. So the pin is against the sheet
    //     — a seat that wants three and holds three is a seat obeying its dial,
    //     and a seat holding seven was the defect.
    const { game, sittings } = playedOpening();
    const cap = aiConfigFor(undefined).military.scoutCap;
    // The log only grows, so the first unit seat 0 ever queued is the first one
    // in the final log.
    let first: string | null = null;
    for (const command of game.log) {
      if (command.type !== 'setCityProduction' || command.playerId !== 0) continue;
      const head = command.queue[0];
      if (head !== undefined && head.kind === 'unit') {
        first = head.id;
        break;
      }
    }
    const rangers = new Set<number>();
    let settler = false;
    for (const sitting of sittings) {
      if (settler) break;
      for (const unit of sitting.units) {
        if (unit.ownerId !== 0) continue;
        const def = unitDef(unit.type);
        // **Only the rangers this seat raised.** A ruin hands a free scout to
        // whoever finds it (`data/discoveries.json`, `Unit.freeUpkeep` at the
        // free-unit seam), and the cap is a bound on what the empire *builds*
        // — the soldiers' new price of 2026-09-15 replayed the board and a
        // gift landed on it, which is not the bot exceeding its dial.
        if (unit.freeUpkeep === true) continue;
        if (isExplorer(def)) rangers.add(unit.id);
        // The starting settler is spent on the capital in the first turn, so
        // any settler standing after that is one this empire raised.
        if (def.foundsCity === true) settler = true;
      }
    }
    expect(first).not.toBeNull();
    expect(isExplorer(unitDef(first as never))).toBe(false);
    expect(settler).toBe(true);
    expect(rangers.size).toBeLessThanOrEqual(cap);
    let held = 0;
    for (const unit of game.state.units) {
      if (unit.ownerId === 0 && unit.freeUpkeep !== true && isExplorer(unitDef(unit.type))) held += 1;
    }
    expect(held).toBeLessThanOrEqual(cap);
  });
});
