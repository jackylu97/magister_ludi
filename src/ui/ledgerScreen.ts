/**
 * The Ledger: **where this turn's yield comes from, and what the curve is doing.**
 *
 * `docs/loop-review.md` §3, "The engine view — watching your own snowball". The
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
 *      (`deckAggregate`, one function so the two cannot disagree).
 *   2. **The curve.** Six sparklines of the per-turn total across the session,
 *      the deck's share shaded underneath.
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
 * — `cityYields` for a town's six voices, `explainEmpireGold` /
 * `explainEmpireCardYields` / `empireResourceYields` for the three empire-scale
 * lists — and the whole of what this file adds is a **classification** of the
 * lines those functions already return, plus the arithmetic that shares a
 * multiplied total back out over the flats that earned it (`shareOut`).
 *
 * The empire total per voice is therefore `topBar.ts`'s `civYields` exactly,
 * summand for summand, and `test/ui/ledgerScreen.test.ts` pins that: a band that
 * disagreed with the chip a player clicked to open it would be worse than no
 * band at all.
 *
 * Classifying by the **card**, not by the label
 * ---------------------------------------------
 * A card-paid line carries its `CardId` (`CardYieldLine.card`), and an id knows
 * its class where a label only knows its spelling: an Order, a belief, a
 * legacy, a wonder and a technology all print `Name · note` and only the id can
 * tell them apart. So `classifyCard` is a switch over the ten id spaces and
 * never over words — which is also what keeps a renamed row from silently
 * moving a slice into "other". The one place a *label* is read is
 * `classifyEmpireGold`, because `TradeGoldLine` offers no other handle; it keys
 * on the head of the label before the ` · ` exactly as `empireTradeLines` in
 * `topBar.ts` already does, and `test/ui/ledgerScreen.test.ts` pins the two
 * names still meeting.
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
 * The simulation keeps no history and must not grow one for a view (`docs/loop-review.md`
 * is explicit). So band 2 is a **UI-side ring buffer**, sampled once per
 * `onTurnResolved` and capped; it is not saved, a reloaded game starts its curve
 * at the reload, and the band's footnote says so in plain words. An honest
 * reading and the cheap one.
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
  type CityYields,
  centreYield,
  cityContext,
  cityQuote,
  cityYields,
  emptyCityYields,
  empirePercents,
  explainCityBuildings,
  explainEmpireCardYields,
  explainPalaceYield,
  tileYieldOf,
} from '../sim/cities';
import { cardCityYields, cardYieldConversions } from '../sim/statecraft';
import { cityResourceYields, empireResourceYields } from '../sim/resourceEffects';
import { citySpecialistYields } from '../sim/specialists';
import { cityRouteYields, explainEmpireGold } from '../sim/trade';
import { isBuildingId, isWonder } from '../sim/buildingData';
import { isBeadCardId } from '../sim/beadData';
import { isBeliefId, isConsecrationId, isRiteId } from '../sim/religionData';
import { isDoctrineId, isGovernmentId, isOrderId } from '../sim/statecraftData';
import type { CardId } from '../sim/statecraftData';
import { isGreatPersonId } from '../sim/greatPeopleData';
import { highestAge, isTechId } from '../sim/techData';
import { type City, type GameState, playerById } from '../sim/state';
import { getTileAt } from '../sim/map';
import { RULES } from '../sim/rulesData';
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

const CITIES = RULES.cities;

/** The six voices, in the order every other surface in this interface prints them. */
const VOICES: readonly YieldKey[] = ['food', 'production', 'gold', 'science', 'culture', 'faith'];

/**
 * **Where a yield came from**, as a player would name it — the eight classes
 * `docs/loop-review.md` §3 asks for, and no ninth.
 *
 * The list is a design decision rather than a derivation: these are the answers
 * to *"is my deck doing anything?"*, which is the question the sheet exists to
 * answer, so `deck` is one class and the six things it is being compared against
 * are the rest. A source nothing can classify lands in `other` and the register
 * test says which those are, deliberately — a silent "other" is a slice that
 * grows as the game does and tells nobody.
 */
