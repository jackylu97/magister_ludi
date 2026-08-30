/**
 * Typed access to `data/greatPeople.json` — the roster, and the legacy each name
 * leaves behind.
 *
 * The sibling of `religionData.ts` one table over, and it strikes the *same*
 * bargain: **a great person is a card that walks.** Their unique ability is
 * written in the effect vocabulary Orders, Doctrines, beliefs, rites and wonders
 * are written in (`statecraftData.ts`), read by the one evaluator that reads a
 * `CardEffect` (`statecraft.ts`), so adding a name is a JSON row and adding a
 * *shape* is a design decision. Nothing here interprets an effect; nothing here
 * even imports one at runtime.
 *
 * The import discipline, and why it matters
 * -----------------------------------------
 * `statecraftData.ts` imports `GreatPersonId` from this file (it is a member of
 * `CardId`) and this file imports `CardEffect` from that one. **Both directions
 * are type-only**, which is exactly the arrangement `religionData.ts` keeps and
 * for exactly its reason: a type cycle is free and a runtime cycle leaves
 * whichever module evaluated second reading an uninitialised binding. The lookup
 * that spans all seven card classes is `anyCardDef` in `statecraft.ts`, beside
 * the evaluator that needs it, and never here.
 *
 * How the ratified text became data
 * ---------------------------------
 * `docs/great-people.md` prints eighty-odd legacies in English. Three
 * translations were made systematically, and they are written down here rather
 * than argued row by row:
 *
 *   · **"buildings −10%⚙" is `productionBonus +10%`.** The vocabulary has one
 *     way to say "this empire builds a category faster", and a discount on a
 *     cost and a bonus on a rate are the same sentence from the two ends. Every
 *     cost-reduction legacy is written this way.
 *   · **"melee units +1 combat" is `unitStat combatPercent`.** `combatLine`
 *     carries no `UnitFilter` — a *shape* decision, deliberately not taken here
 *     — so the only generic way to say "this class of unit fights better" is the
 *     percentage. The figures are chosen to land near the printed flat at the
 *     age's typical strength.
 *   · **A disjunction is two lines.** `CityScope` has no `any`, and
 *     `statecraftData.ts` says out loud that two lines read better; Bezalel's
 *     "a shrine or a temple" is two `cityYields` rows, so a town with both is
 *     paid twice. That is the vocabulary's own reading and not a shortcut.
 *
 * Anything that still would not fit is **deferred and annotated** on the row
 * (`deferred`, a list of sentences naming the missing shape) rather than bent to
 * fit — Entry XV.b's rule, `resourceData.ts`'s precedent, and the reason a row
 * may carry an empty `legacy`. A deferred half is *printed on the card*; it is a
 * promise the game has not made, said out loud.
 *
 * Ages
 * ----
 * `age` is the **roster** age, numbered as `docs/great-people.md` numbers it:
 * Æra II (Heroes) through Æra V (Magister). The tech tree today knows three ages
 * (`TechAge`), so an empire's era is mapped onto a roster age by
 * `rosterAgeFor` in `greatPeople.ts` — one function, so the tree pass that adds
 * Æra IV and V moves it and nothing else. Æra V's rows are reachable today only
 * through the offer's *spill* (the forgotten, and those ahead of their time),
 * which is the roster degrading gracefully rather than a hole.
 */

import greatPeopleJson from '../../data/greatPeople.json';

// Type-only in both directions. See the docblock.
import type { CardEffect } from './statecraftData';

/**
 * The five families, in the order every roster, ledger and weighting walks them.
 *
 * A family is two things at once and that is the design (`docs/great-people.md`):
 * it says which **buildings feed** the renown that recruited this person, and it
 * says which **act** and which **work** the piece offers. Prophets are
 * religion's and are deliberately not here.
 */
export type Family = 'scholar' | 'artist' | 'engineer' | 'merchant' | 'general';

/** The families in table order. Iteration order for every sweep over them. */
export const FAMILIES: readonly Family[] = [
  'scholar',
  'artist',
  'engineer',
  'merchant',
  'general',
];

