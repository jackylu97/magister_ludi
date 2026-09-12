/**
 * **The leaders' unit rules** — batch L3b, `docs/flags.md` (iiii), spec of
 * record `docs/leaders.md`.
 *
 * Six uniques and one leader bonus whose halves the evaluator could not say
 * when L2a built the decks. Each is now a rule somewhere the game already
 * decides something — a marker on a roster row read inside `stepCost`, a
 * narrowing on a rebate, a strength line on `planCombat`'s one ledger, a filter
 * on a windfall rider — and every test below is the same claim twice: **the
 * rule fires where it should, and not where it should not.**
 *
 * The pairs are the point. A slinger against an archer on the same hill; a
 * fubing in the gate against the same fubing in the field; a khopesh on a
 * following town's third ring against a khopesh out in the wild; a horse archer
 * beside the Guard against one two hexes off; the camel's arrows with no works
 * and with three, and a work in the capital against a work in a colony; a
 * peltast's kill against a warrior's; a horse on the grass
 * against the same horse in the hills. A rule pinned only where it fires is a
 * rule nobody has checked is a rule at all.
 *
 * **Core, not slow**: a duel-sized blank board, no seeds swept and no decades
 * simulated.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, tileOwnerCityId } from '../../src/sim/cities';
import { type Tile, createMap, getTile, getTileAt, mapNeighbors, tileHex } from '../../src/sim/map';
import { moveProfile, stepCost, zocField } from '../../src/sim/pathfind';
import { foundReligion } from '../../src/sim/religion';
import { applyCombat } from '../../src/sim/combat';
import {
  type GameState,
  type Unit,
  bumpRevision,
  capitalCityOf,
  createUnit,
  newGame,
  playerById,
} from '../../src/sim/state';
import {
  type CombatSituation,
  cardCombatLines,
  liveEffects,
  windfallPayout,
} from '../../src/sim/statecraft';
import { LEADER_IDS, type LeaderId, leaderDef } from '../../src/sim/leaderData';
import { moveCost } from '../../src/sim/terrainData';
import { fullMovement } from '../../src/sim/units';
import { type UnitTypeId, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { openEveryWar } from './warHelpers';

// --- the bench ---------------------------------------------------------------

/**
 * A blank grassland board, two seats at war, the first playing `leader`.
 *
 * Nothing is written onto the seat any more (batch L6a): a figure's abilities
 * and its unique's own rules are in the law from the turn it sits down, so
 * naming the figure in the roster is the whole of the bench. The rules below are
 * the rows' (`UnitDef.effects`) and the sheets', and that they *arrive* is
 * `leaders.test.ts`' claim, pinned there once.
 */
