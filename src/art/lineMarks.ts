/**
 * The drawn Statecraft marks: one ink pictogram per archetype **line**, and one
 * per **slot type**, in the same hand and on the same grid as
 * `resourceMarks.ts`.
 *
 * Why drawn rather than the emoji the design pass suggested
 * ---------------------------------------------------------
 * The seven lines have obvious emoji (🏹🐫🌱⚒✶🕯🧭) and the first sketch used
 * them. They lose on two counts and both are fatal to a card face:
 *
 *   · **They are not one set.** Four of the seven are emoji-presentation and
 *     arrive as full-colour pictures from the platform's font; two are
 *     text-presentation and arrive as ink. A hand of cards whose emblems are
 *     half colour photographs and half glyphs is not a hand of cards.
 *   · **They cannot take the line's accent.** The whole point of the emblem is
 *     that it is the loudest place a line's colour lands (see `CARD_LINE_ACCENT`
 *     in `src/ui/cardLine.ts`), and a colour emoji has its own palette.
 *
 * A mark drawn as path data has neither problem: `markSvg` emits it as a mask,
 * the mask paints in `currentColor`, and the emblem is therefore whatever ink
 * the card sets around it. It is `resourceMarks.ts`'s argument, made a third
 * time — and the third time it is made, it is a house rule rather than a
 * preference.
 *
 * One more collision worth naming: the Procession's emoji is 🕯, which is
 * *also* `YIELD_GLYPH.faith`. Any surface printing it through `setYieldText`
 * would have silently swapped it for the yield's flame while the Statecraft
 * screen — which does not print through that seam — kept the emoji. The two
 * would have been the same card's emblem drawn two ways on two screens. Drawing
 * the candle here retires the question.
 *
 * Two tables, one grid
 * --------------------
 * A **line** is an archetype thread a card belongs to (`CardLine`) and its mark
 * is a picture of the *fantasy* — a bow, a dune, a sprig. A **slot type** is
 * what a government opens a hole for (`SlotType`) and its mark is a picture of
 * the *office* — a sword, a balance, a star. They are different questions and
 * they are drawn differently on purpose: a line mark is the emblem in the middle
 * of a card, a slot mark is the faint ghost inside an empty slot.
 *
 * Both unions are closed and declared in TypeScript, so both records are
 * exhaustive and there is no "a member nobody drew" case — `siteMarks.ts`'s
 * contract rather than `resourceMark`'s nullable one, for its reason.
 */

import {
  MARK_BOX,
  MARK_STROKE,
  type MarkPath,
  dot,
  drop,
  ink,
  leaf,
  line,
  markSvg,
  poly,
  solid,
  spark,
} from './resourceMarks';
import type { CardLine, SlotType } from '../sim/statecraftData';

/** One mark, plus the sentence that says what it depicts. Structurally `SiteMark`. */
export interface LineMark {
  /** What the mark is a picture of. */
  note: string;
  paths: readonly MarkPath[];
}

/**
 * The seven threads and the neutral card, drawn.
 *
 * `'none'` is most of the good cards (see `CardLine`), so its mark has to be a
 * real drawing rather than an absence: a lozenge seal, which is the ink shape
 * the Statecraft screen was already using as its wax glyph. A blank emblem would
 * have read as a card that failed to load.
 */
