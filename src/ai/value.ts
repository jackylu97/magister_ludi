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
 * A bag of per-turn yields, in the one currency.
 *
 * Gold is the only voice whose weight moves with the empire's health, and it
 * moves here rather than in the table so the table stays a plain statement of
 * taste. See `ValueContext.goldPressure`.
 */
export function explainYields(bag: YieldBag, ctx: ValueContext): Appraisal {
  const terms: ValueTerm[] = [];
  for (const voice of VOICES) {
    const amount = bag[voice];
    if (amount === undefined || amount === 0) continue;
    const weight = yieldWeight(ctx.ai, voice, ctx.age) * (voice === 'gold' ? ctx.goldPressure : 1);
    const pressure = voice === 'gold' ? goldPressureLabel(ctx) : '';
    terms.push({
      label: `${voice} ${signed(amount)} × ${round(yieldWeight(ctx.ai, voice, ctx.age))} age weight${pressure}`,
      value: amount * weight,
    });
  }
  return appraise(terms);
}

export function valueOfYields(bag: YieldBag, ctx: ValueContext): number {
  return explainYields(bag, ctx).total;
}

/**
 * How the gold pressure prints beside a coin. Silent in a healthy empire with
 * nothing to explain; loud when the books are bleeding, and loud in the other
 * direction when a 1 was *decided* by the opening grace rather than earned.
 */
function goldPressureLabel(ctx: ValueContext): string {
  if (ctx.goldPressure === 1 && ctx.pressureNote === '') return '';
  const note = ctx.pressureNote === '' ? '' : ` (${ctx.pressureNote})`;
  return ` × ${round(ctx.goldPressure)} gold pressure${note}`;
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
  const note = ctx.pressureNote === '' ? '' : ` (${ctx.pressureNote})`;
  return appraise([
    { label: `${round(gold)} gold a turn`, value: gold },
    {
      label: `× ${round(yieldWeight(ctx.ai, 'gold', ctx.age))} age weight`,
      value: yieldWeight(ctx.ai, 'gold', ctx.age),
      op: 'mul',
    },
    { label: `× ${round(ctx.goldPressure)} gold pressure${note}`, value: ctx.goldPressure, op: 'mul' },
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
      label: `${signed(def.happiness)} happiness × ${ctx.ai.weights.happiness}`,
      value: def.happiness * ctx.ai.weights.happiness,
    });
  }
  if (def.authorityCapacity !== undefined) {
    terms.push({
      label: `${signed(def.authorityCapacity)} authority × ${ctx.ai.weights.authority}`,
      value: def.authorityCapacity * ctx.ai.weights.authority,
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
export function explainEffects(effects: readonly CardEffect[], ctx: ValueContext): Appraisal {
  const terms: ValueTerm[] = [];
  for (const effect of effects) terms.push({ label: effect.kind, value: scoreEffect(effect, ctx) });
  return appraise(terms);
}

export function scoreEffects(effects: readonly CardEffect[], ctx: ValueContext): number {
  return explainEffects(effects, ctx).total;
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
        for (const voice of VOICES) sum += yieldWeight(ctx.ai, voice, ctx.age) * percent * nominal;
        return sum * ctx.cities;
      }
      return yieldWeight(ctx.ai, effect.yield as Voice, ctx.age) * percent * nominal * ctx.cities;
    }
    case 'productionBonus':
      return yieldWeight(ctx.ai, 'production', ctx.age) * (effect.percent / 100) * nominal * ctx.cities;
    case 'tileYield':
      // A `CardYieldBag` on the row, plus an optional percentage on whatever the
      // hex's improvement already pays; the bag is the legible half and the
      // percentage is priced against the nominal yield like every other rate.
      return (
        (valueOfYields(bagOf(effect), ctx) +
          ((effect.percent ?? 0) / 100) * nominal * yieldWeight(ctx.ai, 'production', ctx.age)) *
        ctx.ai.score.nominalTiles
      );
    case 'countScaled':
      return scorePayout(effect.pays, ctx) * ctx.ai.score.nominalCount;
    case 'happiness':
      return effect.amount * ctx.ai.weights.happiness * (effect.per === 'city' ? ctx.cities : 1);
    case 'authority':
      return effect.amount * ctx.ai.weights.authority * (effect.per === 'city' ? ctx.cities : 1);
    case 'happinessTierBoost':
      return effect.points * ctx.ai.weights.happiness;
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

/** A `countScaled`'s payout, per unit of whatever it counts. */
function scorePayout(pays: PayoutShape, ctx: ValueContext): number {
  switch (pays.to) {
    case 'yield': {
      const bag: YieldBag = {};
      bag[pays.yield as Voice] = pays.amount;
      return valueOfYields(bag, ctx);
    }
    case 'happiness':
      return pays.amount * ctx.ai.weights.happiness;
    case 'authority':
      return pays.amount * ctx.ai.weights.authority;
    case 'percent':
      return yieldWeight(ctx.ai, pays.yield as Voice, ctx.age) * (pays.percent / 100) * ctx.ai.score.nominalYield;
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
