/**
 * What a luxury does beyond its happiness: the **one** evaluator for the
 * signature-effect vocabulary.
 *
 * Every luxury pays the same two things — whatever its row puts on its tile, and
 * a flat `meters.happiness.perUniqueLuxury` to whoever has it in hand. On top of
 * that each row declares a *list* of `effects` (`resourceData.ts`), and this
 * module is the only place in the game that reads one. Nine shapes go in;
 * labelled lists come out; nothing anywhere else switches on `effect.kind`.
 *
 * That is the whole design, and it is deliberately narrower than "luxuries can
 * do things". A table where a row could name an arbitrary behaviour is a table
 * where every row is a special case somewhere in the simulation, and the thing
 * this milestone actually buys is that **a new luxury is a JSON row**: pick
 * shapes, pick numbers, and the scatter places it, the city panel explains it
 * and the turn pipeline banks it with no TypeScript written for it at all
 * (`test/resources.test.ts` proves that with a row invented at runtime). Rows
 * whose ratified effect would need a one-off hack are *deferred and annotated*
 * in `docs/luxuries.md` instead of bent into a shape that nearly fits.
 *
 * Three scales, one uniqueness rule, one marked exception
 * ------------------------------------------------------
 * A luxury's effect counts **once per unique kind**, never once per tile — the
 * same reading `controlledResources` gives the happiness meter, and for the same
 * reason: two improved jade seams are one jade in the player's hands. Where the
 * scales differ is *whose* hands:
 *
 *   · **local** (an `'owner'`-scoped yield, `productionBonus` at its default
 *     scope) counts once per kind *per city that controls it*, because the
 *     effect is the city's. Two jades in one city are one jade's signature; jade
 *     in two cities pays twice — which is the point of a "powerfully local"
 *     shape and the reason to settle the second seam rather than shrug at it.
 *   · **wide** (`perCityYields`, `perPopulationYields`, an `extraHappiness` or
 *     an `authoritySupply` with a `per`) counts once per kind for the empire and
 *     then lands in **every** city it owns — or every coastal one. This is the
 *     shape the ratified table is mostly built out of, and it is deliberately
 *     empire-scaling: a wide empire earns more from one seam of gems than a tall
 *     one does, and happiness and authority are the taxes that price that.
 *   · **empire** (`empireYields`, a bare `extraHappiness`) counts once per kind
 *     for the whole empire and lands nowhere in particular. A second silk seam
 *     anywhere is worth nothing.
 *
 * `perCopy` is the one exception, and it is marked wherever it appears: silver
 * and gold scale their Æra III tier by how many *tiles* the player controls,
 * which is the exact opposite of what every other row says and is therefore the
 * thing a reader will be certain is a bug unless it is written down.
 *
 * Every function below returns the *list*, and every consumer folds it into a
 * breakdown it already had: `cityYields` and the city panel for the flat yields
 * and the percentages, `productionModifiers` for the hammers, `explainHappiness`
 * and `explainAuthority` for the meters. Totals are folds of lists, which is
 * CLAUDE.md's rule 5 read one scale out from a tile.
 *
 * The import cycle with `cities.ts`, and why it is safe
 * ----------------------------------------------------
 * The same cycle `meters.ts` documents, for the same reason and with the same
 * guarantee. This module asks `cities.ts` which resources a city and an empire
 * actually control — one rule, `openedResource`, and duplicating it here is
 * exactly what rule 5 forbids — and `cities.ts` asks this module for the lines
 * to fold into `cityYields`. It is a *function-level* cycle only: everything at
 * the top level here is a type or a constant from the data tables, and nothing
 * in this file may grow a top-level call into `cities.ts`.
 */

import type { ProductionCategory } from './buildingData';
import type { ModifierStage } from './modifiers';
import {
  cityResources,
  controlledResources,
  isCoastalCity,
  resourceCopies,
} from './cities';
import {
  type CityYieldKey,
  type ResourceCityScope,
  type ResourceEffect,
  type ResourceId,
  type ResourceRule,
  type ResourceYieldBag,
  RESOURCE_EFFECT_YIELDS,
  RESOURCE_IDS,
  ageLabel,
  effectIsLive,
  resourceDef,
  resourceEffects,
} from './resourceData';
import { type ImprovementId, improvementDef } from './improvementData';
import { type TileLine, cardAmplifier } from './statecraft';
import { type City, type GameState, playerById } from './state';
import { type TechAge, highestAge } from './techData';

