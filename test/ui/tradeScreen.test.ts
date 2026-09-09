/**
 * **The Caravans** — the sheet a route is hired out of (batch R2).
 *
 * The screen was rewritten for the ruling of 2026-09-09 (`docs/flags.md` item
 * (iii)) and so is this file. What the old one defended — a table's sort order,
 * a chooser caravan, a "build a trader" note — no longer exists: there is no
 * table on the front page, no piece to choose (a route is *bought*), and no
 * trader to build. What this one defends is what replaced all three, and every
 * failure in the list is silent:
 *
 *   1. **Four cut tabs, each with a true count.** A tab whose number disagreed
 *      with its own pane would be worse than no number at all.
 *   2. **An empty purpose group does not appear.** Not "appears empty" — the
 *      ruling's word is *at all*.
 *   3. **The four purposes are populated for the reasons they claim**, on a
 *      board arranged so each has exactly one obvious answer, and every fact on
 *      a card is read off `readRoutes`' own reading rather than recomputed here.
 *   4. **The Land | Sea toggle re-reads the card** — the yields *and* the facts
 *      are the fold for the chosen mode, which is the direction of record.
 *   5. **Send re-uses a cart before it hires one** (R4), and dispatches the
 *      command it named with the chosen mode — `startRoute` through
 *      `controls.startRouteFrom`, or `buyRoute` through `controls.buyRouteOf`.
 *   6. **Unavailable is grouped by the clause that refused it**, classified by
 *      re-asking the simulation rather than by reading its prose.
 *   7. **The sheet rebuilds only when the reading moved** — the performance
 *      half of the ruling, and the reason `readRoutes` exists.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sheet itself is not
 * rendered: what is covered is the pure half — every decision above is a
 * function — and, through the source exactly as `seatRoster.test.ts` reads its
 * rule, the wirings that span files.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, growthThreshold, turnsToFill, growthSurplus } from '../../src/sim/cities';
import { foldCity } from '../../src/sim/yields/town';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
} from '../../src/sim/state';
import {
  explainEmpireGold,
  explainRouteSenderYieldBetween,
  explainRouteYieldBetween,
  foldRouteYield,
  routeSlots,
  routeStartable,
  empireGold,
  usedRouteSlots,
} from '../../src/sim/trade';
import { readCity, readRoutes } from '../../src/sim/readings';
import { tileIndex } from '../../src/sim/map';
import { hasMetSeat } from '../../src/sim/diplomacy';
import { EXPLORED, HIDDEN, isExploredBy } from '../../src/sim/visibility';
import { RULES } from '../../src/sim/rulesData';
import { layRoad } from '../../src/sim/roads';
import { openWar } from '../../src/sim/wars';
import { applyCommand } from '../../src/sim/commands';
import { NO_ROUTE_CAPACITY, routeFigures, tradeFigureRuns } from '../../src/ui/tradeLines';
import { YIELD_GLYPH, type YieldKey, figure } from '../../src/ui/figures';
import {
  type TradeContext,
  MODE_LABEL,
  PURPOSE_CARDS,
  REFUSAL_TITLES,
  TRADE_TABS,
  bestMode,
  buyCommandFor,
  connectionGold,
  growthReading,
  originGroups,
  pairIsRunning,
  recommendedGroups,
  refusalGroups,
  refusalReason,
  routeCard,
  routeFacts,
  routeLedgerTitle,
  routeModeTotal,
  routeSortValue,
  rowPassesFilters,
  runningRoutes,
  sendCommandFor,
  sendLabel,
  tabCounts,
  tradeContext,
  tradeLedger,
} from '../../src/ui/tradeScreen';
import { at, bareState } from '../sim/improvementHelpers';

const SOURCES = import.meta.glob(
  [
    '../../src/style.css',
    '../../src/ui/tradeScreen.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/unitPanel.ts',
    '../../src/ui/hudDock.ts',
    '../../src/ui/controls.ts',
    '../../src/ui/modalShell.ts',
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

/** The pair's row out of the reading, or a thrown error naming it. */
function rowFor(ctx: TradeContext, from: City, to: City) {
  const row = ctx.rows.find((entry) => entry.from.id === from.id && entry.to.id === to.id);
  if (row === undefined) throw new Error(`no row ${from.name} → ${to.name}`);
  return row;
}

/**
 * Three towns of seat 0 in a row, two markets in the first (two route slots),
 * and a purse that can pay for a route — the old bench with the caravan taken
 * out of it, because since R1 a caravan is a thing the reducer mints rather
 * than a thing the empire owns before the decision.
 */
function tradeWorld(): { state: GameState; home: City; near: City; far: City } {
  const state = bareState(24, 9);
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const near = foundCityAt(state, 0, at(state, 9, 4));
  const far = foundCityAt(state, 0, at(state, 15, 4));
  home.buildings.push('market', 'market');
  state.players[0]!.gold = 5000;
  return { state, home, near, far };
}

/** One town each and peace between the seats, with a piece of theirs in sight. */
function foreignTradeWorld(met = true): { state: GameState; home: City; theirs: City } {
  const state = bareState(24, 9);
  // `bareState` seats the two empires at war; peace is what the ruling is about.
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const theirs = foundCityAt(state, 1, at(state, 9, 4));
  home.buildings.push('market', 'market');
  state.players[0]!.gold = 5000;
  // **Met**, by the clause that needs no paper: a piece of theirs standing where
  // this seat can see it. A worker, so no picket prices the caravan's march.
  if (met) createUnit(state, 1, 'worker', 3, 3);
  // **And found** (batch R3): since the discovery clause, a partner whose centre
  // hex is not on this seat's chart is no row at all, and `bareState` explores
  // only what a seat's own pieces stand near. A scout has been past their gates
  // — written straight onto the chart, the idiom every fog test uses, so the
  // arrangement adds no piece to a board these tests price caravans on.
  //
  // Only in the met branch, and necessarily: a rival's *centre* is a rival's
  // owned hex, and an owned hex on your chart is the fourth clause of
  // `hasMetSeat` answering yes. The unmet world is an unfound one too.
  if (met) {
    state.visibility[0]![tileIndex(state.map, theirs.col, theirs.row)] = EXPLORED;
  }
  return { state, home, theirs };
}

