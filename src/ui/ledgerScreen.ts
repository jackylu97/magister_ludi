/**
 * The Ledger: **where this turn's yield comes from, and what the curve is doing.**
 *
 * `docs/history/loop-review.md` §3, "The engine view — watching your own snowball". The
 * gap it fills is stated there and it is a real one: formidability is a feeling
 * of *relative* growth, and the game shows growth only as a top-bar number for
 * this turn. A card's stamp says what one card did; nothing said what the deck
 * did, what the empire did, or which way either was heading.
 *
 * Three bands, and the third is a labelled hole
 * ---------------------------------------------
 *   1. **This turn, by source class.** Six stacked bars, one per voice, split by
 *      where the yield came from — under the **aggregate**, "your cards: +31⚒
 *      +18🔬 +40🎵", which is the deck's whole slice in one figure per voice and
 *      is the very reading Confirm counts up on the Statecraft screen
 *      (`foldDeck`, one function so the two cannot disagree).
 *   2. **The curve.** Six sparklines of the per-turn total across the session,
 *      with the three classes an empire *chose* — statecraft, its great people,
 *      its religion — shaded under the line in their own inks and stacked from
 *      the axis, so a glance says which of the three carried the voice
 *      (`LEDGER_CURVE_SERIES`, the user's ruling of 2026-09-15).
 *   3. **What the deck has produced** — the lifetime tally, per card. It wants a
 *      schema field (`PlayerStatecraft.tallies`) and a writer in `collectYields`,
 *      neither of which exists yet, so the band is here as an eyebrow and one
 *      plain sentence saying the figures are not kept. The shape of the sheet is
 *      complete and the missing half says so, which is the Reliquary's ruling
 *      about the same tally read one screen over: an em dash standing in for a
 *      number the screen does not have is a number printed as though it did.
 *
 * No new fold (rule 5)
 * --------------------
 * Nothing here computes a yield. Every figure on band 1 is the simulation's own
 * — `foldCity` for a town's six voices, `explainEmpireLines` for everything
 * the empire banks beyond them (the luxuries' signatures, the caravans abroad,
 * the treasury's ledger, the cards' empire payouts and the empire stage over the
 * fold of them) — and the whole of what this file adds is a **classification**
 * of the lines those functions already return, plus the arithmetic that shares a
 * town's **flats** to the classes that paid them and its **multiplied gain** to
 * the classes that supplied the percentages (`shareOut`, and the ruling below).
 *
 * The empire total per voice is therefore `topBar.ts`'s `readEmpire` exactly,
 * summand for summand, and `test/ui/ledgerScreen.test.ts` pins that: a band that
 * disagreed with the chip a player clicked to open it would be worse than no
 * band at all.
 *
 * Who earns the multiplied gain (the ruling of 2026-09-07)
 * -------------------------------------------------------
 * The flats are only half a town's basket. Entry XVII multiplies the whole of it
 * at once, and the difference — `banked − Σ flats` — is the **gain**, which has
 * to be credited to somebody. Until this ruling it was credited to whoever had
 * put the *base flats* there, on the argument that a percentage is worth
 * whatever it multiplies. That reading was tidy and it was wrong where it
 * mattered most: a card that pays nothing but a percentage (The Lamp Kept Lit's
 * quarter more science in the capital, The Hermit Crown's third more food, a
 * Forum's tenth, a barracks' hammers behind a spearman) printed a figure on its
 * own face and added **nothing** to the slice it belonged in. The
 * user, on a live board: *"my yields are simply not showing in the total … they
 * seem to be calculated correctly on the cards themselves, just not showing in
 * the total."* (`docs/flags.md`, ruling jj.)
 *
 * So the gain is shared by **who supplied the percentages** — `percentWeights`
 * below, one weight per percentage standing on that voice of that town,
 * classified by the line's own source.
 *
 * And the **flats' split moved once too**, on the same day and on the user's
 * follow-up: *"I think it may just be that the age 3 and onwards orders are not
 * being counted in the display total."* They were not. The later Order pools
 * lean on hex `pays` where the early ones lean on town `pays`, a card's line
 * on the ground lands in the hex's own breakdown, and every worked hex was filed
 * whole under **the land** — so an Order paying a hammer on every hill, which is
 * the entire idiom of a late deck, showed up as the land getting better.
 * `addWorkedTile` splits a hex by the card each of its lines names.
 *
 * Classifying by the **card**, not by the label
 * ---------------------------------------------
 * A card-paid line carries its `CardId` (`CardYieldLine.card`), and an id knows
 * its class where a label only knows its spelling: an Order, a belief, a
 * legacy, a wonder and a technology all print `Name · note` and only the id can
 * tell them apart. So `classifyCard` is a switch over the ten id spaces and
 * never over words — which is also what keeps a renamed row from silently
 * moving a slice into "other". The one place a *label* is read is
 * `classifyEmpireGold`, because a treasury line offers no other handle for the
 * question *which class* (its `kind` answers a different one — whether the
 * empire stage reaches it); it keys on the head of the label before the ` · `
 * exactly as `empireGoldDetail` in `topBar.ts` already does, and
 * `test/ui/ledgerScreen.test.ts` pins the two names still meeting.
 *
 * Two classes are deliberately **"other"**: a technology's card effects and a
 * bead's cap. Neither is a source a player would go looking for on this sheet —
 * a technology is not a thing you built and a bead is not a thing you own — and
 * inventing a ninth bar for two rows would be a bar that is empty in nine games
 * out of ten. They are named in the register test rather than left to be
 * discovered.
 *
 * The history is the session's, and says so
 * -----------------------------------------
 * The simulation keeps no history and must not grow one for a view (`docs/history/loop-review.md`
 * is explicit). So band 2 is a **UI-side ring buffer**, sampled once per
 * `onTurnResolved` and capped; it is not saved, a reloaded game starts its curve
 * at the reload, and the band's footnote says so in plain words. An honest
 * reading and the cheap one.
 *
 * One ink per class, and one place that decides it
 * ------------------------------------------------
 * Every class is drawn in its own colour wherever it appears — the head of band
 * 1, a bar's slice, a curve's shaded band, the legend's swatch — and the colour
 * is written onto the element by `ledgerInk.ts` out of the stylesheet's palette.
 * Nothing on this page names a colour, and no rule in the stylesheet names a
 * class: that is what keeps a class from being grape on a bar and something else
 * on a chart. The sheet's own legend, once, at the foot.
 *
 * Pure builders, because this suite has no jsdom
 * ----------------------------------------------
 * `beadsScreen.ts`' and the Reliquary's discipline: everything that can be
 * *quietly wrong* — which class a line lands in, whether the parts sum to the
 * total, what the caption says, whether the buffer drops the right end — is a
 * pure function exported above the DOM. Drawing them is a page of `append`
 * calls that fail loudly or not at all.
 */

