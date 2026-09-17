import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { arriveOnTile } from '../../src/sim/arrival';
import { applyCommand } from '../../src/sim/commands';
import { advanceAlongPath } from '../../src/sim/movement';
import {
  canStopOn,
  canTransit,
  findPath,
  moveProfile,
  stepCost,
  transitField,
  zocField,
} from '../../src/sim/pathfind';
import {
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  unitById,
} from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { hasStackingRoom } from '../../src/sim/units';
import { at, bareState } from './improvementHelpers';

/**
 * **A trader is a marker on the ground, not a piece in the way**
 * (`docs/flags.md` (kkkkkk), the user, 2026-09-17: *"there can be as many
 * traders on a single tile as needed, they don't count towards tile unit
 * limits… units can step on other player's traders regardless of war status…
 * think of the trader unit as just a placeholder position for pillaging, but
 * otherwise does not interact with units"*).
 *
 * Three claims, and they fail for different reasons, so they are kept apart:
 *
 *   1. **A caravan stands in nobody's way, and nobody stands in its.** One
 *      predicate answers both directions (`stacksFreely`), read by `pieceBits`
 *      going out and by `canStopOn`'s stranger clause coming in — so the
 *      hoisted field and the one-hex walk cannot drift, and the highlight, the
 *      path and the reducer are one answer.
 *   2. **The war moved.** It used to be held for free by `canStopOn` refusing a
 *      peaceful hex; the guard that holds it now lives at the head of
 *      `arriveOnTile`'s loop and covers the plunder and the capture together.
 *      A peaceful neighbour walking over a cart takes neither the cargo nor the
 *      merchant.
 *   3. **Nothing else about a caravan changed.** It is still a civilian, still
 *      exerts no zone of control (it never did — `zocField` is armed pieces
 *      only), and a replayed log is still byte-identical.
 */

/** A blank board; `bareState` opens a war between seats 0 and 1. */
function world(): GameState {
  const state = bareState(14, 9);
  bumpRevision(state);
  return state;
}

/** The same board with the war struck out — two empires that have met, at peace. */
function peaceful(): GameState {
  const state = world();
  state.wars = [];
  return state;
}

function trader(state: GameState, ownerId: number, col: number, row: number): Unit {
  return createUnit(state, ownerId, 'trader', col, row);
}

/**
 * A caravan actually carrying a route, which is what makes it *laden* — the
 * distinction the plunder clause turns on. Built through the verb rather than by
 * writing `Unit.trade` by hand, because presence **is** the route and a hand
 * that wrote one would be inventing a shape the reducer never makes.
 */
function laden(state: GameState): Unit {
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const partner = foundCityAt(state, 0, at(state, 10, 4));
  home.buildings.push('market');
  bumpRevision(state);
  const cart = trader(state, 0, 3, 4);
  const sent = applyCommand(state, {
    type: 'startRoute',
    playerId: 0,
    unitId: cart.id,
    fromCityId: home.id,
    toCityId: partner.id,
  });
  expect(sent.ok).toBe(true);
  expect(cart.trade).toBeDefined();
  cart.col = 6;
  cart.row = 4;
  return cart;
}

