/**
 * Unrest in a town taken by force (batch WC1, `docs/flags.md` (rrrrrr) part 1),
 * as the user's ruling of 2026-11-23 changed it ("Unrest lasts three turns in
 * every town", the last section of `docs/flags.md`).
 *
 * The rule, part by part, on a small flat board: who enters unrest and when it
 * starts over, what a town in unrest makes, that its borders hold still, that
 * every town settles in the same number of turns whatever stands in it, that
 * The Satraps shortens it, that no rebel rises by default and that one still
 * can when a test sets the cadence, that a bot keeps a soldier in such a town,
 * and that a game with all of this in it replays from its log.
 */

import { describe, expect, it } from 'vitest';

import { nextBotDecision, valueContext } from '../../src/ai/bot';
import type { BotDecision, ValueTerm } from '../../src/ai/decision';
import { explainDeclaration } from '../../src/ai/diplomacy';
import { barbarianUnitType } from '../../src/sim/barbarians';
import { applyCombat } from '../../src/sim/combat';
import { applyCommand } from '../../src/sim/commands';
import {
  borderGrowth,
  expandBorders,
  foundCityAt,
  settleBorderWindfall,
} from '../../src/sim/cities';
import { dispatch, replay, snapshotState } from '../../src/sim/game';
import { type Tile, createMap, getTileAt, tileHex, wrappedDistance } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { bumpEconomy } from '../../src/sim/slate';
import {
  type City,
  type GameState,
  type Unit,
  barbarianPlayer,
  bumpRevision,
  cityById,
  createUnit,
  playerById,
} from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { runEndOfTurn } from '../../src/sim/turn';
import { fullMovement } from '../../src/sim/units';
import { unitDef } from '../../src/sim/unitData';
import {
  type UnrestReport,
  explainPacification,
  foldPacification,
  inUnrest,
  pacificationTurnsLeft,
  rebelGround,
  rebelTurnsLeft,
  runUnrest,
  unrestTarget,
} from '../../src/sim/unrest';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { UNREST_SOURCE, explainUnrestGate, foldCity } from '../../src/sim/yields/town';
import { createGame, newGame } from './newGameHelpers';

const UNREST = RULES.war.unrest;

/**
 * Runs the body with some figures of `rules.war.unrest` changed, then puts the
 * rules back. Set the figures before the town is taken, because the target is
 * read at the moment of capture.
 */
function withUnrestRules(
  patch: { turns?: number; rebelEveryTurns?: number },
  body: () => void,
): void {
  const before = { turns: UNREST.turns, rebelEveryTurns: UNREST.rebelEveryTurns };
  if (patch.turns !== undefined) UNREST.turns = patch.turns;
  if (patch.rebelEveryTurns !== undefined) UNREST.rebelEveryTurns = patch.rebelEveryTurns;
  try {
    body();
  } finally {
    UNREST.turns = before.turns;
    UNREST.rebelEveryTurns = before.rebelEveryTurns;
  }
}

/**
 * A blank flat board with two empires and, when asked, the wild — war.test's
 * bench. Every town and piece is placed by hand below.
 */
function flatState(wild = false): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    ...(wild ? { barbarians: true } : {}),
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
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

/**
 * Seat 0 storms seat 1's second town at (6,4) with a warrior from (5,4). Both
 * seats found a home town first, so the town taken is nobody's capital and may
 * be razed. The warrior walks into the town it took, so the town starts out
 * garrisoned.
 */
function captured(options: { wild?: boolean; population?: number } = {}): {
  state: GameState;
  city: City;
  raider: Unit;
} {
  const state = flatState(options.wild ?? false);
  foundCityAt(state, 0, at(state, 1, 1));
  foundCityAt(state, 1, at(state, 13, 7));
  const city = foundCityAt(state, 1, at(state, 6, 4));
  city.population = options.population ?? 3;
  city.hp = 1;
  openWar(state, 0, 1);
  const raider = createUnit(state, 0, 'warrior', 5, 4);
  expect(applyCombat(state, raider.id, { col: 6, row: 4 }).ok).toBe(true);
  expect(city.ownerId).toBe(0);
  expect(raider.col).toBe(6);
  return { state, city, raider };
}

