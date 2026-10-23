/**
 * **Commerce batch T4, the trade commissions** (`docs/plans/commerce-themes-
 * triage.md`, readings 10 and 11). The sheet's sync test (`commerce.test.ts`)
 * checks the two rows against the sheet. This file checks what the batch
 * built:
 *
 *   · the `citiesAdmitted` commission figure: your towns that the goal's own
 *     town scope admits, through the walk of the `citiesAdmitted` count.
 *     Commission: The Great Fair asks for four towns that a domestic route
 *     arrives at, and pays two more trade routes for the rest of the game;
 *   · the `tradePartnerEmpires` commission figure: the other empires your
 *     routes reach, through the walk of the `tradePartnerEmpires` count. The
 *     World's Fair asks for four;
 *   · The World's Fair's reward: your trading post, established at once, in
 *     each partner's capital, through the third writer of `City.posts`
 *     (`writeEstablishedPost`, `trade.ts`);
 *   · the writer pays The Fondaci once for each post it writes, and the post
 *     sweep never pays it a second time.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionProgress, runCommissions } from '../../../src/sim/commissions';
import { createMap, getTileAt } from '../../../src/sim/map';
import { cityHoldsPost, cityPostPays, postSince } from '../../../src/sim/routes';
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
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import { commissionCounterWords } from '../../../src/sim/statecraft/describers';
import { countOf } from '../../../src/sim/statecraft/evaluator';
import { type CardPaysEffect, type OrderId, orderDef } from '../../../src/sim/statecraftData';
import {
  endRoute,
  explainRouteSlots,
  routeSlots,
  runPostEstablishments,
  startRouteAt,
  writeEstablishedPost,
} from '../../../src/sim/trade';
import { END_OF_TURN_PHASES, emptyTurnReport } from '../../../src/sim/turn';
import { resetVisibility } from '../../../src/sim/visibility';
import { newGame } from '../newGameHelpers';

const TERM = Math.floor(RULES.trade.routeTurns);

const GREAT_FAIR = 'commissionTheGreatFair' as OrderId;
const WORLDS_FAIR = 'theWorldsFair' as OrderId;
const FONDACI = 'theFondaci' as OrderId;

const DOMESTIC = { test: 'routeEndsHere', crossing: 'domestic' } as const;

/**
 * A blank grassland board at peace with five seats: Ada (seat 0) has five
 * towns along the top row, and each of the four other seats has a capital on
 * the bottom row. Bors (seat 1) has a second town beside his capital.
 */
