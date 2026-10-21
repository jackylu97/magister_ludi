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
  BUILDING_IDS,
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
import {
  type ImprovementId,
  improvementDef,
  isGreatPersonWork,
  workForFamily,
} from '../improvementData';
import { projectDef } from '../projectData';
import { beliefPoolOf, isBeliefId, isConsecrationId, isRiteId, riteDef } from '../religionData';
import { type CityYieldKey, resourceDef } from '../resourceData';
import { RULES } from '../rulesData';
import { readTileYield, terrainDef } from '../terrainData';
import {
  type AmplifierTarget,
  type PressureRuleId,
  type CardBuildingYieldPercentEffect,
  type CommissionFigure,
  type CommissionGoal,
  type CommissionReward,
  type CommissionSpec,
  type CardPaysEffect,
  type GrantCount,
  type CardPeriodicEffect,
  type CardDefBase,
  type CardEffect,
  type CardFlagRuleId,
  type CardLevyEffect,
  type LevyUse,
  type CardId,
  type CardRule,
  type CityScope,
  type CombatCondition,
  type CombatScale,
  type CombatScaleCount,
  type CountKind,
  type EmpireCondition,
  type FirstKind,
  type OccasionMeasure,
  type MeterRuleId,
  type OfferRiderScope,
  type OfferRuleId,
  type OrderBeadOccasion,
  type RateSource,
  type ChairType,
  type TallyOccasion,
  type TileCondition,
  type UnitFilter,
  type WindfallGrantSpec,
  type WindfallOccasion,
  STATECRAFT,
  isOrderId,
  orderDef,
} from '../statecraftData';
// Type-only: the route's medium, from the leaf that owns the word, so the card
// face and the gate cannot end up spelling it differently.
import type { RouteMode } from '../routes';
import { beadGrantDef } from '../beadData';
import { ABILITY_TECH, type TechId, type TechTrait, abilityDef, isTechId, techDef } from '../techData';
import { type ModelClass, type UnitTypeId, unitDef, unitLine } from '../unitData';
// A rank's name as every surface prints it (Dominion batch D1). A leaf.
import { RANK_IDS, type RankId, rankName } from '../ranks';
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
  eitherEnd?: CityScope;
  crossing?: 'domestic' | 'international';
  standingTurns?: number;
  minHexes?: number;
  mode?: RouteMode;
}): string {
  const parts: string[] = [];
  if (effect.origin !== undefined) parts.push(`sent from ${cityScopeWords(effect.origin)}`);
  // **Either town will do** (batch C8, Pilgrim Markets). Said as one clause
  // about the road rather than as two about its ends, because that is the
  // sentence the card prints and the one a player can check: look at both
  // towns, and one of them is enough. The scope's own "every city with a X"
  // reads as a promise about the realm here, so the article is swapped exactly
  // as the destination clause swaps it.
  if (effect.eitherEnd !== undefined) {
    const where = cityScopeWords(effect.eitherEnd);
    const one = where.startsWith('every ') ? `a ${where.slice(6)}` : where;
    parts.push(`with either end in ${one}`);
  }
  // **Which way the road runs** (batch C7, The Harbour Chain). A fact about the
  // road itself, so it sits with the term and the crossing rather than with
  // either end's scope — and it is said in a player's words ("run by sea"),
  // never as a mode.
  if (effect.mode !== undefined) {
    parts.push(effect.mode === 'sea' ? 'run by sea' : 'run overland');
  }
  // **How far apart the two towns are**, beside the term and for its reason: a
  // fact about the road rather than about either end. Said as the distance the
  // ends are apart, which is the figure a player can measure on the map — not as
  // the path a cart walks, which is a different number (see `routeHexes`).
  if (effect.minHexes !== undefined) {
    parts.push(
      `whose two cities are at least ${effect.minHexes} hex${effect.minHexes === 1 ? '' : 'es'} apart`,
    );
  }
  // **How long the road has been kept up**, in the plainest words there are: a
  // player is told the caravan has been running the same road, never that a
  // route has "matured". First among the narrowings, because it is a fact about
  // the road itself rather than about either of its ends.
  if (effect.standingTurns !== undefined) {
    parts.push(
      `you have kept up for at least ${effect.standingTurns} turn${effect.standingTurns === 1 ? '' : 's'}`,
    );
  }
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
    if (next.wholePercent !== undefined) break;
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
  const slots: ChairType[] = [];
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
  // **A technology's line traits** (Scientific batch S1) are not in `effects`,
  // and they are the whole of what Casting or Mechanics gives, so they are
  // printed here: one clause naming the trait and its line, then the trait's
  // own clauses.
  if (isTechId(id)) {
    for (const trait of techDef(id).traits ?? []) clauses.push(...describeTrait(trait));
  }
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
    // **What drafting hands over** (Dominion batch D5): The Sword of State's
    // unit and The Cleruchy's settler, in a building grant's own words. The
    // unit grant's sentence ends "joins you", so the place is added after it.
    // A card with no effects says so, because it still takes a chair.
    const drafted = orderDef(id).onDraft ?? [];
    drafted.forEach((grant, index) => {
      const idle =
        index === drafted.length - 1 && orderDef(id).effects.length === 0
          ? '; seated, this card does nothing'
          : '';
      clauses.push({ text: `${grantWords(grant, 'when drafted')} in your capital${idle}` });
    });
    for (const grant of orderDef(id).onSlot ?? []) {
      if (grant.grant === 'greatPerson') {
        clauses.push({
          text: 'the first time this Order is placed in a slot, you are offered a great person',
        });
      }
    }
  }
  // **A commission is not an effect either** (batch C): its goal and reward
  // are a field on the row, met once, and they are the whole of the card.
  if (isOrderId(id)) {
    const spec = orderDef(id).commission;
    if (spec !== undefined) clauses.push(...describeCommission(spec));
    // **A charter that opens an improvement** (the Expansionist tended works):
    // the grant is the whole card, so it is printed as its clause.
    const work = orderDef(id).charter?.unlocks.improvement;
    if (work !== undefined) {
      const name = improvementDef(work).name;
      clauses.push({
        text: `once drafted, opens the ${ref('improvement', work, name)} for your workers to build; this card takes no chair`,
      });
    }
    // **A charter that opens a technology** (Scientific batch S0 and S1): the
    // pick opens the research, and what knowing the technology gives is the
    // rest of the card, so its traits are printed here in the technology's
    // own words. The technology is named without a keyword mark, because the
    // Compendium has no page for a charter technology yet (batch S12), and a
    // mark to a page the book lacks is a dead link. A retired charter may name
    // a technology the tree never held (the Metallurgists' Alloys), and says
    // nothing here.
    const tech = orderDef(id).charter?.unlocks.tech;
    if (tech !== undefined && isTechId(tech)) clauses.push(...charterTechClauses(tech));
    // **A charter's rites are the whole of the card** (The Fast): taking it
    // teaches the rite, said with the rite's own sentence.
    for (const rite of orderDef(id).charter?.unlocks.rites ?? []) {
      const row = riteDef(rite);
      clauses.push({
        text: `once drafted, your cities may keep ${ref('rite', rite, row.name)}${row.text ? `: ${row.text.charAt(0).toLowerCase()}${row.text.slice(1).replace(/\.$/, '')}` : ''}`,
      });
    }
  }
  // **What a rite does the moment it is said** (`RiteDef.atOnce`) — the
  // Devotion deck's offering and restoring, whose whole face is the instant.
  if (isRiteId(id)) {
    const now = riteDef(id).atOnce;
    if (now?.hammersFromFaith === true) {
      clauses.push({
        text: 'the faith this rite costs goes into what the city is building, as production at the faith rate, never toward a wonder',
      });
    }
    if (now?.healFollowing === true) {
      clauses.push({
        text: 'every unit of yours standing in land that follows your religion is healed to full',
      });
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
 * **What a technology charter's card says** (Scientific batch S1): the
 * research it opens, then each line trait the technology gives.
 *
 * Reading 20 lets two seats draft the same charter, so the clause says "only
 * an empire holding this charter", not "only you". The traits are the
 * technology's own (`describeTrait`), led by "once you know", because a
 * charter takes no chair and gives nothing until the research is done.
 */
function charterTechClauses(tech: TechId): CardClause[] {
  const name = techDef(tech).name;
  const clauses: CardClause[] = [
    {
      text: `once drafted, opens ${name} for you to research; only an empire holding this charter may research it; this card takes no chair`,
    },
  ];
  for (const trait of techDef(tech).traits ?? []) {
    clauses.push(...describeTrait(trait, `once you know ${name}, `));
  }
  return clauses;
}

/**
 * **One line trait, in words** (Scientific batch S1): a clause that names the
 * trait, the line and the units the line reaches, then the trait's effects in
 * the ordinary clauses. `lead` goes in front of the first clause ("once you
 * know Mechanics, ").
 *
 * Each effect names the trait's line in its `class`, so its own clause says
 * which units it reaches ("units of the Catapult line: +1 range") and reads
 * correctly on its own.
 */
export function describeTrait(trait: TechTrait, lead = ''): CardClause[] {
  const line = unitDef(trait.line).name;
  return [
    {
      text: `${lead}the ${line} line (${lineReachWords(trait.line)}) gains the ${trait.name} trait and keeps it through every upgrade`,
    },
    ...describeEffects(trait.effects),
  ];
}

/**
 * The units a line reaches, as a player reads them: one name alone, two joined
 * by "and", more as the first and the last joined by "to" ("Spearman to
 * Pikeman").
 */
function lineReachWords(line: UnitTypeId): string {
  const names = unitLine(line).map((id) => unitDef(id).name);
  if (names.length <= 1) return names[0] ?? unitDef(line).name;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} to ${names[names.length - 1]}`;
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
    // **Which roads a counted route line is about** (batch C7). The route arm
    // below never runs for a counted row — this branch answers and returns — so
    // the one narrowing that arm would have printed has to be printed here, or
    // The Harbour Chain's coin by the distance reads as a coin on every road.
    // Said in the same words `routeWhose` uses, so the two clauses of one card
    // cannot describe the same roads differently.
    //
    // **And the crossing** (Scientific batch S3, Books from the Ships): a
    // counted row narrowed to foreign or to home roads says which, in
    // `routeWhose`'s words for it, for the same reason.
    const roads: string[] = [];
    if (effect.where === 'route') {
      if (effect.mode !== undefined) roads.push(effect.mode === 'sea' ? 'run by sea' : 'run overland');
      if (effect.crossing !== undefined) {
        roads.push(
          effect.crossing === 'international'
            ? 'that end in another empire’s city'
            : 'between two of your own cities',
        );
      }
    }
    const medium = roads.length === 0 ? '' : `, on trade routes ${roads.join(' and ')}`;
    out.push({
      text:
        `${payoutWords(effect, 1, voice)}${place.paidIn} per ${countWords(effect.per, words)}` +
        `${here}${cap}${counted}${medium}`,
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
    // **And once for each of them**, where the row is paid per peak
    // (`perAdjacentMountain`). A tail rather than a word inside the hex's own
    // phrase: the condition already says *which* hexes ("every farm beside a
    // mountain") and this says how many helpings one of them is worth, which is
    // a different sentence and reads as one — "on every farm beside a mountain,
    // once for each mountain".
    const perPeak = effect.perAdjacentMountain === true ? ', once for each mountain' : '';
    // **And once for every neighbour that answers** (`perNeighbour`, first
    // printed in batch C2 for Mining Districts). The peaks' tail one field over
    // and the same sentence: the condition above says which hexes are paid and
    // this says how many helpings one of them is worth. The divisor rides in
    // `per` and the ceiling in `max`, exactly as a counted line's do, so the
    // whole clause reads "on every worked mine, once for every 2 adjacent hexes
    // with a Mine".
    const ring = effect.perNeighbour;
    const perRing =
      ring === undefined
        ? ''
        : `, once for every ${countWords(effect.per, {
            one: `adjacent ${tileConditionWords(ring)}`,
            many: `adjacent ${tileConditionWords(ring).replace(/\bhex\b/, 'hexes')}`,
          })}` + (effect.max === undefined ? '' : ` (at most ${effect.max})`);
    if (words) {
      out.push({ text: `${words} on every ${tileConditionWords(on)}${whose}${perPeak}${perRing}` });
    }
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
    // The whole hex's share (Dominion batch D8, The Strategoi's citadels): its
    // own clause, said as "the yields of" because the share reaches all of
    // them, the lines other cards put on the hex included. A doubling reads as
    // doubled, as the card says it.
    if (effect.wholePercent !== undefined && effect.wholePercent !== 0) {
      out.push({
        text:
          effect.wholePercent === 100
            ? `the yields of every ${tileConditionWords(on)} are doubled${whose}`
            : `the yields of every ${tileConditionWords(on)} are ` +
              `${signed(effect.wholePercent)}%${whose}`,
      });
    }
    return;
  }

  if (effect.where === 'route') {
    // **All six voices since batch C8.** A caravan paid five and faith stayed
    // out of `RouteYieldLine` while nothing paid it; Pilgrim Markets does, so
    // the bag is read whole. This was a real gap and not only a missing card:
    // Mansa Musa's The Hajj has always printed "+2 faith" on a road and the
    // words dropped it here exactly as the fold dropped the figure.
    const words = bagWords({
      food: effect.food,
      production: effect.production,
      gold: effect.gold,
      science: effect.science,
      culture: effect.culture,
      faith: effect.faith,
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
    // **Who the coin goes to**, said only when it is not the obvious answer.
    // A caravan's line has always been paid to whoever the trade route's own fold pays,
    // and the one row shape that breaks that says so out loud — "to the city it
    // reaches" — because the whole point of the card is that somebody else gets
    // it. See `CardPaysEffect.payee`.
    const toWhom = effect.payee === 'host' ? ', paid to the city it reaches' : '';
    out.push({ text: `${words} on ${whose}${each}${toWhom}` });
    return;
  }

  const words = bagWords(effect);
  if (!words) return;
  if (effect.where === 'empire') {
    out.push({ text: `${words} to the empire` });
    return;
  }
  // The bilateral grant at the town scale: the payee is a foreign city holding
  // this empire's trading post, and no scope can say that because a scope narrows
  // the towns a line already reaches. So the phrase is the payee's own.
  if (effect.payee === 'host') {
    out.push({ text: `${words} in every foreign city holding your trading post` });
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
  if (effect.where !== 'empire') return { paidIn, counted: 'there' };
  // A scope names which towns the empire's sum walks (The Acropolis' capital,
  // Dominion batch D4), so the words name them too.
  return {
    paidIn,
    counted: effect.scope === undefined ? 'in your cities' : `in ${scopeWordsFor(subject, effect.scope)}`,
  };
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
      const what = effect.defensive === true
        ? // The Burhs (Expansionist batch E5): the fortifications.
          'defensive buildings'
        : effect.empireBuilding === true
        ? // The class, ahead of the category and behind the named row: a rider
          // that says "empire buildings" is narrower than one that says
          // "culture buildings" and wider than one that names the Forum.
          'empire buildings'
        : effect.empireBuilding === false
        ? // The other half of the same question — "ordinary" is the word the
          // ratified text uses for a building that is not one of the realm's
          // single great houses, and the line has to say it or a card that
          // exempts them reads as if it did not.
          'ordinary buildings'
        : effect.building
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
      // **What one helping buys**, where the share is counted (The Great
      // Consecration). Through the count's own noun — the very table a `pays`
      // count, a counted wall and a counted trickle print through — so four
      // surfaces name one count one way. The ceiling is said in the figure a
      // player reads off the card, not in helpings: "at most +40%" is the
      // sentence, and "at most 8 helpings" is the plumbing.
      const counted =
        effect.count === undefined
          ? ''
          : ` per ${countWords(
              effect.per,
              countNoun(
                {
                  kind: 'pays',
                  where: 'empire',
                  basis: 'count',
                  count: effect.count,
                  // The towns a `citiesAdmitted` count counts (Expansionist
                  // batch E2). Every other count ignores it.
                  admits: effect.admits,
                },
                '',
              ),
            )}` +
            (effect.max === undefined
              ? ''
              : ` (at most ${signed(effect.percent * effect.max)}%)`);
      // The empire stage (Dominion batch D7, The Marian Reforms) multiplies what
      // the town's own bonuses made, and the words say so.
      const staged = effect.stage === 'empire' ? ", after the town's own bonuses" : '';
      // The Great Designs (Scientific batch S3): the bonus holds only while no
      // met empire knows the technology that opens what is being built.
      const ahead =
        effect.aheadOfMet === true
          ? ', while no empire you have met knows the technology that opens it'
          : '';
      out.push({
        text: `${signed(effect.percent)}% production toward ${what}${counted}${whose}${staged}${ahead}`,
      });
      return;
    }
    case 'rulePercent':
      out.push({
        text:
          // A world rule's reach (The Hunting Grounds, Dominion batch D7) says
          // how near: "within 10 hexes of your towns".
          (effect.range === undefined
            ? // The unit class a cost rule names (The Servian Reforms' military
              // units, Dominion batch D8) takes the place of "units".
              effect.rule === 'unitCost' && effect.class !== undefined
              ? RULE_WORDS[effect.rule](effect.percent).replace(/^units/, filterWords(effect.class))
              : RULE_WORDS[effect.rule](effect.percent)
            : RULE_WORDS[effect.rule](effect.percent).replace(
                'near your towns',
                `within ${effect.range} hexes of your towns`,
              )) +
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
          // **The scope replaces the noun rather than trailing after it**: "per
          // city joined to your capital by road" is the sentence, and "per city,
          // in every city joined to your capital by road" is that sentence said
          // twice. Built off `cityScopeWords` — the one sentence-builder — with
          // its leading promise taken off, so an adjective still sits before the
          // noun ("per puppet city") and a qualifier after it.
          (effect.per === 'city' ? ` per ${eachWords(effect.scope)}` : '') +
          // **The ceiling in capacity**, which is the figure the card prints:
          // The Great Chancery pays two a town to a ceiling of twelve, and "at
          // most 6 cities" would be the arithmetic asking the player to do it.
          (effect.per === 'city' && effect.max !== undefined
            ? ` (at most ${signed(effect.max)})`
            : ''),
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
      // A rank narrows the pieces too (The Keshik, Dominion batch D2): "mounted
      // units that are a Veteran or better".
      const who =
        (effect.class ? filterWords(effect.class) : 'all units') +
        (effect.rank === undefined ? '' : ` that are ${rankOrBetter(effect.rank)}`);
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
      const movement = (effect.movement ?? 0);
      // Where the stamp is written, when the row narrows it to one town — the
      // Terracotta Army's "units built in this city". The same sentence-builder
      // every other scoped clause uses, so a stamp and a yield say "in every
      // city with a Cathedral" the same way.
      // **Which pieces**, and **which till** (Mercenaries). The silhouette is
      // the roster's own word (`filterWords`) so "military units" and "mounted
      // units" are one clause; the bank trails, because a player reads *what is
      // stamped* first and *how it was paid for* second.
      // And **which levy raised it**, where the row narrows to levied pieces
      // (The Trained Bands, Expansionist batch E1).
      const who =
        (effect.class === undefined ? 'units' : filterWords(effect.class)) +
        (effect.levied === undefined ? '' : ` ${leviedWords(effect.levied)}`);
      const paid = effect.bought === undefined ? '' : ` bought with ${effect.bought}`;
      const born =
        effect.scope === undefined
          ? `${who}${paid}`
          : `${who}${paid} in ${cityScopeWords(effect.scope)}`;
      if (hp !== 0) {
        out.push({ text: `newly created ${born} gain ${signed(hp)} maximum health` });
      }
      if (strength !== 0) {
        out.push({ text: `newly created ${born} gain ${signed(strength)} combat strength` });
      }
      // The league a piece is born with, said in the same sentence as the other
      // two marks — "movement" is the word every allowance clause in the game
      // already uses (`unitStat`'s above), so a stamp and a standing bonus read
      // alike and a player can tell them apart only by "newly created", which is
      // exactly the difference.
      if (movement !== 0) {
        out.push({ text: `newly created ${born} gain ${signed(movement)} movement` });
      }
      // **What a unit is gained with** (Dominion batch D1): experience and a
      // starting rank. "You gain" rather than "newly created", because these two
      // are read when a town gains a unit (`realiseItem`) and never for a unit
      // from a ruin, which is a different set of units from the marks above.
      // A levied piece is already said to be raised, so "you gain" is left off.
      const gain = effect.levied === undefined ? ' you gain' : '';
      const gained =
        effect.scope === undefined
          ? `${who}${gain}${paid}`
          : `${who}${gain}${paid} in ${cityScopeWords(effect.scope)}`;
      if ((effect.experience ?? 0) > 0) {
        out.push({ text: `${gained} start with ${effect.experience} experience` });
      }
      if (effect.rank !== undefined) {
        out.push({ text: `${gained} start as ${rankName(effect.rank)}s` });
      }
      return;
    }
    case 'rule': {
      // **A rule about one building names it** (batch C7, Caravanserai Cities).
      // The stem in the table has a slot for the row's name rather than the
      // name baked in, so the words come from the building table exactly as
      // every other named thing in a describer does — and as a keyword ref, so
      // the Compendium links it.
      if (effect.building !== undefined) {
        out.push({ text: FLAG_RULE_BUILDING_WORDS(effect.rule, buildingWords(effect.building)) });
        return;
      }
      // A rule of the whole realm reads as itself; a rule of one line of
      // soldiers is said **of that line**, because "mounted units: pillaging
      // costs your units no movement" is the plumbing showing through a sentence
      // that ought to be about horsemen. See `FLAG_RULE_CLASS_WORDS`.
      // A rule narrowed to some towns says which, at the end ("in every city
      // with a Temple"). Only the faith-purchase rules carry a scope.
      const inTowns = effect.scope === undefined ? '' : ` in ${scopeWordsFor(subject, effect.scope)}`;
      if (effect.class === undefined && effect.rank === undefined) {
        out.push({ text: `${FLAG_RULE_WORDS[effect.rule]}${inTowns}` });
        return;
      }
      // A rank leads the line it narrows (The Varangian Guard's "Elite units",
      // Dominion batch D2).
      const ranked = effect.rank === undefined ? '' : `${rankName(effect.rank)} `;
      const who = `${ranked}${effect.class === undefined ? 'units' : filterWords(effect.class)}`;
      const narrowed = FLAG_RULE_CLASS_WORDS[effect.rule];
      out.push({
        text: `${narrowed ? narrowed(who) : `${who}: ${FLAG_RULE_WORDS[effect.rule]}`}${inTowns}`,
      });
      return;
    }
    case 'windfallRider': {
      // The occasion, narrowed where the row narrows it — "killing a barbarian
      // unit" rather than "killing a unit". See `occasionWords`.
      // The rider narrowed to **whose piece did it**, as a leading clause rather
      // than a suffix on each grant: the narrowing belongs to the rider and a
      // row may carry three of them (War Chief does), so a suffix would say it
      // three times. Glued to the occasion because every clause below opens
      // with the occasion — one seam, and a grant shape added later inherits
      // the narrowing without this arm being touched.
      const only = effect.class === undefined ? '' : `for ${filterWords(effect.class)} alone, `;
      // **The four narrowings D2c added, in a parenthesis after the occasion.**
      //
      // A parenthesis and not a trailing clause, which is the whole of what
      // makes them readable: English narrows "killing a barbarian unit" from the
      // inside and none of these can go there, so glued on with a comma they ran
      // straight into the verb — *"completing a building, where it is a culture
      // building, and only the first of its kind grants +20 production"* is a
      // sentence with two main clauses and no join. The parenthesis is the same
      // aside the ceiling already uses ("at most +30 science") and it closes
      // before the verb arrives.
      //
      // They ride the **occasion** rather than each grant, for the leading
      // clause's stated reason: a row may carry several grants (The Master
      // Workshops carries two) and a suffix on each would say the narrowing
      // twice.
      const narrowings: string[] = [];
      if (effect.buildingCategory !== undefined) {
        narrowings.push(`a ${effect.buildingCategory} building`);
      }
      if (effect.empireBuilding === true) narrowings.push('an empire building');
      if (effect.empireBuilding === false) narrowings.push('not an empire building');
      if (effect.first !== undefined) narrowings.push(FIRST_WORDS[effect.first]);
      if (effect.oncePerTurn === true) narrowings.push('at most once a turn');
      // Dominion batch D5: The New Code's ten turns. Copying the Enemy's "unit
      // you cannot build yet" narrows the noun, so it is said inside the
      // occasion's phrase below.
      if (effect.oncePerTurns !== undefined) {
        narrowings.push(`at most once every ${effect.oncePerTurns} turns`);
      }
      if (effect.defending === true) narrowings.push('only while it defends');
      // **"A building" narrows the moment from the inside** (batch C3), the way
      // the family does and for the family's stated reason: "buying anything (a
      // building)" is a parenthesis undoing the word in front of it, where
      // "buying a building" is the sentence the card actually makes. Applied to
      // the occasion's own phrase rather than glued on, and an occasion with no
      // such phrase is left alone — which keeps a row written onto the wrong
      // occasion silent rather than wrong.
      const occasionSaid = occasionWords(
        effect.occasion,
        effect.vsBarbarians === true,
        effect.capturedWonder === true,
        effect.wonder === true,
        effect.family,
      );
      // Up Through the Ranks names the rank it pays for, inside the occasion's
      // own phrase (Dominion batch D1): "one of your units becoming an Elite".
      // An occasion with no rank in its phrase is left as it was.
      const said =
        effect.rank === undefined
          ? occasionSaid
          : occasionSaid.replace(
              'earning a rank',
              `becoming ${indefinite(rankName(effect.rank))} ${rankName(effect.rank)}`,
            );
      // The size a town reaches (`atPopulation`), said inside the occasion's
      // own phrase where the table has one ("a city reaching 15 citizens for
      // the first time"), and in the parenthesis otherwise (Expansionist batch
      // E2, The Freedom of the City). Before E2 the narrowing was not printed.
      const sizedWords =
        effect.atPopulation === undefined ? undefined : AT_POPULATION_WORDS[effect.occasion];
      if (effect.atPopulation !== undefined && sizedWords === undefined) {
        narrowings.push(`at ${effect.atPopulation} citizens`);
      }
      const sized =
        effect.atPopulation === undefined || sizedWords === undefined
          ? said
          : sizedWords(effect.atPopulation);
      // The Flood Festival names the improvement it pays for, inside the
      // occasion's own phrase, the way "a building" narrows "anything" above.
      // The Coming of the Water names the building it pays for, inside the
      // occasion's own phrase (Expansionist batch E3): "completing an Aqueduct".
      const built =
        effect.building === undefined
          ? sized
          : sized.replace(
              'a building',
              (() => {
                const name = buildingDef(effect.building).name;
                return `${indefinite(name)} ${ref('building', effect.building, name)}`;
              })(),
            );
      const named =
        effect.improvement === undefined
          ? built
          : built.replace(
              'an improvement',
              (() => {
                const name = improvementDef(effect.improvement).name;
                return `${indefinite(name)} ${ref('improvement', effect.improvement, name)}`;
              })(),
            );
      // "killing a unit you cannot build yet" (Dominion batch D5, Copying the
      // Enemy), for the same reason "a building" narrows "anything".
      // "gaining a unit that no empire you have met can build" (Scientific
      // batch S3, Greek Fire), the same narrowing from the rivals' side.
      const unbuilt =
        effect.fallenUnbuilt === true
          ? named.replace('a unit', 'a unit you cannot build yet')
          : effect.unbuildableByMet === true
            ? named.replace('a unit', 'a unit that no empire you have met can build')
            : named;
      // The town the moment happened in: "disbanding a unit in a city building
      // a wonder" (Dominion batch D7, the disband occasion), "a great
      // engineer's act in a city raising the Magnum Opus" (Expansionist batch
      // E5, The Master of Works).
      const placed =
        effect.inTown === undefined
          ? unbuilt
          : `${unbuilt} in ${effect.inTown === true ? 'one of your cities' : `a city ${scopeCondition(effect.inTown)}`}`;
      const occasion =
        only +
        (effect.anyBuilding === true ? placed.replace('anything', 'a building') : placed) +
        (narrowings.length > 0 ? ` (${narrowings.join(', ')})` : '');
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
      // The age is a suffix on the figure too, when the rider grants a yield
      // or renown (Dominion batch D10). Take the City has two such riders, one
      // for science and one for culture. As a separate sentence, the age was
      // printed once for each rider, and the two copies were folded into
      // "×2" in the middle of the reward. A rider with no such figure
      // multiplies only the moment's own payout (Keeper of the Calendar's
      // ruin), so it keeps the separate sentence below. A heal is not
      // multiplied by the age, so it never takes the suffix.
      const ageOnFigure =
        effect.perAge === true &&
        ((grant?.yield !== undefined && grant.amount !== undefined) ||
          (grant?.renown !== undefined && grant.renown !== 0));
      const age = ageOnFigure ? ' for each age you have reached' : '';
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
          out.push({ text: `${occasion} grants ${figure}${age}${per}` });
        } else if (grant.fromTowns !== undefined) {
          // The Master of Works (Expansionist batch E5): the other towns' own
          // turn of production, read when the moment comes.
          const towns = eachWords(grant.fromTowns).replace(/\bcity\b/, 'cities');
          const share = grant.amount === 1 ? '' : `${grant.amount} times `;
          out.push({
            text: `${occasion} grants ${grant.yield} equal to ${share}the production per turn of your other ${towns}${age}${grantDeliveryWords(grant)}${per}`,
          });
        } else if (grant.fromOccasion !== undefined) {
          // **A share of the moment reads as a share of the moment**, for the
          // reason the turn above it reads as turns: "culture equal to ten times
          // its population" is the promise the card makes, and printing whatever
          // it happened to come to on one occasion would be a card that says
          // something different every time it is read. A multiplier of one is
          // the bare measure ("culture equal to its strength"); a fraction reads
          // as a percentage, because "0.1 times the gold paid" is not a sentence
          // anybody has said out loud.
          // An occasion about the whole empire, or about the city that
          // finished a thing, says whose measure it is (Expansionist batch
          // E2): see `OCCASION_MEASURE_WORDS`.
          const figure = measuredWords(grant.yield, grant.amount, grant.fromOccasion, effect.occasion);
          // The ceiling trails, because a player reads *what is paid* first and
          // *how much at most* second — the duration clause's own order, one
          // grant shape over.
          const cap = grant.max === undefined ? '' : `, at most ${Math.abs(grant.max)}`;
          // Where the food and hammers land, where the row says (Spolia's Opus
          // town, and Dominion batch D3's three).
          const where = grantDeliveryWords(grant);
          out.push({ text: `${occasion} grants ${figure}${age}${where}${cap}${per}` });
        } else {
          // Once for each item a count finds (Dominion batch D5): Valhalla's
          // Monuments and The Mural Crown's great generals.
          const each = grant.perCount === undefined ? '' : ` for each ${grantCountWords(grant.perCount)}`;
          out.push({
            text: `${occasion} grants ${signed(grant.amount)} ${grant.yield}${each}${age}${grantDeliveryWords(grant)}${per}`,
          });
        }
      }
      if (grant?.renown !== undefined && grant.renown !== 0) {
        // Renown reads as renown and never as a voice: it is the bucket a great
        // person comes out of, and a player who has read the Reliquary knows
        // exactly what the word buys.
        const favours =
          grant.renownFamily === undefined ? '' : `, favouring a great ${grant.renownFamily}`;
        // A share of the moment since Dominion batch D6 (Looted Art).
        const figure =
          grant.fromOccasion === undefined
            ? `${signed(grant.renown)} renown`
            : measuredWords('renown', grant.renown, grant.fromOccasion, effect.occasion);
        out.push({ text: `${occasion} grants ${figure}${age}${favours}${per}` });
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
      // Dominion batch D3's four things a pillage can do besides pay.
      if (grant?.healFull === true) {
        out.push({ text: `${occasion} heals the unit fully${per}` });
      }
      if (grant?.strike !== undefined) {
        const hexes = grant.strike.range === 1 ? 'hex' : 'hexes';
        out.push({
          text:
            `${occasion} strikes every enemy city within ${grant.strike.range} ${hexes} ` +
            `with ${grant.strike.percent}% of the unit’s strength, and never takes it`,
        });
      }
      if (grant?.unrestBeside === true) {
        out.push({
          text: `${occasion} throws each enemy city beside the hex that has no garrison into unrest`,
        });
      }
      if (grant?.pillageBeside === true) {
        out.push({ text: `${occasion} also pillages every enemy improvement beside the hex` });
      }
      // Expansionist batch E3: a lasting mark on the land, said from the rule
      // book's own table so the figure and the hexes are the mark's.
      if (grant?.mark !== undefined) {
        const rule = RULES.improvements.hexMarks[grant.mark];
        const hexes = tileConditionWords(rule.while).replace(/\bhex\b/, 'hex');
        out.push({
          text:
            `${occasion} gives every ${hexes} in the borders of the city where it happens ` +
            `${bagWords(readTileYield(rule.yields))} for the rest of the game`,
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
        // **A window says it is a window** (batch C4, `WindfallGrantSpec.timed.
        // renews`). "for 5 turns" and "for the next 5 turns, however often it
        // happens" promise different things — one stacks and one does not — and
        // a player who was not told which would plan around the wrong one.
        const howLong =
          grant.timed.renews === true
            ? `for the next ${turns} turns, however often it happens`
            : `for ${turns} turns`;
        out.push({
          text:
            `${occasion} ${pays ? 'grants' : 'costs your empire'} ` +
            `${inner.map((clause) => clause.text).join('; ')} ${howLong}${per}`,
        });
      }
      if (grant?.healAll === true) {
        // A flag, so a sentence and not a figure — the ratified text is *heals
        // all*, and a number here would be a second, quieter rule.
        out.push({ text: `${occasion} heals every one of your units${per}` });
      }
      // Dominion batch D8, The Soldiers' Share: the heal and the rank around
      // the hex. One sentence when the two radii agree, as the card says it.
      const healWithin = grant?.healWithin ?? 0;
      const rankWithin = grant?.rankWithin ?? 0;
      if (healWithin > 0 && healWithin === rankWithin) {
        out.push({
          text:
            `${occasion} fully heals every unit of yours within ${healWithin} hexes ` +
            `and raises each by one rank${per}`,
        });
      } else {
        if (healWithin > 0) {
          out.push({ text: `${occasion} fully heals every unit of yours within ${healWithin} hexes${per}` });
        }
        if (rankWithin > 0) {
          out.push({ text: `${occasion} raises every unit of yours within ${rankWithin} hexes by one rank${per}` });
        }
      }
      // Dominion batch D8, The Scourge of God: the effects hung on the unit
      // that acted, in the nested clauses' own words, as `timed` above.
      if (grant?.actorTimed !== undefined && grant.actorTimed.effects.length > 0) {
        const inner: CardClause[] = [];
        for (const nested of grant.actorTimed.effects) describeEffect(nested, inner, subject);
        const turns = Math.max(1, grant.actorTimed.turns);
        const howLong =
          grant.actorTimed.renews === true
            ? `for the next ${turns} turns, however often it does so`
            : `for ${turns} turns`;
        out.push({
          text:
            `${occasion} gives the unit ${inner.map((clause) => clause.text).join('; ')} ` +
            `${howLong}${per}`,
        });
      }
      if (grant?.unit === 'randomMilitary') {
        out.push({ text: `${occasion} grants a random military unit${unitDeliveryWords(grant)}${per}` });
      }
      // Dominion batch D5's two unit kinds.
      if (grant?.unit === 'bestMelee') {
        out.push({
          text: `${occasion} grants the best melee unit you can build${unitDeliveryWords(grant)}${per}`,
        });
      }
      if (grant?.unit === 'unlockedByTech') {
        out.push({
          text: `${occasion} grants one of each military unit it unlocks${unitDeliveryWords(grant)}${per}`,
        });
      }
      if (grant?.towardFallenTech !== undefined) {
        out.push({
          text:
            `${occasion} grants science toward the technology that unlocks that unit, ` +
            `equal to ${grant.towardFallenTech}% of its cost`,
        });
      }
      if (grant?.freeDraft === true) {
        out.push({ text: `${occasion} opens an Order draft at once, at no culture cost` });
      }
      if (grant?.pressure !== undefined && grant.pressure.amount !== 0) {
        // **The plain words** (hard rule 7): "pressure" is the ledger's word for
        // it, and what a player sees is their faith spreading to the towns near
        // where it happened. The range is said in hexes because it is the half a
        // player plans around — how close the fighting has to be.
        // A range of nought reaches only the city on the hex itself — The
        // Crusader Orders' captured town (batch S) — so it says that.
        out.push({
          text:
            grant.pressure.range <= 0
              ? `${occasion} spreads your religion to the city where it happens${per}`
              : `${occasion} spreads your religion to every city within ` +
                `${grant.pressure.range} hexes${per}`,
        });
      }
      if (effect.percent !== undefined) {
        out.push({ text: `${occasion} pays ${signed(effect.percent)}%${per}` });
      }
      if (effect.perAge === true && !ageOnFigure) {
        // The multiplier is the age *number* (`highestAge`), so "once for each
        // age you have reached" is the exact reading and not a rounding of one:
        // ×1 in the first age, ×3 in the third. A rider that grants a yield or
        // renown says the age on that figure instead (see `ageOnFigure`).
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
      // **The escort condition** (Dominion batch D1, The Armed Colony) is a
      // condition on the whole row, so every clause below says it at its end.
      const beside =
        effect.escort === undefined
          ? ''
          : `, when founded beside one of your ${filterWords(effect.escort)}`;
      const limit =
        (effect.maxCities === undefined ? '' : ` (first ${effect.maxCities} cities)`) + beside;
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
      if (effect.claims !== undefined && effect.claims > 0) {
        const hexes = effect.claims === 1 ? 'hex' : 'hexes';
        out.push({
          text: `new cities claim ${effect.claims} more ${hexes} beside their borders at once${limit}`,
        });
      }
      if (effect.fromLargest !== undefined && effect.fromLargest > 0) {
        // The Great Colonies (Expansionist batch E2). A share with a common
        // name reads as that name ("a third"); any other reads as a rate.
        const share = SHARE_WORDS[effect.fromLargest];
        out.push({
          text:
            share === undefined
              ? `new cities start with one citizen for every ${effect.fromLargest} citizens of your largest city${limit}`
              : `new cities start with ${share} of the citizens of your largest city, rounded down${limit}`,
        });
      }
      if (effect.escort !== undefined && effect.rank !== undefined) {
        const rank = rankName(effect.rank);
        const first = effect.maxCities === undefined ? '' : ` (first ${effect.maxCities} cities)`;
        out.push({
          text: `a new city founded beside one of your ${filterWords(effect.escort)} makes that unit ${indefinite(rank)} ${rank}${first}`,
        });
      }
      if (effect.claimRadius !== undefined && effect.claimRadius > 1) {
        // The Staked Claims (Expansionist batch E4).
        out.push({
          text: `new cities claim every unowned hex within ${effect.claimRadius} hexes of them at once${limit}`,
        });
      }
      if (effect.unit !== undefined) {
        // The Frontier Militia (Expansionist batch E5), in the commission
        // reward's own words for a unit.
        const what =
          effect.unit === 'bestMelee'
            ? 'the best melee unit you can build'
            : `${indefinite(unitDef(effect.unit).name)} ${ref('unit', effect.unit, unitDef(effect.unit).name)}`;
        out.push({ text: `new cities start with ${what} standing in them, free of upkeep${limit}` });
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
      // **The third sentence this shape can make** (batch C3): a narrowed draft,
      // not a wider one. Read before the figure because a row carrying a family
      // deals no extra card at all — `explainOfferSize` skips it for the same
      // reason — so a figure printed here would be a promise nothing keeps.
      //
      // The fallback is said out loud. A player who reads "only great merchants"
      // and then draws an engineer has been lied to by the card, and the
      // fallback is the whole of the ruling this row exists under.
      if (effect.family !== undefined) {
        out.push({
          text:
            `${OFFER_DRAFT_WORDS[effect.offer]} shows only great ${effect.family}s, ` +
            `until there are none left to call`,
        });
        return;
      }
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
      // **Where the slot is opened**, when the row opens one per town rather
      // than one per realm (Harbourmasters). The same sentence-builder every
      // other scoped clause uses, so a route and a yield say "in every coastal
      // city with a Harbour" the same way.
      const where =
        effect.scope === undefined ? '' : ` in ${scopeWordsFor(subject, effect.scope)}`;
      // **What buys one road**, where the rider is counted rather than scoped
      // (The Harbour Chain). The scope is read first in the evaluator, so it is
      // read first here too — a row asking both questions is asking one, and the
      // words say the one that pays. Through the count's own noun, and the
      // ceiling in roads because that is the figure the card prints.
      const counted =
        effect.scope !== undefined || effect.count === undefined
          ? ''
          : ` per ${countWords(
              effect.per,
              countNoun(
                {
                  kind: 'pays',
                  where: 'empire',
                  basis: 'count',
                  count: effect.count,
                  building: effect.building,
                },
                '',
              ),
            )}` + (effect.max === undefined ? '' : ` (at most ${signed(extra * effect.max)})`);
      // **The sign is the figure's**, not the clause's (C1, The Scholars' Roads,
      // the first rider that *narrows* the realm's capacity): a hard-coded plus
      // printed "+-4 trade routes" the day a row bought its quality with fewer
      // roads. `signed` is the one place a figure's sign is written in this
      // file, and the plural still reads off the size rather than the sign, so
      // "−4 trade routes" and "+4 trade routes" are one sentence with one word
      // changed.
      out.push({
        text: `${signed(extra)} trade ${Math.abs(extra) === 1 ? 'route' : 'routes'}${counted}${where}`,
      });
      return;
    }
    case 'effectAmplifier': {
      // Two dials, one clause each, and a row that turns both says both — the
      // flat step first, because that is the order the arithmetic takes it in.
      //
      // **A family narrows the noun inside the sentence**, which is why the
      // table takes it rather than a qualifier being glued on the end: "a great
      // artist's act pays +100%" is the sentence, and "a great person's act pays
      // +100%, for artists" is that sentence apologising for itself.
      const who = effect.family;
      if (effect.amount !== undefined) {
        out.push({ text: familyNarrowed(AMPLIFIER_FLAT_WORDS[effect.target](effect.amount), who) });
      }
      if (effect.percent !== undefined) {
        out.push({ text: familyNarrowed(AMPLIFIER_WORDS[effect.target](effect.percent), who) });
      }
      return;
    }
    case 'slotRider': {
      // A figure, and a figure is a thing a player has to be told — the route
      // rider's own reading one council over. "Free" is the word the design uses
      // for a chair a government did not have to pay for.
      const extra = (effect.extra ?? 1);
      out.push({
        text: `every government opens ${extra === 1 ? 'one more free chair' : `${extra} more free chairs`}`,
      });
      return;
    }
    case 'meterRule': {
      // Two shapes wear this hook and they read differently. A **switch** — a
      // rule of the meters suspended, carried as `value: 1` because the shape
      // has no boolean — is already a whole sentence in `METER_RULE_WORDS`, and
      // "borders keep growing … is 1" was that sentence with its plumbing left
      // showing. A **number** is a figure a player has to be told.
      // **A city price says which cities**, off the one sentence-builder, or the
      // row prints a promise it keeps in four towns out of twenty. The noun is
      // the scope's with its leading "every" taken off — "the authority a city
      // holding an empire building costs" — which is where English puts an
      // adjective and where `eachWords` already puts one for the writ's own
      // gains.
      const words =
        effect.rule === 'cityCost' && effect.scope !== undefined
          ? `the authority ${indefinite(eachWords(effect.scope))} ${eachWords(effect.scope)} costs`
          : METER_RULE_WORDS[effect.rule];
      if (METER_RULE_SWITCHES.includes(effect.rule)) {
        out.push({ text: words });
        return;
      }
      // A delta is a rise or a fall in a figure the player already knows, so it
      // is said that way — "the authority a captured city costs falls by 1" —
      // rather than as a bare signed number hanging off a noun phrase.
      const delta = effect.delta ?? 0;
      // A percentage on a town's price (The Universal Monarchy, Dominion batch
      // D4) is said the same way, as a rise or a fall. +100% is "doubles".
      if (effect.value === undefined && effect.percent !== undefined) {
        const percent = effect.percent;
        out.push({
          text:
            percent === 100
              ? `${words} doubles`
              : `${words} ${percent < 0 ? 'falls' : 'rises'} by ${Math.abs(percent)}%`,
        });
        return;
      }
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
      // Double Time (Dominion batch D7) is the second rule: how many times an
      // Order's turn effects happen.
      if (effect.rule === 'turnEffectRepeats') {
        out.push({
          text:
            effect.value === 2
              ? "your Orders' effects that happen at the end of a turn or every few turns happen twice"
              : `your Orders' effects that happen at the end of a turn or every few turns happen ${effect.value} times`,
        });
        return;
      }
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
      // The Nation in Arms musters in every town its scope admits.
      const where =
        effect.where === 'city' ? `in ${cityScopeWords(effect.scope)}` : 'in your capital';
      // Total Mobilisation's price (Dominion batch D5).
      const price = effect.costsCitizen === true ? ', for a citizen' : '';
      out.push({
        text: `every ${effect.every} turns, ${what} musters ${where}${price}${kept}`,
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
        text: `unlocks ${theBuilding(effect.building)}${does === '' ? '' : ` — ${does}`}`,
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
      // **Which shelf**, where the building half names one (The Tithe's
      // religious houses). `CardProductionBonusEffect.buildingCategory`'s own
      // phrase, so a card that discounts culture houses at the counter and a
      // card that speeds them in the queue read as one sentence.
      // `empireBuilding` names the class ahead of the shelf, exactly as the
      // production bonus' own phrase does, so a card that discounts the
      // ordinary shelves at the counter and a card that slows them in the queue
      // read as one sentence.
      const houses =
        effect.empireBuilding === true
          ? 'empire buildings'
          : effect.empireBuilding === false
            ? 'ordinary buildings'
            : effect.buildingCategory === undefined
              ? 'buildings'
              : `${effect.buildingCategory} buildings`;
      const what =
        on === 'building'
          ? houses
          : // **The road, which is not a row on a shelf** (batch C7, The Factors'
            // Houses). It names what a player actually buys — the caravan —
            // rather than "a trade route", because the price is the cart's and
            // the sentence reads as a thing with a price on it. `class` is not
            // asked of it, exactly as it is not asked of a building, so the
            // filter's "all units" must not leak in here.
            on === 'route'
            ? 'hiring a caravan'
            : on === 'all'
              ? `${filterWords(effect.class)} and ${houses}`
              : filterWords(effect.class);
      // **Where the price is asked**, when it is not asked everywhere — a rider
      // that read as a realm-wide discount and paid only in the barracks towns
      // is a card that lies by omission. The one sentence-builder, trailing as
      // its own clause exactly as a scoped `productionBonus`' does.
      const where = effect.scope === undefined ? '' : `, in ${cityScopeWords(effect.scope)}`;
      // **A route takes a verb, not a plural** (batch C7). Every other subject
      // this arm prints is a *plural of things on a shelf* — "mounted units
      // cost −20% to buy" — and "hiring a caravan cost −15% to buy" is that
      // stem with the wrong number and a second verb for the same act. So the
      // road gets its own sentence, in the same order and with the same sign
      // discipline.
      if (on === 'route') {
        out.push({
          text:
            `${what} costs ${Math.abs(percent)}% ${percent < 0 ? 'less' : 'more'}${where}`,
        });
        return;
      }
      // "cost −25%", not "−25% cost": the sign belongs to the price, and a
      // discount read as a bonus is the one thing this line must not do.
      out.push({
        text: `${what} cost ${percent < 0 ? '−' : '+'}${Math.abs(percent)}% to buy${where}`,
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
          ? // **Which towns**, where the trickle names a class of them — seven
            // Magisterial rows whose whole subject is the provinces that earned
            // it. The one sentence-builder, so a renown line and a yield line
            // say "every city outside your capital with two culture buildings"
            // the same way. A row naming no scope keeps the old words exactly.
            ` in ${scopeWordsFor(subject, effect.scope)}`
          : effect.per === 'wonder'
            ? ' per wonder you hold'
            : effect.per === 'buildingOfCategory'
              ? // The shelf names itself, because "per building" would not say
                // which — Patrons pays for the culture houses and nothing else.
                ` per ${effect.category ?? ''} building you hold`
              : // **A counted trickle** (Patronage's capital citizens), said
                // through the count's own noun — the same table a `pays` count
                // and a counted wall print through, so three surfaces name one
                // count one way.
                //
                // **Town by town where the row says so** (`within: 'city'`,
                // batch C5): the towns lead and the count trails, because that
                // is the order the sentence has to be read in — "in every city
                // with a culture building, per trade route to another empire
                // leaving it" names the city before "it" refers back to it.
                effect.count !== undefined
                ? `${effect.within === 'city' ? ` in ${scopeWordsFor(subject, effect.scope)},` : ''}` +
                  ` per ${countWords(effect.countPer, countNoun({ kind: 'pays', where: 'empire', basis: 'count', count: effect.count, tile: effect.tile, within: effect.within }, ''))}`
                : '';
      // **The per-town ceiling, said out loud.** A cap on an empire count is
      // already inside the figure a player sees; a cap per town is not, and a
      // card that promised one renown a route without saying where it stopped
      // would be the kind of silence hard rule 7 exists to prevent.
      const cap =
        effect.within === 'city' && effect.max !== undefined
          ? `, at most ${effect.amount * effect.max} per city`
          : '';
      const family = effect.family === undefined ? '' : `, favouring ${effect.family}s`;
      out.push({
        text: `${signed(effect.amount)} renown per turn${where}${cap}${family}`,
      });
      return;
    }
    case 'pressureRule': {
      const delta = effect.delta;
      // A scoped shift names the towns it shields in place of "your cities"
      // (The Peace of God: the city building the Magnum Opus).
      if (effect.rule === 'rivalPressurePercent' && effect.scope !== undefined) {
        const whom = scopeWordsFor(subject, effect.scope);
        out.push({
          text:
            delta <= -100
              ? `rival religions cannot press ${whom}`
              : `rival religions press ${whom} ${Math.abs(delta)}% ${delta < 0 ? 'less' : 'more'}`,
        });
        return;
      }
      const where = effect.scope === undefined ? '' : ` in ${scopeWordsFor(subject, effect.scope)}`;
      out.push({ text: `${PRESSURE_RULE_WORDS[effect.rule](delta)}${where}` });
      return;
    }
    case 'pressure': {
      // **What buys one helping**, where the stones press by the count — the
      // High Temple's citizens. `cityStat`'s clause exactly, and through the
      // same noun table, so a wall counted per citizen and a tide counted per
      // citizen read as one sentence.
      const each =
        effect.count === undefined
          ? ''
          : ` per ${countWords(effect.per, countNoun({ kind: 'pays', where: 'city', basis: 'count', count: effect.count, within: 'city' }, ''))}`;
      out.push({
        text:
          `spreads your religion ${signed(effect.amount)} faith${each} ` +
          `to every city within ${effect.range} hexes`,
      });
      return;
    }
    case 'upkeepRebate': {
      // Only the pieces a levy raised, where the row says so (The General
      // Levy, Expansionist batch E1).
      const who =
        effect.levied === undefined
          ? effect.class
            ? filterWords(effect.class)
            : 'all units'
          : `${effect.class ? filterWords(effect.class) : 'units'} ${leviedWords(effect.levied)}`;
      const where = WHERE_WORDS[effect.where ?? 'anywhere'];
      if (effect.free === true) {
        out.push({ text: `${who} cost no gold in maintenance${where}` });
        return;
      }
      const off = (effect.amount ?? 0);
      // The Soldiers' Purse (Dominion batch D2): once for each rank held.
      const per = effect.perRank === true ? ' for each rank they hold' : '';
      out.push({ text: `${who} cost ${off} less gold in maintenance${per}${where}` });
      return;
    }
    // The same sentence with the sign turned round — "more" where the rebate
    // says "less", and the same two narrowings read the same way.
    case 'upkeepSurcharge': {
      // A rank narrows the pieces (Centurions' "Elite units", Dominion batch
      // D8), said as `rankedWords` says it.
      const who =
        effect.rank === undefined
          ? effect.class
            ? filterWords(effect.class)
            : 'all units'
          : rankedWords(effect.rank, effect.class ? filterWords(effect.class) : 'units');
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
      if (effect.reads === 'followerBeliefs') {
        // The Doctors of the Church: what follower beliefs pay a town of yours.
        out.push({
          text:
            `what follower beliefs pay ${effect.yield === 'all' ? '' : `in ${voice} `}` +
            `in your own cities is ${signed(effect.percent ?? 0)}% more${where}`,
        });
        return;
      }
      if ((effect.amount ?? 0) !== 0) {
        out.push({
          text:
            `your Orders that give ${voice} give ${signed(effect.amount ?? 0)} more` +
            ` on every line they pay${where}`,
        });
      }
      if ((effect.percent ?? 0) !== 0) {
        // A tile test names the hexes (The Age of Improvement, Expansionist
        // batch E3): "on improved hexes", and "a yield" is left out, because
        // every voice is meant.
        const ground =
          effect.on === undefined
            ? `in ${voice}`
            : `on ${tileConditionWords(effect.on).replace(/\bhex\b/, 'hexes')}`;
        out.push({
          text: `what your other Orders pay ${ground} is ${signed(effect.percent ?? 0)}% more${where}`,
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
    case 'levy':
      describeLevy(effect, out);
      return;
    case 'unlocksImprovement': {
      // Expansionist batch E4: the row a seated card opens, with what the row
      // itself does, read off the row (`workRowFacts`), so a retuned row
      // re-words itself. Said for the chair, because the card opens it only
      // while it is seated.
      const def = improvementDef(effect.improvement);
      const facts = workRowFacts(effect.improvement);
      out.push({
        text: `while this card is seated, your workers may build ${indefinite(def.name)} ${ref('improvement', effect.improvement, def.name)}${facts.length === 0 ? '' : `: ${facts.join('; ')}`}`,
      });
      return;
    }
    case 'worksBeyond': {
      // Expansionist batch E4, The Garden Frontier.
      const hexes = effect.reach === 1 ? 'hex' : 'hexes';
      out.push({
        text: `your workers may lay tended works on unowned wild hexes up to ${effect.reach} ${hexes} beyond your borders, and a hex worked there joins your nearest city`,
      });
      return;
    }
    case 'encroach': {
      // Expansionist batch E4, The Encroaching Fields (the triage's reading 38).
      out.push({
        text: `every ${effect.every} turns, each of your cities of at least ${effect.minPopulation} citizens takes one hex nobody works from the borders of a smaller foreign city next to it`,
      });
      return;
    }
    case 'migration': {
      // Expansionist batch E4: Migration (the triage's reading 36) and The
      // Great Migration (reading 37).
      const reach = effect.reach ?? 3;
      out.push({
        text:
          effect.source === 'own'
            ? `every ${effect.every} turns, while your happiness is 0 or below, your largest city sends one citizen to your smallest city joined to your capital`
            : `every ${effect.every} turns, while your happiness is above 0 and above another empire's, each city of that empire within ${reach} ${reach === 1 ? 'hex' : 'hexes'} of your borders with at least 2 citizens loses one citizen to your nearest city`,
      });
      return;
    }
    case 'drill': {
      // Dominion batch D1. Who is drilled, how much, and how often; "combat
      // units" because only an empire's fighting units hold experience
      // (`ranks.ts`), and the garrison's words are the `garrison` count's.
      const who =
        effect.where === 'garrison'
          ? 'your combat units standing in one of your cities'
          : 'your combat units on or beside the hex of one of your great generals';
      const every = Math.floor(effect.every ?? 1);
      const when = every <= 1 ? 'at the end of every turn' : `every ${every} turns`;
      out.push({ text: `${who} gain ${effect.experience} experience ${when}` });
      return;
    }
    case 'surplusToProduction': {
      // Dominion batch D7, The Laws of Lord Shang. What the town builds, then
      // the towns the row names.
      const building =
        effect.category === undefined
          ? ''
          : effect.category === 'unit'
            ? ` building ${effect.class === undefined ? 'a unit' : `a ${filterWords(effect.class).replace(/s$/, '')}`}`
            : effect.category === 'wonder'
              ? ' building a wonder'
              : ' building a building';
      const towns = effect.scope === undefined ? 'a city' : `a city ${scopeCondition(effect.scope)}`;
      out.push({
        text: `${towns}${building} puts its food surplus into production instead of into growth`,
      });
      return;
    }
    case 'harvest':
      // Dominion batch D7, War Feeds Itself.
      out.push({
        text:
          `at the end of each turn, each of your ${effect.class === undefined ? 'units' : filterWords(effect.class)} ` +
          'in the territory of an empire you are at war with yields you the yields of its hex',
      });
      return;
    default: {
      const unhandled: never = kind;
      void unhandled;
      return;
    }
  }
}

/**
 * "raised by a levy", "raised by a conscription levy": the words for a row
 * narrowed to the pieces a levy raised (Expansionist batch E1). A use names its
 * own levy; `true` is any levy.
 */
function leviedWords(levied: true | LevyUse): string {
  if (levied === true) return 'raised by a levy';
  if (levied === 'conscript') return 'raised by a conscription levy';
  if (levied === 'muster') return 'raised by a muster levy';
  return 'raised by a levy';
}

/**
 * A levy card's words (batch L): what a town may spend a citizen on, and what
 * a levy leaves behind. The shared waiting period is said on the use clause,
 * because it is the half of the rule a player plans around.
 */
function describeLevy(effect: CardLevyEffect, out: CardClause[]): void {
  const levy = RULES.cities.levy;
  const size = Math.max(levy.minPopulation, Math.floor(effect.minPopulation ?? 0));
  // Which towns, where the row narrows them (Dominion batch D1): The
  // Devshirme's "captured towns", in the scope's own words.
  const noun = effect.scope === undefined ? 'town' : eachWords(effect.scope);
  const town =
    size > levy.minPopulation
      ? `${indefinite(noun)} ${noun} of at least ${size} citizens`
      : `${indefinite(noun)} ${noun}`;
  const food = 'production equal to the food it took to grow that citizen';
  const opusId = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true);
  const opus = opusId === undefined ? 'the Magnum Opus' : theBuilding(opusId);
  // The rank the unit starts at, where the row names one (The Devshirme's
  // Veteran). Only the two uses that raise a unit say it.
  const rank =
    effect.rank === undefined
      ? ''
      : ` as ${indefinite(rankName(effect.rank))} ${rankName(effect.rank)}`;
  const melee = `the best melee unit you can build${rank}`;
  const use = effect.use;
  if (use !== undefined) {
    let what: string;
    switch (use) {
      case 'production':
        what = food;
        break;
      case 'muster':
        what = `${melee}, which counts as trained`;
        break;
      case 'opus':
        what = `${food}, paid to your other town building ${opus}`;
        break;
      case 'conscript':
        what = `${melee}, which does not count as trained`;
        break;
      // Expansionist batch E1: the empire's own worker or settler, science, and
      // hammers for a world wonder in another town.
      case 'worker':
        what = 'a worker';
        break;
      case 'settler':
        what = 'a settler';
        break;
      case 'science':
        what = 'science equal to the food it took to grow that citizen';
        break;
      case 'wonder':
        what = `${food}, paid to your nearest other town building a world wonder`;
        break;
      default: {
        const unhandled: never = use;
        void unhandled;
        what = '';
      }
    }
    const wait =
      effect.everyAtWar === undefined
        ? `once every ${levy.everyTurns} turns`
        : `once every ${levy.everyTurns} turns, or every ${
            effect.everyAtWar === 1 ? 'turn' : `${effect.everyAtWar} turns`
          } while you are at war`;
    out.push({ text: `${town} may spend one citizen for ${what} (${wait})` });
  }
  // The Mit'a and The Slack Season (Expansionist batch E1).
  if (effect.returnsAfter !== undefined) {
    const turns = Math.max(1, Math.floor(effect.returnsAfter));
    out.push({
      text: `a citizen spent on a levy comes home to its town ${turns} ${turns === 1 ? 'turn' : 'turns'} later`,
    });
  }
  if (effect.noWaitEvery !== undefined) {
    const every = Math.max(1, Math.floor(effect.noWaitEvery));
    out.push({
      text: `every ${ordinalWords(every)} turn, your towns may levy however long ago they last did`,
    });
  }
  const after = effect.after;
  if (after !== undefined) {
    // The effects land on the levying town alone, so they are read as "here".
    const inner = describeEffects(after.effects, 'here')
      .filter((clause) => clause.deferred !== true)
      .map((clause) => clause.text);
    if (inner.length > 0) {
      out.push({
        text: `after a town spends a citizen on a levy, it gains ${listWords(inner)} for ${
          after.turns
        } turns, at most once every ${after.every} turns`,
      });
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
  // The seat's reach. It says *carries* rather than "reaches further", because
  // the capital had no reach at all before a card gave it one — "further" would
  // be an increment on a distance the player has never been told about.
  capitalRange: (delta) => `your capital carries its faith ${signed(delta)} hexes`,
  templeOwnPercent: (delta) => `a Temple holds its own faith ${signed(delta)}% harder`,
  templeForeignPercent: (delta) =>
    delta < 0
      ? `a Temple turns away ${-delta}% more of a foreign faith`
      : `a Temple turns away ${delta}% less of a foreign faith`,
  bombRange: (delta) => `a proclamation reaches ${signed(delta)} hexes further`,
  bombLump: (delta) =>
    delta < 0
      ? `a proclamation presses ${-delta} faith less`
      : `a proclamation presses ${signed(delta)} faith harder`,
  routeBothWays: (delta) =>
    delta > 0 ? 'a caravan carries your faith both ways along its route' : 'a caravan carries your faith one way',
  rivalPressurePercent: (delta) =>
    delta <= -100
      ? 'rival religions cannot press your cities'
      : delta < 0
        ? `rival religions press your cities ${-delta}% less`
        : `rival religions press your cities ${delta}% more`,
};

/**
 * What a completion grant hands over, in words. See `CompletionGrant`.
 *
 * A **moment** leads every one of them, because that is the whole difference
 * between a grant and an effect: everything else on a card is true for as long
 * as the card is held, and this is true once. "on completion" is the moment a
 * wonder's stones go up and is therefore the default; a leader's boon pays the
 * same union at a different moment and says so by passing its own (batch L2b) —
 * one describer with one lead swapped, rather than a second vocabulary for the
 * same seven arms.
 */
export function grantWords(grant: CompletionGrant, when = 'on completion'): string {
  if (grant.grant === 'tech') return `${when}, the technology you are researching is finished`;
  if (grant.grant === 'doctrineDraft') return `${when}, a Doctrine draft opens`;
  if (grant.grant === 'bead') return `${when}, a glass bead is yours`;
  // Not "a free rung": a rung is the ladder's word for a threshold the bank
  // crossed, and this is the stones paying instead of the bank. What a player
  // needs is that a god arrives and that it costs them nothing.
  if (grant.grant === 'faithRung') return `${when}, a god is named, and your faith is not spent`;
  if (grant.grant === 'greatPerson') {
    return grant.family === undefined
      ? `${when}, a great person is offered`
      : `${when}, a great person of the ${grant.family}s is offered`;
  }
  if (grant.grant === 'building') {
    const name = buildingDef(grant.building).name;
    return `${when}, ${indefinite(name)} ${ref('building', grant.building, name)} is raised here as well`;
  }
  const what =
    grant.unit === 'bestMelee'
      ? 'the best melee unit you can build'
      : `${indefinite(unitDef(grant.unit).name)} ${ref('unit', grant.unit, unitDef(grant.unit).name)}`;
  return `${when}, ${what} joins you`;
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
    if (when.building !== undefined) {
      const which = when.where === 'capital' ? where : 'one of your cities is';
      return ` ${which} building ${buildingWords(when.building)}`;
    }
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
function slotFlavourWords(flavour: ChairType): PluralWords {
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
  // **The filtered garrison** — Martial Law's field soldiers, said in the words
  // the filter uses everywhere else. Asked before the town table below, because
  // the filter *replaces* that entry's noun ("combat unit standing …") rather
  // than qualifying it, and the place is composed in here the same way.
  if (effect.count === 'garrison' && effect.class !== undefined) {
    const at = place === '' || place === 'in this city' ? 'in the city' : place;
    const many = `${filterWords(effect.class)} standing ${at}`;
    return { one: many.replace(/\bunits\b/, 'unit'), many };
  }
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
  // **Which bank paid** (The Offered Stones' faith), where the row narrows it.
  if (effect.count === 'purchasedBuildings' && effect.bank !== undefined) {
    return {
      one: `building bought with ${effect.bank}`,
      many: `buildings bought with ${effect.bank}`,
    };
  }
  // The capital's own people, said once. `where: 'capital'` already names the
  // town the figure lands in, and "in your capital per 2 citizens in your
  // capital" is the plumbing showing through Fire Keepers — whose ratified text
  // says "for every 2 citizens living there".
  if (effect.count === 'capitalPopulation' && effect.where === 'capital') {
    return { one: 'citizen there', many: 'citizens there' };
  }
  // **The valley's own marvels** — `wonders` narrowed to the town it is paid in
  // (`within: 'city'`, batch L3c). Said here rather than in `TOWN_COUNT_WORDS`
  // because the place is *"in this city"* on a building's own page, which that
  // table is never asked for, and "per wonder you hold in this city" reads as
  // two claims about two places. Standing, not held: the count is what is on
  // this town's shelf.
  // **The town's own caravans abroad** — `foreignTradeRoutes` narrowed to the
  // town it is counted in (`within: 'city'`, batch C5). The direction is in the
  // words because it is in the count: a foreign route a town is counted for is
  // one that sets out from it, and "trade route to another empire" on its own
  // would read as the whole realm's.
  if (effect.count === 'foreignTradeRoutes' && effect.within === 'city') {
    const from = place === '' ? 'it' : place.replace(/^in /, '');
    return {
      one: `trade route to another empire leaving ${from}`,
      many: `trade routes to another empire leaving ${from}`,
    };
  }
  if (effect.count === 'wonders' && effect.within === 'city') {
    const at = place === '' ? 'in this city' : place;
    return { one: `wonder standing ${at}`, many: `wonders standing ${at}` };
  }
  // **One trade's guildsmen** (Scientific batch S2, The Scholars' Guild).
  if (effect.count === 'guildsmen' && effect.family !== undefined) {
    return {
      one: `${effect.family} in the trades`,
      many: `${effect.family}s in the trades`,
    };
  }
  // **One family's great people** (Dominion batch D5, The Mural Crown).
  if (effect.count === 'greatPeopleGained' && effect.family !== undefined) {
    return {
      one: `great ${effect.family} you have gained this game`,
      many: `great ${effect.family}s you have gained this game`,
    };
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
  // **The ground, said in the hex conditions' own words** (batch C2) — "per hex
  // with a Mine in the origin city", "per hex carrying a luxury resource in
  // your borders". `buildingsOfKind`'s bargain an eighth time: the argument is
  // printed here, so three cards counting three different facts about a hex are
  // one table entry.
  //
  // The town is in the noun rather than trailing it, because English wants it
  // after whatever the condition said about the hex — so this count answers
  // `countNamesItsTown`. A road's count names the town the caravan left, which
  // is the only town a route line is ever read against.
  // Provenance narrowed by bank and shelf — "per faith building bought with
  // gold" (The Waqf, Bought and Paid For). Absent, the plain entry below.
  if (
    effect.count === 'purchasedBuildings' &&
    (effect.bank !== undefined || effect.category !== undefined)
  ) {
    const shelf = effect.category === undefined ? '' : `${effect.category} `;
    const bank = effect.bank === undefined ? 'purchased' : `bought with ${effect.bank}`;
    return effect.bank === undefined
      ? { one: `${bank} ${shelf}building`, many: `${bank} ${shelf}buildings` }
      : { one: `${shelf}building ${bank}`, many: `${shelf}buildings ${bank}` };
  }
  // **The towns a scope admits, said in the scope's own words** (Expansionist
  // batch E2): "city of 8 or more citizens", "city with an Aqueduct", "city
  // joined to your capital by road". `eachWords` is the scope's one
  // sentence-builder with the leading "every" taken off.
  if (effect.count === 'citiesAdmitted' && effect.admits !== undefined) {
    const one = eachWords(effect.admits);
    return { one, many: one.replace(/\bcity\b/, 'cities') };
  }
  // **The gap on a road is the gap to the far end** (Scientific batch S3,
  // Books from the Ships): a route asks the count of the empire that owns the
  // destination, so the words name that empire rather than every met one.
  if (effect.count === 'techGap' && effect.where === 'route') {
    return {
      one: 'technology the destination’s owner knows that you do not',
      many: 'technologies the destination’s owner knows that you do not',
    };
  }
  if (effect.count === 'tilesInBorders' && effect.tile !== undefined) {
    const words = tileConditionWords(effect.tile);
    const at =
      effect.within !== 'city'
        ? 'in your borders'
        : effect.where === 'route'
          ? 'in the origin city'
          : place === '' || place === 'in this city'
            ? 'in this city'
            : place;
    return { one: `${words} ${at}`, many: `${words.replace(/\bhex\b/, 'hexes')} ${at}` };
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
  // The Fortress Empire (Dominion batch D7): a town's own borders, or the realm's.
  fortifiedUnits: (at) => {
    const where = at === 'there' ? 'inside its borders' : 'inside your borders';
    return { one: `fortified military unit ${where}`, many: `fortified military units ${where}` };
  },
  defensiveBuildings: (at) => ({ one: `fortification ${at}`, many: `fortifications ${at}` }),
  // The ninth, and the only one that is *not* a count that can only be asked of
  // a town: `wonders` is a realm's question narrowed to one town by `within`
  // (batch L3c). It is here so `countNamesItsTown` answers yes for the narrowed
  // row and the place is not printed twice — the noun `countNoun` builds for it
  // already carries one. An unnarrowed `wonders` row never reaches this table,
  // because a line that is not city-scoped has no place to hand in.
  wonders: (at) => ({ one: `wonder standing ${at}`, many: `wonders standing ${at}` }),
  // The three distinct-kind counts asked of a town (D2b). Each says **kind**
  // out loud and puts the place after the thing counted rather than after the
  // whole clause, which is the reason this table takes formatters at all: "per
  // kind of wild ground worked there" is the sentence, where `COUNT_WORDS`' own
  // words ("this city works") with a place glued on the end is the plumbing
  // showing through.
  distinctWorkedFeatures: (at) => ({
    one: `kind of wild ground worked ${at}`,
    many: `kinds of wild ground worked ${at}`,
  }),
  distinctWorkedGreatWorks: (at) => ({
    one: `kind of great person's work worked ${at}`,
    many: `kinds of great person's work worked ${at}`,
  }),
  distinctBuildingCategories: (at) => ({
    one: `kind of building standing ${at}`,
    many: `kinds of building standing ${at}`,
  }),
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
  // The ground count builds its own place into the noun ("hexes with a Mine in
  // the origin city"), so a tail would say the town twice. Its words are in
  // `countNoun` rather than in the table below because it takes an argument and
  // the table's formatters are handed only the place.
  if (effect.count === 'tilesInBorders') return true;
  // The town's caravans abroad, for the same reason: `countNoun` builds the
  // place into "leaving there", so a tail would name the town twice.
  if (effect.count === 'foreignTradeRoutes' && effect.within === 'city') return true;
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
  // Centurions (Dominion batch D8): only the units of a rank count, so the
  // rank is named: inside the phrase for the top rank ("adjacent friendly
  // Elite unit"), and after it for a lower one, which reaches the ranks above.
  if (scale.count === 'adjacentFriendlies' && scale.rank !== undefined) {
    if (scale.rank === RANK_IDS[RANK_IDS.length - 1]) {
      const rank = rankName(scale.rank);
      return { one: `adjacent friendly ${rank} unit`, many: `adjacent friendly ${rank} units` };
    }
    return {
      one: rankedWords(scale.rank, 'adjacent friendly unit', true),
      many: rankedWords(scale.rank, 'adjacent friendly units'),
    };
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
    case 'riverside':
      // "On a river", which is where the settler stopped — not "with fresh
      // water", which is the neighbouring scope and includes a lake.
      into.qualifiers.push('on a river');
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
      // "while it is building an empire building" — the narrowed reading gets
      // its own words rather than an adjective on the category, because "an
      // empire building" is the class's own name in the printed table and not a
      // kind of queue row.
      into.qualifiers.push(
        scope.empireBuilding === true
          ? 'while it is building an empire building'
          : `while it is building ${indefinite(scope.category)} ${scope.category}`,
      );
      return;
    case 'queueDepth':
      // "while it has 2 or more things to build" — the works list said the way a
      // player would say it, with the figure the row carries. `populationAtLeast`
      // prints its own the same way, one qualifier over.
      into.qualifiers.push(`while it has ${scope.atLeast} or more things to build`);
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
    case 'notCaptured':
      // The Universal Monarchy (Dominion batch D4): a town nobody took by force.
      into.qualifiers.push('you founded');
      return;
    case 'puppet':
      // The game's own word for the arrangement, and the one a player reads on
      // the city panel. An adjective, because "every puppet city" is the phrase
      // — never "captured", which is the sticky fact next door and stays true
      // after the town has been annexed.
      into.adjectives.push('puppet');
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
      // **And how long it has stood, where the row names a term** — "with a
      // Library that has stood at least 20 turns". The age rides in the same
      // qualifier rather than in a second one, because it is a fact about *that
      // building* and a clause of its own would have floated free of the thing
      // it describes.
      into.qualifiers.push(
        scope.standingTurns === undefined
          ? `with ${buildingWords(scope.building)}`
          : `with ${buildingWords(scope.building)} ${standingWords(scope.standingTurns)}`,
      );
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
    case 'garrisonRank':
      // The Fabricae (Dominion batch D2), in `garrisoned`'s words.
      into.qualifiers.push(`with ${rankOrBetter(scope.rank)} standing in it`);
      return;
    case 'generalPresent':
      // The Bakufu (Dominion batch D4), in `garrisoned`'s words.
      into.qualifiers.push('with a great general standing in it');
      return;
    case 'keepingRite':
      // The plain words again: a town "keeping a rite" is a town where one is
      // being performed, which is the sentence the rite panel itself uses.
      into.qualifiers.push('while it is keeping a rite');
      return;
    case 'notKeepingRite':
      // The mirror in the same words, negated where the sentence negates: "while
      // it is keeping no rite" is the form the positive half already set.
      into.qualifiers.push('while it is keeping no rite');
      return;
    case 'buildingsOfCategory':
      // The **shelf as a plain word** and the figure the row carries —
      // "with two or more culture buildings", `populationAtLeast`'s form one
      // shelf over. A category is already an ordinary English word (culture,
      // faith, gold), so nothing needs translating; the count is spelled out
      // because a bare "2+" inside a sentence is a figure with no noun on it
      // (batch L1, §1c).
      into.qualifiers.push(
        `with ${scope.atLeast} or more ${scope.category} buildings`,
      );
      return;
    case 'workingImprovement': {
      // **"working"**, which is the word the city panel uses for a citizen
      // standing on a hex — never "with", which is the borders and the
      // neighbouring scope. The works are named the way every other clause names
      // them, article outside the mark, and a list joins with the "or" it means.
      if (scope.improvements.length === 0) return;
      const first = improvementDef(scope.improvements[0]!).name;
      const names = scope.improvements
        .map((id) => ref('improvement', id, improvementDef(id).name))
        .join(' or ');
      into.qualifiers.push(
        scope.atLeast !== undefined && scope.atLeast > 1
          ? `working ${scope.atLeast} or more hexes with ${indefinite(first)} ${names}`
          : `working ${indefinite(first)} ${names}`,
      );
      return;
    }
    case 'workingTiles': {
      // `workingImprovement`'s words with the hex condition's own phrase:
      // "working 4 or more improved or tended hexes".
      const n = scope.atLeast ?? 1;
      const kind = tileConditionWords(scope.on);
      const plural = kind.replace(/^(.*?)\bhex\b/, '$1hexes');
      into.qualifiers.push(n > 1 ? `working ${n} or more ${plural}` : `working ${indefinite(kind)} ${kind}`);
      return;
    }
    case 'workingGreatWork': {
      const works =
        scope.atLeast !== undefined && scope.atLeast > 1
          ? `working ${scope.atLeast} or more great people's works`
          : "working a great person's work";
      into.qualifiers.push(
        scope.standingTurns === undefined
          ? works
          : `${works} ${standingWords(scope.standingTurns)}`,
      );
      return;
    }
    case 'hasWonder':
      // "Containing a wonder" is the design doc's own phrase for it, and it is
      // the one that does not read as "having built" — a captured marvel is in
      // the town that holds it whoever raised it.
      into.qualifiers.push('containing a wonder');
      return;
    case 'notHasWonder':
      into.qualifiers.push('containing no wonder');
      return;
    case 'hasEmpireBuilding':
      // The user's own name for the class (2026-09-17), and "holding" rather
      // than "containing" for the reason `hasWonder` says "containing": a
      // marvel stands where it was raised, and an empire building is a thing a
      // realm chose to put in one of its towns.
      into.qualifiers.push(
        scope.standingTurns === undefined
          ? 'holding an empire building'
          : `holding an empire building ${standingWords(scope.standingTurns)}`,
      );
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
      into.qualifiers.push(routePhrase(scope));
      return;
    case 'holdsPost':
      // "Trading post", the words the player already sees in the city panel —
      // the design doc's "commercial post" is a design word and never reaches a
      // card.
      // A full relative clause rather than a participle ("holding …"), because
      // this scope's first card joins it to the route clause and two trailing
      // participles run into one another: "every city one of your own trade
      // routes ends at that holds your trading post" parses, and the shorter
      // form does not.
      into.qualifiers.push('that holds your trading post');
      return;
    case 'raisingOpus':
      into.qualifiers.push('raising the Magnum Opus');
      return;
    case 'markedBy':
      // The Heartland (Expansionist batch E5): the town its goal marked.
      into.qualifiers.push(`marked by ${ref('order', scope.card, orderDef(scope.card).name)}`);
      return;
    case 'producing': {
      // Dominion batch D7: "building a military unit", "building a wonder".
      const thing =
        scope.category === 'wonder'
          ? 'a wonder'
          : scope.category === 'building'
            ? 'a building'
            : `a ${scope.class === undefined ? 'unit' : filterWords(scope.class).replace(/s$/, '')}`;
      into.qualifiers.push(`building ${thing}`);
      return;
    }
    case 'avoidsGrowth':
      // Expansionist batch E6, The Breadbasket: the Avoid growth tick, in the
      // card's own words.
      into.qualifiers.push('told to stop growing');
      return;
    case 'ownerAtWar':
      into.qualifiers.push('whose owner is at war with another empire');
      return;
    case 'ownersFaith':
      into.qualifiers.push(
        scope.keeps ? 'that follows your religion' : 'that does not follow your religion',
      );
      return;
    case 'holyCity':
      into.adjectives.push('holy');
      return;
    default: {
      const unhandled: never = test;
      void unhandled;
      return;
    }
  }
}

/**
 * What trade routes a town has, in the words a player reads.
 *
 * **"Trade route", always** — never "road", which is the paved hex and a
 * different thing entirely, and never bare "route". The direction is a verb
 * rather than an adjective because that is how the sentence reads once the noun
 * is in front of it: "every city two or more trade routes end at", "every city a
 * trade route sets out from".
 *
 * The far end is named where the row narrows it, and it is named from the end
 * the town is standing at: a caravan *arriving* is described by whose it is
 * ("another empire's"), and one *setting out* by where it is going ("to another
 * empire"). Same fact, two sentences, and each is the one a player would say.
 *
 * The three sentences a row could say before batch C5 are printed exactly as
 * they were, so no live card's words moved when the tally arrived.
 */
function routePhrase(scope: Extract<CityScope, { test: 'routeEndsHere' }>): string {
  const out = scope.direction === 'departing';
  // **What the town at the far end holds** (batch C8, The Grain Exchange).
  // Named from the town the sentence is about, so a route arriving comes "from"
  // a city and one setting out goes "to" one. It trails the noun and leads the
  // verb, which is where the clause reads: "one of your own trade routes from a
  // city with a Granary ends at".
  const far = ((): string => {
    if (scope.farEnd === undefined) return '';
    const inner: ScopePhrase = { adjectives: [], qualifiers: [] };
    scopePhrase(scope.farEnd, inner);
    const head = inner.adjectives.length === 0 ? 'city' : `${inner.adjectives.join(' ')} city`;
    const tail = inner.qualifiers.join(' ');
    const town = tail === '' ? head : `${head} ${tail}`;
    return out ? ` to a ${town}` : ` from a ${town}`;
  })();
  // The bare noun, with no article on it, so a figure or a "no" can sit in
  // front of it. The whose-clause trails the noun in every form here — "trade
  // routes of your own" — because a possessive in front ("another empire's
  // trade routes") cannot take one of those words ahead of it.
  const noun = (many: boolean): string => {
    const routes = many ? 'trade routes' : 'trade route';
    if (scope.crossing === undefined) return `${routes}${far}`;
    if (out) {
      return scope.crossing === 'international'
        ? `${routes} to another empire${far}`
        : `${routes} to another of your cities${far}`;
    }
    return scope.crossing === 'international'
      ? `${routes} of another empire${far}`
      : `${routes} of your own${far}`;
  };
  const verb = (many: boolean): string =>
    out ? (many ? 'set out from' : 'sets out from') : many ? 'end at' : 'ends at';
  // The negation reads as "no …", which is the only form the design writes; a
  // band between two figures would read as a range and nothing asks for one yet.
  if (scope.atMost !== undefined && scope.atLeast === undefined) {
    return scope.atMost === 0
      ? `no ${noun(false)} ${verb(false)}`
      : `at most ${scope.atMost} ${noun(true)} ${verb(true)}`;
  }
  const least = scope.atLeast ?? 1;
  if (least > 1) return `${least} or more ${noun(true)} ${verb(true)}`;
  // **The singular, and the two arriving forms are written out**, because the
  // sentences the table has always printed put the whose-clause in front of the
  // noun and so cannot take a bare "a": "another empire's trade route ends at",
  // "one of your own trade routes ends at". Both are exactly what live rows
  // printed before the tally arrived.
  if (!out) {
    if (scope.crossing === 'international') {
      return `another empire's trade route${far} ends at`;
    }
    if (scope.crossing === 'domestic') return `one of your own trade routes${far} ends at`;
  }
  return `a ${noun(false)} ${verb(false)}`;
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
 * **What a work row a card opens does**, in a first-time player's words
 * (Expansionist batch E4): the facts on its own row that the ordinary rows do
 * not carry. Read off the row, so a retuned Keep, polder or outpost re-words
 * itself here and in the Compendium alike.
 */
function workRowFacts(id: ImprovementId): string[] {
  const def = improvementDef(id);
  const facts: string[] = [];
  if (def.onePerTown === true) facts.push('one in each city');
  if (def.beyondBorders !== undefined) {
    const hexes = def.beyondBorders === 1 ? 'hex' : 'hexes';
    facts.push(`on unowned wild ground up to ${def.beyondBorders} ${hexes} beyond your borders`);
  }
  if (def.landBeside !== undefined) {
    const ground = (def.validTerrain ?? []).join(' or ');
    facts.push(`on ${indefinite(ground)} ${ground} hex with ${def.landBeside} of your land hexes beside it`);
  }
  if (def.chargeCost > 1) facts.push(`for ${def.chargeCost} work charges`);
  if (def.copiesNeighbours === true) {
    facts.push('it yields what each of your hexes around it yields, except a city or another of its kind');
  }
  if (def.yieldsAs !== undefined) {
    const work = improvementDef(def.yieldsAs.improvement).name.toLowerCase();
    const ground = terrainDef(def.yieldsAs.terrain).name.toLowerCase();
    facts.push(`it yields as ${indefinite(work)} ${work} on ${ground}`);
  }
  if (def.claimsUnowned !== undefined) {
    facts.push(
      def.claimsUnowned === 0
        ? 'it claims its hex for your nearest city'
        : def.claimsUnowned === 1
          ? 'it claims its hex and every unowned hex next to it for your nearest city'
          : `it claims every unowned hex within ${def.claimsUnowned} hexes of it for your nearest city`,
    );
  }
  if (def.defense !== undefined) facts.push(`units on its hex gain ${signed(def.defense)} strength when defending`);
  return facts;
}

/**
 * Where a grant's food and hammers land, as the tail of its clause — Spolia's
 * Opus town, and Dominion batch D3's capital, every city and nearest town a
 * scope admits. Empty for the default, the town nearest the occasion, and for
 * a banked voice, which lands in the treasury whatever the row says.
 */
function grantDeliveryWords(grant: WindfallGrantSpec): string {
  if (grant.yield !== 'food' && grant.yield !== 'production') return '';
  if (grant.toOpus === true) return ' to your city raising the Magnum Opus, or your capital if none is';
  if (grant.toCapital === true) return ' to your capital';
  if (grant.toEveryTown === true) return ' to every city';
  if (grant.toNearest !== undefined) return ` to your nearest ${eachWords(grant.toNearest)}`;
  return '';
}

/**
 * A rank as the least a piece must hold — "a Veteran or better" (Dominion
 * batch D2). An Elite holds Veteran too, so "or better" is the honest reading
 * of every rank narrowing in the vocabulary.
 */
/**
 * Where a grant's units are raised, as the tail of its clause (Dominion batch
 * D5): the capital, every city, or every city a scope admits. Empty for the
 * default, the city nearest the occasion.
 */
function unitDeliveryWords(grant: WindfallGrantSpec): string {
  if (grant.toCapital === true) return ' in your capital';
  if (grant.toEveryTown === true) return ' in every city';
  if (grant.toEveryTown !== undefined) return ` in ${cityScopeWords(grant.toEveryTown)}`;
  return '';
}

/** The noun a grant's count names (`WindfallGrantSpec.perCount`), in the singular. */
function grantCountWords(spec: GrantCount): string {
  const probe: CardPaysEffect = {
    kind: 'pays',
    where: 'empire',
    basis: 'count',
    count: spec.count,
    ...(spec.building !== undefined ? { building: spec.building } : {}),
    ...(spec.family !== undefined ? { family: spec.family } : {}),
  };
  return countWords(spec.per, countNoun(probe, ''));
}

/**
 * **Units narrowed to a rank, as a noun phrase** (Dominion batch D8): "Elite
 * units" for the top rank, which nothing outranks, and "units that are a
 * Veteran or better" for a lower one, because a row that names a rank reaches
 * every rank above it too (`holdsRank`). `one` says the singular verb.
 */
function rankedWords(rank: RankId, noun: string, one = false): string {
  if (rank === RANK_IDS[RANK_IDS.length - 1]) return `${rankName(rank)} ${noun}`;
  return `${noun} that ${one ? 'is' : 'are'} ${rankOrBetter(rank)}`;
}

function rankOrBetter(rank: RankId): string {
  const name = rankName(rank);
  return rank === RANK_IDS[RANK_IDS.length - 1] ? `${indefinite(name)} ${name}` : `${indefinite(name)} ${name} or better`;
}

/**
 * **How long a thing has stood**, in the one form every clause that names a term
 * uses (batch D2d, the age stamp).
 *
 * One phrase rather than three, because it is one sentence wherever it appears —
 * a building's, a great person's work's, a road's — and three spellings of "at
 * least twenty turns old" is exactly the drift the word tables exist to prevent.
 * The figure is spelled out rather than abbreviated for `buildingsOfCategory`'s
 * stated reason: a bare number inside a sentence is a figure with no noun on it.
 */
function standingWords(turns: number): string {
  return `that has stood at least ${turns} turn${turns === 1 ? '' : 's'}`;
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
  // And a row whose *name* begins with "The" is a proper name already — an
  // office, not a thing there can be one of — so it takes no article at all,
  // exactly as a wonder does. See `theBuilding`, the same test one article over.
  if (isWonder(id) || namedWithThe(id)) return marked;
  // The row's own article wins where the vowel rule would be wrong — "a
  // University" — which is the fix `indefinite`'s docblock names: a field
  // beside the name, never a special case in the sound rule.
  const article = buildingDef(id).article ?? indefinite(name);
  return `${article} ${marked}`;
}

/** Whether this row's name carries its own definite article. `theBuilding`'s test. */
function namedWithThe(id: BuildingId): boolean {
  return /^the\s/i.test(buildingDef(id).name);
}

/** A building's bare name, marked. `buildingWords` without the article. */
function buildingName(id: BuildingId): string {
  const def = buildingDef(id);
  // A retired row has no page in the Compendium, so its name prints plain: a
  // mark would point at nothing. The retired Vigil Charter names the Keep,
  // retired in Expansionist batch E0 so that the game has one Keep.
  if (def.retired === true) return def.name;
  return ref(isWonder(id) ? 'wonder' : 'building', id, def.name);
}

/**
 * "the Assay House" · "The Vizier's Hall" — a building named with **the** in
 * front of it, and only where it needs one.
 *
 * `indefinite`'s rule one article over, and here for its reason exactly: a
 * charter's clause reads "unlocks the …", and a row whose own name begins with
 * *The* — the way an office does, rather than a thing — printed "unlocks the The
 * Vizier's Hall" the day one shipped. The test is the name's own first word,
 * because a definite article is part of a proper name where it appears at all
 * and the roster is where that is written down.
 *
 * The mark rides inside the returned string (`ref`'s docblock says why), so the
 * article is composed here rather than glued onto a link by the caller.
 */
function theBuilding(id: BuildingId): string {
  const marked = buildingName(id);
  return namedWithThe(id) ? marked : `the ${marked}`;
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
  // The third: a religion has one holy city.
  if (scope.test === 'holyCity') return 'your holy city';
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
/**
 * A scope said as **one town of the class** — "city", "puppet city", "city
 * joined to your capital by road" — for a clause quoted *per* town.
 *
 * `scopeCondition`'s sibling and the second of `cityScopeWords`' transforms,
 * kept a transform for that function's own reason: there is one sentence-builder
 * for what a scope means, and a second list of adjectives and qualifiers is
 * exactly the drift it exists to prevent. Where `scopeCondition` drops the noun
 * to leave the test behind, this drops only the leading "every" — so the noun
 * keeps its adjectives in front of it, which is where English puts them.
 *
 * The two scopes that name a single town are handed back as they are, for that
 * transform's reason: "per your capital" is not a rate anybody would write, and
 * a row that tried would at least print a sentence a reader can see is wrong.
 */
function eachWords(scope?: CityScope): string {
  if (!scope) return 'city';
  const said = cityScopeWords(scope);
  return said.startsWith('every ') ? said.slice('every '.length) : said;
}

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

export function filterWords(filter: UnitFilter): string {
  const noun = unitNounWords(filter);
  // The unit's age (Dominion batch D7, The Spear Makers) goes in front of the
  // noun as an adjective: "first- and second-age military units".
  return filter.ageAtMost === undefined ? noun : `${ageWords(filter.ageAtMost)} ${noun}`;
}

/** The ages up to `last`, as one adjective: "first-age", "first- and second-age". */
function ageWords(last: number): string {
  const ordinals = ['first', 'second', 'third', 'fourth'].slice(0, Math.max(1, last));
  if (ordinals.length === 1) return `${ordinals[0]}-age`;
  const head = ordinals.slice(0, -1).map((word) => `${word}-`);
  return `${head.join(', ')} and ${ordinals[ordinals.length - 1]}-age`;
}

/** `filterWords` without the age: the noun phrase for the kind of unit. */
function unitNounWords(filter: UnitFilter): string {
  // The named row first, because it is the *narrowest* clause and a phrase that
  // said "workers" when the filter means one row would be a promise the price
  // does not keep. Pluralised off the roster's own name (hard rule 7: the
  // player is told "workers", never `worker`).
  if (filter.type !== undefined) return `${unitDef(filter.type).name.toLowerCase()}s`;
  // **One unit line** (Scientific batch S1, the line traits). Named by its
  // first unit, as the trait's own clause names it ("the Spearman line"), so a
  // reader can tell which units the trait reaches. Asked after the named row
  // and before the silhouettes, for the named row's reason: it is narrower.
  if (filter.line !== undefined) return `units of the ${unitDef(filter.line).name} line`;
  // The religious clause is asked **first** and reads as a whole noun phrase,
  // because it is the one filter that names a *vocation* rather than a
  // silhouette: an augur is a `worker` by model, and "worker units" is exactly
  // the wrong thing to call one. The Pyramids' half of the same pair reads the
  // other way round — "workers", the ones that are not religious.
  if (filter.consecrates === true) return 'religious units';
  if (filter.religious === true) return 'religious units';
  if (filter.religious === false) return 'units other than religious units';
  if (filter.consecrates === false && filter.modelClass === 'worker') return 'workers';
  // "Scouts", and asked before the silhouette for `consecrates`' reason: an
  // explorer is a *vocation*, and its `modelClass` is whatever the roster
  // happens to give it.
  if (filter.explores === true) return 'scouts';
  if (filter.explores === false) return 'units other than scouts';
  // See `modelClassWord` below.
  // **"Military units"**, which is what a player calls the pieces an empire
  // levies and garrisons with — the roster spells it as a combatant that is
  // neither a scout nor a hull, and none of those three words belongs on a card.
  // Asked before the silhouette for `consecrates`' reason.
  if (filter.fieldSoldier === true) return 'military units';
  if (filter.fieldSoldier === false) return 'units other than soldiers';
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
  // **The horse archer**, the one land silhouette whose id is two words run
  // together (batch L2a). It is here for the hulls' reason exactly: `mounted`,
  // `melee` and `ranged` are all words a player already uses, and
  // "mountedRanged units" is precisely the sentence this table exists to
  // prevent. Asked before the fall-through, and named again in the list arm
  // below, because a row may say it either way.
  if (filter.modelClass === 'mountedRanged') return 'mounted archers';
  if (filter.modelClass !== undefined) return `${filter.modelClass} units`;
  // **Two silhouettes said once** — the Barracks' foot soldiers. The list is
  // read out in the row's own order, because the row's order is the order a
  // designer wrote the sentence in, and the noun is singular-plural exactly as
  // the one-silhouette arm above spells it ("melee and ranged units").
  if (filter.modelClasses !== undefined && filter.modelClasses.length > 0) {
    return `${listWords(filter.modelClasses.map(modelClassWord))} units`;
  }
  if (filter.ranged === true) return 'ranged units';
  if (filter.ranged === false) return 'melee units';
  if (filter.category !== undefined) return `${filter.category} units`;
  if (filter.consecrates === false) return 'units other than augurs';
  return 'all units';
}

/**
 * One silhouette, in a word a player has been told.
 *
 * The list arm's half of the table above: `melee`, `ranged`, `mounted`, `siege`
 * and `scout` are already words, and the two that are not — the mounted archer
 * and the three hulls — are named here rather than printed as their ids. Hard
 * rule 7 at the scale of one noun.
 */
function modelClassWord(id: ModelClass): string {
  if (id === 'mountedRanged') return 'mounted archer';
  if (id === 'navalLight') return 'light warship';
  if (id === 'navalHeavy') return 'heavy warship';
  if (id === 'navalRanged') return 'firing ship';
  return id;
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
    case 'standingSince': {
      // A qualifier about the *works*, not an adjective about the ground: "old
      // hex" is not a kind of country. It reads after whatever names what stands
      // there ("every academy hex that has stood at least 20 turns"), which is
      // the order `all` pushes its parts in.
      const stood = `that has stood at least ${on.turns} turn${on.turns === 1 ? '' : 's'}`;
      // With nothing before it, no work is named for the age to belong to, so
      // the words name one: "hex with a work that has stood …" (The Old Fields,
      // The Inheritance of Fields). This also keeps the verb right when a count
      // makes the hex plural ("hexes with a work that has stood").
      const alone = into.adjectives.length === 0 && into.qualifiers.length === 0;
      into.qualifiers.push(alone ? `with a work ${stood}` : stood);
      return;
    }
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
    // Expansionist batch E3. The wonder's town reads as the thing beside the
    // hex, so `besideWords` takes "with" off it: "beside a city that holds a
    // wonder" (The Landscape Garden).
    case 'river':
      into.qualifiers.push('beside a river');
      return;
    case 'wonderTown':
      into.qualifiers.push('with a city that holds a wonder');
      return;
    case 'surfaced':
      into.qualifiers.push('over a seam you surfaced');
      return;
    case 'adjacentMountain':
      into.qualifiers.push('beside a mountain');
      return;
    case 'yields':
      into.qualifiers.push(`that yields ${on.yield}`);
      return;
    case 'road':
      // "With a road", the sentence a city scope uses for a building it holds,
      // rather than an adjective: "road hex" is not a kind of ground.
      into.qualifiers.push('with a road');
      return;
    case 'beside':
      // "Tended" is an adjective with no noun of its own, so the ring names the
      // hex: "beside a tended hex" rather than "beside a tended".
      into.qualifiers.push(
        `beside ${on.of.test === 'tended' ? 'a tended hex' : besideWords(on.of)}`,
      );
      return;
    case 'all':
      for (const inner of on.of) tilePhrase(inner, into);
      return;
    case 'tended':
      into.adjectives.push('tended');
      return;
    case 'surveyed':
      into.adjectives.push('surveyed');
      return;
    case 'any': {
      // A condition that admits every hex, improved or not, says nothing, so a
      // count over it reads "per 2 hexes in your borders" (The Quitrents).
      const members = new Set(on.of.map((inner) => inner.test));
      if (members.has('improved') && members.has('unimproved')) return;
      // Each part phrased on its own and joined with the "or" it means: "hill
      // or mountain", "improved or tended". A part that is only adjectives
      // stays an adjective; a part with a qualifier makes the whole a
      // qualifier ("that is improved or beside fresh water").
      const parts = on.of.map((inner) => {
        const part: TilePhrase = { adjectives: [], qualifiers: [] };
        tilePhrase(inner, part);
        return part;
      });
      const words = parts.map((part) => [...part.adjectives, ...part.qualifiers].join(' '));
      if (parts.every((part) => part.qualifiers.length === 0)) {
        into.adjectives.push(words.join(' or '));
      } else if (
        into.adjectives.length === 0 &&
        into.qualifiers.length === 0 &&
        parts.every((part) => part.adjectives.length === 0)
      ) {
        // If the choice is the whole condition and each part is a qualifier,
        // the parts follow the noun as they are (Dominion batch D10, The March
        // Revenues): "hex with a Pasture or Camp or carrying a strategic
        // resource", not "hex that is with a Pasture". "That is" stays where
        // something stands before the choice, so the reader can see where the
        // choice starts (The Watercourses, The Landscape Garden).
        into.qualifiers.push(words.join(' or '));
      } else {
        into.qualifiers.push(`that is ${words.join(' or ')}`);
      }
      return;
    }
    case 'fortifiedUnit':
      // The Farming Garrisons and The Castra (Dominion batch D7).
      into.qualifiers.push('with a fortified military unit of yours');
      return;
    default: {
      const unhandled: never = test;
      void unhandled;
      return;
    }
  }
}

/**
 * **What stands next door**, as the thing rather than as a hex — "a road", "a
 * great person's work", "an unimproved forest".
 *
 * `anyPhrase`'s bargain one union down: the inner condition is phrased on its
 * own and then read back, because the ring's sentence is about the *thing*
 * beside the hex and `tileConditionWords` would have said "beside a hex with a
 * road" — a noun the reader has to look past to reach the one that matters.
 *
 * A qualifier already names its thing with an article ("with a Farm", "carrying
 * a great person's work"), so the preposition comes off and the rest stands; a
 * condition that is only adjectives *is* a noun phrase in English ("an
 * unimproved forest"), which is why those need no noun added. A condition that
 * is both keeps the noun, because "an improved with a Mine" is not a sentence.
 */
function besideWords(on: TileCondition): string {
  const inner: TilePhrase = { adjectives: [], qualifiers: [] };
  tilePhrase(on, inner);
  const adjectival = inner.adjectives.join(' ');
  const named = inner.qualifiers.map((text) => text.replace(/^(?:with|carrying) /, ''));
  if (adjectival !== '' && named.length === 0) return `${indefinite(adjectival)} ${adjectival}`;
  if (adjectival === '' && named.length > 0) return named.join(' and ');
  if (adjectival === '') return 'a hex';
  return `${indefinite(adjectival)} ${adjectival} hex ${inner.qualifiers.join(' ')}`;
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
  // The Satraps (Dominion batch D4). Said as the speed, which is what the card
  // promises: "twice as fast" is +100%. The row's scope follows as ", in
  // every city with ...", so the words name no town themselves.
  pacificationRate: (percent) =>
    percent === 100 ? 'unrest ends twice as fast' : `unrest ends ${signed(percent)}% faster`,
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
  // Dominion batch D8, The Servian Reforms. "Units" is the class's word when
  // the row names none; the `rulePercent` arm puts the class in its place. A
  // purchase is priced off the cost, so the words say both.
  unitCost: (percent) =>
    percent < 0
      ? `units cost ${-percent}% less to build and to buy`
      : `units cost ${percent}% more to build and to buy`,
  growthSurplus: (percent) => `${signed(percent)}% food surplus stored toward growth`,
  // **"No maintenance" at the whole rebate**, because that is what −100% is and
  // "−100% the gold your units cost" is a sentence a player has to do algebra on.
  unitUpkeep: (percent) =>
    percent <= -100
      ? 'your units cost no gold in maintenance'
      : percent < 0
        ? `your units cost ${-percent}% less gold in maintenance`
        : `your units cost ${percent}% more gold in maintenance`,
  // Said as the **price of a step**, the figure the rule changes. The
  // legibility pass worded it as distance ("roads carry units 40% further",
  // `docs/audit/legibility.md`), but that was wrong: a step that costs 40%
  // less carries a unit about two thirds further, not 40% further. The
  // coordinator's brief for Dominion batch D3 replaced the words.
  roadStepCost: (percent) =>
    percent < 0
      ? `a step along a road costs ${-percent}% less movement`
      : `a step along a road costs ${percent}% more movement`,
  // Said as the **term**, which is the length it is: a longer road-life is a
  // gain, so the figure keeps its sign in front the way every other gain does.
  routeTerm: (percent) =>
    percent < 0
      ? `your trade routes run ${-percent}% fewer turns before they lapse`
      : `your trade routes run ${percent}% longer before they lapse`,
  // Said as the **reach**, which is what a longer range is, and with the medium
  // in front because the rule is about sea routes and nothing else. A player
  // reading "your routes reach further" would plan a land road on it.
  seaRouteRange: (percent) =>
    percent < 0
      ? `your sea routes reach ${-percent}% less far`
      : `your sea routes reach ${percent}% further`,
  routeRange: (percent) =>
    percent < 0
      ? `your trade routes reach ${-percent}% less far`
      : `your trade routes reach ${percent}% further`,
  rerollCost: (percent) =>
    percent < 0
      ? `rerolling an Order hand costs ${-percent}% less faith`
      : `rerolling an Order hand costs ${percent}% more faith`,
  faithContribution: (percent) =>
    percent < 0
      ? `faith you give to a build buys ${-percent}% less production`
      : `faith you give to a build buys ${percent}% more production`,
  // The Hunting Grounds (Dominion batch D7). The row's reach replaces "near
  // your towns" in the `rulePercent` arm, so the words say how near.
  campMuster: (percent) =>
    percent < 0
      ? `barbarian camps near your towns raise their units ${-percent}% slower`
      : `barbarian camps near your towns raise their units ${percent}% faster`,
  // The Funeral Oration and The Glorious Dead (Dominion batch D7). Said as what
  // a loss adds, and "nothing" at the whole cut.
  unitLossWeariness: (percent) =>
    percent <= -100
      ? 'units you lose add nothing to war weariness'
      : percent < 0
        ? `units you lose add ${-percent}% less war weariness`
        : `units you lose add ${percent}% more war weariness`,
  townLossWeariness: (percent) =>
    percent <= -100
      ? 'towns you lose add nothing to war weariness'
      : percent < 0
        ? `towns you lose add ${-percent}% less war weariness`
        : `towns you lose add ${percent}% more war weariness`,
  // The Commonplace Book (Scientific batch S0). A price, said as the saving.
  charterTechCost: (percent) =>
    percent < 0
      ? `charter technologies cost you ${-percent}% less research`
      : `charter technologies cost you ${percent}% more research`,
  // The Patent Office (Scientific batch S0). At the whole cut the premium is
  // gone, so the words say what is left: the price of an ordinary technology
  // in the same column.
  charterPremium: (percent) =>
    percent <= -100
      ? 'charter technologies cost you no more research than ordinary technologies at the same point in the tree'
      : percent < 0
        ? `the extra research a charter technology costs is ${-percent}% less`
        : `the extra research a charter technology costs is ${percent}% more`,
  // The Translation Movement (Scientific batch S3). A price, said as the
  // saving, on the technologies a met empire already knows.
  gapTechCost: (percent) =>
    percent < 0
      ? `technologies that an empire you have met already knows cost you ${-percent}% less research`
      : `technologies that an empire you have met already knows cost you ${percent}% more research`,
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
  // Whose city is deliberately not said, because the card's own sentence is
  // "including foreign cities" — the post is the whole of the test.
  inCityWithPost: 'while standing in a city holding your trading post',
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
  vsOpusBuilder: 'against an empire raising the Magnum Opus',
  notFollowingTerritory: 'inside cities that do not follow your religion',
  // Dominion batch D2. The rank is printed by `combatWhenWords`, `onFeature`'s
  // bargain; the movement condition is a whole phrase.
  hasRank: 'as',
  unmoved: 'when it has not moved this turn',
  // Dominion batch D5, The Landsturm.
  besideGreatGeneral: 'beside a great general',
  // Expansionist batch E3, The Woodland Bands. The features are printed by
  // `combatWhenWords`, `onFeature`'s bargain.
  standingIn: 'while standing in',
  // Scientific batch S3, The Edge of the Sword. `vsWiderEmpire`'s sibling:
  // the two realms' technologies rather than their cities.
  vsFewerTechs: 'against an empire that knows fewer technologies than you',
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
      // A distance of zero is the town's own hex, so the words say it the way
      // `inCity` does: "while standing in a city joined to your capital by
      // road" (The Stationes), and not "within 0 hexes of".
      if (when.hexes <= 0) {
        return when.scope === undefined
          ? COMBAT_WORDS.inCity
          : `while standing in ${cityScopeWords(when.scope).replace(/^every /, 'a ')}`;
      }
      return (
        `${COMBAT_WORDS.withinOfCity} ${when.hexes} ` +
        `${when.hexes === 1 ? 'hex' : 'hexes'} of ` +
        (when.scope === undefined
          ? 'one of your cities'
          : cityScopeWords(when.scope).replace(/^every /, 'your '))
      );
    case 'followingTerritory':
      return when.foreign === true ? FOREIGN_FOLLOWING_WORDS : COMBAT_WORDS.followingTerritory;
    case 'beside':
      return `${COMBAT_WORDS.beside} ${filterWords(when.class)}`;
    case 'hasRank':
      return `${COMBAT_WORDS.hasRank} ${rankOrBetter(when.rank)}`;
    case 'standingIn': {
      // The features are alternatives, so the last is joined with "or".
      const names = when.features;
      const words =
        names.length <= 1
          ? (names[0] ?? '')
          : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
      return `${COMBAT_WORDS.standingIn} ${words}`;
    }
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
  // **"Work"**, the word the Reliquary and the Compendium already use for the
  // thing a great person leaves behind (hard rule 7): "great person
  // improvement" is the improvement table's phrase for it, and no player has
  // ever said it. The capital is named because it is the whole of the count's
  // reach and the half a player plans around — where to plant the next one.
  capitalGreatWorks: {
    one: 'great person’s work in your capital',
    many: 'great people’s works in your capital',
  },
  uniqueLuxuries: { one: 'kind of luxury you control', many: 'kinds of luxury you control' },
  bankedGold: { one: 'gold in your treasury', many: 'gold in your treasury' },
  // Dominion batch D8, Weight of Numbers.
  attacksOnTarget: {
    one: 'attack your units have already made on the same target this turn',
    many: 'attacks your units have already made on the same target this turn',
  },
  // Scientific batch S1, the Hoplite. Said of the town, because only a town of
  // your own counts and the line pays nothing outside one.
  townCitizensHere: {
    one: 'citizen of your city it stands in',
    many: 'citizens of your city it stands in',
  },
  // Scientific batch S1, the Grenadier. "Know" is the word: a charter drafted
  // and not yet researched does not count.
  charterTechsKnown: {
    one: 'charter technology you know',
    many: 'charter technologies you know',
  },
  // Scientific batch S3, The Proving Ground: the lead.
  techLead: {
    one: 'technology you know that no empire you have met knows',
    many: 'technologies you know that no empire you have met knows',
  },
};

/** Where a `unitStat` applies, in words. `'anywhere'` is the absent field. */
const WHERE_WORDS: Record<
  | 'anywhere'
  | 'ownTerritory'
  | 'foreignTerritory'
  | 'embarked'
  | 'fortified'
  | 'grassOrPlains'
  | 'garrison',
  string
> = {
  anywhere: '',
  ownTerritory: ' inside your territory',
  foreignTerritory: ' outside your territory',
  embarked: ' while embarked',
  fortified: ' while dug in',
  // The two terrains said as the country they are, which is what a player sees
  // when they look at the map — "on grassland and plains" is a rules cell, and
  // the open country is the ground a horse runs on.
  grassOrPlains: ' on grassland and plains',
  // "Standing in", the words `inCity`'s condition already uses, so the two
  // readings of the same hex read as one sentence to a player.
  garrison: ' while standing in one of your cities',
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
  // "Gaining", not "completing": a conscript a card raises (The General Levy)
  // pays these riders too (the user, 2026-10-16, in
  // `docs/plans/dominion-build-triage.md`: conscripts pay the cards that pay
  // on gaining a unit).
  unitCompletion: 'gaining a unit',
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
  greatPersonAct: 'a great person spending themselves on their boon',
  improvementBuilt: 'building an improvement',
  // Dominion batch D1. The windfall rider's rank filter rewrites "earning a
  // rank" to name the rank ("becoming an Elite"), so the phrase keeps it.
  rankEarned: 'one of your units earning a rank',
  // Dominion batch D4, The Provincial Census.
  pacified: 'pacifying a city',
  // Dominion batch D5.
  draftPassed: 'passing an Order draft',
  raze: 'razing a city you captured',
  rangedAttack: 'attacking from range',
  greatPersonGained: 'gaining a great person',
  // Dominion batch D6, War Reparations and Danegeld.
  peace: 'making peace',
  // Expansionist batch E2: The Freedom of the City, The Tax Rolls and The
  // Opening of the Roads.
  sizeRecord: 'a city growing past its largest size',
  census: 'the world taking a census',
  joinedToCapital: 'a city being joined to your capital by road for the first time',
  // Dominion batch D7, The Legions' Labour.
  disband: 'disbanding a unit',
};

/**
 * The occasion narrowed to the size a town reaches (`atPopulation`), where the
 * size belongs inside the phrase (Expansionist batch E2). An occasion missing
 * here says the size in the parenthesis after the phrase instead.
 */
const AT_POPULATION_WORDS: Partial<Record<WindfallOccasion, (size: number) => string>> = {
  growth: (size) => `a city growing to ${size} citizens`,
  sizeRecord: (size) => `a city reaching ${size} citizens for the first time`,
};

/**
 * What an occasion measures, where `MEASURE_WORDS`' "its" would name the wrong
 * thing (Expansionist batch E2). The census carries the empire's citizens as
 * its population, and a completion carries the size of the city that finished
 * the thing, which "its" after "completing a wonder" would leave unclear.
 * Every other occasion reads `MEASURE_WORDS`.
 */
const OCCASION_MEASURE_WORDS: Partial<
  Record<WindfallOccasion, Partial<Record<OccasionMeasure, string>>>
> = {
  census: { population: 'your citizens' },
  completion: { population: "the city's population" },
  buildingCompletion: { population: "the city's population" },
  unitCompletion: { population: "the city's population" },
  // The Plunder Economy (Dominion batch D8): the piece is the raider.
  pillage: { strength: "the pillaging unit's strength" },
};

/** The founding shares with a common name (The Great Colonies' "a third"). */
const SHARE_WORDS: Partial<Record<number, string>> = {
  2: 'half',
  3: 'a third',
  4: 'a quarter',
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
 * The first-of-a-kind ledgers, as the aside a card's own face makes of them.
 *
 * A **phrase that completes "completing a building (…)"** rather than a bare
 * noun, because what a ledger narrows is a moment and not a thing: the sentence
 * is *"completing a building (a culture building, the first of that kind in that
 * city) grants +20 production"*, and a noun table would have left the reader to
 * supply the grammar. Five entries, and a sixth ledger writes a sixth here or
 * the register says so.
 */
const FIRST_WORDS: Record<FirstKind, string> = {
  buildingInCity: 'the first of that kind in that city',
  buildingKind: 'the first of that kind your realm has finished',
  purchaseInCity: 'the first building that city ever buys',
  conversion: 'the first time that city turns to your faith',
  techWorld: 'before any other empire',
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
  /**
   * The **family** the row narrows the moment to — The Great Poets' artists.
   * `vsBarbarians`' fourth sibling, and narrowed inside the sentence for that
   * table's reason: the person belongs in the middle of "a great person
   * spending themselves on their boon", not glued to the end of it.
   */
  family?: Family,
): string {
  if (family !== undefined) {
    // The same substitution `familyNarrowed` makes one table over, on the only
    // phrase any occasion uses for a person: an occasion with nobody in it comes
    // back untouched, which is the honest answer for a row that narrowed a
    // moment that has no family.
    return OCCASION_WORDS[occasion].replace('a great person', `a great ${family}`);
  }
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
  // "In a puppet", because that is the whole of what the card is about: a town
  // you took and never took in. Never "population" — the citizens' own word.
  puppetPopulation: {
    one: 'citizen living in a puppet of yours',
    many: 'citizens living in your puppets',
  },
  // `garrisonOf` keeps only combatants, and the words say so.
  garrison: { one: 'combat unit standing in the city', many: 'combat units standing in the city' },
  garrisonWatch: {
    one: 'fortification level among the units in the city',
    many: 'fortification levels among the units in the city',
  },
  fortifiedUnits: {
    one: 'fortified military unit inside your borders',
    many: 'fortified military units inside your borders',
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
  // "Called", the great people's own verb everywhere else — they are called,
  // never built or bought — and "you have" rather than "your realm has" because
  // every other count on this table speaks to the player directly.
  greatPeopleCalled: {
    one: 'great person you have called',
    many: 'great people you have called',
  },
  // Scientific batch S1: the Grenadier's count, said as `SCALE_WORDS` says it.
  charterTechsKnown: {
    one: 'charter technology you know',
    many: 'charter technologies you know',
  },
  // The filter is not in these words: `countNoun` prints it, so that "per melee
  // unit" and "per ranged unit" are one entry — `buildingsOfKind`'s bargain.
  unitsInField: { one: 'unit in the field', many: 'units in the field' },
  // The category is not in these words either: `countNoun` prints it, so that
  // "per gold building" and "per faith building" are one entry.
  buildingsOfCategory: { one: 'building', many: 'buildings' },
  // Provenance rather than purpose, so the noun says what was asked: "per
  // purchased building" and not "per building".
  purchasedBuildings: { one: 'purchased building', many: 'purchased buildings' },
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
  // The shelf is not in these words: `countNoun` prints it, so "per culture
  // building you were first to raise in a city" and "per faith building" are one
  // entry — `buildingsOfCategory`' bargain, read off the world's own ledger.
  firstBuildingsInCity: {
    one: 'building you were the first of its kind to raise in a city',
    many: 'buildings you were the first of their kind to raise in a city',
  },
  firstConversions: {
    one: 'foreign city you were the first to convert',
    many: 'foreign cities you were the first to convert',
  },
  // The condition is not in these words: `countNoun` prints it, so that "per hex
  // with a Mine" and "per hex carrying a luxury resource" are one entry —
  // `buildingsOfCategory`'s bargain, asked of the ground.
  tilesInBorders: { one: 'hex', many: 'hexes' },
  // "Met", the register's own word, and "other empire" because the count never
  // includes your own seat.
  empiresMet: { one: 'other empire you have met', many: 'other empires you have met' },
  // The rule in the words: three or more copies, and nobody else holds any.
  monopolyLuxuries: {
    one: 'luxury you hold three or more copies of that no other empire holds',
    many: 'luxuries you hold three or more copies of that no other empire holds',
  },
  citiesKeepingRite: { one: 'city of yours keeping a rite', many: 'cities of yours keeping a rite' },
  beliefsHeld: { one: 'belief your religion holds', many: 'beliefs your religion holds' },
  // Scientific batch S2, feature A. The family is printed by `countNoun`, so
  // that "per scholar in the trades" and "per merchant in the trades" are one
  // entry, `greatPeopleGained`'s bargain.
  guildsmen: { one: 'citizen in the trades', many: 'citizens in the trades' },
  // Scientific batch S3, feature B: the lead and the gap.
  techLead: {
    one: 'technology you know that no empire you have met knows',
    many: 'technologies you know that no empire you have met knows',
  },
  techGap: {
    one: 'technology an empire you have met knows that you do not',
    many: 'technologies an empire you have met knows that you do not',
  },
  turnsSinceFounded: {
    one: 'turn since your religion was founded',
    many: 'turns since your religion was founded',
  },
  defensiveBuildings: {
    one: 'fortification in this city',
    many: 'fortifications in this city',
  },
  discoveredCamps: { one: 'barbarian camp you have found', many: 'barbarian camps you have found' },
  tradeRoutes: { one: 'trade route you run', many: 'trade routes you run' },
  worldWonders: { one: 'wonder in the world', many: 'wonders in the world' },
  // "Foreign" is in the words because it is in the count: a post in one of your
  // own towns is not tallied here. See the count.
  postCities: {
    one: 'foreign city holding your trading post',
    many: 'foreign cities holding your trading post',
  },
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
  // Dominion batch D1, The Veterans' Roll. "This game", because the record
  // keeps the ranks of units that have since died.
  ranksEarned: {
    one: 'rank your units have earned this game',
    many: 'ranks your units have earned this game',
  },
  // Dominion batch D3, The Sagas. "This game", for `ranksEarned`' reason.
  hexesPillaged: {
    one: 'hex you have pillaged this game',
    many: 'hexes you have pillaged this game',
  },
  // Expansionist batch E1, The Labour Rolls. "This game", for `ranksEarned`'
  // reason: a citizen spent on a levy is gone from the board.
  citizensLevied: {
    one: 'citizen you have levied this game',
    many: 'citizens you have levied this game',
  },
  // Dominion batch D4: The Captured Arms, The Hall of the Slain, Spear-won Land.
  enemiesKilled: {
    one: 'unit you have killed this game',
    many: 'units you have killed this game',
  },
  unitsLost: { one: 'unit you have lost this game', many: 'units you have lost this game' },
  citiesCaptured: {
    one: 'city you have captured this game',
    many: 'cities you have captured this game',
  },
  // Dominion batch D5, The Mural Crown. A row naming a family is worded by
  // `countNoun` ("great general you have gained this game").
  greatPeopleGained: {
    one: 'great person you have gained this game',
    many: 'great people you have gained this game',
  },
  // Expansionist batch E2, The Book of Settlements.
  citiesFounded: {
    one: 'city you have founded this game',
    many: 'cities you have founded this game',
  },
  // Expansionist batch E2. The words are the scope's, in `countNoun`; this is
  // what a row that names no scope says, and such a row counts nothing.
  citiesAdmitted: { one: 'city', many: 'cities' },
  followingCities: { one: 'city that follows you', many: 'cities that follow you' },
  followingForeign: {
    one: 'foreign city that follows you',
    many: 'foreign cities that follow you',
  },
  followingPop: {
    one: 'citizen in the cities that follow you',
    many: 'citizens in the cities that follow you',
  },
  // The congregation abroad, counted in people. "Another empire's" rather than
  // "foreign", because a player reads whose the town is before they read what it
  // is called — `followingForeign`'s own words one scale down.
  followingForeignPop: {
    one: "citizen of another empire who follows you",
    many: 'citizens of other empires who follow you',
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
  capturedCities: { one: 'captured city you hold', many: 'captured cities you hold' },
  empireBuildings: { one: 'empire building you hold', many: 'empire buildings you hold' },
  uniqueStrategicResources: {
    one: 'kind of strategic resource you can reach',
    many: 'kinds of strategic resource you can reach',
  },
  // The four distinct-kind counts say **kind** out loud, because that is the
  // whole of what makes them different from the counts beside them: "per feature
  // worked" and "per kind of feature worked" are two cards, and a player reading
  // the first when the row means the second is a player who planted the wrong
  // second forest.
  distinctWorkedFeatures: {
    one: 'kind of wild ground this city works',
    many: 'kinds of wild ground this city works',
  },
  distinctWorkedGreatWorks: {
    one: "kind of great person's work this city works",
    many: "kinds of great person's work this city works",
  },
  distinctBuildingCategories: {
    one: 'kind of building this city holds',
    many: 'kinds of building this city holds',
  },
  legacyFamilies: {
    one: 'kind of great person whose legacy you hold',
    many: 'kinds of great person whose legacy you hold',
  },
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
  // "Enemy", because the card's own face says so and because the word is what
  // tells this apart from the barbarian entry above it on a screen where both
  // may be read at once — one moment, two questions.
  unitKilled: { one: 'enemy unit you have killed', many: 'enemy units you have killed' },
  // "Trained", the ratified text's own verb, and it is the verb that carries the
  // rule: a bought unit was not trained, and a player who reads the word knows
  // why the counter did not move when the treasury paid.
  unitTrained: { one: 'unit you have trained', many: 'units you have trained' },
  campCleared: {
    one: 'barbarian camp you have cleared',
    many: 'barbarian camps you have cleared',
  },
  cityCaptured: { one: 'city you have captured', many: 'cities you have captured' },
  wonderOrCapitalCaptured: {
    one: 'city you have captured that held a wonder or was a capital',
    many: 'cities you have captured that held a wonder or were capitals',
  },
  // Expansionist batch E4: `hexBought` widened to the three ways The Wide
  // Country names.
  hexClaimed: {
    one: 'hex you have claimed by an outpost, a cleared camp or buying',
    many: 'hexes you have claimed by outposts, cleared camps or buying',
  },
  buildingBoughtWithGold: {
    one: 'building you have bought with gold',
    many: 'buildings you have bought with gold',
  },
  riteStarted: { one: 'rite you have started', many: 'rites you have started' },
  foreignCityConverted: {
    one: 'foreign city you have converted',
    many: 'foreign cities you have converted',
  },
  // Dominion batch D1, The Campaign Annals. One a rank: a unit that goes from
  // no rank to Elite in one step is two.
  rankEarned: { one: 'rank your units have earned', many: 'ranks your units have earned' },
  // Dominion batch D3, The Captive Craftsmen.
  hexPillaged: { one: 'hex you have pillaged', many: 'hexes you have pillaged' },
  // Dominion batch D5, The Gathering Host.
  unitGained: { one: 'unit you have gained', many: 'units you have gained' },
  // Dominion batch D6. No growing card counts these yet; the table is total.
  warEnded: { one: 'war you have ended', many: 'wars you have ended' },
  // Expansionist batch E2, The Grain Census. One for each citizen above a
  // town's record, which is what the tally counts.
  sizeRecord: {
    one: 'citizen your cities have grown past their largest size',
    many: 'citizens your cities have grown past their largest size',
  },
};

/**
 * What the occasion itself measures, in the words a card's face uses.
 *
 * `RATE_WORDS`' opposite number and a table beside it for that table's reason:
 * the words are a property of the *set*, and a share of a moment and a share of
 * the books are two readings a player meets on one screen. Phrased as the
 * possessive the clause needs ("its strength", "the gold paid"), so the sentence
 * reads whole without this arm knowing which grant is quoting it.
 */
const MEASURE_WORDS: Record<OccasionMeasure, string | { each: string }> = {
  strength: 'its strength',
  population: 'its population',
  gold: 'the gold paid',
  payout: 'what it already paid',
  opusProgress: 'the production it had put into the Magnum Opus',
  // Dominion batch D6. A count of things reads as "for each" rather than as
  // "equal to N times", because "equal to 40 times the hexes" is not a sentence
  // a player says.
  takenPopulation: 'the citizens of the cities you took from that empire in that war and still hold',
  hexesPillaged: { each: "of that empire's hexes you pillaged in that war" },
  worksAndWonders: { each: 'great-person work and wonder inside its borders' },
  // Dominion batch D7, The Legions' Labour.
  unitCost: 'its production cost',
};

/**
 * A grant scaled by the moment, in words: "culture equal to 10 times its
 * population", or for a count of things "+40 gold for each of that empire's
 * hexes you pillaged in that war". `what` is the voice or "renown".
 *
 * `occasion` lets an occasion name whose measure it is where "its" would name
 * the wrong thing (`OCCASION_MEASURE_WORDS`, Expansionist batch E2): the
 * census's citizens are the empire's, and a completion's are the city's.
 */
function measuredWords(
  what: string,
  share: number,
  measure: OccasionMeasure,
  occasion?: WindfallOccasion,
): string {
  const words =
    (occasion === undefined ? undefined : OCCASION_MEASURE_WORDS[occasion]?.[measure]) ??
    MEASURE_WORDS[measure];
  if (typeof words !== 'string') return `${signed(share)} ${what} for each ${words.each}`;
  return share === 1
    ? `${what} equal to ${words}`
    : Number.isInteger(share)
      ? `${what} equal to ${share} times ${words}`
      : `${what} equal to ${Math.round(share * 100)}% of ${words}`;
}

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
/**
 * One amplifier's sentence, narrowed to a **family** — "a great artist's act
 * pays +100%".
 *
 * A rewrite of the printed phrase rather than a second table, and it is the one
 * place in this file that edits a sentence another table wrote. The bargain is
 * `scopeCondition`'s exactly: there is one set of words for what an amplifier
 * does, and a second `Record<AmplifierTarget, …>` keyed by family would have
 * been forty entries of which five could ever be written. The substitution is on
 * the only phrase any target uses for a person — "a great person's" — so a
 * target that never names one comes back untouched, which is the honest answer
 * for a row that narrowed something with no family in it.
 */
function familyNarrowed(text: string, family?: Family): string {
  if (family === undefined) return text;
  return text.replace("a great person's", `a great ${family}'s`);
}

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
  // **A doubling is said as twice**, because that is the card's own word and
  // "+100% copies" is a phrase a player has to do arithmetic on. Anything else
  // keeps the share in front, the way every other gain on this table reads. It
  // says *your* deposits out loud: a seam somebody lent you is not doubled, and
  // a player who was not told would plan around the wrong number.
  strategicCopies: (percent) =>
    percent === 100
      ? 'your strategic resource deposits supply twice as many copies'
      : `your strategic resource deposits supply ${signed(percent)}% copies`,
  // A per-item figure, so a share of it is a row nobody should write — said
  // plainly for this table's stated reason, the way a player finds out.
  luxuryMineCopies: (percent) =>
    `each of your luxury deposits with a mine supplies ${signed(percent)}% copies`,
  // Dominion batch D6, Vae Victis. A doubling is said as twice, the card's own
  // word, as `strategicCopies` says it.
  captureRewards: (percent) =>
    percent === 100
      ? 'what your Orders pay for capturing a city is paid twice'
      : `what your Orders pay for capturing a city is ${signed(percent)}%`,
  // Dominion batch D8, The Strategoi. A doubling is said as doubled, the
  // card's own word.
  generalAura: (percent) =>
    percent === 100
      ? 'the strength aura of your great generals is doubled'
      : `the strength aura of your great generals is ${signed(percent)}%`,
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
  // A whole-ledger figure, so this reads as the table's docblock says such an
  // entry should: plainly, so that a row nobody should write announces itself.
  strategicCopies: (amount) =>
    `each of your strategic resource deposits supplies ${signed(amount)} copies`,
  // The card's own sentence, and a per-item figure is exactly what this table
  // is for: the deposit is the item and the copy is the step.
  luxuryMineCopies: (amount) =>
    amount === 1
      ? 'each of your luxury deposits with a mine supplies one more copy'
      : `each of your luxury deposits with a mine supplies ${signed(amount)} copies`,
  // A whole payout, so a flat step on it is a row nobody should write.
  captureRewards: (amount) => `what your Orders pay for capturing a city is ${signed(amount)} more`,
  // Dominion batch D8. A flat step is read by nothing today (the aura is
  // amplified by a share only), and the words say so plainly.
  generalAura: (amount) => `the strength aura of your great generals is ${signed(amount)} more`,
};

/**
 * The Sovereign Writ's sentence (Expansionist batch E5): the bonus ladder's
 * first rung, paid once for every step of its size. Read off the rule book's
 * own ladder (`rules.meters.tiers`), the one `uncappedTierPercent` reads.
 */
const WRIT_UNCAPPED_WORDS: string = (() => {
  let points = 0;
  let percent = 0;
  for (const step of RULES.meters.tiers) {
    if (step.whenAtOrAbove === undefined || step.whenAtOrAbove <= 0 || step.percent <= 0) continue;
    if (points === 0 || step.whenAtOrAbove < points) {
      points = step.whenAtOrAbove;
      percent = step.percent;
    }
  }
  return `spare authority's bonus to production and border growth has no ceiling: +${percent}% for every ${points} points`;
})();

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
  // Expansionist batch E5, The Sovereign Writ: the ladder's own first rung,
  // read off the rule book, so a retuned ladder re-words the card.
  writUncapped: WRIT_UNCAPPED_WORDS,
  // The noun is the **scope's**, so this entry is only the half the table can
  // write — the `meterRule` arm builds the rest off `eachWords`, exactly as the
  // `authority` arm builds "per city holding an empire building". A row with no
  // scope falls back to this sentence whole, which is the honest reading of a
  // rewrite that names no towns.
  cityCost: 'the authority a city costs',
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
  'writUncapped',
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
  // Pax Romana (Dominion batch D4).
  pacifyOnCapture: 'a city you capture is pacified at once',
  doubleOverflow: 'leftover production from a completed item is doubled',
  unitJumpsQueue: 'a unit that would finish sooner jumps ahead of a building in the queue',
  buyGreatPersonWithGold: 'a great person waiting to be called may be bought with gold',
  buyGreatPersonWithFaith: 'a great person waiting to be called may be bought with faith',
  buyScholarDraftWithFaith: 'a draft of great scholars may be bought with faith',
  rerollOffers:
    'the first time you ask for a fresh hand of Orders, doctrines or great people, it costs nothing',
  capitalBuysWithoutLimit: 'your capital may buy as many units in a turn as it can pay for',
  goldBuysWonders: 'you may buy world wonders with gold',
  // Said as the bank that opens, with the price in the same breath: a player who
  // reads only "you may redraw with gold" would learn the good half and miss the
  // half that keeps faith the better route.
  goldBuysRedraw: 'you may pay gold for a fresh hand, at a higher price than faith would ask',
  // Said as what the freeze stops stopping. A player who has never been
  // overdrawn needs to be told what the rule is about, so the sentence names the
  // condition rather than only the licence.
  goldBuysFrozenTiles: 'you may still buy hexes while your authority is overdrawn',
  // Said as what the till stops asking for, because the card's other half is a
  // surcharge and a player reading the pair needs to know what they are buying.
  buysWithoutResources:
    'units you buy need none of the strategic resources they would need to be built',
  // The fallback sentence, which a row should never reach: `buildsEverywhere`
  // names a building and is printed by `FLAG_RULE_BUILDING_WORDS` instead. It is
  // here because the table is exhaustive over the union, and it says the plain
  // truth rather than nothing at all.
  buildsEverywhere: 'you may build more than one of a building that is normally one to a realm',
  wonderTownBuysWithoutLimit:
    'a city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn',
  boughtUnitsCountAsTrained: 'units you buy count as trained',
  campClaimsGround:
    'clearing a barbarian camp claims its hex and the unclaimed hexes around it for your nearest city, if that city is close by',
  // The three faith-purchase rules. Each is said with the towns its row names
  // (`CardRuleEffect.scope`) appended by the describer.
  faithBuysUnits: 'units may be bought with faith',
  faithBuysBuildings: 'buildings other than wonders may be bought with faith',
  faithBuysWonders: 'a world wonder at least half built may be bought with faith',
  // Said as what the distance stops mattering for, and it names the two
  // conditions the rule carries in its own id — a player told only "your sea
  // routes ignore range" would try it between a pair of towns that has never
  // traded. Everything else the gate asks is still asked, which is the card's
  // own second sentence and is left to the card to print.
  postsWaiveSeaRouteRange:
    'your sea routes may join two cities that both hold your trading post however far apart they are',
  // Facts a card declares true of every town. `CityRuleId`.
  freshwater: 'every city of yours counts as being on fresh water',
  // The Bakufu and The Consular Roads (Dominion batch D4). The row's scope
  // follows as "in every city with ...".
  pacified: 'unrest ends at once',
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
  // The zone of control, both rules of it. `ZocRuleId`. The second is written
  // for the whole army, and `FLAG_RULE_CLASS_WORDS` says it of a line.
  borders: 'every hex you own exerts zone of control on enemy units, as a unit of yours would',
  ignored: 'your units ignore enemy zone of control',
  // Dominion batch D2. Three of the four are written for a line of soldiers
  // too, in `FLAG_RULE_CLASS_WORDS`.
  attackKeepsFortification: 'attacking does not break your units’ fortification',
  moveAfterAttack: 'your units may move after attacking',
  secondAttack: 'your units may attack twice a turn',
  breachInOneBlow: 'your units break a town’s walls in one blow',
  // Expansionist batch E3: The Woodland Bands, The Watercourses, The Water
  // Courts (`BehaviorRuleId`), then The Mountain Terraces and The Common
  // Domain (`CityRuleId`, the second with its scope appended).
  woodsWalk: 'your units pay only the open-ground cost to enter forest or jungle',
  riverFarmsWater: 'your farms beside one of your farms on a river count as having fresh water',
  farmChainsWater:
    'your farms joined to a farm on fresh water by a chain of your farms count as having fresh water',
  workMountains: 'your cities may work the mountains in their borders',
  widerReach: 'citizens may work owned hexes one ring beyond the usual reach',
  // Dominion batch D8: The Soldiers' Share, The Servian Reforms and Combined
  // Arms (`BehaviorRuleId`).
  noFounding: 'you can no longer found new cities',
  noExperience: 'your units never gain experience',
  siegeScreened: 'your siege units beside one of your melee units cannot be attacked in melee',
  // Scientific batch S1, the Galleass. What a blockade does, said once, because
  // a player has met it only on a heavy warship's own description.
  blockades:
    'your ships blockade a foreign city they stand beside on the water: its sea lanes close and its trade routes pay nothing',
};

/**
 * The rules that read differently **of a line of soldiers** — the class-narrowed
 * half of `FLAG_RULE_WORDS` (`CardRuleEffect.class`, Riders of the Steppe).
 *
 * A second, partial table rather than a formatter on every entry, because only
 * two rules in the union take a filter at all: the rest are facts about the
 * *empire* and have no piece to be said of. A row that narrows a rule with no
 * entry here still prints — the class leads and the sentence follows — so a
 * narrowing added tomorrow is never silent, only plain.
 */
const FLAG_RULE_CLASS_WORDS: Partial<Record<CardFlagRuleId, (who: string) => string>> = {
  freePillage: (who) => `${who} pillage without spending movement`,
  ignored: (who) => `${who} ignore enemy zone of control`,
  faithBuysUnits: (who) => `${who} may be bought with faith`,
  // Dominion batch D2.
  moveAfterAttack: (who) => `${who} may move after attacking`,
  secondAttack: (who) => `${who} may attack twice a turn`,
  breachInOneBlow: (who) => `${who} break a town’s walls in one blow`,
  // Scientific batch S1, the Galleass.
  blockades: (who) =>
    `${who} blockade a foreign city they stand beside on the water: its sea lanes close and its trade routes pay nothing`,
};

/**
 * The rules that read differently **of one named building** —
 * `CardRuleEffect.building`, and Caravanserai Cities is the only row that
 * carries one (batch C7).
 *
 * A function rather than a third `Record` because exactly one member of the
 * union takes a building at all, and a table with one entry and a fallback is a
 * table that hides how narrow the case is. A rule that names a building it has
 * nothing to say about falls back to the flat sentence with the name in front,
 * which is `FLAG_RULE_CLASS_WORDS`' own bargain: a narrowing added tomorrow is
 * never silent, only plain.
 *
 * The sentence says *every* city out loud because that is the half a player
 * acts on, and it deliberately does **not** say the building stops being an
 * empire building — it does not. What the card lifts is the limit, and nothing
 * about the price or the class moves with it.
 */
function FLAG_RULE_BUILDING_WORDS(rule: CardFlagRuleId, what: string): string {
  if (rule === 'buildsEverywhere') return `you may build ${what} in every city`;
  return `${what}: ${FLAG_RULE_WORDS[rule]}`;
}

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
  // The complement said the way a player would say it, not as a negation of the
  // line above: "while you are at peace" is a state of the realm a player plans
  // around, and "while you are not at war" is the same fact spelled as algebra.
  atPeace: 'while you are at peace',
  keepingRite: 'while a rite is being kept anywhere in your empire',
  atWarWithOpusBuilder: 'while you are at war with an empire raising the Magnum Opus',
  noReligionFounded: 'until you have founded a religion',
  rivalHoldsMoreTowns: 'while an empire you have met holds more towns than you',
};

// --- commissions ------------------------------------------------------------

/**
 * The words for a counted goal: the verb, the thing counted in the singular and
 * plural, and the short label the counter on a card face and a HUD chip prints
 * beside its figure ("1 / 2 camps cleared").
 */
const COMMISSION_COUNTED_WORDS: Record<
  TallyOccasion,
  { verb: string; one: string; many: string; counter: string }
> = {
  barbarianKill: { verb: 'kill', one: 'barbarian unit', many: 'barbarian units', counter: 'barbarians killed' },
  wonderAnywhere: {
    verb: 'see',
    one: 'wonder finished anywhere in the world',
    many: 'wonders finished anywhere in the world',
    counter: 'wonders finished',
  },
  greatPersonSpent: { verb: 'spend', one: 'great person', many: 'great people', counter: 'great people spent' },
  unitLost: { verb: 'lose', one: 'unit in battle', many: 'units in battle', counter: 'units lost' },
  goldSpent: { verb: 'spend', one: 'gold buying', many: 'gold buying', counter: 'gold spent buying' },
  unitKilled: { verb: 'kill', one: 'enemy unit', many: 'enemy units', counter: 'enemy units killed' },
  unitTrained: { verb: 'train', one: 'unit', many: 'units', counter: 'units trained' },
  campCleared: { verb: 'clear', one: 'barbarian camp', many: 'barbarian camps', counter: 'camps cleared' },
  cityCaptured: { verb: 'capture', one: 'city', many: 'cities', counter: 'cities captured' },
  wonderOrCapitalCaptured: {
    verb: 'capture',
    one: "city that holds a world wonder or was another empire's original capital",
    many: "cities that hold a world wonder or were another empire's original capital",
    counter: 'such cities captured',
  },
  // Expansionist batch E4, The Wide Country.
  hexClaimed: {
    verb: 'claim',
    one: 'hex by an outpost, a cleared camp or buying',
    many: 'hexes by outposts, cleared camps or buying',
    counter: 'hexes claimed',
  },
  buildingBoughtWithGold: {
    verb: 'buy',
    one: 'building with gold',
    many: 'buildings with gold',
    counter: 'buildings bought',
  },
  riteStarted: { verb: 'start', one: 'rite in your cities', many: 'rites in your cities', counter: 'rites started' },
  foreignCityConverted: {
    verb: 'convert',
    one: 'foreign city to your religion',
    many: 'foreign cities to your religion',
    counter: 'foreign cities converted',
  },
  // Dominion batch D1. No commission counts ranks yet; the table is total.
  rankEarned: { verb: 'earn', one: 'rank with your units', many: 'ranks with your units', counter: 'ranks earned' },
  hexPillaged: { verb: 'pillage', one: 'hex', many: 'hexes', counter: 'hexes pillaged' },
  unitGained: { verb: 'gain', one: 'unit', many: 'units', counter: 'units gained' },
  // Dominion batch D6, Commission: A Victor's Peace.
  warEnded: {
    verb: 'end',
    one: 'war by making peace or by destroying the other empire',
    many: 'wars by making peace or by destroying the other empire',
    counter: 'wars ended',
  },
  // Expansionist batch E2. No commission counts this yet; the table is total.
  sizeRecord: {
    verb: 'grow',
    one: "citizen past a city's largest size",
    many: "citizens past your cities' largest sizes",
    counter: 'citizens past a record',
  },
};

/**
 * The words for a reached goal: the goal as a phrase about a figure, the
 * counter's label, and the figure as a noun for a reward scaled by it.
 */
const COMMISSION_FIGURE_WORDS: Record<
  CommissionFigure,
  { goal: (count: number) => string; counter: string; noun: string }
> = {
  treasury: {
    goal: (count) => `end a turn with at least ${count} gold in your treasury`,
    counter: 'gold in the treasury',
    noun: 'the gold in your treasury',
  },
  luxuryCopies: {
    goal: (count) => `hold ${count} copies of one luxury, counting copies you receive in deals`,
    counter: 'copies of one luxury',
    noun: 'the copies you hold of your most-held luxury',
  },
  tradeRoutes: {
    goal: (count) => `have ${count} trade routes running at the same time`,
    counter: 'trade routes running',
    noun: 'your trade routes',
  },
  hexesOwned: {
    goal: (count) => `own ${count} hexes`,
    counter: 'hexes owned',
    noun: 'the hexes you own',
  },
  improvedTilesWorked: {
    goal: (count) => `work ${count} improved tiles at the same time`,
    counter: 'improved tiles worked',
    noun: 'the improved tiles you work',
  },
  // Expansionist batch E5, Commission: Break the Sod (the triage's reading 2).
  improvedOnlyTilesWorked: {
    goal: (count) => `work ${count} improved tiles at the same time, not counting tended tiles`,
    counter: 'improved tiles worked',
    noun: 'the improved tiles you work',
  },
  // Expansionist batch E5, The Heartland. The goal's floor on each hex is said
  // by `commissionGoalWords`.
  oneTownWorkedHexes: {
    goal: (count) => `have one of your cities work ${count} improved or tended tiles`,
    counter: 'rich tiles worked by one city',
    noun: 'the improved or tended tiles your best city works',
  },
  originalCapitalsHeld: {
    goal: (count) => `hold ${count} original capitals other than your own at the same time`,
    counter: 'original capitals held',
    noun: 'the original capitals you hold',
  },
  tendedTiles: {
    goal: (count) => `have ${count} tended tiles inside your borders`,
    counter: 'tended tiles',
    noun: 'your tended tiles',
  },
  goldIncome: {
    goal: (count) => `earn at least ${count} gold per turn`,
    counter: 'gold per turn',
    noun: 'your gold per turn',
  },
  followingCityShare: {
    goal: (count) => `have at least ${count}% of the world's cities follow your religion`,
    counter: "% of the world's cities following",
    noun: "the share of the world's cities following your religion",
  },
  rivalCapitalsFollowing: {
    goal: (count) =>
      count === 1
        ? "have a rival's capital follow your religion"
        : `have ${count} rival capitals follow your religion`,
    counter: 'rival capitals following',
    noun: 'the rival capitals following your religion',
  },
};

/** One part of a commission's goal as a phrase: "clear 2 barbarian camps". */
export function commissionGoalWords(goal: CommissionGoal): string {
  if (goal.kind === 'counted') {
    const words = COMMISSION_COUNTED_WORDS[goal.occasion];
    // The floors (Dominion batch D6): "capture 1 city of 5 or more citizens",
    // "… after taking 2 or more of its cities in that war".
    const floor =
      (goal.minPopulation === undefined ? '' : ` of ${goal.minPopulation} or more citizens`) +
      (goal.minTownsTaken === undefined
        ? ''
        : `, after taking ${goal.minTownsTaken} or more of its cities in that war`);
    return `${words.verb} ${goal.count} ${goal.count === 1 ? words.one : words.many}${floor}`;
  }
  // The floor on each hex (Expansionist batch E5, The Heartland).
  const each = goal.hexYieldAtLeast === undefined ? '' : ` that each yield ${goal.hexYieldAtLeast} or more in total`;
  return `${COMMISSION_FIGURE_WORDS[goal.figure].goal(goal.count)}${each}`;
}

/**
 * What a figure counts in one town, for a reward paid to each town from its own
 * figure (Expansionist batch E5, The Domesday Survey). Only the figures with a
 * town reading (`townFigure`, `commissions.ts`).
 */
const TOWN_FIGURE_WORDS: Partial<Record<CommissionFigure, string>> = {
  improvedTilesWorked: 'the improved or tended tiles it works',
  improvedOnlyTilesWorked: 'the improved tiles it works',
};

/** The short label a counter prints beside its figure: "camps cleared". */
export function commissionCounterWords(goal: CommissionGoal): string {
  return goal.kind === 'counted'
    ? COMMISSION_COUNTED_WORDS[goal.occasion].counter
    : COMMISSION_FIGURE_WORDS[goal.figure].counter;
}

/**
 * One reward line as phrases: "+60 production in your capital". `towns` is how
 * many towns the goal counts (Dominion batch D6), which decides whether a
 * reward read off them says "it" or "those cities".
 */
export function commissionRewardWords(reward: CommissionReward, towns = 1): string[] {
  const out: string[] = [];
  const one = towns <= 1;
  if (reward.eachTown === true && reward.yield !== undefined && reward.amount !== undefined) {
    // The Domesday Survey (Expansionist batch E5): each town from its own count.
    const counted = reward.fromFigure === undefined ? undefined : TOWN_FIGURE_WORDS[reward.fromFigure];
    out.push(
      counted === undefined
        ? `${signed(reward.amount)} ${reward.yield} in each city`
        : `each city gains ${reward.yield} equal to ${reward.amount} times ${counted}, toward what it is building`,
    );
  } else if (reward.yield !== undefined && reward.amount !== undefined) {
    const where = reward.yield === 'food' || reward.yield === 'production' ? ' in your capital' : '';
    if (reward.fromGoal === 'population') {
      // "culture equal to 23 times its population", "science equal to 10 times
      // those cities' total population" (Dominion batch D6).
      const noun = one ? 'its population' : "those cities' total population";
      out.push(`${reward.yield}${where} equal to ${reward.amount} times ${noun}`);
    } else if (reward.fromGoal === 'wonders') {
      out.push(`${signed(reward.amount)} ${reward.yield}${where} for each world wonder in ${one ? 'it' : 'them'}`);
    } else if (reward.fromFigure === undefined) {
      out.push(`${signed(reward.amount)} ${reward.yield}${where}`);
    } else {
      const noun = COMMISSION_FIGURE_WORDS[reward.fromFigure].noun;
      const share =
        reward.amount < 1 ? `${Math.round(reward.amount * 100)}% of` : `${reward.amount} times`;
      out.push(`${reward.yield}${where} equal to ${share} ${noun} at that moment`);
    }
  }
  if (reward.greatPerson !== undefined) {
    out.push(
      reward.greatPerson === 'any' ? 'a great person to call' : `a great ${reward.greatPerson} to call`,
    );
  }
  if (reward.unit !== undefined) {
    const what =
      reward.unit === 'bestMelee'
        ? 'the best melee unit you can build'
        : `${indefinite(unitDef(reward.unit).name)} ${ref('unit', reward.unit, unitDef(reward.unit).name)}`;
    out.push(`${what}, trained in your capital free of upkeep`);
  }
  if (reward.timed !== undefined) {
    const said = describeEffects(reward.timed.effects, 'empire').map((clause) => clause.text);
    out.push(`for ${reward.timed.turns} turns, ${said.join(' and ')}`);
  }
  // Dominion batch D6: citizens, a building where the goal was met, and chairs.
  if (reward.citizens !== undefined && reward.citizens > 0) {
    const citizens = reward.citizens === 1 ? '+1 citizen' : `${signed(reward.citizens)} citizens`;
    const to = reward.citizensTo ?? 'capital';
    const where =
      to === 'capital'
        ? 'in your capital'
        : to.smallest === 1
          ? 'in your smallest city'
          : `in each of your ${to.smallest} smallest cities`;
    out.push(`${citizens} ${where}`);
  }
  if (reward.building !== undefined) {
    const name = buildingDef(reward.building).name;
    out.push(
      `a free ${ref('building', reward.building, name)} in ${one ? 'that city' : 'the last of those cities'}`,
    );
  }
  if (reward.wildcardChairs !== undefined && reward.wildcardChairs > 0) {
    out.push(
      reward.wildcardChairs === 1
        ? 'one more Wildcard chair for the rest of the game'
        : `${reward.wildcardChairs} more Wildcard chairs for the rest of the game`,
    );
  }
  // Expansionist batch E5, The Heartland: the town is marked, and what the
  // mark brings holds for the rest of the game.
  if (reward.markTown === true) out.push(`${one ? 'that city' : 'the last of those cities'} is marked`);
  if (reward.lasting !== undefined && reward.lasting.length > 0) {
    const said = describeEffects(reward.lasting, 'empire').map((clause) => clause.text);
    out.push(`for the rest of the game, ${said.join(' and ')}`);
  }
  return out;
}

/**
 * A commission's three clauses: the goal, the reward, and what happens to the
 * card. Printed by `describeCard`, so the collection, the draft and the
 * Compendium all say the same words.
 */
export function describeCommission(spec: CommissionSpec): CardClause[] {
  const goal = spec.goals.map(commissionGoalWords).join(' and ');
  // How many towns the goal counts, so a reward read off them names one or many.
  const counted = spec.goals.find((part) => part.kind === 'counted');
  const towns = counted?.count ?? 1;
  const reward = spec.reward.flatMap((line) => commissionRewardWords(line, towns)).join(', and ');
  return [
    { text: `Commission. Goal: ${goal}, while this card is seated` },
    { text: `Reward: ${reward}` },
    { text: 'then this card leaves its chair and is never seated again' },
  ];
}
