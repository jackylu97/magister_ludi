/**
 * **The Forbidden City's chair** (bot pass 3, batch BP7; `docs/flags.md`
 * (ooooooo) P9). The user: *"please make sure to implement the forbidden
 * palace's additional wildcard slot"*.
 *
 * The row carries a `slotRider` in place of its deferred line, so whoever holds
 * the town it stands in has one more Wildcard chair. The chair follows the
 * stones: it opens when the wonder is finished, moves when the town changes hands,
 * and closes when the town is razed. A council that loses it is seated again as an
 * adoption seats it (`refitSlots`' `'reseat'`): a card that keeps its chair keeps
 * its seal, a card whose chair closed moves to a free chair that fits it, and a
 * card that fits no free chair returns to the collection with its progress.
 *
 * The council is the chiefdom's old typed three (`typedChiefdomInThisBlock`), so
 * the tests can tell a Wildcard chair from a typed one.
 */
import { describe, expect, it } from 'vitest';

import { buildingProductionCost, foundCityAt, settleProduction } from '../../src/sim/cities';
import { handOverCity } from '../../src/sim/combat';
import { applyCommand } from '../../src/sim/commands';
import { snapshotState } from '../../src/sim/game';
import { type GameMap, getTileAt } from '../../src/sim/map';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import {
  buildingOpensChairs,
  chairCount,
  describeCard,
  slotTypesOf,
  stripRefs,
} from '../../src/sim/statecraft';
import { ORDER_IDS, type OrderId, isBoon, isCharter, orderDef, orderType } from '../../src/sim/statecraftData';
import { typedChiefdomInThisBlock } from './chiefdomHelpers';
import { createGame } from './newGameHelpers';

const WONDER = 'forbiddenCity' as const;

function game() {
  return createGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8', isHuman: true },
    ],
  });
}

/** A town for a player on the tile one of its pieces stands on. */
function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

/** A second town for a player, on open land at least five hexes from every town. */
function secondTown(state: GameState, playerId: number): City {
  const map: GameMap = state.map;
  for (const tile of map.tiles) {
    if (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake' || tile.terrain === 'mountain') {
      continue;
    }
    const far = state.cities.every((city) => Math.abs(city.col - tile.col) + Math.abs(city.row - tile.row) >= 8);
    if (!far) continue;
    return foundCityAt(state, playerId, tile);
  }
  throw new Error('no open land for a second town');
}

/** Raises the wonder through the ordinary completion: the queue, the hammers, the settlement. */
function finish(state: GameState, city: City): void {
  city.queue = [{ kind: 'building', id: WONDER }];
  city.hammerBasket = buildingProductionCost(WONDER, state, city.ownerId);
  const done = settleProduction(state, city);
  expect(done?.name).toBe(orderName(WONDER));
  expect(city.buildings).toContain(WONDER);
}

function orderName(id: string): string {
  return id === WONDER ? 'The Forbidden City' : orderDef(id as OrderId).name;
}

/** Live Orders that may sit in a chair, of one type. */
function seatable(type: string): OrderId[] {
  return ORDER_IDS.filter((id) => {
    const def = orderDef(id);
    if (def.retired === true || isBoon(id) || isCharter(id) || def.commission !== undefined) return false;
    return orderType(id) === type;
  });
}

/** Puts a held card in a chair, through the command, so it carries the seal a real slotting leaves. */
function seat(state: GameState, playerId: number, card: OrderId, slotIndex: number): void {
  const player = playerById(state, playerId)!;
  if (!player.statecraft.orders.includes(card)) player.statecraft.orders.push(card);
  bumpRevision(state);
  const result = applyCommand(state, { type: 'slotOrder', playerId, cardId: card, slotIndex });
  expect(result.ok, String(result.ok ? '' : result.error)).toBe(true);
}

const cards = (state: GameState, playerId: number): (OrderId | null)[] =>
  playerById(state, playerId)!.statecraft.slots.map((slot) => slot?.card ?? null);

