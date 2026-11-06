/**
 * **Doctrine batch DT3: Scientific's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `scientific.test.ts` holds the rows to
 * the sheet. This file checks that each row pays what its text says, in a real
 * fold, and that each drawback bites.
 *
 * It also checks the bots' reading of a hex line's `wholePercent`, which this
 * batch adds and which The Pandidakterion needs.
 *
 * Batch DT6 adds The Peripatetic School, The Directorate of Arms and The Külliye.
 * Batch DT8 adds The Court of Rudolf II. Later batches add the deck's other three
 * Doctrines to this file.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { explainEffects, scoreEffects, valueOfYields } from '../../../src/ai/value';
import { BUILDING_IDS, buildingDef, grantsABead } from '../../../src/sim/buildingData';
import { explainCardImpact } from '../../../src/sim/cardImpact';
import {
  explainGrowthPercent,
  explainUnitCost,
  foldGrowthPercent,
  foldUnitCost,
  foundCityAt,
  refreshCityDerived,
} from '../../../src/sim/cities';
import { applyCombat, previewCombat } from '../../../src/sim/combat';
import { raiseImprovement } from '../../../src/sim/map';
import { explainAuthority } from '../../../src/sim/meters';
import { explainCityRenown, explainRenown } from '../../../src/sim/renown';
import { explainPurchaseCost } from '../../../src/sim/purchase';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { doctrineBagFor } from '../../../src/sim/statecraft';
import {
  cardBehaviorRuleFor,
  cardCombatPercent,
  cardLimitLifts,
  explainBuildingPackage,
  explainCardPercentYields,
  foldBuildingPackage,
  noMetEmpireAhead,
} from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
  type DoctrineId,
  type OrderId,
  DECK_FILE_DOCTRINES,
  doctrineDef,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import {
  buildError,
  explainTechCost,
  foldTechCost,
  settleResearch,
  techChainOf,
  turnsToTech,
} from '../../../src/sim/tech';
import {
  BUILDING_UNLOCK_TECH,
  CHARTER_TECH_IDS,
  TECH_IDS,
  type TechId,
  techDef,
} from '../../../src/sim/techData';
import { unitDef } from '../../../src/sim/unitData';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { explainCity, foldCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';
import { lendDoctrineEffects } from '../statecraftHelpers';

/** The eight rows of batch DT3, the three of DT6 and the one of DT8, each with the band its table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['thePythagoreanBrotherhood', 1],
  ['theRemovalToXianyang', 1],
  ['theWorkshopsOfSyracuse', 1],
  ['thePeripateticSchool', 1],
  ['theJixianAcademy', 2],
  ['theAcademyOfGondishapur', 2],
  ['thePandidakterion', 2],
  ['theDirectorateOfArms', 3],
  ['theUniversitas', 3],
  ['theVolleyFire', 3],
  ['theKulliye', 3],
  ['theCourtOfRudolf', 4],
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

/** Gives a seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, id: string, playerId = 0): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
}

/** Puts an Order in a chair for this seat. */
function slot(state: GameState, id: string, playerId = 0): void {
  const sc = seat(state, playerId).statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
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

/** A strength line on one side of a forecast, by its card's name. */
function line(
  state: GameState,
  unit: Unit,
  col: number,
  row: number,
  name: string,
  side: 'attacker' | 'defender' = 'attacker',
): number {
  const view = previewCombat(state, unit.id, { col, row });
  if (!view.ok) throw new Error(view.error);
  return (side === 'attacker' ? view.attackerLines : view.defenderLines)
    .filter((entry) => entry.source.includes(name))
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** Attacks and insists the rules accepted it. */
function strike(state: GameState, unit: Unit, col: number, row: number): void {
  const result = applyCombat(state, unit.id, { col, row });
  if (!result.ok) throw new Error(result.error);
}

/** Pays for a technology and completes it. Returns what it cost. */
function complete(state: GameState, tech: TechId): number {
  const player = seat(state);
  player.techsResearched = player.techsResearched.filter((id) => id !== tech);
  player.researching = tech;
  player.researchQueue = [];
  player.sciencePool = foldTechCost(explainTechCost(state, player, tech));
  const done = settleResearch(state, player);
  expect(done?.techId, tech).toBe(tech);
  bumpRevision(state);
  return done!.cost;
}

/** What the queue's percentages from one card come to for one row. */
function buildPercent(state: GameState, city: City, id: string, card: string): number {
  return productionModifiers(state, city, { kind: 'building', id: id as never })
    .filter((entry) => entry.card === card)
    .reduce((sum, entry) => sum + entry.percent, 0);
}

describe('batch DT3: Scientific’s rows', () => {
  it('deals each row at its tier, from the Scientific bag and no other', () => {
    for (const [id, band] of ROWS) {
      const def = doctrineDef(id as DoctrineId);
      expect(def.band, id).toBe(band);
      expect(def.decks, id).toEqual(['scientific']);
      expect(def.retired, id).toBeUndefined();
      expect(poolDoctrines(def.tier), id).toContain(id);
    }
    expect([...DECK_FILE_DOCTRINES.scientific].sort()).toEqual(ROWS.map(([id]) => id).sort());
  });

  it('offers a Scientific seat its rows when it adopts a tier-4 government', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Hypatia', color: '#a00', isHuman: true, leader: 'hypatiaOfAlexandria' },
        { name: 'Bors', color: '#00a', isHuman: true, leader: 'pachacuti' },
      ],
    });
    expect(doctrineBagFor(g.state, seat(g.state), 4)).toEqual(
      expect.arrayContaining(['thePythagoreanBrotherhood', 'theRemovalToXianyang', 'theWorkshopsOfSyracuse']),
    );
    expect(doctrineBagFor(g.state, seat(g.state, 1), 4)).not.toContain('theRemovalToXianyang');
  });

  it('gives the bots a finite price for every row, and the impact stamp reads each one', () => {
    const state = bareState(24, 14);
    const city = town(state, 5, 5, 8);
    town(state, 15, 5, 6);
    addBuilding(state, city, 'library');
    raiseImprovement(at(state, 5, 4), 'academy', 0);
    refreshCityDerived(state, city);
    bumpRevision(state);
    const player = seat(state);
    for (const [id] of ROWS) {
      const score = scoreCard(player, id as never, valueContext(state, player));
      expect(Number.isFinite(score), id).toBe(true);
      expect(() => explainCardImpact(state, 0, { kind: 'doctrine', id: id as DoctrineId }), id).not.toThrow();
    }
  });
});

