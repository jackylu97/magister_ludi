/**
 * **Doctrine batch DT2: Expansionist's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `expansionist.test.ts` holds the rows
 * to the sheet. This file checks that each row pays what its text says, in a real
 * fold, and that each drawback bites.
 *
 * Batch DT6 adds The Highland Clans, The Curator of Waters and All Roads Lead to
 * Rome. Batch DT7 adds The Inward Roads. Batch DT12 adds the land: The Georgics, The
 * Wildwood Compact, The Planted Towns and Arcadia. Later batches add the deck's other
 * four Doctrines to this file.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { scoreEffects } from '../../../src/ai/value';
import { explainCardImpact } from '../../../src/sim/cardImpact';
import {
  assignCitizens,
  assignableTiles,
  borderGrowth,
  explainGrowthPercent,
  foldGrowthPercent,
  foundCityAt,
  isWorkableTile,
  realiseItem,
  refreshCityDerived,
  settleProduction,
  settleProductionWindfall,
} from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionFigure } from '../../../src/sim/commissions';
import { chargesLeft, markInsteadOf, pillageError, workChargeCost } from '../../../src/sim/improvements';
import { routeStartable } from '../../../src/sim/trade';
import { raiseImprovement, tileIndex, tileNeighbors } from '../../../src/sim/map';
import { markMountainAdjacency } from '../../../src/sim/mapgen';
import { authorityOf, explainAuthority, explainFoundingCost, explainHappiness } from '../../../src/sim/meters';
import { connectedCities, layRoad } from '../../../src/sim/roads';
import {
  type City,
  type GameState,
  type Player,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { adoptGovernmentAt, doctrineBagFor, statecraftBlocker } from '../../../src/sim/statecraft';
import {
  cardCityRuleAt,
  cardWorkAgeFactor,
  cityScopeAdmits,
  countOf,
  explainCardPercentYields,
  groundFactsFor,
  tileConditionHolds,
} from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
  type CityScope,
  type DoctrineId,
  DECK_FILE_DOCTRINES,
  doctrineDef,
  governmentsAtTier,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { explainCentreYield, foldCentre, foldCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';
import { lendDoctrineEffects } from '../statecraftHelpers';

/**
 * The rows built so far: the eleven of batch DT2, batch DT5's The Garden Peoples, the
 * three of batch DT6, batch DT7's The Inward Roads and the four of batch DT12, each
 * with the band its sheet table gives it.
 */
const ROWS: readonly (readonly [string, number])[] = [
  ['boundToTheSoil', 1],
  ['theGiftOfTheRiver', 1],
  ['theHighlandClans', 1],
  ['theCommanderies', 1],
  ['theGeorgics', 2],
  ['synoecism', 2],
  ['theCuratorOfWaters', 2],
  ['theWildwoodCompact', 2],
  ['cropRotation', 3],
  ['theContentedCity', 3],
  ['empireWithoutEnd', 3],
  ['allRoadsLeadToRome', 3],
  ['thePlantedTowns', 3],
  ['theGardenPeoples', 3],
  ['thePhysiocrats', 4],
  ['theCathedralLodges', 4],
  ['theHighTowns', 4],
  ['theMandarinate', 4],
  ['theInwardRoads', 4],
  ['arcadia', 4],
];

/** Lent rows, put back after each test, so a failed test cannot leak one into the next. */
const lent: (() => void)[] = [];
afterEach(() => {
  while (lent.length > 0) lent.pop()!();
});

/** Lends a Doctrine other effects for this test alone. */
function lend(id: string, effects: readonly CardEffect[]): void {
  lent.push(lendDoctrineEffects(id as DoctrineId, effects));
}

function seat(state: GameState, id = 0): Player {
  return playerById(state, id)!;
}

/** Gives seat 0 a Doctrine, as a chosen offer does. */
function hold(state: GameState, id: string, playerId = 0): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
}

/** A town of a given size for this seat, with an empty queue. */
function town(state: GameState, col: number, row: number, population = 1, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** What one hex pays the town working it. */
function hexPays(state: GameState, city: City, col: number, row: number) {
  return foldTileLines(explainTileYield(at(state, col, row), cityContext(state, city)));
}

/** What one town costs seat 0 in authority, as a positive figure. */
function townWrit(state: GameState, city: City): number {
  const entry = explainAuthority(state, 0).find(
    (one) => one.part === 'cost' && one.source.startsWith(city.name),
  );
  if (!entry) throw new Error(`no authority line for ${city.name}`);
  // `0 - x` rather than `-x`, so a town that costs nothing reads as 0, not -0.
  return 0 - entry.value;
}

/** What seat 0 is quoted, in authority, to found a town on this hex. */
function foundingQuote(state: GameState, col: number, row: number): number {
  const entry = explainFoundingCost(state, 0, at(state, col, row)).find((one) => one.meter === 'authority')!;
  return 0 - entry.value;
}

/** The sum of a meter's lines whose source names this text. */
function linesNaming(lines: readonly { source: string; value: number }[], name: string): number {
  return lines.filter((entry) => entry.source.includes(name)).reduce((sum, entry) => sum + entry.value, 0);
}

describe('batch DT2: the rows', () => {
  it('deals each row at its tier, from the Expansionist bag and no other', () => {
    for (const [id, band] of ROWS) {
      const def = doctrineDef(id as DoctrineId);
      expect(def.band, id).toBe(band);
      expect(def.decks, id).toEqual(['expansionist']);
      expect(def.retired, id).toBeUndefined();
      expect(poolDoctrines(def.tier), id).toContain(id);
    }
    expect([...DECK_FILE_DOCTRINES.expansionist].sort()).toEqual(ROWS.map(([id]) => id).sort());
  });

  it('opens an offer for an Expansionist seat that adopts a tier-4 government, and it blocks End Turn', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true, leader: 'pachacuti' },
        { name: 'Bors', color: '#00a', isHuman: true, leader: 'taizong' },
      ],
    });
    const ada = seat(g.state);
    expect(ada.decks).toContain('expansionist');
    expect(doctrineBagFor(g.state, ada, 4)).toEqual(expect.arrayContaining(['boundToTheSoil', 'theCommanderies']));
    ada.statecraft.pendingGovernment = { tier: 4, options: governmentsAtTier(4) };
    adoptGovernmentAt(g.state, ada, 0);
    const offer = ada.statecraft.pendingDoctrine;
    expect(offer).toBeDefined();
    expect(offer!.options.length).toBeGreaterThan(0);
    expect(statecraftBlocker(ada)).not.toBeNull();
    // Taking one spends the offer and holds the card.
    const taken = offer!.options[0]!;
    const result = applyCommand(g.state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 });
    expect(result.ok).toBe(true);
    expect(ada.statecraft.doctrines).toContain(taken);
    expect(ada.statecraft.pendingDoctrine).toBeUndefined();
  });

  it('gives the bots a finite price for every row, and the impact stamp reads each one', () => {
    const state = bareState(24, 14);
    town(state, 5, 5, 8);
    town(state, 15, 5, 6);
    raiseImprovement(at(state, 5, 4), 'farm', 0);
    bumpRevision(state);
    const player = seat(state);
    for (const [id] of ROWS) {
      const score = scoreCard(player, id as never, valueContext(state, player));
      expect(Number.isFinite(score), id).toBe(true);
      expect(() => explainCardImpact(state, 0, { kind: 'doctrine', id: id as DoctrineId }), id).not.toThrow();
    }
  });
});

