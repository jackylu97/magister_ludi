/**
 * How much air to put between the star chart's lanes, so the sky fits the window.
 *
 * The chart travels sideways by design and always has (`techTree.ts`); it was
 * never supposed to travel *down*, and for six lanes on a tall screen it did
 * not. Then the sea lane landed and a seventh appeared, and on a 900px window
 * the bottom lane was simply below the fold — with the wheel turned sideways
 * there was no gesture that would have found it.
 *
 * Re-laying the tree to five lanes (`TECH_LANE_LIMIT`) is the real fix and this
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
