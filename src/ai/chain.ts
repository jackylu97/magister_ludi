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
 * **What a hammer costs, and the honest note beside it.** The chain subtracts
 * what it still owes: beakers at `weights.science` and hammers at
 * `weights.production`, both through `explainLump` — the bot's one lump-to-rate
 * exchange, so the whole chain stays a *per-turn* figure like every other
 * appraisal in the bot. Hammers have no shadow price until batch 4 of the spec
 * adds the constraint prices; the weight table is standing in, and this comment
 * is the note the spec asks for. When that batch lands, the two `explainLump`
 * calls below are the only lines that change.
 *
 * **Where the delay is crude, and why it is written down as crude.** Steps are
 * assumed to be raised one after another by a middling town
 * (`ValueContext.medianProduction`, batch 2), so the cursor walks the building
 * steps in roster order and each one waits for the ones before it. Towns build in
 * *parallel*, so a step's build time is one town's rather than every town's, and
 * only its hammers multiply by the towns. A unit unlock advances no cursor at
 * all: it is an option the empire may take the turn the node lands, never an
 * obligation, and it is priced exactly as the beeline always priced it.
 */

import { type Appraisal, type ValueTerm, appraise, foldTerms, nest } from './decision';
import { type UpgradeSites, noUpgradeSites } from './plan';
import {
  type ValueContext,
  type YieldBag,
  bagOfTileYield,
  buildTurns,
  delayDiscount,
  delayTerm,
  explainBuildingRow,
  explainEffects,
  explainLump,
  explainSoldier,
  explainYields,
  valueOfSoldier,
  valueOfYields,
} from './value';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import { IMPROVEMENT_IDS, improvementDef } from '../sim/improvementData';
import type { GameState, Player } from '../sim/state';
import { buildError, gatingTech, researchExpansion, researchPlan } from '../sim/tech';
import { type TechId, techDef } from '../sim/techData';
import { readTileYield } from '../sim/terrainData';
import { type UnitTypeId, isCombatant, isExplorer, trades, unitDef } from '../sim/unitData';