export type LedgerClass =
  | 'tiles'
  | 'buildings'
  | 'deck'
  | 'religion'
  | 'people'
  | 'trade'
  | 'wonders'
  | 'other';

/** Drawing order, left to right along every bar. Ground first, oddments last. */
export const LEDGER_CLASSES: readonly LedgerClass[] = [
  'tiles',
  'buildings',
  'deck',
  'religion',
  'people',
  'trade',
  'wonders',
  'other',
];

/**
 * What each class is called on the sheet. Plain words (hard rule 7): a player
 * reading "the deck" knows what they drafted, where "statecraft" is the name of
 * a module.
 */
export const LEDGER_CLASS_NAME: Record<LedgerClass, string> = {
  tiles: 'the land',
  buildings: 'buildings',
  deck: 'your deck',
  religion: 'religion',
  people: 'great people',
  trade: 'trade',
  wonders: 'wonders',
  other: 'other',
};

/** A bag of six voices per class — the shape band 1 is folded into. */
export type LedgerBag = Record<LedgerClass, CityYields>;

export function emptyLedgerBag(): LedgerBag {
  return {
    tiles: emptyCityYields(),
    buildings: emptyCityYields(),
    deck: emptyCityYields(),
    religion: emptyCityYields(),
    people: emptyCityYields(),
    trade: emptyCityYields(),
    wonders: emptyCityYields(),
    other: emptyCityYields(),
  };
}

/**
 * Which class a card-paid line belongs to, by the **id** and never by the label.
 *
 * Ten id spaces, disjoint by construction (`CardId`'s own docblock, and
 * `test/sim/tech.test.ts` pins the disjointness), so this is a total function
 * over every card the evaluator can hand back:
 *
 *   government · doctrine · order → **deck** — the three classes a player drafts
 *     and slots are the deck, which is the whole comparison this sheet makes.
 *   belief · rite · consecration → **religion**.
 *   a great person's legacy → **great people**.
 *   a building → **wonders** if it is one, else **buildings**. Only one-of-a-kind
 *     rows reach the evaluator at all (`liveEffects`' fifth source), but the
 *     split is asked of `isWonder` rather than assumed, because the Observatory's
 *     great works are `oncePerEmpire` buildings and are not wonders.
 *   a technology, a bead → **other**, deliberately. See the module docblock.
 *
 * An id nothing recognises is a hand-edited save and gets `other` rather than a
 * throw — a breakdown slice is not the place to take a whole frame down
 * (`anyCardDef`'s own ruling, one module over).
 *
 * **The arms are in `anyCardDef`'s order, and that is load-bearing.** The id
 * spaces are *meant* to be disjoint and four ids are not (three Doctrines share
 * a name with a bead, one building does — the test holds the closed list), so
 * for those four the answer depends on which guard is asked first. Asking them
 * in the same order the card *lookup* asks them keeps one promise that matters
 * more than either reading: the slice a line lands in and the name that line
 * prints are the same card. A classifier that disagreed with `anyCardDef` would
 * put a figure in one bar and its label in another.
 */
export function classifyCard(card: CardId): LedgerClass {
  if (isBeliefId(card) || isRiteId(card) || isConsecrationId(card)) return 'religion';
  if (isOrderId(card) || isDoctrineId(card) || isGovernmentId(card)) return 'deck';
  if (isBeadCardId(card)) return 'other';
  if (isGreatPersonId(card)) return 'people';
  if (isTechId(card)) return 'other';
  if (isBuildingId(card)) return isWonder(card) ? 'wonders' : 'buildings';
  return 'other';
}

