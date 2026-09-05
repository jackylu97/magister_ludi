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
 * appraisal in the bot.
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
 * two `explainLump` calls below remain the only lines that would change.
 *
 * **Where the delay is crude, and why it is written down as crude.** Steps are
 * assumed to be raised one after another by a middling town
 * (`ValueContext.medianProduction`, batch 2), so the cursor walks the building
 * steps in roster order and each one waits for the ones before it. Towns build in
 * *parallel*, so a step's build time is one town's rather than every town's, and
 * only its hammers multiply by the towns. A unit unlock advances no cursor at
 * all: it is an option the empire may take the turn the node lands, never an
 * obligation, and it is priced exactly as the beeline always priced it.
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
  explainMeterCall,
  explainSoldier,
  explainYields,
  valueOfSoldier,
  valueOfYields,
} from './value';

import { BEAD_RULES } from '../sim/beadData';
import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import { IMPROVEMENT_IDS, improvementDef } from '../sim/improvementData';
import { authorityOf, happinessOf } from '../sim/meters';
import { type ProjectId, projectDef } from '../sim/projectData';
import { type GameState, type Player, realPlayers } from '../sim/state';
import { buildError, gatingTech, opusOpen, researchExpansion, researchPlan } from '../sim/tech';
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
  const { road, beakers: remainingBeakers, delay: researchDelay } = researchRoad(state, player, ctx, goal);
  const held = road.length === 0;

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
    const towns = townsWanting(state, player, building);
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
  // **A node that pays a bead** (`TechDef.paysBead`) — the research half of the
  // win-condition templates (batch 5). Nothing in the bot priced this clause
  // before: a node that hands over a glass bead was worth exactly its unlocks,
  // and the one node that carries it is the node that opens the great work for
  // the world. It is worth `weights.bead` like every other bead, or — while the
  // race is live — the race chain's own share of what closing it is worth, which
  // is the same door a building step of the race walks through (`raceTerm`).
  if (techDef(goal).paysBead !== undefined) {
    giftTerms.push(
      raceTerm(ctx, { kind: 'tech', id: goal }) ?? {
        label: 'a glass bead when the node lands',
        value: ai.weights.bead,
      },
    );
  }
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
 * Every town of the empire that does not hold it, and **one** for a wonder,
 * because there is only ever one of those and pricing it per town was the purest
 * of the every-town optimisms. A wonder somebody has already claimed is owed by
 * nobody at all.
 *
 * **Uncapped since batch 7.** `score.cityCap` clipped this at six towns so that
 * "in every town" could not run away with a wide empire, and the acceptance says
 * it was not what was holding the bot together: a chain owed by ten towns *is*
 * ten raisings, `stepsRemaining` divides the worth by exactly that number, and
 * each town then folds one share of it. The cap was shortening the numerator and
 * the denominator by different amounts.
 *
 * `buildError` is deliberately *not* asked: a chain is about a node that has not
 * landed yet, and the simulation's gate would refuse every row of it for want of
 * the technology. The gate belongs to the arm that raises the row; what belongs
 * here is the count of towns the row is still missing from.
 */
function townsWanting(state: GameState, player: Player, id: BuildingId): number {
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
  return lacking;
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
 * into a deficit stifles the growth of every town that already stands.
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
  const hammers = settler.walking ? 0 : def.cost;
  const buildDelay = settler.walking ? 0 : buildTurns(def.cost, ctx);
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
      cost: def.cost,
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
 * Nothing here walks the board: the chains are already built and hanging on the
 * context, so this is a fold over a list the decision has already paid for.
 */
export function townChainShare(ctx: ValueContext): Appraisal {
  const terms: ValueTerm[] = [];
  for (const chain of ctx.chains) {
    for (const step of chain.steps) {
      if (step.kind !== 'building') continue;
      const share = step.value / Math.max(1, step.towns);
      const stones = explainLump({ production: stepUnitCost(step) }, ctx).total;
      if (share - stones <= 0) continue;
      terms.push({
        label:
          `${step.name} — one more town to raise it for the ${techDef(chain.goal).name} engine`,
        value: share - stones,
      });
    }
  }
  return appraise(terms);
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
 * **Out of reach is a printed zero.** The winner is whoever holds the most beads
 * when the work is finished (`closeTheGreatWork`), so a rival who would close
 * first *and* hold more beads when they do has the game whatever this empire
 * builds. The chain folds a `× 0` term naming them rather than quietly reading
 * low: a bot that keeps pouring hammers into a race it has lost is the failure
 * this clause exists to prevent, and a reader of the feed should be able to see
 * it decline.
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
  /** True when a rival would close first holding more beads. Folds a `× 0`. */
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
  const buildDelay = Math.ceil(def.cost / Math.max(1, ctx.bestProduction));
  // The rod and the road fill together: an empire earns beads while it researches,
  // so what it waits for is the later of the two, and then the raising.
  const delay = Math.max(beadDelay, owed.delay) + buildDelay;

  const rival = leadingRival(state, player, threshold, horizon, buildDelay);
  const raceHorizon = open ? (rival === null ? Number.POSITIVE_INFINITY : rival.close) : horizon;
  const inTime = delay < raceHorizon;
  // **Out of reach**, crudely and on public numbers: a rival that closes before
  // this empire could, holding more beads at the moment it closes, has the game.
  // Their tally at that moment is at least the threshold (they cannot begin the
  // work below it); ours is what the rod holds plus what the rate would add.
  const oursThen = rival === null ? held : held + rate * rival.close;
  const theirsThen = rival === null ? 0 : Math.max(threshold, rival.beads + rival.rate * rival.close);
  const lost = rival !== null && rival.close < delay && theirsThen > oursThen;

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
      label: 'closing the great work — the realm holding the most beads takes the game',
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
      `${Math.round(def.cost)} hammers in the busiest town — ${buildDelay} turns)`,
    value: 0,
  });
  if (lost) {
    terms.push({
      label:
        `× 0 — ${rival!.name} holds ${rival!.beads} beads and would close in ` +
        `${round(rival!.close)} turns, before this empire could pass them`,
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
    hammers: def.cost,
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

/** One decimal place, and no trailing `.0` — a label is read, not parsed. */
function round(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}
