/**
 * Typed access to `data/beads.json` — the Bead Race's catalogue (`docs/beads.md`,
 * design ledger Entry VI).
 *
 * A **bead** is the game's one currency of victory: glass counters across four
 * families, ~30 in a finished game, every one an announced event, and the first
 * empire to `rules.threshold` of them may begin the Magnum Opus, and the Opus
 * closes the age and counts the rods. This file only *types* the
 * catalogue; `beads.ts` is the evaluator and owns the only `switch` on a deed,
 * a count or a boon shape — the same bargain `triumphs.ts` makes for a trigger
 * kind and `statecraft.ts` for a `CardEffect.kind`, made once more, and it buys
 * the same thing: **a new bead is a JSON row**.
 *
 * **Three of the five classes are withdrawn** (batch Q1, `docs/wager.md` §5).
 * Feats, endeavours and quests were the old victory conditions — the deeds — and
 * the wager replaced them: an age sets three bars, a seat stakes one, and a bead
 * is what keeping it pays. Every row of the three carries `retired: true`, which
 * is the reckonings' own retirement read three decks further (batch G2). The
 * rows keep their bodies for the Compendium's record; they are dealt to nobody,
 * swept for nobody and awarded to nobody, and the hand that used to deal them —
 * the decks, the slots, `handSize`, `dealEveryTurns` — is gone from the state
 * rather than left empty. **A bead comes from a wager kept or from a grant**, and
 * from nothing else.
 *
 * Five classes of row, and what separated them
 * --------------------------------------------
 *   · a **feat** is a first in the world, always in play, never dealt. It is
 *     contested — the register settles it — and it is scoped `game` or `age`.
 *     *Retired.*
 *   · an **endeavour** is a *race project*: a queue row every empire may build
 *     while the card is face up and its prerequisite is met, and the first
 *     empire to finish takes the bead and the boon. Nobody else gets either.
 *     *Retired.*
 *   · a **quest** is a deed, dealt from an age's deck, taken by the first seat
 *     that does it. *Retired.*
 *   · a **reckoning** is the age's snapshot, taken the moment the **world's**
 *     age closes (`worldClock.ts` — the mean of the board since batch G1, not
 *     the first seat): every seat measured at once over one count, a victor
 *     named, and **ties pay nobody**. *Retired* (batch G2).
 *   · a **grant** is a bead a *thing hands over* — the closing technology, the
 *     Magnum Opus, the three great works of the Observatory (Entry LVIII, the
 *     endgame). It is never dealt, never swept and never contested: it has no
 *     deed at all, because the deed is the building or the node that names it,
 *     and it is **once per empire** rather than once in the world. That last
 *     word is the whole reason it is a fifth class and not a feat with an odd
 *     scope — a feat is a *first* in the world and this is a *reward*, and the
 *     day the two shared a shape the closer's bead would have gone to whoever
 *     finished the chart first and to nobody else.
 *
 * Why a deed is data and not a predicate
 * --------------------------------------
 * Three shapes cover every deed this build can judge — an **occasion** (a seam
 * announced it), a **count** (a standing fact about the board, swept once a
 * turn), and a **streak** (a count held for N consecutive turns). A deed the
 * state cannot answer is not bent into a shape that nearly fits: it is left out
 * of the table and named in `docs/beads.md`, which is the Statecraft rule read
 * a fourth time.
 *
 * `dormant` is the other half of that discipline, and it is *narrower* than
 * "deferred": a dormant row is complete and correct and simply cannot be
 * reached in this build — the Engine has no node in the tree, a cathedral has
 * no technology (`BuildingDef.awaitsTech`). A dormant card is **never dealt and
 * never awarded**, which is what keeps a dead card out of a hand a player has
 * to look at. `beadDataProblems` derives it for an endeavour whose prerequisite
 * names a building that is itself waiting on a technology, so the marker is a
 * fact about the data rather than a flag somebody has to remember to set.
 */

import beadsJson from '../../data/beads.json';

// Type-only in both directions with `statecraftData.ts`, exactly as
// `religionData.ts` is: a boon's `effects` are ordinary card effects read by the
// ordinary evaluator, and a *value* import either way would turn a type cycle
// into a runtime one.
import { OCCASIONS, type Occasion } from './occasions';
import type { CardEffect } from './statecraftData';
import { type BuildingId, isBuildingId, buildingDef } from './buildingData';
import { type Family, isFamily } from './greatPeopleData';
// No generator here since batch Q1: the one draw this file made was the age's
// four reckonings, and there is no deal left to roll for.

