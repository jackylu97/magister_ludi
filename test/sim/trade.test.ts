import { describe, expect, it } from 'vitest';

import { cityYields, foundCityAt, growthThreshold } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { applyCombat } from '../../src/sim/combat';
import {
  type Game,
  createGame,
  dispatch,
  saveGame,
  snapshotState,
} from '../../src/sim/game';
import type { Tile } from '../../src/sim/map';
import { advanceAlongPath } from '../../src/sim/movement';
import {
  findPath,
  moveProfile,
  pathTurns,
  reachableTiles,
  roadStepCost,
  snapMovement,
  stepCost,
  zocField,
} from '../../src/sim/pathfind';
import { explainPurchaseCost, purchaseError } from '../../src/sim/purchase';
import { RULES } from '../../src/sim/rulesData';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import {
  type City,
  type GameConfig,
  type GameState,
  type Unit,
  SCHEMA_VERSION,
  claimWonder,
  createUnit,
  playerById,
  unitById,
} from '../../src/sim/state';
import {
  connectedCities,
  explainRouteSlots,
  explainRouteYield,
  explainRouteYieldBetween,
  explainEmpireGold,
  foldRouteYield,
  roadsBuiltBy,
  routeSlots,
  routeStartable,
  startRouteError,
  usedRouteSlots,
} from '../../src/sim/trade';
import { layRoad } from '../../src/sim/roads';
import { pillageAt } from '../../src/sim/improvements';
import { buildError } from '../../src/sim/tech';
import { runEndOfTurn } from '../../src/sim/turn';
import { isCivilian, trades, unitDef } from '../../src/sim/unitData';
import { at, bareState } from './improvementHelpers';

/**
 * Trade: the caravan, the road, the route's yields and the city connection
 * (`docs/trade.md`, the user's rulings of 2026-08-27).
 *
 * Five separable claims are defended here and they are kept apart because they
 * fail for different reasons:
 *
 *   1. **The start is a gate.** Every refusal leaves the state byte-identical,
 *      and the gate the reducer accepts is exactly the one a row would be greyed
 *      from — `startRouteError` for a chosen caravan, `routeStartable` for the
 *      pair of towns on its own, and the two are one implementation.
 *   2. **The shuttle is a phase.** A caravan walks, turns around, lays road, and
 *      drops a route that has run out — all of it out of `state`, none of it out
 *      of a clock.
 *   3. **A road is a price, and four readers agree on it.** `stepCost` is the
 *      one evaluator, so `findPath`, `reachableTiles`, `advanceAlongPath` and
 *      `pathTurns` cannot disagree about a highway any more than they can about
 *      a forest.
 *   4. **Everything a route pays is a fold** (rule 5), derived every turn from
 *      the two cities as they stand — nothing is snapshotted at send time.
 *   5. **A laden caravan is plundered, never captured**, which is the one
 *      exception to `captureUnit` and lives on the *occasion* rather than in it.
 */

// --- fixtures ---------------------------------------------------------------

const TRADE = RULES.trade;

/**
 * A blank world with two cities of player 0 seven hexes apart on row 4, a market
 * in the capital (one route slot) and a trader standing in it.
 *
 * `bareState` gives every seat every technology, so Currency is held and the
 * roster question is never what a test here is about.
 */
function tradeWorld(width = 16): {
  state: GameState;
  home: City;
  partner: City;
  trader: Unit;
} {
  const state = bareState(width, 9);
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const partner = foundCityAt(state, 0, at(state, 10, 4));
  home.buildings.push('market');
  const trader = createUnit(state, 0, 'trader', 3, 4);
  return { state, home, partner, trader };
}

function send(playerId: number, unitId: number, fromCityId: number, toCityId: number): Command {
  return { type: 'startRoute', playerId, unitId, fromCityId, toCityId };
}

/** One whole resolution, exactly as `applyEndTurn` runs it. */
function resolve(state: GameState): void {
  runEndOfTurn(state);
  state.turn += 1;
}

/**
 * Runs resolutions until `done`, or fails after `limit` of them.
 *
 * A caravan's *pace* is not what these tests are about — it changes the moment
 * the road it is laying goes under it, which is the point of the feature — so
 * they wait for the thing that must happen rather than counting turns.
 */
function runUntil(state: GameState, done: () => boolean, limit = 12): void {
  for (let turn = 0; turn < limit && !done(); turn++) resolve(state);
  expect(done()).toBe(true);
}

/** Paves a run of hexes on one row, as a caravan's passage would have. */
function pave(state: GameState, row: number, from: number, to: number, ownerId = 0): Tile[] {
  const paved: Tile[] = [];
  for (let col = from; col <= to; col++) {
    const tile = at(state, col, row);
    tile.road = ownerId;
    paved.push(tile);
  }
  return paved;
}

// --- the roster -------------------------------------------------------------

