/**
 * Typed access to `data/resources.json`.
 *
 * The sibling of `terrainData.ts` and `unitData.ts`: the JSON is the single
 * source of truth for what a resource *is*, this file only types it and checks
 * that the ids it names are real. Nothing in the simulation hard-codes a yield,
 * a frequency or a terrain list — a designer retunes the whole table by editing
 * the JSON, and the map generator, the yield algebra, the production gate and
 * the renderer all follow it.
 *
 * Three kinds, three mechanical homes (design ledger, Entry IX)
 * -------------------------------------------------------------
 *   · **bonus** — wheat, cattle, deer, fish, stone. Pure tile-yield modifiers,
 *     and the only kind that is fully live today.
 *   · **strategic** — horses, iron. They *gate unit production* through
 *     `requiresResource` in `data/units.json`; see `buildError` in `tech.ts`.
 *   · **luxury** — gems, silk, wine, spices, salt. Placed and worked for their
 *     gold now; they become the happiness system's fuel at that milestone.
 *
 * The placement constraint shape
 * ------------------------------
 * Three optional filters that all have to agree — plain **AND**, never a
 * disjunction, because one rule per resource is a rule a designer can read off
 * the row:
 *
 *     validTerrain    the tile's terrain must be in this list        (required)
 *     validFeatures   the tile's feature must be in this list        (optional)
 *     hills           the tile's `hills` flag must equal this        (optional)
 *
 * An absent filter means "don't care". So `deer` is *forest on grassland,
 * plains or tundra* rather than the design note's looser "forest/tundra": deer
 * live in forests, taiga included, and expressing that as one AND rule is worth
 * more than matching the shorthand. `iron` is likewise *hills*, on any of the
 * four temperate terrains, rather than "hills or plains" — the ore is in the
 * high ground. Both readings are noted here because they are the two places
 * this table deliberately narrows the ledger.
 *
 * Mountains and snow appear in no `validTerrain` list, which is how "a mountain
 * is never a resource tile" is expressed: as data, not as a special case in the
 * placement loop. (`tileYieldOf` would happily add a resource's yield to a
 * mountain, and a citizen still could not be sent there — `workable` is a
 * separate question, see `terrainData.ts`.)
 *
 * `requiresTech` is a **visibility** gate and nothing else: iron is on the map
 * from turn one, works for whoever owns it, and is simply not *shown* to a
 * player without Bronze Working. See `visibleResourceAt` in `tech.ts` for the
 * whole of that rule and the tradeoff it makes with the diorama props.
 *
 * `frequency` is a relative weight in the scatter's draw, not a count, and
 * `clusterSize` is the inclusive `[min, max]` a single find spreads over — so
 * horses arrive as a herd and gems as a single seam. Both are read only by
 * `resources.ts`.
 */

import resourcesJson from '../../data/resources.json';

import { FEATURE_IDS, type FeatureId, TERRAIN_IDS, type TerrainId, type TileYield } from './terrainData';
import { TECH_IDS, type TechId } from './techData';

export type ResourceId =
  | 'wheat'
  | 'cattle'
  | 'deer'
  | 'fish'
  | 'stone'
  | 'horses'
  | 'iron'
  | 'gems'
  | 'silk'
  | 'wine'
  | 'spices'
  | 'salt';

/** What a resource *is for*. See the module docblock. */
export type ResourceKind = 'bonus' | 'strategic' | 'luxury';

export interface ResourceDef {
  name: string;
  kind: ResourceKind;
  /** Added to the tile's terrain/feature/hills yield. See `tileYieldOf`. */
  yields: TileYield;
  /** Terrains this may sit on. See the constraint shape in the docblock. */
  validTerrain: TerrainId[];
  /** Features it may sit on, or absent for "any". */
  validFeatures?: FeatureId[];
  /** Required value of the tile's `hills` flag, or absent for "either". */
  hills?: boolean;
  /** Technology a player needs before they are *shown* this. Strategic only. */
  requiresTech?: TechId;
  /** Relative weight in the placement draw. Not a count. */
  frequency: number;
  /** Inclusive `[min, max]` tiles one find spreads over. Absent means 1. */
  clusterSize?: [number, number];
}

export interface ResourceData {
  resources: Record<ResourceId, ResourceDef>;
}

export const RESOURCE_DATA: ResourceData = resourcesJson as ResourceData;

/** Every resource id, in the order the JSON lists them. Iteration order. */
export const RESOURCE_IDS = Object.keys(RESOURCE_DATA.resources) as ResourceId[];

export function resourceDef(id: ResourceId): ResourceDef {
  return RESOURCE_DATA.resources[id];
}

/**
 * Runtime guard. A resource id can arrive from a save file or (eventually) a
 * socket, so a value typed `ResourceId` may be any string at all.
 */
export function isResourceId(value: unknown): value is ResourceId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(RESOURCE_DATA.resources, value)
  );
}

/**
 * What a resource adds to the tile it sits on.
 *
 * A fresh object every call, exactly as `tileYield` returns one: the table is
 * shared module state and a caller that summed into it would retune the game.
 */
export function resourceYield(id: ResourceId): TileYield {
  const source = resourceDef(id).yields;
  return { food: source.food, production: source.production, gold: source.gold };
}

/** Every resource of a kind, in table order. */
export function resourcesOfKind(kind: ResourceKind): ResourceId[] {
  return RESOURCE_IDS.filter((id) => resourceDef(id).kind === kind);
}

/**
 * True when this resource is one the *fairness* pass will plant near a start:
 * a bonus resource that actually feeds a city. See `resources.ts`.
 *
 * Asked of the data rather than hard-coded as a list of five ids, so a sixth
 * bonus food added to the table is covered the day it lands.
 */
export function isBonusFood(id: ResourceId): boolean {
  const def = resourceDef(id);
  return def.kind === 'bonus' && def.yields.food > 0;
}

/**
 * Fails loudly at load if the table names something that does not exist.
 *
 * The whole point of a data-driven table is that a designer edits it without
 * touching TypeScript, and the cost of that is that a typo in a terrain id
 * would otherwise show up as a resource that silently never places. A thrown
 * error at import is the cheapest possible version of that test, and
 * `test/resources.test.ts` asserts the same invariants from the outside.
 */
function validateTable(): void {
  const kinds: ResourceKind[] = ['bonus', 'strategic', 'luxury'];
  for (const id of RESOURCE_IDS) {
    const def = resourceDef(id);
    const where = `resources.json: ${id}`;
    if (!kinds.includes(def.kind)) throw new Error(`${where} has unknown kind "${def.kind}"`);
    if (def.validTerrain.length === 0) throw new Error(`${where} has no valid terrain`);
    for (const terrain of def.validTerrain) {
      if (!TERRAIN_IDS.includes(terrain)) throw new Error(`${where} names unknown terrain "${terrain}"`);
    }
    for (const feature of def.validFeatures ?? []) {
      if (!FEATURE_IDS.includes(feature)) throw new Error(`${where} names unknown feature "${feature}"`);
    }
    if (def.requiresTech !== undefined && !TECH_IDS.includes(def.requiresTech)) {
      throw new Error(`${where} names unknown technology "${def.requiresTech}"`);
    }
    if (def.frequency <= 0) throw new Error(`${where} has a non-positive frequency`);
    const cluster = def.clusterSize;
    if (cluster && (cluster[0] < 1 || cluster[1] < cluster[0])) {
      throw new Error(`${where} has a nonsensical clusterSize [${cluster[0]}, ${cluster[1]}]`);
    }
  }
}

validateTable();
