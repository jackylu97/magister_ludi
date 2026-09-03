/**
 * **The pin that keeps spectate honest.**
 *
 * Two claims, both of them the kind that only a played game can make, and both
 * slow *by kind* rather than by clock (CLAUDE.md's tier rule): a long
 * bot-vs-bot game, and a byte-for-byte comparison of two ways of playing it.
 *
 *   · **The stepper is `driveBots`, unrolled.** The same config played out by
 *     the driver and a decision at a time by `createBotStepper` produces the
 *     same state, byte for byte, and the same command log. A guard that drifted
 *     between the two — a budget counted differently, a refusal memoed
 *     differently, an End Turn attempt spent differently — is a game the
 *     spectate page would show diverging from the game the product plays, and it
 *     fails here.
 *   · **Every score in every decision is the fold of its own terms**, exactly,
 *     over a hundred turns and every choice point a real game reaches — the
 *     purchases and the disbands the short file never gets to. `===`, never
 *     `toBeCloseTo`: a breakdown that is only approximately the arithmetic is a
 *     breakdown that will one day disagree about which candidate won.
 */

import { describe, expect, it } from 'vitest';

import { nextBotDecision } from '../../src/ai/bot';
import { type BotCandidate, type ValueTerm, foldTerms } from '../../src/ai/decision';
import { driveBots } from '../../src/ai/driver';
import { type BotStep, createBotStepper } from '../../src/ai/stepper';
import { createGame, replay, snapshotState } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';

const TURNS = 100;
const PATIENCE = 120_000;

const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'standard',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/** The whole game, stepped, held so both assertions pay for it once. */
let stepped: { snapshot: string; log: string; steps: BotStep[] } | null = null;
function theSteppedGame(): { snapshot: string; log: string; steps: BotStep[] } {
  if (stepped !== null) return stepped;
  const game = createGame(CONFIG);
  const warnings: string[] = [];
  const stepper = createBotStepper(game, { warn: (message) => warnings.push(message) });
  const steps: BotStep[] = [];
  for (let turn = 0; turn < TURNS; turn++) {
    for (const step of stepper.playTurn()) steps.push(step);
    if (game.state.winnerId !== null) break;
  }
  expect(warnings).toEqual([]);
  stepped = { snapshot: snapshotState(game.state), log: JSON.stringify(game.log), steps };
  return stepped;
}

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

describe('the decision path and the driver play the same game', () => {
  it(
    'reaches a byte-identical board and writes the identical log',
    () => {
      const driven = createGame(CONFIG);
      const warnings: string[] = [];
      for (let turn = 0; turn < TURNS; turn++) {
        driveBots(driven, { warn: (message) => warnings.push(message) });
        if (driven.state.winnerId !== null) break;
      }
      expect(warnings).toEqual([]);

      const walked = theSteppedGame();
      expect(walked.log).toBe(JSON.stringify(driven.log));
      expect(walked.snapshot).toBe(snapshotState(driven.state));
    },
    PATIENCE,
  );

  it(
    'writes a log that replays to the same board',
    () => {
      const walked = theSteppedGame();
      const game = createGame(CONFIG);
      expect(snapshotState(replay(game.config, JSON.parse(walked.log)))).toBe(walked.snapshot);
    },
    PATIENCE,
  );
});

describe('the two loops agree about a persona too', () => {
  it(
    'plays a persona’d game to a byte-identical board either way',
    () => {
      // The stepper reads the *seat's* driver block now (a persona may override
      // the budget), and so does `driveSeat`. Two readings of one sheet is
      // exactly the drift this pin exists to catch, so it is asked again of a
      // game where the two seats disagree about everything.
      const config: GameConfig = {
        ...CONFIG,
        players: [
          { name: 'Crimson', color: '#d4502e', persona: 'warmonger' },
          { name: 'Teal', color: '#1f8a85', persona: 'tall' },
        ],
      };
      const turns = 60;
      const driven = createGame(config);
      const warnings: string[] = [];
      for (let turn = 0; turn < turns; turn++) {
        driveBots(driven, { warn: (message) => warnings.push(message) });
        if (driven.state.winnerId !== null) break;
      }
      const walked = createGame(config);
      const stepper = createBotStepper(walked, { warn: (message) => warnings.push(message) });
      const steps: BotStep[] = [];
      for (let turn = 0; turn < turns; turn++) {
        for (const step of stepper.playTurn()) steps.push(step);
        if (walked.state.winnerId !== null) break;
      }
      expect(warnings).toEqual([]);
      expect(JSON.stringify(walked.log)).toBe(JSON.stringify(driven.log));
      expect(snapshotState(walked.state)).toBe(snapshotState(driven.state));

      // And the arithmetic holds over the arms only a persona reaches — the
      // aggressive blow, the tall seat's citizen, the plan's own entries.
      const failures: string[] = [];
      for (const step of steps) {
        failures.push(
          ...foldFailures(step.decision.candidates, `t${step.turn} ${step.decision.kind}/${step.decision.subject}`),
        );
      }
      expect(failures).toEqual([]);
      expect(steps.length).toBeGreaterThan(200);
    },
    PATIENCE,
  );
});

/**
 * **The war pass's own identity pin** (P3).
 *
 * The two loops agreeing about a persona is asserted above; this asks the same
 * thing of a game that actually *contains* a war, because the decisions the war
 * policy adds are the ones the two loops had never both walked. Three claims in
 * one game, for the reason every long game in this suite is shared:
 *
 *   · the stepper and the driver reach the same board and write the same log;
 *   · every candidate of every decision folds to its own score, exactly —
 *     including the warscore's six lines, a peace paper's two halves and a
 *     bargain's;
 *   · the feed actually reaches the new kinds, so the arithmetic above is being
 *     asserted about something rather than about an empty list.
 */
