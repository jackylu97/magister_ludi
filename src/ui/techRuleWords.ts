/**
 * What a technology's own **rules** say, in the words a first-time player can
 * read — one sentence per line.
 *
 * A module of its own for one reason, and it is the reason every describer in
 * this game is a single function: **two surfaces ask this question.** The star
 * chart's hover card asks it (`techTree.ts`) and the Compendium's technology
 * shelf asks it (`compendium.ts`), and a node whose rules read one way on the
 * card and another way in the book is exactly the second vocabulary the
 * Compendium's docblock exists to forbid. Neither surface may import the other
 * — one is a screen, the other is the whole book — so the shared answer lives
 * here.
 *
 * The row's own words, when it has them
 * -------------------------------------
 * `TechDef.note` wins over `describeCard`, and that is the point of this module
 * rather than an optimisation of it (the user, playtest batch: "I'm having
 * trouble understanding what the effects are and I designed the technologies").
 *
 * `describeCard` is a **generated** sentence: it words an effect *shape* out of
 * the vocabulary's own grammar, which is exactly right for a card whose text was
 * written as effects and exactly wrong for a technology whose text was written
 * as a paragraph and then encoded. A node carrying three effects came out as
 * three generated clauses joined end to end, and the reader who had to assemble
 * the rule from them was the person who designed it.
 *
 * A `note` is hard rule 7's own field: player prose, no identifiers, no numbers,
 * written for the row as a whole. So where a row has one, it *is* the rule, and
 * the describer is the fallback for a row that has not been written up yet.
 * Nothing is lost by preferring it — the figures still come off the row
 * everywhere a figure belongs (the card's own cost line, the Compendium's rows),
 * and this is the one place that is prose by design.
 *
 * One sentence per line
 * ---------------------
 * Both surfaces render these as list items, never as a paragraph (the same
 * playtest batch: Daughter Cities overflowed its card as a run-on). A note is
 * split on its own sentence boundaries because that is where its author put the
 * breaks; a describer's clauses are already one rule each and are taken as they
 * come.
 */

import { type TechId, techDef } from '../sim/techData';
import { describeCard, stripRefs } from '../sim/statecraft';

/**
 * A prose note broken at its sentence boundaries, each sentence kept whole.
 *
 * Split on a full stop followed by space, and **only** a full stop: a note in
 * this voice uses semicolons to join clauses that belong in one breath (the
 * survey's "a seam comes up as a resource anyone can see; an empty hill is
 * marked surveyed") and splitting those would break a sentence in half. The
 * terminator rides along with the sentence it ends, so a line still reads as a
 * sentence rather than as a fragment.
 */
function sentences(note: string): string[] {
  return note
    .split(/(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * The clauses this node's rules are read as, in order, or an empty list for a
 * node that carries no rules at all.
 *
 * Refs are stripped: a note is plain prose with no keywords in it, and a
 * describer's `[[kind:id|Name]]` marks are for surfaces that resolve them. Both
 * callers here are printing text, and a raw `[[` on any surface is what the
 * keyword sweep forbids.
 */
export function techRuleClauses(id: TechId): string[] {
  const note = techDef(id).note;
  if (note !== undefined && note.trim().length > 0) return sentences(note);
  return describeCard(id)
    .map((clause) => stripRefs(clause.text))
    .filter((text) => text.length > 0);
}

/**
 * Every technology that carries rules but **no note of its own**, so the
 * fallback above is what a player reads.
 *
 * Exported for the register test rather than for a surface: a row here is not a
 * bug, it is a row somebody still has to write a paragraph for, and the list is
 * how that stays visible instead of being discovered by a player.
 */
export function techsAwaitingRuleNotes(ids: readonly TechId[]): TechId[] {
  return ids.filter((id) => {
    const def = techDef(id);
    if ((def.effects ?? []).length === 0) return false;
    return def.note === undefined || def.note.trim().length === 0;
  });
}