/** What a step of a chain is: a row a town raises, a piece, or ground worked. */
export type ChainStepKind = 'building' | 'unit' | 'rider';

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
  /** Hammers the empire still owes for it, across those towns. Zero for a rider. */
  cost: number;
  /** What one turn of it would pay, **undiscounted**. The compression's lever. */
  rate: number;
  /** Turns until it starts paying: the beakers, then the builds ahead of it. */
  delay: number;
  /** Its folded contribution to the chain's worth — `rate` at its own delay. */
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
  for (const goal of goals) {
    const chain = techChain(state, player, ctx, goal);
    if (chain.stepsRemaining > 0) chains.push(chain);
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

/** What one step of a chain is worth to whoever takes it — touch point (b). */
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
  sites?: UpgradeSites,
): TechChain {
  const ai = ctx.ai;
  const road = researchExpansion(state, player.id, goal);
  const held = road.length === 0;
  let remainingBeakers = 0;
  for (const step of road) remainingBeakers += techDef(step).cost;
  const researchDelay = remainingBeakers / Math.max(1, ctx.scienceRate);

  const unlocks = techDef(goal).unlocks;
  const steps: ChainStep[] = [];
  const giftTerms: ValueTerm[] = [];
  // The build cursor: a town raises the chain's rows one after another, so each
  // building step waits for the ones before it. Only buildings advance it.
  let cursor = researchDelay;

  for (const unit of unlocks.units ?? []) {
    const def = unitDef(unit);
    const term = unitTerm(unit, ctx);
    giftTerms.push(term);
    steps.push({
      kind: 'unit',
      id: unit,
      name: def.name,
      towns: 1,
      // A piece is an option, never an obligation: the chain charges no hammers
      // for one and waits no turns on one. What it costs is decided by the town
      // that decides to raise it, in the arm that decides.
      cost: 0,
      rate: term.value,
      delay: researchDelay,
      value: term.value,
      terms: [term],
    });
  }

  for (const building of unlocks.buildings ?? []) {
    const def = buildingDef(building);
    const towns = townsWanting(state, player, building, ctx);
    // **Realised steps drop out by construction.** Every town holds it (or the
    // world's one copy of the wonder is claimed), so there is nothing left of
    // this step to owe, to wait for or to pay — and the chain says so by having
    // no such step at all.
    if (towns === 0) continue;
    const bag: YieldBag = {
      food: def.food,
      production: def.production,
      gold: def.gold,
      science: def.science,
      culture: def.culture,
      faith: def.faith ?? 0,
    };
    // One town's build, not every town's: towns raise in parallel, and only the
    // hammers owed multiply by how many of them are still owing.
    const raise = buildTurns(def.cost, ctx);
    cursor += raise;
    const delay = cursor;
    const why = held ? 'the towns have still to raise it' : 'the node has to land and the towns to raise it';
    const perTown = valueOfYields(bag, ctx);
    const flats = explainYields(bag, ctx).terms;
    flats.push({
      label: `× ${towns} town${towns === 1 ? '' : 's'} that would raise it`,
      value: towns,
      op: 'mul',
    });
    const flatDiscount = delayTerm(delay, ctx, why);
    flats.push(flatDiscount);
    const flatTerm: ValueTerm = {
      label: `${def.name} — its flat yields, in every town that would raise it`,
      value: perTown * towns * flatDiscount.value,
      parts: flats,
    };
    // **The row's own gifts wait too.** The beeline used to discount the flats
    // and hand over the row's happiness, walls and renown at full price on a
    // node nobody had researched; the whole step waits, so the whole step is
    // discounted, and the multiplication prints beside what it multiplies.
    const row = explainBuildingRow(building, ctx);
    const rowDiscount = delayTerm(delay, ctx, why);
    const rowTerm: ValueTerm = {
      label: `${def.name} — what its row gives`,
      value: row.total * rowDiscount.value,
      parts: [...row.terms, rowDiscount],
    };
    giftTerms.push(flatTerm, rowTerm);
    steps.push({
      kind: 'building',
      id: building,
      name: def.name,
      towns,
      cost: def.cost * towns,
      rate: perTown * towns + row.total,
      delay,
      value: flatTerm.value + rowTerm.value,
      terms: [flatTerm, rowTerm],
    });
  }

  const projects = (unlocks.projects ?? []).length;
  const abilities = (unlocks.abilities ?? []).length;
  giftTerms.push({
    label: `${projects} conversion project${projects === 1 ? '' : 's'}`,
    value: projects * ai.research.projectValue,
  });
  giftTerms.push({
    label: `${abilities} ability${abilities === 1 ? '' : 'ies'}`,
    value: abilities * ai.research.abilityValue,
  });
  for (const rider of renewalSteps(goal, ctx, researchDelay, sites)) {
    for (const term of rider.terms) giftTerms.push(term);
    steps.push(rider);
  }
  const effects = techDef(goal).effects ?? [];
  if (effects.length > 0) {
    giftTerms.push(nest('the rules the node itself carries', explainEffects(effects, ctx)));
  }

  const gifts = appraise(giftTerms);
  let hammers = 0;
  let raisings = 0;
  let last = researchDelay;
  for (const step of steps) {
    hammers += step.cost;
    raisings += Math.max(1, step.towns);
    if (step.delay > last) last = step.delay;
  }
  const terms: ValueTerm[] = [nest('what the goal unlocks, step by step', gifts)];
  if (!held) {
    terms.push({ label: 'holding one more technology', value: ai.weights.tech });
    terms.push(
      nest(
        `the ${Math.round(remainingBeakers)} beakers still owed for the road`,
        explainLump({ science: remainingBeakers }, ctx),
        'sub',
      ),
    );
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
 * **Divided by the step's towns**, and written down as crude: a purse buys *one*
 * copy of a row a step owes in several towns, so it hurries one town's share of
 * the work. There is no model of which town is on which turn of which row in this
 * bot, and a purchase that claimed to hurry the whole empire would be the
 * every-town optimism this module exists to correct.
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
    const sooner = delayDiscount(other.delay - raise, ctx) - delayDiscount(other.delay, ctx);
    if (sooner <= 0) continue;
    terms.push({
      label: `${other.name} pays ${round(raise)} turns sooner`,
      value: (other.rate * sooner) / share,
    });
  }
  return appraise(terms);
}

/** The hammers one copy of a step costs — the whole owed, over the towns owing. */
export function stepUnitCost(step: ChainStep): number {
  return step.cost / Math.max(1, step.towns);
}

// --- the pieces of a chain ---------------------------------------------------

/**
 * What a unit unlock is worth — the beeline's own four clauses, unchanged: a
 * soldier at the threat swing, a settler as one more town, a caravan, a prophet
 * at the appetite, and everything else as a civilian.
 *
 * Dispatched on the *row's* markers and never on a name, which is the discipline
 * `src/sim/` keeps and a reader of the same tables has no business breaking.
 */
