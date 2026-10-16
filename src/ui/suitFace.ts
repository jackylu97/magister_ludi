/**
 * **The A3 card face** (batch C1 of `docs/plans/chairs-build.md`). The design
 * is the board in `docs/plans/mockups/card-faces/SuitsRevised.dc.html`, which
 * the user chose on 2026-10-15 (`docs/plans/doctrines-governments-chairs.md`,
 * "On round two").
 *
 * An Order's face says three things, each in one way:
 *
 *   · **the suit shows the deck**: Dominion is Swords, Expansionist Wands,
 *     Commerce Coins, Devotion Cups, Scientific Spheres and Magisterial Crowns.
 *     One large suit sits in the middle of the card, with no corner indexes;
 *   · **the ink shows the type**: the frame, the suit and its medallion are
 *     drawn in the type's ink. Military is vermilion, Economic ochre, Civic
 *     lapis and Wildcard purple. An unsorted card is drawn in the Wildcard ink;
 *   · **the rank shows rarity**, in ink and pewter only, so it never competes
 *     with a type's ink. A common card has a faint single rule and a plain
 *     numeral, an uncommon card a pewter double rule and a ribbon, and a rare
 *     card a black frame, a star in each corner and a black cartouche. The
 *     numeral in the rank is the card's tier, as the deck sheets number them.
 *
 * The board does not cover two cases, and this module settles them so they can
 * be shown to the user:
 *
 *   · **a card two decks share** shows both suits side by side in the medallion
 *     and names both decks at its foot;
 *   · **a card of no deck** shows the lozenge seal where a suit would be (the
 *     mark a card of no deck has worn since batch U1) and says "Generic" at its
 *     foot.
 *
 * The face comes in the board's three sizes: the **hand** (the draft, designed
 * at 200 × 310), the **seat** (a card in a chair, 120 × 186) and the **row**
 * (36px, for the collection and the Compendium).
 *
 * This module knows nothing about cards. It draws a `SuitFace`, which is plain
 * strings, and `deckBadges.ts` is where an Order row becomes one. That keeps the
 * offer card free of simulation types (its module docblock) while it uses the
 * same drawing as every other surface.
 *
 * The suits are path data on the house grid (64 units, stroke 6.5, the verbs of
 * `src/art/resourceMarks.ts`). They are drawn as inline SVG rather than as a CSS
 * mask because each size sets its own stroke weight, as the board does: the
 * weight is `--suit-stroke`, and a path's own weight is a fixed share of it. The
 * flair gallery prints the same table as masks through `suitMarkDataUri`.
 */

import { CARD_LINE_MARKS } from '../art/lineMarks';
import { MARK_BOX, MARK_STROKE, type MarkPath, ink, markSvg, solid } from '../art/resourceMarks';
import { element } from './dom';

// --- the suits --------------------------------------------------------------

/** The six suits, one for each deck (the board's "Deck · the suit"). */
export type SuitId = 'swords' | 'wands' | 'coins' | 'cups' | 'spheres' | 'crowns';

/** The suits in the decks' own order (`DECK_IDS`). */
export const SUIT_IDS: readonly SuitId[] = ['swords', 'wands', 'coins', 'cups', 'spheres', 'crowns'];

/** One drawing, and the sentence that says what it depicts. Structurally `LineMark`. */
export interface SuitMark {
  note: string;
  paths: readonly MarkPath[];
}

/** A filled leaf, outlined lightly: the board's `.l` paths on the Wands. */
function lobe(d: string): MarkPath {
  return { d, fill: true, width: 2.5 };
}

/** A line drawn lighter than the house weight: the board's `.t` paths. */
function thin(d: string): MarkPath {
  return { d, width: 4.5 };
}

/**
 * **The six suits, drawn.** The paths are the board's own, on the same 64-unit
 * grid as every other house mark.
 */
