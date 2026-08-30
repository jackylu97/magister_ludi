import { describe, expect, it } from 'vitest';

import {
  applyCombat,
  previewCombat,
  seaDefenceLines,
  siegeField,
  underSiege,
} from '../../src/sim/combat';
import { cityBlockaded } from '../../src/sim/blockade';
import { foundCityAt, spawnTileFor } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type Game, createGame, dispatch, snapshotState } from '../../src/sim/game';
import { type Tile, createMap, getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { canStopOn, moveProfile, navalPorts, reachableTiles, tileMoveCost } from '../../src/sim/pathfind';
import { explainRouteYieldBetween, foldRouteYield } from '../../src/sim/routeYields';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
import { buildError } from '../../src/sim/tech';
import { TECH_IDS } from '../../src/sim/techData';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { purchaseError } from '../../src/sim/purchase';
import { UNIT_TYPE_IDS, isNaval, unitDef } from '../../src/sim/unitData';
import { hasStackingRoom } from '../../src/sim/units';
import { computeFreshwater } from '../../src/sim/water';
import { resetVisibility } from '../../src/sim/visibility';

/**
 * The naval line (`docs/tech-tree.md`, ruled 2026-08-29): three classes, one
 * triangle, and a hull that may stand on exactly one kind of dry land.
 *
 * Organised by the **seam** each rule landed on rather than by ship, because
 * that is the claim the whole pass makes: there is no naval branch anywhere in
 * the simulation. A ship moves through `stepCost` like everything else, stacks
 * through `hasStackingRoom`, fights through `planCombat`'s one fold of labelled
 * lines, takes a city through the same three beats a swordsman does, and is
 * refused a landlocked town by `buildError`. Twelve data rows and a handful of
 * clauses — so what these tests hold still is that each clause is *one* clause.
 *
 * The triangle is pinned as a fixture rather than as arithmetic (light kills
 * ranged in two strikes, ranged kills heavy in three kites untouched, heavy
 * kills light in two), because the design's whole promise is a rock-paper-
 * scissors a player can feel, and a strength table that still balanced after a
 * rider was dropped would be a table nobody had checked.
 */

// --- fixtures ---------------------------------------------------------------

/**
 * A bench with a sea down the western edge, `water.test.ts`'s shape widened.
 *
 * Columns 0–4 are **coast** and column 5 onward is grassland, so there is real
 * sea room for a fleet to manoeuvre in and a coastline every column of it can
 * reach. Deliberately no `ocean` at all except where a test asks for one: the
 * ocean is the gate that has *not* opened yet, and a fixture that sprinkled it
 * about would make "a hull may not enter the deep" true by accident.
 */
function seaState(width = 14, height = 10): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  for (const tile of state.map.tiles) {
    if (tile.col <= 4) tile.terrain = 'coast';
  }
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function move(playerId: number, unitId: number, tile: Tile): Command {
  return { type: 'moveUnit', playerId, unitId, target: { col: tile.col, row: tile.row } };
}

function attack(playerId: number, unitId: number, tile: Tile): Command {
  return { type: 'attack', playerId, unitId, target: { col: tile.col, row: tile.row } };
}

/** Everything visible to everybody, so nothing here is refused by the fog. */
function seeEverything(state: GameState): void {
  for (const player of state.players) {
    const grid = state.visibility[player.id]!;
    grid.fill(2);
  }
}

// --- the roster -------------------------------------------------------------

describe('the naval roster', () => {
  it('gives twelve hulls three classes, a rig and a canton', () => {
    const hulls = UNIT_TYPE_IDS.filter((id) => isNaval(unitDef(id)));
    expect(hulls).toHaveLength(12);
    for (const id of hulls) {
      const def = unitDef(id);
      // A ship is a combatant and never a civilian: the category is about
      // *where a piece may be*, which is the whole reason it is a fourth slot
      // rather than a fourth kind of unit.
      expect(def.combatStrength, id).toBeGreaterThan(0);
      expect(def.masts, id).toBeGreaterThanOrEqual(1);
      expect(def.masts, id).toBeLessThanOrEqual(5);
      expect(['chevrons', 'rook', 'crosshair'], id).toContain(def.canton);
      // Nothing at sea needs a strategic resource — the ruling, and the thing
      // that keeps a coastal empire's fleet independent of its iron.
      expect(def.requiresResource, id).toBeUndefined();
    }
  });

  it('chains each class within itself and nowhere across', () => {
    // The upgrade chain is what makes a trireme a corvette forty turns later
    // without a single upgrade command, and a chain that crossed classes would
    // turn a player's light squadron into somebody else's line of battle.
    const classOf = (id: (typeof UNIT_TYPE_IDS)[number]): string => unitDef(id).modelClass;
    for (const id of UNIT_TYPE_IDS) {
      const def = unitDef(id);
      if (!isNaval(def) || def.upgradesTo === undefined) continue;
      expect(classOf(def.upgradesTo), id).toBe(classOf(id));
      // And a rank up is a rig up, which is what keeps the sculpt and the badge
      // telling the same story about age.
      expect(unitDef(def.upgradesTo).masts!, id).toBeGreaterThan(def.masts!);
    }
  });

  it('marks the light line hit-and-run and the heavy line blockading, by row', () => {
    const light = UNIT_TYPE_IDS.filter((id) => unitDef(id).modelClass === 'navalLight');
    const heavy = UNIT_TYPE_IDS.filter((id) => unitDef(id).modelClass === 'navalHeavy');
    const shooters = UNIT_TYPE_IDS.filter((id) => unitDef(id).modelClass === 'navalRanged');
    expect(light).toHaveLength(5);
    expect(heavy).toHaveLength(4);
    expect(shooters).toHaveLength(3);
    for (const id of light) expect(unitDef(id).hitAndRun, id).toBe(true);
    for (const id of heavy) expect(unitDef(id).blockades, id).toBe(true);
    for (const id of shooters) {
      expect(unitDef(id).rangedStrength, id).toBeGreaterThan(0);
      expect(unitDef(id).range, id).toBeGreaterThanOrEqual(1);
    }
    // The markers are exclusive to their line: nothing else in the roster
    // blockades or runs, which is what stops a warrior inheriting the rule.
    for (const id of UNIT_TYPE_IDS) {
      const def = unitDef(id);
      if (def.hitAndRun === true) expect(light, id).toContain(id);
      if (def.blockades === true) expect(heavy, id).toContain(id);
    }
  });
});

// --- movement ---------------------------------------------------------------

describe('a hull moves through the one step evaluator', () => {
  it('enters coast, refuses ocean, and refuses every land hex but its own port', () => {
    const state = seaState();
    const town = foundCityAt(state, 0, at(state, 5, 4));
    const hull = createUnit(state, 0, 'trireme', 4, 4);
    const mover = moveProfile(state, hull);
    expect(mover.naval).toBe(true);
    // Embarkation is a *land* piece's ability and a hull has no use for it.
    expect(mover.embarks).toBe(false);

    // Water: yes, at the floor.
    expect(tileMoveCost(at(state, 3, 4), mover)).toBe(RULES.movement.minStepCost);
    // Deep water: no, exactly as an embarked settler is refused it. One rule.
    at(state, 3, 5).terrain = 'ocean';
    expect(tileMoveCost(at(state, 3, 5), mover)).toBeNull();
    // Open ground: no, whatever the terrain table says it costs a warrior.
    expect(tileMoveCost(at(state, 6, 4), mover)).toBeNull();
    // Its own coastal city's hex: yes. The one dry hex in the world for it.
    expect(town.col).toBe(5);
    expect(tileMoveCost(at(state, 5, 4), mover)).toBe(RULES.movement.minStepCost);
  });

  it('may not march into a stranger’s harbour, nor into a landlocked town', () => {
    const state = seaState();
    seeEverything(state);
    foundCityAt(state, 1, at(state, 5, 4));
    foundCityAt(state, 0, at(state, 9, 4));
    const hull = createUnit(state, 0, 'trireme', 4, 4);
    const mover = moveProfile(state, hull);
    // A foreign coastal town *is* ground a hull can be on — that is what makes
    // it capturable — and the march is refused one layer up, by `canTransit`'s
    // foreign-city clause, exactly as it refuses a swordsman. One rule, not two.
    expect(tileMoveCost(at(state, 5, 4), mover)).not.toBeNull();
    expect(canStopOn(state, hull, at(state, 5, 4))).toBe(false);
    expect(applyCommand(state, move(0, hull.id, at(state, 5, 4))).ok).toBe(false);
    // An inland town of its own is not a port at all, and is refused by the
    // ground itself.
    expect(tileMoveCost(at(state, 9, 4), mover)).toBeNull();
  });

  it('lists exactly the coastal city centres as ports, whoever holds them', () => {
    const state = seaState();
    const mine = foundCityAt(state, 0, at(state, 5, 4));
    foundCityAt(state, 0, at(state, 9, 2));
    const theirs = foundCityAt(state, 1, at(state, 5, 8));
    const ports = navalPorts(state);
    expect(ports.size).toBe(2);
    expect(ports.has(at(state, mine.col, mine.row))).toBe(true);
    expect(ports.has(at(state, theirs.col, theirs.row))).toBe(true);
  });

  it('marches by the reducer exactly where the evaluator said it could', () => {
    const state = seaState();
    seeEverything(state);
    foundCityAt(state, 0, at(state, 5, 4));
    const hull = createUnit(state, 0, 'trireme', 3, 4);

    // The highlight and the walk are the same rule, which is what the four
    // readers of `stepCost` buy: every reachable hex is water or the port.
    const reach = reachableTiles(state, hull);
    for (const { tile } of reach) {
      const port = tile.col === 5 && tile.row === 4;
      expect(tile.terrain === 'coast' || port, `${tile.col},${tile.row}`).toBe(true);
    }
    expect(reach.some(({ tile }) => tile.col === 5 && tile.row === 4)).toBe(true);

    expect(applyCommand(state, move(0, hull.id, at(state, 5, 4))).ok).toBe(true);
    expect([hull.col, hull.row]).toEqual([5, 4]);
    // And out again, back onto the water it came from.
    hull.movesLeft = unitDef('trireme').movement;
    expect(applyCommand(state, move(0, hull.id, at(state, 4, 6))).ok).toBe(true);
    expect([hull.col, hull.row]).toEqual([4, 6]);
  });

  it('refuses a march onto open ground, leaving the state byte-identical', () => {
    const state = seaState();
    seeEverything(state);
    const hull = createUnit(state, 0, 'trireme', 4, 4);
    const before = snapshotState(state);
    expect(applyCommand(state, move(0, hull.id, at(state, 8, 4))).ok).toBe(false);
    expect(snapshotState(state)).toEqual(before);
  });
});

// --- the spawn --------------------------------------------------------------

describe('a hull is launched from the city that built it', () => {
  it('stands on the city hex when the town is coastal and the slot is free', () => {
    const state = seaState();
    const town = foundCityAt(state, 0, at(state, 5, 4));
    const tile = spawnTileFor(state, town, 'trireme');
    expect(tile).not.toBeNull();
    expect([tile!.col, tile!.row]).toEqual([5, 4]);
  });

  it('falls back to open water rather than to dry land', () => {
    const state = seaState();
    const town = foundCityAt(state, 0, at(state, 5, 4));
    // The gate is taken by another hull; the next berth is the sea, never the
    // field behind the town — `isPassable` would have offered the field.
    createUnit(state, 0, 'warGalley', 5, 4);
    const tile = spawnTileFor(state, town, 'trireme');
    expect(tile).not.toBeNull();
    expect(tile!.terrain).toBe('coast');
  });

  it('has nowhere to put one in a landlocked town', () => {
    const state = seaState();
    const inland = foundCityAt(state, 0, at(state, 9, 4));
    expect(spawnTileFor(state, inland, 'trireme')).toBeNull();
    // …and the queue says so first, in words, which is the point of the gate.
    expect(buildError(state, 0, 'unit', 'trireme', inland)).toBe(
      `${inland.name} is not on the coast`,
    );
    const port = foundCityAt(state, 0, at(state, 5, 4));
    expect(buildError(state, 0, 'unit', 'trireme', port)).toBeNull();
    // Asked without a town it is the *tree's* question and stays silent, which
    // is what keeps the Compendium and the tech chart honest.
    expect(buildError(state, 0, 'unit', 'trireme')).toBeNull();
  });

  it('refuses a purchase in a landlocked town too, by the same sentence', () => {
    const state = seaState();
    const inland = foundCityAt(state, 0, at(state, 9, 4));
    state.players[0]!.gold = 9999;
    expect(purchaseError(state, 0, inland.id, { kind: 'unit', id: 'trireme' }, 'gold')).toBe(
      `${inland.name} is not on the coast`,
    );
  });
});

// --- the rows with no technology --------------------------------------------

describe('a row shipped ahead of its age', () => {
  it('is refused by production and by purchase, and it is only the three', () => {
    const state = seaState();
    const port = foundCityAt(state, 0, at(state, 5, 4));
    state.players[0]!.gold = 9999;
    const waiting = UNIT_TYPE_IDS.filter((id) => unitDef(id).awaitsTech === true);
    expect(waiting.sort()).toEqual(['corvette', 'frigate', 'shipOfTheLine'].sort());
    for (const id of waiting) {
      expect(buildError(state, 0, 'unit', id, port), id).toBe(
        `${unitDef(id).name} waits on a technology this age has not reached`,
      );
      expect(purchaseError(state, 0, port.id, { kind: 'unit', id }, 'gold'), id).not.toBeNull();
    }
    // And every hull that *does* have a home is buildable in a port, which is
    // what says the marker is doing the refusing rather than the coastline.
    for (const id of ['trireme', 'bireme', 'warGalley', 'galley', 'fireShip', 'caravel']) {
      expect(buildError(state, 0, 'unit', id as never, port), id).toBeNull();
    }
  });
});

// --- stacking ---------------------------------------------------------------

describe('one hull and one escort', () => {
  it('holds a hull and a single embarked piece on open water', () => {
    const state = seaState();
    createUnit(state, 0, 'trireme', 3, 4);
    // A second hull never fits: the ordinary category cap does that, with no
    // clause anywhere.
    expect(hasStackingRoom(state, 3, 4, 'naval')).toBe(false);
    // One passenger does.
    expect(hasStackingRoom(state, 3, 4, 'military')).toBe(true);
    createUnit(state, 0, 'warrior', 3, 4);
    // And a second does not, though its own category slot is free — that is the
    // escort clause, and it is the only thing the caps could not say.
    expect(hasStackingRoom(state, 3, 4, 'civilian')).toBe(false);
    expect(hasStackingRoom(state, 3, 4, 'naval')).toBe(false);
  });

  it('lets a hull garrison a port beside the town’s own soldier and settler', () => {
    const state = seaState();
    foundCityAt(state, 0, at(state, 5, 4));
    createUnit(state, 0, 'warrior', 5, 4);
    createUnit(state, 0, 'settler', 5, 4);
    // Dry ground, so the escort clause is silent and the ordinary caps decide.
    // The user's ruling: "it garrisons there like any unit".
    expect(hasStackingRoom(state, 5, 4, 'naval')).toBe(true);
    const hull = createUnit(state, 0, 'trireme', 5, 4);
    expect(canStopOn(state, hull, at(state, 5, 4))).toBe(true);
  });

  it('lets any number of caravans share the water with a hull', () => {
    const state = seaState();
    createUnit(state, 0, 'trireme', 3, 4);
    createUnit(state, 0, 'trader', 3, 4);
    createUnit(state, 0, 'trader', 3, 4);
    // `stacksFreely` is answered before the escort clause is ever reached, so a
    // caravan is neither the escort nor in its way.
    expect(hasStackingRoom(state, 3, 4, 'trader')).toBe(true);
    expect(hasStackingRoom(state, 3, 4, 'military')).toBe(true);
  });
});

// --- the triangle -----------------------------------------------------------

/**
 * Two hulls facing each other on open water, everything else swept away.
 *
 * The pieces are placed adjacent so a melee is legal and two apart where a kite
 * is the point; `seeEverything` because shooting is the one place fog is a rule.
 */
function duel(
  aType: Parameters<typeof createUnit>[2],
  bType: Parameters<typeof createUnit>[2],
  gap = 1,
): { state: GameState; a: Unit; b: Unit } {
  const state = seaState();
  seeEverything(state);
  const a = createUnit(state, 0, aType, 1, 4);
  const b = createUnit(state, 1, bType, 1 + gap, 4);
  return { state, a, b };
}

describe('the triangle', () => {
  it('gives a light hull its edge over a gun deck as one labelled line', () => {
    const { state, a, b } = duel('galley', 'fireShip');
    const plan = previewCombat(state, a.id, { col: b.col, row: b.row });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const line = plan.attackerLines.find((l) => l.source === 'Against ranged ships');
    expect(line, 'the light hull’s own row line').toBeDefined();
    expect(line!.amount).toBe(5);
    // Hard rule 5: the headline is the fold of the list and never a second sum.
    const fold = plan.attackerLines.reduce((sum, l) => sum + l.amount, 0);
    expect(plan.attackerStrength).toBeCloseTo(fold, 9);
    // And it never pays against a hull that does not shoot.
    const other = duel('galley', 'towerShip');
    const against = previewCombat(other.state, other.a.id, {
      col: other.b.col,
      row: other.b.row,
    });
    expect(against.ok).toBe(true);
    if (!against.ok) return;
    expect(against.attackerLines.some((l) => l.source === 'Against ranged ships')).toBe(false);
  });

  it('gives a ranged hull its fragility, and only against a melee blow', () => {
    const { state, a, b } = duel('galley', 'fireShip');
    const melee = previewCombat(state, a.id, { col: b.col, row: b.row });
    expect(melee.ok).toBe(true);
    if (!melee.ok) return;
    const fragile = melee.defenderLines.find((l) => l.source === 'Fragile hull');
    expect(fragile, 'the ranged hull’s malus').toBeDefined();
    expect(fragile!.amount).toBe(-5);

    // A shot answers no counter at all, so the malus never gets a chance to
    // matter — asserted here so the narrowing is a *rule* and not a happy
    // accident of who happens to attack whom.
    const shot = duel('fireShip', 'fireShip');
    const preview = previewCombat(shot.state, shot.a.id, {
      col: shot.b.col,
      row: shot.b.row,
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.kind).toBe('ranged');
    expect(preview.defenderLines.some((l) => l.source === 'Fragile hull')).toBe(false);
    expect(preview.damageToAttacker).toBe(0);
  });

  /**
   * The triangle, measured at the **midpoint roll** rather than fought.
   *
   * `previewCombat`'s `damageToDefender` is the exact figure the curve produces
   * at a roll of 1 (`planCombat` is one computation read twice), so a blow count
   * taken off it is a fact about the *table* and not about a die. Fighting it out
   * would have been a test of `state.rng` — the roll band is ±20%, which is
   * enough to move a two-blow kill to three on an unlucky pair of rolls, and a
   * balance fixture that is 85% likely to pass is a fixture nobody can read.
   *
   * The rank pinned is the **Æra IV** one, and deliberately: it is the first
   * tier at which all three mechanisms are actually present, because the Æra III
   * shooter has `range: 1` and a hull that must stand adjacent to fire is not
   * kiting anything. See the note on the ranged case.
   */
  const blowsToKill = (
    state: GameState,
    attacker: Unit,
    defender: Unit,
  ): { blows: number; taken: number } => {
    const plan = previewCombat(state, attacker.id, { col: defender.col, row: defender.row });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error(plan.error);
    return {
      blows: Math.ceil(plan.defenderHp / plan.damageToDefender),
      taken: plan.damageToAttacker,
    };
  };

  it('lets a light hull beat a gun deck, closing faster than it is shot', () => {
    const closing = duel('caravel', 'gunGalley');
    const shooting = duel('gunGalley', 'caravel', 2);
    const light = blowsToKill(closing.state, closing.a, closing.b);
    const ranged = blowsToKill(shooting.state, shooting.a, shooting.b);
    expect(light.blows).toBe(2);
    expect(light.blows).toBeLessThan(ranged.blows);
  });

  it('lets a heavy hull beat a light one on raw strength', () => {
    const heavy = duel('carrack', 'caravel');
    const light = duel('caravel', 'carrack');
    expect(blowsToKill(heavy.state, heavy.a, heavy.b).blows).toBeLessThan(
      blowsToKill(light.state, light.a, light.b).blows,
    );
  });

  /**
   * And ranged beats heavy — by **kiting**, which is a fact about movement and
   * the absence of a counter rather than about damage.
   *
   * The heavy hull hits harder when it connects; what it cannot do is connect.
   * A gun deck fires at two hexes, takes nothing back, and outruns a three-move
   * hull by a hex a turn, so the exchange it forces is the whole of its win —
   * which is why this is asserted as three properties and not as a blow count.
   */
  it('lets a gun deck kite a heavy hull: no counter, longer reach, more speed', () => {
    const { state, a, b } = duel('gunGalley', 'carrack', 2);
    const plan = previewCombat(state, a.id, { col: b.col, row: b.row });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.kind).toBe('ranged');
    // Untouched: a shot draws no counter, so every kite is free.
    expect(plan.damageToAttacker).toBe(0);
    expect(plan.damageToAttackerMax).toBe(0);
    expect(plan.damageToDefender).toBeGreaterThan(0);
    // Out of reach: it fires from two and a melee hull must stand at one.
    expect(unitDef('gunGalley').range).toBe(2);
    // And out of range next turn too, which is what makes the reach hold.
    expect(unitDef('gunGalley').movement).toBeGreaterThan(unitDef('carrack').movement);
  });

  /**
   * The Æra III shooter is the flagged exception, and it is written down rather
   * than quietly passing.
   *
   * `docs/tech-tree.md` gives the Fire Ship `range: 1`, so it has to stand
   * adjacent to fire — the heavy hull it is "kiting" is already in contact and
   * swings on its own turn. It still takes no counter on the shot itself, which
   * is asserted here, but the *speed* half of the mechanism does nothing at one
   * hex. Recorded as a fact about the shipped table so a balance pass has
   * somewhere to start.
   */
  it('gives the Æra III shooter reach of one, which is contact rather than a kite', () => {
    expect(unitDef('fireShip').range).toBe(1);
    const { state, a, b } = duel('fireShip', 'towerShip');
    const plan = previewCombat(state, a.id, { col: b.col, row: b.row });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.damageToAttacker).toBe(0);
    // The heavy hull answers harder on its own turn, which is the whole of why
    // this rank does not yet play as the design's triangle.
    const answer = duel('towerShip', 'fireShip');
    expect(blowsToKill(answer.state, answer.a, answer.b).blows).toBeLessThan(
      blowsToKill(state, a, b).blows,
    );
  });
});

