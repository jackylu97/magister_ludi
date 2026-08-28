/**
 * The four surfaces trade reaches, and the one property each of them can be
 * quietly wrong about.
 *
 * Trade is the first system in this game whose *interface* is a mode on the
 * board — a plate over every candidate partner, priced by a preview of a route
 * that does not exist yet — and the failure it invites is precise: the plate
 * quotes one number and the city panel banks another, or a plate is offered on
 * a partner the reducer will refuse. Both are sentences that are merely wrong,
 * which no thrown error catches.
 *
 * So what is pinned here is the *agreement*:
 *
 *   1. **A plate is `sendTraderError`'s answer.** Eligible when the reducer
 *      would take the send, greyed with the reducer's own sentence when it
 *      would not — never a set of rules the interface keeps beside it.
 *   2. **The plate's figure is the route's fold.** `previewRoute` hands the
 *      sim's own evaluator a caravan carrying the candidate route, so the
 *      number on the plate is byte-for-byte the number `explainRouteYield`
 *      answers with the turn after the send.
 *   3. **A routed caravan's sheet is its route**, and the move verbs are gone
 *      rather than greyed.
 *   4. **Exactly two trade lines** in the treasury's ledger, and the headline
 *      they sit under includes them.
 *   5. **Plunder is two pieces of news**, and the forfeit is said out loud.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the panels themselves are
 * not rendered: what is covered is the pure half — `tradeLines.ts`, which is
 * where every sentence and every figure on those panels is composed — and,
 * through the source exactly as `seatRoster.test.ts` reads its rule, the
 * wirings that span files.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { type City, type GameState, type Unit, createUnit } from '../../src/sim/state';
import {
  explainRouteYield,
  explainTradeGold,
  foldRouteYield,
  sendTraderError,
  settleTraderPlunder,
} from '../../src/sim/trade';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { civYields } from '../../src/ui/topBar';
import {
  caravanOffers,
  cityRouteRows,
  plunderLossSentence,
  plunderSpoils,
  plunderSpoilsSentence,
  routeEndSentence,
  previewRoute,
  routeFigures,
  routeReading,
  routeSlotsLine,
} from '../../src/ui/tradeLines';
import { at, bareState } from '../sim/improvementHelpers';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/controls.ts',
    '../../src/ui/unitPanel.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/cityPanel.ts',
    '../../src/ui/tradeLines.ts',
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
 * Two cities of seat 0 seven hexes apart, a market in the first (one route
 * slot) and a caravan standing in it — `test/sim/trade.test.ts`' bench, because
 * the interface's claim is precisely that it agrees with that file's rules.
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

describe('the send plates', () => {
  it('offers one plate per other town of the seat, and none for its own hex', () => {
    const { state, trader, partner } = tradeWorld();
    const offers = caravanOffers(state, trader);
    expect(offers.map((offer) => offer.cityId)).toEqual([partner.id]);
    expect(offers[0]!.col).toBe(partner.col);
    expect(offers[0]!.row).toBe(partner.row);
  });

  it('greys a plate with the reducer’s own sentence, never one of its own', () => {
    const { state, trader, home, partner } = tradeWorld();
    // No market, no slot — and the refusal a player reads is the one the command
    // would have answered with.
    home.buildings.length = 0;
    const [offer] = caravanOffers(state, trader);
    expect(offer!.error).toBe(sendTraderError(state, 0, trader.id, partner.id));
    expect(offer!.error).toBe('You have no trade routes — build a market');
  });

  it('keeps the figures on a refused plate, because the number is the argument', () => {
    const { state, trader, home } = tradeWorld();
    // 2026-08-27: a route's food and production are read off the **origin**
    // now — `home`'s own granary, not the partner's — so the market is
    // cleared for the refusal and a granary is put back for the figure.
    home.buildings.length = 0;
    home.buildings.push('granary');
    const [offer] = caravanOffers(state, trader);
    expect(offer!.error).not.toBeNull();
    // "Nippur would be worth this, and you have no market" is the case for
    // building one. A plate that vanished would answer neither half.
    expect(offer!.label).toContain('turns');
    expect(offer!.lines.length).toBeGreaterThan(0);
  });

  it('says how far a partner out of range is, in the reducer’s words', () => {
    const { state, trader } = tradeWorld(48);
    // Column 27 is the antipode of column 3 on a 48-wide map: the board wraps
    // east to west, so a town near the right edge is a *near* neighbour.
    const far = foundCityAt(state, 0, at(state, 27, 8));
    const offer = caravanOffers(state, trader).find((entry) => entry.cityId === far.id);
    expect(offer!.error).toBe(sendTraderError(state, 0, trader.id, far.id));
    expect(offer!.error).toMatch(/turns away; a caravan may be sent/);
  });

  it('is empty for a caravan standing in a field', () => {
    const { state, trader } = tradeWorld();
    trader.col = 6;
    expect(caravanOffers(state, trader)).toEqual([]);
  });

  it('is empty for a piece that carries no route at all', () => {
    const { state } = tradeWorld();
    const warrior = createUnit(state, 0, 'warrior', 3, 4);
    expect(caravanOffers(state, warrior)).toEqual([]);
  });

  /**
   * The pass's whole promise. The plate is drawn before the route exists, and
   * the only honest way to price one is to ask the evaluator that will price it
   * afterwards — so the two are compared across the actual send.
   */
  it('quotes exactly what the route pays once it is sent', () => {
    const { state, trader, home, partner } = tradeWorld();
    // Read off the **origin** now — see `test/sim/trade.test.ts`.
    home.buildings.push('granary', 'barracks');
    const before = previewRoute(state, home, partner);

    const result = applyCommand(state, {
      type: 'sendTrader',
      playerId: 0,
      unitId: trader.id,
      cityId: partner.id,
    });
    expect(result.ok).toBe(true);

    const after = foldRouteYield(explainRouteYield(state, trader));
    expect({ food: before.food, production: before.production, gold: before.gold }).toEqual(after);
    // And the lines themselves, labels included — one list, read twice.
    expect(before.lines).toEqual(explainRouteYield(state, trader));
  });

  it('previews without putting a caravan anywhere the state can see it', () => {
    const { state, trader, home, partner } = tradeWorld();
    previewRoute(state, home, partner);
    // There is no caravan in the preview at all any more — it is a pure pair of
    // towns (`explainRouteYieldBetween`) — so nothing can reach `state.units`
    // and pay a town for a route nobody opened. Kept as the pin on that.
    expect(trader.trade).toBeUndefined();
    expect(state.units.every((unit) => unit.trade === undefined)).toBe(true);
  });

  it('prices a preview through the sim\'s pure pair evaluator, with no copied unit', () => {
    const body = source('tradeLines.ts');
    expect(body).toContain('explainRouteYieldBetween(state, from, to)');
    // The copy is gone and must not come back: a caravan spread into a literal
    // wearing a route it is not carrying is the shape this pass deleted.
    expect(body).not.toContain('...unit,');
  });

  it('names the partner through the one city-name formatter', () => {
    const { state, trader } = tradeWorld();
    // The capital star comes through `cityDisplayName`, so a plate reads the
    // way a banner does.
    const [offer] = caravanOffers(state, trader);
    expect(offer!.name).not.toContain('✶');
    const home = caravanOffers(state, createUnit(state, 0, 'trader', 10, 4))[0]!;
    expect(home.name).toContain('✶');
  });

  it('says nothing yet rather than a row of zeroes for a barren partner', () => {
    expect(routeFigures({ food: 0, production: 0, gold: 0 })).toBe('nothing yet');
    expect(routeFigures({ food: 3, production: 0, gold: 1 })).toBe('+3🌾 +1💰');
  });
});

