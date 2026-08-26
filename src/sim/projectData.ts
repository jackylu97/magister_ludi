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
 * The three banks it may pay into are the three that nothing settles — gold,
 * science and faith all accumulate and are read where they lie. Culture is
 * deliberately absent: `Player.culturePool` is a *basket* whose filling is a
 * draft (Entry XV), so a project paying it would owe `settleCultureWindfall`
 * and would be exactly the second path into a bucket that CLAUDE.md's register
 * exists to forbid. The day a culture project is wanted, it joins by calling
 * that wrapper — never by adding a field here and hoping.
 */

import buildingsJson from '../../data/buildings.json';

/**
 * This module deliberately imports nothing from `techData.ts`, not even a type:
 * `techData` imports `ProjectId` from *here* to type `unlocks.projects`, and
 * the gate is declared forwards in the tech table, so there is nothing on this
 * side to name a technology with. It is `buildingData.ts`'s cycle rule with the
 * one import it still needs removed.
 */
export type ProjectId = 'tithes' | 'scholarship';

/**
 * What one completion of a project banks for its owner.
 *
 * Every field optional and every field read by `payProject` (`cities.ts`), so
 * a designer adding `"faith": 3` to a row needs no code at all. Food and
 * production are absent on purpose — production would be a project that pays
 * for itself, and food belongs to a basket with a settlement of its own
 * (`settleGrowthWindfall`).
 */
export interface ProjectPayout {
  gold?: number;
  science?: number;
  faith?: number;
}

export interface ProjectDef {
  name: string;
  /** Hammers one turn of the conversion costs. */
  cost: number;
  /** What that many hammers become. See `ProjectPayout`. */
  pays: ProjectPayout;
  /** One line of flavour for the panel's card. */
  note: string;
}

interface ProjectTable {
  projects: Record<ProjectId, ProjectDef>;
}

export const PROJECT_DATA: ProjectTable = buildingsJson as unknown as ProjectTable;

export const PROJECT_IDS = Object.keys(PROJECT_DATA.projects) as ProjectId[];

export function projectDef(id: ProjectId): ProjectDef {
  return PROJECT_DATA.projects[id];
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
  const parts: string[] = [];
  for (const key of ['gold', 'science', 'faith'] as const) {
    const amount = def.pays[key];
    if (amount !== undefined && amount !== 0) parts.push(`${amount}${glyphs[key]}`);
  }
  return parts.join(' · ');
}
