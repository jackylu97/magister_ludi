/**
 * **Bot batch BP7 of bot pass 3, P9: the wonder rewards the bot did not read,
 * and the Forbidden City's chair.** The spec is `docs/flags.md` item (ooooooo),
 * entry P9, and the proposal page it links: "a faith step at its faith cost, a
 * Doctrine draft at the bot's price for a Doctrine offer, a free building at its
 * production cost". The user added the Forbidden City's chair, which is a rule
 * of the game now (`test/sim/forbiddenCityChair.test.ts`).
 *
 * Pinned here:
 *
 *   - Stonehenge's free god is the faith the next rung costs, as a lump;
 *   - the Theatre of Dionysus' Doctrine offer is the reading a commission's
 *     Doctrine offer takes, and its free Amphitheatre the hammers it would cost,
 *     as a lump, and nothing in a town that holds one;
 *   - no grant of the three falls to the stand-in any more;
 *   - one more Wildcard chair is the best card off the chairs, then the card the
 *     seat expects to draft, discounted for the drafts it waits on;
 *   - the Forbidden City's row reads that chair, and the slot arm fills it.
 */
import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { slottingDecision } from '../../src/ai/council';
import { explainBuildingRow, explainCardEffects, explainCommission, extraChairsWorth } from '../../src/ai/value';
import { explainLump } from '../../src/ai/prices';
import aiJson from '../../data/ai.json';
import { buildingProductionCost, foundCityAt, realiseItem, refreshCityDerived } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { nextFaithRungCost } from '../../src/sim/religion';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { type CardEffect, type OrderId, ORDER_IDS, isBoon, isCharter, orderDef } from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { lendCardEffects as lendOrder } from './aiCardStampHelpers';
import { newGame } from './newGameHelpers';

const GOLDEN_BULL = 'magisterialTheGoldenBull' as OrderId;

const LIVE = ORDER_IDS.filter((id) => orderDef(id).retired !== true);
/** Plain cards that may sit and hold one flat line: the test lends each its line. */
const PLAIN = LIVE.filter(
  (id) => !isBoon(id) && !isCharter(id) && orderDef(id).commission === undefined && orderDef(id).type === undefined,
);

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** One grown town for seat 0 on a blank board. */
function bench(turn = 60): { state: GameState; player: Player; city: City } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 14).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.turn = turn;
  const city = foundCityAt(state, 0, at(state.map, 6, 6));
  city.population = 6;
  city.queue = [];
  refreshCityDerived(state, city);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: playerById(state, 0)!, city };
}

/** The completion grant terms of a row, by the start of their labels. */
function grantTerm(id: string, start: string, ctx: ReturnType<typeof valueContext>, city?: City) {
  return explainBuildingRow(id as never, ctx, city).terms.find((term) => term.label.startsWith(start));
}

describe('the three completion grants', () => {
  it('prices Stonehenge’s free god at the faith the next rung costs, as a lump', () => {
    const { state, player } = bench();
    const ctx = valueContext(state, player);
    const term = grantTerm('stonehenge', 'a free god on completion', ctx);
    expect(term).toBeDefined();
    const faith = nextFaithRungCost(player);
    expect(faith).toBeGreaterThan(0);
    expect(term!.value).toBeCloseTo(explainLump({ faith }, ctx).total, 8);
    expect(term!.value).toBeGreaterThan(0);
  });

  it('prices the Theatre’s Doctrine offer as a commission’s Doctrine offer is priced', () => {
    const { state, player } = bench();
    const ctx = valueContext(state, player);
    const term = grantTerm('theatreOfDionysus', 'a Doctrine offer on completion', ctx);
    expect(term).toBeDefined();
    // The Golden Bull's reward is a Doctrine offer: the same reading, one figure.
    const reward = explainCommission(GOLDEN_BULL, ctx)!;
    const find = (terms: readonly { label: string; value: number; parts?: readonly unknown[] }[]): number | null => {
      for (const one of terms) {
        if (one.label.startsWith('a Doctrine offer, once')) return one.value;
        const inner = find((one.parts ?? []) as never);
        if (inner !== null) return inner;
      }
      return null;
    };
    const bull = find(reward.terms as never);
    expect(bull).not.toBeNull();
    expect(term!.value).toBeCloseTo(bull!, 8);
  });

  it('prices the Theatre’s free Amphitheatre at the hammers it would cost, and nothing where one stands', () => {
    const { state, player, city } = bench();
    const ctx = valueContext(state, player);
    const term = grantTerm('theatreOfDionysus', 'a free Amphitheater', ctx);
    expect(term).toBeDefined();
    const hammers = buildingProductionCost('amphitheater', state, 0);
    expect(term!.value).toBeCloseTo(explainLump({ production: hammers }, ctx).total, 8);
    city.buildings.push('amphitheater');
    bumpRevision(state);
    const held = valueContext(state, player);
    const there = explainBuildingRow('theatreOfDionysus', held, city).terms.find((one) => one.label.includes('already holds one'));
    expect(there?.value).toBe(0);
  });

  it('leaves none of the three to the stand-in', () => {
    const { state, player } = bench();
    const ctx = valueContext(state, player);
    for (const id of ['stonehenge', 'theatreOfDionysus'] as const) {
      const unread = explainBuildingRow(id, ctx).terms.filter((term) => term.label.startsWith('a grant this bot cannot read'));
      expect(unread, id).toEqual([]);
    }
  });
});

