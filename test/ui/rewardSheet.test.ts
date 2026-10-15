import { describe, expect, it } from 'vitest';

import { REWARD_DRAFTS } from '../../src/sim/statecraftData';
import { REWARD_NOTHING, ordinalInWords } from '../../src/ui/rewardSheet';

/**
 * The sentence the reward sheet shows when nothing is banked. It lists the
 * drafts that deal a reward hand. It is built from `REWARD_DRAFTS`, so it
 * follows the ladder in `data/statecraft.json` instead of a hand-typed list.
 */
describe('the reward sheet with nothing banked', () => {
  it('names every draft that deals a reward hand, in ladder order, and nothing else', () => {
    const listed = /^No reward hand is banked\. One is dealt at the (.+) draft\.$/.exec(REWARD_NOTHING)?.[1];
    expect(listed, REWARD_NOTHING).toBeDefined();
    expect(listed!.split(/, | and /)).toEqual(REWARD_DRAFTS.map(ordinalInWords));
  });

  it('spells the drafts out, because a sentence the player reads has no digits (rule 7)', () => {
    expect(REWARD_NOTHING).not.toMatch(/\d/);
  });

  it('writes an ordinal in words, and gives digits back outside one to ninety-nine', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 18, 20, 21, 29, 38, 40, 45, 99].map(ordinalInWords)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
      'eleventh',
      'twelfth',
      'thirteenth',
      'eighteenth',
      'twentieth',
      'twenty-first',
      'twenty-ninth',
      'thirty-eighth',
      'fortieth',
      'forty-fifth',
      'ninety-ninth',
    ]);
    // Digits here make the rule-7 test above fail, which is the point.
    expect([0, 100].map(ordinalInWords)).toEqual(['0', '100']);
  });
});