describe('The Pythagorean Brotherhood', () => {
  it('pays +2 science in a town, and +4 in a town with a Shrine', () => {
    const state = bareState(24, 10);
    const plain = town(state, 3, 3, 3);
    const holy = town(state, 15, 3, 3);
    addBuilding(state, holy, 'shrine');
    bumpRevision(state);
    const before = [explainCity(state, plain).flats.science, explainCity(state, holy).flats.science];
    hold(state, 'thePythagoreanBrotherhood');
    expect(explainCity(state, plain).flats.science).toBe(before[0]! + 2);
    expect(explainCity(state, holy).flats.science).toBe(before[1]! + 4);
  });

  it('puts the Shrine’s line in the Shrine’s package, and not twice in the town', () => {
    const state = bareState(24, 10);
    const holy = town(state, 3, 3, 3);
    addBuilding(state, holy, 'shrine');
    addBuilding(state, holy, 'library');
    bumpRevision(state);
    const before = explainCity(state, holy).flats.science;
    hold(state, 'thePythagoreanBrotherhood');
    const onIt = (id: string) =>
      foldBuildingPackage(
        explainBuildingPackage(state, holy, id as never).filter(
          (entry) => entry.card === 'thePythagoreanBrotherhood',
        ),
      ).science;
    expect(onIt('shrine')).toBe(2);
    expect(onIt('library')).toBe(0);
    // One line of +2 in every town, one on the Shrine: +4 in all.
    expect(explainCity(state, holy).flats.science).toBe(before + 4);
  });
});

describe('The Removal to Xianyang', () => {
  it('grows every town 30% faster', () => {
    const state = bareState(24, 10);
    const small = town(state, 3, 3, 2);
    const large = town(state, 15, 3, 9);
    const before = [small, large].map((city) => foldGrowthPercent(explainGrowthPercent(state, city)));
    hold(state, 'theRemovalToXianyang');
    expect(foldGrowthPercent(explainGrowthPercent(state, small))).toBe(before[0]! + 30);
    expect(foldGrowthPercent(explainGrowthPercent(state, large))).toBe(before[1]! + 30);
  });

  it('doubles the price of a settler, in hammers and so in gold, and of nothing else', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const hammers = (id: string) => foldUnitCost(explainUnitCost(state, 0, id as never));
    const settler = hammers('settler');
    const worker = hammers('worker');
    hold(state, 'theRemovalToXianyang');
    expect(hammers('settler')).toBe(2 * settler);
    expect(hammers('worker')).toBe(worker);
    const gold = explainPurchaseCost(state, 0, city.id, { kind: 'unit', id: 'settler' as never }, 'gold')!;
    expect(gold.total).toBe(Math.floor(hammers('settler') * RULES.production.goldPerHammer));
  });
});

describe('The Workshops of Syracuse', () => {
  it('gives a military unit +5 strength attacking and defending', () => {
    const state = bareState();
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    hold(state, 'theWorkshopsOfSyracuse');
    expect(line(state, mine, 5, 4, 'The Workshops of Syracuse')).toBe(5);
    expect(line(state, theirs, 4, 4, 'The Workshops of Syracuse', 'defender')).toBe(5);
  });

  it('gives a ship and a rival’s unit nothing', () => {
    const state = bareState();
    for (let row = 0; row < state.map.height; row++) at(state, 6, row).terrain = 'ocean' as never;
    bumpRevision(state);
    const hull = createUnit(state, 0, 'galley', 6, 4);
    const rival = createUnit(state, 1, 'warrior', 5, 4);
    createUnit(state, 0, 'warrior', 4, 4);
    hold(state, 'theWorkshopsOfSyracuse');
    expect(unitDef(hull.type).category).toBe('naval');
    expect(line(state, rival, 4, 4, 'The Workshops of Syracuse', 'attacker')).toBe(0);
    expect(line(state, rival, 4, 4, 'The Workshops of Syracuse', 'defender')).toBe(5);
    expect(line(state, hull, 5, 4, 'The Workshops of Syracuse')).toBe(0);
  });

  it('makes a military unit cost 50% more to build and to buy, and leaves a civilian alone', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const hammers = (id: string) => foldUnitCost(explainUnitCost(state, 0, id as never));
    const gold = (id: string) =>
      explainPurchaseCost(state, 0, city.id, { kind: 'unit', id: id as never }, 'gold')!.total;
    const before = { warrior: hammers('warrior'), worker: hammers('worker'), coin: gold('warrior') };
    hold(state, 'theWorkshopsOfSyracuse');
    expect(hammers('warrior')).toBe(Math.floor(before.warrior * 1.5));
    expect(hammers('worker')).toBe(before.worker);
    // The gold price is the full production cost, converted, so it follows.
    expect(gold('warrior')).toBeGreaterThan(before.coin);
    expect(gold('warrior')).toBe(Math.floor(hammers('warrior') * RULES.production.goldPerHammer));
  });
});