describe('Bound to the Soil', () => {
  it('gives a worker gained from now on one more charge, and leaves a worker already held alone', () => {
    const state = bareState();
    const plain = createUnit(state, 0, 'worker', 2, 2);
    const before = plain.chargesLeft!;
    hold(state, 'boundToTheSoil');
    expect(plain.chargesLeft).toBe(before);
    const fresh = createUnit(state, 0, 'worker', 3, 2);
    expect(fresh.chargesLeft).toBe(before + 1);
    // Another empire's worker is untouched, and so is another kind of unit.
    expect(createUnit(state, 1, 'worker', 4, 2).chargesLeft).toBe(before);
  });

  it('pays +1 food on a tended tile, and nothing on a farm or on wild ground', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    raiseImprovement(at(state, 5, 4), 'forestGarden', 0);
    at(state, 5, 4).feature = 'forest';
    raiseImprovement(at(state, 6, 5), 'farm', 0);
    bumpRevision(state);
    const tended = hexPays(state, city, 5, 4);
    const farm = hexPays(state, city, 6, 5);
    const wild = hexPays(state, city, 4, 5);
    hold(state, 'boundToTheSoil');
    expect(hexPays(state, city, 5, 4)).toEqual({ ...tended, food: tended.food + 1 });
    expect(hexPays(state, city, 6, 5)).toEqual(farm);
    expect(hexPays(state, city, 4, 5)).toEqual(wild);
  });
});

describe('The Gift of the River', () => {
  it('pays +1 food and +1 production beside a river, and nothing on a lake shore', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const river = at(state, 5, 4);
    river.riverEdges = 1;
    const shore = at(state, 6, 5);
    shore.freshwater = true;
    bumpRevision(state);
    const riverBefore = hexPays(state, city, 5, 4);
    const shoreBefore = hexPays(state, city, 6, 5);
    hold(state, 'theGiftOfTheRiver');
    expect(hexPays(state, city, 5, 4)).toEqual({
      ...riverBefore,
      food: riverBefore.food + 1,
      production: riverBefore.production + 1,
    });
    expect(hexPays(state, city, 6, 5)).toEqual(shoreBefore);
  });

  it('costs 3 happiness for each town away from fresh water, and nothing for a town on it', () => {
    const state = bareState(24, 10);
    const wet = town(state, 3, 3);
    at(state, wet.col, wet.row).freshwater = true;
    town(state, 12, 3);
    bumpRevision(state);
    hold(state, 'theGiftOfTheRiver');
    expect(linesNaming(explainHappiness(state, 0), 'Gift of the River')).toBe(-3);
    town(state, 20, 3);
    expect(linesNaming(explainHappiness(state, 0), 'Gift of the River')).toBe(-6);
    at(state, wet.col, wet.row).freshwater = false;
    bumpRevision(state);
    expect(linesNaming(explainHappiness(state, 0), 'Gift of the River')).toBe(-9);
  });

  it('asks no authority for a dry town', () => {
    const state = bareState(24, 10);
    town(state, 3, 3);
    const dry = town(state, 12, 3);
    const before = townWrit(state, dry);
    hold(state, 'theGiftOfTheRiver');
    expect(townWrit(state, dry)).toBe(before);
  });
});

describe('The Commanderies', () => {
  it('takes 1 off each town, never below one, and never charges the free capital', () => {
    const state = bareState(24, 10);
    const capital = town(state, 3, 3);
    const founded = town(state, 12, 3);
    const before = townWrit(state, founded);
    expect(before).toBeGreaterThan(1);
    hold(state, 'theCommanderies');
    expect(townWrit(state, capital)).toBe(0);
    expect(townWrit(state, founded)).toBe(before - 1);
    // A generous row shows the floor the card's "minimum one" names.
    lend('theCommanderies', [{ kind: 'meterRule', rule: 'cityCost', delta: -10 }]);
    bumpRevision(state);
    expect(townWrit(state, founded)).toBe(1);
    expect(townWrit(state, capital)).toBe(0);
  });

  it('quotes the cheaper town on the founding preview', () => {
    const state = bareState(24, 10);
    town(state, 3, 3);
    const plain = foundingQuote(state, 12, 3);
    hold(state, 'theCommanderies');
    expect(foundingQuote(state, 12, 3)).toBe(plain - 1);
  });

  it('slows the borders by 30%', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'monument');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const before = borderGrowth(state, city);
    expect(before.perTurn).toBeGreaterThan(0);
    hold(state, 'theCommanderies');
    const after = borderGrowth(state, city);
    // Border culture is its own channel, and percentages add inside it, so the
    // 30 comes off the meter's percentage and the sum is applied once.
    expect(after.percent).toBe(before.percent - 30);
    expect(after.perTurn).toBeCloseTo(before.base * (1 + after.percent / 100), 6);
    expect(after.perTurn).toBeLessThan(before.perTurn);
  });
});

describe('Synoecism', () => {
  it('grows towns of six or more 30% faster, and no smaller town', () => {
    const state = bareState(24, 10);
    const big = town(state, 3, 3, 6);
    const small = town(state, 12, 3, 5);
    const bigBefore = foldGrowthPercent(explainGrowthPercent(state, big));
    const smallBefore = foldGrowthPercent(explainGrowthPercent(state, small));
    hold(state, 'synoecism');
    expect(foldGrowthPercent(explainGrowthPercent(state, big))).toBe(bigBefore + 30);
    expect(foldGrowthPercent(explainGrowthPercent(state, small))).toBe(smallBefore);
  });

  it('charges 1 more for a town already founded and one founded later, and not the capital', () => {
    const state = bareState(30, 10);
    const capital = town(state, 3, 3);
    const earlier = town(state, 12, 3);
    const plain = townWrit(state, earlier);
    const plainQuote = foundingQuote(state, 20, 3);
    hold(state, 'synoecism');
    expect(townWrit(state, capital)).toBe(0);
    expect(townWrit(state, earlier)).toBe(plain + 1);
    expect(foundingQuote(state, 20, 3)).toBe(plainQuote + 1);
    const later = town(state, 20, 3);
    expect(townWrit(state, later)).toBe(plainQuote + 1);
  });

  it('leaves the first town of a seat free on the preview', () => {
    const state = bareState();
    hold(state, 'synoecism');
    expect(foundingQuote(state, 5, 5)).toBe(0);
  });

  it('charges nothing more for a captured town', () => {
    const state = bareState(24, 10);
    town(state, 3, 3);
    const seized = town(state, 12, 3, 1, 1);
    seized.ownerId = 0;
    seized.captured = true;
    bumpRevision(state);
    const plain = townWrit(state, seized);
    hold(state, 'synoecism');
    expect(townWrit(state, seized)).toBe(plain);
  });
});

