/**
 * War weariness (batch WC2, `docs/flags.md` (rrrrrr) part 2).
 *
 * The rule, part by part, on a small flat board:
 *
 *   · the figures: your losses to one enemy minus its losses to you, never
 *     below zero, a town worth `townLoss` units, a loss leaving the window,
 *     several enemies summed, and peace erasing nothing;
 *   · what counts as a loss: both sides of a fight, a ranged kill, a unit broken
 *     on a city's walls, a captured civilian, a plundered caravan and a town
 *     taken by force count; the barbarians on either side, a town ceded in a
 *     peace deal and a unit its owner disbands do not;
 *   · the happiness line, one per enemy, and the meter's memo kept fresh;
 *   · the broom, which changes no reading;
 *   · the register of the places that record a loss;
 *   · the bots' peace, which weighs weariness;
 *   · and a game with losses in it replaying from its log.
 */

import { describe, expect, it } from 'vitest';

import { aiConfigFor } from '../../src/ai/aiConfig';
import { valueContext } from '../../src/ai/bot';
import { type ValueTerm, foldTerms } from '../../src/ai/decision';
import {
  answerPeaceOffer,
  counterRefusal,
  diplomacyDecision,
  explainPeaceScore,
  explainWarScore,
} from '../../src/ai/diplomacy';
import { applyCombat } from '../../src/sim/combat';
import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { dispatch, replay, snapshotState } from '../../src/sim/game';
import { type Tile, createMap, getTileAt, tileNeighbors } from '../../src/sim/map';
import { explainHappiness, happinessOf, meterEffects } from '../../src/sim/meters';
import { isPassable } from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import { setSlateShadow, slateShadow } from '../../src/sim/slate';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar, setPeaceOffer, warBetween } from '../../src/sim/wars';
import {
  explainWeariness,
  foldWeariness,
  lossInWindow,
  pruneWarLosses,
  recordWarLoss,
  wearinessBetween,
} from '../../src/sim/weariness';
import { createGame, newGame } from './newGameHelpers';

const WEARINESS = RULES.war.weariness;
const UNIT = WEARINESS.unitLoss;
const TOWN = WEARINESS.townLoss;
const PER_POINT = WEARINESS.happinessPerPoint;

/**
 * A blank flat board with two or three empires and, when asked, the wild.
 * Every town and piece is placed by hand below.
 */
function bench(seats = 2, wild = false): GameState {
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
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, id: number): Player {
  const player = playerById(state, id);
  if (!player) throw new Error(`No seat ${id}`);
  return player;
}

function wildId(state: GameState): number {
  const wild = state.players.find((player) => player.barbarian === true);
  if (!wild) throw new Error('no wild seat');
  return wild.id;
}

/** Records `count` losses of one kind, as the seams do. */
function lose(state: GameState, loserId: number, byId: number, kind: 'unit' | 'town', count = 1): void {
  for (let index = 0; index < count; index++) recordWarLoss(state, loserId, byId, kind);
}

// --- the figures ------------------------------------------------------------

