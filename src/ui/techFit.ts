/**
 * Where the star chart's cards sit, and whether the sky fits the window.
 *
 * The chart travels sideways by design and always has (`techTree.ts`); it was
 * never supposed to travel *down*. For six lanes on a tall screen it did not.
 * Then the tree grew to fifty nodes over fourteen columns and the lane grid —
 * one full-width track per authored row — became the whole problem: **every
 * column paid the height of every lane**, so a column holding three cards drew
 * five empty tracks of night under them and the chart was twelve hundred pixels
 * tall to hold six.
 *
 * The user's own drawing (2026-09-02) is the design authority and it does not
 * work that way: it **packs each column** and aligns only loosely across them —
 * "there's space for a node in between nodes in one column, because they're
 * occupied in another column". So the lane grid is gone and this module is the
 * arithmetic that replaces it:
 *
 *   · **`packChart`** — the layout itself. The authored `row` becomes the law of
 *     *order* within a column and never of position; the cards are stacked with
 *     a minimum gap, the columns are centred against the tallest one, and then a
 *     few rounds of barycentre smoothing pull each card toward the middle of
 *     what it is joined to, projected back onto the order-and-separation
 *     constraints every round so nothing ever crosses its neighbour or leaves
 *     the field.
 *   · **`fitPacked`** — the height's rule, which is `fitColumns` read downward:
 *     close the gaps first, then shrink the whole chart, and only then let it
 *     scroll.
 *   · **`fitColumns`** — unchanged, the sideways half.
 *
 * All three are arithmetic over measurements rather than readers of the DOM, on
 * purpose and for one reason: the measuring belongs to the one place that has a
 * laid-out chart to measure, and the decision belongs somewhere a test can reach
 * without a browser. `packChart` in particular is a **pure function of the data
 * and the measured card heights** — same inputs, same layout, every open — which
 * is the whole of what makes a hand-tuned chart reviewable.
 */

/** Closed up: the least air two cards in a column may be left with. */
export const PACK_GAP_MIN = 10;

/** Opened out: past this the column stops reading as a stack. */
export const PACK_GAP_MAX = 14;

/**
 * How far the chart may be shrunk before it is allowed to scroll instead.
 *
 * Below this the node names stop being legible at the size their type was set
 * for, and an unreadable chart that fits is worse than a readable one that has
 * to be dragged.
 */
export const CHART_SCALE_MIN = 0.85;

/** How many rounds of barycentre smoothing. Past this nothing visibly moves. */
const RELAX_ROUNDS = 8;

/**
 * How much of the way toward the barycentre a card is moved each round.
 *
 * Damped rather than full, because a pair of cards that each want to be at the
 * other's height will otherwise trade places for eight rounds and settle
 * wherever the count happened to leave them. At a half the pair converges on
 * the middle, which is the answer the smoothing is for.
 */
const RELAX_PULL = 0.5;

/** Clearance left when a card is nudged out of a connector's way. */
const CHAIN_CLEARANCE = 3;

/**
 * How many rounds of nudging before the remaining connectors are bowed instead.
 *
 * Generous, because a round does not *land* a whole nudge: pushing one card down
 * pools it with its neighbours in `placeColumn`, which is the constraint doing
 * its job and means the card arrives at what was asked for over several rounds
 * rather than in one. At two dozen there is nothing left of a clearable fault
 * and each round is a walk of the nine connectors that span more than one column.
 */
const CHAIN_ROUNDS = 24;

/** How far a connector bows around a card it could not be cleared of. */
const CHAIN_BOW = 16;

/** One card, as the packer needs it: where it belongs and how tall it measured. */
export interface PackCard {
  id: string;
  /** Dependency depth — `techColumn`. The packer never changes it. */
  column: number;
  /**
   * The authored `row` from `data/techs.json`, which is **the law of order and
   * not of position**: within a column the cards stack in ascending `order` and
   * nothing in here may reorder them. The drawing's top-to-bottom is the user's.
   */
  order: number;
  /** Measured, in pixels. */
  height: number;
}

/** A connector the packer could not clear a card out of, and how far to bow it. */
export interface BowedEdge {
  from: string;
  to: string;
  /** Pixels to push the curve's control points by; signed, away from the card. */
  bow: number;
}

export interface PackedChart {
  /** Every card's top, in field pixels. */
  tops: ReadonlyMap<string, number>;
  /** The tallest packed column, which is the height the chart needs. */
  height: number;
  /** The gap the columns were packed at. */
  gap: number;
  /**
   * The connectors whose straight band still crosses a card that is not one of
   * their endpoints. Empty is the goal and the ordinary answer; what is in it is
   * what `drawLines` bows around, so a false chain is never *drawn* even when the
   * packer could not lay it away.
   */
  bowed: readonly BowedEdge[];
}

