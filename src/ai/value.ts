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
 */

import { AI } from './aiConfig';

import { type BuildingId, buildingDef } from '../sim/buildingData';
import type { CardEffect } from '../sim/statecraftData';
import { type ProjectId, projectDef } from '../sim/projectData';
import { type TechAge } from '../sim/techData';
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
   * Enemy combat pieces standing within `threat.radius` of one of this empire's
   * towns, capped. Zero in a quiet world.
   */
  threat: number;
  /**
   * 1 while this empire holds a god and has founded no religion, 0 otherwise —
   * the one window in which the road to a prophet is the most valuable thing on
   * the chart. `threat`'s sibling: a fact about the world that swings one term
   * of the appraisal and swings back when it is answered.
   */
  faithAppetite: number;
}

/** What one per-turn point of a voice is worth in this age. */
export function yieldWeight(voice: Voice, age: TechAge): number {
  const row = AI.weights[voice];
  const index = Math.min(row.length - 1, Math.max(0, age - 1));
  return row[index] ?? 0;
}

/**
 * A bag of per-turn yields, in the one currency.
 *
 * Gold is the only voice whose weight moves with the empire's health, and it
 * moves here rather than in the table so the table stays a plain statement of
 * taste. See `ValueContext.goldPressure`.
 */
export function valueOfYields(bag: YieldBag, ctx: ValueContext): number {
  let total = 0;
  for (const voice of VOICES) {
    const amount = bag[voice];
    if (amount === undefined || amount === 0) continue;
    const weight = yieldWeight(voice, ctx.age) * (voice === 'gold' ? ctx.goldPressure : 1);
    total += amount * weight;
  }
  return total;
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
export function costOfUpkeep(gold: number, ctx: ValueContext): number {
  if (gold <= 0) return 0;
  return gold * yieldWeight('gold', ctx.age) * ctx.goldPressure;
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
export function valueOfBuildingRow(id: BuildingId, ctx: ValueContext): number {
  const def = buildingDef(id);
  let value = 0;
  if (def.happiness !== undefined) value += def.happiness * AI.weights.happiness;
  if (def.authorityCapacity !== undefined) value += def.authorityCapacity * AI.weights.authority;
  if (def.cityStat !== undefined) {
    // A wall is worth what a soldier's worth of strength is worth, scaled by how
    // much this empire currently minds being attacked.
    value += def.cityStat.amount * AI.weights.military * (1 + ctx.threat);
  }
  if (def.renown !== undefined) {
    value += def.renown.perTurn * AI.weights.renown;
    value += (def.renown.onComplete ?? 0) * AI.weights.renown;
  }
  for (const grant of def.onComplete ?? []) {
    if (grant.grant === 'bead') value += AI.weights.bead;
    else if (grant.grant === 'unit') value += AI.weights.military * AI.score.combatScale;
    else if (grant.grant === 'tech') value += AI.weights.tech;
    else value += AI.score.unknownEffect;
  }
  if (def.endsTheGame === true) value += AI.weights.victory;
  value += scoreEffects(def.effects ?? [], ctx);
  return value;
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
export function valueOfProjectRow(id: ProjectId, ctx: ValueContext): number {
  const def = projectDef(id);
  const bag: YieldBag = {
    gold: def.pays.gold ?? 0,
    science: def.pays.science ?? 0,
    faith: def.pays.faith ?? 0,
  };
  let value = valueOfYields(bag, ctx);
  if (def.bead !== undefined) value += AI.weights.bead;
  return value;
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
export function valueOfSoldier(id: UnitTypeId, ctx: ValueContext): number {
  const def = unitDef(id);
  if (!isCombatant(def)) return 0;
  const strength = Math.max(def.combatStrength, def.rangedStrength ?? 0);
  return strength * AI.weights.military + ctx.threat * AI.threat.militaryBonus;
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
export function scoreEffects(effects: readonly CardEffect[], ctx: ValueContext): number {
  let total = 0;
  for (const effect of effects) total += scoreEffect(effect, ctx);
  return total;
}

function scoreEffect(effect: CardEffect, ctx: ValueContext): number {
  const nominal = AI.score.nominalYield;
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
        for (const voice of VOICES) sum += yieldWeight(voice, ctx.age) * percent * nominal;
        return sum * ctx.cities;
      }
      return yieldWeight(effect.yield as Voice, ctx.age) * percent * nominal * ctx.cities;
    }
    case 'productionBonus':
      return yieldWeight('production', ctx.age) * (effect.percent / 100) * nominal * ctx.cities;
    case 'tileYield':
      // A `CardYieldBag` on the row, plus an optional percentage on whatever the
      // hex's improvement already pays; the bag is the legible half and the
      // percentage is priced against the nominal yield like every other rate.
      return (
        (valueOfYields(bagOf(effect), ctx) +
          ((effect.percent ?? 0) / 100) * nominal * yieldWeight('production', ctx.age)) *
        AI.score.nominalTiles
      );
    case 'countScaled':
      return scorePayout(effect.pays, ctx) * AI.score.nominalCount;
    case 'happiness':
      return effect.amount * AI.weights.happiness * (effect.per === 'city' ? ctx.cities : 1);
    case 'authority':
      return effect.amount * AI.weights.authority * (effect.per === 'city' ? ctx.cities : 1);
    case 'happinessTierBoost':
      return effect.points * AI.weights.happiness;
    case 'combatLine':
      return effect.amount * AI.weights.military * (1 + ctx.threat);
    case 'unitStat':
      return effect.amount * AI.weights.military * (1 + ctx.threat);
    case 'renown':
      return effect.amount * AI.weights.renown;
    case 'upkeepRebate':
      // A rebate is gold that never leaves, priced at the same pressure-adjusted
      // rate the bill is charged at — so a card that pays the army's wages
      // becomes the best card in the hand exactly when the treasury is bleeding.
      return costOfUpkeep((effect.amount ?? 1) * AI.score.nominalCount, ctx);
    case 'offerRider':
      return AI.score.unknownEffect * AI.score.nominalCount;
    default:
      // **Never zero.** A shape this bot cannot read is a shape whose card is
      // still worth more than a blank one, and a card whose whole text is
      // unreadable must not sort below an empty offer.
      return AI.score.unknownEffect;
  }
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
      return pays.amount * AI.weights.happiness;
    case 'authority':
      return pays.amount * AI.weights.authority;
    case 'percent':
      return yieldWeight(pays.yield as Voice, ctx.age) * (pays.percent / 100) * AI.score.nominalYield;
    default:
      return AI.score.unknownEffect;
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
