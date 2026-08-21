/**
 * Typed access to `data/techs.json`.
 *
 * The fourth sibling of `terrainData.ts`, `unitData.ts` and `buildingData.ts`:
 * the JSON is the single source of truth for what a technology costs, what it
 * needs first and what it hands over, and this file only types it. No rule in
 * the simulation names a technology; they ask questions of this table instead.
 *
 * A tech is a package, not a gate
 * -------------------------------
 * Per Entry V of the design ledger every node is a *package* of real unlocks
 * with no connective-tissue filler, which is why `unlocks` is the whole of a
 * tech's effect and why there is no "does nothing but lead somewhere" node in
 * the file. A node that unlocked nothing would be a turn spent on a turn.
 *
 * Unlocks are the gate, read backwards
 * ------------------------------------
 * `unlocks` is written forwards — a tech lists what it enables — because that is
 * how a designer thinks about a tree and how the tech screen draws one. The
 * *question* the game asks is the other way round ("may this city build a
 * library?"), so `UNIT_UNLOCK_TECH` / `BUILDING_UNLOCK_TECH` invert the table
 * once, at module load, from the JSON's own order. Inverting rather than
 * duplicating is what keeps a unit from being gated by one tech and advertised
 * by another.
 *
 * Anything not named by *any* tech is ungated and buildable from turn one. That
 * is a deliberate escape hatch rather than an oversight: content lands before
 * its tech does, and a new unit that nobody can build until a data file catches
 * up is a unit nobody will notice is broken. `techDataProblems` reports which
 * ids are in that state so a test can decide whether it is intentional.
 *
 * Ages
 * ----
 * `age` is 1, 2 or 3 today (Ancient, Classical, Medieval — the tech screen sets
 * them as ÆRA I/II/III). It is a display and pacing fact rather than a rule: no
 * mechanic reads it, prerequisites do the ordering, and the integrity check only
 * insists that a tech never depends on a *later* age than its own.
 */

import techsJson from '../../data/techs.json';
import { type BuildingId, isBuildingId } from './buildingData';
import { type UnitTypeId, isUnitTypeId } from './unitData';

export type TechId =
  | 'agriculture'
  | 'pottery'
  | 'archery'
  | 'animalHusbandry'
  | 'bronzeWorking'
  | 'masonry'
  | 'writing'
  | 'theWheel'
  | 'ironWorking'
  | 'mathematics'
  | 'currency'
  | 'construction'
  | 'philosophy'
  | 'engineering'
  | 'drama'
  | 'feudalism'
  | 'machinery'
  | 'theology'
  | 'chivalry'
  | 'steel'
  | 'physics'
  | 'education';

/** Ancient, Classical, Medieval. Later ages arrive with later content. */
export type TechAge = 1 | 2 | 3;

/** What a technology hands over. Both lists are optional; at least one is not. */
export interface TechUnlocks {
  units?: UnitTypeId[];
  buildings?: BuildingId[];
}

export interface TechDef {
  name: string;
  age: TechAge;
  /** Beakers to complete. Age-banded; see the pacing note in `tech.ts`. */
  cost: number;
  /** Every tech that must already be researched. Order is display order. */
  prereqs: TechId[];
  unlocks: TechUnlocks;
  /** One-line epigram for the tech screen. Flavour only. */
  flavor?: string;
}

export interface TechData {
  techs: Record<TechId, TechDef>;
}

export const TECH_DATA: TechData = techsJson as TechData;

/** Every tech id, in file order — which is the order the screen lays them out. */
export const TECH_IDS = Object.keys(TECH_DATA.techs) as TechId[];

export function techDef(id: TechId): TechDef {
  return TECH_DATA.techs[id];
}

/**
 * Runtime guard. A tech id arrives in a `chooseResearch` command, i.e. from a
 * save file or (eventually) a socket, so it may be any string at all.
 */
export function isTechId(value: unknown): value is TechId {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(TECH_DATA.techs, value)
  );
}

// --- the inverted table -----------------------------------------------------

