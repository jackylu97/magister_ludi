/**
 * War & diplomacy, phase one (`docs/war-diplomacy.md`, ruled 2026-09-03).
 *
 * The system's own file, and it holds the half every other bench in this suite
 * now takes for granted: `test/sim/warHelpers.ts` opens a war in the fixtures
 * so that a combat test is about combat, and *this* file is where the war
 * itself is the subject — the verb, its five refusals, the truce, and the four
 * legalities a declaration reverses.
 *
 * The four reversals, and each has a pair of tests
 * ------------------------------------------------
 * Combat, pillage and border entry are all *illegal at peace and legal at war*
 * (schema 56), which is the one big reversal from before this pass. Each is
 * asserted both ways round, because a gate that refuses everything passes the
 * "it refuses" half on its own. The wild is asserted alongside every one of
 * them: a barbarian has no row in the register and `atWar` answers *true* for
 * it without looking, so the whole mechanism has to be invisible to a game that
 * has never declared anything.
 */

import { describe, expect, it } from 'vitest';

import { applyCombat, previewCombat } from '../../src/sim/combat';
import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt, tileOwnerPlayerId } from '../../src/sim/cities';
import {
  annexCityError,
  declareWarError,
  proposePeaceError,
  razeCityError,
  withdrawPeaceError,
} from '../../src/sim/diplomacy';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { pillageError } from '../../src/sim/improvements';
import { canStopOn, canTransit, findPath, reachableTiles } from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  SCHEMA_VERSION,
  createUnit,
  newGame,
} from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { atWar, closeWar, hasPeaceOffer, openWar, truceBetween, truceTurnsLeft, warBetween } from '../../src/sim/wars';
import { resetVisibility } from '../../src/sim/visibility';

const WAR = RULES.war;

/**
 * A blank state on flat grassland, **at peace** — which is the whole point of
 * this file's own bench and the reason it does not reach for
 * `warHelpers.openEveryWar` the way every other one does.
 */
function flatState(width = 16, height = 10, seats = 2, wild = false): GameState {
  const colors = ['#a00', '#00a', '#0a0'];
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    ...(wild ? { barbarians: true } : {}),
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: String.fromCharCode(65 + index),
      color: colors[index]!,
      isHuman: true,
    })),
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function attack(unitId: number, col: number, row: number, playerId = 0): Command {
  return { type: 'attack', playerId, unitId, target: { col, row } };
}

/** Hands every hex in a rectangle to this city, so a border is a real border. */
function claimBlock(state: GameState, city: City, cols: number[], rows: number[]): void {
  for (const col of cols) {
    for (const row of rows) {
      state.tileOwner[tileIndex(state.map, col, row)] = city.id;
    }
  }
}

/** The wild's seat id in a world that has one. */
function wildId(state: GameState): number {
  const wild = state.players.find((player) => player.barbarian === true);
  if (!wild) throw new Error('no wild seat');
  return wild.id;
}

// --- 1. the register --------------------------------------------------------

describe('the war register', () => {
  it('is one row per pair, keyed low id first, and reads from either side', () => {
    const state = flatState();
    openWar(state, 1, 0);
    expect(state.wars).toHaveLength(1);
    expect(state.wars[0]!.a).toBe(0);
    expect(state.wars[0]!.b).toBe(1);
    expect(atWar(state, 0, 1)).toBe(true);
    expect(atWar(state, 1, 0)).toBe(true);
    expect(warBetween(state, 1, 0)).toBe(warBetween(state, 0, 1));
  });

  it('never puts anybody at war with themselves', () => {
    const state = flatState();
    openWar(state, 0, 1);
    expect(atWar(state, 0, 0)).toBe(false);
  });

  it('answers true for the wild without a row, on either side', () => {
    const state = flatState(16, 10, 2, true);
    const wild = wildId(state);
    expect(state.wars).toHaveLength(0);
    expect(atWar(state, 0, wild)).toBe(true);
    expect(atWar(state, wild, 0)).toBe(true);
    // And declaring on it is refused, so no row can ever name it.
    expect(declareWarError(state, 0, wild)).not.toBeNull();
    expect(declareWarError(state, wild, 0)).not.toBeNull();
  });

  it('leaves a world that has never declared anything with two empty registers', () => {
    const state = flatState();
    expect(state.wars).toEqual([]);
    expect(state.truces).toEqual([]);
    // Presence is the state on both, so this serialises exactly as it reads.
    const round = JSON.parse(JSON.stringify(state)) as GameState;
    expect(round.wars).toEqual([]);
    expect(round.truces).toEqual([]);
  });
});

