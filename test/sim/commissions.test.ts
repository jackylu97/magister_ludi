/**
 * Commissions (batch C of `docs/plans/deck-implementation.md`): Order cards with
 * a goal and a reward. What is pinned here:
 *
 *   · every commission row is well formed and prints its goal and reward;
 *   · a counted goal grows only while the card is seated, and keeps its count
 *     when the card is unseated or a government is adopted (ruling (qqqqqq) 5);
 *   · a reached goal is checked only while the card is seated;
 *   · completion pays once, unseats the card, marks it fulfilled, and a
 *     fulfilled card can never be seated again;
 *   · the phase sits directly after `periodicBoons`, and the same board run
 *     through it twice gives the same state.
 */

import { describe, expect, it } from 'vitest';

import { type Game, dispatch, snapshotState } from '../../src/sim/game';
import { settleCampBounty } from '../../src/sim/camps';
import { capitalCityOf, playerById, bumpRevision, type GameState } from '../../src/sim/state';
import {
  adoptGovernmentAt,
  describeCard,
  refitSlots,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  stripRefs,
  tallyOf,
  unslotOrderAt,
} from '../../src/sim/statecraft';
import {
  COMMISSION_FIGURES,
  ORDER_IDS,
  TALLY_OCCASIONS,
  type OrderId,
  governmentsAtTier,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
} from '../../src/sim/statecraftData';
import {
  commissionFigure,
  commissionProgress,
  runCommissions,
  seatedCommissions,
} from '../../src/sim/commissions';
import { END_OF_TURN_PHASES } from '../../src/sim/turn';
import { found, keepTheRites } from './statecraftHelpers';
import { createGame } from './newGameHelpers';

const FRONTIER = 'dominionClearTheFrontier' as OrderId;
const STRONGROOM = 'theStrongroom' as OrderId;
const MARKET = 'cornerTheMarket' as OrderId;

/** One seat and the wild, so camps can be cleared and turns end on one command. */
function solo(seed = 5): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    barbarians: true,
  });
}

/** Adds the card to the collection, the way a draft would. */
function hold(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  bumpRevision(state);
}

/**
 * Seats a held card in the first empty chair it fits, through the slot verb.
 * A Wildcard commission fits only a Wildcard chair (batch C2's fit rule).
 */
function seat(state: GameState, id: OrderId): number {
  hold(state, id);
  const player = playerById(state, 0)!;
  const chairs = slotTypesOf(player.statecraft);
  const index = player.statecraft.slots.findIndex(
    (slot, at) => slot === null && orderFitsSlot(id, chairs[at]!),
  );
  expect(index, 'an empty chair').toBeGreaterThanOrEqual(0);
  expect(slotOrderError(state, 0, id, index)).toBeNull();
  slotOrderAt(state, player, id, index);
  return index;
}

/** Clears a camp's worth of credit for seat 0, through the camp bounty seam. */
function clearCamp(state: GameState): void {
  const unit = state.units.find((u) => u.ownerId === 0)!;
  settleCampBounty(state, 0, { col: unit.col, row: unit.row });
}

