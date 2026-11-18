/**
 * **The Order card's emblem face** (batch SS10, part 1).
 *
 * The user approved this face on 2026-11-17: *"i'm sold, face 1 is great,
 * please build it"* (`docs/plans/ui-critique-2026-10-16.md`, the last bullet).
 * The board is `docs/plans/mockups/scholars-study/order-card-faces.html`,
 * "Face 1, the emblem". The face is built from an emblem book's three parts:
 *
 *   - **the motto** above: the card's name, in IM Fell English small capitals,
 *     between two rules;
 *   - **the picture**: the deck's suit as an engraved device (a hatched disc, a
 *     double ring, a glory of rays and the suit with a cut shadow), in a framed
 *     field. The device is drawn in the type's ink;
 *   - **the subscription** beneath: the effect, in EB Garamond, opened by a red
 *     initial. The figures and the yield words are in rubric red.
 *
 * Round them: the tier as a Roman numeral on a plate at the head, the live line
 * as a colophon at the foot, a seal as a red cord and wax, and the rarity as the
 * richness of the border band. A Doctrine has the heaviest gilt frame.
 *
 * Where each part comes from
 * --------------------------
 * Nothing on the face is written here. The name is the row's, the effect is
 * `describeCard`'s clauses, printed through the keyword renderer
 * (`setDescriptorText`), and the tier, type, deck and rarity are the row's
 * fields in the game's own word tables (`deckBadges.ts`). The face never
 * shortens or rewrites a sentence. The live line is made by the caller and
 * passed in as words.
 *
 * Three things are read off the effect's own structure, by small pure
 * functions:
 *
 *   - **the red ink** (`rubricRuns`): a figure is a number as the describers
 *     print it (`+3`, `-2`, `30%`, `×2`), and a yield word is one of the six
 *     yield keys, which is how the describers name a yield (`bagWords` writes
 *     `+3 gold`). Keyword marks are never inked red: they are named things, set
 *     in small capitals;
 *   - **the tablet** (`firstFigure`): the first figure the describers print,
 *     with the yield mark when a yield word follows it. A card with no figure
 *     has no tablet, which is the board's treatment for a rule card;
 *   - **the initial** (`effectInitial`): the first letter of the effect. An
 *     effect that starts with a figure gets none, as the board says.
 *
 * The keyword clause (Commission, Charter, Scaler or Boon) is a label in the
 * picture's lower left corner, opposite the tablet, so it costs the effect no
 * line.
 *
 * Size
 * ----
 * One custom property, `--order-face-width`, sets the card's width. Everything
 * else is in em of that width (the board's 210 × 258 is `21em × 25.8em` at
 * 10 px), so the hand, the played card and the 2x specimen are the same face
 * scaled. The effect starts at 13 px on up to five lines. A longer effect steps
 * down to 11 px and no further; if it still does not fit, the picture field
 * shortens, and if that is not enough the card is marked `data-overflow` and
 * the text is left visible (`fitOrderFace`, `estimateOrderFaceFit`).
 *
 * The rarity frames are CSS (`orderFace.css`), and the corner marks are masks
 * drawn once (`src/art/orderFaceMarks.ts`), so no card carries art of its own.
 *
 * The pay plate (the Council screen, stage 1)
 * -------------------------------------------
 * The approved board `docs/plans/mockups/scholars-study/council-and-in-play/`
 * (frames PL and PM) puts what a card pays each turn at the foot of the card
 * itself: a heavy rule, then the figures in the card's own typeface and in the
 * yield colours, with happiness and authority in their own marks. A caller
 * that passes `plate` gets this foot in place of the figure tablet and the
 * live line. A rule card, a card that pays on an occasion and a card played
 * this visit get `plate: null`, which draws no plate, so the effect has the
 * room. A card that could pay and pays nothing this turn gets a small "+0"
 * and the reason. The face composes no figure: the caller hands it the
 * reading (`orderLive.ts`).
 *
 * The same face draws the government on the Council screen (the Doctrine's
 * gilt frame, the crown, the word "Government" on its plate), and
 * `tuckedDoctrineNode` draws a Doctrine tucked under it as a strip with its
 * name and figures.
 */

import './orderFace.css';

import {
  DEVICE_BOX,
  DEVICE_DISC,
  DEVICE_HATCH,
  DEVICE_RAYS,
  type OrderFaceMarkId,
  ORDER_FACE_MARKS,
  orderFaceMarkUri,
} from '../art/orderFaceMarks';
import { MARK_BOX, MARK_STROKE } from '../art/resourceMarks';
import type { MeterId } from '../sim/meters';
import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import { type CardClause, REF_PATTERN, describeCard, stripRefs } from '../sim/statecraft';
import {
  type ChairType,
  type DeckId,
  type CardId,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  cardDef,
  doctrineDef,
  governmentDef,
  isDoctrineId,
  isGovernmentId,
  orderDef,
  orderType,
} from '../sim/statecraftData';
import { meterMarkNode } from './meterMark';
import { slotMarkUrl } from './cardLine';
import { BAND_NUMERAL, DECK_SUIT, GENERIC_WORD, RARITY_WORD, TYPE_INK, TYPE_WORD, deckWord } from './deckBadges';
import { element } from './dom';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import { type InkId, SEAL_MARK, SUIT_MARKS, type SuitId } from './suitFace';
import { splitYieldText, yieldMarkNode } from './yieldMark';

// --- what a face is drawn from ------------------------------------------------

/** The cards this face draws: an Order or a Doctrine. */
export type OrderFaceCardId = OrderId | DoctrineId;

/**
 * Any card the face can draw: an Order, a Doctrine, or the government, which
 * the Council screen draws as a full card at the head of its left column.
 */
export type OrderFaceId = OrderFaceCardId | GovernmentId;

/** One figure on the pay plate: a yield or a meter, and its signed whole number. */
export interface PlateFigure {
  voice: CityYieldKey | MeterId;
  amount: number;
}

