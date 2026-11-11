/**
 * **The bots and a trade route with no term** (batch TR2, `docs/flags.md`
 * (ggggggg), the user's ruling of 2026-11-10).
 *
 * This file replaces `aiRouteRenewal.test.ts`, which pinned Commerce batch T8:
 * the arm that set a bot's routes to renew and let one lapse for a better pair.
 * A route has no term now, so there is nothing to renew and that arm is gone.
 *
 * Pinned here:
 *
 *   · a bot sends an idle cart and its route keeps running past the old
 *     twenty-turn term;
 *   · no bot decision names the retired `setAutoResend` verb, and the bot never
 *     sends a cancel at all, so it cannot send one the new rule refuses;
 *   · the route row of the want book carries the simulation's stepped price:
 *     the base, plus a step for each route already running;
 *   · every command the bot sends is accepted by the reducer.
 */

import { describe, expect, it } from 'vitest';

import { type BotDecision, botSitting, nextBotDecision, valueContext } from '../../src/ai/bot';

import { applyCommand } from '../../src/sim/commands';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { routePrice } from '../../src/sim/purchase';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { startRouteAt, usedRouteSlots } from '../../src/sim/trade';
import { runEndOfTurn } from '../../src/sim/turn';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

// --- the bench -----------------------------------------------------------------

/**
 * Seat 0 on turn 40 on a blank grassland board, with a town for each entry of
 * `populations`, six hexes apart along one row. The first town is the capital
 * and holds a market, so the seat has one route slot. Each town builds a
 * warrior, so no town asks for orders.
 */
function board(populations: readonly number[]): { state: GameState; towns: City[] } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const towns: City[] = [];
  for (const [index, population] of populations.entries()) {
    const town = foundCityAt(state, 0, getTileAt(state.map, 3 + 6 * index, 5)!)!;
    town.population = population;
    town.queue = [{ kind: 'unit', id: 'warrior' }];
    refreshCityDerived(state, town);
    towns.push(town);
  }
  towns[0]!.buildings.push('market');
  state.turn = 40;
  // A purse, so the arrears arm (`disbandCommand`) stays out of every test.
  playerById(state, 0)!.gold = 500;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, towns };
}

/**
 * Asks seat 0 for its next decision and applies it, until it has nothing more
 * to say or `steps` run out. Every command must be accepted: a refused one is
 * a bug in the bot.
 */
function sit(state: GameState, steps = 60): BotDecision[] {
  const sitting = botSitting(0);
  const taken: BotDecision[] = [];
  for (let step = 0; step < steps; step++) {
    const decision = nextBotDecision(state, 0, sitting);
    if (decision === null) break;
    const result = applyCommand(state, decision.command);
    expect(result.ok, `${decision.kind}: ${result.ok ? '' : result.error}`).toBe(true);
    taken.push(decision);
  }
  return taken;
}

/** The commands the bot may not send since batch TR2. */
function routeVerbs(taken: readonly BotDecision[]): string[] {
  return taken
    .map((decision) => decision.command.type as string)
    .filter((type) => type === 'setAutoResend' || type === 'cancelRoute');
}

describe('a bot route with no term', () => {
  it('sends an idle cart, and the route keeps running past the old term', () => {
    const { state, towns } = board([6, 4]);
    const cart = createUnit(state, 0, 'trader', towns[0]!.col, towns[0]!.row);
    bumpRevision(state);

    const taken = sit(state);
    expect(taken.some((decision) => decision.command.type === 'startRoute')).toBe(true);
    expect(cart.trade).toBeDefined();
    expect(routeVerbs(taken)).toEqual([]);

    // Thirty resolutions, past the twenty-turn term the route used to have. The
    // route still runs, and each sitting along the way sends neither a renewal
    // nor a cancel.
    for (let turn = 0; turn < 30; turn++) {
      runEndOfTurn(state);
      state.turn += 1;
      bumpRevision(state);
      expect(routeVerbs(sit(state))).toEqual([]);
    }
    expect(cart.trade).toMatchObject({ from: towns[0]!.id, reached: true });
    expect(usedRouteSlots(state, 0)).toBe(1);
  });

  it('reads the stepped price on its route row, one step for each route running', () => {
    const { state, towns } = board([6, 4, 14]);
    // A second market, so a second route is open while the first runs.
    towns[1]!.buildings.push('market');
    const player = playerById(state, 0)!;
    player.gold = 5_000;
    bumpRevision(state);
    const first = valueContext(state, player).wants.gold.find((want) => want.route !== undefined);
    expect(first, 'the gold plan carries no route row').toBeDefined();
    expect(first!.price).toBe(RULES.trade.routePriceBase);

    // One route running: the row the bot reads is one step dearer, and it is
    // the simulation's own figure.
    const cart = createUnit(state, 0, 'trader', towns[0]!.col, towns[0]!.row);
    startRouteAt(state, cart, towns[0]!, towns[2]!, 'land');
    bumpRevision(state);
    const second = valueContext(state, player).wants.gold.find((want) => want.route !== undefined);
    expect(second, 'the gold plan carries no second route row').toBeDefined();
    expect(second!.price).toBe(RULES.trade.routePriceBase + RULES.trade.routePricePerRunningRoute);
    expect(second!.price).toBe(routePrice(state, player.id));
  });
});
