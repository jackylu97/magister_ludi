import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4 } from 'three';

import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { INSTANCE_WRITES, resetInstanceWrites } from '../../src/render3d/instances';
import { cellCenter, directionYaw, tileTopY } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { RoadLayer, signRoadCells } from '../../src/render3d/roads3d';
import { MaterialLibrary } from '../../src/render3d/toon';
import { type Tile, createMap, getTileAt, tileIndex, tileNeighbors } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';

/**
 * The board's half of trade: the track a caravan wears into the ground.
 *
 * Four things are being defended, and every one of them is a claim the *layer*
 * makes rather than a claim about how a road looks:
 *
 *   1. **A road is halves, not links.** Each paved hex draws its own reach
 *      toward each paved neighbour, so one instance names one tile — which is
 *      the whole reason fog can hide half a road at the frontier of what a seat
 *      has walked. A layer that drew links would be a layer that had to invent
 *      an answer for "which of the two hexes does this belong to", which is the
 *      question `addRivers` has to answer by hand and this one does not.
 *   2. **The fingerprint is presence.** `Tile.road` holds the *builder's seat*,
 *      and the board deliberately draws every road in one colour whoever laid
 *      it, so the hash must not move when the value does — or a road changing
 *      hands would cost a rebuild that came out byte-identical.
 *   3. **Fog applies on rebuild.** `FogView` patches the board's buffers and
 *      knows nothing about this group, so a layer rebuilt on remembered ground
 *      would come up lit and stay lit. Roads are *ground*: they survive on
 *      explored hexes, washed, and vanish on ground nobody has charted.
 *   4. **Pillage costs the board nothing.** A road appearing and a road being
 *      torn up are both a rebuild of this layer alone — the board is built once
 *      per game, and nothing here may touch it.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/** A blank grassland state with no units, no cities and no roads. */
function flatState(width = 12, height = 10): GameState {
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
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Paves a run of hexes for one seat. Presence is the state; the id is the seat. */
function pave(state: GameState, seat: number, ...cells: [number, number][]): void {
  for (const [col, row] of cells) at(state, col, row).road = seat;
}

function meshesOf(group: { children: unknown[] }): InstancedMesh[] {
  return group.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
}

function allVisible(state: GameState): number[] {
  return new Array<number>(state.map.tiles.length).fill(VISIBLE);
}

// --- the layer --------------------------------------------------------------

describe('the road layer', () => {
  const geometry = new BoardGeometry();

  function layerFor(state: GameState, levels: number[] | null = null): RoadLayer {
    const layer = new RoadLayer();
    layer.build(state, geometry, materials(), false, levels);
    return layer;
  }

  it('draws nothing on a board nobody has driven a caravan across', () => {
    const layer = layerFor(flatState());
    expect(layer.instances).toBe(0);
    expect(meshesOf(layer.group)).toHaveLength(0);
  });

  it('draws a hub, and only a hub, for a paved hex joined to nothing', () => {
    // The first step of a run, and the hex left over on either side of a
    // pillage. A hex that had a road on it and drew nothing at all would read as
    // the road having failed to appear.
    const state = flatState();
    pave(state, 0, [4, 4]);
    const layer = layerFor(state);
    expect(layer.hubCount).toBe(1);
    expect(layer.stripCount).toBe(0);
    const mesh = meshesOf(layer.group).find(
      (candidate) => candidate.geometry === geometry.roadHub,
    );
    expect(mesh).toBeDefined();
  });

  it('gives each paved hex one strip per paved neighbour, and no hub', () => {
    // A straight run of three: the middle hex reaches both ways, the two ends
    // reach one. Four halves, which is two whole links — the arithmetic that
    // says this layer is drawing halves rather than links.
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4], [5, 4]);
    const layer = layerFor(state);
    expect(layer.stripCount).toBe(4);
    expect(layer.hubCount).toBe(0);
    expect(layer.instances).toBe(4);
  });

  it('reaches every way a junction goes — six, when six is the answer', () => {
    // A hex with paved neighbours all round it: six strips of its own, one back
    // from each of the six, and — because consecutive members of a hex ring are
    // neighbours too — two more from each of them along the ring. Twenty-four
    // halves and no hub anywhere, since every paved hex here is joined to
    // something.
    //
    // The ring is taken from `tileNeighbors` rather than worked out here, so
    // this test asks the map the same question the layer asks it — an odd-r
    // offset ring reasoned out by hand is exactly the sort of thing that agrees
    // with the code on even rows and disagrees on odd ones.
    const state = flatState();
    const centre = at(state, 5, 5);
    centre.road = 0;
    const ring = tileNeighbors(state.map, centre);
    expect(ring).toHaveLength(6);
    for (const tile of ring) tile.road = 0;

    const layer = layerFor(state);
    expect(layer.stripCount).toBe(6 + 6 * 3);
    expect(layer.hubCount).toBe(0);
  });

  it('lays each half from the tile centre out toward its neighbour', () => {
    // The geometric claim: a strip's midpoint is half a half-link along the
    // direction, at the tile's *own* top face plus the lift — so a road climbing
    // a hill terraces up it rather than hanging in the air over the low side.
    const state = flatState();
    pave(state, 0, [4, 4], [5, 4]);
    const layer = layerFor(state);
    const mesh = meshesOf(layer.group).find(
      (candidate) => candidate.geometry === geometry.roadStrip,
    )!;
    // Two hexes × one strip each × three wrap copies, and (4,4) comes first in
    // map order, so instance 1 is its middle copy.
    expect(mesh.count).toBe(6);
    const matrix = new Matrix4();
    mesh.getMatrixAt(1, matrix);

    const tile = at(state, 4, 4);
    const centre = cellCenter(tile.col, tile.row);
    const half = (Math.sqrt(3) / 2) * VIEW3D.board.hexRadius * VIEW3D.roads.overhang;
    // East is the direction that reaches (5, 4); its yaw is what the layer used.
    const yaw = directionYaw(0);
    expect(matrix.elements[12]).toBeCloseTo(centre.x + Math.cos(yaw) * (half / 2), 5);
    expect(matrix.elements[13]).toBeCloseTo(tileTopY(tile) + VIEW3D.roads.lift, 5);
    expect(matrix.elements[14]).toBeCloseTo(centre.z - Math.sin(yaw) * (half / 2), 5);
  });

  it('places a road identically on every rebuild, so nothing crawls', () => {
    // Not hashed, unlike every scatter on this board: a road is a statement
    // about where somebody walked, and a jittered road is a road that does not
    // join up. So two builds of the same board are byte-identical.
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4], [5, 4]);
    const first = meshesOf(layerFor(state).group)[0]!;
    const second = meshesOf(layerFor(state).group)[0]!;
    expect([...(first.instanceMatrix.array as Float32Array)]).toEqual([
      ...(second.instanceMatrix.array as Float32Array),
    ]);
  });

  it('draws every road in one ink, whoever laid it', () => {
    // Anybody may walk a road (`docs/trade.md`, and Civ's rule), so a track in a
    // nation's own colour would be claiming otherwise. Two seats' roads on one
    // board are one bucket.
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4]);
    pave(state, 1, [7, 4], [8, 4]);
    const layer = layerFor(state);
    const strips = meshesOf(layer.group).filter(
      (mesh) => mesh.geometry === geometry.roadStrip,
    );
    expect(strips).toHaveLength(1);
    expect(strips[0]!.count).toBe(4 * 3);
  });
});

