import { describe, expect, it } from 'vitest';
import { foundCityAt, raiseOnDraft } from '../../../src/sim/cities';
import { commissionFigure } from '../../../src/sim/commissions';
import { addBuilding, bumpRevision, createUnit } from '../../../src/sim/state';
import { buildImprovementAt, improvementErrorAt, repairImprovementAt } from '../../../src/sim/improvements';
import { improvementDef, isUniqueImprovement } from '../../../src/sim/improvementData';
import { damageImprovement, neighborTiles, raiseImprovement, tileHex } from '../../../src/sim/map';
import { explainRenown } from '../../../src/sim/renown';
import { combatLineAmount, tileConditionHolds } from '../../../src/sim/statecraft/evaluator';
import { tallyOf } from '../../../src/sim/statecraft/draft';
import { charterImprovements, orderDef } from '../../../src/sim/statecraftData';
import { cityContext, explainTileYield, foldTile } from '../../../src/sim/yields/hex';
import { at, bareState, woodedWorker } from '../improvementHelpers';

describe('Expansionist charter improvements', () => {
  it('opens the work at draft and enforces its ground and town limits', () => {
    const { state, tile } = woodedWorker();
    const seat = state.players[0]!;
    expect(improvementErrorAt(state, 0, tile, 'totemPole')).toContain('The Totem Poles');
    seat.statecraft.orders.push('theTotemPoles', 'theStepwells', 'theBarays', 'theHillforts', 'theDesertAndTheSnow');
    bumpRevision(state);
    expect(improvementErrorAt(state, 0, tile, 'totemPole')).toBeNull();
    raiseImprovement(at(state, 6, 5), 'totemPole', state.turn);
    expect(improvementErrorAt(state, 0, tile, 'totemPole')).toContain('already has');
    tile.feature = 'none';
    tile.hills = true;
    expect(improvementErrorAt(state, 0, tile, 'hillfort')).toBeNull();
    expect(improvementErrorAt(state, 0, tile, 'stepwell')).toBeTruthy();
    tile.hills = false;
    tile.freshwater = false;
    expect(improvementErrorAt(state, 0, tile, 'stepwell')).toBeNull();
    expect(improvementErrorAt(state, 0, tile, 'baray')).toBeTruthy();
    tile.riverEdges = 1;
    tile.freshwater = true;
    expect(improvementErrorAt(state, 0, tile, 'baray')).toBeNull();
    expect(improvementErrorAt(state, 0, tile, 'stepwell')).toBeTruthy();
    tile.terrain = 'desert';
    expect(improvementErrorAt(state, 0, tile, 'nazcaLines')).toBeNull();
    tile.feature = 'floodplain';
    expect(improvementErrorAt(state, 0, tile, 'nazcaLines')).toBeTruthy();
    tile.feature = 'none';
    tile.terrain = 'snow';
    expect(improvementErrorAt(state, 0, tile, 'inuksuk')).toBeNull();
  });

  it('counts charter, charter technology and leader improvements, including both Gathering Grounds works', () => {
    expect(charterImprovements(orderDef('theFishTraps').charter)).toEqual(['fishTraps', 'wildOrchard']);
    for (const id of ['fishTraps', 'wildOrchard', 'terraces', 'paradiseGarden', 'physicGarden', 'polder', 'qanat'] as const) {
      expect(isUniqueImprovement(id), id).toBe(true);
    }
    for (const id of ['farm', 'forestGarden', 'academy'] as const) expect(isUniqueImprovement(id), id).toBe(false);
  });

  it('reads adjacent works and woods and removes the gift after pillage', () => {
    const { state, city, tile } = woodedWorker();
    const [other, second] = neighborTiles(state.map, tileHex(tile));
    tile.terrain = 'desert';
    tile.feature = 'none';
    raiseImprovement(tile, 'nazcaLines', 1);
    raiseImprovement(other!, 'nazcaLines', 1);
    raiseImprovement(second!, 'nazcaLines', 1);
    bumpRevision(state);
    expect(foldTile(tile, cityContext(state, city))).toMatchObject({ faith: 6, culture: 2 });
    damageImprovement(other!, 2);
    bumpRevision(state);
    expect(foldTile(tile, cityContext(state, city)).faith).toBe(4);
    tile.feature = 'forest';
    raiseImprovement(other!, 'totemPole', 3);
    bumpRevision(state);
    const paid = foldTile(tile, cityContext(state, city));
    damageImprovement(other!, 4);
    bumpRevision(state);
    const bare = foldTile(tile, cityContext(state, city));
    expect(paid.production - bare.production).toBe(1);
    expect(paid.culture - bare.culture).toBe(1);
  });

  it('counts matching adjacent works once and pays hillfort defence separately from its production', () => {
    const { state, city, tile } = woodedWorker();
    const [first, second] = neighborTiles(state.map, tileHex(tile));
    raiseImprovement(first!, 'farm', 1);
    raiseImprovement(second!, 'polder', 1);
    raiseImprovement(tile, 'baray', 1);
    bumpRevision(state);
    const baray = explainTileYield(tile, cityContext(state, city));
    expect(baray.find(line => line.source === 'Baray · neighbouring tiles')?.production).toBe(4);
    raiseImprovement(tile, 'hillfort', 2);
    raiseImprovement(second!, 'pasture', 2);
    bumpRevision(state);
    const hillfort = explainTileYield(tile, cityContext(state, city));
    expect(hillfort.find(line => line.source === 'Hillfort · neighbouring tiles')?.production).toBe(2);
    expect(improvementDef('hillfort').defense).toBe(5);
    raiseImprovement(tile, 'inuksuk', 3);
    raiseImprovement(first!, 'inuksuk', 3);
    bumpRevision(state);
    expect(foldTile(tile, cityContext(state, city)).culture).toBe(3);
  });

  it('supplies fresh water and engineer renown while the stepwell is intact', () => {
    const { state, city, tile } = woodedWorker();
    const neighbour = at(state, 6, 4);
    const water = () => tileConditionHolds(neighbour, { test: 'freshwater' }, undefined, undefined, state.turn, cityContext(state, city)?.ground);
    const renown = () => explainRenown(state, 0).filter(line => line.source.includes('Stepwell'));
    expect(water()).toBe(false);
    raiseImprovement(tile, 'stepwell', state.turn);
    bumpRevision(state);
    expect(water()).toBe(true);
    expect(renown()).toMatchObject([{ family: 'engineer', amount: 1, perTurn: true }]);
    damageImprovement(tile, state.turn);
    bumpRevision(state);
    expect(water()).toBe(false);
    expect(renown()).toEqual([]);
  });

  it('counts ordinary builds, unique builds and charge-free repairs separately', () => {
    const { state, worker, tile } = woodedWorker();
    const seat = state.players[0]!;
    for (const card of ['theMakersOfLand', 'commissionTheReclaimedLands'] as const) {
      seat.statecraft.orders.push(card);
      seat.statecraft.slots.push({ card, sealedUntil: state.turn });
    }
    worker.chargesLeft = 5;
    bumpRevision(state);
    buildImprovementAt(state, worker, tile, 'wildOrchard');
    buildImprovementAt(state, worker, at(state, 6, 5), 'farm');
    expect(tallyOf(seat.statecraft, 'theMakersOfLand')).toBe(2);
    expect(tallyOf(seat.statecraft, 'commissionTheReclaimedLands')).toBe(1);
    damageImprovement(tile, state.turn);
    bumpRevision(state);
    expect(tileConditionHolds(tile, { test: 'uniqueImprovement' })).toBe(false);
    repairImprovementAt(state, worker, tile);
    expect(tileConditionHolds(tile, { test: 'uniqueImprovement' })).toBe(true);
    expect(tallyOf(seat.statecraft, 'commissionTheReclaimedLands')).toBe(1);
    expect(tallyOf(seat.statecraft, 'theMakersOfLand')).toBe(2);
  });

  it('pays the Fyrd on the occupied hex on attack and defence and caps the strength at six', () => {
    const { state, city, tile } = woodedWorker();
    const unit = createUnit(state, 0, 'warrior', tile.col, tile.row);
    const effect = orderDef('theFyrd').effects[0]!;
    if (effect.kind !== 'combatLine') throw Error('Missing Fyrd strength line');
    const situation = {
      unit, side: 'attack' as const, tile: at(state, 0, 0), vsBarbarians: false, vsCity: false, targetHp: 10, targetMaxHp: 10,
    };
    const bag = foldTile(tile, cityContext(state, city));
    const start = Math.floor(Object.values(bag).reduce((a, b) => a + b, 0) / 2);
    expect(combatLineAmount(state, situation, effect) ?? 0).toBe(start);
    raiseImprovement(tile, 'nazcaLines', 1);
    for (const near of neighborTiles(state.map, tileHex(tile))) raiseImprovement(near, 'nazcaLines', 1);
    bumpRevision(state);
    expect(combatLineAmount(state, situation, effect)).toBe(6);
    expect(combatLineAmount(state, { ...situation, side: 'defend' }, effect)).toBe(6);
    unit.col = 0;
    unit.row = 0;
    expect(combatLineAmount(state, { ...situation, tile }, effect)).toBeNull();
  });

  it('grants one citizen to every owned town on draft and counts the buildings each town holds', () => {
    const state = bareState(22, 12);
    const home = foundCityAt(state, 0, at(state, 3, 5));
    const second = foundCityAt(state, 0, at(state, 10, 5));
    const rival = foundCityAt(state, 1, at(state, 16, 5));
    const before = [home.population, second.population, rival.population];
    raiseOnDraft(state, state.players[0]!, 'theSevenFatYears');
    expect([home.population, second.population, rival.population]).toEqual([before[0]! + 1, before[1]! + 1, before[2]]);
    addBuilding(state, home, 'granary');
    addBuilding(state, second, 'watermill');
    addBuilding(state, rival, 'granary');
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'publicWorks')).toBe(2);
  });
});
