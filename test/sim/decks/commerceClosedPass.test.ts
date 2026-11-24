import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../../src/sim/commands';
import { foundCityAt, withinWorkRadius, workRadiusOf, workRadiusTiles } from '../../../src/sim/cities';
import commerceSheet from '../../../docs/decks/commerce.md?raw';
import { buyingPowerWords } from '../../../src/sim/purchaseDiscount';
import { explainPurchaseCost } from '../../../src/sim/purchase';
import { openFaithLadder, performRiteAt } from '../../../src/sim/religion';
import { bumpRevision, buyWithGold, createUnit, spendFaith } from '../../../src/sim/state';
import { explainCardEmpireYields, tallyOf } from '../../../src/sim/statecraft';
import type { OrderId } from '../../../src/sim/statecraftData';
import { makeRng } from '../../../src/sim/rng';
import { rankOf } from '../../../src/sim/ranks';
import { applyCombat } from '../../../src/sim/combat';
import { openEveryWar } from '../warHelpers';
import { gatingTech } from '../../../src/sim/tech';
import { at, bareState } from '../improvementHelpers';

function town(...orders: string[]) {
  const state = bareState(20, 12);
  const city = foundCityAt(state, 0, at(state, 5, 5));
  const player = state.players[0]!;
  player.gold = 10000;
  player.faithPool = 10000;
  for (const id of orders) {
    const card = id as OrderId;
    player.statecraft.orders.push(card);
    player.statecraft.slots.push({ card, sealedUntil: state.turn });
  }
  bumpRevision(state);
  return { state, city, player };
}

describe('Commerce purchases', () => {
  it('lists each active purchase discount and its buying power on the Commerce sheet', () => {
    const data = import.meta.glob('../../../data/{decks/*,buildings,greatPeople,religion,statecraft,units}.json',
      { eager: true, import: 'default' });
    const discounts = new Map<string, string>();
    function visit(value: unknown, name = ''): void {
      if (!value || typeof value !== 'object') return;
      const row = value as Record<string, unknown>;
      if (row.retired === true) return;
      if (typeof row.name === 'string') name = row.name;
      const percent = row.kind === 'purchaseRider' || (row.kind === 'rulePercent' && row.rule === 'tilePurchase')
        ? row.percent : row.purchaseDiscount;
      if (typeof percent === 'number' && percent < 0) discounts.set(name, buyingPowerWords(percent));
      for (const child of Object.values(row)) visit(child, name);
    }
    visit(data);
    const section = commerceSheet.split('## Buying power')[1]!.split('##')[0]!;
    const listed = new Map(Array.from(section.matchAll(/^\| ([^|]+?) \| ([\d.]+%) \|/gm), match => [match[1]!, match[2]!]));
    expect(discounts.size).toBe(14);
    expect(listed).toEqual(discounts);
  });

  it('doubles science, culture and renown from the final gold price, and leaves the receipt count unchanged', () => {
    const { state, city, player } = town('civicReceipts', 'theEndowment', 'thePatronsLedger', 'theStrongbox', 'theDoubleEntry', 'commerceOpenMarket');
    const item = { kind: 'building', id: 'granary' } as const;
    const tech = gatingTech('building', item.id);
    if (tech) player.techsResearched.push(tech);
    bumpRevision(state);
    const price = explainPurchaseCost(state, 0, city.id, item, 'gold')!.total;
    player.statecraft.pendingOrder = { options: ['marketDay' as OrderId] };
    const before = [player.gold, player.culturePool, player.sciencePool, player.renownPool];
    const result = applyCommand(state, { type: 'purchaseItem', playerId: 0, cityId: city.id, currency: 'gold', item });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(before[0]! - player.gold).toBe(price);
    expect(player.culturePool - before[1]!).toBe(Math.floor(price / 4) * 2);
    expect(player.sciencePool - before[2]!).toBe(Math.floor(price / 4) * 2);
    expect(player.renownPool - before[3]!).toBeCloseTo(price / 10 * 2);
    expect(tallyOf(player.statecraft, 'theStrongbox' as OrderId)).toBe(1);
    const lines = explainCardEmpireYields(state, 0);
    expect(lines.find(line => line.card === 'theStrongbox')).toBeDefined();
    expect(lines.find(line => line.card === 'theDoubleEntry')).toMatchObject({ science: 1, culture: 1 });
  });

  it('counts gold purchases, faith purchases and rites once each, from the Votive starting value to its ceiling', () => {
    const { state, city, player } = town('theVotiveAccounts');
    const id = 'theVotiveAccounts' as OrderId;
    const payment = () => explainCardEmpireYields(state, 0)
      .filter(line => line.card === id).reduce((sum, line) => sum + line.culture, 0);
    expect(payment()).toBe(2);
    const item = { kind: 'building', id: 'granary' } as const;
    const tech = gatingTech('building', item.id);
    if (tech) player.techsResearched.push(tech);
    bumpRevision(state);
    expect(applyCommand(state, { type: 'purchaseItem', playerId: 0, cityId: city.id, currency: 'gold', item }).ok).toBe(true);
    expect(payment()).toBe(3);
    spendFaith(state, player, 12);
    expect(payment()).toBe(3);
    performRiteAt(state, player, city, 'riteOfFasting');
    expect(payment()).toBe(4);
    openFaithLadder(state);
    expect(player.pantheon.rungs).toBe(1);
    expect(payment()).toBe(5);
    for (let i = 0; i < 20; i++) buyWithGold(state, player, 10);
    expect(payment()).toBe(20);
  });

  it('applies the Letters of Credit bill for fifteen turns even when it never holds a chair', () => {
    const { state, player } = town();
    player.statecraft.pendingOrder = { options: ['lettersOfCredit' as OrderId] };
    const before = player.gold;
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(player.gold - before).toBe(400);
    expect(player.timed).toContainEqual(expect.objectContaining({
      card: 'lettersOfCredit', expiresTurn: state.turn + 15,
      effect: { kind: 'percentYields', yield: 'gold', percent: -30 },
    }));
  });
});