/** Where the columns fall, so a connector knows what it passes over. */
export interface PackGeometry {
  columnWidth: number;
  columnGap: number;
}

/** The left edge of a column, in field pixels. */
function columnLeft(column: number, geometry: PackGeometry): number {
  return column * (geometry.columnWidth + geometry.columnGap);
}

/**
 * Lay out one column against what its cards *want*, keeping the order they were
 * authored in and the air between them.
 *
 * This is the constraint projection the whole packer rests on, and it is exact
 * rather than iterative: with the order fixed, "the positions closest to the ones
 * wanted such that each card clears the one above it" is an isotonic regression
 * once the cumulative heights are subtracted out, and pool-adjacent-violators
 * solves that in one pass. Doing it by nudging — push a card down, discover it now
 * overlaps the next one, push that one — is what makes a packer that settles
 * somewhere different depending on which card it looked at first.
 *
 * @param cards   the column's cards, already in authored order.
 * @param wanted  where each would like its *top* to be.
 * @param gap     the least air between two of them.
 * @param height  the field's height; the column is kept inside it.
 */
function placeColumn(
  cards: readonly PackCard[],
  wanted: readonly number[],
  gap: number,
  height: number,
): number[] {
  const count = cards.length;
  if (count === 0) return [];

  // Subtract the run-up — everything above card `i` plus its gaps — so the
  // separation constraint becomes plain "never decreasing".
  const runUp: number[] = [0];
  for (let index = 1; index < count; index += 1) {
    runUp.push(runUp[index - 1]! + cards[index - 1]!.height + gap);
  }
  const slack = height - (runUp[count - 1]! + cards[count - 1]!.height);

  // Pool adjacent violators: blocks of cards that have to move as one, each
  // remembered as a sum and a count so a merge is arithmetic rather than a
  // re-scan.
  const sums: number[] = [];
  const counts: number[] = [];
  for (let index = 0; index < count; index += 1) {
    sums.push(wanted[index]! - runUp[index]!);
    counts.push(1);
    while (sums.length > 1) {
      const last = sums.length - 1;
      const mine = sums[last]! / counts[last]!;
      const above = sums[last - 1]! / counts[last - 1]!;
      if (above <= mine) break;
      sums[last - 1] = sums[last - 1]! + sums[last]!;
      counts[last - 1] = counts[last - 1]! + counts[last]!;
      sums.pop();
      counts.pop();
    }
  }

  const tops: number[] = [];
  let index = 0;
  for (let block = 0; block < sums.length; block += 1) {
    // Clamped into the field: zero at the top, and the column's own slack at the
    // bottom. The value is non-decreasing and both bounds are constants, so
    // clamping every block keeps it that way.
    const at = Math.min(Math.max(sums[block]! / counts[block]!, 0), Math.max(0, slack));
    for (let n = 0; n < counts[block]!; n += 1) {
      tops.push(at + runUp[index]!);
      index += 1;
    }
  }
  return tops;
}

/**
 * The packed chart: every card's top, and the height that takes.
 *
 * Five steps, and the order of them is the whole algorithm. **One** — the cards
 * are grouped by column and sorted by their authored `order`, which is the only
 * time order is decided and is never revisited. **Two** — each column is stacked
 * from zero at the minimum gap, and the tallest such stack is the chart's height,
 * which is where the compaction comes from: a three-card column now costs three
 * cards rather than eight lanes. **Three** — every column is centred against that
 * height, so a short column sits in the middle of its neighbours rather than
 * hanging from the top. **Four** — a few damped rounds of barycentre smoothing
 * pull each card toward the mean centre of the cards it is joined to, each round
 * projected back through `placeColumn`, so the authored order, the minimum gap and
 * the field's own bounds hold at every intermediate state rather than being
 * repaired at the end. **Five** — any connector whose straight band would run
 * through a card that is not one of its endpoints tries to nudge that card clear,
 * and whatever will not clear is reported as a bow for the renderer to draw
 * around.
 *
 * Deterministic throughout: no clock, no randomness, no Map iteration that decides
 * an outcome — the columns are walked in ascending index and the cards inside them
 * in authored order.
 */
