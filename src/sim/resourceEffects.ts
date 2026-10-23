/**
 * What a resource does beyond its tile yield: the **one** evaluator for the
 * signature-effect vocabulary.
 *
 * Every luxury pays the same two things — whatever its row puts on its tile, and
 * a flat `meters.happiness.perUniqueLuxury` to whoever has it in hand. On top of
 * that each row declares a *list* of `effects` (`resourceData.ts`), and this
 * module is the only place in the game that reads one. Seventeen shapes go in;
 * labelled lists come out; nothing anywhere else switches on `effect.kind`.
 *
 * Strategic resources, and the one rule that differs (batch R2)
 * -------------------------------------------------------------
 * Since batch R2 a **strategic** row may carry the same list. It is the empire
 * bonus an empire gets for controlling at least one copy — copper's coin in
 * every city, camels' coin on every route, niter's tenth of science, ivory's
 * contentment, obsidian's point of strength, horses' quicker roads, iron's ten
 * points of health. Written in this vocabulary, read by this evaluator, and the
 * only thing that differs is the counting: a strategic bonus pays **once**
 * however many copies the empire holds (`copiesFor`), because the user's ruling
 * is that the first copy buys the bonus and every copy after it is for the army.
 *
 * The bonus reads **controlled** copies and never available ones. If it read
 * what is left after the army has taken its share, building units would switch
 * an empire's economy off, which would teach players not to build units.
 *
 * What batch H6 did, and what it did not
 * --------------------------------------
 * The audit's charge (`docs/audit/simplify.md` §2, §4.3) was that this file is a
 * *second card evaluator*: two effect unions, two scope unions, two rule unions,
 * six identically-named private helpers, and five `kind` names living in both
 * vocabularies with two implementations behind them. That was true, and the part
 * of it that was **one idea in two dialects** is gone:
 *
 *   · the **yield bag** is `CardYieldBag` — the two were byte-identical;
 *   · the **rule** union is `Extract<CardRule, …>`, so the constraint
 *     `resourceData.ts` had documented in prose ("a word this table knew and the
 *     cards did not would fail to compile") is now the type;
 *   · the **scope** union is `CityScope` plus one word, and `scopeAdmits` and
 *     `scopeWords` delegate to `cityScopeAdmits` and `cityScopeWords` — three of
 *     the four scopes were the cards' predicates written a second time;
 *   · empire `pays`, `happinessTierBoost` and the shape that was called
 *     `authoritySupply` **are** `CardPaysEffect`,
 *     `CardHappinessTierBoostEffect` and `CardAuthorityEffect`;
 *   · the colliding private names are one each: the walk is
 *     `liveResourceEffects`, the label is `lineLabel`, the town count is
 *     `citiesOf` (`state.ts`), and `signed` was already one.
 *
 * What is **not** done, deliberately and with the reason written where the next
 * reader will look for it: a luxury is not a *card class*. Folding it into
 * `liveEffects` means widening `CardId` to hold a `ResourceId`, an eleventh arm
 * in `anyCardDef`, a Compendium entry and a keyword ref per row, and rerouting
 * fourteen folds whose flooring is not the card arms' flooring — `resourceRenown`
 * and `resourceHappiness` floor per line where their card twins floor per fold.
 * That is a milestone with its own gate, not an evaluator swap, and H6's gate is
 * byte-identity. What this file keeps is the half that is genuinely its own and
 * is not a card fact at all: **which luxuries an empire controls, and how many
 * copies each one counts for**.
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
 *     an `authority` with a `per`) counts once per kind for the empire and
 *     then lands in **every** city it owns — or every coastal one. This is the
 *     shape the ratified table is mostly built out of, and it is deliberately
 *     empire-scaling: a wide empire earns more from one seam of gems than a tall
 *     one does, and happiness and authority are the taxes that price that.
 *   · **empire** (empire `pays`, a bare `extraHappiness`) counts once per kind
 *     for the whole empire and lands nowhere in particular. A second silk seam
 *     anywhere is worth nothing.
 *
 * `perCopy` is the one exception, and it is marked wherever it appears: silver
 * and gold scale their Æra III tier by how many *tiles* the player controls,
 * which is the exact opposite of what every other row says and is therefore the
 * thing a reader will be certain is a bug unless it is written down.
 *
 * Every function below returns the *list*, and every consumer folds it into a
 * breakdown it already had: `foldCity` and the city panel for the flat yields
 * and the percentages, `productionModifiers` for the hammers, `explainHappiness`
 * and `explainAuthority` for the meters, `explainRouteYieldBetween` for a
 * caravan's coin, `explainUnitUpkeepRebate` for what a payroll gives back, and
 * `explainEmpireGold` for the share a rule takes of the roads' own line. Totals
 * are folds of lists, which is CLAUDE.md's rule 5 read one scale out from a tile.
 *
 * The three folds outside a city (2026-09-02)
 * -------------------------------------------
 * The nerf round put three luxury lines somewhere other than a town's ledger,
 * and each one joins a list that already existed rather than opening a fold:
 *
 *   · **`resourceRouteYields`** → `explainRouteYieldBetween` (`routeYields.ts`),
 *     one line per route, printed on the destination's sheet;
 *   · **`resourceUpkeepRebateLines`** → `explainUnitUpkeepRebate` (`upkeep.ts`),
 *     beside a card's rebate, clamped by the caller against the same payroll;
 *   · **`resourceConnectionPercent`** → `explainEmpireGold` (`empireGold.ts`), a
 *     share of the connections line, summed and floored once there.
 *
 * All three of those modules already read `statecraft.ts`, which already reads
 * `cities.ts`, so importing this file adds no *shape* of cycle any of them did
 * not have — and nothing here is called at their top level.
 *
 * The import cycle with `cities.ts`, and why it is safe
 * ----------------------------------------------------
 * The same cycle `meters.ts` documents, for the same reason and with the same
 * guarantee. This module asks `cities.ts` which resources a city and an empire
 * actually control — one rule, `openedResource`, and duplicating it here is
 * exactly what rule 5 forbids — and `cities.ts` asks this module for the lines
 * to fold into `foldCity`. It is a *function-level* cycle only: everything at
 * the top level here is a type or a constant from the data tables, and nothing
 * in this file may grow a top-level call into `cities.ts`.
 */