// --- hit and run ------------------------------------------------------------

describe('hit and run', () => {
  it('costs a light hull the blow and leaves it the rest of its turn', () => {
    const { state, a, b } = duel('galley', 'fireShip');
    const full = unitDef('galley').movement;
    a.movesLeft = full;
    expect(applyCombat(state, a.id, { col: b.col, row: b.row }).ok).toBe(true);
    expect(a.movesLeft).toBe(full - RULES.naval.hitAndRunCost);
    // One blow a turn all the same: what the light line buys is somewhere to
    // be afterwards, never a second attack.
    expect(a.hasAttacked).toBe(true);
    const again = applyCombat(state, a.id, { col: b.col, row: b.row });
    expect(again.ok).toBe(false);
  });

  it('empties a heavy hull’s purse like everybody else’s', () => {
    const { state, a, b } = duel('towerShip', 'galley');
    a.movesLeft = unitDef('towerShip').movement;
    expect(applyCombat(state, a.id, { col: b.col, row: b.row }).ok).toBe(true);
    expect(a.movesLeft).toBe(0);
  });

  it('does not hand a hull movement it did not have', () => {
    const { state, a, b } = duel('galley', 'fireShip');
    // In on its last point: it pays for the blow and is finished, exactly as a
    // price rather than an exemption should behave.
    a.movesLeft = RULES.naval.hitAndRunCost;
    expect(applyCombat(state, a.id, { col: b.col, row: b.row }).ok).toBe(true);
    expect(a.movesLeft).toBe(0);
  });
});