/**
 * One line of what a resource's signature pays, in all six voices.
 *
 * Six rather than the tile chain's original three because these land in a
 * *city's* or an *empire's* ledger, where science, culture and faith exist.
 * Zeroes are carried rather than omitted so a consumer folds one shape instead
 * of six optional ones.
 */
export interface ResourceYieldLine {
  /** The resource whose signature this is. */
  resource: ResourceId;
  /** Display label — the resource's name, plus what makes this line this line. */
  source: string;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

/** One line of extra happiness, on top of the flat per-unique figure. */
export interface ResourceHappinessLine {
  resource: ResourceId;
  source: string;
  amount: number;
}

/** One line of authority capacity a luxury supplies. */
export interface ResourceAuthorityLine {
  resource: ResourceId;
  source: string;
  amount: number;
}

/** One line of hammers behind a category, as a signed whole percent. */
export interface ResourceProductionLine {
  resource: ResourceId;
  source: string;
  percent: number;
}

/**
 * One line of percentage on a named yield, as a signed whole percent, and which
 * of Entry XVII's two multiplications it joins.
 *
 * Carried on the line rather than assumed by the consumer, because the stage is
 * the doctrine's decision and not the consumer's. Every shape in this table is
 * city-stage today — "in each coastal city" and "in every city" both *apply* in
 * a city, whatever the scope's reach (see `scopeStage`) — and the field exists so
 * that the day a genuinely empire-total signature is minted, it says so on its
 * own line instead of being sorted by a branch somewhere downstream.
 */
export interface ResourcePercentLine {
  resource: ResourceId;
  source: string;
  yield: CityYieldKey;
  percent: number;
  stage: ModifierStage;
}

/** One line of percentage on a named *rule*, as a signed whole percent. */
export interface ResourceRuleLine {
  resource: ResourceId;
  source: string;
  percent: number;
}

// --- the reading ------------------------------------------------------------

/** The age this player stands in. The one input every `fromAge` gate reads. */
function ageOf(state: GameState, playerId: number): TechAge {
  const player = playerById(state, playerId);
  return player ? highestAge(player.techsResearched) : 1;
}

/**
 * How many times an effect counts for this player: once, or once per tile when
 * the row asks for it.
 *
 * The whole of the `perCopy` exception, in one place, so that a shape which
 * scales and a shape which does not are the same code path with a different
 * multiplier — and so that "how many silver do I control" has exactly one
 * answer (`resourceCopies`, which asks the same `openedResource` rule
 * everything else does).
 */
function copiesFor(
  state: GameState,
  playerId: number,
  id: ResourceId,
  effect: ResourceEffect,
): number {
  if (effect.perCopy) return resourceCopies(state, playerId, id);
  // The Grand Bazaar's second clause, and the one place a card reaches into this
  // vocabulary: "additional copies of a luxury count at 30%". The uniqueness rule
  // above is unchanged — one kind counts once — and this adds a *fraction* of
  // each further copy on top of it, so an empire with no such card multiplies by
  // exactly 1 and every figure in this file is what it always was.
  //
  // Not floored here: the callers floor their own products (`lineOf`, and the
  // meters' own arithmetic), which is what keeps "two half-coin sources pay for
  // two halves" true one level down.
  const duplicates = cardAmplifier(state, playerId, 'luxuryDuplicates');
  if (duplicates === 0) return 1;
  const extra = Math.max(0, resourceCopies(state, playerId, id) - 1);
  return 1 + (extra * duplicates) / 100;
}

/**
 * Does a scoped effect land in this city? Absent scope means every city.
 *
 * `local` is the list of kinds this city holds itself, passed in rather than
 * asked for here because the caller already has it and it costs a sweep of the
 * city's territory. It is only read by the `'owner'` scope.
 */
function scopeAdmits(
  state: GameState,
  city: City,
  scope: ResourceCityScope | undefined,
  local: readonly ResourceId[],
  id: ResourceId,
): boolean {
  if (scope === 'coastal') return isCoastalCity(state, city);
  if (scope === 'owner') return local.includes(id);
  return true;
}

/**
 * Which of Entry XVII's two multiplications a luxury's percentage joins.
 *
 * **Every one of them is city-stage**, whatever the scope says (user, ratified
 * 2026-08-24), and the scope is passed in so that the rule is stated where a
 * reader will look for it rather than left to be inferred from a constant.
 *
 * Entry XVII.4 read strictly is the whole argument: the stage is where the
 * effect *applies*, and every shape in this table applies **in a city**. "+20%
 * science in each coastal city" and "+10% gold in every city" differ only in how
 * many cities qualify — both land on one town's yield, multiply with that town's
 * buildings, and are worth more in a town that has built more. Neither is an
 * empire *total*. The global stage is reserved for modifiers that are facts
 * about the empire itself rather than about any city in it — the two meter
 * tiers today, and whatever genuinely empire-total effect a later age mints —
 * which is also Entry XVII.5's "used sparingly" made literal: with today's
 * content, the global stage contains **only** the meters.
 *
 * The same reading covers `productionBonus` for the same reason: a share of the
 * hammers this town puts behind this build, city-stage at either scope. See
 * `productionModifiers` in `cities.ts`.
 */
function scopeStage(_scope: ResourceCityScope | undefined): ModifierStage {
  return 'city';
}

/** What a scoped line says about where it landed. */
function scopeNote(scope: ResourceCityScope | undefined): string {
  if (scope === 'coastal') return 'coastal city';
  if (scope === 'owner') return 'this city';
  return 'every city';
}

/**
 * A label that says *which* line of a signature this is.
 *
 * "Gems" alone is ambiguous the moment a row pays two things, so a wide line
 * says so — "Gems · every city" — and a scaled one says how far it scaled —
 * "Silver · ×3 copies". The tier is never in the label, because a locked tier is
 * not in the list at all: it is shown by `describeResourceSignature`, which is
 * what the hover reads.
 */
function label(id: ResourceId, note: string | null, copies: number): string {
  const name = resourceDef(id).name;
  const parts = [name];
  if (note) parts.push(note);
  if (copies !== 1) parts.push(`×${copies} copies`);
  return parts.join(' · ');
}

/** A yield bag read into a full line, scaled by `copies`. */
function lineOf(
  id: ResourceId,
  bag: ResourceYieldBag,
  note: string | null,
  copies: number,
  scale = 1,
): ResourceYieldLine {
  const at = (key: keyof ResourceYieldBag): number =>
    Math.floor((bag[key] ?? 0) * copies * scale);
  return {
    resource: id,
    source: label(id, note, copies),
    food: at('food'),
    production: at('production'),
    gold: at('gold'),
    science: at('science'),
    culture: at('culture'),
    faith: at('faith'),
  };
}

/**
 * Every live effect this player's luxuries declare, resource-table order first
 * and row order within that, each paired with the resource it belongs to.
 *
 * The single walk. Everything below filters it by kind rather than repeating
 * the uniqueness reading, the age gate and the table order ten times — which is
 * how "one evaluator" stays true as the vocabulary grows.
 */
function liveEffects(
  state: GameState,
  playerId: number,
): { id: ResourceId; effect: ResourceEffect }[] {
  const age = ageOf(state, playerId);
  const list: { id: ResourceId; effect: ResourceEffect }[] = [];
  for (const id of controlledResources(state, playerId, 'luxury')) {
    for (const effect of resourceEffects(id)) {
      if (effectIsLive(effect, age)) list.push({ id, effect });
    }
  }
  return list;
}

// --- flat yields ------------------------------------------------------------

/**
 * Every flat yield line that lands in **this city**, in table order: the
 * owning-city shape for seams this city holds, then the wide shapes for every
 * kind the empire holds.
 *
 * One list rather than three, because it is one question — "what do this
 * empire's luxuries pay this town?" — and because `cityYields` folding one list
 * is what makes the panel's lines and the banked total the same arithmetic. The
 * `source` on each line says which shape it came from, so a player reading four
 * gems lines can see that one of them is the seam in their own hills.
 *
 * A `perPopulationYields` line is floored **per city**, exactly as a building's
 * `sciencePerPop` is: two half-coin sources must pay for two halves rather than
 * round into a free one.
 */
export function cityResourceYields(state: GameState, city: City): ResourceYieldLine[] {
  const owner = city.ownerId;
  const local = cityResources(state, city, 'luxury');
  const list: ResourceYieldLine[] = [];
  for (const { id, effect } of liveEffects(state, owner)) {
    if (effect.kind !== 'perCityYields' && effect.kind !== 'perPopulationYields') continue;
    if (!scopeAdmits(state, city, effect.scope, local, id)) continue;
    const copies = copiesFor(state, owner, id, effect);
    if (effect.kind === 'perCityYields') {
      list.push(lineOf(id, effect, scopeNote(effect.scope), copies));
      continue;
    }
    list.push(lineOf(id, effect, `per citizen ×${city.population}`, copies, city.population));
  }
  return list.filter((line) => foldOne(line) !== 0);
}

/** True when a line pays nothing at all — a rounded-away half coin, usually. */
function foldOne(line: ResourceYieldLine): number {
  return line.food + line.production + line.gold + line.science + line.culture + line.faith;
}

/**
 * The flat yields the empire's unique luxuries pay it, in table order.
 *
 * Banked once per turn per player by `collectYields` and quoted by the top
 * bar's totals — never per city, which is what "per unique kind, not per copy"
 * means when the yield has no city to belong to.
 */
export function empireResourceYields(state: GameState, playerId: number): ResourceYieldLine[] {
  const list: ResourceYieldLine[] = [];
  for (const { id, effect } of liveEffects(state, playerId)) {
    if (effect.kind !== 'empireYields') continue;
    list.push(lineOf(id, effect, 'empire', copiesFor(state, playerId, id, effect)));
  }
  return list;
}

/**
 * Every improvement some luxury pays on, resolved once at load.
 *
 * A `Set` and not a list because the only question asked of it is membership,
 * and it is asked once per tile in `boardHasAny`. Iteration order never reaches
 * an outcome — the *lines* are walked in `liveEffects`' table order, which is
 * the order that has to be stable.
 */
const IMPROVEMENTS_PAID_ON: ReadonlySet<ImprovementId> = new Set(
  RESOURCE_IDS.flatMap((id) =>
    resourceEffects(id)
      .filter((effect) => effect.kind === 'improvementYields')
      .map((effect) => effect.improvement),
  ),
);

/** Does any hex on the board carry one of these improvements? */
function boardHasAny(state: GameState, wanted: ReadonlySet<ImprovementId>): boolean {
  if (wanted.size === 0) return false;
  for (const tile of state.map.tiles) {
    const built = tile.improvement;
    if (built !== undefined && wanted.has(built)) return true;
  }
  return false;
}

/**
 * Every line this empire's luxuries put on **the ground**, as the tile chain
 * needs to read them (`TileLine`, `statecraft.ts`).
 *
 * The `improvementYields` shape resolved: tyrian's "fishing boats give +1
 * culture", whales' Æra III "fishing boats gain +1 production". A *line on a
 * hex* rather than a lump in a city, so it lands as an ordinary contribution in
 * `explainTileYield` (hard rule 5) and the hover card, the citizen's score, the
 * city panel and the banked total all learn it from one place.
 *
 * Empire-scoped, like every other signature: the seam is held once and every
 * boat the empire owns is better for it — including boats in a town nowhere
 * near the murex, which is the point of a *trade* good.
 *
 * Resolved once per context (`yieldContextFor` in `cities.ts`) rather than once
 * per tile, exactly as `cardTileLines` is, so a city sweeping twenty hexes asks
 * the resource table once.
 */
export function resourceTileLines(state: GameState, playerId: number): TileLine[] {
  const list: TileLine[] = [];
  // The cheapest possible reject, and it is the **board's** rather than the
  // empire's: no hex carries one of the improvements these effects name, so no
  // such line can land on anything, for anybody. One pass of property compares
  // with no allocation and no lookup, against `liveEffects`' walk of every owned
  // tile through `openedResource` — and a context is built once per city per
  // refresh, so this is the difference between a fifth of a turn resolution and
  // nothing at all on the boards where the sea is empty.
  if (!boardHasAny(state, IMPROVEMENTS_PAID_ON)) return list;
  for (const { id, effect } of liveEffects(state, playerId)) {
    if (effect.kind !== 'improvementYields') continue;
    const copies = copiesFor(state, playerId, id, effect);
    // Through `lineOf` so a `perCopy` improvement line scales and labels itself
    // exactly as every other bag on the table does — there is one reading of a
    // yield bag in this module and this is not a second one.
    const paid = lineOf(id, effect, improvementDef(effect.improvement).name.toLowerCase(), copies);
    const resolved: TileLine = {
      source: paid.source,
      on: { test: 'improvement', improvement: effect.improvement },
      food: paid.food,
      production: paid.production,
      gold: paid.gold,
      science: paid.science,
      culture: paid.culture,
      faith: paid.faith,
    };
    if (foldOne(paid) !== 0) list.push(resolved);
  }
  return list;
}

/** The fold of any list of resource-yield lines. The only sum of them. */
export function foldResourceYields(list: readonly ResourceYieldLine[]): {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
} {
  const total = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
  for (const line of list) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
    total.science += line.science;
    total.culture += line.culture;
    total.faith += line.faith;
  }
  return total;
}

