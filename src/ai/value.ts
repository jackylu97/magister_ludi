/**
 * **One currency, and every opinion priced in it.**
 *
 * Tier 1 of the ladder Entry LIII wrote down (*"scored greedy on the sim's own
 * explainers → one value currency + weights"*). The bot's v0 answered every
 * question with a *fixed list* — a build order, a preference for an effect
 * label, the cheapest open technology — and a fixed list cannot trade a library
 * against a swordsman, which is the only question a 4X seat ever really asks.
 *
 * This module is the exchange rate. `data/ai.json`'s `weights` block says what
 * one per-turn point of each of the six voices is worth **in this age**, and
 * what a bead, a die, a technology, a citizen, a city and a point of combat
 * strength are worth beside them. Everything here folds some *shape* — a bag of
 * yields, a card's effects, a technology's gifts — into that one number, so
 * `bot.ts` can compare things that have nothing else in common.
 *
 * Three rules hold this file together, and each of them is load-bearing:
 *
 *   · **It is pure and it is flat.** No state is mutated, nothing is cached
 *     between calls, and every constant is a key in `data/ai.json`. The vector
 *     is the *optimizer's surface*: the successor on the ladder is self-play
 *     parameter tuning, which needs a flat JSON file it can rewrite and a
 *     scoring function that reads it fresh. A weight in a `const` is a weight a
 *     tuner cannot reach.
 *   · **It never reads a rule.** Deltas come from the simulation's own folds —
 *     `cityYields(state, city, [candidate])` against `cityYields(state, city)`
 *     is the whole of "what would this building pay", staged by Entry XVII and
 *     hypothetical-aware because the simulation already does that arithmetic.
 *     This module only ever *weights* an answer somebody else computed.
 *   · **An unknown shape is worth a little, never nothing and never a crash.**
 *     `CardEffect` has thirty-odd members and this file recognises a dozen of
 *     them; the rest score `score.unknownEffect`. Zero would make a card whose
 *     effects this bot cannot read strictly worse than a blank one, which is the
 *     opposite of the truth, and a `never` exhaustiveness check here would make
 *     adding a card shape a compile error in the *AI*, which is not where that
 *     decision belongs.
 *
 * Why it is its own module rather than more of `bot.ts`: the two answer
 * different questions. `bot.ts` is a *policy* — what does this seat do next —
 * and every function in it ends in a `Command`. This is an *appraisal*, and
 * every function in it ends in a number. The seam is also what makes the
 * scoring testable without playing a game.
 *
 * **Every appraisal returns its arithmetic** (the spectate pass)
 * ---------------------------------------------------------------
 * Each fold below comes in two forms: an `explain…` that returns an `Appraisal`
 * — a labelled term list and the number it folds to — and the plain
 * `valueOf…`/`score…` name, which is that appraisal's `.total` and nothing else.
 * The number is **computed by folding the terms** (`foldTerms`), not computed
 * separately and described afterwards, so a printed breakdown and the bot's
 * actual comparison can never disagree. The fold walks the list in the order the
 * clauses were written, which is why the totals are bit-for-bit what they were
 * before the terms existed: a regrouped floating-point sum is a different
 * number, and the bot's contract is that the same board produces the same
 * command.
 */

import type { AiConfig } from './aiConfig';
import { type Appraisal, type ValueTerm, appraise, nest } from './decision';
// **Type-only, and deliberately so.** `wants.ts` reads this module's folds at
// runtime; this module only needs to *name* the book its context carries. The
// import is erased at build, so the leaf stays a leaf — `statecraft.ts`'
// documented exception one system over.
import type { WantBook } from './wants';
// Type-only for the same reason: `chain.ts` reads this module's folds at
// runtime, and this module only needs to *name* the chains its context carries.
import type { BeadChain, ExpansionChain, TechChain } from './chain';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import { cityYields } from '../sim/cities';
import { countOf } from '../sim/statecraft';
import type { CardCountScaledEffect, CardEffect, CardId } from '../sim/statecraftData';
import { type ProjectId, projectDef } from '../sim/projectData';
import type { GameState } from '../sim/state';
import { buildError } from '../sim/tech';
import { type TechAge } from '../sim/techData';
import { TILE_YIELD_KEYS, type TileYield } from '../sim/terrainData';
import { type UnitTypeId, isCombatant, unitDef } from '../sim/unitData';

/** The six voices, in the order every ledger in the game prints them. */
export const VOICES = ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const;
export type Voice = (typeof VOICES)[number];

/** A bag of per-turn yields — a delta, a payout, a card's flats. */
export type YieldBag = Partial<Record<Voice, number>>;

/**
 * Everything an appraisal needs to know about *this empire, this turn* that is
 * not in the thing being appraised.
 *
 * Hoisted once per decision (`valueContext` in `bot.ts`) rather than derived per
 * candidate, for `tileOwnerField`'s stated reason one system over: `netGold`
 * prices every city in the empire, and asking it once per building row would be
 * forty empire sweeps to choose one queue item. **Its lifetime is one
 * decision** — the same bargain — because a context that outlived its loop would
 * appraise against a treasury the state has moved past.
 */
