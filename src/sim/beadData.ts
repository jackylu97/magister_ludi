/**
 * Typed access to `data/beads.json` — the Bead Race's catalogue (`docs/beads.md`,
 * design ledger Entry VI).
 *
 * A **bead** is the game's one currency of victory: glass counters across four
 * families, ~30 in a finished game, every one an announced event, and the first
 * empire to `rules.threshold` of them wins. This file only *types* the
 * catalogue; `beads.ts` is the evaluator and owns the only `switch` on a deed,
 * a count or a boon shape — the same bargain `triumphs.ts` makes for a trigger
 * kind and `statecraft.ts` for a `CardEffect.kind`, made once more, and it buys
 * the same thing: **a new bead is a JSON row**.
 *
 * Four classes of row, and what separates them
 * --------------------------------------------
 *   · a **feat** is a first in the world, always in play, never dealt. It is
 *     contested — the register settles it — and it is scoped `game` or `age`.
 *   · an **endeavour** is a *race project*: a queue row every empire may build
 *     while the card is face up and its prerequisite is met, and the first
 *     empire to finish takes the bead and the boon. Nobody else gets either.
 *   · a **quest** is a deed, dealt from an age's deck, taken by the first seat
 *     that does it.
 *   · a **reckoning** is the age's snapshot, taken the moment the first seat
 *     enters the next age: every seat measured at once over one count, a victor
 *     named, and **ties pay nobody**.
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
import type { CardEffect } from './statecraftData';
import { type BuildingId, isBuildingId, buildingDef } from './buildingData';
import { type Family, isFamily } from './greatPeopleData';
// `rng.ts` is a pure leaf with no imports of its own, so the draw rule can live
// beside the table it draws from rather than in whichever module holds a seed.
import { type Rng, nextInt } from './rng';

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
export type BeadKind = 'feat' | 'endeavour' | 'quest' | 'reckoning';

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
 * A moment a seam announces. Ten of these are `TriumphOccasion`'s own — the
 * bead evaluator is hung off `awardOccasion`, so a seam that already says "a
 * wonder was finished" says it once for both systems — and the rest are hooked
 * where the Triumph table has nothing to say (a religion founded, a palace
 * taken, a great person called).
 *
 * Deliberately **not** an alias of `TriumphOccasion`: the two vocabularies
 * overlap because the same things happen in the world, not because one is the
 * other, and a bead occasion the Triumph table never wanted would otherwise
 * have to be added to the Triumph trigger union to exist at all.
 */
export type BeadOccasion =
  | 'ageEntered'
  | 'wonderCompleted'
  | 'cityFounded'
  | 'cityCaptured'
  | 'governmentAdopted'
  | 'beliefConsecrated'
  | 'discoveryClaimed'
  | 'campCleared'
  | 'battleWonAgainstStronger'
  | 'cityOnOtherContinent'
  /** A religion was founded. Hooked at `foundReligion`. */
  | 'religionFounded'
  /** A rival's seat of government changed hands. Hooked at `captureCity`. */
  | 'capitalCaptured'
  /** A great person was called. Hooked at `settleGreatPersonChoice`. */
  | 'greatPersonRecruited';

export const BEAD_OCCASIONS: readonly BeadOccasion[] = [
  'ageEntered',
  'wonderCompleted',
  'cityFounded',
  'cityCaptured',
  'governmentAdopted',
  'beliefConsecrated',
  'discoveryClaimed',
  'campCleared',
  'battleWonAgainstStronger',
  'cityOnOtherContinent',
  'religionFounded',
  'capitalCaptured',
  'greatPersonRecruited',
];

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
  /** The combined levels of every Order in a slot. */
  | 'slottedOrderLevels'
  /** The level of the deepest Order in a slot. */
  | 'deepestSlottedOrder'
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
  'slottedOrderLevels',
  'deepestSlottedOrder',
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
 * Every field is optional and a row may carry several: The Apostle pays a die
 * *and* a step of contentment. `effects` is the **cap** form — a permanent step
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
  /** Magister's Dice. Uncapped (user ruling, 2026-08-30). Nothing spends them yet. */
  dice?: number;
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

export type BeadFeatId = keyof typeof beadsJson.feats & string;
export type BeadEndeavourId = keyof typeof beadsJson.endeavours & string;
export type BeadQuestId = keyof typeof beadsJson.quests & string;
export type BeadReckoningId = keyof typeof beadsJson.reckonings & string;

/** Every id in the catalogue, across all four classes. */
export type BeadCardId = BeadFeatId | BeadEndeavourId | BeadQuestId | BeadReckoningId;