/**
 * **The pay plate**, made by the caller from a reading the game already has:
 *
 *   - `pays`: the figures, in the order every surface prints them (the six
 *     yields, then happiness and authority);
 *   - `idle`: the card could pay and pays nothing this turn. The plate prints
 *     a small "+0" and the reason, when there is one.
 */
export type OrderFacePlate =
  | { kind: 'pays'; figures: readonly PlateFigure[] }
  | { kind: 'idle'; reason?: string };

/** The border a card wears: its rarity, or the Doctrine's gilt frame. */
export type OrderFaceFrame = 'common' | 'uncommon' | 'rare' | 'doctrine';

/** The ink a face is drawn in: its type's, or gilt for a Doctrine. */
export type OrderFaceInk = InkId | 'gilt';

/**
 * **The live line**, made by the caller. The face prints `text` in the
 * colophon and does not compose it.
 *
 *   - `pays`: what the card pays now ("pays +15💰 this turn");
 *   - `counter`: a commission's count, drawn as beads before the words;
 *   - `standing`: a rule in force, with no figure;
 *   - `waiting`: anything else the caller wants said, such as a card that
 *     takes effect on Confirm.
 *
 * `text` may carry the yield glyphs of `figures.ts`, which print as drawn
 * marks, and keyword marks, which print as words.
 */
export interface OrderFaceLive {
  kind: 'pays' | 'counter' | 'standing' | 'waiting';
  text: string;
  /** The beads of a `counter`: how many are done, of how many. */
  progress?: { done: number; of: number };
}

/** What a face shows besides the card itself. */
export interface OrderFaceState {
  /** In the hand, or played into a chair. A hand card has no live line. */
  where: 'hand' | 'played';
  /** Turns left on a seal. Above zero draws the cord and the wax. */
  sealedTurns?: number;
  /** Played this visit and not yet confirmed: a dashed edge and faint art. */
  staged?: boolean;
  /** The live line, or null when there is nothing to say. */
  liveLine?: OrderFaceLive | null;
  /**
   * The card's condition is not met, so it pays nothing now. The device loses
   * its rays. `reason` is the caller's words, printed under the effect after a
   * dagger.
   */
  unmet?: { reason?: string } | null;
  /**
   * **The figure tablet, from the caller's live reading** (batch SS10, part 2):
   * what the card pays now, as the final board draws it ("+15" and the gold
   * mark, "3 / 4" for a commission, a grey "+0" for a card that pays nothing
   * now). Null draws no tablet: a rule card, or a card played this visit and
   * not yet confirmed. Left out, the face falls back to the first figure of the
   * card's own sentence (`firstFigure`), for places with no live reading: the
   * hand, the binder and the flair gallery.
   */
  tablet?: FirstFigure | null;
  /**
   * **The pay plate** (the Council screen, stage 1). Left out, the face draws
   * the tablet and the live line as before. Given, the face draws no tablet
   * and no live line: a plate draws the figures (or "+0" and the reason) at
   * the card's foot, and `null` draws nothing there, so the effect has the
   * room. A commission's counter keeps its beads line either way.
   */
  plate?: OrderFacePlate | null;
  /**
   * True when the face sits inside a control, such as the orders screen's
   * chair and hand buttons. A keyword is then bold and not a link, because the
   * click belongs to the control. Left out, the host's own tag decides
   * (`keywordsAllowedIn`).
   */
  inControl?: boolean;
  /** A small gilt tag on the top border, in the caller's words ("played, not confirmed"). */
  tag?: string;
}

// --- the red ink, the tablet and the initial ----------------------------------

/**
 * A figure as the describers print one: an optional sign (`+`, `-`, `−` or
 * `×`), digits, an optional decimal part and an optional `%`. It may not be
 * part of a word.
 */
const FIGURE_SOURCE = String.raw`(?<![\p{L}\p{N}])[+\-−×]?\d+(?:\.\d+)?%?(?![\p{L}\p{N}])`;

/**
 * A yield word: one of the six yield keys, the words the describers name a
 * yield by. Read from the simulation's own list, so a seventh yield joins
 * with no edit here. The first letter may be a capital.
 */
const YIELD_SOURCE = `(?<![\\p{L}])(?:${CITY_YIELD_KEYS.map(
  (key) => `[${key[0]!}${key[0]!.toUpperCase()}]${key.slice(1)}`,
).join('|')})(?![\\p{L}])`;

/** One run of an effect's words: plain, a figure, or a yield word. */
export interface RubricRun {
  kind: 'plain' | 'figure' | 'yield';
  text: string;
}

/**
 * **The red ink**: a run of plain words (no keyword marks in it) split into
 * the figures and yield words that are set in rubric, and the words between.
 * Joining the runs' text gives back the input exactly.
 */
export function rubricRuns(text: string): RubricRun[] {
  const pattern = new RegExp(`(${FIGURE_SOURCE})|(${YIELD_SOURCE})`, 'gu');
  const runs: RubricRun[] = [];
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > at) runs.push({ kind: 'plain', text: text.slice(at, index) });
    runs.push({ kind: match[1] !== undefined ? 'figure' : 'yield', text: match[0] });
    at = index + match[0].length;
  }
  if (at < text.length) runs.push({ kind: 'plain', text: text.slice(at) });
  return runs;
}

/** The yield key a yield word names. */
function yieldOfWord(word: string): CityYieldKey | null {
  const lower = word.toLowerCase();
  return CITY_YIELD_KEYS.find((key) => key === lower) ?? null;
}

/** The figure lifted into the picture's tablet, and the yield it is in. */
export interface FirstFigure {
  figure: string;
  yield: CityYieldKey | null;
}

/**
 * **The first figure** of an effect, for the tablet: the first number the
 * describers print, with the yield whose word follows it ("+3 gold" gives +3
 * and gold, "+2 combat strength" gives +2 and no yield). `text` is the
 * effect's plain words, keyword marks taken off. Null when the effect prints
 * no number, which is a rule card.
 */
