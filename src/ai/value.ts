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
/**
 * Type-only, and deliberately: `routes.ts` reads this file at runtime (the pay
 * of a route is `explainYields` of the simulation's own fold), so a value import
 * back would be the cycle `test/mapgen/moduleCycles.test.ts` exists to catch one
 * system over. The *term* a route slot is worth is therefore built here, beside
 * `hammerTerm`, and the *reading* it is built from is built there.
 */
import type { RouteOutlook } from './routes';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../sim/buildingData';
import {
  cityQuote,
  cityYields,
  empirePercents,
  empireRateReading,
  tileOwnerField,
} from '../sim/cities';
import { authorityOf, happinessOf } from '../sim/meters';
import { renownPerTurn } from '../sim/renown';
import { type ResourceId, resourceDef } from '../sim/resourceData';
import {
  type PlayerStatecraft,
  buildingMatchesYieldPercent,
  countOf,
  orderAtSlotPosition,
  periodicProbe,
  slotTypesOf,
  statecraftOf,
} from '../sim/statecraft';
import {
  type CardCountScaledEffect,
  type CardEffect,
  type CardId,
  type CardPeriodicEffect,
  type OrderId,
  isDoctrineId,
  isOrderId,
  orderDef,
  orderFitsSlot,
} from '../sim/statecraftData';
import { type ProjectId, projectDef } from '../sim/projectData';
import type { City, GameState } from '../sim/state';
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
  /**
   * Towns held. **Uncapped since batch 7** — `score.cityCap` clipped it at six so
   * that an "in every town" card could not run away with a wide empire, and the
   * acceptance says a wide empire simply *does* get more out of one.
   */
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
  prices: {
    gold: number;
    faith: number;
    /**
     * **What a point of culture is worth to this empire** (batch 6) — the draft
     * plan's own reading. Culture buys exactly one thing in this game, the next
     * draft, so its price is what that draft's hand is worth per point of the
     * meter it fills: an empire whose government's pool is full of cards it
     * wants prices culture dear, and one whose slots are full of better cards
     * than the pool can deal prices it at the band's floor.
     */
    culture: number;
    authority: number;
    happiness: number;
  };
  /**
   * Why each price reads what it does — "faith is dear: the first religion is
   * worth 600 for 120 faith". Printed beside every priced term, and a **label**
   * like `pressureNote`: it changes no fold, so no pin moves.
   */
  priceNotes: {
    gold: string;
    faith: string;
    culture: string;
    authority: string;
    happiness: string;
  };
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
  /**
   * **What this empire's trade stands at** (`routeOutlook`, `routes.ts`, batch
   * 8) — the slots it holds, the ones spoken for, the best route a new caravan
   * could run, and the best one more slot would open.
   *
   * It rides on the context for `wants`' reason exactly: the gate behind it runs
   * A* over a pair of towns, and a caravan's worth is asked of every town's
   * build list and a market's of every row of every town. Asked per candidate it
   * would be a pathfind each; asked once it is one sweep of the towns.
   *
   * Built on the **prior**, like the book and the chains — a route priced at the
   * shadow prices it is itself about to help set would be the fixed point batch
   * 1 refused.
   */
  routes: RouteOutlook;
  /**
   * **Every resource kind standing on this empire's own ground** — improved or
   * not, worked or not, revealed or not (batch 8's uniqueness ruling).
   *
   * The one reading of *"is this seam new to us"*, shared by the site scorer and
   * by the tile the purchasing plan would buy, so the two cannot disagree about
   * what a first silk is worth. It is deliberately **potential** rather than
   * access: a copy inside the borders that nobody has mined yet is still a copy,
   * because the investment that opens it is an investment this empire may make
   * whenever it likes, and paying twice for the same signature is what the bonus
   * exists to prevent.
   *
   * Hoisted here for `medianProduction`'s reason: it is one sweep of the map,
   * and the settler's arm asks it of two hundred candidate hexes.
   */
  realm: ReadonlySet<ResourceId>;
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
  // The empire's half of every town's percentages, taken **once** for the sweep
  // — `cityQuote`'s documented bargain (`cities.ts`), and the difference between
  // one meter sweep and one per town. Same figure; the fold stays where it was.
  const empire = empirePercents(state, playerId);
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    made.push(cityYields(state, city, [], null, cityQuote(state, city, [], empire)).production);
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
  // **Culture joined them in batch 6**, off the draft plan (`draftPlan`,
  // `wants.ts`). The three priced voices are exactly the three banks this game
  // holds a *stock* of and spends on rows somebody deals; food, hammers and
  // beakers are flows nothing banks, and hammers' own reading is a premium
  // rather than a rate (see `hammerPrice`).
  if (voice === 'culture') return ctx.prices.culture;
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

