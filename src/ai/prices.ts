/**
 * **The bot's prices.** What one point of each voice, a hammer, a beaker, a
 * point of faith, a meter point and a turn of delay are worth to one seat at
 * this sitting.
 *
 * Every reading in `value.ts`, and the other bot files that weigh a yield, a
 * one-time gift or a wait, quote their numbers in these prices. So a reader can
 * learn the bot's units here first, before the readings that use them.
 *
 * This file is a leaf. It imports only the `ValueContext` type from `value.ts`,
 * and a type import is erased at build, so `value.ts` can import this file with
 * no cycle. Its top-level statements are literals and `new WeakMap()` only, so
 * it loads in any order. The three memos are keyed on the `ValueContext`, so
 * each one lives for one seat's sitting.
 */

import type { AiConfig } from './aiConfig';
import { type Appraisal, type ValueTerm, appraise, nest, round, signed } from './decision';
import type { ValueContext } from './value';

import type { BuildingId } from '../sim/buildingData';
import { availableCopies, tileOwnerField } from '../sim/cities';
import { readCity, readEmpireRates } from '../sim/readings';
import { RESOURCE_IDS, type ResourceId, resourceDef } from '../sim/resourceData';
import { type City, type GameState, playerById } from '../sim/state';
import type { EmpireRates } from '../sim/statecraft/evaluator';
import type { TechAge } from '../sim/techData';
import { TILE_YIELD_KEYS, type TileYield } from '../sim/terrainData';
import { foldCity } from '../sim/yields/town';

/** The six voices, in the order every ledger in the game prints them. */
export const VOICES = ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const;
export type Voice = (typeof VOICES)[number];

/** A bag of per-turn yields — a delta, a payout, a card's flats. */
export type YieldBag = Partial<Record<Voice, number>>;

// --- the wager's lean --------------------------------------------------------

/**
 * The three standing readings a card may ask for that this bot has an *arm*
 * for: one more town, one more building, one more wonder.
 *
 * A closed union rather than a `WagerCount`, because what the lean needs is not
 * the reading but the **appetite** it raises — three of the deck's readings ask
 * for a building and two for a wonder, and the call site that folds the term is
 * asking "am I about to raise one of those?" rather than "which card is it".
 */
export type WagerAppetite = 'city' | 'building' | 'wonder';

/**
 * **What one seat's staked bar is, and what closing it is worth** — the lean's
 * whole shape (`src/ai/wager.ts` builds it; this file spends it).
 *
 * `worth` is already discounted for the wait to the close, so both levers spend
 * the same number and neither discounts twice.
 */
export interface WagerLean {
  /** The card's own id and printed name, for the terms a reader of the feed sees. */
  id: string;
  name: string;
  /** Which of the three on the table, and the age they were dealt for. */
  index: number;
  age: number;
  /** The bar, what this seat has reached, and the difference. */
  bar: number;
  standing: number;
  shortfall: number;
  /** Turns until the age closes, as the world clock reads it or the sheet assumes. */
  turnsLeft: number;
  /**
   * What keeping this card is worth, discounted for the wait: the extra bead a
   * stake pays over clearing it unstaked, plus the malice it avoids.
   */
  worth: number;
  /** The voices this reading is quoted in — empty for a reading that is none. */
  voices: readonly Voice[];
  /** The appetite a standing reading raises, or `null`. */
  appetite: WagerAppetite | null;
  /**
   * The town the appetite is about, when the card counts only the **seat of
   * government** — three of the deck's readings do. `null` for a card that
   * counts the whole realm, and for a realm with no capital at all.
   */
  capitalId: number | null;
  /** Why the lean reads what it does. A label; it changes no fold. */
  note: string;
}

/**
 * **How much of the shortfall one more unit closes**, capped at all of it.
 *
 * One more point of a voice a turn banks `turnsLeft` of them by the close, so
 * the fraction of the bar it closes is `turnsLeft ÷ shortfall` — the same
 * arithmetic for a flow (which accumulates by definition) and for a standing
 * reading quoted in the same coin (a treasury, an army). A bar already cleared
 * has no shortfall and closes nothing, which is what takes the lean off the
 * board the turn the card is claimed.
 */
