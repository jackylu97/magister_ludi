/**
 * **Devotion's Doctrines** (`docs/plans/doctrines-build-triage.md`): batch DT4's
 * three that need no new shape, and batch DT5's five that need only the offer's gate.
 * `devotion.test.ts` holds the rows to the sheet. This file checks that each row pays
 * what its text says, in a real fold. None of these rows has a drawback, so each also
 * has a test that it pays nothing where its text does not reach. The gate itself is
 * checked in `doctrineOffer.test.ts`.
 *
 * Batch DT6 adds The Paean. Batch DT7 adds Canossa. Batch DT8 adds The Capitulary of
 * Herstal. Batch DT9 adds The Serapeum. Batch DT14 adds The Ribats. Batch DT15 adds
 * The Seven Councils, The House of Worship and The Apostolic Camera, the last three.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { scoreEffects, valueOfYields } from '../../../src/ai/value';
import { explainCardImpact, foldCardImpact } from '../../../src/sim/cardImpact';
import {
  cityAt,
  explainGrowthPercent,
  foldGrowthPercent,
  foundCityAt,
  growthSurplus,
  payGrants,
  realiseItem,
  refreshCityDerived,
  settleProduction,
} from '../../../src/sim/cities';
import { previewCombat } from '../../../src/sim/combat';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { declareWarError } from '../../../src/sim/diplomacy';
import { raiseImprovement } from '../../../src/sim/map';
import { explainAuthority, explainFoundingCost, explainHappiness } from '../../../src/sim/meters';
import { type PurchaseSubject, explainPurchaseCost, purchaseError } from '../../../src/sim/purchase';
import {
  availableRites,
  cityRite,
  empireRiteAt,
  gainBeliefError,
  nextBeliefPool,
  pantheonSlots,
  performRiteAt,
  poolSlots,
  poolSlotsFor,
  religionBeliefPool,
  riteCostAhead,
  riteCostFor,
  riteOfferingHammers,
  ritesAffordable,
} from '../../../src/sim/religion';
import {
  BELIEF_IDS,
  type BeliefId,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  type RiteId,
  beliefDef,
} from '../../../src/sim/religionData';
import {
  type City,
  type GameState,
  type Player,
  type Religion,
  type Unit,
  addBuilding,
  bumpRevision,
  cityReligion,
  createUnit,
  playerById,
  spendFaith,
} from '../../../src/sim/state';
import { describeCard, doctrineBagFor, stripRefs } from '../../../src/sim/statecraft';
import {
  cardCombatLines,
  cardPeriodicOffers,
  cardProduction,
  cardRulePercent,
  effectsOfKind,
  explainCardCityYields,
  explainCardPercentYields,
  cityScopeAdmits,
  explainFollowerLinesAbroad,
  heldReligions,
  liveEffects,
  townHoldsBuilding,
  windfallPayout,
} from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
  type CityScope,
  type DoctrineId,
  type OrderId,
  DECK_FILE_DOCTRINES,
  doctrineDef,
  orderDef,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { buildError, upgradeUnits } from '../../../src/sim/tech';
import { unitStampStrength } from '../../../src/sim/unitData';
import { atWar, openWar } from '../../../src/sim/wars';
import {
  collectYields,
  explainEmpireCardYields,
  explainEmpireLines,
  foldEmpireLines,
  foldEmpireRates,
} from '../../../src/sim/yields/empire';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { explainCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';
import { lendDoctrineEffects } from '../statecraftHelpers';

/** The rows built so far in this deck, each with the band its table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['theTheoricFund', 1],
  ['theRitesOfZhou', 1],
  ['theSerapeum', 1],
  ['thePaean', 1],
  ['theSaintPetersIndulgence', 4],
  ['theHouseOfWorship', 4],
  ['theApostolicCamera', 4],
  ['theSevenCouncils', 2],
  ['theCapitularyOfHerstal', 2],
  ['thePatrimonyOfPeter', 2],
  ['theRibats', 2],
  ['theImarets', 3],
  ['canossa', 3],
  ['theCanonsOfTheHolySepulchre', 3],
  ['theMartyrsCrown', 3],
  ['theTwoSanctuaries', 4],
];

/** The five rows of batch DT5, each behind the gate `needsReligion`. */
const DT5_ROWS: readonly string[] = [
  'thePatrimonyOfPeter',
  'theImarets',
  'theCanonsOfTheHolySepulchre',
  'theMartyrsCrown',
  'theTwoSanctuaries',
];

/** Lent rows, put back after each test, so a failed test cannot leak one into the next. */
const lent: (() => void)[] = [];
afterEach(() => {
  while (lent.length > 0) lent.pop()!();
});

const FASTING = 'riteOfFasting' as RiteId;

function seat(state: GameState, id = 0): Player {
  return playerById(state, id)!;
}

/** Gives a seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, id: string, playerId = 0): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
}

/** Seat 0, made a Devotion seat, for a test that asks what its bag holds. */
function seatWithDevotion(state: GameState): Player {
  const player = seat(state);
  player.decks = ['devotion'];
  return player;
}

/** A town of a given size for this seat, with an empty queue. */
function town(state: GameState, col: number, row: number, population = 3, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Lets seat 0 start rites, with faith to spare. */
function faithful(state: GameState): Player {
  const player = seat(state);
  player.faithPool = 100_000;
  if (!player.charteredRites.includes(FASTING)) player.charteredRites.push(FASTING);
  bumpRevision(state);
  return player;
}

/** What one card's town lines pay a town, in one voice. */
function linePays(state: GameState, city: City, card: string, voice: 'food' | 'culture'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** What one card puts on seat 0's happiness. */
function happinessFrom(state: GameState, card: string): number {
  return explainHappiness(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.value, 0);
}

describe('Devotion’s rows', () => {
  it('deals each row at its tier, from the Devotion bag and no other', () => {
    for (const [id, band] of ROWS) {
      const def = doctrineDef(id as DoctrineId);
      expect(def.band, id).toBe(band);
      expect(def.decks, id).toEqual(['devotion']);
      expect(def.retired, id).toBeUndefined();
      expect(poolDoctrines(def.tier), id).toContain(id);
    }
    expect([...DECK_FILE_DOCTRINES.devotion].sort()).toEqual(ROWS.map(([id]) => id).sort());
  });

  it('offers a Devotion seat its rows when it adopts a tier-4 government', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true, decks: ['devotion', 'dominion'] },
        { name: 'Bors', color: '#00a', isHuman: true, decks: ['dominion', 'expansionist'] },
      ],
    });
    expect(doctrineBagFor(g.state, seat(g.state), 4)).toEqual(
      expect.arrayContaining(['theTheoricFund', 'theRitesOfZhou']),
    );
    expect(doctrineBagFor(g.state, seat(g.state, 1), 4)).not.toContain('theTheoricFund');
  });

  it('gives the bots a finite price for every row, and the impact stamp reads each one', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    town(state, 15, 5, 4);
    addBuilding(state, city, 'temple');
    const player = faithful(state);
    performRiteAt(state, player, city, FASTING);
    bumpRevision(state);
    for (const [id] of ROWS) {
      const score = scoreCard(player, id as never, valueContext(state, player));
      expect(Number.isFinite(score), id).toBe(true);
      expect(() => explainCardImpact(state, 0, { kind: 'doctrine', id: id as DoctrineId }), id).not.toThrow();
    }
  });

  it('has no drawback: no row adds an authority line, and only a rite town gains happiness', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    addBuilding(state, city, 'temple');
    bumpRevision(state);
    const before = [explainAuthority(state, 0), explainHappiness(state, 0)];
    for (const [id] of ROWS) hold(state, id);
    expect([explainAuthority(state, 0), explainHappiness(state, 0)]).toEqual(before);
  });
});

describe('The Theoric Fund', () => {
  /** What the card's empire line pays in culture. */
  const fund = (state: GameState): number =>
    explainEmpireCardYields(state, 0)
      .filter((line) => line.card === 'theTheoricFund')
      .reduce((sum, line) => sum + line.culture, 0);

  /** The faith seat 0 makes this turn. */
  const faith = (state: GameState): number => foldEmpireRates(state, 0).faithPerTurn;

  it('pays nothing at a rate below three', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    hold(state, 'theTheoricFund');
    expect(faith(state)).toBe(0);
    expect(fund(state)).toBe(0);
    addBuilding(state, city, 'temple');
    bumpRevision(state);
    expect(faith(state)).toBe(2);
    expect(fund(state)).toBe(0);
    // And no line at all, rather than a line of nought.
    expect(explainEmpireCardYields(state, 0).filter((line) => line.card === 'theTheoricFund')).toEqual([]);
  });

  it('pays +1 at three and +3 at nine, in whole helpings', () => {
    const state = bareState(30, 10);
    const first = town(state, 3, 5);
    const second = town(state, 12, 5);
    const third = town(state, 21, 5);
    hold(state, 'theTheoricFund');
    addBuilding(state, first, 'temple');
    addBuilding(state, first, 'shrine');
    bumpRevision(state);
    expect(faith(state)).toBe(3);
    expect(fund(state)).toBe(1);
    addBuilding(state, second, 'temple');
    addBuilding(state, second, 'shrine');
    addBuilding(state, third, 'temple');
    bumpRevision(state);
    expect(faith(state)).toBe(8);
    expect(fund(state)).toBe(2);
    addBuilding(state, third, 'shrine');
    bumpRevision(state);
    expect(faith(state)).toBe(9);
    expect(fund(state)).toBe(3);
  });

  it('banks the culture in the empire’s pool, and spends none of the faith', () => {
    const build = (held: boolean): GameState => {
      const state = bareState(24, 10);
      const city = town(state, 5, 5);
      addBuilding(state, city, 'temple');
      addBuilding(state, city, 'shrine');
      if (held) hold(state, 'theTheoricFund');
      bumpRevision(state);
      return state;
    };
    const without = build(false);
    const withIt = build(true);
    collectYields(without);
    collectYields(withIt);
    expect(seat(withIt).culturePool).toBe(seat(without).culturePool + 1);
    expect(seat(withIt).faithPool).toBe(seat(without).faithPool);
  });

  it('reads the seat’s own faith and no rival’s', () => {
    const state = bareState(24, 10);
    town(state, 5, 5);
    const theirs = town(state, 15, 5, 3, 1);
    addBuilding(state, theirs, 'temple');
    addBuilding(state, theirs, 'shrine');
    bumpRevision(state);
    hold(state, 'theTheoricFund');
    expect(fund(state)).toBe(0);
  });
});

