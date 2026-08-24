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

import type { FbmOptions, RidgedOptions } from './noise';
import type { ResourceConfig } from './resources';
import type { TerrainId } from './terrainData';
import type { RiverConfig } from './water';

/**
 * One noise layer's scale, stated one of two ways — exactly one of them.
 *
 * `frequency` is cycles around the world: the number of features is fixed and
 * each grows with the map, which is what continents and regional climate want.
 * `cycleTiles` is tiles per cycle: a feature's *size in hexes* is fixed and a
 * bigger map simply holds more of them, which is what anything the player reads
 * at hex scale wants — a range that must stay one or two tiles wide however
 * large the world is. See `mapgen.ts`'s `frequencyOf`.
 */
export interface NoiseScale {
  frequency?: number;
  cycleTiles?: number;
}

export interface NoiseConfig extends FbmOptions, NoiseScale {}

export interface RidgedNoiseConfig extends RidgedOptions, NoiseScale {}

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
  /**
   * Tunables that no longer exist, with what replaced them.
   *
   * JSON cannot carry a comment and a retired number cannot carry a docblock,
   * so the retirements live in the data as data. Read it as the file's own
   * changelog: anybody who comes looking for `elevation.mountains` because a
   * design note mentions it finds out here that the cut became a share, and
   * why, without having to bisect the generator.
   */
  retired: Record<string, string>;
  noise: {
    elevation: NoiseConfig;
    ridge: RidgedNoiseConfig;
    moistureRegional: NoiseConfig;
    moistureLocal: NoiseConfig;
  };
  elevation: {
    seaLevel: number;
    polarWaterLatitude: number;
    polarWaterElevationBonus: number;
    /** Share of **land** that is mountain. The top quantile of the relief field. */
    mountainShare: number;
    /** Share of land that is hills: the band immediately below the mountain cut. */
    hillShare: number;
    /** Weight of the ridged crest field in the relief mix. The ranges. */
    ridgeWeight: number;
    /** Weight of the continental field. Pulls the high ground inland. */
    continentWeight: number;
    /** Weight of continental steepness. Puts hills on escarpments. */
    gradientWeight: number;
    /** Power applied to a crest before the spine bias multiplies it. */
    ridgeSharpness: number;
    /**
     * Extra relief for a tile on the crest *line* of the ridge field, scaled by
     * how high that crest is. The knob that decides whether a range is a line
     * or a wall — see `crestLine`.
     */
    crestlineWeight: number;
    /** Share of its height a crest keeps on the beach, against 1 deep inland. */
    spineFloor: number;
    /** Hexes from water at which the spine bias starts to lift. */
    spineNearTiles: number;
    /** Hexes from water at which it is fully lifted. */
    spineFarTiles: number;
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
    /**
     * Share of the ground forest is *eligible* on — the right latitudes, the
     * right terrain, no jungle already there — that gets trees. Not a share of
     * land: eligible ground is about two thirds of it, so this reads roughly
     * two thirds as large in a terrain census. See `assignFeatures`.
     */
    forestShare: number;
    /** The same, over the equatorial band's eligible ground. */
    jungleShare: number;
    /** Exponent on the regional layer. Above the local one, regions dominate. */
    regionalWeight: number;
    /** Exponent on the local patch layer. Below 1 it only breaks the regions up. */
    localWeight: number;
    rainShadow: {
      /** Off skips the pass whole, leaving moisture bit-identical without it. */
      enabled: boolean;
      /** The hex direction the wind comes *from*. 3 is west; see `hex.ts`. */
      windDirection: number;
      /** How many hexes downwind of a range stay dry. */
      rangeTiles: number;
      /** Moisture removed immediately downwind, tapering to nothing at the range. */
      strength: number;
    };
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