/**
 * **What one more hammer a turn is worth to this empire** — the chain-derivative
 * production price (batch 6 of `docs/bot-priorities.md`), and `meterWeight`'s
 * third sibling.
 *
 * Batch 4 wrote down why hammers had no price: the two cheap empire-level
 * readings of hammer scarcity both answer the same number every turn, and *"a
 * factor that is always one is a multiplication by one wearing a price"*. What
 * has changed is that the chains exist. A hammer is not scarce because a queue is
 * full; it is scarce because **something the empire has already committed to is
 * waiting on it**, and the chains are the register of exactly that. So the price
 * is a derivative rather than a ratio:
 *
 *     price = Σ over the building steps this town still owes a live chain of
 *               ( chain.worth ÷ chain.stepsRemaining )
 *               × ( discount(turns at rate+1) − discount(turns at rate) )
 *
 * — closed form on numbers the chain already carries, no sweep and no search.
 * A town owing a four-hundred-hammer University to an engine worth six hundred
 * prices a hammer at what one turn off that raising is worth; a town whose
 * engines are all standing prices it at nothing, which is the spec's *"near-zero
 * when nothing rich waits on hammers"*.
 *
 * **It is a price, not a bonus**, and the band is gold's and faith's exactly:
 *
 *     price = clamp( marginal, weights.production × priceBandLow,
 *                              weights.production × priceBandHigh )
 *
 * so an empire whose engines are starving may value a hammer at three times what
 * the table says and one with nothing waiting values it at half — which is the
 * spec's *"near-zero when nothing rich waits on hammers"* said in the band's own
 * language, and the same floor an empty want book gives a coin.
 *
 * **Which is why `hammerTerm` folds the *difference*.** Every candidate in this
 * bot already prices its production delta at `weights.production` through
 * `explainYields`, so a term carrying the whole price would pay for the hammers
 * twice — and it did, measurably: at the ceiling a hammer read sixteen points
 * against a bushel's seven, every town in every empire leaned on the hills for
 * ever, and the acceptance seeds lost fifteen technologies to it. The term is
 * `price − weights.production`, which is a *credit* when the engines are waiting
 * and a *charge* when nothing is, and leaves the candidate paying exactly the
 * price and no more.
 *
 * `city` names the town that would raise the steps: a row it already holds is a
 * step it owes nothing on, so a town whose engines are built prices a hammer at
 * nothing while its neighbour still owes three. Without one, every step any town
 * still owes is counted — the honest fallback the spec allows for the sites that
 * do not know which town is asking (a hex's improvement, a card's flats).
 *
 * **The turns are always the middling town's** (`medianProduction`), even when a
 * town is named, and that is a deliberate crudeness with two reasons. It is
 * *consistent*: every build delay in this bot has been the median's since batch
 * 2, the chains' own `delay` included, so pricing this one off a different rate
 * would have the premium disagreeing with the chain it is a derivative of. And
 * it is *affordable*: this is asked of every building row of every town, and
 * `cityYields` walks the whole empire twice for the two meters — the very sweep
 * `buildCandidates` hoists a quote to avoid.
 */
export function hammerPrice(ctx: ValueContext, city?: City): number {
  const rate = Math.max(1, ctx.medianProduction);
  let marginal = 0;
  for (const chain of ctx.chains) {
    const share = chain.worth / Math.max(1, chain.stepsRemaining);
    if (share <= 0) continue;
    for (const step of chain.steps) {
      if (step.kind !== 'building') continue;
      // A town that already holds the row owes the chain nothing on it. Without
      // a town, the step counts while any town of the empire still owes it,
      // which is what `step.towns` already says.
      if (city !== undefined) {
        if (city.buildings.includes(step.id as BuildingId)) continue;
      } else if (step.towns <= 0) continue;
      const before = Math.ceil(Math.max(0, step.cost) / rate);
      const after = Math.ceil(Math.max(0, step.cost) / (rate + 1));
      if (after >= before) continue;
      marginal += share * (delayDiscount(after, ctx) - delayDiscount(before, ctx));
    }
  }
  const prior = yieldWeight(ctx.ai, 'production', ctx.age);
  const low = prior * ctx.ai.priorities.priceBandLow;
  const high = prior * ctx.ai.priorities.priceBandHigh;
  return Math.min(high, Math.max(low, marginal));
}

/**
 * **The hammer premium as a printed term**, or `null` when there is nothing to
 * print — the door every production-raising candidate walks through.
 *
 * The register of what folds it, and each is a candidate that raises what a town
 * makes rather than merely spending it: a **building** whose hypothetical yield
 * delta pays hammers (`buildCandidates`, `bot.ts`), an **improvement** on a hex
 * (`improvementEntry`, `plan.ts` — the mine and the workshop's ground), a
 * **card** that pays production (`explainEffects`, below), and the **citizen
 * focus** arm (`focusCommand`, `bot.ts`). A new production-raising candidate
 * joins that list here, deliberately.
 *
 * Nothing that *spends* hammers folds it — a chain already charges its own
 * remaining hammers through `explainLump`, and charging the compression back
 * would be the bot disagreeing with itself about one wait.
 */
export function hammerTerm(
  production: number,
  ctx: ValueContext,
  city?: City,
): ValueTerm | null {
  if (production <= 0) return null;
  const price = hammerPrice(ctx, city);
  const over = price - yieldWeight(ctx.ai, 'production', ctx.age);
  if (over === 0) return null;
  const who = city === undefined ? 'this empire is' : `${city.name} is`;
  return {
    label:
      over > 0
        ? `+${round(production)} hammers a turn buy the engines ${who} raising — ` +
          `${round(price)} a hammer against the table's ${round(price - over)}`
        : `+${round(production)} hammers a turn with nothing much waiting on them — ` +
          `${round(price)} a hammer against the table's ${round(price - over)}`,
    value: production * over,
  };
}

