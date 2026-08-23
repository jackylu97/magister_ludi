/**
 * Typed access to `data/rules.json`.
 *
 * The counterpart of `terrainData.ts` for gameplay rules: every balance or
 * "starting value" number lives in the JSON, this file only types it. Modules
 * import `RULES` rather than hard-coding numbers, so a designer can retune the
 * game without touching the simulation code.
 *
 * Milestone 2 adds movement, stacking, healing and start placement; Milestone 3
 * adds the whole `cities` block; Milestone 4 adds `research` — the opening kit
 * of technologies and the auto-upgrade retooling lever. The tree itself is a
 * data file of its own (`data/techs.json`), because it is a graph rather than a
 * table of knobs. Milestone 5 adds `combat`, which is every number the fight is
 * made of; the per-unit half of it (`combatStrength`, `rangedStrength`, `range`)
 * lives in `data/units.json`, and the terrain half (`defenseBonus`) in
 * `data/terrain.json`, because both describe a *thing* rather than the system.
 * Milestone 10 adds `meters`, the whole tuning surface of happiness and
 * authority — supply, demand, and the two percentage ladders they act through.
 */

import rulesJson from '../../data/rules.json';
import type { TechId } from './techData';
import type { TileYieldSpec } from './terrainData';
import type { UnitTypeId } from './unitData';

export interface GameRules {
  /** Turn number a new game starts on. */
  startingTurn: number;
  /** First id handed out by the entity allocator; ids below it are reserved. */
  firstEntityId: number;
  minPlayers: number;
  maxPlayers: number;
}

export interface MovementRules {
  /**
   * Floor applied to every computed step cost, so no terrain combination can
   * ever be free (and therefore no zero-cost cycle can exist for the pathfinder).
   */
  minStepCost: number;
}

export interface StackingRules {
  /**
   * How many units of each `UnitCategory` may occupy one tile. At 1 this is the
   * Civ V rule: one military *and* one civilian share a tile happily, two
   * soldiers do not.
   */
  perCategoryPerTile: number;
}

/**
 * How far an empire can see. The whole tuning surface of fog of war; the
 * per-unit half of it (`sight`) lives in `data/units.json`, because how far a
 * scout can see is a fact about scouts.
 *
 * See `src/sim/visibility.ts` for the model these two numbers feed.
 */
export interface VisibilityRules {
  /** Extra hexes of sight a unit gains for standing on high ground. */
  hillsBonus: number;
  /**
   * How far a city sees from its own centre. Its *owned* tiles are visible
   * regardless — a border is a thing you patrol — so this is only the reach past
   * them, and it is deliberately a unit's worth rather than the claim radius: a
   * town is not a watchtower.
   */
  citySight: number;
}

export interface HealingRules {
  /** Hit points restored to a unit that spent none of its movement. */
  perTurnIfRested: number;
}

/**
 * Every number the fight is made of. See `src/sim/combat.ts` for the algebra;
 * this block is the whole of the tuning surface.
 *
 * The damage curve is Civ V's: one exponential in the *difference* of two
 * strengths, which is what makes strength a ratio-free scale — a 4-point edge is
 * worth the same at strength 8 as at strength 30, so the roster can grow into
 * later eras without the early game becoming a rounding error.
 */
export interface CombatRules {
  /** Damage an evenly-matched attack deals at the midpoint roll. */
  baseDamage: number;
  /** Exponent on the strength difference: `e ^ (k · (strA − strB))`. */
  strengthExponent: number;
  /** Half-width of the random band: the roll is uniform in `[1 − b, 1 + b]`. */
  rollBand: number;
  /** Defence added per turn spent fortified. */
  fortifyBonusPerTurn: number;
  /** Cap on the fortify bonus, however long a unit sits still. */
  fortifyMax: number;
  /** Fraction of strength a melee attacker loses attacking across a river. */
  riverAttackPenalty: number;
  /** Reserved for the flanking rule; 0 in v1, and nothing reads it yet. */
  flankingBonus: number;
  /** Hit points a city has at full health, whatever its size. */
  cityBaseHp: number;
  /** A city's defence before its population is counted. */
  cityBaseStrength: number;
  /** Defence each population point adds to a city. */
  cityStrengthPerPop: number;
  /** Hit points a city recovers every turn, up to `cityBaseHp`. */
  cityHealPerTurn: number;
  /** Fraction of `cityBaseHp` a city is left holding the turn it is captured. */
  cityCaptureHpFraction: number;
  /**
   * Civilians attacked in melee change hands instead of dying. False would kill
   * them, which is a different game and a one-line change.
   */
  captureCivilians: boolean;
}