import {
  type LedgerClass,
  LEDGER_CLASSES,
  classifyCard,
} from '../sim/ledgerClass';
import {
  type LedgerBag,
  type LedgerVoice,
  type PercentWeight,
  EMPIRE_GOLD_CLASS,
  classifyEmpireGold,
  classifyEmpireLine,
  classifyPercent,
  emptyLedgerBag,
  explainLedger,
  flatsByClass,
  foldLedgerBag,
  ledgerBagOfCity,
  percentWeights,
  shareGain,
  shareOut,
} from '../sim/ledgerFold';
import { highestAge } from '../sim/techData';
import { type GameState, playerById } from '../sim/state';
import { type YieldKey, YIELD_GLYPH, YIELD_NAME, figure, signedFigure } from './figures';
import { yieldMarkNode } from './yieldMark';
import {
  type StampFigure,
  type StampReading,
  cardStampNode,
  landCardStamp,
  stampFigures,
  stampText,
} from './cardStamp';
import { element } from './dom';
import { paintLedgerInk } from './ledgerInk';
import { createModalShell } from './modalShell';

/** The six voices, in the order every other surface in this interface prints them. */
const VOICES: readonly YieldKey[] = ['food', 'production', 'gold', 'science', 'culture', 'faith'];

/**
 * The class vocabulary now lives in `src/sim/ledgerClass.ts` — a leaf above
 * nothing but the data tables (batch E2), because the town's own list carries a
 * class on every line and the simulation may not import a screen. Re-exported
 * here under the names this sheet has always published, so nothing that reads
 * the Ledger has to learn a new address.
 */
export { type LedgerClass, LEDGER_CLASSES, classifyCard };