describe('The Jixian Academy', () => {
  const tech = TECH_IDS.find((id) => techDef(id).age === 2)!;

  it('grants culture equal to a fifth of what a technology cost', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    const player = seat(state);
    // Leave a draft waiting, so the culture stays in the pool to be read.
    player.statecraft.pendingOrder = { options: ['marketDay' as OrderId] };
    hold(state, 'theJixianAcademy');
    const before = player.culturePool;
    const paid = complete(state, tech);
    expect(paid).toBeGreaterThan(0);
    expect(player.culturePool - before).toBeCloseTo(paid / 5, 6);
  });

  it('pays nothing for a technology without the Doctrine', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    const player = seat(state);
    player.statecraft.pendingOrder = { options: ['marketDay' as OrderId] };
    const before = player.culturePool;
    complete(state, tech);
    expect(player.culturePool).toBe(before);
  });

  it('takes 25% off a town’s culture', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'monument');
    addBuilding(state, city, 'market');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const before = foldCity(state, city);
    expect(before.culture).toBeGreaterThan(0);
    hold(state, 'theJixianAcademy');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const after = foldCity(state, city);
    expect(after.culture).toBeLessThan(before.culture);
    expect(after.gold).toBe(before.gold);
    expect(explainCardPercentYields(state, city).filter((entry) => entry.card === 'theJixianAcademy')).toEqual([
      expect.objectContaining({ yield: 'culture', percent: -25, stage: 'city' }),
    ]);
  });
});

describe('The Academy of Gondishapur', () => {
  const BEAD_ROWS = BUILDING_IDS.filter(grantsABead);

  it('finds the Magnum Opus and the three works by their bead grant', () => {
    expect([...BEAD_ROWS].sort()).toEqual(
      ['chartTheStars', 'theAlchemicalCodex', 'theMagnumOpus', 'theTurningHeavens'].sort(),
    );
    for (const id of BEAD_ROWS) expect(buildingDef(id).empireBuilding, id).toBe(true);
  });

  it('gives +15% science in a town holding an empire building, and nothing elsewhere', () => {
    const state = bareState(24, 10);
    const seatOf = town(state, 3, 3, 3);
    const plain = town(state, 15, 3, 3);
    addBuilding(state, seatOf, 'forum');
    bumpRevision(state);
    hold(state, 'theAcademyOfGondishapur');
    const lines = (city: City) =>
      explainCardPercentYields(state, city).filter((entry) => entry.card === 'theAcademyOfGondishapur');
    expect(lines(seatOf)).toEqual([expect.objectContaining({ yield: 'science', percent: 15 })]);
    expect(lines(plain)).toEqual([]);
  });

  it('puts +20% behind an empire building, and behind nothing else', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    hold(state, 'theAcademyOfGondishapur');
    const card = 'theAcademyOfGondishapur';
    expect(buildPercent(state, city, 'forum', card)).toBe(20);
    expect(buildPercent(state, city, 'granary', card)).toBe(0);
    const unit = productionModifiers(state, city, { kind: 'unit', id: 'settler' as never });
    expect(unit.filter((entry) => entry.card === card)).toEqual([]);
  });

  it('does not reach the Magnum Opus or its three works (reading 24)', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    hold(state, 'theAcademyOfGondishapur');
    for (const id of BEAD_ROWS) {
      expect(buildPercent(state, city, id, 'theAcademyOfGondishapur'), id).toBe(0);
    }
    expect(doctrineDef('theAcademyOfGondishapur' as DoctrineId).note).toMatch(/Magnum Opus or its works/);
  });

  it('leaves The Many Hands reaching those rows, because no Order sets the field', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 'theManyHands');
    for (const id of BEAD_ROWS) {
      expect(buildPercent(state, city, id, 'theManyHands'), id).toBeGreaterThan(0);
    }
  });
});

describe('The Pandidakterion', () => {
  /** A town of seat 0 working an Academy on a river hex, with a farm beside it. */
  function board(): { state: GameState; city: City } {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const site = at(state, 5, 4);
    site.riverEdges = 1;
    raiseImprovement(site, 'academy', 0);
    raiseImprovement(at(state, 6, 5), 'farm', 0);
    bumpRevision(state);
    return { state, city };
  }

  it('doubles a hex with an Academy, another card’s line on it included, and no other work', () => {
    const { state, city } = board();
    hold(state, 'theGiftOfTheRiver');
    const academy = hexPays(state, city, 5, 4);
    const farm = hexPays(state, city, 6, 5);
    expect(academy.science).toBeGreaterThan(0);
    // The river's line is a card's, and it is on the hex before the share is taken.
    expect(academy.production).toBeGreaterThan(0);
    hold(state, 'thePandidakterion');
    expect(hexPays(state, city, 5, 4)).toEqual({
      food: 2 * academy.food,
      production: 2 * academy.production,
      gold: 2 * academy.gold,
      science: 2 * academy.science,
      culture: 2 * academy.culture,
      faith: 2 * academy.faith,
    });
    expect(hexPays(state, city, 6, 5)).toEqual(farm);
  });

  it('sums with another whole share before one multiplication, so neither pays the other', () => {
    const { state, city } = board();
    const academy = hexPays(state, city, 5, 4);
    // The Nizamiyya takes half again. Summed, the two make +150%, not 2 × 1.5.
    slot(state, 'theNizamiyya');
    hold(state, 'thePandidakterion');
    expect(hexPays(state, city, 5, 4).science).toBeCloseTo(academy.science * 2.5, 6);
  });

  it('labels the share as one line, so the breakdown still sums to the total', () => {
    const { state, city } = board();
    hold(state, 'thePandidakterion');
    const lines = explainTileYield(at(state, 5, 4), cityContext(state, city));
    expect(lines.filter((entry) => entry.source.includes('The Pandidakterion'))).toHaveLength(1);
  });
});

