import { describe, expect, it } from 'vitest';
import { dispatch } from '../../src/sim/game';
import { bumpRevision } from '../../src/sim/state';
import { offerNoticeLine, offerPaper, pendingCourtOffers } from '../../src/ui/diplomacyOffers';
import { uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

function fixture() {
  const game = createGame({ seed: 7, sizeName: 'duel', players: [
    { name: 'A', color: '#000000', isHuman: true },
    { name: 'B', color: '#ffffff', isHuman: true },
  ] });
  for (const p of game.state.players) { p.gold = 100; p.metSeats = [1 - p.id]; }
  bumpRevision(game.state);
  return game;
}

describe('nonblocking diplomatic reminders', () => {
  it('shows only incoming offers and follows accepted, declined and withdrawn papers', () => {
    const game = fixture();
    expect(dispatch(game, { type: 'proposeDeal', playerId: 1, targetId: 0, give: { gold: 10 }, take: {} }).ok).toBe(true);
    const incoming = pendingCourtOffers(game.state, 0);
    expect(incoming).toHaveLength(1); expect(incoming[0].by).toBe(1);
    expect(pendingCourtOffers(game.state, 1)).toEqual([]);
    let id = game.state.dealProposals[0].id;
    expect(dispatch(game, { type: 'acceptDeal', playerId: 0, dealId: id }).ok).toBe(true);
    expect(pendingCourtOffers(game.state, 0)).toEqual([]);
    for (const type of ['declineDeal', 'withdrawDeal'] as const) {
      dispatch(game, { type: 'proposeDeal', playerId: 1, targetId: 0, give: { gold: 10 }, take: {} });
      id = game.state.dealProposals[0].id;
      expect(dispatch(game, { type, playerId: type === 'declineDeal' ? 0 : 1, dealId: id }).ok).toBe(true);
      expect(pendingCourtOffers(game.state, 0)).toEqual([]);
    }
  });
  it('includes incoming peace, restores from state and does not change the turn', () => {
    const game = fixture();
    dispatch(game, { type: 'declareWar', playerId: 1, targetId: 0 });
    expect(dispatch(game, { type: 'proposePeace', playerId: 1, targetId: 0 }).ok).toBe(true);
    const before = JSON.stringify(game.state);
    expect(pendingCourtOffers(game.state, 0)).toEqual([{ key: 'peace-1', by: 1, kind: 'peace' }]);
    expect(pendingCourtOffers(game.state, 1)).toEqual([]);
    expect(pendingCourtOffers(JSON.parse(before), 0)).toEqual(pendingCourtOffers(game.state, 0));
    expect(JSON.stringify(game.state)).toBe(before);
    dispatch(game, { type: 'declinePeace', playerId: 0, targetId: 1 });
    expect(pendingCourtOffers(game.state, 0)).toEqual([]);
  });
  it('words each offer in one line of terms, and names the paper the sheet opens (batch SS6)', () => {
    const game = fixture();
    expect(dispatch(game, { type: 'proposeDeal', playerId: 1, targetId: 0, give: { gold: 10 }, take: { goldPerTurn: 2 } }).ok).toBe(true);
    const [trade] = pendingCourtOffers(game.state, 0);
    expect(offerNoticeLine(game.state, 0, trade!)).toBe('offers 10 gold for 2 gold a turn');
    expect(offerPaper(trade!)).toBe(game.state.dealProposals[0]!.id);
    dispatch(game, { type: 'declareWar', playerId: 1, targetId: 0 });
    expect(dispatch(game, { type: 'proposePeace', playerId: 1, targetId: 0 }).ok).toBe(true);
    const peace = pendingCourtOffers(game.state, 0).find((offer) => offer.kind === 'peace')!;
    expect(offerNoticeLine(game.state, 0, peace)).toBe('offers peace');
    expect(offerPaper(peace)).toBe('peace');
  });

  it('opens the offer on the sheet\'s paper, and never blocks the turn', () => {
    const notice = uiSource('diplomacyOffers.ts');
    expect(notice).toContain('options.review(offer.by, offerPaper(offer))');
    expect(notice).toContain("'You can end the turn without an answer.'");
    expect(uiSource('main.ts')).toContain('review: (id, offer) => diplomacy?.open(id, offer),');
  });
});
