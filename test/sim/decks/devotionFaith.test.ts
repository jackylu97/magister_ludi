/**
 * **The faith's reach** (batch DV5 of `docs/plans/devotion-themes-triage.md`).
 * `devotion.test.ts` checks the rows against the sheet. This file checks what
 * the batch changed on a small board:
 *
 *   · The Parishes (reading 21): the founding moment carries the town's
 *     citizens, a lump can be a share of them, and the founding seam hands
 *     `payWindfallGrants` a presser, so a town founded under the card follows
 *     the founder's religion from its first turn;
 *   · The Confessors (reading 22): a town of another empire that follows your
 *     religion is a sight source for you, at the base city sight;
 *   · Commission: The State Church (reading 23): the `every` switch on a
 *     `citiesAdmitted` goal, and the lasting authority discount it pays.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionFigure, commissionProgress, runCommissions } from '../../../src/sim/commissions';
import { getTileAt } from '../../../src/sim/map';
import { explainAuthority } from '../../../src/sim/meters';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  bumpRevision,
  cityReligion,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cityScopeAdmits,
  commissionFulfilledTurn,
  describeCard,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { commissionCounterWords, commissionGoalWords } from '../../../src/sim/statecraft/describers';
import {
  type CommissionGoal,
  type OrderId,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { isVisibleTo, recomputeVisibility, sightSources } from '../../../src/sim/visibility';
import { at, bareState } from '../improvementHelpers';

const PARISHES = 'theParishes' as OrderId;
const STATE_CHURCH = 'commissionTheStateChurch' as OrderId;
const CONFESSORS = 'theConfessors' as OrderId;
const DEVOUT = { test: 'ownersFaith', keeps: true } as const;

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, card: string): void {
  const id = card as OrderId;
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
 * A religion founded by `owner` whose holy site is this town's centre. The
 * owner holds the site, so it is paid by the religion. Every citizen of the
 * given towns follows it.
 */
function religionAt(state: GameState, site: City, followers: readonly City[], owner = site.ownerId): number {
  const tile = getTileAt(state.map, site.col, site.row)!;
  tile.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: owner,
    name: `The Testament ${state.religions.length}`,
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

/** The describer's clauses for a card, keyword marks stripped. */
function words(id: string): string[] {
  return describeCard(id as OrderId).map((clause) => stripRefs(clause.text));
}

// --- the rows -----------------------------------------------------------------

describe('the three rows', () => {
  it('deals The Parishes, The State Church and The Confessors to a Devotion seat at Tier II', () => {
    const mine = ordersForDecks(['devotion']);
    for (const id of [PARISHES, STATE_CHURCH, CONFESSORS]) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(mine, id).toContain(id);
      expect(orderDef(id).band, id).toBe(2);
      expect(orderDef(id).rarity, id).toBe('uncommon');
    }
    expect(orderDef(PARISHES).type).toBe('civic');
    expect(orderDef(STATE_CHURCH).type).toBe('wildcard');
    expect(orderDef(CONFESSORS).type).toBe('military');
  });

  it('prints every row through the describers in plain words', () => {
    expect(words(PARISHES)).toEqual(['founding a city turns every citizen of that city to your religion']);
    expect(words(CONFESSORS)).toEqual([
      'every city of another empire that follows your religion shares its sight with you',
    ]);
    const church = words(STATE_CHURCH).join(' ');
    expect(church).toContain('hold at least 6 cities, all of them devout, at the same time');
    for (const id of [PARISHES, STATE_CHURCH, CONFESSORS]) {
      for (const clause of words(id)) expect(clause, id).not.toContain('[[');
    }
  });
});

// --- The Parishes -----------------------------------------------------------------

