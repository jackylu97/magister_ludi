/**
 * Typed access to `data/techs.json`.
 *
 * The fourth sibling of `terrainData.ts`, `unitData.ts` and `buildingData.ts`:
 * the JSON is the single source of truth for what a technology costs, what it
 * needs first and what it hands over, and this file only types it. No rule in
 * the simulation names a technology; they ask questions of this table instead.
 *
 * A tech is a package, not a gate
 * -------------------------------
 * Per Entry V of the design ledger every node is a *package* of real unlocks
 * with no connective-tissue filler, which is why `unlocks` is the whole of a
 * tech's effect and why there is no "does nothing but lead somewhere" node in
 * the file. A node that unlocked nothing would be a turn spent on a turn.
 *
 * Unlocks are the gate, read backwards
 * ------------------------------------
 * `unlocks` is written forwards — a tech lists what it enables — because that is
 * how a designer thinks about a tree and how the tech screen draws one. The
 * *question* the game asks is the other way round ("may this city build a
 * library?"), so `UNIT_UNLOCK_TECH` / `BUILDING_UNLOCK_TECH` invert the table
 * once, at module load, from the JSON's own order. Inverting rather than
 * duplicating is what keeps a unit from being gated by one tech and advertised
 * by another.
 *
 * Anything not named by *any* tech is ungated and buildable from turn one. That
 * is a deliberate escape hatch rather than an oversight: content lands before
 * its tech does, and a new unit that nobody can build until a data file catches
 * up is a unit nobody will notice is broken. `techDataProblems` reports which
 * ids are in that state so a test can decide whether it is intentional.
 *
 * `unlocks` is no longer the whole of what a node gives
 * ----------------------------------------------------
 * It was, until the Age I rework. Three other tables now name technologies from
 * their own side — a resource's `requiresTech`, an improvement's `requiresTech`
 * and its `upgrades[].tech`, a building's `upgrades[].tech` — so a node like
 * Mining hands over a real gift (the mine) while its `unlocks` block is empty.
 * Entry V's "every node is a package, no connective tissue" is therefore checked
 * against the *whole* gift list by `unlockDataProblems` (`techUnlocks.ts`),
 * which is the module that can see all four tables. This file no longer has an
 * opinion about it, because from here an empty `unlocks` is unreadable.
 *
 * Ages
 * ----
 * `age` is 1, 2, 3 or 4 (Omens, Heroes, Empire, Cathedrals — the tech screen
 * sets them as ÆRA I…IV). Æra V (Magister) is written in `docs/tech-tree.md` and
 * is deliberately **not** in `TECH_AGES` until it has nodes: an age no
 * technology belongs to is a payoff that can never arrive, and `resourceData.ts`
 * is right to refuse a luxury tier gated on one.
 *
 * It is a display and pacing fact rather than a rule: no mechanic reads it,
 * prerequisites do the ordering, and the integrity check only insists that a
 * tech never depends on a *later* age than its own. The chart paints ages as
 * background regions behind whatever columns their techs happen to occupy (see
 * `techAgeBands`) — an age annotates a position, it never sets one.
 *
 * What *is* keyed by it, and moved with the 2026-08-30 renumbering: the unit
 * cost band (`rules.production.unitCostAgeMultiplier`, a fourth rung), a unit's
 * and a building's upkeep, authority capacity per advance, the glass-bead decks
 * (`BeadAge`), the great-person roster (`rosterAgeFor`), a luxury tier's
 * `fromAge`, a windfall rider's `perAge`, the barbarians' median tier and a
 * town's sculpt (clamped at three, which is what the clamp was always for).
 *
 * Where a tech sits on the chart
 * ------------------------------
 * The star chart is a dependency chart that scrolls sideways, so a node's
 * *column* is a fact about the graph and its *row* is a fact about the data:
 *
 *   - column = `techDepth`, the length of the longest prerequisite chain behind
 *     it. This is derived, never authored, which is what guarantees a chain
 *     reads as a chain — bronze working, iron working, steel march rightward
 *     because each one is strictly deeper than the last, and an edge can never
 *     point backwards.
 *   - `row` is hand-authored in `data/techs.json`. There is no automatic
 *     row-assignment algorithm: a sugiyama-style solver would re-shuffle the
 *     lanes every time a tech was added, and a tree whose shape a player has
 *     learnt is worth more than a tree with two fewer line crossings.
 *
 * The lane principle (re-authored 2026-08-26)
 * -------------------------------------------
 * Hand-laid, but not arbitrary. Four rules, in priority order, and the Age 2–5
 * pass should author new rows the same way:
 *
 *   1. **A lane is a line of work, and it is five lanes wide.** `0 … 4`
 *      (`TECH_LANE_LIMIT`), because the widest column holds five techs and a
 *      chart deeper than its deepest column is height nobody needs — the old
 *      seven-lane sky put Divination below the bottom of a 900px window.
 *   2. **A tech sits in the lane of the prerequisite whose line it continues.**
 *      Usually the first one listed, which is why `prereqs` order is display
 *      order. Iron Working continues Bronzeworking's line; Chivalry continues
 *      Feudalism's.
 *   3. **A tech with two prerequisites in different lanes sits between them**,
 *      so the two connectors fan in symmetrically rather than one running flat
 *      and the other diving. Stonecraft sits between Husbandry and Earthenware;
 *      Mathematics between Letters and The Wheel.
 *   4. **A leaf goes wherever it keeps the fan even.** Sailing and Calendar hand
 *      nothing on, so they are the free pieces that let the rest sit straight.
 *
 * And one prohibition that outranks a crossing: **never let a connector run flat
 * through a node that is not on the path it joins.** Two techs a lane apart
 * crossing is a line a player can follow with a finger; a line entering one card
 * and leaving the other side reads as a prerequisite that does not exist.
 *
 * What it bought in 2026-08-26: 24 connector crossings → 11, seven lanes → five,
 * and the Age I corner from 7 crossings to **1** — which `chartCrossings` and a
 * brute force over every five-lane arrangement say is the *minimum*: Age I's own
 * subgraph cannot be drawn flat, at any lane count.
 *
 * The tree pass of 2026-08-30 (fifty-three nodes where there were twenty-six)
 * re-laid the rest of the sky under the same four rules, and the honest thing to
 * say about the result is that a chart four times as dense crosses more: the
 * measured figures are in `test/ui/techChart.test.ts`, against a baseline that
 * is the same graph dealt naively into the same five lanes. **Zero false
 * chains** is the claim that did not move, and it is the one that outranks a
 * crossing. The counter is here rather than in a test so that a future re-lay
 * can be checked rather than eyeballed.
 *
 * The tree is now **twelve columns of exactly five** — the root's column holds
 * Agriculture alone and the last holds the two deepest Æra IV nodes — and that
 * is not luck: the prerequisites were chained deliberately until each rung was
 * five wide, which is also what makes each age read as three or four rungs
 * rather than as one wide fan. Five lanes is a *height* budget and a fifty-three
 * node fan would have wanted eleven of them.
 *
 * `techDataProblems` insists every tech has a row inside `TECH_LANE_LIMIT` and
 * that no two share a (column, row) cell, which is the whole failure mode
 * hand-authoring has — and the lanes themselves are a searched layout now
 * (crossings, false chains and lane-continuation measured, not eyeballed),
 * written into `data/techs.json` as ordinary authored rows.
 */

