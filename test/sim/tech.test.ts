import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, buildingDef, isBuildingId } from '../../src/sim/buildingData';
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
  buildError,
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
  upgradeTargetForType,
} from '../../src/sim/tech';
import {
  BUILDING_UNLOCK_TECH,
  PROJECT_UNLOCK_TECH,
  TECH_IDS,
  type TechId,
  UNIT_UNLOCK_TECH,
  isTechId,
  techAgeBands,
  techColumn,
  techColumnCount,
  techDataProblems,
  techDef,
  techDepth,
  techRowCount,
} from '../../src/sim/techData';
import { techGifts, unlockDataProblems } from '../../src/sim/techUnlocks';
import {
  anyCardDef,
  liveEffects,
  payWindfallGrants,
  windfallPayout,
} from '../../src/sim/statecraft';
import { choose, config, researchingGame } from './techHelpers';
import { UNIT_TYPE_IDS, type UnitTypeId, isUnitTypeId, unitDef } from '../../src/sim/unitData';
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

/**
 * Grants everything a node **needs**, and not the node itself — the transitive
 * closure of its prerequisites, asked of the table.
 *
 * Written for the tree pass of 2026-08-30, which doubled the tree: a
 * hand-written list of the two names behind Iron Working was a list that went
 * stale the moment a lane was re-cut, and it went stale as three-line
 * assertions about swordsmen rather than as a sentence about prerequisites.
 * This cannot go stale — it is the same walk `researchExpansion` makes.
 */
