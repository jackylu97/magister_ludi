import { expect, it } from 'vitest';
import { valueContext } from '../../../src/ai/bot';
import { onDraftWorth } from '../../../src/ai/value';
import { buildingProductionCost, foundCityAt, realiseItem } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { bumpRevision, createUnit, type GameState } from '../../../src/sim/state';
import { windfallPayout } from '../../../src/sim/statecraft/evaluator';
import type { OrderId } from '../../../src/sim/statecraftData';
import { advanceResearch, explainTechCost, foldTechCost, grantCapturedTechnology, researchPlan } from '../../../src/sim/tech';
import { TECH_IDS, techDef } from '../../../src/sim/techData';
import { unitDef } from '../../../src/sim/unitData';
import { at, bareState } from '../improvementHelpers';
import { buyCommand } from '../purchaseHelpers';

function seat(state: GameState, ...cards: OrderId[]): void {
  const player = state.players[0]!;
  for (const card of cards) {
    player.statecraft.orders.push(card);
    player.statecraft.slots.push({ card, sealedUntil: state.turn });
  }
  bumpRevision(state);
}

function board() {
  const state = bareState(16, 12);
  const home = foundCityAt(state, 0, at(state, 3, 5));
  const rival = foundCityAt(state, 1, at(state, 10, 5));
  return { state, home, rival, player: state.players[0]! };
}

it('opens an earned hand after the pending hand and places only buildable unit classes in the capital', () => {
  const { state, player } = board();
  player.techsResearched = TECH_IDS.filter(id => techDef(id).age === 1);
  const next = TECH_IDS.find(id => techDef(id).age === 2)!;
  player.researching = next;
  player.sciencePool = 1000;
  seat(state, 'theReformOfTheCalendar', 'theOrdinanceCompanies');
  player.statecraft.pendingOrder = { options: ['theBrickKilns'] };
  const drafts = player.statecraft.drafts;
  const culture = player.culturePool;
  advanceResearch(state);
  expect(player.techsResearched).toContain(next);
  expect(player.statecraft.waitingLadderDrafts).toBe(1);
  const types = state.units.filter(unit => unit.ownerId === 0 && unit.freeUpkeep).map(unit => unitDef(unit.type).modelClass);
  expect(types).toContain('melee');
  expect(types).toContain('ranged');
  expect(types).not.toContain('siege');
  const pick = applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 });
  expect(pick.ok).toBe(true);
  expect(player.statecraft.waitingLadderDrafts).toBeUndefined();
  expect(player.statecraft.pendingOrder?.options.length).toBeGreaterThan(0);
  expect(player.statecraft.pendingOrder?.price).toBeUndefined();
  expect(player.statecraft.drafts).toBe(drafts + 1);
  expect(player.culturePool).toBe(culture);
});

it('places the newly unlocked siege engine when Mathematics opens the third age', () => {
  const { state, player } = board();
  player.techsResearched = TECH_IDS.filter(id => techDef(id).age < 3);
  player.researching = 'mathematics';
  player.sciencePool = 1000;
  seat(state, 'theOrdinanceCompanies');
  advanceResearch(state);
  expect(state.units.filter(unit => unit.ownerId === 0 && unit.freeUpkeep).map(unit => unit.type)).toContain('catapult');
});

it('prices a free technology by the science still required', () => {
  const { state, player } = board();
  player.techsResearched = ['agriculture'];
  player.researching = null;
  const worth = () => onDraftWorth('theAlfonsineTables', valueContext(state, player));
  expect(worth()).toBe(0);
  player.researching = 'mining';
  bumpRevision(state);
  const full = worth();
  expect(full).toBeGreaterThan(0);
  player.sciencePool = foldTechCost(explainTechCost(state, player, 'mining')) - 1;
  bumpRevision(state);
  expect(worth()).toBeGreaterThan(0);
  expect(worth()).toBeLessThan(full);
});

