/**
 * **The tech chain: a goal, the steps that realise it, and what finishing it is
 * worth from here.**
 *
 * Batch 3 of `docs/bot-priorities.md`, and the answer to the sentence the spec
 * wrote against `explainTechGifts`: *"subsumes and corrects `explainTechGifts`'s
 * every-town optimism."* Until this module the beeline priced a node by what its
 * buildings would pay **in every town of the empire**, discounted once for the
 * raising — and then nothing anywhere ever checked that a town raised one. An
 * empire could research the node that unlocks the University, bank the whole
 * promise in the appraisal that chose it, and never build a University at all.
 *
 * A **chain** is that promise written down as an obligation:
 *
 *   · a **goal** node, and the beakers still owed for the road to it;
 *   · the **steps** that realise it — a building and the towns that would raise
 *     it, a piece worth fielding, a renewal rider worth working;
 *   · a **delay** through the whole of it: the beakers over the science rate,
 *     and then the build turns of each step in order;
 *   · a **worth**: the steps' payoffs at their own delays, less what the chain
 *     still owes in beakers and hammers, priced in the one currency.
 *
 * Four rules hold it together, and each is load-bearing.
 *
 *   · **A realised step drops out by construction.** A town that already holds
 *     the row is not a town that would raise it, so the step's `towns` falls, the
 *     hammers it owes fall with them, and a step every town has holds no place in
 *     the chain at all. Nothing is stored and nothing is marked done — the board
 *     *is* the memory, which is principle 3 of the spec. The commitment story
 *     falls out of it: a half-paid chain's remaining worth **rises** as it is
 *     paid, because the payment has left the ledger and the payoff has not, and
 *     that is what makes an incumbent hard to displace without a single flag.
 *   · **The worth is the fold of the printed terms.** `worth === foldTerms(terms)`
 *     exactly, `decision.ts`' contract, and the reason the spectate feed and the
 *     bot's own comparison can never disagree.
 *   · **It never restates a rule.** The road is `researchExpansion`, the gate on
 *     whether a town could raise a row is `buildError`, and what a building pays
 *     is `explainBuildingRow` plus the row's flats — the same folds
 *     `explainTechGifts` always asked, in the same order, printing the same
 *     labels. This module owns the *arithmetic around* them, not the readings.
 *   · **A tech already held is a chain with no beakers left to pay.** That is the
 *     university fix in one sentence: the empire that holds the technology is on
 *     a chain whose only remaining steps are buildings, so the build arm sees
 *     them as steps and raises them (`liveChains`).
 *
 * **Beakers are time; hammers are coin.** Two currencies, two different answers,
 * and the ruling that separated them is the user's of **2026-09-09**
 * (`docs/flags.md`, item (ggg)): *"science really only should be valued when it's
 * a gain in yields … we shouldn't be thinking about science spend with the same
 * value we're thinking about science gain."*
 *
 * A beaker is not spent by choosing this goal. Research **always runs**: the
 * empire banks its science every turn and pours it into whatever the plan names,
 * so aiming at A does not consume anything that aiming at B would have kept. The
 * only real cost of A is that **B arrives later** — and this chain already
 * carries that, more exactly than a lump ever could. `researchDelay` is the
 * beakers still owed over the empire's own science rate, the build cursor starts
 * there, and every payoff behind the goal is discounted through it (`delayTerm`).
 * Subtracting the same beakers a second time at `weights.science` was one thing
 * charged twice, and it is why most of the tree scored below zero: 62–78% of
 * every node weighed on the audit's bench (`docs/bot-priorities.md`, batch X1),
 * and a negative chain is then mishandled twice more — the incumbent's
 * `switchMargin` multiplies, so it makes a *negative* plan easier to displace,
 * and `chainStepShare` pushes the chain's own buildings down every town's queue.
 * **Batch X1b removed it.** The road's beakers are still printed, beside the
 * delay they bought, and folded at nothing.
 *
 * Science a step **gains** is untouched by that and always was: a library's
 * beakers are a yield, folded by `explainYields` at `weights.science` like food
 * or coin. The ruling is about the *spend*, and the spend below is a delay.
 *
 * A hammer is the other case, and keeps its subtraction. A town's stones are not
 * something the empire pours out regardless: they queue. A row raised is a row
 * some other row waited for, so what the steps still owe comes off the worth at
 * `weights.production`, through `explainLump` — the bot's one lump-to-rate
 * exchange, so the whole chain stays a *per-turn* figure like every other
 * appraisal in the bot.
 *
 * **Nowhere else in this file lumps a beaker**, which is worth saying because the
 * ruling is a rule about all three chains. The expansion chain has no beakers at
 * all; the bead race owes a road and folds it into `delay` and into a
 * zero-valued label, exactly as the tech chain now does; `chainCompression`,
 * `chainStepShare`, `townChainShare` and `raceTerm` all divide a worth that no
 * longer carries one. The one remaining `explainLump` below is the hammers'.
 *
 * Batch 4 was to give hammers a shadow price of their own and **deliberately did
 * not**, which is the batch's one written-down non-delivery. The spec offered an
 * escape hatch — *"leave at `weights.production` with a doc note if no honest
 * cheap reading exists"* — and there is none, for a reason particular to this
 * bot: a price is a reading of *scarcity*, and the two cheap empire-level
 * readings of hammer scarcity both answer the same number every turn. The share
 * of towns with a non-empty queue is 1.0 by construction — `cityProduction` is an
 * End Turn blocker the bot answers every turn, so a bot town is never idle when
 * anything asks what its hammers are worth — and median queue depth
 * is one or two rows in every empire on every board. A factor that is always one
 * is a multiplication by one wearing a price, and the honest alternative (what
 * the best candidate in each town would pay per hammer) is the per-town auction
 * the brief rules out. So the table stands in, it is written down here, and the
 * one `explainLump` call below remains the only line that would change.
 *
 * **The road, and the towns on it** (batch X1d, the user's ruling of 2026-09-09,
 * `docs/flags.md` item (ggg)). Two of this module's crudenesses were the same
 * crudeness twice, and both are gone.
 *
 * The first was a *goal* priced by `techDef(goal).unlocks` alone: the road's
 * intermediate nodes contributed beakers and delay and no gifts at all, so a
 * three-node beeline was worth its destination and nothing it walked through.
 * *"The value of a tech path isn't just based on the thing the tech unlocks, it
 * also includes the value of all the prerequisite techs that you research along
 * the way."* So `techChain` walks the whole of `researchExpansion(goal)`,
 * accumulating beakers as it goes; **every node's gifts are steps**, landing at
 * that node's own cumulative beakers over the science rate. A deep goal is worth
 * what the road hands over. The road's nodes overlap between goals almost
 * entirely, so a node's gifts are folded **once a sitting** and reused by every
 * goal that passes it, only the discount differing (`nodeGifts`).
 *
 * The second was a *step* priced as the row's flat bag times a town count, raised
 * one after another by a middling town. *"The value of a library is contingent on
 * the city that builds it."* So a building step is now a list of **copies**, one
 * per town that would raise it (`StepCopy`, and `buildingCopies` for the ruling
 * in full): each copy priced by that town's own hypothetical fold, each landing
 * at that town's own `turnsToBuild`, each discounted at its own landing, and each
 * queued behind the copies **its own town** owes earlier on the same road. Towns
 * raise in parallel, so the cursor is per town rather than per empire.
 *
 * A unit unlock advances no cursor at all: it is an option the empire may take
 * the turn its node lands, never an obligation, and it starts paying the turn the
 * node lands — **and waits for the road until then**, which is X1b's second half
 * below.
 *
 * **Why a unit step used to be free, and why it is not** (batch X1,
 * `docs/audit/bot-pass-2.md`). "An option, never an obligation" was the argument
 * for `cost: 0`, and as far as the *cursor* goes it still holds — nothing waits
 * on a piece nobody has decided to raise. But it was also used to excuse the
 * hammers, and there the argument does not hold: an empire three spears short of
 * its levy that researches Bronze Panoply raises three spears, and those hammers
 * are as real as a library's. Batches P1 and S1 had made both sides of this
 * subtraction dearer and left the unit side untouched, so a node whose gift was a
 * spearman was a pure positive while a node whose gift was a library was a
 * positive minus a big number — measured, **62–64% of every node weighed scored
 * negative and 61–63% of every re-aim was military**. So a unit step now takes
 * its hammers the way a building step does, at the count the levy itself asks
 * for (`levyReading`, `campaign.ts`, shared with the town's own build arm), and
 * `unitTerm`'s threat premium is charged against that same shortfall rather than
 * unconditionally.
 *
 * X1's own acceptance then failed on the negative share, and the audit wrote down
 * why: the share is a reading of the *other* side of the subtraction, which the
 * unit step does not own. **X1b is the answer to it** — the beaker half of that
 * subtraction was never a cost at all (see above), and with it gone what is left
 * of a negative node is what its hammers account for.
 *
 * **And the option waits for the road** — X1b's second half, and the ruling's own
 * premise rather than an addition to it. The ruling removes the lump *because*
 * the chain already carries the road "as its delay, discounting every payoff
 * behind it", and for a building step it did: its `delay` starts at the cursor's
 * `researchDelay` and `delayTerm` multiplies it. For the option a node hands over
 * it did **not** — `unitTerm` was folded at full price on a node nobody had
 * researched, which is the very thing the beeline's flats were corrected for in
 * batch 3. Removed the lump and left alone, that would leave a military node's
 * road priced by *nothing at all*, and the bench says so plainly: the military
 * share of re-aims went **up** (71% → 88% and 85% → 87%) and the tree shrank.
 * So the unit gift multiplies by the road's own discount, exactly as the flats
 * do, and the two halves shipped together (the measurement of each alone is in
 * `docs/bot-priorities.md`, "Batch X1b as shipped").
 *
 * **And every other gift waits with it since X1d.** The conversion projects and
 * abilities a node counts, the glass bead it pays and the rules it carries were
 * all folded at full price on a node nobody had researched — tolerable while a
 * chain priced one node, and not tolerable at all once it prices ten, because a
 * constant per node folded undiscounted makes a chain worth more for being
 * *longer*. Each is multiplied by its own node's landing now. The one exception
 * is the race's share of a bead-paying node (`raceTerm`), which carries
 * `beadChain`'s own clock and would otherwise be discounted twice.
 *
 * **Three chains live here now**, in the order the batches added them: the tech
 * chain above, the **expansion** chain (batch 4 — the next town, its settler, its
 * walk and the meters founding would over-spend), and the **bead race** (batch 5
 * — the whole road from here to a closed great work, at `weights.victory`). They
 * share the shape and nothing else: a delay derived from the board, invests
 * priced in the one currency, a worth that is the fold of its printed terms, and
 * a share the arms fold when a candidate is one of the things that still has to
 * happen. Each has its own docblock; this one covers the first.
 */

