/**
 * **The copies model** — batch R1 of `docs/strategic-resources-proposal.md`.
 *
 * A unit that needs a strategic resource holds one copy of it for as long as it
 * lives. Build a horseman and one horse is spoken for; lose the horseman and the
 * horse comes back. When every copy is spoken for you cannot build, buy or
 * upgrade into another one until something frees a copy.
 *
 * What this file holds still, in the order the model is built:
 *
 *   1. **The two readings are different questions.** `resourceCopies` and
 *      `hasResource` answer "what do I control"; `committedCopies` answers "what
 *      have I spent"; `availableCopies` is the subtraction. `hasResource` keeps
 *      its old meaning, because the luxury signatures and the card evaluator ask
 *      it legitimately — if it quietly became the new question, fielding an army
 *      would switch off an empire's economy.
 *   2. **A living unit holds a copy**, and hands it back on death, on disband
 *      and on capture, with no rule of its own: the count is a walk of
 *      `state.units`, and a piece that is gone is not in it.
 *   3. **A queued row holds a copy too** (ruling 5, "reserve on queueing"), so
 *      the refusal lands at the button rather than ten turns later.
 *   4. **A free unit holds nothing** (ruling 6), tested through `Unit.freeUpkeep`
 *      — the existing marker for "this empire never paid for this piece".
 *   5. **A row may accept either of two resources** and takes one copy of one of
 *      them. The tie-break is the first in the row's own order that has a copy
 *      free, and it is pinned here on a row this file builds for the pin,
 *      because no live row writes a pair yet (batch R3 does).
 *   6. **The upgrade ladder stops at a rung whose copy is spent**, and a rung
 *      that shares its resource with the rung below carries the copy up.
 *   7. **A bargain may promise only available copies** (ruling 4).
 *   8. **Nothing here is remembered**, and a reading taken between commands
 *      changes no outcome.
 *
 * Ruling 3 runs through all of it: when an empire loses a copy it was using,
 * nothing happens to the units. They keep fighting; you simply build no more.
 */

import { describe, expect, it } from 'vitest';

import {
  availableCopies,
  canSpareAnyOf,
  committedCopies,
  controlsAnyOf,
  foundCityAt,
  hasResource,
  resourceCopies,
} from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { improvementForResource } from '../../src/sim/improvementData';
import { dealSideError } from '../../src/sim/diplomacy';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import { snapshotState } from '../../src/sim/game';
import { bumpEconomy } from '../../src/sim/slate';
import {
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  newGame,
  removeUnit,
  captureUnit,
} from '../../src/sim/state';
import { buildError, upgradeTargetForType } from '../../src/sim/tech';
import { TECH_IDS } from '../../src/sim/techData';
import {
  UNIT_TYPE_IDS,
  type UnitTypeId,
  requiredResourcesOf,
  unitDef,
} from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import type { ResourceId } from '../../src/sim/resourceData';

// --- the bench --------------------------------------------------------------

/**
 * A two-seat game on blank grassland with no resources anywhere and every
 * technology researched, so the *only* thing that can refuse a queue is a
 * resource. `test/mapgen/resources.test.ts`' fixture, which is the file next
 * door and about the other half of the same rule.
 */
