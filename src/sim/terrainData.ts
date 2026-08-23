/**
 * Typed access to `data/terrain.json`.
 *
 * The JSON is the single source of truth for terrain/feature definitions.
 * The simulation only reads the gameplay fields (`name`, `water`, the movement
 * costs); the visual fields (`fillColor`, `glyph`, the whole `units` palette)
 * are consumed exclusively by `src/render/tileVisuals.ts`. Keeping one file
 * avoids two lists drifting apart.
 *
 * Movement cost
 * -------------
 * Three fields combine into one number, and the order matters:
 *
 *     terrainCost = terrains[terrain].moveCost           // null == impassable
 *     base        = features[feature].moveCostOverride ?? terrainCost
 *     effective   = max(minStepCost, base + (hills ? hills.moveCostExtra : 0))
 *
 * A feature *replaces* the terrain cost rather than adding to it (forest is
 * "cost 2", not "grassland plus 2"), while hills *add* to whatever came out of
 * that choice. So a forested hill is 2 + 1 = 3 and a plain hill is 1 + 1 = 2.
 * Impassable terrain wins outright: a feature can never make a mountain or an
 * ocean walkable, so `moveCost: null` short-circuits before the override.
 * `rules.movement.minStepCost` floors the result, so a future cost-reducing
 * feature can never produce a free or negative step.
 *
 * Tile yield
 * ----------
 * Three fields combine the same way, and again the order matters — but every
 * step is an *override*, never a sum:
 *
 *     base      = terrains[terrain].yield
 *     withHills = hills ? hills.yieldOverride : base
 *     effective = hills ? withHills : (features[feature].yieldOverride ?? base)
 *
 * which is to say: hills win outright, a feature replaces the terrain, and bare
 * terrain is the fallback. A forested hill is 0/2/0 (the hill), a forested
 * grassland is 1/1/0 (the forest), a bare grassland is 2/0/0 (the terrain).
 * That is the Civ V rule — a hill is a hill whatever grows on it — and it is
 * the one place the yield algebra differs from the movement algebra, which
 * *adds* the hills term instead.
 *
 * The ground still only ever pays those three; the other three voices a
 * `TileYield` now carries (science, culture, faith) come from what sits *on* it,
 * which is the `add` half of the chain in `explainTileYield`. See `TileYield`.
 *
 * Defence bonus
 * -------------
 * Three fields again, and this time every step is a *sum* — the third algebra in
 * this file, and the one that reads most like the rule it models:
 *
 *     effective = terrains[terrain].defenseBonus
 *               + features[feature].defenseBonus
 *               + (hills ? hills.defenseBonus : 0)
 *
 * A forested hill is +0.25 (forest) + 0.25 (hills) = +50%, exactly as Civ V has
 * it, and that is the whole reason this one adds where the yield algebra
 * overrides: cover and height are different advantages and a defender gets both.
 * Bare terrain contributes nothing today — the field is there so a designer can
 * make marsh a liability without touching a line of code.
 *
 * `workable` is separate from all of it. A mountain has a yield of 0/0/0 and a
 * citizen still may not stand on it, so the flag says so rather than leaving
 * "unworkable" to be inferred from three zeroes — a future 0/0/0 tile that is
 * merely bad must not silently become unassignable.
 */

import terrainJson from '../../data/terrain.json';
import { RULES } from './rulesData';

export type TerrainId =
  | 'ocean'
  | 'coast'
  | 'lake'
  | 'grassland'
  | 'plains'
  | 'desert'
  | 'tundra'
  | 'snow'
  | 'mountain';

export type FeatureId = 'none' | 'forest' | 'jungle';

/**
 * What one tile pays a city that works it, per turn — **six voices** since the
 * luxuries pass, and the widening is worth writing down.
 *
 * It carried three for ten milestones because the ground only ever paid three:
 * science and culture came from citizens and buildings, and there was nothing a
 * hex could do about either. The ratified luxury table breaks that in three
 * places at once — silk pays culture where it grows, tea and reeds pay science,
 * and incense and jade pay **faith**, a yield that did not exist at all — so the
 * honest fix is one wider algebra rather than three side channels bolted onto
 * the chain that `explainTileYield` folds.
 *
 * Faith is *accumulate-only* in this pass: tiles and signatures pay it, cities
 * collect it into `Player.faithPool`, and nothing spends it yet. See the pool's
 * own docblock in `state.ts` for why that is a deliberate half-system.
 */
