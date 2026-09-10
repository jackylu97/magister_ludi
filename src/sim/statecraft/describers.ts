/**
 * **The words** — every `describe…`, every word table, and the keyword refs.
 *
 * Hard rule 7 lives here: a card's rules are stated in a first-time player's
 * terms, through tables rather than through prose written beside each row, and
 * the tables stay together because the voice is a property of the *set*. A
 * named thing is a keyword ref (`ref()` → `[[kind:id|Name]]`), and every
 * printed clause goes through `setDescriptorText` or `stripRefs`.
 *
 * Split out of `statecraft.ts` in batch E3b (`docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9). It reads `evaluator.ts` for what a
 * card *is* and never the other way about: the words are downstream of the
 * vocabulary, which is why they are a file of their own rather than a section.
 * `../statecraft.ts` re-exports it, so no import path in the tree changed.
 */

import { signedPlain as signed } from '../yieldFormat';
import {
} from '../yields/town';
import {
} from '../yields/empire';
import {
  type BuildingId,
  type CompletionGrant,
  buildingDef,
  buildingPlural,
  isBuildingId,
  isWonder,
} from '../buildingData';
import {
  type Family,
  type FamilyVerbKind,
  type LegacyRevocation,
  familyVerb,
  greatPersonDef,
  isGreatPersonId,
} from '../greatPeopleData';
import { improvementDef, isGreatPersonWork, workForFamily } from '../improvementData';
import { projectDef } from '../projectData';
import { beliefPoolOf, isBeliefId, isConsecrationId, isRiteId } from '../religionData';
import { type CityYieldKey, resourceDef } from '../resourceData';
import {
  type AmplifierTarget,
  type PressureRuleId,
  type CardBuildingYieldPercentEffect,
  type CardPaysEffect,
  type CardPeriodicEffect,
  type CardDefBase,
  type CardEffect,
  type CardFlagRuleId,
  type CardId,
  type CardRule,
  type CityScope,
  type CombatCondition,
  type CombatScale,
  type CombatScaleCount,
  type CountKind,
  type EmpireCondition,
  type MeterRuleId,
  type OfferRiderScope,
  type OfferRuleId,
  type OrderBeadOccasion,
  type RateSource,
  type SlotType,
  type TallyOccasion,
  type TileCondition,
  type UnitFilter,
  type WindfallOccasion,
  STATECRAFT,
  isOrderId,
  orderDef,
} from '../statecraftData';
import { beadGrantDef } from '../beadData';
import { ABILITY_TECH, abilityDef, techDef } from '../techData';
import { unitDef } from '../unitData';
import { SLOT_WORDS } from './draft';
import { anyCardDef } from './evaluator';
import { CITY_SCOPED_COUNTS, PERIODIC_FLOOR, PERIODIC_PROBE, VOICES, oneOfAKind } from './evaluator';

const METER = STATECRAFT.meter;

// --- words ------------------------------------------------------------------

/** One clause of a card, in words, for the screen and the offer cards. */
export interface CardClause {
  text: string;
  /** True for a clause this build does not implement. Printed struck through. */
  deferred?: boolean;
}

/**
 * **Who a clause is about** — the subject every per-city phrase names (batch L1,
 * `docs/audit/legibility.md` §1b).
 *
 * The measurement that produced it: thirty-two generated faces said *"in this
 * city"* on a card that pays in **every** city, because the vocabulary's one
 * counted-line describer was written for a building — where "this city" is
 * exactly right — and every other class borrowed its words. A player meets most
 * of these at the draft, where a card is read **as the empire**, and "+1 science
 * per building in this city" on a Doctrine is a card that understates itself by
 * however many towns the realm holds.
 *
 * So the subject is a property of the **class**, decided once by `subjectOfCard`
 * and threaded down into the clause builders rather than guessed per arm:
 *
 *   · `'empire'` — an Order, a Doctrine, a government, a technology's own rules,
 *     a bead's boon, a great person's legacy, a pantheon or enhancer belief.
 *     A per-city clause says *"in every city"*, or names its scope where it has
 *     one ("in every coastal city", "in your capital");
 *   · `'follower'` — a follower belief, which applies city-locally to whoever
 *     holds a town that keeps the faith: *"in every city that follows your
 *     religion"*;
 *   · `'here'` — a building, a wonder, a rite, a consecration and a great
 *     person's work. Each **is** one town, so the clause is printed beside the
 *     town it is about and keeps *"in this city"*.
 *
 * The asymmetry in where the phrase lands is deliberate and is the whole reason
 * the subject is threaded rather than swapped in at the end: for `'here'` the
 * place trails the sentence ("+1 culture per 2 citizens in this city"), because
 * the count and the payout are the same one town and English says it once at the
 * end. For a realm it must **lead** ("+1 culture in every city per 2 citizens
 * there"), because a trailing "in every city" would attach to the count and
 * promise each town the empire's whole population.
 */
export type ClauseSubject = 'empire' | 'follower' | 'here';

/**
 * The subject a card's own class reads it against. See `ClauseSubject`.
 *
 * The cascade is `anyCardDef`'s, in its order and for its reason: the id spaces
 * are disjoint and the cheaper guard should not have to prove it. It asks the
 * *tables*, which are frozen at load, so a card's subject cannot change inside a
 * game — and a class that is not one of the two town-scoped ones is the realm's,
 * which is the honest default for a vocabulary read at the draft.
 */
function subjectOfCard(id: CardId): ClauseSubject {
  if (isBeliefId(id)) return beliefPoolOf(id) === 'follower' ? 'follower' : 'empire';
  if (isRiteId(id) || isConsecrationId(id)) return 'here';
  if (isBuildingId(id)) return 'here';
  return 'empire';
}

/**
 * The town a clause names when its row names none — the subject as a noun
 * phrase, and the one place `cityScopeWords`' default is overruled.
 *
 * A row that carries a `CityScope` says which towns it means and is printed in
 * its own words ("every coastal city", "your capital"): the ruling is only about
 * the **absent** scope, which `cityScopeWords` has always read as "every city"
 * and which is a lie on a building.
 */
function scopeWordsFor(subject: ClauseSubject, scope?: CityScope): string {
  if (scope !== undefined) return cityScopeWords(scope);
  if (subject === 'here') return 'this city';
  if (subject === 'follower') return 'every city that follows your religion';
  return 'every city';
}

// --- named things, marked in the words ---------------------------------------

/**
 * The classes of thing a clause may *name*, and they are exactly the
 * Compendium's shelves (`compendiumId` in `src/ui/compendium.ts`).
 *
 * Deliberately a string union in `src/sim/` rather than an import from the
 * interface: the address scheme is `section:id`, the sections are a fact about
 * the reference book, and the simulation may not depend on a screen. What keeps
 * the two honest is a test (`test/ui/compendium.test.ts`) that resolves every
 * mark a describer emits against a real entry — a kind that names no shelf, or
 * an id no row carries, fails there rather than shipping a dead link.
 */
export type RefKind =
  | 'unit'
  | 'building'
  | 'wonder'
  | 'improvement'
  | 'resource'
  | 'tech'
  | 'order'
  | 'doctrine'
  | 'belief'
  | 'rite'
  | 'greatPerson'
  | 'triumph'
  // The Compendium's bead entries are anchored `bead:<id>` already; the four
  // Æra V bead Orders are the first describers to name one (H3).
  | 'bead'
  // **A technology's rule, named** (batch L1, §2): the Rules shelf, anchored
  // `rule:<techId>`. It is not a `tech` ref — the technology has an entry of
  // its own, about what it *costs* and everything it hands over, and this one
  // is about the one rule that would not fit on the star chart's card. See
  // `techRuleWords.ts`, the only describer that emits one.
  | 'rule';

/**
 * `[[building:granary|a Granary]]` — one named thing, marked inside a clause.
 *
 * **The whole of the keyword mechanism on this side of the wall** (user ruling,
 * 2026-08-28: *"keywords that are linked are shown in bold; only in places where
 * clicking doesn't result in an action; keep these to descriptors"*). A describer
 * that interpolates the name of a thing the Compendium has an entry for wraps it
 * here, and nothing else about the clause changes: `text` is still one string,
 * `CardClause` is still two fields, and every consumer that wants plain words
 * gets them from `stripRefs`.
 *
 * A mark and not a structured field, for the reason `YIELD_GLYPH` is a glyph and
 * not a node (`yieldMark.ts`'s docblock, one problem over): a clause is composed
 * out of a dozen small string helpers that hand pieces to each other, and giving
 * every one of them a node API would have meant rewriting the vocabulary to
 * describe a keyword rather than to describe a card. The string stays a string
 * all the way to the surface, and exactly one module (`src/ui/keywords.ts`)
 * knows how to draw it.
 *
 * The name carries the grammar. `ref('building', 'granary', 'a Granary')` and
 * `ref('building', 'granary', 'Granaries')` are the same link with different
 * words in it, which is what lets an article and a plural stay where they are
 * composed instead of leaking into this function.
 */
export function ref(kind: RefKind, id: string, name: string): string {
  return `[[${kind}:${id}|${name}]]`;
}

/**
 * The mark, as a pattern. `kind:id|name`, with the name forbidden the three
 * characters that would let one mark swallow the next.
 */
export const REF_PATTERN = /\[\[([a-zA-Z]+):([A-Za-z0-9_]+)\|([^[\]|]*)\]\]/g;

/**
 * A clause with its marks taken back off — **the plain reading, and the one
 * every non-descriptor surface takes.**
 *
 * A `title` attribute, an announce line, a toast, the mono log and the
 * Compendium's search all want words rather than markup, and this is what they
 * ask. It is also the guarantee the ruling makes about the vocabulary itself:
 * `stripRefs(describeCard(id)[0].text)` is exactly the sentence that was printed
 * before any of this existed, so a mark can never change what a card *says*.
 */
export function stripRefs(text: string): string {
  // A fresh regex per call rather than `REF_PATTERN` itself: a global pattern
  // carries `lastIndex`, and a shared one is how two callers come to disagree
  // about the same string.
  return text.replace(new RegExp(REF_PATTERN.source, 'g'), (_match, _kind, _id, name: string) =>
    name,
  );
}

/**
 * A yield bag in words: "+2 gold, +1 culture" — or "+1 of every yield" where the
 * bag is one figure on all six (batch L1, §1c).
 *
 * The fold is the same ruling `everyVoiceFold` applies to six sibling rows, at
 * the one place a single row can say the same thing: six names in a row is a
 * list a reader has to check off, and "of every yield" is what the ratified
 * texts call it. All six or none — a bag paying five of them names its five.
 */
function bagWords(bag: Partial<Record<CityYieldKey, number>>): string {
  const first = bag[VOICES[0]!] ?? 0;
  if (first !== 0 && VOICES.every((key) => (bag[key] ?? 0) === first)) {
    return `${signed(first)} ${EVERY_YIELD}`;
  }
  const parts: string[] = [];
  for (const key of VOICES) {
    const value = (bag[key] ?? 0);
    if (value === 0) continue;
    parts.push(`${signed(value)} ${key}`);
  }
  return parts.join(', ');
}

/**
 * **Which roads a route row is about** — "every trade route you send", "every
 * trade route that ends in a city with a Printing House".
 *
 * One phrase for both clauses of the shape (the flat bag and the share) and for
 * both ends of a road, so a row that narrows its origin and a row that narrows
 * its destination read as the same kind of sentence. A row that names both is
 * two conditions on one caravan and says so.
 */
function routeWhose(effect: {
  origin?: CityScope;
  destination?: CityScope;
  crossing?: 'domestic' | 'international';
}): string {
  const parts: string[] = [];
  if (effect.origin !== undefined) parts.push(`sent from ${cityScopeWords(effect.origin)}`);
  // **The crossing, in the plainest words there are** (hard rule 7): a player is
  // told the caravan ends in another empire's city or runs between two of their
  // own, never that a route is "international". Between the two ends, because
  // that is the order a road is read in — where it left, where it goes.
  if (effect.crossing !== undefined) {
    parts.push(
      effect.crossing === 'international'
        ? 'that ends in another empire’s city'
        : 'between two of your own cities',
    );
  }
  if (effect.destination !== undefined) {
    // **One town, not every town**: a caravan ends in exactly one place, so the
    // scope's own "every city with a Printing House" reads as a promise about
    // the realm rather than about the road. The article is swapped where the
    // phrase carries one; a scope that names a single town ("your capital")
    // already reads right and is left alone.
    const where = cityScopeWords(effect.destination);
    parts.push(`that ends in ${where.startsWith('every ') ? `a ${where.slice(6)}` : where}`);
  }
  if (parts.length === 0) return 'every trade route you send';
  return `every trade route ${parts.join(' and ')}`;
}

/**
 * A short list in a sentence: "one, two and three".
 *
 * `bagWords`' comma one grade up, and its own helper because a *clause* read
 * aloud takes the conjunction where a ledger's label does not — "+1 movement,
 * +1 combat strength" is a label and "moves one further and hits one harder" is
 * a sentence. Two callers, both printing what a card hangs on a piece.
 */
function listWords(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * A loose list of effects, in words — `describeCard` for a caller that holds
 * effects rather than an id.
 *
 * The Bead Race is the one such caller: a boon's **cap** is a list of ordinary
 * `CardEffect`s on a row that is not a card table (`BeadBoon.effects`), and
 * `describeBeadBoon` has to print it in the same words an Order's would be
 * printed in. Exported rather than copied, because a second loop over
 * `describeEffect` is a second vocabulary the day an arm is added.
 *
 * **Repeated clauses collapse**: a row that says the same thing twice reads as
 * "+1 combat strength against barbarians ×2" rather than as the same sentence
 * printed twice. It was the presentation rule the deepening ladder needed, and
 * it outlived it (2026-09-04) because a *card* may still print a clause twice —
 * the *ledger* is where a player folds the arithmetic and it still shows one
 * labelled line per copy.
 */
export function describeEffects(
  effects: readonly CardEffect[],
  subject: ClauseSubject = 'empire',
): CardClause[] {
  const clauses: CardClause[] = [];
  for (let at = 0; at < effects.length; ) {
    // **Same-shape siblings fold before anything is worded** (batch L1, §1c).
    // The Founding Oath was six clauses of one figure on six voices, The
    // Laureate six tile lines that differ only in the work they name, and The
    // Compact of Chairs three sentences about three chairs — each of them a
    // *rule* a designer wrote as one sentence and the vocabulary printed as a
    // list. The fold is the describer's decision and nothing in the data moves:
    // the rows stay one effect per thing the evaluator has to do, and the words
    // say the thing once.
    const folded = describeFold(effects, at, clauses, subject);
    if (folded > 0) {
      at += folded;
      continue;
    }
    describeEffect(effects[at]!, clauses, subject);
    at += 1;
  }
  return collapseClauses(clauses);
}

/**
 * A run of same-shape siblings said as one sentence, or 0 when none starts here.
 *
 * Four folds, each answering a face the length measurement caught
 * (`docs/audit/legibility.md` §1c). They are tried in order and the first that
 * matches consumes its run; a fold that does not match costs one comparison and
 * the effect is worded on its own, exactly as before. **Nothing here changes an
 * arithmetic**: every one of these is the *same* list of effects, read out loud
 * the way the row's ratified text already reads it.
 *
 * The runs must be **consecutive**, which is not a limitation but the rule: a
 * designer writes the six voices of one promise together, and effects that are
 * not adjacent are not one sentence.
 */
function describeFold(
  effects: readonly CardEffect[],
  at: number,
  out: CardClause[],
  subject: ClauseSubject,
): number {
  return (
    everyVoiceFold(effects, at, out, subject) ||
    greatWorkRunFold(effects, at, out) ||
    slotPositionFold(effects, at, out) ||
    scaledCombatFold(effects, at, out)
  );
}

/**
 * **One figure on every voice** — The Founding Oath's six clauses as the one
 * sentence its ratified text is: *"Your capital pays +1 of every yield for each
 * building standing in it, at most 3."*
 *
 * The six rows are identical but for `to`, because that is what the evaluator
 * needs — a payout names one voice — and the reader needs the opposite: six
 * sentences that differ in one word are six things to hold in the head where one
 * would do. Every voice must be present and every field but the voice must
 * match, so a row paying five of the six still prints five clauses and says so.
 */
function everyVoiceFold(
  effects: readonly CardEffect[],
  at: number,
  out: CardClause[],
  subject: ClauseSubject,
): number {
  const head = effects[at];
  if (head === undefined || head.kind !== 'pays' || head.basis !== 'count') return 0;
  const paid = head.to;
  if (paid === undefined || !VOICES.includes(paid as CityYieldKey)) return 0;
  const voices: CityYieldKey[] = [];
  let run = 0;
  while (at + run < effects.length) {
    const next = effects[at + run];
    if (next === undefined || next.kind !== 'pays') break;
    const to = next.to;
    if (to === undefined || !VOICES.includes(to as CityYieldKey)) break;
    if (!sameBut(next, head, 'to')) break;
    voices.push(to as CityYieldKey);
    run += 1;
  }
  for (const voice of VOICES) if (!voices.includes(voice)) return 0;
  describePays(head, out, subject, EVERY_YIELD);
  return run;
}

/**
 * Are these two rows the same row but for one field?
 *
 * Key by key rather than by a stringify of the whole, because a row's key order
 * is however its author typed it and two rows that say the same thing in a
 * different order are still the same shape. The values are compared as JSON,
 * which is exact for the plain data a card row holds.
 */
function sameBut(a: object, b: object, skip: string): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = [...Object.keys(left)];
  for (const key of Object.keys(right)) if (!keys.includes(key)) keys.push(key);
  for (const key of keys) {
    if (key === skip) continue;
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) return false;
  }
  return true;
}

/** The words a folded six-voice payout is said in. See `everyVoiceFold`. */
const EVERY_YIELD = 'of every yield';

/**
 * **A run over the great person's works** — The Laureate's five tile lines as
 * one: *"+3 on every hex carrying a great person's work — science on an Academy,
 * culture on a Landmark, …"*
 *
 * The rows differ in the work they name and in the voice it pays, and nothing
 * else; the head phrase is the condition they all share, which the vocabulary
 * already has a word for (`greatWork`). Gated on every member being a great
 * person's work rather than on the card's name, so a run over five *ordinary*
 * improvements — which would have no shared noun to lead with — prints as five
 * clauses and stays honest.
 */
