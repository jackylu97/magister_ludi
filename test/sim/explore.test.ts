/**
 * Auto-explore: the standing order that aims itself (2026-08-30).
 *
 * Six properties, and they are the whole feature:
 *
 *   1. **The command validates like every other order** — a real seat, its own
 *      unit, a soldier or the scout, a value that changes something, the turn
 *      not yet ended — and a refusal leaves the state byte-identical (hard
 *      rule 1).
 *   2. **The target is the nearest revealing hex, ties by tile index** —
 *      `exploreTarget` is pure, deterministic, and bounded
 *      (`rules.explore.searchLimit`).
 *   3. **The march is an ordinary march.** The aim is a `path` the pipeline
 *      walks through `arriveOnTile` per step, so a ruin on the way is claimed
 *      exactly as any other walk would claim it.
 *   4. **An order is a recall.** Any other accepted command naming the unit
 *      clears the flag through `applyCommand`'s one seam, `cancelOrder`
 *      included — never a per-handler line.
 *   5. **An empty search ends the order with a report** — the flag survives a
 *      turn with no reachable target only by ending as
 *      `TurnReport.exploreEnded`, ridden out on the resolving `endTurn`.
 *   6. **A ranging piece stops blocking End Turn**, `sleeping`'s reading one
 *      flag over.
 *
 * Plus the one thing every state change in this project owes: a log with two
 * auto-exploring seats replays to a byte-identical state.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, replay } from '../../src/sim/game';
import {
  autoExploreError,
  exploreSearch,
  exploreTarget,
} from '../../src/sim/explore';
import { createMap, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import { END_OF_TURN_PHASES } from '../../src/sim/turn';
import { unitAwaitsOrders } from '../../src/sim/units';
import { EXPLORED, isExploredBy, resetVisibility } from '../../src/sim/visibility';
import { firstBlocker } from '../../src/ui/turnBlockers';

/**
 * A blank three-seat state on flat grassland — `sleep.test.ts`' fixture, for
 * the same reason: two empires and the wild, no roster in the way.
 */
function flatState(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
    barbarians: true,
  });
  state.map = createMap({ width: 24, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function explore(unitId: number, on = true, playerId = 0): Command {
  return { type: 'setAutoExplore', playerId, unitId, on };
}

/** Every hex charted for this seat: an exploring search must come up empty. */
function markAllExplored(state: GameState, playerId: number): void {
  state.visibility[playerId]!.fill(EXPLORED);
}

/**
 * Resolves the turn the way the reducer does. Real seats only: the wild's
 * flag is auto-raised each turn (`clearTurnEnded`), so its `endTurn` would be
 * refused — the resolution fires on the last real seat's command, whose
 * result this returns.
 */
function endAllTurns(state: GameState) {
  let last: ReturnType<typeof applyCommand> | undefined;
  for (const player of state.players) {
    if (player.barbarian === true) continue;
    last = applyCommand(state, { type: 'endTurn', playerId: player.id });
    expect(last.ok).toBe(true);
  }
  return last!;
}

describe('the setAutoExplore command', () => {
  it('refuses a worker — a kind, never a name — byte-identically', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    const before = clone(state);
    const result = applyCommand(state, explore(worker.id));
    expect(result.ok).toBe(false);
    expect(state).toEqual(before);
    // The gate is the sheet's gate: one rule, `autoExploreError`.
    expect(autoExploreError(worker)).not.toBeNull();
  });

  it('accepts the scout and the soldier alike', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    const warrior = createUnit(state, 0, 'warrior', 8, 5);
    expect(autoExploreError(scout)).toBeNull();
    expect(autoExploreError(warrior)).toBeNull();
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    expect(applyCommand(state, explore(warrior.id)).ok).toBe(true);
    expect(scout.autoExplore).toBe(true);
    expect(warrior.autoExplore).toBe(true);
  });

  it('refuses somebody else’s unit, a unit that does not exist, and a finished seat', () => {
    const state = flatState();
    const foreign = createUnit(state, 1, 'scout', 5, 5);
    const own = createUnit(state, 0, 'scout', 8, 5);
    const before = clone(state);
    expect(applyCommand(state, explore(foreign.id, true, 0)).ok).toBe(false);
    expect(applyCommand(state, explore(999)).ok).toBe(false);
    expect(state).toEqual(before);

    expect(applyCommand(state, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    const ended = clone(state);
    expect(applyCommand(state, explore(own.id)).ok).toBe(false);
    expect(state).toEqual(ended);
  });

  it('refuses a value that would change nothing, byte-identically', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    const before = clone(state);
    // Not exploring, told to stop: nothing to log.
    expect(applyCommand(state, explore(scout.id, false)).ok).toBe(false);
    expect(state).toEqual(before);
    // Already exploring, told again: the same refusal from the other side.
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    const ranging = clone(state);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(false);
    expect(state).toEqual(ranging);
  });

  it('drops the path and the sleep, and aims this very turn', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    // A standing order and (hand-set — no command can put a soldier to sleep)
    // the sleep flag: setting the ranging order must clear both, the path in
    // the handler and the sleep through `orderedUnitId`'s one seam.
    warrior.sleeping = true;
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: { col: 15, row: 5 } }).ok).toBe(true);
    expect(warrior.path).toBeDefined();

    expect(applyCommand(state, explore(warrior.id)).ok).toBe(true);
    expect(warrior.sleeping).toBeUndefined();
    expect(warrior.autoExplore).toBe(true);
    // The `startRoute` precedent: the aim is written by the command itself, so
    // `spendLeftoverMovement` walks it on the turn the order was given. The
    // path now ends on the search's own answer, not on the old march.
    const path = warrior.path!;
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual(exploreTarget(state, warrior));
  });

  it('turns off on demand, leaving the piece where it stands', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    expect(applyCommand(state, explore(scout.id, false)).ok).toBe(true);
    // Presence is the state: the key must not survive as `false`.
    expect('autoExplore' in scout).toBe(false);
  });
});