describe('a caravan stands in nobody’s way', () => {
  /**
   * The bug the ruling was written for. An international route's goal is the
   * partner's doorstep, and a caravan is exactly the piece that stands on a
   * trade partner's gate — so before this, one rival cart parked there denied
   * the path and the route died of it.
   */
  it('never denies a path, at peace or at war', () => {
    for (const state of [peaceful(), world()]) {
      trader(state, 1, 8, 4);
      const mover = createUnit(state, 0, 'warrior', 5, 4);
      const goal = at(state, 8, 4);
      expect(canTransit(state, mover, goal)).toBe(true);
      expect(canStopOn(state, mover, goal)).toBe(true);
      const path = findPath(state, mover, goal);
      expect(path).not.toBeNull();
      expect(path![path!.length - 1]).toEqual({ col: 8, row: 4 });
    }
  });

  /** Any mover, including another empire's caravan — and one of one's own. */
  it('lets a mover of any kind come to rest on it', () => {
    for (const state of [peaceful(), world()]) {
      trader(state, 1, 8, 4);
      const goal = at(state, 8, 4);
      for (const type of ['warrior', 'worker', 'settler', 'trader'] as const) {
        const mover = createUnit(state, 0, type, 7, 4);
        expect(canStopOn(state, mover, goal), `${type}`).toBe(true);
      }
    }
  });

  /**
   * The hoisted field and the fallback walk are one reading (`pieceBits` is
   * written once and read by both), so a search that hoisted a field and a verb
   * that did not cannot disagree about a hex.
   */
  it('reads the same hoisted as it does walked', () => {
    const state = peaceful();
    trader(state, 1, 8, 4);
    const mover = createUnit(state, 0, 'warrior', 5, 4);
    const ground = transitField(state, 0);
    const goal = at(state, 8, 4);
    expect(canStopOn(state, mover, goal, moveProfile(state, mover), ground)).toBe(true);
    expect(canStopOn(state, mover, goal)).toBe(true);
    // And the field is empty where the cart is standing, which is the whole of
    // the change: a caravan sets no bit at all.
    expect(ground.blocked[goal.row * state.map.width + goal.col]).toBe(0);
  });

  /** A hex of nothing but carts, and a soldier on top of it. */
  it('lets six caravans and a soldier share a hex', () => {
    const state = world();
    for (let i = 0; i < 6; i += 1) trader(state, 0, 8, 4);
    const goal = at(state, 8, 4);
    expect(hasStackingRoom(state, 8, 4, 'trader')).toBe(true);
    const soldier = createUnit(state, 0, 'warrior', 7, 4);
    expect(canStopOn(state, soldier, goal)).toBe(true);
    // A seventh cart still fits, and so does a rival's.
    const theirs = trader(state, 1, 7, 4);
    expect(canStopOn(state, theirs, goal)).toBe(true);
  });

  /**
   * The other direction: a cart may come to rest among a neighbour's pieces.
   * "Players at peace can just have overlap" is the user's own sentence, and a
   * marker that could be fenced out of a hex would be a piece again.
   */
  it('lets a caravan stop on a hex holding foreign pieces at peace', () => {
    const state = peaceful();
    createUnit(state, 1, 'warrior', 8, 4);
    createUnit(state, 1, 'worker', 8, 4);
    const cart = trader(state, 0, 7, 4);
    expect(canStopOn(state, cart, at(state, 8, 4))).toBe(true);
    // War is still war: an enemy soldier is a wall to a caravan exactly as it
    // is to everybody else, and that refusal is `canTransit`'s, not this one's.
    const fighting = world();
    createUnit(fighting, 1, 'warrior', 8, 4);
    const theirs = trader(fighting, 0, 7, 4);
    expect(canTransit(fighting, theirs, at(fighting, 8, 4))).toBe(false);
    expect(canStopOn(fighting, theirs, at(fighting, 8, 4))).toBe(false);
  });

  /**
   * It exerts no zone of control — and never did. `zocField` has always swept
   * armed pieces alone (`isCombatant`), and a caravan is a civilian, so the
   * ruling's second clause needed no code at all. Pinned so that stays true.
   */
  it('exerts no zone of control and pays no toll for standing beside one', () => {
    const state = world();
    trader(state, 1, 8, 4);
    expect(zocField(state, 0).sources).toHaveLength(0);
    const mover = createUnit(state, 0, 'warrior', 7, 4);
    const plain = stepCost(
      state.map,
      at(state, 7, 4),
      at(state, 8, 3),
      moveProfile(state, mover),
      zocField(state, 0),
    );
    expect(plain!.zoc).toBe(false);
    // …and the piece that does exert one is the soldier beside it, so the
    // field is measuring what it always measured.
    createUnit(state, 1, 'warrior', 8, 3);
    expect(zocField(state, 0).sources).toHaveLength(1);
  });
});

