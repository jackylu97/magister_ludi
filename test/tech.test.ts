import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, buildingDef } from '../src/sim/buildingData';
import {
  cityYields,
  foundCityAt,
  foundingErrorAt,
  unitProductionCost,
} from '../src/sim/cities';
import { type Command, applyCommand } from '../src/sim/commands';
import {
  type Game,
  createGame,
  dispatch,
  loadGame,
  replay,
  saveGame,
  snapshotState,
} from '../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex } from '../src/sim/map';
import { RULES } from '../src/sim/rulesData';
import {
  type City,
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  createUnit,
  newGame,
} from '../src/sim/state';
import {
  advanceResearch,
  availableTechs,
  buildingYieldDelta,
  describeUpgrade,
  isUnlocked,
  playerScience,
  researchError,
  researchSince,
  researchSnapshot,
  turnsToTech,
  upgradeTargetFor,
} from '../src/sim/tech';
import {
  BUILDING_UNLOCK_TECH,
  TECH_IDS,
  type TechId,
  UNIT_UNLOCK_TECH,
  isTechId,
  techAgeBands,
  techColumnCount,
  techDataProblems,
  techDef,
  techDepth,
  techRowCount,
} from '../src/sim/techData';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../src/sim/unitData';
import { resetVisibility } from '../src/sim/visibility';

const RESEARCH = RULES.research;

/** A two-player state on a blank grassland rectangle, as `cities.test.ts` uses. */
function flatState(width = 16, height = 12, terrain: 'desert' | 'grassland' = 'grassland'): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function plant(state: GameState, ownerId: number, col: number, row: number): City {
  return foundCityAt(state, ownerId, at(state.map, col, row));
}

function endRound(state: GameState): void {
  for (const player of state.players) {
    expect(applyCommand(state, { type: 'endTurn', playerId: player.id })).toEqual({ ok: true });
  }
}

function choose(playerId: number, techId: string): Command {
  return { type: 'chooseResearch', playerId, techId } as Command;
}

/** Grants a tech directly, for tests that are about what a tech *does*. */
function grant(state: GameState, playerId: number, ...techs: TechId[]): void {
  const player = state.players[playerId]!;
  for (const tech of techs) {
    if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  }
}

// ---------------------------------------------------------------------------

