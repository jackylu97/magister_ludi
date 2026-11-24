import { describe, expect, it } from 'vitest';
import { withAiTuning } from '../../src/ai/aiConfig';
import { productionQueueFor } from '../../src/ai/bot';
import { foundCityAt, queueItemCost, settleProductionQueue } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { PROJECT_IDS } from '../../src/sim/projectData';
import { bumpRevision, type QueueItem } from '../../src/sim/state';
import { at, bareState } from './improvementHelpers';

function board() {
  const state = bareState();
  const city = foundCityAt(state, 0, at(state, 4, 5));
  city.queue = [];
  city.hammerBasket = 10000;
  bumpRevision(state);
  return { state, city, player: state.players[0]! };
}

function ranked(...items: QueueItem[]) {
  return items.map((item, index) => ({ item, score: 100 - index }));
}

const buildings: QueueItem[] = [
  { kind: 'building', id: 'granary' },
  { kind: 'building', id: 'monument' },
  { kind: 'building', id: 'library' },
];

describe('a bot uses its current production budget', () => {
  it('queues several worthwhile buildings and completes them in one settlement', () => {
    const { state, city, player } = board();
    const queue = productionQueueFor(state, player, city, ranked(...buildings));
    expect(queue).toEqual(buildings);
    expect(applyCommand(state, { type: 'setCityProduction', playerId: player.id, cityId: city.id, queue }).ok).toBe(true);
    settleProductionQueue(state, city);
    for (const item of buildings) expect(city.buildings).toContain(item.id);
  });

  it('requires another army-demand decision before adding extra units', () => {
    const { state, city, player } = board();
    const warrior: QueueItem = { kind: 'unit', id: 'warrior' };
    const archer: QueueItem = { kind: 'unit', id: 'archer' };
    const queue = productionQueueFor(state, player, city, ranked(warrior, archer, ...buildings));
    expect(queue).toEqual([warrior, ...buildings]);
    expect(applyCommand(state, { type: 'setCityProduction', playerId: player.id, cityId: city.id, queue }).ok).toBe(true);
  });

  it('adds saved progress to an empty queue\'s unassigned production', () => {
    const { state, city, player } = board();
    city.hammerBasket = 0;
    city.itemProgress = { 'building:granary': 10000 };
    bumpRevision(state);
    expect(productionQueueFor(state, player, city, ranked(...buildings))).toEqual(buildings);
  });

  it('uses saved progress on a later row after the preceding row spends the basket', () => {
    const { state, city, player } = board();
    city.queue = [buildings[0]!];
    city.hammerBasket = queueItemCost(state, player.id, buildings[0]!)!;
    city.itemProgress = { 'building:monument': 10000 };
    // Unrest stops production, so only the basket and saved progress can pay.
    city.unrest = { target: 3, progress: 0, unguarded: 0 };
    bumpRevision(state);
    expect(productionQueueFor(state, player, city, ranked(...buildings))).toEqual(buildings);
  });

  it('does not spend a later building\'s saved production on an unfinished head', () => {
    const { state, city, player } = board();
    city.hammerBasket = 0;
    city.itemProgress = { 'building:granary': 10000 };
    const library: QueueItem = { kind: 'building', id: 'library' };
    bumpRevision(state);
    expect(productionQueueFor(state, player, city, ranked(library, buildings[0]!))).toEqual([library]);
  });

  it('stops at a project because the project stays at the front', () => {
    const { state, city, player } = board();
    const project: QueueItem = { kind: 'project', id: PROJECT_IDS[0]! };
    expect(productionQueueFor(state, player, city, ranked(project, ...buildings))).toEqual([project]);
  });

  it('retains the previous queue policy when lookahead is disabled', () => {
    const { state, city, player } = board();
    const queue = withAiTuning({ score: { queueLookaheadTurns: 0 } }, () =>
      productionQueueFor(state, player, city, ranked(...buildings)));
    expect(queue).toEqual([buildings[0]]);
  });
});
