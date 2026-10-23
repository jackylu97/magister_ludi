/**
 * **Commerce batch T8: bots renew their trade routes.** The plan is "### T8"
 * in `docs/plans/commerce-themes-triage.md`; the user answered yes to item 8
 * of section 10 of `docs/plans/commerce-themes.md` on 2026-10-23.
 *
 * Pinned here:
 *
 *   · a running route that will not renew is set to renew (`setAutoResend`),
 *     the step after the caravan is sent or hired;
 *   · on the turn its term runs out, a route renews unless every route slot is
 *     in use and a different pair pays more than `score.routeLapseMultiple`
 *     times what the route pays if it renews; then the bot lets it lapse;
 *   · the knob decides, a free slot keeps the route, and only one route lapses
 *     at a time;
 *   · a renewed route is priced at its age, so Established Routes keeps an old
 *     road that the same board would otherwise let lapse;
 *   · a route that has lapsed, with its caravan walking home, is left alone;
 *   · every command is accepted by the reducer, and every candidate's score is
 *     the fold of its terms.
 */

import { describe, expect, it } from 'vitest';

import { type BotDecision, botSitting, nextBotDecision } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { foldTerms } from '../../src/ai/decision';

import { applyCommand } from '../../src/sim/commands';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { routeSlots, usedRouteSlots } from '../../src/sim/trade';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

// --- the bench -----------------------------------------------------------------

/** A blank grassland board with two seats and nothing on it. */
function bench(): GameState {
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
  return state;
}

/**
 * Seat 0 on turn 40 with a town for each entry of `populations`, six hexes
 * apart along one row. The first town is the capital and holds a market, so
 * the seat has one route slot. Each town builds a warrior, so no town asks
 * for orders.
 */
function board(populations: readonly number[], cards: readonly string[] = []): {
  state: GameState;
  towns: City[];
} {
  const state = bench();
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
  const player = playerById(state, 0)!;
  // A purse, so the arrears arm (`disbandCommand`) stays out of every test.
  player.gold = 500;
  for (const card of cards) {
    player.statecraft.orders.push(card as OrderId);
    player.statecraft.slots.push({ card: card as OrderId, sealedUntil: state.turn });
  }
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, towns };
}

/**
 * Sends a caravan from `from` to `to` through the reducer, then dates the
 * route: it started `age` turns ago and its term runs out `left` turns from
 * now (0 is this turn). `renews` is its `autoResend`.
 */
function caravan(
  state: GameState,
  from: City,
  to: City,
  options: { age: number; left: number; renews: boolean },
): Unit {
  const cart = createUnit(state, 0, 'trader', from.col, from.row);
  const sent = applyCommand(state, {
    type: 'startRoute',
    playerId: 0,
    unitId: cart.id,
    fromCityId: from.id,
    toCityId: to.id,
    mode: 'land',
  });
  expect(sent.ok, sent.ok ? '' : sent.error).toBe(true);
  cart.trade!.startedTurn = state.turn - options.age;
  cart.trade!.expiresTurn = state.turn + options.left;
  cart.trade!.autoResend = options.renews;
  bumpRevision(state);
  return cart;
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

/** The renewal decisions among `taken`, in the order they were sent. */
function renewals(taken: readonly BotDecision[]): BotDecision[] {
  return taken.filter((decision) => decision.command.type === 'setAutoResend');
}

/** Every candidate of a decision scores the fold of its own terms. */
function expectFolds(decision: BotDecision): void {
  for (const candidate of decision.candidates) {
    expect(candidate.score, candidate.label).toBe(foldTerms(candidate.terms));
  }
}

// --- the step after the hire ----------------------------------------------------

describe('a running route is set to renew', () => {
  it('sets a caravan it has just sent to renew', () => {
    const { state, towns } = board([6, 4]);
    const cart = createUnit(state, 0, 'trader', towns[0]!.col, towns[0]!.row);
    bumpRevision(state);

    const taken = sit(state);
    const sent = taken.findIndex((decision) => decision.command.type === 'startRoute');
    expect(sent).toBeGreaterThanOrEqual(0);
    const set = renewals(taken);
    expect(set).toHaveLength(1);
    const renewal = set[0]!;
    expect(taken.indexOf(renewal)).toBeGreaterThan(sent);
    expect(renewal.kind).toBe('unitOrder');
    expect(renewal.command).toEqual({ type: 'setAutoResend', playerId: 0, unitId: cart.id, on: true });
    expectFolds(renewal);
    expect(cart.trade?.autoResend).toBe(true);
  });

  it('sets a hired caravan to renew on the next step', () => {
    const { state, towns } = board([6, 4]);
    // The hire, as the want book sends it (`routeDecision`). The caravan's id
    // is known only once the reducer has run.
    const hired = applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: towns[0]!.id,
      toCityId: towns[1]!.id,
      mode: 'land',
    });
    expect(hired.ok, hired.ok ? '' : hired.error).toBe(true);
    const cart = state.units.find((unit) => unit.trade !== undefined)!;
    expect(cart.trade!.autoResend).toBe(false);

    const set = renewals(sit(state));
    expect(set.map((decision) => decision.command)).toEqual([
      { type: 'setAutoResend', playerId: 0, unitId: cart.id, on: true },
    ]);
    expect(cart.trade!.autoResend).toBe(true);
  });

  it('says nothing more once every route is set to renew', () => {
    const { state, towns } = board([6, 4]);
    caravan(state, towns[0]!, towns[1]!, { age: 5, left: 15, renews: true });
    expect(renewals(sit(state))).toEqual([]);
  });
});

