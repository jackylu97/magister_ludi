/**
 * **The card stamps and the chair reading, kept for a sitting** (bot batch BP15,
 * stage 2; `stampReadingOf` and `chairReading`, `src/ai/value.ts`).
 *
 * A context built for a sitting carries the sitting's key (`ValueContext.sitting`),
 * and every context made from it by a spread carries the same one. On it:
 *
 *   - a card's stamp is the one taken at its first ask in the sitting, though
 *     the economy clock moves; a context with no sitting reads afresh, as before;
 *   - a kept stamp whose chair another card has taken since is read again;
 *   - the chair reading is read once, and every context of the sitting takes it.
 *
 * This changes play a little, which the section "BP15" of
 * `docs/plans/performance-pass-2026-11-06.md` describes.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { driveBots } from '../../src/ai/driver';
import { cardStampChair, explainCardStamp, extraChairsWorth } from '../../src/ai/value';
import { type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { isOrderId } from '../../src/sim/statecraftData';
import { cardsToPrice } from './aiCardStampHelpers';
import { playedGameFixture } from './grownGameHelpers';
import { createGame } from './newGameHelpers';
import { found, game as councilGame } from './statecraftHelpers';

const played = playedGameFixture(() => {
  const game = createGame({
    seed: 20260831,
    sizeName: 'duel',
    players: ['A', 'B', 'C', 'D'].map((name, index) => ({
      name,
      color: ['#d4502e', '#1f8a85', '#6a4c93', '#c9a227'][index]!,
    })),
    barbarians: true,
  });
  while (game.state.turn <= 30) driveBots(game, { warn: () => {} });
  return game;
});

/** A sitting's context for a seat, and one built with no sitting. */
function contexts(state: GameState, player: Player) {
  return { sat: valueContext(state, player, undefined, { seat: player.id }), plain: valueContext(state, player) };
}

describe('the card stamps kept for a sitting (bot batch BP15)', () => {
  it('keeps a card’s first stamp in the sitting across a write, and a context with no sitting reads afresh', () => {
    const game = played();
    const state = game.state;
    const player = playerById(state, 0)!;
    const town = state.cities.find((city) => city.ownerId === 0)!;
    const ids = cardsToPrice(state, player);
    expect(ids.length).toBeGreaterThan(0);
    const { sat } = contexts(state, player);
    const first = new Map(ids.map((id) => [id, JSON.stringify(explainCardStamp(sat, id))]));
    // A write that moves what many cards pay: the town grows by four citizens.
    town.population += 4;
    town.largestSize = Math.max(town.largestSize ?? 0, town.population);
    bumpRevision(state);
    const after = contexts(state, player);
    let moved = 0;
    for (const id of ids) {
      expect(JSON.stringify(explainCardStamp(sat, id)), id).toBe(first.get(id));
      if (JSON.stringify(explainCardStamp(after.plain, id)) !== first.get(id)) moved += 1;
    }
    expect(moved, 'the write moved some stamps for a context with no sitting').toBeGreaterThan(0);
    // A new sitting is a new key, and reads the board as it stands.
    let fresh = 0;
    for (const id of ids) if (JSON.stringify(explainCardStamp(after.sat, id)) !== first.get(id)) fresh += 1;
    expect(fresh).toBe(moved);
  }, 120_000);

  it('reads a kept stamp again when another card has taken its chair', () => {
    const game = played();
    const state = game.state;
    for (const player of state.players.filter((seat) => !seat.barbarian)) {
      const sc = player.statecraft;
      const { sat } = contexts(state, player);
      const id = cardsToPrice(state, player).find((card) => {
        if (!isOrderId(card)) return false;
        const chair = cardStampChair(sat, card);
        return chair !== null && chair < sc.slots.length && sc.slots[chair] === null;
      });
      if (id === undefined) continue;
      const chair = cardStampChair(sat, id)!;
      const other = sc.orders.find((card) => card !== id && isOrderId(card));
      if (other === undefined) continue;
      sc.slots[chair] = { card: other, sealedUntil: state.turn } as never;
      bumpRevision(state);
      expect(cardStampChair(sat, id)).not.toBe(chair);
      return;
    }
    // No seat on this board had a card to test it with: say so rather than pass quietly.
    expect.fail('no seat held a card whose stamp named an empty chair');
  }, 120_000);
});

describe('the chair reading once a sitting (bot batch BP15)', () => {
  it('is read once, and every context of the sitting takes it', () => {
    const { state } = councilGame();
    found(state, 0);
    const player = playerById(state, 0)!;
    player.statecraft.orders = ['thePalaceSchool', 'theRoyalHousehold'];
    player.statecraft.slots.fill(null);
    bumpRevision(state);

    // Start the comparison at final prices. Building a context can itself price a chair at provisional prices.
    const plain = { ...valueContext(state, player) };
    const sat = { ...plain, sitting: { seat: player.id } };
    const prices = { ...plain.prices, culture: plain.prices.culture * 5 };
    const dearer = { ...sat, prices };
    const plainDearer = { ...plain, prices };
    const worth = extraChairsWorth(2, sat);
    expect(extraChairsWorth(2, dearer)).toBe(worth);
    // With no sitting each context reads its own, as before.
    expect(extraChairsWorth(2, plain)).toBe(worth);
    expect(worth).toBeGreaterThan(0);
    expect(extraChairsWorth(2, plainDearer)).toBeGreaterThan(worth);
  }, 120_000);
});