describe('exploreTarget', () => {
  it('aims at the nearest revealing tile, ties broken by tile index', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    // `createUnit` recomputed visibility, so everything the scout sees from
    // here is charted and its own hex reveals nothing. Every neighbour, on
    // flat ground with everything beyond the disc dark, reveals something —
    // so the answer is the lowest-indexed of the six.
    const target = exploreTarget(state, scout);
    expect(target).not.toBeNull();
    const start = getTileAt(state.map, 5, 5)!;
    expect(wrappedDistance(state.map, tileHex(start), tileHex(getTileAt(state.map, target!.col, target!.row)!))).toBe(1);
    const ring = mapRange(state.map, tileHex(start), 1)
      .filter((tile) => !(tile.col === 5 && tile.row === 5))
      .map((tile) => tileIndex(state.map, tile.col, tile.row));
    expect(tileIndex(state.map, target!.col, target!.row)).toBe(Math.min(...ring));
  });

  it('answers null — deterministically — when the world is charted', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    markAllExplored(state, 0);
    expect(exploreTarget(state, scout)).toBeNull();
    expect(exploreTarget(state, scout)).toBeNull();
  });

  it('holds the search bound: a charted map exhausts the limit, never more', () => {
    const state = flatState();
    // A map far larger than the bound, so an unbounded search would show.
    state.map = createMap({ width: 80, height: 40, terrain: 'grassland' });
    resetVisibility(state);
    const scout = createUnit(state, 0, 'scout', 20, 20);
    markAllExplored(state, 0);
    const { target, examined } = exploreSearch(state, scout);
    expect(target).toBeNull();
    expect(examined).toBe(RULES.explore.searchLimit);
    expect(examined).toBeLessThanOrEqual(RULES.explore.searchLimit);
  });
});

describe('a known discovery outranks the frontier', () => {
  it('targets a known, unclaimed ruin over the nearest revealing tile', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    const start = getTileAt(state.map, 5, 5)!;
    // The same ring the plain frontier test reads, sorted by index: the
    // scout's own sight (radius 2) already charted the whole ring, so a ruin
    // sitting on any hex in it is a *known* one. Put it on the far end of the
    // ring (highest index) — same distance as the frontier answer, so this
    // only tells apart "ruins outrank frontier" from "ruins happen to be
    // nearer".
    const ring = mapRange(state.map, tileHex(start), 1)
      .filter((tile) => !(tile.col === 5 && tile.row === 5))
      .sort((a, b) => tileIndex(state.map, a.col, a.row) - tileIndex(state.map, b.col, b.row));
    const ruinTile = ring[ring.length - 1]!;
    expect(isExploredBy(state, 0, ruinTile.col, ruinTile.row)).toBe(true);
    ruinTile.discovery = 'ruins';

    const target = exploreTarget(state, scout);
    expect(target).toEqual({ col: ruinTile.col, row: ruinTile.row });
  });

  it('ignores a ruin the owner has never explored — the fog-honesty pin', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    const start = getTileAt(state.map, 5, 5)!;
    // Well outside the scout's sight radius (2): unexplored, so unknown.
    const hiddenTile = getTileAt(state.map, 15, 5)!;
    expect(isExploredBy(state, 0, hiddenTile.col, hiddenTile.row)).toBe(false);
    hiddenTile.discovery = 'ruins';

    // Same answer as the plain frontier test — the hidden ruin changes nothing.
    const target = exploreTarget(state, scout);
    const ring = mapRange(state.map, tileHex(start), 1)
      .filter((tile) => !(tile.col === 5 && tile.row === 5))
      .map((tile) => tileIndex(state.map, tile.col, tile.row));
    expect(tileIndex(state.map, target!.col, target!.row)).toBe(Math.min(...ring));
  });

  it('goes back to frontier-seeking once the ruin is claimed', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    const start = getTileAt(state.map, 5, 5)!;
    const ring = mapRange(state.map, tileHex(start), 1)
      .filter((tile) => !(tile.col === 5 && tile.row === 5))
      .sort((a, b) => tileIndex(state.map, a.col, a.row) - tileIndex(state.map, b.col, b.row));
    const ruinTile = ring[ring.length - 1]!;
    ruinTile.discovery = 'ruins';
    expect(exploreTarget(state, scout)).toEqual({ col: ruinTile.col, row: ruinTile.row });

    // The claim (`arriveOnTile`, in production) removes the field — presence
    // is the state — and nothing else changes.
    delete ruinTile.discovery;
    const target = exploreTarget(state, scout);
    const minIndex = Math.min(...ring.map((tile) => tileIndex(state.map, tile.col, tile.row)));
    expect(tileIndex(state.map, target!.col, target!.row)).toBe(minIndex);
  });
});