export interface ValueContext {
  /**
   * **The seat's own configuration** — `aiConfigFor(player.persona)`, which is
   * the balanced sheet for most seats and a sparse override of it for the rest.
   *
   * It rides in the context rather than being swapped into a module global for
   * one reason, and it is the reason two personas are a feature at all: two
   * seats appraise *in the same turn*, and a global swapped between them would
   * make a decision a function of whichever seat asked last. A context is
   * already the thing whose lifetime is one decision (see below), so the seat's
   * taste belongs in it beside the seat's treasury.
   */
  ai: AiConfig;
  /**
   * **The board this opinion is about**, and whose seat is holding it.
   *
   * Here for the readings that cannot be made off a row at all — what this
   * empire *actually* counts today (`countOf`), and which of its towns could
   * still raise a given building. Its lifetime is the context's, which is one
   * decision, for the stated reason: a board that outlived its loop would be
   * appraised against a world the state has moved past.
   *
   * Nothing here mutates it, and nothing here reads sim randomness — this file
   * is still pure and flat. It reads the simulation's own folds, which is the
   * module's second rule rather than an exception to it.
   */
  state: GameState;
  /** Whose appraisal this is. The seat every reading above is taken for. */
  playerId: number;
  /** The empire's age, from `highestAge`. Indexes every yield weight. */
  age: TechAge;
  /** Towns held, capped at `score.cityCap` so a wide empire cannot dominate. */
  cities: number;
  /**
   * How much dearer a coin is than the weight table says, ≥ 1.
   *
   * **The collapse lever** (design ledger Entry LIX finding 1: both seats at
   * −125💰/turn and −1,642 in the treasury by t160). One number does two jobs
   * and that is deliberate: gold *deltas* are multiplied by it, so a market
   * outbids a library when the books are bleeding, and gold *upkeep* is charged
   * at it, so a maintained building stops looking free. A single knob keeps the
   * two halves from ever disagreeing about how bad the debt is.
   */
  goldPressure: number;
  /**
   * Why the pressure reads what it does, when the reason is not simply the
   * books — today only the opening grace (`solvency.graceTreasury`). Empty
   * otherwise, and appended to every printed pressure so a reader of the feed
   * can see a 1 that was *decided* rather than merely arrived at.
   *
   * A label, never a number: it changes no fold, so no pin moves.
   */
  pressureNote: string;
  /**
   * Enemy combat pieces standing within `threat.radius` of one of this empire's
   * towns, capped. Zero in a quiet world.
   */
  threat: number;
  /**
   * **What the seat has sighted** — the wild's camps it has charted and the
   * hostile pieces it can see (`sightedThreat` in `bot.ts`), read through this
   * empire's own fog and never off the true board.
   *
   * `threat`'s wider sibling and deliberately not a replacement for it: that one
   * is "an enemy is at my gate", this one is "there is a lot of wild out there".
   * Two counts rather than one number because the two are weighted separately
   * (`threat.armyPerSightedCamp`, `armyPerSightedHostile`) and because a printed
   * appetite that could not say *what* it had seen would be a number a reader of
   * the feed has to take on trust.
   */
  sighted: { camps: number; hostiles: number };
  /**
   * 1 while this empire holds a god and has founded no religion, 0 otherwise —
   * the one window in which the road to a prophet is the most valuable thing on
   * the chart. `threat`'s sibling: a fact about the world that swings one term
   * of the appraisal and swings back when it is answered.
   */
  faithAppetite: number;
  /**
   * **What a coin and a point of faith are worth to *this* empire, today** —
   * the shadow prices (`shadowPrices`, `wants.ts`), and the numbers every fold
   * below prices a gold or a faith yield at.
   *
   * The weight table is no longer the live value of those two voices; it is the
   * **prior** and the band anchor. What replaces it is a reading of the empire's
   * own want book: if the best thing a coin could do is finish a granary at
   * eight points a coin, a coin is worth eight, and a market that pays four of
   * them a turn is worth what a market that pays four of them is *really* worth
   * to this empire. If there is nothing left to buy, a coin is worth the floor
   * of the band and the arms stop chasing gold they have no use for.
   *
   * **Gold's price subsumes `goldPressure`.** The prior it is banded around is
   * `weights.gold × goldPressure`, so a bleeding empire's prices start dear and
   * the multiplication is not taken twice — which is why nothing below
   * multiplies a gold term by the pressure any more.
   *
   * **The two constraints join them in batch 4** — `authority` and `happiness`,
   * read through `meterWeight` rather than `voiceWeight` because a meter is not
   * a yield: it is a *capacity*, and a point of it is only dear while something
   * this empire wants is over-spending it. See `meterPrices` in `wants.ts`.
   *
   * The four remaining voices read the table exactly as before (`voiceWeight`).
   * **Hammers are deliberately not among them**, and that is batch 4's one
   * written-down non-delivery: see `chain.ts`' note on what a hammer costs.
   */
  prices: { gold: number; faith: number; authority: number; happiness: number };
  /**
   * Why each price reads what it does — "faith is dear: the first religion is
   * worth 600 for 120 faith". Printed beside every priced term, and a **label**
   * like `pressureNote`: it changes no fold, so no pin moves.
   */
  priceNotes: { gold: string; faith: string; authority: string; happiness: string };
  /**
   * **The book the prices were read off** — every want this empire has in
   * either bank, ranked by nothing and priced by everything (`wants.ts`).
   *
   * It rides on the context because it is built there and because the spend
   * arms need the very list the prices came from: a book rebuilt in the arm
   * would be a second walk of the same rows that could disagree with the price
   * every other arm is reading.
   *
   * It is appraised at the **prior** — a want book priced at the shadow prices
   * it is itself about to set would be a fixed point nobody has asked for, and
   * one honest pass is what batch 1 ships. See `valueContext` in `bot.ts`.
   */
  wants: WantBook;
  /**
   * **The expansion chain** (`expansionChain`, `chain.ts`) — the next town this
   * empire would found, priced as a chain: the settler it has still to raise,
   * the walk to the site, the writ and the contentment founding would spend.
   *
   * `null` when there is nowhere legal to found inside the search radius, which
   * is an empire with no expansion chain rather than one with a worthless one.
   *
   * It rides on the context for `wants`' reason exactly — it is built once per
   * decision, and the two arms that read it (the settler candidate and the
   * escort soldier) would otherwise each walk the map for it. It is also what
   * the two **constraint prices** are read off, which is why it is built before
   * them and appraised, like the book, at the prior.
   */
  expansion: ExpansionChain | null;
  /**
   * **Every tech chain this empire is executing** (`liveChains`, `chain.ts`) —
   * the research goal it is aiming at, and one per technology it holds whose
   * buildings some town of its has still to raise.
   *
   * Batch 3's touch point (b): a build candidate that **is** a step of one of
   * these folds `chain.worth ÷ chain.stepsRemaining` as a labelled term, and a
   * purchase that would deliver one folds what the delivery buys the chain in
   * turns. It rides on the context for `wants`' reason exactly — it is built
   * once per decision, and an arm that rebuilt it would be a second walk of the
   * same rows that could disagree with the one the other arms read.
   *
   * Appraised at the **prior**, like the book: chains priced at shadow prices
   * they are themselves about to help set would be a fixed point nobody asked
   * for. See `valueContext` in `bot.ts`.
   */
  chains: TechChain[];
  /**
   * **What a middling town of this empire makes in a turn** — the median of its
   * towns' `cityYields().production`, and 1 for an empire with no town at all.
   *
   * The one estimate behind every *build* delay in the bot (batch 2 of
   * `docs/bot-priorities.md`): a row costs hammers, and "how long until this is
   * standing" is that cost over what a town actually makes. The **median**
   * rather than the mean because one hammer-rich capital beside three hamlets
   * should not tell the beeline that every town raises a library in four turns.
   *
   * Hoisted here for the context's stated bargain: `explainTechGifts` is asked
   * of fifty nodes a turn and a counted card of every row in a hand, and each of
   * them would otherwise price every town in the empire to answer one division.
   */
  medianProduction: number;
  /**
   * **What this empire's busiest town makes in a turn** — the median's sibling,
   * taken in the same sweep, and the denominator of exactly one delay: the
   * twelve-hundred-hammer great work (`beadChain`, batch 5).
   *
   * A capstone is not raised by a middling town and never has been: the endgame
   * arm picks the busiest town for it (`isOpusTown`), so the honest estimate of
   * *when the work would stand* is that town's rate rather than the empire's
   * middle one. Every other build delay in the bot stays on the median, because
   * every other row is one a middling town really does raise.
   */
  bestProduction: number;
  /**
   * **Beakers a turn, as the simulation's own books read them**
   * (`empireRateReading().sciencePerTurn`) — the denominator of every *research*
   * delay, and hoisted for the same reason as the median above: the worker plan
   * asks "how far off is the node on my plan" once per hex.
   */
  scienceRate: number;
  /**
   * **The bead race, as a chain** (`beadChain`, `chain.ts`, batch 5) — the road
   * from here to a closed great work, priced at `weights.victory` and delayed by
   * the rod, the road and the raising.
   *
   * `null` when no row on the table is the finish line at all. Otherwise it is
   * present on every context and **worth nothing at all** until the race is
   * within reach, which is the batch's null half: an empire twenty beads short
   * at a bead every thirty turns prices the curtain at zero and no candidate
   * anywhere carries its term.
   *
   * It is built **first** of the four things hanging on this context, because the
   * tech chains read it (a node carrying `paysBead` is a step of the race) and
   * nothing it reads is a chain.
   */
  race: BeadChain | null;
}