export function firstFigure(text: string): FirstFigure | null {
  const run = rubricRuns(text);
  const index = run.findIndex((part) => part.kind === 'figure');
  if (index < 0) return null;
  const figure = run[index]!.text;
  const between = run[index + 1];
  const word = run[index + 2];
  const follows =
    between !== undefined && between.kind === 'plain' && /^\s+$/.test(between.text) && word?.kind === 'yield';
  return { figure, yield: follows ? yieldOfWord(word.text) : null };
}

/**
 * **The red initial**: the effect's first letter, or null when the effect
 * starts with anything else (a figure, a sign). `text` is the plain words of
 * the effect's first clause. The face sets the letter as a capital in the
 * stylesheet, so the words in the document stay the describer's.
 */
export function effectInitial(text: string): string | null {
  const first = Array.from(text)[0];
  if (first === undefined) return null;
  return /\p{L}/u.test(first) ? first : null;
}

// --- the face, as data ----------------------------------------------------------

/** The word on a Doctrine's plate, where an Order has its tier. */
const DOCTRINE_WORD = 'Doctrine';

/** The word on the government's plate on the Council screen (the board's C6). */
const GOVERNMENT_WORD = 'Government';

/**
 * The text sizes the effect may take, in pixels at the played size (210 wide),
 * largest first. The board's size is 13. Nothing goes under 11.
 */
export const ORDER_FACE_TEXT_SIZES: readonly number[] = [13, 12.5, 12, 11.5, 11];

/** The picture's two heights: the board's, and the short field a long effect takes. */
export type OrderFacePicture = 'full' | 'short';

/** How the effect fits: its size, the picture it leaves room for, and whether it overflows. */
export interface OrderFaceFit {
  size: number;
  picture: OrderFacePicture;
  over: boolean;
}

/** Everything a face prints, worked out from the row and the state. */
export interface OrderFaceModel {
  id: OrderFaceId;
  kind: 'order' | 'doctrine' | 'government';
  frame: OrderFaceFrame;
  ink: OrderFaceInk;
  /** The suits in the device: one, two for a card two decks share, none for the seal. */
  suits: readonly SuitId[];
  /** The tier numeral, or the Doctrine word. */
  plate: string;
  name: string;
  /** The keyword clause (Commission, Charter, Scaler or Boon), or null. */
  keyword: CardClause | null;
  /** The effect's clauses, the keyword clause left out. */
  clauses: readonly CardClause[];
  initial: string | null;
  tablet: FirstFigure | null;
  /** False for a card that pays nothing now. */
  rays: boolean;
  /** Type, rarity, deck and tier in words, for a reader who cannot see the face. */
  caption: string;
  /** The type and the deck in words, for the colophon when there is no live line. */
  foot: string;
  /** The estimated fit, which `fitOrderFace` corrects on the page. */
  fit: OrderFaceFit;
}

/** The decks a row belongs to, in words: one, both, or "Generic" for none. */
function decksWords(decks: readonly DeckId[]): string {
  return decks.length === 0 ? GENERIC_WORD : decks.map(deckWord).join(' · ');
}

/** The border a card wears. The government wears the Doctrine's gilt frame. */
export function orderFaceFrame(id: OrderFaceId): OrderFaceFrame {
  return isDoctrineId(id) || isGovernmentId(id) ? 'doctrine' : orderDef(id).rarity;
}

/**
 * **A face's model**, from the card and its state. Pure: no document is read,
 * so the tests can sweep every row.
 */
export function orderFaceModel(id: OrderFaceId, state: OrderFaceState): OrderFaceModel {
  const all = describeCard(id);
  const keyword = all.find((clause) => clause.keyword !== undefined) ?? null;
  const clauses = all.filter((clause) => clause.keyword === undefined);
  const first = clauses[0];
  const plainFirst = first === undefined ? '' : stripRefs(first.text);
  const plainAll = clauses.map((clause) => stripRefs(clause.text)).join(' ');
  const unmet = state.unmet !== undefined && state.unmet !== null;
  const reason = unmet ? (state.unmet?.reason ?? '') : '';

  let kind: OrderFaceModel['kind'];
  let ink: OrderFaceInk;
  let plate: string;
  let decks: readonly DeckId[];
  let caption: string;
  let foot: string;
  let name: string;
  let suits: readonly SuitId[] | null = null;
  if (isGovernmentId(id)) {
    // The government belongs to no deck. It wears the crown, as the register
    // drew it, and the board's word on its plate.
    kind = 'government';
    ink = 'gilt';
    plate = GOVERNMENT_WORD;
    decks = [];
    suits = [GOVERNMENT_SUIT];
    name = governmentDef(id).name;
    caption = `${GOVERNMENT_WORD} · ${name}`;
    foot = GOVERNMENT_WORD;
  } else if (isDoctrineId(id)) {
    const def = doctrineDef(id);
    kind = 'doctrine';
    ink = 'gilt';
    plate = DOCTRINE_WORD;
    decks = def.decks;
    name = def.name;
    const deck = decksWords(def.decks);
    caption = `${DOCTRINE_WORD} · ${deck} · Tier ${BAND_NUMERAL[def.band]}`;
    foot = deck;
  } else {
    const def = orderDef(id);
    const type = orderType(id);
    kind = 'order';
    ink = TYPE_INK[type];
    plate = BAND_NUMERAL[def.band];
    decks = def.decks;
    name = def.name;
    const deck = decksWords(def.decks);
    caption = `${TYPE_WORD[type]} · ${RARITY_WORD[def.rarity]} · ${deck} · Tier ${plate}`;
    foot = `${TYPE_WORD[type]} · ${deck}`;
  }
  const initial = effectInitial(plainFirst);
  return {
    id,
    kind,
    frame: orderFaceFrame(id),
    ink,
    suits: suits ?? decks.map((deck) => DECK_SUIT[deck]),
    plate,
    name,
    keyword,
    clauses,
    initial,
    // With a pay plate the figure is at the foot, so the picture has no tablet.
    tablet: state.plate !== undefined ? null : state.tablet !== undefined ? state.tablet : firstFigure(plainAll),
    rays: !unmet,
    caption,
    foot,
    fit: estimateOrderFaceFit(
      clauses.map((clause) => ({ plain: stripRefs(clause.text), named: namedLetters(clause.text) })),
      // The reason is in the plate when there is one, not under the effect.
      { initial: initial !== null, reason: state.plate !== undefined ? '' : reason, doctrine: kind !== 'order' },
    ),
  };
}