describe('Crop Rotation', () => {
  it('doubles what the improvement itself pays, and not the ground under it', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const tile = at(state, 5, 4);
    const ground = hexPays(state, city, 5, 4);
    raiseImprovement(tile, 'farm', 0);
    bumpRevision(state);
    const farm = hexPays(state, city, 5, 4);
    const work = farm.food - ground.food;
    expect(work).toBeGreaterThan(0);
    hold(state, 'cropRotation');
    expect(hexPays(state, city, 5, 4)).toEqual({ ...farm, food: ground.food + 2 * work });
  });

  it('pays nothing on a wild hex, another card’s line on it included', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const river = at(state, 4, 5);
    river.riverEdges = 1;
    bumpRevision(state);
    hold(state, 'theGiftOfTheRiver');
    expect(hexPays(state, city, 4, 5).production).toBeGreaterThan(0);
    hold(state, 'cropRotation');
    const lines = explainTileYield(river, cityContext(state, city));
    const total = foldTileLines(lines);
    expect(total).toEqual({ food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });
    // The list still tells the player why: the ground, the river's line and the
    // card that takes them away, and the total is the fold of the list.
    expect(lines.some((line) => line.source.includes('Crop Rotation'))).toBe(true);
    expect(lines.some((line) => line.source.includes('Gift of the River'))).toBe(true);
  });

  it('pays nothing on a tended tile, which counts as wild', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const tended = at(state, 5, 4);
    tended.feature = 'forest';
    raiseImprovement(tended, 'forestGarden', 0);
    bumpRevision(state);
    expect(hexPays(state, city, 5, 4).food + hexPays(state, city, 5, 4).production).toBeGreaterThan(0);
    hold(state, 'boundToTheSoil');
    hold(state, 'cropRotation');
    expect(hexPays(state, city, 5, 4)).toEqual({
      food: 0,
      production: 0,
      gold: 0,
      science: 0,
      culture: 0,
      faith: 0,
    });
  });

  it('leaves the town’s own hex its floor, and takes what the ground added to it', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const floor = foldCentre(state, city);
    // A rich hex lifts the centre above its floor, through the inherited line.
    const centre = at(state, 5, 5);
    centre.riverEdges = 1;
    bumpRevision(state);
    hold(state, 'thePhysiocrats');
    hold(state, 'theGiftOfTheRiver');
    const rich = foldCentre(state, city);
    expect(rich.food + rich.production).toBeGreaterThan(floor.food + floor.production);
    hold(state, 'cropRotation');
    expect(foldCentre(state, city)).toEqual(floor);
    expect(explainCentreYield(state, city).length).toBe(1);
  });

  it('moves a town’s citizens off wild ground and onto its works', () => {
    const state = bareState();
    const city = town(state, 5, 5, 1);
    const farm = at(state, 5, 4);
    raiseImprovement(farm, 'farm', 0);
    hold(state, 'cropRotation');
    assignCitizens(state, city);
    expect(city.workedTiles).toEqual([{ col: farm.col, row: farm.row }]);
    // The fold of the town is the floor and the doubled farm, with nothing else.
    const worked = hexPays(state, city, farm.col, farm.row);
    const yields = foldCity(state, city);
    expect(yields.production).toBeGreaterThanOrEqual(foldCentre(state, city).production + worked.production);
  });
});

describe('The Contented City', () => {
  it('asks 20% less happiness of each citizen', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 10);
    const askedOf = (): number => linesNaming(explainHappiness(state, 0), `${city.name} ·`);
    const before = askedOf();
    expect(before).toBeLessThan(0);
    hold(state, 'theContentedCity');
    expect(askedOf()).toBeCloseTo(before * 0.8, 6);
  });

  it('halves a town’s gold at the empire stage, and leaves its other voices alone', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'market');
    addBuilding(state, city, 'monument');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const before = foldCity(state, city);
    expect(before.gold).toBeGreaterThan(0);
    hold(state, 'theContentedCity');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const after = foldCity(state, city);
    expect(after.gold).toBeCloseTo(before.gold / 2, 6);
    expect(after.culture).toBe(before.culture);
    expect(after.production).toBe(before.production);
    const lines = explainCardPercentYields(state, city).filter((line) => line.card === 'theContentedCity');
    expect(lines).toEqual([expect.objectContaining({ yield: 'gold', percent: -50, stage: 'empire' })]);
  });
});

describe('Empire Without End', () => {
  it('gives +1 authority for each town held', () => {
    const state = bareState(30, 10);
    town(state, 3, 3);
    town(state, 12, 3);
    hold(state, 'empireWithoutEnd');
    const named = (): number => linesNaming(explainAuthority(state, 0), 'Empire Without End');
    expect(named()).toBe(2);
    town(state, 22, 3);
    expect(named()).toBe(3);
  });

  it('has no drawback: no town costs more, and no town grows slower', () => {
    const state = bareState(24, 10);
    town(state, 3, 3);
    const founded = town(state, 12, 3, 6);
    const writ = townWrit(state, founded);
    const growth = foldGrowthPercent(explainGrowthPercent(state, founded));
    hold(state, 'empireWithoutEnd');
    expect(townWrit(state, founded)).toBe(writ);
    expect(foldGrowthPercent(explainGrowthPercent(state, founded))).toBe(growth);
  });
});

describe('The Physiocrats', () => {
  it('pays +2 food, +2 production and +2 gold on an improved tile, and nothing on tended or wild ground', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    raiseImprovement(at(state, 5, 4), 'farm', 0);
    const tended = at(state, 6, 5);
    tended.feature = 'forest';
    raiseImprovement(tended, 'forestGarden', 0);
    bumpRevision(state);
    const farm = hexPays(state, city, 5, 4);
    const garden = hexPays(state, city, 6, 5);
    const wild = hexPays(state, city, 4, 5);
    hold(state, 'thePhysiocrats');
    expect(hexPays(state, city, 5, 4)).toEqual({
      ...farm,
      food: farm.food + 2,
      production: farm.production + 2,
      gold: farm.gold + 2,
    });
    expect(hexPays(state, city, 6, 5)).toEqual(garden);
    expect(hexPays(state, city, 4, 5)).toEqual(wild);
  });
});

describe('The Cathedral Lodges', () => {
  it('doubles the whole of a Manufactory’s hex, another card’s line included, and no other work', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const site = at(state, 5, 4);
    site.riverEdges = 1;
    raiseImprovement(site, 'manufactory', 0);
    raiseImprovement(at(state, 6, 5), 'farm', 0);
    hold(state, 'theGiftOfTheRiver');
    hold(state, 'thePhysiocrats');
    const plant = hexPays(state, city, 5, 4);
    const farm = hexPays(state, city, 6, 5);
    expect(plant.production).toBeGreaterThan(0);
    hold(state, 'theCathedralLodges');
    expect(hexPays(state, city, 5, 4)).toEqual({
      food: 2 * plant.food,
      production: 2 * plant.production,
      gold: 2 * plant.gold,
      science: 2 * plant.science,
      culture: 2 * plant.culture,
      faith: 2 * plant.faith,
    });
    expect(hexPays(state, city, 6, 5)).toEqual(farm);
  });

  it('gives a town with a Manufactory +30% toward wonders and the Magnum Opus, and nothing else', () => {
    const state = bareState(24, 10);
    const works = town(state, 5, 5, 4);
    const other = town(state, 16, 5, 4);
    raiseImprovement(at(state, 5, 4), 'manufactory', 0);
    bumpRevision(state);
    expect(state.tileOwner[tileIndex(state.map, 5, 4)]).toBe(works.id);
    hold(state, 'theCathedralLodges');
    const lodges = (city: City, item: Parameters<typeof productionModifiers>[2]): number =>
      productionModifiers(state, city, item)
        .filter((line) => line.card === 'theCathedralLodges')
        .reduce((sum, line) => sum + line.percent, 0);
    const wonder = { kind: 'building', id: 'pyramids' } as never;
    const opus = { kind: 'building', id: 'theMagnumOpus' } as never;
    const monument = { kind: 'building', id: 'monument' } as never;
    const warrior = { kind: 'unit', id: 'warrior' } as never;
    expect(lodges(works, wonder)).toBe(30);
    expect(lodges(works, opus)).toBe(30);
    expect(lodges(works, monument)).toBe(0);
    expect(lodges(works, warrior)).toBe(0);
    expect(lodges(other, wonder)).toBe(0);
    expect(lodges(other, opus)).toBe(0);
  });
});

