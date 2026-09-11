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
  cardUpkeepRebateLines,
  windfallPayout,
} from '../../src/sim/statecraft';
import { type LeaderCardId, type LeaderId, leaderCardHome } from '../../src/sim/leaderData';
import { moveCost } from '../../src/sim/terrainData';
import { fullMovement } from '../../src/sim/units';
import { type UnitTypeId, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { openEveryWar } from './warHelpers';

// --- the bench ---------------------------------------------------------------

/**
 * A blank grassland board, two seats at war, the first playing `leader` and
 * already holding `card`.
 *
 * The pick is written rather than drafted (`leaderPicks`, then `bumpRevision`)
 * for the bench's usual reason: what is being tested is the rule the card puts
 * into the law, and walking a seat into its own age to be dealt the row is
 * `leaders.test.ts`' claim, pinned there once. The offer the board deals with
 * itself is dropped so nothing here is answering a debt.
 */
function board(leader?: LeaderId, card?: LeaderCardId, width = 14, height = 12): GameState {
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
  const seat = playerById(state, 0)!;
  delete seat.leaderOffer;
  if (card !== undefined) {
    seat.leaderPicks = { [Number(leaderCardHome(card).age)]: card };
  }
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
    const state = board('pachacuti', 'pachacutiSlinger');
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
    const state = board('pachacuti', 'pachacutiSlinger');
    const from = at(state, 5, 5);
    const wood = ring(state, from)[0]!;
    wood.hills = true;
    wood.feature = 'forest';

    const slinger = piece(state, 'slinger', from);
    // The wood's own price, with the height forgiven and nothing else.
    expect(priceOfStep(state, slinger, from, wood)).toBe(moveCost('grassland', 'forest', false));
  });

  it('makes a mountain no more walkable than it was', () => {
    const state = board('pachacuti', 'pachacutiSlinger');
    const from = at(state, 5, 5);
    const peak = ring(state, from)[0]!;
    peak.terrain = 'mountain';
    const slinger = piece(state, 'slinger', from);
    expect(
      stepCost(state.map, from, peak, moveProfile(state, slinger), zocField(state, 0)),
    ).toBeNull();
  });
});

// --- Taizong's Fubing --------------------------------------------------------

describe('Taizong’s Fubing — kept for nothing only while it garrisons a town', () => {
  /**
   * The card reading, asked at the seam that owns it.
   *
   * `cardUpkeepRebateLines` takes the price from its caller by design (its own
   * docblock: "what this side owns is the card reading … and what the caller
   * owns is the price"), so the bench hands it a shilling a soldier and reads
   * back which pieces the law forgave. That is the half this batch changed, and
   * it is asked of the one function that decides it — the ledger's fold is
   * `explainUnitUpkeepRebate`'s claim and is pinned in `upkeep`'s own file.
   */
  const shilling = (unit: Unit): number => (unitDef(unit.type).category === 'military' ? 1 : 0);

  function forgiven(state: GameState): number {
    let total = 0;
    for (const line of cardUpkeepRebateLines(state, 0, shilling)) total += line.gold;
    return total;
  }

  it('forgives the piece standing in its own city, and charges it in the field', () => {
    const state = board('taizong', 'taizongFubing');
    const seat = at(state, 6, 6);
    const city = foundCityAt(state, 0, seat);
    expect(city).not.toBeNull();
    bumpRevision(state);

    // In the gate: the soldier-farmers feed themselves and cost nothing.
    const fubing = piece(state, 'fubing', seat);
    expect(forgiven(state)).toBe(1);

    // One hex out — still the town's own ground, and no longer the garrison.
    const field = ring(state, seat).find(
      (tile) => tileOwnerCityId(state, tile.col, tile.row) === city!.id,
    )!;
    fubing.col = field.col;
    fubing.row = field.row;
    bumpRevision(state);
    expect(forgiven(state)).toBe(0);
  });

  it('is the fubing’s bargain and nobody else’s, and no other empire’s', () => {
    const state = board('taizong', 'taizongFubing');
    const seat = at(state, 6, 6);
    foundCityAt(state, 0, seat);
    bumpRevision(state);

    // A spearman in the same gate pays like anybody else…
    piece(state, 'spearman', seat);
    expect(forgiven(state)).toBe(0);
    // …and the seat that never took the card forgives nothing at all.
    piece(state, 'fubing', seat, 1);
    let theirs = 0;
    for (const line of cardUpkeepRebateLines(state, 1, shilling)) theirs += line.gold;
    expect(theirs).toBe(0);
  });
});

