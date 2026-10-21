/**
 * **Dominion batch D5, "units gained and new moments"**
 * (`docs/plans/dominion-build-triage.md`). `dominion.test.ts` checks the rows
 * against the sheet. This file checks that the shapes the batch added do what
 * the cards say:
 *
 *   · a tally of every unit gained, free units included (The Gathering Host);
 *   · unit grants: the best melee unit, and each military unit a technology
 *     unlocks, in the capital or in each town a scope admits (The State Forges,
 *     The Armourers' Secret, The Open Muster, The Landsturm);
 *   · a unit raised when a card is drafted (The Sword of State, The Cleruchy);
 *   · four new moments: a draft passed, a captured town razed, an attack from
 *     range and a great person gained (The Open Muster, The Sack, The
 *     Longbowmen, The Mural Crown);
 *   · a grant counted by a count (Valhalla, The Mural Crown);
 *   · science toward the technology of a unit killed (Copying the Enemy);
 *   · a free Order draft, at most once every ten turns (The New Code);
 *   · a muster that costs a citizen (Total Mobilisation);
 *   · a strength line beside a great general (The Landsturm).
 *
 * Dominion batch D9 retired The State Forges, The Armourers' Secret, The Open
 * Muster and The Cleruchy. A save may still hold any of them, so their shapes
 * are still checked here by seating them directly.
 */

import { describe, expect, it } from 'vitest';

import { explainCard, scoreCard, valueContext } from '../../../src/ai/bot';
import { foundCityAt, raiseFreeUnit } from '../../../src/sim/cities';
import { applyCombat, previewCombat } from '../../../src/sim/combat';
import { applyCommand } from '../../../src/sim/commands';
import { razeCityAt } from '../../../src/sim/diplomacy';
import { settleGreatPersonChoice } from '../../../src/sim/greatPeople';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import { bumpEconomy } from '../../../src/sim/slate';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  cardRulePercent,
  describeCard,
  eligibleFor,
  explainCardEmpireYields,
  foldCardYields,
  musterPeriodicUnits,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { type DoctrineId, type OrderId } from '../../../src/sim/statecraftData';
import { settleResearchWindfall } from '../../../src/sim/tech';
import { techDef } from '../../../src/sim/techData';
import { type UnitTypeId } from '../../../src/sim/unitData';
import { unitUpkeepOf } from '../../../src/sim/upkeep';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';

/** Two seats on a flat grassland rectangle, at war unless told otherwise. */
function flat(war = true): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  if (war) {
    const seats = realPlayers(state);
    openWar(state, seats[0]!.id, seats[1]!.id);
  }
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = seat(state, playerId).statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  touch(state);
}

/** Gives this seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, playerId: number, id: string): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  touch(state);
}

/** Re-reads the board after a write the test made by hand. */
function touch(state: GameState): void {
  bumpRevision(state);
  bumpEconomy(state);
}

/**
 * Holds a draft open, so culture a test pays stays in the pool where the test
 * can read it (a waiting draft stops the next one from spending it).
 */
function holdDraftOpen(state: GameState, playerId: number): void {
  const player = seat(state, playerId);
  player.statecraft.pendingOrder = { options: eligibleFor(state, player).slice(0, 1) };
}

/** Seat 0's units of one type standing on the town's hex or beside it. */
function unitsNear(state: GameState, city: City, type: string): Unit[] {
  return state.units.filter(
    (unit) =>
      unit.ownerId === city.ownerId &&
      unit.type === type &&
      Math.abs(unit.col - city.col) <= 1 &&
      Math.abs(unit.row - city.row) <= 1,
  );
}

/** Finishes `tech` for seat 0 at once, its prerequisites given by hand. */
function finish(state: GameState, prereqs: string[], tech: string): void {
  const player = seat(state, 0);
  for (const id of prereqs) {
    if (!player.techsResearched.includes(id as never)) player.techsResearched.push(id as never);
  }
  player.researching = tech as never;
  delete player.researchQueue;
  player.sciencePool = 100000;
  touch(state);
  expect(settleResearchWindfall(state, player)?.techId).toBe(tech);
}