/**
 * What each class is called on the sheet. Plain words (hard rule 7).
 *
 * The deck's class reads **statecraft** on the user's ruling of 2026-09-15
 * (`docs/flags.md` (vvvvv)): *"'your deck' should read as statecraft."* It
 * overrules the earlier reading of rule 7 here, and it is the right way round —
 * the word is already on the dock, on the sheet the cards are drafted from and
 * on the screen a law is signed at, so "your deck" was the interface's *one*
 * private name for the thing every other surface calls statecraft.
 */
export const LEDGER_CLASS_NAME: Record<LedgerClass, string> = {
  tiles: 'the land',
  buildings: 'buildings',
  deck: 'statecraft',
  religion: 'religion',
  people: 'great people',
  trade: 'trade',
  wonders: 'wonders',
  other: 'other',
};

/**
 * **The fold itself lives in the simulation now** (batch G2, `src/sim/ledgerFold.ts`).
 *
 * Half the wager deck is a Ledger class read as a number — what your caravans
 * paid this age, what the buildings of your realm pay in one turn — and
 * `docs/wager.md` §3 rules that a wager may only ask readings the Ledger already
 * prints. A rule that reads a screen is not a rule, so the classification and the
 * two shares came down into `src/sim/` and this sheet kept the drawing.
 *
 * Every name it used to publish is re-exported here by name, so nothing that
 * reads the Ledger had to learn a new address and every figure is unchanged by
 * construction — this file no longer computes any of them.
 */
export {
  type LedgerBag,
  type LedgerVoice,
  type PercentWeight,
  EMPIRE_GOLD_CLASS,
  classifyEmpireGold,
  classifyEmpireLine,
  classifyPercent,
  emptyLedgerBag,
  explainLedger,
  flatsByClass,
  foldLedgerBag,
  ledgerBagOfCity,
  percentWeights,
  shareGain,
  shareOut,
};

/**
 * "statecraft makes 41 of your 96 science" — the caption under a bar, in the
 * brief's own words and the class's own name.
 *
 * The subject is read out of `LEDGER_CLASS_NAME` rather than written here, so
 * the sentence under a bar and the word in the legend beside it cannot come to
 * disagree — which is exactly what they did until the ruling of 2026-09-15
 * renamed one of them.
 *
 * A voice that makes nothing says so plainly rather than printing `0 of 0`,
 * which reads as a broken figure rather than as an empire that has not started
 * yet. A deck that pays a voice nothing is the sentence that matters most on
 * this sheet in the first twenty turns, so it is written out rather than hidden.
 */
/**
 * A total that may be **negative** — the treasury of an empire whose army costs
 * more than its roads bring in.
 *
 * `figure` prints a magnitude (it is what a chip shows beside a glyph), so a
 * bankrupt empire would read as though it were making twelve gold a turn. The
 * signed voice is used only where the sign is real, which is why this is a
 * two-line helper rather than a swap: every other figure on the sheet is a
 * share of a bar and cannot be less than nothing.
 */
export function netFigure(value: number): string {
  return value < 0 ? signedFigure(value) : figure(value);
}

// --- the aggregate ----------------------------------------------------------

/**
 * What both surfaces call the deck's own figure. The user's words for the
 * ceremony ("your cards: +31⚒ +18🔬 +40🎵"), and plain (hard rule 7).
 */
export const DECK_LABEL = 'your cards';