/**
 * **The delay discount** — `max(0, (H − delay) / H)`, `H` being
 * `priorities.horizonTurns` (batch 2 of `docs/bot-priorities.md`).
 *
 * What the flat potential weight of 2026-09-04 was approximating, and the reason
 * that knob is gone: a promise is not worth four tenths of a fact, it is worth
 * *less the longer it takes*, and every call site of the old λ knows something
 * honest about how long its own promise takes. A row a town raises in six turns
 * is worth almost all of what it will pay; a row nothing can finish inside the
 * horizon is worth nothing, and prints as nothing rather than at four tenths of
 * a fact.
 *
 * The floor at zero is the spec's own `max(0, H − delay)`. The horizon is
 * floored at one so a sheet that sets it to nought cannot divide by it.
 */
export function delayDiscount(delay: number, ctx: ValueContext): number {
  const horizon = Math.max(1, ctx.ai.priorities.horizonTurns);
  return Math.max(0, (horizon - delay) / horizon);
}

/**
 * The discount **as a printed term**, which is the ruling's other half: every
 * call site multiplies by it and every one of them shows the multiplication, so
 * a reader of the feed sees a discounted promise and the turns behind it rather
 * than a number somebody folded away.
 *
 * `why` is the site's own sentence about what the wait is for — the spades, the
 * towns, the node.
 */
export function delayTerm(delay: number, ctx: ValueContext, why: string): ValueTerm {
  const horizon = Math.max(1, ctx.ai.priorities.horizonTurns);
  const discount = delayDiscount(delay, ctx);
  return {
    label: `× ${round(discount)} — ${why}, some ${round(delay)} turns against a ${horizon}-turn horizon`,
    value: discount,
    op: 'mul',
  };
}

/**
 * **How many turns a middling town would take to raise a row of this cost** —
 * the honest, bounded estimate the two build-delay sites share (the beeline's
 * per-town building gift and a counted card's buildable towns).
 *
 * Crude on purpose, and written down as crude: it is the row's whole cost over
 * `ValueContext.medianProduction`, with no queue, no overflow, no purchase and
 * no walk. What it is *not* is the old flat weight — a Monument in a hamlet and
 * a University in the same hamlet are no longer the same promise, which is the
 * whole of what batch 2 buys.
 *
 * Rounded **up**: a row a town cannot finish this turn takes another one.
 */
export function buildTurns(cost: number, ctx: ValueContext): number {
  return Math.ceil(Math.max(0, cost) / Math.max(1, ctx.medianProduction));
}

/**
 * The median production of this empire's towns — `ValueContext.medianProduction`,
 * computed once by `valueContext` and read from the context everywhere else.
 *
 * The reading is `cityYields`, the simulation's own fold, so a town's hammers
 * mean here exactly what they mean in the queue that spends them. An empire with
 * no town at all answers 1 rather than 0: a division has to be safe, and "one
 * hammer a turn" is the honest floor for an empire that has yet to found
 * anything.
 */
export function medianTownProduction(state: GameState, playerId: number): number {
  return townProduction(state, playerId).median;
}

/**
 * **Both hammer readings, in one sweep** — the middle town's and the busiest
 * town's (`ValueContext.medianProduction` / `bestProduction`).
 *
 * One walk rather than two, which is the context's standing bargain said once
 * more: `cityYields` prices every worked hex of a town, and asking it twice per
 * decision to answer two divisions would be a second sweep of the whole empire.
 *
 * An empire with no town at all answers 1 for both rather than 0: a division has
 * to be safe, and "one hammer a turn" is the honest floor for an empire that has
 * yet to found anything.
 */
export function townProduction(
  state: GameState,
  playerId: number,
): { median: number; best: number } {
  const made: number[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    made.push(cityYields(state, city).production);
  }
  if (made.length === 0) return { median: 1, best: 1 };
  made.sort((a, b) => a - b);
  const middle = Math.floor(made.length / 2);
  const median =
    made.length % 2 === 1 ? made[middle]! : (made[middle - 1]! + made[middle]!) / 2;
  return { median: Math.max(1, median), best: Math.max(1, made[made.length - 1]!) };
}