function bench(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/**
 * The hexes a town founded at (5,5) owns, its own centre left out — the ring
 * `foundCityAt` claims, listed rather than guessed at, because a seam on an
 * unowned hex is in nobody's hands and would make every count in this file
 * quietly one short.
 */
const RING: readonly (readonly [number, number])[] = [
  [5, 4],
  [6, 4],
  [4, 5],
  [6, 5],
  [5, 6],
  [6, 6],
];

/**
 * Opens `count` copies of a resource inside seat 0's borders, starting at the
 * `from`th hex of the ring so two kinds can sit on one board without standing
 * on each other. The improvement is the one the table says opens that seam
 * (`improvementForResource` — a mine for iron, a pasture for horses, a camp for
 * ivory), asked rather than named, so a retune of the table does not quietly
 * turn every count here into a zero. The bench pokes the state, so it announces
 * the way a writer does.
 */
function seam(state: GameState, id: ResourceId, count: number, from = 0): void {
  const improvement = improvementForResource(id);
  if (improvement === null) throw new Error(`nothing opens ${id}`);
  for (let i = 0; i < count; i++) {
    const where = RING[from + i];
    if (!where) throw new Error('the bench ring is full');
    const tile = at(state, where[0], where[1]);
    tile.resource = id;
    tile.improvement = improvement;
  }
  bumpEconomy(state);
}

/** Takes the work off the `index`th ring hex — a pillage, for ruling 3. */
function pillage(state: GameState, index: number): void {
  const where = RING[index]!;
  delete at(state, where[0], where[1]).improvement;
  bumpEconomy(state);
}

/** The bench's standard board: a town at (5,5) and `count` improved iron. */
function ironBench(count: number): { state: GameState; cityId: number } {
  const state = bench();
  const city = foundCityAt(state, 0, at(state, 5, 5));
  seam(state, 'iron', count);
  return { state, cityId: city.id };
}

function setQueue(state: GameState, cityId: number, queue: UnitTypeId[]) {
  return applyCommand(state, {
    type: 'setCityProduction',
    playerId: 0,
    cityId,
    queue: queue.map((id) => ({ kind: 'unit' as const, id })),
  });
}

/**
 * Runs `body` with a row's `requiresResource` overridden, then puts the table
 * back — including on the way out of a throw.
 *
 * The unit table's `withExtraResources` (`resourceData.ts`), scoped to this file
 * because the claim it holds up is this file's. No live row writes a resource
 * *pair* yet — batch R3 does — and the discipline this codebase keeps is that a
 * shape declared and never read fails its register test. So the pair is pinned
 * behaviourally on a row built for the pin, and the test below asserts the live
 * catalogue carries none; the day R3 writes one, that assertion fails and
 * somebody deletes this note along with it.
 *
 * Nothing memoises off the unit table, so there is no slate to discard here the
 * way `withExtraResources` has to.
 */
function withRequirement<T>(
  id: UnitTypeId,
  wants: ResourceId | ResourceId[] | undefined,
  body: () => T,
): T {
  const def = unitDef(id);
  const before = def.requiresResource;
  def.requiresResource = wants;
  try {
    return body();
  } finally {
    def.requiresResource = before;
  }
}

// --- 1. the two questions ---------------------------------------------------

describe('the copies model keeps control and commitment apart', () => {
  it('counts what an empire controls, what it has spent, and the difference', () => {
    const { state } = ironBench(3);
    expect(resourceCopies(state, 0, 'iron')).toBe(3);
    expect(committedCopies(state, 0, 'iron')).toBe(0);
    expect(availableCopies(state, 0, 'iron')).toBe(3);

    createUnit(state, 0, 'swordsman', 5, 6);
    expect(resourceCopies(state, 0, 'iron')).toBe(3);
    expect(committedCopies(state, 0, 'iron')).toBe(1);
    expect(availableCopies(state, 0, 'iron')).toBe(2);
  });

  it('leaves `hasResource` answering the old question — do I control any at all', () => {
    const { state } = ironBench(1);
    createUnit(state, 0, 'swordsman', 5, 6);
    // The whole of the claim: the last copy is spent, and the empire still has
    // iron. An empire whose iron is in a swordsman's hand still owns iron mines
    // and those mines still pay iron's yields — which is what the luxury
    // signatures, the empire bonuses R2 builds and the card evaluator all read.
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    expect(hasResource(state, 0, 'iron')).toBe(true);
    expect(controlsAnyOf(state, 0, ['iron'])).toBe(true);
    expect(canSpareAnyOf(state, 0, ['iron'])).toBe(false);
  });

  it('floors at nothing when an empire is past its holdings (ruling 3)', () => {
    const { state } = ironBench(2);
    createUnit(state, 0, 'swordsman', 5, 6);
    createUnit(state, 0, 'swordsman', 5, 7);
    // The mine under them is pillaged. **Nothing happens to the units** — the
    // user's ruling 3, "let's go with a" — they keep fighting and the empire
    // simply builds no more until it is back in the black.
    pillage(state, 0);
    expect(resourceCopies(state, 0, 'iron')).toBe(1);
    expect(committedCopies(state, 0, 'iron')).toBe(2);
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    expect(state.units.filter((unit) => unit.type === 'swordsman')).toHaveLength(2);
  });

  it('counts a barbarian seat against nobody but itself', () => {
    const state = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
      barbarians: true,
    });
    state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
    resetVisibility(state);
    state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
    state.units = [];
    state.cities = [];
    state.nextEntityId = 1;
    for (const player of state.players) player.techsResearched = [...TECH_IDS];
    foundCityAt(state, 0, at(state, 5, 5));
    seam(state, 'iron', 2);
    const wild = state.players[state.players.length - 1]!;
    createUnit(state, wild.id, 'swordsman', 8, 8);
    // The walk is by owner, so the wild's swordsman is the wild's problem — and
    // the wild owns no ground to spend, which is why nothing has to say so.
    expect(committedCopies(state, 0, 'iron')).toBe(0);
    expect(availableCopies(state, 0, 'iron')).toBe(2);
    expect(resourceCopies(state, wild.id, 'iron')).toBe(0);
  });
});