// --- 2. declaring -----------------------------------------------------------

describe('declareWar', () => {
  it('opens the war and reports it to everybody', () => {
    const state = flatState();
    const result = applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 });
    expect(result.ok).toBe(true);
    expect(result.ok && result.warDeclared).toEqual({ byId: 0, onId: 1, turn: state.turn });
    expect(atWar(state, 0, 1)).toBe(true);
    expect(state.wars[0]!.declaredTurn).toBe(state.turn);
  });

  it('refuses yourself, the wild, a second declaration and an empire that is gone', () => {
    const state = flatState(16, 10, 3, true);
    expect(declareWarError(state, 0, 0)).toBe('You cannot declare war on yourself');
    expect(declareWarError(state, 0, wildId(state))).toContain('wild');
    openWar(state, 0, 1);
    expect(declareWarError(state, 0, 1)).toContain('already at war');
    state.players[2]!.eliminated = true;
    expect(declareWarError(state, 0, 2)).toContain('are gone');
  });

  it('refuses a declaration through a truce, and says how long the peace holds', () => {
    const state = flatState();
    openWar(state, 0, 1);
    closeWar(state, 0, 1);
    expect(atWar(state, 0, 1)).toBe(false);
    expect(truceTurnsLeft(state, 0, 1)).toBe(WAR.truceTurns);
    const refusal = declareWarError(state, 0, 1);
    expect(refusal).toContain('holds');
    expect(refusal).toContain(String(WAR.truceTurns));
    expect(applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(false);

    // And the moment it runs out, the verb is offered again. Nothing counted
    // down: the turn simply moved past an absolute expiry.
    state.turn += WAR.truceTurns;
    expect(truceTurnsLeft(state, 0, 1)).toBe(0);
    expect(truceBetween(state, 0, 1)).toBeNull();
    expect(declareWarError(state, 0, 1)).toBeNull();
  });

  it('leaves the state byte-identical when it refuses', () => {
    const state = flatState();
    openWar(state, 0, 1);
    const before = JSON.stringify(state);
    expect(applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('lets a seat declare and strike in the same turn — the surprise war', () => {
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);

    // Before the declaration: refused, and the sentence names the empire.
    const denied = applyCommand(state, attack(mine.id, 5, 4));
    expect(denied.ok).toBe(false);
    expect(denied.ok === false && denied.error).toBe('You are not at war with the B');

    expect(applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);
    // Same turn, same piece, no window of any kind: two commands in one log.
    expect(applyCommand(state, attack(mine.id, 5, 4)).ok).toBe(true);
  });
});

// --- 3. the one big reversal ------------------------------------------------

describe('combat is illegal at peace', () => {
  it('refuses a blow on another empire and allows the same blow at war', () => {
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    const preview = previewCombat(state, mine.id, { col: 5, row: 4 });
    expect(preview.ok).toBe(false);
    expect(preview.ok === false && preview.error).toContain('not at war');

    openWar(state, 0, 1);
    expect(previewCombat(state, mine.id, { col: 5, row: 4 }).ok).toBe(true);
    expect(applyCombat(state, mine.id, { col: 5, row: 4 }).ok).toBe(true);
  });

  it('refuses a blow on another empire’s city and allows it at war', () => {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 6, 4));
    const mine = createUnit(state, 0, 'warrior', 5, 4);
    expect(previewCombat(state, mine.id, { col: city.col, row: city.row }).ok).toBe(false);
    openWar(state, 0, 1);
    expect(previewCombat(state, mine.id, { col: city.col, row: city.row }).ok).toBe(true);
  });

  it('leaves the wild exactly as it was, on both sides of the blow', () => {
    const state = flatState(16, 10, 2, true);
    const wild = wildId(state);
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    const raider = createUnit(state, wild, 'warrior', 5, 4);
    // No war anywhere in the register, and both blows are legal.
    expect(state.wars).toHaveLength(0);
    expect(previewCombat(state, mine.id, { col: 5, row: 4 }).ok).toBe(true);
    expect(previewCombat(state, raider.id, { col: 4, row: 4 }).ok).toBe(true);
  });

  it('refuses the preview, so the board’s attackable tint cannot lie', () => {
    // One evaluator (`planCombat`) answers the reducer, the forecast card and
    // the tile tint, which is why the tint needs no clause of its own.
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    expect(previewCombat(state, mine.id, { col: 5, row: 4 }).ok).toBe(false);
    expect(applyCombat(state, mine.id, { col: 5, row: 4 }).ok).toBe(false);
  });
});