/**
 * What one per-turn point of a voice is worth in this age, **to this seat**.
 *
 * The configuration is a parameter rather than a global because a persona is a
 * different weight table and two seats appraise in the same turn — see
 * `ValueContext.ai`.
 */
export function yieldWeight(ai: AiConfig, voice: Voice, age: TechAge): number {
  const row = ai.weights[voice];
  const index = Math.min(row.length - 1, Math.max(0, age - 1));
  return row[index] ?? 0;
}

/**
 * **What one per-turn point of a voice is worth to this seat right now** — the
 * live reading, which is the weight table for four voices and the shadow price
 * for the two the book prices (`ValueContext.prices`).
 *
 * This is the single door touch point (a) of the priority spec walks through:
 * every fold below that used to read `yieldWeight` for a gold or a faith term
 * reads this instead, so a coin costs and pays the same number everywhere in
 * the bot, and that number is the empire's own rather than the table's.
 *
 * `yieldWeight` survives beside it as *the table's own statement* — the prior
 * the band is anchored to, which is a different question and one `wants.ts`
 * still has to ask.
 */
export function voiceWeight(ctx: ValueContext, voice: Voice): number {
  if (voice === 'gold') return ctx.prices.gold;
  if (voice === 'faith') return ctx.prices.faith;
  return yieldWeight(ctx.ai, voice, ctx.age);
}

/** The two meters the priority system prices. `MeterId`'s reading, locally. */
export type PricedMeter = 'authority' | 'happiness';

/**
 * **What one point of a meter is worth to this seat right now** — `voiceWeight`'s
 * sibling for the two *constraints* (batch 4 of `docs/bot-priorities.md`), and the
 * single door every fold that used to read `weights.authority` or
 * `weights.happiness` now walks through.
 *
 * A meter is not a yield and the difference is the whole reason this is a second
 * function rather than two more members of `Voice`. A coin is a **stock** that
 * arrives at a rate and is spent on rows in a book; a point of writ is a
 * **capacity** that does not arrive at all — it lands when a building, an age, a
 * card or a seam supplies it, and until then an empire that is short of it is
 * simply short. So the price is not read off a rate of arrival: it is read off
 * what the hungriest thing blocked on the meter would pay for one more point
 * (`meterPrices`, `wants.ts`).
 *
 * The floor of the band is different for the same reason, and it is stated in
 * `meterPrices`: a bank with nothing to buy is worth its floor, but headroom on a
 * meter is a standing tier bonus nobody can revoke, so a constraint is never
 * worth *less* than the table says.
 */
export function meterWeight(ctx: ValueContext, meter: PricedMeter): number {
  return meter === 'authority' ? ctx.prices.authority : ctx.prices.happiness;
}

/** What a meter was multiplied by, and why — a label; it changes no fold. */
export function meterWords(ctx: ValueContext, meter: PricedMeter): string {
  const note = ctx.priceNotes[meter];
  return `${round(meterWeight(ctx, meter))} the ${meter} price` + (note === '' ? '' : ` (${note})`);
}

/**
 * **What a one-time call on a meter is worth**, priced at that meter's live
 * price — `explainLump`'s shape one constraint over.
 *
 * There is no `÷ lumpTurns` here and that is the difference between the two: a
 * point of writ over-spent is not a gift paid once, it is a point of capacity
 * gone for as long as the town stands. `weights.authority` and
 * `weights.happiness` are already stated as *stocks* (what one point of the meter
 * is worth), which is why every reader of them — a building's `authorityCapacity`
 * line, a card's `authority` grant — multiplies and does not divide.
 */
export function explainMeterCall(
  bag: Partial<Record<PricedMeter, number>>,
  ctx: ValueContext,
): Appraisal {
  const terms: ValueTerm[] = [];
  for (const meter of ['authority', 'happiness'] as const) {
    const amount = bag[meter];
    if (amount === undefined || amount === 0) continue;
    terms.push({
      label: `${meter} ${signed(amount)} × ${meterWords(ctx, meter)}`,
      value: amount * meterWeight(ctx, meter),
    });
  }
  return appraise(terms);
}

/**
 * A bag of per-turn yields, in the one currency.
 *
 * Gold and faith are priced by the want book rather than by the table (see
 * `voiceWeight`), and **gold's price already carries the pressure** — which is
 * why nothing here multiplies a coin by `goldPressure` any more. It moved into
 * the price so that the two halves of the collapse lever (a gain credited, a
 * bill charged) go on being one number after the book has had its say.
 */
export function explainYields(bag: YieldBag, ctx: ValueContext): Appraisal {
  const terms: ValueTerm[] = [];
  for (const voice of VOICES) {
    const amount = bag[voice];
    if (amount === undefined || amount === 0) continue;
    const weight = voiceWeight(ctx, voice);
    terms.push({
      label: `${voice} ${signed(amount)} × ${round(weight)} ${weightWords(ctx, voice)}`,
      value: amount * weight,
    });
  }
  return appraise(terms);
}

export function valueOfYields(bag: YieldBag, ctx: ValueContext): number {
  return explainYields(bag, ctx).total;
}

/**
 * What the number a voice was multiplied by **is** — the age weight for the four
 * unpriced voices, and the live price with its reason for the two the book
 * prices. A label: it changes no fold.
 */
function weightWords(ctx: ValueContext, voice: Voice): string {
  if (voice !== 'gold' && voice !== 'faith') return 'age weight';
  const note = ctx.priceNotes[voice];
  return `the ${voice} price` + (note === '' ? '' : ` (${note})`);
}

/**
 * What a **one-time gift** of a bag of yields is worth beside a per-turn one.
 *
 * A farm pays every turn until the world ends; a merchant's purse pays once.
 * Everything else in this file is a rate, so a lump has to be converted into one
 * before it can be compared — `score.lumpTurns` is that exchange rate, and it is
 * the only reason "act now" and "plant the work" can sit in one scored table
 * (see the great person's arm in `bot.ts`).
 */