// --- the fit, estimated -----------------------------------------------------------

/**
 * The measures the estimate works from, in pixels at the played size. The
 * two boxes are the effect's box as the page lays it out (`orderFace.css`,
 * measured in the browser on 2026-11-17): 170 wide on an Order and 164 on a
 * Doctrine, whose gilt band is wider; 85 tall beside the full picture and
 * 115 beside the short one on an Order, and 79 and 109 on a Doctrine.
 *
 * The four shares below were set by measuring every live card on the page in
 * EB Garamond, 577 cards (`fitOrderFace` beside this estimate; the flair
 * gallery's "Every live card, measured" does the same count). With them the
 * estimate is never larger than the size the page settles on, so a card drawn
 * before its fonts load never starts out too large; and no live card is
 * estimated not to fit. The letter share sits near the middle of the range
 * where both hold (0.4075 to 0.415), so a small change of text moves neither.
 */
const FIT_MEASURES = {
  width: { order: 170, doctrine: 164 },
  height: { order: { full: 85, short: 115 }, doctrine: { full: 79, short: 109 } },
  lineHeight: 1.2,
  /** The average letter's width, as a share of the text size. */
  letter: 0.41,
  /** The letters a line break wastes at the end of a line, on average. */
  waste: 0.5,
  /** The width the initial takes from each of the first two lines, as a share of the size. */
  initial: 2,
  /** The room a clause break costs, in lines: the gap, and the part line it leaves. */
  gap: 0.2,
  /**
   * The extra width of a named thing's letters, as a share of a letter. A
   * name is set in semibold small capitals, which run wider than the words
   * round them.
   */
  named: 0.2,
} as const;

/** How many lines one clause takes at a size. `chars` counts a named thing's letters at their extra width. */
function clauseLines(chars: number, size: number, width: number, initial: boolean): number {
  const perLine = Math.max(1, width / (FIT_MEASURES.letter * size) - FIT_MEASURES.waste);
  const lost = initial ? (2 * FIT_MEASURES.initial) / FIT_MEASURES.letter : 0;
  const lines = Math.ceil((chars + lost) / perLine);
  return initial ? Math.max(2, lines) : lines;
}

/** A clause as the estimate counts it: its plain words, and how many letters its named things have. */
export interface FitClause {
  plain: string;
  named: number;
}

/** The letters of the named things in a clause with keyword marks. */
function namedLetters(clause: string): number {
  let named = 0;
  for (const match of clause.matchAll(REF_PATTERN)) named += (match[3] ?? '').length;
  return named;
}

/**
 * A clause's length for the estimate: its plain letters, and a share more for
 * the letters of each named thing (`FIT_MEASURES.named`). A plain string has
 * no named things.
 */
function clauseWeight(clause: string | FitClause): number {
  if (typeof clause === 'string') return clause.length;
  return clause.plain.length + FIT_MEASURES.named * clause.named;
}

/**
 * **The estimated fit**: the largest size at which every clause, and the
 * reason line when there is one, fits the effect's box. Beside the full
 * picture first, then the short one; `over` when neither holds it at 11 px.
 * A clause may say how many letters its named things have; they count a
 * little wider.
 * The page measures and corrects it (`fitOrderFace`).
 */
export function estimateOrderFaceFit(
  clauses: readonly (string | FitClause)[],
  options: { initial: boolean; reason: string; doctrine: boolean },
): OrderFaceFit {
  const kind = options.doctrine ? 'doctrine' : 'order';
  const width = FIT_MEASURES.width[kind];
  const pictures: readonly OrderFacePicture[] = ['full', 'short'];
  for (const picture of pictures) {
    for (const size of ORDER_FACE_TEXT_SIZES) {
      let lines = 0;
      clauses.forEach((clause, index) => {
        lines += clauseLines(clauseWeight(clause), size, width, index === 0 && options.initial);
      });
      lines += Math.max(0, clauses.length - 1) * FIT_MEASURES.gap;
      // The reason line is set at 0.92 of the effect and never under 11 px.
      if (options.reason !== '') {
        lines += (clauseLines(options.reason.length + 2, Math.max(11, size * 0.92), width, false) * Math.max(11, size * 0.92)) / size;
      }
      if (lines * size * FIT_MEASURES.lineHeight <= FIT_MEASURES.height[kind][picture]) {
        return { size, picture, over: false };
      }
    }
  }
  return { size: ORDER_FACE_TEXT_SIZES[ORDER_FACE_TEXT_SIZES.length - 1]!, picture: 'short', over: true };
}

// --- drawing ----------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

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

/** Where a suit sits in the device: its corner on the 100-unit box, and its scale from 64. */
interface SuitPlacement {
  x: number;
  y: number;
  scale: number;
}

/**
 * Where the suits sit. One suit takes the board's place (at 23, 23, scaled
 * to 0.78). Two suits, for a card two decks share, sit side by side inside
 * the inner ring, smaller.
 */
function suitPlacements(count: number): SuitPlacement[] {
  if (count <= 1) return [{ x: 23, y: 23, scale: 0.78 }];
  const scale = 0.42;
  const size = MARK_BOX * scale;
  const gap = 2;
  const left = 50 - (size * count + gap * (count - 1)) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: left + index * (size + gap) - 1,
    y: 50 - size / 2 - 1.5,
    scale,
  }));
}