describe('the commission rows', () => {
  const rows = ORDER_IDS.filter((id) => orderDef(id).commission !== undefined);

  it('are the three example commissions, each dealt', () => {
    expect(rows).toEqual(expect.arrayContaining([FRONTIER, STRONGROOM, MARKET]));
    for (const id of rows) expect(orderIsDealt(id), id).toBe(true);
  });

  it('carry a goal and a reward in the vocabulary, with at most one counted part', () => {
    for (const id of rows) {
      const spec = orderDef(id).commission!;
      expect(spec.goals.length, id).toBeGreaterThan(0);
      expect(spec.reward.length, id).toBeGreaterThan(0);
      expect(spec.goals.filter((goal) => goal.kind === 'counted').length, id).toBeLessThanOrEqual(1);
      for (const goal of spec.goals) {
        expect(goal.count, id).toBeGreaterThan(0);
        if (goal.kind === 'counted') expect(TALLY_OCCASIONS, id).toContain(goal.occasion);
        else expect(COMMISSION_FIGURES, id).toContain(goal.figure);
      }
      for (const reward of spec.reward) {
        // Dominion batch D6 added citizens, a building in the town that met the
        // goal, and Wildcard chairs.
        const says =
          reward.yield !== undefined ||
          reward.greatPerson !== undefined ||
          reward.unit !== undefined ||
          reward.timed !== undefined ||
          reward.citizens !== undefined ||
          reward.building !== undefined ||
          reward.wildcardChairs !== undefined ||
          // Expansionist batch E5, The Heartland: a mark on the town, and
          // effects for the rest of the game.
          reward.markTown === true ||
          reward.lasting !== undefined ||
          // Commerce batch T4, The World's Fair: posts in the partners'
          // capitals.
          reward.postsInPartnerCapitals === true ||
          // Magisterial batch MG7, The Golden Bull: a Doctrine offer.
          reward.doctrineOffer === true;
        expect(says, `${id} has a reward line that pays nothing`).toBe(true);
        if (reward.fromFigure !== undefined) expect(COMMISSION_FIGURES, id).toContain(reward.fromFigure);
      }
    }
  });

  it('give a town scope only to a goal that counts towns', () => {
    // Commerce batch T4: `admits` is read by the `citiesAdmitted` figure and
    // ignored by every other, so a scope anywhere else is a mistake in a row.
    for (const id of rows) {
      for (const goal of orderDef(id).commission!.goals) {
        if (goal.kind !== 'reached') continue;
        expect(goal.admits !== undefined, id).toBe(goal.figure === 'citiesAdmitted');
      }
    }
  });

  it('print the goal, the reward and the leaving, with no raw keyword left', () => {
    for (const id of rows) {
      const text = describeCard(id).map((clause) => stripRefs(clause.text));
      expect(text.some((line) => line.startsWith('Commission. Goal: ')), id).toBe(true);
      expect(text.some((line) => line.startsWith('Reward: ')), id).toBe(true);
      for (const line of text) expect(line, id).not.toMatch(/\[\[/);
    }
    // Since Dominion batch D9 the reward is Battle Honours' old one: a great
    // general from a draft (the two commissions traded rewards).
    expect(describeCard(FRONTIER).map((clause) => clause.text)).toEqual([
      'Commission. Goal: clear 2 barbarian camps, while this card is seated',
      'Reward: a great general to call',
      'then this card leaves its chair and is never seated again',
    ]);
    expect(describeCard(STRONGROOM)[1]!.text).toBe(
      'Reward: culture equal to 20% of the gold in your treasury at that moment, and a great merchant to call',
    );
  });
});

describe('a counted goal', () => {
  it('advances only while the card is seated', () => {
    const g = solo();
    found(g.state, 0);
    hold(g.state, FRONTIER);
    const sc = playerById(g.state, 0)!.statecraft;
    clearCamp(g.state);
    expect(tallyOf(sc, FRONTIER)).toBe(0);
    seat(g.state, FRONTIER);
    clearCamp(g.state);
    expect(tallyOf(sc, FRONTIER)).toBe(1);
    expect(commissionProgress(g.state, 0, FRONTIER)[0]).toMatchObject({ have: 1, need: 2, met: false });
  });

  it('keeps its count when the card is unseated, and when a government is adopted', () => {
    const g = solo();
    found(g.state, 0);
    const index = seat(g.state, FRONTIER);
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    clearCamp(g.state);
    unslotOrderAt(player, index);
    expect(tallyOf(sc, FRONTIER)).toBe(1);
    // Unseated, a camp cleared counts for nothing.
    clearCamp(g.state);
    expect(tallyOf(sc, FRONTIER)).toBe(1);
    expect(seatedCommissions(sc)).toEqual([]);
    // An adoption rebuilds the chairs and leaves the card's count alone. Since
    // batch C2 it also re-seats the card, in a Wildcard chair, the only kind a
    // Wildcard card fits.
    seat(g.state, FRONTIER);
    sc.pendingGovernment = { tier: 4, options: [...governmentsAtTier(4)] };
    expect(adoptGovernmentAt(g.state, player, 0)).not.toBeNull();
    expect(tallyOf(sc, FRONTIER)).toBe(1);
    const at = sc.slots.findIndex((held) => held?.card === FRONTIER);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(slotTypesOf(sc)[at]).toBe('wildcard');
  });
});

describe('completion', () => {
  it('pays once, unseats the card, marks it fulfilled, and refuses to seat it again', () => {
    const g = solo();
    found(g.state, 0);
    // The great-person gate, so the reward's general can be called.
    keepTheRites(g.state);
    const index = seat(g.state, FRONTIER);
    clearCamp(g.state);
    clearCamp(g.state);
    const sc = playerById(g.state, 0)!.statecraft;
    const units = g.state.units.filter((u) => u.ownerId === 0).length;

    const reports = runCommissions(g.state);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ playerId: 0, card: FRONTIER, turn: g.state.turn });
    // Since Dominion batch D9 the reward is a great general from a draft. The
    // two citizens and the free unit moved to Battle Honours.
    expect(reports[0]!.lines).toEqual(['a great general to call']);
    expect(playerById(g.state, 0)!.greatPersonOffer?.family).toBe('general');
    expect(g.state.units.filter((u) => u.ownerId === 0).length).toBe(units);
    expect(sc.slots[index]).toBeNull();
    expect(sc.commissionsFulfilled).toEqual([{ card: FRONTIER, turn: g.state.turn }]);
    // Still in the collection, never seated again, never paid again.
    expect(sc.orders).toContain(FRONTIER);
    expect(slotOrderError(g.state, 0, FRONTIER, index)).toMatch(/fulfilled/);
    expect(runCommissions(g.state)).toEqual([]);
  });

  it('checks a reached goal only while the card is seated, and pays a share of the figure', () => {
    const g = solo();
    found(g.state, 0);
    keepTheRites(g.state);
    const player = playerById(g.state, 0)!;
    hold(g.state, STRONGROOM);
    player.gold = 2500;
    // Held but not seated: the treasury is there and nothing is checked.
    expect(runCommissions(g.state)).toEqual([]);
    seat(g.state, STRONGROOM);
    // The goal is 1,500 gold since Commerce batch T1.
    player.gold = 1499;
    expect(runCommissions(g.state)).toEqual([]);
    player.gold = 2500;
    const reports = runCommissions(g.state);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.lines).toEqual(['+500 culture', 'a great merchant to call']);
    expect(player.gold).toBe(2500);
    expect(player.greatPersonOffer?.family).toBe('merchant');
  });

  it('banks renown instead when a great person is already waiting', () => {
    const g = solo();
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    // No rites yet: the offer cannot be dealt, so the ladder is filled instead.
    seat(g.state, STRONGROOM);
    player.gold = 2000;
    const before = player.renownPool;
    const reports = runCommissions(g.state);
    expect(reports[0]!.lines).toContain('renown for a great merchant');
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownPool).toBeGreaterThan(before);
  });
});

