/**
 * The Commerce deck implementation batch (`docs/plans/deck-implementation.md`,
 * batch D1 for Commerce; the sheet is `docs/decks/commerce.md`).
 *
 * What this file pins:
 *
 *   1. ruling (qqqqqq) 1: the seven Commerce cards that discounted a purchase
 *      now give +25% gold in the same scope, and keep their downsides;
 *   2. the small new shapes the batch added, each with the row that uses it:
 *      the Magnum Opus narrowing on `queueHolds`, the `ownerAtWar` scope, the
 *      `monopolyLuxuries` count, the `bank` narrowing on `purchasedBuildings`,
 *      the `routeRange` rule, the two action rules, the
 *      `buildingBoughtWithGold` occasion, the `goldIncome` commission figure,
 *      the `uniqueLuxuries` combat scale and a charter that opens a unit;
 *   3. the two new rows outside the deck file: the Plantation House and the
 *      Numidian Cavalry.
 */

import { describe, expect, it } from 'vitest';

import { createGame } from '../../../src/sim/game';
import { addBuilding, bumpRevision, playerById } from '../../../src/sim/state';
import { foundCityAt, ownedTiles, resourceCopies } from '../../../src/sim/cities';
import { explainCity } from '../../../src/sim/yields/town';
import { getTileAt, raiseImprovement } from '../../../src/sim/map';
import { purchaseError, purchaseItemAt } from '../../../src/sim/purchase';
import { isUnlocked } from '../../../src/sim/tech';
import { techColumn } from '../../../src/sim/techData';
import { routeRange } from '../../../src/sim/trade';
import { commissionFigure, commissionProgress, runCommissions } from '../../../src/sim/commissions';
import { cityScopeAdmits, countOf } from '../../../src/sim/statecraft';
import { applyCharter } from '../../../src/sim/statecraft/draft';
import { type CardEffect, type OrderId, orderDef } from '../../../src/sim/statecraftData';
import { BUILDING_IDS, buildingDef } from '../../../src/sim/buildingData';
import { unitDef } from '../../../src/sim/unitData';
import { RESOURCE_IDS, resourceDef } from '../../../src/sim/resourceData';
import { improvementForResource } from '../../../src/sim/improvementData';

/** A duel with one Commerce seat, the named cards in its chairs. */
function bench(cards: string[]) {
  const g = createGame({
    seed: 83,
    sizeName: 'duel',
    players: [
      { name: 'Musa', color: '#d4502e', isHuman: true, leader: 'mansaMusa' },
      { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
    ],
  });
  const musa = playerById(g.state, 0)!;
  for (const card of cards) {
    musa.statecraft.orders.push(card as OrderId);
    musa.statecraft.slots.push({ card: card as OrderId, sealedUntil: g.state.turn });
  }
  bumpRevision(g.state);
  return g;
}

/** A town of this seat, founded where its opening piece stands. */
function town(g: ReturnType<typeof bench>) {
  const unit = g.state.units.find((u) => u.ownerId === 0)!;
  return foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!)!;
}

/** Clears this seat's pieces off the town's hex, so a bought unit has somewhere to stand. */
function clearHex(g: ReturnType<typeof bench>, city: ReturnType<typeof town>) {
  g.state.units = g.state.units.filter((u) => u.col !== city.col || u.row !== city.row);
  bumpRevision(g.state);
}

/** The card's own percentage lines in this town. */
function percentLines(g: ReturnType<typeof bench>, city: ReturnType<typeof town>, name: string) {
  return explainCity(g.state, city).percents.filter((line) => line.source.includes(name));
}

describe('ruling (qqqqqq) 1 — a discount becomes +25% gold', () => {
  const RULED: Record<string, { scope?: string; downside?: (effect: CardEffect) => boolean }> = {
    landSpeculation: { downside: (e) => e.kind === 'happiness' && e.amount === -2 },
    privatePatronage: { downside: (e) => e.kind === 'productionBonus' && e.percent === -20 },
    boughtSwords: { downside: (e) => e.kind === 'productionBonus' && e.percent === -10 },
    frontierInvestment: { scope: 'populationAtMost' },
    theCustomsHouses: { scope: 'hasImprovement' },
    theFactorsHouses: { scope: 'holdsPost' },
    theMarketWrit: {},
  };

  it('gives each card +25% gold in the same scope, and nothing at the counter', () => {
    for (const [id, want] of Object.entries(RULED)) {
      const effects = orderDef(id as OrderId).effects;
      const gold = effects.filter(
        (e) => e.kind === 'percentYields' && e.yield === 'gold' && e.percent === 25,
      );
      expect(gold, id).toHaveLength(1);
      const scope = (gold[0] as { scope?: { test: string } }).scope?.test;
      expect(scope, id).toBe(want.scope);
      // Nothing left that reprices a purchase or a hex.
      expect(effects.some((e) => e.kind === 'purchaseRider'), id).toBe(false);
      expect(
        effects.some((e) => e.kind === 'rulePercent' && e.rule === 'tilePurchase'),
        id,
      ).toBe(false);
      if (want.downside) expect(effects.some(want.downside), `${id} keeps its downside`).toBe(true);
      expect(orderDef(id as OrderId).text, id).toContain('+25% gold');
    }
  });

  it('puts the share on the city stage of a town that holds the card', () => {
    const g = bench(['landSpeculation']);
    const city = town(g);
    const lines = percentLines(g, city, 'Land Speculation');
    expect(lines.map((line) => [line.yield, line.percent])).toEqual([['gold', 25]]);
  });
});

