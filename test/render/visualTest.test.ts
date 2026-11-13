/**
 * The visual test version (batch V1, `docs/flags.md` item (nnnnnnn)): the URL
 * option that sets the switches, and the pure helpers behind four of the
 * switches. The pictures themselves are checked by eye; these tests pin the
 * parts that are arithmetic.
 */

import { describe, expect, it } from 'vitest';

import type { GameMap } from '../../src/sim/map';
import {
  VISUAL_SWITCHES, allOff, allOn, changedSwitches, formatVisualTest, parseVisualTest,
} from '../../src/render3d/visualTest';
import { pinScaleFor } from '../../src/render3d/visualTestLook';
import { planPaintedRoads, territoryHoles, territoryRegion, type BorderStyle } from '../../src/render3d/paintedGround';
import { LAKE, RIVER, createSeaField } from '../../src/render3d/seaField';
import { VIEW3D } from '../../src/render3d/lookData';
// @ts-expect-error The organic river builder is JavaScript, like the board build it serves.
import { createOrganicRivers } from '../../src/render3d/organicRivers.js';
import { createMap } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
import type { BufferGeometry } from 'three';
// @ts-expect-error The terrain modules remain JavaScript.
import { prepareTerrainMap, setRiverStyle } from '../../src/terrainStudy/surface.js';
// @ts-expect-error The terrain modules remain JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

