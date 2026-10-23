/**
 * **The Commerce cards changed in place by the themes pass** (batch T1 of
 * `docs/plans/commerce-themes-triage.md`). `commerce.test.ts` checks the rows
 * against the sheet; this file checks what the changed cards now do, and the
 * rows T1 retired, moved and retyped:
 *
 *   · Private Patronage: +40% gold, and it keeps its slower ordinary buildings
 *     (reading 4);
 *   · The Market Writ, The Factors' Houses and Caravanserai Cities: no gold
 *     percentage left (the trims);
 *   · The Carters' Guild: +25% production toward buildings in a town a
 *     domestic trade route of yours reaches (reading 34);
 *   · Corner the Market: an institution, +2 happiness for each luxury held
 *     twice or more, paid once the goal is met (readings 8 and 9);
 *   · The Strongroom: Tier III, uncommon, a goal of 1,500 gold (reading 8);
 *   · Bought and Paid For: +4% production and culture in a town for each
 *     building bought there with gold, at most +24% (reading 32);
 *   · Money at Work: +1 science in every town for every 500 gold, with no cap
 *     (reading 31);
 *   · the six moves of tier, the three deferred rows' new text, tier and
 *     rarity (reading 41), the eleven retirements (reading 39), the four rows
 *     moved to `common.json` (reading 37), and the five shared rows that change
 *     tier.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, refreshCityDerived, resourceCopies } from '../../../src/sim/cities';
import { runCommissions } from '../../../src/sim/commissions';
import { type Tile, raiseImprovement } from '../../../src/sim/map';
import { happinessOf } from '../../../src/sim/meters';
import { improvementForResource } from '../../../src/sim/improvementData';
import { RESOURCE_IDS, resourceDef } from '../../../src/sim/resourceData';
import { type City, type GameState, addBuilding, bumpRevision, createUnit, playerById } from '../../../src/sim/state';
import {
  commissionFulfilledTurn,
  describeCard,
  explainCardCityYields,
  explainCardPercentYields,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type CommissionGoal,
  type OrderId,
  DECK_FILE_ORDERS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import type { UnitTypeId } from '../../../src/sim/unitData';
import { productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for seat 0, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City): Tile[] {
  return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
}

/** A cart carrying a live route from `from` to `to` for the origin's owner. */
function send(state: GameState, from: City, to: City): void {
  const cart = createUnit(state, from.ownerId, 'trader' as UnitTypeId, from.col, from.row);
  cart.trade = {
    from: from.id,
    to: to.id,
    expiresTurn: state.turn + 20,
    startedTurn: state.turn,
    outbound: true,
    autoResend: false,
  };
  bumpRevision(state);
}

/** The percentage one card puts on this town, in one voice. */
function townPercent(state: GameState, city: City, card: string, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** What one card's town lines pay this town, in one voice. */
function townPays(state: GameState, city: City, card: string, voice: 'science' | 'production'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** Runs a commission with other goals, so a small board can meet it. */
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

/** True while the card sits in one of seat 0's chairs. */
function seated(state: GameState, card: string): boolean {
  return playerById(state, 0)!.statecraft.slots.some((held) => held?.card === card);
}

describe('Commerce batch T1: the gold percentages', () => {
  it('Private Patronage pays +40% gold and still slows ordinary buildings', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 0, 'privatePatronage');
    expect(townPercent(state, city, 'privatePatronage', 'gold')).toBe(40);
    const slower = productionModifiers(state, city, { kind: 'building', id: 'granary' }).filter((line) =>
      line.source.includes('Private Patronage'),
    );
    expect(slower.map((line) => line.percent)).toEqual([-20]);
  });

  it('The Market Writ, The Factors’ Houses and Caravanserai Cities keep no gold percentage', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    addBuilding(state, city, 'caravanserai');
    for (const card of ['theMarketWrit', 'theFactorsHouses', 'caravanseraiCities']) slot(state, 0, card);
    for (const card of ['theMarketWrit', 'theFactorsHouses', 'caravanseraiCities']) {
      expect(townPercent(state, city, card, 'gold'), card).toBe(0);
      expect(orderDef(card as OrderId).effects.some((e) => e.kind === 'percentYields'), card).toBe(false);
    }
    // What each keeps: the authority count, the flat pay in post towns, and
    // the rule that lets every town build a Caravanserai.
    expect(orderDef('theMarketWrit' as OrderId).effects).toEqual([
      expect.objectContaining({ kind: 'pays', where: 'empire', to: 'authority', count: 'buildingsOfKind' }),
    ]);
    expect(orderDef('theFactorsHouses' as OrderId).effects).toEqual([
      expect.objectContaining({ kind: 'pays', where: 'city', gold: 2, culture: 4, scope: { test: 'holdsPost' } }),
    ]);
    expect(orderDef('caravanseraiCities' as OrderId).effects).toEqual([
      { kind: 'rule', rule: 'buildsEverywhere', building: 'caravanserai' },
    ]);
  });
});

