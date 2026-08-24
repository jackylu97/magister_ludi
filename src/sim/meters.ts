/**
 * The two empire meters: **happiness**, the vertical limiter, and **authority**,
 * the horizontal one.
 *
 * Design ledger, Entry I (the skeleton) and Entry XIV (the ratified v1). The
 * shape is deliberately the simplest one that could work: two global numbers,
 * each the fold of a signed list, each read by the interface and by the turn
 * pipeline through the same function.
 *
 * Nothing here is stored
 * ----------------------
 * Neither meter is a field on anything. Both are pure functions of the board —
 * who owns which cities, how big they are, which luxuries are dug up, how far
 * the tree has been walked — and a stored copy would be one more thing that can
 * disagree with the world it describes. That is the same argument
 * `explainTileYield` makes one grade smaller, and it is CLAUDE.md's rule 5: the
 * evaluator returns the *list*, the total is the fold of the list, and there is
 * no second implementation of the arithmetic anywhere.
 *
 * The one thing this module cannot derive is whether a city was taken by force,
 * because a captured town is indistinguishable from a founded one the turn
 * after — hence `City.captured`, the only state Milestone 10 added.
 *
 * Happiness = supply − demand
 * ---------------------------
 *   supply   the palace, plus a flat sum per *unique* improved luxury
 *   demand   per city, `pop + w·max(0, pop − softPop) ^ p` — superlinear inside
 *            a city and never in empire-total pop, which is Entry I's second
 *            commitment and the whole reason this taxes tall rather than wide.
 *
 * Authority = capacity − used
 * ---------------------------
 *   capacity the palace, plus a grant per age *advance*, plus whatever the
 *            empire has *built* — one line per building type that declares an
 *            `authorityCapacity` (the monument's 1, today)
 *   used     the capital free, a founded city 2, a coastal one 1, a captured
 *            one 3 — and captured outranks coastal, which is the one precedence
 *            rule in the block: a seized harbour is a thing you seized, not a
 *            thing you grew (Entry XIV.D.2).
 *
 * Neither meter is ever a hard cap (Entry I's first commitment). Going under
 * zero is legal, priced, and reversible; End Turn never gates on it.
 *
 * The import cycle with `cities.ts`, and why it is safe
 * ----------------------------------------------------
 * This module asks `cities.ts` for facts about cities and territory — which city
 * is the capital, which stands on the coast, which luxuries the empire has dug
 * up — and `cities.ts` asks this module for the multipliers it must apply inside
 * `cityYields`. That is a genuine cycle and it is deliberate: the alternatives
 * were to duplicate the territory rules here (two implementations of "does this
 * empire control this resource", which is exactly what rule 5 forbids) or to
 * apply the multipliers somewhere other than the one evaluator every surface
 * reads, which would let a build estimate lie.
 *
 * It is safe because it is a *function-level* cycle only: neither module reads a
 * binding from the other while modules are being evaluated. Everything at the
 * top level here comes from `rules.json`, and the same is true over there.
 * Nothing in this file may grow a top-level call into `cities.ts`.
 */

import { BUILDING_IDS, buildingDef, buildingPlural } from './buildingData';
import { improvementDef, improvementForResource } from './improvementData';
import {
  capitalCityOf,
  controlledHoldings,
  isCoastalCity,
  nextCityName,
} from './cities';
import type { Tile } from './map';
import { type ResourceRule, resourceDef } from './resourceData';
import {
  foldRulePercent,
  resourceAuthority,
  resourceHappiness,
  resourceRulePercent,
  resourceTierBoost,
} from './resourceEffects';
import { type MeterStep, RULES } from './rulesData';
import { type GameState, playerById } from './state';
import { highestAge } from './techData';
import { isCoastal } from './water';

const METERS = RULES.meters;

// --- the breakdown ----------------------------------------------------------

/** Which side of a meter a line stands on. */
export type MeterPart = 'gain' | 'cost';