export function explainLump(bag: YieldBag, ctx: ValueContext): Appraisal {
  const turns = Math.max(1, ctx.ai.score.lumpTurns);
  const weighted = explainYields(bag, ctx);
  if (weighted.terms.length === 0) return appraise([]);
  return appraise([
    nest('what it pays, weighted', weighted),
    { label: `÷ ${round(turns)} — a gift paid once, not every turn`, value: turns, op: 'div' },
  ]);
}

/** One decimal place, and no trailing `.0` — a label is read, not parsed. */
function round(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}

function signed(value: number): string {
  return value >= 0 ? `+${round(value)}` : round(value);
}

/**
 * A tile yield as a bag the appraisal weights. The keys are the six voices.
 *
 * Here rather than in `bot.ts` because two readers need it — the citizen's next
 * workable hex and the chain's renewal riders (`chain.ts`) — and a helper two
 * modules need lives in the leaf they both stand on, which is `roads.ts`' bargain
 * one system over.
 */
export function bagOfTileYield(yields: TileYield): YieldBag {
  const bag: YieldBag = {};
  for (const key of TILE_YIELD_KEYS) bag[key] = yields[key];
  return bag;
}

/** `after − before`, voice by voice. The shape every hypothetical produces. */
export function yieldDelta(after: Record<Voice, number>, before: Record<Voice, number>): YieldBag {
  const bag: YieldBag = {};
  for (const voice of VOICES) bag[voice] = after[voice] - before[voice];
  return bag;
}

/**
 * What an ongoing gold bill is worth **against** a candidate, as a positive
 * number the caller subtracts.
 *
 * Priced at the gold weight times the pressure — the same rate a gold *gain* is
 * credited at, which is the identity that makes the two comparable: a market
 * paying 4💰 and a library costing 2💰 to keep are one subtraction apart, in
 * every state of the treasury.
 */
export function explainUpkeepCost(gold: number, ctx: ValueContext): Appraisal {
  if (gold <= 0) return appraise([]);
  const price = voiceWeight(ctx, 'gold');
  return appraise([
    { label: `${round(gold)} gold a turn`, value: gold },
    { label: `× ${round(price)} ${weightWords(ctx, 'gold')}`, value: price, op: 'mul' },
  ]);
}

export function costOfUpkeep(gold: number, ctx: ValueContext): number {
  return explainUpkeepCost(gold, ctx).total;
}

// --- the rows ---------------------------------------------------------------

/**
 * A building's worth **beyond its yields** — everything the hypothetical
 * `cityYields` cannot see.
 *
 * The split is exactly the simulation's own: flat yields fold in `cityYields`
 * (so a candidate handed to it as a `hypothetical` is already priced, staged and
 * percentaged by the real arithmetic), while happiness, authority capacity, the
 * defensive stat, the renown trickle, a wonder's `effects` and a capstone's
 * completion grants are read *off the row* — which is `buildingEffects.ts`' own
 * division of labour one reader over.
 *
 * A **bead** is where the endgame enters the build list: the Opus and the
 * Observatory's three great works each carry `onComplete: [{ grant: 'bead' }]`,
 * and `weights.bead` is what makes a thousand-hammer row worth starting. The row
 * that `endsTheGame` carries `weights.victory` on top, because finishing it is
 * not a bead — it is the curtain (Entry LVIII).
 *
 * Nothing here compares a building against a name: every clause is a marker on
 * the row, which is the discipline `src/sim/` keeps and a reader of the same
 * tables has no business breaking.
 */
export function explainBuildingRow(id: BuildingId, ctx: ValueContext): Appraisal {
  const def = buildingDef(id);
  const terms: ValueTerm[] = [];
  if (def.happiness !== undefined) {
    terms.push({
      label: `${signed(def.happiness)} happiness × ${meterWords(ctx, 'happiness')}`,
      value: def.happiness * meterWeight(ctx, 'happiness'),
    });
  }
  if (def.authorityCapacity !== undefined) {
    // **The capacity row, at the empire's own price** (batch 4): a Palace annex
    // in an empire whose next town is blocked on writ is worth what that town
    // is worth per point of writ, not what the table says a point is worth in
    // the abstract. That is the whole of the audit's authority example.
    terms.push({
      label: `${signed(def.authorityCapacity)} authority × ${meterWords(ctx, 'authority')}`,
      value: def.authorityCapacity * meterWeight(ctx, 'authority'),
    });
  }
  if (def.cityStat !== undefined) {
    // A wall is worth what a soldier's worth of strength is worth, scaled by how
    // much this empire currently minds being attacked.
    terms.push({
      label: `${signed(def.cityStat.amount)} town strength × ${ctx.ai.weights.military} × ${1 + ctx.threat} threat`,
      value: def.cityStat.amount * ctx.ai.weights.military * (1 + ctx.threat),
    });
  }
  if (def.renown !== undefined) {
    terms.push({
      label: `${signed(def.renown.perTurn)} renown a turn × ${ctx.ai.weights.renown}`,
      value: def.renown.perTurn * ctx.ai.weights.renown,
    });
    terms.push({
      label: `${signed(def.renown.onComplete ?? 0)} renown on completion × ${ctx.ai.weights.renown}`,
      value: (def.renown.onComplete ?? 0) * ctx.ai.weights.renown,
    });
  }
  for (const grant of def.onComplete ?? []) {
    if (grant.grant === 'bead') terms.push({ label: 'a glass bead on completion', value: ctx.ai.weights.bead });
    else if (grant.grant === 'unit')
      terms.push({ label: 'a free piece on completion', value: ctx.ai.weights.military * ctx.ai.score.combatScale });
    else if (grant.grant === 'tech') terms.push({ label: 'a free technology', value: ctx.ai.weights.tech });
    else terms.push({ label: `a grant this bot cannot read (${grant.grant})`, value: ctx.ai.score.unknownEffect });
  }
  if (def.endsTheGame === true) terms.push({ label: 'it ends the game', value: ctx.ai.weights.victory });
  terms.push(nest('its written effects', explainEffects(def.effects ?? [], ctx)));
  return appraise(terms);
}

export function valueOfBuildingRow(id: BuildingId, ctx: ValueContext): number {
  return explainBuildingRow(id, ctx).total;
}