describe('The Universitas', () => {
  /** One town of `population` with a Library and a Monument, its science read from the fold. */
  function schooled(population: number): { state: GameState; city: City; shelf: number } {
    const state = bareState();
    const city = town(state, 5, 5, population);
    addBuilding(state, city, 'library');
    addBuilding(state, city, 'monument');
    bumpRevision(state);
    const shelf = foldBuildingPackage(explainBuildingPackage(state, city, 'library' as never)).science;
    expect(shelf).toBeGreaterThan(0);
    return { state, city, shelf };
  }

  it('doubles what a science building pays in a town of twelve citizens', () => {
    const { state, city, shelf } = schooled(12);
    const before = explainCity(state, city);
    hold(state, 'theUniversitas');
    const after = explainCity(state, city);
    expect(after.flats.science - before.flats.science).toBeCloseTo(shelf, 6);
    expect(after.flats.culture).toBe(before.flats.culture);
  });

  it('halves it in a town of eleven, through a negative share', () => {
    const { state, city, shelf } = schooled(11);
    const before = explainCity(state, city);
    hold(state, 'theUniversitas');
    const after = explainCity(state, city);
    expect(after.flats.science - before.flats.science).toBeCloseTo(-shelf / 2, 6);
    expect(after.flats.culture).toBe(before.flats.culture);
  });

  it('asks nothing of a small town with no science building', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    addBuilding(state, city, 'monument');
    bumpRevision(state);
    const before = explainCity(state, city).flats;
    hold(state, 'theUniversitas');
    expect(explainCity(state, city).flats).toEqual(before);
  });
});

describe('The Volley Fire', () => {
  it('gives a Crossbowman two attacks a turn', () => {
    const state = bareState();
    const target = createUnit(state, 1, 'knight', 8, 5);
    const bow = createUnit(state, 0, 'crossbowman', 6, 5);
    hold(state, 'theVolleyFire');
    expect(cardBehaviorRuleFor(state, bow, 'secondAttack')).toBe(true);
    strike(state, bow, 8, 5);
    expect(bow.hasAttacked).toBe(false);
    expect(state.units).toContain(target);
    target.hp = 100;
    bumpRevision(state);
    strike(state, bow, 8, 5);
    expect(bow.hasAttacked).toBe(true);
  });

  it('reaches the whole archer line, and no Catapult', () => {
    const state = bareState();
    hold(state, 'theVolleyFire');
    for (const type of ['archer', 'bowman', 'compositeBowman', 'crossbowman']) {
      expect(unitDef(type as never).modelClass, type).toBe('ranged');
      const piece = createUnit(state, 0, type as never, 2, 2);
      expect(cardBehaviorRuleFor(state, piece, 'secondAttack'), type).toBe(true);
    }
    const siege = createUnit(state, 0, 'catapult', 3, 2);
    expect(cardBehaviorRuleFor(state, siege, 'secondAttack')).toBe(false);
  });

  it('gives a Catapult one attack', () => {
    const state = bareState();
    createUnit(state, 1, 'knight', 8, 5);
    const siege = createUnit(state, 0, 'catapult', 6, 5);
    hold(state, 'theVolleyFire');
    strike(state, siege, 8, 5);
    expect(siege.hasAttacked).toBe(true);
    expect(applyCombat(state, siege.id, { col: 8, row: 5 }).ok).toBe(false);
  });

  it('takes 10% off a melee unit’s strength, and nothing off a bow', () => {
    const state = bareState();
    const melee = createUnit(state, 0, 'warrior', 4, 4);
    const bow = createUnit(state, 0, 'crossbowman', 4, 6);
    expect(cardCombatPercent(state, melee)).toBe(0);
    hold(state, 'theVolleyFire');
    expect(cardCombatPercent(state, melee)).toBe(-10);
    expect(cardCombatPercent(state, bow)).toBe(0);
  });
});

