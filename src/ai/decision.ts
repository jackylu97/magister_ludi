/**
 * **The bot, thinking out loud.**
 *
 * `bot.ts` answers *what would this seat like to do next?* with a `Command`, and
 * a command is a decision with its reasons thrown away. This module is the
 * vocabulary that keeps the reasons: a `BotDecision` is the command plus every
 * candidate the policy weighed, and a `BotCandidate` is a score plus **the
 * arithmetic that made it**.
 *
 * Two rules hold the shape together, and both exist so the spectate page can
 * never lie about what the bot did:
 *
 *   · **A score is the fold of its terms, and the fold is the computation.**
 *     `foldTerms` walks the list left to right applying each term's `op` to an
 *     accumulator that starts at zero — `add`, `sub`, `mul`, `div` — and every
 *     appraisal in `value.ts` and `bot.ts` *computes its total that way*, rather
 *     than computing a number and describing it afterwards. A description that
 *     is written beside the arithmetic drifts from it; a description that **is**
 *     the arithmetic cannot. `test/sim/aiBot.slow.test.ts` asserts
 *     `foldTerms(candidate.terms) === candidate.score` exactly (`===`, not
 *     `toBeCloseTo`) for every candidate of every decision in a played game.
 *   · **A nested appraisal is one term carrying its own list.** A term may hold
 *     `parts`, which fold to that term's own `value` — so "the building row is
 *     worth 46.5" expands into happiness, walls and renown without changing the
 *     order the outer sum is taken in. That is not a presentational nicety: a
 *     regrouped floating-point sum is a *different number*, and the bot's whole
 *     contract is that the same board produces the same command. Terms group
 *     only where the group is a run of adds starting from zero, which is exactly
 *     what a nested appraisal is.
 *
 * Why the module is a leaf: `value.ts` (the appraisal) and `bot.ts` (the policy)
 * both speak this vocabulary, and the spectate page reads it without importing
 * either. It imports one type from the simulation and nothing else — the same
 * bargain `aiConfig.ts` makes for the tuning surface.
 */

import type { Command } from '../sim/commands';

/**
 * How a term joins the running total. Absent means `add`, because the
 * overwhelming majority of the bot's arithmetic is a sum of contributions and a
 * list of `op: 'add'` would be noise on every line.
 */
export type TermOp = 'add' | 'sub' | 'mul' | 'div';

/**
 * One labelled step of an appraisal's arithmetic.
 *
 * The label is **player words about the bot's own reasoning** — "food +2 × 4
 * (age weight)", "÷ 6 turns to build" — not an identifier, because the audience
 * for this is somebody deciding whether the bot is playing well.
 */
export interface ValueTerm {
  label: string;
  value: number;
  /** Defaults to `add`. */
  op?: TermOp;
  /** A nested appraisal's own terms. Folds to this term's `value`. */
  parts?: ValueTerm[];
}

/** A number and the arithmetic that produced it. Every `value.ts` fold returns one. */
export interface Appraisal {
  total: number;
  terms: ValueTerm[];
}

/**
 * The one fold. Accumulator starts at zero and each term is applied in order.
 *
 * Starting at zero is what makes a nested group exact: a run of adds folded from
 * zero and then added to an outer accumulator associates exactly as the flat run
 * would have, which is the licence `parts` needs.
 */
export function foldTerms(terms: readonly ValueTerm[]): number {
  let total = 0;
  for (const term of terms) {
    switch (term.op ?? 'add') {
      case 'add':
        total += term.value;
        break;
      case 'sub':
        total -= term.value;
        break;
      case 'mul':
        total *= term.value;
        break;
      case 'div':
        total /= term.value;
        break;
    }
  }
  return total;
}

/** A term list and the number it folds to. The shape every appraisal returns. */
export function appraise(terms: ValueTerm[]): Appraisal {
  return { total: foldTerms(terms), terms };
}

/** A term whose value is a nested appraisal's total, carrying that appraisal's terms. */
export function nest(label: string, appraisal: Appraisal, op?: TermOp): ValueTerm {
  return op === undefined
    ? { label, value: appraisal.total, parts: appraisal.terms }
    : { label, value: appraisal.total, op, parts: appraisal.terms };
}

/**
 * One thing the bot weighed, chosen or not.
 *
 * `rejected` is the half a scored table cannot show: most of what a seat could
 * do on a given turn is refused by the *rules*, and the refusal is the
 * simulation's own sentence (`buildError`, `purchaseError`, `improvementError`
 * …) rather than a paraphrase. A candidate carrying one was never scored — its
 * `score` is zero and its `terms` are empty — and that is honest: the bot did
 * not compare it, the rules removed it.
 */
export interface BotCandidate {
  /** "Worker", "Bronzeworking", the card's own name. Plain words. */
  label: string;
  score: number;
  chosen: boolean;
  terms: ValueTerm[];
  /** The simulation's own refusal, when the rules removed this candidate. */
  rejected?: string;
}

/**
 * What the bot decides at one choice point, and why.
 *
 * `kind` is the register of choice points this bot actually has — it is not a
 * taxonomy of the game, it is a list of the places `nextBotDecision` branches,
 * and a new branch joins it deliberately.
 *
 *   · `build` — a town's queue (`setCityProduction`).
 *   · `research` — the beeline (`chooseResearch`).
 *   · `draft` — an offer answered or a card played: the four `choose…`s, an
 *     adoption, a card slotted.
 *   · `unitOrder` — one idle piece told what to do.
 *   · `purchase` — a bank spent: `purchaseItem`, `contribute`.
 *   · `disband` — a wage stopped.
 *   · `endTurn` — the hand-over. Emitted by the stepper rather than by the
 *     policy, because ending a turn is the *driver's* decision (`driver.ts`) and
 *     nothing is weighed.
 */
export type BotDecisionKind =
  | 'build'
  | 'research'
  | 'draft'
  | 'unitOrder'
  | 'purchase'
  | 'disband'
  | 'endTurn';

export interface BotDecision {
  kind: BotDecisionKind;
  /** Exactly what the reducer receives. */
  command: Command;
  /** Who or what the decision is about: "Uruk", "Scout 12", "Crimson". */
  subject: string;
  /** One plain sentence: what, and why. */
  summary: string;
  /** Everything weighed, the chosen one included. */
  candidates: BotCandidate[];
  /** Where to point a camera, when the decision happens somewhere. */
  focus?: { col: number; row: number };
}

/**
 * Sorts a candidate table for reading: scored candidates by score, then the ones
 * the rules removed, each group keeping the order the bot considered them in.
 *
 * A *reading* order, never the bot's own — the policy's tie-breaks are array and
 * roster order and this must not be mistaken for them. It copies rather than
 * sorting in place for that reason.
 */
export function rankedCandidates(candidates: readonly BotCandidate[]): BotCandidate[] {
  const scored = candidates.filter((candidate) => candidate.rejected === undefined);
  const refused = candidates.filter((candidate) => candidate.rejected !== undefined);
  const order = new Map(candidates.map((candidate, index) => [candidate, index]));
  scored.sort((a, b) => b.score - a.score || order.get(a)! - order.get(b)!);
  return [...scored, ...refused];
}