// --- the escort and the sea -------------------------------------------------

describe('a soldier caught on the water', () => {
  it('loses points at sea when nothing is standing over it', () => {
    const state = seaState();
    seeEverything(state);
    const raider = createUnit(state, 0, 'towerShip', 2, 4);
    createUnit(state, 1, 'warrior', 3, 4);

    const alone = previewCombat(state, raider.id, { col: 3, row: 4 });
    expect(alone.ok).toBe(true);
    if (!alone.ok) return;
    const sea = alone.defenderLines.find((l) => l.source === 'At sea');
    expect(sea, 'the unescorted malus').toBeDefined();
    expect(sea!.amount).toBe(-RULES.naval.atSeaPenalty);
    // Rule 5 again: the headline is the fold of the list.
    const fold = alone.defenderLines.reduce((sum, l) => sum + l.amount, 0);
    expect(alone.defenderStrength).toBeCloseTo(fold, 9);
  });

  /**
   * The escort and the malus are asked of `seaDefenceLines` directly, and that
   * is the honest reading rather than a shortcut.
   *
   * A hull sharing the passenger's hex is itself a combatant, so
   * `attackTargetAt` finds the *ship* first and the passenger is never the
   * defender while its escort is alive — which is exactly what an escort is for.
   * The lines therefore cannot be reached through a forecast at all in the case
   * they exist for, and the evaluator is where the rule lives.
   */
  it('defends at the light hull’s strength when one is sharing its hex', () => {
    const state = seaState();
    const rider = createUnit(state, 0, 'warrior', 3, 4);
    const water = at(state, 3, 4);
    expect(seaDefenceLines(state, rider, water)).toEqual([
      { source: 'At sea', amount: -RULES.naval.atSeaPenalty },
    ]);

    createUnit(state, 0, 'trireme', 3, 4);
    const escorted = seaDefenceLines(state, rider, water);
    expect(escorted).toEqual([
      {
        source: `Escort · ${unitDef('trireme').name}`,
        amount: unitDef('trireme').combatStrength - unitDef('warrior').combatStrength,
      },
    ]);
    // The lift lands the fold exactly on the ship's number, which is what
    // "defends at the hull's strength" means.
    expect(unitDef('warrior').combatStrength + escorted[0]!.amount).toBe(
      unitDef('trireme').combatStrength,
    );
  });

  it('never lowers a soldier stronger than its escort, and never escorts a ship', () => {
    const state = seaState();
    const legion = createUnit(state, 0, 'longswordsman', 3, 4);
    createUnit(state, 0, 'trireme', 3, 4);
    // A floor, never a subtraction — a fast hull that made a legion softer
    // would be a card nobody would ever play.
    expect(seaDefenceLines(state, legion, at(state, 3, 4))).toEqual([]);

    // A hull is the water; it takes no penalty for being on it and needs no
    // escort. Asked of `isNaval`, so this is the category and not a name.
    const hull = createUnit(state, 1, 'towerShip', 3, 5);
    expect(seaDefenceLines(state, hull, at(state, 3, 5))).toEqual([]);
    // And nothing at all is owed on dry land.
    const ashore = createUnit(state, 0, 'warrior', 8, 4);
    expect(seaDefenceLines(state, ashore, at(state, 8, 4))).toEqual([]);
  });

  it('is a light hull’s rule — a heavy one shelters nobody', () => {
    const state = seaState();
    const rider = createUnit(state, 0, 'warrior', 3, 4);
    createUnit(state, 0, 'towerShip', 3, 4);
    // Read off `hitAndRun`, the light line's own marker: the escort is what
    // keeps the nimble hull worth building once gun decks appear, so it is the
    // nimble hull that grants it.
    expect(seaDefenceLines(state, rider, at(state, 3, 4))).toEqual([
      { source: 'At sea', amount: -RULES.naval.atSeaPenalty },
    ]);
  });
});

