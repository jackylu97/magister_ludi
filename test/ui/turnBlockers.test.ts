/**
 * The End Turn gate: what the local seat still owes the turn.
 *
 * `firstBlocker` was extracted from `src/ui/controls.ts` precisely so that this
 * file could exist — the camera pan, the selection and the button's label are
 * browser-only and are not covered here (as with every other UI pass, there is
 * no jsdom in this suite), but the *decision* is a fold over the state and is
 * covered exhaustively: each kind, the priority between them, every exclusion
 * the idle definition makes, and the three seats that are never blocked at all.
 */

import { describe, expect, it } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Unit,
  createUnit,
  newGame,
} from '../../src/sim/state';
import { availableTechs } from '../../src/sim/tech';
import { TECH_IDS } from '../../src/sim/techData';
import { unitAwaitsOrders } from '../../src/sim/units';
import { resetVisibility } from '../../src/sim/visibility';
import { firstBlocker } from '../../src/ui/turnBlockers';

/** A two-player state on a blank grassland rectangle, as `tech.test.ts` uses. */
function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
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

function plant(state: GameState, ownerId: number, col: number, row: number): City {
  return foundCityAt(state, ownerId, at(state.map, col, row));
}

/**
 * A state with nothing outstanding at all, which every test below starts from
 * and then breaks in exactly one way.
 *
 * "Nothing outstanding" is three separate facts, so all three are set: no units
 * on the board, no cities, and a research pool with an aim. A test that adds one
 * idle unit is then testing that unit and nothing else.
 */
function settled(): GameState {
  const state = flatState();
  const player = state.players[0]!;
  player.researching = availableTechs(state, 0)[0] ?? null;
  expect(player.researching).not.toBeNull();
  return state;
}

/** Puts a unit down and spends its whole allowance: present, but finished. */
function spentUnit(state: GameState, ownerId: number, col: number, row: number): Unit {
  const unit = createUnit(state, ownerId, 'warrior', col, row);
  unit.movesLeft = 0;
  return unit;
}

// ---------------------------------------------------------------------------

describe('unitAwaitsOrders', () => {
  it('calls a fresh unit with moves and no orders idle', () => {
    const state = flatState();
    expect(unitAwaitsOrders(createUnit(state, 0, 'warrior', 3, 3))).toBe(true);
  });

  it('does not call a spent unit idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.movesLeft = 0;
    expect(unitAwaitsOrders(unit)).toBe(false);
  });

  it('does not call a unit under a standing order idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.path = [{ col: 4, row: 3 }, { col: 5, row: 3 }];
    expect(unitAwaitsOrders(unit)).toBe(false);
  });

  it('does not call a fortified unit idle, however long it has been dug in', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.fortifiedTurns = 0;
    expect(unitAwaitsOrders(unit)).toBe(false);
    unit.fortifiedTurns = 5;
    expect(unitAwaitsOrders(unit)).toBe(false);
  });

  it('still calls a unit that attacked but can walk idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.hasAttacked = true;
    expect(unit.movesLeft).toBeGreaterThan(0);
    expect(unitAwaitsOrders(unit)).toBe(true);
  });

  it('does not call a unit that attacked and is out of movement idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.hasAttacked = true;
    unit.movesLeft = 0;
    expect(unitAwaitsOrders(unit)).toBe(false);
  });

  it('treats an emptied path as no order at all', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.path = [];
    expect(unitAwaitsOrders(unit)).toBe(true);
  });

  it('calls a worker with charges, movement and no orders idle', () => {
    // The unit this prompt exists for: a worker parked on farmable ground is a
    // wasted turn, and it falls out of the three clauses without a fourth. See
    // the module docblock in `sim/units.ts`.
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 3, 3);
    expect(worker.chargesLeft).toBe(3);
    expect(unitAwaitsOrders(worker)).toBe(true);
  });

  it('stops calling a worker idle once it has spent its turn building', () => {
    // Building spends the *whole* allowance (see `buildImprovementAt`), which is
    // exactly what makes the `movesLeft` clause enough on its own.
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 3, 3);
    worker.chargesLeft = 2;
    worker.movesLeft = 0;
    expect(unitAwaitsOrders(worker)).toBe(false);
  });

  it('does not call a routed trader resting at its destination idle, however much movement it has left', () => {
    // The bug this predicate exists to fix (2026-08-28): `marchTraders` aims the
    // caravan's next leg during resolution rather than the instant it arrives,
    // so a laden trader rests on the destination hex with a full allowance and
    // no stored `path` between legs. `Unit.trade` present is its standing
    // order, exactly as `fortifiedTurns` and `sleeping` are.
    const state = flatState();
    const unit = createUnit(state, 0, 'trader', 3, 3);
    unit.trade = { from: 1, to: 2, expiresTurn: 20, outbound: false, autoResend: true };
    expect(unit.movesLeft).toBeGreaterThan(0);
    expect(unit.path).toBeUndefined();
    expect(unitAwaitsOrders(unit)).toBe(false);
  });

  it('calls the same unit idle the instant it stops carrying a route', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'trader', 3, 3);
    unit.trade = { from: 1, to: 2, expiresTurn: 20, outbound: false, autoResend: true };
    delete unit.trade;
    expect(unitAwaitsOrders(unit)).toBe(true);
  });
});

