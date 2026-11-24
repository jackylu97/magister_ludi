import { describe, expect, it } from 'vitest';

import { buildingDef, type BuildingId } from '../../src/sim/buildingData';
import { buildingProductionCost, foundCityAt, payGrants, payOccasionRiders, realiseItem } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { settleGreatPersonChoice } from '../../src/sim/greatPeople';
import { levyOptions } from '../../src/sim/levies';
import { neighborTiles, raiseImprovement, tileHex } from '../../src/sim/map';
import { renownPerTurn } from '../../src/sim/renown';
import { addBuilding, bumpRevision, createUnit, type City, type GameState } from '../../src/sim/state';
import { cardRulePercent, explainCardCityYields, windfallPayout } from '../../src/sim/statecraft';
import { type OrderId } from '../../src/sim/statecraftData';
import { BUILDING_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';
import { wagerCount } from '../../src/sim/wagers';
import { cityContext, foldTile } from '../../src/sim/yields/hex';
import { at, bareState } from './improvementHelpers';

function board() {
  const state = bareState(22, 12);
  const home = foundCityAt(state, 0, at(state, 4, 5));
  const other = foundCityAt(state, 0, at(state, 14, 5));
  home.queue = [];
  other.queue = [];
  return { state, home, other, player: state.players[0]! };
}

function raise(state: GameState, city: City, id: BuildingId): void {
  addBuilding(state, city, id);
  bumpRevision(state);
}

function seat(state: GameState, card: OrderId): void {
  state.players[0]!.statecraft.orders.push(card);
  state.players[0]!.statecraft.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

function paid(state: GameState, city: City, card: BuildingId, voice: 'production' | 'science' | 'culture') {
  return explainCardCityYields(state, city).filter(line => line.card === card).reduce((sum, line) => sum + line[voice], 0);
}

describe('the approved wonder review', () => {
  it('Mausoleum doubles only a work’s own yields, including renewals', () => {
    const { state, home, player } = board();
    const tile = at(state, 5, 5);
    raiseImprovement(tile, 'academy', state.turn);
    player.greatPeopleByFamily = { scholar: 3 };
    const own = foldTile(tile, cityContext(state, home));
    raise(state, home, 'greatLibrary');
    const library = foldTile(tile, cityContext(state, home));
    expect(library.science - own.science).toBe(6);
    raise(state, home, 'mausoleum');
    const mausoleum = foldTile(tile, cityContext(state, home));
    expect(mausoleum.science - library.science).toBe(own.science);
    expect(mausoleum.food).toBe(library.food);
    expect(mausoleum.production).toBe(library.production);
    // A proxy work on a wonder has no base improvement for Mausoleum to raise.
    seat(state, 'magisterialTheSpiritWay');
    const workRows = explainCardCityYields(state, home);
    expect(workRows.filter(line => line.card === 'mausoleum')).toEqual([]);
  });

  it('Pyramids counts every held wonder but pays only the city that holds it', () => {
    const { state, home, other } = board();
    raise(state, home, 'pyramids');
    expect(paid(state, home, 'pyramids', 'production')).toBe(3);
    raise(state, other, 'stonehenge');
    expect(paid(state, home, 'pyramids', 'production')).toBe(6);
    expect(paid(state, other, 'pyramids', 'production')).toBe(0);
    other.ownerId = 1;
    bumpRevision(state);
    expect(paid(state, home, 'pyramids', 'production')).toBe(3);
    expect(buildingDef('pyramids').effects?.some(effect => effect.kind === 'unitStat')).toBe(false);
  });

  it('Ashurbanipal pays Library cities and completes the current research on capture', () => {
    const { state, home, other, player } = board();
    raise(state, home, 'libraryOfAshurbanipal');
    expect(paid(state, home, 'libraryOfAshurbanipal', 'science')).toBe(0);
    raise(state, other, 'library');
    expect(paid(state, other, 'libraryOfAshurbanipal', 'science')).toBe(3);
    player.techsResearched = ['letters'];
    player.researching = 'mathematics';
    player.sciencePool = 0;
    bumpRevision(state);
    expect(windfallPayout(state, 0, 'capture', 0, 0).completeResearch).toBe(true);
    payOccasionRiders(state, player, 'capture', home);
    expect(player.techsResearched).toContain('mathematics');
    expect(player.researching).toBeNull();
    expect(player.sciencePool).toBe(0);
    expect(windfallPayout(state, 0, 'capture', 0, 0).completeResearch).toBeUndefined();
  });

  it.each(['trained', 'purchased', 'levied', 'granted'] as const)('Terracotta copies a %s unit once and pays unit-gained rewards twice', (source) => {
    const { state, home, player } = board();
    raise(state, home, 'terracottaArmy');
    player.timed = [{ card: 'theRoyalHousehold', expiresTurn: state.turn + 1, effect: {
      kind: 'windfallRider', occasion: 'unitCompletion', grant: { yield: 'gold', amount: 7 },
    } }];
    bumpRevision(state);
    const before = state.units.length;
    const gold = player.gold;
    const built = player.unitsBuilt.warrior ?? 0;
    const gained = player.unitsGained?.warrior ?? 0;
    const options = source === 'trained' ? {} : source === 'purchased' ? { bought: 'gold' as const } : source === 'levied' ? { levied: 'muster' as const } : { free: true };
    realiseItem(state, home, { kind: 'unit', id: 'warrior', tile: at(state, home.col, home.row) }, options);
    const born = state.units.slice(before);
    expect(born).toHaveLength(2);
    expect(born.map(unit => unit.type)).toEqual(['warrior', 'warrior']);
    expect(born[1]!.freeUpkeep).toBe(true);
    expect(player.unitsGained?.warrior).toBe(gained + 2);
    expect(player.gold - gold).toBe(14);
    expect(player.unitsBuilt.warrior ?? 0).toBe(built + (source === 'granted' || unitDef('warrior').escalation === undefined ? 0 : 1));
    expect(JSON.stringify(born)).not.toContain('unitCopy');
  });

  it('Terracotta covers building gifts, civilian units and recruited named people', () => {
    const { state, home, player } = board();
    raise(state, home, 'terracottaArmy');
    const before = state.units.length;
    payGrants(state, home, [{ grant: 'unit', unit: 'worker' }]);
    expect(state.units.slice(before).map(unit => unit.type)).toEqual(['worker', 'worker']);
    player.greatPersonOffer = { options: ['homer'] };
    const recruited = state.units.length;
    const report = settleGreatPersonChoice(state, player, 0);
    expect(report?.unitId).not.toBeNull();
    const people = state.units.slice(recruited).filter(unit => unit.person === 'homer');
    expect(people).toHaveLength(2);
    expect(people.every(unit => unit.freeUpkeep)).toBe(true);
    expect(state.recruited.filter(id => id === 'homer')).toHaveLength(1);
  });

  it('Terracotta does not duplicate existing units and skips a copy when no legal tile remains', () => {
    const { state, home, other } = board();
    raise(state, home, 'terracottaArmy');
    const before = state.units.length;
    realiseItem(state, other, { kind: 'unit', id: 'warrior', tile: at(state, other.col, other.row) });
    expect(state.units.length - before).toBe(1);
    for (const tile of neighborTiles(state.map, tileHex(at(state, home.col, home.row)))) createUnit(state, 0, 'warrior', tile.col, tile.row);
    const blocked = state.units.length;
    realiseItem(state, home, { kind: 'unit', id: 'warrior', tile: at(state, home.col, home.row) });
    expect(state.units.length - blocked).toBe(1);
  });

  it('Walls of Uruk grants a Palisade and pays every Palisade city', () => {
    const { state, home, other } = board();
    realiseItem(state, home, { kind: 'building', id: 'wallsOfUruk' });
    expect(home.buildings.filter(id => id === 'palisade')).toHaveLength(1);
    expect(paid(state, home, 'wallsOfUruk', 'production')).toBe(2);
    expect(paid(state, home, 'wallsOfUruk', 'culture')).toBe(2);
    expect(paid(state, other, 'wallsOfUruk', 'production')).toBe(0);
    raise(state, other, 'palisade');
    expect(paid(state, other, 'wallsOfUruk', 'production')).toBe(2);
    expect(buildingDef('wallsOfUruk').authorityCapacity).toBe(2);
  });

  it('Great Wall pays each garrisoned city and follows changes in the garrison', () => {
    const { state, home, other } = board();
    raise(state, home, 'greatWall');
    expect(paid(state, home, 'greatWall', 'production')).toBe(0);
    const guard = createUnit(state, 0, 'warrior', other.col, other.row);
    expect(paid(state, other, 'greatWall', 'production')).toBe(3);
    expect(paid(state, other, 'greatWall', 'culture')).toBe(3);
    guard.col++;
    bumpRevision(state);
    expect(paid(state, other, 'greatWall', 'production')).toBe(0);
  });

  it('Solomon raises recurring renown and no longer reduces the recruitment price', () => {
    const { state, home } = board();
    raise(state, home, 'solomonsTemple');
    const withTemple = renownPerTurn(state, 0);
    const row = buildingDef('solomonsTemple');
    const original = row.effects;
    row.effects = original?.filter(effect => effect.kind !== 'cityRenownPercent');
    bumpRevision(state);
    try {
      expect(withTemple).toBeCloseTo(renownPerTurn(state, 0) * 1.15);
    } finally {
      row.effects = original;
      bumpRevision(state);
    }
    expect(cardRulePercent(state, 0, 'greatPersonCost').filter(line => line.card === 'solomonsTemple')).toEqual([]);
  });

  it('Sun levy previews and settles all three banks from the population before the levy', () => {
    const { state, home, other, player } = board();
    home.population = 4;
    home.largestSize = 4;
    raise(state, home, 'pyramidOfTheSun');
    player.researching = null;
    player.researchQueue = [];
    player.greatPersonOffer = { options: ['homer'] };
    const option = levyOptions(state, 0, home).find(row => row.use === 'faith');
    expect(option).toMatchObject({ faith: 20, science: 20, renown: 12, label: 'Gain faith, science, renown' });
    expect(levyOptions(state, 0, other).some(row => row.use === 'faith')).toBe(false);
    const before = { faith: player.faithPool, science: player.sciencePool, renown: player.renownPool };
    expect(applyCommand(state, { type: 'levyCitizen', playerId: 0, cityId: home.id, use: 'faith' }).ok).toBe(true);
    expect(home.population).toBe(3);
    expect(player.faithPool - before.faith).toBe(20);
    expect(player.sciencePool - before.science).toBe(20);
    expect(player.renownPool - before.renown).toBe(12);
    expect(levyOptions(state, 0, home).find(row => row.use === 'faith')?.blocked).not.toBeNull();
  });

  it('moves the wonders without changing their lanes and counts the new age for wagers', () => {
    expect(BUILDING_UNLOCK_TECH.get('notreDame')).toBe('feudalism');
    expect(BUILDING_UNLOCK_TECH.get('machuPicchu')).toBe('colonialCharters');
    expect(techDef('feudalism').unlocks.buildings).toContain('castle');
    expect(buildingProductionCost('notreDame')).toBe(1127);
    expect(buildingProductionCost('machuPicchu')).toBe(860);
    const { state, home } = board();
    state.ageClose = { age: 2, turn: state.turn };
    raise(state, home, 'machuPicchu');
    expect(wagerCount(state, 0, 'wondersOfThisAge')).toBe(1);
  });
});
