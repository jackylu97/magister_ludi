/**
 * **Dominion batch D2, "ranks read, and combat rules"**
 * (`docs/plans/dominion-build-triage.md`). `dominion.test.ts` checks the nine
 * rows against the sheet; this file checks that the shapes the batch added do
 * what the cards say:
 *
 *   · a card reads a unit's rank: The Tagmata's strength, The Keshik's movement,
 *     The Soldiers' Purse's upkeep (once per rank), and The Fabricae's town
 *     scope (a garrison holding a rank);
 *   · Interior Lines: a road step 40% cheaper, adding with Machinery's, and +4
 *     strength for an attacker that has not moved;
 *   · The Marching Camps: an attack keeps the attacker's fortification;
 *   · The Swift Riders: a mounted attacker pays one point and keeps the rest;
 *   · The Varangian Guard: an Elite attacks exactly twice a turn, beside Blitz's
 *     refill and as a hit-and-run hull too, and twice again the next turn;
 *   · The Great Bombards: a siege unit's blow on the walls takes the town to its
 *     floor, in the forecast and in the fight.
 *
 * Dominion batch D9 retired The Keshik and The Marching Camps. A save may still
 * hold either, so their shapes are still checked here by seating them directly.
 */

import { describe, expect, it } from 'vitest';

import { applyCombat, cityMaxHp, previewCombat } from '../../../src/sim/combat';
import { foundCityAt } from '../../../src/sim/cities';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { moveProfile } from '../../../src/sim/pathfind';
import { rankThreshold } from '../../../src/sim/ranks';
import { makeRng } from '../../../src/sim/rng';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import { describeCard, explainCardPercentYields, stripRefs } from '../../../src/sim/statecraft';
import { cardUpkeepRebateLines } from '../../../src/sim/statecraft/evaluator';
import { type DoctrineId, type OrderId } from '../../../src/sim/statecraftData';
import { fullMovement } from '../../../src/sim/units';
import { unitUpkeepOf } from '../../../src/sim/upkeep';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';

const VETERAN = rankThreshold('veteran');
const ELITE = rankThreshold('elite');

/** Two seats on a flat grassland rectangle, at war unless told otherwise. */
function flat(war = true): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
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
  state.rng = makeRng(12345);
  if (war) {
    const seats = realPlayers(state);
    openWar(state, seats[0]!.id, seats[1]!.id);
  }
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** A strength line on the attacker's side of a forecast, by its card's name. */
function attackLine(state: GameState, unit: Unit, col: number, row: number, name: string): number {
  const view = previewCombat(state, unit.id, { col, row });
  if (!view.ok) throw new Error(view.error);
  return view.attackerLines
    .filter((line) => line.source.includes(name))
    .reduce((sum, line) => sum + line.amount, 0);
}

/** Attacks and insists the rules accepted it. */
function strike(state: GameState, unit: Unit, col: number, row: number): void {
  const result = applyCombat(state, unit.id, { col, row });
  if (!result.ok) throw new Error(result.error);
}

