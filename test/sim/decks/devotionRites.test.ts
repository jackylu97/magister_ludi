/**
 * **Rites are seasons** (batch DV4 of `docs/plans/devotion-themes-triage.md`).
 * `devotion.test.ts` checks the rows against the sheet. This file checks what
 * the batch changed on a small board:
 *
 *   · the season rule (reading 9): the `riteStarted` tally and the `rite`
 *     occasion are raised for a rite with no `atOnce`, and a prophet's rite
 *     over the realm raises both once in each town it reaches;
 *   · the `rite` occasion's facts, the town and its citizens, which The
 *     Psalter reads (reading 19);
 *   · The Rogations, which grows on the tally;
 *   · The Founding Vows' narrower count;
 *   · The Sabbath Laws: the charter, the Rite of the Sabbath, and the second
 *     line of step 14 of a town's yields, which moves the town's production
 *     into culture (reading 20).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived, settleProductionWindfall } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { getTileAt } from '../../../src/sim/map';
import {
  availableRites,
  cityRite,
  empireRiteAt,
  performRiteAt,
  riteError,
  riteTeachingCard,
} from '../../../src/sim/religion';
import { type RiteId, riteDef } from '../../../src/sim/religionData';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  applyCharter,
  describeCard,
  explainCardEmpireYields,
  stripRefs,
  tallyOf,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type DoctrineId,
  type OrderId,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { collectYields } from '../../../src/sim/yields/empire';
import { explainCity, explainProductionMoved, explainSurplusMoved, foldCity } from '../../../src/sim/yields/town';
import { UNACCOUNTED_SOURCE, chipLedgerRows } from '../../../src/ui/cityPanel';
import { at, bareState } from '../improvementHelpers';

const ROGATIONS = 'theRogations' as OrderId;
const PSALTER = 'thePsalter' as OrderId;
const SABBATH_LAWS = 'theSabbathLaws' as OrderId;
const VOWS = 'theFoundingVows' as OrderId;
const SABBATH = 'riteOfTheSabbath' as RiteId;
const FASTING = 'riteOfFasting' as RiteId;

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for a seat, with an empty queue. */
function town(state: GameState, owner: number, col: number, row: number, population = 4): City {
  const city = foundCityAt(state, owner, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * A religion founded by seat 0 whose holy site is this town's centre, with
 * every citizen of the given towns following it. Seat 0 holds the site, so
 * it is paid by the religion and its following towns are devout.
 */
function religionAt(state: GameState, site: City, followers: readonly City[]): number {
  const tile = getTileAt(state.map, site.col, site.row)!;
  tile.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: 0,
    name: 'The Testament',
    pantheon: [],
    follower: [],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: site.col, row: site.row },
  } as never);
  const religion = state.religions.length - 1;
  for (const city of followers) city.followers = { [religion]: city.population };
  bumpRevision(state);
  return religion;
}

/** Seat 0 with a deep faith bank and The Fast's rite known. */
function faithful(state: GameState): Player {
  const player = playerById(state, 0)!;
  player.faithPool = 100_000;
  if (!player.charteredRites.includes(FASTING)) player.charteredRites.push(FASTING);
  bumpRevision(state);
  return player;
}

/** What one card's empire lines pay this seat, in one voice. */
function empirePays(state: GameState, card: OrderId, voice: 'faith' | 'culture'): number {
  return explainCardEmpireYields(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

// --- the rows -----------------------------------------------------------------

describe('the three rows', () => {
  it('deals The Rogations, The Sabbath Laws and The Psalter to a Devotion seat', () => {
    const mine = ordersForDecks(['devotion']);
    for (const id of [ROGATIONS, SABBATH_LAWS, PSALTER]) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(mine, id).toContain(id);
      expect(orderDef(id).type, id).toBe('civic');
      expect(orderDef(id).rarity, id).toBe('uncommon');
    }
    expect(orderDef(ROGATIONS).band).toBe(0);
    expect(orderDef(SABBATH_LAWS).band).toBe(2);
    expect(orderDef(PSALTER).band).toBe(3);
    expect(orderDef(SABBATH_LAWS).charter?.unlocks.rites).toEqual([SABBATH]);
  });

  it('prints every row and the new rite through the describers, with no keyword mark left raw', () => {
    for (const id of [ROGATIONS, SABBATH_LAWS, PSALTER, SABBATH]) {
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) {
        const text = stripRefs(clause.text);
        expect(text.trim(), id).not.toBe('');
        expect(text, id).not.toContain('[[');
      }
    }
    const sabbath = describeCard(SABBATH).map((clause) => stripRefs(clause.text));
    expect(sabbath).toEqual(['this city builds nothing and gains its production as culture instead']);
    // The Psalter's clause names the devout town and the town's size.
    const psalter = describeCard(PSALTER).map((clause) => stripRefs(clause.text)).join(' ');
    expect(psalter).toContain('devout');
    expect(psalter).toContain('population');
  });
});

