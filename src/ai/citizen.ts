/**
 * **What a citizen costs, as one line four arms share** — batch X5b of
 * `docs/bot-priorities.md`, and the leaf the ruling on the flags board (item
 * (ggg), 2026-09-08) needs to exist: *"both charge the marginal keep of the
 * citizen they would add — `happinessDemand(pop + 1) − happinessDemand(pop)` at
 * the live price, the same line — read at the town's current population so a
 * focus order does not move its own appraisal."*
 *
 * Four arms of the appraisal weigh a citizen and they may not come to four
 * answers about one town:
 *
 *   · the **settler** gives one away (`explainCitizen`, `bot.ts`);
 *   · the **focus arm** delays one (`growthTerm`, `bot.ts`);
 *   · the **hex purchase** seats one (`tileWants`, `wants.ts`);
 *   · the **expansion chain** creates one, in a town that does not exist yet
 *     (`expansionChain`, `chain.ts`).
 *
 * The last of those is why this is a module rather than a helper beside one of
 * them: `wants.ts` stands on `chain.ts`, so a line both files fold cannot live in
 * either — the same bargain `ground.ts`, `routes.ts` and `dealMemory.ts` make,
 * and CLAUDE.md's own sentence about a helper two modules need. It imports the
 * appraisal for the meter's price and the simulation for the meter's curve, and
 * nothing imports it back.
 */

import { type ValueTerm } from './decision';
import { round } from './decision';
import { type ValueContext, meterWeight, meterWords } from './value';

import { happinessDemand } from '../sim/meters';

/**
 * **What one more citizen asks the empire for its keep**, as one negative term —
 * or `null` when the curve asks for nothing, which is a rule change away rather
 * than a case the table has today.
 *
 * The magnitude is the **marginal** demand: the simulation's own curve asked
 * twice and subtracted, never re-derived, so the linear half is charged flat and
 * the crowding tail is charged only where it actually bites. The price is the
 * one the context already carries — `meterWeight`'s, the very `PricedMeter` a
 * building's `happiness` line is paid at — so a seat riding the band's ceiling
 * charges a citizen three times what a seat at the table's own figure does.
 *
 * **Why `population` is a parameter and never a town.** The four arms disagree
 * about *which* citizen they are talking about and must agree about the figure.
 * What they share is the town's **current** population — `0` for the town the
 * expansion chain is about, which has none yet — and the ruling is that all four
 * read it there: a citizen arrives by growth and never by a command, so no order
 * a seat can give moves the number this charges, and an appraisal that cannot be
 * moved by acting on it cannot flip a town back and forth (`growthTerm`'s
 * standing argument).
 */
export function citizenKeepTerm(ctx: ValueContext, population: number): ValueTerm | null {
  const demand = happinessDemand(population + 1) - happinessDemand(population);
  if (demand <= 0) return null;
  return {
    label: `the contentment one more citizen demands — ${round(demand)} × ${meterWords(ctx, 'happiness')}`,
    value: -demand * meterWeight(ctx, 'happiness'),
  };
}

/**
 * **The keep, switchable arm by arm** — `signDoor`'s twin one batch on
 * (`value.ts`, batch X5), for exactly the reason that one exists: the acceptance
 * bench plays the same eight seeds with each charge shut and open, and a
 * knockout that could not tell the arms apart would attribute none of them.
 *
 * `growth` is the focus arm's (`growthTerm`, `bot.ts`); `hex` is the purchase's
 * (`tileWants`, `wants.ts`); `town` is the expansion chain's — the demand the
 * town a settler founds would create, which is the half that answers the
 * settler's own relief. It is **not** a knob — not in `data/ai.json`, no persona
 * reads it, no surface offers it — and all three ship open. Shut, each arm reads
 * precisely what it read before X5b: a citizen as pure ground, and a founding
 * charged only where it over-spends the meter outright.
 */
export const keepDoor = { growth: true, hex: true, town: true };