function invert<T extends string>(pick: (unlocks: TechUnlocks) => T[] | undefined): Map<T, TechId> {
  const index = new Map<T, TechId>();
  for (const id of TECH_IDS) {
    for (const unlocked of pick(techDef(id).unlocks) ?? []) {
      // First writer wins, and `techDataProblems` reports a second one: two
      // techs unlocking the same thing is a data bug, not a feature.
      if (!index.has(unlocked)) index.set(unlocked, id);
    }
  }
  return index;
}

/** Which tech enables each unit type. Absent means "buildable from turn one". */
export const UNIT_UNLOCK_TECH: ReadonlyMap<UnitTypeId, TechId> = invert(
  (unlocks) => unlocks.units,
);

/** Which tech enables each building. Absent means "buildable from turn one". */
export const BUILDING_UNLOCK_TECH: ReadonlyMap<BuildingId, TechId> = invert(
  (unlocks) => unlocks.buildings,
);

// --- integrity --------------------------------------------------------------

/**
 * Every way `data/techs.json` can be wrong, as human-readable lines. Empty means
 * consistent.
 *
 * The sibling of `manifestProblems` in `src/render/spriteManifest.ts`, and here
 * for the same reason: a tree with a cycle, a dangling prerequisite or an unlock
 * naming a unit that does not exist is a data mistake that would otherwise
 * surface as a tech nobody can research, ten turns into somebody's game.
 */
export function techDataProblems(): string[] {
  const problems: string[] = [];

  for (const id of TECH_IDS) {
    const def = techDef(id);
    if (def.age !== 1 && def.age !== 2 && def.age !== 3) {
      problems.push(`tech "${id}" has age ${String(def.age)}, which is not 1, 2 or 3`);
    }
    if (!(def.cost > 0)) problems.push(`tech "${id}" costs ${String(def.cost)} beakers`);

    for (const prereq of def.prereqs) {
      if (!isTechId(prereq)) {
        problems.push(`tech "${id}" requires "${prereq}", which is not a tech`);
        continue;
      }
      if (techDef(prereq).age > def.age) {
        problems.push(`tech "${id}" (age ${def.age}) requires a tech from age ${techDef(prereq).age}`);
      }
    }

    const units = def.unlocks.units ?? [];
    const buildings = def.unlocks.buildings ?? [];
    if (units.length + buildings.length === 0) {
      problems.push(`tech "${id}" unlocks nothing (every node is a package — see Entry V)`);
    }
    for (const unit of units) {
      if (!isUnitTypeId(unit)) problems.push(`tech "${id}" unlocks unit "${unit}", which does not exist`);
      else if (UNIT_UNLOCK_TECH.get(unit) !== id) {
        problems.push(`unit "${unit}" is unlocked by both "${UNIT_UNLOCK_TECH.get(unit)}" and "${id}"`);
      }
    }
    for (const building of buildings) {
      if (!isBuildingId(building)) {
        problems.push(`tech "${id}" unlocks building "${building}", which does not exist`);
      } else if (BUILDING_UNLOCK_TECH.get(building) !== id) {
        problems.push(
          `building "${building}" is unlocked by both "${BUILDING_UNLOCK_TECH.get(building)}" and "${id}"`,
        );
      }
    }
  }

  for (const id of cyclicTechs()) problems.push(`tech "${id}" is part of a prerequisite cycle`);
  return problems;
}

/**
 * Techs that can never be researched because their prerequisites eventually
 * depend on them. A Kahn-style peel: whatever is left when nothing more can be
 * satisfied is exactly the cyclic remainder.
 */
function cyclicTechs(): TechId[] {
  const settled = new Set<TechId>();
  let progress = true;
  while (progress) {
    progress = false;
    for (const id of TECH_IDS) {
      if (settled.has(id)) continue;
      const ready = techDef(id).prereqs.every((prereq) => settled.has(prereq));
      if (!ready) continue;
      settled.add(id);
      progress = true;
    }
  }
  return TECH_IDS.filter((id) => !settled.has(id));
}