/**
 * **A row that opens a trade route, priced as the route it opens** — the harder
 * half of batch 8's first ruling, and `hammerTerm`'s sibling: a term built here
 * off a reading built in `routes.ts` (see the type-only import at the head of
 * this file for why the two halves live apart).
 *
 * Folded by `explainBuildingRow`, so every surface that appraises a building —
 * the queue, the purchasing plan, a chain's step — carries it in the same words.
 * It is worth something only while it is worth something: the empire must be
 * **capacity-bound** (every route it may run is running) and there must be an
 * unserved pair a slot would open, or the row's own shelves are the whole of
 * what it pays.
 *
 * The wagon is charged for in **turns** rather than in hammers: a slot with no
 * caravan to fill it pays nothing until one is raised, and `caravanDelay` is
 * nought exactly when one is already standing idle waiting for a slot. Charging
 * the caravan's hammers here as well would be the bot paying twice for a piece
 * its own build arm prices — batch 4's rule about the settler's walk, said one
 * system over.
 */
export function routeSlotTerm(slots: number, ctx: ValueContext): ValueTerm | null {
  const routes = ctx.routes;
  if (slots <= 0 || !routes.bound || routes.next === null) return null;
  const offer = routes.next;
  const terms: ValueTerm[] = [
    nest(
      `what the best unserved pair would pay — ${offer.from.name} → ${offer.to.name} by ${offer.mode}`,
      offer.pay,
    ),
  ];
  if (slots !== 1) {
    terms.push({ label: `× ${slots} routes this row opens`, value: slots, op: 'mul' });
  }
  terms.push(delayTerm(routes.caravanDelay, ctx, 'a caravan has still to be raised to carry it'));
  return nest('it opens a route, and every route this empire may run is running', appraise(terms));
}

/**
 * **Every resource kind standing on this empire's own ground** —
 * `ValueContext.realm`, and the whole of batch 8's uniqueness ruling.
 *
 * *A unique luxury is one with no copy inside the empire's owned land, improved
 * or not.* So this reads the **ground** and not the holdings: no reveal
 * technology, no improvement, no city on the seam, no lent copy. Three of those
 * four are `openedResource`'s clauses and they are the right rule for *access* —
 * what an empire may draw on today — and the wrong one for *potential*, which is
 * what a site and a hex for sale are appraised as. A silk this empire owns and
 * has not yet worked is a silk it can work whenever it likes, and a bonus paid
 * for the second copy is a bonus paid twice for one signature.
 *
 * One sweep of the map, hoisted onto the context: `tileOwnerField`'s bargain,
 * for `hasResource`'s reason exactly.
 */
export function realmResources(state: GameState, playerId: number): ReadonlySet<ResourceId> {
  const owner = tileOwnerField(state);
  const held = new Set<ResourceId>();
  const tiles = state.map.tiles;
  for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index]!;
    if (tile.resource === undefined) continue;
    if (owner.at(index) !== playerId) continue;
    held.add(tile.resource);
  }
  return held;
}

/**
 * **What a hex whose kind this empire has none of is worth**, as printed terms —
 * the site scorer's two bonuses, read through one door so that a site and a hex
 * for sale cannot disagree about which seams are new.
 *
 * `realm` is `ValueContext.realm`; it is passed rather than read off the context
 * because the settler's arm hoists its own copy for a two-hundred-hex ring walk.
 */
export function newResourceTerms(
  realm: ReadonlySet<ResourceId>,
  ai: AiConfig,
  resource: ResourceId | undefined,
  where: string,
): ValueTerm[] {
  if (resource === undefined || realm.has(resource)) return [];
  const kind = resourceDef(resource).kind;
  if (kind === 'luxury') {
    return [
      {
        label: `${resourceDef(resource).name} ${where} — a luxury this empire owns no copy of`,
        value: ai.site.newLuxuryBonus,
      },
    ];
  }
  if (kind === 'strategic') {
    return [
      {
        label: `${resourceDef(resource).name} ${where} — a strategic kind this empire owns no copy of`,
        value: ai.site.newStrategicBonus,
      },
    ];
  }
  return [];
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
  if (voice !== 'gold' && voice !== 'faith' && voice !== 'culture') return 'age weight';
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
  // **The route it opens** (batch 8): a market is shelves *and* a slot, and the
  // slot is worth what the pair it would join would pay — but only while every
  // slot this empire has is spoken for. See `routeSlotTerm`.
  const route = routeSlotTerm(def.routeSlots ?? 0, ctx);
  if (route !== null) terms.push(route);
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
    // **The hammer premium** (batch 6): a card that pays production shortens
    // every engine this empire is still raising, exactly as a mine does, and it
    // walks through the same door. The empire reading — a card names no town.
    const hammers = hammerTerm(productionOf(effect, ctx), ctx);
    if (hammers !== null) terms.push(hammers);
  }
  return appraise(terms);
}

/**
 * **The per-turn yield a percentage is assumed to be a percentage of** — the
 * nominal helping, times how many helpings a nominal assumes.
 *
 * `score.nominalYield` was retired into `score.unknownEffect` in batch 7, and
 * this is where the merge is spelt. The two knobs were never independent: an
 * unread rider was already priced `unknownEffect × nominalCount` (the
 * `offerRider` arm), which is the same six the nominal yield carried, said as
 * *one thing this bot cannot read, three helpings of it*. So a percentage is
 * priced against exactly that, and a tuner who moves the stand-in moves both
 * readings of it together rather than keeping two numbers in step by hand.
 *
 * It is a function rather than a constant because the sheet is per seat: a
 * persona (or the arena's tuning sheet) may say what an unread thing is worth,
 * and the answer has to be that seat's.
 */
