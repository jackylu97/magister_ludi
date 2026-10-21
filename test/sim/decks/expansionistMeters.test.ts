/**
 * **The Expansionist meters, commissions and the shared militia** (batch E5 of
 * `docs/plans/expansionist-build-triage.md`). `expansionist.test.ts` checks the
 * rows against the sheet; this file checks what the cards do:
 *
 *   · The Sovereign Writ: the writ's bonus with no top rung (reading 39);
 *   · The Imperial Roads: towns joined to the capital by road cost no
 *     authority (D4's scoped `cityCost`);
 *   · The Heartland: a goal one town meets, a mark on that town, and effects
 *     for the rest of the game (reading 40);
 *   · Commission: Break the Sod: improved tiles worked, tended ones not
 *     counted (reading 2), and its reward;
 *   · The Domesday Survey's old reward: each town paid from its own figure
 *     (reading 44). Since batch E7 the card leaves an institution instead
 *     (`expansionistThemeCards.test.ts`), and no card uses this reward, so it
 *     is tested on a stand-in reward;
 *   · The Master of Works: the other manufactory towns' production, sent to
 *     the town raising the Opus (reading 43);
 *   · The Burhs: defence per fortification and production toward them
 *     (reading 30);
 *   · The Frontier Militia: a new town starts with its best melee unit
 *     (reading 45);
 *   · the words of all eight.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import {
  bestTownFor,
  commissionFigure,
  commissionGoalTown,
  runCommissions,
  townFigure,
} from '../../../src/sim/commissions';
import { raiseImprovement } from '../../../src/sim/map';
import { authorityOf, explainAuthority, meterEffects, uncappedTierPercent } from '../../../src/sim/meters';
import { layRoad } from '../../../src/sim/roads';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  cardCityStat,
  cardHappiness,
  cardProduction,
  describeCard,
  explainCardPercentYields,
  foldCityStat,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type CommissionGoal,
  type CommissionReward,
  type OrderId,
  orderDef,
} from '../../../src/sim/statecraftData';
import { unitDef } from '../../../src/sim/unitData';
import { foldCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for a seat, with an empty queue. */
function town(state: GameState, playerId: number, col: number, row: number, population: number): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Farms on every hex of the town's first ring, then the citizens re-seated. */
function farm(state: GameState, city: City): void {
  for (const tile of state.map.tiles) {
    if (tile.col === city.col && tile.row === city.row) continue;
    if (state.tileOwner[tile.row * state.map.width + tile.col] !== city.id) continue;
    raiseImprovement(tile, 'farm', state.turn);
  }
  refreshCityDerived(state, city);
  bumpRevision(state);
}

/** Runs a commission with a smaller goal, so a small board can meet it. */
function withGoals(id: string, goals: CommissionGoal[], run: () => void): void {
  const spec = orderDef(id as OrderId).commission!;
  const before = spec.goals;
  spec.goals = goals;
  try {
    run();
  } finally {
    spec.goals = before;
  }
}

/** Runs a commission with another reward, so a reward shape no card uses can still be tested. */
function withReward(id: string, reward: CommissionReward[], run: () => void): void {
  const spec = orderDef(id as OrderId).commission!;
  const before = spec.reward;
  spec.reward = reward;
  try {
    run();
  } finally {
    spec.reward = before;
  }
}

/** This town's own line in the authority meter. */
function costOf(state: GameState, city: City): number {
  return explainAuthority(state, city.ownerId)
    .filter((line) => line.source.startsWith(city.name))
    .reduce((sum, line) => sum + line.value, 0);
}

const said = (id: string): string => describeCard(id as never).map((clause) => stripRefs(clause.text)).join(' ');

describe('the Expansionist batch E5: The Sovereign Writ', () => {
  it('pays the first bonus rung once for every step of its size, with no ceiling', () => {
    expect(uncappedTierPercent(4)).toBe(0);
    expect(uncappedTierPercent(5)).toBe(10);
    expect(uncappedTierPercent(12)).toBe(20);
    expect(uncappedTierPercent(25)).toBe(50);
  });

  it('lifts the writ past its top rung only while the card is seated', () => {
    const state = bareState();
    town(state, 0, 3, 5, 3);
    const player = playerById(state, 0)!;
    player.timed = [{ card: 'theSovereignWrit' as OrderId, effect: { kind: 'authority', amount: 30 }, expiresTurn: 999 }];
    bumpRevision(state);
    const writ = (): number =>
      meterEffects(state, 0).find((effect) => effect.meter === 'authority' && effect.percent > 0)?.percent ?? 0;
    const authority = authorityOf(state, 0);
    expect(authority).toBeGreaterThanOrEqual(15);
    expect(writ()).toBe(20);
    slot(state, 0, 'theSovereignWrit');
    expect(writ()).toBe(uncappedTierPercent(authorityOf(state, 0)));
    expect(writ()).toBeGreaterThan(20);
  });
});

