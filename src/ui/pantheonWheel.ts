/**
 * The pantheon as a wheel: where each god's house sits on it.
 *
 * The axes came off the screen (`religionScreen.ts`, `AXIS_MARK`: "the axis has
 * no player-facing name, and that is deliberate"). They were removed because a
 * printed axis name read as a *category the player was choosing between*, which
 * is not what an axis is — it is a designer's thread, there so that a second god
 * on your thread is findable. Removing the word left the thread with nothing to
 * say it, and this is the art pass's answer: **the axes come back as geometry.**
 * Gods of one axis occupy adjacent houses, so synergy is something you see
 * rather than something you are told.
 *
 * The **arithmetic** is pure and is separated from the drawing for the reason
 * `splitYieldText` and `meterGroups` are: this suite has no jsdom, and *which
 * house a god is in and where that house is* is the half that can be quietly
 * wrong in a way no screenshot catches — a sector that wraps past twelve
 * o'clock, a run of one axis split by another, eighteen slices that come to 359
 * degrees.
 *
 * The **drawing** is at the foot of the file (`drawPantheonWheel`), and it is
 * here rather than on the religion screen because it now has two callers: the
 * screen, and the flair gallery, which draws the same wheel with a held set
 * nobody has played to so that the lit and unlit states can be seen together.
 * It touches the DOM only inside its own body — nothing at module scope does —
 * so the pure half is still importable by a test that has no `document`.
 *
 * The wheel is drawn from the pool, not from the table
 * ---------------------------------------------------
 * The layout takes the ids it is to lay out. Today that is every belief there
 * is, held or not, because the wheel *is* the pool — an unheld house has to
 * keep its place or holding a god would rearrange the sky. It takes them as an
 * argument all the same, so the drawing has no opinion about which beliefs
 * exist and a test can lay out four.
 *
 * The shape of the data, honestly
 * -------------------------------
 * The design sketch said "six sectors, three houses each". The table says
 * otherwise: eighteen beliefs over ten axes, in runs of three, two and one
 * (`data/religion.json`). A wheel drawn to the sketch would have had to lie
 * about the data or the data would have had to be rewritten to suit a drawing,
 * and neither is a trade this project makes. So the wheel is **eighteen equal
 * houses**, grouped into however many runs the axes actually come in: every
 * house is the same size, which is the honest reading of "a god is a god", and
 * a three-god axis simply owns three times the arc of a lonely one. Adjacency —
 * the whole point — is exact either way.
 *
 * Angles
 * ------
 * Degrees, clockwise, **zero at twelve o'clock**, which is how a horoscope
 * wheel and a compass rose are both read and therefore how anybody reading this
 * one will expect it to go. `wheelPoint` is the one place that is converted to
 * the screen's own convention (zero at three o'clock, y down), so no drawing
 * code does trigonometry twice.
 */

import {
  type BeliefAxis,
  type BeliefId,
  BELIEF_AXES,
  BELIEF_IDS,
  beliefDef,
} from '../sim/religionData';

/** One god's place on the wheel. */
export interface WheelHouse {
  id: BeliefId;
  axis: BeliefAxis;
  /** Its place in the ring, clockwise from twelve o'clock. */
  index: number;
  /** Which run of same-axis houses it belongs to — an index into `sectors`. */
  sector: number;
  /** The arc this house owns, in degrees clockwise from twelve o'clock. */
  startAngle: number;
  endAngle: number;
  /** The angle the glyph sits on: the middle of the arc. */
  midAngle: number;
}

/** One run of adjacent houses sharing an axis. */
export interface WheelSector {
  axis: BeliefAxis;
  /** How many houses it spans. */
  houses: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
}

export interface WheelLayout {
  houses: WheelHouse[];
  sectors: WheelSector[];
}

/**
 * The gods in wheel order: by axis, in `BELIEF_AXES`' order, and within an axis
 * in the order the table declares them.
 *
 * `BELIEF_AXES` is "the axes in the order a screen lays them out", which is a
 * promise the table made to a screen that did not exist yet. This is that
 * screen. Sorting through it rather than through a `Map`'s insertion order is
 * also what makes the ring stable: two runs of the same pool lay out
 * identically, always, which a wheel a player is learning the shape of needs
 * far more than the sim does.
 *
 * An id whose axis is not in `BELIEF_AXES` cannot happen — the union is closed
 * — but if the table ever grows one it lands after everything else rather than
 * disappearing, because a god you hold must have a house.
 */
export function wheelOrder(ids: readonly BeliefId[]): BeliefId[] {
  const axisRank = new Map<BeliefAxis, number>(BELIEF_AXES.map((axis, index) => [axis, index]));
  // Both keys are read off the **table**, never off the argument's own order.
  // Sorting by the caller's index inside an axis would have been the obvious
  // tie-break and is the wrong one: it makes the ring a function of how the
  // pool was filtered, so a player who consecrates one god watches the rest of
  // that god's thread shuffle.
  const idRank = new Map<BeliefId, number>(BELIEF_IDS.map((id, index) => [id, index]));
  const beyond = BELIEF_AXES.length;
  return [...ids].sort((a, b) => {
    const byAxis =
      (axisRank.get(beliefDef(a).axis) ?? beyond) - (axisRank.get(beliefDef(b).axis) ?? beyond);
    return byAxis !== 0 ? byAxis : (idRank.get(a) ?? 0) - (idRank.get(b) ?? 0);
  });
}