import { type ProductionCategory, buildingDef } from './buildingData';
import { signedPlain as signed } from './yieldFormat';
import type { ModifierStage } from './yields/stages';
import {
  cityResources,
  controlledResources,
  isCoastalCity,
  lentCopyPercent,
  resourceCopies,
} from './cities';
// Commerce batch T5, The Commenda: the copies lent away, read from the deal
// register, a leaf.
import { lentCopiesAwayBy } from './deals';
import { RULES } from './rulesData';
import { economyStamp, slateMemo } from './slate';
// The three route readings this module needs to answer "what is a caravan of
// mine carrying home" — a leaf (`routes.ts`) below both this file and
// `routeYields.ts`, which is where the pair resolution has always lived.
import { cityPostPays, routeCities, routeIsInternational, routeIsLive } from './routes';
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
import {
  type CombatSituation,
  type TileLine,
  cardAmplifier,
  cardYieldsOnlyAmplifier,
  cardBehaviorRule,
  cityScopeAdmits,
  cityScopeWords,
  combatLineAmount,
  combatWhenWords,
  filterWords,
} from './statecraft';
// Expansionist batch E12: what a town holds, a card's grants included.
import { townBuildings } from './statecraft/evaluator';
import { type City, type GameState, type Unit, citiesOf, playerById } from './state';
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

/**
 * One line of renown a turn a luxury supplies — lapis lazuli's Æra III.
 *
 * `ResourceAuthorityLine`'s shape one bucket over, and deliberately not
 * `RenownLine`: this module may not import `renown.ts`, so it hands back its own
 * lines and the bucket's own ledger adapts them (`explainRenown`) — the same
 * bargain `resourceRouteYields` keeps with `routeYields.ts`. The **family** is
 * not on the line at all, because a stone has none: see `renownPerCity`.
 */
export interface ResourceRenownLine {
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
 *
 * **And the whole of the borrowed copy** (The Silk Road, the user's tree pass of
 * 2026-09-10): a luxury a foreign road lends this empire counts
 * `rules.trade.importedLuxuryPercent` of a time — half — and because every
 * reading in this file arrives at its figure by multiplying this number, *every*
 * effect of a borrowed luxury is halved by one multiplication rather than by
 * fourteen. That is why the share is here and not in a fold: a rule written as
 * "and also halve the renown, and the writ, and the hammers" is a rule that
 * stops being true the day a fifteenth fold is added.
 *
 * A borrowed copy is **exactly half of one**, with `perCopy` and the Grand
 * Bazaar's duplicates both skipped: the empire owns no tile of it (so the copy
 * count is nought and a `perCopy` row would pay nothing at all, which is a
 * different sentence from "half"), and a caravan's loan is not a second copy of
 * a seam somebody dug.
 */
function copiesFor(
  state: GameState,
  playerId: number,
  id: ResourceId,
  effect: ResourceEffect,
  loan: LuxuryLoanMark = null,
  /**
   * **The copies behind a flat yield line** (Commerce batch T5, The Casa da
   * Índia): true where the caller is folding food, production, gold,
   * science, culture or faith, so an amplifier narrowed to a luxury's yields
   * (`cardYieldsOnlyAmplifier`) joins the duplicates' share. Every other
   * reading leaves it false and counts the kind once.
   */
  yields = false,
): number {
  if (loan === 'borrowed') return IMPORTED_SHARE;
  // **A kind held only through copies lent away** (Commerce batch T5, The
  // Commenda; the triage's reading 2): held at the card's share of one copy,
  // as a borrowed copy is held at the loan's share. A per-copy row pays the
  // share for each lent copy, which is "half for each lent copy" read on
  // silver and gold.
  if (loan === 'lent') {
    const share = lentCopyPercent(state, playerId) / 100;
    if (effect.perCopy) return (lentCopiesAwayBy(state, playerId)[id] ?? 0) * share;
    return share;
  }
  if (effect.perCopy) return heldCopies(state, playerId, id);
  // **A strategic resource's bonus pays once** — the user's ruling of
  // 2026-09-18: *"players gain this bonus for having at least one copy, only
  // applies once regardless of number of copies."* So the two clauses below,
  // which are both ways of counting a luxury more than once, are asked only of a
  // luxury. A strategic row that wrote `perCopy` would still scale, because that
  // is the row saying so out loud; nothing else may scale it behind its back.
  if (resourceDef(id).kind !== 'luxury') return 1;
  // The Grand Bazaar's second clause, and the one place a card reaches into this
  // vocabulary: "additional copies of a luxury count at 30%". The uniqueness rule
  // above is unchanged — one kind counts once — and this adds a *fraction* of
  // each further copy on top of it, so an empire with no such card multiplies by
  // exactly 1 and every figure in this file is what it always was.
  //
  // Not floored here: the callers floor their own products (`lineOf`, and the
  // meters' own arithmetic), which is what keeps "two half-coin sources pay for
  // two halves" true one level down.
  //
  // The Casa da Índia's share joins only on a flat yield line (`yields`), so
  // its happiness, authority, renown and percentages still count once a kind
  // (Commerce batch T5, the triage's reading 23).
  const duplicates =
    cardAmplifier(state, playerId, 'luxuryDuplicates') +
    (yields ? cardYieldsOnlyAmplifier(state, playerId, 'luxuryDuplicates') : 0);
  if (duplicates === 0) return 1;
  const extra = Math.max(0, heldCopies(state, playerId, id) - 1);
  return 1 + (extra * duplicates) / 100;
}

/**
 * **The copies of a kind this empire holds, for a line that scales with
 * copies**: the net figure (`resourceCopies`), plus The Commenda's share of
 * each copy lent away, exact rather than rounded (Commerce batch T5, the
 * triage's reading 2), because a yield line is exact and the folds floor
 * where they always have. A seat with no such card reads `resourceCopies`
 * exactly. The card counts round the share down instead
 * (`countedLuxuryCopies`, `cities.ts`).
 */
function heldCopies(state: GameState, playerId: number, id: ResourceId): number {
  const net = resourceCopies(state, playerId, id);
  if (resourceDef(id).kind !== 'luxury') return net;
  const percent = lentCopyPercent(state, playerId);
  if (percent === 0) return net;
  return net + ((lentCopiesAwayBy(state, playerId)[id] ?? 0) * percent) / 100;
}