/** Takes a piece off the board, as a bench writer does. */
function lift(state: GameState, unit: Unit): void {
  state.units = state.units.filter((other) => other.id !== unit.id);
}

/** Re-reads the board after a write the test made by hand. */
function touch(state: GameState): void {
  bumpRevision(state);
  bumpEconomy(state);
}

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const statecraft = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!statecraft.orders.includes(card)) statecraft.orders.push(card);
  statecraft.slots.push({ card, sealedUntil: state.turn });
  touch(state);
}

/** Seat 1 storms the town back with a fresh warrior from (7,4). */
function retake(state: GameState, city: City): void {
  city.hp = 1;
  const warrior = createUnit(state, 1, 'warrior', 7, 4);
  expect(applyCombat(state, warrior.id, { col: city.col, row: city.row }).ok).toBe(true);
  expect(city.ownerId).toBe(1);
}

/** The phase alone, with the wild's own choice of rebel. */
function settle(state: GameState): UnrestReport[] {
  const reports: UnrestReport[] = [];
  runUnrest(state, reports, (where) => barbarianUnitType(state, where));
  return reports;
}

describe('who enters unrest', () => {
  it('starts a town taken by force in unrest, held as a puppet', () => {
    const { city } = captured({ population: 3 });
    expect(city.puppet).toBe(true);
    expect(inUnrest(city)).toBe(true);
    expect(city.unrest).toEqual({ target: UNREST.turns, progress: 0, unguarded: 0 });
    // The ruling's figure, the same for a town of any size.
    expect(UNREST.turns).toBe(3);
    expect(unrestTarget(1)).toBe(UNREST.turns);
    expect(unrestTarget(12)).toBe(UNREST.turns);
  });

  it('keeps an annexed town in unrest: annexing neither restarts nor ends it', () => {
    const { state, city } = captured({ population: 3 });
    runEndOfTurn(state);
    const before = structuredClone(city.unrest);
    expect(before?.progress).toBeGreaterThan(0);
    expect(applyCommand(state, { type: 'annexCity', playerId: 0, cityId: city.id }).ok).toBe(true);
    expect(city.puppet).toBeUndefined();
    expect(city.unrest).toEqual(before);
  });

  it('puts a town its founder takes back into unrest too, starting over', () => {
    const { state, city, raider } = captured({ population: 3 });
    runEndOfTurn(state);
    expect(city.unrest?.progress).toBeGreaterThan(0);
    lift(state, raider);
    retake(state, city);
    expect(city.unrest).toEqual({ target: UNREST.turns, progress: 0, unguarded: 0 });
  });

  it('leaves a founded town with no unrest key at all', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state, 4, 4));
    expect(Object.keys(JSON.parse(JSON.stringify(city)) as object)).not.toContain('unrest');
  });

  it('leaves nothing to pacify once the town is razed', () => {
    const { state, city } = captured();
    expect(applyCommand(state, { type: 'razeCity', playerId: 0, cityId: city.id }).ok).toBe(true);
    expect(cityById(state, city.id)).toBeUndefined();
    expect(state.cities.some((town) => town.unrest !== undefined)).toBe(false);
  });
});

