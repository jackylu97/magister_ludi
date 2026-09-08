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
 * lean on `tileYield` where the early ones lean on `cityYields`, a card's line
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
 * Pure builders, because this suite has no jsdom
 * ----------------------------------------------
 * `beadsScreen.ts`' and the Reliquary's discipline: everything that can be
 * *quietly wrong* — which class a line lands in, whether the parts sum to the
 * total, what the caption says, whether the buffer drops the right end — is a
 * pure function exported above the DOM. Drawing them is a page of `append`
 * calls that fail loudly or not at all.
 */

import type { CityReading } from '../sim/yields/town';
import {
  emptyCityYields,
  type CityYields,
} from '../sim/cities';
import {
  productionModifiers,
  type CityYieldLine,
  type CityYieldPercent,
  type ProductionModifier,
} from '../sim/yields/town';
import {
  type EmpireYieldLine,
} from '../sim/yields/empire';
import { readEmpire } from '../sim/readings';
import {
  type LedgerClass,
  LEDGER_CLASSES,
  classifyCard,
} from '../sim/ledgerClass';
import { isWonder } from '../sim/buildingData';
import { highestAge } from '../sim/techData';
import { type City, type GameState, playerById } from '../sim/state';
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
 * Which class one **empire-scale** line belongs to — the same question the town
 * half answers four ways, asked once off the line's own `origin` (batch H19).
 *
 * A luxury's empire signature is the land's, a caravan abroad is trade's, the
 * treasury's ledger splits by the head of its label (`classifyEmpireGold`), and
 * a card's empire payout goes to the card.
 *
 * **The empire stage is `other`**, and that is the town half's own answer
 * arrived at by a shorter road: the only percentages standing at the empire's
 * scale are the two meter tiers and the arrears, `classifyPercent` files both
 * under `other` (the empire leaning on every town at once is not a thing a
 * player built), and so `shareGain` over these weights would hand the whole
 * figure to `other` in any case. Said as a classification rather than run
 * through the sharer because a share of one class is that class.
 */
export function classifyEmpireLine(line: EmpireYieldLine): LedgerClass {
  switch (line.origin) {
    case 'resource':
      return 'tiles';
    case 'route':
      return 'trade';
    case 'gold':
      return classifyEmpireGold(line.source);
    case 'card':
      return line.card === undefined ? 'other' : classifyCard(line.card);
    case 'stage':
      return 'other';
  }
}

/**
 * Which class **supplied a percentage**, off the line's own markers.
 *
 * The four handles a percentage can carry, in precedence, and the precedence is
 * the specific-before-general one every classifier in this file keeps:
 *
 *   · `card` → `classifyCard`. This is the arm that carries the ruling: an
 *     Order's or a Doctrine's percentage is the **deck's**, a belief's is
 *     religion's, a legacy's is a great person's — and a *building's own*
 *     `percentYields` clause (a Forum's tenth of science, an Observatory's,
 *     Machu Picchu's quarter of gold) reaches this list as a card too, because
 *     `cityBuildingEffects` is one of `liveEffects`' sources. So the stones are
 *     split by `isWonder` inside `classifyCard`, exactly as their flat lines
 *     are, and no arm here has to know a building from a wonder.
 *   · `building` → the stones, split by `isWonder`. Only a `ProductionModifier`
 *     carries it: a barracks' hammers behind a unit are a percentage on
 *     production that never passes through the card evaluator at all.
 *   · `resource` → **the land**. A seam's signature is the ground's, which is
 *     where its flat yield already goes.
 *   · nothing → **other**, and that is two named cases rather than a shrug: a
 *     **meter tier** (the empire's mood is not a thing a player built) and the
 *     **arrears** penalty on a treasury under water. Both are the empire leaning
 *     on every town at once, and `other` is the class that means exactly that.
 */