/** Seat 1's town at (6, 4), taken by seat 0's warrior. Seat 0's capital is at (1, 1). */
function captured(state: GameState): { city: City; home: City } {
  const home = foundCityAt(state, 0, at(state, 1, 1))!;
  foundCityAt(state, 1, at(state, 13, 7));
  const city = foundCityAt(state, 1, at(state, 6, 4))!;
  city.population = 6;
  city.hp = 1;
  const raider = createUnit(state, 0, 'warrior', 5, 4);
  touch(state);
  expect(applyCombat(state, raider.id, { col: 6, row: 4 }).ok).toBe(true);
  expect(city.ownerId).toBe(0);
  touch(state);
  return { city, home };
}

describe('Dominion D5 — units gained', () => {
  it('The Gathering Host grows by +1 science and +1 culture for each military unit gained, free units included', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theGatheringHost');
    const yields = (): { science: number; culture: number } => {
      const folded = foldCardYields(explainCardEmpireYields(state, 0));
      return { science: folded.science, culture: folded.culture };
    };
    expect(yields()).toEqual({ science: 2, culture: 2 });
    // A free unit counts as gained (the triage's reading 1).
    expect(raiseFreeUnit(state, city, 'warrior')).not.toBeNull();
    touch(state);
    expect(yields()).toEqual({ science: 3, culture: 3 });
    // Since Dominion batch D12 a civilian does not count (reading 20).
    expect(raiseFreeUnit(state, city, 'worker')).not.toBeNull();
    touch(state);
    expect(yields()).toEqual({ science: 3, culture: 3 });
  });

  it('The State Forges raise the best melee unit in the capital for each technology, free of upkeep', () => {
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theStateForges');
    finish(state, ['mining'], 'bronzeWorking');
    // Bronze Working opens the Spearman, the best melee unit from then on.
    const raised = unitsNear(state, capital, 'spearman');
    expect(raised).toHaveLength(1);
    expect(raised[0]!.freeUpkeep).toBe(true);
    expect(unitUpkeepOf(raised[0]!)).toBe(0);
  });

  it("The Armourers' Secret raises one of each military unit the technology unlocks, and nothing for one that unlocks none", () => {
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theArmourersSecret');
    finish(state, [], 'mining');
    expect(state.units.filter((unit) => unit.ownerId === 0)).toHaveLength(0);
    finish(state, ['stonecraft', 'mining'], 'bronzeWorking');
    expect(unitsNear(state, capital, 'spearman')).toHaveLength(1);
    // The Wheel opens two: the Chariot and the Chariot Archer, each raised
    // even without the resource (the triage's reading 10).
    finish(state, [], 'theWheel');
    expect(unitsNear(state, capital, 'chariot')).toHaveLength(1);
    expect(unitsNear(state, capital, 'chariotArcher')).toHaveLength(1);
    for (const unit of state.units) expect(unit.freeUpkeep, unit.type).toBe(true);
  });

  it('The Sword of State and The Cleruchy raise their unit in the capital when drafted', () => {
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 4, 4))!;
    const player = seat(state, 0);
    player.statecraft.pendingOrder = { options: ['theSwordOfState' as OrderId] };
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    const sword = unitsNear(state, capital, 'warrior');
    expect(sword).toHaveLength(1);
    expect(sword[0]!.freeUpkeep).toBe(true);
    player.statecraft.pendingOrder = { options: ['theCleruchy' as OrderId] };
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(unitsNear(state, capital, 'settler')).toHaveLength(1);
    // Seated, neither card does anything: they have no effects.
    expect(player.statecraft.orders).toEqual(['theSwordOfState', 'theCleruchy']);
  });
});