function wagerShare(lean: WagerLean, units: number): number {
  if (lean.shortfall <= 0) return 0;
  return Math.min(1, Math.max(0, units) / lean.shortfall);
}

/**
 * **What one more point of this voice a turn is worth to the bar this seat
 * staked** — nought for every voice the card does not read.
 *
 * A card reading several voices at once (The Six Voices reads all of them) has
 * its worth shared out rather than paid six times over: what the empire is
 * buying is one bar, and a lean that paid the whole of it per voice would price
 * a wager at six wagers.
 */
function wagerVoicePremium(ctx: ValueContext, voice: Voice): number {
  const lean = ctx.wager;
  if (lean === null || lean.voices.length === 0) return 0;
  if (!lean.voices.includes(voice)) return 0;
  const share = 1 / lean.voices.length;
  return lean.worth * wagerShare(lean, lean.turnsLeft) * share * ctx.ai.wager.leanWeight;
}

/**
 * **The lift, and the ceiling it stops at** — a wager may argue with the weight
 * table by the same factor a want book may (`priorities.priceBandHigh`), and no
 * further. That is what makes it a lean.
 *
 * The ceiling is never allowed to *lower* a price something else already set
 * higher: gold's own price carries the collapse lever's pressure, and a bleeding
 * empire's coin must not get cheaper because a wager was staked on it.
 */
function wagerLift(ctx: ValueContext, voice: Voice, base: number): number {
  const premium = wagerVoicePremium(ctx, voice);
  if (premium <= 0) return base;
  const table = yieldWeight(ctx.ai, voice, ctx.age);
  const ceiling = Math.max(base, table * ctx.ai.priorities.priceBandHigh);
  return Math.min(ceiling, base + premium);
}

/**
 * **The appetite's own term** — one printed line for a candidate that would
 * raise the very thing the staked bar counts, or `null` when it would not.
 *
 * `units` is what this candidate delivers in the bar's own coin: one town, one
 * building, one wonder. The term is folded where the arm already prices the
 * thing, so a reader of the feed sees the wager beside the town rather than a
 * number nobody can account for.
 */
export function wagerAppetiteTerm(
  ctx: ValueContext,
  appetite: WagerAppetite,
  units: number,
  why: string,
  /** The town that would raise it — a capital-scoped card counts no other. */
  cityId?: number,
): ValueTerm | null {
  const lean = ctx.wager;
  if (lean === null || lean.appetite !== appetite) return null;
  if (lean.capitalId !== null && cityId !== undefined && cityId !== lean.capitalId) return null;
  const value = lean.worth * wagerShare(lean, units) * ctx.ai.wager.leanWeight;
  if (value <= 0) return null;
  return {
    label:
      `${why} toward ${lean.name} — ${round(units)} of the ${round(lean.shortfall)} still owed, ` +
      `and the bar is worth ${round(lean.worth)}`,
    value,
  };
}

// --- the prices --------------------------------------------------------------

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
 * **Both hammer readings, in one sweep** — the middle town's and the busiest
 * town's (`ValueContext.medianProduction` / `bestProduction`).
 *
 * One walk rather than two, which is the context's standing bargain said once
 * more: `foldCity` prices every worked hex of a town, and asking it twice per
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
  // **The town's own published list**, subscribed to rather than re-taken
  // (batch E2): `readCity` is the quote the panel, the top bar and the Ledger
  // are already reading this revision, with the empire's half of the
  // percentages hoisted once for the seat inside it. Same figure; the fold
  // stays where it was, and the sweep is paid for once by everybody.
  //
  // Asked toward **nothing** (`null`), deliberately: this is what a town makes,
  // not what it makes while building a spearman, so a barracks does not flatter
  // the median the whole appraisal divides by.
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    made.push(foldCity(state, city, [], null, readCity(state, city)).production);
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
  return ageBand(ai.weights[voice], age);
}

