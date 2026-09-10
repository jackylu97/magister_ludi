/**
 * **The bots' wager** — batch W2 of `docs/bot-priorities.md`, `docs/wager.md` §6.
 *
 * What is under test is a *replacement*, and the tests are shaped by what was
 * replaced. Batch G2 left `wagerDecision` staking **index nought** — the card
 * the phase's own default gives an empty chair — and the turn-100 bench measured
 * what that costs: a quarter of a wager kept per seat and three eighths of a
 * malice seated, which is a vermilion chair in most bot councils by the Æra II
 * judgement.
 *
 * The pins the brief asks for, in its own words:
 *
 *   · the choice is **deterministic** and a pure function of the state;
 *   · a card the seat **already stands past** beats one it cannot reach;
 *   · the **beads' weight** is what the margin is paid at, and a tie goes to the
 *     order the cards were dealt in;
 *   · the **want appears in the book** when the bar is staked and leaves it when
 *     the bar is claimed;
 *   · the bot **never stakes a card the rules would refuse** (`chooseWagerError`);
 *   · the arena's knob walk sees the new keys with no edit to the page.
 *
 * The tables here are **built rather than played to**. A wager is dealt when an
 * age opens, which on a real board is somewhere past turn fifty, and a claim
 * about the appraisal is a claim about arithmetic rather than about how long a
 * seed takes to get there. So every test writes a deal onto the state by hand —
 * the deal is an append-only register with an absolute stamp on it, which is
 * exactly the sort of thing a test may write — and then asks the bot.
 */

import { describe, expect, it } from 'vitest';

import { blocksOf, knobKey, knobsOf } from '../../src/arenaPage/knobs';
import { AI, valueContext } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { driveBots } from '../../src/ai/driver';
import { appraiseWagers, malicePrice, wagerLeanOf } from '../../src/ai/wager';
import { type Game, createGame } from '../../src/sim/game';
import type { GameConfig, GameState, Player } from '../../src/sim/state';
import { playerById } from '../../src/sim/state';
import { WAGER_RULES, type WagerId, wagerBar, wagerDef } from '../../src/sim/wagerData';
import { chooseWagerError, openWagerDeal } from '../../src/sim/wagers';

const CONFIG: GameConfig = {
  seed: 20260909,
  sizeName: 'standard',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: false,
};

/** The age every table here is dealt for. Æra II is the first the deck deals in. */
const AGE = 2;

/**
 * **A table on the board, written down rather than played to.**
 *
 * The world is put in Æra II by the one stamp the clock reads (`ageClose`, an
 * absolute `{age, turn}`), and the deal is pushed onto the register with
 * `dealtOn` one turn back — which is exactly the window `wagerBlocker` opens
 * (`dealtOn + 1 === state.turn`, the pipeline's own off-by-one).
 */
function deal(game: Game, cards: string[], turn = 30): void {
  const state = game.state;
  state.turn = turn;
  state.ageClose = { age: AGE - 1, turn: turn - 12 };
  state.wagers.length = 0;
  state.wagers.push({
    age: AGE,
    dealt: [...cards],
    dealtOn: turn - 1,
    opening: state.players
      .filter((player) => !player.barbarian)
      .map((player) => ({ playerId: player.id, at: cards.map(() => 0) })),
    claimed: [],
  });
}

/** The seat every test asks. */
function seatOf(state: GameState): Player {
  const player = playerById(state, 0);
  if (!player) throw new Error('no seat 0');
  return player;
}

/** A flow reading's lifetime total, written straight onto the seat. */
function bank(player: Player, count: 'science' | 'culture', total: number): void {
  player.wagerTotals[count] = total;
}

