/**
 * **How many trade routes meet a town** — the tally batch C5 added, and the
 * three Commerce cards plus one shared card that came live on it.
 *
 * The gap was small and it blocked four cards. A town could be asked whether a
 * trade route ended in it — a yes or a no — and could not be asked how many, or
 * anything at all about routes setting out. `countRoutesAt` (`routes.ts`) is the
 * one walk that answers both questions, and `CityScope`'s `routeEndsHere` is now
 * a threshold on it: a direction, an optional crossing, and `atLeast`/`atMost`.
 *
 * One walk matters more than it sounds. `Unit.trade` **is** the route, so every
 * question about routes at a town has to sweep the pieces; two sweeps with two
 * ideas of what counts is how the card that admits a town and the card that pays
 * it per route end up disagreeing. `CountKind`'s `foreignTradeRoutes` narrowed
 * to a town (The Cosmopolitan Court) asks the same function.
 *
 * "Paying", in the two card texts that use the word, means **active** — the
 * user's ruling of 2026-09-19. A lapsed route is inert but still sitting on its
 * cart until the shuttle tidies it, so `routeIsLive` is a real filter; there is
 * no second test behind the word and nothing here looks for one.
 *
 * The deck registers stay in `test/sim/decks/commerce.test.ts`. What is pinned
 * here is behaviour: the tally itself, the scope over it, and each card's own
 * arithmetic.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from './newGameHelpers';

import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { happinessOf } from '../../src/sim/meters';
import { countRoutesAt } from '../../src/sim/routes';
import {
  type City,
  type GameState,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import {
  cardCityCostDelta,
  cardRenownLines,
  cityScopeAdmits,
  describeCard,
  stripRefs,
} from '../../src/sim/statecraft';
import { type CardEffect, type OrderId, ORDER_IDS, orderDef } from '../../src/sim/statecraftData';
import type { UnitTypeId } from '../../src/sim/unitData';

const bench = () =>
  createGame({
    seed: 57,
    sizeName: 'duel',
    players: [
      { name: 'Musa', color: '#d4502e', isHuman: true, leader: 'mansaMusa' },
      { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
    ],
  });

/** A town for `owner`, `dx` hexes along from wherever its first piece stands. */
function plant(state: GameState, owner: number, dx: number): City {
  const seat = state.units.find((u) => u.ownerId === owner)!;
  const tile = getTileAt(state.map, seat.col + dx, seat.row);
  expect(tile, `no ground ${dx} hexes along`).toBeDefined();
  return foundCityAt(state, owner, tile!);
}

/** A cart carrying a live route from `from` to `to`, sent by the origin's owner. */
function send(state: GameState, from: City, to: City, turns = 30): void {
  const cart = createUnit(state, from.ownerId, 'trader' as UnitTypeId, from.col, from.row);
  cart.trade = {
    from: from.id,
    to: to.id,
    expiresTurn: state.turn + turns,
    startedTurn: state.turn,
    outbound: true,
    autoResend: false,
  };
}

/** Put a card in a chair, the way every other statecraft test does. */
function slot(state: GameState, playerId: number, card: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  sc.orders.push(card as OrderId);
  sc.slots.push({ card: card as OrderId, sealedUntil: state.turn });
  bumpRevision(state);
}

