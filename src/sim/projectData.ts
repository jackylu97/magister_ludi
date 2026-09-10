/**
 * Typed access to the `projects` table in `data/buildings.json`.
 *
 * A **project** is the third thing a city's queue can hold, and the only one
 * that never finishes: it costs hammers like a building, completes like a
 * building, and then stays exactly where it stood so the city starts paying for
 * it again. That is the whole of Entry XXVI — *a queue is never idle* — and it
 * is why a project is a repeatable item rather than a mode the city is switched
 * into: everything the queue already knows how to do (price a row, estimate its
 * turns, overflow into the next item, be finished early by a chop) works on it
 * unchanged, and `advanceProduction`'s "at most one item per city per turn" is
 * the rate limiter for free.
 *
 * Why it lives in `buildings.json`
 * --------------------------------
 * That file is not "the buildings" so much as *what a city may put in its
 * queue that is not a unit*, and a project shares a building's whole
 * vocabulary — a display name, a flat hammer cost, a technology that gates it
 * (declared forwards in `data/techs.json`'s `unlocks.projects`, exactly as a
 * building's is). A third data file would have bought a second `unlocks` key
 * and a second loader for one field's difference. The module is separate from
 * `buildingData.ts` because the *types* have nothing in common past the cost:
 * a building is a standing thing with yields, a project is a conversion.
 *
 * What a project pays, and why it is not a windfall
 * -------------------------------------------------
 * `pays` is a printed figure banked straight into the owner's pool the moment
 * the item completes. It deliberately does **not** go through Entry XVIII's
 * windfall path, and the reason is arithmetic rather than taste: the hammers a
 * project consumes were already staged on their way into the basket (Entry
 * XVII — city percentages, then the meter tiers, floored once, in
 * `collectYields`), so a payout that then rode the modifier pipeline a second
 * time would be charging one conversion two multiplications. A project is the
 * city's own exchange rate on hammers it has *already earned*: 20⚙ in, 5🪙 out,
 * and the number on the row is the number the treasury receives.
 *
 * Three of the four banks it may pay into are the ones nothing settles — gold,
 * science and faith all accumulate and are read where they lie.
 *
 * **Culture is the fourth, and it arrived by the door this docblock left open**
 * (Pageants, Code of Laws, `docs/history/tech-gifts.md` §7). `Player.culturePool` is a
 * *basket* whose filling is a draft (Entry XV), so a project paying it owes
 * `settleCultureWindfall` — and that is exactly how it joined: `payProject`
 * calls the wrapper, the way every other filler of that basket does, rather
 * than a field being added here and hoped over. It is entry 18 of the mid-turn
 * settlement register in CLAUDE.md by way of `settleProduction`, which already
 * stood there.
 */

import buildingsJson from '../../data/buildings.json';

import {
  type BeadBoon,
  type BeadEndeavourId,
  type BeadFamily,
  type BeadPrerequisite,
  BEAD_ENDEAVOUR_IDS,
  beadEndeavourDef,
  beadIsDormant,
} from './beadData';

/**
 * This module deliberately imports nothing from `techData.ts`, not even a type:
 * `techData` imports `ProjectId` from *here* to type `unlocks.projects`, and
 * the gate is declared forwards in the tech table, so there is nothing on this
 * side to name a technology with. It is `buildingData.ts`'s cycle rule with the
 * one import it still needs removed.
 *
 * **An endeavour is a project id too** (the Bead Race). A race project is a
 * queue row in every respect — priced, planned, paid for and completed by the
 * same routines — so it is a `ProjectId` rather than a fourth `QueueItem` kind,
 * and the queue needed no new arm at all. What separates it is one field,
 * `finishes`, and everything downstream reads that rather than asking where the
 * row came from.
 */
export type ProjectId = 'tithes' | 'scholarship' | 'pageants' | BeadEndeavourId;

/**
 * What one completion of a project banks for its owner.
 *
 * Every field optional and every field read by `payProject` (`cities.ts`), so
 * a designer adding `"faith": 3` to a row needs no code at all. Food and
 * production are absent on purpose — production would be a project that pays
 * for itself, and food belongs to a basket with a settlement of its own
 * (`settleGrowthWindfall`).
 *
 * `culture` is the one voice here that is a **basket** rather than a bank, and
 * it is why `payProject` ends with `settleCultureWindfall`: a pool that fills is
 * a draft owed, and the wrapper is the one place that debt is paid.
 */
export interface ProjectPayout {
  gold?: number;
  science?: number;
  faith?: number;
  culture?: number;
}

