import { describe, expect, it } from 'vitest';
import { type BuildingId, buildingDef } from '../../../src/sim/buildingData';
import { foundCityAt, realiseItem } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionFigure, gardenWorkFor, runCommissions, townWorksWorked, workFamiliesHeld } from '../../../src/sim/commissions';
import { damageImprovement, neighborTiles, raiseImprovement, tileHex } from '../../../src/sim/map';
import { addBuilding, bumpRevision, createUnit, type City, type GameState } from '../../../src/sim/state';
import { cityScopeAdmits, explainCardCityYields, onDraftPayout } from '../../../src/sim/statecraft';
import { countTilesInBorders } from '../../../src/sim/statecraft/evaluator';
import { type OnDraftWindfall, type OrderId, orderDef } from '../../../src/sim/statecraftData';
import { cityContext, foldTile } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

const SPIRIT = 'magisterialTheSpiritWay' as OrderId;
const GARDEN = 'magisterialTheParadiseGarden' as OrderId;
const IDEAL = 'magisterialTheIdealCity' as OrderId;
const MASTERS = 'theMastersDomain' as OrderId;
const HANLIN = 'magisterialTheHanlinAcademy' as OrderId;
const DIVINE = 'theDivineProportion' as OrderId;
const MAUSOLEUM = 'mausoleum' as BuildingId;
const plain: BuildingId[] = ['pyramids', 'stonehenge', 'hangingGardens', 'wallsOfUruk'];

function seat(state: GameState, ...ids: OrderId[]): void {
  const council = state.players[0]!.statecraft;
  for (const card of ids) {
    council.orders.push(card);
    council.slots.push({ card, sealedUntil: state.turn });
  }
  bumpRevision(state);
}

function board(wonders: number, works: number) {
  const state = bareState(24, 14);
  const city = foundCityAt(state, 0, at(state, 6, 7));
  city.population = 4;
  const ring = neighborTiles(state.map, tileHex(at(state, city.col, city.row)));
  for (const id of plain.slice(0, wonders)) addBuilding(state, city, id);
  expect(city.buildings.filter(id => plain.includes(id))).toHaveLength(wonders);
  city.workedTiles = ring.slice(0, works).map(({ col, row }) => ({ col, row }));
  for (const tile of ring.slice(0, works)) raiseImprovement(tile, 'landmark', state.turn);
  bumpRevision(state);
  return { state, city, ring };
}

function wonderLines(state: GameState, city: City) {
  const names = city.buildings.map(id => buildingDef(id).name);
  return explainCardCityYields(state, city).filter(line => names.some(name => line.source.endsWith(' · ' + name)));
}

