import { describe, expect, it } from 'vitest';
import { Quaternion } from 'three';
import { citizenCells, citizenGroundKinds, CitizenMarks, GROUND_KIND, pinHeadMaterial, plaqueMargin, plaqueMaterial } from '../../src/render3d/citizenMarks';
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

  it('draws the mode\'s wash only on the toon board, and nothing with the mode off', () => {
    const { state, city, fog } = fixture(), marks = new CitizenMarks();
    const materials = new MaterialLibrary(3, 0x222222), face = new Quaternion();
    const update = (manage: boolean, groundShaded: boolean) =>
      marks.update(state, city, citizenCells(state, city, fog), face, materials, manage, groundShaded);
    try {
      // The plaques are the lens layer's, with the yields. On the painted board the
      // mode's marks here are only the other towns' names, which need a canvas.
      update(false, true);
      expect(marks.group.children).toHaveLength(0);
      update(true, true);
      expect(marks.group.children).toHaveLength(0);
      // The frozen toon board has no painted ground, so the marks add a wash decal there.
      update(true, false);
      const first = marks.group.children[0];
      expect(marks.group.children.length).toBeGreaterThan(0);
      update(true, false);
      expect(marks.group.children[0]).toBe(first);
      city.lockedTiles = [];
      update(true, false);
      expect(marks.group.children[0]).not.toBe(first);
      // The lens's `citizens` field: no city, a city open, the mode, and the pointer on a city are four pictures.
      const open = { ...NO_LENS, citizens: { cityId: 1, manage: false } };
      expect(sameLens(open, NO_LENS)).toBe(false);
      expect(sameLens(open, { ...NO_LENS, citizens: { cityId: 1, manage: true } })).toBe(false);
      expect(sameLens(open, { ...NO_LENS, citizens: { cityId: 1, manage: false, hover: 'only' } })).toBe(false);
      expect(sameLens(open, { ...NO_LENS, citizens: { cityId: 1, manage: false } })).toBe(true);
      marks.clear();
      expect(marks.group.children).toHaveLength(0);
    } finally { marks.dispose(); materials.dispose(); }
  });

  it('has no plaque and no pin head where there is no canvas, and a plaque quad wider than its paper', () => {
    expect(plaqueMaterial(0.5, 0.4)).toBeNull();
    expect(pinHeadMaterial(0xb5301f)).toBeNull();
    expect(plaqueMargin()).toBeGreaterThan(VIEW3D.territory.citizens.plaque.shadow);
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