describe('The High Towns', () => {
  /** A town at (5, 5) with mountains set on the given hexes, baked as mapgen bakes them. */
  function peaks(cells: readonly (readonly [number, number])[]): { state: GameState; city: City } {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    for (const [col, row] of cells) at(state, col, row).terrain = 'mountain';
    markMountainAdjacency(state.map);
    bumpRevision(state);
    return { state, city };
  }

  it('opens the mountains in a town’s borders to its citizens', () => {
    const { state, city } = peaks([[5, 4]]);
    const peak = at(state, 5, 4);
    expect(isWorkableTile(peak)).toBe(false);
    expect(assignableTiles(state, city)).not.toContain(peak);
    hold(state, 'theHighTowns');
    expect(cardCityRuleAt(state, city, 'workMountains')).toBe(true);
    expect(assignableTiles(state, city)).toContain(peak);
    // Only this seat's towns.
    const theirs = town(state, 10, 8, 1, 1);
    expect(cardCityRuleAt(state, theirs, 'workMountains')).toBe(false);
  });

  it('pays +4 production on a lone mountain', () => {
    const { state, city } = peaks([[5, 4]]);
    const before = hexPays(state, city, 5, 4);
    hold(state, 'theHighTowns');
    expect(hexPays(state, city, 5, 4)).toEqual({ ...before, production: before.production + 4 });
  });

  it('pays each hex +1 production for each mountain beside it, so +2 beside two', () => {
    const { state, city } = peaks([[5, 4]]);
    const peak = at(state, 5, 4);
    const beside = tileNeighbors(state.map, peak).filter((tile) => tile.terrain !== 'mountain' && tile !== at(state, 5, 5));
    const one = beside[0]!;
    // A second mountain beside `one`, and not beside the town's own hex or the first peak's far side.
    const second = tileNeighbors(state.map, one).find(
      (tile) =>
        tile.terrain !== 'mountain' &&
        tile !== at(state, 5, 5) &&
        !tileNeighbors(state.map, tile).includes(at(state, 5, 5)),
    )!;
    second.terrain = 'mountain';
    markMountainAdjacency(state.map);
    bumpRevision(state);
    expect(one.mountainsBeside).toBe(2);
    const far = at(state, 9, 8);
    expect(far.mountainsBeside).toBeUndefined();
    const before = foldTileLines(explainTileYield(one, cityContext(state, city)));
    const farBefore = hexPays(state, city, far.col, far.row);
    hold(state, 'theHighTowns');
    expect(foldTileLines(explainTileYield(one, cityContext(state, city)))).toEqual({
      ...before,
      production: before.production + 2,
    });
    expect(hexPays(state, city, far.col, far.row)).toEqual(farBefore);
    // One labelled line, not one per peak.
    const named = explainTileYield(one, cityContext(state, city)).filter((line) =>
      line.source.includes('High Towns'),
    );
    expect(named.length).toBe(1);
  });

  it('pays a mountain beside another mountain for both lines', () => {
    const { state, city } = peaks([
      [5, 4],
      [6, 4],
    ]);
    const before = hexPays(state, city, 5, 4);
    expect(at(state, 5, 4).mountainsBeside).toBe(1);
    hold(state, 'theHighTowns');
    expect(hexPays(state, city, 5, 4).production).toBe(before.production + 5);
  });
});

describe('The Mandarinate', () => {
  /** The percentage The Mandarinate puts on this town's science and on its culture. */
  function rates(state: GameState, city: City): { science: number; culture: number; stages: string[] } {
    const lines = explainCardPercentYields(state, city).filter((line) => line.card === 'theMandarinate');
    const on = (voice: string): number =>
      lines.filter((line) => line.yield === voice).reduce((sum, line) => sum + line.percent, 0);
    return { science: on('science'), culture: on('culture'), stages: lines.map((line) => line.stage) };
  }

  it('gives +1% science and +1% culture for each point of spare authority, at the empire stage', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    town(state, 16, 5, 4);
    hold(state, 'theMandarinate');
    const spare = authorityOf(state, 0);
    expect(spare).toBeGreaterThan(0);
    expect(spare).toBeLessThanOrEqual(30);
    expect(rates(state, city)).toEqual({ science: spare, culture: spare, stages: ['empire', 'empire'] });
  });

  it('stops at +30%, and pays nothing when authority is negative', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    hold(state, 'theMandarinate');
    hold(state, 'empireWithoutEnd');
    lend('empireWithoutEnd', [{ kind: 'authority', amount: 50 }]);
    bumpRevision(state);
    expect(authorityOf(state, 0)).toBeGreaterThan(30);
    expect(rates(state, city).science).toBe(30);
    expect(rates(state, city).culture).toBe(30);
    lend('empireWithoutEnd', [{ kind: 'authority', amount: -50 }]);
    bumpRevision(state);
    expect(authorityOf(state, 0)).toBeLessThan(0);
    expect(rates(state, city)).toEqual({ science: 0, culture: 0, stages: [] });
  });

  it('charges 1 more for each town, founded or captured, and the capital stays free', () => {
    const state = bareState(30, 10);
    const capital = town(state, 3, 3);
    const founded = town(state, 12, 3);
    const seized = town(state, 22, 3, 1, 1);
    seized.ownerId = 0;
    seized.captured = true;
    bumpRevision(state);
    const plainFounded = townWrit(state, founded);
    const plainSeized = townWrit(state, seized);
    hold(state, 'theMandarinate');
    expect(townWrit(state, capital)).toBe(0);
    expect(townWrit(state, founded)).toBe(plainFounded + 1);
    expect(townWrit(state, seized)).toBe(plainSeized + 1);
    // The founding preview agrees, for a further town and for a seat's first.
    expect(foundingQuote(state, 12, 8)).toBe(plainFounded + 1);
    const first = bareState();
    hold(first, 'theMandarinate');
    expect(foundingQuote(first, 5, 5)).toBe(0);
  });

  it('cancels against The Commanderies, as the proposal intended', () => {
    const state = bareState(24, 10);
    town(state, 3, 3);
    const founded = town(state, 12, 3);
    const plain = townWrit(state, founded);
    hold(state, 'theMandarinate');
    hold(state, 'theCommanderies');
    expect(townWrit(state, founded)).toBe(plain);
  });

  it('moves the town’s real science and culture in the fold', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'monument');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const before = foldCity(state, city);
    expect(before.culture).toBeGreaterThan(0);
    lend('theMandarinate', [...doctrineDef('theMandarinate').effects, { kind: 'authority', amount: 100 }]);
    hold(state, 'theMandarinate');
    expect(foldCity(state, city).culture).toBeCloseTo(before.culture * 1.3, 6);
  });
});

describe('The Garden Peoples (batch DT5)', () => {
  it('pays +1 food, +1 production and +1 culture on a tended tile, and nothing on a farm or wild ground', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    at(state, 5, 4).feature = 'forest';
    raiseImprovement(at(state, 5, 4), 'forestGarden', 0);
    raiseImprovement(at(state, 6, 5), 'farm', 0);
    bumpRevision(state);
    const tended = hexPays(state, city, 5, 4);
    const farm = hexPays(state, city, 6, 5);
    const wild = hexPays(state, city, 4, 5);
    hold(state, 'theGardenPeoples');
    expect(hexPays(state, city, 5, 4)).toEqual({
      ...tended,
      food: tended.food + 1,
      production: tended.production + 1,
      culture: tended.culture + 1,
    });
    expect(hexPays(state, city, 6, 5)).toEqual(farm);
    expect(hexPays(state, city, 4, 5)).toEqual(wild);
  });

  it('reaches every kind of tended work, as a labelled line', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    at(state, 5, 4).feature = 'forest';
    raiseImprovement(at(state, 5, 4), 'forestGarden', 0);
    hold(state, 'theGardenPeoples');
    const lines = explainTileYield(at(state, 5, 4), cityContext(state, city));
    expect(lines.filter((line) => line.source.includes('The Garden Peoples'))).toHaveLength(1);
  });

  it('adds no drawback: no authority line and no happiness line', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    const before = [explainAuthority(state, 0), explainHappiness(state, 0)];
    hold(state, 'theGardenPeoples');
    expect([explainAuthority(state, 0), explainHappiness(state, 0)]).toEqual(before);
  });

  it('carries the tended-land gate, and only it, and the text says so', () => {
    const def = doctrineDef('theGardenPeoples');
    expect(def.needsTendedWork).toBe(true);
    expect(def.needsReligion).toBeUndefined();
    expect(def.text?.startsWith('Needs tended land.')).toBe(true);
  });
});

