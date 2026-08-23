import { describe, expect, it } from 'vitest';
import { type BufferGeometry, InstancedMesh } from 'three';

import { BoardGeometry, IMPROVEMENT_PROPS, buildBoard } from '../src/render3d/board3d';
import {
  ImprovementLayer,
  signImprovedCells,
  signImprovements,
} from '../src/render3d/improvements3d';
import { VIEW3D } from '../src/render3d/lookData';
import { MaterialLibrary } from '../src/render3d/toon';
import { cellCenter, tileTopY } from '../src/render3d/layout';
import { foundCityAt } from '../src/sim/cities';
import { IMPROVEMENT_IDS, type ImprovementId } from '../src/sim/improvementData';
import { type Tile, createMap, getTileAt, tileIndex } from '../src/sim/map';
import { type GameState, newGame } from '../src/sim/state';
import { TECH_IDS } from '../src/sim/techData';
import { computeFreshwater } from '../src/sim/water';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../src/sim/visibility';

/**
 * The board's half of the improvements milestone.
 *
 * Two things are being defended, and they are the two things a *new instanced
 * layer* gets wrong:
 *
 *   1. **The registry closes in both directions.** `Record<ImprovementId, …>`
 *      makes a missing prop a compile error; nothing but a test makes a prop
 *      nobody asks for visible. Same argument as `resources3d.test.ts`.
 *   2. **Fog applies on rebuild.** `FogView` patches the *board's* buffers and
 *      knows nothing about this group, so a layer rebuilt on remembered ground
 *      would come up lit and stay lit — the one failure mode that looks like a
 *      feature until somebody notices the frontier glowing. The layer paints
 *      itself (see `ImprovementLayer.paintFog`), and this is where that is
 *      checked rather than assumed.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/** A blank grassland state with every seat holding every technology. */
function flatState(width = 10, height = 8): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Every instanced mesh in a group, outline shells included. */
function meshesOf(group: { children: unknown[] }): InstancedMesh[] {
  return group.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
}

/** Triangle count of a geometry, indexed or not. */
function triangles(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  return (index ? index.count : geometry.getAttribute('position').count) / 3;
}

/** Every seat sees everything. The "no fog" grid, spelled out. */
function allVisible(state: GameState): number[] {
  return new Array<number>(state.map.tiles.length).fill(VISIBLE);
}

// --- the prop registry ------------------------------------------------------

describe('the improvement prop registry', () => {
  const geometry = new BoardGeometry();

  it('has a prop for every improvement, and an improvement for every prop', () => {
    // The forward direction is a compile error (`Record<ImprovementId, …>`);
    // this is the one the type system cannot see.
    expect(Object.keys(IMPROVEMENT_PROPS).sort()).toEqual([...IMPROVEMENT_IDS].sort());
  });

  it('builds one shared geometry per improvement, all of them distinct', () => {
    const built = IMPROVEMENT_IDS.map((id) => geometry.improvementProps[id]);
    expect(built.every((shape) => shape !== undefined)).toBe(true);
    expect(new Set(built).size).toBe(IMPROVEMENT_IDS.length);
  });

  it('keeps every prop inside the triangle budget the resource props set', () => {
    // The same bargain: one merged, flat-shaded shape per hex, cheap enough that
    // a whole map of them is one instanced draw. A fence has more parts than a
    // cow, so the ceiling is a little higher and still nowhere near a model.
    for (const id of IMPROVEMENT_IDS) {
      expect(triangles(geometry.improvementProps[id]), id).toBeLessThan(400);
      expect(triangles(geometry.improvementProps[id]), id).toBeGreaterThan(0);
    }
  });

  it('de-indexes and flat-shades every prop, like everything else on this board', () => {
    for (const id of IMPROVEMENT_IDS) {
      const shape = geometry.improvementProps[id];
      expect(shape.getIndex(), id).toBeNull();
      expect(shape.getAttribute('normal'), id).toBeDefined();
    }
  });

  it('gives the pasture a dead-centre placement and the others a nudge', () => {
    // The composition rule, as one number: a fence rings the herd, so it may not
    // wander; a camp must not stand on the deer it was built for.
    expect(VIEW3D.improvements.props.pasture.jitter).toBe(0);
    for (const id of ['camp', 'quarry', 'plantation'] as const) {
      expect(VIEW3D.improvements.props[id].jitter, id).toBeGreaterThan(0);
    }
  });
});