function greatWorkRunFold(effects: readonly CardEffect[], at: number, out: CardClause[]): number {
  const parts: string[] = [];
  let amount: number | undefined;
  let run = 0;
  while (at + run < effects.length) {
    const next = effects[at + run];
    if (next === undefined || next.kind !== 'pays' || next.where !== 'hex') break;
    if ((next.basis ?? 'flat') !== 'flat' || next.scope !== undefined) break;
    if (next.percent !== undefined || next.basePercent !== undefined) break;
    const on = next.on;
    if (on === undefined || on.test !== 'improvement' || !isGreatPersonWork(on.improvement)) break;
    const paid = VOICES.filter((voice) => (next[voice] ?? 0) !== 0);
    if (paid.length !== 1) break;
    const voice = paid[0]!;
    const figure = next[voice] ?? 0;
    if (amount === undefined) amount = figure;
    else if (figure !== amount) break;
    const name = improvementDef(on.improvement).name;
    parts.push(`${voice} on ${indefinite(name)} ${ref('improvement', on.improvement, name)}`);
    run += 1;
  }
  if (run < 3 || amount === undefined) return 0;
  out.push({
    text:
      `${signed(amount)} on every ${tileConditionWords({ test: 'greatWork' })} — ` +
      `${listWords(parts)}`,
  });
  return run;
}

/**
 * **A run over the chairs** — The Compact of Chairs' three sentences as the one
 * its ratified text is: *"The Order in your first military, economic and wildcard
 * slot each pay twice."*
 */
function slotPositionFold(effects: readonly CardEffect[], at: number, out: CardClause[]): number {
  const head = effects[at];
  if (head === undefined || head.kind !== 'slotPosition' || head.slot === undefined) return 0;
  const slots: SlotType[] = [];
  let run = 0;
  while (at + run < effects.length) {
    const next = effects[at + run];
    if (next === undefined || next.kind !== 'slotPosition' || next.slot === undefined) break;
    if (next.position !== head.position || next.factor !== head.factor) break;
    if (slots.includes(next.slot)) break;
    slots.push(next.slot);
    run += 1;
  }
  if (run < 2) return 0;
  out.push({
    text:
      `the Order in your ${ordinalWords(head.position)} ` +
      `${listWords(slots.map((slot) => SLOT_WORDS[slot].toLowerCase()))} slot each ` +
      `pays ${timesWords(head.factor)}`,
  });
  return run;
}

/**
 * **A flat strength line and the scale on it** — Border Wardens' two clauses as
 * one: *"+1 combat strength inside your territory, +1 more per military Order you
 * have in a slot (at most +3)."*
 *
 * The two rows are one rule a player reads in one breath, and split they read
 * worse than either half: the scaled clause repeated the whole condition after
 * the count, so the sentence ended on "inside your territory" a second time and
 * the *"more"* — the word that says this is an increment on the line above —
 * was nowhere. The fold requires the same fight (`when`, `class`, `vsClass`,
 * `side`), because two lines about different fights are two rules.
 */
function scaledCombatFold(effects: readonly CardEffect[], at: number, out: CardClause[]): number {
  const flat = effects[at];
  const scaled = effects[at + 1];
  if (flat === undefined || flat.kind !== 'combatLine' || flat.scaled !== undefined) return 0;
  if (scaled === undefined || scaled.kind !== 'combatLine' || scaled.scaled === undefined) return 0;
  if (JSON.stringify(flat.when) !== JSON.stringify(scaled.when)) return 0;
  if (JSON.stringify(flat.class) !== JSON.stringify(scaled.class)) return 0;
  if (JSON.stringify(flat.vsClass) !== JSON.stringify(scaled.vsClass)) return 0;
  if (flat.side !== scaled.side) return 0;
  const scale = scaled.scaled;
  const cap = scale.max === undefined ? '' : ` (at most ${signed(scale.max)})`;
  const first: CardClause[] = [];
  describeEffect(flat, first, 'empire');
  const lead = first[0]?.text;
  if (lead === undefined) return 0;
  out.push({
    text:
      `${lead}, ${signed(scaled.amount)} more per ` +
      `${countWords(scale.per, scaleNoun(scale))}${cap}`,
  });
  return 2;
}

/** Identical clauses, folded to one with a count. See `describeEffects`. */
function collapseClauses(clauses: readonly CardClause[]): CardClause[] {
  const out: CardClause[] = [];
  const seen = new Map<string, number>();
  const counts: number[] = [];
  for (const clause of clauses) {
    const key = `${clause.text} ${clause.deferred === true ? '1' : '0'}`;
    const at = seen.get(key);
    if (at !== undefined) {
      counts[at] = (counts[at] ?? 1) + 1;
      continue;
    }
    seen.set(key, out.length);
    counts.push(1);
    out.push({ ...clause });
  }
  for (let i = 0; i < out.length; i++) {
    const times = counts[i] ?? 1;
    if (times > 1) out[i] = { ...out[i]!, text: `${out[i]!.text} ×${times}` };
  }
  return out;
}

/**
 * One card's effects, in words.
 *
 * Here rather than in the interface because it is a reading of the vocabulary,
 * and the vocabulary is read in one file (`describeResourceSignature`'s
 * argument). Every text surface that names a card — the offer, the collection,
 * the slot hover — calls this, so they cannot describe the same card two ways.
 *
 * **One card, one face.** It took a level until the ruling of 2026-09-04, and
 * the parameter is gone with the ladder rather than left at a default nobody
 * passes: what the offer card promises, what the collection prints and what the
 * ledger pays are the row's own effects, read once.
 */
export function describeCard(id: CardId): CardClause[] {
  const def: CardDefBase = anyCardDef(id);
  // **The class becomes a word here, and only here** (batch L1): every clause
  // below is worded against the subject the card's own class reads it against.
  // See `ClauseSubject`.
  const clauses: CardClause[] = describeEffects(def.effects, subjectOfCard(id));
  // **A completion grant is not an effect, and it still has to be printed.** It
  // happens once, at the moment the stones go up, so it is a field on the
  // building row rather than a shape in the vocabulary (`CompletionGrant`) — but
  // it is half of what the Statue of Zeus and the Great Library *are*, and a
  // card that left it out would be a card that lies by omission. Printed here,
  // in this file, so the one description of a card is still one function.
  if (isBuildingId(id)) {
    const building = buildingDef(id);
    // **The two meter fields, for the same reason as the grant.** `happiness`
    // and `authorityCapacity` are older than this vocabulary and are read by
    // `buildingEffects.ts` rather than by an effect arm, so a card built out of
    // `def.effects` alone printed *nothing at all* for The Forbidden City (whose
    // whole sentence is five points of writ) and dropped four of Circus
    // Maximus's five points of cheer on the floor. They are said in the meters'
    // own words — the same two `describeEffect` arms print for a card that
    // raises either — so a wall a wonder raises and a wall an Order raises read
    // identically. This is the *one* description of a building, which is why the
    // city panel stopped printing its own copy of these two lines.
    if (building.happiness !== undefined && building.happiness !== 0) {
      clauses.push({ text: `${signed(building.happiness)} happiness` });
    }
    if (building.authorityCapacity !== undefined && building.authorityCapacity !== 0) {
      clauses.push({ text: `${signed(building.authorityCapacity)} authority capacity` });
    }
    for (const grant of building.onComplete ?? []) {
      clauses.push({ text: grantWords(grant) });
    }
  }
  // **A slot grant is not an effect, and it still has to be printed** — the
  // completion grant's argument one class over. It happens at a moment rather
  // than standing for as long as the card is held, so it is a field on the row
  // (`OrderDef.onSlot`); a card that left it out would be The Laureate reading
  // as five tile bonuses and no laureate.
  if (isOrderId(id)) {
    for (const grant of orderDef(id).onSlot ?? []) {
      if (grant.grant === 'greatPerson') {
        clauses.push({
          text: 'the first time this Order is placed in a slot, you are offered a great person',
        });
      }
    }
  }
  // **A revocation is not an effect, and it still has to be printed** — the
  // completion grant's and the slot grant's argument a third time. It is a
  // moment rather than a standing reading of the board, so it lives on the row
  // (`GreatPersonDef.revokedWhen`); and it is emphatically *not* struck through,
  // because it is a promise the game **does** make. A card that left it out
  // would be Archimedes reading as six free points of siege.
  if (isGreatPersonId(id)) {
    const when = greatPersonDef(id).revokedWhen;
    if (when !== undefined) clauses.push({ text: REVOCATION_WORDS[when] });
  }
  for (const missing of def.deferred ?? []) {
    clauses.push({ text: `${missing} — not built yet`, deferred: true });
  }
  return clauses;
}

/**
 * A family's verb, in the words the player reads — **the one describer for the
 * two buttons a great person offers.**
 *
 * The words themselves are the family's row (`FamilyVerbs`, `greatPeopleData.ts`);
 * what this adds is the mark. A work names the improvement it plants, and a named
 * thing in a describer is a keyword ref — so "Found an Academy" comes back as
 * `Found an [[improvement:academy|Academy]]` and the Compendium's entry links to
 * the thing it is talking about, exactly as a card's does.
 *
 * The name is marked **in place** rather than the whole phrase being wrapped,
 * because the grammar belongs to the sentence and only the noun is the entry: a
 * player pressing a link that spans a verb would be told what a Customs House is
 * when they clicked on "Build". The sync test holds that the noun is in there to
 * find (`test/sim/greatPeopleDocSync.test.ts`); a row that drifted comes back
 * unmarked rather than mismarked, which is the failure that cannot mislead.
 *
 * An **act** carries no mark at all. It pays a figure into a bank, and there is
 * no entry in the book called "a treatise".
 */
export function describeFamilyVerb(family: Family, verb: FamilyVerbKind): string {
  const words = familyVerb(family, verb);
  if (verb !== 'work') return words;
  const work = workForFamily(family);
  if (work === null) return words;
  const name = improvementDef(work).name;
  if (!words.includes(name)) return words;
  return words.replace(name, ref('improvement', work, name));
}

/**
 * **What a building row is worth, in one list** — its yields and every fact
 * beside them: `describeCard` for a building, plus the half of a building row
 * that was never in the card vocabulary at all.
 *
 * It exists because of the charters (the playthrough note of 2026-09-05: *"charter
 * orders should include a description of the building they unlock"*). A charter's
 * ratified text is "Unlocks the Chapel." and nothing else, so a player drafting
 * one was told the name of a thing and not one word about what it does — and the
 * describer that *could* have told them lived on the Compendium's page, which is
 * the one surface a player holding an offer card is not looking at.
 *
 * So the sentence is composed **here**, on the simulation's side, and the
 * Compendium reads the same function: the reference book and the card face cannot
 * come to disagree about the same row, and a re-cut building re-prints itself
 * everywhere in the same pass. Nothing is written into the card's `text` in the
 * data — the ratified text stays exactly as ratified (`CardDefBase.text`), and
 * the description composes at print time out of the building's own row.
 *
 * `describeCard` is the middle of it rather than a rival to it: a building **is**
 * a card, so its effects, happiness, authority capacity and completion grants are
 * already said in the vocabulary every other card is said in. What this adds is
 * the rest of the row — the flat voices, and the eight fields a building carries
 * that no card effect models (`ritePays`, `waters`, `crowdingRelief`,
 * `purchaseDiscount`, `healsAdjacent`, `cityHp`, `faithPurchases`, `purchaseOnly`)
 * — which the Compendium's shelf either printed as a *note* in the row's own prose
 * or did not print at all.
 *
 * The **gates** are deliberately not here: what ground a row wants
 * (`requiresSite`), which technology opens it, and the markers a reference page
 * annotates (one per empire, one per world, ends the game) are conditions of
 * *getting* the building rather than clauses of what it does, and the Compendium
 * states each of them in its own words beside the rows. This list answers one
 * question: **what do I have, once it stands?**
 *
 * Deferred halves sort to the end, so a face may print the live clauses and stop
 * at the first struck-through one.
 */
export function describeBuildingRow(id: BuildingId): CardClause[] {
  // The cycle guard, and the one reason this function is not simply a fold: a
  // card that unlocks a building prints this list inside its own clause, and a
  // building row may itself carry a card effect (`BuildingDef.effects`). The day
  // a row unlocks a row that unlocks it back, the honest answer is the name on
  // its own rather than a stack overflow at the moment a player opens an offer.
  if (DESCRIBING_BUILDINGS.has(id)) return [];
  DESCRIBING_BUILDINGS.add(id);
  try {
    return buildingRowClauses(id);
  } finally {
    DESCRIBING_BUILDINGS.delete(id);
  }
}

/** See `describeBuildingRow`. Never read outside it. */
const DESCRIBING_BUILDINGS = new Set<BuildingId>();

function buildingRowClauses(id: BuildingId): CardClause[] {
  const def = buildingDef(id);
  const out: CardClause[] = [];
  // The six voices first, because that is what a building mostly *is* and the
  // first thing a player asks of one. Worded by `bagWords`, the same helper a
  // card's `cityYields` clause is worded by, so "+1 faith" is "+1 faith"
  // wherever it is read.
  const voices = bagWords({
    food: def.food,
    production: def.production,
    gold: def.gold,
    science: def.science,
    culture: def.culture,
    faith: def.faith ?? 0,
  });
  if (voices) out.push({ text: voices });
  if (def.sciencePerPop !== 0) {
    out.push({ text: `${signed(def.sciencePerPop)} science for every citizen` });
  }
  if (def.routeSlots !== undefined && def.routeSlots !== 0) {
    const slots = def.routeSlots;
    out.push({
      text: `${signed(slots)} trade ${slots === 1 || slots === -1 ? 'route' : 'routes'} for your empire`,
    });
  }
  if (def.productionBonus !== undefined) {
    // The card arm's own sentence for the same shape (`productionBonus`), minus
    // the scope a building cannot have: it stands in one town, so the town *is*
    // the scope.
    const bonus = def.productionBonus;
    // Which silhouette, where the row narrows to one — the Stable's horses. The
    // card arm's own `filterWords`, so a building and a card that say the same
    // thing print the same words; `modelClass` is the older spelling of the same
    // question and is read through the same predicate.
    const narrow = bonus.class !== undefined ? filterWords(bonus.class) : `${bonus.category}s`;
    out.push({ text: `${signed(bonus.percent)}% production toward ${narrow}` });
  }
  // What the card vocabulary already says about this row — its effects, the two
  // meter fields and anything finishing it hands over. Live clauses here; the
  // deferred halves are held back to the end of the list below.
  const card = describeCard(id);
  for (const clause of card) {
    if (clause.deferred !== true) out.push(clause);
  }
  // The eight row fields no card effect models. Each is read by exactly one rule
  // (`buildingEffects.ts` and the ledgers it feeds), and each was invisible to a
  // player until this list: a Keep's mending and a Chapel's rite were sentences
  // in a `note` and numbers in the simulation, with nothing joining them.
  if (def.cityStat !== undefined) {
    const stat = def.cityStat;
    out.push({
      text:
        stat.stat === 'defense'
          ? `${signed(stat.amount)} to the city’s defence strength`
          : `${signed(stat.amount)} to how far the city sees`,
    });
  }
  if (def.cityHp !== undefined && def.cityHp !== 0) {
    out.push({ text: `${signed(def.cityHp)} to how much punishment the city can take` });
  }
  // The writ a building supplies (`authorityCapacity`) is **not** printed here:
  // `describeCard` above already says it, in the meters' own words, beside the
  // happiness — the one description of a building's two meter fields. A second
  // push here printed "+1 authority capacity; +1 authority capacity for your
  // empire" on every card that unlocks a writ-paying house (the Assize Court's
  // charter, and the Mosque the day it was written, batch B3, 2026-09-08).
  // The Throne's placement half (`unitUpkeepRebate`), said as the promise rather
  // than as the field: what a player needs to know is that it follows the piece,
  // which is the whole of why the number is stamped and not read off the board.
  if (def.unitUpkeepRebate !== undefined && def.unitUpkeepRebate !== 0) {
    out.push({
      text: `every unit raised in this city costs ${def.unitUpkeepRebate} less gold a turn to keep, for as long as it lives`,
    });
  }
  if (def.demandRelief !== undefined && def.demandRelief !== 0) {
    out.push({ text: `this city’s citizens ask ${def.demandRelief}% less of you` });
  }
  if (def.purchaseDiscount !== undefined && def.purchaseDiscount !== 0) {
    // "costs less", never "−5% cost": the sign belongs to the price, exactly as
    // it does in the `purchaseRider` arm a card writes the same promise with.
    const off = def.purchaseDiscount;
    out.push({
      text: `everything this city buys costs ${Math.abs(off)}% ${off < 0 ? 'less' : 'more'}`,
    });
  }
  if (def.healsAdjacent !== undefined && def.healsAdjacent !== 0) {
    out.push({
      text: `${signed(def.healsAdjacent)} healing for your units resting in this city or beside it`,
    });
  }
  if (def.ritePays !== undefined && def.ritePays !== 0) {
    out.push({ text: `a rite performed in this city pays ${signed(def.ritePays)} culture` });
  }
  if (def.waters === true) {
    out.push({ text: 'the city counts as standing beside fresh water' });
  }
  if (def.irrigates === true) {
    // `waters`' sibling and a **second** sentence, because they are the two
    // questions the two markers answer: one is about the town's own thirst and
    // this is about the fields it works. Said as what a farmer would say — the
    // water is carried out to the farms — rather than as the renewal it un-gates.
    out.push({ text: 'the farms this city works are watered as if they stood beside a river' });
  }
  if (def.faithPurchases !== undefined) {
    out.push({
      text:
        def.faithPurchases === 'civilian'
          ? 'settlers, workers and caravans may be bought with faith in this city'
          : 'units may be bought with faith in this city',
    });
  }
  if (def.purchaseOnly === true) {
    // **The bank the row names, or the treasury** (batch B3). The Gilded Hall is
    // sold by the treasury like everything else and says gold; a row carrying
    // `BuildingDef.purchase` is sold out of that bank and out of no other, and
    // the sentence has to say which or a player reads "bought" and reaches for
    // the wrong pool. `purchaseError` refuses the other bank in the same words.
    out.push({
      text: `it is bought with ${def.purchase?.currency ?? 'gold'} and never built`,
    });
  }
  if (def.followingOnly === true) {
    // The town clause, said as the belief that opened it would say it. Not "the
    // religion whose follower belief unlocks this row" — a player is told where
    // it may stand, which is the whole of the rule they can act on.
    out.push({ text: 'it may be raised only in a city that keeps the faith that opened it' });
  }
  // The renown a building pays is a fact about what it *is* (`BuildingRenown`),
  // and it is said in the card arm's words — "per turn" load-bearing, the family
  // trailing — so a renown building and a renown card read alike.
  if (def.renown !== undefined) {
    const renown = def.renown;
    out.push({
      text: `${signed(renown.perTurn)} renown per turn, favouring ${renown.family}s`,
    });
    if (renown.onComplete !== undefined && renown.onComplete !== 0) {
      out.push({ text: `${signed(renown.onComplete)} renown the turn it is finished` });
    }
  }
  // What it pays on the **ground its city works**, for the lines that stand from
  // the day it is raised. A tech-gated line belongs to the node that hands it
  // over and is announced there (`techGifts`), never here.
  for (const line of def.tileYields ?? []) {
    if (line.requiresTech !== undefined) continue;
    const add = bagWords(line.add);
    if (add) out.push({ text: `${add} on every ${tileConditionWords(line.on)}` });
  }
  for (const clause of card) {
    if (clause.deferred === true) out.push(clause);
  }
  return out;
}