/**
 * The system half of tile improvements. The per-improvement half (yields,
 * constraints, charge cost, tech renewals) lives in `data/improvements.json`,
 * because those describe *an improvement* rather than the system — the same
 * split `combat` makes with `data/units.json`.
 */
export interface ImprovementRules {
  /**
   * Gold the pillaging player's treasury gains for tearing one improvement out
   * of somebody else's ground.
   *
   * A flat figure rather than a fraction of what the improvement was worth: the
   * raid is priced by the *act*, and a scale that paid more for a plantation
   * than for a farm would quietly make luxuries the thing armies go for.
   */
  pillageGold: number;
}

/** Relative desirability of each yield when a citizen picks a tile to work. */
export interface CitizenWeights {
  food: number;
  production: number;
  gold: number;
}

export interface CityRules {
  /** How far from its centre a city may assign citizens, in hexes. */
  workRadius: number;
  /** How far from its centre a city's borders may ever reach, in hexes. */
  claimRadius: number;
  /** Minimum hex distance between two city centres, anyone's. */
  minCitySpacing: number;
  /** Food one population point eats every turn. */
  foodPerCitizen: number;
  /**
   * Growth curve. The food a city of population `n` must bank to reach `n + 1`
   * is `growthBase + growthLinear · (n − 1) + (n − 1) ^ growthExponent`,
   * floored — linear early, superlinear later, so a size-2 city grows in a
   * handful of turns and a size-12 one takes an age.
   */
  growthBase: number;
  growthLinear: number;
  growthExponent: number;
  /**
   * Food basket at or below which the city loses a population point. At −1 that
   * is "any deficit at all starves somebody", which is the Civ V feel; the
   * basket is emptied either way and population never falls below 1.
   */
  starvationShrinksAt: number;
  /**
   * Floor on the city-centre tile's own yield. The centre is worked for free
   * and is never a citizen slot, and a city on a snow tile still feeds itself,
   * so the centre pays the *larger* of its terrain yield and this, per field.
   */
  baseCityYields: TileYieldSpec;
  /** Science each population point produces, before buildings. */
  sciencePerPop: number;
  /** Culture every city produces just by existing, before buildings. */
  baseCulturePerCity: number;
  /**
   * Border cost curve. The `t`-th tile a city claims beyond its initial ring
   * costs `borderCostBase + borderCostLinear · (t − 1) ^ borderCostExponent`
   * culture, floored. The initial claim at founding is free and is not counted.
   */
  borderCostBase: number;
  borderCostLinear: number;
  borderCostExponent: number;
  /** Weights the citizen assigner and the border chooser both score tiles with. */
  citizenWeights: CitizenWeights;
  /**
   * City names, handed out in order per player. A player who founds more cities
   * than there are names falls back to `"<player name> <n>"`.
   */
  cityNames: string[];
}

/**
 * The two empire meters (design ledger, Entries I and XIV). Every number the
 * happiness/authority system is made of; the algebra is `src/sim/meters.ts`.
 *
 * Supply and demand are split into their own sub-blocks rather than being one
 * flat list, because a designer retunes one side of a meter at a time: "the
 * palace is too generous" and "cities are too cheap" are different edits.
 */