describe('the route tally', () => {
  it('counts by direction, by crossing, and never counts a lapsed route', () => {
    const g = bench();
    const home = plant(g.state, 0, 0);
    const second = plant(g.state, 0, 3);
    const abroad = plant(g.state, 1, 0);
    send(g.state, home, second);
    send(g.state, home, second);
    send(g.state, home, abroad);
    send(g.state, second, home);
    bumpRevision(g.state);

    // Three carts set out from the home town, two of them to another town of
    // the same empire and one across a border.
    expect(countRoutesAt(g.state, home, 'departing')).toBe(3);
    expect(countRoutesAt(g.state, home, 'departing', 'domestic')).toBe(2);
    expect(countRoutesAt(g.state, home, 'departing', 'international')).toBe(1);
    // And one comes back to it. Arriving and departing are the two ends of the
    // same walk, so the second town reads the mirror image.
    expect(countRoutesAt(g.state, home, 'arriving')).toBe(1);
    expect(countRoutesAt(g.state, second, 'arriving', 'domestic')).toBe(2);
    expect(countRoutesAt(g.state, second, 'departing')).toBe(1);
    // The foreign partner is counted for the cart that comes to it, whoever
    // sent it — the reading `routeEndsHere` has always taken.
    expect(countRoutesAt(g.state, abroad, 'arriving')).toBe(1);
    expect(countRoutesAt(g.state, abroad, 'departing')).toBe(0);

    // **A lapsed route is not a route.** The cart keeps its dead route until the
    // shuttle drops it, and nothing counts it in the meantime.
    for (const unit of g.state.units) {
      if (unit.trade !== undefined) unit.trade.expiresTurn = g.state.turn;
    }
    bumpRevision(g.state);
    expect(countRoutesAt(g.state, home, 'departing')).toBe(0);
    expect(countRoutesAt(g.state, second, 'arriving', 'domestic')).toBe(0);
  });

  it('reads the scope as a threshold, with "none" as its mirror', () => {
    const g = bench();
    const home = plant(g.state, 0, 0);
    const second = plant(g.state, 0, 3);
    const quiet = plant(g.state, 0, 6);
    send(g.state, home, second);
    bumpRevision(g.state);

    const admits = (city: City, scope: Parameters<typeof cityScopeAdmits>[2]): boolean =>
      cityScopeAdmits(g.state, city, scope, 0);
    // A row naming no threshold is the yes-or-no every card written before this
    // meant: one or more.
    expect(admits(second, { test: 'routeEndsHere' })).toBe(true);
    expect(admits(home, { test: 'routeEndsHere' })).toBe(false);
    expect(admits(home, { test: 'routeEndsHere', direction: 'departing' })).toBe(true);
    // The Home Market's threshold, before and after the second cart.
    const two = { test: 'routeEndsHere', crossing: 'domestic', atLeast: 2 } as const;
    expect(admits(second, two)).toBe(false);
    send(g.state, home, second);
    bumpRevision(g.state);
    expect(admits(second, two)).toBe(true);
    // The League of Cities' mirror: the towns nothing sets out from.
    const none = { test: 'routeEndsHere', direction: 'departing', atMost: 0 } as const;
    expect(admits(quiet, none)).toBe(true);
    expect(admits(home, none)).toBe(false);
    expect(admits(second, none)).toBe(true);
  });
});

