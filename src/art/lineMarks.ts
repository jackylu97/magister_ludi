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
import type { CardLine, DeckId, SlotType } from '../sim/statecraftData';

/** One mark, plus the sentence that says what it depicts. Structurally `SiteMark`. */
export interface LineMark {
  /** What the mark is a picture of. */
  note: string;
  paths: readonly MarkPath[];
}

/**
 * The threads the deck's newer themes name, ahead of the union that will hold
 * them.
 *
 * `CardLine` lives in `src/sim/statecraftData.ts` and a colour is not a rule, so
 * the interface can be ready for a thread before the simulation declares it: a
 * drawn emblem and a name are art, and a card that has neither comes up wearing
 * the neutral seal. The union is written as `CardLine | PendingCardLine` at
 * every reader below, which **collapses to `CardLine` the moment the simulation
 * adopts these members** — nothing here has to be unwound, and a member the
 * simulation never adopts costs one unreachable table row.
 *
 * `'court'` is the one with a card waiting for it: The Laureate (see
 * `data/statecraft.json`), whose Marble Court is the patronage thread.
 */
export type PendingCardLine = 'court' | 'cloister' | 'charter' | 'ploughshare' | 'highlands';

/** Every thread a card may name, drawn or declared. See `PendingCardLine`. */
export type AnyCardLine = CardLine | PendingCardLine;

/**
 * The threads and the neutral card, drawn.
 *
 * `'none'` is most of the good cards (see `CardLine`), so its mark has to be a
 * real drawing rather than an absence: a lozenge seal, which is the ink shape
 * the Statecraft screen was already using as its wax glyph. A blank emblem would
 * have read as a card that failed to load.
 *
 * The five newest are drawn rather than set in the emoji their design notes name
 * (🏛 ☽ 📜 🌾 ⛰), for the two reasons at the top of this file and no new one: a
 * hand whose emblems are half colour pictures is not a hand of cards, and a
 * colour emoji cannot take the line's accent, which is the loudest place that
 * accent lands.
 */
export const CARD_LINE_MARKS: Readonly<Record<AnyCardLine, LineMark>> = {
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
  court: {
    note: 'a pediment on three columns, on its stylobate — the marble court',
    paths: [
      // The pediment is a plain triangle rather than a gabled one: at this size
      // a cornice is two strokes that merge, and the silhouette that says
      // "temple front" is the triangle sitting *clear* of the columns.
      ink('M8 26L32 10L56 26'),
      ink(line(10, 26, 54, 26)),
      ink(line(18, 30, 18, 50)),
      ink(line(32, 30, 32, 50)),
      ink(line(46, 30, 46, 50)),
      ink(line(10, 54, 54, 54)),
    ],
  },
  cloister: {
    note: 'a waxing crescent under a round arch — the cloister walk',
    paths: [
      // The crescent is one closed path, not a disc minus a disc: a mask takes
      // whatever is drawn, and two overlapping fills would paint the bite in
      // the same ink as the moon.
      solid('M38 8A22 22 0 1 0 38 52A26 26 0 1 1 38 8Z'),
      ink('M14 56A18 18 0 0 1 50 56'),
    ],
  },
  charter: {
    note: 'a scroll, rolled at both ends, with two lines of writing',
    paths: [
      ink(line(16, 18, 48, 18)),
      ink(line(16, 46, 48, 46)),
      ink('M16 18A6 8 0 0 0 16 34'),
      ink('M48 46A6 8 0 0 0 48 30'),
      ink(line(16, 34, 48, 34)),
      ink(line(16, 30, 48, 30)),
      ink(line(24, 26, 42, 26)),
      ink(line(24, 38, 42, 38)),
    ],
  },
  ploughshare: {
    note: 'a ploughshare cutting a furrow — the blade, its beam and the turned soil',
    paths: [
      // A wheat ear was the first sketch and it collided with the Green Belt's
      // sprig at emblem size: two upright plants, one of them stippled. The
      // blade is the shape only this line owns.
      ink(poly(12, 40, 40, 26, 44, 40, 16, 48)),
      ink(line(40, 26, 52, 14)),
      ink('M8 54Q32 46 56 54'),
    ],
  },
  highlands: {
    note: 'two peaks, the nearer one snow-capped',
    paths: [
      ink(poly(4, 52, 24, 20, 44, 52)),
      ink('M17 32L24 28L31 32'),
      ink('M38 52L50 32L60 52'),
    ],
  },
  tide: {
    note: 'an anchor: the ring, the stock across it and the arms sweeping up',
    paths: [
      // An anchor rather than the wave the theme's own name suggests: a wave at
      // emblem size is one stroke, and the stroke it most resembles is the Long
      // Caravan's road. The anchor is the silhouette nothing else here owns,
      // and it survives being faded the way a slot ghost has to.
      ink(dot(32, 12, 6)),
      ink(line(32, 18, 32, 54)),
      ink(line(18, 26, 46, 26)),
      ink('M12 34Q12 54 32 54Q52 54 52 34'),
    ],
  },
};