describe('The Highland Clans (batch DT6)', () => {
  /** The hill line of the row, for the bots. */
  const hillLine = doctrineDef('theHighlandClans').effects.find((effect) => effect.kind === 'pays')!;

  it('takes 1 off the authority of a town on hills, and off no other town', () => {
    const state = bareState(24, 10);
    const capital = town(state, 3, 3);
    at(state, 12, 3).hills = true;
    const high = town(state, 12, 3);
    const low = town(state, 20, 3);
    const before = { high: townWrit(state, high), low: townWrit(state, low) };
    expect(before.high).toBeGreaterThan(0);
    hold(state, 'theHighlandClans');
    expect(townWrit(state, capital)).toBe(0);
    expect(townWrit(state, high)).toBe(before.high - 1);
    expect(townWrit(state, low)).toBe(before.low);
  });

  it('quotes the cheaper town on the founding preview', () => {
    const state = bareState(24, 10);
    town(state, 3, 3);
    at(state, 12, 3).hills = true;
    bumpRevision(state);
    const hill = foundingQuote(state, 12, 3);
    const flat = foundingQuote(state, 20, 3);
    hold(state, 'theHighlandClans');
    expect(foundingQuote(state, 12, 3)).toBe(hill - 1);
    expect(foundingQuote(state, 20, 3)).toBe(flat);
  });

  it('pays +1 food on a hill beside the town, and nothing on flat ground beside it', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const [hill, flat] = tileNeighbors(state.map, at(state, 5, 5));
    hill!.hills = true;
    bumpRevision(state);
    const hillBefore = hexPays(state, city, hill!.col, hill!.row);
    const flatBefore = hexPays(state, city, flat!.col, flat!.row);
    hold(state, 'theHighlandClans');
    expect(hexPays(state, city, hill!.col, hill!.row)).toEqual({ ...hillBefore, food: hillBefore.food + 1 });
    expect(hexPays(state, city, flat!.col, flat!.row)).toEqual(flatBefore);
  });

  it('pays nothing on a hill two hexes from any town', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const far = at(state, 7, 5);
    far.hills = true;
    bumpRevision(state);
    expect(tileNeighbors(state.map, far).some((next) => next.col === 5 && next.row === 5)).toBe(false);
    const before = hexPays(state, city, 7, 5);
    hold(state, 'theHighlandClans');
    expect(hexPays(state, city, 7, 5)).toEqual(before);
  });

  it('counts any seat’s town: a hill beside a rival’s town pays the town working it (reading 45)', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    at(state, 7, 5).hills = true;
    bumpRevision(state);
    hold(state, 'theHighlandClans');
    const alone = hexPays(state, city, 7, 5);
    town(state, 8, 5, 3, 1);
    expect(hexPays(state, city, 7, 5).food).toBe(alone.food + 1);
  });

  it('gives the bots a price for a worked hill beside the town, and none without one', () => {
    const state = bareState();
    const city = town(state, 5, 5, 2);
    const [hill, flat] = tileNeighbors(state.map, at(state, 5, 5));
    hill!.hills = true;
    city.workedTiles = [{ col: flat!.col, row: flat!.row }];
    bumpRevision(state);
    expect(scoreEffects([hillLine], valueContext(state, seat(state)))).toBe(0);
    city.workedTiles = [{ col: hill!.col, row: hill!.row }];
    bumpRevision(state);
    expect(scoreEffects([hillLine], valueContext(state, seat(state)))).toBeGreaterThan(0);
  });

  it('has no malice: it adds no happiness line, as the user asked', () => {
    const state = bareState(24, 10);
    town(state, 3, 3);
    const before = explainHappiness(state, 0);
    hold(state, 'theHighlandClans');
    expect(explainHappiness(state, 0)).toEqual(before);
  });
});

describe('The Curator of Waters (batch DT6)', () => {
  /** What the queue's percentages from this card come to for one row. */
  function curatorPercent(state: GameState, city: City, item: { kind: string; id: string }): number {
    return productionModifiers(state, city, item as never)
      .filter((entry) => entry.card === 'theCuratorOfWaters')
      .reduce((sum, entry) => sum + entry.percent, 0);
  }

  const bonus = doctrineDef('theCuratorOfWaters').effects.find((effect) => effect.kind === 'productionBonus')!;

  it('gives +2 happiness for each public work, town by town, and nothing for another building', () => {
    const state = bareState(24, 10);
    const first = town(state, 3, 3, 3);
    const second = town(state, 15, 3, 3);
    addBuilding(state, first, 'granary');
    addBuilding(state, first, 'cistern');
    addBuilding(state, first, 'monument');
    bumpRevision(state);
    hold(state, 'theCuratorOfWaters');
    expect(linesNaming(explainHappiness(state, 0), 'Curator of Waters')).toBe(4);
    addBuilding(state, second, 'aqueduct');
    bumpRevision(state);
    expect(linesNaming(explainHappiness(state, 0), 'Curator of Waters')).toBe(6);
    addBuilding(state, second, 'monument');
    bumpRevision(state);
    expect(linesNaming(explainHappiness(state, 0), 'Curator of Waters')).toBe(6);
  });

  it('builds a public work 50% faster, and no other row', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    hold(state, 'theCuratorOfWaters');
    for (const id of ['granary', 'aqueduct', 'watermill', 'harbour', 'publicBath', 'cistern']) {
      expect(curatorPercent(state, city, { kind: 'building', id }), id).toBe(50);
    }
    expect(curatorPercent(state, city, { kind: 'building', id: 'monument' })).toBe(0);
    expect(curatorPercent(state, city, { kind: 'building', id: 'pyramids' })).toBe(0);
    expect(curatorPercent(state, city, { kind: 'unit', id: 'settler' })).toBe(0);
  });

  it('adds no authority line', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    addBuilding(state, city, 'granary');
    bumpRevision(state);
    const authority = explainAuthority(state, 0);
    hold(state, 'theCuratorOfWaters');
    expect(explainAuthority(state, 0)).toEqual(authority);
  });

  it('prices the bonus below one that speeds every building, and at nothing once none is left to raise', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    bumpRevision(state);
    const every: CardEffect = { kind: 'productionBonus', category: 'building', percent: 50 };
    const open = scoreEffects([bonus], valueContext(state, seat(state)));
    expect(open).toBeGreaterThan(0);
    expect(open).toBeLessThan(scoreEffects([every], valueContext(state, seat(state))));
    for (const id of ['granary', 'aqueduct', 'watermill', 'harbour', 'publicBath', 'cistern']) {
      addBuilding(state, city, id as never);
    }
    bumpRevision(state);
    expect(scoreEffects([bonus], valueContext(state, seat(state)))).toBe(0);
  });
});