describe('the Expansionist batch E5: The Imperial Roads', () => {
  it('makes a town joined to the capital by road cost no authority', () => {
    const state = bareState(16, 10);
    town(state, 0, 2, 5, 3);
    const joined = town(state, 0, 7, 5, 3);
    for (let col = 3; col <= 6; col++) layRoad(at(state, col, 5), 0);
    bumpRevision(state);
    expect(costOf(state, joined)).toBeLessThan(0);
    slot(state, 0, 'theImperialRoads');
    expect(costOf(state, joined)).toBe(0);
  });
});

describe('the Expansionist batch E5: The Heartland', () => {
  it('counts one town’s worked works that yield at least the floor', () => {
    const state = bareState(16, 10);
    const first = town(state, 0, 2, 5, 4);
    const second = town(state, 0, 8, 5, 6);
    farm(state, first);
    farm(state, second);
    const goal = (atLeast: number): CommissionGoal => ({
      kind: 'reached',
      figure: 'oneTownWorkedHexes',
      count: 12,
      hexYieldAtLeast: atLeast,
    });
    // A farm on grassland yields three, so it counts at three and not at four.
    expect(commissionFigure(state, 0, 'oneTownWorkedHexes', goal(3))).toBe(6);
    expect(commissionFigure(state, 0, 'oneTownWorkedHexes', goal(4))).toBe(0);
    expect(bestTownFor(state, 0, 3)?.city.id).toBe(second.id);
  });

  it('marks the town that met the goal, which then costs no authority and gains happiness and food', () => {
    const state = bareState(16, 10);
    town(state, 0, 2, 5, 3);
    const heart = town(state, 0, 8, 5, 6);
    farm(state, heart);
    slot(state, 0, 'theHeartland');
    const before = costOf(state, heart);
    expect(before).toBeLessThan(0);
    withGoals('theHeartland', [{ kind: 'reached', figure: 'oneTownWorkedHexes', count: 6, hexYieldAtLeast: 3 }], () => {
      expect(commissionGoalTown(state, 0, 'theHeartland' as OrderId)?.id).toBe(heart.id);
      const reports = runCommissions(state);
      expect(reports).toHaveLength(1);
    });
    bumpRevision(state);
    expect(heart.markedBy).toEqual([{ card: 'theHeartland', owner: 0 }]);
    // The card has left its chair, and its lasting effects stay.
    expect(playerById(state, 0)!.statecraft.slots.some((held) => held?.card === 'theHeartland')).toBe(false);
    expect(costOf(state, heart)).toBe(0);
    expect(cardHappiness(state, 0).some((line) => line.amount === 3)).toBe(true);
    const food = explainCardPercentYields(state, heart).filter((line) => line.yield === 'food');
    expect(food.reduce((sum, line) => sum + line.percent, 0)).toBe(20);
    // A town that changes hands loses the mark for its new owner.
    heart.ownerId = 1;
    bumpRevision(state);
    expect(explainCardPercentYields(state, heart).some((line) => line.yield === 'food' && line.percent === 20)).toBe(
      false,
    );
  });
});

describe('the Expansionist batch E5: Commission: Break the Sod', () => {
  it('counts improved tiles worked and leaves tended tiles out', () => {
    const state = bareState(16, 10);
    const city = town(state, 0, 3, 5, 3);
    farm(state, city);
    const worked = city.workedTiles.length;
    expect(commissionFigure(state, 0, 'improvedOnlyTilesWorked')).toBe(worked);
    const tended = at(state, city.workedTiles[0]!.col, city.workedTiles[0]!.row);
    raiseImprovement(tended, 'burnedCountry', state.turn);
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'improvedOnlyTilesWorked')).toBe(worked - 1);
    expect(commissionFigure(state, 0, 'improvedTilesWorked')).toBe(worked);
    expect(townFigure(state, city, 'improvedOnlyTilesWorked')).toBe(worked - 1);
  });

  it('pays three food in every town for twenty turns, and a worker in the capital', () => {
    const state = bareState(16, 10);
    const capital = town(state, 0, 3, 5, 3);
    farm(state, capital);
    slot(state, 0, 'commissionBreakTheSod');
    withGoals('commissionBreakTheSod', [{ kind: 'reached', figure: 'improvedOnlyTilesWorked', count: 1 }], () => {
      runCommissions(state);
    });
    const timed = playerById(state, 0)!.timed ?? [];
    expect(timed.some((entry) => entry.effect.kind === 'pays' && entry.expiresTurn === state.turn + 20)).toBe(true);
    const workers = state.units.filter((unit) => unit.ownerId === 0 && unitDef(unit.type).modelClass === 'worker');
    expect(workers).toHaveLength(1);
  });
});

