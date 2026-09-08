/**
 * **The production standard** — batch P1, `docs/production-costs.md`, schema 89.
 *
 * One base per size, one curve by column, and nothing on the row:
 *
 *     price = sizeHammers[size] × columnRate ^ (column − 1)
 *
 * What this file guards is the *shape* of that, rather than any figure a
 * designer might retune tomorrow. Three concerns:
 *
 *   1. **The register.** No row carries a `cost` any more; every row carries a
 *      size the rule book prices; every row the tech tree does not name carries
 *      a column of its own. All three read the JSON itself, because a row that
 *      slipped through would typecheck (the loader is a cast) and then price at
 *      nought or `NaN` on a build list.
 *   2. **The fold**, line by line: the size line, the column line at the first
 *      column and at a late one, the empire's line composing on top, the
 *      settler's ladder composing on top, and the wonder-sized Opus.
 *   3. **The doc↔data sync** (`statecraftDocSync.test.ts`'s pattern, the user's
 *      workflow ruling of 2026-09-03): the assignment table in
 *      `docs/production-costs.md` is the spec of record for which row is which
 *      size, so a row sized in one place and not the other fails core.
 *
 * The prices themselves are pinned where they are made — `buildSinks.test.ts`
 * §2 and §2b — rather than a second time here.
 */
import { describe, expect, it } from 'vitest';

import BUILDINGS_JSON from '../../data/buildings.json';
import UNITS_JSON from '../../data/units.json';
import { BUILDING_IDS, buildingDef, isWonder } from '../../src/sim/buildingData';
import {
  buildingProductionCost,
  explainBuildingCost,
  explainUnitCost,
  foldUnitCost,
  unitProductionCost,
  unitRosterCost,
} from '../../src/sim/cities';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, newGame } from '../../src/sim/state';
import { BUILDING_UNLOCK_TECH, UNIT_UNLOCK_TECH, techColumn } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';

/** The rows as they are written down, not as the interface types them. */
const BUILDING_ROWS = (BUILDINGS_JSON as unknown as {
  buildings: Record<string, Record<string, unknown>>;
}).buildings;
const UNIT_ROWS = (UNITS_JSON as unknown as {
  units: Record<string, Record<string, unknown>>;
}).units;

