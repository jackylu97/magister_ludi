/**
 * What `aiWants.test.ts` and `aiWants.slow.test.ts` share: the duel both files
 * play, and the walk that checks every nested part of a printed term folds to
 * the term above it.
 */
import { type ValueTerm, foldTerms } from '../../src/ai/decision';
import type { GameConfig } from '../../src/sim/state';

/** The standard duel of the want-book tests. Two seats, barbarians on. */
export const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/**
 * Every nested part folds to the term above it, all the way down. Returns one
 * line per term whose parts do not add up, naming the path to it.
 */
export function partFoldFailures(terms: readonly ValueTerm[], where: string): string[] {
  const failures: string[] = [];
  for (const term of terms) {
    if (term.parts === undefined) continue;
    if (foldTerms(term.parts) !== term.value) {
      failures.push(`${where} → "${term.label}": parts fold to ${foldTerms(term.parts)}`);
    }
    failures.push(...partFoldFailures(term.parts, `${where} → ${term.label}`));
  }
  return failures;
}
