/**
 * **Where a built piece may stand** — `docs/flags.md` item (llll), the user's
 * ruling of 2026-09-11 ("i see units still being spawned outside the city when
 * there's a city garrison … when the city is sieged, it can overwrite an
 * attacking unit").
 *
 * Two rules, and they are separate questions that happen to meet in one walk:
 *
 *   · **A contested hex is never a spawn hex.** `hasStackingRoom` counts pieces
 *     of the same *category* and never asks whose they are — the stacking rule,
 *     right for a hex a unit marches onto and wrong for one it is conjured onto
 *     — so until this batch a built spearman could land on an enemy settler and
 *     a built worker on an enemy warrior. The skip is `foreignUnitAt`'s, inside
 *     `spawnTileFor`, shared by the naval and the land arm.
 *   · **Under siege, nothing spills.** A besieged town is by definition one
 *     whose whole landward ring is denied to it, which is exactly the ring the
 *     walk would spill into, so the completion takes the city hex or the piece
 *     waits — `onCityHexOnly` reused, for a different reason than the
 *     purchase's (item (hhhh)) and with both reasons written down.
 *
 * And the wait is a **state, not a lack**: the row keeps its place, the basket
 * keeps its hammers, and the piece lands the turn a hex clears. The last two
 * cases here are what that costs — nothing — read off the town rather than
 * argued about.
 */

import { describe, expect, it } from 'vitest';

import { createMap, getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import {
  foundCityAt,
  planProduction,
  productionAwaitingRoom,
  settleProduction,
  spawnTileFor,
  unitProductionCost,
} from '../../src/sim/cities';
import { siegeField, underSiege } from '../../src/sim/combat';
import { type City, type GameState, bumpRevision, createUnit, newGame } from '../../src/sim/state';
import type { Tile } from '../../src/sim/map';
import { resetVisibility } from '../../src/sim/visibility';

// --- harness ----------------------------------------------------------------

/** A two-player state on a blank, landlocked desert rectangle — `cities.test.ts`'s. */
function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'desert' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  return state;
}

function plant(state: GameState, ownerId: number, col: number, row: number): City {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return foundCityAt(state, ownerId, tile);
}

/** The six hexes around a town, in `neighborTiles` order — `combat.test.ts`'s. */
function ring(state: GameState, city: City): Tile[] {
  return neighborTiles(state.map, tileHex(getTileAt(state.map, city.col, city.row)!));
}

function isHex(tile: Tile | null, hex: Tile): boolean {
  return tile !== null && tile.col === hex.col && tile.row === hex.row;
}

/**
 * Hand a seat Siegecraft, which is what buys the starving since the Themes
 * Build — `combat.test.ts`'s `learnsSiege`, stated out loud per fixture.
 */
function learnsSiege(state: GameState, playerId: number): void {
  const player = state.players[playerId]!;
  if (!player.techsResearched.includes('siegecraft')) player.techsResearched.push('siegecraft');
  bumpRevision(state);
}

/**
 * A town of seat 0 with seat 1's army on **r0, r2 and r4**, which is a siege.
 *
 * Three besiegers rather than six, deliberately: a ring hex is next door to the
 * two beside it, so alternate hexes deny the whole ring (`siegeField`'s
 * `denied`, and `combat.test.ts` pins the arithmetic) — and it leaves r1, r3 and
 * r5 *empty*, so this fixture tests the siege rule and not the contested-hex
 * rule standing behind it. Without the siege cut the built piece would spill
 * onto r1, in among the army.
 */
function besiegedTown(): { state: GameState; city: City; hexes: Tile[] } {
  const state = flatState();
  learnsSiege(state, 1);
  const city = plant(state, 0, 8, 5);
  const hexes = ring(state, city);
  for (const index of [0, 2, 4]) {
    const hex = hexes[index]!;
    createUnit(state, 1, 'warrior', hex.col, hex.row);
  }
  bumpRevision(state);
  return { state, city, hexes };
}

// --- a contested hex is never a spawn hex ------------------------------------

