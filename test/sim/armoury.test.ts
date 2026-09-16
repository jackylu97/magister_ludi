/**
 * **M2 — two military buildings for the middle ages** (`docs/flags.md`
 * (eeeeee), the user's ruling of 2026-09-15). Two rows, no schema:
 *
 *   · the **War Hall** at Bronze Panoply — a `unitStamp` of hit points
 *     scoped to the town it stands in, the Terracotta Army's shape on an
 *     ordinary row. That ordinary-ness is the one seam this batch touched:
 *     `cardUnitStamp` read the *empire's* walk, and an ordinary building's
 *     effects live in the *town's* (`cityBuildingEffects`), so a stamp on a
 *     buildable row was declared and never written. It reads the birth town's
 *     walk now, the way `cardRulePercent` does when handed a city.
 *   · the **Armoury** at Mathematics — the Barracks' `productionBonus` shape
 *     with `modelClasses: ['ranged', 'siege']`. `siege` is a **model class**
 *     (the catapult's and the trebuchet's), not a category — every engine is
 *     `category: 'military'` beside the legionary — so the list form is the
 *     one selector that catches the engine and the composite bow and nothing
 *     that walks, rides or sails.
 *
 * What is pinned is the *behaviour* on a bench, in the ruling's own terms; the
 * doc rows are the production-costs sync test's, and the Compendium's printing
 * is `test/ui/compendium.test.ts`'s sweep over every live row.
 */
import { describe, expect, it } from 'vitest';

import { type BuildingId, buildingDef } from '../../src/sim/buildingData';
import { foundCityAt, realiseItem } from '../../src/sim/cities';
import { createGame } from '../../src/sim/game';
import { type GameMap, getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createCity,
  playerById,
} from '../../src/sim/state';
import { buildError } from '../../src/sim/tech';
import { techDef } from '../../src/sim/techData';
import { type UnitTypeId, unitDef, unitMaxHp } from '../../src/sim/unitData';
import { productionModifiers } from '../../src/sim/yields/town';

