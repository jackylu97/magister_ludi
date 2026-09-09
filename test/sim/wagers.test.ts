import { describe, expect, it } from 'vitest';

import {
  type GameConfig,
  type GameState,
  bumpRevision,
  newGame,
  realPlayers,
} from '../../src/sim/state';
import type { TechId } from '../../src/sim/techData';
import { runWorldClock } from '../../src/sim/beads';
import { runWagers } from '../../src/sim/wagers';
import {
  chooseWagerError,
  drawWagers,
  judgeWagers,
  openWagerDeal,
  wagerBlocker,
  wagerCount,
  wagerDealOf,
  wagerMet,
  wagerStandings,
  wagerStanding,
} from '../../src/sim/wagers';
import {
  WAGER_AGES,
  WAGER_COUNTS,
  WAGER_IDS,
  WAGER_RULES,
  wagerBar,
  wagerDataProblems,
  wagerDealtInAge,
  wagerDef,
  wagerLinesOfAge,
} from '../../src/sim/wagerData';
import { OCCASIONS } from '../../src/sim/occasions';
import { END_OF_TURN_PHASES } from '../../src/sim/turn';
import { applyCommand } from '../../src/sim/commands';
import { firstBlocker } from '../../src/ui/turnBlockers';

/**
 * **The wager** — batch G2, `docs/wager.md` §2/§3/§3b (the spec of record).
 *
 * What this file pins, in the order the mechanism runs: the deck is a table and
 * every row of it reads something the game can answer; the deal is three cards
 * from **three different lines** on the turn an age opens, and never in Æra I;
 * a seat that has not staked is held by the End Turn blocker on that turn and
 * only that turn, and the phase fills an empty chair the turn after; a bar met
 * is **claimed the turn it is met**, once per seat, minting two beads for the
 * card that seat staked and one for either of the others; and the judgement at
 * the close leaves a `pendingMalice` on a staker who missed, and nothing else.
 *
 * The bench is the **phase** rather than a whole resolution, for
 * `worldClock.test.ts`' reason: the claim is about this beat, and a
 * two-hundred-turn bot game measures the tree's pace instead.
 */

function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: false },
    ],
    ...over,
  };
}

const OF_AGE: Record<number, TechId> = {
  1: 'agriculture',
  2: 'currency',
  3: 'mathematics',
  4: 'education',
};

/** Puts one seat into a built age. `worldClock.test.ts`' helper, verbatim. */
function reach(state: GameState, playerId: number, age: number): void {
  const player = state.players[playerId]!;
  const tech = OF_AGE[age]!;
  if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  bumpRevision(state);
}

/**
 * One turn, in the pipeline's own shape: the two phases that matter, and *then*
 * the clock.
 *
 * The order is load-bearing rather than cosmetic. `applyEndTurn` runs every
 * phase and raises `state.turn` afterwards, so a deal taken in the resolution of
 * turn T is a table the players first see on turn T+1 — which is exactly the
 * off-by-one the blocker and the phase's default are written against, and a
 * bench that incremented first would test a game that does not exist.
 */
function tick(state: GameState): void {
  runWorldClock(state);
  runWagers(state);
  state.turn += 1;
}

/**
 * Runs the board forward until Æra I has closed and Æra II's table is dealt.
 *
 * Both seats are put into Æra II so the *mean* crosses (the clock floors — one
 * empire alone turns nothing over), and then the countdown is simply run out.
 */
function dealAgeTwo(state: GameState): void {
  reach(state, 0, 2);
  reach(state, 1, 2);
  for (let step = 0; step < 60; step++) {
    tick(state);
    if (openWagerDeal(state) !== null) return;
  }
  throw new Error('no wager was ever dealt');
}

// --- 1. the deck ------------------------------------------------------------

