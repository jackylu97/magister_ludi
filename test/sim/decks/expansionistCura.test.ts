/**
 * **The Cura Aquarum** (batch E12 of `docs/plans/expansionist-themes-triage.md`,
 * reading 33). `expansionist.test.ts` checks the row against the sheet. This
 * file checks the shape the batch added:
 *
 *   · the `holdsBuilding` city rule: a town its scope admits holds its
 *     building. The Cura Aquarum's scope is `connected`, so a town joined to
 *     the capital by road holds an Aqueduct, and the capital never does;
 *   · `townBuildings` and `townHoldsBuilding`, the one reading of what a town
 *     holds. The town gains what an Aqueduct does (its water, its growth) and
 *     counts as having one for every card that asks (The Waterworks, The Great
 *     Aqueducts, Hydraulic Schools, Garden Cities, The Public Good);
 *   · what was built does not move: the town's own list, upkeep, the build
 *     list, buying, and the completion moment (The Coming of the Water);
 *   · the register: every reader of `City.buildings` in `src/sim`, and every
 *     reader moved to the one reading, each with its reason;
 *   · the words of the card.
 */

import { describe, expect, it } from 'vitest';

import { cityIsWatered } from '../../../src/sim/buildingEffects';
import { explainGrowthPercent, foundCityAt, realiseItem, refreshCityDerived } from '../../../src/sim/cities';
import { explainHappiness } from '../../../src/sim/meters';
import { purchaseError } from '../../../src/sim/purchase';
import { layRoad } from '../../../src/sim/roads';
import { type City, type GameState, addBuilding, bumpRevision, playerById } from '../../../src/sim/state';
import {
  cardProduction,
  cityScopeAdmits,
  countOf,
  describeCard,
  liveCityEffects,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  cardHeldBuildings,
  townBuildings,
  townHoldsBuilding,
  townShelf,
} from '../../../src/sim/statecraft/evaluator';
import { type CardPaysEffect, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { buildError } from '../../../src/sim/tech';
import { explainBuildingUpkeep } from '../../../src/sim/upkeep';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Takes every card out of this seat's chairs. */
function unslotAll(state: GameState, playerId: number): void {
  playerById(state, playerId)!.statecraft.slots = [];
  bumpRevision(state);
}

/** One town of the given size on the bare board, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number, owner = 0): City {
  const city = foundCityAt(state, owner, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * Three towns in a row on dry grassland: the capital, a town joined to it by
 * road, and a town with no road.
 */
function board(): { state: GameState; capital: City; joined: City; apart: City } {
  const state = bareState(20, 10);
  const capital = town(state, 2, 4, 8);
  const joined = town(state, 8, 4, 8);
  const apart = town(state, 14, 4, 8);
  for (let col = 3; col <= 7; col++) layRoad(at(state, col, 4), 0);
  bumpRevision(state);
  return { state, capital, joined, apart };
}

const CURA = 'theCuraAquarum';

const said = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));

const OF_KIND: CardPaysEffect = {
  kind: 'pays',
  where: 'empire',
  basis: 'count',
  count: 'buildingsOfKind',
  building: 'aqueduct',
};