function world(): { state: GameState; mine: City[]; capitals: City[]; borsSecond: City } {
  const names = ['Ada', 'Bors', 'Cyra', 'Dag', 'Edda'];
  const colors = ['#a00', '#00a', '#0a0', '#aa0', '#0aa'];
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: names.map((name, index) => ({ name, color: colors[index]!, isHuman: true })),
  });
  state.map = createMap({ width: 30, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.wars = [];
  state.nextEntityId = 1;
  const town = (seat: number, col: number, row: number): City => {
    const tile = getTileAt(state.map, col, row);
    if (!tile) throw new Error(`No tile at (${col}, ${row})`);
    return foundCityAt(state, seat, tile);
  };
  const mine = [2, 7, 12, 17, 22].map((col) => town(0, col, 2));
  const capitals = [1, 2, 3, 4].map((seat) => town(seat, 3 + 5 * (seat - 1), 9));
  const borsSecond = town(1, 26, 9);
  bumpRevision(state);
  return { state, mine, capitals, borsSecond };
}

/** Starts a route through the route's one writer, with a new trader. */
function route(state: GameState, from: City, to: City): Unit {
  const trader = createUnit(state, from.ownerId, 'trader', from.col, from.row);
  startRouteAt(state, trader, from, to, 'land');
  bumpRevision(state);
  return trader;
}

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

/** The probe that asks the `citiesAdmitted` count for the same towns. */
const ADMITTED: CardPaysEffect = {
  kind: 'pays',
  where: 'empire',
  basis: 'count',
  count: 'citiesAdmitted',
  admits: DOMESTIC,
  to: 'gold',
  amount: 1,
};

/** The probe that asks the `tradePartnerEmpires` count. */
const PARTNERS: CardPaysEffect = {
  kind: 'pays',
  where: 'empire',
  basis: 'count',
  count: 'tradePartnerEmpires',
  to: 'gold',
  amount: 1,
};

/**
 * Routes to all four other empires, met this turn:
 *
 *   · Bors: the route goes to his second town, so his capital has no record;
 *   · Cyra and Edda: the route goes to the capital, so the capital holds a
 *     record the route opened this turn, not yet established;
 *   · Dag: the capital already holds Ada's established post.
 */
function fair(): { state: GameState; capitals: City[]; borsSecond: City; traders: Unit[] } {
  const built = world();
  const { state, mine, capitals, borsSecond } = built;
  const home = mine[0]!;
  capitals[2]!.posts = [{ by: 0, since: state.turn - TERM - 5 }];
  const traders = [
    route(state, home, borsSecond),
    route(state, home, capitals[1]!),
    route(state, home, capitals[2]!),
    route(state, home, capitals[3]!),
  ];
  seat(state, 0, WORLDS_FAIR);
  return { state, capitals, borsSecond, traders };
}

// --- Commission: The Great Fair ------------------------------------------------

describe('Commission: The Great Fair', () => {
  it('is a Tier II Wildcard commission whose goal counts towns by a scope', () => {
    const def = orderDef(GREAT_FAIR);
    expect(def.band).toBe(2);
    expect(def.rarity).toBe('uncommon');
    expect(def.type).toBe('wildcard');
    expect(def.effects).toEqual([]);
    expect(def.commission).toEqual({
      goals: [{ kind: 'reached', figure: 'citiesAdmitted', count: 4, admits: DOMESTIC }],
      reward: [{ lasting: [{ kind: 'routeRider', extra: 2 }] }],
    });
  });

  it('counts your towns a domestic route arrives at, as the count of the same towns does', () => {
    const { state, mine, capitals } = world();
    const [a, b, c, d, e] = mine as [City, City, City, City, City];
    const progress = (): number => commissionProgress(state, 0, GREAT_FAIR)[0]!.have;
    expect(progress()).toBe(0);

    // A town that only sends counts nothing; the town it reaches counts.
    route(state, a, b);
    expect(progress()).toBe(1);
    // Two routes into one town count it once.
    route(state, a, c);
    route(state, b, c);
    expect(progress()).toBe(2);
    // A route from another empire into your town is not a domestic route, and
    // your route abroad reaches a town that is not yours.
    route(state, capitals[0]!, d);
    route(state, e, capitals[1]!);
    expect(progress()).toBe(2);
    expect(countOf(state, 0, GREAT_FAIR, ADMITTED)).toBe(2);

    route(state, a, d);
    route(state, d, e);
    expect(progress()).toBe(4);
    expect(countOf(state, 0, GREAT_FAIR, ADMITTED)).toBe(4);
    expect(commissionProgress(state, 0, GREAT_FAIR)[0]).toMatchObject({ need: 4, met: true });
  });

  it('pays two more trade routes for the rest of the game, and leaves its chair', () => {
    const { state, mine } = world();
    const [a, b, c, d, e] = mine as [City, City, City, City, City];
    seat(state, 0, GREAT_FAIR);
    const before = routeSlots(state, 0);
    const traders = [route(state, a, b), route(state, a, c), route(state, a, d)];
    expect(runCommissions(state)).toEqual([]);

    traders.push(route(state, a, e));
    const reports = runCommissions(state);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ playerId: 0, card: GREAT_FAIR, lines: [] });
    const sc = playerById(state, 0)!.statecraft;
    expect(sc.slots.some((slot) => slot?.card === GREAT_FAIR)).toBe(false);
    expect(sc.commissionsFulfilled).toEqual([{ card: GREAT_FAIR, turn: state.turn }]);

    // The institution: two route slots on the empire's own ledger, labelled
    // with the card.
    bumpRevision(state);
    expect(routeSlots(state, 0)).toBe(before + 2);
    const line = explainRouteSlots(state, 0).find((entry) => entry.source.includes('The Great Fair'));
    expect(line?.slots).toBe(2);

    // The slots stay when every route has ended.
    for (const trader of traders) endRoute(state, trader);
    bumpRevision(state);
    expect(routeSlots(state, 0)).toBe(before + 2);
    expect(runCommissions(state)).toEqual([]);
  });

  it('prints its goal in the scope’s own words', () => {
    const text = describeCard(GREAT_FAIR).map((clause) => stripRefs(clause.text));
    expect(text).toEqual([
      'Commission. Goal: have 4 cities one of your own trade routes ends at, at the same time, while this card is seated',
      'Reward: for the rest of the game, +2 trade routes',
      'then this card leaves its chair and is never seated again',
    ]);
    const goal = orderDef(GREAT_FAIR).commission!.goals[0]!;
    expect(commissionCounterWords(goal)).toBe('cities one of your own trade routes ends at');
  });
});