import techsJson from '../../data/techs.json';
import { type BuildingId, isBuildingId } from './buildingData';
// Type-only, and it must stay that way in both directions: `statecraftData.ts`
// imports `TechId` from here for `CardId`'s tenth class, and a *value* import
// either way would turn a type cycle into a runtime one. The same bargain
// `religionData.ts` and `beadData.ts` already keep with that file.
import type { CardEffect } from './statecraftData';
import { type ProjectId, isProjectId } from './projectData';
import { type UnitTypeId, isUnitTypeId } from './unitData';

export type TechId =
  // Æra I — The Age of Omens
  | 'agriculture'
  | 'husbandry'
  | 'fletching'
  | 'sailing'
  | 'mining'
  | 'earthenware'
  | 'bronzeWorking'
  | 'stonecraft'
  | 'calendar'
  | 'divination'
  | 'theWheel'
  | 'letters'
  // Æra II — The Age of Heroes
  | 'theDelugeRemembered'
  | 'irrigation'
  | 'standingStones'
  | 'wayfinding'
  | 'kingship'
  | 'ancestorRites'
  | 'theHighTemple'
  | 'caravans'
  | 'bronzePanoply'
  | 'epicPoetry'
  | 'theLongCount'
  | 'currency'
  // Æra III — The Age of Empire
  | 'construction'
  | 'theSteppeBow'
  | 'ironWorking'
  | 'theExaminationHall'
  | 'mathematics'
  | 'philosophy'
  | 'colonialCharters'
  | 'theLegion'
  | 'theOrreryOfBronze'
  | 'engineering'
  | 'theCataphract'
  | 'theHalberdWall'
  | 'theImperialPost'
  | 'shipwrights'
  | 'theQadisCourt'
  | 'education'
  | 'theKnottedCord'
  // Æra IV — The Age of Cathedrals
  | 'theology'
  | 'feudalism'
  | 'machinery'
  | 'theSilkRoad'
  | 'physics'
  | 'theFloatingFields'
  | 'movableType'
  | 'chivalry'
  | 'steel'
  | 'theAstrolabe'
  | 'paperMoney'
  | 'theFirstDistillation';

