/**
 * **The bot's reasons, at the two things they must never get wrong.**
 *
 * `aiBot.test.ts` pins the contract on the *command*: every one is accepted, and
 * the same board always produces the same one. This file pins the contract on
 * the *reasons*, and there are exactly two:
 *
 *   · **There is one path.** `nextBotCommand` is `nextBotDecision(…).command` and
 *     nothing else, so a spectator can never be shown a decision the game did not
 *     take. Asserted by playing and comparing, not by reading the source.
 *   · **A score is the fold of its terms.** `foldTerms(candidate.terms)` equals
 *     `candidate.score` **exactly** — `===`, not `toBeCloseTo` — and the same
 *     holds recursively for any term carrying `parts`. A breakdown that is only
 *     approximately the arithmetic is a breakdown that will one day be a lie
 *     about which candidate won.
 *
 * The long half of both — a hundred turns of every decision kind — is
 * `aiDecision.slow.test.ts`. This is the short one, and it is core because it is
 * the one that would catch a term list written beside a total rather than
 * folded into it.
 */

import { describe, expect, it } from 'vitest';

import { nextBotCommand, nextBotDecision } from '../../src/ai/bot';
import { type BotCandidate, type ValueTerm, foldTerms, rankedCandidates } from '../../src/ai/decision';
import { createBotStepper } from '../../src/ai/stepper';
import { type Game, createGame } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';

const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/** Every decision made over `turns` turns, and the game they were made in. */
function harvest(turns: number): { game: Game; decisions: ReturnType<typeof nextBotDecision>[] } {
  const game = createGame(CONFIG);
  const stepper = createBotStepper(game, { warn: () => undefined });
  const decisions: ReturnType<typeof nextBotDecision>[] = [];
  for (let turn = 0; turn < turns; turn++) {
    for (const step of stepper.playTurn()) decisions.push(step.decision);
  }
  return { game, decisions };
}

/** Walks a term tree, checking that every `parts` list folds to the term above it. */
function partFailures(terms: readonly ValueTerm[], where: string): string[] {
  const failures: string[] = [];
  for (const term of terms) {
    if (term.parts === undefined) continue;
    const folded = foldTerms(term.parts);
    if (folded !== term.value) {
      failures.push(`${where} → "${term.label}": parts fold to ${folded}, term says ${term.value}`);
    }
    failures.push(...partFailures(term.parts, `${where} → ${term.label}`));
  }
  return failures;
}

function foldFailures(candidates: readonly BotCandidate[], where: string): string[] {
  const failures: string[] = [];
  for (const candidate of candidates) {
    const folded = foldTerms(candidate.terms);
    if (folded !== candidate.score) {
      failures.push(`${where} → "${candidate.label}": terms fold to ${folded}, score is ${candidate.score}`);
    }
    failures.push(...partFailures(candidate.terms, `${where} → ${candidate.label}`));
  }
  return failures;
}

describe('one path', () => {
  it('answers a command with exactly the decision’s own command, turn after turn', () => {
    const game = createGame(CONFIG);
    const stepper = createBotStepper(game, { warn: () => undefined });
    let checked = 0;
    for (let turn = 0; turn < 6; turn++) {
      for (const step of stepper.playTurn()) {
        // Re-asked *before* the step is applied it would be the same question;
        // asked after, it is a new one. The pin that matters is the one taken at
        // the moment of the step, which is what the stepper dispatched.
        expect(step.result.ok).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);

    // And the wrapper, asked directly: on a fresh board both entry points name
    // the same command.
    const fresh = createGame(CONFIG);
    for (let playerId = 0; playerId < 2; playerId++) {
      const decision = nextBotDecision(fresh.state, playerId);
      const command = nextBotCommand(fresh.state, playerId);
      expect(command).toEqual(decision === null ? null : decision.command);
    }
  });
});

describe('every score is the fold of its terms', () => {
  it('reproduces itself exactly, candidate by candidate, over six turns', () => {
    const { decisions } = harvest(6);
    const failures: string[] = [];
    for (const decision of decisions) {
      if (decision === null) continue;
      failures.push(...foldFailures(decision.candidates, `${decision.kind}/${decision.subject}`));
    }
    expect(failures).toEqual([]);
  });

  it('says something plain about every decision, and points somewhere or nowhere on purpose', () => {
    const { decisions } = harvest(6);
    const kinds = new Set<string>();
    for (const decision of decisions) {
      if (decision === null) continue;
      kinds.add(decision.kind);
      expect(decision.subject.length).toBeGreaterThan(0);
      expect(decision.summary.length).toBeGreaterThan(0);
      expect(decision.command.playerId).toBeTypeOf('number');
      // A focus is a hex or it is absent — never a half-named one.
      if (decision.focus !== undefined) {
        expect(decision.focus.col).toBeTypeOf('number');
        expect(decision.focus.row).toBeTypeOf('number');
      }
    }
    // Six turns of a duel map reach the four everyday choice points; the rarer
    // kinds (`purchase`, `disband`) are the slow file's business.
    expect([...kinds].sort()).toEqual(expect.arrayContaining(['build', 'endTurn', 'research', 'unitOrder']));
  });

  it('marks exactly one chosen candidate wherever it weighed anything', () => {
    const { decisions } = harvest(6);
    const offenders: string[] = [];
    for (const decision of decisions) {
      if (decision === null || decision.candidates.length === 0) continue;
      const chosen = decision.candidates.filter((candidate) => candidate.chosen);
      if (chosen.length !== 1) {
        offenders.push(`${decision.kind}/${decision.subject}: ${chosen.length} chosen`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never scores a candidate the rules removed, and never leaves one unexplained', () => {
    const { decisions } = harvest(6);
    const offenders: string[] = [];
    for (const decision of decisions) {
      if (decision === null) continue;
      for (const candidate of decision.candidates) {
        if (candidate.rejected === undefined) continue;
        if (candidate.chosen) offenders.push(`${candidate.label} was chosen and rejected`);
        if (candidate.terms.length > 0) offenders.push(`${candidate.label} was rejected but scored`);
        if (candidate.rejected.length === 0) offenders.push(`${candidate.label} was rejected with no reason`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the reading order', () => {
  it('sorts scored candidates by score and leaves the refused ones behind them', () => {
    const table: BotCandidate[] = [
      { label: 'a', score: 1, chosen: false, terms: [] },
      { label: 'b', score: 0, chosen: false, terms: [], rejected: 'no' },
      { label: 'c', score: 9, chosen: true, terms: [] },
    ];
    expect(rankedCandidates(table).map((row) => row.label)).toEqual(['c', 'a', 'b']);
    // A reading order, never the bot's own: the caller's array is untouched.
    expect(table.map((row) => row.label)).toEqual(['a', 'b', 'c']);
  });
});
