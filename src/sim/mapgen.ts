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
 *
 * Two fields, everything else derived
 * -----------------------------------
 * The generator draws exactly two *geographies* and reads every terrain
 * decision off them. That is the difference between a world and a pile of
 * independent scatters: a forest is where it is because that part of the
 * continent is wet, and a hill is where it is because a range runs past it.
 *
 * **Relief** is built from three ranked components mixed by weight
 * (`elevation.ridgeWeight` / `continentWeight` / `gradientWeight`):
 *
 *   1. a *ridged multifractal* (`ridged3`), whose crests are connected **lines**
 *      rather than blobs — this is what a mountain range is;
 *   2. the continental field itself, which biases those crests inland, onto the
 *      high spine of a landmass, so a range separates one half of a continent
 *      from the other instead of decorating a beach;
 *   3. the local steepness of the continental field, so an escarpment reads as
 *      hills even where no crest runs under it.
 *
 * The mix is then **ranked among land tiles**, and the two terrain cuts are
 * *quantiles of that rank*: the top `mountainShare` of land is mountain, the
 * band of `hillShare` below it is hills. Shares rather than absolute heights,
 * because "5% of the land is mountain" is the sentence a designer actually
 * wants to write, and because a quantile is stable across seeds and sizes where
 * an absolute cut on a rank-normalised field is only stable across seeds.
 *
 * Hills therefore *are* the flank band of the same field the peaks came from:
 * foothills hug every range for free, and the lesser crests that never reach
 * the mountain cut surface as standalone hill chains through the interior.
 *
 * **Moisture** is two scales multiplied: a low-frequency *regional* layer (this
 * part of the world is wooded country, that part is open steppe) times a
 * fine-grained *local* layer (copses and clearings). Multiplication rather than
 * addition is the point — a wood needs the region *and* the patch to be wet, so
 * forest concentrates into real regions instead of dusting the map evenly.
 * Optional rain shadow then dries the tiles downwind of a range before the
 * field is ranked, which is what puts a desert on the lee side of mountains.
 *
 * Feature size versus feature count
 * ---------------------------------
 * A noise layer says its scale one of two ways, and which one it picks is a
 * design decision rather than a unit conversion. `frequency` is cycles around
 * the *world*: the count of features is fixed and each one grows with the map,
 * which is right for continents and for regional climate. `cycleTiles` is tiles
 * per cycle: the *size* of a feature is fixed in tiles and a bigger map simply
 * holds more of them, which is right for anything the player reads at hex scale
 * — ranges that must stay one or two tiles wide, copses that must stay copses.
 */

import { SQRT3, type Hex } from './hex';
import {
  type GameMap,
  type Tile,
  createMap,
  offsetToAxial,
  tileHex,
  tileNeighbors,
  wrappedDistance,
} from './map';
import {
  MAPGEN_CONFIG,
  MAP_SIZE_NAMES,
  type MapgenConfig,
  type MapgenOverrides,
  type MapSizeConfig,
  type NoiseConfig,
  type RidgedNoiseConfig,
  type StartsConfig,
  getMapSize,
  mapgenFor,
  resolveMapgenConfig,
} from './mapgenData';
import { createNoise3D, fbm3, ridged3, type Noise3D } from './noise';
import { placeResources } from './resources';
import { makeRng, nextUint32 } from './rng';
import { isWaterTerrain, type FeatureId, type TerrainId } from './terrainData';
import {
  type RiverTrace,
  classifyLakes,
  computeFreshwater,
  deriveFloodplains,
  neighborInDirection,
  traceRivers,
} from './water';

/**
 * The tunables, re-exported from `mapgenData.ts` so that every call site that
 * ever asked *this* module for them still can. They moved out to break a
 * load-time cycle and nothing else — see that file's docblock.
 */