/**
 * The four families a bead may belong to (Entry VI.5). Domination, culture,
 * science, economic — spelled out rather than lettered, because every surface
 * that prints one prints a word.
 */
export type BeadFamily = 'domination' | 'culture' | 'science' | 'economic';

export const BEAD_FAMILIES: readonly BeadFamily[] = [
  'domination',
  'culture',
  'science',
  'economic',
];

export function isBeadFamily(value: unknown): value is BeadFamily {
  return (
    value === 'domination' || value === 'culture' || value === 'science' || value === 'economic'
  );
}

/** Which class of row a bead came off. Carried on the earned record. */
export type BeadKind = 'feat' | 'endeavour' | 'quest' | 'reckoning' | 'grant';

/**
 * The ages that hold a deck.
 *
 * `docs/beads.md` writes the two decks as Æra **III** (Empire) and Æra **IV**
 * (Cathedrals), and since the tree pass of 2026-08-30 those are the tree's own
 * ages **3** and **4** — so the keys and the doc's numerals finally say the same
 * thing. They were 2 and 3 until that pass, which is exactly what the note here
 * promised would happen ("the tree pass renumbers these with the ages"); the
 * paragraph explaining the mismatch is deleted rather than reworded, because
 * there is no longer a mismatch to explain.
 *
 * A reckoning is taken at the **next** age's opening, so deck 3's reckonings are
 * taken at the 3→4 opening and deck 4's at the 4→5 opening — which is the first
 * thing Æra V will switch on, and the reason the fifth age is not in
 * `TECH_AGES` until it has nodes.
 *
 * Æra I and II hold no cards: they have feats only.
 */
export type BeadAge = 3 | 4;

export const BEAD_DECK_AGES: readonly BeadAge[] = [3, 4];

export function isBeadAge(value: unknown): value is BeadAge {
  return value === 3 || value === 4;
}

// --- what a deed can ask ----------------------------------------------------

/**
 * A moment a seam announces — **`Occasion`, whole** (`occasions.ts`).
 *
 * It was its own thirteen-word union until batch H6, and ten of those thirteen
 * were `TriumphOccasion`'s own words typed a second time. The two lists were
 * kept in step by nothing but the fact that `awardOccasion` hands its argument
 * straight to `awardBeadOccasion`; a moment added to one and not the other would
 * have compiled and announced nothing.
 *
 * So the union moved to a leaf both systems read, and this is an alias rather
 * than a deletion because the *name* is worth keeping: a deed's field is a bead
 * occasion, and a reader following `BeadDeed.occasion` should land on a word
 * about beads. What it no longer is, is a second list. The Triumph side takes
 * the intersection with its own trigger vocabulary instead (see `occasions.ts`,
 * which states which of the four "occasion" unions merged and which did not).
 */
export type BeadOccasion = Occasion;

/** Every occasion a deed may name — the shared register. */
export const BEAD_OCCASIONS: readonly BeadOccasion[] = OCCASIONS;

/**
 * Every standing count a deed, a reckoning or a streak may name — **the
 * register the evaluator's one switch answers**.
 *
 * Each is a plain read of the board or of a turn-stamped counter on the player,
 * asked of one empire and answered as a number. A count that needed history the
 * game does not keep (three technologies in five turns, a route's cumulative
 * yield) is not here and is named in `docs/beads.md` instead.
 */