/**
 * The four standing lines of `explainEmpireGold`, keyed by the head of the label
 * — everything before the ` · count` tail, which is the only handle
 * `TradeGoldLine` offers (`empireTradeLines` in `topBar.ts` keys on the same
 * thing for its hover detail, and `test/ui/tradePanels.test.ts` pins that pair
 * the same way this file's test pins this one).
 *
 * A connection and the roads it runs on are **trade**; a garrison's wages are
 * nobody's building and nobody's ground, so the army is **other**; an
 * institution's bill is charged back against the **buildings** whose lines pay
 * for it, which is the reading that makes a building's slice its *net* worth
 * rather than its gross.
 *
 * A luxury's share of the connection gold (spices' Æra III) is a fifth line with
 * a resource's own label and no fixed head, so it falls through to **the land**
 * — which is where a seam's coin belongs and is why the fallback is that rather
 * than "other".
 */
export const EMPIRE_GOLD_CLASS: Record<string, LedgerClass> = {
  'City connections': 'trade',
  'Road maintenance': 'trade',
  'Unit maintenance': 'other',
  'Building maintenance': 'buildings',
};

export function classifyEmpireGold(source: string): LedgerClass {
  const head = source.split(' · ')[0] ?? '';
  return EMPIRE_GOLD_CLASS[head] ?? 'tiles';
}

/**
 * A multiplied total, shared back out over the flats that earned it.
 *
 * Entry XVII's two stages multiply a town's whole basket at once, so there is no
 * such thing as "the deck's share of the percentages" — the honest reading is
 * that a percentage is worth whatever it multiplies, and the gain belongs to
 * whoever put the base there. This shares `total` across `weights` in
 * proportion, and the **parts sum to the total exactly** however the rounding
 * falls: `explainUnitUpkeepRebate`'s running-difference discipline, which is the
 * house rule wherever a floored figure has to be shown as its parts.
 *
 * A weightless basket that somehow banked something (every flat zero, a
 * percentage on nothing) hands the whole figure to the last slot, which callers
 * make `other` — a number with no earner is exactly what that class is for.
 */
export function shareOut(total: number, weights: readonly number[]): number[] {
  const shares = weights.map(() => 0);
  if (shares.length === 0) return shares;
  let sum = 0;
  for (const weight of weights) sum += weight;
  const last = shares.length - 1;
  if (sum === 0) {
    shares[last] = total;
    return shares;
  }
  let paid = 0;
  for (let at = 0; at < last; at += 1) {
    const share = Math.round((total * weights[at]!) / sum);
    shares[at] = share;
    paid += share;
  }
  shares[last] = total - paid;
  return shares;
}

function add(bag: LedgerBag, into: LedgerClass, line: Partial<CityYields>): void {
  const bucket = bag[into];
  for (const key of VOICES) bucket[key] += line[key] ?? 0;
}

/**
 * One town's **flats**, classified — the summands of `cityQuote`, in the order
 * `cityQuote` folds them and read from the very same functions.
 *
 * It is deliberately a mirror of that function rather than a call into it:
 * `CityQuote.flats` is a single fold with no labels on it, so the only way to
 * ask where a town's basket came from is to walk the same seven lists again.
 * That is a real duplication and it is guarded rather than hidden — the test
 * pins this bag's fold equal to `quote.flats`, voice by voice, so a source added
 * to `cityQuote` without being added here fails loudly instead of quietly
 * swelling "other".
 *
 * The town's own two terms — a citizen's beaker and the culture a settlement
 * makes by being one — are `other`: they belong to no tile, no building and no
 * card, and calling them anything else would be the sheet inventing a source.
 */
