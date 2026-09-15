import { afterEach, describe, expect, it } from 'vitest';
import type { BufferGeometry, Mesh } from 'three';
import { createWorldFixture } from '../../src/flairGallery/worldFixture';
import { PaintedGroundLayer, planPaintedRoads, planPaintedTerritory, type GroundPlan } from '../../src/render3d/paintedGround';
import { EXPLORED, VISIBLE } from '../../src/sim/visibility';
// @ts-expect-error Approved terrain JavaScript.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); });
const world = () => { const state = createWorldFixture(); return { state, prepared: prepareTerrainMap(state.map, { wrap: true }) }; };
const ground = (): PaintedGroundLayer => {
  const layer = new PaintedGroundLayer('test-ground', () => {}); cleanup.push(() => layer.dispose()); return layer;
};
const geometries = (layer: PaintedGroundLayer): BufferGeometry[] =>
  layer.group.children.map(object => (object as Mesh).geometry);
/** A deep copy of a plan: the same marks in a map the layer has never seen. */
const rephrase = (plan: GroundPlan): GroundPlan => new Map([...plan].map(([cell, marks]) => [cell, marks.map(mark => ({ ...mark }))]));

describe('the painted ground plans', () => {
  /**
   * A plan is a picture of the map, and a fog move is not a fact about the map.
   * The memo is the board's own fingerprint, so it cannot disagree with the
   * trigger the renderer already gates the rebuild on.
   */
  it('hands back the same plan until the ground itself changes', () => {
    const { state, prepared } = world();
    const roads = planPaintedRoads(state, prepared);
    expect(planPaintedRoads(state, prepared)).toBe(roads);
    const territory = planPaintedTerritory(state, prepared);
    expect(planPaintedTerritory(state, prepared)).toBe(territory);
    // A fog move is not a plan change.
    state.visibility[0]!.fill(EXPLORED);
    expect(planPaintedRoads(state, prepared)).toBe(roads);
    expect(planPaintedTerritory(state, prepared)).toBe(territory);
    // A road laid and a tile changing hands are.
    const paved = state.map.tiles.findIndex(tile => tile.road === undefined && tile.terrain === 'grassland');
    state.map.tiles[paved]!.road = 0;
    expect(planPaintedRoads(state, prepared)).not.toBe(roads);
    const owned = state.tileOwner.findIndex(id => id != null);
    state.tileOwner[owned] = null;
    expect(planPaintedTerritory(state, prepared)).not.toBe(territory);
  });

  /** A second game's first frame must not be handed the first game's borders. */
  it('never hands one game\'s plan to another', () => {
    const first = world(), second = world();
    const plan = planPaintedTerritory(first.state, first.prepared);
    expect(planPaintedTerritory(second.state, second.prepared)).not.toBe(plan);
  });
});