export function packChart(
  cards: readonly PackCard[],
  edges: readonly (readonly [string, string])[],
  gap: number,
  geometry: PackGeometry,
): PackedChart {
  if (cards.length === 0) return { tops: new Map(), height: 0, gap, bowed: [] };

  // 1 — the columns, in the authored order and in no other.
  const byColumn = new Map<number, PackCard[]>();
  for (const card of cards) {
    const column = byColumn.get(card.column);
    if (column) column.push(card);
    else byColumn.set(card.column, [card]);
  }
  const columns = [...byColumn.keys()].sort((a, b) => a - b);
  for (const column of columns) {
    // A stable sort on the authored row, with the input order as the tiebreak —
    // two cards authored into the same row of the same column keep the order the
    // file gave them rather than one the sort happened to pick.
    byColumn.get(column)!.sort((a, b) => a.order - b.order);
  }

  // 2 — the height, which is the tallest column packed tight.
  let height = 0;
  for (const column of columns) {
    const stack = byColumn.get(column)!;
    const tall = stack.reduce((sum, card) => sum + card.height, 0) + gap * (stack.length - 1);
    height = Math.max(height, tall);
  }

  // 3 — centred against it.
  const tops = new Map<string, number>();
  for (const column of columns) {
    const stack = byColumn.get(column)!;
    const tall = stack.reduce((sum, card) => sum + card.height, 0) + gap * (stack.length - 1);
    let at = (height - tall) / 2;
    for (const card of stack) {
      tops.set(card.id, at);
      at += card.height + gap;
    }
  }

  const heightOf = new Map(cards.map((card) => [card.id, card.height]));
  const centre = (id: string): number => tops.get(id)! + heightOf.get(id)! / 2;

  // Who each card is joined to, in both directions: the drawing aligns a node
  // with what it comes from *and* with what comes of it, and a chart smoothed on
  // prerequisites alone leans every fan upward.
  const joined = new Map<string, string[]>();
  const join = (a: string, b: string): void => {
    const list = joined.get(a);
    if (list) list.push(b);
    else joined.set(a, [b]);
  };
  for (const [from, to] of edges) {
    if (!heightOf.has(from) || !heightOf.has(to)) continue;
    join(from, to);
    join(to, from);
  }

  // 4 — the smoothing.
  for (let round = 0; round < RELAX_ROUNDS; round += 1) {
    for (const column of columns) {
      const stack = byColumn.get(column)!;
      const wanted = stack.map((card) => {
        const neighbours = joined.get(card.id) ?? [];
        if (neighbours.length === 0) return tops.get(card.id)!;
        const mean = neighbours.reduce((sum, other) => sum + centre(other), 0) / neighbours.length;
        const pull = (mean - card.height / 2 - tops.get(card.id)!) * RELAX_PULL;
        return tops.get(card.id)! + pull;
      });
      const placed = placeColumn(stack, wanted, gap, height);
      for (const [index, card] of stack.entries()) tops.set(card.id, placed[index]!);
    }
  }

  // 5 — the false chains, geometrically.
  const bowed = clearChains(cards, edges, byColumn, columns, tops, heightOf, gap, height, geometry);

  return { tops, height, gap, bowed };
}

/**
 * How far a connector's straight band and a card's box overlap, and which way
 * the card would have to move to be clear of it. Zero when they do not meet.
 *
 * The band is the segment between the two endpoints' edge midpoints, read only
 * across the width the card actually occupies — a connector that passes above a
 * card at its left edge and below it at its right *does* run through it, and a
 * test that only sampled the middle would miss exactly the case that reads as a
 * prerequisite nobody wrote.
 */
function bandOverlap(
  y1: number,
  y2: number,
  x1: number,
  x2: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
): number {
  if (x2 <= x1) return 0;
  const at = (x: number): number => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
  const a = at(Math.max(left, x1));
  const b = at(Math.min(right, x2));
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  if (high <= top || low >= bottom) return 0;
  // Signed: positive means the card should move down to clear the band, negative
  // up. Whichever is the shorter journey.
  const down = high - top + CHAIN_CLEARANCE;
  const up = bottom - low + CHAIN_CLEARANCE;
  return down <= up ? down : -up;
}

/**
 * Push the cards a connector would otherwise run through out of its way, and
 * report the ones that would not go.
 *
 * The false-chain principle survives the loss of the lanes **geometrically**: a
 * line that enters one card and leaves the other side reads as a dependency
 * nobody authored, and it does that whether the cards are in lanes or packed. So
 * it is asked of the boxes rather than of the rows — for every connector, every
 * card in a column strictly between its two ends.
 *
 * A nudge goes back through `placeColumn`, so a card pushed clear of one line
 * cannot land on top of its own neighbour; that is also why this cannot promise
 * to succeed, and why what it fails on is *reported* rather than swallowed. A
 * bowed curve is the honest fallback: the chart still never draws a line through
 * a card, it just goes around rather than between.
 */