/**
 * When a legacy stops being heeded, in words. See `LegacyRevocation`.
 *
 * "lost the turn …" leads every one of them, for `grantWords`' reason exactly:
 * that phrase is the whole difference between this clause and every other on the
 * card, all of which are true for as long as the empire holds it.
 */
const REVOCATION_WORDS: Record<LegacyRevocation, string> = {
  enemyEntersCapital: 'lost the turn an enemy soldier enters your capital’s territory',
  happinessNegative: 'lost the first turn your happiness goes negative',
  ageAdvanced: 'lost when the age it was earned in closes',
};

/**
 * **The one shape that pays a voice, in words** — batch E5's merged describer.
 *
 * `CardPaysEffect` collapsed eight kinds into one, and this is the eight arms
 * they had, chosen by (`where`, `basis`) instead of by eight names. The
 * sentences themselves are **unchanged**, down to the byte: a card's printed
 * text is what a player reads and what the Compendium prints, so the merge is
 * pinned by `test/sim/cardTextSnapshot.test.ts` rather than trusted.
 *
 * Its own function rather than a case body, because five clauses is more than a
 * `switch` arm should hold and the dispatch reads better as a walk of the two
 * dimensions than as a nest of `if`s inside `describeEffect`.
 */
function describePays(
  effect: CardPaysEffect,
  out: CardClause[],
  subject: ClauseSubject,
  voice?: string,
): void {
  const basis = effect.basis ?? 'flat';

  if (basis === 'count') {
    // The cap is on the **count** (`helpings` in the evaluator), so it is
    // printed as the payout it works out to — "(at most +3 happiness)" — which
    // is how every ratified row states it and the only form a player can check
    // against the ledger. A bare "(at most 4)" beside "+2 production per …"
    // read as a cap of four production, which was wrong by half.
    const cap =
      effect.max === undefined ? '' : ` (at most ${payoutWords(effect, effect.max, voice)})`;
    const place = countPlace(effect, subject);
    // A count that names a building says the building's own name — "per
    // Barracks", "per Temple" — rather than a stem in the table, because one
    // shape serves every such row and a table entry could only name one of
    // them. The **town** the count is taken in rides in the noun, because
    // English puts it in different places in different nouns — "building
    // there", "combat unit standing there", "building there that supplies
    // science" — see `countNoun`.
    const words = countNoun(effect, place.counted);
    // A count whose noun carries no town of its own takes the place as a tail.
    const here = place.counted === '' || countNamesItsTown(effect) ? '' : ` ${place.counted}`;
    // **The counter's one condition, printed once.** A growing card pays for
    // what it has watched happen, and it only watches from a slot — so the
    // clause belongs beside the count rather than folded into five nouns, and
    // a card that left it unsaid would be a card that lies about its bench.
    const counted =
      effect.count === 'tally' ? ', counted while this Order stands in a slot' : '';
    out.push({
      text:
        `${payoutWords(effect, 1, voice)}${place.paidIn} per ${countWords(effect.per, words)}` +
        `${here}${cap}${counted}`,
    });
    return;
  }

  if (basis === 'rate') {
    if (effect.fromRate === undefined) return;
    out.push({
      text: `${payoutWords(effect)} per ${countWords(effect.per, RATE_WORDS[effect.fromRate])}`,
    });
    return;
  }

  if (basis === 'mirror') {
    out.push({
      text:
        `${effect.category} buildings supply ${effect.to} equal to their ` +
        `${effect.from}, in ${scopeWordsFor(subject, effect.scope)}`,
    });
    return;
  }

  if (basis === 'share') {
    // "Gained again as", which is the wording the rate conversions were
    // ratified in (Cuius Regio, 2026-09-02) and the only one that does not
    // read as though the town *loses* the harvest it sells: nothing is taken
    // away, a share of it is paid a second time in another voice.
    out.push({
      text:
        `${effect.percent}% of the ${effect.from} in ${scopeWordsFor(subject, effect.scope)} ` +
        `is gained again as ${effect.to}`,
    });
    return;
  }

  // --- the flat bag, at each of the four grounds ----------------------------

  if (effect.where === 'hex') {
    if (effect.on === undefined) return;
    const on = effect.on;
    const words = bagWords(effect);
    // The scope trails the hex as a clause of its own, because a scoped tile
    // line is about *whose* ground: Petra's desert is the desert of one town,
    // and the sentence has to say so without turning the hex into a
    // possessive nobody can parse.
    const whose = effect.scope === undefined ? '' : `, in ${cityScopeWords(effect.scope)}`;
    if (words) out.push({ text: `${words} on every ${tileConditionWords(on)}${whose}` });
    // The percentage is its own clause, because it is a share of a *different*
    // number: the flat is what the card pays and this is what the works pay
    // half again of. Said as "the works on" so a player knows which half moved.
    //
    // **No "more" after a signed percent** (batch L1, §1c): "+100%" and "more"
    // both signal an increase, and together they read as two of them — the user
    // read "pays +100% more" as a quadrupling. The sign carries the direction
    // and the noun carries what it is a share of.
    if (effect.percent !== undefined && effect.percent !== 0) {
      out.push({
        text:
          `the works on every ${tileConditionWords(on)} pay ` +
          `${signed(effect.percent)}%${whose}`,
      });
    }
    // The ground's share, its own clause for the works' reason exactly, and
    // "the ground of" so the player knows which half moved. A doubling reads
    // as a doubling rather than as "+100% more", because that is the sentence
    // The Old Ways was ratified in.
    if (effect.basePercent !== undefined && effect.basePercent !== 0) {
      out.push({
        text:
          effect.basePercent === 100
            ? `the ground of every ${tileConditionWords(on)} pays double${whose}`
            : `the ground of every ${tileConditionWords(on)} pays ` +
              `${signed(effect.basePercent)}%${whose}`,
      });
    }
    return;
  }

  if (effect.where === 'route') {
    // Faith is not among a caravan's voices, for `RouteYieldLine`'s reason
    // (nothing pays a road in it), so the bag is read as five.
    const words = bagWords({
      food: effect.food,
      production: effect.production,
      gold: effect.gold,
      science: effect.science,
      culture: effect.culture,
    });
    // **The share, said in its own clause** — The Silk Exchange's doubled
    // beakers and songs. It is a sentence about what the road *already*
    // carries, so it cannot be folded into the flat's phrase; a row that says
    // both prints both, in the order the fold applies them.
    //
    // **Voices at one percentage are one clause** (batch L1, §1c): the row
    // carries a list because the fold multiplies voice by voice, and a player
    // reading two sentences that differ in one word is reading one rule twice.
    // The figure leads, and it drops the "more" the signed percent already
    // says — see the works' clause above.
    const shares: { percent: number; voices: string[] }[] = [];
    for (const share of effect.share ?? []) {
      if (share.percent === 0) continue;
      const voice = share.yield === 'all' ? 'everything' : share.yield;
      const held = shares.find((group) => group.percent === share.percent);
      if (held === undefined) shares.push({ percent: share.percent, voices: [voice] });
      else held.voices.push(voice);
    }
    for (const group of shares) {
      out.push({
        text: `${signed(group.percent)}% ${listWords(group.voices)} on ${routeWhose(effect)}`,
      });
    }
    if (!words) return;
    const whose = routeWhose(effect);
    // **What the row is paid *for***, when it is paid more than once. The
    // Golden Roads pays its bag per good on the road, so the sentence has to
    // say so or a player reads a flat coin where a caravan of six is earning
    // six. See `CardPaysEffect.perEndpointLuxury`.
    const each =
      effect.perEndpointLuxury === true
        ? ', for each luxury in the city it left or the city it reaches'
        : '';
    out.push({ text: `${words} on ${whose}${each}` });
    return;
  }

  const words = bagWords(effect);
  if (!words) return;
  if (effect.where === 'empire') {
    out.push({ text: `${words} to the empire` });
    return;
  }
  out.push({ text: `${words} in ${scopeWordsFor(subject, effect.scope)}` });
}

/**
 * **Where a counted line's town is said, and in which words** — the whole of the
 * subject rule at the one clause that needed it (batch L1, §1b).
 *
 * Two phrases, because a counted line names two towns and they are not always
 * the same one: `paidIn` trails the *payout* ("+1 science **in every city**")
 * and `counted` says where the *count* is taken ("per building **there**").
 *
 * The three readings a row can carry, and they are the three the evaluator
 * already distinguishes:
 *
 *   · `where: 'city'` — every town pays for its own. The realm leads and the
 *     count trails as "there", so a player reads the promise once per town;
 *   · `where: 'capital'` — one town pays for its own. "In your capital … there";
 *   · `where: 'empire'` with a town-scoped count — the realm pays once for the
 *     sum over its towns, so nothing leads and the count says "in your cities".
 *
 * A `'here'` subject short-circuits all three: the clause is printed beside the
 * town it is about, so it says "in this city" once, at the end, exactly as it
 * always has.
 */
interface CountPlace {
  /** Trails the payout. `" in every city"`, `" in your capital"`, `""`. */
  paidIn: string;
  /** The town the count is taken in. `"there"`, `"in your cities"`, `""`. */
  counted: string;
}

function countPlace(effect: CardPaysEffect, subject: ClauseSubject): CountPlace {
  // **Is *this line* asked of a town?** `isCityScopedCount`'s question on the
  // words' side of the wall, and the same two clauses: a count that can only
  // ever be asked of a town, or a line narrowing one that could be asked either
  // way (`within`).
  const cityScoped =
    effect.within === 'city' ||
    (effect.count !== undefined && CITY_SCOPED_COUNTS.includes(effect.count));
  // **Where the figure lands**, printed where the row narrows it: a capital line
  // said as a bare "+1 production" is a card that lies by omission, and so — at
  // the draft — is a per-town line that never says how many towns there are.
  const paidIn =
    effect.where === 'capital'
      ? ' in your capital'
      : effect.where === 'city' && subject !== 'here'
        ? ` in ${scopeWordsFor(subject, effect.scope)}`
        : '';
  if (!cityScoped) return { paidIn, counted: '' };
  if (subject === 'here') return { paidIn, counted: 'in this city' };
  return { paidIn, counted: effect.where === 'empire' ? 'in your cities' : 'there' };
}