import { type LevyReading, isFieldSoldier, levyReading } from './campaign';
import { citizenKeepTerm } from './citizen';
import { type Appraisal, type ValueTerm, appraise, foldTerms, nest } from './decision';
import { renewalFoldFor } from './plan';
import { caravanRefusal, explainCaravan } from './routes';
import {
  type ValueContext,
  buildTurns,
  delayDiscount,
  delayTerm,
  explainBuildingRow,
  explainEffects,
  explainLump,
  explainMeterCall,
  explainSoldier,
  explainYields,
  yieldDelta,
} from './value';
// **The town folds** (batch X1d) — the standing and hypothetical folds of every
// town, shared with the build arm and both banks. A leaf, so the chain may stand
// on it: `wants.ts` stands on this file.
import { type TownFolds, townFolds } from './townFolds';

import { BEAD_RULES } from '../sim/beadData';
import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import { buildingProductionCost, unitProductionCost } from '../sim/cities';
import { authorityOf, happinessOf } from '../sim/meters';
import { type ProjectId, projectDef } from '../sim/projectData';
import { type City, type GameState, type Player, realPlayers } from '../sim/state';
import { buildError, gatingTech, opusOpen, researchExpansion, researchPlan } from '../sim/tech';
import { type TechId, techDef } from '../sim/techData';
import { type UnitTypeId, isCombatant, isExplorer, trades, unitDef } from '../sim/unitData';
import { round } from './decision';

/** What a step of a chain is: a row a town raises, a piece, or ground worked. */
export type ChainStepKind = 'building' | 'unit' | 'rider';

/**
 * **One copy of a step, in the town that would raise it** — batch X1d, and the
 * user's ruling of 2026-09-09 (`docs/flags.md` item (ggg)): *"the value of a
 * library is contingent on the city that builds it: a city in your capital with
 * high population is worth a lot of science, and is built faster than a middling
 * city."*
 *
 * Until this batch a building step was **one** number: the row's flat bag (a
 * Library's `science: 2`) times the count of towns that lacked it, raised at a
 * middling town's production. Three things were wrong with that and the ruling
 * names two of them. The flat bag is not what a row pays — a Library's
 * `sciencePerPop` never entered it at all, nor a Lighthouse's fish, nor the
 * percentages, nor anything a slotted card adds — and a size-13 capital and a
 * size-2 hamlet were quoted the same figure at the same build time.
 *
 * A copy answers all three, because a copy is a *pair*: this town, that row. Its
 * payoff is the town's own hypothetical fold with the row standing in it, against
 * the town's standing fold (`townFolds`, the grid the two banks were already
 * sharing), plus what the row gives beyond a yield in that town
 * (`explainBuildingRow`). Its landing is that town's own `turnsToBuild`, after the
 * copies this same town owes earlier on the same road. And because the fold is
 * `foldCity`'s, it honours everything the simulation honours — the citizens
 * standing on the hexes, the two stages of percentages, the luxuries, and the
 * cards this empire has slotted. A University under a card that boosts
 * universities reads the boost, with no rule written anywhere in the bot.
 */
export interface StepCopy {
  /** The town that would raise it. */
  cityId: number;
  /** Its name, for the label the feed prints. */
  town: string;
  /** Hammers this town still owes for it. */
  cost: number;
  /** What one turn of it would pay **in this town**, undiscounted. */
  rate: number;
  /** Turns until this copy starts paying: its node's landing, then its own builds. */
  delay: number;
  /** `rate` at `delay` — this copy's folded contribution to the chain's worth. */
  value: number;
}

/**
 * One thing that has still to happen before the goal has paid for itself.
 *
 * `towns` is the count the step is still owed by — towns that would raise the
 * building, one for a piece, hexes for a rider — and it is the field the whole
 * sunk-cost story runs through: a town that has already built the row is not
 * counted, so `towns` falls as the chain is executed and a step nobody owes
 * anything for is never made at all.
 */
export interface ChainStep {
  kind: ChainStepKind;
  /** `BuildingId`, `UnitTypeId` or an `ImprovementId`, as a plain string. */
  id: string;
  /** Plain words, for the label the arms print. */
  name: string;
  /** How many towns (or hexes) still owe this step. Never zero — see above. */
  towns: number;
  /**
   * **The copies this step is made of**, one per town that would raise the row
   * (batch X1d) — `towns === copies.length` for a building step exactly.
   *
   * A unit step and a renewal rider carry a single copy apiece, and for a
   * different reason each: a node hands over an *option*, which is one thing that
   * may happen wherever the empire likes, and a rider is ground rather than a
   * raising. Their `towns` is therefore not their copy count (a rider's is hexes),
   * which is why the two fields are separate rather than one derived from the
   * other. The three aggregates below are the copies' folds and nothing else.
   */
  copies: StepCopy[];
  /** Hammers the empire still owes for it, across those towns. Zero for a rider. */
  cost: number;
  /** What one turn of it would pay, **undiscounted**. The compression's lever. */
  rate: number;
  /** Turns until it starts paying — the **first** copy's landing. */
  delay: number;
  /** Its folded contribution to the chain's worth — every copy at its own delay. */
  value: number;
  terms: ValueTerm[];
}

/** A goal, its steps and what finishing it is worth. See the module docblock. */
export interface TechChain {
  goal: TechId;
  /** The nodes still owed for the goal. Empty when the empire already holds it. */
  road: TechId[];
  /** True when the goal is held and only the realisation is outstanding. */
  held: boolean;
  remainingBeakers: number;
  /** `remainingBeakers ÷ the science rate` — the wait before any step can start. */
  researchDelay: number;
  steps: ChainStep[];
  /**
   * **How many things still have to happen** — the raisings the steps are owed
   * by, summed (`Σ step.towns`), not the number of steps.
   *
   * The divisor touch point (b) shares a chain's worth by, and the count is over
   * raisings rather than rows for the reason the `towns` field exists at all: a
   * library owed by three towns is three things that still have to happen, and a
   * town that raises one of them has done a third of that step. Sharing by the
   * row count instead would hand every one of those three towns the whole step's
   * worth, which is the every-town optimism this module was written to correct,
   * wearing a different hat.
   */
  stepsRemaining: number;
  /** Hammers every remaining step still owes, summed. */
  hammers: number;
  /** When the last step of the chain would start paying. */
  delay: number;
  /** The fold of `terms`, and never anything else. */
  worth: number;
  /**
   * The unlock terms alone, in the order the beeline always printed them — what
   * `explainTechGifts` now *is* (`bot.ts` keeps the name as a thin reading).
   */
  gifts: Appraisal;
  terms: ValueTerm[];
}

/**
 * **The goal this empire is already aiming at**, derived and never stored — the
 * *last* node of `researchPlan(player)`.
 *
 * The plan a `chooseResearch` installs is `researchExpansion(goal)`, which is
 * sorted by `techDepth`, so the destination is what the road ends at. Reading it
 * back off the plan is the whole of the incumbency mechanism: there is no
 * remembered goal anywhere in this bot, and a replay that re-installs the same
 * plan reads the same incumbent.
 */
export function incumbentGoal(player: Player): TechId | null {
  const plan = researchPlan(player);
  return plan.length === 0 ? null : plan[plan.length - 1]!;
}

/**
 * **Every chain this empire is currently executing**, in a deterministic order:
 * the research goal it is aiming at, then one chain per technology it **holds**
 * whose buildings some town of its could raise and has not.
 *
 * That second family is the university fix. A technology whose road is walked is
 * a chain with no beakers left to pay and its buildings still outstanding, so the
 * empire that holds the tech has a live chain saying *raise them* — and the build
 * arm folds `worth ÷ stepsRemaining` for a candidate that is one of its steps
 * (touch point (b) of the spec). Nothing is remembered: the chain is live exactly
 * while a town could still raise one of its rows, and it stops existing the turn
 * the last one goes up.
 *
 * **No ground survey is taken here** (`sites` is left undefined), which is the
 * context's bargain: `valueContext` is asked once per *decision* — a unit order
 * included — and `surveyUpgradeSites` walks every owned hex against every
 * improvement row. The renewal riders are therefore absent from these chains and
 * present in the beeline's, where they decide a goal and where the sweep is
 * hoisted once for the whole table (`techGoalTable`). A rider is a reason to want
 * a *node*, not a reason for a town to raise a *building*, so the split costs the
 * arms that read this nothing.
 *
 * **The negative floor** (batch 6 of `docs/bot-priorities.md`). A held-tech chain
 * whose remaining worth has turned negative — the hammers its unbuilt rows still
 * owe outweigh what finishing them would pay — is **dropped from the book**, and
 * its rows are then appraised exactly as any other row: on their own merits, with
 * no chain term at all.
 *
 * The reason is what the two families of chain *are*. The research goal is a
 * **plan**, and a plan whose worth has gone negative is a plan to abandon: it
 * keeps its honest negative, `techGoalTable`'s margin multiplies it, and the
 * beeline is displaced (batch 3's stated behaviour, unchanged). A held-tech chain
 * is not a plan at all — nobody chose it, it is the standing observation *"this
 * empire holds Writing and two of its towns lack libraries"* — so it is
 * **advice**, and advice worth less than nothing is advice to withhold. Left in,
 * it would charge a town for a debt no arm ever took on: a marginal engine's
 * library would appraise *worse* than the same library in an empire that had
 * never researched Writing, which is an empire punished for holding a
 * technology. The floor is the rule that a chain may raise a candidate and may
 * leave it alone, and may never make it read worse than chainless.
 */
export function liveChains(state: GameState, player: Player, ctx: ValueContext): TechChain[] {
  const goals: TechId[] = [];
  const incumbent = incumbentGoal(player);
  if (incumbent !== null) goals.push(incumbent);
  for (const id of BUILDING_IDS) {
    const tech = gatingTech('building', id);
    if (tech === null || goals.includes(tech)) continue;
    if (!player.techsResearched.includes(tech)) continue;
    if (!someTownCouldRaise(state, player, id)) continue;
    goals.push(tech);
  }
  const chains: TechChain[] = [];
  for (let index = 0; index < goals.length; index++) {
    const chain = techChain(state, player, ctx, goals[index]!);
    if (chain.stepsRemaining <= 0) continue;
    // Index 0 is the incumbent when there is one (it is pushed first, above),
    // which is the plan the margin defends and the one chain allowed a negative.
    const plan = incumbent !== null && index === 0;
    if (!plan && chain.worth <= 0) continue;
    chains.push(chain);
  }
  return chains;
}

/** The chain among these that owes this row, or `null`. First match, in order. */
export function chainStepFor(
  chains: readonly TechChain[],
  kind: ChainStepKind,
  id: string,
): { chain: TechChain; step: ChainStep } | null {
  for (const chain of chains) {
    for (const step of chain.steps) {
      if (step.kind === kind && step.id === id) return { chain, step };
    }
  }
  return null;
}