describe('All Roads Lead to Rome (batch DT6)', () => {
  /** A capital, a town joined to it by road, and a town with no road. */
  function roads(): { state: GameState; capital: City; joined: City; apart: City } {
    const state = bareState(24, 10);
    const capital = town(state, 3, 5, 4);
    const joined = town(state, 9, 5, 3);
    const apart = town(state, 15, 5, 3);
    for (let col = 4; col <= 8; col++) layRoad(at(state, col, 5), 0);
    bumpRevision(state);
    expect(connectedCities(state, 0).map((entry) => entry.city.id)).toEqual([joined.id]);
    return { state, capital, joined, apart };
  }

  /** The capital's percentages from this card, by voice. */
  function capitalShares(state: GameState, city: City): Record<string, number> {
    const shares: Record<string, number> = {};
    for (const entry of explainCardPercentYields(state, city)) {
      if (entry.card === 'allRoadsLeadToRome') shares[entry.yield] = entry.percent;
    }
    return shares;
  }

  it('gives the capital +3% production and gold for each town joined to it, and no other town', () => {
    const { state, capital, joined, apart } = roads();
    hold(state, 'allRoadsLeadToRome');
    expect(capitalShares(state, capital)).toEqual({ production: 3, gold: 3 });
    expect(capitalShares(state, joined)).toEqual({});
    expect(capitalShares(state, apart)).toEqual({});
    for (let col = 10; col <= 14; col++) layRoad(at(state, col, 5), 0);
    bumpRevision(state);
    expect(capitalShares(state, capital)).toEqual({ production: 6, gold: 6 });
  });

  it('stops at +45%, however many towns the roads reach', () => {
    const state = bareState(90, 6);
    const capital = town(state, 2, 3, 4);
    for (let col = 7; col <= 82; col += 5) town(state, col, 3, 1);
    for (let col = 3; col <= 81; col++) layRoad(at(state, col, 3), 0);
    bumpRevision(state);
    expect(connectedCities(state, 0)).toHaveLength(16);
    hold(state, 'allRoadsLeadToRome');
    expect(capitalShares(state, capital)).toEqual({ production: 45, gold: 45 });
  });

  it('charges 2 more authority for a town not joined, and nothing for a joined town', () => {
    const { state, joined, apart } = roads();
    const before = { joined: townWrit(state, joined), apart: townWrit(state, apart) };
    hold(state, 'allRoadsLeadToRome');
    expect(townWrit(state, joined)).toBe(before.joined);
    expect(townWrit(state, apart)).toBe(before.apart + 2);
  });

  it('does not charge the capital (reading 7)', () => {
    const { state, capital } = roads();
    expect(cityScopeAdmits(state, capital, { test: 'connected' })).toBe(false);
    expect(cityScopeAdmits(state, capital, { test: 'notConnected' })).toBe(false);
    expect(townWrit(state, capital)).toBe(0);
    hold(state, 'allRoadsLeadToRome');
    expect(townWrit(state, capital)).toBe(0);
  });

  it('lifts the charge the turn the road reaches the town', () => {
    const { state, apart } = roads();
    hold(state, 'allRoadsLeadToRome');
    const charged = townWrit(state, apart);
    for (let col = 10; col <= 14; col++) layRoad(at(state, col, 5), 0);
    bumpRevision(state);
    expect(townWrit(state, apart)).toBe(charged - 2);
  });

  it('leaves the charge out of the founding preview, because no one can yet say if a town will be joined', () => {
    const { state } = roads();
    const before = foundingQuote(state, 20, 5);
    hold(state, 'allRoadsLeadToRome');
    expect(foundingQuote(state, 20, 5)).toBe(before);
  });
});

describe('The Inward Roads (batch DT7)', () => {
  /** A capital, a town joined to it by road, a town not joined, and a rival's town. */
  function board(): { state: GameState; capital: City; joined: City; apart: City; abroad: City } {
    const state = bareState(40, 10);
    state.wars = [];
    const capital = town(state, 3, 4, 6);
    const joined = town(state, 8, 4, 6);
    const apart = town(state, 20, 4, 6);
    const abroad = town(state, 30, 4, 6, 1);
    for (let col = capital.col; col <= joined.col; col++) layRoad(at(state, col, 4), 0);
    capital.buildings.push('market', 'market');
    seat(state).metSeats.push(1);
    bumpRevision(state);
    expect(connectedCities(state, 0).map((entry) => entry.city.id)).toEqual([joined.id]);
    return { state, capital, joined, apart, abroad };
  }

  /** The percentage The Inward Roads puts on this town, in one voice. */
  function rate(state: GameState, city: City, voice: string): number {
    return explainCardPercentYields(state, city)
      .filter((line) => line.card === 'theInwardRoads' && line.yield === voice)
      .reduce((sum, line) => sum + line.percent, 0);
  }

  it('gives +20% science and culture to a town joined to the capital, and no other town', () => {
    const { state, capital, joined, apart } = board();
    hold(state, 'theInwardRoads');
    expect(rate(state, joined, 'science')).toBe(20);
    expect(rate(state, joined, 'culture')).toBe(20);
    expect(rate(state, joined, 'gold')).toBe(0);
    for (const city of [capital, apart]) {
      expect(rate(state, city, 'science'), city.name).toBe(0);
      expect(rate(state, city, 'culture'), city.name).toBe(0);
    }
  });

  it('refuses a caravan to another empire, byte-identical, and leaves home routes open', () => {
    const { state, capital, joined, abroad } = board();
    expect(routeStartable(state, 0, capital.id, abroad.id)).toBeNull();
    hold(state, 'theInwardRoads');
    const sentence = routeStartable(state, 0, capital.id, abroad.id)!;
    expect(sentence).toContain('The Inward Roads');
    const before = JSON.stringify(state);
    const hired = applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: capital.id,
      toCityId: abroad.id,
    });
    expect(hired.ok ? '' : hired.error).toBe(sentence);
    expect(JSON.stringify(state)).toBe(before);
    expect(routeStartable(state, 0, capital.id, joined.id)).toBeNull();
  });

  it('gives a bot a positive price where the towns are joined and no route runs abroad', () => {
    const { state, joined } = board();
    joined.buildings.push('library', 'monument');
    refreshCityDerived(state, joined);
    bumpRevision(state);
    const player = seat(state);
    const ctx = valueContext(state, player);
    const percents = doctrineDef('theInwardRoads' as DoctrineId).effects.filter((effect) => effect.kind !== 'rule');
    expect(scoreEffects(percents, ctx)).toBeGreaterThan(0);
  });
});

// --- batch DT12: the land ---------------------------------------------------------

const TWENTY_TURNS = { test: 'standingSince', turns: 20 } as const;

/** Lays a work with an age, on a hex a town can work. */
function workAged(state: GameState, col: number, row: number, improvement: string, age: number) {
  const tile = at(state, col, row);
  if (improvement === 'forestGarden') tile.feature = 'forest';
  raiseImprovement(tile, improvement as never, state.turn - age);
  bumpRevision(state);
  return tile;
}

/** Sets a town to work exactly these hexes, so a count of worked hexes is the count written. */
function workOnly(state: GameState, city: City, ...hexes: (readonly [number, number])[]): void {
  city.workedTiles = hexes.map(([col, row]) => ({ col, row }));
  bumpRevision(state);
}