// --- 2. a unit holds a copy while it lives ----------------------------------

describe('a living unit holds a copy and hands it back', () => {
  it('frees the copy when the unit dies', () => {
    const { state } = ironBench(1);
    const sword = createUnit(state, 0, 'swordsman', 5, 6);
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    removeUnit(state, sword.id);
    expect(availableCopies(state, 0, 'iron')).toBe(1);
  });

  it('frees the copy when the unit is disbanded', () => {
    const { state } = ironBench(1);
    const sword = createUnit(state, 0, 'swordsman', 5, 6);
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    const result = applyCommand(state, {
      type: 'disbandUnit',
      playerId: 0,
      unitId: sword.id,
    });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(availableCopies(state, 0, 'iron')).toBe(1);
  });

  it('frees the copy when the unit is captured', () => {
    const { state } = ironBench(1);
    const sword = createUnit(state, 0, 'swordsman', 5, 6);
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    captureUnit(state, sword, 1);
    // Seat 0 gets its iron back because the piece is no longer its own. Seat 1
    // pays nothing for it — a piece you took is not a piece you raised out of
    // your own stables, and `captureUnit` marks it `freeUpkeep` for exactly
    // that reason.
    expect(availableCopies(state, 0, 'iron')).toBe(1);
    expect(committedCopies(state, 1, 'iron')).toBe(0);
  });

  it('holds nothing for a free unit (ruling 6)', () => {
    const { state } = ironBench(1);
    const granted: Unit = createUnit(state, 0, 'longswordsman', 5, 6);
    // `Unit.freeUpkeep` is the marker every free-unit seam already writes — a
    // card's levy, a ruin's escort, a wonder's completion grant — so a free
    // knight that needs no horse is the same rule as a free knight that costs no
    // maintenance rather than a second meaning of "free".
    granted.freeUpkeep = true;
    expect(committedCopies(state, 0, 'iron')).toBe(0);
    expect(availableCopies(state, 0, 'iron')).toBe(1);
    expect(buildError(state, 0, 'unit', 'longswordsman')).toBeNull();
  });
});

// --- 3. a queued row holds one too (ruling 5) -------------------------------