/** The one place an effect becomes a sentence. Every arm, no default silence. */
function describeEffect(
  effect: CardEffect,
  out: CardClause[],
  subject: ClauseSubject = 'empire',
): void {
  const kind = effect.kind;
  switch (kind) {
    // **The one shape that pays a voice** (batch E5). Eight arms until the
    // merge — `cityYields`, `tileYield`, `empireYields`, `routeYield`,
    // `mirrorYield`, `countScaled`, `yieldConversion`, `rateConversion` — and
    // the five clauses below are those eight sentences unchanged, chosen by the
    // row's own two dimensions rather than by eight names for them.
    case 'pays':
      describePays(effect, out, subject);
      return;
    case 'percentYields': {
      const voice = effect.yield === 'all' ? 'all yields' : effect.yield;
      out.push({
        text: `${signed(effect.percent)}% ${voice} in ${scopeWordsFor(subject, effect.scope)}`,
      });
      return;
    }
    case 'productionBonus': {
      // The named row beats the silhouette beats the category, because that is
      // the order of how specific they are: "toward Temples", "toward mounted
      // units", "toward buildings".
      // The plural is composed off the **plain** name and then marked, exactly
      // as `countNoun` does it: pluralising a marked string would put the `s`
      // after the closing brackets.
      const what = effect.building
        ? ref(
            isWonder(effect.building) ? 'wonder' : 'building',
            effect.building,
            // **A one-of-a-kind row has no plural.** A discount on Temples is a
            // discount on however many a realm raises, and a discount on The
            // Magnum Opus is a discount on the one — "The Magnum Opuses" is a
            // sentence about a thing that cannot exist. `oneOfAKind` is the same
            // line `liveEffects` divides its sources on, asked here for the
            // words rather than for the reading.
            oneOfAKind(effect.building)
              ? buildingDef(effect.building).name
              : buildingPlural(buildingDef(effect.building).name, 2),
          )
        : effect.buildingCategory
          ? `${effect.buildingCategory} buildings`
          : effect.modelClass
            ? `${effect.modelClass} units`
            : // The ordinary filter, which is the only one of the four that can
              // say "ships" — `filterWords` is the same table `unitStat` and
              // `combatLine` print through, so one card cannot call a hull one
              // thing and another card call it another.
              effect.class
              ? filterWords(effect.class)
              : `${effect.category}s`;
      // The scope trails as its own clause, exactly as a scoped `tileYield`'s
      // does: "+20% production toward wonders, in your capital" says *where* the
      // hammers are quicker without turning the category into a possessive.
      const whose = effect.scope === undefined ? '' : `, in ${cityScopeWords(effect.scope)}`;
      out.push({
        text: `${signed(effect.percent)}% production toward ${what}${whose}`,
      });
      return;
    }
    case 'rulePercent':
      out.push({
        text:
          RULE_WORDS[effect.rule](effect.percent) +
          // A rate that names towns says which, for `cityYields`' reason: an
          // unqualified "of the stored food kept when a city grows" reads as a
          // law of the realm, and Common Table is a law of one congregation.
          (effect.scope === undefined ? '' : `, in ${cityScopeWords(effect.scope)}`),
      });
      return;
    case 'happiness':
      out.push({
        // **A line hung on a building says so** (batch B2): the ledger prints it
        // as the building's, so the card must too, or a player reading "+1
        // happiness in every city with a Temple" would go looking for a line
        // that is filed under the temple. See `CardHappinessEffect.building`.
        //
        // **And a scope on a one-town line says so too** (the user's tree pass
        // of 2026-09-10): the Public Bath is worth its contentment only in a
        // town the road from the capital has reached, and the evaluator has
        // always asked (`cityLocalHappiness`) — it was the words that were
        // silent, so the row printed a promise it kept conditionally. A town's
        // own line says it as a **condition** rather than as "in every city
        // joined to your capital", which on a building that stands in one place
        // would be a sentence about the realm.
        text:
          effect.building !== undefined
            ? `${buildingPluralName(effect.building)} supply ${signed(effect.amount)} happiness`
            : `${signed(effect.amount)} happiness` +
              (effect.per === 'city'
                ? ` in ${scopeWordsFor(subject, effect.scope)}`
                : effect.scope === undefined
                  ? ''
                  : subject === 'here'
                    ? ` while this city is ${scopeCondition(effect.scope)}`
                    : ` in ${cityScopeWords(effect.scope)}`),
      });
      return;
    case 'authority':
      out.push({
        text:
          `${signed(effect.amount)} authority capacity` +
          (effect.per === 'city' ? ' per city' : ''),
      });
      return;
    case 'happinessTierBoost':
      out.push({
        text:
          `${signed(effect.points)} percentage points ` +
          'to the bonus your positive happiness pays',
      });
      return;
    case 'combatLine': {
      const each = signed(effect.amount);
      // "per adjacent friendly combat unit", never "per 1 adjacent friendly
      // combat units": a helping of one is the thing itself, and printing the
      // 1 is what made The Marshals read like a rounding error.
      const scale = effect.scaled
        ? ` per ${countWords(effect.scaled.per, scaleNoun(effect.scaled))}` +
          (effect.scaled.max === undefined ? '' : ` (at most ${signed(effect.scaled.max)})`)
        : '';
      // Who the line is for, when it is not for everybody — the Alhambra's
      // mounted +2 read as a bare "+2 combat strength" until `class` was
      // printed, which is a card that lies by omission.
      const who = effect.class === undefined ? '' : ` for ${filterWords(effect.class)}`;
      // And who it is *against*, for the same reason: Lautaro's line read as a
      // flat "+3 combat strength" until the horses were printed.
      const against = effect.vsClass === undefined ? '' : ` against ${filterWords(effect.vsClass)}`;
      // A condition that takes an argument prints its own argument — see
      // `combatWhenWords`, the one place a condition is put into words.
      const when = combatWhenWords(effect.when);
      out.push({
        text: `${each} combat strength${who}${against}${scale} ${when}`.trim(),
      });
      return;
    }
    case 'unitStat': {
      const who = effect.class ? filterWords(effect.class) : 'all units';
      const where = WHERE_WORDS[effect.where ?? 'anywhere'];
      const amount = effect.amount;
      if (effect.stat === 'combatPercent') {
        // The kind of fight, where the row names one — the Statue of Zeus'
        // assault. Through the one condition-describer, so a share and a flat
        // line say "against cities" in the same words.
        const when = effect.when === undefined ? '' : ` ${combatWhenWords(effect.when)}`;
        out.push({ text: `${signed(amount)}% combat strength for ${who}${where}${when}` });
        return;
      }
      // **Charges are the one stat that is not a standing fact about a piece.**
      // Every other `unitStat` is asked of a unit that is already on the board —
      // `fullMovement`, `sightOf`, `healUnits` all read the card each time — but
      // `cardExtraCharges` is read exactly once, by `createUnit`, and the number
      // it hands over is written into `chargesLeft` and never revisited. So a
      // worker already standing in the field gains nothing when the Order is
      // slotted, and the sentence has to say so: "workers: +1 charge" promised a
      // fleet-wide refit that never happens. Said in the *card's* voice rather
      // than as a footnote, which is how the ratified text reads it.
      if (effect.stat === 'charges') {
        const charges = amount === 1 || amount === -1 ? 'charge' : 'charges';
        out.push({ text: `newly created ${who} gain ${signed(amount)} ${charges}${where}` });
        return;
      }
      out.push({ text: `${who}: ${signed(amount)} ${STAT_WORDS[effect.stat]}${where}` });
      return;
    }
    case 'unitStamp': {
      // "**Newly created**", exactly as the `charges` arm above says it, and for
      // that arm's reason: a stamp is written at the birth, so a soldier already
      // standing in the field gains nothing when the Order is slotted. A sentence
      // that promised a fleet-wide refit would be a card that lies.
      const hp = (effect.hp ?? 0);
      const strength = (effect.strength ?? 0);
      // Where the stamp is written, when the row narrows it to one town — the
      // Terracotta Army's "units built in this city". The same sentence-builder
      // every other scoped clause uses, so a stamp and a yield say "in every
      // city with a Cathedral" the same way.
      const born = effect.scope === undefined ? 'units' : `units in ${cityScopeWords(effect.scope)}`;
      if (hp !== 0) {
        out.push({ text: `newly created ${born} gain ${signed(hp)} maximum health` });
      }
      if (strength !== 0) {
        out.push({ text: `newly created ${born} gain ${signed(strength)} combat strength` });
      }
      return;
    }
    case 'rule':
      out.push({ text: FLAG_RULE_WORDS[effect.rule] });
      return;
    case 'windfallRider': {
      // The occasion, narrowed where the row narrows it — "killing a barbarian
      // unit" rather than "killing a unit". See `occasionWords`.
      const occasion = occasionWords(
        effect.occasion,
        effect.vsBarbarians === true,
        effect.capturedWonder === true,
        effect.wonder === true,
      );
      // The **grant first**, then the riders on it. Rites of Blood pays fifteen
      // faith and the age multiplies it; leading with the multiplier said the
      // second half of a sentence whose first half had not been printed yet.
      const grant = effect.grant;
      // The Order count rides as a **suffix on the figure it multiplies**,
      // unlike the age, and the difference is what the two say: "pays once more
      // for each age you have reached" is a whole sentence about the payout,
      // while "for each Order you have in a slot" is a *rate*, and a rate read
      // as a separate clause repeats itself once per grant on the card ("a kill
      // grants +5 science", "a kill pays once per Order", "a kill grants +5
      // culture", …). War Chief carries two grants, so it would say it twice.
      const per = effect.perSlottedOrder === true ? ' for each Order you have in a slot' : '';
      if (grant?.yield !== undefined && grant.amount !== undefined) {
        // A figure quoted in **turns** reads as turns, because that is the whole
        // sentence the card is making: "an extra turn of culture" is a promise
        // about the empire's own books, and printing the number the rate happens
        // to work out to today would be a card that says something different
        // every time it is looked at.
        if (grant.fromRate !== undefined) {
          const turns = grant.amount;
          // **A share of a turn reads as a share**, not as a fraction of one:
          // The Natural Philosophers pays a fifth of what the realm makes in a
          // year, and "0.2 extra turns of culture" is not a sentence anybody
          // has ever said out loud. Whole turns keep the words they had.
          const figure =
            Number.isInteger(turns)
              ? `${turns === 1 ? 'an extra turn' : `${turns} extra turns`} of ${grant.yield}`
              : `${Math.round(turns * 100)}% of a turn's ${grant.yield}`;
          out.push({ text: `${occasion} grants ${figure}${per}` });
        } else {
          out.push({
            text: `${occasion} grants ${signed(grant.amount)} ${grant.yield}${per}`,
          });
        }
      }
      if (grant?.renown !== undefined && grant.renown !== 0) {
        // Renown reads as renown and never as a voice: it is the bucket a great
        // person comes out of, and a player who has read the Reliquary knows
        // exactly what the word buys.
        out.push({ text: `${occasion} grants ${signed(grant.renown)} renown${per}` });
      }
      if (grant?.heal !== undefined) {
        // "**a further**" only where the occasion already pays a heal of its
        // own: pillaging heals `improvements.pillageHeal` to whoever struck the
        // works before a card has spoken, so a card that said "pillaging heals
        // 25" was quoting the base and promising nothing. A kill pays no heal at
        // all until The Oath-Bound says so, and "a further 15" there would have
        // been an increment on a number that does not exist.
        const further = OCCASIONS_THAT_HEAL.includes(effect.occasion) ? 'a further ' : '';
        out.push({
          text: `${occasion} heals ${further}${grant.heal}${per}`,
        });
      }
      if (grant?.timed !== undefined && grant.timed.effects.length > 0) {
        // Said in the **nested clauses' own words**, so a bill and a blessing
        // read alike and a shape added to the vocabulary is printed here without
        // this arm being touched. The duration trails, because a player reads
        // *what happens* first and *how long* second — a rite's label does the
        // same thing from the other end.
        const inner: CardClause[] = [];
        for (const nested of grant.timed.effects) describeEffect(nested, inner, subject);
        const turns = Math.max(1, grant.timed.turns);
        // **A bill and a blessing are the same shape and not the same
        // sentence.** Crassus hangs a penalty on the realm and The Triumphal Way
        // hangs a festival, so the verb is read off the nested clauses' own sign
        // rather than assumed: "costs your empire −1 happiness" is a double
        // negative, and "grants +5 happiness" is what the ratified text says.
        // A **percentage** is read the same way as a figure, and it has to be:
        // Hegemony hangs "+5% production in every city" on a capture, which is a
        // gift with no `amount` on it at all — and a clause read off nothing
        // defaults to the bill's sentence, so the row would have printed
        // "capturing a city costs your empire +5% production".
        //
        // **And a bag is read the same way as either** (batch GP1, 2026-09-09).
        // A `pays` row says its figure in the yield bag itself — Dinocrates'
        // "+3 production in every city" is `{ where: 'city', production: 3 }`,
        // with no `amount` and no `percent` anywhere on it — so a test that
        // knew only those two fields read the gift off nothing and printed
        // "completing a wonder costs your empire +3 production", which is the
        // exact double negative this comment already forbids one field over.
        // Three readings of "is this a gift", because the vocabulary has three
        // ways to write a figure and a shape added to it says so in one of them.
        const positiveBag = (nested: CardEffect): boolean =>
          VOICES.some((voice) => {
            const paid = (nested as Partial<Record<CityYieldKey, number>>)[voice];
            return typeof paid === 'number' && paid > 0;
          });
        const pays = grant.timed.effects.some(
          (nested) =>
            ('amount' in nested && typeof nested.amount === 'number' && nested.amount > 0) ||
            ('percent' in nested && typeof nested.percent === 'number' && nested.percent > 0) ||
            positiveBag(nested),
        );
        out.push({
          text:
            `${occasion} ${pays ? 'grants' : 'costs your empire'} ` +
            `${inner.map((clause) => clause.text).join('; ')} for ${turns} turns${per}`,
        });
      }
      if (grant?.healAll === true) {
        // A flag, so a sentence and not a figure — the ratified text is *heals
        // all*, and a number here would be a second, quieter rule.
        out.push({ text: `${occasion} heals every one of your units${per}` });
      }
      if (grant?.unit === 'randomMilitary') {
        out.push({ text: `${occasion} grants a random military unit${per}` });
      }
      if (grant?.pressure !== undefined && grant.pressure.amount !== 0) {
        // **The plain words** (hard rule 7): "pressure" is the ledger's word for
        // it, and what a player sees is their faith spreading to the towns near
        // where it happened. The range is said in hexes because it is the half a
        // player plans around — how close the fighting has to be.
        out.push({
          text:
            `${occasion} spreads your religion to every city within ` +
            `${grant.pressure.range} hexes${per}`,
        });
      }
      if (effect.percent !== undefined) {
        out.push({ text: `${occasion} pays ${signed(effect.percent)}%${per}` });
      }
      if (effect.perAge === true) {
        // The multiplier is the age *number* (`highestAge`), so "once for each
        // age you have reached" is the exact reading and not a rounding of one:
        // ×1 in the first age, ×3 in the third.
        out.push({ text: `${occasion} pays once for each age you have reached` });
      }
      // A rider that multiplies only the *occasion's own* figure has no clause
      // to hang the suffix on, so it gets the sentence instead. Nothing on the
      // table reads this way today; it is here so the shape cannot ship silent.
      if (per !== '' && grant === undefined && effect.percent === undefined) {
        out.push({ text: `${occasion} pays again${per}` });
      }
      return;
    }
    case 'foundingRider': {
      const limit = effect.maxCities === undefined ? '' : ` (first ${effect.maxCities} cities)`;
      if (effect.population !== undefined) {
        // "Citizens", never "population" (batch L1, §1b): the Compendium's word
        // for a town's people is the one every clause uses now, and a figure
        // quoted in it is a figure a player can point at on the city panel.
        const people = effect.population;
        out.push({
          text: `new cities start ${people} ${people === 1 ? 'citizen' : 'citizens'} larger${limit}`,
        });
      }
      if (effect.building !== undefined) {
        // The building's **name**, not its id: "a monument" is a lucky accident
        // of that row's spelling, and the next founding rider's would not be.
        out.push({
          text: `new cities are founded with ${buildingWords(effect.building)}${limit}`,
        });
      }
      if (effect.roads === true) {
        out.push({ text: `new cities are joined to your nearest city by road${limit}` });
      }
      return;
    }
    case 'offerRider': {
      // The two halves of the hook, each said the way it reads. A named rule is
      // already a whole sentence; a widening is a figure, and a figure is a
      // thing a player has to be told — "+1 card in every Statecraft draft".
      if (effect.rule !== undefined) {
        out.push({ text: OFFER_WORDS[effect.rule] });
        return;
      }
      if (effect.offer === undefined) return;
      const extra = (effect.extra ?? 1);
      out.push({
        text: `+${extra} ${extra === 1 ? 'card' : 'cards'} in ${OFFER_DRAFT_WORDS[effect.offer]}`,
      });
      return;
    }
    case 'routeRider': {
      // A figure, and a figure is a thing a player has to be told — "+1 trade
      // route". `offerRider`'s widening half, read the same way.
      const extra = (effect.extra ?? 1);
      out.push({ text: `+${extra} trade ${extra === 1 ? 'route' : 'routes'}` });
      return;
    }
    case 'effectAmplifier': {
      // Two dials, one clause each, and a row that turns both says both — the
      // flat step first, because that is the order the arithmetic takes it in.
      if (effect.amount !== undefined) {
        out.push({ text: AMPLIFIER_FLAT_WORDS[effect.target](effect.amount) });
      }
      if (effect.percent !== undefined) {
        out.push({ text: AMPLIFIER_WORDS[effect.target](effect.percent) });
      }
      return;
    }
    case 'meterRule': {
      // Two shapes wear this hook and they read differently. A **switch** — a
      // rule of the meters suspended, carried as `value: 1` because the shape
      // has no boolean — is already a whole sentence in `METER_RULE_WORDS`, and
      // "borders keep growing … is 1" was that sentence with its plumbing left
      // showing. A **number** is a figure a player has to be told.
      const words = METER_RULE_WORDS[effect.rule];
      if (METER_RULE_SWITCHES.includes(effect.rule)) {
        out.push({ text: words });
        return;
      }
      // A delta is a rise or a fall in a figure the player already knows, so it
      // is said that way — "the authority a captured city costs falls by 1" —
      // rather than as a bare signed number hanging off a noun phrase.
      const delta = effect.delta ?? 0;
      out.push({
        text:
          effect.value !== undefined
            ? `${words} is ${effect.value}`
            : `${words} ${delta < 0 ? 'falls' : 'rises'} by ${Math.abs(delta)}`,
      });
      return;
    }
    case 'conditionRule': {
      const inner: CardClause[] = [];
      for (const nested of effect.then) describeEffect(nested, inner, subject);
      out.push({
        text: `${CONDITION_WORDS[effect.when.test]}${conditionValue(effect.when)}: ${inner
          .map((clause) => clause.text)
          .join('; ')}`,
      });
      return;
    }
    case 'cityStat': {
      const stat = effect.stat === 'defense' ? 'city defence' : 'city sight';
      // **What buys one helping**, where the row is counted — Siegecraft's
      // citizens on the walls. The count's own noun, the same table a `pays`
      // count prints through, so one card counting townsfolk for hammers and
      // another counting them for walls read as the same sentence.
      const each =
        effect.count === undefined
          ? ''
          : ` per ${countWords(effect.per, countNoun({ kind: 'pays', where: 'city', basis: 'count', count: effect.count, within: 'city' }, ''))}`;
      out.push({
        // **The subject, not "every city"** (batch L1): the Great Wall's five
        // points of defence stand in the town that holds the stones and a
        // Blessing of Arms in the town keeping the rite, and both said "every
        // city" until the class supplied the word. See `scopeWordsFor`.
        text: `${scopeWordsFor(subject, effect.scope)}: ${signed(effect.amount)} ${stat}${each}`,
      });
      return;
    }
    case 'metaRule':
      out.push({
        text: `a newly placed Order is locked for ${effect.value} turns instead of ${METER.sealTurns}`,
      });
      return;
    case 'periodicOffer':
      out.push({
        text: `every ${effect.every} turns, you are offered a find ${
          effect.site === 'ruins' ? 'from a ruin' : 'from a village'
        }`,
      });
      return;
    case 'periodicMuster': {
      // The piece names itself where the row names one, and asks the roster
      // where it does not — `grantWords`' sentence, said on a cadence.
      const what =
        effect.unit === 'bestMelee'
          ? 'the best melee unit you can build'
          : `${indefinite(unitDef(effect.unit).name)} ${ref('unit', effect.unit, unitDef(effect.unit).name)}`;
      // The mark on the levy, where the row makes one — "and moves one further,
      // for good". Said as a trailing clause because it is a fact about the
      // *piece* and not about the cadence, and only the marks a row actually
      // carries are printed.
      const marks: string[] = [];
      const stamp = effect.stamp;
      if (stamp?.movement !== undefined) marks.push(`${signed(stamp.movement)} movement`);
      if (stamp?.strength !== undefined) marks.push(`${signed(stamp.strength)} combat strength`);
      if (stamp?.hp !== undefined) marks.push(`${signed(stamp.hp)} health`);
      const kept =
        marks.length === 0 ? '' : `, and keeps ${listWords(marks)} for the rest of the game`;
      out.push({
        text: `every ${effect.every} turns, ${what} musters in your capital${kept}`,
      });
      return;
    }
    case 'landfall': {
      // What it hangs is said in the **hung effects' own words**, so a landing
      // that gives strength and a card that gives strength read the same and a
      // second shape added to the bag prints itself here. The duration trails,
      // because "for three turns" is the half a player has to plan around.
      const inner = describeEffects(effect.effects, subject)
        .filter((clause) => clause.deferred !== true)
        .map((clause) => clause.text);
      if (inner.length === 0) return;
      out.push({
        text: `a unit of yours that comes ashore from the water gains ${listWords(inner)} for ${
          effect.turns
        } turns`,
      });
      return;
    }
    case 'unlocksBuilding': {
      // No longer struck through: buildings can be bought (Entry XXIX) and
      // `cardUnlocksBuilding` is read by `isUnlocked`, so The Gilded Court
      // really does hand the Gilded Hall over.
      //
      // **And it says what the building does** (the playthrough note of
      // 2026-09-05): a charter whose whole face read "Unlocks the Chapel" told a
      // player drafting it the name of a thing and nothing else, and the name of
      // a thing is not a reason to spend a slot on it. The clause is the
      // building's **own** description (`describeBuildingRow`) rather than a
      // sentence written onto the card, so the Compendium's shelf and this face
      // cannot disagree and a re-cut building re-prints itself here.
      //
      // Live clauses only: a deferred half is *struck through* where it is
      // printed, and there is no striking half of a sentence.
      const does = describeBuildingRow(effect.building)
        .filter((clause) => clause.deferred !== true)
        .map((clause) => clause.text)
        .join('; ');
      out.push({
        text: `unlocks the ${buildingName(effect.building)}${does === '' ? '' : ` — ${does}`}`,
      });
      return;
    }
    case 'grantsAbility': {
      // **The ability's own sentence, and the node it need no longer wait
      // for.** The summary is the word table `data/techs.json` already keeps
      // for the star chart's card, so a verb re-worded there re-words itself
      // here and the two cannot come apart — the same bargain the charter
      // clause above strikes with `describeBuildingRow`.
      //
      // The technology is named because that is the whole of what the card
      // buys: "great people may be called" says nothing to a player who does
      // not know they were waiting. It is a keyword ref, so the name leads
      // where a player would expect it to.
      const gate = ABILITY_TECH.get(effect.ability);
      const summary = abilityDef(effect.ability).summary.replace(/\.$/, '');
      const plain = summary.charAt(0).toLowerCase() + summary.slice(1);
      const early =
        gate === undefined ? '' : ` without waiting for ${ref('tech', gate, techDef(gate).name)}`;
      out.push({ text: `${plain}${early}` });
      return;
    }
    case 'unlocksUnit': {
      // `unlocksBuilding`'s clause one table over, and a rule from the day it
      // was written: `cardUnlocksUnit` is read by `isUnlocked`, so Holy Order
      // really does hand the Templars over and this face is not a promise.
      //
      // It names the **bank**, because the whole of what the row is is a piece
      // no queue will take — a clause that said only "unlocks the Knights
      // Templar" would leave a player looking for them in a build list.
      const def = unitDef(effect.unit);
      const marked = ref('unit', effect.unit, def.name);
      const bank = def.purchase?.currency;
      out.push({
        text: `unlocks the ${marked}${bank === undefined ? '' : `, called with ${bank}`}`,
      });
      return;
    }
    case 'pantheonSlots': {
      const slots = effect.amount;
      out.push({ text: `${signed(slots)} pantheon ${slots === 1 || slots === -1 ? 'slot' : 'slots'}` });
      return;
    }
    case 'purchaseRider': {
      const percent = effect.percent;
      // What the rider rides on, in the row's own terms: a filter can name a
      // kind of unit and cannot name a building at all, so `on` supplies the
      // noun and `class` narrows it only where narrowing means anything.
      const on = effect.on ?? 'unit';
      const what =
        on === 'building'
          ? 'buildings'
          : on === 'all'
            ? `${filterWords(effect.class)} and buildings`
            : filterWords(effect.class);
      // "cost −25%", not "−25% cost": the sign belongs to the price, and a
      // discount read as a bonus is the one thing this line must not do.
      out.push({
        text: `${what} cost ${percent < 0 ? '−' : '+'}${Math.abs(percent)}% to buy`,
      });
      return;
    }
    case 'projectRider': {
      const bag = bagWords(effect.pays);
      if (bag) out.push({ text: `${projectDef(effect.project).name} pays ${bag}` });
      return;
    }
    case 'renown': {
      // "per turn" is load-bearing and never trimmed: every other count on a
      // card is a standing fact, and this one is a trickle. The family, where a
      // card names one, trails as its own phrase rather than modifying "renown"
      // — a player reads *what they gain* first and *whom it favours* second.
      const where =
        effect.per === 'city'
          ? ' in every city'
          : effect.per === 'wonder'
            ? ' per wonder you hold'
            : effect.per === 'buildingOfCategory'
              ? // The shelf names itself, because "per building" would not say
                // which — Patrons pays for the culture houses and nothing else.
                ` per ${effect.category ?? ''} building you hold`
              : '';
      const family = effect.family === undefined ? '' : `, favouring ${effect.family}s`;
      out.push({
        text: `${signed(effect.amount)} renown per turn${where}${family}`,
      });
      return;
    }
    case 'pressureRule': {
      const delta = effect.delta;
      out.push({ text: PRESSURE_RULE_WORDS[effect.rule](delta) });
      return;
    }
    case 'pressure':
      out.push({
        text:
          `spreads your religion ${signed(effect.amount)} faith ` +
          `to every city within ${effect.range} hexes`,
      });
      return;
    case 'upkeepRebate': {
      const who = effect.class ? filterWords(effect.class) : 'all units';
      const where = WHERE_WORDS[effect.where ?? 'anywhere'];
      if (effect.free === true) {
        out.push({ text: `${who} cost no gold in maintenance${where}` });
        return;
      }
      const off = (effect.amount ?? 0);
      out.push({ text: `${who} cost ${off} less gold in maintenance${where}` });
      return;
    }
    // The same sentence with the sign turned round — "more" where the rebate
    // says "less", and the same two narrowings read the same way.
    case 'upkeepSurcharge': {
      const who = effect.class ? filterWords(effect.class) : 'all units';
      const where = WHERE_WORDS[effect.where ?? 'anywhere'];
      out.push({ text: `${who} cost ${effect.amount} more gold in maintenance${where}` });
      return;
    }
    case 'cardYieldAmplifier': {
      // Two sentences, because the two dials say different things: the flat is
      // "one more, on every line the other cards pay" and the share is "worth
      // half again". A row carrying both prints both, in that order.
      const voice = effect.yield === 'all' ? 'a yield' : effect.yield;
      const where = effect.scope === undefined ? '' : ` in ${scopeWordsFor(subject, effect.scope)}`;
      if ((effect.amount ?? 0) !== 0) {
        out.push({
          text:
            `your Orders that give ${voice} give ${signed(effect.amount ?? 0)} more` +
            ` on every line they pay${where}`,
        });
      }
      if ((effect.percent ?? 0) !== 0) {
        out.push({
          text: `what your other Orders pay in ${voice} is ${signed(effect.percent ?? 0)}% more${where}`,
        });
      }
      return;
    }
    case 'buildingYieldPercent': {
      const voice = effect.yield === undefined || effect.yield === 'all' ? '' : ` ${effect.yield}`;
      const last = effect.appliedLast === true ? ', counted after every other bonus on them' : '';
      const where = effect.scope === undefined ? '' : ` in ${scopeWordsFor(subject, effect.scope)}`;
      // No "more" after a signed percent — see the works' clause in `describePays`.
      out.push({
        text:
          `your ${buildingClassWords(effect)} pay ${signed(effect.percent)}%` +
          `${voice}${where}${last}`,
      });
      return;
    }
    case 'slotPosition': {
      const flavour = effect.slot === undefined ? '' : ` ${SLOT_WORDS[effect.slot].toLowerCase()}`;
      out.push({
        text:
          `the Order in your ${ordinalWords(effect.position)}${flavour} slot` +
          ` pays ${timesWords(effect.factor)}`,
      });
      return;
    }
    case 'periodic': {
      const what = effect.pays === 'renown' ? 'renown' : effect.pays;
      const when = `every ${Math.max(PERIODIC_FLOOR, Math.floor(effect.everyTurns))} turns`;
      if (effect.count === undefined) {
        out.push({ text: `${when}, ${signed(Math.floor(effect.amount ?? 0))} ${what}` });
        return;
      }
      const each = effect.amount ?? 1;
      const probe = periodicProbe(effect);
      const noun = countWords(effect.per, countNoun(probe, countPlace(probe, subject).counted));
      out.push({ text: `${when}, ${each} ${what} for every ${noun}` });
      return;
    }
    case 'periodShorten':
      out.push({
        text:
          `your Orders that pay on a cadence come round ${effect.turns}` +
          ` turn${effect.turns === 1 ? '' : 's'} sooner`,
      });
      return;
    case 'cityRenownPercent':
      out.push({
        // Two scales, one clause each (batch B2): the empire-wide reading is a
        // share of everything the realm earns every turn and has no town to name,
        // so a sentence that named one would be the town-scoped share's words
        // said about the wrong subject. See `CardCityRenownPercentEffect.where`.
        // The figure **leads** in both, since batch L1: dropping the "more" a
        // signed percent already says left "earns +50% renown", which reads as
        // half the renown rather than half again. Said as the modifier it is,
        // in the shape every other percentage clause on a card is said in.
        text:
          effect.where === 'empire'
            ? `${signed(effect.percent)}% renown`
            : `${signed(effect.percent)}% renown in ${scopeWordsFor(subject, effect.scope)}`,
      });
      return;
    case 'beadPerOccasion': {
      // The deed first and the bead second, because the deed is the part a
      // player decides. The bead is named — it is a card on the rod like any
      // other, and a keyword ref so the reader can go and read it — and the
      // rhythm trails only where there is one to say.
      const every = Math.max(1, Math.floor(effect.every ?? 1));
      const deed = ORDER_BEAD_OCCASION_WORDS[effect.occasion];
      const rhythm = every > 1 ? `every ${ordinalWords(every)} time ` : 'each time ';
      const name = beadGrantDef(effect.bead).name;
      out.push({ text: `${rhythm}${deed}, a glass bead of your own — ${ref('bead', effect.bead, name)}` });
      return;
    }
    default: {
      const unhandled: never = kind;
      void unhandled;
      return;
    }
  }
}

