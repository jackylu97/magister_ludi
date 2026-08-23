/**
 * Typed access to `data/mapgen.json`.
 *
 * The sibling of `rulesData.ts` and `resourceData.ts`, and it exists for the
 * same reason all of them do: the JSON is the single source of truth for every
 * number the generator uses, and this file only types it.
 *
 * Why it is not simply the top of `mapgen.ts`
 * -------------------------------------------
 * It was, until start placement grew a real site score. `startPositions.ts`
 * needs these tunables; `resources.ts` needs `startPositions.ts` for its
 * fairness passes; `mapgen.ts` needs `resources.ts` — so a config that lived in
 * `mapgen.ts` would close a **load-time** cycle, and whichever module happened
 * to evaluate second would read an uninitialised binding. Splitting the table
 * out breaks it at the only point where breaking it costs nothing: this module
 * imports one JSON file and two type-only names, and can therefore always be
 * evaluated first.
 *
 * `mapgen.ts` re-exports everything here, so nothing that already imported
 * `MAPGEN_CONFIG` or `getMapSize` from it had to change.
 */

import mapgenJson from '../../data/mapgen.json';

import type { FbmOptions } from './noise';
import type { ResourceConfig } from './resources';
import type { TerrainId } from './terrainData';
import type { RiverConfig } from './water';

export interface NoiseConfig extends FbmOptions {
  /** Noise units around the full circumference of the world. */
  frequency: number;
}

export interface MapSizeConfig {
  label: string;
  width: number;
  height: number;
}

/**
 * How a start site is scored and which sites are refused outright.
 *
 * Every number a designer would reach for while looking at a bad start, and
 * nothing else: the weights that say what "good ground" means, the two site
 * bonuses the settler lens already paints, the floor a site has to clear, and
 * the three hard rejections. See `startPositions.ts` for the algorithm these
 * feed, which contains no numbers at all.
 */
export interface StartsConfig {
  /**
   * Minimum distance between starts, as a multiple of `sqrt(land tiles)`, then
   * clamped to `[minDistance, maxDistance]`.
   *
   * Scaled to the **map** and never to the player count, which is a load-bearing
   * choice rather than an approximation: the resource fairness passes seat the
   * maximum roster and guarantee food and luxuries at those sites, and that
   * guarantee only covers a real game if a two-player game's starts are a prefix
   * of the twelve-player game's. They are, exactly, because the greedy sweep is
   * identical and only stops earlier.
   */
  spacingFactor: number;
  minDistance: number;
  maxDistance: number;
  /**
   * What a ring of tiles is worth relative to the site itself, ring 1 first.
   * Two entries today; the length of the list *is* how many rings are scored,
   * so a third ring is a data edit.
   */
  ringWeights: number[];
  /**
   * How many ring tiles are scored: the best this many, not all of them. A
   * young city's citizens, roughly — see `scoreStartSite`.
   */
  workedTiles: number;
  /** What the site's own tile is worth, against a ring tile's 1. */
  centreWeight: number;
  /** Relative worth of the three tile yields when scoring ground. */
  foodWeight: number;
  productionWeight: number;
  goldWeight: number;
  /** Flat bonus for a site on fresh water — the growth site bonus (Entry I.b). */
  freshwaterBonus: number;
  /** Flat bonus for a coastal site — the authority discount (Entry I.b). */
  coastBonus: number;
  /** Food the scored tiles must carry between them before a site is accepted. */
  minRingFood: number;
  /** Production the scored tiles must carry. The other half of "workable". */
  minRingProduction: number;
  /** Terrain nobody should have to start on, or be surrounded by. */
  hostileTerrain: TerrainId[];
  /** Share of the scored rings that may be `hostileTerrain` before refusal. */
  maxHostileRingShare: number;
  /** Share of the scored rings that may be water before refusal. */
  maxWaterRingShare: number;
}

export interface MapgenConfig {
  sizes: Record<string, MapSizeConfig>;
  noise: { elevation: NoiseConfig; moisture: NoiseConfig };
  elevation: {
    seaLevel: number;
    hills: number;
    mountains: number;
    polarWaterLatitude: number;
    polarWaterElevationBonus: number;
  };
  latitude: {
    snow: number;
    tundra: number;
    desertMax: number;
    jungleMax: number;
    forestMin: number;
    forestMax: number;
  };
  moisture: {
    desertMax: number;
    plainsMax: number;
    forestMin: number;
    jungleMin: number;
  };
  lakes: {
    /** Water bodies of at most this many tiles become lakes. See `water.ts`. */
    maxSize: number;
  };
  rivers: RiverConfig;
  resources: ResourceConfig;
  starts: StartsConfig;
}

export const MAPGEN_CONFIG: MapgenConfig = mapgenJson as MapgenConfig;

export const MAP_SIZE_NAMES = Object.keys(MAPGEN_CONFIG.sizes);

export function getMapSize(sizeName: string): MapSizeConfig {
  const size = MAPGEN_CONFIG.sizes[sizeName];
  if (!size) {
    throw new Error(
      `Unknown map size "${sizeName}". Known sizes: ${MAP_SIZE_NAMES.join(', ')}`,
    );
  }
  return size;
}