/**
 * The whole wheel: every house's arc, and the runs those houses group into.
 *
 * Equal slices, and the arithmetic is done from the *index* rather than by
 * adding a step in a loop — `index * 360 / n` — so the last house's end is
 * exactly 360 rather than eighteen roundings of 20 degrees. A wheel with a
 * hairline gap at twelve o'clock is the classic tell of the other spelling.
 *
 * An empty pool is an empty wheel rather than a division by zero: the religion
 * screen asks for one before Divination is researched, and a screen that threw
 * there would be a black overlay on a legal game state.
 */
export function pantheonWheelLayout(ids: readonly BeliefId[]): WheelLayout {
  const ordered = wheelOrder(ids);
  const count = ordered.length;
  const houses: WheelHouse[] = [];
  const sectors: WheelSector[] = [];
  if (count === 0) return { houses, sectors };

  const step = 360 / count;
  ordered.forEach((id, index) => {
    const axis = beliefDef(id).axis;
    const startAngle = (index * 360) / count;
    const endAngle = ((index + 1) * 360) / count;
    // A run continues while the axis does. The neutral axis is a run like any
    // other: `'none'` is most of the good gods, and a wheel that scattered them
    // would be saying they are unrelated when what they share is that they are
    // for everybody.
    const open = sectors[sectors.length - 1];
    if (open === undefined || open.axis !== axis) {
      sectors.push({ axis, houses: 1, startAngle, endAngle, midAngle: startAngle + step / 2 });
    } else {
      open.houses += 1;
      open.endAngle = endAngle;
      open.midAngle = (open.startAngle + open.endAngle) / 2;
    }
    houses.push({
      id,
      axis,
      index,
      sector: sectors.length - 1,
      startAngle,
      endAngle,
      midAngle: (startAngle + endAngle) / 2,
    });
  });
  return { houses, sectors };
}

/**
 * A point on the wheel, in the SVG's own coordinates.
 *
 * The one conversion in the module: the wheel's angles are clockwise from
 * twelve o'clock and the screen's are counter-clockwise from three o'clock with
 * `y` growing downward, which cancel to `sin` for `x` and `−cos` for `y`. Doing
 * it once here is what keeps a drawing from developing a second, subtly
 * different idea of which way is up.
 */
export function wheelPoint(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.sin(radians), y: cy - radius * Math.cos(radians) };
}

/**
 * One house as a closed path: the annular wedge between two radii.
 *
 * Written as `M outer-start · A outer · L inner-end · A inner back · Z`, which
 * is the shape a horoscope house actually is — a ring segment, not a pie slice
 * — because the hub in the middle carries the count of open places and a wedge
 * that ran to the centre would bury it.
 *
 * `large-arc` is computed rather than pinned to `0`: eighteen houses never
 * reach 180 degrees, but four beliefs in a test do, and a flag that is only
 * right for the shipped table is a flag that is wrong the first time the table
 * changes.
 */
export function housePath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  const a = wheelPoint(cx, cy, outer, startAngle);
  const b = wheelPoint(cx, cy, outer, endAngle);
  const c = wheelPoint(cx, cy, inner, endAngle);
  const d = wheelPoint(cx, cy, inner, startAngle);
  const n = (value: number): string => String(Math.round(value * 100) / 100);
  return (
    `M${n(a.x)} ${n(a.y)}` +
    `A${n(outer)} ${n(outer)} 0 ${large} 1 ${n(b.x)} ${n(b.y)}` +
    `L${n(c.x)} ${n(c.y)}` +
    `A${n(inner)} ${n(inner)} 0 ${large} 0 ${n(d.x)} ${n(d.y)}Z`
  );
}

// --- the drawing ------------------------------------------------------------

/**
 * The wheel's own dimensions, in the SVG's 100×100 user space.
 *
 * Written once here rather than at each call site because the four of them are
 * a *proportion* and not four independent numbers: the houses are the ring
 * between `inner` and `outer`, the hub has to clear the ring by enough that the
 * figure in it never touches a glyph, and the glyph rides the middle of the
 * band. Changing the look of the wheel is changing these four.
 */
export const WHEEL = { centre: 50, outer: 46, inner: 29, hub: 21 } as const;

/** An SVG element, with a class. `element`'s twin one namespace over. */
function svgNode<K extends keyof SVGElementTagNameMap>(
  tag: K,
  className?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (className !== undefined) node.setAttribute('class', className);
  return node;
}