describe('The Georgics (batch DT12)', () => {
  it('pays its +1 production from ten real turns, because a work counts as twice as old', () => {
    const state = bareState();
    state.turn = 40;
    const city = town(state, 5, 5, 4);
    workAged(state, 5, 4, 'farm', 10);
    workAged(state, 6, 5, 'farm', 9);
    workAged(state, 4, 5, 'farm', 20);
    const before = [hexPays(state, city, 5, 4), hexPays(state, city, 6, 5), hexPays(state, city, 4, 5)];
    hold(state, 'theGeorgics');
    expect(hexPays(state, city, 5, 4).production).toBe(before[0]!.production + 1);
    expect(hexPays(state, city, 6, 5).production).toBe(before[1]!.production);
    expect(hexPays(state, city, 4, 5).production).toBe(before[2]!.production + 1);
    const lines = explainTileYield(at(state, 5, 4), cityContext(state, city));
    expect(lines.filter((line) => line.source.includes('The Georgics'))).toHaveLength(1);
  });

  it('pays nothing on a tended work, which is not an improvement', () => {
    const state = bareState();
    state.turn = 40;
    const city = town(state, 5, 5, 4);
    workAged(state, 5, 4, 'forestGarden', 30);
    const before = hexPays(state, city, 5, 4);
    hold(state, 'theGeorgics');
    expect(hexPays(state, city, 5, 4)).toEqual(before);
    // The work still counts as twice as old for a card that asks its age.
    expect(
      tileConditionHolds(at(state, 5, 4), TWENTY_TURNS, undefined, undefined, state.turn, groundFactsFor(state, 0)),
    ).toBe(true);
  });

  it('doubles real age before a bonus is added, so it does not double Break the Sod', () => {
    const state = bareState();
    state.turn = 40;
    town(state, 5, 5, 4);
    const three = workAged(state, 5, 4, 'farm', 3);
    const five = workAged(state, 6, 5, 'farm', 5);
    hold(state, 'theGeorgics');
    // Break the Sod's institution is ten turns, lent to a Doctrine the seat holds.
    lend('boundToTheSoil', [{ kind: 'workAge', turns: 10 }]);
    hold(state, 'boundToTheSoil');
    const ground = groundFactsFor(state, 0);
    expect(ground.workAgeFactor).toBe(2);
    expect(ground.workAgeBonus).toBe(10);
    // 3 * 2 + 10 is 16, where (3 + 10) * 2 would be 26. 5 * 2 + 10 is 20.
    expect(tileConditionHolds(three, TWENTY_TURNS, undefined, undefined, state.turn, ground)).toBe(false);
    expect(tileConditionHolds(five, TWENTY_TURNS, undefined, undefined, state.turn, ground)).toBe(true);
  });

  it('reaches a town scope that asks a work’s age, and leaves a building’s age and the hex’s stamp alone', () => {
    const state = bareState();
    state.turn = 40;
    const city = town(state, 5, 5, 4);
    const farm = workAged(state, 5, 4, 'farm', 0);
    workOnly(state, city, [5, 4]);
    addBuilding(state, city, 'granary');
    // Ten real turns later, for the work and for the building alike.
    state.turn = 50;
    bumpRevision(state);
    const works: CityScope = { test: 'workingImprovement', improvements: ['farm'], standingTurns: 20 };
    const stones = { test: 'hasBuilding', building: 'granary', standingTurns: 20 } as const;
    expect(cityScopeAdmits(state, city, works)).toBe(false);
    expect(cityScopeAdmits(state, city, stones)).toBe(false);
    hold(state, 'theGeorgics');
    expect(cityScopeAdmits(state, city, works)).toBe(true);
    expect(cityScopeAdmits(state, city, stones)).toBe(false);
    expect(farm.improvedOn).toBe(40);
  });

  it('reads the larger factor of two rows, and is one for a seat without it', () => {
    const state = bareState();
    expect(cardWorkAgeFactor(state, 0)).toBe(1);
    expect(groundFactsFor(state, 0).workAgeFactor).toBeUndefined();
    hold(state, 'theGeorgics');
    lend('boundToTheSoil', [{ kind: 'workAge', factor: 2 }]);
    hold(state, 'boundToTheSoil');
    expect(cardWorkAgeFactor(state, 0)).toBe(2);
    expect(cardWorkAgeFactor(state, 1)).toBe(1);
  });
});

describe('The Wildwood Compact (batch DT12)', () => {
  /** A worker of seat 0 on a hex, with the charges it was born with. */
  function worker(state: GameState, col: number, row: number) {
    const unit = createUnit(state, 0, 'worker', col, row);
    bumpRevision(state);
    return unit;
  }

  /** A forest beside a town, and the charter that lets a worker tend it. */
  function tendable(state: GameState): void {
    at(state, 5, 4).feature = 'forest';
    seat(state).statecraft.orders.push('theForestGardens' as never);
    bumpRevision(state);
  }

  function build(state: GameState, unitId: number, improvement: string) {
    return applyCommand(state, { type: 'buildImprovement', playerId: 0, unitId, improvement: improvement as never });
  }

  it('spends no charge on a tended work and a charge on a farm, and either build takes the worker’s movement', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    tendable(state);
    hold(state, 'theWildwoodCompact');
    const gardener = worker(state, 5, 4);
    const born = chargesLeft(gardener);
    expect(build(state, gardener.id, 'forestGarden').ok).toBe(true);
    expect(at(state, 5, 4).improvement).toBe('forestGarden');
    expect(chargesLeft(gardener)).toBe(born);
    expect(gardener.movesLeft).toBe(0);
    const ploughman = worker(state, 6, 5);
    expect(build(state, ploughman.id, 'farm').ok).toBe(true);
    expect(chargesLeft(ploughman)).toBe(chargesLeft(gardener) - 1);
    expect(ploughman.movesLeft).toBe(0);
  });

  it('keeps a worker on its last charge after a tended work, and spends it on a farm', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    tendable(state);
    hold(state, 'theWildwoodCompact');
    const gardener = worker(state, 5, 4);
    gardener.chargesLeft = 1;
    expect(build(state, gardener.id, 'forestGarden').ok).toBe(true);
    expect(state.units.includes(gardener)).toBe(true);
    expect(chargesLeft(gardener)).toBe(1);
    const ploughman = worker(state, 6, 5);
    ploughman.chargesLeft = 1;
    expect(build(state, ploughman.id, 'farm').ok).toBe(true);
    expect(state.units.includes(ploughman)).toBe(false);
  });

  it('charges a seat without it, and charges for The Two Harvests’ fields under it', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    tendable(state);
    const plain = worker(state, 5, 4);
    expect(workChargeCost(state, plain, 'forestGarden')).toBe(1);
    hold(state, 'theWildwoodCompact');
    expect(workChargeCost(state, plain, 'forestGarden')).toBe(0);
    expect(workChargeCost(state, plain, 'farm')).toBe(1);
    // The Two Harvests makes a farm count as tended for the cards. The row is not
    // marked `tended`, so the farm still costs its charge (reading 41).
    lend('boundToTheSoil', [{ kind: 'rule', rule: 'fieldsTended', improvements: ['farm'] }]);
    hold(state, 'boundToTheSoil');
    expect(workChargeCost(state, plain, 'farm')).toBe(1);
  });

  it('gives a new worker one charge less, and leaves a worker already standing alone', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    const old = worker(state, 5, 4);
    const before = chargesLeft(old);
    hold(state, 'theWildwoodCompact');
    expect(chargesLeft(old)).toBe(before);
    expect(chargesLeft(worker(state, 6, 5))).toBe(before - 1);
  });

  it('cancels with Bound to the Soil, and a worker is never born with no charge', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    const plain = chargesLeft(worker(state, 5, 4));
    hold(state, 'theWildwoodCompact');
    hold(state, 'boundToTheSoil');
    expect(chargesLeft(worker(state, 6, 5))).toBe(plain);
    lend('theWildwoodCompact', [{ kind: 'unitStat', stat: 'charges', amount: -9, class: { type: 'worker' } }]);
    bumpRevision(state);
    expect(chargesLeft(worker(state, 4, 5))).toBe(1);
  });

  it('is dealt only to a seat holding a tended-work charter, and says so', () => {
    const state = bareState();
    const player = seat(state);
    player.decks = ['expansionist'];
    expect(doctrineBagFor(state, player, 10)).not.toContain('theWildwoodCompact');
    expect(doctrineBagFor(state, player, 26)).not.toContain('arcadia');
    tendable(state);
    expect(doctrineBagFor(state, player, 10)).toContain('theWildwoodCompact');
    expect(doctrineBagFor(state, player, 26)).toContain('arcadia');
    expect(doctrineDef('theWildwoodCompact').needsTendedWork).toBe(true);
    expect(doctrineDef('arcadia').needsTendedWork).toBe(true);
  });
});

