import { describe, expect, it } from 'vitest';

import { REWARD_DRAFTS } from '../../src/sim/statecraftData';
import { listWords, numberWords, ordinalInWords } from '../../src/ui/numberWords';
import { REWARD_NOTHING } from '../../src/ui/rewardSheet';

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
});

/**
 * The shared helpers in `src/ui/numberWords.ts`. They are tested here because
 * the ordinal and the list join started on this sheet; the tutorial, the
 * pamphlet and the Compendium's shelves use the same module.
 */
describe('numbers and lists in words', () => {
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

  it('writes a whole number in words, and gives digits back outside zero to ninety-nine', () => {
    expect([0, 1, 7, 13, 20, 21, 38, 99].map(numberWords)).toEqual([
      'zero',
      'one',
      'seven',
      'thirteen',
      'twenty',
      'twenty-one',
      'thirty-eight',
      'ninety-nine',
    ]);
    expect([-1, 100, 2.5].map(numberWords)).toEqual(['-1', '100', '2.5']);
  });

  it('joins a list with commas and "and" before the last item', () => {
    expect(listWords([])).toBe('');
    expect(listWords(['fourth'])).toBe('fourth');
    expect(listWords(['fourth', 'eighteenth'])).toBe('fourth and eighteenth');
    expect(listWords(['fourth', 'eighteenth', 'twenty-ninth'])).toBe(
      'fourth, eighteenth and twenty-ninth',
    );
  });
});