/**
 * Omens, Heroes, Empire, Cathedrals. The fifth age (Magister) arrives with its
 * own content; nothing here reserves a number for it, because a `TECH_AGES`
 * entry no technology belongs to is a payoff that can never arrive
 * (`resourceData.ts` refuses one, and would be right to).
 */
export type TechAge = 1 | 2 | 3 | 4;

/**
 * Every age, in order. Written down beside the type because a *value* is what a
 * validator needs: `resourceData.ts` refuses a luxury tier gated on an age no
 * technology has, which would otherwise be a payoff that can never arrive and
 * would fail as silence rather than as an error.
 */
export const TECH_AGES: readonly TechAge[] = [1, 2, 3, 4];

/**
 * A *verb* a technology hands an empire, as opposed to a thing it may make.
 *
 * The union is the register: an ability is a rule somewhere in the simulation
 * asking `hasAbility`, so a row here with no reader is a promise the game never
 * keeps, and a reader with no row is a rule no node hands over. `ABILITY_TECH`
 * is the inversion `pathfind.ts` and `religion.ts` both ask.
 *
 * **The five rites are abilities** (ledger Entry XXVIII), and that is the key
 * doing exactly the job it was built for: a rite is a *verb* an augur may
 * perform, it has no row in any other table, and hanging it here means the tech
 * screen shows it as a gift the way it shows embarkation. Each id is also the
 * rite's id in `data/religion.json` — one string, one name to get wrong instead
 * of two (`riteAbility`).
 */
export type AbilityId =
  | 'embark'
  | 'riteOfTheHarvest'
  | 'omenReading'
  | 'consecrationOfTheBounds'
  | 'blessingOfArms'
  | 'riteOfPlenty'
  | 'recastingTheOmens'
  | 'thePreaching'
  /**
   * **The great-person offer opens at all** (the tree pass of 2026-08-30).
   *
   * Renown gathers from the first turn — the buildings pay their trickle, a
   * wonder pays its lump — and until an empire keeps the rites nobody answers
   * it. Read in exactly one place, `settleRenownWindfall` (`renown.ts`), which
   * is the one seam an offer is ever opened at, so the gate is a lookup rather
   * than a clause repeated at three call sites.
   */
  | 'ancestorRites'
  /**
   * Soldiers may take to the water. Sailing's `embark` is civilians and the
   * scout; this is the next step of that same rule and is read in the same
   * place (`moveProfile`), which is why it is a second verb rather than a
   * second field on the first.
   */
  | 'militaryEmbark'
  /**
   * The **next age's glass beads are shown a turn before that age opens**. Read
   * by `beads.ts` and nowhere else.
   */
  | 'theLongCount'
  /**
   * The **deep ocean is crossable** — by a hull, and by anything embarked.
   *
   * `embark`'s widening one sea further out, and read at the same seam
   * (`tileMoveCost`, through `MoveProfile`), so the four readers of `stepCost`
   * inherit it by construction and no highlight can promise a crossing the
   * walk will not make.
   */
  | 'oceanGoing';

/** What an ability is *called*, for the surfaces that print it. Flavour only. */
export interface AbilityDef {
  name: string;
  /** The mark the star chart centres it on, like a tech's own `glyph`. */
  glyph: string;
  /** One line of what it lets an empire do. */
  summary: string;
}

/** What a technology hands over. Every list is optional; at least one is not. */
export interface TechUnlocks {
  units?: UnitTypeId[];
  buildings?: BuildingId[];
  /**
   * Repeatable queue items (Entry XXVI). The third `unlocks` key and the same
   * shape as the other two, so a project's gate is edited where a building's
   * is and the inversion below needed one more call rather than a new idea.
   */
  projects?: ProjectId[];
  /**
   * Verbs (`AbilityId`). The fourth key, and the only one whose gift is not a
   * row in some other table: embarkation is a *rule*, so what the tree can name
   * is the rule's id and what says it out loud is `data/techs.json`'s own
   * `abilities` block. Inverted into `ABILITY_TECH` below, exactly as the three
   * above are, so "may this empire embark" is one lookup rather than a tech id
   * spelled into `pathfind.ts`.
   */
  abilities?: AbilityId[];
}

