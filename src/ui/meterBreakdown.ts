/**
 * A meter's ledger, grouped into the two sides it is the difference of.
 *
 * `explainHappiness` and `explainAuthority` return one flat, ordered list of
 * signed lines (`src/sim/meters.ts`), which is exactly the right shape for the
 * click-through card: every line, in the order the rules produced them, folding
 * to the headline figure. It is the wrong shape for a *hover*, where the
 * question is not "show me everything" but "where is this number coming from" —
 * and the answer to that is the same shape both meters have by definition:
 *
 *   happiness = supply − demand
 *   authority = capacity − used
 *
 * So the grouping is a *partition by `part`*, not a re-derivation: every line
 * goes into exactly one group, nothing is merged, nothing is dropped, and the
 * sum over the groups is the sum over the list. That is the whole of what makes
 * this safe under rule 5 — a card that recomputed a subtotal from anything other
 * than the lines it prints would be a second implementation of the meter, which
 * is the one thing `meters.ts` exists to prevent. `test/ui/meterBreakdown.test.ts`
 * pins the fold.
 *
 * The words are the ones `meters.ts` uses of itself, rather than a second
 * vocabulary invented at the surface: a player who reads "demand" here and finds
 * "demand" in the ledger is reading one game.
 *
 * Per-city lines need no work at either meter, which is why there is no city
 * grouping here. Authority already prices a city as **one net line** carrying
 * its reason ("Uruk · coastal −1"), and happiness deliberately splits a town
 * into its size and the price of that size ("Ur · 11 citizens", "Ur crowding")
 * because those are two different facts about the same place — see
 * `explainHappiness`. Folding them together in the interface would be the
 * surface disagreeing with the rules about what a line is.
 */

import type { MeterContribution, MeterId, MeterPart } from '../sim/meters';

/** One side of a meter: what it is called, what it comes to, and its lines. */
export interface MeterGroup {
  label: string;
  /** The signed sum of this group's lines, and nothing but. */
  total: number;
  lines: MeterContribution[];
}

/**
 * How each meter names its two sides. Beside the union it groups so that a third
 * meter cannot quietly fall back on "gain" and "cost", which are words about a
 * *ledger* rather than about the thing being measured.
 */
const PART_LABEL: Record<MeterId, Record<MeterPart, string>> = {
  happiness: { gain: 'Supply', cost: 'Demand' },
  authority: { gain: 'Capacity', cost: 'Used' },
};

/**
 * The ledger as its two sides, in the order the list produced them — which is
 * supply before demand for both meters, because that is the order the sentence
 * is read in.
 *
 * A side with no lines at all is not a group: an empire with no luxuries and no
 * palace has nothing to say about supply, and an empty heading over an empty
 * list is furniture. A line worth zero *is* kept, because `MeterContribution`
 * carries `part` precisely so the capital's free ride can be said out loud.
 */
export function meterGroups(
  meter: MeterId,
  entries: readonly MeterContribution[],
): MeterGroup[] {
  const groups: MeterGroup[] = [];
  const byPart = new Map<MeterPart, MeterGroup>();
  for (const entry of entries) {
    let group = byPart.get(entry.part);
    if (!group) {
      group = { label: PART_LABEL[meter][entry.part], total: 0, lines: [] };
      byPart.set(entry.part, group);
      groups.push(group);
    }
    group.lines.push(entry);
    group.total += entry.value;
  }
  return groups;
}
