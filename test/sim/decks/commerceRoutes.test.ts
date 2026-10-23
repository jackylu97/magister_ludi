/**
 * **Commerce batch T3, routes and posts** (`docs/plans/commerce-themes-
 * triage.md`, readings 12 to 18). The sheet's sync test (`commerce.test.ts`)
 * checks the six rows against the sheet. This file checks what the batch
 * built:
 *
 *   · The Return Leg: a home route pays its origin a copy of what it pays its
 *     destination, as labelled lines at step 6 of the origin's fold;
 *   · The Fondaci: the `postEstablished` moment, paid once for each post of
 *     the empire on the turn its term ends, at home or abroad, by the sweep in
 *     the `roadJoinings` phase;
 *   · The Foreign Factor: the citizens of foreign towns holding your paying
 *     post, a quarter of each town, rounded down town by town;
 *   · The Lingua Franca: every live route in the world;
 *   · The Admiralty of Trade: a route whose destination holds your paying post
 *     has no range limit, by land or by sea;
 *   · The Champagne Fairs: `population` narrowed by a town scope, passed in by
 *     a periodic boon.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../../src/sim/cities';
import { type Command, applyCommand } from '../../../src/sim/commands';
import {
  cityReturnLegYields,
  cityRouteYields,
  explainRouteYield,
  foldRouteYield,
} from '../../../src/sim/routeYields';
import { postEstablishedThisTurn } from '../../../src/sim/routes';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { countOf, runPeriodicBoons } from '../../../src/sim/statecraft/evaluator';
import { periodicProbe } from '../../../src/sim/statecraft/describers';
import { type OrderId, orderDef } from '../../../src/sim/statecraftData';
import { routeStartable, runPostEstablishments } from '../../../src/sim/trade';
import { END_OF_TURN_PHASES, emptyTurnReport } from '../../../src/sim/turn';
import { openWar } from '../../../src/sim/wars';
import { explainEmpireCardYields } from '../../../src/sim/yields/empire';
import { cityYieldPercents, explainCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

const TERM = Math.floor(RULES.trade.routeTurns);

const RETURN_LEG = 'theReturnLeg' as OrderId;
const FONDACI = 'theFondaci' as OrderId;
const FOREIGN_FACTOR = 'theForeignFactor' as OrderId;
const LINGUA_FRANCA = 'theLinguaFranca' as OrderId;
const ADMIRALTY = 'theAdmiraltyOfTrade' as OrderId;
const CHAMPAGNE = 'theChampagneFairs' as OrderId;

/** Seats an Order in a chair, which is what makes it live. */
function seat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/**
 * Leaves a draft waiting in front of the seat, so culture a test pays stays in
 * the pool: a second draft is never dealt while one is unanswered.
 */
function holdDrafts(player: Player): void {
  player.statecraft.pendingOrder = { options: ['marketDay' as OrderId] };
}

function send(playerId: number, unitId: number, from: City, to: City): Command {
  return { type: 'startRoute', playerId, unitId, fromCityId: from.id, toCityId: to.id };
}

/**
 * Two empires at peace, one town each, a trader in A's town, and a worker of
 * B's in sight so the two have met. `commercialPosts.test.ts`' fixture.
 */
function foreignPair(): { state: GameState; home: City; partner: City; trader: Unit } {
  const state = bareState(16, 9);
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const partner = foundCityAt(state, 1, at(state, 10, 4));
  home.buildings.push('market');
  bumpRevision(state);
  const trader = createUnit(state, 0, 'trader', 3, 4);
  createUnit(state, 1, 'worker', 3, 3);
  return { state, home, partner, trader };
}

/**
 * Two towns of one empire, the origin well built and both well peopled, so a
 * route between them pays every voice it can.
 */
function homePair(): { state: GameState; home: City; inland: City; trader: Unit } {
  const state = bareState(16, 9);
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const inland = foundCityAt(state, 0, at(state, 10, 4));
  home.buildings.push('market', 'granary', 'library', 'monument', 'barracks');
  home.population = 9;
  inland.population = 7;
  bumpRevision(state);
  const trader = createUnit(state, 0, 'trader', 3, 4);
  return { state, home, inland, trader };
}

// --- The Return Leg ---------------------------------------------------------