function board(leader?: LeaderId, width = 14, height = 12): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, ...(leader ? { leader } : {}) },
      { name: 'Bors', color: '#3a7fe8', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  openEveryWar(state);
  bumpRevision(state);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function piece(state: GameState, type: UnitTypeId, tile: Tile, ownerId = 0): Unit {
  return createUnit(state, ownerId, type, tile.col, tile.row);
}

/** What one step from `from` to `to` costs this piece, everything included. */
function priceOfStep(state: GameState, unit: Unit, from: Tile, to: Tile): number {
  const price = stepCost(state.map, from, to, moveProfile(state, unit), zocField(state, unit.ownerId));
  if (!price) throw new Error('impassable');
  return price.cost;
}

/** A fight this piece is in, with nothing on the other side that matters. */
function situation(unit: Unit, tile: Tile, side: 'attack' | 'defend' = 'attack'): CombatSituation {
  return {
    unit,
    side,
    tile,
    vsBarbarians: false,
    vsCity: false,
    targetHp: 100,
    targetMaxHp: 100,
  };
}

/** What this empire's cards are worth to that piece in that fight, in points. */
function cardStrength(state: GameState, unit: Unit, tile: Tile, side: 'attack' | 'defend' = 'attack'): number {
  let total = 0;
  for (const line of cardCombatLines(state, situation(unit, tile, side))) total += line.amount;
  return total;
}

/** A blow struck the way the reducer strikes one. Answers whether it landed. */
function blow(state: GameState, attacker: Unit, target: Tile): boolean {
  return applyCombat(state, attacker.id, { col: target.col, row: target.row }).ok;
}

/** The six hexes around one, in the map's own order. */
function ring(state: GameState, tile: Tile): Tile[] {
  const out: Tile[] = [];
  for (const hex of mapNeighbors(state.map, tileHex(tile))) {
    const found = getTile(state.map, hex);
    if (found) out.push(found);
  }
  return out;
}

// --- Pachacuti's Slinger -----------------------------------------------------

describe('Pachacuti’s Slinger — the hills do not slow it', () => {
  it('pays a hill what the flat land under it costs, where an archer pays the climb', () => {
    const state = board('pachacuti');
    const from = at(state, 5, 5);
    const hill = ring(state, from)[0]!;
    hill.hills = true;

    const flat = moveCost('grassland', 'none', false)!;
    const climb = moveCost('grassland', 'none', true)!;
    // The bench is only worth anything if a hill is dearer than the flat land.
    expect(climb).toBeGreaterThan(flat);

    const slinger = piece(state, 'slinger', from);
    const archer = piece(state, 'archer', from, 1);
    expect(priceOfStep(state, slinger, from, hill)).toBe(flat);
    expect(priceOfStep(state, archer, from, hill)).toBe(climb);
  });

  it('is the row’s own marker, so nothing compares a piece against a name', () => {
    expect(unitDef('slinger').ignoresHillCost).toBe(true);
    expect(unitDef('archer').ignoresHillCost).toBeUndefined();
  });

  it('still pays for what grows on the hill — it is the climb it ignores', () => {
    const state = board('pachacuti');
    const from = at(state, 5, 5);
    const wood = ring(state, from)[0]!;
    wood.hills = true;
    wood.feature = 'forest';

    const slinger = piece(state, 'slinger', from);
    // The wood's own price, with the height forgiven and nothing else.
    expect(priceOfStep(state, slinger, from, wood)).toBe(moveCost('grassland', 'forest', false));
  });

  it('makes a mountain no more walkable than it was', () => {
    const state = board('pachacuti');
    const from = at(state, 5, 5);
    const peak = ring(state, from)[0]!;
    peak.terrain = 'mountain';
    const slinger = piece(state, 'slinger', from);
    expect(
      stepCost(state.map, from, peak, moveProfile(state, slinger), zocField(state, 0)),
    ).toBeNull();
  });
});

/**
 * **The bench keeps its rules, and nobody reads them** (batch L6a).
 *
 * The Fubing and the Chanyu's Guard are two of the first cut's rows that no
 * figure of the second cut names. They kept everything — their stats, their
 * prices, the marker, and the rule the retired card used to carry, which now
 * rides the row itself (`UnitDef.effects`). What they have not got is a figure,
 * so `isUnlocked` refuses them to every seat and the rule reaches no law at all.
 *
 * That is the whole shape of a bench and it is worth pinning both halves of: a
 * row half-retired — the piece gone and the rule still paying somebody — is
 * exactly the failure nobody would notice.
 */
describe('a benched row', () => {
  const BENCHED = ['fubing', 'chanyuGuard'] as const;

  it('still carries the rule its retired card used to', () => {
    expect(unitDef('fubing').effects).toEqual([
      { kind: 'upkeepRebate', free: true, class: { type: 'fubing' }, where: 'garrison' },
    ]);
    expect((unitDef('chanyuGuard').effects ?? []).length).toBe(1);
  });

  it('puts that rule into nobody’s law, under any figure at all', () => {
    for (const leader of LEADER_IDS) {
      const state = board(leader);
      const held = liveEffects(state, 0);
      for (const type of BENCHED) {
        for (const effect of unitDef(type).effects ?? []) {
          expect(
            held.some((line) => JSON.stringify(line.effect) === JSON.stringify(effect)),
            `${leader} reads ${type}`,
          ).toBe(false);
        }
      }
    }
  });

  it('is named by no figure’s sheet', () => {
    const claimed = new Set(LEADER_IDS.map((id) => leaderDef(id).unit));
    for (const type of BENCHED) expect(claimed.has(type), type).toBe(false);
  });
});

// --- Akhenaten's Khopesh -----------------------------------------------------

describe('Akhenaten’s Khopesh — anywhere the seat’s faith is kept', () => {
  it('is worth its three points on a following town’s ground, and nothing in the wild', () => {
    const state = board('akhenaten');
    const seat = at(state, 6, 6);
    const mine = foundCityAt(state, 0, seat)!;
    const religion = foundReligion(state, playerById(state, 0)!);
    bumpRevision(state);
    // The faith is this seat's, and the town keeps it — written by the bench
    // the way `religion.test.ts` writes a congregation, since what is under
    // test is the strength line and not the tide that fills a town.
    expect(religion.founderId).toBe(0);
    mine.followers = { [religion.id]: mine.population };
    bumpRevision(state);

    // A hex the town owns that is *not* the town — the half the design widened.
    const ground = ring(state, seat).find(
      (tile) => tileOwnerCityId(state, tile.col, tile.row) === mine.id,
    )!;
    const khopesh = piece(state, 'khopesh', ground);
    expect(cardStrength(state, khopesh, ground)).toBe(3);
    // And in the gate, which is where it already worked.
    expect(cardStrength(state, khopesh, seat)).toBe(3);

    // Ground nobody has claimed keeps nobody's faith.
    const wild = at(state, 1, 1);
    expect(tileOwnerCityId(state, wild.col, wild.row)).toBeNull();
    expect(cardStrength(state, khopesh, wild)).toBe(0);
  });

  it('follows the banner rather than the border — a town that lapses stops paying', () => {
    const state = board('akhenaten');
    const seat = at(state, 6, 6);
    const mine = foundCityAt(state, 0, seat)!;
    const religion = foundReligion(state, playerById(state, 0)!);
    mine.followers = { [religion.id]: mine.population };
    bumpRevision(state);

    const ground = ring(state, seat).find(
      (tile) => tileOwnerCityId(state, tile.col, tile.row) === mine.id,
    )!;
    const khopesh = piece(state, 'khopesh', ground);
    expect(cardStrength(state, khopesh, ground)).toBe(3);

    mine.followers = {};
    bumpRevision(state);
    expect(cardStrength(state, khopesh, ground)).toBe(0);
  });

  it('is the khopesh’s line and no other sword’s', () => {
    const state = board('akhenaten');
    const seat = at(state, 6, 6);
    const mine = foundCityAt(state, 0, seat)!;
    const religion = foundReligion(state, playerById(state, 0)!);
    mine.followers = { [religion.id]: mine.population };
    bumpRevision(state);
    const swordsman = piece(state, 'swordsman', seat);
    expect(cardStrength(state, swordsman, seat)).toBe(0);
  });
});

// --- Al-Ma'mun's Camel Archer ------------------------------------------------

describe('Al-Ma’mun’s Camel Archer — keener for the works in the capital', () => {
  /** Plants `count` great people's works on hexes this town owns. */
  function plantWorks(state: GameState, cityId: number, count: number): void {
    const city = state.cities.find((entry) => entry.id === cityId)!;
    let left = count;
    for (const tile of ownedTiles(state, city)) {
      if (left === 0) break;
      if (tile.improvement !== undefined) continue;
      if (tile.col === city.col && tile.row === city.row) continue;
      tile.improvement = 'academy';
      left -= 1;
    }
    expect(left).toBe(0);
    bumpRevision(state);
  }

  it('shoots no harder with nothing planted, and +3 with three works in the seat', () => {
    const state = board('almamun');
    const seat = at(state, 6, 6);
    const city = foundCityAt(state, 0, seat)!;
    bumpRevision(state);

    const camel = piece(state, 'camelArcher', seat);
    expect(cardStrength(state, camel, seat)).toBe(0);

    plantWorks(state, city.id, 3);
    expect(cardStrength(state, camel, seat)).toBe(3);
  });

  it('counts the capital’s works and not a second town’s', () => {
    const state = board('almamun');
    const seat = at(state, 6, 6);
    const capital = foundCityAt(state, 0, seat)!;
    // A colony far enough off that the two towns share no ground.
    const colony = foundCityAt(state, 0, at(state, 11, 10))!;
    bumpRevision(state);
    expect(capitalCityOf(state, 0)?.id).toBe(capital.id);
    expect(colony.id).not.toBe(capital.id);

    const camel = piece(state, 'camelArcher', seat);
    // Two works raised in the colony, and the arrows are no keener for them.
    plantWorks(state, colony.id, 2);
    expect(cardStrength(state, camel, seat)).toBe(0);

    // One in the capital's own lands, and it is worth exactly one point.
    plantWorks(state, capital.id, 1);
    expect(cardStrength(state, camel, seat)).toBe(1);
  });

  it('is the arrows and not the guard — it pays on the shot alone', () => {
    const state = board('almamun');
    const seat = at(state, 6, 6);
    const city = foundCityAt(state, 0, seat)!;
    bumpRevision(state);
    plantWorks(state, city.id, 2);

    const camel = piece(state, 'camelArcher', seat);
    expect(cardStrength(state, camel, seat, 'attack')).toBe(2);
    expect(cardStrength(state, camel, seat, 'defend')).toBe(0);
    // And it is the camel's line: an ordinary horse archer counts no works.
    const rider = piece(state, 'horseArcher', seat);
    expect(cardStrength(state, rider, seat, 'attack')).toBe(0);
  });

  it('counts the stones, not the names: a work out in the wild is nobody’s', () => {
    const state = board('almamun');
    const seat = at(state, 6, 6);
    foundCityAt(state, 0, seat);
    bumpRevision(state);
    const wild = at(state, 1, 1);
    expect(tileOwnerCityId(state, wild.col, wild.row)).toBeNull();
    wild.improvement = 'academy';
    bumpRevision(state);

    const camel = piece(state, 'camelArcher', seat);
    expect(cardStrength(state, camel, seat)).toBe(0);
  });
});

// --- Mithridates' Peltast ----------------------------------------------------

describe('The Pontic Peltast — the mend on a kill is the peltast’s', () => {
  it('mends on its own kill and on nobody else’s', () => {
    const state = board('mithridates');
    const mine = windfallPayout(state, 0, 'kill', 0, 0, { actor: 'ponticPeltast' });
    expect(mine.heal).toBe(25);

    const warrior = windfallPayout(state, 0, 'kill', 0, 0, { actor: 'warrior' });
    expect(warrior.heal).toBe(0);

    // An occasion that carries no actor at all never satisfies the filter.
    const anonymous = windfallPayout(state, 0, 'kill', 0, 0, {});
    expect(anonymous.heal).toBe(0);
  });

  it('mends the peltast that struck, in the fight itself', () => {
    const state = board('mithridates');
    const here = at(state, 6, 6);
    const peltast = piece(state, 'ponticPeltast', here);
    peltast.hp = 10;
    const target = ring(state, here)[0]!;
    const prey = piece(state, 'worker', target, 1);
    prey.hp = 1;

    // A civilian standing alone is captured rather than killed, so the bench
    // gives the hex a soldier that can actually fall.
    prey.type = 'warrior';
    prey.hp = 1;
    bumpRevision(state);

    const before = peltast.hp;
    expect(blow(state, peltast, target)).toBe(true);
    expect(peltast.hp).toBeGreaterThan(before);
  });

  it('leaves a warrior’s kill unmended', () => {
    const state = board('mithridates');
    const here = at(state, 6, 6);
    const warrior = piece(state, 'warrior', here);
    warrior.hp = 10;
    const target = ring(state, here)[0]!;
    const prey = piece(state, 'warrior', target, 1);
    prey.hp = 1;
    bumpRevision(state);

    const before = warrior.hp;
    expect(blow(state, warrior, target)).toBe(true);
    expect(warrior.hp).toBeLessThanOrEqual(before);
  });
});

// --- Modu's own line ---------------------------------------------------------

describe('Modu Chanyu’s pace — the grass and the plains', () => {
  it('rides an extra point from the open country, and not from the hills or the sand', () => {
    const state = board('modu');
    const grass = at(state, 6, 6);
    const horse = piece(state, 'horseman', grass);
    const base = unitDef('horseman').movement;
    expect(fullMovement(horse, state)).toBe(base + 1);

    // A hill is a flag on the grass, and the card is about the ground.
    grass.hills = true;
    bumpRevision(state);
    expect(fullMovement(horse, state)).toBe(base + 1);

    // The plains too — the second of the two terrains the sheet names.
    const plains = at(state, 7, 6);
    plains.terrain = 'plains';
    horse.col = plains.col;
    horse.row = plains.row;
    bumpRevision(state);
    expect(fullMovement(horse, state)).toBe(base + 1);

    // And nowhere else.
    const sand = at(state, 8, 6);
    sand.terrain = 'desert';
    horse.col = sand.col;
    horse.row = sand.row;
    bumpRevision(state);
    expect(fullMovement(horse, state)).toBe(base);
  });

  it('reaches the mounted archers as well as the horse, and no foot at all', () => {
    const state = board('modu');
    const grass = at(state, 6, 6);
    const rider = piece(state, 'horseArcher', grass);
    const foot = piece(state, 'warrior', grass);
    expect(fullMovement(rider, state)).toBe(unitDef('horseArcher').movement + 1);
    expect(fullMovement(foot, state)).toBe(unitDef('warrior').movement);
  });

  it('is Modu’s and nobody else’s', () => {
    const state = board('pachacuti');
    const horse = piece(state, 'horseman', at(state, 6, 6));
    expect(fullMovement(horse, state)).toBe(unitDef('horseman').movement);
  });
});

