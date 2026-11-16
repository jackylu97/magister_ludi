/**
 * A rich hex shown by particles and light (`src/render3d/paintedYieldLight.ts`;
 * the user's rulings of 2026-11-16 in `docs/flags.md` item (nnnnnnn)). The look
 * is judged by eye. These tests pin the rule: the weighted score, the three
 * thresholds, nothing under the first, the motes' colours by share, the step
 * ladder of system d, that fog hides it, and that the key picks one system.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { VIEW3D } from '../../src/render3d/lookData';
import {
  PaintedYieldLightLayer, YIELD_LIGHT_KINDS, YIELD_LIGHT_SHOWS, type YieldLightHex, yieldLightCount, yieldLightHex, yieldLightSplit,
} from '../../src/render3d/paintedYieldLight';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
// @ts-expect-error No declarations for the shared study geometry.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
import { newGame } from '../sim/newGameHelpers';

const light = VIEW3D.visualTest.yieldLight;
const kept = { show: light.show, thresholds: [...light.thresholds] };
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); light.show = kept.show; light.thresholds = [...kept.thresholds]; });
const none = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
/** An example hex at a step, with the given parts of its score. */
const example = (step: number, parts: YieldLightHex['parts']): YieldLightHex => ({ score: light.thresholds[step - 1]!, step, parts });