describe('a queued row reserves its copy', () => {
  it('reserves on queueing and refuses the row past the last copy', () => {
    const { state, cityId } = ironBench(2);
    expect(setQueue(state, cityId, ['longswordsman', 'longswordsman']).ok).toBe(true);
    expect(committedCopies(state, 0, 'iron')).toBe(2);
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    // The refusal lands **at the button**, which is the whole point of ruling 5:
    // a third row accepted here would be ten turns of hammers spent on a piece
    // that could never be put down.
    const third = setQueue(state, cityId, ['longswordsman', 'longswordsman', 'longswordsman']);
    expect(third.ok).toBe(false);
    expect(third.ok === false && third.error).toBe(
      'Longswordsman needs improved Iron (your empire has 2 and every one is already spoken for)',
    );
    // And the rejected command left the queue exactly as it was (hard rule 1).
    expect(state.cities[0]!.queue).toHaveLength(2);
  });

  it('lets a town re-send the queue it already has', () => {
    const { state, cityId } = ironBench(2);
    expect(setQueue(state, cityId, ['longswordsman', 'longswordsman']).ok).toBe(true);
    // The row being replaced must not be counted against itself. This is the
    // copies model's version of the wonder clause's `city` argument: without it
    // every later edit of a queue holding a gated unit would be illegal.
    expect(setQueue(state, cityId, ['longswordsman', 'longswordsman']).ok).toBe(true);
    expect(state.cities[0]!.queue).toHaveLength(2);
  });

  it('releases the copy when the row is taken out of the queue', () => {
    const { state, cityId } = ironBench(1);
    expect(setQueue(state, cityId, ['longswordsman']).ok).toBe(true);
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    expect(setQueue(state, cityId, ['warrior']).ok).toBe(true);
    expect(committedCopies(state, 0, 'iron')).toBe(0);
    expect(availableCopies(state, 0, 'iron')).toBe(1);
  });

  it('counts a second town’s queue against the same empire pool', () => {
    const { state, cityId } = ironBench(1);
    const other = foundCityAt(state, 0, at(state, 8, 7));
    expect(setQueue(state, cityId, ['longswordsman']).ok).toBe(true);
    const refused = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: other.id,
      queue: [{ kind: 'unit', id: 'longswordsman' }],
    });
    expect(refused.ok).toBe(false);
    expect(refused.ok === false && refused.error).toContain('already spoken for');
  });

  it('refuses a purchase past the last copy, and allows one inside it', () => {
    const { state } = ironBench(1);
    // Poking the treasury by hand is a hand mutation, so it announces itself —
    // `benches.test.ts` keeps the register, and the reason is this file's own
    // subject: a reading taken against a board somebody moved in silence is a
    // reading of the board as it was.
    state.players[0]!.gold = 100000;
    bumpRevision(state);
    // A purchase is a *new* piece and holds nothing yet, so it is gated on a
    // spare copy exactly as a queue row is — `purchaseError` asks `buildError`.
    expect(buildError(state, 0, 'unit', 'longswordsman')).toBeNull();
    createUnit(state, 0, 'longswordsman', 5, 6);
    expect(buildError(state, 0, 'unit', 'longswordsman')).toContain('already spoken for');
  });
});

// --- 4. the refusals say what is actually wrong -----------------------------

describe('the refusal names the real problem', () => {
  it('says the empire has none when it controls none', () => {
    const state = bench();
    foundCityAt(state, 0, at(state, 5, 5));
    expect(buildError(state, 0, 'unit', 'longswordsman')).toBe('Longswordsman needs improved Iron');
  });

  it('says the copies are spoken for when the empire holds some', () => {
    const { state } = ironBench(1);
    createUnit(state, 0, 'longswordsman', 5, 6);
    // "needs improved Iron" said to a player who has iron and has spent it is a
    // lie that sends them prospecting. The count is the one they are looking at
    // on their own map.
    expect(buildError(state, 0, 'unit', 'longswordsman')).toBe(
      'Longswordsman needs improved Iron (your empire has one and it is already spoken for)',
    );
  });
});

// --- 5. the pair ------------------------------------------------------------

