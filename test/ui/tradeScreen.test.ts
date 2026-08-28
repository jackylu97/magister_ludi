/**
 * The Trade screen: every caravan on the road, and every road not yet taken.
 *
 * `tradePanels.test.ts` covers the surfaces trade already had — the caravan's
 * sheet, the town's Routes row, the treasury's ledger — and what it pins there
 * is the agreement between a preview and a payout. This file covers the screen,
 * which after the user's ruling of 2026-08-28 *is* the verb: there is no send
 * mode, no board full of partner plates and no rule about where a caravan is
 * standing. What it can be quietly wrong about is its own:
 *
 *   1. **The chip's two figures** are `usedRouteSlots` against `routeSlots`, and
 *      the card under it folds to the gold the game actually banks.
 *   2. **A greyed row's sentence is the reducer's** — `routeStartable`'s, asked
 *      of the *pair* — except for the one refusal the user wrote out himself,
 *      which every surface has to print identically or it is two facts.
 *   3. **Start names the right three ids**: the chooser when the screen was
 *      opened from a trader's sheet, the first idle caravan otherwise.
 *   4. **The sort and the filter** are pure functions over one flat row model,
 *      total in their ordering, and they never sink a greyed row.
 *   5. **The pane says what to do when the empire has no caravan.**
 *
 * No jsdom in this suite (see `controls.test.ts`), so the screen itself is not
 * rendered: what is covered is the pure half — every decision above is a
 * function — and, through the source exactly as `seatRoster.test.ts` reads its
 * rule, the wirings that span files (the four doors, and the pan-and-close).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type City, type GameState, type Unit, createUnit } from '../../src/sim/state';
import {
  explainRouteYieldBetween,
  explainTradeGold,
  foldRouteYield,
  routeSlots,
  routeStartable,
  tradeGold,
  usedRouteSlots,
} from '../../src/sim/trade';
import { applyCommand } from '../../src/sim/commands';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { NO_ROUTE_CAPACITY, routeFigures } from '../../src/ui/tradeLines';
import {
  type TradeRouteRow,
  filterRouteRows,
  groupRouteRows,
  idleTraders,
  noTraderNote,
  routeLedgerTitle,
  routeRowValue,
  runningRoutes,
  sortRouteRows,
  startCommandFor,
  startableError,
  starterNote,
  startingTrader,
  tradeLedger,
  tradeOrigins,
  tradeRouteRows,
} from '../../src/ui/tradeScreen';
import { at, bareState } from '../sim/improvementHelpers';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/tradeScreen.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/unitPanel.ts',
    '../../src/ui/cityPanel.ts',
    '../../src/ui/controls.ts',
    '../../src/main.ts',
  ],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/**
 * Three towns of seat 0 in a row, two markets in the first (two route slots),
 * and a caravan standing in it — `tradePanels.test.ts`' bench with one more
 * partner, because the screen's whole job is to compare partners.
 */
function tradeWorld(): {
  state: GameState;
  home: City;
  near: City;
  far: City;
  trader: Unit;
} {
  const state = bareState(24, 9);
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const near = foundCityAt(state, 0, at(state, 9, 4));
  const far = foundCityAt(state, 0, at(state, 15, 4));
  home.buildings.push('market', 'market');
  const trader = createUnit(state, 0, 'trader', 3, 4);
  return { state, home, near, far, trader };
}

describe('the routes chip', () => {
  it('reads running against allowed, off the simulation’s own two counts', () => {
    const { state, trader, home, near } = tradeWorld();
    expect(tradeLedger(state, 0).chip).toBe(
      `${usedRouteSlots(state, 0)} / ${routeSlots(state, 0)}`,
    );
    expect(tradeLedger(state, 0).used).toBe(0);

    const sent = applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });
    expect(sent.ok).toBe(true);
    const ledger = tradeLedger(state, 0);
    expect(ledger.used).toBe(1);
    expect(ledger.slots).toBe(routeSlots(state, 0));
    expect(ledger.chip).toBe(`${ledger.used} / ${ledger.slots}`);
  });
});