describe('the Magnum Opus narrowing and the two counter rules', () => {
  it('admits a town only while the Magnum Opus is at the front of its queue', () => {
    const g = bench([]);
    const city = town(g);
    const opus = 'theMagnumOpus';
    expect(buildingDef(opus).endsTheGame).toBe(true);
    // Dominion's raisingOpus scope, the one way a card names this town.
    const scope = { test: 'raisingOpus' } as const;
    city.queue = [{ kind: 'building', id: 'granary' }] as never;
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);
    city.queue = [{ kind: 'building', id: opus }] as never;
    expect(cityScopeAdmits(g.state, city, scope)).toBe(true);
  });

  it('pays Patrons Abroad by the foreign posts, in the town building the Opus only', () => {
    const effect = orderDef('patronsAbroad' as OrderId).effects[0]!;
    expect(effect).toMatchObject({ kind: 'pays', count: 'postCities', to: 'production', amount: 3 });
    expect((effect as { scope?: unknown }).scope).toEqual({ test: 'raisingOpus' });
  });

  it('lets a town with a wonder at the front buy a second military unit under The Hired Garrison', () => {
    const wonder = BUILDING_IDS.find((id) => buildingDef(id).wonder === true)!;
    for (const held of [false, true]) {
      const g = bench(held ? ['theHiredGarrison'] : []);
      const city = town(g);
      const musa = playerById(g.state, 0)!;
      musa.gold = 99999;
      city.queue = [{ kind: 'building', id: wonder }] as never;
      // As if one military unit had already been bought here this turn.
      city.purchasedUnitTurns = { ...(city.purchasedUnitTurns ?? {}), militaryGold: g.state.turn };
      bumpRevision(g.state);
      const error = purchaseError(g.state, 0, city.id, { kind: 'unit', id: 'warrior' }, 'gold');
      if (held) {
        expect(error ?? '').not.toContain('already bought');
      } else {
        expect(error).toContain('already bought');
      }
    }
  });

  it('counts a bought unit as trained while Bought Swords is held', () => {
    for (const held of [false, true]) {
      const cards = ['dominionTheMusterRolls', ...(held ? ['boughtSwords'] : [])];
      const g = bench(cards);
      const city = town(g);
      const musa = playerById(g.state, 0)!;
      musa.gold = 99999;
      clearHex(g, city);
      expect(purchaseError(g.state, 0, city.id, { kind: 'unit', id: 'warrior' }, 'gold')).toBeNull();
      purchaseItemAt(g.state, musa, city, { kind: 'unit', id: 'warrior' }, 'gold');
      const tally =
        musa.statecraft.tallies.find((row) => row.card === 'dominionTheMusterRolls')?.count ?? 0;
      expect(tally, held ? 'with Bought Swords' : 'without').toBe(held ? 1 : 0);
    }
  });
});

