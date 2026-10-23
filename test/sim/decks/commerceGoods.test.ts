/**
 * **Commerce batch T5, goods and deals** (`docs/plans/commerce-themes-
 * triage.md`, feature D and readings 2, 20 to 24 and 42). The sheet's sync
 * test (`commerce.test.ts`) checks the six rows against the sheet. This file
 * checks what the batch built:
 *
 *   · feature D's two counts, the luxury copies an empire lends in its live
 *     deals and the empires it holds a live deal with, and the two cards that
 *     read them (Export Guilds, The Treaty Ports);
 *   · The Commenda: a lent copy still counts as half a copy for its lender,
 *     rounded down in the counts and Corner the Market's figure, at half value
 *     for a kind held only through lent copies, and never in the deal gate;
 *   · The Capitulations: a foreign town holding the empire's paying post lends
 *     it a luxury, after the routes' loans;
 *   · The Casa da Índia: every copy pays a luxury's flat yields, and nothing
 *     else counts twice;
 *   · Land Speculation: the `tilePurchase` moment carries the price and the
 *     hex, and a rider asks a tile test of the hex.
 */

import { describe, expect, it } from 'vitest';

import {
  availableCopies,
  countedLuxuries,
  countedLuxuryCopies,
  foundCityAt,
  resourceCopies,
} from '../../../src/sim/cities';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { commissionFigure } from '../../../src/sim/commissions';
import { type DealTerms, cancelDealsBetween, dealPartnerSeats, lentCopyCount, openDeal } from '../../../src/sim/deals';
import { improvementForResource } from '../../../src/sim/improvementData';
import { type Tile, tileIndex } from '../../../src/sim/map';
import { explainHappiness } from '../../../src/sim/meters';
import { type ResourceId, RESOURCE_IDS, resourceDef } from '../../../src/sim/resourceData';
import {
  cityResourceYields,
  empireResourceYields,
  importedLuxuries,
  lentLuxuriesKept,
  luxuryLoans,
  resourceHappiness,
} from '../../../src/sim/resourceEffects';
import { postTermTurns } from '../../../src/sim/routes';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import { cardAmplifier, cardYieldsOnlyAmplifier, countOf } from '../../../src/sim/statecraft/evaluator';
import { type CardPaysEffect, type OrderId, orderDef } from '../../../src/sim/statecraftData';
import { openWar } from '../../../src/sim/wars';
import { cityYieldPercents, explainCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { newGame } from '../newGameHelpers';

const EXPORT_GUILDS = 'exportGuilds' as OrderId;
const TREATY_PORTS = 'theTreatyPorts' as OrderId;
const COMMENDA = 'theCommenda' as OrderId;
const CAPITULATIONS = 'theCapitulations' as OrderId;
const CASA = 'theCasaDaIndia' as OrderId;
const LAND_SPECULATION = 'landSpeculation' as OrderId;

/** Seats an Order in a chair, which is what makes it live. */
function seat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Two empires at peace, one town each. */
function pair(): { state: GameState; home: City; partner: City } {
  const state = bareState(16, 9);
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const partner = foundCityAt(state, 1, at(state, 10, 4));
  bumpRevision(state);
  return { state, home, partner };
}

/**
 * Gives a town opened seams of one luxury: the resource on each hex, the work
 * that opens it, and the hex inside the town's borders.
 */
function seams(state: GameState, city: City, id: ResourceId, cells: [number, number][]): void {
  for (const [col, row] of cells) {
    const tile: Tile = at(state, col, row);
    tile.resource = id;
    const work = improvementForResource(id);
    if (work !== null) tile.improvement = work;
    state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  }
  bumpRevision(state);
}

let nextDeal = 1;

/** One live deal: `by` hands `give` to `to`, and takes nothing back. */
function lend(state: GameState, by: number, to: number, give: DealTerms): void {
  openDeal(state, nextDeal++, by, to, give, {});
  bumpRevision(state);
}

/** A counted row of the given count, for asking `countOf` directly. */
function counted(count: CardPaysEffect['count']): CardPaysEffect {
  return { kind: 'pays', where: 'empire', basis: 'count', count, to: 'gold', amount: 1 } as CardPaysEffect;
}

// --- feature D: the two counts ----------------------------------------------

describe('feature D: copies lent and deal partners', () => {
  it('counts each copy each live deal lends, and nothing lent to this empire', () => {
    const { state, home } = pair();
    seams(state, home, 'gems', [
      [2, 4],
      [4, 4],
    ]);
    seams(state, home, 'silk', [[3, 5]]);
    expect(lentCopyCount(state, 0)).toBe(0);
    lend(state, 0, 1, { luxuries: ['gems'] });
    lend(state, 0, 1, { luxuries: ['gems', 'silk'] });
    // A deal the other way lends this empire a copy, which is not a copy lent.
    lend(state, 1, 0, { goldPerTurn: 2 });
    expect(lentCopyCount(state, 0)).toBe(3);
    expect(countOf(state, 0, EXPORT_GUILDS, counted('copiesLent'))).toBe(3);
    expect(lentCopyCount(state, 1)).toBe(0);
    // A deal that has run out lends nothing.
    state.turn += 100;
    bumpRevision(state);
    expect(lentCopyCount(state, 0)).toBe(0);
  });

  it('counts each empire holding a live deal once, and a war ends the deals', () => {
    const state = newGame({
      seed: 5,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
        { name: 'C', color: '#0a0', isHuman: true },
      ],
    });
    state.wars = [];
    state.deals = [];
    expect(dealPartnerSeats(state, 0)).toEqual([]);
    lend(state, 0, 2, { goldPerTurn: 1 });
    lend(state, 1, 0, { openBorders: true });
    lend(state, 0, 1, { goldPerTurn: 3 });
    expect(dealPartnerSeats(state, 0)).toEqual([1, 2]);
    expect(countOf(state, 0, TREATY_PORTS, counted('dealPartners'))).toBe(2);
    expect(dealPartnerSeats(state, 2)).toEqual([0]);
    cancelDealsBetween(state, 0, 1);
    bumpRevision(state);
    expect(dealPartnerSeats(state, 0)).toEqual([2]);
  });

  it('pays Export Guilds into the capital for each copy lent', () => {
    const { state, home } = pair();
    seams(state, home, 'gems', [
      [2, 4],
      [4, 4],
    ]);
    seat(state, 0, EXPORT_GUILDS);
    const paid = (): { culture: number; production: number } => {
      const lines = explainCity(state, home).lines.filter((line) => line.card === EXPORT_GUILDS);
      return {
        culture: lines.reduce((sum, line) => sum + line.culture, 0),
        production: lines.reduce((sum, line) => sum + line.production, 0),
      };
    };
    expect(paid()).toEqual({ culture: 0, production: 0 });
    lend(state, 0, 1, { luxuries: ['gems'] });
    lend(state, 0, 1, { luxuries: ['gems'] });
    expect(paid()).toEqual({ culture: 8, production: 4 });
  });

  it('pays The Treaty Ports +5% production for each partner, on the city stage, at most +25%', () => {
    const { state, home } = pair();
    seat(state, 0, TREATY_PORTS);
    const percent = (): number =>
      cityYieldPercents(state, home)
        .filter((line) => line.card === TREATY_PORTS && line.yield === 'production')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent()).toBe(0);
    // Gold handed over at once leaves no row, so it makes no partner. Signed
    // through the two verbs, which decide whether a row is written.
    state.players[0]!.gold = 100;
    bumpRevision(state);
    const proposed = applyCommand(state, {
      type: 'proposeDeal',
      playerId: 0,
      targetId: 1,
      give: { gold: 40 },
      take: {},
    } as unknown as Command);
    expect(proposed.ok, proposed.ok ? '' : proposed.error).toBe(true);
    const id = state.dealProposals[0]!.id;
    expect(applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: id } as Command).ok).toBe(true);
    expect(state.deals).toEqual([]);
    expect(dealPartnerSeats(state, 0)).toEqual([]);
    expect(percent()).toBe(0);
    lend(state, 1, 0, { goldPerTurn: 2 });
    expect(percent()).toBe(5);
    expect(cityYieldPercents(state, home).find((line) => line.card === TREATY_PORTS)?.stage).toBe('city');
    const effect = orderDef(TREATY_PORTS).effects[0] as CardPaysEffect;
    expect([effect.percent, effect.max]).toEqual([5, 5]);
  });
});