// --- the line of battle -----------------------------------------------------

describe('the line', () => {
  it('pays two a hull, caps at four, and counts only friendly heavies', () => {
    const state = seaState();
    seeEverything(state);
    const flag = createUnit(state, 0, 'towerShip', 2, 4);
    const target = createUnit(state, 1, 'galley', 3, 4);

    const alone = previewCombat(state, flag.id, { col: 3, row: 4 });
    expect(alone.ok).toBe(true);
    if (!alone.ok) return;
    expect(alone.attackerLines.some((l) => l.source === 'The line')).toBe(false);

    createUnit(state, 0, 'towerShip', 2, 3);
    const paired = previewCombat(state, flag.id, { col: 3, row: 4 });
    expect(paired.ok).toBe(true);
    if (!paired.ok) return;
    expect(paired.attackerLines.find((l) => l.source === 'The line')!.amount).toBe(
      RULES.naval.lineBonusPerHull,
    );

    createUnit(state, 0, 'towerShip', 2, 5);
    createUnit(state, 0, 'towerShip', 1, 4);
    const wall = previewCombat(state, flag.id, { col: target.col, row: target.row });
    expect(wall.ok).toBe(true);
    if (!wall.ok) return;
    // Three neighbours is six points of raw bonus, capped at four.
    expect(wall.attackerLines.find((l) => l.source === 'The line')!.amount).toBe(
      RULES.naval.lineBonusMax,
    );
  });

  it('pays nothing to a light hull, and nothing for an enemy’s line', () => {
    const state = seaState();
    seeEverything(state);
    const light = createUnit(state, 0, 'galley', 2, 4);
    createUnit(state, 0, 'galley', 2, 3);
    createUnit(state, 1, 'towerShip', 3, 3);
    const target = createUnit(state, 1, 'fireShip', 3, 4);
    const preview = previewCombat(state, light.id, { col: target.col, row: target.row });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.attackerLines.some((l) => l.source === 'The line')).toBe(false);
    // The defender's own neighbour is a heavy hull of its side, so it *does*
    // get one — which is the symmetry: a line is worth the same either way.
    expect(preview.defenderLines.some((l) => l.source === 'The line')).toBe(false);
  });
});