/**
 * Which buildings a `buildingYieldPercent` names, in a player's words.
 *
 * The four selectors said the way the row means them: `building` names one row
 * and is therefore the whole phrase (and a **keyword ref**, so the reader can go
 * and read what a Temple is); `wonder` names the class; `category` is what a
 * building is *for*; and `pays` is the voice it actually supplies — see
 * `buildingMatchesYieldPercent`, which answers the same question for the
 * arithmetic.
 *
 * The named row **short-circuits**, because the words would otherwise read "your
 * faith Temples", which says the same thing twice and is worse in every register
 * a card is printed in. A row naming a building alongside a class is asking for
 * the intersection, and the intersection of "Temples" with anything is Temples or
 * nothing at all — so the narrower phrase is the honest one and the selector the
 * arithmetic still folds in cannot make it a lie.
 */
function buildingClassWords(effect: CardBuildingYieldPercentEffect): string {
  if (effect.building !== undefined) {
    const def = buildingDef(effect.building);
    return ref('building', effect.building, buildingPlural(def.name, 2));
  }
  const noun = effect.wonder === true ? 'wonders' : 'buildings';
  const kind = effect.category === undefined ? noun : `${effect.category} ${noun}`;
  return effect.pays === undefined ? kind : `${kind} that supply ${effect.pays}`;
}

/**
 * The four last-age deeds, in the words a card says them in.
 *
 * Written as the tail of "each time …" so the clause reads as one sentence, and
 * plain throughout: no identifier, no numeral, and the *deed* rather than the
 * seam that hooks it. See `OrderBeadOccasion`.
 */
const ORDER_BEAD_OCCASION_WORDS: Record<OrderBeadOccasion, string> = {
  lastAgeTechnology: 'you finish a technology of the last age',
  draftPassed: 'you turn down a draft',
  cityRazed: 'you put a city to the torch',
  proclamationMade: 'a prophet of yours proclaims',
};

/** Positions, in the words a slot is counted in. See `CardSlotPositionEffect`. */
const ORDINAL_WORDS: readonly string[] = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];

function ordinalWords(position: number): string {
  return ORDINAL_WORDS[position - 1] ?? `${position}th`;
}

/** "twice", "three times" — what a `factor` multiplies a card's lines by. */
function timesWords(factor: number): string {
  if (factor === 2) return 'twice';
  if (factor === 3) return 'three times over';
  return `${factor} times over`;
}

/**
 * A periodic boon's count, wearing the shape `countNoun`, `countOf` and the
 * bot's `explainCounted` all read.
 *
 * The row carries the count's arguments itself (`CardPeriodicEffect`), so the
 * probe is a translation and never a second table: one description of a count,
 * one arithmetic for it and one price, whichever shape asked. Exported for the
 * bot on `countOf`'s own licence — a *reading*, never a second evaluator.
 */
export function periodicProbe(effect: CardPeriodicEffect): CardPaysEffect {
  return {
    kind: 'pays',
    basis: 'count',
    ...PERIODIC_PROBE,
    count: effect.count ?? 'cities',
    per: effect.per,
    max: effect.max,
    building: effect.building,
    category: effect.category,
    categories: effect.categories,
    slot: effect.slot,
    voice: effect.voice,
    class: effect.class,
    tally: effect.tally,
  };
}

/**
 * The rules of the tide, as **formatters** rather than as stems — `AMPLIFIER_WORDS`'
 * bargain, and for its reason: a range and a resistance do not take the same
 * sentence, and `templeForeignPercent` reads *backwards* (a smaller number is a
 * stronger temple), so a shared "+N to X" would have printed the one clause in
 * the pool that a player could misread as a weakening.
 */
const PRESSURE_RULE_WORDS: Record<PressureRuleId, (delta: number) => string> = {
  siteRange: (delta) => `holy sites reach ${signed(delta)} hexes further`,
  siteStrength: (delta) => `holy sites spread ${signed(delta)} faith`,
  cityRange: (delta) => `cities that follow reach ${signed(delta)} hexes further`,
  cityStrength: (delta) => `cities that follow spread ${signed(delta)} faith`,
  roadStrength: (delta) => `roads carry ${signed(delta)} faith`,
  routeStrength: (delta) => `caravans carry ${signed(delta)} faith`,
  capitalStrength: (delta) => `your capital holds ${signed(delta)} faith of its own`,
  templeOwnPercent: (delta) => `a Temple holds its own faith ${signed(delta)}% harder`,
  templeForeignPercent: (delta) =>
    delta < 0
      ? `a Temple turns away ${-delta}% more of a foreign faith`
      : `a Temple turns away ${delta}% less of a foreign faith`,
  bombRange: (delta) => `a proclamation reaches ${signed(delta)} hexes further`,
  bombLump: (delta) => `a proclamation presses ${signed(delta)} faith harder`,
  routeBothWays: (delta) =>
    delta > 0 ? 'a caravan carries your faith both ways along its route' : 'a caravan carries your faith one way',
};

/**
 * What a completion grant hands over, in words. See `CompletionGrant`.
 *
 * "on completion" leads every one of them, because that is the whole difference
 * between a grant and an effect: everything else on a card is true for as long
 * as the card is held, and this is true once.
 */
function grantWords(grant: CompletionGrant): string {
  if (grant.grant === 'tech') return 'on completion, the technology you are researching is finished';
  if (grant.grant === 'doctrineDraft') return 'on completion, a Doctrine draft opens';
  if (grant.grant === 'bead') return 'on completion, a glass bead is yours';
  // Not "a free rung": a rung is the ladder's word for a threshold the bank
  // crossed, and this is the stones paying instead of the bank. What a player
  // needs is that a god arrives and that it costs them nothing.
  if (grant.grant === 'faithRung') return 'on completion, a god is named, and your faith is not spent';
  if (grant.grant === 'greatPerson') {
    return grant.family === undefined
      ? 'on completion, a great person is offered'
      : `on completion, a great person of the ${grant.family}s is offered`;
  }
  if (grant.grant === 'building') {
    const name = buildingDef(grant.building).name;
    return `on completion, ${indefinite(name)} ${ref('building', grant.building, name)} is raised here as well`;
  }
  const what =
    grant.unit === 'bestMelee'
      ? 'the best melee unit you can build'
      : `${indefinite(unitDef(grant.unit).name)} ${ref('unit', grant.unit, unitDef(grant.unit).name)}`;
  return `on completion, ${what} joins you`;
}

function conditionValue(when: EmpireCondition): string {
  if (when.test === 'cityCountAtMost' || when.test === 'cityCountAtLeast') {
    return ` ${when.value} cities`;
  }
  // "while any city is building a wonder" · "while your capital is building a
  // wonder". The whole clause, because `CONDITION_WORDS` holds only the "while"
  // — one entry for both readings, `onFeature`'s bargain a third time.
  if (when.test === 'queueHolds') {
    const where = when.where === 'capital' ? 'your capital is' : 'any city is';
    return ` ${where} building ${when.category === 'unit' ? 'a unit' : `a ${when.category}`}`;
  }
  return '';
}

/**
 * "per adjacent friendly combat unit" · "per 3 population" — a helping, in
 * words, with the **1 left out**.
 *
 * One helping of a thing is the thing, so `per: 1` prints no number and takes
 * the singular; anything else prints the number and takes the plural. The one
 * place either decision is made, because `combatLine`, `countScaled` and
 * `rateConversion` all print helpings and all three used to print them
 * differently.
 */
function countWords(per: number | undefined, words: PluralWords): string {
  return per === undefined || per === 1 ? words.one : `${per} ${words.many}`;
}

/** A noun in both numbers, for `countWords`. */
interface PluralWords {
  one: string;
  many: string;
}

/**
 * The noun of a row that names **no count at all** — batch E5's one silence.
 *
 * `count` is one field of the one `pays` shape now, so the type admits a row
 * that asks nothing. A card-shaped nothing is what such a row is worth, which is
 * the same answer `countOf` gives it (nought) and the same silence a `tally`
 * naming no occasion keeps. No live row is one.
 */
const EMPTY_WORDS: PluralWords = { one: '', many: '' };

/**
 * "military Order you have in a slot" — one flavour of council, in both numbers.
 *
 * Written once because **two** tables print it: `countNoun` for the ledger's
 * deck-readers and `scaleNoun` for the combat one, which are the same sentence
 * about the same council and would otherwise be two. The words match the ones
 * `perSlottedOrder` already prints ("for each Order you have in a slot"), so the
 * War Chief's multiplier and The Guild Charter's count read as the same thing
 * counted two ways.
 */
function slotFlavourWords(flavour: SlotType): PluralWords {
  return {
    one: `${flavour} Order you have in a slot`,
    many: `${flavour} Orders you have in a slot`,
  };
}

/**
 * What a `countScaled` is counting, as a noun in both numbers.
 *
 * `COUNT_WORDS` for every count whose noun is fixed, and the *building's own
 * name* for the one count that takes an argument — so "+1 happiness per
 * Barracks" and "per Temple" are one shape, one table entry and two data rows.
 */
function countNoun(effect: CardPaysEffect, place = ''): PluralWords {
  // **The town the count is taken in, where the noun carries one** (batch L1).
  // Eight counts can only ever be asked of a town, and each of them wrote the
  // town into its own words — "building in this city", "combat unit standing in
  // the city", "unimproved hex worked here" — which is right for a building and
  // wrong for every card read at the draft. The place is composed in rather
  // than looked up because English puts it in a different position in each of
  // them, and a table of stems plus a tail would have printed "building that
  // supplies science there". See `TOWN_COUNT_WORDS`.
  if (place !== '' && place !== 'in this city' && effect.count !== undefined) {
    const town = TOWN_COUNT_WORDS[effect.count];
    if (town !== undefined) return town(place);
  }
  // The capital's own people, said once. `where: 'capital'` already names the
  // town the figure lands in, and "in your capital per 2 citizens in your
  // capital" is the plumbing showing through Fire Keepers — whose ratified text
  // says "for every 2 citizens living there".
  if (effect.count === 'capitalPopulation' && effect.where === 'capital') {
    return { one: 'citizen there', many: 'citizens there' };
  }
  if (effect.count === 'buildingsOfKind' && effect.building !== undefined) {
    // Marked in **both** numbers: the plural is composed off the plain name and
    // then wrapped, so "per Library" and "per Libraries" are one link with two
    // sets of words in it. Pluralising a marked string would have put the `s`
    // after the closing brackets.
    const name = buildingDef(effect.building).name;
    const kind = isWonder(effect.building) ? 'wonder' : 'building';
    return {
      one: ref(kind, effect.building, name),
      many: ref(kind, effect.building, buildingPlural(name, 2)),
    };
  }
  // The filtered count, said the way the filter says it everywhere else —
  // "per melee unit in the field". `filterWords` is already plural ("melee
  // units"), so the singular trims the noun and the plural takes it whole.
  if (effect.count === 'unitsInField' && effect.class !== undefined) {
    const many = `${filterWords(effect.class)} in the field`;
    return { one: many.replace(/\bunits\b/, 'unit'), many };
  }
  // The categorised count, said as what the buildings are *for* — "per gold
  // building". `buildingsOfKind`'s bargain one grade wider.
  if (effect.count === 'buildingsOfCategory' && effect.category !== undefined) {
    return {
      one: `${effect.category} building`,
      many: `${effect.category} buildings`,
    };
  }
  // The same bargain asked of the tide — "per faith building in a city that
  // follows you". `buildingsOfCategory`'s clause with the world's following
  // towns in place of this empire's own.
  if (effect.count === 'followingBuildingsOfCategory' && effect.category !== undefined) {
    return {
      one: `${effect.category} building in a city that follows you`,
      many: `${effect.category} buildings in cities that follow you`,
    };
  }
  // The same bargain over a list — "per science or faith building". The list's
  // own order, because a row's order is what a designer wrote.
  if (effect.count === 'buildingsOfCategories' && effect.categories !== undefined) {
    const kinds = effect.categories;
    const words =
      kinds.length <= 1
        ? (kinds[0] ?? '')
        : `${kinds.slice(0, -1).join(', ')} or ${kinds[kinds.length - 1]}`;
    return { one: `${words} building`, many: `${words} buildings` };
  }
  // The ledger's count, said as the column it reads — "per science your empire
  // makes a turn". `buildingsOfKind`'s bargain a seventh time.
  if (effect.count === 'empireYield' && effect.voice !== undefined) {
    const words = `${effect.voice} your empire makes a turn`;
    return { one: words, many: words };
  }
  // The deck-readers' count, said as the flavour the player drafts by — "per
  // economic Order you have in a slot". `buildingsOfKind`'s bargain a fourth
  // time: the argument is printed here so the three rows are one table entry.
  if (effect.count === 'slottedOrdersOfSlot' && effect.slot !== undefined) {
    return slotFlavourWords(effect.slot);
  }
  // The growing cards' count, said as the *moment* the card watches for — "per
  // barbarian you have killed". `buildingsOfKind`'s bargain a sixth time: the
  // argument is printed here, so five cards are one table entry.
  if (effect.count === 'tally' && effect.tally !== undefined) {
    return TALLY_WORDS[effect.tally];
  }
  return effect.count === undefined ? EMPTY_WORDS : COUNT_WORDS[effect.count];
}