// --- The Commenda -----------------------------------------------------------

describe('The Commenda', () => {
  /** Seat 0 holds `held` gems and lends `lent` of them, one deal a copy. */
  function lender(held: number, lent: number): { state: GameState; home: City; partner: City } {
    const { state, home, partner } = pair();
    const cells: [number, number][] = [
      [2, 4],
      [4, 4],
      [2, 3],
      [3, 3],
    ];
    seams(state, home, 'gems', cells.slice(0, held));
    for (let i = 0; i < lent; i++) lend(state, 0, 1, { luxuries: ['gems'] });
    return { state, home, partner };
  }

  it('reads one share of the card, clamped to a whole copy', () => {
    const { state } = lender(2, 2);
    expect(cardAmplifier(state, 0, 'lentLuxuryCopies')).toBe(0);
    seat(state, 0, COMMENDA);
    expect(cardAmplifier(state, 0, 'lentLuxuryCopies')).toBe(50);
  });

  it('counts half the lent copies, rounded down, for the cards and Corner the Market', () => {
    // Two lent of two: none kept, one counted.
    const both = lender(2, 2).state;
    expect(resourceCopies(both, 0, 'gems')).toBe(0);
    expect(countedLuxuries(both, 0)).not.toContain('gems');
    expect(countOf(both, 0, COMMENDA, counted('uniqueLuxuries'))).toBe(0);
    seat(both, 0, COMMENDA);
    expect(countedLuxuryCopies(both, 0, 'gems')).toBe(1);
    expect(countedLuxuries(both, 0)).toContain('gems');
    expect(countOf(both, 0, COMMENDA, counted('uniqueLuxuries'))).toBe(1);
    expect(countOf(both, 0, COMMENDA, counted('luxuryCopies'))).toBe(1);

    // One lent of one: half a copy rounds down to nothing.
    const one = lender(1, 1).state;
    seat(one, 0, COMMENDA);
    expect(countedLuxuryCopies(one, 0, 'gems')).toBe(0);
    expect(countedLuxuries(one, 0)).not.toContain('gems');

    // Three held, two lent: one kept and one counted, so a duplicate.
    const three = lender(3, 2).state;
    expect(countOf(three, 0, COMMENDA, counted('duplicateLuxuries'))).toBe(0);
    expect(commissionFigure(three, 0, 'luxuryCopies')).toBe(1);
    seat(three, 0, COMMENDA);
    expect(countedLuxuryCopies(three, 0, 'gems')).toBe(2);
    expect(countOf(three, 0, COMMENDA, counted('duplicateLuxuries'))).toBe(1);
    expect(commissionFigure(three, 0, 'luxuryCopies')).toBe(2);
  });

  it('leaves the deal gate alone, so a copy is never lent twice', () => {
    const { state } = lender(2, 2);
    const before = availableCopies(state, 0, 'gems');
    seat(state, 0, COMMENDA);
    expect(availableCopies(state, 0, 'gems')).toBe(before);
    expect(resourceCopies(state, 0, 'gems')).toBe(0);
  });

  it('holds a kind kept only through lent copies at half value', () => {
    const { state, home } = lender(2, 2);
    expect(lentLuxuriesKept(state, 0)).toEqual([]);
    const gemsHappiness = (): number =>
      explainHappiness(state, 0)
        .filter((line) => line.source.startsWith(resourceDef('gems').name))
        .reduce((sum, line) => sum + line.value, 0);
    expect(gemsHappiness()).toBe(0);
    seat(state, 0, COMMENDA);
    expect(lentLuxuriesKept(state, 0)).toEqual(['gems']);
    // The flat happiness at half, rounded down, with the word a player acts on.
    const line = explainHappiness(state, 0).find((entry) => entry.source === `${resourceDef('gems').name} · lent out`);
    expect(line?.value).toBe(2);
    // Each yield line at half: gems pay the empire 3 gold, and every city 2
    // gold from the third age (the bench knows every age).
    const empire = empireResourceYields(state, 0).filter((entry) => entry.resource === 'gems');
    expect(empire.map((entry) => entry.gold)).toEqual([1.5]);
    expect(empire[0]!.source).toContain('lent out');
    const town = cityResourceYields(state, home).filter((entry) => entry.resource === 'gems');
    expect(town.map((entry) => entry.gold)).toEqual([1]);
  });

  it('pays a kind it still keeps as before, and a per-copy line half for each lent copy', () => {
    const { state, home } = pair();
    seams(state, home, 'silver', [
      [2, 4],
      [4, 4],
      [2, 3],
      [3, 3],
    ]);
    lend(state, 0, 1, { luxuries: ['silver'] });
    lend(state, 0, 1, { luxuries: ['silver'] });
    const perCopy = (): number[] =>
      cityResourceYields(state, home)
        .filter((entry) => entry.resource === 'silver' && entry.food !== 0)
        .map((entry) => entry.food);
    expect(perCopy()).toEqual([2]);
    seat(state, 0, COMMENDA);
    // Two kept and half of each of the two lent: three copies.
    expect(perCopy()).toEqual([3]);
    // The kind is still held, so it is not on the kept list and pays its
    // ordinary flat happiness in full.
    expect(lentLuxuriesKept(state, 0)).toEqual([]);
    expect(explainHappiness(state, 0).some((entry) => entry.source.includes('lent out'))).toBe(false);
  });

  it('never holds a kind at a share twice when a road or a post already lends it', () => {
    const { state, partner } = lender(2, 2);
    at(state, 10, 4).resource = 'gems';
    partner.posts = [{ by: 0, since: state.turn - postTermTurns() }];
    bumpRevision(state);
    seat(state, 0, COMMENDA);
    seat(state, 0, CAPITULATIONS);
    expect(importedLuxuries(state, 0)).toEqual(['gems']);
    expect(lentLuxuriesKept(state, 0)).toEqual([]);
  });
});

