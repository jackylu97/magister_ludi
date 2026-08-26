/**
 * Typed access to `data/buildings.json`.
 *
 * The third sibling of `terrainData.ts` and `unitData.ts`: the JSON is the
 * single source of truth for what a building costs and what it does, this file
 * only types it.
 *
 * Effects are flat modifier fields, not a scripting hook
 * -----------------------------------------------------
 * A building's effect is a handful of numbers a city adds up — `food`,
 * `production`, `gold`, `science`, `culture`, `faith`, `sciencePerPop` — rather
 * than a named behaviour the simulation
 * switches on. That is a deliberate ceiling: everything Milestone 3 needs is a
 * sum, and a sum can be read out of a data file, totalled in one place
 * (`cityYields` in `cities.ts`) and displayed in the city panel without any
 * module knowing that a granary is a granary. When a building eventually needs
 * a behaviour rather than a number, it gets a field naming that behaviour — not
 * a callback in the JSON, which would stop being data.
 *
 * `sciencePerPop` is fractional (a monastery is "+1 per 4 pop", stored as 0.25)
 * and is floored at the point it is applied, per building, so two half-science
 * buildings do not round into a free point. See `cityYields`.
 *
 * The three fields that name a behaviour
 * --------------------------------------
 * Three of them exist now, and each is a *number the caller interprets* rather
 * than a switch anybody has to grow a case in. All three arrived with the Age I
 * rework and all three are read in exactly one place:
 *
 *   · `authorityCapacity` — writ this building supplies, counted per building
 *     type by `explainAuthority` (`meters.ts`). There is no monument special
 *     case anywhere; a second building that raises the writ is a data row.
 *   · `productionBonus` — extra hammers a city puts behind one *category* of
 *     thing it is building, as `{ category, percent }`. Applied inside
 *     `cityYields`, the one production evaluator, so the estimate, the panel and
 *     the bank cannot disagree. It was `unitProductionBonus` — a fraction that
 *     could only ever mean "units" — until luxuries needed the same mechanism
 *     for buildings; generalising the field was strictly cheaper than growing a
 *     sibling special case beside it, and `productionModifiers` (`cities.ts`)
 *     now reads buildings and resources through one shape.
 *   · `upgrades` — the building half of the punctuated-renewal hook that
 *     `improvements.json` has had since M7. See `BuildingUpgrade`.
 *
 * One of each per city. Nothing here says so — that is a city rule and it lives
 * in the `setCityProduction` validation and in `advanceProduction`.
 *
 * Nor does anything here say *when* a building becomes available: that is the
 * tech tree's business (`data/techs.json`, read through `isUnlocked` in
 * `tech.ts`), so a designer moves a building's era by editing one line of the
 * tree rather than two files that could disagree.
 */

import buildingsJson from '../../data/buildings.json';
// Type-only, and it must stay that way: `techData.ts` imports `BuildingId` from
// here, so a *value* import of the tech table would close a load-time cycle and
// leave whichever module evaluated second reading an uninitialised binding.
// Nothing checks that these ids are real technologies here for that reason —
// `unlockDataProblems` in `techUnlocks.ts` does it, from a module that already
// sees both tables.
import type { TechId } from './techData';

/**
 * The kinds of thing a city can be building, and therefore the kinds a
 * production bonus can name.
 *
 * Structurally `QueueItem['kind']` (`state.ts`) and deliberately declared here
 * instead: `state.ts` is the game's *state*, and both tables that hand out a
 * category bonus — buildings and resources — are read by modules that must not
 * depend on it. `cities.ts` is where the two meet, and it is the one place that
 * checks a queue item's kind against this type.
 */
export type ProductionCategory = 'unit' | 'building';

/** A percentage of a city's hammers, behind one category. See `BuildingDef`. */
export interface ProductionBonus {
  category: ProductionCategory;
  /** Signed whole percent. `10` is the barracks' ten percent toward units. */
  percent: number;
}

export type BuildingId =
  | 'monument'
  | 'granary'
  | 'shrine'
  | 'barracks'
  | 'library'
  | 'temple'
  | 'market'
  | 'aqueduct'
  | 'workshop'
  | 'watermill'
  | 'amphitheater'
  | 'monastery'
  | 'university';

/**
 * What a building pays a city every turn.
 *
 * Every field is optional here and required on `BuildingDef`, which is the
 * difference between a *delta* and a *definition*: a renewal that says only
 * `{ "food": 1 }` is saying the one thing it does, while a building row that
 * left a field out would be a row a designer has to remember the default of.
 */
