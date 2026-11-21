import { describe, expect, it } from 'vitest';
import { valueContext } from '../../src/ai/bot';
import { diplomacyDecision } from '../../src/ai/diplomacy';
import { availableCopies, committedCopies, foundCityAt, resourceCopies } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { createMap, getTileAt } from '../../src/sim/map';
import { bumpRevision, createUnit, type GameState } from '../../src/sim/state';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

function partners(iron: number, horses: number) {
  const state = newGame({
    seed: 17, sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
      { name: 'Cleo', color: '#0aa' },
    ],
  });
  state.map = createMap({ width: 30, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  const sources = [['iron', iron], ['horses', horses], ['obsidian', 2]] as const;
  for (const [seat, [id, copies]] of sources.entries()) {
    const player = state.players[seat]!;
    player.techsResearched.push('mining', 'bronzePanoply', 'husbandry');
    const tile = getTileAt(state.map, 3 + seat * 9, 4)!;
    tile.resource = id;
    tile.resourceCopies = copies;
    foundCityAt(state, seat, tile);
  }
  recomputeAllVisibility(state);
  bumpRevision(state);
  return state;
}

/** Ask both sides of a proposed swap. This is the normal bot driver's policy. */
function decision(state: GameState, seat = 0) {
  const player = state.players[seat]!;
  return diplomacyDecision(state, player, valueContext(state, player), true)?.command;
}

describe('bot trades of strategic resources', () => {
  it('offers a spare strategic for a missing strategic, reserves its last copy, and signs the legal swap', () => {
    const state = partners(2, 2);
    const offer = decision(state);
    expect(offer).toMatchObject({ type: 'proposeDeal', playerId: 0, give: { strategics: ['iron'] } });
    if (offer?.type !== 'proposeDeal') throw new Error('Expected a swap');
    const received = offer.take.strategics![0]!;
    expect(received).toBe(offer.targetId === 1 ? 'horses' : 'obsidian');
    expect(applyCommand(state, offer).ok).toBe(true);
    // Two potential partners, but only one uncommitted copy to offer.
    expect(decision(state)?.type).not.toBe('proposeDeal');
    const accept = decision(state, offer.targetId);
    expect(accept?.type).toBe('acceptDeal');
    expect(applyCommand(state, accept!).ok).toBe(true);
    expect(availableCopies(state, 0, 'iron')).toBe(1);
    expect(availableCopies(state, 0, received)).toBe(1);
  });

  it('keeps the remaining iron when a unit or a queued unit already uses one copy', () => {
    for (const queued of [false, true]) {
      const state = partners(2, 2);
      if (queued) state.cities[0]!.queue = [{ kind: 'unit', id: 'longswordsman' }];
      else createUnit(state, 0, 'longswordsman', 3, 4);
      bumpRevision(state);
      expect(resourceCopies(state, 0, 'iron')).toBe(2);
      expect(committedCopies(state, 0, 'iron')).toBe(1);
      expect(availableCopies(state, 0, 'iron')).toBe(1);
      expect(decision(state)?.type).not.toBe('proposeDeal');
    }
  });

  it('passes over a partner whose army uses its spare and asks another partner', () => {
    const state = partners(2, 2);
    createUnit(state, 1, 'horseman', 12, 4);
    bumpRevision(state);
    expect(availableCopies(state, 1, 'horses')).toBe(1);
    expect(decision(state)).toMatchObject({ type: 'proposeDeal', targetId: 2, take: { strategics: ['obsidian'] } });
  });
});
