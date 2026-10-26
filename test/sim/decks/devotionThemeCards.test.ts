/**
 * **The Devotion cards changed in place by the themes pass** (batch DV1 of
 * `docs/plans/devotion-themes-triage.md`). `devotion.test.ts` checks the rows
 * against the sheet. This file checks what the changed cards now do, and the
 * rows DV1 retired, moved and typed:
 *
 *   · Lay Offerings: one hex line on pastures, camps and plantations, which
 *     takes in Pastoral Shrines (reading 36);
 *   · The Settled Faith: +15% science and culture in devout towns, with no
 *     happiness line and no Temple or rite, and its proclamations still press
 *     a flat 15 less (readings 2 and 38);
 *   · The Mission and The Conversion of Kings: Tier II and Tier III, with 300
 *     and 500 culture (reading 6);
 *   · The Great Commission: an institution, +3 faith and +3 culture in devout
 *     towns for the rest of the game, in place of 500 faith and thirty turns
 *     (readings 6 and 35);
 *   · The Interdict: its new text, still deferred (reading 12);
 *   · the tier moves, the four retirements (reading 7), the seven rows moved to
 *     `common.json` (reading 8), and the two shared Magisterial rows typed.
 *
 * A "devout town" is one of your towns that follows a religion you are paid
 * by: the town scope `ownersFaith` with `keeps: true` (reading 2).
 *
 * Batch DV2 added the new cards whose shapes already existed, and this file
 * checks each of them on a small board:
 *
 *   · seven Devotion cards: The Deaconries, The Lives of the Saints, The
 *     Martyrology, The Consecration Feast, The Pilgrim Towns, The Holy Summons
 *     (reading 32) and The Work of God (reading 37);
 *   · four shared cards: The Shrine Guards (with Dominion), and The Monastery
 *     Libraries, The Blessed Forges and The Schoolmen's Charter (with
 *     Scientific). The charter opens Scholasticism, which opens the Cathedral
 *     and the Apostle before Theology (reading 24);
 *   · feature E's word: the describers print the devout scope as "devout",
 *     and the Compendium's faith page says what a devout town is.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, realiseItem, refreshCityDerived } from '../../../src/sim/cities';
import { runCommissions } from '../../../src/sim/commissions';
import { improvementForResource } from '../../../src/sim/improvementData';
import { type Tile, getTileAt, raiseImprovement } from '../../../src/sim/map';
import { purchaseError, purchaseItemAt } from '../../../src/sim/purchase';
import { performRiteAt, riteError } from '../../../src/sim/religion';
import type { RiteId } from '../../../src/sim/religionData';
import { RESOURCE_IDS, resourceDef } from '../../../src/sim/resourceData';
import {
  type City,
  type GameState,
  bumpRevision,
  firstKey,
  markFirst,
  playerById,
} from '../../../src/sim/state';
import {
  cardHappiness,
  cardProduction,
  commissionFulfilledTurn,
  describeCard,
  explainCardCityYields,
  explainCardEmpireYields,
  explainCardPercentYields,
  payWindfallGrants,
  recordScalingOccasion,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type CommissionGoal,
  type OrderId,
  DECK_FILE_ORDERS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { isUnlocked, researchError } from '../../../src/sim/tech';
import { techDef } from '../../../src/sim/techData';
import { unitDef } from '../../../src/sim/unitData';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { CONCEPT_ENTRIES } from '../../../src/ui/compendiumText';
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
function town(state: GameState, owner: number, col: number, row: number, population: number): City {
  const city = foundCityAt(state, owner, at(state, col, row));
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

/**
 * A religion founded by the town's owner, whose holy site is the town's own
 * centre, so the owner is paid by it. Every citizen of the town follows it.
 */
function holyCity(state: GameState, city: City): number {
  const tile = getTileAt(state.map, city.col, city.row)!;
  tile.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: city.ownerId,
    name: 'The Testament',
    pantheon: [],
    follower: [],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: city.col, row: city.row },
  } as never);
  const religion = state.religions.length - 1;
  city.followers = { [religion]: city.population };
  bumpRevision(state);
  return religion;
}

/** Makes every citizen of the town follow this religion. */
function convert(state: GameState, city: City, religion: number): void {
  city.followers = { [religion]: city.population };
  bumpRevision(state);
}