export {
  MAPGEN_CONFIG,
  MAP_SIZE_NAMES,
  type MapgenConfig,
  type MapgenOverrides,
  type MapSizeConfig,
  type NoiseConfig,
  type RidgedNoiseConfig,
  type StartsConfig,
  getMapSize,
  mapgenFor,
  resolveMapgenConfig,
};

/**
 * How many noise cycles fit around the world for this layer.
 *
 * A layer states its scale as either `frequency` (cycles around the world) or
 * `cycleTiles` (tiles per cycle); see the module docblock for why both exist.
 * `cycleTiles` wins when both are present, which is only ever a transitional
 * state while a layer is being retuned.
 */
export function frequencyOf(config: NoiseConfig, width: number): number {
  if (config.cycleTiles !== undefined) return width / config.cycleTiles;
  if (config.frequency !== undefined) return config.frequency;
  throw new Error('noise layer needs either "frequency" or "cycleTiles"');
}

/** Where offset cell (col, row) sits on the noise cylinder for this layer. */
function cylinderPoint(
  config: NoiseConfig,
  col: number,
  row: number,
  width: number,
): { x: number; y: number; z: number } {
  const frequency = frequencyOf(config, width);
  const theta = (col / width) * Math.PI * 2;
  const radius = frequency / (Math.PI * 2);
  // Noise units per column, then corrected for hex row-vs-column pixel spacing.
  const unitsPerCol = frequency / width;
  return {
    x: radius * Math.cos(theta),
    y: row * unitsPerCol * (1.5 / SQRT3),
    z: radius * Math.sin(theta),
  };
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
  const p = cylinderPoint(config, col, row, width);
  return fbm3(noise, p.x, p.y, p.z, config);
}

/**
 * The same sampling for a ridged layer. Shares `cylinderPoint`, so a ridge is
 * periodic across the seam for exactly the reason the continents are — a range
 * may run off the east edge and back on at the west, and it does.
 */
export function sampleRidgedCylinder(
  noise: Noise3D,
  config: RidgedNoiseConfig,
  col: number,
  row: number,
  width: number,
): number {
  const p = cylinderPoint(config, col, row, width);
  return ridged3(noise, p.x, p.y, p.z, config);
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

/**
 * The same normalisation restricted to a subset — the rank of each selected
 * value *among the selected values*, in [0, 1]; 0 for everything else.
 *
 * The whole reason the terrain cuts can be shares. A quantile of the land is
 * meaningless on a field ranked over the whole map, because how much of that
 * map is ocean moves with the seed and with the ice caps; ranked over the land
 * alone, "the top 5%" is 5% of the land on every seed and every size.
 */
export function rankAmong(values: Float64Array, mask: Uint8Array): Float64Array {
  const ranked = new Float64Array(values.length);
  const order: number[] = [];
  for (let i = 0; i < values.length; i++) if (mask[i]) order.push(i);
  if (order.length === 0) return ranked;
  order.sort((a, b) => values[a]! - values[b]! || a - b);
  const denominator = order.length > 1 ? order.length - 1 : 1;
  for (let rank = 0; rank < order.length; rank++) {
    ranked[order[rank]!] = rank / denominator;
  }
  return ranked;
}

/** Hermite smoothstep of `value` across [edge0, edge1], clamped to [0, 1]. */
function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Hexes from each land tile to the nearest water, by a wrap-aware BFS.
 *
 * The measure of "how far inland" a tile is, and therefore of where a
 * continent's spine runs: the crest of this field is the medial axis of the
 * landmass. Water is 0 and land off in the deep interior is large; a tile with
 * no water anywhere (a map with no sea at all) keeps the sentinel.
 *
 * Seeded from every water tile at once in tile-index order and drained with an
 * index-ordered queue, so the result is a pure function of the coastline rather
 * than of the order a Set happened to iterate.
 */
export function waterDistance(map: GameMap, land: Uint8Array): Int32Array {
  const distance = new Int32Array(land.length).fill(-1);
  const queue: number[] = [];
  for (let i = 0; i < land.length; i++) {
    if (!land[i]) {
      distance[i] = 0;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]!;
    const next = distance[index]! + 1;
    for (const neighbor of tileNeighbors(map, map.tiles[index]!)) {
      const at = neighbor.row * map.width + neighbor.col;
      if (distance[at]! >= 0) continue;
      distance[at] = next;
      queue.push(at);
    }
  }
  return distance;
}

/**
 * Mean absolute difference between a tile's value and its neighbours'.
 *
 * The local steepness of the continental field — a coarse gradient magnitude,
 * and coarse is the right grain: it exists to notice escarpments and shelf
 * edges, not to differentiate the noise.
 */
function localGradient(map: GameMap, values: Float64Array): Float64Array {
  const gradient = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const tile = map.tiles[i]!;
    let sum = 0;
    let count = 0;
    for (const neighbor of tileNeighbors(map, tile)) {
      sum += Math.abs(values[neighbor.row * map.width + neighbor.col]! - values[i]!);
      count++;
    }
    gradient[i] = count === 0 ? 0 : sum / count;
  }
  return gradient;
}