describe('tech data integrity', () => {
  it('has no problems to report', () => {
    expect(techDataProblems()).toEqual([]);
  });

  it('is a DAG: every tech is reachable from the empty set', () => {
    // Kahn's peel. If any tech is left over it depends, however indirectly, on
    // itself — and nobody would ever be able to research it.
    const settled = new Set<TechId>();
    let progress = true;
    while (progress) {
      progress = false;
      for (const id of TECH_IDS) {
        if (settled.has(id)) continue;
        if (!techDef(id).prereqs.every((prereq) => settled.has(prereq))) continue;
        settled.add(id);
        progress = true;
      }
    }
    expect([...settled].sort()).toEqual([...TECH_IDS].sort());
  });

  it('names only real prerequisites, and never one from a later age', () => {
    for (const id of TECH_IDS) {
      const def = techDef(id);
      for (const prereq of def.prereqs) {
        expect(isTechId(prereq), `${id} → ${prereq}`).toBe(true);
        expect(techDef(prereq).age, `${id} → ${prereq}`).toBeLessThanOrEqual(def.age);
      }
    }
  });

  it('unlocks only units and buildings that exist, and each of them once', () => {
    const units: string[] = [];
    const buildings: string[] = [];
    for (const id of TECH_IDS) {
      units.push(...(techDef(id).unlocks.units ?? []));
      buildings.push(...(techDef(id).unlocks.buildings ?? []));
    }
    for (const unit of units) expect(UNIT_TYPE_IDS).toContain(unit as UnitTypeId);
    for (const building of buildings) expect(BUILDING_IDS).toContain(building as never);
    expect(new Set(units).size).toBe(units.length);
    expect(new Set(buildings).size).toBe(buildings.length);
  });

  it('reaches every unit and every building in the game', () => {
    for (const id of UNIT_TYPE_IDS) expect(UNIT_UNLOCK_TECH.has(id), id).toBe(true);
    for (const id of BUILDING_IDS) expect(BUILDING_UNLOCK_TECH.has(id), id).toBe(true);
  });

  it('gives every node at least one unlock — no connective tissue (Entry V)', () => {
    for (const id of TECH_IDS) {
      const { units = [], buildings = [] } = techDef(id).unlocks;
      expect(units.length + buildings.length, id).toBeGreaterThan(0);
    }
  });

  it('gives every node a glyph the research dial and the chart can light up', () => {
    for (const id of TECH_IDS) {
      const glyph = techDef(id).glyph;
      expect(typeof glyph, id).toBe('string');
      expect(glyph.length, id).toBeGreaterThan(0);
    }
  });

  // Soft check, not a rule `techDataProblems` enforces: today's table happens
  // to hand every tech its own glyph, and this pins that choice so a future
  // add doesn't silently reuse one. A deliberate repeat is a fine reason to
  // delete this test, not to make it pass by working around it.
  it('gives every node a distinct glyph', () => {
    const glyphs = TECH_IDS.map((id) => techDef(id).glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('reports a tech with no glyph', () => {
    const def = techDef('pottery');
    const authored = def.glyph;
    try {
      (def as { glyph: unknown }).glyph = '';
      expect(techDataProblems()).toContain('tech "pottery" has no glyph');
    } finally {
      def.glyph = authored;
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('bands its costs by age, and rises inside each band', () => {
    // The band the tree is tuned to (see the pacing note in `tech.ts`): a
    // scale, measured against the current pop-based science economy rather
    // than copied from another game's numbers. Age III's band starts barely
    // above age II's ceiling on purpose — Entry V asks the endgame to
    // *accelerate*, so the last age's costs rise more slowly than the beakers
    // an empire of that size is making.
    //
    // Re-measured when settlers grew expensive and escalating: a slower
    // expansion is a slower science economy, so the whole table came down
    // (×0.50 / ×0.85 / ×0.95 by age) to hold the same three closing turns.
    const bands: Record<number, [number, number]> = {
      1: [12, 32],
      2: [120, 250],
      3: [255, 460],
    };
    for (const id of TECH_IDS) {
      const def = techDef(id);
      const [low, high] = bands[def.age]!;
      expect(def.cost, id).toBeGreaterThanOrEqual(low);
      expect(def.cost, id).toBeLessThanOrEqual(high);
    }
    // Three ages, all of them populated.
    expect(new Set(TECH_IDS.map((id) => techDef(id).age))).toEqual(new Set([1, 2, 3]));
  });

  it('starts every player on real, prerequisite-free technologies', () => {
    for (const id of RESEARCH.startingTechs) {
      expect(isTechId(id), id).toBe(true);
      expect(techDef(id).prereqs, id).toEqual([]);
    }
    const state = newGame(config());
    for (const player of state.players) {
      expect(player.techsResearched).toEqual(RESEARCH.startingTechs);
      expect(player.researching).toBe(null);
      // Copied, not aliased: one player researching something must not teach
      // it to everybody else in the process.
      expect(player.techsResearched).not.toBe(RESEARCH.startingTechs);
    }
  });

  it('lets the opening kit build a settler, a warrior, a scout and a monument', () => {
    const state = newGame(config());
    for (const unit of ['settler', 'warrior', 'scout'] as UnitTypeId[]) {
      expect(isUnlocked(state, 0, 'unit', unit), unit).toBe(true);
    }
    expect(isUnlocked(state, 0, 'building', 'monument')).toBe(true);
    expect(isUnlocked(state, 0, 'building', 'granary')).toBe(true);
    // And nothing beyond it.
    expect(isUnlocked(state, 0, 'building', 'library')).toBe(false);
    expect(isUnlocked(state, 0, 'unit', 'swordsman')).toBe(false);
  });

  it('treats content no tech names as ungated', () => {
    // There is none today (the test above proves it), so this is the rule
    // itself: an id nothing gates is buildable from turn one.
    const state = newGame(config());
    expect(isUnlocked(state, 0, 'unit', 'zeppelin')).toBe(true);
    expect(isUnlocked(state, 0, 'building', 'pyramid')).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('star chart layout', () => {
  it('gives every tech a column one past its deepest prerequisite', () => {
    for (const id of TECH_IDS) {
      const def = techDef(id);
      const deepest = def.prereqs.reduce((deep, prereq) => Math.max(deep, techDepth(prereq) + 1), 0);
      expect(techDepth(id), id).toBe(deepest);
    }
  });

  it('puts every prerequisite strictly to the left, so no connector doubles back', () => {
    for (const id of TECH_IDS) {
      for (const prereq of techDef(id).prereqs) {
        expect(techDepth(prereq), `${prereq} → ${id}`).toBeLessThan(techDepth(id));
      }
    }
  });

  it('marches the named chains rightward', () => {
    // The chains a player learns the shape of by using them. Depth is derived,
    // so these are assertions about the *data*: a prerequisite added out of
    // order would flatten one of them into a single column.
    const chains: TechId[][] = [
      ['pottery', 'bronzeWorking', 'ironWorking', 'feudalism', 'chivalry'],
      ['bronzeWorking', 'ironWorking', 'steel'],
      ['agriculture', 'archery', 'construction', 'engineering', 'machinery'],
      ['pottery', 'writing', 'philosophy', 'drama', 'theology', 'education'],
    ];
    for (const chain of chains) {
      const columns = chain.map((id) => techDepth(id));
      for (let step = 1; step < columns.length; step++) {
        expect(columns[step]!, `${chain[step - 1]} → ${chain[step]}`).toBeGreaterThan(
          columns[step - 1]!,
        );
      }
    }
    // The whole chart, for scale: seven columns deep, five lanes tall.
    expect(techColumnCount()).toBe(7);
    expect(techRowCount()).toBe(5);
  });

  it('hands every tech a lane, and never two techs the same cell', () => {
    const cells = new Set<string>();
    for (const id of TECH_IDS) {
      const { row } = techDef(id);
      expect(Number.isInteger(row), id).toBe(true);
      expect(row, id).toBeGreaterThanOrEqual(0);
      const cell = `${techDepth(id)},${row}`;
      expect(cells.has(cell), `${id} at ${cell}`).toBe(false);
      cells.add(cell);
    }
    // No column and no lane is left empty: an empty one is a hole in the chart
    // that the ages would then have to paint around.
    const columns = new Set(TECH_IDS.map((id) => techDepth(id)));
    const rows = new Set(TECH_IDS.map((id) => techDef(id).row));
    expect(columns.size).toBe(techColumnCount());
    expect(rows.size).toBe(techRowCount());
  });

  it('reports a tech with no lane', () => {
    const def = techDef('pottery');
    const authored = def.row;
    try {
      (def as { row: unknown }).row = undefined;
      expect(techDataProblems()).toContain('tech "pottery" has row undefined, which is not a lane number');
    } finally {
      def.row = authored;
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('reports two techs parked in one cell', () => {
    // Archery and Animal Husbandry share a column (both hang off Agriculture),
    // so moving one into the other's lane is the collision this guards.
    const def = techDef('archery');
    const authored = def.row;
    try {
      def.row = techDef('animalHusbandry').row;
      expect(techDataProblems().some((problem) => problem.includes('both sit at chart cell'))).toBe(
        true,
      );
    } finally {
      def.row = authored;
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('bands the ages into contiguous runs of columns, in order', () => {
    const bands = techAgeBands();
    expect(bands.length).toBeGreaterThan(0);
    expect(bands[0]!.from).toBe(0);
    expect(bands[bands.length - 1]!.to).toBe(techColumnCount() - 1);
    for (const [index, band] of bands.entries()) {
      expect(band.to).toBeGreaterThanOrEqual(band.from);
      const before = bands[index - 1];
      if (!before) continue;
      // Contiguous, no gap, no overlap, and never running backwards in age.
      expect(band.from).toBe(before.to + 1);
      expect(band.age).toBeGreaterThan(before.age);
    }
    // Which is: ÆRA I over the first two columns, II over the next two, III
    // over the rest — the ages annotate the chart, they no longer place it.
    expect(bands).toEqual([
      { age: 1, from: 0, to: 1 },
      { age: 2, from: 2, to: 3 },
      { age: 3, from: 4, to: 6 },
    ]);
  });

  it('never lands a tech more than one band away from its own age', () => {
    // A band is a majority vote of the column, so a tech can sit under a
    // neighbouring age's numeral (The Wheel, ancient, under ÆRA II) — but two
    // bands adrift would mean the ages had stopped describing the ground.
    const bands = techAgeBands();
    for (const id of TECH_IDS) {
      const column = techDepth(id);
      const band = bands.find((candidate) => column >= candidate.from && column <= candidate.to);
      expect(band, id).toBeDefined();
      expect(Math.abs(band!.age - techDef(id).age), id).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 31337,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#e8503a', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
    ...overrides,
  };
}

describe('chooseResearch', () => {
  it('aims the pool at a technology whose prerequisites are met', () => {
    const state = flatState();
    expect(applyCommand(state, choose(0, 'archery'))).toEqual({ ok: true });
    expect(state.players[0]!.researching).toBe('archery');
    // Nothing was spent: the pool is the progress.
    expect(state.players[0]!.sciencePool).toBe(0);
    expect(state.players[1]!.researching).toBe(null);
  });

  it('refuses byte-identically: unknown, held, prerequisite-short, repeated, finished seat', () => {
    const state = flatState();
    state.players[0]!.sciencePool = 40;
    applyCommand(state, choose(0, 'archery'));
    const before = snapshotState(state);

    for (const bad of [
      choose(0, 'the invention of fire'),
      choose(0, 42 as unknown as string),
      choose(0, 'agriculture'), // already researched — it is in the opening kit
      choose(0, 'ironWorking'), // prerequisites not met
      choose(0, 'archery'), // already the current choice
      choose(9, 'writing'), // no such player
    ]) {
      const result = applyCommand(state, bad);
      expect(result.ok, JSON.stringify(bad)).toBe(false);
      expect(snapshotState(state), JSON.stringify(bad)).toBe(before);
    }

    applyCommand(state, { type: 'endTurn', playerId: 0 });
    const afterEnd = snapshotState(state);
    expect(applyCommand(state, choose(0, 'writing')).ok).toBe(false);
    expect(snapshotState(state)).toBe(afterEnd);
  });

  it('names the missing prerequisites when it refuses one', () => {
    const state = flatState();
    const result = applyCommand(state, choose(0, 'ironWorking'));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain('Bronze Working');
    expect(result.ok === false && result.error).toContain('Masonry');
  });

  it('switches mid-research without losing a single beaker', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'writing'));
    state.players[0]!.sciencePool = 50;

    expect(applyCommand(state, choose(0, 'masonry'))).toEqual({ ok: true });
    expect(state.players[0]!.researching).toBe('masonry');
    expect(state.players[0]!.sciencePool).toBe(50);

    // And the banked pool finishes the new choice immediately.
    advanceResearch(state);
    expect(state.players[0]!.techsResearched).toContain('masonry');
    expect(state.players[0]!.sciencePool).toBe(50 - techDef('masonry').cost);
  });

  it('refuses through the same evaluator the tech screen enables its nodes with', () => {
    const state = flatState();
    // One rule, two readers: whatever `researchError` says about a node is
    // exactly what the reducer will do with a command for it.
    for (const id of TECH_IDS) {
      const problem = researchError(state, 0, id);
      const result = applyCommand(state, choose(0, id));
      expect(result.ok, id).toBe(problem === null);
      if (result.ok) {
        // Put it back, so each node is judged against the same state.
        state.players[0]!.researching = null;
      } else {
        expect(result.error, id).toBe(problem);
      }
    }
  });

  it('offers exactly the techs whose prerequisites are met', () => {
    const state = flatState();
    expect(availableTechs(state, 0)).toEqual([
      'archery',
      'animalHusbandry',
      'bronzeWorking',
      'masonry',
      'writing',
    ]);
    grant(state, 0, 'animalHusbandry', 'bronzeWorking');
    expect(availableTechs(state, 0)).toContain('theWheel');
    expect(availableTechs(state, 0)).not.toContain('animalHusbandry');
  });
});

// ---------------------------------------------------------------------------

describe('advanceResearch', () => {
  it('completes at resolution, keeps the overflow and asks for a new choice', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'masonry'));
    state.players[0]!.sciencePool = techDef('masonry').cost + 7;

    advanceResearch(state);
    const player = state.players[0]!;
    expect(player.techsResearched).toEqual([...RESEARCH.startingTechs, 'masonry']);
    expect(player.sciencePool).toBe(7);
    expect(player.researching).toBe(null);
  });

  it('holds — losing nothing — when the pool will not cover the cost', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'writing'));
    state.players[0]!.sciencePool = techDef('writing').cost - 1;

    advanceResearch(state);
    expect(state.players[0]!.researching).toBe('writing');
    expect(state.players[0]!.sciencePool).toBe(techDef('writing').cost - 1);
    expect(state.players[0]!.techsResearched).toEqual(RESEARCH.startingTechs);
  });

  it('completes at most one technology per player per turn', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'archery'));
    state.players[0]!.sciencePool = 10_000;

    advanceResearch(state);
    expect(state.players[0]!.techsResearched).toHaveLength(RESEARCH.startingTechs.length + 1);
    advanceResearch(state);
    // Nothing chosen, so nothing else completes however full the pool is.
    expect(state.players[0]!.techsResearched).toHaveLength(RESEARCH.startingTechs.length + 1);
  });

  it('banks science for a player who has chosen nothing', () => {
    const state = flatState();
    plant(state, 0, 8, 5);
    for (let turn = 0; turn < 5; turn++) endRound(state);
    expect(state.players[0]!.sciencePool).toBeGreaterThan(0);
    expect(state.players[0]!.researching).toBe(null);
    expect(state.players[0]!.techsResearched).toEqual(RESEARCH.startingTechs);
  });

  it('drops an aim at a technology that no longer exists', () => {
    const state = flatState();
    (state.players[0]! as { researching: string | null }).researching = 'alchemy';
    state.players[0]!.sciencePool = 500;
    advanceResearch(state);
    expect(state.players[0]!.researching).toBe(null);
    expect(state.players[0]!.techsResearched).toEqual(RESEARCH.startingTechs);
  });

  it('runs inside the turn pipeline, on the science banked that same turn', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.population = techDef('archery').cost + 5; // a great many scientists
    applyCommand(state, choose(0, 'archery'));

    endRound(state);
    expect(state.players[0]!.techsResearched).toContain('archery');
  });
});

// ---------------------------------------------------------------------------

describe('production gating', () => {
  it('refuses a locked unit or building and takes the same queue once unlocked', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const queue = [{ kind: 'building', id: 'library' }];
    const before = snapshotState(state);

    const refusal = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue,
    } as Command);
    expect(refusal.ok).toBe(false);
    expect(refusal.ok === false && refusal.error).toContain('Writing');
    expect(snapshotState(state)).toBe(before);

    grant(state, 0, 'writing');
    expect(
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue,
      } as Command),
    ).toEqual({ ok: true });
    expect(city.queue).toEqual(queue);
  });

  it('rejects the whole queue when any one item is locked', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const result = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [
        { kind: 'building', id: 'monument' },
        { kind: 'unit', id: 'swordsman' },
      ],
    } as Command);
    expect(result.ok).toBe(false);
    expect(city.queue).toEqual([]);
  });

  it('gates by the city owner, not by whoever is asking', () => {
    const state = flatState();
    const city = plant(state, 1, 8, 5);
    grant(state, 0, 'writing'); // the *other* player learns to write
    const result = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 1,
      cityId: city.id,
      queue: [{ kind: 'building', id: 'library' }],
    } as Command);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('auto-upgrade', () => {
  it('retypes in place, keeping id, tile and health fraction', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    unit.hp = 60;
    grant(state, 0, 'bronzeWorking', 'masonry');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;

    advanceResearch(state);
    const after = state.units[0]!;
    expect(after.id).toBe(unit.id);
    expect(after.type).toBe('swordsman');
    expect(after.col).toBe(8);
    expect(after.row).toBe(5);
    // 60% of a swordsman's 100 maximum.
    expect(after.hp).toBe(60);
    expect(state.units).toHaveLength(1);
  });

  it('keeps the percentage when the new type is tougher', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'swordsman', 8, 5);
    unit.hp = 50; // half of 100
    grant(state, 0, 'bronzeWorking', 'masonry', 'ironWorking', 'writing', 'theWheel');
    grant(state, 0, 'animalHusbandry', 'mathematics', 'archery', 'construction', 'engineering');
    grant(state, 0, 'machinery');
    applyCommand(state, choose(0, 'steel'));
    state.players[0]!.sciencePool = techDef('steel').cost;

    advanceResearch(state);
    // Half of a longswordsman's 120.
    expect(state.units[0]!.type).toBe('longswordsman');
    expect(state.units[0]!.hp).toBe(60);
    expect(unitDef('longswordsman').maxHp).toBe(120);
  });

  it('upgrades every unit of the line, and leaves the rest alone', () => {
    const state = flatState();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 8, 5 + i);
    createUnit(state, 0, 'scout', 4, 4);
    createUnit(state, 1, 'warrior', 2, 2); // another player's
    grant(state, 0, 'bronzeWorking', 'masonry');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;

    advanceResearch(state);
    const types = state.units.map((unit) => `${unit.ownerId}:${unit.type}`);
    expect(types).toEqual([
      '0:swordsman',
      '0:swordsman',
      '0:swordsman',
      '0:scout',
      '1:warrior',
    ]);
  });

  it('walks the whole chain when a unit has missed a generation', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    // Everything the longswordsman needs, except the tech that finishes it.
    grant(
      state,
      0,
      'bronzeWorking',
      'masonry',
      'ironWorking',
      'writing',
      'archery',
      'animalHusbandry',
      'theWheel',
      'mathematics',
      'construction',
      'engineering',
      'machinery',
    );
    expect(upgradeTargetFor(state, unit)).toBe('swordsman');

    applyCommand(state, choose(0, 'steel'));
    state.players[0]!.sciencePool = techDef('steel').cost;
    advanceResearch(state);
    // Warrior → swordsman → longswordsman, in one resolution.
    expect(state.units[0]!.type).toBe('longswordsman');
  });

  it('charges retooling gold when the rules ask for it, and stops when it runs out', () => {
    const state = flatState();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 8, 5 + i);
    grant(state, 0, 'bronzeWorking', 'masonry');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    state.players[0]!.gold = 25;

    const original = RESEARCH.retoolCost;
    try {
      (RESEARCH as { retoolCost: number }).retoolCost = 10;
      advanceResearch(state);
    } finally {
      (RESEARCH as { retoolCost: number }).retoolCost = original;
    }

    // Two paid for, in `state.units` order; the third could not.
    expect(state.units.map((unit) => unit.type)).toEqual(['swordsman', 'swordsman', 'warrior']);
    expect(state.players[0]!.gold).toBe(5);
  });

  it('is free at the v0 setting', () => {
    expect(RESEARCH.retoolCost).toBe(0);
  });

  it('caps movement at the allowance of the type it becomes', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    unit.movesLeft = 2;
    grant(state, 0, 'bronzeWorking', 'masonry');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    advanceResearch(state);
    expect(state.units[0]!.movesLeft).toBeLessThanOrEqual(unitDef('swordsman').movement);
  });

  it('reports what changed, in words', () => {
    const state = flatState();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 8, 5 + i);
    grant(state, 0, 'bronzeWorking', 'masonry');
    const before = researchSnapshot(state, 0);

    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    advanceResearch(state);

    const report = researchSince(state, 0, before);
    expect(report.techs).toEqual(['ironWorking']);
    expect(report.upgrades).toEqual([{ from: 'warrior', to: 'swordsman', count: 3 }]);
    expect(describeUpgrade(report.upgrades[0]!)).toBe('3 warriors became swordsmen');
    expect(describeUpgrade({ from: 'warrior', to: 'swordsman', count: 1 })).toBe(
      '1 warrior became swordsman',
    );
  });
});