export function cityFlatsByClass(state: GameState, city: City): LedgerBag {
  const bag = emptyLedgerBag();
  const ctx = cityContext(state, city);

  add(bag, 'tiles', centreYield(state, city));
  bag.other.science += Math.floor(city.population * CITIES.sciencePerPop);
  bag.other.culture += CITIES.baseCulturePerCity;

  for (const cell of city.workedTiles) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    add(bag, 'tiles', tileYieldOf(tile, ctx));
  }

  for (const line of cardCityYields(state, city)) add(bag, classifyCard(line.card), line);
  for (const line of cityResourceYields(state, city)) add(bag, 'tiles', line);
  // A guildsman is a citizen the buildings made room for, and he is drawn beside
  // the stones that seated him — the city panel's own reading (Entry XLVIII).
  for (const line of citySpecialistYields(city)) add(bag, 'buildings', line);
  for (const line of cityRouteYields(state, city)) add(bag, 'trade', line);
  for (const line of explainPalaceYield(state, city)) add(bag, 'buildings', line);
  for (const entry of explainCityBuildings(city)) {
    const into = isWonder(entry.building) ? 'wonders' : 'buildings';
    add(bag, into, entry);
    // Floored per entry, exactly as `cityQuote` floors it: two half-science
    // buildings pay for two halves rather than rounding into a free point.
    bag[into].science += Math.floor(city.population * entry.sciencePerPop);
  }

  // The conversions read the fold they join, so they are asked of the flats as
  // they stood *before* them — which is this bag, summed, which is what
  // `cityQuote` hands them one file over.
  const before = foldLedgerBag(bag);
  for (const line of cardYieldConversions(state, city, before)) {
    add(bag, classifyCard(line.card), line);
  }
  return bag;
}

/** The six voices a bag adds up to. The only sum of one. */
export function foldLedgerBag(bag: LedgerBag): CityYields {
  const total = emptyCityYields();
  for (const cls of LEDGER_CLASSES) {
    for (const key of VOICES) total[key] += bag[cls][key];
  }
  return total;
}

/** One voice's row on band 1: what it made, and who made it. */
export interface LedgerVoice {
  key: YieldKey;
  /** `civYields`' own figure for this voice — the number on the chip. */
  total: number;
  byClass: Record<LedgerClass, number>;
}

/**
 * The whole of band 1: the six voices, each split eight ways.
 *
 * Assembled in `civYields`' order and out of `civYields`' own summands — every
 * town's `cityYields`, then the empire-scale luxury signatures, then the four
 * lines of `explainEmpireGold`, then the empire-scale card lines — so the six
 * totals here are that function's six totals and the test pins it.
 *
 * The **staging** is where the classes have to be put back together (Entry
 * XVII): a town's percentages multiply its whole basket at once, so each town's
 * multiplied total is shared back over its own flats by `shareOut`. The empire
 * lines are banked after every city has collected and are multiplied by nothing,
 * so they are added flat.
 */
export function ledgerReading(state: GameState, playerId: number): LedgerVoice[] {
  const bag = emptyLedgerBag();
  const empire = empirePercents(state, playerId);

  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const quote = cityQuote(state, city, [], empire);
    const flats = cityFlatsByClass(state, city);
    const banked = cityYields(state, city, [], city.queue[0], quote);
    for (const key of VOICES) {
      // `other` last, so that a basket with nothing in it hands its figure to
      // the class that means "nobody here earned this".
      const weights = LEDGER_CLASSES.map((cls) => flats[cls][key]);
      const shares = shareOut(banked[key], weights);
      LEDGER_CLASSES.forEach((cls, at) => {
        bag[cls][key] += shares[at]!;
      });
    }
  }

  for (const line of empireResourceYields(state, playerId)) add(bag, 'tiles', line);
  for (const line of explainEmpireGold(state, playerId)) {
    bag[classifyEmpireGold(line.source)].gold += line.gold;
  }
  for (const line of explainEmpireCardYields(state, playerId)) {
    add(bag, classifyCard(line.card), line);
  }

  return VOICES.map((key) => {
    const byClass = {} as Record<LedgerClass, number>;
    let total = 0;
    for (const cls of LEDGER_CLASSES) {
      byClass[cls] = bag[cls][key];
      total += bag[cls][key];
    }
    return { key, total, byClass };
  });
}