/**
 * The families a **townsman** can belong to (ledger Entry XLVIII): every family
 * but the general's.
 *
 * The exclusion is the ruling, not an omission. A barracks' renown makes a great
 * general, not a guildsman — there is no such thing as a citizen who leaves the
 * fields to be a soldier and stays a citizen — so renown in that family neither
 * fills a city's guild bar nor can ever be apportioned a specialist. Written as
 * `Exclude` rather than as a second literal union so that a *sixth* family (the
 * magistrate, parked in Entry XLVIII for a later pass) joins both lists by being
 * added to one.
 */
export type SpecialistFamily = Exclude<Family, 'general'>;

/**
 * The specialist families in **apportionment order** — the fixed tie-break for
 * D'Hondt in the `guilds` phase, and the order the city panel prints its row in.
 *
 * Deliberately *not* `FAMILIES` with the general filtered out. That order is the
 * roster table's and moving a row in `data/greatPeople.json` would silently
 * re-break every tie in every game ever seeded; this one is written down here,
 * where a change to it is a decision somebody made on purpose.
 */
export const SPECIALIST_FAMILIES: readonly SpecialistFamily[] = [
  'scholar',
  'merchant',
  'engineer',
  'artist',
];

/** Is this a family a citizen can join? The guard `dismissSpecialist` asks. */
export function isSpecialistFamily(value: unknown): value is SpecialistFamily {
  return typeof value === 'string' && (SPECIALIST_FAMILIES as readonly string[]).includes(value);
}

/**
 * The Doctrine philosophy's three grades, read off the roster
 * (`docs/deprecated/statecraft-cards.md`, applied to people by the 2026-08-27 ruling):
 * game-defining **with a malice**, generically strong, or situational and
 * harmless. Presentation and design bookkeeping only — nothing in the
 * simulation switches on it, exactly as nothing switches on a card's `line`.
 */
export type GreatPersonTier = 'defining' | 'strong' | 'situational';

/**
 * The occasion on which a legacy **stops being heeded**.
 *
 * Three ratified rows end with a condition rather than with a number, and until
 * the 2026-08-28 ruling all three carried it as a `deferred` sentence because
 * nothing revoked a legacy. They are three occasions and not one generic
 * predicate on purpose: each is a *moment* somebody can point at, which is what
 * makes the loss legible to the player who is losing it.
 *
 *   · `enemyEntersCapital` — a foreign soldier comes to rest on ground the
 *     capital holds. Archimedes: Syracuse fell while he was drawing circles.
 *     Hooked at the one "a piece arrived" seam (`arriveOnTile`), because it is
 *     an event and a sweep would miss a column that marched through.
 *   · `happinessNegative` — the first turn the realm's happiness goes under.
 *     Hypatia, torn apart by a mob. A **condition of a turn** rather than an
 *     event, so it is read once a turn off the meter, exactly as the standing
 *     Triumphs are read off the board.
 *   · `ageAdvanced` — the era the person was spent in has closed. Boudica, whose
 *     revolt belonged to her century. Compared against `LegacyRecord.age`, an
 *     absolute stamp in the `TimedEffect` tradition.
 *
 * All three are marked in **one place** — `reviewLegacies` (`greatPeople.ts`) —
 * and marking never deletes: see `LegacyRecord`.
 */
export type LegacyRevocation = 'enemyEntersCapital' | 'happinessNegative' | 'ageAdvanced';

/** The revocations, in table order. The sweep's iteration order. */
export const LEGACY_REVOCATIONS: readonly LegacyRevocation[] = [
  'enemyEntersCapital',
  'happinessNegative',
  'ageAdvanced',
];

/** Is this a revocation the table knows? The guard a JSON row is checked against. */
export function isLegacyRevocation(value: unknown): value is LegacyRevocation {
  return typeof value === 'string' && (LEGACY_REVOCATIONS as readonly string[]).includes(value);
}

export type GreatPersonId = keyof typeof greatPeopleJson.people & string;

