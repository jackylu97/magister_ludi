/**
 * **The Ledger's fold** — an empire's banked yields, split by who earned them
 * (`src/ui/ledgerScreen.ts`'s band 1, lifted into the simulation by batch G2).
 *
 * Why it moved
 * ------------
 * It was a *screen's* arithmetic until the wager deck asked for it. Half the
 * deck's competency checks are a Ledger class read as a number — "everything
 * your caravans paid this age", "what the buildings of your realm pay in one
 * turn", "everything your great people pay you" — and §3 of `docs/wager.md` is
 * explicit that a wager may only ask *readings the Ledger already prints*. A
 * rule that reads a screen is not a rule, so the classification came down here
 * and the sheet kept the drawing.
 *
 * Nothing about the arithmetic changed in the move. `ledgerScreen.ts` re-exports
 * every name it used to publish, so the Ledger, the Statecraft ceremony and the
 * tests that pin them all read exactly the figures they read before.
 *
 * What it is
 * ----------
 * `explainLedger(state, playerId)` answers one row per voice: the empire's own
 * banked figure for that voice, and the eight classes it is shared between. The
 * two shares are the whole of the difficulty and both are stated where they are
 * taken — the **flats** go to whoever paid them (every `CityYieldLine` carries
 * its class, decided once in `ledgerClass.ts`), and the **gain** the two stages
 * added goes to whoever supplied the percentages (`percentWeights` +
 * `shareGain`, the ruling of 2026-09-07).
 *
 * `ledgerBagOfCity` is the same fold for **one** town, and it is exported for
 * the one caller that wants a town rather than a realm: The Worked Land reads
 * what the land around the seat of government pays. `explainLedger` is written
 * over it, so there is one classification and not two.
 *
 * A leaf above the readings, deliberately: this module imports the empire's
 * reading, the town's own list and the class vocabulary, and **nothing imports
 * it back**. `wagers.ts` and `ledgerScreen.ts` are its two readers.
 */

import { type CityYields, emptyCityYields } from './cities';
import { type LedgerClass, LEDGER_CLASSES, classifyCard } from './ledgerClass';
import { isWonder } from './buildingData';
import { readEmpire } from './readings';
import { CITY_YIELD_KEYS, type CityYieldKey } from './resourceData';
import type { City, GameState } from './state';
import type { EmpireYieldLine } from './yields/empire';
import {
  productionModifiers,
  type CityReading,
  type CityYieldLine,
  type CityYieldPercent,
  type ProductionModifier,
} from './yields/town';

/** The six voices, in the order every surface prints them. */
const VOICES: readonly CityYieldKey[] = CITY_YIELD_KEYS;

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
 * `TradeGoldLine` offers.
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
 * half answers four ways, asked once off the line's own `origin`.
 *
 * A luxury's empire signature is the land's, a caravan abroad is trade's, the
 * treasury's ledger splits by the head of its label (`classifyEmpireGold`), and
 * a card's empire payout goes to the card.
 *
 * **The empire stage is `other`**, and that is the town half's own answer
 * arrived at by a shorter road: the only percentages standing at the empire's
 * scale are the two meter tiers and the arrears, `classifyPercent` files both
 * under `other`, and so `shareGain` over these weights would hand the whole
 * figure to `other` in any case.
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
 * the specific-before-general one every classifier here keeps: a card's
 * percentage is its own class (a building's own `percentYields` clause reaches
 * this list as a card, so the stones are split by `isWonder` inside
 * `classifyCard`); a `ProductionModifier`'s building is the stones; a seam's is
 * the land; and nothing at all is **other** — a meter tier and the arrears, both
 * of which are the empire leaning on every town at once.
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
 * be the same set of lines `foldCity` actually multiplied by: `quote.percents`
 * (both stages at once — the stage decides *when* a line applies and this asks
 * only *who supplied it*), and `productionModifiers` for production alone, since
 * a barracks' hammers behind whatever is at the front of the queue never pass
 * through the card evaluator at all.
 */