describe('Dominion D2 — a card reads a rank', () => {
  it('The Tagmata strengthen Veterans and Elites, attacking and defending', () => {
    const state = flat();
    slot(state, 0, 'theTagmata');
    const plain = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    expect(attackLine(state, plain, 5, 4, 'Tagmata')).toBe(0);
    const veteran = createUnit(state, 0, 'warrior', 4, 6);
    veteran.experience = VETERAN;
    createUnit(state, 1, 'warrior', 5, 6);
    expect(attackLine(state, veteran, 5, 6, 'Tagmata')).toBe(5);
    // Defending: a rival strikes a Veteran of the card's empire.
    const rival = createUnit(state, 1, 'warrior', 3, 6);
    const view = previewCombat(state, rival.id, { col: 4, row: 6 });
    if (!view.ok) throw new Error(view.error);
    const defending = view.defenderLines
      .filter((line) => line.source.includes('Tagmata'))
      .reduce((sum, line) => sum + line.amount, 0);
    expect(defending).toBe(5);
  });

  it('The Keshik give mounted Veterans and Elites one more point of movement', () => {
    const state = flat(false);
    slot(state, 0, 'theKeshik');
    const green = createUnit(state, 0, 'horseman', 4, 4);
    const veteran = createUnit(state, 0, 'horseman', 6, 4);
    veteran.experience = VETERAN;
    const footman = createUnit(state, 0, 'warrior', 8, 4);
    footman.experience = ELITE;
    expect(fullMovement(veteran, state)).toBe(fullMovement(green, state) + 1);
    expect(fullMovement(footman, state)).toBe(fullMovement(createUnit(state, 0, 'warrior', 9, 4), state));
  });

  it('The Soldiers’ Purse takes a coin off for each rank, never more than the unit costs', () => {
    const state = flat(false);
    slot(state, 0, 'theSoldiersPurse');
    const rebate = (): number =>
      cardUpkeepRebateLines(state, 0, unitUpkeepOf).reduce((sum, line) => sum + line.gold, 0);
    // A third-age knight costs three; an Elite takes two off it.
    const knight = createUnit(state, 0, 'knight', 4, 4);
    expect(unitUpkeepOf(knight)).toBeGreaterThanOrEqual(2);
    expect(rebate()).toBe(0);
    knight.experience = VETERAN;
    expect(rebate()).toBe(1);
    knight.experience = ELITE;
    expect(rebate()).toBe(2);
    // A first-age warrior costs one, so an Elite warrior's two is one.
    const warrior = createUnit(state, 0, 'warrior', 6, 4);
    warrior.experience = ELITE;
    expect(unitUpkeepOf(warrior)).toBe(1);
    expect(rebate()).toBe(2 + 1);
  });

  it('The Fabricae speed a town whose garrison holds a rank', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theFabricae');
    const production = (): number =>
      explainCardPercentYields(state, city)
        .filter((line) => line.yield === 'production')
        .reduce((sum, line) => sum + line.percent, 0);
    const guard = createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    expect(production()).toBe(0);
    guard.experience = VETERAN;
    bumpRevision(state);
    expect(production()).toBe(25);
    guard.experience = ELITE;
    bumpRevision(state);
    expect(production()).toBe(25);
  });
});

describe('Dominion D2 — Interior Lines', () => {
  it('makes a road step 40% cheaper, adding with Machinery’s', () => {
    const state = flat(false);
    foundCityAt(state, 0, at(state, 2, 2));
    const unit = createUnit(state, 0, 'warrior', 4, 4);
    // A third of a move by default (`roadStepCost`).
    const base = moveProfile(state, unit).roadStep ?? Number.NaN;
    expect(base).toBeCloseTo(1 / 3, 10);
    slot(state, 0, 'interiorLines');
    expect(moveProfile(state, unit).roadStep).toBeCloseTo(base * 0.6, 10);
    // Machinery's −40 and the card's add to −80: a fifteenth of a move.
    playerById(state, 0)!.techsResearched.push('machinery' as never);
    bumpRevision(state);
    expect(moveProfile(state, unit).roadStep).toBeCloseTo(1 / 15, 10);
  });

  it('gives +4 to an attacker that has not moved this turn, and nothing after it moves', () => {
    const state = flat();
    slot(state, 0, 'interiorLines');
    const unit = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    expect(attackLine(state, unit, 5, 4, 'Interior Lines')).toBe(4);
    unit.movesLeft = fullMovement(unit, state) - 1;
    bumpRevision(state);
    expect(attackLine(state, unit, 5, 4, 'Interior Lines')).toBe(0);
  });
});