// --- The Capitulations ------------------------------------------------------

describe('The Capitulations', () => {
  /** A foreign town on a wine seam, holding seat 0's established post. */
  function posted(): { state: GameState; home: City; partner: City } {
    const { state, home, partner } = pair();
    at(state, 10, 4).resource = 'wine';
    partner.posts = [{ by: 0, since: state.turn - postTermTurns() }];
    bumpRevision(state);
    return { state, home, partner };
  }

  it('lends nothing without the card, and the post town’s luxury with it', () => {
    const { state } = posted();
    expect(importedLuxuries(state, 0)).toEqual([]);
    seat(state, 0, CAPITULATIONS);
    expect(importedLuxuries(state, 0)).toEqual(['wine']);
    expect(luxuryLoans(state, 0)).toEqual([{ id: 'wine', via: 'post' }]);
    // The Silk Road's share on the meter, with the loan's own word.
    const line = explainHappiness(state, 0).find((entry) => entry.source === `${resourceDef('wine').name} · on loan`);
    expect(line?.value).toBe(2);
    // Wine's own happiness line, at half.
    const vintage = resourceHappiness(state, 0).filter((entry) => entry.resource === 'wine');
    expect(vintage.length).toBeGreaterThan(0);
    for (const entry of vintage) expect(entry.source).toContain('on loan');
  });

  it('lends nothing from a post that is not yet established, or not paying', () => {
    const { state, partner } = posted();
    seat(state, 0, CAPITULATIONS);
    partner.posts = [{ by: 0, since: state.turn - postTermTurns() + 1 }];
    bumpRevision(state);
    expect(importedLuxuries(state, 0)).toEqual([]);
    partner.posts = [{ by: 0, since: state.turn - postTermTurns() }];
    bumpRevision(state);
    expect(importedLuxuries(state, 0)).toEqual(['wine']);
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(importedLuxuries(state, 0)).toEqual([]);
  });

  it('never lends a kind the empire holds, and gives each post town its first new kind', () => {
    const { state, home, partner } = posted();
    seat(state, 0, CAPITULATIONS);
    seams(state, home, 'wine', [[2, 4]]);
    expect(importedLuxuries(state, 0)).toEqual([]);
    // A second foreign town with wine and silk: the first kind it has that
    // nobody else claimed.
    const far = foundCityAt(state, 1, at(state, 13, 6));
    at(state, 13, 6).resource = 'silk';
    seams(state, far, 'wine', [[14, 6]]);
    far.posts = [{ by: 0, since: state.turn - postTermTurns() }];
    bumpRevision(state);
    void partner;
    expect(luxuryLoans(state, 0)).toEqual([{ id: 'silk', via: 'post' }]);
  });
});