/**
 * **How a luxury reached this empire's hands, when it is not a seam it
 * keeps**: `'borrowed'` for a kind a road or a post lends it (The Silk Road,
 * The Capitulations), `'lent'` for a kind it now holds only through copies it
 * lent away (The Commenda, Commerce batch T5), `null` for everything it holds
 * itself. The mark is all a fold below needs: `copiesFor` turns it into the
 * share and `lineLabel` into the word.
 */
type LuxuryLoanMark = 'borrowed' | 'lent' | null;

/**
 * Does a scoped effect land in this city? Absent scope means every city.
 *
 * **One word of its own, and then the cards'** (batch H6). A luxury's scope used
 * to be a four-word union — `all`, `coastal`, `owner`, `capital` — and three of
 * those four were `CityScope` said in a second dialect: `coastal` and `capital`
 * are `{ test: 'coastal' }` and `{ test: 'capital' }` down to the same two
 * predicates (`isCoastalCity`, `capitalCityOf`), and `all` is what an absent
 * scope has always meant on both tables. So the four became `CityScope` plus one
 * word, and this function became a delegation plus one clause.
 *
 * The word that stays is **`'owner'`** — the town that actually holds the seam —
 * and it stays because it is the one reading `CityScope` cannot state without
 * the row naming itself. `{ test: 'holding', resources: ['jade'] }` on the jade
 * row *is* that scope, spelled out; a shorthand that means "this row's own
 * resource" is worth one word to a table where every effect already belongs to a
 * named seam. Nothing else in the four-word union survived, and nothing needed
 * to.
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
  if (scope === 'owner') return local.includes(id);
  return cityScopeAdmits(state, city, scope);
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

/**
 * What a scoped line says about where it landed — the **label**, not the rule.
 *
 * A breakdown line has room for two or three words where a card's printed clause
 * has room for a sentence, so this stays the luxury table's own and is not
 * `cityScopeWords`: "Gems · every city" is a line in a ledger and "+2 gold in
 * every city" is a rule on a hover, and the two want different lengths of the
 * same fact. The rule's words *are* the cards' (`describeOne` below).
 */