/**
 * **What one step of a chain is worth to whoever takes it** — touch point (b).
 *
 * `worth ÷ stepsRemaining`, and `stepsRemaining` is the count of **raisings**
 * (`Σ step.towns`), which since batch X1d is the count of *copies*: a Library
 * three towns lack is three things that still have to happen, and the town that
 * raises one of them has done a third of that step. So a copy's share is the
 * chain's worth over every copy the chain still owes — **equal across copies**,
 * even though the copies' own payoffs differ, and deliberately so. The capital's
 * copy is already worth more than the hamlet's *inside* `worth`, because the
 * capital's own fold went in at the capital's own delay; weighting the share by
 * the copy on top of that would price the same beakers twice. What the arm that
 * raises the row folds beside this term is the town's own yield delta, which is
 * where the difference between a capital and a hamlet belongs.
 */
export function chainStepShare(chain: TechChain): number {
  return chain.worth / Math.max(1, chain.stepsRemaining);
}

/**
 * **The chain for one goal**, built from the board and nothing else.
 *
 * See the module docblock for the shape and the crudenesses. The one thing worth
 * repeating beside the code: the unlock terms below are `explainTechGifts`'
 * own, clause for clause and label for label, because the beeline's printed
 * appraisal is a thing the spectate feed and four tests read — what changed is
 * that the town count is now *the towns that would raise it* rather than every
 * town in the empire, and that the delay is the whole chain's rather than one
 * row's build.
 */
export function techChain(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  goal: TechId,
): TechChain {
  const ai = ctx.ai;
  const { road, beakers: remainingBeakers, delay: researchDelay } = researchRoad(state, player, ctx, goal);
  const held = road.length === 0;
  // **The whole road, node by node** (batch X1d(b)). A held goal is a road of
  // one that is already walked; anything else is every node `researchExpansion`
  // laid down, in its own depth order, and each of them hands something over.
  const nodes = held ? [goal] : road;
  const rate = Math.max(1, ctx.scienceRate);

  const steps: ChainStep[] = [];
  const giftTerms: ValueTerm[] = [];
  // **The town folds, once for the sitting** (`townFolds.ts`): the standing fold
  // of every town and the hypothetical of every (town, row) pair this chain
  // touches, shared with the build arm and both banks.
  const folds = townFolds(state, player);
  // **A build cursor per town, not one for the empire.** Towns raise in
  // *parallel* — the capital and a hamlet both start the turn the node lands —
  // so what a copy waits for is the copies **its own town** owes earlier on this
  // same road, and nothing a different town is doing. The old single cursor was
  // one middling town raising the whole chain end to end, which both over-stated
  // the wait for the first row and under-stated the hammers behind the last.
  const cursors = new Array<number>(folds.towns.length).fill(0);

  // **The levy, once for the whole chain** (batch X1). Every unit step reads it
  // and it is a walk of the roster and the town list, so it is hoisted the way
  // the sites survey is — and it is `campaign.ts`' reading rather than a second
  // one, so the chain and the town agree about how many spears this empire
  // wants. See `unitStepCost` for what it buys.
  const levy = levyReading(ctx);

  let owedSoFar = 0;
  for (const node of nodes) {
    if (!held) owedSoFar += techDef(node).cost;
    // **Where this node lands**: the beakers owed for the road *through* it over
    // the empire's own science rate. The last node's landing is `researchDelay`
    // exactly, which is the identity that keeps the whole-road reading a
    // refinement of the old one rather than a different clock.
    const landing = held ? 0 : owedSoFar / rate;
    const gifts = nodeGifts(ctx, node, levy, folds);
    const why = held
      ? 'the towns have still to raise it'
      : `the ${techDef(node).name} node has to land and the towns to raise it`;

    for (const unit of gifts.units) {
      // **The option waits for its node** (batch X1b's second half, and X1d's
      // road). It advances no cursor — nothing queues behind a piece nobody has
      // decided to raise — but it is still a payoff on the far side of the road,
      // and a promise is worth less the longer it takes.
      const wait = held ? null : delayTerm(landing, ctx, `the ${techDef(node).name} node has still to land`);
      const term: ValueTerm =
        wait === null
          ? unit.bare
          : { label: unit.bare.label, value: unit.bare.value * wait.value, parts: [unit.bare, wait] };
      giftTerms.push(term);
      steps.push({
        kind: 'unit',
        id: unit.id,
        name: unit.name,
        // **One raising, and the hammers of as many as the levy is short.** The
        // asymmetry is deliberate and is the whole of batch X1. A node hands the
        // empire an *option*, so it is one thing that still has to happen and it
        // is priced as one piece — a chain that counted the shortfall as five
        // raisings would dilute every building step's share by an army nobody has
        // decided to raise. But the option is not free: an empire three spears
        // short of its levy that takes this node will raise three spears, and
        // those hammers are as real as a library's.
        towns: 1,
        copies: [
          { cityId: -1, town: 'wherever the empire likes', cost: unit.cost, rate: term.value, delay: landing, value: term.value },
        ],
        cost: unit.cost,
        rate: term.value,
        delay: landing,
        value: term.value,
        terms: [term],
      });
    }

    for (const row of gifts.buildings) {
      // **Realised steps drop out by construction.** Every town holds it (or the
      // world's one copy of the wonder is claimed, or no town of this empire
      // makes a hammer), so there is nothing left of this step to owe, to wait
      // for or to pay — and the chain says so by having no such step at all.
      if (row.copies.length === 0) continue;
      const copies: StepCopy[] = [];
      const copyTerms: ValueTerm[] = [];
      let cost = 0;
      let rateSum = 0;
      let value = 0;
      let first = Number.POSITIVE_INFINITY;
      for (const copy of row.copies) {
        // Its own town's queue, and its own town's rate. The copy starts when the
        // node lands or when this town's earlier copies are up, whichever is
        // later, and it starts paying `raise` turns after that.
        const start = Math.max(cursors[copy.index]!, landing);
        const delay = start + copy.raise;
        cursors[copy.index] = delay;
        const priced = priceCopy(ctx, row.id, copy);
        const discount = delayTerm(delay, ctx, why);
        const term: ValueTerm = {
          label: `${row.name} at ${copy.town}`,
          value: priced.rate * discount.value,
          parts: [...priced.terms, discount],
        };
        copyTerms.push(term);
        copies.push({
          cityId: copy.cityId,
          town: copy.town,
          cost: copy.cost,
          rate: priced.rate,
          delay,
          value: term.value,
        });
        cost += copy.cost;
        rateSum += priced.rate;
        value += term.value;
        if (delay < first) first = delay;
      }
      const stepTerm: ValueTerm = {
        label: `${row.name} — in ${copies.length} town${copies.length === 1 ? '' : 's'} that would raise it`,
        value,
        parts: copyTerms,
      };
      giftTerms.push(stepTerm);
      steps.push({
        kind: 'building',
        id: row.id,
        name: row.name,
        towns: copies.length,
        copies,
        cost,
        rate: rateSum,
        delay: first,
        value,
        terms: [stepTerm],
      });
    }

    // **The flat gifts wait for their node too** (batch X1d). Before the road was
    // walked there was one node and its projects, abilities, bead and rules were
    // folded at full price; now there are ten of them down a long road, and a
    // constant per node folded undiscounted would make a chain worth more for
    // being longer. So each is multiplied by its own node's landing, and only the
    // race's own share is left alone — it carries `beadChain`'s clock already.
    const stand = held ? null : delayTerm(landing, ctx, `the ${techDef(node).name} node has still to land`);
    for (const flat of gifts.flat) {
      giftTerms.push(
        stand === null
          ? flat
          : { label: flat.label, value: flat.value * stand.value, parts: [flat, stand] },
      );
    }
    for (const flat of gifts.undiscounted) giftTerms.push(flat);
    for (const rider of renewalSteps(node, ctx, landing)) {
      for (const term of rider.terms) giftTerms.push(term);
      steps.push(rider);
    }
  }

  const gifts = appraise(giftTerms);
  let hammers = 0;
  let raisings = 0;
  let last = researchDelay;
  for (const step of steps) {
    hammers += step.cost;
    raisings += Math.max(1, step.towns);
    for (const copy of step.copies) {
      if (copy.delay > last) last = copy.delay;
    }
  }
  const terms: ValueTerm[] = [nest('what the goal unlocks, step by step', gifts)];
  if (!held) {
    terms.push({ label: 'holding one more technology', value: ai.weights.tech });
    // **Printed, and folded at nothing** (batch X1b; the user's ruling of
    // 2026-09-09, `docs/flags.md` item (ggg)). The beakers are not a cost — they
    // are a *wait*, and the wait is already charged: `researchDelay` is this very
    // figure over the science rate, the cursor above starts there, and every
    // payoff in `gifts` was discounted through it. Subtracting them again at
    // `weights.science` charged one thing twice and put most of the tree below
    // zero. `expansionChain`'s two zero-valued labels are the same device: say
    // what is owed, beside the number that was actually multiplied.
    terms.push({
      label:
        `(the ${Math.round(remainingBeakers)} beakers still owed for the road are charged by the ` +
        `${round(researchDelay)} turns every payoff above waits through)`,
      value: 0,
    });
  }
  if (hammers > 0) {
    terms.push(
      nest(
        `the ${Math.round(hammers)} hammers its steps still owe`,
        explainLump({ production: hammers }, ctx),
        'sub',
      ),
    );
  }
  return {
    goal,
    road,
    held,
    remainingBeakers,
    researchDelay,
    steps,
    stepsRemaining: raisings,
    hammers,
    delay: last,
    worth: foldTerms(terms),
    gifts,
    terms,
  };
}

/**
 * **What buying one copy of a step would buy the chain, in turns** — gold's
 * bridge role (the batch-1 deferral, `docs/bot-priorities.md`).
 *
 * A university delivered by the purse is a university nobody has to spend
 * `raise` turns raising, so every step from this one onward starts paying that
 * much sooner. The compression is the difference between the chain's payoffs at
 * the compressed delays and at the standing ones — the chain's own arithmetic,
 * read off the chain object rather than recomputed.
 *
 * **Divided by the step's towns**, and since batch X1d that division is *exact
 * in expectation* rather than the crude stand-in it was written as. A purse buys
 * one copy of a row several towns owe, and it hurries only the copies **that
 * town** still has to raise — which is a thing the chain now knows, because a
 * building step is a list of copies each on its own town's cursor. Summing every
 * later copy's improvement and dividing by the towns is the average over which
 * town takes delivery, and the caller (`bridgeTerm`, `wants.ts`) does not say
 * which one that is. The one crudeness left is `raise` itself: the middling
 * town's turns over one copy's stones, because a bridge is priced before the
 * town is chosen.
 */
