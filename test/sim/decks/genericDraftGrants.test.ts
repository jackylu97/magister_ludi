import { describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { explainYields } from '../../../src/ai/prices';
import { boonTurns, onDraftWorth } from '../../../src/ai/value';
import { buildingProductionCost, foundCityAt, growthThreshold, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { addBuilding, bumpRevision, type GameState } from '../../../src/sim/state';
import { tallyOf } from '../../../src/sim/statecraft';
import type { OrderId } from '../../../src/sim/statecraftData';
import { explainTechCost, foldTechCost } from '../../../src/sim/tech';
import { foldEmpireRates } from '../../../src/sim/yields/empire';
import { at, bareState } from '../improvementHelpers';

const LITURGIES = 'theLiturgies';
const EMBASSY = 'theLearnedEmbassy';

function town(state: GameState, col: number, population: number, ownerId = 0) {
  const city = foundCityAt(state, ownerId, at(state, col, 5));
  city.population = population;
  city.largestSize = population;
  refreshCityDerived(state, city);
  return city;
}

function draft(state: GameState, card: OrderId): void {
  const player = state.players[0]!;
  player.statecraft.pendingOrder = { options: [card] };
  expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
  expect(player.statecraft.orders).toContain(card);
  expect(player.statecraft.slots.some((slot) => slot?.card === card)).toBe(false);
}

describe('Generic Boons that pay a scaled grant on draft', () => {
  it('banks each town’s grant before growth and finishes its queue with ordinary overflow', () => {
    const state = bareState(28, 12);
    const home = town(state, 3, 2);
    const second = town(state, 9, 4);
    const idle = town(state, 15, 1);
    const rival = town(state, 22, 4, 1);
    const player = state.players[0]!;
    player.statecraft.orders.push('theBrickKilns');
    player.statecraft.slots.push({ card: 'theBrickKilns', sealedUntil: state.turn });
    for (const city of [home, second]) {
      city.foodBasket = growthThreshold(city.population);
      city.queue = [{ kind: 'building', id: 'monument' }, { kind: 'building', id: 'granary' }];
      city.hammerBasket = buildingProductionCost('monument', state, 0) - 5;
    }
    idle.hammerBasket = 2;
    rival.hammerBasket = 3;
    bumpRevision(state);

    draft(state, LITURGIES);
    expect(home.population).toBe(3);
    expect(second.population).toBe(5);
    expect(home.buildings).toContain('monument');
    expect(second.buildings).toContain('monument');
    expect(second.buildings).toContain('granary');
    expect(home.queue).toEqual([{ kind: 'building', id: 'granary' }]);
    expect(second.queue).toEqual([]);
    expect(home.hammerBasket).toBe(15);
    expect(second.hammerBasket).toBe(35 - buildingProductionCost('granary', state, 0));
    expect(idle.hammerBasket).toBe(12);
    expect(rival.hammerBasket).toBe(3);
    expect(tallyOf(player.statecraft, 'theBrickKilns')).toBe(3);
  });

  it('adds the grant to a queued wonder', () => {
    const state = bareState();
    const home = town(state, 3, 2);
    const wonder = 'stonehenge';
    home.queue = [{ kind: 'building', id: wonder }];
    home.hammerBasket = buildingProductionCost(wonder, state, 0) - 3;
    draft(state, LITURGIES);
    expect(state.wonders).toContainEqual(expect.objectContaining({ building: wonder, playerId: 0 }));
    expect(home.hammerBasket).toBe(17);
  });

  it('reads current empire science once and settles research through its normal riders', () => {
    const state = bareState(24, 12);
    const home = town(state, 3, 3);
    const second = town(state, 9, 2);
    const player = state.players[0]!;
    player.statecraft.orders.push('theBrickKilns', 'theJourneymen');
    player.statecraft.slots.push({ card: 'theBrickKilns', sealedUntil: state.turn }, { card: 'theJourneymen', sealedUntil: state.turn });
    player.statecraft.tallies.push({ card: 'theBrickKilns', count: 4 });
    player.techsResearched = player.techsResearched.filter((id) => id !== 'letters');
    player.researching = 'letters';
    player.researchQueue = [];
    addBuilding(state, home, 'library');
    refreshCityDerived(state, home);
    bumpRevision(state);
    const cost = foldTechCost(explainTechCost(state, player, 'letters'));
    player.sciencePool = cost - 1;
    const science = foldEmpireRates(state, 0).sciencePerTurn;
    expect(science).toBeGreaterThan(4);

    draft(state, EMBASSY);
    expect(player.techsResearched).toContain('letters');
    expect(player.researching).toBeNull();
    expect(player.sciencePool).toBe(science * 8 - 1);
    expect(home.hammerBasket).toBe(9);
    expect(second.hammerBasket).toBe(6);
  });

  it('prices the whole population grant and the current science rate once', () => {
    const state = bareState(24, 12);
    const home = town(state, 3, 3);
    town(state, 9, 4);
    town(state, 17, 7, 1);
    addBuilding(state, home, 'library');
    refreshCityDerived(state, home);
    bumpRevision(state);
    const ctx = valueContext(state, state.players[0]!);
    const science = foldEmpireRates(state, 0).sciencePerTurn;
    expect(onDraftWorth(LITURGIES, ctx)).toBe(explainYields({ production: 70 }, ctx).total / boonTurns(ctx));
    expect(onDraftWorth(EMBASSY, ctx)).toBe(explainYields({ science: 8 * science }, ctx).total / boonTurns(ctx));
  });
});
