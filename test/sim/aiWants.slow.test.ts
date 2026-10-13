/**
 * The want-book claims that need a played game, moved here from
 * `aiWants.test.ts` because a bot game of forty to sixty turns is slow by kind.
 * Each claim keeps a fast check on an arranged or briefly played board in the
 * core file.
 *
 * Three of these tests used to play the same duel for themselves (forty,
 * fifty-six and sixty turns of `createGame(CONFIG)` under the bot stepper).
 * The stepper is a pure function of the game, so the duel is now played once,
 * for sixty turns, and every step is recorded; each test reads the turns it
 * used to play. Two tests need a different game and still play their own: the
 * focus arm's regression board is another seed, and the research count is
 * taken through the driver's report hook.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BotDecision } from '../../src/ai/bot';
import { foldTerms } from '../../src/ai/decision';
import { driveBots } from '../../src/ai/driver';
import { createBotStepper } from '../../src/ai/stepper';
import { CONFIG, partFoldFailures } from './aiWantsHelpers';
import { createGame } from './newGameHelpers';
import { stockStandardDecks } from './statecraftHelpers';

/**
 * The decks are stocked for the file, as in `aiWants.test.ts`: every
 * pre-rework Order row is retired, so a draft has nothing to deal unless the
 * bench un-retires rows. The restore runs after the last test because the
 * module graph outlives the file.
 */
let restoreShelf: () => void = () => {};
beforeAll(() => {
  restoreShelf = stockStandardDecks();
});
afterAll(() => restoreShelf());

/** One step the stepper took, the stepper call it came from, and the rules' answer. */
interface PlayedStep {
  decision: BotDecision;
  /** Which `playTurn` call produced it, counting from 0. */
  sitting: number;
  /** The game turn the step was taken on. */
  turn: number;
  ok: boolean;
}

/** How many turns the shared duel is played: the longest any test here reads. */
const DUEL_TURNS = 60;

let played: PlayedStep[] | null = null;

/** The standard duel, played `DUEL_TURNS` turns by the bot stepper, once. */
function playedDuel(): PlayedStep[] {
  if (played !== null) return played;
  const game = createGame(CONFIG);
  const stepper = createBotStepper(game, { warn: () => {} });
  const record: PlayedStep[] = [];
  for (let sitting = 0; sitting < DUEL_TURNS; sitting++) {
    for (const step of stepper.playTurn()) {
      record.push({ decision: step.decision, sitting, turn: step.turn, ok: step.result.ok });
    }
  }
  played = record;
  return record;
}