describe('a row that accepts either of two resources', () => {
  it('names no pair in the live catalogue yet — batch R3 writes the first', () => {
    // The D2b discipline, one system over: a shape declared and never read is a
    // shape nobody has tested. The pair is pinned behaviourally below on a row
    // this file builds; this assertion is what fails the day a real row writes
    // one, so that somebody deletes the note on `UnitDef.requiresResource`.
    const pairs = UNIT_TYPE_IDS.filter((id) => Array.isArray(unitDef(id).requiresResource));
    expect(pairs).toEqual([]);
    // And the reading is already the list form everywhere, single rows included.
    expect(requiredResourcesOf(unitDef('swordsman'))).toEqual(['iron']);
    expect(requiredResourcesOf(unitDef('warrior'))).toEqual([]);
  });

  it('takes one copy of one of the two, never one of each', () => {
    const { state } = ironBench(1);
    seam(state, 'horses', 1, 1);
    // A blade that may be forged from iron *or* horses — nonsense as design and
    // exactly right as a pin, because what is being held still is the shape.
    withRequirement('longswordsman', ['iron', 'horses'], () => {
      expect(availableCopies(state, 0, 'iron')).toBe(1);
      expect(availableCopies(state, 0, 'horses')).toBe(1);
      createUnit(state, 0, 'longswordsman', 5, 6);
      // One copy, of one of them — the empire is not two copies poorer.
      expect(committedCopies(state, 0, 'iron') + committedCopies(state, 0, 'horses')).toBe(1);
    });
  });

  it('takes the first in the row’s own order that still has a copy free', () => {
    const { state } = ironBench(1);
    seam(state, 'horses', 1, 1);
    withRequirement('longswordsman', ['iron', 'horses'], () => {
      createUnit(state, 0, 'longswordsman', 5, 6);
      // **The stated tie-break**, and the only contention question the model
      // asks. Left to right through the row's own array, so a replay reproduces
      // it (hard rule 2 — iterate arrays, never Map order).
      expect(committedCopies(state, 0, 'iron')).toBe(1);
      expect(committedCopies(state, 0, 'horses')).toBe(0);
      // The second piece finds iron spent and falls to the next id in the list.
      createUnit(state, 0, 'longswordsman', 5, 7);
      expect(committedCopies(state, 0, 'iron')).toBe(1);
      expect(committedCopies(state, 0, 'horses')).toBe(1);
    });
    // The same board read with the list written the other way round takes the
    // other copy first, which is the proof that the *order* is the rule rather
    // than some property of iron.
    const { state: mirror } = ironBench(1);
    seam(mirror, 'horses', 1, 1);
    withRequirement('longswordsman', ['horses', 'iron'], () => {
      createUnit(mirror, 0, 'longswordsman', 5, 6);
      expect(committedCopies(mirror, 0, 'horses')).toBe(1);
      expect(committedCopies(mirror, 0, 'iron')).toBe(0);
    });
  });

  it('builds while either of the two has a copy free, and stops when neither has', () => {
    const { state } = ironBench(1);
    seam(state, 'horses', 1, 1);
    withRequirement('longswordsman', ['iron', 'horses'], () => {
      expect(buildError(state, 0, 'unit', 'longswordsman')).toBeNull();
      createUnit(state, 0, 'longswordsman', 5, 6);
      expect(buildError(state, 0, 'unit', 'longswordsman')).toBeNull();
      createUnit(state, 0, 'longswordsman', 5, 7);
      // Both spent. The refusal names both resources, in the row's order.
      expect(buildError(state, 0, 'unit', 'longswordsman')).toBe(
        'Longswordsman needs improved Iron or Horses ' +
          '(your empire has 2 and every one is already spoken for)',
      );
    });
  });

  it('names both resources when the empire controls neither', () => {
    const state = bench();
    foundCityAt(state, 0, at(state, 5, 5));
    withRequirement('longswordsman', ['iron', 'horses'], () => {
      expect(buildError(state, 0, 'unit', 'longswordsman')).toBe(
        'Longswordsman needs improved Iron or Horses',
      );
    });
  });

  it('is deterministic: the same board answers the same way twice', () => {
    function read(): string {
      const { state } = ironBench(2);
      seam(state, 'horses', 2, 2);
      return withRequirement('longswordsman', ['iron', 'horses'], () => {
        for (let i = 0; i < 3; i++) createUnit(state, 0, 'longswordsman', 5, 6 + i);
        return JSON.stringify([
          committedCopies(state, 0, 'iron'),
          committedCopies(state, 0, 'horses'),
        ]);
      });
    }
    expect(read()).toBe(read());
    expect(read()).toBe('[2,1]');
  });
});

// --- 6. the upgrade ladder --------------------------------------------------