/**
 * **The six decks, drawn** — the emblem in the middle of a dealt card since U1.
 *
 * `docs/flags.md` item (nnnnnn), the user reading a hand: *"lets have the icons
 * reflect what kind of card they are"*. Every row written after the decks
 * rework carries `line: 'none'`, so `CARD_LINE_MARKS` gave four hundred cards
 * the same lozenge and a hand of three was three identical plates. A card's
 * home is its **deck** now, so the emblem is the deck's.
 *
 * Each mark is a picture of *what the deck rewards*, read off
 * `docs/six-decks-first-cut.md`'s six identities and no second source. Four of
 * the six were drawn twice, because the obvious mark was already somebody's —
 * this set has to be unique against the seven threads, the three slot ghosts,
 * the four dock buttons, the meters and the forty-one resources:
 *
 *   · **Dominion** — recruiting, positioning and using military units. Crossed
 *     spears rather than the sword the slot ghost owns: a sword is one duel and
 *     this deck is an army.
 *   · **Expansionist** — citizens, land and settlement geography. A homestead,
 *     the one silhouette that says *a place people now live*. The wheat ear the
 *     first sketch used is the wheat resource's, and the Green Belt's sprig and
 *     the Ploughshare's blade already crowd that field.
 *   · **Commerce** — routes, partnerships, goods and deliberate spending. A
 *     purse drawn shut, because the two marks nearer the idea are taken: the
 *     strapped bale on two wheels is the Caravans dock button and the stack of
 *     struck coin is the coin resource.
 *   · **Devotion** — sacred buildings, rites and conversion. A bell: the thing
 *     that calls a town to a rite. Not a censer (the incense resource) and not
 *     a candle (the Procession's, and the faith glyph's).
 *   · **Scientific** — research detours, institutions and works. A pair of
 *     dividers over the arc they scribe — measurement, not the sky, which the
 *     Star Chart thread already owns.
 *   · **Magisterial** — cultural institutions, wonders, great works. An obelisk
 *     on its plinth: a thing raised to be remembered. The laurel that suggested
 *     itself is the renown meter's, and the colonnade is the Marble Court's.
 *
 * **A card of nobody's deck keeps the lozenge seal**, and that is a ruling
 * rather than a fallback: a generic row joins no deck, the seal is already this
 * interface's mark for exactly that, and a seventh drawing for "no deck" would
 * be drawing a deck that is not one. It is the `'none'` paths *by reference*,
 * so the neutral face cannot drift into two drawings.
 *
 * **A card of two decks gets a mark of its own** — the seal doubled, two
 * lozenges interlocked. Every other answer says something untrue. One deck's
 * drawing denies the other half of the card; both drawings at emblem size are
 * two illegible drawings; and the plain single seal would file a cross-type
 * beside the cards of nobody's deck, which is the opposite of what it is. The
 * doubled seal *is* the fact, and it reads as a sibling of the single one, so
 * the two neutral faces are a family: one seal is a card of no deck, two
 * interlocked are a card of two.
 */
export type DeckFace = DeckId | 'shared' | 'generic';