export type BeadCount =
  /** Cities held. */
  | 'cities'
  /** Cities of six citizens or more. */
  | 'citiesOfSixOrMore'
  /** Cities this empire founded itself. `Player.citiesFounded`. */
  | 'citiesFounded'
  /** Cities this empire took by force. `Player.citiesCaptured`. */
  | 'citiesCaptured'
  /** Cities joined to the capital by road. */
  | 'citiesConnectedToCapital'
  /** The population of this empire's largest city. */
  | 'largestCity'
  /** Wonders standing in this empire's cities. */
  | 'wondersHeld'
  /** Wonders of the age the *world* stands in, standing in this empire's cities. */
  | 'wondersOfWorldAgeHeld'
  /** Technologies of the world's age this empire has completed. */
  | 'techsOfWorldAgeCompleted'
  /** How many whole ages this empire stands ahead of the world's most backward seat. */
  | 'agesAheadOfLowestSeat'
  /** Cities holding both a library and a university. */
  | 'libraryAndUniversityCities'
  /** Cities of ten citizens or more holding an aqueduct. */
  | 'aqueductCitiesOfTen'
  /** Hexes bought outright. `Player.tilesPurchased`. */
  | 'tilesPurchased'
  /** Citizens abroad following a religion whose holy city this empire holds. */
  | 'foreignFollowers'
  /** Is a religion of this empire's, enhanced, followed in a rival's capital? 0 or 1. */
  | 'enhancedFaithInForeignCapital'
  /** Faith spent on augurs and prophets. `Player.faithOnHolyOrders`. */
  | 'faithOnHolyOrders'
  /** Gold gathered from the Tithes project. `Player.tithesGold`. */
  | 'tithesGold'
  /** Science gathered from the Scholarship project. `Player.scholarshipScience`. */
  | 'scholarshipScience'
  /** Route yields carried during the current age. `Player.routeYieldsThisAge`. */
  | 'routeYieldsThisAge'
  /** Great people called during the current age. `Player.greatPeopleThisAge`. */
  | 'greatPeopleThisAge'
  /** Legacies held that have not been struck from the record. */
  | 'unrevokedLegacies'
  /** The largest set of mutually adjacent great works this empire has planted. */
  | 'adjacentGreatWorks'
  /** The most great-work families planted inside one city's ground. */
  | 'greatWorkFamiliesInOneCity'
  /** Combat units on the board. */
  | 'combatUnits'
  /** The sum of every unit's roster strength. */
  | 'unitStrength'
  /** How many of this empire's Orders are sitting in a slot. */
  | 'slottedOrders'
  /** The food this empire's best-fed city produces in a turn. */
  | 'bestCityFood'
  /** The production this empire's busiest city produces in a turn. */
  | 'bestCityProduction'
  /**
   * *Dormant.* The Engine, which has no row in the tree. Always zero, so the
   * feat that names it can never be awarded — see `dormant`, and see
   * `docs/beads.md` for what it waits on.
   */
  | 'engineCompleted';

export const BEAD_COUNTS: readonly BeadCount[] = [
  'cities',
  'citiesOfSixOrMore',
  'citiesFounded',
  'citiesCaptured',
  'citiesConnectedToCapital',
  'largestCity',
  'wondersHeld',
  'wondersOfWorldAgeHeld',
  'techsOfWorldAgeCompleted',
  'agesAheadOfLowestSeat',
  'libraryAndUniversityCities',
  'aqueductCitiesOfTen',
  'tilesPurchased',
  'foreignFollowers',
  'enhancedFaithInForeignCapital',
  'faithOnHolyOrders',
  'tithesGold',
  'scholarshipScience',
  'routeYieldsThisAge',
  'greatPeopleThisAge',
  'unrevokedLegacies',
  'adjacentGreatWorks',
  'greatWorkFamiliesInOneCity',
  'combatUnits',
  'unitStrength',
  'slottedOrders',
  'bestCityFood',
  'bestCityProduction',
  'engineCompleted',
];

/**
 * How a deed is judged. Three shapes, and the split *is* how they are
 * evaluated:
 *
 *   · **occasion** — announced at a seam, first seat in the world takes it.
 *     `family` narrows a great-person recruitment to one family, which is how
 *     "the first artist" is four data rows rather than a fifth scope.
 *   · **count** — a standing fact, swept once a turn in the `beads` phase. A
 *     sweep cannot miss a threshold crossed and uncrossed inside one turn,
 *     which is `awardCountTriumphs`' argument one system over.
 *   · **streak** — the same count held at or above `value` for `turns`
 *     consecutive turns. The run lives in `GameState.beads.streaks` and is
 *     reset to zero the first turn the count falls short, so "together" means
 *     together.
 */
export type BeadDeed =
  | { shape: 'occasion'; occasion: BeadOccasion; family?: Family }
  | { shape: 'count'; count: BeadCount; value: number }
  | { shape: 'streak'; count: BeadCount; value: number; turns: number };

// --- what a bead pays -------------------------------------------------------

/**
 * The bank a windfall boon pays into.
 *
 * `population` is in the list on purpose and is not a yield at all: a bead that
 * hands a town a citizen settles through `settlePopulationWindfall` — Entry
 * XVIII's tenth register entry, the one windfall that fills no basket — and
 * putting it here rather than inventing a second grant shape is what keeps
 * every one-time payment on one seam. `renown` is the fifth bucket's, through
 * `settleRenownWindfall`.
 */
