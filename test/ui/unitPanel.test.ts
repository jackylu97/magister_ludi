/**
 * The unit sheet's two promises about a standing order (playtest batch two).
 *
 *   1. **A selected piece says what it has been told to do.** `unit.path` *is*
 *      the orders, and the sheet's line names where they end — a town if this
 *      seat knows there is one there, otherwise the ground — and prices the rest
 *      of the march with the movement evaluator rather than with a loop of its
 *      own. The naming is `marchDestination`, and it is asserted here because
 *      the failure is never a thrown error: it is a sentence that is merely
 *      wrong, or one that names a city nobody has seen.
 *   2. **A spent piece is still an orderable one.** The reducer stopped refusing
 *      a march at zero movement, and nothing in `src/ui/` ever refused one — but
 *      the *board* said otherwise, because a highlight of "where can this end
 *      the turn" is empty for a piece with nothing left. So the move-mode line
 *      carries the other half, and the register below is what keeps a
 *      `movesLeft <= 0` guard from being added back to the move path by
 *      somebody who reads that empty ring as a bug.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sheet itself is not
 * rendered here: what is covered is the pure naming, and — through the source,
 * exactly as `cityScreen.test.ts` and `seatRoster.test.ts` read theirs — the two
 * rules that span files.
 */

import { describe, expect, it } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { recomputeVisibility, resetVisibility } from '../../src/sim/visibility';
import { moveModeNotice } from '../../src/ui/controls';
import { marchDestination } from '../../src/ui/unitPanel';

const SOURCES = import.meta.glob(
  ['../../src/ui/controls.ts', '../../src/ui/unitPanel.ts'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** A two-player state on a blank grassland rectangle, as `turnBlockers` uses. */
function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 3,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

describe('marchDestination', () => {
  it('names the ground and keeps the hex beside it', () => {
    // The coordinates stay because two meadows are identical in a sentence, and
    // the piece is somewhere specific.
    const state = flatState();
    expect(marchDestination(state, 0, { col: 4, row: 5 })).toBe('Grassland (4, 5)');
  });

  it('leads with the feature, which is what the eye sees first', () => {
    const state = flatState();
    at(state.map, 4, 5).feature = 'forest';
    expect(marchDestination(state, 0, { col: 4, row: 5 })).toBe('Forest (4, 5)');
  });

  it('says hills on bare ground, because that is what the route will cost', () => {
    const state = flatState();
    at(state.map, 6, 6).hills = true;
    expect(marchDestination(state, 0, { col: 6, row: 6 })).toBe('Grassland hills (6, 6)');
  });

  it('names a town this seat can see', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 7, 7));
    recomputeVisibility(state, 0);
    // The capital star comes through `cityDisplayName`, the one formatter a
    // city's name reaches a player through, so a march reads the same way a
    // banner does.
    expect(marchDestination(state, 0, { col: 7, row: 7 })).toBe(`${city.name} ✶`);
  });

  it('will not name a town the seat has never laid eyes on', () => {
    // "Marching to Uruk" about a city on ground nobody has explored is the unit
    // sheet leaking the map. The rule is the banners' own (`knowsCity`), which
    // is why it is borrowed rather than restated here.
    const state = flatState();
    foundCityAt(state, 1, at(state.map, 12, 3));
    recomputeVisibility(state, 0);
    expect(marchDestination(state, 0, { col: 12, row: 3 })).toBe('Grassland (12, 3)');
  });

  it('answers an order aimed off the map with the coordinates alone', () => {
    // Only reachable from a hand-edited save or a stale path — the reducer takes
    // no such order — and the coordinates are still the truth.
    const state = flatState();
    expect(marchDestination(state, 0, { col: 3, row: 99 })).toBe('(3, 99)');
  });
});

describe('the Orders line', () => {
  it('prices the rest of the march with the movement evaluator', () => {
    // `pathTurns` re-walks the stored waypoints through the very `stepCost` the
    // turn change will spend the points with. The panel kept its own copy of
    // that loop once and it was the copy that was wrong; there must not be a
    // second one here again.
    const text = source('unitPanel.ts');
    expect(text).toContain('pathTurns(getGame().state, unit, unit.path ?? [])');
    expect(text).toContain('Orders: marching to ${target}');
    // One caller of the evaluator, one place the number is composed.
    expect(text.match(/pathTurns\(/g)?.length).toBe(1);
  });

  it('names the destination through the one namer', () => {
    const text = source('unitPanel.ts');
    expect(text).toContain('marchDestination(getGame().state, unit.ownerId,');
  });

  it('answers itself with a button that reads as its answer', () => {
    // The line says "Orders"; the button says "Cancel Orders". A verb in the
    // singular beside a line in the plural reads as a control for something else.
    expect(source('unitPanel.ts')).toContain("label: 'Cancel Orders'");
  });
});

describe('an order given at zero movement', () => {
  it('gets a line of its own rather than a dead-looking board', () => {
    // The reachable ring is empty for a spent piece — honestly so; it reports
    // where the *turn* can end — so the notice carries what the ring cannot.
    expect(moveModeNotice(1)).not.toBe(moveModeNotice(0));
    expect(moveModeNotice(0)).toContain('next');
    expect(moveModeNotice(2)).toBe(moveModeNotice(1));
  });

  it('is refused nowhere on the move path', () => {
    // The register. `controls.ts` compares a unit's movement against zero in
    // exactly one place — Skip Turn, where "nothing left to wave off" is a fact
    // about the *blocker* and not about an order — and a second such comparison
    // is how a spent piece becomes unorderable again without anybody deciding
    // it should be. `issueMove` and the path preview must hold none.
    const text = source('controls.ts');
    const guards = [...text.matchAll(/unit\.movesLeft\s*<=\s*0/g)];
    expect(guards.length).toBe(1);
    // And it is Skip Turn's. Read as "the nearest function declaration above it".
    const before = text.slice(0, guards[0]!.index);
    const declarations = [...before.matchAll(/\n {2}function (\w+)/g)];
    expect(declarations[declarations.length - 1]?.[1]).toBe('skipBlocker');
  });

  it('leaves the committed route on the board for the piece in hand', () => {
    // A spent piece walks nothing this turn, so the route drawn under it is the
    // only thing on the board that moved. It is the selected unit's own path and
    // goes through the optional `MapView` hook, never a renderer reached into.
    expect(source('controls.ts')).toContain('renderer.setCommittedPath?.(unit?.path ?? [])');
  });
});