// --- 1. the index -----------------------------------------------------------

describe('the ledger’s four cut tabs', () => {
  it('are the ruling’s own four, Recommended first', () => {
    expect(TRADE_TABS.map((tab) => tab.id)).toEqual([
      'recommended',
      'running',
      'all',
      'unavailable',
    ]);
    expect(TRADE_TABS[0]!.label).toBe('Recommended');
  });

  it('count what is actually behind each of them, off the one reading', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.push('granary', 'library', 'barracks');
    home.population = 8;
    near.population = 6;
    const ctx = tradeContext(state, 0);
    const groups = recommendedGroups(ctx);
    const counts = tabCounts(ctx, groups);

    // All routes and Unavailable partition the reading's rows — no pair is
    // counted twice and none goes missing.
    expect(counts.all + counts.unavailable).toBe(ctx.rows.length);
    expect(counts.all).toBe(ctx.rows.filter((row) => row.available).length);
    expect(counts.running).toBe(runningRoutes(state, 0).length);
    // Recommended is the cards, not the pairs: a pair in two groups is two cards.
    let cards = 0;
    for (const group of groups) cards += group.rows.length;
    expect(counts.recommended).toBe(cards);
  });

  it('moves the Running count when a route is hired', () => {
    const { state, home, near } = tradeWorld();
    expect(tabCounts(tradeContext(state, 0), []).running).toBe(0);
    const bought = applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: home.id,
      toCityId: near.id,
      mode: 'land',
    });
    expect(bought.ok, bought.ok ? '' : bought.error).toBe(true);
    expect(tabCounts(tradeContext(state, 0), []).running).toBe(1);
  });
});

// --- 2. an empty purpose group ---------------------------------------------

describe('an empty purpose group', () => {
  it('does not appear at all — not a heading over nothing', () => {
    // Two towns of this seat and no rival in sight: nothing abroad, so the
    // science-and-culture group has no member and must not be built.
    const { state, home } = tradeWorld();
    home.buildings.push('granary', 'library');
    const groups = recommendedGroups(tradeContext(state, 0));
    expect(groups.map((group) => group.id)).not.toContain('learning');
    // And every group that *is* built has at least one card in it.
    for (const group of groups) expect(group.rows.length).toBeGreaterThan(0);
  });

  it('caps a group that is built at the ruling’s two or three', () => {
    const { state, home } = tradeWorld();
    home.buildings.push('granary', 'library', 'barracks');
    home.population = 10;
    // Four more partners than the cap, so the slice is what is being tested
    // rather than the board's size.
    for (let step = 0; step < 5; step += 1) {
      foundCityAt(state, 0, at(state, 6 + step * 2, 6));
    }
    bumpRevision(state);
    for (const group of recommendedGroups(tradeContext(state, 0))) {
      expect(group.rows.length).toBeLessThanOrEqual(PURPOSE_CARDS);
    }
  });
});

// --- 3. the four purposes, and the facts on a card --------------------------

describe('Richest', () => {
  it('ranks by every voice of the fold summed, in the mode that pays most', () => {
    const { state, home, near, far } = tradeWorld();
    home.buildings.push('granary', 'library', 'barracks', 'stoneWalls');
    home.population = 12;
    near.population = 10;
    far.population = 2;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const group = recommendedGroups(ctx).find((entry) => entry.id === 'richest');
    expect(group).toBeDefined();
    const totals = group!.rows.map((entry) => routeModeTotal(entry.row, entry.mode));
    // Descending, and the first card is the best one — the hedera's own claim.
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    // The number is the simulation's fold and never a sum taken beside it.
    const first = group!.rows[0]!;
    const lines =
      first.row.to.ownerId === 0
        ? explainRouteYieldBetween(state, first.row.from, first.row.to, first.mode)
        : explainRouteSenderYieldBetween(state, first.row.from, first.row.to, first.mode);
    const fold = foldRouteYield(lines);
    expect(totals[0]).toBe(fold.food + fold.production + fold.gold + fold.science + fold.culture);
    expect(routeCard(ctx, first.row, first.mode).figures).toBe(routeFigures(fold));
  });
});