export type BeadWindfallYield =
  | 'food'
  | 'production'
  | 'gold'
  | 'science'
  | 'culture'
  | 'faith'
  | 'renown'
  | 'population';

/** Which town a windfall lands in. `every` is once per city of the empire. */
export type BeadWindfallWhere = 'capital' | 'nearest' | 'every';

export interface BeadWindfall {
  yield: BeadWindfallYield;
  amount: number;
  where: BeadWindfallWhere;
}

/**
 * A piece handed over outright. Every arm realises through a path that already
 * exists — `realiseItem(…, { free: true })` for a unit, the prophet and
 * great-person seams for the other three — because a fifth way to put a piece
 * on the board is a fifth place `Unit.freeUpkeep` can be forgotten.
 */
export type BeadGrant =
  | { unit: string }
  | { greatPerson: Family | 'choice' }
  | { prophet: true }
  | { settler: true };

/**
 * What a bead pays, in one vocabulary.
 *
 * Every field is optional and a row may carry several: The Apostle pays a
 * windfall *and* a step of contentment. `effects` is the **cap** form — a permanent step
 * in authority capacity, happiness or route capacity — and it is read by
 * `liveEffects` as its **eighth source**, so a cap a bead granted is an ordinary
 * card effect in every ledger it reaches and `statecraft.ts` stays the one
 * module that switches on a `CardEffect.kind`.
 *
 * There is deliberately no "standing rate" form. Entry VI's boons are one-time
 * or they are caps; a bead that paid two gold a turn for ever would be a
 * building nobody built.
 */
export interface BeadBoon {
  windfall?: BeadWindfall;
  grant?: BeadGrant;
  /** Permanent card effects — the caps. Read by `liveEffects`' eighth source. */
  effects?: CardEffect[];
}

// --- the rows ---------------------------------------------------------------

/** What every bead row carries, whatever class it is. */
interface BeadDefBase {
  name: string;
  family: BeadFamily;
  /** What the card asks, in a first-time player's words. Hard rule 7. */
  text: string;
  /** Why part of this row is not built. Printed on the card, in italics. */
  deferred?: string[];
  /**
   * Why this row cannot be reached in this build, or absent for a live one.
   *
   * A dormant row is **never dealt and never awarded**. It is in the table so
   * the Compendium can print it greyed, exactly as a deferred Triumph is.
   */
  dormant?: string;
  /**
   * **Withdrawn by design** — the row is not waiting on anything, it has been
   * replaced (`BuildingDef.retired`'s own word, and `OrderDef.retired`'s).
   *
   * `dormant` says *not yet*; this says *no longer*, and the difference is worth
   * a field because the two read differently on a card and the Compendium wants
   * to say which. Both leave every pool and neither can ever be awarded.
   *
   * The eight **reckonings** carry it since batch G2 (`docs/wager.md` §5): the
   * wager is the age's snapshot now, taken for everybody rather than paying the
   * leader alone. Their bodies stay for saves and for the Compendium's record.
   *
   * Since batch Q1 the **feats, endeavours and quests** carry it too, and so do
   * the four **grants the Æra V bead Orders mint** — the cards that minted them
   * are retired the same turn, so a row nothing can name is a row nothing should
   * offer. That is every deed the game had: what is left live is the five beads a
   * thing hands over and the four a wager pays.
   */
  retired?: boolean;
}

/** A first in the world, always in play. */
export interface BeadFeatDef extends BeadDefBase {
  /** `game` is once ever; `age` is once in each age of the world's clock. */
  once: 'game' | 'age';
  trigger: BeadDeed;
}

/** What an endeavour asks of the empire before its row may be queued at all. */
export type BeadPrerequisite =
  /** Some city of this empire holds at least `value` citizens. */
  | { test: 'citySize'; value: number }
  /** Every city of this empire holds this building. An empire with none fails. */
  | { test: 'buildingInEveryCity'; building: BuildingId }
  /** At least `cities` cities hold this building. */
  | { test: 'buildingsInCities'; building: BuildingId; cities: number }
  /** At least `value` caravans are carrying a route. */
  | { test: 'activeRoutes'; value: number }
  /** At least `value` cities held. */
  | { test: 'cities'; value: number }
  /** At least `value` wonders standing in this empire's cities. */
  | { test: 'wondersHeld'; value: number };

