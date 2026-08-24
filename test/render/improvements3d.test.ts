import { describe, expect, it } from 'vitest';
import { type BufferGeometry, InstancedMesh, Matrix4 } from 'three';

import {
  BoardGeometry,
  IMPROVEMENT_PROPS,
  buildBoard,
  signFeatureCells,
} from '../../src/render3d/board3d';
import { FogView } from '../../src/render3d/fog3d';
import {
  ImprovementLayer,
  clearsClutter,
  signImprovedCells,
  signImprovements,
} from '../../src/render3d/improvements3d';
import {
  INSTANCE_WRITES,
  SUPPRESS,
  resetInstanceWrites,
} from '../../src/render3d/instances';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { cellCenter, tileTopY } from '../../src/render3d/layout';
import { foundCityAt } from '../../src/sim/cities';
import { IMPROVEMENT_IDS, type ImprovementId } from '../../src/sim/improvementData';
import { type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { TECH_IDS } from '../../src/sim/techData';
import { computeFreshwater } from '../../src/sim/water';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';

/**
 * The board's half of the improvements milestone, and of the chop that followed
 * it.
 *
 * Three things are being defended. The first two are what a *new instanced
 * layer* gets wrong; the third is what a new *source of suppression* gets wrong:
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
 *   3. **A chopped wood stays chopped.** The board is built once per game, so
 *      clearing a forest is per-instance suppression on one tile — no rebuild,
 *      mesh identity intact — and it has to compose with fog in both orders. A
 *      `restore` that forgot the suppression bit would regrow a forest the first
 *      time a scout walked past, which is the two-bit state machine's whole
 *      reason for existing (`instances.ts`).
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

  it('moves the FEATURE fingerprint when a wood is felled, and not otherwise', () => {
    // The third fingerprint, and it exists for the same reason the second one
    // does: the renderer has to *notice* there is a delta to sweep, and a hash
    // cannot be forgotten the way a notification can.
    const state = flatState();
    at(state, 2, 2).feature = 'forest';
    at(state, 3, 2).feature = 'jungle';
    const wooded = signFeatureCells(state.map);

    at(state, 2, 2).feature = 'none';
    const felled = signFeatureCells(state.map);
    expect(felled).not.toBe(wooded);

    // Same board, same hash: a fact about the ground, not about history.
    const twin = flatState();
    at(twin, 3, 2).feature = 'jungle';
    expect(signFeatureCells(twin.map)).toBe(felled);

    // A farm is not a chop, and must not drag the sweep along with it.
    at(state, 5, 5).improvement = 'farm';
    expect(signFeatureCells(state.map)).toBe(felled);
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

/**
 * The clearing is a *bit*, not a bake.
 *
 * Until this milestone the board read `Tile.improvement` while it was baking and
 * simply did not emit a farmed tile's grass — which meant the first farm of the
 * game re-baked every instance on the map. It now emits the whole meadow always,
 * grades each scrap by how readily it yields (`SUPPRESS`), and the renderer
 * switches the grade off on the one tile that changed. So the assertions below
 * moved from "the *buffer* is smaller" to "the *picture* is the same" — which is
 * the claim that was ever actually worth making, and the one that survives the
 * board being built once per game.
 */
describe('improvements and the board scatter', () => {
  const geometry = new BoardGeometry();

  function boardFor(state: GameState): ReturnType<typeof buildBoard> {
    return buildBoard(state.map, geometry, materials(), false);
  }

  /** How many of a tile's instances are on the board right now, and of what. */
  function shown(board: ReturnType<typeof buildBoard>, cell: number): number {
    let count = 0;
    const matrix = new Matrix4();
    for (const handle of board.tiles.own.get(cell) ?? []) {
      const mesh = (handle as unknown as { bucket: { mesh: InstancedMesh | null } }).bucket.mesh!;
      for (let i = 0; i < handle.count; i++) {
        mesh.getMatrixAt(handle.start + i, matrix);
        if (matrix.elements[0] !== 0) count += 1;
      }
    }
    return count;
  }

  /** The geometries a tile is currently drawing. */
  function shapes(board: ReturnType<typeof buildBoard>, cell: number): Set<BufferGeometry> {
    const out = new Set<BufferGeometry>();
    const matrix = new Matrix4();
    for (const handle of board.tiles.own.get(cell) ?? []) {
      const mesh = (handle as unknown as { bucket: { mesh: InstancedMesh | null } }).bucket.mesh!;
      mesh.getMatrixAt(handle.start, matrix);
      if (matrix.elements[0] !== 0) out.add(mesh.geometry);
    }
    return out;
  }

  it('clears a tile\'s clutter for a farm, exactly as a resource prop does', () => {
    const state = flatState();
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    const before = shown(board, cell);
    expect(shapes(board, cell).has(geometry.tuft)).toBe(true);

    board.suppressTile(cell, SUPPRESS.clutter);
    expect(shown(board, cell)).toBeLessThan(before);
    expect(shapes(board, cell).has(geometry.tuft)).toBe(false);
    // The hex itself is not clutter: a farm ploughs the meadow, not the ground.
    expect(shapes(board, cell).has(geometry.prisms.land)).toBe(true);
    board.dispose();
  });

  it('costs no rebuild and no writes off the tile it names', () => {
    // The milestone's headline, stated as an identity rather than a stopwatch:
    // the meshes after a farm lands are the meshes from the build.
    const state = flatState();
    const board = boardFor(state);
    const meshes = board.group.children.slice();
    const other = tileIndex(state.map, 7, 6);
    const otherBefore = shown(board, other);

    resetInstanceWrites();
    board.suppressTile(tileIndex(state.map, 4, 4), SUPPRESS.clutter);

    expect(board.group.children).toEqual(meshes);
    for (let i = 0; i < meshes.length; i++) expect(board.group.children[i]).toBe(meshes[i]);
    expect(shown(board, other)).toBe(otherBefore);
    // A tuft or two, times the three wrap copies. Never the board.
    expect(INSTANCE_WRITES.matrix).toBeGreaterThan(0);
    expect(INSTANCE_WRITES.matrix).toBeLessThan(30);
    expect(INSTANCE_WRITES.tint).toBe(0);
    board.dispose();
  });

  it('leaves a resource\'s own props alone under a farm or a mine', () => {
    // Compose, do not replace. A wheat field keeps its wheat: the prop is the
    // tile's news, and the clutter grade is deliberately narrower than it.
    const state = flatState();
    at(state, 4, 4).resource = 'wheat';
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    const before = shown(board, cell);
    board.suppressTile(cell, SUPPRESS.clutter);
    // A resource tile grows no clutter to begin with (the prop displaced it at
    // bake time), so a farm on one changes nothing at all.
    expect(shown(board, cell)).toBe(before);
    expect(shapes(board, cell).has(geometry.resourceProps.wheat)).toBe(true);
    board.dispose();
  });

  it('leaves everything alone for the improvements that clear nothing', () => {
    // The pasture, camp, quarry and plantation are built round what the hex
    // already shows, so nothing ever asks the board about them. `clearsClutter`
    // is where that is decided, and it is data.
    expect(clearsClutter('pasture')).toBe(false);
    for (const id of ['camp', 'quarry', 'plantation'] as const) {
      expect(clearsClutter(id), id).toBe(false);
    }
    for (const id of ['farm', 'mine'] as const) expect(clearsClutter(id), id).toBe(true);
  });

  it('suppresses the hill boulders under a mine', () => {
    const state = flatState();
    for (const tile of state.map.tiles) tile.hills = true;
    const board = boardFor(state);
    // Every hill in the map, so the difference cannot be a hashed coin flip.
    let before = 0;
    let after = 0;
    for (const tile of state.map.tiles) {
      const cell = tileIndex(state.map, tile.col, tile.row);
      before += shown(board, cell);
      board.suppressTile(cell, SUPPRESS.clutter);
      after += shown(board, cell);
    }
    expect(after).toBeLessThan(before);
    board.dispose();
  });

  it('takes the trees and the props too, but only for a town', () => {
    // The two grades, and the whole reason there are two: a farm leaves the deer
    // standing in the wood, a settlement does not.
    const state = flatState();
    at(state, 4, 4).feature = 'forest';
    at(state, 4, 4).resource = 'deer';
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);

    board.suppressTile(cell, SUPPRESS.clutter);
    expect(shapes(board, cell).has(geometry.pine)).toBe(true);
    expect(shapes(board, cell).has(geometry.resourceProps.deer)).toBe(true);

    board.suppressTile(cell, SUPPRESS.decor);
    expect(shapes(board, cell).has(geometry.pine)).toBe(false);
    expect(shapes(board, cell).has(geometry.resourceProps.deer)).toBe(false);
    // A town still stands on a hill, and still has a coastline.
    expect(shapes(board, cell).has(geometry.prisms.land)).toBe(true);
    board.dispose();
  });

  it('never regrows what it cleared, however often it is told again', () => {
    // Monotone and idempotent: `clearGround` sweeps the whole state, so this is
    // called with the same answer on every frame that anything at all changed.
    const state = flatState();
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    board.suppressTile(cell, SUPPRESS.clutter);
    const after = shown(board, cell);

    resetInstanceWrites();
    for (let i = 0; i < 5; i++) board.suppressTile(cell, SUPPRESS.clutter);
    expect(shown(board, cell)).toBe(after);
    expect(INSTANCE_WRITES.matrix).toBe(0);
    board.dispose();
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

  /**
   * The sweep `Renderer3D.clearGround` runs, reproduced.
   *
   * The renderer itself needs a WebGL context and so is not constructible in
   * node — nothing in this suite builds one. What *is* testable is the rule it
   * applies, which is two loops over the state, and it is worth pinning here
   * because the whole milestone rests on the two grades being handed out the
   * right way round.
   */
  function clearGround(state: GameState, board: ReturnType<typeof buildBoard>): void {
    for (const city of state.cities) {
      board.suppressTile(tileIndex(state.map, city.col, city.row), SUPPRESS.decor);
    }
    for (let cell = 0; cell < state.map.tiles.length; cell++) {
      const id = state.map.tiles[cell]!.improvement;
      if (id !== undefined && clearsClutter(id)) board.suppressTile(cell, SUPPRESS.clutter);
    }
    // The third source: a hex the *bake* put a canopy on whose feature is now
    // gone. Asked of the board's own memory and not of the state, because after
    // a chop the state says `none` and the buffers still hold pines.
    for (const cell of board.treedCells) {
      if (state.map.tiles[cell]!.feature !== 'none') continue;
      board.suppressTile(cell, SUPPRESS.decor);
    }
  }

  it('clears the wood a town was founded in, and only that tile', () => {
    const state = flatState();
    for (const tile of state.map.tiles) tile.feature = 'forest';
    const board = boardFor(state);
    const site = at(state, 5, 5);
    const cell = tileIndex(state.map, 5, 5);
    const neighbour = tileIndex(state.map, 6, 5);
    expect(shapes(board, cell).has(geometry.pine)).toBe(true);

    foundCityAt(state, 0, site);
    clearGround(state, board);

    // Without this the forest grows straight through the town, and since the
    // houses are the size of the population it hides a city growing.
    expect(shapes(board, cell).has(geometry.pine)).toBe(false);
    expect(shapes(board, cell).has(geometry.prisms.land)).toBe(true);
    expect(shapes(board, neighbour).has(geometry.pine)).toBe(true);
    board.dispose();
  });

  it('leaves a pillaged farm\'s ground bare, which is the Civ rule', () => {
    // Pillaging destroys the *improvement* — the prop goes, and that is the
    // improvements layer's business — while the meadow it was ploughed out of
    // stays gone. Nothing walks the suppression back, deliberately: a field is
    // not un-ploughed by a raid, and regrowing the grass would be the board
    // claiming the tile had never been worked.
    const state = flatState();
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    at(state, 4, 4).improvement = 'farm';
    clearGround(state, board);
    const ploughed = shapes(board, cell).has(geometry.tuft);
    expect(ploughed).toBe(false);

    delete at(state, 4, 4).improvement;
    clearGround(state, board);
    expect(shapes(board, cell).has(geometry.tuft)).toBe(false);
    board.dispose();
  });

  // --- the chop, which is the third source of the sweep ---------------------

  it('writes down every hex it planted a canopy on, and nothing else', () => {
    // The board's memory of its own trees. It has to be *exactly* the tiles that
    // got a canopy: a hex missing from the list keeps its pines forever after a
    // chop, and a hex that never had one costs a pointless sweep — and would
    // suppress a meadow nobody felled.
    const state = flatState();
    at(state, 4, 4).feature = 'forest';
    at(state, 5, 4).feature = 'jungle';
    at(state, 6, 4).feature = 'forest';
    // A mountain is dressed by another branch entirely and grows no trees.
    at(state, 7, 4).terrain = 'mountain';
    at(state, 7, 4).feature = 'forest';
    const board = boardFor(state);

    const expected = state.map.tiles
      .filter((tile) => tile.feature !== 'none' && tile.terrain !== 'mountain')
      .map((tile) => tileIndex(state.map, tile.col, tile.row));
    expect([...board.treedCells]).toEqual(expected);
    board.dispose();
  });

  it('takes the trees off a chopped hex, and only that hex', () => {
    const state = flatState();
    for (const tile of state.map.tiles) tile.feature = 'forest';
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    const neighbour = tileIndex(state.map, 5, 4);
    expect(shapes(board, cell).has(geometry.pine)).toBe(true);

    // What the reducer does: one field on one tile.
    at(state, 4, 4).feature = 'none';
    clearGround(state, board);

    expect(shapes(board, cell).has(geometry.pine)).toBe(false);
    // The hex itself stays: an axe takes the wood, not the ground under it.
    expect(shapes(board, cell).has(geometry.prisms.land)).toBe(true);
    expect(shapes(board, neighbour).has(geometry.pine)).toBe(true);
    board.dispose();
  });

  it('reads like cleared ground: the props in the wood go with it', () => {
    // The documented scope. A chop sweeps at `decor`, the town's grade, because
    // what has to disappear is a *canopy* — and everything standing among the
    // trees goes with it. That is the honest picture of a felled wood, and it is
    // why `chopErrorAt` keeps a revealed, unimproved resource off the axe in the
    // first place: the only props this can take are ones the player chose to
    // give up, or ones they never knew were there.
    const state = flatState();
    at(state, 4, 4).feature = 'forest';
    at(state, 4, 4).resource = 'deer';
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    expect(shapes(board, cell).has(geometry.resourceProps.deer)).toBe(true);

    at(state, 4, 4).feature = 'none';
    clearGround(state, board);
    expect(shapes(board, cell).has(geometry.pine)).toBe(false);
    expect(shapes(board, cell).has(geometry.resourceProps.deer)).toBe(false);
    board.dispose();
  });

  it('costs no rebuild and no writes off the tile it names', () => {
    // The same identity the farm's sweep is held to: the meshes after a wood is
    // felled are the meshes from the build. The board is built once per game and
    // a gameplay event may never re-bake it.
    const state = flatState();
    for (const tile of state.map.tiles) tile.feature = 'forest';
    const board = boardFor(state);
    const meshes = board.group.children.slice();
    const other = tileIndex(state.map, 7, 6);
    const otherBefore = shown(board, other);

    at(state, 4, 4).feature = 'none';
    resetInstanceWrites();
    clearGround(state, board);

    expect(board.group.children).toEqual(meshes);
    for (let i = 0; i < meshes.length; i++) expect(board.group.children[i]).toBe(meshes[i]);
    expect(shown(board, other)).toBe(otherBefore);
    // Two or three trees, times the three wrap copies. Never the board.
    expect(INSTANCE_WRITES.matrix).toBeGreaterThan(0);
    expect(INSTANCE_WRITES.matrix).toBeLessThan(30);
    expect(INSTANCE_WRITES.tint).toBe(0);
    board.dispose();
  });

  it('never regrows a felled wood, however often it is swept', () => {
    // Monotone and idempotent, like every other source: `clearGround` runs the
    // whole sweep on every frame anything at all moved.
    const state = flatState();
    at(state, 4, 4).feature = 'forest';
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    at(state, 4, 4).feature = 'none';
    clearGround(state, board);
    const after = shown(board, cell);

    resetInstanceWrites();
    for (let i = 0; i < 5; i++) clearGround(state, board);
    expect(shown(board, cell)).toBe(after);
    expect(INSTANCE_WRITES.matrix).toBe(0);
    board.dispose();
  });

  it('composes with the fog: a scout walking past does not regrow the wood', () => {
    // The two-bit state machine, on the newest source. An instance is off for
    // one of two independent reasons and `restore` must return it to
    // `suppressed ? HIDDEN : as-built` — get that wrong and the first visibility
    // change after a chop puts the forest back, which is exactly the bug that
    // deferred suppression out of M7.
    const state = flatState();
    at(state, 4, 4).feature = 'forest';
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    const fog = new FogView(state.map, board.tiles);

    // Charted and lit, then felled.
    fog.apply(allVisible(state));
    at(state, 4, 4).feature = 'none';
    clearGround(state, board);
    expect(shapes(board, cell).has(geometry.pine)).toBe(false);

    // The seat loses sight of it, and gets it back.
    const dark = new Array<number>(state.map.tiles.length).fill(VISIBLE);
    dark[cell] = HIDDEN;
    fog.apply(dark);
    fog.apply(allVisible(state));
    expect(shapes(board, cell).has(geometry.pine)).toBe(false);

    fog.dispose();
    board.dispose();
  });

  it('holds a chop made on ground the seat cannot currently see', () => {
    // The other order, which is the one a suppression can actually be lost in:
    // suppressing a fog-hidden instance writes no matrix at all, so the bit has
    // to be remembered and applied when the fog lifts.
    const state = flatState();
    at(state, 4, 4).feature = 'forest';
    const board = boardFor(state);
    const cell = tileIndex(state.map, 4, 4);
    const fog = new FogView(state.map, board.tiles);

    const dark = new Array<number>(state.map.tiles.length).fill(VISIBLE);
    dark[cell] = HIDDEN;
    fog.apply(dark);
    at(state, 4, 4).feature = 'none';
    clearGround(state, board);
    fog.apply(allVisible(state));

    expect(shapes(board, cell).has(geometry.pine)).toBe(false);
    expect(shapes(board, cell).has(geometry.prisms.land)).toBe(true);
    fog.dispose();
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
