/**
 * The `guilds` phase: a city's own renown, banked turn after turn, quietly takes
 * a citizen out of the fields and puts them in a trade.
 *
 * Ledger Entry XLVIII, and the problem it answers is one a player feels rather
 * than reads: by the late game a big city has more citizens than hexes worth
 * working, and the tenth one is standing on a snow tile for a single bushel.
 * Civ's answer is specialist *slots* — buildings with two seats each, a screen
 * of plus and minus buttons, a decision every time a town grows. The user's
 * ruling is the opposite of that in every respect: **passive, unlimited, and
 * ignorable**. Nothing to place, nothing to plan, one verb (*remove*) and never
 * *add*.
 *
 * The loop, in one paragraph
 * --------------------------
 * A city banks an inflow into `City.guildBasket` every turn: what its own
 * **buildings** earn in renown for the four specialist families, plus a
 * **trickle** back from the guildsmen it already has, plus a **weight on its
 * population**. When the bar covers `guildThreshold`, one citizen converts, the
 * threshold is spent and the remainder carries — `growCities`' arithmetic one
 * currency over, down to the shape of the curve: `guildThreshold` is
 * `growthThreshold`'s three terms with the guild bar's own constants in them.
 *
 * Three gates, and each says a different thing
 * --------------------------------------------
 *   · **A renown building or nothing.** If no specialist family earned this town
 *     anything this turn, the bar still fills but nobody converts, however large
 *     the town. Population *accelerates* a guild and never founds one: a trade
 *     needs a building to name it, and a size-20 city of bare fields is a size-20
 *     city of farmers. This is also what makes the general family's exclusion
 *     bite — a town whose only renown is a barracks' is a town with no guilds.
 *   · **The share cap.** No more than a quarter of a town's people are ever in
 *     the trades (`canFormGuild`) — one guild in a village of six, five in a
 *     capital of 22. It is the lever that decides how many a big city ends up
 *     with, which is what leaves the threshold curve free to be a pace rather
 *     than a brake. A gate on conversion only: a town that shrinks below its own
 *     cap keeps everybody it has.
 *   · **The last worker.** Somebody stays on the land. Implied by the cap today
 *     and stated anyway, because it is the rule a designer raising the fraction
 *     would break.
 *
 * Apportionment, never a draw
 * ---------------------------
 * Which family gets the new guildsman is **D'Hondt** over this turn's renown
 * shares: the family maximising `share ÷ (held + 1)` wins, ties broken by
 * `SPECIALIST_FAMILIES` order. It reads as "your library outweighs your market,
 * so scholars", it is a pure function of the city, and — the reason it is this
 * and not a weighted roll — it consumes **no `Rng`**, so a guild forming costs
 * the world's seeded stream nothing and every other draw in the game lands where
 * it would have landed.
 *
 * Where the phase sits, and why
 * -----------------------------
 * Between `growCities` and `advanceProduction`, and the position is a rules
 * decision like every other entry in `END_OF_TURN_PHASES`. After growth, because
 * a citizen born this turn is a citizen the share cap may now allow to convert,
 * and because the conversion has to be measured against the population the town
 * actually ended the turn with. Before production, because a guildsman formed
 * this turn should be seated — and paying — before the next turn's hammers are
 * banked against a stale assignment.
 *
 * It walks `state.cities` in array order (founding order), which is every other
 * sweep's order, and it does not skip the wild: the barbarian seat holds no
 * cities, so the loop simply never reaches one.
 */

import { explainCityRenown } from './renown';
import { refreshCityDerived, workableSeats } from './cities';
import { SPECIALIST_FAMILIES, type SpecialistFamily } from './greatPeopleData';
import { RULES } from './rulesData';
import { canFormGuild, guildThreshold, totalSpecialists } from './specialists';
import { type City, type GameState, hasEndedTurn } from './state';
import type { TurnReport } from './turn';

const GUILDS = RULES.cities.guilds;

/**
 * A guild formed. One entry per conversion, in the sweep's own order.
 *
 * `disbanded`'s and `starved`'s sibling, and a **difference** for their reason
 * exactly: by the time the resolution returns the citizen has already moved, the
 * assignment has already been rewritten, and no diff of two boards can say
 * whether a town works one hex fewer because a guild formed or because a rival's
 * culture took the tile.
 *
 * `count` is the town's total in that family *after* the conversion, which is
 * what lets the interface keep its promise to announce a city's **first** guild
 * and then never again: the once-rule is `count === 1` on the report, not a flag
 * somebody has to remember to clear.
 */
export interface GuildReport {
  cityId: number;
  ownerId: number;
  family: SpecialistFamily;
  count: number;
}

/**
 * One line of what fills a town's guild bar this turn — hard rule 5 for the bar,
 * so the hover card prints the reason beside the figure and the phase banks the
 * fold of exactly what it printed.
 */
export interface GuildInflowLine {
  source: string;
  amount: number;
}