describe('the send mode', () => {
  const controls = source('controls.ts');

  it('arms only what the reducer would take an order from', () => {
    // `setSendMode` refuses on the blocker rather than on a rule of its own —
    // the same bargain `setBuyMode` makes.
    expect(controls).toMatch(/const next = on && sendCaravanBlocker\(\) === null;/);
  });

  it('comes off on Escape, before the popovers and above the selection', () => {
    const escape = controls.slice(controls.indexOf("if (event.key === 'Escape')"));
    // To the end of the Escape arm, not to its first `return` — `closePopovers`
    // returns early in the middle of the ladder.
    const block = escape.slice(0, escape.indexOf("if (event.key === 'g'"));
    expect(block).toMatch(/if \(moveMode\) setMoveMode\(false\);/);
    expect(block).toMatch(/else if \(sendMode\) setSendMode\(false\);/);
    // Escape puts the plates down and keeps the caravan: a player who changed
    // their mind about where has not changed their mind about which piece.
    expect(block.indexOf('setSendMode(false)')).toBeLessThan(block.indexOf('clearSelection()'));
  });

  it('takes the plates down with the selection and with the seat', () => {
    // A board full of one caravan's partners carried onto the warrior somebody
    // just clicked would be an offer nobody made.
    expect(controls).toMatch(/if \(sendMode\) setSendMode\(false\);/);
    const hop = controls.slice(controls.indexOf('function setLocalPlayer'));
    expect(hop.slice(0, hop.indexOf('showLocalPlayer'))).toContain('setSendMode(false)');
  });

  it('clears the dashed preview whenever the mode goes down', () => {
    expect(controls).toMatch(/if \(!sendMode\) drawRoutePreview\(null\);/);
    // Optional, so a renderer without one is unaffected.
    expect(controls).toMatch(/renderer\.previewRoute\?\.\(cells\)/);
  });

  it('sends by city id, and the pick is the plate’s own offer', () => {
    expect(controls).toMatch(/type: 'sendTrader',[\s\S]{0,120}cityId,/);
    // The plate is a hex and a face; which town it stands on is re-asked of the
    // live offers, so a pick can never name a partner the state has moved past.
    const main = source('main.ts');
    expect(main).toMatch(/const cityId = partnerAt\(plate\);/);
    expect(main).toMatch(/controls\.sendCaravan\(cityId\)/);
    expect(main).toMatch(/function partnerAt\(plate: \{ col: number; row: number \}\)/);
  });
});