// --- the season rule ------------------------------------------------------------

describe('a rite started is a season', () => {
  it('counts a rite that lasts, and not the Votive Offering, which acts at once', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = faithful(state);
    slot(state, 0, ROGATIONS);
    slot(state, 0, 'theVotiveGifts' as OrderId);
    city.queue = [{ kind: 'building', id: 'granary' as never }];
    bumpRevision(state);
    expect(riteError(state, 0, city.id, 'votiveOffering')).toBeNull();
    performRiteAt(state, player, city, 'votiveOffering');
    expect(tallyOf(player.statecraft, ROGATIONS)).toBe(0);
    city.timed = [];
    bumpRevision(state);
    performRiteAt(state, player, city, FASTING);
    expect(tallyOf(player.statecraft, ROGATIONS)).toBe(1);
  });

  it('does not count the Restoring of the Host, which acts at once either', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = faithful(state);
    slot(state, 0, ROGATIONS);
    slot(state, 0, 'theHostRestored' as OrderId);
    expect(riteDef('restoringOfTheHost').atOnce).toBeDefined();
    expect(riteError(state, 0, city.id, 'restoringOfTheHost')).toBeNull();
    performRiteAt(state, player, city, 'restoringOfTheHost');
    expect(cityRite(state, city)).toBe('restoringOfTheHost');
    expect(tallyOf(player.statecraft, ROGATIONS)).toBe(0);
  });

  it('counts a prophet’s rite over the realm once in each town it reaches', () => {
    const state = bareState(24, 10);
    const first = town(state, 0, 4, 5);
    town(state, 0, 12, 5);
    town(state, 0, 20, 5);
    // A rival's town is not reached and is not counted.
    town(state, 1, 8, 2);
    const player = faithful(state);
    slot(state, 0, ROGATIONS);
    slot(state, 0, VOWS);
    const prophet = createUnit(state, 0, 'prophet', first.col, first.row);
    bumpRevision(state);
    const done = empireRiteAt(state, player, prophet, FASTING);
    expect(done.cities).toHaveLength(3);
    expect(tallyOf(player.statecraft, ROGATIONS)).toBe(3);
    // The Founding Vows counts the seasons too: three, past its goal of two.
    expect(tallyOf(player.statecraft, VOWS)).toBe(3);
  });
});

// --- the rite moment's facts ----------------------------------------------------

