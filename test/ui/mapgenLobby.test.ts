/**
 * The mapgen page's **lobby**: the chairs, and the roster they make.
 *
 * The page itself cannot be mounted here (it reaches for the document and for a
 * WebGL context at import), and the two things worth holding still are not
 * markup anyway:
 *
 *   1. the lobby **walks the leader table**, so a seventh figure in
 *      `data/leaders.json` appears in it with no edit to the page — the same
 *      rule the arena page keeps about bot knobs, and the reason the choices
 *      live in `src/mapgenPage/lobby.ts` rather than in a hundred lines of
 *      `main.ts`;
 *   2. a lobby with one figure in it makes a **roster** with one figure in it,
 *      and that roster seats that figure where its own bias asks — through the
 *      same `generateMap(seed, size, overrides, seats)` and
 *      `chooseStartPositionsFor` the game uses, which is the whole point of
 *      inspecting a lobby on this page at all.
 *
 * The source is read for the negative half of (1): the page may name no leader.
 */

import { describe, expect, it } from 'vitest';

import { LEADER_IDS, leaderDef, startBiasOf } from '../../src/sim/leaderData';
import { tileIndex } from '../../src/sim/map';
import { generateMap } from '../../src/sim/mapgen';
import {
  LOBBY_CHOICES,
  MAX_SEATS,
  MIN_SEATS,
  type LobbySeat,
  emptyLobby,
  rosterFor,
  withSeatAdded,
  withSeatRemoved,
  withSeatSet,
} from '../../src/mapgenPage/lobby';
import {
  type StartSeat,
  chooseStartPositionsFor,
  siteMeetsWants,
} from '../../src/sim/startPositions';

/** The page as text: its entry and its markup. */
const PAGE = {
  ...(import.meta.glob('../../src/mapgenPage/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
  ...(import.meta.glob('../../mapgen.html', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
};

function pageSource(name: string): string {
  const key = Object.keys(PAGE).find((path) => path.endsWith(`/${name}`));
  const text = key === undefined ? undefined : PAGE[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`source not globbed, or empty: ${name}`);
  }
  return text;
}

const INK = (index: number): string => `#seat${index}`;

describe('the mapgen lobby', () => {
  it('offers nobody, then every figure the sheet carries', () => {
    expect(LOBBY_CHOICES).toHaveLength(LEADER_IDS.length + 1);
    expect(LOBBY_CHOICES[0]).toEqual({ id: '', name: 'No leader' });
    expect(LOBBY_CHOICES.slice(1).map((choice) => choice.id)).toEqual([...LEADER_IDS]);
    for (const choice of LOBBY_CHOICES.slice(1)) {
      expect(choice.name).toBe(leaderDef(choice.id as never).name);
    }
  });

  it('names no figure anywhere on the page', () => {
    // The lobby walks the table; the page prints what the table says. A leader
    // id or a leader's name written into the entry or the markup would be a
    // seventh row that never appears.
    for (const name of ['main.ts', 'mapgen.html']) {
      const text = pageSource(name);
      for (const id of LEADER_IDS) {
        // Whole words: `modu` must not match the `module` in a docblock, and a
        // test that reads its own false positives is a test nobody keeps.
        const named = new RegExp(`\\b${id}\\b`).test(text);
        expect(`${name} names ${id}: ${named}`).toBe(`${name} names ${id}: false`);
        const figure = leaderDef(id).name;
        expect(`${name} names ${figure}: ${text.includes(figure)}`).toBe(
          `${name} names ${figure}: false`,
        );
      }
    }
  });

  it('adds and subtracts chairs, inside the roster limits the game keeps', () => {
    let lobby = emptyLobby(MIN_SEATS);
    expect(lobby).toHaveLength(MIN_SEATS);
    expect(withSeatRemoved(lobby)).toHaveLength(MIN_SEATS);
    lobby = withSeatAdded(lobby);
    expect(lobby).toHaveLength(MIN_SEATS + 1);
    expect(lobby[lobby.length - 1]).toBe('');
    let full: LobbySeat[] = emptyLobby(MAX_SEATS);
    full = withSeatAdded(full);
    expect(full).toHaveLength(MAX_SEATS);
  });

  it('makes a roster with a leader in exactly the chair that carries one', () => {
    const seated = LEADER_IDS[0]!;
    const lobby = withSeatSet(emptyLobby(2), 1, seated);
    const roster = rosterFor(lobby, INK);
    expect(roster).toHaveLength(2);
    expect(Object.keys(roster[0]!)).not.toContain('leader');
    expect(roster[0]!.name).toBe('Seat 1');
    expect(roster[1]!.leader).toBe(seated);
    // The figure's own name, so the start table and the capital walk say who.
    expect(roster[1]!.name).toBe(leaderDef(seated).name);
  });

  it('seats that one figure on the ground its own bias asks for', () => {
    // The page's whole claim: the world on the canvas is the world this roster
    // would have played. Same call, same seats, same chooser.
    const seated = 'mithridates';
    const lobby = withSeatSet(emptyLobby(2), 0, seated);
    const roster = rosterFor(lobby, INK);
    const seats: StartSeat[] = roster.map((spec) => ({ leader: spec.leader }));
    expect(seats.filter((seat) => seat.leader !== undefined)).toHaveLength(1);

    const map = generateMap(11, 'standard', undefined, seats);
    const starts = chooseStartPositionsFor(map, seats);
    expect(starts).toHaveLength(2);
    expect(tileIndex(map, starts[0]!.col, starts[0]!.row)).not.toBe(
      tileIndex(map, starts[1]!.col, starts[1]!.row),
    );
    const wants = startBiasOf(seated)!.wants!;
    expect(siteMeetsWants(map, starts[0]!, wants)).toBe(true);
  });

  it('makes the map it always made when every chair is empty', () => {
    const roster = rosterFor(emptyLobby(2), INK);
    const seats: StartSeat[] = roster.map((spec) => ({ leader: spec.leader }));
    const bare = generateMap(11, 'standard');
    const lobbied = generateMap(11, 'standard', undefined, seats);
    expect(JSON.stringify(lobbied.tiles)).toBe(JSON.stringify(bare.tiles));
  });
});