describe('what a town in unrest makes', () => {
  it('makes no production, science or culture, and the food, gold and faith it would', () => {
    const { state, city } = captured({ population: 3 });
    // One building for each of the voices the gate leaves alone or stops.
    city.buildings.push('monument', 'library', 'market', 'shrine');
    const held = foldCity(state, city);
    const calm: City = { ...city };
    delete calm.unrest;
    const free = foldCity(state, calm);
    expect(free.production).toBeGreaterThan(0);
    expect(free.science).toBeGreaterThan(0);
    expect(free.culture).toBeGreaterThan(0);
    expect(held.production).toBe(0);
    expect(held.science).toBe(0);
    expect(held.culture).toBe(0);
    expect(held.food).toBeGreaterThan(0);
    expect(held.gold).toBeGreaterThan(0);
    expect(held.faith).toBeGreaterThan(0);
    expect(held.food).toBe(free.food);
    expect(held.gold).toBe(free.gold);
    expect(held.faith).toBe(free.faith);
  });

  it('says why, one labelled line a stopped voice', () => {
    const { city } = captured();
    expect(explainUnrestGate(city)).toEqual(
      UNREST.halts.map((key) => ({ source: UNREST_SOURCE, yield: key })),
    );
    const calm: City = { ...city };
    delete calm.unrest;
    expect(explainUnrestGate(calm)).toEqual([]);
  });

  it('grows no border, from the accrual, the phase or a windfall', () => {
    const { state, city } = captured();
    city.culture = 1000;
    const claimed = city.tilesClaimed;
    const growth = borderGrowth(state, city);
    expect(growth.frozen).toBe(false);
    expect(growth.unrest).toBe(true);
    expect(growth.perTurn).toBe(0);
    expandBorders(state);
    expect(settleBorderWindfall(state, city)).toBeNull();
    expect(city.tilesClaimed).toBe(claimed);
    // And the same basket buys ground the turn the unrest is over.
    delete city.unrest;
    expandBorders(state);
    expect(city.tilesClaimed).toBe(claimed + 1);
  });
});

describe('pacification', () => {
  /**
   * Ends the turn until the town is pacified, and returns how many end-of-turn
   * settlements that took. Checks the basket on every turn before the last.
   */
  function turnsToPacify(state: GameState, city: City): number {
    for (let turn = 1; turn <= 10; turn++) {
      const report = runEndOfTurn(state);
      if (city.unrest === undefined) {
        expect(report.unrest).toEqual([
          { kind: 'pacified', cityId: city.id, ownerId: city.ownerId, col: city.col, row: city.row },
        ]);
        return turn;
      }
      expect(report.unrest).toEqual([]);
      expect(city.unrest.progress).toBe(turn);
    }
    throw new Error('the town was still in unrest after ten turns');
  }

  it('ends after exactly three settlements in a small town and in a large town alike', () => {
    for (const population of [1, 12]) {
      const { state, city } = captured({ population });
      expect(city.population).toBe(population);
      expect(pacificationTurnsLeft(state, city)).toBe(3);
      expect(turnsToPacify(state, city)).toBe(3);
    }
  });

  it('ends the turn the basket reaches the target, after that turn’s yields', () => {
    const { state, city } = captured({ population: 2 });
    expect(turnsToPacify(state, city)).toBe(UNREST.turns);
    // Every turn of it was a turn of unrest: not a hammer was banked, and the
    // next resolution banks the town's production again.
    expect(city.hammerBasket).toBe(0);
    runEndOfTurn(state);
    expect(city.hammerBasket).toBeGreaterThan(0);
  });

  it('gives one reason, the turn itself, whatever stands in or beside the town', () => {
    const { state, city, raider } = captured({ population: 4 });
    const alone = [{ source: 'Every turn', amount: 1 }];
    // The captor stands in the town, and there is no garrison line.
    expect(explainPacification(state, city)).toEqual(alone);
    // A great general in the town and one beside it, and a Courthouse.
    createUnit(state, 0, 'greatPerson', city.col, city.row, 'hannibal');
    createUnit(state, 0, 'greatPerson', city.col + 1, city.row, 'hannibal');
    city.buildings.push('courthouse');
    touch(state);
    expect(explainPacification(state, city)).toEqual(alone);
    expect(foldPacification(explainPacification(state, city))).toBe(1);
    expect(pacificationTurnsLeft(state, city)).toBe(UNREST.turns);
    // The captor walks out, and nothing changes either.
    lift(state, raider);
    touch(state);
    expect(explainPacification(state, city)).toEqual(alone);
  });

  it('takes three turns with a garrison, a great general and a Courthouse, as with none', () => {
    const held = captured({ population: 6 });
    createUnit(held.state, 0, 'greatPerson', held.city.col, held.city.row, 'hannibal');
    held.city.buildings.push('courthouse');
    touch(held.state);
    expect(turnsToPacify(held.state, held.city)).toBe(3);

    const bare = captured({ population: 6 });
    lift(bare.state, bare.raider);
    touch(bare.state);
    expect(turnsToPacify(bare.state, bare.city)).toBe(3);
  });

  it('takes two turns in a garrisoned town under The Satraps, and three without the garrison', () => {
    const { state, city } = captured({ population: 6 });
    slot(state, 0, 'theSatraps');
    const lines = explainPacification(state, city);
    expect(lines[0]).toEqual({ source: 'Every turn', amount: 1 });
    const card = lines.filter((line) => line.source.includes('The Satraps'));
    expect(card).toHaveLength(1);
    expect(card[0]!.amount).toBe(1);
    expect(foldPacification(lines)).toBe(2);
    expect(pacificationTurnsLeft(state, city)).toBe(2);
    expect(settle(state)).toEqual([]);
    expect(city.unrest?.progress).toBe(2);
    expect(settle(state).map((report) => report.kind)).toEqual(['pacified']);
    expect(city.unrest).toBeUndefined();

    // The same card in a town with no garrison: the card line goes, and the
    // town takes the three turns every town takes.
    const bare = captured({ population: 6 });
    slot(bare.state, 0, 'theSatraps');
    lift(bare.state, bare.raider);
    touch(bare.state);
    expect(explainPacification(bare.state, bare.city)).toEqual([{ source: 'Every turn', amount: 1 }]);
    expect(pacificationTurnsLeft(bare.state, bare.city)).toBe(3);
  });

  it('starts over for a new owner when the town is taken again in unrest', () => {
    const { state, city, raider } = captured({ population: 3 });
    runEndOfTurn(state);
    expect(city.unrest?.progress).toBeGreaterThan(0);
    lift(state, raider);
    retake(state, city);
    expect(city.unrest?.progress).toBe(0);
    expect(city.unrest?.target).toBe(UNREST.turns);
  });
});

