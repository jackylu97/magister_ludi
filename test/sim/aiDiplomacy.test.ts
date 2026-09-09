/**
 * **The audience** (`docs/war-diplomacy.md` §12): a paper answered while the
 * player is still standing at the table.
 *
 * `aiBot.test.ts` owns the bot's two contracts — every command accepted, the
 * same board always the same command — by *playing*. This file owns the two
 * readings that make an audience possible, and both are things a policy can be
 * quietly wrong about:
 *
 *   1. **The counter** (`counterTerms`). It fills one side of a paper up to the
 *      bot's own bar, which means it can be wrong in two directions at once: a
 *      counter that asks too little is a paper the bot would refuse to sign
 *      (the markup is exactly what that clause is for), and one that asks for
 *      something the rules forbid — a seat of government, an empire's only silk
 *      — is a counter the player cannot propose. Every figure it moves is
 *      capped by `dealSideError`, so the test asserts against the simulation's
 *      own gate rather than against a number written here.
 *   2. **The answer** (`answerAudience`). It must dispatch the bot's own
 *      command **into the log** — determinism is the whole reason an answer at
 *      the table is allowed at all — must answer only for a seat nobody is
 *      sitting in, and must never end that seat's turn.
 *   3. **The memory** (batch X4, `src/ai/dealMemory.ts`). A paper the rival sent
 *      back is a paper this seat does not write again — until the board that
 *      priced it moves, or the turns lapse — and the one paper it *does* write
 *      in between is the same swap with coin on it. Every case here is a thing
 *      the loop was measured doing wrong (`docs/audit/bot-pass-2.md`, finding 2).
 */

import { describe, expect, it } from 'vitest';

import { AI } from '../../src/ai/aiConfig';
import { valueContext } from '../../src/ai/bot';
import { dealMemorySize, pendingDealRefusal, rememberDealRefusal } from '../../src/ai/dealMemory';
import type { BotDecision } from '../../src/ai/decision';
import { foldTerms } from '../../src/ai/decision';
import { counterRefusal, counterTerms, diplomacyDecision } from '../../src/ai/diplomacy';
import { answerAudience } from '../../src/ai/driver';
import { applyCommand } from '../../src/sim/commands';
import { type Command } from '../../src/sim/commands';
import type { DealTerms } from '../../src/sim/deals';
import { foundCityAt, hasResource, resourceCopies } from '../../src/sim/cities';
import { dealSideError } from '../../src/sim/diplomacy';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  hasEndedTurn,
  newGame,
  playerById,
} from '../../src/sim/state';
import { atWar, openWar } from '../../src/sim/wars';
import { resetVisibility } from '../../src/sim/visibility';

const SOURCES = import.meta.glob('../../src/ai/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function aiSource(name: string): string {
  const found = Object.entries(SOURCES).find(([path]) => path.endsWith(`/${name}`));
  if (!found) throw new Error(`aiDiplomacy test: no source for ${name}`);
  return found[1];
}

/**
 * A blank duel on flat grassland. By default **seat 0 is a person and seat 1 is
 * not**, which is the whole shape of an audience — a player asks, and the client
 * driving the other chair answers.
 *
 * The memory's tests want the table the other way round (a bot writing the
 * paper), so which chair is a person is an argument rather than a second bench:
 * a memory that behaved differently depending on who is sitting where would be a
 * memory the product could not use.
 */
