import { describe, expect, it } from 'vitest';
import { Quaternion } from 'three';
import { citizenCells, CitizenMarks } from '../../src/render3d/citizenMarks';
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

  it('reuses the shade for unchanged assignments and rebuilds for a pin or the Citizens toggle', () => {
    const { state, city, fog } = fixture(), marks = new CitizenMarks();
    const materials = new MaterialLibrary(3, 0x222222), face = new Quaternion();
    const update = (dots: boolean) => marks.update(state, city, citizenCells(state, city, fog), dots, face, materials);
    try {
      update(true);
      const first = marks.group.children[0], dots = marks.group.children.length;
      update(true);
      expect(marks.group.children[0]).toBe(first);
      update(false);
      expect(marks.group.children[0]).not.toBe(first);
      expect(marks.group.children.length).toBeLessThan(dots);
      const toggled = marks.group.children[0];
      city.lockedTiles = [];
      update(false);
      expect(marks.group.children[0]).not.toBe(toggled);
      expect(sameLens({ ...NO_LENS, citizens: { cityId: 1, dots: true } }, { ...NO_LENS, citizens: { cityId: 1, dots: false } })).toBe(false);
      marks.clear();
      expect(marks.group.children).toHaveLength(0);
    } finally { marks.dispose(); materials.dispose(); }
  });
});