// --- the turn the term runs out ---------------------------------------------------

describe('on the turn a route\'s term runs out', () => {
  /**
   * One slot, in use by a route from the capital to a small town that pays a
   * little. The third town is large, so a route from the capital to it would
   * pay much more: the best pair a freed slot would open.
   */
  function outbid(cards: readonly string[] = []): { state: GameState; cart: Unit; towns: City[] } {
    const { state, towns } = board([6, 4, 14], cards);
    const cart = caravan(state, towns[0]!, towns[1]!, { age: 20, left: 0, renews: true });
    expect(usedRouteSlots(state, 0)).toBe(routeSlots(state, 0));
    return { state, cart, towns };
  }

  it('lets the route lapse when a different pair pays more than the multiple', () => {
    const { state, cart, towns } = outbid();
    const set = renewals(sit(state));
    expect(set).toHaveLength(1);
    const lapse = set[0]!;
    expect(lapse.command).toEqual({ type: 'setAutoResend', playerId: 0, unitId: cart.id, on: false });
    expect(lapse.kind).toBe('unitOrder');
    expectFolds(lapse);
    // Two rows: the renewal, and the pair it gives way to, which won.
    const [renew, instead] = lapse.candidates;
    expect(renew!.chosen).toBe(false);
    expect(instead!.chosen).toBe(true);
    expect(instead!.label).toContain(towns[2]!.name);
    expect(instead!.score).toBeGreaterThan(renew!.score);
    expect(cart.trade!.autoResend).toBe(false);
  });

  it('renews the same route when the multiple is larger than the gap', () => {
    withAiTuning({ score: { routeLapseMultiple: 1000 } }, () => {
      const { state, cart } = outbid();
      expect(renewals(sit(state))).toEqual([]);
      expect(cart.trade!.autoResend).toBe(true);
    });
  });

  it('renews a route that was never set to renew, and says why', () => {
    withAiTuning({ score: { routeLapseMultiple: 1000 } }, () => {
      const { state, cart } = outbid();
      cart.trade!.autoResend = false;
      bumpRevision(state);
      const set = renewals(sit(state));
      expect(set.map((decision) => decision.command)).toEqual([
        { type: 'setAutoResend', playerId: 0, unitId: cart.id, on: true },
      ]);
      expectFolds(set[0]!);
      expect(set[0]!.summary).toContain('not more than 1000 times');
      expect(cart.trade!.autoResend).toBe(true);
    });
  });

  it('keeps the route while a route slot is free', () => {
    const { state, cart, towns } = outbid();
    // A second market opens a second slot, and the purse is empty, so the want
    // book cannot fill it this turn.
    towns[1]!.buildings.push('market');
    playerById(state, 0)!.gold = 60;
    bumpRevision(state);
    expect(usedRouteSlots(state, 0)).toBeLessThan(routeSlots(state, 0));
    const set = renewals(sit(state));
    expect(set.filter((decision) => (decision.command as { on: boolean }).on === false)).toEqual([]);
    expect(cart.trade!.autoResend).toBe(true);
  });

  it('lets only one route lapse for the one slot it frees', () => {
    const { state, towns } = board([6, 4, 14]);
    // Two slots, both in use by routes that pay little, and both due.
    towns[1]!.buildings.push('market');
    bumpRevision(state);
    const first = caravan(state, towns[0]!, towns[1]!, { age: 20, left: 0, renews: true });
    const second = caravan(state, towns[1]!, towns[0]!, { age: 20, left: 0, renews: true });
    expect(usedRouteSlots(state, 0)).toBe(routeSlots(state, 0));

    const set = renewals(sit(state));
    expect(set.map((decision) => decision.command)).toEqual([
      { type: 'setAutoResend', playerId: 0, unitId: first.id, on: false },
    ]);
    expect(first.trade!.autoResend).toBe(false);
    expect(second.trade!.autoResend).toBe(true);
  });

  it('leaves a lapsed route alone while its caravan walks home', () => {
    const { state, towns } = board([6, 4, 14]);
    const cart = caravan(state, towns[0]!, towns[1]!, { age: 23, left: -3, renews: false });
    expect(renewals(sit(state))).toEqual([]);
    expect(cart.trade!.autoResend).toBe(false);
  });
});