describe('a war is a decision like any other', () => {
  const WAR_CONFIG: GameConfig = {
    seed: 20260903,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#d4502e', persona: 'warmonger' },
      { name: 'Teal', color: '#1f8a85' },
    ],
    barbarians: true,
  };

  it(
    'reaches the war kinds, folds their arithmetic, and plays the same game either way',
    () => {
      // Past the turn the warmonger's policy actually finds its neighbour on
      // this seed (t115): a declaration needs a piece of its own within
      // `war.reachRadius` of a town of theirs, and on a duel map that takes a
      // while to happen by accident.
      const turns = 130;
      const warnings: string[] = [];
      const driven = createGame(WAR_CONFIG);
      for (let turn = 0; turn < turns; turn++) {
        driveBots(driven, { warn: (message) => warnings.push(message) });
        if (driven.state.winnerId !== null) break;
      }
      const walked = createGame(WAR_CONFIG);
      const stepper = createBotStepper(walked, { warn: (message) => warnings.push(message) });
      const steps: BotStep[] = [];
      for (let turn = 0; turn < turns; turn++) {
        for (const step of stepper.playTurn()) steps.push(step);
        if (walked.state.winnerId !== null) break;
      }
      expect(warnings).toEqual([]);
      expect(JSON.stringify(walked.log)).toBe(JSON.stringify(driven.log));
      expect(snapshotState(walked.state)).toBe(snapshotState(driven.state));

      const failures: string[] = [];
      for (const step of steps) {
        failures.push(
          ...foldFailures(step.decision.candidates, `t${step.turn} ${step.decision.kind}/${step.decision.subject}`),
        );
      }
      expect(failures).toEqual([]);

      // The kinds the war pass added, and the proof that the fold above walked
      // some of them. `deal` is not asserted: whether two empires ever hold the
      // seams a swap needs is a fact about the map, not about the policy — it is
      // pinned on an arranged board in `test/sim/aiWar.test.ts`.
      const kinds = new Set(steps.map((step) => step.decision.kind));
      expect(kinds.has('war')).toBe(true);
      const wars = steps.filter((step) => step.decision.kind === 'war');
      expect(wars.every((step) => step.decision.summary.length > 0)).toBe(true);
      expect(wars.every((step) => step.result.ok)).toBe(true);
    },
    PATIENCE,
  );
});

describe('a hundred turns of arithmetic', () => {
  it(
    'folds every candidate’s terms back to its own score, exactly',
    () => {
      const walked = theSteppedGame();
      const failures: string[] = [];
      for (const step of walked.steps) {
        failures.push(
          ...foldFailures(step.decision.candidates, `t${step.turn} ${step.decision.kind}/${step.decision.subject}`),
        );
      }
      expect(failures).toEqual([]);
      // A floor, not a figure: it is here so an assertion that walked no
      // decisions could never pass quietly. The game is often decided before the
      // hundredth turn, so the real count moves with the balance.
      expect(walked.steps.length).toBeGreaterThan(300);
    },
    PATIENCE,
  );

  it(
    'reaches every choice point this bot has, and annotates all of them',
    () => {
      const walked = theSteppedGame();
      const kinds = new Set(walked.steps.map((step) => step.decision.kind));
      // The register in `decision.ts`, minus **one** — and the exception is a
      // finding rather than a gap (measured 2026-09-03, the brain-v1 pass).
      //
      // `disband` is the arrears arm: a seat only ever lets a piece go when its
      // treasury is under `solvency.arrearsTreasury` *and* its income is under
      // water. A hundred turns of this bot no longer produces that state at all
      // — the gold-pressure grace stops the opening being appraised by a
      // bankrupt, and the improvement plan and the citizen valuation between
      // them keep the books positive for the rest of the game (the arena's
      // worst late rate moved from −25💰/turn to −7💰/turn over the same pass).
      // An empire that never goes broke never disbands, which is the outcome
      // wanted; so the arm is pinned where it can be *provoked* instead, in
      // `aiBot.test.ts`' "lets a redundant piece go when it is actually in
      // arrears".
      //
      // **`war` is in the list, and from two balanced seats** — which is worth
      // reading twice. A peaceful seat's bar is `war.declareThresholdPeaceful`,
      // deliberately high rather than unreachable (the flags' recommendation:
      // opportunistic declarations at overwhelming advantage), and on this map
      // one of these two clears it. Tall and zealot put it out of reach in their
      // own sheets; balanced does not, and this is where that shows.
      //
      // `deal` is absent for a different reason and it is not a gap either:
      // whether two empires ever hold the seams a 1:1 swap needs is a fact about
      // the map. It is pinned on an arranged board in `test/sim/aiWar.test.ts`.
      //
      // If a later pass makes the economy bleed again this list grows back, and
      // that is worth noticing too.
      expect([...kinds].sort()).toEqual([
        'build',
        'draft',
        'endTurn',
        'purchase',
        'research',
        'unitOrder',
        'war',
      ]);
      for (const step of walked.steps) {
        if (step.decision.kind === 'endTurn') continue;
        expect(step.decision.summary.length).toBeGreaterThan(0);
      }
    },
    PATIENCE,
  );

  it(
    'is still a pure function of the state at the hundredth turn',
    () => {
      const walked = theSteppedGame();
      const game = createGame(CONFIG);
      const state = replay(game.config, JSON.parse(walked.log));
      // Asked twice on one board, the policy answers the same thing — the
      // contract `aiBot.test.ts` makes about commands, made here about the whole
      // decision including its candidate table.
      const once = nextBotDecision(state, 0);
      const twice = nextBotDecision(state, 0);
      expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    },
    PATIENCE,
  );
});