// --- The Casa da Índia --------------------------------------------------------

describe('The Casa da Índia', () => {
  it('is an amplifier narrowed to yields, which the ordinary reading drops', () => {
    const { state } = pair();
    seat(state, 0, CASA);
    expect(cardAmplifier(state, 0, 'luxuryDuplicates')).toBe(0);
    expect(cardYieldsOnlyAmplifier(state, 0, 'luxuryDuplicates')).toBe(100);
  });

  it('pays every copy its flat yields, and counts the happiness once a kind', () => {
    const { state, home } = pair();
    seams(state, home, 'gems', [
      [2, 4],
      [4, 4],
    ]);
    seams(state, home, 'wine', [
      [2, 3],
      [3, 3],
    ]);
    const gold = (): number[] =>
      empireResourceYields(state, 0)
        .filter((entry) => entry.resource === 'gems')
        .map((entry) => entry.gold);
    const happy = (): number =>
      explainHappiness(state, 0)
        .filter((entry) => entry.part === 'gain')
        .reduce((sum, entry) => sum + entry.value, 0);
    expect(gold()).toEqual([3]);
    const before = happy();
    seat(state, 0, CASA);
    expect(gold()).toEqual([6]);
    expect(empireResourceYields(state, 0).find((entry) => entry.resource === 'gems')?.source).toContain('×2 copies');
    // Wine's happiness and the flat happiness of every luxury: once a kind.
    expect(happy()).toBe(before);
  });

  it('does not count a per-copy row twice', () => {
    const { state, home } = pair();
    seams(state, home, 'silver', [
      [2, 4],
      [4, 4],
    ]);
    const lines = (): [number, number][] =>
      cityResourceYields(state, home)
        .filter((entry) => entry.resource === 'silver')
        .map((entry) => [entry.gold, entry.food]);
    expect(lines()).toEqual([
      [1, 0],
      [0, 2],
    ]);
    seat(state, 0, CASA);
    // The flat gold row pays each copy; the per-copy food row already did.
    expect(lines()).toEqual([
      [2, 0],
      [0, 2],
    ]);
  });
});