describe('Paves a road', () => {
  it('holds the land routes toward a town the capital cannot yet reach, with the road and the connection on the card', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.push('granary', 'library');
    near.population = 6;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    // Nothing is paved, so no town of this seat's is connected to the capital.
    expect(ctx.connected.size).toBe(0);
    const group = recommendedGroups(ctx).find((entry) => entry.id === 'paves');
    expect(group).toBeDefined();
    // Every card in it is a **land** cart with hexes left to pave, toward a town
    // of ours that is not joined yet.
    for (const entry of group!.rows) {
      expect(entry.mode).toBe('land');
      expect(entry.row.roadHexes ?? 0).toBeGreaterThan(0);
      expect(entry.row.to.ownerId).toBe(0);
      expect(ctx.connected.has(entry.row.to.id)).toBe(false);
    }
    const chosen = group!.rows.find((entry) => entry.row.to.id === near.id)!;
    const facts = routeFacts(ctx, chosen.row, 'land');
    const keys = facts.map((fact) => fact.key);
    expect(keys).toContain('paves');
    expect(keys).toContain(`connects ${near.name}`);
    expect(keys).toContain('connection');
    // Each figure is the reading's own, never recomputed on the card.
    expect(facts.find((fact) => fact.key === 'paves')!.text).toBe(
      `${chosen.row.roadHexes} hexes (land)`,
    );
    expect(facts.find((fact) => fact.key === `connects ${near.name}`)!.text).toBe(
      `turn ${state.turn + chosen.row.turns!}`,
    );
    expect(facts.find((fact) => fact.key === 'connection')!.text).toBe(
      `+${connectionGold(near)} gold/t`,
    );
    expect(connectionGold(near)).toBe(
      Math.floor(near.population / RULES.trade.connectionPerPop),
    );
  });

  it('drops a town the road already reaches — the connection is not this cart’s to claim', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.push('granary', 'library');
    // Pave the whole row between the two centres: `connectedCities` floods from
    // the capital, and a junction is a city centre.
    for (let col = 3; col <= 9; col += 1) layRoad(at(state, col, 4), 0);
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    expect(ctx.connected.has(near.id)).toBe(true);
    const group = recommendedGroups(ctx).find((entry) => entry.id === 'paves');
    const named = group?.rows.map((entry) => entry.row.to.id) ?? [];
    expect(named).not.toContain(near.id);
    // And the card says nothing about a connection it is not making.
    const facts = routeFacts(ctx, rowFor(ctx, home, near), 'land');
    expect(facts.map((fact) => fact.key)).not.toContain('connection');
  });
});

describe('Feeds a town', () => {
  it('prints the town’s size, its food and the next citizen with the cart and without', () => {
    const { state, home, near } = tradeWorld();
    // Food-side buildings at the origin: a route pays a food per two of them.
    home.buildings.push('granary', 'library', 'shrine', 'amphitheater');
    home.population = 10;
    near.population = 2;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, near);
    const mode = bestMode(row)!;
    const pays = row.pays.find((entry) => entry.mode === mode)!;
    expect(pays.total.food).toBeGreaterThan(0);

    const facts = routeFacts(ctx, row, mode);
    const size = facts.find((fact) => fact.key === near.name);
    expect(size).toBeDefined();
    // The town's own reading, through the simulation's two functions — never a
    // subtraction taken here.
    const quote = readCity(state, near);
    const surplus = growthSurplus(state, near, foldCity(state, near, [], undefined, quote));
    expect(size!.text).toBe(`size ${near.population} · ${Math.round(surplus)} food/t`);

    const next = facts.find((fact) => fact.key === 'next citizen');
    expect(next).toBeDefined();
    const remaining = growthThreshold(near.population) - near.foodBasket;
    const withCart = turnsToFill(remaining, surplus + pays.total.food);
    const without = turnsToFill(remaining, surplus);
    expect(next!.text).toBe(`${withCart} turns (was ${without ?? 'never'})`);
    // And `growthReading` is the one place that arithmetic lives.
    expect(growthReading(ctx, near, pays.total.food)).toEqual({
      surplus: Math.round(surplus),
      without,
      withCart,
    });

    const group = recommendedGroups(ctx).find((entry) => entry.id === 'feeds');
    expect(group?.rows.some((entry) => entry.row.to.id === near.id)).toBe(true);
  });

  it('leaves out a pair whose cart takes no turns off the next citizen', () => {
    const { state, home, near } = tradeWorld();
    // No food-side buildings at the origin at all: the route pays no 🌾, so the
    // group has nothing to say about this pair.
    home.population = 6;
    near.population = 4;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, near);
    const mode = bestMode(row)!;
    expect(row.pays.find((entry) => entry.mode === mode)!.total.food).toBe(0);
    const group = recommendedGroups(ctx).find((entry) => entry.id === 'feeds');
    expect(group?.rows.some((entry) => entry.row.to.id === near.id) ?? false).toBe(false);
  });
});

describe('Most science and culture', () => {
  it('is the foreign carts, and the card says what the host keeps', () => {
    const { state, home, theirs } = foreignTradeWorld();
    home.population = 12;
    theirs.population = 10;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const group = recommendedGroups(ctx).find((entry) => entry.id === 'learning');
    expect(group).toBeDefined();
    for (const entry of group!.rows) expect(entry.row.to.ownerId).not.toBe(0);

    const row = rowFor(ctx, home, theirs);
    const mode = bestMode(row)!;
    const card = routeCard(ctx, row, mode);
    // The **sender's** fold, which is the half that lands in this seat's books.
    const lines = explainRouteSenderYieldBetween(state, home, theirs, mode);
    expect(card.lines).toEqual(lines);
    expect(card.figures).toBe(routeFigures(foldRouteYield(lines)));
    expect(card.rivalName).toBe('B');
    const facts = routeFacts(ctx, row, mode);
    expect(facts.find((fact) => fact.key === 'host keeps')!.text).toBe(
      `${RULES.trade.international.hostGold} gold/t`,
    );
  });

  it('draws no row at all for an empire nobody has met', () => {
    const { state, home, theirs } = foreignTradeWorld(false);
    const ctx = tradeContext(state, 0);
    expect(ctx.rows.some((row) => row.to.id === theirs.id)).toBe(false);
    // The sentence still exists — it is simply not a thing the sheet says.
    expect(routeStartable(state, 0, home.id, theirs.id)).toBe('You have not met B');
  });
});

// --- 4. the toggle re-reads the card ---------------------------------------

