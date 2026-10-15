/**
 * The words a screen says about a rite: how long a town keeps it, what teaches
 * it, and its clauses as one line.
 *
 * Composed here and printed elsewhere. The Faith sheet's Rites tab
 * (`ritesTab.ts`) carries these strings in its model and draws them through
 * `setDescriptorText`, because a clause may name a thing as a keyword mark; the
 * city screen's rite rows (`riteOptions` in `controls.ts`) take the teacher's
 * name from here too, through `religionScreen.ts`, so both screens name the
 * same teacher. Nothing in this module prints anything, which is why the
 * keyword register (`test/ui/keywords.test.ts`) lists it as a composer.
 */

import { riteTeachingCard, riteTurnsFor } from '../sim/religion';
import { type RiteId, riteDef } from '../sim/religionData';
import type { GameState } from '../sim/state';
import { type CardClause, describeCard } from '../sim/statecraft';
import { orderDef } from '../sim/statecraftData';
import { techDef } from '../sim/techData';

/**
 * How long a rite runs, in words: "Kept for 10 turns", or "Kept for 1 turn".
 *
 * `turns` is the figure for one empire, and the Faith sheet always passes it:
 * `riteTurnsFor`, the same reading `stampRite` stamps, so the extra turns from
 * The Octave or Chichen Itza are printed as well as given. Without it the
 * figure is the row's own `duration`, which describes the table rather than
 * any one empire.
 *
 * `describeCard` cannot say this: a clause is an ordinary `CardEffect` and
 * knows nothing about the rite it hangs on, while how long a rite runs is a
 * fact about the rite.
 *
 * Empty for a withdrawn rite, which has no duration and hangs nothing.
 */
export function riteGrantWords(id: RiteId, turns?: number | null): string {
  const def = riteDef(id);
  if (def.duration === undefined) return '';
  const kept = turns ?? def.duration;
  return `Kept for ${kept} ${kept === 1 ? 'turn' : 'turns'}`;
}

/**
 * What teaches a rite, as the name a rite row prints after "needs" or "Taught
 * by": the Order for a card-taught rite (`riteTeachingCard`), and the
 * technology on the row for every other rite.
 *
 * A card-taught row (`RiteDef.byCard`) still carries a `tech`, but it only
 * dates the rite for the Compendium, so it is never printed as the teacher.
 */
export function riteTeacherName(id: RiteId): string {
  const def = riteDef(id);
  if (def.byCard !== true) return techDef(def.tech).name;
  const card = riteTeachingCard(id);
  return card === null ? 'a card' : `the Order ${orderDef(card).name}`;
}

/**
 * The teacher's own name, without "the Order": "The Fast", "Currency". A greyed
 * rite chip prints this, since a chip has room for a name and not a phrase; its
 * accessible label carries `riteTeacherName`'s whole phrase.
 */
export function riteTeacherShortName(id: RiteId): string {
  const def = riteDef(id);
  if (def.byCard !== true) return techDef(def.tech).name;
  const card = riteTeachingCard(id);
  return card === null ? 'a card' : orderDef(card).name;
}

/** A rite's clauses: `describeCard`'s list, keyword marks and all. */
export function riteClauses(rite: RiteId): CardClause[] {
  return describeCard(rite);
}

/**
 * A rite's clauses as one line, keyword marks kept for the drawing: what a row
 * says it would add for a rite that adds no yield (Blessing of Arms' defence).
 */
export function riteClauseWords(rite: RiteId): string {
  return riteClauses(rite)
    .map((clause) => clause.text)
    .join(' · ');
}

/**
 * A rite's clauses and the turns it would be kept for, as one line: the
 * describer's words and `riteGrantWords` with this empire's figure.
 */
export function riteSays(state: GameState, seat: number, rite: RiteId): string {
  const clauses = riteClauses(rite).map((clause) => clause.text);
  const kept = riteGrantWords(rite, riteTurnsFor(state, seat, rite));
  return [...clauses, kept].filter((part) => part.length > 0).join(' · ');
}