describe('The Rites of Zhou', () => {
  it('gives a town keeping a rite +2 food and +2 happiness, and no other town', () => {
    const state = bareState(24, 10);
    const keeping = town(state, 5, 5);
    const plain = town(state, 15, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    expect(linePays(state, keeping, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(0);
    performRiteAt(state, player, keeping, FASTING);
    bumpRevision(state);
    expect(cityRite(state, keeping)).toBe(FASTING);
    expect(linePays(state, keeping, 'theRitesOfZhou', 'food')).toBe(2);
    expect(linePays(state, plain, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(2);
  });

  it('pays the food in the town’s own fold, and not to the empire', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const player = faithful(state);
    performRiteAt(state, player, city, FASTING);
    bumpRevision(state);
    const before = explainCity(state, city).flats.food;
    hold(state, 'theRitesOfZhou');
    expect(explainCity(state, city).flats.food).toBe(before + 2);
    expect(explainEmpireCardYields(state, 0).filter((line) => line.card === 'theRitesOfZhou')).toEqual([]);
  });

  it('pays each town that keeps a rite, so two towns give +4 happiness', () => {
    const state = bareState(24, 10);
    const first = town(state, 5, 5);
    const second = town(state, 15, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    performRiteAt(state, player, first, FASTING);
    performRiteAt(state, player, second, FASTING);
    bumpRevision(state);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(4);
  });

  it('counts a prophet’s rite over the empire in every town it reaches', () => {
    const state = bareState(30, 10);
    const first = town(state, 3, 5);
    const second = town(state, 12, 5);
    const third = town(state, 21, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    const prophet = createUnit(state, 0, 'prophet', first.col, first.row);
    bumpRevision(state);
    const done = empireRiteAt(state, player, prophet, FASTING);
    expect(done.cities).toHaveLength(3);
    bumpRevision(state);
    for (const city of [first, second, third]) expect(linePays(state, city, 'theRitesOfZhou', 'food')).toBe(2);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(6);
  });

  it('stops paying on the turn the rite runs out, by comparing the stamp', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const player = faithful(state);
    hold(state, 'theRitesOfZhou');
    performRiteAt(state, player, city, FASTING);
    bumpRevision(state);
    expect(linePays(state, city, 'theRitesOfZhou', 'food')).toBe(2);
    const last = Math.max(...(city.timed ?? []).map((effect) => effect.expiresTurn));
    state.turn = last + 1;
    bumpRevision(state);
    expect(cityRite(state, city)).toBeNull();
    expect(linePays(state, city, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(0);
  });

  it('pays no rival’s town', () => {
    const state = bareState(24, 10);
    town(state, 5, 5);
    const theirs = town(state, 15, 5, 3, 1);
    const rival = seat(state, 1);
    rival.faithPool = 100_000;
    rival.charteredRites.push(FASTING);
    bumpRevision(state);
    hold(state, 'theRitesOfZhou');
    performRiteAt(state, rival, theirs, FASTING);
    bumpRevision(state);
    expect(cityRite(state, theirs)).toBe(FASTING);
    expect(linePays(state, theirs, 'theRitesOfZhou', 'food')).toBe(0);
    expect(happinessFrom(state, 'theRitesOfZhou')).toBe(0);
  });
});

describe('The Saint Peter’s Indulgence', () => {
  /** The percent the card puts on a town's row. */
  const toward = (state: GameState, city: City, id: string): number =>
    cardProduction(state, city, 'building', undefined, id as never)
      .filter((line) => line.card === 'theSaintPetersIndulgence')
      .reduce((sum, line) => sum + line.percent, 0);

  function board(): { state: GameState; city: City; player: Player } {
    const state = bareState();
    const city = town(state, 5, 5);
    const player = seat(state);
    hold(state, 'theSaintPetersIndulgence');
    return { state, city, player };
  }

  it('gives +1% toward the Magnum Opus for every 150 faith spent, in whole helpings', () => {
    const { state, city, player } = board();
    expect(toward(state, city, 'theMagnumOpus')).toBe(0);
    player.faithSpent = 149;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(0);
    player.faithSpent = 150;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(1);
    player.faithSpent = 449;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(2);
  });

  it('has no cap', () => {
    const { state, city, player } = board();
    player.faithSpent = 30_000;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(200);
  });

  it('reads the Magnum Opus and nothing else', () => {
    const { state, city, player } = board();
    player.faithSpent = 1500;
    bumpRevision(state);
    expect(toward(state, city, 'theMagnumOpus')).toBe(10);
    expect(toward(state, city, 'granary')).toBe(0);
    expect(toward(state, city, 'observatory')).toBe(0);
    expect(
      cardProduction(state, city, 'wonder', undefined, 'pyramids' as never).filter(
        (line) => line.card === 'theSaintPetersIndulgence',
      ),
    ).toEqual([]);
  });

  it('counts faith as it is spent, through the one seam', () => {
    const { state, city, player } = board();
    player.faithPool = 1000;
    spendFaith(state, player, 300);
    expect(toward(state, city, 'theMagnumOpus')).toBe(2);
  });

  it('reaches the town’s production list as a labelled line', () => {
    const { state, city, player } = board();
    player.faithSpent = 600;
    bumpRevision(state);
    const lines = productionModifiers(state, city, { kind: 'building', id: 'theMagnumOpus' as never });
    const line = lines.find((one) => one.source.includes('The Saint Peter'));
    expect(line).toBeDefined();
    expect(line!.percent).toBe(4);
    expect(productionModifiers(state, city, { kind: 'building', id: 'granary' as never })).not.toContainEqual(line);
  });
});

// --- batch DT5: the rows that need only the offer's gate -------------------------

/**
 * A religion whose holy site is this town's centre. The owner of the town holds the
 * site, so the religion pays that owner. The citizens of `followers` all follow it.
 */
function religionAt(state: GameState, site: City, followers: readonly City[] = [site]): Religion {
  at(state, site.col, site.row).improvement = 'holySite' as never;
  const religion = {
    id: state.religions.length,
    founderId: site.ownerId,
    name: `The Testament ${state.religions.length}`,
    pantheon: [],
    follower: [],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: site.col, row: site.row },
  } as unknown as Religion;
  state.religions.push(religion);
  for (const city of followers) city.followers = { [religion.id]: city.population };
  bumpRevision(state);
  return religion;
}

/** What a town's citizens cost seat 0 in happiness, as a positive figure. */
function citizensDemand(state: GameState, city: City): number {
  const line = explainHappiness(state, 0).find(
    (entry) => entry.part === 'cost' && entry.source.startsWith(`${city.name} · `) && entry.source.includes('citizens'),
  );
  if (line === undefined) throw new Error(`no citizens line for ${city.name}`);
  return 0 - line.value;
}

describe('batch DT5: the gated rows', () => {
  it('marks the five Devotion rows of this batch, and none of the three that came before', () => {
    for (const id of DT5_ROWS) expect(doctrineDef(id as DoctrineId).needsReligion, id).toBe(true);
    for (const id of ['theTheoricFund', 'theRitesOfZhou', 'theSaintPetersIndulgence']) {
      expect(doctrineDef(id as DoctrineId).needsReligion, id).toBeUndefined();
    }
  });

  it('gives a bot a positive price for each row on a board where the row pays', () => {
    const state = bareState(24, 10);
    const holy = town(state, 5, 5, 8);
    town(state, 9, 5, 6);
    religionAt(state, holy, state.cities);
    // A holy site the town works: its centre pays no hex line, so the doubler needs this.
    raiseImprovement(at(state, 6, 5), 'holySite' as never, 0);
    refreshCityDerived(state, holy);
    // A foreign town the seat knows of, so The Martyr's Crown has a town to press. With no
    // town to turn, its lump pays nothing (batch DT19b).
    town(state, 16, 5, 4, 1);
    state.visibility[0]!.fill(1);
    const player = faithful(state);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    for (const id of DT5_ROWS) {
      const score = scoreCard(player, id as never, ctx);
      expect(score, id).toBeGreaterThan(0);
    }
  });

  it('prices a town-scoped row at nothing when no town is in its reach', () => {
    // No town follows, and no holy site stands.
    const state = bareState(24, 10);
    town(state, 5, 5, 8);
    const player = seat(state);
    const ctx = valueContext(state, player);
    expect(scoreCard(player, 'thePatrimonyOfPeter' as never, ctx)).toBe(0);
    expect(scoreCard(player, 'theImarets' as never, ctx)).toBe(0);
  });
});

describe('The Patrimony of Peter', () => {
  it('takes the holy city’s citizens off the happiness meter, and no other town’s', () => {
    const state = bareState(24, 10);
    const holy = town(state, 5, 5, 6);
    const other = town(state, 15, 5, 4);
    religionAt(state, holy, [holy, other]);
    const holyBefore = citizensDemand(state, holy);
    const otherBefore = citizensDemand(state, other);
    expect(holyBefore).toBeGreaterThan(0);
    hold(state, 'thePatrimonyOfPeter');
    expect(citizensDemand(state, holy)).toBe(0);
    expect(citizensDemand(state, other)).toBe(otherBefore);
  });

  it('changes nothing for a seat with no holy city', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    const before = citizensDemand(state, city);
    hold(state, 'thePatrimonyOfPeter');
    expect(citizensDemand(state, city)).toBe(before);
  });

  it('follows the holy city when it changes hands', () => {
    const state = bareState(24, 10);
    const holy = town(state, 5, 5, 6);
    const other = town(state, 15, 5, 4);
    religionAt(state, holy, [holy, other]);
    hold(state, 'thePatrimonyOfPeter');
    expect(citizensDemand(state, holy)).toBe(0);
    holy.ownerId = 1;
    bumpRevision(state);
    // Seat 0 keeps its Doctrine and has no holy city left, so its other town still pays.
    expect(citizensDemand(state, other)).toBeGreaterThan(0);
  });

  it('leaves the founding preview alone, because a town not yet founded is not a holy city', () => {
    const state = bareState(24, 10);
    const holy = town(state, 5, 5, 6);
    religionAt(state, holy);
    const quote = (): number =>
      explainFoundingCost(state, 0, at(state, 15, 5)).find((one) => one.meter === 'happiness')!.value;
    const before = quote();
    hold(state, 'thePatrimonyOfPeter');
    expect(quote()).toBe(before);
  });
});

describe('The Imarets', () => {
  const percentOn = (state: GameState, city: City): number =>
    explainGrowthPercent(state, city)
      .filter((line) => line.source.includes('The Imarets'))
      .reduce((sum, line) => sum + line.percent, 0);

  it('adds +25% to a devout town’s growth, and nothing to a town that does not follow', () => {
    const state = bareState(24, 10);
    const devout = town(state, 5, 5, 6);
    const plain = town(state, 15, 5, 6);
    religionAt(state, devout, [devout]);
    hold(state, 'theImarets');
    expect(percentOn(state, devout)).toBe(25);
    expect(percentOn(state, plain)).toBe(0);
  });

  it('reaches the food a devout town banks, added to the town’s other growth percentages', () => {
    const build = (held: boolean): { surplus: number; percent: number } => {
      const state = bareState(24, 10);
      const city = town(state, 5, 5, 3);
      religionAt(state, city);
      if (held) hold(state, 'theImarets');
      return { surplus: growthSurplus(state, city), percent: foldGrowthPercent(explainGrowthPercent(state, city)) };
    };
    const without = build(false);
    const held = build(true);
    expect(without.surplus).toBeGreaterThan(0);
    expect(held.percent).toBe(without.percent + 25);
    // The percentages add inside one channel, so the base comes from the plain town.
    const base = without.surplus / (1 + without.percent / 100);
    expect(held.surplus).toBeCloseTo(base * (1 + held.percent / 100), 8);
  });

  it('pays nothing in a rival’s town that follows, nor in a town following a rival’s faith', () => {
    const state = bareState(30, 10);
    const mine = town(state, 5, 5, 6);
    const theirs = town(state, 15, 5, 6, 1);
    const theirHoly = town(state, 25, 5, 6, 1);
    const faith = religionAt(state, mine, [mine, theirs]);
    expect(faith.founderId).toBe(0);
    hold(state, 'theImarets');
    expect(cardRulePercent(state, 1, 'growthSurplus', theirs)).toEqual([]);
    // A town of mine that follows a faith I am not paid by is not devout.
    religionAt(state, theirHoly, [theirHoly, mine]);
    expect(percentOn(state, mine)).toBe(0);
  });
});

describe('The Canons of the Holy Sepulchre', () => {
  const WARRIOR = { kind: 'unit', id: 'warrior' } as const;
  const TEMPLE = { kind: 'building', id: 'temple' } as const;

  /** A town with a holy site inside its borders, off its centre, and a plain town. */
  function board(): { state: GameState; holy: City; plain: City } {
    const state = bareState(30, 10);
    const holy = town(state, 5, 5, 6);
    const plain = town(state, 20, 5, 6);
    // Faith buys units here, so the rider has a unit's price to reach.
    addBuilding(state, holy, 'cathedral');
    addBuilding(state, plain, 'cathedral');
    faithful(state);
    raiseImprovement(at(state, 6, 5), 'holySite' as never, 0);
    bumpRevision(state);
    return { state, holy, plain };
  }

  const faithPrice = (state: GameState, city: City, item: PurchaseSubject): number =>
    explainPurchaseCost(state, 0, city.id, item, 'faith')!.total;

  it('takes 30% off a faith price in a town with a holy site, as a labelled line', () => {
    const { state, holy } = board();
    const before = faithPrice(state, holy, WARRIOR);
    hold(state, 'theCanonsOfTheHolySepulchre');
    const price = explainPurchaseCost(state, 0, holy.id, WARRIOR, 'faith')!;
    expect(price.total).toBe(Math.floor((before * 70) / 100));
    expect(price.lines.some((line) => line.source.includes('The Canons of the Holy Sepulchre'))).toBe(true);
  });

  it('reaches a building as well as a unit', () => {
    const { state, holy } = board();
    // The Gifts of the Faithful opens a religious building to faith.
    const sc = seat(state).statecraft;
    sc.orders.push('theGiftsOfTheFaithful' as OrderId);
    sc.slots.push({ card: 'theGiftsOfTheFaithful' as OrderId, sealedUntil: state.turn });
    bumpRevision(state);
    const before = faithPrice(state, holy, TEMPLE);
    hold(state, 'theCanonsOfTheHolySepulchre');
    expect(faithPrice(state, holy, TEMPLE)).toBe(Math.floor((before * 70) / 100));
  });

  it('leaves a town with no holy site at the full price', () => {
    const { state, plain } = board();
    const before = faithPrice(state, plain, WARRIOR);
    hold(state, 'theCanonsOfTheHolySepulchre');
    expect(faithPrice(state, plain, WARRIOR)).toBe(before);
  });

  it('leaves a gold price alone', () => {
    const { state, holy } = board();
    const before = explainPurchaseCost(state, 0, holy.id, WARRIOR, 'gold')!.total;
    hold(state, 'theCanonsOfTheHolySepulchre');
    expect(explainPurchaseCost(state, 0, holy.id, WARRIOR, 'gold')!.total).toBe(before);
  });

  it('charges the purse the discounted price', () => {
    const { state, holy } = board();
    const player = seat(state);
    hold(state, 'theCanonsOfTheHolySepulchre');
    const price = faithPrice(state, holy, WARRIOR);
    const pool = player.faithPool;
    expect(purchaseError(state, 0, holy.id, WARRIOR, 'faith')).toBeNull();
    const result = applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: holy.id,
      item: WARRIOR,
      currency: 'faith',
    } as Command);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(player.faithPool).toBe(pool - price);
  });
});

describe('The Martyr’s Crown', () => {
  /**
   * Seat 1 holds a religion in a town at (12, 5). Seat 0 holds three towns: one within
   * three hexes of the fight at (5, 5), and one well outside. No citizen follows yet.
   */
  function board(): { state: GameState; near: City; far: City; holy: City; faith: Religion } {
    const state = bareState(40, 12);
    const near = town(state, 3, 5, 6);
    const far = town(state, 30, 5, 6);
    const holy = town(state, 12, 5, 6, 1);
    const faith = religionAt(state, holy, []);
    return { state, near, far, holy, faith };
  }

  /** A warrior of seat 0's kills a wounded warrior of seat 1's on (5, 5). */
  function killSeatOnesWarrior(state: GameState): void {
    const foe = createUnit(state, 1, 'warrior', 5, 5);
    foe.hp = 1;
    const mine = createUnit(state, 0, 'warrior', 5, 6);
    bumpRevision(state);
    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: mine.id,
      target: { col: 5, row: 5 },
    } as Command);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(state.units.some((unit) => unit.id === foe.id)).toBe(false);
  }

  /** Everything the lump can move in a town: its followers and its bank. */
  const faithIn = (city: City): unknown => [city.followers ?? {}, city.pressureBank ?? {}];

  it('presses the religion on a town within three hexes when one of the seat’s units dies', () => {
    const { state, near, faith } = board();
    hold(state, 'theMartyrsCrown', 1);
    killSeatOnesWarrior(state);
    // A lump of thirty turns three citizens, at ten faith a citizen.
    expect(near.followers?.[faith.id]).toBe(3);
  });

  it('reaches any town in range, its own included, and none beyond three hexes', () => {
    const { state, near, far, faith } = board();
    const edge = town(state, 8, 5, 6);
    const past = town(state, 9, 5, 6, 0);
    hold(state, 'theMartyrsCrown', 1);
    const farBefore = faithIn(far);
    const pastBefore = faithIn(past);
    killSeatOnesWarrior(state);
    expect(near.followers?.[faith.id]).toBe(3);
    expect(edge.followers?.[faith.id]).toBe(3);
    expect(faithIn(far)).toEqual(farBefore);
    expect(faithIn(past)).toEqual(pastBefore);
  });

  it('presses nothing for the side that made the kill', () => {
    const { state, near, far } = board();
    // Seat 0 holds the Doctrine and a religion, and makes the kill.
    religionAt(state, town(state, 20, 5, 6), []);
    hold(state, 'theMartyrsCrown', 0);
    const before = [faithIn(near), faithIn(far)];
    killSeatOnesWarrior(state);
    expect([faithIn(near), faithIn(far)]).toEqual(before);
  });

  it('pays nothing for a seat with no religion', () => {
    const state = bareState(40, 12);
    const near = town(state, 3, 5, 6);
    // Seat 1 holds the Doctrine and no holy city, which it can do by losing one.
    hold(state, 'theMartyrsCrown', 1);
    const before = faithIn(near);
    killSeatOnesWarrior(state);
    expect(state.religions).toEqual([]);
    expect(faithIn(near)).toEqual(before);
  });

  it('presses when a seat’s attacker dies on the counter-blow too', () => {
    const { state, near, faith } = board();
    // Seat 0 holds a faith of its own and attacks at one health, and the blow back
    // kills it. The lump lands around the hex fought over, where the battle seam reads.
    const holyOfMine = town(state, 20, 5, 6);
    const mine = religionAt(state, holyOfMine, []);
    hold(state, 'theMartyrsCrown', 0);
    const foe = createUnit(state, 1, 'warrior', 5, 5);
    const attacker = createUnit(state, 0, 'warrior', 5, 6);
    attacker.hp = 1;
    bumpRevision(state);
    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: attacker.id,
      target: { col: foe.col, row: foe.row },
    } as Command);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(state.units.some((unit) => unit.id === attacker.id)).toBe(false);
    expect(near.followers?.[mine.id]).toBe(3);
    expect(near.followers?.[faith.id]).toBeUndefined();
  });

  it('counts a Temple’s share, as every lump does', () => {
    const { state, near, faith } = board();
    addBuilding(state, near, 'temple');
    bumpRevision(state);
    hold(state, 'theMartyrsCrown', 1);
    killSeatOnesWarrior(state);
    expect(near.followers?.[faith.id] ?? 0).toBeLessThan(3);
  });

  it('is one rider on the death occasion, which presses thirty at a range of three', () => {
    expect(doctrineDef('theMartyrsCrown' as DoctrineId).effects).toEqual([
      { kind: 'windfallRider', occasion: 'death', grant: { pressure: { amount: 30, range: 3 } } },
    ]);
  });
});