describe('the summary ledger', () => {
  it('is one line per route, then trade’s two empire lines, folding to the gold', () => {
    const { state, home, trader, near } = tradeWorld();
    // Something for the route to be worth: a route pays a hammer per
    // production, military or gold building standing at its **origin**.
    home.buildings.push('barracks');
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });

    const ledger = tradeLedger(state, 0);
    const routes = runningRoutes(state, 0);
    expect(routes).toHaveLength(1);
    // The route's line, then whatever `explainTradeGold` has to say. Never a
    // sentence composed here.
    expect(ledger.lines.slice(0, routes.length).map((line) => line.source)).toEqual([
      `${routes[0]!.fromName} ⇄ ${routes[0]!.toName}`,
    ]);
    expect(ledger.lines.slice(routes.length).map((line) => line.source)).toEqual(
      explainTradeGold(state, 0).map((line) => line.source),
    );

    // The fold, and the only sum of one: what the routes pay in gold plus what
    // the empire's roads and connections do.
    let routeGold = 0;
    for (const route of routes) routeGold += route.gold;
    expect(ledger.total).toBe(routeGold + tradeGold(state, 0));
  });

  it('says the route is worth nothing rather than printing a row of zeroes', () => {
    // A partner with no buildings and few people is a real answer, and it is
    // the argument *against* sending — `routeFigures`' rule, shared.
    const { state, trader, home, near } = tradeWorld();
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });
    const [route] = runningRoutes(state, 0);
    expect(route!.figures).toBe(routeFigures(foldRouteYield(route!.lines)));
  });

  it('prints a lapsed route rather than dropping it, because the slot is still held', () => {
    const { state, trader, home, near } = tradeWorld();
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });
    // Walk the clock past the route without touching the caravan: a `TradeRoute`
    // carries an absolute `expiresTurn` and nothing decrements it.
    state.turn = trader.trade!.expiresTurn + 5;
    const [route] = runningRoutes(state, 0);
    expect(route).toBeDefined();
    expect(route!.turnsLeft).toBe(0);
    expect(usedRouteSlots(state, 0)).toBe(1);
  });

  it('turns a route’s lines into the sim’s own sentences, never a paraphrase', () => {
    const { state, trader, home, near } = tradeWorld();
    near.buildings.push('barracks');
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });
    const [route] = runningRoutes(state, 0);
    for (const line of route!.lines) {
      expect(routeLedgerTitle(route!.lines)).toContain(line.source);
    }
    expect(routeLedgerTitle([])).toBe('This route pays nothing yet');
  });
});