// --- the layer --------------------------------------------------------------

describe('the improvement layer', () => {
  const geometry = new BoardGeometry();

  function layerFor(state: GameState, levels: number[] | null = null): ImprovementLayer {
    const layer = new ImprovementLayer();
    layer.build(state, geometry, materials(), false, levels);
    return layer;
  }

  it('draws nothing on a board with no improvements', () => {
    const layer = layerFor(flatState());
    expect(layer.instances).toBe(0);
    expect(meshesOf(layer.group)).toHaveLength(0);
  });

  it('draws one instance per improved tile, whatever the improvement', () => {
    const state = flatState();
    at(state, 2, 2).improvement = 'farm';
    at(state, 3, 2).improvement = 'farm';
    at(state, 4, 2).improvement = 'mine';
    const layer = layerFor(state);
    expect(layer.instances).toBe(3);
    // Two shapes, so two buckets — and the wrap copies are inside them.
    const counts = meshesOf(layer.group).map((mesh) => mesh.count);
    expect(counts.every((count) => count % 3 === 0)).toBe(true);
  });

  it('stands the prop on the tile it belongs to', () => {
    const state = flatState();
    const tile = at(state, 5, 3);
    tile.improvement = 'pasture';
    const layer = layerFor(state);
    const mesh = meshesOf(layer.group).find(
      (candidate) => candidate.geometry === geometry.improvementProps.pasture,
    );
    expect(mesh).toBeDefined();
    const matrix = mesh!.matrixWorld.clone();
    // The middle wrap copy is instance 1 of 3 (offsets are −W, 0, +W).
    mesh!.getMatrixAt(1, matrix);
    const centre = cellCenter(tile.col, tile.row);
    // Jitter is 0 for a pasture, so this is exact: the fence rings the hex.
    expect(matrix.elements[12]).toBeCloseTo(centre.x, 5);
    expect(matrix.elements[13]).toBeCloseTo(tileTopY(tile) + VIEW3D.improvements.lift, 5);
    expect(matrix.elements[14]).toBeCloseTo(centre.z, 5);
  });

  it('places a prop identically on every rebuild and every wrap copy', () => {
    // Placement is `hash(col, row, stream)` like every other scatter, so a farm
    // does not hop when the layer is rebuilt for an unrelated reason.
    const state = flatState();
    at(state, 4, 4).improvement = 'camp';
    const first = meshesOf(layerFor(state).group)[0]!;
    const second = meshesOf(layerFor(state).group)[0]!;
    expect([...(first.instanceMatrix.array as Float32Array)]).toEqual([
      ...(second.instanceMatrix.array as Float32Array),
    ]);
  });
});

// --- fog --------------------------------------------------------------------