/**
 * One line of a meter's ledger: what it is, which side it is on, and what it is
 * worth **signed** — gains positive, costs negative, so the fold is a plain sum.
 *
 * `part` is carried rather than inferred from the sign because a line may be
 * worth nothing and still be worth *saying*: the capital costs zero authority,
 * and "Aldermarch (capital) free" is the single most useful line in that list.
 */
export interface MeterContribution {
  /** Display label. A city's name, a luxury's, "Palace", "Æra II". */
  source: string;
  part: MeterPart;
  value: number;
}

/** The total: the fold of the list, and the only place a meter is summed. */
export function foldMeter(list: readonly MeterContribution[]): number {
  let total = 0;
  for (const entry of list) total += entry.value;
  return total;
}

/**
 * A meter read as three numbers: the two sides and the difference between them.
 *
 * The sides exist because authority is *shown* as `used / capacity` — one chip
 * saying how much of the writ is spent — and they are sub-folds of the same
 * list rather than a second computation. `cost` is reported as a positive
 * magnitude, which is how a player says it ("six of eight"), not how the list
 * stores it.
 */
export interface MeterStanding {
  entries: MeterContribution[];
  total: number;
  gain: number;
  cost: number;
}

export function meterStanding(entries: MeterContribution[]): MeterStanding {
  let gain = 0;
  let cost = 0;
  for (const entry of entries) {
    if (entry.part === 'gain') gain += entry.value;
    else cost -= entry.value;
  }
  return { entries, total: foldMeter(entries), gain, cost };
}

// --- happiness --------------------------------------------------------------

/** What one city of this size demands. See the module docblock for the curve. */
export function happinessDemand(population: number): number {
  const rules = METERS.happiness;
  const over = Math.max(0, population - rules.crowdingFrom);
  return rules.demandPerPop * population + rules.crowdingWeight * over ** rules.crowdingExponent;
}

/**
 * The crowding half of a city's demand on its own, so the breakdown can say it
 * out loud. Zero for every city under the threshold, which is most of them.
 */
function crowdingDemand(population: number): number {
  const rules = METERS.happiness;
  const over = Math.max(0, population - rules.crowdingFrom);
  return rules.crowdingWeight * over ** rules.crowdingExponent;
}

/**
 * What this empire's luxuries multiply a rule by — one, plus their summed
 * percentage.
 *
 * Two of the three rules a `rulePercent` may name are scalings of an existing
 * base and both are read through this: sugar and honey take a tenth off what a
 * citizen demands, and furs take a tenth off a border tile (that one lands in
 * `cities.ts`, where border costs live). Summed and applied once, exactly as the
 * yield percentages are inside a stage, so two such luxuries read as −20% rather
 * than as 0.9 × 0.9. A rule has one stage and always will: there is nothing for a
 * second multiplication to be *about*.
 */
function ruleFactor(state: GameState, playerId: number, rule: ResourceRule): number {
  return 1 + foldRulePercent(resourceRulePercent(state, playerId, rule)) / 100;
}

/**
 * Happiness, as the ordered list it is the fold of.
 *
 * Supply first and demand after, because that is the order the sentence is read
 * in — what the empire has, then what it is being asked for. Cities are walked
 * in `state.cities` order, which is founding order, so the list a player reads
 * this turn is the list they read last turn with one more line on it.
 *
 * A crowded city gets a second line of its own. "Ur · 11 citizens −11" and "Ur
 * crowding −2.7" are two different facts — one is the size of the town and the
 * other is the price of that size — and a player who wants to know why one city
 * costs more than another needs to see them apart.
 */