// --- the blockade -----------------------------------------------------------

describe('the blockade', () => {
  it('denies the sea lane so one hull can besiege a small port', () => {
    const state = seaState();
    const town = foundCityAt(state, 0, at(state, 5, 4));
    // Ring the landward side with an enemy army so only the sea is in question.
    // Read off the map's own neighbours rather than written out, because which
    // hexes touch (5, 4) is offset-parity arithmetic and a fixture that guessed
    // would be testing the guess.
    const ring = neighborTiles(state.map, tileHex(at(state, 5, 4)));
    const sea = ring.filter((tile) => isWaterTerrain(tile.terrain));
    expect(sea.length).toBeGreaterThan(0);
    for (const tile of ring) {
      if (isWaterTerrain(tile.terrain)) continue;
      createUnit(state, 1, 'warrior', tile.col, tile.row);
    }
    const open = siegeField(state, 0);
    expect(underSiege(state, town, open)).toBe(false);

    // One heavy hull in the mouth of the harbour closes it: it holds the hex it
    // is on and the sea lane either side, which is the whole of the clause.
    createUnit(state, 1, 'warGalley', sea[Math.floor(sea.length / 2)]!.col, sea[Math.floor(sea.length / 2)]!.row);
    const closed = siegeField(state, 0);
    expect(underSiege(state, town, closed)).toBe(true);
  });

  it('needs a heavy hull — a light one holds only the hex it stands on', () => {
    const state = seaState();
    const town = foundCityAt(state, 0, at(state, 5, 4));
    createUnit(state, 1, 'trireme', 4, 4);
    // A light hull holds the hex it stands on like any combat unit, and denies
    // no lane: `cityBlockaded` is asked of the roster's `blockades` marker.
    expect(cityBlockaded(state, town)).toBe(false);
  });

  it('is a fact about now, and answers for the town rather than the sea', () => {
    const state = seaState();
    const town = foundCityAt(state, 0, at(state, 5, 4));
    expect(cityBlockaded(state, town)).toBe(false);
    const hull = createUnit(state, 1, 'warGalley', 4, 4);
    expect(cityBlockaded(state, town)).toBe(true);
    // Its own hull is a garrison, never a blockade.
    hull.ownerId = 0;
    expect(cityBlockaded(state, town)).toBe(false);
  });

  it('stops a blockaded town’s routes paying, as one labelled line', () => {
    const state = seaState();
    const port = foundCityAt(state, 0, at(state, 5, 4));
    const inland = foundCityAt(state, 0, at(state, 9, 4));
    port.buildings = ['granary', 'monument', 'barracks'];
    port.population = 6;
    inland.population = 6;

    const open = explainRouteYieldBetween(state, port, inland);
    const paid = foldRouteYield(open);
    expect(paid.food + paid.production + paid.gold).toBeGreaterThan(0);
    expect(open.some((l) => l.source.startsWith('Blockaded'))).toBe(false);

    createUnit(state, 1, 'warGalley', 4, 4);
    const cut = explainRouteYieldBetween(state, port, inland);
    const line = cut.find((l) => l.source === `Blockaded · ${port.name}`);
    expect(line, 'the blockade line').toBeDefined();
    // Rule 5: the total is the fold, and the fold is zero — the sheet says why
    // rather than a number quietly going to nothing.
    expect(foldRouteYield(cut)).toEqual({ food: 0, production: 0, gold: 0 });
  });
});