// --- Established Routes -------------------------------------------------------------

describe('a renewed route is priced at its age', () => {
  /**
   * A due route from the capital to a large town, old enough for any age a
   * card asks for, on one slot. The third town is larger again, so it is the
   * pair a freed slot would open. Sits seat 0 once and hands back the
   * renewal it printed, if any, and whether the route will renew.
   */
  function dueRoad(cards: readonly string[], multiple: number, renews: boolean) {
    return withAiTuning({ score: { routeLapseMultiple: multiple } }, () => {
      const { state, towns } = board([6, 14, 24], cards);
      const cart = caravan(state, towns[0]!, towns[1]!, { age: 60, left: 0, renews });
      const set = renewals(sit(state));
      for (const decision of set) expectFolds(decision);
      return { decision: set[0], on: cart.trade!.autoResend };
    });
  }

  /** The renewal the bot prints for a due route it had not set, where every route renews. */
  function printed(cards: readonly string[]): BotDecision {
    const { decision, on } = dueRoad(cards, 1000, false);
    expect(on).toBe(true);
    return decision!;
  }

  it('adds what Established Routes pays an old road to the renewal', () => {
    const plain = printed([]).candidates[0]!;
    const kept = printed(['establishedRoutes']).candidates[0]!;
    expect(plain.terms.some((term) => term.label.startsWith('what a road kept up'))).toBe(false);
    expect(kept.terms.some((term) => term.label.startsWith('what a road kept up'))).toBe(true);
    expect(kept.score).toBeGreaterThan(plain.score);
  });

  it('keeps an old road with the card that the same board lets lapse without it', () => {
    // Read the figures where every route renews, then pick a multiple between
    // the two ratios of the rival's pay to the road's.
    const plain = printed([]);
    const carded = printed(['establishedRoutes']);
    const rivalPay = (decision: BotDecision): number => decision.candidates[1]!.score * 1000;
    const plainRatio = rivalPay(plain) / plain.candidates[0]!.score;
    const cardRatio = rivalPay(carded) / carded.candidates[0]!.score;
    expect(cardRatio).toBeLessThan(plainRatio);
    const multiple = (plainRatio + cardRatio) / 2;
    expect(multiple).toBeGreaterThan(1);

    expect(dueRoad([], multiple, true).on).toBe(false);
    expect(dueRoad(['establishedRoutes'], multiple, true).on).toBe(true);
  });
});