describe('the trader', () => {
  it('is its own stacking category, a non-combatant, unlocked by Currency', () => {
    const def = unitDef('trader');
    // The user's ruling of 2026-08-28: the caravan has its own slot on a hex.
    // `isCivilian` is untouched by that — it is `!isCombatant`, so combat still
    // reads a trader exactly as it reads a worker. Two questions, two answers.
    expect(def.category).toBe('trader');
    expect(isCivilian(def)).toBe(true);
    expect(def.combatStrength).toBe(0);
    expect(def.movement).toBe(2);
    expect(def.sight).toBe(1);
    expect(trades(def)).toBe(true);
    // The marker is the *flag*, so nothing anywhere compares a type against the
    // string — the `settler`/`augur`/`greatPerson` discipline, one row over.
    expect(trades(unitDef('worker'))).toBe(false);
  });

  it('is built and bought like a worker, out of the treasury', () => {
    const { state, home } = tradeWorld();
    // Currency is what unlocks it, and `bareState` holds every technology.
    expect(buildError(state, 0, 'unit', 'trader', home)).toBeNull();
    // No `purchase` row on the roster, so it is sold by the treasury at the
    // flat conversion — the rule that keeps faith away from everything but the
    // rows that name it (Entry XXIX).
    const price = explainPurchaseCost(state, 0, home.id, { kind: 'unit', id: 'trader' }, 'gold');
    expect(price?.currency).toBe('gold');
    expect(price?.total).toBeGreaterThan(0);
    expect(purchaseError(state, 0, home.id, { kind: 'unit', id: 'trader' }, 'faith')).not.toBeNull();
  });

  it('is named by no rule in the simulation — except as a stacking category', () => {
    const modules = import.meta.glob('../../src/sim/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(modules)) {
      // The unit *table* is allowed to know its own ids; nothing else is.
      if (path.endsWith('/unitData.ts')) continue;
      // Prose is not a rule. A docblock that has to explain why the caravan got
      // its own slot has to be able to say the word, and stripping comments is
      // what keeps this test about *code* — otherwise the discipline it guards
      // would be enforced by making the reasons unwritable.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (/['"]trader['"]/.test(code)) offenders.push(path);
    }
    // Exactly one module names it, and what it names is **not a unit type**: the
    // user's ruling of 2026-08-28 gave the caravan its own `UnitCategory`, and a
    // category is data the rules are entitled to read — `improvements.ts`,
    // `barbarians.ts` and `statecraft.ts` all compare against `'military'` the
    // same way. `stacksFreely` is the one reading of the uncapped half, so a
    // second module appearing in this list is a second stacking rule.
    expect(offenders).toEqual(['../../src/sim/units.ts']);
    expect(modules['../../src/sim/units.ts']!).toMatch(
      /export function stacksFreely\(category: UnitCategory\): boolean \{\s*return category === 'trader';/,
    );
  });
});

// --- sending ----------------------------------------------------------------

describe('startRoute', () => {
  it('opens a route, posts both cities and sets the caravan walking', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id))).toEqual({ ok: true });

    expect(trader.trade).toEqual({
      from: home.id,
      to: partner.id,
      expiresTurn: state.turn + TRADE.routeTurns,
      outbound: true,
      autoResend: false,
    });
    // Permanent history at both ends — the range every later caravan is sent on.
    expect(home.tradingPost).toBe(true);
    expect(partner.tradingPost).toBe(true);
    // An order, not a march: the path is set and the pipeline walks it.
    expect(trader.path?.[trader.path.length - 1]).toEqual({ col: 10, row: 4 });
    expect([trader.col, trader.row]).toEqual([3, 4]);
  });

  /**
   * The 2026-08-28 ruling, and the whole of it: *where* the caravan is standing
   * is not a question the gate asks. It appears in the origin's gates and sets
   * out from there.
   */
  it('teleports the caravan to the origin from anywhere on the map', () => {
    const { state, home, partner, trader } = tradeWorld();
    // As far from either town as the board allows, and under a standing order.
    trader.col = 14;
    trader.row = 8;
    trader.path = [{ col: 13, row: 8 }];

    expect(applyCommand(state, send(0, trader.id, home.id, partner.id))).toEqual({ ok: true });

    expect([trader.col, trader.row]).toEqual([home.col, home.row]);
    // The old order is gone and the new one aims at the partner.
    expect(trader.path?.[trader.path.length - 1]).toEqual({ col: partner.col, row: partner.row });
    expect(trader.trade?.from).toBe(home.id);
    expect(trader.trade?.to).toBe(partner.id);
    // The seam ran on an unladen caravan, so no road was worn under it: a
    // caravan's own origin hex is paved by *coming home*, never by setting out.
    expect(at(state, home.col, home.row).road).toBeUndefined();
  });

  it('wakes a sleeping caravan, like any other order', () => {
    const { state, home, partner, trader } = tradeWorld();
    trader.col = 6;
    trader.sleeping = true;
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(trader.sleeping).toBeUndefined();
  });

  it('refuses every illegal start and leaves the state byte-identical', () => {
    const { state, home, partner, trader } = tradeWorld();
    const worker = createUnit(state, 0, 'worker', 3, 4);
    const theirs = foundCityAt(state, 1, at(state, 3, 8));

    const refusals: { why: string; command: Command; match: RegExp }[] = [
      {
        why: 'not a trader',
        command: send(0, worker.id, home.id, partner.id),
        match: /carries no trade route/,
      },
      {
        why: 'somebody else’s piece',
        command: send(1, trader.id, home.id, partner.id),
        match: /does not belong/,
      },
      {
        why: 'no such unit',
        command: send(0, 9999, home.id, partner.id),
        match: /No unit with id/,
      },
      {
        why: 'a foreign partner',
        command: send(0, trader.id, home.id, theirs.id),
        match: /foreign routes wait on diplomacy/,
      },
      {
        why: 'a foreign origin',
        command: send(0, trader.id, theirs.id, partner.id),
        match: /belongs to another empire/,
      },
      {
        why: 'no such destination',
        command: send(0, trader.id, home.id, 9999),
        match: /No city with id/,
      },
      {
        why: 'no such origin',
        command: send(0, trader.id, 9999, partner.id),
        match: /No city with id/,
      },
      {
        why: 'one city twice',
        command: send(0, trader.id, home.id, home.id),
        match: /two different cities/,
      },
    ];

    for (const { why, command, match } of refusals) {
      const before = snapshotState(state);
      const result = applyCommand(state, command);
      expect(result.ok, why).toBe(false);
      if (!result.ok) expect(result.error, why).toMatch(match);
      expect(snapshotState(state), why).toBe(before);
    }
  });

  it('does not care that the caravan is standing in a field', () => {
    const { state, home, partner, trader } = tradeWorld();
    trader.col = 5;
    expect(startRouteError(state, 0, trader.id, home.id, partner.id)).toBeNull();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect([trader.col, trader.row]).toEqual([home.col, home.row]);
  });

  it('is not stopped by a civilian standing in the origin’s gates', () => {
    const { state, home, partner, trader } = tradeWorld();
    trader.col = 6;
    // Re-pinned by the user's stacking ruling of 2026-08-28, and it is the
    // clearest reading of it: a settler on the gate used to be a wall the
    // caravan could not appear behind, because both wanted the hex's one
    // civilian slot. A trader has its own slot now, so the send goes through and
    // the two pieces share the tile.
    const settler = createUnit(state, 0, 'settler', home.col, home.row);

    expect(routeStartable(state, 0, home.id, partner.id)).toBeNull();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect([trader.col, trader.row]).toEqual([home.col, home.row]);
    expect([settler.col, settler.row]).toEqual([home.col, home.row]);
  });

  it('lets two caravans share the gates', () => {
    const { state, home, partner, trader } = tradeWorld();
    // `trader` is standing on the origin. It was never a wall to *itself* — the
    // commonest send in the game — and since the ruling it is not a wall to
    // anybody else either: any number of caravans cross on one hex.
    const other = createUnit(state, 0, 'trader', 6, 4);
    partner.buildings.push('market');
    const third = foundCityAt(state, 0, at(state, 14, 4));

    expect(startRouteError(state, 0, trader.id, home.id, partner.id)).toBeNull();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(applyCommand(state, send(0, other.id, home.id, third.id)).ok).toBe(true);
    expect([other.col, other.row]).toEqual([home.col, home.row]);
    expect([trader.col, trader.row]).toEqual([home.col, home.row]);
  });

  it('refuses a second route between the same pair, in either direction', () => {
    const { state, home, partner, trader } = tradeWorld();
    // Two slots, so it is the pair that refuses and not the cap.
    partner.buildings.push('market');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);

    const second = createUnit(state, 0, 'trader', 8, 4);
    const before = snapshotState(state);
    const result = applyCommand(state, send(0, second.id, partner.id, home.id));
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/already runs between/),
    });
    expect(snapshotState(state)).toBe(before);
  });

  it('refuses a caravan already carrying one', () => {
    const { state, home, partner, trader } = tradeWorld();
    const third = foundCityAt(state, 0, at(state, 3, 0));
    partner.buildings.push('market');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    const before = snapshotState(state);
    const result = applyCommand(state, send(0, trader.id, home.id, third.id));
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/already carrying a route/),
    });
    expect(snapshotState(state)).toBe(before);
  });

  it('refuses at the cap, and says how many routes there are', () => {
    const { state, home, partner, trader } = tradeWorld();
    const third = foundCityAt(state, 0, at(state, 3, 0));
    expect(routeSlots(state, 0)).toBe(1);
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(usedRouteSlots(state, 0)).toBe(1);

    const second = createUnit(state, 0, 'trader', 5, 4);
    const before = snapshotState(state);
    const result = applyCommand(state, send(0, second.id, home.id, third.id));
    expect(result).toEqual({ ok: false, error: 'All 1 of your trade routes are running' });
    expect(snapshotState(state)).toBe(before);

    // And with no market at all the sentence is the one that tells a player what
    // to build.
    home.buildings.length = 0;
    expect(startRouteError(state, 0, second.id, home.id, third.id)).toBe(
      'You have no trade routes — build a market',
    );
  });

  it('refuses a partner further than a caravan can walk, and a trading post extends the reach', () => {
    // Wide enough that the wrap is not the short way round: 28 hexes at two a
    // turn is fourteen, and the allowance is ten.
    const state = bareState(60, 9);
    const home = foundCityAt(state, 0, at(state, 2, 4));
    const far = foundCityAt(state, 0, at(state, 30, 4));
    home.buildings.push('market');
    const trader = createUnit(state, 0, 'trader', 2, 4);

    expect(startRouteError(state, 0, trader.id, home.id, far.id)).toMatch(
      /is \d+ turns away; a caravan may be sent 10/,
    );

    // Two trading posts are six more turns of march — the user's ruling that the
    // first route to a town is the expensive one.
    home.tradingPost = true;
    far.tradingPost = true;
    expect(startRouteError(state, 0, trader.id, home.id, far.id)).toBeNull();
  });

  it('measures the range from the origin, whatever the caravan has left', () => {
    const state = bareState(60, 9);
    const home = foundCityAt(state, 0, at(state, 2, 4));
    const far = foundCityAt(state, 0, at(state, 23, 4));
    home.buildings.push('market');
    home.tradingPost = true;
    const trader = createUnit(state, 0, 'trader', 2, 4);

    const rested = startRouteError(state, 0, trader.id, home.id, far.id);
    trader.movesLeft = 0;
    expect(startRouteError(state, 0, trader.id, home.id, far.id)).toBe(rested);
    // And from the far side of the map, because the march is measured from the
    // town the caravan is about to appear in.
    trader.col = 40;
    trader.row = 8;
    expect(startRouteError(state, 0, trader.id, home.id, far.id)).toBe(rested);
  });

  it('refuses a partner with no land route', () => {
    const { state, home, partner, trader } = tradeWorld();
    // Two walls of ocean, because the board is a cylinder: one across the short
    // way and one across the way round.
    for (let row = 0; row < state.map.height; row++) {
      at(state, 6, row).terrain = 'ocean';
      at(state, 13, row).terrain = 'ocean';
    }
    expect(startRouteError(state, 0, trader.id, home.id, partner.id)).toMatch(
      /No road a caravan could walk/,
    );
  });

  it('is one gate read twice: routeStartable is startRouteError minus the piece', () => {
    const { state, home, partner, trader } = tradeWorld();
    const third = foundCityAt(state, 0, at(state, 3, 0));
    const pairs: [number, number][] = [
      [home.id, partner.id],
      [partner.id, home.id],
      [home.id, third.id],
      [third.id, partner.id],
      [home.id, home.id],
    ];
    // An idle trader, standing anywhere at all: the two must agree on every pair.
    for (const where of [
      [3, 4],
      [6, 4],
      [10, 4],
    ] as [number, number][]) {
      trader.col = where[0];
      trader.row = where[1];
      for (const [from, to] of pairs) {
        expect(startRouteError(state, 0, trader.id, from, to), `${from}→${to} @${where[0]}`).toBe(
          routeStartable(state, 0, from, to),
        );
      }
    }
  });
});

