/**
 * **The age stamp** (batch D2d, `docs/plans/decks-shape-audit.md` wave 2, "An age
 * stamp"). Three things in the world now remember the turn they were placed, and
 * what is pinned here is the whole of that fact — where each is written, where
 * each is cleared, and that nothing anywhere counts down.
 *
 * The discipline is this codebase's one rule about time, stated three ways
 * already (`TimedEffect.expiresTurn`, `SlottedOrder.sealedUntil`,
 * `City.purchasedUnitTurns`) and a fourth time here: **an absolute turn written
 * once and compared against `state.turn`**. So every claim below is a
 * subtraction, and the tests that matter most are the ones that show the number
 * on the state does not move when the world does.
 *
 * What is deliberately **not** here is a feature stamp. A wood nobody planted has
 * stood since the world was made, so there is no turn to write on it — the
 * maturity Expansionist's Woodland line prints is the planting system's word
 * (the audit's wave 3) and not this one's. `Tile.improvedOn`'s docblock says so.
 */

import { describe, expect, it } from 'vitest';

import { buildImprovementAt, pillageAt, removeImprovementAt } from '../../src/sim/improvements';
import {
  getTileAt,
  improvementAge,
  raiseImprovement,
  razeImprovement,
} from '../../src/sim/map';
import { realiseItem } from '../../src/sim/cities';
import { routeAge } from '../../src/sim/routes';
import { caravanTypeId } from '../../src/sim/unitData';
import { startRouteAt } from '../../src/sim/trade';
import {
  type City,
  type GameState,
  addBuilding,
  buildingAge,
  createUnit,
} from '../../src/sim/state';
import { tileConditionHolds } from '../../src/sim/statecraft';
import { found, game } from './statecraftHelpers';

/** A second town for the seat, far enough off to be a route's other end. */
function secondCity(state: GameState, first: City, dx: number): City {
  const tile = getTileAt(state.map, first.col + dx, first.row)!;
  // Through the ordinary founding seam would need a settler; this bench wants a
  // pair of towns and nothing else, so the register is written directly.
  const city: City = {
    ...structuredClone(first),
    id: 900 + dx,
    name: `Far ${dx}`,
    col: tile.col,
    row: tile.row,
    buildings: [],
    queue: [],
    workedTiles: [],
    lockedTiles: [],
  };
  delete city.buildingTurns;
  state.cities.push(city);
  return city;
}

describe('a building remembers the turn it joined its town', () => {
  it('stamps at the one seam, and reads as a subtraction', () => {
    const g = game();
    const city = found(g.state, 0);
    g.state.turn = 12;
    expect(addBuilding(g.state, city, 'granary')).toBe(true);
    expect(city.buildingTurns?.granary).toBe(12);
    expect(buildingAge(g.state, city, 'granary')).toBe(0);
    // **Nothing ticks.** The turn moves and the stamp does not; the age is the
    // difference and only the difference.
    g.state.turn = 40;
    expect(city.buildingTurns?.granary).toBe(12);
    expect(buildingAge(g.state, city, 'granary')).toBe(28);
  });

  it('leaves a shelf it already holds exactly as it was, stamp included', () => {
    const g = game();
    const city = found(g.state, 0);
    g.state.turn = 5;
    addBuilding(g.state, city, 'monument');
    g.state.turn = 60;
    // A second law that would have granted the same Monument does not make a
    // fifty-five-turn-old Monument new — the idempotence is the whole reason
    // `addBuilding` answers a boolean.
    expect(addBuilding(g.state, city, 'monument')).toBe(false);
    expect(buildingAge(g.state, city, 'monument')).toBe(55);
    expect(city.buildings.filter((id) => id === 'monument')).toHaveLength(1);
  });

  it('is written by a completion, and survives the town changing hands', () => {
    const g = game();
    const city = found(g.state, 0);
    g.state.turn = 9;
    realiseItem(g.state, city, { kind: 'building', id: 'granary' });
    expect(buildingAge(g.state, city, 'granary')).toBe(0);
    // **Pay follows the stones.** A conquest changes whose town it is, not when
    // the masons finished — the same reading `captured` keeps of the followers,
    // the consecration and the granary itself.
    g.state.turn = 30;
    city.ownerId = 1;
    city.captured = true;
    expect(buildingAge(g.state, city, 'granary')).toBe(21);
  });

  it('answers undefined for a shelf with no stamp, never zero', () => {
    const g = game();
    const city = found(g.state, 0);
    // A row pushed straight onto the list — an old fixture, a scenario — has no
    // date, and "cannot be shown to be old enough" is not "new".
    city.buildings.push('barracks');
    expect(buildingAge(g.state, city, 'barracks')).toBeUndefined();
    expect(buildingAge(g.state, city, 'library')).toBeUndefined();
  });
});