describe('The Parishes', () => {
  it('presses one convert’s price for each citizen the town is founded with', () => {
    // The row's figure is a share of the moment: at least one convert for
    // each citizen, so every citizen turns. A change to the price of a
    // convert fails here before it fails a game.
    const grant = orderDef(PARISHES).effects[0]!;
    expect(grant.kind).toBe('windfallRider');
    if (grant.kind !== 'windfallRider') return;
    expect(grant.grant?.fromOccasion).toBe('population');
    expect(grant.grant?.pressure?.range).toBe(0);
    expect(grant.grant?.pressure?.amount).toBeGreaterThanOrEqual(RULES.religion.pressurePerConvert);

    const state = bareState();
    slot(state, 0, PARISHES);
    const payout = windfallPayout(state, 0, 'found', 0, 0, { population: 3 });
    expect(payout.pressure.map((lump) => ({ amount: lump.amount, range: lump.range }))).toEqual([
      { amount: 30, range: 0 },
    ]);
    // A moment that does not carry the citizens presses nothing.
    expect(windfallPayout(state, 0, 'found').pressure).toEqual([]);
  });

  it('founds a town that follows your religion from its first turn', () => {
    const state = bareState(16, 10);
    const capital = town(state, 0, 3, 5);
    const religion = religionAt(state, capital, [capital]);
    slot(state, 0, PARISHES);
    const founded = foundCityAt(state, 0, at(state, 10, 5));
    expect(founded.followers?.[religion]).toBe(founded.population);
    expect(cityReligion(founded)).toBe(religion);
    expect(cityScopeAdmits(state, founded, DEVOUT, 0)).toBe(true);
    // One convert's price for each citizen, and nothing left over in the bank.
    expect(founded.pressureBank).toBeUndefined();
  });

  it('turns every citizen of a town founded larger', () => {
    // The Seed Grain founds a town with one extra citizen.
    const state = bareState(16, 10);
    const capital = town(state, 0, 3, 5);
    const religion = religionAt(state, capital, [capital]);
    slot(state, 0, PARISHES);
    slot(state, 0, 'theSeedGrain');
    const founded = foundCityAt(state, 0, at(state, 10, 5));
    expect(founded.population).toBe(2);
    expect(founded.followers?.[religion]).toBe(2);
    expect(cityReligion(founded)).toBe(religion);
  });

  it('works through the settler’s command', () => {
    const state = bareState(16, 10);
    const capital = town(state, 0, 3, 5);
    const religion = religionAt(state, capital, [capital]);
    slot(state, 0, PARISHES);
    const settler = createUnit(state, 0, 'settler', 10, 5);
    bumpRevision(state);
    const result = applyCommand(state, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id });
    expect(result.ok).toBe(true);
    const founded = state.cities.find((city) => city.col === 10 && city.row === 5)!;
    expect(cityReligion(founded)).toBe(religion);
  });

  it('presses nothing for an empire that no religion pays, or without the card', () => {
    const state = bareState(16, 10);
    town(state, 0, 3, 5);
    slot(state, 0, PARISHES);
    const bare = foundCityAt(state, 0, at(state, 10, 5));
    expect(bare.followers).toBeUndefined();
    expect(bare.pressureBank).toBeUndefined();

    const other = bareState(16, 10);
    const capital = town(other, 0, 3, 5);
    religionAt(other, capital, [capital]);
    const unseated = foundCityAt(other, 0, at(other, 10, 5));
    expect(cityReligion(unseated)).toBeNull();
  });

  it('reaches only the town just founded', () => {
    const state = bareState(20, 10);
    const capital = town(state, 0, 3, 5);
    const religion = religionAt(state, capital, [capital]);
    const rival = town(state, 1, 14, 5);
    slot(state, 0, PARISHES);
    foundCityAt(state, 0, at(state, 10, 5));
    expect(rival.followers?.[religion]).toBeUndefined();
    expect(rival.pressureBank).toBeUndefined();
  });
});

// --- The Confessors ---------------------------------------------------------------

describe('The Confessors', () => {
  /** Seat 0's holy city at (3, 5) and seat 1's town at (16, 5), which follows seat 0's religion. */
  function board(): { state: GameState; home: City; abroad: City; religion: number } {
    const state = bareState(24, 10);
    const home = town(state, 0, 3, 5);
    const abroad = town(state, 1, 16, 5);
    const religion = religionAt(state, home, [home, abroad]);
    recomputeVisibility(state, 0);
    return { state, home, abroad, religion };
  }

  it('sees through a foreign town that follows your religion, at the base city sight', () => {
    const { state, abroad } = board();
    expect(isVisibleTo(state, 0, abroad.col, abroad.row)).toBe(false);
    const before = sightSources(state, 0).length;
    slot(state, 0, CONFESSORS);
    recomputeVisibility(state, 0);
    expect(sightSources(state, 0)).toHaveLength(before + 1);
    expect(isVisibleTo(state, 0, abroad.col, abroad.row)).toBe(true);
    // Two hexes out is the base city sight; three is past it.
    const sight = RULES.visibility.citySight;
    expect(isVisibleTo(state, 0, abroad.col + sight, abroad.row)).toBe(true);
    expect(isVisibleTo(state, 0, abroad.col + sight + 1, abroad.row)).toBe(false);
  });

  it('adds none of the owner’s sight bonuses', () => {
    const { state, abroad } = board();
    // Militia Levies gives seat 1's towns +1 sight radius.
    slot(state, 1, 'militiaLevies');
    slot(state, 0, CONFESSORS);
    const owners = sightSources(state, 1).find((source) => source.tile === at(state, abroad.col, abroad.row));
    const borrowed = sightSources(state, 0).find((source) => source.tile === at(state, abroad.col, abroad.row));
    expect(owners?.radius).toBe(RULES.visibility.citySight + 1);
    expect(borrowed?.radius).toBe(RULES.visibility.citySight);
  });

  it('adds no source for a foreign town that does not follow your religion', () => {
    const { state, abroad } = board();
    abroad.followers = {};
    bumpRevision(state);
    const before = sightSources(state, 0).length;
    slot(state, 0, CONFESSORS);
    expect(sightSources(state, 0)).toHaveLength(before);
  });

  it('adds no second source for your own towns', () => {
    const { state } = board();
    const before = sightSources(state, 0).length;
    slot(state, 0, CONFESSORS);
    // One foreign town follows, so one more source, and none for the home town.
    expect(sightSources(state, 0)).toHaveLength(before + 1);
  });

  it('lets you meet the town’s owner, as any sight does', () => {
    const { state } = board();
    const seat = playerById(state, 0)!;
    seat.metSeats = [];
    // Without the card, seat 0 sees nothing of seat 1.
    recomputeVisibility(state, 0);
    expect(seat.metSeats).not.toContain(1);
    slot(state, 0, CONFESSORS);
    recomputeVisibility(state, 0);
    expect(seat.metSeats).toContain(1);
  });
});