describe('the deck', () => {
  it('is consistent: every row reads something, and every age can be dealt from', () => {
    expect(wagerDataProblems()).toEqual([]);
  });

  it('holds the four-and-twenty of the worksheet', () => {
    expect(WAGER_IDS).toHaveLength(24);
  });

  it('answers every reading in the vocabulary — nothing declared and unread', () => {
    // The register test the cards, the beads and the Triumphs each keep: a
    // member of the union that no arm answers would be a bar nobody could
    // clear, and a member no row names would be vocabulary as decoration.
    const state = newGame(config());
    for (const count of WAGER_COUNTS) {
      expect(typeof wagerCount(state, 0, count)).toBe('number');
    }
    const named = new Set<string>();
    for (const id of WAGER_IDS) {
      const reads = wagerDef(id).reads;
      if (reads.shape === 'count') named.add(reads.count);
      else for (const clause of reads.clauses) named.add(clause.count);
    }
    for (const count of WAGER_COUNTS) expect(named.has(count)).toBe(true);
  });

  it('keeps a deferred row in the table and out of every pool', () => {
    // The vocabulary's own convention (`docs/wager.md` §3): a card whose reading
    // does not exist yet is deferred and annotated, never bent into a near-fit.
    const deferred = WAGER_IDS.filter((id) => wagerDef(id).deferred !== undefined);
    expect(deferred.length).toBeGreaterThan(0);
    for (const id of deferred) {
      expect(wagerDef(id).deferred![0]!.length).toBeGreaterThan(0);
      for (const age of WAGER_AGES) expect(wagerDealtInAge(id, age)).toBe(false);
    }
  });

  it('never deals a row before the age it names', () => {
    // The Tithe is Æra III and up: religion pays nothing worth a bar in Æra II.
    expect(wagerDealtInAge('theTithe', 2)).toBe(false);
    expect(wagerDealtInAge('theTithe', 3)).toBe(true);
  });

  it('has at least three lines to deal from in every wagering age', () => {
    for (const age of WAGER_AGES) {
      expect(wagerLinesOfAge(age).length).toBeGreaterThanOrEqual(WAGER_RULES.dealt);
    }
  });
});

// --- 2. the deal ------------------------------------------------------------

describe('the deal', () => {
  it('draws three cards from three different lines', () => {
    const state = newGame(config());
    for (const age of WAGER_AGES) {
      for (let roll = 0; roll < 40; roll++) {
        const drawn = drawWagers(state, age);
        expect(drawn).toHaveLength(3);
        const lines = drawn.map((id) => wagerDef(id).line);
        expect(new Set(lines).size).toBe(3);
        for (const id of drawn) expect(wagerDealtInAge(id, age)).toBe(true);
      }
    }
  });

  it('deals nothing in Æra I and deals when Æra II opens', () => {
    const state = newGame(config());
    expect(state.wagers).toEqual([]);
    // A dozen turns of the first age: the opening is for learning the board.
    for (let step = 0; step < 12; step++) tick(state);
    expect(state.wagers).toEqual([]);

    dealAgeTwo(state);
    const deal = openWagerDeal(state)!;
    expect(deal.age).toBe(2);
    expect(deal.dealt).toHaveLength(3);
    // Dealt in the resolution of the turn before the one the players answer on.
    expect(deal.dealtOn).toBe(state.turn - 1);
    // Every real seat's opening figures, in roster order, and nobody has staked.
    expect(deal.opening.map((one) => one.playerId)).toEqual(
      realPlayers(state).map((player) => player.id),
    );
    for (const opening of deal.opening) expect(opening.at).toHaveLength(3);
    for (const player of realPlayers(state)) expect(player.wager).toBeUndefined();
  });

  it('is a seed — the same board deals the same three', () => {
    const one = newGame(config());
    const two = newGame(config());
    dealAgeTwo(one);
    dealAgeTwo(two);
    expect(openWagerDeal(one)!.dealt).toEqual(openWagerDeal(two)!.dealt);
  });

  it('never deals an age twice', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    const dealt = [...openWagerDeal(state)!.dealt];
    for (let step = 0; step < 5; step++) tick(state);
    expect(state.wagers.filter((deal) => deal.age === 2)).toHaveLength(1);
    expect(wagerDealOf(state, 2)!.dealt).toEqual(dealt);
  });
});

// --- 3. the stake -----------------------------------------------------------