describe('Commerce batch T1: the cards that pay something new', () => {
  it('The Carters’ Guild speeds buildings in a town a domestic trade route reaches, and nothing else', () => {
    const state = bareState(16, 10);
    const home = town(state, 2, 5, 4);
    const market = town(state, 9, 5, 4);
    const quiet = town(state, 13, 2, 4);
    slot(state, 0, 'theCartersGuild');
    const named = (city: City, item: { kind: 'building' | 'unit'; id: string }) =>
      productionModifiers(state, city, item as never).filter((line) => line.source.includes("The Carters' Guild"));
    expect(named(market, { kind: 'building', id: 'granary' })).toEqual([]);
    send(state, home, market);
    expect(named(market, { kind: 'building', id: 'granary' }).map((line) => line.percent)).toEqual([25]);
    // Buildings only, and only the town the route reaches.
    expect(named(market, { kind: 'unit', id: 'warrior' })).toEqual([]);
    expect(named(home, { kind: 'building', id: 'granary' })).toEqual([]);
    expect(named(quiet, { kind: 'building', id: 'granary' })).toEqual([]);
    // A route from another empire does not count: the route must be your own.
    const foreign = foundCityAt(state, 1, at(state, 13, 8));
    send(state, foreign, quiet);
    expect(named(quiet, { kind: 'building', id: 'granary' })).toEqual([]);
  });

  it('Bought and Paid For pays +4% production and culture a building bought there with gold, at most +24%', () => {
    const state = bareState(16, 10);
    const city = town(state, 3, 5, 4);
    const other = town(state, 11, 5, 4);
    slot(state, 0, 'boughtAndPaidFor');
    addBuilding(state, city, 'monument', 'gold');
    addBuilding(state, city, 'granary', 'gold');
    // A building bought with faith, or built, does not count.
    addBuilding(state, city, 'shrine', 'faith');
    addBuilding(state, city, 'library');
    bumpRevision(state);
    expect(townPercent(state, city, 'boughtAndPaidFor', 'production')).toBe(8);
    expect(townPercent(state, city, 'boughtAndPaidFor', 'culture')).toBe(8);
    expect(townPercent(state, other, 'boughtAndPaidFor', 'production')).toBe(0);
    for (const id of ['barracks', 'palisade', 'market', 'temple', 'amphitheater', 'aqueduct'] as const) {
      addBuilding(state, city, id, 'gold');
    }
    bumpRevision(state);
    expect(townPercent(state, city, 'boughtAndPaidFor', 'production')).toBe(24);
    expect(townPercent(state, city, 'boughtAndPaidFor', 'culture')).toBe(24);
    for (const line of explainCardPercentYields(state, city).filter((l) => l.card === 'boughtAndPaidFor')) {
      expect(line.stage).toBe('city');
    }
  });

  it('Money at Work pays every town +1 science for every 500 gold, with no cap', () => {
    const state = bareState(16, 10);
    const one = town(state, 3, 5, 3);
    const two = town(state, 11, 5, 3);
    slot(state, 0, 'moneyAtWork');
    const player = playerById(state, 0)!;
    player.gold = 1499;
    bumpRevision(state);
    expect(townPays(state, one, 'moneyAtWork', 'science')).toBe(2);
    expect(townPays(state, two, 'moneyAtWork', 'science')).toBe(2);
    expect(townPays(state, one, 'moneyAtWork', 'production')).toBe(0);
    player.gold = 20000;
    bumpRevision(state);
    expect(townPays(state, one, 'moneyAtWork', 'science')).toBe(40);
    // A treasury below zero counts as nothing.
    player.gold = -300;
    bumpRevision(state);
    expect(townPays(state, two, 'moneyAtWork', 'science')).toBe(0);
  });

  it('The Customs Houses pays no hex gold, no renown and no gold percentage any more', () => {
    const effects = orderDef('theCustomsHouses' as OrderId).effects;
    expect(effects.map((e) => e.kind)).toEqual(['pays', 'pays']);
    for (const effect of effects) {
      expect(effect).toMatchObject({ where: 'city', basis: 'count', count: 'tilesInBorders', within: 'city', amount: 4 });
    }
  });
});

