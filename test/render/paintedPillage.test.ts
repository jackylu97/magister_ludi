import { expect, it } from 'vitest';
import { Mesh } from 'three';
import { PaintedPillageLayer } from '../../src/render3d/paintedPillage';
import type { PaintedWorksEntry } from '../../src/render3d/paintedWorks';
import { createMap, damageImprovement, raiseImprovement, type GameMap } from '../../src/sim/map';
import { EXPLORED, VISIBLE } from '../../src/sim/visibility';
// @ts-expect-error The renderer shares the JavaScript terrain kit.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
import { newGame } from '../sim/newGameHelpers';

it('shares visible fires across wrap copies and releases the fire after the raid turn', () => {
  const state = newGame({ seed: 2, sizeName: 'duel', players: [
    { name: 'Red', color: '#ac3333', isHuman: true }, { name: 'Blue', color: '#3344ac', isHuman: false },
  ] });
  state.map = createMap({ width: 10, height: 6, terrain: 'grassland' });
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const layer = new PaintedPillageLayer();
  const entries = [11, 12].map((cell): PaintedWorksEntry => ({
    cell, improvement: undefined, resource: null, level: VISIBLE, damage: 'mine', step: 1,
  }));
  try {
    layer.update(state, prepared, []);
    expect(layer.group.children.every(group => group.children.length === 0)).toBe(true);
    for (const {cell} of entries) {
      const tile = state.map.tiles[cell]!;
      raiseImprovement(tile, 'mine', state.turn);
      damageImprovement(tile, state.turn);
    }
    layer.update(state, prepared, entries);
    const ash = layer.ash.children[1];
    const fire = layer.fire.children[1] as Mesh;
    expect(layer.fire.children).toHaveLength(3);
    expect(layer.fire.children.every(copy => copy instanceof Mesh && copy.geometry === fire.geometry && copy.frustumCulled)).toBe(true);
    expect(fire.geometry.getAttribute('aAt').count).toBeGreaterThan(15);
    layer.update(state, prepared, entries);
    expect(layer.fire.children[1]).toBe(fire);
    layer.expire(++state.turn);
    expect(layer.fire.children).toHaveLength(0);
    expect(layer.ash.children[1]).toBe(ash);
    layer.update(state, prepared, entries);
    expect(layer.fire.children).toHaveLength(0);
    expect(layer.ash.children[1]).toBe(ash);
    const hidden = entries.map(entry => ({ ...entry, level: EXPLORED }));
    layer.update(state, prepared, hidden);
    expect(layer.ash.children).toHaveLength(0);
    layer.update(state, prepared, []);
    expect(layer.fire.children).toHaveLength(0);
  } finally {
    layer.dispose();
  }
});