// --- the meters -------------------------------------------------------------

/**
 * How many cities of a scope a player holds — the multiplier behind a "per
 * city" happiness or authority line.
 *
 * Walks `state.cities`, which is founding order and part of the state, so the
 * count a replay reaches is the count the original run reached.
 */
function cityCount(state: GameState, playerId: number, coastalOnly: boolean): number {
  let count = 0;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (coastalOnly && !isCoastalCity(state, city)) continue;
    count += 1;
  }
  return count;
}

/**
 * The extra happiness the empire's unique luxuries supply, in table order — on
 * *top* of the flat figure every one of them already pays.
 *
 * `explainHappiness` prints these as their own lines rather than folding them
 * into the luxury's flat line, because "Wine +4" and "Wine · vintage +2" are two
 * different facts: one is what a luxury is worth, the other is what *this*
 * luxury is worth, and a player comparing two seams needs to see them apart.
 *
 * A line with a `per` is multiplied by the cities that qualify, which is the
 * whole of "+1 happiness per city": a wide empire gets more out of one amber
 * road than a tall one, and the crowding curve is what argues back.
 */
export function resourceHappiness(state: GameState, playerId: number): ResourceHappinessLine[] {
  const list: ResourceHappinessLine[] = [];
  for (const { id, effect } of liveEffects(state, playerId)) {
    if (effect.kind !== 'extraHappiness') continue;
    const copies = copiesFor(state, playerId, id, effect);
    const towns =
      effect.per === undefined ? 1 : cityCount(state, playerId, effect.per === 'coastalCity');
    const amount = effect.amount * copies * towns;
    if (amount === 0) continue;
    const note =
      effect.per === undefined
        ? 'signature'
        : `${effect.per === 'coastalCity' ? 'coastal cities' : 'cities'} ×${towns}`;
    list.push({ resource: id, source: label(id, note, copies), amount });
  }
  return list;
}

