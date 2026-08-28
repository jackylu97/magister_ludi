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
 * Authority already prices a city as **one net line** carrying its reason
 * ("Uruk · coastal −1"), so it needs nothing here. Happiness needed one thing,
 * and it is the second fold below — see `foldCityHappiness`.
 *
 * The crowding line stays its own line at either meter. A town's size and the
 * *surcharge* for being over the crowding threshold are two different facts
 * about the same place (`explainHappiness` says so), and a player deciding
 * whether to grow one more citizen is reading exactly that split.
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

// --- a town, netted ---------------------------------------------------------

/**
 * One town, as this fold needs to recognise its lines. The two fields
 * `explainHappiness` writes into a source string, and nothing else.
 */
export interface HappinessTown {
  name: string;
  population: number;
}

/**
 * Happiness with each town's **own** buildings netted into that town's demand
 * line: "Uruk (10) · Funeral Games +3" worth −7, instead of "Uruk · 10
 * citizens" worth −10 with a "Uruk · Funeral Games" +3 floating in supply.
 *
 * The user's ruling (playtest, 2026-08-27): *"funeral games shouldn't appear as
 * a source of happiness, but just be reflected in the overall city values"*. And
 * it is right for a reason worth writing down — every other line in supply is
 * something the **empire** holds (the palace, a luxury, a card), and losing one
 * costs the empire that much wherever it happens. A colosseum is not that: it is
 * a *discount on one town's appetite*, it is lost with that town, and reading it
 * as empire supply makes a player think a second colosseum in the capital would
 * settle a riot in the provinces.
 *
 * Presentation only, and that is the whole discipline here
 * -------------------------------------------------------
 * `explainHappiness` is still the truth, still the one evaluator, and this
 * **never asks it a second question**: the netted line is built out of the two
 * lines the list already contains, in the list's own order, so the sum over the
 * result is the sum over the input, line for line. It is `meterGroups`' bargain
 * one step further in — that one partitions, this one *merges two lines it was
 * handed* — and neither may ever re-derive a figure. Calling
 * `buildingHappiness` here to find out which lines are a building's would be
 * the second implementation this note exists to forbid, so the lines are
 * recognised by the shapes `explainHappiness` writes and by nothing else:
 *
 *   · the demand line is `"<name> · <population> citizens"`, matched **whole**,
 *     because it is the one line whose text this fold can predict exactly;
 *   · a building's line is a `gain` line beginning `"<name> · "` for a town that
 *     has such a demand line. A `gain` line for a town that has none is left
 *     alone, which is the honest answer for a list this did not come from.
 *
 * The merged line keeps the **demand line's place and its `part`**, so a town
 * whose buildings outweigh its appetite reads as a small positive number under
 * *Demand* rather than hopping sides. "How much this town costs me" is the
 * question the section answers, and −7 and +2 are both answers to it.
 *
 * Longest name first, so an empire holding both "Ur" and "Uruk" nets each into
 * its own line. The separator makes that unambiguous already; the sort is the
 * cheap insurance.
 */
export function foldCityHappiness(
  entries: readonly MeterContribution[],
  towns: readonly HappinessTown[],
): MeterContribution[] {
  const ordered = [...towns].sort((a, b) => b.name.length - a.name.length);
  /** The line a town's demand is written as, for the towns that have one. */
  const demandLine = (town: HappinessTown): string =>
    `${town.name} · ${town.population} citizens`;
  /**
   * Which towns have a demand line at all, found **before** anything is folded.
   *
   * Two passes rather than one because `explainHappiness` prints its supply
   * before its demand: a town's colosseum is in the list several lines above
   * the appetite it is being netted into, and a single forward pass would meet
   * the building with nowhere to put it.
   */
  const netted = new Set(
    ordered.filter((town) => entries.some((entry) => entry.source === demandLine(town))),
  );

  /** name → the merged line's index in the output. */
  const demandAt = new Map<string, number>();
  /** name → what its buildings came to, and how each of them read. */
  const gathered = new Map<string, { value: number; notes: string[] }>();
  const out: MeterContribution[] = [];

  for (const entry of entries) {
    const owner =
      entry.part === 'gain'
        ? [...netted].find((town) => entry.source.startsWith(`${town.name} · `))
        : undefined;
    if (owner) {
      // "Funeral Games +3" — the half of the source that is not the town's
      // name, and what it is worth. A player who wants to know why a town is
      // cheaper than its size reads it in the parenthetical.
      const named = entry.source.slice(owner.name.length + 3);
      const bag = gathered.get(owner.name) ?? { value: 0, notes: [] };
      bag.value += entry.value;
      bag.notes.push(`${named} ${entry.value >= 0 ? '+' : '−'}${Math.abs(entry.value)}`);
      gathered.set(owner.name, bag);
      continue;
    }
    const town = [...netted].find((candidate) => entry.source === demandLine(candidate));
    if (town) {
      demandAt.set(town.name, out.length);
      out.push({ ...entry, source: `${town.name} (${town.population})` });
      continue;
    }
    out.push(entry);
  }

  for (const [name, bag] of gathered) {
    const at = demandAt.get(name)!;
    const line = out[at]!;
    out[at] = {
      ...line,
      source: `${line.source} · ${bag.notes.join(' · ')}`,
      value: line.value + bag.value,
    };
  }
  return out;
}