describe('The Two Sanctuaries', () => {
  /** What one hex pays the town working it. */
  const hexPays = (state: GameState, city: City, col: number, row: number) =>
    foldTileLines(explainTileYield(at(state, col, row), cityContext(state, city)));

  function board(): { state: GameState; city: City } {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 6);
    raiseImprovement(at(state, 6, 5), 'holySite' as never, 0);
    raiseImprovement(at(state, 5, 4), 'farm' as never, 0);
    bumpRevision(state);
    return { state, city };
  }

  it('doubles every yield of a hex with a holy site, and leaves other hexes alone', () => {
    const { state, city } = board();
    const site = hexPays(state, city, 6, 5);
    const farm = hexPays(state, city, 5, 4);
    expect(site.faith).toBeGreaterThan(0);
    hold(state, 'theTwoSanctuaries');
    const doubled = hexPays(state, city, 6, 5);
    expect(doubled.food).toBe(site.food * 2);
    expect(doubled.production).toBe(site.production * 2);
    expect(doubled.faith).toBe(site.faith * 2);
    expect(doubled.culture).toBe(site.culture * 2);
    expect(hexPays(state, city, 5, 4)).toEqual(farm);
  });

  it('doubles after every other change to the hex, a card’s line included', () => {
    const { state, city } = board();
    const plain = hexPays(state, city, 6, 5);
    lendPaysOnHolySite(state);
    const withLine = hexPays(state, city, 6, 5);
    expect(withLine.gold).toBe(plain.gold + 3);
    hold(state, 'theTwoSanctuaries');
    expect(hexPays(state, city, 6, 5).gold).toBe(withLine.gold * 2);
  });

  it('doubles after another whole share, so +50% and the doubling pay 3 times (batch DT19c)', () => {
    const { state, city } = board();
    const site = hexPays(state, city, 6, 5);
    expect(site.faith).toBeGreaterThan(0);
    lent.push(
      lendDoctrineEffects('theSaintPetersIndulgence' as DoctrineId, [
        { kind: 'pays', where: 'hex', on: { test: 'improvement', improvement: 'holySite' }, wholePercent: 50 },
      ]),
    );
    hold(state, 'theSaintPetersIndulgence');
    expect(hexPays(state, city, 6, 5).faith).toBeCloseTo(site.faith * 1.5, 6);
    hold(state, 'theTwoSanctuaries');
    expect(hexPays(state, city, 6, 5).faith).toBeCloseTo(site.faith * 3, 6);
    expect(describeCard('theTwoSanctuaries' as DoctrineId).map((clause) => stripRefs(clause.text))).toEqual([
      'the yields of every hex with a Holy Site are doubled, after every other change to the hex',
    ]);
  });

  it('joins the hex’s list as one labelled line, and the total is the list’s fold', () => {
    const { state, city } = board();
    const site = hexPays(state, city, 6, 5);
    hold(state, 'theTwoSanctuaries');
    const lines = explainTileYield(at(state, 6, 5), cityContext(state, city));
    expect(lines.filter((one) => one.source.includes('The Two Sanctuaries'))).toHaveLength(1);
    expect(foldTileLines(lines).faith).toBe(site.faith * 2);
  });

  /** Lends seat 0 The Saint Peter's Indulgence a hex line, for one test. */
  function lendPaysOnHolySite(state: GameState): void {
    lent.push(
      lendDoctrineEffects('theSaintPetersIndulgence' as DoctrineId, [
        { kind: 'pays', where: 'hex', gold: 3, on: { test: 'improvement', improvement: 'holySite' } } as CardEffect,
      ]),
    );
    hold(state, 'theSaintPetersIndulgence');
  }
});

