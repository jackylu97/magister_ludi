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
 * A new row costs no TypeScript
 * -----------------------------
 * `ResourceId` is **derived from the JSON's own keys** rather than written out
 * as a union beside it. That is the difference between a table a designer can
 * extend and a table a designer can extend *if somebody also edits two files in
 * `src/`*: adding `"amber": { … }` to the JSON widens the type, widens
 * `RESOURCE_IDS`, and every exhaustive `Record<ResourceId, …>` that used to make
 * that a compile error has been turned into a lookup with a documented fallback
 * (see `RESOURCE_PROPS` in `board3d.ts` and `resourceIconSource` in
 * `badges3d.ts`). The one thing the derivation cannot do is invent a *prop* or
 * an *icon*, which is exactly why those two fall back instead of demanding one.
 *
 * Three kinds, three mechanical homes (design ledger, Entry IX)
 * -------------------------------------------------------------
 *   · **bonus** — wheat, cattle, deer, fish, stone. Pure tile-yield modifiers.
 *   · **strategic** — horses, iron. They *gate unit production* through
 *     `requiresResource` in `data/units.json`; see `buildError` in `tech.ts`.
 *   · **luxury** — ten of them now. Each pays its tile's gold, each is worth a
 *     flat `meters.happiness.perUniqueLuxury` to the empire that has improved
 *     one, and each carries a **signature effect** on top of that — see
 *     `ResourceEffect` below and `resourceEffects.ts`, the one evaluator.
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
 * whole of that rule and the tradeoff it makes with the diorama props. Incense
 * is the first *luxury* to use it — Divination reveals it — and it needed no
 * new mechanism, which is the whole argument for having built it as a property
 * of the row rather than a property of the strategic kind.
 *
 * `frequency` is a relative weight in the scatter's draw, not a count, and
 * `clusterSize` is the inclusive `[min, max]` a single find spreads over — so
 * horses arrive as a herd and gems as a single seam. Both are read only by
 * `resources.ts`.
 */

import resourcesJson from '../../data/resources.json';

import type { ProductionCategory } from './buildingData';
import { FEATURE_IDS, type FeatureId, TERRAIN_IDS, type TerrainId, type TileYield } from './terrainData';
import { TECH_IDS, type TechId } from './techData';

/**
 * Every resource the table names — read off the JSON's keys, so a new row is a
 * new member of this type with no edit here. See the module docblock.
 */
export type ResourceId = keyof typeof resourcesJson.resources & string;

/** What a resource *is for*. See the module docblock. */
export type ResourceKind = 'bonus' | 'strategic' | 'luxury';

/**
 * A bag of yields an effect pays, every field optional and absent meaning zero.
 *
 * Five voices rather than the tile chain's three, because an effect can pay
 * science or culture — a luxury's signature is a fact about a *city* or an
 * *empire*, not about a hex, and those are the scales at which the other two
 * yields exist at all.
 */
export interface ResourceYieldBag {
  food?: number;
  production?: number;
  gold?: number;
  science?: number;
  culture?: number;
}

/**
 * The whole signature-effect vocabulary: four shapes and no more.
 *
 * Kept deliberately, aggressively small. A luxury table where every row could
 * name an arbitrary effect is a table where every row is a special case in the
 * simulation, and the point of the four shapes is that ONE evaluator
 * (`resourceEffects.ts`) reads all of them — a new luxury with a familiar
 * signature is a JSON row and nothing else, and a new *shape* is a deliberate
 * design decision with a place to be argued about.
 *
 *   · `cityYields`     flat yields in the city that owns the improved tile.
 *                      The powerful-local shape: it lands where the seam is.
 *   · `empireYields`   flat yields to the whole empire, once per unique kind.
 *                      Food and production are rejected at load — the empire
 *                      has no basket for either, and an effect that silently
 *                      does nothing is worse than one that fails to load.
 *   · `extraHappiness` on top of the flat `perUniqueLuxury` every luxury pays.
 *   · `productionBonus` a percentage of the owning city's hammers, behind one
 *                      *category* of thing it may be building.
 *
 * Uniqueness is not part of the shape because it is part of the *reading*: an
 * empire effect counts once per kind however many seams feed it, and a local
 * effect counts once per kind **per city**. Two jades in one city are one jade's
 * signature; two jades in two cities are two, because the effect is the city's.
 */
export type ResourceEffect =
  | ({ kind: 'cityYields' } & ResourceYieldBag)
  | ({ kind: 'empireYields' } & ResourceYieldBag)
  | { kind: 'extraHappiness'; amount: number }
  | { kind: 'productionBonus'; category: ProductionCategory; percent: number };

/** Every effect shape's tag, for the loader's validation and for tests. */
export const RESOURCE_EFFECT_KINDS: readonly ResourceEffect['kind'][] = [
  'cityYields',
  'empireYields',
  'extraHappiness',
  'productionBonus',
];