function scopeNote(scope: ResourceCityScope | undefined): string {
  if (scope === 'owner') return 'this city';
  if (scope === undefined) return 'every city';
  if (scope.test === 'coastal') return 'coastal city';
  if (scope.test === 'capital') return 'capital';
  return cityScopeWords(scope);
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
function lineLabel(
  id: ResourceId,
  note: string | null,
  copies: number,
  loan: LuxuryLoanMark = null,
): string {
  const name = resourceDef(id).name;
  const parts = [name];
  if (note) parts.push(note);
  // **A borrowed copy says so, and never says a fraction.** The share is the
  // rule and the ledger's business is *why* the figure is what it is — "Wine ·
  // ×0.5 copies" is arithmetic showing its working, and "Wine · on loan" is the
  // sentence a player can act on (cut the road and it goes).
  if (loan === 'borrowed') parts.push('on loan');
  // A kind kept only through copies lent away (The Commenda) says so in the
  // same way: the word a player can act on, never the fraction.
  else if (loan === 'lent') parts.push('lent out');
  else if (copies !== 1) parts.push(`×${copies} copies`);
  return parts.join(' · ');
}

/** A yield bag read into a full line, scaled by `copies`. */
function lineOf(
  id: ResourceId,
  bag: ResourceYieldBag,
  note: string | null,
  copies: number,
  scale = 1,
  loan: LuxuryLoanMark = null,
): ResourceYieldLine {
  // Exact since batch X: a half-point signature on one copy pays half a point.
  const at = (key: keyof ResourceYieldBag): number => (bag[key] ?? 0) * copies * scale;
  return {
    resource: id,
    source: lineLabel(id, note, copies, loan),
    food: at('food'),
    production: at('production'),
    gold: at('gold'),
    science: at('science'),
    culture: at('culture'),
    faith: at('faith'),
  };
}

/**
 * **What a borrowed copy of a luxury is worth**, as a multiplier — the user's
 * own figure for `docs/playstyles.md` §7's rule ("effects halved", 2026-09-10).
 *
 * Read once, at load, off `rules.trade.importedLuxuryPercent`, because it is a
 * balance figure and balance figures live in the data (CLAUDE.md's layout rule).
 * Exact rather than floored, `lineOf`'s bargain exactly: a half of one point is
 * half a point, and the folds floor where they have always floored.
 */
const IMPORTED_SHARE = Math.max(0, RULES.trade.importedLuxuryPercent) / 100;

/**
 * **The luxuries this empire's foreign roads lend it**, in the resource table's
 * own order — The Silk Road's clause (`BehaviorRuleId`'s `routesImportLuxuries`).
 * Since Commerce batch T5 the foreign towns holding its paying post lend too,
 * after the roads (The Capitulations, `postsLendLuxuries`). The walk is
 * `luxuryLoans`, which keeps which loan is a road's and which a post's.
 *
 * One kind per live international route, never a kind the empire already
 * controls and never the same kind twice, read off the **destination's** own
 * improved holdings (`cityResources`, the one-per-town rule every other reading
 * of "what does this town hold" asks). Derived every time it is asked, so it
 * lapses the instant a route does — there is nothing written down anywhere and
 * therefore nothing to keep in step.
 *
 * The routes are walked in `state.units` order and each takes the first kind the
 * ones before it left, which is the contention rule the whole game uses (sweep
 * order decides) and the only one a replay reproduces. The **table's** order is
 * what comes back, so two empires holding the same loans read them the same way
 * round in every ledger.
 *
 * Remembered on the **revision** clock rather than the economy one: a route is a
 * fact about a *piece* — where a caravan is standing and what it is carrying —
 * and the economy half is the ground and nothing but (see "The two clocks" in
 * `slate.ts`).
 *
 * **And on the economy stamp inside it** (batch R1). The revision is raised
 * *after* a handler and *after* a phase, and this reading is asked from **inside**
 * both — `resourceTileLines` → `yieldContextFor` → `chooseCitizens`, which is
 * to say every time `refreshCityDerived` re-seats a town. So the revision alone
 * cannot see a bargain signed or lapsed, a road cut or a seam improved halfway
 * through the call that is about to read it; the shadow run found this list
 * holding a luxury a deal had already taken back (turn 97 of a bot game,
 * `["dyes","sugar"]` against a fresh `["dyes"]`). Every one of those writes
 * announces `bumpEconomy` on the line it happens (batch M3, and
 * `test/sim/slateRegister.test.ts` is what holds it true), so putting the stamp
 * **in the key** makes a moved world a miss rather than a wrong answer.
 *
 * In the key rather than in the clock, deliberately: it keeps the entry's
 * lifetime the revision's — which is the honest one, since a caravan's step
 * moves only that counter at the command's own scale — and adds the second
 * question without asking `slate.ts` for a third clock, which its own docblock
 * says is a batch. The cost is a few dead entries inside one revision, thrown
 * away whole the moment it moves.
 */
export function importedLuxuries(state: GameState, playerId: number): ResourceId[] {
  const key = loansKey(state, playerId);
  if (key === null) return [];
  return slateMemo(state, 'revision', 'importedLuxuries', key, () => {
    const lent = luxuryLoans(state, playerId);
    return RESOURCE_IDS.filter((id) => lent.some((loan) => loan.id === id));
  });
}

/** One kind lent to this empire, and what lends it: a road or a post. */
export interface LuxuryLoan {
  id: ResourceId;
  via: 'route' | 'post';
}

/**
 * The memo key for the loans walk, or `null` when this seat holds neither
 * rule and so borrows nothing. The two rules are in the key because a card
 * may be seated between two reads of one revision.
 */
function loansKey(state: GameState, playerId: number): string | null {
  const routes = cardBehaviorRule(state, playerId, 'routesImportLuxuries');
  const posts = cardBehaviorRule(state, playerId, 'postsLendLuxuries');
  if (!routes && !posts) return null;
  return `${playerId}:${economyStamp(state)}:${routes ? 'r' : ''}${posts ? 'p' : ''}`;
}

/**
 * **Every kind this empire borrows, in the order the walk claims them, with
 * what lends each**: `importedLuxuries`' list before it is put in table order.
 *
 * One walk, two halves, and a kind is claimed once:
 *
 *   · **the routes first** (The Silk Road, `routesImportLuxuries`): each live
 *     international route of this empire, in `state.units` order, takes the
 *     first kind its destination has opened;
 *   · **then the posts** (The Capitulations, `postsLendLuxuries`, Commerce
 *     batch T5; the triage's reading 22): each foreign town where this
 *     empire's post pays (`cityPostPays`), in `state.cities` order, takes the
 *     first kind it has opened.
 *
 * Never a kind the empire controls and never a kind another loan has claimed.
 * The route half is the Trade screen's `runningRouteImports` exactly, which
 * `test/ui/tradeImports.test.ts` pins: the posts come after, so they never
 * move what a road carries.
 */
export function luxuryLoans(state: GameState, playerId: number): readonly LuxuryLoan[] {
  const key = loansKey(state, playerId);
  if (key === null) return [];
  return slateMemo(state, 'revision', 'luxuryLoans', key, () => {
    const routes = cardBehaviorRule(state, playerId, 'routesImportLuxuries');
    const posts = cardBehaviorRule(state, playerId, 'postsLendLuxuries');
    const held = new Set<ResourceId>(controlledResources(state, playerId, 'luxury'));
    const claimed = new Set<ResourceId>();
    const list: LuxuryLoan[] = [];
    const claim = (town: City, via: LuxuryLoan['via']): void => {
      for (const id of cityResources(state, town, 'luxury')) {
        if (held.has(id) || claimed.has(id)) continue;
        claimed.add(id);
        list.push({ id, via });
        // **One luxury per route or post**: a caravan carries a cargo, not a
        // manifest, and a house abroad sends one good home.
        return;
      }
    };
    if (routes) {
      for (const unit of state.units) {
        if (unit.ownerId !== playerId || unit.trade === undefined) continue;
        if (!routeIsLive(state, unit)) continue;
        const pair = routeCities(state, unit);
        if (!pair || !routeIsInternational(pair.from, pair.to)) continue;
        claim(pair.to, 'route');
      }
    }
    if (posts) {
      for (const town of state.cities) {
        if (town.ownerId === playerId) continue;
        if (!cityPostPays(state, town, playerId)) continue;
        claim(town, 'post');
      }
    }
    return list;
  });
}

/**
 * **The kinds this empire now holds only through copies it lent away**, in
 * the resource table's order (Commerce batch T5, The Commenda; the triage's
 * reading 2). Each is held at the card's share of one copy (`copiesFor`),
 * as a borrowed copy is held at the loan's share, and the happiness meter
 * pays it at the same share (`meters.ts`).
 *
 * A kind the empire still controls is not here: it pays as it always did,
 * and only a per-copy line adds the share of each lent copy. A kind a road or
 * a post already lends it (`importedLuxuries`) is not here either, so a kind
 * is never held at a share twice. Empty for a seat with no such card.
 *
 * Read outside every memo, as Strategic Exports' share is: a card seated
 * mid-turn does not move the economy clock. The deal register is short, so
 * the walk is cheap.
 */
export function lentLuxuriesKept(state: GameState, playerId: number): ResourceId[] {
  if (lentCopyPercent(state, playerId) === 0) return [];
  const lent = lentCopiesAwayBy(state, playerId);
  const held = controlledResources(state, playerId, 'luxury');
  const borrowed = importedLuxuries(state, playerId);
  return RESOURCE_IDS.filter(
    (id) =>
      (lent[id] ?? 0) > 0 &&
      resourceDef(id).kind === 'luxury' &&
      !held.includes(id) &&
      !borrowed.includes(id),
  );
}

/**
 * Every live effect this player's resources declare, resource-table order first
 * and row order within that, each paired with the resource it belongs to.
 *
 * The single walk. Everything below filters it by kind rather than repeating
 * the uniqueness reading, the age gate and the table order ten times — which is
 * how "one evaluator" stays true as the vocabulary grows.
 *
 * **Two kinds since batch R2**: the luxuries first, then the strategic
 * resources. A strategic row carries the empire-wide bonus its owner gets for
 * controlling at least one copy (copper's coin a city, niter's science, iron's
 * ten points of health), written in this same vocabulary and read here rather
 * than in a second evaluator. The two kinds are walked in separate passes rather
 * than interleaved because `controlledResources` answers one kind at a time and
 * is remembered per kind; each pass is in table order, so the whole list is
 * stable and a replay reaches it the same way round.
 *
 * What differs between the two is only the **counting rule**, and it lives in
 * `copiesFor`: a luxury may be amplified by a card and may scale with copies, a
 * strategic bonus pays once however many copies are held.
 *
 * **The borrowed copies come last and carry a mark** (The Silk Road). They are
 * appended rather than merged into the first list because they are a different
 * fact about the empire — a seam it dug against a road it is running — and
 * because `importedLuxuries` has already excluded every kind the first list
 * holds, so the two never name the same luxury and no reading has to break a
 * tie. The mark is the *only* thing every fold below has to know about them:
 * `copiesFor` turns it into the share, and the share is what halves the
 * fourteen figures a luxury can pay.
 */
function liveResourceEffects(
  state: GameState,
  playerId: number,
): { id: ResourceId; effect: ResourceEffect; loan: LuxuryLoanMark }[] {
  const age = ageOf(state, playerId);
  const list: { id: ResourceId; effect: ResourceEffect; loan: LuxuryLoanMark }[] = [];
  for (const id of controlledResources(state, playerId, 'luxury')) {
    for (const effect of resourceEffects(id)) {
      if (effectIsLive(effect, age)) list.push({ id, effect, loan: null });
    }
  }
  for (const id of controlledResources(state, playerId, 'strategic')) {
    for (const effect of resourceEffects(id)) {
      if (effectIsLive(effect, age)) list.push({ id, effect, loan: null });
    }
  }
  for (const id of importedLuxuries(state, playerId)) {
    for (const effect of resourceEffects(id)) {
      if (effectIsLive(effect, age)) list.push({ id, effect, loan: 'borrowed' });
    }
  }
  // **The kinds kept only through copies lent away** (Commerce batch T5, The
  // Commenda), last, with their own mark. `lentLuxuriesKept` leaves out every
  // kind the two lists above already name, so no reading breaks a tie.
  for (const id of lentLuxuriesKept(state, playerId)) {
    for (const effect of resourceEffects(id)) {
      if (effectIsLive(effect, age)) list.push({ id, effect, loan: 'lent' });
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
 * empire's luxuries pay this town?" — and because `foldCity` folding one list
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
  for (const { id, effect, loan } of liveResourceEffects(state, owner)) {
    if (effect.kind === 'buildingCategoryYields') {
      // **Paid where the building stands.** The shape's whole reading: a
      // workshop is what earns the line, so the town that raised the workshop is
      // the town the faith lands in. It carries no scope for that reason — the
      // buildings *are* the scope — and a town with none of them is not in the
      // list at all, which is `foldOne`'s filter below doing its usual job.
      const held = matchingBuildings(state, city, effect);
      if (held === 0) continue;
      const copies = copiesFor(state, owner, id, effect, loan, true);
      list.push(lineOf(id, effect, `${selectorNote(effect)} ×${held}`, copies, held, loan));
      continue;
    }
    if (effect.kind !== 'perCityYields' && effect.kind !== 'perPopulationYields') continue;
    if (!scopeAdmits(state, city, effect.scope, local, id)) continue;
    const copies = copiesFor(state, owner, id, effect, loan, true);
    if (effect.kind === 'perCityYields') {
      list.push(lineOf(id, effect, scopeNote(effect.scope), copies, 1, loan));
      continue;
    }
    list.push(lineOf(id, effect, `per citizen ×${city.population}`, copies, city.population, loan));
  }
  return list.filter((line) => foldOne(line) !== 0);
}

/** The selector a `buildingCategoryYields` names, in one word for a label. */
function selectorNote(effect: BuildingCategoryEffect): string {
  return effect.wonders === true ? 'wonders' : `${effect.category} buildings`;
}

/** The `buildingCategoryYields` member of the union, narrowed once and named. */
type BuildingCategoryEffect = Extract<ResourceEffect, { kind: 'buildingCategoryYields' }>;

/**
 * How many of this city's buildings the selector reaches.
 *
 * **A wonder is a building of its own category too**, which is the reading
 * `routeYields.ts` already states one ledger over ("the Colossus is a gold
 * building to a caravan and a `wonder` to a production bonus, and both readings
 * are true at once"). So a `category: 'production'` row counts a production
 * wonder, and `wonders: true` counts every wonder whatever shelf it is on —
 * two selectors that deliberately overlap rather than partition.
 */
function matchingBuildings(state: GameState, city: City, effect: BuildingCategoryEffect): number {
  let count = 0;
  // What the town holds (`townBuildings`, Expansionist batch E12).
  for (const id of townBuildings(state, city)) {
    const def = buildingDef(id);
    if (effect.wonders === true ? def.wonder === true : def.category === effect.category) {
      count += 1;
    }
  }
  return count;
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
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'pays') continue;
    list.push(lineOf(id, effect, 'empire', copiesFor(state, playerId, id, effect, loan, true), 1, loan));
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
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'improvementYields') continue;
    const copies = copiesFor(state, playerId, id, effect, loan, true);
    // Through `lineOf` so a `perCopy` improvement line scales and labels itself
    // exactly as every other bag on the table does — there is one reading of a
    // yield bag in this module and this is not a second one.
    const paid = lineOf(id, effect, improvementDef(effect.improvement).name.toLowerCase(), copies, 1, loan);
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

/**
 * Is there any *live* effect of this kind on the table at all, for an empire
 * standing where this one stands?
 *
 * The **cheap reject**, and it reads the table rather than the board — forty
 * rows and their handful of effects, with no map sweep and no allocation —
 * because the two folds below are asked once per caravan and once per turn from
 * modules that have no reason to pay `controlledResources`' walk of every owned
 * hex to be told an empire in Æra I holds nothing that could matter. It reads
 * the live `RESOURCE_IDS` binding rather than a load-time snapshot, so a row
 * installed by `withExtraResources` is seen.
 *
 * It is a *reject* only: a true answer says nothing about what this empire
 * actually holds, and the real reading below is `liveEffects`' as always.
 */
function tableHasLive(state: GameState, playerId: number, kind: ResourceEffect['kind']): boolean {
  const age = ageOf(state, playerId);
  for (const id of RESOURCE_IDS) {
    for (const effect of resourceEffects(id)) {
      if (effect.kind === kind && effectIsLive(effect, age)) return true;
    }
  }
  return false;
}

/** One line of what a luxury pays **each of an empire's trade routes**. */
export interface ResourceRouteLine {
  resource: ResourceId;
  source: string;
  food: number;
  production: number;
  gold: number;
}

/**
 * **How many distinct luxuries the two ends of one road hold between them**, for
 * The Golden Roads' coin-per-good (`CardRouteYieldEffect.perEndpointLuxury`).
 *
 * It lives here rather than in `routeYields.ts` for that module's stated leaf
 * rule: nothing there imports `cities.ts` directly, and this file already does,
 * so the caravan reaches the city scale *through* one hop exactly as it reaches
 * the luxury evaluator below.
 *
 * The **union**, once each, and that is the ruled reading of *"a luxury in the
 * origin or destination city"*: wine at both ends of a road is one wine. Each
 * town's own list is `cityResources`' one-per-town rule, so a plantation
 * pillaged this turn stops paying the caravan and the signature together.
 */
export function endpointLuxuryCount(state: GameState, from: City, to: City): number {
  const held = new Set<ResourceId>(cityResources(state, from, 'luxury'));
  for (const id of cityResources(state, to, 'luxury')) held.add(id);
  return held.size;
}

/**
 * What this empire's luxuries add to **every route it is running** — furs' Æra
 * III coin a caravan, in table order.
 *
 * `improvementYields`' sibling at the other end of the road: that one pays a
 * *hex* an empire has improved, this one pays a *route* an empire has sent, and
 * both land as ordinary lines in a list somebody else already folds rather than
 * as a lump anywhere. The fold here is `explainRouteYieldBetween`
 * (`routeYields.ts`), which prints them on the destination's sheet beside the
 * origin's buildings and the two towns' people.
 *
 * Per route and not per caravan-mile: a second furs seam is worth nothing (the
 * uniqueness rule), and a second *route* is worth another coin, which is the
 * whole reason it is a line on the route rather than a flat on the empire.
 *
 * The **origin's owner** is who is asked — the seat that sent the caravan, the
 * same seat `cardAmplifier` asks about one line up.
 */
export function resourceRouteYields(state: GameState, playerId: number): ResourceRouteLine[] {
  const list: ResourceRouteLine[] = [];
  if (!tableHasLive(state, playerId, 'routeYields')) return list;
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'routeYields') continue;
    const paid = lineOf(id, effect, 'trade route', copiesFor(state, playerId, id, effect, loan, true), 1, loan);
    if (paid.food === 0 && paid.production === 0 && paid.gold === 0) continue;
    list.push({
      resource: id,
      source: paid.source,
      food: paid.food,
      production: paid.production,
      gold: paid.gold,
    });
  }
  return list;
}

