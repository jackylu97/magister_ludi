import { describe, expect, it } from 'vitest';
import { foundCityAt, ownedTiles } from '../../../src/sim/cities';
import { previewCombat } from '../../../src/sim/combat';
import { settleGreatPersonChoice } from '../../../src/sim/greatPeople';
import { openWar } from '../../../src/sim/wars';
import { applyCommand } from '../../../src/sim/commands';
import { runCommissions } from '../../../src/sim/commissions';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { raiseImprovement } from '../../../src/sim/map';
import { nextBeliefRerollCost, nextRerollCost, openFaithLadder } from '../../../src/sim/religion';
import { RELIGION } from '../../../src/sim/religionData';
import { bumpRevision, createUnit, type GameState } from '../../../src/sim/state';
import { explainCardCityYields, explainCardEmpireYields, foldCardYields, reseatCouncil, slotTypesOf, tallyOf } from '../../../src/sim/statecraft';
import { type OrderId, slotLayout } from '../../../src/sim/statecraftData';
import { ABILITY_TECH } from '../../../src/sim/techData';
import { cityContext, explainTileYield } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

function seat(state: GameState, ...cards: OrderId[]): void {
  const council = state.players[0]!.statecraft;
  for (const card of cards) {
    if (!council.orders.includes(card)) council.orders.push(card);
    council.slots.push({ card, sealedUntil: state.turn });
  }
  bumpRevision(state);
}