export function chainCompression(
  chain: TechChain,
  step: ChainStep,
  ctx: ValueContext,
): Appraisal {
  const raise = buildTurns(stepUnitCost(step), ctx);
  if (raise <= 0) return appraise([]);
  const share = Math.max(1, step.towns);
  const terms: ValueTerm[] = [];
  let reached = false;
  for (const other of chain.steps) {
    if (other === step) reached = true;
    if (!reached || other.kind !== 'building') continue;
    for (const copy of other.copies) {
      const sooner = delayDiscount(copy.delay - raise, ctx) - delayDiscount(copy.delay, ctx);
      if (sooner <= 0) continue;
      terms.push({
        label: `${other.name} at ${copy.town} pays ${round(raise)} turns sooner`,
        value: (copy.rate * sooner) / share,
      });
    }
  }
  return appraise(terms);
}

/**
 * The hammers one copy of a step costs — the whole owed, over the towns owing.
 *
 * Asked of a **building** step only (`chainCompression` and `townChainShare`,
 * both of which filter on the kind), and that is worth saying out loud since
 * batch X1: a unit step's `towns` is the one option the node hands over while
 * its `cost` is the whole levy shortfall's hammers, so the division would answer
 * "three spears" rather than "one spear" for a step nobody is buying a copy of.
 */
export function stepUnitCost(step: ChainStep): number {
  return step.cost / Math.max(1, step.towns);
}

/**
 * **The road to a node, the beakers it still owes and the turns that is** — the
 * three lines every chain in this module opens with, written once.
 *
 * `researchExpansion` is the simulation's own depth-ordered expansion, so an
 * empire that holds the node gets an empty road and no wait at all. The rate is
 * `ValueContext.scienceRate` — the empire's books, floored at a beaker a turn so
 * a seat researching nothing is treated as slow rather than as never arriving.
 */
export function researchRoad(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  goal: TechId,
): { road: TechId[]; beakers: number; delay: number } {
  const road = researchExpansion(state, player.id, goal);
  let beakers = 0;
  for (const step of road) beakers += techDef(step).cost;
  return { road, beakers, delay: beakers / Math.max(1, ctx.scienceRate) };
}

// --- a node's gifts, once for the sitting -------------------------------------

/**
 * One town's copy of a row a node unlocks, **before** any discount — and
 * **before the fold**, which is the whole of why it is a mutable record.
 *
 * `raise` is read off the town's standing quote and costs nothing beyond a
 * division; the *payoff* is a hypothetical `explainCity` over the town's worked
 * hexes, which is the dearest question this module asks. Most copies never need
 * it: a road of six nodes and eight towns is forty-eight copies, and the ones
 * whose landing is past `priorities.horizonTurns` fold to nought whatever they
 * would have paid. So the fold is asked on first use and remembered on the record
 * (`priceCopy`), and a copy nobody reaches is never folded at all.
 */
interface NodeCopy {
  /** Its place in `TownFolds.towns` — the cursor's index. */
  index: number;
  cityId: number;
  town: string;
  cost: number;
  /** Turns this town would take over it, its own production (`turnsToBuild`). */
  raise: number;
  /** The town, so the fold can be asked late. */
  city: City;
  folds: TownFolds;
  /** What one turn of it would pay in this town, and the folds behind it. */
  priced: { rate: number; terms: ValueTerm[] } | null;
}

/** The copy's payoff, folded on first ask and remembered. See `NodeCopy`. */
function priceCopy(ctx: ValueContext, id: BuildingId, copy: NodeCopy): { rate: number; terms: ValueTerm[] } {
  if (copy.priced !== null) return copy.priced;
  const delta = yieldDelta(copy.folds.with(copy.index, id), copy.folds.standing(copy.index));
  const yields = explainYields(delta, ctx);
  const row = explainBuildingRow(id, ctx, copy.city);
  const priced = {
    rate: yields.total + row.total,
    terms: [
      nest('what this town would actually make with it', yields),
      nest('what its row gives beyond a yield', row),
    ],
  };
  copy.priced = priced;
  return priced;
}

interface NodeBuilding {
  id: BuildingId;
  name: string;
  copies: NodeCopy[];
}

interface NodeUnit {
  id: UnitTypeId;
  name: string;
  /** `unitTerm`'s own appraisal, undiscounted. */
  bare: ValueTerm;
  /** The levy shortfall's hammers. See `unitStepShortfall`. */
  cost: number;
}

/**
 * **Everything one node hands over, before anybody says when it lands.**
 *
 * `flat` waits for the node like everything else; `undiscounted` is the one term
 * that carries its own clock (the race's share of a bead-paying node).
 */
interface NodeGifts {
  units: NodeUnit[];
  buildings: NodeBuilding[];
  flat: ValueTerm[];
  undiscounted: ValueTerm[];
}

/**
 * **What a node gives, computed once a sitting and reused by every goal whose
 * road passes it** — the user's refinement of 2026-09-09 (`docs/flags.md` item
 * (ggg)): *"a node's gifts are computed once per sitting and reused by every goal
 * whose road passes it, only the discount differing."*
 *
 * That sentence is the whole reason the road can be walked at all. The beeline
 * weighs every unresearched node inside `research.goalHorizon`, and the roads of
 * fifty goals overlap almost completely — Writing is on the road to Philosophy,
 * to Mathematics and to twenty nodes behind them. Priced per goal, one node's
 * towns would be folded twenty times over. Priced here, each node's copies are
 * folded once and every goal that passes through multiplies them by a different
 * `delayTerm`.
 *
 * `MARGIN_MEMO`'s bargain exactly (`value.ts`), and its lifetime for its reason:
 * keyed weakly on the `ValueContext`, which is one seat's sitting, and every
 * reading below is a function of that context and the board it was opened on. A
 * new context is a new opinion about a new board and gets a fresh table. The
 * (town, row) folds underneath are keyed one level down — on the board's own
 * revision (`townFolds.ts`) — so two contexts of one sitting share them.
 */
const NODE_MEMO = new WeakMap<ValueContext, Map<TechId, NodeGifts>>();

function nodeGifts(ctx: ValueContext, node: TechId, levy: LevyReading, folds: TownFolds): NodeGifts {
  let held = NODE_MEMO.get(ctx);
  if (held === undefined) {
    held = new Map<TechId, NodeGifts>();
    NODE_MEMO.set(ctx, held);
  }
  const found = held.get(node);
  if (found !== undefined) return found;
  const fresh = readNodeGifts(ctx, node, levy, folds);
  held.set(node, fresh);
  return fresh;
}

function readNodeGifts(ctx: ValueContext, node: TechId, levy: LevyReading, folds: TownFolds): NodeGifts {
  const ai = ctx.ai;
  const def = techDef(node);
  const unlocks = def.unlocks;
  const units: NodeUnit[] = [];
  for (const unit of unlocks.units ?? []) {
    const row = unitDef(unit);
    units.push({
      id: unit,
      name: row.name,
      bare: unitTerm(unit, ctx, levy),
      cost: unitStepShortfall(row, levy) * unitProductionCost(ctx.state, ctx.playerId, unit),
    });
  }
  const buildings: NodeBuilding[] = [];
  for (const building of unlocks.buildings ?? []) {
    buildings.push({
      id: building,
      name: buildingDef(building).name,
      copies: buildingCopies(ctx, building, folds),
    });
  }
  const projects = (unlocks.projects ?? []).length;
  const abilities = (unlocks.abilities ?? []).length;
  const flat: ValueTerm[] = [
    {
      label: `${projects} conversion project${projects === 1 ? '' : 's'}`,
      value: projects * ai.research.projectValue,
    },
    {
      label: `${abilities} ability${abilities === 1 ? '' : 'ies'}`,
      value: abilities * ai.research.abilityValue,
    },
  ];
  const undiscounted: ValueTerm[] = [];
  // **A node that pays a bead** (`TechDef.paysBead`) — the research half of the
  // win-condition templates (batch 5). Nothing in the bot priced this clause
  // before: a node that hands over a glass bead was worth exactly its unlocks,
  // and the one node that carries it is the node that opens the great work for
  // the world. It is worth `weights.bead` like every other bead, or — while the
  // race is live — the race chain's own share of what closing it is worth, which
  // is the same door a building step of the race walks through (`raceTerm`). The
  // race's share carries `beadChain`'s clock, so it is the one gift the road's
  // discount is not applied to a second time.
  if (def.paysBead !== undefined) {
    const race = raceTerm(ctx, { kind: 'tech', id: node });
    if (race === null) flat.push({ label: 'a glass bead when the node lands', value: ai.weights.bead });
    else undiscounted.push(race);
  }
  const effects = def.effects ?? [];
  if (effects.length > 0) {
    flat.push(nest('the rules the node itself carries', explainEffects(effects, ctx)));
  }
  return { units, buildings, flat, undiscounted };
}

/**
 * **One copy per town that would raise the row**, each priced by that town's own
 * folds — batch X1d, and the correction the spec asked for said twice over.
 *
 * The first half is the old `townsWanting`: every town of the empire that does
 * not hold the row, and **one** for a wonder, because there is only ever one of
 * those and pricing it per town was the purest of the every-town optimisms. A
 * wonder somebody has already claimed is owed by nobody at all, and the one copy
 * it does own stands in the town that would raise it **soonest** — a wonder goes
 * to the town that can actually finish it, which is a fact this reading now has
 * because every town's build time is in front of it.
 *
 * The second half is the ruling: the copy's payoff is not the row's flat bag but
 * the town's own hypothetical fold with the row standing in it, less the town's
 * standing fold, plus what the row gives beyond a yield *in that town*. That is
 * the very pair of questions the purchasing plan and the faith book ask of a
 * shelf they are about to buy, asked here of a shelf the empire is about to
 * research, through the same grid (`townFolds`). A Library in a size-13 capital
 * reads its `sciencePerPop`; a Lighthouse reads the fish of the town that raises
 * it; a Market reads the route its slot opens, because `explainBuildingRow`
 * already prices a slot by the best unrun pair.
 *
 * **`buildError` is deliberately not asked** and still is not: a chain is about a
 * node that has not landed yet, and the simulation's gate would refuse every row
 * of it for want of the technology. The gate belongs to the arm that raises the
 * row; what belongs here is the towns the row is still missing from. A town that
 * makes no hammers at all drops out instead — `turnsToBuild` answers `null`, and
 * a town that would never finish it does not owe it.
 *
 * **Uncapped since batch 7.** `score.cityCap` clipped this at six towns so that
 * "in every town" could not run away with a wide empire, and the acceptance says
 * it was not what was holding the bot together: a chain owed by ten towns *is*
 * ten raisings, `stepsRemaining` divides the worth by exactly that number, and
 * each town then folds one share of it.
 */