export function explainHappiness(state: GameState, playerId: number): MeterContribution[] {
  const rules = METERS.happiness;
  const list: MeterContribution[] = [];

  // The palace, and only if there is one. An empire with no cities has no
  // capital and no palace happiness — which is turn one, before the settler
  // stops walking.
  if (capitalCityOf(state, playerId) !== undefined) {
    list.push({ source: 'Palace', part: 'gain', value: rules.palace });
  }

  // Unique, and in the resource table's order: see `controlledHoldings`. The
  // line says *how* the empire holds it — "Gems · mine" against "Gems · city" —
  // because the two are worth the same and are lost in completely different
  // ways, and a player deciding whether to defend a hill or a town needs to know
  // which one is paying for their contentment.
  for (const holding of controlledHoldings(state, playerId, 'luxury')) {
    list.push({
      source: `${resourceDef(holding.id).name} · ${viaWord(holding.id, holding.via)}`,
      part: 'gain',
      value: rules.perUniqueLuxury,
    });
  }
  // A luxury whose signature is *more happiness* says so on a line of its own
  // rather than swelling the flat line above it — "Wine +4" is what a luxury is
  // worth and "Wine · vintage +2" is what this one is, and a player choosing
  // which seam to improve first needs to see the two apart. One evaluator reads
  // the vocabulary (`resourceEffects.ts`); this only folds what it returns.
  for (const line of resourceHappiness(state, playerId)) {
    list.push({ source: line.source, part: 'gain', value: line.amount });
  }
  // Amber does not pay happiness; it makes contentment *worth more*. Its line
  // is here so the ledger accounts for it, worth zero on the meter itself —
  // `MeterContribution` carries `part` precisely so a line can be worth nothing
  // and still be worth saying (see its docblock), and a player whose bonus
  // jumped five points is entitled to find the reason in this list.
  for (const line of resourceTierBoost(state, playerId).lines) {
    list.push({ source: `${line.source} · +${line.amount}% when content`, part: 'gain', value: 0 });
  }

  // What a citizen costs, less whatever sugar and honey take off it. The factor
  // multiplies *both* demand lines, because "the happiness cost for population"
  // is the whole of what a town asks for and not only its linear half.
  const demand = ruleFactor(state, playerId, 'happinessDemand');
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    list.push({
      source: `${city.name} · ${city.population} citizens`,
      part: 'cost',
      value: -rules.demandPerPop * city.population * demand,
    });
    const crowding = crowdingDemand(city.population) * demand;
    if (crowding > 0) {
      list.push({ source: `${city.name} crowding`, part: 'cost', value: -crowding });
    }
  }

  return list;
}

/** "mine", "city" — how a holding reads on a ledger line. */
function viaWord(id: Parameters<typeof resourceDef>[0], via: 'improvement' | 'city'): string {
  if (via === 'city') return 'city';
  const improvement = improvementForResource(id);
  return improvement === null ? 'worked' : improvementDef(improvement).name.toLowerCase();
}

/** The empire's happiness. The fold of `explainHappiness`, and nothing else. */
export function happinessOf(state: GameState, playerId: number): number {
  return foldMeter(explainHappiness(state, playerId));
}

// --- authority --------------------------------------------------------------

/**
 * How many age *advances* this player has made: one per age past the one every
 * game opens in.
 *
 * `highestAge` (`techData.ts`) is the single age derivation and this is the only
 * thing that counts off it. Entry I prices the *advance* — "palace 4 · age
 * advance +2" — so an empire still in the Ancient age has advanced nothing and
 * holds a bare palace's writ, which is what makes the fourth city the first one
 * that binds.
 */
export function agesAdvanced(state: GameState, playerId: number): number {
  const player = playerById(state, playerId);
  if (!player) return 0;
  return Math.max(0, highestAge(player.techsResearched) - 1);
}

/**
 * A city that does not exist yet, priced as if it did.
 *
 * Entry VIII's pre-decision delta: the settler's sheet quotes "Authority 8/10 →
 * 10/10" *before* the city is founded, and it does it by asking this same
 * evaluator with the site attached rather than by adding two somewhere in the
 * interface. A projection computed by a second implementation is a projection
 * that can lie, and this one even gets the coastal discount right — which is the
 * discount the settler lens has already painted the hex blue for.
 */
export interface AuthorityProspect {
  /** Where the city would stand. */
  site: Tile;
}