/**
 * What the drawing needs that the arithmetic cannot know.
 *
 * The two callbacks are the reason this is a function of *four* things rather
 * than of a `GameState`. A house's glyph and its tooltip are facts about a
 * belief — the axis mark the religion screen already owns, and the clause list
 * `describeCard` prints — and reaching for either from here would drag the
 * whole religion screen's vocabulary into a module whose test runs without a
 * DOM. Handed in, the drawing has no opinion about what a belief *is*, which is
 * what lets a gallery lay out four of them with invented held sets.
 */
export interface PantheonWheelOptions {
  layout: WheelLayout;
  /** Which gods this seat has consecrated. Everything else is drawn outlined. */
  held: ReadonlySet<BeliefId>;
  /** How many places the seat has, for the hub's figure. */
  slots: number;
  /** The mark that rides the middle of a house's band. */
  glyph: (axis: BeliefAxis) => string;
  /** The platform tooltip. Omitted draws no `<title>` at all. */
  tooltip?: (id: BeliefId) => string;
}

/**
 * The pool as a wheel: one house per god, runs of an axis adjacent.
 *
 * Extracted from `religionScreen.ts` unchanged, so that the flair gallery can
 * draw the same object with a held set nobody has played to — which is the only
 * way to see the lit, unlit and hub states side by side. The screen calls it
 * with its own two callbacks and gets exactly the SVG it built before.
 *
 * Every god in the pool gets a house, held or not, and the wheel never
 * reorders: consecrating one lights its house and moves nothing. A ring that
 * rearranged as it filled would be a sky a player could never learn.
 *
 * Two states and no third — lit, or outlined. The hub carries the same figure
 * the eyebrow above it does, because there is exactly one answer to "how many
 * places are open" and two places to read it should not be two numbers.
 */
export function drawPantheonWheel(options: PantheonWheelOptions): SVGSVGElement {
  const { layout, held, slots, glyph, tooltip } = options;
  const { centre, outer, inner, hub } = WHEEL;
  const svg = svgNode('svg', 'rel-wheel');
  svg.setAttribute('viewBox', '0 0 100 100');
  // Decoration with a text equivalent beside it: the eyebrow says how many
  // gods of how many places, and each house's own name is on its slot card.
  // A reader walked through eighteen unlabelled arcs would be worse served.
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const houses = svgNode('g', 'rel-wheel-houses');
  for (const house of layout.houses) {
    const group = svgNode('g', held.has(house.id) ? 'rel-house is-held' : 'rel-house');
    // The accent resolves through `style.css`'s `[data-axis]` block, exactly
    // as a slot card's does — one fact about one god, one colour, wherever it
    // is drawn.
    group.setAttribute('data-axis', house.axis);
    if (tooltip) {
      const title = svgNode('title');
      title.textContent = tooltip(house.id);
      group.append(title);
    }
    const face = svgNode('path', 'rel-house-face');
    face.setAttribute(
      'd',
      housePath(centre, centre, inner, outer, house.startAngle, house.endAngle),
    );
    group.append(face);
    const seat = wheelPoint(centre, centre, (inner + outer) / 2, house.midAngle);
    const mark = svgNode('text', 'rel-house-glyph');
    mark.setAttribute('x', String(Math.round(seat.x * 100) / 100));
    mark.setAttribute('y', String(Math.round(seat.y * 100) / 100));
    mark.textContent = glyph(house.axis);
    group.append(mark);
    houses.append(group);
  }
  svg.append(houses);

  // The seams. One spoke where a run ends, and none inside a run: the whole
  // claim the wheel makes is that these three houses are one thing.
  for (const sector of layout.sectors) {
    const a = wheelPoint(centre, centre, inner, sector.startAngle);
    const b = wheelPoint(centre, centre, outer, sector.startAngle);
    const spoke = svgNode('line', 'rel-wheel-spoke');
    spoke.setAttribute('x1', String(a.x));
    spoke.setAttribute('y1', String(a.y));
    spoke.setAttribute('x2', String(b.x));
    spoke.setAttribute('y2', String(b.y));
    svg.append(spoke);
  }

  for (const radius of [outer, inner]) {
    const rim = svgNode('circle', 'rel-wheel-rim');
    rim.setAttribute('cx', String(centre));
    rim.setAttribute('cy', String(centre));
    rim.setAttribute('r', String(radius));
    svg.append(rim);
  }

  const disc = svgNode('circle', 'rel-wheel-hub');
  disc.setAttribute('cx', String(centre));
  disc.setAttribute('cy', String(centre));
  disc.setAttribute('r', String(hub));
  svg.append(disc);

  const count = svgNode('text', 'rel-wheel-count');
  count.setAttribute('x', String(centre));
  count.setAttribute('y', String(centre - 2));
  count.textContent = `${held.size}/${slots}`;
  svg.append(count);
  // The word under the figure is one the screen already prints (the eyebrow
  // above the wheel says "pantheon"): the hub names what it is counting and
  // introduces no vocabulary of its own.
  const word = svgNode('text', 'rel-wheel-of');
  word.setAttribute('x', String(centre));
  word.setAttribute('y', String(centre + 7));
  word.textContent = 'pantheon';
  svg.append(word);
  return svg;
}