describe('the bots read a hex line’s whole share (batch DT3)', () => {
  /** One town working exactly the hexes named. */
  function working(cells: readonly (readonly [number, number])[], population = cells.length + 1) {
    const state = bareState(24, 14);
    const city = town(state, 8, 6, population);
    city.workedTiles = cells.map(([col, row]) => ({ col, row }));
    bumpRevision(state);
    return { state, city, player: seat(state) };
  }

  const WILD_ROW: CardEffect = {
    kind: 'pays',
    where: 'hex',
    on: { test: 'unimproved' },
    wholePercent: -100,
  };

  it('prices Crop Rotation below the same board with its drawback lent away', () => {
    const { state, city, player } = working([
      [8, 5],
      [9, 6],
      [7, 6],
    ]);
    raiseImprovement(at(state, 8, 5), 'farm', 0);
    bumpRevision(state);
    expect(city.workedTiles).toHaveLength(3);
    const whole = scoreCard(player, 'cropRotation' as never, valueContext(state, player));
    const rows = doctrineDef('cropRotation' as DoctrineId).effects.filter(
      (effect) => !(effect.kind === 'pays' && effect.wholePercent !== undefined),
    );
    lend('cropRotation', rows);
    const lentAway = scoreCard(player, 'cropRotation' as never, valueContext(state, player));
    expect(whole).toBeLessThan(lentAway);
  });

  it('charges a negative share what the wild hexes pay, and nothing for a board with none', () => {
    const wild = working([
      [8, 5],
      [9, 6],
    ]);
    const ctx = valueContext(wild.state, wild.player);
    const paid = [hexPays(wild.state, wild.city, 8, 5), hexPays(wild.state, wild.city, 9, 6)];
    const expected = valueOfYields(paid[0]!, ctx) + valueOfYields(paid[1]!, ctx);
    expect(expected).toBeGreaterThan(0);
    expect(scoreEffects([WILD_ROW], ctx)).toBeCloseTo(-expected, 6);

    const farmed = working([[8, 5]]);
    raiseImprovement(at(farmed.state, 8, 5), 'farm', 0);
    bumpRevision(farmed.state);
    expect(scoreEffects([WILD_ROW], valueContext(farmed.state, farmed.player))).toBe(0);
  });

  it('prices a positive share over what the worked Academy pays, and an unworked one at nothing', () => {
    const rows = doctrineDef('thePandidakterion' as DoctrineId).effects;
    const { state, city, player } = working([[8, 5]]);
    raiseImprovement(at(state, 8, 5), 'academy', 0);
    raiseImprovement(at(state, 9, 6), 'academy', 0);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(scoreEffects(rows, ctx)).toBeCloseTo(valueOfYields(hexPays(state, city, 8, 5), ctx), 6);
    expect(scoreEffects(rows, ctx)).toBeGreaterThan(0);

    // Half the share is half the price.
    lend('thePandidakterion', [{ ...rows[0]!, wholePercent: 50 } as CardEffect]);
    const half = doctrineDef('thePandidakterion' as DoctrineId).effects;
    expect(scoreEffects(half, valueContext(state, player))).toBeCloseTo(scoreEffects(rows, ctx) / 2, 6);
  });

  it('reads the same for a seat that already holds the row, or another doubler', () => {
    const rows = doctrineDef('thePandidakterion' as DoctrineId).effects;
    const { state, player } = working([[8, 5]]);
    raiseImprovement(at(state, 8, 5), 'academy', 0);
    bumpRevision(state);
    const fresh = scoreEffects(rows, valueContext(state, player));
    slot(state, 'theNizamiyya');
    expect(scoreEffects(rows, valueContext(state, player))).toBeCloseTo(fresh, 6);
    hold(state, 'thePandidakterion');
    expect(scoreEffects(rows, valueContext(state, player))).toBeCloseTo(fresh, 6);
  });

  it('sees a card’s line on the hex, because the share is over what the hex pays', () => {
    const rows = doctrineDef('thePandidakterion' as DoctrineId).effects;
    const { state, player } = working([[8, 5]]);
    raiseImprovement(at(state, 8, 5), 'academy', 0);
    bumpRevision(state);
    const plain = scoreEffects(rows, valueContext(state, player));
    hold(state, 'theGiftOfTheRiver');
    at(state, 8, 5).riverEdges = 1;
    bumpRevision(state);
    expect(scoreEffects(rows, valueContext(state, player))).toBeGreaterThan(plain);
  });

  it('prices a doubling exactly as a flat line paying the same bag, hammer premium included', () => {
    const on = { test: 'improvement', improvement: 'manufactory' } as const;
    const { state, city, player } = working([[8, 5]]);
    raiseImprovement(at(state, 8, 5), 'manufactory', 0);
    bumpRevision(state);
    const paid = hexPays(state, city, 8, 5);
    expect(paid.production).toBeGreaterThan(0);
    const ctx = valueContext(state, player);
    const doubling = explainEffects([{ kind: 'pays', where: 'hex', on, wholePercent: 100 }], ctx);
    const flat = explainEffects([{ kind: 'pays', where: 'hex', on, ...paid }], ctx);
    expect(doubling.total).toBeCloseTo(flat.total, 6);
  });

  it('prices a row with no share as before', () => {
    const rows: CardEffect[] = [
      { kind: 'pays', where: 'hex', on: { test: 'improvement', improvement: 'farm' }, food: 2 },
    ];
    const { state, player } = working([[8, 5]]);
    raiseImprovement(at(state, 8, 5), 'farm', 0);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(scoreEffects(rows, ctx)).toBeCloseTo(valueOfYields({ food: 2 }, ctx), 6);
  });
});

