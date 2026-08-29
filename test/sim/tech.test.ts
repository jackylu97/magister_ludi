import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { cityYields, foundCityAt } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import {
  dispatch,
  loadGame,
  replay,
  saveGame,
  snapshotState,
} from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  SCHEMA_VERSION,
  createUnit,
  newGame,
} from '../../src/sim/state';
import {
  advanceResearch,
  availableTechs,
  buildingYieldDelta,
  describeUpgrade,
  isUnlocked,
  playerScience,
  prereqsMet,
  queueTurns,
  researchError,
  researchExpansion,
  researchPlan,
  researchSince,
  researchSnapshot,
  settleResearchWindfall,
  turnsToTech,
  upgradeTargetFor,
} from '../../src/sim/tech';
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
} from '../../src/sim/techData';
import { techGifts, unlockDataProblems } from '../../src/sim/techUnlocks';
import { choose, config, researchingGame } from './techHelpers';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

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

/**
 * Puts iron under a town of `playerId` at (col, row), so the empire *controls*
 * it the way `openedResource`'s city clause reads — the resource an upgrade
 * to the sword line has waited on since 2026-08-29 ("iron working should only
 * upgrade warriors when iron is available"). The reveal tech is the caller's
 * to grant, exactly as it is in play.
 */
function connectIron(state: GameState, playerId: number, col: number, row: number): void {
  const tile = at(state.map, col, row);
  tile.hills = true;
  tile.resource = 'iron';
  foundCityAt(state, playerId, tile);
  // The city clause opens a seam only to an owner who holds the improvement's
  // tech (`openedResource`), so the town needs Mining as well as the reveal.
  grant(state, playerId, 'mining');
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
    // `ok: true` and nothing more is asserted, rather than the whole result: a
    // resolution now reports what it *did* (`TurnReport` — the wild's blows, a
    // wonder claimed, a Triumph earned), and a helper that pinned the shape
    // would fail every time the pipeline learnt to say something new.
    expect(applyCommand(state, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
  }
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
    for (const id of UNIT_TYPE_IDS) {
      // **One exception, and it is a rule rather than a hole**: a great person
      // is neither built nor bought (`UnitDef.greatWork`), so there is nothing
      // for a technology to unlock. `buildError` and `purchaseError` both refuse
      // the row outright, which is what keeps an ungated type — `isUnlocked`
      // answers `true` for one — off every roster.
      if (unitDef(id).greatWork === true) continue;
      expect(UNIT_UNLOCK_TECH.has(id), id).toBe(true);
    }
    for (const id of BUILDING_IDS) {
      // **The building exception, and it is the unit one's twin**: a row a
      // *card* opens (`BuildingDef.unlockedByCard` — the Gilded Hall) has no
      // node to hang on, and `isUnlocked` asks the cards for it instead of
      // asking the tree. Without this clause an ungated row would be buildable
      // from turn one, which is exactly what that field exists to prevent.
      if (buildingDef(id).unlockedByCard === true) continue;
      expect(BUILDING_UNLOCK_TECH.has(id), id).toBe(true);
    }
  });

  it('gives every node at least one gift — no connective tissue (Entry V)', () => {
    // Asked of `techGifts` rather than of `unlocks`, and that is the Age I
    // rework's doing: Mining's whole package is the mine improvement, which is
    // declared in `improvements.json` and is invisible from `techs.json`. The
    // rule is unchanged — every node is a package — but the list it is checked
    // against is now the one a player actually reads off the node card.
    for (const id of TECH_IDS) {
      expect(techGifts(id).length, id).toBeGreaterThan(0);
    }
    expect(unlockDataProblems()).toEqual([]);
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
    const def = techDef('earthenware');
    const authored = def.glyph;
    try {
      (def as { glyph: unknown }).glyph = '';
      expect(techDataProblems()).toContain('tech "earthenware" has no glyph');
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
    //
    // Age I's floor came down again for the Civ 6-style 1:2:3 ramp: the tier-1
    // techs (husbandry, fletching, mining, earthenware) now cost 8, cheaper
    // than the old floor of 12, so the first tech lands around turn 5–6
    // instead of eating 6–8% of the game before anything unlocks. The ceiling
    // is untouched — the Wheel's 26 and Letters' 24 both still clear it — and
    // ages II/III are unchanged, per the rework's own note that only Age I was
    // in scope.
    //
    // **Ages II and III were scaled up on 2026-08-28** (user — "science costs
    // need to scale harder"): ×1.3 and ×1.8, each cost rounded to the nearest
    // five, Age I untouched. That is the "the table is a *scale*" paragraph in
    // `tech.ts` used deliberately — the shape *inside* each age is preserved
    // exactly and only the band moved. The one claim above that no longer holds
    // is Age III's floor sitting barely above Age II's ceiling: 480 against 305
    // is a gap on purpose, because the endgame was being swept in thirty-five
    // turns and is now sixty. The bands were [120, 250] and [255, 460].
    const bands: Record<number, [number, number]> = {
      1: [8, 32],
      2: [165, 310],
      3: [475, 815],
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

  it('lets the opening kit build the four starting units and no buildings at all', () => {
    // Agriculture is the sole starting technology since the Age I rework, and
    // it is the sole *root*: every game now opens on a real choice between four
    // second-tier nodes instead of on "Agriculture or Pottery". The kit it
    // hands over is the four units and nothing else — the granary waits for
    // Earthenware and the monument for Stonecraft, so a first city's first
    // build is a decision rather than a formality.
    const state = newGame(config());
    for (const unit of ['settler', 'warrior', 'scout', 'worker'] as UnitTypeId[]) {
      expect(isUnlocked(state, 0, 'unit', unit), unit).toBe(true);
    }
    for (const id of BUILDING_IDS) {
      expect(isUnlocked(state, 0, 'building', id), id).toBe(false);
    }
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
      ['earthenware', 'bronzeWorking', 'ironWorking', 'feudalism', 'chivalry'],
      ['bronzeWorking', 'ironWorking', 'steel'],
      ['agriculture', 'fletching', 'construction', 'engineering', 'machinery'],
      ['earthenware', 'letters', 'philosophy', 'drama', 'theology', 'education'],
    ];
    for (const chain of chains) {
      const columns = chain.map((id) => techDepth(id));
      for (let step = 1; step < columns.length; step++) {
        expect(columns[step]!, `${chain[step - 1]} → ${chain[step]}`).toBeGreaterThan(
          columns[step - 1]!,
        );
      }
    }
    // The whole chart, for scale: eight columns deep, five lanes tall. Seven
    // lanes was what hand-authoring one theme per line had grown to, and the
    // bottom one was below the fold of a 900px window; the 2026-08-26 re-lay
    // (the lane principle, in `techData.ts`) put every tech back inside five —
    // which is the floor, the widest column holding five techs.
    expect(techColumnCount()).toBe(8);
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
    const def = techDef('earthenware');
    const authored = def.row;
    try {
      (def as { row: unknown }).row = undefined;
      expect(techDataProblems()).toContain('tech "earthenware" has row undefined, which is not a lane number');
    } finally {
      def.row = authored;
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('reports two techs parked in one cell', () => {
    // Archery and Animal Husbandry share a column (both hang off Agriculture),
    // so moving one into the other's lane is the collision this guards.
    const def = techDef('fletching');
    const authored = def.row;
    try {
      def.row = techDef('husbandry').row;
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
    // Which is: ÆRA I over the first three columns, II over the next three, III
    // over the last two — the ages annotate the chart, they no longer place it.
    // Column 3 used to be an even split (Letters and The Wheel against Iron
    // Working and Construction) that the tie-break gave to the earlier age; The
    // High Temple (religion v2) sits there too and carries the column for ÆRA
    // II, so two ancient nodes now stand under the second numeral. That is the
    // rule working — a band is a majority vote of the column, and the test below
    // is the one that says how far adrift a node may ever be.
    expect(bands).toEqual([
      { age: 1, from: 0, to: 2 },
      { age: 2, from: 3, to: 5 },
      { age: 3, from: 6, to: 7 },
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

describe('chooseResearch', () => {
  it('aims the pool at a technology whose prerequisites are met', () => {
    const state = flatState();
    expect(applyCommand(state, choose(0, 'fletching'))).toEqual({ ok: true });
    expect(state.players[0]!.researching).toBe('fletching');
    // Nothing was spent: the pool is the progress.
    expect(state.players[0]!.sciencePool).toBe(0);
    expect(state.players[1]!.researching).toBe(null);
  });

  it('refuses byte-identically: unknown, held, repeated, bad mode, finished seat', () => {
    const state = flatState();
    state.players[0]!.sciencePool = 40;
    applyCommand(state, choose(0, 'fletching'));
    const before = snapshotState(state);

    for (const bad of [
      choose(0, 'the invention of fire'),
      choose(0, 42 as unknown as string),
      choose(0, 'agriculture'), // already researched — it is in the opening kit
      choose(0, 'fletching'), // already the current choice
      // A mode this build does not know is refused rather than guessed at: the
      // field arrives from a save or a socket like every other one.
      { ...choose(0, 'mining'), queue: 'front' } as unknown as Command,
      choose(9, 'letters'), // no such player
    ]) {
      const result = applyCommand(state, bad);
      expect(result.ok, JSON.stringify(bad)).toBe(false);
      expect(snapshotState(state), JSON.stringify(bad)).toBe(before);
    }

    applyCommand(state, { type: 'endTurn', playerId: 0 });
    const afterEnd = snapshotState(state);
    expect(applyCommand(state, choose(0, 'letters')).ok).toBe(false);
    expect(snapshotState(state)).toBe(afterEnd);
  });

  it('queues the missing prerequisites instead of refusing them', () => {
    const state = flatState();
    // The clause that used to name them is gone: pointing at a locked node now
    // means "and everything it needs", which is the whole feature.
    expect(applyCommand(state, choose(0, 'ironWorking'))).toEqual({ ok: true });
    const plan = researchPlan(state.players[0]!);
    expect(plan[plan.length - 1]).toBe('ironWorking');
    expect(plan).toContain('bronzeWorking');
    expect(plan).toContain('stonecraft');
    // The head is what the beakers are aimed at, and it is a node that can be
    // started right now.
    expect(state.players[0]!.researching).toBe(plan[0]);
    expect(prereqsMet(state, 0, plan[0]!)).toBe(true);
  });

  it('switches mid-research without losing a single beaker', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'earthenware'));
    state.players[0]!.sciencePool = 50;

    expect(applyCommand(state, choose(0, 'mining'))).toEqual({ ok: true });
    expect(state.players[0]!.researching).toBe('mining');
    expect(state.players[0]!.sciencePool).toBe(50);

    // And the banked pool finishes the new choice immediately.
    advanceResearch(state);
    expect(state.players[0]!.techsResearched).toContain('mining');
    expect(state.players[0]!.sciencePool).toBe(50 - techDef('mining').cost);
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
        // Put it back, so each node is judged against the same state — the plan
        // is *both* fields now, and clearing one of them would leave a queue
        // standing behind a null head.
        state.players[0]!.researching = null;
        delete state.players[0]!.researchQueue;
      } else {
        expect(result.error, id).toBe(problem);
      }
    }
  });

  it('offers exactly the techs whose prerequisites are met', () => {
    const state = flatState();
    // The five second-tier nodes, in the tree's own order — the whole of a
    // player's opening choice now that Agriculture is the only root.
    expect(availableTechs(state, 0)).toEqual([
      'husbandry',
      'fletching',
      'sailing',
      'mining',
      'earthenware',
    ]);
    grant(state, 0, 'husbandry', 'bronzeWorking');
    expect(availableTechs(state, 0)).toContain('theWheel');
    expect(availableTechs(state, 0)).not.toContain('husbandry');
  });
});

// ---------------------------------------------------------------------------

describe('advanceResearch', () => {
  it('completes at resolution, keeps the overflow and asks for a new choice', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'mining'));
    state.players[0]!.sciencePool = techDef('mining').cost + 7;

    advanceResearch(state);
    const player = state.players[0]!;
    expect(player.techsResearched).toEqual([...RESEARCH.startingTechs, 'mining']);
    expect(player.sciencePool).toBe(7);
    expect(player.researching).toBe(null);
  });

  it('holds — losing nothing — when the pool will not cover the cost', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'earthenware'));
    state.players[0]!.sciencePool = techDef('earthenware').cost - 1;

    advanceResearch(state);
    expect(state.players[0]!.researching).toBe('earthenware');
    expect(state.players[0]!.sciencePool).toBe(techDef('earthenware').cost - 1);
    expect(state.players[0]!.techsResearched).toEqual(RESEARCH.startingTechs);
  });

  it('completes at most one technology per player per turn', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'fletching'));
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
    city.population = techDef('fletching').cost + 5; // a great many scientists
    applyCommand(state, choose(0, 'fletching'));

    endRound(state);
    expect(state.players[0]!.techsResearched).toContain('fletching');
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
    expect(refusal.ok === false && refusal.error).toContain('Letters');
    expect(snapshotState(state)).toBe(before);

    grant(state, 0, 'letters');
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
    grant(state, 0, 'letters'); // the *other* player learns to write
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
    grant(state, 0, 'bronzeWorking', 'stonecraft');
    connectIron(state, 0, 8, 5);
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
    connectIron(state, 0, 8, 5);
    grant(state, 0, 'bronzeWorking', 'stonecraft', 'ironWorking', 'letters', 'theWheel');
    grant(state, 0, 'husbandry', 'mathematics', 'fletching', 'construction', 'engineering');
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
    grant(state, 0, 'bronzeWorking', 'stonecraft');
    connectIron(state, 0, 8, 5);
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
    connectIron(state, 0, 8, 5);
    // Everything the longswordsman needs, except the tech that finishes it.
    grant(
      state,
      0,
      'bronzeWorking',
      'stonecraft',
      'ironWorking',
      'letters',
      'fletching',
      'husbandry',
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

  it('waits for iron: Iron Working alone leaves a warrior a warrior', () => {
    // User, 2026-08-29: "iron working should only upgrade warriors when iron
    // is available". The walk in `upgradeTargetFor` stops at a rung whose
    // `requiresResource` the empire does not control — the same gate
    // `buildError` keeps at the queue.
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    grant(state, 0, 'bronzeWorking', 'stonecraft');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    advanceResearch(state);
    expect(state.players[0]!.techsResearched).toContain('ironWorking');
    expect(upgradeTargetFor(state, unit)).toBeNull();
    expect(state.units[0]!.type).toBe('warrior');
  });

  it('retools the resolution after iron is connected, with nothing being researched', () => {
    // "If iron isn't available when swordsmen are unlocked, connecting iron
    // will then trigger the upgrades" — the sweep in `advanceResearch` runs
    // every turn, so the verb that connected the iron (a mine, a purchase, a
    // capture, a founding) need not know about upgrades at all.
    const state = flatState();
    createUnit(state, 0, 'warrior', 8, 5);
    grant(state, 0, 'bronzeWorking', 'stonecraft', 'ironWorking');
    advanceResearch(state);
    expect(state.units[0]!.type).toBe('warrior');
    connectIron(state, 0, 8, 5);
    expect(state.players[0]!.researching).toBeNull();
    advanceResearch(state);
    expect(state.units[0]!.type).toBe('swordsman');
  });

  it('charges retooling gold when the rules ask for it, and stops when it runs out', () => {
    const state = flatState();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 8, 5 + i);
    grant(state, 0, 'bronzeWorking', 'stonecraft');
    connectIron(state, 0, 8, 5);
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
    grant(state, 0, 'bronzeWorking', 'stonecraft');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    advanceResearch(state);
    expect(state.units[0]!.movesLeft).toBeLessThanOrEqual(unitDef('swordsman').movement);
  });

  it('reports what changed, in words', () => {
    const state = flatState();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 8, 5 + i);
    grant(state, 0, 'bronzeWorking', 'stonecraft');
    connectIron(state, 0, 8, 5);
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

    const cost = techDef('letters').cost;
    expect(turnsToTech(state, 0, 'letters')).toBe(Math.ceil(cost / rate));

    // Banked beakers count toward whichever tech is asked about.
    state.players[0]!.sciencePool = cost;
    expect(turnsToTech(state, 0, 'letters')).toBe(0);
  });

  it('says "never" for an empire that makes no science at all', () => {
    const state = flatState();
    expect(playerScience(state, 0)).toBe(0);
    expect(turnsToTech(state, 0, 'letters')).toBe(null);
  });

  it('previews a building with the same function the turn pipeline banks', () => {
    const state = flatState();
    const first = plant(state, 0, 8, 5);
    const second = plant(state, 0, 12, 5);
    first.population = 4;
    second.population = 2;
    second.buildings.push('library');

    const delta = buildingYieldDelta(state, 0, 'library');
    // Only the city without one contributes, and it contributes both of the
    // library's science terms — the flat one it gained in the Age I rework and
    // the per-citizen one, floored on its own.
    const def = buildingDef('library');
    expect(delta.science).toBe(def.science + Math.floor(4 * def.sciencePerPop));
    expect(delta.gold).toBe(def.gold);
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
  it('round-trips a schema 33 save with research in it', () => {
    expect(SCHEMA_VERSION).toBe(33);
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
      dispatch(side, choose(0, 'stonecraft'));
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
    const forged = [...game.log, choose(0, 'earthenware')];
    expect(() => replay(game.config, forged)).toThrow(/already being researched/);
  });
});