describe('the rite moment carries its town', () => {
  it('composes The Psalter’s grant from the town and its citizens', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5, 6);
    religionAt(state, city, [city]);
    slot(state, 0, PSALTER);
    const payout = windfallPayout(state, 0, 'rite', 0, 0, { townId: city.id, population: 6 });
    const science = payout.grants.filter((grant) => grant.yield === 'science');
    const culture = payout.grants.filter((grant) => grant.yield === 'culture');
    expect(science.reduce((sum, grant) => sum + grant.amount, 0)).toBe(30);
    expect(culture.reduce((sum, grant) => sum + grant.amount, 0)).toBe(30);
    // A moment that names no town never satisfies the rider's town test.
    expect(windfallPayout(state, 0, 'rite', 0, 0, { population: 6 }).grants).toEqual([]);
  });

  it('pays The Psalter in a devout town when a season starts there', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5, 6);
    religionAt(state, city, [city]);
    const player = faithful(state);
    slot(state, 0, PSALTER);
    const science = player.sciencePool;
    performRiteAt(state, player, city, FASTING);
    expect(player.sciencePool - science).toBe(30);
  });

  it('pays The Psalter nothing in a town that is not devout, or for an offering', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5, 6);
    const player = faithful(state);
    slot(state, 0, PSALTER);
    slot(state, 0, 'theVotiveGifts' as OrderId);
    // No religion yet: the town is not devout.
    let science = player.sciencePool;
    performRiteAt(state, player, city, FASTING);
    expect(player.sciencePool - science).toBe(0);
    // Devout now, but the offering is not a season.
    religionAt(state, city, [city]);
    city.timed = [];
    city.queue = [{ kind: 'building', id: 'granary' as never }];
    bumpRevision(state);
    science = player.sciencePool;
    performRiteAt(state, player, city, 'votiveOffering');
    expect(player.sciencePool - science).toBe(0);
  });

  it('pays The Psalter in each devout town a prophet’s rite reaches, by that town’s size', () => {
    const state = bareState(24, 10);
    const first = town(state, 0, 4, 5, 6);
    const second = town(state, 0, 12, 5, 2);
    const third = town(state, 0, 20, 5, 9);
    // The first two follow the religion; the third does not.
    religionAt(state, first, [first, second]);
    const player = faithful(state);
    slot(state, 0, PSALTER);
    const prophet = createUnit(state, 0, 'prophet', first.col, first.row);
    bumpRevision(state);
    const science = player.sciencePool;
    empireRiteAt(state, player, prophet, FASTING);
    expect(player.sciencePool - science).toBe(5 * 6 + 5 * 2);
    expect(third.population).toBe(9);
  });

  it('reports the empire rite through the command, as a town’s rite is reported', () => {
    const state = bareState(24, 10);
    const first = town(state, 0, 4, 5);
    town(state, 0, 12, 5);
    const player = faithful(state);
    slot(state, 0, ROGATIONS);
    const prophet = createUnit(state, 0, 'prophet', first.col, first.row);
    bumpRevision(state);
    const result = applyCommand(state, { type: 'empireRite', playerId: 0, unitId: prophet.id, rite: FASTING });
    expect(result.ok).toBe(true);
    expect(tallyOf(player.statecraft, ROGATIONS)).toBe(2);
  });
});

// --- The Rogations --------------------------------------------------------------

describe('The Rogations', () => {
  it('starts at +2 faith and +2 culture and grows by one of each for every season started while seated', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = faithful(state);
    // A season before the card is seated is not counted.
    performRiteAt(state, player, city, FASTING);
    city.timed = [];
    slot(state, 0, ROGATIONS);
    expect(empirePays(state, ROGATIONS, 'faith')).toBe(2);
    expect(empirePays(state, ROGATIONS, 'culture')).toBe(2);
    for (let n = 0; n < 2; n++) {
      performRiteAt(state, player, city, FASTING);
      city.timed = [];
    }
    bumpRevision(state);
    expect(empirePays(state, ROGATIONS, 'faith')).toBe(4);
    expect(empirePays(state, ROGATIONS, 'culture')).toBe(4);
  });
});

// --- The Sabbath Laws -------------------------------------------------------------