describe('the Expansionist batch E12: what a town holds', () => {
  it('gives an Aqueduct to a town joined to the capital by road, and to no other town', () => {
    const { state, capital, joined, apart } = board();
    // With no such card, a town holds what it built, and the list is its own.
    expect(townBuildings(state, joined)).toBe(joined.buildings);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(false);

    slot(state, 0, CURA);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(true);
    expect(townBuildings(state, joined)).toEqual([...joined.buildings, 'aqueduct']);
    // The capital is what the others are joined to, so it never counts.
    expect(townHoldsBuilding(state, capital, 'aqueduct')).toBe(false);
    expect(townHoldsBuilding(state, apart, 'aqueduct')).toBe(false);
    // Nothing is written: the town's own list is what it built.
    expect(joined.buildings).not.toContain('aqueduct');
    expect(cardHeldBuildings(state, joined)).toEqual([
      { building: 'aqueduct', card: CURA, source: `Order · ${orderDef(CURA as OrderId).name}` },
    ]);

    // The road is cut, and the town no longer holds one.
    delete at(state, 5, 4).road;
    bumpRevision(state);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(false);
  });

  it('answers for the town owner\'s law only, and holds a built Aqueduct once', () => {
    const { state, joined } = board();
    // Another seat's card gives this seat's towns nothing.
    slot(state, 1, CURA);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(false);
    slot(state, 0, CURA);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(true);
    // A town that built one holds it once, and the card grants nothing there.
    addBuilding(state, joined, 'aqueduct');
    bumpRevision(state);
    expect(cardHeldBuildings(state, joined)).toEqual([]);
    expect(townBuildings(state, joined).filter((id) => id === 'aqueduct')).toHaveLength(1);
    // The card leaves its chair, and the town keeps what it built.
    unslotAll(state, 0);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(true);
  });

  it('grants no wonder or empire building, and cuts a scope that asks about its own building', () => {
    const { state, joined } = board();
    // The rows are edited for this test only and put back after it.
    const row = orderDef(CURA as OrderId);
    const saved = row.effects;
    try {
      row.effects = [
        { kind: 'rule', rule: 'holdsBuilding', building: 'theMagnumOpus', scope: { test: 'connected' } },
        { kind: 'rule', rule: 'holdsBuilding', building: 'aqueduct', scope: { test: 'hasBuilding', building: 'aqueduct' } },
        { kind: 'rule', rule: 'holdsBuilding', building: 'granary', scope: { test: 'hasBuilding', building: 'granary' } },
      ];
      slot(state, 0, CURA);
      // The Opus is one of a kind; the aqueduct's scope asks for itself and
      // reads only what was built, so it grants nothing and does not loop.
      expect(cardHeldBuildings(state, joined)).toEqual([]);
      // A granary built is held already, so its row grants nothing either.
      addBuilding(state, joined, 'granary');
      bumpRevision(state);
      expect(cardHeldBuildings(state, joined)).toEqual([]);
    } finally {
      row.effects = saved;
    }
  });

  it('hands the leaf readings the town itself when no card grants anything', () => {
    const { state, joined } = board();
    expect(townShelf(state, joined)).toBe(joined);
    slot(state, 0, CURA);
    expect(townShelf(state, joined)).toEqual({ buildings: [...joined.buildings, 'aqueduct'] });
  });
});

describe('the Expansionist batch E12: what an Aqueduct does', () => {
  it('waters the town and adds the Aqueduct\'s growth, in a joined town only', () => {
    const { state, capital, joined } = board();
    const sources = (city: City): string[] => explainGrowthPercent(state, city).map((line) => line.source);
    // The board is dry grassland, so every town pays the dry-site line.
    expect(sources(joined)).toContain('No fresh water');
    expect(sources(joined).some((source) => source.includes('Aqueduct'))).toBe(false);

    slot(state, 0, CURA);
    expect(sources(joined)).not.toContain('No fresh water');
    const growth = explainGrowthPercent(state, joined).filter((line) => line.source.includes('Aqueduct'));
    expect(growth).toEqual([{ source: 'Building · Aqueduct', percent: 15 }]);
    // The capital keeps its thirst.
    expect(sources(capital)).toContain('No fresh water');
    expect(sources(capital).some((source) => source.includes('Aqueduct'))).toBe(false);

    // The water is read off what the town holds; the town's own list is dry.
    expect(cityIsWatered(townShelf(state, joined))).toBe(true);
    expect(cityIsWatered(joined)).toBe(false);
    // The building's own effects reach the town as a built one's do.
    expect(liveCityEffects(state, joined).some((entry) => entry.card === 'aqueduct')).toBe(true);
    expect(liveCityEffects(state, capital).some((entry) => entry.card === 'aqueduct')).toBe(false);
  });
});

