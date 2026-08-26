/**
 * The flourish marks: the corner star every panel wears, and the printer's
 * device under the title page.
 *
 * Entry VII's approved set, finished
 * ---------------------------------
 * The flourish list was capped and ratified two passes ago — wax seal, star
 * chart, manicule, Roman numerals, **one corner star per panel**, **card-back
 * weave**, gold double-frames — and the last three never shipped. Two of them
 * need a drawing, and a drawing in this project is path data on the house grid
 * printed through `markSvg`, never an image and never a glyph: the same
 * argument `resourceMarks.ts` makes and `lineMarks.ts` makes after it, which by
 * the third time is a house rule.
 *
 * Why these two and not a third
 * -----------------------------
 * The card back's emblem is **not** here. It is `CARD_LINE_MARKS.none` — the
 * lozenge seal the Statecraft screen already stamps with — asked for through
 * `cardLine.ts` like every other card emblem, because a back that carried a
 * drawing nothing else in the deck uses would be a second deck. Drawing a
 * ninth seal would have been a fourth set for one card.
 *
 * The corner star and the device are drawn because neither exists anywhere: a
 * star at 10px on the corner of a card is not the star-chart's node and not
 * `CARD_LINE_MARKS.star` (which has eight arms and a cross through it, and
 * turns to mud at that size), and a printer's device is a thing only a title
 * page has.
 *
 * Two consumers, two shapes
 * -------------------------
 * The device is placed by script (`frontispiece.ts` writes it onto one element
 * at the moment the landing is shown), so it is handed out as a `url(…)` value
 * like every other mark. The corner star is worn by **every panel-class
 * surface** through a CSS pseudo-element, and a pseudo-element cannot be
 * reached by script — so `installFlourishMarks` writes the picture once onto
 * the document root as `--corner-star`, and the stylesheet masks with it. One
 * write at boot, one custom property, and the path data still lives here.
 */

import {
  MARK_BOX,
  MARK_STROKE,
  type MarkPath,
  dot,
  ink,
  line,
  markSvg,
  poly,
  solid,
  spark,
} from '../art/resourceMarks';

/** One mark, plus the sentence that says what it depicts. `LineMark`'s shape. */
export interface DeviceMark {
  /** What the mark is a picture of. */
  note: string;
  paths: readonly MarkPath[];
}

/**
 * The corner star: four long arms, four short, drawn open.
 *
 * Sized for ~10px on screen, which is the whole of why it is not one of the
 * stars this project already owns. At that size a mark survives on its
 * *silhouette* and nothing else, so it is two crossed strokes and two shorter
 * diagonals — no ring, no centre, nothing that closes into a blot when the
 * renderer rounds a hairline down.
 *
 * The arms are unequal on purpose. Four equal arms at this scale read as a
 * plus sign, and a plus sign on the corner of a card reads as a close button.
 */
export const CORNER_STAR: DeviceMark = {
  note: 'a compass star: four long arms and four short, open',
  paths: [ink(spark(32, 32, 28)), ink('M20 20L44 44M44 20L20 44')],
};

/**
 * The printer's device: an astrolabe, hung by its throne.
 *
 * The device is the mark a printing house put under the title of a book to say
 * whose press it came off, and Entry VII named the two candidates — an abacus
 * or an astrolabe. The astrolabe wins because the abacus is *taken*: it is the
 * score screen, drawn in three dimensions with beads on rods, and a small
 * engraved copy of it under the title would read as a button to that screen.
 *
 * Read from the top down: the suspension ring and its shackle, the limb, the
 * rete's inner circle, the four cardinal ticks cut into the band between them,
 * the alidade laid across the face at the angle a sight is actually taken at,
 * and the pin at its centre. Every one of those is a real part of the
 * instrument, which is the only discipline that keeps a drawn ornament from
 * turning into a doodle.
 *
 * It is drawn to survive 46px, which is the size a device sits at under a
 * title. That is what settled the composition: the first sketch ruled a horizon
 * clean across the face and put a star at the centre, and at this size the two
 * of them plus the alidade closed the middle into a blot. The ticks say the
 * same thing the horizon did — this face is graduated — and they say it out at
 * the rim where there is room for them.
 */
export const PRINTER_DEVICE: DeviceMark = {
  note: 'an astrolabe: throne, limb, rete, the cardinal ticks, the alidade and its pin',
  paths: [
    // The throne, and the shackle through it. Solid, because at title-page size
    // it is the one part small enough to close up if it were drawn open.
    solid(dot(32, 5, 4)),
    ink(poly(28, 9, 36, 9, 34, 14, 30, 14)),
    // The limb and the rete.
    ink(dot(32, 36, 25)),
    ink(dot(32, 36, 14)),
    // The cardinal graduations, each cut from the limb exactly to the rete.
    ink(line(32, 11, 32, 22)),
    ink(line(32, 50, 32, 61)),
    ink(line(7, 36, 18, 36)),
    ink(line(46, 36, 57, 36)),
    // The alidade, and the pin it turns on.
    ink(line(16, 52, 48, 20)),
    solid(dot(32, 36, 2.5)),
  ],
};

// --- the SVG export ---------------------------------------------------------

/** One device mark as a standalone SVG document, inked in `color`. */
export function deviceMarkSvg(mark: DeviceMark, color = '#000'): string {
  return markSvg(mark.paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, memoised.
 *
 * The cache every other mark printer keeps, and it earns it here for a
 * different reason than they do: the corner star is asked for **once** per
 * document, but the device is re-asked on every return to the landing screen,
 * and a title page rebuilt on Restart should not be re-encoding an astrolabe.
 */
const uriCache = new Map<string, string>();

function markUri(key: string, mark: DeviceMark, color: string): string {
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(deviceMarkSvg(mark, color))}`;
  uriCache.set(key, uri);
  return uri;
}

/** The corner star, as a `data:` URI. */
export function cornerStarDataUri(color = '#000'): string {
  return markUri(`star|${color}`, CORNER_STAR, color);
}

/** The printer's device, as a `data:` URI. */
export function printerDeviceDataUri(color = '#000'): string {
  return markUri(`device|${color}`, PRINTER_DEVICE, color);
}

/** The printer's device as a ready CSS `url(…)`, for a mask. */
export function printerDeviceMarkUrl(): string {
  return `url("${printerDeviceDataUri()}")`;
}

/**
 * Hands the stylesheet the pictures it cannot ask for itself.
 *
 * Called once at boot. Everything the stylesheet draws with a mask normally
 * gets its `url(…)` from the element's own inline style, written by whichever
 * module built the element — but the corner star belongs to *every*
 * panel-class surface, including the ones static markup declares and the ones
 * three different modules build, and a rule that wide has to be a
 * pseudo-element. A pseudo-element has no `style` object, so the picture is put
 * where a pseudo-element *can* see it: a custom property on the root.
 *
 * Idempotent, and cheap enough to be — the URI is memoised above, so a second
 * call is a map lookup and a property write.
 */
export function installFlourishMarks(root: HTMLElement): void {
  root.style.setProperty('--corner-star', `url("${cornerStarDataUri()}")`);
}