describe('firstBlocker · idle units', () => {
  it('reports an idle unit by id', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: unit.id });
  });

  it('reports the first idle unit in state order, not merely any of them', () => {
    const state = settled();
    const first = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: first.id });
    // Give the first one orders and the next one steps up.
    first.movesLeft = 0;
    expect(firstBlocker(state, 0)).toEqual({
      kind: 'idleUnit',
      unitId: state.units[1]!.id,
    });
  });

  it('never blocks on somebody else’s idle unit', () => {
    const state = settled();
    createUnit(state, 1, 'warrior', 3, 3);
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('is silent when every unit is spent, marching or dug in', () => {
    const state = settled();
    spentUnit(state, 0, 3, 3);
    createUnit(state, 0, 'warrior', 4, 3).path = [{ col: 5, row: 3 }];
    createUnit(state, 0, 'warrior', 5, 4).fortifiedTurns = 2;
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('never blocks on a routed trader resting at its destination with full movement', () => {
    // The bug this suite exists to pin (2026-08-28, user report): a routed
    // caravan sits at its destination between legs with a full allowance and
    // no stored `path` — `marchTraders` aims the next leg during resolution —
    // and used to trip the idle-unit blocker every turn of its twenty-turn
    // route.
    const state = settled();
    const trader = createUnit(state, 0, 'trader', 3, 3);
    trader.trade = { from: 1, to: 2, expiresTurn: 20, outbound: false, autoResend: true };
    expect(trader.movesLeft).toBeGreaterThan(0);
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('blocks on that same trader the instant it stops carrying a route', () => {
    const state = settled();
    const trader = createUnit(state, 0, 'trader', 3, 3);
    trader.trade = { from: 1, to: 2, expiresTurn: 20, outbound: false, autoResend: true };
    delete trader.trade;
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: trader.id });
  });
});

describe('firstBlocker · production', () => {
  it('reports a city with an empty queue', () => {
    const state = settled();
    const city = plant(state, 0, 5, 5);
    expect(city.queue).toEqual([]);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'cityProduction', cityId: city.id });
  });

  it('is silent once the queue holds anything', () => {
    const state = settled();
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('reports the first empty queue in state order', () => {
    const state = settled();
    const first = plant(state, 0, 3, 3);
    plant(state, 0, 9, 8);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'cityProduction', cityId: first.id });
    first.queue = [{ kind: 'unit', id: 'warrior' }];
    expect(firstBlocker(state, 0)).toEqual({
      kind: 'cityProduction',
      cityId: state.cities[1]!.id,
    });
  });

  it('never blocks on a rival’s idle city', () => {
    const state = settled();
    plant(state, 1, 5, 5);
    expect(firstBlocker(state, 0)).toBeNull();
  });
});

