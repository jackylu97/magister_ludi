/**
 * Why something cannot be done, said on the screen and said once per reason.
 *
 * Who uses it:
 *   - the city screen's add list (batch UX5). When several rows of a shelf are
 *     refused for the same reason, the reason is one line at the head of the
 *     shelf and those rows show a dash in the price column. A reason only one
 *     row has is a short line under that row.
 *   - the city screen's work rail, for a command the reducer refused.
 *   - the faith screen's rites and the HUD when they are rebuilt (batches UX3
 *     and UX9 to UX11 in `docs/plans/hud-ux-decisions.md`, "Shared
 *     components").
 *
 * The words are always the simulation's. A surface hands in the gate's own
 * sentence (`purchaseError`, `buildError`, a command's `error`) and this module
 * decides only where it is said. It never reads a sentence to work out what the
 * refusal meant; the one change it makes to a sentence is described at
 * `planRefusals`.
 *
 * A refusal is never only in a native `title` tooltip: those take a second to
 * appear, cannot be styled, and do not exist on touch or for keyboard focus
 * (`docs/plans/city-screen-audit.md`, problem 1).
 *
 * Every line wears the wanting voice (`.wanting`, the vermilion italic every
 * "you have not got X" wears, `test/ui/wantingVoice.test.ts`): each one is a
 * refusal, and a refusal is the one thing that voice is for.
 */

import { element } from './dom';
import { setYieldText } from './yieldMark';

/** One refused thing: a key the caller knows it by, its name, and the gate's sentence. */
export interface RefusalEntry<K> {
  key: K;
  /** The name the gate's sentence uses for it ("The Oracle", "Settler"). */
  name: string;
  refusal: string;
}

/**
 * Where one entry's reason is said: in a line at the head of the group, with
 * the marker that ties the entry to that line when the head has more than one,
 * or on a line of its own under the entry's row.
 */
export type RefusalPlace =
  | { at: 'head'; mark: string | null }
  | { at: 'row'; text: string };

/** One line at the head of a group. `mark` is null when the head has only one line. */
export interface RefusalHeadLine {
  text: string;
  mark: string | null;
}

export interface RefusalPlan<K> {
  /** The shared reasons, in the order their first entry was given. */
  head: RefusalHeadLine[];
  /** Where each entry's reason is said. Every entry given has a place. */
  places: Map<K, RefusalPlace>;
}

/**
 * The words that stand in for a row's own name when one line speaks for several
 * rows: "The Oracle is a wonder — …" becomes "Each of these is a wonder — …".
 */
export const SHARED_SUBJECT = 'Each of these';

/**
 * Sorts refusals into the ones said once at the head and the ones said under
 * their own row.
 *
 * Two passes, and only the second changes any words:
 *
 *   1. Entries whose sentences are identical share a reason. Two or more of
 *      them make one head line, the sentence exactly as the gate wrote it ("A
 *      Swordsman already stands in Aldermarch — move it first").
 *   2. Of what is left, entries whose sentences differ only in the row's own
 *      name at the start also share a reason: every wonder is refused with
 *      "<its name> is a wonder — it must be built, not bought", and printing
 *      that once per wonder was the repetition the city audit complained about.
 *      Two or more of them make one head line with the name replaced by
 *      `SHARED_SUBJECT`. The rest of the sentence is the gate's own.
 *
 * Whatever is still alone is said under its own row, exactly as the gate wrote
 * it.
 *
 * When the head has two or more lines, each is numbered and each entry under
 * it carries the same number, so a dash in the price column can be matched to
 * its reason. With one head line there is nothing to match and no numbers.
 *
 * Pure, for the reason `levyMenuModel` is: the suite has no document, and which
 * reason is said where is the part of the screen that can be quietly wrong.
 */
export function planRefusals<K>(entries: readonly RefusalEntry<K>[]): RefusalPlan<K> {
  interface Group {
    first: number;
    text: string;
    members: number[];
  }
  const groups: Group[] = [];
  const alone: number[] = [];

  const exact = new Map<string, number[]>();
  entries.forEach((entry, index) => {
    const members = exact.get(entry.refusal);
    if (members === undefined) exact.set(entry.refusal, [index]);
    else members.push(index);
  });
  for (const [text, members] of exact) {
    if (members.length > 1) groups.push({ first: members[0]!, text, members });
    else alone.push(members[0]!);
  }

  const byPredicate = new Map<string, number[]>();
  const left: number[] = [];
  for (const index of alone) {
    const predicate = namedPredicate(entries[index]!);
    if (predicate === null) {
      left.push(index);
      continue;
    }
    const members = byPredicate.get(predicate);
    if (members === undefined) byPredicate.set(predicate, [index]);
    else members.push(index);
  }
  for (const [predicate, members] of byPredicate) {
    if (members.length > 1) {
      members.sort((a, b) => a - b);
      groups.push({ first: members[0]!, text: `${SHARED_SUBJECT} ${predicate}`, members });
    } else {
      left.push(members[0]!);
    }
  }

  groups.sort((a, b) => a.first - b.first);
  const numbered = groups.length > 1;
  const head: RefusalHeadLine[] = [];
  const places = new Map<K, RefusalPlace>();
  groups.forEach((group, at) => {
    const mark = numbered ? String(at + 1) : null;
    head.push({ text: group.text, mark });
    for (const index of group.members) places.set(entries[index]!.key, { at: 'head', mark });
  });
  for (const index of left) {
    const entry = entries[index]!;
    places.set(entry.key, { at: 'row', text: entry.refusal });
  }
  return { head, places };
}

/**
 * The rest of a sentence that opens with the entry's own name, or `null` when
 * it does not open with it. "The Oracle is a wonder" with the name "The Oracle"
 * gives "is a wonder".
 */
function namedPredicate<K>(entry: RefusalEntry<K>): string | null {
  const opening = `${entry.name} `;
  if (entry.name === '' || !entry.refusal.startsWith(opening)) return null;
  const rest = entry.refusal.slice(opening.length);
  return rest === '' ? null : rest;
}

/**
 * Where a line stands, which sets its layout:
 *   - `head`: at the head of a group of rows, before the rows it speaks for;
 *   - `row`: under the one row it speaks for, indented to sit with it;
 *   - `command`: a command the reducer refused just now, at the top of the
 *     panel it was sent from, and announced to a screen reader as it appears.
 */
export type RefusalWhere = 'head' | 'row' | 'command';

/**
 * One refusal as a line. `mark` is the head line's number, when it has one
 * (`planRefusals`). The text is printed through `setYieldText`, so a sentence
 * that names a price with its yield mark draws the mark.
 */
export function refusalLineElement(
  text: string,
  where: RefusalWhere,
  mark: string | null = null,
): HTMLElement {
  const line = element('p', `refusal-line is-${where} wanting`);
  if (where === 'command') line.setAttribute('role', 'alert');
  if (mark !== null) line.append(refusalMarkElement(mark));
  const words = element('span', 'refusal-line-text');
  setYieldText(words, text);
  line.append(words);
  return line;
}

/**
 * The small number that ties a head line to the rows it speaks for. The same
 * element on both ends, so the two always look alike. Hidden from a screen
 * reader, which reads each row's own reason instead (`priceCell.ts`).
 */
export function refusalMarkElement(mark: string): HTMLElement {
  const sup = element('sup', 'refusal-mark', mark);
  sup.setAttribute('aria-hidden', 'true');
  return sup;
}
