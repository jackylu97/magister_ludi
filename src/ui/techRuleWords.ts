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
 *
 * Short lines, one form
 * ---------------------
 * Batch TT3 (`docs/flags.md` item (kkkkkkk)) gave every line a technology
 * prints one form: the subject first, then the figure, with no "gain", "may",
 * "now" or full stop. The improvement line of batch TT1 ("Farm +1🌾 on fresh
 * water") is the model. So:
 *
 *   - a rule is `describeTechRules`' short line ("Workers +1 charge"), not the
 *     sentence an Order prints for the same effect;
 *   - an improvement renewal and an ability are worded here, by `renewalNote`
 *     and `abilityNote`, and the hover card and the Compendium both call them.
 *     They moved here from `techTree.ts` so that the book can print the same
 *     words as the card. The node face prints the renewal with the same
 *     composer. An ability's words are its row's `summary`; a verb whose rule
 *     is a game term prints its name alone, as a keyword to that term's page
 *     (`abilityConcept`, Siege).
 */

import { type CardClause, describeTechRules, ref, stripRefs } from '../sim/statecraft';
import { signedYield, yieldShows } from '../sim/yieldFormat';
import { type TechId, abilityDef, isAbilityId, techDef, techRuleEffects } from '../sim/techData';
import type { TechGift } from '../sim/techUnlocks';
import type { TileYield } from '../sim/terrainData';
import { HAMMER, YIELD_GLYPH } from './figures';

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
 * Batch TT1 (`docs/flags.md` (iiiiiii)) cut most of those rules, so no ordinary
 * node runs past the bar today. The bar stays for the next node that does.
 *
 * A figure rather than a measured wrap because this module has no DOM and must
 * answer the same way for the book, which has no card to overflow: one bar, one
 * answer, both surfaces.
 */
const RULE_CLAUSE_BAR = 2;
const RULE_CHARACTER_BAR = 96;

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
 * The whole of a node's rules as short lines, with each line's struck mark —
 * what the Compendium's charter technology page prints in full.
 *
 * `describeTechRules` words them (batch TT3): the vocabulary an Order is
 * described in, said in the tree's short form ("Authority capacity +3"), and
 * with the same keyword marks in it. An effect that opens a building is not
 * here: the tree prints that building as an unlock. A node's deferred halves
 * come across too, and the bar counts them.
 */
export function techRuleLines(id: TechId): CardClause[] {
  return describeTechRules(id).filter(({ text }) => text.length > 0);
}

/**
 * The whole of a node's rules, one line each — what the Rules shelf prints,
 * and what the bar is measured against. `techRuleLines` without the marks.
 */
export function techRuleFullClauses(id: TechId): string[] {
  return techRuleLines(id).map(({ text }) => text);
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
    if (techRuleEffects(id).length === 0) return false;
    return def.note === undefined || def.note.trim().length === 0;
  });
}

// --- the figures beside a renewal and an ability -------------------------------

/**
 * What a tile is paid, written as the delta it is: `+1🌾`.
 *
 * **All six voices**, in the order the city panel lists them, because a
 * hand-written subset of a six-field record drifts the day a seventh row pays
 * a new voice. Every figure goes through `signedYield`, and a voice that rounds
 * to nothing is not printed (`yieldShows`): a delta is exact, a note is whole
 * (batch X, `docs/flags.md` (mmm)).
 */
function tileYieldNote(add: TileYield): string {
  const voices: [number, string][] = [
    [add.food, YIELD_GLYPH.food],
    [add.production, HAMMER],
    [add.gold, YIELD_GLYPH.gold],
    [add.science, YIELD_GLYPH.science],
    [add.culture, YIELD_GLYPH.culture],
    [add.faith, YIELD_GLYPH.faith],
  ];
  return voices
    .filter(([value]) => yieldShows(value))
    .map(([value, glyph]) => `${signedYield(value)}${glyph}`)
    .join(' ');
}

/**
 * What an improvement renewal adds, after the improvement's name: `+1🌾 on fresh
 * water`. The model line of batch TT3. The node face, the hover card, the
 * Compendium and `docs/tech-tree.md` all print it beside the name.
 */
export function renewalNote(gift: TechGift & { kind: 'renewal' }): string {
  const delta = tileYieldNote(gift.add);
  return gift.requiresFreshwater ? `${delta} on fresh water` : delta;
}

/**
 * The Compendium concept page that holds an ability's rule, or `null`.
 *
 * A verb whose row names one (`AbilityDef.concept`, Siege) prints only its
 * name, as a keyword to that page, and no line beside it. The user, 2026-11-11:
 * *"just have it be a keyword 'siege' that's unlocked, that links to a
 * compendium entry"*. A clearing has no row, so it has no page.
 */
export function abilityConcept(gift: TechGift & { kind: 'ability' }): string | null {
  return isAbilityId(gift.id) ? (abilityDef(gift.id).concept ?? null) : null;
}

/**
 * What an ability is worth, after its name. A clearing says what it banks, with
 * `once` on the end, because that word is the whole difference between a chop
 * and a farm. A named verb says its row's `summary` ("Soldiers cross coast and
 * lakes"), and a verb with a concept page says nothing (`abilityConcept`).
 */
export function abilityNote(gift: TechGift & { kind: 'ability' }): string {
  if (gift.pays) return `${tileYieldNote(gift.pays)} once`;
  if (abilityConcept(gift) !== null) return '';
  return isAbilityId(gift.id) ? abilityDef(gift.id).summary : '';
}

/**
 * Every technology whose rule has a name, in the order the tree lists them —
 * the Rules shelf's own roster.
 */
export function techsWithNamedRules(ids: readonly TechId[]): TechId[] {
  return ids.filter((id) => techRuleIsNamed(id));
}
