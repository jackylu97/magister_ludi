/**
 * The outline around a city's work (`workedOutline`, `citizenMarks.ts`), and
 * what the pointer on a city changes while the player has the yields on
 * (`LensLayer.build`, `lens3d.ts`).
 *
 * The user, 2026-11-22: "When you have yields lens turned on, it lifts all
 * yields on the map when you mouse over a city", and "maybe we do an outline
 * around the entire area so that shared borders between hexes are not
 * outlined? I think pinned tiles dont need a special outline."
 *
 * The claims:
 *   1. The outline is one shape for hexes that touch: an edge two of them
 *      share is not drawn. Hexes that do not touch each get their own ring.
 *   2. It is two strips (ink over backing), inside the hexes it encloses, and
 *      nothing for no hexes.
 *   3. A pinned hex adds no line: the outline is the same with and without it.
 *   4. With the yields on and the pointer on a city, every yield figure on the
 *      board stays where it was. The city's worked hexes gain a backing and
 *      the outline, and nothing else.
 *   5. The layer draws the outline for an open city, in the mode and out of
 *      it, and for a city under the pointer.
 */

import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';

import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { workedOutline } from '../../src/render3d/citizenMarks';
import { cellCenter } from '../../src/render3d/layout';
import { LensLayer, NO_LENS, sameLens } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';
import type { LensView } from '../../src/ui/mapView';
import { newGame } from '../sim/newGameHelpers';

const ART = VIEW3D.territory.citizens;
const HEX = VIEW3D.board.hexRadius;
const geometry = new BoardGeometry();
const mats = (): MaterialLibrary => new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
const fakeIcons = { material: new MeshBasicMaterial(), standingMaterial: new MeshBasicMaterial() } as unknown as TileIcons;