describe('firstBlocker · research', () => {
  it('reports an unaimed science pool', () => {
    const state = settled();
    state.players[0]!.researching = null;
    expect(firstBlocker(state, 0)).toEqual({ kind: 'research' });
  });

  it('is silent when the tree is exhausted', () => {
    const state = settled();
    const player = state.players[0]!;
    player.researching = null;
    player.techsResearched = [...TECH_IDS];
    expect(availableTechs(state, 0)).toEqual([]);
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('is silent while a technology is being researched', () => {
    const state = settled();
    expect(firstBlocker(state, 0)).toBeNull();
  });
});

describe('firstBlocker · skipped units', () => {
  // The exclusion is the testable half of Skip Turn: `controls.ts` owns the
  // set and when it is cleared, but the fold that skips past it is this pure
  // function's, and it is covered exactly like every other clause here.
  it('does not report a skipped idle unit', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([unit.id]) })).toBeNull();
  });

  it('reports the next idle unit past a skipped one, in state order', () => {
    const state = settled();
    const skipped = createUnit(state, 0, 'warrior', 3, 3);
    const next = createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([skipped.id]) })).toEqual({
      kind: 'idleUnit',
      unitId: next.id,
    });
  });

  it('falls through to production once every idle unit is skipped', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    const city = plant(state, 0, 5, 5);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([unit.id]) })).toEqual({
      kind: 'cityProduction',
      cityId: city.id,
    });
  });

  it('does not excuse a unit the exclusion does not name', () => {
    const state = settled();
    const skipped = createUnit(state, 0, 'warrior', 3, 3);
    const other = createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([skipped.id, 999]) })).toEqual({
      kind: 'idleUnit',
      unitId: other.id,
    });
  });

  it('behaves exactly as the unexcluded call with no exclusions object at all', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0, {})).toEqual({ kind: 'idleUnit', unitId: unit.id });
  });
});

describe('firstBlocker · priority', () => {
  it('answers unit, then production, then research, in that order', () => {
    const state = settled();
    const player = state.players[0]!;
    player.researching = null;
    const city = plant(state, 0, 5, 5);
    const unit = createUnit(state, 0, 'warrior', 3, 3);

    // All three outstanding at once: the unit is the one that costs a turn of
    // movement, so it goes first.
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: unit.id });
    unit.movesLeft = 0;
    expect(firstBlocker(state, 0)).toEqual({ kind: 'cityProduction', cityId: city.id });
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    expect(firstBlocker(state, 0)).toEqual({ kind: 'research' });
    player.researching = availableTechs(state, 0)[0] ?? null;
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('walks the whole list rather than stopping at the first unit it sees', () => {
    // A spent unit ahead of an idle one in `state.units` must not hide it.
    const state = settled();
    spentUnit(state, 0, 3, 3);
    const idle = createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: idle.id });
  });
});

describe('firstBlocker · seats that are never blocked', () => {
  it('answers nothing for a player who does not exist', () => {
    const state = settled();
    createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 7)).toBeNull();
  });

  it('answers nothing for an eliminated player', () => {
    const state = settled();
    state.players[0]!.researching = null;
    state.players[0]!.eliminated = true;
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('answers nothing once the seat has ended its turn', () => {
    const state = settled();
    createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0)).not.toBeNull();
    state.turnEnded[0] = true;
    expect(firstBlocker(state, 0)).toBeNull();
    // ...and the seat that has not ended is still asked in earnest.
    createUnit(state, 1, 'warrior', 4, 3);
    expect(firstBlocker(state, 1)).not.toBeNull();
  });
});

describe('firstBlocker · Statecraft', () => {
  it('blocks on an unanswered Order draft, and stops the moment it is answered', () => {
    const state = settled();
    const player = state.players[0]!;
    player.statecraft.pendingOrder = { options: ['firstRites'] };
    expect(firstBlocker(state, 0)).toEqual({ kind: 'statecraft', what: 'order' });
    delete player.statecraft.pendingOrder;
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('blocks on a Doctrine draft, and says which of the two it is', () => {
    const state = settled();
    state.players[0]!.statecraft.pendingDoctrine = { options: ['riverKings'] };
    expect(firstBlocker(state, 0)).toEqual({ kind: 'statecraft', what: 'doctrine' });
  });

  it('does NOT block on a banked government offer', () => {
    // Entry XV makes adoption bankable on purpose — take it when your slots are
    // worth swapping — and a blocker on it would delete the only reason banking
    // exists. The top bar's badge is where an unclaimed triple is said instead.
    const state = settled();
    state.players[0]!.statecraft.pendingGovernment = {
      tier: 3,
      options: ['councilOfElders', 'warChief', 'priestKing'],
    };
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('yields to a claimed discovery, and outranks an idle unit', () => {
    // The cost-of-forgetting order: a discovery is a boon somebody walked across
    // the map for, a draft is a decision the empire owes, and an idle unit is a
    // turn of movement. All three at once surfaces them in that order.
    const state = settled();
    state.players[0]!.statecraft.pendingOrder = { options: ['firstRites'] };
    const idle = createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'statecraft', what: 'order' });

    state.players[0]!.pendingDiscovery = { kind: 'ruins', col: 2, row: 2, options: [] };
    expect(firstBlocker(state, 0)).toEqual({ kind: 'discovery' });

    delete state.players[0]!.pendingDiscovery;
    delete state.players[0]!.statecraft.pendingOrder;
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: idle.id });
  });

  it('never blocks the wild on a draft it could not answer', () => {
    const state = settled();
    state.players[1]!.barbarian = true;
    state.players[1]!.statecraft.pendingOrder = { options: ['firstRites'] };
    expect(firstBlocker(state, 1)).toBeNull();
  });
});