/**
 * The authority capacity the empire's unique luxuries supply, in table order.
 *
 * Capacity, never a discount on what cities cost: a luxury widens the writ, it
 * does not make a town cheaper to hold. That keeps the two sides of the meter
 * meaning what they meant before this vocabulary existed (see `meters.ts`).
 */
export function resourceAuthority(state: GameState, playerId: number): ResourceAuthorityLine[] {
  const list: ResourceAuthorityLine[] = [];
  for (const { id, effect } of liveEffects(state, playerId)) {
    if (effect.kind !== 'authoritySupply') continue;
    const copies = copiesFor(state, playerId, id, effect);
    const towns = effect.per === 'city' ? cityCount(state, playerId, false) : 1;
    const amount = effect.amount * copies * towns;
    if (amount === 0) continue;
    const note = effect.per === 'city' ? `cities ×${towns}` : 'writ';
    list.push({ resource: id, source: label(id, note, copies), amount });
  }
  return list;
}

/**
 * The percentage points this player's luxuries add to the **positive** happiness
 * tiers, and the lines that say why.
 *
 * Amber's whole signature, and the one shape that reaches inside a meter's
 * ladder rather than beside it. It is deliberately additive and deliberately
 * one-sided: a boost applied to the malus rungs would make an unhappy empire
 * *more* punished for owning amber, which is nobody's reading of the rule.
 */