describe('the upgrade ladder stops at a rung whose copy is spent', () => {
  it('climbs a rung that needs a copy nobody is using', () => {
    const { state } = ironBench(1);
    // Every technology is researched on this bench, so the only thing between a
    // warrior and the top of its chain is the iron.
    expect(upgradeTargetForType(state, 0, 'warrior')).toBe('longswordsman');
  });

  it('refuses the climb when the empire’s own army holds every copy', () => {
    const { state } = ironBench(1);
    createUnit(state, 0, 'swordsman', 5, 6);
    // **An upgrade can be blocked by your own army**, which is the subtlety
    // worth naming: a warrior climbing to a swordsman is a *new* claim on the
    // empire's iron, not a transfer. One iron, one swordsman, and the warrior
    // stays a warrior.
    expect(upgradeTargetForType(state, 0, 'warrior')).toBeNull();
    // And the build list agrees, which is the whole reason the two ask one
    // walk: the antiquated row stays on offer exactly as long as the better one
    // is out of reach.
    expect(buildError(state, 0, 'unit', 'warrior')).toBeNull();
  });

  it('carries a copy up a rung that shares its resource', () => {
    const { state } = ironBench(1);
    const sword = createUnit(state, 0, 'swordsman', 5, 6);
    // The swordsman is already holding the only iron. Becoming a longswordsman
    // is the same copy in a different pair of hands, so asking for a spare here
    // would freeze the whole sword line at its first rung.
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    expect(requiredResourcesOf(unitDef('swordsman'))).toEqual(['iron']);
    expect(requiredResourcesOf(unitDef('longswordsman'))).toEqual(['iron']);
    expect(upgradeTargetForType(state, 0, sword.type)).toBe('longswordsman');
  });

  it('still stops a shared rung when the empire loses the resource outright', () => {
    const { state } = ironBench(1);
    const sword = createUnit(state, 0, 'swordsman', 5, 6);
    pillage(state, 0);
    expect(hasResource(state, 0, 'iron')).toBe(false);
    expect(upgradeTargetForType(state, 0, sword.type)).toBeNull();
  });
});

// --- 7. the trade gate (ruling 4) -------------------------------------------

describe('a bargain may promise only available copies', () => {
  /** Ivory is the kind this reaches today: a luxury the war elephant spends. */
  function ivoryBench(count: number): GameState {
    const state = bench();
    foundCityAt(state, 0, at(state, 5, 5));
    seam(state, 'ivory', count);
    return state;
  }

  it('lets an empire lend a copy nothing is standing on', () => {
    const state = ivoryBench(1);
    expect(resourceCopies(state, 0, 'ivory')).toBe(1);
    expect(dealSideError(state, 0, 1, { luxuries: ['ivory'] }, false)).toBeNull();
  });

  it('refuses a copy the empire’s own army has spoken for', () => {
    const state = ivoryBench(1);
    expect(requiredResourcesOf(unitDef('warElephant'))).toEqual(['ivory']);
    createUnit(state, 0, 'warElephant', 5, 6);
    expect(resourceCopies(state, 0, 'ivory')).toBe(1);
    expect(availableCopies(state, 0, 'ivory')).toBe(0);
    expect(dealSideError(state, 0, 1, { luxuries: ['ivory'] }, false)).toBe(
      'The A have no ivory to spare — every copy is already spoken for',
    );
  });

  it('keeps the older sentence for an empire that holds none at all', () => {
    const state = bench();
    foundCityAt(state, 0, at(state, 5, 5));
    expect(dealSideError(state, 0, 1, { luxuries: ['ivory'] }, false)).toBe(
      'The A have no ivory to lend',
    );
  });

  it('lends the spare of two and refuses the second', () => {
    const state = ivoryBench(2);
    createUnit(state, 0, 'warElephant', 5, 6);
    expect(availableCopies(state, 0, 'ivory')).toBe(1);
    expect(dealSideError(state, 0, 1, { luxuries: ['ivory'] }, false)).toBeNull();
  });
});

// --- 8. the clock, and the reading at rest ----------------------------------