export interface HappinessRules {
  /** Happiness the capital supplies just by being the capital. */
  palace: number;
  /**
   * Happiness each *unique* improved luxury the empire has access to supplies.
   * Unique, so two improved silk seams are one silk (design ledger XIV.D.3).
   */
  perUniqueLuxury: number;
  /** Demand each population point makes. */
  demandPerPop: number;
  /**
   * Crowding: a city of population `n` demands
   * `demandPerPop · n + crowdingWeight · max(0, n − crowdingFrom) ^ crowdingExponent`.
   * Superlinear *within* a city and never in empire-total pop — Entry I's second
   * commitment, which is what keeps happiness a vertical limiter.
   */
  crowdingWeight: number;
  crowdingFrom: number;
  crowdingExponent: number;
}

export interface AuthorityRules {
  /** Capacity the capital supplies. */
  palaceCapacity: number;
  /** Capacity each age *advance* supplies. See `agesAdvanced` in `meters.ts`. */
  perAge: number;
  /** What the capital costs. Free in v1, and a number so it can stop being. */
  capital: number;
  /** What an ordinary city the player founded costs. */
  foundedCity: number;
  /** What a coastal city costs instead — a discount, never an exemption. */
  coastalCity: number;
  /**
   * What a city taken by force costs. Dearer than either, and it outranks the
   * coastal discount: a seized harbour is a thing you seized (Entry XIV.D.2).
   */
  capturedCity: number;
}

/**
 * One rung of a percentage ladder, and the comparison that admits it.
 *
 * Three optional comparators rather than one, because the two ladders this game
 * has do not agree on their boundaries: the bonus/malus tiers are inclusive
 * (`≥ +5`, `≤ −5`) while the growth stifle's first rung is "any deficit at all",
 * which is `< 0` and is *not* `≤ 0` — a happiness of exactly zero is a balanced
 * empire, not a starving one. A rung applies when any comparator it declares is
 * satisfied; `stepPercent` takes the deepest rung that applies.
 */
export interface MeterStep {
  whenAtOrAbove?: number;
  whenAtOrBelow?: number;
  whenBelow?: number;
  /** Signed whole percent this rung is worth. */
  percent: number;
}

export interface MeterRules {
  happiness: HappinessRules;
  authority: AuthorityRules;
  /**
   * The bonus/malus ladder both meters read: `≥ +5 → +10%`, `≥ +10 → +20%`, and
   * the mirror image below zero. *Which* yields each side of each meter moves is
   * a design rule and lives in `meters.ts`; this is only how far.
   */
  tiers: MeterStep[];
  /** Magnitude cap on a tier, however deep the table grows. */
  tierClamp: number;
  /**
   * The growth stifle's own, steeper ladder (design ledger XIV.D.4, user
   * 2026-08-23: "actually impactful"). It deliberately does not share `tiers` —
   * a happiness deficit is meant to stop a wide empire growing rather than to
   * shave a percent off it. Multiplies food *surplus* only, never base food, so
   * the worst rung stalls growth and still cannot starve a citizen.
   */
  growthStifle: MeterStep[];
}

export interface ResearchRules {
  /**
   * Technologies every player begins the game already holding.
   *
   * The opening kit: without it a new city could build nothing at all, because
   * every unit and building in `data/techs.json` is gated by some node. Kept
   * here rather than as a flag in the tree so that "what you start with" is one
   * short list a designer can read, and so that a scenario can hand out a
   * different one without editing the tree.
   */
  startingTechs: TechId[];
  /**
   * Gold one unit pays, once, when it auto-upgrades (Entry V's "retooling"
   * lever). At 0 upgrading is free, which is the v0 setting: the decision is
   * meant to live in army composition and tech timing, not in an upkeep bill.
   * A unit whose owner cannot afford it simply does not upgrade this turn.
   */
  retoolCost: number;
}

export interface RulesConfig {
  game: GameRules;
  movement: MovementRules;
  stacking: StackingRules;
  visibility: VisibilityRules;
  healing: HealingRules;
  combat: CombatRules;
  improvements: ImprovementRules;
  cities: CityRules;
  meters: MeterRules;
  research: ResearchRules;
  /** Unit types every player receives at their start position, in order. */
  startingUnits: UnitTypeId[];
}

export const RULES: RulesConfig = rulesJson as RulesConfig;
