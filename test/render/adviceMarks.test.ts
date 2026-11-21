/**
 * The marks that mean "the board recommends this hex" (`adviceMarks.ts`), and
 * the settler lens's ground (`settlerGroundKinds`, `siteTintOf` in `lens3d.ts`).
 *
 * The claims:
 *   1. The corner ticks stay inside their hex, and the heavier ticks and the
 *      backing are wider than the plain ones.
 *   2. The pips follow the score beside the best score.
 *   3. The settler lens gives each legal land hex one tint, sets refused land
 *      back, and leaves water alone. Fresh water wins over coast.
 *   4. On the painted board the lens draws no tint decal (the board tints its
 *      own ground). On the toon board it draws one decal for each legal land
 *      hex, at the hex's full size.
 *   5. Worker advice draws ticks under any lens, and the rebuild guard sees a
 *      change of the advised hexes.
 */

import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';

import { adviceShapes, cornerTicks, pipsFor, ruinLightMaterials } from '../../src/render3d/adviceMarks';
import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { LensLayer, NO_LENS, SITE_GROUND, sameLens, settlerGroundKinds, siteTintOf } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt, foundingErrorAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { bumpRevision, type GameState } from '../../src/sim/state';
import { EXPLORED, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { newGame } from '../sim/newGameHelpers';

const ADVICE = VIEW3D.lens.advice;
const geometry = new BoardGeometry();
const mats = (): MaterialLibrary => new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
const fakeIcons = { material: new MeshBasicMaterial(), standingMaterial: new MeshBasicMaterial() } as unknown as TileIcons;

/** A small land board with a strip of sea on the east side, one lake, and one town of seat 0. */
function board(): GameState {
  const state = newGame({ seed: 4, sizeName: 'duel', players: [{ name: 'A', color: '#a00', isHuman: true }] });
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  for (const tile of state.map.tiles) if (tile.col >= 10) tile.terrain = 'coast';
  getTileAt(state.map, 3, 6)!.terrain = 'lake';
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  for (const tile of state.map.tiles) delete tile.discovery;
  computeFreshwater(state.map);
  foundCityAt(state, 0, getTileAt(state.map, 1, 1)!);
  state.visibility[0]!.fill(EXPLORED);
  bumpRevision(state);
  return state;
}

function reach(shape: { computeBoundingBox(): void; boundingBox: { max: Vector3; min: Vector3 } | null }): number {
  shape.computeBoundingBox();
  const box = shape.boundingBox!;
  return Math.max(box.max.x, -box.min.x, box.max.z, -box.min.z);
}

describe('the corner ticks', () => {
  it('stay inside the hex, with the best and the backing wider than the plain ones', () => {
    const shapes = adviceShapes();
    for (const shape of [shapes.ticks, shapes.ticksBest, shapes.ticksBack, shapes.ticksBestBack]) {
      expect(reach(shape)).toBeLessThanOrEqual(VIEW3D.board.hexRadius);
    }
    expect(ADVICE.tickWidthBest).toBeGreaterThan(ADVICE.tickWidth);
    // Six corners, two arms each, two triangles an arm.
    expect(shapes.ticks.getAttribute('position').count).toBe(6 * 2 * 2 * 3);
    expect(reach(cornerTicks(ADVICE.tickWidth, ADVICE.tickBackingExtra))).toBeGreaterThan(reach(cornerTicks(ADVICE.tickWidth)));
  });

  it('gives three pips near the best score, two a little under, one below that', () => {
    expect(pipsFor(100, 100)).toBe(3);
    expect(pipsFor(100 * (1 - ADVICE.pipNear), 100)).toBe(3);
    expect(pipsFor(100 * (1 - ADVICE.pipMid), 100)).toBe(2);
    expect(pipsFor(50, 100)).toBe(1);
  });

  it('makes the ruin light from arithmetic, so it needs no canvas', () => {
    const light = ruinLightMaterials();
    expect(light.glow.map).not.toBeNull();
    expect(light.shaft.map).not.toBeNull();
    expect(light.glow.depthTest).toBe(false);
  });
});

describe('the settler lens', () => {
  it('tints each legal land hex once, sets refused land back and leaves water alone', () => {
    const state = board();
    const ground = settlerGroundKinds(state, 0, state.map.tiles);
    let tinted = 0;
    for (const tile of state.map.tiles) {
      const kind = ground[tileIndex(state.map, tile.col, tile.row)];
      if (tile.terrain === 'coast' || tile.terrain === 'lake') { expect(kind, `${tile.col},${tile.row}`).toBe(SITE_GROUND.none); continue; }
      if (foundingErrorAt(state, 0, tile) !== null) { expect(kind).toBe(SITE_GROUND.refused); continue; }
      expect(kind).toBe(SITE_GROUND[siteTintOf(state.map, tile)]);
      tinted += 1;
    }
    expect(tinted).toBeGreaterThan(0);
    // The town's own hex and its neighbours are refused.
    expect(ground[tileIndex(state.map, 1, 1)]).toBe(SITE_GROUND.refused);
    // All three tints are on this board, and fresh water wins on a hex that has coast too.
    const kinds = new Set([...ground]);
    for (const kind of [SITE_GROUND.fresh, SITE_GROUND.coast, SITE_GROUND.dry]) expect(kinds.has(kind), String(kind)).toBe(true);
    const lakeside = state.map.tiles.find((tile) => siteTintOf(state.map, tile) === 'fresh' && tile.terrain === 'grassland')!;
    expect(lakeside).toBeDefined();
  });

  it('draws no tint decal on the painted board, and one for each legal land hex on the toon board', () => {
    const state = board();
    const decals = (shaded: boolean): number => {
      const layer = new LensLayer();
      layer.build(state, { ...NO_LENS, mode: 'settler' }, geometry, mats(), fakeIcons, new Quaternion(), null, shaded);
      let count = 0;
      const scratch = new Matrix4(), scale = new Vector3();
      for (const child of layer.group.children) {
        if (!(child instanceof InstancedMesh) || child.geometry !== geometry.territory) continue;
        count += child.count;
        // Edge to edge: the decal is the hex's full size.
        child.getMatrixAt(0, scratch); scale.setFromMatrixScale(scratch);
        expect(scale.x).toBeCloseTo(1, 6);
      }
      expect(layer.settlerGround).not.toBeNull();
      layer.dispose();
      return count;
    };
    expect(decals(true)).toBe(0);
    const legal = state.map.tiles.filter((tile) => tile.terrain === 'grassland' && foundingErrorAt(state, 0, tile) === null).length;
    expect(decals(false)).toBe(legal * 3);
  });

  it('has no settler ground under another lens', () => {
    const layer = new LensLayer();
    layer.build(board(), { ...NO_LENS, mode: 'explorer' }, geometry, mats(), fakeIcons, new Quaternion(), null, true);
    expect(layer.settlerGround).toBeNull();
    layer.dispose();
  });
});

describe('worker advice on the board', () => {
  it('draws ticks on the advised hexes under no lens at all, the first one heavier', () => {
    const state = board();
    const layer = new LensLayer();
    layer.build(state, { ...NO_LENS, advice: [{ col: 5, row: 5 }, { col: 6, row: 5 }] }, geometry, mats(), fakeIcons, new Quaternion(), null);
    const shapes = adviceShapes();
    const count = (shape: unknown): number => layer.group.children
      .filter((child): child is InstancedMesh => child instanceof InstancedMesh && child.geometry === shape)
      .reduce((sum, mesh) => sum + mesh.count, 0);
    expect(count(shapes.ticksBest)).toBe(3);
    expect(count(shapes.ticks)).toBe(3);
    layer.dispose();
  });

  it('is part of the rebuild guard', () => {
    const a = { ...NO_LENS, advice: [{ col: 5, row: 5 }] }, b = { ...NO_LENS, advice: [{ col: 6, row: 5 }] };
    expect(sameLens(a, a)).toBe(true);
    expect(sameLens(a, b)).toBe(false);
    expect(sameLens(a, NO_LENS)).toBe(false);
  });
});