describe('The Paean (batch DT6)', () => {
  /** The strength this card gives a piece, read off the fight's own lines. */
  function strength(state: GameState, unit: Unit, side: 'attack' | 'defend' = 'attack'): number {
    return cardCombatLines(state, {
      unit,
      side,
      tile: at(state, unit.col, unit.row),
      vsBarbarians: false,
      vsCity: false,
      targetHp: 100,
      targetMaxHp: 100,
    })
      .filter((line) => line.card === 'thePaean')
      .reduce((sum, line) => sum + line.amount, 0);
  }

  /** Two gods of the seat's own, as a founded pantheon holds them. */
  const GODS = BELIEF_IDS.slice(0, 2);

  it('gives a military unit +1 strength for each god held, attacking and defending', () => {
    const state = bareState();
    const piece = createUnit(state, 0, 'warrior', 7, 5);
    hold(state, 'thePaean');
    const before = seat(state).pantheon.beliefs.length;
    expect(strength(state, piece)).toBe(before);
    seat(state).pantheon.beliefs.push(...GODS);
    bumpRevision(state);
    expect(strength(state, piece)).toBe(before + 2);
    expect(strength(state, piece, 'defend')).toBe(before + 2);
  });

  it('counts the follower and enhancer beliefs of a held religion, and not its copy of the gods', () => {
    const state = bareState(24, 10);
    const site = town(state, 5, 5);
    const piece = createUnit(state, 0, 'warrior', 7, 5);
    hold(state, 'thePaean');
    const religion = religionAt(state, site);
    religion.pantheon = [...GODS];
    religion.follower = [FOLLOWER_BELIEF_IDS[0]!];
    religion.enhancer = [ENHANCER_BELIEF_IDS[0]!];
    bumpRevision(state);
    expect(strength(state, piece)).toBe(seat(state).pantheon.beliefs.length + 2);
  });

  it('gives a civilian nothing, and a rival’s piece nothing', () => {
    const state = bareState();
    const worker = createUnit(state, 0, 'worker', 7, 5);
    const theirs = createUnit(state, 1, 'warrior', 8, 5);
    seat(state).pantheon.beliefs.push(...GODS);
    hold(state, 'thePaean');
    expect(strength(state, worker)).toBe(0);
    expect(strength(state, theirs)).toBe(0);
  });

  it('prices the bots’ line by the beliefs held', () => {
    const state = bareState();
    const line = doctrineDef('thePaean').effects;
    const none = scoreEffects(line, valueContext(state, seat(state)));
    seat(state).pantheon.beliefs.push(...GODS);
    bumpRevision(state);
    expect(scoreEffects(line, valueContext(state, seat(state)))).toBeGreaterThan(none);
  });
});

describe('Canossa (batch DT7)', () => {
  /**
   * Seat 0 holds a religion in its capital, and seat 1's capital follows it. The two
   * are at peace, and seat 1 holds nothing of its own.
   */
  function board(): { state: GameState; mine: City; theirs: City; faith: Religion } {
    const state = bareState(30, 10);
    state.wars = [];
    const mine = town(state, 5, 5, 6);
    const theirs = town(state, 20, 5, 6, 1);
    const faith = religionAt(state, mine, [mine, theirs]);
    return { state, mine, theirs, faith };
  }

  const declare = (playerId: number, targetId: number): Command => ({ type: 'declareWar', playerId, targetId });

  it('is dealt only to a seat that holds a religion', () => {
    expect(doctrineDef('canossa' as DoctrineId).needsReligion).toBe(true);
    const { state } = board();
    const tier = doctrineDef('canossa' as DoctrineId).tier;
    const withDeck = (playerId: number): Player => {
      const player = seat(state, playerId);
      player.decks = ['devotion'];
      return player;
    };
    expect(doctrineBagFor(state, withDeck(0), tier)).toContain('canossa');
    expect(doctrineBagFor(state, withDeck(1), tier)).not.toContain('canossa');
  });

  it('bars the holder from declaring on an empire whose capital follows its religion', () => {
    const { state } = board();
    expect(declareWarError(state, 0, 1)).toBeNull();
    hold(state, 'canossa');
    const sentence = declareWarError(state, 0, 1)!;
    expect(sentence).toContain('Canossa');
    expect(sentence).toContain('their capital follows your religion');
    const before = JSON.stringify(state);
    const result = applyCommand(state, declare(0, 1));
    expect(result.ok ? '' : result.error).toBe(sentence);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('bars that empire from declaring on the holder too', () => {
    const { state } = board();
    expect(declareWarError(state, 1, 0)).toBeNull();
    hold(state, 'canossa');
    const sentence = declareWarError(state, 1, 0)!;
    expect(sentence).toContain('Canossa');
    expect(sentence).toContain('your capital follows their religion');
    const before = JSON.stringify(state);
    const result = applyCommand(state, declare(1, 0));
    expect(result.ok ? '' : result.error).toBe(sentence);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('does not bar war with an empire whose capital follows nothing, or another faith', () => {
    const { state, theirs, faith } = board();
    hold(state, 'canossa');
    theirs.followers = {};
    bumpRevision(state);
    expect(declareWarError(state, 0, 1)).toBeNull();
    theirs.followers = { [faith.id + 1]: theirs.population };
    bumpRevision(state);
    expect(declareWarError(state, 0, 1)).toBeNull();
  });

  it('lifts at once when the capital turns away, and returns when it turns back', () => {
    const { state, theirs, faith } = board();
    hold(state, 'canossa');
    expect(declareWarError(state, 0, 1)).not.toBeNull();
    theirs.followers = {};
    bumpRevision(state);
    expect(declareWarError(state, 0, 1)).toBeNull();
    expect(declareWarError(state, 1, 0)).toBeNull();
    theirs.followers = { [faith.id]: theirs.population };
    bumpRevision(state);
    expect(declareWarError(state, 0, 1)).not.toBeNull();
  });

  it('asks only of the capital, so another town following the religion does not bind', () => {
    const { state, theirs, faith } = board();
    const second = town(state, 25, 5, 6, 1);
    theirs.followers = {};
    second.followers = { [faith.id]: second.population };
    bumpRevision(state);
    hold(state, 'canossa');
    expect(declareWarError(state, 0, 1)).toBeNull();
  });

  it('lets a war already running go on', () => {
    const { state } = board();
    openWar(state, 0, 1);
    hold(state, 'canossa');
    expect(atWar(state, 0, 1)).toBe(true);
    // The only thing the gate has to say about this pair is the war itself.
    expect(declareWarError(state, 0, 1)).toContain('already at war');
    expect(declareWarError(state, 0, 1)).not.toContain('Canossa');
  });

  it('asks nothing of the wild', () => {
    const state = bareState(30, 10, true);
    state.wars = [];
    const mine = town(state, 5, 5, 6);
    religionAt(state, mine);
    hold(state, 'canossa');
    const wild = state.players.find((player) => player.barbarian === true)!;
    expect(declareWarError(state, 0, wild.id)).not.toContain('Canossa');
  });

  it('gives a seat with no religion nothing, whatever it holds', () => {
    const state = bareState(30, 10);
    state.wars = [];
    town(state, 5, 5, 6);
    town(state, 20, 5, 6, 1);
    hold(state, 'canossa');
    expect(declareWarError(state, 0, 1)).toBeNull();
  });
});

describe('The Capitulary of Herstal (batch DT8)', () => {
  const CARD = 'theCapitularyOfHerstal';

  it('halves the price at every rung, floored once', () => {
    const state = bareState();
    town(state, 5, 5);
    const rungs = [0, 1, 2, 3].map((ahead) => riteCostAhead(state, 0, ahead));
    expect(rungs).toEqual([20, 25, 30, 35]);
    hold(state, CARD);
    // An odd rung loses its half: 25 is 12, and 35 is 17.
    expect([0, 1, 2, 3].map((ahead) => riteCostAhead(state, 0, ahead))).toEqual([10, 12, 15, 17]);
    expect(riteCostFor(state, 0)).toBe(10);
  });

  it('counts how many rites a bank pays for along the halved ladder', () => {
    const state = bareState();
    town(state, 5, 5);
    expect(ritesAffordable(state, 0, 22)).toBe(1);
    hold(state, CARD);
    expect(ritesAffordable(state, 0, 22)).toBe(2);
    expect(ritesAffordable(state, 0, 21)).toBe(1);
    expect(ritesAffordable(state, 0, 9)).toBe(0);
  });

  it('charges through the reducer what the price says, and the ladder still climbs', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    const player = faithful(state);
    hold(state, CARD);
    const before = player.faithPool;
    const result = applyCommand(state, {
      type: 'performRite',
      playerId: 0,
      cityId: city.id,
      rite: FASTING,
    } as Command);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(player.faithPool).toBe(before - 10);
    expect(player.ritesStarted).toBe(1);
    expect(riteCostFor(state, 0)).toBe(12);
  });

  it('charges a prophet’s rite over the realm once, at the halved price', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5);
    town(state, 15, 5);
    const player = faithful(state);
    hold(state, CARD);
    const prophet = createUnit(state, 0, 'prophet', city.col, city.row);
    bumpRevision(state);
    const before = player.faithPool;
    const done = empireRiteAt(state, player, prophet, FASTING);
    expect(done.cities).toHaveLength(2);
    expect(player.faithPool).toBe(before - 10);
    // Two towns reached, two rungs climbed: 30 at half is 15.
    expect(riteCostFor(state, 0)).toBe(15);
  });

  it('reaches a rite that acts at once, whose hammers are the faith it cost (reading 38)', () => {
    const state = bareState();
    town(state, 5, 5);
    const offering = 'votiveOffering' as RiteId;
    const whole = riteOfferingHammers(state, 0, offering);
    expect(whole).toBeGreaterThan(0);
    hold(state, CARD);
    expect(riteOfferingHammers(state, 0, offering)).toBe(Math.floor(whole / 2));
  });

  it('asks nothing of a seat’s religion', () => {
    expect(doctrineDef(CARD as DoctrineId).needsReligion).toBeUndefined();
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true, decks: ['devotion', 'dominion'] },
        { name: 'Bors', color: '#00a', isHuman: true, decks: ['dominion', 'expansionist'] },
      ],
    });
    expect(doctrineBagFor(g.state, seat(g.state), 10)).toContain(CARD);
    expect(doctrineBagFor(g.state, seat(g.state, 1), 10)).not.toContain(CARD);
  });

  it('prices the faith a season saves, and nothing for a realm that knows no rite', () => {
    const effects = doctrineDef(CARD as DoctrineId).effects;
    const state = bareState(24, 10);
    town(state, 5, 5);
    const player = faithful(state);
    expect(scoreEffects(effects, valueContext(state, player))).toBeGreaterThan(0);
    // A bare board's seat knows many technologies, and rites with them. Take them back.
    player.techsResearched = [];
    player.charteredRites = [];
    bumpRevision(state);
    expect(availableRites(state, 0)).toEqual([]);
    expect(scoreEffects(effects, valueContext(state, player))).toBe(0);
  });

  it('lets the bots’ own book of rites read the price it is charged', () => {
    const state = bareState(24, 10);
    town(state, 5, 5);
    const player = faithful(state);
    const rows = (): number[] =>
      valueContext(state, player)
        .wants.faith.filter((want) => want.rite !== undefined)
        .map((want) => want.price);
    expect(rows().length).toBeGreaterThan(0);
    for (const price of rows()) expect(price).toBe(20);
    hold(state, CARD);
    for (const price of rows()) expect(price).toBe(10);
  });
});