export const SUIT_MARKS: Readonly<Record<SuitId, SuitMark>> = {
  swords: {
    note: 'a sword, point up: tip, blade, crossguard, grip and pommel',
    paths: [
      ink('M26 18L32 8L38 18'),
      ink('M32 8V42'),
      ink('M13 42H51'),
      ink('M32 42V53'),
      solid('M28 56a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z'),
    ],
  },
  wands: {
    note: 'a staff in leaf: one long stave with three leaves off it',
    paths: [
      ink('M22 58L42 6'),
      lobe('M35.6 28.5Q37.8 20.2 46.4 19.5Q44.2 27.8 35.6 28.5Z'),
      lobe('M27.2 41Q19.8 41.9 16.8 35Q24.3 34.1 27.2 41Z'),
      lobe('M36.5 16.3Q30.5 14 31.5 7.7Q37.5 10 36.5 16.3Z'),
    ],
  },
  coins: {
    note: 'a coin struck with a five-pointed star',
    paths: [
      ink('M7 32a25 25 0 1 0 50 0a25 25 0 1 0 -50 0Z'),
      thin('M32 17L40.8 44.1L17.7 27.4L46.3 27.4L23.2 44.1Z'),
    ],
  },
  cups: {
    note: 'a cup: the bowl, the stem and the foot',
    paths: [ink('M13 12H51Q51 38 32 38Q13 38 13 12Z'), ink('M32 38V52'), ink('M19 55H45')],
  },
  spheres: {
    note: 'a globe on its stand, with its band and its axis',
    paths: [
      ink('M11 28a21 21 0 1 0 42 0a21 21 0 1 0 -42 0Z'),
      thin('M11 28a21 6.5 0 1 0 42 0a21 6.5 0 1 0 -42 0Z'),
      thin('M23 7L41 49'),
      ink('M32 49V56'),
      ink('M22 59H42'),
    ],
  },
  crowns: {
    note: 'a crown of three points, each with a pearl, over its band',
    paths: [
      ink('M13 46L9 20L22 31L32 13L42 31L55 20L51 46Z'),
      ink('M13 53H51'),
      solid('M5.5 20a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z'),
      solid('M28.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z'),
      solid('M51.5 20a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z'),
    ],
  },
};

/**
 * **What a card of no deck shows instead of a suit**: the lozenge seal, by
 * reference to the neutral thread's drawing, so the card back, the neutral
 * thread and this stay one drawing.
 */
export const SEAL_MARK: SuitMark = {
  note: 'the lozenge seal, for a card of no deck',
  paths: CARD_LINE_MARKS.none.paths,
};

/** The suits in words, for the label a reader hears instead of the drawing. */
export const SUIT_WORD: Readonly<Record<SuitId, string>> = {
  swords: 'Swords',
  wands: 'Wands',
  coins: 'Coins',
  cups: 'Cups',
  spheres: 'Spheres',
  crowns: 'Crowns',
};

