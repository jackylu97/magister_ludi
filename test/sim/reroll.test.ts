/**
 * The reroll: faith buys another hand (schema 71, ruled 2026-09-06 —
 * `docs/history/fewer-things.md` §1's *"the dice go entirely; faith rerolls a draft"*).
 *
 * Three claims, and the file is in that order:
 *
 *   · **the price**, which is base × the age × the exponent per reroll taken,
 *     printed as an ordered list of differences whose fold *is* the figure — so
 *     the button's number and the bank's charge cannot disagree;
 *   · **the redeal**, drawn inside the command from `state.rng`, so the same
 *     seed rerolls to the same hand and a replay is a replay;
 *   · **what it deliberately leaves alone** — the pity a pass banks, the meter
 *     the draft spent, and a belief hand's price, which is nothing.
 *
 * The tally the shrine engine reads (`SlottedOrder.rerollsSeen`) is written here
 * and nowhere else, so it is pinned here too.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import {
  drawBeliefOffer,
  explainRerollCost,
  explainBeliefRerollCost,
  nextBeliefRerollCost,
  nextRerollCost,
  openFaithLadder,
  rerollError,
  rerollKindFor,
  settleReroll,
} from '../../src/sim/religion';
import { RELIGION } from '../../src/sim/religionData';
import { drawOrderOffer } from '../../src/sim/statecraft';
import { slotLayout } from '../../src/sim/statecraftData';
import { type GameState, playerById } from '../../src/sim/state';
import { ABILITY_TECH } from '../../src/sim/techData';

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
    }
  }
}

/** The technology that opens the door, read through the ability so a move moves this. */
function openTheDoor(state: GameState, playerId: number): void {
  const gate = ABILITY_TECH.get(RELIGION.reroll.ability);
  if (gate !== undefined) learn(state, playerId, gate);
}

/** A seat holding an Order draft, with the door open and a bank of `faith`. */
function drafting(seed = 7, faith = 500) {
  const g = game(seed);
  found(g.state, 0);
  openTheDoor(g.state, 0);
  const player = playerById(g.state, 0)!;
  player.faithPool = faith;
  player.statecraft.pendingOrder = drawOrderOffer(g.state, player);
  return g;
}

// --- the price --------------------------------------------------------------