export interface TileYield {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

/**
 * A tile yield as a **data row declares one**: the three old voices required,
 * the three new ones optional and absent meaning zero.
 *
 * Two types rather than one, and the split is the same one `ResourceYieldBag`
 * already makes against `ResourceYieldLine`: a *declaration* omits what it does
 * not pay (a grassland row saying `"faith": 0` three times over is noise a
 * designer has to read past), while a *computed* yield carries every field so
 * that a consumer folds one shape instead of six optional ones. `readTileYield`
 * is the one door between them, and every table accessor goes through it.
 */
export interface TileYieldSpec {
  food: number;
  production: number;
  gold: number;
  science?: number;
  culture?: number;
  faith?: number;
}

/**
 * A declared yield read into a full one. The only place the "absent means zero"
 * convention is applied, so a table that grows a seventh voice grows it here.
 *
 * A fresh object every call, for the reason `tileYield` returns one: the tables
 * are shared module state and a caller that summed into one would retune the
 * game.
 */
export function readTileYield(spec: TileYieldSpec): TileYield {
  return {
    food: spec.food,
    production: spec.production,
    gold: spec.gold,
    science: spec.science ?? 0,
    culture: spec.culture ?? 0,
    faith: spec.faith ?? 0,
  };
}

/** A yield of nothing at all — the identity of the `add` half of the fold. */
export function emptyTileYield(): TileYield {
  return { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

/** The names a tile yield carries, in the order every surface prints them. */
export const TILE_YIELD_KEYS: readonly (keyof TileYield)[] = [
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
];

export interface TerrainDef {
  name: string;
  water: boolean;
  /**
   * True for water a land tile can drink from — lakes, and nothing else today.
   * The ocean and its coast are salt. Read through `isFreshwaterTerrain`; the
   * per-tile answer a city will eventually ask is `Tile.freshwater`, which this
   * flag feeds via `computeFreshwater` in `water.ts`.
   */
  freshwater: boolean;
  /** False when no citizen may ever work the tile (mountains). See the docblock. */
  workable: boolean;
  /** Movement points to enter; `null` means impassable. See the docblock. */
  moveCost: number | null;
  /** Yield of the bare terrain, before any feature or hills. See the docblock. */
  yield: TileYieldSpec;
  /** Added to a defender's strength as a fraction. Summed; see the docblock. */
  defenseBonus: number;
  fillColor: string;
  glyph: string | null;
  glyphColor: string;
}

export interface FeatureDef {
  name: string;
  /** Replaces the terrain's cost when present. See the docblock. */
  moveCostOverride: number | null;
  /** Replaces the terrain's yield when present. See the docblock. */
  yieldOverride: TileYieldSpec | null;
  /** Added to the terrain's defence bonus, never replacing it. See the docblock. */
  defenseBonus: number;
  glyph: string | null;
  glyphColor: string;
}

export interface OverlayDef {
  name: string;
  /** Added on top of the terrain/feature cost. See the docblock. */
  moveCostExtra: number;
  /** Replaces the terrain *and* the feature yield outright. See the docblock. */
  yieldOverride: TileYieldSpec;
  /** Added to the terrain *and* feature defence bonus. See the docblock. */
  defenseBonus: number;
  glyph: string;
  glyphColor: string;
}

export interface UiTheme {
  background: string;
  grid: string;
  hover: string;
  hoverShadow: string;
}

/** Every colour the unit layer draws with. Read only by the tile artist. */
export interface UnitTheme {
  rim: string;
  glyph: string;
  glyphShadow: string;
  selection: string;
  selectionShadow: string;
  reachable: string;
  reachableEdge: string;
  path: string;
  pathShadow: string;
  hpBack: string;
  hpFull: string;
  hpLow: string;
}

export interface TerrainData {
  terrains: Record<TerrainId, TerrainDef>;
  features: Record<FeatureId, FeatureDef>;
  hills: OverlayDef;
  ui: UiTheme;
  units: UnitTheme;
}

export const TERRAIN_DATA: TerrainData = terrainJson as TerrainData;

export const TERRAIN_IDS = Object.keys(TERRAIN_DATA.terrains) as TerrainId[];
export const FEATURE_IDS = Object.keys(TERRAIN_DATA.features) as FeatureId[];

export function terrainDef(id: TerrainId): TerrainDef {
  return TERRAIN_DATA.terrains[id];
}

export function featureDef(id: FeatureId): FeatureDef {
  return TERRAIN_DATA.features[id];
}

/** True when the terrain is a water tile (ocean, coast or lake). */
export function isWaterTerrain(id: TerrainId): boolean {
  return TERRAIN_DATA.terrains[id].water;
}

/**
 * True when the terrain is *fresh* water — a lake, today, and nothing else.
 *
 * Separate from `water` because the two questions have different answers for
 * the ocean and its coast: both are water (nothing walks on them), neither is
 * drinkable. See `TerrainDef.freshwater`.
 */
export function isFreshwaterTerrain(id: TerrainId): boolean {
  return TERRAIN_DATA.terrains[id].freshwater;
}

// --- movement ---------------------------------------------------------------

/**
 * Movement points needed to enter a tile with this terrain/feature/hills
 * combination, or `null` when nothing can walk there.
 *
 * Takes the three fields rather than a `Tile` so this module stays a pure data
 * accessor with no dependency on the board (`map.ts` already depends on it).
 * See the module docblock for how the three numbers combine.
 */
export function moveCost(terrain: TerrainId, feature: FeatureId, hills: boolean): number | null {
  const terrainCost = TERRAIN_DATA.terrains[terrain].moveCost;
  // Impassable terrain wins outright: no feature makes a mountain walkable.
  if (terrainCost === null) return null;

  const base = TERRAIN_DATA.features[feature].moveCostOverride ?? terrainCost;
  const withHills = base + (hills ? TERRAIN_DATA.hills.moveCostExtra : 0);
  return Math.max(RULES.movement.minStepCost, withHills);
}

// --- defence ----------------------------------------------------------------

/**
 * The fraction a defender standing on this terrain/feature/hills combination
 * adds to its strength.
 *
 * Takes the three fields rather than a `Tile` for the same reason `moveCost` and
 * `tileYield` do. Unlike either of them every term is *added* — see the module
 * docblock for why cover and height stack when a hill's yield replaces a
 * forest's.
 */
export function defenseBonus(terrain: TerrainId, feature: FeatureId, hills: boolean): number {
  return (
    TERRAIN_DATA.terrains[terrain].defenseBonus +
    TERRAIN_DATA.features[feature].defenseBonus +
    (hills ? TERRAIN_DATA.hills.defenseBonus : 0)
  );
}

// --- yield ------------------------------------------------------------------

/** True when a citizen may be assigned to this terrain at all. */
export function isWorkableTerrain(id: TerrainId): boolean {
  return TERRAIN_DATA.terrains[id].workable;
}

/**
 * Food/production/gold of a terrain/feature/hills combination.
 *
 * Takes the three fields rather than a `Tile` for the same reason `moveCost`
 * does: this module stays a pure data accessor that the board does not depend
 * on. See the module docblock for how the three tables combine — every step is
 * an override, and hills win outright.
 *
 * Returns a fresh object every call (`readTileYield` builds one). The tables are
 * shared module state and a caller that summed into one would retune the game.
 */
export function tileYield(terrain: TerrainId, feature: FeatureId, hills: boolean): TileYield {
  const source = hills
    ? TERRAIN_DATA.hills.yieldOverride
    : (TERRAIN_DATA.features[feature].yieldOverride ?? TERRAIN_DATA.terrains[terrain].yield);
  return readTileYield(source);
}