// ---------------------------------------------------------------------------

/**
 * The research queue (playtest batch two).
 *
 * The claims worth pinning are the ones a second implementation would get wrong:
 * the *order* prerequisites come out in, that the two modes are two rules over
 * one plan, that a dequeue takes its dependants with it, and — the load-bearing
 * one — that the queue advances by the same code whether a turn's beakers or a
 * windfall finished the node.
 */
describe('the research queue', () => {
  /** `chooseResearch` with a mode. */
  function queue(playerId: number, techId: string, mode: 'replace' | 'append'): Command {
    return { type: 'chooseResearch', playerId, techId, queue: mode } as Command;
  }

  function drop(playerId: number, techId: string): Command {
    return { type: 'dequeueResearch', playerId, techId } as Command;
  }

  it('expands a locked node by prerequisite depth, then roster order', () => {
    const state = flatState();
    // Iron Working from the opening kit needs five nodes under it, spread over
    // three depths. Depth first — so nothing is ever queued before something it
    // needs — and `TECH_IDS` order within a depth, because a sort that fell back
    // on anything else would be a sort a replay could disagree with.
    expect(researchExpansion(state, 0, 'ironWorking')).toEqual([
      'husbandry',
      'mining',
      'earthenware',
      'bronzeWorking',
      'stonecraft',
      'ironWorking',
    ]);
    // Every entry stands behind everything it needs.
    const seen: TechId[] = [];
    for (const id of researchExpansion(state, 0, 'ironWorking')) {
      for (const prereq of techDef(id).prereqs) {
        expect(seen.includes(prereq) || prereqsMet(state, 0, id), `${id} → ${prereq}`).toBe(true);
      }
      seen.push(id);
    }
    // What is already held is simply not in it.
    grant(state, 0, 'mining', 'earthenware', 'bronzeWorking');
    expect(researchExpansion(state, 0, 'ironWorking')).toEqual([
      'husbandry',
      'stonecraft',
      'ironWorking',
    ]);
  });

  it('makes the head the current research and the rest the queue', () => {
    const state = flatState();
    expect(applyCommand(state, choose(0, 'ironWorking'))).toEqual({ ok: true });
    const player = state.players[0]!;
    expect(player.researching).toBe('husbandry');
    expect(player.researchQueue).toEqual([
      'mining',
      'earthenware',
      'bronzeWorking',
      'stonecraft',
      'ironWorking',
    ]);
    expect(researchPlan(player)).toEqual(['husbandry', ...player.researchQueue!]);
    // Nothing was spent: the pool is still the progress.
    expect(player.sciencePool).toBe(0);
  });

  it('replaces by default and appends on request, skipping what is already lined up', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'ironWorking'));
    const player = state.players[0]!;

    // `replace` blows the plan away — the player changed their mind.
    expect(applyCommand(state, queue(0, 'sailing', 'replace'))).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(['sailing']);

    // `append` is a second destination, and adds only what is missing.
    expect(applyCommand(state, queue(0, 'bronzeWorking', 'append'))).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(['sailing', 'mining', 'earthenware', 'bronzeWorking']);
    expect(applyCommand(state, queue(0, 'stonecraft', 'append'))).toEqual({ ok: true });
    // Earthenware is already in the plan and is not queued twice; husbandry is
    // the only thing Stonecraft still needs.
    expect(researchPlan(player)).toEqual([
      'sailing',
      'mining',
      'earthenware',
      'bronzeWorking',
      'husbandry',
      'stonecraft',
    ]);
    // The head never moved: appending is not choosing.
    expect(player.researching).toBe('sailing');
  });

  it('refuses an append that would change nothing, byte-identically', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'ironWorking'));
    const before = snapshotState(state);
    const result = applyCommand(state, queue(0, 'bronzeWorking', 'append'));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain('already in');
    expect(snapshotState(state)).toBe(before);
  });

  it('dequeues a node and everything queued behind it that needed it', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'ironWorking'));
    const player = state.players[0]!;

    // Bronzeworking goes, and Iron Working goes with it — a plan holding a node
    // whose prerequisite has been pulled out is a plan that lies.
    expect(applyCommand(state, drop(0, 'bronzeWorking'))).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(['husbandry', 'mining', 'earthenware', 'stonecraft']);

    // Dropping the head promotes whatever stood behind it, and spends nothing.
    player.sciencePool = 33;
    expect(applyCommand(state, drop(0, 'husbandry'))).toEqual({ ok: true });
    // Stonecraft needed Husbandry, so it went too.
    expect(researchPlan(player)).toEqual(['mining', 'earthenware']);
    expect(player.researching).toBe('mining');
    expect(player.sciencePool).toBe(33);
  });

  it('empties to no queue at all, and refuses a node that is not in the plan', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzeWorking'));
    const player = state.players[0]!;
    for (const id of ['bronzeWorking', 'mining', 'earthenware']) {
      applyCommand(state, drop(0, id));
    }
    // The key is deleted rather than emptied — an empire that emptied its queue
    // and one that never had one serialise identically.
    expect(player.researching).toBe(null);
    expect('researchQueue' in player).toBe(false);

    const before = snapshotState(state);
    const result = applyCommand(state, drop(0, 'sailing'));
    expect(result.ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('never leaves a queue standing behind an empty head', () => {
    // The invariant the End Turn blocker leans on: it asks `researching === null`
    // and nothing else, so a plan with something in it must always have a head.
    const state = flatState();
    const player = state.players[0]!;
    const check = (): void => {
      if ((player.researchQueue ?? []).length > 0) expect(player.researching).not.toBe(null);
    };

    applyCommand(state, choose(0, 'ironWorking'));
    check();
    player.sciencePool = 10_000;
    for (let turn = 0; turn < 8; turn++) {
      advanceResearch(state);
      check();
    }
    applyCommand(state, choose(0, 'letters'));
    check();
    for (const id of [...researchPlan(player)]) {
      applyCommand(state, drop(0, id));
      check();
    }
  });

  it('advances the head when a technology completes, keeping the overflow', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzeWorking'));
    const player = state.players[0]!;
    expect(researchPlan(player)).toEqual(['mining', 'earthenware', 'bronzeWorking']);

    player.sciencePool = techDef('mining').cost + 5;
    advanceResearch(state);
    expect(player.techsResearched).toContain('mining');
    // The next one is aimed at in the same phase, and the overflow is waiting
    // for it exactly as it waited for a hand-made choice.
    expect(player.researching).toBe('earthenware');
    expect(player.sciencePool).toBe(5);
    expect(player.researchQueue).toEqual(['bronzeWorking']);

    // One technology per player per turn, queue or no queue.
    player.sciencePool = 10_000;
    advanceResearch(state);
    expect(player.techsResearched).toContain('earthenware');
    expect(player.techsResearched).not.toContain('bronzeWorking');
    expect(player.researching).toBe('bronzeWorking');
  });

  it('drops a queued node the empire came by some other way', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzeWorking'));
    const player = state.players[0]!;
    // A gift, a ruin, a Great Library: earthenware arrives without the queue.
    grant(state, 0, 'earthenware');
    player.sciencePool = techDef('mining').cost;
    advanceResearch(state);
    expect(player.researching).toBe('bronzeWorking');
    expect('researchQueue' in player).toBe(false);
  });

  it('advances the head from a windfall by the same routine a turn does', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzeWorking'));
    const player = state.players[0]!;
    // Star tablets: the pool is filled outside the pipeline and settled at once.
    player.sciencePool = techDef('mining').cost;
    const done = settleResearchWindfall(state, player);
    expect(done?.techId).toBe('mining');
    expect(player.researching).toBe('earthenware');
    expect(player.researchQueue).toEqual(['bronzeWorking']);
  });

  it('schedules the plan cumulatively, one technology per turn at the floor', () => {
    const game = researchingGame();
    const state = game.state;
    expect(applyCommand(state, queue(0, 'ironWorking', 'replace'))).toEqual({ ok: true });
    const steps = queueTurns(state, 0);
    expect(steps.map((step) => step.techId)).toEqual(researchPlan(state.players[0]!));
    // Cumulative: each entry is paid for out of what the ones before it left.
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.turns!).toBeGreaterThanOrEqual(steps[i - 1]!.turns!);
    }
    // And nothing lands sooner than its place in the queue, however full the
    // pool is — `settleResearch` completes at most one a resolution.
    state.players[0]!.sciencePool = 100_000;
    expect(queueTurns(state, 0).map((step) => step.turns)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('replays a queued game byte-identically', () => {
    const game = researchingGame();
    expect(dispatch(game, queue(0, 'ironWorking', 'replace')).ok).toBe(true);
    expect(dispatch(game, queue(0, 'sailing', 'append')).ok).toBe(true);
    expect(dispatch(game, drop(0, 'stonecraft')).ok).toBe(true);
    for (let turn = 0; turn < 25; turn++) {
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    expect(replay(game.config, game.log)).toEqual(game.state);
    expect(loadGame(saveGame(game)).state).toEqual(game.state);
  });
});

// ---------------------------------------------------------------------------