/**
 * The eight town-scoped counts, said of a town the clause has to **name** —
 * `COUNT_WORDS`' entries with the place taken out and put back where each
 * sentence wants it (batch L1, §1b).
 *
 * Formatters rather than stems for `PRESSURE_RULE_WORDS`' reason exactly: the
 * place goes after "building", inside "building … that supplies science", and
 * after the participle in "combat unit standing …", and one shared tail would
 * have printed at most one of the three correctly.
 *
 * The argument is `countPlace`'s `counted` — "there" for a line paid town by
 * town, "in your cities" for one the realm is paid once for. A `'here'` subject
 * never reaches this table: its clause is printed beside the town it is about
 * and keeps `COUNT_WORDS`' own words, which is why those still say "this city".
 */
const TOWN_COUNT_WORDS: Partial<Record<CountKind, (at: string) => PluralWords>> = {
  buildingsInCity: (at) => ({ one: `building ${at}`, many: `buildings ${at}` }),
  workedTilesInCity: (at) => ({ one: `hex worked ${at}`, many: `hexes worked ${at}` }),
  workedUnimprovedTiles: (at) => ({
    one: `unimproved hex worked ${at}`,
    many: `unimproved hexes worked ${at}`,
  }),
  workedHills: (at) => ({ one: `worked hill hex ${at}`, many: `worked hill hexes ${at}` }),
  scienceBuildings: (at) => ({
    one: `building ${at} that supplies science`,
    many: `buildings ${at} that supply science`,
  }),
  garrison: (at) => ({
    one: `combat unit standing ${at}`,
    many: `combat units standing ${at}`,
  }),
  garrisonWatch: (at) => ({
    one: `fortification level among the units ${at}`,
    many: `fortification levels among the units ${at}`,
  }),
  defensiveBuildings: (at) => ({ one: `fortification ${at}`, many: `fortifications ${at}` }),
};

/**
 * Does this count's own noun name a town? See `TOWN_COUNT_WORDS`.
 *
 * The one question the counted clause asks before it appends a place: a count
 * that says where it is taken says it once, and a count that does not — a
 * town's citizens, its luxuries, its production houses — takes the place as a
 * tail.
 */
function countNamesItsTown(effect: CardPaysEffect): boolean {
  return effect.count !== undefined && TOWN_COUNT_WORDS[effect.count] !== undefined;
}

/**
 * What a `combatLine`'s `scaled` clause is counting, as a noun in both numbers.
 *
 * `countNoun`'s twin one table over, and it exists for the same reason: the one
 * count that takes an argument names it on the scale, so "per great general" and
 * "per great engineer" are one entry in `SCALE_WORDS` and two data rows.
 */
function scaleNoun(scale: CombatScale): PluralWords {
  if (scale.count === 'slottedOrdersOfSlot' && scale.slot !== undefined) {
    return slotFlavourWords(scale.slot);
  }
  if (scale.count === 'greatPeopleOfFamily') {
    const who = scale.family === undefined ? 'great person' : `great ${scale.family}`;
    const many = scale.family === undefined ? 'great people' : `great ${scale.family}s`;
    return { one: `${who} earned this game`, many: `${many} earned this game` };
  }
  return SCALE_WORDS[scale.count];
}

/**
 * A city scope as a **noun phrase**: "every city on fresh water with a Shrine",
 * "your capital", "every city of 5+".
 *
 * Deliberately *not* `scopeNote`, and the split is the whole of this pass's
 * scope fix. `scopeNote` is the **label** on a breakdown line ("Harbour Dues ·
 * coastal city") and is free to be a fragment; this is read inside a sentence,
 * where the same fragment came out as "+2 science in every size 5+" and "−10%
 * food in every no fresh water". So the phrase is *built* rather than looked
 * up: every scope contributes an adjective ("coastal"), a qualifier ("on fresh
 * water"), or both, and the composite merges them — which is what turns "fresh
 * water + shrine" into "every city on fresh water with a Shrine".
 */
interface ScopePhrase {
  adjectives: string[];
  qualifiers: string[];
}

function scopePhrase(scope: CityScope, into: ScopePhrase): void {
  const test = scope.test;
  switch (test) {
    case 'coastal':
      into.adjectives.push('coastal');
      return;
    case 'freshwater':
      into.qualifiers.push('on fresh water');
      return;
    case 'notFreshwater':
      into.qualifiers.push('without fresh water');
      return;
    case 'mountainAdjacent':
      // A named radius says so in hexes; the default is "beside", which is the
      // word the ring of six has always been printed as.
      into.qualifiers.push(
        scope.radius !== undefined && scope.radius > 1
          ? `with a mountain within ${scope.radius} hexes`
          : 'beside a mountain',
      );
      return;
    case 'adjacentImprovement':
      // The works named the way a tile condition names them — article outside
      // the mark, because "a" has no page in the book (`buildingWords`).
      into.qualifiers.push(
        `beside ${indefinite(improvementDef(scope.improvement).name)} ` +
          `${ref('improvement', scope.improvement, improvementDef(scope.improvement).name)}`,
      );
      return;
    case 'adjacentGreatWork':
      into.qualifiers.push("beside a great person's work");
      return;
    case 'onResourceKind':
      // "settled on a luxury", which is where the settler stopped — not what the
      // borders later took in, which is `holdingCategory` and a different card.
      into.qualifiers.push(`settled on ${indefinite(scope.kind)} ${scope.kind} resource`);
      return;
    case 'queueHolds':
      into.qualifiers.push(`while it is building ${indefinite(scope.category)} ${scope.category}`);
      return;
    case 'frontier':
      // A qualifier and not an adjective, for `notCapital`'s reason one step
      // further: "frontier" is a word the game never defines anywhere else, and
      // the rule it stands for is a distance to somebody else's ground.
      into.qualifiers.push("near another empire's territory");
      return;
    case 'captured':
      into.adjectives.push('captured');
      return;
    case 'connected':
      // A qualifier and not an adjective: "connected city" is a word the game
      // never defines, and what the rule stands for is a road that reaches home.
      into.qualifiers.push('joined to your capital by road');
      return;
    case 'capital':
      into.adjectives.push('capital');
      return;
    case 'notCapital':
      // A qualifier and not an adjective: "every city but your capital" reads,
      // and "every non-capital city" is a form no ratified row uses.
      into.qualifiers.push('but your capital');
      return;
    case 'onHills':
      into.qualifiers.push('on hills');
      return;
    case 'populationAtLeast':
      // **"of 6 or more citizens", never "of 6+"** (batch L1, §1c): the shorthand
      // is the city panel's, where a size sits beside a label that says what it
      // counts, and inside a sentence it is a figure with no noun on it.
      into.qualifiers.push(`of ${scope.value} or more citizens`);
      return;
    case 'populationAtMost':
      // The same threshold read downward — never "of −4", which would print a
      // size nobody can have.
      into.qualifiers.push(`of ${scope.value} or fewer citizens`);
      return;
    case 'holding':
      into.qualifiers.push(
        `holding ${scope.resources.map((id) => ref('resource', id, resourceDef(id).name)).join(' or ')}`,
      );
      return;
    case 'holdingCategory':
      into.qualifiers.push(`holding an improved ${scope.category} resource`);
      return;
    case 'hasBuilding':
      into.qualifiers.push(`with ${buildingWords(scope.building)}`);
      return;
    case 'hasBuildingYielding':
      into.qualifiers.push(
        scope.wonder === true
          ? `holding a wonder that supplies ${scope.yields}`
          : `with a building that supplies ${scope.yields}`,
      );
      return;
    case 'onTerrain':
      into.adjectives.push(scope.terrain);
      return;
    case 'terrainBeside':
      // A qualifier and not an adjective, `terrainInBorders`' reason exactly:
      // "every desert city" would name the hex the centre stands on, which is
      // the neighbouring scope and a different card. "On or beside" is the whole
      // of the rule in the words the ruling was given in.
      into.qualifiers.push(`on or beside ${scope.terrain}`);
      return;
    case 'terrainInBorders':
      // A qualifier and not an adjective, because the ground is not what the
      // town *is*: "every mountain city" would name the hex the centre stands
      // on, which is the neighbouring scope and a different card.
      into.qualifiers.push(`with a ${scope.terrain} hex inside its borders`);
      return;
    case 'hasImprovement':
      // `terrainInBorders`' phrasing exactly, asked of the works: the quarry is
      // something the town *has*, not something the town *is*.
      into.qualifiers.push(
        `with ${indefinite(improvementDef(scope.improvement).name)} ` +
          `${ref('improvement', scope.improvement, improvementDef(scope.improvement).name)}`,
      );
      return;
    case 'garrisoned':
      // The plain words (hard rule 7): "garrisoned" is a word the game never
      // defines, and what the rule stands for is a soldier standing in the town.
      into.qualifiers.push('with a unit standing in it');
      return;
    case 'keepingRite':
      // The plain words again: a town "keeping a rite" is a town where one is
      // being performed, which is the sentence the rite panel itself uses.
      into.qualifiers.push('while it is keeping a rite');
      return;
    case 'follows':
      // "your religion" was the old ruling's wording and it is now wrong twice
      // over: the card may be printing in a compendium nobody's seat owns, and
      // a follower belief pays whoever holds the town rather than whoever
      // founded the faith.
      into.qualifiers.push('that follows the religion');
      return;
    case 'newest':
      // Only ever reached inside a composite — on its own the scope is one town
      // and `scopeWords` says "your newest city", the sentence `capital` gets
      // and for its reason: a scope that admits exactly one place does not read
      // as "every …".
      into.adjectives.push('newest');
      return;
    case 'all':
      for (const inner of scope.of) scopePhrase(inner, into);
      return;
    case 'any':
      // A disjunction is **one qualifier**, built from the inner phrases and
      // joined with "or": "with a Pasture or a Camp". Composing it here rather
      // than merging the halves into the surrounding phrase is the whole
      // difference between the two composites — `all` merges because every one
      // of its clauses is true of the town, and this one must not, because only
      // one of them is.
      into.qualifiers.push(anyPhrase(scope.of));
      return;
    case 'routeEndsHere':
      // The plain words: what the town has is caravans arriving, which is the
      // sentence the trade screen itself uses.
      into.qualifiers.push('a trade route ends at');
      return;
    default: {
      const unhandled: never = test;
      void unhandled;
      return;
    }
  }
}

/**
 * The `any` composite as one qualifier — "with a Pasture or a Camp".
 *
 * Each branch is phrased on its own and then joined, because a disjunction that
 * merged its halves into the sentence around it would read as a conjunction:
 * "every city with a Pasture with a Camp" is exactly the sentence `all` means
 * and exactly the one this does not. An adjective branch ("coastal") is carried
 * through as the word itself, so "coastal or beside a mountain" still reads.
 */
function anyPhrase(scopes: readonly CityScope[]): string {
  const parts: string[] = [];
  for (const scope of scopes) {
    const inner: ScopePhrase = { adjectives: [], qualifiers: [] };
    scopePhrase(scope, inner);
    const text = [...inner.adjectives, ...inner.qualifiers].join(' ');
    if (text !== '') parts.push(text);
  }
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
}

/**
 * "a", "an" — the article English actually takes in front of a name.
 *
 * A **sound** rule and not a spelling one, which is why it is a function and not
 * a field: the table's names are ordinary English words, and the exceptions
 * English keeps for this ("a university", "an hour") are exceptions of
 * pronunciation. Nothing on this roster hits one, so the vowel test is exact
 * today; the day a row does, it earns a `plural`-style field beside its name
 * rather than a special case here — `buildingPlural`'s bargain.
 *
 * It hands back the **article alone**, and that is what changed when names
 * started being *marked* (`ref`): a mark wraps the name and nothing else, so a
 * phrase that needs an article composes it from the plain name and puts it
 * outside the mark. The link is on the noun, and "a" is not a thing the
 * Compendium has a page about. Asking the vowel question of a wrapped name would
 * have asked it of `[`, which is a consonant.
 */