// ---------------------------------------------------------------------------

describe('glanceable numbers', () => {
  it('turns a cost and a rate into turns, against the pool', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.population = 4;
    const rate = playerScience(state, 0);
    expect(rate).toBe(cityYields(state, city).science);
    expect(rate).toBeGreaterThan(0);

    const cost = techDef('writing').cost;
    expect(turnsToTech(state, 0, 'writing')).toBe(Math.ceil(cost / rate));

    // Banked beakers count toward whichever tech is asked about.
    state.players[0]!.sciencePool = cost;
    expect(turnsToTech(state, 0, 'writing')).toBe(0);
  });

  it('says "never" for an empire that makes no science at all', () => {
    const state = flatState();
    expect(playerScience(state, 0)).toBe(0);
    expect(turnsToTech(state, 0, 'writing')).toBe(null);
  });

  it('previews a building with the same function the turn pipeline banks', () => {
    const state = flatState();
    const first = plant(state, 0, 8, 5);
    const second = plant(state, 0, 12, 5);
    first.population = 4;
    second.population = 2;
    second.buildings.push('library');

    const delta = buildingYieldDelta(state, 0, 'library');
    // Only the city without one contributes: floor(4 × 0.5) = 2.
    expect(delta.science).toBe(Math.floor(4 * buildingDef('library').sciencePerPop));
    expect(delta.food).toBe(0);

    // And the promise is kept: building it really does add that much.
    const before = playerScience(state, 0);
    first.buildings.push('library');
    expect(playerScience(state, 0) - before).toBe(delta.science);
  });

  it('previews flat yields across every city that could have one', () => {
    const state = flatState();
    plant(state, 0, 8, 5);
    plant(state, 0, 12, 5);
    const delta = buildingYieldDelta(state, 0, 'granary');
    expect(delta.food).toBe(2 * buildingDef('granary').food);
    expect(buildingYieldDelta(state, 0, 'market').gold).toBe(2 * buildingDef('market').gold);
  });

  it('leaves the state exactly as it found it', () => {
    const state = flatState();
    plant(state, 0, 8, 5);
    const before = snapshotState(state);
    buildingYieldDelta(state, 0, 'library');
    buildingYieldDelta(state, 0, 'monument');
    expect(snapshotState(state)).toBe(before);
  });
});