export interface TechDef {
  name: string;
  /**
   * The single character the star chart's dial and node cards centre a tech
   * on — the same role a unit's `glyph` plays on its disc (see
   * `renderUnlocks` in `techTree.ts`). Required and hand-chosen per tech
   * rather than derived, because there is no rule that could pick one.
   */
  glyph: string;
  age: TechAge;
  /**
   * The lane this tech sits in on the star chart, hand-authored: 0 is the top
   * lane. Purely presentational — the column is derived (`techDepth`).
   */
  row: number;
  /** Beakers to complete. Age-banded; see the pacing note in `tech.ts`. */
  cost: number;
  /** Every tech that must already be researched. Order is display order. */
  prereqs: TechId[];
  unlocks: TechUnlocks;
  /**
   * Card effects the empire holds for as long as it holds the technology —
   * `liveEffects`' **tenth** source, "the technologies you hold".
   *
   * The same vocabulary a belief, an Order, a wonder and a great person's
   * legacy are written in, read by the same evaluator (`statecraft.ts` is still
   * the only module that switches on a `CardEffect.kind`), so a node whose gift
   * is a *rule* rather than a thing is a JSON row and not a branch. Epic
   * Poetry's fallen-become-verse is a `windfallRider` on the death occasion;
   * The Qadi's Court's mercy to a seized town is a `meterRule`; Colonial
   * Charters' cheaper settlers are the `settlerCost` `rulePercent` two Orders
   * already use.
   *
   * A node whose ratified text needs a shape the vocabulary lacks says so in
   * `deferred` and ships the halves it can — the Statecraft rule, for the
   * fourth time.
   */
  effects?: CardEffect[];
  /** One-line epigram for the tech screen. Flavour only. */
  flavor?: string;
  /**
   * What this node's gift needs that the game has not built yet, in a player's
   * words. Printed as an honest caveat, exactly as a card's is.
   */
  deferred?: string[];
  /** What the node's rules mean, in plain words. Printed under the gifts. */
  note?: string;
}

export interface TechData {
  techs: Record<TechId, TechDef>;
  /**
   * What each verb is called. A sibling block rather than a row inside `techs`
   * for `improvements.json`'s `chop` reason: an ability is not the same *shape*
   * as a technology — it has no cost, no prereqs and no place on the chart — and
   * filing it as one would have meant four fields nobody could fill in.
   */
  abilities: Record<AbilityId, AbilityDef>;
}

export const TECH_DATA: TechData = techsJson as TechData;

/** Every tech id, in file order — which is the order the screen lays them out. */
export const TECH_IDS = Object.keys(TECH_DATA.techs) as TechId[];

export function techDef(id: TechId): TechDef {
  return TECH_DATA.techs[id];
}

/**
 * Runtime guard. A tech id arrives in a `chooseResearch` command, i.e. from a
 * save file or (eventually) a socket, so it may be any string at all.
 */
export function isTechId(value: unknown): value is TechId {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(TECH_DATA.techs, value)
  );
}

// --- the inverted table -----------------------------------------------------

function invert<T extends string>(pick: (unlocks: TechUnlocks) => T[] | undefined): Map<T, TechId> {
  const index = new Map<T, TechId>();
  for (const id of TECH_IDS) {
    for (const unlocked of pick(techDef(id).unlocks) ?? []) {
      // First writer wins, and `techDataProblems` reports a second one: two
      // techs unlocking the same thing is a data bug, not a feature.
      if (!index.has(unlocked)) index.set(unlocked, id);
    }
  }
  return index;
}

/** Which tech enables each unit type. Absent means "buildable from turn one". */
export const UNIT_UNLOCK_TECH: ReadonlyMap<UnitTypeId, TechId> = invert(
  (unlocks) => unlocks.units,
);

/** Which tech enables each building. Absent means "buildable from turn one". */
export const BUILDING_UNLOCK_TECH: ReadonlyMap<BuildingId, TechId> = invert(
  (unlocks) => unlocks.buildings,
);

/**
 * Which tech enables each project. Absent would mean "from turn one", and
 * deliberately no row is: a conversion available on turn one is a capital that
 * never has to choose what to do with its hammers.
 */
export const PROJECT_UNLOCK_TECH: ReadonlyMap<ProjectId, TechId> = invert(
  (unlocks) => unlocks.projects,
);

/**
 * Which tech hands over each verb. **The** register for "may this empire do
 * that", and the reason no rule in the simulation names a technology by hand:
 * `hasAbility` (`tech.ts`) is one lookup here plus one `hasTech`, so moving
 * embarkation to a different node is one line of `data/techs.json`.
 *
 * Every `AbilityId` has a row — an ability no node hands over is a rule that can
 * never fire — and `techDataProblems` says so rather than leaving it as silence.
 */
