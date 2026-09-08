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
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { counterRefusal, counterTerms } from '../../src/ai/diplomacy';
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

/**
 * A blank duel on flat grassland: **seat 0 is a person and seat 1 is not**,
 * which is the whole shape of an audience — a player asks, and the client
 * driving the other chair answers.
 */
function bench(): GameState {
  const state = newGame({
    seed: 17,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a' },
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