describe('the improvement layer and the fog', () => {
  const geometry = new BoardGeometry();

  function build(state: GameState, levels: number[] | null): ImprovementLayer {
    const layer = new ImprovementLayer();
    layer.build(state, geometry, materials(), false, levels);
    return layer;
  }

  it('draws nothing on Terra Incognita', () => {
    const state = flatState();
    at(state, 2, 2).improvement = 'farm';
    const levels = new Array<number>(state.map.tiles.length).fill(HIDDEN);
    expect(build(state, levels).instances).toBe(0);
  });

  it('keeps a remembered improvement on the chart', () => {
    // Terrain-ish, not unit-ish: an empire's works survive on explored ground,
    // exactly as the territory tint and the yield glyphs do.
    const state = flatState();
    at(state, 2, 2).improvement = 'farm';
    const levels = new Array<number>(state.map.tiles.length).fill(EXPLORED);
    expect(build(state, levels).instances).toBe(1);
  });

  it('comes up WASHED on remembered ground, not lit', () => {
    // The load-bearing assertion of this file. `FogView` patches the board and
    // never touches this group, so a rebuilt layer that did not paint itself
    // would print a full-brightness farm on a greyed-out hex.
    const state = flatState();
    at(state, 2, 2).improvement = 'farm';

    const lit = build(state, allVisible(state));
    const remembered = build(
      state,
      new Array<number>(state.map.tiles.length).fill(EXPLORED),
    );

    const litMesh = meshesOf(lit.group)[0]!;
    const dimMesh = meshesOf(remembered.group)[0]!;
    expect(litMesh.instanceColor).not.toBeNull();
    expect(dimMesh.instanceColor).not.toBeNull();

    const litTint = (litMesh.instanceColor!.array as Float32Array).slice(0, 3);
    const dimTint = (dimMesh.instanceColor!.array as Float32Array).slice(0, 3);
    // A watched tile is exactly as built — the wash's identity has to be exact,
    // or every hex that was ever remembered keeps a ghost of it.
    expect([...litTint]).toEqual([1, 1, 1]);
    // A remembered one is knocked back on every channel.
    expect(dimTint.every((channel) => channel < 1)).toBe(true);
  });

  it('washes with the fog\'s own numbers, so the two cannot drift', () => {
    // Not "some wash" — the same `exploredWash`/`exploredDim`/`exploredShade`
    // the board is painted with. Recomputed here from the data, which is the
    // only way to catch a layer that grew a knob of its own.
    const state = flatState();
    at(state, 2, 2).improvement = 'mine';
    const remembered = build(state, new Array<number>(state.map.tiles.length).fill(EXPLORED));
    const mesh = meshesOf(remembered.group).find(
      (candidate) => candidate.geometry === geometry.improvementProps.mine,
    )!;
    const tint = mesh.instanceColor!.array as Float32Array;

    const spec = VIEW3D.improvements.props.mine;
    const ink = shadeOf(spec.color, spec.shade);
    const fog = VIEW3D.fog;
    for (let channel = 0; channel < 3; channel++) {
      const from = ((ink >> (16 - channel * 8)) & 0xff) / 255;
      const to = ((fog.exploredWash >> (16 - channel * 8)) & 0xff) / 255;
      const washed = (from * (1 - fog.exploredDim) + to * fog.exploredDim) * (1 - fog.exploredShade);
      expect(tint[channel]).toBeCloseTo(washed / Math.max(from, 0.02), 4);
    }
  });

  it('paints per tile, so a half-charted board is half washed', () => {
    const state = flatState();
    at(state, 2, 2).improvement = 'farm';
    at(state, 6, 6).improvement = 'farm';
    const levels = allVisible(state);
    levels[tileIndex(state.map, 6, 6)] = EXPLORED;

    const mesh = meshesOf(build(state, levels).group).find(
      (candidate) => candidate.geometry === geometry.improvementProps.farm,
    )!;
    const tint = mesh.instanceColor!.array as Float32Array;
    // Six instances: two farms × three wrap copies, the watched one first
    // (tiles are walked in map order and (2,2) is the lower index).
    expect(mesh.count).toBe(6);
    expect(tint[0]).toBeCloseTo(1, 5);
    expect(tint[9]).toBeLessThan(1);
  });
});

/** `shade` from `lookData`, re-derived so the fog test does not import its subject. */
function shadeOf(color: number, amount: number): number {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c: number): number => Math.round(c + (target - c) * t) & 0xff;
  return (
    (mix((color >> 16) & 0xff) << 16) | (mix((color >> 8) & 0xff) << 8) | mix(color & 0xff)
  );
}

// --- fingerprints -----------------------------------------------------------