/**
 * **One entry of an age-banded row**, indexed by `TechAge − 1` — the idiom
 * every weight row has always been read with, named since E1a so the rows the
 * batch added (`expansion.cityValueFalloffByAge`, `growth.smallCityPop`,
 * `weights.techByAge`) read exactly as `weights.food` does: a shorter row
 * reuses its last entry, an empty one reads nought. One reader, so a persona
 * that writes a three-entry row is treated the same way by every arm.
 */
export function ageBand(row: readonly number[], age: TechAge): number {
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
  // **The wager's lean rides on top of whatever else set the price** (batch W2):
  // a seat that has staked a bar quoted in this voice values one more point of
  // it a turn by what the bar is worth, up to the same band ceiling every other
  // price is clamped into. `ctx.wager` is `null` on every seat that has not
  // staked, so this is a null test on every turn of Æra I and on most others.
  return wagerLift(ctx, voice, baseVoiceWeight(ctx, voice));
}

/** What the voice was worth before the wager was staked. See `voiceWeight`. */
function baseVoiceWeight(ctx: ValueContext, voice: Voice): number {
  if (voice === 'gold') return ctx.prices.gold;
  // **Faith is two prices since batch X12**, and this door hands out the one for
  // a *rate*. See `faithPrice`: what a banked point buys (`ctx.prices.faith`, the
  // book's own shadow price) and what one more point **a turn** is worth are
  // different questions, and every caller of this fold is asking the second —
  // a shrine's faith line, a card's faith pays, a rite's trickle.
  if (voice === 'faith') return faithPrice(ctx);
  // **Culture joined them in batch 6**, off the draft plan (`draftPlan`,
  // `wants.ts`). Those three are exactly the banks this game holds a *stock* of
  // and spends on rows somebody deals, and their price is read off a book of
  // things to buy. Beakers and hammers are flows nothing banks, so neither has a
  // book — and both are priced anyway, off the chains that are waiting on them,
  // as the **table plus a premium** rather than as a rate of their own.
  if (voice === 'culture') return ctx.prices.culture;
  // **Beakers joined them in batch X1c**, off the chains rather than off a bank
  // (`sciencePrice`). Science is the one flow this empire spends without ever
  // banking it — research always runs — so its price is not what a stock could
  // buy but what one more beaker a turn brings *forward*, and that is a
  // derivative of the same chains `hammerPrice` differentiates.
  if (voice === 'science') return sciencePrice(ctx);
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
 * language, and the same floor a want book of poor bargains gives a coin.
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
 * `foldCity` walks the whole empire twice for the two meters — the very sweep
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
 * Nothing that *spends* hammers folds it: a candidate that spends stones is
 * already charged by the turns it spends them over (`push`'s `÷ turns of build
 * effort`, and a chain copy's own cursor since batch X12), and charging the
 * compression back would be the bot disagreeing with itself about one wait.
 *
 * **The price itself survives batch X12's ruling that hammers are time**, and it
 * survives *because* of it. The chains no longer subtract a lump for the stones
 * they owe — the stones are the wait, and the wait is on each copy's own cursor —
 * and this fold has never been a charge for stones either. It is the wait's
 * **derivative**: one more hammer a turn takes `before − after` turns off a copy
 * this town owes, and `discount(after) − discount(before)` is what those turns
 * are worth to the chain waiting on them. With the lump gone the wait is the only
 * place hammers enter a chain at all, so a derivative of it is the whole marginal
 * story rather than half of one.
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
 * **What one more beaker a turn is worth to this empire** — the chain-derivative
 * *science* price (batch X1c of `docs/bot-priorities.md`), and `hammerPrice`'s
 * twin in shape, in memo and in the argument behind it.
 *
 * The user's ruling of **2026-09-09** (`docs/flags.md`, item (ggg)) has two
 * halves and batch X1b shipped only the first. Beakers are **time, never coin**:
 * research always runs, so aiming at A costs nothing a chain does not already
 * carry as its wait, and the lump the beeline used to subtract at
 * `weights.science` was one thing charged twice. That is the spend. The second
 * half is the *gain*, and it is the user's stated intent — *"the bot should
 * prioritize science gain more heavily than it values science spent, so it
 * should lean more towards spending science for science gain"*. If a beaker's
 * only cost is a wait, then a beaker's whole worth is **the wait it removes**,
 * and the table's flat five or six says nothing about how long this empire's own
 * road is.
 *
 * So the price is the table plus a premium, and the premium is a derivative on
 * numbers the chains already carry — no sweep, no search, closed form:
 *
 *     price = weights.science
 *           + Σ over the live chains that still owe beakers of
 *               drop = owed ÷ rate − owed ÷ (rate + 1)          — turns saved
 *               Σ over that chain's steps of
 *                 step.rate × ( discount(step.delay − drop) − discount(step.delay) )
 *
 * `owed` is `chain.remainingBeakers`, `rate` is `ValueContext.scienceRate`
 * floored at one (`researchRoad`'s own floor), and `drop` is the marginal fall in
 * `researchDelay` — `owed ÷ (rate·(rate+1))`, which is the honest discrete form
 * of the `owed ÷ rate²` a continuous derivative would give. Every step of a chain
 * waits through that research delay, so shortening it brings **every** payoff of
 * that chain forward by the same `drop` — which is the one place this differs
 * from `chainCompression`, where a purchased row hurries only the steps behind
 * it, and from `hammerPrice`, where a hammer hurries one town's one row.
 *
 * The second factor is what a turn of that wait is worth, taken through
 * `delayDiscount` itself rather than through its slope. The discount is linear,
 * so the two agree to `drop ÷ horizonTurns` in the middle of the range — but the
 * function knows two things a slope does not: a step already past the horizon is
 * worth nothing however much sooner it arrives, and one that *crosses* the
 * horizon gains only the part of the drop that lands inside it. Reading the
 * discount twice is `chainCompression`'s own device, and it keeps this premium
 * agreeing with the chain it is a derivative of.
 *
 * **A chain with no road contributes nothing**, by construction: a held-tech
 * chain owes no beakers, so `drop` is nought and every one of its steps is
 * waiting on stones rather than on study. An empire with tech road ahead prices a
 * beaker dear; an empire whose plan is empty prices it at the table exactly.
 *
 * **Floored at the table, never capped.** A step's `rate` may be negative (a unit
 * step whose levy shortfall outweighs the piece), and a beaker that arrives
 * sooner is not a thing this empire should be paid to avoid — `meterWeight`'s
 * floor said one voice over. The **ceiling is the band every other price in this
 * file lives in**, `priorities.priceBandHigh`, and it is there because it was
 * measured to be needed rather than on principle: the drop is `owed ÷ (rate·
 * (rate+1))`, so on a young empire's four beakers a turn one more beaker takes
 * *whole turns* off the road, and the premium was read at four and a half times
 * the table on turn 40 of the acceptance bench — a beaker dearer than a bushel,
 * a hammer and a coin together, which is the every-town leaning `hammerTerm`'s
 * own ceiling exists to stop. No new knob: gold, faith, culture and hammers are
 * all banded around the table by this same number, and a fifth price outside the
 * band would be the odd one out rather than the honest one. The floor is the
 * table itself rather than `priceBandLow`, which is the one asymmetry — a
 * beaker's premium is a wait removed and a wait removed is never negative.
 *
 * **Memoised for the life of the context**, as `ratesOf` is and for
 * `hammerPrice`'s reason: it is asked of every science line of every candidate,
 * and the answer is a fact about the empire rather than about the row. It takes
 * no town, which is the other difference from the hammer price — a beaker is
 * banked by the empire and spent by the empire, and no town owes the road.
 *
 * **The chains are built before this price exists**, which is the fixed point
 * batch 1 refused, said once more: `valueContext` builds `liveChains` on the
 * prior, whose `chains` are empty, so a chain's own science lines are folded at
 * the table and every arm that reads the chain afterwards folds them at the
 * price. One honest pass, like the book and the two banks.
 */
const SCIENCE_PRICE_MEMO = new WeakMap<ValueContext, number>();
export function sciencePrice(ctx: ValueContext): number {
  const held = SCIENCE_PRICE_MEMO.get(ctx);
  if (held !== undefined) return held;
  const rate = Math.max(1, ctx.scienceRate);
  let premium = 0;
  for (const chain of ctx.chains) {
    const owed = chain.remainingBeakers;
    if (owed <= 0) continue;
    const drop = owed / rate - owed / (rate + 1);
    if (drop <= 0) continue;
    for (const step of chain.steps) {
      // Floored at nought: `delayDiscount` has no ceiling, so a negative delay
      // would answer more than one and pay a step for arriving before it was
      // wanted. The floor cannot bind while the rate is at least one (the drop
      // is half the research delay at worst), and it is written down rather than
      // argued away.
      const sooner =
        delayDiscount(Math.max(0, step.delay - drop), ctx) - delayDiscount(step.delay, ctx);
      if (sooner <= 0) continue;
      premium += step.rate * sooner;
    }
  }
  const table = yieldWeight(ctx.ai, 'science', ctx.age);
  const price = Math.min(
    table * ctx.ai.priorities.priceBandHigh,
    table + Math.max(0, premium),
  );
  SCIENCE_PRICE_MEMO.set(ctx, price);
  return price;
}

/**
 * **What one more point of faith a turn is worth to this empire** —
 * `sciencePrice`'s twin (batch X12 of `docs/bot-priorities.md`), in shape, in
 * memo and in the argument behind it.
 *
 * The user's ruling of **2026-09-09** (`docs/flags.md`, item (ggg)): *"religion
 * and pantheons need to be priced into the value of faith."* Read off seed 1 on
 * the landed tree, the capital's pool sat at fifteen for ninety turns, the book
 * valued the pantheon at 385 for forty faith the whole time, no Shrine was ever
 * built and no god was ever consecrated. Nothing was broken in the book; what was
 * missing is that **nothing told the build arm a Shrine is the step to it**.
 *
 * The reason is the same one `sciencePrice` was written for. `ctx.prices.faith`
 * is a **stock** price — what one banked point buys, `worth ÷ price` over the
 * book, banded — and it is the right number for a fold that *spends* faith (a
 * purchase, a rung, a rite's cost, the saving rows). It is the wrong number for a
 * fold that *raises the rate*, because a rate does not buy the pantheon: it
 * brings the pantheon **forward**. An empire making one faith a turn with forty
 * to find is twenty-five turns from its first god; at two a turn it is twelve,
 * and the thirteen turns saved are what the Shrine is actually for.
 *
 * So the price is the table plus a premium, and the premium is a derivative on
 * numbers the faith book already carries — no sweep, no search, closed form:
 *
 *     price = weights.faith
 *           + Σ over the faith plan's wants of
 *               delay = (want.price − the pool) ÷ rate      — turns until it pays
 *               drop  = delay − (want.price − the pool) ÷ (rate + 1)
 *               want.worth × ( discount(delay − drop) − discount(delay) )
 *
 * `rate` is `foldEmpireRates().faithPerTurn` **floored at one**, which is the
 * clause that answers the seed-1 reading: an empire with no faith income at all
 * would otherwise divide by nought and read every want as infinitely far off, so
 * a zero-income empire reads a finite, large delay instead and prices its first
 * Shrine as the door it is. The floor is `researchRoad`'s own, one bank over.
 *
 * `want.worth` is a per-turn figure like a chain step's `rate` (the fold of the
 * want's own printed terms — a god's effects, a founding's trickle, a rite's
 * blessing), which is why it multiplies the discount delta directly and nothing
 * divides by `lumpTurns` here. The **wants are the whole plan**, not only the
 * ones the purse can reach: a want out of reach is exactly the one a faster rate
 * arrives at, and the saving rows that stand for holding are in the list because
 * holding is one of the things faith does.
 *
 * The discount is read **twice** rather than through its slope, which is
 * `chainCompression`'s device and `sciencePrice`'s: the function knows two things
 * a slope does not, that a want already past the horizon gains nothing by
 * arriving sooner, and that one which *crosses* the horizon gains only the part
 * of the drop that lands inside it.
 *
 * **Floored at the table, capped by the band.** A want cannot be worth less than
 * nothing to arrive sooner, so the premium is floored at nought and the price at
 * `weights.faith`; the ceiling is `priorities.priceBandHigh` × the table, the same
 * band gold, culture, hammers and beakers all live in. No new knob.
 *
 * **Which arm reads which price.** This one is `voiceWeight(ctx, 'faith')` — the
 * rate: a building's faith line through `explainYields`, a card's `pays` in
 * faith, a rite's trickle, anything whose delta is *faith a turn*.
 * `ctx.prices.faith` stays the stock: `priceOf`'s own answer, read by the spend
 * arms through the want book (`worthPerCoin`) and by the folds that charge a
 * price in faith. A shrine raises the rate; a prophet spends the bank; the two
 * questions have two answers and the book is still the source of both.
 *
 * **Memoised for the life of the context**, `sciencePrice`'s bargain exactly: it
 * is asked of every faith line of every candidate and the answer is a fact about
 * the empire rather than about the row. And like the science price it is read
 * off a book built on the **prior** — `valueContext` builds the wants before any
 * price exists — so one honest pass, no fixed point.
 */
const FAITH_PRICE_MEMO = new WeakMap<ValueContext, number>();
export function faithPrice(ctx: ValueContext): number {
  const held = FAITH_PRICE_MEMO.get(ctx);
  if (held !== undefined) return held;
  const table = yieldWeight(ctx.ai, 'faith', ctx.age);
  const high = table * ctx.ai.priorities.priceBandHigh;
  // Set before the walk: `explainYields` below is not reached from here, but a
  // want's own terms were folded at the prior and a re-entrant ask (a fold that
  // reads a faith weight while this one is still running) must not recurse.
  FAITH_PRICE_MEMO.set(ctx, table);
  const rate = Math.max(1, ratesOf(ctx).faithPerTurn ?? 0);
  const pool = Math.max(0, playerById(ctx.state, ctx.playerId)?.faithPool ?? 0);
  let premium = 0;
  for (const want of ctx.wants.faith) {
    if (want.worth <= 0) continue;
    const owed = Math.max(0, want.price - pool);
    if (owed <= 0) continue;
    const delay = want.delay + owed / rate;
    const sooner =
      delayDiscount(Math.max(0, want.delay + owed / (rate + 1)), ctx) - delayDiscount(delay, ctx);
    if (sooner <= 0) continue;
    premium += want.worth * sooner;
  }
  const price = Math.min(high, table + Math.max(0, premium));
  FAITH_PRICE_MEMO.set(ctx, price);
  return price;
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

// `tileSeamCopies` was here and was deleted in batch R6 (`docs/flags.md`
// (oooooo)). It was a copy of `tileCopies` in `src/sim/cities.ts`, written
// because R5 could not edit the simulation, and its own docblock said to delete
// it once `tileCopies` was exported. That has happened. The three appraisals
// that used it — the site's seams in `bot.ts`, the hex's own in `wants.ts` and
// the spade's in `plan.ts` — import `tileCopies` directly, so nothing in
// `src/ai/` decides what a seam is worth.

/**
 * **Spare copies of every strategic kind, by id** — `ValueContext.spare`.
 *
 * One `availableCopies` a kind, which is one walk of this seat's units and its
 * towns' queues each. Strategic rows only: a luxury or a bonus seam has no
 * copies to spend, so asking would be a walk for an answer nobody reads.
 *
 * A `Map` rather than a plain object because the caller only ever asks it by
 * key — it is never iterated, so nothing here decides an outcome by insertion
 * order (hard rule 2).
 */
export function spareResourceCopies(
  state: GameState,
  playerId: number,
): ReadonlyMap<ResourceId, number> {
  const spare = new Map<ResourceId, number>();
  for (const id of RESOURCE_IDS) {
    if (resourceDef(id).kind !== 'strategic') continue;
    spare.set(id, availableCopies(state, playerId, id));
  }
  return spare;
}

/**
 * **What a seam on a hex is worth to this empire**, as printed terms — read
 * through one door so that a site, a hex for sale and a spade cannot disagree
 * about what an iron hill is.
 *
 * A luxury is one line and has always been: a luxury is a *signature*, a second
 * copy of it pays nothing new, so it is worth `site.newLuxuryBonus` to an
 * empire that has none and nothing at all to one that has.
 *
 * **A strategic is two lines, and that is batch R5's whole point.** The copies
 * model made a strategic seam two different things at once:
 *
 *   · **the first copy switches on the kind's empire-wide bonus** — copper's
 *     coin in every town, ivory's contentment, niter's beakers, iron's ten
 *     points of health. One copy is enough and a second pays it no better, so
 *     this is the luxury's own shape and it keeps the luxury's own knob,
 *     `site.newStrategicBonus`;
 *   · **every copy is one more unit this empire may field.** A unit holds its
 *     copy for as long as it lives, so copies are army, and a seam that rolled
 *     eight of them is worth a great deal more than one that rolled three.
 *     `site.strategicCopyValue` a copy.
 *
 * The second line **tapers on what this empire can already spare**
 * (`ValueContext.spare`, `site.strategicSpareTaper`). An empire with twenty
 * horses to hand does not need a twenty-first before it needs anything else;
 * an empire that cannot field another horseman needs one badly. The share is
 * `taper / (taper + spare)` — full worth at nothing to spare, half at the
 * taper's own figure, and falling away from there. A taper of nought reads as
 * "only copies of a kind I have run out of", which is the honest extreme rather
 * than a division by zero.
 *
 * Together those two are the asymmetry the model turns on: an empire with no
 * iron values an iron seam several times over what the same empire values its
 * ninth horse herd, and it says so in two printed lines rather than in one
 * constant.
 *
 * **`held` is the caller's choice of reading, and the two callers choose
 * differently on purpose.** The settler and the hex on offer pass
 * `ValueContext.realm` — the seams standing on this empire's own ground,
 * improved or not — because buying or settling a hex is about *potential* and a
 * copy owned and unmined is still a copy. The spade passes the empire's
 * **access** instead, because the whole of what a mine on an iron hill does is
 * turn ground this empire already owns into iron it can actually draw on. Both
 * are stated where they are passed.
 *
 * `copies` is the seam's own rolled quantity (`Tile.resourceCopies`, 3 to 8 on
 * a strategic row). A caller that cannot see the tile passes 1, which prices
 * the seam as the boolean it was before this batch.
 */
export function newResourceTerms(
  ctx: ValueContext,
  held: ReadonlySet<ResourceId>,
  resource: ResourceId | undefined,
  where: string,
  copies: number,
): ValueTerm[] {
  if (resource === undefined) return [];
  const def = resourceDef(resource);
  const ai = ctx.ai;
  if (def.kind === 'luxury') {
    if (held.has(resource)) return [];
    return [
      {
        label: `${def.name} ${where} — a luxury this empire owns no copy of`,
        value: ai.site.newLuxuryBonus,
      },
    ];
  }
  if (def.kind !== 'strategic') return [];
  const terms: ValueTerm[] = [];
  if (!held.has(resource)) {
    terms.push({
      label:
        `${def.name} ${where} — the first ${def.name} this empire would hold, ` +
        'and one copy is the whole of what its empire-wide bonus asks',
      value: ai.site.newStrategicBonus,
    });
  }
  const each = ai.site.strategicCopyValue;
  if (each > 0 && copies > 0) {
    const spare = ctx.spare.get(resource) ?? 0;
    const taper = Math.max(0, ai.site.strategicSpareTaper);
    const share = taper + spare === 0 ? 1 : taper / (taper + spare);
    if (share > 0) {
      terms.push({
        label:
          `${copies} ${copies === 1 ? 'copy' : 'copies'} of ${def.name} ${where} at ` +
          `${round(each)} each, × ${round(share)} — this empire can already spare ${spare}`,
        value: copies * each * share,
      });
    }
  }
  return terms;
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
 * What the number a voice was multiplied by **is** — the age weight for the two
 * unpriced voices, the live price with its reason for the three the book prices,
 * and the table with its premium beside it for beakers. A label: it changes no
 * fold.
 *
 * Science's clause is batch X1c's printed half (`sciencePrice`): the whole point
 * of the premium is that a library is worth a different number in an empire with
 * road ahead than in one with none, so the feed says which of the two it read and
 * what the road did to it — the way a coin has said its shadow price since batch
 * 1. A premium of nought prints as the plain age weight, because that is what it
 * is.
 */
export function weightWords(ctx: ValueContext, voice: Voice): string {
  if (voice === 'science') {
    const table = yieldWeight(ctx.ai, 'science', ctx.age);
    const premium = sciencePrice(ctx) - table;
    if (premium <= 0) return 'age weight, with no road left to hurry';
    return (
      `the science price — the table's ${round(table)} and ${round(premium)} more ` +
      `for the turns one more beaker a turn takes off the road ahead`
    );
  }
  // **Faith's clause is batch X12's printed half** (`faithPrice`), and it says
  // which of the bank's two prices this line read: the *rate* price, the table
  // plus what one more point a turn takes off the wait for the plan's own wants.
  // The book's note is printed beside it, because the wants the premium is read
  // off are the very rows the note names.
  if (voice === 'faith') {
    const table = yieldWeight(ctx.ai, 'faith', ctx.age);
    const premium = faithPrice(ctx) - table;
    const note = ctx.priceNotes.faith;
    const why = note === '' ? '' : ` (${note})`;
    if (premium <= 0) return `age weight, with nothing in the faith plan to hurry${why}`;
    return (
      `the faith rate price — the table's ${round(table)} and ${round(premium)} more ` +
      `for the turns one more faith a turn takes off the plan ahead${why}`
    );
  }
  if (voice !== 'gold' && voice !== 'culture') return 'age weight';
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