describe('the focus arm, over a played duel', () => {
  /**
   * **The arm, on a board nobody arranged.** A bench of identical hills cannot
   * exercise this: the two sheets pick the same hexes when every hex is the
   * same, so the difference the arm exists to price is nought by construction.
   * The standard duel is where the two sheets actually disagree, and the arm is
   * reached there in both directions inside `FOCUS_TURNS`.
   */
  function focusSteps(): PlayedStep[] {
    return playedDuel().filter((step) => step.sitting < FOCUS_TURNS && step.decision.kind === 'focus');
  }

  // Re-aimed 2026-09-05 (the levy's own count, `isFieldSoldier`, and the focus
  // arm's idempotence pass): seat 0 leans its capital on the hammers at t29 and
  // its two other towns at t33 and t39, the first town is put back at t53, and
  // seat 1's town is told the balanced ordering at t44. The window is what the
  // two directions need on this board, not a number with an opinion — it was 40
  // while the arm's story ran from t32 to t35.
  const FOCUS_TURNS = 56;

  /** Every focus order on one played board must be a town's first that turn. */
  function expectOneOrderPerTownPerTurn(steps: readonly { decision: BotDecision; turn: number }[]): void {
    const last = new Map<number, string>();
    const perTurn = new Set<string>();
    for (const step of steps) {
      const command = step.decision.command as { cityId: number; focus: string };
      expect(last.get(command.cityId)).not.toBe(command.focus);
      last.set(command.cityId, command.focus);
      const key = `${step.turn}:${command.cityId}`;
      expect(perTurn.has(key)).toBe(false);
      perTurn.add(key);
    }
  }

  it('points a town at the hammers and takes it back, and the rules accept both', () => {
    // Measured on this board (2026-09-05): seat 0 leans its capital on the
    // hammers at t29 while an engine is waiting on them and puts a town back at
    // t53 when the engine is standing — which is the whole of the arm's
    // sentence, in both directions, on a board nobody arranged.
    const steps = focusSteps();
    expect(steps.length).toBeGreaterThan(0);
    const words = steps.map((step) => (step.decision.command as { focus?: string }).focus);
    expect(words).toContain('production');
    expect(words).toContain('default');
    // A command this bot proposes is a command the rules take — the discipline
    // every arm keeps, and the reason `driver.ts` treats a refusal as a bug.
    for (const step of steps) expect(step.ok).toBe(true);
  });

  it('never asks the same town for the focus it already has, in one turn or across two', () => {
    // Idempotence by construction — the research plan's lesson, and what keeps
    // the driver's loop finite. It stands on three things, and all three are
    // `focusCommand`'s docblock:
    //
    //   · the appraisal is a function of the ground and of the sitting's frozen
    //     readings, never of the focus it is about — the two live readings go
    //     through `foodUnder`, which shifts the town's quote to the sheet in
    //     question rather than patching a staged total by a raw tile difference;
    //   · the seats it fills are `chooseCitizens`' own cap rather than the
    //     length of an assignment the arm's own command is about to refresh;
    //   · and the sitting will not ask a town twice, so a board that genuinely
    //     moves mid-turn (a card slotted, a hex bought) is re-read next turn
    //     rather than re-ordered this one.
    expectOneOrderPerTownPerTurn(focusSteps());
  });

  it('holds its word on the board that used to burn a seat\'s whole command budget', () => {
    // The regression, pinned on the board it was measured on (2026-09-05, seed
    // 20260904 at t51): one town, six citizens, a quarter's worth of food
    // percentages on it — so eight bushels of ground moved the town's staged
    // food by ten, the growth charge read −3.1 with the town standing balanced
    // and −11.3 with it standing on the hammers, and the arm ordered it back and
    // forth until `driver.commandsPerSeat` cut the seat off. Fifty-two turns is
    // what it takes to reach; the claim is the same one the test above makes.
    //
    // Seed 20260903, not 20260905, since 2026-09-07: H11's cost scale (every
    // hammer price ×5 in Æra I) moved the board out from under its seed a second
    // time — 20260905 now raises no focus order inside fifty-two turns, exactly
    // as 20260904 stopped doing when H9 moved the start chooser, and a test that
    // pins nothing pins nothing. The neighbouring seed raises eighteen from turn
    // forty-one, every one accepted, and the claim is unchanged. (Measured with
    // the faith book's own batch held out: the same board raises them at HEAD
    // with H12 in and H11 out.)
    //
    // **Back to 20260905 on 2026-09-08**: batch S1 re-anchored the tech ladder
    // at 10 (`docs/flags.md` item (vv)), so every column above the second is
    // cheaper, the tree opens sooner and the boards moved a third time —
    // 20260903 now raises no focus order inside fifty-two turns and 20260905,
    // which stopped raising them under H11, raises six again from turn thirty,
    // every one accepted. Measured across eight neighbouring seeds under the new
    // ladder: 20260901 ten, 20260902 fourteen, 20260905 six, 20260908 eight,
    // 20260903 and 20260904 none. The seed is only the board this claim is
    // measurable on; the claim is the one the test above makes and has not
    // moved.
    const game = createGame({ ...CONFIG, seed: 20260905 });
    const stepper = createBotStepper(game, { warn: () => {} });
    const steps: { decision: BotDecision; turn: number; ok: boolean }[] = [];
    for (let turn = 0; turn < 52; turn++) {
      for (const step of stepper.playTurn()) {
        if (step.decision.kind === 'focus') {
          steps.push({ decision: step.decision, turn: step.turn, ok: step.result.ok });
        }
      }
    }
    expect(steps.length).toBeGreaterThan(0);
    expectOneOrderPerTownPerTurn(steps);
    for (const step of steps) expect(step.ok).toBe(true);
  });

  it('prints both readings and folds each candidate from its own terms', () => {
    const steps = focusSteps();
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.decision.candidates.length).toBe(2);
      expect(step.decision.candidates.filter((candidate) => candidate.chosen).length).toBe(1);
      for (const candidate of step.decision.candidates) {
        expect(foldTerms(candidate.terms)).toBe(candidate.score);
        expect(partFoldFailures(candidate.terms, candidate.label)).toEqual([]);
      }
      // The lean's own arithmetic: what the hexes pay, the hammer price's
      // difference from the table, and the growth it delays.
      const lean = step.decision.candidates.find((candidate) => candidate.label === 'work the hammers')!;
      expect(lean.terms[0]!.label).toContain('what the people would make');
      expect(step.decision.summary.length).toBeGreaterThan(0);
    }
  });

  it('charges the growth it delays the keep of the citizen it delays (batch X5b)', () => {
    // The arithmetic is pinned on an arranged bench in `aiAppraisal.test.ts`;
    // what this asks is that the line is *there* on a board the bot actually
    // played — a charge that only appears on an arranged bench is a charge no
    // game ever pays. Every growth term found carries the ground and the keep,
    // and the citizen's worth is the fold of the two.
    const steps = focusSteps();
    const growths = steps
      .flatMap((step) => step.decision.candidates)
      .flatMap((candidate) => candidate.terms)
      .filter((term) => term.label.includes('the next citizen arrives in'));
    expect(growths.length).toBeGreaterThan(0);
    for (const growth of growths) {
      const printed = JSON.stringify(growth);
      expect(printed).toContain('the ground it would work');
      expect(printed).toContain('the happiness one more citizen demands');
      const worth = growth.parts!.find((part) => part.label.includes('what the next citizen is worth'))!;
      const keep = worth.parts!.find((part) => part.label.includes('happiness'))!;
      expect(keep.value).toBeLessThan(0);
      expect(foldTerms(worth.parts!)).toBe(worth.value);
      expect(foldTerms(growth.parts!)).toBe(growth.value);
    }
  });
});