/**
 * Everything filling this town's guild bar this turn, as the ordered list the
 * inflow is the fold of.
 *
 * Four kinds of line, in the order a player would say them:
 *
 *   1. the **buildings**, one line each, asked of `explainCityRenown` so that
 *      the bar and the empire's renown pool can never disagree about what a
 *      library is worth — and filtered to the four specialist families, because
 *      a barracks makes generals and generals are not townsmen;
 *   2. the **trickle**, one line, if the town has any guilds to pay it;
 *   3. the **crowd**, one line, always — every town of every size fills a little
 *      of its bar just by being full of people (the user's amendment of
 *      2026-08-29);
 *   4. the **idle**, one line, only in a town with citizens it cannot seat — the
 *      backstop, and worth twenty times the crowd per head. See
 *      `guildIdleLine`.
 *
 * Fractional by design: `trickle` and `popWeight` are both fractions, the bar
 * carries its remainder like a food basket, and nothing here is floored. The
 * *threshold* is the whole number, and comparing a running total against it is
 * the only rounding this system does.
 */
export function explainGuildInflow(state: GameState, city: City): GuildInflowLine[] {
  const lines: GuildInflowLine[] = [];
  for (const line of explainCityRenown(city)) {
    if (line.family === null || line.family === 'general') continue;
    lines.push({ source: line.source, amount: line.amount });
  }
  const held = totalSpecialists(city);
  if (held > 0 && GUILDS.trickle !== 0) {
    lines.push({ source: 'Guilds', amount: GUILDS.trickle * held });
  }
  if (GUILDS.popWeight !== 0) {
    lines.push({ source: 'Townspeople', amount: GUILDS.popWeight * city.population });
  }
  const idle = guildIdleLine(state, city);
  if (idle) lines.push(idle);
  return lines;
}

/**
 * How many of this town's people have **nowhere to stand**: its citizens, less
 * the ones already in a trade, less the hexes it could seat them on.
 *
 * The user's backstop of 2026-08-29, and the sentence behind it is the whole
 * reason the guild system exists — *"idle workers mean the city has no workable
 * tiles remaining"*. A town hemmed in by a neighbour's borders on every side has
 * citizens producing nothing at all, and the honest answer is not to make them
 * wait out the ordinary curve: it is to hurry the trades along by a great deal
 * and to stop counting the share while it lasts.
 *
 * Asked of `workableSeats`, which is the length of the very list the assignment
 * chooses from, so "idle" here means exactly what it means on the panel above.
 */
export function idleCitizens(state: GameState, city: City): number {
  return Math.max(0, city.population - totalSpecialists(city) - workableSeats(state, city));
}

/**
 * The idle line of the inflow, or `null` when nobody is idle — which is every
 * town for most of a game.
 *
 * Its own function because it has **two readers**: the fold the phase banks, and
 * the panel's hover, which prints it as a line of its own ("2 idle · +6 a
 * turn"). A hover that recomputed `idleWeight × idle` beside the list would be a
 * second answer to a question the list already answers.
 */
export function guildIdleLine(state: GameState, city: City): GuildInflowLine | null {
  const idle = idleCitizens(state, city);
  if (idle <= 0 || GUILDS.idleWeight === 0) return null;
  return { source: `${idle} idle`, amount: GUILDS.idleWeight * idle };
}