// --- Land Speculation ---------------------------------------------------------

describe('Land Speculation', () => {
  /** A capital with a full treasury, a held draft, and a frontier to buy. */
  function ready(): { state: GameState; home: City } {
    const state = bareState(16, 12);
    state.wars = [];
    const home = foundCityAt(state, 0, at(state, 5, 5));
    const player = state.players[0]!;
    player.gold = 1000;
    // A waiting draft keeps the culture in the pool.
    player.statecraft.pendingOrder = { options: ['marketDay' as OrderId] };
    bumpRevision(state);
    return { state, home };
  }

  /** Buys one hex through the verb; what it cost and what culture it paid. */
  function buy(state: GameState, home: City, col: number, row: number): { price: number; culture: number } {
    const player = state.players[0]!;
    const gold = player.gold;
    const culture = player.culturePool;
    const result = applyCommand(state, {
      type: 'purchaseTile',
      playerId: 0,
      cityId: home.id,
      col,
      row,
    } as Command);
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    const price = gold - player.gold;
    expect(price).toBeGreaterThan(0);
    return { price, culture: player.culturePool - culture };
  }

  it('is one rider on the hex bought, with culture of half the price', () => {
    const effects = orderDef(LAND_SPECULATION).effects;
    expect(effects).toEqual([
      {
        kind: 'windfallRider',
        occasion: 'tilePurchase',
        on: { test: 'hasResource' },
        grant: { yield: 'culture', amount: 0.5, fromOccasion: 'gold', whole: true },
      },
    ]);
  });

  it('pays half the price, rounded down, for a hex with a resource on it', () => {
    const { state, home } = ready();
    seat(state, 0, LAND_SPECULATION);
    at(state, 7, 5).resource = 'wheat' as ResourceId;
    bumpRevision(state);
    const { price, culture } = buy(state, home, 7, 5);
    expect(culture).toBe(Math.floor(price / 2));
    expect(culture).toBeGreaterThan(0);
  });

  it('pays nothing for a bare hex, or for a resource the empire cannot see', () => {
    const { state, home } = ready();
    seat(state, 0, LAND_SPECULATION);
    expect(buy(state, home, 7, 5).culture).toBe(0);
    const hidden = RESOURCE_IDS.find((id) => resourceDef(id).requiresTech !== undefined)!;
    const gate = resourceDef(hidden).requiresTech!;
    const player = state.players[0]!;
    player.techsResearched = player.techsResearched.filter((tech) => tech !== gate);
    at(state, 3, 5).resource = hidden;
    bumpRevision(state);
    expect(buy(state, home, 3, 5).culture).toBe(0);
  });

  it('pays nothing without the card', () => {
    const { state, home } = ready();
    at(state, 7, 5).resource = 'wheat' as ResourceId;
    bumpRevision(state);
    expect(buy(state, home, 7, 5).culture).toBe(0);
  });
});