export interface BuildingYield {
  food?: number;
  production?: number;
  gold?: number;
  /** Flat beakers, as opposed to the per-citizen term. */
  science?: number;
  culture?: number;
  /**
   * Flat faith. The sixth voice, and the last of them to reach this table:
   * faith was a *tile* yield and a luxury's until the shrine and the temple
   * were moved off culture onto it (user, 2026-08-26), which is the whole of
   * why a building may pay it at all. Accumulate-only downstream, exactly as
   * every other faith source is — see `Player.faithPool`.
   */
  faith?: number;
  /** Science per population point, floored when applied. See the docblock. */
  sciencePerPop?: number;
}

/**
 * One tech-driven renewal of a building's yield — the mirror of
 * `ImprovementUpgrade` (`improvementData.ts`), deliberately the same shape so
 * that "a technology quietly makes something you already own pay more" is one
 * idea with one spelling rather than two.
 *
 * `add` is a delta and never a replacement, for `ImprovementUpgrade`'s reason:
 * an entry that replaced would have to know what it was replacing, which is
 * exactly the inline adjustment hard rule 5 exists to forbid. Each renewal
 * becomes its own line in `explainBuildingYield` (`cities.ts`) and its own gift
 * on the tech screen (`techGifts`).
 *
 * There is no `requiresFreshwater` twin: an improvement stands on a tile and can
 * be asked about the ground under it, and a building stands in a city, which has
 * no such question to answer yet.
 */
export interface BuildingUpgrade {
  /** The technology that switches this on for its owner. */
  tech: TechId;
  /** Added to what the building already pays, once the owner holds `tech`. */
  add: BuildingYield;
}

export interface BuildingDef {
  name: string;
  /** Hammers to complete. */
  cost: number;
  /** Flat food added to the city's total every turn. */
  food: number;
  /** Flat production added to the city's total every turn. */
  production: number;
  /** Flat gold added to the city's total every turn. */
  gold: number;
  /** Flat science added to the city's total every turn, before `sciencePerPop`. */
  science: number;
  /** Flat culture added to the city's total every turn. */
  culture: number;
  /**
   * Flat faith added to the city's total every turn, or absent for none.
   *
   * The one **optional** field among the six voices, and deliberately: every
   * other one is required so that a designer reading a row never has to
   * remember a default, but faith arrived after the table was written and
   * making it required would have meant `"faith": 0` on twenty rows that have
   * nothing to do with it. Absent means zero, and `explainBuildingYield` is
   * where that is read.
   */
  faith?: number;
  /** Science per population point, floored when applied. See the docblock. */
  sciencePerPop: number;
  /**
   * Authority capacity this building supplies its owner, or absent for none.
   * Counted per building type by `explainAuthority`; see the docblock.
   */
  authorityCapacity?: number;
  /**
   * Extra hammers this building puts behind one category of thing the city may
   * be building — the barracks' ten percent toward units. Absent means none.
   *
   * A signed **whole percent**, unlike the fraction the unit-only field it
   * replaced stored: the number is printed as a percentage everywhere it is
   * shown, and one representation shared with `ResourceEffect`'s
   * `productionBonus` is one fewer ×100 for a surface to forget.
   */
  productionBonus?: ProductionBonus;
  /** Tech-driven renewals. See `BuildingUpgrade` and the module docblock. */
  upgrades?: BuildingUpgrade[];
}

export interface BuildingData {
  buildings: Record<BuildingId, BuildingDef>;
}

export const BUILDING_DATA: BuildingData = buildingsJson as BuildingData;

export const BUILDING_IDS = Object.keys(BUILDING_DATA.buildings) as BuildingId[];

export function buildingDef(id: BuildingId): BuildingDef {
  return BUILDING_DATA.buildings[id];
}

/**
 * Runtime guard. Production queues arrive from save files and (eventually)
 * sockets, so a `BuildingId` may be any string at all.
 */
export function isBuildingId(value: unknown): value is BuildingId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(BUILDING_DATA.buildings, value)
  );
}

/**
 * "Monument" or "Monuments", for a line that counts them ("Monuments ×3").
 *
 * The sibling of `pluralUnitName` in `tech.ts` and the same bargain: a `plural`
 * field in the JSON would be the honest fix the day a name breaks the rules, and
 * until then a data field nobody could get wrong is a data field nobody should
 * have to fill in. Three rules cover this roster and the next one — a sibilant
 * takes "-es", a consonant plus "y" becomes "-ies", everything else takes "-s".
 */
export function buildingPlural(name: string, count: number): string {
  if (count === 1) return name;
  if (/(s|x|z|ch|sh)$/i.test(name)) return `${name}es`;
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}