describe('The Ribats (batch DT14)', () => {
  const CARD = 'theRibats';
  const WARRIOR = { kind: 'unit', id: 'warrior' } as const;

  /** Seat 0's devout capital, and a town of seat 0's that follows nothing. */
  function board(): { state: GameState; devout: City; plain: City; faith: Religion } {
    const state = bareState(40, 12);
    const devout = town(state, 5, 5, 6);
    const plain = town(state, 20, 5, 6);
    const faith = religionAt(state, devout);
    // Faith buys units in a town with a Cathedral, so a bought soldier has a bank.
    addBuilding(state, devout, 'cathedral');
    addBuilding(state, plain, 'cathedral');
    seat(state).faithPool = 100_000;
    seat(state).gold = 100_000;
    bumpRevision(state);
    expect(cityReligion(devout)).toBe(faith.id);
    expect(cityReligion(plain)).toBeNull();
    return { state, devout, plain, faith };
  }

  /** The units seat 0 gained while `act` ran. */
  function gained(state: GameState, act: () => void): Unit[] {
    const before = new Set(state.units.map((unit) => unit.id));
    act();
    return state.units.filter((unit) => !before.has(unit.id));
  }

  describe('its +3 strength', () => {
    it('reaches a unit trained in a devout town', () => {
      const { state, devout } = board();
      hold(state, CARD);
      devout.queue = [WARRIOR];
      devout.hammerBasket = 100_000;
      const [unit] = gained(state, () => expect(settleProduction(state, devout)?.name).toBe('Warrior'));
      expect(unit!.stamp?.strength).toBe(3);
    });

    it('reaches a unit bought in a devout town, with either bank', () => {
      for (const currency of ['gold', 'faith'] as const) {
        const { state, devout } = board();
        hold(state, CARD);
        expect(purchaseError(state, 0, devout.id, WARRIOR, currency)).toBeNull();
        const [unit] = gained(state, () => {
          const result = applyCommand(state, {
            type: 'purchaseItem',
            playerId: 0,
            cityId: devout.id,
            item: WARRIOR,
            currency,
          } as Command);
          expect(result.ok, JSON.stringify(result)).toBe(true);
        });
        expect(unit!.stamp?.strength).toBe(3);
      }
    });

    it('reaches a unit granted free in a devout town', () => {
      const { state, devout } = board();
      hold(state, CARD);
      const done = realiseItem(state, devout, { kind: 'unit', id: 'warrior', tile: at(state, 5, 5) }, { free: true });
      const unit = state.units.find((entry) => entry.id === done.unitId)!;
      expect(unit.freeUpkeep).toBe(true);
      expect(unit.stamp?.strength).toBe(3);
    });

    it('reaches a unit a completion grants, the arm that does not pass through `realiseItem`', () => {
      const { state, devout } = board();
      hold(state, CARD);
      const [report] = payGrants(state, devout, [{ grant: 'unit', unit: 'warrior' }]);
      expect(report?.done).toBe(true);
      expect(state.units.find((entry) => entry.id === report!.unitId)!.stamp?.strength).toBe(3);
    });

    it('reaches a unit pushed off the town’s own hex', () => {
      const { state, devout } = board();
      hold(state, CARD);
      // A soldier stands in the gate, so the next one appears beside the town.
      createUnit(state, 0, 'warrior', devout.col, devout.row);
      bumpRevision(state);
      devout.queue = [WARRIOR];
      devout.hammerBasket = 100_000;
      const [unit] = gained(state, () => expect(settleProduction(state, devout)?.name).toBe('Warrior'));
      expect({ col: unit!.col, row: unit!.row }).not.toEqual({ col: devout.col, row: devout.row });
      expect(cityAt(state, unit!.col, unit!.row)).toBeUndefined();
      expect(unit!.stamp?.strength).toBe(3);
    });

    it('reaches a granted unit pushed off the town’s own hex too', () => {
      const { state, devout } = board();
      hold(state, CARD);
      createUnit(state, 0, 'warrior', devout.col, devout.row);
      bumpRevision(state);
      const [report] = payGrants(state, devout, [{ grant: 'unit', unit: 'warrior' }]);
      const unit = state.units.find((entry) => entry.id === report!.unitId)!;
      expect({ col: unit.col, row: unit.row }).not.toEqual({ col: devout.col, row: devout.row });
      expect(unit.stamp?.strength).toBe(3);
    });

    it('does not reach a unit raised in a town that follows nothing', () => {
      const { state, plain } = board();
      hold(state, CARD);
      plain.queue = [WARRIOR];
      plain.hammerBasket = 100_000;
      const [unit] = gained(state, () => expect(settleProduction(state, plain)?.name).toBe('Warrior'));
      expect(unit!.stamp).toBeUndefined();
    });

    it('does not reach a unit raised in a town that follows another seat’s religion', () => {
      const { state, plain } = board();
      const rival = religionAt(state, town(state, 30, 5, 6, 1), []);
      plain.followers = { [rival.id]: plain.population };
      bumpRevision(state);
      hold(state, CARD);
      const done = realiseItem(state, plain, { kind: 'unit', id: 'warrior', tile: at(state, 20, 5) });
      expect(state.units.find((entry) => entry.id === done.unitId)!.stamp).toBeUndefined();
    });

    it('does not reach a civilian or a ship', () => {
      const { state, devout } = board();
      hold(state, CARD);
      const raise = (id: 'worker' | 'trireme'): Unit => {
        const done = realiseItem(state, devout, { kind: 'unit', id, tile: at(state, 5, 5) });
        return state.units.find((entry) => entry.id === done.unitId)!;
      };
      expect(raise('worker').stamp).toBeUndefined();
      expect(raise('trireme').stamp).toBeUndefined();
    });

    it('does not reach a unit no town raised, such as a ruin’s escort', () => {
      const { state } = board();
      hold(state, CARD);
      expect(createUnit(state, 0, 'warrior', 12, 8).stamp).toBeUndefined();
    });

    it('needs the Doctrine', () => {
      const { state, devout } = board();
      const done = realiseItem(state, devout, { kind: 'unit', id: 'warrior', tile: at(state, 5, 5) });
      expect(state.units.find((entry) => entry.id === done.unitId)!.stamp).toBeUndefined();
    });

    it('stays when the town stops following and when the Doctrine is gone, and through an upgrade', () => {
      const { state, devout } = board();
      hold(state, CARD);
      const done = realiseItem(state, devout, { kind: 'unit', id: 'archer', tile: at(state, 5, 5) });
      const unit = state.units.find((entry) => entry.id === done.unitId)!;
      expect(unit.stamp?.strength).toBe(3);
      // The bench holds no technology whose gift is a rule, and Siegecraft is one.
      seat(state).techsResearched.push('siegecraft');
      devout.followers = {};
      seat(state).statecraft.doctrines = [];
      bumpRevision(state);
      expect(unitStampStrength(unit)).toBe(3);
      upgradeUnits(state, seat(state));
      expect(unit.type).not.toBe('archer');
      expect(unitStampStrength(unit)).toBe(3);
    });
  });

  describe('its conversion', () => {
    /**
     * Seat 0 holds a religion at (30, 5). Seat 1 holds a town at (5, 5) with a Temple,
     * walls almost down, and every citizen following seat 1's religion. Seat 0 has a
     * swordsman beside it.
     */
    function front(): { state: GameState; target: City; mine: Religion; theirs: Religion; striker: Unit } {
      const state = bareState(40, 12);
      const holy = town(state, 30, 5, 6);
      const mine = religionAt(state, holy);
      const theirSeat = town(state, 15, 5, 6, 1);
      const target = town(state, 5, 5, 6, 1);
      const theirs = religionAt(state, theirSeat, [theirSeat, target]);
      addBuilding(state, target, 'temple');
      target.hp = 1;
      const striker = createUnit(state, 0, 'swordsman', 5, 6);
      bumpRevision(state);
      expect(townHoldsBuilding(state, target, 'temple')).toBe(true);
      expect(cityReligion(target)).toBe(theirs.id);
      return { state, target, mine, theirs, striker };
    }

    function attack(state: GameState, striker: Unit, target: City): void {
      const result = applyCommand(state, {
        type: 'attack',
        playerId: 0,
        unitId: striker.id,
        target: { col: target.col, row: target.row },
      } as Command);
      expect(result.ok, JSON.stringify(result)).toBe(true);
      expect(target.ownerId).toBe(0);
    }

    it('turns the majority on the turn a town is walked into, past a rival’s Temple', () => {
      const { state, target, mine, striker } = front();
      hold(state, CARD);
      const turn = state.turn;
      expect(previewCombat(state, striker.id, { col: target.col, row: target.row })).toMatchObject({
        cityPhase: 'capture',
        capturesCity: true,
      });
      attack(state, striker, target);
      expect(state.turn).toBe(turn);
      expect(cityReligion(target)).toBe(mine.id);
      // Just enough citizens turn, and nothing is left in the bank.
      expect(target.followers?.[mine.id]).toBe(Math.floor(target.population / 2) + 1);
      expect(target.pressureBank?.[mine.id]).toBeUndefined();
    });

    it('turns the majority when the blow that kills the garrison takes the town', () => {
      const { state, target, mine, striker } = front();
      hold(state, CARD);
      const garrison = createUnit(state, 1, 'warrior', target.col, target.row);
      garrison.hp = 1;
      bumpRevision(state);
      expect(previewCombat(state, striker.id, { col: target.col, row: target.row })).toMatchObject({
        cityPhase: 'garrison',
        capturesCityOnKill: true,
      });
      attack(state, striker, target);
      expect(state.units.some((unit) => unit.id === garrison.id)).toBe(false);
      expect(cityReligion(target)).toBe(mine.id);
      expect(target.followers?.[mine.id]).toBe(Math.floor(target.population / 2) + 1);
    });

    it('takes what the town had banked into the price, and leaves the bank empty', () => {
      const { state, target, mine, striker } = front();
      hold(state, CARD);
      target.pressureBank = { [mine.id]: 7 };
      attack(state, striker, target);
      expect(target.followers?.[mine.id]).toBe(Math.floor(target.population / 2) + 1);
      expect(target.pressureBank?.[mine.id]).toBeUndefined();
    });

    it('presses nothing on a town that already follows', () => {
      const { state, target, mine, theirs, striker } = front();
      hold(state, CARD);
      target.followers = { [mine.id]: target.population };
      bumpRevision(state);
      attack(state, striker, target);
      expect(target.followers?.[mine.id]).toBe(target.population);
      expect(target.followers?.[theirs.id]).toBeUndefined();
      expect(target.pressureBank).toBeUndefined();
    });

    it('presses only the first of a seat’s religions', () => {
      const { state, target, mine, striker } = front();
      const second = religionAt(state, town(state, 36, 5, 6));
      hold(state, CARD);
      expect(heldReligions(state, 0).map((one) => one.id)).toEqual([mine.id, second.id]);
      attack(state, striker, target);
      expect(cityReligion(target)).toBe(mine.id);
      expect(target.followers?.[second.id]).toBeUndefined();
      expect(target.pressureBank?.[second.id]).toBeUndefined();
    });

    it('presses nothing for a seat with no religion', () => {
      const state = bareState(40, 12);
      town(state, 30, 5, 6);
      const theirSeat = town(state, 15, 5, 6, 1);
      const target = town(state, 5, 5, 6, 1);
      const theirs = religionAt(state, theirSeat, [theirSeat, target]);
      target.hp = 1;
      const striker = createUnit(state, 0, 'swordsman', 5, 6);
      hold(state, CARD);
      expect(heldReligions(state, 0)).toEqual([]);
      attack(state, striker, target);
      expect(cityReligion(target)).toBe(theirs.id);
      expect(target.pressureBank).toBeUndefined();
    });

    it('leaves the town alone without the Doctrine', () => {
      const { state, target, theirs, striker } = front();
      attack(state, striker, target);
      expect(cityReligion(target)).toBe(theirs.id);
    });

    it('does not reach a town ceded in a treaty, which is not conquered', () => {
      const { state, target, theirs } = front();
      hold(state, CARD);
      applyCommand(state, {
        type: 'proposePeace',
        playerId: 1,
        targetId: 0,
        give: { cities: [target.id] },
        take: {},
      } as unknown as Command);
      const signed = applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
      expect(signed.ok, JSON.stringify(signed)).toBe(true);
      expect(target.ownerId).toBe(0);
      expect(cityReligion(target)).toBe(theirs.id);
    });
  });

  it('is behind the religion gate, and a rider on a capture alone carries the flag', () => {
    const def = doctrineDef(CARD as DoctrineId);
    expect(def.needsReligion).toBe(true);
    expect(def.effects).toEqual([
      {
        kind: 'unitStamp',
        strength: 3,
        class: { category: 'military' },
        scope: { test: 'ownersFaith', keeps: true },
      },
      {
        kind: 'windfallRider',
        occasion: 'capture',
        grant: { pressure: { amount: 1, range: 0, majority: true } },
      },
    ]);
    const { state } = board();
    expect(doctrineBagFor(state, seatWithDevotion(state), 10).includes(CARD as DoctrineId)).toBe(true);
    const bare = bareState(40, 12);
    expect(doctrineBagFor(bare, seatWithDevotion(bare), 10).includes(CARD as DoctrineId)).toBe(false);
  });

  it('says what it does', () => {
    expect(describeCard(CARD as DoctrineId).map((clause) => stripRefs(clause.text))).toEqual([
      'newly created military units in every devout city gain +3 combat strength',
      'capturing a city converts it to your religion',
    ]);
  });

  it('lets a bot read it: the stamp as a strength line, and the conversion as The Crusader Orders’ lump', () => {
    const { state } = board();
    const ctx = valueContext(state, seat(state));
    const stamp = doctrineDef(CARD as DoctrineId).effects.slice(0, 1);
    // The +3 reaches the pieces raised in devout towns (batch DT19b): here, one town of two.
    const devout = state.cities.filter(
      (city) => city.ownerId === 0 && cityScopeAdmits(state, city, (stamp[0] as { scope: CityScope }).scope, 0),
    ).length;
    const towns = state.cities.filter((city) => city.ownerId === 0).length;
    expect([devout, towns]).toEqual([1, 2]);
    expect(scoreEffects(stamp, ctx)).toBeCloseTo((3 * ctx.ai.weights.military * (1 + ctx.threat) * devout) / towns);
    const rider = doctrineDef(CARD as DoctrineId).effects.slice(1);
    const crusade = orderDef('theCrusaderOrders' as OrderId).effects.filter(
      (effect) => effect.kind === 'windfallRider',
    );
    expect(crusade).toHaveLength(1);
    expect(scoreEffects(rider, ctx)).toBe(scoreEffects(crusade, ctx));
  });
});