export interface GreatPersonDef {
  name: string;
  family: Family;
  /** The roster age this name belongs to. See the docblock. */
  age: number;
  tier: GreatPersonTier;
  /** One line, in the voice of the tech tree's aphorisms. Never a rule. */
  epigram: string;
  /** Why this person is remembered at all. Flavour; the wunderkammer's register. */
  kernel: string;
  /**
   * The permanent ability that attaches to the empire when this person is
   * spent, either way — *they served you; their legacy remains*.
   *
   * **May be empty**, and an empty list is a statement rather than an oversight:
   * see `deferred`. A row with an empty legacy is a name that can still be
   * recruited, still gives its family's boon, and simply leaves nothing behind
   * until the shape it needs exists.
   */
  legacy: CardEffect[];
  /**
   * The halves of the ratified text this build does not implement, one sentence
   * each, naming the missing shape.
   *
   * `CardDefBase.deferred`'s twin, and it is printed on the card struck through
   * — a promise not made is said out loud rather than quietly dropped.
   */
  deferred?: string[];
  /**
   * When this legacy stops being heeded, or absent for one that never does —
   * which is every row but three. See `LegacyRevocation`.
   *
   * On the row rather than as an effect, for `OrderSlotGrant`'s reason exactly:
   * every shape in `CardEffect` is a *standing* reading of the board, and this
   * is a thing that happens at a moment and never un-happens.
   */
  revokedWhen?: LegacyRevocation;
}

export interface GreatPeopleData {
  people: Record<GreatPersonId, GreatPersonDef>;
}

export const GREAT_PEOPLE = greatPeopleJson as unknown as GreatPeopleData;

/**
 * Every id in **file order**, which is the order every draw, every sweep and
 * every screen walks them in.
 *
 * File order rather than sorted, for `ORDER_IDS`' reason exactly: an outcome
 * that depends on an order must depend on an order the data itself carries, so a
 * designer reordering the JSON is making a decision rather than tripping over
 * one.
 */
export const GREAT_PERSON_IDS = Object.keys(GREAT_PEOPLE.people) as GreatPersonId[];

export function greatPersonDef(id: GreatPersonId): GreatPersonDef {
  const def = GREAT_PEOPLE.people[id];
  if (!def) throw new Error(`Unknown great person "${String(id)}"`);
  return def;
}

/**
 * Runtime guard. A great person id arrives inside a command and inside a save
 * file, so a value typed `GreatPersonId` may be any string at all.
 */
export function isGreatPersonId(value: unknown): value is GreatPersonId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(GREAT_PEOPLE.people, value)
  );
}

/** Is this a family the roster knows? The guard a JSON row is checked against. */
export function isFamily(value: unknown): value is Family {
  return typeof value === 'string' && (FAMILIES as readonly string[]).includes(value);
}

/** The roster ages the table actually holds, ascending. Derived, never restated. */
export const ROSTER_AGES: readonly number[] = [
  ...new Set(GREAT_PERSON_IDS.map((id) => greatPersonDef(id).age)),
].sort((a, b) => a - b);

/** Every name of one roster age, in file order. The bag a draw is taken from. */
export function rosterOfAge(age: number): GreatPersonId[] {
  return GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).age === age);
}

/**
 * Fails loudly at load if the table names something that does not exist.
 *
 * The cheapest-possible-test `improvementData.ts` and `resourceData.ts` both
 * run, and here for their reason: the whole point of a data-driven roster is
 * that a designer edits it without touching TypeScript, and the cost of that is
 * that a typo in a family would otherwise show up as a person whose act does
 * nothing.
 */
function validateTable(): void {
  for (const id of GREAT_PERSON_IDS) {
    const def = greatPersonDef(id);
    const where = `greatPeople.json: ${id}`;
    if (!isFamily(def.family)) throw new Error(`${where} names unknown family "${String(def.family)}"`);
    if (!Number.isInteger(def.age) || def.age <= 0) {
      throw new Error(`${where} has a non-positive age`);
    }
    if (!Array.isArray(def.legacy)) throw new Error(`${where} has no legacy list`);
    // An empty legacy with nothing said about it is the one thing this table
    // must never contain: a name that quietly does nothing is indistinguishable
    // from a name somebody forgot to finish.
    if (def.legacy.length === 0 && (def.deferred ?? []).length === 0) {
      throw new Error(`${where} leaves no legacy and says nothing about why`);
    }
    // A revocation the sweep does not know is a legacy that would quietly never
    // be revoked — the same silent-failure the family check above exists for.
    if (def.revokedWhen !== undefined && !isLegacyRevocation(def.revokedWhen)) {
      throw new Error(`${where} names unknown revocation "${String(def.revokedWhen)}"`);
    }
  }
}

validateTable();