/**
 * **The aggregate**: what this empire's cards pay it this turn, in one figure
 * per voice — the count-up Confirm fires on the Statecraft screen, and the line
 * at the head of this sheet's first band.
 *
 * One function for both, because the ruling that put the number on Confirm
 * (`docs/history/fewer-things.md` §4, "Making the combo visible") is a ruling about a
 * *scoring ceremony*, and a ceremony celebrating a figure the Ledger disagrees
 * with would be worse than no ceremony at all.
 *
 * **Why band 1's deck slice and not a sum of the cards' own stamps.** The two
 * readings are different questions and only one of them is the deck's total:
 *
 *   · `explainCardImpact` is **marginal** — a ghost-diff of the empire with one
 *     card taken out. Marginal readings do not sum to a total the moment
 *     anything multiplies (Entry XVII's two stages), converts (a
 *     the town's `pays` share of share of a fold) or reads another card, which is
 *     precisely the deck this pass is building: eleven cards each worth "what
 *     the empire would lose without me" adds up to more than the empire makes.
 *     It is also eleven full empire folds, twice each, on every draw.
 *   · `explainLedger`'s `deck` class is the **banked** figure: the very lines
 *     `collectYields` pays, classified by the card that pays them
 *     (`classifyCard`), with each town's flats going to the cards that paid them
 *     and each town's multiplied gain to the cards that supplied the percentages
 *     (`shareGain`). It is a sum by construction, and it is `readEmpire`' own
 *     summands — which is the property the test at the head of this suite pins
 *     voice by voice.
 *
 * So the aggregate is the second, and the deck's engines join it without an edit
 * here: an amplifier over card yields is a `CardYieldLine` like any other,
 * folded in the evaluator's own order — base lines, then the modifiers that read
 * them — and classified by the card that carries it, while a card that pays only
 * a percentage arrives through the gain instead. Which half a card's figure
 * comes down is the evaluator's business, not this function's; that it arrives
 * at all was the ruling of 2026-09-07, and the module docblock says why it did
 * not before.
 *
 * The stamp's shape rather than a bag, so the figure lands through the one
 * printer (`landCardStamp` / `playCardStamp`) wherever it is drawn.
 */
export function foldDeck(state: GameState, playerId: number): StampReading {
  const figures: StampFigure[] = [];
  for (const voice of explainLedger(state, playerId)) {
    if (voice.byClass.deck === 0) continue;
    figures.push({ glyph: YIELD_GLYPH[voice.key], amount: voice.byClass.deck });
  }
  return { figures, occasionFigures: [], knockOn: [] };
}

/**
 * The aggregate as one line — the Ledger's head, and the sentence a screen reader
 * is handed for the ceremony.
 *
 * A deck that pays nothing says so in words rather than printing an empty
 * label, which is `ledgerCaption`'s own rule about `0 of 0` one band down.
 */
export function deckCaption(reading: StampReading): string {
  const figures = stampFigures(reading);
  if (figures.length === 0) return `${DECK_LABEL}: nothing yet`;
  return `${DECK_LABEL}: ${stampText(figures)}`;
}

export function ledgerCaption(voice: LedgerVoice): string {
  const name = YIELD_NAME[voice.key];
  const who = LEDGER_CLASS_NAME.deck;
  if (voice.total === 0 && voice.byClass.deck === 0) return `${who} makes no ${name} yet`;
  if (voice.byClass.deck === 0) {
    return `${who} makes none of your ${netFigure(voice.total)} ${name}`;
  }
  return `${who} makes ${figure(voice.byClass.deck)} of your ${netFigure(voice.total)} ${name}`;
}

// --- the curve --------------------------------------------------------------

/**
 * **The three classes a curve shades**, stacked from the axis in this order.
 *
 * The user's ruling of 2026-09-15: *"let's also add great people and religion to
 * the ledger charts at the bottom."* Three and not eight, because a chart 240px
 * wide with eight bands in it is a chart nobody reads a share off — and these
 * three because they are the three an empire *chose*: the land and the buildings
 * are what a map and a hundred turns gave you, where a deck, a pantheon and a
 * called name are decisions, and "which of my decisions is carrying this voice"
 * is the question the band is looked at for.
 *
 * The order is the order they stack in, and it is the order the legend names.
 */
export const LEDGER_CURVE_SERIES = ['deck', 'people', 'religion'] as const;

export type LedgerCurveSeries = (typeof LEDGER_CURVE_SERIES)[number];

/** One turn's reading, kept for the session. See `createLedgerHistory`. */
export interface LedgerSample {
  turn: number;
  /** The empire's era that turn, so the axis can tick where an age turned. */
  age: number;
  totals: Record<YieldKey, number>;
  /**
   * The three shaded classes, one bag each — read off the **same** fold as the
   * totals beside them (`ledgerSample` takes one reading a turn and takes all
   * four bags out of it). A second fold per class would be four empire folds a
   * turn for a curve nobody has opened yet.
   *
   * Every reader takes them with a `?? 0`: a sample is view state, it is never
   * saved, and a ring left over from before this pass — a page kept open across
   * a hot reload — carries the totals and the deck alone. A chart missing two
   * series draws two flat bands; a chart that threw would take the sheet with it.
   */
  deck: Record<YieldKey, number>;
  people: Record<YieldKey, number>;
  religion: Record<YieldKey, number>;
}