describe('a hex another empire is standing on is never a spawn hex', () => {
  it('skips an enemy civilian when the piece being built is a soldier', () => {
    // The exact board the ruling names: the town's own garrison fills the
    // military slot on the centre, so the walk reaches the ring — and the first
    // hex of that ring is an enemy *worker*, which `hasStackingRoom` has
    // nothing to say about because it counts by category.
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const hexes = ring(state, city);
    createUnit(state, 0, 'warrior', city.col, city.row);
    createUnit(state, 1, 'worker', hexes[0]!.col, hexes[0]!.row);
    bumpRevision(state);

    const landed = spawnTileFor(state, city, 'warrior');
    expect(landed).not.toBeNull();
    expect(isHex(landed, hexes[0]!)).toBe(false);
    // It is a *skip* and not a refusal: the walk goes on and the next clear hex
    // takes the piece.
    expect(isHex(landed, hexes[1]!)).toBe(true);
  });

  it('skips an enemy soldier when the piece being built is a civilian', () => {
    // The same rule read the other way round, which is the half `hasStackingRoom`
    // could never have caught either: a worker finishing in a town whose first
    // free hex holds an enemy warrior.
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const hexes = ring(state, city);
    createUnit(state, 0, 'worker', city.col, city.row);
    createUnit(state, 1, 'warrior', hexes[0]!.col, hexes[0]!.row);
    bumpRevision(state);

    const landed = spawnTileFor(state, city, 'worker');
    expect(isHex(landed, hexes[0]!)).toBe(false);
    expect(isHex(landed, hexes[1]!)).toBe(true);
  });

  it('still takes a hex holding one of the town’s own pieces of another category', () => {
    // The rule is about *whose*, never about what: the stacking caps are
    // untouched, so an own worker standing on r0 leaves the military slot there
    // open and the spearman takes it. A rule written as "is anything standing
    // here" would have cost the town its own ring.
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const hexes = ring(state, city);
    createUnit(state, 0, 'warrior', city.col, city.row);
    createUnit(state, 0, 'worker', hexes[0]!.col, hexes[0]!.row);
    bumpRevision(state);

    expect(isHex(spawnTileFor(state, city, 'warrior'), hexes[0]!)).toBe(true);
  });

  it('leaves the piece waiting when every clear hex is contested', () => {
    // A whole ring of enemies and a garrisoned centre is the boxed-in case, and
    // `null` is the answer the completion already knows how to hold.
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    createUnit(state, 0, 'warrior', city.col, city.row);
    for (const hex of ring(state, city)) createUnit(state, 1, 'warrior', hex.col, hex.row);
    bumpRevision(state);

    expect(spawnTileFor(state, city, 'warrior')).toBeNull();
  });
});

// --- under siege, nothing spills ---------------------------------------------

describe('under siege a completion takes the city hex or waits', () => {
  it('spills to a neighbour when nobody has closed the ring', () => {
    // The control, and the half of vanilla the ruling deliberately kept
    // (option 3, "no spill ever", was declined): a peacetime town with a
    // garrison still puts the new piece one hex over.
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    createUnit(state, 0, 'warrior', city.col, city.row);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);

    expect(underSiege(state, city, siegeField(state, city.ownerId))).toBe(false);
    const landed = planProduction(state, city, unitProductionCost(state, 0, 'warrior'));
    expect(landed?.kind).toBe('unit');
    expect(landed?.kind === 'unit' && landed.tile.col === city.col).toBe(false);
  });

  it('holds the piece while the town is cut off and its own hex is taken', () => {
    const { state, city, hexes } = besiegedTown();
    createUnit(state, 0, 'warrior', city.col, city.row);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    expect(underSiege(state, city, siegeField(state, city.ownerId))).toBe(true);
    // Not vacuous: the same row, on the same board, with the ring open.
    expect(spawnTileFor(state, city, 'warrior')).not.toBeNull();

    // r1 is empty, passable and has room — so the *only* thing holding the piece
    // is the siege cut. This is the assertion the ruling is about.
    expect(hexes[1]!.col === city.col && hexes[1]!.row === city.row).toBe(false);
    expect(
      state.units.some((unit) => unit.col === hexes[1]!.col && unit.row === hexes[1]!.row),
    ).toBe(false);
    expect(planProduction(state, city, unitProductionCost(state, 0, 'warrior'))).toBeNull();
  });

  it('lands it on the centre the turn the garrison steps out', () => {
    const { state, city, hexes } = besiegedTown();
    const garrison = createUnit(state, 0, 'warrior', city.col, city.row);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    expect(planProduction(state, city, unitProductionCost(state, 0, 'warrior'))).toBeNull();

    // The one move a player can actually make here — the garrison sallies onto
    // an open hex of the ring — and the siege is unchanged by it.
    garrison.col = hexes[1]!.col;
    garrison.row = hexes[1]!.row;
    bumpRevision(state);
    expect(underSiege(state, city, siegeField(state, city.ownerId))).toBe(true);

    const plan = planProduction(state, city, unitProductionCost(state, 0, 'warrior'));
    expect(plan?.kind).toBe('unit');
    expect(plan?.kind === 'unit' && plan.tile.col === city.col && plan.tile.row === city.row).toBe(
      true,
    );
  });
});

