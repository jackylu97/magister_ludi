/**
 * The Ledger: **where this turn's yield comes from, and what the curve is doing.**
 *
 * `docs/history/loop-review.md` §3, "The engine view — watching your own snowball". The
 * gap it fills is stated there and it is a real one: formidability is a feeling
 * of *relative* growth, and the game shows growth only as a top-bar number for
 * this turn. A card's stamp says what one card did; nothing said what the deck
 * did, what the empire did, or which way either was heading.
 *
 * An account book (batch SS5)
 * ---------------------------
 * Laid out as the Ledger board draws it
 * (`docs/plans/mockups/scholars-study/Ledger.dc.html`): two pages ruled in red,
 * with a double rule under each total, and a fold-out plate at the foot.
 *
 *   - **The left page, this turn.** The **aggregate**, "your cards: +31⚒ +18🔬
 *     +40🎵", which is the deck's whole slice in one figure per voice and is the
 *     very reading Confirm counts up on the Statecraft screen (`foldDeck`, one
 *     function so the two cannot disagree). Under it, one row a source class and
 *     one column a voice, upkeep on a row of its own, and each voice's total.
 *     Then **what the deck has produced**: the lifetime tally, per card (batch
 *     S2, `docs/flags.md` (bbbbbb)), one row a card that has ever paid, and the
 *     simulation's fold of the rows under them. The rows are
 *     `PlayerStatecraft.yieldTallies`, which the yield phase adds to once a turn
 *     from this turn's own deck slice split by card (`recordDeckTally`,
 *     `src/sim/ledgerFold.ts`), so what a row says a card has paid is what the
 *     turn's table said it paid, turn after turn.
 *   - **The right page, one voice.** The voice the chip named, or the one a tab
 *     at the page's edge opens: its sources with their shares, the caption, the
 *     session's **curve** as a ruled plate, and its last eight turns. The curve
 *     shades the three classes an empire *chose* (statecraft, its great people,
 *     its religion) under the line in their own inks, stacked from the axis
 *     (`LEDGER_CURVE_SERIES`, the user's ruling of 2026-09-15).
 *   - **The fold-out plate.** One row a voice: its total, this turn's bar by
 *     source, its curve over the session, and what went out again. The user's
 *     ruling of 2026-11-16 kept these graphs ("I like the graphs as a visual").
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
  foldDeckLedger,
  foldLedgerBag,
  ledgerBagOfCity,
  percentWeights,
  shareGain,
  shareOut,
} from '../sim/ledgerFold';
import type { CardYieldTally } from '../sim/statecraft/draft';
import { type CardId, cardName } from '../sim/statecraftData';
import { eraNumeral, highestAge } from '../sim/techData';
import { seatName } from '../sim/leaderData';
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
  const bag = {} as Record<YieldKey, number>;
  for (const voice of explainLedger(state, playerId)) bag[voice.key] = voice.byClass.deck;
  return stampOfVoices(bag);
}

/**
 * Six voices as a stamp — the nonzero ones, in the voices' own order, in the
 * shape the one printer (`landCardStamp` / `playCardStamp`) takes. Shared by
 * the head of band 1 and every row of band 3, so a figure looks the same
 * wherever on this sheet it lands.
 */