describe('Commerce unit and tile rules', () => {
  it('lets one merchant take two actions and awards their legacy once', () => {
    const { state, player, city } = town('theCompanyOfTheStaple');
    const unit = createUnit(state, 0, 'greatPerson', city.col, city.row, 'lamassi');
    const act = { type: 'greatPersonAct', playerId: 0, unitId: unit.id } as const;
    const before = player.gold;
    expect(applyCommand(state, act).ok).toBe(true);
    expect(player.gold).toBeGreaterThan(before);
    expect(state.units).toContain(unit);
    expect(player.legacies.filter(row => row.id === 'lamassi')).toHaveLength(0);
    expect(applyCommand(state, act).ok).toBe(true);
    expect(state.units).not.toContain(unit);
    expect(player.legacies.filter(row => row.id === 'lamassi')).toHaveLength(1);
    expect(applyCommand(state, act).ok).toBe(false);
  });

  it('starts a gold-bought soldier at Veteran and leaves a conscript at its usual rank', () => {
    const { state, city } = town('theTenThousand');
    const gold = applyCommand(state, { type: 'purchaseItem', playerId: 0, cityId: city.id,
      currency: 'gold', item: { kind: 'unit', id: 'warrior' } });
    expect(gold.ok, JSON.stringify(gold)).toBe(true);
    const bought = state.units.find(unit => unit.type === 'warrior' && unit.ownerId === 0)!;
    expect(rankOf(bought)).toBe('veteran');
    const free = createUnit(state, 0, 'warrior', city.col + 1, city.row);
    expect(rankOf(free)).toBeNull();
  });

  it('uses the combat seed to capture a defeated ship and never rolls to take a land unit', () => {
    function fight(seed: number, ship: boolean, card: boolean) {
      const { state } = town(...(card ? ['lettersOfMarque'] : []));
      openEveryWar(state);
      for (const grid of state.visibility) grid.fill(2);
      const kind = ship ? 'galley' : 'warrior';
      const a = at(state, 11, 5);
      const b = at(state, 12, 5);
      if (ship) { a.terrain = 'coast'; b.terrain = 'coast'; }
      const attacker = createUnit(state, 0, kind, a.col, a.row);
      const loser = createUnit(state, 1, kind, b.col, b.row);
      loser.hp = 1;
      state.rng = makeRng(seed);
      const result = applyCombat(state, attacker.id, { col: b.col, row: b.row });
      expect(result.ok, JSON.stringify(result)).toBe(true);
      return { captured: state.units.some(unit => unit.id === loser.id && unit.ownerId === 0), roll: state.rng.state };
    }
    const results = [1, 2, 3, 4, 5, 6].map(seed => fight(seed, true, true).captured);
    expect(new Set(results)).toEqual(new Set([true, false]));
    expect(fight(1, true, true).captured).toBe(results[0]);
    expect(fight(1, false, true)).toEqual(fight(1, false, false));
  });

  it('adds only water in the next ring around a coastal city', () => {
    const { state, city } = town('theSeaLords');
    at(state, city.col + 1, city.row).terrain = 'coast';
    const extra = workRadiusOf(state, city) + 1;
    const water = at(state, city.col + extra, city.row);
    const land = at(state, city.col - extra, city.row);
    water.terrain = 'coast';
    bumpRevision(state);
    expect(withinWorkRadius(state, city, water.col, water.row)).toBe(true);
    expect(workRadiusTiles(state, city)).toContain(water);
    expect(withinWorkRadius(state, city, land.col, land.row)).toBe(false);
    at(state, city.col + 1, city.row).terrain = 'grassland';
    bumpRevision(state);
    expect(withinWorkRadius(state, city, water.col, water.row)).toBe(false);
  });
});