/**
 * A repeatable conversion's worth: what one turn of it pays, weighted, against
 * the hammers one turn of it costs — expressed as a per-turn figure so the
 * caller's amortisation treats it like everything else.
 *
 * A project never finishes (Entry XXVI), so `turnsToBuild` is "how often does
 * this pay" rather than "when is this done", and the two questions being one is
 * exactly what lets a conversion sit in the same scored list as a granary.
 */
export function explainProjectRow(id: ProjectId, ctx: ValueContext): Appraisal {
  const def = projectDef(id);
  const bag: YieldBag = {
    gold: def.pays.gold ?? 0,
    science: def.pays.science ?? 0,
    faith: def.pays.faith ?? 0,
  };
  const terms: ValueTerm[] = [nest('what one turn of it pays', explainYields(bag, ctx))];
  if (def.bead !== undefined) terms.push({ label: 'a glass bead', value: ctx.ai.weights.bead });
  return appraise(terms);
}

export function valueOfProjectRow(id: ProjectId, ctx: ValueContext): number {
  return explainProjectRow(id, ctx).total;
}

/**
 * What a soldier of this type is worth to this empire right now.
 *
 * The strength reading is the roster's own — `combatStrength`, or a shooter's
 * `rangedStrength` when it is the higher — and the *threat* term is what makes
 * this a defence policy rather than a standing preference for the biggest
 * number: an empire with an enemy column beside a town values a spear far above
 * the library it would otherwise start, and values it right back down again the
 * turn the column is gone (design addendum 1). `threat.militaryBonus` is the
 * whole of that opinion and it is a number in the data file.
 */
export function explainSoldier(id: UnitTypeId, ctx: ValueContext): Appraisal {
  const def = unitDef(id);
  if (!isCombatant(def)) return appraise([]);
  const strength = Math.max(def.combatStrength, def.rangedStrength ?? 0);
  return appraise([
    { label: `${strength} strength × ${ctx.ai.weights.military}`, value: strength * ctx.ai.weights.military },
    {
      label: `${ctx.threat} enemy pieces near a town × ${ctx.ai.threat.militaryBonus}`,
      value: ctx.threat * ctx.ai.threat.militaryBonus,
    },
  ]);
}

export function valueOfSoldier(id: UnitTypeId, ctx: ValueContext): number {
  return explainSoldier(id, ctx).total;
}

// --- cards ------------------------------------------------------------------

/**
 * A card's effects, folded into the one currency — the honest small version of
 * the valuation Entry LIII called *"a real valuation: what the card would pay
 * *this* empire on *this* board"*.
 *
 * It is deliberately **not** that. A true appraisal would ask the evaluators in
 * `statecraft.ts` to answer hypothetically, which they are not built to do; this
 * is a flat sum over the shapes whose *magnitude* is legible from the row alone,
 * with a nominal stand-in wherever the row's figure is a rate ("per city", "per
 * copy", "on each such tile"). The nominal figures are `score.nominal*` and are
 * tuning surface like everything else.
 *
 * **One shape is no longer a guess** (2026-09-04): a `countScaled` is priced by
 * the count the simulation itself would pay it by, plus the promise of what the
 * empire could come to count, discounted by its own delay. See `explainCounted`
 * — and note
 * the `card`, which is threaded through for the one count whose answer belongs
 * to the holding rather than to the board (a growing card's own counter).
 *
 * The v0 this replaces counted **labels** — how many of a card's effects wore a
 * `kind` from a list of liked strings — which could not tell +1💰 from +6💰 and
 * ranked a card with three tiny effects above a card with one enormous one.
 *
 * **`statecraft.ts` is still the only module that switches on what a
 * `CardEffect.kind` *means*** (CLAUDE.md), and this does not break that: nothing
 * here computes an effect, applies one, or folds one into a total the game
 * reads. It reads a magnitude off a row to form an opinion, which is what a
 * player does looking at a card, and the opinion never leaves this file.
 */
export function explainEffects(
  effects: readonly CardEffect[],
  ctx: ValueContext,
  card?: CardId,
): Appraisal {
  const terms: ValueTerm[] = [];
  for (const effect of effects) {
    // **One shape is priced as an appraisal rather than as a number** — a
    // counted effect, whose worth is a real reading of the board multiplied by a
    // discounted promise, and whose arithmetic a reader of the feed has to be
    // able to see. `nest` keeps the outer sum's grouping exactly as it was.
    if (effect.kind === 'countScaled') {
      terms.push(nest(effect.kind, explainCounted(effect, ctx, card)));
      continue;
    }
    terms.push({ label: effect.kind, value: scoreEffect(effect, ctx) });
  }
  return appraise(terms);
}

export function scoreEffects(
  effects: readonly CardEffect[],
  ctx: ValueContext,
  card?: CardId,
): number {
  return explainEffects(effects, ctx, card).total;
}

function scoreEffect(effect: CardEffect, ctx: ValueContext): number {
  const nominal = ctx.ai.score.nominalYield;
  switch (effect.kind) {
    case 'cityYields':
      // Paid in every town the scope admits; the scope is not evaluated, so the
      // capped city count stands in for "how many towns is this really".
      return valueOfYields(bagOf(effect), ctx) * ctx.cities;
    case 'empireYields':
      return valueOfYields(bagOf(effect), ctx);
    case 'percentYields': {
      const percent = effect.percent / 100;
      if (effect.yield === 'all') {
        let sum = 0;
        for (const voice of VOICES) sum += voiceWeight(ctx, voice) * percent * nominal;
        return sum * ctx.cities;
      }
      return voiceWeight(ctx, effect.yield as Voice) * percent * nominal * ctx.cities;
    }
    case 'productionBonus':
      return voiceWeight(ctx, 'production') * (effect.percent / 100) * nominal * ctx.cities;
    case 'tileYield':
      // A `CardYieldBag` on the row, plus an optional percentage on whatever the
      // hex's improvement already pays; the bag is the legible half and the
      // percentage is priced against the nominal yield like every other rate.
      return (
        (valueOfYields(bagOf(effect), ctx) +
          ((effect.percent ?? 0) / 100) * nominal * voiceWeight(ctx, 'production')) *
        ctx.ai.score.nominalTiles
      );
    case 'countScaled':
      // Priced by `explainCounted`, which `explainEffects` calls directly — this
      // arm is the fallback for a caller that only wants the number.
      return explainCounted(effect, ctx).total;
    // The three constraint arms read the **live** meter price (batch 4), so a
    // card that supplies writ is worth more to an empire whose next town is
    // blocked on writ than to one with capacity to spare.
    case 'happiness':
      return effect.amount * meterWeight(ctx, 'happiness') * (effect.per === 'city' ? ctx.cities : 1);
    case 'authority':
      return effect.amount * meterWeight(ctx, 'authority') * (effect.per === 'city' ? ctx.cities : 1);
    case 'happinessTierBoost':
      return effect.points * meterWeight(ctx, 'happiness');
    case 'combatLine':
      return effect.amount * ctx.ai.weights.military * (1 + ctx.threat);
    case 'unitStat':
      return effect.amount * ctx.ai.weights.military * (1 + ctx.threat);
    case 'renown':
      return effect.amount * ctx.ai.weights.renown;
    case 'upkeepRebate':
      // A rebate is gold that never leaves, priced at the same pressure-adjusted
      // rate the bill is charged at — so a card that pays the army's wages
      // becomes the best card in the hand exactly when the treasury is bleeding.
      return costOfUpkeep((effect.amount ?? 1) * ctx.ai.score.nominalCount, ctx);
    case 'offerRider':
      return ctx.ai.score.unknownEffect * ctx.ai.score.nominalCount;
    default:
      // **Never zero.** A shape this bot cannot read is a shape whose card is
      // still worth more than a blank one, and a card whose whole text is
      // unreadable must not sort below an empty offer.
      return ctx.ai.score.unknownEffect;
  }
}