/** The suits of a face in words: "Swords", "Swords and Cups", or the seal. */
export function suitsWord(suits: readonly SuitId[]): string {
  if (suits.length === 0) return 'A plain seal: a card of no deck';
  const words = suits.map((suit) => SUIT_WORD[suit]);
  if (words.length === 1) return words[0]!;
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]!}`;
}

/** One suit (or the seal) as a standalone SVG document, for the flair gallery's mask cells. */
export function suitMarkDataUri(suit: SuitId | 'seal', color = '#000'): string {
  const mark = suit === 'seal' ? SEAL_MARK : SUIT_MARKS[suit];
  return `data:image/svg+xml,${encodeURIComponent(markSvg(mark.paths, MARK_BOX, MARK_STROKE, color))}`;
}

// --- what a face carries ----------------------------------------------------

/** The four inks, one for each type (the board's "Chair type · the ink"). */
export type InkId = 'military' | 'economic' | 'civic' | 'wildcard';

/** The inks in the board's key order. */
export const INK_IDS: readonly InkId[] = ['military', 'economic', 'civic', 'wildcard'];

/** The three ranks, one for each rarity (the board's "Rarity · the rank"). */
export type RankId = 'common' | 'uncommon' | 'rare';

export const RANK_IDS: readonly RankId[] = ['common', 'uncommon', 'rare'];

/**
 * **Everything a face shows**, as plain strings. `orderSuitFace`
 * (`deckBadges.ts`) builds one from an Order row; the flair gallery builds them
 * by hand.
 */
export interface SuitFace {
  /**
   * The suits in the middle: one for a card of one deck, two for a card two
   * decks share, and none for a card of no deck, which shows the seal.
   */
  suits: readonly SuitId[];
  /** The type's ink. An unsorted card arrives here as `'wildcard'`. */
  ink: InkId;
  /** The rarity, drawn as the frame and the ornament at the top. */
  rank: RankId;
  /** The tier numeral inside the ornament: "0", "I", "II", "III" or "IV". */
  numeral: string;
  /** The words at the foot: "Dominion", "Dominion · Commerce" or "Generic". */
  deck: string;
  /**
   * The face in words, for the parts a reader cannot see: the type, the rarity,
   * the deck and the tier. It is the hover title on a hand card and the hidden
   * line a screen reader starts the face with.
   */
  caption: string;
}

/** The face's three sizes. A row is drawn by `suitRowNode`, not by `dressSuitFace`. */
export type SuitSize = 'hand' | 'seat';

// --- drawing ----------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An SVG element with its attributes and an optional class. */
function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Readonly<Record<string, string | number>> = {},
  className?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (className !== undefined) node.setAttribute('class', className);
  return node;
}

/** Where one drawing sits inside the medallion's 92-unit box. */
interface GlyphBox {
  x: number;
  y: number;
  size: number;
}

/**
 * **Where the suits sit in the medallion.** One suit (or the seal) takes the
 * board's own box for its size and rank. Two or more share the width side by
 * side: inside the inner ring on an uncommon or rare card, and across the whole
 * medallion on a common card, which has no rings.
 *
 * Exported for the flair gallery's knobs and for the test that keeps a pair
 * inside the medallion.
 */
export function glyphBoxes(count: number, ringed: boolean, size: SuitSize): GlyphBox[] {
  if (count <= 1) {
    if (ringed) return [size === 'hand' ? { x: 18, y: 18, size: 56 } : { x: 17, y: 17, size: 58 }];
    return [size === 'hand' ? { x: 6, y: 6, size: 80 } : { x: 4, y: 4, size: 84 }];
  }
  const span = ringed ? 64 : 84;
  const gap = 2;
  const each = Math.min(ringed ? 30 : 42, (span - gap * (count - 1)) / count);
  const total = each * count + gap * (count - 1);
  const left = 46 - total / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: left + index * (each + gap),
    y: 46 - each / 2,
    size: each,
  }));
}

/**
 * One drawing on the 64-unit grid, as an `<svg>`. Placed at `box` inside a
 * parent SVG, or sized by CSS when it stands alone.
 *
 * A path's weight is written as a share of `--suit-stroke`, so a size that
 * draws the suit lighter or heavier (a common card's large suit, a list row's
 * small one) moves every path of it together, as the board does.
 */
function glyphNode(mark: SuitMark, box?: GlyphBox): SVGSVGElement {
  const root = svg('svg', { viewBox: `0 0 ${MARK_BOX} ${MARK_BOX}` }, 'suit-glyph');
  if (box !== undefined) {
    root.setAttribute('x', String(box.x));
    root.setAttribute('y', String(box.y));
    root.setAttribute('width', String(box.size));
    root.setAttribute('height', String(box.size));
  }
  const group = svg('g', {}, 'suit-g');
  for (const path of mark.paths) {
    const node = svg('path', { d: path.d });
    if (path.fill === true) node.setAttribute('fill', 'currentColor');
    if (path.width !== undefined && path.width !== MARK_STROKE) {
      const share = Math.round((path.width / MARK_STROKE) * 1000) / 1000;
      node.style.setProperty('stroke-width', `calc(var(--suit-stroke, ${MARK_STROKE}) * ${share})`);
    }
    group.append(node);
  }
  root.append(group);
  return root;
}

/** The drawings a face shows: its suits, or the seal when it has none. */
function marksOf(suits: readonly SuitId[]): SuitMark[] {
  return suits.length === 0 ? [SEAL_MARK] : suits.map((suit) => SUIT_MARKS[suit]);
}

/**
 * One suit on its own, sized by CSS and drawn in `currentColor`: the mark a
 * small surface puts beside a deck's name (a collection heading, a commission
 * chip). Hidden from a reader, because the words beside it say the deck.
 */
export function suitGlyphNode(suit: SuitId | 'seal'): SVGSVGElement {
  const glyph = glyphNode(suit === 'seal' ? SEAL_MARK : SUIT_MARKS[suit]);
  glyph.setAttribute('aria-hidden', 'true');
  return glyph;
}

/** The four small diamonds at the compass points of a hand card's medallion. */
const COMPASS_POINTS =
  'M46 0.6L48.4 3L46 5.4L43.6 3ZM46 86.6L48.4 89L46 91.4L43.6 89Z' +
  'M3 43.6L5.4 46L3 48.4L0.6 46ZM89 43.6L91.4 46L89 48.4L86.6 46Z';

/**
 * **The medallion**: the suit (or suits, or the seal) in the middle of the card.
 *
 * An uncommon or rare card rings its suit: an outer rule, a dotted rule and a
 * tinted inner disc, with a diamond at each compass point on a hand card. A
 * common card has no rings and shows its suit larger and once, as the user
 * asked on round two (*"it can just be one big coin"*).
 */
export function suitPlateNode(face: SuitFace, size: SuitSize): HTMLElement {
  const plate = element('span', 'suit-plate');
  plate.setAttribute('role', 'img');
  plate.setAttribute('aria-label', suitsWord(face.suits));
  const root = svg('svg', { viewBox: '0 0 92 92', 'aria-hidden': 'true' });
  const ringed = face.rank !== 'common';
  if (ringed) {
    root.append(svg('circle', { cx: 46, cy: 46, r: 42.5 }, 'suit-ring-outer'));
    if (size === 'hand') root.append(svg('circle', { cx: 46, cy: 46, r: 38.5 }, 'suit-ring-dots'));
    root.append(svg('circle', { cx: 46, cy: 46, r: 34.5 }, 'suit-ring-inner'));
    if (size === 'hand') root.append(svg('path', { d: COMPASS_POINTS }, 'suit-ring-points'));
  }
  const marks = marksOf(face.suits);
  const boxes = glyphBoxes(marks.length, ringed, size);
  marks.forEach((mark, index) => root.append(glyphNode(mark, boxes[index])));
  plate.append(root);
  return plate;
}

/** The eight-pointed star at each corner of a rare card. */
const STAR = 'M0 -6.5L1.8 -1.8L6.5 0L1.8 1.8L0 6.5L-1.8 1.8L-6.5 0L-1.8 -1.8Z';

/**
 * **The frame a rarity draws**: a faint single rule (common), a pewter double
 * rule (uncommon), or a black double rule with a star in each corner (rare).
 * Drawn over the card's own border and never in the way of a click.
 */
export function suitFrameNodes(rank: RankId): Element[] {
  const frame = (className: string): HTMLElement => {
    const node = element('span', `suit-frame ${className}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
  };
  if (rank === 'common') return [frame('suit-frame-pip')];
  if (rank === 'uncommon') return [frame('suit-frame-court'), frame('suit-frame-court-inner')];
  const nodes: Element[] = [frame('suit-frame-trump'), frame('suit-frame-trump-inner')];
  for (const corner of ['is-tl', 'is-tr', 'is-bl', 'is-br']) {
    const star = svg('svg', { viewBox: '-7 -7 14 14', 'aria-hidden': 'true' }, `suit-star ${corner}`);
    star.append(svg('path', { d: STAR }));
    nodes.push(star);
  }
  return nodes;
}