describe('pillage is illegal at peace', () => {
  function raidBench(): { state: GameState; raider: number; tile: Tile } {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const tile = at(state.map, 7, 4);
    state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
    tile.improvement = 'farm';
    const raider = createUnit(state, 0, 'warrior', tile.col, tile.row);
    return { state, raider: raider.id, tile };
  }

  it('refuses a raid on another empire’s ground and allows it at war', () => {
    const { state, raider } = raidBench();
    expect(pillageError(state, raider)).toBe('You are not at war with the B');
    openWar(state, 0, 1);
    expect(pillageError(state, raider)).toBeNull();
    expect(applyCommand(state, { type: 'pillage', playerId: 0, unitId: raider }).ok).toBe(true);
  });

  it('leaves nobody’s ground pillageable by anybody, war or no war', () => {
    const state = flatState();
    const tile = at(state.map, 3, 3);
    tile.improvement = 'farm';
    const raider = createUnit(state, 0, 'warrior', 3, 3);
    expect(tileOwnerPlayerId(state, 3, 3)).toBeNull();
    expect(pillageError(state, raider.id)).toBeNull();
  });

  it('leaves the wild’s own torch alight', () => {
    const state = flatState(16, 10, 2, true);
    const city = foundCityAt(state, 0, at(state.map, 8, 4));
    const tile = at(state.map, 7, 4);
    state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
    tile.improvement = 'farm';
    const raider = createUnit(state, wildId(state), 'warrior', tile.col, tile.row);
    expect(state.wars).toHaveLength(0);
    expect(pillageError(state, raider.id)).toBeNull();
  });
});

describe('plunder follows the blow', () => {
  it('cannot reach a caravan at peace, and takes it at war', () => {
    const state = flatState();
    const home = foundCityAt(state, 0, at(state.map, 3, 4));
    const theirs = foundCityAt(state, 1, at(state.map, 9, 4));
    const other = foundCityAt(state, 1, at(state.map, 12, 4));
    const caravan = createUnit(state, 1, 'trader', 6, 4);
    caravan.trade = {
      from: theirs.id,
      to: other.id,
      expiresTurn: state.turn + 10,
      outbound: true,
      autoResend: false,
    };
    const mine = createUnit(state, 0, 'warrior', 5, 4);
    expect(home.ownerId).toBe(0);

    // A laden caravan is a *civilian*: the only way to reach it is a blow, and
    // at peace there is no blow — so the plunder path is closed by the combat
    // clause and needs no clause of its own.
    expect(previewCombat(state, mine.id, { col: 6, row: 4 }).ok).toBe(false);

    openWar(state, 0, 1);
    const result = applyCombat(state, mine.id, { col: 6, row: 4 });
    expect(result.ok).toBe(true);
    expect(state.units.some((unit) => unit.id === caravan.id)).toBe(false);
  });
});

