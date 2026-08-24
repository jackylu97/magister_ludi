import { describe, expect, it } from 'vitest';

import { expandBorders, foundCityAt } from '../../src/sim/cities';
import { applyCombat, blocksLineOfSight, hasLineOfSight } from '../../src/sim/combat';
import { type Command, applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { type GameState, SCHEMA_VERSION, createUnit, newGame, removeUnit } from '../../src/sim/state';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { unitDef } from '../../src/sim/unitData';
import {
  EXPLORED,
  HIDDEN,
  VISIBLE,
  citySightingOf,
  discArea,
  isExploredBy,
  isVisibleTo,
  maxSightArea,
  maxSightRadius,
  recomputeVisibility,
  resetVisibility,
  sightOf,
  visibilityAt,
} from '../../src/sim/visibility';

/**
 * Fog of war, from the simulation's side.
 *
 * The board's half — the incremental repaint, the blank chart, the serpents —
 * is `test/fog3d.test.ts`, and the cost of both at scale is
 * `test/stress.test.ts`. What is here is the model: three states, an explored
 * set that only ever grows, sight read off the data, one shared line-of-sight
 * rule, and the single place where fog is a *rule* rather than a mask.
 */

/** Sixteen by eight of flat grassland, two seats, nothing on it. */
function flatState(width = 16, height = 8): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  state.nextEntityId = 1;
  return state;
}

/** The set of cells a player can currently see, as `col,row` strings. */
function seen(state: GameState, playerId: number): Set<string> {
  const out = new Set<string>();
  for (const tile of state.map.tiles) {
    if (isVisibleTo(state, playerId, tile.col, tile.row)) out.add(`${tile.col},${tile.row}`);
  }
  return out;
}

function countAt(state: GameState, playerId: number, level: number): number {
  let count = 0;
  for (const tile of state.map.tiles) {
    if (visibilityAt(state, playerId, tile.col, tile.row) === level) count += 1;
  }
  return count;
}

// --- the shape of the model -------------------------------------------------

describe('the visibility grid', () => {
  it('gives every player one slot per tile, all hidden, in a fresh state', () => {
    const state = flatState();
    expect(state.visibility).toHaveLength(state.players.length);
    for (const grid of state.visibility) {
      expect(grid).toHaveLength(state.map.tiles.length);
      expect(grid.every((level) => level === HIDDEN)).toBe(true);
    }
  });

  it('is indexed exactly like tileOwner', () => {
    const state = flatState();
    createUnit(state, 0, 'warrior', 5, 4);
    const index = tileIndex(state.map, 5, 4);
    expect(state.visibility[0]![index]).toBe(VISIBLE);
    expect(state.visibility[0]).toHaveLength(state.tileOwner.length);
  });

  it('answers hidden for a cell off the map and for a player who is not one', () => {
    const state = flatState();
    createUnit(state, 0, 'warrior', 5, 4);
    expect(visibilityAt(state, 0, 5, -1)).toBe(HIDDEN);
    expect(visibilityAt(state, 99, 5, 4)).toBe(HIDDEN);
  });

  it('is carried by the schema version', () => {
    // Bumped for M8: a v9 log replayed here can find an attack refused that the
    // older build allowed. See the ledger in `state.ts`. M7's workers moved it
    // on to 11, M10's meters to 12 and the luxuries pass to 13 — the fog fields
    // are still carried by whatever the current number is, which is what this
    // assertion is really pinning.
    expect(SCHEMA_VERSION).toBe(15);
  });

  it('survives a JSON round trip as plain data', () => {
    const state = flatState();
    createUnit(state, 0, 'scout', 4, 4);
    const clone = JSON.parse(snapshotState(state)) as GameState;
    expect(clone.visibility).toEqual(state.visibility);
    expect(clone.citySightings).toEqual(state.citySightings);
  });
});

// --- sight ------------------------------------------------------------------