function buildingCopies(ctx: ValueContext, id: BuildingId, folds: TownFolds): NodeCopy[] {
  const def = buildingDef(id);
  const state = ctx.state;
  if (def.wonder === true) {
    for (const claim of state.wonders) {
      if (claim.building === id) return [];
    }
  }
  // The folded price (the size and the tree's column) asked of **this empire**
  // (H11's per-empire line on a `oncePerEmpire` row), never the row's size alone.
  // It is a fact about the realm, so every copy owes the same stones.
  const price = buildingProductionCost(id, state, ctx.playerId);
  const copies: NodeCopy[] = [];
  for (let index = 0; index < folds.towns.length; index++) {
    const city = folds.towns[index]!;
    if (city.buildings.includes(id)) continue;
    const raise = folds.turns(index, id);
    if (raise === null) continue;
    copies.push({
      index,
      cityId: city.id,
      town: city.name,
      cost: price,
      raise,
      city,
      folds,
      priced: null,
    });
  }
  if (def.wonder !== true || copies.length <= 1) return copies;
  let best = 0;
  for (let index = 1; index < copies.length; index++) {
    if (copies[index]!.raise < copies[best]!.raise) best = index;
  }
  return [copies[best]!];
}

// --- the pieces of a chain ---------------------------------------------------

/**
 * **How many of this row the levy is actually short** — the count the unit
 * step's hammers multiply by (batch X1).
 *
 * Only a *field soldier* is levied. A settler's hammers are the expansion
 * chain's and are already charged there; a caravan's are the route's
 * (`explainCaravan` prices the pair, not the wagon); a prophet is one charge and
 * a civilian is one errand. Charging any of them the levy's shortfall would be
 * charging the same empire for a spear it is short *because* it unlocked a
 * plough. So the shortfall is the soldiers' and everything else stays the free
 * option it always was — which is the sentence the old `cost: 0` was right
 * about and wrong to apply to the whole list.
 */
function unitStepShortfall(def: ReturnType<typeof unitDef>, levy: LevyReading): number {
  return isFieldSoldier(def) ? levy.shortfall : 0;
}

/**
 * What a unit unlock is worth — the beeline's own four clauses: a soldier at the
 * threat swing, a settler as one more town, a caravan, a prophet at the
 * appetite, and everything else as a civilian.
 *
 * Dispatched on the *row's* markers and never on a name, which is the discipline
 * `src/sim/` keeps and a reader of the same tables has no business breaking.
 *
 * **The threat swing is against the levy's shortfall now** (batch X1). It used
 * to be an unconditional `× threat.techMilitaryFactor` whenever any hostile
 * column stood near any town — and the wild's standing fifty pieces mean that is
 * close to permanent, so the premium was close to permanent too, and 61–63% of
 * every re-aim on the audit's bench went to a military node. What the factor is
 * *for* is the emergency of a town that cannot answer the column at its gate,
 * and an empire already holding the levy it wants is not in that emergency: it
 * has the spears, and what it lacks is a library. So the factor is charged
 * **against the share of the levy that is missing** — the whole of
 * `threat.techMilitaryFactor` where none of the levy is standing, proportionally
 * less as it fills, and floored at one, because a column at the gate may never
 * make a node worth *less* than it is in peacetime. A seat that wants no more
 * soldiers gets no military premium at all, which is the ruling in one line.
 *
 * Nothing was added to `data/ai.json`: this is the same knob, read against the
 * same levy the town's own build arm reads. The floor is what keeps the two
 * readings of the shortfall from disagreeing in sign — the hammers below charge
 * for the pieces that are missing, and this multiplies for the same ones.
 *
 * The two arithmetics were both measured on the audit's bench and the one that
 * plays better is here: `max(1, factor × short)` took the military share of
 * re-aims to 40% and 44% (from 63% and 67%) with technologies at t150 up on both
 * boards, where the gentler `1 + (factor − 1) × short` left the second bench at
 * 57%.
 */
function unitTerm(unit: UnitTypeId, ctx: ValueContext, levy: LevyReading): ValueTerm {
  const ai = ctx.ai;
  const def = unitDef(unit);
  if (isCombatant(def) && !isExplorer(def)) {
    const soldier = explainSoldier(unit, ctx);
    // The threat swing (design addendum 1): a spear is worth several libraries
    // while there is a column beside the capital *and this empire is short of
    // the levy to answer it*, and one library otherwise.
    const short = Math.min(1, levy.wanted <= 0 ? 0 : levy.shortfall / levy.wanted);
    const full = Math.max(1, ai.threat.techMilitaryFactor);
    const factor = ctx.threat > 0 ? Math.max(1, full * short) : 1;
    const parts = [...soldier.terms];
    if (factor !== 1) {
      parts.push({
        label:
          `× ${round(factor)} (a column is near a town, and this empire is ` +
          `${round(levy.shortfall)} of ${round(levy.wanted)} soldiers short)`,
        value: factor,
        op: 'mul',
      });
    }
    // **The surplus charge is the premium's own interpolation, and not a second
    // subtraction.** `unitRoleValue`'s levy charge (`−soldier × standing`) was
    // tried here whole and measured: folded *beside* the interpolated premium it
    // prices a soldier at nothing the moment the levy is full, the beeline stops
    // asking for military nodes at all, and on the audit's second bench a seat
    // fell from eight towns to two while the wild walked in (measured 2026-09-08,
    // both benches). Charging the shortfall once — in the premium the town's own
    // arm does not have — is the honest half of it: the chain is deciding what a
    // *node* is worth, not what the next spear is worth, and the town's arm is
    // still the thing that decides whether the spear gets built.
    return { label: def.name, value: foldTerms(parts), parts };
  }
  if (def.foundsCity) return { label: `${def.name} — one more town`, value: ai.weights.city };
  if (trades(def)) {
    // **The route it would run** (batch 8), through the same door the build arm
    // and the contribution arm read. A node that unlocks caravans in an empire
    // with nowhere to send one unlocks nothing, and now says so.
    const caravan = explainCaravan(ctx);
    return caravan === null
      ? { label: `${def.name} — ${caravanRefusal(ctx)}`, value: 0 }
      : { label: `${def.name} — a caravan`, value: caravan.total, parts: caravan.terms };
  }
  if (def.prophesies === true) {
    // **The appetite's beeline** (design addendum 5). A seat that has consecrated
    // a god and founded no faith wants this door open above almost anything else,
    // and wants it not at all once it is through.
    return {
      label:
        `${def.name} — the door to a religion` +
        (ctx.faithAppetite > 0 ? ' (this empire holds a god and has founded no faith)' : ''),
      value: ai.weights.worker + ai.religion.prophetTechValue * ctx.faithAppetite,
    };
  }
  return { label: `${def.name} — a civilian`, value: ai.weights.worker };
}

/** Could any town of this empire raise this row today? The simulation's gate. */
function someTownCouldRaise(state: GameState, player: Player, id: BuildingId): boolean {
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (city.buildings.includes(id)) continue;
    if (buildError(state, player.id, 'building', id, city) === null) return true;
  }
  return false;
}

/**
 * **What a node's renewals would pay, over the ground that would collect them** —
 * `renewalTerms`' arithmetic, moved here whole so the chain owns every term the
 * beeline prints.
 *
 * Two terms per `{improvement, upgrade}` pair the node switches on, and the split
 * between them is the batch-2 ruling: a farm already standing collects the turn
 * the node lands, so its wait is the *tech's* and the chain's beaker line already
 * charges it; a bare bank waits for the node *and* a walk with a spade, and
 * `workers.planRadius + 1` is that walk — one crude constant-ish estimate,
 * written down as crude, because a nearest-worker search per hex over fifty
 * candidate nodes is not affordable.
 *
 * A pair with no ground under it still prints, at zero, because "Irrigation is
 * worth nothing to an empire with no river bank" is a reading a spectator should
 * be able to watch the bot make.
 */
function renewalSteps(goal: TechId, ctx: ValueContext, researchDelay: number): ChainStep[] {
  // **The renewal is a fold now** (batch X1d-ground, the user's ruling of
  // 2026-09-09: "why isn't that using the already existing logic for pricing
  // bonuses?"): what the node adds to the ground this empire's citizens
  // actually stand on — each town's own fold with the technology held against
  // its standing fold, memoised per node on the sitting (`renewalFoldFor`,
  // `plan.ts`) — which also prices the seam the node reveals on a worked hex.
  // The survey it replaces counted every hex a town could ever farm.
  const fold = renewalFoldFor(ctx, goal);
  if (fold.towns.length === 0) return [];
  const value = fold.total;
  return [
    {
      kind: 'rider',
      id: goal,
      name: `${techDef(goal).name} on the ground this empire works`,
      towns: fold.towns.length,
      // Ground, not a raising: one copy, in no town, at the node's own landing.
      copies: [{ cityId: -1, town: 'the ground', cost: 0, rate: value, delay: researchDelay, value }],
      cost: 0,
      rate: value,
      delay: researchDelay,
      value,
      terms: fold.terms,
    },
  ];
}

// --- the expansion chain ------------------------------------------------------

/**
 * **What the settler's arm knows and this module does not** — the site, handed
 * in rather than imported.
 *
 * `WantInputs.soldierWorth`' bargain one module over, and for its reason exactly:
 * the site reading is `bot.ts`' (`explainSite`, `nearestHostile`, the empire's
 * own seams), it walks the map, and importing it here would make this leaf stand
 * on the file that stands on it. The probe is asked **once per decision** by
 * `valueContext` and never inside a fold.
 */
export interface SiteProbe {
  tile: { col: number; row: number };
  /** `explainSite`'s own total — the settle table's second weight table. */
  score: number;
  /** Hexes from the nearest town of this empire to the site. */
  distance: number;
  /** True when the walk to it is the one an unescorted settler refuses. */
  dangerous: boolean;
  /** What founding there would cost, per meter, as a positive number of points. */
  costs: { authority: number; happiness: number };
}