/**
 * How many turns the curve remembers.
 *
 * A cap rather than a growing list because this is view state on a page that may
 * be left open for a very long game, and because a sparkline 400 samples wide is
 * already drawing more points than a 600px band has pixels. The oldest end is
 * what goes: a player asking "which way am I heading" is asking about the near
 * past, and the far past is the half a reloaded game has already lost.
 */
export const LEDGER_HISTORY_CAP = 400;

export interface LedgerHistory {
  push(sample: LedgerSample): void;
  samples(): readonly LedgerSample[];
  /** A new game. The curve belongs to the game that drew it. */
  clear(): void;
  readonly cap: number;
}

export function createLedgerHistory(cap: number = LEDGER_HISTORY_CAP): LedgerHistory {
  const kept: LedgerSample[] = [];
  return {
    cap,
    push(sample: LedgerSample): void {
      kept.push(sample);
      // The ring, kept as a list because the list is 400 long and the drop is
      // once a turn: an index and a modulo would buy nothing and would have to
      // be unwound again every time the band draws.
      if (kept.length > cap) kept.splice(0, kept.length - cap);
    },
    samples(): readonly LedgerSample[] {
      return kept;
    },
    clear(): void {
      kept.length = 0;
    },
  };
}

/**
 * This turn's reading, folded into the one row the curve keeps.
 *
 * **One fold a turn**, and the four bags come out of it: the totals are the
 * voice's own, and the three shaded classes are three columns of the very same
 * `byClass` the bars are drawn from. Asking `explainLedger` again per class
 * would be four empire folds every turn of a game, for a band that is only
 * looked at when somebody opens the sheet.
 */
export function ledgerSample(state: GameState, playerId: number): LedgerSample {
  const reading = explainLedger(state, playerId);
  const totals = {} as Record<YieldKey, number>;
  const deck = {} as Record<YieldKey, number>;
  const people = {} as Record<YieldKey, number>;
  const religion = {} as Record<YieldKey, number>;
  for (const voice of reading) {
    totals[voice.key] = voice.total;
    deck[voice.key] = voice.byClass.deck;
    people[voice.key] = voice.byClass.people;
    religion[voice.key] = voice.byClass.religion;
  }
  const player = playerById(state, playerId);
  return {
    turn: state.turn,
    age: player ? highestAge(player.techsResearched) : 1,
    totals,
    deck,
    people,
    religion,
  };
}

/**
 * A series as points in a box, `[x, y]` each, y measured downward from the top.
 *
 * Pure because an off-by-one at either end of a sparkline is invisible: it draws
 * perfectly and says something slightly untrue about the last turn, which is the
 * turn the player is looking at. A single sample is drawn as a flat line across
 * the box rather than as a dot at x=0, because one turn of history is a
 * *reading*, not a trend, and a dot in the corner reads as a bug.
 */
export function sparkPoints(
  values: readonly number[],
  width: number,
  height: number,
  low: number,
  high: number,
): [number, number][] {
  if (values.length === 0) return [];
  const span = high - low === 0 ? 1 : high - low;
  const steps = values.length - 1;
  return values.map((value, at) => {
    const x = steps === 0 ? width : (width * at) / steps;
    const y = height - (height * (value - low)) / span;
    return [x, y];
  });
}

/**
 * **The three shaded series as cumulative curves** — the first measured from the
 * axis, each next one riding on the one before, so the chart is read the way a
 * stacked bar is: a band's *thickness* is what that class made.
 *
 * Pure, because the arithmetic of a stack is where a chart lies quietly. Two
 * rules are taken here rather than in the drawing:
 *
 *   · a **missing** series is nothing (`?? 0`) — a ring from before this pass,
 *     and the reason a chart drawn off an old sample still draws;
 *   · a **negative** share is nothing. Band 1's bar is positives only for the
 *     stated reason (a stack with a negative segment no longer means "this is
 *     the whole"), and a curve is the same bar over time. A voice that costs an
 *     empire more than it earns still shows it: the total's own line dips below
 *     the axis, which is where that fact belongs.
 */
export function stackedSeries(samples: readonly LedgerSample[], key: YieldKey): number[][] {
  const running = samples.map(() => 0);
  return LEDGER_CURVE_SERIES.map((series) =>
    samples.map((sample, at) => {
      running[at] = running[at]! + Math.max(0, sample[series]?.[key] ?? 0);
      return running[at]!;
    }),
  );
}

