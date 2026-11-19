/**
 * **The In play screen at a late game** (stage 3 of the Council and In play
 * board): a duel the bots play to turn 120, where they hold wonders, beliefs,
 * legacies and timed effects of their own. Slow by kind: a long game, and
 * every piece read by the stamp's labelled list as well as on the books.
 * The rules are the core file's (`inPlayHelpers.ts`).
 */

import { describe, expect, it } from 'vitest';

import { inPlayLayout } from '../../src/ui/inPlayPieces';
import { booksAgainstStamp, inPlayGame, missingFromInPlay, sheetSums, totalsWithoutGap } from './inPlayHelpers';

const TURNS = 120;
const PATIENCE = 900_000;

describe('In play at a late game', () => {
  it(
    'places every entry of the walk, reads every piece as its stamp folds, and adds every sheet up',
    () => {
      const state = inPlayGame(TURNS);
      // The game holds the kinds of piece the check is for.
      const forms = new Set(
        state.players.flatMap((player) => inPlayLayout(state, player.id).stacks.flatMap((stack) => stack.entries.map((entry) => entry.form))),
      );
      for (const form of ['order', 'wonder', 'belief', 'legacy', 'timed']) expect(forms, form).toContain(form);
      for (const player of state.players) {
        const seat = player.id;
        if (player.leader === undefined) continue;
        expect(missingFromInPlay(state, seat), `seat ${seat}`).toEqual([]);
        const layout = inPlayLayout(state, seat);
        const entries = [...layout.government, ...layout.crest, ...layout.stacks.flatMap((stack) => stack.entries)];
        for (const entry of entries) {
          if (entry.subject === null) continue;
          expect(booksAgainstStamp(state, seat, entry.subject), `seat ${seat} ${entry.key}`).toBeLessThan(1e-6);
          if (entry.stack !== 'crest' && entry.piece !== null) {
            expect(totalsWithoutGap(state, seat, entry.key), `seat ${seat} ${entry.key}`).toBeLessThan(1e-6);
          }
        }
        for (const sum of sheetSums(state, seat)) expect(sum.rows, `seat ${seat} ${sum.voice}`).toBe(sum.empire);
      }
    },
    PATIENCE,
  );
});