export interface BeadRules {
  /** Beads that win the game. Entry VI's pacing knob. */
  threshold: number;
  /** Dice every real seat starts the game with (user, 2026-08-30). The wild gets none. */
  startingDice: number;
  /**
   * How many cards an age's hand holds **face up at once**, by built age.
   *
   * A hand is a set of **open slots**, not a one-time deal (the ruling of
   * 2026-08-30). A card that is claimed — an endeavour finished, a quest taken —
   * leaves the table, and the deck deals into the freed slot on the next tick,
   * so a twenty-five card deck flows through a four-slot hand over an age rather
   * than stopping at four. A reckoning holds its slot until its age closes,
   * which is exactly when it is taken.
   */
  handSize: Record<string, number>;
  /** Turns between deals. One. */
  dealEveryTurns: number;
}

export interface BeadData {
  rules: BeadRules;
  feats: Record<BeadFeatId, BeadFeatDef>;
  endeavours: Record<BeadEndeavourId, BeadEndeavourDef>;
  quests: Record<BeadQuestId, BeadQuestDef>;
  reckonings: Record<BeadReckoningId, BeadReckoningDef>;
}

export const BEAD_DATA = beadsJson as unknown as BeadData;

export const BEAD_RULES: BeadRules = BEAD_DATA.rules;