/**
 * What the legend says about the curves, built out of the class names so a
 * renamed class renames itself here too.
 *
 * Plain words and no numbers (hard rule 7), and it names the three **in the
 * order they stack**, because that order is the only thing about a stacked chart
 * a reader cannot work out by looking at it.
 */
export function ledgerCurveLegend(): string {
  const [first, second, third] = LEDGER_CURVE_SERIES.map((cls) => LEDGER_CLASS_NAME[cls]);
  return `Under each turn's total the curves shade ${first}, then ${second}, then ${third}, stacked up from the foot.`;
}

/** The footnote under band 2 — the honest reading, in plain words. */
export const LEDGER_CURVE_FOOTNOTE =
  'The curve is kept only while this page is open. Reload or load a save and it starts again from that turn.';

/** Band 2 before there is anything to draw. */
export const LEDGER_CURVE_EMPTY = 'End a turn and the curve starts here.';

/** Band 3's eyebrow — the brief's own words, and the doc of record's. */
export const LEDGER_BAND3_EYEBROW = 'what the deck has produced';

/**
 * Band 3's one line.
 *
 * The band is drawn empty on purpose: the sheet's shape is the three bands, and
 * a sheet that simply stopped after two would read as finished. What is missing
 * is a lifetime tally per card, which wants a stored figure and a writer in the
 * yield phase — so the band says that, with no number in it at all.
 */
export const LEDGER_BAND3_NOTE =
  'Lifetime figures are not kept yet, so there is nothing to show here. What a card has paid you since you drafted it will appear on this band once the empire starts counting it.';

// --- the sheet --------------------------------------------------------------

export interface LedgerScreen {
  readonly isOpen: boolean;
  /** Opens, with one voice picked out if the chip that opened it named one. */
  open(focus?: YieldKey): void;
  close(): void;
  refresh(): void;
  dispose(): void;
}

export interface LedgerScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** The session's curve. Held by `main.ts`, because it outlives an open. */
  history: () => readonly LedgerSample[];
  onOpen?: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

/**
 * One voice's stacked bar.
 *
 * **Positives only**, and the charges are named beside it rather than drawn into
 * it: gold is the one voice with negative lines (three of the four
 * `explainEmpireGold` lines are bills), and a stacked bar with a negative
 * segment in it is a bar that no longer means "this is the whole". So the bar is
 * what came in, the `−12` after it is what went out again, and the total on the
 * left is still the net figure the chip shows.
 */
function drawBar(voice: LedgerVoice): HTMLElement {
  const bar = element('div', 'ldg-bar');
  let positive = 0;
  for (const cls of LEDGER_CLASSES) positive += Math.max(0, voice.byClass[cls]);
  if (positive <= 0) {
    bar.append(element('span', 'ldg-bar-empty'));
    return bar;
  }
  for (const cls of LEDGER_CLASSES) {
    const value = voice.byClass[cls];
    if (value <= 0) continue;
    const slice = element('span', `ldg-slice is-${cls}`);
    paintLedgerInk(slice, cls);
    slice.style.flexGrow = String(value);
    slice.title = `${LEDGER_CLASS_NAME[cls]} ${figure(value)}`;
    bar.append(slice);
  }
  return bar;
}

/**
 * **The legend, once, at the foot of the sheet** — the eight inks with their
 * names, and one line saying what the curves shade.
 *
 * At the foot rather than under band 1 (where the key stood until 2026-09-15)
 * because there are two things being coloured now: the bars and the curves. Two
 * keys saying the same eight words would be the sheet telling a player twice
 * that grape is statecraft, and the ruling asks for a legend *once*.
 */
function drawLegend(): HTMLElement {
  const foot = element('section', 'ldg-legend');
  const key = element('ul', 'ldg-key');
  for (const cls of LEDGER_CLASSES) {
    const item = element('li', `ldg-key-item is-${cls}`);
    const swatch = element('span', 'ldg-swatch');
    paintLedgerInk(swatch, cls);
    item.append(swatch);
    item.append(element('span', 'ldg-key-name', LEDGER_CLASS_NAME[cls]));
    key.append(item);
  }
  foot.append(key);
  foot.append(element('p', 'hint', ledgerCurveLegend()));
  return foot;
}

