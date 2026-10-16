/**
 * Numbers and lists in words, for sentences a player reads.
 *
 * A sentence a player reads carries no digits (hard rule 7). When a sentence has
 * to state a figure that data holds — how many beads open the Magnum Opus, what
 * a kept wager pays — it reads the figure from data and writes it in words with
 * this helper. The sentence then stays free of digits and still follows the
 * data when it is retuned.
 *
 * The cardinal lived in `tutorial.ts` before; it is one module so that every
 * surface spells a number the same way. The ordinal and the list join that the
 * reward sheet used went with it in batch C3. The module imports nothing, so
 * `tutorial.ts`, which may not import from `src/sim/`, can use it.
 */

const UNDER_TWENTY = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
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