describe('what a reroll costs', () => {
  it('starts at the ruled thirty-five and folds to its own lines', () => {
    const g = drafting();
    const price = explainRerollCost(g.state, 0);
    expect(RELIGION.reroll.base).toBe(35);
    expect(price.total).toBe(35);
    expect(price.lines).toEqual([{ source: 'A fresh hand', amount: 35 }]);
    // Rule 5, for a price: the fold *is* the figure.
    expect(price.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(price.total);
  });

  it('rises by the exponent for every reroll already taken', () => {
    const g = drafting();
    const sc = playerById(g.state, 0)!.statecraft;
    const seen: number[] = [];
    for (let taken = 0; taken < 6; taken++) {
      sc.rerollsTaken = taken;
      seen.push(nextRerollCost(g.state, 0));
    }
    expect(seen).toEqual([35, 47, 63, 86, 116, 156]);
    // And the rise is a line of its own, so the button can say why.
    sc.rerollsTaken = 2;
    const price = explainRerollCost(g.state, 0);
    expect(price.lines).toEqual([
      { source: 'A fresh hand', amount: 35 },
      { source: '2 rerolls already taken', amount: 28 },
    ]);
  });

  it('rises again with the age, named by its numeral', () => {
    const g = drafting();
    const player = playerById(g.state, 0)!;
    // Æra III: `highestAge` reads the deepest node held.
    learn(g.state, 0, 'ironWorking');
    expect(nextRerollCost(g.state, 0)).toBe(56);
    expect(explainRerollCost(g.state, 0).lines).toEqual([
      { source: 'A fresh hand', amount: 35 },
      { source: 'Æra III', amount: 21 },
    ]);
    // Both riders at once, folded in one order and floored once.
    player.statecraft.rerollsTaken = 3;
    expect(nextRerollCost(g.state, 0)).toBe(137);
    expect(explainRerollCost(g.state, 0).lines.reduce((s, l) => s + l.amount, 0)).toBe(137);
  });
});

// --- the refusals -----------------------------------------------------------

describe('when a reroll is refused', () => {
  it('refuses a seat with no draft on the table', () => {
    const g = game();
    found(g.state, 0);
    openTheDoor(g.state, 0);
    playerById(g.state, 0)!.faithPool = 500;
    expect(rerollKindFor(playerById(g.state, 0)!)).toBeNull();
    expect(rerollError(g.state, 0)).toContain('no draft');
  });

  it('refuses a seat whose calendars have not opened the door', () => {
    const g = game();
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    player.statecraft.pendingOrder = drawOrderOffer(g.state, player);
    expect(rerollError(g.state, 0)).toBe('Your calendars cannot yet call for a second reading');
  });

  it('refuses a bank that cannot pay, and says both figures', () => {
    const g = drafting(7, 12);
    expect(rerollError(g.state, 0)).toBe('A second reading asks 35 faith and Ada has 12');
  });

  it('leaves the state byte-identical when it refuses — generator included', () => {
    const g = drafting(7, 12);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });
});

// --- the redeal -------------------------------------------------------------

describe('the redeal', () => {
  it('replaces the hand, charges the bank and counts the reroll', () => {
    const g = drafting(7, 500);
    const player = playerById(g.state, 0)!;
    const first = player.statecraft.pendingOrder!.options;
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(player.faithPool).toBe(500 - 35);
    expect(player.statecraft.rerollsTaken).toBe(1);
    expect(player.statecraft.pendingOrder?.options).not.toBe(first);
    expect(player.statecraft.pendingOrder?.options.length).toBe(first.length);
    // And the next one is dearer, which the button prints before the click.
    expect(nextRerollCost(g.state, 0)).toBe(47);
  });

  it('deals the same replacement hand from the same seed', () => {
    const a = drafting(11, 500);
    const b = drafting(11, 500);
    expect(dispatch(a, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(dispatch(b, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(playerById(a.state, 0)!.statecraft.pendingOrder).toEqual(
      playerById(b.state, 0)!.statecraft.pendingOrder,
    );
  });

  it('leaves the pity and the tier exactly where they were', () => {
    const g = drafting(7, 500);
    const sc = playerById(g.state, 0)!.statecraft;
    sc.orderSkips = 3;
    sc.drafts = 6;
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    // A pass banks pity; paying for another hand is the opposite bargain.
    expect(sc.orderSkips).toBe(3);
    expect(sc.drafts).toBe(6);
  });

  it('refuses a seat that has ended its turn', () => {
    const g = drafting(7, 500);
    g.state.turnEnded[0] = true;
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });
});

// --- the tally the shrine engine reads --------------------------------------

describe('the reroll tally', () => {
  it('raises the count on every card in a chair, and on no card on the bench', () => {
    const g = drafting(7, 500);
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    const index = slotLayout(sc.government).indexOf('wildcard');
    const seated = 'theArchives' as (typeof sc.orders)[number];
    const benched = 'theAnnalsOfLaw' as (typeof sc.orders)[number];
    sc.orders.push(seated, benched);
    sc.slots[index] = { card: seated, sealedUntil: g.state.turn };

    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(sc.slots[index]?.rerollsSeen).toBe(1);
    // A second, and it accumulates on the chair.
    sc.pendingOrder = drawOrderOffer(g.state, player);
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(sc.slots[index]?.rerollsSeen).toBe(2);
    // The bench watched nothing: the card is held, not seated.
    expect(sc.orders).toContain(benched);
    expect(sc.slots.some((slot) => slot?.card === benched)).toBe(false);
  });
});

// --- the free hand ----------------------------------------------------------

describe('a belief hand’s own ladder', () => {
  // **Re-ruled 2026-09-06, evening** (the user: "make the first reroll free and
  // the following ones cost faith… Prophet rolls should work the same way…
  // Prophet re-rolls reset per roll, and are entirely separate from order
  // drafts"). Every belief hand — the ladder's, a prophet's, a founding's —
  // wears its own count (`BeliefOffer.rerolls`): the first asking is free, the
  // next is the Order draft's base and age multiplier raised to the paid
  // askings on this hand, no door, and `rerollsTaken` never moves.
  it('asks nothing the first time, raises no Order count and redeals the gods', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    player.pantheon.pending = drawBeliefOffer(g.state, player);
    expect(rerollKindFor(player)).toBe('belief');
    expect(rerollError(g.state, 0)).toBeNull();
    expect(explainBeliefRerollCost(g.state, 0)).toEqual({ lines: [], total: 0 });

    const first = player.pantheon.pending.options;
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(player.faithPool).toBe(500);
    expect(player.statecraft.rerollsTaken).toBe(0);
    expect(player.pantheon.pending?.rerolls).toBe(1);
    expect(player.pantheon.pending?.options).not.toBe(first);
  });

  it('prices the second asking on the hand’s own count, through no door, and the pick pays nothing', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 200;
    openFaithLadder(g.state);
    // The rung was paid at the deal; the hand carries the record.
    expect(player.pantheon.pending?.rungCost).toBe(40);
    expect(player.faithPool).toBe(160);
    // No door on the gods: the calendars gate Order hands only.
    expect(player.techsResearched).not.toContain(ABILITY_TECH.get(RELIGION.reroll.ability)!);
    expect(rerollError(g.state, 0)).toBeNull();
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(player.faithPool).toBe(160);
    // The second asking is priced: the base at Æra I, one paid asking's worth
    // of exponent — 35 — and nothing of the Order ladder moves.
    const price = nextBeliefRerollCost(g.state, 0);
    expect(price).toBe(RELIGION.reroll.base);
    expect(explainBeliefRerollCost(g.state, 0).lines.map((line) => line.source))
      .toContain('Asking the gods again');
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(player.faithPool).toBe(160 - price);
    expect(player.pantheon.pending?.rerolls).toBe(2);
    expect(player.statecraft.rerollsTaken).toBe(0);
    expect(nextRerollCost(g.state, 0)).toBe(RELIGION.reroll.base);
    // A third asking climbs the hand's ladder.
    expect(nextBeliefRerollCost(g.state, 0))
      .toBe(Math.floor(RELIGION.reroll.base * RELIGION.reroll.exponent));
    // The rung rides through every redeal, and the pick asks nothing more.
    expect(player.pantheon.pending?.rungCost).toBe(40);
    expect(dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command).ok)
      .toBe(true);
    expect(player.faithPool).toBe(160 - price);
    expect(player.pantheon.rungs).toBe(1);
  });

  it('refuses a paid asking the bank cannot cover, and touches nothing', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 40;
    openFaithLadder(g.state);
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(player.faithPool).toBe(0);
    expect(rerollError(g.state, 0)).toMatch(/^Asking again costs \d+ faith/);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('starts every hand’s count afresh — a prophet’s reroll resets per roll', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    openFaithLadder(g.state);
    dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command);
    dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command);
    expect(player.pantheon.pending?.rerolls).toBe(2);
    dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    // The next hand, dealt by anyone, knows nothing of the last one's askings.
    player.pantheon.pending = drawBeliefOffer(g.state, player);
    expect(player.pantheon.pending.rerolls ?? 0).toBe(0);
    expect(nextBeliefRerollCost(g.state, 0)).toBe(0);
  });

  it('rerolls the paid hand first when a seat is holding both', () => {
    const g = drafting(7, 500);
    const player = playerById(g.state, 0)!;
    learn(g.state, 0, 'divination');
    player.pantheon.pending = drawBeliefOffer(g.state, player);
    const gods = player.pantheon.pending.options;
    expect(rerollKindFor(player)).toBe('order');
    const outcome = settleReroll(g.state, player);
    expect(outcome?.kind).toBe('order');
    expect(outcome?.paid).toBe(35);
    // The free hand is untouched: one verb, and it answers the one that costs.
    expect(player.pantheon.pending.options).toEqual(gods);
  });
});
