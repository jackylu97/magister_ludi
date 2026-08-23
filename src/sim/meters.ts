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
 *   capacity the palace, plus a grant per age *advance*
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

import {
  capitalCityOf,
  controlledResources,
  isCoastalCity,
  nextCityName,
} from './cities';
import type { Tile } from './map';
import { resourceDef } from './resourceData';
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

  // Unique, and in the resource table's order: see `controlledResources`.
  for (const id of controlledResources(state, playerId, 'luxury')) {
    list.push({ source: resourceDef(id).name, part: 'gain', value: rules.perUniqueLuxury });
  }

  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    list.push({
      source: `${city.name} · ${city.population} citizens`,
      part: 'cost',
      value: -rules.demandPerPop * city.population,
    });
    const crowding = crowdingDemand(city.population);
    if (crowding > 0) {
      list.push({ source: `${city.name} crowding`, part: 'cost', value: -crowding });
    }
  }

  return list;
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
 * Authority, as the ordered list it is the fold of: capacity first, then every
 * city that spends it.
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

/** The bonus/malus tier a meter total earns: ±5 → ±10%, ±10 → ±20%. */
export function tierPercent(value: number): number {
  return stepPercent(METERS.tiers, value, METERS.tierClamp);
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
 *   authority ≥ +5   production — a writ that runs is a writ that builds.
 *   authority < 0    production, science and culture together: over-extension
 *                    is the one thing in this game that taxes the whole economy,
 *                    because it is the only lawful width tax (Entry I's third
 *                    commitment).
 */
export function meterEffects(state: GameState, playerId: number): MeterEffect[] {
  const effects: MeterEffect[] = [];

  const happiness = happinessOf(state, playerId);
  const bonus = tierPercent(happiness);
  if (bonus > 0) {
    effects.push({
      meter: 'happiness',
      value: happiness,
      percent: bonus,
      yields: ['science', 'culture'],
      growth: false,
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
    });
  } else if (writ < 0) {
    effects.push({
      meter: 'authority',
      value: authority,
      percent: writ,
      yields: ['production', 'science', 'culture'],
      growth: false,
    });
  }

  return effects;
}

/**
 * What one yield is multiplied by: the percentages that touch it, summed, then
 * applied once.
 *
 * Summed and not compounded, and that is a legibility decision the ledger makes
 * explicitly — a +10% and a −10% have to read as nothing at all, which they do
 * not if they are multiplied one after the other.
 */
export function yieldFactor(effects: readonly MeterEffect[], yieldId: ModifiedYield): number {
  let percent = 0;
  for (const effect of effects) {
    if (!effect.growth && effect.yields.includes(yieldId)) percent += effect.percent;
  }
  return 1 + percent / 100;
}

/**
 * What food *surplus* toward growth is multiplied by. Floored at zero: the worst
 * the meter can do is stall a city, never eat it.
 */
export function growthFactor(effects: readonly MeterEffect[]): number {
  let percent = 0;
  for (const effect of effects) {
    if (effect.growth) percent += effect.percent;
  }
  return Math.max(0, 1 + percent / 100);
}