describe('Dominion D2 — the attack rules', () => {
  /**
   * Seat 1's town at (8, 5), walled and at full strength, so no single blow
   * takes it to the floor, and seat 0's piece beside it at (7, 5).
   */
  function siege(type: string, card?: string): { state: GameState; town: City; piece: Unit } {
    const state = flat();
    const town = foundCityAt(state, 1, at(state, 8, 5))!;
    for (const wall of ['palisade', 'stoneWalls', 'castle']) town.buildings.push(wall as never);
    town.hp = cityMaxHp(town);
    const piece = createUnit(state, 0, type as never, 7, 5);
    if (card) slot(state, 0, card);
    bumpRevision(state);
    return { state, town, piece };
  }

  it('The Marching Camps keep an attacker dug in', () => {
    const without = siege('knight');
    without.piece.fortifiedTurns = 2;
    strike(without.state, without.piece, 8, 5);
    expect(without.piece.fortifiedTurns).toBeUndefined();
    const camps = siege('knight', 'dominionMarchDiscipline');
    camps.piece.fortifiedTurns = 2;
    strike(camps.state, camps.piece, 8, 5);
    expect(camps.piece.fortifiedTurns).toBe(2);
  });

  it('The Swift Riders let a mounted attacker keep all but one point', () => {
    const without = siege('knight');
    strike(without.state, without.piece, 8, 5);
    expect(without.piece.movesLeft).toBe(0);
    const riders = siege('knight', 'theSwiftRiders');
    const full = riders.piece.movesLeft;
    strike(riders.state, riders.piece, 8, 5);
    expect(riders.piece.movesLeft).toBe(full - RULES.naval.hitAndRunCost);
    expect(riders.piece.hasAttacked).toBe(true);
    // A foot soldier is not mounted, and pays the whole turn.
    const foot = siege('swordsman', 'theSwiftRiders');
    strike(foot.state, foot.piece, 8, 5);
    expect(foot.piece.movesLeft).toBe(0);
  });

  it('The Great Bombards take a town’s walls to the floor in one blow', () => {
    const without = siege('catapult');
    const plain = previewCombat(without.state, without.piece.id, { col: 8, row: 5 });
    if (!plain.ok) throw new Error(plain.error);
    expect(plain.damageToDefenderMax).toBeLessThan(without.town.hp - 1);
    strike(without.state, without.piece, 8, 5);
    expect(without.town.hp).toBeGreaterThan(1);
    const bombards = siege('catapult', 'theGreatBombards');
    const view = previewCombat(bombards.state, bombards.piece.id, { col: 8, row: 5 });
    if (!view.ok) throw new Error(view.error);
    expect(view.damageToDefenderMin).toBe(bombards.town.hp - 1);
    expect(view.damageToDefenderMax).toBe(bombards.town.hp - 1);
    strike(bombards.state, bombards.piece, 8, 5);
    expect(bombards.town.hp).toBe(1);
    // A knight is no siege unit, and batters as it always did.
    const knight = siege('knight', 'theGreatBombards');
    strike(knight.state, knight.piece, 8, 5);
    expect(knight.town.hp).toBeGreaterThan(1);
  });
});

