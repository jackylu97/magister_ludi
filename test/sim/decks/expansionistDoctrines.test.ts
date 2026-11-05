/**
 * **Doctrine batch DT2: Expansionist's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `expansionist.test.ts` holds the rows
 * to the sheet. This file checks that each row pays what its text says, in a real
 * fold, and that each drawback bites.
 *
 * Later batches add the deck's other thirteen Doctrines to this file.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { explainCardImpact } from '../../../src/sim/cardImpact';
import {
  assignCitizens,
  assignableTiles,
  borderGrowth,
  explainGrowthPercent,
  foldGrowthPercent,
  foundCityAt,
  isWorkableTile,
  refreshCityDerived,
} from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { raiseImprovement, tileIndex, tileNeighbors } from '../../../src/sim/map';
import { markMountainAdjacency } from '../../../src/sim/mapgen';
import { authorityOf, explainAuthority, explainFoundingCost, explainHappiness } from '../../../src/sim/meters';
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
import { cardCityRuleAt, explainCardPercentYields } from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
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

/** The eleven rows of batch DT2, each with the band its sheet table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['boundToTheSoil', 1],
  ['theGiftOfTheRiver', 1],
  ['theCommanderies', 1],
  ['synoecism', 2],
  ['cropRotation', 3],
  ['theContentedCity', 3],
  ['empireWithoutEnd', 3],
  ['thePhysiocrats', 4],
  ['theCathedralLodges', 4],
  ['theHighTowns', 4],
  ['theMandarinate', 4],
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
    expect(doctrineBagFor(ada, 4)).toEqual(expect.arrayContaining(['boundToTheSoil', 'theCommanderies']));
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