// --- Commission: The State Church -------------------------------------------------

describe('Commission: The State Church', () => {
  const GOAL: CommissionGoal = {
    kind: 'reached',
    figure: 'citiesAdmitted',
    count: 6,
    admits: DEVOUT,
    every: true,
  };

  /** Six devout towns of seat 0, in a row, the first of them its holy city. */
  function realm(): { state: GameState; towns: City[]; religion: number } {
    const state = bareState(40, 10);
    const towns = [3, 9, 15, 21, 27, 33].map((col) => town(state, 0, col, 5, 4));
    const religion = religionAt(state, towns[0]!, towns);
    return { state, towns, religion };
  }

  /** What one town costs seat 0's writ, as a positive figure. */
  function townWrit(state: GameState, city: City): number {
    const line = explainAuthority(state, 0).find(
      (entry) => entry.part === 'cost' && entry.source.startsWith(city.name),
    );
    if (!line) throw new Error(`no writ line for ${city.name}`);
    return 0 - line.value;
  }

  it('asks for six towns, every one of them devout', () => {
    expect(orderDef(STATE_CHURCH).commission!.goals).toEqual([GOAL]);
    expect(commissionGoalWords(GOAL)).toBe('hold at least 6 cities, all of them devout, at the same time');
    expect(commissionCounterWords(GOAL)).toBe('cities, all of them devout');
  });

  it('counts the towns only while every town held is devout', () => {
    const { state, religion } = realm();
    expect(commissionFigure(state, 0, 'citiesAdmitted', GOAL)).toBe(6);
    // A seventh town that follows nothing: the count is nought.
    const seventh = town(state, 0, 37, 2, 4);
    expect(commissionFigure(state, 0, 'citiesAdmitted', GOAL)).toBe(0);
    // Without the switch the same goal counts the six devout towns.
    expect(commissionFigure(state, 0, 'citiesAdmitted', { ...GOAL, every: undefined })).toBe(6);
    // It turns, and all seven count.
    seventh.followers = { [religion]: seventh.population };
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'citiesAdmitted', GOAL)).toBe(7);
  });

  it('is not met by five devout towns of five', () => {
    const state = bareState(40, 10);
    const towns = [3, 9, 15, 21, 27].map((col) => town(state, 0, col, 5, 4));
    religionAt(state, towns[0]!, towns);
    slot(state, 0, STATE_CHURCH);
    expect(commissionProgress(state, 0, STATE_CHURCH)[0]).toMatchObject({ have: 5, need: 6, met: false });
    expect(runCommissions(state)).toEqual([]);
  });

  it('leaves devout towns one authority cheaper for good, minimum one', () => {
    const { state, towns, religion } = realm();
    const before = towns.map((city) => townWrit(state, city));
    slot(state, 0, STATE_CHURCH);
    const player = playerById(state, 0)!;
    expect(runCommissions(state).map((report) => report.card)).toEqual([STATE_CHURCH]);
    expect(commissionFulfilledTurn(player.statecraft, STATE_CHURCH)).toBe(state.turn);
    bumpRevision(state);
    for (const [index, city] of towns.entries()) {
      const was = before[index]!;
      // A discount never charges a free town, and never takes one below one.
      const expected = was === 0 ? 0 : Math.max(Math.min(was, 1), was - 1);
      expect(townWrit(state, city), city.name).toBe(expected);
    }
    expect(before.some((was) => was > 1)).toBe(true);
    // It lasts: a town that stops following pays the full price again, and
    // one that turns back is cheaper again.
    const last = towns[towns.length - 1]!;
    const full = before[towns.length - 1]!;
    last.followers = {};
    bumpRevision(state);
    expect(townWrit(state, last)).toBe(full);
    last.followers = { [religion]: last.population };
    bumpRevision(state);
    expect(townWrit(state, last)).toBe(Math.max(Math.min(full, 1), full - 1));
  });
});
