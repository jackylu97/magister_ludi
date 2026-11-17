/**
 * The marks of the Order card's emblem face (batch SS10, `src/ui/orderFace.ts`).
 *
 * The board is `docs/plans/mockups/scholars-study/order-card-faces.html`,
 * "Face 1, the emblem", which the user approved on 2026-11-17. The board's
 * corner marks are its designer's quick drawings on a 16-unit grid. They are
 * drawn again here on the yield marks' 24-unit grid, so they sit in the same
 * set as the other small marks:
 *
 *   - the corner flourish of an uncommon card;
 *   - the eight-pointed star in the corners of a rare card and a Doctrine;
 *   - the sun and the moon in the picture's top corners on a rare card and a
 *     Doctrine, and in a Doctrine's top corners.
 *
 * The device itself (the engraved disc behind the deck's suit) is drawn from
 * numbers here as well: the glory of rays and the hatching inside the disc.
 * Both are single path strings on the device's 100-unit box, so a card draws
 * its device with a few elements and no pattern ids. The suits are the game's
 * own drawings (`SUIT_MARKS`, `src/ui/suitFace.ts`), and this file does not
 * draw them again.
 *
 * The marks reach the card as CSS masks (`orderFaceMarkUri`), filled with the
 * card's ink, so the stylesheet decides their colour and one drawing serves
 * every card of a rarity.
 */

import { type MarkPath, markSvg } from './resourceMarks';
import { YIELD_MARK_BOX } from './yieldMarks';

/** One mark: what it shows, its paths, and its stroke weight on the 24-unit grid. */
export interface OrderFaceMark {
  note: string;
  paths: readonly MarkPath[];
  stroke: number;
}