describe('the Expansionist batch E12: the cards that ask about an Aqueduct', () => {
  it('admits the town to every scope and count that asks whether it has one', () => {
    const { state, capital, joined } = board();
    const scope = { test: 'hasBuilding', building: 'aqueduct' } as const;
    slot(state, 0, CURA);
    expect(cityScopeAdmits(state, joined, scope)).toBe(true);
    expect(cityScopeAdmits(state, capital, scope)).toBe(false);
    const card = CURA as OrderId;
    expect(countOf(state, 0, card, OF_KIND)).toBe(1);
    expect(countOf(state, 0, card, { ...OF_KIND, within: 'city' }, joined)).toBe(1);
    expect(countOf(state, 0, card, { ...OF_KIND, within: 'city' }, capital)).toBe(0);
    // The Public Good counts it as a public work held.
    expect(
      countOf(state, 0, card, { kind: 'pays', where: 'empire', basis: 'count', count: 'publicWorks' }),
    ).toBe(1);
    // A held building was never raised, so a scope that asks its age refuses it.
    expect(cityScopeAdmits(state, joined, { ...scope, standingTurns: 1 })).toBe(false);
  });

  it('pays The Waterworks and Garden Cities in a joined town', () => {
    const { state } = board();
    slot(state, 0, 'expansionistTheWaterworks');
    slot(state, 0, 'gardenCities');
    const paid = (card: string): number =>
      explainHappiness(state, 0)
        .filter((line) => line.card === card)
        .reduce((sum, line) => sum + line.value, 0);
    expect(paid('expansionistTheWaterworks')).toBe(0);
    expect(paid('gardenCities')).toBe(0);
    slot(state, 0, CURA);
    // Eight citizens are two helpings of four, in the one joined town.
    expect(paid('expansionistTheWaterworks')).toBe(2);
    expect(paid('gardenCities')).toBe(1);
  });

  it('counts the town for The Great Aqueducts and Hydraulic Schools', () => {
    const { state, capital, joined } = board();
    slot(state, 0, 'theGreatAqueducts');
    slot(state, 0, 'hydraulicSchools');
    const toward = (city: City, card: string, building: 'theMagnumOpus' | 'library'): number =>
      cardProduction(state, city, 'building', undefined, building)
        .filter((line) => line.card === card)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(toward(capital, 'theGreatAqueducts', 'theMagnumOpus')).toBe(0);
    expect(toward(joined, 'hydraulicSchools', 'library')).toBe(0);
    slot(state, 0, CURA);
    expect(toward(capital, 'theGreatAqueducts', 'theMagnumOpus')).toBe(5);
    expect(toward(joined, 'hydraulicSchools', 'library')).toBe(20);
    expect(toward(capital, 'hydraulicSchools', 'library')).toBe(0);
  });
});

describe('the Expansionist batch E12: what was built does not move', () => {
  it('leaves the upkeep, the build list and buying as they were', () => {
    const { state, joined } = board();
    const upkeep = JSON.stringify(explainBuildingUpkeep(state, 0));
    const build = buildError(state, 0, 'building', 'aqueduct', joined);
    const buy = purchaseError(state, 0, joined.id, { kind: 'building', id: 'aqueduct' }, 'gold');
    slot(state, 0, CURA);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(true);
    expect(JSON.stringify(explainBuildingUpkeep(state, 0))).toBe(upkeep);
    expect(buildError(state, 0, 'building', 'aqueduct', joined)).toBe(build);
    expect(purchaseError(state, 0, joined.id, { kind: 'building', id: 'aqueduct' }, 'gold')).toBe(buy);
  });

  it('does not fire The Coming of the Water until the town finishes a real Aqueduct', () => {
    const { state, joined } = board();
    const farm = at(state, 8, 5);
    farm.improvement = 'farm';
    bumpRevision(state);
    slot(state, 0, 'theComingOfTheWater');
    slot(state, 0, CURA);
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(true);
    expect(farm.marks ?? []).not.toContain('aqueductWater');
    // Another building finished is not the moment.
    realiseItem(state, joined, { kind: 'building', id: 'granary' });
    bumpRevision(state);
    expect(farm.marks ?? []).not.toContain('aqueductWater');
    // The town may still build a real one, and that is the moment.
    realiseItem(state, joined, { kind: 'building', id: 'aqueduct' });
    bumpRevision(state);
    expect(joined.buildings).toContain('aqueduct');
    expect(farm.marks ?? []).toContain('aqueductWater');
  });
});

/**
 * **The register** (CLAUDE.md: a source-reading register test is always core).
 * Two lists, each pinned exactly, so a new reader of a town's buildings has to
 * say which question it asks.
 */
const SOURCES = {
  ...import.meta.glob('../../../src/sim/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../../src/sim/yields/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../../src/sim/statecraft/*.ts', { eager: true, query: '?raw', import: 'default' }),
} as Record<string, string>;

/** `file › function` for each code line of the simulation, comments skipped. */
function codeLines(): { where: string; code: string }[] {
  const lines: { where: string; code: string }[] = [];
  const top = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?(?:const|let)\s+(\w+)/;
  for (const [path, text] of Object.entries(SOURCES).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const file = path.replace('../../../src/sim/', '');
    let current = '(top)';
    for (const line of text.split('\n')) {
      const named = top.exec(line);
      if (named) current = named[1] ?? named[2] ?? current;
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
      lines.push({ where: `${file} › ${current}`, code: line.replace(/\/\/.*$/, '') });
    }
  }
  return lines;
}

