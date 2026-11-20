import { describe, expect, it } from 'vitest';
import { valueContext } from '../../src/ai/bot';
import { explainEffects } from '../../src/ai/value';
import { greatPersonDef } from '../../src/sim/greatPeopleData';
import { bestMeleeFor, foundCityAt, openDoctrineOffer } from '../../src/sim/cities';
import { applyCombat } from '../../src/sim/combat';
import { applyCommand } from '../../src/sim/commands';
import { greatPersonWorkError } from '../../src/sim/greatPeople';
import { getTileAt } from '../../src/sim/map';
import { explainRouteSenderYieldBetween, explainRouteYieldBetween, foldRouteYield } from '../../src/sim/routeYields';
import { bumpRevision, createUnit, type City, type GameState } from '../../src/sim/state';
import { describeCard } from '../../src/sim/statecraft';
import { openFreeDraft } from '../../src/sim/statecraft/draft';
import { routeSlots } from '../../src/sim/trade';
import { greatPersonCard } from '../../src/ui/greatPersonFace';
import { bareState } from './improvementHelpers';
import { found, game } from './statecraftHelpers';
import { openEveryWar } from './warHelpers';

describe('grants paid when a great person is spent', () => {
  it('keeps the current hand and deals both John Dee drafts after a pick and a pass', () => {
    const { state } = game(4);
    const city = found(state, 0);
    const player = state.players[0]!;
    const unit = createUnit(state, 0, 'greatPerson', city.col, city.row, 'johnDee');
    expect(openFreeDraft(state, player)).toBe(true);
    const hand = player.statecraft.pendingOrder;
    const drafts = player.statecraft.drafts;
    expect(applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: 'mining' }).ok).toBe(true);
    const spend = { type: 'greatPersonAct', playerId: 0, unitId: unit.id } as const;
    expect(applyCommand(state, spend).ok).toBe(true);
    expect(player.statecraft.pendingOrder).toBe(hand);
    expect(player.statecraft.waitingOrderOffers).toBe(2);
    expect(applyCommand(state, spend).ok).toBe(false);
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(player.statecraft.pendingOrder?.options.length).toBeGreaterThan(0);
    expect(player.statecraft.pendingOrder?.price).toBeUndefined();
    expect(player.statecraft.waitingOrderOffers).toBe(1);
    expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    expect(player.statecraft.pendingOrder?.options.length).toBeGreaterThan(0);
    expect(player.statecraft.waitingOrderOffers).toBeUndefined();
    expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    expect(player.statecraft.pendingOrder).toBeUndefined();
    expect(player.statecraft.drafts).toBe(drafts);
    expect(greatPersonCard('johnDee').legacy[0]?.text).toContain('when spent, open 2 free Order drafts');
    expect(greatPersonCard('johnDee').legacy[0]?.text).not.toContain('Forever');
  });

  it('pays Aesop for a work and deals the free hand after an outstanding Doctrine', () => {
    const { state } = game(43);
    const city = found(state, 0);
    const player = state.players[0]!;
    const unit = createUnit(state, 0, 'greatPerson', city.col, city.row, 'aesop');
    const place = state.map.tiles.find(tile => {
      unit.col = tile.col;
      unit.row = tile.row;
      return greatPersonWorkError(state, 0, unit.id) === null;
    });
    expect(place).toBeDefined();
    player.statecraft.freeRerolls = 1;
    player.statecraft.government = 'councilOfElders';
    bumpRevision(state);
    expect(openDoctrineOffer(state, player)).toBe(true);
    expect(applyCommand(state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id }).ok).toBe(true);
    expect(player.statecraft.freeRerolls).toBe(4);
    expect(player.statecraft.waitingOrderOffers).toBe(1);
    expect(player.statecraft.pendingOrder).toBeUndefined();
    expect(applyCommand(state, { type: 'skipDoctrineOffer', playerId: 0 }).ok).toBe(true);
    expect(player.statecraft.pendingOrder?.options.length).toBeGreaterThan(0);
    expect(player.statecraft.waitingOrderOffers).toBeUndefined();
    expect(player.legacies.some(record => record.id === 'aesop')).toBe(true);
  });
});

function town(state: GameState, owner: number, col: number, row: number): City {
  return foundCityAt(state, owner, getTileAt(state.map, col, row)!);
}

it('gives Belisarius one free unit of the best buildable melee type after capture', () => {
  const state = bareState(18, 12);
  openEveryWar(state);
  town(state, 0, 1, 1);
  town(state, 1, 13, 7);
  const target = town(state, 1, 6, 4);
  target.population = 6;
  target.hp = 1;
  const raider = createUnit(state, 0, 'warrior', 5, 4);
  state.players[0]!.legacies.push({ id: 'belisarius', age: 4 });
  bumpRevision(state);
  const best = bestMeleeFor(state, 0);
  expect(best).not.toBeNull();
  const before = state.nextEntityId;
  expect(applyCombat(state, raider.id, target).ok).toBe(true);
  expect(target.ownerId).toBe(0);
  const recruits = state.units.filter(unit => unit.id >= before && unit.ownerId === 0);
  expect(recruits).toHaveLength(1);
  expect(recruits[0]).toMatchObject({ type: best, freeUpkeep: true });
});

it('adds a route slot and pays the sea bonus on domestic and foreign routes', () => {
  const state = bareState(18, 12);
  const from = town(state, 0, 1, 1);
  const home = town(state, 0, 7, 4);
  const foreign = town(state, 1, 13, 7);
  from.population = 8;
  home.population = 6;
  bumpRevision(state);
  const returns = (mode: 'land' | 'sea') => [
    foldRouteYield(explainRouteYieldBetween(state, from, home, mode)),
    foldRouteYield(explainRouteSenderYieldBetween(state, from, foreign, mode)),
  ];
  const trader = createUnit(state, 0, 'trader', from.col, from.row);
  trader.trade = { from: from.id, to: home.id, outbound: true };
  const bonus = greatPersonDef('ibnMajid').legacy.filter(effect => effect.kind === 'effectAmplifier');
  const appraisal = () => explainEffects(bonus, valueContext(state, state.players[0]!)).total;
  bumpRevision(state);
  expect(appraisal()).toBe(0);
  trader.trade.sea = true;
  bumpRevision(state);
  expect(appraisal()).toBeGreaterThan(0);
  const before = returns('sea');
  const land = returns('land');
  const slots = routeSlots(state, 0);
  state.players[0]!.legacies.push({ id: 'ibnMajid', age: 4 });
  bumpRevision(state);
  expect(routeSlots(state, 0)).toBe(slots + 1);
  expect(returns('land')).toEqual(land);
  expect(returns('sea')).toEqual(before.map(totals =>
    Object.fromEntries(Object.entries(totals).map(([voice, amount]) => [voice, amount * 1.5])),
  ));
  expect(before.every(totals => Object.values(totals).some(amount => amount > 0))).toBe(true);
  expect(describeCard('ibnMajid').map(clause => clause.text)).toContain('your trade routes by sea pay +50%');
});