function bench(seats: { a?: boolean; b?: boolean } = { a: true }): GameState {
  const state = newGame({
    seed: 17,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: seats.a === true },
      { name: 'Bors', color: '#00a', isHuman: seats.b === true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function claimBlock(state: GameState, city: City, cols: number[], rows: number[]): void {
  for (const col of cols) {
    for (const row of rows) {
      state.tileOwner[tileIndex(state.map, col, row)] = city.id;
    }
  }
}

/** A worked luxury seam on ground this town holds (`deals.test.ts`' helper). */
function giveLuxury(
  state: GameState,
  city: City,
  col: number,
  row: number,
  id: 'silk' | 'wine' | 'spices',
): void {
  const tile = at(state.map, col, row);
  tile.resource = id;
  tile.improvement = 'plantation';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
}

/** One town each, far apart, and a purse for the seat that is asking. */
function twoTowns(state: GameState): { mine: City; theirs: City } {
  const mine = foundCityAt(state, 0, at(state.map, 3, 4));
  const theirs = foundCityAt(state, 1, at(state.map, 12, 4));
  claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
  claimBlock(state, theirs, [11, 12, 13], [3, 4, 5]);
  bumpRevision(state);
  return { mine, theirs };
}

function ctxFor(state: GameState, seat: number) {
  return valueContext(state, playerById(state, seat)!);
}

// --- 1. what would make this work -------------------------------------------

describe('the counter', () => {
  it('fills the asker’s side with coin until the paper clears the bot’s bar', () => {
    const state = bench();
    const { theirs } = twoTowns(state);
    // The bot holds two silks; the player asks for one and offers nothing.
    giveLuxury(state, theirs, 11, 3, 'silk');
    giveLuxury(state, theirs, 13, 5, 'silk');
    playerById(state, 0)!.gold = 500;
    bumpRevision(state);
    expect(resourceCopies(state, 1, 'silk')).toBe(2);

    const counter = counterTerms(state, 1, 0, {}, { luxuries: ['silk'] }, ctxFor(state, 1));
    expect(counter).not.toBeNull();
    // The seam is still what is asked for, and coin has arrived beside it.
    expect(counter!.take).toEqual({ luxuries: ['silk'] });
    expect(counter!.give.gold ?? 0).toBeGreaterThan(0);
    // **Over even, not merely level**: the baseline plus the markup.
    expect(counter!.give.gold).toBe(Math.ceil(120 * 1.1));
    // And the counter is a paper the rules would take from the asker.
    expect(dealSideError(state, 0, 1, counter!.give, false)).toBeNull();
    // Its appraisal is the countered paper read from the bot's own side, and it
    // is worth signing: what arrives is over what leaves.
    expect(counter!.appraisal.total).toBeGreaterThan(0);
    expect(counter!.appraisal.terms.length).toBeGreaterThan(0);
  });

  it('prices a right of way, both ways, so a counter can buy one and sell one', () => {
    const state = bench();
    twoTowns(state);
    for (const seat of [0, 1]) playerById(state, seat)!.techsResearched.push('letters');
    playerById(state, 0)!.gold = 500;
    bumpRevision(state);

    // Asking for passage costs the asker coin — 60 with the markup on it.
    const asking = counterTerms(state, 1, 0, {}, { openBorders: true }, ctxFor(state, 1));
    expect(asking).not.toBeNull();
    expect(asking!.give.gold).toBe(Math.ceil(60 * 1.1));

    // And offering passage buys something back: the bot answers with its own
    // side rather than with nothing, which it could not do while passage was
    // priced at nought.
    playerById(state, 1)!.gold = 500;
    bumpRevision(state);
    const selling = counterTerms(state, 1, 0, { openBorders: true }, {}, ctxFor(state, 1));
    expect(selling).not.toBeNull();
    expect(selling!.take.gold ?? 0).toBeGreaterThan(0);
  });

  it('falls to coin a turn and then a town, in that order, on a peace paper', () => {
    const state = bench();
    const { theirs } = twoTowns(state);
    giveLuxury(state, theirs, 11, 3, 'silk');
    giveLuxury(state, theirs, 13, 5, 'silk');
    // A second town of the asker's, nearer the bot's ground than its capital —
    // which cannot be given at all (`dealSideError`) — and a third far away.
    const near = foundCityAt(state, 0, at(state.map, 9, 4));
    claimBlock(state, near, [8, 9, 10], [3, 4, 5]);
    foundCityAt(state, 0, at(state.map, 1, 8));
    playerById(state, 0)!.gold = 0;
    bumpRevision(state);
    openWar(state, 0, 1);
    // One soldier on the bot's side: it is ahead, but nowhere near the ceiling
    // it presses on at, so it will treat.
    createUnit(state, 1, 'warrior', 12, 4);

    const asking: DealTerms = { luxuries: ['silk'] };
    const counter = counterTerms(state, 1, 0, {}, asking, ctxFor(state, 1));
    expect(counter).not.toBeNull();
    // An empty purse pays nothing, so the coin line is absent and the two terms
    // under it in the ruling's order are what fill the gap.
    expect(counter!.give.gold).toBeUndefined();
    expect(counter!.give.goldPerTurn ?? 0).toBeGreaterThan(0);
    expect(counter!.give.cities).toEqual([near.id]);
    expect(dealSideError(state, 0, 1, counter!.give, true)).toBeNull();

    // And with a purse, coin is the first term and no town is asked for at all.
    playerById(state, 0)!.gold = 900;
    bumpRevision(state);
    const paid = counterTerms(state, 1, 0, {}, asking, ctxFor(state, 1));
    expect(paid).not.toBeNull();
    expect(paid!.give.gold ?? 0).toBeGreaterThan(0);
    expect(paid!.give.cities).toBeUndefined();
    expect(paid!.give.goldPerTurn).toBeUndefined();
  });

  it('never asks for the bot’s last copy when it answers "what would you give"', () => {
    const state = bench();
    const { theirs } = twoTowns(state);
    // One silk only: the hard clause, read from the other side of the table.
    giveLuxury(state, theirs, 11, 3, 'silk');
    playerById(state, 0)!.gold = 400;
    playerById(state, 1)!.gold = 0;
    bumpRevision(state);
    expect(resourceCopies(state, 1, 'silk')).toBe(1);
    expect(hasResource(state, 0, 'silk')).toBe(false);

    const counter = counterTerms(state, 1, 0, { gold: 400 }, {}, ctxFor(state, 1));
    // Whatever it offers, it is not the only seam this empire holds.
    expect(counter?.take.luxuries ?? []).not.toContain('silk');
  });

  it('offers a duplicate seam the asker lacks when it has one to spare', () => {
    const state = bench();
    const { theirs } = twoTowns(state);
    giveLuxury(state, theirs, 11, 3, 'silk');
    giveLuxury(state, theirs, 13, 5, 'silk');
    playerById(state, 0)!.gold = 400;
    playerById(state, 1)!.gold = 0;
    bumpRevision(state);

    const counter = counterTerms(state, 1, 0, { gold: 400 }, {}, ctxFor(state, 1));
    expect(counter).not.toBeNull();
    expect(counter!.take.luxuries).toEqual(['silk']);
    expect(dealSideError(state, 1, 0, counter!.take, false)).toBeNull();
  });

  it('will not treat at all while the war goes the bot’s way', () => {
    const state = bench();
    twoTowns(state);
    playerById(state, 0)!.gold = 900;
    // An army on one side and nothing on the other: the warscore reads well
    // over the ceiling this seat presses on at.
    for (let i = 0; i < 8; i++) createUnit(state, 1, 'warrior', 11 + (i % 3), 3 + (i % 3));
    bumpRevision(state);
    openWar(state, 0, 1);

    const ctx = ctxFor(state, 1);
    expect(counterTerms(state, 1, 0, { gold: 900 }, {}, ctx)).toBeNull();
    expect(counterRefusal(state, 1, 0, ctx)).toContain('will not treat');
  });

  it('says nothing about a war it is not in', () => {
    const state = bench();
    twoTowns(state);
    expect(counterRefusal(state, 1, 0, ctxFor(state, 1))).toBeNull();
  });
});

// --- 2. the answer at the table ---------------------------------------------

describe('answerAudience', () => {
  /** A game whose seat 1 is a bot, on the ordinary generated board. */
  function game(): Game {
    return createGame({
      seed: 20260907,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true },
        { name: 'Bors', color: '#00a' },
      ],
    });
  }

  function propose(playerId: number, targetId: number, give: unknown, take: unknown): Command {
    return { type: 'proposeDeal', playerId, targetId, give, take } as unknown as Command;
  }

  it('answers a human’s paper in the same call, and the answer is in the log', () => {
    const g = game();
    playerById(g.state, 0)!.gold = 200;
    bumpRevision(g.state);
    // A gift: coin for nothing. Any reading of it accepts. Sent through the
    // ordinary door, so the log carries the player's paper and the bot's answer
    // one after the other, exactly as a real table would.
    expect(dispatch(g, propose(0, 1, { gold: 100 }, {})).ok).toBe(true);
    const paper = g.state.dealProposals[0]!;

    const before = g.log.length;
    const decision = answerAudience(g, { seatId: 1, askerId: 0, dealId: paper.id });
    expect(decision).not.toBeNull();
    expect(decision!.command.type).toBe('acceptDeal');
    // Dispatched, not merely decided: the bot's own command is in the log, which
    // is the whole of why answering mid-turn is allowed to be deterministic.
    expect(g.log.length).toBe(before + 1);
    expect(g.log[g.log.length - 1]!.type).toBe('acceptDeal');
    expect(g.state.dealProposals).toEqual([]);
    expect(playerById(g.state, 1)!.gold).toBeGreaterThanOrEqual(100);
    // And the seat's turn is untouched: an audience is one question, not a turn.
    expect(hasEndedTurn(g.state, 1)).toBe(false);
  });

  it('answers a peace paper by signing it, and the war is over at once', () => {
    const g = game();
    openWar(g.state, 0, 1);
    expect(dispatch(g, { type: 'proposePeace', playerId: 0, targetId: 1 }).ok).toBe(true);

    const decision = answerAudience(g, { seatId: 1, askerId: 0 });
    expect(decision).not.toBeNull();
    expect(decision!.command.type).toBe('proposePeace');
    expect(atWar(g.state, 0, 1)).toBe(false);
    expect(hasEndedTurn(g.state, 1)).toBe(false);
  });

  it('leaves a paper put to a person exactly where it was', () => {
    const g = game();
    playerById(g.state, 1)!.gold = 200;
    bumpRevision(g.state);
    expect(applyCommand(g.state, propose(1, 0, { gold: 100 }, {})).ok).toBe(true);
    const before = g.log.length;
    // Seat 0 is a person: nobody may answer for them, and the paper stands.
    expect(answerAudience(g, { seatId: 0, askerId: 1, dealId: g.state.dealProposals[0]!.id }))
      .toBeNull();
    expect(g.state.dealProposals).toHaveLength(1);
    expect(g.log.length).toBe(before);
  });

  it('banks a refusal it dispatched at the table, so the arm does not re-write it', () => {
    // The audience is the third dispatch seam (`driveSeat` and the stepper are
    // the other two) and it feeds the same memory: a bot that sends a paper back
    // at the table has answered it, wherever it was asked.
    const g = game();
    playerById(g.state, 0)!.gold = 10;
    playerById(g.state, 1)!.gold = 200;
    bumpRevision(g.state);
    // A paper that costs far more than it brings: the seat declines it, and the
    // decline is the fact the memory is made of.
    expect(dispatch(g, propose(0, 1, { gold: 1 }, { gold: 100 })).ok).toBe(true);
    const paper = g.state.dealProposals[0]!;
    const decision = answerAudience(g, { seatId: 1, askerId: 0, dealId: paper.id });
    expect(decision!.command.type).toBe('declineDeal');
    expect(dealMemorySize(g.state)).toBe(1);
  });

  it('answers nothing about a paper that was not put to that seat', () => {
    const g = game();
    playerById(g.state, 0)!.gold = 200;
    bumpRevision(g.state);
    applyCommand(g.state, propose(0, 1, { gold: 10 }, {}));
    const paper = g.state.dealProposals[0]!;
    // The asker named wrongly, and a peace asked about a war nobody declared.
    expect(answerAudience(g, { seatId: 1, askerId: 1, dealId: paper.id })).toBeNull();
    expect(answerAudience(g, { seatId: 1, askerId: 0 })).toBeNull();
    expect(g.state.dealProposals).toHaveLength(1);
  });
});

// --- 3. the paper remembers (X4) ---------------------------------------------

/**
 * **The swap bench**: seat 0 is the bot writing papers, seat 1 the empire it
 * writes to, and the ground carries exactly the seams the case is about.
 *
 * Seat 0 always holds **two wine** and no silk and no spices, which is
 * `swapDecision`'s own precondition (a kind held twice, for a kind held none
 * of); what seat 1 holds is the case.
 */
function swapBench(rival: { silk: number; spices?: number }, rivalIsHuman = false): Game {
  const state = bench({ a: false, b: rivalIsHuman });
  const { mine, theirs } = twoTowns(state);
  giveLuxury(state, mine, 2, 3, 'wine');
  giveLuxury(state, mine, 4, 5, 'wine');
  const spots: [number, number][] = [
    [11, 3],
    [13, 5],
    [11, 5],
  ];
  for (let i = 0; i < rival.silk; i++) giveLuxury(state, theirs, spots[i]![0], spots[i]![1], 'silk');
  for (let i = 0; i < (rival.spices ?? 0); i++) {
    const spot = spots[rival.silk + i]!;
    giveLuxury(state, theirs, spot[0], spot[1], 'spices');
  }
  playerById(state, 0)!.gold = 500;
  bumpRevision(state);
  const game = createGame({
    seed: 17,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a', isHuman: rivalIsHuman },
    ],
  });
  // The board is the arranged one; the wrapper is only what `dispatch` needs.
  game.state = state;
  return game;
}

