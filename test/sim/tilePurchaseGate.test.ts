/**
 * The tile purchase gate's two answers (batch UX7b): the refusal, and how much
 * gold is missing when gold is the only reason.
 *
 * `tilePurchaseGate` answers both from one pass through the gate's clauses, the
 * way `purchaseGate` does at the other counter, so the board's plates can say
 * "need 31" without reading the refusal's words. The gate must not change any
 * outcome: `tilePurchaseError` returns exactly the sentences it always did, in
 * the same order, which is what the first block holds still.
 *
 * `tileBuyingError` is the gate's town-wide half — the town, the puppet's purse
 * and the writ's freeze with its one lift — which the city screen's Buy tiles
 * button is greyed by. It used to be greyed whenever the borders were frozen,
 * so a seat holding Purchased Prosperity could not use the card from there.
 */

import { describe, expect, it } from 'vitest';

import {
  foundCityAt,
  purchasableTiles,
  tileBuyingError,
  tilePurchaseError,
  tilePurchaseGate,
  tilePurchasePrice,
  tilePurchaseShortfall,
} from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { bordersFrozen, meterEffects } from '../../src/sim/meters';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const FROZEN = 'Borders frozen — authority is overdrawn';

/** A town on a blank grassland board with a full purse, and a hex beside it it may buy. */
function ready(): { state: GameState; city: City; cell: { col: number; row: number } } {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 24, height: 18, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(24 * 18).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  const city = foundCityAt(state, 0, getTileAt(state.map, 8, 8)!);
  playerById(state, 0)!.gold = 1000;
  bumpRevision(state);
  return { state, city, cell: { col: 10, row: 8 } };
}

/** Founds towns far from the first until the writ is overdrawn and the borders freeze. */
function overdraw(state: GameState): void {
  let row = 1;
  while (!bordersFrozen(meterEffects(state, 0))) {
    foundCityAt(state, 0, getTileAt(state.map, state.map.width - 2, row)!);
    bumpRevision(state);
    row += 3;
    if (row >= state.map.height) throw new Error('ran out of board to over-extend on');
  }
}

/** Seats a card in seat 0's slots, as a held Order. */
function seat(state: GameState, card: string): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.orders.push(card as OrderId);
  sc.slots.push({ card: card as OrderId, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Every cell the gate is worth asking about here: the offers, owned ground, far ground, off the board. */
function cells(state: GameState, city: City): { col: number; row: number }[] {
  return [
    ...purchasableTiles(state, city).map(({ col, row }) => ({ col, row })),
    { col: city.col, row: city.row },
    { col: city.col + 1, row: city.row },
    { col: city.col + 9, row: city.row },
    { col: -5, row: -5 },
  ];
}

describe('the tile gate answers the refusal and the shortfall from one pass', () => {
  it('gives the refusal tilePurchaseError gives, and the shortfall tilePurchaseShortfall gives', () => {
    for (const purse of [1000, 0]) {
      const { state, city } = ready();
      playerById(state, 0)!.gold = purse;
      bumpRevision(state);
      for (const cell of cells(state, city)) {
        const gate = tilePurchaseGate(state, 0, city.id, cell);
        expect(gate.refusal).toBe(tilePurchaseError(state, 0, city.id, cell));
        expect(gate.shortfall).toBe(tilePurchaseShortfall(state, 0, city.id, cell));
      }
    }
  });

  it('says what the treasury lacks only when the treasury is the only refusal', () => {
    const { state, city, cell } = ready();
    const price = tilePurchasePrice(state, 0, city.id, cell);
    const player = playerById(state, 0)!;
    player.gold = price - 31;
    bumpRevision(state);
    expect(tilePurchaseGate(state, 0, city.id, cell)).toEqual({
      refusal: `Costs ${price} gold; you have ${price - 31}`,
      shortfall: 31,
    });
    player.gold = price;
    bumpRevision(state);
    expect(tilePurchaseGate(state, 0, city.id, cell)).toEqual({ refusal: null, shortfall: null });
    // Ground the town already owns is refused for that, however short the
    // purse is: more gold would not buy it.
    player.gold = 0;
    bumpRevision(state);
    expect(tilePurchaseGate(state, 0, city.id, { col: city.col + 1, row: city.row })).toEqual({
      refusal: `${city.name} already owns this tile`,
      shortfall: null,
    });
  });

  it('keeps every refusal in its old order: a hex’s own clauses before the freeze', () => {
    const { state, city } = ready();
    overdraw(state);
    // Owned ground still says it is owned, not that the borders are frozen.
    expect(tilePurchaseError(state, 0, city.id, { col: city.col + 1, row: city.row })).toBe(
      `${city.name} already owns this tile`,
    );
    expect(tilePurchaseError(state, 0, city.id, { col: -5, row: -5 })).toBe('No tile at (-5, -5)');
    // A hex the freeze is the only thing refusing says so, with no shortfall.
    const offers = purchasableTiles(state, city);
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) expect(offer).toMatchObject({ error: FROZEN, shortfall: null });
  });

  it('carries the shortfall on every offer the board draws', () => {
    const { state, city } = ready();
    playerById(state, 0)!.gold = 10;
    bumpRevision(state);
    const offers = purchasableTiles(state, city);
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(offer.shortfall).toBe(tilePurchaseShortfall(state, 0, city.id, offer));
      expect(offer.shortfall).toBe(offer.price - 10);
    }
    // Not vacuous the other way: the offers are not at the town's own hex.
    expect(offers.every((offer) => state.tileOwner[tileIndex(state.map, offer.col, offer.row)] === null)).toBe(true);
  });
});

describe('the town-wide half: may this town buy any tile now', () => {
  it('says nothing for an ordinary town', () => {
    const { state, city } = ready();
    expect(tileBuyingError(state, 0, city.id)).toBeNull();
  });

  it('refuses while the writ is overdrawn, unless Purchased Prosperity lifts the freeze', () => {
    const { state, city } = ready();
    overdraw(state);
    expect(tileBuyingError(state, 0, city.id)).toBe(FROZEN);
    seat(state, 'purchasedProsperity');
    expect(bordersFrozen(meterEffects(state, 0))).toBe(true);
    expect(tileBuyingError(state, 0, city.id)).toBeNull();
    // And the hexes themselves are on sale again, as the card says.
    expect(purchasableTiles(state, city).some((offer) => offer.error === null)).toBe(true);
  });

  it('refuses a puppet in the puppet’s own words', () => {
    const { state, city } = ready();
    city.puppet = true;
    bumpRevision(state);
    expect(tileBuyingError(state, 0, city.id)).toBe(
      `${city.name} is a puppet — a puppet spends nothing; annex it to invest`,
    );
  });
});