describe('one more Wildcard chair', () => {
  it('is the best card off the chairs, then the next best', () => {
    const { state, player } = bench();
    const [rich, poor] = PLAIN;
    const lent = [
      lendOrder(rich!, [{ kind: 'pays', where: 'empire', gold: 6 } as CardEffect]),
      lendOrder(poor!, [{ kind: 'pays', where: 'empire', gold: 2 } as CardEffect]),
    ];
    try {
      player.statecraft.orders.push(rich!, poor!);
      bumpRevision(state);
      const ctx = valueContext(state, player);
      const price = (id: OrderId): number => explainCardEffects(id, orderDef(id).effects, ctx, 'walk').total;
      expect(price(rich!)).toBeGreaterThan(price(poor!));
      expect(extraChairsWorth(1, ctx)).toBeCloseTo(price(rich!), 8);
      expect(extraChairsWorth(2, ctx)).toBeCloseTo(price(rich!) + price(poor!), 8);
    } finally {
      for (const give of lent) give();
    }
  });

  it('waits for a drafted card when the bench is empty, discounted for the drafts it waits on', () => {
    const { state, player } = bench();
    player.culturePool = 0;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const one = extraChairsWorth(1, ctx);
    const two = extraChairsWorth(2, ctx);
    expect(one).toBeGreaterThanOrEqual(0);
    // A second chair waits one draft longer than the first, so it is worth no more.
    expect(two - one).toBeLessThanOrEqual(one + 1e-9);
  });

  it('is what the Forbidden City’s row reads for its chair', () => {
    const { state, player } = bench();
    const [rich] = PLAIN;
    const give = lendOrder(rich!, [{ kind: 'pays', where: 'empire', gold: 6 } as CardEffect]);
    try {
      player.statecraft.orders.push(rich!);
      bumpRevision(state);
      const ctx = valueContext(state, player);
      const written = explainBuildingRow('forbiddenCity', ctx).terms.find((term) => term.label === 'its written effects');
      expect(written?.value).toBeCloseTo(extraChairsWorth(1, ctx), 8);
      expect(written!.value).toBeGreaterThan(aiJson.score.unknownEffect * aiJson.score.nominalCount);
    } finally {
      give();
    }
  });

  it('is filled by the slot arm once the wonder stands', () => {
    const { state, player, city } = bench();
    const [rich] = PLAIN;
    const give = lendOrder(rich!, [{ kind: 'pays', where: 'empire', gold: 6 } as CardEffect]);
    try {
      // Every chair full, and one more card held.
      const sc = player.statecraft;
      const others = PLAIN.slice(1, 1 + sc.slots.length);
      others.forEach((id, index) => {
        sc.orders.push(id);
        sc.slots[index] = { card: id, sealedUntil: 0 };
      });
      sc.orders.push(rich!);
      bumpRevision(state);
      expect(slottingDecision(state, player)).toBeNull();
      const chairs = sc.slots.length;
      realiseItem(state, city, { kind: 'building', id: 'forbiddenCity' });
      expect(sc.slots).toHaveLength(chairs + 1);
      const decision = slottingDecision(state, player);
      expect(decision?.command).toMatchObject({ type: 'slotOrder', cardId: rich, slotIndex: chairs });
    } finally {
      give();
    }
  });
});