describe('the Expansionist batch E5: The Domesday Survey', () => {
  // Since batch E7 the card leaves an institution (`expansionistThemeCards.test.ts`).
  // Its old reward, each town paid from its own figure, has no card now, but
  // the shape stays, so it is tested here on a stand-in reward.
  it('pays each town five times the improved or tended tiles it works, into its own basket', () => {
    const state = bareState(16, 10);
    const big = town(state, 0, 2, 5, 4);
    const small = town(state, 0, 8, 5, 2);
    farm(state, big);
    farm(state, small);
    big.queue = [{ kind: 'building', id: 'stoneWalls' }];
    small.queue = [{ kind: 'building', id: 'stoneWalls' }];
    big.hammerBasket = 0;
    small.hammerBasket = 0;
    bumpRevision(state);
    const owed = [townFigure(state, big, 'improvedTilesWorked')!, townFigure(state, small, 'improvedTilesWorked')!];
    slot(state, 0, 'theDomesdaySurvey');
    const eachTown: CommissionReward[] = [
      { yield: 'production', amount: 5, fromFigure: 'improvedTilesWorked', eachTown: true },
    ];
    withReward('theDomesdaySurvey', eachTown, () => {
      withGoals('theDomesdaySurvey', [{ kind: 'reached', figure: 'improvedTilesWorked', count: 1 }], () => {
        runCommissions(state);
      });
    });
    expect([big.hammerBasket, small.hammerBasket]).toEqual([owed[0]! * 5, owed[1]! * 5]);
  });
});

describe('the Expansionist batch E5: The Master of Works', () => {
  it('sends the Opus town the production of the other towns with a manufactory', () => {
    const state = bareState(20, 10);
    const opus = town(state, 0, 2, 5, 3);
    const works = town(state, 0, 8, 5, 4);
    const plain = town(state, 0, 14, 5, 4);
    opus.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    raiseImprovement(at(state, 9, 5), 'manufactory', state.turn);
    refreshCityDerived(state, works);
    bumpRevision(state);
    slot(state, 0, 'theMasterOfWorks');
    const expected = Math.floor(foldCity(state, works, [], works.queue[0]).production);
    expect(expected).toBeGreaterThan(0);
    const inOpus = windfallPayout(state, 0, 'greatPersonAct', 0, 0, { family: 'engineer', townId: opus.id });
    expect(inOpus.grants.reduce((sum, grant) => sum + grant.amount, 0)).toBe(expected);
    // An act anywhere else pays nothing, and a plain town sends nothing.
    const elsewhere = windfallPayout(state, 0, 'greatPersonAct', 0, 0, { family: 'engineer', townId: plain.id });
    expect(elsewhere.grants).toHaveLength(0);
  });
});

describe('the Expansionist batch E5: The Burhs', () => {
  it('adds defence for each fortification and speeds fortifications only', () => {
    const state = bareState();
    const city = town(state, 0, 3, 5, 3);
    city.buildings.push('palisade', 'library');
    bumpRevision(state);
    slot(state, 0, 'theBurhs');
    expect(foldCityStat(cardCityStat(state, city, 'defense'))).toBe(3);
    city.buildings.push('stoneWalls');
    bumpRevision(state);
    expect(foldCityStat(cardCityStat(state, city, 'defense'))).toBe(6);
    const toward = (id: string): number =>
      cardProduction(state, city, 'building', undefined, id as never).reduce((sum, line) => sum + line.percent, 0);
    expect(toward('castle')).toBe(100);
    expect(toward('library')).toBe(0);
    // A wonder is its own category, so the walls of a wonder are not reached.
    expect(cardProduction(state, city, 'wonder', undefined, 'greatWall').reduce((sum, line) => sum + line.percent, 0)).toBe(
      0,
    );
  });
});

describe('the Expansionist batch E5: The Frontier Militia', () => {
  it('starts every town it founds with the best melee unit, free of upkeep', () => {
    const state = bareState(16, 10);
    slot(state, 0, 'theFrontierMilitia');
    const before = state.units.length;
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const raised = state.units.slice(before);
    expect(raised).toHaveLength(1);
    const unit = raised[0]!;
    expect(unit.ownerId).toBe(0);
    expect(unitDef(unit.type).combatStrength).toBeGreaterThan(0);
    expect(Math.abs(unit.col - city.col) + Math.abs(unit.row - city.row)).toBeLessThanOrEqual(2);
    expect(unit.freeUpkeep).toBeDefined();
  });
});

describe('the Expansionist batch E5: the words', () => {
  it('says what each of the eight cards does', () => {
    expect(said('theSovereignWrit')).toContain('has no ceiling: +10% for every 5 points');
    expect(said('theImperialRoads')).toContain('joined to your capital by road');
    expect(said('theHeartland')).toContain('that each yield 5 or more in total');
    expect(said('theHeartland')).toContain('for the rest of the game');
    expect(said('commissionBreakTheSod')).toContain('not counting tended tiles');
    expect(said('theDomesdaySurvey')).toContain('for the rest of the game, +1 science on every improved or tended hex');
    expect(said('theMasterOfWorks')).toContain('the production per turn of your other cities with a Manufactory');
    expect(said('theBurhs')).toContain('toward defensive buildings');
    expect(said('theFrontierMilitia')).toContain('new cities start with the best melee unit you can build');
  });
});
