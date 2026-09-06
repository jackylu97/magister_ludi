/**
 * **Archers capture civilians on right-click** (user, 2026-09-05: "archers
 * should capture civilian units when right clicking them, right now they ranged
 * attack" — `docs/flags.md` note 22).
 *
 * A hex holding nothing but somebody else's civilians is taken by *walking onto
 * it*, so a right-click on one is a move order and never a shot. The rule itself
 * is the simulation's (`takesByWalking` in `pathfind.ts`, and the reducer's own
 * refusal in `combat.ts` — both pinned by `test/sim/combat.test.ts` and
 * `test/sim/pathfind.test.ts`); what is pinned *here* is the half that lives in
 * the pointer, which is that the dispatcher asks that one function rather than
 * deciding for itself what is standing on a hex.
 *
 * The gesture lives inside `createGameControls`' closures and this suite has no
 * jsdom (`controls.test.ts`'s docblock), so the dispatch is read from the source
 * exactly as `cityCombat.test.ts` and `seatRoster.test.ts` read theirs. The
 * behavioural half above it is the sim's own predicate, asked of a board — which
 * is the same call the interface makes, one argument at a time.
 */

import { describe, expect, it } from 'vitest';

import { createMap, getTileAt } from '../../src/sim/map';
import { takesByWalking } from '../../src/sim/pathfind';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';

const SOURCES = import.meta.glob(['../../src/ui/controls.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** A two-player state on a blank grassland rectangle, at war, as combat's is. */
function flatState(width = 16, height = 8): GameState {
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
  openWar(state, 0, 1);
  return state;
}

function at(state: GameState, col: number, row: number) {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

describe('the hex an archer walks onto', () => {
  it('is one the simulation names, for the pointer and the reducer alike', () => {
    const state = flatState();
    const archer = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'settler', 5, 3);

    // Two hexes away, inside the bow's range, and still a march: the answer does
    // not depend on how far the piece can shoot.
    expect(takesByWalking(state, archer, at(state, 5, 3))).toBe(true);
    // Empty ground is not a taking — there is nobody standing there to take.
    expect(takesByWalking(state, archer, at(state, 6, 3))).toBe(false);
  });

  it('is not one when a soldier is standing over them', () => {
    const state = flatState();
    const archer = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'settler', 5, 3);
    createUnit(state, 1, 'spearman', 5, 3);
    expect(takesByWalking(state, archer, at(state, 5, 3))).toBe(false);
  });
});

describe('the right button', () => {
  it('asks the simulation which hexes are taken by walking, and asks it by name', () => {
    const text = source('controls.ts');
    // Imported, not re-derived: an interface that drew its own line would tint a
    // shot the reducer refuses, or march onto ground it would not give.
    expect(text).toMatch(/import \{[^}]*takesByWalking[^}]*\} from '\.\.\/sim\/pathfind'/s);
    // One wrapper over it, and exactly one — the closure that has `getGame`.
    expect(text.match(/takesByWalking\(state, unit, tile\)/g) ?? []).toHaveLength(1);
  });

  it('reads the same answer on all three surfaces', () => {
    const text = source('controls.ts');
    // The tint, the forecast card and the click. Between them they are the whole
    // gesture, so a hex one of them called a fight and another called a march
    // would be a board that lies about its own verbs.
    const asks = text.match(/takenByWalking\(unit, (?:tile\.col, tile\.row|col, row)\)/g) ?? [];
    expect(asks).toHaveLength(3);
  });

  it('hands the click back before it can dispatch an attack', () => {
    const text = source('controls.ts');
    const body = text.slice(text.indexOf('function issueAttack('));
    const guard = body.indexOf('takenByWalking(unit, col, row)');
    const dispatch = body.indexOf("type: 'attack'");
    expect(guard).toBeGreaterThan(-1);
    expect(dispatch).toBeGreaterThan(-1);
    // Returning false is what sends the gesture on to `issueMove` in both
    // dispatchers — the right button and move mode's armed click.
    expect(body.slice(guard, guard + 60)).toMatch(/return false;/);
    expect(guard).toBeLessThan(dispatch);
  });

  it('falls through to the march in both dispatchers', () => {
    const text = source('controls.ts');
    expect(text).toMatch(/if \(!issueAttack\(hover\)\) issueMove\(hover\);/);
    expect(text).toMatch(/if \(issueAttack\(hover\)\) return;\s*\n\s*issueMove\(hover\);/);
  });
});