describe('Commerce batch T1: the commissions', () => {
  it('Corner the Market leaves +2 happiness for each luxury held twice or more, and no gold or merchant', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const player = playerById(state, 0)!;
    const luxuries = RESOURCE_IDS.filter(
      (id) => resourceDef(id).kind === 'luxury' && improvementForResource(id) !== null,
    ).slice(0, 2);
    expect(luxuries).toHaveLength(2);
    const hexes = ring(state, city);
    // Two copies of the first luxury and one of the second.
    const placed: [Tile, string][] = [
      [hexes[0]!, luxuries[0]!],
      [hexes[1]!, luxuries[0]!],
      [hexes[2]!, luxuries[1]!],
    ];
    for (const [tile, luxury] of placed) {
      const reveal = resourceDef(luxury as never).requiresTech;
      if (reveal && !player.techsResearched.includes(reveal)) player.techsResearched.push(reveal);
      tile.resource = luxury as never;
      raiseImprovement(tile, improvementForResource(luxury as never)!, state.turn);
    }
    bumpRevision(state);
    expect(resourceCopies(state, 0, luxuries[0]!)).toBe(2);
    expect(resourceCopies(state, 0, luxuries[1]!)).toBe(1);
    // The goal is unchanged: four copies of one luxury.
    expect(orderDef('cornerTheMarket' as OrderId).commission!.goals).toEqual([
      { kind: 'reached', figure: 'luxuryCopies', count: 4 },
    ]);
    slot(state, 0, 'cornerTheMarket');
    const before = happinessOf(state, 0);
    const gold = player.gold;
    withGoals('cornerTheMarket', [{ kind: 'reached', figure: 'luxuryCopies', count: 2 }], () => {
      expect(runCommissions(state)).toHaveLength(1);
    });
    bumpRevision(state);
    expect(commissionFulfilledTurn(player.statecraft, 'cornerTheMarket' as OrderId)).toBe(state.turn);
    expect(seated(state, 'cornerTheMarket')).toBe(false);
    // One luxury is held twice: +2 happiness, for the rest of the game.
    expect(happinessOf(state, 0)).toBe(before + 2);
    expect(player.gold).toBe(gold);
    expect(player.greatPersonOffer).toBeUndefined();
    const words = describeCard('cornerTheMarket' as OrderId).map((clause) => stripRefs(clause.text));
    expect(words[1]).toBe(
      'Reward: for the rest of the game, +2 happiness per luxury you hold two or more copies of',
    );
  });

  it('The Strongroom asks for 1,500 gold, at Tier III and uncommon', () => {
    const def = orderDef('theStrongroom' as OrderId);
    expect([def.band, def.rarity]).toEqual([3, 'uncommon']);
    const state = bareState();
    town(state, 5, 5, 3);
    slot(state, 0, 'theStrongroom');
    const player = playerById(state, 0)!;
    player.gold = 1499;
    expect(runCommissions(state)).toEqual([]);
    player.gold = 1500;
    expect(runCommissions(state).map((report) => report.card)).toEqual(['theStrongroom']);
  });
});

