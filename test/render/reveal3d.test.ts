import { describe, expect, it } from 'vitest';
import { type InstancedMesh, Matrix4 } from 'three';

import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { FogView } from '../../src/render3d/fog3d';
import {
  type InstanceHandle,
  HIDDEN_MATRIX,
  INSTANCE_WRITES,
  resetInstanceWrites,
} from '../../src/render3d/instances';
import { VIEW3D } from '../../src/render3d/lookData';
import { RevealView } from '../../src/render3d/reveal3d';
import { MaterialLibrary } from '../../src/render3d/toon';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { type GameState, newGame } from '../../src/sim/state';
import { visibleResourceAt } from '../../src/sim/tech';
import { HIDDEN, resetVisibility } from '../../src/sim/visibility';

/**
 * The reveal pass: props for resources a seat cannot name are taken off the
 * board, and put back the instant it can name them.
 *
 * The rule being defended is the one CLAUDE.md now states three ways — marker,
 * prop and yield appear **together** on the reveal — and the constraint is M8's:
 * per-instance writes, never a board rebuild. So the assertions are about the
 * matrices of specific instances and about the *number of writes* a pass costs,
 * exactly as `fog3d.test.ts` argues, and never about a rebuilt buffer.
 *
 * The other thing under test is the composition of the three bits
 * (`instances.ts`). A veil and a fog-hide are independent reasons an instance is
 * off, so the interesting cases are the corners: fog lifting off a hex whose ore
 * is still unnameable must not put the ore back, and a technology landing on a
 * hex nobody has charted must not light it up.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/** Flat grassland, two seats, no units, nothing researched by seat 0. */
function flatState(width = 12, height = 10): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = [];
  return state;
}

function put(state: GameState, col: number, row: number, resource: 'iron' | 'wheat'): number {
  const tile = getTileAt(state.map, col, row)!;
  tile.resource = resource;
  // Iron is placed on hills by the generator; the prop does not care, and the
  // hill keeps this fixture honest about which sculpt is being counted.
  if (resource === 'iron') tile.hills = true;
  return tileIndex(state.map, col, row);
}

interface Rig {
  state: GameState;
  geometry: BoardGeometry;
  mats: MaterialLibrary;
  board: ReturnType<typeof buildBoard>;
  reveal: RevealView;
}

function rig(state: GameState): Rig {
  const geometry = new BoardGeometry();
  const mats = materials();
  const board = buildBoard(state.map, geometry, mats, false);
  const reveal = new RevealView(board.resourceCells);
  return { state, geometry, mats, board, reveal };
}

/** Is this handle's first slot zero-scaled? See `fog3d.test.ts` on the compare. */
function isHidden(handle: InstanceHandle): boolean {
  const bucket = handle.bucket as { mesh: InstancedMesh | null };
  const matrix = new Matrix4();
  bucket.mesh!.getMatrixAt(handle.start, matrix);
  return matrix.elements.every((value, i) => value === HIDDEN_MATRIX.elements[i]);
}

/** Every prop handle the board planted on one cell. */
function propsAt(board: Rig['board'], cell: number): InstanceHandle[] {
  return board.resourceCells.find((entry) => entry.cell === cell)?.handles ?? [];
}

// --- what the board hands over ----------------------------------------------

describe('the board’s record of its props', () => {
  it('files every resource tile it dressed, with the resource that asked for it', () => {
    const state = flatState();
    const iron = put(state, 4, 4, 'iron');
    const wheat = put(state, 7, 6, 'wheat');
    const { board } = rig(state);

    const cells = board.resourceCells.map((entry) => entry.cell).sort((a, b) => a - b);
    expect(cells).toEqual([iron, wheat].sort((a, b) => a - b));
    for (const entry of board.resourceCells) {
      expect(entry.handles.length).toBeGreaterThan(0);
      expect(RESOURCE_IDS).toContain(entry.resource);
    }
    board.dispose();
  });

  it('files nothing on a board with no resources on it', () => {
    const { board } = rig(flatState());
    expect(board.resourceCells).toEqual([]);
    board.dispose();
  });

  it('walks only the gated props, which is two rows of twenty', () => {
    // The cost argument: an ungated resource is filtered out at construction, so
    // a board of wheat holds no reveal state at all.
    const state = flatState();
    put(state, 4, 4, 'iron');
    put(state, 7, 6, 'wheat');
    const { board, reveal } = rig(state);
    expect(reveal.gatedCount).toBe(1);
    expect(resourceDef('wheat').requiresTech).toBeUndefined();
    board.dispose();
  });
});