// ---------------------------------------------------------------------------

describe('research in the log', () => {
  /** A game with a city each and both players researching. */
  function researchingGame(): Game {
    const game = createGame(config());
    for (const player of game.state.players) {
      const settler = game.state.units.find(
        (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
      )!;
      expect(dispatch(game, {
        type: 'foundCity',
        playerId: player.id,
        settlerUnitId: settler.id,
      }).ok).toBe(true);
      expect(dispatch(game, choose(player.id, 'bronzeWorking')).ok).toBe(true);
    }
    return game;
  }

  it('replays forty turns of research byte for byte', () => {
    const game = researchingGame();
    for (let turn = 0; turn < 40; turn++) {
      for (const player of game.state.players) {
        // Pick something new the moment the last choice lands, so the log
        // carries research commands from every point in the turn cycle.
        if (player.researching === null) {
          const next = availableTechs(game.state, player.id)[0];
          if (next) dispatch(game, choose(player.id, next));
        }
        expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
      }
    }

    // The game actually researched something worth replaying.
    expect(game.state.players[0]!.techsResearched.length).toBeGreaterThan(
      RESEARCH.startingTechs.length,
    );
    expect(game.log.some((command) => command.type === 'chooseResearch')).toBe(true);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('round-trips a schema 10 save with research in it', () => {
    expect(SCHEMA_VERSION).toBe(10);
    const game = researchingGame();
    for (let turn = 0; turn < 20; turn++) {
      for (const player of game.state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }

    const loaded = loadGame(saveGame(game));
    expect(loaded.state).toEqual(game.state);
    expect(loaded.state.players[0]!.techsResearched).toEqual(
      game.state.players[0]!.techsResearched,
    );

    // Both keep playing in lockstep, research included.
    for (const side of [loaded, game]) {
      dispatch(side, choose(0, 'masonry'));
      for (let turn = 0; turn < 6; turn++) {
        for (const player of side.state.players) {
          dispatch(side, { type: 'endTurn', playerId: player.id });
        }
      }
    }
    expect(loaded.state).toEqual(game.state);
  });

  it('refuses a replay whose research command has gone stale', () => {
    const game = researchingGame();
    // A log that asks for the same tech twice cannot be a log this game produced.
    const forged = [...game.log, choose(0, 'bronzeWorking')];
    expect(() => replay(game.config, forged)).toThrow(/already being researched/);
  });
});

// ---------------------------------------------------------------------------

describe('pacing', () => {
  /** How many cities the scripted empire settles before it starts building. */
  const CITY_TARGET = 5;

  /** The nearest tile a city could legally stand on, or null. */
  function nearestSite(
    state: GameState,
    col: number,
    row: number,
  ): { col: number; row: number } | null {
    const from = at(state.map, col, row);
    let best: { col: number; row: number } | null = null;
    let bestDistance = Infinity;
    for (const tile of mapRange(state.map, tileHex(from), 8)) {
      if (foundingErrorAt(state, 0, tile) !== null) continue;
      const distance = Math.abs(tile.col - col) + Math.abs(tile.row - row);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { col: tile.col, row: tile.row };
      }
    }
    return best;
  }

  /**
   * A scripted empire: found the capital, settle three more cities, always
   * build the most useful thing available, always research the cheapest
   * available node. Crude, but it is the shape of a real game and it is the
   * only honest way to ask when the last age closes.
   *
   * Deliberately conservative — it never fights, never trades and picks tiles
   * by the citizen assigner's own judgement — so a real player should beat
   * these turn numbers rather than miss them.
   */
  function playEmpire(maxTurns: number): { game: Game; ageDone: Map<number, number> } {
    const game = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const ageDone = new Map<number, number>();
    const wanted: string[] = ['granary', 'monument', 'shrine', 'library', 'temple', 'market',
      'aqueduct', 'workshop', 'watermill', 'amphitheater', 'monastery', 'university'];

    for (let turn = 0; turn < maxTurns; turn++) {
      // Research: the cheapest thing available, which is roughly how a player
      // sweeps an age.
      const player = game.state.players[0]!;
      if (player.researching === null) {
        const next = [...availableTechs(game.state, 0)].sort(
          (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
        )[0];
        if (next) dispatch(game, choose(0, next));
      }

      // Settlers: found where they stand if the rules allow it, otherwise walk
      // to the nearest legal site — the same question the settler lens asks.
      for (const unit of [...game.state.units]) {
        if (!unitDef(unit.type).foundsCity) continue;
        if (dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: unit.id }).ok) continue;
        if (unit.path && unit.path.length > 0) continue;
        const target = nearestSite(game.state, unit.col, unit.row);
        if (target) dispatch(game, { type: 'moveUnit', playerId: 0, unitId: unit.id, target });
      }

      // Production: expand while the empire is small, then build everything the
      // tree has handed over.
      for (const city of game.state.cities) {
        if (city.queue.length > 0) continue;
        const queue: { kind: 'unit' | 'building'; id: string }[] = [];
        for (const id of wanted) {
          if (city.buildings.includes(id as never)) continue;
          if (!isUnlocked(game.state, 0, 'building', id)) continue;
          queue.push({ kind: 'building', id });
        }
        // Settlers already *paid for* count toward the target as well as
        // settlers already walking: a settler is five turns of production now,
        // and without this every city in the empire would queue one before the
        // first arrived, overshooting `CITY_TARGET` by two whole cities.
        const settlersOut =
          game.state.units.filter((unit) => unitDef(unit.type).foundsCity).length +
          game.state.cities.filter((other) =>
            other.queue.some((item) => item.kind === 'unit' && item.id === 'settler'),
          ).length;
        if (
          game.state.cities.length + settlersOut < CITY_TARGET &&
          city.population >= unitDef('settler').minCityPop
        ) {
          queue.length = 0;
          queue.push({ kind: 'unit', id: 'settler' });
        }
        if (queue.length === 0) continue;
        dispatch(game, {
          type: 'setCityProduction',
          playerId: 0,
          cityId: city.id,
          queue,
        } as Command);
      }

      dispatch(game, { type: 'endTurn', playerId: 0 });

      for (const age of [1, 2, 3]) {
        if (ageDone.has(age)) continue;
        const all = TECH_IDS.filter((id) => techDef(id).age === age);
        if (all.every((id) => player.techsResearched.includes(id))) {
          ageDone.set(age, game.state.turn);
        }
      }
    }
    return { game, ageDone };
  }

  it('closes its three ages on the Quick-speed schedule (Entry V)', () => {
    const { game, ageDone } = playEmpire(200);
    // Measured on this seed after settlers grew expensive and escalating:
    // 42 / 90 / 132, against 43 / 86 / 128 before it. Each assertion is a band
    // around the measurement rather than the number itself — the map roll moves
    // it by a handful of turns — but the band is tight enough on *both* sides
    // to catch a regression in either direction, which an upper bound alone
    // would not.
    //
    // Holding those turns through the settler retune cost the tech table a
    // proportional cut (see `tech.ts`): the empire now founds its five cities on
    // turns 1 / 19 / 28 / 40 / 50 rather than 1 / 17 / 20 / 24 / 28, and five
    // cities that arrive twenty turns later are twenty turns of citizens the
    // science economy never had.
    const first = ageDone.get(1);
    const second = ageDone.get(2);
    const third = ageDone.get(3);
    expect(first, `age I: ${String(first)}`).toBeDefined();
    expect(second, `age II: ${String(second)}`).toBeDefined();
    expect(third, `age III: ${String(third)}`).toBeDefined();

    expect(first!, `age I: ${first}`).toBeGreaterThanOrEqual(34);
    expect(first!, `age I: ${first}`).toBeLessThanOrEqual(50);
    expect(second!, `age II: ${second}`).toBeGreaterThanOrEqual(80);
    expect(second!, `age II: ${second}`).toBeLessThanOrEqual(100);
    expect(third!, `age III: ${third}`).toBeGreaterThanOrEqual(120);
    expect(third!, `age III: ${third}`).toBeLessThanOrEqual(145);
    expect(game.state.players[0]!.techsResearched).toHaveLength(TECH_IDS.length);
  }, 60_000);

  /**
   * A one-player standard map with its capital already planted on turn 1 — the
   * board both opening measurements start from.
   */
  function freshCapital(): Game {
    const game = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
    expect(dispatch(game, {
      type: 'foundCity',
      playerId: 0,
      settlerUnitId: founder.id,
    }).ok).toBe(true);
    expect(game.state.cities).toHaveLength(1);
    return game;
  }

  /**
   * The opening, measured rather than asserted from taste.
   *
   * A capital founded on turn 1 makes exactly three production a turn on this
   * roll: the centre's own `baseCityYields` floor of two, plus the one tile its
   * single citizen is sent to (the assigner weights food, so it picks a tile
   * worth a hammer). The scout is priced straight off that number — nine
   * hammers is three turns of three — because the scout is what the opening
   * actually wants and three turns is what "immediately" feels like.
   *
   * A warrior at five is therefore two turns, and the settler is the other end
   * of the same scale: see the test below.
   */
  it('turns a fresh capital into a scout in exactly three turns', () => {
    const game = freshCapital();
    const capital = game.state.cities[0]!;
    expect(game.state.turn).toBe(1);

    // What a brand-new capital makes, before anything is queued. Asserted
    // exactly, because the scout's price is nine *because* this is three.
    expect(cityYields(game.state, capital).production).toBe(3);

    expect(dispatch(game, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: capital.id,
      queue: [{ kind: 'unit', id: 'scout' }],
    } as Command).ok).toBe(true);

    const built = (): boolean => game.state.units.some((unit) => unit.type === 'scout');
    let turns = 0;
    let rate = 0;
    while (!built() && turns < 10) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
      turns += 1;
      if (turns === 1) rate = capital.hammerBasket;
    }
    // Exactly three, asserted from both sides: a scout that arrived in two
    // turns is as much a pacing regression as one that took four.
    expect(rate).toBe(3);
    expect(turns, `${unitDef('scout').cost}⚙ at ${rate}⚙ a turn`).toBe(3);
    expect(unitDef('scout').cost).toBe(9);
    // The whole opening kit, priced against the same three hammers a turn.
    expect(unitDef('warrior').cost).toBe(5);
  }, 30_000);

  /**
   * The settler, measured the same way, and deliberately five times the rate
   * rather than three: expansion is the strongest move in the game and it is
   * meant to cost a real share of the opening.
   *
   * The one thing the target has to bend around is `minCityPop`: a settler
   * cannot be *queued* in a size-1 city at all (`validateQueue` refuses it, and
   * a size-1 city with a settler at the front of its queue could never grow to
   * lift its own gate, because a settler halts growth). So "a fresh capital"
   * here means the earliest turn the game will actually accept the order — a
   * size-2 city, which makes four hammers a turn on this roll.
   *
   * Growth is halted while the settler is at the front, so that rate holds for
   * the whole build: twenty hammers is five turns, exactly.
   */
  it('turns a size-2 capital into its first settler in exactly five turns', () => {
    const game = freshCapital();
    const capital = game.state.cities[0]!;

    // Grow to the smallest size that may build one. Nothing is queued while it
    // grows, so the hammers it banks in the meantime are cleared first: this
    // test is about the settler's own build time, not about a head start.
    const minimum = unitDef('settler').minCityPop;
    let grew = 0;
    while (capital.population < minimum && grew < 30) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
      grew += 1;
    }
    expect(capital.population).toBe(minimum);
    // Measured: turn 8 on this seed. A band, for the same reason as the ages.
    expect(game.state.turn, `size ${minimum} on turn ${game.state.turn}`).toBeLessThanOrEqual(12);
    capital.hammerBasket = 0;

    const turnsToBuild = (): number => {
      expect(dispatch(game, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: capital.id,
        queue: [{ kind: 'unit', id: 'settler' }],
      } as Command).ok).toBe(true);
      const before = game.state.players[0]!.settlersBuilt;
      let turns = 0;
      while (game.state.players[0]!.settlersBuilt === before && turns < 20) {
        expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
        turns += 1;
      }
      return turns;
    };

    const first = unitProductionCost(game.state, 0, 'settler');
    expect(first).toBe(20);
    expect(turnsToBuild(), `${first}⚙ at 4⚙ a turn`).toBe(5);
    expect(game.state.players[0]!.settlersBuilt).toBe(1);

    // And the second is a whole increment dearer — two more turns of the same
    // four hammers, which is the brake the escalation is there to be.
    const second = unitProductionCost(game.state, 0, 'settler');
    expect(second).toBe(first + unitDef('settler').costIncrement!);
    expect(turnsToBuild(), `${second}⚙ at 4⚙ a turn`).toBe(7);
    expect(unitProductionCost(game.state, 0, 'settler')).toBe(
      first + 2 * unitDef('settler').costIncrement!,
    );
  }, 30_000);
});
