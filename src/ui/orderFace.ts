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
import { CITY_YIELD_KEYS, type CityYieldKey } from '../sim/resourceData';
import { type CardClause, describeCard, stripRefs } from '../sim/statecraft';
import {
  type ChairType,
  type DeckId,
  type DoctrineId,
  type OrderId,
  doctrineDef,
  isDoctrineId,
  orderDef,
  orderType,
} from '../sim/statecraftData';
import { slotMarkUrl } from './cardLine';
import { BAND_NUMERAL, DECK_SUIT, GENERIC_WORD, RARITY_WORD, TYPE_INK, TYPE_WORD, deckWord } from './deckBadges';
import { element } from './dom';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import { type InkId, SEAL_MARK, SUIT_MARKS, type SuitId } from './suitFace';
import { splitYieldText, yieldMarkNode } from './yieldMark';

// --- what a face is drawn from ------------------------------------------------

/** The cards this face draws: an Order or a Doctrine. */
export type OrderFaceCardId = OrderId | DoctrineId;

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
  id: OrderFaceCardId;
  kind: 'order' | 'doctrine';
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

/** The border a card wears. */
export function orderFaceFrame(id: OrderFaceCardId): OrderFaceFrame {
  return isDoctrineId(id) ? 'doctrine' : orderDef(id).rarity;
}

/**
 * **A face's model**, from the card and its state. Pure: no document is read,
 * so the tests can sweep every row.
 */
export function orderFaceModel(id: OrderFaceCardId, state: OrderFaceState): OrderFaceModel {
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
  if (isDoctrineId(id)) {
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
    suits: decks.map((deck) => DECK_SUIT[deck]),
    plate,
    name,
    keyword,
    clauses,
    initial,
    tablet: firstFigure(plainAll),
    rays: !unmet,
    caption,
    foot,
    fit: estimateOrderFaceFit(
      clauses.map((clause) => stripRefs(clause.text)),
      { initial: initial !== null, reason, doctrine: kind === 'doctrine' },
    ),
  };
}

// --- the fit, estimated -----------------------------------------------------------

/**
 * The measures the estimate works from, in pixels at the played size. They
 * follow `orderFace.css`: the effect's box is 168.8 wide on an Order and
 * 162.8 on a Doctrine (whose gilt band is wider), and 82.7 tall beside the
 * full picture or 112.7 beside the short one.
 *
 * The three shares below were set by measuring every live card on the page
 * in EB Garamond (the flair gallery's "Every live card, measured"): with them
 * the estimate is never larger than the size the page settles on, so a card
 * drawn before its fonts load never starts out too large.
 */
const FIT_MEASURES = {
  width: { order: 168.8, doctrine: 162.8 },
  height: { full: 82.7, short: 112.7 },
  lineHeight: 1.2,
  /** The average letter's width, as a share of the text size. */
  letter: 0.42,
  /** The letters a line break wastes at the end of a line, on average. */
  waste: 1,
  /** The width the initial takes from each of the first two lines, as a share of the size. */
  initial: 2.3,
  /** The room a clause break costs, in lines: the gap, and the part line it leaves. */
  gap: 0.3,
} as const;

/** How many lines one clause takes at a size. */
function clauseLines(chars: number, size: number, width: number, initial: boolean): number {
  const perLine = Math.max(1, width / (FIT_MEASURES.letter * size) - FIT_MEASURES.waste);
  const lost = initial ? (2 * FIT_MEASURES.initial) / FIT_MEASURES.letter : 0;
  const lines = Math.ceil((chars + lost) / perLine);
  return initial ? Math.max(2, lines) : lines;
}

/**
 * **The estimated fit**: the largest size at which every clause, and the
 * reason line when there is one, fits the effect's box. Beside the full
 * picture first, then the short one; `over` when neither holds it at 11 px.
 * The page measures and corrects it (`fitOrderFace`).
 */
export function estimateOrderFaceFit(
  clauses: readonly string[],
  options: { initial: boolean; reason: string; doctrine: boolean },
): OrderFaceFit {
  const width = options.doctrine ? FIT_MEASURES.width.doctrine : FIT_MEASURES.width.order;
  const pictures: readonly OrderFacePicture[] = ['full', 'short'];
  for (const picture of pictures) {
    for (const size of ORDER_FACE_TEXT_SIZES) {
      let lines = 0;
      clauses.forEach((clause, index) => {
        lines += clauseLines(clause.length, size, width, index === 0 && options.initial);
      });
      lines += Math.max(0, clauses.length - 1) * FIT_MEASURES.gap;
      // The reason line is set at 0.92 of the effect and never under 11 px.
      if (options.reason !== '') {
        lines += (clauseLines(options.reason.length + 2, Math.max(11, size * 0.92), width, false) * Math.max(11, size * 0.92)) / size;
      }
      if (lines * size * FIT_MEASURES.lineHeight <= FIT_MEASURES.height[picture]) {
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
  return [plate, motto, picture];
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
  const reason = state.unmet?.reason;
  if (reason !== undefined && reason !== '') sub.append(element('span', 'of-why', `† ${stripRefs(reason)}`));
  return sub;
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
export function dressOrderFace(host: HTMLElement, id: OrderFaceCardId, state: OrderFaceState): OrderFaceModel {
  installOrderFaceMarks(document.documentElement);
  const model = orderFaceModel(id, state);
  const linked = keywordsAllowedIn(host);
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

  const inner = element('div', 'of-in');
  inner.append(element('span', 'sr-only', model.caption));
  inner.append(...headNodes(model, linked));
  inner.append(subscriptionNode(model, state, linked));
  inner.append(colophonNode(model, state));
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
  return model;
}

/** **An emblem face** as a new `<article>`, for a surface that reads a card. */
export function orderFaceNode(id: OrderFaceCardId, state: OrderFaceState): HTMLElement {
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
