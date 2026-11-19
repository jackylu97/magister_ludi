/**
 * **One reading for a card's figures, every live Order** — the slow tier of
 * `councilFigures.test.ts`, which checks every fortieth. A sweep over the card
 * data is slow by kind (CLAUDE.md, "Commands & test discipline").
 */
import { describe, expect, it } from 'vitest';

import { COUNCIL_VOICES, explainCouncil, foldImpactVoices } from '../../src/ui/councilTotals';
import { checkCard, liveOrders, midGame } from './councilFiguresHelpers';

describe('one reading for a card’s plate and the totals, every live Order', () => {
  it('makes each plate what the totals lose when the card leaves', () => {
    const state = midGame();
    const before = foldImpactVoices(explainCouncil(state, 0));
    let checked = 0;
    for (const id of liveOrders()) {
      const check = checkCard(state, 0, id, before);
      if (check === null) continue;
      checked += 1;
      expect(check.identityMiss, id).toBeLessThan(1e-6);
      for (const voice of COUNCIL_VOICES) expect(check.plate[voice], `${id} ${voice}`).toBe(check.totalsMoved[voice]);
    }
    expect(checked).toBeGreaterThan(100);
  }, 600_000);
});