// --- the shuttle ------------------------------------------------------------

describe('the shuttle', () => {
  it('walks to the partner, lays road on every hex it rests on, and comes home', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);

    runUntil(state, () => trader.col === partner.col && trader.row === partner.row);
    // Every hex it entered is paved, and the road carries the *builder's* seat
    // rather than a flag.
    for (let col = 4; col <= 10; col++) expect(at(state, col, 4).road).toBe(0);
    // The origin's own hex is not: a road is worn by *arriving*, and the caravan
    // set out from that one.
    expect(at(state, 3, 4).road).toBeUndefined();
    expect(trader.trade!.outbound).toBe(true);

    // Turned around at the gates, and home again — over its own road, which is
    // why this leg is faster than the one out.
    runUntil(state, () => trader.col === home.col && trader.row === home.row);
    expect(trader.trade!.outbound).toBe(false);
    expect(at(state, 3, 4).road).toBe(0);
    expect(roadsBuiltBy(state, 0)).toBe(8);
  });

  it('ends the route when it lapses at home, and the caravan idles', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    // A route that runs out mid-road is inert but not gone: the caravan finishes
    // its leg, comes home, and *then* the shuttle drops it.
    trader.trade!.expiresTurn = state.turn;
    runUntil(state, () => trader.trade === undefined);

    expect([trader.col, trader.row]).toEqual([home.col, home.row]);
    expect(usedRouteSlots(state, 0)).toBe(0);
    // Both towns are still trading posts: a post is history and is never cleared.
    expect(home.tradingPost).toBe(true);
    expect(partner.tradingPost).toBe(true);
  });

  it('starts a fresh leg instead, when auto-resend is on', () => {
    const { state, home, trader, partner } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(
      applyCommand(state, { type: 'setAutoResend', playerId: 0, unitId: trader.id, on: true }),
    ).toEqual({ ok: true });
    // The same value twice is a command that says nothing.
    expect(
      applyCommand(state, { type: 'setAutoResend', playerId: 0, unitId: trader.id, on: true }),
    ).toEqual({ ok: false, error: expect.stringMatching(/already renews/) });

    const lapse = state.turn;
    trader.trade!.expiresTurn = lapse;
    runUntil(state, () => (trader.trade?.expiresTurn ?? lapse) > lapse);
    // Rewritten from the turn it renewed rather than extended, so a caravan that
    // idled carries no credit for having idled.
    expect(trader.trade!.expiresTurn).toBeGreaterThanOrEqual(lapse + TRADE.routeTurns);
    expect(usedRouteSlots(state, 0)).toBe(1);
  });

  it('ends when the destination stops being one of yours', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    partner.ownerId = 1;
    resolve(state);
    expect(trader.trade).toBeUndefined();
  });

  it('is cancelled by a verb of its own, which leaves the march alone', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    const path = trader.path;
    expect(path).toBeDefined();

    expect(applyCommand(state, { type: 'cancelRoute', playerId: 0, unitId: trader.id })).toEqual({
      ok: true,
    });
    expect(trader.trade).toBeUndefined();
    expect(trader.path).toEqual(path);
    expect(usedRouteSlots(state, 0)).toBe(0);
    // And a second one has nothing to cancel.
    expect(applyCommand(state, { type: 'cancelRoute', playerId: 0, unitId: trader.id })).toEqual({
      ok: false,
      error: expect.stringMatching(/not carrying a trade route/),
    });
  });
});

