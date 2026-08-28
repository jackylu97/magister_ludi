/**
 * The surfaces trade reaches, and the one property each of them can be quietly
 * wrong about.
 *
 * Trade's interface **used** to be a mode on the board — a plate over every
 * candidate partner, priced by a preview of a route that did not exist yet —
 * and this file pinned the agreement between that preview and the payout. The
 * user's ruling of 2026-08-28 deleted the mode outright ("I want to remove all
 * micromanagement of units"): a route is chosen on the Trade screen and the
 * caravan is teleported to the origin. Those tests went with it, and the claims
 * they made about a *pair's* figures and a *pair's* refusal are made about the
 * screen's rows in `tradeScreen.test.ts`, which is where they now belong.
 *
 * What is left here is what is still about a **piece** and a **town**:
 *
 *   1. **A routed caravan's sheet is its route**, and the move verbs are gone
 *      rather than greyed.
 *   2. **An idle caravan's sheet is one verb and a capacity**, and the greying
 *      is the empire's ledger rather than anything about where it stands.
 *   3. **The city panel's Routes row** reads inbound and outbound differently,
 *      because only one of them pays this town.
 *   4. **Exactly four empire lines** in the treasury's ledger — the connections,
 *      the road bill, the army's wages and the institutions' — and the headline
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
  explainEmpireGold,
  explainRouteYield,
  foldRouteYield,
  routeSlots,
  settleTraderPlunder,
  usedRouteSlots,
} from '../../src/sim/trade';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { civYields } from '../../src/ui/topBar';
import {
  NO_ROUTE_CAPACITY,
  cityRouteRows,
  hasFreeRouteSlot,
  plunderLossSentence,
  plunderSpoils,
  plunderSpoilsSentence,
  routeEndSentence,
  routeFigures,
  routeReading,
  routeSlotsLine,
} from '../../src/ui/tradeLines';
import { explainBuildingUpkeep, explainUnitUpkeep } from '../../src/sim/upkeep';
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

describe('a routed caravan’s sheet', () => {
  function routed(): { state: GameState; trader: Unit; home: City; partner: City } {
    const world = tradeWorld();
    // Read off the **origin** now — see `test/sim/trade.test.ts`.
    world.home.buildings.push('granary');
    const result = applyCommand(world.state, {
      type: 'startRoute',
      playerId: 0,
      unitId: world.trader.id,
      fromCityId: world.home.id,
      toCityId: world.partner.id,
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
    const actions = block.slice(0, block.indexOf('// An **idle** caravan'));
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

  it('offers the start verb only to a piece that carries routes', () => {
    expect(panel).toMatch(
      /if \(trades\(unitDef\(unit\.type\)\) && onStartRoute\) \{[\s\S]{0,600}'Start route'/,
    );
  });

  function controlsSource(): string {
    return source('controls.ts');
  }
});

/**
 * An **idle** caravan's sheet, after the ruling: one trade verb, no clause about
 * where the piece is standing, and a greying that is about the empire's ledger.
 */
describe('an idle caravan’s sheet', () => {
  const panel = source('unitPanel.ts');
  const controls = source('controls.ts');

  it('greys Start route on a full ledger, in the user’s own sentence', () => {
    const { state, trader, home, partner } = tradeWorld();
    expect(hasFreeRouteSlot(state, 0)).toBe(true);
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: partner.id,
    });
    expect(usedRouteSlots(state, 0)).toBe(routeSlots(state, 0));
    expect(hasFreeRouteSlot(state, 0)).toBe(false);
    // The blocker in `controls.ts` is that question and that sentence, read off
    // the source because there is no jsdom here to press the button in.
    expect(controls).toContain(
      'return hasFreeRouteSlot(state, localPlayerId) ? null : NO_ROUTE_CAPACITY;',
    );
    expect(NO_ROUTE_CAPACITY).toBe(
      'Not enough trade route capacity. Build markets and harbours to gain more.',
    );
  });

  it('says so with no market at all, which is the ledger’s other empty state', () => {
    const { state, home } = tradeWorld();
    home.buildings.length = 0;
    expect(routeSlots(state, 0)).toBe(0);
    expect(hasFreeRouteSlot(state, 0)).toBe(false);
  });

  it('prints the capacity beside the verb, not only in the hover', () => {
    const block = panel.slice(panel.indexOf("label: 'Start route'"));
    const action = block.slice(0, block.indexOf('});'));
    expect(action).toContain('note: routeSlotsLine()');
    expect(action).toContain('blocked:');
    // Greyed, never hidden: a market finishing next turn gives the verb back.
    expect(action).not.toContain('if (blocker');
  });

  it('is greyed rather than hidden, and hides no move verb of its own', () => {
    // The early return above belongs to a *routed* caravan. An idle one falls
    // through to the ordinary civilian verbs, which is the ruling's other half.
    const block = panel.slice(panel.indexOf('// An **idle** caravan'));
    const rest = block.slice(0, block.indexOf('if (unitDef(unit.type).foundsCity)'));
    expect(rest).not.toContain('return actions;');
  });

  it('asks nothing about where the caravan is standing', () => {
    // The deleted clause. `originCityOf` was the whole of it in `controls.ts`,
    // and the sentence it produced was the one place the interface said
    // something the rules did not.
    expect(controls).not.toContain('A caravan sets out from a city');
    expect(controls).not.toContain('originCityOf');
  });
});