/** The percentage one card puts on this town, in one voice. */
function townPercent(state: GameState, city: City, card: string, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** What one card's town lines pay this town, in one voice. */
function townPays(
  state: GameState,
  city: City,
  card: string,
  voice: 'faith' | 'culture' | 'happiness' | 'science' | 'production',
): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + ((line as unknown as Record<string, number>)[voice] ?? 0), 0);
}

/** What one card's lines pay on one hex, as seat 0 sees it. */
function hexPays(state: GameState, tile: Tile, card: string): { food: number; faith: number } {
  const name = orderDef(card as OrderId).name;
  const total = { food: 0, faith: 0 };
  for (const line of explainTileYield(tile, yieldContextFor(state, 0))) {
    if (!line.source.includes(name)) continue;
    total.food += line.food;
    total.faith += line.faith;
  }
  return total;
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

/** The printed words of a card, marks stripped. */
function words(id: string): string[] {
  return describeCard(id as OrderId).map((clause) => stripRefs(clause.text));
}

/** A goal this small board meets: more than half the world's towns follow you. */
const HALF_THE_WORLD: CommissionGoal[] = [{ kind: 'reached', figure: 'followingCityShare', count: 51 }];

describe('Devotion batch DV1: the hex and town cards', () => {
  it('Lay Offerings pays +1 faith and +1 food on pastures, camps and plantations, and on no other hex', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5, 4);
    const [pasture, camp, plantation, farm, wild] = ring(state, city);
    raiseImprovement(pasture!, 'pasture', state.turn);
    raiseImprovement(camp!, 'camp', state.turn);
    raiseImprovement(plantation!, 'plantation', state.turn);
    raiseImprovement(farm!, 'farm', state.turn);
    bumpRevision(state);
    slot(state, 0, 'layOfferings');
    for (const tile of [pasture!, camp!, plantation!]) {
      expect(hexPays(state, tile, 'layOfferings'), tile.improvement ?? '').toEqual({ food: 1, faith: 1 });
    }
    expect(hexPays(state, farm!, 'layOfferings')).toEqual({ food: 0, faith: 0 });
    expect(hexPays(state, wild!, 'layOfferings')).toEqual({ food: 0, faith: 0 });
    // One hex line, and no happiness: Pastoral Shrines' clause left with its row.
    expect(orderDef('layOfferings' as OrderId).effects).toEqual([
      {
        kind: 'pays',
        where: 'hex',
        faith: 1,
        food: 1,
        on: { test: 'anyImprovement', improvements: ['pasture', 'camp', 'plantation'] },
      },
    ]);
  });

  it('The Settled Faith pays devout towns +15% science and culture, and no other town', () => {
    const state = bareState(16, 10);
    const devout = town(state, 0, 3, 5, 4);
    const other = town(state, 0, 11, 5, 4);
    holyCity(state, devout);
    slot(state, 0, 'theSettledFaith');
    for (const voice of ['science', 'culture']) {
      expect(townPercent(state, devout, 'theSettledFaith', voice), voice).toBe(15);
      expect(townPercent(state, other, 'theSettledFaith', voice), voice).toBe(0);
    }
    // No Temple and no rite are needed, and the happiness line is gone.
    expect(townPays(state, devout, 'theSettledFaith', 'happiness')).toBe(0);
    const kinds = orderDef('theSettledFaith' as OrderId).effects.map((effect) => effect.kind);
    expect(kinds).toEqual(['percentYields', 'percentYields', 'pressureRule']);
    // The proclamation half stays a flat 15 less, 25% of the base lump (reading 38).
    expect(orderDef('theSettledFaith' as OrderId).effects[2]).toEqual({
      kind: 'pressureRule',
      rule: 'bombLump',
      delta: -15,
    });
    expect(words('theSettledFaith')[2]).toBe('a proclamation presses 15 faith less');
  });

  it('The Settled Faith pays nothing in a town whose religion its owner is not paid by', () => {
    const state = bareState(16, 10);
    const mine = town(state, 0, 3, 5, 4);
    const theirs = town(state, 1, 11, 5, 4);
    const foreign = holyCity(state, theirs);
    // Seat 0's town follows seat 1's religion: it is not devout.
    convert(state, mine, foreign);
    slot(state, 0, 'theSettledFaith');
    expect(townPercent(state, mine, 'theSettledFaith', 'science')).toBe(0);
  });
});