describe('The Peripatetic School (batch DT6)', () => {
  /** The renown lines this card adds to seat 0, each with its figure. */
  function schoolLines(state: GameState) {
    return explainRenown(state, 0).filter((entry) => entry.source.includes('The Peripatetic School'));
  }

  it('pays +2 science and +2 production on an Academy, and nothing on a farm', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    raiseImprovement(at(state, 5, 4), 'academy', 0);
    raiseImprovement(at(state, 6, 5), 'farm', 0);
    bumpRevision(state);
    const academy = hexPays(state, city, 5, 4);
    const farm = hexPays(state, city, 6, 5);
    hold(state, 'thePeripateticSchool');
    expect(hexPays(state, city, 5, 4)).toEqual({
      ...academy,
      science: academy.science + 2,
      production: academy.production + 2,
    });
    expect(hexPays(state, city, 6, 5)).toEqual(farm);
  });

  it('takes +30% of a Library’s renown, and names no family', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'library');
    bumpRevision(state);
    hold(state, 'thePeripateticSchool');
    const lines = schoolLines(state);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.amount).toBeCloseTo((buildingDef('library').renown!.perTurn * 30) / 100, 6);
    expect(lines[0]!.family).toBeNull();
    expect(lines[0]!.perTurn).toBe(true);
  });

  it('takes nothing of a Market’s renown, even in a town that also holds a Library', () => {
    const state = bareState(24, 10);
    const market = town(state, 3, 3, 4);
    addBuilding(state, market, 'market');
    bumpRevision(state);
    expect(buildingDef('market').renown!.perTurn).toBeGreaterThan(0);
    hold(state, 'thePeripateticSchool');
    expect(schoolLines(state)).toEqual([]);
    addBuilding(state, market, 'library');
    bumpRevision(state);
    expect(schoolLines(state)[0]!.amount).toBeCloseTo((buildingDef('library').renown!.perTurn * 30) / 100, 6);
  });

  it('takes a share of a wonder, and counts a science wonder once (reading 23)', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'pyramids');
    addBuilding(state, city, 'greatLibrary');
    bumpRevision(state);
    expect(buildingDef('greatLibrary').category).toBe('science');
    hold(state, 'thePeripateticSchool');
    const trickle = buildingDef('pyramids').renown!.perTurn + buildingDef('greatLibrary').renown!.perTurn;
    expect(schoolLines(state)[0]!.amount).toBeCloseTo((trickle * 30) / 100, 6);
  });

  it('reaches a building a card grants the town, because the grant has a renown line', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    lend('theUniversitas', [{ kind: 'rule', rule: 'holdsBuilding', building: 'library' }]);
    hold(state, 'theUniversitas');
    hold(state, 'thePeripateticSchool');
    expect(city.buildings).not.toContain('library');
    const library = buildingDef('library').renown!.perTurn;
    expect(explainRenown(state, 0).filter((entry) => entry.source.startsWith('Library at'))).toHaveLength(1);
    expect(schoolLines(state)[0]!.amount).toBeCloseTo((library * 30) / 100, 6);
  });

  it('adds nothing to the guild bar, which passes no shares', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'library');
    bumpRevision(state);
    const before = explainCityRenown(city);
    hold(state, 'thePeripateticSchool');
    expect(explainCityRenown(city)).toEqual(before);
  });

  it('leaves a share with no `of` taken over every building', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'market');
    addBuilding(state, city, 'library');
    const trickle = buildingDef('market').renown!.perTurn + buildingDef('library').renown!.perTurn;
    const lines = explainCityRenown(city, [{ source: 'A share', percent: 50 }]);
    expect(lines.find((entry) => entry.source.startsWith('A share'))!.amount).toBeCloseTo(trickle / 2, 6);
  });

  it('prices the share over the rows it names', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'market');
    bumpRevision(state);
    const share = doctrineDef('thePeripateticSchool').effects.find((effect) => effect.kind === 'cityRenownPercent')!;
    expect(scoreEffects([share], valueContext(state, seat(state)))).toBe(0);
    addBuilding(state, city, 'library');
    bumpRevision(state);
    expect(scoreEffects([share], valueContext(state, seat(state)))).toBeGreaterThan(0);
  });
});

describe('The Directorate of Arms (batch DT6)', () => {
  /** Two seats that have met, with equal technologies, and a piece of each beside the other. */
  function board(): { state: GameState; mine: Unit; theirs: Unit } {
    const state = bareState();
    seat(state).metSeats = [1];
    seat(state, 1).metSeats = [0];
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    bumpRevision(state);
    return { state, mine, theirs };
  }

  /** A technology seat 0 does not know, which seat 1 can learn to move ahead. */
  function aheadBy(state: GameState, playerId: number): void {
    const player = seat(state, playerId);
    const next = TECH_IDS.find((id) => !player.techsResearched.includes(id))!;
    player.techsResearched.push(next);
    bumpRevision(state);
  }

  const NAME = 'The Directorate of Arms';

  it('holds on a tie, attacking and defending', () => {
    const { state, mine, theirs } = board();
    expect(seat(state).techsResearched.length).toBe(seat(state, 1).techsResearched.length);
    hold(state, 'theDirectorateOfArms');
    expect(line(state, mine, 5, 4, NAME)).toBe(3);
    expect(line(state, theirs, 4, 4, NAME, 'defender')).toBe(3);
  });

  it('holds while the seat leads', () => {
    const { state, mine } = board();
    aheadBy(state, 0);
    hold(state, 'theDirectorateOfArms');
    expect(line(state, mine, 5, 4, NAME)).toBe(3);
  });

  it('ends the turn a met rival moves ahead', () => {
    const { state, mine } = board();
    hold(state, 'theDirectorateOfArms');
    expect(line(state, mine, 5, 4, NAME)).toBe(3);
    aheadBy(state, 1);
    expect(line(state, mine, 5, 4, NAME)).toBe(0);
  });

  it('does not count a rival the seat has not met, however far ahead', () => {
    const { state, mine } = board();
    seat(state).metSeats = [];
    aheadBy(state, 1);
    hold(state, 'theDirectorateOfArms');
    expect(line(state, mine, 5, 4, NAME)).toBe(3);
    seat(state).metSeats = [1];
    bumpRevision(state);
    expect(line(state, mine, 5, 4, NAME)).toBe(0);
  });

  it('does not count an eliminated rival', () => {
    const { state } = board();
    aheadBy(state, 1);
    expect(noMetEmpireAhead(state, 0)).toBe(false);
    seat(state, 1).eliminated = true;
    bumpRevision(state);
    expect(noMetEmpireAhead(state, 0)).toBe(true);
  });

  it('gives the bots the strength only while the condition holds', () => {
    const { state } = board();
    const row = doctrineDef('theDirectorateOfArms').effects;
    expect(scoreEffects(row, valueContext(state, seat(state)))).toBeGreaterThan(0);
    aheadBy(state, 1);
    expect(scoreEffects(row, valueContext(state, seat(state)))).toBe(0);
  });
});

