/**
 * **Batch G1: the twelve governments** (the user's ruling of 2026-11-10,
 * `docs/flags.md` (hhhhhhh); the spec is
 * `docs/plans/deck-simplification-2026-11-10.md`, "Governments").
 *
 * What this file pins:
 *
 *   1. the offer: three governments at each tier, the Aristocracy in place of
 *      the retired Theocracy, and six chairs at tier 10;
 *   2. the re-seating of a council of five into the six chairs of tier 10;
 *   3. the tier-26 shape (`cardTypeAmplifier`): the rounding rule, and each
 *      reader it reaches, as a labelled line of its own;
 *   4. the Aristocracy's cut on the price of a great person (`greatPersonCost`);
 *   5. the bots' price of the tier-26 shape.
 *
 * The data rows' words are pinned in `test/sim/statecraft.test.ts` and the
 * master list's table in `test/sim/statecraftDocSync.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { scoreEffects } from '../../src/ai/value';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { renownThreshold } from '../../src/sim/renown';
import { type City, type GameState, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import {
  cardCityStat,
  cardCombatLines,
  cardProduction,
  cardRouteShareLines,
  cardRouteYieldLines,
  cardTileLines,
  cardTypeRaise,
  cardTypeRaises,
  explainCardCityYields,
  explainCardPercentYields,
  runPeriodicBoons,
  windfallPayout,
} from '../../src/sim/statecraft';
import {
  type CardEffect,
  type ChairType,
  type GovernmentId,
  type OrderId,
  bandTierAt,
  chairsAtTier,
  governmentDef,
  governmentsAtTier,
  orderDef,
  slotCount,
  slotLayout,
} from '../../src/sim/statecraftData';
import { explainCity } from '../../src/sim/yields/town';
import { at, bareState } from './improvementHelpers';

const GRAIN_TRIBUTE = 'theGrainTribute' as OrderId;
const PRYTANEION = 'thePrytaneion' as OrderId;
const SMALLHOLDINGS = 'smallholdings' as OrderId;
const PATRONAGE = 'privatePatronage' as OrderId;
const SPEAR_MAKERS = 'theSpearMakers' as OrderId;
const BLOODED_SPEARS = 'dominionBloodedSpears' as OrderId;
const RITES_OF_PASSAGE = 'commonRitesOfPassage' as OrderId;
const SCHOLARS_ROADS = 'theScholarsRoads' as OrderId;
const CEREMONIAL_GUARD = 'theCeremonialGuard' as OrderId;

/** One town of three citizens for seat 0, with an empty queue. */
function town(state: GameState): City {
  const city = foundCityAt(state, 0, at(state, 5, 5));
  city.population = 3;
  city.largestSize = 3;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * Lays out a government's council for seat 0 and seats each card in the first
 * free chair of the type named beside it.
 */
function council(state: GameState, government: GovernmentId, cards: readonly [OrderId, ChairType][]): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.government = government;
  const layout = slotLayout(government);
  sc.slots = layout.map(() => null);
  for (const [card, chair] of cards) {
    const index = layout.findIndex((type, at) => type === chair && sc.slots[at] === null);
    expect(index, `a free ${chair} chair for ${card}`).toBeGreaterThanOrEqual(0);
    if (!sc.orders.includes(card)) sc.orders.push(card);
    sc.slots[index] = { card, sealedUntil: 0 };
  }
  bumpRevision(state);
}

/** A bare board with one town for seat 0. */
function board(): { state: GameState; city: City } {
  const state = bareState(20, 10);
  return { state, city: town(state) };
}

// --- 1. the offer -----------------------------------------------------------------