describe('Devotion batch DV1: the commissions', () => {
  it('The Mission sits at Tier II and pays a free Apostle and 300 culture', () => {
    const def = orderDef('theMission' as OrderId);
    expect(def.band).toBe(2);
    const state = bareState(16, 10);
    const capital = town(state, 0, 3, 5, 4);
    holyCity(state, capital);
    slot(state, 0, 'theMission');
    withGoals('theMission', HALF_THE_WORLD, () => {
      const reports = runCommissions(state);
      expect(reports.map((report) => report.card)).toEqual(['theMission']);
      // The report says what was paid. The culture itself may open a draft
      // and be spent at once, so the pool is not the place to read it.
      expect(reports[0]!.lines).toContain('+300 culture');
    });
    expect(state.units.filter((unit) => unit.ownerId === 0 && unit.type === 'apostle')).toHaveLength(1);
    expect(seated(state, 'theMission')).toBe(false);
  });

  it('The Conversion of Kings sits at Tier III and pays a free Prophet and 500 culture', () => {
    const def = orderDef('theConversionOfKings' as OrderId);
    expect(def.band).toBe(3);
    // The goal is unchanged: a rival's capital follows your religion.
    expect(def.commission!.goals).toEqual([{ kind: 'reached', figure: 'rivalCapitalsFollowing', count: 1 }]);
    const state = bareState(16, 10);
    const capital = town(state, 0, 3, 5, 4);
    holyCity(state, capital);
    slot(state, 0, 'theConversionOfKings');
    withGoals('theConversionOfKings', HALF_THE_WORLD, () => {
      const reports = runCommissions(state);
      expect(reports.map((report) => report.card)).toEqual(['theConversionOfKings']);
      // The report says what was paid. The culture itself may open a draft
      // and be spent at once, so the pool is not the place to read it.
      expect(reports[0]!.lines).toContain('+500 culture');
    });
    expect(state.units.filter((unit) => unit.ownerId === 0 && unit.type === 'prophet')).toHaveLength(1);
  });

  it('The Great Commission leaves +3 faith and +3 culture in devout towns, and no faith at once', () => {
    const state = bareState(20, 10);
    const capital = town(state, 0, 3, 5, 4);
    const second = town(state, 0, 10, 5, 4);
    const quiet = town(state, 0, 16, 5, 4);
    const religion = holyCity(state, capital);
    convert(state, second, religion);
    // The goal is unchanged: more than half the world's towns follow you.
    expect(orderDef('theGreatCommission' as OrderId).commission!.goals).toEqual(HALF_THE_WORLD);
    slot(state, 0, 'theGreatCommission');
    const player = playerById(state, 0)!;
    const faith = player.faithPool;
    // Two of three towns follow: 66%, so the goal is met as written.
    expect(runCommissions(state).map((report) => report.card)).toEqual(['theGreatCommission']);
    bumpRevision(state);
    expect(commissionFulfilledTurn(player.statecraft, 'theGreatCommission' as OrderId)).toBe(state.turn);
    expect(seated(state, 'theGreatCommission')).toBe(false);
    // No 500 faith at once (reading 6).
    expect(player.faithPool).toBe(faith);
    // The institution pays the devout towns and not the town that follows nothing.
    for (const city of [capital, second]) {
      expect(townPays(state, city, 'theGreatCommission', 'faith'), city.name).toBe(3);
      expect(townPays(state, city, 'theGreatCommission', 'culture'), city.name).toBe(3);
    }
    expect(townPays(state, quiet, 'theGreatCommission', 'faith')).toBe(0);
    // It lasts: a town that turns later is paid too.
    convert(state, quiet, religion);
    expect(townPays(state, quiet, 'theGreatCommission', 'culture')).toBe(3);
    // Batch DV2 gave the scope its word, "devout" (feature E).
    expect(words('theGreatCommission')[1]).toBe(
      'Reward: for the rest of the game, +3 culture, +3 faith in every devout city',
    );
  });
});