/** Every id in **file order** — the order every sweep and every deal walks. */
export const BEAD_FEAT_IDS = Object.keys(BEAD_DATA.feats) as BeadFeatId[];
export const BEAD_ENDEAVOUR_IDS = Object.keys(BEAD_DATA.endeavours) as BeadEndeavourId[];
export const BEAD_QUEST_IDS = Object.keys(BEAD_DATA.quests) as BeadQuestId[];
export const BEAD_RECKONING_IDS = Object.keys(BEAD_DATA.reckonings) as BeadReckoningId[];

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
export function isBeadCardId(value: unknown): value is BeadCardId {
  return (
    isBeadFeatId(value) ||
    isBeadEndeavourId(value) ||
    isBeadQuestId(value) ||
    isBeadReckoningId(value)
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

/**
 * What class of row this id names, and its definition — **the one lookup across
 * all four classes**, `anyCardDef`'s shape one catalogue over.
 *
 * Every consumer that only wants a name, a family or a dormancy asks this
 * rather than four guards in a row.
 */
export function anyBeadDef(
  id: BeadCardId,
): { kind: BeadKind; def: BeadFeatDef | BeadEndeavourDef | BeadQuestDef | BeadReckoningDef } {
  if (isBeadFeatId(id)) return { kind: 'feat', def: beadFeatDef(id) };
  if (isBeadEndeavourId(id)) return { kind: 'endeavour', def: beadEndeavourDef(id) };
  if (isBeadQuestId(id)) return { kind: 'quest', def: beadQuestDef(id) };
  if (isBeadReckoningId(id)) return { kind: 'reckoning', def: beadReckoningDef(id) };
  throw new Error(`Unknown bead "${String(id)}"`);
}

/**
 * Is this row unreachable in this build?
 *
 * Two sources, and only one of them is written down. A row may say so on its
 * own (`dormant`, the Engine); an **endeavour** may also be dormant *derived* —
 * its prerequisite names a building that is itself waiting on a technology
 * (`BuildingDef.awaitsTech`), so no empire could ever meet it. Deriving that
 * rather than flagging it is what makes deleting `awaitsTech` from a building
 * row the whole of shipping the endeavour that wanted it.
 */
export function beadIsDormant(id: BeadCardId): boolean {
  const { kind, def } = anyBeadDef(id);
  if (def.dormant !== undefined) return true;
  if (kind !== 'endeavour') return false;
  return prerequisiteAwaitsTech((def as BeadEndeavourDef).prerequisite);
}

/** The building a prerequisite names, or `null`. Read by the dormancy rule. */
export function prerequisiteBuilding(prerequisite: BeadPrerequisite): BuildingId | null {
  if (prerequisite.test === 'buildingInEveryCity') return prerequisite.building;
  if (prerequisite.test === 'buildingsInCities') return prerequisite.building;
  return null;
}

function prerequisiteAwaitsTech(prerequisite: BeadPrerequisite): boolean {
  const building = prerequisiteBuilding(prerequisite);
  if (building === null) return false;
  return buildingDef(building).awaitsTech === true;
}

/**
 * The **fixed** cards of one age's deck, in file order: its endeavours, then its
 * quests.
 *
 * The reckonings are deliberately not here. Which four an age holds is a *draw*
 * (`drawAgeReckonings`), so it needs a generator and cannot be a pure function
 * of the age — this is the half that is the same in every game, and
 * `newBeadTable` shuffles the two halves together.
 */
export function beadDeckFor(age: BeadAge): BeadCardId[] {
  const deck: BeadCardId[] = [];
  for (const id of BEAD_ENDEAVOUR_IDS) {
    if (beadEndeavourDef(id).age !== age) continue;
    if (beadIsDormant(id)) continue;
    deck.push(id);
  }
  for (const id of BEAD_QUEST_IDS) {
    if (beadQuestDef(id).age !== age) continue;
    if (beadIsDormant(id)) continue;
    deck.push(id);
  }
  return deck;
}

/** The live reckonings of one family, in file order. The pool a draw picks from. */
export function reckoningsOfFamily(family: BeadFamily): BeadReckoningId[] {
  return BEAD_RECKONING_IDS.filter(
    (id) => beadReckoningDef(id).family === family && !beadIsDormant(id),
  );
}

/**
 * The **four** reckonings one age holds — one per family, drawn from the pool of
 * eight (`docs/beads.md`: "one per family per age is *dealt*, so the eight are a
 * pool, not a fixed set").
 *
 * A reckoning is an ordinary card of its age's deck, exactly like a quest: it is
 * shuffled in with the rest, it reaches the table by the ordinary deal, and it
 * turns face up when the age opens. What makes it a reckoning is only *when* it
 * resolves — at the **next** age's opening, across every seat at once.
 *
 * Drawn here rather than when the age opens, for the doctrine every offer
 * generator in the game obeys: a deal rolled later would be a function of when
 * somebody reached an age, and under simultaneous turns two seats reach it in
 * the same window. Rolled once at `newGame`, a seed **is** the deal.
 *
 * Families are walked in `BEAD_FAMILIES` order and each picks one row from its
 * own pool, so the generator is consumed in the same sequence every time. A
 * family with exactly one live row still costs a roll — deliberately, because a
 * draw that skipped the trivial case would change every roll after it the day
 * somebody added a second economic reckoning.
 */
export function drawAgeReckonings(rng: Rng): BeadReckoningId[] {
  const drawn: BeadReckoningId[] = [];
  for (const family of BEAD_FAMILIES) {
    const pool = reckoningsOfFamily(family);
    if (pool.length === 0) continue;
    drawn.push(pool[nextInt(rng, 0, pool.length)]!);
  }
  return drawn;
}

/** How many cards an age's hand holds. */
export function beadHandSize(age: BeadAge): number {
  return Math.max(0, Math.floor(BEAD_RULES.handSize[String(age)] ?? 0));
}

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
  const { threshold, dealEveryTurns } = BEAD_RULES;

  if (!(threshold > 0)) problems.push(`threshold is ${String(threshold)}; nobody could ever win`);
  if (!(dealEveryTurns >= 1)) problems.push('dealEveryTurns is less than one turn');
  for (const age of BEAD_DECK_AGES) {
    if (!(beadHandSize(age) > 0)) problems.push(`age ${age} deals a hand of nothing`);
  }

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

  const checkBoon = (id: string, boon: BeadBoon, where: string): void => {
    const pays =
      (boon.dice ?? 0) > 0 ||
      boon.windfall !== undefined ||
      boon.grant !== undefined ||
      (boon.effects?.length ?? 0) > 0;
    if (!pays) problems.push(`${where}: "${id}" pays nothing at all`);
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
    checkBoon(id, def.boon, 'endeavours');
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
    checkBoon(id, def.boon, 'quests');
  }

  for (const id of BEAD_RECKONING_IDS) {
    const def = beadReckoningDef(id);
    checkBase(id, def, 'reckonings');
    if (!BEAD_COUNTS.includes(def.count)) {
      problems.push(`reckonings: "${id}" names unknown count "${String(def.count)}"`);
    }
  }

  // A deck with nothing live in it would open an age and deal nothing, which is
  // the one failure the per-row checks cannot see.
  for (const age of BEAD_DECK_AGES) {
    if (beadDeckFor(age).length === 0) problems.push(`age ${age}'s deck holds no live card`);
  }
  // And a family with no live reckoning is an age that can only ever deal three:
  // the draw is one row per family, so an empty pool is a rod nobody can score
  // at a reckoning at all.
  for (const family of BEAD_FAMILIES) {
    if (reckoningsOfFamily(family).length === 0) {
      problems.push(`no live reckoning measures the ${family} family`);
    }
  }
  return problems;
}