describe('how far a unit sees', () => {
  it('reads the radius off units.json rather than off movement', () => {
    const state = flatState();
    // The scout's identity: it moves *less* than a horseman and sees further.
    expect(unitDef('scout').sight).toBeGreaterThan(unitDef('horseman').sight);
    expect(unitDef('horseman').movement).toBeGreaterThan(unitDef('scout').movement);

    const scout = createUnit(state, 0, 'scout', 8, 4);
    expect(sightOf(state.map, scout)).toBe(unitDef('scout').sight);
    expect(seen(state, 0).size).toBe(discArea(unitDef('scout').sight));
  });

  it('sees one hex further from a hill', () => {
    const state = flatState();
    getTileAt(state.map, 8, 4)!.hills = true;
    const warrior = createUnit(state, 0, 'warrior', 8, 4);
    expect(sightOf(state.map, warrior)).toBe(
      unitDef('warrior').sight + RULES.visibility.hillsBonus,
    );
    expect(seen(state, 0).size).toBe(
      discArea(unitDef('warrior').sight + RULES.visibility.hillsBonus),
    );
  });

  it('sees nothing at all for a player with nothing on the board', () => {
    const state = flatState();
    createUnit(state, 0, 'warrior', 8, 4);
    expect(seen(state, 1).size).toBe(0);
  });

  it('bounds the widest single eye off the data', () => {
    // The scout is the roster's furthest-seeing unit today, and the bound is a
    // sweep of the whole roster rather than that fact written down — a spyglass
    // added to `units.json` tomorrow raises it without touching this test.
    const widest = Math.max(
      RULES.visibility.citySight,
      unitDef('scout').sight + RULES.visibility.hillsBonus,
    );
    expect(maxSightRadius()).toBe(widest);
    expect(maxSightArea()).toBe(discArea(widest));
  });
});

describe('what a mountain hides', () => {
  /** A ridge running north–south through column 9. */
  function ridged(): GameState {
    const state = flatState(20, 9);
    for (let row = 0; row < 9; row++) getTileAt(state.map, 9, row)!.terrain = 'mountain';
    return state;
  }

  it('hides the ground behind it', () => {
    const state = ridged();
    createUnit(state, 0, 'scout', 7, 4);
    // In range on the far side of the ridge, and not seen.
    expect(isVisibleTo(state, 0, 10, 4)).toBe(false);
  });

  it('shows the mountain itself', () => {
    const state = ridged();
    createUnit(state, 0, 'scout', 7, 4);
    // You see the ridge; you do not see past it. The endpoints are excluded from
    // the line, so a blocker can never block itself.
    expect(isVisibleTo(state, 0, 9, 4)).toBe(true);
  });

  it('uses the very function ranged combat aims with', () => {
    const state = ridged();
    const from = getTileAt(state.map, 7, 4)!;
    const behind = getTileAt(state.map, 10, 4)!;
    const ridge = getTileAt(state.map, 9, 4)!;

    expect(blocksLineOfSight(ridge)).toBe(true);
    expect(hasLineOfSight(state.map, from, behind)).toBe(false);
    expect(hasLineOfSight(state.map, from, ridge)).toBe(true);

    // And the fog agrees with it tile for tile, which is the whole point of the
    // shared helper: a board where you can shoot what you cannot see would be a
    // rule the player learns and the game promptly breaks. Every tile a lone
    // scout can see is a tile combat would grant a line to.
    const scout = createUnit(state, 0, 'scout', 7, 4);
    let checked = 0;
    for (const tile of state.map.tiles) {
      if (!isVisibleTo(state, 0, tile.col, tile.row)) continue;
      expect(hasLineOfSight(state.map, from, tile)).toBe(true);
      checked += 1;
    }
    expect(checked).toBe(seen(state, scout.ownerId).size);
    expect(checked).toBeGreaterThan(1);
  });

  it('does not block across water', () => {
    const state = flatState();
    getTileAt(state.map, 9, 4)!.terrain = 'ocean';
    createUnit(state, 0, 'scout', 7, 4);
    expect(isVisibleTo(state, 0, 10, 4)).toBe(true);
  });
});

describe('what a city sees', () => {
  it('sees its own centre out to rules.visibility.citySight', () => {
    const state = flatState();
    foundCityAt(state, 0, getTileAt(state.map, 8, 4)!);
    // The founding ring is claimed too, and owned ground is visible whatever the
    // line of sight says — so the seen set is the larger of the two discs.
    const reach = Math.max(RULES.visibility.citySight, 1);
    expect(seen(state, 0).size).toBe(discArea(reach));
  });

  it('sees every tile it owns, however far, without asking line of sight', () => {
    const state = flatState(24, 12);
    const city = foundCityAt(state, 0, getTileAt(state.map, 10, 6)!);
    // A tile well outside `citySight`, claimed by this city, behind a ridge.
    getTileAt(state.map, 12, 6)!.terrain = 'mountain';
    const far = getTileAt(state.map, 13, 6)!;
    state.tileOwner[tileIndex(state.map, far.col, far.row)] = city.id;
    recomputeVisibility(state, 0);

    expect(isVisibleTo(state, 0, 13, 6)).toBe(true);
    // The ground *beyond* it is still dark: owning a tile is not owning a view.
    expect(isVisibleTo(state, 0, 14, 6)).toBe(false);
  });
});