// --- route news ---------------------------------------------------------------

describe('route news', () => {
  /** Lands a caravan at home, its own leg already spent, ready to lapse. */
  function readyToLapseAtHome(state: GameState, home: City, trader: Unit): void {
    trader.col = home.col;
    trader.row = home.row;
    trader.trade!.outbound = false;
    trader.trade!.expiresTurn = state.turn;
    delete trader.path;
  }

  it('reports a lapsed route once, the turn it comes home', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    readyToLapseAtHome(state, home, trader);

    const report = runEndOfTurn(state);
    expect(report.routesEnded).toEqual([
      { unitId: trader.id, ownerId: 0, from: home.id, to: partner.id, renewed: false },
    ]);
    expect(trader.trade).toBeUndefined();
  });

  it('reports a renewal too, when auto-resend is on', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(
      applyCommand(state, { type: 'setAutoResend', playerId: 0, unitId: trader.id, on: true }),
    ).toEqual({ ok: true });
    readyToLapseAtHome(state, home, trader);

    const report = runEndOfTurn(state);
    expect(report.routesEnded).toEqual([
      { unitId: trader.id, ownerId: 0, from: home.id, to: partner.id, renewed: true },
    ]);
    // The same route, still running — a renewal is news, not an ending.
    expect(trader.trade).toBeDefined();
  });

  it('travels out through the resolving endTurn command, the way a grant does', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    readyToLapseAtHome(state, home, trader);

    expect(applyCommand(state, { type: 'endTurn', playerId: 1 })).toEqual({ ok: true });
    const result = applyCommand(state, { type: 'endTurn', playerId: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.routesEnded).toEqual([
      { unitId: trader.id, ownerId: 0, from: home.id, to: partner.id, renewed: false },
    ]);
  });

  it('never reports a route the player cancelled themselves', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(applyCommand(state, { type: 'cancelRoute', playerId: 0, unitId: trader.id })).toEqual({
      ok: true,
    });

    const report = runEndOfTurn(state);
    expect(report.routesEnded).toEqual([]);
  });
});

// --- roads ------------------------------------------------------------------

describe('a road', () => {
  it('prices a step at a third, whatever the ground is', () => {
    const state = bareState(16, 9);
    const warrior = createUnit(state, 0, 'warrior', 2, 4);
    const mover = moveProfile(state, warrior);
    const field = zocField(state, 0);
    pave(state, 4, 2, 9);
    // A wooded hill is a road, not a cheaper hill.
    at(state, 5, 4).feature = 'forest';
    at(state, 5, 4).hills = true;

    expect(stepCost(state.map, at(state, 4, 4), at(state, 5, 4), mover, field)).toEqual({
      cost: roadStepCost,
      zoc: false,
    });
    expect(roadStepCost).toBe(1 / 3);
    // Half a road is no road: stepping off the paving pays the ground.
    expect(stepCost(state.map, at(state, 9, 4), at(state, 10, 4), mover, field)?.cost).toBe(1);
    expect(stepCost(state.map, at(state, 2, 3), at(state, 2, 4), mover, field)?.cost).toBe(1);
  });

  it('is walked by anybody, whoever laid it', () => {
    const state = bareState(16, 9);
    pave(state, 4, 2, 9, 0);
    const mine = createUnit(state, 0, 'warrior', 2, 4);
    const theirs = createUnit(state, 1, 'warrior', 9, 4);
    const field0 = zocField(state, 0);
    const field1 = zocField(state, 1);
    const price = (unit: Unit, field: ReturnType<typeof zocField>): number | undefined =>
      stepCost(state.map, at(state, 3, 4), at(state, 4, 4), moveProfile(state, unit), field)?.cost;
    expect(price(mine, field0)).toBe(roadStepCost);
    expect(price(theirs, field1)).toBe(roadStepCost);
  });

  it('is priced identically by all four readers of stepCost', () => {
    const state = bareState(16, 9);
    pave(state, 4, 2, 12);
    const warrior = createUnit(state, 0, 'warrior', 2, 4);
    const full = warrior.movesLeft;

    // Six hexes a turn on a two-movement column, and the sixth is the last: the
    // seventh step would need a point that is not there.
    const reach = reachableTiles(state, warrior);
    const along = reach.filter((entry) => entry.tile.row === 4 && entry.tile.col > 2);
    expect(along.map((entry) => entry.tile.col)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(along[along.length - 1]!.cost).toBe(full);

    const path = findPath(state, warrior, at(state, 8, 4))!;
    expect(path).toHaveLength(6);
    expect(pathTurns(state, warrior, path)).toBe(1);

    const walk = advanceAlongPath(state, warrior, path);
    expect(walk.steps).toBe(6);
    expect([warrior.col, warrior.row]).toEqual([8, 4]);
    // Exact thirds: six of them are exactly two points, never 1.9999999999.
    expect(warrior.movesLeft).toBe(0);
    expect(snapMovement(1 / 3 + 1 / 3 + 1 / 3)).toBe(1);
  });

  it('does not lift a zone of control: the toll rides on top of the paving', () => {
    const state = bareState(16, 9);
    pave(state, 4, 2, 12);
    const mover = createUnit(state, 0, 'warrior', 4, 4);
    const full = mover.movesLeft;
    // An enemy beside two paved hexes: sliding along it is still a slide, and
    // the toll is *added* to the road's third rather than replacing it — a
    // highway through a picket is a cheap step with a price on it.
    // (4, 3) touches both (4, 4) and (5, 4) on an even row.
    createUnit(state, 1, 'warrior', 4, 3);
    const field = zocField(state, 0);
    const price = stepCost(
      state.map,
      at(state, 4, 4),
      at(state, 5, 4),
      moveProfile(state, mover),
      field,
    )!;
    expect(price).toEqual({
      cost: snapMovement(roadStepCost + RULES.movement.zocExtraCost),
      zoc: true,
    });
    advanceAlongPath(state, mover, [{ col: 5, row: 4 }]);
    // And the walk spends exactly that: a two-point column still has most of a
    // point left, where the old lock would have taken all of it.
    expect(mover.movesLeft).toBe(snapMovement(full - price.cost));
    expect(mover.movesLeft).toBeGreaterThan(0);
  });

  it('is torn out by pillage, alone or with the farm', () => {
    const state = bareState(16, 9);
    foundCityAt(state, 1, at(state, 5, 4));
    const tile = at(state, 5, 6);
    tile.road = 0;
    const raider = createUnit(state, 0, 'warrior', 5, 6);
    const raid = applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider.id });
    expect(raid.ok).toBe(true);
    // A bare road is a raid with no improvement in it, and the report says so
    // (`PillageReport`) rather than naming a farm that was never there.
    expect(raid.ok && raid.pillages?.[0]).toMatchObject({ road: true, improvement: undefined });
    expect(tile.road).toBeUndefined();
    expect(roadsBuiltBy(state, 0)).toBe(0);
  });

  it('is written by nothing but an arrival, and by no generated map', () => {
    const state = bareState(16, 9);
    expect(state.map.tiles.some((tile) => tile.road !== undefined)).toBe(false);
    const modules = import.meta.glob('../../src/sim/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const writers: string[] = [];
    for (const [path, text] of Object.entries(modules)) {
      for (const line of text.split('\n')) {
        // An assignment, never a comparison: `=== ` and `!== ` are readers.
        if (!/\.road\s*=(?!=)/.test(line)) continue;
        writers.push(path.slice(path.lastIndexOf('/') + 1));
      }
    }
    // `layRoad` and nothing else — it lives in `roads.ts` now (a leaf, so that
    // the founding verb in `cities.ts` reaches it without crossing a cycle) and
    // it is still the one writer. Pillage *deletes* the key rather than
    // assigning, so it is not a writer here.
    expect(writers).toEqual(['roads.ts']);
  });
});