describe('Dominion D5 — new moments', () => {
  it('The Open Muster raises the best melee unit in the capital when a draft hand is passed', () => {
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theOpenMuster');
    holdDraftOpen(state, 0);
    expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    const raised = unitsNear(state, capital, 'warrior');
    expect(raised).toHaveLength(1);
    expect(raised[0]!.freeUpkeep).toBe(true);
  });

  it('The Landsturm raises a unit in each town of five or more when a draft is passed', () => {
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 1, 1))!;
    const big = foundCityAt(state, 0, at(state, 6, 4))!;
    const small = foundCityAt(state, 0, at(state, 11, 7))!;
    capital.population = 7;
    big.population = 5;
    small.population = 4;
    hold(state, 0, 'theLandsturm');
    holdDraftOpen(state, 0);
    expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    expect(unitsNear(state, capital, 'warrior')).toHaveLength(1);
    expect(unitsNear(state, big, 'warrior')).toHaveLength(1);
    expect(unitsNear(state, small, 'warrior')).toHaveLength(0);
  });

  it('The Landsturm gives melee units +3 strength, doubled beside a great general', () => {
    const state = flat();
    hold(state, 0, 'theLandsturm');
    const line = (unit: Unit, col: number, row: number): number => {
      const view = previewCombat(state, unit.id, { col, row });
      if (!view.ok) throw new Error(view.error);
      return view.attackerLines
        .filter((row) => row.source.includes('Landsturm'))
        .reduce((sum, row) => sum + row.amount, 0);
    };
    const alone = createUnit(state, 0, 'warrior', 4, 2);
    createUnit(state, 1, 'warrior', 5, 2);
    expect(line(alone, 5, 2)).toBe(3);
    const flanked = createUnit(state, 0, 'warrior', 4, 6);
    createUnit(state, 1, 'warrior', 5, 6);
    createUnit(state, 0, 'greatPerson', 3, 6, 'ahmoseSonOfEbana');
    touch(state);
    expect(line(flanked, 5, 6)).toBe(6);
    // A ranged unit is not a melee unit.
    const archer = createUnit(state, 0, 'archer', 9, 2);
    createUnit(state, 1, 'warrior', 10, 2);
    expect(line(archer, 10, 2)).toBe(0);
  });

  it('The Sack pays fifteen times the population of a captured town that is razed', () => {
    const state = flat();
    slot(state, 0, 'theSack');
    const { city, home } = captured(state);
    const sacked = 15 * city.population;
    expect(sacked).toBeGreaterThan(0);
    const player = seat(state, 0);
    holdDraftOpen(state, 0);
    const gold = player.gold;
    const culture = player.culturePool;
    const hammers = home.hammerBasket;
    razeCityAt(state, city);
    expect(player.gold - gold).toBe(sacked);
    expect(player.culturePool - culture).toBe(sacked);
    // The production lands in the razer's nearest other town.
    expect(home.hammerBasket - hammers).toBe(sacked);
  });

  it('The Sack pays nothing for a town the seat founded', () => {
    const state = flat();
    slot(state, 0, 'theSack');
    foundCityAt(state, 0, at(state, 1, 1));
    const town = foundCityAt(state, 0, at(state, 8, 5))!;
    town.population = 4;
    const player = seat(state, 0);
    const gold = player.gold;
    razeCityAt(state, town);
    expect(player.gold).toBe(gold);
  });

  it('The Longbowmen add +4 to ranged units, and each attack from range pays +5 culture', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 1, 1));
    slot(state, 0, 'theLongbowmen');
    holdDraftOpen(state, 0);
    const archer = createUnit(state, 0, 'archer', 4, 4);
    createUnit(state, 1, 'warrior', 6, 4);
    const view = previewCombat(state, archer.id, { col: 6, row: 4 });
    if (!view.ok) throw new Error(view.error);
    expect(view.kind).toBe('ranged');
    const line = view.attackerLines
      .filter((row) => row.source.includes('Longbowmen'))
      .reduce((sum, row) => sum + row.amount, 0);
    expect(line).toBe(4);
    const player = seat(state, 0);
    const before = player.culturePool;
    expect(applyCombat(state, archer.id, { col: 6, row: 4 }).ok).toBe(true);
    expect(player.culturePool - before).toBe(5);
    // A melee attack is not an attack from range.
    const warrior = createUnit(state, 0, 'warrior', 9, 7);
    createUnit(state, 1, 'warrior', 10, 7);
    const after = player.culturePool;
    expect(applyCombat(state, warrior.id, { col: 10, row: 7 }).ok).toBe(true);
    expect(player.culturePool).toBe(after);
  });

  it('The Mural Crown pays for each great general gained this game, the new one included', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 4, 4));
    slot(state, 0, 'theMuralCrown');
    holdDraftOpen(state, 0);
    const player = seat(state, 0);
    player.researching = null;
    delete player.researchQueue;
    const gain = (person: string): { science: number; culture: number } => {
      const science = player.sciencePool;
      const culture = player.culturePool;
      player.greatPersonOffer = { options: [person as never] };
      expect(settleGreatPersonChoice(state, player, 0)).not.toBeNull();
      return { science: player.sciencePool - science, culture: player.culturePool - culture };
    };
    expect(gain('ahmoseSonOfEbana')).toEqual({ science: 100, culture: 100 });
    expect(gain('piyamaradu')).toEqual({ science: 200, culture: 200 });
    // Any great person pays, counted by the generals.
    expect(gain('imhotep')).toEqual({ science: 200, culture: 200 });
    expect(player.greatPeopleByFamily).toEqual({ general: 2, scholar: 1 });
  });

  it('Valhalla pays 25 culture for each Monument when a unit dies', () => {
    const state = flat();
    const a = foundCityAt(state, 0, at(state, 1, 1))!;
    const b = foundCityAt(state, 0, at(state, 6, 4))!;
    foundCityAt(state, 0, at(state, 11, 7));
    slot(state, 0, 'valhalla');
    addBuilding(state, a, 'monument');
    addBuilding(state, b, 'monument');
    touch(state);
    const payout = windfallPayout(state, 0, 'death', 0, 0, {});
    expect(payout.grants.map((grant) => [grant.yield, grant.amount])).toEqual([['culture', 50]]);
  });

  it('Copying the Enemy banks a tenth of the technology toward an unbuilt unit, at the first such kill each turn', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 1, 1));
    slot(state, 0, 'copyingTheEnemy');
    const player = seat(state, 0);
    player.researching = null;
    delete player.researchQueue;
    const kill = (type: UnitTypeId, row: number): void => {
      const foe = createUnit(state, 1, type, 6, row);
      foe.hp = 1;
      const blade = createUnit(state, 0, 'warrior', 5, row);
      touch(state);
      expect(applyCombat(state, blade.id, { col: 6, row }).ok).toBe(true);
      expect(state.units.some((unit) => unit.id === foe.id)).toBe(false);
    };
    // A unit the seat can build already pays nothing and leaves the turn free.
    kill('warrior', 2);
    expect(player.techProgress?.bronzeWorking).toBeUndefined();
    kill('spearman', 4);
    const share = Math.floor(techDef('bronzeWorking').cost / 10);
    expect(player.techProgress?.bronzeWorking).toBe(share);
    // The second such kill this turn pays nothing.
    kill('spearman', 6);
    expect(player.techProgress?.bronzeWorking).toBe(share);
    // Next turn it pays again.
    state.turn += 1;
    kill('spearman', 8);
    expect(player.techProgress?.bronzeWorking).toBe(share * 2);
  });

  it('The New Code opens a free draft at a capture, and not again for ten turns', () => {
    const state = flat();
    slot(state, 0, 'theNewCode');
    const player = seat(state, 0);
    const drafts = player.statecraft.drafts;
    const culture = player.culturePool;
    captured(state);
    expect(player.statecraft.pendingOrder?.options.length).toBeGreaterThan(0);
    // The draft counter and the culture do not move (the triage's reading 16).
    expect(player.statecraft.drafts).toBe(drafts);
    expect(player.culturePool).toBe(culture);
    // Nine turns on, a capture opens nothing; ten turns on, it opens again.
    delete player.statecraft.pendingOrder;
    const turn = state.turn;
    state.turn = turn + 9;
    expect(windfallPayout(state, 0, 'capture', 0, 0, {}).freeDraft).not.toBe(true);
    state.turn = turn + 10;
    expect(windfallPayout(state, 0, 'capture', 0, 0, {}).freeDraft).toBe(true);
    // A waiting draft blocks it, and the card is not stamped.
    holdDraftOpen(state, 0);
    const payout = windfallPayout(state, 0, 'capture', 0, 0, {});
    expect(payout.freeDraft).not.toBe(true);
    expect(payout.claims).toEqual([]);
  });

  it('Total Mobilisation musters at war for a citizen, every five turns, in towns of six or more', () => {
    const state = flat();
    const big = foundCityAt(state, 0, at(state, 1, 1))!;
    const small = foundCityAt(state, 0, at(state, 8, 5))!;
    big.population = 6;
    small.population = 5;
    hold(state, 0, 'totalMobilisation');
    state.turn = 9;
    musterPeriodicUnits(state);
    expect(state.units).toHaveLength(0);
    state.turn = 10;
    musterPeriodicUnits(state);
    const raised = unitsNear(state, big, 'warrior');
    expect(raised).toHaveLength(1);
    expect(raised[0]!.freeUpkeep).toBe(true);
    expect(big.population).toBe(5);
    expect(unitsNear(state, small, 'warrior')).toHaveLength(0);
    expect(small.population).toBe(5);
    // At war the growth rule is off.
    expect(cardRulePercent(state, 0, 'growthSurplus')).toEqual([]);
  });

  it('Total Mobilisation speeds growth by 25% at peace, and musters nothing', () => {
    const state = flat(false);
    const big = foundCityAt(state, 0, at(state, 1, 1))!;
    big.population = 8;
    hold(state, 0, 'totalMobilisation');
    expect(cardRulePercent(state, 0, 'growthSurplus').map((line) => line.percent)).toEqual([25]);
    state.turn = 10;
    musterPeriodicUnits(state);
    expect(state.units).toHaveLength(0);
    expect(big.population).toBe(8);
  });
});

