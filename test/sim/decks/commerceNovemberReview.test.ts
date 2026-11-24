import { expect, it } from 'vitest';
import { foundCityAt } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionFigure } from '../../../src/sim/commissions';
import { cancelDealsBetween, openDeal } from '../../../src/sim/deals';
import { createMap } from '../../../src/sim/map';
import { explainPurchaseCost } from '../../../src/sim/purchase';
import { bumpRevision, createUnit, type GameState } from '../../../src/sim/state';
import { explainCardEmpireYields, explainCardPercentYields, tallyOf } from '../../../src/sim/statecraft';
import { orderDef, type OrderId } from '../../../src/sim/statecraftData';
import { gatingTech } from '../../../src/sim/tech';
import { resetVisibility } from '../../../src/sim/visibility';
import { at, bareState } from '../improvementHelpers';
import { newGame } from '../newGameHelpers';

function seat(state: GameState, ...cards: OrderId[]): void {
  const council = state.players[0]!.statecraft;
  for (const card of cards) {
    council.orders.push(card);
    council.slots.push({ card, sealedUntil: state.turn });
  }
  bumpRevision(state);
}

it('counts a partner once across duplicate routes and deals and loses it when both stop', () => {
  const state = newGame({
    seed: 42, sizeName: 'standard', players: [
      { name: 'A', color: '#a00', isHuman: true }, { name: 'B', color: '#00a', isHuman: false },
      { name: 'C', color: '#0a0', isHuman: false },
    ],
  });
  state.map = createMap({ width: 24, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = []; state.cities = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const first = foundCityAt(state, 1, at(state, 10, 4));
  const second = foundCityAt(state, 2, at(state, 17, 4));
  const partnerCards = ['theTreatyPorts', 'theExchange', 'theWorldsExchange'] as const;
  seat(state, ...partnerCards);
  for (const id of partnerCards) {
    const effects = orderDef(id).effects.filter(effect => 'count' in effect);
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every(effect => 'count' in effect && effect.count === 'dealPartners')).toBe(true);
  }
  for (const id of ['commissionTheTradeMission', 'theWorldsFair'] as const) {
    expect(orderDef(id).commission!.goals[0]).toMatchObject({ kind: 'reached', figure: 'dealPartners' });
  }
  const count = (expected: number) => {
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'dealPartners')).toBe(expected);
    const rate = (card: OrderId, voice: 'production' | 'science') =>
      explainCardPercentYields(state, home).filter(line => line.card === card && line.yield === voice)
        .reduce((total, line) => total + line.percent, 0);
    expect(rate('theTreatyPorts', 'production')).toBe(8 * expected);
    expect(rate('theExchange', 'science')).toBe(5 * expected);
  };
  count(0);
  openDeal(state, 1, 1, 0, { goldPerTurn: 1 }, {});
  count(1);
  const carts = [first, first, second, home].map(to => {
    const unit = createUnit(state, 0, 'trader', home.col, home.row);
    unit.trade = { from: home.id, to: to.id, outbound: true };
    return unit;
  });
  count(2);
  openDeal(state, 2, 2, 0, { goldPerTurn: 1 }, {});
  cancelDealsBetween(state, 0, 1);
  count(2);
  for (const unit of carts) delete unit.trade;
  count(1);
  cancelDealsBetween(state, 0, 2);
  count(0);
});

it('lets gold purchase Orders trigger on a purchased wonder and doubles their payments', () => {
  const state = bareState();
  const city = foundCityAt(state, 0, at(state, 4, 4));
  const player = state.players[0]!;
  const item = { kind: 'building', id: 'stonehenge' } as const;
  const gate = gatingTech('building', item.id);
  if (gate && !player.techsResearched.includes(gate)) player.techsResearched.push(gate);
  player.gold = 100000;
  player.statecraft.pendingOrder = { options: ['marketDay'] };
  seat(state, 'theGildedScaffold', 'theStrongbox', 'theDoubleEntry', 'boughtAndPaidFor');
  const price = explainPurchaseCost(state, 0, city.id, item, 'gold')!.total;
  const before = player.gold;
  const result = applyCommand(state, { type: 'purchaseItem', playerId: 0, currency: 'gold', cityId: city.id, item });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  expect(before - player.gold).toBe(price);
  expect(city.buildings).toContain(item.id);
  expect(tallyOf(player.statecraft, 'theStrongbox')).toBe(1);
  expect(player.buildingsBoughtWithGold).toBe(1);
  const purchaseBonus = explainCardEmpireYields(state, 0).filter(line => line.card === 'theDoubleEntry');
  expect(purchaseBonus.some(line => line.culture === 1 && line.science === 1)).toBe(true);
  const lines = explainCardPercentYields(state, city);
  expect(lines.filter(line => line.card === 'theGildedScaffold')).toEqual([]);
  expect(lines.find(line => line.card === 'boughtAndPaidFor' && line.yield === 'production')?.percent).toBe(2);
});