// --- what a route pays ------------------------------------------------------

describe('a route’s yields', () => {
  it('pays the destination off the origin’s buildings and the two populations', () => {
    const { state, home, partner, trader } = tradeWorld();
    home.population = 6;
    partner.population = 8;
    // 2026-08-27: the origin's buildings set the figure, the destination
    // banks it — "it is best for routes from the capital to later settles,
    // to feed the later settles." `home` already carries `tradeWorld`'s
    // market (a `gold`-category building, so it counts toward production too).
    home.buildings.push('granary', 'library', 'workshop');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);

    const lines = explainRouteYield(state, trader);
    expect(lines.map((line) => line.source)).toEqual([
      `Caravan from ${home.name} · 2 buildings`,
      `Caravan from ${home.name} · 2 buildings`,
      `Caravan from ${home.name} · 14 people`,
    ]);
    // granary + library are food/science; the market and the workshop are
    // both production-side categories (gold, production).
    expect(foldRouteYield(lines)).toEqual({ food: 2, production: 2, gold: 1 });
  });

  it('agrees with the pure preview helper a caravan-free candidate reads', () => {
    // `explainRouteYield` is now `explainRouteYieldBetween` once it has resolved
    // the pair — one implementation, so a live route and a preview of a route
    // that does not exist yet cannot promise different figures.
    const { state, home, partner, trader } = tradeWorld();
    home.population = 6;
    partner.population = 8;
    home.buildings.push('granary', 'library', 'workshop');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);

    expect(explainRouteYieldBetween(state, home, partner)).toEqual(
      explainRouteYield(state, trader),
    );
  });

  it('is derived, not snapshotted: a library built tomorrow raises it tomorrow', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(foldRouteYield(explainRouteYield(state, trader)).food).toBe(0);
    home.buildings.push('library');
    expect(foldRouteYield(explainRouteYield(state, trader)).food).toBe(1);
  });

  it('joins the destination city’s own totals', () => {
    const { state, home, partner, trader } = tradeWorld();
    home.buildings.push('granary', 'amphitheater', 'library', 'workshop', 'barracks');
    const before = cityYields(state, partner);
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    const after = cityYields(state, partner);
    expect(after.food).toBeGreaterThan(before.food);
    expect(after.production).toBeGreaterThan(before.production);
  });

  it('stops paying the turn it lapses, wherever the caravan is standing', () => {
    const { state, home, trader, partner } = tradeWorld();
    home.buildings.push('library');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(explainRouteYield(state, trader)).not.toEqual([]);
    trader.trade!.expiresTurn = state.turn;
    expect(explainRouteYield(state, trader)).toEqual([]);
  });

  it('gives every building a category, and a wonder one too', () => {
    const modules = import.meta.glob('../../data/buildings.json', {
      import: 'default',
      eager: true,
    }) as Record<string, { buildings: Record<string, { category?: string }> }>;
    const rows = Object.values(modules)[0]!.buildings;
    const missing = Object.entries(rows)
      .filter(([, row]) => row.category === undefined)
      .map(([id]) => id);
    expect(missing).toEqual([]);
  });
});

// --- route slots ------------------------------------------------------------

describe('route slots', () => {
  it('is the fold of one line per building on the board', () => {
    const { state, home, partner } = tradeWorld();
    partner.buildings.push('market');
    expect(explainRouteSlots(state, 0)).toEqual([
      { source: `Market · ${home.name}`, slots: 1 },
      { source: `Market · ${partner.name}`, slots: 1 },
    ]);
    expect(routeSlots(state, 0)).toBe(2);
  });

  it('reads a card’s routeRider through the one evaluator', () => {
    const { state, home } = tradeWorld();
    // The Great Lighthouse carries the first `routeRider` in the game, so the
    // shape is live rather than declared and forgotten. A wonder's effects are
    // read off the *board*, so the claim register has to know about it too.
    home.buildings.push('greatLighthouse');
    claimWonder(state, 'greatLighthouse', home);
    const lines = explainRouteSlots(state, 0);
    expect(lines).toHaveLength(2);
    expect(lines[1]!.slots).toBe(1);
    expect(lines[1]!.source).toMatch(/Lighthouse/);
    expect(routeSlots(state, 0)).toBe(2);
  });
});

// --- the city connection ----------------------------------------------------