describe('the improvement fingerprints', () => {
  it('moves when any improvement changes, and holds still otherwise', () => {
    const state = flatState();
    const blank = signImprovements(state);
    at(state, 2, 2).improvement = 'farm';
    const farmed = signImprovements(state);
    expect(farmed).not.toBe(blank);

    // Same board, same hash: it is a fact about the board, not about history.
    const twin = flatState();
    at(twin, 2, 2).improvement = 'farm';
    expect(signImprovements(twin)).toBe(farmed);

    at(state, 2, 2).improvement = 'mine';
    expect(signImprovements(state)).not.toBe(farmed);
    delete at(state, 2, 2).improvement;
    expect(signImprovements(state)).toBe(blank);
  });

  it('distinguishes two improvements on different tiles', () => {
    const a = flatState();
    at(a, 2, 2).improvement = 'farm';
    const b = flatState();
    at(b, 3, 2).improvement = 'farm';
    expect(signImprovements(a)).not.toBe(signImprovements(b));
  });

  it('moves the BOARD fingerprint only for the improvements that clear clutter', () => {
    // The whole point of the second fingerprint: a farm re-bakes the board once,
    // a pasture never does. See `signImprovedCells`.
    const state = flatState();
    const blank = signImprovedCells(state);

    at(state, 2, 2).resource = 'cattle';
    at(state, 2, 2).improvement = 'pasture';
    expect(signImprovedCells(state)).toBe(blank);
    expect(signImprovements(state)).not.toBe(signImprovements(flatState()));

    at(state, 3, 3).improvement = 'farm';
    expect(signImprovedCells(state)).not.toBe(blank);
  });
});

// --- the board's own half ---------------------------------------------------

describe('improvements and the board scatter', () => {
  const geometry = new BoardGeometry();

  function instanceCount(state: GameState): number {
    const board = buildBoard(state.map, geometry, materials(), false);
    const count = board.instanceCount;
    board.dispose();
    return count;
  }

  it('clears a tile\'s clutter for a farm, exactly as a resource prop does', () => {
    const state = flatState();
    // A grassland tile with tufts and flowers on it; the farm takes them.
    const before = instanceCount(state);
    at(state, 4, 4).improvement = 'farm';
    const after = instanceCount(state);
    expect(after).toBeLessThan(before);
  });

  it('leaves a resource\'s own props alone under a pasture', () => {
    // Compose, do not replace: the fence goes *around* the cattle, so the board
    // must be byte-identical with and without the pasture on it.
    const state = flatState();
    at(state, 4, 4).resource = 'cattle';
    const before = instanceCount(state);
    at(state, 4, 4).improvement = 'pasture';
    expect(instanceCount(state)).toBe(before);
  });

  it('suppresses the hill boulders under a mine', () => {
    const state = flatState();
    for (const tile of state.map.tiles) tile.hills = true;
    const before = instanceCount(state);
    // Every hill in the map, so the difference cannot be a hashed coin flip.
    for (const tile of state.map.tiles) tile.improvement = 'mine';
    expect(instanceCount(state)).toBeLessThan(before);
  });

  it('registers no improvement instances in the board\'s own tile map', () => {
    // The props are a separate layer, so the board's fog accounting is untouched
    // by them — which is what keeps `accountedInstances` honest in fog3d's tests.
    const state = flatState();
    at(state, 4, 4).improvement = 'pasture';
    const board = buildBoard(state.map, geometry, materials(), false);
    const handles = board.tiles.own.get(tileIndex(state.map, 4, 4)) ?? [];
    for (const handle of handles) {
      expect(handle.count).toBe(3);
    }
    // The prop is not one of them: the layer owns it.
    expect(
      meshesOf(board.group).some(
        (mesh) => mesh.geometry === geometry.improvementProps.pasture,
      ),
    ).toBe(false);
    board.dispose();
  });

  it('never draws a prop on a city tile, because none can be built there', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state, 5, 5));
    const layer = new ImprovementLayer();
    layer.build(state, geometry, materials(), false, allVisible(state));
    expect(layer.instances).toBe(0);
  });
});

// --- the roster -------------------------------------------------------------

describe('the improvement look table', () => {
  it('gives every improvement a prop spec', () => {
    for (const id of IMPROVEMENT_IDS) {
      const spec = VIEW3D.improvements.props[id as ImprovementId];
      expect(spec, id).toBeDefined();
      expect(spec.size).toBeGreaterThan(0);
      expect(spec.jitter).toBeGreaterThanOrEqual(0);
    }
  });
});