describe('The Planted Towns (batch DT12)', () => {
  /** A town of the given size with this queue, its basket holding enough for the first row. */
  function raising(state: GameState, population: number, ...rows: string[]): City {
    const city = town(state, 5, 5, population);
    city.queue = rows.map((id) => ({ kind: 'unit', id }) as never);
    city.hammerBasket = 500;
    bumpRevision(state);
    return city;
  }

  it('founds a town of four citizens with a Monument, all four at work', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = foundCityAt(state, 0, at(state, 5, 5));
    expect(city.population).toBe(4);
    expect(city.buildings).toContain('monument');
    expect(city.workedTiles).toHaveLength(4);
    expect(foundCityAt(state, 1, at(state, 1, 1)).population).toBe(1);
  });

  it('takes a citizen for a trained settler, and re-seats the town at once', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = raising(state, 5, 'settler');
    expect(city.workedTiles).toHaveLength(5);
    const done = settleProduction(state, city);
    expect(done?.unitId).toBeDefined();
    expect(city.population).toBe(4);
    expect(city.workedTiles).toHaveLength(4);
  });

  it('takes the same citizen when a windfall finishes the settler', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = raising(state, 5, 'settler');
    expect(settleProductionWindfall(state, city)?.unitId).toBeDefined();
    expect(city.population).toBe(4);
    expect(city.workedTiles).toHaveLength(4);
  });

  it('takes nothing for a bought, a levied or a free settler', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = raising(state, 5);
    const tile = at(state, 5, 5);
    const item = { kind: 'unit', id: 'settler', tile } as const;
    realiseItem(state, city, item, { bought: 'gold' });
    expect(city.population).toBe(5);
    realiseItem(state, city, { ...item, tile: at(state, 5, 4) }, { untrained: true });
    expect(city.population).toBe(5);
    realiseItem(state, city, { ...item, tile: at(state, 6, 5) }, { free: true });
    expect(city.population).toBe(5);
  });

  it('takes nothing for a settler bought through the command, and only the levy’s own citizen for a levied one', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = raising(state, 5);
    seat(state).gold = 5000;
    const bought = applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'unit', id: 'settler' },
      currency: 'gold',
    });
    expect(bought.ok, bought.ok ? '' : bought.error).toBe(true);
    expect(city.population).toBe(5);
    lend('boundToTheSoil', [{ kind: 'levy', use: 'settler', minPopulation: 2 }]);
    hold(state, 'boundToTheSoil');
    const levied = applyCommand(state, { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'settler' });
    expect(levied.ok, levied.ok ? '' : levied.error).toBe(true);
    expect(city.population).toBe(4);
  });

  it('takes nothing for another trained unit, and nothing without the Doctrine', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = raising(state, 5, 'worker');
    expect(settleProduction(state, city)?.unitId).toBeDefined();
    expect(city.population).toBe(5);
    const other = bareState();
    const plain = raising(other, 5, 'settler');
    expect(settleProduction(other, plain)?.unitId).toBeDefined();
    expect(plain.population).toBe(5);
  });

  it('sets aside a further settler the smaller town may not raise, and only that row', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = raising(state, 2, 'settler', 'settler', 'worker');
    expect(settleProduction(state, city)?.unitId).toBeDefined();
    expect(city.population).toBe(1);
    expect(city.queue.map((row) => row.id)).toEqual(['worker']);
  });

  it('leaves a town its last citizen', () => {
    const state = bareState();
    hold(state, 'thePlantedTowns');
    const city = raising(state, 1);
    realiseItem(state, city, { kind: 'unit', id: 'settler', tile: at(state, 5, 5) });
    expect(city.population).toBe(1);
  });
});

describe('Arcadia (batch DT12)', () => {
  it('lets a card line on improved hexes reach a tended hex, for this seat alone', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const garden = workAged(state, 5, 4, 'forestGarden', 0);
    hold(state, 'thePhysiocrats');
    const before = hexPays(state, city, 5, 4);
    hold(state, 'arcadia');
    expect(hexPays(state, city, 5, 4)).toEqual({
      ...before,
      food: before.food + 2,
      production: before.production + 2,
      gold: before.gold + 2,
    });
    const asked = { test: 'improved' } as const;
    expect(tileConditionHolds(garden, asked, undefined, undefined, state.turn, groundFactsFor(state, 0))).toBe(true);
    expect(tileConditionHolds(garden, asked, undefined, undefined, state.turn, groundFactsFor(state, 1))).toBe(false);
  });

  it('takes a tended hex out of unimproved, and leaves bare ground and a farm as they were', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    const garden = workAged(state, 5, 4, 'forestGarden', 0);
    const farm = workAged(state, 6, 5, 'farm', 0);
    const bare = at(state, 4, 5);
    hold(state, 'arcadia');
    const ground = groundFactsFor(state, 0);
    const asks = (tile: typeof bare, test: 'improved' | 'unimproved' | 'tended') =>
      tileConditionHolds(tile, { test }, undefined, undefined, state.turn, ground);
    expect([asks(garden, 'improved'), asks(garden, 'unimproved'), asks(garden, 'tended')]).toEqual([true, false, true]);
    expect([asks(farm, 'improved'), asks(farm, 'unimproved'), asks(farm, 'tended')]).toEqual([true, false, false]);
    expect([asks(bare, 'improved'), asks(bare, 'unimproved'), asks(bare, 'tended')]).toEqual([false, true, false]);
  });

  it('changes the counts of hexes, worked and in borders, and counts "improved or tended" once', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    workAged(state, 5, 4, 'forestGarden', 0);
    workOnly(state, city, [5, 4], [4, 5]);
    const worked = { kind: 'pays', where: 'city', basis: 'count', count: 'workedUnimprovedTiles', food: 1 } as never;
    const borders = (tile: unknown) =>
      ({ kind: 'pays', where: 'empire', basis: 'count', count: 'tilesInBorders', tile, to: 'authority', amount: 0 }) as never;
    const improved = borders({ test: 'improved' });
    const either = borders({ test: 'any', of: [{ test: 'improved' }, { test: 'tended' }] });
    expect(countOf(state, 0, '' as never, worked, city)).toBe(2);
    expect(countOf(state, 0, '' as never, improved)).toBe(0);
    expect(countOf(state, 0, '' as never, either)).toBe(1);
    hold(state, 'arcadia');
    expect(countOf(state, 0, '' as never, worked, city)).toBe(1);
    expect(countOf(state, 0, '' as never, improved)).toBe(1);
    expect(countOf(state, 0, '' as never, either)).toBe(1);
  });

  it('spares a tended hex from Crop Rotation, and doubles what the work itself pays', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const ground = hexPays(state, city, 5, 4);
    at(state, 5, 4).feature = 'forest';
    bumpRevision(state);
    const wood = hexPays(state, city, 5, 4);
    workAged(state, 5, 4, 'forestGarden', 0);
    const garden = hexPays(state, city, 5, 4);
    expect(garden).not.toEqual(ground);
    hold(state, 'cropRotation');
    const zero = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
    expect(hexPays(state, city, 5, 4)).toEqual(zero);
    hold(state, 'arcadia');
    expect(hexPays(state, city, 5, 4)).toEqual({
      ...garden,
      food: 2 * garden.food - wood.food,
      production: 2 * garden.production - wood.production,
    });
  });

  it('keeps paying The Garden Peoples, because a tended hex is still tended', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    workAged(state, 5, 4, 'forestGarden', 0);
    hold(state, 'theGardenPeoples');
    const before = hexPays(state, city, 5, 4);
    hold(state, 'arcadia');
    expect(hexPays(state, city, 5, 4)).toEqual(before);
  });

  it('counts a tended hex toward Break the Sod’s goal, because a commission is a card', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    workAged(state, 5, 4, 'forestGarden', 0);
    workAged(state, 6, 5, 'farm', 0);
    workOnly(state, city, [5, 4], [6, 5]);
    expect(commissionFigure(state, 0, 'improvedOnlyTilesWorked')).toBe(1);
    hold(state, 'arcadia');
    expect(commissionFigure(state, 0, 'improvedOnlyTilesWorked')).toBe(2);
    expect(commissionFigure(state, 0, 'improvedTilesWorked')).toBe(2);
  });

  it('changes what cards read and nothing about the work: it still cannot be pillaged, and a burn still replaces it', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    const garden = workAged(state, 5, 4, 'forestGarden', 0);
    hold(state, 'arcadia');
    const raider = createUnit(state, 1, 'warrior', 5, 4);
    expect(pillageError(state, raider.id)).toMatch(/nothing to pillage/);
    expect(markInsteadOf(garden, 'burnedCountry')).toBeUndefined();
  });
});