export interface ProjectDef {
  name: string;
  /** Hammers one turn of the conversion costs. */
  cost: number;
  /** What that many hammers become. See `ProjectPayout`. */
  pays: ProjectPayout;
  /** One line of flavour for the panel's card. */
  note: string;
  /**
   * **This project finishes.** Absent — which is every row in
   * `buildings.json` — means the repeating conversion Entry XXVI describes.
   *
   * The one field that separates an endeavour from Tithes, and everything else
   * about a race project is read off the three below it. `settleProduction`
   * splices a finishing project out of the queue exactly as it splices a
   * building, so "at most one item per city per turn" and the overflow rule are
   * inherited rather than re-stated.
   */
  finishes?: true;
  /** What the empire must already have before the row may be queued at all. */
  prerequisite?: BeadPrerequisite;
  /** What the **first** empire to finish takes. Nobody else gets either. */
  boon?: BeadBoon;
  /** The bead it clacks, and which family's rod it lands on. */
  bead?: { family: BeadFamily };
}

interface ProjectTable {
  projects: Record<'tithes' | 'scholarship' | 'pageants', ProjectDef>;
}

const BASE_PROJECTS: ProjectTable = buildingsJson as unknown as ProjectTable;

/**
 * The whole project table: the conversions from `buildings.json`, then every
 * **live** endeavour from `beads.json` adapted into the same shape.
 *
 * Since batch Q1 the second half is empty and the filter is why: the races are
 * retired (`docs/wager.md` §5), and a retired row leaves every pool — which for
 * a race project means the build list, the Compendium's shelf of projects and
 * the queue itself. `beadIsDormant` is the one predicate that answers it, so a
 * row waiting on a technology and a row withdrawn leave by the same door. The
 * ids stay in `ProjectId` for the rows' own sake; nothing offers them.
 *
 * Adapted here rather than duplicated in the bead table, so that the queue's
 * four readers (`planQueueItem`, `queueItemCost`, `queueItemName`,
 * `payProject`) keep asking one function about one shape. The adaptation is the
 * whole of it: a race project pays no conversion (`pays` is empty), and what it
 * *does* pay is its `boon`, settled once by `beads.ts` at the claim.
 */
function buildProjectTable(): Record<ProjectId, ProjectDef> {
  const table: Record<string, ProjectDef> = { ...BASE_PROJECTS.projects };
  for (const id of BEAD_ENDEAVOUR_IDS) {
    if (beadIsDormant(id)) continue;
    const def = beadEndeavourDef(id);
    table[id] = {
      name: def.name,
      cost: def.cost,
      pays: {},
      note: def.flavor,
      finishes: true,
      prerequisite: def.prerequisite,
      boon: def.boon,
      bead: { family: def.family },
    };
  }
  return table as Record<ProjectId, ProjectDef>;
}

export const PROJECT_DATA: { projects: Record<ProjectId, ProjectDef> } = {
  projects: buildProjectTable(),
};

export const PROJECT_IDS = Object.keys(PROJECT_DATA.projects) as ProjectId[];

export function projectDef(id: ProjectId): ProjectDef {
  return PROJECT_DATA.projects[id];
}

/** Is this row a race project rather than a repeating conversion? */
export function projectFinishes(id: ProjectId): boolean {
  return projectDef(id).finishes === true;
}

/**
 * Runtime guard. Production queues arrive from save files and (eventually)
 * sockets, so a `ProjectId` may be any string at all — `isBuildingId`'s twin.
 */
export function isProjectId(value: unknown): value is ProjectId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(PROJECT_DATA.projects, value)
  );
}

/**
 * "20⚙ → 5🪙", the rate a project trades at, said in the glyphs of the yields
 * it is between.
 *
 * Here rather than in the panel because it is a fact about the row and two
 * surfaces quote it (the build list's price and the hover card's headline), and
 * a second implementation is how a retuned cost stops matching its own label.
 * The glyphs are passed in, because `src/sim` may not know what a UI prints.
 */
export function projectRate(id: ProjectId, glyphs: Record<keyof ProjectPayout, string>): string {
  const def = projectDef(id);
  // A race project trades at no rate at all: it is paid for once and what it
  // pays is a bead and a boon, settled by `beads.ts` at the claim. Said in
  // words rather than glyphs, because there is no yield to name.
  if (def.finishes === true) return 'a bead';
  const parts: string[] = [];
  for (const key of ['gold', 'science', 'faith', 'culture'] as const) {
    const amount = def.pays[key];
    if (amount !== undefined && amount !== 0) parts.push(`${amount}${glyphs[key]}`);
  }
  return parts.join(' · ');
}
