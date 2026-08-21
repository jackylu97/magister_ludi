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
 * `culture`, `sciencePerPop` — rather than a named behaviour the simulation
 * switches on. That is a deliberate ceiling: everything Milestone 3 needs is a
 * sum, and a sum can be read out of a data file, totalled in one place
 * (`cityYields` in `cities.ts`) and displayed in the city panel without any
 * module knowing that a granary is a granary. When a building eventually needs
 * a behaviour rather than a number, it gets a field naming that behaviour — not
 * a callback in the JSON, which would stop being data.
 *
 * `sciencePerPop` is fractional (a library is "+1 per 2 pop", stored as 0.5)
 * and is floored at the point it is applied, per building, so two half-science
 * buildings do not round into a free point. See `cityYields`.
 *
 * One of each per city. Nothing here says so — that is a city rule and it lives
 * in the `setCityProduction` validation and in `advanceProduction`.
 */

import buildingsJson from '../../data/buildings.json';

export type BuildingId = 'monument' | 'granary' | 'library';

export interface BuildingDef {
  name: string;
  /** Hammers to complete. */
  cost: number;
  /** Flat food added to the city's total every turn. */
  food: number;
  /** Flat culture added to the city's total every turn. */
  culture: number;
  /** Science per population point, floored when applied. See the docblock. */
  sciencePerPop: number;
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