describe('the route slot figure', () => {
  it('counts the caravans out against the buildings that allow them', () => {
    const { state, trader, home, partner } = tradeWorld();
    expect(routeSlotsLine(state, 0)).toBe('0 of 1 route');
    applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: partner.id,
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
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: home.id,
      toCityId: partner.id,
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

describe('the treasury’s empire lines', () => {
  /** A road under every hex between two towns, laid by seat 0. */
  function connectedWorld(): GameState {
    const { state, home, partner } = tradeWorld();
    home.population = 6;
    partner.population = 8;
    for (let col = home.col; col <= partner.col; col++) at(state, col, 4).road = 0;
    return state;
  }

  /**
   * **Four lines, in a fixed order** (Entry XLI). It used to be two — the
   * connections and the road bill — and the two maintenance lines joined that
   * fold rather than opening a second one, which is the whole of why the
   * function was renamed. Asserted by *content* and in order rather than by a
   * length, because the interesting property is that each line is still one
   * count and one total: a per-piece page here would be the second ledger the
   * fold exists to prevent.
   */
  it('is four lines: the connections, the road, the army and the institutions', () => {
    const state = connectedWorld();
    // The fixture's caravan is exempt (a trader pays nothing), so the army line
    // needs a soldier before it exists at all.
    createUnit(state, 0, 'warrior', 3, 4);
    const lines = explainEmpireGold(state, 0);
    expect(lines.map((line) => line.source)).toEqual([
      expect.stringMatching(/^City connections · \d+ (city|cities)$/),
      expect.stringMatching(/^Road maintenance · \d+ hexes$/),
      expect.stringMatching(/^Unit maintenance · \d+ units?$/),
      expect.stringMatching(/^Building maintenance · \d+ buildings?$/),
    ]);
    // One pays and three cost, which is why the ledger prints all four signed.
    expect(lines[0]!.gold).toBeGreaterThan(0);
    for (const line of lines.slice(1)) expect(line.gold).toBeLessThan(0);
  });

  /**
   * The headline and the card are one number and its summands. `collectYields`
   * banks the empire gold once per player, so a strip that left it out would be
   * a rate the turn resolution disagrees with — the argument the luxuries were
   * added to `civYields` for, and the reason these lines join in one place.
   *
   * Stated as a **difference** rather than as "the headline minus the fold",
   * which is what it used to be: the market in the fixture now pays maintenance,
   * so tearing up the roads no longer removes the whole fold and the old
   * subtraction was asserting something that had stopped being true. What is
   * actually claimed — that a change to the empire lines moves the headline by
   * exactly that much — survives any number of lines.
   */
  it('is inside the gold the top bar promises, not beside it', () => {
    const state = connectedWorld();
    const fold = (): number =>
      explainEmpireGold(state, 0).reduce((sum, line) => sum + line.gold, 0);
    const headlineBefore = civYields(state, 0).gold;
    const empireBefore = fold();
    for (const tile of state.map.tiles) delete tile.road;
    const empireAfter = fold();
    // The roads mattered: without this the identity below would hold trivially.
    expect(empireBefore).not.toBe(empireAfter);
    expect(headlineBefore - civYields(state, 0).gold).toBe(empireBefore - empireAfter);
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

  /**
   * **The per-item lists sit one hover deeper**, and the coupling that carries
   * them is the only fragile thing in this pass: `TradeGoldLine` offers no
   * discriminant, so the adapter keys on the head of the label. It degrades to
   * *no* detail rather than to a wrong one — which is a silent failure, and
   * therefore this test, which is the thing that makes the coupling a decision.
   */
  it('hangs the per-piece lists behind the two maintenance lines', () => {
    const state = connectedWorld();
    createUnit(state, 0, 'warrior', 3, 4);
    const heads = explainEmpireGold(state, 0).map((line) => line.source.split(' · ')[0]);
    expect(heads).toContain('Unit maintenance');
    expect(heads).toContain('Building maintenance');
    // And the adapter looks them up under exactly those names.
    const bar = source('topBar.ts');
    expect(bar).toContain("['Unit maintenance', upkeepDetail(explainUnitUpkeep(state, playerId))]");
    expect(bar).toContain(
      "['Building maintenance', upkeepDetail(explainBuildingUpkeep(state, playerId))]",
    );
    // The per-item lists themselves are the simulation's, not a second walk.
    expect(explainUnitUpkeep(state, 0).map((line) => line.source)).toContain('Warrior');
    expect(explainBuildingUpkeep(state, 0)[0]!.source).toMatch(/^Market · /);
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