/** Two decimals, trailing zeroes gone, so the path data stays readable. */
function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** A point on a circle, with the angle in degrees measured from the positive x axis. */
function polar(cx: number, cy: number, r: number, degrees: number): [number, number] {
  const angle = (degrees * Math.PI) / 180;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/**
 * A star with `points` equal points, its first point straight up. `inner` is
 * the radius of the notches between the points.
 */
export function starPath(cx: number, cy: number, points: number, outer: number, inner: number): string {
  const step = 360 / points;
  const corners: string[] = [];
  for (let index = 0; index < points; index += 1) {
    const tip = polar(cx, cy, outer, -90 + index * step);
    const notch = polar(cx, cy, inner, -90 + index * step + step / 2);
    corners.push(`${n(tip[0])} ${n(tip[1])}`, `${n(notch[0])} ${n(notch[1])}`);
  }
  return `M${corners.join('L')}Z`;
}

/** A closed circle as path data. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
}

/**
 * **The corner flourish** of an uncommon card, drawn for the top left corner.
 * The other three corners are the same mark mirrored by the stylesheet.
 *
 * An arc that turns the corner, a small scroll inside it off the left side, a
 * longer scroll off the foot, and a dot in the corner itself.
 */
export const CORNER_FLOURISH: OrderFaceMark = {
  note: 'a corner flourish: an arc round the corner, two scrolls inside it and a dot in the corner',
  stroke: 2.4,
  paths: [
    { d: 'M3 21C3 10.5 10.5 3 21 3' },
    { d: 'M3 13.5C7.5 13.5 10.5 10.5 10.5 6' },
    { d: 'M9 21C9 16.5 12 13.5 16.5 13.5C19.5 13.5 21 15 21 18' },
    { d: circlePath(4.5, 4.5, 2.1), fill: true, width: 0 },
  ],
};

/** **The eight-pointed star**, filled: the corners of a rare card. */
export const CORNER_STAR: OrderFaceMark = {
  note: 'an eight-pointed star, filled',
  stroke: 0,
  paths: [{ d: starPath(12, 12, 8, 11.5, 4.6), fill: true, width: 0 }],
};

/** **The sun**: a disc and eight rays, the long four on the axes. */
export const CORNER_SUN: OrderFaceMark = {
  note: 'the sun: a disc and eight rays',
  stroke: 2,
  paths: [
    { d: circlePath(12, 12, 4.8) },
    {
      d: [0, 45, 90, 135, 180, 225, 270, 315]
        .map((degrees) => {
          const inner = degrees % 90 === 0 ? 7.4 : 7.2;
          const outer = degrees % 90 === 0 ? 10.8 : 9.6;
          const [x1, y1] = polar(12, 12, inner, degrees);
          const [x2, y2] = polar(12, 12, outer, degrees);
          return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
        })
        .join(''),
    },
  ],
};

/**
 * **The moon**: a crescent, its horns to the upper right. The outer edge is a
 * circle of radius 9 round (11, 13), and the inner edge a circle of radius 7.5
 * round (15.5, 8.5). The two horns are where the circles cross.
 */
export const CORNER_MOON: OrderFaceMark = {
  note: 'the moon: a crescent with its horns to the upper right',
  stroke: 2,
  paths: [{ d: 'M9.39 4.14A9 9 0 1 0 19.86 14.61A7.5 7.5 0 0 1 9.39 4.14Z' }],
};

/** The four corner marks by name, for the stylesheet's masks and the flair gallery. */
export const ORDER_FACE_MARKS = {
  flourish: CORNER_FLOURISH,
  star: CORNER_STAR,
  sun: CORNER_SUN,
  moon: CORNER_MOON,
} as const;

export type OrderFaceMarkId = keyof typeof ORDER_FACE_MARKS;

const uriCache = new Map<OrderFaceMarkId, string>();

/**
 * One corner mark as a `data:` URI, drawn in black for use as a CSS mask.
 * Memoised, because every card of a rarity asks for the same few strings.
 */
export function orderFaceMarkUri(id: OrderFaceMarkId): string {
  const cached = uriCache.get(id);
  if (cached !== undefined) return cached;
  const mark = ORDER_FACE_MARKS[id];
  const uri = `data:image/svg+xml,${encodeURIComponent(markSvg(mark.paths, YIELD_MARK_BOX, mark.stroke, '#000'))}`;
  uriCache.set(id, uri);
  return uri;
}

// --- the device's geometry --------------------------------------------------

/** The device's box: the picture's disc is drawn on 100 units. */
export const DEVICE_BOX = 100;

/** The disc's radius, its inner ring's radius, and where the rays begin. */
export const DEVICE_DISC = { r: 34, ring: 31, raysFrom: 37.5, longRay: 48, shortRay: 44 } as const;

/**
 * **The glory**: thirty-two rays round the disc, long and short in turn,
 * starting at three o'clock. One path, so a card draws all of them with one
 * element. The board's own figures: rays from 37.5 to 48 and 44.
 */
export const DEVICE_RAYS: string = Array.from({ length: 32 }, (_, index) => {
  const degrees = index * 11.25;
  const [x1, y1] = polar(50, 50, DEVICE_DISC.raysFrom, degrees);
  const [x2, y2] = polar(50, 50, index % 2 === 0 ? DEVICE_DISC.longRay : DEVICE_DISC.shortRay, degrees);
  return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
}).join('');

/**
 * **The hatching inside the disc**: parallel lines at 45 degrees, rising to
 * the right, 3.2 units apart, each cut to the disc's edge. The board fills
 * the disc with an SVG pattern; here each line is a chord of the circle, so
 * the card needs no pattern and no id.
 */
export const DEVICE_HATCH: string = (() => {
  const spacing = 3.2;
  const parts: string[] = [];
  const limit = Math.floor(DEVICE_DISC.r / spacing);
  for (let index = -limit; index <= limit; index += 1) {
    const offset = index * spacing;
    const half = Math.sqrt(DEVICE_DISC.r * DEVICE_DISC.r - offset * offset);
    // The foot of the perpendicular from the centre, then half a chord either
    // way along the direction (1, -1).
    const footX = 50 + offset / Math.SQRT2;
    const footY = 50 + offset / Math.SQRT2;
    const dx = half / Math.SQRT2;
    parts.push(`M${n(footX - dx)} ${n(footY + dx)}L${n(footX + dx)} ${n(footY - dx)}`);
  }
  return parts.join('');
})();