export function classifyPercent(line: CityYieldPercent | ProductionModifier): LedgerClass {
  if (line.card !== undefined) return classifyCard(line.card);
  if ('building' in line && line.building !== undefined) {
    return isWonder(line.building) ? 'wonders' : 'buildings';
  }
  if (line.resource !== undefined) return 'tiles';
  return 'other';
}

/** One percentage standing on one voice of one town, and who put it there. */
export interface PercentWeight {
  into: LedgerClass;
  /** Signed whole percent, exactly as the line carries it. */
  percent: number;
}

/**
 * **Every percentage standing on one voice of one town**, classified — the
 * weights the multiplied gain is shared over.
 *
 * Two lists, because Entry XVII's staging is fed from two places and this has to
 * be the same set of lines `foldCity` actually multiplied by:
 *
 *   · `quote.percents` — `cityYieldPercents`' whole list, both stages at once.
 *     The stage decides *when* a line applies and this asks only *who supplied
 *     it*, so a city-stage Forum and an empire-stage happiness tier are two
 *     weights in one basket. Sharing proportionally across a pair of
 *     multiplications is an approximation either way (a point of city stage and
 *     a point of empire stage are not worth the same); the alternative is
 *     shading two stages' credit differently on a bar four pixels tall.
 *   · `productionModifiers` for **production alone** — the barracks, the marble
 *     and the cards' hammers behind whatever the town has at the front of its
 *     queue. `foldCityStages` folds these into the production city stage, so a
 *     reading that left them out would hand a barracks town's whole gain to
 *     `other`. `city.queue[0]` is asked because that is what `explainLedger`
 *     banks at, and the two must be the same build or the weights price a
 *     different bonus than the figure did.
 *
 * The one line this does **not** mirror is `foldCityStages`' authority exemption
 * (The Great Warring Tribes takes a meter's production malus off the table while
 * a town builds a unit). It is a negative line that classifies to `other`, and
 * the arrears beside it classify to `other` too, so mirroring the rule here
 * would move a figure from `other` to `other` — and a second copy of a card's
 * one-off is exactly what this tree refuses to keep.
 */
export function percentWeights(
  state: GameState,
  city: City,
  quote: CityReading,
  key: YieldKey,
): PercentWeight[] {
  const weights: PercentWeight[] = [];
  for (const line of quote.percents) {
    if (line.yield !== key || line.percent === 0) continue;
    weights.push({ into: classifyPercent(line), percent: line.percent });
  }
  if (key === 'production') {
    for (const line of productionModifiers(state, city, city.queue[0])) {
      if (line.percent === 0) continue;
      weights.push({ into: classifyPercent(line), percent: line.percent });
    }
  }
  return weights;
}

/**
 * **The gain, shared by who supplied the percentages** — the ruling of
 * 2026-09-07, in one function (`docs/flags.md`, jj).
 *
 * `gain` is `banked − Σ flats`: what Entry XVII's two multiplications added to a
 * town's basket, plus the single flooring at the end of them. It is shared over
 * the percentages that were standing on that voice, each weighted by its
 * magnitude — a +25% card next to a +10% Forum takes five parts of seven.
 *
 * **The same-sign rule**, and it is the honest one of the three that were on the
 * table:
 *
 *   · *signed weights* (a −25% arrears counting as −25) is arithmetically the
 *     prettiest and is unusable on a bar: the shares are `gain × w / Σw`, so a
 *     +100% card beside a −99% penalty divides by one and draws the deck a
 *     hundred times the gain, with a compensating negative slice beside it. A
 *     stacked bar whose parts are each many times the whole is not a reading.
 *   · *magnitudes, signs ignored* credits a **penalty with a share of a gain** —
 *     arrears would appear to be earning the empire science, which is the
 *     opposite of what it is doing.
 *   · **same sign** is what ships: a gain is shared among the percentages that
 *     pushed the town up, a loss among the ones that pushed it down, each in
 *     proportion to its magnitude. Nobody is credited with moving a town the way
 *     it did not move, every share carries the sign of the total it is part of,
 *     and the arithmetic is bounded — a share can never exceed the gain.
 *
 * A gain with **no same-signed weight at all** is the guard, and it hands the
 * whole figure to `other`: a town that banked more than its flats with nothing
 * multiplying it should not happen, and if it does, "nobody here earned this" is
 * the true sentence rather than a slice invented for somebody.
 */