/** A race project. See `ProjectDef`, which carries the queue's half of it. */
export interface BeadEndeavourDef extends BeadDefBase {
  age: BeadAge;
  /** Hammers, once. A finishing project — it leaves the queue. */
  cost: number;
  prerequisite: BeadPrerequisite;
  boon: BeadBoon;
  /** One line in the voice of the tech tree's aphorisms. Never a rule. */
  flavor: string;
}

/** A deed dealt from an age's deck. */
export interface BeadQuestDef extends BeadDefBase {
  age: BeadAge;
  /** Which system it plays into, for the card's eyebrow. Prose, never a rule. */
  system: string;
  deed: BeadDeed;
  boon: BeadBoon;
}

/** The age's snapshot. One count, every seat at once, ties pay nobody. */
export interface BeadReckoningDef extends BeadDefBase {
  count: BeadCount;
}

/**
 * A bead a thing hands over. See the module docblock's fifth class.
 *
 * It carries **no deed and no boon**, and both absences are the design. There is
 * no deed because the deed is whatever names it — a `CompletionGrant` on a
 * building row, `TechDef.paysBead` on a node — so a row here that could be swept
 * would be a second way to earn the same bead. There is no boon because the bead
 * *is* the payment: the thing that hands it over has already cost an empire a
 * thousand hammers or the last node of the chart, and a windfall on top of that
 * would be paying twice for one deed.
 *
 * `source` is the one field it adds, and it is prose for the surfaces: a card
 * with no deed to print needs a sentence saying where the bead comes from.
 */
export interface BeadGrantDef extends BeadDefBase {
  /** Where the bead comes from, in a first-time player's words. Hard rule 7. */
  source: string;
  /**
   * **Minted every time the thing that names it happens**, instead of once per
   * empire.
   *
   * The class's own rule is once — a wonder is raised once and the last node of
   * the chart is finished once, so `beadGrantedTo` refusing a second copy is
   * simply the truth about those rows. The four Æra V bead Orders are not like
   * that: what names them is a *deed the empire chooses to repeat* — a city
   * burnt, a draft turned down, a proclamation read, a node of the last age
   * finished — and each is meant to be counted every time (`docs/beads.md`, the
   * bead Orders). So the flag is on the **row** rather than a branch in
   * `awardBead`, and everything else about a repeatable grant is unchanged: it
   * is announced, it goes on the world's register, and it is diffed onto the
   * rod by exactly the machinery every other bead uses.
   *
   * What it gives up is the once-per-empire key, and nothing else. A row that
   * did not come from a standing card should never carry it.
   */
  repeatable?: boolean;
}

export type BeadFeatId = keyof typeof beadsJson.feats & string;
export type BeadEndeavourId = keyof typeof beadsJson.endeavours & string;
export type BeadQuestId = keyof typeof beadsJson.quests & string;
export type BeadReckoningId = keyof typeof beadsJson.reckonings & string;
export type BeadGrantId = keyof typeof beadsJson.grants & string;

/** Every id in the catalogue, across all five classes. */
export type BeadCardId =
  | BeadFeatId
  | BeadEndeavourId
  | BeadQuestId
  | BeadReckoningId
  | BeadGrantId;

export interface BeadRules {
  /**
   * Beads that **open the Magnum Opus**. Entry VI's pacing knob, re-aimed by the
   * ruling of 2026-09-04 (schema 64) and re-cut by batch Q1 (schema 108).
   *
   * It named the seat that won outright until then, and that reading never once
   * decided a game — the Opus always closed the age first. So the rod stays a
   * rod; what changed is what a full one *buys*: the right to begin the great
   * work (`buildError`, `tech.ts`). The game is won by that work being
   * **finished**, by whoever finished it (`closeTheGreatWork`, schema 69) — the
   * rod is a door and never a tally.
   *
   * **The figure is cut for a world with no deeds in it.** It was 20 when a
   * seat could clack a bead for a first in the world, a quest off the table and
   * an age's reckoning; with the deeds retired (batch Q1) a bead comes from a
   * wager kept or from a grant, and the bench says what that is worth: two
   * balanced bot seats plus the wild, standard map, seeds 11 and 4242, played
   * 240 turns into Æra IV — the top seat's rod held **13** and **10**. Two-thirds
   * of the pair's mean, floored, is the door, and never below four: **7**. The
   * measurement and the arithmetic are `docs/wager.md` §5.
   *
   * ▢ the user's own figure comes with the balance pass; this is the bench's.
   */
  threshold: number;
}