export const DECK_MARKS: Readonly<Record<DeckFace, LineMark>> = {
  dominion: {
    note: 'two spears crossed, leaf-bladed — an army, not a duel',
    paths: [
      ink(line(12, 54, 44, 18)),
      solid(poly(54, 8, 47.5, 21.5, 40.5, 14.5)),
      ink(line(52, 54, 20, 18)),
      solid(poly(10, 8, 23.5, 14.5, 16.5, 21.5)),
    ],
  },
  expansionist: {
    note: 'a homestead: a gabled roof over its walls, with a door',
    paths: [
      ink('M10 34L32 15L54 34'),
      ink(poly(18, 34, 46, 34, 46, 55, 18, 55)),
      ink(poly(27, 43, 37, 43, 37, 55, 27, 55)),
    ],
  },
  commerce: {
    note: 'a merchant’s purse, cinched at the neck over its gathered mouth',
    paths: [
      // The first sketch closed the neck with an arch and came out a padlock;
      // the second put two tie-ends above the cinch and came out with ears. The
      // gathered mouth is a plain collar above the cord, and the sack is wider
      // at the foot than at the mouth — which is the shape a bag of coin sits in
      // and the shape a lock does not.
      ink('M22 27Q7 43 14 53Q21 59 32 59Q43 59 50 53Q57 43 42 27Z'),
      ink(line(22, 27, 42, 27)),
      ink('M24 27L27 15L37 15L40 27'),
    ],
  },
  devotion: {
    note: 'a bell on its loop, the clapper under the lip',
    paths: [
      ink('M18 46Q18 19 32 17Q46 19 46 46'),
      ink(line(12, 46, 52, 46)),
      ink(line(32, 17, 32, 12)),
      ink(dot(32, 9, 4)),
      solid(dot(32, 53, 5)),
    ],
  },
  scientific: {
    note: 'a pair of dividers, hinge and legs, open on the span they measure',
    paths: [
      // The first sketch put the scribed arc between the points and closed the
      // silhouette into a bell — which is the Devotion deck's, one card away in
      // the same hand. Open legs and a hinge plate instead: nothing else in any
      // of these sets is a lambda.
      ink(line(32, 16, 13, 53)),
      ink(line(32, 16, 51, 53)),
      solid(dot(32, 13, 5)),
      ink(line(25, 24, 39, 24)),
    ],
  },
  magisterial: {
    note: 'an obelisk on its plinth — a thing raised to be remembered',
    paths: [
      ink('M28 15L32 6L36 15'),
      ink(poly(28, 15, 36, 15, 39, 45, 25, 45)),
      ink(poly(17, 45, 47, 45, 47, 56, 17, 56)),
    ],
  },
  // By reference, never a second drawing: a generic card, the card back and the
  // neutral thread are one seal, and the day it is redrawn all three move.
  generic: {
    note: 'the lozenge seal — a card that joins no deck',
    paths: CARD_LINE_MARKS.none.paths,
  },
  shared: {
    note: 'the seal doubled: two lozenges interlocked — a card two decks share',
    paths: [
      ink(poly(23, 14, 41, 32, 23, 50, 5, 32)),
      ink(poly(41, 14, 59, 32, 41, 50, 23, 32)),
    ],
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
export function cardLineMarkDataUri(id: AnyCardLine, color = '#000'): string {
  return markUri(`line|${id}|${color}`, CARD_LINE_MARKS[id], color);
}

/** The slot office's ghost, as a `data:` URI. */
export function slotMarkDataUri(slot: SlotType, color = '#000'): string {
  return markUri(`slot|${slot}|${color}`, SLOT_MARKS[slot], color);
}

/**
 * The deck's emblem, as a `data:` URI. See `DECK_MARKS`.
 *
 * Its own cache key rather than the line's, because `'generic'` and `'none'`
 * draw the same paths and a shared key would make one of them answer for the
 * other the day they stop doing so.
 */
export function deckMarkDataUri(face: DeckFace, color = '#000'): string {
  return markUri(`deck|${face}|${color}`, DECK_MARKS[face], color);
}