export function percentWeights(
  state: GameState,
  city: City,
  quote: CityReading,
  key: CityYieldKey,
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
 * 2026-09-07 (`docs/flags.md`, jj), in one function.
 *
 * `gain` is `banked − Σ flats`: what Entry XVII's two multiplications added to a
 * town's basket, plus the single flooring at the end of them. It is shared over
 * the percentages that were standing on that voice, each weighted by its
 * magnitude, and **same sign only** — a gain among the lines that pushed the
 * town up, a loss among the ones that pushed it down. Nobody is credited with
 * moving a town the way it did not move, and a share can never exceed the gain.
 *
 * A gain with no same-signed weight at all hands the whole figure to `other`:
 * "nobody here earned this" is the true sentence.
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
 * `explainUnitUpkeepRebate`'s running-difference discipline. `weights` is what
 * each class is *owed* — its flats plus its share of the gain — so the division
 * here is a rounding rather than an apportionment, and the last slot carries
 * whatever the rounding left over.
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
 * **One town's flats, classified** — and no walk at all.
 *
 * `explainCity` returns the labelled list its flats are the fold of
 * (`CityYieldLine`), and every line carries the class its source belongs to,
 * decided in the simulation, once, by the id and never by the label
 * (`classifyCard`, `ledgerClass.ts`).
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

/**
 * **One class of one bag, as a single figure** — the six voices of that class
 * added together.
 *
 * The wager deck's reading of a Ledger class ("everything your caravans pay
 * you"), and a sum of unlike things on purpose: a wager that asked for gold
 * alone would be a card about gold, where the competency check is *how much this
 * part of your realm is worth at all*.
 */
export function foldLedgerClass(bag: LedgerBag, cls: LedgerClass): number {
  const bucket = bag[cls];
  let total = 0;
  for (const key of VOICES) total += bucket[key];
  return total;
}

/**
 * **One town's banked basket, classified** — its flats by who paid them and its
 * multiplied gain by who supplied the percentages, rounded so the eight figures
 * still add to what the town banks.
 *
 * `explainLedger`'s loop body, lifted so the one caller that wants a *town* can
 * have it without a second copy of the two shares.
 */
export function ledgerBagOfCity(state: GameState, city: City): LedgerBag {
  const reading = readEmpire(state, city.ownerId);
  const town = reading.towns.find((one) => one.city.id === city.id);
  const bag = emptyLedgerBag();
  if (!town) return bag;
  const flats = flatsByClass(town.reading.lines);
  for (const key of VOICES) {
    let paid = 0;
    for (const cls of LEDGER_CLASSES) paid += flats[cls][key];
    const gain = shareGain(
      town.total[key] - paid,
      percentWeights(state, city, town.reading, key),
    );
    // `other` last, so that a basket with nothing in it hands its figure to the
    // class that means "nobody here earned this".
    const owed = LEDGER_CLASSES.map((cls) => flats[cls][key] + gain[cls]);
    const shares = shareOut(town.total[key], owed);
    LEDGER_CLASSES.forEach((cls, at) => {
      bag[cls][key] += shares[at]!;
    });
  }
  return bag;
}

/** One voice's row on band 1: what it made, and who made it. */
export interface LedgerVoice {
  key: CityYieldKey;
  /** `readEmpire`'s own figure for this voice — the number on the chip. */
  total: number;
  byClass: Record<LedgerClass, number>;
}

/**
 * The whole of band 1: the six voices, each split eight ways.
 *
 * Assembled in `readEmpire`'s order and out of `readEmpire`'s own summands —
 * every town's `foldCity`, then the empire's own list (`explainEmpireLines`: the
 * luxury signatures, the outbound foreign routes, the treasury's ledger, the
 * empire-scale card lines, and the empire stage over the fold of them) — so the
 * six totals here are that function's six totals, and the test pins it.
 *
 * The empire lines are banked after every city has collected and take the empire
 * stage themselves; the stage arrives as its own line and lands in **other**.
 */
export function explainLedger(state: GameState, playerId: number): LedgerVoice[] {
  const bag = emptyLedgerBag();
  const reading = readEmpire(state, playerId);

  for (const { city } of reading.towns) {
    const town = ledgerBagOfCity(state, city);
    for (const cls of LEDGER_CLASSES) add(bag, cls, town[cls]);
  }

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

/** The whole empire's basket, classified — `explainLedger` as a bag. */
export function ledgerBagOfEmpire(state: GameState, playerId: number): LedgerBag {
  const bag = emptyLedgerBag();
  for (const voice of explainLedger(state, playerId)) {
    for (const cls of LEDGER_CLASSES) bag[cls][voice.key] += voice.byClass[cls];
  }
  return bag;
}