describe('the stake', () => {
  it('holds every seat that has not staked, on the deal turn and only then', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    expect(wagerBlocker(state, 0)).not.toBeNull();
    expect(firstBlocker(state, 0)?.kind).toBe('wager');

    // The turn after, the chair is filled by the phase rather than by a button
    // nobody can press: a blocker that outlived its window is a locked End Turn
    // on a table nobody can change.
    tick(state);
    expect(wagerBlocker(state, 0)).toBeNull();
  });

  it('never holds the wild', () => {
    const state = newGame(config({ barbarians: true }));
    dealAgeTwo(state);
    const wild = state.players.find((player) => player.barbarian);
    expect(wild).toBeDefined();
    expect(wagerBlocker(state, wild!.id)).toBeNull();
  });

  it('takes a pick through the reducer and refuses a second', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    const first = applyCommand(state, { type: 'chooseWager', playerId: 0, index: 1 });
    expect(first.ok).toBe(true);
    expect(state.players[0]!.wager).toEqual({ age: 2, index: 1 });

    const second = applyCommand(state, { type: 'chooseWager', playerId: 0, index: 2 });
    expect(second.ok).toBe(false);
    expect(state.players[0]!.wager).toEqual({ age: 2, index: 1 });
  });

  it('refuses an index that is not one of the three, and moves nothing', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    const before = JSON.stringify(state.players[0]);
    for (const index of [-1, 3, 1.5]) {
      expect(chooseWagerError(state, 0, index)).not.toBeNull();
      expect(applyCommand(state, { type: 'chooseWager', playerId: 0, index }).ok).toBe(false);
    }
    expect(JSON.stringify(state.players[0])).toBe(before);
  });

  it('fills an empty chair with the first card, the turn after the deal', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    applyCommand(state, { type: 'chooseWager', playerId: 0, index: 2 });
    expect(state.players[1]!.wager).toBeUndefined();

    tick(state);
    // The seat that answered keeps its own answer; the one that did not is
    // dealt its first card, which is what a hot-seat game with an absent
    // player needs and what a human is never quietly given instead of asked.
    expect(state.players[0]!.wager).toEqual({ age: 2, index: 2 });
    expect(state.players[1]!.wager).toEqual({ age: 2, index: 0 });
  });
});

// --- 4. the claim -----------------------------------------------------------

describe('the claim', () => {
  /** Arranges a board with the table dealt and one card trivially clearable. */
  function board(): GameState {
    const state = newGame(config());
    dealAgeTwo(state);
    arrange(state);
    return state;
  }

  it('claims the turn a bar is first met, and mints two beads for the stake', () => {
    const state = board();
    const deal = openWagerDeal(state)!;
    expect(wagerBar(deal.dealt[0]! as never, 2)).toBeGreaterThan(0);

    applyCommand(state, { type: 'chooseWager', playerId: 0, index: 0 });
    applyCommand(state, { type: 'chooseWager', playerId: 1, index: 1 });

    forceMet(state, 0, 0);
    forceMet(state, 1, 0);

    const beadsBefore = [state.players[0]!.beads.length, state.players[1]!.beads.length];
    tick(state);

    const after = wagerDealOf(state, 2)!;
    const claims = after.claimed.filter((claim) => claim.index === 0);
    expect(claims.map((claim) => claim.playerId)).toEqual([0, 1]);
    // Stamped with the turn the phase ran in, which the bench has since moved
    // past — the resolution's own turn, one before the players' next.
    for (const claim of claims) expect(claim.turn).toBe(state.turn - 1);
    // Two for the staker, one for the seat that cleared somebody else's card.
    expect(state.players[0]!.beads.length - beadsBefore[0]!).toBe(WAGER_RULES.stakeBeads);
    expect(state.players[1]!.beads.length - beadsBefore[1]!).toBe(WAGER_RULES.otherBeads);
  });

  it('claims once and never again', () => {
    const state = board();
    applyCommand(state, { type: 'chooseWager', playerId: 0, index: 0 });
    forceMet(state, 0, 0);
    tick(state);
    const banked = state.players[0]!.beads.length;
    for (let step = 0; step < 3; step++) tick(state);
    expect(wagerDealOf(state, 2)!.claimed.filter((one) => one.playerId === 0)).toHaveLength(1);
    expect(state.players[0]!.beads.length).toBe(banked);
  });

  it('announces the moment, and the union carries the word', () => {
    expect(OCCASIONS).toContain('wagerClaimed');
  });

  it('ranks every seat against a bar, highest first, and marks the ones that met it', () => {
    const state = board();
    forceMet(state, 1, 0);
    tick(state);
    const rows = wagerStandings(state, wagerDealOf(state, 2)!, 0);
    expect(rows.map((row) => row.playerId).sort()).toEqual([0, 1]);
    for (let at = 1; at < rows.length; at++) {
      expect(rows[at - 1]!.at).toBeGreaterThanOrEqual(rows[at]!.at);
    }
    expect(rows.find((row) => row.playerId === 1)!.met).toBe(true);
  });
});