/**
 * Tiles that sit on the *crest line* of a field rather than merely high on it.
 *
 * A hex has three axes, and a tile is on a ridge exactly when the field falls
 * away from it in **both** directions along at least one of them: that is what
 * "the top of the ridge, looking across it" means, and it is a one-tile-wide
 * locus by construction however broad and however tall the ridge is.
 *
 * This is the difference between a range and a wall. Thresholding height alone
 * cannot make a thin range, because how wide the set above a threshold comes
 * out depends on how steep that particular massif happens to be — a tall broad
 * dome hands over a four-hex blob and a sharp crease hands over a line, and no
 * amount of moving the threshold reconciles the two. Marking the skeleton lets
 * the relief mix *prefer* the line, so the mountain quantile spends its budget
 * along ridges instead of filling in the fattest one.
 *
 * Strict on both sides. A tolerant `>=` looks kinder to a flat-topped crest but
 * is much worse in practice: on a plain slope it only takes *one* axis with an
 * equal-valued neighbour for a tile to qualify, so a tolerant rule marks whole
 * hillsides and the skeleton stops being a skeleton. On a real noise field the
 * two values are never exactly equal anyway, so nothing is lost.
 */
export function crestLine(map: GameMap, field: Float64Array, land: Uint8Array): Uint8Array {
  const on = new Uint8Array(field.length);
  for (let i = 0; i < field.length; i++) {
    if (!land[i]) continue;
    const tile = map.tiles[i]!;
    for (let axis = 0; axis < 3; axis++) {
      const ahead = neighborInDirection(map, tile, axis);
      const behind = neighborInDirection(map, tile, axis + 3);
      if (!ahead || !behind) continue;
      const a = field[ahead.row * map.width + ahead.col]!;
      const b = field[behind.row * map.width + behind.col]!;
      if (field[i]! > a && field[i]! > b) {
        on[i] = 1;
        break;
      }
    }
  }
  return on;
}

/**
 * The two coherent fields the whole generator reads, plus the classifications
 * taken straight off them. Terrain assignment is a lookup in this and latitude.
 */
export interface TerrainFields {
  /** Continental noise, rank-normalised, with the polar ice bonus applied. */
  base: Float64Array;
  /** 1 where `base` clears sea level. The coastline, decided by continents alone. */
  land: Uint8Array;
  /** Final tile elevation: `base` at sea, land re-ranked into [seaLevel, 1]. */
  elevation: Float64Array;
  /** Rank of each land tile's relief among land tiles. 0 on water. */
  relief: Float64Array;
  /** 1 on the mountain quantile of `relief`. */
  mountain: Uint8Array;
  /** 1 on the flank band immediately below it. */
  hills: Uint8Array;
  /** Final tile moisture, rank-normalised over the whole map. */
  moisture: Float64Array;
  /**
   * The **local** moisture layer alone, ranked, before it was multiplied into
   * the regional one. Copses and clearings with the climate taken back out.
   *
   * Kept because the oasis needs exactly this and nothing else can supply it.
   * An oasis is a *local* high water table inside *regionally* arid country, and
   * the combined field cannot express that: it is `regional × local`, so the
   * wettest tiles of any desert are the ones whose **regional** value was
   * nearly high enough to stop being desert at all — a rim around the edge of
   * every sand sea, which is precisely where an oasis is not. Ranked on the
   * local layer instead, the wettest desert is the patch in the middle of it.
   */
  localMoisture: Float64Array;
}

