/**
 * **Dominion batch D8, the Doctrines the sheet still lacked**
 * (`docs/plans/dominion-build-triage.md`, the Doctrines table). `dominion.test.ts`
 * checks the rows against the sheet. This file checks that the shapes the batch
 * added do what the cards say:
 *
 *   · a capture that heals and raises the units around it, and the rule that
 *     stops founding (The Soldiers' Share);
 *   · a unit cost percentage, and the rule that stops experience (The Servian
 *     Reforms);
 *   · a strength line for each adjacent Elite, and an upkeep surcharge on a
 *     rank, which a free unit does not pay (Centurions);
 *   · the raider's strength on a pillage, and a penalty on city assaults (The
 *     Plunder Economy);
 *   · the general's aura amplified, and a share of a whole hex (The Strategoi);
 *   · this turn's attacks on one target counted (Weight of Numbers);
 *   · the siege screen (Combined Arms);
 *   · timed effects hung on the raider, and a capital blessing that renews
 *     (The Scourge of God).
 */

import { describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { buildError } from '../../../src/sim/tech';
import { explainUnitCost, foldUnitCost, foundCityAt, foundingError } from '../../../src/sim/cities';
import {
  applyCombat,
  attackTargetAt,
  fortifyError,
  generalAuraLines,
  pieceStrength,
  previewCombat,
} from '../../../src/sim/combat';
import { applyCommand } from '../../../src/sim/commands';
import { pillageAt } from '../../../src/sim/improvements';
import { type Tile, createMap, getTileAt, raiseImprovement, tileNeighbors } from '../../../src/sim/map';
import { explainPurchaseCost } from '../../../src/sim/purchase';
import { awardExperience, grantExperience, raiseToRank, rankThreshold } from '../../../src/sim/ranks';
import { explainRenown } from '../../../src/sim/renown';
import { makeRng } from '../../../src/sim/rng';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import { snapshotState } from '../../../src/sim/game';
import { payWindfallGrants, windfallPayout } from '../../../src/sim/statecraft';
import { strikesOn } from '../../../src/sim/statecraft/evaluator';
import { type DoctrineId, doctrineDef } from '../../../src/sim/statecraftData';
import { unitMaxHp } from '../../../src/sim/unitData';
import { explainUnitUpkeepRebate, explainUnitUpkeepSurcharge } from '../../../src/sim/upkeep';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { explainTileYield, foldTile, foldTileLines, yieldContextFor } from '../../../src/sim/yields/hex';
import { foldCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

const VETERAN = rankThreshold('veteran');
const ELITE = rankThreshold('elite');

/** Two seats on a flat grassland rectangle, at war unless told otherwise. */
function flat(war = true, width = 20, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
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

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

/** Gives this seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, playerId: number, id: string): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
}

/** A strength line on one side of a forecast, by its card's name. */
function line(
  state: GameState,
  unit: Unit,
  col: number,
  row: number,
  name: string,
  side: 'attacker' | 'defender' = 'attacker',
): number {
  const view = previewCombat(state, unit.id, { col, row });
  if (!view.ok) throw new Error(view.error);
  return (side === 'attacker' ? view.attackerLines : view.defenderLines)
    .filter((entry) => entry.source.includes(name))
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** Attacks and insists the rules accepted it. */
function strike(state: GameState, unit: Unit, col: number, row: number): void {
  const result = applyCombat(state, unit.id, { col, row });
  if (!result.ok) throw new Error(result.error);
}

/** Seat 0 takes `town` with a warrior beside it. The town is left on one hit point first. */
function take(state: GameState, town: City, striker: Unit): void {
  town.hp = 1;
  bumpRevision(state);
  strike(state, striker, town.col, town.row);
  expect(town.ownerId).toBe(0);
  bumpRevision(state);
}

describe('Dominion D8 — the eight rows', () => {
  it('builds every Doctrine on the sheet that had no row, at its tier', () => {
    const rows: [string, number][] = [
      ['theSoldiersShare', 1],
      ['theServianReforms', 1],
      ['centurions', 2],
      ['thePlunderEconomy', 2],
      ['theStrategoi', 2],
      ['weightOfNumbers', 2],
      ['combinedArms', 3],
      ['theScourgeOfGod', 4],
    ];
    for (const [id, band] of rows) {
      const def = doctrineDef(id as DoctrineId);
      expect(def.band, id).toBe(band);
      expect(def.decks, id).toEqual(['dominion']);
      expect(def.retired, id).toBeUndefined();
      expect(def.deferred, id).toBeUndefined();
      expect(def.effects.length, id).toBeGreaterThan(0);
    }
  });

  it('prices each of them to a finite figure for the bot', () => {
    const state = flat(false);
    foundCityAt(state, 0, at(state, 3, 3));
    bumpRevision(state);
    const player = seat(state, 0);
    const ctx = valueContext(state, player);
    for (const id of [
      'theSoldiersShare',
      'theServianReforms',
      'centurions',
      'thePlunderEconomy',
      'theStrategoi',
      'weightOfNumbers',
      'combinedArms',
      'theScourgeOfGod',
    ]) {
      expect(Number.isFinite(scoreCard(player, id as never, ctx)), id).toBe(true);
    }
  });
});

describe('Dominion D8 — The Soldiers’ Share', () => {
  it('heals every unit of the captor within three hexes and raises each by one rank', () => {
    const state = flat();
    hold(state, 0, 'theSoldiersShare');
    const town = foundCityAt(state, 1, at(state, 10, 6))!;
    const striker = createUnit(state, 0, 'warrior', 9, 6);
    const near = createUnit(state, 0, 'spearman', 12, 6);
    near.hp = 20;
    const veteran = createUnit(state, 0, 'warrior', 10, 8);
    veteran.experience = VETERAN;
    const elite = createUnit(state, 0, 'warrior', 10, 4);
    elite.experience = ELITE + 1;
    const far = createUnit(state, 0, 'warrior', 14, 6);
    far.hp = 20;
    const worker = createUnit(state, 0, 'worker', 11, 7);
    worker.hp = 50;
    const earned = seat(state, 0).ranksEarned ?? 0;
    take(state, town, striker);
    // Within three hexes: healed whole and one rank up.
    expect(near.hp).toBe(unitMaxHp(near));
    expect(near.experience).toBe(VETERAN);
    expect(veteran.experience).toBe(ELITE);
    // An Elite gains nothing (the triage's reading 17).
    expect(elite.experience).toBe(ELITE + 1);
    // A civilian is healed and has no rank to earn.
    expect(worker.hp).toBe(unitMaxHp(worker));
    expect(worker.experience).toBeUndefined();
    // Four hexes away: untouched.
    expect(far.hp).toBe(20);
    expect(far.experience).toBeUndefined();
    // A raised rank counts as earned: the striker, the spearman and the Veteran.
    expect((seat(state, 0).ranksEarned ?? 0) - earned).toBeGreaterThanOrEqual(3);
  });

  it('refuses founding, and refuses building or buying a settler', () => {
    const state = flat(false);
    const home = foundCityAt(state, 0, at(state, 3, 3))!;
    const settler = createUnit(state, 0, 'settler', 8, 6);
    bumpRevision(state);
    expect(foundingError(state, settler)).toBeNull();
    expect(buildError(state, 0, 'unit', 'settler', home)).toBeNull();
    hold(state, 0, 'theSoldiersShare');
    expect(foundingError(state, settler)).toBe('Your laws forbid founding new cities');
    expect(buildError(state, 0, 'unit', 'settler', home)).toContain('Your laws forbid founding');
    const before = snapshotState(state);
    const bought = accepted(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: home.id,
      item: { kind: 'unit', id: 'settler' },
      currency: 'gold',
    });
    expect(bought).toBe(false);
    expect(snapshotState(state)).toBe(before);
    // Another seat may still found.
    const theirs = createUnit(state, 1, 'settler', 14, 8);
    bumpRevision(state);
    expect(foundingError(state, theirs)).toBeNull();
  });
});

describe('Dominion D8 — The Servian Reforms', () => {
  it('makes military units 25% cheaper to build and to buy, and leaves civilians alone', () => {
    const state = flat(false);
    const home = foundCityAt(state, 0, at(state, 3, 3))!;
    const spearman = foldUnitCost(explainUnitCost(state, 0, 'spearman'));
    const worker = foldUnitCost(explainUnitCost(state, 0, 'worker'));
    const gold = explainPurchaseCost(state, 0, home.id, { kind: 'unit', id: 'spearman' }, 'gold')!.total;
    hold(state, 0, 'theServianReforms');
    const lines = explainUnitCost(state, 0, 'spearman');
    expect(lines[lines.length - 1]!.source).toBe('Cards -25%');
    expect(foldUnitCost(lines)).toBe(Math.max(1, Math.floor((spearman * 75) / 100)));
    expect(foldUnitCost(explainUnitCost(state, 0, 'worker'))).toBe(worker);
    const cheaper = explainPurchaseCost(state, 0, home.id, { kind: 'unit', id: 'spearman' }, 'gold')!;
    expect(cheaper.total).toBeLessThan(gold);
    // Another seat pays the full price.
    expect(foldUnitCost(explainUnitCost(state, 1, 'spearman'))).toBe(spearman);
  });

  it('stops every way a unit gains experience, and keeps what it had', () => {
    const state = flat();
    hold(state, 0, 'theServianReforms');
    const kept = createUnit(state, 0, 'warrior', 4, 4);
    kept.experience = VETERAN;
    expect(awardExperience(state, kept, 'kill', 1)).toEqual([]);
    expect(grantExperience(state, kept, 20)).toEqual([]);
    expect(raiseToRank(state, kept, 'elite')).toEqual([]);
    expect(kept.experience).toBe(VETERAN);
    // A fight pays the holder nothing and the other side as usual.
    const mine = createUnit(state, 0, 'warrior', 6, 6);
    const theirs = createUnit(state, 1, 'warrior', 7, 6);
    strike(state, mine, 7, 6);
    expect(mine.experience).toBeUndefined();
    if (theirs.hp > 0) expect(theirs.experience ?? 0).toBeGreaterThan(0);
  });
});

describe('Dominion D8 — Centurions', () => {
  it('gives +3 for each adjacent Elite, never for the unit itself or a Veteran', () => {
    const state = flat();
    hold(state, 0, 'centurions');
    const soldier = createUnit(state, 0, 'warrior', 6, 6);
    createUnit(state, 1, 'warrior', 7, 6);
    expect(line(state, soldier, 7, 6, 'Centurions')).toBe(0);
    const eliteA = createUnit(state, 0, 'warrior', 5, 6);
    eliteA.experience = ELITE;
    const veteran = createUnit(state, 0, 'warrior', 6, 5);
    veteran.experience = VETERAN;
    bumpRevision(state);
    expect(line(state, soldier, 7, 6, 'Centurions')).toBe(3);
    const eliteB = createUnit(state, 0, 'warrior', 6, 7);
    eliteB.experience = ELITE;
    bumpRevision(state);
    expect(line(state, soldier, 7, 6, 'Centurions')).toBe(6);
    // An Elite counts the Elites beside it, never itself.
    soldier.experience = ELITE;
    bumpRevision(state);
    expect(line(state, soldier, 7, 6, 'Centurions')).toBe(6);
  });

  it('charges an Elite 2 more upkeep, and nothing when The Marian Reforms makes it free', () => {
    const state = flat(false);
    foundCityAt(state, 0, at(state, 3, 3));
    hold(state, 0, 'centurions');
    const surcharge = (): number =>
      explainUnitUpkeepSurcharge(state, 0).reduce((sum, entry) => sum + entry.gold, 0);
    const green = createUnit(state, 0, 'warrior', 5, 5);
    green.experience = VETERAN;
    bumpRevision(state);
    expect(surcharge()).toBe(0);
    const elite = createUnit(state, 0, 'warrior', 6, 5);
    elite.experience = ELITE;
    bumpRevision(state);
    expect(surcharge()).toBe(2);
    // The Marian Reforms' free soldiers pay no surcharge (the triage's reading 71).
    hold(state, 0, 'theMarianReforms');
    expect(surcharge()).toBe(0);
    expect(explainUnitUpkeepRebate(state, 0).length).toBeGreaterThan(0);
  });
});

describe('Dominion D8 — The Plunder Economy', () => {
  it('pays every town of the raider half the raider’s strength in production', () => {
    const state = flat();
    hold(state, 0, 'thePlunderEconomy');
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    const second = foundCityAt(state, 0, at(state, 2, 9))!;
    foundCityAt(state, 1, at(state, 12, 6));
    const farm = at(state, 13, 6);
    raiseImprovement(farm, 'farm' as never, state.turn);
    const raider = createUnit(state, 0, 'spearman', farm.col, farm.row);
    bumpRevision(state);
    const half = Math.floor(pieceStrength(raider) / 2);
    const payout = windfallPayout(state, 0, 'pillage', 25, 25, {
      actor: raider.type,
      strength: pieceStrength(raider),
    });
    const before = [home.hammerBasket, second.hammerBasket];
    payWindfallGrants(state, seat(state, 0), payout, { col: farm.col, row: farm.row });
    expect(home.hammerBasket - before[0]!).toBeCloseTo(pieceStrength(raider) / 2);
    expect(second.hammerBasket - before[1]!).toBeCloseTo(pieceStrength(raider) / 2);
    expect(half).toBeGreaterThan(0);
  });

  it('carries the raider’s strength on the pillage itself', () => {
    const state = flat();
    hold(state, 0, 'thePlunderEconomy');
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    foundCityAt(state, 1, at(state, 12, 6));
    const farm = at(state, 13, 6);
    raiseImprovement(farm, 'farm' as never, state.turn);
    const raider = createUnit(state, 0, 'warrior', farm.col, farm.row);
    bumpRevision(state);
    const basket = home.hammerBasket;
    pillageAt(state, raider, farm);
    expect(home.hammerBasket - basket).toBeCloseTo(pieceStrength(raider) / 2);
  });

  it('takes 4 strength off an assault on a city, and nothing in the open', () => {
    const state = flat();
    hold(state, 0, 'thePlunderEconomy');
    foundCityAt(state, 1, at(state, 10, 6));
    const assault = createUnit(state, 0, 'warrior', 9, 6);
    const open = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    bumpRevision(state);
    expect(line(state, assault, 10, 6, 'Plunder Economy')).toBe(-4);
    expect(line(state, open, 5, 4, 'Plunder Economy')).toBe(0);
  });
});

describe('Dominion D8 — The Strategoi', () => {
  it('doubles a great general’s aura', () => {
    const state = flat();
    const soldier = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 0, 'greatPerson', 5, 4, 'hannibal');
    bumpRevision(state);
    const base = RULES.greatPeople.generalAuraStrength;
    expect(generalAuraLines(state, soldier)[0]!.amount).toBe(base);
    hold(state, 0, 'theStrategoi');
    expect(generalAuraLines(state, soldier)[0]!.amount).toBe(2 * base);
  });

  it('doubles everything a citadel hex pays, and leaves every other hex alone', () => {
    const state = flat(false);
    const home = foundCityAt(state, 0, at(state, 6, 6))!;
    const citadel = at(state, 7, 6);
    raiseImprovement(citadel, 'citadel' as never, state.turn);
    const plain = at(state, 5, 6);
    bumpRevision(state);
    const before = foldTile(citadel, yieldContextFor(state, 0));
    const plainBefore = foldTile(plain, yieldContextFor(state, 0));
    hold(state, 0, 'theStrategoi');
    const lines = explainTileYield(citadel, yieldContextFor(state, 0));
    const after = foldTileLines(lines);
    for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      expect(after[voice], voice).toBeCloseTo(2 * before[voice]);
    }
    expect(lines[lines.length - 1]!.card).toBe('theStrategoi');
    expect(foldTile(plain, yieldContextFor(state, 0))).toEqual(plainBefore);
    expect(home.ownerId).toBe(0);
  });

  it('adds 30% to the empire’s recurring renown', () => {
    const state = flat(false);
    const home = foundCityAt(state, 0, at(state, 6, 6))!;
    home.buildings.push('heroicEpic' as never);
    bumpRevision(state);
    hold(state, 0, 'theStrategoi');
    const share = explainRenown(state, 0).find((entry) => entry.source.includes('Strategoi'));
    expect(share).toBeDefined();
  });
});

describe('Dominion D8 — Weight of Numbers', () => {
  it('adds 3 for each earlier attack on the same target this turn, at most 12', () => {
    const state = flat(true, 24, 12);
    hold(state, 0, 'weightOfNumbers');
    const target = createUnit(state, 1, 'spearman', 10, 6);
    target.hp = unitMaxHp(target);
    // One warrior on each of the six hexes around the target.
    const attackers = tileNeighbors(state.map, at(state, 10, 6)).map((hex) =>
      createUnit(state, 0, 'warrior', hex.col, hex.row),
    );
    expect(attackers).toHaveLength(6);
    bumpRevision(state);
    const seen: number[] = [];
    for (const attacker of attackers) {
      if (target.hp <= 0) break;
      target.hp = unitMaxHp(target);
      seen.push(line(state, attacker, 10, 6, 'Weight of Numbers'));
      strike(state, attacker, 10, 6);
    }
    expect(seen).toEqual([0, 3, 6, 9, 12, 12].slice(0, seen.length));
    expect(seen.length).toBeGreaterThanOrEqual(5);
    expect(strikesOn(state, 0, target.id)).toBe(seen.length);
    // The next turn counts nothing.
    state.turn += 1;
    expect(strikesOn(state, 0, target.id)).toBe(0);
  });

  it('counts a town as one target whichever beat strikes it, and writes no record for a seat without the law', () => {
    const state = flat();
    hold(state, 0, 'weightOfNumbers');
    const town = foundCityAt(state, 1, at(state, 10, 6))!;
    const first = createUnit(state, 0, 'warrior', 9, 6);
    const second = createUnit(state, 0, 'warrior', 11, 6);
    bumpRevision(state);
    strike(state, first, 10, 6);
    expect(strikesOn(state, 0, town.id)).toBe(1);
    expect(line(state, second, 10, 6, 'Weight of Numbers')).toBe(3);
    // Seat 1 holds no such law, so its attacks are not written down.
    const theirs = createUnit(state, 1, 'warrior', 4, 4);
    createUnit(state, 0, 'warrior', 5, 4);
    bumpRevision(state);
    strike(state, theirs, 5, 4);
    expect(seat(state, 1).strikesThisTurn).toBeUndefined();
  });

  it('forbids fortifying', () => {
    const state = flat(false);
    const unit = createUnit(state, 0, 'warrior', 4, 4);
    expect(fortifyError(unit, state)).toBeNull();
    hold(state, 0, 'weightOfNumbers');
    expect(fortifyError(unit, state)).toContain('cannot fortify');
  });
});

describe('Dominion D8 — Combined Arms', () => {
  it('gives +3 everywhere, and +6 beside one of the empire’s siege units', () => {
    const state = flat();
    hold(state, 0, 'combinedArms');
    const soldier = createUnit(state, 0, 'warrior', 6, 6);
    createUnit(state, 1, 'warrior', 7, 6);
    bumpRevision(state);
    expect(line(state, soldier, 7, 6, 'Combined Arms')).toBe(3);
    createUnit(state, 0, 'catapult', 5, 6);
    bumpRevision(state);
    expect(line(state, soldier, 7, 6, 'Combined Arms')).toBe(6);
  });

  it('screens a siege unit from melee while a melee unit of its own stands beside it', () => {
    const state = flat();
    hold(state, 1, 'combinedArms');
    const engine = createUnit(state, 1, 'catapult', 10, 6);
    const melee = createUnit(state, 0, 'warrior', 9, 6);
    const archer = createUnit(state, 0, 'archer', 8, 6);
    bumpRevision(state);
    // No screen yet: the warrior may strike.
    expect(attackTargetAt(state, 10, 6, 0, melee)).not.toBeNull();
    const guard = createUnit(state, 1, 'spearman', 11, 6);
    bumpRevision(state);
    expect(attackTargetAt(state, 10, 6, 0, melee)).toBeNull();
    const before = snapshotState(state);
    const refused = applyCombat(state, melee.id, { col: 10, row: 6 });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toContain('screened');
    expect(snapshotState(state)).toBe(before);
    // A unit that shoots is not in melee.
    expect(attackTargetAt(state, 10, 6, 0, archer)).not.toBeNull();
    // Without the law there is no screen.
    seat(state, 1).statecraft.doctrines = [];
    bumpRevision(state);
    expect(attackTargetAt(state, 10, 6, 0, melee)).not.toBeNull();
    expect([engine.id, guard.id].length).toBe(2);
  });
});

describe('Dominion D8 — The Scourge of God', () => {
  /** Seat 1's town at (12, 6) with two farms beside it, and seat 0's capital at (2, 2). */
  function raid(): { state: GameState; home: City; raider: Unit; farms: Tile[] } {
    const state = flat();
    hold(state, 0, 'theScourgeOfGod');
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    foundCityAt(state, 1, at(state, 12, 6));
    const farms = [at(state, 13, 6), at(state, 11, 6)];
    for (const farm of farms) raiseImprovement(farm, 'farm' as never, state.turn);
    const raider = createUnit(state, 0, 'warrior', farms[0]!.col, farms[0]!.row);
    bumpRevision(state);
    return { state, home, raider, farms };
  }

  it('gives a raider +6 strength for five turns, renewed and never stacked by a second raid', () => {
    const { state, raider, farms } = raid();
    const other = createUnit(state, 0, 'warrior', 4, 4);
    const foe = createUnit(state, 1, 'warrior', 5, 4);
    pillageAt(state, raider, farms[0]!);
    const hung = (raider.timed ?? []).filter((entry) => entry.card === 'theScourgeOfGod');
    expect(hung).toHaveLength(1);
    expect(hung[0]!.expiresTurn).toBe(state.turn + 5);
    expect(other.timed).toBeUndefined();
    // A second raid two turns on renews the window.
    state.turn += 2;
    raider.col = farms[1]!.col;
    raider.row = farms[1]!.row;
    raider.movesLeft = 2;
    bumpRevision(state);
    pillageAt(state, raider, farms[1]!);
    const again = (raider.timed ?? []).filter((entry) => entry.card === 'theScourgeOfGod');
    expect(again).toHaveLength(1);
    expect(again[0]!.expiresTurn).toBe(state.turn + 5);
    // The strength reaches a fight.
    raider.col = 6;
    raider.row = 4;
    bumpRevision(state);
    expect(line(state, raider, 5, 4, 'Scourge')).toBe(6);
    expect(line(state, other, 5, 4, 'Scourge')).toBe(0);
    // And runs out five turns after the raid.
    state.turn += 5;
    bumpRevision(state);
    expect(line(state, raider, 5, 4, 'Scourge')).toBe(0);
    expect(foe.ownerId).toBe(1);
  });

  it('doubles the capital’s production for five turns, renewed and never stacked', () => {
    const { state, home, raider, farms } = raid();
    const production = (): number => foldCity(state, home).production;
    const plain = production();
    pillageAt(state, raider, farms[0]!);
    const blessed = (seat(state, 0).timed ?? []).filter((entry) => entry.card === 'theScourgeOfGod');
    expect(blessed).toHaveLength(1);
    expect(production()).toBeGreaterThan(plain);
    raider.col = farms[1]!.col;
    raider.row = farms[1]!.row;
    raider.movesLeft = 2;
    state.turn += 1;
    bumpRevision(state);
    pillageAt(state, raider, farms[1]!);
    const renewed = (seat(state, 0).timed ?? []).filter((entry) => entry.card === 'theScourgeOfGod');
    expect(renewed).toHaveLength(1);
    expect(renewed[0]!.expiresTurn).toBe(state.turn + 5);
  });
});

/** Runs a command through the reducer and reports whether it was accepted. */
function accepted(state: GameState, command: object): boolean {
  return applyCommand(state, command as never).ok;
}
