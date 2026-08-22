/**
 * Deterministic map generation.
 *
 * Every tunable lives in `data/mapgen.json`; this file only contains the
 * algorithm. Given the same `(seed, sizeName)` the output is bit-identical.
 *
 * Seamless east–west terrain
 * --------------------------
 * The map is a cylinder, so noise is sampled on the *surface* of that cylinder:
 * the column is turned into an angle θ = 2π·col/width and fed to 3D noise as
 * `(R·cos θ, y, R·sin θ)`. Column `width` therefore lands on exactly the same
 * noise coordinates as column 0 and the field is periodic — no visible seam.
 * The radius R = frequency / 2π keeps "frequency" meaning "noise units around
 * the world", and the y scale is corrected for hex row spacing (1.5·size)
 * versus column spacing (√3·size) so features are not vertically stretched.
 */

import mapgenJson from '../../data/mapgen.json';
import { SQRT3 } from './hex';
import {
  type GameMap,
  type Tile,
  createMap,
  offsetToAxial,
  tileNeighbors,
} from './map';
import { createNoise3D, fbm3, type FbmOptions, type Noise3D } from './noise';
import { type ResourceConfig, placeResources } from './resources';
import { makeRng, nextUint32 } from './rng';
import { isWaterTerrain, type FeatureId, type TerrainId } from './terrainData';
import {
  type RiverConfig,
  type RiverTrace,
  classifyLakes,
  computeFreshwater,
  traceRivers,
} from './water';

export interface NoiseConfig extends FbmOptions {
  /** Noise units around the full circumference of the world. */
  frequency: number;
}

