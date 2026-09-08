/**
 * The faith ladder: the pantheon dealt by a bank rather than by an errand
 * (schema 71, ruled 2026-09-06 — `docs/history/fewer-things.md` §3, `docs/fewer-things-plan.md` C1).
 *
 * A consecration used to be an augur bought for forty faith, walked to a town
 * and spent. The errand is gone: faith accumulates the way culture does, and
 * when the bank crosses the next rung the same belief hand is dealt — drawn
 * once, paid for out of the bank at the *deal*, and spent by the same
 * `chooseBelief` command.
 *
 * What is pinned here is the whole of that sentence, in the order a player meets
 * it: the rungs' arithmetic, the moment an offer opens, the moment the bank is
 * charged, the three rungs and the slot gate that stops a fourth, and the two
 * refusals that must leave the state byte-identical.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import {
  faithRungCost,
  hasOpenBeliefSlot,
  openFaithLadder,
  pantheonSlots,
  planFaithRung,
} from '../../src/sim/religion';
import { RELIGION } from '../../src/sim/religionData';
import { type GameState, playerById, bumpRevision } from '../../src/sim/state';

// --- harness ----------------------------------------------------------------

function game(seed = 7) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

function found(state: GameState, playerId: number) {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

function learn(state: GameState, playerId: number, ...techs: string[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) {
    if (!player.techsResearched.includes(tech as never)) {
      player.techsResearched.push(tech as never);
      bumpRevision(state);
    }
  }
}

/** A seat with the first two pantheon slots open and a bank of `faith`. */
function believer(seed = 7, faith = 0) {
  const g = game(seed);
  found(g.state, 0);
  learn(g.state, 0, 'divination');
  playerById(g.state, 0)!.faithPool = faith;
  bumpRevision(g.state);
  return g;
}

// --- the rungs --------------------------------------------------------------

describe('the ladder’s arithmetic', () => {
  it('wears the augur’s old price ladder: 40, +15 a rung, at a slight exponent', () => {
    // The ruled numbers (`docs/history/fewer-things.md` §6 item 5). The augur cost 40
    // with 15 more for each one already called — 40 · 55 · 70, 165 all told —
    // and the ladder reproduces it to within three faith across three rungs.
    expect(faithRungCost(0)).toBe(40);
    expect(faithRungCost(1)).toBe(56);
    expect(faithRungCost(2)).toBe(72);
    expect(faithRungCost(0) + faithRungCost(1) + faithRungCost(2)).toBe(168);
    expect(RELIGION.ladder).toEqual({ costBase: 40, costLinear: 15, costExponent: 1.5 });
  });

  it('is a whole number at every rung, and never falls', () => {
    let last = -1;
    for (let rung = 0; rung < 12; rung++) {
      const cost = faithRungCost(rung);
      expect(Number.isInteger(cost), String(rung)).toBe(true);
      expect(cost).toBeGreaterThan(last);
      last = cost;
    }
    // A negative or fractional count is the caller's mistake, not a price.
    expect(faithRungCost(-3)).toBe(faithRungCost(0));
    expect(faithRungCost(1.9)).toBe(faithRungCost(1));
  });
});

// --- the offer --------------------------------------------------------------

describe('the offer the ladder opens', () => {
  it('opens the moment the bank covers the rung, and not a faith before', () => {
    const g = believer(7, faithRungCost(0) - 1);
    const player = playerById(g.state, 0)!;
    expect(planFaithRung(g.state, player)).toBeNull();
    openFaithLadder(g.state);
    expect(player.pantheon.pending).toBeUndefined();

    player.faithPool += 1;
    expect(planFaithRung(g.state, player)).toEqual({ rung: 1, cost: 40 });
    openFaithLadder(g.state);
    expect(player.pantheon.pending?.options.length).toBeGreaterThan(0);
    // It carries the price it quoted, which is what makes it the ladder's.
    expect(player.pantheon.pending?.rungCost).toBe(40);
  });

  it('opens nothing while a belief offer is already outstanding', () => {
    const g = believer(7, 500);
    const player = playerById(g.state, 0)!;
    openFaithLadder(g.state);
    const first = player.pantheon.pending;
    expect(first).toBeDefined();
    // A second sweep on a bank deep enough for two rungs deals nothing: a hand
    // dealt on top of the first would silently destroy it.
    openFaithLadder(g.state);
    expect(player.pantheon.pending).toBe(first);
    // One rung climbed and paid — the first deal's — and not a second.
    expect(player.pantheon.rungs).toBe(1);
    expect(player.faithPool).toBe(500 - 40);
  });

  it('opens nothing for an empire with no room in its pantheon', () => {
    const g = game();
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    bumpRevision(g.state);
    // No Divination: no slots, so the ladder has nowhere to put a god.
    expect(pantheonSlots(g.state, 0)).toBe(0);
    expect(hasOpenBeliefSlot(g.state, 0)).toBe(false);
    openFaithLadder(g.state);
    expect(player.pantheon.pending).toBeUndefined();
  });

  it('never deals to the wild', () => {
    const g = believer(7, 500);
    const wild = g.state.players.find((player) => player.barbarian);
    if (wild) {
      wild.faithPool = 500;
      bumpRevision(g.state);
      openFaithLadder(g.state);
      expect(wild.pantheon.pending).toBeUndefined();
    }
  });

  it('deals the same hand from the same seed', () => {
    const a = believer(11, 200);
    const b = believer(11, 200);
    openFaithLadder(a.state);
    openFaithLadder(b.state);
    expect(playerById(a.state, 0)!.pantheon.pending).toEqual(
      playerById(b.state, 0)!.pantheon.pending,
    );
  });
});