/**
 * **The next town, as a chain** — batch 4 of `docs/bot-priorities.md`, and the
 * answer to the regression batch 3 measured and wrote down: *"a building can be a
 * step of a chain and a settler cannot"*, so towns fell from fifteen to twelve
 * while buildings rose from thirty to fifty-five.
 *
 * The shape is `techChain`'s, one goal over:
 *
 *   · the **payoff** is what one more town is worth to this empire
 *     (`explainNextTown` — `weights.city` after the falloff), discounted by the
 *     whole delay of getting there;
 *   · the **delay** is the settler's build turns plus the walk to the site;
 *   · the **invests** are the hammers the settler still owes and what founding
 *     would over-spend on the two meters;
 *   · the **steps** are the things that still have to happen — a settler to
 *     raise, and an escort to raise when the walk is refused for want of one.
 *
 * **A realised step drops out by construction**, exactly as it does for a
 * building. An empire that already has a settler walking owes no hammers and has
 * no settler step, so the chain's remaining worth *rises* and the build arm stops
 * wanting a second one — which is the audit's idle-settler finding answered by
 * arithmetic rather than by `settlerCap`.
 *
 * **The authority wait is a price, not a wait, and that is the honest reading of
 * this simulation's meters.** The spec asked for the wait "if authority regrows",
 * and it does not: `explainAuthority` is a fold of *capacities* — the palace, one
 * line per age advanced, buildings' `authorityCapacity`, a seam, a card — less
 * what each town costs. Nothing accrues per turn; a point of writ arrives when a
 * source lands and never otherwise. So there is no number of turns to wait, and
 * pretending there was one would be a delay this bot could not derive from the
 * board. What an over-spent meter is instead is a **cost**: the town is founded,
 * the writ goes negative, borders freeze (`borderFreezePercent`) and the malus
 * tier bites every town in the empire. The chain charges that shortfall at the
 * meter's own price and prints it, and the same shortfall is what makes writ dear
 * to every other arm (`meterPrices`, `wants.ts`) — so an empire whose next town
 * is blocked on writ starts wanting the building that supplies it, which is the
 * behaviour `settlerAuthorityFloor` was refusing its way toward.
 *
 * Happiness is charged by the same clause and for the same reason: a town founded
 * into a deficit stifles the growth of every town that already stands. **And by a
 * second line since batch X5b**, because that clause is a threshold and an empire
 * with a cushion was charged nothing at all for the citizen it was about to
 * create — while `explainCitizen`'s keep, subtracted by the settler's own arm,
 * priced the citizen the old town gives up whatever the cushion said. The new
 * town's first citizen is now charged as a demand too, at the live price, through
 * the one line every arm that weighs a citizen folds (`citizenKeepTerm`,
 * `citizen.ts`).
 *
 * **The two crudenesses, written down.** The walk is the *nearest legal* site's
 * distance over the settler's movement allowance — no terrain, no roads, no
 * hostiles, and optimistic because the settler's own arm may walk further for
 * better ground (`marchToSite` ranks by `explainSite`; this asks only how far off
 * the next town is). And the site's own score enters the fold at **nothing**: it
 * is priced by `site.yieldWeights`, which is the audit's finding 3 — a second
 * weight table — and folding two tables into one worth is the Layer-0 unification
 * that is nobody's batch yet. It is printed as a zero-valued label so a reader of
 * the feed can see the ground the chain is about.
 */
export interface ExpansionChain {
  /** Where the next town would stand, and what the settle table makes of it. */
  site: SiteProbe;
  /** The row that founds — the first in roster order this empire could raise. */
  settler: UnitTypeId;
  /** Hammers still owed for it. **Zero when one is already walking.** */
  hammers: number;
  /** Turns to raise it in a middling town. Zero when one is already walking. */
  buildDelay: number;
  /** Turns to walk it to the site. */
  walkDelay: number;
  delay: number;
  /** Points of writ founding would over-spend, and of contentment. */
  short: { authority: number; happiness: number };
  /**
   * What one more town is worth **before** the invests — the numerator the two
   * constraint prices are read off (`meterPrices`), which is why it is a field
   * rather than a term nobody can find. Discounted for the delay, like the worth.
   */
  payoff: number;
  steps: ChainStep[];
  /** `Σ step.towns` — raisings, as `TechChain.stepsRemaining` counts them. */
  stepsRemaining: number;
  /** True when the site walk is refused for want of a piece walking alongside. */
  escortNeeded: boolean;
  /** The fold of `terms`, and never anything else. */
  worth: number;
  terms: ValueTerm[];
}

/** The escort step's id — a step no roster row is named by. See `expansionChain`. */
export const ESCORT_STEP = 'escort';

export function expansionChain(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  probe: SiteProbe,
  /** The row that founds, and whether one is already walking. `bot.ts`' reading. */
  settler: { id: UnitTypeId; walking: boolean },
): ExpansionChain {
  const def = unitDef(settler.id);
  // The live price — the size, the column and the ladder folded — not the base.
  const price = unitProductionCost(state, player.id, settler.id);
  const hammers = settler.walking ? 0 : price;
  const buildDelay = settler.walking ? 0 : buildTurns(price, ctx);
  const walkDelay = Math.ceil(probe.distance / Math.max(1, def.movement));
  const delay = buildDelay + walkDelay;

  const town = appraise([
    nest('a town, before the engines it would join', explainNextTown(state, player, ctx)),
    nest('and the engines it would join', townChainShare(ctx)),
  ]);
  // **The walk is discounted and the raising is not**, and that is not an
  // oversight — it is the one place this chain's arithmetic has to fit the arm
  // that reads it. A build candidate is scored `value ÷ turns of build effort`
  // by `push`, which is *already* the price of waiting for a town to raise the
  // piece; a tech chain has no such divisor, which is why `techChain` discounts
  // its own builds. Discounting the raising here as well would charge a settler
  // its build twice and would be the bot disagreeing with itself about the same
  // wait. What `push` cannot see is the road after the piece exists, and that is
  // exactly what this discount is. `buildDelay` is reported beside it because the
  // whole delay is what a reader of the feed wants to see.
  const discount = delayTerm(walkDelay, ctx, 'the settler has still to walk to the ground');
  const payoff = town.total * discount.value;
  const terms: ValueTerm[] = [
    {
      label: `one more town, at (${probe.tile.col},${probe.tile.row})`,
      value: payoff,
      parts: [...town.terms, discount],
    },
    {
      // The settle table's own reading, printed and folded at nothing. See the
      // interface's docblock: two weight tables, one currency, not this batch.
      label:
        `(the settle table scores that ground ${round(probe.score)}, ` +
        `${probe.distance} hex${probe.distance === 1 ? '' : 'es'} off)`,
      value: 0,
    },
  ];
  const short = {
    authority: Math.max(0, probe.costs.authority - authorityOf(state, player.id)),
    happiness: Math.max(0, probe.costs.happiness - happinessOf(state, player.id)),
  };
  if (short.authority > 0 || short.happiness > 0) {
    terms.push(
      nest(
        'what founding there would over-spend, with no source in sight to supply it',
        explainMeterCall(
          { authority: short.authority, happiness: short.happiness },
          ctx,
        ),
        'sub',
      ),
    );
  }
  /**
   * **The contentment the new town would demand** (batch X5b, the ruling on the
   * flags board item (ggg) and the measurement under it).
   *
   * The clause above is a **threshold**: it fires when a founding would push a
   * meter past what the empire holds, and an empire with any cushion at all is
   * charged nothing by it. Beside X5's charge that left an asymmetry with a
   * direction — `explainCitizen` charges the citizen a settler costs *whatever*
   * the cushion says, and the settler's arm **subtracts** it, so the old town's
   * relief was priced and the new town's demand was not. Measured at t100 across
   * eight seeds: the mean seat lost a fifth of its citizens, its food and its
   * science, and its contentment went under.
   *
   * So the demand is charged as a demand as well, always, at the live price, and
   * through the very line the other three arms fold (`citizenKeepTerm`,
   * `citizen.ts`) — asked of a town of **nought**, which is what a town about to
   * be founded has. The two readings are different questions and both are worth
   * asking: *would this founding put the meter underwater* (a stock, above), and
   * *what does the town it founds ask the empire for every turn after* (a flow,
   * here). They overlap by the founding's own point in an empire that is already
   * underwater, which is the small end of a charge that is mostly the deficit
   * itself.
   *
   * The authority half has no line here and that is not an omission: writ has no
   * per-citizen demand to mirror — `explainAuthority` is a fold of capacities
   * less what each *town* costs — and the town's own cost is what the clause
   * above already prices.
   */
  const newTown = citizenKeepTerm(ctx, 0);
  if (newTown !== null) {
    terms.push(nest('and what the town it founds would ask the empire for', appraise([newTown])));
  }
  if (hammers > 0) {
    // **Printed, and folded at nothing** — the other half of the walk-versus-
    // raising ruling above. `push` scores a build candidate as `value ÷ turns of
    // build effort`, and those turns *are* the hammers: a settler that costs
    // twice as much is divided by twice as many turns. Subtracting the hammer
    // lump here as well would charge the same stones twice, so the chain says
    // what it owes and lets the arm that raises it do the charging.
    terms.push({
      label:
        `(the ${Math.round(hammers)} hammers the settler owes are charged by the ` +
        `${buildDelay} turns of build effort the raising is divided by)`,
      value: 0,
    });
  }

  const steps: ChainStep[] = [];
  if (!settler.walking) {
    steps.push({
      kind: 'unit',
      id: settler.id,
      name: def.name,
      towns: 1,
      copies: [{ cityId: -1, town: 'wherever the empire likes', cost: price, rate: payoff, delay, value: payoff }],
      cost: price,
      rate: payoff,
      delay,
      value: payoff,
      terms: [],
    });
  }
  // **The escort is only a step once there is something to escort.** A settler
  // that has not been raised does not need a column beside it — it needs to be
  // raised, and the danger on the road is a fact about the turn it sets out on,
  // which is several turns away and may have moved. So the chain names exactly
  // one thing that has to happen next: the settler, or, once one is standing and
  // refusing to walk for want of company, the company. That also keeps the share
  // whole — two steps would halve what each is worth and could leave an empire
  // building neither, which is the failure the audit's idle settlers were.
  if (settler.walking && probe.dangerous) {
    steps.push({
      kind: 'unit',
      id: ESCORT_STEP,
      name: 'an escort',
      towns: 1,
      copies: [{ cityId: -1, town: 'wherever the empire likes', cost: 0, rate: payoff, delay, value: 0 }],
      cost: 0,
      rate: payoff,
      delay,
      value: 0,
      terms: [],
    });
  }
  return {
    site: probe,
    settler: settler.id,
    hammers,
    buildDelay,
    walkDelay,
    delay,
    short,
    payoff,
    steps,
    stepsRemaining: steps.length,
    escortNeeded: probe.dangerous,
    worth: foldTerms(terms),
    terms,
  };
}