export const ABILITY_TECH: ReadonlyMap<AbilityId, TechId> = invert(
  (unlocks) => unlocks.abilities,
);

/** Every ability id, in the order the table lists them. Iteration order. */
export const ABILITY_IDS = Object.keys(TECH_DATA.abilities) as AbilityId[];

export function abilityDef(id: AbilityId): AbilityDef {
  return TECH_DATA.abilities[id];
}

/**
 * Does an empire holding these technologies have this verb?
 *
 * **The** rule, and it takes the tech *list* rather than a `GameState` for
 * exactly `resourceIsVisibleTo`'s reason: the only question is "is the gate in
 * hand", and a signature that needed the whole world would drag this table into
 * a cycle with the modules that read it — `pathfind.ts` is downstream of
 * `cities.ts`, which is downstream of `tech.ts`, so the movement evaluator
 * cannot ask a research module anything. `hasAbility` (`tech.ts`) is the
 * state-flavoured wrapper for everyone who is not in that bind.
 */
export function techsGrant(techs: readonly TechId[], ability: AbilityId): boolean {
  const gate = ABILITY_TECH.get(ability);
  return gate !== undefined && techs.includes(gate);
}

// --- the chart's geometry ---------------------------------------------------

/**
 * Longest-prerequisite-chain depth, one entry per tech, relaxed rather than
 * recursed.
 *
 * A depth-first walk would be shorter to write and would stack-overflow on a
 * cyclic file instead of reporting it; this peels the same way `cyclicTechs`
 * does — every pass lifts each tech to one past its deepest prerequisite, and a
 * DAG settles in at most one pass per tech. The bound is therefore also the
 * cycle guard: a cyclic file stops climbing and gets caught by
 * `techDataProblems`, which is the file that is *allowed* to complain.
 */
function computeDepths(): Map<TechId, number> {
  const depth = new Map<TechId, number>(TECH_IDS.map((id) => [id, 0]));
  for (let pass = 0; pass < TECH_IDS.length; pass++) {
    let changed = false;
    for (const id of TECH_IDS) {
      let want = 0;
      for (const prereq of techDef(id).prereqs) {
        if (!isTechId(prereq)) continue;
        want = Math.max(want, (depth.get(prereq) ?? 0) + 1);
      }
      if (want === depth.get(id)) continue;
      depth.set(id, want);
      changed = true;
    }
    if (!changed) break;
  }
  return depth;
}

let depths: Map<TechId, number> | null = null;

/**
 * The chart column a tech belongs in: the length of the longest chain of
 * prerequisites behind it. Roots are 0.
 *
 * This is the one guarantee the drawing code leans on — a prerequisite is
 * always in a strictly earlier column than the tech that needs it — so every
 * connector runs left to right and no edge ever doubles back on itself.
 */
export function techDepth(id: TechId): number {
  depths ??= computeDepths();
  return depths.get(id) ?? 0;
}

/** How many columns the chart is wide. */
export function techColumnCount(): number {
  return TECH_IDS.reduce((widest, id) => Math.max(widest, techDepth(id) + 1), 0);
}

/** How many lanes the chart is deep, from the authored rows. */
export function techRowCount(): number {
  return TECH_IDS.reduce((deepest, id) => Math.max(deepest, techDef(id).row + 1), 0);
}

/**
 * How many lanes the sky is allowed to be: rows `0 … TECH_LANE_LIMIT - 1`.
 *
 * Five, and it is a *height* budget rather than a taste: the widest column holds
 * five techs, so five is the floor, and every lane past it is a lane the player
 * has to travel to. The seven-lane chart this replaced put its bottom lane below
 * the fold of a 900px window. A sixth lane is not forbidden by arithmetic —
 * `techDataProblems` is what forbids it, so that adding one is a decision
 * somebody makes rather than a row somebody types.
 */
export const TECH_LANE_LIMIT = 5;

/** Where a node sits on the chart: its dependency column and its lane. */
export interface ChartCell {
  column: number;
  row: number;
}

/**
 * A chart to count crossings in — the cells, and the connectors between them.
 *
 * Deliberately keyed by plain `string` rather than `TechId`: the point of a
 * layout metric is to compare the layout in the file against ones that are not
 * in the file (the arrangement before a re-lay, a hand-drawn candidate, a
 * deliberately terrible one), and a test cannot build those out of ids the type
 * only admits after they have been shipped.
 */
export interface ChartLayout {
  cells: ReadonlyMap<string, ChartCell>;
  /** One entry per prerequisite edge, prerequisite first. */
  edges: readonly (readonly [string, string])[];
}

