/**
 * The war losses the game keeps (`Player.warLosses`, `src/sim/warLosses.ts`).
 *
 * War weariness read this list until the user removed it (2026-11-23,
 * `docs/flags.md`, "Eight simpler rules"). The list stays because the bots
 * read their recent fighting from it. These tests replace the parts of the old
 * `weariness.test.ts` that pinned the list itself:
 *
 *   · the window: a loss is kept for `rules.war.lossWindowTurns` turns;
 *   · what counts as a loss: both sides of a fight, a ranged kill, a unit broken
 *     on a city's walls, a captured civilian, a plundered caravan and a town
 *     taken by force count; the barbarians on either side, a town ceded in a
 *     peace deal and a unit its owner disbands do not;
 *   · a loss costs no happiness;
 *   · the broom;
 *   · the register of the places that record a loss;
 *   · and a game with losses in it replaying from its log.
 */

import { describe, expect, it } from 'vitest';

import { applyCombat } from '../../src/sim/combat';
import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { dispatch, replay, snapshotState } from '../../src/sim/game';
import { type Tile, createMap, getTileAt, tileNeighbors } from '../../src/sim/map';
import { explainHappiness } from '../../src/sim/meters';
import { isPassable } from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, type Player, createUnit, playerById } from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { resetVisibility } from '../../src/sim/visibility';
import { lossInWindow, lossTurnsCounted, pruneWarLosses, recordWarLoss } from '../../src/sim/warLosses';
import { openWar } from '../../src/sim/wars';
import { createGame, newGame } from './newGameHelpers';

const WINDOW = RULES.war.lossWindowTurns;

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

// --- the window -------------------------------------------------------------

describe('the loss window', () => {
  it('keeps a loss for the window and not a turn longer', () => {
    expect(WINDOW).toBe(20);
    expect(lossTurnsCounted()).toBe(WINDOW);
    const state = bench();
    state.turn = 10;
    recordWarLoss(state, 0, 1, 'unit');
    const loss = seat(state, 0).warLosses![0]!;
    expect(loss).toEqual({ turn: 10, by: 1, kind: 'unit' });
    expect(lossInWindow(loss, 10 + WINDOW - 1)).toBe(true);
    expect(lossInWindow(loss, 10 + WINDOW)).toBe(false);
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
    cart.trade = { from: from.id, to: to.id, outbound: true };
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

// --- no happiness -----------------------------------------------------------

describe('a war loss and happiness', () => {
  it('costs no happiness, however many losses there are', () => {
    // War weariness is removed (2026-11-23): the happiness list is the same
    // with losses recorded and without.
    const state = bench(3);
    foundCityAt(state, 0, at(state, 4, 4));
    const before = explainHappiness(state, 0);
    for (let n = 0; n < 4; n++) recordWarLoss(state, 0, 1, 'unit');
    recordWarLoss(state, 0, 2, 'town');
    expect(seat(state, 0).warLosses).toHaveLength(5);
    expect(explainHappiness(state, 0)).toEqual(before);
    for (const line of explainHappiness(state, 0)) expect(line.source).not.toMatch(/weariness/i);
  });
});

// --- the broom --------------------------------------------------------------

describe('the broom', () => {
  it('deletes only losses that have left the window', () => {
    const state = bench();
    state.turn = 1;
    recordWarLoss(state, 0, 1, 'unit');
    state.turn = 15;
    recordWarLoss(state, 0, 1, 'town');
    state.turn = 1 + WINDOW;
    pruneWarLosses(state);
    expect(seat(state, 0).warLosses).toEqual([{ turn: 15, by: 1, kind: 'town' }]);

    state.turn = 15 + WINDOW;
    pruneWarLosses(state);
    // Emptied, the key goes, so the seat serialises as one that lost nothing.
    expect(Object.keys(seat(state, 0))).not.toContain('warLosses');
  });

  it('sweeps in the settleDiplomacy phase', () => {
    const state = bench();
    recordWarLoss(state, 0, 1, 'unit');
    state.turn += WINDOW;
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
    // empire to destroy or take another's piece or town joins this list.
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
      // A defender turned to the attacker's side under The Turning of Swords
      // (Devotion batch DV8, the triage's reading 30). The unit does not die,
      // so no kill or loss tally is written, but its empire has lost a soldier
      // to the enemy, so the war records a unit lost, as it does for a
      // civilian captured on arrival.
      'combat.ts#applyCombat',
      // A ship can join the defender when its attack fails.
      'combat.ts#applyCombat',
      // A town taken by force.
      'combat.ts#captureCity',
    ]);
  });

  it('writes the losses in one module, by one writer and one broom', () => {
    const writes = sitesOf(/\.warLosses\s*=[^=]|\.warLosses\.(push|splice)\(|delete\s+\w+(\.\w+)*\.warLosses/);
    expect([...new Set(writes)]).toEqual(['warLosses.ts#pruneWarLosses', 'warLosses.ts#recordWarLoss']);
  });

  it('is read by the bots and by no rule of the game', () => {
    // The list is kept for the bots' reading of their recent fighting. A rule
    // that started to read it would be a new design decision.
    const readers = sitesOf(/\.warLosses\b/).filter((site) => !site.startsWith('warLosses.ts#'));
    expect([...new Set(readers)]).toEqual(['bot.ts#warOutlook']);
  });

  it('leaves the peace deal’s handover out of it', () => {
    const combat = Object.entries(SOURCES).find(([path]) => path.endsWith('/sim/combat.ts'))![1];
    const from = combat.indexOf('export function handOverCity(');
    const body = combat.slice(from, combat.indexOf('\n}\n', from));
    expect(body).not.toContain('recordWarLoss');
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
    for (let turn = 0; turn < 3; turn++) {
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(state));
  });
});
