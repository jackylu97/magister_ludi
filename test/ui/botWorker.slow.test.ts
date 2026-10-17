/**
 * The bot worker over a long game: six seats on the Standard map, sixty turns,
 * played once with the bots thinking on the page and once with them thinking
 * in the worker (`botWorkerHelpers.ts`). By turn sixty on this seed the bots
 * have settled their land, fought the wild, put deals to each other and to the
 * person, accepted a few and refused most of them (which fills the refusal
 * memory the worker must carry back), and called great people. Every turn's
 * state digest and the whole log must match.
 *
 * Seed 888 since the movement fixes (`docs/flags.md` (xxxxxx)), measured at
 * schema 147: 23 towns founded, 21 attacks on the wild, 57 deals put and 4 of
 * them accepted, 3 great people called, and 26 papers the person put to a bot.
 * Seed 777, used before, no longer reaches an accepted deal in sixty turns,
 * because the fixes changed that game's path. Over fifteen seeds the bots put
 * about as many deals as before (468 before, 446 after) and accept a few fewer
 * (43 before, 33 after), and 13 of the 15 games still reach an accepted deal.
 *
 * Slow by kind: a multi-decade game played twice.
 */

import { describe, expect, it } from 'vitest';
import { dealMemorySize } from '../../src/ai/dealMemory';
import { rosterFor } from '../../src/ui/gameSetup';
import { playWithBotsThinking } from './botWorkerHelpers';

const CONFIG = { seed: 888, sizeName: 'standard', players: rosterFor(6), barbarians: true };
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

      // The game is one where the worker had something to get wrong.
      const kinds = new Set(page.game.log.map((command) => command.type));
      for (const kind of ['foundCity', 'attack', 'proposeDeal', 'acceptDeal', 'declineDeal', 'chooseGreatPerson']) {
        expect(kinds, kind).toContain(kind);
      }
      expect(dealMemorySize(page.game.state)).toBeGreaterThan(0);
    },
    PATIENCE,
  );
});