describe('the Land | Sea toggle', () => {
  it('re-reads the card: the yields and the facts are the fold for the chosen mode', () => {
    // **A sea and a land leg between the same two towns.** `trade.test.ts`'
    // own `seaWorld` shape: the board is water, the two centres are dry, and a
    // dry corridor joins them — so the land survey finds the corridor and the
    // sea survey finds the water, and the pair carries a real choice.
    const state = bareState(16, 9);
    for (const tile of state.map.tiles) tile.terrain = 'coast';
    at(state, 3, 4).terrain = 'grassland';
    at(state, 10, 4).terrain = 'grassland';
    for (let col = 4; col <= 9; col += 1) at(state, col, 4).terrain = 'grassland';
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const near = foundCityAt(state, 0, at(state, 10, 4));
    home.buildings.push('market', 'market', 'granary', 'library', 'barracks');
    home.population = 10;
    near.population = 2;
    state.players[0]!.gold = 5000;
    bumpRevision(state);

    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, near);
    // Both, in `ROUTE_MODES` order — asserted rather than guarded, so a board
    // that stopped producing the choice fails here instead of quietly skipping
    // everything below it.
    expect(row.modes).toEqual(['land', 'sea']);

    const land = routeCard(ctx, row, 'land');
    const sea = routeCard(ctx, row, 'sea');
    // The fold moved: a sea route pays `rules.trade.seaYieldPercent` more, as
    // its own line among the reading's.
    expect(RULES.trade.seaYieldPercent).toBeGreaterThan(0);
    expect(sea.total).toBeGreaterThan(land.total);
    expect(land.lines).toEqual(row.pays.find((entry) => entry.mode === 'land')!.lines);
    expect(sea.lines).toEqual(row.pays.find((entry) => entry.mode === 'sea')!.lines);

    // And the *facts* moved with it: a land cart's paving counts, a sea cart
    // lays no road and says so.
    expect(land.facts.find((fact) => fact.key === 'paves')!.text).toMatch(/hexes \(land\)$/);
    expect(sea.facts.find((fact) => fact.key === 'paves')!.text).toBe('— (sea lays no road)');
    // A sea cart makes no connection, so its card carries neither connection line.
    expect(sea.facts.map((fact) => fact.key)).not.toContain('connection');
  });

  it('is a control and never prose, and the pressed side is written down and repainted', () => {
    const text = source('tradeScreen.ts');
    // The two words the control prints, and nothing else.
    expect(MODE_LABEL).toEqual({ land: 'Land', sea: 'Sea' });
    // Pressing writes the choice and repaints; the card is re-read from
    // `routeCard`, which is the one place that decides what a card says.
    expect(text).toContain('modeChoice.set(pairKey(row.from.id, row.to.id), one);');
    expect(text).toMatch(/const card = routeCard\(ctx, row, mode\);/);
    // The tables wear the same control (the user's final mark), never a word.
    expect(text).toContain("mode.append(drawModeControl(entry.row, entry.mode));");
  });
});

// --- 5. Send -----------------------------------------------------------------