describe('the city connection', () => {
  it('pays one line for the total, and charges the roads that carried it', () => {
    const { state, partner } = tradeWorld();
    partner.population = 7;
    pave(state, 4, 3, 10);

    expect(connectedCities(state, 0)).toEqual([{ city: partner, gold: 3 }]);
    expect(roadsBuiltBy(state, 0)).toBe(8);
    // Four lines since the maintenance ruling (2026-08-28), and the fixture's
    // capital holds a market — an age-two institution, so 2💰 a turn. The
    // caravan pays no maintenance at all (`trades`), which is why there is no
    // unit line here even though the world holds one.
    expect(explainEmpireGold(state, 0)).toEqual([
      { source: 'City connections · 1 city', gold: 3 },
      { source: 'Road maintenance · 8 hexes', gold: -2 },
      { source: 'Building maintenance · 1 building', gold: -2 },
    ]);
  });

  it('needs a road: an unpaved town is not connected', () => {
    const { state, home } = tradeWorld();
    // Strip the market so the ledger is about the connection alone; with it the
    // list would still carry the maintenance line, which is `upkeep.test.ts`'s
    // concern rather than this one's.
    home.buildings = [];
    expect(connectedCities(state, 0)).toEqual([]);
    expect(explainEmpireGold(state, 0)).toEqual([]);
  });

  it('never fills through another empire’s ground', () => {
    const { state, partner } = tradeWorld();
    pave(state, 4, 3, 10);
    // A rival town in the middle of the road: the highway crosses ground this
    // empire does not control, and a road you do not control is not a
    // connection.
    foundCityAt(state, 1, at(state, 7, 4));
    expect(connectedCities(state, 0)).toEqual([]);
    expect(partner.tradingPost).toBeUndefined();
  });

  it('moves its root when the capital is taken', () => {
    const { state, home, partner } = tradeWorld();
    const third = foundCityAt(state, 0, at(state, 3, 0));
    partner.population = 4;
    third.population = 4;
    pave(state, 4, 3, 10);
    expect(connectedCities(state, 0).map((entry) => entry.city.id)).toEqual([partner.id]);

    // `capitalCityOf` is the oldest city the empire *founded*: mark the palace
    // captured and the graph re-roots on the next town, which is the far end of
    // the same road.
    home.captured = true;
    // The palace is now the far end of the same road, and the town it reaches is
    // the one it used to *be*. The third city is on no road and never was.
    expect(connectedCities(state, 0).map((entry) => entry.city.id)).toEqual([home.id]);
    expect(third.population).toBe(4);
  });

  it('is banked once per player by the yield phase', () => {
    const { state, partner } = tradeWorld();
    partner.population = 8;
    pave(state, 4, 3, 10);
    const player = state.players[0]!;
    const before = player.gold;
    const expected = explainEmpireGold(state, 0).reduce((sum, line) => sum + line.gold, 0);
    resolve(state);
    // The cities' own gold is in there too, so the assertion is that trade's
    // line moved the treasury by exactly its fold on top of them.
    const cities = state.cities
      .filter((city) => city.ownerId === 0)
      .reduce((sum, city) => sum + cityYields(state, city, [], city.queue[0]).gold, 0);
    expect(player.gold - before).toBe(cities + expected);
  });
});

// --- plunder ----------------------------------------------------------------