/** The four noise layers, drawn once from the seed. */
interface Layers {
  elevation: Noise3D;
  ridge: Noise3D;
  regionalMoisture: Noise3D;
  localMoisture: Noise3D;
}

/**
 * How much drier a tile is for standing in the lee of a range.
 *
 * Walks upwind one hex at a time and stops at the first mountain it meets, so
 * the strength falls off with how far downwind the tile sits — the near side of
 * a rain shadow is a desert and the far side is merely dry. Returns 0 when the
 * feature is off, which is the only thing `enabled` does: the pass is skipped
 * whole rather than tuned to zero, so a disabled rain shadow costs nothing and
 * leaves the moisture field bit-identical to a build that never had one.
 */
function rainShadowAt(
  map: GameMap,
  tile: Tile,
  mountain: Uint8Array,
  config: MapgenConfig['moisture']['rainShadow'],
): number {
  if (!config.enabled) return 0;
  let current: Tile | undefined = tile;
  for (let step = 1; step <= config.rangeTiles; step++) {
    current = neighborInDirection(map, current, config.windDirection);
    if (!current) return 0;
    if (mountain[current.row * map.width + current.col]) {
      // Nearest range wins: step 1 takes the full strength, the last step in
      // range takes almost none.
      return config.strength * (1 - (step - 1) / config.rangeTiles);
    }
  }
  return 0;
}

/**
 * Builds both fields and the elevation classifications, in the one order they
 * can be built in: the coastline comes from the continents alone, relief is
 * then ranked over the land that coastline defines, and moisture is drawn last
 * because the rain shadow has to know where the ranges are.
 *
 * Exported for the property tests, which assert things about the *fields* that
 * no amount of staring at finished terrain can pin down.
 */