describe('the governments offered', () => {
  it('offers three at each tier, with the Aristocracy in place of the retired Theocracy', () => {
    expect(governmentsAtTier(4)).toEqual(['councilOfElders', 'warChief', 'priestKing']);
    expect(governmentsAtTier(10)).toEqual(['republic', 'tyranny', 'aristocracy']);
    expect(governmentsAtTier(18)).toEqual(['merchantLeague', 'imperium', 'divineMandate']);
    expect(governmentsAtTier(26)).toEqual(['theEstates', 'theSultanate', 'theCuria']);
    // Retired as the tier-38 rows were: kept, and offered to nobody.
    const theocracy = governmentDef('theocracy' as GovernmentId);
    expect(theocracy.retired).toBe(true);
    expect(theocracy.tier).toBe(10);
  });

  it('gives each tier-10 government six chairs, and opens Tier II at the tenth draft', () => {
    expect(chairsAtTier(10)).toBe(6);
    for (const id of governmentsAtTier(10)) expect(slotCount(id), id).toBe(6);
    expect(bandTierAt(9)).toBe(1);
    expect(bandTierAt(10)).toBe(2);
  });

  it('re-seats a council of five into the six chairs of tier 10, keeping every chair it can', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    const sc = player.statecraft;
    // The Council of Elders (M, E, E, C, W) becomes the Republic (M, E, E, E, C, W).
    expect(slotLayout('councilOfElders')).toEqual(['military', 'economic', 'economic', 'civic', 'wildcard']);
    expect(slotLayout('republic')).toEqual(['military', 'economic', 'economic', 'economic', 'civic', 'wildcard']);
    const soldier = BLOODED_SPEARS;
    const priest = RITES_OF_PASSAGE;
    const wild = 'theGrandVizier' as OrderId;
    expect([orderDef(soldier).type, orderDef(priest).type, orderDef(wild).type]).toEqual([
      'military',
      'civic',
      'wildcard',
    ]);
    council(state, 'councilOfElders', [
      [soldier, 'military'],
      [GRAIN_TRIBUTE, 'economic'],
      [PRYTANEION, 'economic'],
      [priest, 'civic'],
      [wild, 'wildcard'],
    ]);
    sc.pendingGovernment = { tier: 10, options: ['republic'] };
    expect(applyCommand(state, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 }).ok).toBe(true);
    // The first three chairs keep their cards. The fourth is an Economic chair
    // now, so the civic card moves to the Civic chair, and the Wildcard card
    // to the Wildcard chair.
    expect(sc.slots.map((slot) => slot?.card ?? null)).toEqual([
      soldier,
      GRAIN_TRIBUTE,
      PRYTANEION,
      null,
      priest,
      wild,
    ]);
  });
});

// --- 2. the tier-26 shape ----------------------------------------------------------