export function resourceTierBoost(state: GameState, playerId: number): {
  lines: ResourceHappinessLine[];
  points: number;
} {
  const lines: ResourceHappinessLine[] = [];
  let points = 0;
  for (const { id, effect } of liveEffects(state, playerId)) {
    if (effect.kind !== 'happinessTierBoost') continue;
    const copies = copiesFor(state, playerId, id, effect);
    const amount = effect.points * copies;
    if (amount === 0) continue;
    points += amount;
    lines.push({ resource: id, source: label(id, 'contentment', copies), amount });
  }
  return { lines, points };
}

// --- modifiers --------------------------------------------------------------

/**
 * The hammers this city's improved luxuries put behind `category`, in table
 * order — the seams it owns itself, plus every empire-scoped one.
 *
 * The resource half of `productionModifiers` (`cities.ts`), which folds these
 * together with the buildings' — one shape, `{ category, percent }`, read from
 * two tables. That generalisation is what stopped the marble being a second
 * barracks special case, and it means the panel prints "Barracks +10%" and
 * "Marble +15%" as two lines of one list.
 */
export function resourceProduction(
  state: GameState,
  city: City,
  category: ProductionCategory,
): ResourceProductionLine[] {
  const owner = city.ownerId;
  const local = cityResources(state, city, 'luxury');
  const list: ResourceProductionLine[] = [];
  for (const { id, effect } of liveEffects(state, owner)) {
    if (effect.kind !== 'productionBonus' || effect.category !== category) continue;
    if (effect.scope !== 'empire' && !local.includes(id)) continue;
    const copies = copiesFor(state, owner, id, effect);
    list.push({
      resource: id,
      source: label(id, null, copies),
      percent: effect.percent * copies,
    });
  }
  return list;
}