// --- 4. borders -------------------------------------------------------------

describe('borders at peace', () => {
  function borderBench(): { state: GameState; city: City } {
    const state = flatState(16, 10);
    const city = foundCityAt(state, 1, at(state.map, 10, 4));
    claimBlock(state, city, [8, 9, 10, 11], [3, 4, 5]);
    return { state, city };
  }

  it('turns a soldier back at the border and lets it in once war is declared', () => {
    const { state } = borderBench();
    const soldier = createUnit(state, 0, 'warrior', 7, 4);
    const fields = at(state.map, 8, 4);
    expect(canTransit(state, soldier, fields)).toBe(false);
    expect(canStopOn(state, soldier, fields)).toBe(false);
    const refused = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: soldier.id,
      target: { col: 8, row: 4 },
    });
    expect(refused.ok).toBe(false);
    // A rule, said as one: a coordinate reads like a pathing failure, and this
    // is something a player is meant to learn.
    expect(refused.ok === false && refused.error).toBe(
      'You are not at war with the B — their land is closed to your armies',
    );

    openWar(state, 0, 1);
    expect(canTransit(state, soldier, fields)).toBe(true);
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: soldier.id,
        target: { col: 8, row: 4 },
      }).ok,
    ).toBe(true);
  });

  it('lets a civilian and a caravan pass freely, war or no war', () => {
    const { state } = borderBench();
    const worker = createUnit(state, 0, 'worker', 7, 4);
    const settler = createUnit(state, 0, 'settler', 7, 5);
    const caravan = createUnit(state, 0, 'trader', 7, 3);
    for (const piece of [worker, settler, caravan]) {
      const target = at(state.map, 8, piece.row);
      expect(canTransit(state, piece, target)).toBe(true);
    }
  });

  it('keeps the highlight and the path honest — no route through closed ground', () => {
    // The one thing a parallel gate would have broken: `canTransit` is the seam,
    // so the four readers of `stepCost` inherit the rule and a highlight cannot
    // promise a march the walk will not deliver.
    const { state } = borderBench();
    const soldier = createUnit(state, 0, 'warrior', 7, 4);
    const inside = (list: { tile: Tile }[]): boolean =>
      list.some((entry) => entry.tile.col === 8 && entry.tile.row === 4);

    expect(inside(reachableTiles(state, soldier))).toBe(false);
    expect(findPath(state, soldier, at(state.map, 9, 4))).toBeNull();

    openWar(state, 0, 1);
    expect(inside(reachableTiles(state, soldier))).toBe(true);
    expect(findPath(state, soldier, at(state.map, 9, 4))).not.toBeNull();
  });

  it('bars nobody in a world with no borders drawn, which is every opening turn', () => {
    const state = flatState();
    const soldier = createUnit(state, 0, 'warrior', 4, 4);
    expect(canTransit(state, soldier, at(state.map, 5, 4))).toBe(true);
  });

  it('lets the wild walk anywhere', () => {
    const state = flatState(16, 10, 2, true);
    const city = foundCityAt(state, 0, at(state.map, 10, 4));
    claimBlock(state, city, [9, 10, 11], [3, 4, 5]);
    const raider = createUnit(state, wildId(state), 'warrior', 8, 4);
    expect(canTransit(state, raider, at(state.map, 9, 4))).toBe(true);
  });
});

// --- 5. peace ---------------------------------------------------------------

