import { describe, expect, it } from 'vitest';
import { valueContext } from '../../src/ai/bot';
import { pendingDealRefusal, readDealRefusal, rememberDealRefusal } from '../../src/ai/dealMemory';
import { answerProposal, counterTerms, diplomacyDecision } from '../../src/ai/diplomacy';
import { availableCopies, committedCopies, foundCityAt, resourceCopies } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type DealTerms, openDeal } from '../../src/sim/deals';
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

describe('strategic counteroffers and refusals', () => {
  it('keeps both strategic terms when adding gold and leaves the original offer intact', () => {
    const state = partners(2, 2);
    const giver = state.players[0]!;
    const recipient = state.players[1]!;
    giver.gold = 1000;
    recipient.gold = 1000;
    const give: DealTerms = { strategics: ['iron'] };
    const take: DealTerms = { strategics: ['horses'], gold: 10 };
    const counter = counterTerms(state, 1, 0, give, take, valueContext(state, recipient));
    expect(counter).not.toBeNull();
    expect(counter!.give.strategics).toEqual(['iron']);
    expect(counter!.take.strategics).toEqual(['horses']);
    expect(counter!.give.strategics).not.toBe(give.strategics);
    expect(counter!.take.strategics).not.toBe(take.strategics);
    expect(counter!.give.gold).toBeGreaterThan(0);
    expect(give.gold).toBeUndefined();
    expect(applyCommand(state, {
      type: 'proposeDeal', playerId: 0, targetId: 1, give: counter!.give, take: counter!.take,
    }).ok).toBe(true);
  });

  it('pays the existing resource price for a copy its army needs and declines a spare at that price', () => {
    const state = partners(4, 2);
    const buyer = state.players[1]!;
    buyer.gold = 1000;
    openDeal(state, 91, 0, 1, { strategics: ['iron'] }, {});
    bumpRevision(state);
    const price = valueContext(state, buyer).ai.war.luxuryGoldBaseline;
    const proposal = applyCommand(state, { type: 'proposeDeal', playerId: 0, targetId: 1,
      give: { strategics: ['iron'] }, take: { gold: price } });
    expect(proposal.ok, JSON.stringify(proposal)).toBe(true);
    const row = state.dealProposals[0]!;
    const answer = () => answerProposal(state, buyer, row, valueContext(state, buyer)).command.type;
    expect(availableCopies(state, 1, 'iron')).toBe(1);
    expect(answer()).toBe('declineDeal');
    createUnit(state, 1, 'longswordsman', 12, 4);
    bumpRevision(state);
    expect(availableCopies(state, 1, 'iron')).toBe(0);
    expect(answer()).toBe('acceptDeal');
  });

  it('remembers only the refused strategic terms and reconsiders when military commitments change', () => {
    const state = partners(2, 2);
    state.players[0]!.gold = 10;
    const give: DealTerms = { strategics: ['iron'], gold: 1 };
    const take: DealTerms = { strategics: ['horses'] };
    expect(applyCommand(state, { type: 'proposeDeal', playerId: 0, targetId: 1, give, take }).ok).toBe(true);
    const decline = { type: 'declineDeal', playerId: 1, dealId: state.dealProposals[0]!.id } as const;
    const pending = pendingDealRefusal(state, decline);
    expect(pending).not.toBeNull();
    expect(applyCommand(state, decline).ok).toBe(true);
    rememberDealRefusal(state, pending!);
    const read = (offer: DealTerms, ask: DealTerms) => readDealRefusal(state, 0, 1, offer, ask, 10);
    expect(read(give, take)).toEqual({ refusedTurn: state.turn, sweetenedTurn: state.turn });
    expect(read({ ...give, gold: 2 }, take)).toEqual({ refusedTurn: null, sweetenedTurn: state.turn });
    expect(read({ gold: 1, strategics: ['obsidian'] }, take)).toEqual({ refusedTurn: null, sweetenedTurn: null });
    expect(read(give, { strategics: ['obsidian'] })).toEqual({ refusedTurn: null, sweetenedTurn: null });
    state.cities[1]!.queue = [{ kind: 'unit', id: 'horseman' }];
    bumpRevision(state);
    expect(resourceCopies(state, 1, 'horses')).toBe(2);
    expect(availableCopies(state, 1, 'horses')).toBe(1);
    expect(read(give, take)).toEqual({ refusedTurn: null, sweetenedTurn: null });
  });
});