// --- taking a town ----------------------------------------------------------

describe('a hull takes a coastal city', () => {
  it('walks in on the third beat, by the same three beats a swordsman uses', () => {
    const state = seaState();
    seeEverything(state);
    const town = foundCityAt(state, 1, at(state, 5, 4));
    const hull = createUnit(state, 0, 'towerShip', 4, 4);

    // Beat one: the walls, while they stand.
    const walls = previewCombat(state, hull.id, { col: 5, row: 4 });
    expect(walls.ok).toBe(true);
    if (!walls.ok) return;
    expect(walls.cityPhase).toBe('walls');
    expect(walls.capturesCity).toBe(false);

    // Beat three, with the walls down and nobody holding the gate.
    town.hp = 1;
    const capture = previewCombat(state, hull.id, { col: 5, row: 4 });
    expect(capture.ok).toBe(true);
    if (!capture.ok) return;
    expect(capture.cityPhase).toBe('capture');
    // The whole of the naval clause: the city hex is enterable for a hull, so
    // `canHoldTakenGround` says yes and the ordinary rule does the rest.
    expect(capture.capturesCity).toBe(true);

    const result = applyCombat(state, hull.id, { col: 5, row: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome.capturedCityId).toBe(town.id);
    expect(town.ownerId).toBe(0);
    expect(result.outcome.advanced).toBe(true);
    expect([hull.col, hull.row]).toEqual([5, 4]);
  });

  it('cannot take an inland town it can never reach', () => {
    const state = seaState();
    seeEverything(state);
    const inland = foundCityAt(state, 1, at(state, 6, 4));
    inland.hp = 1;
    const hull = createUnit(state, 0, 'towerShip', 5, 4);
    // Adjacent, and the blow is legal — but the hex is not ground it may hold,
    // so the forecast says so before the player commits.
    const preview = previewCombat(state, hull.id, { col: 6, row: 4 });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.cityPhase).toBe('capture');
    expect(preview.capturesCity).toBe(false);
  });

  it('advances onto the water it just cleared', () => {
    const { state, a, b } = duel('towerShip', 'galley');
    b.hp = 1;
    const result = applyCombat(state, a.id, { col: b.col, row: b.row });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The advance is asked of the *winner's* passability now, not of "is this
    // dry ground" — without that a hull could never take the hex it just won.
    expect(result.outcome.advanced).toBe(true);
    expect([a.col, a.row]).toEqual([2, 4]);
  });

  it('captures an unescorted embarked civilian by arriving', () => {
    const state = seaState();
    seeEverything(state);
    const hull = createUnit(state, 0, 'trireme', 2, 4);
    const worker = createUnit(state, 1, 'worker', 3, 4);
    const preview = previewCombat(state, hull.id, { col: 3, row: 4 });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.capturesUnit).toBe(true);
    expect(applyCombat(state, hull.id, { col: 3, row: 4 }).ok).toBe(true);
    expect(worker.ownerId).toBe(0);
  });
});