export interface MapSizeConfig {
  label: string;
  width: number;
  height: number;
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

/**
 * Samples a fractal noise field on the cylinder for offset cell (col, row).
 *
 * Exactly periodic in `col` with period `width` (up to floating point error in
 * `Math.cos`/`Math.sin` at 2π), which is what keeps the seam invisible.
 * Exported so tests can assert that periodicity directly.
 */
export function sampleCylinder(
  noise: Noise3D,
  config: NoiseConfig,
  col: number,
  row: number,
  width: number,
): number {
  const theta = (col / width) * Math.PI * 2;
  const radius = config.frequency / (Math.PI * 2);
  // Noise units per column, then corrected for hex row-vs-column pixel spacing.
  const unitsPerCol = config.frequency / width;
  const y = row * unitsPerCol * (1.5 / SQRT3);
  return fbm3(noise, radius * Math.cos(theta), y, radius * Math.sin(theta), config);
}

/** 0 at the equator, 1 at either pole. */
export function latitudeOf(row: number, height: number): number {
  if (height <= 1) return 0;
  const half = (height - 1) / 2;
  return Math.min(1, Math.abs(row - half) / half);
}

/**
 * Replaces each value with its rank in [0, 1] (its percentile among all tiles).
 *
 * Rank normalisation is a monotone transform, so it preserves the shape of the
 * noise field exactly while making thresholds mean "a fraction of the map":
 * `seaLevel: 0.62` puts water on 62% of tiles on *every* seed. Plain min/max
 * normalisation left the land fraction swinging between 45% and 75% depending
 * on how extreme the field's outliers happened to be.
 */
export function rankNormalizeInPlace(values: Float64Array): void {
  const n = values.length;
  if (n === 0) return;

  const order: number[] = new Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  // Tie-break on index so the result never depends on sort implementation.
  order.sort((a, b) => values[a]! - values[b]! || a - b);

  const denominator = n > 1 ? n - 1 : 1;
  const ranked = new Float64Array(n);
  for (let rank = 0; rank < n; rank++) {
    ranked[order[rank]!] = rank / denominator;
  }
  values.set(ranked);
}

function pickLandTerrain(
  config: MapgenConfig,
  elevation: number,
  moisture: number,
  latitude: number,
): TerrainId {
  if (elevation >= config.elevation.mountains) return 'mountain';
  if (latitude >= config.latitude.snow) return 'snow';
  if (latitude >= config.latitude.tundra) return 'tundra';
  if (moisture < config.moisture.desertMax && latitude < config.latitude.desertMax) {
    return 'desert';
  }
  if (moisture < config.moisture.plainsMax) return 'plains';
  return 'grassland';
}

function pickFeature(
  config: MapgenConfig,
  terrain: TerrainId,
  moisture: number,
  latitude: number,
): FeatureId {
  if (terrain !== 'grassland' && terrain !== 'plains' && terrain !== 'tundra') {
    return 'none';
  }
  if (
    latitude <= config.latitude.jungleMax &&
    moisture >= config.moisture.jungleMin &&
    terrain !== 'tundra'
  ) {
    return 'jungle';
  }
  if (
    latitude >= config.latitude.forestMin &&
    latitude <= config.latitude.forestMax &&
    moisture >= config.moisture.forestMin
  ) {
    return 'forest';
  }
  return 'none';
}

/** A generated map together with the working data it does not keep. */
export interface MapDetail {
  map: GameMap;
  /** Every river that survived tracing, as corner paths. See `water.ts`. */
  rivers: RiverTrace[];
  /** How many water bodies were reclassified as lakes. */
  lakeCount: number;
}

/**
 * Generates a complete map. Fully deterministic in `(seed, sizeName)`.
 */
export function generateMap(seed: number, sizeName: string): GameMap {
  return generateMapDetail(seed, sizeName).map;
}

/**
 * The same generation, handing back the intermediate river traces.
 *
 * The map stores rivers as per-tile edge masks, which is the right shape for
 * every consumer but throws away the *paths* — and "did this river run downhill
 * the whole way" is a question only a path can answer. Rather than store paths
 * nobody plays with, generation offers them to whoever wants to look: the tests
 * that assert monotonic descent, and the statistics dumps. `generateMap` is this
 * function with the extras dropped, so there is exactly one generation path.
 */
export function generateMapDetail(seed: number, sizeName: string): MapDetail {
  const config = MAPGEN_CONFIG;
  const size = getMapSize(sizeName);
  const { width, height } = size;

  const map = createMap({ width, height, seed, sizeName });

  // Two independent noise fields, both derived from the one seed.
  const rng = makeRng(seed);
  const elevationNoise = createNoise3D(rng);
  // Advance the stream so moisture is decorrelated from elevation.
  nextUint32(rng);
  const moistureNoise = createNoise3D(rng);

  const count = width * height;
  const elevation = new Float64Array(count);
  const moisture = new Float64Array(count);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      elevation[i] = sampleCylinder(elevationNoise, config.noise.elevation, col, row, width);
      moisture[i] = sampleCylinder(moistureNoise, config.noise.moisture, col, row, width);
    }
  }

  rankNormalizeInPlace(elevation);
  rankNormalizeInPlace(moisture);

  // Pass 1: elevation/moisture/latitude -> terrain, hills, features.
  for (let row = 0; row < height; row++) {
    const latitude = latitudeOf(row, height);
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const tile = map.tiles[i]!;

      let e = elevation[i]!;
      // Ice caps: nudge the polar rows upward so the poles read as land/ice
      // rather than open water.
      if (latitude >= config.elevation.polarWaterLatitude) {
        e = Math.min(1, e + config.elevation.polarWaterElevationBonus);
      }
      const m = moisture[i]!;

      tile.elevation = e;
      tile.moisture = m;

      if (e < config.elevation.seaLevel) {
        tile.terrain = 'ocean';
        tile.feature = 'none';
        tile.hills = false;
        continue;
      }

      const terrain = pickLandTerrain(config, e, m, latitude);
      tile.terrain = terrain;
      tile.hills =
        terrain !== 'mountain' &&
        e >= config.elevation.hills &&
        e < config.elevation.mountains;
      tile.feature = pickFeature(config, terrain, m, latitude);
    }
  }

  // Pass 2: small inland water bodies become lakes. Before the coast pass, and
  // that order is the whole point — see `classifyLakes` in `water.ts`.
  const lakeCount = classifyLakes(map, config.lakes.maxSize);

  // Pass 3: water adjacent to land becomes coast. Wrap-aware via tileNeighbors.
  //
  // The `!== 'ocean'` guard is load-bearing now that lakes exist: `coast` is a
  // marine terrain and a lake must never mint one. A lake tile is skipped as a
  // *source* (it is not ocean), and it cannot promote its neighbours either,
  // because a lake is a maximal water body — no ocean tile is ever next to one.
  const coastal: Tile[] = [];
  for (const tile of map.tiles) {
    if (tile.terrain !== 'ocean') continue;
    const neighbors = tileNeighbors(map, tile);
    if (neighbors.some((n) => !isWaterTerrain(n.terrain))) coastal.push(tile);
  }
  for (const tile of coastal) tile.terrain = 'coast';

  // Pass 4: rivers. The generator's only dice, and they are rolled *after* both
  // noise fields have been drawn from `rng`, so every tile's terrain is exactly
  // what it was before rivers existed.
  const rivers = traceRivers(map, rng, config.rivers);

  // Pass 5: who can drink. Derived from everything above, and rolls nothing.
  computeFreshwater(map);

  // Pass 6: resources. The generator's *second* set of dice, and they are rolled
  // after the rivers' for exactly the reason the rivers' were rolled after the
  // noise: every draw made here is a draw nothing before it can see, so terrain,
  // hills, features and river edges on a given seed are bit-identical to what
  // they were before resources existed. Adding a pass must never move the
  // ground. See `resources.ts`.
  placeResources(map, rng, config.resources);

  return { map, rivers, lakeCount };
}

/** Convenience for the UI: axial coordinates of a tile. */
export function tileAxial(tile: Tile) {
  return offsetToAxial(tile.col, tile.row);
}