describe('Dominion D5 — words and the bot', () => {
  const ORDERS = [
    'theGatheringHost',
    'theArmourersSecret',
    'theOpenMuster',
    'theSack',
    'theCleruchy',
    'theLongbowmen',
    'theStateForges',
    'theMuralCrown',
    'valhalla',
    'theSwordOfState',
    'copyingTheEnemy',
    'theNewCode',
  ] as const;

  it('prints every new card in its own words', () => {
    const words = (id: string): string =>
      describeCard(id as OrderId)
        .map((clause) => stripRefs(clause.text))
        .join(' | ');
    expect(words('theGatheringHost')).toContain('unit you have gained');
    expect(words('theArmourersSecret')).toContain('one of each military unit it unlocks in your capital');
    expect(words('theOpenMuster')).toContain('passing an Order draft grants the best melee unit you can build in your capital');
    expect(words('theSack')).toContain('razing a city you captured');
    expect(words('theCleruchy')).toBe('when drafted, a Settler joins you in your capital; seated, this card does nothing');
    expect(words('theLongbowmen')).toContain('attacking from range grants +5 culture');
    expect(words('theStateForges')).toContain('the best melee unit you can build in your capital');
    expect(words('theMuralCrown')).toContain('for each great general you have gained this game');
    expect(words('valhalla')).toContain('+25 culture for each Monument');
    expect(words('theSwordOfState')).toContain('the best melee unit you can build joins you in your capital');
    expect(words('copyingTheEnemy')).toContain('a unit you cannot build yet');
    expect(words('theNewCode')).toContain('at most once every 10 turns');
    expect(words('totalMobilisation')).toContain('for a citizen');
    expect(words('theLandsturm')).toContain('beside a great general');
    for (const id of [...ORDERS, 'totalMobilisation', 'theLandsturm']) {
      for (const clause of describeCard(id as OrderId)) {
        expect(stripRefs(clause.text), id).not.toContain('[[');
        expect(clause.deferred, id).not.toBe(true);
      }
    }
  });

  it('gives every new Order a worth, and a positive one where it pays in peacetime', () => {
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 1, 1))!;
    const player = seat(state, 0);
    const worth = (id: string): number => scoreCard(player, id as OrderId, valueContext(state, player));
    for (const id of ORDERS) {
      expect(Number.isFinite(worth(id)), id).toBe(true);
      expect(worth(id), id).toBeGreaterThanOrEqual(0);
    }
    // A capture, a raze and a war kill are read at the threat the seat faces,
    // which is nothing on this empty board, so those cards price at nothing
    // here, as Carried-Off Scholars does.
    for (const id of [
      'theGatheringHost',
      'theArmourersSecret',
      'theOpenMuster',
      'theCleruchy',
      'theLongbowmen',
      'theStateForges',
      'theMuralCrown',
      'theSwordOfState',
      'copyingTheEnemy',
    ]) {
      expect(worth(id), id).toBeGreaterThan(0);
    }
    // Valhalla counts Monuments, so it is worth something once there is one.
    expect(worth('valhalla')).toBe(0);
    addBuilding(state, capital, 'monument');
    touch(state);
    expect(worth('valhalla')).toBeGreaterThan(0);
  });

  it('prices the unit a card hands over on the draft only while the card is not yet held', () => {
    // The slotting scorer reads the same appraisal, so a held card that does
    // nothing seated must not be worth its draft grant again.
    const state = flat();
    foundCityAt(state, 0, at(state, 1, 1));
    const player = seat(state, 0);
    const granted = (id: string): boolean =>
      explainCard(player, id as OrderId, valueContext(state, player)).terms.some(
        (term) => term.label === 'what drafting it hands over',
      );
    expect(granted('theSwordOfState')).toBe(true);
    expect(granted('theCleruchy')).toBe(true);
    player.statecraft.orders.push('theSwordOfState' as OrderId, 'theCleruchy' as OrderId);
    touch(state);
    expect(granted('theSwordOfState')).toBe(false);
    expect(granted('theCleruchy')).toBe(false);
  });
});
