import { expect, it } from 'vitest';
import { foundCityAt } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionFigure } from '../../../src/sim/commissions';
import { claimDiscoveryAt, explainDiscoveryOffer } from '../../../src/sim/discoveries';
import { discoveryDef } from '../../../src/sim/discoveryData';
import { bumpRevision, createUnit } from '../../../src/sim/state';
import { TECH_IDS, techDef } from '../../../src/sim/techData';
import { sightOf } from '../../../src/sim/visibility';
import { at, bareState } from '../improvementHelpers';

it.each(['scout', 'warrior'] as const)('keeps the discovery reward from the claiming %s', type => {
  const state = bareState(16, 12);
  const player = state.players[0]!;
  const tile = at(state, 4, 4);
  const piece = createUnit(state, 0, type, tile.col, tile.row);
  const sight = sightOf(state.map, piece, state);
  player.statecraft.orders.push('theClayMap');
  player.statecraft.slots.push({ card: 'theClayMap', sealedUntil: state.turn });
  bumpRevision(state);
  const factor = type === 'scout' ? 2 : 1;
  expect(sightOf(state.map, piece, state)).toBe(sight + factor - 1);
  tile.discovery = 'ruins';
  const offer = claimDiscoveryAt(state, piece, tile)!;
  offer.options = ['tradersHoard'];
  player.statecraft.slots = [];
  bumpRevision(state);
  const printed = discoveryDef('tradersHoard').effect;
  if (printed.kind !== 'pool') throw new Error('Expected a treasury reward');
  expect(explainDiscoveryOffer(state, 0, offer)[0]!.amount).toBe(printed.amount * factor);
  const before = player.gold;
  expect(applyCommand(state, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 }).ok).toBe(true);
  expect(player.gold - before).toBe(printed.amount * factor);
});

it('places both free units from a scout discovery on legal cells', () => {
  const state = bareState(16, 12);
  const player = state.players[0]!;
  player.pendingDiscovery = { kind: 'ruins', col: 4, row: 4, options: ['laborersJoinYou'], doubleReward: true };
  const old = state.units.length;
  expect(applyCommand(state, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 }).ok).toBe(true);
  const units = state.units.slice(old);
  expect(units).toHaveLength(2);
  expect(units.every(unit => unit.freeUpkeep && unit.type === 'worker')).toBe(true);
  expect(new Set(units.map(unit => `${unit.col},${unit.row}`)).size).toBe(2);
});

it('keeps finished copies and cancels second copies in queues when the Order leaves', () => {
  const state = bareState(20, 12);
  const player = state.players[0]!;
  const a = foundCityAt(state, 0, at(state, 3, 5));
  const b = foundCityAt(state, 0, at(state, 10, 5));
  a.buildings.push('forum', 'heroicEpic');
  b.buildings.push('heroicEpic');
  b.queue = [{ kind: 'building', id: 'forum' }, { kind: 'unit', id: 'worker' }];
  b.hammerBasket = 12;
  player.statecraft.orders.push('theSecondSeat');
  const slotIndex = player.statecraft.slots.length;
  player.statecraft.slots.push({ card: 'theSecondSeat', sealedUntil: state.turn });
  bumpRevision(state);
  expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex }).ok).toBe(true);
  expect(b.queue).toEqual([{ kind: 'unit', id: 'worker' }]);
  expect(b.buildings).toContain('heroicEpic');
  expect(b.hammerBasket).toBe(0);
});

it('requires every ordinary first-age technology for The Old Learning', () => {
  const state = bareState(16, 12);
  const player = state.players[0]!;
  const ordinary = TECH_IDS.filter(id => techDef(id).age === 1);
  player.techsResearched = [...ordinary.slice(1), 'smelting'];
  expect(commissionFigure(state, 0, 'firstAgeResearchComplete')).toBe(0);
  player.techsResearched.push(ordinary[0]!);
  expect(commissionFigure(state, 0, 'firstAgeResearchComplete')).toBe(1);
});
