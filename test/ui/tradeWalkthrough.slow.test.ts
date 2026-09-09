/**
 * One caravan, start to finish, read the way the interface reads it.
 *
 * The browser check as a test (the extension was not connected when this pass
 * shipped): open the sheet, read the recommendation, press its Send, watch the
 * cart the reducer mints walk its road, and read the panels behind it. Every
 * figure here comes from the surfaces themselves — `tradeContext`,
 * `recommendedGroups`, `routeCard`, `buyCommandFor`, `runningRoutes`,
 * `routeReading`, `cityRouteRows`, `explainEmpireGold`, `readEmpire` — so what
 * is defended is the *sequence*: that each of those keeps saying something true
 * as the caravan moves, the road goes down and the towns join up.
 *
 * **Re-aimed to the sheet's own flow by batch R2** (`docs/flags.md` item (iii)).
 * The walkthrough used to buy a trader and then send it; there is no trader to
 * buy and no piece to send. The gesture is now: the sheet recommends a pair,
 * Send hires it with gold, and the caravan comes with the route already on it.
 * The tabs are walked in the order a player meets them — Recommended, then
 * Running, then Unavailable once the ledger is full.
 *
 * Slow by kind (`CLAUDE.md`): it drives whole turn resolutions rather than
 * asking one evaluator a question.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { purchaseError, routePrice } from '../../src/sim/purchase';
import { type GameState, unitById, bumpRevision } from '../../src/sim/state';
import { explainEmpireGold } from '../../src/sim/trade';
import { runEndOfTurn } from '../../src/sim/turn';
import { readEmpire } from '../../src/sim/readings';
import {
  NO_ROUTE_CAPACITY,
  cityRouteRows,
  routeReading,
  routeSlotsLine,
} from '../../src/ui/tradeLines';
import {
  buyCommandFor,
  recommendedGroups,
  refusalGroups,
  routeCard,
  runningRoutes,
  tabCounts,
  tradeContext,
} from '../../src/ui/tradeScreen';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { at, bareState } from '../sim/improvementHelpers';

function resolve(state: GameState): void {
  runEndOfTurn(state);
  state.turn += 1;
}

describe('a caravan, from the treasury to the ledger', () => {
  it('reads correctly at every step of its own life', () => {
    const state = bareState(16, 9);
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const partner = foundCityAt(state, 0, at(state, 10, 4));
    home.buildings.push('market');
    // Read off the **origin** now (2026-08-27) — see `test/sim/trade.test.ts`.
    // Two food-side buildings: the 2026-09-03 nerf pays a food per two, and
    // the walkthrough's inbound row wants a 🌾 figure to read.
    home.buildings.push('granary', 'library', 'barracks');
    home.population = 6;
    partner.population = 6;
    state.players[0]!.gold = 900;

    // 1. **The sheet opens on its recommendations.** A Trader is not bought
    //    like a worker any more — the purchase book refuses it in the reducer's
    //    words — so the first thing a player meets is a card, not a build row.
    expect(purchaseError(state, 0, home.id, { kind: 'unit', id: 'trader' }, 'gold')).toMatch(
      /hired on the trade sheet/,
    );
    const opened = tradeContext(state, 0);
    const groups = recommendedGroups(opened);
    expect(groups.length).toBeGreaterThan(0);
    // The four tab counts agree with what is behind them before anything is sent.
    const counts = tabCounts(opened, groups);
    expect(counts.running).toBe(0);
    expect(counts.all).toBe(opened.rows.filter((row) => row.available).length);
    expect(counts.all + counts.unavailable).toBe(opened.rows.length);

    // 2. **The card the sheet leads with**, read in the mode the group picked
    //    it for. Its price is the reading's own and the purse can pay it.
    const best = groups[0]!.rows[0]!;
    const card = routeCard(opened, best.row, best.mode);
    // `cityDisplayName`, star and all — the sheet names a town the way every
    // other surface does rather than reaching for `City.name`.
    expect(card.fromName).toBe(cityDisplayName(state, home));
    expect(card.figures).not.toBe('nothing yet');
    expect(card.price).toBe(routePrice(state, 0));
    expect(card.price).toBeGreaterThan(0);
    expect(card.affordable).toBe(true);

    // 3. **Send.** The command is the card's own — two towns and a way — and the
    //    reducer mints the caravan in the origin's gates with the route on it.
    const command = buyCommandFor(opened, best.row, best.mode)!;
    expect(command).toEqual({
      fromCityId: best.row.from.id,
      toCityId: best.row.to.id,
      mode: best.mode,
    });
    const goldBefore = state.players[0]!.gold;
    const bought = applyCommand(state, { type: 'buyRoute', playerId: 0, ...command });
    expect(bought.ok, bought.ok ? '' : bought.error).toBe(true);
    expect(state.players[0]!.gold).toBe(goldBefore - card.price);
    const trader = state.units.find((unit) => unit.type === 'trader')!;
    expect(trader).toBeDefined();

    // 4. **The Running tab has a row now**, and it says what the sheet said.
    expect({ col: trader.col, row: trader.row }).toEqual({ col: home.col, row: home.row });
    const running = runningRoutes(state, 0);
    expect(running).toHaveLength(1);
    expect(running[0]!.fromName).toBe(cityDisplayName(state, home));
    expect(running[0]!.mode).toBe(best.mode);
    expect(running[0]!.turnsLeft).toBeGreaterThan(0);
    const sent = routeReading(state, trader)!;
    expect(sent.toName).toBe(best.row.to.name);
    expect(sent.figures).not.toBe('nothing yet');
    expect(routeSlotsLine(state, 0)).toBe('1 of 1 route');

    // 5. **And the Unavailable tab has the rest**, under the clause that shut
    //    them: the one market's slot is spent, so nothing is on offer and the
    //    user's own sentence stands over the group.
    const full = tradeContext(state, 0);
    expect(full.slotFree).toBe(false);
    expect(recommendedGroups(full)).toEqual([]);
    expect(tabCounts(full, []).all).toBe(0);
    const shut = refusalGroups(full);
    expect(shut.map((group) => group.reason)).toEqual(['slots']);
    expect(shut[0]!.note).toBe(NO_ROUTE_CAPACITY);
    // The reducer agrees, which is the half a sheet cannot fake.
    const again = applyCommand(state, { type: 'buyRoute', playerId: 0, ...command });
    expect(again.ok).toBe(false);
    const second = state.units.find((u) => u.type === 'trader' && u.id !== trader.id);
    expect(second).toBeUndefined();

    // 6. Both towns show the route, and the destination is the one that is
    //    paid (2026-08-27: the origin's buildings set the figure, the
    //    destination banks it).
    expect(cityRouteRows(state, home)[0]!.outbound).toBe(true);
    expect(cityRouteRows(state, partner)[0]!.outbound).toBe(false);
    expect(cityRouteRows(state, partner)[0]!.text).toMatch(/🌾/);

    // 7. A few turns of walking. The clock counts down by subtraction, the road
    //    goes under the caravan, and the towns eventually join up.
    const before = routeReading(state, trader)!.turnsLeft;
    for (let turn = 0; turn < 14; turn++) resolve(state);
    const walking = routeReading(state, trader);
    // Either it is still running (the usual case) or it lapsed and came home —
    // both are correct, and the panel must not throw on either.
    if (walking) expect(walking.turnsLeft).toBeLessThan(before);
    expect(unitById(state, trader.id)).toBeDefined();
    expect(state.map.tiles.some((tile) => tile.road === 0)).toBe(true);

    // 8. The treasury's ledger: at most the four empire lines, each of them a
    //    count and a total, and whatever it says is inside the headline the top
    //    bar promises. Stated as a *difference* rather than as a subtraction of
    //    the whole fold: since maintenance landed (Entry XLI) tearing up the
    //    roads no longer removes every line, and what is actually claimed is
    //    that a change to these lines moves the headline by exactly that much.
    const fold = (): number =>
      explainEmpireGold(state, 0).reduce((sum, line) => sum + line.gold, 0);
    const lines = explainEmpireGold(state, 0);
    expect(lines.length).toBeLessThanOrEqual(4);
    for (const line of lines) {
      expect(line.source).toMatch(
        /^(City connections|Road maintenance|Unit maintenance|Building maintenance) · /,
      );
    }
    const empireBefore = fold();
    const shown = readEmpire(state, 0).totals.gold;
    for (const tile of state.map.tiles) delete tile.road;
    // A hand mutation with no command behind it: the readings are memoised on
    // the state's revision (batch E2), so the bench announces the change the
    // way a command would.
    bumpRevision(state);
    expect(shown - readEmpire(state, 0).totals.gold).toBe(empireBefore - fold());
  });
});
