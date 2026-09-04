/**
 * How a great person is **drawn as a card**, in one place.
 *
 * Three surfaces now print the same face — the draft that offers a name
 * (`main.ts`), the ceremony that spends them (`greatPersonCeremony.ts`) and the
 * Reliquary that keeps them (`reliquaryScreen.ts`) — and a great person is one
 * card whichever of the three is looking at it. The three tables below used to
 * be locals inside `main.ts`'s boot closure, which was fine while the offer was
 * the only surface and became the usual quiet problem the moment it was not: a
 * second screen would have had to write the accent, the emblem and the tier
 * mark out again, and two copies of "what colour is a defining person" are two
 * answers the day either is touched.
 *
 * Strings and numbers, never a node
 * ---------------------------------
 * Everything here is pure — `offerCard.ts`'s boundary rule read one module over,
 * and here it buys the same thing it buys there plus one more: this suite has no
 * jsdom, so what a face *says* is testable and only the `append` calls are not.
 * The two screens own their own DOM; this owns what goes in it.
 */

import { type CardClause, describeCard } from '../sim/statecraft';
import { type Family, type GreatPersonId, type GreatPersonTier, greatPersonDef } from '../sim/greatPeopleData';
import { type StampReading, stampIsEmpty, stampReading } from './cardStamp';
import { cardLineMarkUrl } from './cardLine';
import { eraWord } from './figures';
import { explainCardImpact } from '../sim/cardImpact';
import { improvementDef, workForFamily } from '../sim/improvementData';
import type { CardLine } from '../sim/statecraftData';
import type { GameState } from '../sim/state';

/**
 * The three tiers, as the accent keys `style.css` resolves.
 *
 * Reused from the Statecraft deck's own eight rather than added beside them,
 * because the three gradings *are* the deck's own philosophy read one class
 * over (`docs/deprecated/statecraft-cards.md`, applied to people by the
 * 2026-08-27 ruling) and a fourth palette would be the interface claiming they
 * are a different kind of thing:
 *
 *   defining     the Wild Hunt's oxblood — blood, and the malice that comes
 *                with a game-defining card;
 *   strong       the Long Caravan's gilt — money, and the card that is never
 *                the wrong pick;
 *   situational  the Wayfarers' verdigris — distance, and the card that is
 *                great for one map and harmless otherwise.
 */
export const TIER_ACCENT: Record<GreatPersonTier, CardLine> = {
  defining: 'hunt',
  strong: 'caravan',
  situational: 'wayfarers',
};

/** What the accent *is*, in words. The card's `title`, as for a line. */
export const TIER_NAME: Record<GreatPersonTier, string> = {
  defining: 'Game-defining — and it costs you something',
  strong: 'Strong, and never the wrong pick',
  situational: 'Situational, and harmless otherwise',
};

/**
 * The tier's mark, and it is `docs/great-people.md`'s own three glyphs — the
 * worksheet was written with them, so a screen that invented a fourth notation
 * would be a screen disagreeing with the document it implements.
 *
 * Drawn only where a card stands **alone** (the ceremony, the Reliquary). The
 * draft spreads three faces side by side and answers the same question with the
 * accent, which is the louder channel and the right one when the tiers are being
 * compared rather than read.
 */
export const TIER_MARK: Record<GreatPersonTier, string> = {
  defining: '●',
  strong: '◆',
  situational: '○',
};

/**
 * The emblem each family wears: the Statecraft line whose drawing already
 * means what the family means.
 *
 * A borrowing rather than five new marks, and the marks are borrowed for what
 * they *depict* rather than for the thread they belong to — the star for a
 * scholar, the candle for an artist, the anvil for an engineer, the road for a
 * merchant, the bow for a general (see `src/art/lineMarks.ts`'s notes). The
 * accent on the card is the tier, so nothing here is claiming a great person
 * joins an archetype line; it is one picture, chosen because it is the right
 * picture.
 */
export const FAMILY_EMBLEM: Record<Family, CardLine> = {
  scholar: 'star',
  artist: 'procession',
  engineer: 'forge',
  merchant: 'caravan',
  general: 'hunt',
};

/**
 * The word that opens a permanent clause, and the reason the ceremony reads the
 * way it does (the inversion, 2026-09-03): the legacy is the identity, the deed
 * is the footnote, and the sentence has to say so before the number lands.
 */
export const FOREVER = 'Forever:';

