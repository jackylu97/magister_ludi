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
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { runCommissions } from '../../../src/sim/commissions';
import { type Tile, getTileAt, raiseImprovement } from '../../../src/sim/map';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
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
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
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
function townPays(state: GameState, city: City, card: string, voice: 'faith' | 'culture' | 'happiness'): number {
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
    expect(words('theGreatCommission')[1]).toBe(
      'Reward: for the rest of the game, +3 culture, +3 faith in every city that follows your religion',
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

  it('gives The Interdict its new text, and deals it to nobody', () => {
    const def = orderDef('theInterdict' as OrderId);
    expect(def.text).toBe("A rival's town that follows your religion adds no production toward a Magnum Opus.");
    expect([def.band, def.rarity]).toEqual([4, 'rare']);
    expect(def.effects).toEqual([]);
    expect(orderIsDealt('theInterdict' as OrderId)).toBe(false);
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
    expect(orderIsDealt('sacredPatronage' as OrderId)).toBe(false);
    expect(patronage.text).toContain('Spending a great person grants 30 faith, at most once per turn.');
  });
});
