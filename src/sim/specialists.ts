/**
 * Specialists: what a town's guildsmen *are*, as opposed to how they are earned.
 *
 * A **leaf**, and it is one for the reason `roads.ts` and `routeYields.ts` are:
 * two modules that must never import each other both need these answers.
 * `cities.ts` needs them because a specialist is a citizen who is not on a hex
 * (the assignment) and because a specialist pays (the yield fold); `guilds.ts`
 * needs them because the phase that makes one has to price the next. A helper
 * that lived in either would drag the whole of that module into the other, and
 * the symptom of a runtime cycle in this codebase is "X is not a function" in a
 * hundred unrelated files.
 *
 * Everything here is a pure function of one city and the rules table. Nothing
 * reads the board, nothing reads `state`, and nothing consumes the `Rng` — a
 * guild is deterministic bookkeeping, which is what lets the phase apportion by
 * arithmetic (D'Hondt) rather than by a draw.
 *
 * Ledger Entry XLVIII.
 */

import { SPECIALIST_FAMILIES, type SpecialistFamily } from './greatPeopleData';
import type { ResourceYieldBag } from './resourceData';
import { RULES } from './rulesData';
import type { City } from './state';

const GUILDS = RULES.cities.guilds;

/**
 * How many of this town's citizens are in the trades, over every family.
 *
 * The figure `population` is measured against everywhere: `population −
 * totalSpecialists` is who `assignCitizens` seats on hexes, and it is the `n`
 * the threshold and the share cap are both written in.
 *
 * Walks `SPECIALIST_FAMILIES` rather than the record's own keys, which is hard
 * rule 2 read for an object: a save's key order is whatever a serialiser
 * produced, and a sum must not depend on it. (It cannot change the total here —
 * addition commutes — but the habit is the rule, and the very next function does
 * depend on order.)
 */
export function totalSpecialists(city: City): number {
  let total = 0;
  for (const family of SPECIALIST_FAMILIES) total += city.specialists[family] ?? 0;
  return total;
}

/**
 * What this town's **next** specialist costs its guild bar:
 * `base + linear × n + n ^ exponent` over the specialists it already holds,
 * which is 60 · 67 · 75 · 84 · 93.
 *
 * **`growthThreshold`'s three terms, deliberately** (the user's ruling of
 * 2026-08-29): a flat base, a linear climb, and a superlinear tail with the very
 * same exponent the food basket uses. A player who has learnt one escalating
 * basket in this game has learnt all of them, and a guild bar that climbed by
 * some other shape would be a second curve to hold in the head for no gain.
 *
 * A **sibling** of that function rather than a call into it, and the split is
 * forced twice over: `growthThreshold` reads `rules.cities`' own three constants
 * and lives in `cities.ts`, which this leaf may never import (see the module
 * docblock). Passing the constants in would make one shared helper of two
 * functions that are the same *shape* and not the same *rule* — the day the food
 * curve is retuned, this one must not move with it.
 *
 * Two earlier tunings put the whole job on this curve and neither worked: steep
 * enough to stop a tall capital going entirely specialist was steep enough that
 * an ordinary town never climbed it at all. The **share cap** does that job now
 * (`canFormGuild`), which leaves this free to be a pace rather than a brake.
 *
 * Floored, so the bar is compared against a whole number however a designer
 * retunes the exponent.
 */
export function guildThreshold(city: City): number {
  return specialistThreshold(totalSpecialists(city));
}

/** `guildThreshold` for a count rather than a town — the phase's inner loop. */
export function specialistThreshold(held: number): number {
  const n = Math.max(0, Math.floor(held));
  return Math.floor(GUILDS.base + GUILDS.linear * n + n ** GUILDS.exponent);
}