describe('The Serapeum (batch DT9)', () => {
  const GOD = 'starReaders' as BeliefId;

  /** Lends a god a set of effects for one test. */
  function lendGod(id: BeliefId, effects: readonly CardEffect[]): void {
    const row = beliefDef(id) as { effects: readonly CardEffect[] };
    const held = row.effects;
    row.effects = effects;
    lent.push(() => {
      row.effects = held;
    });
  }

  /** A capital for seat 0, holding one god with these effects. */
  function board(effects: readonly CardEffect[]): { state: GameState; player: Player; city: City } {
    const state = bareState(24, 10);
    const city = foundCityAt(state, 0, at(state, 5, 5));
    city.population = 3;
    city.queue = [];
    refreshCityDerived(state, city);
    const player = playerById(state, 0)!;
    lendGod(GOD, effects);
    player.pantheon.beliefs = [GOD];
    bumpRevision(state);
    return { state, player, city };
  }

  it('pays a god’s flat line twice, under a label of its own', () => {
    const { state, city } = board([{ kind: 'pays', where: 'city', gold: 3 } as CardEffect]);
    const lines = () => explainCardCityYields(state, city).filter((line) => line.card === GOD);
    expect(lines().map((line) => line.gold)).toEqual([3]);
    hold(state, 'theSerapeum');
    const name = beliefDef(GOD).name;
    expect(lines().map((line) => line.gold)).toEqual([3, 3]);
    expect(lines().map((line) => line.source)).toEqual([`Belief · ${name}`, `Belief · ${name} · The Serapeum`]);
  });

  it('counts a god’s percentage twice', () => {
    const { state, city } = board([{ kind: 'percentYields', yield: 'culture', percent: 5 } as CardEffect]);
    const percent = (): number =>
      explainCardPercentYields(state, city)
        .filter((line) => line.card === GOD)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent()).toBe(5);
    hold(state, 'theSerapeum');
    expect(percent()).toBe(10);
  });

  it('pays a god’s kill rider twice', () => {
    const { state } = board([
      { kind: 'windfallRider', occasion: 'kill', grant: { yield: 'faith', amount: 5 } } as CardEffect,
    ]);
    const rider = (): number =>
      windfallPayout(state, 0, 'kill')
        .grants.filter((grant) => grant.card === GOD)
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(rider()).toBe(5);
    hold(state, 'theSerapeum');
    expect(rider()).toBe(10);
  });

  it('does not double an offer', () => {
    const { state } = board([
      { kind: 'periodicOffer', every: 10, site: 'ruins' } as CardEffect,
      { kind: 'offerRider', offer: 'order', extra: 1 } as CardEffect,
      { kind: 'pays', where: 'empire', gold: 1 } as CardEffect,
    ]);
    hold(state, 'theSerapeum');
    expect(cardPeriodicOffers(state, 0)).toHaveLength(1);
    expect(effectsOfKind(state, 0, 'offerRider').filter((row) => row.card === GOD)).toHaveLength(1);
    expect(effectsOfKind(state, 0, 'pays').filter((row) => row.card === GOD)).toHaveLength(2);
  });

  it('reads gods only, so a seat with none gains nothing', () => {
    const { state, player } = board([{ kind: 'pays', where: 'empire', gold: 1 } as CardEffect]);
    player.pantheon.beliefs = [];
    hold(state, 'theSerapeum');
    expect(
      liveEffects(state, 0).filter(
        (entry) => entry.source.includes('The Serapeum') && entry.card !== ('theSerapeum' as never),
      ),
    ).toEqual([]);
  });

  it('is priced at what the seat’s gods pay read again, and nothing with no god', () => {
    const line = { kind: 'pays', where: 'empire', gold: 3 } as CardEffect;
    const { state, player } = board([line, { kind: 'periodicOffer', every: 10, site: 'ruins' } as CardEffect]);
    const row = doctrineDef('theSerapeum' as DoctrineId).effects;
    const ctx = valueContext(state, player);
    const once = scoreEffects([line], ctx);
    expect(once).toBeGreaterThan(0);
    expect(scoreEffects(row, ctx)).toBeCloseTo(once, 6);
    player.pantheon.beliefs = [];
    bumpRevision(state);
    expect(scoreEffects(row, valueContext(state, player))).toBe(0);
  });
});

// --- batch DT15: the religion's limits ------------------------------------------------