// --- fog --------------------------------------------------------------------

describe('the road layer and the fog', () => {
  const geometry = new BoardGeometry();

  function build(state: GameState, levels: number[] | null): RoadLayer {
    const layer = new RoadLayer();
    layer.build(state, geometry, materials(), false, levels);
    return layer;
  }

  it('draws nothing on Terra Incognita', () => {
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4]);
    const levels = new Array<number>(state.map.tiles.length).fill(HIDDEN);
    expect(build(state, levels).instances).toBe(0);
  });

  it('keeps a remembered road on the chart', () => {
    // Ground, not army: a road you walked last century is still on your chart.
    // The improvement rule, and deliberately not the unit rule.
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4]);
    const levels = new Array<number>(state.map.tiles.length).fill(EXPLORED);
    expect(build(state, levels).instances).toBe(2);
  });

  it('comes up WASHED on remembered ground, not lit', () => {
    // The load-bearing assertion of this file. `FogView` patches the board and
    // never touches this group, so a rebuilt layer that did not paint itself
    // would print a bright road across a greyed-out hex.
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4]);

    const lit = build(state, allVisible(state));
    const remembered = build(state, new Array<number>(state.map.tiles.length).fill(EXPLORED));

    const litMesh = meshesOf(lit.group)[0]!;
    const dimMesh = meshesOf(remembered.group)[0]!;
    expect(litMesh.instanceColor).not.toBeNull();
    expect(dimMesh.instanceColor).not.toBeNull();
    expect([...(litMesh.instanceColor!.array as Float32Array).slice(0, 3)]).toEqual([1, 1, 1]);
    expect(
      [...(dimMesh.instanceColor!.array as Float32Array).slice(0, 3)].every((c) => c < 1),
    ).toBe(true);
  });

  it('names its tile on EVERY instance, strips and hub alike', () => {
    // The instancing contract, asserted the only way it can be from outside: a
    // wash is applied through the collector's tile→handle map, so an instance
    // that forgot to name its tile is an instance that stays lit for ever. Every
    // channel of every instance has to have moved.
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4]);
    pave(state, 0, [8, 7]); // a lone hub, which takes the other geometry
    const remembered = build(state, new Array<number>(state.map.tiles.length).fill(EXPLORED));
    const meshes = meshesOf(remembered.group);
    expect(meshes.length).toBe(2);
    for (const mesh of meshes) {
      const tint = mesh.instanceColor!.array as Float32Array;
      expect(tint.length).toBe(mesh.count * 3);
      for (let i = 0; i < tint.length; i++) expect(tint[i]).toBeLessThan(1);
    }
  });

  it('paints per tile, so a half-charted road is half washed', () => {
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4]);
    const levels = allVisible(state);
    levels[tileIndex(state.map, 4, 4)] = EXPLORED;

    const mesh = meshesOf(build(state, levels).group).find(
      (candidate) => candidate.geometry === geometry.roadStrip,
    )!;
    const tint = mesh.instanceColor!.array as Float32Array;
    // Six instances: two halves × three wrap copies, the watched one first —
    // tiles are walked in map order and (3, 4) is the lower index.
    expect(mesh.count).toBe(6);
    expect(tint[0]).toBeCloseTo(1, 5);
    expect(tint[9]).toBeLessThan(1);
  });
});