describe('the committed reading is on no clock at all', () => {
  /** The simulation's own source, read the way every register test reads it. */
  const SOURCES = import.meta.glob('../../src/sim/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  function simSource(name: string): string {
    const found = Object.entries(SOURCES).find(([path]) => path.endsWith(`/${name}`));
    if (!found) throw new Error(`resourceCopies test: no source for ${name}`);
    return found[1];
  }

  const SOURCE = simSource('cities.ts');

  /** The body of one function in `cities.ts`, up to the next top-level close. */
  function bodyOf(name: string): string {
    const start = SOURCE.indexOf(`function ${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    const end = SOURCE.indexOf('\n}\n', start);
    expect(end, name).toBeGreaterThan(start);
    return SOURCE.slice(start, end);
  }

  it('remembers nothing, and says why in its own docblock', () => {
    // **Neither clock is safe for this** (`slate.ts`, "The two clocks"):
    //
    //   · the *economy* clock moves when ground or a bargain changes, and a unit
    //     being trained, dying or joining a queue is neither — a committed count
    //     remembered under it would be stale the moment a piece died;
    //   · the *revision* clock is raised after a handler and after a phase, so a
    //     reader between its own writes gets the world as it was on the way in.
    //     `upgradeUnits` is exactly that reader: it retypes the army one piece at
    //     a time and every retyping changes what the next piece may climb to.
    //
    // So the walk runs fresh. It is a pass over one seat's units and its cities'
    // queues — no map sweep, no tile — and the gate only reaches it for the
    // roster rows that actually name a resource.
    for (const name of ['resolveCommitments', 'committedCopies', 'availableCopies']) {
      expect(bodyOf(name), name).not.toContain('slateMemo');
    }
    // The map sweep underneath it is still remembered, where it belongs.
    expect(bodyOf('resourceCopies')).toContain("slateMemo(state, 'economy'");
    // And the argument is written down beside the code, not only here.
    expect(SOURCE).toContain('This is not on the slate, and that is deliberate');
  });

  it('pins the two callers that ask the ground rather than the ledger', () => {
    // `BuildGateOptions.ignoreCommitments` is an exception and a third caller
    // should have to decide to want one. Both are argued on the option's own
    // docblock: a free grant is refused by nothing (ruling 6), and a town's
    // walls follow the ground rather than the empire's army.
    const sources: Record<string, string> = {
      'src/sim/cities.ts': SOURCE,
      'src/sim/combat.ts': simSource('combat.ts'),
    };
    const callers: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      if (text.includes('ignoreCommitments: true')) callers.push(file);
    }
    expect(callers.sort()).toEqual(['src/sim/cities.ts', 'src/sim/combat.ts']);
    // One each, not two hiding in one file.
    for (const text of Object.values(sources)) {
      expect(text.split('ignoreCommitments: true')).toHaveLength(2);
    }
  });

  it('a reading taken at rest changes no outcome', () => {
    /**
     * One seat queues a gated unit on a board where the copies are worth
     * reading, with the copies reading either taken a moment before the command
     * or never taken at all. The two boards are the claim: a cache keyed on a
     * counter raised after the fact is an input, and an input shows up here.
     */
    function queues(warm: boolean): string {
      const { state, cityId } = ironBench(2);
      createUnit(state, 0, 'longswordsman', 5, 6);
      // **The whole of the experiment.** Nothing else differs between the two
      // boards: one of them was looked at.
      if (warm) {
        availableCopies(state, 0, 'iron');
        committedCopies(state, 0, 'iron');
        upgradeTargetForType(state, 0, 'warrior');
      }
      expect(setQueue(state, cityId, ['longswordsman']).ok).toBe(true);
      const second = setQueue(state, cityId, ['longswordsman', 'longswordsman']);
      expect(second.ok).toBe(false);
      return snapshotState(state);
    }
    expect(queues(true)).toBe(queues(false));
  });

  it('sees a unit die mid-sweep: the answer moves between two asks', () => {
    // Not vacuous. The reading has to change *within* one command's worth of
    // writes, because that is the window a memo would get wrong.
    const { state } = ironBench(1);
    const sword = createUnit(state, 0, 'swordsman', 5, 6);
    expect(availableCopies(state, 0, 'iron')).toBe(0);
    // No announcement of any kind between these two lines — no `bumpEconomy`,
    // no `bumpRevision`, no command boundary. A memo on either clock would hand
    // the second ask the first one's answer.
    state.units = state.units.filter((unit) => unit.id !== sword.id);
    expect(availableCopies(state, 0, 'iron')).toBe(1);
  });
});