describe('the new readings', () => {
  it('admits a town whose owner is at war with somebody, never the wild', () => {
    const g = bench([]);
    const city = town(g);
    const scope = { test: 'ownerAtWar' } as const;
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);
    g.state.wars.push({ a: 0, b: 1 } as never);
    expect(cityScopeAdmits(g.state, city, scope)).toBe(true);
  });

  it('narrows the purchased-building count by bank and by shelf', () => {
    const g = bench([]);
    const city = town(g);
    addBuilding(g.state, city, 'shrine', 'gold');
    addBuilding(g.state, city, 'granary', 'gold');
    addBuilding(g.state, city, 'temple', 'faith');
    const count = (extra: Record<string, unknown>) =>
      countOf(
        g.state,
        0,
        'theWaqf' as OrderId,
        { kind: 'pays', where: 'city', basis: 'count', count: 'purchasedBuildings', within: 'city', to: 'faith', amount: 1, ...extra } as never,
        city,
      );
    expect(count({})).toBe(3);
    expect(count({ bank: 'gold' })).toBe(2);
    expect(count({ bank: 'gold', category: 'faith' })).toBe(1);
    expect(count({ bank: 'faith' })).toBe(1);
  });

  it('counts a monopoly only when no other empire holds the luxury', () => {
    const g = bench([]);
    const city = town(g);
    const musa = playerById(g.state, 0)!;
    const luxury = RESOURCE_IDS.find(
      (id) => resourceDef(id).kind === 'luxury' && improvementForResource(id) !== null,
    )!;
    const reveal = resourceDef(luxury).requiresTech;
    if (reveal && !musa.techsResearched.includes(reveal)) musa.techsResearched.push(reveal);
    const hexes = ownedTiles(g.state, city).filter(
      (tile) => tile.col !== city.col || tile.row !== city.row,
    );
    for (const tile of hexes.slice(0, 3)) {
      tile.resource = luxury;
      raiseImprovement(tile, improvementForResource(luxury)!, g.state.turn);
    }
    bumpRevision(g.state);
    expect(resourceCopies(g.state, 0, luxury)).toBeGreaterThanOrEqual(3);
    const probe = { kind: 'pays', where: 'city', basis: 'count', count: 'monopolyLuxuries', to: 'gold', amount: 5 } as never;
    expect(countOf(g.state, 0, 'theMonopoly' as OrderId, probe, city)).toBe(1);
  });

  it('lets a trade route reach further by land as well as by sea under The Trade Winds', () => {
    const plain = bench([]);
    const held = bench(['theTradeWinds']);
    const a = town(plain);
    const b = town(held);
    expect(routeRange(held.state, 0, b, b, 'land')).toBeGreaterThan(routeRange(plain.state, 0, a, a, 'land'));
  });
});

describe('the commissions', () => {
  it('counts buildings bought with gold for A Guild Commission, and not units', () => {
    const g = bench(['aGuildCommission']);
    const city = town(g);
    const musa = playerById(g.state, 0)!;
    musa.gold = 999999;
    bumpRevision(g.state);
    purchaseItemAt(g.state, musa, city, { kind: 'building', id: 'monument' }, 'gold');
    expect(commissionProgress(g.state, 0, 'aGuildCommission' as OrderId)[0]!.have).toBe(1);
    // A unit at the same counter is not a building.
    clearHex(g, city);
    purchaseItemAt(g.state, musa, city, { kind: 'unit', id: 'warrior' }, 'gold');
    expect(commissionProgress(g.state, 0, 'aGuildCommission' as OrderId)[0]!.have).toBe(1);
  });

  it('lends twenty turns of gold income under The Great Loan, then charges a quarter of the gold', () => {
    const g = bench(['theGreatLoan']);
    town(g);
    const musa = playerById(g.state, 0)!;
    bumpRevision(g.state);
    const income = commissionFigure(g.state, 0, 'goldIncome');
    expect(income).toBeGreaterThan(0);
    const before = musa.gold;
    runCommissions(g.state);
    expect(musa.gold - before).toBe(20 * income);
    expect(musa.timed?.some((t) => JSON.stringify(t).includes('"percent":-25'))).toBe(true);
  });

  it("writes The World's Fair as six trade routes and a timed reward", () => {
    const spec = orderDef('theWorldsFair' as OrderId).commission!;
    expect(spec.goals).toEqual([{ kind: 'reached', figure: 'tradeRoutes', count: 6 }]);
    expect(spec.reward[0]!.timed!.turns).toBe(10);
  });
});

describe('the new rows outside the deck file', () => {
  it('opens the Plantation House from The Planters’ Charter, and sells it only for gold', () => {
    const house = buildingDef('plantationHouse');
    expect(house.unlockedByCard).toBe(true);
    expect(house.purchaseOnly).toBe(true);
    const g = bench([]);
    const musa = playerById(g.state, 0)!;
    expect(isUnlocked(g.state, 0, 'building', 'plantationHouse')).toBe(false);
    musa.statecraft.orders.push('thePlantersCharter' as OrderId);
    applyCharter(musa, 'thePlantersCharter' as OrderId);
    expect(isUnlocked(g.state, 0, 'building', 'plantationHouse')).toBe(true);
  });

  it('opens Numidian Cavalry from its charter, at the horseman’s column and no sooner', () => {
    const rider = unitDef('numidianCavalry');
    expect(rider.unlockedByCard).toBe(true);
    expect(rider.column).toBe(techColumn('theCataphract'));
    const g = bench([]);
    const musa = playerById(g.state, 0)!;
    expect(isUnlocked(g.state, 0, 'unit', 'numidianCavalry')).toBe(false);
    musa.statecraft.orders.push('numidianCavalryCharter' as OrderId);
    expect(isUnlocked(g.state, 0, 'unit', 'numidianCavalry')).toBe(false);
    musa.techsResearched.push('theCataphract');
    expect(isUnlocked(g.state, 0, 'unit', 'numidianCavalry')).toBe(true);
    // And it fights harder for every kind of luxury its empire controls.
    expect(rider.effects?.[0]).toMatchObject({
      kind: 'combatLine',
      scaled: { count: 'uniqueLuxuries', per: 1 },
    });
  });
});