/**
 * "your deck makes 41 of your 96 science" — the caption under a bar, in the
 * brief's own words.
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
export const DECK_AGGREGATE_LABEL = 'your cards';

/**
 * **The aggregate**: what this empire's cards pay it this turn, in one figure
 * per voice — the count-up Confirm fires on the Statecraft screen, and the line
 * at the head of this sheet's first band.
 *
 * One function for both, because the ruling that put the number on Confirm
 * (`docs/fewer-things.md` §4, "Making the combo visible") is a ruling about a
 * *scoring ceremony*, and a ceremony celebrating a figure the Ledger disagrees
 * with would be worse than no ceremony at all.
 *
 * **Why band 1's deck slice and not a sum of the cards' own stamps.** The two
 * readings are different questions and only one of them is the deck's total:
 *
 *   · `explainCardImpact` is **marginal** — a ghost-diff of the empire with one
 *     card taken out. Marginal readings do not sum to a total the moment
 *     anything multiplies (Entry XVII's two stages), converts (a
 *     `yieldConversion`'s share of a fold) or reads another card, which is
 *     precisely the deck this pass is building: eleven cards each worth "what
 *     the empire would lose without me" adds up to more than the empire makes.
 *     It is also eleven full empire folds, twice each, on every draw.
 *   · `ledgerReading`'s `deck` class is the **banked** figure: the very lines
 *     `collectYields` pays, classified by the card that pays them
 *     (`classifyCard`), with each town's multiplied total shared back over the
 *     flats that earned it. It is a sum by construction, and it is `civYields`'
 *     own summands — which is the property the test at the head of this suite
 *     pins voice by voice.
 *
 * So the aggregate is the second, and batch A's modifier lines join it the day
 * they land without an edit here: an amplifier over card yields is a
 * `CardYieldLine` like any other, folded in the evaluator's own order — base
 * lines, then the modifiers that read them — and classified by the card that
 * carries it.
 *
 * The stamp's shape rather than a bag, so the figure lands through the one
 * printer (`landCardStamp` / `playCardStamp`) wherever it is drawn.
 */
