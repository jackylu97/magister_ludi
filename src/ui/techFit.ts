/**
 * How much air to put between the star chart's lanes, so the sky fits the window.
 *
 * The chart travels sideways by design and always has (`techTree.ts`); it was
 * never supposed to travel *down*, and for six lanes on a tall screen it did
 * not. Then the sea lane landed and a seventh appeared, and on a 900px window
 * the bottom lane was simply below the fold — with the wheel turned sideways
 * there was no gesture that would have found it.
 *
 * Re-laying the tree to fewer lanes (`TECH_LANE_LIMIT` — five when this was
 * written, eight since the fold pass of 2026-09-02) is the real fix and this
 * is the other half of it: with the lanes counted, the gap between them is what
 * is left over, spread evenly, and the chart uses the height it is given instead
 * of a constant somebody typed. Two directions it can go:
 *
 *   · **The lanes fit with room to spare.** The slack is divided between them,
 *     up to `LANE_GAP_MAX`. A five-lane chart on a 1440×900 screen breathes
 *     rather than huddling at the top with a band of ink under it.
 *   · **They do not.** The gap closes to `LANE_GAP_MIN` — which recovers real
 *     height, four gaps of it — and whatever still overruns is reported as
 *     `overflow`, which is the stage's cue to let the chart be dragged and
 *     wheeled downward as well as across.
 *
 * It is arithmetic over measurements rather than a reader of the DOM on purpose:
 * the measuring belongs to the one place that has a laid-out chart to measure,
 * and the decision belongs somewhere a test can reach without a browser.
 */

/** Closed up: the least air two lanes may be left with. */
export const LANE_GAP_MIN = 8;

/** Opened out: past this the lanes stop reading as one chart and start drifting. */
export const LANE_GAP_MAX = 24;

/** Narrowed all the way: the width a node card was drawn for. */
export const COL_WIDTH_MIN = 214;

/**
 * Opened out: past this a node stops being a card and becomes a banner.
 *
 * The cap is what keeps a 4K window from drawing eight 430px slabs with four
 * words in each. Beyond it the chart stops widening and is **centred** instead,
 * which is the honest answer to "there is more room than this chart wants".
 */
export const COL_WIDTH_MAX = 300;

export interface ColumnFit {
  /** The width one column is drawn at, between the two bounds above. */
  width: number;
  /**
   * Air left over once every column has taken its share, in pixels. Zero
   * whenever the chart is wider than the stage — which is the ordinary case at
   * 1440p and the reason this is returned rather than assumed: it is also the
   * answer to "should the chart be centred".
   */
  slack: number;
}

/**
 * How wide a column is when there are `columns` of them in `available` pixels.
 *
 * **The high-resolution note** (user, 2026-08-27), and the diagnosis is the
 * plainest kind: the column was a constant in the stylesheet. Eight columns at
 * 214px with 52px gutters is a chart about 2080px wide, which is *wider* than
 * the window this game was drawn on and *narrower* than a 2560 or 3840 one — so
 * past about 2100px the chart stopped growing and simply sat in the top-left of
 * an enormous field of ink, with the age washes ending in the middle of the
 * screen and nothing but night to their right. Nothing was broken; the chart had
 * just stopped using the room.
 *
 * So the width is the height's rule read sideways (`fitLanes`), with the same
 * three parts and for the same reasons:
 *
 *   · **it takes what it is given**, split evenly between the columns, once the
 *     gutters are paid for;
 *   · **it is bounded both ways** — floored at the width the card's type was
 *     drawn for, so a narrow window scrolls exactly as it always has, and capped
 *     so a very wide one does not stretch four words across a banner;
 *   · **what is left over is reported**, because a chart that has hit its cap on
 *     a 4K screen should be *centred* in the room rather than left hanging off
 *     the left edge. That is the caller's job and it needs the number.
 *
 * Arithmetic over measurements, and separated from the DOM for `fitLanes`'
 * reason exactly: the measuring belongs to the one place with a laid-out chart,
 * and the decision belongs somewhere a test can reach without a browser.
 *
 * @param available  the stage's usable width, in pixels.
 * @param columns    how many columns the chart has — `techColumnCount`.
 * @param gap        the gutter between two columns, in pixels.
 */
export function fitColumns(available: number, columns: number, gap: number): ColumnFit {
  // A stage nobody has laid out yet measures zero, and a chart with no columns
  // has nothing to size. Both answer with the drawn-for width rather than with a
  // division by zero or a column sized from a width that is not real yet.
  if (!(columns > 0) || !Number.isFinite(available) || available <= 0) {
    return { width: COL_WIDTH_MIN, slack: 0 };
  }
  const gutters = gap * Math.max(0, columns - 1);
  const share = (available - gutters) / columns;
  const width = Math.max(COL_WIDTH_MIN, Math.min(COL_WIDTH_MAX, Math.floor(share)));
  return { width, slack: Math.max(0, available - (width * columns + gutters)) };
}

export interface LaneFit {
  /** Pixels of air between one lane and the next. */
  gap: number;
  /**
   * How far the chart still overruns the stage at that gap, in pixels. Zero
   * when it fits — which is also the answer to "may this chart be scrolled
   * down", and the reason it is returned rather than recomputed by the caller.
   */
  overflow: number;
}

/**
 * @param available  the stage's usable height, in pixels.
 * @param content    the height of the lanes themselves, gaps excluded.
 * @param gaps       how many gaps there are — one fewer than the tracks, so a
 *                   chart of five lanes under an age strip has five.
 */
export function fitLanes(available: number, content: number, gaps: number): LaneFit {
  // A stage nobody has laid out yet measures zero, and a chart of one track has
  // no gap to size. Both answer with the closed-up figure rather than with a
  // division by zero or a gap sized from a height that is not real yet.
  if (!(gaps > 0) || !Number.isFinite(available) || !Number.isFinite(content)) {
    return { gap: LANE_GAP_MIN, overflow: 0 };
  }
  const slack = available - content;
  const wanted = slack / gaps;
  const gap = Math.max(LANE_GAP_MIN, Math.min(LANE_GAP_MAX, Math.floor(wanted)));
  // Measured at the gap actually used, not at the one that was wanted: closing
  // the lanes up is what decides whether the chart still overruns.
  const overflow = Math.max(0, content + gap * gaps - available);
  return { gap, overflow };
}
