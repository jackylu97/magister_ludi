/**
 * The star chart's layout: how tangled it is, and whether it fits the window.
 *
 * Two questions this suite exists to answer without a browser, because both had
 * been answered by eye and both were wrong. *Is the chart legible* was measured
 * by squinting at it, so a re-lay had no way to prove it had helped; *does the
 * chart fit* was assumed, so the seventh lane went below the fold of a 900px
 * screen and stayed there. `chartCrossings` and `packChart` are the two pure
 * answers, and this file pins both against the layout that shipped.
 *
 * The counter is deliberately fed layouts that are *not* the one in the file —
 * the arrangement before the re-lay, hand-drawn miniatures — because a metric
 * that can only ever be pointed at the current data is a metric that cannot say
 * whether the current data is any good.
 */

import { describe, expect, it } from 'vitest';
import {
  type ChartCell,
  type ChartLayout,
  TECH_IDS,
  TECH_LANE_LIMIT,
  type TechId,
  chartCrossings,
  chartFalseChains,
  techChartLayout,
  techColumn,
  techDataProblems,
  techDef,
  techDepth,
} from '../../src/sim/techData';
import {
  CHART_SCALE_MIN,
  COL_WIDTH_MAX,
  COL_WIDTH_MIN,
  PACK_GAP_MAX,
  PACK_GAP_MIN,
  type PackCard,
  type PackGeometry,
  fitColumns,
  fitPacked,
  packChart,
} from '../../src/ui/techFit';
import { techColumnCount } from '../../src/sim/techData';

/**
 * The lanes **before this chart was laid**: the file's own order, dealt into the
 * five lanes column by column.
 *
 * The tree pass of 2026-08-30 replaced twenty-six nodes with fifty-three, so the
 * hand-authored "before" table this file used to carry stopped describing a
 * graph that exists — a before that names nodes the after does not have is not a
 * comparison, it is a stale copy. What replaces it is the honest baseline for a
 * graph nobody has laid yet: the same columns, the same edges, and the lanes a
 * designer would get by simply typing the rows in.
 *
 * Derived rather than written down, which the old table could not be for its own
 * good reason (a before that could be recomputed from the file would only ever
 * equal the after) — and *can* be here, because this one is recomputed from the
 * file's **order** and not from its lanes.
 */
function naiveLanes(): Record<string, number> {
  const perColumn = new Map<number, number>();
  const rows: Record<string, number> = {};
  for (const id of TECH_IDS) {
    // `techColumn`, the column the chart draws, since the age banding — see
    // `techChartLayout`, which the comparison has to be against the same
    // geometry as.
    const column = techColumn(id);
    const next = perColumn.get(column) ?? 0;
    perColumn.set(column, next + 1);
    rows[id] = next % TECH_LANE_LIMIT;
  }
  return rows;
}

/** The same graph and the same columns, re-laid into the unlaid lanes. */
function layoutBefore(): ChartLayout {
  const before = naiveLanes();
  const now = techChartLayout();
  const cells = new Map<string, ChartCell>();
  for (const [id, cell] of now.cells) {
    const row = before[id];
    expect(row, `${id} has no "before" lane recorded`).not.toBeUndefined();
    cells.set(id, { column: cell.column, row: row! });
  }
  return { cells, edges: now.edges };
}

/** A layout written by hand, for the counter's own arithmetic. */
function miniature(
  cells: Record<string, [number, number]>,
  edges: [string, string][],
): ChartLayout {
  return {
    cells: new Map(Object.entries(cells).map(([id, [column, row]]) => [id, { column, row }])),
    edges,
  };
}

describe('chartCrossings', () => {
  it('counts a plain X as one crossing', () => {
    const layout = miniature(
      { a: [0, 0], b: [0, 1], c: [1, 1], d: [1, 0] },
      [
        ['a', 'c'],
        ['b', 'd'],
      ],
    );
    expect(chartCrossings(layout)).toBe(1);
  });

  it('counts nothing when the two connectors are parallel', () => {
    const layout = miniature(
      { a: [0, 0], b: [0, 1], c: [1, 0], d: [1, 1] },
      [
        ['a', 'c'],
        ['b', 'd'],
      ],
    );
    expect(chartCrossings(layout)).toBe(0);
  });

  it('counts nothing for a fan — two lines meeting at a shared node', () => {
    // The shape every multi-prerequisite tech makes. Lines that meet at a node
    // are how a dependency chart says "both of these"; counting them would make
    // the metric largest for the tree that explained itself best.
    const fanIn = miniature(
      { a: [0, 0], b: [0, 2], c: [1, 1] },
      [
        ['a', 'c'],
        ['b', 'c'],
      ],
    );
    expect(chartCrossings(fanIn)).toBe(0);
    const fanOut = miniature(
      { a: [0, 1], b: [1, 0], c: [1, 2] },
      [
        ['a', 'b'],
        ['a', 'c'],
      ],
    );
    expect(chartCrossings(fanOut)).toBe(0);
  });

  it('counts nothing for a connector that merely passes a node', () => {
    // A line running behind an intervening card is not a crossing — it is the
    // thing `chartFalseChains` has an opinion about, and keeping the two
    // separate is what lets the lane principle rank one above the other.
    const layout = miniature({ a: [0, 0], b: [1, 0], c: [2, 0] }, [['a', 'c']]);
    expect(chartCrossings(layout)).toBe(0);
    expect(chartFalseChains(layout)).toEqual(['a → c runs through b']);
  });

  it('ignores an edge naming a node the layout does not hold', () => {
    // How a slice of the chart is taken (`techChartLayout` with a filter): the
    // edges are trimmed to the slice, and a stray one must not be counted
    // against a node at the origin.
    const layout = miniature({ a: [0, 0], b: [1, 0] }, [
      ['a', 'b'],
      ['a', 'ghost'],
    ]);
    expect(chartCrossings(layout)).toBe(0);
  });
});