export function shareGain(
  gain: number,
  weights: readonly PercentWeight[],
): Record<LedgerClass, number> {
  const shares = {} as Record<LedgerClass, number>;
  for (const cls of LEDGER_CLASSES) shares[cls] = 0;
  if (gain === 0) return shares;
  const counts = (weight: PercentWeight): boolean =>
    gain > 0 ? weight.percent > 0 : weight.percent < 0;
  let sum = 0;
  for (const weight of weights) if (counts(weight)) sum += Math.abs(weight.percent);
  if (sum === 0) {
    shares.other = gain;
    return shares;
  }
  for (const weight of weights) {
    if (!counts(weight)) continue;
    shares[weight.into] += (gain * Math.abs(weight.percent)) / sum;
  }
  return shares;
}

/**
 * A town's banked figure, handed out as the whole numbers a bar can draw.
 *
 * The **parts sum to the total exactly** however the rounding falls:
 * `explainUnitUpkeepRebate`'s running-difference discipline, which is the house
 * rule wherever a floored figure has to be shown as its parts. `weights` is what
 * each class is *owed* — its flats plus its share of the gain — so the division
 * here is a rounding rather than an apportionment, and the last slot carries
 * whatever the rounding left over.
 *
 * A weightless basket that somehow banked something hands the whole figure to
 * the last slot, which callers make `other` — a number with no earner is exactly
 * what that class is for.
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
 * **One town's flats, classified** — and, since batch E2, no walk at all.
 *
 * `explainCity` returns the labelled list its flats are the fold of
 * (`CityYieldLine`), and every line carries the class its source belongs to —
 * decided in the simulation, once, by the id and never by the label
 * (`classifyCard`, `ledgerClass.ts`). So the sheet's oldest and largest piece of
 * machinery is now a `switch`-less loop over somebody else's list.
 *
 * What it replaces was a **mirror**: eleven lists walked a second time on this
 * side in the order `explainCity` folded them, guarded by a test pinning the two
 * folds equal, and wrong in a different way every few days —
 * `explainCardBuildingYields` missing for as long as the bench had no such card, two
 * per-citizen terms floored for as long as no town had an odd population, every
 * worked hex filed whole under the land until the late Order pools made that
 * matter (`docs/flags.md`, ruling jj). Four surfaces each kept one of these;
 * this was the biggest. `docs/audit/evaluations.md` §3a is the finding and E2
 * is the fix.
 *
 * The three readings that used to live in the mirror are now facts about the
 * line and are stated where the line is made: a **worked hex** is split by the
 * card each of its own contributions names, with the ground keeping the fold
 * minus exactly those; the **centre** stays whole and stays the land's, because
 * its inheritance is an excess rather than a sum of lines and there is no honest
 * share of it to hand anybody; and a town's own two terms — a citizen's beaker
 * and the culture a settlement makes by being one — are `other`, because they
 * belong to no tile, no building and no card.
 */
export function flatsByClass(lines: readonly CityYieldLine[]): LedgerBag {
  const bag = emptyLedgerBag();
  for (const line of lines) add(bag, line.class, line);
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
  /** `readEmpire`' own figure for this voice — the number on the chip. */
  total: number;
  byClass: Record<LedgerClass, number>;
}

