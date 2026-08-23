/**
 * Typed access to `data/improvements.json`.
 *
 * The fifth sibling of `terrainData.ts`, `unitData.ts`, `buildingData.ts` and
 * `resourceData.ts`: the JSON is the single source of truth for what an
 * improvement *is*, this file only types it and checks that the ids it names are
 * real. Nothing in the simulation hard-codes a yield, a terrain list or a charge
 * cost — a designer retunes the whole table by editing the JSON, and the
 * validator, the yield algebra, the production gate and the renderer all follow.
 *
 * Two kinds of improvement, one constraint shape
 * ----------------------------------------------
 * The shape is `resourceData.ts`'s plain **AND**, for the same reason: one rule
 * per row is a rule a designer can read off the row.
 *
 *     validTerrain     the tile's terrain must be in this list      (optional)
 *     validFeatures    the tile's feature must be in this list      (optional)
 *     requiresHills    the tile's `hills` flag must equal this      (optional)
 *     requiresResource the tile must carry one of these resources   (optional)
 *
 * `requiresTech` sits beside them and is the one filter that is *not* about the
 * ground: it asks the worker's owner rather than the hex, which is why it is
 * documented on the field and not in this shape. Every improvement carries one
 * since the Age I rework, so the worker's menu now opens over the course of a
 * game instead of arriving whole on turn one.
 *
 * An absent filter means "don't care", and the two kinds fall out of which
 * filters a row uses rather than out of a `kind` field nobody could get wrong:
 *
 *   · **generic** — farm and mine. They name terrain (and, for the mine, high
 *     ground) and no resource, so they may be built on bare ground.
 *   · **resource** — pasture, camp, quarry, plantation. They name a resource and
 *     nothing else, because the resource's own placement rules already pin the
 *     terrain: a camp is legal exactly where deer are, and restating "forest on
 *     grassland, plains or tundra" here would be a second copy of a rule that
 *     already exists in `resources.json` and could drift from it.
 *
 * `improvesResource` is a different question from `requiresResource` and that is
 * why it is a different field. It is the list of resources this improvement
 * *unlocks access to* (`hasResource` in `cities.ts`, design ledger Entry IX's
 * correction), and for the four resource-improvements it is the same list they
 * are built on. The mine is why the two cannot be one field: a mine is buildable
 * on any hill and *also* the thing that opens an iron seam, so it names hills as
 * its constraint and iron and gems as what it improves.
 *
 * Deliberate holes, both documented rather than papered over
 * ----------------------------------------------------------
 * **Fish has no improvement.** The water improvement is a work boat, which needs
 * naval units and embarkation — deferred with the rest of naval. So fish stays
 * on the map, stays visible, keeps paying its food to a citizen working the
 * tile, and simply cannot be *accessed* in the `hasResource` sense. Nothing is
 * gated on fish today, so the hole costs a player nothing; the day a building
 * wants it, the row to add is here.
 *
 * **Salt is quarried, not mined**, which is where this table narrows the design
 * note (which said the mine's list carried salt). Salt is placed on desert with
 * no `hills` constraint, so roughly half of it sits on flat ground — and a mine
 * requires high ground. Filing salt under the mine would have made every flat
 * salt pan permanently unimprovable, which is the same "rule nobody could play
 * against" the ledger refused for strategic resources in Entry IX. The quarry
 * has no terrain constraint of its own, so it reaches both.
 *
 * Growth renewals are upgrades, not new rows (Entry I)
 * ---------------------------------------------------
 * `upgrades` is the punctuated-renewal hook: a list of `{tech, add,
 * requiresFreshwater?}` records, each of which becomes *its own contribution
 * entry* in `explainTileYield` (see `cities.ts`) once the tile's owner holds the
 * technology. Declarative data evaluated by one pipeline, exactly as Entry VIII
 * requires — so the tech screen can price a renewal before it is researched by
 * asking the same function the turn pipeline banks with. v0 wires one:
 * Feudalism gives freshwater farms a second point of food, the Civil Service
 * stand-in the growth-rhythm note asked for.
 */