// --- the pick pays ----------------------------------------------------------

describe('the deal spends the bank', () => {
  // **Re-ruled 2026-09-06, evening** (the user: "it should auto-draft a
  // pantheon once you reach the requisite faith. It subtracts that amount from
  // your faith total"): the rung is spent and climbed the moment the hand is
  // dealt — the culture meter's own shape — and the pick charges nothing. The
  // block used to say "the pick spends the bank"; the bank is spent one command
  // earlier now, and the offer's `rungCost` is the record of it.
  it('takes exactly the rung the offer quoted at the deal, and climbs one rung', () => {
    const g = believer(7, 100);
    const player = playerById(g.state, 0)!;
    openFaithLadder(g.state);
    expect(player.faithPool).toBe(100 - 40);
    expect(player.pantheon.rungs).toBe(1);
    expect(player.pantheon.pending?.rungCost).toBe(40);
    // And the pick takes nothing more.
    expect(dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command).ok)
      .toBe(true);
    expect(player.faithPool).toBe(100 - 40);
    expect(player.pantheon.rungs).toBe(1);
    expect(player.pantheon.beliefs).toHaveLength(1);
    // And the next rung is dearer, which is the whole of the ladder.
    expect(faithRungCost(player.pantheon.rungs)).toBe(56);
  });

  it('charges a hand with no rung nothing at the pick either — a prophet’s, a founding’s second', () => {
    const g = believer(7, 100);
    const player = playerById(g.state, 0)!;
    openFaithLadder(g.state);
    // The ladder paid at the deal; strip its record and the pick still asks
    // nothing — there is no second bill anywhere.
    delete player.pantheon.pending!.rungCost;
    expect(dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command).ok)
      .toBe(true);
    expect(player.faithPool).toBe(100 - 40);
    expect(player.pantheon.rungs).toBe(1);
  });

  it('is unmoved by faith spent between deal and pick — the bank was charged at the deal', () => {
    const g = believer(7, 60);
    const player = playerById(g.state, 0)!;
    openFaithLadder(g.state);
    expect(player.faithPool).toBe(60 - 40);
    // A purchase can still empty the bank inside the End Turn window; the god
    // is still taken and nothing more is asked.
    player.faithPool = 5;
    bumpRevision(g.state);
    expect(dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command).ok)
      .toBe(true);
    expect(player.faithPool).toBe(5);
    expect(player.pantheon.rungs).toBe(1);
  });
});

// --- three rungs, and no fourth ---------------------------------------------

describe('three rungs and the slot that stops the fourth', () => {
  it('deals two on Divination, a third on The High Temple, and never a fourth', () => {
    const g = believer(7, 10_000);
    const player = playerById(g.state, 0)!;
    const climb = (): boolean => {
      openFaithLadder(g.state);
      if (player.pantheon.pending === undefined) return false;
      expect(dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command).ok)
        .toBe(true);
      return true;
    };

    expect(climb()).toBe(true);
    expect(climb()).toBe(true);
    // Two slots is all Divination opens, so the third rung waits on the tech
    // even with a bank that could pay for ten.
    expect(climb()).toBe(false);
    expect(player.pantheon.rungs).toBe(2);

    learn(g.state, 0, 'theHighTemple');
    expect(climb()).toBe(true);
    expect(player.pantheon.rungs).toBe(3);
    expect(player.pantheon.beliefs).toHaveLength(3);

    // And no fourth: the pantheon is full and the ladder never learns a number.
    expect(climb()).toBe(false);
    expect(hasOpenBeliefSlot(g.state, 0)).toBe(false);
    expect(player.pantheon.rungs).toBe(3);
  });
});

// --- the refusals -----------------------------------------------------------

describe('a refused pick leaves the state byte-identical', () => {
  it('refuses an index nobody was dealt, and touches nothing', () => {
    const g = believer(7, 100);
    openFaithLadder(g.state);
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'chooseBelief',
      playerId: 0,
      optionIndex: 99,
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('refuses a pick from a seat with no offer, and touches nothing', () => {
    const g = believer(7, 10);
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'chooseBelief',
      playerId: 0,
      optionIndex: 0,
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });
});
