/**
 * The Trade screen: every caravan on the road, and every road not yet taken.
 *
 * `tradePanels.test.ts` covers the four *surfaces* trade already had — the send
 * plates, the caravan's sheet, the town's Routes row, the treasury's ledger —
 * and what it pins there is the agreement between a preview and a payout. This
 * file covers the screen those four could not add up to, and the properties it
 * can be quietly wrong about are its own:
 *
 *   1. **The chip's two figures** are `usedRouteSlots` against `routeSlots`, and
 *      the card under it folds to the gold the game actually banks.
 *   2. **A greyed row's sentence is the reducer's**, asked of the very caravan
 *      the Send button would send — never of a copy wearing a route it is not
 *      carrying, which is the mistake `tradeLines.ts` records having made once.
 *   3. **A row with no caravan on its origin is not refused**, it has nowhere to
 *      set out from, and it says which town the spare caravan is in instead.
 *   4. **The sort order** — gold, then food, then production — because a column
 *      of partners is scanned for the biggest number that reaches the treasury.
 *   5. **Send names the right two ids.**
 *
 * No jsdom in this suite (see `controls.test.ts`), so the screen itself is not
 * rendered: what is covered is the pure half — every decision above is a
 * function — and, through the source exactly as `seatRoster.test.ts` reads its
 * rule, the wirings that span files (the three doors, and the pan-and-close).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type City, type GameState, type Unit, createUnit } from '../../src/sim/state';
import {
  explainRouteYieldBetween,
  explainTradeGold,
  foldRouteYield,
  routeSlots,
  sendTraderError,
  tradeGold,
  usedRouteSlots,
} from '../../src/sim/trade';
import { applyCommand } from '../../src/sim/commands';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { routeFigures } from '../../src/ui/tradeLines';
import {
  routeLedgerTitle,
  runningRoutes,
  sendCommandFor,
  tradeLedger,
  tradeOrigins,
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
    const { state, trader, near } = tradeWorld();
    expect(tradeLedger(state, 0).chip).toBe(
      `${usedRouteSlots(state, 0)} / ${routeSlots(state, 0)}`,
    );
    expect(tradeLedger(state, 0).used).toBe(0);

    const sent = applyCommand(state, {
      type: 'sendTrader',
      playerId: 0,
      unitId: trader.id,
      cityId: near.id,
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
    applyCommand(state, { type: 'sendTrader', playerId: 0, unitId: trader.id, cityId: near.id });

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
    const { state, trader, near } = tradeWorld();
    applyCommand(state, { type: 'sendTrader', playerId: 0, unitId: trader.id, cityId: near.id });
    const [route] = runningRoutes(state, 0);
    expect(route!.figures).toBe(routeFigures(foldRouteYield(route!.lines)));
  });

  it('prints a lapsed route rather than dropping it, because the slot is still held', () => {
    const { state, trader, near } = tradeWorld();
    applyCommand(state, { type: 'sendTrader', playerId: 0, unitId: trader.id, cityId: near.id });
    // Walk the clock past the route without touching the caravan: a `TradeRoute`
    // carries an absolute `expiresTurn` and nothing decrements it.
    state.turn = trader.trade!.expiresTurn + 5;
    const [route] = runningRoutes(state, 0);
    expect(route).toBeDefined();
    expect(route!.turnsLeft).toBe(0);
    expect(usedRouteSlots(state, 0)).toBe(1);
  });

  it('turns a route’s lines into the sim’s own sentences, never a paraphrase', () => {
    const { state, trader, near } = tradeWorld();
    near.buildings.push('barracks');
    applyCommand(state, { type: 'sendTrader', playerId: 0, unitId: trader.id, cityId: near.id });
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

  it('sorts gold, then food, then production', () => {
    const { state, home, near } = tradeWorld();
    // Food and production are read off the **origin** now (2026-08-27), so
    // every candidate sent from `home` quotes the same figures for those two
    // voices — a building on the partner no longer moves them. Gold still
    // varies by combined population, which is what this sort actually
    // exercises: the near town pays more by having the people.
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

  it('greys a row with the reducer’s own sentence, asked of the caravan standing there', () => {
    const { state, home, near, far, trader } = tradeWorld();
    // One slot only: send to the near town, and the far one is refused for the
    // reason the reducer would refuse it.
    home.buildings.length = 0;
    home.buildings.push('market');
    applyCommand(state, { type: 'sendTrader', playerId: 0, unitId: trader.id, cityId: near.id });
    const second = createUnit(state, 0, 'trader', home.col, home.row);

    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    expect(origin.senderUnitId).toBe(second.id);
    for (const candidate of origin.candidates) {
      expect(candidate.error, candidate.name).toBe(
        sendTraderError(state, 0, second.id, candidate.cityId),
      );
    }
    expect(origin.candidates.find((entry) => entry.cityId === far.id)!.error).toBe(
      'All 1 of your trade routes are running',
    );
    // And the running pair is marked rather than dropped.
    expect(origin.candidates.find((entry) => entry.cityId === near.id)!.running).toBe(true);
  });

  it('never asks the reducer about a caravan that is not there', () => {
    // A row with nowhere to set out from is not *refused* — there is no command
    // to refuse — so it carries no sentence, and the origin says why instead.
    const { state, home, near } = tradeWorld();
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === near.id)!;
    expect(origin.senderUnitId).toBeNull();
    for (const candidate of origin.candidates) expect(candidate.error).toBeNull();
    // Named through `cityDisplayName`, the one formatter a city's name reaches a
    // player through — so the capital wears its star here as it does everywhere.
    expect(origin.note).toBe(
      `No caravan here — the nearest idle one is in ${cityDisplayName(state, home)}`,
    );
  });

  it('names the technology when the empire has no idle caravan at all', () => {
    const { state, trader, near } = tradeWorld();
    applyCommand(state, { type: 'sendTrader', playerId: 0, unitId: trader.id, cityId: near.id });
    for (const origin of tradeOrigins(state, 0)) {
      expect(origin.senderUnitId).toBeNull();
      expect(origin.note).toBe('Build a trader (Currency)');
    }
  });

  it('says nothing at all about a town a caravan is standing in', () => {
    const { state, home } = tradeWorld();
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    expect(origin.note).toBeNull();
  });
});

describe('Send', () => {
  it('names the caravan standing on the origin and the town on the row', () => {
    const { state, home, near } = tradeWorld();
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    const candidate = origin.candidates.find((entry) => entry.cityId === near.id)!;
    expect(sendCommandFor(origin, candidate)).toEqual({
      unitId: origin.senderUnitId,
      cityId: near.id,
    });

    // And the command it names is one the reducer takes.
    const command = sendCommandFor(origin, candidate)!;
    const result = applyCommand(state, {
      type: 'sendTrader',
      playerId: 0,
      unitId: command.unitId,
      cityId: command.cityId,
    });
    expect(result.ok).toBe(true);
  });

  it('is offered on no row without a caravan, and on no row the reducer refuses', () => {
    const { state, home, near } = tradeWorld();
    const away = tradeOrigins(state, 0).find((entry) => entry.cityId === near.id)!;
    expect(sendCommandFor(away, away.candidates[0]!)).toBeNull();

    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    const refused = { ...origin.candidates[0]!, error: 'nope' };
    expect(sendCommandFor(origin, refused)).toBeNull();
  });
});

/**
 * The wirings that span files, read off the source for `seatRoster.test.ts`'
 * reason: the only property that distinguishes a correct file from a
 * nearly-correct one is *which function it called*, and there is no jsdom here
 * to press a button in.
 */