export interface BeadData {
  rules: BeadRules;
  feats: Record<BeadFeatId, BeadFeatDef>;
  endeavours: Record<BeadEndeavourId, BeadEndeavourDef>;
  quests: Record<BeadQuestId, BeadQuestDef>;
  reckonings: Record<BeadReckoningId, BeadReckoningDef>;
  grants: Record<BeadGrantId, BeadGrantDef>;
}

export const BEAD_DATA = beadsJson as unknown as BeadData;

export const BEAD_RULES: BeadRules = BEAD_DATA.rules;

/** Every id in **file order** — the order every sweep and every deal walks. */
export const BEAD_FEAT_IDS = Object.keys(BEAD_DATA.feats) as BeadFeatId[];
export const BEAD_ENDEAVOUR_IDS = Object.keys(BEAD_DATA.endeavours) as BeadEndeavourId[];
export const BEAD_QUEST_IDS = Object.keys(BEAD_DATA.quests) as BeadQuestId[];
export const BEAD_RECKONING_IDS = Object.keys(BEAD_DATA.reckonings) as BeadReckoningId[];
export const BEAD_GRANT_IDS = Object.keys(BEAD_DATA.grants) as BeadGrantId[];

export function isBeadFeatId(value: unknown): value is BeadFeatId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BEAD_DATA.feats, value);
}
export function isBeadEndeavourId(value: unknown): value is BeadEndeavourId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BEAD_DATA.endeavours, value);
}
export function isBeadQuestId(value: unknown): value is BeadQuestId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BEAD_DATA.quests, value);
}
export function isBeadReckoningId(value: unknown): value is BeadReckoningId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BEAD_DATA.reckonings, value);
}
export function isBeadGrantId(value: unknown): value is BeadGrantId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BEAD_DATA.grants, value);
}
export function isBeadCardId(value: unknown): value is BeadCardId {
  return (
    isBeadFeatId(value) ||
    isBeadEndeavourId(value) ||
    isBeadQuestId(value) ||
    isBeadReckoningId(value) ||
    isBeadGrantId(value)
  );
}

export function beadFeatDef(id: BeadFeatId): BeadFeatDef {
  return BEAD_DATA.feats[id];
}
export function beadEndeavourDef(id: BeadEndeavourId): BeadEndeavourDef {
  return BEAD_DATA.endeavours[id];
}
export function beadQuestDef(id: BeadQuestId): BeadQuestDef {
  return BEAD_DATA.quests[id];
}
export function beadReckoningDef(id: BeadReckoningId): BeadReckoningDef {
  return BEAD_DATA.reckonings[id];
}
export function beadGrantDef(id: BeadGrantId): BeadGrantDef {
  return BEAD_DATA.grants[id];
}

/**
 * What class of row this id names, and its definition — **the one lookup across
 * all four classes**, `anyCardDef`'s shape one catalogue over.
 *
 * Every consumer that only wants a name, a family or a dormancy asks this
 * rather than four guards in a row.
 */
export function anyBeadDef(
  id: BeadCardId,
): {
  kind: BeadKind;
  def: BeadFeatDef | BeadEndeavourDef | BeadQuestDef | BeadReckoningDef | BeadGrantDef;
} {
  if (isBeadFeatId(id)) return { kind: 'feat', def: beadFeatDef(id) };
  if (isBeadEndeavourId(id)) return { kind: 'endeavour', def: beadEndeavourDef(id) };
  if (isBeadQuestId(id)) return { kind: 'quest', def: beadQuestDef(id) };
  if (isBeadReckoningId(id)) return { kind: 'reckoning', def: beadReckoningDef(id) };
  if (isBeadGrantId(id)) return { kind: 'grant', def: beadGrantDef(id) };
  throw new Error(`Unknown bead "${String(id)}"`);
}

/**
 * Is this row unreachable in this build?
 *
 * Two sources, and only one of them is written down. A row may say so on its
 * own (`dormant`, the Engine); an **endeavour** may also be dormant *derived* —
 * its prerequisite names a building no empire can raise, either because the row
 * is waiting on a technology (`BuildingDef.awaitsTech`) or because it has been
 * withdrawn (`BuildingDef.retired`, the fewer-things cut). Deriving that rather
 * than flagging it is what makes deleting `awaitsTech` from a building row the
 * whole of shipping the endeavour that wanted it — and what makes a deed left
 * pointing at a cut row a race nobody is dealt rather than a race nobody can
 * finish.
 */