/** Puts beliefs in a religion's house, as a prophet would. */
function teach(
  state: GameState,
  religion: Religion,
  follower: readonly string[],
  enhancer: readonly string[] = [],
): void {
  religion.follower = [...follower] as BeliefId[];
  religion.enhancer = [...enhancer] as BeliefId[];
  bumpRevision(state);
}

describe('The Seven Councils (batch DT15)', () => {
  const CARD = 'theSevenCouncils';
  const FOLLOWERS = FOLLOWER_BELIEF_IDS;
  const ENHANCERS = ENHANCER_BELIEF_IDS;

  function board(): { state: GameState; mine: City; faith: Religion } {
    const state = bareState(30, 10);
    state.wars = [];
    const mine = town(state, 5, 5, 6);
    return { state, mine, faith: religionAt(state, mine) };
  }

  it('is one slot in each house, behind the religion gate', () => {
    const def = doctrineDef(CARD as DoctrineId);
    expect(def.needsReligion).toBe(true);
    expect(def.effects).toEqual([
      { kind: 'pantheonSlots', amount: 1, pool: 'follower' },
      { kind: 'pantheonSlots', amount: 1, pool: 'enhancer' },
    ]);
    const { state } = board();
    expect(doctrineBagFor(state, seatWithDevotion(state), 10)).toContain(CARD);
    const bare = bareState(30, 10);
    expect(doctrineBagFor(bare, seatWithDevotion(bare), 10)).not.toContain(CARD);
  });

  it('gives a founder a fourth follower belief and then a third enhancer, in that order', () => {
    const { state, faith } = board();
    teach(state, faith, FOLLOWERS.slice(0, 3), ENHANCERS.slice(0, 2));
    expect(nextBeliefPool(state, faith)).toBeNull();
    hold(state, CARD);
    expect(poolSlotsFor(state, faith, 'follower')).toBe(poolSlots('follower') + 1);
    expect(poolSlotsFor(state, faith, 'enhancer')).toBe(poolSlots('enhancer') + 1);
    // One ladder: the follower house comes first, though the enhancers were full too.
    expect(nextBeliefPool(state, faith)).toBe('follower');
    teach(state, faith, FOLLOWERS.slice(0, 4), ENHANCERS.slice(0, 2));
    expect(nextBeliefPool(state, faith)).toBe('enhancer');
    teach(state, faith, FOLLOWERS.slice(0, 4), ENHANCERS.slice(0, 3));
    expect(nextBeliefPool(state, faith)).toBeNull();
  });

  it('lets a prophet draw the fourth follower belief through the reducer', () => {
    const { state, faith, mine } = board();
    teach(state, faith, FOLLOWERS.slice(0, 3), ENHANCERS.slice(0, 2));
    const prophet = createUnit(state, 0, 'prophet', mine.col + 1, mine.row);
    bumpRevision(state);
    expect(gainBeliefError(state, 0, prophet.id)).toContain('has all the beliefs it will hold');
    hold(state, CARD);
    expect(gainBeliefError(state, 0, prophet.id)).toBeNull();
    const result = applyCommand(state, { type: 'gainBelief', playerId: 0, unitId: prophet.id });
    expect(result.ok).toBe(true);
    expect(seat(state).pantheon.pending?.pool).toBe('follower');
  });

  it('gives no god’s place, because a row with a pool is room in the religion', () => {
    const { state } = board();
    const before = pantheonSlots(state, 0);
    hold(state, CARD);
    expect(pantheonSlots(state, 0)).toBe(before);
  });

  it('counts only for the religion its holder founded, of those it holds (batch DT19c)', () => {
    const state = bareState(30, 10);
    state.wars = [];
    const mine = town(state, 5, 5, 6);
    const taken = town(state, 20, 5, 6, 1);
    const own = religionAt(state, mine);
    const other = religionAt(state, taken);
    taken.ownerId = 0;
    bumpRevision(state);
    expect(heldReligions(state, 0).map((religion) => religion.id)).toEqual([own.id, other.id]);
    hold(state, CARD);
    expect(poolSlotsFor(state, own, 'follower')).toBe(poolSlots('follower') + 1);
    expect(poolSlotsFor(state, own, 'enhancer')).toBe(poolSlots('enhancer') + 1);
    // Only a founder can teach, so the captor's card gives the old founder no room.
    expect(poolSlotsFor(state, other, 'follower')).toBe(poolSlots('follower'));
    expect(poolSlotsFor(state, other, 'enhancer')).toBe(poolSlots('enhancer'));
  });

  it('gives the old founder’s prophets no room from a captor’s card', () => {
    const { state, faith, mine } = board();
    teach(state, faith, FOLLOWERS.slice(0, 3), ENHANCERS.slice(0, 2));
    const prophet = createUnit(state, 0, 'prophet', 12, 5);
    mine.ownerId = 1;
    bumpRevision(state);
    hold(state, CARD, 1);
    expect(heldReligions(state, 1).map((religion) => religion.id)).toEqual([faith.id]);
    expect(poolSlotsFor(state, faith, 'follower')).toBe(poolSlots('follower'));
    expect(nextBeliefPool(state, faith)).toBeNull();
    expect(gainBeliefError(state, 0, prophet.id)).toContain('has all the beliefs it will hold');
  });

  it('stays with a founder that loses its holy city, as its prophets can still teach', () => {
    const { state, faith, mine } = board();
    hold(state, CARD);
    teach(state, faith, FOLLOWERS.slice(0, 3), ENHANCERS.slice(0, 2));
    town(state, 12, 5, 4);
    const prophet = createUnit(state, 0, 'prophet', 12, 5);
    mine.ownerId = 1;
    bumpRevision(state);
    expect(poolSlotsFor(state, faith, 'follower')).toBe(poolSlots('follower') + 1);
    expect(nextBeliefPool(state, faith)).toBe('follower');
    expect(gainBeliefError(state, 0, prophet.id)).toBeNull();
  });

  it('says what it does', () => {
    expect(describeCard(CARD as DoctrineId).map((clause) => stripRefs(clause.text))).toEqual([
      'your religion may hold one more follower belief',
      'your religion may hold one more enhancer belief',
    ]);
  });

  it('prices each slot at a share of the best belief left in that house', () => {
    const { state, mine, faith } = board();
    teach(state, faith, FOLLOWERS.slice(0, 1));
    addBuilding(state, mine, 'temple');
    bumpRevision(state);
    const ctx = valueContext(state, seat(state));
    const best = (pool: 'follower' | 'enhancer'): number =>
      Math.max(
        0,
        ...religionBeliefPool(faith, pool).map((id) => scoreEffects(beliefDef(id).effects ?? [], ctx)),
      );
    expect(best('follower')).toBeGreaterThan(0);
    const row = doctrineDef(CARD as DoctrineId).effects;
    expect(scoreEffects(row, ctx)).toBeCloseTo(
      ctx.ai.score.devotion.beliefSlotShare * (best('follower') + best('enhancer')),
      6,
    );
  });

  it('prices nothing for a seat that cannot teach the religion it holds, and keeps a founder’s price', () => {
    const { state, mine } = board();
    town(state, 20, 5, 6, 1);
    const row = doctrineDef(CARD as DoctrineId).effects;
    // Seat 1 founded nothing and takes seat 0's holy city.
    mine.ownerId = 1;
    bumpRevision(state);
    expect(scoreEffects(row, valueContext(state, seat(state, 1)))).toBe(0);
    // Seat 0 founded it and no longer holds it, but its prophets can still teach.
    town(state, 12, 5, 4);
    expect(scoreEffects(row, valueContext(state, seat(state, 0)))).toBeGreaterThan(0);
  });
});

describe('The House of Worship (batch DT15)', () => {
  const CARD = 'theHouseOfWorship';
  const HOUSES = ['mosque', 'wat', 'gurdwara', 'darEMehr'] as const;
  const house = (id: (typeof HOUSES)[number]): PurchaseSubject => ({ kind: 'building', id });

  /** A devout town, a town that follows nothing, and a town of a rival's faith. */
  function board(): { state: GameState; devout: City; pagan: City; heretic: City; faith: Religion; rival: Religion } {
    const state = bareState(40, 10);
    state.wars = [];
    const devout = town(state, 5, 5, 6);
    const pagan = town(state, 12, 5, 6);
    const heretic = town(state, 19, 5, 6);
    const shrine = town(state, 30, 5, 6, 1);
    const faith = religionAt(state, devout);
    const rival = religionAt(state, shrine, [shrine, heretic]);
    seat(state).faithPool = 100_000;
    seat(state).gold = 100_000;
    bumpRevision(state);
    return { state, devout, pagan, heretic, faith, rival };
  }

  it('is one scoped row for each house, behind the religion gate', () => {
    const def = doctrineDef(CARD as DoctrineId);
    expect(def.needsReligion).toBe(true);
    expect(def.effects).toEqual(
      HOUSES.map((building) => ({
        kind: 'unlocksBuilding',
        building,
        scope: { test: 'ownersFaith', keeps: true },
      })),
    );
  });

  it('lets a devout town buy each house, with no belief that opens it', () => {
    const { state, devout, faith } = board();
    expect(faith.follower).toEqual([]);
    for (const id of HOUSES) {
      expect(purchaseError(state, 0, devout.id, house(id), 'faith'), id).toContain('is not open to');
    }
    hold(state, CARD);
    for (const id of HOUSES) {
      expect(purchaseError(state, 0, devout.id, house(id), 'faith'), id).toBeNull();
    }
  });

  it('refuses a town that follows nothing and a town of another faith, in the same words', () => {
    const { state, pagan, heretic } = board();
    hold(state, CARD);
    for (const city of [pagan, heretic]) {
      expect(purchaseError(state, 0, city.id, house('mosque'), 'faith')).toBe(
        'Mosque may be raised only in a city that keeps your faith',
      );
    }
  });

  it('leaves a town of a rival’s faith to that faith’s own beliefs', () => {
    const { state, heretic, pagan, rival } = board();
    teach(state, rival, ['minarets']);
    hold(state, CARD);
    expect(purchaseError(state, 0, heretic.id, house('mosque'), 'faith')).toBeNull();
    expect(purchaseError(state, 0, heretic.id, house('wat'), 'faith')).toBe(
      'Wat may be raised only in a city that keeps your faith',
    );
    // A belief in one town opens no other: the empire's question is not the town's.
    expect(purchaseError(state, 0, pagan.id, house('mosque'), 'faith')).toBe(
      'Mosque may be raised only in a city that keeps your faith',
    );
  });

  it('opens nothing while none of the seat’s towns is devout', () => {
    const { state, devout } = board();
    hold(state, CARD);
    devout.followers = {};
    bumpRevision(state);
    expect(purchaseError(state, 0, devout.id, house('mosque'), 'faith')).toContain('is not open to');
  });

  it('is still bought with faith and never built, and pays what the row says', () => {
    const { state, devout } = board();
    hold(state, CARD);
    expect(purchaseError(state, 0, devout.id, house('mosque'), 'gold')).toBe(
      'A Mosque is bought with faith, not gold',
    );
    expect(buildError(state, 0, 'building', 'mosque')).toBe('Mosque is not built — it is bought');
    const before = seat(state).faithPool;
    const price = explainPurchaseCost(state, 0, devout.id, house('mosque'), 'faith')!;
    const result = applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: devout.id,
      item: house('mosque'),
      currency: 'faith',
    } as Command);
    expect(result.ok).toBe(true);
    expect(devout.buildings).toContain('mosque');
    expect(seat(state).faithPool).toBe(before - price.total);
  });

  it('says what it does, naming the towns', () => {
    const clauses = describeCard(CARD as DoctrineId).map((clause) => stripRefs(clause.text));
    expect(clauses).toHaveLength(HOUSES.length);
    expect(clauses[0]).toContain('unlocks the Mosque in any devout city');
    expect(clauses[3]).toContain('unlocks the Dar-e Mehr in any devout city');
  });

  it('puts a house in the bots’ faith book in a devout town, and only there', () => {
    const { state, devout, pagan } = board();
    const labels = (): string[] =>
      valueContext(state, seat(state)).wants.faith.map((want) => want.label);
    expect(labels().some((label) => label.startsWith('Mosque at '))).toBe(false);
    hold(state, CARD);
    expect(labels()).toEqual(expect.arrayContaining([expect.stringContaining(`Mosque at ${devout.name}`)]));
    expect(labels().some((label) => label.startsWith(`Mosque at ${pagan.name}`))).toBe(false);
  });

  it('prices only the towns it changes', () => {
    const { state, faith } = board();
    const mosque: CardEffect[] = [
      { kind: 'unlocksBuilding', building: 'mosque', scope: { test: 'ownersFaith', keeps: true } },
    ];
    const second = town(state, 26, 5, 4);
    second.followers = { [faith.id]: second.population };
    bumpRevision(state);
    // Two devout towns, and the two towns that do not keep the faith count for nothing.
    const ctx = valueContext(state, seat(state));
    const twice = scoreEffects(mosque, ctx);
    expect(twice).toBeGreaterThan(0);
    // A town that holds one has nothing left to gain, so the same reading halves.
    addBuilding(state, second, 'mosque');
    expect(scoreEffects(mosque, ctx)).toBeCloseTo(twice / 2, 6);
    // A religion holding the belief opens it already, so the row adds nothing.
    teach(state, faith, ['minarets']);
    expect(scoreEffects(mosque, valueContext(state, seat(state)))).toBe(0);
  });
});