describe('Dominion D2 — The Varangian Guard', () => {
  it('gives an Elite exactly two attacks a turn, and two again the next turn', () => {
    const state = flat();
    // An enemy knight: close enough in strength that two blows leave it standing.
    const target = createUnit(state, 1, 'knight', 8, 5);
    const elite = createUnit(state, 0, 'knight', 7, 5);
    elite.experience = ELITE;
    slot(state, 0, 'theVarangianGuard');
    const full = elite.movesLeft;
    strike(state, elite, 8, 5);
    expect(elite.hasAttacked).toBe(false);
    expect(elite.firstAttackTurn).toBe(state.turn);
    expect(elite.movesLeft).toBe(full - RULES.naval.hitAndRunCost);
    strike(state, elite, 8, 5);
    expect(elite.hasAttacked).toBe(true);
    expect(state.units).toContain(target);
    // The second attack ended the turn as any attack does.
    expect(elite.movesLeft).toBe(0);
    expect(applyCombat(state, elite.id, { col: 8, row: 5 }).ok).toBe(false);
    // The next turn: the stamp is an earlier turn, so the first attack is a
    // first again.
    state.turn += 1;
    elite.hasAttacked = false;
    elite.movesLeft = full;
    elite.hp = 100;
    target.hp = 100;
    bumpRevision(state);
    strike(state, elite, 8, 5);
    expect(elite.hasAttacked).toBe(false);
    expect(elite.firstAttackTurn).toBe(state.turn);
    strike(state, elite, 8, 5);
    expect(elite.hasAttacked).toBe(true);
  });

  it('gives a Veteran one attack, and writes nothing for it', () => {
    const state = flat();
    createUnit(state, 1, 'knight', 8, 5);
    const veteran = createUnit(state, 0, 'knight', 7, 5);
    veteran.experience = VETERAN;
    slot(state, 0, 'theVarangianGuard');
    strike(state, veteran, 8, 5);
    expect(veteran.hasAttacked).toBe(true);
    expect(veteran.firstAttackTurn).toBeUndefined();
  });

  it('stops at two beside Blitz’s refill on a kill', () => {
    const state = flat();
    const elite = createUnit(state, 0, 'knight', 4, 5);
    elite.experience = ELITE;
    slot(state, 0, 'theVarangianGuard');
    // Blitz (a retired Doctrine) refills a killer's movement.
    playerById(state, 0)!.statecraft.doctrines.push('blitz' as DoctrineId);
    bumpRevision(state);
    // Three weak riders in a row: each kill walks the knight into the next hex.
    for (const col of [5, 6, 7]) createUnit(state, 1, 'warrior', col, 5).hp = 1;
    strike(state, elite, 5, 5);
    expect(elite.hasAttacked).toBe(false);
    expect(elite.movesLeft).toBe(fullMovement(elite, state));
    strike(state, elite, elite.col + 1, 5);
    expect(elite.hasAttacked).toBe(true);
    expect(elite.movesLeft).toBe(fullMovement(elite, state));
    // Movement left, but the two attacks are spent.
    const third = applyCombat(state, elite.id, { col: elite.col + 1, row: 5 });
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.error).toMatch(/already attacked/);
  });

  it('stops at two for a hit-and-run hull', () => {
    const state = flat();
    // A strip of sea down column 9, so seat 1's town at (8, 5) is on the coast.
    for (let row = 0; row < 10; row++) at(state, 9, row).terrain = 'ocean' as never;
    resetVisibility(state);
    foundCityAt(state, 1, at(state, 8, 5));
    const hull = createUnit(state, 0, 'caravel', 9, 5);
    hull.experience = ELITE;
    slot(state, 0, 'theVarangianGuard');
    strike(state, hull, 8, 5);
    expect(hull.hasAttacked).toBe(false);
    strike(state, hull, 8, 5);
    expect(hull.hasAttacked).toBe(true);
    // The hull keeps its movement after each blow, and still has no third.
    expect(hull.movesLeft).toBeGreaterThan(0);
    const third = applyCombat(state, hull.id, { col: 8, row: 5 });
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.error).toMatch(/already attacked/);
  });
});

describe('Dominion D2 — the words', () => {
  it('describes each card in a first-time player’s words', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theSoldiersPurse')).toEqual([
      'military units cost 1 less gold in maintenance for each rank they hold',
    ]);
    expect(said('dominionMarchDiscipline')).toEqual([
      'attacking does not break your units’ fortification',
    ]);
    expect(said('theSwiftRiders')).toEqual(['mounted units may move after attacking']);
    expect(said('theFabricae')).toEqual([
      '+25% production in every city with a Veteran or better standing in it',
    ]);
    expect(said('theTagmata')).toEqual(['+5 combat strength as a Veteran or better']);
    expect(said('theKeshik')).toEqual(['mounted units that are a Veteran or better: +1 movement']);
    // The road clause is said as the price of a step since D3 (the
    // coordinator's fix to the `roadStepCost` words).
    expect(said('interiorLines')).toEqual([
      'a step along a road costs 40% less movement',
      '+4 combat strength when it has not moved this turn',
    ]);
    expect(said('theVarangianGuard')).toEqual(['Elite units may attack twice a turn']);
    expect(said('theGreatBombards')).toEqual(['siege units break a town’s walls in one blow']);
  });
});
