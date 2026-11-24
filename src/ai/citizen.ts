/**
 * Growth, founding and settlers share the cost of adding or removing a citizen.
 * Tile purchases do not use this cost because they leave population unchanged.
 */

import { type ValueTerm } from './decision';
import { round } from './decision';
import type { ValueContext } from './value';
import { meterWeight, meterWords } from './prices';

import { happinessDemand } from '../sim/meters';

/**
 * **What one more citizen asks the empire for its keep**, as one negative term —
 * or `null` when the curve asks for nothing, which is a rule change away rather
 * than a case the table has today.
 *
 * The magnitude is the **marginal** demand: the simulation's own curve asked
 * twice and subtracted, never re-derived — flat today, since a town's demand is
 * linear in its citizens (2026-09-09, `docs/flags.md` item (kkk)), and still
 * asked twice so the day the curve bends again this bends with it. The price is
 * the
 * one the context already carries — `meterWeight`'s, the very `PricedMeter` a
 * building's `happiness` line is paid at — so a seat riding the band's ceiling
 * charges a citizen three times what a seat at the table's own figure does.
 *
 * **Why `population` is a parameter and never a town.** The callers disagree
 * about *which* citizen they are talking about and must agree about the figure.
 * What they share is the town's **current** population — `0` for the town the
 * expansion chain is about, which has none yet — and the ruling is that all callers
 * read it there: a citizen arrives by growth and never by a command, so no order
 * a seat can give moves the number this charges, and an appraisal that cannot be
 * moved by acting on it cannot flip a town back and forth (`growthTerm`'s
 * standing argument).
 */
export function citizenKeepTerm(ctx: ValueContext, population: number): ValueTerm | null {
  const demand = happinessDemand(population + 1) - happinessDemand(population);
  if (demand <= 0) return null;
  return {
    label: `the happiness one more citizen demands — ${round(demand)} × ${meterWords(ctx, 'happiness')}`,
    value: -demand * meterWeight(ctx, 'happiness'),
  };
}