export function beadIsDormant(id: BeadCardId): boolean {
  const { kind, def } = anyBeadDef(id);
  if (def.dormant !== undefined) return true;
  // **Withdrawn is unreachable too**, and it goes through this one predicate
  // rather than growing a second guard at every seam: `awardBead` refuses it,
  // `clearSpentCards` never has to sweep it, and the deal never turns it over.
  if (def.retired === true) return true;
  if (kind !== 'endeavour') return false;
  return prerequisiteUnreachable((def as BeadEndeavourDef).prerequisite);
}

/** The building a prerequisite names, or `null`. Read by the dormancy rule. */
export function prerequisiteBuilding(prerequisite: BeadPrerequisite): BuildingId | null {
  if (prerequisite.test === 'buildingInEveryCity') return prerequisite.building;
  if (prerequisite.test === 'buildingsInCities') return prerequisite.building;
  return null;
}

function prerequisiteUnreachable(prerequisite: BeadPrerequisite): boolean {
  const building = prerequisiteBuilding(prerequisite);
  if (building === null) return false;
  const def = buildingDef(building);
  return def.awaitsTech === true || def.retired === true;
}

/*
 * `beadDeckFor`, `reckoningsOfFamily`, `drawAgeReckonings` and `beadHandSize`
 * stood here and are **gone** (batch Q1, `docs/wager.md` §5).
 *
 * They were the deal: which cards an age's deck held, which four reckonings were
 * drawn into it at `newGame`, and how many slots the table showed at once. With
 * the feats, endeavours and quests retired there is no deck to order and no hand
 * to fill, so the four are deleted outright rather than left answering nothing —
 * the state they fed (`BeadTable.decks`, `BeadTable.hands`) went with them.
 *
 * G2 kept `drawAgeReckonings`' wasted roll so that retiring the reckonings would
 * not re-seed the world. That bargain is **off** here and deliberately: three
 * whole decks leaving means the shuffle that consumed the generator is gone
 * whatever this file does, so a v106 log does not replay and the schema says so
 * (107). Paying a roll to preserve a stream that has already moved would buy
 * nothing.
 */

// --- the lint ---------------------------------------------------------------

/**
 * Every way `data/beads.json` can be wrong, as human-readable lines. Empty means
 * consistent.
 *
 * `discoveryDataProblems`' sibling, and here for its reason: a card that can
 * never be dealt, a prerequisite naming a building that does not exist, or a
 * boon that pays nothing is a data mistake that would otherwise surface as a
 * dead card in somebody's hand forty turns into a game.
 */