/** What seat 0 says to seat 1 next, or `null` when it has nothing to say. */
function swapPaper(game: Game): BotDecision | null {
  return diplomacyDecision(game.state, playerById(game.state, 0)!, ctxFor(game.state, 0));
}

/** The paper's own two halves, as the command carries them. */
function halves(decision: BotDecision): { give: DealTerms; take: DealTerms } {
  const command = decision.command as unknown as { give: DealTerms; take: DealTerms };
  return { give: command.give, take: command.take };
}

/**
 * The rival sends the standing paper back — **the harness's own two lines**, run
 * by hand.
 *
 * `driveSeat`, the stepper and `answerAudience` all read the pending refusal
 * before the dispatch (the decline takes the row off the register) and bank it
 * after; a test that called neither would be testing a policy against a memory
 * nothing fills. Written out here rather than driven through a harness because
 * the case that matters most is a *person* declining, and a person's decline is
 * dispatched by the interface.
 */
function sendItBack(game: Game): void {
  const row = game.state.dealProposals[0]!;
  const decline = { type: 'declineDeal', playerId: row.to, dealId: row.id } as unknown as Command;
  const pending = pendingDealRefusal(game.state, decline);
  expect(pending).not.toBeNull();
  expect(dispatch(game, decline).ok).toBe(true);
  rememberDealRefusal(game.state, pending!);
}

