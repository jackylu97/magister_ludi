/**
 * A rich hex shown by particles and light (`src/render3d/paintedYieldLight.ts`;
 * the user's review of 2026-11-16 in `docs/flags.md` item (nnnnnnn)). The look
 * is judged by eye. These tests pin the rule: which hexes show, which yields,
 * how the count rises with the yield, that fog hides it, and that the key
 * picks one system.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { VIEW3D } from '../../src/render3d/lookData';
import { PaintedYieldLightLayer, YIELD_LIGHT_KINDS, YIELD_LIGHT_SHOWS, yieldLightCount, yieldLightKinds } from '../../src/render3d/paintedYieldLight';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
// @ts-expect-error No declarations for the shared study geometry.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
import { newGame } from '../sim/newGameHelpers';

const light = VIEW3D.visualTest.yieldLight;
const kept = { show: light.show, food: [...light.steps.food] };
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); light.show = kept.show; light.steps.food = [...kept.food]; });
const none = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };

function fixture() {
  const state = newGame({ seed: 9, sizeName: 'duel', players: [
    { name: 'Red', color: '#ac3333', isHuman: true }, { name: 'Blue', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width: 8, height: 6, terrain: 'grassland' });
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state); state.visibility[0]!.fill(VISIBLE);
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const layer = new PaintedYieldLightLayer(); cleanups.push(() => layer.dispose());
  const build = (): void => layer.build(state, prepared, state.visibility[0]!, 0, Math.sqrt(3) * state.map.width);
  return { state, layer, build };
}

describe('which yields a hex shows', () => {
  it('has three rising steps and a colour for each of the six yields', () => {
    for (const kind of YIELD_LIGHT_KINDS) {
      const steps = light.steps[kind];
      expect(steps, kind).toHaveLength(3);
      expect(steps[0]!).toBeLessThan(steps[1]!); expect(steps[1]!).toBeLessThan(steps[2]!);
      expect(light.colors[kind], kind).toMatch(/^#[0-9a-f]{6}$/);
      expect(light.shapeSize[kind], kind).toBeGreaterThan(0);
    }
    expect(YIELD_LIGHT_SHOWS).toContain(light.show);
  });

  it('shows nothing on a hex where no yield reaches its first step', () => {
    expect(yieldLightKinds(none)).toEqual([]);
    expect(yieldLightKinds({ ...none, food: light.steps.food[0]! - 1, production: light.steps.production[0]! - 1 })).toEqual([]);
  });

  it('gives a yield the step it reaches', () => {
    for (const step of [1, 2, 3]) expect(yieldLightKinds({ ...none, gold: light.steps.gold[step - 1]! })).toEqual([{ kind: 'gold', step }]);
    expect(yieldLightKinds({ ...none, faith: 99 })).toEqual([{ kind: 'faith', step: 3 }]);
  });

  it('shows the two strongest yields at most, the higher step first', () => {
    const picks = yieldLightKinds({ ...none, food: light.steps.food[0]!, production: light.steps.production[2]!, science: light.steps.science[1]! });
    expect(light.kinds).toBe(2);
    expect(picks).toEqual([{ kind: 'production', step: 3 }, { kind: 'science', step: 2 }]);
  });

  it('gives more particles to a higher step, and fewer to a second yield', () => {
    expect(yieldLightCount(3, 1, false)).toBe(3);
    expect(yieldLightCount(3, 3, false)).toBe(9);
    expect(yieldLightCount(3, 3, true)).toBeLessThan(yieldLightCount(3, 3, false));
    expect(yieldLightCount(1, 1, true)).toBe(1);
  });
});

describe('the yield light layer', () => {
  it('draws only on land the seat sees now, and never on a town', () => {
    // Every grassland hex is rich here, so the fog and the town are the only things that can hide one.
    light.steps.food = [1, 2, 3]; light.show = 'a';
    const f = fixture();
    const city = foundCityAt(f.state, 0, getTileAt(f.state.map, 3, 2)!);
    // Founding the town reads the seat's sight again, so the whole map is put in sight after it.
    f.state.visibility[0]!.fill(VISIBLE);
    const levels = f.state.visibility[0]!, hidden = tileIndex(f.state.map, 6, 1), remembered = tileIndex(f.state.map, 6, 3), seen = tileIndex(f.state.map, 1, 4);
    levels[hidden] = HIDDEN; levels[remembered] = EXPLORED;
    f.build();
    expect(f.layer.shown.has(seen)).toBe(true);
    expect(f.layer.shown.has(hidden)).toBe(false);
    expect(f.layer.shown.has(remembered)).toBe(false);
    expect(f.layer.shown.has(tileIndex(f.state.map, city.col, city.row))).toBe(false);
    expect(f.layer.counts.hexes).toBe(f.state.map.tiles.length - 3);
  });

  it('is three draws for any number of hexes: one mesh for each wrap copy', () => {
    light.steps.food = [1, 2, 3]; light.show = 'c';
    const f = fixture();
    f.build();
    expect(f.layer.counts.hexes).toBe(f.state.map.tiles.length);
    expect(f.layer.group.children).toHaveLength(3);
    // Built again, it replaces its meshes and keeps three.
    f.build();
    expect(f.layer.group.children).toHaveLength(3);
  });

  it('draws the system the key names, and nothing for the structures or for off', () => {
    const f = fixture();
    f.layer.showcase = new Map([[tileIndex(f.state.map, 2, 2), [{ kind: 'gold', step: 3 }, { kind: 'culture', step: 1 }]]]);
    light.show = 'a'; f.build();
    expect(f.layer.counts).toMatchObject({ hexes: 1, glows: 1, pools: 0, glints: 0, shapes: 0 });
    expect(f.layer.counts.motes).toBe(yieldLightCount(light.motes, 3, false) + yieldLightCount(light.motes, 1, true));
    light.show = 'b'; f.build();
    expect(f.layer.counts).toMatchObject({ hexes: 1, glows: 0, pools: 2, motes: 0, shapes: 0 });
    expect(f.layer.counts.glints).toBe(yieldLightCount(light.glints, 3, false) + yieldLightCount(light.glints, 1, true));
    light.show = 'c'; f.build();
    expect(f.layer.counts).toMatchObject({ hexes: 1, glows: 1, pools: 0, motes: 0, glints: 0 });
    expect(f.layer.counts.shapes).toBe(yieldLightCount(light.shapes, 3, false) + yieldLightCount(light.shapes, 1, true));
    for (const show of ['structures', 'off']) {
      light.show = show; f.build();
      expect(f.layer.group.children).toHaveLength(0);
      expect(f.layer.counts.hexes).toBe(0);
    }
  });
});
