import { describe, expect, it } from 'vitest';
import { createWorldFixture } from '../../src/flairGallery/worldFixture';
import { VIEW3D } from '../../src/render3d/lookData';
import { type BorderStyle, type GroundPlan, planPaintedTerritory, planPaintedTerritoryTint } from '../../src/render3d/paintedGround';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, getTileAt, tileIndex, tileNeighbors } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
// @ts-expect-error Approved terrain JavaScript.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';

/**
 * The border plans keep each edge's marks and plan again only the edges near a
 * hex whose seat changed (`keepBorder` in `paintedGround.ts`). These tests hold
 * the line plan and the tint plan equal to plans made from nothing after each
 * change, for every border style, and check that the hexes far from a change
 * keep the very marks they had.
 */

const data = VIEW3D.visualTest.borders;
const STYLES: [string, BorderStyle | null][] = [
  ['no style', null],
  ['the game\'s style', { ...data, kind: 'drape' }],
  ['the outline rule on', { ...data, holeMax: 8, fillPasses: 2, kind: 'drape' }],
  ['draped over the relief', { ...data, level: false, holeMax: 8, fillPasses: 2, kind: 'drape' }],
  ['ruled', { ...data, holeMax: 8, fillPasses: 2, kind: 'ruled' }],
  ['ruled with a wash', { ...data, holeMax: 8, fillPasses: 2, kind: 'wash' }],
];

type Plans = { lines: GroundPlan; tint: GroundPlan | null };
const plan = (state: GameState, prepared: GameMap, style: BorderStyle | null): Plans => ({
  lines: planPaintedTerritory(state, prepared, style),
  tint: style ? planPaintedTerritoryTint(state, prepared, style) : null,
});
/** Plans from nothing: a prepared map of their own, which no cache has seen. */
const fullPlans = (state: GameState, style: BorderStyle | null): Plans => plan(state, prepareTerrainMap(state.map, { wrap: true }) as GameMap, style);

/** The same cells, in the same order, with marks equal field by field. */
function expectSamePlan(kept: GroundPlan | null, full: GroundPlan | null): void {
  if (!kept || !full) { expect(kept).toBe(full); return; }
  expect([...kept.keys()]).toEqual([...full.keys()]);
  for (const [cell, marks] of full) expect(kept.get(cell)).toEqual(marks);
}
const expectSame = (kept: Plans, full: Plans): void => { expectSamePlan(kept.lines, full.lines); expectSamePlan(kept.tint, full.tint); };

/** The cells more than `reach` hexes from `cell`. */
function farFrom(state: GameState, cell: number, reach: number): Set<number> {
  let frontier = [cell];
  const near = new Set(frontier);
  for (let ring = 0; ring < reach; ring++) {
    const next: number[] = [];
    for (const at of frontier) for (const other of tileNeighbors(state.map, state.map.tiles[at]!)) {
      const index = tileIndex(state.map, other.col, other.row);
      if (!near.has(index)) { near.add(index); next.push(index); }
    }
    frontier = next;
  }
  return new Set(state.map.tiles.map((_, i) => i).filter(i => !near.has(i)));
}

/** Every mark of a far hex is the object the last plan had there. Returns how many were checked. */
function keptFar(before: GroundPlan, after: GroundPlan, far: Set<number>): number {
  let kept = 0;
  for (const [cell, marks] of after) {
    if (!far.has(cell) || !before.has(cell)) continue;
    const old = before.get(cell)!;
    expect(marks.length).toBe(old.length);
    marks.forEach((mark, i) => expect(mark).toBe(old[i]));
    kept += marks.length;
  }
  return kept;
}

describe.each(STYLES)('the border plan, %s', (_name, style) => {
  it('matches a plan from nothing after a hex changes hands, a hex is lost, a hole opens, a town is captured and a town is founded', () => {
    const state = createWorldFixture();
    const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
    const cellAt = (col: number, row: number): number => tileIndex(state.map, col, row);
    const [west, east] = state.cities as [typeof state.cities[number], typeof state.cities[number]];
    let plans = plan(state, prepared, style);
    expectSame(plans, fullPlans(state, style));

    /** One change, then the kept plans against plans from nothing, and the far hexes' marks kept. */
    const step = (cell: number, change: () => void, expectKept = true): void => {
      change();
      const next = plan(state, prepared, style);
      expectSame(next, fullPlans(state, style));
      if (expectKept) {
        // Planned again: the edges within four hexes of the change, and a draped band reaches three hexes on.
        const far = farFrom(state, cell, 8);
        expect(keptFar(plans.lines, next.lines, far)).toBeGreaterThan(0);
        if (plans.tint && next.tint) keptFar(plans.tint, next.tint, far);
      }
      plans = next;
    };
    // A hex on the frontier between the two courts changes hands.
    step(cellAt(10, 6), () => { state.tileOwner[cellAt(10, 6)] = west.id; });
    // A hex on the west court's south edge is lost.
    step(cellAt(2, 8), () => { state.tileOwner[cellAt(2, 8)] = null; });
    // A hole opens inside the west court: with the outline rule on, it is closed over and gets a gap line.
    step(cellAt(3, 6), () => { state.tileOwner[cellAt(3, 6)] = null; });
    // The east court's town is captured: every one of its hexes takes the west's inks.
    step(cellAt(13, 6), () => { east.ownerId = west.ownerId; }, false);
    // A town is founded to the south, with the ring round it.
    step(cellAt(14, 12), () => {
      const town = foundCityAt(state, 1, getTileAt(state.map, 14, 12)!);
      for (const other of tileNeighbors(state.map, getTileAt(state.map, 14, 12)!)) state.tileOwner[tileIndex(state.map, other.col, other.row)] = town.id;
      state.tileOwner[cellAt(14, 12)] = town.id;
    });
  });

  it('plans every edge again for another game on the same board', () => {
    const first = createWorldFixture();
    const prepared = prepareTerrainMap(first.map, { wrap: true }) as GameMap;
    const before = plan(first, prepared, style);
    const second = createWorldFixture();
    second.tileOwner[tileIndex(second.map, 2, 8)] = null;
    const after = plan(second, prepared, style);
    expectSame(after, fullPlans(second, style));
    for (const [cell, marks] of after.lines) for (const mark of marks) expect(before.lines.get(cell)?.includes(mark) ?? false).toBe(false);
  });

  // The reach of a change is the one assumption the kept plan makes, so it is
  // also tried on many small changes in a row: hexes taken, lost and swapped at
  // random (a fixed sequence) round both courts.
  it('matches a plan from nothing after each of many changes in a row', () => {
    const state = createWorldFixture();
    const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
    const towns = [state.cities[0]!.id, state.cities[1]!.id, null];
    let seed = 7;
    const next = (n: number): number => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % n; };
    plan(state, prepared, style);
    for (let i = 0; i < 16; i++) {
      const cell = tileIndex(state.map, next(state.map.width), 2 + next(9));
      state.tileOwner[cell] = towns[next(towns.length)]!;
      expectSame(plan(state, prepared, style), fullPlans(state, style));
    }
  });
});