/** One line of what a luxury takes off this empire's army payroll. */
export interface ResourceUpkeepLine {
  resource: ResourceId;
  source: string;
  /** Gold taken off the bill this turn. Always positive. */
  gold: number;
}

/**
 * What this empire's luxuries take off its **unit maintenance**, piece by piece
 * — salt's Æra III shilling a soldier, in table order.
 *
 * `cardUpkeepRebateLines`' twin (`statecraft.ts`), down to the handed-in
 * `costOf`, and that is not a coincidence: there is **one** give-back list on
 * the payroll (`explainUnitUpkeepRebate`, `upkeep.ts`) and this joins it beside
 * the cards' lines rather than opening a second subtraction under the total.
 * `costOf` is a parameter for the same reason it is there — `upkeep.ts` reads
 * this module, so the arrow points one way and a `unitUpkeepOf` import here
 * would close a cycle. What this side owns is the luxury reading; what the
 * caller owns is the price, and the caller's clamp against the gross payroll is
 * what stops any pile of rebates minting coin.
 *
 * Floored **per piece** (`Math.min(off, cost)`): a rebate cannot make a warrior
 * cheaper than free, and it cannot make a settler cheaper than the nothing a
 * settler already costs — `costOf` answers zero for every exemption and this
 * skips those, so the shilling is only ever taken off a soldier who is being
 * charged for.
 */