describe('the four cards the tally opened', () => {
  it('The Home Market — two of your own carts, and the contentment paid once', () => {
    const g = bench();
    const home = plant(g.state, 0, 0);
    const second = plant(g.state, 0, 3);
    send(g.state, home, second);
    slot(g.state, 0, 'theHomeMarket');

    // One cart is not two, so nothing is paid yet.
    const alone = happinessOf(g.state, 0);
    send(g.state, home, second);
    bumpRevision(g.state);
    expect(happinessOf(g.state, 0) - alone).toBe(2);
    // A third cart to the same town pays nothing more: "once per city".
    send(g.state, home, second);
    bumpRevision(g.state);
    expect(happinessOf(g.state, 0) - alone).toBe(2);
  });

  it('The League of Cities and The Chartered Metropolis — what a town costs to hold', () => {
    const g = bench();
    const home = plant(g.state, 0, 0);
    const second = plant(g.state, 0, 3);
    const quiet = plant(g.state, 0, 6);
    send(g.state, home, second);
    slot(g.state, 0, 'theLeagueOfCities');

    // A town that sends a cart out is easier to hold; a town that sends none is
    // untouched by the discount and is the one the card's second sentence taxes.
    expect(cardCityCostDelta(g.state, home)).toBe(-1);
    expect(cardCityCostDelta(g.state, quiet)).toBe(0);

    slot(g.state, 0, 'theCharteredMetropolis');
    expect(cardCityCostDelta(g.state, home)).toBe(-1);
    send(g.state, home, second);
    send(g.state, home, quiet);
    bumpRevision(g.state);
    // Two cards reaching one town stack, which is what two deltas on one figure
    // have always done here: four charged and one taken off.
    expect(cardCityCostDelta(g.state, home)).toBe(3);
    // And the surcharge stops the turn the town drops below three. There is no
    // stored "qualified" flag — only the tally, asked again.
    const doomed = g.state.units.find((u) => u.trade?.from === home.id)!;
    delete doomed.trade;
    bumpRevision(g.state);
    expect(cardCityCostDelta(g.state, home)).toBe(-1);
  });

  it('The Cosmopolitan Court — renown counted per town, and capped per town', () => {
    const g = bench();
    const home = plant(g.state, 0, 0);
    const second = plant(g.state, 0, 3);
    const abroad = plant(g.state, 1, 0);
    for (const town of [home, second]) addBuilding(g.state, town, 'monument');
    slot(g.state, 0, 'theCosmopolitanCourt');

    const paid = (): number =>
      cardRenownLines(g.state, 0)
        .filter((line) => line.card === ('theCosmopolitanCourt' as OrderId))
        .reduce((sum, line) => sum + line.amount, 0);
    // No caravan abroad, no renown — and a domestic cart is not a foreign one.
    expect(paid()).toBe(0);
    send(g.state, home, second);
    bumpRevision(g.state);
    expect(paid()).toBe(0);

    // Five carts abroad out of one town pays three: the ceiling is **per town**,
    // which is the whole reason the trickle is counted town by town.
    for (let i = 0; i < 5; i += 1) send(g.state, home, abroad);
    bumpRevision(g.state);
    expect(paid()).toBe(3);
    // A second town earns its own three rather than sharing one allowance.
    for (let i = 0; i < 2; i += 1) send(g.state, second, abroad);
    bumpRevision(g.state);
    expect(paid()).toBe(5);

    // The class of town is the scope's, so a town with no culture building on
    // its shelf earns nothing however many carts it sends.
    const plain = plant(g.state, 0, 6);
    for (let i = 0; i < 3; i += 1) send(g.state, plain, abroad);
    bumpRevision(g.state);
    expect(paid()).toBe(5);
  });

  it('says what it does in trade-route words, never in road words', () => {
    const said = (id: string): string[] =>
      describeCard(id as OrderId).map((clause) => stripRefs(clause.text));
    expect(said('theHomeMarket')).toEqual([
      '+30% food in every city 2 or more trade routes of your own end at',
      '+30% production in every city 2 or more trade routes of your own end at',
      '+2 happiness in every city 2 or more trade routes of your own end at',
    ]);
    expect(said('theLeagueOfCities')).toEqual([
      '+23% production in every city a trade route sets out from',
      'the authority a city a trade route sets out from costs falls by 1',
      '-10% gold in every city no trade route sets out from',
    ]);
    expect(said('theCharteredMetropolis')).toEqual([
      '+38% food in every city 3 or more trade routes set out from',
      '+38% production in every city 3 or more trade routes set out from',
      '+38% culture in every city 3 or more trade routes set out from',
      'the authority a city 3 or more trade routes set out from costs rises by 4',
    ]);
    expect(said('theCosmopolitanCourt')).toEqual([
      '+1 renown per turn in every city with 1 or more culture buildings, ' +
        'per trade route to another empire leaving it, at most 3 per city',
      "+3 gold on every hex carrying a great person's work, in every city with 1 or more culture buildings",
    ]);
    // The three sentences the scope could already say are printed exactly as
    // they were, so no live card's words moved when the tally arrived.
    expect(said('theCaravanseraiNetwork')[0]).toBe(
      '+2 happiness in every city one of your own trade routes ends at',
    );
  });

  it('registers exactly which rows write the three things C5 declared', () => {
    const scopeOf = (effect: CardEffect): Record<string, unknown> | undefined =>
      (effect as { scope?: Record<string, unknown> }).scope;
    const writers = (match: (effect: CardEffect) => boolean): string[] =>
      ORDER_IDS.filter((id) => orderDef(id).effects.some(match)).slice().sort();

    // The direction, the threshold and the mirror — all three fields on the one
    // scope member, so a row wanting "how many set out from here" says it once.
    expect(
      writers((effect) => {
        const scope = scopeOf(effect);
        return scope?.test === 'routeEndsHere' && scope.direction === 'departing';
      }),
    ).toEqual(['theCharteredMetropolis', 'theLeagueOfCities']);
    expect(
      writers((effect) => {
        const scope = scopeOf(effect);
        return scope?.test === 'routeEndsHere' && scope.atLeast !== undefined;
      }),
    ).toEqual(['theCharteredMetropolis', 'theHomeMarket']);
    expect(
      writers((effect) => {
        const scope = scopeOf(effect);
        return scope?.test === 'routeEndsHere' && scope.atMost !== undefined;
      }),
    ).toEqual(['theLeagueOfCities']);

    // The renown trickle counted town by town, and the one count that takes the
    // town narrowing. Scientific batch S7's The Royal Tutors also counts town
    // by town: its count, science buildings, can only be asked of a town.
    expect(writers((effect) => effect.kind === 'renown' && effect.within === 'city')).toEqual([
      'theCosmopolitanCourt',
      'theRoyalTutors',
    ]);
    expect(
      writers(
        (effect) =>
          effect.kind === 'renown' &&
          effect.count === 'foreignTradeRoutes' &&
          effect.within === 'city',
      ),
    ).toEqual(['theCosmopolitanCourt']);
  });
});
