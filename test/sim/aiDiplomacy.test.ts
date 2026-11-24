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
import { type BotSitting, botSitting, nextBotDecision, valueContext } from '../../src/ai/bot';
import { dealMemorySize, pendingDealRefusal, rememberDealRefusal } from '../../src/ai/dealMemory';
import type { BotDecision } from '../../src/ai/decision';
import { foldTerms } from '../../src/ai/decision';
import { counterRefusal, counterTerms, diplomacyDecision } from '../../src/ai/diplomacy';
import { answerAudience } from '../../src/ai/driver';
import { applyCommand } from '../../src/sim/commands';
import { type Command } from '../../src/sim/commands';
import { type DealTerms, proposalsFor } from '../../src/sim/deals';
import { foundCityAt, hasResource, lendableCopies, resourceCopies } from '../../src/sim/cities';
import { dealSideError } from '../../src/sim/diplomacy';
import { type Game, dispatch } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  hasEndedTurn,
  playerById,
} from '../../src/sim/state';
import { atWar, openWar } from '../../src/sim/wars';
import { resetVisibility } from '../../src/sim/visibility';
import { createGame, newGame } from './newGameHelpers';

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
    expect(counter!.give.gold).toBe(Math.ceil(AI.war.luxuryGoldBaseline * AI.war.luxuryDuplicateShare * 1.1));
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
 * The shared turn runner and `answerAudience` read the pending refusal before
 * dispatch removes the proposal. They record it after an accepted dispatch.
 * This test does the same for a human seat, whose decline goes through the
 * interface.
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
  it('does not repeat a refused offer without an added payment', () => {
    const game = swapBench({ silk: 1, spices: 2 });
    const first = swapPaper(game)!;
    expect(halves(first)).toEqual({ give: { luxuries: ['wine'] }, take: { luxuries: ['spices'] } });
    expect(dispatch(game, first.command).ok).toBe(true);
    sendItBack(game);
    const second = swapPaper(game)!;
    expect(halves(second).take).toEqual(halves(first).take);
    expect(halves(second).give.gold).toBeGreaterThan(0);
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
    expect(halves(second).give.gold).toBe(Math.ceil(AI.war.luxuryGoldBaseline * AI.war.luxuryDuplicateShare * AI.war.counterMarkup));
    const chosen = second.candidates.find((row) => row.chosen)!;
    expect(
      chosen.terms.some((term) =>
        term.label.includes(`the straight swap was refused on turn ${turn}; sweetened by 6 gold`),
      ),
    ).toBe(true);
    // And the score is still the fold of its terms — the memory's line is worth
    // nothing, because the coin it names is priced two lines above it.
    expect(foldTerms(chosen.terms)).toBe(chosen.score);
    expect(second.summary).toContain('sweetened by 6 gold');

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

  it('shares one refusal store across bot turns, worker replay and audiences', () => {
    const memory = aiSource('dealMemory.ts');
    expect(memory).toContain('new WeakMap<GameState, RefusalRecord[]>');
    for (const name of ['frozenBoard.ts', 'driver.ts']) {
      const text = aiSource(name);
      expect(text, name).toContain("from './dealMemory'");
      expect(text, name).toContain('pendingDealRefusal(');
      expect(text, name).toContain('rememberDealRefusal(');
      expect(text, name).not.toContain('new WeakMap');
    }
    const stepper = aiSource('stepper.ts');
    expect(stepper).toContain('runBotTurn(');
    expect(stepper).not.toContain('rememberDealRefusal');
    // The policy reads the memory and never writes it: a bot arm that banked a
    // refusal would be banking one for a decision nobody dispatched.
    const policy = aiSource('diplomacy.ts');
    expect(policy).toContain('readDealRefusal');
    expect(policy).not.toContain('rememberDealRefusal');
    // And the knob is the sheet's, read through the seat's own config.
    expect(policy).toContain('war.refusalMemoryTurns');
  });
});