describe('the white peace', () => {
  function warBench(): GameState {
    const state = flatState();
    openWar(state, 0, 1);
    return state;
  }

  it('is a standing offer that resolves nothing on its own', () => {
    const state = warBench();
    expect(applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 }).ok).toBe(true);
    expect(hasPeaceOffer(state, 0, 1)).toBe(true);
    expect(hasPeaceOffer(state, 1, 0)).toBe(false);
    // Nothing has happened: one side wanting peace is not peace.
    expect(atWar(state, 0, 1)).toBe(true);
    const report = runEndOfTurn(state);
    expect(report.peaces).toEqual([]);
    expect(atWar(state, 0, 1)).toBe(true);
  });

  it('resolves in the pipeline when both offers stand, and buys the truce', () => {
    const state = warBench();
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const turn = state.turn;
    const report = runEndOfTurn(state);
    expect(report.peaces).toHaveLength(1);
    expect(report.peaces[0]!.peace).toEqual({
      a: 0,
      b: 1,
      truceUntilTurn: turn + WAR.truceTurns,
    });
    expect(atWar(state, 0, 1)).toBe(false);
    expect(truceTurnsLeft(state, 0, 1)).toBe(WAR.truceTurns);
  });

  it('can be withdrawn, and then nothing resolves', () => {
    const state = warBench();
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    expect(applyCommand(state, { type: 'withdrawPeace', playerId: 0, targetId: 1 }).ok).toBe(true);
    expect(hasPeaceOffer(state, 0, 1)).toBe(false);
    runEndOfTurn(state);
    expect(atWar(state, 0, 1)).toBe(true);
  });

  it('refuses an offer with no war behind it, a second offer, and a withdrawal of nothing', () => {
    const state = flatState();
    expect(proposePeaceError(state, 0, 1)).toContain('not at war');
    expect(withdrawPeaceError(state, 0, 1)).toContain('not at war');
    openWar(state, 0, 1);
    expect(proposePeaceError(state, 0, 1)).toBeNull();
    expect(withdrawPeaceError(state, 0, 1)).toContain('nothing to withdraw');
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    expect(proposePeaceError(state, 0, 1)).toContain('already stands');
  });

  it('takes every offer with the war it was made on', () => {
    // The offers live on the war row, so a second war between the same pair
    // opens with nobody suing — a property of *where* they live, not a line.
    const state = warBench();
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    closeWar(state, 0, 1);
    state.turn += WAR.truceTurns;
    openWar(state, 0, 1);
    expect(hasPeaceOffer(state, 0, 1)).toBe(false);
  });

  it('sweeps a spent truce without changing an outcome', () => {
    // A broom, not a clock: every reader compares an absolute turn, so the
    // register with the row and the register without it answer identically.
    const state = warBench();
    closeWar(state, 0, 1);
    state.turn += WAR.truceTurns;
    expect(truceTurnsLeft(state, 0, 1)).toBe(0);
    runEndOfTurn(state);
    expect(state.truces).toEqual([]);
    expect(truceTurnsLeft(state, 0, 1)).toBe(0);
  });
});

// --- 6. expulsion -----------------------------------------------------------