/**
 * **`explainLump` for a gift that is already points** — the same exchange for the
 * three one-time grants that are not a bag of voices (batch X12): a bead, a free
 * technology, the renown a capstone pays when its stones go up.
 *
 * Not folded into `explainLump` because that one's argument is a `YieldBag` and a
 * bead is not a voice — the weight table prices it directly. What the two share
 * is the only thing that matters here, `score.lumpTurns`: **one exchange rate
 * between a stock and a flow in the whole bot**, so a completion grant and a
 * merchant's purse are converted by the same twenty turns and a reader of the
 * feed sees the same division in both.
 */
export function lumpOfPoints(points: number, ctx: ValueContext): Appraisal {
  const turns = Math.max(1, ctx.ai.score.lumpTurns);
  if (points === 0) return appraise([]);
  return appraise([
    { label: `${round(points)} points, once`, value: points },
    { label: `÷ ${round(turns)} — a gift paid once, not every turn`, value: turns, op: 'div' },
  ]);
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

// --- the empire's books, read once a sitting ---------------------------------

/**
 * **The empire's own per-turn books**, remembered for the life of the context.
 *
 * `foldEmpireRates` prices every town, and half a dozen of the arms above want
 * one voice of it — so it is asked once per sitting, which is the context's
 * standing bargain said once more (batch 6). Deliberately the **base** reading,
 * before any conversion pays anything, because that is what the evaluator hands
 * a `pays` rate: pricing a conversion against a rate that already carried
 * conversions would be a card feeding itself.
 */
const RATES_MEMO = new WeakMap<ValueContext, EmpireRates>();
export function ratesOf(ctx: ValueContext): EmpireRates {
  let held = RATES_MEMO.get(ctx);
  if (held === undefined) {
    held = readEmpireRates(ctx.state, ctx.playerId);
    RATES_MEMO.set(ctx, held);
  }
  return held;
}