describe('The Return Leg', () => {
  it('pays the origin a copy of everything a home route pays its destination', () => {
    const { state, home, inland, trader } = homePair();
    seat(state, 0, RETURN_LEG);
    expect(applyCommand(state, send(0, trader.id, home, inland)).ok).toBe(true);

    const route = foldRouteYield(explainRouteYield(state, trader));
    expect(route.food + route.production + route.gold).toBeGreaterThan(0);
    const copy = cityReturnLegYields(state, home);
    expect(copy.length).toBe(explainRouteYield(state, trader).length);
    expect(foldRouteYield(copy)).toEqual(route);
    for (const line of copy) {
      expect(line.card).toBe(RETURN_LEG);
      expect(line.source).toMatch(/^Order · The Return Leg · Caravan to /);
    }

    // At step 6 of the origin's own fold, filed under the card.
    const lines = explainCity(state, home).lines.filter((line) => line.card === RETURN_LEG);
    expect(lines.length).toBe(copy.length);
    for (const line of lines) expect(line.step).toBe(6);
    const folded = lines.reduce((sum, line) => sum + line.food + line.production + line.gold, 0);
    expect(folded).toBe(route.food + route.production + route.gold);
  });

  it('is not a route line, so nothing that reads the routes arriving sees it', () => {
    const { state, home, inland, trader } = homePair();
    seat(state, 0, RETURN_LEG);
    expect(applyCommand(state, send(0, trader.id, home, inland)).ok).toBe(true);
    // The origin receives no route: the copy is outside `cityRouteYields`,
    // which is what the cards that multiply routes and the age's count of
    // caravan goods read.
    expect(cityRouteYields(state, home)).toEqual([]);
    expect(cityReturnLegYields(state, home).length).toBeGreaterThan(0);
    // And the destination is paid exactly what it was paid before.
    expect(foldRouteYield(cityRouteYields(state, inland))).toEqual(
      foldRouteYield(explainRouteYield(state, trader)),
    );
  });

  it('pays nothing without the card, and copies no route to another empire', () => {
    const plain = homePair();
    expect(applyCommand(plain.state, send(0, plain.trader.id, plain.home, plain.inland)).ok).toBe(true);
    expect(cityReturnLegYields(plain.state, plain.home)).toEqual([]);

    const abroad = foreignPair();
    seat(abroad.state, 0, RETURN_LEG);
    expect(
      applyCommand(abroad.state, send(0, abroad.trader.id, abroad.home, abroad.partner)).ok,
    ).toBe(true);
    expect(cityReturnLegYields(abroad.state, abroad.home)).toEqual([]);
  });

  it('stops copying when the route lapses', () => {
    const { state, home, inland, trader } = homePair();
    seat(state, 0, RETURN_LEG);
    expect(applyCommand(state, send(0, trader.id, home, inland)).ok).toBe(true);
    state.turn = trader.trade!.expiresTurn;
    bumpRevision(state);
    expect(cityReturnLegYields(state, home)).toEqual([]);
  });
});

// --- The Fondaci --------------------------------------------------------------

describe('The Fondaci and the post-established moment', () => {
  it('pays once for each post, at both ends, on the turn its term ends', () => {
    const { state, home, partner, trader } = foreignPair();
    home.population = 3;
    partner.population = 5;
    const player = playerById(state, 0)!;
    seat(state, 0, FONDACI);
    holdDrafts(player);
    expect(applyCommand(state, send(0, trader.id, home, partner)).ok).toBe(true);
    const since = state.turn;

    const pools = (): [number, number] => [player.sciencePool, player.culturePool];

    // A turn short: nothing.
    state.turn = since + TERM - 1;
    bumpRevision(state);
    let before = pools();
    runPostEstablishments(state);
    expect(pools()).toEqual(before);

    // The turn the term ends: the post in the partner's town and the post in
    // your own origin, each by its own town's citizens (the triage's reading
    // 12). Twenty times three and twenty times five.
    state.turn = since + TERM;
    bumpRevision(state);
    before = pools();
    runPostEstablishments(state);
    expect(player.sciencePool - before[0]).toBe(20 * (3 + 5));
    expect(player.culturePool - before[1]).toBe(20 * (3 + 5));

    // Never again for the same posts.
    state.turn = since + TERM + 1;
    bumpRevision(state);
    before = pools();
    runPostEstablishments(state);
    expect(pools()).toEqual(before);
  });

  it('counts posts at home, and pays whether or not the post pays that turn', () => {
    const { state, home, inland, trader } = homePair();
    const player = playerById(state, 0)!;
    seat(state, 0, FONDACI);
    holdDrafts(player);
    expect(applyCommand(state, send(0, trader.id, home, inland)).ok).toBe(true);
    state.turn += TERM;
    bumpRevision(state);
    const science = player.sciencePool;
    runPostEstablishments(state);
    expect(player.sciencePool - science).toBe(20 * (9 + 7));

    // A war stops a post's pay, not its record, and the moment reads the
    // record (the triage's reading 12).
    const abroad = foreignPair();
    abroad.partner.population = 4;
    abroad.home.population = 1;
    const seat0 = playerById(abroad.state, 0)!;
    seat(abroad.state, 0, FONDACI);
    holdDrafts(seat0);
    expect(
      applyCommand(abroad.state, send(0, abroad.trader.id, abroad.home, abroad.partner)).ok,
    ).toBe(true);
    abroad.state.turn += TERM;
    openWar(abroad.state, 0, 1);
    bumpRevision(abroad.state);
    const before = seat0.sciencePool;
    runPostEstablishments(abroad.state);
    expect(seat0.sciencePool - before).toBe(20 * (4 + 1));
  });

  it('asks each record one comparison of two absolute turns', () => {
    const state = bareState(8, 8);
    state.turn = 40;
    expect(postEstablishedThisTurn(state, { by: 0, since: 40 - TERM })).toBe(true);
    expect(postEstablishedThisTurn(state, { by: 0, since: 41 - TERM })).toBe(false);
    expect(postEstablishedThisTurn(state, { by: 0, since: 39 - TERM })).toBe(false);
  });

  it('is paid by the roadJoinings phase, before the yields and the commissions', () => {
    // The pin the batch chose (see `runPostEstablishments`): a sweep inside an
    // existing phase, so the phase list keeps its length.
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf('roadJoinings')).toBeGreaterThanOrEqual(0);
    expect(names.indexOf('roadJoinings')).toBeLessThan(names.indexOf('collectYields'));
    expect(names.indexOf('roadJoinings')).toBeLessThan(names.indexOf('commissions'));

    const { state, home, partner, trader } = foreignPair();
    home.population = 2;
    partner.population = 6;
    const player = playerById(state, 0)!;
    seat(state, 0, FONDACI);
    holdDrafts(player);
    expect(applyCommand(state, send(0, trader.id, home, partner)).ok).toBe(true);
    state.turn += TERM;
    bumpRevision(state);
    const science = player.sciencePool;
    const phase = END_OF_TURN_PHASES.find((entry) => entry.name === 'roadJoinings')!;
    phase.run(state, emptyTurnReport());
    expect(player.sciencePool - science).toBe(20 * (2 + 6));
  });
});