describe('Send', () => {
  it('names the pair and the chosen mode, and refuses when the purse cannot pay', () => {
    const { state, home, near } = tradeWorld();
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, near);
    const mode = bestMode(row)!;
    expect(buyCommandFor(ctx, row, mode)).toEqual({
      fromCityId: home.id,
      toCityId: near.id,
      mode,
    });
    // A mode the gate did not offer is not a command the sheet will send.
    const missing = mode === 'land' ? 'sea' : 'land';
    if (!row.modes.includes(missing)) expect(buyCommandFor(ctx, row, missing)).toBeNull();

    state.players[0]!.gold = ctx.reading.price - 1;
    bumpRevision(state);
    const poor = tradeContext(state, 0);
    expect(poor.gold).toBeLessThan(poor.reading.price);
    expect(buyCommandFor(poor, rowFor(poor, home, near), mode)).toBeNull();
  });

  it('is one of two commands, all the way from the button to the reducer', () => {
    const sheet = source('tradeScreen.ts');
    // The hire, and it names the mode the card is being read in.
    expect(sheet).toContain(
      'options.buyRoute(command.fromCityId, command.toCityId, command.mode);',
    );
    // And R4's half: the cart this seat already owns, named.
    expect(sheet).toContain(
      'options.startRoute(command.unitId, command.fromCityId, command.toCityId, command.mode);',
    );
    // Both go out through one dispatch, so the choice is taken in one place.
    expect(sheet.match(/dispatchSend\(command/g) ?? []).not.toHaveLength(0);
    // `main.ts` wires both options to `controls`, and `controls` sends the
    // commands — one funnel, so a route opened here is opened the way a peer's is.
    expect(source('main.ts')).toContain('controls.buyRouteOf(fromCityId, toCityId, mode);');
    expect(source('main.ts')).toContain(
      'controls.startRouteFrom(unitId, fromCityId, toCityId, mode);',
    );
    expect(source('controls.ts')).toContain("type: 'buyRoute',");
    expect(source('controls.ts')).toContain("type: 'startRoute',");
  });

  /**
   * **A bought cart is kept, not spent** — R4 (the user, 2026-09-09: *"sending a
   * trade route should first aim to re-use a route that's already been
   * purchased"*).
   *
   * The pure half of the button, and the three cases the ruling names: a cart
   * idles and the Send re-uses it; none does and the Send hires; the purse is
   * short and the cart still goes, because the gold gate is the hire's alone.
   */
  describe('re-uses a cart before it buys one', () => {
    /** `tradeWorld` with one wagon of this seat's standing about, unladen. */
    function withIdleCart(): { state: GameState; home: City; near: City; cart: Unit } {
      const { state, home, near } = tradeWorld();
      const cart = createUnit(state, 0, 'trader', home.col, home.row);
      bumpRevision(state);
      return { state, home, near, cart };
    }

    it('sends the idle cart rather than hiring', () => {
      const { state, home, near, cart } = withIdleCart();
      const ctx = tradeContext(state, 0);
      expect(ctx.idleCarts).toEqual([cart.id]);
      const row = rowFor(ctx, home, near);
      const mode = bestMode(row)!;
      expect(sendCommandFor(ctx, row, mode)).toEqual({
        kind: 'send',
        unitId: cart.id,
        fromCityId: home.id,
        toCityId: near.id,
        mode,
      });
      expect(sendLabel(sendCommandFor(ctx, row, mode), ctx.reading.price)).toBe('Send · idle cart');
    });

    it('hires when no cart stands idle, at the sheet’s own price', () => {
      const { state, home, near } = tradeWorld();
      const ctx = tradeContext(state, 0);
      expect(ctx.idleCarts).toEqual([]);
      const row = rowFor(ctx, home, near);
      const mode = bestMode(row)!;
      expect(sendCommandFor(ctx, row, mode)).toEqual({
        kind: 'hire',
        fromCityId: home.id,
        toCityId: near.id,
        mode,
      });
      expect(sendLabel(sendCommandFor(ctx, row, mode), ctx.reading.price)).toBe(
        // `figure`, the specimen's own tabular reading, never a raw number.
        `Hire · ${figure(ctx.reading.price)} gold`,
      );
    });

    it('sends the cart even with an empty purse — the coin gate is the hire’s', () => {
      const { state, home, near, cart } = withIdleCart();
      state.players[0]!.gold = 0;
      bumpRevision(state);
      const ctx = tradeContext(state, 0);
      const row = rowFor(ctx, home, near);
      const mode = bestMode(row)!;
      // The hire is refused on the purse and the send is not.
      expect(buyCommandFor(ctx, row, mode)).toBeNull();
      expect(sendCommandFor(ctx, row, mode)).toMatchObject({ kind: 'send', unitId: cart.id });
    });

    it('names the lowest id when several stand, deterministically', () => {
      const { state, home, near, cart } = withIdleCart();
      const second = createUnit(state, 0, 'trader', near.col, near.row);
      bumpRevision(state);
      const ctx = tradeContext(state, 0);
      expect(second.id).toBeGreaterThan(cart.id);
      expect(ctx.idleCarts).toEqual([cart.id, second.id]);
      const row = rowFor(ctx, home, near);
      expect(sendCommandFor(ctx, row, bestMode(row)!)).toMatchObject({ unitId: cart.id });
    });

    it('counts only the wagons with no route on them', () => {
      const { state, home, near, cart } = withIdleCart();
      const bought = applyCommand(state, {
        type: 'buyRoute',
        playerId: 0,
        fromCityId: home.id,
        toCityId: near.id,
        mode: 'land',
      });
      expect(bought.ok, bought.ok ? '' : bought.error).toBe(true);
      // The hired cart is laden and the idle one is not, so the count is one.
      expect(tradeContext(state, 0).idleCarts).toEqual([cart.id]);
    });

    it('refuses a mode the gate did not offer, cart or no cart', () => {
      const { state, home, near } = withIdleCart();
      const ctx = tradeContext(state, 0);
      const row = rowFor(ctx, home, near);
      const mode = bestMode(row)!;
      const missing = mode === 'land' ? 'sea' : 'land';
      if (!row.modes.includes(missing)) expect(sendCommandFor(ctx, row, missing)).toBeNull();
    });
  });

  it('hires a caravan the reducer mints in the origin’s gates', () => {
    const { state, home, near } = tradeWorld();
    const ctx = tradeContext(state, 0);
    const command = buyCommandFor(ctx, rowFor(ctx, home, near), 'land')!;
    const before = state.players[0]!.gold;
    const result = applyCommand(state, { type: 'buyRoute', playerId: 0, ...command });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(state.players[0]!.gold).toBe(before - ctx.reading.price);
    const cart = state.units.find((unit) => unit.trade !== undefined);
    expect(cart).toBeDefined();
    expect({ col: cart!.col, row: cart!.row }).toEqual({ col: home.col, row: home.row });
    expect(pairIsRunning(state, 0, home.id, near.id)).toBe(true);
  });
});

// --- 6. Unavailable ---------------------------------------------------------

describe('the Unavailable tab', () => {
  it('groups by the clause that refused the pair, classified by re-asking the sim', () => {
    const { state, home, theirs } = foreignTradeWorld();
    openWar(state, 0, 1);
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, theirs);
    expect(row.available).toBe(false);
    expect(refusalReason(ctx, row)).toBe('war');
    const groups = refusalGroups(ctx);
    const war = groups.find((group) => group.reason === 'war');
    expect(war).toBeDefined();
    expect(war!.title).toBe(REFUSAL_TITLES.war);
    // The row prints the **reducer's own sentence**, never a copy of it.
    expect(war!.rows[0]!.sentence).toBe(routeStartable(state, 0, home.id, theirs.id));
    expect(war!.rows[0]!.sentence).toBe('You are at war with B');
    expect(war!.note).toBeNull();
  });

  it('says the user’s own sentence once over the slot group rather than on every row', () => {
    const { state, home, near, far } = tradeWorld();
    // Fill the ledger: two markets is two slots, and two routes spend them.
    for (const to of [near, far]) {
      const bought = applyCommand(state, {
        type: 'buyRoute',
        playerId: 0,
        fromCityId: home.id,
        toCityId: to.id,
        mode: 'land',
      });
      expect(bought.ok, bought.ok ? '' : bought.error).toBe(true);
    }
    const ctx = tradeContext(state, 0);
    expect(ctx.slotFree).toBe(false);
    const groups = refusalGroups(ctx);
    expect(groups.map((group) => group.reason)).toEqual(['slots']);
    expect(groups[0]!.note).toBe(NO_ROUTE_CAPACITY);
    expect(groups[0]!.rows.length).toBeGreaterThan(0);
    // And nothing is on the All-routes tab any more, which is the point of the
    // user's instruction: the shut pairs are tucked away.
    expect(tabCounts(ctx, []).all).toBe(0);
  });

  it('asks the clauses in the gate’s own order — war before the slot ledger', () => {
    const { state, home, theirs } = foreignTradeWorld();
    openWar(state, 0, 1);
    // No slot either: `routeStartable` answers with the war, so the heading must.
    state.players[0]!.gold = 0;
    home.buildings.length = 0;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    expect(routeSlots(state, 0)).toBe(0);
    expect(refusalReason(ctx, rowFor(ctx, home, theirs))).toBe('war');
  });

  it('keeps every refused pair out of the recommendations', () => {
    const { state } = foreignTradeWorld();
    openWar(state, 0, 1);
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    for (const group of recommendedGroups(ctx)) {
      for (const entry of group.rows) expect(entry.row.available).toBe(true);
    }
    expect(originGroups(ctx, { own: true, abroad: true, land: true, sea: true }, 'pay', bestModeOr)).
      toEqual([]);
  });
});