describe('Commerce batch T1: tiers, retirements and moves', () => {
  it('moves six Commerce cards to their new tiers, and Established Routes asks for twenty turns', () => {
    const bands: Record<string, number> = {
      provisioningContracts: 2,
      theCartersGuild: 2,
      theFactorsHouses: 2,
      theCommonRoad: 2,
      theSpiceExchange: 2,
      establishedRoutes: 3,
      theScholarsRoads: 3,
      theStrongroom: 3,
    };
    for (const [id, band] of Object.entries(bands)) expect(orderDef(id as OrderId).band, id).toBe(band);
    expect(orderDef('establishedRoutes' as OrderId).effects[0]).toMatchObject({ where: 'route', standingTurns: 20 });
  });

  it('gives the three deferred rows their new text, tier and rarity, and deals none of them', () => {
    const rows: Record<string, [number, string]> = {
      theReturnLeg: [3, 'rare'],
      exportGuilds: [1, 'uncommon'],
      theTreatyPorts: [2, 'uncommon'],
    };
    for (const [id, [band, rarity]] of Object.entries(rows)) {
      const def = orderDef(id as OrderId);
      expect([def.band, def.rarity], id).toEqual([band, rarity]);
      expect(def.effects, id).toEqual([]);
      expect(orderIsDealt(id as OrderId), id).toBe(false);
      // Player prose with no figure in it (rule 7).
      for (const sentence of [...(def.deferred ?? []), def.note ?? '']) expect(sentence, id).not.toMatch(/[0-9]/);
    }
    expect(orderDef('exportGuilds' as OrderId).text).toContain('lend to another empire in a deal');
    expect(orderDef('theTreatyPorts' as OrderId).text).toContain('each empire you hold a deal with');
    expect(orderDef('theReturnLeg' as OrderId).text).toContain('everything they pay their destination');
  });

  it('retires the eleven rows the themes pass cut, with no type, and deals none of them', () => {
    const cut = [
      'coastalEstates',
      'boughtSwords',
      'frontierInvestment',
      'oreCaravans',
      'ventureRoutes',
      'theCaravanseraiNetwork',
      'patronsAbroad',
      'theMerchantDynasties',
      'theConsulate',
      'thePostRiders',
      'theEmbargo',
    ] as OrderId[];
    const pool = ordersForDecks(['commerce']);
    for (const id of cut) {
      expect(DECK_FILE_ORDERS.commerce, id).toContain(id);
      expect(orderDef(id).retired, id).toBe(true);
      expect(orderDef(id).type, id).toBeUndefined();
      expect(orderIsDealt(id), id).toBe(false);
      expect(pool, id).not.toContain(id);
    }
    // A save that holds one keeps it with its effects (reading 39).
    expect(orderDef('ventureRoutes' as OrderId).effects.length).toBeGreaterThan(0);
  });

  it('moves four rows to the shared file, with their ids, texts and tiers, and deals each to both decks', () => {
    const moved: Record<string, [string, string, number]> = {
      theMerchantShrines: ['devotion', 'civic', 0],
      theWaqf: ['devotion', 'civic', 2],
      theSilkRoadMonks: ['devotion', 'civic', 2],
      theBrokersRedraw: ['magisterial', 'wildcard', 2],
    };
    for (const [id, [partner, type, band]] of Object.entries(moved)) {
      const def = orderDef(id as OrderId);
      expect(DECK_FILE_ORDERS.common, id).toContain(id);
      expect(DECK_FILE_ORDERS.commerce, id).not.toContain(id);
      expect(def.decks, id).toEqual(['commerce', partner]);
      expect(def.type, id).toBe(type);
      expect(def.band, id).toBe(band);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(ordersForDecks(['commerce']), id).toContain(id);
      expect(ordersForDecks([partner as never]), id).toContain(id);
    }
  });

  it('moves the shared route cards to Tier II and The Exchange of Discoveries to Tier I, and types four shared rows', () => {
    const bands: Record<string, number> = {
      commonTheEscortedRoads: 2,
      pilgrimMarkets: 2,
      theGrainExchange: 2,
      travellingPlayers: 2,
      theExchangeOfDiscoveries: 1,
    };
    for (const [id, band] of Object.entries(bands)) expect(orderDef(id as OrderId).band, id).toBe(band);
    const types: Record<string, string> = {
      pilgrimMarkets: 'civic',
      commonTheTithe: 'economic',
      travellingPlayers: 'civic',
      theCosmopolitanCourt: 'civic',
    };
    for (const [id, type] of Object.entries(types)) expect(orderDef(id as OrderId).type, id).toBe(type);
    // Travelling Players keeps its built text until the Magisterial pass (reading 38).
    expect(orderDef('travellingPlayers' as OrderId).text).toBe(
      'Foreign routes from a city with a Monument gain +2 culture.',
    );
  });
});