describe('expulsion, at peace and never at declaration', () => {
  function standingIn(): { state: GameState; city: City } {
    const state = flatState(16, 10);
    const city = foundCityAt(state, 1, at(state.map, 10, 4));
    claimBlock(state, city, [8, 9, 10, 11], [3, 4, 5]);
    openWar(state, 0, 1);
    return { state, city };
  }

  it('leaves the armies where they stand when the war opens', () => {
    const state = flatState(16, 10);
    const city = foundCityAt(state, 1, at(state.map, 10, 4));
    claimBlock(state, city, [8, 9, 10, 11], [3, 4, 5]);
    const soldier = createUnit(state, 0, 'warrior', 8, 4);
    expect(applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);
    expect(soldier.col).toBe(8);
    expect(soldier.row).toBe(4);
  });

  it('walks a soldier out of foreign ground when the peace resolves', () => {
    const { state } = standingIn();
    const soldier = createUnit(state, 0, 'warrior', 9, 4);
    soldier.path = [{ col: 10, row: 4 }];
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const report = runEndOfTurn(state);

    expect(report.peaces).toHaveLength(1);
    const walked = report.peaces[0]!.expulsions;
    expect(walked).toHaveLength(1);
    expect(walked[0]!.unitId).toBe(soldier.id);
    expect(walked[0]!.ownerId).toBe(0);
    expect(walked[0]!.fromOwnerId).toBe(1);
    expect(walked[0]!.stranded).toBe(false);
    // Somewhere it may legally stand, which since the peace means somewhere
    // that is not theirs — and the standing order it was under is dropped,
    // because that order describes a march from a hex it is no longer on.
    expect(tileOwnerPlayerId(state, soldier.col, soldier.row)).not.toBe(1);
    expect(soldier.path).toBeUndefined();
  });

  it('leaves a civilian standing: it was never barred', () => {
    const { state } = standingIn();
    const worker = createUnit(state, 0, 'worker', 9, 4);
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const report = runEndOfTurn(state);
    expect(report.peaces[0]!.expulsions).toEqual([]);
    expect(worker.col).toBe(9);
    expect(worker.row).toBe(4);
  });

  it('walks both sides home, and in unit order', () => {
    const { state } = standingIn();
    const theirs = foundCityAt(state, 0, at(state.map, 3, 4));
    claimBlock(state, theirs, [2, 3, 4], [3, 4, 5]);
    const mine = createUnit(state, 0, 'warrior', 9, 4);
    const yours = createUnit(state, 1, 'warrior', 3, 5);
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const walked = runEndOfTurn(state).peaces[0]!.expulsions;
    expect(walked.map((entry) => entry.unitId)).toEqual([mine.id, yours.id]);
  });

  it('is deterministic: two identical boards send the same piece to the same hex', () => {
    const run = (): { col: number; row: number } => {
      const { state } = standingIn();
      createUnit(state, 0, 'warrior', 9, 4);
      applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
      applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
      const walked = runEndOfTurn(state).peaces[0]!.expulsions;
      return { col: walked[0]!.to.col, row: walked[0]!.to.row };
    };
    expect(run()).toEqual(run());
  });
});

// --- 7. routes --------------------------------------------------------------

describe('a declaration drops the trade between the two', () => {
  it('ends a route whose two ends have come to be held by the warring pair', () => {
    const state = flatState(20, 10);
    const mine = foundCityAt(state, 0, at(state.map, 4, 4));
    const theirs = foundCityAt(state, 1, at(state.map, 14, 4));
    const caravan = createUnit(state, 0, 'trader', 4, 4);
    caravan.trade = {
      from: mine.id,
      to: theirs.id,
      expiresTurn: state.turn + 10,
      outbound: true,
      autoResend: false,
    };
    const result = applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 });
    expect(result.ok).toBe(true);
    expect(result.ok && result.routesEnded).toEqual([
      { unitId: caravan.id, ownerId: 0, from: mine.id, to: theirs.id, renewed: false },
    ]);
    expect(caravan.trade).toBeUndefined();
  });

  it('leaves an empire’s own routes alone', () => {
    const state = flatState(20, 10);
    const one = foundCityAt(state, 0, at(state.map, 4, 4));
    const two = foundCityAt(state, 0, at(state.map, 9, 4));
    const caravan = createUnit(state, 0, 'trader', 4, 4);
    caravan.trade = {
      from: one.id,
      to: two.id,
      expiresTurn: state.turn + 10,
      outbound: true,
      autoResend: false,
    };
    const result = applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 });
    expect(result.ok && result.routesEnded).toBeUndefined();
    expect(caravan.trade).toBeDefined();
  });
});

// --- 8. what to do with a town you took -------------------------------------