// --- Akhenaten's Khopesh -----------------------------------------------------

describe('Akhenaten’s Khopesh — anywhere the seat’s faith is kept', () => {
  it('is worth its three points on a following town’s ground, and nothing in the wild', () => {
    const state = board('akhenaten', 'akhenatenKhopesh');
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
    const state = board('akhenaten', 'akhenatenKhopesh');
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
    const state = board('akhenaten', 'akhenatenKhopesh');
    const seat = at(state, 6, 6);
    const mine = foundCityAt(state, 0, seat)!;
    const religion = foundReligion(state, playerById(state, 0)!);
    mine.followers = { [religion.id]: mine.population };
    bumpRevision(state);
    const swordsman = piece(state, 'swordsman', seat);
    expect(cardStrength(state, swordsman, seat)).toBe(0);
  });
});

// --- Modu's Guard ------------------------------------------------------------

describe('The Chanyu’s Guard — the horse archers riding beside it', () => {
  it('emboldens a mounted archer on the next hex, and not one two hexes off', () => {
    const state = board('modu', 'moduGuard');
    const here = at(state, 6, 6);
    const rider = piece(state, 'horseArcher', here);
    const beside = ring(state, here)[0]!;
    const away = ring(state, beside).find(
      (tile) => tile.col !== here.col || tile.row !== here.row,
    )!;

    // Nobody beside it: no line at all.
    expect(cardStrength(state, rider, here)).toBe(0);

    const guard = piece(state, 'chanyuGuard', away);
    expect(cardStrength(state, rider, here)).toBe(0);

    guard.col = beside.col;
    guard.row = beside.row;
    bumpRevision(state);
    expect(cardStrength(state, rider, here)).toBe(2);
    // Defending too — it is the formation that is worth something, not the charge.
    expect(cardStrength(state, rider, here, 'defend')).toBe(2);
  });

  it('embolden the archers and not the spears, and never a rival’s', () => {
    const state = board('modu', 'moduGuard');
    const here = at(state, 6, 6);
    const beside = ring(state, here)[0]!;
    piece(state, 'chanyuGuard', beside);

    const foot = piece(state, 'spearman', here);
    expect(cardStrength(state, foot, here)).toBe(0);

    // A rival's archer standing next to the Guard is not the Chanyu's.
    const theirs = piece(state, 'horseArcher', here, 1);
    expect(cardStrength(state, theirs, here)).toBe(0);
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
    const state = board('almamun', 'almamunCamel');
    const seat = at(state, 6, 6);
    const city = foundCityAt(state, 0, seat)!;
    bumpRevision(state);

    const camel = piece(state, 'camelArcher', seat);
    expect(cardStrength(state, camel, seat)).toBe(0);

    plantWorks(state, city.id, 3);
    expect(cardStrength(state, camel, seat)).toBe(3);
  });

  it('counts the capital’s works and not a second town’s', () => {
    const state = board('almamun', 'almamunCamel');
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
    const state = board('almamun', 'almamunCamel');
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
    const state = board('almamun', 'almamunCamel');
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
    const state = board('mithridates', 'mithridatesPeltast');
    const mine = windfallPayout(state, 0, 'kill', 0, 0, { actor: 'ponticPeltast' });
    expect(mine.heal).toBe(25);

    const warrior = windfallPayout(state, 0, 'kill', 0, 0, { actor: 'warrior' });
    expect(warrior.heal).toBe(0);

    // An occasion that carries no actor at all never satisfies the filter.
    const anonymous = windfallPayout(state, 0, 'kill', 0, 0, {});
    expect(anonymous.heal).toBe(0);
  });

  it('mends the peltast that struck, in the fight itself', () => {
    const state = board('mithridates', 'mithridatesPeltast');
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
    const state = board('mithridates', 'mithridatesPeltast');
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