describe('the right pane', () => {
  it('groups by origin in founding order, one row per other town', () => {
    const { state, home, near, far } = tradeWorld();
    const origins = tradeOrigins(state, 0);
    expect(origins.map((origin) => origin.cityId)).toEqual([home.id, near.id, far.id]);
    for (const origin of origins) {
      expect(origin.candidates.map((candidate) => candidate.cityId).sort()).toEqual(
        [home.id, near.id, far.id].filter((id) => id !== origin.cityId).sort(),
      );
    }
  });

  it('quotes the preview the simulation would pay, not a second arithmetic', () => {
    const { state, home, near } = tradeWorld();
    near.buildings.push('barracks', 'library');
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    const candidate = origin.candidates.find((entry) => entry.cityId === near.id)!;
    const lines = explainRouteYieldBetween(state, home, near);
    expect(candidate.lines).toEqual(lines);
    expect({
      food: candidate.food,
      production: candidate.production,
      gold: candidate.gold,
    }).toEqual(foldRouteYield(lines));
    expect(candidate.figures).toBe(routeFigures(foldRouteYield(lines)));
  });

  it('sorts gold, then food, then production by default', () => {
    const { state, home, near } = tradeWorld();
    // Food and production are read off the **origin** (2026-08-27), so every
    // candidate sent from `home` quotes the same figures for those two voices.
    // Gold still varies by combined population, which is what this sort
    // actually exercises: the near town pays more by having the people.
    near.population = 40;
    home.population = 40;
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    const order = origin.candidates;
    for (let i = 1; i < order.length; i += 1) {
      const before = order[i - 1]!;
      const after = order[i]!;
      const key =
        before.gold !== after.gold
          ? [before.gold, after.gold]
          : before.food !== after.food
            ? [before.food, after.food]
            : [before.production, after.production];
      expect(key[0]!).toBeGreaterThanOrEqual(key[1]!);
    }
    expect(order[0]!.cityId).toBe(near.id);
  });

  /**
   * The pass's structural claim (2026-08-28). A row is a **pair**, and the gate
   * it greys with is the one that knows nothing about any particular piece —
   * because the caravan is teleported to the origin, so which one it is cannot
   * change the answer.
   */
  it('greys a row with the reducer’s pair gate, with no caravan named at all', () => {
    const { state, home, near, far, trader } = tradeWorld();
    // One slot only: start a route to the near town, and the far one is refused
    // for the reason the reducer would refuse it.
    home.buildings.length = 0;
    home.buildings.push('market');
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });

    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    for (const candidate of origin.candidates) {
      expect(candidate.error, candidate.name).toBe(
        startableError(state, 0, home.id, candidate.cityId),
      );
    }
    // And the running pair is marked rather than dropped.
    expect(origin.candidates.find((entry) => entry.cityId === near.id)!.running).toBe(true);
    // The refusal here is the ledger being full, which is the one sentence the
    // interface says in its own words. See below.
    expect(origin.candidates.find((entry) => entry.cityId === far.id)!.error).toBe(
      NO_ROUTE_CAPACITY,
    );
  });

  it('offers a row from a town no caravan is anywhere near', () => {
    // The whole of the ruling in one assertion: `near` has no piece standing in
    // it and its rows are startable anyway.
    const { state, near, home } = tradeWorld();
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === near.id)!;
    const toHome = origin.candidates.find((entry) => entry.cityId === home.id)!;
    expect(toHome.error).toBeNull();
    expect(startCommandFor(origin, toHome, startingTrader(state, 0, null))).toEqual({
      unitId: state.units[0]!.id,
      fromCityId: near.id,
      toCityId: home.id,
    });
  });

  it('names the technology when the empire has no idle caravan at all', () => {
    const { state, trader, home, near } = tradeWorld();
    expect(noTraderNote(state, 0)).toBeNull();
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });
    expect(noTraderNote(state, 0)).toBe('Build a trader (Currency) to start a route.');
  });
});

/**
 * The one refusal the interface says in its **own** words (user, 2026-08-28),
 * and the property that makes it safe: it is swapped in on the *slot* question
 * rather than by reading the reducer's prose.
 */