describe('a timed reward', () => {
  it('hangs its effects on the empire until an absolute turn', () => {
    // The Great Loan's charge is a timed reward, but its loan pays first, so
    // the Strongroom's row is borrowed for the test and put back afterwards.
    // (The World's Fair carried a timed reward until Commerce batch T4.)
    const def = orderDef(STRONGROOM);
    const kept = def.commission;
    def.commission = {
      goals: [{ kind: 'reached', figure: 'hexesOwned', count: 1 }],
      reward: [
        {
          timed: {
            turns: 10,
            effects: [{ kind: 'percentYields', yield: 'science', percent: 50 }],
          },
        },
      ],
    };
    try {
      const g = solo();
      found(g.state, 0);
      seat(g.state, STRONGROOM);
      expect(describeCard(STRONGROOM)[1]!.text).toMatch(/^Reward: for 10 turns, /);
      const reports = runCommissions(g.state);
      expect(reports).toHaveLength(1);
      const timed = playerById(g.state, 0)!.timed ?? [];
      expect(timed).toEqual([
        {
          card: STRONGROOM,
          effect: { kind: 'percentYields', yield: 'science', percent: 50 },
          expiresTurn: g.state.turn + 10,
        },
      ]);
    } finally {
      def.commission = kept;
    }
  });
});