describe('The Sabbath Laws and the Rite of the Sabbath', () => {
  /** A town with production to move, keeping nothing yet. */
  function sabbathTown(): { state: GameState; player: Player; city: City } {
    const state = bareState();
    const city = town(state, 0, 5, 5, 6);
    for (const building of ['workshop', 'forge']) {
      if (!city.buildings.includes(building as never)) city.buildings.push(building as never);
    }
    city.queue = [{ kind: 'building', id: 'granary' as never }];
    refreshCityDerived(state, city);
    bumpRevision(state);
    const player = faithful(state);
    return { state, player, city };
  }

  it('is taught by its charter and by nothing else', () => {
    const state = bareState();
    town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    expect(riteDef(SABBATH).byCard).toBe(true);
    expect(riteDef(SABBATH).duration).toBe(10);
    expect(riteTeachingCard(SABBATH)).toBe(SABBATH_LAWS);
    expect(availableRites(state, 0)).not.toContain(SABBATH);
    applyCharter(player, SABBATH_LAWS);
    bumpRevision(state);
    expect(availableRites(state, 0)).toContain(SABBATH);
  });

  it('moves all of a town’s production into culture while the town keeps it', () => {
    const { state, player, city } = sabbathTown();
    const before = foldCity(state, city, [], city.queue[0]);
    expect(before.production).toBeGreaterThan(0);
    player.charteredRites.push(SABBATH);
    bumpRevision(state);
    performRiteAt(state, player, city, SABBATH);
    expect(cityRite(state, city)).toBe(SABBATH);
    const after = foldCity(state, city, [], city.queue[0]);
    expect(after.production).toBe(0);
    expect(after.culture).toBeCloseTo(before.culture + before.production, 9);
    // The other voices are untouched.
    expect(after.food).toBe(before.food);
    expect(after.science).toBe(before.science);
    // One labelled line, named for the rite.
    const lines = explainProductionMoved(state, city, before);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.card).toBe(SABBATH);
    expect(lines[0]!.amount).toBe(before.production);
    expect(lines[0]!.source).toContain('Rite of the Sabbath');
  });

  it('banks none of it into the build, and still takes production given at once', () => {
    const { state, player, city } = sabbathTown();
    player.charteredRites.push(SABBATH);
    bumpRevision(state);
    performRiteAt(state, player, city, SABBATH);
    city.hammerBasket = 0;
    bumpRevision(state);
    collectYields(state);
    expect(city.hammerBasket).toBe(0);
    // A production windfall goes into the basket directly (the reading's
    // purchase and windfall clause). Three hammers do not finish a granary.
    city.hammerBasket += 3;
    settleProductionWindfall(state, city);
    expect(city.hammerBasket).toBe(3);
  });

  it('moves nothing in a town whose production a gate stops', () => {
    const { state, player, city } = sabbathTown();
    player.charteredRites.push(SABBATH);
    bumpRevision(state);
    performRiteAt(state, player, city, SABBATH);
    const kept = foldCity(state, city, [], city.queue[0]);
    city.unrest = { target: 10, progress: 0, unguarded: 0 };
    bumpRevision(state);
    const gated = foldCity(state, city, [], city.queue[0]);
    expect(gated.production).toBe(0);
    // Unrest stops culture too, so nothing the rite moved survives the gate.
    expect(gated.culture).toBe(0);
    expect(explainProductionMoved(state, city, gated)).toEqual([]);
    expect(kept.culture).toBeGreaterThan(0);
  });

  it('moves the food a card moved into production on into culture', () => {
    const { state, player, city } = sabbathTown();
    // The Laws of Lord Shang is a Dominion Doctrine: a town's food surplus goes
    // into a military unit it builds.
    player.statecraft.doctrines.push('theLawsOfLordShang' as DoctrineId);
    city.queue = [{ kind: 'unit', id: 'warrior' as never }];
    refreshCityDerived(state, city);
    bumpRevision(state);
    const before = foldCity(state, city, [], city.queue[0]);
    const surplus = explainSurplusMoved(state, city, before, city.queue[0]);
    expect(surplus).toHaveLength(1);
    expect(surplus[0]!.amount).toBeGreaterThan(0);
    player.charteredRites.push(SABBATH);
    bumpRevision(state);
    performRiteAt(state, player, city, SABBATH);
    const after = foldCity(state, city, [], city.queue[0]);
    expect(after.production).toBe(0);
    // The food the card moved is in `before.production` already, and all of
    // it is culture now. The food basket still gains none of it.
    expect(after.culture).toBeCloseTo(before.culture + before.production, 9);
    expect(explainSurplusMoved(state, city, after, city.queue[0])).toEqual(surplus);
  });

  it('prints the move on the city panel, so each chip still adds up', () => {
    const { state, player, city } = sabbathTown();
    player.charteredRites.push(SABBATH);
    bumpRevision(state);
    performRiteAt(state, player, city, SABBATH);
    const quote = explainCity(state, city);
    const production = chipLedgerRows(state, city, quote, 'production');
    const culture = chipLedgerRows(state, city, quote, 'culture');
    for (const ledger of [production, culture]) {
      expect(ledger.rows.map((row) => row.label)).not.toContain(UNACCOUNTED_SOURCE);
    }
    expect(production.total).toBe(0);
    const out = production.rows.find((row) => row.kind === 'moved' && row.amount < 0);
    const into = culture.rows.find((row) => row.kind === 'moved');
    expect(out).toBeDefined();
    expect(into).toBeDefined();
    expect(into!.amount).toBe(-out!.amount);
    expect(into!.label).toBe(out!.label);
  });
});