/**
 * The percentages this city's empire puts on its yields, in table order, each
 * carrying the stage it belongs to.
 *
 * These join the meters' percentages in `cityYieldPercents` (`cities.ts`), which
 * sums them **per stage** and applies the two sums once (Entry XVII). Additive
 * inside a stage, and that is the legibility decision the ledger already made
 * for the meters: a +10% and a −10% of the same stage have to read as nothing at
 * all, which they do not if they are multiplied one after the other. A luxury
 * that is the third source of a percentage on gold is therefore a third line in
 * one of two sums, not a third multiplication.
 *
 * Which sum is `scopeStage`'s answer, not this function's — and today it answers
 * the city stage for every row in the table, so a luxury's percentage sums with
 * the buildings' and the meters multiply what that comes to.
 */
export function resourcePercentYields(state: GameState, city: City): ResourcePercentLine[] {
  const owner = city.ownerId;
  const list: ResourcePercentLine[] = [];
  for (const { id, effect } of liveEffects(state, owner)) {
    if (effect.kind !== 'percentYields') continue;
    if (!scopeAdmits(state, city, effect.scope, cityResources(state, city, 'luxury'), id)) continue;
    const copies = copiesFor(state, owner, id, effect);
    list.push({
      resource: id,
      source: label(id, effect.scope === undefined ? null : scopeNote(effect.scope), copies),
      yield: effect.yield,
      percent: effect.percent * copies,
      stage: scopeStage(effect.scope),
    });
  }
  return list;
}

/**
 * The percentages this player's luxuries put on one named *rule* of the
 * simulation, in table order.
 *
 * Three rules use it and each has exactly one consumer: what a citizen demands
 * in happiness (`happinessDemand`), what the next border tile costs
 * (`borderCostFor`), and how much of its basket a city keeps when it grows
 * (`growthCarryover`). One shape and one evaluator rather than three fields on
 * three unrelated functions — a fourth rule is a string in the union and a line
 * in `docs/luxuries.md`.
 */
export function resourceRulePercent(
  state: GameState,
  playerId: number,
  rule: ResourceRule,
): ResourceRuleLine[] {
  const list: ResourceRuleLine[] = [];
  for (const { id, effect } of liveEffects(state, playerId)) {
    if (effect.kind !== 'rulePercent' || effect.rule !== rule) continue;
    const copies = copiesFor(state, playerId, id, effect);
    list.push({
      resource: id,
      source: label(id, null, copies),
      percent: effect.percent * copies,
    });
  }
  return list;
}

/** The fold of any list of rule percentages: summed, applied once. */
export function foldRulePercent(list: readonly ResourceRuleLine[]): number {
  let percent = 0;
  for (const line of list) percent += line.percent;
  return percent;
}

// --- words ------------------------------------------------------------------