export function deckAggregate(state: GameState, playerId: number): StampReading {
  const figures: StampFigure[] = [];
  for (const voice of ledgerReading(state, playerId)) {
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
export function deckAggregateLine(reading: StampReading): string {
  const figures = stampFigures(reading);
  if (figures.length === 0) return `${DECK_AGGREGATE_LABEL}: nothing yet`;
  return `${DECK_AGGREGATE_LABEL}: ${stampText(figures)}`;
}

export function ledgerCaption(voice: LedgerVoice): string {
  const name = YIELD_NAME[voice.key];
  if (voice.total === 0 && voice.byClass.deck === 0) return `your deck makes no ${name} yet`;
  if (voice.byClass.deck === 0) {
    return `your deck makes none of your ${netFigure(voice.total)} ${name}`;
  }
  return `your deck makes ${figure(voice.byClass.deck)} of your ${netFigure(voice.total)} ${name}`;
}

// --- the curve --------------------------------------------------------------

/** One turn's reading, kept for the session. See `createLedgerHistory`. */
export interface LedgerSample {
  turn: number;
  /** The empire's era that turn, so the axis can tick where an age turned. */
  age: number;
  totals: Record<YieldKey, number>;
  deck: Record<YieldKey, number>;
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

/** This turn's reading, folded into the one row the curve keeps. */
export function ledgerSample(state: GameState, playerId: number): LedgerSample {
  const reading = ledgerReading(state, playerId);
  const totals = {} as Record<YieldKey, number>;
  const deck = {} as Record<YieldKey, number>;
  for (const voice of reading) {
    totals[voice.key] = voice.total;
    deck[voice.key] = voice.byClass.deck;
  }
  const player = playerById(state, playerId);
  return {
    turn: state.turn,
    age: player ? highestAge(player.techsResearched) : 1,
    totals,
    deck,
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

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
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
    slice.style.flexGrow = String(value);
    slice.title = `${LEDGER_CLASS_NAME[cls]} ${figure(value)}`;
    bar.append(slice);
  }
  return bar;
}

/** The eight swatches, once, under the bars. A bar is unreadable without them. */
function drawKey(): HTMLElement {
  const key = element('ul', 'ldg-key');
  for (const cls of LEDGER_CLASSES) {
    const item = element('li', `ldg-key-item is-${cls}`);
    item.append(element('span', 'ldg-swatch'));
    item.append(element('span', 'ldg-key-name', LEDGER_CLASS_NAME[cls]));
    key.append(item);
  }
  return key;
}

/** One voice's sparkline: the total as a line, the deck's share shaded under it. */
function drawSpark(samples: readonly LedgerSample[], key: YieldKey): SVGElement {
  const WIDTH = 240;
  const HEIGHT = 44;
  const frame = svg('svg', {
    class: 'ldg-spark',
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': `${YIELD_NAME[key]} per turn, and your deck's share of it`,
  });
  const totals = samples.map((sample) => sample.totals[key] ?? 0);
  const deck = samples.map((sample) => sample.deck[key] ?? 0);
  let high = 1;
  let low = 0;
  for (const value of totals) {
    if (value > high) high = value;
    if (value < low) low = value;
  }
  const totalPoints = sparkPoints(totals, WIDTH, HEIGHT, low, high);
  const deckPoints = sparkPoints(deck, WIDTH, HEIGHT, low, high);
  const baseline = HEIGHT - (HEIGHT * (0 - low)) / (high - low === 0 ? 1 : high - low);

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

  if (deckPoints.length > 0) {
    const area = [`M 0 ${baseline}`];
    for (const [x, y] of deckPoints) area.push(`L ${x} ${y}`);
    area.push(`L ${WIDTH} ${baseline}`, 'Z');
    frame.append(svg('path', { class: 'ldg-spark-deck', d: area.join(' ') }));
  }
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

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  /**
   * The aggregate at the head of band 1 — the same figure, from the same
   * function, that Confirm counts up one screen over (`deckAggregate`).
   *
   * Landed rather than played: this sheet is a place a player comes to *read*,
   * and the ceremony belongs to the moment the law was signed.
   */
  function drawDeckLine(state: GameState, playerId: number): HTMLElement {
    const line = element('p', 'ldg-deck');
    line.append(element('span', 'ldg-deck-label', DECK_AGGREGATE_LABEL));
    const reading = deckAggregate(state, playerId);
    const stamp = cardStampNode();
    if (stampFigures(reading).length === 0) {
      line.append(element('span', 'ldg-deck-none', 'nothing yet'));
    } else {
      landCardStamp(stamp, reading);
      line.append(stamp);
    }
    // The whole line in words, for the reading that has no glyphs in it.
    line.title = deckAggregateLine(reading);
    return line;
  }

  function drawThisTurn(): HTMLElement {
    const band = element('section', 'ldg-band');
    band.append(element('p', 'eyebrow', 'this turn, and who made it'));
    band.append(drawDeckLine(options.getState(), options.getPlayerId()));
    const rows = element('ul', 'ldg-rows');
    const reading = ledgerReading(options.getState(), options.getPlayerId());
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
    band.append(drawKey());
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
    body.append(drawThisTurn(), drawCurve(), drawProduced());
  }

  function open(next?: YieldKey): void {
    focus = next ?? null;
    if (isOpen()) {
      draw();
      return;
    }
    options.onOpen?.();
    overlay.hidden = false;
    draw();
    closeButton.focus();
  }

  function close(): void {
    if (!isOpen()) return;
    overlay.hidden = true;
    focus = null;
  }

  /**
   * Escape closes, capturing like every other parchment sheet's, so the board
   * never sees the key from underneath.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen()) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  const onOverlayClick = (event: MouseEvent): void => {
    if (event.target === overlay) close();
  };

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', onOverlayClick);
  window.addEventListener('keydown', onKeyDown, true);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    open,
    close,
    refresh(): void {
      if (isOpen()) draw();
    },
    dispose(): void {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('click', onOverlayClick);
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.hidden = true;
      body.replaceChildren();
    },
  };
}