describe('Devotion batch DV1: tiers, retirements and moves', () => {
  it('moves six cards to their new tiers', () => {
    const bands: Record<string, number> = {
      theSecondProphet: 2,
      theLivingHymnal: 2,
      theMission: 2,
      theConversionOfKings: 3,
      thePiousMasons: 3,
      sacredCommissions: 2,
    };
    for (const [id, band] of Object.entries(bands)) expect(orderDef(id as OrderId).band, id).toBe(band);
  });

  it('gives The Interdict its new text', () => {
    const def = orderDef('theInterdict' as OrderId);
    expect(def.text).toBe("A rival's town that follows your religion adds no production toward a Magnum Opus.");
    expect([def.band, def.rarity]).toEqual([4, 'rare']);
    // Batch DV7 built it: one rule, read at the Opus gate, and it is dealt.
    // `devotionHolySites.test.ts` plays it.
    expect(def.effects).toEqual([{ kind: 'rule', rule: 'opusInterdict' }]);
    expect(orderIsDealt('theInterdict' as OrderId)).toBe(true);
    // Player prose with no figure and no identifier in it (rule 7).
    for (const sentence of [...(def.deferred ?? []), def.note ?? '']) {
      expect(sentence).not.toMatch(/[0-9]/);
      expect(sentence).not.toMatch(/[a-z][A-Z]/);
    }
  });

  it('retires the four rows the themes pass cut, with no type, and deals none of them', () => {
    const cut = ['pastoralShrines', 'theConsolation', 'theAlmsRoads', 'consecratedGround'] as OrderId[];
    const pool = ordersForDecks(['devotion']);
    for (const id of cut) {
      expect(DECK_FILE_ORDERS.devotion, id).toContain(id);
      expect(orderDef(id).retired, id).toBe(true);
      expect(orderDef(id).type, id).toBeUndefined();
      expect(orderIsDealt(id), id).toBe(false);
      expect(pool, id).not.toContain(id);
    }
    // A save that holds one keeps it with its effects (reading 7).
    expect(orderDef('pastoralShrines' as OrderId).effects.length).toBeGreaterThan(0);
    expect(orderDef('theAlmsRoads' as OrderId).effects.length).toBeGreaterThan(0);
  });

  it('moves seven rows to the shared file, with their ids, texts and tiers, and deals each to both decks', () => {
    const moved: Record<string, [string[], number]> = {
      theHolySpring: [['expansionist', 'devotion'], 0],
      theSpiritsOfPlace: [['expansionist', 'devotion'], 0],
      thePriestAstronomers: [['devotion', 'scientific'], 1],
      theMonasticUniversity: [['devotion', 'scientific'], 3],
      thePaintedChapels: [['devotion', 'magisterial'], 1],
      theFestivalCalendar: [['devotion', 'magisterial'], 2],
      thePenitentsRoll: [['devotion', 'magisterial'], 2],
    };
    for (const [id, [decks, band]] of Object.entries(moved)) {
      const def = orderDef(id as OrderId);
      expect(DECK_FILE_ORDERS.common, id).toContain(id);
      expect(DECK_FILE_ORDERS.devotion, id).not.toContain(id);
      expect(DECK_FILE_ORDERS.expansionist, id).not.toContain(id);
      expect(def.decks, id).toEqual(decks);
      expect(def.type, id).toBe('civic');
      expect(def.band, id).toBe(band);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      for (const deck of decks) expect(ordersForDecks([deck as never]), `${id} for ${deck}`).toContain(id);
    }
    // The Ambarvalia keeps the id of The Spirits of Place.
    expect(orderDef('theSpiritsOfPlace' as OrderId).name).toBe('The Ambarvalia');
  });

  it('types the two shared Magisterial rows, and Sacred Patronage keeps its second clause', () => {
    expect(orderDef('sacredCommissions' as OrderId).type).toBe('economic');
    const patronage = orderDef('sacredPatronage' as OrderId);
    expect(patronage.type).toBe('civic');
    // Dealt since Magisterial batch MG8, which built the moment a great
    // person is spent (`test/sim/decks/magisterialPatrons.test.ts`).
    expect(orderIsDealt('sacredPatronage' as OrderId)).toBe(true);
    expect(patronage.text).toContain('Spending a great person grants 30 faith, at most once per turn.');
  });
});

// --- batch DV2 ---------------------------------------------------------------

/** What one card's lines pay on one hex, as seat 0 sees it: faith and production. */
function hexFaithAndProduction(state: GameState, tile: Tile, card: string): { faith: number; production: number } {
  const name = orderDef(card as OrderId).name;
  const total = { faith: 0, production: 0 };
  for (const line of explainTileYield(tile, yieldContextFor(state, 0))) {
    if (!line.source.includes(name)) continue;
    total.faith += line.faith;
    total.production += line.production;
  }
  return total;
}