/**
 * **Every read of a town's own `buildings` list**, with how many reads each
 * function makes and why it reads the built list. Three kinds:
 *
 *   · **built**: the question is what was built, so a held building must not
 *     count. Score, upkeep, triumphs, wagers, purchase, the build list, the
 *     completion moment, a building's age and how it was paid for (reading 33);
 *   · **one of a kind**: a wonder or an empire building. A card never grants
 *     one (`cardHeldBuildings` refuses them), so the built list is the whole
 *     answer;
 *   · **shelf**: a reading handed a town's buildings by its caller. Every
 *     caller in the simulation hands `townShelf` or `townBuildings` (checked
 *     below), and a caller with no state (the bot, the interface) hands the
 *     town, which is what it built;
 *   · **reading**: the one reading itself.
 */
const BUILT_READERS: Record<string, { reads: number; why: string }> = {
  'beads.ts › beadCount': { reads: 3, why: 'built: a bead deed is a record of what was built (the rows are retired)' },
  'buildingEffects.ts › buildingHappiness': { reads: 1, why: 'shelf: the meter hands `townBuildings` per town' },
  'buildingEffects.ts › buildingCityStat': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingCityHp': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › cityIsWatered': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingRestoresMovementOn': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › cityBuysWondersWithFaith': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › cityQueueFloor': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › cityKeepsRelics': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingAdjacentHeal': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingPurchaseDiscount': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingDemandRelief': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingRitePay': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingUnitUpkeepRebate': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingsEasingUnrest': { reads: 1, why: 'shelf' },
  'buildingEffects.ts › buildingTileLines': { reads: 1, why: 'shelf' },
  'cities.ts › planQueueItem': { reads: 1, why: 'built: the build list drops a row the town has built' },
  'cities.ts › payGrants': { reads: 1, why: 'built: a completion grant skips a building the town has built' },
  'combat.ts › applyCombat': { reads: 2, why: 'one of a kind: the wonders a captured town holds' },
  'combat.ts › captureCity': { reads: 1, why: 'one of a kind: the wonders a capture counts' },
  'combat.ts › worksAndWondersIn': { reads: 1, why: 'one of a kind: the wonders in a town' },
  'commands.ts › validateQueue': { reads: 1, why: 'built: the build list refuses a row the town has built' },
  'commissions.ts › payCommission': { reads: 1, why: 'built: a reward building the town has built is skipped' },
  'purchase.ts › clausesBeforeTheBank': {
    reads: 2,
    why: 'built: buying refuses a building the town has built, and a row needs one built',
  },
  'religion.ts › placeRelicError': { reads: 1, why: 'built: whether an act has placed a relic here' },
  'renown.ts › explainCityRenown': { reads: 1, why: 'shelf: its callers with an empire hand `townShelf`' },
  'score.ts › explainScore': { reads: 1, why: 'built: the score' },
  'state.ts › addBuilding': { reads: 2, why: 'built: the one writer' },
  'state.ts › buildingBank': { reads: 1, why: 'built: how a building was paid for' },
  'state.ts › buildingAge': { reads: 1, why: 'built: a building\'s age (a held one has none)' },
  'state.ts › wondersHeldBy': { reads: 1, why: 'one of a kind: the wonders an empire holds' },
  'statecraft/evaluator.ts › buildLiveEffects': {
    reads: 1,
    why: 'one of a kind: the empire walk, which may not ask the law it is building',
  },
  'statecraft/evaluator.ts › oldestEmpireBuildingAge': { reads: 1, why: 'built: an empire building\'s age' },
  'statecraft/evaluator.ts › cityScopeAdmits': {
    reads: 3,
    why: 'one of a kind: `hasWonder`, `notHasWonder` and `hasEmpireBuilding`',
  },
  'statecraft/evaluator.ts › countOf': {
    reads: 3,
    why: 'one of a kind (`wonders` in a town, `empireBuildings`), and built (`purchasedBuildings`, how it was paid for)',
  },
  'statecraft/evaluator.ts › followingCount': { reads: 1, why: 'one of a kind: towns with a wonder' },
  'statecraft/evaluator.ts › groundFactsFor': { reads: 1, why: 'one of a kind: a wonder\'s centre' },
  'statecraft/evaluator.ts › cardHeldBuildings': { reads: 1, why: 'reading: a building the town built is no grant' },
  'statecraft/evaluator.ts › townBuildings': { reads: 2, why: 'reading' },
  'statecraft/evaluator.ts › townShelf': { reads: 1, why: 'reading' },
  'tech.ts › buildError': { reads: 1, why: 'built: the build list (a parent building)' },
  'tech.ts › oneToARealmError': {
    reads: 2,
    why: 'built: the build list, one to a realm (moved out of `buildError` by Scientific batch S8)',
  },
  'tech.ts › extraCopiesWith': {
    reads: 2,
    why: 'built: the great houses standing or queued, for The Second Seat; one read is the replacement queue',
  },
  'tech.ts › buildingYieldDelta': { reads: 1, why: 'built: the build list\'s preview skips a town that built it' },
  'triumphs.ts › standingHolds': { reads: 1, why: 'one of a kind: wonders in one town, for a triumph' },
  'upkeep.ts › explainBuildingUpkeep': { reads: 1, why: 'built: maintenance' },
  'wagers.ts › wagerCount': { reads: 2, why: 'built: a wager counts what the capital has built' },
  'yields/hex.ts › cityContext': { reads: 1, why: 'shelf: reads the `townShelf` it took' },
  'yields/town.ts › explainBuildingPreview': {
    reads: 2,
    why: 'built: the build list, and the what-if adds the candidate to what was built',
  },
};

