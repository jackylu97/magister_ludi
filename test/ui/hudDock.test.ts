/**
 * The HUD dock's own pure fact: whether the Statecraft button's badge should
 * pulse. `hudBadgeWaiting` is a thin wrapper over `hasStatecraftOffer` (see
 * `src/sim/statecraft.ts`) that also answers the one question that function
 * cannot — what a missing player means — so it is covered here rather than
 * assumed. The DOM write itself (`createHudDock`'s `render`) is not, as with
 * every other UI pass: this suite has no jsdom.
 */

import { describe, expect, it } from 'vitest';
import { hudBadgeWaiting } from '../../src/ui/hudDock';
import { newGame, type Player } from '../../src/sim/state';

function playerFixture(): Player {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [{ name: 'A', color: '#a00', isHuman: true }],
  });
  const player = state.players[0];
  if (!player) throw new Error('no player');
  return player;
}

describe('hudBadgeWaiting', () => {
  it('is false for a fresh player with nothing drafted', () => {
    expect(hudBadgeWaiting(playerFixture())).toBe(false);
  });

  it('is false with no player to ask — an empty seat owes no decision', () => {
    expect(hudBadgeWaiting(undefined)).toBe(false);
  });

  it('is true while an Order draft is waiting', () => {
    const player = playerFixture();
    player.statecraft.pendingOrder = { options: [] };
    expect(hudBadgeWaiting(player)).toBe(true);
  });

  it('is true while a Doctrine draft is waiting', () => {
    const player = playerFixture();
    player.statecraft.pendingDoctrine = { options: [] };
    expect(hudBadgeWaiting(player)).toBe(true);
  });

  it('is true while a banked government is ready to be sworn', () => {
    const player = playerFixture();
    player.statecraft.pendingGovernment = { tier: 1, options: [] };
    expect(hudBadgeWaiting(player)).toBe(true);
  });

  it('agrees with hasStatecraftOffer, since it delegates rather than re-deriving', () => {
    const player = playerFixture();
    player.statecraft.pendingOrder = { options: [] };
    delete player.statecraft.pendingDoctrine;
    delete player.statecraft.pendingGovernment;
    expect(hudBadgeWaiting(player)).toBe(true);
    delete player.statecraft.pendingOrder;
    expect(hudBadgeWaiting(player)).toBe(false);
  });
});