/**
 * The whole of band 1: the six voices, each split eight ways.
 *
 * Assembled in `readEmpire`' order and out of `readEmpire`' own summands — every
 * town's `foldCity`, then the empire's own list (`explainEmpireLines`: the
 * luxury signatures, the outbound foreign routes, the treasury's ledger, the
 * empire-scale card lines, and the empire stage over the fold of them) — so the
 * six totals here are that function's six totals and the test pins it. The pin is against the **bank** as well now: the
 * two surfaces agreeing with each other is what let them both miss the foreign
 * routes for three days.
 *
 * The **staging** is where the classes have to be put back together (Entry
 * XVII): a town's percentages multiply its whole basket at once, so what each
 * class is owed is **its flats plus its share of the gain** — the flats by who
 * paid them (`flatsByClass` over the town's own list), the gain by who supplied
 * the percentages (`percentWeights` + `shareGain`, the ruling of 2026-09-07) —
 * and `shareOut` rounds the eight figures to whole numbers that still add to the
 * bank.
 *
 * Until that ruling the whole banked figure was shared over the flats alone,
 * which credited a percentage to whoever had put the base under it and left a
 * card that pays nothing but a percentage out of "your cards" entirely. The
 * module docblock has the user's words for it.
 *
 * The empire lines are banked after every city has collected, and since batch
 * H19 they take the empire stage themselves: the additive lines fold first and
 * the meters multiply that fold once (`explainEmpireLines`). The stage arrives
 * as its own line and lands in **other**, which is where `classifyPercent` puts
 * a meter tier and the arrears one scale down — see `classifyEmpireLine`.
 */
export function explainLedger(state: GameState, playerId: number): LedgerVoice[] {
  const bag = emptyLedgerBag();
  // **The empire's own reading, subscribed to rather than rebuilt** (batch E2):
  // every town's published list and total, the empire's lines and the meters,
  // taken once for this revision and shared with the top bar, the panel, the
  // ghost-diff and the bot. This sheet's whole job is now the *classification*
  // of a list somebody else folded, plus the two shares below.
  const reading = readEmpire(state, playerId);

  for (const { city, reading: town, total: banked } of reading.towns) {
    const flats = flatsByClass(town.lines);
    for (const key of VOICES) {
      let paid = 0;
      for (const cls of LEDGER_CLASSES) paid += flats[cls][key];
      // What the two stages added over the flats — negative under arrears, or
      // under a meter tier the empire has fallen through. Exact, because the
      // classes are the town's own lines and `foldCity` floors once.
      const gain = shareGain(banked[key] - paid, percentWeights(state, city, town, key));
      // `other` last, so that a basket with nothing in it hands its figure to
      // the class that means "nobody here earned this".
      const owed = LEDGER_CLASSES.map((cls) => flats[cls][key] + gain[cls]);
      const shares = shareOut(banked[key], owed);
      LEDGER_CLASSES.forEach((cls, at) => {
        bag[cls][key] += shares[at]!;
      });
    }
  }

  // **The empire's own lines**, off the one list the resolution banks the fold
  // of (`explainEmpireLines`, batch H19) and classified by where each came from
  // rather than by four separate walks of four folds — a luxury's signature into
  // the land, a caravan abroad into trade (the class a route's line lands in
  // when its destination is at home, said again for the half
  // of the same money that has no town to be banked in), the treasury's ledger
  // by the head of its label, a card's payout by the card, and the empire stage
  // into **other**.
  for (const line of reading.lines) {
    add(bag, classifyEmpireLine(line), line);
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
 *     `yieldConversion`'s share of a fold) or reads another card, which is
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
  const reading = explainLedger(state, playerId);
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

  /**
   * The aggregate at the head of band 1 — the same figure, from the same
   * function, that Confirm counts up one screen over (`foldDeck`).
   *
   * Landed rather than played: this sheet is a place a player comes to *read*,
   * and the ceremony belongs to the moment the law was signed.
   */
  function drawDeckLine(state: GameState, playerId: number): HTMLElement {
    const line = element('p', 'ldg-deck');
    line.append(element('span', 'ldg-deck-label', DECK_LABEL));
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