describe('rebels', () => {
  it('raise none by default, however long a town in unrest goes unguarded', () => {
    expect(UNREST.rebelEveryTurns).toBe(0);
    const { state, city, raider } = captured({ wild: true, population: 12 });
    lift(state, raider);
    // A record kept open by hand, so the town stays in unrest well past the
    // three unguarded turns that raised a rebel before the ruling.
    city.unrest = { target: 99, progress: 0, unguarded: 0 };
    const wild = barbarianPlayer(state)!;
    for (let turn = 0; turn < 9; turn++) expect(settle(state)).toEqual([]);
    expect(city.unrest?.unguarded).toBe(9);
    expect(rebelTurnsLeft(city)).toBeNull();
    expect(state.units.some((unit) => unit.ownerId === wild.id)).toBe(false);
  });

  it('raise none in a town pacified on the turn a rebel was due', () => {
    // Three turns of unrest and a rebel every third unguarded turn: the phase
    // fills the basket first, so the town is pacified before the rebel rises.
    withUnrestRules({ rebelEveryTurns: 3 }, () => {
      const { state, city, raider } = captured({ wild: true, population: 12 });
      lift(state, raider);
      expect(settle(state)).toEqual([]);
      expect(settle(state)).toEqual([]);
      expect(settle(state).map((report) => report.kind)).toEqual(['pacified']);
      expect(city.unrest).toBeUndefined();
    });
  });

  /**
   * The rest of this block sets the cadence the rule had before the ruling,
   * and a target long enough for it to matter.
   */
  const LONG = { turns: 12, rebelEveryTurns: 3 };

  it('rise beside an unguarded town every third unguarded turn when a test sets the cadence', () => {
    withUnrestRules(LONG, () => {
      const { state, city, raider } = captured({ wild: true, population: 12 });
      lift(state, raider);
      const wild = barbarianPlayer(state)!;
      const kind = barbarianUnitType(state, city);
      expect(kind).not.toBeNull();
      for (let turn = 1; turn < UNREST.rebelEveryTurns; turn++) {
        expect(runEndOfTurn(state).unrest).toEqual([]);
        expect(rebelTurnsLeft(city)).toBe(UNREST.rebelEveryTurns - turn);
      }
      const report = runEndOfTurn(state);
      expect(report.unrest).toHaveLength(1);
      const rose = report.unrest[0]!;
      expect(rose.kind).toBe('rebel');
      const rebel = state.units.find((unit) => unit.id === rose.unitId)!;
      expect(rebel.ownerId).toBe(wild.id);
      expect(rebel.type).toBe(kind);
      expect(
        wrappedDistance(state.map, tileHex(at(state, city.col, city.row)), tileHex(at(state, rebel.col, rebel.row))),
      ).toBe(1);
      expect(city.unrest?.unguarded).toBe(UNREST.rebelEveryTurns);
    });
  });

  it('never rise from a town a soldier of its owner stands in', () => {
    withUnrestRules(LONG, () => {
      const { state, city } = captured({ wild: true, population: 12 });
      const wild = barbarianPlayer(state)!;
      for (let turn = 0; turn < UNREST.rebelEveryTurns * 2; turn++) {
        expect(runEndOfTurn(state).unrest).toEqual([]);
      }
      expect(city.unrest?.unguarded).toBe(0);
      expect(state.units.some((unit) => unit.ownerId === wild.id)).toBe(false);
    });
  });

  it('count unguarded turns, not a run of them: a garrisoned turn adds and takes nothing', () => {
    withUnrestRules(LONG, () => {
      const { state, city, raider } = captured({ wild: true, population: 12 });
      lift(state, raider);
      for (let turn = 1; turn < UNREST.rebelEveryTurns; turn++) expect(settle(state)).toEqual([]);
      const guard = createUnit(state, 0, 'warrior', city.col, city.row);
      expect(settle(state)).toEqual([]);
      expect(settle(state)).toEqual([]);
      expect(city.unrest?.unguarded).toBe(UNREST.rebelEveryTurns - 1);
      lift(state, guard);
      const reports = settle(state);
      expect(reports.map((report) => report.kind)).toEqual(['rebel']);
    });
  });

  it('raise none when every hex beside the town is taken, and still count the turn', () => {
    withUnrestRules(LONG, () => {
      const { state, city, raider } = captured({ wild: true, population: 12 });
      lift(state, raider);
      for (const tile of rebelGround(state, city)) createUnit(state, 0, 'worker', tile.col, tile.row);
      expect(rebelGround(state, city)).toEqual([]);
      for (let turn = 0; turn < UNREST.rebelEveryTurns; turn++) expect(settle(state)).toEqual([]);
      expect(city.unrest?.unguarded).toBe(UNREST.rebelEveryTurns);
    });
  });

  it('raise none in a world with no wild seat', () => {
    withUnrestRules(LONG, () => {
      const { state, city, raider } = captured({ wild: false, population: 12 });
      lift(state, raider);
      for (let turn = 0; turn < UNREST.rebelEveryTurns; turn++) expect(settle(state)).toEqual([]);
      expect(city.unrest?.unguarded).toBe(UNREST.rebelEveryTurns);
    });
  });
});