/** What one city costs its owner, and why. Shared by real and prospective ones. */
function cityAuthorityCost(
  name: string,
  captured: boolean,
  coastal: boolean,
  capital: boolean,
): MeterContribution {
  const rules = METERS.authority;
  // Captured first, and that is the precedence rule: a seized coastal city is
  // priced as a seizure, not as a harbour. The discount is for building a port,
  // not for taking one (design ledger, Entry XIV.D.2).
  if (captured) {
    return { source: `${name} · captured`, part: 'cost', value: -rules.capturedCity };
  }
  if (capital) return { source: `${name} · capital`, part: 'cost', value: -rules.capital };
  if (coastal) {
    return { source: `${name} · coastal`, part: 'cost', value: -rules.coastalCity };
  }
  return { source: name, part: 'cost', value: -rules.foundedCity };
}

/**
 * Every line the empire's *buildings* add to its writ, one per building type, in
 * `BUILDING_IDS` order.
 *
 * Data-driven and grouped, and both halves matter. There is no monument case
 * anywhere in this module: a building supplies capacity iff its row declares an
 * `authorityCapacity`, so the second such building is a line in `buildings.json`
 * and nothing else. And the line counts a *type* rather than naming each town —
 * "Monuments ×3 +3" is what a player wants to know about their monuments, while
 * three lines saying "Ur · monument +1" would bury the four lines below them
 * that say where the writ is actually going.
 *
 * A type nobody has built is not in the list. A capacity of zero is not a gain,
 * and the empty rows would be a list of everything the player has not done.
 */
function buildingCapacity(state: GameState, playerId: number): MeterContribution[] {
  const list: MeterContribution[] = [];
  for (const id of BUILDING_IDS) {
    const capacity = buildingDef(id).authorityCapacity;
    if (capacity === undefined || capacity === 0) continue;
    let count = 0;
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      if (city.buildings.includes(id)) count += 1;
    }
    if (count === 0) continue;
    const name = buildingDef(id).name;
    list.push({
      source: count === 1 ? name : `${buildingPlural(name, count)} ×${count}`,
      part: 'gain',
      value: capacity * count,
    });
  }
  return list;
}

/**
 * Authority, as the ordered list it is the fold of: capacity first — the palace,
 * the ages, then what the empire has built — and then every city that spends it.
 *
 * `prospect` prices a city that has not been founded yet — see
 * `AuthorityProspect`. It is appended last, exactly where a new city would land
 * in `state.cities`, and it takes the capital's free ride when the player has no
 * cities at all, because the first city a player founds *is* their capital.
 */
export function explainAuthority(
  state: GameState,
  playerId: number,
  prospect?: AuthorityProspect,
): MeterContribution[] {
  const rules = METERS.authority;
  const list: MeterContribution[] = [];
  const capital = capitalCityOf(state, playerId);

  if (capital !== undefined) {
    list.push({ source: 'Palace', part: 'gain', value: rules.palaceCapacity });
  }
  // One line per advance rather than one line worth the lot: "Æra II +2" is the
  // gift the turn splash announced, and a player should be able to find it again.
  for (let age = 2; age <= agesAdvanced(state, playerId) + 1; age++) {
    list.push({ source: `Æra ${'I'.repeat(age)}`, part: 'gain', value: rules.perAge });
  }
  // The writ an empire has *built*, after the writ it was born with and before
  // anything spends it: gains together, in the order they were earned.
  list.push(...buildingCapacity(state, playerId));
  // And the writ it has *dug up*. A luxury that supplies authority is capacity
  // like any other and reads as its own line, never as a discount on what a city
  // costs — see `resourceAuthority`.
  for (const line of resourceAuthority(state, playerId)) {
    list.push({ source: line.source, part: 'gain', value: line.amount });
  }

  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    list.push(
      cityAuthorityCost(
        city.name,
        city.captured,
        isCoastalCity(state, city),
        city.id === capital?.id,
      ),
    );
  }

  if (prospect) {
    list.push(
      cityAuthorityCost(
        nextCityName(state, playerId),
        false,
        isCoastal(state.map, prospect.site),
        capital === undefined,
      ),
    );
  }

  return list;
}