/** What one card pays the whole realm, in one voice. */
function empirePays(state: GameState, card: string, voice: 'faith' | 'culture'): number {
  return explainCardEmpireYields(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** Gives a town a building straight off the shelf. */
function raise(state: GameState, city: City, building: string): void {
  if (!city.buildings.includes(building as never)) city.buildings.push(building as never);
  bumpRevision(state);
  refreshCityDerived(state, city);
}

/** Seat 0's own units standing on a town's centre. */
function unitsIn(state: GameState, city: City): number {
  return state.units.filter((unit) => unit.ownerId === 0 && unit.col === city.col && unit.row === city.row).length;
}

describe('Devotion batch DV2: the new Devotion cards', () => {
  it('The Deaconries pays devout towns +1 happiness for every four citizens, with no cap', () => {
    const state = bareState(20, 10);
    const devout = town(state, 0, 3, 5, 8);
    const other = town(state, 0, 12, 5, 8);
    holyCity(state, devout);
    slot(state, 0, 'theDeaconries');
    // Happiness is the empire's meter: the line is paid for the devout town
    // alone, though both towns hold eight citizens.
    const deaconries = (): number =>
      cardHappiness(state, 0)
        .filter((line) => line.card === 'theDeaconries')
        .reduce((sum, line) => sum + line.amount, 0);
    expect(deaconries()).toBe(2);
    // No cap (reading 34): a town of 24 is paid six.
    devout.population = 24;
    convert(state, devout, 0);
    expect(deaconries()).toBe(6);
    // The other town, made devout too, adds its own two.
    convert(state, other, 0);
    expect(deaconries()).toBe(8);
  });

  it('The Lives of the Saints pays +2% science and culture for each foreign town turned, at most +30%', () => {
    const state = bareState(16, 10);
    const capital = town(state, 0, 3, 5, 4);
    const other = town(state, 0, 11, 5, 4);
    slot(state, 0, 'theLivesOfTheSaints');
    expect(townPercent(state, capital, 'theLivesOfTheSaints', 'science')).toBe(0);
    // Three foreign towns turned, each written once in the conversion record.
    for (const id of [101, 102, 103]) markFirst(state, 0, 'conversion', firstKey(id));
    // Another empire's conversions are its own.
    markFirst(state, 1, 'conversion', firstKey(104));
    bumpRevision(state);
    for (const city of [capital, other]) {
      expect(townPercent(state, city, 'theLivesOfTheSaints', 'science')).toBe(6);
      expect(townPercent(state, city, 'theLivesOfTheSaints', 'culture')).toBe(6);
    }
    // A town turned twice is written once.
    markFirst(state, 0, 'conversion', firstKey(101));
    bumpRevision(state);
    expect(townPercent(state, capital, 'theLivesOfTheSaints', 'science')).toBe(6);
    for (let id = 200; id < 220; id++) markFirst(state, 0, 'conversion', firstKey(id));
    bumpRevision(state);
    expect(townPercent(state, capital, 'theLivesOfTheSaints', 'science')).toBe(30);
    expect(townPercent(state, capital, 'theLivesOfTheSaints', 'culture')).toBe(30);
    // City-stage lines (reading 33).
    for (const line of explainCardPercentYields(state, capital).filter((l) => l.card === 'theLivesOfTheSaints')) {
      expect(line.stage).toBe('city');
    }
  });

  it('The Martyrology grows by +2 faith and +2 culture for each unit lost in battle while it is seated', () => {
    const state = bareState();
    town(state, 0, 5, 5, 4);
    // A loss before the card is seated is not counted.
    recordScalingOccasion(state, 0, 'unitLost');
    slot(state, 0, 'theMartyrology');
    expect(empirePays(state, 'theMartyrology', 'faith')).toBe(0);
    for (let n = 0; n < 3; n++) recordScalingOccasion(state, 0, 'unitLost');
    bumpRevision(state);
    expect(empirePays(state, 'theMartyrology', 'faith')).toBe(6);
    expect(empirePays(state, 'theMartyrology', 'culture')).toBe(6);
    // Another empire's losses are not this card's.
    recordScalingOccasion(state, 1, 'unitLost');
    bumpRevision(state);
    expect(empirePays(state, 'theMartyrology', 'faith')).toBe(6);
  });

  it('The Consecration Feast pays twenty times the town in science and culture for a Cathedral, and for no other building', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5, 6);
    slot(state, 0, 'theConsecrationFeast');
    const grants = (building: string, voice: string): number =>
      windfallPayout(state, 0, 'buildingCompletion', 0, 0, {
        building: building as never,
        population: city.population,
      })
        .grants.filter((grant) => grant.card === 'theConsecrationFeast' && grant.yield === voice)
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(grants('cathedral', 'science')).toBe(120);
    expect(grants('cathedral', 'culture')).toBe(120);
    expect(grants('temple', 'science')).toBe(0);
    expect(grants('library', 'culture')).toBe(0);
    // On the board, through the one completion routine. The next draft is put
    // out of reach so the pool is not spent on one.
    const player = playerById(state, 0)!;
    player.statecraft.drafts = 29;
    const culture = player.culturePool;
    realiseItem(state, city, { kind: 'building', id: 'cathedral' as never });
    expect(player.culturePool - culture).toBe(120);
    // A Cathedral bought with gold is finished through the same routine, so it
    // pays too (the row's note).
    const bought = town(state, 0, 10, 2, 3);
    const cathedral = { kind: 'building', id: 'cathedral' } as const;
    player.gold = 100_000;
    expect(purchaseError(state, 0, bought.id, cathedral, 'gold')).toBeNull();
    const before = player.culturePool;
    purchaseItemAt(state, player, bought, cathedral as never, 'gold');
    expect(player.culturePool - before).toBe(60);
  });

  it('The Pilgrim Towns pays +20% culture in a town working a holy site, and in no other town', () => {
    const state = bareState(20, 10);
    const pilgrim = town(state, 0, 4, 5, 4);
    const other = town(state, 0, 13, 5, 4);
    const site = ring(state, pilgrim)[0]!;
    raiseImprovement(site, 'holySite' as never, state.turn);
    slot(state, 0, 'thePilgrimTowns');
    // A holy site nobody works admits nothing.
    pilgrim.workedTiles = [];
    bumpRevision(state);
    expect(townPercent(state, pilgrim, 'thePilgrimTowns', 'culture')).toBe(0);
    pilgrim.workedTiles = [{ col: site.col, row: site.row }];
    bumpRevision(state);
    expect(townPercent(state, pilgrim, 'thePilgrimTowns', 'culture')).toBe(20);
    expect(townPercent(state, other, 'thePilgrimTowns', 'culture')).toBe(0);
  });

  it('The Holy Summons gives every devout town the best melee unit on a declaration of war, at most once every twenty turns', () => {
    const state = bareState(20, 10);
    const devout = town(state, 0, 3, 5, 4);
    const second = town(state, 0, 10, 5, 4);
    const other = town(state, 0, 16, 5, 4);
    const religion = holyCity(state, devout);
    convert(state, second, religion);
    slot(state, 0, 'theHolySummons');
    const player = playerById(state, 0)!;
    const declare = (): void => {
      payWindfallGrants(state, player, windfallPayout(state, 0, 'declareWar'));
      bumpRevision(state);
    };
    declare();
    expect(unitsIn(state, devout)).toBe(1);
    expect(unitsIn(state, second)).toBe(1);
    expect(unitsIn(state, other)).toBe(0);
    const raised = state.units.filter((unit) => unit.ownerId === 0);
    for (const unit of raised) {
      expect(unitDef(unit.type).modelClass, unit.type).toBe('melee');
      // A granted unit costs no upkeep (reading 32).
      expect(unit.freeUpkeep, unit.type).toBe(true);
    }
    // Fewer than twenty turns later, nothing.
    state.turn += 19;
    declare();
    expect(state.units.filter((unit) => unit.ownerId === 0)).toHaveLength(2);
    // Twenty turns after the first, again.
    state.turn += 1;
    declare();
    expect(state.units.filter((unit) => unit.ownerId === 0)).toHaveLength(4);
  });

  it('The Work of God pays +4% toward the Magnum Opus for every town keeping a rite, at most +40%', () => {
    const state = bareState(24, 10);
    const opus = town(state, 0, 3, 5, 4);
    const second = town(state, 0, 10, 5, 4);
    const third = town(state, 0, 17, 5, 4);
    slot(state, 0, 'theWorkOfGod');
    const toward = (): number =>
      cardProduction(state, opus, 'building', undefined, 'theMagnumOpus')
        .filter((line) => line.card === 'theWorkOfGod')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(toward()).toBe(0);
    const player = playerById(state, 0)!;
    const fasting = 'riteOfFasting' as RiteId;
    player.charteredRites.push(fasting);
    player.faithPool = 5000;
    for (const city of [second, third]) {
      expect(riteError(state, 0, city.id, fasting), city.name).toBeNull();
      performRiteAt(state, player, city, fasting);
    }
    bumpRevision(state);
    expect(toward()).toBe(8);
    // Toward the Opus and nothing else.
    expect(
      cardProduction(state, opus, 'building', undefined, 'granary').filter((line) => line.card === 'theWorkOfGod'),
    ).toEqual([]);
    // At most ten towns count: +40%.
    expect(orderDef('theWorkOfGod' as OrderId).effects[0]).toMatchObject({ percent: 4, max: 10 });
  });
});