function state(): GameState {
  return newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

// --- 1. the register --------------------------------------------------------

describe('the rows carry a size and never a price', () => {
  it('refuses a row that still carries a cost', () => {
    // Read off the JSON rather than off `BuildingDef`, because the loader is a
    // cast: a leftover `cost` would typecheck happily and then be a number
    // nobody reads, which is exactly the stale figure the standard was written
    // to delete. Projects keep theirs and are a different table.
    for (const [id, row] of Object.entries(BUILDING_ROWS)) {
      expect(row['cost'], `building "${id}" still carries a cost`).toBeUndefined();
    }
    for (const [id, row] of Object.entries(UNIT_ROWS)) {
      expect(row['cost'], `unit "${id}" still carries a cost`).toBeUndefined();
    }
  });

  it('gives every row a size the rule book prices', () => {
    for (const id of BUILDING_IDS) {
      const size = buildingDef(id).size;
      expect(size, id).toBeDefined();
      expect(RULES.production.sizeHammers[size], `${id} is sized "${size}"`).toBeDefined();
    }
    for (const id of UNIT_TYPE_IDS) {
      const size = unitDef(id).size;
      expect(size, id).toBeDefined();
      expect(RULES.production.unitSizeHammers[size], `${id} is sized "${size}"`).toBeDefined();
    }
  });

  it('gives every wonder the wonder size, and every unique the large one', () => {
    // The two sizing rules that are design statements rather than arithmetic:
    // a wonder is a wonder whatever it costs, and a capstone the whole realm
    // pays for is the dearest ordinary size there is.
    for (const id of BUILDING_IDS) {
      const def = buildingDef(id);
      if (isWonder(id)) expect(def.size, id).toBe('wonder');
      else if (def.oncePerEmpire === true) {
        // The Opus is a capstone *and* a wonder, and the wonder reading wins.
        expect(def.size, id).toBe(def.endsTheGame === true ? 'wonder' : 'large');
      }
    }
  });

  it('gives every ungated row a column of its own', () => {
    // A row with neither a gate nor a column would price at the first column by
    // the fold's own floor, silently — so the fault is caught here, by name.
    for (const id of BUILDING_IDS) {
      const def = buildingDef(id);
      if (BUILDING_UNLOCK_TECH.has(id) || def.worldUnlockTech !== undefined) continue;
      expect(def.column, `building "${id}" is opened by nothing and names no column`).toBeGreaterThan(0);
    }
    for (const id of UNIT_TYPE_IDS) {
      if (UNIT_UNLOCK_TECH.has(id)) continue;
      expect(
        unitDef(id).column,
        `unit "${id}" is opened by nothing and names no column`,
      ).toBeGreaterThan(0);
    }
  });

  it('leaves the projects’ own flat costs alone', () => {
    // The one table deliberately outside the standard: a project's cost is the
    // size of one conversion and is charged again the moment it is paid.
    const projects = (BUILDINGS_JSON as unknown as {
      projects: Record<string, Record<string, unknown>>;
    }).projects;
    for (const [id, row] of Object.entries(projects)) {
      expect(row['cost'], id).toBeGreaterThan(0);
      expect(row['size'], id).toBeUndefined();
    }
  });
});

// --- 2. the fold ------------------------------------------------------------

describe('the fold prints the standard one line at a time', () => {
  it('prints the size alone at the first column', () => {
    // The curve multiplies by one there, so there is nothing to say about it.
    const granary = explainBuildingCost('granary');
    expect(granary.map((line) => line.source)).toEqual(['Small building']);
    expect(granary[0]!.amount).toBe(RULES.production.sizeHammers.small);
    expect(buildingProductionCost('granary')).toBe(RULES.production.sizeHammers.small);
  });

  it('prints the column it read, and carries the multiplier as the line’s value', () => {
    const cathedral = explainBuildingCost('cathedral');
    expect(cathedral.map((line) => line.source)).toEqual([
      'Large building',
      'Column 8 ×6.62',
    ]);
    // The list is the arithmetic: each line carries the *difference* it makes,
    // so the fold is exact however the floors fall.
    expect(cathedral[0]!.amount).toBe(RULES.production.sizeHammers.large);
    expect(foldUnitCost(cathedral)).toBe(buildingProductionCost('cathedral'));
    expect(foldUnitCost(cathedral)).toBe(
      Math.floor(RULES.production.sizeHammers.large * RULES.production.columnRate ** 7),
    );
  });

  it('is the fold of its own lines for every row on both tables', () => {
    const game = state();
    for (const id of BUILDING_IDS) {
      expect(foldUnitCost(explainBuildingCost(id)), id).toBe(buildingProductionCost(id));
    }
    for (const id of UNIT_TYPE_IDS) {
      expect(foldUnitCost(explainUnitCost(game, 0, id)), id).toBe(
        unitProductionCost(game, 0, id),
      );
    }
  });

  it('composes the empire’s line on top of the column’s', () => {
    const game = state();
    // A one-city seat, which is what `newGame` hands out before anybody founds:
    // the unique's line is the realm's size and it lands after the curve.
    const lines = explainBuildingCost('forum', game, 0);
    expect(lines.map((line) => line.source)).toEqual([
      'Large building',
      'Column 6 ×3.86',
      'Empire of 1 cities ×0.50',
    ]);
    expect(foldUnitCost(lines)).toBe(buildingProductionCost('forum', game, 0));
    expect(foldUnitCost(lines)).toBe(Math.floor(buildingProductionCost('forum') * 0.5));
  });

  it('composes the settler’s ladder on top of its sized figure', () => {
    const game = state();
    const base = RULES.production.unitSizeHammers.settler;
    expect(unitProductionCost(game, 0, 'settler')).toBe(base);
    game.players[0]!.unitsBuilt.settler = 2;
    const third = explainUnitCost(game, 0, 'settler');
    expect(third.map((line) => line.source)).toEqual(['Settler', '2 already built']);
    expect(foldUnitCost(third)).toBe(base + 2 * unitDef('settler').escalation!);
  });

  it('prices the Magnum Opus as a wonder-sized unique at Alchemy’s column', () => {
    // The one row the tree opens through `worldUnlockTech` — a world gate is a
    // different door and the same statement about where in the tree it belongs.
    const opus = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;
    expect(buildingDef(opus).size).toBe('wonder');
    expect(buildingDef(opus).column).toBeUndefined();
    const column = techColumn(buildingDef(opus).worldUnlockTech!);
    expect(explainBuildingCost(opus)[1]!.source).toBe(
      `Column ${column} ×${(RULES.production.columnRate ** (column - 1)).toFixed(2)}`,
    );
    expect(buildingProductionCost(opus)).toBe(
      Math.floor(RULES.production.sizeHammers.wonder * RULES.production.columnRate ** (column - 1)),
    );
  });

  it('prints one line and no curve for a row that is never built', () => {
    // `free` is a size rather than an absent field, so every row answers the
    // same question — and multiplying nothing by a column would put a line on
    // the card saying nothing happened.
    for (const id of BUILDING_IDS) {
      if (buildingDef(id).size !== 'free') continue;
      expect(explainBuildingCost(id).map((line) => line.source), id).toEqual(['Never built']);
      expect(buildingProductionCost(id), id).toBe(0);
    }
    const game = state();
    for (const id of UNIT_TYPE_IDS) {
      if (unitDef(id).size !== 'free') continue;
      expect(explainUnitCost(game, 0, id).map((line) => line.source), id).toEqual(['Never built']);
      expect(unitProductionCost(game, 0, id), id).toBe(0);
    }
  });
});

// --- 3. the doc that mirrors the data ---------------------------------------

/**
 * The doc↔data sync test, `statecraftDocSync.test.ts`'s pattern exactly: the
 * assignment table in `docs/production-costs.md` is the spec of record for which
 * row is which size, so a row sized in one place and not the other fails core.
 * Retired rows are excluded on both sides — they keep their size in the data so
 * a save replays, and they leave the doc with the rest of the withdrawn content.
 */
describe('the production-costs doc mirrors the data', () => {
  const docFiles = import.meta.glob('../../docs/production-costs.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  /** Every `| \`id\` | Name | size | column | hammers |` row under one heading. */
  function docRows(heading: string): Map<string, { size: string; column: number; price: number }> {
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n### ', start + heading.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows = new Map<string, { size: string; column: number; price: number }>();
    for (const line of section.split('\n')) {
      const cells = line.split('|').map((cell: string) => cell.trim());
      if (cells.length < 7 || cells[0] !== '') continue;
      const id = /^`([A-Za-z]+)`$/.exec(cells[1] ?? '')?.[1];
      if (id === undefined) continue;
      rows.set(id, { size: cells[3]!, column: Number(cells[4]), price: Number(cells[5]) });
    }
    expect(rows.size, heading).toBeGreaterThan(0);
    return rows;
  }

  const columnOfBuilding = (id: (typeof BUILDING_IDS)[number]): number => {
    const gate = BUILDING_UNLOCK_TECH.get(id) ?? buildingDef(id).worldUnlockTech;
    return gate === undefined ? (buildingDef(id).column ?? 1) : Math.max(1, techColumn(gate));
  };
  const columnOfUnit = (id: (typeof UNIT_TYPE_IDS)[number]): number => {
    const gate = UNIT_UNLOCK_TECH.get(id);
    return gate === undefined ? (unitDef(id).column ?? 1) : Math.max(1, techColumn(gate));
  };

  it('lists every live building and wonder with the size the row carries', () => {
    const doc = new Map([...docRows('### Buildings'), ...docRows('### Wonders')]);
    const live = BUILDING_IDS.filter((id) => buildingDef(id).retired !== true);
    for (const id of live) {
      const row = doc.get(id);
      expect(row, `the doc is missing the building "${id}"`).toBeDefined();
      expect(row!.size, id).toBe(buildingDef(id).size);
      expect(row!.column, id).toBe(columnOfBuilding(id));
      expect(row!.price, id).toBe(buildingProductionCost(id));
    }
    // Doc → data: a row in the table that names no live row is a ghost, either
    // cut from the data or drifted in its id.
    const liveSet = new Set<string>(live);
    for (const id of doc.keys()) {
      expect(liveSet.has(id), `the doc names "${id}", which is not a live building`).toBe(true);
    }
  });

  it('lists every live unit with the size the row carries', () => {
    const doc = docRows('### Units');
    const live = UNIT_TYPE_IDS.filter((id) => unitDef(id).retired !== true);
    for (const id of live) {
      const row = doc.get(id);
      expect(row, `the doc is missing the unit "${id}"`).toBeDefined();
      expect(row!.size, id).toBe(unitDef(id).size);
      expect(row!.column, id).toBe(columnOfUnit(id));
      expect(row!.price, id).toBe(unitRosterCost(id));
    }
    const liveSet = new Set<string>(live);
    for (const id of doc.keys()) {
      expect(liveSet.has(id), `the doc names "${id}", which is not a live unit`).toBe(true);
    }
  });

  it('prints the rule book’s own figures in the doc’s table', () => {
    // The size bases and the rate, in the doc a designer tunes from: three
    // witnesses on one number, exactly as the sizes' docblock has it.
    for (const [size, base] of Object.entries(RULES.production.sizeHammers)) {
      if (size === 'free') continue;
      expect(DOC, size).toContain(`| **${size}** | ${base} |`);
    }
    for (const [size, base] of Object.entries(RULES.production.unitSizeHammers)) {
      if (size === 'free') continue;
      expect(DOC, size).toContain(`| **${size}** | ${base} |`);
    }
    expect(DOC).toContain(`\`columnRate\` **${RULES.production.columnRate}**`);
  });
});