describe('The Külliye (batch DT6)', () => {
  /** A town with an Academy holding a forum, and a second with an Academy, and a third with none. */
  function board(): { state: GameState; first: City; second: City; bare: City } {
    const state = bareState(30, 10);
    const first = town(state, 3, 3, 4);
    const second = town(state, 12, 3, 4);
    const bare = town(state, 21, 3, 4);
    raiseImprovement(at(state, 3, 2), 'academy', 0);
    raiseImprovement(at(state, 12, 2), 'academy', 0);
    addBuilding(state, first, 'forum');
    bumpRevision(state);
    return { state, first, second, bare };
  }

  const canBuild = (state: GameState, id: string, city: City) =>
    buildError(state, 0, 'building', id as never, city);

  it('lets a town with an Academy raise its own copy, and no other town', () => {
    const { state, second, bare } = board();
    expect(canBuild(state, 'forum', second)).not.toBeNull();
    hold(state, 'theKulliye');
    expect(canBuild(state, 'forum', second)).toBeNull();
    expect(canBuild(state, 'forum', bare)).toMatch(/already stands/);
    // A Doctrine lifted the limit here, so the refusal does not call it an Order.
    expect(canBuild(state, 'forum', bare)).toMatch(/your Doctrine allows another copy only in a city with an Academy/);
  });

  it('still lets a town hold only one copy', () => {
    const { state, first } = board();
    hold(state, 'theKulliye');
    expect(canBuild(state, 'forum', first)).toMatch(/already stands/);
  });

  it('allows as many towns with an Academy as there are, with no count', () => {
    const { state, second } = board();
    const third = town(state, 12, 7, 4);
    raiseImprovement(at(state, 12, 8), 'academy', 0);
    hold(state, 'theKulliye');
    addBuilding(state, second, 'forum');
    bumpRevision(state);
    expect(canBuild(state, 'forum', third)).toBeNull();
  });

  it('lifts no limit on the Magnum Opus or the three works of the Observatory (reading 25)', () => {
    const { state } = board();
    hold(state, 'theKulliye');
    for (const id of BUILDING_IDS.filter(grantsABead)) {
      expect(cardLimitLifts(state, 0, id), id).toEqual([]);
    }
    expect(cardLimitLifts(state, 0, 'forum')).toEqual([
      { card: 'theKulliye', scope: { test: 'hasImprovement', improvement: 'academy' } },
    ]);
  });

  it('refuses a second Observatory work in a town with an Academy', () => {
    const { state, first, second } = board();
    addBuilding(state, first, 'library');
    addBuilding(state, second, 'library');
    addBuilding(state, first, 'chartTheStars');
    seat(state).techsResearched.push(BUILDING_UNLOCK_TECH.get('chartTheStars')!);
    bumpRevision(state);
    hold(state, 'theKulliye');
    expect(canBuild(state, 'chartTheStars', second)).toMatch(/already stands/);
  });

  it('puts +50% behind an empire building, and none behind the Opus, its works or anything else', () => {
    const { state, first } = board();
    hold(state, 'theKulliye');
    expect(buildPercent(state, first, 'bimaristan', 'theKulliye')).toBe(50);
    expect(buildPercent(state, first, 'granary', 'theKulliye')).toBe(0);
    for (const id of BUILDING_IDS.filter(grantsABead)) {
      expect(buildPercent(state, first, id, 'theKulliye'), id).toBe(0);
    }
    expect(doctrineDef('theKulliye').note).toMatch(/Magnum Opus or its works/);
  });

  it('pays each copy of a town building in its own town', () => {
    const { state, first, second } = board();
    hold(state, 'theKulliye');
    addBuilding(state, second, 'forum');
    bumpRevision(state);
    expect(first.buildings).toContain('forum');
    expect(second.buildings).toContain('forum');
    const renown = explainRenown(state, 0).filter((entry) => entry.source.startsWith('Forum'));
    expect(renown).toHaveLength(2);
  });

  it('reads a row’s empire-wide effect once, and its own capacity for each copy (reading 25)', () => {
    const { state, first, second } = board();
    addBuilding(state, first, 'imperialThrone');
    bumpRevision(state);
    hold(state, 'theKulliye');
    const naming = (text: string) =>
      explainAuthority(state, 0).filter((entry) => entry.part === 'gain' && entry.source.includes(text));
    const effect = naming('Building · Imperial Throne');
    expect(effect).toHaveLength(1);
    const capacity = buildingDef('imperialThrone').authorityCapacity!;
    expect(naming('Imperial Throne').reduce((sum, entry) => sum + entry.value, 0)).toBe(capacity + effect[0]!.value);
    addBuilding(state, second, 'imperialThrone');
    bumpRevision(state);
    expect(naming('Building · Imperial Throne')).toEqual(effect);
    expect(naming('Imperial Thrones ×2')[0]!.value).toBe(capacity * 2);
  });
});