// --- the veil ---------------------------------------------------------------

describe('what a seat may be shown', () => {
  it('takes the ore off the board for a seat with no word for it', () => {
    const state = flatState();
    const cell = put(state, 4, 4, 'iron');
    const { board, reveal } = rig(state);

    // As baked: lit, because the board is built once and shared by every seat.
    for (const handle of propsAt(board, cell)) expect(isHidden(handle)).toBe(false);

    reveal.apply(state, 0);
    for (const handle of propsAt(board, cell)) expect(isHidden(handle)).toBe(true);
    expect(reveal.isVeiled(cell)).toBe(true);
    // And the simulation agrees, which is the whole point: one rule, three
    // surfaces (see `visibleResourceAt`).
    expect(visibleResourceAt(state, 0, getTileAt(state.map, 4, 4)!)).toBeNull();
    board.dispose();
  });

  it('puts it back the instant the technology lands', () => {
    const state = flatState();
    const cell = put(state, 4, 4, 'iron');
    const { board, reveal } = rig(state);
    reveal.apply(state, 0);

    state.players[0]!.techsResearched = ['ironWorking'];
    const stats = reveal.apply(state, 0);
    expect(stats.cells).toBe(1);
    expect(stats.matrixWrites).toBeGreaterThan(0);
    for (const handle of propsAt(board, cell)) expect(isHidden(handle)).toBe(false);
    expect(visibleResourceAt(state, 0, getTileAt(state.map, 4, 4)!)).toBe('iron');
    board.dispose();
  });

  it('leaves an ungated resource alone whatever the seat knows', () => {
    const state = flatState();
    const cell = put(state, 7, 6, 'wheat');
    const { board, reveal } = rig(state);
    reveal.apply(state, 0);
    for (const handle of propsAt(board, cell)) expect(isHidden(handle)).toBe(false);
    expect(reveal.isVeiled(cell)).toBe(false);
    board.dispose();
  });

  it('shows everything to nobody’s seat — the omniscient board', () => {
    // No fog, no seat: the galleries, the frozen 2D pipelines, the mapgen page.
    const state = flatState();
    const cell = put(state, 4, 4, 'iron');
    const { board, reveal } = rig(state);
    reveal.apply(state, null);
    for (const handle of propsAt(board, cell)) expect(isHidden(handle)).toBe(false);
    board.dispose();
  });

  it('follows a seat change, both ways', () => {
    const state = flatState();
    const cell = put(state, 4, 4, 'iron');
    state.players[1]!.techsResearched = ['ironWorking'];
    const { board, reveal } = rig(state);

    reveal.apply(state, 0);
    expect(isHidden(propsAt(board, cell)[0]!)).toBe(true);
    reveal.apply(state, 1);
    expect(isHidden(propsAt(board, cell)[0]!)).toBe(false);
    reveal.apply(state, 0);
    expect(isHidden(propsAt(board, cell)[0]!)).toBe(true);
    board.dispose();
  });
});

// --- the constraint ---------------------------------------------------------