describe('the draft plan, over a played duel', () => {
  it('takes the hands it is dealt: a pass is worth the pity it buys and no more', () => {
    // **Re-aimed 2026-09-09** (X1d-ground, the user's ruling on `docs/flags.md`
    // item (ggg): *"sounds like we're valuing orders incorrectly?"*). What stood
    // here asserted the opposite claim — that the bot passes hands — and it was
    // true because a pass was credited with the *whole* of the next hand, which
    // no ordinary card can beat. The next hand is dealt either way; what a pass
    // buys is one rung of pity, and against that a card on the table almost
    // always wins. Measured on this same duel: **seven passes in sixty turns
    // before the re-fold and none after**, with the drafts themselves unchanged
    // in number.
    const hands: BotDecision[] = [];
    let drafts = 0;
    for (const step of playedDuel()) {
      if (step.decision.kind !== 'draft') continue;
      if (step.decision.command.type === 'chooseOrder') drafts += 1;
      if (step.decision.command.type === 'skipOrderOffer') {
        // A pass this bot proposes is still a pass the rules take.
        expect(step.ok).toBe(true);
      }
      hands.push(step.decision);
    }
    expect(drafts).toBeGreaterThan(0);
    const offered = hands.filter((decision) =>
      decision.candidates.some((candidate) => candidate.label === 'pass the hand'),
    );
    expect(offered.length).toBeGreaterThan(0);
    for (const decision of offered) {
      const pass = decision.candidates.find((candidate) => candidate.label === 'pass the hand')!;
      const cards = decision.candidates.filter((candidate) => candidate.label !== 'pass the hand');
      expect(foldTerms(pass.terms)).toBe(pass.score);
      // **The margin, not the hand.** The term prints both estimates — the next
      // hand with one more rung of pity banked and the same hand without it —
      // and the value it folds is the difference between them, which is strictly
      // less than either.
      const margin = pass.terms[0]!;
      const printed = [...margin.label.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
      const pitied = printed[0]!;
      const plain = printed[2]!;
      // Both estimates print to a tenth, so the difference is within two of
      // those of the value the term folds.
      expect(Math.abs(margin.value - (pitied - plain))).toBeLessThanOrEqual(0.11);
      expect(pitied).toBeGreaterThanOrEqual(0);
      expect(margin.value).toBeLessThan(pitied);
      // Whoever won, won on the argmax and on nothing else.
      const chosen = decision.candidates.find((candidate) => candidate.chosen)!;
      for (const other of [pass, ...cards]) {
        if (other === chosen) continue;
        expect(chosen.score).toBeGreaterThanOrEqual(other.score);
      }
    }
    // **Re-cut for the decks rework** (D1a): this used to add that no hand on
    // this board was passed at all. That was a fact about the old chiefdom
    // pool; the bench's stocked shelf deals rows this seat scores at nothing
    // (a coastal card to an inland town, a caravan card with no route), and a
    // hand of three such is exactly the hand the ruling says to pass. The claim
    // that survives is the ruling itself, asserted above hand by hand: a pass
    // wins only on the argmax, against a margin and never against the whole
    // next hand.
    const passed = offered.filter((decision) => decision.command.type === 'skipOrderOffer');
    for (const decision of passed) {
      const pass = decision.candidates.find((candidate) => candidate.label === 'pass the hand')!;
      for (const card of decision.candidates) {
        if (card === pass) continue;
        expect(card.score).toBeLessThanOrEqual(pass.score);
      }
    }
  });
});

describe('the chain in the book, over a played duel', () => {
  it('changes its mind about the plan far less often, now the margin defends it', () => {
    // **The wobble, measured.** Batch 1's own report put `chooseResearch` at 31
    // commands over the first forty turns of this duel, up from 15 before it —
    // an empire re-aiming its beeline most turns of the game. The margin is what
    // stops that, and this is the number pinned as a ceiling.
    //
    // Measured 2026-09-05, this exact board: **31 before batch 3, 10 after**,
    // and the ceiling was 16 — set where a real regression would trip it and
    // ordinary board-level movement would not.
    //
    // **Re-aimed 2026-09-09 to 19** (batch X7, the march re-asked), and the
    // reason is worth writing down because a raised ceiling always looks like a
    // ceiling that gave up. This one board reads **14 on the tree X7 was built
    // on**, 18 with X7 alone, and 19 with the four batches of that day together
    // — so the pin had already drifted from 10 to 14 without X7 in it. What X7
    // does is move the *board*: a settler that re-aims mid-walk founds somewhere
    // else, and forty turns of a different game re-aim a different number of
    // times.
    //
    // Diagnosed before it was re-aimed, because a wobble and a divergence look
    // identical in one number (`docs/bot-priorities.md`, "Batch X7 as shipped"):
    //
    //   · **the oscillation is older than the batch.** Seat 1 flips between the
    //     same two goals on this board with X7 *shut* (t22 → t23 → t28), and
    //     with it on it runs two more cycles of that same pair;
    //   · **the flip rate does not move.** Over ten boards, an A → B → A
    //     flip-back is 31% of re-aims shut and 31% on. A margin that had stopped
    //     holding would show here and does not;
    //   · **ten boards, paired: +1.0 ± 1.2 re-aims** (means 10.3 → 11.3), and
    //     the per-board deltas run **both ways** — seed 42 falls 15 → 8 and 4242
    //     falls 13 → 10 while this seed rises 14 → 18;
    //   · **the arm cannot perturb the read.** Moving `reaskTheMarch` to the
    //     other side of `reaimBeeline` in `housekeeping` leaves all ten boards'
    //     counts **byte-identical**, which is the experiment that rules out "the
    //     re-asked march changes what the beeline reads mid-turn".
    //
    // So the ceiling is re-aimed rather than the batch reverted, and it is set
    // at the four-batch gate's own reading with no slack in it: the next thing
    // that moves this number is meant to be looked at.
    const game = createGame(CONFIG);
    let aims = 0;
    for (let turn = 0; turn < 40; turn++) {
      driveBots(game, {
        warn: () => {},
        report: (command) => {
          if (command.type === 'chooseResearch') aims += 1;
        },
      });
    }
    expect(aims).toBeLessThanOrEqual(19);
  });
});

/**
 * **The fold audit over batch 6's own terms.**
 *
 * `aiPersona.test.ts` pins that every candidate's score is the fold of its
 * terms; this is the other half of `decision.ts`' contract for the arithmetic
 * this batch added — every *nested* part folds to the term above it — and it is
 * asked only of the candidates that actually carry a new term, so a pass that
 * quietly stopped emitting them would fail the count rather than the fold.
 */
describe('batch 6’s terms', () => {
  it('fold to their own values wherever they are printed', () => {
    const marks = [
      'buy the engines', // the hammer premium
      'the culture price', // culture's shadow price, in a printed yield
      'pity', // the pass
      'what the people would make on the other hexes', // the focus arm
    ];
    const seen = new Set<string>();
    const failures: string[] = [];
    // Forty rather than thirty since batch 8: on the retuned sheet the focus arm
    // (and with it the hammer premium's positive face) is first reached at t32.
    for (const step of playedDuel().filter((played) => played.sitting < 40)) {
      for (const candidate of step.decision.candidates) {
        if (candidate.rejected !== undefined) continue;
        const printed = JSON.stringify(candidate.terms);
        for (const mark of marks) if (printed.includes(mark)) seen.add(mark);
        if (foldTerms(candidate.terms) !== candidate.score) {
          failures.push(`${step.decision.kind}/${candidate.label}: score is not its fold`);
        }
        failures.push(...partFoldFailures(candidate.terms, `${step.decision.kind}/${candidate.label}`));
      }
    }
    expect(failures).toEqual([]);
    // Every term this batch added is actually printed somewhere in forty turns
    // of a duel — the claim that keeps the audit above from being vacuous. The
    // hammer premium's *negative* face is not on the list and deliberately: a
    // duel's first thirty turns never run out of engines to raise, so the charge
    // for hammers nobody is waiting on is pinned directly instead (see 'folds as
    // a difference from the table').
    expect([...seen].sort()).toEqual([...marks].sort());
  });
});