function nominalRate(ctx: ValueContext): number {
  return ctx.ai.score.unknownEffect * ctx.ai.score.nominalCount;
}

/**
 * **How many hammers a turn this effect actually pays this empire** — the one
 * question `hammerTerm` needs of a card, and `null`-shaped (nought) for every
 * shape that pays none.
 *
 * The three legible shapes are the ones whose figure is a *bag*: a card that
 * says "+2 production in every town", one that says "+2 to the empire", and one
 * that dresses a hex. The percentage shapes are counted at the same nominal
 * yield `scoreEffect` prices them against (`nominalRate`), because that is what
 * this bot means by "a percentage of a town's hammers" everywhere else.
 *
 * Everything else answers nought, which is honest rather than lazy: a card whose
 * hammers this bot cannot read is a card whose hammers it should not claim a
 * compression for.
 */
function productionOf(effect: CardEffect, ctx: ValueContext): number {
  const nominal = nominalRate(ctx);
  switch (effect.kind) {
    case 'cityYields':
      return (bagOf(effect).production ?? 0) * ctx.cities;
    case 'empireYields':
      return bagOf(effect).production ?? 0;
    case 'tileYield':
      return (bagOf(effect).production ?? 0) * ctx.ai.score.nominalTiles;
    case 'productionBonus':
      return (effect.percent / 100) * nominal * ctx.cities;
    case 'percentYields':
      if (effect.yield !== 'production' && effect.yield !== 'all') return 0;
      return (effect.percent / 100) * nominal * ctx.cities;
    default:
      return 0;
  }
}

export function scoreEffects(
  effects: readonly CardEffect[],
  ctx: ValueContext,
  card?: CardId,
): number {
  return explainEffects(effects, ctx, card).total;
}

function scoreEffect(effect: CardEffect, ctx: ValueContext): number {
  const nominal = nominalRate(ctx);
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
    // --- the engine shapes (batch A of `docs/fewer-things-plan.md`) ----------
    // Every one of them is priced off **what this empire actually holds**, which
    // is `explainCounted`'s own rule read one shape over: an engine is worth what
    // it multiplies, so a deck with nothing to multiply prices it near nought —
    // and that is the honest reading rather than a stand-in. It is also the
    // *written-down* debt of this pass (`docs/fewer-things.md` §5): a card
    // appraised in isolation cannot see the deck it would be drafted into, and
    // the marginal reading `V(deck ∪ card) − V(deck)` is batch F2's.
    case 'cardYieldAmplifier': {
      const each = (effect.amount ?? 0) + ((effect.percent ?? 0) / 100) * nominal;
      if (each === 0) return 0;
      let sum = 0;
      for (const voice of VOICES) {
        if (effect.yield !== 'all' && effect.yield !== voice) continue;
        sum += voiceWeight(ctx, voice) * each * amplifiedLines(ctx, voice);
      }
      return sum;
    }
    case 'buildingYieldPercent': {
      // A share of what the matching shelves already pay, read off the rows the
      // empire has actually raised — the simulation's own selector
      // (`buildingMatchesYieldPercent`) asked rather than a second copy of it.
      let sum = 0;
      for (const city of ctx.state.cities) {
        if (city.ownerId !== ctx.playerId) continue;
        for (const id of city.buildings) {
          if (!buildingMatchesYieldPercent(id, effect)) continue;
          const def = buildingDef(id);
          for (const voice of VOICES) {
            if (effect.yield !== undefined && effect.yield !== 'all' && effect.yield !== voice) {
              continue;
            }
            const base =
              (def[voice] ?? 0) +
              (voice === 'science' ? city.population * (def.sciencePerPop ?? 0) : 0);
            if (base === 0) continue;
            sum += voiceWeight(ctx, voice) * base * (effect.percent / 100);
          }
        }
      }
      return sum;
    }
    case 'slotPosition': {
      // Worth exactly what the card in that chair is worth, over again — asked of
      // the same appraisal, with the two deck-reading shapes filtered out so an
      // engine pointed at an engine cannot recur.
      const sc = statecraftOf(ctx.state, ctx.playerId);
      const seated = sc === undefined ? null : orderAtSlotPosition(sc, effect.position, effect.slot);
      if (seated === null || effect.factor === 1) return 0;
      const inner = orderDef(seated).effects.filter(
        (held) => held.kind !== 'slotPosition' && held.kind !== 'cardYieldAmplifier',
      );
      return (effect.factor - 1) * scoreEffects(inner, ctx, seated);
    }
    case 'periodic':
      // A windfall spread over its period: what one firing pays, divided by how
      // often it comes round. The shortener below is the same figure differenced.
      return periodicWorth(effect, ctx) / periodicPeriodOf(effect, 0);
    case 'periodShorten': {
      let gain = 0;
      for (const held of slottedOrderEffects(ctx)) {
        if (held.kind !== 'periodic') continue;
        const worth = periodicWorth(held, ctx);
        if (worth === 0) continue;
        gain += worth * (1 / periodicPeriodOf(held, effect.turns) - 1 / periodicPeriodOf(held, 0));
      }
      return gain;
    }
    case 'cityRenownPercent': {
      // A share of what a **middling** town of this empire earns, because the
      // shape is city-scoped and the scope is not evaluated here — the same
      // bargain `cityYields`' arm strikes with a scope it cannot read.
      let total = 0;
      for (const city of ctx.state.cities) {
        if (city.ownerId !== ctx.playerId) continue;
        for (const id of city.buildings) total += buildingDef(id).renown?.perTurn ?? 0;
      }
      const mean = ctx.cities === 0 ? 0 : total / ctx.cities;
      return mean * (effect.percent / 100) * ctx.ai.weights.renown;
    }
    case 'routeYield': {
      // Paid on every caravan this empire is running, counted by the simulation.
      // A row paid **per luxury at either end** (The Golden Roads) is that figure
      // again for every good on the road, and the stand-in for "how many goods"
      // is the empire's own luxury count: a caravan runs between two of this
      // realm's towns, so the realm's shelf is the honest upper reading of what
      // the pair between them holds.
      const each = valueOfYields(bagOf(effect), ctx);
      const goods = effect.perEndpointLuxury === true ? countProbe(ctx, 'uniqueLuxuries') : 1;
      return each * goods * countProbe(ctx, 'tradeRoutes');
    }
    case 'offerRider':
      return ctx.ai.score.unknownEffect * ctx.ai.score.nominalCount;
    case 'rulePercent':
      // **One rule of the nine is legible here, and deliberately only one.** The
      // road fraction (Machinery, batch E) is a discount on a *march*, not on a
      // town's books, so nothing else in this file was ever going to price it —
      // and every other `CardRule` keeps the stand-in it has always been priced
      // at, so adding this arm moved no existing appraisal by a point.
      //
      // What a cheaper road is worth: the share of a step it takes off, over the
      // pieces this empire is paying to keep. A negative percentage is a
      // discount (`CardRule`'s own sign), so the worth is the positive of it.
      if (effect.rule !== 'roadStepCost') return ctx.ai.score.unknownEffect;
      return (
        (-effect.percent / 100) * ctx.ai.weights.military * countProbe(ctx, 'unitsInField')
      );
    default:
      // **Never zero.** A shape this bot cannot read is a shape whose card is
      // still worth more than a blank one, and a card whose whole text is
      // unreadable must not sort below an empty offer.
      return ctx.ai.score.unknownEffect;
  }
}