function unitTerm(unit: UnitTypeId, ctx: ValueContext): ValueTerm {
  const ai = ctx.ai;
  const def = unitDef(unit);
  if (isCombatant(def) && !isExplorer(def)) {
    // The threat swing (design addendum 1): a spear is worth several libraries
    // while there is a column beside the capital, and one library when there is
    // not.
    const factor = ctx.threat > 0 ? Math.max(1, ai.threat.techMilitaryFactor) : 1;
    const soldier = explainSoldier(unit, ctx).terms;
    if (factor !== 1) {
      soldier.push({ label: `× ${factor} (a column is near a town)`, value: factor, op: 'mul' });
    }
    return { label: def.name, value: valueOfSoldier(unit, ctx) * factor, parts: soldier };
  }
  if (def.foundsCity) return { label: `${def.name} — one more town`, value: ai.weights.city };
  if (trades(def)) return { label: `${def.name} — a caravan`, value: ai.weights.trader };
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

/**
 * **How many towns still owe this row** — the correction the spec asked for.
 *
 * Every town of the empire that does not hold it, capped at `score.cityCap` so a
 * wide empire cannot let one node dominate the tree, and **one** for a wonder,
 * because there is only ever one of those and pricing it per town was the purest
 * of the every-town optimisms. A wonder somebody has already claimed is owed by
 * nobody at all.
 *
 * `buildError` is deliberately *not* asked: a chain is about a node that has not
 * landed yet, and the simulation's gate would refuse every row of it for want of
 * the technology. The gate belongs to the arm that raises the row; what belongs
 * here is the count of towns the row is still missing from.
 */
function townsWanting(
  state: GameState,
  player: Player,
  id: BuildingId,
  ctx: ValueContext,
): number {
  const def = buildingDef(id);
  let lacking = 0;
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    if (city.buildings.includes(id)) continue;
    lacking += 1;
  }
  if (def.wonder === true) {
    for (const claim of state.wonders) {
      if (claim.building === id) return 0;
    }
    return lacking === 0 ? 0 : 1;
  }
  return Math.min(ctx.ai.score.cityCap, lacking);
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
function renewalSteps(
  goal: TechId,
  ctx: ValueContext,
  researchDelay: number,
  sites?: UpgradeSites,
): ChainStep[] {
  if (sites === undefined) return [];
  const walk = ctx.ai.workers.planRadius + 1;
  const spade = (): ValueTerm => delayTerm(walk, ctx, 'the spades have still to get there');
  const steps: ChainStep[] = [];
  for (const improvement of IMPROVEMENT_IDS) {
    const def = improvementDef(improvement);
    for (const upgrade of def.upgrades ?? []) {
      if (upgrade.tech !== goal) continue;
      const tally = sites.byImprovement.get(improvement) ?? noUpgradeSites();
      const drinks = upgrade.requiresFreshwater === true;
      const standing = drinks ? tally.standingFresh : tally.standing;
      const buildable = drinks ? tally.buildableFresh : tally.buildable;
      const each = explainYields(bagOfTileYield(readTileYield(upgrade.add)), ctx);
      const where = drinks ? ' that can drink' : '';
      const standingTerm: ValueTerm = {
        label: `${def.name} renewal — on ${standing} hex${standing === 1 ? '' : 'es'}${where} already carrying one`,
        value: each.total * standing,
        parts: [
          ...each.terms,
          { label: `× ${standing} hex${standing === 1 ? '' : 'es'}`, value: standing, op: 'mul' },
        ],
      };
      const buildableTerm: ValueTerm = {
        label: `${def.name} renewal — on ${buildable} hex${buildable === 1 ? '' : 'es'}${where} this empire could put one on`,
        value: each.total * buildable * spade().value,
        parts: [
          ...each.terms,
          { label: `× ${buildable} hex${buildable === 1 ? '' : 'es'}`, value: buildable, op: 'mul' },
          spade(),
        ],
      };
      const value = standingTerm.value + buildableTerm.value;
      steps.push({
        kind: 'rider',
        id: improvement,
        name: `${def.name} renewal`,
        towns: standing + buildable,
        cost: 0,
        rate: value,
        delay: researchDelay,
        value,
        terms: [standingTerm, buildableTerm],
      });
    }
  }
  return steps;
}

/** One decimal place, and no trailing `.0` — a label is read, not parsed. */
function round(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}
