/**
 * The bot worker over a long game: six seats on the Standard map, sixty turns,
 * played once with the bots thinking on the page and once with them thinking
 * in the worker (`botWorkerHelpers.ts`). By turn sixty on this seed the bots
 * have settled their land, fought, put deals to each other and to the person,
 * accepted a few and refused most of them (which fills the refusal memory the
 * worker must carry back), and called great people. Every turn's state digest
 * and the whole log must match.
 *
 * Seed 26 since batch B1, measured at schema 241: 21 towns founded, 64
 * attacks, 21 deals put, 2 of them accepted and 19 refused, 2 great people
 * called (the first on turn 50), 15 papers the person put to a bot, and 18
 * refusals in the deal memory.
 *
 * Seed 888, used before, no longer calls a great person in sixty turns. A
 * great person needs Ancestor Rites, which the Epic Poetry technology grants.
 * On seed 888 the first seat now learns it on turn 66, so the first call comes
 * on turn 67. Just before batch B1 (schema 240) the first call came on turn
 * 54, and at the fourteen commits from schema 227 to 240 it came between turn
 * 50 and turn 62. Renown does not hold it back: four seats bank the 75 renown
 * the first great person costs by turn 50. Batch B1 changed beliefs and two
 * faith buildings and no renown rule, so this is one game's path. Over seeds 1
 * to 20, 8 games called a great person within sixty turns at schema 227 and 7
 * did at schema 241. Of 40 seeds tried at schema 241, 10 did. Seed 26 is one
 * of the games with all six command kinds below, and it also has two great
 * people and papers from the person.
 *
 * Seed 888 came in with the movement fixes (`docs/flags.md` (xxxxxx)),
 * measured at schema 147: 23 towns founded, 21 attacks on the wild, 57 deals
 * put and 4 of them accepted, 3 great people called, and 26 papers the person
 * put to a bot. Seed 777, used before that, no longer reached an accepted deal
 * in sixty turns, because the fixes changed that game's path. Over fifteen
 * seeds the bots put about as many deals as before (468 before, 446 after) and
 * accepted a few fewer (43 before, 33 after), and 13 of the 15 games still
 * reached an accepted deal.
 *
 * Slow by kind: a multi-decade game played twice.
 */

import { describe, expect, it } from 'vitest';
import { dealMemorySize } from '../../src/ai/dealMemory';
import { rosterFor } from '../../src/ui/gameSetup';
import { playWithBotsThinking } from './botWorkerHelpers';

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