// --- the deck, as the engines read it ---------------------------------------

/** A count asked with no payout to read. `RENOWN_PROBE`'s twin, one file over. */
function countProbe(ctx: ValueContext, count: CardCountScaledEffect['count']): number {
  return countOf(ctx.state, ctx.playerId, '' as CardId, {
    kind: 'countScaled',
    count,
    pays: { to: 'authority', amount: 0 },
  });
}

/** Every effect on every Order this empire currently has in a chair. */
function slottedOrderEffects(ctx: ValueContext): CardEffect[] {
  const sc = statecraftOf(ctx.state, ctx.playerId);
  if (sc === undefined) return [];
  const list: CardEffect[] = [];
  for (const slot of sc.slots) {
    if (!slot || !isOrderId(slot.card)) continue;
    for (const effect of orderDef(slot.card).effects) list.push(effect);
  }
  return list;
}

/**
 * **How many line instances an amplifier would find**, in one voice — the count
 * that makes the additive engine worth anything at all.
 *
 * Read off the deck the seat is holding, in the shapes the evaluator actually
 * pays per line: a per-town line is one per town, an empire line is one, a hex
 * line is `score.nominalTiles` of them — the same stand-in `scoreEffect`'s
 * `tileYield` arm uses, so a card's own hexes and an amplifier's agree.
 */
function amplifiedLines(ctx: ValueContext, voice: Voice): number {
  let lines = 0;
  for (const effect of slottedOrderEffects(ctx)) {
    if (effect.kind === 'cityYields') {
      if ((bagOf(effect)[voice] ?? 0) > 0) lines += ctx.cities;
    } else if (effect.kind === 'empireYields') {
      if ((bagOf(effect)[voice] ?? 0) > 0) lines += 1;
    } else if (effect.kind === 'tileYield') {
      if ((bagOf(effect)[voice] ?? 0) > 0) lines += ctx.ai.score.nominalTiles;
    } else if (effect.kind === 'countScaled') {
      const pays = effect.pays;
      if (pays.to !== 'yield' || pays.yield !== voice || pays.amount <= 0) continue;
      lines += pays.where === 'city' ? ctx.cities : 1;
    }
  }
  return lines;
}

/** A periodic clock, with a shortener taken off it. The simulation's floor. */
function periodicPeriodOf(effect: CardPeriodicEffect, shorten: number): number {
  return Math.max(2, Math.floor(effect.everyTurns) - shorten);
}

/**
 * **What one firing of a periodic boon pays**, in this empire's own money.
 *
 * The count is the simulation's (`countOf`, through the row's own probe), so a
 * boon quoted "per faith building" is priced by the faith buildings this empire
 * has actually raised — `explainCounted`'s first rule, one shape over.
 */
function periodicWorth(effect: CardPeriodicEffect, ctx: ValueContext): number {
  const each = effect.amount ?? 1;
  let figure = Math.floor(effect.amount ?? 0);
  if (effect.count !== undefined) {
    const per = effect.per === undefined || effect.per <= 0 ? 1 : effect.per;
    let times = Math.floor(
      countOf(ctx.state, ctx.playerId, '' as CardId, periodicProbe(effect)) / per,
    );
    if (effect.max !== undefined) times = Math.min(times, effect.max);
    figure = Math.max(0, times) * each;
  }
  if (figure === 0) return 0;
  if (effect.pays === 'renown') return figure * ctx.ai.weights.renown;
  return voiceWeight(ctx, effect.pays as Voice) * figure;
}

