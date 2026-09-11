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
 *   3. **The march is an ordinary march, and it spends the whole allowance**
 *      ((gggg), 2026-09-10). The aim is a `path` walked by `advanceAlongPath`
 *      through `arriveOnTile` per step — so a ruin on the way is claimed
 *      exactly as any other walk would claim it, and a hex costs exactly what
 *      a player's own order pays for it — and the piece re-aims and walks
 *      again while it has points and somewhere to go.
 *   4. **An order is a recall.** Any other accepted command naming the unit
 *      clears the flag through `applyCommand`'s one seam, `cancelOrder`
 *      included — never a per-handler line.
 *   5. **An empty search ends the order with a report** — the flag survives a
 *      turn with no reachable target only by ending as
 *      `TurnReport.exploreEnded`, ridden out on the resolving `endTurn`.
 *   6. **A ranging piece stops blocking End Turn**, `sleeping`'s reading one
 *      flag over.
 *
 * Plus the two things every state change in this project owes: a log with two
 * auto-exploring seats replays to a byte-identical state, and twenty turns of
 * ranging at two seeds still arrive at the board they always arrived at — the
 * outcome pin a change made for speed has to get past.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import {
  autoExploreError,
  exploreSearch,
  exploreTarget,
  marchExplorers,
} from '../../src/sim/explore';
import { advanceAlongPath } from '../../src/sim/movement';
import { createMap, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, createUnit, newGame, bumpRevision } from '../../src/sim/state';
import { END_OF_TURN_PHASES } from '../../src/sim/turn';
import { isCombatant, isExplorer, unitDef } from '../../src/sim/unitData';
import { unitAwaitsOrders } from '../../src/sim/units';
import {
  EXPLORED,
  isExploredBy,
  recomputeVisibility,
  resetVisibility,
} from '../../src/sim/visibility';
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

/**
 * One number for a whole board — FNV-1a over `snapshotState`'s print, with the
 * print's own length beside it.
 *
 * A hash rather than the dump for the obvious reason (a state print is a
 * hundred and eighty kilobytes) and one less obvious: a literal nobody can read
 * is a literal nobody is tempted to repair by hand.
 */
function digest(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0') + ':' + text.length;
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
    // The aim is a plain standing order; put a ruin on its first hex and let
    // the resolution walk it. The claim is `arriveOnTile`'s, per step — this
    // test never calls it, and since the march spends the whole allowance the
    // ruin is claimed by *riding over* it rather than by stopping on it.
    const path = scout.path!;
    const first = getTileAt(state.map, path[0]!.col, path[0]!.row)!;
    first.discovery = 'ruins';
    endAllTurns(state);
    expect(first.discovery).toBeUndefined();
    expect(state.players[0]!.pendingDiscovery).toBeDefined();
    // Rode on: the scout is not standing where the ruin was.
    expect(scout.col === first.col && scout.row === first.row).toBe(false);
    // Still ranging: the world is not charted yet.
    expect(scout.autoExplore).toBe(true);
  });
});

/**
 * (gggg), the user 2026-09-10: "units set on auto-explore should use all of
 * their movement." Four pins, and they are the whole of the change: the
 * allowance is spent, it is spent at the ordinary price, an exhausted world
 * still stops the piece rather than spinning it, and the report still fires
 * once.
 */