it('completes the research head on draft and on wonder completion, leaving the next node in place', () => {
  const { state, player, home } = board();
  player.techsResearched = ['agriculture'];
  player.researching = 'mining';
  player.researchQueue = ['husbandry', 'fletching'];
  player.sciencePool = 4;
  player.statecraft.pendingOrder = { options: ['theAlfonsineTables'] };
  expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
  expect(player.techsResearched).toContain('mining');
  expect(researchPlan(player)).toEqual(['husbandry', 'fletching']);
  seat(state, 'theLodgeBooks');
  realiseItem(state, home, { kind: 'building', id: 'stonehenge' });
  expect(player.techsResearched).toContain('husbandry');
  expect(researchPlan(player)).toEqual(['fletching']);
});

it.each([true, false])('captures a city with an available technology = %s', hasTech => {
  const { state, rival, player } = board();
  const other = state.players[1]!;
  player.techsResearched = ['agriculture'];
  other.techsResearched = hasTech ? ['agriculture','mining','bronzeWorking'] : ['agriculture'];
  player.researching = 'fletching';
  player.sciencePool = 3;
  rival.population = 4;
  rival.hp = 0;
  seat(state, 'carriedOffScholars');
  const attacker = createUnit(state, 0, 'warrior', 9, 5);
  const price = foldTechCost(explainTechCost(state, player, 'fletching'));
  const result = applyCommand(state, { type: 'attack', playerId: 0, unitId: attacker.id, target: { col: 10, row: 5 } });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  expect(rival.ownerId).toBe(0);
  if (hasTech) {
    expect(player.techsResearched).toContain('mining');
    expect(player.techsResearched).not.toContain('bronzeWorking');
    expect(player.researching).toBe('fletching');
    expect(player.sciencePool).toBe(3);
  } else {
    expect(player.techsResearched).toContain('fletching');
    expect(player.sciencePool).toBe(3 + 30 * 4 - price);
    expect(player.techsResearched).not.toContain('mining');
  }
});

it('pays the printed building cost on purchase and grants a scholar only for the first empire building of its kind', () => {
  const { state, player, home } = board();
  seat(state, 'theApprentices', 'theDedications', 'theInvitations');
  player.gold = 10000;
  player.researching = null;
  player.statecraft.pendingOrder = { options: ['theBrickKilns'] };
  const science = player.sciencePool, culture = player.culturePool;
  const cost = buildingProductionCost('library', state, 0);
  const result = applyCommand(state, buyCommand(home.id, { kind: 'building', id: 'library' }));
  expect(result.ok, JSON.stringify(result)).toBe(true);
  expect(player.sciencePool - science).toBeCloseTo(cost / 5);
  expect(player.culturePool - culture).toBe(cost);
  const second = foundCityAt(state, 0, at(state, 3, 10));
  realiseItem(state, home, { kind: 'building', id: 'greatArchive' }, { fromProduction: true });
  expect(player.greatPersonOffer?.options.length).toBeGreaterThan(0);
  delete player.greatPersonOffer;
  realiseItem(state, second, { kind: 'building', id: 'greatArchive' }, { fromProduction: true });
  expect(player.greatPersonOffer).toBeUndefined();
  const facts = { building: 'greatArchive' as const, firstBuildingKind: false, buildingCost: 100 };
  expect(windfallPayout(state, 0, 'buildingCompletion', 0, 0, facts).people).toBeUndefined();
});

it('keeps unassigned science and drops the learned node from a planned queue', () => {
  const { state, player } = board();
  player.techsResearched = ['agriculture'];
  player.researching = null;
  player.sciencePool = 9;
  grantCapturedTechnology(state, player, 'mining');
  expect(player.sciencePool).toBe(9);
  expect(player.researching).toBeNull();
  player.researching = 'fletching';
  player.researchQueue = ['husbandry', 'earthenware'];
  grantCapturedTechnology(state, player, 'husbandry');
  expect(researchPlan(player)).toEqual(['fletching', 'earthenware']);
  expect(player.sciencePool).toBe(9);
});