describe('The Spirit Way and The Paradise Garden', () => {
  it.each([[2, 2], [3, 1], [4, 0]])('pays The Ideal City with %i wonders and %i worked tiles', (wonders, works) => {
    const { state, city } = board(wonders, works);
    seat(state, IDEAL);
    const goal = orderDef(IDEAL).commission!.goals[0]!;
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', goal)).toBe(works);
    seat(state, SPIRIT);
    expect(townWorksWorked(state, city)).toBe(4);
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', goal)).toBe(2);
    expect(runCommissions(state).map(report => report.card)).toContain(IDEAL);
    expect(runCommissions(state)).toEqual([]);
  });

  it('cannot combine wonders or works in separate towns for The Ideal City', () => {
    const { state, city } = board(2, 1);
    const other = foundCityAt(state, 0, at(state, 15, 7));
    addBuilding(state, other, plain[2]!);
    seat(state, SPIRIT, IDEAL);
    expect(townWorksWorked(state, city, 2)).toBe(1);
    expect(runCommissions(state)).toEqual([]);
  });

  it('counts wonders in town scopes without creating a tile, a family or a neighbouring work', () => {
    const { state, city } = board(2, 0);
    const owners = state.tileOwner.slice();
    seat(state, SPIRIT, 'theLandmarkBounds' as OrderId);
    realiseItem(state, city, { kind: 'building', id: plain[2]! });
    addBuilding(state, city, 'theMagnumOpus');
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, { test: 'workingGreatWork' })).toBe(true);
    for (const atLeast of [3, 4]) {
      expect(cityScopeAdmits(state, city, { test: 'workingTiles', on: { test: 'greatWork' }, atLeast })).toBe(atLeast === 3);
    }
    expect(countTilesInBorders(state, 0, { test: 'greatWork' })).toBe(3);
    expect(countTilesInBorders(state, 0, { test: 'improvement', improvement: 'academy' })).toBe(0);
    expect(countTilesInBorders(state, 0, { test: 'beside', of: { test: 'greatWork' } })).toBe(0);
    expect(commissionFigure(state, 0, 'worksHeld')).toBe(3);
    expect(workFamiliesHeld(state, 0)).toEqual([]);
    expect(gardenWorkFor(state, 0, 0)).toBeNull();
    expect(state.tileOwner).toEqual(owners);
    expect(city.workedTiles).toEqual([]);
    expect(wonderLines(state, city)).toEqual([]);
  });

  it('counts each wonder once in the actual Grand Retrospective payout', () => {
    const { state } = board(3, 1);
    seat(state, SPIRIT);
    const id = 'theGrandRetrospective' as OrderId;
    const arms = orderDef(id).onDraft!.filter((grant): grant is OnDraftWindfall => grant.grant === 'windfall');
    const payout = onDraftPayout(state, 0, id, arms).grants;
    for (const voice of ['culture', 'science', 'production']) {
      expect(payout.filter(line => line.yield === voice).reduce((sum, line) => sum + line.amount, 0)).toBe(40 * (3 + 1 + state.players[0]!.statecraft.orders.length));
    }
  });

  it('pays only card yields on each wonder and adds the Garden, Mausoleum and Commentaries bonuses', () => {
    const { state, city } = board(2, 0);
    addBuilding(state, city, MAUSOLEUM);
    state.players[0]!.leader = 'hypatiaOfAlexandria';
    seat(state, MASTERS, HANLIN, DIVINE, GARDEN);
    expect(wonderLines(state, city)).toEqual([]);
    expect(runCommissions(state)).toEqual([]);
    seat(state, SPIRIT);
    expect(runCommissions(state).map(report => report.card)).toContain(GARDEN);
    const lines = wonderLines(state, city);
    for (const id of [...plain.slice(0, 2), MAUSOLEUM]) {
      const rows = lines.filter(line => line.source.endsWith(' · ' + buildingDef(id).name));
      for (const [voice, base] of [['food', 6], ['production', 6], ['science', 2]] as const) {
        expect(rows.reduce((sum, line) => sum + line[voice], 0)).toBe(base * 2 * 3.5);
      }
      expect(rows.every(line => !line.gold && !line.faith && !line.culture)).toBe(true);
    }
  });

  it('pays the lasting reward on real works and restores it after a repair command', () => {
    const { state, city, ring } = board(0, 3);
    const tile = ring[0]!;
    const worker = createUnit(state, 0, 'worker', tile.col, tile.row);
    seat(state, GARDEN);
    const before = foldTile(tile, cityContext(state, city));
    expect(runCommissions(state).map(report => report.card)).toContain(GARDEN);
    const doubled = foldTile(tile, cityContext(state, city));
    expect(before.culture).toBeGreaterThan(0);
    expect(doubled.culture).toBe(2 * before.culture);
    damageImprovement(tile, state.turn);
    bumpRevision(state);
    expect(foldTile(tile, cityContext(state, city)).culture).toBeLessThan(doubled.culture);
    expect(applyCommand(state, { type: 'repairImprovement', playerId: 0, unitId: worker.id }).ok).toBe(true);
    expect(foldTile(tile, cityContext(state, city))).toEqual(doubled);
  });
});