export function beadDataProblems(): string[] {
  const problems: string[] = [];
  const { threshold } = BEAD_RULES;

  if (!(threshold > 0)) problems.push(`threshold is ${String(threshold)}; nobody could ever win`);

  const seen = new Set<string>();
  const checkBase = (id: string, def: BeadDefBase, where: string): void => {
    if (seen.has(id)) problems.push(`${where}: "${id}" is an id two rows share`);
    seen.add(id);
    if (typeof def.name !== 'string' || def.name.length === 0) {
      problems.push(`${where}: "${id}" has no name`);
    }
    if (typeof def.text !== 'string' || def.text.length === 0) {
      problems.push(`${where}: "${id}" says nothing about what it asks`);
    }
    if (!isBeadFamily(def.family)) {
      problems.push(`${where}: "${id}" names unknown family "${String(def.family)}"`);
    }
  };

  const checkDeed = (id: string, deed: BeadDeed, where: string): void => {
    if (deed.shape === 'occasion') {
      if (!BEAD_OCCASIONS.includes(deed.occasion)) {
        problems.push(`${where}: "${id}" names unknown occasion "${String(deed.occasion)}"`);
      }
      if (deed.family !== undefined && !isFamily(deed.family)) {
        problems.push(`${where}: "${id}" names unknown great-person family`);
      }
      return;
    }
    if (!BEAD_COUNTS.includes(deed.count)) {
      problems.push(`${where}: "${id}" names unknown count "${String(deed.count)}"`);
    }
    if (!(deed.value > 0)) {
      problems.push(`${where}: "${id}" asks for ${String(deed.value)}, which is nothing`);
    }
    if (deed.shape === 'streak' && !(deed.turns > 0)) {
      problems.push(`${where}: "${id}" asks for a run of ${String(deed.turns)} turns`);
    }
  };

  const checkBoon = (id: string, def: BeadDefBase, boon: BeadBoon, where: string): void => {
    const pays =
      boon.windfall !== undefined ||
      boon.grant !== undefined ||
      (boon.effects?.length ?? 0) > 0;
    // **A row that pays nothing must say so on its own face.** Seven quests paid
    // a die of the Magister and nothing else, and the dice went with schema 71
    // (`docs/history/fewer-things.md` §1) — so those rows now carry a `deferred` line
    // instead, which is this codebase's standing answer for a card promising
    // something the vocabulary cannot yet pay. A silent empty boon stays a data
    // mistake; an annotated one is a debt in the open.
    if (!pays && (def.deferred?.length ?? 0) === 0) {
      problems.push(`${where}: "${id}" pays nothing at all`);
    }
    const windfall = boon.windfall;
    if (windfall !== undefined && !(windfall.amount > 0)) {
      problems.push(`${where}: "${id}" pays a windfall of ${String(windfall.amount)}`);
    }
    const grant = boon.grant;
    if (grant !== undefined && 'greatPerson' in grant) {
      if (grant.greatPerson !== 'choice' && !isFamily(grant.greatPerson)) {
        problems.push(`${where}: "${id}" grants an unknown great-person family`);
      }
    }
  };

  for (const id of BEAD_FEAT_IDS) {
    const def = beadFeatDef(id);
    checkBase(id, def, 'feats');
    if (def.once !== 'game' && def.once !== 'age') {
      problems.push(`feats: "${id}" names unknown scope "${String(def.once)}"`);
    }
    checkDeed(id, def.trigger, 'feats');
  }

  for (const id of BEAD_ENDEAVOUR_IDS) {
    const def = beadEndeavourDef(id);
    checkBase(id, def, 'endeavours');
    if (!isBeadAge(def.age)) problems.push(`endeavours: "${id}" is dealt in no deck`);
    if (!(def.cost > 0)) problems.push(`endeavours: "${id}" costs nothing to finish`);
    if (typeof def.flavor !== 'string' || def.flavor.length === 0) {
      problems.push(`endeavours: "${id}" has no flavour line`);
    }
    checkBoon(id, def, def.boon, 'endeavours');
    const building = prerequisiteBuilding(def.prerequisite);
    if (building !== null && !isBuildingId(building)) {
      problems.push(`endeavours: "${id}" wants "${String(building)}", which is not a building`);
    }
  }

  for (const id of BEAD_QUEST_IDS) {
    const def = beadQuestDef(id);
    checkBase(id, def, 'quests');
    if (!isBeadAge(def.age)) problems.push(`quests: "${id}" is dealt in no deck`);
    checkDeed(id, def.deed, 'quests');
    checkBoon(id, def, def.boon, 'quests');
  }

  for (const id of BEAD_RECKONING_IDS) {
    const def = beadReckoningDef(id);
    checkBase(id, def, 'reckonings');
    if (!BEAD_COUNTS.includes(def.count)) {
      problems.push(`reckonings: "${id}" names unknown count "${String(def.count)}"`);
    }
  }

  // A grant has no deed and no boon to check; what it *must* have is the
  // sentence saying where it comes from, because it is the one class of card
  // whose face cannot print a deed.
  for (const id of BEAD_GRANT_IDS) {
    const def = beadGrantDef(id);
    checkBase(id, def, 'grants');
    if (typeof def.source !== 'string' || def.source.length === 0) {
      problems.push(`grants: "${id}" does not say what hands it over`);
    }
  }

  // **A live grant is the only thing left to check for**, and it is checked the
  // way the decks used to be: a catalogue with nothing in it that can still be
  // earned is a rod nobody could ever fill.
  //
  // The two checks that stood here are retired with what they measured. The
  // deck check went with the decks (batch Q1) and the reckonings' family check
  // went with the reckonings (batch G2) — a lint that asked whether an age's
  // deck held a live card would now fail the build on the ruling itself. What
  // replaced both is the wager, measured by `wagerDataProblems`
  // (`wagerData.ts`), including the check the second one was: that every
  // wagering age has enough *lines* to deal three different ones from.
  if (BEAD_GRANT_IDS.every((id) => beadIsDormant(id))) {
    problems.push('no live bead is left for anything to hand over');
  }
  return problems;
}