import improvementsJson from '../../data/improvements.json';

import { RESOURCE_IDS, type ResourceId } from './resourceData';
import {
  FEATURE_IDS,
  type FeatureId,
  TERRAIN_IDS,
  type TerrainId,
  type TileYield,
} from './terrainData';
import { TECH_IDS, type TechId } from './techData';

export type ImprovementId = 'farm' | 'mine' | 'pasture' | 'camp' | 'quarry' | 'plantation';

/**
 * One tech-driven renewal of an improvement's yield.
 *
 * `add` is a yield delta and never a replacement, because a renewal is a thing
 * that arrives *on top of* what the tile already pays — and because an entry
 * that replaced would have to know what it was replacing, which is the inline
 * adjustment Entry VIII exists to forbid.
 */
export interface ImprovementUpgrade {
  /** The technology that switches this on for its owner. */
  tech: TechId;
  /** Added to the tile's yield once the owner holds `tech`. */
  add: TileYield;
  /**
   * When true the tile must also be able to drink (`Tile.freshwater`). Absent
   * means the renewal applies wherever the improvement stands.
   */
  requiresFreshwater?: boolean;
}

export interface ImprovementDef {
  name: string;
  /** Display glyph for text surfaces. An emoji placeholder, like a resource's. */
  emoji: string;
  /** Charges one build spends. The per-improvement half of the charge model. */
  chargeCost: number;
  /**
   * The technology a worker's owner must hold before this may be built at all,
   * or absent for "from turn one".
   *
   * The improvement half of the gate `unlocks.units` is for a unit, written from
   * *this* side rather than in `techs.json` for the reason `resourceData`'s
   * `requiresTech` is: an improvement is a row a designer tunes as a whole, and
   * a gate written two files away is a gate that drifts from the thing it gates.
   * `techGifts` inverts it so the tech screen can still say what a node hands
   * over, exactly as it does for a reveal.
   *
   * It gates the *build*, not the yield: an improvement already on the ground
   * when its tech is somehow absent (a captured tile, a hand-edited save) keeps
   * paying. `improvementErrorAt` is the only reader.
   */
  requiresTech?: TechId;
  /** Added to the tile's terrain/feature/hills/resource yield. Never replaces. */
  yields: TileYield;
  /** Terrains this may be built on, or absent for "any". See the docblock. */
  validTerrain?: TerrainId[];
  /** Features it may be built on, or absent for "any". */
  validFeatures?: FeatureId[];
  /** Required value of the tile's `hills` flag, or absent for "either". */
  requiresHills?: boolean;
  /** Resources it may be built on, or absent for "bare ground is fine". */
  requiresResource?: ResourceId[];
  /** Resources this improvement grants *access* to. See the docblock. */
  improvesResource?: ResourceId[];
  /**
   * True when this improvement clears the generic scatter off its tile, the way
   * a resource prop does (see `addDecorations` in `board3d.ts`). A farm and a
   * mine work the ground itself and so replace what was growing on it; the four
   * resource-improvements are built *around* a resource whose props are the
   * tile's news, and they compose with them instead.
   */
  clearsClutter: boolean;
  /** Tech-driven renewals. See `ImprovementUpgrade` and the module docblock. */
  upgrades?: ImprovementUpgrade[];
}

export interface ImprovementData {
  improvements: Record<ImprovementId, ImprovementDef>;
}

export const IMPROVEMENT_DATA: ImprovementData = improvementsJson as ImprovementData;

/** Every improvement id, in the order the JSON lists them. Iteration order. */
export const IMPROVEMENT_IDS = Object.keys(
  IMPROVEMENT_DATA.improvements,
) as ImprovementId[];

export function improvementDef(id: ImprovementId): ImprovementDef {
  return IMPROVEMENT_DATA.improvements[id];
}

/**
 * Runtime guard. An improvement id arrives inside a command, which may have come
 * from a save file or (eventually) a socket, so a value typed `ImprovementId`
 * may be any string at all.
 */
export function isImprovementId(value: unknown): value is ImprovementId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(IMPROVEMENT_DATA.improvements, value)
  );
}