export function indefinite(name: string): string {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

/**
 * A building named the way a sentence would name it: **"a Granary", "an
 * Amphitheater" — but "The Oracle" and "Machu Picchu"**.
 *
 * The split is `isWonder`, and it is grammar following the design rather than a
 * list of exceptions: there are many granaries and exactly one Oracle, so an
 * ordinary building is a common noun and takes an article, and a wonder is a
 * proper noun and takes none. "a The Oracle" was the plumbing showing through
 * every wonder that scopes a clause to its own town.
 */
function buildingWords(id: BuildingId): string {
  const name = buildingDef(id).name;
  // Marked, so the name is a keyword wherever this clause is *described* — and
  // the article stays outside the mark, because "a" has no page in the book.
  // A wonder is its own shelf, which is the same `isWonder` split the article
  // rule is: one of a kind, so a proper noun and a shelf of proper nouns.
  const marked = buildingName(id);
  // The row's own article wins where the vowel rule would be wrong — "a
  // University" — which is the fix `indefinite`'s docblock names: a field
  // beside the name, never a special case in the sound rule.
  const article = buildingDef(id).article ?? indefinite(name);
  return isWonder(id) ? marked : `${article} ${marked}`;
}

/** A building's bare name, marked. `buildingWords` without the article. */
function buildingName(id: BuildingId): string {
  return ref(isWonder(id) ? 'wonder' : 'building', id, buildingDef(id).name);
}

/**
 * **More than one of them**, marked — "Granaries", "Temples".
 *
 * `buildingWords`' article rule from the other end, and here for its reason: the
 * grammar rides *inside* the mark (`ref`'s own docblock says so out loud), so a
 * clause that speaks of a shelf of buildings says the plural where it is
 * composed rather than gluing an `s` onto a link and printing "Granarys" — which
 * is what Vitruvius' aqueducts and granaries printed before batch GP1.
 *
 * The plural itself is the **roster's own** (`buildingPlural`, `buildingData.ts`),
 * never a second rule here: the ledger already counts "Monuments ×3" with it,
 * and two spellings of one building's plural is exactly the drift that pluraliser
 * exists to prevent. Wonders never reach this arm — there is one of each — but
 * the mark follows `buildingName`'s own shelf split either way.
 */
function buildingPluralName(id: BuildingId): string {
  const name = buildingDef(id).name;
  return ref(isWonder(id) ? 'wonder' : 'building', id, buildingPlural(name, 2));
}

/**
 * A scope in the words a printed rule uses. **The one sentence-builder** — the
 * luxury table delegated its own to this in batch H6, so a card's "every coastal
 * city" and a luxury's are one string from one place.
 */
export function cityScopeWords(scope?: CityScope): string {
  if (!scope) return 'every city';
  // The capital is a **single** town, and the one scope that does not read as
  // "every …". It is also the only one that can say "your".
  if (scope.test === 'capital') return 'your capital';
  // The second scope that admits exactly one town, and the second that can say
  // "your". See `CityScope`'s `newest`.
  if (scope.test === 'newest') return 'your newest city';
  const phrase: ScopePhrase = { adjectives: [], qualifiers: [] };
  scopePhrase(scope, phrase);
  return ['every', ...phrase.adjectives, 'city', ...phrase.qualifiers].join(' ');
}

/**
 * A scope said as a **condition on one town** — "joined to your capital by road",
 * "on fresh water" — rather than as a promise about the realm.
 *
 * `cityScopeWords`' one transform, and it is a transform rather than a second
 * table for that function's own reason: there is one sentence-builder for what a
 * scope means, and a second list of adjectives and qualifiers is exactly the
 * drift the first one exists to prevent. The leading "every city" is what makes
 * the phrase a promise; drop it and what is left is the test itself.
 *
 * The two scopes that already name a single town read right unchanged ("your
 * capital", "your newest city"), so they are handed back as they are.
 */
function scopeCondition(scope: CityScope): string {
  const said = cityScopeWords(scope);
  if (!said.startsWith('every ')) return said;
  const rest = said.slice('every '.length);
  // An adjective sits *before* the noun ("every coastal city") and a qualifier
  // after it ("every city joined to your capital by road"); both read as a
  // condition once the noun is taken out, which is the whole of the transform.
  return rest
    .replace(/\bcity\b/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function filterWords(filter: UnitFilter): string {
  // The named row first, because it is the *narrowest* clause and a phrase that
  // said "workers" when the filter means one row would be a promise the price
  // does not keep. Pluralised off the roster's own name (hard rule 7: the
  // player is told "workers", never `worker`).
  if (filter.type !== undefined) return `${unitDef(filter.type).name.toLowerCase()}s`;
  // The religious clause is asked **first** and reads as a whole noun phrase,
  // because it is the one filter that names a *vocation* rather than a
  // silhouette: an augur is a `worker` by model, and "worker units" is exactly
  // the wrong thing to call one. The Pyramids' half of the same pair reads the
  // other way round — "workers", the ones that are not religious.
  if (filter.consecrates === true) return 'religious units';
  if (filter.consecrates === false && filter.modelClass === 'worker') return 'workers';
  // "Scouts", and asked before the silhouette for `consecrates`' reason: an
  // explorer is a *vocation*, and its `modelClass` is whatever the roster
  // happens to give it.
  if (filter.explores === true) return 'scouts';
  if (filter.explores === false) return 'units other than scouts';
  // **Ships**, and the plain word is the point (hard rule 7): the roster calls
  // them a `'naval'` category and three `navalLight`/`navalHeavy`/`navalRanged`
  // model classes, and none of those is a thing a first-time player has ever
  // been told. Asked before the silhouette for `consecrates`' reason — a hull's
  // model class is art, and "navalRanged units" is exactly the sentence this
  // table exists to prevent.
  if (filter.category === 'naval') return 'ships';
  if (filter.modelClass === 'navalLight') return 'light warships';
  if (filter.modelClass === 'navalHeavy') return 'heavy warships';
  if (filter.modelClass === 'navalRanged') return 'ships that fire at a distance';
  if (filter.modelClass !== undefined) return `${filter.modelClass} units`;
  // **Two silhouettes said once** — the Barracks' foot soldiers. The list is
  // read out in the row's own order, because the row's order is the order a
  // designer wrote the sentence in, and the noun is singular-plural exactly as
  // the one-silhouette arm above spells it ("melee and ranged units").
  if (filter.modelClasses !== undefined && filter.modelClasses.length > 0) {
    return `${listWords(filter.modelClasses)} units`;
  }
  if (filter.ranged === true) return 'ranged units';
  if (filter.ranged === false) return 'melee units';
  if (filter.category !== undefined) return `${filter.category} units`;
  if (filter.consecrates === false) return 'units other than augurs';
  return 'all units';
}

/**
 * What a payout is worth in words, optionally `times` helpings of it — which is
 * how a `countScaled` cap is printed, since the cap is on the count.
 *
 * "authority capacity", not "authority": the meter is a *capacity* and every
 * ratified row says so (Hegemony, Mandate of Heaven, Client Kings). One word,
 * and it is the difference between a card that raises the ceiling and one that
 * would appear to hand out writ.
 */
function payoutWords(effect: CardPaysEffect, times = 1, voice?: string): string {
  // `stage` is the discriminant of a count's percentage payout — see
  // `CardPaysEffect`. Everything else is a flat figure, and the only one of
  // those that is not said in its own name is the writ.
  if (effect.stage !== undefined) {
    return `${signed((effect.percent ?? 0) * times)}% ${voice ?? effect.to ?? ''}`;
  }
  // **The counted row that pays a bag** — the (route, count) pair alone (batch
  // GP2's `routeLength`, written by Marco Polo in GP3). Every other count says
  // its figure with `to` and `amount` because it pays into a fold carrying one
  // voice at a time; a caravan's line is a bag, so the row says its figure the
  // way a flat route row does and the words have to follow it there. Without
  // this the clause printed "+0 " and named no voice at all.
  if (effect.to === undefined && effect.amount === undefined) {
    const bag = bagWords(
      Object.fromEntries(VOICES.map((key) => [key, (effect[key] ?? 0) * times])),
    );
    if (bag !== '') return bag;
  }
  const figure = signed((effect.amount ?? 0) * times);
  // The **folded** voice, where a run of siblings paid the same figure on every
  // one of them: "of every yield" stands in for the six names — see
  // `everyVoiceFold`. Asked before the writ, because a fold names its own words.
  if (voice !== undefined) return `${figure} ${voice}`;
  if (effect.to === 'authority') return `${figure} authority capacity`;
  return `${figure} ${effect.to ?? ''}`;
}

/**
 * A tile condition as a noun phrase: "every mine hex carrying a luxury
 * resource", "every tundra forest hex".
 *
 * `scopeWords`' twin one scale down, and it exists for the same reason: the
 * composite used to be joined with a `+` — "every tundra hex + forest hex",
 * which reads as two hexes rather than one wooded one. Adjectives stack in
 * front of the noun, qualifiers behind it, and `all` merges both lists.
 *
 * The noun is **hex** and not "tile" (copy pass, 2026-08-28): the interface
 * teaches the word "hex" in its first sentence and never defines "tile", so a
 * card that said tile was using a second word for the thing under the pointer.
 */
interface TilePhrase {
  adjectives: string[];
  qualifiers: string[];
}

function tilePhrase(on: TileCondition, into: TilePhrase): void {
  const test = on.test;
  switch (test) {
    case 'hasResource':
      into.qualifiers.push('carrying a resource');
      return;
    case 'hills':
      into.adjectives.push('hill');
      return;
    case 'improved':
      into.adjectives.push('improved');
      return;
    case 'unimproved':
      into.adjectives.push('unimproved');
      return;
    case 'water':
      into.adjectives.push('water');
      return;
    case 'improvement':
      // A **qualifier naming the works**, not a lower-case adjective, and the
      // reason is a collision the copy pass surfaced: the improvement called a
      // Camp and the barbarian camp are two different things, and "every camp
      // hex" had become the wrong one of them the moment the occasions started
      // saying "clearing a barbarian camp". Named the way a city scope names a
      // building ("every city with a Granary"), so the two read alike.
      into.qualifiers.push(
        `with ${indefinite(improvementDef(on.improvement).name)} ${ref('improvement', on.improvement, improvementDef(on.improvement).name)}`,
      );
      return;
    case 'anyImprovement': {
      // One qualifier made of the whole list, the `improvement` arm's words with
      // the "or" the condition means — and the article on the first name only,
      // because "with a Mine or a Quarry" reads as two things and the hex has
      // one. An empty list names nothing and says nothing, which is the honest
      // reading of a condition nothing can satisfy.
      if (on.improvements.length === 0) return;
      const first = improvementDef(on.improvements[0]!).name;
      const names = on.improvements
        .map((id) => ref('improvement', id, improvementDef(id).name))
        .join(' or ');
      into.qualifiers.push(`with ${indefinite(first)} ${names}`);
      return;
    }
    case 'greatWork':
      into.qualifiers.push("carrying a great person's work");
      return;
    case 'terrain':
      into.adjectives.push(on.terrain);
      return;
    case 'feature':
      into.adjectives.push(on.feature);
      return;
    case 'anyFeature':
      // One adjective made of the whole list, not one adjective each: the
      // pieces are alternatives, and two adjectives side by side would read as
      // both at once ("unimproved forest jungle hex"). Same words the single
      // `feature` arm uses, joined by the "or" the condition means.
      into.adjectives.push(on.features.join(' or '));
      return;
    case 'resourceKind':
      into.qualifiers.push(
        on.yields === undefined
          ? `carrying a ${on.kind} resource`
          : `carrying a ${on.kind} resource that pays ${on.yields}`,
      );
      return;
    case 'resource':
      into.qualifiers.push(
        `carrying ${on.resources.map((id) => ref('resource', id, resourceDef(id).name)).join(' or ')}`,
      );
      return;
    case 'freshwater':
      into.qualifiers.push('beside fresh water');
      return;
    case 'adjacentMountain':
      into.qualifiers.push('beside a mountain');
      return;
    case 'yields':
      into.qualifiers.push(`that yields ${on.yield}`);
      return;
    case 'all':
      for (const inner of on.of) tilePhrase(inner, into);
      return;
    default: {
      const unhandled: never = test;
      void unhandled;
      return;
    }
  }
}

/**
 * What kind of hex a tile condition admits, in the words every card already
 * uses for it — "water hex", "hill hex beside fresh water".
 *
 * Exported for the Compendium, which prints a *building's* tile lines on the
 * building's own shelf (the playtest notes, 2026-09-03) and would otherwise
 * have had to say "certain hexes" or write a second vocabulary for the same
 * conditions. It is the describer, not a paraphrase of it: the same function the
 * card text is built out of, so the two can never disagree about what a granary
 * pays on.
 */
export function tileConditionWords(on: TileCondition): string {
  const phrase: TilePhrase = { adjectives: [], qualifiers: [] };
  tilePhrase(on, phrase);
  return [...phrase.adjectives, 'hex', ...phrase.qualifiers].join(' ');
}

/**
 * The nine rules a percentage may bend, in words — **formatters**, since batch
 * L1 (`docs/audit/legibility.md` §1c).
 *
 * A stem table printed "−100% the gold your units cost in maintenance" and
 * "−40% the movement one step along a road costs", and the user read both
 * backwards: a *saving* stated as a negative percentage on a cost is two
 * inversions in one phrase, and the reader has to undo both before the card
 * means anything. So the four rules that name a **price** say what the player
 * gets — "your units cost no gold in maintenance", "roads carry units 40%
 * further" — and the five that name a *gain* keep the figure in front, which is
 * how a bonus has always read.
 *
 * `PRESSURE_RULE_WORDS`' bargain one system over, and for its reason exactly:
 * these nine do not take the same sentence, and the one that reads backwards is
 * the one a shared stem would print wrong.
 */
const RULE_WORDS: Record<CardRule, (percent: number) => string> = {
  happinessDemand: (percent) => `${signed(percent)}% happiness demanded per citizen`,
  borderCost: (percent) => `${signed(percent)}% culture for the next border hex`,
  growthCarryover: (percent) => `${signed(percent)}% of the stored food kept when a city grows`,
  // A price, said as the saving. "−25% the price of buying a hex" is a discount
  // written as a negative bonus on a cost; this is the sentence a player acts on.
  tilePurchase: (percent) =>
    percent < 0
      ? `a hex costs ${-percent}% less to buy`
      : `a hex costs ${percent}% more to buy`,
  borderCulture: (percent) => `${signed(percent)}% border expansion`,
  settlerCost: (percent) =>
    percent < 0
      ? `settlers cost ${-percent}% less production`
      : `settlers cost ${percent}% more production`,
  growthSurplus: (percent) => `${signed(percent)}% food surplus stored toward growth`,
  // **"No maintenance" at the whole rebate**, because that is what −100% is and
  // "−100% the gold your units cost" is a sentence a player has to do algebra on.
  unitUpkeep: (percent) =>
    percent <= -100
      ? 'your units cost no gold in maintenance'
      : percent < 0
        ? `your units cost ${-percent}% less gold in maintenance`
        : `your units cost ${percent}% more gold in maintenance`,
  // Said as the **distance**, not as the price: a cheaper step is further
  // marching, and that is the half a player plans around.
  roadStepCost: (percent) =>
    percent < 0
      ? `roads carry units ${-percent}% further`
      : `roads carry units ${percent}% less far`,
};

const COMBAT_WORDS: Record<CombatCondition['test'], string> = {
  always: '',
  vsBarbarians: 'against barbarians',
  ownTerritory: 'inside your territory',
  foreignTerritory: 'outside your territory',
  onHills: 'on hills',
  vsCity: 'against cities',
  targetBelowHalf: 'against units below half strength',
  capitalTerritory: 'inside your capital’s borders',
  inCity: 'while standing in one of your cities',
  capturedCity: 'in a city you captured',
  // The feature is printed by `describeEffect`, so that forest and jungle are
  // one table entry and two data rows — `buildingsOfKind`'s bargain.
  onFeature: 'in',
  freshwater: 'beside fresh water',
  coastal: 'on the coast',
  fortified: 'while fortified',
  // The distance is printed by `describeEffect`, so that two hexes and three
  // are one table entry and two data rows — `onFeature`'s bargain.
  withinOfCity: 'within',
  strongerTarget: 'against a stronger unit',
  // The two realms rather than the two pieces — `strongerTarget` one scale out.
  // "More cities than you" and not "bigger": cities are what the count counts,
  // and a player can look at the map and check it.
  vsWiderEmpire: 'against an empire with more cities than you',
  // The `foreign` half is printed by `describeEffect`, so that "in cities that
  // follow your religion" and "in foreign cities that follow your religion" are
  // one table entry and two data rows — `onFeature`'s bargain.
  followingTerritory: 'inside cities that follow your religion',
  // The silhouette is printed by `combatWhenWords`, so that "beside a siege
  // engine" and "beside a ship" are one table entry and two data rows —
  // `onFeature`'s bargain, at the fourth condition to take an argument.
  beside: 'while standing beside',
  // The composite's own words are its members', joined — see `combatWhenWords`.
  all: '',
};

/** The `followingTerritory` line narrowed to somebody else's towns. */
const FOREIGN_FOLLOWING_WORDS = 'inside foreign cities that follow your religion';

/**
 * A strength line's condition, in the words a printed rule uses.
 *
 * **One place**, because there are now two readers — `combatLine`'s own clause
 * and the Statue of Zeus' `combatPercent` share — and a condition printed twice
 * is a condition that starts reading two ways. The three arms that take an
 * argument print it here rather than in `COMBAT_WORDS`, so "in forest" and "in
 * jungle" stay one table entry, and the composite is simply its members joined
 * by "and": there is no `or`, so the conjunction is the only joint there is.
 */
export function combatWhenWords(when: CombatCondition): string {
  switch (when.test) {
    case 'onFeature':
      return `${COMBAT_WORDS.onFeature} ${when.feature}`;
    case 'withinOfCity':
      return (
        `${COMBAT_WORDS.withinOfCity} ${when.hexes} ` +
        `${when.hexes === 1 ? 'hex' : 'hexes'} of one of your cities`
      );
    case 'followingTerritory':
      return when.foreign === true ? FOREIGN_FOLLOWING_WORDS : COMBAT_WORDS.followingTerritory;
    case 'beside':
      return `${COMBAT_WORDS.beside} ${filterWords(when.class)}`;
    case 'all':
      return when.of
        .map((inner) => combatWhenWords(inner))
        .filter((words) => words !== '')
        .join(' and ');
    default:
      return COMBAT_WORDS[when.test];
  }
}

const SCALE_WORDS: Record<CombatScaleCount, PluralWords> = {
  cities: { one: 'city you hold', many: 'cities you hold' },
  // `adjacentFriendlies` counts **combatants** and nothing else, so the words
  // say so: a settler standing beside a spearman is not a shield wall.
  adjacentFriendlies: {
    one: 'adjacent friendly combat unit',
    many: 'adjacent friendly combat units',
  },
  // The family is not in these words — `describeEffect` prints it, so that "per
  // great general" and "per great engineer" are one entry. `buildingsOfKind`'s
  // bargain, at the third scale.
  greatPeopleOfFamily: { one: 'earned this game', many: 'earned this game' },
  // The flavour is printed by `scaleNoun`, exactly as the family is: "per
  // military Order you have in a slot" and "per economic Order" are one entry.
  slottedOrdersOfSlot: {
    one: 'Order you have in a slot',
    many: 'Orders you have in a slot',
  },
};

/** Where a `unitStat` applies, in words. `'anywhere'` is the absent field. */
const WHERE_WORDS: Record<
  'anywhere' | 'ownTerritory' | 'foreignTerritory' | 'embarked' | 'fortified',
  string
> = {
  anywhere: '',
  ownTerritory: ' inside your territory',
  foreignTerritory: ' outside your territory',
  embarked: ' while embarked',
  fortified: ' while dug in',
};

/**
 * The stats that read as "`who`: +n *thing*". `charges` and `combatPercent` are
 * absent because each has a sentence of its own in `describeEffect` — the first
 * because it applies only to units not yet built, the second because a percent
 * belongs before the noun rather than after it.
 */
const STAT_WORDS: Record<'movement' | 'sight' | 'heal' | 'range', string> = {
  movement: 'movement',
  sight: 'sight',
  heal: 'healing per turn',
  range: 'range',
};

/**
 * The occasions that pay a heal of their **own**, before a card has spoken.
 *
 * A list rather than a `Set` for CLAUDE.md's iteration rule, and here rather
 * than inferred because the fact lives in the *verb*: a pillage hands
 * `improvements.pillageHeal` to whoever struck the works, and nothing else does.
 * It is what decides whether a rider's sentence says "heals 25" or "heals a
 * further 25", and an occasion that grows a base heal joins it in the same pass
 * that gives it one.
 */
const OCCASIONS_THAT_HEAL: readonly WindfallOccasion[] = ['pillage'];

const OCCASION_WORDS: Record<WindfallOccasion, string> = {
  chop: 'clearing a forest or jungle',
  camp: 'clearing a barbarian camp',
  growth: 'a city growing',
  found: 'founding a city',
  completion: 'completing anything',
  buildingCompletion: 'completing a building',
  unitCompletion: 'completing a unit',
  capture: 'capturing a city',
  discovery: 'claiming a ruin',
  death: 'losing a unit',
  kill: 'killing a unit',
  pillage: 'pillaging',
  prospect: 'surveying a hill',
  veinFound: 'surfacing a vein',
  pillageTrader: 'plundering a caravan',
  tech: 'completing a technology',
  tilePurchase: 'buying a hex',
  rite: 'performing a rite',
  purchase: 'buying anything',
  declareWar: 'declaring war',
  periodic: 'a boon coming round',
};

/**
 * The same occasions, narrowed to the wild — "killing a barbarian unit".
 *
 * A **table** rather than a phrase glued onto the general reading, because
 * English does not narrow every one of these sentences in the same place: the
 * barbarian belongs inside "killing a unit" and after "pillaging". Only the
 * occasions a ratified row actually narrows are written down; anything else
 * falls back to a trailing clause, which is exact if inelegant and is what stops
 * a new `vsBarbarians` row from shipping a sentence with no barbarian in it.
 */
const BARBARIAN_OCCASION_WORDS: Partial<Record<WindfallOccasion, string>> = {
  kill: 'killing a barbarian unit',
  death: 'losing a unit to barbarians',
  capture: 'capturing a barbarian city',
};

/**
 * The one occasion a row narrows by what stood in the town — `BARBARIAN_
 * OCCASION_WORDS`' sibling, and a table for its reason: the qualifier belongs
 * inside the sentence rather than glued to the end of it.
 */
const WONDER_OCCASION_WORDS: Partial<Record<WindfallOccasion, string>> = {
  capture: 'capturing a city with a wonder in it',
};

/**
 * The completion narrowed to a **wonder** — Dinocrates'.
 *
 * `WONDER_OCCASION_WORDS`' sibling and a second table rather than a second entry
 * in it, because the two ask different questions of different moments: that one
 * is a town taken that *held* a wonder, and this is a wonder *finished*. One
 * table conflating them would have printed "completing a building, where a
 * wonder stood".
 */
const WONDER_BUILT_WORDS: Partial<Record<WindfallOccasion, string>> = {
  buildingCompletion: 'completing a wonder',
  completion: 'completing a wonder',
};

/**
 * The occasion, in the words a card's own clause uses.
 *
 * Exported for `cardImpact.ts`, which reports a rider in its per-occasion form
 * — the grant read off the row *and the moment it is paid on* — because a card
 * that pays only on an occasion has an honest impact of zero per turn and a
 * nought on a stamp would be a lie about it. One table, so the stamp and the
 * clause say the same sentence about the same moment.
 */
export function occasionWords(
  occasion: WindfallOccasion,
  vsBarbarians: boolean,
  capturedWonder = false,
  wonderBuilt = false,
): string {
  if (wonderBuilt) {
    return WONDER_BUILT_WORDS[occasion] ?? `${OCCASION_WORDS[occasion]}, where it is a wonder`;
  }
  if (capturedWonder) {
    return WONDER_OCCASION_WORDS[occasion] ?? `${OCCASION_WORDS[occasion]}, where a wonder stood`;
  }
  if (!vsBarbarians) return OCCASION_WORDS[occasion];
  return BARBARIAN_OCCASION_WORDS[occasion] ?? `${OCCASION_WORDS[occasion]}, against barbarians`;
}

const COUNT_WORDS: Record<CountKind, PluralWords> = {
  uniqueLuxuries: { one: 'unique luxury', many: 'unique luxuries' },
  luxuryCopies: { one: 'improved luxury copy', many: 'improved luxury copies' },
  duplicateLuxuries: {
    one: 'luxury you hold two or more copies of',
    many: 'luxuries you hold two or more copies of',
  },
  improvedBonusResources: {
    one: 'improved bonus resource',
    many: 'improved bonus resources',
  },
  improvedStrategicResources: {
    one: 'improved strategic resource',
    many: 'improved strategic resources',
  },
  cities: { one: 'city you hold', many: 'cities you hold' },
  // **"Citizens", never "population"** (batch L1, §1b): the city panel, the
  // Compendium and every ratified text call a town's people citizens, and
  // "per 4 population" was the schema's word for them leaking onto a card.
  population: { one: 'citizen', many: 'citizens' },
  capitalPopulation: {
    one: 'citizen in your capital',
    many: 'citizens in your capital',
  },
  // `garrisonOf` keeps only combatants, and the words say so.
  garrison: { one: 'combat unit standing in the city', many: 'combat units standing in the city' },
  garrisonWatch: {
    one: 'fortification level among the units in the city',
    many: 'fortification levels among the units in the city',
  },
  workedHills: { one: 'worked hill hex', many: 'worked hill hexes' },
  bankedFaith: { one: 'banked faith', many: 'banked faith' },
  bankedGold: { one: 'gold in the treasury', many: 'gold in the treasury' },
  visibleCamps: { one: 'barbarian camp you can see', many: 'barbarian camps you can see' },
  scienceBuildings: {
    one: 'building here that supplies science',
    many: 'buildings here that supply science',
  },
  // The named building is not in these words: `describeEffect` prints it, so
  // that "+1 happiness per Barracks" and "per Temple" are one table entry.
  buildingsOfKind: { one: 'of them', many: 'of them' },
  buildingsInCity: { one: 'building in this city', many: 'buildings in this city' },
  workedTilesInCity: { one: 'hex worked here', many: 'hexes worked here' },
  workedUnimprovedTiles: {
    one: 'unimproved hex worked here',
    many: 'unimproved hexes worked here',
  },
  wonders: { one: 'wonder you hold', many: 'wonders you hold' },
  // **Courts reached, not roads run** — the partner counted once however many
  // caravans walk to it, which is the whole difference from `foreignTradeRoutes`.
  tradePartnerEmpires: {
    one: 'other empire you trade with',
    many: 'other empires you trade with',
  },
  // "Spare" says the sentence the count makes: what the writ covers over and
  // above what the cities spend. Never plural — it is a quantity of one thing.
  authoritySurplus: { one: 'spare authority', many: 'spare authority' },
  // The almoner's ledger. The same words as the *tally* of the same moment
  // (`TALLY_WORDS`), because it is the same moment — what differs is who keeps
  // the count, and a player should not have to learn two phrasings for it.
  goldSpent: { one: 'gold you have spent buying', many: 'gold you have spent buying' },
  // A road's own length. "Between the two cities" rather than "of the route",
  // because that is what is measured (see `routeHexes`) and it is a distance a
  // player can count off the map.
  routeLength: {
    one: 'hex between the two cities',
    many: 'hexes between the two cities',
  },
  revealedTiles: { one: 'hex you have revealed', many: 'hexes you have revealed' },
  roadHexes: { one: 'road hex you have laid', many: 'road hexes you have laid' },
  sightedCities: { one: 'foreign city you have sighted', many: 'foreign cities you have sighted' },
  agesClosed: { one: 'age that has closed', many: 'ages that have closed' },
  // The filter is not in these words: `countNoun` prints it, so that "per melee
  // unit" and "per ranged unit" are one entry — `buildingsOfKind`'s bargain.
  unitsInField: { one: 'unit in the field', many: 'units in the field' },
  // The category is not in these words either: `countNoun` prints it, so that
  // "per gold building" and "per faith building" are one entry.
  buildingsOfCategory: { one: 'building', many: 'buildings' },
  // The list is not in these words either, for `buildingsOfCategory`'s reason —
  // `countNoun` prints it, so any pair of categories is one entry.
  buildingsOfCategories: { one: 'building', many: 'buildings' },
  // The voice is not in these words: `countNoun` prints it, so "per gold your
  // empire makes" and "per hammer" are one entry.
  empireYield: { one: 'your empire makes a turn', many: 'your empire makes a turn' },
  rerollsWhileSlotted: {
    one: 'draft you have rerolled while this stood',
    many: 'drafts you have rerolled while this stood',
  },
  defensiveBuildings: {
    one: 'fortification in this city',
    many: 'fortifications in this city',
  },
  discoveredCamps: { one: 'barbarian camp you have found', many: 'barbarian camps you have found' },
  tradeRoutes: { one: 'trade route you run', many: 'trade routes you run' },
  worldWonders: { one: 'wonder in the world', many: 'wonders in the world' },
  foreignTradeRoutes: {
    one: 'trade route to another empire',
    many: 'trade routes to another empire',
  },
  internalTradeRoutes: {
    one: 'trade route between your own cities',
    many: 'trade routes between your own cities',
  },
  slottedOrders: {
    one: 'Order you have placed in a slot',
    many: 'Orders you have placed in a slot',
  },
  unslottedOrders: {
    one: 'Order you hold but have not placed in a slot',
    many: 'Orders you hold but have not placed in a slot',
  },
  // The flavour is not in these words: `countNoun` prints it, so that "per
  // military Order" and "per wildcard Order" are one entry — `buildingsOfKind`'s
  // bargain. This is the reading of a row that names no flavour at all.
  slottedOrdersOfSlot: {
    one: 'Order you have in a slot',
    many: 'Orders you have in a slot',
  },
  clearedCamps: {
    one: 'barbarian camp you have cleared',
    many: 'barbarian camps you have cleared',
  },
  followingCities: { one: 'city that follows you', many: 'cities that follow you' },
  followingForeign: {
    one: 'foreign city that follows you',
    many: 'foreign cities that follow you',
  },
  followingPop: {
    one: 'citizen in the cities that follow you',
    many: 'citizens in the cities that follow you',
  },
  followingEmpires: { one: 'empire that follows you', many: 'empires that follow you' },
  followingWithBuilding: {
    one: 'following city with the building',
    many: 'following cities with the building',
  },
  followingCitiesWithWonder: {
    one: 'city that follows you and holds a wonder',
    many: 'cities that follow you and hold a wonder',
  },
  // The category is not in these words: `countNoun` prints it, so that "per
  // faith building in a city that follows you" and "per science building" are
  // one entry — `buildingsOfCategory`'s bargain one tide over. This is the
  // reading of a row that names no shelf at all, which counts nothing.
  followingBuildingsOfCategory: {
    one: 'building in a city that follows you',
    many: 'buildings in cities that follow you',
  },
  followersHere: { one: 'follower in this city', many: 'followers in this city' },
  // The occasion is not in these words: `countNoun` prints it off the row's own
  // `tally`, so that "per barbarian you have killed" and "per wonder finished"
  // are one entry — `buildingsOfKind`'s bargain a sixth time. This is the
  // reading of a row that names no occasion at all, which counts nothing.
  tally: { one: 'time it has counted', many: 'times it has counted' },
};

/**
 * What each growing card is watching for, as a noun in both numbers.
 *
 * `COUNT_WORDS`' argument table, and the words are written in the **perfect**
 * ("you have killed", "have been finished") because that is what a counter is: a
 * card that pays for what has already happened, not for what is standing on the
 * board. The clause that says the counting only runs while the card is in a slot
 * is printed once, beside the count, rather than folded into five nouns.
 */
const TALLY_WORDS: Record<TallyOccasion, PluralWords> = {
  barbarianKill: {
    one: 'barbarian you have killed',
    many: 'barbarians you have killed',
  },
  wonderAnywhere: {
    one: 'wonder finished anywhere in the world',
    many: 'wonders finished anywhere in the world',
  },
  greatPersonSpent: {
    one: 'great person you have spent',
    many: 'great people you have spent',
  },
  unitLost: { one: 'unit you have lost in battle', many: 'units you have lost in battle' },
  goldSpent: { one: 'gold you have spent buying', many: 'gold you have spent buying' },
};

const RATE_WORDS: Record<RateSource, PluralWords> = {
  faithPerTurn: { one: 'faith gained per turn', many: 'faith gained per turn' },
  capitalFaithPerTurn: {
    one: "faith your capital gains per turn",
    many: "faith your capital gains per turn",
  },
  followingFaithPerTurn: {
    one: 'faith gained per turn in your cities that follow your religion',
    many: 'faith gained per turn in your cities that follow your religion',
  },
  culturePerTurn: { one: 'culture gained per turn', many: 'culture gained per turn' },
  goldPerTurn: { one: 'gold gained per turn', many: 'gold gained per turn' },
  happiness: { one: 'point of positive happiness', many: 'points of positive happiness' },
  authority: { one: 'point of positive authority', many: 'points of positive authority' },
};

const OFFER_WORDS: Record<OfferRuleId, string> = {
  discoveryClaimAll: 'a ruin you claim pays every option instead of one',
};

/** What a widened draft is *called*, on the card that widens it. */
const OFFER_DRAFT_WORDS: Record<OfferRiderScope, string> = {
  order: 'every Statecraft draft',
  doctrine: 'every Doctrine draft',
  belief: 'every belief offer',
  discovery: 'every offer from a ruin',
  greatPerson: 'every great-person offer',
  all: 'every offer of every kind',
};

/**
 * The amplifiers, as **formatters** rather than as stems, because the two do not
 * take the same sign. Fifty percent *more* happiness is a bonus and wears a
 * `+`; a duplicate counting at thirty percent is a *share* of what a first copy
 * pays, and "+30%" read as thirty points more than nothing.
 */
const AMPLIFIER_WORDS: Record<AmplifierTarget, (percent: number) => string> = {
  luxuryHappiness: (percent) => `happiness from unique luxuries ${signed(percent)}%`,
  luxuryDuplicates: (percent) => `duplicate luxury copies count at ${percent}%`,
  riteDuration: (percent) => `rites last ${signed(percent)}% longer`,
  // **No "more" after a signed percent** (batch L1, §1c) — the sign already says
  // the direction, and "pays +100% more" read as a quadrupling.
  routeYields: (percent) => `trade routes pay ${signed(percent)}%`,
  founderTrickle: (percent) =>
    `what your followers pay you is ${signed(percent)}% higher`,
  greatPersonAct: (percent) => `a great person's act pays ${signed(percent)}%`,
  connectionYields: (percent) => `city connections pay ${signed(percent)}%`,
  // The figure leads, for `cityRenownPercent`'s reason: "pays +100% renown"
  // reads as the whole payout rather than as the share added to it.
  triumphRenown: (percent) => `${signed(percent)}% renown from every Triumph`,
};

/**
 * The same targets, said as a **flat step** rather than as a share
 * (`CardEffectAmplifierEffect.amount`).
 *
 * A second table rather than a sign on the first, for `AMPLIFIER_WORDS`' own
 * reason one grade further: "counts one fewer" and "counts thirty percent" are
 * not the same sentence with a different number in it. Every target has an entry
 * so the table cannot go silent on a row somebody writes, and the ones whose
 * figure is a whole-ledger total say so plainly — a flat step on one of those is
 * a row nobody should write, and a sentence a player can read is how they find
 * out.
 */
const AMPLIFIER_FLAT_WORDS: Record<AmplifierTarget, (amount: number) => string> = {
  luxuryHappiness: (amount) =>
    amount < 0
      ? `every luxury you hold counts ${-amount} fewer toward happiness`
      : `every luxury you hold counts ${amount} more toward happiness`,
  luxuryDuplicates: (amount) => `duplicate luxury copies count ${signed(amount)}`,
  riteDuration: (amount) => `rites last ${signed(amount)} turns longer`,
  routeYields: (amount) => `each trade route pays ${signed(amount)} more`,
  founderTrickle: (amount) => `each follower pays you ${signed(amount)} more`,
  greatPersonAct: (amount) => `a great person's act pays ${signed(amount)} more`,
  connectionYields: (amount) => `each connected city pays ${signed(amount)} gold`,
  triumphRenown: (amount) => `every Triumph pays ${signed(amount)} more renown`,
};

const METER_RULE_WORDS: Record<MeterRuleId, string> = {
  capturedCityCost: 'the authority a captured city costs',
  coastalCityCost: 'the authority a coastal city costs',
  hillCityCost: 'the authority a city on hills costs',
  // Said as *who is waived* rather than as a figure on the demand, because that
  // is what the rule does: the first citizens of every town are simply not
  // counted, and "the happiness demanded falls by 3" would have read as a flat
  // discount on a number that scales with the town.
  freeCitizens: 'the citizens in every city who demand no happiness',
  borderFreezeExempt: 'your borders keep growing',
  authorityUnitProductionExempt: 'negative authority no longer slows production toward units',
};

/**
 * The meter rules that are **switches**: a rule suspended rather than a figure
 * moved. They carry `value: 1` because the shape has no boolean, and their
 * words are already whole sentences — printing "… is 1" after one was the
 * plumbing showing through Emergency Powers and The Great Warring Tribes.
 *
 * A list rather than a `Set` for CLAUDE.md's iteration rule, and beside the
 * table it qualifies so a rule added to one is added to the other.
 */
const METER_RULE_SWITCHES: readonly MeterRuleId[] = [
  'borderFreezeExempt',
  'authorityUnitProductionExempt',
];

/**
 * Every flag-shaped rule in one sentence each — the words half of batch H6's one
 * `rule` shape.
 *
 * Three tables stood here (`ACTION_WORDS`, `CITY_RULE_WORDS`, `BEHAVIOR_WORDS`)
 * plus a sentence written inline in the zone-of-control arm, for four kinds that were
 * one evaluation. One table now, exhaustive over `CardFlagRuleId`, so a member
 * added to any of the four sub-unions and left unworded fails the build — which
 * is the guarantee three tables and an inline string could not give.
 *
 * A whole sentence rather than a stem, because a rule of this kind has no figure
 * to hang a noun phrase off. The city sentence says *city* out loud, because the
 * honest half of Cistern Works is which questions it does not reach (a farm
 * beside a river is a fact about the ground).
 */
const FLAG_RULE_WORDS: Record<CardFlagRuleId, string> = {
  // Verbs whose behaviour a card changes. `ActionRuleId`.
  freeChop: 'clearing a forest or jungle costs no worker charge',
  doubleOverflow: 'leftover production from a completed item is doubled',
  unitJumpsQueue: 'a unit that would finish sooner jumps ahead of a building in the queue',
  buyGreatPersonWithGold: 'a great person waiting to be called may be bought with gold',
  buyGreatPersonWithFaith: 'a great person waiting to be called may be bought with faith',
  buyScholarDraftWithFaith: 'a draft of great scholars may be bought with faith',
  // Facts a card declares true of every town. `CityRuleId`.
  freshwater: 'every city of yours counts as being on fresh water',
  // Things about the world that stop being true — or start. `BehaviorRuleId`.
  barbariansPassive: 'barbarians never attack you',
  // "At full health" since the user's card pass of 2026-09-03, which is the
  // whole of what the pact is now — a clause a player has to be told, because it
  // is the difference between a fresh soldier and a man on his last legs.
  barbarianKillsConvert: 'a barbarian you kill joins you at full health instead of dying',
  noCampClearing: 'you can no longer clear a barbarian camp',
  noHealAbroad: 'your units do not heal outside your own borders',
  freeCityRoads: 'roads near your cities cost nothing to keep',
  // Blitz's two halves. The first says *movement* and not "acts again", because
  // one blow a turn is untouched: what comes back is the walking.
  moveAfterKill: 'a unit that kills gets its movement back for the rest of the turn',
  // Tyranny's, 2026-09-08. It says *costs* rather than "is free", because the
  // raid still needs a unit with movement left to make it — what the law
  // withholds is the point, not the price of admission.
  freePillage: 'pillaging costs your units no movement',
  noFortify: 'your units cannot fortify',
  // Pytheas'. Said as what cannot be *done to* them, because that is the whole
  // of the rule — the cart is no faster, no tougher and no safer from the
  // weather; it simply cannot be taken.
  tradersUnplunderable: 'your trade units cannot be attacked or plundered',
  // al-Khwārizmī's second half. "Supply science" is the phrase the game reads
  // the class by everywhere (`buildingPaysVoice`), so the clause says it too.
  faithBuysScienceBuildings: 'you may buy buildings that supply science with faith',
  // The King's Road and Admiralty. Both say what a *player* does with them —
  // where the movement comes back, and which half of the crossing is free —
  // because "a shore step is free" is the name of a price and not a rule.
  cityRestoresMovement: 'a unit that stops in one of your cities gets its movement back',
  freeLanding: 'your units come ashore from the water without spending movement',
  // The Silk Road's. No figure in it (hard rule 7): the *share* a borrowed
  // luxury pays is a number and lives in the data, and what a player needs told
  // here is that the goods come home at all and are worth less than a seam of
  // their own.
  routesImportLuxuries:
    'a trade route ending in another empire’s city lends you one luxury resource that ' +
    'city has improved, worth a share of your own',
  // The zone of control, and the only rule of it there is. `ZocRuleId`.
  borders: 'every hex you own exerts zone of control on enemy units, as a unit of yours would',
};

const CONDITION_WORDS: Record<EmpireCondition['test'], string> = {
  cityCountAtMost: 'while you hold at most',
  cityCountAtLeast: 'while you hold at least',
  authorityNegative: 'while your authority is negative',
  authorityPositive: 'while your authority is positive',
  happinessNegative: 'while your happiness is negative',
  // The category and the town are printed by `conditionValue`, so that a wonder
  // in any city and a building in the capital are one entry and two rows.
  queueHolds: 'while',
  atWar: 'while you are at war',
};