// --- counted effects, at the delay discount ---------------------------------

/**
 * **What a counted card is worth: what this empire counts today, plus a
 * discounted share of what it could come to count.**
 *
 * The ruling of 2026-09-04. Until it, every `countScaled` on every card was
 * priced at `score.nominalCount` — one flat guess, three — which meant a growing
 * card that had watched twelve barbarians fall was worth exactly what the same
 * card was worth the turn it was drafted, and a card paying per barracks was
 * worth the same to an empire with six of them and to one with none.
 *
 *     value = (realized + discount × (potential − realized)) ÷ per × what one helping pays
 *
 * The discount was a flat λ until batch 2 of `docs/bot-priorities.md` and is now
 * `delayDiscount` off the buildable path's own **build** delay: the towns that
 * would raise the counted row have to raise it first, and how long that takes is
 * the row's cost over `medianProduction`.
 *
 * **Realized** is the simulation's own answer: `countOf` (`statecraft.ts`), the
 * very reading the evaluator pays the card by. Asked at empire scale first, and
 * — only when that answers nothing — summed over this empire's towns, which is
 * how a *city-scoped* count (a garrison, a town's worked hills) is reached
 * without this file learning which counts those are. That fallback cannot
 * over-count: an empire-scale arm ignores the town it is handed, so a count that
 * answered zero for the realm answers zero for every town in it.
 *
 * **Potential** is honest or it is absent, and there are exactly three paths:
 *
 *   · a row naming a **building** or a **category** — its subjects are things
 *     towns build, so the potential is `potentialTownsFor`: the towns where the
 *     simulation's own `buildError` says the row could go up. Read off the
 *     effect's fields rather than off its `CountKind`, so nothing here switches
 *     on the union;
 *   · a **tally** — the growing cards, whose subject is the rest of the game and
 *     not the board at all. `score.tallyForecast` says what an occasion is
 *     expected still to bring, per occasion; an occasion the table does not name
 *     forecasts nothing and prints that it did not. **No discount rides on it**
 *     (batch 2): a forecast is already "occasions expected over the horizon" and
 *     carries its own uncertainty, so the flat λ that used to multiply it was
 *     discounting the same doubt twice — an accident of the one-knob era rather
 *     than a decision;
 *   · **everything else** — hexes revealed, luxuries held, citizens, camps
 *     cleared — takes the realized reading alone. There is no honest potential
 *     reading of "tiles this empire will have explored", and a guess dressed as
 *     one is worse than the silence.
 *
 * `score.nominalCount` survives as exactly one thing: the **last resort** for a
 * count nothing on this board can answer — a `tally` met with no card in hand,
 * which is a row-borne counter with no holder (no such row exists today).
 */
export function explainCounted(
  effect: CardCountScaledEffect,
  ctx: ValueContext,
  card?: CardId,
): Appraisal {
  const ai = ctx.ai;
  const terms: ValueTerm[] = [];
  const realized = realizedCount(effect, ctx, card);
  if (realized === null) {
    terms.push({
      label: `${effect.count} — no counter this bot can read, at ${ai.score.nominalCount} nominal`,
      value: ai.score.nominalCount,
    });
  } else {
    terms.push({ label: `${realized} ${effect.count} today`, value: realized });
    for (const term of potentialTerms(effect, ctx)) terms.push(term);
  }
  // The row's own cap, as a subtraction rather than as a clamp somewhere the
  // fold cannot see it. A capped card is a card whose late helpings are worth
  // nothing, and that is a thing a reader of the feed should be told.
  const counted = terms.reduce((sum, term) => sum + term.value, 0);
  const per = effect.per === undefined || effect.per <= 0 ? 1 : effect.per;
  if (effect.max !== undefined && counted > effect.max * per) {
    terms.push({
      label: `− everything past the row's cap of ${effect.max} helping${effect.max === 1 ? '' : 's'}`,
      value: counted - effect.max * per,
      op: 'sub',
    });
  }
  if (per !== 1) terms.push({ label: `÷ ${per} counted per helping`, value: per, op: 'div' });
  terms.push({
    label: `× ${round(scorePayout(effect.pays, ctx))} — what one helping pays`,
    value: scorePayout(effect.pays, ctx),
    op: 'mul',
  });
  return appraise(terms);
}

/**
 * What this empire counts **today**, or `null` when nothing on the board can
 * answer at all.
 *
 * `countOf` is asked rather than reimplemented, for the module's second rule:
 * the count that pays the card and the count that prices it are one function, so
 * they cannot drift. See `explainCounted` for the empire-then-towns order.
 */