describe('the weariness figures', () => {
  it('is your losses to an enemy minus its losses to you', () => {
    const state = bench();
    lose(state, 0, 1, 'unit', 3);
    lose(state, 1, 0, 'unit', 1);
    expect(wearinessBetween(state, 0, 1)).toEqual({
      enemyId: 1,
      suffered: 3 * UNIT,
      inflicted: UNIT,
      points: 2 * UNIT,
      happiness: 2 * UNIT * PER_POINT,
    });
  });

  it('never goes below zero, so a war you are winning costs nothing', () => {
    const state = bench();
    lose(state, 0, 1, 'unit', 3);
    lose(state, 1, 0, 'unit', 1);
    const winner = wearinessBetween(state, 1, 0);
    expect(winner.suffered).toBe(UNIT);
    expect(winner.inflicted).toBe(3 * UNIT);
    expect(winner.points).toBe(0);
    expect(winner.happiness).toBe(0);
  });

  it('counts a town as eight units', () => {
    // The user's ruling of 2026-10-14, and the number in the data.
    expect(TOWN).toBe(8);
    expect(UNIT).toBe(1);
    const state = bench();
    lose(state, 0, 1, 'town');
    expect(wearinessBetween(state, 0, 1).points).toBe(8 * UNIT);
    // Eight units of theirs make up for it exactly.
    lose(state, 1, 0, 'unit', 8);
    expect(wearinessBetween(state, 0, 1).points).toBe(0);
  });

  it('counts a loss for the window and not a turn longer', () => {
    expect(WEARINESS.windowTurns).toBe(20);
    const state = bench();
    state.turn = 10;
    lose(state, 0, 1, 'unit');
    const loss = seat(state, 0).warLosses![0]!;
    expect(loss).toEqual({ turn: 10, by: 1, kind: 'unit' });
    expect(wearinessBetween(state, 0, 1).points).toBe(UNIT);
    state.turn = 10 + WEARINESS.windowTurns - 1;
    expect(lossInWindow(loss, state.turn)).toBe(true);
    expect(wearinessBetween(state, 0, 1).points).toBe(UNIT);
    state.turn = 10 + WEARINESS.windowTurns;
    expect(lossInWindow(loss, state.turn)).toBe(false);
    expect(wearinessBetween(state, 0, 1).points).toBe(0);
  });

  it('nets each enemy on its own and sums the enemies', () => {
    const state = bench(3);
    lose(state, 0, 1, 'unit', 2);
    lose(state, 0, 2, 'town');
    // Seat 2's losses to seat 0 do not offset seat 0's losses to seat 1.
    lose(state, 2, 0, 'unit', 3);
    const lines = explainWeariness(state, 0);
    expect(lines.map((line) => [line.enemyId, line.points])).toEqual([
      [1, 2 * UNIT],
      [2, TOWN - 3 * UNIT],
    ]);
    expect(foldWeariness(lines)).toBe(2 * UNIT + TOWN - 3 * UNIT);
  });

  it('keeps a line for an even exchange, worth nothing', () => {
    const state = bench();
    lose(state, 0, 1, 'unit', 2);
    lose(state, 1, 0, 'unit', 2);
    expect(explainWeariness(state, 0)).toEqual([
      { enemyId: 1, suffered: 2 * UNIT, inflicted: 2 * UNIT, points: 0, happiness: 0 },
    ]);
    expect(explainWeariness(bench(), 0)).toEqual([]);
  });

  it('is not erased by peace: the losses age out instead', () => {
    const state = bench();
    foundCityAt(state, 0, at(state, 2, 4));
    foundCityAt(state, 1, at(state, 12, 4));
    openWar(state, 0, 1);
    lose(state, 0, 1, 'town');
    const before = wearinessBetween(state, 0, 1);
    expect(before.points).toBe(TOWN);

    expect(applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 }).ok).toBe(true);
    expect(applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 }).ok).toBe(true);
    expect(warBetween(state, 0, 1)).toBeUndefined();
    expect(wearinessBetween(state, 0, 1)).toEqual(before);

    state.turn += WEARINESS.windowTurns;
    expect(wearinessBetween(state, 0, 1).points).toBe(0);
  });
});

// --- what counts as a loss --------------------------------------------------