describe('a routed caravan’s sheet', () => {
  function routed(): { state: GameState; trader: Unit; home: City; partner: City } {
    const world = tradeWorld();
    // Read off the **origin** now — see `test/sim/trade.test.ts`.
    world.home.buildings.push('granary');
    const result = applyCommand(world.state, {
      type: 'sendTrader',
      playerId: 0,
      unitId: world.trader.id,
      cityId: world.partner.id,
    });
    expect(result.ok).toBe(true);
    return world;
  }

  it('reads as the route, both ends and the clock', () => {
    const { state, trader, home, partner } = routed();
    const reading = routeReading(state, trader)!;
    expect(reading.fromName).toContain(home.name);
    expect(reading.toName).toBe(partner.name);
    expect(reading.line).toMatch(/^Caravan · .+ ⇄ .+ · .+ · \d+ turns left$/);
    expect(reading.line).toContain(reading.figures);
  });

  it('subtracts the clock rather than reading a countdown off the route', () => {
    const { state, trader } = routed();
    const first = routeReading(state, trader)!.turnsLeft;
    state.turn += 3;
    expect(routeReading(state, trader)!.turnsLeft).toBe(first - 3);
    // A lapsed route reads zero and still prints: the piece is walking home and
    // the slot is still spoken for.
    state.turn += 100;
    expect(routeReading(state, trader)!.turnsLeft).toBe(0);
  });

  it('folds to the same figures the city panel banks', () => {
    const { state, trader } = routed();
    const reading = routeReading(state, trader)!;
    expect(reading.figures).toBe(routeFigures(foldRouteYield(explainRouteYield(state, trader))));
  });

  it('is null for a caravan carrying nothing', () => {
    const { state, trader } = tradeWorld();
    expect(routeReading(state, trader)).toBeNull();
  });

  const panel = source('unitPanel.ts');

  it('hides the move verbs, rather than greying them', () => {
    // A caravan carrying a route walks itself, so Cancel Orders would drop a
    // path the resolution writes straight back. The early return is the rule.
    const block = panel.slice(panel.indexOf('const route = trades(unitDef(unit.type))'));
    const actions = block.slice(0, block.indexOf('// An unladen caravan'));
    expect(actions).toContain('Auto-resend');
    expect(actions).toContain('Cancel Route');
    expect(actions).toMatch(/return actions;/);
    expect(actions).not.toContain('Cancel Orders');
    expect(actions).not.toContain('Sleep');
  });

  it('flips auto-resend through the command and never the field', () => {
    expect(panel).toMatch(/run: \(\) => onSetAutoResend\(!route\.autoResend\)/);
    expect(controlsSource()).toMatch(/type: 'setAutoResend',/);
  });

  it('ends the route through the command, and says what it freed', () => {
    expect(panel).toMatch(/run: onCancelRoute/);
    const controls = controlsSource();
    expect(controls).toMatch(/type: 'cancelRoute', playerId: localPlayerId, unitId: unit\.id/);
    expect(controls).toMatch(/routeSlotsLineOf\(getGame\(\)\.state, localPlayerId\)/);
  });

  it('offers the send verb only to a piece that carries routes', () => {
    expect(panel).toMatch(/if \(trades\(unitDef\(unit\.type\)\)\) \{[\s\S]{0,400}Send Caravan/);
  });

  function controlsSource(): string {
    return source('controls.ts');
  }
});

describe('the route slot figure', () => {
  it('counts the caravans out against the buildings that allow them', () => {
    const { state, trader, partner } = tradeWorld();
    expect(routeSlotsLine(state, 0)).toBe('0 of 1 route');
    applyCommand(state, {
      type: 'sendTrader',
      playerId: 0,
      unitId: trader.id,
      cityId: partner.id,
    });
    expect(routeSlotsLine(state, 0)).toBe('1 of 1 route');
  });

  it('pluralises off the figure it prints, not off the one it counts', () => {
    const { state, home } = tradeWorld();
    home.buildings.push('market');
    expect(routeSlotsLine(state, 0)).toBe('0 of 2 routes');
  });
});

describe('the city panel’s routes row', () => {
  it('reads a route to this town with its figures, and one from it without', () => {
    // 2026-08-27: the origin's buildings set the figure, the destination
    // banks it, so it is the **inbound** row that now carries what the route
    // is worth — see `cityRouteRows`.
    const { state, trader, home, partner } = tradeWorld();
    home.buildings.push('granary');
    applyCommand(state, {
      type: 'sendTrader',
      playerId: 0,
      unitId: trader.id,
      cityId: partner.id,
    });
    const fromHome = cityRouteRows(state, home);
    expect(fromHome).toHaveLength(1);
    expect(fromHome[0]!.outbound).toBe(true);
    // The outbound row carries no figures: it pays somewhere else.
    expect(fromHome[0]!.text).toBe(`→ ${partner.name}`);

    const toPartner = cityRouteRows(state, partner);
    expect(toPartner).toHaveLength(1);
    expect(toPartner[0]!.outbound).toBe(false);
    expect(toPartner[0]!.text).toMatch(/^← .+ · \+\d+🌾/);
  });

  it('says nothing about a town no caravan touches', () => {
    const { state, home } = tradeWorld();
    expect(cityRouteRows(state, home)).toEqual([]);
  });

  /**
   * The route's yields were already inside the ⚙ and 🌾 chips (`cityRouteYields`
   * is one of `cityYields`' flats) and were not in the list under them, which is
   * a total shown without its reason — rule 5's one forbidden shape.
   */
  it('prints the caravan’s lines under the chips it is already inside', () => {
    const panel = source('cityPanel.ts');
    expect(panel).toMatch(/for \(const entry of cityRouteYields\(state, city\)\) \{/);
    expect(panel).toMatch(/line\(entry\.source, figures\)/);
    // And the trading post is a mark, not a building row: it is history, and all
    // it does is let later caravans reach further.
    expect(panel).toMatch(/city\.tradingPost === true/);
    expect(panel).toMatch(/trading post/);
  });
});

describe('the treasury’s trade lines', () => {
  /** A road under every hex between two towns, laid by seat 0. */
  function connectedWorld(): GameState {
    const { state, home, partner } = tradeWorld();
    home.population = 6;
    partner.population = 8;
    for (let col = home.col; col <= partner.col; col++) at(state, col, 4).road = 0;
    return state;
  }

  it('is exactly two lines: the connections, and the bill', () => {
    const state = connectedWorld();
    const lines = explainTradeGold(state, 0);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.source).toMatch(/^City connections · \d+ (city|cities)$/);
    expect(lines[1]!.source).toMatch(/^Road maintenance · \d+ hexes$/);
    // One pays and one costs, which is why the ledger prints both signed.
    expect(lines[0]!.gold).toBeGreaterThan(0);
    expect(lines[1]!.gold).toBeLessThan(0);
  });

  /**
   * The headline and the card are one number and its summands. `collectYields`
   * banks trade gold once per player, so a strip that left it out would be a
   * rate the turn resolution disagrees with — the argument the luxuries were
   * added to `civYields` for, and the reason these two join in one place.
   */
  it('is inside the gold the top bar promises, not beside it', () => {
    const state = connectedWorld();
    const withTrade = civYields(state, 0).gold;
    const trade = explainTradeGold(state, 0).reduce((sum, line) => sum + line.gold, 0);
    expect(trade).not.toBe(0);
    for (const tile of state.map.tiles) delete tile.road;
    expect(civYields(state, 0).gold).toBe(withTrade - trade);
  });

  it('reads by voice rather than by a hand-rolled gold comparison', () => {
    const bar = source('topBar.ts');
    expect(bar).toMatch(/for \(const line of empireTradeLines\(state, playerId\)\) \{/);
    expect(bar).toMatch(/const value = line\[key\];/);
    // The banked register's rule, one surface over: no site re-asks which yield
    // it is looking at.
    const code = bar.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toContain("key === 'gold'");
  });
});

describe('plunder, as two pieces of news', () => {
  it('tells the pillager what the caravan was carrying and where it went', () => {
    const line = plunderSpoilsSentence(
      {
        fromOwnerId: 1,
        gold: 30,
        food: 10,
        production: 10,
        cityName: 'Nippur',
        grownTo: null,
        warning: null,
      },
      'Uruk',
    );
    expect(line).toBe('✶ A caravan of Uruk’s plundered: +30💰, +10🌾 +10⚙ → Nippur');
  });

  it('says the growth when the grain filled a basket', () => {
    const line = plunderSpoilsSentence(
      {
        fromOwnerId: 1,
        gold: 30,
        food: 10,
        production: 0,
        cityName: 'Nippur',
        grownTo: 5,
        warning: null,
      },
      'Uruk',
    );
    expect(line).toContain('→ Nippur · grows to 5');
  });

  /**
   * The wild has no cities, so there is nowhere to carry the goods and the
   * simulation says so rather than inventing a destination. Taken from
   * `settleTraderPlunder` itself rather than from a literal, because the claim
   * is that the interface *prints the sim's warning* — not that it can compose
   * a sentence about one.
   */
  it('says the forfeit out loud when the wild takes a caravan', () => {
    const { state } = tradeWorld();
    const wild = state.players[state.players.length - 1]!;
    const plunder = settleTraderPlunder(state, wild.id, 0, { col: 6, row: 4 });
    expect(plunder.cityName).toBeNull();
    expect(plunder.warning).not.toBeNull();
    const line = plunderSpoilsSentence(plunder, 'Uruk');
    expect(line).toContain(plunder.warning!);
    // A boon that vanished silently is the interface keeping a secret.
    expect(line).toContain('no city to receive the goods');
  });

  it('tells the victim which route it lost, and copes with not knowing', () => {
    expect(plunderLossSentence('Nippur')).toBe('✶ Your caravan to Nippur was plundered');
    expect(plunderLossSentence(null)).toBe('✶ Your caravan was plundered');
  });

  const controls = source('controls.ts');

  it('names the destination from before the blow, because the route died with the piece', () => {
    // `commit` snapshots the seat's caravans ahead of the dispatch, the way
    // `unitSnapshot` does for hit points — after it, there is nothing to ask.
    expect(controls).toMatch(/const caravans = caravanDestinations\(\);/);
    expect(controls.indexOf('const caravans = caravanDestinations();')).toBeLessThan(
      controls.indexOf('const result = dispatch(getGame(), command);'),
    );
    expect(controls).toMatch(/reportRaids\(result, caravans\);/);
  });

  it('reports the victim before the ordinary casualty split', () => {
    const raids = controls.slice(controls.indexOf('function reportRaids'));
    const body = raids.slice(0, raids.indexOf('const fell ='));
    // "Your trader was slain" would bury what was actually lost: the route.
    expect(body).toMatch(/if \(combat\.plundered\) \{/);
    expect(body).toContain('plunderLossSentence(caravans.get(combat.defenderUnitId)');
  });

  it('reports the pillager off the arrival, which is the only thing that knows', () => {
    const arrivals = controls.slice(controls.indexOf('function reportArrivals'));
    expect(arrivals).toMatch(/for \(const plunder of arrival\.plundered\)/);
    expect(arrivals).toContain('plunderSpoilsSentence(plunder, victim)');
  });
});

describe('the combat forecast', () => {
  const main = source('main.ts');

  it('says plunder where it used to say capture, and says it first', () => {
    expect(main).toMatch(/if \(preview\.plundersUnit\) \{/);
    expect(main).toContain('Plundered — the caravan is lost and its cargo taken');
    // Asked before `capturesUnit` because the simulation decides it first: a
    // laden caravan is excluded from the capture rule, and an unladen trader is
    // an ordinary civilian and is taken like one.
    expect(main.indexOf('preview.plundersUnit')).toBeLessThan(
      main.indexOf('preview.capturesUnit'),
    );
  });

  it('narrates the blow with the same verb', () => {
    const controls = source('controls.ts');
    const notice = controls.slice(controls.indexOf('function reportCombatNotice'));
    const body = notice.slice(0, notice.indexOf('const verb ='));
    expect(body).toMatch(/if \(view\.plundersUnit\) \{/);
    expect(body).toContain('plunders');
    expect(body.indexOf('view.plundersUnit')).toBeLessThan(body.indexOf('view.capturesUnit'));
  });
});

/**
 * The three pieces of trade news the sim's own pass unlocked (2026-08-27), all
 * of them things the interface previously could not say because nothing carried
 * them across the wall.
 *
 *   · an ordered raid on a caravan now knows what it took
 *     (`CommandResult.combats[].plundered`);
 *   · a route that ran out is reported (`CommandResult.routesEnded`);
 *   · a preview is a pure pair of towns, with no copied unit in it (above).
 */
describe('an ordered raid quotes the figures', () => {
  const controls = source('controls.ts');

  it('composes them through the one composer both sentences use', () => {
    const plunder = {
      fromOwnerId: 1,
      gold: 30,
      food: 10,
      production: 10,
      cityName: 'Nippur',
      grownTo: null,
      warning: null,
    };
    // The figures, with no sentence around them — so the pillager watching from
    // elsewhere and the player who ordered the blow cannot drift on what a raid
    // was worth.
    expect(plunderSpoils(plunder)).toBe('+30💰, +10🌾 +10⚙ → Nippur');
    expect(plunderSpoilsSentence(plunder, 'Uruk')).toContain(plunderSpoils(plunder));
  });

  it('says them in the attacker’s own line, off the reducer’s report', () => {
    const notice = controls.slice(controls.indexOf('function reportCombatNotice'));
    const body = notice.slice(0, notice.indexOf('if (view.capturesUnit)'));
    expect(body).toContain('plunderSpoils(plundered)');
    expect(body).toContain('${view.attackerName} plunders ${view.defenderName}${spoils}');
    // The stale note that said the figures could not reach this side is gone.
    expect(body).not.toContain('The figures are deliberately absent');
  });

  it('takes the figures off the command rather than measuring the treasury', () => {
    // The gold is banked and the grain is in a basket in another town by the
    // time the notice runs; measuring it would mean a second `nearestOwnedCity`
    // at the surface. It is the one figure on this notice that is *reported*.
    expect(controls).toContain('result.combats?.[0]?.plundered ?? null');
  });
});

describe('a route that ran out is news', () => {
  const controls = source('controls.ts');

  it('tells the two apart, because only one of them leaves a slot to spend', () => {
    const { state } = tradeWorld();
    const home = state.cities[0]!;
    const report = { unitId: 1, ownerId: 0, from: home.id, to: state.cities[1]!.id };
    expect(routeEndSentence(state, { ...report, renewed: false })).toBe(
      `✶ The caravan from ${cityDisplayName(state, home)} has come home`,
    );
    expect(routeEndSentence(state, { ...report, renewed: true })).toBe(
      `✶ The caravan from ${cityDisplayName(state, home)} sets out again`,
    );
  });

  it('copes with an end it cannot name rather than throwing', () => {
    const { state } = tradeWorld();
    const line = routeEndSentence(state, {
      unitId: 1,
      ownerId: 0,
      from: 9999,
      to: 9998,
      renewed: false,
    });
    expect(line).toContain('a lost city');
  });

  it('is reported for this seat alone, through the one funnel', () => {
    const routes = controls.slice(controls.indexOf('function reportRoutes'));
    const body = routes.slice(0, routes.indexOf('\n  }\n'));
    expect(body).toContain('if (report.ownerId !== localPlayerId) continue;');
    expect(body).toContain('routeEndSentence(getGame().state, report)');
    // In `commit`, beside the wonders and the Triumphs, so there is one call
    // site rather than one per verb.
    expect(controls).toContain('reportRoutes(result);');
  });
});