// --- the marginal reading: what a card does to the deck it would join --------

/**
 * **The whole of what this empire makes in a turn**, in the nine channels an
 * appraisal in this file knows how to weigh — batch F2's `V`
 * (`docs/fewer-things-plan.md`, row F2).
 *
 * Six of them are the simulation's own per-turn books (`empireRateReading`, the
 * same fold the top bar prints and the resolution banks), and the other three are
 * the standing readings the card arms already weigh: what the empire earns in
 * renown a turn, and where its two meters stand. Nothing is estimated and no
 * stand-in appears anywhere in it — this is the board's own answer.
 */
export interface DeckReading {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
  renown: number;
  happiness: number;
  authority: number;
}

/** The nine channels, read off one board. Four empire sweeps; see `deckMargin`. */
function deckReading(state: GameState, playerId: number): DeckReading {
  const rates = empireRateReading(state, playerId);
  return {
    food: rates.foodPerTurn ?? 0,
    production: rates.productionPerTurn ?? 0,
    gold: rates.goldPerTurn ?? 0,
    science: rates.sciencePerTurn ?? 0,
    culture: rates.culturePerTurn ?? 0,
    faith: rates.faithPerTurn ?? 0,
    renown: renownPerTurn(state, playerId),
    happiness: happinessOf(state, playerId),
    authority: authorityOf(state, playerId),
  };
}

/**
 * The difference between two readings, weighted — **the** printed arithmetic of
 * a marginal reading, and the reason the total and the breakdown cannot disagree:
 * the value of the reading *is* the fold of these terms, so a channel that moved
 * is a line a reader of the feed can see.
 *
 * The two meters are weighed at `meterWeight` and the renown at `weights.renown`,
 * which is exactly what the flat card arms above weigh them at — the whole point
 * of the reading is that it changes *what* is counted, never *how* it is priced.
 */
function readingTerms(before: DeckReading, after: DeckReading, ctx: ValueContext): ValueTerm[] {
  const terms: ValueTerm[] = [];
  for (const voice of VOICES) {
    const delta = after[voice] - before[voice];
    if (delta === 0) continue;
    const weight = voiceWeight(ctx, voice);
    terms.push({
      label: `${voice} ${signed(delta)} a turn × ${round(weight)} ${weightWords(ctx, voice)}`,
      value: delta * weight,
    });
  }
  const renown = after.renown - before.renown;
  if (renown !== 0) {
    terms.push({
      label: `renown ${signed(renown)} a turn × ${round(ctx.ai.weights.renown)}`,
      value: renown * ctx.ai.weights.renown,
    });
  }
  for (const meter of ['happiness', 'authority'] as const) {
    const delta = after[meter] - before[meter];
    if (delta === 0) continue;
    terms.push({
      label: `${meter} ${signed(delta)} × ${meterWords(ctx, meter)}`,
      value: delta * meterWeight(ctx, meter),
    });
  }
  return terms;
}

/**
 * **The two boards a margin is the difference of** — this empire with the card in
 * its deck, and the same empire without it — or `null` when there is no honest
 * pair to read.
 *
 * The pair is taken from whichever side the empire is actually standing on, which
 * is what makes the reading the same question for a card in a chair and a card on
 * the table:
 *
 *   · a card **not** held is placed, and `without` is the board as it stands;
 *   · a card **already slotted** has its chair emptied instead, and `with` is the
 *     board as it stands. That is not a nicety: the arm that improves an
 *     arrangement (`reslotDecision`, `bot.ts`) appraises the sitting card against
 *     the challenger in one table, and a sitting card that answered "nothing,
 *     because it is already played" would be swapped out of its chair for
 *     anything at all.
 *
 * Both scratch boards are **shallow** clones, and every layer of them is shared
 * but the one that changes: the players array, the one player, its
 * `PlayerStatecraft`, and the slots. That is safe because every reading
 * `deckReading` takes is a pure fold — `cityYields`, `explainEmpireGold`,
 * `explainRenown` and the two meters mutate nothing — and it is what makes the
 * marginal reading affordable at all. The evaluator's own memo (`liveReading`,
 * `statecraft.ts`) is a `WeakMap` on the state object keyed by a print of the
 * walk's *inputs*, so a scratch board builds its list once, answers off it, and is
 * collected with it.
 *
 * **Which chair the card would take** is the placement the bot itself would make
 * (`slottingDecision`, `bot.ts`): the first empty chair whose flavour admits it,
 * and — when every chair that admits it is full — the chair of the worst card it
 * would have to bench, which is `replacementCost`'s reading in `wants.ts` said
 * about a *fitting* chair rather than about the whole government. A card no chair
 * admits is a card this empire cannot play, and the pair is `null`.
 *
 * A **Doctrine** is not slotted at all: it is adopted, and `liveEffects` reads it
 * off `PlayerStatecraft.doctrines`, so the scratch simply holds one more. Beliefs,
 * technologies and every other card class answer `null` — the hypothetical would
 * be a different verb each time, and none of them carries an engine shape today.
 */