describe('a captured town is a puppet', () => {
  function capture(): { state: GameState; city: City } {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 6, 4));
    city.hp = 1;
    openWar(state, 0, 1);
    const raider = createUnit(state, 0, 'warrior', 5, 4);
    expect(applyCombat(state, raider.id, { col: 6, row: 4 }).ok).toBe(true);
    expect(city.ownerId).toBe(0);
    return { state, city };
  }

  it('arrives as one, and annexing is the one decision about it', () => {
    const { state, city } = capture();
    expect(city.captured).toBe(true);
    expect(city.puppet).toBe(true);
    expect(annexCityError(state, 0, city.id)).toBeNull();
    expect(applyCommand(state, { type: 'annexCity', playerId: 0, cityId: city.id }).ok).toBe(true);
    expect(city.puppet).toBeUndefined();
    // Irreversible by the plainest mechanism: no verb writes the flag back.
    expect(annexCityError(state, 0, city.id)).toContain('already part of your empire');
  });

  it('refuses an annexation of somebody else’s town', () => {
    const { state, city } = capture();
    expect(annexCityError(state, 1, city.id)).toContain('not yours');
  });

  it('leaves a founded town no puppet at all', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 4, 4));
    expect(city.puppet).toBeUndefined();
    // Presence is the state, so the serialised town has no key.
    expect(Object.keys(JSON.parse(JSON.stringify(city)) as object)).not.toContain('puppet');
  });
});

describe('razing', () => {
  function held(): { state: GameState; city: City } {
    const state = flatState();
    const capital = foundCityAt(state, 0, at(state.map, 3, 4));
    const taken = foundCityAt(state, 1, at(state.map, 9, 4));
    claimBlock(state, taken, [8, 9, 10], [3, 4, 5]);
    taken.ownerId = 0;
    taken.captured = true;
    taken.puppet = true;
    expect(capital.ownerId).toBe(0);
    return { state, city: taken };
  }

  it('pulls the town down and gives its ground back to nobody', () => {
    const { state, city } = held();
    const result = applyCommand(state, { type: 'razeCity', playerId: 0, cityId: city.id });
    expect(result.ok).toBe(true);
    expect(result.ok && result.razed?.name).toBe(city.name);
    expect(result.ok && (result.razed?.tilesReleased ?? 0)).toBeGreaterThan(0);
    expect(state.cities.some((town) => town.id === city.id)).toBe(false);
    expect(state.tileOwner.every((owner) => owner !== city.id)).toBe(true);
    expect(tileOwnerPlayerId(state, 9, 4)).toBeNull();
    // Nobody remembers a town that is not there.
    expect(state.citySightings.every((list) => list.every((seen) => seen.cityId !== city.id))).toBe(
      true,
    );
  });

  it('leaves what was built on the fields exactly where it was', () => {
    // Nothing regenerates a tile mid-game: an army burns a town, not a valley.
    const { state, city } = held();
    const field = at(state.map, 8, 4);
    field.improvement = 'farm';
    applyCommand(state, { type: 'razeCity', playerId: 0, cityId: city.id });
    expect(field.improvement).toBe('farm');
    expect(field.discovery).toBeUndefined();
  });

  it('refuses a seat of government, on either reading of one', () => {
    const { state, city } = held();
    // A town that has ever been a capital — the flag written at capture.
    city.wasCapital = true;
    expect(razeCityError(state, 0, city.id)).toContain('seat of government');
    delete city.wasCapital;
    expect(razeCityError(state, 0, city.id)).toBeNull();
    // And the razer's own capital, which `capitalCityOf` names.
    const capital = state.cities.find((town) => town.col === 3)!;
    expect(razeCityError(state, 0, capital.id)).toContain('seat of government');
  });

  it('marks a captured palace so it can never be pulled down', () => {
    const state = flatState();
    const theirs = foundCityAt(state, 1, at(state.map, 6, 4));
    theirs.hp = 1;
    openWar(state, 0, 1);
    const raider = createUnit(state, 0, 'warrior', 5, 4);
    applyCombat(state, raider.id, { col: 6, row: 4 });
    expect(theirs.wasCapital).toBe(true);
    expect(razeCityError(state, 0, theirs.id)).toContain('seat of government');
  });

  it('refuses somebody else’s town', () => {
    const { state, city } = held();
    expect(razeCityError(state, 1, city.id)).toContain('not yours');
  });

  it('brings home every caravan whose route had an end there', () => {
    const { state, city } = held();
    const mine = state.cities.find((town) => town.col === 3)!;
    const caravan = createUnit(state, 0, 'trader', 3, 4);
    caravan.trade = {
      from: mine.id,
      to: city.id,
      expiresTurn: state.turn + 10,
      outbound: true,
      autoResend: false,
    };
    const result = applyCommand(state, { type: 'razeCity', playerId: 0, cityId: city.id });
    expect(result.ok && result.routesEnded).toHaveLength(1);
    expect(caravan.trade).toBeUndefined();
  });
});