// --- The World's Fair ----------------------------------------------------------

describe("The World's Fair", () => {
  it('counts each empire your routes reach once', () => {
    const { state, mine, capitals, borsSecond } = world();
    const [a, b] = mine as [City, City];
    const progress = (): number => commissionProgress(state, 0, WORLDS_FAIR)[0]!.have;
    // A home route reaches no other empire.
    route(state, a, b);
    expect(progress()).toBe(0);
    // Two routes to one empire are one empire reached.
    route(state, a, capitals[0]!);
    route(state, b, borsSecond);
    route(state, a, capitals[1]!);
    route(state, a, capitals[2]!);
    expect(progress()).toBe(3);
    expect(countOf(state, 0, WORLDS_FAIR, PARTNERS)).toBe(3);
    route(state, b, capitals[3]!);
    expect(commissionProgress(state, 0, WORLDS_FAIR)[0]).toMatchObject({ have: 4, need: 4, met: true });
    expect(countOf(state, 0, WORLDS_FAIR, PARTNERS)).toBe(4);
  });

  it('writes your post, established at once, in each partner’s capital', () => {
    const { state, capitals, borsSecond, traders } = fair();
    const [bors, cyra, dag, edda] = capitals as [City, City, City, City];
    expect(cityHoldsPost(state, bors, 0)).toBe(false);
    expect(cityHoldsPost(state, cyra, 0)).toBe(false);
    expect(postSince(cyra, 0)).toBe(state.turn);
    const dagSince = postSince(dag, 0);

    const reports = runCommissions(state);
    expect(reports).toHaveLength(1);
    // In the order the routes first reach the partners. Dag's capital held the
    // post already, so it gains nothing and has no line.
    expect(reports[0]!.lines).toEqual([
      `your trading post in ${bors.name}`,
      `your trading post in ${cyra.name}`,
      `your trading post in ${edda.name}`,
    ]);
    for (const capital of [bors, cyra, edda]) {
      expect(cityHoldsPost(state, capital, 0), capital.name).toBe(true);
      expect(cityPostPays(state, capital, 0), capital.name).toBe(true);
      // Dated a full term back, so it is established on this turn.
      expect(postSince(capital, 0), capital.name).toBe(state.turn - TERM);
      expect(capital.posts!.filter((post) => post.by === 0), capital.name).toHaveLength(1);
    }
    expect(postSince(dag, 0)).toBe(dagSince);
    // The route's own town keeps the record the route opened.
    expect(postSince(borsSecond, 0)).toBe(state.turn);
    // The timed bonus is gone.
    expect(playerById(state, 0)!.timed ?? []).toEqual([]);

    // A route that ends later does not take an established post away.
    endRoute(state, traders[1]!);
    expect(cityHoldsPost(state, cyra, 0)).toBe(true);
  });

  it('prints its goal and its reward', () => {
    const text = describeCard(WORLDS_FAIR).map((clause) => stripRefs(clause.text));
    expect(text).toEqual([
      'Commission. Goal: have trade routes to 4 other empires at the same time, while this card is seated',
      'Reward: your trading post, established at once, in the capital of each empire your trade routes reach',
      'then this card leaves its chair and is never seated again',
    ]);
    const goal = orderDef(WORLDS_FAIR).commission!.goals[0]!;
    expect(commissionCounterWords(goal)).toBe('empires your trade routes reach');
  });
});

// --- the third writer and The Fondaci --------------------------------------------