describe('Magisterial Order changes in November', () => {
  it.each([
    ['scholar', ['theSecondSummons'], 2],
    ['scholar', ['theSecondSummons', 'theCollectedWorks'], 3],
    ['merchant', ['theSecondSummons', 'theCollectedWorks'], 2],
  ] as const)('allows each extra use for a %s with %s', (family, cards, actCount) => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 4, 4));
    const player = state.players[0]!;
    const id = GREAT_PERSON_IDS.find(person => greatPersonDef(person).family === family)!;
    const unit = createUnit(state, 0, 'greatPerson', city.col, city.row, id);
    seat(state, ...cards, 'thePanegyric', 'theSymposium');
    const offerSize = () => player.statecraft.pendingOrder?.options.length ?? 0;
    for (let i = 1; i <= actCount; i++) {
      if (family === 'scholar') player.researching = 'alchemy';
      delete player.statecraft.pendingOrder;
      expect(applyCommand(state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id }).ok).toBe(true);
      expect(offerSize()).toBeGreaterThan(0);
      expect(player.statecraft.freeRerolls).toBe(i);
      expect(state.units.some(other => unit.id === other.id)).toBe(i < actCount);
      expect(player.legacies.filter(legacy => legacy.id === id)).toHaveLength(i === actCount ? 1 : 0);
    }
    expect(applyCommand(state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id }).ok).toBe(false);
    expect(player.statecraft.freeRerolls).toBe(actCount);
  });

  it('prices Hall of Heroes from families recruited, including people still on the board or with a revoked legacy', () => {
    const state = bareState(20, 10);
    foundCityAt(state, 0, at(state, 3, 4));
    foundCityAt(state, 1, at(state, 13, 4));
    openWar(state, 0, 1);
    const player = state.players[0]!;
    seat(state, 'magisterialTheHallofHeroes');
    const attacker = createUnit(state, 0, 'warrior', 7, 4);
    const target = createUnit(state, 1, 'warrior', 8, 4);
    const strength = () => {
      const result = previewCombat(state, attacker.id, target);
      if (!result.ok) throw Error(result.error);
      return result.attackerLines.filter(line => line.source.includes('Hall of Heroes')).reduce((sum, line) => sum + line.amount, 0);
    };
    const merchants = GREAT_PERSON_IDS.filter(id => greatPersonDef(id).family === 'merchant');
    const scholar = GREAT_PERSON_IDS.find(id => greatPersonDef(id).family === 'scholar')!;
    expect(strength()).toBe(0);
    for (const [id, amount] of [[merchants[0]!, 2], [merchants[1]!, 2], [scholar, 4]] as const) {
      player.greatPersonOffer = { options: [id] };
      expect(settleGreatPersonChoice(state, player, 0)).not.toBeNull();
      bumpRevision(state);
      expect(strength()).toBe(amount);
      const unit = state.units.find(piece => piece.person === id)!;
      if (greatPersonDef(id).family === 'merchant') {
        expect(applyCommand(state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id }).ok).toBe(true);
        player.legacies.find(entry => entry.id === id)!.revoked = true;
        bumpRevision(state);
        expect(strength()).toBe(amount);
      }
    }
  });

  it('counts both free and paid redraws once, keeps the tally, and skips a refused redraw', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 4, 4));
    const player = state.players[0]!;
    const sc = player.statecraft;
    const id = 'theRevisedEdition';
    const gate = ABILITY_TECH.get(RELIGION.reroll.ability)!;
    if (!player.techsResearched.includes(gate)) player.techsResearched.push(gate);
    player.faithPool = 5000;
    sc.pendingOrder = { options: ['marketDay', 'firstRites'] };
    bumpRevision(state);
    const full = nextRerollCost(state, 0, 'order');
    seat(state, id);
    const reduced = nextRerollCost(state, 0, 'order');
    expect(reduced).toBeLessThan(full);
    sc.freeRerolls = 1;
    const initialFaith = player.faithPool;
    expect(applyCommand(state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(true);
    expect(player.faithPool).toBe(initialFaith);
    expect(tallyOf(sc, id)).toBe(1);
    const price = nextRerollCost(state, 0, 'order');
    expect(price).toBeGreaterThan(0);
    expect(applyCommand(state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(true);
    expect(initialFaith - player.faithPool).toBe(price);
    expect(tallyOf(sc, id)).toBe(2);
    const paid = () => foldCardYields(explainCardEmpireYields(state, 0).filter(line => line.card === id));
    expect(paid()).toMatchObject({ gold: 4, culture: 4 });
    sc.slots = sc.slots.filter(slot => slot?.card !== id);
    bumpRevision(state);
    expect(paid()).toMatchObject({ gold: 0, culture: 0 });
    seat(state, id);
    delete sc.pendingOrder;
    expect(applyCommand(state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(false);
    expect(tallyOf(sc, id)).toBe(2);
    expect(paid()).toMatchObject({ gold: 4, culture: 4 });
  });

  it('keeps the first belief reroll free and discounts each later faith price', () => {
    const state = bareState();
    foundCityAt(state, 0, at(state, 4, 4));
    const player = state.players[0]!;
    player.faithPool = 5000;
    openFaithLadder(state);
    expect(player.pantheon.pending).toBeDefined();
    expect(nextBeliefRerollCost(state, 0)).toBe(0);
    expect(applyCommand(state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(true);
    const full = nextBeliefRerollCost(state, 0);
    const gold = nextBeliefRerollCost(state, 0, 'gold');
    seat(state, 'theRevisedEdition');
    expect(full).toBeGreaterThan(0);
    expect(nextBeliefRerollCost(state, 0)).toBe(Math.floor(full / 2));
    expect(nextBeliefRerollCost(state, 0, 'gold')).toBe(gold);
    const before = player.faithPool;
    expect(applyCommand(state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(true);
    expect(before - player.faithPool).toBe(Math.floor(full / 2));
    expect(tallyOf(player.statecraft, 'theRevisedEdition')).toBe(1);
  });

  it('counts explicit seating, uses the shorter seal, and keeps the count through government reseating', () => {
    const state = bareState(20, 10);
    const capital = foundCityAt(state, 0, at(state, 3, 4));
    const other = foundCityAt(state, 0, at(state, 12, 4));
    const player = state.players[0]!;
    const council = player.statecraft;
    const id = 'theChangingCouncil';
    council.government = 'imperium';
    council.slots = slotLayout(council.government).map(() => null);
    council.orders = [id, 'theAnteroom', 'thePrytaneion'];
    const chairs = slotTypesOf(council);
    const wild = chairs.indexOf('wildcard'), civic = chairs.indexOf('civic');
    const place = (cardId: OrderId, slotIndex: number) => applyCommand(state, { type: 'slotOrder', playerId: 0, cardId, slotIndex });
    const income = (city: typeof capital, card: OrderId) =>
      foldCardYields(explainCardCityYields(state, city).filter(line => line.card === card));
    expect(place(id, wild).ok).toBe(true);
    expect(tallyOf(council, id)).toBe(1);
    expect(place('theAnteroom', civic).ok).toBe(true);
    expect(tallyOf(council, id)).toBe(2);
    expect(council.slots[civic]!.sealedUntil).toBe(state.turn + 2);
    expect(income(capital, id)).toMatchObject({ culture: 4, production: 4 });
    expect(income(other, id)).toMatchObject({ culture: 0, production: 0 });
    expect(income(capital, 'theAnteroom').culture).toBe(3);
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex: civic }).ok).toBe(false);
    state.turn = council.slots[civic]!.sealedUntil;
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex: civic }).ok).toBe(true);
    expect(place('theAnteroom', civic).ok).toBe(true);
    expect(tallyOf(council, id)).toBe(3);
    reseatCouncil(player, [...council.slots], state.turn);
    expect(tallyOf(council, id)).toBe(3);
  });

  it('pays each work its own yield for each other work in the same town', () => {
    const state = bareState(24, 12);
    const home = foundCityAt(state, 0, at(state, 4, 5));
    const other = foundCityAt(state, 0, at(state, 14, 5));
    const ring = ownedTiles(state, home).filter(tile => tile.col !== home.col || tile.row !== home.row);
    const lone = ownedTiles(state, other).find(tile => tile.col !== other.col || tile.row !== other.row)!;
    for (const [i, work] of ['academy', 'landmark', 'manufactory'].entries()) {
      raiseImprovement(ring[i]!, work as 'academy' | 'landmark' | 'manufactory', state.turn);
    }
    raiseImprovement(lone, 'academy', state.turn);
    home.population = 3;
    home.workedTiles = ring.slice(0, 3).map(({ col, row }) => ({ col, row }));
    const card = 'magisterialTheParadiseGarden';
    seat(state, card);
    expect(runCommissions(state).map(report => report.card)).toContain(card);
    const channels = ['science', 'culture', 'production'] as const;
    for (const [i, tile] of ring.slice(0, 3).entries()) {
      const lines = explainTileYield(tile, cityContext(state, home)).filter(line => line.card === card);
      for (const word of channels) expect(lines.reduce((sum, line) => sum + line[word], 0)).toBe(word === channels[i] ? 4 : 0);
      expect(lines.every(line => line.food === 0 && line.gold === 0 && line.faith === 0)).toBe(true);
    }
    const lines = explainTileYield(lone, cityContext(state, other)).filter(line => line.card === card);
    expect(lines.reduce((sum, line) => sum + line.science, 0)).toBe(0);
  });
});