/** The chart as `data/techs.json` currently lays it out, or a slice of it. */
export function techChartLayout(includes?: (id: TechId) => boolean): ChartLayout {
  const shown = TECH_IDS.filter((id) => includes?.(id) ?? true);
  const inside = new Set<TechId>(shown);
  const cells = new Map<string, ChartCell>(
    shown.map((id) => [id, { column: techDepth(id), row: techDef(id).row }]),
  );
  const edges: [string, string][] = [];
  // Iterated over `shown` rather than the map, so the edge list is file order
  // and two runs of this function are byte-identical.
  for (const id of shown) {
    for (const prereq of techDef(id).prereqs) {
      if (inside.has(prereq)) edges.push([prereq, id]);
    }
  }
  return { cells, edges };
}

/** Which side of the line `a`→`b` the point `c` falls on. Zero is *on* it. */
function side(a: ChartCell, b: ChartCell, c: ChartCell): number {
  return (b.column - a.column) * (c.row - a.row) - (b.row - a.row) * (c.column - a.column);
}

/**
 * How many pairs of connectors cross, treating each connector as the straight
 * segment between the two cells it joins.
 *
 * Straight, though the chart draws cubics: the curve is a bezier with horizontal
 * handles between the same two endpoints, so it stays inside the same corridor
 * and crosses the same neighbours — a metric that modelled the curve exactly
 * would answer a different question every time the handle cap was tuned.
 *
 * Only *proper* crossings count: two connectors out of one node, or into one
 * node, meet at that node and are a fan rather than a tangle, so any pair
 * sharing an endpoint is skipped. Everything else is the standard orientation
 * test, which is exact here because every coordinate is a small integer.
 */
export function chartCrossings(layout: ChartLayout): number {
  const at = (id: string): ChartCell | undefined => layout.cells.get(id);
  let crossings = 0;
  for (let i = 0; i < layout.edges.length; i++) {
    const [a1, b1] = layout.edges[i];
    const p1 = at(a1);
    const p2 = at(b1);
    if (!p1 || !p2) continue;
    for (let j = i + 1; j < layout.edges.length; j++) {
      const [a2, b2] = layout.edges[j];
      if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
      const p3 = at(a2);
      const p4 = at(b2);
      if (!p3 || !p4) continue;
      const d1 = side(p3, p4, p1);
      const d2 = side(p3, p4, p2);
      const d3 = side(p1, p2, p3);
      const d4 = side(p1, p2, p4);
      const straddles =
        ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
      if (straddles) crossings++;
    }
  }
  return crossings;
}

/**
 * Connectors that run flat through a node they have nothing to do with — the
 * one layout fault the lane principle ranks above a crossing, because it draws
 * a prerequisite that does not exist.
 *
 * A pass *is* allowed when the node in the way is genuinely on a path between
 * the two ends: Philosophy → Education runs through Theology, and Philosophy →
 * Drama → Theology → Education is a real chain, so the line reads as the truth.
 * Only flat connectors are examined; a diagonal that clips a card disappears
 * under it and comes out somewhere the eye does not follow.
 */
export function chartFalseChains(layout: ChartLayout): string[] {
  const found: string[] = [];
  const ancestors = new Map<string, Set<string>>();
  const behind = (id: string): Set<string> => {
    const known = ancestors.get(id);
    if (known) return known;
    const all = new Set<string>();
    ancestors.set(id, all);
    for (const [from, to] of layout.edges) {
      if (to !== id) continue;
      all.add(from);
      for (const older of behind(from)) all.add(older);
    }
    return all;
  };

  for (const [from, to] of layout.edges) {
    const start = layout.cells.get(from);
    const end = layout.cells.get(to);
    if (!start || !end || start.row !== end.row) continue;
    const low = Math.min(start.column, end.column);
    const high = Math.max(start.column, end.column);
    for (const [id, cell] of layout.cells) {
      if (id === from || id === to) continue;
      if (cell.row !== start.row || cell.column <= low || cell.column >= high) continue;
      if (behind(id).has(from) && behind(to).has(id)) continue;
      found.push(`${from} → ${to} runs through ${id}`);
    }
  }
  return found;
}

/**
 * The age an empire holding these technologies has *reached*: the highest age
 * any of them belongs to.
 *
 * **The** age derivation, and there is deliberately only one. An age was pure
 * chart furniture until Milestone 10 — `techAgeBands` paints numerals behind
 * columns — and authority capacity needs the same fact about a *player*, so it
 * is written here, over the list of technologies, rather than a second time
 * beside the meter. Its one caller is `agesAdvanced` (`meters.ts`), which counts
 * *advances* (`age − 1`) because Entry I prices the advance and not the age
 * every game begins standing in; anything else that ever needs a player's age
 * asks this, with `Player.techsResearched`.
 *
 * The highest rather than the deepest: a player who has skipped ahead into a
 * Classical node has reached the Classical age whatever else they left behind,
 * which is the reading a player would give it looking at their own tree. Ages
 * therefore only ever climb — `techsResearched` is append-only, and the tech
 * table forbids a prerequisite from a later age than its dependent.
 */