function grantPrereqs(state: GameState, playerId: number, id: TechId): void {
  const need: TechId[] = [];
  const walk = (at: TechId): void => {
    for (const prereq of techDef(at).prereqs) {
      if (need.includes(prereq)) continue;
      walk(prereq);
      need.push(prereq);
    }
  };
  walk(id);
  grant(state, playerId, ...need);
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
      // And the Æra V hulls, which shipped ahead of the age that opens them
      // (`UnitDef.awaitsTech`, temporary by construction): no technology names
      // them, `buildError` and `purchaseError` refuse them outright, and the
      // tree pass deletes the marker from three rows and adds them to a node.
      if (unitDef(id).awaitsTech === true) continue;
      expect(UNIT_UNLOCK_TECH.has(id), id).toBe(true);
    }
    for (const id of BUILDING_IDS) {
      // **The building exception, and it is the unit one's twin**: a row a
      // *card* opens (`BuildingDef.unlockedByCard` — the Gilded Hall) has no
      // node to hang on, and `isUnlocked` asks the cards for it instead of
      // asking the tree. Without this clause an ungated row would be buildable
      // from turn one, which is exactly what that field exists to prevent.
      if (buildingDef(id).unlockedByCard === true) continue;
      // **And the third exception, temporary by construction**: a row shipped
      // ahead of the age that opens it (`BuildingDef.awaitsTech` — the
      // cathedral, the mint and the armoury, which the Æra IV endeavours race
      // toward). It is refused by `buildError` and `purchaseError` rather than
      // gated by the tree, and the day a node names it the marker is deleted
      // and this clause stops skipping it.
      if (buildingDef(id).awaitsTech === true) continue;
      // **And the fourth, the finish line** (Entry LVIII): a row the *world*
      // opens (`BuildingDef.worldUnlockTech` — the Magnum Opus) hangs on no
      // node of anybody's tree, because what opens it is any empire anywhere
      // reaching the closing technology. `isUnlocked` asks the world for it
      // instead of asking this map, exactly as it asks the cards for the
      // Gilded Hall.
      if (buildingDef(id).worldUnlockTech !== undefined) continue;
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

  it('prices every node off its own column, by the one tapered table', () => {
    // **The costs are a formula now** (the user, 2026-09-02): a column *is* a
    // price. Every node's cost is read off one table indexed by `techColumn`,
    // so the four age bands this test used to carry — [8, 32] / [45, 195] /
    // [340, 640] / [720, 1140] — are gone, and with them every hand-tuned
    // figure the tree has accumulated since Milestone 6. What replaces them is
    // the table itself, written down here because the data is the truth and
    // this is the witness that the data still agrees with the rule that made
    // it.
    //
    // The formula, from the user's own anchors (13, 30, ~70, "and on and on"):
    //
    //     cost(1) = 13
    //     cost(n) = friendly(cost(n - 1) x r(n))
    //     r(n)    = 1 + 1.3 x 0.72 ^ max(0, n - 3)
    //
    // so the first two steps are the anchors' 2.3x flat (13 -> 30 -> 69) and
    // the ratio then decays geometrically toward 1, reaching 1.05 by the last
    // column. `friendly` rounds to the nearest 1 below a hundred, the nearest 5
    // below a thousand, the nearest 50 above.
    //
    // **The formula anchors at column 1, not column 0** (the user, 2026-09-02:
    // "the first tier should be 13 science ... I think the agent skipped a
    // tier"). It anchored at the root when it landed, which put Fletching,
    // Mining, Earthenware and Husbandry — the first tier anybody ever *buys* —
    // at 30, because column 0 holds Agriculture alone and Agriculture is
    // pre-granted (`RESEARCH.startingTechs`) and never paid for. So the whole
    // ladder shifted one column right: every column takes the price the column
    // to its left used to carry, and the old top figure of 950 falls off the
    // end. Column 0's 5 is nominal and unpayable; it is written low only so
    // that the monotone-along-every-edge pin at the bottom of this test is an
    // honest statement rather than an exemption. The tree is 22544 beakers
    // where the mis-anchored ladder was 26089.
    //
    // **The taper is the tuned one, and the tuning is a measurement rather than
    // a taste.** The brief asked for a linear taper from 2.3 to 1.5, which ends
    // at 48350 and prices the whole tree at 490931 beakers; played out on the
    // pacing harness below that empire researched **43 of the 50 nodes in two
    // thousand turns** and never reached AEra IV, because this science economy
    // tops out in the low hundreds of beakers a turn. A geometric decay holds
    // the anchors the linear one was chosen for and lands the tree at 22544,
    // which the same harness sweeps by turn 273 (see `tech.slow.test.ts`).
    // Turning the game harder or easier is one number: 0.72 -> 0.75 is 33779
    // beakers, 0.70 is 21994.
    //
    // **Tree revision 4 (2026-09-02, the user's redraw) shortened the chart to
    // twelve columns**, and the ladder was *truncated* rather than re-fitted:
    // the formula is untouched and every column keeps the price it already
    // carried. **Revision 4.1 (2026-09-03, the user's arrow revision) deepened
    // the late game again** — Engineering chains off The Saddle, the sea lane
    // runs through Raised Fields, and Alchemy closes a fourth Æra IV column —
    // so the chart is fourteen columns and 875/920 are back on the end of the
    // same untouched table. Revision 4.2 (2026-09-03, the user again): Machinery and
    // State Workforce move to Æra III, four nodes carry an authored
    // `columnShift` so the drawn alignment is data (Theology beside Horology,
    // the Holy Office among the closers), and Alchemy takes all four closing
    // lines as parents — thirteen columns, the tree at 19725 beakers, the ages
    // 345 / 1665 / 6415 / 11300 (the user: columns 9-12 constitute Æra IV).
    //
    // **The late columns are authored above the taper** (the user, 2026-09-03:
    // "technologies should keep the same scaling they had in age 1-2.
    // Technologies should be extremely expensive in age 4-5."). Columns 0-5 are
    // the formula's own figures, untouched, so the opening a player learns the
    // game on is byte-identical; columns 6-8 lift a little over the taper
    // (335/450/565 → 400/540/680) and columns 9-12 lift a lot
    // (665/750/820/875 → 1450/1700/1950/2200), roughly 2.3x the closing age.
    // The one-formula ladder is therefore no longer the whole table — a late
    // column is a *ruling*, and this list is where it is written down. The tree
    // is 35710 beakers against 19725, and the ages are 345 / 1665 / 7700 /
    // 26000: Æra IV alone is now nearly three quarters of the chart.
    const COLUMN_COSTS = [5, 13, 30, 69, 135, 225, 400, 540, 680, 1450, 1700, 1950, 2200];
    expect(COLUMN_COSTS).toHaveLength(techColumnCount());
    for (const id of TECH_IDS) {
      expect(techDef(id).cost, id).toBe(COLUMN_COSTS[techColumn(id)]);
    }
    // Which makes "a column is roughly a price" exact rather than aspirational,
    // and is why `techChart.test.ts` no longer pins a list of nodes a
    // dependency drags out of cost order: there cannot be one.
    const bands: Record<number, [number, number]> = {
      1: [5, 69],
      2: [135, 225],
      3: [400, 680],
      4: [1450, 2200],
    };
    for (const id of TECH_IDS) {
      const def = techDef(id);
      const [low, high] = bands[def.age]!;
      expect(def.cost, id).toBeGreaterThanOrEqual(low);
      expect(def.cost, id).toBeLessThanOrEqual(high);
    }
    // Four ages, all of them populated. Æra V (Magister) is deliberately not in
    // `TECH_AGES` until it has nodes — an age no technology belongs to is a
    // payoff that can never arrive.
    expect(new Set(TECH_IDS.map((id) => techDef(id).age))).toEqual(new Set([1, 2, 3, 4]));
    // And no node is dearer than anything it needs, along every edge in the
    // graph — with **no exemption left**. Agriculture used to be one, because
    // the old anchor priced the root at 13 and its children at 30 and the only
    // honest thing to say was that a starting technology's cost is not a price.
    // Re-anchoring at the first paid tier gave the root a nominal 5 instead, so
    // the claim holds along every edge as written, which is the point of
    // writing it that way.
    for (const id of TECH_IDS) {
      for (const prereq of techDef(id).prereqs) {
        expect(techDef(prereq).cost, `${prereq} → ${id}`).toBeLessThanOrEqual(techDef(id).cost);
      }
    }
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
      // An `awaitsTech` row is *unlocked* — no node gates it — and refused at
      // the two places a thing is acquired instead. That is the marker's whole
      // shape, so the opening kit is asked the question a player would ask.
      if (buildingDef(id).awaitsTech === true) {
        expect(buildError(state, 0, 'building', id), id).not.toBeNull();
        continue;
      }
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
      // Plus the authored right-shift: revision 4.2's `columnShift` is part of
      // the depth by design, so the drawn alignment IS the derivation.
      const chain = def.prereqs.reduce((deep, prereq) => Math.max(deep, techDepth(prereq) + 1), 0);
      const deepest = chain + (def.columnShift ?? 0);
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
    // Re-named for tree revision 4 (2026-09-02): Chivalry is cut, so the horse
    // line now runs out through The Saddle to the knight's own node, and the
    // magistrate's line ends at Militant Orders rather than at Fortification.
    const chains: TechId[][] = [
      ['mining', 'bronzeWorking', 'theWheel', 'bronzePanoply', 'siegecraft', 'ironWorking', 'theCataphract'],
      ['bronzeWorking', 'ironWorking', 'steel'],
      ['agriculture', 'earthenware', 'stonecraft', 'theWheel', 'currency', 'stateWorkforce', 'theImperialPost', 'artisanry'],
      ['letters', 'epicPoetry', 'theHighTemple', 'philosophy', 'theology', 'education'],
      ['letters', 'theLongCount', 'kingship', 'theExaminationHall', 'colonialCharters', 'prospecting'],
      ['theCataphract', 'engineering', 'machinery', 'steel', 'militantOrders', 'alchemy'],
    ];
    for (const chain of chains) {
      const columns = chain.map((id) => techDepth(id));
      for (let step = 1; step < columns.length; step++) {
        expect(columns[step]!, `${chain[step - 1]} → ${chain[step]}`).toBeGreaterThan(
          columns[step - 1]!,
        );
      }
    }
    // The whole chart, for scale: **twelve** columns deep, eight lanes tall.
    // The history, because each figure was a decision: the re-cut of 2026-09-02
    // drew seven columns and eleven lanes, the chain pass put the depth back at
    // eleven columns, the fold pass cut the lanes to eight, the timeline pass
    // reached fourteen columns — and **tree revision 4, the user's own redraw,
    // settled at twelve**. The ages own disjoint column runs (4 + 2 + 3 + 3), so
    // the banners are exact; the lane budget did not move, because it is what
    // the stage was fitted for and the widest column still holds six.
    expect(techColumnCount()).toBe(13);
    expect(techRowCount()).toBe(8);
  });

  it('hands every tech a lane, and never two techs the same cell', () => {
    const cells = new Set<string>();
    for (const id of TECH_IDS) {
      const { row } = techDef(id);
      expect(Number.isInteger(row), id).toBe(true);
      expect(row, id).toBeGreaterThanOrEqual(0);
      const cell = `${techColumn(id)},${row}`;
      expect(cells.has(cell), `${id} at ${cell}`).toBe(false);
      cells.add(cell);
    }
    // No column and no lane is left empty: an empty one is a hole in the chart
    // that the ages would then have to paint around.
    const columns = new Set(TECH_IDS.map((id) => techColumn(id)));
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
    // Re-measured by the tree pass of 2026-08-30 rather than re-argued: a band
    // is a *majority vote of the column* and always has been, so the runs below
    // are read off the tree the same way the numerals are painted. Twelve
    // columns, four ages, in order and contiguous — which is the property this
    // test is actually about.
    expect(bands.map((band) => band.age)).toEqual([1, 2, 3, 4]);
    expect(bands[0]!.from).toBe(0);
    expect(bands[bands.length - 1]!.to).toBe(techColumnCount() - 1);
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
    // Iron Working descends from the Bronze Panoply alone since the re-cut of
    // 2026-09-02 — one parent, and the whole chain is the bronze line.
    expect(plan).toContain('bronzePanoply');
    expect(plan).toContain('mining');
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
    // The four second-tier nodes, in the tree's own order — the whole of a
    // player's opening choice now that Agriculture is the only root. Sailing
    // left this list in the timeline pass of 2026-09-02: it hangs off
    // Earthenware now (the jar before the voyage), which is what gives the
    // second column four nodes instead of five and the third column three.
    expect(availableTechs(state, 0)).toEqual([
      'husbandry',
      'fletching',
      'mining',
      'earthenware',
    ]);
    // The Wheel is Æra I's other two-parent gate under tree revision 4 — the
    // forge and the mason's yard, not the herd — so both of those have to be in
    // hand before it is offered.
    grant(state, 0, 'mining', 'earthenware', 'bronzeWorking', 'stonecraft');
    expect(availableTechs(state, 0)).toContain('theWheel');
    expect(availableTechs(state, 0)).not.toContain('mining');
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
    // A name that has never been a technology — 'alchemy' became one in the
    // re-cut of 2026-09-02, which is exactly the drift this pin exists to catch.
    (state.players[0]! as { researching: string | null }).researching = 'sorcery';
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
    expect(refusal.ok === false && refusal.error).toContain('Writing');
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

/**
 * **A row an empire has outgrown leaves the build list** (user, 2026-09-03:
 * "once a unit is obsolete — replaced by the stronger version through a tech —
 * please remove it from the build queue. Only show the antiquated unit if the
 * empire doesn't have access to a prerequisite strategic resource").
 *
 * Read against the real roster rather than against a fixture, because the whole
 * of the rule is that succession is the data's: `upgradesTo` is the chain, and
 * the two rungs below are the two the tree actually draws — the swordsman, who
 * asks for nothing, and the legionary, who asks for iron.
 */
describe('obsolete units', () => {
  it('offers the warrior until the sword line opens', () => {
    const state = flatState();
    expect(buildError(state, 0, 'unit', 'warrior')).toBeNull();
    expect(upgradeTargetForType(state, 0, 'warrior')).toBeNull();
    // The successor is the one behind the technology, and the message says so.
    expect(buildError(state, 0, 'unit', 'swordsman')).toContain('needs');
  });

  it('takes the warrior off the list the moment the swordsman can be built', () => {
    const state = flatState();
    grantPrereqs(state, 0, 'bronzePanoply');
    grant(state, 0, 'bronzePanoply');
    expect(buildError(state, 0, 'unit', 'swordsman')).toBeNull();
    expect(buildError(state, 0, 'unit', 'warrior')).toBe(
      'Warrior has been replaced by the Swordsman',
    );
    expect(upgradeTargetForType(state, 0, 'warrior')).toBe('swordsman');
  });

  it('keeps the antiquated row while the successor’s iron is out of reach', () => {
    // The ruling's exception, and the only rung on the roster that carries it:
    // Iron Working opens the legionary, but a seamless empire cannot field one,
    // so the swordsman it replaces stays on the list until the mine lands.
    const state = flatState();
    grantPrereqs(state, 0, 'ironWorking');
    grant(state, 0, 'ironWorking');
    expect(buildError(state, 0, 'unit', 'legionary')).toBe('Legionary needs improved Iron');
    expect(buildError(state, 0, 'unit', 'swordsman')).toBeNull();

    connectIron(state, 0, 8, 5);
    expect(buildError(state, 0, 'unit', 'legionary')).toBeNull();
    expect(buildError(state, 0, 'unit', 'swordsman')).toBe(
      'Swordsman has been replaced by the Legionary',
    );
    // And the warrior below it walks the whole chain rather than one rung.
    expect(upgradeTargetForType(state, 0, 'warrior')).toBe('legionary');
  });

  it('gives the row back when the iron is lost again', () => {
    // The one gate in `buildError` that goes backwards, and it must: a captured
    // mine takes the legionary with it, and an empire that can field no
    // legionary is an empire that had better be allowed its swords again.
    const state = flatState();
    grantPrereqs(state, 0, 'ironWorking');
    grant(state, 0, 'ironWorking');
    connectIron(state, 0, 8, 5);
    expect(buildError(state, 0, 'unit', 'swordsman')).not.toBeNull();
    at(state.map, 8, 5).resource = undefined;
    expect(buildError(state, 0, 'unit', 'swordsman')).toBeNull();
  });

  it('never climbs into a row no technology reaches', () => {
    // `awaitsTech` rows have no gate in the tree, so `isUnlocked` says yes to
    // them (that is what the flag exists to correct). A hull nobody can build is
    // not a replacement for anything, and the walk stops below it — the same
    // reading `buildError` gives the row itself.
    const state = flatState();
    grant(state, 0, ...TECH_IDS);
    for (const id of UNIT_TYPE_IDS) {
      const target = upgradeTargetForType(state, 0, id);
      if (target === null) continue;
      expect(unitDef(target).awaitsTech, `${id} → ${target}`).not.toBe(true);
    }
    // The caravel is the case in the data today: the corvette above it waits on
    // an age this build of the tree has not drawn.
    expect(unitDef('caravel').upgradesTo).toBe('corvette');
    expect(unitDef('corvette').awaitsTech).toBe(true);
    expect(upgradeTargetForType(state, 0, 'caravel')).toBeNull();
    expect(buildError(state, 0, 'unit', 'caravel')).toBeNull();
  });

  it('refuses a new obsolete row but keeps the one a town is already building', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const send = (queue: unknown[]): ReturnType<typeof applyCommand> =>
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue,
      } as Command);

    expect(send([{ kind: 'unit', id: 'warrior' }])).toEqual({ ok: true });
    grantPrereqs(state, 0, 'bronzePanoply');
    grant(state, 0, 'bronzePanoply');

    // The hammers already in it are real: the standing row survives, and the
    // queue around it stays editable.
    expect(send([{ kind: 'unit', id: 'warrior' }, { kind: 'unit', id: 'swordsman' }])).toEqual({
      ok: true,
    });
    expect(buildError(state, 0, 'unit', 'warrior', city)).toBeNull();

    // A town that is *not* building one may not start one.
    const other = plant(state, 0, 12, 5);
    const refusal = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: other.id,
      queue: [{ kind: 'unit', id: 'warrior' }],
    } as Command);
    expect(refusal.ok).toBe(false);
    expect(refusal.ok === false && refusal.error).toBe(
      'Warrior has been replaced by the Swordsman',
    );
    expect(other.queue).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('auto-upgrade', () => {
  it('retypes in place, keeping id, tile and health fraction', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    unit.hp = 60;
    // The sword is Bronze Panoply's since the re-cut of 2026-09-02, and it asks
    // for no iron: the melee ladder's iron rung is the legionary, an age later.
    grantPrereqs(state, 0, 'bronzePanoply');
    applyCommand(state, choose(0, 'bronzePanoply'));
    state.players[0]!.sciencePool = techDef('bronzePanoply').cost;

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
    // The melee ladder is warrior → swordsman → **legionary** → longswordsman,
    // and Steel descends through Iron Working, so its own prerequisites are the
    // whole of what the longswordsman needs.
    grantPrereqs(state, 0, 'steel');
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
    grantPrereqs(state, 0, 'ironWorking');
    connectIron(state, 0, 8, 5);
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;

    advanceResearch(state);
    const types = state.units.map((unit) => `${unit.ownerId}:${unit.type}`);
    // Two rungs in one sweep: Bronze Panoply is Iron Working's prerequisite, so
    // the sword was already theirs and the seam finishes the walk.
    expect(types).toEqual([
      '0:legionary',
      '0:legionary',
      '0:legionary',
      '0:scout',
      '1:warrior',
    ]);
  });

  it('walks the whole chain when a unit has missed a generation', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    connectIron(state, 0, 8, 5);
    // Everything the longswordsman needs, except the tech that finishes it.
    grantPrereqs(state, 0, 'steel');
    expect(upgradeTargetFor(state, unit)).toBe('legionary');

    applyCommand(state, choose(0, 'steel'));
    state.players[0]!.sciencePool = techDef('steel').cost;
    advanceResearch(state);
    // Warrior → swordsman → legionary → longswordsman, in one resolution.
    expect(state.units[0]!.type).toBe('longswordsman');
  });

  it('waits for iron: Iron Working alone stops the walk at the swordsman', () => {
    // User, 2026-08-29: "iron working should only upgrade warriors when iron
    // is available". The walk in `upgradeTargetFor` stops at a rung whose
    // `requiresResource` the empire does not control — the same gate
    // `buildError` keeps at the queue. Since the re-cut of 2026-09-02 that rung
    // is the **legionary**, so a seamless empire gets the bronze sword and no
    // further.
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    grantPrereqs(state, 0, 'ironWorking');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    advanceResearch(state);
    expect(state.players[0]!.techsResearched).toContain('ironWorking');
    expect(state.units[0]!.type).toBe('swordsman');
    expect(upgradeTargetFor(state, unit)).toBeNull();
  });

  it('retools the resolution after iron is connected, with nothing being researched', () => {
    // "If iron isn't available when swordsmen are unlocked, connecting iron
    // will then trigger the upgrades" — the sweep in `advanceResearch` runs
    // every turn, so the verb that connected the iron (a mine, a purchase, a
    // capture, a founding) need not know about upgrades at all.
    const state = flatState();
    createUnit(state, 0, 'warrior', 8, 5);
    grantPrereqs(state, 0, 'ironWorking');
    grant(state, 0, 'ironWorking');
    advanceResearch(state);
    // The bronze rung is free; the walk halts at the legionary's seam.
    expect(state.units[0]!.type).toBe('swordsman');
    connectIron(state, 0, 8, 5);
    expect(state.players[0]!.researching).toBeNull();
    advanceResearch(state);
    expect(state.units[0]!.type).toBe('legionary');
  });

  it('charges retooling gold when the rules ask for it, and stops when it runs out', () => {
    const state = flatState();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 8, 5 + i);
    grantPrereqs(state, 0, 'ironWorking');
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

    // Two paid for, in `state.units` order; the third could not. One charge
    // apiece however many rungs the walk climbs — the price is the retooling,
    // not the ladder.
    expect(state.units.map((unit) => unit.type)).toEqual(['legionary', 'legionary', 'warrior']);
    expect(state.players[0]!.gold).toBe(5);
  });

  it('is free at the v0 setting', () => {
    expect(RESEARCH.retoolCost).toBe(0);
  });

  it('caps movement at the allowance of the type it becomes', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 8, 5);
    unit.movesLeft = 2;
    grantPrereqs(state, 0, 'ironWorking');
    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    advanceResearch(state);
    expect(state.units[0]!.movesLeft).toBeLessThanOrEqual(unitDef('swordsman').movement);
  });

  it('reports what changed, in words', () => {
    const state = flatState();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 8, 5 + i);
    grantPrereqs(state, 0, 'ironWorking');
    connectIron(state, 0, 8, 5);
    const before = researchSnapshot(state, 0);

    applyCommand(state, choose(0, 'ironWorking'));
    state.players[0]!.sciencePool = techDef('ironWorking').cost;
    advanceResearch(state);

    const report = researchSince(state, 0, before);
    expect(report.techs).toEqual(['ironWorking']);
    expect(report.upgrades).toEqual([{ from: 'warrior', to: 'legionary', count: 3 }]);
    expect(describeUpgrade(report.upgrades[0]!)).toBe('3 warriors became legionaries');
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

  it('gives the same answer whether the rate is handed in or fetched', () => {
    // The star chart asks this twenty-seven times about one empire and
    // `playerScience` sums `cityYields` over every city, so the rate is summed
    // once per render and handed down (2026-08-29). The parameter is an
    // optimisation and must never become a second opinion: hard rule 5 says the
    // figure on a star is this function's answer, and here it is, both ways.
    const state = flatState();
    const first = plant(state, 0, 8, 5);
    const second = plant(state, 0, 12, 5);
    first.population = 5;
    second.population = 3;
    const rate = playerScience(state, 0);
    for (const techId of TECH_IDS) {
      expect(turnsToTech(state, 0, techId, rate), techId).toBe(turnsToTech(state, 0, techId));
    }
    // And the schedule the plan prints, which shares the parameter for the same
    // reason: the strip and the stars above it are drawn in one breath.
    state.players[0]!.researching = 'earthenware';
    state.players[0]!.researchQueue = ['mining', 'bronzeWorking'];
    expect(queueTurns(state, 0, rate)).toEqual(queueTurns(state, 0));

    // Including the answer an empire with no science gets, which is `null`
    // rather than a long wait — the branch a hoisted zero must not skip.
    const quiet = flatState();
    expect(turnsToTech(quiet, 0, 'letters', playerScience(quiet, 0))).toBe(null);
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
  it('round-trips a schema 40 save with research in it', () => {
    // v40: the Cathedral (Entry LV) — cost 340 and a consecration draw at completion
    // moved every replay that raised one.
    // v42: the faith rework of Entry LVIII — one-charge agents, the founding's
    // double draft and The Holy Office's tenants move every replay with a
    // prophet or an augur in it.
    // v44: the age-1 restoration — Calendar is a node again and Æra I's old
    // prerequisites are back, so a v43 log's research plan is not this tree's.
    // v45: the endgame of Entry LVIII — the Magnum Opus, the three bead-paying
    // great works, the Long Count's die and Alchemy's closing bead. A v44 log
    // reaches a winner it never reached, and spends rolls it never spent.
    // v46: the card pools of Entry LVIII — nineteen new Orders, a Doctrine, two
    // beliefs and a sixth consecration join the bags a draft draws from, and The
    // Laureate's once-per-game great person becomes a renown trickle. A v45 log
    // names indices of hands this build does not deal.
    // v47: the timeline reshape and the column-formula costs — seventeen
    // prerequisite edges moved so every column earns its width, and every cost
    // is rewritten off the node's own column. A v46 log aims research at a tree
    // this build does not have, and pays prices it never paid.
    // v48: the user's balance pass — the authored Order deepening ladder, the
    // Order and Doctrine retunes, and the reworked luxury signatures. A v47 log
    // drafts from a deck this build does not deal, and deepens by numbers it
    // does not carry.
    // v49: the cost ladder re-anchored at the first *paid* tier — the root is
    // not a tier. Column 0 holds Agriculture alone and Agriculture is granted,
    // so every column now takes the price the column to its left used to carry
    // (Fletching 13 where it was 30) and a v48 log pays the wrong beakers from
    // the first technology anybody researches.
    // v50: tree revision 4 — the user's own redraw. Fourteen nodes renamed with
    // their ids kept, three ids cut and three added, almost every prerequisite
    // re-hung, the chart down to twelve columns and every cost re-read off the
    // truncated ladder. And, beside it, the one-unit-a-turn rule widened to one
    // *per class*, which is a reducer that accepts what v49's refused.
    // v55 (2026-09-03, the playtest notes): two table deletions — the Standing
    // Stones improvement and the Terraces — so a v54 log that built either has
    // no row to replay into.
    // v57 (war & diplomacy, phase two): deals exist. Two registers, four
    // verbs and a widened `proposePeace`, a luxury that may be lent across a
    // table, and one technology that hands over a verb it did not — so a v56
    // log knows no deal commands and replays into a different world.
    expect(SCHEMA_VERSION).toBe(61);
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
    // The Bronze Panoply from the opening kit needs five nodes under it. Tree
    // revision 4 (2026-09-02) hangs the bronze line off the *forge and the
    // mason's yard* — Bronzeworking wants Mining, Stonecraft wants Pottery, and
    // The Wheel wants both of those — so the line is still a *lattice* rather
    // than a single file, which is what this expansion exists to demonstrate.
    // (It used to be asked of Iron Working, which now sits six columns out and
    // pulls fifteen nodes in: a fine expansion and an unreadable pin.)
    // Depth first, so nothing is ever queued before something it needs, and
    // `TECH_IDS` order within a depth, because a sort that fell back on anything
    // else would be a sort a replay could disagree with.
    expect(researchExpansion(state, 0, 'bronzePanoply')).toEqual([
      'mining',
      'earthenware',
      'bronzeWorking',
      'stonecraft',
      'theWheel',
      'bronzePanoply',
    ]);
    // Every entry stands behind everything it needs.
    const seen: TechId[] = [];
    for (const id of researchExpansion(state, 0, 'bronzePanoply')) {
      for (const prereq of techDef(id).prereqs) {
        expect(seen.includes(prereq) || prereqsMet(state, 0, id), `${id} → ${prereq}`).toBe(true);
      }
      seen.push(id);
    }
    // What is already held is simply not in it.
    grant(state, 0, 'mining', 'earthenware', 'bronzeWorking', 'stonecraft');
    expect(researchExpansion(state, 0, 'bronzePanoply')).toEqual([
      'theWheel',
      'bronzePanoply',
    ]);
  });

  it('makes the head the current research and the rest the queue', () => {
    const state = flatState();
    expect(applyCommand(state, choose(0, 'bronzePanoply'))).toEqual({ ok: true });
    const player = state.players[0]!;
    expect(player.researching).toBe('mining');
    expect(player.researchQueue).toEqual([
      'earthenware',
      'bronzeWorking',
      'stonecraft',
      'theWheel',
      'bronzePanoply',
    ]);
    expect(researchPlan(player)).toEqual(['mining', ...player.researchQueue!]);
    // Nothing was spent: the pool is still the progress.
    expect(player.sciencePool).toBe(0);
  });

  it('replaces by default and appends on request, skipping what is already lined up', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzePanoply'));
    const player = state.players[0]!;

    // `replace` blows the plan away — the player changed their mind.
    // Sailing hangs off Pottery, so naming it names that too — which is the
    // expansion this command has always done.
    expect(applyCommand(state, queue(0, 'sailing', 'replace'))).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(['earthenware', 'sailing']);

    // `append` is a second destination, and adds only what is missing.
    expect(applyCommand(state, queue(0, 'bronzeWorking', 'append'))).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(['earthenware', 'sailing', 'mining', 'bronzeWorking']);
    expect(applyCommand(state, queue(0, 'stonecraft', 'append'))).toEqual({ ok: true });
    // Pottery is already in the plan and is not queued twice, so Stonecraft
    // itself is all that is left to add.
    expect(researchPlan(player)).toEqual([
      'earthenware',
      'sailing',
      'mining',
      'bronzeWorking',
      'stonecraft',
    ]);
    // The head never moved: appending is not choosing.
    expect(player.researching).toBe('earthenware');
  });

  it('refuses an append that would change nothing, byte-identically', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzePanoply'));
    const before = snapshotState(state);
    const result = applyCommand(state, queue(0, 'bronzeWorking', 'append'));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain('already in');
    expect(snapshotState(state)).toBe(before);
  });

  it('dequeues a node and everything queued behind it that needed it', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzePanoply'));
    const player = state.players[0]!;

    // Bronzeworking goes, and The Wheel goes with it — a plan holding a node
    // whose prerequisite has been pulled out is a plan that lies. The Panoply
    // descends from The Wheel too, so the whole tail of the plan goes with the
    // one node that was pulled.
    expect(applyCommand(state, drop(0, 'bronzeWorking'))).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(['mining', 'earthenware', 'stonecraft']);

    // Dropping the head empties the plan, and spends nothing.
    player.sciencePool = 33;
    for (const id of ['stonecraft', 'earthenware']) applyCommand(state, drop(0, id));
    expect(applyCommand(state, drop(0, 'mining'))).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual([]);
    expect(player.researching).toBe(null);
    expect(player.sciencePool).toBe(33);
  });

  it('empties to no queue at all, and refuses a node that is not in the plan', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzeWorking'));
    const player = state.players[0]!;
    // Bronzeworking wants Mining and nothing else under tree revision 4, so the
    // whole plan is two nodes deep.
    for (const id of ['bronzeWorking', 'mining']) {
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
    applyCommand(state, choose(0, 'theWheel'));
    const player = state.players[0]!;
    // The Wheel is Æra I's two-parent gate under tree revision 4 — the forge
    // and the mason's yard — so the plan under it is a lattice four nodes deep.
    expect(researchPlan(player)).toEqual([
      'mining',
      'earthenware',
      'bronzeWorking',
      'stonecraft',
      'theWheel',
    ]);

    player.sciencePool = techDef('mining').cost + 5;
    advanceResearch(state);
    expect(player.techsResearched).toContain('mining');
    // The next one is aimed at in the same phase, and the overflow is waiting
    // for it exactly as it waited for a hand-made choice.
    expect(player.researching).toBe('earthenware');
    expect(player.sciencePool).toBe(5);
    expect(player.researchQueue).toEqual(['bronzeWorking', 'stonecraft', 'theWheel']);
  });

  it('drops a queued node the empire came by some other way', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'theWheel'));
    const player = state.players[0]!;
    // A gift, a ruin, a Great Library: Pottery arrives without the queue, and
    // is stepped straight over the moment the head moves on.
    grant(state, 0, 'earthenware');
    player.sciencePool = techDef('mining').cost;
    advanceResearch(state);
    expect(player.researching).toBe('bronzeWorking');
    expect(player.researchQueue).toEqual(['stonecraft', 'theWheel']);
  });

  it('advances the head from a windfall by the same routine a turn does', () => {
    const state = flatState();
    applyCommand(state, choose(0, 'bronzeWorking'));
    const player = state.players[0]!;
    // Star tablets: the pool is filled outside the pipeline and settled at once.
    player.sciencePool = techDef('mining').cost;
    const done = settleResearchWindfall(state, player);
    expect(done?.techId).toBe('mining');
    expect(player.researching).toBe('bronzeWorking');
    expect('researchQueue' in player).toBe(false);
  });

  it('schedules the plan cumulatively, one technology per turn at the floor', () => {
    const game = researchingGame();
    const state = game.state;
    expect(applyCommand(state, queue(0, 'bronzePanoply', 'replace'))).toEqual({ ok: true });
    const steps = queueTurns(state, 0);
    expect(steps.map((step) => step.techId)).toEqual(researchPlan(state.players[0]!));
    // Cumulative: each entry is paid for out of what the ones before it left.
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.turns!).toBeGreaterThanOrEqual(steps[i - 1]!.turns!);
    }
    // And nothing lands sooner than its place in the queue, however full the
    // pool is — `settleResearch` completes at most one a resolution.
    state.players[0]!.sciencePool = 100_000;
    // One a turn, all six of them, however full the pool is — the Panoply's
    // lattice under tree revision 4 is Mining and Pottery, then Bronzeworking
    // and Stonecraft, then The Wheel, then itself.
    expect(queueTurns(state, 0).map((step) => step.turns)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('replays a queued game byte-identically', () => {
    const game = researchingGame();
    expect(dispatch(game, queue(0, 'ironWorking', 'replace')).ok).toBe(true);
    expect(dispatch(game, queue(0, 'sailing', 'append')).ok).toBe(true);
    // Bronzeworking is in Iron Working's expansion, so this is a real dequeue
    // that takes a tail with it — the tree pass of 2026-08-30 moved Stonecraft
    // off that path.
    expect(dispatch(game, drop(0, 'bronzeWorking')).ok).toBe(true);
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

// ---------------------------------------------------------------------------

/**
 * The structural rulings of the tree, each pinned as the fact it is rather than
 * as a number that happened to come out right — the pass of 2026-08-30
 * (`docs/tech-tree.md` Part 1) and the **re-cut of 2026-09-02**
 * (`docs/tree-worksheet.md` revision 3, ledger Entry LVIII) on top of it. What
 * is on trial is the *shape*: ids that are forever, nodes deleted and their rows
 * re-homed, the ladders a unit climbs, and the tenth source that makes a
 * technology a card.
 */
describe('the shape of the tree', () => {
  it('keeps every surviving id, and names the ones the re-cut deleted', () => {
    // **Ids are forever**, and tree revision 4 (2026-09-02, the user's redraw)
    // is the pass that proves it: it renamed *fourteen* nodes and moved not one
    // id. Philosophy wears *Rhetoric*, The Imperial Post wears *Satrapies*,
    // Feudalism wears *Castellany*, Earthenware wears *Pottery*, Letters wears
    // *Writing*, Kingship wears *Code of Laws*, The Long Count wears
    // *Chronology*, The Cataphract wears *The Saddle*, Artisanry wears
    // *Guildhalls*, Colonial Charters wears *Daughter Cities*, Prospecting wears
    // *Geomancy*, The Qadi's Court wears *Divine Right*, Education wears
    // *Scholarship*, Physics wears *Natural Philosophy*, The Silk Road wears
    // *The Golden Roads* and Banking wears *The Counting Houses*. Every one of
    // them is still its own id, and a save that named one replays.
    for (const id of [
      'agriculture', 'husbandry', 'fletching', 'sailing', 'mining', 'earthenware',
      'bronzeWorking', 'stonecraft', 'calendar', 'divination', 'theWheel', 'letters',
      'ironWorking', 'mathematics', 'currency', 'philosophy',
      'theHighTemple', 'engineering', 'feudalism', 'machinery', 'theology',
      'steel', 'physics', 'education', 'theImperialPost',
      // And revision 4's own three, which are ids from this day forward.
      'stateWorkforce', 'raisedFields', 'militantOrders',
    ]) {
      expect(isTechId(id), id).toBe(true);
    }
    // **Calendar came back on 2026-09-02** (user: "keep what we had before").
    // Æra I is the pre-re-cut age wholesale — the twelve nodes, the old costs,
    // the old prerequisites, and the Hanging Gardens back on the Calendar the
    // re-cut had moved to Earthenware. It is the one row this list has ever
    // handed back, so it is named here rather than quietly deleted from the
    // pruned list below.
    //
    // The eleven rows the re-cut pruned that stayed pruned, plus Drama from the
    // pass before it. A v40 log that researched one of these is dead, which is
    // the schema bump's note in so many words.
    for (const id of [
      'drama', 'construction', 'theLegion', 'theSteppeBow',
      'theHalberdWall', 'standingStones', 'caravans', 'theKnottedCord',
      'theOrreryOfBronze', 'theDelugeRemembered', 'theFloatingFields',
      'theFirstDistillation',
      // And the three tree revision 4 cut, on the same terms as the Wave-1
      // prunings: their rows were re-homed (the great-person gate to The High
      // Temple, the knight and the Alhambra to Militant Orders, the Great Wall
      // to Satrapies, the bastion to nothing at all) and the ids are gone.
      'ancestorRites', 'chivalry', 'fortification',
    ]) {
      expect(isTechId(id), id).toBe(false);
    }
    expect(techDef('philosophy').name).toBe('Rhetoric');
    expect(techDef('theImperialPost').name).toBe('Satrapies');
    expect(techDef('feudalism').name).toBe('Castellany');
    expect(techDef('earthenware').name).toBe('Pottery');
    expect(techDef('letters').name).toBe('Writing');
    expect(techDef('kingship').name).toBe('Code of Laws');
    expect(techDef('theLongCount').name).toBe('Chronology');
    expect(techDef('theCataphract').name).toBe('The Saddle');
    expect(techDef('artisanry').name).toBe('Guildhalls');
    expect(techDef('colonialCharters').name).toBe('Daughter Cities');
    expect(techDef('prospecting').name).toBe('Geomancy');
    expect(techDef('theQadisCourt').name).toBe('Divine Right');
    expect(techDef('education').name).toBe('Scholarship');
    expect(techDef('physics').name).toBe('Natural Philosophy');
    expect(techDef('theSilkRoad').name).toBe('The Golden Roads');
    expect(techDef('banking').name).toBe('The Counting Houses');
    // Fifty nodes, and every one of them inside the lane budget.
    expect(TECH_IDS.length).toBe(50);
  });

  it('draws Æra I as the user drew it — twelve nodes, two gates, four columns', () => {
    // **Tree revision 4 (2026-09-02) re-hung the age**, and the redraw is the
    // authority: Agriculture fans into four, each of those four hands on to one
    // node, and the age closes on two gates — Writing (Divination + the
    // Calendar) and The Wheel (Bronzeworking + Stonecraft). Where the
    // restoration of the same morning had four two-parent gates, the user's
    // chart has two, and the age reads as two long lines meeting twice.
    const ageOne = TECH_IDS.filter((id) => techDef(id).age === 1);
    expect(ageOne.length).toBe(12);
    // The old costs are gone — a cost is the node's column now (see "prices
    // every node off its own column" above), and the user's anchors put the
    // age's four columns at 5 / 13 / 30 / 69 where the hand-tuned table had
    // 15 / 8 / 16 / 24-26. The age is therefore the same twelve nodes at rather
    // more than twice the price, which is the whole of why AEra I closes around
    // turn 46 rather than turn 34; what is asserted here is the *shape* of the
    // age, which is what the restoration was about.
    //
    // **The figures moved once more on 2026-09-02**, and only the figures: the
    // ladder was re-anchored at the first *paid* tier (the user: "the first tier
    // should be 13 science ... I think the agent skipped a tier"), so the four
    // columns each took the price of the column to their left. Fletching,
    // Mining, Earthenware and Husbandry — the four nodes a player actually
    // chooses between on turn one — are 13 apiece where they were 30, and
    // Agriculture's 5 is a number nobody ever pays: it is granted at the start
    // and the root is not a tier.
    //
    // The age's columns are 1 · 4 · 5 · 2 under the redraw, so the Calendar and
    // Divination came down a rung to 30 and only Writing and The Wheel pay the
    // 69. That last column of two is the user's own chart and is one of the two
    // named exceptions to "no column holds fewer than three".
    expect(Object.fromEntries(ageOne.map((id) => [id, techDef(id).cost]))).toEqual({
      agriculture: 5,
      husbandry: 13,
      fletching: 13,
      mining: 13,
      earthenware: 13,
      sailing: 30,
      bronzeWorking: 30,
      stonecraft: 30,
      divination: 30,
      calendar: 30,
      letters: 69,
      theWheel: 69,
    });
    // Four lines off the root, each one node long, and then the two gates. The
    // war line reads Fletching → Calendar, the sky line Husbandry → Divination,
    // the forge line Mining → Bronzeworking and the jar line Pottery →
    // Stonecraft (with Sailing beside it as the age's one leaf).
    expect(techDef('husbandry').prereqs).toEqual(['agriculture']);
    expect(techDef('fletching').prereqs).toEqual(['agriculture']);
    expect(techDef('mining').prereqs).toEqual(['agriculture']);
    expect(techDef('earthenware').prereqs).toEqual(['agriculture']);
    expect(techDef('divination').prereqs).toEqual(['husbandry']);
    expect(techDef('calendar').prereqs).toEqual(['fletching']);
    expect(techDef('bronzeWorking').prereqs).toEqual(['mining']);
    expect(techDef('stonecraft').prereqs).toEqual(['earthenware']);
    expect(techDef('sailing').prereqs).toEqual(['earthenware']);
    // And the two gates the age closes on.
    expect(techDef('letters').prereqs).toEqual(['divination', 'calendar']);
    expect(techDef('theWheel').prereqs).toEqual(['bronzeWorking', 'stonecraft']);
    // The old homes. The Hanging Gardens are the Calendar's again — named in
    // the ruling — and the tithes conversion came back with them off
    // Earthenware; the Temple of Artemis never left Husbandry.
    expect(BUILDING_UNLOCK_TECH.get('hangingGardens')).toBe('calendar');
    expect(BUILDING_UNLOCK_TECH.get('templeOfArtemis')).toBe('husbandry');
    expect(PROJECT_UNLOCK_TECH.get('tithes')).toBe('calendar');
    // The **rites** deliberately did not come back with them. A rite's home is
    // `RiteDef.tech` in `data/religion.json` and the religion table is the one
    // that owns it: the Rite of Plenty stays on Currency, where the re-cut put
    // it because the rite pays coin, and the omen read stays on Divination with
    // the rest of the faith door. A restoration that moved them would be the
    // tree quietly re-homing another table's rows.
    expect(techDef('calendar').unlocks.abilities).toBeUndefined();
    // Writing carries exactly one verb, and it is not a rite: the right of way
    // two empires may write into a bargain (schema 57). Pinned by name rather
    // than by "none", so a rite re-homed here would still fail this line.
    expect(techDef('letters').unlocks.abilities).toEqual(['openBorders']);
    expect(techDef('divination').unlocks.abilities).toEqual([
      'riteOfTheHarvest',
      'recastingTheOmens',
      'omenReading',
    ]);
    // The one row the restoration did *not* hand back, because it did not exist
    // to hand back: the Lighthouse is a Wave-1 building and stays on Sailing,
    // beside the Great Lighthouse it was written next to.
    expect(BUILDING_UNLOCK_TECH.get('lighthouse')).toBe('sailing');
    // And every Æra II node still names a parent that survived.
    for (const id of TECH_IDS) {
      for (const prereq of techDef(id).prereqs) expect(isTechId(prereq), `${id} → ${prereq}`).toBe(true);
    }
  });

  it("re-homes Drama's rows on Epic Poetry, and hangs Theology off The High Temple", () => {
    const gifts = techDef('epicPoetry').unlocks.buildings ?? [];
    expect(gifts).toContain('amphitheater');
    expect(gifts).toContain('theatreOfDionysus');
    // Unlocked once and by one node: a building gated twice is a building whose
    // gate depends on which node the player happened to take first.
    expect(BUILDING_UNLOCK_TECH.get('amphitheater')).toBe('epicPoetry');
    expect(BUILDING_UNLOCK_TECH.get('theatreOfDionysus')).toBe('epicPoetry');
    // **Tree revision 4 cut Ancestor Rites**, and the faith line runs off itself
    // one rung shorter: Writing → Epic Poetry → The High Temple → Rhetoric →
    // Theology → Scholarship → The Holy Office, every step of it exactly one
    // column. The temple stands on the verse now (the rites it used to stand on
    // are gone, and it has taken their great-person gate); Divine Right left the
    // faith line entirely and hangs off Guildhalls, which is where a court that
    // charters a guild belongs; and the Holy Office descends from Scholarship
    // and from that court, the printed page and the tribunal together.
    expect(techDef('theHighTemple').prereqs).toEqual(['epicPoetry']);
    expect(techDef('philosophy').prereqs).toEqual(['theHighTemple']);
    expect(techDef('theology').prereqs).toEqual(['philosophy']);
    expect(techDef('theQadisCourt').prereqs).toEqual(['artisanry']);
    expect(techDef('theHolyOffice').prereqs).toEqual(['education']);
    // The Hall of Deeds left the tree with the re-cut and kept its row, so a
    // save that raised one replays. Nothing unlocks it and nothing may build it.
    expect(BUILDING_UNLOCK_TECH.get('hallOfDeeds')).toBeUndefined();
  });

  it('re-chains the spear line, the melee line and the bow line', () => {
    // spearman → phalanx → halberd → pikeman, warrior → swordsman → legionary →
    // longswordsman, and archer → bowman → composite bowman → crossbowman. Read
    // off the rows, because `upgradeTargetFor` walks them and a chain with a
    // hole in it is a unit that stops improving.
    expect(unitDef('spearman').upgradesTo).toBe('phalanx');
    expect(unitDef('phalanx').upgradesTo).toBe('spearWall');
    expect(unitDef('spearWall').name).toBe('Spear Wall');
    expect(unitDef('spearWall').upgradesTo).toBe('pikeman');
    expect(unitDef('pikeman').upgradesTo).toBeUndefined();
    expect(unitDef('warrior').upgradesTo).toBe('swordsman');
    expect(unitDef('swordsman').upgradesTo).toBe('legionary');
    expect(unitDef('legionary').upgradesTo).toBe('longswordsman');
    expect(unitDef('archer').upgradesTo).toBe('bowman');
    expect(unitDef('bowman').upgradesTo).toBe('compositeBowman');
    expect(unitDef('compositeBowman').upgradesTo).toBe('crossbowman');
    // The iron rung is the legionary, not the sword: the tree does not name iron
    // until Iron Working, so the Æra II swordsman asks for none.
    expect(unitDef('swordsman').requiresResource).toBeUndefined();
    expect(unitDef('legionary').requiresResource).toBe('iron');
    // And no chain loops: every ladder ends.
    for (const id of UNIT_TYPE_IDS) {
      const seen = new Set<string>([id]);
      let at = unitDef(id).upgradesTo;
      while (at !== undefined) {
        expect(seen.has(at), `${id} loops at ${at}`).toBe(false);
        seen.add(at);
        at = unitDef(at).upgradesTo;
      }
    }
  });

  it('brings every hull home to its own age’s naval node', () => {
    const home: Record<string, string> = {
      trireme: 'sailing',
      bireme: 'wayfinding',
      warGalley: 'wayfinding',
      galley: 'shipwrights',
      towerShip: 'shipwrights',
      fireShip: 'shipwrights',
      caravel: 'theAstrolabe',
      carrack: 'theAstrolabe',
      gunGalley: 'theAstrolabe',
    };
    for (const [hull, tech] of Object.entries(home)) {
      expect(UNIT_UNLOCK_TECH.get(hull as never), hull).toBe(tech);
    }
    // The Æra V hulls still wait: their node has not been written.
    for (const hull of ['corvette', 'shipOfTheLine', 'frigate'] as const) {
      expect(UNIT_UNLOCK_TECH.get(hull), hull).toBeUndefined();
      expect(unitDef(hull).awaitsTech, hull).toBe(true);
    }
  });

  it('is liveEffects’ tenth source: a technology is a card, and folds like one', () => {
    // The fold identity every other source keeps: what `liveEffects` reports for
    // a node is exactly the node's own row, labelled, at level one — nothing
    // scaled, nothing re-derived.
    const state = flatState();
    const player = state.players[0]!;
    const held = TECH_IDS.filter((id) => (techDef(id).effects ?? []).length > 0);
    expect(held.length).toBeGreaterThan(0);

    // Nothing held, nothing said.
    const before = liveEffects(state, 0).filter((entry) => isTechId(entry.card));
    expect(before).toEqual([]);

    for (const id of held) grant(state, 0, id);
    const live = liveEffects(state, 0).filter((entry) => isTechId(entry.card));
    // One line per clause, in row order, in the order the technologies were
    // learnt — and never a `conditionRule`, which `liveEffects` flattens.
    const expected = held.flatMap((id) =>
      (techDef(id).effects ?? []).map((effect) => ({
        source: `Technology · ${techDef(id).name}`,
        card: id,
        effect,
      })),
    );
    expect(live).toEqual(expected);
    // And the lookup spans it: a tech id is a `CardId` and answers its own row.
    expect(anyCardDef('theImperialPost').name).toBe('Satrapies');
    expect(anyCardDef('theImperialPost').effects).toEqual(techDef('theImperialPost').effects);
    // The id spaces stay disjoint — no technology id is any other card's id.
    for (const id of TECH_IDS) {
      expect(isBuildingId(id), id).toBe(false);
      expect(isUnitTypeId(id), id).toBe(false);
    }
    void player;
  });

  it('pays Epic Poetry’s verse into the nearest city when a piece falls', () => {
    // The `death` occasion, which already existed and had no card on it. What
    // the node buys is a `windfallRider`, read by the ordinary evaluator, paid
    // by the ordinary seam — so the culture lands in the town nearest the body.
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    void city;
    const player = state.players[0]!;
    const bare = windfallPayout(state, 0, 'death');
    expect(bare.grants).toEqual([]);
    grant(state, 0, 'epicPoetry');
    const paid = windfallPayout(state, 0, 'death');
    expect(paid.grants.map((entry) => [entry.yield, entry.amount])).toEqual([['culture', 4]]);
    const before = player.culturePool;
    payWindfallGrants(state, player, paid, { col: 8, row: 5 });
    expect(player.culturePool).toBeGreaterThan(before);
  });
});
