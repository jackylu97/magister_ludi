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
 * insists that a tech never depends on a *later* age than its own. The chart
 * paints ages as background regions behind whatever columns their techs happen
 * to occupy (see `techAgeBands`) — an age annotates a position, it never sets
 * one.
 *
 * Where a tech sits on the chart
 * ------------------------------
 * The star chart is a dependency chart that scrolls sideways, so a node's
 * *column* is a fact about the graph and its *row* is a fact about the data:
 *
 *   - column = `techDepth`, the length of the longest prerequisite chain behind
 *     it. This is derived, never authored, which is what guarantees a chain
 *     reads as a chain — bronze working, iron working, steel march rightward
 *     because each one is strictly deeper than the last, and an edge can never
 *     point backwards.
 *   - `row` is hand-authored in `data/techs.json`, one lane per theme (the
 *     mounted line, the missile line, the metal line, stone and coin, word and
 *     faith), tuned by eye so related nodes stay on one line and prerequisite
 *     edges cross as little as possible. There is deliberately no automatic
 *     row-assignment algorithm: a sugiyama-style solver would re-shuffle the
 *     lanes every time a tech was added, and a tree whose shape a player has
 *     learnt is worth more than a tree with two fewer line crossings.
 *
 * `techDataProblems` insists every tech has a row and that no two share a
 * (column, row) cell, which is the whole failure mode hand-authoring has.
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
  /**
   * The lane this tech sits in on the star chart, hand-authored: 0 is the top
   * lane. Purely presentational — the column is derived (`techDepth`).
   */
  row: number;
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

// --- the chart's geometry ---------------------------------------------------

/**
 * Longest-prerequisite-chain depth, one entry per tech, relaxed rather than
 * recursed.
 *
 * A depth-first walk would be shorter to write and would stack-overflow on a
 * cyclic file instead of reporting it; this peels the same way `cyclicTechs`
 * does — every pass lifts each tech to one past its deepest prerequisite, and a
 * DAG settles in at most one pass per tech. The bound is therefore also the
 * cycle guard: a cyclic file stops climbing and gets caught by
 * `techDataProblems`, which is the file that is *allowed* to complain.
 */
function computeDepths(): Map<TechId, number> {
  const depth = new Map<TechId, number>(TECH_IDS.map((id) => [id, 0]));
  for (let pass = 0; pass < TECH_IDS.length; pass++) {
    let changed = false;
    for (const id of TECH_IDS) {
      let want = 0;
      for (const prereq of techDef(id).prereqs) {
        if (!isTechId(prereq)) continue;
        want = Math.max(want, (depth.get(prereq) ?? 0) + 1);
      }
      if (want === depth.get(id)) continue;
      depth.set(id, want);
      changed = true;
    }
    if (!changed) break;
  }
  return depth;
}

let depths: Map<TechId, number> | null = null;

/**
 * The chart column a tech belongs in: the length of the longest chain of
 * prerequisites behind it. Roots are 0.
 *
 * This is the one guarantee the drawing code leans on — a prerequisite is
 * always in a strictly earlier column than the tech that needs it — so every
 * connector runs left to right and no edge ever doubles back on itself.
 */
export function techDepth(id: TechId): number {
  depths ??= computeDepths();
  return depths.get(id) ?? 0;
}

/** How many columns the chart is wide. */
export function techColumnCount(): number {
  return TECH_IDS.reduce((widest, id) => Math.max(widest, techDepth(id) + 1), 0);
}

/** How many lanes the chart is deep, from the authored rows. */
export function techRowCount(): number {
  return TECH_IDS.reduce((deepest, id) => Math.max(deepest, techDef(id).row + 1), 0);
}

/** A run of columns painted with one age's numeral. `to` is inclusive. */
export interface TechAgeBand {
  age: TechAge;
  from: number;
  to: number;
}

/**
 * The columns each age owns, as contiguous runs.
 *
 * Ages and depths disagree at the seams — The Wheel is Ancient but sits as deep
 * as three Classical techs — so a band cannot simply be "the columns this age's
 * techs occupy" without overlapping its neighbours. Each column instead takes
 * the age *most* of its techs belong to (ties to the earlier age, so a seam
 * column stays with the age it grew out of), the result is forced to never run
 * backwards, and equal neighbours merge. The bands that come out are therefore
 * always contiguous, in order, and cover every column exactly once — which is
 * what lets the chart paint them as background regions.
 */
export function techAgeBands(): TechAgeBand[] {
  const columns = techColumnCount();
  const bands: TechAgeBand[] = [];
  let previous: TechAge = 1;

  for (let column = 0; column < columns; column++) {
    const tally: Record<TechAge, number> = { 1: 0, 2: 0, 3: 0 };
    for (const id of TECH_IDS) {
      if (techDepth(id) !== column) continue;
      const { age } = techDef(id);
      if (age === 1 || age === 2 || age === 3) tally[age]++;
    }
    // Ascending order plus a strict `>` is the tie-break: an even split stays
    // with the earlier age. An empty column (only possible in a half-written
    // file) inherits the column before it.
    let best: TechAge | null = null;
    for (const candidate of [1, 2, 3] as TechAge[]) {
      if (tally[candidate] === 0) continue;
      if (best === null || tally[candidate] > tally[best]) best = candidate;
    }
    const age: TechAge = best === null || best < previous ? previous : best;
    previous = age;

    const last = bands[bands.length - 1];
    if (last && last.age === age) last.to = column;
    else bands.push({ age, from: column, to: column });
  }
  return bands;
}

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
    // The chart cannot place a tech without a lane, and two techs in one cell
    // would draw one on top of the other — both are silent on screen, so they
    // are loud here.
    if (!Number.isInteger(def.row) || def.row < 0) {
      problems.push(`tech "${id}" has row ${String(def.row)}, which is not a lane number`);
    }

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

  const occupied = new Map<string, TechId>();
  for (const id of TECH_IDS) {
    const cell = `${techDepth(id)},${techDef(id).row}`;
    const sitting = occupied.get(cell);
    if (sitting !== undefined) {
      problems.push(`techs "${sitting}" and "${id}" both sit at chart cell (${cell})`);
      continue;
    }
    occupied.set(cell, id);
  }
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