export function buildTerrainFields(
  map: GameMap,
  config: MapgenConfig,
  layers: Layers,
): TerrainFields {
  const { width, height } = map;
  const count = width * height;

  // --- the continents, and therefore the coastline -------------------------
  const base = new Float64Array(count);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      base[row * width + col] = sampleCylinder(layers.elevation, config.noise.elevation, col, row, width);
    }
  }
  rankNormalizeInPlace(base);

  const land = new Uint8Array(count);
  for (let row = 0; row < height; row++) {
    const latitude = latitudeOf(row, height);
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      // Ice caps: nudge the polar rows upward so the poles read as land/ice
      // rather than open water. Before the sea-level test, so the caps are
      // land for every later pass as well.
      if (latitude >= config.elevation.polarWaterLatitude) {
        base[i] = Math.min(1, base[i]! + config.elevation.polarWaterElevationBonus);
      }
      land[i] = base[i]! >= config.elevation.seaLevel ? 1 : 0;
    }
  }

  // --- relief: ridge lines, pulled inland, plus continental steepness -------
  const crestRaw = new Float64Array(count);
  /** The same crest before the spine bias — what the skeleton is read off. */
  const crestPure = new Float64Array(count);
  const distance = waterDistance(map, land);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      if (!land[i]) continue;
      const crest = sampleRidgedCylinder(layers.ridge, config.noise.ridge, col, row, width);
      // Sharpening thins the top of the crest before it is ever thresholded: a
      // power above 1 pulls everything below the maximum down harder than the
      // maximum itself, which is the difference between a range one hex wide
      // and a range four hexes wide.
      const sharp = Math.pow(crest, config.elevation.ridgeSharpness);
      crestPure[i] = sharp;
      // The spine bias. A crest well inland keeps its full height; one on the
      // beach keeps `spineFloor` of it — enough that a strong line still makes
      // a small coastal range, not enough that it competes with the interior.
      const inland = distance[i]! < 0 ? 1 : distance[i]!;
      const spine = smoothstep(
        config.elevation.spineNearTiles,
        config.elevation.spineFarTiles,
        inland,
      );
      crestRaw[i] = sharp * (config.elevation.spineFloor + (1 - config.elevation.spineFloor) * spine);
    }
  }

  const gradientRaw = localGradient(map, base);
  const crestRank = rankAmong(crestRaw, land);
  const gradientRank = rankAmong(gradientRaw, land);
  const baseRank = rankAmong(base, land);
  // Read off the *unbiased* crest, deliberately. The spine bias is a function of
  // distance from water, so it steps up in bands that run parallel to the coast
  // — ask the skeleton about the biased field and it finds ridges in those
  // bands, which are an artefact of the mask rather than anything in the ridge
  // noise. Being on a ridge is a fact about the ridge field; how much that ridge
  // is worth is the mask's business, and it has its say in the mix below.
  const onCrest = crestLine(map, crestPure, land);

  const mixed = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    if (!land[i]) continue;
    mixed[i] =
      crestRank[i]! * config.elevation.ridgeWeight +
      baseRank[i]! * config.elevation.continentWeight +
      gradientRank[i]! * config.elevation.gradientWeight +
      // Lifted onto the ridge line, and lifted *in proportion to how high the
      // ridge is*: a strong crest keeps its whole spine, a faint one gets a
      // nudge that runs out before the mountain cut. That proportionality is
      // what makes ranges taper at their ends instead of stopping square.
      (onCrest[i] ? crestRank[i]! * config.elevation.crestlineWeight : 0);
  }
  const relief = rankAmong(mixed, land);

  // The two cuts, as quantiles of the land. `mountainCut` is above `hillCut`,
  // so the bands are adjacent by construction and a hill is *always* the flank
  // of whatever crest stands next to it.
  const mountainCut = 1 - config.elevation.mountainShare;
  const hillCut = mountainCut - config.elevation.hillShare;
  const mountain = new Uint8Array(count);
  const hills = new Uint8Array(count);
  const elevation = new Float64Array(count);
  const { seaLevel } = config.elevation;
  for (let i = 0; i < count; i++) {
    if (!land[i]) {
      // Water keeps its continental height, which is below sea level by
      // definition — so elevation stays monotone across the shoreline and a
      // river still finds the sea downhill of everything.
      elevation[i] = base[i]!;
      continue;
    }
    elevation[i] = seaLevel + (1 - seaLevel) * relief[i]!;
    if (relief[i]! >= mountainCut) mountain[i] = 1;
    else if (relief[i]! >= hillCut) hills[i] = 1;
  }

  // --- moisture: a region times a patch, dried in the lee of the ranges -----
  const moisture = new Float64Array(count);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      // Both layers are rank-normalised below; sampling them into one array
      // each first is what lets "regional × local" mean the product of two
      // comparable [0, 1] fields rather than of two raw fbm outputs whose
      // spreads happen to differ.
      moisture[i] = sampleCylinder(
        layers.regionalMoisture,
        config.noise.moistureRegional,
        col,
        row,
        width,
      );
    }
  }
  rankNormalizeInPlace(moisture);
  const regional = Float64Array.from(moisture);

  const local = new Float64Array(count);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      local[i] = sampleCylinder(layers.localMoisture, config.noise.moistureLocal, col, row, width);
    }
  }
  rankNormalizeInPlace(local);

  for (let i = 0; i < count; i++) {
    // Exponents rather than a blend: raising a [0, 1] field to a power below 1
    // flattens its say and above 1 sharpens it, and the *product* is still a
    // product — a tile has to be in wet country and on a wet patch to be wet.
    const wet =
      Math.pow(regional[i]!, config.moisture.regionalWeight) *
      Math.pow(local[i]!, config.moisture.localWeight);
    const shadow = rainShadowAt(map, map.tiles[i]!, mountain, config.moisture.rainShadow);
    moisture[i] = wet * (1 - shadow);
  }
  rankNormalizeInPlace(moisture);

  return { base, land, elevation, relief, mountain, hills, moisture, localMoisture: local };
}