// --- the board is not touched -----------------------------------------------

describe('roads and the board', () => {
  const geometry = new BoardGeometry();

  it('lays and tears up a road without a board rebuild', () => {
    // The M8 constraint, and the reason roads are a layer at all. A caravan
    // paves a hex every step it takes; a pillage tears one up. Neither may cost
    // the board a single instance write, let alone a re-bake.
    const state = flatState();
    const board = buildBoard(state.map, geometry, materials(), false);
    const meshesBefore = meshesOf(board.group);
    expect(meshesBefore.length).toBeGreaterThan(0);

    pave(state, 0, [3, 4], [4, 4], [5, 4]);
    resetInstanceWrites();
    const laid = new RoadLayer();
    laid.build(state, geometry, materials(), false, allVisible(state));
    expect(laid.instances).toBe(4);
    expect(INSTANCE_WRITES.matrix).toBe(0);

    // The pillage: presence is the whole state, so it goes away by deletion.
    delete at(state, 4, 4).road;
    resetInstanceWrites();
    const torn = new RoadLayer();
    torn.build(state, geometry, materials(), false, allVisible(state));
    // Two lone hubs where a run of three used to be, and not one strip.
    expect(torn.stripCount).toBe(0);
    expect(torn.hubCount).toBe(2);
    expect(INSTANCE_WRITES.matrix).toBe(0);

    // And the board is the same object it was, mesh for mesh.
    expect(meshesOf(board.group)).toEqual(meshesBefore);

    laid.dispose();
    torn.dispose();
    board.dispose();
  });
});

// --- the fingerprint --------------------------------------------------------

describe('the road fingerprint', () => {
  it('moves when a hex is paved, and holds still otherwise', () => {
    const state = flatState();
    const blank = signRoadCells(state);
    pave(state, 0, [3, 4]);
    const paved = signRoadCells(state);
    expect(paved).not.toBe(blank);

    // Same board, same hash: a fact about the board, never about the order the
    // caravan happened to walk it in.
    const twin = flatState();
    pave(twin, 0, [3, 4]);
    expect(signRoadCells(twin)).toBe(paved);

    // Presence is the whole state, so a pillage puts it back exactly.
    delete at(state, 3, 4).road;
    expect(signRoadCells(state)).toBe(blank);
  });

  it('does NOT move when only the builder changes', () => {
    // The one thing this hash deliberately does not see. Every road is drawn in
    // one grout colour whoever laid it, so a road changing hands must not cost a
    // rebuild that would come out byte-identical.
    const state = flatState();
    pave(state, 0, [3, 4], [4, 4]);
    const before = signRoadCells(state);
    at(state, 3, 4).road = 1;
    at(state, 4, 4).road = 1;
    expect(signRoadCells(state)).toBe(before);
  });

  it('distinguishes two roads on different tiles', () => {
    const a = flatState();
    pave(a, 0, [3, 4]);
    const b = flatState();
    pave(b, 0, [4, 4]);
    expect(signRoadCells(a)).not.toBe(signRoadCells(b));
  });

  it('is blind to everything else that can change on a tile', () => {
    // It walks `map.tiles` and reads one field, which is the property that lets
    // the renderer ask it every frame. A farm built beside a road must not
    // rebuild the road.
    const state = flatState();
    pave(state, 0, [3, 4]);
    const before = signRoadCells(state);
    at(state, 3, 5).improvement = 'farm';
    at(state, 4, 4).feature = 'forest';
    expect(signRoadCells(state)).toBe(before);
  });
});