describe('the Forbidden City’s chair', () => {
  typedChiefdomInThisBlock();

  it('is a slotRider on the row, said in plain words, and no longer deferred', () => {
    expect(buildingOpensChairs(WONDER)).toBe(true);
    expect(buildingOpensChairs('theOracle')).toBe(false);
    expect(buildingOpensChairs('granary')).toBe(false);
    const words = describeCard(WONDER).map((clause) => stripRefs(clause.text));
    expect(words).toContain('you have one more wildcard chair');
    expect(describeCard(WONDER).some((clause) => clause.deferred)).toBe(false);
  });

  it('opens a Wildcard chair for its holder when the wonder is finished', () => {
    const g = game();
    const city = found(g.state, 0);
    found(g.state, 1);
    const sc = playerById(g.state, 0)!.statecraft;
    const before = sc.slots.length;
    expect(slotTypesOf(sc)).toEqual(['military', 'economic', 'wildcard']);
    finish(g.state, city);
    expect(sc.slots).toHaveLength(before + 1);
    expect(slotTypesOf(sc)).toEqual(['military', 'economic', 'wildcard', 'wildcard']);
    expect(chairCount(g.state, 0, sc.government)).toBe(before + 1);
    // The other seat's council is untouched.
    expect(playerById(g.state, 1)!.statecraft.slots).toHaveLength(before);
  });

  it('takes a card, and the chair is refused before the wonder stands with the state untouched', () => {
    const g = game();
    const city = found(g.state, 0);
    const [card] = seatable('wildcard');
    expect(card).toBeDefined();
    const player = playerById(g.state, 0)!;
    player.statecraft.orders.push(card!);
    bumpRevision(g.state);
    const last = player.statecraft.slots.length;
    const print = snapshotState(g.state);
    const refused = applyCommand(g.state, { type: 'slotOrder', playerId: 0, cardId: card!, slotIndex: last });
    expect(refused.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(print);

    finish(g.state, city);
    seat(g.state, 0, card!, last);
    expect(cards(g.state, 0)[last]).toBe(card);
  });

  it('moves to the new holder when the town changes hands', () => {
    const g = game();
    found(g.state, 0);
    found(g.state, 1);
    const town = secondTown(g.state, 0);
    finish(g.state, town);
    const before = playerById(g.state, 1)!.statecraft.slots.length;
    const holder = playerById(g.state, 0)!.statecraft.slots.length;
    handOverCity(g.state, town, 1);
    expect(playerById(g.state, 1)!.statecraft.slots).toHaveLength(before + 1);
    expect(playerById(g.state, 0)!.statecraft.slots).toHaveLength(holder - 1);
    expect(chairCount(g.state, 1, playerById(g.state, 1)!.statecraft.government)).toBe(before + 1);
  });

  it('seats the loser’s card in a free chair that fits it, and lifts only that card’s seal', () => {
    const g = game();
    found(g.state, 0);
    found(g.state, 1);
    const town = secondTown(g.state, 0);
    finish(g.state, town);
    const [wild] = seatable('wildcard');
    const [kept] = seatable('military');
    // The military chair holds a card that stays; the first Wildcard chair is free;
    // a Wildcard card sits in the wonder's chair, the last.
    seat(g.state, 0, kept!, 0);
    seat(g.state, 0, wild!, 3);
    const sc = playerById(g.state, 0)!.statecraft;
    const keptSeal = sc.slots[0]!.sealedUntil;
    expect(keptSeal).toBeGreaterThan(g.state.turn);
    sc.tallies.push({ card: wild!, count: 4 });

    handOverCity(g.state, town, 1);

    expect(cards(g.state, 0)).toEqual([kept, null, wild]);
    expect(sc.slots[0]!.sealedUntil).toBe(keptSeal);
    expect(sc.slots[2]!.sealedUntil).toBeLessThanOrEqual(g.state.turn);
    expect(sc.tallies.find((tally) => tally.card === wild)?.count).toBe(4);
  });

  it('seats an unsorted card in a typed chair before a card that fits nowhere returns', () => {
    const g = game();
    found(g.state, 0);
    found(g.state, 1);
    const town = secondTown(g.state, 0);
    finish(g.state, town);
    const [loose] = seatable('unsorted');
    expect(loose).toBeDefined();
    seat(g.state, 0, loose!, 3);
    handOverCity(g.state, town, 1);
    // The first free chair an unsorted card fits is the military one.
    expect(cards(g.state, 0)).toEqual([loose, null, null]);
  });

  it('returns a card that fits no free chair to the collection, with its progress', () => {
    const g = game();
    found(g.state, 0);
    found(g.state, 1);
    const town = secondTown(g.state, 0);
    finish(g.state, town);
    const [first, second] = seatable('wildcard');
    expect(second).toBeDefined();
    // Both Wildcard chairs are full and a Wildcard card fits no typed chair.
    seat(g.state, 0, first!, 2);
    seat(g.state, 0, second!, 3);
    const sc = playerById(g.state, 0)!.statecraft;
    const firstSeal = sc.slots[2]!.sealedUntil;
    sc.tallies.push({ card: second!, count: 7 });

    handOverCity(g.state, town, 1);

    expect(cards(g.state, 0)).toEqual([null, null, first]);
    expect(sc.slots[2]!.sealedUntil).toBe(firstSeal);
    expect(sc.orders).toContain(second);
    expect(sc.tallies.find((tally) => tally.card === second)?.count).toBe(7);
  });

  it('closes when the holder razes the town', () => {
    const g = game();
    found(g.state, 0);
    found(g.state, 1);
    const town = secondTown(g.state, 0);
    finish(g.state, town);
    handOverCity(g.state, town, 1);
    const sc = playerById(g.state, 1)!.statecraft;
    const held = sc.slots.length;
    const [card] = seatable('wildcard');
    seat(g.state, 1, card!, held - 1);
    const result = applyCommand(g.state, { type: 'razeCity', playerId: 1, cityId: town.id });
    expect(result.ok, String(result.ok ? '' : result.error)).toBe(true);
    expect(sc.slots).toHaveLength(held - 1);
    // The card moved to the free Wildcard chair.
    expect(cards(g.state, 1)[held - 2]).toBe(card);
  });

  it('reaches the same board byte for byte when the same steps are taken twice', () => {
    const play = (): string => {
      const g = game();
      found(g.state, 0);
      found(g.state, 1);
      const town = secondTown(g.state, 0);
      finish(g.state, town);
      const [first, second] = seatable('wildcard');
      seat(g.state, 0, first!, 2);
      seat(g.state, 0, second!, 3);
      handOverCity(g.state, town, 1);
      return snapshotState(g.state);
    };
    expect(play()).toBe(play());
  });
});