/**
 * **Every reader moved to the one reading** (`townBuildings`,
 * `townHoldsBuilding`, `townShelf`): the readers of a building's effect.
 */
const MOVED_READERS: Record<string, string> = {
  'arrival.ts › arriveOnTile': 'the herds a town keeps (`buildingRestoresMovementOn`)',
  'cities.ts › explainGrowthPercent': 'the water (`cityIsWatered`)',
  'cities.ts › realiseItem': 'the keep a town takes off its pieces (`buildingUnitUpkeepRebate`)',
  'combat.ts › cityWallsStrength': 'the walls (`buildingCityStat`)',
  'combat.ts › planCombat': 'the walls and the hit points',
  'combat.ts › captureCity': 'the hit points of a captured town',
  'combat.ts › healCities': 'the hit points a town heals to',
  'commands.ts › applySetCityProduction': 'the queue floor',
  'guilds.ts › explainGuildInflow': 'the renown that fills the guild bar',
  'guilds.ts › runGuilds': 'the family the next guildsman joins',
  'meters.ts › explainHappiness': 'the happiness and the demand relief',
  'meters.ts › buildingCapacity': 'the authority capacity',
  'purchase.ts › faithBankOpen': 'the faith bank a building opens, and buying a wonder with faith',
  'purchase.ts › applyRiders': 'the discount on purchases',
  'purchase.ts › clausesBeforeTheBank': 'buying a wonder with faith, and the queue floor',
  'religion.ts › payRiteBuildings': 'what a rite pays',
  'religion.ts › placeRelicError': 'the cathedral a relic is kept in',
  'religion.ts › explainPressure': 'the temple',
  'religion.ts › templeShare': 'the temple',
  'renown.ts › explainRenown': 'the renown',
  'resourceEffects.ts › matchingBuildings': 'a luxury that pays per building of a category',
  'routeYields.ts › explainRouteYieldBetween': 'the buildings a caravan counts',
  'statecraft/evaluator.ts › cityBuildingEffects': 'the building\'s own effects (a `liveEffects` source)',
  'statecraft/evaluator.ts › buildingsOfCategoryIn': 'the `buildingsOfCategory` scope and count',
  'statecraft/evaluator.ts › cityScopeAdmits': '`hasBuilding` and `hasBuildingYielding`',
  'statecraft/evaluator.ts › countOf':
    '`scienceBuildings`, `buildingsOfKind`, `buildingsInCity`, `buildingsOfCategories`, `defensiveBuildings`, `distinctBuildingCategories`, `publicWorks`',
  'statecraft/evaluator.ts › followingCount': 'the following towns with a building, and their shelves',
  'statecraft/evaluator.ts › explainCardCityYields': 'a `pays` mirror over a shelf',
  'statecraft/evaluator.ts › townHoldsBuilding': 'the reading',
  'statecraft/evaluator.ts › townShelf': 'the reading',
  'statecraft/evaluator.ts › cardPressureSources': 'a building\'s pressure',
  'trade.ts › explainRouteSlots': 'the route slots',
  'turn.ts › keepHeal': 'the heal beside a town',
  'unrest.ts › explainPacification': 'the buildings that ease unrest',
  'visibility.ts › sightSources': 'the sight',
  'yields/hex.ts › cityContext': 'the ground\'s lines and the irrigation',
  'yields/town.ts › explainCityBuildings': 'the building lines of the town fold (steps 8 and 9)',
  'yields/town.ts › productionModifiers': 'the buildings\' production bonuses',
};