describe('Devotion batch DV2: the shared cards', () => {
  it('The Shrine Guards sells melee units for faith in towns with a Shrine', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5, 4);
    const player = playerById(state, 0)!;
    player.faithPool = 5000;
    const warrior = { kind: 'unit', id: 'warrior' };
    const archer = { kind: 'unit', id: 'archer' };
    slot(state, 0, 'theShrineGuards');
    expect(purchaseError(state, 0, city.id, warrior, 'faith')).not.toBeNull();
    raise(state, city, 'shrine');
    expect(purchaseError(state, 0, city.id, warrior, 'faith')).toBeNull();
    // A ranged unit is not a melee unit.
    expect(purchaseError(state, 0, city.id, archer, 'faith')).not.toBeNull();
    expect(orderDef('theShrineGuards' as OrderId).decks).toEqual(['dominion', 'devotion']);
    expect(ordersForDecks(['dominion'])).toContain('theShrineGuards');
    expect(ordersForDecks(['devotion'])).toContain('theShrineGuards');
  });

  it('The Monastery Libraries leaves deferred: Libraries give +2 faith and Temples +2 science', () => {
    const state = bareState(20, 10);
    const library = town(state, 0, 3, 5, 4);
    const temple = town(state, 0, 12, 5, 4);
    slot(state, 0, 'theMonasteryLibraries');
    raise(state, library, 'library');
    raise(state, temple, 'temple');
    expect(townPays(state, library, 'theMonasteryLibraries', 'faith')).toBe(2);
    expect(townPays(state, library, 'theMonasteryLibraries', 'science')).toBe(0);
    expect(townPays(state, temple, 'theMonasteryLibraries', 'science')).toBe(2);
    expect(townPays(state, temple, 'theMonasteryLibraries', 'faith')).toBe(0);
    const def = orderDef('theMonasteryLibraries' as OrderId);
    expect(orderIsDealt('theMonasteryLibraries' as OrderId)).toBe(true);
    expect(def.deferred).toBeUndefined();
    expect(def.note).toBeUndefined();
  });

  it('The Blessed Forges pays improved strategic resources and Temple towns faith and production', () => {
    const state = bareState(20, 10);
    const city = town(state, 0, 5, 5, 4);
    const strategic = RESOURCE_IDS.find(
      (id) => resourceDef(id).kind === 'strategic' && improvementForResource(id) !== null,
    )!;
    expect(strategic).toBeDefined();
    const [improved, wild, mine] = ring(state, city);
    const player = playerById(state, 0)!;
    const reveal = resourceDef(strategic).requiresTech;
    if (reveal && !player.techsResearched.includes(reveal)) player.techsResearched.push(reveal);
    improved!.resource = strategic as never;
    raiseImprovement(improved!, improvementForResource(strategic)!, state.turn);
    // The same resource with nothing built on it, and a mine on bare ground.
    wild!.resource = strategic as never;
    raiseImprovement(mine!, 'mine', state.turn);
    bumpRevision(state);
    slot(state, 0, 'theBlessedForges');
    expect(hexFaithAndProduction(state, improved!, 'theBlessedForges')).toEqual({ faith: 1, production: 1 });
    expect(hexFaithAndProduction(state, wild!, 'theBlessedForges')).toEqual({ faith: 0, production: 0 });
    expect(hexFaithAndProduction(state, mine!, 'theBlessedForges')).toEqual({ faith: 0, production: 0 });
    expect(townPays(state, city, 'theBlessedForges', 'faith')).toBe(0);
    raise(state, city, 'temple');
    expect(townPays(state, city, 'theBlessedForges', 'faith')).toBe(2);
    expect(townPays(state, city, 'theBlessedForges', 'production')).toBe(2);
  });

  it('The Schoolmen’s Charter opens Scholasticism, which opens the Cathedral and the Apostle before Theology', () => {
    const charter = orderDef('theSchoolmensCharter' as OrderId);
    expect(charter.decks).toEqual(['devotion', 'scientific']);
    expect([charter.band, charter.rarity, charter.type]).toEqual([1, 'uncommon', 'civic']);
    expect(charter.charter?.unlocks.tech).toBe('scholasticism');
    expect(charter.effects).toEqual([]);
    expect(orderIsDealt('theSchoolmensCharter' as OrderId)).toBe(true);
    // The placeholder place (reading 24): Æra III, after The High Temple, on
    // the lane under Medicine, at the column's price.
    const tech = techDef('scholasticism');
    expect([tech.age, tech.row, tech.charter, tech.prereqs]).toEqual([3, 1, true, ['theHighTemple']]);
    expect(tech.cost).toBe(techDef('medicine').cost);
    // The Apostle's half is the second effect and the Apostle's marker: the
    // lines to remove if question 1 is answered the other way.
    expect(tech.effects).toEqual([
      { kind: 'unlocksBuilding', building: 'cathedral' },
      { kind: 'unlocksUnit', unit: 'apostle' },
    ]);

    const state = bareState();
    const city = town(state, 0, 5, 5, 4);
    const player = playerById(state, 0)!;
    player.techsResearched = player.techsResearched.filter((id) => id !== 'theology');
    player.faithPool = 100_000;
    bumpRevision(state);
    const apostle = { kind: 'unit', id: 'apostle' };
    expect(researchError(state, 0, 'scholasticism')).toMatch(/charter/);
    expect(isUnlocked(state, 0, 'building', 'cathedral', city)).toBe(false);
    expect(isUnlocked(state, 0, 'unit', 'apostle')).toBe(false);
    expect(purchaseError(state, 0, city.id, apostle, 'faith')).toBe('Apostles need Theology');
    // Drafted: the technology may be researched. Known: both rows open.
    player.charteredTechs.push('scholasticism');
    expect(researchError(state, 0, 'scholasticism')).toBeNull();
    player.techsResearched.push('scholasticism');
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', 'cathedral', city)).toBe(true);
    expect(isUnlocked(state, 0, 'unit', 'apostle')).toBe(true);
    expect(purchaseError(state, 0, city.id, apostle, 'faith')).toBeNull();
    // The other seat, with neither, waits for Theology.
    const rival = playerById(state, 1)!;
    rival.techsResearched = rival.techsResearched.filter((id) => id !== 'theology');
    bumpRevision(state);
    expect(isUnlocked(state, 1, 'unit', 'apostle')).toBe(false);
    expect(isUnlocked(state, 1, 'building', 'cathedral')).toBe(false);
    // Theology still opens both for everybody.
    rival.techsResearched.push('theology');
    bumpRevision(state);
    expect(isUnlocked(state, 1, 'unit', 'apostle')).toBe(true);
    expect(isUnlocked(state, 1, 'building', 'cathedral')).toBe(true);
  });

  it('prints The Schoolmen’s Charter’s gifts with the node that opens them for everyone', () => {
    const said = words('theSchoolmensCharter');
    expect(said[0]).toBe(
      'once drafted, opens Scholasticism for you to research; only an empire holding this charter may research it; this card takes no chair',
    );
    expect(said[1]).toMatch(/^once you know Scholasticism, you may build the Cathedral before Theology: /);
    expect(said[2]).toBe('once you know Scholasticism, you may call the Apostle with faith before Theology');
    expect(said).toHaveLength(3);
  });
});

describe('Devotion batch DV2: the word "devout" (feature E)', () => {
  it('prints a town that follows its owner’s religion as devout, and the other half in full', () => {
    expect(words('theSettledFaith').slice(0, 2)).toEqual([
      '+15% science in every devout city',
      '+15% culture in every devout city',
    ]);
    expect(words('theDeaconries')).toEqual(['+1 happiness in every devout city per 4 citizens there']);
    // Convert It or Tax It (shared with Dominion) keeps its text; only its
    // printed clause changes (reading 2).
    expect(words('convertItOrTaxIt')).toEqual([
      '+5 gold, +3 faith in every captured city that does not follow your religion',
      'the authority a captured devout city costs falls by 1',
    ]);
  });

  it('says what a devout town is on the Compendium’s faith page', () => {
    const faith = CONCEPT_ENTRIES.find((entry) => entry.id === 'concept:religion')!;
    const prose = faith.clauses.map((clause) => clause.text).join(' ');
    expect(prose).toContain('A devout town is one of your own towns that follows a religion whose holy city you hold.');
    expect(prose).toContain('never devout');
  });
});