export function highestAge(techs: readonly TechId[]): TechAge {
  let highest: TechAge = 1;
  for (const id of techs) {
    if (!isTechId(id)) continue;
    const { age } = techDef(id);
    if (age > highest) highest = age;
  }
  return highest;
}

/**
 * An age as its numeral — `1` → `"I"`, `4` → `"IV"`.
 *
 * Written here, beside `TechAge`, because four ledger lines in `src/sim/` quote
 * an era in words (`explainUnitCost`'s band, `explainAuthority`'s advance, a
 * windfall rider's era note, a luxury tier's `ageLabel`) and all four spelled it
 * `'I'.repeat(age)` — which was exactly right for three ages and prints
 * **IIII** for the fourth. One derivation, so a fifth age is one table entry and
 * not four bugs. The interface has its own (`eraWord` in `figures.ts`) because
 * it prefixes the word *Æra*; the two agree by construction on the numeral.
 */
const ROMAN: readonly (readonly [number, string])[] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function eraNumeral(age: number): string {
  let left = Math.max(1, Math.round(age));
  let out = '';
  for (const [value, mark] of ROMAN) {
    while (left >= value) {
      out += mark;
      left -= value;
    }
  }
  return out;
}

/** A run of columns painted with one age's numeral. `to` is inclusive. */
export interface TechAgeBand {
  age: TechAge;
  from: number;
  to: number;
}

/**
 * The columns each age owns, as contiguous runs.
 *
 * Ages and depths disagree at the seams — The Wheel is Ancient but sits as deep
 * as three Classical techs — so a band cannot simply be "the columns this age's
 * techs occupy" without overlapping its neighbours. Each column instead takes
 * the age *most* of its techs belong to (ties to the earlier age, so a seam
 * column stays with the age it grew out of), the result is forced to never run
 * backwards, and equal neighbours merge. The bands that come out are therefore
 * always contiguous, in order, and cover every column exactly once — which is
 * what lets the chart paint them as background regions.
 */
export function techAgeBands(): TechAgeBand[] {
  const columns = techColumnCount();
  const bands: TechAgeBand[] = [];
  let previous: TechAge = 1;

  for (let column = 0; column < columns; column++) {
    const tally: Record<TechAge, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const id of TECH_IDS) {
      if (techDepth(id) !== column) continue;
      const { age } = techDef(id);
      if (TECH_AGES.includes(age)) tally[age]++;
    }
    // Ascending order plus a strict `>` is the tie-break: an even split stays
    // with the earlier age. An empty column (only possible in a half-written
    // file) inherits the column before it.
    let best: TechAge | null = null;
    for (const candidate of TECH_AGES) {
      if (tally[candidate] === 0) continue;
      if (best === null || tally[candidate] > tally[best]) best = candidate;
    }
    const age: TechAge = best === null || best < previous ? previous : best;
    previous = age;

    const last = bands[bands.length - 1];
    if (last && last.age === age) last.to = column;
    else bands.push({ age, from: column, to: column });
  }
  return bands;
}

// --- integrity --------------------------------------------------------------

/**
 * Every way `data/techs.json` can be wrong, as human-readable lines. Empty means
 * consistent.
 *
 * The sibling of `manifestProblems` in `src/render/spriteManifest.ts`, and here
 * for the same reason: a tree with a cycle, a dangling prerequisite or an unlock
 * naming a unit that does not exist is a data mistake that would otherwise
 * surface as a tech nobody can research, ten turns into somebody's game.
 */
