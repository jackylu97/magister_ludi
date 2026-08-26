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
  techDataProblems,
  techDef,
  techDepth,
} from '../../src/sim/techData';
import { LANE_GAP_MAX, LANE_GAP_MIN, fitLanes } from '../../src/ui/techFit';

/**
 * The lanes as they were authored before 2026-08-26: one lane per theme, seven
 * of them, the seventh holding Sailing alone. Written down rather than derived
 * because it is the *before* half of a before-and-after, and a before that could
 * be recomputed from the file would only ever equal the after.
 */
const LANES_BEFORE: Record<string, number> = {
  agriculture: 2,
  husbandry: 0,
  fletching: 1,
  sailing: 6,
  mining: 2,
  earthenware: 3,
  bronzeWorking: 2,
  stonecraft: 3,
  calendar: 4,
  divination: 5,
  theWheel: 0,
  letters: 4,
  ironWorking: 2,
  construction: 1,
  mathematics: 4,
  currency: 3,
  philosophy: 5,
  engineering: 3,
  drama: 4,
  feudalism: 2,
  machinery: 1,
  theology: 5,
  chivalry: 0,
  steel: 2,
  physics: 3,
  education: 5,
};

/** The same graph and the same columns, re-laid into the old lanes. */
function layoutBefore(): ChartLayout {
  const now = techChartLayout();
  const cells = new Map<string, ChartCell>();
  for (const [id, cell] of now.cells) {
    const row = LANES_BEFORE[id];
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
    // The figures the 2026-08-26 re-lay was judged on. The inequality is the
    // rule; the numbers are here so that a future re-lay has to say out loud
    // which direction it moved them.
    expect(before).toBe(24);
    expect(after).toBe(11);
    expect(after).toBeLessThanOrEqual(before);
  });

  it('leaves exactly one crossing inside Age I, which is the minimum', () => {
    const ageOne = techChartLayout((id) => techDef(id).age === 1);
    // Not zero, and not for want of trying: a brute force over every one of the
    // 1.4M ways to arrange Age I's four columns in five lanes finds one crossing
    // at best, and a hill climb finds the same at six, seven, eight and twelve.
    // Age I's own subgraph cannot be drawn flat, so one is the floor and this is
    // a regression pin rather than an aspiration. The old lanes managed seven.
    expect(chartCrossings(ageOne)).toBe(1);
    expect(chartCrossings(ageOne)).toBeLessThan(
      chartCrossings({
        cells: new Map(
          [...ageOne.cells].map(([id, cell]) => [id, { column: cell.column, row: LANES_BEFORE[id]! }]),
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

  it('keeps every tech inside the five lanes the window has room for', () => {
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
    expect(continuing.length).toBeGreaterThanOrEqual(TECH_IDS.length * 0.6);
    // And the root sits in the middle lane, so its five children fan evenly.
    expect(techDepth('agriculture')).toBe(0);
    expect(techDef('agriculture').row).toBe(Math.floor(TECH_LANE_LIMIT / 2));
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
});