describe('a seat under The Forbidden Silks (batch DT7)', () => {
  it('writes no swap, because a swap lends a luxury', () => {
    const game = swapBench({ silk: 2 });
    expect(swapPaper(game)?.command.type).toBe('proposeDeal');
    const fresh = swapBench({ silk: 2 });
    playerById(fresh.state, 0)!.statecraft.doctrines.push('theForbiddenSilks' as never);
    bumpRevision(fresh.state);
    const paper = swapPaper(fresh);
    expect(paper === null || paper.command.type !== 'proposeDeal').toBe(true);
  });

  it('is not asked for its luxury in a swap from another seat', () => {
    const game = swapBench({ silk: 1 });
    playerById(game.state, 1)!.statecraft.doctrines.push('theForbiddenSilks' as never);
    bumpRevision(game.state);
    const paper = swapPaper(game);
    expect(paper === null || paper.command.type !== 'proposeDeal').toBe(true);
  });

  it('counters in coin alone, where it would otherwise offer a spare seam', () => {
    const state = bench();
    const { theirs } = twoTowns(state);
    giveLuxury(state, theirs, 11, 3, 'silk');
    giveLuxury(state, theirs, 13, 5, 'silk');
    playerById(state, 0)!.gold = 400;
    playerById(state, 1)!.gold = 100;
    playerById(state, 1)!.statecraft.doctrines.push('theForbiddenSilks' as never);
    bumpRevision(state);

    const counter = counterTerms(state, 1, 0, { gold: 400 }, {}, ctxFor(state, 1));
    expect(counter).not.toBeNull();
    expect(counter!.take.luxuries ?? []).toEqual([]);
    expect(dealSideError(state, 1, 0, counter!.take, false)).toBeNull();
  });
});

// --- 4. a paper the receiver signs (bot batch BP13) ---------------------------

/**
 * **Seat 0's next paper, with the receivers' own readings** (bot batch BP13):
 * the harness's door, where the swap arm asks each bot rival's own verdict
 * before it writes.
 */
function signedPaper(game: Game): BotDecision | null {
  const state = game.state;
  return diplomacyDecision(state, playerById(state, 0)!, ctxFor(state, 0));
}

/**
 * Three seats, one town each along a row, for the papers already standing:
 * seat 0 holds two wine, seats 1 and 2 two silk each.
 */