function board(): { state: GameState; cityId: number } {
  const state = newGame({ seed: 2, sizeName: 'duel', players: [{ name: 'A', color: '#7b2233', isHuman: true }] });
  state.map = createMap({ width: 18, height: 10, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const city = foundCityAt(state, 0, getTileAt(state.map, 8, 5)!);
  city.workedTiles = [getTileAt(state.map, 9, 5)!, getTileAt(state.map, 7, 5)!];
  city.lockedTiles = [getTileAt(state.map, 9, 5)!];
  state.visibility[0]!.fill(VISIBLE);
  return { state, cityId: city.id };
}

/** Vertices of a strip: each station of a ring is one quad of two triangles. */
const vertices = (strip: { geometry: { getAttribute(name: string): { count: number } } }): number => strip.geometry.getAttribute('position').count;
/** Four stations an edge, six vertices a station. */
const PER_EDGE = 4 * 6;

describe('the outline around a city\'s work', () => {
  it('is one ring for hexes that touch, without the edges they share', () => {
    const { state } = board();
    const one = workedOutline(state.map, [{ col: 8, row: 5 }]);
    const pair = workedOutline(state.map, [{ col: 8, row: 5 }, { col: 9, row: 5 }]);
    const row = workedOutline(state.map, [{ col: 7, row: 5 }, { col: 8, row: 5 }, { col: 9, row: 5 }]);
    expect(one).toHaveLength(2);
    expect(vertices(one[1]!)).toBe(6 * PER_EDGE);
    // Two hexes that share an edge have ten outer edges, and three in a row have fourteen.
    expect(vertices(pair[1]!)).toBe(10 * PER_EDGE);
    expect(vertices(row[1]!)).toBe(14 * PER_EDGE);
    for (const strip of [...one, ...pair, ...row]) strip.geometry.dispose();
  });

  it('gives hexes that do not touch a ring each, and nothing for no hexes', () => {
    const { state } = board();
    const apart = workedOutline(state.map, [{ col: 4, row: 5 }, { col: 12, row: 5 }]);
    expect(vertices(apart[1]!)).toBe(12 * PER_EDGE);
    expect(workedOutline(state.map, [])).toEqual([]);
    for (const strip of apart) strip.geometry.dispose();
  });

  it('stays inside the hexes it encloses, the ink over a wider backing', () => {
    const { state } = board();
    const [backing, ink] = workedOutline(state.map, [{ col: 8, row: 5 }]);
    const centre = cellCenter(8, 5);
    const reach = (strip: typeof ink): number => { strip!.geometry.computeBoundingBox(); const box = strip!.geometry.boundingBox!; return Math.max(box.max.z - centre.z, centre.z - box.min.z); };
    expect(reach(ink)).toBeLessThan(HEX);
    expect(reach(ink)).toBeGreaterThan(HEX * (1 - ART.outlineInset * 2.2));
    expect(reach(backing)).toBeGreaterThan(reach(ink));
    expect(reach(backing)).toBeLessThan(HEX);
    expect([backing!.color, ink!.color]).toEqual([ART.outlineBacking, ART.outlineColor]);
    expect(ink!.order).toBeGreaterThan(backing!.order);
    backing!.geometry.dispose(); ink!.geometry.dispose();
  });
});

describe('the pointer on a city, with the yields on', () => {
  const lens = (over: Partial<LensView>): LensView => ({ ...NO_LENS, yields: true, ...over });
  function build(state: GameState, view: LensView): LensLayer {
    const layer = new LensLayer();
    layer.build(state, view, geometry, mats(), fakeIcons, new Quaternion(), null);
    return layer;
  }
  /** Where every yield figure on the board is, as sorted "x,z" strings. */
  function figures(layer: LensLayer): string[] {
    const shapes = new Set<unknown>([...Object.values(geometry.yieldGlyphs), ...geometry.numerals]);
    const out: string[] = [], scratch = new Matrix4(), at = new Vector3();
    for (const child of layer.group.children) {
      if (!(child instanceof InstancedMesh) || !shapes.has(child.geometry)) continue;
      for (let i = 0; i < child.count; i++) { child.getMatrixAt(i, scratch); at.setFromMatrixPosition(scratch); out.push(`${at.x.toFixed(4)},${at.z.toFixed(4)}`); }
    }
    return out.sort();
  }
  const outlines = (layer: LensLayer): number => layer.group.children.filter((child) => child instanceof InstancedMesh
    && (child.material as MeshBasicMaterial).opacity !== undefined && child.geometry.getAttribute('position').count % PER_EDGE === 0
    && !Object.values(geometry.yieldGlyphs).includes(child.geometry as never) && !geometry.numerals.includes(child.geometry as never)
    && child.geometry !== geometry.territory && child.geometry !== geometry.ring && child.geometry.getAttribute('position').count >= 6 * PER_EDGE).length;

  it('moves no yield figure anywhere on the board', () => {
    const { state, cityId } = board();
    const plain = build(state, lens({}));
    const hovered = build(state, lens({ citizens: { cityId, manage: false, hover: 'over' } }));
    expect(figures(plain).length).toBeGreaterThan(0);
    expect(figures(hovered)).toEqual(figures(plain));
    // And the city's work has its outline, which the plain board has not.
    expect(outlines(plain)).toBe(0);
    expect(outlines(hovered)).toBe(2);
    plain.dispose(); hovered.dispose();
  });

  it('draws the outline for an open city in the mode and out of it, and for a city under the pointer', () => {
    const { state, cityId } = board();
    for (const citizens of [{ cityId, manage: false }, { cityId, manage: true }, { cityId, manage: false, hover: 'only' as const }]) {
      const layer = build(state, lens({ citizens }));
      expect(outlines(layer), JSON.stringify(citizens)).toBe(2);
      layer.dispose();
    }
  });

  it('rebuilds when the player turns the yields on or off in an open city', () => {
    const { cityId } = board();
    const off = lens({ citizens: { cityId, manage: true, lensOn: false } }), on = lens({ citizens: { cityId, manage: true, lensOn: true } });
    expect(sameLens(off, on)).toBe(false);
    expect(sameLens(on, on)).toBe(true);
    expect(VIEW3D.territory.citizens.plaque.lensOn.scrimOpacity).toBeGreaterThan(VIEW3D.territory.citizens.plaque.scrimOpacity);
    expect(VIEW3D.territory.citizens.plaque.lensOn.otherOpacity).toBeLessThan(VIEW3D.territory.citizens.freeYieldOpacity);
  });
});