/** The empire's authority. The fold of `explainAuthority`, and nothing else. */
export function authorityOf(
  state: GameState,
  playerId: number,
  prospect?: AuthorityProspect,
): number {
  return foldMeter(explainAuthority(state, playerId, prospect));
}

// --- what the meters do -----------------------------------------------------

/**
 * The rung of a ladder a value stands on, as a signed whole percent.
 *
 * The deepest rung that admits it, so a table's order does not matter and a
 * value at +12 takes the +20% rung rather than the +10% one it also satisfies.
 * "Deepest" is by magnitude, which is the same reading on both sides of zero.
 *
 * `clamp` is a magnitude cap applied afterwards, so extending the table cannot
 * accidentally hand out a bonus the design has not signed off on.
 */
export function stepPercent(
  steps: readonly MeterStep[],
  value: number,
  clamp = Infinity,
): number {
  let percent = 0;
  for (const step of steps) {
    const applies =
      (step.whenAtOrAbove !== undefined && value >= step.whenAtOrAbove) ||
      (step.whenAtOrBelow !== undefined && value <= step.whenAtOrBelow) ||
      (step.whenBelow !== undefined && value < step.whenBelow);
    if (!applies) continue;
    if (Math.abs(step.percent) > Math.abs(percent)) percent = step.percent;
  }
  return Math.sign(percent) * Math.min(Math.abs(percent), clamp);
}

/**
 * The bonus/malus tier a meter total earns: ±5 → ±10%, ±10 → ±20%.
 *
 * `boost` raises a **positive** rung by so many percentage points and is applied
 * *after* the clamp, which is the whole of amber's signature and the reason it
 * is a parameter rather than another entry in the ladder. Applied before the
 * clamp it would do nothing at all at the top rung — `tierClamp` is exactly the
 * top rung's magnitude — and applied to the malus rungs it would make an unhappy
 * empire *more* punished for owning amber, which is nobody's reading of "an
 * additional bonus for happy cities".
 */
export function tierPercent(value: number, boost = 0): number {
  const percent = stepPercent(METERS.tiers, value, METERS.tierClamp);
  return percent > 0 ? percent + boost : percent;
}

/**
 * The growth stifle a happiness total earns, on its own steeper ladder:
 * any deficit −50%, −10 → −80%, −20 → −100% (design ledger, Entry XIV.D.4).
 *
 * Not the tier table, deliberately. A happiness deficit is meant to stop a wide
 * empire *growing* rather than to shave a tenth off it, and the first rung is
 * `< 0` rather than `≤ 0` because an empire in exact balance is balanced.
 */
export function growthStiflePercent(value: number): number {
  return stepPercent(METERS.growthStifle, value);
}

/**
 * What an authority total does to border-culture accrual on its own ladder:
 * any deficit at all freezes borders outright (−100%).
 *
 * The horizontal half of Entry XIV's doctrine, and `growthStiflePercent`'s exact
 * mirror image one meter over — happiness owns the vertical and stops a wide
 * empire *growing*; authority owns the horizontal and stops an over-reached one
 * *spreading*. Same `< 0` boundary for the same reason: balance is balance.
 *
 * Separate from `tierPercent` because the two answer different questions. The
 * tier asks how well the writ runs (±10/20% from ±5); this asks whether it runs
 * at all, and it bites four points earlier than the first malus rung does.
 */
export function borderFreezePercent(value: number): number {
  return stepPercent(METERS.borderFreeze, value);
}

/** The yields a meter can multiply. Food is not among them — see `growth`. */
export type ModifiedYield = 'production' | 'science' | 'culture';

export type MeterId = 'happiness' | 'authority';