function realizedCount(
  effect: CardCountScaledEffect,
  ctx: ValueContext,
  card?: CardId,
): number | null {
  if (effect.count === 'tally' && card === undefined) return null;
  // Ignored by every arm but `tally`, which is guarded above — `countOf`'s own
  // docblock says so, and a probe that satisfies the type is the pattern
  // `statecraft.ts` already uses for a count asked without a card.
  const asked = card ?? ('' as CardId);
  const empire = countOf(ctx.state, ctx.playerId, asked, effect);
  if (empire !== 0) return empire;
  let total = 0;
  for (const city of ctx.state.cities) {
    if (city.ownerId !== ctx.playerId) continue;
    total += countOf(ctx.state, ctx.playerId, asked, effect, city);
  }
  return total;
}

/**
 * The promise half, discounted by its own delay — one printed term, or none
 * where there is no honest reading of one. See `explainCounted` for the three
 * paths.
 *
 * Each path answers with the **difference** (what the empire does not yet count
 * but could), never with a total, which is why `realized` is not a parameter:
 * `potentialTownsFor` skips a town already counted and a forecast is what is
 * still to come.
 *
 * **The forecast carries no discount.** `score.tallyForecast` is stated as
 * occasions still expected *over the horizon* — the estimate already — so
 * multiplying it by a delay factor would price the same uncertainty twice. That
 * double-discount was the flat λ's accident and batch 2 removes it; what the
 * forecast is worth is the forecast.
 *
 * The buildable-towns path does carry one, because its promise has a real wait
 * in it: somebody has to raise the row. The delay is `buildTurns` of what those
 * towns would be raising, and the multiplication prints as a part of the term.
 */
function potentialTerms(effect: CardCountScaledEffect, ctx: ValueContext): ValueTerm[] {
  if (effect.count === 'tally') {
    const occasion = effect.tally;
    const forecast = occasion === undefined ? undefined : ctx.ai.score.tallyForecast[occasion];
    if (forecast === undefined) {
      return [
        {
          label: `no forecast for ${occasion ?? 'an unnamed occasion'} — the promise is unpriced`,
          value: 0,
        },
      ];
    }
    return [
      {
        label: `+ ${forecast} more ${occasion} to come, over the horizon`,
        value: forecast,
      },
    ];
  }
  const buildable = potentialTownsFor(effect, ctx);
  if (buildable === null) return [];
  const turns = buildTurns(buildable.cost, ctx);
  const discount = delayDiscount(turns, ctx);
  return [
    {
      label: `+ ${buildable.open} more the towns could raise, discounted for the raising`,
      value: buildable.open * discount,
      parts: [
        { label: `${buildable.open} more the towns could raise`, value: buildable.open },
        delayTerm(turns, ctx, 'the towns must still raise it'),
      ],
    },
  ];
}

/**
 * **How many more of the counted thing this empire's towns could raise today,
 * and what raising one costs** — `null` when the row's subject is not something
 * a town builds.
 *
 * The cost is the **mean** of the rows actually counted open, which is the one
 * number a delay can be taken off when a category names several: a card counting
 * "any wonder" is a promise whose wait is the wait for the rows it would count,
 * and the mean of them is the honest middle. A single-building row answers its
 * own cost exactly, which is the common case and the one the tests pin.
 *
 * The gate is `buildError`, the simulation's own — the tech, the age marker, the
 * site, the world's one copy of a wonder are all its and none of them is
 * restated here. The one clause this file adds is not a rule but the count's own
 * arithmetic: a town that already holds the row is realized, not potential (see
 * the loop). Bounded by construction: towns × the building table once, asked of
 * a card that is being appraised rather than per turn of a game.
 *
 * A line narrowed to one town (`within: 'city'`) reads no potential: what it
 * pays is a fact about the town the payment is made in, and an empire-wide
 * count of buildable ground would be an answer to a different question.
 */
function potentialTownsFor(
  effect: CardCountScaledEffect,
  ctx: ValueContext,
): { open: number; cost: number } | null {
  if (effect.within === 'city') return null;
  const wanted: BuildingId[] =
    effect.building !== undefined
      ? [effect.building]
      : effect.category !== undefined
        ? BUILDING_IDS.filter((id) => buildingDef(id).category === effect.category)
        : [];
  if (wanted.length === 0) return null;
  let open = 0;
  let hammers = 0;
  for (const city of ctx.state.cities) {
    if (city.ownerId !== ctx.playerId) continue;
    for (const id of wanted) {
      // A row this town already holds is **realized**, not potential — it is
      // already in the count the line above printed, and counting it twice would
      // pay the empire for the same barracks under both headings. Not a rule
      // restated: `buildError` is about whether a queue may hold the row (a town
      // rebuilding one is the reducer's business), and this is about whether the
      // *count* would grow.
      if (city.buildings.includes(id)) continue;
      if (buildError(ctx.state, ctx.playerId, 'building', id, city) !== null) continue;
      open += 1;
      hammers += buildingDef(id).cost;
    }
  }
  return { open, cost: open === 0 ? 0 : hammers / open };
}

/** A `countScaled`'s payout, per unit of whatever it counts. */
function scorePayout(pays: PayoutShape, ctx: ValueContext): number {
  switch (pays.to) {
    case 'yield': {
      const bag: YieldBag = {};
      bag[pays.yield as Voice] = pays.amount;
      return valueOfYields(bag, ctx);
    }
    case 'happiness':
      return pays.amount * meterWeight(ctx, 'happiness');
    case 'authority':
      return pays.amount * meterWeight(ctx, 'authority');
    case 'percent':
      return voiceWeight(ctx, pays.yield as Voice) * (pays.percent / 100) * ctx.ai.score.nominalYield;
    default:
      return ctx.ai.score.unknownEffect;
  }
}

/** `CardPayout`, structurally — imported by shape so this file needs no second import site. */
type PayoutShape =
  | { to: 'yield'; yield: string; amount: number; where: string }
  | { to: 'happiness'; amount: number }
  | { to: 'authority'; amount: number }
  | { to: 'percent'; yield: string; percent: number; stage: string };

/** The six voices off any effect that carries a `CardYieldBag`. */
function bagOf(effect: object): YieldBag {
  const bag: YieldBag = {};
  for (const voice of VOICES) {
    const amount = (effect as Record<string, unknown>)[voice];
    if (typeof amount === 'number') bag[voice] = amount;
  }
  return bag;
}