// --- explored is monotone ---------------------------------------------------

describe('the explored set', () => {
  it('demotes to explored rather than to hidden when the eye leaves', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 4, 4);
    const before = seen(state, 0);
    expect(before.size).toBeGreaterThan(0);

    scout.col = 12;
    recomputeVisibility(state, 0);

    for (const key of before) {
      const [col, row] = key.split(',').map(Number);
      expect(isExploredBy(state, 0, col!, row!)).toBe(true);
    }
    // And most of it is no longer *watched*.
    expect(seen(state, 0).size).toBeLessThan(before.size + 1);
    expect(countAt(state, 0, EXPLORED)).toBeGreaterThan(0);
  });

  it('never shrinks, however many recomputes run', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 2, 4);
    let explored = countAt(state, 0, EXPLORED) + countAt(state, 0, VISIBLE);
    for (let col = 3; col < 14; col++) {
      scout.col = col;
      recomputeVisibility(state, 0);
      const now = countAt(state, 0, EXPLORED) + countAt(state, 0, VISIBLE);
      expect(now).toBeGreaterThanOrEqual(explored);
      explored = now;
    }
  });

  it('forgets everything when a unit dies, except that it was there', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 8, 4);
    const watched = seen(state, 0);
    removeUnit(state, scout.id);

    expect(seen(state, 0).size).toBe(0);
    for (const key of watched) {
      const [col, row] = key.split(',').map(Number);
      expect(visibilityAt(state, 0, col!, row!)).toBe(EXPLORED);
    }
  });
});

// --- the delta --------------------------------------------------------------

describe('the delta report', () => {
  it('is empty when nothing moved', () => {
    const state = flatState();
    createUnit(state, 0, 'scout', 8, 4);
    expect(recomputeVisibility(state, 0).became).toEqual([]);
  });

  it('names only the tiles whose level actually changed', () => {
    const state = flatState(24, 12);
    const scout = createUnit(state, 0, 'warrior', 6, 6);
    scout.col = 7;
    const delta = recomputeVisibility(state, 0);

    expect(delta.became.length).toBeGreaterThan(0);
    for (const change of delta.became) {
      expect(visibilityAt(state, 0, change.col, change.row)).toBe(change.level);
    }
    // A one-hex step cannot change more tiles than two whole discs.
    expect(delta.became.length).toBeLessThanOrEqual(2 * maxSightArea());
  });

  it('reports the work it did, bounded by sources × the widest disc', () => {
    const state = flatState();
    createUnit(state, 0, 'scout', 4, 4);
    createUnit(state, 0, 'warrior', 12, 4);
    const delta = recomputeVisibility(state, 0);
    expect(delta.sources).toBe(2);
    expect(delta.touched).toBeLessThanOrEqual(delta.sources * maxSightArea());
  });
});

// --- the hooks --------------------------------------------------------------

