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
 * Batch DT8 adds The Court of Rudolf II. Batch DT14 adds The Nassau Reforms. Batch
 * DT16 adds The Platonic Academy. Batch DT17 adds The Two Capitals, the deck's last.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { nextBotDecision, valueContext } from '../../../src/ai/bot';
import { scoreCard } from '../../../src/ai/council';
import { explainEffects, scoreEffects } from '../../../src/ai/value';
import { valueOfYields } from '../../../src/ai/prices';
import { BUILDING_IDS, buildingDef, grantsABead } from '../../../src/sim/buildingData';
import { explainCardImpact, foldCardImpact } from '../../../src/sim/cardImpact';
import {
  capitalCityOf,
  channelSurplus,
  explainGrowthPercent,
  explainUnitCost,
  foldGrowthPercent,
  foldUnitCost,
  foundCityAt,
  loseCitizen,
  refreshCityDerived,
  settlePopulationWindfall,
} from '../../../src/sim/cities';
import { applyCombat, previewCombat } from '../../../src/sim/combat';
import { applyCommand } from '../../../src/sim/commands';
import { snapshotState } from '../../../src/sim/game';
import {
  familyLayingWork,
  familyWork,
  greatPersonActAt,
  greatPersonWorkAt,
  greatPersonWorkError,
  workOf,
} from '../../../src/sim/greatPeople';
import { FAMILIES, type Family, GREAT_PERSON_IDS, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { improvementForResource, workForFamily } from '../../../src/sim/improvementData';
import { raiseImprovement } from '../../../src/sim/map';
import { explainAuthority, explainFoundingCost, explainHappiness, meterEffects } from '../../../src/sim/meters';
import { plantHolySiteAt } from '../../../src/sim/religion';
import { explainCityRenown, explainRenown } from '../../../src/sim/renown';
import { explainPurchaseCost } from '../../../src/sim/purchase';
import { readCity, readEmpirePercents } from '../../../src/sim/readings';
import { layRoad } from '../../../src/sim/roads';
import { cityResourceYields } from '../../../src/sim/resourceEffects';
import { RULES } from '../../../src/sim/rulesData';
import { setSlateShadow, slateShadow } from '../../../src/sim/slate';
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
import { cityScopeWords, describeCard, describeEffects, doctrineBagFor, stripRefs } from '../../../src/sim/statecraft';
import {
  type CombatSituation,
  cardBehaviorRuleFor,
  cardCapitalIds,
  cardCityStat,
  cardCombatPercent,
  cardLimitLifts,
  cardProspectCityCost,
  cardUpgradeStrength,
  cityScopeAdmits,
  combatLineAmount,
  explainBuildingPackage,
  explainCardCityYields,
  explainCardPercentYields,
  foldBuildingPackage,
  liveEffects,
  musterPeriodicUnits,
  noMetEmpireAhead,
  payWindfallGrants,
  secondCapitalCity,
  windfallPayout,
} from '../../../src/sim/statecraft/evaluator';
import {
  type CardCombatLineEffect,
  type CardEffect,
  type CityScope,
  type DoctrineId,
  type OrderId,
  DECK_FILE_DOCTRINES,
  doctrineDef,
  orderDef,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import {
  buildError,
  explainTechCost,
  foldTechCost,
  settleResearch,
  techChainOf,
  turnsToTech,
  upgradeUnits,
} from '../../../src/sim/tech';
import {
  BUILDING_UNLOCK_TECH,
  CHARTER_TECH_IDS,
  TECH_IDS,
  type TechId,
  techDef,
} from '../../../src/sim/techData';
import { unitDef, unitStampStrength } from '../../../src/sim/unitData';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { explainCity, explainPalaceYield, foldCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';
import { lendDoctrineEffects } from '../statecraftHelpers';

/** The eight rows of batch DT3, the three of DT6 and the ones of DT8, DT14, DT16 and DT17, each with the band its table gives it. */
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
  ['theNassauReforms', 4],
  ['thePlatonicAcademy', 4],
  ['theTwoCapitals', 4],
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
    // The card says so, in its text and its clause (the user's answer of 2026-11-06).
    expect(doctrineDef('theAcademyOfGondishapur' as DoctrineId).text).toContain(
      '+20% production toward empire buildings, except the Magnum Opus and its works.',
    );
    expect(describeCard('theAcademyOfGondishapur' as DoctrineId).map((clause) => clause.text)).toContain(
      '+20% production toward empire buildings, except the Magnum Opus and its works',
    );
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

  it('doubles after The Nizamiyya’s share, so an Academy pays 3 times and not 2.5 (batch DT19c)', () => {
    const { state, city } = board();
    const academy = hexPays(state, city, 5, 4);
    expect(academy.science).toBeGreaterThan(0);
    // The Nizamiyya takes half again, and the text says the doubling comes after it.
    slot(state, 'theNizamiyya');
    expect(hexPays(state, city, 5, 4).science).toBeCloseTo(academy.science * 1.5, 6);
    hold(state, 'thePandidakterion');
    expect(hexPays(state, city, 5, 4).science).toBeCloseTo(academy.science * 3, 6);
    // Each share is its own line, and the total is the list's fold.
    const lines = explainTileYield(at(state, 5, 4), cityContext(state, city));
    expect(lines.filter((entry) => entry.source.includes('The Nizamiyya'))).toHaveLength(1);
    const doubling = lines.find((entry) => entry.source.includes('The Pandidakterion'))!;
    expect(doubling.science).toBeCloseTo(academy.science * 1.5, 6);
    expect(foldTileLines(lines).science).toBeCloseTo(academy.science * 3, 6);
  });

  it('sums two shares of the last pass before one multiplication, so neither pays the other', () => {
    const { state, city } = board();
    const academy = hexPays(state, city, 5, 4);
    hold(state, 'thePandidakterion');
    lend('theJixianAcademy', [
      {
        kind: 'pays',
        where: 'hex',
        on: { test: 'improvement', improvement: 'academy' },
        wholePercent: 100,
        appliedLast: true,
      } as CardEffect,
    ]);
    hold(state, 'theJixianAcademy');
    expect(hexPays(state, city, 5, 4).science).toBeCloseTo(academy.science * 3, 6);
  });

  it('says that it comes last', () => {
    expect(describeCard('thePandidakterion' as DoctrineId).map((clause) => stripRefs(clause.text))).toEqual([
      'the yields of every hex with an Academy are doubled, after every other change to the hex',
    ]);
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

  it('reads the same for a seat that already holds the row', () => {
    const rows = doctrineDef('thePandidakterion' as DoctrineId).effects;
    const { state, player } = working([[8, 5]]);
    raiseImprovement(at(state, 8, 5), 'academy', 0);
    bumpRevision(state);
    const fresh = scoreEffects(rows, valueContext(state, player));
    hold(state, 'thePandidakterion');
    expect(scoreEffects(rows, valueContext(state, player))).toBeCloseTo(fresh, 6);
  });

  it('follows the rule: the doubling over The Nizamiyya, and The Nizamiyya under the doubling (batch DT19c)', () => {
    const doubling = doctrineDef('thePandidakterion' as DoctrineId).effects;
    const half = orderDef('theNizamiyya').effects;
    const { state, player } = working([[8, 5]]);
    raiseImprovement(at(state, 8, 5), 'academy', 0);
    bumpRevision(state);
    const doublingAlone = scoreEffects(doubling, valueContext(state, player));
    const halfAlone = scoreEffects(half, valueContext(state, player));
    expect(doublingAlone).toBeGreaterThan(0);
    expect(halfAlone).toBeCloseTo(doublingAlone / 2, 6);
    // With The Nizamiyya seated the hex pays half as much again, so the doubling adds that.
    slot(state, 'theNizamiyya');
    expect(scoreEffects(doubling, valueContext(state, player))).toBeCloseTo(doublingAlone * 1.5, 6);
    // With the doubling held as well, The Nizamiyya's half is doubled too.
    hold(state, 'thePandidakterion');
    expect(scoreEffects(half, valueContext(state, player))).toBeCloseTo(halfAlone * 2, 6);
    expect(scoreEffects(doubling, valueContext(state, player))).toBeCloseTo(doublingAlone * 1.5, 6);
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
    // The card says so, in its text and its clause (the user's answer of 2026-11-06).
    expect(doctrineDef('theKulliye').text).toContain(
      '+50% production toward empire buildings, except the Magnum Opus and its works.',
    );
    expect(describeCard('theKulliye').map((clause) => stripRefs(clause.text))).toContain(
      '+50% production toward empire buildings, except the Magnum Opus and its works',
    );
    expect(doctrineDef('theKulliye').note).toMatch(/Magnum Opus or its works/);
    expect(doctrineDef('theKulliye').note).toContain('such as the Bourse, pays once however many copies stand');
    expect(doctrineDef('theKulliye').note).toContain("The Imperial Throne's authority is the exception: each copy adds its own.");
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
    // Enough science that the whole chain falls within the horizon (batch DT19b).
    lend('theApoikia', [{ kind: 'pays', where: 'city', science: 5000 } as CardEffect]);
    hold(state, 'theApoikia');
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

describe('The Nassau Reforms (batch DT14)', () => {
  const CARD = 'theNassauReforms';
  const BOW_LINE: readonly string[] = ['bowman', 'compositeBowman', 'crossbowman'];

  /** Teaches both seats every technology that opens a rung above the archer. */
  function teachTheBowLine(state: GameState): void {
    for (const player of state.players) {
      for (const tech of TECH_IDS) {
        const opens = techDef(tech).unlocks.units ?? [];
        if (!opens.some((id) => BOW_LINE.includes(id))) continue;
        if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
      }
    }
    bumpRevision(state);
  }

  /** A capital for seat 0, and an archer of its own with the whole bow line ahead of it. */
  function board(): { state: GameState; city: City; archer: Unit } {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 3);
    const archer = createUnit(state, 0, 'archer', 9, 5);
    teachTheBowLine(state);
    return { state, city, archer };
  }

  it('adds +2 for good when research upgrades a unit, and adds it once for a climb of two rungs', () => {
    const { state, archer } = board();
    hold(state, CARD);
    upgradeUnits(state, seat(state));
    // The climb crossed more than one rung: the type is past the archer's next row.
    expect(archer.type).not.toBe('archer');
    expect(archer.type).not.toBe(unitDef('archer').upgradesTo);
    expect(archer.stamp).toEqual({ strength: 2 });
  });

  it('adds it again at the next upgrade', () => {
    const { state, archer } = board();
    hold(state, CARD);
    upgradeUnits(state, seat(state));
    expect(archer.stamp?.strength).toBe(2);
    archer.type = 'archer';
    upgradeUnits(state, seat(state));
    expect(archer.stamp?.strength).toBe(4);
  });

  it('adds nothing to a unit that does not upgrade, or on a sweep with nothing to climb', () => {
    const { state, archer } = board();
    hold(state, CARD);
    upgradeUnits(state, seat(state));
    upgradeUnits(state, seat(state));
    expect(archer.stamp?.strength).toBe(2);
    const scout = createUnit(state, 0, 'scout', 12, 5);
    upgradeUnits(state, seat(state));
    expect(scout.stamp).toBeUndefined();
  });

  it('keeps what a birth stamped, and joins a health stamp without disturbing it', () => {
    const { state, archer } = board();
    archer.stamp = { hp: 10, strength: 3 };
    hold(state, CARD);
    upgradeUnits(state, seat(state));
    expect(archer.stamp).toEqual({ hp: 10, strength: 5 });
  });

  it('prints as a labelled line on the piece’s side of a fight, and stays when the Doctrine is gone', () => {
    const { state, archer } = board();
    hold(state, CARD);
    upgradeUnits(state, seat(state));
    seat(state).statecraft.doctrines = [];
    bumpRevision(state);
    expect(unitStampStrength(archer)).toBe(2);
    createUnit(state, 1, 'warrior', archer.col + 1, archer.row);
    bumpRevision(state);
    const view = previewCombat(state, archer.id, { col: archer.col + 1, row: archer.row });
    if (!view.ok) throw new Error(view.error);
    expect(view.attackerLines.filter((entry) => entry.source === 'Training').map((entry) => entry.amount)).toEqual([2]);
  });

  it('adds nothing without the Doctrine, and reaches only its holder’s units', () => {
    const { state, archer } = board();
    const theirs = createUnit(state, 1, 'archer', 15, 5);
    bumpRevision(state);
    hold(state, CARD, 1);
    upgradeUnits(state, seat(state));
    expect(archer.type).not.toBe('archer');
    expect(archer.stamp).toBeUndefined();
    // A climb is asked seat by seat: this sweep was seat 0's.
    expect(theirs.type).toBe('archer');
    upgradeUnits(state, seat(state, 1));
    expect(theirs.stamp).toEqual({ strength: 2 });
  });

  it('builds military units 25% more slowly, at the empire’s stage, and nothing else', () => {
    const { state, city } = board();
    const percent = (item: { kind: 'unit' | 'building'; id: never }): number =>
      productionModifiers(state, city, item)
        .filter((entry) => entry.card === CARD)
        .reduce((sum, entry) => sum + entry.percent, 0);
    const soldier = { kind: 'unit', id: 'warrior' as never } as const;
    const worker = { kind: 'unit', id: 'worker' as never } as const;
    const ship = { kind: 'unit', id: 'trireme' as never } as const;
    const granary = { kind: 'building', id: 'granary' as never } as const;
    expect(percent(soldier)).toBe(0);
    hold(state, CARD);
    expect(percent(soldier)).toBe(-25);
    expect(percent(worker)).toBe(0);
    expect(percent(ship)).toBe(0);
    expect(percent(granary)).toBe(0);
    const line = productionModifiers(state, city, soldier).find((entry) => entry.card === CARD);
    expect(line?.stage).toBe('empire');
  });

  it('is one rule and one production line', () => {
    expect(doctrineDef(CARD as DoctrineId).effects).toEqual([
      { kind: 'rule', rule: 'upgradeStrength', value: 2 },
      { kind: 'productionBonus', category: 'unit', class: { category: 'military' }, percent: -25, stage: 'empire' },
    ]);
  });

  it('says what it does', () => {
    expect(describeCard(CARD as DoctrineId).map((clause) => stripRefs(clause.text))).toEqual([
      'each time research upgrades one of your units, it gains +2 combat strength for good',
      "-25% production toward military units, after the town's own bonuses",
    ]);
  });

  it('reads one row’s `class` of the piece as it now is, for a row that narrows', () => {
    const { state, archer } = board();
    lend(CARD, [{ kind: 'rule', rule: 'upgradeStrength', value: 2, class: { modelClass: 'ranged' } } as CardEffect]);
    hold(state, CARD);
    expect(cardUpgradeStrength(state, archer)).toBe(2);
    const worker = createUnit(state, 0, 'worker', 12, 5);
    expect(cardUpgradeStrength(state, worker)).toBe(0);
  });
});

describe('The Platonic Academy (batch DT16)', () => {
  const ID = 'thePlatonicAcademy';

  /** A capital, and a hex of its own to lay a work on. */
  function board(held = true): { state: GameState; player: Player; city: City; site: { col: number; row: number } } {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    if (held) hold(state, ID);
    return { state, player: seat(state), city, site: { col: 6, row: 5 } };
  }

  /** The first great person of this family, standing on this hex for seat 0. */
  function person(state: GameState, where: { col: number; row: number }, family: Family): Unit {
    const id = GREAT_PERSON_IDS.find((row) => greatPersonDef(row).family === family)!;
    const unit = createUnit(state, 0, 'greatPerson', where.col, where.row, id);
    bumpRevision(state);
    return unit;
  }

  for (const family of FAMILIES) {
    it(`lets a ${family} found an Academy, through the command`, () => {
      const { state, site } = board();
      const unit = person(state, site, family);
      expect(workOf(state, unit)).toBe('academy');
      const result = applyCommand(state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id });
      expect(result.ok).toBe(true);
      expect(at(state, site.col, site.row).improvement).toBe('academy');
      expect(state.units.some((piece) => piece.id === unit.id)).toBe(false);
    });

    it(`leaves a ${family} its own work without the Doctrine`, () => {
      const { state, site } = board(false);
      const unit = person(state, site, family);
      expect(workOf(state, unit)).toBe(workForFamily(family));
      expect(familyWork(state, 0, family)).toBe(workForFamily(family));
      expect(familyLayingWork(state, 0, family)).toBe(family);
    });
  }

  it('claims no hexes for a general, where a Citadel does', () => {
    const { state, player, site } = board();
    const before = [...state.tileOwner];
    const general = person(state, site, 'general');
    const report = greatPersonWorkAt(state, player, general, at(state, site.col, site.row));
    expect(report.improvement).toBe('academy');
    expect(report.claimed).toEqual([]);
    expect(state.tileOwner).toEqual(before);

    const plain = board(false);
    const citadel = person(plain.state, plain.site, 'general');
    const claimed = greatPersonWorkAt(plain.state, plain.player, citadel, at(plain.state, plain.site.col, plain.site.row));
    expect(claimed.improvement).toBe('citadel');
    expect(claimed.claimed.length).toBeGreaterThan(0);
  });

  it('holds the Academy to the Academy’s own gate', () => {
    const { state, site } = board();
    const tile = at(state, site.col, site.row);
    raiseImprovement(tile, 'academy', state.turn);
    bumpRevision(state);
    const general = person(state, site, 'general');
    expect(greatPersonWorkError(state, 0, general.id)).toMatch(/already has an academy/);
    const before = snapshotState(state);
    expect(applyCommand(state, { type: 'greatPersonWork', playerId: 0, unitId: general.id }).ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('leaves the works already laid where they stand', () => {
    const { state, site } = board(false);
    const tile = at(state, site.col, site.row);
    raiseImprovement(tile, 'citadel', state.turn);
    hold(state, ID);
    expect(tile.improvement).toBe('citadel');
  });

  it('does not touch a prophet: the holy site is a different verb', () => {
    const { state, player, site } = board();
    const prophet = createUnit(state, 0, 'prophet', site.col, site.row);
    bumpRevision(state);
    expect(workOf(state, prophet)).toBeNull();
    const tile = at(state, site.col, site.row);
    plantHolySiteAt(state, player, prophet, tile);
    expect(tile.improvement).toBe('holySite');
  });

  it('does not change an act', () => {
    const gold = (held: boolean): number => {
      const { state, player, city } = board(held);
      const merchant = person(state, { col: city.col, row: city.row }, 'merchant');
      const before = player.gold;
      greatPersonActAt(state, player, merchant);
      return player.gold - before;
    };
    expect(gold(false)).toBeGreaterThan(0);
    expect(gold(true)).toBe(gold(false));
  });

  it('pays The Peripatetic School’s line on a general’s Academy', () => {
    const { state, player, city, site } = board();
    hold(state, 'thePeripateticSchool');
    const general = person(state, site, 'general');
    const before = hexPays(state, city, site.col, site.row);
    greatPersonWorkAt(state, player, general, at(state, site.col, site.row));
    const after = hexPays(state, city, site.col, site.row);
    // The Academy's own +3 science, and the School's +2 science and +2 production.
    expect(after.science - before.science).toBe(5);
    expect(after.production - before.production).toBe(2);
  });

  it('names the Academy in the bot’s reading of a general', () => {
    const { state, player, site } = board();
    state.turn = 40;
    person(state, site, 'general');
    const decision = nextBotDecision(state, player.id);
    expect(decision).not.toBeNull();
    const labels = decision!.candidates.map((candidate) => candidate.label);
    expect(labels).toContain(`Academy at (${site.col},${site.row})`);
    expect(labels.some((label) => label.includes('Citadel'))).toBe(false);
    expect(decision!.command.type).toBe('greatPersonWork');
    expect(decision!.summary).toContain('Found an Academy');
    expect(applyCommand(state, decision!.command).ok).toBe(true);
    expect(at(state, site.col, site.row).improvement).toBe('academy');
  });
});

describe('The Two Capitals (batch DT17)', () => {
  const ID = 'theTwoCapitals';

  /** A capital of five, a town of eight and a town of four, in founding order. */
  function board(held = true): { state: GameState; capital: City; second: City; third: City } {
    const state = bareState(36, 10);
    const capital = town(state, 3, 5, 5);
    const second = town(state, 12, 5, 8);
    const third = town(state, 21, 5, 4);
    if (held) hold(state, ID);
    return { state, capital, second, third };
  }

  /** This Doctrine's row for this test, announced so the law reads it. */
  function rows(state: GameState, effects: readonly CardEffect[]): void {
    lend(ID, [{ kind: 'rule', rule: 'secondCapital' }, ...effects]);
    bumpRevision(state);
  }

  /** What one card pays this town in this voice, summed over its lines. */
  function pays(state: GameState, city: City, card: string, voice: 'food' | 'production' | 'gold' | 'culture'): number {
    return explainCardCityYields(state, city)
      .filter((entry) => entry.card === card)
      .reduce((sum, entry) => sum + entry[voice], 0);
  }

  /** The growth percentage this card puts on this town. */
  function growth(state: GameState, city: City): number {
    return foldGrowthPercent(explainGrowthPercent(state, city).filter((entry) => entry.source.includes('The Two Capitals')));
  }

  /** What seat 0 is quoted, in authority, to found a town on this hex. */
  function foundingQuote(state: GameState, col: number, row: number): number {
    return 0 - explainFoundingCost(state, 0, at(state, col, row)).find((one) => one.meter === 'authority')!.value;
  }

  /** What one town costs seat 0 in authority, as a positive figure. */
  function townWrit(state: GameState, city: City): number {
    const entry = explainAuthority(state, 0).find((one) => one.part === 'cost' && one.source.startsWith(city.name));
    if (!entry) throw new Error(`no authority line for ${city.name}`);
    return 0 - entry.value;
  }

  describe('which towns count', () => {
    it('is the true capital alone without the rule', () => {
      const { state, capital } = board(false);
      expect(cardCapitalIds(state, 0)).toEqual([capital.id]);
    });

    it('adds the largest other town by citizens', () => {
      const { state, capital, second } = board();
      expect(cardCapitalIds(state, 0)).toEqual([capital.id, second.id]);
      // The true capital does not move, whoever is larger.
      expect(capitalCityOf(state, 0)?.id).toBe(capital.id);
    });

    it('gives a tie to the first in `state.cities` order', () => {
      const { state, capital, second, third } = board();
      third.population = second.population;
      bumpRevision(state);
      expect(cardCapitalIds(state, 0)).toEqual([capital.id, second.id]);
    });

    it('changes when another town overtakes, and goes back when it falls behind', () => {
      const { state, capital, second, third } = board();
      third.population = 9;
      bumpRevision(state);
      expect(cardCapitalIds(state, 0)).toEqual([capital.id, third.id]);
      third.population = 7;
      bumpRevision(state);
      expect(cardCapitalIds(state, 0)).toEqual([capital.id, second.id]);
    });

    it('counts a town smaller than the capital, and asks for a second only if there is one', () => {
      const { state, capital, second, third } = board();
      second.population = 2;
      third.population = 3;
      bumpRevision(state);
      expect(cardCapitalIds(state, 0)).toEqual([capital.id, third.id]);
      const alone = bareState(24, 10);
      expect(cardCapitalIds(alone, 0)).toEqual([]);
      const lone = town(alone, 5, 5, 3);
      hold(alone, ID);
      expect(cardCapitalIds(alone, 0)).toEqual([lone.id]);
      expect(secondCapitalCity(alone, 0)).toBeUndefined();
    });

    it('counts a captured town and leaves a rival alone', () => {
      const { state, capital, second, third } = board();
      third.population = 12;
      third.captured = true;
      const rival = town(state, 30, 5, 6, 1);
      const rivalSmall = town(state, 30, 8, 2, 1);
      bumpRevision(state);
      expect(cardCapitalIds(state, 0)).toEqual([capital.id, third.id]);
      expect(second.id).not.toBe(third.id);
      expect(cardCapitalIds(state, 1)).toEqual([rival.id]);
      expect(cityScopeAdmits(state, rivalSmall, { test: 'capital' })).toBe(false);
    });

    it('writes nothing: the board is the same after every reading', () => {
      const { state, second } = board();
      const before = snapshotState(state);
      cardCapitalIds(state, 0);
      cityScopeAdmits(state, second, { test: 'capital' });
      explainCardCityYields(state, second);
      expect(snapshotState(state)).toBe(before);
    });
  });

  describe('what pays both towns', () => {
    it('pays a `where: capital` card in both towns and no other (The Sum of Knowledge)', () => {
      const { state, capital, second, third } = board();
      slot(state, 'theSumOfKnowledge');
      const known = seat(state).techsResearched.length;
      expect(known).toBeGreaterThan(0);
      expect(pays(state, capital, 'theSumOfKnowledge', 'production')).toBe(known);
      expect(pays(state, capital, 'theSumOfKnowledge', 'culture')).toBe(known);
      expect(pays(state, second, 'theSumOfKnowledge', 'production')).toBe(known);
      expect(pays(state, second, 'theSumOfKnowledge', 'culture')).toBe(known);
      expect(pays(state, third, 'theSumOfKnowledge', 'production')).toBe(0);
    });

    it('pays the capital alone without the Doctrine', () => {
      const { state, capital, second } = board(false);
      slot(state, 'theSumOfKnowledge');
      expect(pays(state, capital, 'theSumOfKnowledge', 'production')).toBeGreaterThan(0);
      expect(pays(state, second, 'theSumOfKnowledge', 'production')).toBe(0);
    });

    it('pays a `capital` scope in both towns (Hearth Stores)', () => {
      const { state, capital, second, third } = board();
      slot(state, 'hearthStores');
      expect(pays(state, capital, 'hearthStores', 'food')).toBe(1);
      expect(pays(state, second, 'hearthStores', 'food')).toBe(1);
      expect(pays(state, third, 'hearthStores', 'food')).toBe(0);
    });

    it('moves the line in the real fold when another town overtakes', () => {
      const { state, second, third } = board();
      slot(state, 'hearthStores');
      const secondFood = foldCity(state, second).food;
      const thirdFood = foldCity(state, third).food;
      third.population = 9;
      refreshCityDerived(state, third);
      bumpRevision(state);
      expect(pays(state, second, 'hearthStores', 'food')).toBe(0);
      expect(pays(state, third, 'hearthStores', 'food')).toBe(1);
      expect(foldCity(state, second).food).toBe(secondFood - 1);
      expect(foldCity(state, third).food).toBeGreaterThan(thirdFood);
    });

    it('reads the same line on the building it is counted by (a building package)', () => {
      const { state, second, third } = board();
      rows(state, [
        {
          kind: 'pays',
          where: 'capital',
          basis: 'count',
          count: 'buildingsOfKind',
          building: 'library',
          within: 'city',
          to: 'culture',
          amount: 2,
        } as CardEffect,
      ]);
      for (const city of [second, third]) addBuilding(state, city, 'library');
      bumpRevision(state);
      const onLibrary = (city: City): number =>
        foldBuildingPackage(explainBuildingPackage(state, city, 'library')).culture;
      expect(onLibrary(second) - onLibrary(third)).toBe(2);
    });

    it('pays a `where: capital` count of citizens for the town’s own citizens (Market Day)', () => {
      const { state, capital, second, third } = board();
      slot(state, 'marketDay');
      expect(pays(state, capital, 'marketDay', 'gold')).toBe(capital.population);
      expect(pays(state, second, 'marketDay', 'gold')).toBe(second.population);
      expect(pays(state, third, 'marketDay', 'gold')).toBe(0);
    });

    it('counts both capitals’ citizens on an empire row, up to its cap (The Round City)', () => {
      const { state, capital, second, third } = board();
      slot(state, 'theRoundCity');
      const percent = (city: City): number =>
        explainCardPercentYields(state, city)
          .filter((entry) => entry.card === 'theRoundCity' && entry.yield === 'production')
          .reduce((sum, entry) => sum + entry.percent, 0);
      const both = capital.population + second.population;
      // The same figure in every town, because the row is about the empire.
      for (const city of [capital, second, third]) expect(percent(city)).toBe(both);
      second.population = 40;
      bumpRevision(state);
      expect(percent(third)).toBe(30);
    });

    it('counts the capital’s citizens alone on the same row without the Doctrine', () => {
      const { state, capital, second } = board(false);
      slot(state, 'theRoundCity');
      const line = explainCardPercentYields(state, second).find(
        (entry) => entry.card === 'theRoundCity' && entry.yield === 'production',
      );
      expect(line?.percent).toBe(capital.population);
    });

    it('reads a percentage scoped to the capital in both towns', () => {
      const { state, capital, second, third } = board();
      rows(state, [{ kind: 'percentYields', yield: 'culture', percent: 20, scope: { test: 'capital' } } as CardEffect]);
      const percent = (city: City): number =>
        explainCardPercentYields(state, city)
          .filter((entry) => entry.card === ID)
          .reduce((sum, entry) => sum + entry.percent, 0);
      expect([percent(capital), percent(second), percent(third)]).toEqual([20, 20, 0]);
    });

  });

  describe('what skips both towns', () => {
    it('slows growth 25% in the other towns and neither capital', () => {
      const { state, capital, second, third } = board();
      expect(growth(state, capital)).toBe(0);
      expect(growth(state, second)).toBe(0);
      expect(growth(state, third)).toBe(-25);
    });

    it('moves the slowing with the second town, and folds it into what the town banks', () => {
      const { state, second, third } = board(false);
      const fed = { ...foldCity(state, third), food: 100 };
      const plain = foldGrowthPercent(explainGrowthPercent(state, third));
      const before = channelSurplus(state, third, fed);
      const secondBefore = channelSurplus(state, second, fed);
      hold(state, ID);
      // One sum of percentages and one multiplication, so the card joins the sum.
      expect(channelSurplus(state, third, fed)).toBeCloseTo((before * (100 + plain - 25)) / (100 + plain), 8);
      expect(channelSurplus(state, second, fed)).toBe(secondBefore);
      third.population = 9;
      bumpRevision(state);
      expect(growth(state, third)).toBe(0);
      expect(growth(state, second)).toBe(-25);
    });

    it('slows nobody for a seat of two towns', () => {
      const state = bareState(24, 10);
      const capital = town(state, 3, 5, 3);
      const other = town(state, 12, 5, 3);
      hold(state, ID);
      expect(growth(state, capital)).toBe(0);
      expect(growth(state, other)).toBe(0);
    });

    // Since batch DT19c no dealt row charges with this scope, because The Mandarinate
    // and Synoecism print "each of your towns" and "towns you founded". The scope still
    // has to skip both towns, so a lent row asks it.
    const NOT_CAPITAL_COST = { kind: 'meterRule', rule: 'cityCost', delta: 1, scope: { test: 'notCapital' } } as CardEffect;
    const NOT_CAPITAL_INSIDE_ALL = {
      kind: 'meterRule',
      rule: 'cityCost',
      delta: 1,
      scope: { test: 'all', of: [{ test: 'notCaptured' }, { test: 'notCapital' }] },
    } as CardEffect;

    it('leaves a `notCapital` authority row off both towns', () => {
      const { state, capital, second, third } = board();
      const plain = [townWrit(state, second), townWrit(state, third)];
      lend('theMandarinate', [NOT_CAPITAL_COST]);
      hold(state, 'theMandarinate');
      expect(townWrit(state, capital)).toBe(0);
      expect(townWrit(state, second)).toBe(plain[0]);
      expect(townWrit(state, third)).toBe(plain[1]! + 1);
    });

    it('leaves a `notCapital` row inside an `all` off both towns', () => {
      const { state, second, third } = board();
      const plain = [townWrit(state, second), townWrit(state, third)];
      lend('synoecism', [NOT_CAPITAL_INSIDE_ALL]);
      hold(state, 'synoecism');
      expect(townWrit(state, second)).toBe(plain[0]);
      expect(townWrit(state, third)).toBe(plain[1]! + 1);
    });

    it('charges The Mandarinate on both towns, because its text says each of your towns', () => {
      const { state, capital, second, third } = board();
      const plain = [townWrit(state, capital), townWrit(state, second), townWrit(state, third)];
      expect(plain[0]).toBe(0);
      hold(state, 'theMandarinate');
      expect(townWrit(state, capital)).toBe(1);
      expect(townWrit(state, second)).toBe(plain[1]! + 1);
      expect(townWrit(state, third)).toBe(plain[2]! + 1);
    });

    it('charges the same row on the second town without the Doctrine', () => {
      const { state, second } = board(false);
      const plain = townWrit(state, second);
      lend('theMandarinate', [NOT_CAPITAL_COST]);
      hold(state, 'theMandarinate');
      expect(townWrit(state, second)).toBe(plain + 1);
    });

    it('quotes a founding as the fold will charge it', () => {
      const state = bareState(36, 10);
      town(state, 3, 5, 5);
      hold(state, ID);
      lend('theMandarinate', [NOT_CAPITAL_COST]);
      hold(state, 'theMandarinate');
      // Beside a lone capital the new town is the second, so the row skips it.
      expect(cardProspectCityCost(state, 0, at(state, 12, 5)).delta).toBe(0);
      const quoteSecond = foundingQuote(state, 12, 5);
      const second = town(state, 12, 5, 1);
      expect(townWrit(state, second)).toBe(quoteSecond);
      // With two towns the new one starts level with an older town, which keeps a tie.
      expect(cardProspectCityCost(state, 0, at(state, 21, 5)).delta).toBe(1);
      const quoteThird = foundingQuote(state, 21, 5);
      const third = town(state, 21, 5, 1);
      expect(cardCapitalIds(state, 0)).not.toContain(third.id);
      expect(townWrit(state, third)).toBe(quoteThird);
    });
  });

  describe('what stays at the true capital', () => {
    it('keeps the palace in one town', () => {
      const { state, capital, second, third } = board();
      expect(explainPalaceYield(state, capital).length).toBeGreaterThan(0);
      expect(explainPalaceYield(state, second)).toEqual([]);
      expect(explainPalaceYield(state, third)).toEqual([]);
    });

    it('keeps the authority ladder: the second town still costs its price', () => {
      const { state, capital, second } = board(false);
      const plain = townWrit(state, second);
      hold(state, ID);
      expect(townWrit(state, capital)).toBe(0);
      expect(townWrit(state, second)).toBe(plain);
    });

    it('lands a one-time `toCapital` grant in the true capital', () => {
      const { state, capital, second } = board();
      for (const city of [capital, second]) {
        city.queue = [{ kind: 'building', id: 'library' }];
        city.hammerBasket = 0;
      }
      rows(state, [
        { kind: 'windfallRider', occasion: 'tech', grant: { yield: 'production', amount: 15, toCapital: true } } as CardEffect,
      ]);
      const payout = windfallPayout(state, 0, 'tech');
      expect(payout.grants.map((grant) => grant.toCapital)).toEqual([true]);
      payWindfallGrants(state, seat(state), payout);
      expect(capital.hammerBasket).toBe(15);
      expect(second.hammerBasket).toBe(0);
    });

    it('raises a periodic muster at the true capital', () => {
      const { state, capital, second } = board();
      slot(state, 'theKingsLevy');
      state.turn = 15;
      bumpRevision(state);
      const before = state.units.length;
      musterPeriodicUnits(state);
      const raised = state.units.slice(before);
      expect(raised).toHaveLength(1);
      const dist = (town: City): number => Math.abs(raised[0]!.col - town.col);
      expect(dist(capital)).toBeLessThan(dist(second));
    });

    // The `queueHolds` condition, with its `where: 'capital'`, was asked here
    // until batch DS5 removed it: The Tithe of Nations was its last row.

    it('keeps a building’s site at the true capital (the Assembly Hall)', () => {
      const { state, capital, second } = board();
      rows(state, [{ kind: 'unlocksBuilding', building: 'assemblyHall' } as CardEffect]);
      expect(buildingDef('assemblyHall').requiresSite).toEqual({ test: 'trueCapital' });
      const refused = buildError(state, 0, 'building', 'assemblyHall', second);
      expect(refused).toContain('wants the seat of your government');
      expect(buildError(state, 0, 'building', 'assemblyHall', capital)).toBeNull();
    });

    it('keeps a luxury’s capital line at the true capital (Coffee)', () => {
      const { state, capital, second } = board();
      const tile = at(state, capital.col + 1, capital.row);
      tile.resource = 'coffee';
      raiseImprovement(tile, improvementForResource('coffee')!, 0);
      bumpRevision(state);
      const coffee = (city: City): number =>
        cityResourceYields(state, city)
          .filter((entry) => entry.resource === 'coffee')
          .reduce((sum, entry) => sum + entry.production, 0);
      expect(coffee(capital)).toBe(2);
      expect(coffee(second)).toBe(0);
    });

    it('reads `trueCapital` inside a composite as it reads it alone', () => {
      const { state, capital, second } = board();
      const inner: CityScope = { test: 'all', of: [{ test: 'trueCapital' }, { test: 'populationAtLeast', value: 1 }] };
      expect(cityScopeAdmits(state, capital, inner)).toBe(true);
      expect(cityScopeAdmits(state, second, inner)).toBe(false);
      expect(cityScopeAdmits(state, second, { test: 'capital' })).toBe(true);
    });
  });

  describe('only an Order or a Doctrine reaches the second town', () => {
    /** What one source pays this town in this voice, by the card that holds the row. */
    function culture(state: GameState, city: City, card: string): number {
      return pays(state, city, card, 'culture');
    }

    /** A combat situation on this town's own hex. */
    function fightAt(state: GameState, unit: Unit, city: City): CombatSituation {
      return {
        unit,
        tile: at(state, city.col, city.row),
        side: 'defend',
        vsBarbarians: false,
        vsCity: false,
        targetHp: 100,
        targetMaxHp: 100,
      };
    }

    it('pays an Order in both towns (The Sum of Knowledge) and a Doctrine in both (All Roads Lead to Rome)', () => {
      const { state, capital, second, third } = board();
      slot(state, 'theSumOfKnowledge');
      hold(state, 'allRoadsLeadToRome');
      for (let col = capital.col; col <= third.col; col++) layRoad(at(state, col, capital.row), 0);
      bumpRevision(state);
      expect(culture(state, capital, 'theSumOfKnowledge')).toBeGreaterThan(0);
      expect(culture(state, second, 'theSumOfKnowledge')).toBe(culture(state, capital, 'theSumOfKnowledge'));
      expect(culture(state, third, 'theSumOfKnowledge')).toBe(0);
      const percent = (city: City): number =>
        explainCardPercentYields(state, city)
          .filter((entry) => entry.card === 'allRoadsLeadToRome' && entry.yield === 'production')
          .reduce((sum, entry) => sum + entry.percent, 0);
      expect(percent(capital)).toBeGreaterThan(0);
      expect(percent(second)).toBe(percent(capital));
      expect(percent(third)).toBe(0);
    });

    it('keeps The Walls of Uruk’s defence and strength at the true capital', () => {
      const { state, capital, second } = board();
      addBuilding(state, capital, 'wallsOfUruk');
      bumpRevision(state);
      const defence = (city: City): number =>
        cardCityStat(state, city, 'defense')
          .filter((entry) => entry.card === 'wallsOfUruk')
          .reduce((sum, entry) => sum + entry.amount, 0);
      expect(defence(capital)).toBe(10);
      expect(defence(second)).toBe(0);
      const unit = createUnit(state, 0, 'warrior', second.col, second.row);
      const strength = buildingDef('wallsOfUruk').effects!.find((row) => row.kind === 'combatLine') as CardCombatLineEffect;
      expect(combatLineAmount(state, fightAt(state, unit, capital), strength)).toBe(4);
      expect(combatLineAmount(state, fightAt(state, unit, second), strength)).toBeNull();
    });

    // Divine Mandate's capital rows left with batch G1: the new Divine Mandate
    // pays a share in every town with a wonder, and names no capital.

    // Keeper of the Hearth's capital happiness left with batch B1: the god's
    // happiness stands on each Granary now, and names no capital.

    it('keeps Flower and Song at the true capital, counting its citizens alone', () => {
      const { state, capital, second } = board();
      seat(state).leader = 'nezahualcoyotl';
      bumpRevision(state);
      const expected = Math.floor(capital.population / 2);
      expect(culture(state, capital, 'flowerAndSong')).toBe(expected);
      expect(culture(state, second, 'flowerAndSong')).toBe(0);
    });

    for (const [id, name] of [
      ['sappho', 'Sappho'],
      ['christineDePizan', 'Christine de Pizan'],
    ] as const) {
      it(`keeps ${name}’s legacy at the true capital`, () => {
        const { state, capital, second } = board();
        seat(state).legacies.push({ id, age: 1 });
        bumpRevision(state);
        expect(culture(state, capital, id)).toBe(3);
        expect(culture(state, second, id)).toBe(0);
      });
    }

    it('keeps a legacy’s percentage and its production bonus at the true capital', () => {
      const { state, capital, second } = board();
      seat(state).legacies.push({ id: 'kidinnu', age: 1 }, { id: 'taqiAlDin', age: 1 });
      bumpRevision(state);
      const percent = (city: City, card: string): number =>
        explainCardPercentYields(state, city)
          .filter((entry) => entry.card === card)
          .reduce((sum, entry) => sum + entry.percent, 0);
      expect(percent(capital, 'kidinnu')).toBe(15);
      expect(percent(second, 'kidinnu')).toBe(0);
      expect(percent(capital, 'taqiAlDin')).toBeGreaterThan(0);
      expect(percent(second, 'taqiAlDin')).toBe(0);
    });

    it('counts Qu Yuan’s happiness at the true capital alone, so once', () => {
      const { state } = board();
      seat(state).legacies.push({ id: 'quYuan', age: 1 });
      bumpRevision(state);
      const lines = explainHappiness(state, 0)
        .filter((entry) => entry.source.includes('Qu Yuan'))
        .reduce((sum, entry) => sum + entry.value, 0);
      expect(lines).toBe(-5);
    });

    it('counts the great works of the true capital alone on the Camel Archer’s scale', () => {
      const { state, capital, second } = board();
      const scale = unitDef('camelArcher').effects!.find((row) => row.kind === 'combatLine') as CardCombatLineEffect;
      const unit = createUnit(state, 0, 'camelArcher', capital.col, capital.row);
      raiseImprovement(at(state, capital.col + 1, capital.row), 'academy', 0);
      raiseImprovement(at(state, second.col + 1, second.row), 'academy', 0);
      bumpRevision(state);
      expect(combatLineAmount(state, { ...fightAt(state, unit, capital), side: 'attack' }, scale)).toBe(1);
    });

    it('prints the same words for `trueCapital` as for `capital`', () => {
      expect(cityScopeWords({ test: 'trueCapital' })).toBe(cityScopeWords({ test: 'capital' }));
      expect(cityScopeWords({ test: 'all', of: [{ test: 'trueCapital' }, { test: 'mountainAdjacent' }] })).toBe(
        cityScopeWords({ test: 'all', of: [{ test: 'capital' }, { test: 'mountainAdjacent' }] }),
      );
      // A row with the true capital prints "in your capital", as a plain
      // capital row does. Divine Mandate was the government row that showed it
      // until batch G1, so the row is written here.
      const row = { kind: 'pays', where: 'capital', basis: 'count', to: 'faith', amount: 1, count: 'population', scope: { test: 'trueCapital' } };
      for (const clause of describeEffects([row as never])) {
        expect(stripRefs(clause.text)).toContain('in your capital');
      }
    });

    describe('the data walk', () => {
      const RAW: Record<string, string> = import.meta.glob('../../../data/**/*.json', {
        eager: true,
        query: '?raw',
        import: 'default',
      });

      /** Every data file, by the name a failure prints. */
      function dataFiles(): { name: string; rows: unknown }[] {
        return Object.entries(RAW).map(([path, text]) => ({
          name: path.replace('../../../data/', ''),
          rows: JSON.parse(text) as unknown,
        }));
      }

      /** Does this scope name this test, directly or inside a composite? */
      function namesTest(scope: unknown, test: string): boolean {
        if (typeof scope !== 'object' || scope === null) return false;
        const row = scope as { test?: string; of?: unknown[] };
        return row.test === test || (row.of ?? []).some((inner) => namesTest(inner, test));
      }

      /**
       * Every place under this value that reads the capital in the wide sense.
       * `retired` rows are skipped, because nobody can hold one.
       */
      function wideReadings(value: unknown, path: string, into: string[]): void {
        if (Array.isArray(value)) {
          value.forEach((entry, index) => wideReadings(entry, `${path}/${index}`, into));
          return;
        }
        if (typeof value !== 'object' || value === null) return;
        const row = value as Record<string, unknown>;
        if (row['retired'] === true) return;
        if (row['test'] === 'capital' || row['test'] === 'notCapital') into.push(`${path}: ${String(row['test'])}`);
        if (row['kind'] === 'pays' && !namesTest(row['scope'], 'trueCapital')) {
          if (row['where'] === 'capital') into.push(`${path}: where capital`);
          if (row['count'] === 'capitalPopulation') into.push(`${path}: capitalPopulation`);
        }
        for (const [key, inner] of Object.entries(row)) wideReadings(inner, `${path}/${key}`, into);
      }

      /** The same walk over a data file, with its Orders and Doctrines left out. */
      function outsideTheCards(file: { name: string; rows: unknown }): string[] {
        const found: string[] = [];
        for (const [section, rows] of Object.entries(file.rows as Record<string, unknown>)) {
          if (section === 'orders' || section === 'doctrines') continue;
          wideReadings(rows, `${file.name}/${section}`, found);
        }
        return found;
      }

      it('finds no row outside the Orders and Doctrines that could gain the second capital', () => {
        expect(dataFiles().flatMap(outsideTheCards)).toEqual([]);
      });

      it('would catch such a row, in each form', () => {
        const name = 'lent.json';
        const caught = (row: unknown): number => outsideTheCards({ name, rows: { things: { row } } }).length;
        expect(caught({ scope: { test: 'capital' } })).toBe(1);
        expect(caught({ scope: { test: 'notCapital' } })).toBe(1);
        expect(caught({ scope: { test: 'all', of: [{ test: 'capital' }] } })).toBe(1);
        expect(caught({ kind: 'pays', where: 'capital' })).toBe(1);
        expect(caught({ kind: 'pays', where: 'empire', count: 'capitalPopulation' })).toBe(1);
        expect(caught({ kind: 'pays', where: 'capital', scope: { test: 'trueCapital' } })).toBe(0);
        expect(caught({ retired: true, scope: { test: 'capital' } })).toBe(0);
        // An Order or a Doctrine may write the plain form.
        expect(outsideTheCards({ name, rows: { orders: { row: { scope: { test: 'capital' } } } } })).toEqual([]);
      });

      it('holds the list of rows that name the true capital', () => {
        const found: string[] = [];
        const note = (value: unknown, path: string): void => {
          if (Array.isArray(value)) {
            value.forEach((entry, index) => note(entry, `${path}/${index}`));
            return;
          }
          if (typeof value !== 'object' || value === null) return;
          if ((value as { test?: string }).test === 'trueCapital') found.push(path.split('/').slice(0, 4).join('/'));
          for (const [key, inner] of Object.entries(value)) note(inner, `${path}/${key}`);
        };
        for (const file of dataFiles()) note(file.rows, file.name);
        expect([...new Set(found)].sort()).toEqual(
          [
            'buildings.json/buildings/assemblyHall/requiresSite',
            'buildings.json/buildings/wallsOfUruk/effects',
            'greatPeople.json/people/amenhotepSonOfHapu/legacy',
            'greatPeople.json/people/christineDePizan/legacy',
            'greatPeople.json/people/kidinnu/legacy',
            'greatPeople.json/people/quYuan/legacy',
            'greatPeople.json/people/sappho/legacy',
            'greatPeople.json/people/taqiAlDin/legacy',
            'leaders.json/leaders/nezahualcoyotl/abilities',
            'resources.json/resources/coffee/effects',
            'resources.json/resources/coral/effects',
            'resources.json/resources/cotton/effects',
            'resources.json/resources/honey/effects',
            'resources.json/resources/olives/effects',
            'resources.json/resources/tyrian/effects',
            'resources.json/resources/whales/effects',
          ].sort(),
        );
      });

      it('finds Assur-Idi’s `notCapital` only on a retired row', () => {
        const people = dataFiles().find((file) => file.name === 'greatPeople.json')!.rows as {
          people: Record<string, { retired?: boolean; legacy?: unknown }>;
        };
        expect(people.people['assurIdi']?.retired).toBe(true);
        expect(JSON.stringify(people.people['assurIdi']?.legacy)).toContain('notCapital');
      });

      it('finds no Order or Doctrine reading the two forms that keep to the true capital', () => {
        // `capitalTerritory` and `capitalGreatWorks` read `capitalCityOf`. A live Order
        // or Doctrine that named one would stop short of the second town.
        const found: string[] = [];
        for (const file of dataFiles()) {
          const rows = file.rows as Record<string, Record<string, { retired?: boolean }>>;
          for (const section of ['orders', 'doctrines']) {
            for (const [id, row] of Object.entries(rows[section] ?? {})) {
              if (row.retired === true) continue;
              const text = JSON.stringify(row);
              if (text.includes('capitalTerritory') || text.includes('capitalGreatWorks')) found.push(id);
            }
          }
        }
        expect(found).toEqual([]);
      });
    });
  });

  describe('the reading is never stale', () => {
    /** Shadow on for one body: every hit on the slate or the law also computes fresh. */
    function shadowed(body: () => void): void {
      const was = slateShadow();
      setSlateShadow(true);
      try {
        body();
      } finally {
        setSlateShadow(was);
      }
    }

    /** A happiness row counted by the capital's citizens, read through `meterEffects`. */
    const COUNTED = {
      kind: 'pays',
      where: 'empire',
      basis: 'count',
      count: 'capitalPopulation',
      to: 'happiness',
      amount: 1,
    } as CardEffect;

    it('moves the meters when the second town loses a citizen, with no other announcement', () => {
      shadowed(() => {
        const { state, capital, second, third } = board();
        rows(state, [COUNTED]);
        const read = (): number =>
          explainHappiness(state, 0)
            .filter((entry) => entry.source.includes('The Two Capitals'))
            .reduce((sum, entry) => sum + entry.value, 0);
        expect(read()).toBe(capital.population + second.population);
        meterEffects(state, 0);
        readEmpirePercents(state, 0);
        expect(loseCitizen(state, second)).not.toBeNull();
        meterEffects(state, 0);
        expect(read()).toBe(capital.population + second.population);
        // The second town falls below the third, and the count follows.
        second.population = third.population;
        loseCitizen(state, second);
        meterEffects(state, 0);
        expect(cardCapitalIds(state, 0)).toEqual([capital.id, third.id]);
        expect(read()).toBe(capital.population + third.population);
      });
    });

    it('moves the meters when a town grows past the second', () => {
      shadowed(() => {
        const { state, capital, second, third } = board();
        rows(state, [COUNTED]);
        meterEffects(state, 0);
        settlePopulationWindfall(state, third, second.population - third.population + 1);
        meterEffects(state, 0);
        expect(cardCapitalIds(state, 0)).toEqual([capital.id, third.id]);
        expect(
          explainHappiness(state, 0)
            .filter((entry) => entry.source.includes('The Two Capitals'))
            .reduce((sum, entry) => sum + entry.value, 0),
        ).toBe(capital.population + third.population);
      });
    });

    it('reads every town fresh across real turns while a town overtakes by growing', () => {
      shadowed(() => {
        const { state, capital, second, third } = board();
        slot(state, 'hearthStores');
        // Two turns from a new citizen in the third town, with the second held back.
        third.population = second.population;
        third.foodBasket = 100_000;
        refreshCityDerived(state, third);
        bumpRevision(state);
        for (const city of [capital, second, third]) readCity(state, city);
        expect(cardCapitalIds(state, 0)).toEqual([capital.id, second.id]);
        for (const playerId of [0, 1]) {
          expect(applyCommand(state, { type: 'endTurn', playerId }).ok).toBe(true);
        }
        expect(third.population).toBeGreaterThan(second.population);
        expect(cardCapitalIds(state, 0)).toEqual([capital.id, third.id]);
        // A second ask is a hit, and the shadow check computes it fresh as well.
        for (const city of [capital, second, third]) {
          readCity(state, city);
          readCity(state, city);
        }
        expect(pays(state, third, 'hearthStores', 'food')).toBe(1);
        expect(pays(state, second, 'hearthStores', 'food')).toBe(0);
      });
    });

    it('gives the same board to a game that read the second town and one that did not', () => {
      const run = (asks: boolean): string => {
        const { state, capital, second, third } = board();
        slot(state, 'hearthStores');
        third.population = second.population;
        third.foodBasket = 100_000;
        refreshCityDerived(state, third);
        bumpRevision(state);
        for (let turn = 0; turn < 3; turn++) {
          if (asks) {
            for (const city of [capital, second, third]) readCity(state, city);
            meterEffects(state, 0);
          }
          for (const playerId of [0, 1]) {
            expect(applyCommand(state, { type: 'endTurn', playerId }).ok).toBe(true);
          }
        }
        return snapshotState(state);
      };
      expect(run(true)).toBe(run(false));
    });
  });

  describe('the recursion cut', () => {
    it('answers a scope asked inside a condition', () => {
      const { state, second, third } = board();
      const plain = [townWrit(state, second), townWrit(state, third)];
      // The condition reads authority, authority reads the lent `notCapital` row, and
      // that scope asks the rule. So the law asks itself, one level down.
      rows(state, [
        { kind: 'conditionRule', when: { test: 'authorityNegative' }, then: [{ kind: 'pays', where: 'empire', gold: 1 }] } as CardEffect,
        { kind: 'conditionRule', when: { test: 'authorityPositive' }, then: [{ kind: 'pays', where: 'empire', gold: 2 }] } as CardEffect,
      ]);
      lend('theMandarinate', [{ kind: 'meterRule', rule: 'cityCost', delta: 1, scope: { test: 'notCapital' } } as CardEffect]);
      hold(state, 'theMandarinate');
      expect(liveEffects(state, 0).some((row) => row.card === ID && row.effect.kind === 'rule')).toBe(true);
      expect(townWrit(state, second)).toBe(plain[0]);
      expect(townWrit(state, third)).toBe(plain[1]! + 1);
    });

    it('reads no second capital while a rule behind a condition is being asked about', () => {
      const { state, capital, second } = board(false);
      lend(ID, [
        {
          kind: 'conditionRule',
          when: { test: 'cityCountAtLeast', value: 1 },
          then: [{ kind: 'rule', rule: 'secondCapital' }],
        } as CardEffect,
        // Asked under the cut, where the gate above is closed, so the scope below
        // reads the true capital and does not recurse.
        { kind: 'conditionRule', when: { test: 'authorityPositive' }, then: [{ kind: 'pays', where: 'empire', gold: 1 }] } as CardEffect,
        { kind: 'meterRule', rule: 'cityCost', delta: 1, scope: { test: 'notCapital' } } as CardEffect,
      ]);
      hold(state, ID);
      // Out of the cut, the gate is open and the rule holds.
      expect(cardCapitalIds(state, 0)).toEqual([capital.id, second.id]);
    });
  });

  describe('the card', () => {
    it('says what it does', () => {
      expect(describeCard(ID as DoctrineId).map((clause) => stripRefs(clause.text))).toEqual([
        'your largest town besides your capital also counts as your capital for your cards',
        '-25% food surplus stored toward growth, in every city but your capital',
      ]);
    });

    it('states its limits in the note, with no figures and no identifiers', () => {
      const note = doctrineDef(ID as DoctrineId).note ?? '';
      expect(note).toContain('Only your Orders and Doctrines count the second town');
      expect(note).toContain('true capital');
      expect(note).toContain('Neither capital grows more slowly');
      expect(note).not.toMatch(/\d/);
      expect(note).not.toMatch(/[A-Za-z]+[A-Z][a-z]+/);
    });

    it('is one rule and one growth line', () => {
      expect(doctrineDef(ID as DoctrineId).effects.map((effect) => effect.kind)).toEqual(['rule', 'rulePercent']);
    });

    it('shows the second town’s pay in the card’s impact stamp at the offer', () => {
      const { state } = board(false);
      slot(state, 'hearthStores');
      const offered = foldCardImpact(explainCardImpact(state, 0, { kind: 'doctrine', id: ID as DoctrineId }));
      expect(offered.food).toBe(1);
    });
  });
});
