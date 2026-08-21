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
  | 'grassland'
  | 'plains'
  | 'desert'
  | 'tundra'
  | 'snow'
  | 'mountain';

export type FeatureId = 'none' | 'forest' | 'jungle';

/** What one tile pays a city that works it, per turn. */
export interface TileYield {
  food: number;
  production: number;
  gold: number;
}

export interface TerrainDef {
  name: string;
  water: boolean;
  /** False when no citizen may ever work the tile (mountains). See the docblock. */
  workable: boolean;
  /** Movement points to enter; `null` means impassable. See the docblock. */
  moveCost: number | null;
  /** Yield of the bare terrain, before any feature or hills. See the docblock. */
  yield: TileYield;
  fillColor: string;
  glyph: string | null;
  glyphColor: string;
}

export interface FeatureDef {
  name: string;
  /** Replaces the terrain's cost when present. See the docblock. */
  moveCostOverride: number | null;
  /** Replaces the terrain's yield when present. See the docblock. */
  yieldOverride: TileYield | null;
  glyph: string | null;
  glyphColor: string;
}

export interface OverlayDef {
  name: string;
  /** Added on top of the terrain/feature cost. See the docblock. */
  moveCostExtra: number;
  /** Replaces the terrain *and* the feature yield outright. See the docblock. */
  yieldOverride: TileYield;
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

/** True when the terrain is a water tile (ocean or coast). */
export function isWaterTerrain(id: TerrainId): boolean {
  return TERRAIN_DATA.terrains[id].water;
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
 * Returns a fresh object every call. The tables are shared module state and a
 * caller that summed into one of them would retune the game.
 */
export function tileYield(terrain: TerrainId, feature: FeatureId, hills: boolean): TileYield {
  const source = hills
    ? TERRAIN_DATA.hills.yieldOverride
    : (TERRAIN_DATA.features[feature].yieldOverride ?? TERRAIN_DATA.terrains[terrain].yield);
  return { food: source.food, production: source.production, gold: source.gold };
}