describe('what counts as a loss', () => {
  /** Two empires at war, each with a town far apart. */
  function atWar(wild = false): GameState {
    const state = bench(2, wild);
    foundCityAt(state, 0, at(state, 1, 1));
    foundCityAt(state, 1, at(state, 14, 8));
    openWar(state, 0, 1);
    return state;
  }

  it('records a defender killed by a melee blow, against the attacker’s empire', () => {
    const state = atWar();
    const attacker = createUnit(state, 0, 'swordsman', 4, 4);
    const doomed = createUnit(state, 1, 'warrior', 5, 4);
    doomed.hp = 3;
    expect(applyCombat(state, attacker.id, { col: 5, row: 4 }).ok).toBe(true);
    expect(state.units.some((unit) => unit.id === doomed.id)).toBe(false);
    expect(seat(state, 1).warLosses).toEqual([{ turn: state.turn, by: 0, kind: 'unit' }]);
    expect(seat(state, 0).warLosses).toBeUndefined();
  });

  it('records an attacker killed by the counter-blow, against the defender’s empire', () => {
    const state = atWar();
    const attacker = createUnit(state, 0, 'warrior', 4, 4);
    attacker.hp = 1;
    createUnit(state, 1, 'swordsman', 5, 4);
    const result = applyCombat(state, attacker.id, { col: 5, row: 4 });
    expect(result.ok && result.outcome.attackerSurvived).toBe(false);
    expect(seat(state, 0).warLosses).toEqual([{ turn: state.turn, by: 1, kind: 'unit' }]);
    expect(seat(state, 1).warLosses).toBeUndefined();
  });

  it('records a ranged kill', () => {
    const state = atWar();
    const archer = createUnit(state, 0, 'archer', 4, 4);
    const doomed = createUnit(state, 1, 'warrior', 6, 4);
    doomed.hp = 2;
    const result = applyCombat(state, archer.id, { col: 6, row: 4 });
    expect(result.ok && result.outcome.kind).toBe('ranged');
    expect(state.units.some((unit) => unit.id === doomed.id)).toBe(false);
    expect(seat(state, 1).warLosses).toEqual([{ turn: state.turn, by: 0, kind: 'unit' }]);
  });

  it('records a unit broken on a city’s walls, against the city’s empire', () => {
    const state = atWar();
    const walls = foundCityAt(state, 1, at(state, 8, 4));
    expect(walls.hp).toBeGreaterThan(1);
    const attacker = createUnit(state, 0, 'warrior', 7, 4);
    attacker.hp = 1;
    const result = applyCombat(state, attacker.id, { col: 8, row: 4 });
    expect(result.ok && result.outcome.cityPhase).toBe('walls');
    expect(result.ok && result.outcome.attackerSurvived).toBe(false);
    expect(seat(state, 0).warLosses).toEqual([{ turn: state.turn, by: 1, kind: 'unit' }]);
  });

  it('records a civilian captured by a blow', () => {
    const state = atWar();
    const captor = createUnit(state, 0, 'warrior', 4, 4);
    const worker = createUnit(state, 1, 'worker', 5, 4);
    expect(applyCombat(state, captor.id, { col: 5, row: 4 }).ok).toBe(true);
    expect(worker.ownerId).toBe(0);
    expect(seat(state, 1).warLosses).toEqual([{ turn: state.turn, by: 0, kind: 'unit' }]);
  });

  /** A laden caravan of seat 1's on (6,4), running between two of its towns. */
  function caravan(state: GameState) {
    const from = foundCityAt(state, 1, at(state, 9, 1));
    const to = foundCityAt(state, 1, at(state, 9, 7));
    const cart = createUnit(state, 1, 'trader', 6, 4);
    cart.trade = { from: from.id, to: to.id, expiresTurn: state.turn + 10, outbound: true, autoResend: false };
    return cart;
  }

  it('records a laden caravan plundered by a blow', () => {
    const state = atWar();
    const cart = caravan(state);
    const raider = createUnit(state, 0, 'warrior', 5, 4);
    const result = applyCombat(state, raider.id, { col: 6, row: 4 });
    expect(result.ok && result.outcome.plundered).not.toBeNull();
    expect(state.units.some((unit) => unit.id === cart.id)).toBe(false);
    expect(seat(state, 1).warLosses).toEqual([{ turn: state.turn, by: 0, kind: 'unit' }]);
  });

  it('records a laden caravan plundered by a piece marching onto it', () => {
    const state = atWar();
    const cart = caravan(state);
    const raider = createUnit(state, 0, 'warrior', 5, 4);
    const result = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: raider.id,
      target: { col: 6, row: 4 },
    });
    expect(result.ok).toBe(true);
    expect(state.units.some((unit) => unit.id === cart.id)).toBe(false);
    expect(seat(state, 1).warLosses).toEqual([{ turn: state.turn, by: 0, kind: 'unit' }]);
  });

  it('records a town taken by force as a town', () => {
    const state = atWar();
    const town = foundCityAt(state, 1, at(state, 8, 4));
    town.hp = 1;
    const raider = createUnit(state, 0, 'warrior', 7, 4);
    expect(applyCombat(state, raider.id, { col: 8, row: 4 }).ok).toBe(true);
    expect(town.ownerId).toBe(0);
    expect(seat(state, 1).warLosses).toEqual([{ turn: state.turn, by: 0, kind: 'town' }]);
    expect(wearinessBetween(state, 1, 0).points).toBe(TOWN);
  });

  it('records nothing for a fight with the wild, whichever side falls', () => {
    const state = bench(2, true);
    foundCityAt(state, 0, at(state, 1, 1));
    const wild = wildId(state);
    // The wild kills one of ours…
    const ours = createUnit(state, 0, 'warrior', 5, 4);
    ours.hp = 2;
    const raider = createUnit(state, wild, 'swordsman', 6, 4);
    expect(applyCombat(state, raider.id, { col: 5, row: 4 }).ok).toBe(true);
    expect(state.units.some((unit) => unit.id === ours.id)).toBe(false);
    // …and one of ours kills one of the wild's.
    const hunter = createUnit(state, 0, 'swordsman', 9, 4);
    const prey = createUnit(state, wild, 'warrior', 10, 4);
    prey.hp = 2;
    expect(applyCombat(state, hunter.id, { col: 10, row: 4 }).ok).toBe(true);
    expect(state.units.some((unit) => unit.id === prey.id)).toBe(false);
    // And the seam itself refuses the wild on either side.
    recordWarLoss(state, 0, wild, 'unit');
    recordWarLoss(state, wild, 0, 'unit');
    for (const player of state.players) expect(player.warLosses).toBeUndefined();
    expect(explainWeariness(state, 0)).toEqual([]);
  });

  it('records nothing for a town ceded in a peace deal', () => {
    const state = atWar();
    const town = foundCityAt(state, 1, at(state, 9, 4));
    const paper = {
      type: 'proposePeace',
      playerId: 1,
      targetId: 0,
      give: { cities: [town.id] },
      take: {},
    } as unknown as Command;
    expect(applyCommand(state, paper).ok).toBe(true);
    expect(applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 }).ok).toBe(true);
    expect(town.ownerId).toBe(0);
    expect(seat(state, 1).warLosses).toBeUndefined();
    expect(seat(state, 0).warLosses).toBeUndefined();
  });

  it('records nothing for a unit its owner disbands, or for a loss to oneself', () => {
    const state = atWar();
    const spare = createUnit(state, 0, 'warrior', 4, 4);
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: spare.id }).ok).toBe(true);
    recordWarLoss(state, 0, 0, 'unit');
    expect(seat(state, 0).warLosses).toBeUndefined();
  });
});