/**
 * One thing a meter is currently doing to the economy.
 *
 * A list rather than a set of numbers because rule 5 applies to modifiers too:
 * the city panel prints one line per entry, the HUD chip names the ones that are
 * biting, and the multipliers below are folds of the same list. An effect worth
 * zero percent is never in it — a modifier that does nothing is not a modifier.
 */
export interface MeterEffect {
  meter: MeterId;
  /** The meter total that earned it, so a line can say why. */
  value: number;
  /** Signed whole percent. */
  percent: number;
  /** The yields it multiplies. Empty when it is the growth stifle. */
  yields: ModifiedYield[];
  /** True when it multiplies food surplus toward growth instead of a yield. */
  growth: boolean;
  /**
   * True when it multiplies the culture a city banks toward its next border
   * tile (`borderGrowth` in `cities.ts`).
   *
   * A third channel beside `yields` and `growth` rather than a fourth
   * `ModifiedYield`, because border culture is not a yield: the same culture is
   * banked twice — once into `City.culture`, which buys ground, and once into
   * `Player.culturePool`, which will buy civics — and only the first of the two
   * answers to the writ. A yield entry would move both.
   *
   * It rides on the *same effect* as the writ's production bonus rather than on
   * a line of its own, because it is the same fact about the empire: a writ that
   * runs is a writ that builds and claims. The freeze is its own effect, because
   * that is a different fact.
   */
  borders: boolean;
}

/**
 * Everything the two meters are doing to this player's economy right now.
 *
 * The asymmetry between the four cases is the design, not an oversight
 * (Entry XIV.D.4):
 *
 *   happiness ≥ +5   science and culture — contentment buys thought, not iron.
 *   happiness < 0    growth, on its own steep ladder, and *nothing else*: an
 *                    unhappy empire stops growing rather than getting worse at
 *                    everything.
 *   authority ≥ +5   production *and border growth* — a writ that runs is a writ
 *                    that builds and claims.
 *   authority < 0    borders freeze outright, four points before any malus rung
 *                    is reached: land follows the writ (playable.md item 2), and
 *                    the same test bars buying land with gold.
 *   authority ≤ −5   production, science and culture together: over-extension
 *                    is the one thing in this game that taxes the whole economy,
 *                    because it is the only lawful width tax (Entry I's third
 *                    commitment).
 *
 * The two authority deficits are two separate entries and not one, because they
 * begin at different totals and mean different things — an empire at −2 is still
 * building and thinking at full rate, it has simply stopped growing outward.
 */
export function meterEffects(state: GameState, playerId: number): MeterEffect[] {
  const effects: MeterEffect[] = [];

  const happiness = happinessOf(state, playerId);
  const bonus = tierPercent(happiness, resourceTierBoost(state, playerId).points);
  if (bonus > 0) {
    effects.push({
      meter: 'happiness',
      value: happiness,
      percent: bonus,
      yields: ['science', 'culture'],
      growth: false,
      borders: false,
    });
  }
  const stifle = growthStiflePercent(happiness);
  if (stifle !== 0) {
    effects.push({
      meter: 'happiness',
      value: happiness,
      percent: stifle,
      yields: [],
      growth: true,
      borders: false,
    });
  }

  const authority = authorityOf(state, playerId);
  const writ = tierPercent(authority);
  if (writ > 0) {
    effects.push({
      meter: 'authority',
      value: authority,
      percent: writ,
      yields: ['production'],
      growth: false,
      borders: true,
    });
  } else if (writ < 0) {
    effects.push({
      meter: 'authority',
      value: authority,
      percent: writ,
      yields: ['production', 'science', 'culture'],
      growth: false,
      borders: false,
    });
  }
  // The freeze, after the tier and on its own line, because it is its own rule:
  // it begins at any deficit at all rather than at −5, and it is the reason the
  // panel can say "borders frozen" instead of printing a rate of zero and
  // leaving the player to guess. See `borderFreezePercent`.
  const freeze = borderFreezePercent(authority);
  if (freeze !== 0) {
    effects.push({
      meter: 'authority',
      value: authority,
      percent: freeze,
      yields: [],
      growth: false,
      borders: true,
    });
  }

  return effects;
}