describe('the stake', () => {
  it('is a pure function of the state: two appraisals of one board agree exactly', () => {
    const game = createGame(CONFIG);
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    bank(player, 'science', 3000);
    const ctx = valueContext(game.state, player);
    const first = appraiseWagers(game.state, player, ctx);
    const second = appraiseWagers(game.state, player, valueContext(game.state, player));
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.best!.index).toBe(first!.best!.index);
    expect(second!.options.map((option) => option.score)).toEqual(
      first!.options.map((option) => option.score),
    );
    // And the score is the fold of the printed terms, exactly — `decision.ts`'
    // contract, which is what stops a feed and a comparison disagreeing.
    for (const option of first!.options) {
      if (option.rejected !== null) continue;
      let total = 0;
      for (const term of option.terms) total = term.op === 'sub' ? total - term.value : total + term.value;
      expect(option.score).toBe(total);
    }
  });

  it('prefers a bar it already stands past to one it cannot reach', () => {
    const game = createGame(CONFIG);
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    // The Academies asks for beakers *this age* and this seat has already banked
    // half again the bar; The Chronicle asks for culture and it has none.
    bank(player, 'science', wagerBar('academies' as WagerId, AGE) * 1.5);
    bank(player, 'culture', 0);
    const stake = appraiseWagers(game.state, player, valueContext(game.state, player));
    expect(stake!.best!.id).toBe('academies');
    expect(stake!.options[0]!.margin).toBe(1);
    expect(stake!.options[1]!.margin).toBeLessThan(1);

    // And the other way round, on the same board: the preference is the reading,
    // not the order the cards happen to sit in.
    bank(player, 'science', 0);
    bank(player, 'culture', wagerBar('theChronicle' as WagerId, AGE) * 1.5);
    const swapped = appraiseWagers(game.state, player, valueContext(game.state, player));
    expect(swapped!.best!.id).toBe('theChronicle');
  });

  it('pays the margin at the beads the stake is worth, and breaks a tie by the deal', () => {
    const game = createGame(CONFIG);
    // Two cards a seat stands exactly nowhere on, so the margins tie.
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    const ctx = valueContext(game.state, player);
    const stake = appraiseWagers(game.state, player, ctx)!;
    const premium = (WAGER_RULES.stakeBeads - WAGER_RULES.otherBeads) * AI.weights.bead;
    expect(premium).toBeGreaterThan(0);
    for (const option of stake.options) {
      if (option.rejected !== null) continue;
      // The first term IS the beads' weight times the margin — the stake's own
      // premium over clearing the same card unstaked, which is the whole of what
      // staking buys.
      expect(option.terms[0]!.value).toBeCloseTo(option.margin * premium, 9);
      // And the second is the malice, at the share of the bar still missing.
      expect(option.terms[1]!.value).toBeCloseTo((1 - option.margin) * stake.malice, 9);
    }
    // A tie goes to the order the cards were dealt in, which is the tie-break
    // every sweep in this game uses.
    const tied = stake.options.filter((option) => option.rejected === null);
    const best = stake.best!;
    for (const option of tied) {
      if (option.score === best.score) expect(best.index).toBeLessThanOrEqual(option.index);
    }
  });

  it('never stakes a card the rules would refuse', () => {
    const game = createGame(CONFIG);
    // A row this build does not hold sits where a card should be. The appraisal
    // strikes it rather than scoring it, and never picks it.
    deal(game, ['notACardAtAll', 'academies', 'takenTown']);
    const player = seatOf(game.state);
    const stake = appraiseWagers(game.state, player, valueContext(game.state, player))!;
    expect(stake.options[0]!.rejected).not.toBeNull();
    expect(stake.best!.index).not.toBe(0);

    // A seat that has already answered is refused by the simulation's own gate,
    // and the appraisal offers nothing at all rather than a second stake.
    player.wager = { age: AGE, index: 1 };
    const answered = appraiseWagers(game.state, player, valueContext(game.state, player))!;
    expect(answered.best).toBeNull();
    for (const option of answered.options) expect(option.rejected).not.toBeNull();
  });

  it('sends a stake the reducer takes, on a board it has actually played', () => {
    const game = createGame(CONFIG);
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    bank(player, 'culture', wagerBar('theChronicle' as WagerId, AGE) * 2);
    const wanted = appraiseWagers(game.state, player, valueContext(game.state, player))!.best!;
    driveBots(game, { warn: () => {} });
    const staked = seatOf(game.state).wager;
    expect(staked).toBeDefined();
    expect(staked!.age).toBe(AGE);
    expect(staked!.index).toBe(wanted.index);
    // The card it landed on is a card this build holds, which is the other half
    // of the refusal rule: the bot proposed a command the reducer took.
    const dealt = openWagerDeal(game.state)!.dealt[staked!.index]!;
    expect(wagerDef(dealt as WagerId).name.length).toBeGreaterThan(0);
    // And a second answer is refused, byte-identically — the gate the arm asks.
    expect(chooseWagerError(game.state, player.id, 0)).toBe('You have already staked this age');
  });
});