export function stampOfVoices(bag: Readonly<Record<YieldKey, number>>): StampReading {
  const figures: StampFigure[] = [];
  for (const key of VOICES) {
    const amount = bag[key] ?? 0;
    if (amount === 0) continue;
    figures.push({ glyph: YIELD_GLYPH[key], amount });
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
  /**
   * The other five classes together, from the same fold: the "the rest" column
   * of the last eight turns (batch SS5, the Ledger board). A sum of the fold's
   * own columns, so a row's four parts add to its total. Optional, for a ring
   * from before this batch.
   */
  rest?: Record<YieldKey, number>;
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

interface LedgerHistory {
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
  const rest = {} as Record<YieldKey, number>;
  const shaded: readonly LedgerClass[] = LEDGER_CURVE_SERIES;
  for (const voice of reading) {
    totals[voice.key] = voice.total;
    deck[voice.key] = voice.byClass.deck;
    people[voice.key] = voice.byClass.people;
    religion[voice.key] = voice.byClass.religion;
    let others = 0;
    for (const cls of LEDGER_CLASSES) if (!shaded.includes(cls)) others += voice.byClass[cls];
    rest[voice.key] = others;
  }
  const player = playerById(state, playerId);
  return {
    turn: state.turn,
    age: player ? highestAge(player.techsResearched) : 1,
    totals,
    deck,
    people,
    religion,
    rest,
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

/**
 * Where the open yield's curve puts its rules across: nought, and round steps
 * up to the highest figure, at most four lines (the Ledger board draws 0, 50 and
 * 100 under a curve that ends at 127). A step of 1, 2 or 5 times a power of
 * ten, the way a ruled account book is ruled. Pure, so a curve with nothing in
 * it, or one in the red, still gets a sensible scale.
 */
export function curveTicks(low: number, high: number): number[] {
  const top = Math.max(high, 1);
  const bottom = Math.min(low, 0);
  const rough = (top - bottom) / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((m) => m >= rough) ?? 10 * power;
  const ticks: number[] = [];
  // From the round figure at or under the lowest point, so a curve in the red
  // has a rule under it too. `+ 0` turns a negative nought into nought.
  for (let at = Math.floor(bottom / step) * step; at <= top; at += step) ticks.push(at + 0);
  return ticks;
}

/**
 * The turns the curve names along its foot: each tenth turn inside the span,
 * none so close to either end that its label would sit on the end's own.
 */
export function turnTicks(first: number, last: number): number[] {
  const span = last - first;
  if (span < 4) return [];
  const step = span > 120 ? 50 : span > 40 ? 10 : 5;
  const ticks: number[] = [];
  for (let turn = Math.ceil(first / step) * step; turn < last; turn += step) {
    if (turn - first < span * 0.06 || last - turn < span * 0.12) continue;
    ticks.push(turn);
  }
  return ticks;
}

/** How many turns "the last eight turns" holds. */
export const LEDGER_LAST_TURNS = 8;

/**
 * One row of "the last eight turns" for the open yield: the turn, the three
 * classes an empire chose, the rest, and the total, every figure read off the
 * sample itself. `rest` is `null` for a sample from before batch SS5.
 */
export function lastTurnsRows(
  samples: readonly LedgerSample[],
  key: YieldKey,
): { turn: number; deck: number; people: number; religion: number; rest: number | null; total: number }[] {
  return samples.slice(-LEDGER_LAST_TURNS).map((sample) => ({
    turn: sample.turn,
    deck: sample.deck?.[key] ?? 0,
    people: sample.people?.[key] ?? 0,
    religion: sample.religion?.[key] ?? 0,
    rest: sample.rest?.[key] ?? null,
    total: sample.totals[key] ?? 0,
  }));
}

/**
 * A class's share of what came in: its positive figure against the sum of the
 * positive figures (the bar's own whole), as a whole percent. Upkeep is named
 * beside the bar rather than inside it, so it has no share.
 */
export function sharePercent(value: number, positiveWhole: number): number {
  if (value <= 0 || positiveWhole <= 0) return 0;
  return Math.round((value * 100) / positiveWhole);
}

/** The footnote under the curve and the last turns — the honest reading, in plain words. */
export const LEDGER_CURVE_FOOTNOTE =
  'The curve and these rows are kept only while the game is open. Reload, or load a save, and they start again from that turn.';

/** Band 2 before there is anything to draw. */
const LEDGER_CURVE_EMPTY = 'End a turn and the curve starts here.';

// --- what the deck has produced --------------------------------------------

/** Band 3's eyebrow — the brief's own words, and the doc of record's. */
export const LEDGER_BAND3_EYEBROW = 'what the deck has produced';

/** The same words as the left page's heading, in the heading's case (the Ledger board). */
export const LEDGER_BAND3_TITLE = `${LEDGER_BAND3_EYEBROW.charAt(0).toUpperCase()}${LEDGER_BAND3_EYEBROW.slice(1)}`;

/**
 * Band 3 before any card has paid — a new empire, or a save from before the
 * tally was kept. Plain words and no number, so an empty band reads as an
 * empire that has not started rather than as a figure that failed to draw.
 */
export const LEDGER_BAND3_EMPTY =
  'Nothing counted yet. From the first turn a card pays you, what it has paid is added up here.';

/**
 * The footnote under band 3 — what the figures are, in plain words: the same
 * slice band 1 shows, kept turn by turn, and kept for a card that has since
 * left its chair.
 */
export const LEDGER_BAND3_FOOTNOTE =
  'Added up once a turn from the statecraft slice above, from the turn a card first pays. A card taken out of its chair keeps what it paid.';

/** What the fold at the foot of band 3 is called. `DECK_LABEL`'s twin, lifetime. */
export const DECK_TALLY_LABEL = 'all cards, so far';

/** The same words in the total row's case (the Ledger board). */
export const DECK_TALLY_LABEL_TITLE = `${DECK_TALLY_LABEL.charAt(0).toUpperCase()}${DECK_TALLY_LABEL.slice(1)}`;

/** One row of band 3: the card, its name, and its lifetime figure as a stamp. */
interface DeckTallyRow {
  card: CardId;
  name: string;
  reading: StampReading;
  /** The same figure as six columns: the tally row's own bag (batch SS5's table). */
  paid: Readonly<Record<YieldKey, number>>;
  /** True while the card is in a chair or held as a Doctrine. "Out of its chair" otherwise. */
  seated: boolean;
}

/**
 * **Band 3 as data** — one row per lifetime tally row, in the state's own order
 * (the order each card first paid, which is history), each with the card's name
 * and its six voices as a stamp; and the fold of them all, through the
 * simulation's own `foldDeckLedger` rather than a sum taken here (rule 5).
 *
 * A seat from a print older than the tally has no rows and reads as an empire
 * whose deck has not paid — which is what a reader who cannot remember is.
 */
export function deckTallyRows(
  state: GameState,
  playerId: number,
): { rows: DeckTallyRow[]; total: StampReading; totalPaid: Readonly<Record<YieldKey, number>> } {
  const sc = playerById(state, playerId)?.statecraft;
  const tallies: readonly CardYieldTally[] = sc?.yieldTallies ?? [];
  const seatedCards = new Set<string>();
  for (const slot of sc?.slots ?? []) if (slot) seatedCards.add(slot.card);
  for (const doctrine of sc?.doctrines ?? []) seatedCards.add(doctrine);
  const rows = tallies.map((row) => ({
    card: row.card,
    name: cardName(row.card),
    reading: stampOfVoices(row.paid),
    paid: row.paid,
    seated: seatedCards.has(row.card),
  }));
  const totalPaid = foldDeckLedger(tallies);
  return { rows, total: stampOfVoices(totalPaid), totalPaid };
}

// --- the sheet --------------------------------------------------------------

export interface LedgerScreen {
  readonly isOpen: boolean;
  /** Opens, with one voice picked out if the chip that opened it named one. */
  open(focus?: YieldKey): void;
  close(): void;
  refresh(): void;
  dispose(): void;
}

interface LedgerScreenOptions {
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
 * A figure in a ruled column, or the faint dash a nil is (the Ledger board).
 * A share smaller than one whole unit prints "<1": a town's multiplied gain is
 * shared out in fractions, and a "0" beside a share of nine percent would read
 * as an error.
 */
function cell(tag: 'td' | 'th', value: number | null, className = ''): HTMLTableCellElement {
  const node = element(tag, `ldg-num${className ? ` ${className}` : ''}`) as HTMLTableCellElement;
  if (value === null || value === 0) node.append(element('span', 'ldg-nil', '–'));
  // A fraction would print as "0" (or "−0" in the upkeep row) beside a share
  // that is not nothing, so it prints as less than one, with its sign.
  else if (value > 0 && value < 1) node.textContent = '<1';
  else if (value < 0 && value > -1) node.textContent = '−<1';
  else node.textContent = netFigure(value);
  return node;
}

/** "Production", for a heading: the yield's name as the sentence starts it. */
function voiceTitle(key: YieldKey): string {
  const name = YIELD_NAME[key];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** A class's name with its small square of ink, as every row and key prints it. */
function classLabel(cls: LedgerClass, text = LEDGER_CLASS_NAME[cls]): HTMLElement {
  const label = element('span', cls === 'deck' ? 'ldg-class is-deck' : 'ldg-class');
  const swatch = element('i', 'ldg-swatch');
  swatch.setAttribute('aria-hidden', 'true');
  paintLedgerInk(swatch, cls);
  label.append(swatch, element('span', 'ldg-class-name', text));
  if (cls === 'deck') paintLedgerInk(label, 'deck');
  return label;
}

/** A yield's drawn mark, in the yield's own ink (`data-voice`, the stylesheet's six rules). */
function voiceMark(key: YieldKey): HTMLElement {
  const mark = element('span', 'ldg-voice-icon');
  mark.dataset.voice = key;
  mark.append(yieldMarkNode(key, true));
  return mark;
}

/** A column head: the yield's mark and its name in the label's small caps. */
function voiceHead(key: YieldKey, open: boolean): HTMLTableCellElement {
  const head = element('th', open ? 'ldg-col is-open' : 'ldg-col') as HTMLTableCellElement;
  head.scope = 'col';
  head.dataset.voice = key;
  const inner = element('span', 'ldg-col-head');
  inner.append(voiceMark(key), element('span', 'ldg-col-name', YIELD_NAME[key].toLowerCase()));
  head.append(inner);
  return head;
}

/** A table with a hidden caption, so a screen reader is told what the columns are. */
function table(caption: string, className: string): HTMLTableElement {
  const node = element('table', `ldg-table ${className}`) as HTMLTableElement;
  node.append(element('caption', 'ldg-sr', caption));
  return node;
}

/**
 * One voice's stacked bar.
 *
 * **Positives only**, and the charges are named beside it rather than drawn into
 * it: gold is the one voice with negative lines (three of the four
 * `explainEmpireGold` lines are bills), and a stacked bar with a negative
 * segment in it is a bar that no longer means "this is the whole". So the bar is
 * what came in, the upkeep after it is what went out again, and the total on the
 * left is still the net figure the chip shows.
 */
function drawBar(voice: LedgerVoice): HTMLElement {
  const bar = element('div', 'ldg-bar');
  let positive = 0;
  for (const cls of LEDGER_CLASSES) positive += Math.max(0, voice.byClass[cls]);
  const parts: string[] = [];
  if (positive <= 0) {
    bar.append(element('span', 'ldg-bar-empty'));
  } else {
    for (const cls of LEDGER_CLASSES) {
      const value = voice.byClass[cls];
      if (value <= 0) continue;
      const slice = element('span', `ldg-slice is-${cls}`);
      paintLedgerInk(slice, cls);
      slice.style.flexGrow = String(value);
      slice.title = `${LEDGER_CLASS_NAME[cls]} ${figure(value)}`;
      parts.push(`${LEDGER_CLASS_NAME[cls]} ${figure(value)}`);
      bar.append(slice);
    }
  }
  bar.setAttribute('role', 'img');
  bar.setAttribute(
    'aria-label',
    `${YIELD_NAME[voice.key]} this turn: ${parts.length > 0 ? parts.join(', ') : 'nothing yet'}`,
  );
  return bar;
}

/**
 * **The legend, once, at the foot of the sheet** — the eight inks with their
 * names, and one line saying what the curves shade, the tick and the bars.
 *
 * At the foot rather than under band 1 (where the key stood until 2026-09-15)
 * because there are two things being coloured: the bars and the curves. Two
 * keys saying the same eight words would be the sheet telling a player twice
 * that grape is statecraft, and the ruling asks for a legend *once*.
 */
function drawLegend(): HTMLElement {
  const foot = element('section', 'ldg-legend');
  const key = element('ul', 'ldg-key');
  key.setAttribute('aria-label', 'The key to the eight inks');
  for (const cls of LEDGER_CLASSES) {
    const item = element('li', `ldg-key-item is-${cls}`);
    const swatch = element('span', 'ldg-swatch');
    paintLedgerInk(swatch, cls);
    item.append(swatch);
    item.append(element('span', 'ldg-key-name', LEDGER_CLASS_NAME[cls]));
    key.append(item);
  }
  foot.append(key);
  foot.append(element('p', 'ldg-note', `${ledgerCurveLegend()} ${LEDGER_PLATE_NOTE}`));
  return foot;
}

/** What the legend adds about the tick and the bars, in the board's words. */
export const LEDGER_PLATE_NOTE =
  'The dashed tick is the turn an age opened. Each bar is the whole of what came in this turn, and upkeep is named beside it.';

/**
 * The three shaded bands of a curve, each between the curve under it and its
 * own, drawn into `frame`. Each band is its own closed shape rather than three
 * areas dropped to the axis on top of each other: the inks are shaded, and three
 * translucent fills laid over one another would mix into colours the palette
 * does not contain.
 */
function drawBands(
  frame: SVGElement,
  stackPoints: readonly [number, number][][],
  floor: readonly [number, number][],
): void {
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
}

/**
 * One voice's sparkline in the fold-out plate: the total as a line, and under
 * it the three classes an empire *chose* — statecraft, its great people and its
 * religion — shaded in their own inks and stacked from the axis (the ruling of
 * 2026-09-15). A dashed tick where an age turned.
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

  drawBands(frame, stackPoints, floor);
  if (totalPoints.length > 0) {
    const line = totalPoints.map(([x, y], at) => `${at === 0 ? 'M' : 'L'} ${x} ${y}`);
    frame.append(svg('path', { class: 'ldg-spark-line', d: line.join(' ') }));
  }
  frame.append(svg('path', { class: 'ldg-spark-axis', d: `M0 ${HEIGHT}H${WIDTH}` }));
  return frame;
}

/**
 * The open yield's curve, as a ruled plate on the right page (the Ledger
 * board): the axis and its rules, the turns along the foot, the last eight
 * turns shaded, a dashed tick where an age opened, the three chosen classes
 * stacked under the total, and the total's last figure at the end of the line.
 * The same points as the plate's sparkline (`sparkPoints`, `stackedSeries`),
 * in a larger box.
 */
function drawCurvePlate(samples: readonly LedgerSample[], key: YieldKey): SVGElement {
  const VIEW_W = 646;
  const VIEW_H = 146;
  const LEFT = 44;
  const TOP = 10;
  const WIDTH = 560;
  const HEIGHT = 110;
  const last = samples[samples.length - 1]!;
  const first = samples[0]!;
  const totals = samples.map((sample) => sample.totals[key] ?? 0);
  let high = 1;
  let low = 0;
  for (const value of totals) {
    if (value > high) high = value;
    if (value < low) low = value;
  }
  const ticks = curveTicks(low, high);
  const ceiling = Math.max(high, ticks[ticks.length - 1] ?? high);
  low = Math.min(low, ticks[0] ?? low);
  const frame = svg('svg', {
    class: 'ldg-curve',
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    role: 'img',
    'aria-label': `${YIELD_NAME[key]} a turn from turn ${first.turn} to turn ${last.turn}, ending at ${netFigure(last.totals[key] ?? 0)}`,
  });
  const plot = svg('g', { transform: `translate(${LEFT} ${TOP})` });
  frame.append(plot);
  const xOf = (at: number): number =>
    samples.length === 1 ? WIDTH : (WIDTH * at) / (samples.length - 1);
  const yOf = (value: number): number => HEIGHT - (HEIGHT * (value - low)) / (ceiling - low || 1);

  // The last eight turns, shaded in the yield's own tint.
  if (samples.length > LEDGER_LAST_TURNS) {
    const from = xOf(samples.length - LEDGER_LAST_TURNS);
    plot.append(svg('rect', { class: 'ldg-curve-recent', x: String(from), y: '0', width: String(WIDTH - from), height: String(HEIGHT) }));
  }
  // The rules across, at the round figures.
  const rules = ticks.filter((tick) => tick !== 0).map((tick) => `M0 ${yOf(tick)}H${WIDTH}`);
  if (rules.length > 0) plot.append(svg('path', { class: 'ldg-curve-rule', d: rules.join('') }));
  // A dashed tick where an age opened, named once.
  let named = false;
  for (let at = 1; at < samples.length; at += 1) {
    if (samples[at]!.age === samples[at - 1]!.age) continue;
    const x = xOf(at);
    plot.append(svg('path', { class: 'ldg-curve-age', d: `M${x} 0V${HEIGHT}` }));
    if (!named) {
      const label = svg('text', { class: 'ldg-curve-label', x: String(x + 5), y: '11' });
      label.textContent = `Æra ${eraNumeral(samples[at]!.age)} opens`;
      plot.append(label);
      named = true;
    }
  }
  // The bands and the total, through the sparkline's own two functions.
  const stacks = stackedSeries(samples, key);
  const points = (values: readonly number[]): [number, number][] =>
    sparkPoints(values, WIDTH, HEIGHT, low, ceiling);
  drawBands(plot, stacks.map(points), points(samples.map(() => 0)));
  const line = points(totals).map(([x, y], at) => `${at === 0 ? 'M' : 'L'} ${x} ${y}`);
  plot.append(svg('path', { class: 'ldg-curve-line', d: line.join(' ') }));
  // The money rules either side, and the axis.
  plot.append(svg('path', { class: 'ldg-curve-money', d: `M0 0V${HEIGHT}M${WIDTH} 0V${HEIGHT}` }));
  plot.append(svg('path', { class: 'ldg-curve-axis', d: `M0 ${yOf(0)}H${WIDTH}` }));
  const endY = yOf(last.totals[key] ?? 0);
  plot.append(svg('circle', { class: 'ldg-curve-end', cx: String(WIDTH), cy: String(endY), r: '3' }));
  const end = svg('text', { class: 'ldg-curve-value', x: String(WIDTH + 8), y: String(endY + 5) });
  end.textContent = netFigure(last.totals[key] ?? 0);
  plot.append(end);
  // The figures up the side and the turns along the foot.
  for (const tick of ticks) {
    const label = svg('text', { class: 'ldg-curve-label', x: '-8', y: String(yOf(tick) + 4), 'text-anchor': 'end' });
    label.textContent = netFigure(tick);
    plot.append(label);
  }
  for (const turn of turnTicks(first.turn, last.turn)) {
    const at = samples.findIndex((sample) => sample.turn >= turn);
    if (at < 0) continue;
    const label = svg('text', { class: 'ldg-curve-label', x: String(xOf(at)), y: String(HEIGHT + 17), 'text-anchor': 'middle' });
    label.textContent = String(turn);
    plot.append(label);
  }
  const lastTurn = svg('text', { class: 'ldg-curve-label', x: String(WIDTH), y: String(HEIGHT + 17), 'text-anchor': 'end' });
  lastTurn.textContent = `turn ${last.turn}`;
  plot.append(lastTurn);
  if (samples.length > LEDGER_LAST_TURNS) {
    // The board sets "last eight" halfway down the plot, in the clear space
    // between the line and the bands. When the bands climb that high, the
    // label moves to the middle of whatever gap the window does have, so it
    // never sits on a stroke.
    const from = samples.length - LEDGER_LAST_TURNS;
    const lineLow = Math.max(...points(totals).slice(from).map(([, y]) => y));
    const top = stacks[stacks.length - 1];
    const bandHigh = top ? Math.min(...points(top).slice(from).map(([, y]) => y)) : HEIGHT;
    const y = bandHigh - lineLow >= 18 ? (lineLow + bandHigh) / 2 + 4 : 58;
    const recent = svg('text', { class: 'ldg-curve-label ldg-curve-recent-label', x: String(xOf(from) + 6), y: String(y) });
    recent.textContent = 'last eight';
    plot.append(recent);
  }
  return frame;
}

/** A small-caps page foot: "turn 91". */
function pageFoot(turn: number, side: 'left' | 'right'): HTMLElement {
  const foot = element('p', `ldg-page-foot is-${side}`, 'turn ');
  foot.append(element('span', 'ldg-figure', figure(turn)));
  return foot;
}

/** The yield's own tint, through one custom property the stylesheet resolves. */
function paintVoice(node: HTMLElement, key: YieldKey): void {
  node.dataset.voice = key;
}

export function createLedgerScreen(options: LedgerScreenOptions): LedgerScreen {
  const { overlay, body, closeButton } = options;
  /**
   * Which voice the right page shows. The chip that opened the sheet names it,
   * and the tabs at the page's edge and the plate's rows change it. A fact
   * about this conversation, forgotten on the way out.
   */
  let focus: YieldKey | null = null;
  /** The voice the right page is open at: the chosen one, or the first. */
  function openVoice(): YieldKey {
    return focus ?? VOICES[0]!;
  }

  /** Changes the open voice, and gives the keyboard back to the control that did it. */
  function choose(key: YieldKey, keep: string): void {
    focus = key;
    draw();
    overlay.querySelector<HTMLElement>(`[data-keep="${keep}"]`)?.focus({ preventScroll: true });
  }

  /**
   * The aggregate at the head of the left page — the same figure, from the same
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
    const label = element('span', 'ldg-deck-label', 'Your cards');
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

  /**
   * The left page's first table: each source a row, each yield a column, the
   * open yield's column tinted, upkeep on a row of its own in red, and this
   * turn's totals under the double rule. Every figure is `explainLedger`'s
   * (the classes of the fold the top bar's chips are), and the total is each
   * voice's own `total`, never a sum taken here.
   */
  function drawThisTurn(): HTMLElement {
    const state = options.getState();
    const playerId = options.getPlayerId();
    const open = openVoice();
    const band = element('section', 'ldg-band');
    band.append(element('h3', 'ldg-heading', 'This turn, and who made it'));
    band.append(drawDeckLine(state, playerId));
    const reading = explainLedger(state, playerId);
    const grid = table('This turn: each source, and what it made of each yield', 'ldg-sources');
    const head = element('thead');
    const headRow = element('tr');
    const corner = element('th', 'ldg-col is-first', 'who made it') as HTMLTableCellElement;
    corner.scope = 'col';
    headRow.append(corner);
    for (const voice of reading) headRow.append(voiceHead(voice.key, voice.key === open));
    head.append(headRow);
    const rows = element('tbody');
    for (const cls of LEDGER_CLASSES) {
      const row = element('tr');
      const name = element('th', 'ldg-row-name') as HTMLTableCellElement;
      name.scope = 'row';
      name.append(classLabel(cls));
      row.append(name);
      for (const voice of reading) {
        const value = Math.max(0, voice.byClass[cls]);
        const node = cell('td', value, voice.key === open ? 'is-open' : '');
        if (value > 0) node.title = `${LEDGER_CLASS_NAME[cls]}: ${figure(value)} ${YIELD_NAME[voice.key]}`;
        row.append(node);
      }
      rows.append(row);
    }
    // Upkeep: what went out again, named beside the whole rather than inside it.
    const outs = reading.map((voice) => {
      let out = 0;
      for (const cls of LEDGER_CLASSES) out += Math.min(0, voice.byClass[cls]);
      return out;
    });
    if (outs.some((out) => out < 0)) {
      const row = element('tr', 'is-out');
      const name = element('th', 'ldg-row-name') as HTMLTableCellElement;
      name.scope = 'row';
      const label = element('span', 'ldg-class is-out');
      label.append(element('i', 'ldg-swatch is-blank'), element('span', 'ldg-class-name', 'out again'));
      name.append(label, document.createTextNode(' '), element('span', 'ldg-aside', 'upkeep'));
      row.append(name);
      reading.forEach((voice, at) => {
        const node = element('td', voice.key === open ? 'ldg-num is-open' : 'ldg-num') as HTMLTableCellElement;
        if (outs[at]! < 0) {
          node.append(element('span', 'ldg-debit', signedFigure(outs[at]!)));
          node.title = 'Maintenance and upkeep, charged against the empire';
        }
        row.append(node);
      });
      rows.append(row);
    }
    const foot = element('tfoot');
    const totalRow = element('tr');
    const label = element('th', 'ldg-total-name', 'This turn') as HTMLTableCellElement;
    label.scope = 'row';
    totalRow.append(label);
    for (const voice of reading) totalRow.append(cell('td', voice.total, voice.key === open ? 'is-open is-total' : 'is-total'));
    foot.append(totalRow);
    grid.append(head, rows, foot);
    band.append(grid);
    return band;
  }

  /**
   * The right page's head and its first table: the open yield by source, a turn
   * and as a share of what came in, and the caption in the sheet's own words.
   */
  function drawOpenVoice(): HTMLElement {
    const state = options.getState();
    const playerId = options.getPlayerId();
    const key = openVoice();
    const voice = explainLedger(state, playerId).find((one) => one.key === key)!;
    const band = element('section', 'ldg-band');
    const title = element('h3', 'ldg-open-title');
    title.append(voiceMark(key), document.createTextNode(`${voiceTitle(key)}, this turn`));
    band.append(title);
    let positive = 0;
    let out = 0;
    for (const cls of LEDGER_CLASSES) {
      positive += Math.max(0, voice.byClass[cls]);
      out += Math.min(0, voice.byClass[cls]);
    }
    const grid = table(`${YIELD_NAME[key]} this turn, by source, with each source's share`, 'ldg-share');
    const head = element('thead');
    const headRow = element('tr');
    for (const [text, cls] of [['who made it', 'is-first'], ['a turn', ''], ['share', 'is-share']] as const) {
      const th = element('th', `ldg-col ${cls}`, text) as HTMLTableCellElement;
      th.scope = 'col';
      headRow.append(th);
    }
    head.append(headRow);
    const rows = element('tbody');
    for (const cls of LEDGER_CLASSES) {
      const row = element('tr');
      const name = element('th', 'ldg-row-name') as HTMLTableCellElement;
      name.scope = 'row';
      name.append(classLabel(cls));
      row.append(name, cell('td', Math.max(0, voice.byClass[cls])));
      row.append(element('td', 'ldg-num is-share', `${sharePercent(voice.byClass[cls], positive)}%`));
      rows.append(row);
    }
    if (out < 0) {
      const row = element('tr', 'is-out');
      const name = element('th', 'ldg-row-name') as HTMLTableCellElement;
      name.scope = 'row';
      const label = element('span', 'ldg-class is-out');
      label.append(element('i', 'ldg-swatch is-blank'), element('span', 'ldg-class-name', 'out again'));
      name.append(label, document.createTextNode(' '), element('span', 'ldg-aside', 'upkeep'));
      const debit = element('td', 'ldg-num');
      debit.append(element('span', 'ldg-debit', signedFigure(out)));
      row.append(name, debit, element('td', 'ldg-num is-share'));
      rows.append(row);
    }
    const foot = element('tfoot');
    const totalRow = element('tr');
    const label = element('th', 'ldg-total-name', 'This turn') as HTMLTableCellElement;
    label.scope = 'row';
    totalRow.append(label, cell('td', voice.total, 'is-total'), element('td', 'ldg-num'));
    foot.append(totalRow);
    grid.append(head, rows, foot);
    band.append(grid);
    const caption = ledgerCaption(voice);
    band.append(element('p', 'ldg-caption', `${caption.charAt(0).toUpperCase()}${caption.slice(1)}.`));
    return band;
  }

  /**
   * The open yield's curve and its last eight turns, from the session's ring.
   * Before the first turn ends there is nothing to draw, and the page says so.
   */
  function drawCurve(): HTMLElement {
    const key = openVoice();
    const band = element('section', 'ldg-band');
    band.append(element('h3', 'ldg-heading', 'The curve, turn by turn'));
    const samples = options.history();
    if (samples.length === 0) {
      band.append(element('p', 'ldg-note', LEDGER_CURVE_EMPTY));
      band.append(element('p', 'ldg-note', LEDGER_CURVE_FOOTNOTE));
      return band;
    }
    const figure_ = element('figure', 'ldg-curve-figure');
    figure_.append(drawCurvePlate(samples, key));
    const legend = element('figcaption', 'ldg-curve-key');
    for (const cls of LEDGER_CURVE_SERIES) {
      const none = samples.every((sample) => (sample[cls]?.[key] ?? 0) <= 0);
      legend.append(classLabel(cls, none ? `${LEDGER_CLASS_NAME[cls]}, none yet` : LEDGER_CLASS_NAME[cls]));
    }
    const last = samples[samples.length - 1]!;
    legend.append(
      element(
        'span',
        'ldg-curve-span',
        `${figure(samples.length)} ${samples.length === 1 ? 'turn' : 'turns'}, to turn ${figure(last.turn)}`,
      ),
    );
    figure_.append(legend);
    band.append(figure_);

    band.append(element('h3', 'ldg-heading', 'The last eight turns'));
    const grid = table(
      `${YIELD_NAME[key]} over the last eight turns, with the three sources that you chose`,
      'ldg-last',
    );
    const head = element('thead');
    const headRow = element('tr');
    const turn = element('th', 'ldg-col is-first', 'turn') as HTMLTableCellElement;
    turn.scope = 'col';
    headRow.append(turn);
    for (const cls of LEDGER_CURVE_SERIES) {
      const th = element('th', 'ldg-col') as HTMLTableCellElement;
      th.scope = 'col';
      th.append(classLabel(cls));
      headRow.append(th);
    }
    for (const text of ['the rest', YIELD_NAME[key].toLowerCase()]) {
      const th = element('th', 'ldg-col', text) as HTMLTableCellElement;
      th.scope = 'col';
      headRow.append(th);
    }
    head.append(headRow);
    const rows = element('tbody');
    const lines = lastTurnsRows(samples, key);
    lines.forEach((line, at) => {
      const row = element('tr', at === lines.length - 1 ? 'is-latest' : '');
      const label = element('th', 'ldg-row-name ldg-figure', figure(line.turn)) as HTMLTableCellElement;
      label.scope = 'row';
      row.append(label, cell('td', line.deck), cell('td', line.people), cell('td', line.religion));
      row.append(cell('td', line.rest), cell('td', line.total, 'is-total'));
      rows.append(row);
    });
    grid.append(head, rows);
    band.append(grid);
    band.append(element('p', 'ldg-note', LEDGER_CURVE_FOOTNOTE));
    return band;
  }

  /**
   * What the deck has produced: the lifetime tally, one row a card in the
   * state's own order (the order the cards first paid, which is history), its
   * six voices in the ruled columns, and the simulation's fold of them under
   * the double rule (`foldDeckLedger`, through `deckTallyRows`; rule 5).
   */
  function drawProduced(): HTMLElement {
    const { rows, total, totalPaid } = deckTallyRows(options.getState(), options.getPlayerId());
    const open = openVoice();
    const band = element('section', rows.length === 0 ? 'ldg-band is-empty' : 'ldg-band');
    band.append(element('h3', 'ldg-heading', LEDGER_BAND3_TITLE));
    if (rows.length === 0) {
      band.append(element('p', 'ldg-note', LEDGER_BAND3_EMPTY));
      return band;
    }
    const grid = table('What the deck has produced: each card, and what it has paid of each yield', 'ldg-produced');
    const head = element('thead');
    const headRow = element('tr');
    const corner = element('th', 'ldg-col is-first', 'card') as HTMLTableCellElement;
    corner.scope = 'col';
    headRow.append(corner);
    for (const key of VOICES) headRow.append(voiceHead(key, key === open));
    head.append(headRow);
    const list = element('tbody');
    for (const row of rows) {
      const line = element('tr', 'ldg-tally-row');
      line.dataset.card = row.card;
      const name = element('th', 'ldg-row-name') as HTMLTableCellElement;
      name.scope = 'row';
      name.append(element('span', 'ldg-card-name', row.name));
      if (!row.seated) name.append(document.createTextNode(' '), element('span', 'ldg-aside', 'out of its chair'));
      name.title = `${row.name}: ${stampFigures(row.reading).length === 0 ? 'nothing yet' : stampText(stampFigures(row.reading))}`;
      line.append(name);
      for (const key of VOICES) line.append(cell('td', row.paid[key] ?? 0, key === open ? 'is-open' : ''));
      list.append(line);
    }
    const foot = element('tfoot');
    const totalRow = element('tr');
    const label = element('th', 'ldg-total-name is-deck', DECK_TALLY_LABEL_TITLE) as HTMLTableCellElement;
    label.scope = 'row';
    paintLedgerInk(label, 'deck');
    label.title = `${DECK_TALLY_LABEL}: ${stampFigures(total).length === 0 ? 'nothing yet' : stampText(stampFigures(total))}`;
    totalRow.append(label);
    for (const key of VOICES) totalRow.append(cell('td', totalPaid[key] ?? 0, key === open ? 'is-open is-total' : 'is-total'));
    foot.append(totalRow);
    grid.append(head, list, foot);
    band.append(grid);
    band.append(element('p', 'ldg-note', LEDGER_BAND3_FOOTNOTE));
    return band;
  }

  /**
   * The fold-out plate at the foot: one row a yield, with its total, this
   * turn's bar by source, the session's curve, and what went out again. The
   * open yield's row is tinted, and a row's name opens it on the right page.
   */
  function drawPlate(): HTMLElement {
    const state = options.getState();
    const playerId = options.getPlayerId();
    const open = openVoice();
    const samples = options.history();
    const plate = element('section', 'ldg-plate');
    const head = element('div', 'ldg-plate-row is-head');
    head.append(element('h3', 'ldg-heading ldg-plate-title', 'The graphs'));
    head.append(element('span', 'ldg-col', 'this turn, by source'));
    const last = samples[samples.length - 1];
    head.append(
      element(
        'span',
        'ldg-col',
        last === undefined
          ? 'the curve'
          : `the curve, ${figure(samples.length)} ${samples.length === 1 ? 'turn' : 'turns'} to turn ${figure(last.turn)}`,
      ),
    );
    head.append(element('span', 'ldg-col', 'out again'));
    plate.append(head);
    const list = element('ul', 'ldg-sparks');
    for (const voice of explainLedger(state, playerId)) {
      const row = element('li', voice.key === open ? 'ldg-plate-row is-open' : 'ldg-plate-row');
      paintVoice(row, voice.key);
      const name = element('button', 'ldg-plate-name');
      name.type = 'button';
      name.dataset.keep = `plate-${voice.key}`;
      name.setAttribute('aria-pressed', String(voice.key === open));
      name.append(voiceMark(voice.key), document.createTextNode(voiceTitle(voice.key)));
      name.addEventListener('click', () => choose(voice.key, `plate-${voice.key}`));
      row.append(name);
      row.append(element('span', 'ldg-plate-total ldg-figure', netFigure(voice.total)));
      row.append(drawBar(voice));
      if (samples.length === 0) row.append(element('span', 'ldg-note', LEDGER_CURVE_EMPTY));
      else row.append(drawSpark(samples, voice.key));
      let out = 0;
      for (const cls of LEDGER_CLASSES) out += Math.min(0, voice.byClass[cls]);
      const spent = element('span', 'ldg-plate-out');
      if (out < 0) {
        spent.append(element('span', 'ldg-debit', out > -1 ? '−<1' : signedFigure(out)), document.createTextNode(' upkeep'));
        spent.title = 'Maintenance and upkeep, charged against the empire';
      } else spent.append(element('span', 'ldg-nil', '–'));
      row.append(spent);
      list.append(row);
    }
    plate.append(list);
    return plate;
  }

  /** The tabs at the right page's edge: one a yield, the open one pulled out. */
  function drawTabs(): HTMLElement {
    const open = openVoice();
    const tabs = element('div', 'ldg-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Open one yield');
    for (const key of VOICES) {
      const tab = element('button', key === open ? 'ldg-tab is-open' : 'ldg-tab');
      tab.type = 'button';
      tab.dataset.keep = `tab-${key}`;
      paintVoice(tab, key);
      tab.setAttribute('aria-label', YIELD_NAME[key]);
      tab.setAttribute('aria-pressed', String(key === open));
      tab.title = YIELD_NAME[key];
      tab.append(yieldMarkNode(key, true));
      tab.addEventListener('click', () => choose(key, `tab-${key}`));
      tabs.append(tab);
    }
    return tabs;
  }

  function draw(): void {
    const state = options.getState();
    const playerId = options.getPlayerId();
    paintVoice(body, openVoice());
    const book = element('div', 'ldg-book');
    const left = element('div', 'ldg-page is-left');
    const titles = element('div', 'ldg-titles');
    const title = element('h2', 'statecraft-title ldg-title', 'The ');
    title.append(element('em', '', 'Ledger'));
    titles.append(title, element('span', 'ldg-subtitle', `${seatName(state, playerId)} · turn ${figure(state.turn)}`));
    left.append(titles, drawThisTurn(), drawProduced(), pageFoot(state.turn, 'left'));
    const right = element('div', 'ldg-page is-right');
    right.append(drawOpenVoice(), drawCurve(), pageFoot(state.turn, 'right'));
    book.append(left, right);
    // The × goes first in the part that scrolls, at the top right of the book
    // (the board sets it in the right page's heading row). It scrolls away
    // with the page because a fixed × covered the figures of the last eight
    // turns as they passed under it. Escape, a press on the ground and the
    // tabs, which stay in view, still close or change the sheet.
    body.replaceChildren(closeButton, book, drawPlate(), drawLegend());
    overlay.querySelector('.ldg-tabs')?.remove();
    body.parentElement?.append(drawTabs());
  }

  /**
   * The frame (`modalShell.ts`) — `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, and the
   * disposer is the game's.
   *
   * The one thing this sheet keeps for itself is the **voice the right page is
   * open at**: the chip that opened it names it, written down before the shell
   * shows the sheet and forgotten on the way out. Because the shell repaints a
   * sheet that is already up, pressing a second chip while the Ledger stands
   * opens that voice instead of doing nothing.
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
    onDispose: () => {
      overlay.querySelector('.ldg-tabs')?.remove();
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
