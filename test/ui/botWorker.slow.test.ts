/**
 * Compare every command and turn digest in a six-seat game. After sixty turns,
 * both games present the same tribute demand and Great Person offer.
 */
import { describe, expect, it } from 'vitest';
import { copyDealMemory } from '../../src/ai/dealMemory';
import { proposeDealError } from '../../src/sim/diplomacy';
import { drawGreatPersonOffer } from '../../src/sim/greatPeople';
import { dispatch, snapshotState } from '../../src/sim/game';
import { bumpRevision, hasEndedTurn, realPlayers } from '../../src/sim/state';
import { rosterFor } from '../../src/ui/gameSetup';
import { askAudience, driveWithBotsThinking, playWithBotsThinking } from './botWorkerHelpers';

const CONFIG = { seed: 26, sizeName: 'standard', players: rosterFor(6), barbarians: true };
const TURNS = 60;
const PATIENCE = 15 * 60 * 1000;

describe('sixty turns ended through the bot worker', () => {
  it(
    'give the same log and the same state as sixty turns ended on the page',
    () => {
      const page = playWithBotsThinking(CONFIG, TURNS, 'page');
      const worker = playWithBotsThinking(CONFIG, TURNS, 'worker');

      expect(worker.outcomes.every((outcome) => outcome === 'applied')).toBe(true);
      expect(worker.digests).toEqual(page.digests);
      expect(JSON.stringify(worker.game.log)).toBe(JSON.stringify(page.game.log));
      expect([worker.audiences, worker.answered]).toEqual([page.audiences, page.answered]);

      const kinds = new Set(page.game.log.map((command) => command.type));
      for (const kind of ['foundCity', 'attack', 'proposeDeal', 'acceptDeal']) {
        expect(kinds, kind).toContain(kind);
      }

      const give = {};
      const take = { goldPerTurn: 10 };
      const state = page.game.state;
      const recipient = realPlayers(state).find(seat =>
        seat.id !== 0 && !seat.isHuman && !hasEndedTurn(state, seat.id) &&
        proposeDealError(state, 0, seat.id, give, take) === null);
      if (!recipient) throw new Error('The tribute demand needs an available bot at peace');
      for (const [game, thinker] of [[page.game, 'page'], [worker.game, 'worker']] as const) {
        expect(dispatch(game, { type: 'proposeDeal', playerId: 0, targetId: recipient.id, give, take }).ok).toBe(true);
        const proposal = game.state.dealProposals.find(row => row.by === 0 && row.to === recipient.id)!;
        const answer = askAudience(game, thinker, recipient.id, proposal.id);
        expect(answer?.command).toEqual({ type: 'declineDeal', playerId: recipient.id, dealId: proposal.id });
        expect(copyDealMemory(game.state)).toContainEqual(expect.objectContaining({
          by: 0, to: recipient.id, turn: game.state.turn,
        }));
      }
      for (const [game, thinker] of [[page.game, 'page'], [worker.game, 'worker']] as const) {
        const seat = game.state.players[recipient.id]!;
        // Draw from the played world's remaining roster. The choice is the worker's job.
        seat.greatPersonOffer = drawGreatPersonOffer(game.state, seat);
        expect(seat.greatPersonOffer.options.length).toBeGreaterThan(0);
        bumpRevision(game.state);
        const before = game.log.length;
        const recruits = seat.greatPeopleRecruited;
        const outcome = driveWithBotsThinking(game, thinker);
        if (thinker === 'worker') expect(outcome).toBe('applied');
        expect(game.log.slice(before)).toContainEqual(expect.objectContaining({
          type: 'chooseGreatPerson', playerId: seat.id,
        }));
        expect(seat.greatPeopleRecruited).toBeGreaterThan(recruits);
      }
      expect(worker.game.log).toEqual(page.game.log);
      expect(copyDealMemory(worker.game.state)).toEqual(copyDealMemory(page.game.state));
      expect(snapshotState(worker.game.state)).toBe(snapshotState(page.game.state));
    },
    PATIENCE,
  );
});