/** One suit, drawn at its place: the game's own paths at the game's own weights. */
function suitGroup(paths: (typeof SEAL_MARK)['paths'], at: SuitPlacement, className: string): SVGGElement {
  const group = svg(
    'g',
    {
      transform: `translate(${at.x} ${at.y}) scale(${at.scale})`,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': MARK_STROKE,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    className,
  );
  for (const path of paths) {
    const node = svg('path', { d: path.d });
    if (path.fill === true) node.setAttribute('fill', 'currentColor');
    if (path.width !== undefined && path.width !== MARK_STROKE) {
      node.setAttribute('stroke-width', path.width === 0 ? '0' : String(path.width));
    }
    group.append(node);
  }
  return group;
}

/**
 * **The device**: the glory of rays (left out when the card pays nothing
 * now), the hatched disc and its double ring, then the suit with its cut
 * shadow, offset down and to the right in ink.
 */
function deviceNode(suits: readonly SuitId[], rays: boolean): SVGSVGElement {
  const root = svg('svg', { viewBox: `0 0 ${DEVICE_BOX} ${DEVICE_BOX}`, 'aria-hidden': 'true' }, 'of-device');
  if (rays) root.append(svg('path', { d: DEVICE_RAYS }, 'of-rays'));
  root.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.r }, 'of-disc'));
  root.append(svg('path', { d: DEVICE_HATCH }, 'of-hatch'));
  root.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.r }, 'of-ring'));
  root.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.ring }, 'of-ring-inner'));
  const marks = suits.length === 0 ? [SEAL_MARK.paths] : suits.map((suit) => SUIT_MARKS[suit].paths);
  const places = suitPlacements(marks.length);
  // Every shadow before any suit, so a pair's shadows never cross a suit.
  marks.forEach((paths, index) => {
    const at = places[index]!;
    root.append(suitGroup(paths, { ...at, x: at.x + 1.5, y: at.y + 1.5 }, 'of-suit-shadow'));
  });
  marks.forEach((paths, index) => root.append(suitGroup(paths, places[index]!, 'of-suit')));
  return root;
}

/**
 * The corner marks, handed to the document once as custom properties, so the
 * stylesheet can mask them and no card carries its own copy of the drawing.
 */
function installOrderFaceMarks(root: HTMLElement): void {
  if (root.style.getPropertyValue('--of-mark-star') !== '') return;
  for (const id of Object.keys(ORDER_FACE_MARKS) as OrderFaceMarkId[]) {
    root.style.setProperty(`--of-mark-${id}`, `url("${orderFaceMarkUri(id)}")`);
  }
}

/** An empty span the stylesheet draws: a corner mark, the cord, a rule. */
function drawn(className: string): HTMLElement {
  const node = element('span', className);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

/**
 * **The rubric pass**: after the keyword renderer has drawn a clause, each
 * plain text node outside a keyword is split into its figures, yield words
 * and the words between, and the first two are wrapped in red. The renderer
 * keeps the keywords and the glyph marks; this adds only the ink.
 */
function rubricate(host: HTMLElement): void {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.parentElement?.closest('.kw') !== null) continue;
    texts.push(node as Text);
  }
  for (const text of texts) {
    const runs = rubricRuns(text.data);
    if (runs.every((run) => run.kind === 'plain')) continue;
    const fragment = document.createDocumentFragment();
    for (const run of runs) {
      if (run.kind === 'plain') fragment.append(document.createTextNode(run.text));
      else fragment.append(element('span', run.kind === 'figure' ? 'of-n' : 'of-yw', run.text));
    }
    text.replaceWith(fragment);
  }
}

/**
 * Sets the clause's first letter apart as the red initial. The letter stays
 * in the document as the describer wrote it; the stylesheet sets it as a
 * capital.
 */
function setInitial(host: HTMLElement): void {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node as Text;
    if (text.data === '') continue;
    const first = Array.from(text.data)[0]!;
    text.splitText(first.length);
    text.replaceWith(element('span', 'of-initial', first));
    return;
  }
}

/**
 * **The colophon's words**: the live line's text, keyword marks taken off
 * and yield glyphs drawn. A figure that a yield mark follows is set with the
 * mark in that yield's ink, as the board's colophon does.
 */
function colophonText(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const parts = splitYieldText(stripRefs(text));
  parts.forEach((part, index) => {
    if (part.kind !== 'text') {
      if (part.kind === 'mark') fragment.append(yieldMarkNode(part.key, part.lead));
      return;
    }
    const next = parts[index + 1];
    const figure = next?.kind === 'mark' ? /([+\-−]?\d+(?:\.\d+)?%?)$/.exec(part.text) : null;
    if (figure === null || next?.kind !== 'mark') {
      fragment.append(document.createTextNode(part.text));
      return;
    }
    fragment.append(document.createTextNode(part.text.slice(0, figure.index)));
    const sig = element('span', 'of-sig', figure[1]!);
    sig.dataset.yield = next.key;
    sig.append(yieldMarkNode(next.key));
    fragment.append(sig);
    // The mark is drawn inside the figure's span, so the walk skips it.
    parts[index + 1] = { kind: 'text', text: '' };
  });
  return fragment;
}

/** The beads of a counter: one for each step, the done ones gilt. */
function beadsNode(progress: { done: number; of: number }): HTMLElement {
  const beads = drawn('of-beads');
  const of = Math.max(0, Math.min(12, Math.round(progress.of)));
  for (let index = 0; index < of; index += 1) {
    beads.append(element('i', index < progress.done ? 'is-on' : undefined));
  }
  return beads;
}

