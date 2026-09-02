/**
 * The star chart's layout: how tangled it is, and whether it fits the window.
 *
 * Two questions this suite exists to answer without a browser, because both had
 * been answered by eye and both were wrong. *Is the chart legible* was measured
 * by squinting at it, so a re-lay had no way to prove it had helped; *does the
 * chart fit* was assumed, so the seventh lane went below the fold of a 900px
 * screen and stayed there. `chartCrossings` and `fitLanes` are the two pure
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
  chartCrossings,
  chartFalseChains,
  techChartLayout,
  techColumn,
  techDataProblems,
  techDef,
  techDepth,
} from '../../src/sim/techData';
import {
  COL_WIDTH_MAX,
  COL_WIDTH_MIN,
  LANE_GAP_MAX,
  LANE_GAP_MIN,
  fitColumns,
  fitLanes,
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
    // This pass measures **88 for the naive deal, 11 for the layout in the
    // file** — both against the *drawn* geometry rather than the raw depths,
    // which is the other half of what changed here (`techChartLayout` keys on
    // `techColumn` now; the ages own disjoint column runs, so a depth-keyed
    // metric was counting crossings between nodes the chart draws a column
    // apart and missing the ones it draws on top of each other).
    //
    // Fewer crossings than the fold pass on a graph with four fewer connectors,
    // and the lanes read as lines *better*: **34 of the 41 nodes that can
    // continue a parent's lane do**, where the fold pass managed 30 of 39. Both
    // came out of the same annealer on the same three measures — crossings,
    // false chains and lane-continuation together — over ninety starts of
    // forty-five thousand moves.
    //
    // **Zero false chains is the claim that did not move** — see the test
    // below — and it is the one the lane principle ranks above a crossing.
    expect(before).toBe(88);
    expect(after).toBe(11);
    expect(after).toBeLessThan(before);
  });

  it('draws Æra I at the floor its own graph allows', () => {
    const ageOne = techChartLayout((id) => techDef(id).age === 1);
    // **One**, and that is a fact about the graph rather than about the search.
    // The re-cut of 2026-09-02 had left every Æra I node with a single
    // prerequisite, so the age's own subgraph was a *tree* and drew at zero; the
    // restoration of the same day put the old two-parent gates back
    // (Bronzeworking, Stonecraft, Letters and The Wheel each want two), and one
    // crossing is the proven floor for exactly that corner — brute-forced in
    // 2026-08-26 over every one of the 1.4M five-lane arrangements of it. Zero
    // is not available to this graph at any lane count, so one is the whole of
    // what the lay can promise, and it delivers it.
    expect(chartCrossings(ageOne)).toBe(1);
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
    // The timeline pass's own measure (user: make the chart read like Civ V's).
    // Fourteen columns, and **no column holds fewer than three nodes or more
    // than six** — bar column 0, which is Agriculture alone and always will be,
    // because it is the one root the tree has.
    expect(ageColumns(1).map((band) => band.column)).toEqual([0, 1, 2, 3]);
    expect(ageColumns(2).map((band) => band.column)).toEqual([4, 5, 6]);
    expect(ageColumns(3).map((band) => band.column)).toEqual([7, 8, 9, 10]);
    expect(ageColumns(4).map((band) => band.column)).toEqual([11, 12, 13]);
    const populations = [1, 2, 3, 4].flatMap((age) =>
      ageColumns(age).map(({ column, costs }) => [column, costs.length] as const),
    );
    expect(populations).toEqual([
      [0, 1], [1, 4], [2, 4], [3, 3],
      [4, 3], [5, 4], [6, 3],
      [7, 4], [8, 6], [9, 3], [10, 3],
      [11, 4], [12, 5], [13, 3],
    ]);
    for (const [column, held] of populations) {
      if (column === 0) continue;
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
    // follow the columns rather than the other way round. Irrigation is hung on
    // the Calendar and on Kingship, which puts it one column past Currency and
    // last in its age; the prices follow from that, and no longer argue with it.
    expect(techColumn('irrigation')).toBeGreaterThan(techColumn('currency'));
    expect(techDef('irrigation').cost).toBeGreaterThan(techDef('currency').cost);
    expect(techDef('irrigation').prereqs).toEqual(['calendar', 'kingship']);
  });
});

describe('fitLanes', () => {
  it('spreads the slack when the lanes fit with room over', () => {
    // 400px of lanes under a 520px stage, five gaps: 24px each would be 520, so
    // the whole 120px of slack is available and the cap is what stops it.
    expect(fitLanes(520, 400, 5)).toEqual({ gap: LANE_GAP_MAX, overflow: 0 });
    // Less slack than the cap wants, so the gap is the slack divided out.
    expect(fitLanes(460, 400, 5)).toEqual({ gap: 12, overflow: 0 });
  });

  it('closes up and reports what still overruns', () => {
    // 600px of lanes under a 500px stage: nothing the gap can do saves it, so
    // it goes to the floor and the remainder is the stage's cue to scroll.
    const fit = fitLanes(500, 600, 5);
    expect(fit.gap).toBe(LANE_GAP_MIN);
    expect(fit.overflow).toBe(600 + LANE_GAP_MIN * 5 - 500);
  });

  it('measures the overrun at the gap it actually chose', () => {
    // The trap this avoids: a chart that overruns by 3px at the closed-up gap
    // must not be reported as fitting because the *wanted* gap was negative.
    const content = 500;
    const available = content + LANE_GAP_MIN * 4 - 3;
    const fit = fitLanes(available, content, 4);
    expect(fit.gap).toBe(LANE_GAP_MIN);
    expect(fit.overflow).toBe(3);
  });

  it('never returns a fractional gap', () => {
    // A fraction of a pixel per lane is a fraction of a pixel of rounding
    // between the height measured and the height laid out, and the measurement
    // is taken again on the next frame — so it would never settle.
    for (let available = 300; available < 900; available += 7) {
      const { gap } = fitLanes(available, 512, 5);
      expect(Number.isInteger(gap), `available ${available}`).toBe(true);
    }
  });

  it('answers a chart nobody has laid out yet without dividing by zero', () => {
    expect(fitLanes(0, 0, 0)).toEqual({ gap: LANE_GAP_MIN, overflow: 0 });
    expect(fitLanes(Number.NaN, 400, 5)).toEqual({ gap: LANE_GAP_MIN, overflow: 0 });
    // A single-lane chart has no gap to size, and asking for one would be a
    // division by zero dressed up as a layout.
    expect(fitLanes(900, 100, 0).gap).toBe(LANE_GAP_MIN);
  });

  /**
   * The pin the fold pass of 2026-09-02 added, and the thing it is guarding is a
   * *silence*: eleven lanes overran the user's window by eight hundred pixels
   * and nothing in the suite said so, because `fitLanes` was only ever asked
   * about miniatures. Æra II read as five technologies for a week.
   *
   * So this asks the question at the size the game is actually played at. **The
   * stage on a 1456×827 window measures 681px** — the viewport less the
   * overlay's padding, the sheet's border and padding, the head and the flex gap
   * — measured in Chrome at the shipped metrics rather than derived, which is
   * why it is a constant here with its provenance written down.
   *
   * Two claims, and neither is "it fits":
   *
   *   · **the pitch is bounded by the stage** whenever the chart fits at all, so
   *     a future lane count re-fits instead of re-clipping; and
   *   · **an overrun is always reported**, at every content height, so the stage
   *     stays scrollable rather than drawing lanes off the bottom edge.
   *
   * The chart at eight lanes is 1032px of cards with the epigrams dropped, which
   * is the second case: it is 351px shorter than eleven lanes were and it still
   * overruns. That is a fact about the *cards* — the shortest node in the set is
   * 60px, and eight of those plus the closed-up gaps already pass 681 — so no
   * lane count the graph permits can clear the fold, and the honest thing for
   * this file to pin is the report rather than a fit that is not available.
   */
  it('bounds the pitch by the stage, and says so when it cannot', () => {
    /** The user's window, measured: `chart.clientHeight` at 1456×827. */
    const STAGE = 681;
    const LANES = TECH_LANE_LIMIT;
    expect(LANES).toBe(8);

    // A chart that fits: every lane's share of the stage — the pitch — is at
    // most what the stage has to give, which is the whole of the fit rule.
    for (let content = 120; content <= STAGE; content += 13) {
      const { gap, overflow } = fitLanes(STAGE, content, LANES);
      const drawn = content + gap * LANES;
      if (overflow > 0) continue;
      expect(drawn, `content ${content}`).toBeLessThanOrEqual(STAGE);
      expect(drawn / LANES, `pitch at content ${content}`).toBeLessThanOrEqual(STAGE / LANES);
    }

    // And one that does not: the gap is at the floor and the remainder is
    // handed back rather than swallowed. 1032 is the shipped chart's own lane
    // height, epigrams dropped (`.is-compact`), measured in Chrome.
    const shipped = fitLanes(STAGE, 1032, LANES);
    expect(shipped.gap).toBe(LANE_GAP_MIN);
    expect(shipped.overflow).toBe(1032 + LANE_GAP_MIN * LANES - STAGE);
    expect(shipped.overflow).toBeGreaterThan(0);

    // And the claim that this is the *cards* and not the lay. A lane is as tall
    // as its tallest card, so the shortest chart any eight-lane arrangement of
    // these fifty could draw is the one that sorts them by height and cuts every
    // seven — the tallest seven sharing one lane, the next seven the next, and
    // so on. Off the measured heights that comes to **845px**, and it overruns
    // too. No re-lay reaches the fold from here; a card-metrics pass or a deeper
    // tree does.
    const BEST_PACKING = 845;
    expect(BEST_PACKING).toBeLessThan(1032);
    expect(fitLanes(STAGE, BEST_PACKING, LANES).overflow).toBeGreaterThan(0);
  });
});