// --- the happiness line -----------------------------------------------------

describe('the happiness line', () => {
  function weariness(lines: ReturnType<typeof explainHappiness>) {
    return lines.filter((line) => line.source.startsWith('War weariness'));
  }

  it('prints one cost line per enemy, naming the enemy, worth its weariness', () => {
    const state = bench(3);
    foundCityAt(state, 0, at(state, 4, 4));
    const before = happinessOf(state, 0);
    lose(state, 0, 1, 'unit', 2);
    lose(state, 0, 2, 'town');
    const lines = weariness(explainHappiness(state, 0));
    expect(lines).toEqual([
      { source: 'War weariness · the B', part: 'cost', value: -2 * UNIT * PER_POINT },
      { source: 'War weariness · the C', part: 'cost', value: -TOWN * PER_POINT },
    ]);
    // Plain words: the enemy's name and no figure in the label.
    for (const line of lines) expect(line.source).not.toMatch(/\d/);
    expect(happinessOf(state, 0)).toBe(before - (2 * UNIT + TOWN) * PER_POINT);
  });

  it('prints nothing for a war this empire is winning or one that is even', () => {
    const state = bench(3);
    foundCityAt(state, 0, at(state, 4, 4));
    lose(state, 1, 0, 'unit', 3);
    lose(state, 0, 2, 'unit', 2);
    lose(state, 2, 0, 'unit', 2);
    expect(weariness(explainHappiness(state, 0))).toEqual([]);
  });

  it('touches the happiness list and nothing in a fight', () => {
    // The combat forecast for the same blow reads the same strengths with and
    // without weariness on either side.
    const state = bench();
    foundCityAt(state, 0, at(state, 1, 1));
    foundCityAt(state, 1, at(state, 14, 8));
    openWar(state, 0, 1);
    const attacker = createUnit(state, 0, 'swordsman', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    const plain = JSON.stringify(applyCombat(structuredClone(state), attacker.id, { col: 5, row: 4 }));
    lose(state, 0, 1, 'town', 3);
    bumpRevision(state);
    const weary = JSON.stringify(applyCombat(structuredClone(state), attacker.id, { col: 5, row: 4 }));
    expect(weary).toBe(plain);
  });

  it('keeps the meter’s memo fresh when a loss is written and when it leaves the window', () => {
    const was = slateShadow();
    // Every remembered answer is checked against a fresh one: a write that did
    // not move the economy clock would throw here.
    setSlateShadow(true);
    try {
      const game = createGame({
        seed: 21,
        sizeName: 'duel',
        players: [
          { name: 'A', color: '#a00', isHuman: true },
          { name: 'B', color: '#00a', isHuman: true },
        ],
      });
      const state = game.state;
      for (const owner of [0, 1]) {
        const settler = state.units.find((unit) => unit.ownerId === owner && unit.type === 'settler')!;
        expect(dispatch(game, { type: 'foundCity', playerId: owner, settlerUnitId: settler.id }).ok).toBe(true);
      }
      const stifle = (): number | null =>
        meterEffects(state, 0).find((effect) => effect.meter === 'happiness' && effect.growth)?.value ?? null;

      // Asked once at rest, so the memo holds an answer with no weariness in it.
      expect(stifle()).toBeNull();
      lose(state, 0, 1, 'town', 2);
      // The write moved the clock: the memo answers with the deficit.
      expect(stifle()).toBe(happinessOf(state, 0));
      expect(stifle()!).toBeLessThan(0);

      // Then the turns pass, asking before and after each one, until the
      // losses leave the window on the turn change itself.
      const end = (): void => {
        for (const player of state.players) {
          expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
        }
      };
      const stamped = seat(state, 0).warLosses![0]!.turn;
      while (state.turn < stamped + WEARINESS.windowTurns) {
        stifle();
        end();
        expect(stifle()).toBe(happinessOf(state, 0) < 0 ? happinessOf(state, 0) : null);
      }
      expect(explainWeariness(state, 0)).toEqual([]);
      expect(weariness(explainHappiness(state, 0))).toEqual([]);
    } finally {
      setSlateShadow(was);
    }
  });
});

// --- the broom --------------------------------------------------------------

describe('the broom', () => {
  it('deletes only losses that have left the window, and changes no reading', () => {
    const state = bench();
    state.turn = 1;
    lose(state, 0, 1, 'unit');
    state.turn = 15;
    lose(state, 0, 1, 'town');
    state.turn = 1 + WEARINESS.windowTurns;
    const before = explainWeariness(state, 0);
    pruneWarLosses(state);
    expect(seat(state, 0).warLosses).toEqual([{ turn: 15, by: 1, kind: 'town' }]);
    expect(explainWeariness(state, 0)).toEqual(before);

    state.turn = 15 + WEARINESS.windowTurns;
    pruneWarLosses(state);
    // Emptied, the key goes, so the seat serialises as one that lost nothing.
    expect(Object.keys(seat(state, 0))).not.toContain('warLosses');
  });

  it('sweeps in the settleDiplomacy phase', () => {
    const state = bench();
    lose(state, 0, 1, 'unit');
    state.turn += WEARINESS.windowTurns;
    runEndOfTurn(state);
    expect(seat(state, 0).warLosses).toBeUndefined();
  });
});

// --- the register of seams --------------------------------------------------

/**
 * The simulation's sources, read as text: a caller is a fact about the file,
 * which is why `slateRegister.test.ts` and `religion.test.ts` read their
 * registers this way too.
 */
const SOURCES = {
  ...import.meta.glob('../../src/sim/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/sim/*/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/ai/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/ui/*.ts', { eager: true, query: '?raw', import: 'default' }),
} as Record<string, string>;

const FUNCTION_START =
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/;

/** `file#function` for every line matching `pattern`, comments skipped. */
function sitesOf(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const [path, text] of Object.entries(SOURCES)) {
    const file = path.slice(path.lastIndexOf('/') + 1);
    const lines = text.split('\n');
    for (const [index, raw] of lines.entries()) {
      const code = raw.split('//')[0]!;
      if (code.trim().startsWith('*')) continue;
      if (!pattern.test(code)) continue;
      let fn = '(top level)';
      for (let back = index; back >= 0; back--) {
        const match = FUNCTION_START.exec(lines[back]!);
        if (match) {
          fn = match[1] ?? match[2] ?? fn;
          break;
        }
      }
      found.push(`${file}#${fn}`);
    }
  }
  return found.sort();
}