export function techDataProblems(): string[] {
  const problems: string[] = [];

  for (const id of TECH_IDS) {
    const def = techDef(id);
    if (!TECH_AGES.includes(def.age)) {
      problems.push(
        `tech "${id}" has age ${String(def.age)}, which is not one of ${TECH_AGES.join(', ')}`,
      );
    }
    if (!(def.cost > 0)) problems.push(`tech "${id}" costs ${String(def.cost)} beakers`);
    // The dial and the node card both centre on this character; a tech
    // without one would draw an empty circle where the glyph belongs.
    if (typeof def.glyph !== 'string' || def.glyph.length === 0) {
      problems.push(`tech "${id}" has no glyph`);
    }
    // The chart cannot place a tech without a lane, and two techs in one cell
    // would draw one on top of the other — both are silent on screen, so they
    // are loud here.
    if (!Number.isInteger(def.row) || def.row < 0) {
      problems.push(`tech "${id}" has row ${String(def.row)}, which is not a lane number`);
    } else if (def.row >= TECH_LANE_LIMIT) {
      // The height budget, enforced where the rest of the file's hand-authoring
      // faults are. See `TECH_LANE_LIMIT`: a sixth lane is a decision, not a
      // typo, and this is where somebody has to come and make it.
      problems.push(
        `tech "${id}" sits in lane ${def.row}, past the ${TECH_LANE_LIMIT}-lane chart (0…${TECH_LANE_LIMIT - 1})`,
      );
    }

    for (const prereq of def.prereqs) {
      if (!isTechId(prereq)) {
        problems.push(`tech "${id}" requires "${prereq}", which is not a tech`);
        continue;
      }
      if (techDef(prereq).age > def.age) {
        problems.push(`tech "${id}" (age ${def.age}) requires a tech from age ${techDef(prereq).age}`);
      }
    }

    // Whether a node hands over *anything* is `unlockDataProblems`'s question
    // now: three other tables gate on a technology and none of them is visible
    // from here. See the docblock.
    const units = def.unlocks.units ?? [];
    const buildings = def.unlocks.buildings ?? [];
    for (const unit of units) {
      if (!isUnitTypeId(unit)) problems.push(`tech "${id}" unlocks unit "${unit}", which does not exist`);
      else if (UNIT_UNLOCK_TECH.get(unit) !== id) {
        problems.push(`unit "${unit}" is unlocked by both "${UNIT_UNLOCK_TECH.get(unit)}" and "${id}"`);
      }
    }
    for (const building of buildings) {
      if (!isBuildingId(building)) {
        problems.push(`tech "${id}" unlocks building "${building}", which does not exist`);
      } else if (BUILDING_UNLOCK_TECH.get(building) !== id) {
        problems.push(
          `building "${building}" is unlocked by both "${BUILDING_UNLOCK_TECH.get(building)}" and "${id}"`,
        );
      }
    }
    for (const project of def.unlocks.projects ?? []) {
      if (!isProjectId(project)) {
        problems.push(`tech "${id}" unlocks project "${project}", which does not exist`);
      } else if (PROJECT_UNLOCK_TECH.get(project) !== id) {
        problems.push(
          `project "${project}" is unlocked by both "${PROJECT_UNLOCK_TECH.get(project)}" and "${id}"`,
        );
      }
    }
    for (const ability of def.unlocks.abilities ?? []) {
      if (!Object.prototype.hasOwnProperty.call(TECH_DATA.abilities, ability)) {
        problems.push(`tech "${id}" unlocks ability "${ability}", which the table does not name`);
      } else if (ABILITY_TECH.get(ability) !== id) {
        problems.push(
          `ability "${ability}" is unlocked by both "${ABILITY_TECH.get(ability)}" and "${id}"`,
        );
      }
    }
  }

  // An ability nothing hands over is a rule that can never fire, which is
  // exactly the quiet-nothing the rest of this function refuses.
  for (const ability of ABILITY_IDS) {
    if (!ABILITY_TECH.has(ability)) {
      problems.push(`ability "${ability}" is handed over by no technology`);
    }
    const def = abilityDef(ability);
    if (typeof def.glyph !== 'string' || def.glyph.length === 0) {
      problems.push(`ability "${ability}" has no glyph`);
    }
  }

  for (const id of cyclicTechs()) problems.push(`tech "${id}" is part of a prerequisite cycle`);

  const occupied = new Map<string, TechId>();
  for (const id of TECH_IDS) {
    const cell = `${techDepth(id)},${techDef(id).row}`;
    const sitting = occupied.get(cell);
    if (sitting !== undefined) {
      problems.push(`techs "${sitting}" and "${id}" both sit at chart cell (${cell})`);
      continue;
    }
    occupied.set(cell, id);
  }
  return problems;
}

/**
 * Techs that can never be researched because their prerequisites eventually
 * depend on them. A Kahn-style peel: whatever is left when nothing more can be
 * satisfied is exactly the cyclic remainder.
 */
function cyclicTechs(): TechId[] {
  const settled = new Set<TechId>();
  let progress = true;
  while (progress) {
    progress = false;
    for (const id of TECH_IDS) {
      if (settled.has(id)) continue;
      const ready = techDef(id).prereqs.every((prereq) => settled.has(prereq));
      if (!ready) continue;
      settled.add(id);
      progress = true;
    }
  }
  return TECH_IDS.filter((id) => !settled.has(id));
}
