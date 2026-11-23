import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { roadsBuiltBy } from '../../src/sim/empireGold';
import { advanceAlongPath } from '../../src/sim/movement';
import { canTransit, findPath, moveProfile, pathTurns, reachableTiles, roadStepCost, snapMovement, stepCost, zocField } from '../../src/sim/pathfind';
import { connectedCities, layRoad } from '../../src/sim/roads';
import { RULES } from '../../src/sim/rulesData';
import { bumpRevision, createUnit } from '../../src/sim/state';
import { techDef } from '../../src/sim/techData';
import { routeProfile } from '../../src/sim/trade';
import { at, bareState } from './improvementHelpers';

describe('city centers as road junctions', () => {
  it('prices entry and exit as road steps, without writing road marks', () => {
    const state = bareState(24, 12);
    foundCityAt(state, 0, at(state, 5, 5));
    const unit = createUnit(state, 0, 'warrior', 5, 5);
    const center = at(state, 5, 5);
    const road = at(state, 6, 5);
    layRoad(road, 1);
    bumpRevision(state);
    const profile = moveProfile(state, unit);
    const field = zocField(state, 0);
    expect(stepCost(state.map, center, road, profile, field)?.cost).toBe(roadStepCost);
    expect(stepCost(state.map, road, center, profile, field)?.cost).toBe(roadStepCost);
    expect(stepCost(state.map, center, at(state, 4, 5), profile, field)?.cost).toBe(1);
    expect(center.road).toBeUndefined();
    expect(roadsBuiltBy(state, 0)).toBe(0);
  });

  it('agrees across path, highlight, estimate and executed movement with a discounted road price', () => {
    const state = bareState(32, 12);
    foundCityAt(state, 0, at(state, 5, 5));
    for (let col = 6; col <= 15; col++) layRoad(at(state, col, 5), 0);
    const unit = createUnit(state, 0, 'warrior', 5, 5);
    const effects = techDef('kingship').effects!;
    const length = effects.length;
    effects.push({ kind: 'rulePercent', rule: 'roadStepCost', percent: -40 });
    state.players[0]!.techsResearched.push('kingship');
    try {
      bumpRevision(state);
      const goal = at(state, 15, 5);
      const path = findPath(state, unit, goal)!;
      expect(path).toHaveLength(10);
      expect(pathTurns(state, unit, path)).toBe(1);
      expect(reachableTiles(state, unit).find(row => row.tile === goal)?.cost).toBe(2);
      expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: unit.id, target: { col: goal.col, row: goal.row } }).ok).toBe(true);
      expect([unit.col, unit.row, unit.movesLeft]).toEqual([15, 5, 0]);
      expect(at(state, 5, 5).road).toBeUndefined();
    } finally {
      effects.splice(length);
      bumpRevision(state);
    }
  });

  it('joins adjacent cities and still bars entry into another owner\'s city', () => {
    const state = bareState(24, 12);
    foundCityAt(state, 0, at(state, 5, 5));
    const second = foundCityAt(state, 0, at(state, 6, 5));
    const unit = createUnit(state, 0, 'warrior', 5, 5);
    const firstTile = at(state, 5, 5);
    const secondTile = at(state, 6, 5);
    expect(stepCost(state.map, firstTile, secondTile, moveProfile(state, unit), zocField(state, 0))?.cost).toBe(roadStepCost);
    expect(connectedCities(state, 0).map(row => row.city.id)).toContain(second.id);
    expect(roadsBuiltBy(state, 0)).toBe(0);
    second.ownerId = 1;
    bumpRevision(state);
    expect(canTransit(state, unit, secondTile)).toBe(false);
    expect(firstTile.road).toBeUndefined();
    expect(secondTile.road).toBeUndefined();
  });

  it('keeps the zone-of-control toll on a step out of a city', () => {
    const state = bareState(24, 12);
    foundCityAt(state, 0, at(state, 5, 4));
    const unit = createUnit(state, 0, 'warrior', 5, 4);
    layRoad(at(state, 6, 4), 0);
    createUnit(state, 1, 'warrior', 5, 3);
    bumpRevision(state);
    const price = stepCost(state.map, at(state, 5, 4), at(state, 6, 4), moveProfile(state, unit), zocField(state, 0))!;
    expect(price).toEqual({ cost: snapMovement(roadStepCost + RULES.movement.zocExtraCost), zoc: true });
    const full = unit.movesLeft;
    advanceAlongPath(state, unit, [{ col: 6, row: 4 }]);
    expect(unit.movesLeft).toBe(snapMovement(full - price.cost));
  });

  it('keeps shore crossings and naval launch costs unchanged', () => {
    const state = bareState(24, 12);
    at(state, 6, 5).terrain = 'coast';
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const worker = createUnit(state, 0, 'worker', 5, 5);
    const hull = createUnit(state, 0, 'trireme', 5, 5);
    bumpRevision(state);
    const from = at(state, city.col, city.row);
    const to = at(state, 6, 5);
    expect(stepCost(state.map, from, to, moveProfile(state, worker), zocField(state, 0))?.cost).toBe(worker.movesLeft);
    expect(stepCost(state.map, from, to, moveProfile(state, hull), zocField(state, 0))?.cost).toBe(1);
    expect(from.road).toBeUndefined();
    expect(to.road).toBeUndefined();
  });

  it('makes city centers free of road maintenance even after a trader has paved them', () => {
    const state = bareState(24, 12);
    const from = foundCityAt(state, 0, at(state, 5, 5));
    const to = foundCityAt(state, 0, at(state, 10, 5));
    for (let col = 5; col <= 10; col++) layRoad(at(state, col, 5), 0);
    bumpRevision(state);
    expect(roadsBuiltBy(state, 0)).toBe(4);
    expect(connectedCities(state, 0).map(row => row.city.id)).toContain(to.id);
    const trader = createUnit(state, 0, 'trader', 5, 5);
    const profile = routeProfile(state, trader, 'land', from, to);
    expect(stepCost(state.map, at(state, 5, 5), at(state, 6, 5), profile, zocField(state, 0))?.cost).toBe(roadStepCost);
  });
});