/** The fold of an inflow list. What the phase banks. The only sum of one. */
export function foldGuildInflow(lines: readonly GuildInflowLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/**
 * What this town adds to its guild bar this turn — the fold of
 * `explainGuildInflow`, and the figure the panel's hover card quotes beside the
 * bar so the two can never name different numbers.
 */
export function cityGuildInflow(state: GameState, city: City): number {
  return foldGuildInflow(explainGuildInflow(state, city));
}

/**
 * This turn's renown share per specialist family: what the town's **buildings**
 * earned, family by family.
 *
 * The apportionment's input, and deliberately *not* the whole inflow. The
 * trickle and the crowd are quantities with no family attached — a townsman is
 * not a scholar until a library says so — and folding them in would mean a city
 * with one barracks and twelve citizens eventually apportioning a guildsman to
 * whichever family happened to sort first. The share is the *reason*, the inflow
 * is the *rate*, and only the reason may name a family.
 */
export function guildShares(city: City): Record<SpecialistFamily, number> {
  const shares = {} as Record<SpecialistFamily, number>;
  for (const family of SPECIALIST_FAMILIES) shares[family] = 0;
  for (const line of explainCityRenown(city)) {
    if (line.family === null || line.family === 'general') continue;
    shares[line.family] += line.amount;
  }
  return shares;
}

/**
 * Which family the next guildsman joins, or `null` when no family has a claim.
 *
 * **D'Hondt**: the family maximising `share ÷ (held + 1)`, compared by
 * cross-multiplication (`a.share × (b.held + 1) > b.share × (a.held + 1)`) so
 * that no division is done and no float decides a tie. Ties go to the earlier
 * family in `SPECIALIST_FAMILIES`, which is the fixed order written down for
 * exactly this.
 *
 * `null` when every share is zero, and that is the gate the ruling names: a town
 * with no renown building in any specialist family never converts, however full
 * its bar. Pure — no `Rng`, no board.
 */
export function nextGuildFamily(city: City): SpecialistFamily | null {
  const shares = guildShares(city);
  let best: SpecialistFamily | null = null;
  for (const family of SPECIALIST_FAMILIES) {
    const share = shares[family];
    if (share <= 0) continue;
    if (best === null) {
      best = family;
      continue;
    }
    const held = city.specialists[family] ?? 0;
    const bestHeld = city.specialists[best] ?? 0;
    // `share / (held + 1) > shares[best] / (bestHeld + 1)`, multiplied out. A
    // strict `>` is what makes the tie-break the loop's own order.
    if (share * (bestHeld + 1) > shares[best] * (held + 1)) best = family;
  }
  return best;
}

// --- the verb ---------------------------------------------------------------

/**
 * Why this seat may not send a guildsman back to the fields, or `null`.
 *
 * **The one gate**, asked by the reducer and by the control the panel greys, so
 * a Dismiss button is disabled exactly when the command would be refused and the
 * sentence a player hovers is the sentence the reducer would have returned. The
 * refusals are the three a command of this shape always has — not yours, not
 * there, and your turn is over — and nothing else: dismissing is the ruling's
 * one verb and it is deliberately always available for the starving-city case it
 * was written for.
 */
export function dismissSpecialistError(
  state: GameState,
  playerId: number,
  city: City,
  family: SpecialistFamily,
): string | null {
  if (city.ownerId !== playerId) return `${city.name} does not belong to you`;
  if (hasEndedTurn(state, playerId)) return `You have ended turn ${state.turn}`;
  const held = city.specialists[family] ?? 0;
  if (held <= 0) return `${city.name} has no ${family} to dismiss`;
  return null;
}

/**
 * Sends one guildsman back to the land, and **restarts the bar**.
 *
 * The restart is the price of the verb and it is the ruling's own word: a town
 * that could dismiss a specialist and re-form it a turn later would have found a
 * way to *choose* a family, which is the one thing this system does not offer.
 * Emptying the bank makes the verb what it is meant to be — an answer to a
 * famine, not a dial — and it is why nothing else in the game ever writes
 * `guildBasket` to zero.
 *
 * The mechanism rather than the handler, for `buildImprovementAt`'s stated
 * reason: an AI that dismisses a guildsman owes the refresh too, and nobody
 * should have to remember to add it. **Register entry 17** — see
 * `refreshCityDerived`: a citizen returning to the fields is a seat to fill, and
 * the panel would otherwise quote the assignment from before they walked back.
 */
export function dismissSpecialistAt(
  state: GameState,
  city: City,
  family: SpecialistFamily,
): void {
  city.specialists[family] = Math.max(0, (city.specialists[family] ?? 0) - 1);
  city.guildBasket = 0;
  refreshCityDerived(state, city);
}

// --- the phase --------------------------------------------------------------

/**
 * The phase. Every city banks its inflow, then converts while the bar covers the
 * price and all three gates allow it.
 *
 * The loop is `settleGrowthWindfall`'s and `settleRenownWindfall`'s: it repeats,
 * because one turn's inflow can in principle cover two thresholds and a payment
 * that paid only the first would leave the town owed a guild it earned. In
 * practice it converts at most once for any tuned table — the threshold after
 * the first is far above one turn's bank — which is exactly the property that
 * makes the loop safe rather than the thing that makes it necessary.
 *
 * `refreshCityDerived` is called **once per converted city** rather than once
 * per conversion, and only when something converted: the assignment is the one
 * piece of derived state a specialist changes, it is idempotent, and running it
 * twice for a double conversion would be one wasted sweep of the work radius.
 */
export function runGuilds(state: GameState, report?: TurnReport): void {
  for (const city of state.cities) {
    city.guildBasket += cityGuildInflow(state, city);

    let converted = false;
    for (;;) {
      const threshold = guildThreshold(city);
      if (city.guildBasket < threshold) break;
      // Re-asked each pass rather than hoisted: a conversion changes both the
      // specialist count and the idle count, so a second one this turn is judged
      // by the town the first one left behind.
      if (!canFormGuild(city, idleCitizens(state, city))) break;
      const family = nextGuildFamily(city);
      // No family has a claim: the bar keeps its bank and waits for a building
      // to name a trade. See the module docblock's first gate.
      if (family === null) break;
      city.guildBasket -= threshold;
      city.specialists[family] = (city.specialists[family] ?? 0) + 1;
      converted = true;
      report?.guilds.push({
        cityId: city.id,
        ownerId: city.ownerId,
        family,
        count: city.specialists[family],
      });
    }

    // A citizen left the fields, so the town has one fewer seat to fill — the
    // stale-yields register's own helper, for the reason every other entry in it
    // calls this one (`refreshCityDerived`).
    if (converted) refreshCityDerived(state, city);
  }
}