describe('the card-type amplifier (the tier-26 governments)', () => {
  it('rounds each rise to the nearest whole number, and never less than one', () => {
    // The spec's worked cases at 30%.
    expect(cardTypeRaise(1, 30)).toBe(1);
    expect(cardTypeRaise(2, 30)).toBe(1);
    expect(cardTypeRaise(4, 30)).toBe(1);
    expect(cardTypeRaise(5, 30)).toBe(2);
    expect(cardTypeRaise(10, 30)).toBe(3);
    expect(cardTypeRaise(40, 30)).toBe(12);
    // Nothing for nought, for a cost, or below one where rounding gives nothing.
    expect(cardTypeRaise(0, 30)).toBe(0);
    expect(cardTypeRaise(-2, 30)).toBe(0);
    expect(cardTypeRaise(0.5, 30)).toBe(0);
    expect(cardTypeRaise(10, 0)).toBe(0);
  });

  it('raises a seated card’s town line as a line of its own, and the town’s total moves with the list', () => {
    const { state, city } = board();
    council(state, 'theEstates', [[GRAIN_TRIBUTE, 'economic']]);
    const lines = explainCardCityYields(state, city).filter((line) => line.card === 'theEstates');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.source).toBe('Government · The Estates · The Grain Tribute');
    expect([lines[0]!.food, lines[0]!.production]).toEqual([1, 1]);
    const raised = explainCity(state, city).flats;
    // The Curia has an Economic chair at the same place and raises Civic cards
    // only, so the difference is the rise and nothing else.
    expect(slotLayout('theCuria').indexOf('economic')).toBe(slotLayout('theEstates').indexOf('economic'));
    council(state, 'theCuria', [[GRAIN_TRIBUTE, 'economic']]);
    expect(explainCardCityYields(state, city).some((line) => line.card === 'theCuria')).toBe(false);
    const plain = explainCity(state, city).flats;
    expect(raised.food - plain.food).toBe(1);
    expect(raised.production - plain.production).toBe(1);
  });

  it('takes the rise of each line, not of each helping of a count', () => {
    const { state, city } = board();
    // The Prytaneion pays +1 food for each seated card. Four are seated, so its
    // line is 4 food, and 30% of 4 rounds to 1.
    council(state, 'theEstates', [
      [PRYTANEION, 'economic'],
      [GRAIN_TRIBUTE, 'economic'],
      [BLOODED_SPEARS, 'military'],
      [RITES_OF_PASSAGE, 'civic'],
    ]);
    const own = explainCardCityYields(state, city).find((line) => line.card === PRYTANEION)!;
    expect(own.food).toBe(4);
    const rise = explainCardCityYields(state, city).find(
      (line) => line.source === 'Government · The Estates · The Prytaneion',
    )!;
    expect(rise.food).toBe(1);
  });

  it('raises only the seated cards of its own type', () => {
    const { state, city } = board();
    council(state, 'theSultanate', [[GRAIN_TRIBUTE, 'economic']]);
    expect(cardTypeRaises(state, 0).size).toBe(0);
    expect(explainCardCityYields(state, city).some((line) => line.card === 'theSultanate')).toBe(false);
    // Held and not seated is not raised either.
    council(state, 'theEstates', []);
    expect(playerById(state, 0)!.statecraft.orders).toContain(GRAIN_TRIBUTE);
    expect(cardTypeRaises(state, 0).has(GRAIN_TRIBUTE)).toBe(false);
  });

  it('raises a hex line on the same ground', () => {
    const { state } = board();
    council(state, 'theEstates', [[SMALLHOLDINGS, 'economic']]);
    const lines = cardTileLines(state, 0);
    const own = lines.find((line) => line.card === SMALLHOLDINGS)!;
    const rise = lines.find((line) => line.card === 'theEstates')!;
    expect(rise.on).toEqual(own.on);
    expect([rise.food, rise.gold]).toEqual([1, 1]);
  });

  it('raises a percentage at its own stage, and leaves a cost as it is', () => {
    const { state, city } = board();
    // Private Patronage: +40% gold, and 20% less production toward ordinary
    // buildings, which is a cost and is not raised.
    council(state, 'theEstates', [[PATRONAGE, 'economic']]);
    const rises = explainCardPercentYields(state, city).filter((line) => line.card === 'theEstates');
    expect(rises.map((line) => [line.yield, line.percent, line.stage])).toEqual([['gold', 12, 'city']]);
    expect(
      cardProduction(state, city, 'building', undefined, 'monument').filter((line) => line.card === 'theEstates'),
    ).toEqual([]);
  });

  it('raises a production bonus behind a build', () => {
    const { state, city } = board();
    council(state, 'theSultanate', [[SPEAR_MAKERS, 'military']]);
    const lines = cardProduction(state, city, 'unit', 'warrior');
    expect(lines.find((line) => line.card === SPEAR_MAKERS)!.percent).toBe(30);
    expect(lines.find((line) => line.card === 'theSultanate')!.percent).toBe(9);
  });

  it('raises strength in a fight, line by line', () => {
    const { state } = board();
    council(state, 'theSultanate', [[BLOODED_SPEARS, 'military']]);
    const unit = createUnit(state, 0, 'warrior', 6, 5);
    const lines = cardCombatLines(state, {
      unit,
      side: 'attack',
      tile: at(state, 7, 5),
      vsBarbarians: false,
      vsCity: false,
      targetHp: 100,
      targetMaxHp: 100,
    });
    // The Blooded Spears' +2 against anyone, and its rise of 1. The line
    // against barbarians does not fire here, so it has no rise either.
    expect(lines.filter((line) => line.card === BLOODED_SPEARS).map((line) => line.amount)).toEqual([2]);
    expect(lines.filter((line) => line.card === 'theSultanate').map((line) => line.amount)).toEqual([1]);
  });

  it('raises a town’s defence, which is strength, and not its sight', () => {
    const { state, city } = board();
    // The Ceremonial Guard: +5 defence in a town with a wonder. 30% of 5 is
    // 1.5, which rounds to 2.
    council(state, 'theSultanate', [[CEREMONIAL_GUARD, 'military']]);
    city.buildings.push('stonehenge');
    bumpRevision(state);
    const lines = cardCityStat(state, city, 'defense');
    expect(lines.map((line) => [line.card, line.amount])).toEqual([
      [CEREMONIAL_GUARD, 5],
      ['theSultanate', 2],
    ]);
    expect(cardCityStat(state, city, 'sight').some((line) => line.card === 'theSultanate')).toBe(false);
  });

  it('raises a trade route’s line and its share', () => {
    const { state, city } = board();
    const far = foundCityAt(state, 0, at(state, 12, 5));
    bumpRevision(state);
    // The Scholars' Roads: +2 science and +2 culture on every route, and half
    // again of the science and culture a route carries.
    council(state, 'theCuria', [[SCHOLARS_ROADS, 'civic']]);
    const lines = cardRouteYieldLines(state, city, far).filter((line) => line.card === 'theCuria');
    expect(lines.map((line) => [line.science, line.culture])).toEqual([[1, 1]]);
    const shares = cardRouteShareLines(state, city, far).filter((line) => line.card === 'theCuria');
    expect(shares.map((line) => [line.yield, line.percent])).toEqual([
      ['science', 15],
      ['culture', 15],
    ]);
  });

  it('raises the yield a one-time reward grants, as a grant of its own', () => {
    const { state } = board();
    // Common Rites of Passage: +12 faith each time a military unit is
    // completed. 30% of 12 is 3.6, which rounds to 4.
    council(state, 'theCuria', [[RITES_OF_PASSAGE, 'civic']]);
    const payout = windfallPayout(state, 0, 'unitCompletion', 0, 0, { actor: 'warrior' });
    expect(payout.grants.map((grant) => [grant.card, grant.yield, grant.amount])).toEqual([
      [RITES_OF_PASSAGE, 'faith', 12],
      ['theCuria', 'faith', 4],
    ]);
  });
});