describe('the bot', () => {
  /**
   * The seat's decisions, applied one after another, until one is about this
   * piece — the driver's own loop, cut short at the piece in question.
   */
  function decisionFor(state: GameState, unitId: number): BotDecision | null {
    for (let guard = 0; guard < 80; guard++) {
      const decision = nextBotDecision(state, 0);
      if (decision === null) return null;
      const command = decision.command as { unitId?: number };
      if (command.unitId === unitId) return decision;
      if (!applyCommand(state, decision.command).ok) return null;
    }
    return null;
  }

  /** The seat's decisions played out until it proposes one of this type. */
  function decisionOfType(state: GameState, type: string): BotDecision | null {
    for (let guard = 0; guard < 80; guard++) {
      const decision = nextBotDecision(state, 0);
      if (decision === null) return null;
      if (decision.command.type === type) return decision;
      if (!applyCommand(state, decision.command).ok) return null;
    }
    return null;
  }

  /**
   * The captor, a turn later, with a wounded enemy next door that one blow
   * would kill — the blow that would carry it out of the town it holds.
   */
  function holding(): { state: GameState; city: City; raider: Unit; enemy: Unit } {
    const { state, city, raider } = captured({ population: 4 });
    raider.hasAttacked = false;
    raider.movesLeft = fullMovement(raider, state);
    const enemy = createUnit(state, 1, 'warrior', 7, 4);
    enemy.hp = 5;
    bumpRevision(state);
    return { state, city, raider, enemy };
  }

  it('keeps its garrison in a town in unrest rather than striking out of it', () => {
    const { state, raider, enemy } = holding();
    const decision = decisionFor(state, raider.id);
    expect(decision).not.toBeNull();
    expect(decision!.command.type).not.toBe('attack');
    expect(decision!.command.type).not.toBe('moveUnit');
    expect(decision!.summary).toContain('in unrest');
    expect(state.units.some((unit) => unit.id === enemy.id)).toBe(true);
    expect(raider.col).toBe(6);
  });

  it('strikes out of the same town once it is pacified', () => {
    // The control: without the unrest the blow is a kill and is taken, which
    // is what makes the hold above the rule's doing.
    const { state, city, raider } = holding();
    delete city.unrest;
    bumpRevision(state);
    const decision = decisionFor(state, raider.id);
    expect(decision?.command.type).toBe('attack');
  });

  it('sends a soldier to an empty town in unrest before a nearer empty town', () => {
    // Unrest settles inside the turns the raze arm waits out, so this board
    // asks only where the soldier goes.
    const { state, city, raider } = captured({ population: 2 });
    lift(state, raider);
    const home = state.cities.find((town) => town.ownerId === 0 && town.id !== city.id)!;
    const walker = createUnit(state, 0, 'warrior', home.col + 1, home.row + 1);
    bumpRevision(state);
    const decision = decisionFor(state, walker.id);
    expect(decision?.command.type).toBe('moveUnit');
    expect((decision!.command as { target: { col: number; row: number } }).target).toEqual({
      col: city.col,
      row: city.row,
    });
  });

  it('keeps an empty town in unrest that settles inside the turns it waits out', () => {
    // Three turns of unrest are fewer than the turns the raze arm waits out, so
    // at the default figures the bot never pulls a town down.
    const { state, raider } = captured({ population: 12 });
    lift(state, raider);
    bumpRevision(state);
    expect(decisionOfType(state, 'razeCity')).toBeNull();
  });

  it('pulls down a town in unrest that nobody can come and hold, and keeps one that can be held', () => {
    // A long unrest set for the test, the figure a town of twelve had before
    // the ruling, so the raze arm still has a case to act on.
    withUnrestRules({ turns: 24 }, () => {
      const { state, city, raider } = captured({ population: 12 });
      lift(state, raider);
      bumpRevision(state);
      const razed = decisionOfType(structuredClone(state), 'razeCity');
      expect((razed?.command as { cityId?: number } | undefined)?.cityId).toBe(city.id);
      expect(razed?.kind).toBe('war');

      // A soldier two hexes off can come and hold it, so it is kept.
      createUnit(state, 0, 'warrior', city.col + 2, city.row);
      bumpRevision(state);
      expect(decisionOfType(state, 'razeCity')).toBeNull();
    });
  });

  it('weighs a target’s unrest in the declaration', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state, 2, 4));
    const target = foundCityAt(state, 1, at(state, 9, 4));
    target.population = 6;
    for (let index = 0; index < 5; index++) createUnit(state, 0, 'warrior', 3 + index, 5);
    bumpRevision(state);
    const player = playerById(state, 0)!;
    const { rows } = explainDeclaration(state, player, valueContext(state, player));
    const walk = (terms: readonly ValueTerm[]): string[] =>
      terms.flatMap((term) => [term.label, ...(term.parts === undefined ? [] : walk(term.parts))]);
    const labels = rows.flatMap((row) => walk(row.terms));
    expect(labels.some((label) => label.includes(`${target.name} would sit in unrest`))).toBe(true);
  });
});