function pickLandTerrain(
  config: MapgenConfig,
  isMountain: boolean,
  moisture: number,
  latitude: number,
): TerrainId {
  if (isMountain) return 'mountain';
  if (latitude >= config.latitude.snow) return 'snow';
  if (latitude >= config.latitude.tundra) return 'tundra';
  if (moisture < config.moisture.desertMax && latitude < config.latitude.desertMax) {
    return 'desert';
  }
  if (moisture < config.moisture.plainsMax) return 'plains';
  return 'grassland';
}

/** Can a tree of this kind stand here at all, before moisture has its say? */
function jungleEligible(tile: Tile, latitude: number, config: MapgenConfig): boolean {
  return (
    (tile.terrain === 'grassland' || tile.terrain === 'plains') &&
    latitude <= config.latitude.jungleMax
  );
}

function forestEligible(tile: Tile, latitude: number, config: MapgenConfig): boolean {
  return (
    (tile.terrain === 'grassland' || tile.terrain === 'plains' || tile.terrain === 'tundra') &&
    latitude >= config.latitude.forestMin &&
    latitude <= config.latitude.forestMax &&
    tile.feature === 'none'
  );
}

/**
 * Dresses the wettest share of each feature's eligible ground.
 *
 * A **share of what is eligible**, not a cut on the moisture value, and the
 * difference is the whole reason jungle used to be absent from one seed and
 * cover half the tropics on the next. Moisture is rank-normalised over the map,
 * so a fixed `jungleMin` asks "is this tile wetter than 82% of the *world*" —
 * a question whose answer inside the equatorial band depends entirely on where
 * this seed happened to put its wet regions. Ranking within the band instead
 * asks "is this among the wettest tenth of the tropics", which is the sentence
 * the design ledger actually wanted, and it holds on every seed.
 *
 * What it deliberately does *not* flatten is *where* the trees go. The regional
 * moisture layer still decides which parts of the band are rainforest and which
 * are savannah; only the total is pinned. A share fixes how much wood the world
 * has, and the field fixes where it is — which is the same division of labour
 * the mountain and hill cuts use one field over.
 *
 * Jungle is dealt before forest and takes its tiles out of forest's eligible
 * set, so the tropics read as jungle-then-clearing rather than as two features
 * competing for one hex.
 */
function assignFeatures(map: GameMap, config: MapgenConfig, fields: TerrainFields): void {
  const deal = (
    eligible: (tile: Tile, latitude: number) => boolean,
    share: number,
    feature: FeatureId,
  ): void => {
    const candidates: number[] = [];
    for (let i = 0; i < map.tiles.length; i++) {
      if (!fields.land[i]) continue;
      const tile = map.tiles[i]!;
      if (!eligible(tile, latitudeOf(tile.row, map.height))) continue;
      candidates.push(i);
    }
    // Wettest first, ties by index — moisture is a rank so ties cannot happen,
    // but the comparator says so anyway rather than trusting that.
    candidates.sort((a, b) => fields.moisture[b]! - fields.moisture[a]! || a - b);
    const take = Math.round(candidates.length * share);
    for (let n = 0; n < take; n++) map.tiles[candidates[n]!]!.feature = feature;
  };

  deal((tile, latitude) => jungleEligible(tile, latitude, config), config.moisture.jungleShare, 'jungle');
  deal((tile, latitude) => forestEligible(tile, latitude, config), config.moisture.forestShare, 'forest');
  assignOases(map, config, fields);
}