function fixture(shape?: (state: ReturnType<typeof newGame>) => void) {
  const state = newGame({ seed: 9, sizeName: 'duel', players: [
    { name: 'Red', color: '#ac3333', isHuman: true }, { name: 'Blue', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width: 8, height: 6, terrain: 'grassland' });
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state); state.visibility[0]!.fill(VISIBLE);
  shape?.(state);
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const layer = new PaintedYieldLightLayer(); cleanups.push(() => layer.dispose());
  const build = (): void => layer.build(state, prepared, state.visibility[0]!, 0, Math.sqrt(3) * state.map.width);
  return { state, layer, build };
}

// The user, 2026-11-16: "We should add motes based on total yields on a tile, and the mote colors should depend on which
// yields are represented, proportionally. culture/science on tiles should count as 1.5x and gold yields on tiles should
// count at 0.75x. a tile should have at least 4 combined yields to get motes, 7 for medium, and 10+ for the highest tier".
describe('what a hex shows', () => {
  it('has the user\'s weights and thresholds, and a colour for each of the six yields', () => {
    expect(light.weights).toEqual({ food: 1, production: 1, gold: .75, science: 1.5, culture: 1.5, faith: 1 });
    expect(light.thresholds).toEqual([4, 7, 10]);
    for (const kind of YIELD_LIGHT_KINDS) expect(light.colors[kind], kind).toMatch(/^#[0-9a-f]{6}$/);
    expect(YIELD_LIGHT_SHOWS).toContain(light.show);
  });

  it('scores a hex by the weighted sum of its yields', () => {
    expect(yieldLightHex({ ...none, food: 3, production: 2 })!.score).toBe(5);
    expect(yieldLightHex({ ...none, science: 2, culture: 2 })!.score).toBe(6);
    expect(yieldLightHex({ ...none, gold: 8 })!.score).toBe(6);
    expect(yieldLightHex({ ...none, faith: 4 })!.score).toBe(4);
    expect(yieldLightHex({ food: 1, production: 1, gold: 4, science: 2, culture: 2, faith: 1 })!.score).toBe(12);
  });

  it('shows nothing under a score of 4', () => {
    expect(yieldLightHex(none)).toBeNull();
    expect(yieldLightHex({ ...none, food: 2, production: 1 })).toBeNull();
    // Five gold is 3.75, and two science is 3.
    expect(yieldLightHex({ ...none, gold: 5 })).toBeNull();
    expect(yieldLightHex({ ...none, science: 2 })).toBeNull();
  });

  it('reaches step 1 at 4, step 2 at 7 and step 3 at 10', () => {
    const step = (food: number): number | undefined => yieldLightHex({ ...none, food })?.step;
    expect([3, 4, 6, 7, 9, 10, 25].map(step)).toEqual([undefined, 1, 1, 2, 2, 3, 3]);
    // Weighted: 3 culture and 2 gold is 6; one food more is 7.
    expect(yieldLightHex({ ...none, culture: 3, gold: 2 })!.step).toBe(1);
    expect(yieldLightHex({ ...none, culture: 3, gold: 2, food: 1 })!.step).toBe(2);
  });

  it('gives each yield its part of the score, the largest first', () => {
    const hex = yieldLightHex({ ...none, food: 3, production: 2 })!;
    expect(hex.parts).toEqual([{ kind: 'food', share: .6 }, { kind: 'production', share: .4 }]);
    // Two gold is 1.5 and one science is 1.5: equal parts keep the order of the yields, on every build.
    const tie = yieldLightHex({ ...none, food: 3, gold: 2, science: 1 })!;
    expect(tie.parts.map(part => part.kind)).toEqual(['food', 'gold', 'science']);
    expect(tie.parts.reduce((sum, part) => sum + part.share, 0)).toBeCloseTo(1);
  });
});

describe('the colours of a hex\'s motes', () => {
  const split = (yields: Partial<typeof none>, count: number) => yieldLightSplit(yieldLightHex({ ...none, ...yields })!.parts, count);

  it('divides the motes by share: three in five for 3 food with 2 production', () => {
    expect(split({ food: 3, production: 2 }, 5)).toEqual([{ kind: 'food', count: 3 }, { kind: 'production', count: 2 }]);
    expect(split({ food: 4 }, 3)).toEqual([{ kind: 'food', count: 3 }]);
  });

  it('always gives out exactly the count, and the same split every time', () => {
    for (const count of [1, 2, 3, 6, 9]) for (const yields of [{ food: 3, production: 2 }, { food: 2, production: 2, gold: 2 }, { food: 1, production: 1, gold: 2, science: 1, culture: 1, faith: 1 }]) {
      const first = split(yields, count);
      expect(first.reduce((sum, entry) => sum + entry.count, 0)).toBe(count);
      expect(split(yields, count)).toEqual(first);
    }
  });

  it('gives a yield with a fifth of the score one mote, even among three', () => {
    // 3 food, 1 production, 1 faith: shares .6, .2, .2. Plain rounding of three motes would give 2, 1, 0.
    expect(split({ food: 3, production: 1, faith: 1 }, 3)).toEqual([{ kind: 'food', count: 1 }, { kind: 'production', count: 1 }, { kind: 'faith', count: 1 }]);
    // A yield under a fifth may get none at step 1: 5 food with 1 production (a sixth) is three food motes.
    expect(split({ food: 5, production: 1 }, 3)).toEqual([{ kind: 'food', count: 3 }]);
    // With more motes it gets its share: one in six.
    expect(split({ food: 5, production: 1 }, 6)).toEqual([{ kind: 'food', count: 5 }, { kind: 'production', count: 1 }]);
  });

  it('gives a second yield fewer particles in systems a, b and c', () => {
    expect(yieldLightCount(3, 3, true)).toBeLessThan(yieldLightCount(3, 3, false));
    expect(yieldLightCount(1, 1, true)).toBe(1);
  });
});

describe('the yield light layer', () => {
  it('draws only on land the seat sees now, and never on a town', () => {
    // Every grassland hex passes here, so the fog and the town are the only things that can hide one.
    light.thresholds = [1, 7, 10]; light.show = 'd';
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

  it('shows nothing on plain grass, whose two food are under the first threshold', () => {
    light.show = 'd';
    const f = fixture();
    f.build();
    expect(f.layer.counts.hexes).toBe(0);
    expect(f.layer.group.children).toHaveLength(0);
  });

  it('is three draws for any number of hexes: one mesh for each wrap copy', () => {
    light.thresholds = [1, 7, 10];
    for (const show of ['a', 'b', 'c', 'd']) {
      light.show = show;
      const f = fixture();
      f.build();
      expect(f.layer.counts.hexes).toBe(f.state.map.tiles.length);
      expect(f.layer.group.children).toHaveLength(3);
      // Built again, it replaces its meshes and keeps three.
      f.build();
      expect(f.layer.group.children).toHaveLength(3);
    }
  });

  it('draws the system the key names, and nothing for the structures or for off', () => {
    const f = fixture();
    f.layer.showcase = new Map([[tileIndex(f.state.map, 2, 2), example(3, [{ kind: 'gold', share: 2 / 3 }, { kind: 'culture', share: 1 / 3 }])]]);
    light.show = 'a'; f.build();
    expect(f.layer.counts).toMatchObject({ hexes: 1, glows: 1, pools: 0, glints: 0, shapes: 0, washes: 0 });
    expect(f.layer.counts.motes).toBe(yieldLightCount(light.motes, 3, false) + yieldLightCount(light.motes, 3, true));
    light.show = 'b'; f.build();
    expect(f.layer.counts).toMatchObject({ hexes: 1, glows: 0, pools: 2, motes: 0, shapes: 0 });
    light.show = 'c'; f.build();
    expect(f.layer.counts).toMatchObject({ hexes: 1, glows: 1, pools: 0, motes: 0, glints: 0 });
    light.show = 'd'; f.build();
    expect(f.layer.counts).toMatchObject({ hexes: 1, glows: 0, pools: 0, glints: 0, shapes: 0, washes: 1 });
    for (const show of ['structures', 'off']) {
      light.show = show; f.build();
      expect(f.layer.group.children).toHaveLength(0);
      expect(f.layer.counts.hexes).toBe(0);
    }
  });

  // The user, 2026-11-16: "tier 1 - small motes, few motes tier 2 - small/med motes, some ground light tier 3 - med/large
  // motes, full ground light".
  it('system d climbs by step: no ground light at step 1, then more and larger motes and more ground light', () => {
    const d = light.d;
    for (const list of [d.motes, d.moteSize]) { expect(list).toHaveLength(3); expect(list[0]!).toBeLessThan(list[1]!); expect(list[1]!).toBeLessThan(list[2]!); }
    expect(d.wash[0]).toBe(0);
    expect(d.wash[1]!).toBeGreaterThan(0); expect(d.wash[1]!).toBeLessThan(d.wash[2]!);
    light.show = 'd';
    const f = fixture(), cell = tileIndex(f.state.map, 2, 2);
    const at = (step: number) => {
      f.layer.showcase = new Map([[cell, example(step, [{ kind: 'food', share: .6 }, { kind: 'production', share: .4 }])]]); f.build();
      return { motes: f.layer.counts.motes, washes: f.layer.counts.washes, largest: f.layer.largestMote };
    };
    // Two yields share the step's motes; they do not add to them. One wash, in the larger yield's colour.
    expect(at(1)).toEqual({ motes: d.motes[0], washes: 0, largest: d.moteSize[0] });
    expect(at(2)).toEqual({ motes: d.motes[1], washes: 1, largest: d.moteSize[1] });
    expect(at(3)).toEqual({ motes: d.motes[2], washes: 1, largest: d.moteSize[2] });
  });

  it('follows a hill with several small washes, and starts a great work\'s motes above its roofs', () => {
    light.show = 'd';
    // The hill is made before the board's map is, as in a game.
    const f = fixture(state => { getTileAt(state.map, 5, 2)!.hills = true; }), flat = tileIndex(f.state.map, 2, 2), hill = tileIndex(f.state.map, 5, 2);
    const washQuads = (cell: number): number => {
      f.layer.showcase = new Map([[cell, example(3, [{ kind: 'production', share: 1 }])]]); f.build();
      return (f.layer.group.children[0] as unknown as { geometry: { instanceCount: number } }).geometry.instanceCount - f.layer.counts.motes;
    };
    expect(washQuads(flat)).toBe(1);
    expect(washQuads(hill)).toBe(7);
    expect(light.d.greatLift).toBeGreaterThan(0);
  });
});