describe('the log', () => {
  /**
   * A duel in which seat 0 storms seat 1's capital with logged commands, then
   * lets its pieces in the town go, so the town is unguarded from the first
   * turn of its unrest. Returns the game, the town, and an End Turn for every
   * seat.
   */
  function stormed(): {
    game: ReturnType<typeof createGame>;
    town: City;
    endTurn: () => UnrestReport[];
  } {
    const config = {
      seed: 909,
      sizeName: 'duel' as const,
      barbarians: true,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
    const game = createGame(config);
    const endTurn = (): UnrestReport[] => {
      const reports: UnrestReport[] = [];
      for (const player of game.state.players) {
        const result = dispatch(game, { type: 'endTurn', playerId: player.id });
        if (result.ok && result.unrest) reports.push(...result.unrest);
      }
      return reports;
    };
    for (const owner of [0, 1]) {
      const settler = game.state.units.find(
        (unit) => unit.ownerId === owner && unitDef(unit.type).foundsCity === true,
      )!;
      expect(dispatch(game, { type: 'foundCity', playerId: owner, settlerUnitId: settler.id }).ok).toBe(
        true,
      );
    }
    const town = game.state.cities.find((city) => city.ownerId === 1)!;
    // A town of two, as the game this test replays has always used.
    for (let turn = 0; turn < 60 && town.population < 2; turn++) endTurn();
    expect(town.population).toBeGreaterThanOrEqual(2);
    expect(dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);

    // Strong pieces of seat 0's on the dry hexes beside seat 1's town, placed
    // by logged commands, so the storm is reproducible from the log alone.
    const ring = rebelGround(game.state, town);
    expect(ring.length).toBeGreaterThanOrEqual(3);
    for (const tile of ring.slice(0, 3)) {
      expect(
        dispatch(game, {
          type: 'spawnUnit',
          playerId: 0,
          ownerId: 0,
          unitType: 'fireLance',
          at: { col: tile.col, row: tile.row },
        }).ok,
      ).toBe(true);
    }
    for (const lance of game.state.units.filter((unit) => unit.type === 'fireLance')) {
      if (town.ownerId === 0) break;
      dispatch(game, { type: 'attack', playerId: 0, unitId: lance.id, target: { col: town.col, row: town.row } });
    }
    expect(town.ownerId).toBe(0);
    expect(inUnrest(town)).toBe(true);

    for (const piece of game.state.units.filter(
      (unit) => unit.ownerId === 0 && unit.col === town.col && unit.row === town.row,
    )) {
      expect(dispatch(game, { type: 'disbandUnit', playerId: 0, unitId: piece.id }).ok).toBe(true);
    }
    return { game, town, endTurn };
  }

  it('replays a capture and its unrest to the same state, pacified on the third End Turn', () => {
    const { game, town, endTurn } = stormed();
    const reports: UnrestReport[] = [];
    for (let turn = 0; turn < UNREST.turns; turn++) reports.push(...endTurn());
    expect(reports.map((report) => report.kind)).toEqual(['pacified']);
    expect(reports[0]!.cityId).toBe(town.id);
    expect(inUnrest(town)).toBe(false);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('replays a rebel to the same state when a test sets the cadence', () => {
    withUnrestRules({ turns: 12, rebelEveryTurns: 3 }, () => {
      const { game, town, endTurn } = stormed();
      const reports: UnrestReport[] = [];
      for (let turn = 0; turn < UNREST.rebelEveryTurns; turn++) reports.push(...endTurn());
      expect(reports.map((report) => report.kind)).toEqual(['rebel']);
      expect(reports[0]!.cityId).toBe(town.id);
      expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
    });
  });
});