/**
 * Scatters oases over the flat desert. Rolls nothing.
 *
 * The same "share of eligible ground" bargain the trees make — `oasisShare` of
 * the flat, featureless desert gets a pool — with two differences, and both are
 * what makes a scatter read as a scatter rather than as a patch.
 *
 * **The field is the local moisture layer**, not the combined one. See
 * `TerrainFields.localMoisture`: an oasis is a local high water table inside
 * regionally arid country, and asking the combined field for "the wettest
 * desert" hands back the *margin* of every desert, which is the one place an
 * oasis has no reason to be.
 *
 * **And there is a spacing rule.** The wettest tiles of a noise layer are
 * contiguous, so a share taken straight off the ranking would deal three or four
 * oases in one clump and none for forty hexes — a lake with palm trees, not a
 * chain of watering holes. Candidates are therefore swept wettest first and one
 * is taken only if it stands `oasisSpacing` hexes from every oasis already
 * placed, which is the same rejection-sampling discipline the resource scatter
 * uses (`resources.ts`) and is deterministic for the same reason: the sweep
 * order is total (rank, then tile index) and nothing is nudged.
 *
 * The share is counted against the *eligible* set before spacing thins it, so
 * `oasisShare` is a ceiling rather than a promise — dense desert seats all of
 * it, a thin ribbon of desert seats what it has room for. That is the honest
 * behaviour: the alternative is a pass that keeps searching until it hits a
 * quota and packs the last few in at the spacing floor.
 */
function assignOases(map: GameMap, config: MapgenConfig, fields: TerrainFields): void {
  const candidates: number[] = [];
  for (let i = 0; i < map.tiles.length; i++) {
    const tile = map.tiles[i]!;
    if (tile.terrain !== 'desert' || tile.hills || tile.feature !== 'none') continue;
    candidates.push(i);
  }
  // Wettest local patch first, ties by index. The tie-break cannot fire on a
  // rank, but it says so rather than trusting the sort.
  candidates.sort((a, b) => fields.localMoisture[b]! - fields.localMoisture[a]! || a - b);

  const take = Math.round(candidates.length * config.moisture.oasisShare);
  const spacing = config.moisture.oasisSpacing;
  const placed: Hex[] = [];
  for (const index of candidates) {
    if (placed.length >= take) break;
    const tile = map.tiles[index]!;
    const hex = tileHex(tile);
    if (placed.some((other) => wrappedDistance(map, hex, other) < spacing)) continue;
    tile.feature = 'oasis';
    placed.push(hex);
  }
}

/** A generated map together with the working data it does not keep. */
export interface MapDetail {
  map: GameMap;
  /** Every river that survived tracing, as corner paths. See `water.ts`. */
  rivers: RiverTrace[];
  /** How many water bodies were reclassified as lakes. */
  lakeCount: number;
  /** How many desert tiles the rivers and oases turned into floodplain. */
  floodplainCount: number;
}

/**
 * Generates a complete map. Fully deterministic in
 * `(seed, sizeName, overrides)`.
 *
 * `overrides` is the sparse edit of `data/mapgen.json` a tuning session is
 * trying (see `resolveMapgenConfig`). It is a *third input*, not a mode: the
 * sheet is carried on the map and in the game config, so a map generated with
 * one regenerates identically from the same config. Absent on every ordinary
 * game.
 */