/** The plate, the name, the picture and the colophon: everything but the effect. */
function headNodes(model: OrderFaceModel, linked: boolean): HTMLElement[] {
  const plate = element('span', 'of-plate', model.plate);
  plate.setAttribute('aria-hidden', 'true');

  const motto = element('div', 'of-motto');
  motto.append(drawn('of-rule'), element('span', 'of-name', model.name), drawn('of-rule'));

  const picture = element('div', 'of-pict');
  picture.append(deviceNode(model.suits, model.rays));
  if (model.frame === 'rare' || model.frame === 'doctrine') {
    picture.append(drawn('of-cn is-sun'), drawn('of-cn is-moon'));
  }
  if (model.keyword !== null) {
    const label = element('span', 'of-keyword');
    setDescriptorText(label, model.keyword.text, { linked });
    picture.append(label);
  }
  if (model.tablet !== null) {
    const tablet = element('span', 'of-tablet');
    tablet.setAttribute('aria-hidden', 'true');
    tablet.append(element('b', undefined, model.tablet.figure));
    if (model.tablet.yield !== null) tablet.append(yieldMarkNode(model.tablet.yield));
    picture.append(tablet);
  }
  // The hand form's name, under the device. The stylesheet shows it only in
  // that form, where the motto is hidden (batch SS10, part 2).
  const handName = element('span', 'of-hand-name', model.name);
  return [plate, motto, picture, handName];
}

/** The subscription: every effect clause, the first opened by the initial, then the reason. */
function subscriptionNode(model: OrderFaceModel, state: OrderFaceState, linked: boolean): HTMLElement {
  const sub = element('div', 'of-sub');
  model.clauses.forEach((clause, index) => {
    const line = element('span', clause.deferred === true ? 'of-clause is-deferred' : 'of-clause');
    setDescriptorText(line, clause.text, { linked });
    if (clause.deferred === true) line.title = 'Declared, and not built yet';
    rubricate(line);
    if (index === 0 && model.initial !== null) setInitial(line);
    sub.append(line);
  });
  // With a pay plate the reason is printed in the plate, beside its "+0".
  const reason = state.plate === undefined ? state.unmet?.reason : undefined;
  if (reason !== undefined && reason !== '') sub.append(element('span', 'of-why', `† ${stripRefs(reason)}`));
  return sub;
}

/** The mark of one plate voice: a yield's drawing, or a meter's. */
function plateMarkNode(voice: PlateFigure['voice']): HTMLElement {
  if (voice === 'happiness' || voice === 'authority') {
    const mark = meterMarkNode(voice);
    mark.classList.add('meter-mark-inline');
    return mark;
  }
  return yieldMarkNode(voice);
}

/** A signed whole number as every figure here is written: an explicit plus, and a real minus sign. */
export function plateFigureText(amount: number): string {
  return `${amount < 0 ? '−' : '+'}${String(Math.abs(amount))}`;
}

/**
 * **One figure of the pay plate, or of the Council's totals**: the signed
 * number and its mark, in the voice's ink. A minus figure wears the debit red
 * (`data-sign`), and keeps its mark.
 */
export function plateFigureNode(figure: PlateFigure, className = 'of-pay-fig'): HTMLElement {
  const node = element('span', className);
  node.dataset.voice = figure.voice;
  if (figure.amount < 0) node.dataset.sign = 'minus';
  node.append(element('b', undefined, plateFigureText(figure.amount)), plateMarkNode(figure.voice));
  return node;
}

/**
 * **The pay plate** (the board's PL and PM): a heavy rule and the figures, or a
 * small "+0" and the reason. Read aloud as the figures in words, through the
 * card's caption and the chair's label; the plate itself is drawn.
 */
function payPlateNode(plate: OrderFacePlate): HTMLElement {
  const node = element('div', 'of-pay');
  node.dataset.plate = plate.kind;
  if (plate.kind === 'idle') {
    node.append(element('b', 'of-pay-zero', '+0'));
    if (plate.reason !== undefined && plate.reason !== '') {
      node.append(element('span', 'of-pay-why', stripRefs(plate.reason)));
    }
    return node;
  }
  for (const figure of plate.figures) node.append(plateFigureNode(figure));
  return node;
}

/**
 * The foot of a face with a pay plate: the plate, a commission's beads, the
 * type and the deck for a card in the hand, or nothing for a card in a chair
 * that pays no figure each turn.
 */
function plateFootNode(model: OrderFaceModel, state: OrderFaceState): HTMLElement | null {
  const live = state.where === 'played' ? (state.liveLine ?? null) : null;
  // A commission's beads, and the line of a card played this visit, which
  // says the plate lands on Confirm.
  if (live?.kind === 'counter' || (state.staged === true && live !== null)) return colophonNode(model, { ...state, unmet: null });
  if (state.plate !== null && state.plate !== undefined) return payPlateNode(state.plate);
  if (state.where === 'hand') return colophonNode(model, { where: 'hand' });
  return null;
}

/** The colophon: the live line, or the type and the deck when there is none. */
function colophonNode(model: OrderFaceModel, state: OrderFaceState): HTMLElement {
  const colophon = element('div', 'of-colo');
  const live = state.where === 'played' ? (state.liveLine ?? null) : null;
  if (live === null) {
    colophon.append(element('span', 'of-foot', model.foot));
    return colophon;
  }
  colophon.dataset.live = live.kind;
  if (live.kind === 'counter' && live.progress !== undefined) colophon.append(beadsNode(live.progress));
  const words = element('span', 'of-live');
  words.append(colophonText(live.text));
  colophon.append(words);
  if (state.unmet?.reason !== undefined && state.unmet.reason !== '') {
    colophon.append(element('span', 'of-dagger', '†'));
  }
  return colophon;
}

/**
 * **Dresses `host` as the emblem face** of a card in a state. The host keeps
 * its own element, so a hand card can stay a `<button>` and a reading card an
 * `<article>`; a keyword inside a button is bold and not a link
 * (`keywordsAllowedIn`).
 */