export const CARD_LINE_MARKS: Readonly<Record<CardLine, LineMark>> = {
  hunt: {
    note: 'a bow, strung, with the arrow across it',
    paths: [
      // The stave bulges right off a vertical string, which is what makes the
      // silhouette read as a bow rather than as a bracket.
      ink('M22 8A32 32 0 0 1 22 56'),
      ink(line(22, 8, 22, 56)),
      ink(line(14, 32, 52, 32)),
      ink('M42 24L52 32L42 40'),
    ],
  },
  caravan: {
    note: 'two dunes under a low sun, over the road',
    paths: [
      ink('M10 42Q20 22 30 42Q40 22 50 42'),
      ink(line(6, 50, 58, 50)),
      solid(dot(48, 16, 6)),
    ],
  },
  green: {
    note: 'a sprig: two leaves off one stem',
    paths: [
      ink('M32 56Q32 40 32 20'),
      ink(leaf(22, 38, 22, 8, -28)),
      ink(leaf(42, 27, 22, 8, 28)),
    ],
  },
  forge: {
    note: 'an anvil — face, waist and foot — with the sparks off it',
    paths: [
      // An anvil rather than the hammer the first sketch used: a hammer at this
      // size is a T, and the T it most resembles is the production gear's
      // neighbour on every build button in the game. The anvil is the silhouette
      // nothing else in this interface owns.
      ink(
        poly(
          10, 20, 54, 20, 54, 28, 40, 28, 38, 40, 48, 40, 50, 50, 14, 50, 16, 40, 26, 40, 24, 28,
          10, 28,
        ),
      ),
      ink(line(50, 12, 56, 8)),
      ink(line(56, 16, 62, 14)),
    ],
  },
  star: {
    note: 'an eight-pointed star, long arms and short',
    paths: [ink(spark(32, 32, 24)), ink('M22 22L42 42M42 22L22 42')],
  },
  procession: {
    note: 'a lit candle',
    paths: [
      ink(poly(25, 28, 39, 28, 39, 56, 25, 56)),
      ink(line(32, 28, 32, 23)),
      solid(drop(32, 14, 6, 16)),
    ],
  },
  wayfarers: {
    note: 'a compass rose: the needle in its ring',
    paths: [ink(dot(32, 32, 22)), ink(poly(32, 12, 39, 32, 32, 52, 25, 32))],
  },
  none: {
    note: 'a lozenge seal, twice — the wax the screen already stamps with',
    paths: [ink(poly(32, 8, 56, 32, 32, 56, 8, 32)), ink(poly(32, 20, 44, 32, 32, 44, 20, 32))],
  },
};

/**
 * The three offices a slot can be, drawn.
 *
 * These are *ghosts* before they are pictures — an empty slot prints its own
 * mark at low contrast, which is what makes a row of slots read as a row rather
 * than as a list of unrelated boxes (the argument the wax glyph was making
 * before there was a drawing to make it with). So each one is a silhouette that
 * survives being faded to a third of its ink.
 */
export const SLOT_MARKS: Readonly<Record<SlotType, LineMark>> = {
  military: {
    note: 'a sword, point up: tip, blade, crossguard, grip and pommel',
    paths: [
      // The tip is a chevron rather than the end of the blade's line. At the
      // size a slot ghosts this it is the difference between a sword and a
      // lower-case t — the first sketch had no chevron and read as the latter.
      ink('M26 18L32 8L38 18'),
      ink(line(32, 8, 32, 42)),
      ink(line(13, 42, 51, 42)),
      ink(line(32, 42, 32, 53)),
      solid(dot(32, 56, 4)),
    ],
  },
  economic: {
    note: 'a balance: the beam, its pans and the post',
    paths: [
      ink(line(12, 20, 52, 20)),
      ink(line(32, 12, 32, 52)),
      ink(line(20, 52, 44, 52)),
      ink('M4 20L12 36L20 20'),
      ink('M44 20L52 36L60 20'),
    ],
  },
  wildcard: {
    note: 'a four-pointed spark in an open ring — anything may go here',
    paths: [ink(dot(32, 32, 22)), ink(spark(32, 32, 13)), ink('M24 24L40 40M40 24L24 40')],
  },
};

// --- the SVG export ---------------------------------------------------------

/**
 * One mark as a standalone SVG document, inked in `color`.
 *
 * The house emitter, the house grid and the house weight — the three arguments
 * `markSvg` takes precisely so a second set can share it rather than grow a copy
 * of the drawing rules that drifts.
 */
export function lineMarkSvg(mark: LineMark, color = '#000'): string {
  return markSvg(mark.paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, memoised.
 *
 * A card face is rebuilt on every draw of the Statecraft screen and every offer,
 * and the string for a given line is the same every time — the same cache the
 * resource and yield printers keep, for the same reason.
 */
const uriCache = new Map<string, string>();

function markUri(cacheKey: string, mark: LineMark, color: string): string {
  const cached = uriCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(lineMarkSvg(mark, color))}`;
  uriCache.set(cacheKey, uri);
  return uri;
}

/**
 * The archetype line's emblem, as a `data:` URI.
 *
 * The parameter is `id` rather than `line` because `line` is one of the drawing
 * verbs this module imports — a shadow here would be a straight segment nobody
 * could draw.
 */
export function cardLineMarkDataUri(id: CardLine, color = '#000'): string {
  return markUri(`line|${id}|${color}`, CARD_LINE_MARKS[id], color);
}

/** The slot office's ghost, as a `data:` URI. */
export function slotMarkDataUri(slot: SlotType, color = '#000'): string {
  return markUri(`slot|${slot}|${color}`, SLOT_MARKS[slot], color);
}
