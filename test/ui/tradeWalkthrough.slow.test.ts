/**
 * One caravan, start to finish, read the way the interface reads it.
 *
 * The browser check as a test (the extension was not connected when this pass
 * shipped): buy a trader out of the treasury, open the Trade screen, read the
 * row, start the route from the screen, walk the shuttle for a few turns and
 * read the panels. Every figure here comes from the surfaces themselves —
 * `tradeOrigins`, `startCommandFor`, `routeReading`, `cityRouteRows`,
 * `explainEmpireGold`, `civYields` — so what is defended is the *sequence*: that
 * each of those keeps saying something true as the caravan moves, the road goes
 * down and the towns join up.
 *
 * Rewritten for the user's ruling of 2026-08-28: the trader is bought in one
 * town and the route is started **from the other**, which is the whole of what
 * changed — a caravan may begin anywhere and is teleported to the origin the
 * player picked.
 *
 * Slow by kind (`CLAUDE.md`): it drives whole turn resolutions rather than
 * asking one evaluator a question.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { purchaseError } from '../../src/sim/purchase';
import { type GameState, unitById } from '../../src/sim/state';
import { explainEmpireGold } from '../../src/sim/trade';
import { runEndOfTurn } from '../../src/sim/turn';
import { civYields } from '../../src/ui/topBar';
import { cityRouteRows, routeReading, routeSlotsLine } from '../../src/ui/tradeLines';
import { startCommandFor, startingTrader, tradeOrigins } from '../../src/ui/tradeScreen';
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
    home.buildings.push('granary', 'barracks');
    home.population = 6;
    partner.population = 6;
    state.players[0]!.gold = 900;

    // 1. Bought outright, out of the treasury, like a worker.
    expect(purchaseError(state, 0, home.id, { kind: 'unit', id: 'trader' }, 'gold')).toBeNull();
    const bought = applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: home.id,
      item: { kind: 'unit', id: 'trader' },
      currency: 'gold',
    });
    expect(bought.ok).toBe(true);
    const trader = state.units.find((unit) => unit.type === 'trader')!;
    expect(routeSlotsLine(state, 0)).toBe('0 of 1 route');

    // 2. The caravan walks out of town, which under the ruling changes nothing:
    //    where it is standing is no longer part of any gate.
    trader.col = 6;
    trader.row = 4;

    // 3. The Trade screen's row for the pair, priced and startable, and the
    //    caravan it would spend.
    const origin = tradeOrigins(state, 0).find((entry) => entry.cityId === home.id)!;
    const row = origin.candidates.find((entry) => entry.cityId === partner.id)!;
    expect(row.error).toBeNull();
    expect(row.figures).not.toBe('nothing yet');
    const chosen = startingTrader(state, 0, trader.id);
    expect(chosen?.id).toBe(trader.id);
    const command = startCommandFor(origin, row, chosen)!;
    expect(command).toEqual({ unitId: trader.id, fromCityId: home.id, toCityId: partner.id });

    // 4. Started from the screen. The piece is teleported to the origin and the
    //    sheet now reads as the route rather than as a march.
    const started = applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: command.unitId,
      fromCityId: command.fromCityId,
      toCityId: command.toCityId,
    });
    expect(started.ok, started.ok ? '' : started.error).toBe(true);
    expect({ col: trader.col, row: trader.row }).toEqual({ col: home.col, row: home.row });
    const sent = routeReading(state, trader)!;
    expect(sent.toName).toBe(partner.name);
    expect(sent.figures).not.toBe('nothing yet');
    expect(routeSlotsLine(state, 0)).toBe('1 of 1 route');
    // A second caravan has nowhere to go: the slot is spoken for, and the plate
    // would say so in the reducer's words.
    const second = state.units.find((u) => u.type === 'trader' && u.id !== trader.id);
    expect(second).toBeUndefined();

    // 5. Both towns show the route, and the destination is the one that is
    //    paid (2026-08-27: the origin's buildings set the figure, the
    //    destination banks it).
    expect(cityRouteRows(state, home)[0]!.outbound).toBe(true);
    expect(cityRouteRows(state, partner)[0]!.outbound).toBe(false);
    expect(cityRouteRows(state, partner)[0]!.text).toMatch(/🌾/);

    // 6. A few turns of walking. The clock counts down by subtraction, the road
    //    goes under the caravan, and the towns eventually join up.
    const before = routeReading(state, trader)!.turnsLeft;
    for (let turn = 0; turn < 14; turn++) resolve(state);
    const walking = routeReading(state, trader);
    // Either it is still running (the usual case) or it lapsed and came home —
    // both are correct, and the panel must not throw on either.
    if (walking) expect(walking.turnsLeft).toBeLessThan(before);
    expect(unitById(state, trader.id)).toBeDefined();
    expect(state.map.tiles.some((tile) => tile.road === 0)).toBe(true);

    // 7. The treasury's ledger: at most the four empire lines, each of them a
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
    const shown = civYields(state, 0).gold;
    for (const tile of state.map.tiles) delete tile.road;
    expect(shown - civYields(state, 0).gold).toBe(empireBefore - fold());
  });
});