/** The ribbon's two tails and its box, on a 78 × 20 box. */
const RIBBON_TAILS = ['M15 6L3 6L8 11L3 16L15 16Z', 'M63 6L75 6L70 11L75 16L63 16Z'];
const RIBBON_BOX = 'M11 2.5H67V14.5H11Z';

/** The cartouche and the parchment rule inside it, on a 72 × 27 box. */
const CARTOUCHE = 'M12 2H60Q60 9 69 9V18Q60 18 60 25H12Q12 18 3 18V9Q12 9 12 2Z';
const CARTOUCHE_RULE = 'M15 5H57Q57.5 11.5 65.5 12V15Q57.5 15.5 57 22H15Q14.5 15.5 6.5 15V12Q14.5 11.5 15 5Z';

/**
 * **The ornament at the top of the card**, carrying the tier numeral: two short
 * rules for a common card, a pewter ribbon for an uncommon one, and a black
 * cartouche for a rare one. The seat drops the cartouche's inner rule and sets
 * its numeral in mono, as the board's seated cards do.
 */
export function suitRankNode(face: SuitFace, size: SuitSize): HTMLElement {
  const band = element('span', `suit-rank suit-rank-${face.rank}`);
  band.setAttribute('aria-hidden', 'true');
  if (face.rank === 'common') {
    band.append(element('i'), element('span', 'suit-rank-numeral', face.numeral), element('i'));
    return band;
  }
  if (face.rank === 'uncommon') {
    const ribbon = svg('svg', { viewBox: '0 0 78 20' }, 'suit-ribbon');
    for (const tail of RIBBON_TAILS) ribbon.append(svg('path', { d: tail }, 'suit-ribbon-tail'));
    ribbon.append(svg('path', { d: RIBBON_BOX }, 'suit-ribbon-box'));
    const numeral = svg(
      'text',
      { x: 39, y: size === 'seat' ? 12.4 : 12, 'text-anchor': 'middle' },
      'suit-ribbon-numeral',
    );
    numeral.textContent = face.numeral;
    ribbon.append(numeral);
    band.append(ribbon);
    return band;
  }
  const cartouche = svg('svg', { viewBox: '0 0 72 27' }, 'suit-cartouche');
  cartouche.append(svg('path', { d: CARTOUCHE }, 'suit-cartouche-ground'));
  if (size === 'hand') cartouche.append(svg('path', { d: CARTOUCHE_RULE }, 'suit-cartouche-rule'));
  const numeral = svg('text', { x: 36, y: 18.6, 'text-anchor': 'middle' }, 'suit-cartouche-numeral');
  numeral.textContent = face.numeral;
  cartouche.append(numeral);
  band.append(cartouche);
  return band;
}