describe('The Court of Rudolf II (batch DT8)', () => {
  const CARD = 'theCourtOfRudolf';
  const price = (state: GameState, tech: TechId): number =>
    foldTechCost(explainTechCost(state, seat(state), tech));

  /** Takes technologies back from seat 0: a bare board starts with many already known. */
  function unlearn(state: GameState, ...techs: TechId[]): void {
    seat(state).techsResearched = seat(state).techsResearched.filter((tech) => !techs.includes(tech));
    bumpRevision(state);
  }

  /** Alchemy and the fourth-age technologies that lead to it, as the chart draws them. */
  const CHAIN: readonly string[] = [
    'alchemy',
    'banking',
    'education',
    'feudalism',
    'machinery',
    'militantOrders',
    'movableType',
    'paperMoney',
    'physics',
    'steel',
    'theAstrolabe',
    'theHolyOffice',
    'theQadisCourt',
    'theSilkRoad',
  ];

  it('walks the chain: Alchemy and its fourth-age parents, and no third-age row', () => {
    const chain = techChainOf('alchemy');
    expect(chain[0]).toBe('alchemy');
    expect([...chain].sort()).toEqual([...CHAIN].sort());
    for (const tech of chain) expect(techDef(tech).age, tech).toBe(4);
    for (const parent of techDef('alchemy').prereqs) expect(chain, parent).toContain(parent);
    // A third-age parent of a row in the chain stays out, and so does its own line.
    expect(techDef('horology').age).toBe(3);
    expect(techDef('machinery').prereqs).toContain('horology');
    expect(chain).not.toContain('horology');
    expect(chain).not.toContain('agriculture');
  });

  it('gives the same answer twice, and keeps a row of an early age to that age', () => {
    expect(techChainOf('alchemy')).toBe(techChainOf('alchemy'));
    expect(techChainOf('agriculture')).toEqual(['agriculture']);
  });

  it('takes 20% off every technology in the chain, as one labelled line', () => {
    const state = bareState();
    town(state, 5, 5);
    const before = CHAIN.map((tech) => price(state, tech as TechId));
    hold(state, CARD);
    CHAIN.forEach((tech, index) => {
      expect(price(state, tech as TechId), tech).toBe(Math.floor((before[index]! * 80) / 100));
    });
    const lines = explainTechCost(state, seat(state), 'alchemy');
    expect(lines).toHaveLength(2);
    expect(lines[1]!.source).toContain('The Court of Rudolf II');
    expect(lines[1]!.source).toContain('-20%');
    expect(price(state, 'alchemy')).toBe(foldTechCost(lines));
    expect(price(state, 'alchemy')).toBe(6400);
  });

  it('adds 25% to the rest of the age, and leaves the earlier ages alone', () => {
    const state = bareState();
    town(state, 5, 5);
    const prospecting = price(state, 'prospecting');
    const horology = price(state, 'horology');
    const agriculture = price(state, 'agriculture');
    hold(state, CARD);
    expect(price(state, 'prospecting')).toBe(Math.floor((prospecting * 125) / 100));
    expect(price(state, 'horology')).toBe(horology);
    expect(price(state, 'agriculture')).toBe(agriculture);
  });

  it('reaches every other ordinary fourth-age row with its drawback, which today is Prospecting alone', () => {
    const state = bareState();
    town(state, 5, 5);
    const before = TECH_IDS.map((tech) => price(state, tech));
    hold(state, CARD);
    const dearer = TECH_IDS.filter((tech, index) => price(state, tech) > before[index]!);
    expect(dearer).toEqual(['prospecting']);
    const cheaper = TECH_IDS.filter((tech, index) => price(state, tech) < before[index]!);
    expect([...cheaper].sort()).toEqual([...CHAIN].sort());
  });

  it('leaves every charter technology untouched, a fourth-age one included', () => {
    const state = bareState();
    town(state, 5, 5);
    expect(CHARTER_TECH_IDS.some((tech) => techDef(tech).age === 4)).toBe(true);
    const before = CHARTER_TECH_IDS.map((tech) => explainTechCost(state, seat(state), tech));
    hold(state, CARD);
    CHARTER_TECH_IDS.forEach((tech, index) => {
      expect(explainTechCost(state, seat(state), tech), tech).toEqual(before[index]);
    });
    expect(doctrineDef(CARD as DoctrineId).note).toMatch(/charter technology/);
  });

  it('adds to another card’s percentage, and multiplies once', () => {
    const state = bareState();
    town(state, 5, 5);
    const column = price(state, 'banking');
    // A row seat 0 does not know and a met empire does: The Translation Movement's gap.
    unlearn(state, 'banking');
    seat(state).metSeats = [1];
    seat(state, 1).techsResearched.push('banking');
    slot(state, 'theTranslationMovement');
    hold(state, CARD);
    const lines = explainTechCost(state, seat(state), 'banking');
    expect(lines).toHaveLength(3);
    // 60% of the column, and not 80% of 80%.
    expect(foldTechCost(lines)).toBe(Math.floor((column * 60) / 100));
  });

  it('is what research charges, and what the schedule reads', () => {
    const state = bareState();
    town(state, 5, 5);
    const plain = price(state, 'banking');
    const slow = turnsToTech(state, 0, 'banking', 100);
    hold(state, CARD);
    const cut = Math.floor((plain * 80) / 100);
    expect(turnsToTech(state, 0, 'banking', 100)).toBeLessThan(slow!);
    expect(complete(state, 'banking')).toBe(cut);
    expect(seat(state).sciencePool).toBe(0);
  });

  it('prices the chain left against the rest of the age', () => {
    const state = bareState();
    town(state, 5, 5);
    unlearn(state, ...(CHAIN as TechId[]), 'prospecting');
    const [chain, rest] = doctrineDef(CARD as DoctrineId).effects as [CardEffect, CardEffect];
    const value = (effect: CardEffect) => scoreEffects([effect], valueContext(state, seat(state)));
    const full = value(chain);
    expect(full).toBeGreaterThan(0);
    expect(value(rest)).toBeLessThan(0);
    // Research part of the chain, and less of the cut is left to save.
    seat(state).techsResearched.push('banking', 'education');
    bumpRevision(state);
    expect(value(chain)).toBeLessThan(full);
    // Research the rest of the age, and the drawback costs nothing.
    seat(state).techsResearched.push('prospecting');
    bumpRevision(state);
    expect(value(rest)).toBe(0);
  });
});