describe('the figures', () => {
  it('read the seat’s own empire', () => {
    const g = solo();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.gold = 321;
    expect(commissionFigure(g.state, 0, 'treasury')).toBe(321);
    expect(commissionFigure(g.state, 0, 'tradeRoutes')).toBe(0);
    expect(commissionFigure(g.state, 0, 'hexesOwned')).toBeGreaterThan(0);
    expect(commissionFigure(g.state, 0, 'improvedTilesWorked')).toBe(0);
    expect(commissionFigure(g.state, 0, 'luxuryCopies')).toBeGreaterThanOrEqual(0);
    expect(capitalCityOf(g.state, 0)?.id).toBe(city.id);
    // Commerce batch T4: no route reaches another empire yet, and a town
    // figure counts the towns its goal's scope admits, or nothing without one.
    expect(commissionFigure(g.state, 0, 'tradePartnerEmpires')).toBe(0);
    expect(commissionFigure(g.state, 0, 'citiesAdmitted')).toBe(0);
    expect(
      commissionFigure(g.state, 0, 'citiesAdmitted', {
        kind: 'reached',
        figure: 'citiesAdmitted',
        count: 1,
        admits: { test: 'capital' },
      }),
    ).toBe(1);
    // Magisterial batch MG4: the Orders held, seated or not.
    expect(commissionFigure(g.state, 0, 'ordersHeld')).toBe(0);
    hold(g.state, MARKET);
    expect(commissionFigure(g.state, 0, 'ordersHeld')).toBe(1);
    // Magisterial batch MG7: a council in order is 1 or 0. The chiefdom's
    // Military and Economic chairs are empty here, so it is 0.
    expect(commissionFigure(g.state, 0, 'councilInOrder')).toBe(0);
  });
});

describe('the phase', () => {
  it('runs directly after the periodic boons', () => {
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf('commissions')).toBe(names.indexOf('periodicBoons') + 1);
    expect(names.indexOf('commissions')).toBeLessThan(names.indexOf('statecraft'));
  });

  it('pays through an ended turn, reports to the turn, and replays to the same state', () => {
    function run(): { snapshot: string; reported: number } {
      const g = solo(11);
      found(g.state, 0);
      keepTheRites(g.state);
      // Both commissions are Wildcard cards since Commerce batch T1 sorted
      // The Strongroom, so the seat needs a second Wildcard chair. A won chair
      // gives one, as Commission: A Victor's Peace does.
      const sc = playerById(g.state, 0)!.statecraft;
      sc.chairsWon = 1;
      refitSlots(g.state, playerById(g.state, 0)!);
      seat(g.state, STRONGROOM);
      seat(g.state, FRONTIER);
      clearCamp(g.state);
      clearCamp(g.state);
      playerById(g.state, 0)!.gold = 3000;
      const result = dispatch(g, { type: 'endTurn', playerId: 0 });
      expect(result.ok).toBe(true);
      return {
        snapshot: snapshotState(g.state),
        reported: result.ok ? (result.commissions ?? []).length : -1,
      };
    }
    const first = run();
    const second = run();
    expect(first.reported).toBe(2);
    expect(second.snapshot).toBe(first.snapshot);
  });
});