function bestModeOr(row: Parameters<typeof bestMode>[0]) {
  return bestMode(row) ?? 'land';
}

// --- the full list ----------------------------------------------------------

describe('the All-routes tab', () => {
  it('groups by origin in founding order and sorts inside a group', () => {
    const { state, home, near, far } = tradeWorld();
    home.buildings.push('granary', 'library', 'barracks');
    home.population = 12;
    near.population = 8;
    far.population = 2;
    near.buildings.push('market');
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const groups = originGroups(ctx, { own: true, abroad: true, land: true, sea: true }, 'pay', bestModeOr);
    // Founding order — a fact about the state, not about the sweep.
    expect(groups.map((group) => group.city.id)).toEqual(
      state.cities.filter((city) => groups.some((g) => g.city.id === city.id)).map((c) => c.id),
    );
    for (const group of groups) {
      const values = group.rows.map((entry) => routeSortValue(entry.row, entry.mode, 'pay'));
      expect([...values].sort((a, b) => b - a)).toEqual(values);
    }
  });

  it('narrows with the chips and never re-ranks with them', () => {
    const { state, home, theirs } = foreignTradeWorld();
    home.population = 10;
    theirs.population = 8;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, theirs);
    const mode = bestMode(row)!;
    expect(rowPassesFilters(ctx, row, mode, { own: true, abroad: true, land: true, sea: true })).toBe(true);
    expect(rowPassesFilters(ctx, row, mode, { own: true, abroad: false, land: true, sea: true })).toBe(false);
    expect(rowPassesFilters(ctx, row, mode, { own: false, abroad: true, land: true, sea: true })).toBe(true);
    const otherWay = { own: true, abroad: true, land: mode !== 'land', sea: mode !== 'sea' };
    expect(rowPassesFilters(ctx, row, mode, otherWay)).toBe(false);
  });

  it('reads the road column off the reading and nothing else', () => {
    const { state, home, near } = tradeWorld();
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, near);
    expect(routeSortValue(row, 'land', 'road')).toBe(row.roadHexes ?? 0);
    expect(row.roadHexes).toBeGreaterThan(0);
    for (let col = 3; col <= 9; col += 1) layRoad(at(state, col, 4), 0);
    bumpRevision(state);
    expect(rowFor(tradeContext(state, 0), home, near).roadHexes).toBe(0);
  });
});

// --- 7. the sheet rebuilds only when the reading moved ----------------------

describe('the performance half of the ruling', () => {
  it('takes one reading per revision — the hundredth ask is the same object', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.push('granary', 'library');
    const first = readRoutes(state, 0);
    // Every ask in one revision is the memo, not a second walk of the board.
    for (let ask = 0; ask < 50; ask += 1) expect(readRoutes(state, 0)).toBe(first);
    expect(tradeContext(state, 0).reading).toBe(first);

    // And it moves when the world does, which is the other half of the claim:
    // a hull in a harbour mouth changes what a caravan pays with nothing else
    // on the board different.
    const bought = applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: home.id,
      toCityId: near.id,
      mode: 'land',
    });
    expect(bought.ok).toBe(true);
    expect(readRoutes(state, 0)).not.toBe(first);
  });

  it('rebuilds its rows only when the fingerprint moved, and the revision is in it', () => {
    const text = source('tradeScreen.ts');
    // The fingerprint carries the revision — the reading's own clock — and every
    // control on the sheet.
    expect(text).toMatch(/function fingerprint\(state: GameState, seat: number\): string \{/);
    expect(text).toContain('state.revision,');
    // The early return: a repaint that would draw the same DOM is not taken.
    expect(text).toContain('if (mark === painted) return;');
    // A genuine opening always paints fresh paper.
    expect(text).toContain('onShow: () => {');
  });

  it('prices a pair through the reading and by no other means', () => {
    const text = source('tradeScreen.ts');
    // The gate and the survey are the reading's; the sheet asks neither.
    expect(text).not.toContain('routeStartable(');
    expect(text).not.toContain('routeModesAvailable');
    expect(text).not.toContain('explainRouteYieldBetween');
    expect(text).not.toContain('findPath');
    expect(text).toContain('readRoutes(state, seat)');
  });
});

// --- the frame, and the four doors ------------------------------------------