/**
 * Puts three **flow** cards on the table in place of whatever the draw dealt.
 *
 * The claim and the judgement are the mechanism under test and neither of them
 * has an opinion about which card is on the table; the *draw* is pinned by its
 * own tests above. Arranging the table is what lets every claim test below move
 * a seat's standing with one honest write — a lifetime total, past the stamp the
 * deal took — instead of building an empire.
 *
 * Nothing in the deck is mutated: the row objects are the table's and stay the
 * table's. Only the deal on this board changes, and its openings are re-taken so
 * every seat still starts the age at nought.
 */
const ARRANGED: string[] = ['solventRealm', 'academies', 'theChronicle'];

function arrange(state: GameState): void {
  const deal = openWagerDeal(state)!;
  deal.dealt = [...ARRANGED];
  deal.opening = realPlayers(state).map((player) => ({
    playerId: player.id,
    at: ARRANGED.map((id) => {
      const reads = wagerDef(id as never).reads;
      return reads.shape === 'count' ? wagerCount(state, player.id, reads.count) : 0;
    }),
  }));
}

/** Puts one seat over one arranged card's bar. Every arranged row is a flow. */
function forceMet(state: GameState, playerId: number, index: number): void {
  const deal = openWagerDeal(state)!;
  const id = deal.dealt[index]! as never;
  const def = wagerDef(id);
  const reads = def.reads;
  if (reads.shape !== 'count') throw new Error('the bench arranges flows only');
  const opening = deal.opening.find((one) => one.playerId === playerId)!.at[index]!;
  state.players[playerId]!.wagerTotals[reads.count] = opening + wagerBar(id, deal.age) + 1;
  bumpRevision(state);
  expect(wagerMet(state, playerId, id, deal.age)).toBe(true);
}

// --- 5. the judgement -------------------------------------------------------

describe('the judgement', () => {
  it('leaves a pending malice on a staker who missed, and on nobody else', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    arrange(state);
    applyCommand(state, { type: 'chooseWager', playerId: 0, index: 0 });
    applyCommand(state, { type: 'chooseWager', playerId: 1, index: 1 });
    // The first seat clears its own card; the second does not.
    forceMet(state, 0, 0);
    tick(state);

    judgeWagers(state, 2);
    expect(state.players[0]!.pendingMalices).toEqual([]);
    expect(state.players[1]!.pendingMalices).toEqual([{ age: 2, wager: openWagerDeal(state)!.dealt[1] }]);
    // The deck itself is batch G3's: the mark is written and nothing is paid.
    expect(state.players[1]!.malices).toEqual([]);
  });

  it('is taken once — the Opus and the backstop reach the same age', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    applyCommand(state, { type: 'chooseWager', playerId: 0, index: 0 });
    judgeWagers(state, 2);
    const marks = state.players[0]!.pendingMalices.length;
    judgeWagers(state, 2);
    expect(state.players[0]!.pendingMalices).toHaveLength(marks);
    expect(wagerDealOf(state, 2)!.judgedOn).toBe(state.turn);
  });
});

// --- 6. the flow's window ---------------------------------------------------

describe('a flow counts from the deal', () => {
  it('starts every seat at nought and subtracts the stamp, never a reset', () => {
    const state = newGame(config());
    dealAgeTwo(state);
    arrange(state);
    const deal = openWagerDeal(state)!;
    const at = 0;
    const id = deal.dealt[at]!;
    const def = wagerDef(id as never);
    const count = (def.reads as { count: string }).count;
    const opening = deal.opening.find((one) => one.playerId === 0)!.at[at]!;

    // The lifetime total is what moves; the stamp never does.
    state.players[0]!.wagerTotals[count] = opening + 40;
    bumpRevision(state);
    expect(wagerStanding(state, 0, id as never, 2)).toBe(40);
    expect(deal.opening.find((one) => one.playerId === 0)!.at[at]).toBe(opening);
  });
});

// --- 7. the phase ------------------------------------------------------------

describe('the phase', () => {
  it('runs directly after the clock and directly before the beads', () => {
    // The position is the rule (`runWagers`' docblock): after the clock because
    // every question here is about the age, before the beads because a claim
    // mints beads the deed sweep reads on the same turn.
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    const clock = names.indexOf('worldClock');
    const wagers = names.indexOf('wagers');
    const beads = names.indexOf('beads');
    expect(wagers).toBe(clock + 1);
    expect(beads).toBe(wagers + 1);
  });
});