function game(seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

/** Hands a seat a technology, the way a completed research would. */
function learn(state: GameState, playerId: number, ...techs: string[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) {
    if (!player.techsResearched.includes(tech as never)) {
      player.techsResearched.push(tech as never);
      bumpRevision(state);
    }
  }
}

/** A city for a player, on the tile one of their units is standing on. */
function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

function at(map: GameMap, col: number, row: number) {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Raises an ordinary building the way a completion leaves it: the stones, and a fresh reading. */
function raise(state: GameState, city: City, id: BuildingId): void {
  city.buildings.push(id);
  bumpRevision(state);
}

/** Musters a piece in a town through the seam every birth passes — `realiseItem`. */
function muster(state: GameState, city: City, type: UnitTypeId): Unit {
  const done = realiseItem(state, city, {
    kind: 'unit',
    id: type,
    tile: at(state.map, city.col, city.row),
  });
  return state.units.find((u) => u.id === done.unitId)!;
}

describe('the War Hall', () => {
  it('is the Terracotta shape on an ordinary row, at Bronze Panoply beside the Smithy', () => {
    const row = buildingDef('warHall');
    expect(row.category).toBe('military');
    expect(row.production).toBe(2);
    expect(row.renown?.family).toBe('general');
    expect(row.effects).toEqual([
      { kind: 'unitStamp', hp: 10, scope: { test: 'hasBuilding', building: 'warHall' } },
    ]);
    expect(techDef('bronzePanoply').unlocks.buildings).toEqual(['smithy', 'warHall']);
  });

  it('stamps ten more hit points on a soldier raised under it, for life', () => {
    const g = game(4201);
    const home = found(g.state, 0);
    const other = createCity(g.state, 0, 'Elsewhere', home.col + 3, home.row);
    raise(g.state, home, 'warHall');

    const roster = unitDef('warrior').maxHp;
    const armoured = muster(g.state, home, 'warrior');
    expect(armoured.stamp?.hp).toBe(10);
    expect(unitMaxHp(armoured)).toBe(roster + 10);
    expect(armoured.hp).toBe(roster + 10);

    // The stamp is a fact about the birth and travels with the piece: standing in
    // a town with no Hall, it is still ten points hardier than the roster.
    armoured.col = other.col;
    armoured.row = other.row;
    bumpRevision(g.state);
    expect(unitMaxHp(armoured)).toBe(roster + 10);

    // A soldier raised in the Hall-less town is the roster's, unstamped.
    const plain = muster(g.state, other, 'warrior');
    expect(plain.stamp).toBeUndefined();
    expect(unitMaxHp(plain)).toBe(roster);
  });

  it('reads the town’s walk without reading a wonder twice', () => {
    // The seam this batch opened: a town holding both the Hall and the Terracotta
    // Army stamps one piece with the Hall's hit points and the Army's strength,
    // each exactly once — the two walks divide the rows between them.
    const g = game(4202);
    const home = found(g.state, 0);
    raise(g.state, home, 'warHall');
    raise(g.state, home, 'terracottaArmy');
    const veteran = muster(g.state, home, 'warrior');
    expect(veteran.stamp).toEqual({ hp: 10, strength: 2 });
  });
});

describe('the Armoury', () => {
  it('names the engine and the bow by model class — siege is a class, not a category', () => {
    // The finding the selector rests on: `siege` is a `ModelClass` the catapult
    // and the trebuchet carry, and every engine is `category: 'military'` like
    // the legionary — a category selector could not tell them apart.
    expect(unitDef('catapult').modelClass).toBe('siege');
    expect(unitDef('catapult').category).toBe('military');
    expect(unitDef('compositeBowman').modelClass).toBe('ranged');
    expect(unitDef('legionary').modelClass).toBe('melee');
    expect(unitDef('horseman').modelClass).toBe('mounted');

    const row = buildingDef('armoury');
    expect(row.category).toBe('military');
    expect(row.production).toBe(4);
    expect(row.renown?.family).toBe('general');
    expect(row.requiresBuilding).toBe('barracks');
    expect(row.productionBonus).toEqual({
      category: 'unit',
      percent: 25,
      class: { modelClasses: ['ranged', 'siege'] },
    });
  });

  it('puts a quarter behind the catapult and the composite bow, and nothing behind foot, horse or hull', () => {
    const g = game(4203);
    const home = found(g.state, 0);
    raise(g.state, home, 'armoury');
    const percentOf = (type: UnitTypeId): number =>
      productionModifiers(g.state, home, { kind: 'unit', id: type })
        .filter((line) => line.building === 'armoury')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percentOf('catapult')).toBe(25);
    expect(percentOf('compositeBowman')).toBe(25);
    expect(percentOf('legionary')).toBe(0);
    expect(percentOf('horseman')).toBe(0);
    expect(percentOf('trireme')).toBe(0);
    // And a building is not a unit: the row names its category.
    expect(
      productionModifiers(g.state, home, { kind: 'building', id: 'granary' }).some(
        (line) => line.building === 'armoury',
      ),
    ).toBe(false);
  });

  it('is opened by Mathematics and refused before it', () => {
    const g = game(4204);
    const home = found(g.state, 0);
    raise(g.state, home, 'barracks');
    expect(techDef('mathematics').unlocks.buildings).toContain('armoury');

    const before = buildError(g.state, 0, 'building', 'armoury', home);
    expect(before).not.toBeNull();
    expect(before).toContain(techDef('mathematics').name);

    learn(g.state, 0, 'mathematics');
    expect(buildError(g.state, 0, 'building', 'armoury', home)).toBeNull();
  });
});

describe('the Courthouse', () => {
  it('moved down to Iron Working — buildable in a captured town once the sword is forged, refused before', () => {
    // The user's ruling of 2026-09-15 with M2: the row that answers for holding
    // a conquest stands at the legionary's node (age three), not Divine Right's
    // (age four). An unlocks edit and nothing else — the node keeps its meter
    // rule and the lanes are untouched.
    expect(techDef('ironWorking').unlocks.buildings).toContain('courthouse');
    expect(techDef('theQadisCourt').unlocks.buildings ?? []).not.toContain('courthouse');

    const g = game(4205);
    const home = found(g.state, 0);
    const taken = createCity(g.state, 0, 'Taken', home.col + 3, home.row);
    taken.captured = true;
    bumpRevision(g.state);

    const before = buildError(g.state, 0, 'building', 'courthouse', taken);
    expect(before).not.toBeNull();
    expect(before).toContain(techDef('ironWorking').name);

    learn(g.state, 0, 'ironWorking');
    expect(buildError(g.state, 0, 'building', 'courthouse', taken)).toBeNull();
    // And the site rule still stands on its own: a town of your own founding is
    // no place for it, technology or no.
    expect(buildError(g.state, 0, 'building', 'courthouse', home)).not.toBeNull();
  });
});