/**
 * The chart on a big display (user, 2026-08-27), which is the sideways half of
 * `fitLanes` and arrived for the same reason: a length that was a constant.
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
 * Currency behind both The Wheel and Letters, which is what makes the cascade
 * worth testing. Re-picked for the re-cut of 2026-09-02: Bronzeworking has one
 * parent now, and a chain of single parents cannot show a ✕ that names two.
 */
const PLAN = ['husbandry', 'theWheel', 'earthenware', 'letters', 'currency'] as const;

describe('the numbered chips', () => {
  it('numbers the plan head-first, counting the current research as 1', () => {
    // The head *is* what the beakers are pointed at (see `researchPlan`), so a
    // numeral is a schedule and not a list of things somebody clicked.
    expect(planPlace(PLAN, 'husbandry')).toBe(1);
    expect(planPlace(PLAN, 'theWheel')).toBe(2);
    expect(planPlace(PLAN, 'currency')).toBe(5);
  });

  it('gives a node that is not in the plan no numeral at all', () => {
    expect(planPlace(PLAN, 'sailing')).toBeNull();
    expect(planPlace([], 'husbandry')).toBeNull();
  });

  it('renumbers rather than remembering — a shorter plan starts again at 1', () => {
    // What a dequeue leaves behind. The chips are derived on every render from
    // the plan as it stands, so a cascade that takes three rows out cannot leave
    // a ④ hanging over a plan of two.
    const after = researchPlanWithout(PLAN, 'husbandry');
    expect(after).toEqual(['earthenware', 'letters']);
    expect(planPlace(after, 'earthenware')).toBe(1);
    expect(planPlace(after, 'husbandry')).toBeNull();
    expect(planPlace(after, 'currency')).toBeNull();
  });

  it('draws nothing at all until there is a queue to be first in', () => {
    // The user's own condition ("when a queue exists on the tech screen"), and
    // one function so the numerals, the hover line and the strip cannot
    // disagree — a lone ① over a node with no list anywhere is the failure.
    expect(planIsQueue([])).toBe(false);
    expect(planIsQueue(['husbandry'])).toBe(false);
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
    expect(planDependants(PLAN, 'theWheel')).toEqual(['currency']);
    expect(dequeueTitle(PLAN, 'theWheel')).toBe(
      'Removes The Wheel and what depends on it: Currency',
    );
    expect(planDependants(PLAN, 'husbandry')).toEqual(['theWheel', 'currency']);
    expect(dequeueTitle(PLAN, 'earthenware')).toBe(
      'Removes Earthenware and what depends on it: Letters, Currency',
    );
  });

  it('says only what it removes when nothing stands on it', () => {
    expect(planDependants(PLAN, 'currency')).toEqual([]);
    expect(dequeueTitle(PLAN, 'currency')).toBe('Removes Currency from the plan');
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
    expect(planDependants(PLAN, 'sailing')).toEqual([]);
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
  it('is laid out before the lanes are spaced', () => {
    // The load-bearing ordering. The strip is a flex sibling of the stage, so it
    // appearing takes real height off `chart.clientHeight` — and `spaceLanes`
    // spends exactly that height on the lanes. Measured the other way round, a
    // chart gains a strip and keeps the gaps it had without one.
    const body = chartFunction('function renderChart(');
    const strip = body.indexOf('renderPlanStrip()');
    const lanes = body.indexOf('spaceLanes(');
    expect(strip).toBeGreaterThanOrEqual(0);
    expect(lanes).toBeGreaterThan(strip);
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
