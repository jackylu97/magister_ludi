import { describe, expect, it } from 'vitest';
import { createWorldFixture } from '../../src/flairGallery/worldFixture';
import { VIEW3D } from '../../src/render3d/lookData';
import { type GroundPlan, type OrganicRoadStyle, planPaintedRoads } from '../../src/render3d/paintedGround';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, getTileAt, tileIndex, tileNeighbors } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
// @ts-expect-error Approved terrain JavaScript.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';

/**
 * The road plan keeps each hex's marks and plans again only the hexes a change
 * can reach (`planRoadCells` in `paintedGround.ts`). These tests hold its
 * output equal to a plan made from nothing after each change, and check that a
 * hex the change cannot reach keeps the very marks it had.
 */

/** A plan from nothing: a prepared map of its own, which no cache has seen. */
function fullPlan(state: GameState, organic: OrganicRoadStyle | null): GroundPlan {
  return planPaintedRoads(state, prepareTerrainMap(state.map, { wrap: true }) as GameMap, organic);
}

/** The same cells, in the same order, with marks equal field by field. */
function expectSamePlan(kept: GroundPlan, full: GroundPlan): void {
  expect([...kept.keys()]).toEqual([...full.keys()]);
  for (const [cell, marks] of full) expect(kept.get(cell)).toEqual(marks);
}

/** The cells a change at `cell` can reach: the hex itself and its neighbours. */
function reach(state: GameState, cell: number): Set<number> {
  const tile = state.map.tiles[cell]!;
  return new Set([cell, ...tileNeighbors(state.map, tile).map(other => tileIndex(state.map, other.col, other.row))]);
}

/** Every hex outside `near` that is in both plans holds the same marks object in both. */
function expectKeptOutside(before: GroundPlan, after: GroundPlan, near: Set<number>): void {
  let kept = 0;
  for (const [cell, marks] of after) {
    if (near.has(cell) || !before.has(cell)) continue;
    expect(marks).toBe(before.get(cell));
    kept++;
  }
  expect(kept).toBeGreaterThan(0);
}

describe.each([
  ['the straight roads', null],
  ['the organic roads', VIEW3D.visualTest.organicRoads],
] as const)('the road plan, %s', (_name, organic) => {
  it('matches a plan from nothing after a road is laid, a road is pillaged, a town is founded and an owner changes', () => {
    const state = createWorldFixture();
    const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
    const cellAt = (col: number, row: number): number => tileIndex(state.map, col, row);
    let plan = planPaintedRoads(state, prepared, organic);
    expectSamePlan(plan, fullPlan(state, organic));

    // A road laid beside the road on row 9.
    const laid = cellAt(12, 10);
    expect(state.map.tiles[laid]!.road).toBeUndefined();
    state.map.tiles[laid]!.road = 0;
    let next = planPaintedRoads(state, prepared, organic);
    expectSamePlan(next, fullPlan(state, organic));
    expect(next.has(laid)).toBe(true);
    expectKeptOutside(plan, next, reach(state, laid));
    plan = next;

    // A road pillaged on the east bank of the river crossing on row 7: the west
    // bank loses its half of the bridge.
    const bank = cellAt(12, 7);
    expect(state.map.tiles[bank]!.road).toBeDefined();
    delete state.map.tiles[bank]!.road;
    next = planPaintedRoads(state, prepared, organic);
    expectSamePlan(next, fullPlan(state, organic));
    expect(next.has(bank)).toBe(false);
    expectKeptOutside(plan, next, reach(state, bank));
    plan = next;

    // A town founded beside the lone road hex at (3, 10), and then a road laid
    // into it. The plan follows whatever roads the founding itself laid.
    const town = foundCityAt(state, 1, getTileAt(state.map, 3, 11)!);
    const founded = cellAt(town.col, town.row);
    next = planPaintedRoads(state, prepared, organic);
    expectSamePlan(next, fullPlan(state, organic));
    plan = next;
    state.map.tiles[founded]!.road = 1;
    next = planPaintedRoads(state, prepared, organic);
    expectSamePlan(next, fullPlan(state, organic));
    expect(next.has(founded)).toBe(true);
    expectKeptOutside(plan, next, reach(state, founded));
    plan = next;

    // A road hex changes hands: the plan reads whether a hex is paved, not by whom.
    const owned = cellAt(9, 8);
    state.tileOwner[owned] = state.cities[1]!.id;
    state.map.tiles[owned]!.road = 1;
    next = planPaintedRoads(state, prepared, organic);
    expectSamePlan(next, fullPlan(state, organic));
    expect(next).toBe(plan);
  });

  it('plans every hex again for a new map, so one game never draws another game\'s roads', () => {
    const first = createWorldFixture();
    const prepared = prepareTerrainMap(first.map, { wrap: true }) as GameMap;
    const plan = planPaintedRoads(first, prepared, organic);
    // Another game on the same prepared board, with one road fewer.
    const second = createWorldFixture();
    delete second.map.tiles[tileIndex(second.map, 3, 10)]!.road;
    const other = planPaintedRoads(second, prepared, organic);
    expectSamePlan(other, fullPlan(second, organic));
    for (const [cell, marks] of other) expect(marks).not.toBe(plan.get(cell));
  });
});