/**
 * What an improvement adds to the tile it stands on, before any renewal.
 *
 * A fresh object every call, exactly as `tileYield` and `resourceYield` return
 * one: the table is shared module state and a caller that summed into it would
 * retune the game.
 */
export function improvementYield(id: ImprovementId): TileYield {
  const source = improvementDef(id).yields;
  return { food: source.food, production: source.production, gold: source.gold };
}

/**
 * The improvement that grants access to a resource, or `null` when none does.
 *
 * The inverse of `improvesResource`, built once at load from the table's own
 * order — the same trick `techData.ts` plays with `UNIT_UNLOCK_TECH`, and for
 * the same reason: the table is written forwards because that is how a designer
 * reads it, and the question the game asks ("what do I have to build on this
 * iron?") is the other way round. Inverting rather than duplicating is what
 * stops a resource being improved by one row and advertised by another.
 */
const RESOURCE_IMPROVEMENT = new Map<ResourceId, ImprovementId>();
for (const id of IMPROVEMENT_IDS) {
  for (const resource of IMPROVEMENT_DATA.improvements[id].improvesResource ?? []) {
    if (!RESOURCE_IMPROVEMENT.has(resource)) RESOURCE_IMPROVEMENT.set(resource, id);
  }
}

export function improvementForResource(resource: ResourceId): ImprovementId | null {
  return RESOURCE_IMPROVEMENT.get(resource) ?? null;
}

/**
 * Fails loudly at load if the table names something that does not exist.
 *
 * The same cheapest-possible-test `resourceData.ts` runs, and for the same
 * reason: the whole point of a data-driven table is that a designer edits it
 * without touching TypeScript, and the cost of that is that a typo in a terrain
 * id would otherwise show up as an improvement that silently never validates.
 * `test/improvements.test.ts` asserts the same invariants from the outside.
 */
function validateTable(): void {
  for (const id of IMPROVEMENT_IDS) {
    const def = improvementDef(id);
    const where = `improvements.json: ${id}`;
    if (def.chargeCost <= 0) throw new Error(`${where} has a non-positive chargeCost`);
    for (const terrain of def.validTerrain ?? []) {
      if (!TERRAIN_IDS.includes(terrain)) {
        throw new Error(`${where} names unknown terrain "${terrain}"`);
      }
    }
    for (const feature of def.validFeatures ?? []) {
      if (!FEATURE_IDS.includes(feature)) {
        throw new Error(`${where} names unknown feature "${feature}"`);
      }
    }
    for (const resource of [...(def.requiresResource ?? []), ...(def.improvesResource ?? [])]) {
      if (!RESOURCE_IDS.includes(resource)) {
        throw new Error(`${where} names unknown resource "${resource}"`);
      }
    }
    // A row with neither a terrain list nor a resource list is buildable on the
    // ocean floor, which is not a rule anybody meant to write.
    if (def.validTerrain === undefined && def.requiresResource === undefined) {
      throw new Error(`${where} constrains nothing: it needs validTerrain or requiresResource`);
    }
    if (def.requiresTech !== undefined && !TECH_IDS.includes(def.requiresTech)) {
      throw new Error(`${where} needs unknown technology "${def.requiresTech}"`);
    }
    for (const upgrade of def.upgrades ?? []) {
      if (!TECH_IDS.includes(upgrade.tech)) {
        throw new Error(`${where} names unknown technology "${upgrade.tech}"`);
      }
    }
  }
  // Two improvements claiming one resource would make "what do I build on this
  // iron?" a question with two answers, and `improvementForResource` would
  // silently keep the first.
  const claimed = new Map<ResourceId, ImprovementId>();
  for (const id of IMPROVEMENT_IDS) {
    for (const resource of improvementDef(id).improvesResource ?? []) {
      const owner = claimed.get(resource);
      if (owner !== undefined) {
        throw new Error(
          `improvements.json: ${resource} is improved by both ${owner} and ${id}`,
        );
      }
      claimed.set(resource, id);
    }
  }
}

validateTable();