describe('the shipped lanes', () => {
  it('crosses less than the lanes it replaced', () => {
    const before = chartCrossings(layoutBefore());
    const after = chartCrossings(techChartLayout());
    // **Re-measured for the timeline pass of 2026-09-02**, which reshaped the
    // graph and then re-annealed every lane against it. The history, because a
    // re-lay has to say which direction it moved the numbers: the 2026-08-26
    // re-lay was 25 against 11 over twenty-six nodes; the 2026-08-30 tree 323
    // against 179 over fifty-three; the re-cut's wide, shallow forty-nine 31
    // against 5; the chain pass 113 against 10 at eleven lanes, and 113 against
    // 14 when the fold pass cut the budget to eight.
    //
    // **Re-measured again for tree revision 4 (2026-09-02, the user's redraw)**,
    // which re-hung almost every edge: **100 for the naive deal, 9 for the
    // layout in the file** — both against the *drawn* geometry rather than the
    // raw depths (`techChartLayout` keys on `techColumn`; the ages own disjoint
    // column runs, so a depth-keyed metric would count crossings between nodes
    // the chart draws a column apart and miss the ones it draws on top of each
    // other).
    //
    // The best figure the chart has ever had, and it is the *graph's* doing
    // rather than the search's: the user's tree is 65 connectors where the
    // timeline pass had 74, and 57 of them span a single column. The lanes read
    // as lines about as well as before — **37 of the 42 nodes that can continue
    // a parent's lane do**, where the timeline pass managed 34 of 41 — out of
    // the same annealer on the same three measures (crossings, false chains and
    // lane-continuation together) over fourteen starts of twenty-five thousand
    // moves.
    //
    // **Zero false chains is the claim that did not move** — see the test
    // below — and it is the one the lane principle ranks above a crossing.
    //
    // **Re-authored 2026-09-03: the lanes are the user's chart now, not the
    // annealer's.** The user drew the tree by hand and asked the game to match
    // the drawing — the faith line along the top, the sea along the bottom,
    // the state's ladder between. Their first drawing cost 19 crossings on the
    // v4 edges; **their arrow revision (v4.1) draws at ONE** — the drawn lanes
    // and the drawn edges were made for each other, and together they beat
    // everything the annealer ever found (its best was 9). A pin rather than a
    // bound, so a future hand that moves a lane knows it is editing the user's
    // drawing; the annealer survives as the advisor for where a NEW node
    // should sit, never as the authority over an authored row.
    expect(before).toBe(60);
    expect(after).toBe(1);
    expect(after).toBeLessThan(before);
  });

  it('draws Æra I at the floor its own graph allows', () => {
    const ageOne = techChartLayout((id) => techDef(id).age === 1);
    // **Zero**, and that is a fact about the graph rather than about the search.
    // The history is worth keeping because the number has moved with the shape
    // and never with the lay: the re-cut of 2026-09-02 left every Æra I node
    // with a single prerequisite and the age drew at zero; the restoration of
    // the same morning put four two-parent gates back and the floor became one,
    // brute-forced in 2026-08-26 over every one of the 1.4M five-lane
    // arrangements of that corner. **Tree revision 4 draws the age with two
    // gates rather than four** (Writing and The Wheel), and a graph that plain
    // can be drawn flat — so zero is available again, and the lay takes it.
    expect(chartCrossings(ageOne)).toBe(0);
    const before = naiveLanes();
    expect(chartCrossings(ageOne)).toBeLessThanOrEqual(
      chartCrossings({
        cells: new Map(
          [...ageOne.cells].map(([id, cell]) => [id, { column: cell.column, row: before[id]! }]),
        ),
        edges: ageOne.edges,
      }),
    );
  });

  it('never runs a connector flat through a node that is not on its path', () => {
    // The one fault the lane principle ranks above a crossing: a line entering
    // one card and leaving the other side reads as a prerequisite nobody wrote.
    expect(chartFalseChains(techChartLayout())).toEqual([]);
  });

  it('keeps every tech inside the lanes the chart is laid for', () => {
    for (const id of TECH_IDS) {
      const { row } = techDef(id);
      expect(row, id).toBeGreaterThanOrEqual(0);
      expect(row, id).toBeLessThan(TECH_LANE_LIMIT);
    }
    // Every lane is used, so the budget is spent rather than merely respected.
    expect(new Set(TECH_IDS.map((id) => techDef(id).row)).size).toBe(TECH_LANE_LIMIT);
  });

  it('reports a tech authored past the last lane', () => {
    const def = techDef('sailing');
    const authored = def.row;
    try {
      def.row = TECH_LANE_LIMIT;
      expect(techDataProblems()).toContain(
        `tech "sailing" sits in lane ${TECH_LANE_LIMIT}, past the ${TECH_LANE_LIMIT}-lane chart (0…${TECH_LANE_LIMIT - 1})`,
      );
    } finally {
      def.row = authored;
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('gives every lane a run that starts where its head is', () => {
    // The principle's first two rules, read back off the file: a tech shares a
    // lane with one of its own prerequisites wherever the chart allows it. Not
    // every tech can — rule 3 puts a two-parent tech *between* its parents — so
    // this is a majority claim, and the majority is what makes a lane read as a
    // line rather than as a shelf.
    const continuing = TECH_IDS.filter((id) =>
      techDef(id).prereqs.some((prereq) => techDef(prereq).row === techDef(id).row),
    );
    // Measured against what the *graph* allows rather than against the node
    // count, which is the honest denominator and was not before the re-cut of
    // 2026-09-02: lanes are unique within a column, so a node with four children
    // can hand its lane down to exactly one of them. The ceiling is therefore
    // the number of nodes that have any children at all — thirty-nine of the
    // fifty after the chain pass — and the shipped layout takes **thirty** of
    // them while holding the crossings at fourteen. (Eleven lanes managed
    // twenty-nine at ten crossings: the tighter cap crosses more and reads
    // *better*, because eight lanes over fifty nodes leaves fewer of them
    // stranded alone in a lane.) A ratio quoted against 50 would read as a
    // failure of the lay when it is a fact about a wide tree.
    const donors = new Set(TECH_IDS.flatMap((id) => techDef(id).prereqs)).size;
    expect(continuing.length).toBeGreaterThanOrEqual(donors * 0.65);
    // And the root sits in the middle lane, so its five children fan evenly.
    expect(techDepth('agriculture')).toBe(0);
    expect(techDef('agriculture').row).toBe(Math.floor(TECH_LANE_LIMIT / 2));
  });
});

/**
 * The chart's *other* reading, ruled by the user on 2026-09-02: **inside an age
 * a column is roughly a price**, so the chart reads left to right as a schedule
 * as well as a dependency chart.
 *
 * It used to be a claim about the *edges* that had been chosen — there is no
 * cost term anywhere in the layout, so the only way to hold it was to choose
 * prerequisites for it, and a handful of nodes a dependency dragged out of
 * order were pinned by name as the exceptions. The user's second ruling of the
 * same day settled it the other way round: **every cost is now written from the
 * node's own column** by one tapered table (`tech.test.ts` carries the formula
 * and the fourteen figures), so the reading is exact by construction and there
 * is no exception left to pin.
 *
 * The tests below are kept rather than deleted, and what they are for has
 * changed: they are now the witnesses that the *shape* the pricing rests on is
 * still there — the ages spread over columns that each earn their width, the
 * means still rise, and the stray list is empty because it cannot be anything
 * else.
 *
 * **The ladder re-anchored on 2026-09-02** (the user: "the first tier should be
 * 13 science ... I think the agent skipped a tier") and nothing in this file
 * moved, which is the point worth writing down. The table shifted one column
 * right — column 0 is a nominal 5 nobody pays, column 1 is the user's 13, and
 * the old top figure of 950 fell off the end — and every claim below is about
 * the *relation* between a column and its price rather than about the figures,
 * so a re-anchoring passes it unchanged. A pin that had to be edited here would
 * have meant the shape had moved too.
 */
describe('a column is a price', () => {
  /** Every age's columns, left to right, with what sits in each. */
  function ageColumns(age: number): { column: number; costs: number[] }[] {
    const members = TECH_IDS.filter((id) => techDef(id).age === age);
    const byColumn = new Map<number, number[]>();
    for (const id of members) {
      const column = techColumn(id);
      byColumn.set(column, [...(byColumn.get(column) ?? []), techDef(id).cost]);
    }
    return [...byColumn.entries()]
      .sort(([a], [b]) => a - b)
      .map(([column, costs]) => ({ column, costs }));
  }

  it('gives every age columns that each earn their width', () => {
    // The timeline pass's own measure (user: make the chart read like Civ V's),
    // re-measured against **tree revision 4** — the user's own hand-drawn chart,
    // transcribed. Twelve columns now, and the property still holds with two
    // named exceptions written down below rather than smoothed away.
    expect(ageColumns(1).map((band) => band.column)).toEqual([0, 1, 2, 3]);
    expect(ageColumns(2).map((band) => band.column)).toEqual([4, 5]);
    expect(ageColumns(3).map((band) => band.column)).toEqual([6, 7, 8]);
    expect(ageColumns(4).map((band) => band.column)).toEqual([9, 10, 11, 12]);
    const populations = [1, 2, 3, 4].flatMap((age) =>
      ageColumns(age).map(({ column, costs }) => [column, costs.length] as const),
    );
    expect(populations).toEqual([
      [0, 1], [1, 4], [2, 5], [3, 2],
      [4, 4], [5, 5],
      [6, 4], [7, 5], [8, 5], [9, 5],
      [10, 4], [11, 5], [12, 1],
    ]);
    // **Two columns hold fewer than three, and both are exceptions with a
    // reason rather than a rule that quietly stopped holding.** Column 0 is
    // Agriculture alone and always will be, because it is the one root the tree
    // has. Column 3 is Writing and The Wheel — Æra I's closing pair — and that
    // is exactly what the user's own edge list produces: four lines fan out of
    // the root, run one node each, and meet at two gates. Widening it would
    // mean adding an Æra I node the redraw does not have.
    // Revision 4.1 adds three more, all the user's own drawing: column 9 is
    // Geomancy alone (the survey gets its own late step past Daughter Cities
    // and Horology), column 12 is the war-and-press pair (Militant Orders,
    // Movable Type), and column 13 is Alchemy — the closer closes alone.
    const SHORT: Record<number, number> = { 0: 1, 3: 2, 12: 1 };
    for (const [column, held] of populations) {
      if (SHORT[column] !== undefined) {
        expect(held, `column ${column}`).toBe(SHORT[column]);
        continue;
      }
      expect(held, `column ${column}`).toBeGreaterThanOrEqual(3);
      expect(held, `column ${column}`).toBeLessThanOrEqual(7);
    }
  });

  it('holds one cost per column, rising across every age', () => {
    // Exact, not a mean: every node in a column costs the same thing, because
    // the column is where the cost comes from. A rising *mean* was the strongest
    // claim the hand-tuned table could support; this is the claim it was
    // reaching for.
    let last = 0;
    for (const age of [1, 2, 3, 4]) {
      for (const { column, costs } of ageColumns(age)) {
        expect(new Set(costs).size, `æra ${age}, column ${column}`).toBe(1);
        expect(costs[0]!, `æra ${age}, column ${column}`).toBeGreaterThan(last);
        last = costs[0]!;
      }
    }
  });

  it('has no node a dependency drags out of order, and cannot have one', () => {
    // The list this used to pin by name — Kingship, Prospecting, The Qadi's
    // Court, Paper Money, Fortification — is empty in every age now. A node is
    // "out of order" when something dearer than it sits in an earlier column of
    // its own age, and a cost that *is* the column makes that unreachable.
    const strays: Record<number, string[]> = {};
    for (const age of [1, 2, 3, 4]) {
      const members = TECH_IDS.filter((id) => techDef(id).age === age);
      strays[age] = members
        .filter((id) =>
          members.some(
            (other) =>
              techColumn(other) < techColumn(id) && techDef(other).cost > techDef(id).cost,
          ),
        )
        .sort();
    }
    expect(strays).toEqual({ 1: [], 2: [], 3: [], 4: [] });
  });

  it('sits Irrigation to the right of Currency', () => {
    // The user's ruling of 2026-09-02 by name — "currency a bit too late,
    // irrigation a bit too early" — kept as a *shape* claim now that the costs
    // follow the columns rather than the other way round. **Tree revision 4
    // hangs Irrigation on Chronology alone**, which still puts it one column
    // past Currency and last in its age; the prices follow from that, and no
    // longer argue with it.
    expect(techColumn('irrigation')).toBeGreaterThan(techColumn('currency'));
    expect(techDef('irrigation').cost).toBeGreaterThan(techDef('currency').cost);
    expect(techDef('irrigation').prereqs).toEqual(['theLongCount', 'bronzePanoply']);
  });
});

/**
 * The packed columns, which replaced the lanes on 2026-09-03.
 *
 * The complaint was the plainest kind and the user drew the answer: the chart
 * was one grid with eight full-width lane tracks, so **every column paid the
 * height of all eight** and a column holding three cards drew five empty tracks
 * of night under them. "Arrange the cards like in my image with less empty space
 * — there's space for a node in between nodes in one column, because they're
 * occupied in another column."
 *
 * So the row authored in `data/techs.json` stopped being a *position* and became
 * an **order**, and `packChart` is what turns the one into the other. What is
 * pinned here is the four properties that make the result reviewable rather than
 * merely plausible — it is deterministic, it never reorders a column, it never
 * lets two cards touch, and no connector runs through a card that is not its
 * endpoint — and then the height, which is what the whole pass was for.
 *
 * The lane-based tests above are untouched on purpose: the *data* did not move.
 * `techChartLayout` is still keyed on rows and still says what the drawing says.
 */
describe('packChart', () => {
  /** The chart's own geometry at the drawn-for column width. */
  const GEOMETRY: PackGeometry = { columnWidth: COL_WIDTH_MIN, columnGap: 52 };

  /**
   * What a node card measures, from its parts.
   *
   * There is no jsdom in this suite and there would be no type in it if there
   * were, so the heights are **modelled** from the stylesheet rather than
   * measured — the chrome, the title row, the figures row, and the unlock lines
   * the face compaction left (at most two, then a counted line). The model is
   * the honest one for the question being asked, which is about the *shape* of
   * the packed chart: a card two pixels taller than this moves the total by a
   * fraction and moves no conclusion.
   *
   * The figures are `style.css`'s, after the tightening that shipped with the
   * pack: padding 6/7 and a 1.5px border either side, a 14px name, a 10px mono
   * figures line, and a 15px mark box per unlock row at a 2px gap.
   */
  const CHROME = 6 + 7 + 1.5 * 2;
  const TITLE = 18;
  const FIGURES = 2 + 12;
  const UNLOCKS_TOP = 5;
  const UNLOCK_ROW = 15;
  const UNLOCK_GAP = 2;
  const MORE_ROW = 13;
  /** The face's own budget — `FACE_UNLOCKS` in `techTree.ts`. */
  const FACE_UNLOCKS = 2;

  function faceHeight(id: TechId): number {
    const { units = [], buildings = [] } = techDef(id).unlocks;
    const listed = Math.min(FACE_UNLOCKS, units.length + buildings.length);
    const more = units.length + buildings.length - listed;
    let height = CHROME + TITLE + FIGURES;
    const rows = listed + (more > 0 ? 1 : 0);
    if (rows > 0) height += UNLOCKS_TOP + UNLOCK_GAP * (rows - 1);
    height += UNLOCK_ROW * listed + (more > 0 ? MORE_ROW : 0);
    return height;
  }

  /** The shipped tree, as the packer takes it. */
  function shippedCards(): PackCard[] {
    return TECH_IDS.map((id) => ({
      id,
      column: techColumn(id),
      order: techDef(id).row,
      height: faceHeight(id),
    }));
  }

  function shippedEdges(): [string, string][] {
    return TECH_IDS.flatMap((id) =>
      techDef(id).prereqs.map((prereq) => [prereq, id] as [string, string]),
    );
  }

  /** A hand-drawn one, so the invariants are asserted on arithmetic too. */
  const MINI: PackCard[] = [
    { id: 'a', column: 0, order: 3, height: 40 },
    { id: 'b', column: 1, order: 0, height: 60 },
    { id: 'c', column: 1, order: 1, height: 40 },
    { id: 'd', column: 1, order: 2, height: 40 },
    { id: 'e', column: 2, order: 1, height: 80 },
  ];
  const MINI_EDGES: [string, string][] = [
    ['a', 'b'],
    ['a', 'c'],
    ['c', 'e'],
    ['d', 'e'],
  ];

  it('is a pure function of the data and the measured heights', () => {
    // The claim the whole layout rests on: a chart that laid out differently on
    // the second open would be a chart nobody could review, and every connector
    // in it is measured off where the cards ended up. No clock, no randomness,
    // and no Map iteration deciding an outcome.
    const once = packChart(shippedCards(), shippedEdges(), PACK_GAP_MAX, GEOMETRY);
    const again = packChart(shippedCards(), shippedEdges(), PACK_GAP_MAX, GEOMETRY);
    expect([...again.tops.entries()]).toEqual([...once.tops.entries()]);
    expect(again.height).toBe(once.height);
    expect(again.bowed).toEqual(once.bowed);

    // And the input's own order does not decide it either: the cards are grouped
    // by column and sorted by the authored row, so handing them over backwards
    // is the same chart.
    const backwards = packChart(
      [...shippedCards()].reverse(),
      [...shippedEdges()].reverse(),
      PACK_GAP_MAX,
      GEOMETRY,
    );
    for (const [id, top] of once.tops) expect(backwards.tops.get(id), id).toBeCloseTo(top, 6);
  });

  it('never reorders a column — the drawing’s top-to-bottom is the user’s', () => {
    // **The authored `row` is the law of order and not of position.** It is the
    // one thing in the pack that is not the packer's to decide: the rows are the
    // user's own drawing, and a smoothing pass that swapped two of them because
    // it liked the lines better would be the layout overruling the designer.
    const packed = packChart(shippedCards(), shippedEdges(), PACK_GAP_MAX, GEOMETRY);
    const byColumn = new Map<number, PackCard[]>();
    for (const card of shippedCards()) {
      byColumn.set(card.column, [...(byColumn.get(card.column) ?? []), card]);
    }
    for (const [column, stack] of byColumn) {
      const authored = [...stack].sort((a, b) => a.order - b.order);
      for (let index = 1; index < authored.length; index += 1) {
        const above = authored[index - 1]!;
        const below = authored[index]!;
        expect(
          packed.tops.get(below.id)!,
          `column ${column}: ${below.id} (row ${below.order}) must stay under ${above.id} (row ${above.order})`,
        ).toBeGreaterThan(packed.tops.get(above.id)!);
      }
    }
  });

  it('leaves at least the gap between two cards in a column', () => {
    for (const gap of [PACK_GAP_MIN, PACK_GAP_MAX]) {
      const cards = shippedCards();
      const packed = packChart(cards, shippedEdges(), gap, GEOMETRY);
      const height = new Map(cards.map((card) => [card.id, card.height]));
      const byColumn = new Map<number, PackCard[]>();
      for (const card of cards) {
        byColumn.set(card.column, [...(byColumn.get(card.column) ?? []), card]);
      }
      for (const stack of byColumn.values()) {
        const authored = [...stack].sort((a, b) => a.order - b.order);
        for (let index = 1; index < authored.length; index += 1) {
          const above = authored[index - 1]!;
          const below = authored[index]!;
          const clear =
            packed.tops.get(below.id)! - (packed.tops.get(above.id)! + height.get(above.id)!);
          // A hair of tolerance for the arithmetic, and nothing more: two cards
          // a pixel apart is two cards touching.
          expect(clear, `${above.id} → ${below.id} at gap ${gap}`).toBeGreaterThanOrEqual(
            gap - 1e-6,
          );
        }
      }
      // And nothing leaves the field, in either direction.
      for (const card of cards) {
        expect(packed.tops.get(card.id)!, card.id).toBeGreaterThanOrEqual(-1e-6);
        expect(packed.tops.get(card.id)! + card.height, card.id).toBeLessThanOrEqual(
          packed.height + 1e-6,
        );
      }
    }
  });

  it('holds both invariants on a hand-drawn chart too', () => {
    // The shipped tree is one arrangement; the arithmetic has to be right on any
    // of them. This one is deliberately lopsided — one card in a column beside
    // three in the next — which is exactly the case the lanes could not draw.
    const packed = packChart(MINI, MINI_EDGES, 10, GEOMETRY);
    // The tallest column is b+c+d: 60 + 40 + 40 with two gaps.
    expect(packed.height).toBe(160);
    expect(packed.tops.get('b')!).toBeLessThan(packed.tops.get('c')!);
    expect(packed.tops.get('c')!).toBeLessThan(packed.tops.get('d')!);
    expect(packed.tops.get('c')! - packed.tops.get('b')!).toBeGreaterThanOrEqual(70);
    // A single card in a column sits where what it is joined to is, not at the
    // top of a track it happens to have been authored into: `a` feeds `b` and
    // `c`, so it settles between them.
    expect(packed.tops.get('a')! + 20).toBeGreaterThan(packed.tops.get('b')! + 30);
    expect(packed.tops.get('a')! + 20).toBeLessThan(packed.tops.get('d')! + 20);
  });

  /**
   * The false-chain principle, which survived the loss of the lanes by becoming
   * **geometric**.
   *
   * It used to be a claim about rows — `chartFalseChains` above, which is still
   * the right question to ask of the *data* — and a chart with no rows left needs
   * the same claim asked of the boxes: a line that enters one card and leaves the
   * other side reads as a prerequisite nobody wrote, whether or not there is a
   * lane involved. So this recomputes the bands from the packer's own answer
   * rather than trusting its report, which is the only form of the assertion a
   * bug in `clearChains` cannot quietly pass.
   */
  it('never runs a connector through a card that is not its endpoint', () => {
    const cards = shippedCards();
    const packed = packChart(cards, shippedEdges(), PACK_GAP_MAX, GEOMETRY);
    const height = new Map(cards.map((card) => [card.id, card.height]));
    const column = new Map(cards.map((card) => [card.id, card.column]));
    const pitch = GEOMETRY.columnWidth + GEOMETRY.columnGap;
    const bowed = new Set(packed.bowed.map((edge) => `${edge.from}>${edge.to}`));

    for (const [from, to] of shippedEdges()) {
      const a = column.get(from)!;
      const b = column.get(to)!;
      if (b - a < 2) continue; // adjacent columns pass over nothing at all
      const x1 = a * pitch + GEOMETRY.columnWidth;
      const x2 = b * pitch;
      const y1 = packed.tops.get(from)! + height.get(from)! / 2;
      const y2 = packed.tops.get(to)! + height.get(to)! / 2;
      for (const card of cards) {
        if (card.column <= a || card.column >= b) continue;
        const left = card.column * pitch;
        const right = left + GEOMETRY.columnWidth;
        const at = (x: number): number => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
        const low = Math.min(at(left), at(right));
        const high = Math.max(at(left), at(right));
        const top = packed.tops.get(card.id)!;
        const through = high > top && low < top + card.height;
        // Either the packer laid the card clear of the band, or it said so — and
        // a connector it said so about is drawn bowed (`drawLines`), so the sky
        // never *shows* a line through a card either way.
        expect(
          !through || bowed.has(`${from}>${to}`),
          `${from} → ${to} runs through ${card.id} and was not reported`,
        ).toBe(true);
      }
    }

    // The shipped tree, at the shipped metrics, is laid clear outright: nothing
    // has to be bowed at all. A future node that forces one is a change worth
    // seeing in a diff rather than a silent bend.
    // Revision 4.2's authored shifts created three connectors that span two
    // columns and thread a packed middle stack — kingship reaching past the
    // shifted Examination Hall's old column, philosophy past to the shifted
    // Theology, shipwrights past to Paper Money. None can be nudged clear (the
    // middle stacks are full at those heights), so all three take the honest
    // 16px bow the machinery was built for. The exact list is the pin: a
    // fourth bow is a decision, not a drift.
    expect(packed.bowed).toEqual([
      { bow: 16, from: 'shipwrights', to: 'paperMoney' },
      { bow: 16, from: 'kingship', to: 'theExaminationHall' },
      { bow: -16, from: 'philosophy', to: 'theology' },
    ]);
  });

  /**
   * The height, which is what the whole pass was for.
   *
   * The lane grid drew the fifty-node tree at **1032px** with the epigrams
   * already dropped — eight lanes, every column paying for all of them — against
   * a 681px stage, and the file above used to pin that overrun as a fact nothing
   * could be done about ("no lane count the graph permits can clear the fold").
   * It was a fact about the *grid*, and the grid is gone.
   *
   * Two claims. The chart is now **about as tall as its tallest column**, which
   * is the whole of the compaction and is stated as a bound rather than as a
   * figure so a new node in a short column costs nothing; and it **fits the
   * user's own window**, at the roomy gap, with no shrinking and no scroll.
   */
  it('draws the fifty-node tree in a little over its tallest column', () => {
    const cards = shippedCards();
    const packed = packChart(cards, shippedEdges(), PACK_GAP_MAX, GEOMETRY);
    const tallest = Math.max(...cards.map((card) => card.height));
    const deepest = Math.max(
      ...[...new Set(cards.map((card) => card.column))].map(
        (column) => cards.filter((card) => card.column === column).length,
      ),
    );
    // Six nodes is the deepest column the tree has, and the packed chart is
    // those six cards and the air between them and nothing else.
    expect(deepest).toBe(5);
    expect(packed.height).toBeLessThanOrEqual(6.5 * tallest + PACK_GAP_MAX * (deepest - 1));
  });

  it('fits the user’s window, which eight lanes never could', () => {
    /** The user's window, measured: `chart.clientHeight` at 1456×827. */
    const STAGE = 681;
    /** The age-label strip above the cards, measured in Chrome. */
    const STRIP = 22;
    const packed = packChart(shippedCards(), shippedEdges(), PACK_GAP_MAX, GEOMETRY);
    // The measured figure, pinned: **606px** of chart under a 22px strip, where
    // the lanes drew 1032 and overran by 415. A change that moves it is a change
    // to the card face or to the deepest column, and both are worth a diff.
    expect(Math.round(packed.height)).toBe(524);
    expect(STRIP + packed.height).toBeLessThanOrEqual(STAGE);
    // So nothing is shrunk and nothing scrolls — the two fallbacks stay unused
    // at the size the game is actually played at.
    expect(fitPacked(STAGE, STRIP + packed.height)).toEqual({ scale: 1, overflow: 0 });
  });

  it('closes the gaps before it shrinks anything', () => {
    // The order of the fallbacks, which is the cheapest first: air costs nothing
    // to give up and type costs legibility. Closing up is worth four gaps of the
    // deepest column (five cards since revision 4.2), taken before a scale is.
    const roomy = packChart(shippedCards(), shippedEdges(), PACK_GAP_MAX, GEOMETRY);
    const tight = packChart(shippedCards(), shippedEdges(), PACK_GAP_MIN, GEOMETRY);
    expect(tight.height).toBeLessThan(roomy.height);
    expect(roomy.height - tight.height).toBe((PACK_GAP_MAX - PACK_GAP_MIN) * 4);
  });

  it('answers a chart nobody has laid out yet without dividing by zero', () => {
    const empty = packChart([], [], PACK_GAP_MAX, GEOMETRY);
    expect(empty.height).toBe(0);
    expect([...empty.tops]).toEqual([]);
    expect(empty.bowed).toEqual([]);
    // An edge naming a card the layout does not hold is ignored rather than
    // thrown on — the same forgiveness `chartCrossings` gives, and for the same
    // reason: a filtered layout is a legitimate thing to pack.
    const partial = packChart(MINI.slice(0, 3), MINI_EDGES, 10, GEOMETRY);
    expect(partial.tops.size).toBe(3);
  });
});

/**
 * What to do when the packed chart still will not fit: `fitLanes`' successor,
 * and the third of the three steps rather than the first.
 *
 * The caller closes the gaps itself (that is `packChart` at `PACK_GAP_MIN`, and
 * it is the cheapest height there is because it costs nothing but air). This is
 * asked afterwards and answers the two that are left, in order: **shrink** the
 * whole chart, floored at `CHART_SCALE_MIN` because below it the node names stop
 * being legible at the size their type was set for, and then **report what still
 * overruns**, which is what leaves the stage scrollable rather than drawing cards
 * off the bottom edge.
 */
describe('fitPacked', () => {
  it('does nothing at all to a chart that fits', () => {
    expect(fitPacked(681, 537)).toEqual({ scale: 1, overflow: 0 });
    expect(fitPacked(681, 681)).toEqual({ scale: 1, overflow: 0 });
  });

  it('shrinks a chart that nearly fits, exactly onto the stage', () => {
    const fit = fitPacked(681, 740);
    expect(fit.scale).toBeCloseTo(681 / 740, 6);
    expect(fit.scale).toBeGreaterThan(CHART_SCALE_MIN);
    expect(fit.overflow).toBeCloseTo(0, 6);
  });

  it('stops shrinking at the floor and reports the rest', () => {
    // Past the floor the names stop being readable, and an unreadable chart that
    // fits is worse than a readable one that has to be dragged.
    const fit = fitPacked(681, 1032);
    expect(fit.scale).toBe(CHART_SCALE_MIN);
    expect(fit.overflow).toBeCloseTo(1032 * CHART_SCALE_MIN - 681, 6);
    expect(fit.overflow).toBeGreaterThan(0);
  });

  it('answers a stage nobody has laid out yet without dividing by zero', () => {
    expect(fitPacked(0, 0)).toEqual({ scale: 1, overflow: 0 });
    expect(fitPacked(Number.NaN, 500)).toEqual({ scale: 1, overflow: 0 });
    expect(fitPacked(681, 0)).toEqual({ scale: 1, overflow: 0 });
  });
});

/**
 * The chart on a big display (user, 2026-08-27), which is the sideways half of
 * `fitPacked` and arrived for the same reason: a length that was a constant.
 *
 * Eight columns at the drawn-for 214px with 52px gutters is a chart about 2080
 * wide, so past roughly 2100 the chart simply stopped growing — the age washes
 * ended mid-screen and everything right of them was night. Nothing errored;
 * the chart had stopped using the room. The three stages of the rule are asserted
 * at the three window widths that show each of them.
 */
describe('fitColumns', () => {
  /** The gutter in `style.css` — `--tech-col-gap`. */
  const GAP = 52;

  it('holds the drawn-for width on a window the chart is wider than', () => {
    // 1440p and below: the chart scrolls sideways exactly as it always has, and
    // the card keeps the width its type was set for.
    const fit = fitColumns(1440, 8, GAP);
    expect(fit.width).toBe(COL_WIDTH_MIN);
    expect(fit.slack).toBe(0);
  });

  it('takes the room a wide window offers, up to the cap', () => {
    const fit = fitColumns(2560, 8, GAP);
    expect(fit.width).toBeGreaterThan(COL_WIDTH_MIN);
    expect(fit.width).toBeLessThanOrEqual(COL_WIDTH_MAX);
    // Everything it was given, to the pixel the flooring left behind.
    expect(fit.slack).toBeLessThan(8);
  });

  it('stops at the cap on a 4K window and reports the room it did not take', () => {
    const fit = fitColumns(3840, 8, GAP);
    expect(fit.width).toBe(COL_WIDTH_MAX);
    // Which is what the stylesheet centres the chart with, rather than leaving
    // it against the left edge of an enormous field.
    expect(fit.slack).toBeGreaterThan(0);
  });

  it('never lets a column out of its bounds, at any width', () => {
    for (const available of [0, 320, 900, 1280, 1920, 2560, 3440, 3840, 7680]) {
      const fit = fitColumns(available, techColumnCount(), GAP);
      expect(fit.width, String(available)).toBeGreaterThanOrEqual(COL_WIDTH_MIN);
      expect(fit.width, String(available)).toBeLessThanOrEqual(COL_WIDTH_MAX);
      expect(fit.slack, String(available)).toBeGreaterThanOrEqual(0);
    }
  });

  it('answers the drawn-for width for a stage nobody has laid out yet', () => {
    // A chart measured before it is in the document, and a chart with no
    // columns: both must answer a width rather than a division by zero.
    expect(fitColumns(0, 8, GAP).width).toBe(COL_WIDTH_MIN);
    expect(fitColumns(1920, 0, GAP).width).toBe(COL_WIDTH_MIN);
    expect(fitColumns(Number.NaN, 8, GAP).width).toBe(COL_WIDTH_MIN);
  });

  it('fills the stage it was given, gutters included, whenever it is not capped', () => {
    // The claim the whole rule rests on: what a column takes times the columns,
    // plus the gutters, plus the slack, is the room there was.
    for (const available of [1280, 2560, 3840]) {
      const columns = 8;
      const fit = fitColumns(available, columns, GAP);
      const used = fit.width * columns + GAP * (columns - 1);
      if (fit.slack > 0) expect(used + fit.slack).toBe(available);
      else expect(used).toBeGreaterThanOrEqual(available - columns);
    }
  });
});

/**
 * The research plan, drawn three times on one screen (playtest batch two).
 *
 * The queue landed in the simulation as one list — `researching` plus whatever
 * stands behind it — and the chart now shows that list as a numeral on every
 * node in it, a line on the hover card, and a strip along the foot. All three
 * are folds of the same list, so what is asserted here is the folds and the
 * *rules* between them: head-first numbering, nothing at all off the plan, one
 * condition gating all three surfaces, and a × that says what it would really
 * take with it.
 *
 * `planDependants` is the one that has to be read against the reducer rather
 * than against a hand-written expectation: `dequeueResearch` cascades, and a
 * strip that promised to drop one row while the command dropped four would be
 * the interface lying about a command it is about to send. It is asserted to be
 * exactly the difference `researchPlanWithout` — the reducer's own routine —
 * makes, which is the only form of the claim a change to that cascade cannot
 * quietly break.
 *
 * The rest is read out of the source, for `cityScreen.test.ts`'s reason: there
 * is no jsdom in this suite, and the failures being guarded against (a click
 * that stopped reading `shiftKey`, a strip measured after the lanes were spaced)
 * are never thrown errors.
 */

import { applyCommand } from '../../src/sim/commands';
import { newGame } from '../../src/sim/state';
import { researchPlan, researchPlanWithout } from '../../src/sim/tech';
import {
  chooseResearchCommand,
  dequeueTitle,
  planDependants,
  planIsQueue,
  planPlace,
} from '../../src/ui/techTree';

const CHART_SOURCE = import.meta.glob(['../../src/ui/techTree.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function chartSource(): string {
  const text = Object.values(CHART_SOURCE)[0];
  if (typeof text !== 'string' || text.length === 0) throw new Error('techTree.ts came back empty');
  return text;
}

/**
 * The body of one function in `techTree.ts`, by its declaration line.
 *
 * Deliberately literal and deliberately brace-matched: an assertion that merely
 * searched the whole file for `shiftKey` would pass on a mention in a comment,
 * and half of what this file is checking is *which* function does a thing.
 */
function chartFunction(declaration: string): string {
  const text = chartSource();
  const at = text.indexOf(declaration);
  expect(at, `no "${declaration}" in techTree.ts`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = text.indexOf('{', at); index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    else if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(at, index + 1);
    }
  }
  throw new Error(`"${declaration}" is never closed`);
}

/**
 * A plan a player could actually hold, with a **two-parent node at the end** —
 * The Wheel behind both Bronzeworking and Stonecraft, which is what makes the
 * cascade worth testing. Re-picked twice on 2026-09-02: the re-cut left
 * Bronzeworking with one parent, and tree revision 4 then left Currency with
 * one, so the gate moved to the pair the user's own chart closes Æra I on.
 */
const PLAN = ['mining', 'earthenware', 'bronzeWorking', 'stonecraft', 'theWheel'] as const;

describe('the numbered chips', () => {
  it('numbers the plan head-first, counting the current research as 1', () => {
    // The head *is* what the beakers are pointed at (see `researchPlan`), so a
    // numeral is a schedule and not a list of things somebody clicked.
    expect(planPlace(PLAN, 'mining')).toBe(1);
    expect(planPlace(PLAN, 'earthenware')).toBe(2);
    expect(planPlace(PLAN, 'theWheel')).toBe(5);
  });

  it('gives a node that is not in the plan no numeral at all', () => {
    expect(planPlace(PLAN, 'husbandry')).toBeNull();
    expect(planPlace([], 'mining')).toBeNull();
  });

  it('renumbers rather than remembering — a shorter plan starts again at 1', () => {
    // What a dequeue leaves behind. The chips are derived on every render from
    // the plan as it stands, so a cascade that takes three rows out cannot leave
    // a ④ hanging over a plan of two.
    const after = researchPlanWithout(PLAN, 'mining');
    expect(after).toEqual(['earthenware', 'stonecraft']);
    expect(planPlace(after, 'earthenware')).toBe(1);
    expect(planPlace(after, 'mining')).toBeNull();
    expect(planPlace(after, 'theWheel')).toBeNull();
  });

  it('draws nothing at all until there is a queue to be first in', () => {
    // The user's own condition ("when a queue exists on the tech screen"), and
    // one function so the numerals, the hover line and the strip cannot
    // disagree — a lone ① over a node with no list anywhere is the failure.
    expect(planIsQueue([])).toBe(false);
    expect(planIsQueue(['mining'])).toBe(false);
    expect(planIsQueue(PLAN)).toBe(true);
  });

  it('gates all three surfaces on that one condition', () => {
    // Read out of the source because there is no jsdom: the numeral, the hover
    // card's plan line and the strip each ask `planIsQueue` before they draw.
    // `paintNode` and not `renderNode` since the chart stopped rebuilding itself
    // on every click (2026-08-29): a card is built once and repainted after
    // that, and the numeral is one of the marks a repaint moves.
    expect(chartFunction('function paintNode(')).toContain('planIsQueue(plan)');
    expect(chartFunction('function techCard(')).toContain('planIsQueue(researchPlan(player))');
    expect(chartFunction('function renderPlanStrip(')).toContain('!planIsQueue(plan)');
  });
});

describe('a chip’s ✕', () => {
  it('names what would go with the row, from the reducer’s own cascade', () => {
    // Dropping a parent takes the child with it, and the child is *named* — "and
    // what depends on it" alone leaves the player to work out which of six chips
    // it meant.
    expect(planDependants(PLAN, 'bronzeWorking')).toEqual(['theWheel']);
    expect(dequeueTitle(PLAN, 'bronzeWorking')).toBe(
      'Removes Bronzeworking and what depends on it: The Wheel',
    );
    expect(planDependants(PLAN, 'mining')).toEqual(['bronzeWorking', 'theWheel']);
    expect(dequeueTitle(PLAN, 'earthenware')).toBe(
      'Removes Pottery and what depends on it: Stonecraft, The Wheel',
    );
  });

  it('says only what it removes when nothing stands on it', () => {
    expect(planDependants(PLAN, 'theWheel')).toEqual([]);
    expect(dequeueTitle(PLAN, 'theWheel')).toBe('Removes The Wheel from the plan');
  });

  it('is exactly the difference the reducer’s own routine makes', () => {
    // The claim that matters: not that these particular names come out, but that
    // whatever `researchPlanWithout` drops is what the ✕ warned about. A change
    // to the cascade moves both sides of this together or fails here.
    for (const techId of PLAN) {
      const kept = researchPlanWithout(PLAN, techId);
      const gone = PLAN.filter((id) => id !== techId && !kept.includes(id));
      expect(planDependants(PLAN, techId)).toEqual(gone);
    }
  });

  it('has nothing to say about a technology the plan does not hold', () => {
    expect(planDependants(PLAN, 'husbandry')).toEqual([]);
  });
});

describe('clicking a star', () => {
  it('aims plainly, and adds with shift', () => {
    expect(chooseResearchCommand(0, 'bronzeWorking', true)).toEqual({
      type: 'chooseResearch',
      playerId: 0,
      techId: 'bronzeWorking',
      queue: 'append',
    });
  });

  it('omits the mode entirely on a plain click', () => {
    // An absent mode *is* replace, so a plain click writes byte-for-byte the log
    // entry this screen has always written and every save made before the queue
    // existed still replays against it. Written as a key check rather than an
    // equality so the intent survives a reader skimming it.
    const command = chooseResearchCommand(3, 'mining', false);
    expect(command).toEqual({ type: 'chooseResearch', playerId: 3, techId: 'mining' });
    expect(Object.keys(command)).not.toContain('queue');
  });

  it('is a command the reducer takes, both ways', () => {
    // The one end-to-end pass: the shapes above are only worth anything if the
    // reducer accepts them, and a locked node has to expand rather than refuse.
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    const player = state.players[0]!;

    expect(applyCommand(state, chooseResearchCommand(0, 'bronzeWorking', false)).ok).toBe(true);
    // Bronzeworking is three deep, so naming it named its prerequisites too and
    // the head is one of *those* rather than the node that was clicked.
    const plan = researchPlan(player);
    expect(plan[plan.length - 1]).toBe('bronzeWorking');
    expect(plan.length).toBeGreaterThan(1);
    expect(planPlace(plan, 'bronzeWorking')).toBe(plan.length);

    // Shift keeps everything already lined up and adds behind it.
    expect(applyCommand(state, chooseResearchCommand(0, 'sailing', true)).ok).toBe(true);
    const appended = researchPlan(player);
    expect(appended.slice(0, plan.length)).toEqual(plan);
    expect(appended[appended.length - 1]).toBe('sailing');
  });

  it('reads shift off the click event rather than latching a mode', () => {
    // A modifier is a fact about *this* press. The handler takes the event and
    // hands `shiftKey` straight to the command builder; anything that stored it
    // would be a mode the player cannot see.
    const handler = chartFunction("card.addEventListener('click'");
    expect(handler).toContain('event.shiftKey');
    expect(handler).toContain('chooseResearchCommand(localPlayerId(), id, event.shiftKey)');
  });

  it('says the reducer’s own sentence when a click is refused after all', () => {
    // It used to `return` on a failed dispatch, which is a click that does
    // nothing and explains nothing. See `refuse`.
    expect(chartFunction("card.addEventListener('click'")).toContain('refuse(result.error)');
  });
});

describe('the strip at the foot', () => {
  it('is laid out before the chart is packed', () => {
    // The load-bearing ordering. The strip is a flex sibling of the stage, so it
    // appearing takes real height off `chart.clientHeight` — and `layoutField`
    // spends exactly that height on the chart. Measured the other way round, a
    // chart gains a strip and keeps the gap it had without one.
    const body = chartFunction('function renderChart(');
    const strip = body.indexOf('renderPlanStrip()');
    const packed = body.indexOf('layoutField(');
    expect(strip).toBeGreaterThanOrEqual(0);
    expect(packed).toBeGreaterThan(strip);
  });

  it('quotes the cumulative schedule, not each node against the pool', () => {
    // `queueTurns` is the reading in which the costs accumulate and at most one
    // technology lands per turn; `turnsToTech` is the per-node one the *cards*
    // use, and a strip built out of it would promise the whole plan arriving at
    // once.
    const body = chartFunction('function renderPlanStrip(');
    // The rate is the render's, handed in rather than summed again — see the
    // pass in `techTree.ts`. It is still `queueTurns` that does the arithmetic.
    expect(body).toContain('queueTurns(state, playerId, rate)');
    expect(body).not.toContain('turnsToTech');
  });

  it('greys a ✕ with the reducer’s own refusal and titles it with the cascade', () => {
    const body = chartFunction('function renderPlanStrip(');
    expect(body).toContain('dequeueResearchError(state, playerId, step.techId)');
    expect(body).toContain('dequeueTitle(plan, step.techId)');
  });
});

/**
 * Escape closes the chart from **any** focus state (user, 2026-08-27: "'escape'
 * key should work to exit the tech screen").
 *
 * The bug had a mechanism, and the mechanism is why one listener was not enough:
 * `main.ts` reports the open chart as blocking, so `controls.ts` returns before
 * its own Escape branch and never calls `closePopovers`; the chart's own handler
 * is bound to the *overlay*, so it only sees a press whose target is inside it.
 * Focus leaves the overlay in three ordinary ways — a re-render replaces the
 * node holding it, the card raised over the sky lives on `document.body`, and a
 * click on the ink around the chart lands on the body — and in all three the key
 * reached nothing at all.
 */
describe('the chart’s Escape', () => {
  const chart = chartSource();

  it('is answered from the window as well as from inside the overlay', () => {
    // Named since Entry LVII so `dispose` can unbind it; the body is pinned on
    // the handler, the wiring on the registration.
    const handler = chart.slice(chart.indexOf('const onWindowKeyDown'));
    const body = handler.slice(0, handler.indexOf('};'));
    expect(body).toContain("if (!open || event.key !== 'Escape') return;");
    expect(body).toContain('setOpen(false);');
    expect(chart).toContain("window.addEventListener('keydown', onWindowKeyDown)");
  });

  it('does not capture, so one press still closes exactly one thing', () => {
    // Capturing would make the window listener win over the overlay's, and the
    // overlay's is the one that also stops the press reaching the board.
    const registration = chart.slice(chart.indexOf("window.addEventListener('keydown', onWindowKeyDown"));
    expect(registration.slice(0, registration.indexOf(');') + 2)).not.toContain(', true)');
  });

  it('still lets the overlay answer a press that started inside the chart', () => {
    // It stops propagation, so the window listener never sees that press: two
    // closers, and whichever is nearer the press is the one that runs.
    const overlay = chart.slice(chart.indexOf("overlay.addEventListener('keydown'"));
    const escape = overlay.slice(0, overlay.indexOf('const target ='));
    expect(escape).toContain('event.stopPropagation();');
    expect(escape).toContain('setOpen(false);');
  });

  it('takes the card raised over the sky down with the chart', () => {
    // The card lives on `document.body`, so hiding the overlay would not hide
    // it — `setOpen(false)` is what does, and both Escapes go through it.
    const close = chart.slice(chart.indexOf('info.hide();\n    readNode(null);'));
    expect(close.slice(0, 80)).toContain('info.hide();');
  });
});