describe('the paper remembers', () => {
  it('does not write the same swap again the turn after it was sent back', () => {
    // The rival holds one silk and two spices: the silk swap is the one the
    // table's order puts first, and the spices swap is the one still open.
    const game = swapBench({ silk: 1, spices: 2 });
    const first = swapPaper(game)!;
    expect(first.command.type).toBe('proposeDeal');
    expect(halves(first)).toEqual({ give: { luxuries: ['wine'] }, take: { luxuries: ['silk'] } });
    expect(dispatch(game, first.command).ok).toBe(true);
    sendItBack(game);

    const second = swapPaper(game)!;
    // Not the same paper — and not a paper about that seam at all, because coin
    // does not buy a hard clause: the rival's only silk is refused by a rule
    // rather than by a price (`asksOurLastCopy`, read from the other side).
    expect(halves(second)).toEqual({ give: { luxuries: ['wine'] }, take: { luxuries: ['spices'] } });
    const refused = second.candidates.find((row) => row.rejected !== undefined)!;
    expect(refused.rejected).toContain('sent back on turn');
    expect(refused.rejected).toContain('which coin does not buy');
  });

  it('answers its own refusal once, with coin, and says so in the paper’s own terms', () => {
    // Two silks: nothing hard refuses this one, so the seat sweetens it instead.
    const game = swapBench({ silk: 2 });
    const first = swapPaper(game)!;
    expect(halves(first).give.gold).toBeUndefined();
    expect(dispatch(game, first.command).ok).toBe(true);
    const turn = game.state.turn;
    sendItBack(game);

    const second = swapPaper(game)!;
    expect(second.command.type).toBe('proposeDeal');
    // The same swap, over even by the markup — `counterTerms`' own arithmetic,
    // filled on this seat's side and capped by `dealSideError`.
    expect(halves(second).take).toEqual({ luxuries: ['silk'] });
    expect(halves(second).give.luxuries).toEqual(['wine']);
    expect(halves(second).give.gold).toBe(Math.ceil(120 * 1.1) - 120);
    const chosen = second.candidates.find((row) => row.chosen)!;
    expect(
      chosen.terms.some((term) =>
        term.label.includes(`the straight swap was refused on turn ${turn}; sweetened by 12 gold`),
      ),
    ).toBe(true);
    // And the score is still the fold of its terms — the memory's line is worth
    // nothing, because the coin it names is priced two lines above it.
    expect(foldTerms(chosen.terms)).toBe(chosen.score);
    expect(second.summary).toContain('sweetened by 12 gold');

    // The sweetened paper sent back closes the pair: both papers this seat knows
    // how to write have been answered.
    expect(dispatch(game, second.command).ok).toBe(true);
    sendItBack(game);
    expect(swapPaper(game)).toBeNull();
  });

  it('forgets when the rival’s holdings move under the paper', () => {
    const game = swapBench({ silk: 2 });
    const first = swapPaper(game)!;
    expect(dispatch(game, first.command).ok).toBe(true);
    sendItBack(game);
    // Remembered: the next paper is the sweetened one, not the plain swap.
    expect(halves(swapPaper(game)!).give.gold ?? 0).toBeGreaterThan(0);

    // A third seam of the kind the paper asks for. The board that priced the
    // refusal has moved, so the refusal says nothing about the new one.
    const theirs = game.state.cities.find((city) => city.ownerId === 1)!;
    giveLuxury(game.state, theirs, 11, 5, 'silk');
    bumpRevision(game.state);
    expect(resourceCopies(game.state, 1, 'silk')).toBe(3);
    expect(halves(swapPaper(game)!)).toEqual({
      give: { luxuries: ['wine'] },
      take: { luxuries: ['silk'] },
    });
  });

  it('forgets after the turns lapse, and not one turn before', () => {
    const game = swapBench({ silk: 2 });
    const first = swapPaper(game)!;
    expect(dispatch(game, first.command).ok).toBe(true);
    sendItBack(game);
    const stamped = game.state.turn;

    // An absolute stamp compared against the turn, so the reading is the same
    // whether the game got here in one sitting or in twenty.
    game.state.turn = stamped + AI.war.refusalMemoryTurns - 1;
    bumpRevision(game.state);
    expect(halves(swapPaper(game)!).give.gold ?? 0).toBeGreaterThan(0);

    game.state.turn = stamped + AI.war.refusalMemoryTurns;
    bumpRevision(game.state);
    expect(halves(swapPaper(game)!).give.gold).toBeUndefined();
  });

  it('strikes the deal on a board where the swap is mutually profitable', () => {
    // Two duplicates each, of a kind the other lacks — the case the audit's two
    // benches never deal (`resourceCopies` on the asked side is 1 on both).
    const game = swapBench({ silk: 2 });
    const first = swapPaper(game)!;
    expect(dispatch(game, first.command).ok).toBe(true);
    const answer = answerAudience(game, {
      seatId: 1,
      askerId: 0,
      dealId: game.state.dealProposals[0]!.id,
    });
    expect(answer!.command.type).toBe('acceptDeal');
    expect(game.state.deals).toHaveLength(1);
    expect(hasResource(game.state, 0, 'silk')).toBe(true);
    expect(hasResource(game.state, 1, 'wine')).toBe(true);
    // Nothing was remembered: a signed paper is not a refused one.
    expect(dealMemorySize(game.state)).toBe(0);
  });

  it('is one module, and both harnesses fill it at their own dispatch', () => {
    // The stepper is `driveSeat` unrolled (`test/sim/aiDecision.slow.test.ts`
    // pins them byte for byte), so a memory either of them kept privately would
    // be a fifth piece of per-seat state to keep in step. There is one store and
    // it is `dealMemory.ts`': the two loops import it, the policy reads it, and
    // neither holds a table of its own.
    const memory = aiSource('dealMemory.ts');
    expect(memory).toContain('new WeakMap<GameState, RefusalRecord[]>');
    for (const name of ['stepper.ts', 'driver.ts']) {
      const text = aiSource(name);
      expect(text, name).toContain("from './dealMemory'");
      expect(text, name).toContain('pendingDealRefusal(');
      expect(text, name).toContain('rememberDealRefusal(');
      expect(text, name).not.toContain('new WeakMap');
      expect(text, name).not.toContain('new Map<');
    }
    // The policy reads the memory and never writes it: a bot arm that banked a
    // refusal would be banking one for a decision nobody dispatched.
    const policy = aiSource('diplomacy.ts');
    expect(policy).toContain('readDealRefusal');
    expect(policy).not.toContain('rememberDealRefusal');
    // And the knob is the sheet's, read through the seat's own config.
    expect(policy).toContain('war.refusalMemoryTurns');
  });
});