export function dressOrderFace(host: HTMLElement, id: OrderFaceId, state: OrderFaceState): OrderFaceModel {
  installOrderFaceMarks(document.documentElement);
  const model = orderFaceModel(id, state);
  const linked = state.inControl === true ? false : keywordsAllowedIn(host);
  host.classList.add('order-face');
  host.dataset.frame = model.frame;
  host.dataset.ink = model.ink;
  host.dataset.where = state.where;
  host.dataset.picture = model.fit.picture;
  host.style.setProperty('--of-text', `${model.fit.size / 10}em`);
  if (model.name.length > 21) host.dataset.name = 'long';
  if (model.fit.over) host.dataset.overflow = 'true';
  if (state.staged === true) host.dataset.staged = 'true';
  if (state.unmet !== undefined && state.unmet !== null) host.dataset.unmet = 'true';
  if (model.tablet === null) host.dataset.rule = 'true';
  if (state.plate !== undefined) host.dataset.plate = state.plate === null ? 'none' : state.plate.kind;
  if (model.kind === 'government') host.dataset.government = 'true';

  const inner = element('div', 'of-in');
  inner.append(element('span', 'sr-only', model.caption));
  inner.append(...headNodes(model, linked));
  inner.append(subscriptionNode(model, state, linked));
  if (state.plate === undefined) inner.append(colophonNode(model, state));
  else {
    const foot = plateFootNode(model, state);
    if (foot !== null) inner.append(foot);
  }
  host.append(inner);

  if (model.frame !== 'common') {
    for (const corner of ['is-a', 'is-b', 'is-c', 'is-d']) host.append(drawn(`of-orn ${corner}`));
  }
  const sealed = state.sealedTurns ?? 0;
  if (sealed > 0) {
    host.dataset.sealed = String(sealed);
    host.append(drawn('of-cord'));
    const wax = element('span', 'of-wax');
    wax.append(element('b', undefined, String(sealed)));
    host.append(wax);
  }
  if (state.tag !== undefined && state.tag !== '') host.append(element('span', 'of-tag', state.tag));
  return model;
}

/** **An emblem face** as a new `<article>`, for a surface that reads a card. */
export function orderFaceNode(id: OrderFaceId, state: OrderFaceState): HTMLElement {
  const card = element('article');
  dressOrderFace(card, id, state);
  return card;
}

/**
 * **An empty chair**, the size of a played card: a dashed outline in the
 * chair type's ink, the type's mark faint inside it, and the caller's word
 * under the mark. The chair marks are the game's own (`SLOT_MARKS`).
 */
export function emptyChairFace(type: ChairType, word: string): HTMLElement {
  const chair = element('div', 'order-face-chair');
  chair.dataset.ink = type;
  const mark = drawn('of-chair-mark');
  mark.style.setProperty('--of-chair-mark', slotMarkUrl(type));
  chair.append(mark, element('span', 'of-chair-word', word));
  return chair;
}

// --- the chair's tab --------------------------------------------------------------

/** What a chair's tab says: its type, its number, and the seal's turns left. */
export interface ChairTab {
  type: ChairType;
  /** The chair's number, counted from 1 in the council's own order. */
  number: number;
  /** The type in words, as the plates print it ("Military"). */
  word: string;
  /** Turns left on the seal. Above zero draws the lock and the turns. */
  sealedTurns?: number;
  /** A short extra word after the type, such as a position the law reads. */
  note?: string;
}

/**
 * **The chair's tab** (batch SS10, part 2): a small plate centred on the
 * card's bottom border, with the chair type's mark, the chair's number and
 * type, and a lock with the turns left while the seal holds. The final board
 * puts it across the card's foot, so a chair needs no line of its own under
 * the card. The caller appends it to the card or to the empty chair.
 */
export function chairTabNode(tab: ChairTab): HTMLElement {
  installOrderFaceMarks(document.documentElement);
  const node = element('span', 'of-ctab');
  node.dataset.ink = tab.type;
  const mark = drawn('of-ctab-mark');
  mark.style.setProperty('--of-chair-mark', slotMarkUrl(tab.type));
  node.append(mark, element('span', 'of-ctab-words', `${tab.number} ${tab.word}`));
  if (tab.note !== undefined && tab.note !== '') node.append(element('span', 'of-ctab-note', tab.note));
  const sealed = tab.sealedTurns ?? 0;
  if (sealed > 0) {
    const lock = element('span', 'of-ctab-lock');
    lock.append(drawn('of-lock'), document.createTextNode(`${sealed}t`));
    node.append(lock);
  }
  return node;
}

// --- the register's wide form ----------------------------------------------------

/**
 * The suit drawn in the government's device. A government belongs to no deck;
 * the final board draws it with the crown, so the register opens with the one
 * card that is the empire's head.
 */
export const GOVERNMENT_SUIT: SuitId = 'crowns';

/** What a card in the register is drawn from. */
export interface RegisterFace {
  /** The card: a Doctrine (a deck's, or an older one a save still holds), or the government. */
  id: CardId;
  kind: 'doctrine' | 'government';
  /** The plate's words: "Doctrine", or the government's tier ("Tier 31"). */
  plate: string;
  /** The live plate on the top border, built by the caller, or null for none. */
  live: HTMLElement | null;
  /** Words for a government with no law of its own. */
  noLaw?: string;
}

/**
 * **A card in the gilt register, laid wide** (batch SS10, part 2): the final
 * board's form for the government and each Doctrine. The Doctrine frame, with
 * the device in a picture at the left and the name and the effect at the
 * right. The effect has no initial, as the board says for the wide form, and
 * its figures are in rubric as on every face. The live plate sits on the top
 * border at the right.
 */
export function registerFaceNode(face: RegisterFace): HTMLElement {
  installOrderFaceMarks(document.documentElement);
  const card = element('article', 'order-face');
  const linked = keywordsAllowedIn(card);
  card.dataset.form = 'wide';
  card.dataset.frame = 'doctrine';
  card.dataset.ink = 'gilt';
  card.dataset.register = face.kind;
  const name = cardDef(face.id).name;
  // A deck's Doctrine wears its decks' suits; an older Doctrine of no deck the
  // lozenge seal (an empty list); the government the crown.
  const suits: readonly SuitId[] =
    face.kind === 'government'
      ? [GOVERNMENT_SUIT]
      : isDoctrineId(face.id)
        ? doctrineDef(face.id).decks.map((deck) => DECK_SUIT[deck])
        : [];
  const inner = element('div', 'of-in');
  const plate = element('span', 'of-plate', face.plate);
  plate.setAttribute('aria-hidden', 'true');
  const picture = element('div', 'of-pict');
  picture.append(deviceNode(suits, true));
  const right = element('div', 'of-rt');
  const head = element('div', 'of-mh');
  head.append(element('span', 'of-name', name));
  right.append(head);
  const sub = element('div', 'of-sub');
  const clauses = describeCard(face.id).filter((clause) => clause.keyword === undefined);
  if (clauses.length === 0 && face.noLaw !== undefined) sub.append(element('span', 'of-clause is-none', face.noLaw));
  for (const clause of clauses) {
    const line = element('span', clause.deferred === true ? 'of-clause is-deferred' : 'of-clause');
    setDescriptorText(line, clause.text, { linked });
    rubricate(line);
    sub.append(line);
  }
  right.append(sub);
  inner.append(element('span', 'sr-only', `${face.plate} · ${name}`), plate, picture, right);
  card.append(inner);
  if (face.live !== null) {
    face.live.classList.add('of-livep');
    card.append(face.live);
  }
  return card;
}