function clearChains(
  cards: readonly PackCard[],
  edges: readonly (readonly [string, string])[],
  byColumn: ReadonlyMap<number, PackCard[]>,
  columns: readonly number[],
  tops: Map<string, number>,
  heightOf: ReadonlyMap<string, number>,
  gap: number,
  height: number,
  geometry: PackGeometry,
): BowedEdge[] {
  const columnOf = new Map(cards.map((card) => [card.id, card.column]));
  const live = edges.filter(([from, to]) => columnOf.has(from) && columnOf.has(to));

  /** Every (edge, card) pair that still meets, with the push that would part them. */
  const faults = (): { from: string; to: string; card: string; push: number }[] => {
    const found: { from: string; to: string; card: string; push: number }[] = [];
    for (const [from, to] of live) {
      const a = columnOf.get(from)!;
      const b = columnOf.get(to)!;
      if (b - a < 2) continue;
      const x1 = columnLeft(a, geometry) + geometry.columnWidth;
      const x2 = columnLeft(b, geometry);
      const y1 = tops.get(from)! + heightOf.get(from)! / 2;
      const y2 = tops.get(to)! + heightOf.get(to)! / 2;
      for (const column of columns) {
        if (column <= a || column >= b) continue;
        for (const card of byColumn.get(column)!) {
          const left = columnLeft(column, geometry);
          const top = tops.get(card.id)!;
          const push = bandOverlap(
            y1,
            y2,
            x1,
            x2,
            left,
            left + geometry.columnWidth,
            top,
            top + card.height,
          );
          if (push !== 0) found.push({ from, to, card: card.id, push });
        }
      }
    }
    return found;
  };

  for (let round = 0; round < CHAIN_ROUNDS; round += 1) {
    const found = faults();
    if (found.length === 0) return [];
    // One push per card — the largest it was asked for — so two connectors that
    // want a card moved opposite ways do not cancel into standing still.
    const push = new Map<string, number>();
    for (const fault of found) {
      const held = push.get(fault.card);
      if (held === undefined || Math.abs(fault.push) > Math.abs(held)) {
        push.set(fault.card, fault.push);
      }
    }
    for (const column of columns) {
      const stack = byColumn.get(column)!;
      if (!stack.some((card) => push.has(card.id))) continue;
      const wanted = stack.map((card) => tops.get(card.id)! + (push.get(card.id) ?? 0));
      const placed = placeColumn(stack, wanted, gap, height);
      for (const [index, card] of stack.entries()) tops.set(card.id, placed[index]!);
    }
  }

  // Whatever is left is drawn around instead of laid around. One bow per
  // connector, in the direction of the card it could not clear.
  const bowed = new Map<string, BowedEdge>();
  for (const fault of faults()) {
    const key = `${fault.from}>${fault.to}`;
    if (bowed.has(key)) continue;
    bowed.set(key, {
      from: fault.from,
      to: fault.to,
      bow: fault.push > 0 ? -CHAIN_BOW : CHAIN_BOW,
    });
  }
  return [...bowed.values()];
}

export interface PackedFit {
  /** What the whole chart is scaled by, between `CHART_SCALE_MIN` and 1. */
  scale: number;
  /** How far it still overruns the stage at that scale — the cue to scroll. */
  overflow: number;
}

/**
 * Whether a packed chart of `content` pixels fits `available`, and what to do
 * about it if not.
 *
 * `fitColumns`' rule read downward, with the same three parts and one more
 * ordering the sideways half does not need. The caller closes the gaps first —
 * that is `packChart` at `PACK_GAP_MIN` and it is the cheapest height there is,
 * because it costs nothing but air. Only then is this asked, and it answers in
 * the two remaining steps: **shrink** the whole chart, which keeps every node on
 * one screen at the price of smaller type, and stop at `CHART_SCALE_MIN`, past
 * which the names stop being readable; then **report what still overruns**, which
 * is the stage's cue to let the chart be dragged downward as well as across.
 *
 * @param available the stage's usable height, in pixels.
 * @param content   the packed chart's own height.
 */
export function fitPacked(available: number, content: number): PackedFit {
  if (!Number.isFinite(available) || !Number.isFinite(content) || available <= 0 || content <= 0) {
    return { scale: 1, overflow: 0 };
  }
  if (content <= available) return { scale: 1, overflow: 0 };
  const scale = Math.max(CHART_SCALE_MIN, available / content);
  return { scale, overflow: Math.max(0, content * scale - available) };
}

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
 * So the width is the height's rule read sideways (`fitPacked`), with the same
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
 * Arithmetic over measurements, and separated from the DOM for `packChart`'s
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