describe('the sheet’s frame and its doors', () => {
  it('is the tenth on the modal shell, with the game’s own disposer', () => {
    expect(source('tradeScreen.ts')).toContain('createModalShell({');
    expect(source('main.ts')).toContain('gameDisposers.push(() => trade?.dispose());');
    // `hidden` is the whole of the screen state — there is no second flag here.
    expect(source('tradeScreen.ts')).not.toMatch(/let\s+isOpen\s*=/);
  });

  it('opens from the top bar’s chip, the dock’s fourth button, the unit sheet and `E`', () => {
    const main = source('main.ts');
    expect(main).toContain('hudDock.tradeButton.addEventListener');
    expect(main).toContain("if (event.key !== 'e' && event.key !== 'E') return;");
    // The hotkey is unbound between games, unlike its two older neighbours.
    expect(main).toContain(
      "gameDisposers.push(() => window.removeEventListener('keydown', onTradeKey));",
    );
    expect(source('hudDock.ts')).toContain('tradeMarkDataUri()');
    // The top bar's chip wears the same drawn cart rather than a typed glyph.
    const bar = source('topBar.ts');
    expect(bar).toContain('tradeMarkDataUri()');
    expect(bar).not.toContain("element('span', 'civ-yield-icon', '⇄')");
  });

  it('leaves the unit sheet one link and no route verbs', () => {
    const panel = source('unitPanel.ts');
    expect(panel).toContain("label: 'Open the trade sheet',");
    expect(panel).not.toContain("label: 'Start route',");
    expect(panel).not.toContain("label: 'All routes',");
    expect(panel).not.toContain('Auto-resend ✓');
  });
});

// --- what survived the rewrite ----------------------------------------------

describe('the running half and the treasury’s ledger', () => {
  it('reads running against allowed, off the simulation’s own two counts', () => {
    const { state, home, near } = tradeWorld();
    expect(tradeLedger(state, 0).chip).toBe(
      `${usedRouteSlots(state, 0)} / ${routeSlots(state, 0)}`,
    );
    expect(tradeLedger(state, 0).used).toBe(0);
    applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: home.id,
      toCityId: near.id,
      mode: 'land',
    });
    const ledger = tradeLedger(state, 0);
    expect(ledger.used).toBe(1);
    expect(ledger.chip).toBe(`${ledger.used} / ${ledger.slots}`);
  });

  it('is one line per route, then trade’s empire lines, folding to the gold', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.push('barracks');
    applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: home.id,
      toCityId: near.id,
      mode: 'land',
    });
    const ledger = tradeLedger(state, 0);
    const routes = runningRoutes(state, 0);
    expect(routes).toHaveLength(1);
    expect(ledger.lines.slice(0, routes.length).map((line) => line.source)).toEqual([
      `${routes[0]!.fromName} ⇄ ${routes[0]!.toName}`,
    ]);
    expect(ledger.lines.slice(routes.length).map((line) => line.source)).toEqual(
      explainEmpireGold(state, 0).map((line) => line.source),
    );
    let routeGold = 0;
    for (const route of routes) routeGold += route.gold;
    expect(ledger.total).toBe(routeGold + empireGold(state, 0));
  });

  it('keeps a lapsed route as a row, because the slot is still spoken for', () => {
    const { state, home, near } = tradeWorld();
    applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: home.id,
      toCityId: near.id,
      mode: 'land',
    });
    const cart = state.units.find((unit: Unit) => unit.trade !== undefined)!;
    // The clock is a subtraction, never a stored countdown.
    state.turn = cart.trade!.expiresTurn + 5;
    const [route] = runningRoutes(state, 0);
    expect(route).toBeDefined();
    expect(route!.turnsLeft).toBe(0);
    expect(route!.mode).toBe('land');
    expect(usedRouteSlots(state, 0)).toBe(1);
  });

  it('quotes the hover ledger in the fold’s own sentences', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.push('granary', 'library', 'barracks');
    home.population = 10;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, near);
    const card = routeCard(ctx, row, bestMode(row)!);
    const title = routeLedgerTitle(card.lines);
    for (const line of card.lines) expect(title).toContain(line.source);
    expect(routeLedgerTitle([])).toBe('This route pays nothing yet');
  });
});

// --- 8. R3: every figure in its voice's ink ---------------------------------

/**
 * The user, 2026-09-09 (`docs/flags.md` item (iii), the R3 paragraph):
 * *"colorize the yields in the trade screen"* — the figures on every card and
 * table take their voice's colour, **the mark and the number alike**.
 *
 * No jsdom here, so what is defended is the three halves that can be quietly
 * wrong without the sheet looking broken: the **cut** (a composed figure is one
 * run per voice, and the mark closes its run so one colour covers both halves),
 * the **rule** (each of the six classes carries the specimen's own token), and
 * the **wiring** (every figure on the sheet goes through the coloured printer,
 * so a table cannot quietly keep printing in plain ink).
 */
const VOICE_TOKEN: Readonly<Record<YieldKey, string>> = {
  food: '--y-food',
  production: '--y-prod',
  gold: '--y-gold',
  science: '--y-sci',
  culture: '--y-cul',
  faith: '--y-faith',
};