// --- determinism ------------------------------------------------------------

describe('a naval fight replays byte for byte', () => {
  it('reproduces a fleet action from the command log alone', () => {
    const config = {
      seed: 4242,
      sizeName: 'duel' as const,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
    const play = (game: Game): void => {
      const state = game.state;
      // The same bench both times, built by the same statements: the fixture is
      // part of the log's world, not part of the log.
      state.map = createMap({ width: 14, height: 10, terrain: 'grassland' });
      for (const tile of state.map.tiles) if (tile.col <= 4) tile.terrain = 'coast';
      resetVisibility(state);
      state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
      state.units = [];
      state.cities = [];
      state.nextEntityId = 1;
      for (const player of state.players) player.techsResearched = [...TECH_IDS];
      computeFreshwater(state.map);
      seeEverything(state);
      createUnit(state, 0, 'galley', 1, 4);
      createUnit(state, 1, 'gunGalley', 3, 4);
      createUnit(state, 1, 'carrack', 3, 5);
    };

    const live = createGame(config);
    play(live);
    // A shot, a charge that survives on hit-and-run, and a march with what is
    // left — three verbs whose outcomes all pass through `state.rng`.
    const orders: Command[] = [
      // The gun deck fires from two hexes and takes nothing back.
      attack(1, 2, at(live.state, 1, 4)),
      // The light hull closes, strikes, and still has a turn left to spend.
      move(0, 1, at(live.state, 2, 4)),
      attack(0, 1, at(live.state, 3, 4)),
      move(0, 1, at(live.state, 2, 5)),
    ];
    for (const command of orders) {
      expect(dispatch(live, command).ok, command.type).toBe(true);
    }
    const after = snapshotState(live.state);
    expect(live.log).toHaveLength(orders.length);

    // Replayed by hand rather than through `replay`, because the bench is not
    // in the log: `replay` rebuilds the world from `{config, log}` and this
    // world was assembled by the fixture. So the *same* two statements build it
    // twice and the same commands are applied in log order — which is exactly
    // the guarantee, with the map generator's half stipulated instead of run.
    const rerun = createGame(config);
    play(rerun);
    for (const command of live.log) {
      expect(applyCommand(rerun.state, command).ok, command.type).toBe(true);
    }
    expect(snapshotState(rerun.state)).toEqual(after);
  });
});
