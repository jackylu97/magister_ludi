import { describe, expect, it } from 'vitest';
import { Quaternion } from 'three';
import { citizenCells, citizenGroundKinds, citizenOutlines, CitizenMarks, GROUND_KIND } from '../../src/render3d/citizenMarks';
import { VIEW3D } from '../../src/render3d/lookData';
import { createPaintedLightField } from '../../src/render3d/paintedFogLook';
import { MaterialLibrary } from '../../src/render3d/toon';
import { NO_LENS, sameLens, seenTileYields } from '../../src/render3d/lens3d';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { newGame } from '../sim/newGameHelpers';

function fixture() {
  const state = newGame({ seed: 2, sizeName: 'duel', players: [
    { name: 'A', color: '#7b2233', isHuman: true }, { name: 'B', color: '#324a99', isHuman: true },
  ] });
  state.map = createMap({ width: 18, height: 9, terrain: 'grassland' });
  state.units = []; state.cities = [];
  state.tileOwner = new Array(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const at = (col: number, row: number) => getTileAt(state.map, col, row)!;
  const id = (col: number, row: number) => tileIndex(state.map, col, row);
  const city = foundCityAt(state, 0, at(1, 4));
  const neighbour = foundCityAt(state, 0, at(5, 4));
  const foreign = foundCityAt(state, 1, at(9, 4));
  state.tileOwner[id(3, 4)] = neighbour.id;
  state.tileOwner[id(3, 5)] = neighbour.id;
  state.tileOwner[id(17, 4)] = city.id;
  state.tileOwner[id(1, 5)] = city.id;
  at(1, 5).terrain = 'mountain';
  city.workedTiles = [at(0, 4), at(1, 3)];
  city.lockedTiles = [at(1, 3), at(1, 5)];
  neighbour.workedTiles = [at(3, 4)];
  foreign.workedTiles = [at(9, 3)];
  const fog = state.visibility[0]!;
  fog.fill(VISIBLE);
  return { state, city, neighbour, id, fog };
}

describe('citizen marks', () => {
  it('separates the centre, worked, pinned, free and unavailable cells using the city rules', () => {
    const { state, city, neighbour, id, fog } = fixture();
    const { kinds, names, yieldTiles } = citizenCells(state, city, fog);
    expect(kinds.get(id(1, 4))).toBe('centre');
    expect(kinds.get(id(0, 4))).toBe('worked');
    expect(kinds.get(id(1, 3))).toBe('pinned');
    expect(kinds.get(id(17, 4))).toBe('free');
    expect(kinds.get(id(3, 5))).toBe('free');
    expect(kinds.has(id(1, 5))).toBe(false);
    expect(kinds.has(id(3, 4))).toBe(false);
    expect(names.get(id(3, 4))).toBe(neighbour.name);
    expect(names.has(id(9, 3))).toBe(false);
    expect(yieldTiles.map(t => id(t.col, t.row)).sort()).toEqual([...kinds].filter(([,kind]) => kind !== 'centre').map(([cell]) => cell).sort());
    expect(seenTileYields(state, 0, yieldTiles)).toHaveLength(yieldTiles.length);
  });

  it('removes all marks on an uncharted tile and keeps explored assignments', () => {
    const { state, city, id, fog } = fixture();
    fog[id(0, 4)] = HIDDEN; fog[id(3, 4)] = HIDDEN; fog[id(17, 4)] = EXPLORED;
    const { kinds, names, yieldTiles } = citizenCells(state, city, fog);
    expect(kinds.has(id(0, 4))).toBe(false);
    expect(names.has(id(3, 4))).toBe(false);
    expect(kinds.get(id(17, 4))).toBe('free');
    expect(yieldTiles.some(t => fog[id(t.col,t.row)] === HIDDEN)).toBe(false);
  });

  it('draws the outlines only in the mode, reuses them, and rebuilds for a pin', () => {
    const { state, city, fog } = fixture(), marks = new CitizenMarks();
    const materials = new MaterialLibrary(3, 0x222222), face = new Quaternion();
    const update = (manage: boolean, groundShaded: boolean) =>
      marks.update(state, city, citizenCells(state, city, fog), face, materials, manage, groundShaded);
    try {
      // A city screen with the mode off: the ground is the board's job, and there is no mark.
      update(false, true);
      expect(marks.group.children).toHaveLength(0);
      update(true, true);
      const first = marks.group.children[0], shaded = marks.group.children.length;
      // One worked and one pinned hex: two strips for the outer rings, two for the pinned hex's second ring.
      expect(shaded).toBe(4);
      update(true, true);
      expect(marks.group.children[0]).toBe(first);
      // The frozen toon board has no painted ground, so the marks add a wash decal there.
      update(true, false);
      expect(marks.group.children.length).toBeGreaterThan(shaded);
      city.lockedTiles = [];
      update(true, true);
      expect(marks.group.children[0]).not.toBe(first);
      expect(marks.group.children).toHaveLength(2);
      // The lens's `citizens` field: no city, a city open, and the mode are three pictures.
      const open = { ...NO_LENS, citizens: { cityId: 1, manage: false } };
      expect(sameLens(open, NO_LENS)).toBe(false);
      expect(sameLens(open, { ...NO_LENS, citizens: { cityId: 1, manage: true } })).toBe(false);
      expect(sameLens(open, { ...NO_LENS, citizens: { cityId: 1, manage: false } })).toBe(true);
      marks.clear();
      expect(marks.group.children).toHaveLength(0);
    } finally { marks.dispose(); materials.dispose(); }
  });

  it('outlines a worked hex once and a pinned hex twice, a little inside the hex', () => {
    const { state, id } = fixture();
    void id;
    const worked = [{ col: 0, row: 4 }, { col: 1, row: 3 }], pinned = [{ col: 1, row: 3 }];
    const strips = citizenOutlines(state.map, worked, pinned);
    // Ink over backing for the outer rings, and the same pair for the pinned hex's second ring.
    expect(strips).toHaveLength(4);
    expect(citizenOutlines(state.map, worked, [])).toHaveLength(2);
    expect(citizenOutlines(state.map, [], [])).toHaveLength(0);
    const art = VIEW3D.territory.citizens;
    expect(strips.map((strip) => strip.color)).toEqual([art.outlineBacking, art.outlineColor, art.outlineBacking, art.outlineColor]);
    // Every point of the outer ring is inside the hex, clear of the territory border's band and stitch.
    const reach = (strip: (typeof strips)[number]): number => { strip.geometry.computeBoundingBox(); const box = strip.geometry.boundingBox!; return (box.max.z - box.min.z) / 2; };
    const border = VIEW3D.territory.borderWidth + VIEW3D.territory.stitchWidth;
    expect(reach(strips[1]!)).toBeLessThan(VIEW3D.board.hexRadius * (1 - border) * 2);
    expect(reach(strips[3]!)).toBeLessThan(reach(strips[1]!));
    for (const strip of strips) strip.geometry.dispose();
  });

  it('tells the board which ground to set back', () => {
    const { state, city, id, fog } = fixture();
    const ground = citizenGroundKinds(state.map, citizenCells(state, city, fog));
    expect(ground).toHaveLength(state.map.tiles.length);
    expect(ground[id(0, 4)]).toBe(GROUND_KIND.worked);
    expect(ground[id(1, 3)]).toBe(GROUND_KIND.pinned);
    expect(GROUND_KIND.pinned).toBe(GROUND_KIND.worked);
    expect(ground[id(17, 4)]).toBe(GROUND_KIND.free);
    expect(ground[id(1, 4)]).toBe(GROUND_KIND.centre);
    // Another town's worked hex, a mountain, and ground far away are all set back furthest.
    expect(ground[id(3, 4)]).toBe(GROUND_KIND.unavailable);
    expect(ground[id(1, 5)]).toBe(GROUND_KIND.unavailable);
    expect(ground[id(12, 0)]).toBe(GROUND_KIND.unavailable);
  });

  it('sets the ground back in two spare channels of the light field, and takes it off again', () => {
    const field = createPaintedLightField(4, 2);
    const data = (field.texture.image as { data: Uint8Array }).data;
    field.write(0, 255, 255);
    expect(field.writeBack(0, 255, 0)).toBe(true);
    expect(field.writeBack(0, 255, 0)).toBe(false);
    // Cell 0 is texel 0; texel 1 is the mean of cells 0 and 1. Red and green are untouched.
    expect([...data.slice(0, 4)]).toEqual([255, 255, 255, 0]);
    expect(data[4 + 2]).toBe(127);
    expect(field.writeBack(1, 255, 255)).toBe(true);
    expect(data[4 + 2]).toBe(255);
    expect(data[4 + 3]).toBe(127);
    for (const cell of [0, 1]) field.writeBack(cell, 0, 0);
    expect([...data].filter((_, i) => i % 4 >= 2).every((value) => value === 0)).toBe(true);
    expect([...data.slice(0, 2)]).toEqual([255, 255]);
    field.dispose();
  });

});
