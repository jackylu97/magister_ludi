/**
 * The faint gap line of the border outline (visual switch 3,
 * `planPaintedTerritoryTint` in `paintedGround.ts`).
 *
 * The outline closes over an unowned hex that has enough of an empire's hexes
 * round it, and a thin line in the seat's colour runs round that hex's edges
 * toward the owned land, so the player can see that the hex is not theirs. The
 * line marks the hex, so it must lie on the hex's own ground.
 *
 * On a hill it did not. Each edge of the line was a flat strip at the highest
 * ground found along that edge, and each corner rose to the next edge's height.
 * Where a hill's ground climbs along an edge (a mound shared with the next hill,
 * or a mound close to the edge), the whole ring stood at the hill's height, well
 * above the ground at the low end of each edge. From the game camera it read as
 * a second, ghost border lifted off the hex (the user, 2026-11-16).
 */

import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Mesh } from 'three';

import { createSceneFixture } from '../../src/flairGallery/sceneFixture';
import { PaintedGroundLayer, planPaintedTerritory, planPaintedTerritoryTint, territoryRegion, type BorderStyle, type GroundPlan } from '../../src/render3d/paintedGround';
import { VIEW3D } from '../../src/render3d/lookData';
import { tileOwnerPlayerId } from '../../src/sim/cities';
import type { Tile } from '../../src/sim/map';
// @ts-expect-error The terrain modules remain JavaScript.
import { centre, neighbour, prepareTerrainMap, surfaceHeight } from '../../src/terrainStudy/surface.js';

// The fill rule is off in the game's data (the user, 2026-11-17: an unowned hex always reads as outside the border).
// This test turns it on, because an enclosed hole still gets a gap line and the line must lie on the ground.
const style: BorderStyle = { ...VIEW3D.visualTest.borders, fillNeighbours: 4, fillPasses: 2, kind: 'drape' };
const ground = (tile: Tile, x: number, z: number): number => surfaceHeight(tile, x * .999, z * .999) as number;

/**
 * The scene's ridge of hills under the mountains, with one hill on the west
 * court's north edge left unowned: hex (6, 5). Its four southern neighbours are
 * the west's, and the two mountains north of it are nobody's, so the outline
 * closes over it. This is the user's case turned north to south.
 */
function unownedHill() {
  const state = createSceneFixture();
  const width = state.map.width, cell = 5 * width + 6;
  state.tileOwner[cell] = null;
  const prepared = prepareTerrainMap(state.map, { wrap: true });
  const tile = prepared.tiles[cell] as Tile;
  return { state, prepared, cell, tile };
}

/** Every vertex the tint layer draws for these marks, in the hex's own coordinates. */
function drawnVertices(state: ReturnType<typeof createSceneFixture>, prepared: unknown, cell: number, plan: GroundPlan): [number, number, number][] {
  const layer = new PaintedGroundLayer('test-gap-line', () => {}, { tint: true });
  try {
    layer.build(state, prepared as never, plan, null);
    const geometry = (layer.group.children[0] as Mesh).geometry as BufferGeometry;
    const position = geometry.getAttribute('position');
    const c = centre((prepared as { tiles: Tile[] }).tiles[cell]) as { x: number; z: number };
    const out: [number, number, number][] = [];
    for (let i = 0; i < position.count; i++) out.push([position.getX(i) - c.x, position.getY(i), position.getZ(i) - c.z]);
    return out;
  } finally { layer.dispose(); }
}

describe('the gap line round an unowned hex inside the border outline', () => {
  it('is drawn round an unowned hill that the outline closes over', () => {
    const { state, prepared, cell, tile } = unownedHill();
    expect(tile.hills).toBe(true);
    expect(tileOwnerPlayerId(state, 6, 5)).toBeNull();
    const owned = Array.from({ length: 6 }, (_, d) => neighbour(tile, prepared, d) as Tile)
      .filter(other => tileOwnerPlayerId(state, other.col, other.row) === 0);
    expect(owned.length).toBe(4);
    const cityOwners = new Map(state.cities.map(city => [city.id, city.ownerId]));
    const owner = state.tileOwner.map(id => id == null ? undefined : cityOwners.get(id));
    expect(territoryRegion(owner, prepared, style)[cell]).toBe(0);
    // The strong line runs round the outline, which takes in the hill, and the
    // gap line runs round the hill's four edges toward the owned land.
    expect(planPaintedTerritory(state, prepared, style).get(cell)?.length).toBeGreaterThan(0);
    const gap = planPaintedTerritoryTint(state, prepared, style).get(cell)!.filter(mark => mark.fade?.alpha === style.gapAlpha);
    expect(gap.length).toBeGreaterThan(0);
  });

  it('lies on the hill\'s ground and does not float above it', () => {
    const { state, prepared, cell, tile } = unownedHill();
    // The case that floated: the hill's ground rises along an edge toward the owned land.
    const apothem = Math.sqrt(3) / 2;
    const west = Array.from({ length: 9 }, (_, k) => ground(tile, -apothem, -.5 + k / 8));
    expect(Math.max(...west) - Math.min(...west)).toBeGreaterThan(.1);
    const gap: GroundPlan = new Map([[cell, planPaintedTerritoryTint(state, prepared, style).get(cell)!
      .filter(mark => mark.fade?.alpha === style.gapAlpha)]]);
    const vertices = drawnVertices(state, prepared, cell, gap);
    expect(vertices.length).toBeGreaterThan(0);
    // Nothing more than the ground ink's own lift above the ground. (Ink laid on
    // the ground also leaves a copy on the hex's flat plate under a mound, as a
    // road does; the mound hides it, so a vertex below the ground is allowed.)
    for (const [x, y, z] of vertices) expect(y - ground(tile, x, z)).toBeLessThan(.03);
    // And the line climbs onto the mound, rather than only passing under it.
    expect(vertices.some(([x, y, z]) => ground(tile, x, z) > .3 && Math.abs(y - ground(tile, x, z)) < .03)).toBe(true);
  });
});