/** The readings that are handed a town's buildings, and so must be handed what it holds. */
const SHELF_READINGS = [
  'buildingHappiness',
  'buildingCityStat',
  'buildingCityHp',
  'cityIsWatered',
  'buildingsIrrigate',
  'buildingRestoresMovementOn',
  'cityBuysWondersWithFaith',
  'cityQueueFloor',
  'cityKeepsRelics',
  'buildingAdjacentHeal',
  'buildingPurchaseDiscount',
  'buildingDemandRelief',
  'buildingRitePay',
  'buildingUnitUpkeepRebate',
  'buildingsEasingUnrest',
  'buildingTileLines',
  'explainCityRenown',
  'explainCityMaxHp',
  'cityMaxHp',
  'guildShares',
  'nextGuildFamily',
];

describe('the Expansionist batch E12: the register of readers', () => {
  it('reads a town\'s own list only where the question is what was built', () => {
    const reads = /(\w+|\))\??!?\.buildings\b/g;
    const notTowns = new Set(['BUILDING_DATA', 'unlocks', 'rider']);
    const found: Record<string, number> = {};
    for (const { where, code } of codeLines()) {
      for (const match of code.matchAll(reads)) {
        if (notTowns.has(match[1]!)) continue;
        found[where] = (found[where] ?? 0) + 1;
      }
    }
    const pinned = Object.fromEntries(Object.entries(BUILT_READERS).map(([key, row]) => [key, row.reads]));
    expect(found).toEqual(pinned);
  });

  it('moves every reader of a building\'s effect to the one reading', () => {
    const calls = /\b(townBuildings|townHoldsBuilding|townShelf)\(/g;
    const found = new Set<string>();
    for (const { where, code } of codeLines()) {
      for (const match of code.matchAll(calls)) {
        if (new RegExp(`function\\s+${match[1]}\\(`).test(code)) continue;
        found.add(where);
      }
    }
    expect([...found].sort()).toEqual(Object.keys(MOVED_READERS).sort());
  });

  it('hands every reading in the simulation what the town holds', () => {
    // The text of each call's arguments, by matching brackets over the joined
    // source, so a call split over several lines is read whole.
    const text = codeLines()
      .map((line) => line.code)
      .join('\n');
    const call = new RegExp(`\\b(${SHELF_READINGS.join('|')})\\(`, 'g');
    const bad: string[] = [];
    let total = 0;
    for (const match of text.matchAll(call)) {
      const before = text.slice(Math.max(0, match.index! - 9), match.index!);
      if (before.endsWith('function ')) continue;
      let depth = 1;
      let end = match.index! + match[0].length;
      while (depth > 0 && end < text.length) {
        if (text[end] === '(') depth += 1;
        if (text[end] === ')') depth -= 1;
        end += 1;
      }
      const args = text.slice(match.index! + match[0].length, end - 1);
      total += 1;
      if (!/\btownShelf\(|\btownBuildings\(|\bshelf\b/.test(args)) bad.push(`${match[1]}(${args})`);
    }
    expect(total).toBeGreaterThan(25);
    expect(bad).toEqual([]);
  });
});

describe('the Expansionist batch E12: the row', () => {
  it('deals the card as a rare Tier III Economic Order', () => {
    const id = CURA as OrderId;
    expect(orderIsDealt(id)).toBe(true);
    expect(orderDef(id).type).toBe('economic');
    expect(orderDef(id).band).toBe(3);
    expect(orderDef(id).rarity).toBe('rare');
  });

  it('says what it does in plain words', () => {
    expect(said(CURA)).toEqual(['every city joined to your capital by road counts as having an Aqueduct']);
  });
});