// --- the wait costs the town nothing -----------------------------------------

describe('a piece waiting for room keeps its hammers and its place', () => {
  function waiting(): { state: GameState; city: City; cost: number } {
    const { state, city } = besiegedTown();
    createUnit(state, 0, 'warrior', city.col, city.row);
    const cost = unitProductionCost(state, 0, 'warrior');
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = cost + 7;
    bumpRevision(state);
    return { state, city, cost };
  }

  it('settles nothing, spends nothing and loses no overflow', () => {
    const { state, city, cost } = waiting();
    const before = city.hammerBasket;

    expect(settleProduction(state, city)).toBeNull();
    expect(city.hammerBasket).toBe(before);
    expect(city.queue).toEqual([{ kind: 'unit', id: 'warrior' }]);
    // Which is also the whole of why the bot cannot thrash on this town: the
    // queue is not empty, so no seat is ever asked to choose again. See the
    // register below.
    expect(city.queue).toHaveLength(1);

    // And the moment the hex clears, the same basket finishes the same row with
    // the overflow intact.
    state.units = state.units.filter((unit) => unit.col !== city.col || unit.row !== city.row);
    bumpRevision(state);
    const done = settleProduction(state, city);
    expect(done?.name).toBe('Warrior');
    expect(city.hammerBasket).toBe(before - cost);
    expect(city.queue).toEqual([]);
  });

  it('is the reading the panel prints, and it names the piece', () => {
    const { state, city } = waiting();
    expect(productionAwaitingRoom(state, city)).toBe('warrior');

    // Not a lack of hammers: a town that simply has not paid for the row yet is
    // not waiting for room, and the panel must not say it is.
    city.hammerBasket = 1;
    bumpRevision(state);
    expect(productionAwaitingRoom(state, city)).toBeNull();
  });

  it('says nothing about a town whose front row is a building', () => {
    const { state, city } = waiting();
    city.queue = [{ kind: 'building', id: 'monument' }];
    bumpRevision(state);
    expect(productionAwaitingRoom(state, city)).toBeNull();
  });
});

// --- the register ------------------------------------------------------------

/**
 * **Nothing re-decides a town that is merely waiting**, asserted off the source
 * because it is a claim about doors that do *not* open (CLAUDE.md: a
 * source-reading register test is always core).
 *
 * Three doors exist onto a town's production and each of them is shut here: the
 * End Turn blocker fires on an **empty** queue, and the bot's two re-decision
 * arms fire on a queue whose front is a **project**. A waiting unit is neither,
 * so the row stands and the appraisal is never asked a second time — which is
 * the ruling's "the bots' production chooser must not thrash on a waiting head"
 * read as the shape of the code rather than as a behaviour to tune.
 */
describe('the doors onto a town’s production stay shut on a waiting head', () => {
  const SOURCES = import.meta.glob(['../../src/ui/turnBlockers.ts', '../../src/ai/bot.ts'], {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>;

  function source(name: string): string {
    const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${name}`));
    if (key === undefined) throw new Error(`source not globbed: ${name}`);
    return SOURCES[key]!;
  }

  it('raises `cityProduction` for an empty queue and nothing else', () => {
    const text = source('turnBlockers.ts');
    const raises = text
      .split('\n')
      .filter((line) => line.includes("kind: 'cityProduction'") && line.includes('return'));
    expect(raises).toHaveLength(1);
    expect(raises[0]).toContain('city.queue.length === 0');
  });

  it('gives the bot’s two re-decisions a project at the front, never a unit', () => {
    const text = source('bot.ts');
    for (const fn of ['function projectIdleCommand(', 'function puppetRedecisionTable(']) {
      const at = text.indexOf(fn);
      expect(at, `${fn} is gone from bot.ts`).toBeGreaterThan(0);
      const body = text.slice(at, at + 900);
      expect(body).toContain("front.kind !== 'project'");
    }
  });
});