describe('a full route ledger', () => {
  it('says the user’s sentence, on every pair, in place of the reducer’s two', () => {
    const { state, home, near, far, trader } = tradeWorld();
    home.buildings.length = 0;
    home.buildings.push('market');
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: near.id,
    });
    // The reducer still says its own thing; only the surface is reworded.
    expect(routeStartable(state, 0, home.id, far.id)).toBe('All 1 of your trade routes are running');
    expect(startableError(state, 0, home.id, far.id)).toBe(NO_ROUTE_CAPACITY);
    expect(NO_ROUTE_CAPACITY).toBe(
      'Not enough trade route capacity. Build markets and harbours to gain more.',
    );
  });

  it('says it for a seat with no market at all, which is the reducer’s other clause', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.length = 0;
    expect(routeSlots(state, 0)).toBe(0);
    expect(startableError(state, 0, home.id, near.id)).toBe(NO_ROUTE_CAPACITY);
  });

  it('leaves every other refusal in the reducer’s words', () => {
    // A blocked pair with slots to spare: the sentence is the sim's, verbatim.
    //
    // It used to be a worker parked in the destination's gates, and the user's
    // stacking ruling of 2026-08-28 deleted that refusal outright — a trader has
    // its own slot on a hex now, so nothing standing in a town can turn a
    // caravan away. The clause this reaches for instead is the deferred one, and
    // it is the better example anyway: the surface rewords the two capacity
    // sentences and passes every other one through untouched.
    const { state, home, far } = tradeWorld();
    far.ownerId = 1;
    const problem = routeStartable(state, 0, home.id, far.id);
    expect(problem).toBe(
      `${far.name} belongs to another empire — foreign routes wait on diplomacy`,
    );
    expect(startableError(state, 0, home.id, far.id)).toBe(problem);
  });
});

describe('Start', () => {
  it('names the chooser when the screen was opened from a trader’s sheet', () => {
    const { state, near, far } = tradeWorld();
    // The chooser is standing in open country, which is the whole point of the
    // ruling: it may be spent on a pair neither of whose towns it is near.
    const second = createUnit(state, 0, 'trader', 6, 4);
    expect(startingTrader(state, 0, second.id)?.id).toBe(second.id);
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === near.id)!;
    const candidate = origin.candidates.find((entry) => entry.cityId === far.id)!;
    expect(startCommandFor(origin, candidate, startingTrader(state, 0, second.id))).toEqual({
      unitId: second.id,
      fromCityId: near.id,
      toCityId: far.id,
    });

    // And the command it names is one the reducer takes.
    const command = startCommandFor(origin, candidate, startingTrader(state, 0, second.id))!;
    const result = applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: command.unitId,
      fromCityId: command.fromCityId,
      toCityId: command.toCityId,
    });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    // Teleported: the piece is standing in the origin it was sent from.
    expect({ col: second.col, row: second.row }).toEqual({ col: near.col, row: near.row });
  });

  it('falls back to the first idle caravan in state.units order', () => {
    const { state, trader } = tradeWorld();
    const second = createUnit(state, 0, 'trader', 6, 4);
    expect(idleTraders(state, 0).map((unit) => unit.id)).toEqual([trader.id, second.id]);
    expect(startingTrader(state, 0, null)?.id).toBe(trader.id);
  });

  it('drops a chooser that is no longer idle rather than dispatching it', () => {
    // A screen left open across a resolution that gave the chooser a route must
    // not send a piece that has moved on.
    const { state, trader, home, near } = tradeWorld();
    const second = createUnit(state, 0, 'trader', 6, 4);
    expect(
      applyCommand(state, {
        type: 'startRoute',
        playerId: 0,
        unitId: trader.id,
        fromCityId: home.id,
        toCityId: near.id,
      }).ok,
    ).toBe(true);
    expect(startingTrader(state, 0, trader.id)?.id).toBe(second.id);
  });

  it('says which caravan is about to be spent, and where it is', () => {
    const { state, trader, home } = tradeWorld();
    expect(starterNote(state, trader)).toBe(
      `Caravan from ${cityDisplayName(state, home)} will be sent`,
    );
    trader.col = 6;
    expect(starterNote(state, trader)).toBe('A caravan in the field will be sent');
    expect(starterNote(state, null)).toBeNull();
  });

  it('is offered on no row with no caravan anywhere, and on no row the reducer refuses', () => {
    const { state, home, near } = tradeWorld();
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    const candidate = origin.candidates.find((entry) => entry.cityId === near.id)!;
    expect(startCommandFor(origin, candidate, null)).toBeNull();
    const refused = { ...candidate, error: 'nope' };
    expect(startCommandFor(origin, refused, startingTrader(state, 0, null))).toBeNull();
  });
});