/**
 * The legacy as a headline: `describeCard`'s own clauses with `Forever:` on the
 * first of them.
 *
 * The **first** and no other, so a two-clause legacy reads as one promise with
 * two halves rather than as two promises. The word is prefixed to the text
 * rather than drawn as a separate label because the clause goes through
 * `setDescriptorText` whole — a label beside it would be a second element the
 * keyword sweep would have to be told about.
 *
 * A **deferred** half keeps its mark and is never given the word: a promise the
 * build has not made is not forever, it is not yet.
 */
export function legacyHeadline(clauses: readonly CardClause[]): CardClause[] {
  const list: CardClause[] = [];
  let said = false;
  for (const clause of clauses) {
    if (clause.deferred === true) {
      list.push({ text: clause.text, deferred: true });
      continue;
    }
    list.push({ text: said ? clause.text : `${FOREVER} ${clause.text}` });
    said = true;
  }
  return list;
}

/**
 * True when this legacy has nothing the build actually does: every clause
 * deferred, or no clause at all.
 *
 * Two rows are in exactly this state today (Hero of Alexandria, Yi Sun-sin —
 * both carry `deferred` prose and an empty `legacy`), and they are the reason
 * the test is "nothing live" rather than "nothing at all": a ceremony that
 * counted the *empty list* case would still have put a struck-through promise in
 * the headline seat for those two and animated a number that is zero. The
 * ceremony promotes the deed instead, and the deferred line still prints under
 * it — a promise not made is said out loud rather than quietly dropped.
 */
export function legacyIsSilent(clauses: readonly CardClause[]): boolean {
  return clauses.every((clause) => clause.deferred === true);
}

/**
 * What a person's charge was spent on, in the interface's own two words.
 *
 * Deliberately **not** which verb was actually taken: nothing in the state says
 * (either verb spends the piece and leaves the same legacy — `docs/great-people.md`),
 * and a footnote that guessed would be a footnote that is wrong half the time.
 * What is true of every scholar is that their charge was a burst of study or the
 * Academy that stands in its place, and that is what this says. The work's name
 * is `improvementDef`'s, so a sixth family is a JSON row here too.
 */
export function deedFootnote(family: Family): string {
  const work = workForFamily(family);
  if (work === null) return `Spent as a ${family}.`;
  return `Spent as a ${family} — the act, or the ${improvementDef(work).name}.`;
}

/** The mono eyebrow: the family, then the age the name belongs to. */
export function faceEyebrow(id: GreatPersonId): string {
  const def = greatPersonDef(id);
  return `${def.family} · ${eraWord(def.age)}`;
}

/**
 * Everything a card of this person says, on any surface.
 *
 * The stamp is **asked of the empire's own ledger** (`explainCardImpact`, the
 * ghost-diff) and never composed here; an empty reading comes back as `null`,
 * which is what leaves the flourish standing rather than printing a nought.
 * Which way round it reads is the evaluator's business, not this one's: a legacy
 * already honoured prices backward and a legacy not yet spent prices forward,
 * and both answer with the same figure and the same sign.
 */
export interface GreatPersonFace {
  id: GreatPersonId;
  name: string;
  family: Family;
  /** "scholar · Æra III". */
  eyebrow: string;
  tier: GreatPersonTier;
  tierMark: string;
  /** The accent key `style.css` resolves — the tier, never the family. */
  line: CardLine;
  /** What the accent is, in words. A `title`. */
  lineName: string;
  /** The emblem's mask url — the family's picture. */
  emblem: string;
  /** The legacy in words, `Forever:` on the first clause. Empty for a name that leaves none. */
  legacy: CardClause[];
  /** What the charge was spent on, in words. Never a number. */
  deed: string;
  flavor: string;
  /** The per-turn figure, or `null` when there is nothing to print. */
  stamp: StampReading | null;
}

export function greatPersonFace(
  state: GameState,
  playerId: number,
  id: GreatPersonId,
): GreatPersonFace {
  const def = greatPersonDef(id);
  const reading = stampReading(explainCardImpact(state, playerId, { kind: 'legacy', id }));
  return {
    id,
    name: def.name,
    family: def.family,
    eyebrow: faceEyebrow(id),
    tier: def.tier,
    tierMark: TIER_MARK[def.tier],
    line: TIER_ACCENT[def.tier],
    lineName: TIER_NAME[def.tier],
    emblem: cardLineMarkUrl(FAMILY_EMBLEM[def.family]),
    legacy: legacyHeadline(describeCard(id)),
    deed: deedFootnote(def.family),
    flavor: def.epigram,
    stamp: stampIsEmpty(reading) ? null : reading,
  };
}