describe('the card-type amplifier on a periodic boon', () => {
  it('pays the rise of the boon’s own figure, as a grant of its own', () => {
    // No live Civic card pays a flat boon, so one is lent to Common Rites of
    // Passage for the length of this test and handed straight back.
    const def = orderDef(RITES_OF_PASSAGE) as { effects: readonly CardEffect[] };
    const held = def.effects;
    def.effects = [{ kind: 'periodic', everyTurns: 5, pays: 'gold', amount: 10 }];
    try {
      const { state } = board();
      const player = playerById(state, 0)!;
      council(state, 'theCuria', [[RITES_OF_PASSAGE, 'civic']]);
      state.turn = 1;
      runPeriodicBoons(state);
      const gold = player.gold;
      state.turn = 6;
      runPeriodicBoons(state);
      // 10, and 30% of 10.
      expect(player.gold - gold).toBe(13);
    } finally {
      def.effects = held;
    }
  });
});

// --- 3. the Aristocracy ---------------------------------------------------------------

describe('the Aristocracy', () => {
  it('cuts the price of the next great person by 15%, rounded down once', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    const full = renownThreshold(state, player);
    player.statecraft.government = 'aristocracy';
    bumpRevision(state);
    expect(renownThreshold(state, player)).toBe(Math.floor((full * 85) / 100));
  });
});

// --- 4. the bots ------------------------------------------------------------------------

describe('the bots’ price of the tier-26 shape', () => {
  it('is nothing with no seated card of the type, and a share of that card with one', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    const sultanate = governmentDef('theSultanate').effects;
    council(state, 'theEstates', []);
    expect(scoreEffects(sultanate, valueContext(state, player))).toBe(0);
    council(state, 'theEstates', [[BLOODED_SPEARS, 'military']]);
    const ctx = valueContext(state, player);
    const card = scoreEffects(orderDef(BLOODED_SPEARS).effects, ctx);
    expect(card).toBeGreaterThan(0);
    expect(scoreEffects(sultanate, ctx)).toBeCloseTo(card * 0.3, 8);
  });
});