/**
 * May this town take one more citizen out of the fields?
 *
 * **Three guards, and they are three different rules.** The share cap says a town
 * never holds more than `maxShare` of its people in the trades — a quarter, so a
 * village of six runs one guild and a capital of 22 runs five — and it is
 * compared by multiplying the fraction out (`den × (n + 1) <= num ×
 * population`) so the comparison is integer-exact on every machine. It is *the*
 * lever on how many guilds a big city ends up with, which is why the threshold
 * curve beside it is free to be gentle. The last-worker guard says a town always
 * keeps somebody on the land, which the share cap implies today and stops
 * implying the moment the waiver below lifts it. And the **idle waiver** says the
 * share does not apply at all while the town has citizens it cannot seat: a cap
 * on pulling people off the land has nothing to say about a citizen who is not
 * on any (the user's backstop, 2026-08-29). `idle` is
 * `population − specialists − workableSeats`, counted by the caller — this leaf
 * may not read the board — and defaults to none.
 *
 * It is a gate on **conversion only**. A city that shrinks below its own cap
 * keeps every specialist it has: nothing in this game dismisses a citizen on the
 * player's behalf, and a famine that turned guildsmen back into farmers would be
 * the growth system reaching into a system it does not own. The one way a
 * specialist ever leaves a guild is the player saying so (`dismissSpecialist`).
 */
export function canFormGuild(city: City, idle = 0): boolean {
  const held = totalSpecialists(city);
  const { num, den } = GUILDS.maxShare;
  // **The idle backstop waives the share** (the user's ruling, 2026-08-29). The
  // cap is a rule about pulling people *off the land*, and a citizen the town
  // has no hex left to seat is not on any land to be pulled off — so a city
  // whose radius is spoken for converts past the quarter rather than standing a
  // crowd in the square. The other two guards are untouched: somebody stays on
  // the land, and a town with no renown building still forms no guild.
  if (idle <= 0 && den * (held + 1) > num * city.population) return false;
  // Somebody stays on the land. Implied by the cap at today's quarter, but not
  // by the idle waiver above — which is exactly why it is stated separately.
  return city.population - (held + 1) >= 1;
}

/**
 * What one specialist of this family pays its city every turn, as the rules
 * table declares it.
 */
export function specialistPay(family: SpecialistFamily): ResourceYieldBag {
  return GUILDS.pays[family];
}

/**
 * One family's guildsmen, as a labelled line of a city's yields — hard rule 5
 * for the trades.
 *
 * `ResourceYieldLine`'s shape and `BuildingYieldContribution`'s: a source a
 * panel prints verbatim and six voices a fold adds up. `family` and `count` ride
 * along because the city panel's Specialists row and its Dismiss control are
 * about the *people*, not about the coins, and re-deriving which line was whose
 * from a printed string is the sort of second implementation this file exists to
 * avoid.
 */
export interface SpecialistYieldLine {
  family: SpecialistFamily;
  count: number;
  /** "3 scholars", "1 merchant". What the ledger prints. */
  source: string;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

/**
 * The plural a guild is named by. "1 merchant", "3 scholars".
 *
 * Written here rather than borrowed from the interface because the *source* of a
 * yield line is the simulation's own label — the panel prints it verbatim, and a
 * test that reads the fold reads the same words a player does. Every family's
 * name takes a plain `s`; the day one does not, this is the one place to say so.
 */
export function specialistNoun(family: SpecialistFamily, count: number): string {
  return count === 1 ? family : `${family}s`;
}

/**
 * What this town's specialists pay it, one line per family that has any.
 *
 * The list `cityQuote` folds into its flats, beside the buildings and the
 * luxuries and the caravans — so a specialist's science is staged by Entry XVII
 * exactly as a library's is, reaches the pool through the same `collectYields`,
 * and appears in the panel's ledger with its reason beside it. A family with
 * nobody in it is not a line: a guild that does not exist is not a source.
 *
 * Walked in `SPECIALIST_FAMILIES` order, which is the order the panel prints and
 * the order the apportionment breaks ties in — one order for the whole system.
 */
export function citySpecialistYields(city: City): SpecialistYieldLine[] {
  const lines: SpecialistYieldLine[] = [];
  for (const family of SPECIALIST_FAMILIES) {
    const count = city.specialists[family] ?? 0;
    if (count <= 0) continue;
    const pays = specialistPay(family);
    lines.push({
      family,
      count,
      source: `${count} ${specialistNoun(family, count)}`,
      food: (pays.food ?? 0) * count,
      production: (pays.production ?? 0) * count,
      gold: (pays.gold ?? 0) * count,
      science: (pays.science ?? 0) * count,
      culture: (pays.culture ?? 0) * count,
      faith: (pays.faith ?? 0) * count,
    });
  }
  return lines;
}