describe('The Apostolic Camera (batch DT15)', () => {
  const CARD = 'theApostolicCamera';

  /**
   * Seat 0 holds a religion in its town. Seat 1 has two towns that follow it, one with
   * a Temple, and a third that follows nothing.
   */
  function board(): { state: GameState; mine: City; temple: City; plain: City; pagan: City; faith: Religion } {
    const state = bareState(50, 10);
    state.wars = [];
    const mine = town(state, 5, 5, 8);
    const temple = town(state, 20, 5, 8, 1);
    const plain = town(state, 27, 5, 9, 1);
    const pagan = town(state, 34, 5, 9, 1);
    addBuilding(state, temple, 'temple');
    addBuilding(state, mine, 'temple');
    const faith = religionAt(state, mine, [mine, temple, plain]);
    teach(state, faith, ['cathedralsOfTheSky', 'choirs']);
    return { state, mine, temple, plain, pagan, faith };
  }

  const camera = (state: GameState, playerId = 0) =>
    explainEmpireCardYields(state, playerId).filter((line) => line.card === CARD);

  it('is one rule, behind the religion gate', () => {
    const def = doctrineDef(CARD as DoctrineId);
    expect(def.needsReligion).toBe(true);
    expect(def.effects).toEqual([{ kind: 'rule', rule: 'followerBeliefsPayAbroad' }]);
    expect(describeCard(CARD as DoctrineId).map((clause) => stripRefs(clause.text))).toEqual([
      'your follower beliefs also pay you in every foreign city that follows your religion',
    ]);
  });

  it('pays one labelled line for each foreign town and belief, and none for a town of your own', () => {
    const { state, temple, plain } = board();
    expect(camera(state)).toEqual([]);
    hold(state, CARD);
    const lines = camera(state);
    // Cathedrals of the Sky needs a Temple, so the plain town pays Choirs alone.
    expect(lines.map((line) => line.source)).toEqual([
      'Doctrine · The Apostolic Camera · Cathedrals of the Sky · ' + temple.name,
      'Doctrine · The Apostolic Camera · Choirs · ' + temple.name,
      'Doctrine · The Apostolic Camera · Choirs · ' + plain.name,
    ]);
    expect(lines.map((line) => [line.science, line.culture])).toEqual([
      [2, 2],
      [0, 2], // one culture for each four of eight citizens
      [0, 2], // nine citizens make two whole helpings
    ]);
  });

  it('leaves the owner’s fold as it was', () => {
    const { state, temple, plain } = board();
    const before = [temple, plain].map((city) => explainCity(state, city));
    const cards = [temple, plain].map((city) => explainCardCityYields(state, city));
    const rival = explainEmpireLines(state, 1);
    hold(state, CARD);
    expect([temple, plain].map((city) => explainCity(state, city))).toEqual(before);
    expect([temple, plain].map((city) => explainCardCityYields(state, city))).toEqual(cards);
    expect(explainEmpireLines(state, 1)).toEqual(rival);
  });

  it('banks what the lines say, and the total is the list’s fold', () => {
    const { state } = board();
    const without = foldEmpireLines(explainEmpireLines(state, 0));
    hold(state, CARD);
    const lines = explainEmpireLines(state, 0);
    const paid = lines.filter((line) => line.card === CARD);
    expect(paid.reduce((sum, line) => sum + line.culture, 0)).toBe(6);
    expect(paid.reduce((sum, line) => sum + line.science, 0)).toBe(2);
    const fold = foldEmpireLines(lines);
    expect(fold.culture).toBe(without.culture + 6);
    expect(fold.science).toBe(without.science + 2);
    // The same board without the card banks exactly that much less.
    const { state: plain } = board();
    const report = (game: GameState): number[] => {
      collectYields(game);
      return [seat(game).culturePool, seat(game).sciencePool];
    };
    const [culture, science] = report(plain);
    expect(report(state)).toEqual([culture! + 6, science! + 2]);
  });

  it('pays no hex line, no meter and no percentage', () => {
    const { state, temple, faith } = board();
    at(state, temple.col, temple.row + 1).improvement = 'farm' as never;
    // A hex line, a happiness row, a combat line and a production percentage.
    teach(state, faith, ['harvestBlessing', 'feastDays', 'warriorMonks', 'guildOfTheFaithful']);
    hold(state, CARD);
    expect(camera(state)).toEqual([]);
  });

  it('pays no food or production, because an empire has no bank for them', () => {
    const { state, temple, faith } = board();
    at(state, temple.col, temple.row).freshwater = true;
    teach(state, faith, ['holyWater']);
    hold(state, CARD);
    const lines = camera(state);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.source).toContain(temple.name);
    expect([lines[0]!.faith, lines[0]!.food]).toEqual([1, 0]);
    // The owner still gets both.
    const own = explainCardCityYields(state, temple).find((line) => line.card === 'holyWater')!;
    expect([own.faith, own.food]).toEqual([1, 1]);
  });

  it('counts a foreign town only while it follows a religion the seat holds', () => {
    const { state, plain, pagan, temple } = board();
    hold(state, CARD);
    const named = (): string => camera(state).map((line) => line.source).join();
    expect(named()).not.toContain(pagan.name);
    // A town that turns stops paying this turn, and it pays nothing else in its place.
    plain.followers = {};
    bumpRevision(state);
    expect(named()).not.toContain(plain.name);
    expect(named()).toContain(temple.name);
  });

  it('pays in each religion a seat holds, and stops when it loses the holy city', () => {
    const { state, mine, plain, temple, faith } = board();
    const shrine = town(state, 42, 5, 5, 1);
    const second = religionAt(state, shrine, [shrine, plain]);
    teach(state, second, ['titheHouses']);
    shrine.ownerId = 0;
    bumpRevision(state);
    hold(state, CARD);
    expect(camera(state).map((line) => line.source.split(' · ')[2])).toEqual([
      'Cathedrals of the Sky',
      'Choirs',
      'Tithe Houses',
    ]);
    expect(faith.follower).toHaveLength(2);
    mine.ownerId = 1;
    bumpRevision(state);
    // The first faith's holy city is gone, and the second faith's town remains.
    expect(camera(state).map((line) => line.source.split(' · ')[3])).toEqual([plain.name]);
    expect(temple.ownerId).toBe(1);
    shrine.ownerId = 1;
    bumpRevision(state);
    expect(camera(state)).toEqual([]);
  });

  it('prices what the lines pay today, and what the towns it can still turn would pay', () => {
    const { state, plain, temple, pagan } = board();
    const row = doctrineDef(CARD as DoctrineId).effects;
    const towns = state.cities;
    // With the pagan town gone, every foreign town follows, so nothing is left to turn.
    state.cities = towns.filter((city) => city !== pagan);
    bumpRevision(state);
    const ctx = valueContext(state, seat(state));
    expect(explainFollowerLinesAbroad(state, 0)).toHaveLength(3);
    const today = valueOfYields({ science: 2, culture: 6 }, ctx);
    expect(scoreEffects(row, ctx)).toBeCloseTo(today, 6);
    expect(today).toBeGreaterThan(0);
    // The pagan town could still turn once the seat knows of it, so the card reads more
    // than today's lines.
    state.cities = towns;
    state.visibility[0]!.fill(1);
    bumpRevision(state);
    expect(scoreEffects(row, valueContext(state, seat(state)))).toBeGreaterThan(today);
    // With no follower abroad the lines pay nothing today, and the towns it could turn
    // stand in (batch DT19b). A seat with a religion no longer reads the card at nought.
    temple.followers = {};
    plain.followers = {};
    bumpRevision(state);
    expect(explainFollowerLinesAbroad(state, 0)).toHaveLength(0);
    expect(scoreEffects(row, valueContext(state, seat(state)))).toBeGreaterThan(0);
  });

  it('prices nothing for a seat paid by no religion', () => {
    const { state } = board();
    const row = doctrineDef(CARD as DoctrineId).effects;
    state.religions = [];
    for (const city of state.cities) city.followers = {};
    bumpRevision(state);
    expect(scoreEffects(row, valueContext(state, seat(state)))).toBe(0);
  });

  it('shows in the card’s impact stamp at the offer', () => {
    const { state } = board();
    const offered = foldCardImpact(explainCardImpact(state, 0, { kind: 'doctrine', id: CARD as DoctrineId }));
    expect(offered.culture).toBe(6);
    expect(offered.science).toBe(2);
  });
});