/**
 * **The foot**: the deck's name between two short rules in the type's ink. A
 * seated card keeps one rule and no words: at 120px wide the name is the
 * card, and the suit has already said the deck.
 */
export function suitFootNode(face: SuitFace, size: SuitSize): HTMLElement {
  const foot = element('span', 'suit-foot');
  if (size === 'seat') foot.setAttribute('aria-hidden', 'true');
  foot.append(element('i'));
  if (size === 'hand') {
    foot.append(element('span', 'suit-foot-deck', face.deck));
    foot.append(element('i'));
  }
  return foot;
}

/**
 * **Dresses `card` as an A3 face** of the given size: the ink and the rank as
 * data attributes, the rarity's frame and ornament, then a body holding the
 * medallion, whatever the surface prints (`middle`: the name, the rules, a
 * stamp) and the foot.
 *
 * The surface keeps its own element, so a hand card stays the offer's
 * `<button>` and a seated card the chair's `<span>`. Children already on `card`
 * stay ahead of the face, which is where the offer card keeps its ordinal.
 */
export function dressSuitFace(
  card: HTMLElement,
  face: SuitFace,
  size: SuitSize,
  middle: readonly Node[],
): void {
  card.classList.add('suit-face', `suit-${size}`);
  card.dataset.ink = face.ink;
  card.dataset.rank = face.rank;
  card.append(...suitFrameNodes(face.rank));
  card.append(suitRankNode(face, size));
  const body = element('span', 'suit-body');
  body.append(element('span', 'sr-only', face.caption));
  body.append(suitPlateNode(face, size));
  body.append(...middle);
  body.append(suitFootNode(face, size));
  card.append(body);
}

// --- the row ----------------------------------------------------------------

/** The small rarity marks a row carries: a grey dot, a pewter diamond, a black star. */
const RANK_MARK_PATH: Readonly<Record<Exclude<RankId, 'common'>, string>> = {
  uncommon: 'M0 -6.2L6.2 0L0 6.2L-6.2 0Z',
  rare: 'M0 -6.8L1.9 -1.9L6.8 0L1.9 1.9L0 6.8L-1.9 1.9L-6.8 0L-1.9 -1.9Z',
};

/** One rarity's small mark, as a row prints it. */
export function suitRankMarkNode(rank: RankId): SVGSVGElement {
  const mark = svg('svg', { viewBox: '-7 -7 14 14', 'aria-hidden': 'true' }, `suit-pip suit-pip-${rank}`);
  mark.append(
    rank === 'common'
      ? svg('circle', { cx: 0, cy: 0, r: 4.4 })
      : svg('path', { d: RANK_MARK_PATH[rank] }),
  );
  return mark;
}

/**
 * **The row's marks**: the type's ink as a stripe, the suit (or suits, or the
 * seal) in ink, and the rarity's small mark. The collection row leads with
 * them, and the Compendium uses them as an Order's mark.
 */
export function suitMarksNode(face: SuitFace): HTMLElement {
  const marks = element('span', 'suit-marks');
  marks.dataset.ink = face.ink;
  marks.setAttribute('role', 'img');
  marks.setAttribute('aria-label', face.caption);
  const stripe = element('b', 'suit-stripe');
  stripe.setAttribute('aria-hidden', 'true');
  marks.append(stripe);
  const drawn = marksOf(face.suits);
  for (const mark of drawn) {
    const glyph = glyphNode(mark);
    glyph.setAttribute('aria-hidden', 'true');
    glyph.classList.add('suit-row-glyph');
    if (drawn.length > 1) glyph.classList.add('is-pair');
    marks.append(glyph);
  }
  marks.append(suitRankMarkNode(face.rank));
  return marks;
}

/**
 * **A collection row** (the board's 36px row): the marks, the card's name, and
 * "deck · tier" in mono. `stacked` is for a row narrower than the board's (a
 * collection card): the marks and "deck · tier" share the first line and the
 * name takes the second, so a long name wraps across the card.
 */
export function suitRowNode(face: SuitFace, name: string, stacked = false): HTMLElement {
  const row = element('span', stacked ? 'suit-row is-stacked' : 'suit-row');
  row.dataset.ink = face.ink;
  row.append(suitMarksNode(face));
  const text = element('span', 'suit-row-text');
  text.append(element('span', 'suit-row-name', name));
  text.append(element('span', 'suit-row-meta', `${face.deck} · ${face.numeral}`));
  row.append(text);
  return row;
}