describe('what a pass costs', () => {
  it('writes nothing at all when nothing changed', () => {
    const state = flatState();
    put(state, 4, 4, 'iron');
    const { board, reveal } = rig(state);
    reveal.apply(state, 0);

    resetInstanceWrites();
    const stats = reveal.apply(state, 0);
    expect(stats.cells).toBe(0);
    expect(stats.matrixWrites).toBe(0);
    expect(INSTANCE_WRITES.matrix).toBe(0);
    board.dispose();
  });

  it('costs writes on the changed props only, not on the board', () => {
    // Two iron hills and a field of nothing: revealing the ore writes on the
    // ore's own instances and on no other tile's.
    const state = flatState();
    const first = put(state, 4, 4, 'iron');
    const second = put(state, 6, 6, 'iron');
    const { board, reveal } = rig(state);
    reveal.apply(state, 0);

    const props = [...propsAt(board, first), ...propsAt(board, second)];
    let slots = 0;
    for (const handle of props) slots += handle.count;

    resetInstanceWrites();
    state.players[0]!.techsResearched = ['ironWorking'];
    const stats = reveal.apply(state, 0);
    expect(stats.cells).toBe(2);
    // One write per instance slot the props own, and not one more — the board
    // has thousands of instances and none of them is touched.
    expect(stats.matrixWrites).toBe(slots);
    expect(board.instanceCount).toBeGreaterThan(slots * 10);
    board.dispose();
  });
});

// --- composing with fog -----------------------------------------------------

describe('the three bits together', () => {
  it('keeps ore hidden when the fog lifts off a hex the seat cannot name', () => {
    // The corner the state machine exists for: two independent reasons an
    // instance is off, and lifting one must not lift the other.
    const state = flatState();
    const cell = put(state, 4, 4, 'iron');
    const { state: s, geometry, mats, board, reveal } = rig(state);
    const fog = new FogView(s.map, board.tiles);
    fog.buildChart(geometry, mats, null);

    const levels = new Array<number>(s.map.tiles.length).fill(HIDDEN);
    fog.apply(levels);
    reveal.apply(s, 0);
    const prop = propsAt(board, cell)[0]!;
    expect(isHidden(prop)).toBe(true);

    // The scout arrives: the hex is watched, and everything on it comes back
    // except the thing this seat still has no word for.
    levels.fill(2);
    fog.apply(levels);
    expect(isHidden(prop)).toBe(true);
    // The prism did come back, so this is not simply a board that stayed dark.
    const own = board.tiles.own.get(cell)!;
    expect(own.some((handle) => !isHidden(handle))).toBe(true);

    state.players[0]!.techsResearched = ['ironWorking'];
    reveal.apply(s, 0);
    expect(isHidden(prop)).toBe(false);
    fog.dispose();
    board.dispose();
  });

  it('does not light a prop on ground nobody has charted', () => {
    const state = flatState();
    const cell = put(state, 4, 4, 'iron');
    state.players[0]!.techsResearched = ['ironWorking'];
    const { geometry, mats, board, reveal } = rig(state);
    const fog = new FogView(state.map, board.tiles);
    fog.buildChart(geometry, mats, null);

    fog.apply(new Array<number>(state.map.tiles.length).fill(HIDDEN));
    reveal.apply(state, 0);
    // Nameable and unseen is still unseen.
    for (const handle of propsAt(board, cell)) expect(isHidden(handle)).toBe(true);
    fog.dispose();
    board.dispose();
  });
});

// --- the layer’s own lifetime -----------------------------------------------

describe('the layer’s lifetime', () => {
  it('repaints from scratch after a reset, for a state that was swapped', () => {
    const state = flatState();
    const cell = put(state, 4, 4, 'iron');
    const { board, reveal } = rig(state);
    reveal.apply(state, 0);
    expect(isHidden(propsAt(board, cell)[0]!)).toBe(true);

    reveal.reset();
    const stats = reveal.apply(state, 0);
    // Nothing on screen moves — the answer is the same — but the layer has
    // re-decided it rather than trusting a record about a state that is gone.
    expect(stats.cells).toBe(1);
    expect(isHidden(propsAt(board, cell)[0]!)).toBe(true);
    board.dispose();
  });

  it('stops writing once disposed', () => {
    const state = flatState();
    put(state, 4, 4, 'iron');
    const { board, reveal } = rig(state);
    reveal.dispose();
    expect(reveal.apply(state, 0)).toEqual({ cells: 0, matrixWrites: 0 });
    board.dispose();
  });
});