// --- 9. the log -------------------------------------------------------------

describe('a war replays exactly', () => {
  it('reproduces a declaration, a blow, a peace and a truce from the log alone', () => {
    const config = {
      seed: 909,
      sizeName: 'duel' as const,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
    const game = createGame(config);
    expect(dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);

    // Two warriors placed by logged commands, beside each other, so the fight
    // is reproducible from `{config, log}` and nothing else.
    const home = game.state.units.find((unit) => unit.ownerId === 0)!;
    const spots: { col: number; row: number }[] = [];
    for (let dc = -2; dc <= 2 && spots.length < 2; dc++) {
      for (let dr = -1; dr <= 1 && spots.length < 2; dr++) {
        if (dc === 0 && dr === 0) continue;
        const tile = getTileAt(game.state.map, home.col + dc, home.row + dr);
        if (!tile || tile.terrain === 'mountain') continue;
        if (['ocean', 'coast', 'lake'].includes(tile.terrain)) continue;
        if (game.state.units.some((u) => u.col === tile.col && u.row === tile.row)) continue;
        if (spots.some((s) => s.col === tile.col && s.row === tile.row)) continue;
        spots.push({ col: tile.col, row: tile.row });
      }
    }
    expect(spots).toHaveLength(2);
    for (const [index, spot] of spots.entries()) {
      expect(
        dispatch(game, {
          type: 'spawnUnit',
          playerId: 0,
          ownerId: index,
          unitType: 'warrior',
          at: spot,
        }).ok,
      ).toBe(true);
    }
    const mine = game.state.units.find(
      (u) => u.ownerId === 0 && u.col === spots[0]!.col && u.row === spots[0]!.row,
    )!;
    expect(dispatch(game, attack(mine.id, spots[1]!.col, spots[1]!.row)).ok).toBe(true);

    // And then both sides sue, and the resolution ends it.
    dispatch(game, { type: 'proposePeace', playerId: 0, targetId: 1 });
    dispatch(game, { type: 'proposePeace', playerId: 1, targetId: 0 });
    for (const player of game.state.players) {
      dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(atWar(game.state, 0, 1)).toBe(false);
    expect(game.state.truces).toHaveLength(1);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });
});

// --- 10. the schema ---------------------------------------------------------

describe('the schema witness', () => {
  it('carries the version that says war is a state and peacetime blows are refused', () => {
    // v56: combat, pillage and border entry between two empires became illegal
    // at peace, and two registers plus five verbs joined the state. A v55 log
    // may contain an attack or a march this reducer refuses, so it is a
    // different game rather than an older one.
    // v57 (phase two): deals exist — `state.deals` and `state.dealProposals`,
    // four verbs, a `proposePeace` that carries terms, a lending clause in
    // `openedResource` and a right of way Writing hands over. A v56 log knows
    // no deal commands and replays into a different world.
    // v58 (phase three): a puppet buys nothing — units, buildings and ground
    // are all refused until it is annexed, so a v57 log's puppet purchase is
    // refused here. See `test/sim/purchase.test.ts` for the clause itself.
    expect(SCHEMA_VERSION).toBe(65);
  });
});