export function generateMap(
  seed: number,
  sizeName: string,
  overrides?: MapgenOverrides,
): GameMap {
  return generateMapDetail(seed, sizeName, overrides).map;
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
export function generateMapDetail(
  seed: number,
  sizeName: string,
  overrides?: MapgenOverrides,
): MapDetail {
  // Resolved once, here, and handed down — every pass below reads *this*
  // config and never the module table, which is what lets an override sheet
  // exist without anything being written to `MAPGEN_CONFIG`.
  const config = resolveMapgenConfig(overrides);
  const size = getMapSize(sizeName);
  const { width, height } = size;

  // A sheet that says nothing is not a sheet. `resolveMapgenConfig` hands the
  // module table back *by identity* when there was nothing to merge, so this is
  // the one test that matters: a map generated with `{}` must serialise exactly
  // like one generated without the argument at all.
  const sheet = config === MAPGEN_CONFIG ? undefined : overrides;

  // The sheet rides on the map, because the passes that run *after* generation
  // — the start chooser, the resource guarantees, the inspection report — are
  // handed a map and nothing else. See `GameMap.mapgenOverrides`.
  const map = createMap({ width, height, seed, sizeName, mapgenOverrides: sheet });

  // Four noise layers, all derived from the one seed, each separated from the
  // last by a discarded draw so the permutation tables are decorrelated. The
  // continental layer is drawn *first* and unchanged, which is deliberate: the
  // coastline of a given seed is the one thing the relief and moisture rework
  // deliberately left where it was.
  const rng = makeRng(seed);
  const elevationNoise = createNoise3D(rng);
  nextUint32(rng);
  const ridgeNoise = createNoise3D(rng);
  nextUint32(rng);
  const regionalMoistureNoise = createNoise3D(rng);
  nextUint32(rng);
  const localMoistureNoise = createNoise3D(rng);

  const fields = buildTerrainFields(map, config, {
    elevation: elevationNoise,
    ridge: ridgeNoise,
    regionalMoisture: regionalMoistureNoise,
    localMoisture: localMoistureNoise,
  });

  // Pass 1: the fields, plus latitude, become terrain, hills and features.
  for (let row = 0; row < height; row++) {
    const latitude = latitudeOf(row, height);
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const tile = map.tiles[i]!;

      tile.elevation = fields.elevation[i]!;
      tile.moisture = fields.moisture[i]!;

      if (!fields.land[i]) {
        tile.terrain = 'ocean';
        tile.feature = 'none';
        tile.hills = false;
        continue;
      }

      tile.terrain = pickLandTerrain(config, fields.mountain[i] === 1, tile.moisture, latitude);
      tile.hills = fields.hills[i] === 1;
      tile.feature = 'none';
    }
  }

  // Pass 1b: the trees, as a share of the ground each kind is eligible for.
  // Separate from pass 1 because eligibility reads the terrain pass 1 just
  // wrote, and because a share has to be counted over a finished set.
  assignFeatures(map, config, fields);

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

  // Pass 4: rivers. The generator's only dice, and they are rolled *after* every
  // noise field has been drawn from `rng`, so every tile's terrain is exactly
  // what it was before rivers existed.
  const rivers = traceRivers(map, rng, config.rivers);

  // Pass 4b: floodplains, read off the rivers pass 4 just wrote and the oases
  // pass 1b placed. It has to be here — after the water and before anything
  // asks what is growing on a hex — and it rolls nothing, so it costs the dice
  // stream nothing and resources on a given seed are unmoved by its existence.
  const floodplainCount = deriveFloodplains(map);

  // Pass 5: who can drink. Derived from everything above, and rolls nothing.
  computeFreshwater(map);

  // Pass 6: resources. The generator's *second* set of dice, and they are rolled
  // after the rivers' for exactly the reason the rivers' were rolled after the
  // noise: every draw made here is a draw nothing before it can see, so terrain,
  // hills, features and river edges on a given seed are bit-identical to what
  // they were before resources existed. Adding a pass must never move the
  // ground. See `resources.ts`.
  placeResources(map, rng, config.resources);

  return { map, rivers, lakeCount, floodplainCount };
}

/** Convenience for the UI: axial coordinates of a tile. */
export function tileAxial(tile: Tile) {
  return offsetToAxial(tile.col, tile.row);
}