describe('a yield figure in its own voice', () => {
  it('cuts a composed figure into one run per voice, the mark inside the run', () => {
    const runs = tradeFigureRuns(
      `+3${YIELD_GLYPH.food} +2${YIELD_GLYPH.production} +1${YIELD_GLYPH.gold}`,
    );
    expect(runs.map((run) => run.key)).toEqual(['food', 'production', 'gold']);
    // The mark closes the run, which is what makes one `color` cover the number
    // and the drawing at once — the mark is `currentColor`-masked.
    expect(runs.map((run) => run.text)).toEqual([
      `+3${YIELD_GLYPH.food}`,
      `+2${YIELD_GLYPH.production}`,
      `+1${YIELD_GLYPH.gold}`,
    ]);
    // Nothing is lost or moved: the runs rejoined are the figure that went in.
    expect(runs.map((run) => run.text).join(' ')).toBe(
      `+3${YIELD_GLYPH.food} +2${YIELD_GLYPH.production} +1${YIELD_GLYPH.gold}`,
    );
  });

  it('names all six voices, and colours none of the words between them', () => {
    for (const key of Object.keys(VOICE_TOKEN) as YieldKey[]) {
      const runs = tradeFigureRuns(`+1${YIELD_GLYPH[key]}`);
      expect(runs).toHaveLength(1);
      expect(runs[0]!.key).toBe(key);
      expect(runs[0]!.text).toBe(`+1${YIELD_GLYPH[key]}`);
    }
    // A route worth nothing says so in words, and words take no voice's ink.
    expect(tradeFigureRuns('nothing yet')).toEqual([{ key: null, text: 'nothing yet' }]);
  });

  it('gives each voice its own class, set in the specimen’s own token', () => {
    const css = source('style.css');
    for (const [key, token] of Object.entries(VOICE_TOKEN) as [YieldKey, string][]) {
      // The parchment token, not the lit one: this sheet is a book.
      expect(css).toContain(`.trade-yield.is-${key} {\n  color: var(${token});\n}`);
    }
    // And a number on this sheet is tabular mono wherever the run stands.
    expect(css).toMatch(/\.trade-yield \{[^}]*font-variant-numeric: tabular-nums;/);
  });

  it('prints every card and every table through the coloured printer', () => {
    const text = source('tradeScreen.ts');
    expect(text).toContain('function setTradeFigures(node: HTMLElement, text: string): void {');
    // The card, the Running table and the All-routes table — the three places a
    // route's pay is printed, and none of them writes plain text any more.
    expect(text).toContain("figuresNode('trade-yields', card.figures)");
    expect(text).toContain('setTradeFigures(node, text)');
    expect(text).toContain('setTradeFigures(pays, route.figures)');
    expect(text).toContain('setTradeFigures(pays, card.figures)');
    expect(text).not.toContain('setYieldText(pays,');
    // One class per voice, composed from the run's own key rather than typed.
    expect(text).toContain('`trade-yield is-${run.key}`');
  });

  it('carries a real card’s own figures, voice by voice', () => {
    const { state, home, near } = tradeWorld();
    home.buildings.push('granary', 'library', 'barracks');
    home.population = 12;
    near.population = 8;
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, near);
    const card = routeCard(ctx, row, bestMode(row)!);
    const runs = tradeFigureRuns(card.figures);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      // Every run of a paying card names a voice, and its text ends in that
      // voice's mark — the figure and the drawing in one coloured span.
      expect(run.key).not.toBeNull();
      expect(run.text.endsWith(YIELD_GLYPH[run.key!])).toBe(true);
    }
    expect(runs.map((run) => run.text).join(' ')).toBe(card.figures);
  });
});

// --- 9. R3: a partner nobody has found -------------------------------------

/**
 * The user's second mark of 2026-09-09: *"the unavailable routes tab should not
 * display routes to cities that haven't been discovered by the player (city
 * center needs to be revealed)"*.
 *
 * The clause sits in `readRoutes` and not on the sheet, so the claim to defend
 * is **on no tab and in no count** — a row filtered on one pane and counted on
 * the cut tab beside it would be the exact failure the one reading exists to
 * prevent.
 */
describe('a partner whose centre is not on the chart', () => {
  it('is on no tab and in no count, and appears the turn it is found', () => {
    const { state, home, theirs } = foreignTradeWorld();
    home.population = 10;
    theirs.population = 8;
    // Forget the gates — the scout never went. The empires are still **met**
    // (their worker stands where this seat can see it), so nothing but the
    // discovery clause can be what takes the row away.
    state.visibility[0]![tileIndex(state.map, theirs.col, theirs.row)] = HIDDEN;
    bumpRevision(state);
    expect(isExploredBy(state, 0, theirs.col, theirs.row)).toBe(false);
    expect(hasMetSeat(state, 0, 1)).toBe(true);

    const unfound = tradeContext(state, 0);
    // Not in the reading at all — which is what makes the four tabs agree.
    expect(unfound.reading.rows.some((row) => row.to.id === theirs.id)).toBe(false);
    expect(unfound.rows.some((row) => row.to.id === theirs.id)).toBe(false);
    const groups = recommendedGroups(unfound);
    for (const group of groups) {
      for (const entry of group.rows) expect(entry.row.to.id).not.toBe(theirs.id);
    }
    for (const group of refusalGroups(unfound)) {
      for (const entry of group.rows) expect(entry.row.to.id).not.toBe(theirs.id);
    }
    const shut = tabCounts(unfound, groups);
    expect(shut.all + shut.unavailable).toBe(unfound.rows.length);

    // A scout goes past their gates and the pair is a decision again.
    state.visibility[0]![tileIndex(state.map, theirs.col, theirs.row)] = EXPLORED;
    bumpRevision(state);
    const found = tradeContext(state, 0);
    expect(found.rows.some((row) => row.to.id === theirs.id)).toBe(true);
    expect(found.rows.length).toBe(unfound.rows.length + 1);
    const counts = tabCounts(found, recommendedGroups(found));
    expect(counts.all + counts.unavailable).toBe(found.rows.length);
    expect(counts.all + counts.unavailable).toBe(shut.all + shut.unavailable + 1);
  });

  it('keeps a seat’s own towns, which are always on its chart', () => {
    const { state, home, near, far } = tradeWorld();
    const ctx = tradeContext(state, 0);
    for (const town of [home, near, far]) {
      expect(isExploredBy(state, 0, town.col, town.row)).toBe(true);
    }
    expect(ctx.rows.some((row) => row.to.id === near.id)).toBe(true);
    expect(ctx.rows.some((row) => row.to.id === far.id)).toBe(true);
  });
});