describe('a hex remembers the turn its work was raised', () => {
  it('is written by the spade and cleared by the axe', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    g.state.turn = 7;
    raiseImprovement(tile, 'farm', g.state.turn);
    expect(tile.improvedOn).toBe(7);
    g.state.turn = 27;
    expect(improvementAge(tile, g.state.turn)).toBe(20);
    // The stamp goes with the work it is a fact *about*: left behind, it would
    // be an age the next farm inherited.
    razeImprovement(tile);
    expect(tile.improvement).toBeUndefined();
    expect(tile.improvedOn).toBeUndefined();
    expect(improvementAge(tile, g.state.turn)).toBeUndefined();
  });

  it('starts again when the ground is worked over', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    g.state.turn = 3;
    raiseImprovement(tile, 'farm', g.state.turn);
    g.state.turn = 50;
    razeImprovement(tile);
    raiseImprovement(tile, 'farm', g.state.turn);
    // A farm torn up and rebuilt is a new farm, which is the reading a player
    // can act on by tearing it up.
    expect(improvementAge(tile, g.state.turn)).toBe(0);
  });

  it('is written by the worker, the great person and the prophet, and cleared by a pillage', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    tile.terrain = 'grassland';
    tile.hills = false;
    tile.feature = 'none';
    g.state.turn = 15;
    const worker = createUnit(g.state, 0, 'worker', tile.col, tile.row);
    buildImprovementAt(g.state, worker, tile, 'farm');
    expect(tile.improvedOn).toBe(15);

    // The raider takes the age with the works — `pillageAt` clears the pair for
    // `roadFree`'s stated reason.
    g.state.turn = 22;
    const raider = createUnit(g.state, 1, 'warrior', tile.col, tile.row);
    pillageAt(g.state, raider, tile);
    expect(tile.improvement).toBeUndefined();
    expect(tile.improvedOn).toBeUndefined();

    // And so does the spade used the other way round.
    g.state.turn = 30;
    raiseImprovement(tile, 'mine', g.state.turn);
    const hand = createUnit(g.state, 0, 'worker', tile.col, tile.row);
    removeImprovementAt(g.state, hand, tile);
    expect(tile.improvedOn).toBeUndefined();
  });

  it('answers no to a condition asked with no clock at all', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    raiseImprovement(tile, 'academy', 0);
    const on = { test: 'standingSince', turns: 20 } as const;
    // `yields`' and `beside`'s bargain, read on a date: a caller that cannot say
    // what turn it is is promised nothing.
    expect(tileConditionHolds(tile, on)).toBe(false);
    expect(tileConditionHolds(tile, on, undefined, undefined, 19)).toBe(false);
    expect(tileConditionHolds(tile, on, undefined, undefined, 20)).toBe(true);
    // Bare ground is no older than the works standing on it, which is none.
    razeImprovement(tile);
    expect(tileConditionHolds(tile, on, undefined, undefined, 500)).toBe(false);
  });
});

describe('a route remembers the turn it opened', () => {
  it('is stamped where a route comes into existence, and a renewal is not a new route', () => {
    const g = game();
    const city = found(g.state, 0);
    const far = secondCity(g.state, city, 3);
    g.state.turn = 4;
    const cart = createUnit(g.state, 0, caravanTypeId()!, city.col, city.row);
    startRouteAt(g.state, cart, city, far, 'land');
    const route = cart.trade!;
    expect(route.startedTurn).toBe(4);
    expect(routeAge(g.state, route)).toBe(0);

    // **An auto-resend rewrites the expiry on this very object**, which is what
    // makes a road kept up across renewals one road with one start date.
    g.state.turn = 34;
    route.autoResend = true;
    route.expiresTurn = g.state.turn + 20;
    expect(route.startedTurn).toBe(4);
    expect(routeAge(g.state, route)).toBe(30);
  });

  it('answers undefined for a route with no start date, never zero', () => {
    const g = game();
    expect(routeAge(g.state, { from: 0, to: 1, expiresTurn: 9, outbound: true, autoResend: false }))
      .toBeUndefined();
  });
});
