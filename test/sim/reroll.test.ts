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
 *
 * **The heavy hands** join at the foot (schema 85, ruled 2026-09-07 — item q,
 * `docs/early-pacing.md` §2f): a Doctrine draft and a great-person draft are
 * rerolled by the same verb, through the same door, on the same lifetime count,
 * at **twice** the Order price. What that section holds still is the arithmetic
 * (a printed line, never a hidden multiplier), the one ladder (rerolling any of
 * the three makes all three dearer), the redeal each hand's own dealer draws, and
 * the two things the doubling did *not* reach — the shrine engine's tally and the
 * belief hand's free first asking.
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
import { drawDoctrineOffer, drawOrderOffer } from '../../src/sim/statecraft';
import { governmentDef, poolDoctrines, slotLayout } from '../../src/sim/statecraftData';
import { drawGreatPersonOffer } from '../../src/sim/greatPeople';
import { type Family, greatPersonDef } from '../../src/sim/greatPeopleData';
import { type GameState, playerById, bumpRevision } from '../../src/sim/state';
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
      bumpRevision(state);
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
  bumpRevision(g.state);
  player.statecraft.pendingOrder = drawOrderOffer(g.state, player);
  return g;
}

/**
 * A seat holding a **Doctrine** draft: a government of the tier whose pool the
 * hand came from, so the redeal draws from the same bag the deal did.
 */
function doctrineDrafting(seed = 7, faith = 500) {
  const g = game(seed);
  found(g.state, 0);
  openTheDoor(g.state, 0);
  const player = playerById(g.state, 0)!;
  player.faithPool = faith;
  bumpRevision(g.state);
  const sc = player.statecraft;
  sc.government = 'councilOfElders';
  bumpRevision(g.state);
  sc.pendingDoctrine = drawDoctrineOffer(g.state, player, governmentDef(sc.government).tier);
  return g;
}