/**
 * What the **meters** put on one yield: the percentages that touch it, summed.
 *
 * Summed and not compounded, and that is a legibility decision the ledger makes
 * explicitly — a +10% and a −10% have to read as nothing at all, which they do
 * not if they are multiplied one after the other. Every line here is Entry
 * XVII's *global* stage: a tier is the empire leaning on all its cities at once,
 * which is what the global stage exists for. The city stage — buildings, category
 * bonuses, a luxury scoped to the towns that hold it — is summed separately and
 * applied first (`cityStageSums` in `cities.ts`).
 */
export function yieldPercent(effects: readonly MeterEffect[], yieldId: ModifiedYield): number {
  let percent = 0;
  for (const effect of effects) {
    if (!effect.growth && effect.yields.includes(yieldId)) percent += effect.percent;
  }
  return percent;
}

/**
 * The same figure as a multiplier — **the global stage's factor alone**, which
 * is the whole of what a city's yield is multiplied by only when nothing local
 * is also modifying it. Since the luxuries pass the meters are no longer the
 * only source of a percentage on a yield, and since Entry XVII they are not even
 * the only *stage*, so `cityYields` folds `cityStageSums` instead of calling
 * this — it survives for callers asking only what the meters are doing.
 */
export function yieldFactor(effects: readonly MeterEffect[], yieldId: ModifiedYield): number {
  return 1 + yieldPercent(effects, yieldId) / 100;
}

/**
 * The percentage the meters put on food *surplus* toward growth: summed, not
 * compounded, exactly like the border channel below.
 *
 * Its own channel, and deliberately not part of Entry XVII's two-stage pipeline:
 * the stifle multiplies the surplus a city banks rather than the food yield it
 * harvests (Entry XIV.D.4), so it is neither a city-stage nor a global-stage
 * percentage on a yield — it is a different rule with a different consumer
 * (`growthSurplus`). The city panel names it on the Growth line for the same
 * reason it names the writ on the Borders line: a modifier belongs to the number
 * it modifies.
 */
export function growthPercent(effects: readonly MeterEffect[]): number {
  let percent = 0;
  for (const effect of effects) {
    if (effect.growth) percent += effect.percent;
  }
  return percent;
}

/**
 * What food *surplus* toward growth is multiplied by. Floored at zero: the worst
 * the meter can do is stall a city, never eat it.
 */
export function growthFactor(effects: readonly MeterEffect[]): number {
  return Math.max(0, 1 + growthPercent(effects) / 100);
}

/**
 * The percentage the meters put on border-culture accrual: summed, not
 * compounded, exactly like every other channel here.
 */
export function borderPercent(effects: readonly MeterEffect[]): number {
  let percent = 0;
  for (const effect of effects) {
    if (effect.borders) percent += effect.percent;
  }
  return percent;
}

/**
 * What a city's border-culture accrual is multiplied by. Floored at zero, like
 * `growthFactor`: the worst the writ can do is stop a border, never march it
 * backwards — territory is never taken away by a meter.
 */
export function borderFactor(effects: readonly MeterEffect[]): number {
  return Math.max(0, 1 + borderPercent(effects) / 100);
}

/**
 * Is this empire's writ so overdrawn that its borders have stopped moving?
 *
 * The one test, asked in three places: the accrual (`borderGrowth`), the
 * `purchaseTile` command, and the authority chip's hover. Land follows the writ,
 * so an empire that cannot grow into ground cannot buy it either — otherwise the
 * freeze would be a tax on the poor and nothing at all on the rich.
 *
 * Phrased as "the factor has reached zero" rather than "authority is negative"
 * so that the freeze stays a fact about `borderFreeze` in `rules.json`: soften
 * that table to −50% and this correctly stops reporting a freeze.
 */
export function bordersFrozen(effects: readonly MeterEffect[]): boolean {
  return borderFactor(effects) <= 0;
}
