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
    const column = techDepth(id);
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
    // **Re-measured for the tree re-cut of 2026-09-02** (Entry LVIII). The
    // 2026-08-26 re-lay was judged at 25 against 11 over twenty-six nodes; the
    // 2026-08-30 tree measured 323 against 179 over fifty-three. Revision 3's
    // forty-nine nodes are a *wide* graph rather than a deep one — seven columns
    // instead of twelve, the widest holding eleven — and it lays much flatter:
    // **31 dealt naively into the same eleven lanes, 5 for the layout in the
    // file.** The inequality is the rule; the numbers are here so a future
    // re-lay has to say out loud which direction it moved them.
    //
    // The lanes were searched rather than eyeballed (annealing on crossings,
    // false chains and lane-continuation together), which is what
    // `chartCrossings` was written for in the first place: a metric that can
    // only be pointed at the current data cannot say whether the current data is
    // any good.
    //
    // **Zero false chains is the claim that did not move** — see the test below
    // — and it is the one the lane principle ranks above a crossing.
    expect(before).toBe(31);
    expect(after).toBe(5);
    expect(after).toBeLessThan(before);
  });

  it('draws Æra I flat, which the old corner could not be', () => {
    const ageOne = techChartLayout((id) => techDef(id).age === 1);
    // **Zero**, and that is a fact about the graph rather than about the search:
    // the re-cut of 2026-09-02 left every Æra I node with a single prerequisite,
    // so the age's own subgraph is a *tree* and a tree always draws flat. The
    // chart this replaced could not — one crossing was the proven floor for the
    // 2026-08-26 corner, over every one of the 1.4M five-lane arrangements —
    // which is the clearest single reading of what the re-cut did to the shape.
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
    // the number of nodes that have any children at all — thirty of the
    // forty-nine — and the shipped layout takes two thirds of it while holding
    // the crossings at five. A ratio quoted against 49 would read as a failure
    // of the lay when it is a fact about a wide tree.
    const donors = new Set(TECH_IDS.flatMap((id) => techDef(id).prereqs)).size;
    expect(continuing.length).toBeGreaterThanOrEqual(donors * 0.65);
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