describe('the screen’s three doors and its one camera', () => {
  it('is opened from the routes chip, the caravan’s sheet and the city panel', () => {
    expect(source('topBar.ts')).toContain('onOpenTrade');
    expect(source('unitPanel.ts')).toContain('onOpenTrade');
    expect(source('cityPanel.ts')).toContain('onOpenTrade');
    // And all three are wired to one screen.
    const main = source('main.ts');
    expect(main).toContain('createTradeScreen');
    expect(main.match(/onOpenTrade/g) ?? []).toHaveLength(3);
    expect(main).toContain("requireElement('trade-close')");
  });

  it('writes every change as a command, through the verbs the sheet already used', () => {
    // The screen never mutates state: it hands ids to `controls`, whose by-id
    // route verbs are the same inner functions the unit sheet's selection-shaped
    // buttons call. One command, one announcement, one refusal.
    const controls = source('controls.ts');
    for (const verb of ['sendCaravanFrom', 'setAutoResendOf', 'cancelRouteOf']) {
      expect(controls, verb).toContain(`function ${verb}`);
      expect(source('main.ts'), verb).toContain(`controls.${verb}`);
    }
    // The three inner functions the two shapes share, so neither is a second
    // dispatcher.
    for (const inner of ['sendCaravanWith', 'setAutoResendWith', 'cancelRouteWith']) {
      expect(controls, inner).toContain(`function ${inner}`);
    }
    const screen = source('tradeScreen.ts');
    expect(screen).not.toContain('applyCommand');
    expect(screen).not.toContain('dispatch(');
  });

  it('reaches the camera through controls.panTo, which is MapView’s one driver', () => {
    expect(source('tradeScreen.ts')).toContain('options.panTo');
    expect(source('main.ts')).toContain('panTo: (cell) => controls.panTo(cell)');
    // A row's click pans and closes; a send closes and pans. Both are in the
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
});