function threeSeats(): Game {
  const game = createGame({
    seed: 17,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
      { name: 'Cato', color: '#0a0' },
    ],
  });
  const state = game.state;
  state.map = createMap({ width: 24, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(24 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const towns = [3, 12, 21].map((col, seat) => {
    const town = foundCityAt(state, seat, at(state.map, col, 4));
    claimBlock(state, town, [col - 1, col, col + 1], [3, 4, 5]);
    return town;
  });
  giveLuxury(state, towns[0]!, 2, 3, 'wine');
  giveLuxury(state, towns[0]!, 4, 5, 'wine');
  giveLuxury(state, towns[1]!, 11, 3, 'silk');
  giveLuxury(state, towns[1]!, 13, 5, 'silk');
  giveLuxury(state, towns[2]!, 20, 3, 'silk');
  giveLuxury(state, towns[2]!, 22, 5, 'silk');
  bumpRevision(state);
  return game;
}

describe('a bot puts a paper to a bot only when the receiver\'s own reading signs it', () => {
  it('does not ask a bot for its only copy, and writes the swap it would sign', () => {
    // The plain arm writes the silk swap first (`does not write the same swap
    // again…` above); the receiver holds one silk, and its own last-copy clause
    // would send it back.
    const game = swapBench({ silk: 1, spices: 2 });
    const paper = signedPaper(game)!;
    expect(halves(paper)).toEqual({ give: { luxuries: ['wine'] }, take: { luxuries: ['spices'] } });
    const refused = paper.candidates.find((row) => row.rejected !== undefined)!;
    expect(refused.rejected).toContain('without a spare copy');
  });

  it('and the receiver signs what was written', () => {
    const game = swapBench({ silk: 2 });
    const paper = signedPaper(game)!;
    expect(paper.command.type).toBe('proposeDeal');
    expect(dispatch(game, paper.command).ok).toBe(true);
    const answer = answerAudience(game, { seatId: 1, askerId: 0, dealId: game.state.dealProposals[0]!.id });
    expect(answer!.command.type).toBe('acceptDeal');
  });

  it('writes nothing to a bot that holds one copy of everything asked', () => {
    const game = swapBench({ silk: 1 });
    const paper = signedPaper(game);
    expect(paper === null || paper.command.type !== 'proposeDeal').toBe(true);
  });

  it('protects a human recipient’s last copy too', () => {
    const game = swapBench({ silk: 1, spices: 2 }, true);
    const paper = signedPaper(game)!;
    expect(halves(paper)).toEqual({ give: { luxuries: ['wine'] }, take: { luxuries: ['spices'] } });
  });

  /**
   * Bot batch BP16 (the audit's finding 23): the writer asks the receiver's
   * verdict with no prices, because on a bot's swap the two terms that read the
   * receiver's prices only make the paper better for it. This board gives the
   * receiver both cards that price a deal (The Treaty Ports counts deal
   * partners, Export Guilds counts lent copies), so its own answer, on its own
   * full context, prints both terms. It still signs exactly what was written.
   * If a paper term ever costs the receiver by its prices, it sends this paper
   * back, and `receiverReader` must take the receiver's context again.
   */
  it('writes only what the receiver signs on its own prices, when its cards price the deal', () => {
    const game = swapBench({ silk: 2 });
    const receiver = playerById(game.state, 1)!;
    for (const card of ['theTreatyPorts', 'exportGuilds']) {
      receiver.statecraft.orders.push(card as never);
      receiver.statecraft.slots.push({ card: card as never, sealedUntil: game.state.turn });
    }
    bumpRevision(game.state);
    const paper = signedPaper(game)!;
    expect(paper.command.type).toBe('proposeDeal');
    expect(dispatch(game, paper.command).ok).toBe(true);
    const answer = answerAudience(game, { seatId: 1, askerId: 0, dealId: game.state.dealProposals[0]!.id })!;
    expect(answer.command.type).toBe('acceptDeal');
    const words = JSON.stringify(answer.candidates);
    expect(words).toContain('a new deal partner, which this seat’s cards count');
    expect(words).toContain('less what the copies lent pay this seat’s cards');
  });
});

describe('the papers already standing (bot batch BP13)', () => {
  it('does not promise one copy twice, nor ask for a kind it has already asked for', () => {
    const game = threeSeats();
    const first = signedPaper(game)!;
    expect(first.command).toMatchObject({ type: 'proposeDeal', targetId: 1 });
    expect(dispatch(game, first.command).ok).toBe(true);
    // Two wine, one already offered to seat 1: the second would be its last.
    // And silk is already asked for. So nothing goes to seat 2.
    const second = signedPaper(game);
    expect(second === null || second.command.type !== 'proposeDeal').toBe(true);
  });

  it('leaves a receiver alone when another paper already asks it for the same kind', () => {
    const game = threeSeats();
    // Seat 2 has asked seat 1 for silk already; seat 1 holds two, so after that
    // paper it would hold one, and its own clause would refuse to lend it.
    const theirs = game.state.cities.find((city) => city.ownerId === 2)!;
    giveLuxury(game.state, theirs, 21, 3, 'spices');
    giveLuxury(game.state, theirs, 22, 3, 'spices');
    bumpRevision(game.state);
    expect(
      dispatch(game, {
        type: 'proposeDeal',
        playerId: 2,
        targetId: 1,
        give: { luxuries: ['spices'] },
        take: { luxuries: ['silk'] },
      } as unknown as Command).ok,
    ).toBe(true);
    const paper = signedPaper(game)!;
    // Seat 0 asks seat 2 instead, which still holds two silk.
    expect(paper.command).toMatchObject({ type: 'proposeDeal', targetId: 2 });
    const crowded = paper.candidates.find((row) => (row.rejected ?? '').includes('another empire'));
    expect(crowded?.rejected).toContain('already asks the');
  });
});

// --- diplomacy once a sitting (bot batch BP16) ------------------------------

describe('diplomacy is asked until it has nothing to say, once a sitting (bot batch BP16)', () => {
  /** Seat 1's sitting, driven to its end: the decisions it sent. */
  function sit(game: Game, sitting: BotSitting): BotDecision[] {
    const sent: BotDecision[] = [];
    for (let step = 0; step < 80; step++) {
      const decision = nextBotDecision(game.state, 1, sitting);
      if (decision === null) break;
      sent.push(decision);
      expect(dispatch(game, decision.command).ok).toBe(true);
    }
    return sent;
  }

  it('answers every paper on the table in the same sitting, and asks no more once it is quiet', () => {
    // Seat 1 holds two silk. Seats 0 and 2 each put it a paper before its
    // sitting, as earlier seats in the turn do.
    const game = threeSeats();
    const theirs = game.state.cities.find((city) => city.ownerId === 2)!;
    giveLuxury(game.state, theirs, 21, 3, 'spices');
    giveLuxury(game.state, theirs, 22, 3, 'spices');
    bumpRevision(game.state);
    for (const [by, give] of [
      [0, 'wine'],
      [2, 'spices'],
    ] as const) {
      const paper = { type: 'proposeDeal', playerId: by, targetId: 1, give: { luxuries: [give] }, take: { luxuries: ['silk'] } };
      expect(dispatch(game, paper as unknown as Command).ok).toBe(true);
    }
    const sitting = botSitting(1);
    const sent = sit(game, sitting);
    const answers = sent.filter((decision) => decision.command.type === 'acceptDeal' || decision.command.type === 'declineDeal');
    expect(answers.length).toBe(2);
    expect(proposalsFor(game.state, 1).filter((row) => row.to === 1)).toEqual([]);
    expect(sitting.closed.has('diplomacy')).toBe(true);
  });

  it('leaves a paper that reaches it after it fell quiet for its next sitting', () => {
    const game = threeSeats();
    const sitting = botSitting(1);
    // Decide until diplomacy has been asked and had nothing to say. The arms
    // before it (the offers, the purse) may answer the first decisions.
    for (let step = 0; step < 20 && !sitting.closed.has('diplomacy'); step++) {
      const decision = nextBotDecision(game.state, 1, sitting);
      if (decision === null) break;
      expect(dispatch(game, decision.command).ok).toBe(true);
    }
    expect(sitting.closed.has('diplomacy')).toBe(true);
    const theirs = game.state.cities.find((city) => city.ownerId === 2)!;
    giveLuxury(game.state, theirs, 21, 3, 'spices');
    giveLuxury(game.state, theirs, 22, 3, 'spices');
    bumpRevision(game.state);
    const paper = { type: 'proposeDeal', playerId: 2, targetId: 1, give: { luxuries: ['spices'] }, take: { luxuries: ['silk'] } };
    expect(dispatch(game, paper as unknown as Command).ok).toBe(true);
    expect(sit(game, sitting).some((decision) => decision.command.type === 'acceptDeal' || decision.command.type === 'declineDeal')).toBe(false);
    // A new sitting answers it.
    const next = nextBotDecision(game.state, 1, botSitting(1));
    expect(next?.command.type === 'acceptDeal' || next?.command.type === 'declineDeal').toBe(true);
  });
});

// --- a borrowed luxury cannot be lent on (bot batch BP13c) -------------------

/** A live loan of one luxury from `from` to `to`, written into the register as a signed deal leaves it. */
function loan(state: GameState, from: number, to: number, id: 'silk' | 'wine' | 'spices'): void {
  const [a, b] = from < to ? [from, to] : [to, from];
  const gives = { luxuries: [id] };
  state.deals.push({
    id: 800 + state.deals.length,
    a,
    b,
    terms: { a: from === a ? gives : {}, b: from === b ? gives : {} },
    untilTurn: state.turn + 20,
  });
  bumpRevision(state);
}

/**
 * Four bot seats, one town each along a row. Seat 0 holds two wine, both on
 * loan (from seats 1 and 2, who dig their own). Seat 3 holds two silk and no
 * wine, so it is the one seat a wine swap could be put to.
 */
function borrowedWine(ownWine: number): Game {
  const game = createGame({
    seed: 17,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
      { name: 'Cato', color: '#0a0' },
      { name: 'Dido', color: '#aa0' },
    ],
  });
  const state = game.state;
  state.map = createMap({ width: 32, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(32 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const towns = [3, 11, 19, 27].map((col, seat) => {
    const town = foundCityAt(state, seat, at(state.map, col, 4));
    claimBlock(state, town, [col - 1, col, col + 1], [3, 4, 5]);
    return town;
  });
  for (let i = 0; i < ownWine; i++) giveLuxury(state, towns[0]!, 2 + 2 * i, 3, 'wine');
  giveLuxury(state, towns[1]!, 10, 3, 'wine');
  giveLuxury(state, towns[2]!, 18, 3, 'wine');
  giveLuxury(state, towns[3]!, 26, 3, 'silk');
  giveLuxury(state, towns[3]!, 28, 5, 'silk');
  loan(state, 1, 0, 'wine');
  loan(state, 2, 0, 'wine');
  return game;
}

describe('a bot never lends a borrowed copy (bot batch BP13c)', () => {
  it('offers no wine it holds twice when both copies are on loan', () => {
    const game = borrowedWine(0);
    const state = game.state;
    expect(resourceCopies(state, 0, 'wine')).toBe(2);
    expect(lendableCopies(state, 0, 'wine')).toBe(0);
    const paper = signedPaper(game);
    const gives = paper?.command.type === 'proposeDeal' ? halves(paper).give.luxuries ?? [] : [];
    expect(gives).not.toContain('wine');
  });

  it('lends its own wine when it holds one beside the loans, and the rules take the paper', () => {
    const game = borrowedWine(1);
    const state = game.state;
    expect(resourceCopies(state, 0, 'wine')).toBe(3);
    expect(lendableCopies(state, 0, 'wine')).toBe(1);
    const paper = signedPaper(game)!;
    expect(paper.command).toMatchObject({ type: 'proposeDeal', targetId: 3 });
    expect(halves(paper)).toEqual({ give: { luxuries: ['wine'] }, take: { luxuries: ['silk'] } });
    expect(dispatch(game, paper.command).ok).toBe(true);
    const answer = answerAudience(game, { seatId: 3, askerId: 0, dealId: state.dealProposals[0]!.id });
    expect(answer!.command.type).toBe('acceptDeal');
    // Its own copy went; the two it uses are still the loans, and they stay.
    expect(lendableCopies(state, 0, 'wine')).toBe(0);
    expect(resourceCopies(state, 0, 'wine')).toBe(2);
  });

  it('counters with a copy of its own and never with a borrowed one', () => {
    // A person (seat 0) asks the bot (seat 1) what it would give for coin. The
    // bot holds two silk, both on loan from seat 2, and two spices of its own.
    const state = newGame({
      seed: 17,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true },
        { name: 'Bors', color: '#00a' },
        { name: 'Cato', color: '#0a0' },
      ],
    });
    state.map = createMap({ width: 24, height: 10, terrain: 'grassland' });
    resetVisibility(state);
    state.tileOwner = new Array<number | null>(24 * 10).fill(null);
    state.units = [];
    state.cities = [];
    state.camps = [];
    state.nextEntityId = 1;
    const towns = [3, 12, 21].map((col, seat) => {
      const town = foundCityAt(state, seat, at(state.map, col, 4));
      claimBlock(state, town, [col - 1, col, col + 1], [3, 4, 5]);
      return town;
    });
    giveLuxury(state, towns[1]!, 11, 3, 'spices');
    giveLuxury(state, towns[1]!, 13, 5, 'spices');
    giveLuxury(state, towns[2]!, 20, 3, 'silk');
    giveLuxury(state, towns[2]!, 22, 5, 'silk');
    loan(state, 2, 1, 'silk');
    loan(state, 2, 1, 'silk');
    playerById(state, 0)!.gold = 400;
    playerById(state, 1)!.gold = 0;
    bumpRevision(state);
    expect(resourceCopies(state, 1, 'silk')).toBe(2);
    expect(lendableCopies(state, 1, 'silk')).toBe(0);

    const counter = counterTerms(state, 1, 0, { gold: 400 }, {}, ctxFor(state, 1));
    expect(counter).not.toBeNull();
    expect(counter!.take.luxuries ?? []).not.toContain('silk');
    expect(counter!.take.luxuries ?? []).toContain('spices');
    expect(dealSideError(state, 1, 0, counter!.take, false)).toBeNull();
  });
});