describe('the march spends the whole allowance', () => {
  it('a two-point scout on open ground enters two hexes in one turn', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    const allowance = scout.movesLeft;
    expect(allowance).toBe(2);
    const from = { col: scout.col, row: scout.row };
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    // The aim is the *nearest* revealing hex, which on flat ground is one tile
    // away — the whole reason the old march stopped a point short.
    expect(scout.path!.length).toBe(1);
    endAllTurns(state);
    // Two hexes of open grassland at one point each: the allowance, spent.
    expect(wrappedDistance(state.map, tileHex(getTileAt(state.map, from.col, from.row)!), tileHex(getTileAt(state.map, scout.col, scout.row)!))).toBe(allowance);
  });

  it('costs exactly what the same walk ordered by hand costs — no fifth pricer', () => {
    // The march's route, then the same route walked as ordinary move orders on
    // an identical board. If the ranging piece paid a different price for a hex
    // than a player's own order does, these two purses would part.
    const marched = flatState();
    const ranger = createUnit(marched, 0, 'scout', 5, 5);
    expect(applyCommand(marched, explore(ranger.id)).ok).toBe(true);
    const route: { col: number; row: number }[] = [];
    // The phase itself, so the walk under test is the one the resolution runs.
    marchExplorers(marched, { exploreEnded: [] }, (unit, path) => {
      const result = advanceAlongPath(marched, unit, path);
      for (let step = 0; step < result.steps; step += 1) route.push({ col: unit.col, row: unit.row });
      recomputeVisibility(marched, unit.ownerId);
      return result.steps;
    });
    expect(route.length).toBeGreaterThan(1);

    const ordered = flatState();
    const walker = createUnit(ordered, 0, 'scout', 5, 5);
    for (const cell of route) {
      expect(
        applyCommand(ordered, { type: 'moveUnit', playerId: 0, unitId: walker.id, target: cell }).ok,
      ).toBe(true);
    }
    expect({ col: walker.col, row: walker.row }).toEqual({ col: ranger.col, row: ranger.row });
    expect(walker.movesLeft).toBe(ranger.movesLeft);
  });

  it('stops without error when there is nothing left to see', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 5, 5);
    markAllExplored(state, 0);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    const before = { col: scout.col, row: scout.row, moves: scout.movesLeft };
    endAllTurns(state);
    // It never set out, and the allowance it did not spend is the honest stop.
    expect({ col: scout.col, row: scout.row }).toEqual({ col: before.col, row: before.row });
    expect('autoExplore' in scout).toBe(false);
  });

  it('reports the exhausted world once, however many legs it walked', () => {
    const state = flatState();
    // A pocket of grassland in the sea: the scout charts the whole of it inside
    // one turn's allowance and stands down mid-march, in that turn.
    state.map = createMap({ width: 24, height: 12, terrain: 'ocean' });
    resetVisibility(state);
    for (let col = 4; col <= 7; col += 1) {
      for (let row = 4; row <= 6; row += 1) getTileAt(state.map, col, row)!.terrain = 'grassland';
    }
    const scout = createUnit(state, 0, 'scout', 5, 5);
    expect(applyCommand(state, explore(scout.id)).ok).toBe(true);
    // However many legs and however many turns the charting takes, the world
    // runs out exactly once — the flag is deleted where the report is pushed,
    // and there is one such line.
    const ended: unknown[] = [];
    for (let turn = 0; turn < 12; turn += 1) {
      const result = endAllTurns(state);
      if (result.ok && result.exploreEnded) ended.push(...result.exploreEnded);
    }
    expect(ended).toEqual([{ unitId: scout.id, ownerId: 0 }]);
    expect('autoExplore' in scout).toBe(false);
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

  /**
   * **The outcome pin**, and the one the replay above cannot stand in for: a
   * replay proves the same code twice agrees with itself, not that *this* code
   * agrees with yesterday's.
   *
   * The march is the one standing order that re-decides where it is going
   * several times inside a single resolution, so it is the order most exposed
   * to a change made for speed — a search that skips a tile, a fog reading
   * taken one beat early, a candidate judged in a different order — and every
   * one of those moves the piece, which moves a ruin, a camp, a meeting and
   * each seeded roll after them. None of it shows in a unit test about one
   * scout.
   *
   * So: a generated world with every soldier and scout of both seats ranging
   * ahead, twenty resolutions deep, at two seeds, printed with `snapshotState`
   * and reduced to one number. The literals were taken on the head of
   * 2026-09-10 (schema 115). **They are evidence, not a baseline.** If one
   * moves, the change moved the game and it is the change that is wrong (hard
   * rule 2); only a ruling about how the march decides may edit them, and the
   * ruling lands in `docs/flags.md` first.
   *
   * **Re-taken once, batch L3c**, and the reason is written here because the
   * rule above says it must be: `Tile.mountainAdjacent` (a flag) became
   * `Tile.mountainsBeside` (a count), so the *serialised map* is shorter and the
   * number over it is different. Nothing on either board moved — the proof is
   * that the old literals are recovered exactly by rewriting every
   * `"mountainsBeside":<n>` back to `"mountainAdjacent":true` in the very
   * snapshot these were taken from. No piece, no ruin, no camp and no roll
   * changed hands; a derived field of the ground was renamed under them.
   */
  const RANGED_BOARDS: Record<number, string> = {
    11: '88b3d3d2:187374',
    2026: '149fe089:187671',
  };

  for (const seed of [11, 2026]) {
    it(`ranges twenty turns at seed ${seed} to the board it always ranged to`, () => {
      const game = createGame({
        seed,
        sizeName: 'duel',
        players: [
          { name: 'A', color: '#a00', isHuman: true },
          { name: 'B', color: '#00a', isHuman: true },
        ],
        barbarians: true,
      });
      for (const unit of [...game.state.units]) {
        if (unit.ownerId > 1) continue;
        const def = unitDef(unit.type);
        if (!isCombatant(def) && !isExplorer(def)) continue;
        dispatch(game, explore(unit.id, true, unit.ownerId));
      }
      for (let turn = 0; turn < 20; turn++) {
        for (const player of game.state.players) {
          dispatch(game, { type: 'endTurn', playerId: player.id });
        }
      }
      // The order really was given: a pin over a game where nothing ranged
      // would be green for the wrong reason.
      expect(game.log.some((command) => command.type === 'setAutoExplore')).toBe(true);
      expect(digest(snapshotState(game.state))).toBe(RANGED_BOARDS[seed]);
    });
  }
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
    bumpRevision(state);
    expect(exploreTarget(state, scout)).toEqual({ col: barrow.col, row: barrow.row });
  });
});