describe('firstBlocker · Religion', () => {
  it('blocks on an unanswered belief offer, and stops the moment it is answered', () => {
    const state = settled();
    const player = state.players[0]!;
    player.pantheon.pending = { options: ['sacredFire'] };
    expect(firstBlocker(state, 0)).toEqual({ kind: 'religion' });
    delete player.pantheon.pending;
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('sits behind a discovery and a draft, and ahead of an idle unit', () => {
    // The same cost-of-forgetting order one system over: a god does not go
    // stale while the other two are answered, and it still outranks a piece
    // that is merely standing about.
    const state = settled();
    const player = state.players[0]!;
    const idle = createUnit(state, 0, 'warrior', 3, 3);
    player.pantheon.pending = { options: ['sacredFire'] };
    expect(firstBlocker(state, 0)).toEqual({ kind: 'religion' });

    player.statecraft.pendingOrder = { options: ['firstRites'] };
    expect(firstBlocker(state, 0)).toEqual({ kind: 'statecraft', what: 'order' });
    delete player.statecraft.pendingOrder;

    delete player.pantheon.pending;
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: idle.id });
  });

  it('never blocks the wild on a god it could not name', () => {
    const state = settled();
    state.players[1]!.barbarian = true;
    state.players[1]!.pantheon.pending = { options: ['sacredFire'] };
    expect(firstBlocker(state, 1)).toBeNull();
  });
});

/**
 * There is exactly one predicate for "this unit needs orders" —
 * `unitAwaitsOrders` (`sim/units.ts`) — and every surface in `src/ui` asks it
 * rather than re-deriving `movesLeft > 0` and its siblings by hand. This is
 * the source-reading half of that claim, in the shape `seatRoster.test.ts`
 * uses for the same reason: the failure mode of a second hand-rolled idle test
 * is a surface that quietly disagrees with `unitAwaitsOrders` the day someone
 * adds a sixth exclusion, and no behavioural test catches *that* — only
 * reading the source does.
 */
describe('the idle-unit predicate', () => {
  const UI_SOURCE = import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  function code(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  it('is asked of unitAwaitsOrders everywhere in the interface, never re-derived', () => {
    // The shape a re-derivation would take, chaining `movesLeft` into a
    // boolean idle test the way the old `isIdleUnit` did — narrow on purpose,
    // so it does not trip over `moveModeNotice`'s ternary (`controls.ts`) or
    // the unit sheet's "spent" styling (`unit.movesLeft <= 0` with no `&&`,
    // `unitPanel.ts`), which read `movesLeft` for reasons that have nothing to
    // do with whether a unit blocks End Turn.
    const idleShaped = /\bmovesLeft\s*(?:<=|>)\s*0\s*&&/;
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(UI_SOURCE)) {
      const lines = code(source).split('\n');
      for (const [index, line] of lines.entries()) {
        if (idleShaped.test(line)) offenders.push(`${path}:${index + 1}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('is asked at all — controls.ts imports it from the sim', () => {
    // The other half of the claim, as `seatRoster.test.ts` argues: a grep with
    // nothing to find passes vacuously. `skipBlocker` is the one caller left
    // in `controls.ts` since `firstBlocker` moved the idle-unit cycle's own
    // read behind `unitAwaitsOrders` already.
    const key = Object.keys(UI_SOURCE).find((path) => path.endsWith('/controls.ts'));
    expect(key).toBeDefined();
    expect(UI_SOURCE[key!]).toContain('unitAwaitsOrders(');
  });
});