/**
 * One voice's sparkline: the total as a line, and under it the three classes an
 * empire *chose* — statecraft, its great people and its religion — shaded in
 * their own inks and stacked from the axis (the ruling of 2026-09-15).
 *
 * Each band is drawn as its own closed shape between the curve below it and its
 * own, rather than as three areas dropped to the axis on top of each other: the
 * inks are shaded, and three translucent fills laid over one another would mix
 * into two colours the palette does not contain.
 */
function drawSpark(samples: readonly LedgerSample[], key: YieldKey): SVGElement {
  const WIDTH = 240;
  const HEIGHT = 44;
  const shaded = LEDGER_CURVE_SERIES.map((cls) => LEDGER_CLASS_NAME[cls]).join(', ');
  const frame = svg('svg', {
    class: 'ldg-spark',
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': `${YIELD_NAME[key]} per turn, with ${shaded} shaded under it`,
  });
  const totals = samples.map((sample) => sample.totals[key] ?? 0);
  const stacks = stackedSeries(samples, key);
  let high = 1;
  let low = 0;
  for (const value of totals) {
    if (value > high) high = value;
    if (value < low) low = value;
  }
  const totalPoints = sparkPoints(totals, WIDTH, HEIGHT, low, high);
  const stackPoints = stacks.map((values) => sparkPoints(values, WIDTH, HEIGHT, low, high));
  const floor = sparkPoints(
    samples.map(() => 0),
    WIDTH,
    HEIGHT,
    low,
    high,
  );

  // An age turned: a tick on the axis, because "when did this get steeper" is
  // the question a curve is read for and an age is the answer often enough.
  for (let at = 1; at < samples.length; at += 1) {
    if (samples[at]!.age === samples[at - 1]!.age) continue;
    const [x] = totalPoints[at]!;
    frame.append(
      svg('line', {
        class: 'ldg-spark-tick',
        x1: String(x),
        y1: '0',
        x2: String(x),
        y2: String(HEIGHT),
      }),
    );
  }

  // The bands, from the axis up, each between the curve under it and its own.
  LEDGER_CURVE_SERIES.forEach((cls, at) => {
    const top = stackPoints[at]!;
    const under = at === 0 ? floor : stackPoints[at - 1]!;
    if (top.length === 0) return;
    const shape = top.map(([x, y], step) => `${step === 0 ? 'M' : 'L'} ${x} ${y}`);
    for (let step = under.length - 1; step >= 0; step -= 1) {
      const [x, y] = under[step]!;
      shape.push(`L ${x} ${y}`);
    }
    shape.push('Z');
    const band = svg('path', { class: `ldg-spark-band is-${cls}`, d: shape.join(' ') });
    paintLedgerInk(band, cls);
    frame.append(band);
  });
  if (totalPoints.length > 0) {
    const line = totalPoints.map(([x, y], at) => `${at === 0 ? 'M' : 'L'} ${x} ${y}`);
    frame.append(svg('path', { class: 'ldg-spark-line', d: line.join(' ') }));
  }
  return frame;
}

function voiceName(key: YieldKey): HTMLElement {
  const name = element('span', 'ldg-voice');
  const mark = element('span', 'ldg-voice-icon');
  mark.append(yieldMarkNode(key, true));
  name.append(mark, document.createTextNode(YIELD_NAME[key]));
  return name;
}