describe('the want', () => {
  it('appears in the book when the bar is staked and leaves when it is claimed', () => {
    const game = createGame(CONFIG);
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    expect(valueContext(game.state, player).wants.wager).toBeNull();

    player.wager = { age: AGE, index: 0 };
    const staked = valueContext(game.state, player);
    const want = staked.wants.wager;
    expect(want).not.toBeNull();
    // The stock is the bar less the standing, in the reading's own coin, and the
    // ranking is what closing it is worth per unit of it.
    expect(want!.price).toBe(wagerBar('academies' as WagerId, AGE));
    expect(want!.perUnit).toBeCloseTo(want!.worth / want!.price, 9);
    expect(want!.worth).toBeGreaterThan(0);
    expect(staked.wager).not.toBeNull();
    expect(staked.wager!.id).toBe('academies');

    // Claimed: the bead is banked and the bar pays nothing more, so the lean
    // comes off the board rather than running to the close.
    openWagerDeal(game.state)!.claimed.push({ playerId: player.id, index: 0, turn: game.state.turn });
    const claimed = valueContext(game.state, player);
    expect(claimed.wants.wager).toBeNull();
    expect(claimed.wager).toBeNull();
  });

  it('leans on the voice the bar is quoted in, up to the band and no further', () => {
    const game = createGame(CONFIG);
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    const before = valueContext(game.state, player);
    player.wager = { age: AGE, index: 1 };
    const after = valueContext(game.state, player);
    expect(after.wager!.voices).toContain('culture');
    // The lean lifts the voice the staked bar reads…
    expect(after.prices.culture).toBeGreaterThanOrEqual(before.prices.culture);
    // …and stops at the band's ceiling, which is what makes it a lean.
    const table = AI.weights.culture[Math.min(AI.weights.culture.length - 1, after.age - 1)]!;
    expect(after.prices.culture).toBeLessThanOrEqual(table * AI.priorities.priceBandHigh + 1e-9);
  });

  it('is switched off whole by one knob, which is what makes it an arena A/B', () => {
    const game = createGame(CONFIG);
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    player.wager = { age: AGE, index: 1 };
    withAiTuning({ wager: { leanWeight: 0 } }, () => {
      const ctx = valueContext(game.state, player);
      expect(ctx.wager).toBeNull();
      expect(ctx.wants.wager).toBeNull();
      expect(wagerLeanOf(game.state, player, ctx)).toBeNull();
    });
  });

  it('prices the malice off the deck, and takes a flat penalty when a sheet names one', () => {
    const game = createGame(CONFIG);
    deal(game, ['academies', 'theChronicle', 'takenTown']);
    const player = seatOf(game.state);
    const priced = malicePrice(valueContext(game.state, player));
    // The deck is twelve rows of ordinary card effects and every one of them
    // takes something away, so the avoidance is worth something.
    expect(priced).toBeGreaterThan(0);
    withAiTuning({ wager: { malicePenalty: 777 } }, () => {
      expect(malicePrice(valueContext(game.state, player))).toBe(777);
    });
  });
});

describe('the arena', () => {
  it('walks the four new knobs with no edit to the page', () => {
    const walked = new Set(knobsOf(AI).map((knob) => knobKey(knob.path)));
    for (const key of [
      'wager.ageTurns',
      'wager.malicePenalty',
      'wager.leanWeight',
      'wager.driftWeight',
    ]) {
      expect(walked.has(key), key).toBe(true);
    }
    // And they are grouped like every other block, rather than orphaned.
    const blocks = blocksOf(knobsOf(AI)).map((block) => block.name);
    expect(blocks).toContain('wager');
  });
});
