/**
 * **Where a yield came from, as a player would name it** — the eight classes and
 * the one function that decides which a card's line belongs to.
 *
 * It is a *leaf* and that is the whole reason it exists as a file (batch E2,
 * `docs/audit/evaluations.md` §3a). The class was invented by the Ledger and
 * lived there, so a line could only be classed by walking the town's sources a
 * second time on the interface's side — four private rebuilds of one list, and
 * the root of every attribution bug of the last two days. Now the town's own
 * list carries a class on every line (`CityYieldLine.class`, `cities.ts`), which
 * means the simulation has to be able to *name* a class; and the simulation may
 * not import a screen. So the vocabulary comes down here, above nothing but the
 * data tables, and the Ledger keeps the words, the drawing order and the sharing
 * arithmetic that are genuinely its own.
 *
 * CLAUDE.md's leaf rule, in one line: a helper two modules need lives in a leaf.
 */

import { isBeadCardId } from './beadData';
import { isBuildingId, isWonder } from './buildingData';
import { isGreatPersonId } from './greatPeopleData';
import { isMaliceId } from './maliceData';
import { isBeliefId, isConsecrationId, isRiteId } from './religionData';
import type { CardId } from './statecraftData';
import { isDoctrineId, isGovernmentId, isOrderId } from './statecraftData';
import { isTechId } from './techData';

/**
 * **Where a yield came from**, as a player would name it — the eight classes
 * `docs/history/loop-review.md` §3 asks for, and no ninth.
 *
 * The list is a design decision rather than a derivation: these are the answers
 * to *"is my deck doing anything?"*, which is the question the Ledger exists to
 * answer, so `deck` is one class and the six things it is being compared against
 * are the rest. A source nothing can classify lands in `other` and the register
 * test says which those are, deliberately — a silent "other" is a slice that
 * grows as the game does and tells nobody.
 */
export type LedgerClass =
  | 'tiles'
  | 'buildings'
  | 'deck'
  | 'religion'
  | 'people'
  | 'trade'
  | 'wonders'
  | 'other';

/** Drawing order, left to right along every bar. Ground first, oddments last. */
export const LEDGER_CLASSES: readonly LedgerClass[] = [
  'tiles',
  'buildings',
  'deck',
  'religion',
  'people',
  'trade',
  'wonders',
  'other',
];

/**
 * Which class a card-paid line belongs to, by the **id** and never by the label.
 *
 * Eleven id spaces, disjoint by construction (`CardId`'s own docblock, and
 * `test/sim/tech.test.ts` pins the disjointness), so this is a total function
 * over every card the evaluator can hand back:
 *
 *   government · doctrine · order · malice → **deck** — the three classes a player drafts
 *     and slots are the deck, which is the whole comparison the Ledger makes.
 *   belief · rite · consecration → **religion**.
 *   a great person's legacy → **great people**.
 *   a building → **wonders** if it is one, else **buildings**. Only one-of-a-kind
 *     rows reach the evaluator at all (`liveEffects`' fifth source), but the
 *     split is asked of `isWonder` rather than assumed, because the Observatory's
 *     great works are `oncePerEmpire` buildings and are not wonders.
 *   a technology, a bead → **other**, deliberately: neither is a source a player
 *     would go looking for on a breakdown — a technology is not a thing you built
 *     and a bead is not a thing you own — and a ninth bar for two rows would be a
 *     bar that is empty in nine games out of ten.
 *
 * An id nothing recognises is a hand-edited save and gets `other` rather than a
 * throw — a breakdown slice is not the place to take a whole frame down
 * (`anyCardDef`'s own ruling, one module over).
 *
 * **The arms are in `anyCardDef`'s order, and that is load-bearing.** The id
 * spaces are *meant* to be disjoint and four ids are not (three Doctrines share
 * a name with a bead, one building does — the test holds the closed list), so
 * for those four the answer depends on which guard is asked first. Asking them
 * in the same order the card *lookup* asks them keeps one promise that matters
 * more than either reading: the slice a line lands in and the name that line
 * prints are the same card. A classifier that disagreed with `anyCardDef` would
 * put a figure in one bar and its label in another.
 */
export function classifyCard(card: CardId): LedgerClass {
  if (isBeliefId(card) || isRiteId(card) || isConsecrationId(card)) return 'religion';
  if (isOrderId(card) || isDoctrineId(card) || isGovernmentId(card)) return 'deck';
  // **A malice is the deck** (batch G3), and it belongs there for the class's own
  // reason rather than out of tidiness: `deck` answers *"is my council doing
  // anything?"*, and a card seated in one of its chairs by a missed wager is
  // exactly the thing that changes the answer. Its lines are negative, so the
  // slice says what the punishment costs against what the council pays, which is
  // the comparison a player about to stake the next wager wants.
  if (isMaliceId(card)) return 'deck';
  if (isBeadCardId(card)) return 'other';
  if (isGreatPersonId(card)) return 'people';
  if (isTechId(card)) return 'other';
  if (isBuildingId(card)) return isWonder(card) ? 'wonders' : 'buildings';
  return 'other';
}