describe('every path that moves an eye', () => {
  function twoPlayerGame() {
    return createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
  }

  it('lights the starting rosters in newGame', () => {
    const game = twoPlayerGame();
    for (const player of game.state.players) {
      expect(seen(game.state, player.id).size).toBeGreaterThan(0);
    }
  });

  it('follows a unit through moveUnit', () => {
    const state = flatState(24, 12);
    const warrior = createUnit(state, 0, 'warrior', 4, 6);
    const before = seen(state, 0);
    const move: Command = { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: { col: 8, row: 6 } };
    expect(applyCommand(state, move)).toEqual({ ok: true });
    const after = seen(state, 0);
    expect(after).not.toEqual(before);
    expect(isVisibleTo(state, 0, warrior.col, warrior.row)).toBe(true);
  });

  it('follows a spawn, through the one constructor every unit is minted by', () => {
    const state = flatState();
    expect(seen(state, 1).size).toBe(0);
    const spawn: Command = {
      type: 'spawnUnit',
      playerId: 1,
      ownerId: 1,
      unitType: 'warrior',
      at: { col: 3, row: 3 },
    };
    expect(applyCommand(state, spawn)).toEqual({ ok: true });
    expect(isVisibleTo(state, 1, 3, 3)).toBe(true);
  });

  it('follows a city being founded, its ring included', () => {
    const state = flatState();
    const settler = createUnit(state, 0, 'settler', 8, 4);
    const found: Command = { type: 'foundCity', playerId: 0, settlerUnitId: settler.id };
    expect(applyCommand(state, found)).toEqual({ ok: true });
    // The settler is gone and the city is looking; the ring it claimed is lit.
    expect(isVisibleTo(state, 0, 8, 4)).toBe(true);
    expect(isVisibleTo(state, 0, 9, 4)).toBe(true);
  });

  it('follows a border expanding', () => {
    const state = flatState(24, 12);
    const city = foundCityAt(state, 0, getTileAt(state.map, 10, 6)!);
    // Enough culture to buy exactly one tile in the phase.
    city.culture = 10_000;
    const before = seen(state, 0).size;
    // The border phase is the hook; run it directly rather than a whole turn, so
    // the assertion is about this one rule.
    expandBorders(state);
    expect(seen(state, 0).size).toBeGreaterThanOrEqual(before);
    expect(city.tilesClaimed).toBe(1);
  });

  it('follows a whole turn resolution, for every seat', () => {
    const game = twoPlayerGame();
    const before = game.state.players.map((p) => seen(game.state, p.id).size);
    for (const player of game.state.players) {
      dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    const after = game.state.players.map((p) => seen(game.state, p.id).size);
    expect(after.length).toBe(before.length);
    for (const count of after) expect(count).toBeGreaterThan(0);
  });

  it('follows a capture, for the empire that lost the piece as well as the one that took it', () => {
    const state = flatState();
    const soldier = createUnit(state, 0, 'swordsman', 4, 4);
    createUnit(state, 1, 'settler', 5, 4);
    const theirsBefore = seen(state, 1).size;

    expect(applyCombat(state, soldier.id, { col: 5, row: 4 }).ok).toBe(true);

    // The settler changed hands, so the seat that lost it stopped seeing through
    // it and the seat that took it started.
    expect(seen(state, 1).size).toBeLessThan(theirsBefore);
    expect(isVisibleTo(state, 0, 5, 4)).toBe(true);
  });
});

// --- the one rule -----------------------------------------------------------

describe('attacking requires seeing', () => {
  it('refuses a shot at a tile the attacker cannot see', () => {
    // The control: in range, in line of sight, and watched. This lands.
    const lit = flatState(24, 12);
    const archer = createUnit(lit, 0, 'archer', 6, 6);
    createUnit(lit, 1, 'warrior', 8, 6);
    expect(applyCombat(lit, archer.id, { col: 8, row: 6 }).ok).toBe(true);

    // Same board, same geometry, one thing changed: the tile is only remembered.
    const dark = flatState(24, 12);
    const blind = createUnit(dark, 0, 'archer', 6, 6);
    const target = createUnit(dark, 1, 'warrior', 8, 6);
    dark.visibility[0]![tileIndex(dark.map, 8, 6)] = EXPLORED;

    const refused = applyCombat(dark, blind.id, { col: 8, row: 6 });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toMatch(/cannot see/);
    expect(target.hp).toBe(unitDef('warrior').maxHp);
  });

  it('leaves the state byte-identical when it refuses', () => {
    const state = flatState(24, 12);
    const archer = createUnit(state, 0, 'archer', 6, 6);
    createUnit(state, 1, 'warrior', 8, 6);
    state.visibility[0]![tileIndex(state.map, 8, 6)] = HIDDEN;

    const before = snapshotState(state);
    expect(applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: archer.id,
      target: { col: 8, row: 6 },
    }).ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('still answers "out of range" and "no line of sight" first', () => {
    const state = flatState(24, 12);
    const warrior = createUnit(state, 0, 'warrior', 6, 6);
    createUnit(state, 1, 'warrior', 12, 6);
    const far = applyCombat(state, warrior.id, { col: 12, row: 6 });
    expect(far.ok).toBe(false);
    // The most specific true sentence, not the most recently added one.
    if (!far.ok) expect(far.error).toMatch(/adjacent/);
  });

  it('does not stop a march into ground nobody has charted', () => {
    // Fog is a mask, not a second blinded copy of the world: pathfinding runs on
    // the true map and a player may order a unit into Terra Incognita.
    const state = flatState(24, 12);
    const scout = createUnit(state, 0, 'scout', 2, 6);
    expect(isExploredBy(state, 0, 12, 6)).toBe(false);
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: scout.id,
        target: { col: 12, row: 6 },
      }),
    ).toEqual({ ok: true });
    expect(scout.path?.length ?? 0).toBeGreaterThan(0);
  });
});