// --- a Doctrine tucked under the government ------------------------------------------

/**
 * **A Doctrine tucked under the government** (the board's C6): a gilt strip that
 * shows the Doctrine's name and what it pays, its top hidden under the card
 * above. A rule Doctrine shows its name only, and an idle one a small "+0".
 * The caller makes the strip a control and lifts the full face on hover.
 */
export function tuckedDoctrineNode(id: CardId, plate: OrderFacePlate | null): HTMLElement {
  installOrderFaceMarks(document.documentElement);
  const strip = element('div', 'order-tuck');
  strip.dataset.frame = 'doctrine';
  const inner = element('span', 'of-tuck-in');
  inner.append(element('span', 'of-tuck-name', cardDef(id).name));
  const figures = element('span', 'of-tuck-pay');
  if (plate?.kind === 'pays') for (const figure of plate.figures) figures.append(plateFigureNode(figure));
  else if (plate?.kind === 'idle') figures.append(element('b', 'of-pay-zero', '+0'));
  inner.append(figures);
  strip.append(inner);
  return strip;
}

/**
 * **A card's back**, for the draft pile at the foot of the Council screen (the
 * board's C6): the deep violet with gilt dots, a gilt edge, the sun, and the
 * edges of the cards under it. Drawn by the stylesheet.
 */
export function orderBackNode(): HTMLElement {
  installOrderFaceMarks(document.documentElement);
  return drawn('order-back');
}

// --- the fit, measured --------------------------------------------------------------

/** True when an element's content is taller than its box, by more than a rounding. */
function overflows(node: HTMLElement): boolean {
  return node.scrollHeight > node.clientHeight + 1;
}

/**
 * **Fits a face's effect on the page**, after it is laid out and its fonts
 * are loaded: the largest size from 13 px down to 11 px at which the effect
 * fits beside the full picture, then beside the short one. A face that still
 * does not fit is marked `data-overflow` and its text is left visible, so a
 * card that cannot fit is seen, not cut. A long name and a long live line
 * step down the same way (`fitName`, `fitColophon`). Returns what it settled
 * on, with sizes in pixels at the played size.
 */
export function fitOrderFace(card: HTMLElement): OrderFaceMeasuredFit {
  const name = fitName(card);
  const colophon = fitColophon(card);
  const sub = card.querySelector<HTMLElement>('.of-sub');
  if (sub === null) return { size: 0, picture: 'full', over: false, name, colophon };
  delete card.dataset.overflow;
  for (const picture of ['full', 'short'] as const) {
    card.dataset.picture = picture;
    for (const size of ORDER_FACE_TEXT_SIZES) {
      card.style.setProperty('--of-text', `${size / 10}em`);
      if (!overflows(sub)) return { size, picture, over: false, name, colophon };
    }
  }
  card.dataset.overflow = 'true';
  return {
    size: ORDER_FACE_TEXT_SIZES[ORDER_FACE_TEXT_SIZES.length - 1]!,
    picture: 'short',
    over: true,
    name,
    colophon,
  };
}

/** What `fitOrderFace` settled on: the effect's fit, the name's step and the colophon's lines. */
export interface OrderFaceMeasuredFit extends OrderFaceFit {
  /** The name's size: the board's 13 px, its 11.4 px for a long name, or 11 px with no tracking. */
  name: 'full' | 'long' | 'tight';
  /** The live line on one line at 12 px, on two at 11 px, or cut after two. */
  colophon: 'one' | 'two' | 'cut';
}

/**
 * The name's step: the largest that leaves each rule beside it at least
 * 0.6 em long, as the board's longest name does.
 */
function fitName(card: HTMLElement): OrderFaceMeasuredFit['name'] {
  const name = card.querySelector<HTMLElement>('.of-name');
  const motto = card.querySelector<HTMLElement>('.of-motto');
  if (name === null || motto === null) return 'full';
  const em = Number.parseFloat(getComputedStyle(card).fontSize);
  const style = getComputedStyle(motto);
  const room =
    motto.getBoundingClientRect().width -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight) -
    2 * (0.5 + 0.6) * em;
  for (const step of ['full', 'long', 'tight'] as const) {
    if (step === 'full') delete card.dataset.name;
    else card.dataset.name = step;
    if (name.getBoundingClientRect().width <= room) return step;
  }
  return 'tight';
}

/**
 * The colophon's lines: one line at the board's 12 px, or, when the live line
 * is longer than that, two lines at 11 px. A live line longer than two lines
 * is cut with an ellipsis and its card marked `data-colophon="cut"`.
 */
function fitColophon(card: HTMLElement): OrderFaceMeasuredFit['colophon'] {
  const words = card.querySelector<HTMLElement>('.of-live, .of-foot');
  if (words === null) return 'one';
  delete card.dataset.colophon;
  if (words.scrollWidth <= words.clientWidth + 1) return 'one';
  card.dataset.colophon = 'two';
  if (words.scrollHeight <= words.clientHeight + 1) return 'two';
  card.dataset.colophon = 'cut';
  return 'cut';
}