describe('the third post writer', () => {
  it('writes nothing where your post is already established', () => {
    const { state, capitals } = world();
    const dag = capitals[2]!;
    dag.posts = [{ by: 0, since: state.turn - TERM }];
    expect(writeEstablishedPost(state, dag, 0)).toBe(false);
    expect(dag.posts).toEqual([{ by: 0, since: state.turn - TERM }]);
    // Another empire's record in the same town is left alone.
    const bors = capitals[0]!;
    bors.posts = [{ by: 2, since: state.turn }];
    expect(writeEstablishedPost(state, bors, 0)).toBe(true);
    expect(bors.posts).toEqual([
      { by: 2, since: state.turn },
      { by: 0, since: state.turn - TERM },
    ]);
  });

  it('pays The Fondaci once for each post it writes, in the commissions phase', () => {
    const { state, capitals, borsSecond } = fair();
    const [bors, cyra, dag, edda] = capitals as [City, City, City, City];
    const player = playerById(state, 0)!;
    seat(state, 0, FONDACI);
    holdDrafts(player);
    bors.population = 3;
    cyra.population = 5;
    dag.population = 7;
    edda.population = 2;
    borsSecond.population = 4;
    bumpRevision(state);

    // The post sweep runs in the `roadJoinings` phase, before `commissions`.
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf('roadJoinings')).toBeLessThan(names.indexOf('commissions'));
    const phases = END_OF_TURN_PHASES.filter(
      (phase) => phase.name === 'roadJoinings' || phase.name === 'commissions',
    );

    // This turn: the sweep finds nothing ripe, and the reward writes three
    // posts, each paid twenty times its town's citizens.
    let science = player.sciencePool;
    let culture = player.culturePool;
    for (const phase of phases) phase.run(state, emptyTurnReport());
    expect(player.sciencePool - science).toBe(20 * (3 + 5 + 2));
    expect(player.culturePool - culture).toBe(20 * (3 + 5 + 2));

    // Never again for those three posts. Until the routes' own records ripen
    // nothing more is paid, and when they do, only those posts pay: Ada's own
    // town and Bors' second town. Cyra's and Edda's records were opened by
    // routes this turn too, but the reward dated them back, so they do not
    // ripen a second time.
    const opened = state.turn;
    for (let turn = opened + 1; turn < opened + TERM; turn++) {
      state.turn = turn;
      bumpRevision(state);
      science = player.sciencePool;
      runPostEstablishments(state);
      expect(player.sciencePool - science, `turn ${turn}`).toBe(0);
    }
    state.turn = opened + TERM;
    bumpRevision(state);
    science = player.sciencePool;
    culture = player.culturePool;
    const home = state.cities.find((city) => city.ownerId === 0)!;
    runPostEstablishments(state);
    expect(player.sciencePool - science).toBe(20 * (home.population + 4));
    expect(player.culturePool - culture).toBe(20 * (home.population + 4));
  });

  it('pays the same through a whole end of turn, and the fair is met there', () => {
    // Two copies of one board, one with The Fondaci in a chair. The whole end
    // of turn runs on both, and the only difference in science is what the
    // three new posts pay, once.
    const run = (withFondaci: boolean): { science: number; posts: number; met: boolean } => {
      const { state, capitals } = fair();
      const player = playerById(state, 0)!;
      if (withFondaci) seat(state, 0, FONDACI);
      holdDrafts(player);
      for (const capital of capitals) capital.population = 3;
      bumpRevision(state);
      for (const seatId of [0, 1, 2, 3, 4]) {
        expect(applyCommand(state, { type: 'endTurn', playerId: seatId }).ok).toBe(true);
      }
      return {
        science: player.sciencePool,
        posts: capitals.filter((capital) => cityHoldsPost(state, capital, 0)).length,
        met: (player.statecraft.commissionsFulfilled ?? []).some((entry) => entry.card === WORLDS_FAIR),
      };
    };
    const without = run(false);
    const withIt = run(true);
    expect(without.met).toBe(true);
    expect(withIt.met).toBe(true);
    expect(withIt.posts).toBe(4);
    expect(withIt.science - without.science).toBe(20 * 3 * 3);
  });
});
