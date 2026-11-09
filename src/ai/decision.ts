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
 *     appraisal in `value.ts`, `bot.ts` and `council.ts` *computes its total
 *     that way*, rather than computing a number and describing it afterwards. A description that
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
 * Why the module is a leaf: `value.ts` (the appraisal), and `bot.ts` and
 * `council.ts` (the policy), all speak this vocabulary, and the spectate page
 * reads it without importing any of them. It imports nothing from `src/ai`.
 * From the simulation it imports types, and the three data tables
 * (`buildingDef`, `unitDef`, `projectDef`) that the naming helpers at the end of
 * this file read a name from. Those helpers moved here from `bot.ts` in batch
 * S5, so that the only function `council.ts` takes from `bot.ts` is
 * `seatContext`.
 */

import type { Command } from '../sim/commands';
import { buildingDef } from '../sim/buildingData';
import { projectDef } from '../sim/projectData';
import type { City, QueueItem, Unit } from '../sim/state';
import { unitDef } from '../sim/unitData';

/**
 * How a term joins the running total. Absent means `add`, because the
 * overwhelming majority of the bot's arithmetic is a sum of contributions and a
 * list of `op: 'add'` would be noise on every line.
 */
type TermOp = 'add' | 'sub' | 'mul' | 'div';

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
 *   · `focus` — where a town's people stand (`setCitizenFocus`). Its own kind
 *     rather than a `build`: a queue says what a town is *making* and a focus
 *     says what its ground is *for*, and the two are argued in different tables
 *     (batch 6 of `docs/bot-priorities.md`).
 *   · `research` — the beeline (`chooseResearch`).
 *   · `draft` — an offer answered or a card played: the four `choose…`s, an
 *     adoption, a card slotted.
 *   · `unitOrder` — one idle piece told what to do.
 *   · `purchase` — a bank spent: `purchaseItem`, `contribute`.
 *   · `disband` — a wage stopped.
 *     Since the bot levy batch it is also a surplus soldier retired in a town
 *     for the citizen a card pays for it.
 *   · `levy`: a town spends a citizen on a levy (`levyCitizen`, the bot levy
 *     batch). This is the citizen levy of the cards, not the standing army
 *     that `levyReading` (`campaign.ts`) also calls the levy.
 *   · `war` — a declaration, or a peace put on the table or signed
 *     (`declareWar`, `proposePeace`). Its candidate table carries **every** war
 *     the seat is in, because declining a peace is not a command and the only
 *     place a decline can be shown is beside the one it took. Since batch WC1
 *     it also carries a war's aftermath: a town of this seat's in unrest that it
 *     cannot hold, pulled down (`razeCity`).
 *   · `deal` — a bargain offered or answered (`proposeDeal`, `acceptDeal`,
 *     `declineDeal`). Both answers are commands, so both are printed.
 *   · `endTurn` — the hand-over. Emitted by the stepper rather than by the
 *     policy, because ending a turn is the *driver's* decision (`driver.ts`) and
 *     nothing is weighed.
 */
export type BotDecisionKind =
  | 'build'
  | 'focus'
  | 'research'
  | 'draft'
  | 'unitOrder'
  | 'purchase'
  | 'disband'
  | 'levy'
  | 'war'
  | 'deal'
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

/**
 * **How the feed writes a number.** One decimal place, and no trailing `.0` — a
 * label is read, not parsed.
 *
 * Nothing in the bot ever reads one of these back, which is the whole reason the
 * rule can be this loose: a `BotCandidate` carries its exact `score` and its
 * exact `ValueTerm`s, and these strings are what goes in the `label` and the
 * `summary` beside them. A seat that decided anything on a rounded figure would
 * be a seat whose play depended on how the spectate page happens to print.
 *
 * It was six copies under two names — `round` in `value.ts`, `chain.ts`,
 * `wants.ts` and `plan.ts`, `round1` in `bot.ts` and `diplomacy.ts`, all six
 * byte-identical (`docs/audit/simplify.md` §2). Here, because this module is
 * already the vocabulary the feed is written in and the only one every scorer
 * imports.
 */
export function round(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}

/**
 * `round` with the sign always said, for a term that is a *change* rather than
 * a quantity: "+1.5" reads as a difference and "1.5" reads as a total.
 *
 * The hyphen, not the specimen's true minus — the feed is plain text quoted by
 * the spectate page, the arena's sheet and a test's expectation alike, and none
 * of those is a tabular-mono figure box.
 */
export function signed(value: number): string {
  return value >= 0 ? `+${round(value)}` : round(value);
}

// --- naming a decision ------------------------------------------------------

/**
 * The four little constructors every arm builds its candidate table out of.
 *
 * A first-legal arm has no score to report, so it reports the only number it
 * actually used: **where the option sat in the preference order**, negated so
 * that "earlier is better" reads the same way as every scored table on the page.
 * The term folds to exactly that, which is what keeps the spectate pin
 * (`foldTerms(terms) === score`) true across arms that weigh nothing.
 */
function rankTerms(rank: number): ValueTerm[] {
  return [{ label: `position ${rank + 1} in the order this bot tries them`, value: rank, op: 'sub' }];
}

export function chosenAt(label: string, rank: number): BotCandidate {
  return { label, score: -rank, chosen: true, terms: rankTerms(rank) };
}

/** A candidate the rules removed. It was never scored, and says so. */
export function refused(label: string, why: string): BotCandidate {
  return { label, score: 0, chosen: false, terms: [], rejected: why };
}

/** A list of options none of which this bot appraises. The first is taken. */
export function unweighed(labels: readonly string[]): BotCandidate[] {
  return labels.map((label, index) =>
    index === 0 ? chosenAt(label, 0) : { label, score: -index, chosen: false, terms: rankTerms(index) },
  );
}

/**
 * A town as a decision's subject — **"Uruk (puppet)" for one nobody controls**.
 *
 * The ruling asks a puppet's production to be *visible*, and the feed is where
 * it is visible: a reader watching a seat build a market has to be able to tell
 * whether that was the seat's choice or the arrangement the ruling describes.
 * It is a label and nothing else — the decision is an ordinary `build`.
 */
export function townSubject(city: City): string {
  return city.puppet === true ? `${city.name} (puppet)` : city.name;
}

/** A queue row's printed name. */
export function itemName(item: QueueItem): string {
  if (item.kind === 'building') return buildingDef(item.id).name;
  if (item.kind === 'unit') return unitDef(item.id).name;
  return projectDef(item.id).name;
}

/** A piece, named the way a spectator would point at it. */
export function unitLabel(unit: Unit): string {
  return `${unitDef(unit.type).name} ${unit.id}`;
}