/** The yield names an effect bag may carry, in the order surfaces print them. */
export const RESOURCE_EFFECT_YIELDS: readonly (keyof ResourceYieldBag)[] = [
  'food',
  'production',
  'gold',
  'science',
  'culture',
];

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
  /** Technology a player needs before they are *shown* this. */
  requiresTech?: TechId;
  /**
   * The signature this luxury pays on top of the flat happiness. Absent for
   * every bonus and strategic row, and absent is lawful for a luxury too — a
   * luxury with no signature is simply happiness and gold, which is what all
   * ten were before this milestone.
   */
  effect?: ResourceEffect;
  /**
   * Display glyph for text surfaces (hover readout, panels). An emoji
   * placeholder for now; the lens roundels use the drawn SVG icons instead —
   * and fall back to *this* for a row nobody has drawn one for yet.
   */
  emoji: string;
  /** Relative weight in the placement draw. Not a count. */
  frequency: number;
  /** Inclusive `[min, max]` tiles one find spreads over. Absent means 1. */
  clusterSize?: [number, number];
}

export interface ResourceData {
  resources: Record<ResourceId, ResourceDef>;
}

/**
 * The live table, and the one door data comes in through.
 *
 * `let` rather than `const` for one reason and it is worth writing down: the
 * table is the *only* thing that decides what a resource is, and the way to
 * prove that is to be able to hand the simulation a row it has never seen and
 * watch it place, pay and explain (`withExtraResources`, and the test that uses
 * it). Nothing in the game ever reassigns it.
 */
const BASE_TABLE = (resourcesJson as unknown as ResourceData).resources;

export const RESOURCE_DATA: ResourceData = { resources: BASE_TABLE };

/**
 * Every resource id, in the order the table lists them. Iteration order — and
 * therefore part of every seeded outcome the scatter produces.
 *
 * A live binding rather than a snapshot: consumers `import { RESOURCE_IDS }`
 * and read it when they need it, so a scoped override is visible to all of them
 * at once.
 */
export let RESOURCE_IDS: readonly ResourceId[] = Object.keys(BASE_TABLE) as ResourceId[];

export function resourceDef(id: ResourceId): ResourceDef {
  const def = RESOURCE_DATA.resources[id];
  if (!def) throw new Error(`Unknown resource "${id}"`);
  return def;
}

/**
 * Runs `body` with extra rows installed in the table, then puts the table back
 * exactly as it was — including on the way out of a throw.
 *
 * This is a *proof obligation*, not a game mechanic. The claim this milestone
 * makes is that a resource is entirely data, and the honest way to hold that
 * claim still is a test that invents one at runtime and asserts the scatter
 * places it, the yield algebra pays it and the breakdown explains it, with no
 * TypeScript written for it. Nothing in `src/` calls this.
 */
export function withExtraResources<T>(
  rows: Readonly<Record<string, ResourceDef>>,
  body: () => T,
): T {
  const previousTable = RESOURCE_DATA.resources;
  const previousIds = RESOURCE_IDS;
  RESOURCE_DATA.resources = { ...previousTable, ...rows } as Record<ResourceId, ResourceDef>;
  RESOURCE_IDS = Object.keys(RESOURCE_DATA.resources) as ResourceId[];
  try {
    validateTable();
    return body();
  } finally {
    RESOURCE_DATA.resources = previousTable;
    RESOURCE_IDS = previousIds;
  }
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

/** The signature effect of a resource, or `null` when the row declares none. */
export function resourceEffect(id: ResourceId): ResourceEffect | null {
  return resourceDef(id).effect ?? null;
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
 *
 * The effect block gets the same treatment for a sharper reason: an effect the
 * evaluator cannot read is an effect that pays *nothing*, and a luxury that
 * quietly pays nothing is the one bug this design could hide indefinitely.
 */
function validateEffect(where: string, effect: ResourceEffect): void {
  if (!RESOURCE_EFFECT_KINDS.includes(effect.kind)) {
    throw new Error(`${where} has unknown effect kind "${(effect as { kind: string }).kind}"`);
  }
  if (effect.kind === 'extraHappiness') {
    if (!Number.isFinite(effect.amount)) throw new Error(`${where} has a non-numeric amount`);
    return;
  }
  if (effect.kind === 'productionBonus') {
    if (effect.category !== 'unit' && effect.category !== 'building') {
      throw new Error(`${where} has unknown production category "${effect.category}"`);
    }
    if (!Number.isFinite(effect.percent)) throw new Error(`${where} has a non-numeric percent`);
    return;
  }
  // Both yield shapes, and the one asymmetry between them: the empire banks
  // gold, science and culture and has nowhere to put food or hammers.
  let named = 0;
  for (const key of RESOURCE_EFFECT_YIELDS) {
    const value = effect[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value)) throw new Error(`${where} has a non-numeric ${key}`);
    if (effect.kind === 'empireYields' && (key === 'food' || key === 'production')) {
      throw new Error(`${where} pays empire ${key}, which no empire has a basket for`);
    }
    named += 1;
  }
  if (named === 0) throw new Error(`${where} names no yields at all`);
}

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
    if (def.effect) validateEffect(`${where} effect`, def.effect);
  }
}

validateTable();