describe('plundering a caravan', () => {
  it('destroys it and pays the killer’s nearest city', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    trader.col = 6;

    const theirs = foundCityAt(state, 1, at(state, 6, 7));
    const raider = createUnit(state, 1, 'warrior', 6, 5);
    const player = state.players[1]!;
    const goldBefore = player.gold;
    const foodBefore = theirs.foodBasket;
    const popBefore = theirs.population;
    const hammersBefore = theirs.hammerBasket;

    const result = applyCombat(state, raider.id, { col: 6, row: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome.capturedUnitId).toBeNull();
    expect(result.outcome.killed.map((fallen) => fallen.id)).toEqual([trader.id]);
    expect(unitById(state, trader.id)).toBeUndefined();

    const plunder = result.outcome.plundered!;
    expect(plunder.fromOwnerId).toBe(0);
    expect(plunder.gold).toBe(TRADE.pillageBounty.gold);
    expect(plunder.cityName).toBe(theirs.name);
    expect(player.gold - goldBefore).toBe(TRADE.pillageBounty.gold);
    // The food is asked of the *bucket*, not of the basket: a plundered
    // caravan's provisions go through `settleGrowthWindfall`, and since the
    // growth curve came down on 2026-08-28 ten food is exactly a size-1 town's
    // whole threshold — so the honest reading of "the bounty landed" is the
    // basket's rise plus whatever a citizen cost, which is the register entry
    // this path has always gone through.
    const foodLanded =
      theirs.foodBasket - foodBefore +
      (theirs.population > popBefore ? growthThreshold(popBefore) : 0);
    expect(foodLanded).toBe(TRADE.pillageBounty.food);
    expect(theirs.hammerBasket - hammersBefore).toBe(TRADE.pillageBounty.production);
    // The route died with the piece: nothing to expire, nothing to clean up.
    expect(usedRouteSlots(state, 0)).toBe(0);
  });

  it('captures an unladen trader like any other civilian', () => {
    const { state } = tradeWorld();
    const idle = createUnit(state, 0, 'trader', 6, 4);
    createUnit(state, 1, 'warrior', 6, 5);
    const raider = state.units[state.units.length - 1]!;
    const result = applyCombat(state, raider.id, { col: 6, row: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome.capturedUnitId).toBe(idle.id);
    expect(result.outcome.plundered).toBeNull();
    expect(unitById(state, idle.id)?.ownerId).toBe(1);
  });

  it('is taken by the wild too, which has nowhere to put the goods', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    trader.col = 6;
    state.players[1]!.barbarian = true;
    const raider = createUnit(state, 1, 'warrior', 6, 5);

    const result = applyCombat(state, raider.id, { col: 6, row: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(unitById(state, trader.id)).toBeUndefined();
    const plunder = result.outcome.plundered!;
    expect(plunder.cityName).toBeNull();
    expect(plunder.food).toBe(0);
    expect(plunder.production).toBe(0);
    expect(plunder.warning).toBe('no city to receive the goods');
  });

  it('never reaches captureUnit, and the exception lives on the occasion', () => {
    const modules = import.meta.glob('../../src/sim/{arrival,combat,state}.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const text = (name: string): string =>
      Object.entries(modules).find(([path]) => path.endsWith(`/${name}.ts`))![1];
    // Both occasions ask `trades` before they hand anything over…
    expect(text('arrival')).toMatch(/trades\(otherDef\)/);
    expect(text('combat')).toMatch(/plundersUnit/);
    // …and the change of hands itself has never heard of routes.
    const capture = text('state');
    const body = capture.slice(capture.indexOf('export function captureUnit('));
    expect(body.slice(0, body.indexOf('\n}'))).not.toMatch(/trade|trades\(/);
  });
});

// --- the attack command's own plunder news ----------------------------------

describe("the attack command's plunder news", () => {
  it('carries the plunder figures on an ordered attack that kills a laden trader', () => {
    const { state, home, partner, trader } = tradeWorld();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    trader.col = 6;

    const theirs = foundCityAt(state, 1, at(state, 6, 7));
    const raider = createUnit(state, 1, 'warrior', 6, 5);

    const result = applyCommand(state, {
      type: 'attack',
      playerId: 1,
      unitId: raider.id,
      target: { col: 6, row: 4 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.combats).toHaveLength(1);
    const plunder = result.combats![0]!.plundered!;
    expect(plunder.fromOwnerId).toBe(0);
    expect(plunder.gold).toBe(TRADE.pillageBounty.gold);
    expect(plunder.cityName).toBe(theirs.name);
  });

  it('reports no plunder on an ordered attack that kills an ordinary unit', () => {
    const state = bareState(16, 9);
    const attacker = createUnit(state, 0, 'swordsman', 4, 4);
    const doomed = createUnit(state, 1, 'warrior', 5, 4);
    doomed.hp = 3;

    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: attacker.id,
      target: { col: 5, row: 4 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(unitById(state, doomed.id)).toBeUndefined();
    expect(result.combats).toBeUndefined();
  });
});


// --- The Founders' Road -----------------------------------------------------

/**
 * The doctrine's road, re-ruled by the user on 2026-08-28: *"add roads if there
 * is a viable path (no limit to road length); the roads are maintenance-free; if
 * no road can be added, the road doesn't appear and the city is not considered
 * connected."*
 *
 * Three claims, and they fail for different reasons, so they are three tests:
 * the survey is a **path** (a strait is fatal, not a gap), what it lays is
 * **free** (`Tile.roadFree`, and `roadsBuiltBy` is its one reader), and the mark
 * is **whoever got there first** (`layRoad` never repaves, in either direction).
 *
 * It lives in this file rather than beside the other Statecraft riders because
 * every one of those claims is about a *road*, and the road — what it costs, who
 * pays for it, and what it connects — is `trade.ts`'s.
 */
describe("The Founders' Road", () => {
  /**
   * A cylinder cut into two by two full columns of **coast**.
   *
   * Two walls and not one, because the map wraps east to west: a single line of
   * water leaves the far side of the world as a way round. Coast rather than
   * ocean is the load-bearing choice — `bareState` hands every seat Sailing, so
   * a caravan of this empire *could* embark across it, and the road may not.
   */
  function splitWorld(): GameState {
    const state = bareState(16, 9);
    for (let row = 0; row < 9; row++) {
      at(state, 7, row).terrain = 'coast';
      at(state, 15, row).terrain = 'coast';
    }
    return state;
  }

  /** Player 0 with the doctrine, and a capital at (3, 4). */
  function realm(state: GameState): City {
    const capital = foundCityAt(state, 0, at(state, 3, 4));
    playerById(state, 0)!.statecraft.doctrines.push('foundersRoad');
    return capital;
  }

  it('lays the whole path when there is one, and marks every hex free', () => {
    const state = bareState(16, 9);
    const capital = realm(state);
    const town = foundCityAt(state, 0, at(state, 10, 4));

    // Seven steps west along row 4, the last of them the capital's own gates.
    // Every hex of the path, not the hexes a straight line happened to cross.
    for (let col = 4; col <= 9; col++) {
      const tile = at(state, col, 4);
      expect(tile.road, `(${col}, 4)`).toBe(0);
      expect(tile.roadFree, `(${col}, 4)`).toBe(true);
    }
    expect(at(state, capital.col, capital.row).roadFree).toBe(true);

    // The road is a road: the fill crosses it and the town is connected.
    expect(connectedCities(state, 0).map((entry) => entry.city.id)).toEqual([town.id]);
  });

  it('lays nothing across a strait, and the town is simply not connected', () => {
    const state = splitWorld();
    realm(state);
    const marooned = foundCityAt(state, 0, at(state, 11, 4));

    expect(state.map.tiles.some((tile) => tile.road !== undefined)).toBe(false);
    expect(connectedCities(state, 0)).toEqual([]);

    // And the refusal is the *road's*, not the map's: a caravan of this empire
    // holds Sailing and would have crossed. `layFoundingRoad` surveys with
    // `embarks: false`, which is the whole of why the strait is fatal.
    const swimmer = createUnit(state, 0, 'trader', marooned.col, marooned.row);
    const goal = at(state, 3, 4);
    expect(findPath(state, swimmer, goal)).not.toBeNull();
    expect(findPath(state, swimmer, goal, { def: unitDef('trader'), embarks: false, naval: false, ocean: false })).toBeNull();
  });

  it('is free of maintenance, and the ledger charges only the roads that are not', () => {
    const state = bareState(16, 9);
    realm(state);
    foundCityAt(state, 0, at(state, 10, 4));
    // Seven decreed hexes on the board, and not one of them is billed.
    expect(state.map.tiles.filter((tile) => tile.roadFree === true).length).toBe(7);
    expect(roadsBuiltBy(state, 0)).toBe(0);
    expect(explainEmpireGold(state, 0).some((line) => /Road maintenance/.test(line.source))).toBe(
      false,
    );

    // Eight worn hexes somewhere else, and the line counts those and only those.
    pave(state, 7, 0, 7);
    expect(roadsBuiltBy(state, 0)).toBe(8);
    const line = explainEmpireGold(state, 0).find((entry) => /Road maintenance/.test(entry.source));
    expect(line?.source).toBe('Road maintenance · 8 hexes');
    expect(line?.gold).toBe(-Math.floor(8 / TRADE.roadsPerMaintenance));
  });

  it('keeps the free mark when a caravan later walks the same hex', () => {
    const state = bareState(16, 9);
    realm(state);
    foundCityAt(state, 0, at(state, 10, 4));
    const decreed = at(state, 6, 4);

    // `layRoad` refuses to repave, so the second comer writes neither field —
    // which is what makes the mark "whoever got there first" rather than
    // "whoever asked last". Nobody's bill changes.
    expect(layRoad(decreed, 1)).toBe(false);
    expect(decreed.road).toBe(0);
    expect(decreed.roadFree).toBe(true);
    expect(roadsBuiltBy(state, 0)).toBe(0);
    expect(roadsBuiltBy(state, 1)).toBe(0);

    // And the other direction: a worn road a decree draws through stays worn.
    const worn = at(state, 6, 6);
    expect(layRoad(worn, 0)).toBe(true);
    expect(layRoad(worn, 0, true)).toBe(false);
    expect(worn.roadFree).toBeUndefined();
    expect(roadsBuiltBy(state, 0)).toBe(1);
  });

  it('loses the free mark with the road a raider tears up', () => {
    const state = bareState(16, 9);
    realm(state);
    foundCityAt(state, 0, at(state, 10, 4));
    const decreed = at(state, 6, 4);
    const raider = createUnit(state, 1, 'swordsman', 6, 4);

    pillageAt(state, raider, decreed);
    expect(decreed.road).toBeUndefined();
    // Left behind, it would be a maintenance exemption sitting on bare ground
    // for the next caravan to inherit.
    expect(decreed.roadFree).toBeUndefined();
  });
});

// --- determinism ------------------------------------------------------------

describe('trade in the log', () => {
  function config(): GameConfig {
    return {
      seed: 71,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
  }

  it('carries the schema version that says a caravan starts a route by name', () => {
    // v23 wrote `sendTrader`, which this build's reducer does not have: a v23
    // log would stop dead partway through a replay, so the save is refused
    // rather than misread.
    // v40: the Cathedral (Entry LV) — cost 340 and a consecration draw at completion
    // moved every replay that raised one.
    expect(SCHEMA_VERSION).toBe(41);
  });

  it('refuses the command the old build wrote, rather than half-applying it', () => {
    const { state, home, partner, trader } = tradeWorld();
    const before = snapshotState(state);
    const stale = {
      type: 'sendTrader',
      playerId: 0,
      unitId: trader.id,
      cityId: partner.id,
    } as unknown as Command;

    const result = applyCommand(state, stale);
    expect(result.ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
    // And the verb that replaced it is accepted against the same board.
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
  });

  it('replays a game with two routes byte-for-byte', () => {
    // The world these commands are issued against is built directly, because
    // founding a city is not a command a caravan test wants in its log. What
    // has to reproduce is the *log*, applied to the state it was written
    // against — which is exactly what a save's `{config, log}` promises one
    // level up.
    const game: Game = { config: createGame(config()).config, state: bareState(16, 9), log: [] };
    const state = game.state;
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const partner = foundCityAt(state, 0, at(state, 10, 4));
    const north = foundCityAt(state, 0, at(state, 3, 0));
    home.buildings.push('market');
    north.buildings.push('market');
    // Two caravans and two different pairs. Neither is standing where it sets
    // out from — the teleport is part of what has to replay byte-for-byte.
    const first = createUnit(state, 0, 'trader', 6, 6);
    const second = createUnit(state, 0, 'trader', 7, 2);
    const before = snapshotState(state);

    expect(dispatch(game, send(0, first.id, home.id, partner.id)).ok).toBe(true);
    expect(dispatch(game, send(0, second.id, north.id, partner.id)).ok).toBe(true);
    for (let turn = 0; turn < 6; turn++) {
      dispatch(game, { type: 'endTurn', playerId: 0 });
      dispatch(game, { type: 'endTurn', playerId: 1 });
    }
    const after = snapshotState(game.state);
    // Roads were laid, and both caravans are still carrying their routes.
    expect(roadsBuiltBy(game.state, 0)).toBeGreaterThan(0);
    expect(usedRouteSlots(game.state, 0)).toBe(2);

    const replayed = JSON.parse(before) as GameState;
    for (const command of game.log) {
      const result = applyCommand(replayed, command);
      expect(result.ok, JSON.stringify(command)).toBe(true);
    }
    expect(snapshotState(replayed)).toBe(after);

    // And the ordinary save round-trip still parses with routes in the log.
    expect((JSON.parse(saveGame(game)) as { schemaVersion: number }).schemaVersion).toBe(
      SCHEMA_VERSION,
    );
  });

  it("replays a founding under The Founders' Road byte-for-byte", () => {
    // The doctrine is pushed onto the seat before the snapshot, exactly as the
    // two-route replay above builds its world before its log: what has to
    // reproduce is the *log* applied to the state it was written against.
    const game: Game = { config: createGame(config()).config, state: bareState(16, 9), log: [] };
    const state = game.state;
    foundCityAt(state, 0, at(state, 3, 4));
    playerById(state, 0)!.statecraft.doctrines.push('foundersRoad');
    const settler = createUnit(state, 0, 'settler', 10, 4);
    const before = snapshotState(state);

    expect(
      dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id }).ok,
    ).toBe(true);
    const after = snapshotState(game.state);
    expect(game.state.map.tiles.filter((tile) => tile.roadFree === true).length).toBe(7);

    const replayed = JSON.parse(before) as GameState;
    for (const command of game.log) {
      expect(applyCommand(replayed, command).ok, JSON.stringify(command)).toBe(true);
    }
    expect(snapshotState(replayed)).toBe(after);
  });
});

// --- The Imperial Post ------------------------------------------------------

/**
 * The tree pass of 2026-08-30's one change to this ledger: a technology that
 * keeps a town's own roads for nothing.
 *
 * It is a clause on the **count** and not on the price, which is what keeps
 * `explainEmpireGold` four lines: the road line prints the number it is charging
 * on, so a count that included hexes nobody is billed for would be a line whose
 * own figure did not explain it — `Tile.roadFree`'s argument, one occasion over.
 */
describe('The Imperial Post', () => {
  /** Puts the Post in a seat's hand, through the register rather than by name. */
  function post(state: GameState, playerId: number): void {
    const player = state.players[playerId]!;
    for (const id of TECH_IDS) {
      if (!(techDef(id).effects ?? []).some((effect) =>
        effect.kind === 'behaviorRule' && effect.rule === 'freeCityRoads',
      )) {
        continue;
      }
      if (!player.techsResearched.includes(id)) player.techsResearched.push(id);
    }
  }

  it('keeps the roads near a town, and charges the ones out in the country', () => {
    const { state, home, partner, trader } = tradeWorld();
    applyCommand(state, send(0, trader.id, home.id, partner.id));
    runUntil(state, () => trader.col === partner.col && trader.row === partner.row);
    runUntil(state, () => trader.col === home.col && trader.row === home.row);
    const charged = roadsBuiltBy(state, 0);
    expect(charged).toBeGreaterThan(0);

    post(state, 0);
    const posted = roadsBuiltBy(state, 0);
    // Both towns are on row 4 and the road runs between them, so the reach of
    // three hexes covers the whole of it: the empire pays nothing.
    expect(posted).toBeLessThan(charged);
    expect(explainEmpireGold(state, 0).some((line) => /Road maintenance/.test(line.source))).toBe(
      false,
    );

    // A hex out of reach of every town is charged exactly as before — the rule
    // is about *where* a road is, never about who researched what.
    const far = at(state, 3, 0);
    far.road = 0;
    expect(roadsBuiltBy(state, 0)).toBe(posted + 1);
  });

  it('pays a further coin for every city joined to the capital', () => {
    const { state, home, partner, trader } = tradeWorld();
    applyCommand(state, send(0, trader.id, home.id, partner.id));
    runUntil(state, () => trader.col === partner.col && trader.row === partner.row);
    runUntil(state, () => trader.col === home.col && trader.row === home.row);
    partner.population = 6;
    const line = (): number =>
      explainEmpireGold(state, 0).find((entry) => /City connections/.test(entry.source))?.gold ?? 0;
    const before = line();
    post(state, 0);
    // One connected city, one further coin — folded into the connection line's
    // own figure rather than multiplied afterwards, which is rule 5 for a
    // treasury and the reason there is still only one line.
    expect(line()).toBe(before + connectedCities(state, 0).length);
  });
});