/**
 * **What one more town adds to the engines this empire is already running** —
 * the term that makes the expansion chain and the tech chain say the same thing
 * about a town, and the arithmetic answer to the regression batch 3 measured.
 *
 * A tech chain's building step is owed by *the towns that lack the row*
 * (`townsWanting`), and every one of those towns folds `worth ÷ stepsRemaining`
 * when it raises it (touch point (b)). Batch 3 gave buildings that term and gave
 * settlers nothing, and the boards said so: buildings 30 → 55, towns 15 → 12.
 * The half that was missing is that **a town this empire does not have cannot
 * raise anything at all**. Founding one adds a raising to every live chain, and
 * what that raising is worth is exactly what the chain already says it is worth
 * — `step.value ÷ step.towns`, one town's share of a step the chain has priced
 * and discounted for its own wait.
 *
 * Its hammers come off the same way they do everywhere else in this module: one
 * copy of the row, through `explainLump`. A step whose stones cost more than the
 * step pays is not a reason to found a town and is left out rather than folded
 * as a negative — the chain is about what a town *would do*, and a town that
 * would decline to raise the row simply does not raise it.
 *
 * **Two things changed here in batch X1d**, and the eight-seed probe is why both
 * had to. A copy is now a town's own fold rather than a row's flat bag, so the
 * numbers this term sums are three to ten times what they were, and summing every
 * step of every chain at full price told every empire on the board to found a
 * seventh town: t100 went from 4.9 towns to 7.9, with a fifth off its science and
 * half its buildings per town.
 *
 * So: the copy read is the **least** of them (`leastCopyRate`) — a town that does
 * not exist yet is the smallest town this empire will have, not the average of the
 * ones it grew — and every row is discounted at the turn **this town's own queue**
 * would reach it. A town raises its engines one after another; the sum used to
 * behave as though a new town raised thirty rows the turn it was founded, and now
 * it behaves as though it raised them in order and stopped paying at the horizon,
 * which is what every other cursor in this module already does.
 *
 * Nothing here walks the board: the chains are already built and hanging on the
 * context, so this is a fold over a list the decision has already paid for.
 */
export function townChainShare(ctx: ValueContext): Appraisal {
  const terms: ValueTerm[] = [];
  // **The new town's own queue.** It cannot raise every engine's every row at
  // once: it raises them one after another, so the cursor walks the steps in the
  // chains' own order and each row is discounted at the turn *this* town would
  // finish it. Past the horizon the sum stops paying, which is the whole of what
  // keeps it finite — see the docblock.
  let cursor = 0;
  for (const chain of ctx.chains) {
    for (const step of chain.steps) {
      if (step.kind !== 'building') continue;
      const stones = explainLump({ production: stepUnitCost(step) }, ctx).total;
      cursor += buildTurns(stepUnitCost(step), ctx);
      const discount = delayDiscount(cursor, ctx);
      if (discount <= 0) continue;
      const share = leastCopyRate(step) * discount;
      if (share - stones <= 0) continue;
      terms.push({
        label:
          `${step.name} — one more town to raise it for the ${techDef(chain.goal).name} engine, ` +
          `${round(cursor)} turns into that town's own queue`,
        value: share - stones,
      });
    }
  }
  return appraise(terms);
}

/**
 * **The worst copy's rate**, which is what a town this empire does not have yet
 * is worth priced by (batch X1d), and **undiscounted**, because the town that
 * would raise it does not exist and so has a wait of its own.
 *
 * Before the copies it was the step's whole value over its town count — the mean
 * — and that reading was fine while every town was quoted the row's flat bag,
 * because then every copy *was* the mean. It stopped being fine the moment a copy
 * was the town's own fold: the mean of a size-13 capital's Library and a size-2
 * hamlet's is not what a town that does not exist yet would make of one. A new
 * town is founded at a single citizen on unimproved ground, so the honest reading
 * of it among the copies the chain holds is the **least** of them.
 */
function leastCopyRate(step: ChainStep): number {
  let least = Number.POSITIVE_INFINITY;
  for (const copy of step.copies) {
    if (copy.rate < least) least = copy.rate;
  }
  return Number.isFinite(least) ? least : step.rate / Math.max(1, step.towns);
}

/**
 * **What one step of the expansion chain is worth to whoever takes it** —
 * `chainStepShare`'s sibling, and the term the settler and its escort fold.
 *
 * A chain with no steps left (a settler already walking to an undefended site)
 * shares nothing: there is nothing for a town to raise, which is the sunk-cost
 * story said as a division nobody performs.
 */
export function expansionStepShare(chain: ExpansionChain): number {
  return chain.stepsRemaining === 0 ? 0 : chain.worth / chain.stepsRemaining;
}

/**
 * **What the next town is worth to an empire that already holds some.**
 *
 * `weights.city × cityValueFalloff^towns`, and the falloff is the honest tall
 * lever: before it, a settler was a flat eighty-eight points for every empire on
 * every board, so "tall" could only ever be spelled as a *cap* — which says
 * *this empire does not want a sixth town at all* rather than *a sixth town is
 * worth less to this empire than a library*. Those are different sentences and
 * only the second one is a preference.
 *
 * Towns are counted uncapped (not `ctx.cities`, which is clipped at
 * `score.cityCap` for the "in every town" scalings, until batch 7 retired the
 * cap): the fourth town's discount has to keep biting at the tenth, or the
 * falloff stops being a curve and becomes a step.
 *
 * It lives here rather than in `bot.ts` because batch 4 made it the expansion
 * chain's payoff, and a chain may not stand on the policy that reads it.
 */
export function explainNextTown(state: GameState, player: Player, ctx: ValueContext): Appraisal {
  let held = 0;
  for (const city of state.cities) {
    if (city.ownerId === player.id) held += 1;
  }
  const falloff = ctx.ai.expansion.cityValueFalloff;
  const terms: ValueTerm[] = [
    { label: 'a town, before what this empire already holds', value: ctx.ai.weights.city },
  ];
  for (let index = 0; index < held; index++) {
    terms.push({
      label: `× ${round(falloff)} — the ${ordinal(index + 1)} town this empire already holds`,
      value: falloff,
      op: 'mul',
    });
  }
  return appraise(terms);
}

// --- the bead race ------------------------------------------------------------

/**
 * **The rival nearest the finish line, and the clock it is on.**
 *
 * Every field is public: `Player.beads` is an open record — the Abacus shows
 * every real seat's rod to every player and there is no fog over it — so a bot
 * reading a rival's tally is reading what a human at the same table reads. The
 * *rate* and the *close* are this module's estimates about that public number,
 * and both are crude in the way `beadRate` writes down.
 */
export interface RaceRival {
  playerId: number;
  name: string;
  beads: number;
  /** Beads a turn, its own record over the turns played. See `beadRate`. */
  rate: number;
  /** Turns until it could have the great work standing. */
  close: number;
}

/**
 * **The bead race, as a chain** — batch 5 of `docs/bot-priorities.md`, and the
 * spec's last template: *"the bead race and the Opus as chains with huge terminal
 * values and honest delays — they take the book over in the late game because the
 * numbers say so, not because a rule fires."*
 *
 * The shape is `techChain`'s and `expansionChain`'s, one goal further out:
 *
 *   · the **terminal value** is `weights.victory` — the game, and there is only
 *     one of it;
 *   · the **delay** is the whole road from here to a closed great work: the beads
 *     the rod is still short of, at this seat's own bead rate; the road to the
 *     technology that opens the work, when nobody in the world holds it; and the
 *     twelve hundred hammers of the raising itself in the busiest town. The rod
 *     and the road fill *together* — an empire researches while it earns — so the
 *     two are a maximum rather than a sum, and the raising follows both;
 *   · the **intermediate payoffs** are the beads still owed, at `weights.bead`
 *     each, discounted for the turns the rod takes to fill. The existing weights
 *     keep their meaning exactly: a bead is worth what the table has always said
 *     a bead is worth, and what batch 5 adds is *when* it arrives.
 *
 * **The null half is the point.** A seat far from the race prices the whole thing
 * at nothing and prints why: twenty beads owed at a bead every thirty turns is
 * six hundred turns against a forty-turn horizon, so the terminal discounts to
 * zero, the bead line discounts to zero, and no candidate anywhere carries a
 * race term. Nothing about the early game moves, which is exactly what the
 * acceptance measures.
 *
 * **Two readings decide how loud the chain is**, and both are written down here
 * because both are choices:
 *
 *   · **the rate is crude, deliberately.** Beads are *lumpy* — a quest answered,
 *     a first taken, a node that pays one — and nothing in this bot can forecast
 *     which of twenty-five cards a board will hand a seat. So the rate is the
 *     seat's own record: beads earned over turns played, floored at one bead a
 *     horizon so an empire that has earned none is treated as slow rather than as
 *     never arriving. It under-reads a seat that has just entered a new age (a
 *     fresh hand of cards it has not answered yet) and over-reads one that took
 *     three firsts in the opening. An honest forecast would need a model of the
 *     deck, and a guess dressed as a forecast is worse than a crude average that
 *     says it is one.
 *   · **when the race is open, the planning horizon stops applying.** While no
 *     empire holds the closing technology the race is one plan among many and is
 *     discounted like any other, `(H − delay)/H`. The turn somebody reaches it
 *     (`opusOpen`) the race is *on*: the game now ends when a work is finished
 *     rather than when a horizon runs out, so the only clock that matters is the
 *     nearest rival's. The chain stops discounting by H entirely and asks one
 *     question instead — **can this empire get there first?** If it can, the
 *     curtain is worth the whole of `weights.victory`; if it cannot, it is worth
 *     nothing and says so. That is the batch's one deliberate departure from the
 *     brief, which suggested `min(H, the rival's close)`: clamping the live-race
 *     horizon at forty turns would let the *planning* horizon kill a race an
 *     empire is comfortably winning, which is the thing an open race is supposed
 *     to stop doing.
 *
 * **Out of reach is a printed zero.** The winner is whoever *finishes* the work
 * (`closeTheGreatWork`, schema 69), so a rival who would close first has the
 * game whatever this empire builds and however long its own rod is. The rods
 * used to enter this reading — a rival had to close first *and* hold more beads
 * when they did — and that half is gone with the rule it read: beads are the
 * door now, and a door somebody else has already walked through settles nothing
 * about who is behind them. The chain folds a `× 0` term naming the rival rather
 * than quietly reading low: a bot that keeps pouring hammers into a race it has
 * lost is the failure this clause exists to prevent, and a reader of the feed
 * should be able to see it decline.
 */