function deckPair(
  state: GameState,
  playerId: number,
  id: CardId,
): { with: GameState; without: GameState } | null {
  const sc = statecraftOf(state, playerId);
  if (sc === undefined) return null;
  if (isDoctrineId(id)) {
    if (sc.doctrines.includes(id)) {
      return {
        with: state,
        without: rewritten(state, playerId, {
          ...sc,
          doctrines: sc.doctrines.filter((held) => held !== id),
        }),
      };
    }
    return {
      with: rewritten(state, playerId, { ...sc, doctrines: [...sc.doctrines, id] }),
      without: state,
    };
  }
  if (!isOrderId(id)) return null;
  const seated = sc.slots.findIndex((slot) => slot !== null && slot.card === id);
  if (seated >= 0) {
    const slots = [...sc.slots];
    slots[seated] = null;
    return { with: state, without: rewritten(state, playerId, { ...sc, slots }) };
  }
  const chair = chairFor(sc, id);
  if (chair === null) return null;
  const slots = [...sc.slots];
  slots[chair] = { card: id, sealedUntil: state.turn };
  return { with: rewritten(state, playerId, { ...sc, slots }), without: state };
}

/** One seat's Statecraft, replaced, on a board that shares everything else. */
function rewritten(state: GameState, playerId: number, sc: PlayerStatecraft): GameState {
  const players = state.players.map((player) =>
    player.id === playerId ? { ...player, statecraft: sc } : player,
  );
  return { ...state, players };
}

/**
 * The chair this Order would take, or `null` when none admits it.
 *
 * The bench, when every fitting chair is full, is chosen by the card's **plain**
 * reading — its effects alone, with no synergy and no margin of its own — and
 * that is not merely thrift: `explainCard` is what asks for this, so ranking the
 * benched cards by `explainCard` would be a recursion with no floor.
 */
function chairFor(sc: PlayerStatecraft, id: OrderId): number | null {
  const layout = slotTypesOf(sc);
  let worst: { chair: number; score: number } | null = null;
  for (let index = 0; index < sc.slots.length; index++) {
    const type = layout[index];
    if (type === undefined || !orderFitsSlot(id, type)) continue;
    const seated = sc.slots[index];
    if (!seated) return index;
    if (!isOrderId(seated.card)) continue;
    const score = plainOrderScore(seated.card);
    if (worst === null || score < worst.score) worst = { chair: index, score };
  }
  return worst === null ? null : worst.chair;
}

/**
 * A benched card's rank, and nothing else it is used for — the count of what its
 * row prints, weighted by nothing at all.
 *
 * A deliberately crude ordering, because what it decides is only *which* full
 * chair the hypothetical takes when several would do. Anything richer would have
 * to be an appraisal, and an appraisal is the thing calling this.
 */
function plainOrderScore(id: OrderId): number {
  let score = 0;
  for (const effect of orderDef(id).effects) score += Object.keys(effect).length;
  return score;
}

/**
 * **The shapes whose worth the empire fold can actually see** — the register
 * batch F2 turns on, and the whole of what changes.
 *
 * Each of the four multiplies something that is already on the board and is
 * therefore worth what the board makes it worth, never what a row alone says:
 *
 *   · `cardYieldAmplifier` — the deck engine. Its lines are the *other* slotted
 *     Orders', so a card counted per town, a card scoped to the capital and a
 *     card dressing hexes all pay differently, and only the fold knows which;
 *   · `buildingYieldPercent` — the category payoff, which is worth a share of
 *     shelves this empire has actually raised, staged and floored by the town's
 *     own percentages (and composed with any `appliedLast` doubler already
 *     slotted, which no reading of one row could see);
 *   · `cityRenownPercent` — the same sentence in the renown channel;
 *   · `effectAmplifier`, and only where its target is a figure the per-turn books
 *     carry (see `foldReadsAmplifier`). **The Exchequer** is this clause: batch F
 *     named it the deck's clearest trade payoff and the one the bot most
 *     under-priced, because it fell to `score.unknownEffect` — six points for
 *     doubling every caravan in the realm.
 *
 * Everything else keeps the arm it has, and three of them by explicit ruling:
 * `periodic` and `periodShorten` pay a **windfall** rather than a rate, so the
 * per-turn books cannot see them at all; `slotPosition` is priced as the doubled
 * card's own reading, which is the brief's own sentence and reaches the half of a
 * card (combat, rules) no yield fold carries.
 */
function foldReadEngine(effect: CardEffect): boolean {
  switch (effect.kind) {
    case 'cardYieldAmplifier':
    case 'buildingYieldPercent':
    case 'cityRenownPercent':
      return true;
    case 'effectAmplifier':
      return foldReadsAmplifier(effect.target);
    default:
      return false;
  }
}

/**
 * Which `AmplifierTarget`s land in the per-turn books. Four do — a route's pay, a
 * founder's trickle, and the two luxury readings, which are happiness — and
 * `riteDuration` does not: it moves the turn a blessing is stamped to expire on,
 * which is not a rate and never appears in a reading of one. That one keeps
 * `score.unknownEffect`, which is honest: nothing in this file can price it.
 */
function foldReadsAmplifier(target: string): boolean {
  return (
    target === 'routeYields' ||
    target === 'founderTrickle' ||
    target === 'luxuryHappiness' ||
    target === 'luxuryDuplicates'
  );
}

/** Does this row carry a shape the marginal reading is for? See `foldReadEngine`. */
export function hasFoldReadEngine(effects: readonly CardEffect[]): boolean {
  for (const effect of effects) {
    if (foldReadEngine(effect)) return true;
  }
  return false;
}