export function resourceUpkeepRebateLines(
  state: GameState,
  playerId: number,
  costOf: (unit: Unit) => number,
): ResourceUpkeepLine[] {
  const list: ResourceUpkeepLine[] = [];
  if (!tableHasLive(state, playerId, 'unitUpkeepRebate')) return list;
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'unitUpkeepRebate') continue;
    const off = effect.amount * copiesFor(state, playerId, id, effect, loan);
    if (off <= 0) continue;
    let gold = 0;
    for (const unit of state.units) {
      if (unit.ownerId !== playerId) continue;
      const cost = costOf(unit);
      if (cost <= 0) continue;
      gold += Math.min(off, cost);
    }
    gold = Math.floor(gold);
    if (gold <= 0) continue;
    list.push({ resource: id, source: lineLabel(id, 'each soldier', 1, loan), gold });
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
 * The walk is `citiesOf` (`state.ts`) since batch H6: this was the **fifth**
 * copy of "the towns this empire holds" in `src/sim/` — `beads.ts`,
 * `triumphs.ts` and `statecraft.ts` each kept one, and two of those fed counts
 * two evaluators both had to answer. Founding order and part of the state
 * either way, so the count a replay reaches is the count the original run
 * reached; what is gone is four chances for one of them to drift.
 */
function cityCount(state: GameState, playerId: number, coastalOnly: boolean): number {
  const held = citiesOf(state, playerId);
  if (!coastalOnly) return held.length;
  let count = 0;
  for (const city of held) {
    if (isCoastalCity(state, city)) count += 1;
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
 * road than a tall one, and the writ a wide empire spends is what argues back.
 */
export function resourceHappiness(state: GameState, playerId: number): ResourceHappinessLine[] {
  const list: ResourceHappinessLine[] = [];
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    // **A building's contentment is the empire's**, not the town's — happiness
    // is an empire meter and there is no city-scale reading of it to land in
    // (`meters.ts`). So the same selector that pays faith into one workshop's
    // town pays its happiness into one number, counted over every town: jade's
    // Æra III is one line saying how many workshops earned it.
    if (effect.kind === 'buildingCategoryYields') {
      const amount = effect.happiness ?? 0;
      if (amount === 0) continue;
      const copies = copiesFor(state, playerId, id, effect, loan);
      let held = 0;
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        held += matchingBuildings(state, city, effect);
      }
      const total = Math.floor(amount * copies * held);
      if (total === 0) continue;
      list.push({
        resource: id,
        source: lineLabel(id, `${selectorNote(effect)} ×${held}`, copies, loan),
        amount: total,
      });
      continue;
    }
    if (effect.kind !== 'extraHappiness') continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    const towns =
      effect.per === undefined ? 1 : cityCount(state, playerId, effect.per === 'coastalCity');
    const amount = effect.amount * copies * towns;
    if (amount === 0) continue;
    const note =
      effect.per === undefined
        ? 'signature'
        : `${effect.per === 'coastalCity' ? 'coastal cities' : 'cities'} ×${towns}`;
    list.push({ resource: id, source: lineLabel(id, note, copies, loan), amount });
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
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'authority') continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    const towns = effect.per === 'city' ? cityCount(state, playerId, false) : 1;
    const amount = effect.amount * copies * towns;
    if (amount === 0) continue;
    const note = effect.per === 'city' ? `cities ×${towns}` : 'authority';
    list.push({ resource: id, source: lineLabel(id, note, copies, loan), amount });
  }
  return list;
}

