import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../../src/sim/cities';
import { previewCombat } from '../../../src/sim/combat';
import { applyCommand } from '../../../src/sim/commands';
import { bumpRevision, createUnit, type GameState } from '../../../src/sim/state';
import { cardCityStat, explainCardCityYields } from '../../../src/sim/statecraft';
import type { OrderId } from '../../../src/sim/statecraftData';
import { explainCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

function seatOrders(state: GameState, ...orders: OrderId[]): void {
  const council = state.players[0]!.statecraft;
  council.orders.push(...orders);
  council.slots.push(...orders.map((card) => ({ card, sealedUntil: state.turn })));
  bumpRevision(state);
}

describe('Generic Order effects', () => {
  it('adds food only to worked resource tiles in the capital', () => {
    const state = bareState();
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const other = foundCityAt(state, 0, at(state, 8, 5));
    const capitalWheat = at(state, 3, 4);
    const unworkedWheat = at(state, 2, 5);
    const otherWheat = at(state, 8, 4);
    capitalWheat.resource = 'wheat';
    unworkedWheat.resource = 'wheat';
    otherWheat.resource = 'wheat';
    capital.workedTiles = [capitalWheat, at(state, 4, 5)];
    other.workedTiles = [otherWheat];
    seatOrders(state, 'theHomeFields');

    const capitalFood = explainCity(state, capital).lines.filter((line) => line.card === 'theHomeFields');
    const otherFood = explainCity(state, other).lines.filter((line) => line.card === 'theHomeFields');
    expect(capitalFood.map((line) => line.food)).toEqual([1]);
    expect(otherFood).toEqual([]);
  });

  it('grants culture when a worker improves a visible resource', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 3, 5));
    at(state, 3, 4).resource = 'wheat';
    const resourceWorker = createUnit(state, 0, 'worker', 3, 4);
    const plainWorker = createUnit(state, 0, 'worker', 4, 5);
    const player = state.players[0]!;
    seatOrders(state, 'firstFruitsFeasts');
    const before = player.culturePool;

    expect(applyCommand(state, {
      type: 'buildImprovement', playerId: 0, unitId: plainWorker.id, improvement: 'farm',
    })).toMatchObject({ ok: true });
    expect(player.culturePool).toBe(before);
    expect(applyCommand(state, {
      type: 'buildImprovement', playerId: 0, unitId: resourceWorker.id, improvement: 'farm',
    })).toMatchObject({ ok: true });
    expect(player.culturePool).toBe(before + 5);
  });

  it('counts citizens across the empire and pays only where the Magnum Opus is first in the queue', () => {
    const state = bareState(20, 10);
    const capital = foundCityAt(state, 0, at(state, 3, 5));
    const opusTown = foundCityAt(state, 0, at(state, 8, 5));
    const rival = foundCityAt(state, 1, at(state, 13, 5));
    capital.population = 5;
    opusTown.population = 4;
    rival.population = 20;
    const opus = { kind: 'building', id: 'theMagnumOpus' } as const;
    opusTown.queue = [opus];
    seatOrders(state, 'theGrandDesign', 'theLastWalls');

    const production = () => explainCardCityYields(state, opusTown)
      .filter((line) => line.card === 'theGrandDesign')
      .map((line) => line.production);
    const defence = () => cardCityStat(state, opusTown, 'defense')
      .filter((line) => line.card === 'theLastWalls')
      .map((line) => line.amount);
    expect(production()).toEqual([4]);
    expect(defence()).toEqual([15]);
    expect(explainCardCityYields(state, capital).some((line) => line.card === 'theGrandDesign')).toBe(false);
    expect(cardCityStat(state, capital, 'defense').some((line) => line.card === 'theLastWalls')).toBe(false);

    opusTown.queue = [{ kind: 'building', id: 'granary' }, opus];
    bumpRevision(state);
    expect(production()).toEqual([]);
    expect(defence()).toEqual([]);
  });

  it('subtracts strength from Light Kit units on attack and defence', () => {
    const state = bareState();
    const own = createUnit(state, 0, 'warrior', 3, 5);
    const rival = createUnit(state, 1, 'warrior', 4, 5);
    seatOrders(state, 'lightKit');

    const attack = previewCombat(state, own.id, rival);
    const defence = previewCombat(state, rival.id, own);
    expect(attack).toMatchObject({
      ok: true,
      attackerLines: expect.arrayContaining([{ source: 'Order · Light Kit', amount: -2 }]),
    });
    expect(defence).toMatchObject({
      ok: true,
      defenderLines: expect.arrayContaining([{ source: 'Order · Light Kit', amount: -2 }]),
    });
  });
});
