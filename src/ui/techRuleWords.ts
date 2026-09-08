/**
 * What a technology's own **rules** say, in the words a first-time player can
 * read — one rule per line, with the figures in them.
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
 * The rule, not the paragraph
 * ---------------------------
 * The playtest of 2026-09-03 made `TechDef.note` win over `describeCard`, and
 * batch L1 (`docs/audit/legibility.md` §2, the user's ruling of 2026-09-08)
 * **reverses that half**: a note is hard rule 7's own field — player prose, no
 * identifiers and *no numbers* — so preferring it meant the star chart printed
 * "every city joined to your capital pays one more gold" where a player was
 * asking how much. A bonus prints as a rule, short and numbered, the way a card
 * prints; the note keeps its job as the Compendium's prose paragraph beneath the
 * rules (`techRuleNote`), where there is room for the reason as well.
 *
 * The other half of the 2026-09-03 ruling **stands**: one sentence per line, on
 * both surfaces, because Daughter Cities overflowed its card as a run-on.
 *
 * A rule that does not fit gets a name
 * ------------------------------------
 * Four clauses of rules do not fit a node on the chart, and truncating one is
 * worse than not printing it. So a node whose rules run past the bar
 * (`RULE_CLAUSE_BAR` clauses, or `RULE_CHARACTER_BAR` characters over all of
 * them) prints **one named rule** instead — a keyword ref, `[[rule:<techId>|The
 * Imperial Post]]` — and the Compendium's **Rules** shelf carries the whole of
 * it under that anchor. The name is the technology's own unless the row gives a
 * `ruleName`; no row does today.
 *
 * Refs are kept, not stripped: the named rule *is* a ref, and every surface that
 * prints one of these clauses goes through `setDescriptorText` — which is the
 * rule for every describer's output anyway. This module **composes and prints
 * nothing** (`greatPersonFace.ts`'s role one system over): the only place it
 * takes a mark off is `techRuleIsNamed`, which measures a sentence's length and
 * must not count four brackets and an id a reader never sees.
 */

import { type TechId, techDef } from '../sim/techData';
import { describeCard, ref, stripRefs } from '../sim/statecraft';

/**
 * The two halves of the bar a node's rules must fit inside on the star chart.
 *
 * **Two clauses** is the count the node card was laid out for — one line each,
 * under the gifts — and **ninety-six characters** is two lines of about
 * forty-eight, which is what the card's column holds. Both halves are measured
 * against the five nodes the audit named (`docs/audit/legibility.md` §2), and
 * they are exactly the five that go over: The Imperial Post (four clauses, 270
 * characters), The Examination Hall (three), Epic Poetry (whose deferred half
 * alone runs to a hundred and fifty-nine), The Silk Road (111) and Movable Type
 * (117). The two-clause nodes that fit stay under it — State Workforce and
 * Guildhalls at sixty, Daughter Cities at seventy-five.
 *
 * A figure rather than a measured wrap because this module has no DOM and must
 * answer the same way for the book, which has no card to overflow: one bar, one
 * answer, both surfaces.
 */
export const RULE_CLAUSE_BAR = 2;
export const RULE_CHARACTER_BAR = 96;

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
 * The whole of a node's generated rules, one clause each — what the Rules shelf
 * prints, and what the bar is measured against.
 *
 * `describeCard` answers for a technology because a technology **is** a card
 * (`anyCardDef`'s ninth class), so these are the same sentences an Order's face
 * is built out of, in the same vocabulary, with the same keyword marks in them.
 * A node's deferred halves come across too — they are half of what Epic Poetry
 * *is*, and the audit counted one of them against the bar.
 */
export function techRuleFullClauses(id: TechId): string[] {
  return describeCard(id)
    .map(({ text }) => text)
    .filter((text) => text.length > 0);
}

/** What a node's rule is **called** on the Rules shelf. See `TechDef.ruleName`. */
export function techRuleName(id: TechId): string {
  const def = techDef(id);
  return def.ruleName ?? def.name;
}

/**
 * Do this node's rules run past the bar? See `RULE_CLAUSE_BAR`.
 *
 * Measured on the **plain** reading, because a keyword mark is four brackets and
 * an id a reader never sees — measuring the raw string would have named a rule
 * for carrying links rather than for being long.
 */
export function techRuleIsNamed(id: TechId): boolean {
  const clauses = techRuleFullClauses(id);
  if (clauses.length === 0) return false;
  if (clauses.length > RULE_CLAUSE_BAR) return true;
  const length = clauses.reduce((total, clause) => total + stripRefs(clause).length, 0);
  return length > RULE_CHARACTER_BAR;
}

/**
 * The clauses this node's rules are read as, in order, or an empty list for a
 * node that carries no rules at all.
 *
 * One named rule where they run past the bar, and the rules themselves where
 * they fit. Both surfaces print what this returns and neither decides anything
 * itself — which is the whole point of the module.
 */
export function techRuleClauses(id: TechId): string[] {
  if (!techRuleIsNamed(id)) return techRuleFullClauses(id);
  return [ref('rule', id, techRuleName(id))];
}

/**
 * The node's own paragraph, split at its sentence boundaries — the prose that
 * stands **under** the rules in the book. See `TechDef.note`.
 *
 * Every node that carries one, not only the ones that carry rules: a paragraph
 * about a technology that hands over no rule at all (Iron Working's seams,
 * Theology's second bag of beliefs) is exactly as worth reading, and it had
 * nowhere to be printed until the note stopped being the face.
 */
export function techRuleNote(id: TechId): string[] {
  const note = techDef(id).note;
  if (note === undefined || note.trim().length === 0) return [];
  return sentences(note);
}

/**
 * Every technology that carries rules but **no note of its own**, so the book
 * prints the rules with no paragraph under them.
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

/**
 * Every technology whose rule has a name, in the order the tree lists them —
 * the Rules shelf's own roster.
 */
export function techsWithNamedRules(ids: readonly TechId[]): TechId[] {
  return ids.filter((id) => techRuleIsNamed(id));
}