export function createLedgerScreen(options: LedgerScreenOptions): LedgerScreen {
  const { overlay, body, closeButton } = options;
  /** Which voice the chip that opened the sheet named. A fact about a click. */
  let focus: YieldKey | null = null;

  /**
   * The aggregate at the head of band 1 — the same figure, from the same
   * function, that Confirm counts up one screen over (`foldDeck`).
   *
   * Landed rather than played: this sheet is a place a player comes to *read*,
   * and the ceremony belongs to the moment the law was signed.
   */
  function drawDeckLine(state: GameState, playerId: number): HTMLElement {
    const line = element('p', 'ldg-deck');
    // The label in statecraft's own ink: the aggregate at the head of the sheet
    // is one class's figure, and it is the one the sheet is most often opened
    // for. The stamp beside it stays plain ink — it is a *figure*, and the
    // stamp's own printer decides how a figure looks everywhere it lands.
    const label = element('span', 'ldg-deck-label', DECK_LABEL);
    paintLedgerInk(label, 'deck');
    line.append(label);
    const reading = foldDeck(state, playerId);
    const stamp = cardStampNode();
    if (stampFigures(reading).length === 0) {
      line.append(element('span', 'ldg-deck-none', 'nothing yet'));
    } else {
      landCardStamp(stamp, reading);
      line.append(stamp);
    }
    // The whole line in words, for the reading that has no glyphs in it.
    line.title = deckCaption(reading);
    return line;
  }

  function drawThisTurn(): HTMLElement {
    const band = element('section', 'ldg-band');
    band.append(element('p', 'eyebrow', 'this turn, and who made it'));
    band.append(drawDeckLine(options.getState(), options.getPlayerId()));
    const rows = element('ul', 'ldg-rows');
    const reading = explainLedger(options.getState(), options.getPlayerId());
    for (const voice of reading) {
      const row = element('li', voice.key === focus ? 'ldg-row is-focused' : 'ldg-row');
      const head = element('div', 'ldg-row-head');
      head.append(voiceName(voice.key));
      head.append(element('span', 'ldg-total', netFigure(voice.total)));
      row.append(head);
      row.append(drawBar(voice));
      let out = 0;
      for (const cls of LEDGER_CLASSES) out += Math.min(0, voice.byClass[cls]);
      const caption = element('p', 'ldg-caption', ledgerCaption(voice));
      if (out < 0) {
        const spent = element('span', 'ldg-out', `− ${figure(-out)} out again`);
        spent.title = 'Maintenance and upkeep, charged against the empire';
        caption.append(document.createTextNode(' · '), spent);
      }
      row.append(caption);
      rows.append(row);
    }
    band.append(rows);
    return band;
  }

  function drawCurve(): HTMLElement {
    const band = element('section', 'ldg-band');
    band.append(element('p', 'eyebrow', 'the curve, turn by turn'));
    const samples = options.history();
    if (samples.length === 0) {
      band.append(element('p', 'hint', LEDGER_CURVE_EMPTY));
      band.append(element('p', 'hint', LEDGER_CURVE_FOOTNOTE));
      return band;
    }
    const grid = element('ul', 'ldg-sparks');
    for (const key of VOICES) {
      const item = element('li', key === focus ? 'ldg-spark-row is-focused' : 'ldg-spark-row');
      const head = element('div', 'ldg-row-head');
      head.append(voiceName(key));
      const last = samples[samples.length - 1]!;
      head.append(element('span', 'ldg-total', netFigure(last.totals[key] ?? 0)));
      item.append(head);
      item.append(drawSpark(samples, key));
      item.append(
        element(
          'p',
          'ldg-caption',
          `${figure(samples.length)} ${samples.length === 1 ? 'turn' : 'turns'} · to turn ${figure(last.turn)}`,
        ),
      );
      grid.append(item);
    }
    band.append(grid);
    band.append(element('p', 'hint', LEDGER_CURVE_FOOTNOTE));
    return band;
  }

  function drawProduced(): HTMLElement {
    const band = element('section', 'ldg-band is-empty');
    band.append(element('p', 'eyebrow', LEDGER_BAND3_EYEBROW));
    band.append(element('p', 'hint', LEDGER_BAND3_NOTE));
    return band;
  }

  function draw(): void {
    body.replaceChildren();
    body.append(drawThisTurn(), drawCurve(), drawProduced(), drawLegend());
  }

  /**
   * The frame (`modalShell.ts`) — `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, and the
   * disposer is the game's.
   *
   * The one thing this sheet keeps for itself is the **voice the chip that
   * opened it named**: a fact about a click, written down before the shell shows
   * the sheet and forgotten on the way out. Because the shell repaints a sheet
   * that is already up, pressing a second chip while the Ledger stands picks out
   * that voice instead of doing nothing.
   *
   * There is no trigger: this sheet is reached from any of six yield chips
   * rather than from one control, so there is no `aria-expanded` to mirror and
   * nowhere in particular to put the keyboard back.
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    draw,
    onOpen: () => options.onOpen?.(),
    onClose: () => {
      focus = null;
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open(next?: YieldKey): void {
      focus = next ?? null;
      shell.open();
    },
    close: shell.close,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
