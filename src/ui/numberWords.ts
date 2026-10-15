/**
 * Numbers and lists in words, for sentences a player reads.
 *
 * A sentence a player reads carries no digits (hard rule 7). When a sentence has
 * to state a figure that data holds — how many beads open the Magnum Opus, what
 * a kept wager pays, which drafts deal a reward hand — it reads the figure from
 * data and writes it in words with these helpers. The sentence then stays free
 * of digits and still follows the data when it is retuned.
 *
 * These lived in two places before (`tutorial.ts` had the cardinal, and
 * `rewardSheet.ts` the ordinal and the list join). They are one module so that
 * every surface spells a number the same way. The module imports nothing, so
 * `tutorial.ts`, which may not import from `src/sim/`, can use it.
 */

const UNDER_TWENTY = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];

const ORDINALS_UNDER_TWENTY = [
  '', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth',
  'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth',
  'seventeenth', 'eighteenth', 'nineteenth',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/**
 * A whole number in words: "seven", "twenty", "twenty-one".
 *
 * Covers zero to ninety-nine. Anything else comes back as digits, so a test that
 * refuses digits in the copy fails and names the line, rather than the sentence
 * quietly printing a wrong word.
 */
export function numberWords(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 99) return String(value);
  if (value < 20) return UNDER_TWENTY[value]!;
  const tens = TENS[Math.floor(value / 10)]!;
  const units = value % 10;
  return units === 0 ? tens : `${tens}-${UNDER_TWENTY[units]!}`;
}

/**
 * An ordinal in words, from "first" to "ninety-ninth".
 *
 * The reward sheet says "the fourth draft" rather than "the 4th draft". A number
 * outside one to ninety-nine comes back as digits, for the same reason as
 * `numberWords`.
 */
export function ordinalInWords(position: number): string {
  if (!Number.isInteger(position) || position < 1 || position > 99) return String(position);
  if (position < 20) return ORDINALS_UNDER_TWENTY[position]!;
  const tens = TENS[Math.floor(position / 10)]!;
  const units = position % 10;
  // "twenty" becomes "twentieth"; "twenty" and "ninth" become "twenty-ninth".
  return units === 0 ? `${tens.slice(0, -1)}ieth` : `${tens}-${ORDINALS_UNDER_TWENTY[units]!}`;
}

/** "A", "A and B", "A, B and C": commas, with "and" before the last item. */
export function listWords(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]!}`;
}