// --- The Foreign Factor -------------------------------------------------------

describe('The Foreign Factor', () => {
  /** One town of yours and two foreign towns holding your established post. */
  function posted(): { state: GameState; towns: City[] } {
    const state = bareState(20, 9);
    state.wars = [];
    foundCityAt(state, 0, at(state, 2, 4));
    const one = foundCityAt(state, 1, at(state, 8, 4));
    const two = foundCityAt(state, 1, at(state, 14, 4));
    one.population = 7;
    two.population = 5;
    const ripe = state.turn - TERM;
    one.posts = [{ by: 0, since: ripe }];
    two.posts = [{ by: 0, since: ripe }];
    bumpRevision(state);
    return { state, towns: [one, two] };
  }

  it('counts a quarter of each town’s citizens, rounded down town by town', () => {
    const { state } = posted();
    const science = orderDef(FOREIGN_FACTOR).effects[0]!;
    expect(science.kind).toBe('pays');
    // 7 / 4 and 5 / 4 are 1 and 1. A quarter of the sum would be 3.
    expect(countOf(state, 0, FOREIGN_FACTOR, science as never)).toBe(2);

    seat(state, 0, FOREIGN_FACTOR);
    const lines = explainEmpireCardYields(state, 0).filter((line) => line.card === FOREIGN_FACTOR);
    expect(lines.reduce((sum, line) => sum + line.science, 0)).toBe(2);
    expect(lines.reduce((sum, line) => sum + line.culture, 0)).toBe(2);
  });

  it('counts nothing for a post a war suspends', () => {
    const { state } = posted();
    const science = orderDef(FOREIGN_FACTOR).effects[0]!;
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(countOf(state, 0, FOREIGN_FACTOR, science as never)).toBe(0);
  });
});

// --- The Lingua Franca --------------------------------------------------------

