/**
 * The HUD dock's own pure fact: whether the Statecraft button's badge should
 * pulse. `hudBadgeWaiting` is a thin wrapper over `hasStatecraftOffer` (see
 * `src/sim/statecraft.ts`) that also answers the one question that function
 * cannot — what a missing player means — so it is covered here rather than
 * assumed. The DOM write itself (`createHudDock`'s `render`) is not, as with
 * every other UI pass: this suite has no jsdom.
 */

import { describe, expect, it } from 'vitest';
import { hudBadgeWaiting, religionBadgeWaiting } from '../../src/ui/hudDock';
import { type Player } from '../../src/sim/state';
import { newGame } from '../sim/newGameHelpers';
import { uiSource } from './sourceHelpers';

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

describe('religionBadgeWaiting', () => {
  it('is false for a fresh player, and for no player at all', () => {
    expect(religionBadgeWaiting(playerFixture())).toBe(false);
    expect(religionBadgeWaiting(undefined)).toBe(false);
  });

  it('is true while a belief offer is waiting to be named', () => {
    const player = playerFixture();
    player.pantheon.pending = { options: [] };
    expect(religionBadgeWaiting(player)).toBe(true);
    delete player.pantheon.pending;
    expect(religionBadgeWaiting(player)).toBe(false);
  });

  it('is independent of Statecraft: the two doors answer for their own systems', () => {
    const player = playerFixture();
    player.statecraft.pendingOrder = { options: [] };
    expect(hudBadgeWaiting(player)).toBe(true);
    expect(religionBadgeWaiting(player)).toBe(false);
  });
});

/**
 * **Three doors since batch UX1.** Diplomacy, Trade and the standings left the
 * dock for the top bar's tabs (`topBar.ts`); the dock keeps the screens about
 * this empire until the empire panel replaces it (batch UX3). Read off the
 * source, as every DOM claim in this suite is.
 */
describe('the dock’s doors', () => {
  const dock = uiSource('hudDock.ts');

  it('builds Statecraft, Religion and Leader, and mounts all three in that order', () => {
    expect(dock).toContain("'hud-dock-statecraft'");
    expect(dock).toContain("'hud-dock-religion'");
    expect(dock).toContain("'hud-dock-leader'");
    expect(dock).toContain('container.append(statecraftButton, religionButton, leaderButton);');
  });

  it('has handed Diplomacy, Trade and the standings to the top bar', () => {
    for (const gone of ['diplomacyButton', 'tradeButton', 'standingsButton']) {
      expect(dock, gone).not.toContain(gone);
    }
    const main = uiSource('main.ts');
    for (const wired of [
      'hudDock.statecraftButton.addEventListener',
      'hudDock.religionButton.addEventListener',
      'hudDock.leaderButton.addEventListener',
    ]) {
      expect(main, wired).toContain(wired);
    }
  });

  it('names its container for what is in it', () => {
    expect(uiSource('index.html')).toContain(
      '<div id="hud-dock" class="hud-dock" role="group" aria-label="Statecraft, Religion and Leader"></div>',
    );
  });
});