describe('the march', () => {
  it('sits directly before spendLeftoverMovement, marchTraders’ seat', () => {
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf('spendLeftoverMovement')).toBe(names.indexOf('marchExplorers') + 1);
  });

  it('walks through arriveOnTile — a ruin on the way is claimed', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    // The aim is a plain standing order; put a ruin on its destination and let
    // the resolution walk it. The claim is `arriveOnTile`'s, per step — this
    // test never calls it.
    const path = scout.path!;
    const goal = getTileAt(state.map, path[path.length - 1]!.col, path[path.length - 1]!.row)!;
    goal.discovery = 'ruins';
    endAllTurns(state);
    expect(scout.col).toBe(goal.col);
    expect(scout.row).toBe(goal.row);
    expect(goal.discovery).toBeUndefined();
    expect(state.players[0]!.pendingDiscovery).toBeDefined();
    // Still ranging: the world is not charted yet.
    expect(scout.autoExplore).toBe(true);
  });
});

describe('an order is a recall', () => {
  it('clears the flag through the one seam when any other order names the unit', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    expect(scout.autoExplore).toBe(true);
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: scout.id, target: { col: 6, row: 5 } }).ok).toBe(true);
    expect('autoExplore' in scout).toBe(false);
  });

  it('is cancelled by cancelOrder, even with no path to drop', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    markAllExplored(state, 0);
    // The aim finds nothing, so the flag stands alone — and `cancelOrder`
    // still accepts it as a standing order (its third subject).
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    expect(scout.path).toBeUndefined();
    expect(applyCommand(state, { type: 'cancelOrder', playerId: 0, unitId: scout.id }).ok).toBe(true);
    expect('autoExplore' in scout).toBe(false);
  });
});

describe('the empty search', () => {
  it('survives the turn only by ending with the report', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    markAllExplored(state, 0);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    // The command leaves the flag standing even though the aim found nothing:
    // ending it is the phase's business, because the phase can say so.
    expect(scout.autoExplore).toBe(true);
    const result = endAllTurns(state);
    expect(result.ok && result.exploreEnded).toEqual([{ unitId: scout.id, ownerId: 0 }]);
    expect('autoExplore' in scout).toBe(false);
  });
});

describe('a ranging piece and the End Turn blocker', () => {
  it('stops being idle, and stops blocking', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    expect(unitAwaitsOrders(scout)).toBe(true);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: scout.id });

    markAllExplored(state, 0);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    // Even with no path aimed, the flag alone is the standing order.
    expect(scout.path).toBeUndefined();
    expect(unitAwaitsOrders(scout)).toBe(false);
    expect(firstBlocker(state, 0)?.kind).not.toBe('idleUnit');
  });
});

describe('determinism', () => {
  it('replays byte-for-byte across two auto-exploring seats', () => {
    const game = createGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
      barbarians: true,
    });
    // Each seat's opening scout, through `dispatch` so the order lands in the
    // log a replay walks.
    for (const seat of [0, 1]) {
      const scout = game.state.units.find(
        (unit) => unit.ownerId === seat && unit.type === 'scout',
      );
      expect(scout).toBeDefined();
      expect(dispatch(game, explore(scout!.id, true, seat)).ok).toBe(true);
    }
    for (let turn = 0; turn < 4; turn++) {
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    expect(game.log.some((command) => command.type === 'setAutoExplore')).toBe(true);
    expect(JSON.stringify(replay(game.config, game.log))).toBe(JSON.stringify(game.state));
  });
});

describe('the gated layers and the explorer', () => {
  it('never targets a barrow its owner has no word for, and targets it once the word arrives', () => {
    // The map's second layer: a site the claim would refuse is a site the walk
    // must not promise (the stuck-scout bug of 2026-09-02) — the same kind gate
    // the claim and the marker read.
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    const start = getTileAt(state.map, 5, 5)!;
    const frontier = exploreTarget(state, scout);
    const ring = mapRange(state.map, tileHex(start), 1)
      .filter((tile) => !(tile.col === 5 && tile.row === 5))
      .sort((a, b) => tileIndex(state.map, a.col, a.row) - tileIndex(state.map, b.col, b.row));
    const barrow = ring[ring.length - 1]!;
    barrow.discovery = 'antiquity' as never;
    expect(exploreTarget(state, scout)).toEqual(frontier);
    state.players[0]!.techsResearched.push('prospecting' as never);
    expect(exploreTarget(state, scout)).toEqual({ col: barrow.col, row: barrow.row });
  });
});