describe('The Lingua Franca', () => {
  it('counts every live route in the world, whoever sent it', () => {
    const { state, home, partner, trader } = foreignPair();
    partner.buildings.push('market');
    const theirs = createUnit(state, 1, 'trader', 10, 4);
    bumpRevision(state);
    expect(applyCommand(state, send(0, trader.id, home, partner)).ok).toBe(true);
    expect(applyCommand(state, send(1, theirs.id, partner, home)).ok).toBe(true);
    const effect = orderDef(LINGUA_FRANCA).effects[0]! as never;
    expect(countOf(state, 0, LINGUA_FRANCA, effect)).toBe(2);
    expect(countOf(state, 1, LINGUA_FRANCA, effect)).toBe(2);

    // A lapsed route runs no more.
    state.turn = trader.trade!.expiresTurn;
    bumpRevision(state);
    expect(countOf(state, 0, LINGUA_FRANCA, effect)).toBe(0);
  });

  it('pays a city-stage percentage for every three routes', () => {
    const { state, home, partner, trader } = foreignPair();
    partner.buildings.push('market');
    const theirs = createUnit(state, 1, 'trader', 10, 4);
    const third = createUnit(state, 1, 'trader', 10, 4);
    bumpRevision(state);
    expect(applyCommand(state, send(0, trader.id, home, partner)).ok).toBe(true);
    expect(applyCommand(state, send(1, theirs.id, partner, home)).ok).toBe(true);
    seat(state, 0, LINGUA_FRANCA);
    const own = (): number =>
      cityYieldPercents(state, home)
        .filter((line) => line.card === LINGUA_FRANCA && line.yield === 'science')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(own()).toBe(0);
    // A third route anywhere in the world: player 1 runs a second one.
    const inland = foundCityAt(state, 1, at(state, 13, 6));
    bumpRevision(state);
    // One market is one route; a second market gives player 1 a second slot.
    inland.buildings.push('market');
    bumpRevision(state);
    expect(applyCommand(state, send(1, third.id, partner, inland)).ok).toBe(true);
    expect(own()).toBe(1);
    const line = cityYieldPercents(state, home).find((entry) => entry.card === LINGUA_FRANCA);
    expect(line?.stage).toBe('city');
  });
});

// --- The Admiralty of Trade ---------------------------------------------------

describe('The Admiralty of Trade', () => {
  /** Two towns of one empire on one long plain, too far apart for a caravan. */
  function farLand(): { state: GameState; home: City; far: City } {
    const state = bareState(60, 9);
    state.wars = [];
    const home = foundCityAt(state, 0, at(state, 2, 4));
    const far = foundCityAt(state, 0, at(state, 32, 4));
    home.buildings.push('market');
    bumpRevision(state);
    createUnit(state, 0, 'trader', 2, 4);
    return { state, home, far };
  }

  it('waives the range by land once the destination holds a paying post', () => {
    const { state, home, far } = farLand();
    expect(routeStartable(state, 0, home.id, far.id, 'land')).toMatch(/turns away/);
    seat(state, 0, ADMIRALTY);
    expect(routeStartable(state, 0, home.id, far.id, 'land')).toMatch(/turns away/);

    const ripe = state.turn - TERM;
    far.posts = [{ by: 0, since: ripe }];
    bumpRevision(state);
    expect(routeStartable(state, 0, home.id, far.id, 'land')).toBeNull();

    // The origin's post is not the one the card reads.
    far.posts = [];
    home.posts = [{ by: 0, since: ripe }];
    bumpRevision(state);
    expect(routeStartable(state, 0, home.id, far.id, 'land')).toMatch(/turns away/);

    // A post still ripening is not established, so it waives nothing.
    home.posts = [];
    far.posts = [{ by: 0, since: state.turn }];
    bumpRevision(state);
    expect(routeStartable(state, 0, home.id, far.id, 'land')).toMatch(/turns away/);
  });
});

// --- The Champagne Fairs ------------------------------------------------------

describe('The Champagne Fairs', () => {
  it('counts the citizens of the towns a home route arrives at', () => {
    const { state, home, inland, trader } = homePair();
    const third = foundCityAt(state, 0, at(state, 6, 7));
    third.population = 4;
    bumpRevision(state);
    expect(applyCommand(state, send(0, trader.id, home, inland)).ok).toBe(true);
    const effect = orderDef(CHAMPAGNE).effects[0]!;
    expect(effect.kind).toBe('periodic');
    if (effect.kind !== 'periodic') return;
    // Only the destination is admitted: 7 citizens, not 9 + 7 + 4.
    expect(countOf(state, 0, CHAMPAGNE, periodicProbe(effect))).toBe(7);
    // `population` with no scope still counts every town.
    const all = { ...periodicProbe(effect), admits: undefined };
    expect(countOf(state, 0, CHAMPAGNE, all)).toBe(9 + 7 + 4);
  });

  it('holds a fair every ten turns worth ten culture for each of those citizens', () => {
    const { state, home, inland, trader } = homePair();
    const player = playerById(state, 0)!;
    expect(applyCommand(state, send(0, trader.id, home, inland)).ok).toBe(true);
    seat(state, 0, CHAMPAGNE);
    holdDrafts(player);
    // The first phase after the card is seated starts its clock.
    runPeriodicBoons(state);
    const culture = player.culturePool;
    state.turn += 9;
    bumpRevision(state);
    runPeriodicBoons(state);
    expect(player.culturePool).toBe(culture);
    state.turn += 1;
    bumpRevision(state);
    runPeriodicBoons(state);
    expect(player.culturePool - culture).toBe(10 * 7);
  });
});