describe('the painted ground batches', () => {
  /** Nothing changed is nothing merged: the region keeps the buffer it had. */
  it('re-merges nothing when the plan and the fog are what they were', () => {
    const { state, prepared } = world(), layer = ground();
    const plan = planPaintedTerritory(state, prepared);
    layer.build(state, prepared, plan, state.visibility[0]);
    const before = geometries(layer), meshes = layer.group.children.slice();
    expect(before.length).toBeGreaterThan(0);
    layer.build(state, prepared, plan, state.visibility[0]);
    expect(geometries(layer)).toEqual(before);
    expect(layer.group.children).toEqual(meshes);
  });

  /**
   * The integer fold, stated as the thing it buys: a plan object the layer has
   * never seen, holding the same marks, re-clips nothing and re-merges nothing.
   * It was `JSON.stringify` per cell; this is the pin that the fold answers the
   * same question — and the second half is the pin that it still says *no* when
   * an ink actually moves.
   */
  it('reads a fresh plan of the same marks as the plan it already drew', () => {
    const { state, prepared } = world(), layer = ground();
    const plan = planPaintedTerritory(state, prepared);
    layer.build(state, prepared, plan, state.visibility[0]);
    const before = geometries(layer);
    layer.build(state, prepared, rephrase(plan), state.visibility[0]);
    expect(geometries(layer)).toEqual(before);
    const moved = rephrase(plan);
    const [cell, marks] = [...moved][0]!;
    marks[0]!.polygon = marks[0]!.polygon.map(([x, z]) => [x + .05, z]);
    layer.build(state, prepared, moved, state.visibility[0]);
    const after = geometries(layer);
    expect(after).not.toEqual(before);
    expect(layer.cells.has(cell)).toBe(true);
  });

  /** One cell's ink changing re-merges one region, and leaves the rest alone. */
  it('re-merges only the region whose ink changed', () => {
    const { state, prepared } = world(), layer = ground();
    const plan = planPaintedTerritory(state, prepared);
    layer.build(state, prepared, plan, state.visibility[0]);
    const before = new Set(geometries(layer));
    expect(before.size).toBeGreaterThan(1);
    const moved = rephrase(plan);
    // The far east of the map: a region the western cells do not share.
    const east = [...moved].reverse().find(([cell]) => cell % state.map.width > 17)!;
    east[1][0]!.polygon = east[1][0]!.polygon.map(([x, z]) => [x, z + .04]);
    layer.build(state, prepared, moved, state.visibility[0]);
    const after = new Set(geometries(layer));
    const kept = [...after].filter(geometry => before.has(geometry));
    expect(kept.length).toBeGreaterThan(0);
    expect(after.size).toBe(before.size);
    expect(kept.length).toBeLessThan(after.size);
  });

  /**
   * The wash rides a vertex attribute, so a hex crossing between watched and
   * remembered writes into the buffer the region already merged. Pinned here on
   * a single hex, which is the case a marching unit produces all day.
   */
  it('moves one hex\'s wash without moving a vertex', () => {
    const { state, prepared } = world(), layer = ground();
    const plan = planPaintedTerritory(state, prepared);
    state.visibility[0]!.fill(VISIBLE);
    layer.build(state, prepared, plan, state.visibility[0]);
    const before = geometries(layer);
    const cell = [...layer.cells][0]!;
    state.visibility[0]![cell] = EXPLORED;
    layer.build(state, prepared, plan, state.visibility[0]);
    expect(geometries(layer)).toEqual(before);
    const washed = before.map(geometry => [...(geometry.getAttribute('groundExplored').array as Float32Array)])
      .flat().filter(value => value === 1).length;
    expect(washed).toBeGreaterThan(0);
    state.visibility[0]![cell] = VISIBLE;
    layer.build(state, prepared, plan, state.visibility[0]);
    expect(geometries(layer)).toEqual(before);
    expect(before.map(geometry => [...(geometry.getAttribute('groundExplored').array as Float32Array)])
      .flat().every(value => value === 0)).toBe(true);
  });

  /**
   * A mark that clips to nothing is an answer, and it is remembered like any
   * other. Without it the cells whose ink falls off the tile top — a shoreline's
   * cut shoulder, most of them — re-tessellate their tile on every single build,
   * which was the whole of what a fog move still cost once the rest was cached.
   */
  it('remembers the cells whose ink clips to nothing', () => {
    const { state, prepared } = world(), layer = ground();
    const plan = planPaintedTerritory(state, prepared);
    layer.build(state, prepared, plan, state.visibility[0]);
    const inner = layer as unknown as { recipes: Map<number, { geometry: unknown }> };
    const drawn = layer.cells.size;
    const empty = [...inner.recipes.values()].filter(recipe => recipe.geometry === null).length;
    // The layer keeps an answer for every charted cell the plan names, drawn or not.
    expect(inner.recipes.size).toBe(drawn + empty);
    expect(inner.recipes.size).toBeGreaterThan(drawn);
    // And the empty ones are not drawn, on this build or the next.
    layer.build(state, prepared, plan, state.visibility[0]);
    expect(layer.cells.size).toBe(drawn);
    expect([...inner.recipes.values()].filter(recipe => recipe.geometry === null).length).toBe(empty);
  });

  /**
   * The shadow setting is a flag over the ribbons that are already merged, not a
   * fact about the merge. It used to ride in the batch's reuse test — so a
   * toggle re-merged every roaded and bordered region on the map — and nothing
   * asked this layer to rebuild on a toggle anyway, so ink laid while shadows
   * were off stayed unlit when they came on.
   */
  it('takes the shadow toggle over the batches it already merged', () => {
    const { state, prepared } = world();
    const plan = planPaintedTerritory(state, prepared);
    const lit = ground(), dark = ground();
    lit.build(state, prepared, plan, state.visibility[0], true);
    dark.build(state, prepared, plan, state.visibility[0], false);
    const flags = (layer: PaintedGroundLayer): boolean[] => layer.group.children.map(mesh => (mesh as Mesh).receiveShadow);
    expect(flags(dark)).toEqual(flags(lit).map(() => false));

    const before = geometries(dark);
    dark.setShadows(true);
    expect(flags(dark)).toEqual(flags(lit));
    // Not one region re-merged: the same buffers, in the same order.
    expect(geometries(dark)).toEqual(before);
    // And a rebuild at the new setting is still a reuse, not a re-merge.
    dark.build(state, prepared, plan, state.visibility[0], true);
    expect(geometries(dark)).toEqual(before);
    expect(flags(dark)).toEqual(flags(lit));
  });

  /** A new board is new triangles: every recipe and batch goes with the old one. */
  it('drops everything when the prepared map is replaced', () => {
    const { state, prepared } = world(), layer = ground();
    layer.build(state, prepared, planPaintedTerritory(state, prepared), state.visibility[0]);
    const before = geometries(layer);
    const second = prepareTerrainMap(state.map, { wrap: true });
    layer.build(state, second, planPaintedTerritory(state, second), state.visibility[0]);
    expect(geometries(layer).some(geometry => before.includes(geometry))).toBe(false);
    expect(geometries(layer).length).toBe(before.length);
  });
});