/**
 * **`V(deck ∪ card) − V(deck)`**, asked of the board itself — batch F2's whole
 * arithmetic, and the answer to the debt batch A and batch F both wrote down:
 * *an engine appraised alone multiplies a deck this reading cannot see*.
 *
 * Two readings of the nine channels, one with the card in the chair it would
 * take and one without it, differenced channel by channel and weighed exactly as
 * every flat card arm weighs the same channels. That is the whole of it: no
 * stand-in, no nominal helping, no guess at how many towns a line reaches — the
 * simulation's own folds answer, with this empire's own buildings, hexes,
 * caravans and slotted cards underneath them.
 *
 * `null` when there is no honest reading: a card no chair admits, a Doctrine
 * already taken, a class of card that is not played into the deck at all.
 *
 * **What it costs**, and why that is affordable: two `deckReading`s. `valueContext`
 * asks for a card's worth once per row of the government's live pool (the draft
 * plan's `expectedBestOrder`) and the slotting arm asks once per held card per
 * chair — so the answer is remembered for the life of the context that asked for
 * it (`MARGIN_MEMO`), which is one seat's sitting. Only the rows that carry one of
 * the four shapes ever ask at all, and a live pool holds a handful of them.
 */
export function deckMargin(ctx: ValueContext, id: CardId): Appraisal | null {
  const memo = marginMemo(ctx);
  const held = memo.get(id);
  if (held !== undefined) return held;
  const answer = readDeckMargin(ctx, id);
  memo.set(id, answer);
  return answer;
}

function readDeckMargin(ctx: ValueContext, id: CardId): Appraisal | null {
  const pair = deckPair(ctx.state, ctx.playerId, id);
  if (pair === null) return null;
  const before = deckReading(pair.without, ctx.playerId);
  const after = deckReading(pair.with, ctx.playerId);
  const terms = readingTerms(before, after, ctx);
  // **The hammer premium, on the hammers the fold actually found** — the same
  // door every other production-raising candidate walks through (batch 6), so a
  // card that shortens the engines this empire is raising is credited for it
  // here exactly as a mine is. It is the difference from the table and not the
  // whole price, because the production channel above has already paid the table.
  const hammers = hammerTerm(after.production - before.production, ctx);
  if (hammers !== null) terms.push(hammers);
  return appraise(terms);
}

/**
 * **A card's effects, priced by the deck it would join where the fold can see
 * them** — the one door batch F2 adds, and `explainCard`'s (`bot.ts`) only change.
 *
 * A row carrying one of the four shapes `foldReadEngine` names is worth
 * `V(deck ∪ card) − V(deck)` and nothing else: the isolated walk is not consulted
 * for it at all, because every clause of such a row is a *multiplier* on something
 * the board already has, and a multiplier read off the row alone is a number about
 * nothing. Every other row keeps the walk it has always had, exactly, which is
 * what makes a board where no engine is offered byte-identical.
 *
 * **The stated cut**: a row that mixed an engine with a shape the per-turn books
 * cannot carry — a combat line, an offer rider — would lose that half, because the
 * margin is the whole card's. No Order in the table mixes at all (the fourteen
 * engine rows carry one clause each), and the one Doctrine that does (the Grand
 * Bazaar: two luxury amplifiers and a count of luxuries paid in gold) is read
 * whole by the fold anyway. A future row that mixed the two would want splitting,
 * and this is where it would be split.
 *
 * Falls back to the walk whenever there is no honest pair to difference — a card
 * no chair of this government admits, a class of card that is not played into a
 * deck (see `deckPair`).
 */
export function explainCardEffects(
  id: CardId,
  effects: readonly CardEffect[],
  ctx: ValueContext,
): Appraisal {
  if (!hasFoldReadEngine(effects)) return explainEffects(effects, ctx, id);
  const margin = deckMargin(ctx, id);
  return margin ?? explainEffects(effects, ctx, id);
}

/**
 * The remembered margins of one context.
 *
 * Keyed on the `ValueContext` object rather than on the state, which is the
 * sitting's own bargain said once more (batch 6): a context is one seat's book
 * for one turn, everything hanging off it was read at the moment it was built,
 * and an arm that needs a board the turn has moved past re-reads *the state*
 * rather than the book. A margin is a reading of the same board the rest of the
 * book was read off, so it belongs to the same sitting and dies with it.
 */
const MARGIN_MEMO = new WeakMap<ValueContext, Map<CardId, Appraisal | null>>();

function marginMemo(ctx: ValueContext): Map<CardId, Appraisal | null> {
  let held = MARGIN_MEMO.get(ctx);
  if (held === undefined) {
    held = new Map<CardId, Appraisal | null>();
    MARGIN_MEMO.set(ctx, held);
  }
  return held;
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
 * site, the world's one copy of a wonder, **the parent a chained row wants
 * standing** (`BuildingDef.requiresBuilding`) and **a row the cut withdrew**
 * (`retired`) are all its and none of them is restated here. That is why the
 * fewer-things chains cost this file nothing: a University's potential is
 * already gated on a Library standing, because the town is handed in and the
 * simulation answers for it. The one clause this file adds is not a rule but the count's own
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
        : // The list form (`buildingsOfCategories`) — the same reading with more
          // than one word in it, so a row counting science *and* faith houses has
          // a promise half like every other row that names what a town builds.
          effect.categories !== undefined && effect.categories.length > 0
          ? BUILDING_IDS.filter((id) => effect.categories?.includes(buildingDef(id).category))
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
      return voiceWeight(ctx, pays.yield as Voice) * (pays.percent / 100) * nominalRate(ctx);
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