/**
 * The right pane's two controls (user, 2026-08-28). Both are pure functions over
 * one flat row model, which is the property that lets the screen filter, sort
 * and re-group in three passes with no comparator written twice.
 */
describe('the sort and the filter', () => {
  /** Four towns so a column has something to rank, with figures worth ranking. */
  function sortWorld(): { state: GameState; towns: City[] } {
    const state = bareState(24, 9);
    const a = foundCityAt(state, 0, at(state, 3, 4));
    const b = foundCityAt(state, 0, at(state, 8, 4));
    const c = foundCityAt(state, 0, at(state, 13, 4));
    a.buildings.push('market', 'market', 'granary', 'barracks');
    a.population = 12;
    b.population = 7;
    c.population = 3;
    createUnit(state, 0, 'trader', 3, 4);
    // A *foreign* piece holding the third town's gates, so some rows are refused
    // and some are not — which is what the "greyed rows keep their place" claim
    // needs to be about anything. It was one of this seat's own workers until
    // the user's stacking ruling of 2026-08-28: a caravan shares a hex with
    // anything of yours now, so only an enemy can still make a town a place no
    // trader could arrive at.
    createUnit(state, 1, 'warrior', c.col, c.row);
    return { state, towns: [a, b, c] };
  }

  function rowsOf(state: GameState): TradeRouteRow[] {
    return tradeRouteRows(tradeOrigins(state, 0));
  }

  it('is a flat model that regroups into exactly the origins it came from', () => {
    const { state, towns } = sortWorld();
    const origins = tradeOrigins(state, 0);
    const rows = tradeRouteRows(origins);
    expect(rows).toHaveLength(towns.length * (towns.length - 1));
    const groups = groupRouteRows(origins, rows);
    expect(groups.map((group) => group.origin.cityId)).toEqual(
      origins.map((origin) => origin.cityId),
    );
    for (const group of groups) {
      for (const row of group.rows) expect(row.origin.cityId).toBe(group.origin.cityId);
    }
  });

  it('sorts by each column in both directions', () => {
    const { state } = sortWorld();
    const rows = rowsOf(state);
    for (const key of ['food', 'production', 'gold', 'total'] as const) {
      const down = sortRouteRows(rows, key, 'desc');
      for (let i = 1; i < down.length; i += 1) {
        expect(routeRowValue(down[i - 1]!, key)).toBeGreaterThanOrEqual(
          routeRowValue(down[i]!, key),
        );
      }
      const up = sortRouteRows(rows, key, 'asc');
      for (let i = 1; i < up.length; i += 1) {
        expect(routeRowValue(up[i - 1]!, key)).toBeLessThanOrEqual(routeRowValue(up[i]!, key));
      }
      // The same rows, only reordered — a sort that dropped one would pass every
      // monotonicity check above.
      expect(down).toHaveLength(rows.length);
      expect(up).toHaveLength(rows.length);
    }
  });

  it('reads Total as the three summed and nothing else', () => {
    const { state } = sortWorld();
    for (const row of rowsOf(state)) {
      const { food, production, gold } = row.candidate;
      expect(routeRowValue(row, 'total')).toBe(food + production + gold);
    }
  });

  it('breaks ties by the origin’s name, then the destination’s, deterministically', () => {
    const { state } = sortWorld();
    const rows = rowsOf(state);
    // Every row of one origin quotes the same food and production (they are the
    // origin's buildings), so `food` is a column of ties within each group.
    const sorted = sortRouteRows(rows, 'food', 'desc');
    for (let i = 1; i < sorted.length; i += 1) {
      const before = sorted[i - 1]!;
      const after = sorted[i]!;
      if (routeRowValue(before, 'food') !== routeRowValue(after, 'food')) continue;
      if (before.origin.name !== after.origin.name) {
        expect(before.origin.name < after.origin.name).toBe(true);
      } else {
        expect(before.candidate.name <= after.candidate.name).toBe(true);
      }
    }
    // And it is a function of the rows, not of the array they arrived in.
    const shuffled = [...rows].reverse();
    expect(sortRouteRows(shuffled, 'food', 'desc')).toEqual(sorted);
  });

  it('keeps the default order when no column is picked', () => {
    const { state } = sortWorld();
    const rows = sortRouteRows(rowsOf(state), null, 'desc');
    for (let i = 1; i < rows.length; i += 1) {
      const before = rows[i - 1]!.candidate;
      const after = rows[i]!.candidate;
      if (before.gold !== after.gold) expect(before.gold).toBeGreaterThan(after.gold);
      else if (before.food !== after.food) expect(before.food).toBeGreaterThan(after.food);
      else expect(before.production).toBeGreaterThanOrEqual(after.production);
    }
    // The direction is not consulted for the default: it is an order, not a
    // column, and a screen that flipped it would have a state nothing sets.
    expect(sortRouteRows(rowsOf(state), null, 'asc')).toEqual(rows);
  });

  it('never sinks a greyed row — the refusal is the argument for the road', () => {
    const { state, towns } = sortWorld();
    // Some rows refused (the third town's gates are occupied) and some not: the
    // greyed ones must still rank on their figures rather than being pushed
    // under the startable ones.
    const rows = rowsOf(state);
    const blocked = rows.filter((row) => row.candidate.error !== null);
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked.length).toBeLessThan(rows.length);
    const sorted = sortRouteRows(rows, 'gold', 'desc');
    for (let i = 1; i < sorted.length; i += 1) {
      expect(routeRowValue(sorted[i - 1]!, 'gold')).toBeGreaterThanOrEqual(
        routeRowValue(sorted[i]!, 'gold'),
      );
    }
    // Concretely: the top row by gold is the pair with the most people between
    // them, refused or not.
    const best = sorted[0]!;
    const richest = towns[0]!.population + towns[1]!.population;
    expect(best.candidate.gold).toBe(Math.max(...rows.map((row) => row.candidate.gold)));
    expect(richest).toBeGreaterThan(0);
  });

  it('filters to one origin, and to all of them for null', () => {
    const { state, towns } = sortWorld();
    const rows = rowsOf(state);
    expect(filterRouteRows(rows, null)).toHaveLength(rows.length);
    const only = filterRouteRows(rows, towns[1]!.id);
    expect(only).toHaveLength(towns.length - 1);
    for (const row of only) expect(row.origin.cityId).toBe(towns[1]!.id);
    // A town that is not an origin of anything filters to nothing rather than
    // throwing, and regroups to no groups at all.
    expect(filterRouteRows(rows, 9999)).toEqual([]);
    expect(groupRouteRows(tradeOrigins(state, 0), [])).toEqual([]);
  });

  it('sorts inside the shown groups, because the grouping is the last pass', () => {
    const { state } = sortWorld();
    const origins = tradeOrigins(state, 0);
    const groups = groupRouteRows(
      origins,
      sortRouteRows(filterRouteRows(tradeRouteRows(origins), null), 'gold', 'asc'),
    );
    for (const group of groups) {
      for (let i = 1; i < group.rows.length; i += 1) {
        expect(routeRowValue(group.rows[i - 1]!, 'gold')).toBeLessThanOrEqual(
          routeRowValue(group.rows[i]!, 'gold'),
        );
      }
    }
    // And the groups themselves stay in founding order whatever the sort did.
    expect(groups.map((group) => group.origin.cityId)).toEqual(
      origins.map((origin) => origin.cityId),
    );
  });
});