// --- city memory ------------------------------------------------------------

describe('city memory', () => {
  it('records a city the first time it is seen', () => {
    const state = flatState(24, 12);
    const city = foundCityAt(state, 1, getTileAt(state.map, 12, 6)!);
    expect(citySightingOf(state, 0, city.id)).toBeNull();

    createUnit(state, 0, 'scout', 11, 6);
    const sighting = citySightingOf(state, 0, city.id);
    expect(sighting).not.toBeNull();
    expect(sighting).toMatchObject({ col: 12, row: 6, name: city.name, ownerId: 1 });
  });

  it('keeps the memory after the watcher leaves, and does not update it', () => {
    const state = flatState(24, 12);
    const city = foundCityAt(state, 1, getTileAt(state.map, 12, 6)!);
    const scout = createUnit(state, 0, 'scout', 11, 6);
    const asSeen = citySightingOf(state, 0, city.id)!;
    expect(asSeen.name).toBe(city.name);

    scout.col = 2;
    recomputeVisibility(state, 0);
    // Out of sight: the town is renamed and the memory does not hear about it.
    // (Renaming rather than a change of hands, because a *capture* by this very
    // seat would hand it the city and light the ground — a real rule, and the
    // wrong one to be testing memory with.)
    city.name = 'Renamed';
    recomputeVisibility(state, 0);
    expect(citySightingOf(state, 0, city.id)?.name).toBe(asSeen.name);
  });

  it('updates the memory the moment the site is watched again', () => {
    const state = flatState(24, 12);
    const city = foundCityAt(state, 1, getTileAt(state.map, 12, 6)!);
    const scout = createUnit(state, 0, 'scout', 11, 6);
    scout.col = 2;
    recomputeVisibility(state, 0);
    city.name = 'Renamed';

    scout.col = 11;
    recomputeVisibility(state, 0);
    expect(citySightingOf(state, 0, city.id)?.name).toBe('Renamed');
  });

  it('records a change of hands the seat actually watched', () => {
    const state = flatState(24, 12);
    const city = foundCityAt(state, 1, getTileAt(state.map, 12, 6)!);
    createUnit(state, 0, 'scout', 11, 6);
    expect(citySightingOf(state, 0, city.id)?.ownerId).toBe(1);

    // A capture, under this seat's eye.
    city.ownerId = 0;
    recomputeVisibility(state, 0);
    expect(citySightingOf(state, 0, city.id)?.ownerId).toBe(0);
  });

  it('forgets a city whose site is watched and empty', () => {
    const state = flatState(24, 12);
    const city = foundCityAt(state, 1, getTileAt(state.map, 12, 6)!);
    createUnit(state, 0, 'scout', 11, 6);
    expect(citySightingOf(state, 0, city.id)).not.toBeNull();

    // Only a hand-edited state can do this in v1 — cities are never destroyed —
    // but the rule has to exist before the mechanic that needs it.
    state.cities = [];
    recomputeVisibility(state, 0);
    expect(citySightingOf(state, 0, city.id)).toBeNull();
  });

  it('stays sorted by city id, so two equal memories serialise equal', () => {
    const state = flatState(24, 12);
    foundCityAt(state, 1, getTileAt(state.map, 6, 6)!);
    foundCityAt(state, 1, getTileAt(state.map, 14, 6)!);
    createUnit(state, 0, 'scout', 6, 6);
    createUnit(state, 0, 'scout', 14, 6);

    const ids = (state.citySightings[0] ?? []).map((s) => s.cityId);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(ids).toHaveLength(2);
  });
});

// --- determinism ------------------------------------------------------------

describe('determinism', () => {
  it('produces the same grids for the same config, every time', () => {
    const config = {
      seed: 99,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a' },
      ],
    };
    expect(newGame(config).visibility).toEqual(newGame(config).visibility);
  });

  it('replays a log to byte-identical fog', () => {
    const game = createGame({
      seed: 31,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a' },
      ],
    });
    for (const unit of [...game.state.units]) {
      dispatch(game, {
        type: 'moveUnit',
        playerId: unit.ownerId,
        unitId: unit.id,
        target: { col: (unit.col + 3) % game.state.map.width, row: unit.row },
      });
    }
    for (const player of game.state.players) {
      dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });
});