describe('the war check that moved into the arrival', () => {
  /**
   * **A soldier may stop on a foreign cart's hex at peace, and the caravan is
   * untouched.** This is the pin the guard exists for: `canStopOn` used to hold
   * the war for the taking below, and it does not any more.
   */
  it('takes neither the cargo nor the merchant at peace', () => {
    const state = peaceful();
    const cart = laden(state);
    const scout = createUnit(state, 1, 'warrior', 6, 3);
    const hex = at(state, 6, 4);
    expect(canStopOn(state, scout, hex)).toBe(true);

    const report = arriveOnTile(state, scout, hex);
    expect(report.plundered).toEqual([]);
    expect(report.captured).toEqual([]);
    expect(unitById(state, cart.id)?.ownerId).toBe(0);
    expect(unitById(state, cart.id)?.trade).toBeDefined();
  });

  /** The same of an *unladen* cart, which is the branch that would capture it. */
  it('does not capture an idle caravan at peace either', () => {
    const state = peaceful();
    const idle = trader(state, 0, 6, 4);
    const scout = createUnit(state, 1, 'warrior', 6, 3);
    const report = arriveOnTile(state, scout, at(state, 6, 4));
    expect(report.captured).toEqual([]);
    expect(unitById(state, idle.id)?.ownerId).toBe(0);
  });

  /** And at war the blow lands exactly as it always did. */
  it('plunders a laden cart at war and captures an idle one', () => {
    const state = world();
    const cart = laden(state);
    foundCityAt(state, 1, at(state, 6, 7));
    const raider = createUnit(state, 1, 'warrior', 6, 3);
    const report = arriveOnTile(state, raider, at(state, 6, 4));
    expect(report.plundered).toHaveLength(1);
    expect(report.plundered[0]!.fromOwnerId).toBe(0);
    expect(unitById(state, cart.id)).toBeUndefined();

    const idleWorld = world();
    const idle = trader(idleWorld, 0, 6, 4);
    const other = createUnit(idleWorld, 1, 'warrior', 6, 3);
    const taken = arriveOnTile(idleWorld, other, at(idleWorld, 6, 4));
    expect(taken.captured.map((piece) => piece.id)).toEqual([idle.id]);
    expect(unitById(idleWorld, idle.id)?.ownerId).toBe(1);
  });

  /** A worker is a worker: the guard changed nothing for anybody else. */
  it('still hands over an ordinary civilian at war and never at peace', () => {
    const fighting = world();
    const worker = createUnit(fighting, 0, 'worker', 6, 4);
    const raider = createUnit(fighting, 1, 'warrior', 6, 3);
    expect(arriveOnTile(fighting, raider, at(fighting, 6, 4)).captured).toHaveLength(1);
    expect(unitById(fighting, worker.id)?.ownerId).toBe(1);

    const calm = peaceful();
    const theirs = createUnit(calm, 0, 'worker', 6, 4);
    const passerby = createUnit(calm, 1, 'warrior', 6, 3);
    // The board refuses the rest in the first place, and the guard refuses the
    // taking even when something puts a piece there anyway.
    expect(canStopOn(calm, passerby, at(calm, 6, 4))).toBe(false);
    expect(arriveOnTile(calm, passerby, at(calm, 6, 4)).captured).toEqual([]);
    expect(unitById(calm, theirs.id)?.ownerId).toBe(0);
  });

  /**
   * **The wild takes what it always took.** `atWar` answers true for a
   * barbarian without reading the register, which is what keeps the new guard a
   * single clause with no special case in it.
   */
  it('lets the wild plunder without a war row', () => {
    const state = world();
    const cart = laden(state);
    state.wars = [];
    state.players[1]!.barbarian = true;
    const raider = createUnit(state, 1, 'warrior', 6, 3);
    expect(arriveOnTile(state, raider, at(state, 6, 4)).plundered).toHaveLength(1);
    expect(unitById(state, cart.id)).toBeUndefined();
  });

  /**
   * A march over a rival's cart at peace is an ordinary walk: the hex is paid
   * for out of `stepCost` like any other, the piece comes to rest, and nothing
   * on the board changed but the mover's position. Determinism is sacred, so
   * the whole state is compared rather than the parts a reader thought to look
   * at.
   */
  it('replays a walk over a peaceful cart byte-identically', () => {
    const walked = (): GameState => {
      const state = peaceful();
      trader(state, 1, 8, 4);
      const mover = createUnit(state, 0, 'warrior', 7, 4);
      const path = findPath(state, mover, at(state, 8, 4))!;
      expect(path).not.toBeNull();
      advanceAlongPath(state, mover, path);
      expect(mover.col).toBe(8);
      return state;
    };
    expect(JSON.stringify(walked())).toBe(JSON.stringify(walked()));
    const after = walked();
    // The cart is still standing, still its owner's, and still a civilian —
    // nothing about walking over a marker touches it.
    const cart = after.units.find((piece) => piece.ownerId === 1)!;
    expect(cart.col).toBe(8);
    expect(unitDef(cart.type).category).toBe('trader');
  });
});