/**
 * The renown this empire's luxuries pay **every turn**, in table order.
 *
 * `resourceAuthority`'s shape one bucket over, and one rule of its own: the
 * lines name **no family**, so the pool grows and `Player.renownByFamily` does
 * not. That is the user's ruling of 2026-09-03 read exactly (*"just add renown
 * that doesn't factor into the calculation"*) — the feed record is the only
 * thing weighting `drawGreatPersonOffer`, so a stone that fed one would be a
 * luxury quietly deciding which great people an empire is shown. It pays for the
 * ladder and argues with nobody about who climbs it.
 *
 * A count of cities rather than a payment *in* each city, for `resourceHappiness`'
 * reason: renown is an empire's, like happiness, and there is no city-scale
 * reading of it to land in.
 */
export function resourceRenown(state: GameState, playerId: number): ResourceRenownLine[] {
  const list: ResourceRenownLine[] = [];
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'renownPerCity') continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    const towns = cityCount(state, playerId, false);
    const amount = effect.amount * copies * towns;
    if (amount === 0) continue;
    list.push({ resource: id, source: lineLabel(id, `cities ×${towns}`, copies, loan), amount });
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
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'happinessTierBoost') continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    const amount = effect.points * copies;
    if (amount === 0) continue;
    points += amount;
    lines.push({ resource: id, source: lineLabel(id, 'happiness', copies, loan), amount });
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
  for (const { id, effect, loan } of liveResourceEffects(state, owner)) {
    if (effect.kind !== 'productionBonus' || effect.category !== category) continue;
    if (effect.scope !== 'empire' && !local.includes(id)) continue;
    const copies = copiesFor(state, owner, id, effect, loan);
    list.push({
      resource: id,
      source: lineLabel(id, null, copies, loan),
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
  for (const { id, effect, loan } of liveResourceEffects(state, owner)) {
    if (effect.kind !== 'percentYields') continue;
    if (!scopeAdmits(state, city, effect.scope, cityResources(state, city, 'luxury'), id)) continue;
    const copies = copiesFor(state, owner, id, effect, loan);
    list.push({
      resource: id,
      source: lineLabel(id, effect.scope === undefined ? null : scopeNote(effect.scope), copies, loan),
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
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'rulePercent' || effect.rule !== rule) continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    list.push({
      resource: id,
      source: lineLabel(id, null, copies, loan),
      percent: effect.percent * copies,
    });
  }
  return list;
}

/**
 * The percentages this player's luxuries put on **what the roads between its
 * cities pay it**, in table order — spices' Æra III, and today the whole of the
 * `connectionPercent` shape.
 *
 * `resourceRulePercent`'s sibling with one consumer instead of three, and a
 * shape of its own rather than a fourth rule for the reason stated on
 * `ResourceRule`: a *rule* here has to be a word the cards can name too, and
 * this is not one. What it takes a share of is one line of `explainEmpireGold`
 * (`empireGold.ts`) — the connections line — and that is where the fold is
 * applied and floored, once, so nothing multiplies a treasury twice.
 */
export function resourceConnectionPercent(
  state: GameState,
  playerId: number,
): ResourceRuleLine[] {
  const list: ResourceRuleLine[] = [];
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'connectionPercent') continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    list.push({
      resource: id,
      source: lineLabel(id, 'city connections', copies, loan),
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

// --- the army ---------------------------------------------------------------

/** One strength line a resource contributes. `CardCombatLine` without the card. */
export interface ResourceCombatLine {
  resource: ResourceId;
  source: string;
  amount: number;
}

/**
 * Every flat strength this empire's resources give one side of one fight —
 * obsidian's point on melee, in table order.
 *
 * `cardCombatLines`' twin, and deliberately reading the same shape through the
 * same function: a resource row declares `CardCombatLineEffect` whole, and
 * `combatLineAmount` (`statecraft/evaluator.ts`) decides posture, silhouette,
 * the piece opposite, the condition and the scaling for both tables. What this
 * side owns is which resources the empire holds and what the line is labelled;
 * everything else is one reading.
 *
 * The lines join `planCombat`'s ordered list beside the cards' and the ground's
 * (hard rule 5), so the forecast itemises them and a player can see where the
 * point came from. Flat points, never a multiplier — the combat trap.
 */
export function resourceCombatLines(
  state: GameState,
  situation: CombatSituation,
): ResourceCombatLine[] {
  const playerId = situation.unit.ownerId;
  const list: ResourceCombatLine[] = [];
  if (!tableHasLive(state, playerId, 'combatLine')) return list;
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'combatLine') continue;
    const each = combatLineAmount(state, situation, effect);
    if (each === null) continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    // Floored, because a strength line is a whole number of points on a ledger
    // of whole numbers: a borrowed luxury's half a point would otherwise make
    // one side's total a fraction nobody could read off the forecast.
    const amount = Math.floor(each * copies);
    if (amount === 0) continue;
    list.push({ resource: id, source: lineLabel(id, 'in battle', copies, loan), amount });
  }
  return list;
}

/** One line of extra maximum health a resource gives this empire's fighters. */
export interface ResourceHealthLine {
  resource: ResourceId;
  source: string;
  amount: number;
}

/**
 * The extra maximum health this empire's resources give every piece of its that
 * can fight, in table order — iron's ten points.
 *
 * **Live, and that is the whole design.** The other way to give a piece extra
 * health is `UnitStamp.hp`, written once at its birth and carried for life; that
 * is what a card does and it is the wrong shape here, because all seven strategic
 * bonuses are meant to obey one rule a player can guess ("hold one copy and you
 * get this"). So this is asked every time a maximum is read, and the turn an
 * empire loses its last iron the army is back to the roster's figure.
 *
 * Who gets it is decided in `unitMaxHp` and not here: this answers "what does the
 * empire supply", the unit table answers "may this piece spend it". That split is
 * what lets the renderer's health bar and the Compendium ask the same question as
 * `planCombat` without either of them knowing what a civilian is.
 */
export function resourceUnitHealth(state: GameState, playerId: number): ResourceHealthLine[] {
  const list: ResourceHealthLine[] = [];
  if (!tableHasLive(state, playerId, 'unitHealth')) return list;
  for (const { id, effect, loan } of liveResourceEffects(state, playerId)) {
    if (effect.kind !== 'unitHealth') continue;
    const copies = copiesFor(state, playerId, id, effect, loan);
    const amount = Math.floor(effect.amount * copies);
    if (amount === 0) continue;
    list.push({ resource: id, source: lineLabel(id, 'fighting units', copies, loan), amount });
  }
  return list;
}

/**
 * What the lines above come to — the one number `unitMaxHp` is handed.
 *
 * **Remembered on the economy clock**, and that is the right clock rather than a
 * convenient one. The inputs are the ground, what has been dug on it, what a
 * bargain lent away and which technologies the empire holds, which is exactly
 * what `resourceCopies` is remembered on; losing an iron mine is an economy event
 * and announces itself as one. It deliberately does **not** move when a unit is
 * built or dies, which is what separates it from batch R1's committed count — that
 * one is a fact about pieces and is not memoised at all for that reason.
 *
 * It has to be cheap because the renderer asks for a piece's maximum once per
 * piece per frame. Measured on a turn-120 six-seat board, warm:
 * **about 0.1 microseconds a call** through the memo, against about 40 for the
 * uncached walk — see `test/sim/resourceBonuses.test.ts`, which prints the figure.
 */
export function unitHealthBonus(state: GameState, playerId: number): number {
  return slateMemo(state, 'economy', 'unitHealth', String(playerId), () => {
    let total = 0;
    for (const line of resourceUnitHealth(state, playerId)) total += line.amount;
    return total;
  });
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
  if (effect.kind === 'authority') {
    return `${signed(effect.amount)} authority${effect.per === 'city' ? ' per city' : ''}${each}`;
  }
  if (effect.kind === 'happinessTierBoost') {
    return `${signed(effect.points)} percentage points on the happiness bonus${each}`;
  }
  if (effect.kind === 'unitUpkeepRebate') {
    return `${effect.amount} less gold to keep each soldier${each}`;
  }
  if (effect.kind === 'renownPerCity') {
    return `${signed(effect.amount)} renown a turn per city${each}`;
  }
  if (effect.kind === 'productionBonus') {
    const category =
      effect.category === 'unit' ? 'units' : effect.category === 'wonder' ? 'wonders' : 'buildings';
    const where = effect.scope === 'empire' ? 'every city' : 'this city';
    return `${signed(effect.percent)}% production toward ${category} in ${where}${each}`;
  }
  if (effect.kind === 'percentYields') {
    return `${signed(effect.percent)}% ${effect.yield} in ${scopeWords(effect.scope)}${each}`;
  }
  if (effect.kind === 'rulePercent') {
    return `${signed(effect.percent)}% ${RULE_WORDS[effect.rule]}${each}`;
  }
  if (effect.kind === 'connectionPercent') {
    return `${signed(effect.percent)}% gold from the roads between your cities${each}`;
  }
  if (effect.kind === 'combatLine') {
    // The cards' own two word tables, so a resource and a card that say the same
    // thing read the same way. Both are ref-free; see the note in `statecraft.ts`.
    const who = effect.class === undefined ? '' : ` for ${filterWords(effect.class)}`;
    const against = effect.vsClass === undefined ? '' : ` against ${filterWords(effect.vsClass)}`;
    const when = combatWhenWords(effect.when);
    return `${signed(effect.amount)} combat strength${who}${against} ${when}${each}`.trim();
  }
  if (effect.kind === 'unitHealth') {
    return `${signed(effect.amount)} maximum health for your units that can fight${each}`;
  }
  // The two bag shapes that name their own multiplier rather than a set of
  // cities, written here so `describeOne` stays one sentence-builder over one
  // yield-bag reading — the reason a new bag shape costs a clause and not a
  // second describer.
  const where =
    effect.kind === 'buildingCategoryYields'
      ? `for each ${effect.wonders === true ? 'wonder' : `${effect.category} building`} you hold`
      : effect.kind === 'routeYields'
        ? 'on every trade route'
        : effect.kind === 'pays'
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
  // Happiness rides in the same sentence as the yields it is declared beside —
  // jade's Æra III is one clause ("+1 faith, +1 happiness for each production
  // building you hold"), because it is one line on the row and a reader who saw
  // two would go looking for two buildings' worth of it.
  if (effect.kind === 'buildingCategoryYields' && (effect.happiness ?? 0) !== 0) {
    parts.push(`${signed(effect.happiness!)} happiness`);
  }
  return parts.length > 0 ? `${parts.join(', ')} ${where}${each}` : null;
}

/** How each rule reads in a sentence. Beside the union it names. */
const RULE_WORDS: Record<ResourceRule, string> = {
  happinessDemand: 'happiness demanded per citizen',
  borderCost: 'culture for the next border hex',
  growthCarryover: 'of the stored food kept when a city grows',
  roadStepCost: 'of the movement a step along a road costs',
};

/**
 * A scope in a printed rule's words — **`cityScopeWords`, plus the one word**.
 *
 * It was a fourth copy of the cards' own sentence-builder and answered
 * identically for every scope the table names ("every coastal city", "your
 * capital", "every city"). One reading now, so a luxury's hover and a card's
 * clause cannot describe the same set of towns two ways. See `scopeAdmits` for
 * why `'owner'` is the word that stayed.
 */
function scopeWords(scope: ResourceCityScope | undefined): string {
  if (scope === 'owner') return 'this city';
  return cityScopeWords(scope);
}