describe('the register of the places that record a loss', () => {
  it('records a loss from these seams and no others', () => {
    // One helper writes a loss, and these are its callers. A new way for one
    // empire to destroy or take another's piece or town joins this list, or
    // it is a loss nobody's weariness hears about.
    const callers = sitesOf(/(?<!function )\brecordWarLoss\(/);
    expect(callers).toEqual([
      // A laden caravan plundered, and a civilian captured, by a piece arriving.
      'arrival.ts#arriveOnTile',
      'arrival.ts#arriveOnTile',
      // A caravan plundered by a blow, a defender killed, an attacker killed by
      // the counter-blow.
      'combat.ts#applyCombat',
      'combat.ts#applyCombat',
      'combat.ts#applyCombat',
      // A town taken by force.
      'combat.ts#captureCity',
    ]);
  });

  it('writes the losses in one module, by one writer and one broom', () => {
    const writes = sitesOf(/\.warLosses\s*=[^=]|\.warLosses\.(push|splice)\(|delete\s+\w+(\.\w+)*\.warLosses/);
    expect([...new Set(writes)]).toEqual(['weariness.ts#pruneWarLosses', 'weariness.ts#recordWarLoss']);
  });

  it('leaves the peace deal’s handover out of it', () => {
    const combat = Object.entries(SOURCES).find(([path]) => path.endsWith('/sim/combat.ts'))![1];
    const from = combat.indexOf('export function handOverCity(');
    const body = combat.slice(from, combat.indexOf('\n}\n', from));
    expect(body).not.toContain('recordWarLoss');
  });
});

// --- the bots ---------------------------------------------------------------

describe('the bots weigh weariness in peace', () => {
  /** Soldiers for a seat, in a row. */
  function raise(state: GameState, playerId: number, count: number, col: number, row: number): void {
    for (let index = 0; index < count; index++) createUnit(state, playerId, 'warrior', col + index, row);
  }

  /** Two empires at war with even armies: nobody is losing on the board. */
  function evenWar(): GameState {
    const state = bench();
    foundCityAt(state, 0, at(state, 2, 4));
    foundCityAt(state, 1, at(state, 12, 4));
    openWar(state, 0, 1);
    raise(state, 0, 4, 3, 6);
    raise(state, 1, 4, 9, 6);
    return state;
  }

  function abroad(state: GameState, playerId: number) {
    const player = seat(state, playerId);
    return diplomacyDecision(state, player, valueContext(state, player));
  }

  function labels(terms: readonly ValueTerm[]): string[] {
    return terms.flatMap((term) => [term.label, ...(term.parts === undefined ? [] : labels(term.parts))]);
  }

  it('leaves the warscore alone: six lines, an exact mirror, with or without weariness', () => {
    const state = evenWar();
    const ai = aiConfigFor(undefined);
    const plain = explainWarScore(state, seat(state, 0), seat(state, 1), ai);
    lose(state, 0, 1, 'town');
    bumpRevision(state);
    const ours = explainWarScore(state, seat(state, 0), seat(state, 1), ai);
    const theirs = explainWarScore(state, seat(state, 1), seat(state, 0), ai);
    // The warscore also decides whether a seat campaigns (`campaignEnemy`), so
    // weariness stays out of it: same lines, same total, same mirror.
    expect(ours).toEqual(plain);
    expect(ours.terms).toHaveLength(6);
    expect(theirs.total).toBeCloseTo(-ours.total, 9);
  });

  it('takes the weary seat’s own weariness off its peace reading, and prints it', () => {
    const state = evenWar();
    const ai = aiConfigFor(undefined);
    lose(state, 0, 1, 'town');
    bumpRevision(state);
    const score = explainWarScore(state, seat(state, 0), seat(state, 1), ai);
    const peace = explainPeaceScore(state, seat(state, 0), seat(state, 1), ai);
    expect(foldTerms(peace.terms)).toBe(peace.total);
    expect(labels(peace.terms).some((label) => label.includes('war weariness'))).toBe(true);
    // At least the plain weight; more if the loss has put the seat in deficit.
    expect(peace.total).toBeLessThanOrEqual(score.total - TOWN * PER_POINT * ai.war.wearinessWeight);
  });

  it('never counts the enemy’s weariness for the seat that is winning', () => {
    // The design intent: weariness ends wars sooner, never later. A seat whose
    // enemy is weary reads exactly the war it read before, so it is never
    // harder to make peace with.
    const state = evenWar();
    const ai = aiConfigFor(undefined);
    const before = explainPeaceScore(state, seat(state, 0), seat(state, 1), ai);
    lose(state, 1, 0, 'town', 3);
    bumpRevision(state);
    expect(wearinessBetween(state, 1, 0).points).toBeGreaterThan(0);
    expect(explainPeaceScore(state, seat(state, 0), seat(state, 1), ai)).toEqual(before);
    expect(explainPeaceScore(state, seat(state, 0), seat(state, 1), ai)).toEqual(
      explainWarScore(state, seat(state, 0), seat(state, 1), ai),
    );
  });

  it('weighs weariness below nought more heavily', () => {
    const state = evenWar();
    const ai = aiConfigFor(undefined);
    lose(state, 0, 1, 'unit');
    bumpRevision(state);
    expect(happinessOf(state, 0)).toBeGreaterThanOrEqual(0);
    const content = explainPeaceScore(state, seat(state, 0), seat(state, 1), ai);
    expect(labels(content.terms).some((label) => label.includes('below nought'))).toBe(false);

    // The same loss in an empire already in deficit.
    state.cities.find((city) => city.ownerId === 0)!.population = 12;
    bumpRevision(state);
    expect(happinessOf(state, 0)).toBeLessThan(0);
    const unhappy = explainPeaceScore(state, seat(state, 0), seat(state, 1), ai);
    expect(labels(unhappy.terms).some((label) => label.includes('below nought'))).toBe(true);
    expect(content.total - unhappy.total).toBeCloseTo(UNIT * PER_POINT * ai.war.unhappyWearinessWeight, 9);
  });

  it('reads weariness in every peace decision and never in the campaign gate', () => {
    // A source pin on the split: the four peace readers ask the peace reading,
    // and `campaignEnemy` (`bot.ts`) asks the bare warscore, so weariness can
    // never stop a seat campaigning (the slow war loop's regression).
    const read = (file: string): string =>
      Object.entries(import.meta.glob('../../src/ai/*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<
        string,
        string
      >).find(([path]) => path.endsWith(`/${file}`))![1];
    const body = (text: string, name: string): string => {
      const from = text.indexOf(`function ${name}(`);
      expect(from, name).toBeGreaterThan(-1);
      return text.slice(from, text.indexOf('\n}\n', from));
    };
    const diplomacy = read('diplomacy.ts');
    for (const name of ['peaceDecision', 'answerPeaceOffer', 'counterRefusal', 'counterTerms']) {
      expect(body(diplomacy, name), name).toContain('explainPeaceScore(');
      expect(body(diplomacy, name), name).not.toContain('explainWarScore(');
    }
    const campaign = body(read('bot.ts'), 'campaignEnemy');
    expect(campaign).toContain('explainWarScore(');
    expect(campaign).not.toContain('explainPeaceScore(');
  });

  it('sues for peace once its people are weary of a war that is otherwise even', () => {
    const control = evenWar();
    const calm = abroad(control, 0);
    expect(calm === null || calm.command.type !== 'proposePeace').toBe(true);

    const state = evenWar();
    lose(state, 0, 1, 'town', 2);
    bumpRevision(state);
    const decision = abroad(state, 0);
    expect(decision?.command).toMatchObject({ type: 'proposePeace', playerId: 0, targetId: 1 });
    const row = decision!.candidates.find((candidate) => candidate.chosen)!;
    expect(labels(row.terms).some((label) => label.includes('war weariness'))).toBe(true);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  /** Seat 0 out-arms seat 1 two to one, and seat 1 has offered a white peace. */
  function winningWar(): GameState {
    const state = bench();
    foundCityAt(state, 0, at(state, 2, 4));
    foundCityAt(state, 1, at(state, 12, 4));
    openWar(state, 0, 1);
    raise(state, 0, 8, 3, 6);
    raise(state, 1, 4, 9, 6);
    setPeaceOffer(state, 1, 0, true);
    bumpRevision(state);
    return state;
  }

  it('signs a peace it would send home once its losses have worn its people down', () => {
    const control = winningWar();
    const proud = answerPeaceOffer(control, seat(control, 0), seat(control, 1), valueContext(control, seat(control, 0)));
    expect(proud?.command).toMatchObject({ type: 'declinePeace', playerId: 0, targetId: 1 });

    const state = winningWar();
    lose(state, 0, 1, 'town', 3);
    bumpRevision(state);
    const weary = answerPeaceOffer(state, seat(state, 0), seat(state, 1), valueContext(state, seat(state, 0)));
    expect(weary?.command).toMatchObject({ type: 'proposePeace', playerId: 0, targetId: 1 });
    for (const row of weary!.candidates) {
      expect({ row: row.label, fold: foldTerms(row.terms) }).toEqual({ row: row.label, fold: row.score });
    }
    expect(applyCommand(state, weary!.command).ok).toBe(true);
  });

  it('treats at the table once weary, where it would not while winning', () => {
    const control = winningWar();
    expect(counterRefusal(control, 0, 1, valueContext(control, seat(control, 0)))).not.toBeNull();
    const state = winningWar();
    lose(state, 0, 1, 'town', 3);
    bumpRevision(state);
    expect(counterRefusal(state, 0, 1, valueContext(state, seat(state, 0)))).toBeNull();
  });
});

// --- the log ----------------------------------------------------------------

describe('the log', () => {
  /** A free dry hex beside this one, in the map's own neighbour order. */
  function besideOf(state: GameState, col: number, row: number): Tile {
    const here = at(state, col, row);
    const free = tileNeighbors(state.map, here).find(
      (tile) =>
        isPassable(tile) &&
        !state.units.some((unit) => unit.col === tile.col && unit.row === tile.row) &&
        !state.cities.some((city: City) => city.col === tile.col && city.row === tile.row),
    );
    if (!free) throw new Error(`nothing free beside (${col}, ${row})`);
    return free;
  }

  it('replays a war with losses on both sides to the same state', () => {
    const config = {
      seed: 909,
      sizeName: 'duel' as const,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
    const game = createGame(config);
    const state = game.state;
    for (const owner of [0, 1]) {
      const settler = state.units.find((unit) => unit.ownerId === owner && unit.type === 'settler')!;
      expect(dispatch(game, { type: 'foundCity', playerId: owner, settlerUnitId: settler.id }).ok).toBe(true);
    }
    expect(dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);

    /** `killer`'s fire lance spawned beside one of `victim`'s warriors, and the blow. */
    const strike = (killer: number, victim: number): void => {
      const home = state.cities.find((city) => city.ownerId === victim)!;
      const target = besideOf(state, home.col, home.row);
      expect(
        dispatch(game, { type: 'spawnUnit', playerId: victim, ownerId: victim, unitType: 'warrior', at: { col: target.col, row: target.row } }).ok,
      ).toBe(true);
      const prey = state.units.find((unit) => unit.col === target.col && unit.row === target.row)!;
      const post = besideOf(state, target.col, target.row);
      expect(
        dispatch(game, { type: 'spawnUnit', playerId: killer, ownerId: killer, unitType: 'fireLance', at: { col: post.col, row: post.row } }).ok,
      ).toBe(true);
      const lance = state.units.find((unit) => unit.col === post.col && unit.row === post.row && unit.ownerId === killer)!;
      for (let blow = 0; blow < 4 && state.units.some((unit) => unit.id === prey.id); blow++) {
        dispatch(game, { type: 'attack', playerId: killer, unitId: lance.id, target: { col: target.col, row: target.row } });
        for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
      }
      expect(state.units.some((unit) => unit.id === prey.id)).toBe(false);
    };
    strike(0, 1);
    strike(1, 0);
    strike(0, 1);
    expect(seat(state, 1).warLosses?.length).toBe(2);
    expect(seat(state, 0).warLosses?.length).toBe(1);
    expect(wearinessBetween(state, 1, 0).points).toBe(UNIT);
    for (let turn = 0; turn < 3; turn++) {
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(state));
  });
});