/**
 * The wirings that span files, read off the source for `seatRoster.test.ts`'
 * reason: the only property that distinguishes a correct file from a
 * nearly-correct one is *which function it called*, and there is no jsdom here
 * to press a button in.
 */
describe('the screen’s four doors and its one camera', () => {
  it('is opened from the routes chip, both caravan sheets and the city panel', () => {
    expect(source('topBar.ts')).toContain('onOpenTrade');
    expect(source('unitPanel.ts')).toContain('onOpenTrade');
    expect(source('unitPanel.ts')).toContain('onStartRoute');
    expect(source('cityPanel.ts')).toContain('onOpenTrade');
    // And all four are wired to one screen.
    const main = source('main.ts');
    expect(main).toContain('createTradeScreen');
    expect(main.match(/onOpenTrade/g) ?? []).toHaveLength(3);
    // The fourth door is the only one that carries a chooser.
    expect(main).toContain('onStartRoute: () => trade?.open(controls.selectedUnit()?.id ?? null)');
    expect(main).toContain("requireElement('trade-close')");
  });

  it('writes every change as a command, through the verbs the sheet already used', () => {
    // The screen never mutates state: it hands ids to `controls`, whose by-id
    // route verbs are the same inner functions the unit sheet's selection-shaped
    // buttons call. One command, one announcement, one refusal.
    const controls = source('controls.ts');
    for (const verb of ['startRouteFrom', 'setAutoResendOf', 'cancelRouteOf']) {
      expect(controls, verb).toContain(`function ${verb}`);
      expect(source('main.ts'), verb).toContain(`controls.${verb}`);
    }
    for (const inner of ['setAutoResendWith', 'cancelRouteWith']) {
      expect(controls, inner).toContain(`function ${inner}`);
    }
    const screen = source('tradeScreen.ts');
    expect(screen).not.toContain('applyCommand');
    expect(screen).not.toContain('dispatch(');
  });

  /**
   * The removals, pinned so they cannot creep back: send mode was a board-wide
   * armed gesture with a cursor, a notice, an Escape arm and a plate supplier,
   * and the ruling deleted all of it.
   */
  it('has no send mode left anywhere in the interface', () => {
    for (const name of ['controls.ts', 'unitPanel.ts', 'main.ts']) {
      const text = source(name);
      for (const gone of [
        'sendMode',
        'setSendMode',
        'isSendMode',
        'sendCaravan',
        'caravanOffers',
        'previewCaravanRoute',
        'Send Caravan',
      ]) {
        // The word may still appear in a docblock recording the deletion; what
        // must not appear is a call or a declaration of it.
        expect(text.includes(`${gone}(`) || text.includes(`${gone}:`), `${name} · ${gone}`).toBe(
          false,
        );
      }
    }
  });

  it('reaches the camera through controls.panTo, which is MapView’s one driver', () => {
    expect(source('tradeScreen.ts')).toContain('options.panTo');
    expect(source('main.ts')).toContain('panTo: (cell) => controls.panTo(cell)');
    // A row's click pans and closes; a start closes and pans. Both are in the
    // screen rather than in its callers, so a second door cannot forget one.
    const screen = source('tradeScreen.ts');
    expect(screen).toContain('options.panTo({ col: route.col, row: route.row });');
    expect(screen).toContain('options.panTo({ col: origin.col, row: origin.row });');
  });

  it('owns the keyboard while it is up', () => {
    const main = source('main.ts');
    // Both the Escape stack and the hotkey guard know about it.
    expect(main).toContain('trade?.close()');
    expect(main).toContain('(trade?.isOpen ?? false)');
    expect(source('tradeScreen.ts')).toContain("event.key !== 'Escape'");
  });

  it('drops the chooser, the sort and the filter when it closes', () => {
    // All three are facts about one opening: a screen reached from the bar
    // tomorrow starts from the sheet's own defaults.
    const screen = source('tradeScreen.ts');
    const close = screen.slice(screen.indexOf('function close(): void'));
    const body = close.slice(0, close.indexOf('\n  }'));
    expect(body).toContain('chooserUnitId = null');
    expect(body).toContain('sortKey = null');
    expect(body).toContain('originFilter = null');
  });
});
