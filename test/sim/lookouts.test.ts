/**
 * `explorerTargets` (`src/sim/lookouts.ts`): the hexes the explorer lens marks
 * as worth a walk.
 *
 * The claims: only charted land is a candidate; a hill is listed apart from
 * other ground and sees one hex farther; the marked hexes are spaced apart;
 * the order is by how much uncharted ground is in sight; and a seat that has
 * charted everything gets nothing.
 */

import { describe, expect, it } from 'vitest';

import { explorerTargets } from '../../src/sim/lookouts';
import { createMap, getTileAt, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
import { EXPLORED, HIDDEN, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const KNOBS = { sight: 3, minUnseen: 4, spacing: 4, hills: 2, edges: 3 };

/** A flat land board. The seat has charted the columns west of `edge`. */
function board(edge: number): GameState {
  const state = newGame({ seed: 4, sizeName: 'duel', players: [{ name: 'A', color: '#a00', isHuman: true }] });
  state.map = createMap({ width: 20, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.camps = [];
  for (const tile of state.map.tiles) {
    state.visibility[0]![tileIndex(state.map, tile.col, tile.row)] = tile.col < edge ? EXPLORED : HIDDEN;
  }
  return state;
}

describe('explorerTargets', () => {
  it('marks charted hexes beside uncharted ground, best first and spaced apart', () => {
    const state = board(8);
    const { hills, edges } = explorerTargets(state, 0, KNOBS);
    expect(hills).toEqual([]);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.length).toBeLessThanOrEqual(KNOBS.edges);
    for (const pick of edges) {
      expect(pick.tile.col).toBeLessThan(8);
      expect(pick.unseen).toBeGreaterThanOrEqual(KNOBS.minUnseen);
    }
    for (let i = 1; i < edges.length; i++) {
      expect(edges[i]!.unseen).toBeLessThanOrEqual(edges[i - 1]!.unseen);
      for (let j = 0; j < i; j++) {
        expect(wrappedDistance(state.map, tileHex(edges[i]!.tile), tileHex(edges[j]!.tile))).toBeGreaterThanOrEqual(KNOBS.spacing);
      }
    }
  });

  it('lists a hill apart, and a hill sees farther than flat ground', () => {
    const state = board(8);
    // Four hexes back from the edge: flat ground there sees no uncharted hex at sight 3, a hill sees some.
    const hill = getTileAt(state.map, 4, 6)!;
    hill.hills = true;
    const far = explorerTargets(state, 0, { ...KNOBS, minUnseen: 1 });
    expect(far.hills.map((pick) => `${pick.tile.col},${pick.tile.row}`)).toContain('4,6');
    expect(far.edges.every((pick) => !pick.tile.hills)).toBe(true);
  });

  it('never marks water, a mountain or uncharted ground', () => {
    const state = board(8);
    for (const tile of state.map.tiles) if (tile.col === 7) tile.terrain = tile.row % 2 ? 'coast' : 'mountain';
    const { hills, edges } = explorerTargets(state, 0, KNOBS);
    for (const pick of [...hills, ...edges]) {
      expect(pick.tile.col).toBeLessThan(7);
    }
  });

  it('marks nothing for a seat that has charted the whole map', () => {
    const state = board(99);
    expect(explorerTargets(state, 0, KNOBS)).toEqual({ hills: [], edges: [] });
  });
});
