/**
 * Typed access to `data/units.json`.
 *
 * The sibling of `terrainData.ts` and `rulesData.ts`: the JSON is the single
 * source of truth for what a unit type *is*, this file only types it. Nothing in
 * the simulation hard-codes a movement allowance, a hit-point total or a combat
 * strength — a designer retunes the roster by editing the JSON.
 *
 * `glyph` is a visual field, read exclusively by `src/render/tileVisuals.ts`.
 * It lives here rather than in a separate art file for the same reason terrain
 * colours live next to terrain rules: two lists of the same things drift apart.
 *
 * Combat strength is carried now and used later — combat lands in a subsequent
 * milestone — so the data file does not have to change shape when it does.
 *
 * City-related fields
 * -------------------
 * `cost`, `foundsCity`, `haltsGrowth` and `minCityPop` are all here rather than
 * in `rules.json` because they describe *this unit type*, not the city system:
 * a designer who adds a second settler-like unit adds one entry here and every
 * rule that mentions settlers follows it. In particular nothing in `src/sim/`
 * ever compares a unit type against the string `"settler"` — `foundsCity` is
 * what the `foundCity` command checks, so "which units can found cities" is a
 * data question with a data answer.
 */

import unitsJson from '../../data/units.json';

export type UnitTypeId =
  | 'warrior'
  | 'scout'
  | 'settler'
  | 'archer'
  | 'spearman'
  | 'horseman'
  | 'chariot'
  | 'swordsman'
  | 'catapult'
  | 'compositeBowman'
  | 'pikeman'
  | 'crossbowman'
  | 'knight'
  | 'longswordsman'
  | 'trebuchet';

/**
 * Stacking is per category (see `rules.stacking.perCategoryPerTile`), which is
 * the whole reason the category exists as data rather than as "combatStrength
 * is zero": a future non-combat military unit must still stack like a soldier.
 */
export type UnitCategory = 'military' | 'civilian';

/**
 * Which *class* of model the 3D board stands this unit on.
 *
 * A visual field, like `glyph`, and here for the same reason: two lists of the
 * same units drift apart. It replaced the old per-type `piece` field, and the
 * replacement is the whole point rather than a tidy-up. Fifteen sculpts, one per
 * unit type, read as fifteen slightly different tokens at game zoom and as one
 * indistinguishable smudge at any zoom further out — the differences were real
 * but they were spent on details the camera never resolves. So the roster now
 * collapses onto eight silhouettes a player can name from across the table, and
 * the *specific* unit is carried by the floating badge above it (see
 * `src/render3d/badges3d.ts`), which is the Civ convention and works for the
 * same reason: a shape says what kind of thing this is, a tag says which one.
 *
 * Two types sharing a class is therefore expected, not a shortcut. A catapult
 * and a trebuchet are one machine with two badges.
 *
 * `worker` has no unit type yet. It is declared, sculpted and iconed anyway, so
 * that the day the improvement system lands the renderer already knows what a
 * worker looks like; `test/pieces3d.test.ts` allows exactly this one unmapped
 * class and no other. `src/render3d/board3d.ts` holds the registry that turns
 * one of these into geometry and will not compile if a name here has no sculpt.
 */
export type ModelClass =
  | 'settler'
  | 'worker'
  | 'melee'
  | 'ranged'
  | 'mountedRanged'
  | 'mounted'
  | 'siege'
  | 'scout';

export interface UnitDef {
  name: string;
  category: UnitCategory;
  /** Movement points refilled at the start of every turn. */
  movement: number;
  maxHp: number;
  /** 0 for civilians. Unused until the combat milestone. */
  combatStrength: number;
  /** Hammers a city pays to build one. See the docblock. */
  cost: number;
  /** True when the unit can be spent to found a city. See the docblock. */
  foundsCity: boolean;
  /**
   * True when a city banks no food toward growth while this unit is at the
   * front of its queue. Starvation still applies — halting is not immunity.
   */
  haltsGrowth: boolean;
  /**
   * Population a city needs before it may queue or finish this unit. 0 for
   * everything that has no such rule.
   */
  minCityPop: number;
  /**
   * The type this one becomes when its successor's technology lands, or absent
   * when the line ends here.
   *
   * The whole of the AoE2-style auto-upgrade rule (Entry V): no upgrade command,
   * no gold-per-unit micro, no obsolete pieces to shepherd home. `upgradeUnits`
   * in `tech.ts` walks this chain at the moment a tech completes, and the
   * *enabling* technology is not named here — it is whichever tech's `unlocks`
   * list contains the successor, so the tree stays the single source of gating.
   */
  upgradesTo?: UnitTypeId;
  /** Which carved model the 3D board draws this unit as. See `ModelClass`. */
  modelClass: ModelClass;
  /** Single letter drawn on the unit disc. Visual only. */
  glyph: string;
}

export interface UnitData {
  units: Record<UnitTypeId, UnitDef>;
}

export const UNIT_DATA: UnitData = unitsJson as UnitData;

export const UNIT_TYPE_IDS = Object.keys(UNIT_DATA.units) as UnitTypeId[];

export function unitDef(id: UnitTypeId): UnitDef {
  return UNIT_DATA.units[id];
}

/**
 * Runtime guard. Commands arrive from save files and (eventually) sockets, so a
 * `unitType` that is typed `UnitTypeId` may be any string at all.
 */
export function isUnitTypeId(value: unknown): value is UnitTypeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(UNIT_DATA.units, value);
}