export interface BeadChain {
  /** The row that closes the game, and the beads it asks for. */
  opus: BuildingId;
  threshold: number;
  held: number;
  /** Beads still owed for the rod. Zero for an empire that may already begin. */
  needed: number;
  /** Beads a turn, floored. Crude — see the interface docblock. */
  rate: number;
  /** `needed ÷ rate` — the turns the rod takes to fill. */
  beadDelay: number;
  /** The road to the technology that opens the work. Empty once the race is open. */
  road: TechId[];
  remainingBeakers: number;
  researchDelay: number;
  /** The work's own hammers, and the turns the busiest town would take over them. */
  hammers: number;
  buildDelay: number;
  /** `max(beadDelay, researchDelay) + buildDelay` — the whole road from here. */
  delay: number;
  /** `opusOpen(state)` — somebody in the world holds the closing technology. */
  open: boolean;
  /** The clock the race runs against: the rival's close while it is open, else H. */
  raceHorizon: number;
  rival: RaceRival | null;
  /** True when a rival would close the work first. Folds a `× 0`. */
  lost: boolean;
  /** True when a candidate of this race may fold the chain's share. */
  live: boolean;
  /**
   * The beads still owed **and** the raising — `needed + 1`, the things that have
   * still to happen.
   *
   * There is no `steps` list beside it, and that is the one place this chain's
   * shape differs from its two siblings: the outstanding events of a race are
   * mostly **occasions** — a quest answered, a first taken — and an occasion is
   * not a row a town can be told to raise. The one thing that *is* a row is the
   * work itself, and `opus` names it. What the count is for is the share, and it
   * is over events rather than rows for the reason `TechChain.stepsRemaining`
   * counts raisings: a rod one bead short should hand the work half the race
   * rather than a twentieth of it, which is what makes the race concentrate as
   * it is run.
   */
  stepsRemaining: number;
  /** The fold of `terms`, and never anything else. */
  worth: number;
  terms: ValueTerm[];
}

/**
 * **The race, read off the board** — `null` only when no row on the table is the
 * finish line at all, which is the honest reading of a set of rules that has not
 * shipped one.
 *
 * Nothing is stored and nothing is remembered: the rod, the road and the rival
 * are all facts about `GameState`, which is principle 3 of the spec said for the
 * fifth time.
 */
export function beadChain(state: GameState, player: Player, ctx: ValueContext): BeadChain | null {
  const opus = opusRow();
  if (opus === null) return null;
  const ai = ctx.ai;
  const def = buildingDef(opus);
  const horizon = Math.max(1, ai.priorities.horizonTurns);
  const threshold = Math.max(1, Math.floor(BEAD_RULES.threshold));

  const held = player.beads.length;
  const needed = Math.max(0, threshold - held);
  const rate = beadRate(held, state.turn, horizon);
  const beadDelay = needed / rate;

  const open = opusOpen(state);
  // **The road is owed only while the work is shut.** `worldUnlockTech` is a
  // *world* gate — the first empire anywhere to reach it opens the row for
  // everybody — so an empire whose rival has already reached it owes no beakers
  // at all, and `opusOpen` is the one reading of that (`isUnlocked`' own).
  const unlock = def.worldUnlockTech;
  const owed =
    open || unlock === undefined
      ? { road: [] as TechId[], beakers: 0, delay: 0 }
      : researchRoad(state, player, ctx, unlock);
  // **The folded price** (batch P1), asked of this empire: the Opus is a
  // once-per-empire row, so what it costs to raise is a fact about how many
  // towns this realm holds and never the row's own figure — which the row no
  // longer carries at all.
  const hammers = buildingProductionCost(opus, state, player.id);
  const buildDelay = Math.ceil(hammers / Math.max(1, ctx.bestProduction));
  // The rod and the road fill together: an empire earns beads while it researches,
  // so what it waits for is the later of the two, and then the raising.
  const delay = Math.max(beadDelay, owed.delay) + buildDelay;

  const rival = leadingRival(state, player, threshold, horizon, buildDelay);
  const raceHorizon = open ? (rival === null ? Number.POSITIVE_INFINITY : rival.close) : horizon;
  const inTime = delay < raceHorizon;
  // **Out of reach**, crudely and on public numbers: a rival that closes before
  // this empire could has the game, full stop. One clause, because the rule is
  // one clause since schema 69 — finishing the work wins it — and the tally
  // comparison that used to sit beside this would now be a bot reading a rule
  // the game does not have.
  const lost = rival !== null && rival.close < delay;

  const urgency: ValueTerm = open
    ? {
        label: inTime
          ? `× 1 — the great work is open and nothing here waits on a horizon: ` +
            `${round(delay)} turns to close it, ${rivalWords(rival)}`
          : `× 0 — the great work is open and this empire is ${round(delay)} turns from closing it, ` +
            `${rivalWords(rival)}`,
        value: inTime ? 1 : 0,
        op: 'mul',
      }
    : delayTerm(delay, ctx, 'the rod, the road to the work and the raising');

  const terms: ValueTerm[] = [
    {
      label: 'closing the great work — the realm that finishes it takes the game',
      value: ai.weights.victory,
    },
    urgency,
  ];
  if (needed > 0) {
    const fills = delayTerm(beadDelay, ctx, 'the rod fills at this empire’s own pace');
    terms.push({
      label: `the ${needed} bead${needed === 1 ? '' : 's'} still owed for the rod`,
      value: ai.weights.bead * needed * fills.value,
      parts: [
        { label: `${ai.weights.bead} a bead`, value: ai.weights.bead },
        { label: `× ${needed} still owed`, value: needed, op: 'mul' },
        fills,
      ],
    });
  }
  // Printed and folded at nothing, `expansionChain`'s two zero-valued labels one
  // chain over: the road a reader of the feed wants to see, beside the numbers
  // that were actually multiplied.
  terms.push({
    label:
      `(${held} of ${threshold} beads at ${round(rate)} a turn — ${round(beadDelay)} turns; ` +
      `${Math.round(owed.beakers)} beakers for the road — ${round(owed.delay)} turns; ` +
      `${Math.round(hammers)} hammers in the busiest town — ${buildDelay} turns)`,
    value: 0,
  });
  if (lost) {
    terms.push({
      label:
        `× 0 — ${rival!.name} holds ${rival!.beads} beads and would close the work in ` +
        `${round(rival!.close)} turns, before this empire could raise it`,
      value: 0,
      op: 'mul',
    });
  }

  const worth = foldTerms(terms);
  const stepsRemaining = needed + 1;
  const live =
    !lost && worth > 0 && (open ? inTime : delay <= horizon * Math.max(0, ai.priorities.raceLiveHorizons));

  return {
    opus,
    threshold,
    held,
    needed,
    rate,
    beadDelay,
    road: owed.road,
    remainingBeakers: owed.beakers,
    researchDelay: owed.delay,
    hammers,
    buildDelay,
    delay,
    open,
    raceHorizon,
    rival,
    lost,
    live,
    stepsRemaining,
    worth,
    terms,
  };
}

/** The row that closes the game, read off the marker and never off a name. */
function opusRow(): BuildingId | null {
  for (const id of BUILDING_IDS) {
    if (buildingDef(id).endsTheGame === true) return id;
  }
  return null;
}

/**
 * **Beads a turn** — earned over played, floored at one a horizon.
 *
 * Crude, and the interface docblock says why at length: beads are lumpy and
 * nothing here can forecast a deck. The floor is `savingRows`' bargain said once
 * more — an empire that has earned nothing is slow, not stationary — and it is
 * what keeps every division below finite.
 */
function beadRate(beads: number, turn: number, horizon: number): number {
  return Math.max(beads / Math.max(1, turn), 1 / horizon);
}

/**
 * The rival nearest the finish line, over `realPlayers` in seat order — an
 * eliminated seat races nobody and the wild has no rod at all.
 *
 * Their raising is priced at **this** empire's build delay, which is the one
 * frankly optimistic line in the reading: what a rival's busiest town makes is a
 * sweep of towns this seat may not even have charted, and the alternative to a
 * stand-in is a second empire-wide reading per decision. Written down rather
 * than hidden.
 */
function leadingRival(
  state: GameState,
  player: Player,
  threshold: number,
  horizon: number,
  buildDelay: number,
): RaceRival | null {
  let best: RaceRival | null = null;
  for (const other of realPlayers(state)) {
    if (other.id === player.id || other.eliminated) continue;
    const beads = other.beads.length;
    const rate = beadRate(beads, state.turn, horizon);
    const close = Math.max(0, threshold - beads) / rate + buildDelay;
    if (best === null || close < best.close) {
      best = { playerId: other.id, name: other.name, beads, rate, close };
    }
  }
  return best;
}

/** What the nearest rival's clock reads, for a label. */
function rivalWords(rival: RaceRival | null): string {
  if (rival === null) return 'no rival could close it at all';
  return `${rival.name} holds ${rival.beads} and could close it in ${round(rival.close)}`;
}

/** The three shapes of row that carry the race forward. See `raceTerm`. */
export type RaceRow =
  | { kind: 'building'; id: BuildingId }
  | { kind: 'project'; id: ProjectId }
  | { kind: 'tech'; id: TechId };

/**
 * **Does this row pay a bead, or close the game?** — read off the row's own
 * markers, never against a name, which is the discipline `src/sim/` keeps and a
 * reader of the same tables has no business breaking.
 *
 * Three markers and no fourth: a building's `endsTheGame` or an `onComplete`
 * grant of a bead, a race project's `bead`, a node's `paysBead`. A quest or a
 * feat is *not* here and that is batch 5's one written-down non-delivery — a
 * count deed ("twelve cities of six citizens") would need the bot to evaluate
 * `beadCount` hypothetically against a row it has not built, which is the
 * per-candidate empire sweep the brief rules out everywhere else.
 */
export function racePays(row: RaceRow): boolean {
  if (row.kind === 'building') {
    const def = buildingDef(row.id);
    if (def.endsTheGame === true) return true;
    return (def.onComplete ?? []).some((grant) => grant.grant === 'bead');
  }
  if (row.kind === 'project') return projectDef(row.id).bead !== undefined;
  return techDef(row.id).paysBead !== undefined;
}

/** What one outstanding event of the race is worth — `chainStepShare`'s sibling. */
export function raceStepShare(chain: BeadChain): number {
  return chain.worth / Math.max(1, chain.stepsRemaining);
}

/**
 * **A candidate that carries the race forward, as one printed term** — touch
 * point (b) of the spec, said for the win condition, and `null` for every row
 * that is not part of the race or every board on which the race is not live.
 *
 * One door for four arms: the build list, the purchasing plan, the contribution
 * arm and the beeline's own gifts all ask this and none of them restates the
 * question. That is what makes the takeover *honest* — the race does not fire a
 * rule anywhere, it puts a number on four kinds of candidate and lets the
 * ordinary argmax decide.
 */
export function raceTerm(ctx: ValueContext, row: RaceRow): ValueTerm | null {
  const chain = ctx.race;
  if (chain === null || !chain.live) return null;
  if (!racePays(row)) return null;
  return {
    label:
      `a step of the bead race — one of ${chain.stepsRemaining} thing${chain.stepsRemaining === 1 ? '' : 's'} ` +
      `still to happen (this realm holds ${chain.held} of ${chain.threshold} beads)`,
    value: raceStepShare(chain),
  };
}

/** "first", "second", … for a term label. Falls back to the figure past three. */
function ordinal(n: number): string {
  if (n === 1) return 'first';
  if (n === 2) return 'second';
  if (n === 3) return 'third';
  return `${n}th`;
}