/** A seat holding a **great-person** draft, narrowed or not. */
function nameDrafting(seed = 7, faith = 500, family?: Family) {
  const g = game(seed);
  found(g.state, 0);
  openTheDoor(g.state, 0);
  const player = playerById(g.state, 0)!;
  player.faithPool = faith;
  bumpRevision(g.state);
  player.greatPersonOffer = drawGreatPersonOffer(g.state, player, family);
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
    bumpRevision(g.state);
    expect(rerollKindFor(playerById(g.state, 0)!)).toBeNull();
    expect(rerollError(g.state, 0)).toContain('no draft');
  });

  it('refuses a seat whose calendars have not opened the door', () => {
    const g = game();
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    bumpRevision(g.state);
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
    bumpRevision(g.state);

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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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

// --- the heavy hands --------------------------------------------------------

/**
 * **Twice the Order price, on the one ladder** (ruled 2026-09-07, item q).
 *
 * The claims, in the order a player meets them: the doubling is a *line* of the
 * fold rather than a multiplier hidden inside the figure; the count is shared, so
 * asking for one hand again makes every hand dearer; the door is the same one;
 * the redeal is each hand's own dealer, with the narrowing kept; and the two
 * things the ruling deliberately did not reach.
 */
describe('a Doctrine hand and a name, at twice the price', () => {
  it('doubles the Order price and prints the doubling as a line of its own', () => {
    const g = doctrineDrafting();
    const order = explainRerollCost(g.state, 0, 'order');
    const doctrine = explainRerollCost(g.state, 0, 'doctrine');
    expect(RELIGION.reroll.heavyMultiple).toBe(2);
    expect(doctrine.total).toBe(order.total * RELIGION.reroll.heavyMultiple);
    // Rule 5: the fold *is* the figure, and the last line is what the doubling
    // is answerable for — never a factor applied beside the list.
    expect(doctrine.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(doctrine.total);
    expect(doctrine.lines.slice(0, order.lines.length)).toEqual(order.lines);
    expect(doctrine.lines).toHaveLength(order.lines.length + 1);
    const doubling = doctrine.lines[doctrine.lines.length - 1]!;
    expect(doubling.amount).toBe(order.total);
    // And no figure in the words: the amount carries it.
    expect(doubling.source).not.toMatch(/\d/);
  });

  it('prices a name the same way, in its own words', () => {
    const g = nameDrafting();
    const name = explainRerollCost(g.state, 0, 'greatPerson');
    expect(name.total).toBe(nextRerollCost(g.state, 0) * RELIGION.reroll.heavyMultiple);
    const doctrineLines = explainRerollCost(g.state, 0, 'doctrine').lines;
    expect(name.lines[name.lines.length - 1]!.source).not.toBe(
      doctrineLines[doctrineLines.length - 1]!.source,
    );
  });

  it('climbs the ladder and the age with the Order draft, then doubles what it came to', () => {
    const g = doctrineDrafting();
    const player = playerById(g.state, 0)!;
    learn(g.state, 0, 'ironWorking');
    player.statecraft.rerollsTaken = 3;
    // The Order draft's own figure at this point on the ladder — 137 (pinned
    // above) — and the heavy hand is that, twice.
    expect(nextRerollCost(g.state, 0)).toBe(137);
    expect(nextRerollCost(g.state, 0, 'doctrine')).toBe(274);
  });

  it('spends one lifetime count: asking for a doctrine makes the next Order dearer', () => {
    const g = doctrineDrafting();
    const player = playerById(g.state, 0)!;
    expect(nextRerollCost(g.state, 0)).toBe(35);
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(player.faithPool).toBe(500 - 70);
    expect(player.statecraft.rerollsTaken).toBe(1);
    // The whole of "on the same ladder": every kind is dearer now.
    expect(nextRerollCost(g.state, 0)).toBe(47);
    expect(nextRerollCost(g.state, 0, 'doctrine')).toBe(94);
    expect(nextRerollCost(g.state, 0, 'greatPerson')).toBe(94);
  });

  it('deals the Doctrine hand again from the seat’s own tier, and the same seed deals the same', () => {
    const a = doctrineDrafting(11);
    const b = doctrineDrafting(11);
    const first = playerById(a.state, 0)!.statecraft.pendingDoctrine!.options;
    expect(dispatch(a, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(dispatch(b, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    const dealt = playerById(a.state, 0)!.statecraft.pendingDoctrine!;
    expect(dealt.options).not.toBe(first);
    expect(dealt.options.length).toBe(first.length);
    // The tier is the seat's government's, so every card dealt belongs to the
    // pool the first hand came from.
    for (const id of dealt.options) {
      expect(poolDoctrines(governmentDef('councilOfElders').tier)).toContain(id);
    }
    expect(dealt).toEqual(playerById(b.state, 0)!.statecraft.pendingDoctrine);
  });

  it('deals a bought scholar draft again as scholars', () => {
    // The Academy's hand is narrowed when it is bought (`OFFER_PURCHASES`), and
    // a reroll that widened it would hand back something other than what was
    // paid for. The narrowing rides on the offer.
    const g = nameDrafting(9, 500, 'scholar');
    const player = playerById(g.state, 0)!;
    expect(player.greatPersonOffer?.family).toBe('scholar');
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    const dealt = player.greatPersonOffer!;
    expect(dealt.family).toBe('scholar');
    for (const id of dealt.options) expect(greatPersonDef(id).family).toBe('scholar');
  });

  it('leaves an ordinary hand unnarrowed through the redeal', () => {
    const g = nameDrafting();
    const player = playerById(g.state, 0)!;
    expect(player.greatPersonOffer?.family).toBeUndefined();
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(player.greatPersonOffer?.family).toBeUndefined();
    expect(player.greatPersonOffer?.options.length).toBeGreaterThan(0);
  });

  it('asks the same door of both, and refuses byte-identically when it is shut', () => {
    for (const make of [doctrineDrafting, nameDrafting]) {
      const g = make(7, 500);
      // The calendars, taken back off the seat: a heavy hand meets the Order
      // draft's door and no other.
      const player = playerById(g.state, 0)!;
      const gate = ABILITY_TECH.get(RELIGION.reroll.ability)!;
      player.techsResearched = player.techsResearched.filter((id) => id !== gate);
      bumpRevision(g.state);
      expect(rerollError(g.state, 0)).toBe('Your calendars cannot yet call for a second reading');
      const before = snapshotState(g.state);
      expect(applyCommand(g.state, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(false);
      expect(snapshotState(g.state)).toEqual(before);
    }
  });

  it('refuses a bank that cannot cover the doubled price, and touches nothing', () => {
    // Enough for an Order hand and not for a heavy one — the exact seam the
    // doubling opens, and the state must come out of it unchanged.
    const g = doctrineDrafting(7, 40);
    expect(rerollError(g.state, 0)).toBe('A second reading asks 70 faith and Ada has 40');
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('raises no chair’s tally: the Votive Tally counts Order drafts alone', () => {
    const g = doctrineDrafting();
    const sc = playerById(g.state, 0)!.statecraft;
    const index = slotLayout(sc.government).indexOf('wildcard');
    const seated = 'theArchives' as (typeof sc.orders)[number];
    sc.orders.push(seated);
    sc.slots[index] = { card: seated, sealedUntil: g.state.turn };
    bumpRevision(g.state);
    expect(dispatch(g, { type: 'rerollOffer', playerId: 0 } as Command).ok).toBe(true);
    expect(sc.rerollsTaken).toBe(1);
    expect(sc.slots[index]?.rerollsSeen ?? 0).toBe(0);
  });

  /**
   * The precedence is `firstBlocker`'s — the order the interface raises the four
   * hands in — so the verb answers the hand the player is looking at, and the
   * free hand is behind every hand that charges the bank.
   */
  it('answers the hands in the order the interface raises them', () => {
    const g = drafting(7, 500);
    const player = playerById(g.state, 0)!;
    learn(g.state, 0, 'divination');
    player.statecraft.government = 'councilOfElders';
    bumpRevision(g.state);
    player.statecraft.pendingDoctrine = drawDoctrineOffer(g.state, player, 4);
    player.pantheon.pending = drawBeliefOffer(g.state, player);
    player.greatPersonOffer = drawGreatPersonOffer(g.state, player);

    expect(rerollKindFor(player)).toBe('order');
    delete player.statecraft.pendingOrder;
    expect(rerollKindFor(player)).toBe('doctrine');
    delete player.statecraft.pendingDoctrine;
    expect(rerollKindFor(player)).toBe('belief');
    delete player.pantheon.pending;
    expect(rerollKindFor(player)).toBe('greatPerson');
    // A spent roster leaves an empty hand behind for an instant; it blocks
    // nothing and is not a hand to reroll.
    player.greatPersonOffer = { options: [] };
    expect(rerollKindFor(player)).toBeNull();
  });
});