describe('the vtest URL option', () => {
  it('turns everything but the new border on when it is missing, empty or "all"', () => {
    for (const value of [null, undefined, '', 'all', ' ALL ']) {
      const state = parseVisualTest(value);
      for (const def of VISUAL_SWITCHES) expect(state[def.key]).toBe(def.key !== 'borders');
      expect(state.border).toBe('wash');
    }
  });

  it('turns everything off with "none"', () => {
    const state = parseVisualTest('none');
    for (const def of VISUAL_SWITCHES) expect(state[def.key]).toBe(false);
  });

  it('turns on exactly the numbers listed', () => {
    const state = parseVisualTest('1,3,5');
    expect(VISUAL_SWITCHES.filter((def) => state[def.key]).map((def) => def.id)).toEqual([1, 3, 5]);
  });

  it('reads the border style after 3, and takes wash without one', () => {
    expect(parseVisualTest('3').border).toBe('wash');
    expect(parseVisualTest('3:drape').border).toBe('drape');
    expect(parseVisualTest('2,3:wash').border).toBe('wash');
    expect(parseVisualTest('2,3:wash').rivers).toBe(true);
    expect(parseVisualTest('3:noon').border).toBe('wash');
  });

  it('ignores numbers and options it does not know', () => {
    const state = parseVisualTest('4,99,x,99');
    expect(VISUAL_SWITCHES.filter((def) => state[def.key]).map((def) => def.id)).toEqual([4]);
  });

  it('writes a state back that reads as the same state', () => {
    const samples = [allOn(), allOff(), parseVisualTest('1,3,5'), parseVisualTest('2,3:wash'), parseVisualTest('3:drape'),
      { ...allOn(), border: 'wash' as const }];
    for (const state of samples) expect(parseVisualTest(formatVisualTest(state))).toEqual(state);
    expect(formatVisualTest(allOn())).toBe('all');
    expect(formatVisualTest(allOff())).toBe('none');
  });

  it('names the switches that differ, in switch order', () => {
    const changed = changedSwitches(allOff(), parseVisualTest('6,2,4'));
    expect(changed.map((def) => def.key)).toEqual(['rivers', 'organicRivers', 'pins']);
  });

  it('numbers the fourteen switches 1 to 14, each once', () => {
    expect(VISUAL_SWITCHES.map((def) => def.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(new Set(VISUAL_SWITCHES.map((def) => def.key)).size).toBe(14);
  });
});

describe('the quieter pins (switch 6)', () => {
  const pins = VIEW3D.visualTest.pins;
  it('are full size near, the far scale far, and in between between', () => {
    expect(pinScaleFor(pins.nearPixels + 50)).toBe(1);
    expect(pinScaleFor(pins.farPixels - 10)).toBe(pins.farScale);
    const middle = pinScaleFor((pins.nearPixels + pins.farPixels) / 2);
    expect(middle).toBeGreaterThan(pins.farScale);
    expect(middle).toBeLessThan(1);
  });
});

/** A small flat map, not wrapping: rows of letters, `.` land, `c` coast, `o` ocean, `l` lake. */
function mapOf(rows: string[]): GameMap {
  const height = rows.length, width = rows[0]!.length;
  const terrain: Record<string, string> = { '.': 'grassland', c: 'coast', o: 'ocean', l: 'lake' };
  const tiles = rows.flatMap((line, row) => [...line].map((letter, col) => ({ col, row, terrain: terrain[letter]! })));
  return { width, height, tiles } as unknown as GameMap;
}

describe('the border outline (switch 3)', () => {
  const style: BorderStyle = { ...VIEW3D.visualTest.borders, holeMax: 2, fillNeighbours: 4, fillPasses: 2 };
  const map = mapOf(['.......', '.......', '.......', '.......', '.......']);
  const W = 7;
  const at = (col: number, row: number): number => row * W + col;

  it('finds a hole closed on every side by one seat', () => {
    const owner: (number | undefined)[] = map.tiles.map(() => undefined);
    for (let row = 1; row <= 3; row++) for (let col = 1; col <= 4; col++) owner[at(col, row)] = 0;
    owner[at(2, 2)] = undefined;
    const holes = territoryHoles(owner, map, style.holeMax);
    expect([...(holes.get(0) ?? [])]).toEqual([at(2, 2)]);
  });

  it('never calls a pocket next to another seat a hole', () => {
    const owner: (number | undefined)[] = map.tiles.map(() => undefined);
    for (let row = 1; row <= 3; row++) for (let col = 1; col <= 4; col++) owner[at(col, row)] = 0;
    owner[at(2, 2)] = undefined;
    owner[at(3, 2)] = 1;
    expect(territoryHoles(owner, map, style.holeMax).get(0)).toBeUndefined();
  });

  it('closes a hole and leaves the outside alone', () => {
    const owner: (number | undefined)[] = map.tiles.map(() => undefined);
    for (let row = 1; row <= 3; row++) for (let col = 1; col <= 4; col++) owner[at(col, row)] = 0;
    owner[at(2, 2)] = undefined;
    const region = territoryRegion(owner, map, style);
    expect(region[at(2, 2)]).toBe(0);
    expect(region[at(0, 0)]).toBeUndefined();
    expect(region[at(6, 4)]).toBeUndefined();
  });

  it('does not fill a hex between two seats', () => {
    const owner: (number | undefined)[] = map.tiles.map(() => undefined);
    for (const [col, row] of [[1, 1], [2, 1], [1, 2], [1, 3]] as const) owner[at(col, row)] = 0;
    for (const [col, row] of [[3, 1], [3, 2], [3, 3]] as const) owner[at(col, row)] = 1;
    const region = territoryRegion(owner, map, { ...style, holeMax: 0 });
    expect(region[at(2, 2)]).toBeUndefined();
  });
});

describe('the sea field (switch 1)', () => {
  // Land on the left, a column of coast, then ocean; a lake in the land.
  const map = mapOf(['..ccoo', '.lccoo', '..ccoo', '..ccoo']);
  const field = createSeaField(map as never, { shoreReach: 1.2, edgeReach: 1.5, wraps: false });
  const tile = (col: number, row: number) => map.tiles[row * map.width + col]! as never;
  const centre = (col: number, row: number): [number, number] => [Math.sqrt(3) * (col + (row % 2) * 0.5), row * 1.5];

  it('is negative inside a coast hex and positive inside an ocean hex', () => {
    const [cx, cz] = centre(3, 2), [ox, oz] = centre(4, 2);
    expect(field.sample(tile(3, 2), cx, cz)[1]).toBeLessThan(0);
    expect(field.sample(tile(4, 2), ox, oz)[1]).toBeGreaterThan(0);
  });

  it('measures the shore from the land edge and caps it', () => {
    const [x, z] = centre(2, 2);
    const near = field.sample(tile(2, 2), x - 0.7, z)[0];
    const far = field.sample(tile(5, 2), ...centre(5, 2))[0];
    expect(near).toBeGreaterThanOrEqual(0);
    expect(near).toBeLessThan(0.3);
    expect(far).toBe(1.2);
  });

  it('counts the hexes out from land, and marks a lake', () => {
    const coast = field.sample(tile(2, 2), ...centre(2, 2))[2];
    const ocean = field.sample(tile(5, 2), ...centre(5, 2))[2];
    expect(ocean).toBeGreaterThan(coast);
    expect(field.sample(tile(1, 1), ...centre(1, 1))[2]).toBe(LAKE);
  });

  it('keeps a river\'s old paint on the water under a land hex', () => {
    const river = mapOf(['....', '....', '....']);
    (river.tiles[1 * 4 + 1] as { riverEdges?: number }).riverEdges = 1;
    const fieldOnLand = createSeaField(river as never, { shoreReach: 1.2, edgeReach: 1.5, wraps: false });
    const [x, z] = centre(1, 1);
    expect(fieldOnLand.sample(river.tiles[1 * 4 + 1] as never, x + 0.8, z)[0]).toBe(RIVER);
  });
});

describe('the organic roads (switch 5)', () => {
  // A row of road on open grassland with a river edge under one link, and a
  // lone road hex.
  const map = createMap({ width: 8, height: 5, terrain: 'grassland' });
  for (const col of [2, 3, 4]) map.tiles[2 * 8 + col]!.road = 0;
  map.tiles[2 * 8 + 6]!.road = 0;
  map.tiles[2 * 8 + 3]!.riverEdges = 1; map.tiles[2 * 8 + 4]!.riverEdges = 1 << 3;
  const state = { map } as unknown as GameState;
  const prepared = prepareTerrainMap(map, { wrap: true }) as GameMap;
  const plan = planPaintedRoads(state, prepared, VIEW3D.visualTest.organicRoads);

  it('draws on every roaded hex and on no other', () => {
    expect([...plan.keys()].sort((a, b) => a - b)).toEqual([18, 19, 20, 22]);
  });

  it('keeps every mark of a hex inside that hex', () => {
    for (const [cell, marks] of plan) {
      const tile = prepared.tiles[cell]!, cx = Math.sqrt(3) * (tile.col + (tile.row % 2) * .5), cz = tile.row * 1.5;
      for (const mark of marks) for (const [x, z] of mark.polygon) expect(Math.hypot(x - cx, z - cz)).toBeLessThan(1.05);
    }
  });

  it('lays a plank bridge on both banks of a river it crosses, and none elsewhere', () => {
    const decks = (cell: number): number => (plan.get(cell) ?? []).filter((mark) => mark.deck !== undefined).length;
    expect(decks(19)).toBeGreaterThan(0);
    expect(decks(20)).toBeGreaterThan(0);
    expect(decks(18)).toBe(0);
  });
});

describe('the organic rivers (switch 4)', () => {
  it('paints a ribbon on both banks of a river edge, and nothing on a far hex', () => {
    // The ground is joined across an organic river; the board sets this style.
    setRiverStyle({ crest: 0, toe: 0, corner: .0008, organic: true, clearance: .2 });
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    map.tiles[2 * 8 + 3]!.riverEdges = 1; map.tiles[2 * 8 + 4]!.riverEdges = 1 << 3;
    const prepared = prepareTerrainMap(map, { wrap: true }) as GameMap;
    const rivers = createOrganicRivers(prepared, VIEW3D.visualTest.organicRivers);
    expect(rivers.polygonCount).toBeGreaterThan(0);
    const piecesOn = (col: number, row: number): BufferGeometry | null => {
      const tile = prepared.tiles[row * 8 + col]!;
      const [top] = terrainMesh(tile) as [BufferGeometry];
      return rivers.pieces(tile, top);
    };
    expect(piecesOn(3, 2)?.getAttribute('position').count ?? 0).toBeGreaterThan(0);
    expect(piecesOn(4, 2)?.getAttribute('position').count ?? 0).toBeGreaterThan(0);
    expect(piecesOn(0, 5)).toBeNull();
    setRiverStyle(null);
  });
});