/**
 * One tier of a resource's signature, in words, and the age it needs.
 *
 * `fromAge` is carried rather than folded into the text so that a surface can
 * *style* a locked tier — the hover greys it and appends "Æra III" — instead of
 * every surface parsing a sentence for the same fact. A tier that has arrived
 * carries `undefined`, exactly as the data row does.
 */
export interface ResourceSignatureLine {
  text: string;
  fromAge?: TechAge;
}

/**
 * A resource's signatures in words — "+3 gold in this city", "+2 culture to the
 * empire", "+10% gold in every city".
 *
 * Here rather than in the interface because it is a reading of the vocabulary,
 * and the vocabulary is read in one file. Every text surface that names a
 * resource (the hover readout, the lens roundel's tooltip, the city panel) calls
 * this, so they cannot describe the same luxury two ways — and a locked tier
 * reads the same everywhere for the same reason.
 */
export function describeResourceSignature(id: ResourceId): ResourceSignatureLine[] {
  const lines: ResourceSignatureLine[] = [];
  for (const effect of resourceEffects(id)) {
    const text = describeOne(effect);
    if (text === null) continue;
    lines.push(effect.fromAge === undefined ? { text } : { text, fromAge: effect.fromAge });
  }
  return lines;
}

/**
 * The base tier of a signature as one sentence, or `null` — the short form the
 * one-line hover readout has room for. The long form is the list above.
 */
export function describeResourceEffect(id: ResourceId): string | null {
  const lines = describeResourceSignature(id);
  if (lines.length === 0) return null;
  return lines
    .map((line) => (line.fromAge === undefined ? line.text : `${line.text} (${ageLabel(line.fromAge)})`))
    .join('; ');
}

/** One effect in words. `null` for one that says nothing worth printing. */
function describeOne(effect: ResourceEffect): string | null {
  const each = effect.perCopy ? ' per copy' : '';
  if (effect.kind === 'extraHappiness') {
    const where =
      effect.per === 'city' ? ' per city' : effect.per === 'coastalCity' ? ' per coastal city' : '';
    return `${signed(effect.amount)} happiness${where}${each}`;
  }
  if (effect.kind === 'authoritySupply') {
    return `${signed(effect.amount)} authority${effect.per === 'city' ? ' per city' : ''}${each}`;
  }
  if (effect.kind === 'happinessTierBoost') {
    return `${signed(effect.points)} percentage points on the happiness bonus${each}`;
  }
  if (effect.kind === 'productionBonus') {
    const category = effect.category === 'unit' ? 'units' : 'buildings';
    const where = effect.scope === 'empire' ? 'every city' : 'this city';
    return `${signed(effect.percent)}% production toward ${category} in ${where}${each}`;
  }
  if (effect.kind === 'percentYields') {
    return `${signed(effect.percent)}% ${effect.yield} in ${scopeWords(effect.scope)}${each}`;
  }
  if (effect.kind === 'rulePercent') {
    return `${signed(effect.percent)}% ${RULE_WORDS[effect.rule]}${each}`;
  }
  const where =
    effect.kind === 'empireYields'
      ? 'to the empire'
      : effect.kind === 'improvementYields'
        ? // The one bag that lands on ground rather than in a town, so it names
          // the ground: "…on every fishing boats" reads wrong, "on every fishing
          // boats tile" reads as the hex it actually pays.
          `on every ${improvementDef(effect.improvement).name.toLowerCase()} tile`
        : effect.kind === 'perPopulationYields'
          ? `per citizen in ${scopeWords(effect.scope)}`
          : `in ${scopeWords(effect.scope)}`;
  const parts: string[] = [];
  for (const key of RESOURCE_EFFECT_YIELDS) {
    const value = effect[key];
    if (value === undefined || value === 0) continue;
    parts.push(`${signed(value)} ${key}`);
  }
  return parts.length > 0 ? `${parts.join(', ')} ${where}${each}` : null;
}

/** How each rule reads in a sentence. Beside the union it names. */
const RULE_WORDS: Record<ResourceRule, string> = {
  happinessDemand: 'happiness demanded per citizen',
  borderCost: 'culture for the next border hex',
  growthCarryover: 'of the stored food kept when a city grows',
};

function scopeWords(scope: ResourceCityScope | undefined): string {
  if (scope === 'coastal') return 'every coastal city';
  if (scope === 'owner') return 'this city';
  return 'every city';
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
