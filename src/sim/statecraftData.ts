/**
 * Typed access to `data/statecraft.json` — governments, Doctrines, Orders, and
 * the **effect vocabulary** all three are written in.
 *
 * The sibling of `resourceData.ts` one scale out. That file's claim is that *a
 * new luxury is a JSON row*; this file's claim is the same one for a card, and
 * it is the whole reason the vocabulary below is shaped the way it is: a card is
 * a name, a line of flavour and a **list of effects**, and `statecraft.ts` is the
 * only module in the game that reads one. Nothing anywhere else switches on
 * `effect.kind`.
 *
 * That is deliberately narrower than "cards can do things". A vocabulary where a
 * row could name an arbitrary behaviour is a vocabulary where every row is a
 * special case somewhere in the simulation. So every shape here is **generic**:
 * `combatLine` is not "+3 vs barbarians", it is *a labelled strength line under a
 * stated condition*, and Blooded Spears, Border Wardens, The Shield Wall, Siege
 * Doctrine, The Finisher's Art, Vanguard and The Marshals are seven rows of it.
 * A card whose ratified text needs a one-off is **deferred and annotated**
 * (`deferred` on the row, and `docs/statecraft-cards.md`) rather than bent into a
 * shape that nearly fits — Entry XV.b's rule, and `resourceData.ts`'s precedent.
 *
 * Three classes, one vocabulary
 * -----------------------------
 * A **government** carries a slot spread and a signature; a **Doctrine** is
 * permanent and slotless; an **Order** is slottable and sealed. They differ in
 * how they are *acquired and held* — which is `statecraft.ts`'s business — and
 * not at all in what they can say. One `CardEffect` union serves all three, so
 * the day a signature and an Order want the same clause there is one clause.
 *
 * Levels
 * ------
 * An Order drafted twice is *deepened* rather than duplicated (Entry XV's
 * upgrade slot). A level-2 card's numbers are its printed numbers scaled by
 * `upgradeMultiplier` (1.5), floored per figure — and **advanced by at least one
 * whole point per level**, which is the clause that makes a card printing a
 * single point upgradable at all (`scaleByLevel`, fixed 2026-08-26; a third of
 * the table had been offerable as an upgrade that did nothing). Scaling lives in
 * the evaluator rather than in the data, so a retune is one number and not
 * sixty-five.
 *
 * A card with **no figure at all** is the one thing that rule cannot reach, and
 * it says so on its row: see `CardDefBase.upgradable`.
 */

import statecraftJson from '../../data/statecraft.json';

import type { BuildingCategory, BuildingId, ProductionCategory } from './buildingData';
// Type-only in both directions, exactly as `religionData.ts` is. See `CardId`.
import type { Family, GreatPersonId } from './greatPeopleData';
import type { ImprovementId } from './improvementData';
import type { ModifierStage } from './modifiers';
import type { ProjectId, ProjectPayout } from './projectData';
import type { BeliefId, RiteId } from './religionData';
import type { CityYieldKey, ResourceId, ResourceKind } from './resourceData';
import type { TerrainId } from './terrainData';
import type { ModelClass, UnitCategory } from './unitData';

// --- ids --------------------------------------------------------------------

export type GovernmentId = keyof typeof statecraftJson.governments & string;
export type DoctrineId = keyof typeof statecraftJson.doctrines & string;
export type OrderId = keyof typeof statecraftJson.orders & string;

/**
 * A card of any class, named the way the state stores it.
 *
 * The classes are *pools*, never separate id spaces: a card id is unique across
 * the whole table, which is what lets a breakdown line carry one string and lets
 * one lookup answer for all of them.
 *
 * **Five classes now, and two of them are not Statecraft's** (ledger Entry
 * XXVIII). A pantheon belief and an augur's rite are written in this exact
 * vocabulary and read by this exact evaluator, so they are cards in every sense
 * that matters here; what differs is only how they are acquired and held, which
 * is `religion.ts`'s business. The *lookup* that spans all five lives in
 * `statecraft.ts` (`anyCardDef`) rather than in `cardDef` below, because the
 * import between this file and `religionData.ts` is type-only in both
 * directions and must stay that way — see that file's docblock.
 *
 * **Seven classes since the great people pass**, and the seventh is the one that
 * *walks*: a great person's legacy is a list of effects in this vocabulary
 * (`GreatPersonDef.legacy`), attached to the empire when the person is spent and
 * read by this evaluator through `liveEffects`' sixth source. A person is a card
 * for the same reason a belief is — what differs is only how it is acquired and
 * held, which is `greatPeople.ts`'s business.
 *
 * **Six classes since the wonders framework**, and the sixth is the loosest fit
 * on purpose. A *wonder* is a building row carrying `effects` in this
 * vocabulary (`BuildingDef.effects`), so the thing a live line came from may be
 * a `BuildingId`; widening this union is what lets one lookup, one label and one
 * `describeCard` answer for it, instead of a parallel evaluator for buildings.
 * The union admits every building id rather than only the wonders because
 * "which rows are wonders" is a *flag in the data*, not a type — and an ordinary
 * building that one day carries an effect is then already spoken for. Ids
 * remain unique across the whole table: no building id is a card id, and
 * `test/sim/wonders.test.ts` pins that.
 */
export type CardId =
  | GovernmentId
  | DoctrineId
  | OrderId
  | BeliefId
  | RiteId
  | BuildingId
  | GreatPersonId;

/**
 * Which slot an Order fits, and therefore what a government's spread is counted
 * in.
 *
 * Three rather than Entry XV's four: the ratified table (`docs/statecraft-cards.md`)
 * types every Order M/E/W, and a *diplomatic* slot with no diplomacy to spend it
 * on would be a slot the player can only fill with a wildcard card. It joins the
 * union the day the system it names exists.
 */
export type SlotType = 'military' | 'economic' | 'wildcard';

/** The slot types in the order a spread is printed and a screen lays them out. */
export const SLOT_TYPES: readonly SlotType[] = ['military', 'economic', 'wildcard'];

/**
 * Which pool an Order is drafted from. **Pool power steps per government, not
 * per tier** (Entry XV), so a pool is named after the government that opens it.
 */
export type OrderPool = 'chiefdom' | 'governmentI' | 'governmentII' | 'governmentIII';

/** The pools in ladder order — which is also "which pool retires when". */
export const ORDER_POOLS: readonly OrderPool[] = [
  'chiefdom',
  'governmentI',
  'governmentII',
  'governmentIII',
];

/**
 * The archetype thread a card belongs to, for the screen's grouping and for
 * nothing else. `'none'` is the neutral card, which is most of the good ones.
 */
export type CardLine =
  | 'hunt'
  | 'caravan'
  | 'green'
  | 'forge'
  | 'star'
  | 'procession'
  | 'wayfarers'
  | 'none';

// --- conditions -------------------------------------------------------------

/**
 * Which of an empire's cities an effect lands in. Absent means every one.
 *
 * `resourceData.ts`'s `ResourceCityScope` widened from two words to a *shape*,
 * because Entry XV.b's table asks about population thresholds and held
 * resources, and neither is expressible as a word. One shape, one evaluator
 * (`cityScopeAdmits` in `statecraft.ts`) — a new scope is a member here and an
 * arm there, never a clause in the card that wanted it.
 */
export type CityScope =
  /** The town is on the coast. `isCoastalCity`. */
  | { test: 'coastal' }
  /** The town's own tile has fresh water — a river edge or a lake beside it. */
  | { test: 'freshwater' }
  /** Its negation, which River Kings needs as its own line rather than as a sign. */
  | { test: 'notFreshwater' }
  /** A mountain stands within one hex of the town. */
  | { test: 'mountainAdjacent' }
  /** Some tile within `radius` (default 3) belongs to another civilization. */
  | { test: 'frontier'; radius?: number }
  /** The town was taken by force, ever (`City.captured`). */
  | { test: 'captured' }
  /** The town is this empire's capital (`capitalCityOf`). */
  | { test: 'capital' }
  /** The town is at least this large. */
  | { test: 'populationAtLeast'; value: number }
  /** The town controls one of these resources (`openedResource`). */
  | { test: 'holding'; resources: ResourceId[] }
  /** The town controls any resource of this kind. */
  | { test: 'holdingCategory'; category: ResourceKind }
  /**
   * The town has finished this building.
   *
   * Entry XXVIII's addition, and the shape that makes "granaries supply +1
   * faith" an ordinary `cityYields` line rather than a new effect kind: a
   * building's yield *is* a city yield in the towns that have the building.
   */
  | { test: 'hasBuilding'; building: BuildingId }
  /**
   * The town's **own hex** is hills — Tycho Brahe's observatory ground.
   *
   * `onTerrain`'s sibling and deliberately *not* one of its values: hills are an
   * overlay on a terrain rather than a terrain (`terrainData.ts`'s `hills`
   * block), so a grassland hill is grassland *and* hills and a scope that tried
   * to say "hills" through `onTerrain` could never match anything. Asked of
   * `cityTile`, exactly as `onTerrain` is, and `TileCondition`'s own `hills` one
   * scale up.
   */
  | { test: 'onHills' }
  /**
   * The town is **not** this empire's capital — Aššur-idī's colony trade.
   *
   * `notFreshwater`'s precedent, and it is here for that member's reason
   * exactly: there is no `not` composite and there will not be one, so a
   * negation that the ratified table actually asks for earns its own named
   * member. Two negations now, both of scopes whose positive half a card also
   * uses, which is the shape of the rule — a negation is written down when a
   * card needs it and never invented in advance.
   */
  | { test: 'notCapital' }
  /**
   * The town's **own hex** is this terrain — Petra's desert city.
   *
   * A fact about the ground the centre stands on and nothing wider: a city with
   * one desert tile in its third ring is not a desert city, and a scope that
   * counted the ring would be a second, fuzzier answer to a question the board
   * already answers exactly. `TileCondition`'s `terrain` one scale up, asked of
   * `cityTile`.
   */
  | { test: 'onTerrain'; terrain: TerrainId }
  /**
   * Every one of these holds. The composite, and the only one there is.
   *
   * There is deliberately no `any` and no `not`. A disjunction is two lines on
   * a card and reads better as two; a negation is how a scope system turns into
   * a query language. `all` earns its place because the ratified table asks for
   * one conjunction it cannot otherwise say — River Mother's shrines *in the
   * river towns* — and a card that wanted "freshwater and a shrine" would
   * otherwise have to be two cards that each pay half.
   */
  | { test: 'all'; of: CityScope[] };

/**
 * A fact about the empire that gates a whole clause. `conditionRule`'s subject.
 *
 * Deliberately tiny, and it stays tiny: a condition is a *gate*, not a second
 * scope system. Anything about one city is a `CityScope`.
 */
export type EmpireCondition =
  | { test: 'cityCountAtMost'; value: number }
  | { test: 'cityCountAtLeast'; value: number }
  | { test: 'authorityNegative' }
  | { test: 'happinessNegative' };

/**
 * When a strength line applies. The whole of `combatCardLine`'s generality.
 *
 * Read once, in `statecraft.ts`'s `combatCardLines`, against the same
 * `(attacker, target, tile)` triple `planCombat` already has — so a condition is
 * a question about the fight rather than about the card.
 */
export type CombatCondition =
  /** Unconditional. What a `scaled` line uses when the scaling *is* the rule. */
  | { test: 'always' }
  /** The other side is the wild. `combat.ts`'s own +2 precedent, generalised. */
  | { test: 'vsBarbarians' }
  /** The contested tile is inside this player's borders. */
  | { test: 'ownTerritory' }
  /** The contested tile is not. Border Wardens' mirror. */
  | { test: 'foreignTerritory' }
  /** The contested tile is hills. */
  | { test: 'onHills' }
  /** The target is a city. */
  | { test: 'vsCity' }
  /** The target is below half its maximum hit points. */
  | { test: 'targetBelowHalf' }
  /**
   * The contested tile belongs to this player's **capital** — the Walls of
   * Uruk's line, and `ownTerritory` narrowed to one town's borders.
   *
   * Asked of the same hex `ownTerritory` is asked of (the contested one), for
   * that arm's reason exactly: a strength line is a fact about *the fight*, and
   * the fight happens on one hex whichever side is being asked about.
   */
  | { test: 'capitalTerritory' }
  /**
   * A city of this player's stands on the contested tile — a garrison, said as
   * a condition rather than as a count.
   *
   * The Terracotta Army's, and it pairs with `side: 'defend'` on every row that
   * will ever want it: the contested hex is the defender's own, so "garrisoned"
   * and "standing on the hex being stormed" are the same sentence.
   */
  | { test: 'inCity' }
  /**
   * A city of this player's stands on the contested tile **and was taken by
   * force** — El Cid in Valencia.
   *
   * `inCity` narrowed exactly as `capitalTerritory` narrows `ownTerritory`, and
   * it reads `City.captured`, which is the same field `CityScope`'s `captured`
   * reads. One fact about a town, asked at two scales.
   */
  | { test: 'capturedCity' }
  /** The contested tile carries this feature. Nzinga's forest and jungle. */
  | { test: 'onFeature'; feature: string }
  /**
   * The contested tile has fresh water — a river edge or a lake beside it.
   *
   * `CityScope`'s and `TileCondition`'s `freshwater` at the third scale, asked
   * of the hex the fight is on. Han Xin's backs-to-the-river half.
   */
  | { test: 'freshwater' }
  /**
   * The contested tile touches open water — `isCoastal`, the same predicate a
   * coastal *city* is decided by (Entry I.b: one evaluator).
   *
   * Han Xin's other half. A disjunction is two lines, so "beside a river or
   * coast" is this member and the one above it on one card, and a hex that is
   * both pays twice — the vocabulary's own reading, stated in
   * `greatPeopleData.ts` and not bent here.
   */
  | { test: 'coastal' }
  /**
   * This piece is dug in (`Unit.fortifiedTurns`) — Jan Žižka's wagon fort.
   *
   * A fact about the *piece* rather than about its type, which is precisely why
   * it is a condition and not a `UnitFilter` field: see that interface's
   * docblock, which names "is this unit wounded" as the same mistake. The
   * condition asks about the side the line pays, exactly as `class` does.
   */
  | { test: 'fortified' };

/** What a strength line counts, when it counts something. */
export type CombatScaleCount =
  | 'cities'
  | 'adjacentFriendlies'
  /**
   * Great people of one **family** this empire has earned — The Empire's line
   * ("+1 combat strength for every great general earned this game").
   *
   * `CardCountScaledEffect.class`' sibling one table over, and the same bargain:
   * a count that needs an argument names it on the scale (`family`) rather than
   * in the union, so "per great general" and "per great engineer" are one arm.
   * *Earned*, not *held*: the sweep is `Player.legacies` — the people already
   * spent — plus this empire's pieces still standing, which between them are
   * every name it has ever been handed. A general who plants his citadel keeps
   * paying, which is what "earned this game" says.
   */
  | 'greatPeopleOfFamily';

/** A strength line that scales with a count, capped where the design caps it. */
export interface CombatScale {
  count: CombatScaleCount;
  /** How many of the thing buys one helping. */
  per: number;
  /** The most it may ever be worth, in strength points. */
  max?: number;
  /** Which family `greatPeopleOfFamily` counts. Ignored by the other counts. */
  family?: Family;
}

/**
 * Which units an effect reaches. Absent means every one.
 *
 * Two shapes read it now — `unitStat` since Entry XV, and `combatLine`'s
 * `class` since the wonders pass — and one predicate answers for both
 * (`unitMatches` in `statecraft.ts`). Every field is a fact about the *type*, so
 * nothing here can ask about the piece: a filter that could ask "is this unit
 * wounded" would be a `CombatCondition` wearing a filter's clothes.
 */
export interface UnitFilter {
  modelClass?: ModelClass;
  category?: UnitCategory;
  /** True: only types that shoot. False: only types that close. */
  ranged?: boolean;
  /**
   * True: only the **religious** types — the ones whose charges are rites
   * (`UnitDef.consecrates`). False: only the ones whose charges are not.
   *
   * "Religious units", which is how the Great Ziggurat and the Great Mosque of
   * Djenné are both written, read off the roster's own marker rather than off a
   * name — nothing in `src/sim/` compares a type against `"augur"`, so the
   * prophet that arrives one day is priced and charged by these two wonders
   * without either row being touched. It is also what lets the Pyramids say
   * "workers" and mean the ones that dig: an augur shares the worker's
   * `modelClass`, so `{ modelClass: 'worker', consecrates: false }` is the
   * spade-carrying half of it.
   */
  consecrates?: boolean;
}

/**
 * What a tile must be for a line of yield to land on it.
 *
 * Declared here because Statecraft's `tileYield` was the first shape to need
 * one, and shared from here because it was not the last: a building's
 * `tileYields` (`buildingData.ts`) and a luxury's `improvementYields`
 * (`resourceData.ts`) ask exactly the same question of exactly the same hex.
 * One predicate, `tileConditionHolds` in `statecraft.ts`, answers for all three
 * — a second copy of "is this water" is how a granary and a card start
 * disagreeing about the same coastline.
 */
export type TileCondition =
  | { test: 'hasResource' }
  | { test: 'hills' }
  | { test: 'feature'; feature: string }
  | { test: 'improved' }
  /** Any water hex — ocean, coast or lake. The granary's line (Entry XXVII). */
  | { test: 'water' }
  /** One *named* improvement, where `improved` is any of them at all. */
  | { test: 'improvement'; improvement: ImprovementId }
  /**
   * One named terrain. Desert Fathers' and Winter Mother's (Entry XXVIII).
   *
   * A fact about the ground itself, where `hills` is a fact about its shape and
   * `water` a whole category of it. Asked of `Tile.terrain` and nothing else.
   */
  | { test: 'terrain'; terrain: TerrainId }
  /**
   * A resource of this **kind** sits here — and, with `yields`, one that pays
   * that voice at all.
   *
   * `hasResource` widened by exactly the two questions the ratified table asks:
   * "a bonus resource that feeds you" (Goddess of the Harvest) and "a luxury"
   * (Lord of the Hoard). `yields` reads the resource's own row, so a designer
   * retuning wheat cannot leave a belief paying for something that no longer
   * feeds anybody.
   */
  | { test: 'resourceKind'; kind: ResourceKind; yields?: CityYieldKey }
  /**
   * One of these **named** resources sits here — Stonehenge's stone and marble.
   *
   * `CityScope`'s `holding` one scale down and deliberately the same shape: a
   * list, because the ratified text names a *material* ("stone") that the table
   * spells as two rows, and two cards each paying half would be the wrong fix.
   * Where `resourceKind` asks what class a seam is, this asks which seam it is.
   */
  | { test: 'resource'; resources: ResourceId[] }
  /**
   * The hex has fresh water — a river edge or a lake beside it (`Tile.freshwater`).
   *
   * `CityScope`'s `freshwater` one scale down, and the Hanging Gardens' half of
   * "farms beside fresh water": the farm is an `improvement` condition, the
   * water is this one, and `all` is what makes them one line.
   */
  | { test: 'freshwater' }
  /**
   * Every one of these holds. `CityScope`'s composite, one scale down, and here
   * for its reason: a wooded tundra and a mine standing on a luxury are single
   * conditions in the ratified text and two questions about one hex.
   */
  | { test: 'all'; of: TileCondition[] };

// --- payouts ----------------------------------------------------------------

/**
 * Where a scaled or converted figure lands. The shared tail of `countScaled` and
 * `rateConversion`, which is what makes those two shapes *one* idea each rather
 * than one idea per destination.
 *
 * `where` on a yield payout is the difference between "+1 gold per unique
 * luxury" (once, to the empire) and "+2 production per garrison" (in each town,
 * counted in that town) — the same distinction `resourceEffects.ts` draws
 * between `empireYields` and `perCityYields`, said once here instead of twice.
 */
export type CardPayout =
  | { to: 'yield'; yield: CityYieldKey; amount: number; where: 'empire' | 'city' | 'capital' }
  | { to: 'happiness'; amount: number }
  | { to: 'authority'; amount: number }
  | { to: 'percent'; yield: CityYieldKey; percent: number; stage: ModifierStage };

/** What a `countScaled` counts. Each has exactly one arm in `countOf`. */
export type CountKind =
  /** Distinct luxuries the empire controls. `controlledResources`. */
  | 'uniqueLuxuries'
  /** Improved luxury *copies* — duplicates count. `resourceCopies` summed. */
  | 'luxuryCopies'
  /** Improved bonus-resource tiles the empire controls. */
  | 'improvedBonusResources'
  /**
   * Improved **strategic** seams the empire controls — Shen Kuo's.
   *
   * `improvedBonusResources`' sibling and answered by the same sweep with the
   * other `ResourceKind`, rather than by a `kind:` argument on the effect: the
   * two counts read differently on a card ("per improved bonus resource", "per
   * improved strategic resource") and a member each is what lets `COUNT_WORDS`
   * say so without a second table. Luxuries already have two counts of their
   * own, which is why this pair is the whole of it.
   */
  | 'improvedStrategicResources'
  /** Cities held. */
  | 'cities'
  /** Citizens across the empire. */
  | 'population'
  /** Citizens in the capital. */
  | 'capitalPopulation'
  /** Combat units standing in this city (city-scoped). */
  | 'garrison'
  /** Fortified garrison, each worth 1 + its fortification level (city-scoped). */
  | 'garrisonWatch'
  /** Worked hill tiles of this city (city-scoped). */
  | 'workedHills'
  /** Faith banked in `Player.faithPool`. */
  | 'bankedFaith'
  /** Gold in the treasury. */
  | 'bankedGold'
  /** Barbarian camps the empire can currently see. */
  | 'visibleCamps'
  /**
   * Augurs standing in **this city** with at least one rite charge left
   * (city-scoped). Court Augurs' whole identity — the reason to keep one home
   * rather than spend it the turn it is bought.
   */
  | 'chargedAugurs'
  /**
   * Buildings in **this city** that supply science at all (city-scoped) — a
   * library, a shrine, a university. Omen Reading's, read off the building rows
   * so a retune moves the rite with it.
   */
  | 'scienceBuildings'
  /**
   * Buildings of **one named kind** the empire holds — one per city that has
   * built it. The effect names which in `CardCountScaledEffect.building`.
   *
   * The Circus Maximus' barracks and Notre-Dame's temples, and the first count
   * in the union that needs an argument. It is empire-wide by default and
   * narrowed to the holding town by `within: 'city'` like every other count that
   * can be asked either way; a building is one per city, so this is also "how
   * many of my cities have one".
   */
  | 'buildingsOfKind'
  /**
   * Buildings standing in **this city**, of every kind (city-scoped).
   *
   * The Mausoleum's, and deliberately the town's whole `buildings` list —
   * wonders included, because a wonder is a building and the tomb is paid for
   * what the city has raised, not for what class it belongs to.
   */
  | 'buildingsInCity'
  /**
   * Tiles **this city** is working (city-scoped) — `City.workedTiles`, the city
   * centre excluded exactly as the assigner counts them.
   *
   * Angkor Wat's, and `workedHills`' unfiltered twin: one asks how much of a
   * town's labour is on high ground and this asks how much labour there is.
   */
  | 'workedTilesInCity'
  /**
   * **Wonders** standing in this empire's cities — Phidias' and Dürer's.
   *
   * `buildingsOfKind` without the argument, and a count rather than a widening
   * of that one because "a wonder" is a class the data already declares
   * (`BuildingDef.wonder`, read by `isWonder`) while `buildingsOfKind` names one
   * row. A wonder is one per world, so counting across the empire's towns is
   * exact — and a wonder that changes hands changes this count with it, which is
   * the wonders framework's own rule (what a wonder *pays* follows the stones).
   */
  | 'wonders'
  /**
   * Hexes this empire has **explored** — Eratosthenes' well and stick, and
   * Zhang Qian's road west.
   *
   * Read off `GameState.visibility`, which is monotone: a tile explored is
   * explored forever, so this count never falls and a card written on it cannot
   * be farmed by walking away. It is the *seat's* own grid and not the world's,
   * which is what makes two empires' Eratosthenes worth different numbers.
   */
  | 'revealedTiles'
  /**
   * Foreign cities this empire has ever **sighted** — Ibn Baṭṭūṭa's Rihla.
   *
   * `GameState.citySightings`, the M8 city memory, filtered to other seats'
   * towns. A memory rather than a live watch, deliberately: the Rihla is thirty
   * years of roads, and a count that fell when a scout came home would be a card
   * that punishes the traveller for arriving.
   */
  | 'sightedCities'
  /**
   * Ages this empire has **closed** — one less than the era it stands in
   * (`highestAge`), so a realm still in the first age counts nothing.
   *
   * Sima Qian's, and the generic answer to a clause that until now only a
   * `windfallRider` could say (`perAge`): that flag multiplies a payout by the
   * era, and this counts the eras *behind* you. Two readings of the calendar,
   * each in the shape its cards want.
   */
  | 'agesClosed'
  /**
   * This empire's **living pieces**, narrowed by `CardCountScaledEffect.class`.
   *
   * Murasaki Shikibu's melee line. The second count in the union that takes an
   * argument, and it takes the ordinary `UnitFilter` — so "per melee unit", "per
   * ranged unit" and "per religious unit" are one shape, one arm and one table
   * entry, exactly as `buildingsOfKind` made "per Barracks" and "per Temple"
   * one. An absent filter counts every piece, the filter's own reading
   * everywhere else.
   */
  | 'unitsInField'
  /**
   * Buildings of one **category** the empire holds — one per city per building,
   * counted across the realm, narrowed to the town by `within: 'city'`.
   *
   * `buildingsOfKind`'s variant, and it takes its argument the same way
   * (`CardCountScaledEffect.category`): where that count names *one row*, this
   * names what a row is *for* (`BuildingDef.category`, the one word every
   * building declares). The Merchant League's "+1 gold for every gold-producing
   * building" is one line of it, and a second gold building is a JSON row rather
   * than an edit here — which is exactly why the category and not a list.
   */
  | 'buildingsOfCategory'
  /**
   * **Fortification** buildings standing in this city (city-scoped) — a
   * palisade, a wall, whatever a later age calls a castle.
   *
   * The Long Watch's second line. "Which buildings are fortifications" is read
   * off the rows rather than off a list of names: a building that raises what a
   * town is worth to storm (`cityStat.defense`) or how long it takes to empty
   * (`cityHp`) is a fortification, and nothing else is. So a watchtower added to
   * the table joins the count for free and a granary never can.
   */
  | 'defensiveBuildings'
  /**
   * Barbarian camps standing on hexes this seat has **explored** — Border
   * Ballads', and deliberately not `visibleCamps`.
   *
   * The difference is the card: "per camp you can currently see" is a reason to
   * park a scout, and "per camp you have discovered" is a reason to go and look.
   * Read off `GameState.visibility`, which is monotone — a hex explored is
   * explored forever — so the count falls only when a camp is actually burnt
   * out, which is the trade the card is about.
   */
  | 'discoveredCamps'
  /**
   * Trade routes this empire is **running right now** — Silk Roads'.
   *
   * The caravans of this seat carrying a live route, counted off the board
   * (`Unit.trade`, live while `state.turn < expiresTurn`) rather than off
   * `trade.ts`, which reads *this* module for its slot fold and may not be read
   * back. One comparison, exactly as expiry is one comparison everywhere else.
   */
  | 'tradeRoutes';

/** What a `rateConversion` reads. A *rate* or a meter standing, never a bank. */
export type RateSource =
  /** Faith the empire banked this turn. */
  | 'faithPerTurn'
  /**
   * Faith **the capital** banked this turn — Theocracy's tithe of the temple
   * city ("10% of your capital's faith is gained as science and culture").
   *
   * `faithPerTurn` narrowed to one town, and a source of its own rather than a
   * scope on the shape for `CityScope`'s stated reason: a rate is a fact about
   * the empire's *books*, and the two questions ("what did I bank", "what did
   * the capital bank") are two readings of the calendar, each in the shape its
   * cards want. Handed in by `collectYields`, which has just computed the
   * capital's total, exactly as the empire-wide rates are.
   */
  | 'capitalFaithPerTurn'
  /** Culture the empire banked this turn. */
  | 'culturePerTurn'
  /** Gold the empire banked this turn. */
  | 'goldPerTurn'
  /** The happiness meter, counted only while positive. */
  | 'happiness'
  /** The authority meter, counted only while positive. */
  | 'authority';

// --- the rules a card may bend ----------------------------------------------

/**
 * A named percentage on one *rule* of the simulation.
 *
 * `resourceData.ts`'s `ResourceRule` with three more members, and the three are
 * the reason it is a separate union rather than a reuse: a luxury cannot make
 * land cheaper or borders faster, and a card can. Each has exactly one consumer.
 */
export type CardRule =
  /** What a citizen demands (`happinessDemand`). */
  | 'happinessDemand'
  /** What the next border tile costs (`borderCostFor`). */
  | 'borderCost'
  /** What a city keeps of its basket on growing (`growthCarryover`). */
  | 'growthCarryover'
  /** What a tile costs to buy (`tilePurchasePrice`). */
  | 'tilePurchase'
  /** How fast the border basket fills (`borderGrowth`). */
  | 'borderCulture'
  /** What a settler costs in hammers (`unitProductionCost`). */
  | 'settlerCost'
  /**
   * How much of a city's food **surplus** reaches its basket (`growthSurplus`).
   *
   * The Hanging Gardens' channel, and the seventh rule for the reason the other
   * six are rules: growth is not a yield. Entry XIV.D.4 keeps the surplus in a
   * channel of its own with its own fold, so a percentage on it is neither a
   * city-stage nor a global-stage percentage on food — it is a different rule
   * with a different consumer, and the meters' stifle already sums into exactly
   * this figure.
   */
  | 'growthSurplus';

/** A constant of the two meters a card may rewrite. */
export type MeterRuleId =
  /** What a captured city costs in authority. `value` replaces the constant. */
  | 'capturedCityCost'
  /** What a coastal city costs. `delta` shifts the constant. */
  | 'coastalCityCost'
  /** Every city demands `delta` more happiness. */
  | 'cityHappinessDemand'
  /** Borders keep growing while the writ is in deficit. */
  | 'borderFreezeExempt'
  /** A negative writ stops slowing production toward units. */
  | 'authorityUnitProductionExempt';

/** A verb whose behaviour a card changes outright. */
export type ActionRuleId =
  /** A chop spends no worker charge. */
  | 'freeChop'
  /** Production overflow from a completion is doubled. */
  | 'doubleOverflow'
  /** A unit further down the queue completes ahead of an unaffordable building. */
  | 'unitJumpsQueue'
  /** Settlers stop getting dearer. */
  | 'noSettlerEscalation';

/**
 * Something about the world that stops being true — or starts.
 *
 * Three now, and all three are Wolf-Mother's Pact, which is the shape working:
 * a doctrine that rewrites the wild's relationship with an empire says so in
 * three named rules that three verbs read, rather than in one clause the wild's
 * own module has to know about.
 */
export type BehaviorRuleId =
  /** The wild never attacks this empire. Theft continues. */
  | 'barbariansPassive'
  /**
   * A barbarian **killed** by this empire changes sides instead of dying —
   * handed over by `captureUnit` in `applyCombat`'s kill path, which is the one
   * implementation of a change of hands and the reason this is a rule rather
   * than a second way to acquire a piece.
   */
  | 'barbarianKillsConvert'
  /**
   * This empire can no longer **clear a camp**: arriving on one burns nothing
   * out and pays no bounty (`arriveOnTile`). Wolf-Mother's price for the
   * conversion above — the wild is an ally, and you do not sack an ally's
   * villages.
   */
  | 'noCampClearing';

/** A rule of **Statecraft itself** that a card rewrites. Entry XV.b's metaRule. */
export type MetaRuleId = 'sealTurns';

/** What an amplifier reaches into. */
export type AmplifierTarget =
  /** The flat happiness every unique luxury pays. */
  | 'luxuryHappiness'
  /** What a *duplicate* copy of a luxury is worth, as a share of the first. */
  | 'luxuryDuplicates'
  /**
   * How long a **timed** effect runs — Chichen Itza's fifty percent.
   *
   * Read where a rite's `expiresTurn` is computed (`performRiteAt`), on the
   * duration, floored once. It stays a comparison and never becomes a countdown:
   * the amplifier changes what turn a blessing is stamped to expire on and
   * nothing anywhere ticks anything, which is `TimedEffect`'s whole rule. Read
   * at the moment of the stamp for `cardExtraCharges`' reason — a blessing that
   * got longer when the wonder finished would be re-deriving a fact the state
   * already wrote down.
   */
  | 'riteDuration'
  /**
   * What a **trade route** pays — the Merchant League's fifty percent, and The
   * Sea Charter's.
   *
   * Read in `explainRouteYieldBetween` (`trade.ts`), which is where the three
   * lines of a route's figure are folded, and it joins as **one more line of
   * that list** rather than as a multiplication afterwards: rule 5 for a
   * caravan. The route's owner is the origin's, which is the seat that sent it.
   */
  | 'routeYields';

/**
 * A rule about how an offer *pays*, as against how big it is.
 *
 * `discoveryOfferSize` used to sit here as a placeholder for "this card makes a
 * discovery deal more options" and is gone: the size of an offer is now a fold
 * of its own (`explainOfferSize`), one evaluator for all four drafts, and a rule
 * id that named one of them would have been a second answer to the same
 * question. What is left is the shape this list was always for — a rule about
 * what happens when the offer is *answered*.
 */
export type OfferRuleId = 'discoveryClaimAll';

/**
 * Which draft an `offerRider` widens.
 *
 * The five offers a game deals, plus the `'all'` that widens every one of them —
 * the Leaning Tower's line, and John Dee's. Kept as a string union here rather
 * than derived from the rules block so a JSON row that names a sixth kind fails
 * to compile against the table rather than silently widening nothing. It is
 * `OfferKind` (`statecraft.ts`) plus `'all'`; the two move together, and the
 * great people pass added `'greatPerson'` to both.
 */
export type OfferRiderScope =
  | 'order'
  | 'doctrine'
  | 'belief'
  | 'discovery'
  | 'greatPerson'
  | 'all';

/**
 * The occasion a `windfallRider` rides on — Entry XVIII's payouts, and the
 * moments that ought to have one.
 *
 * **A rider is part of the printed number.** Entry XVIII.5 says a windfall pays
 * its printed figure exactly, with no percentages, no meter tiers and no Entry
 * XVII staging — and a rider does not violate that, it *changes what is
 * printed*. A chop under The Woodwrights is a 40⚙ windfall, not a 20⚙ windfall
 * multiplied by something afterwards: `windfallGrant` composes the base and its
 * riders into one figure, and that figure is what the settlement banks, what the
 * preview promises and what the announcement says. Nothing downstream of that
 * one function ever sees the base again.
 */
export type WindfallOccasion =
  /** A forest felled (`chopFeature`). */
  | 'chop'
  /** A barbarian camp cleared (`arriveOnTile`). */
  | 'camp'
  /** A city gained a citizen (`settleGrowth`). */
  | 'growth'
  /** Any item completed. */
  | 'completion'
  // **There is deliberately no `purchase` occasion**, and finding out why is
  // what the one-completion-routine rule is worth: a bought thing is realised
  // through `realiseItem` exactly as a built one is, and `payCompletionRiders`
  // lives *inside* that routine — so `unitCompletion` already fires for a unit
  // however it was paid for. Rites of Passage's "buying or completing a unit"
  // is therefore **one row**, and an occasion added beside it would have paid
  // that card twice for one warrior. The day a card wants to pay on a purchase
  // and *not* on a completion, that is a real distinction and earns a member.
  /** A building completed. */
  | 'buildingCompletion'
  /** A unit completed. */
  | 'unitCompletion'
  /** A city captured. */
  | 'capture'
  /** A discovery claimed (`claimDiscoveryAt`). */
  | 'discovery'
  /** One of this empire's units died. */
  | 'death'
  /** This empire killed somebody. */
  | 'kill'
  /** An improvement pillaged (`pillageAt`). */
  | 'pillage'
  /** A laden caravan destroyed (`settleTraderPlunder`, the trade pass). */
  | 'pillageTrader'
  /** A technology completed (`settleResearch`). */
  | 'tech'
  /** A tile bought (`purchaseTileAt`). */
  | 'tilePurchase'
  /** An augur's rite performed (`performRiteAt`, Entry XXVIII). */
  | 'rite';

/** What a rider adds on top of the occasion's own payout. */
export interface WindfallGrantSpec {
  /** A voice and an amount — culture on a kill, food on a camp. */
  yield?: CityYieldKey;
  amount?: number;
  /** Hit points restored to the acting unit. Pillage's, today. */
  heal?: number;
  /**
   * A **piece**, gifted outright — Camp Followers' "and gift a random military
   * unit".
   *
   * A named *kind of draw* rather than a `UnitTypeId`, because the card's
   * sentence is about the draw: "a random military unit" means one of the
   * soldiers this empire could actually raise on the turn it happens, so a
   * bronze-age camp pays a warrior and a later one pays whatever the tree has
   * opened since. Rolled from `state.rng` in `windfallPayout` — where every
   * other figure on a payout is composed, so the whole thing is decided before
   * anything is banked (Entry XVIII.5) and a replay reproduces it — and realised
   * through `realiseItem`'s unit path by `payWindfallGrants`, which is the one
   * completion routine and the reason this is not a second way to mint a unit.
   */
  unit?: 'randomMilitary';
}

// --- the vocabulary ---------------------------------------------------------

/** The bag every yield-bearing shape carries. Absent is zero. */
export interface CardYieldBag {
  food?: number;
  production?: number;
  gold?: number;
  science?: number;
  culture?: number;
  faith?: number;
}

/** Flat yields in each city a scope admits. `resourceEffects`' `perCityYields`. */
export interface CardCityYieldsEffect extends CardYieldBag {
  kind: 'cityYields';
  scope?: CityScope;
}

/** Flat yields to the empire, once, wherever its cities are. */
export interface CardEmpireYieldsEffect extends CardYieldBag {
  kind: 'empireYields';
}

/**
 * A percentage on a yield, joining one of Entry XVII's two stages.
 *
 * `yield: 'all'` expands to one line per voice in the evaluator rather than in
 * the data, so The Hermit Crown is one row and reads as six labelled lines.
 * `stage` defaults to `'city'` — Entry XVII.5: the global stage is spent
 * sparingly and a card that wants it says so.
 */
export interface CardPercentYieldsEffect {
  kind: 'percentYields';
  yield: CityYieldKey | 'all';
  percent: number;
  scope?: CityScope;
  stage?: ModifierStage;
}

/**
 * Hammers behind a category, optionally only behind one class of unit.
 *
 * `'wonder'` is a category of its own (see `ProductionCategory`), which is what
 * lets the ratified great-person legacies say "+30%⚙ toward wonders" as a data
 * row. Nothing supplies one yet.
 */
export interface CardProductionBonusEffect {
  kind: 'productionBonus';
  category: ProductionCategory;
  percent: number;
  /** Narrows a unit bonus to one silhouette — the mounted line, today. */
  modelClass?: ModelClass;
  /**
   * Narrows the bonus to the towns a scope admits — Amenhotep son of Hapu's
   * wonders **in the capital**.
   *
   * The ordinary `CityScope`, read in `cardProduction`, which already has the
   * town in hand because a production modifier is asked of one city's queue.
   * `modelClass` narrows *what* is being built and this narrows *where*, so the
   * two are independent and a row may carry both.
   */
  scope?: CityScope;
}

/** A percentage on a named rule. See `CardRule`. */
export interface CardRulePercentEffect {
  kind: 'rulePercent';
  rule: CardRule;
  percent: number;
}

/** Flat happiness, once for the empire or once per city a scope admits. */
export interface CardHappinessEffect {
  kind: 'happiness';
  amount: number;
  per?: 'city';
  scope?: CityScope;
}

/** Flat authority capacity. Capacity, never a discount — `resourceAuthority`'s rule. */
export interface CardAuthorityEffect {
  kind: 'authority';
  amount: number;
  per?: 'city';
}

/** Percentage points on the positive happiness rungs. Amber's shape. */
export interface CardHappinessTierBoostEffect {
  kind: 'happinessTierBoost';
  points: number;
}

/** A labelled strength line under a stated condition. See `CombatCondition`. */
export interface CardCombatLineEffect {
  kind: 'combatLine';
  amount: number;
  when: CombatCondition;
  /** Which posture it pays in. `'both'` is the common case. */
  side: 'attack' | 'defend' | 'both';
  scaled?: CombatScale;
  /**
   * Which units the line reaches. Absent means every one of this empire's.
   *
   * The Alhambra's mounted +2, and the field the ratified great-person legacies
   * have been waiting on ("+3 to your ships", "+2 to siege"). It is the *same*
   * `UnitFilter` `unitStat` takes, read by the same predicate, so "which units"
   * is one question with one answer however a card asks it — and it is asked of
   * whichever side the line pays, exactly as `side` says.
   */
  class?: UnitFilter;
  /**
   * Which units the line pays **against**. Absent means anything at all.
   *
   * `class`' mirror and the field Lautaro was waiting on ("+3 combat vs
   * mounted"): `class` names *this* side's piece and `vsClass` names the one
   * opposite, read by the same `unitMatches` predicate off the same
   * `UnitFilter`. Two fields rather than one with a side, because a row that
   * says both — "your spearmen, against their horse" — is an ordinary thing for
   * a card to say and a single field could not.
   *
   * A **city has no silhouette**, so a line carrying `vsClass` never pays
   * against walls. That is the honest reading rather than an omission: "vs
   * mounted" is about what is charging at you, and nothing charges out of a
   * town. A row that wants the walls says `when: { test: 'vsCity' }`.
   */
  vsClass?: UnitFilter;
}

/** A stat on a class of unit. Each stat has exactly one evaluator downstream. */
export interface CardUnitStatEffect {
  kind: 'unitStat';
  stat: 'movement' | 'sight' | 'heal' | 'charges' | 'range' | 'combatPercent';
  amount: number;
  class?: UnitFilter;
  /**
   * Narrows the stat to *where the piece is standing*. Absent means anywhere.
   *
   *   · `'ownTerritory'` — on its owner's ground. Imperium's.
   *   · `'embarked'` — on water, which for a piece that is on the board at all
   *     means it embarked to get there (`isEmbarkableTerrain`, Entry XXVII).
   *     The Great Lighthouse's extra point of movement at sea.
   *
   * Both are asked of the hex the unit is on, in `cardUnitStat`, which is the
   * only reading a per-turn allowance can have: a ship is quick because it set
   * out from the water, and the allowance is refilled where it stands.
   */
  where?: 'ownTerritory' | 'embarked';
}

/** A rider on a windfall. See `WindfallOccasion` for what "rider" means. */
export interface CardWindfallRiderEffect {
  kind: 'windfallRider';
  occasion: WindfallOccasion;
  /** Scales the occasion's own payout, in whole percent. */
  percent?: number;
  /** Adds something the occasion did not pay at all. */
  grant?: WindfallGrantSpec;
  /**
   * **Everything on this rider is multiplied by the empire's era** — ×1 in Æra
   * I, ×2 in Æra II, ×3 in Æra III (`highestAge`).
   *
   * The ratified text says "multiplied by the current age" in two places and
   * means the same thing in both: Keeper of the Calendar multiplies the
   * *occasion's own* figure (a discovery's twenty hammers become sixty), and
   * Rites of Blood multiplies its own **grant** (fifteen faith a kill becomes
   * forty-five). One flag serves both because it is one idea — a payout quoted
   * in the money of the era it is paid in.
   *
   * It is a *multiplier*, not a percentage, and it is applied **after** the
   * summed `percent` riders (`windfallPayout`), which keeps Entry XVII's "sum
   * within a stage, apply once" true at this scale: two riders that each say
   * ×era do not compound into ×era², they agree.
   *
   * Still an Entry XVIII.5 printed number: the era changes what is *printed*,
   * before anything is banked, so the preview, the basket and the announcement
   * are one figure.
   */
  perAge?: boolean;
  /**
   * **Everything on this rider is multiplied by the number of Orders this
   * empire has *slotted*** — the non-null entries of `PlayerStatecraft.slots`.
   * `perAge`'s sibling, in every respect that matters:
   *
   *   · it multiplies the *occasion's own* figure and the rider's own **grant**,
   *     exactly as the era does, because a payout "per slotted Order" is one
   *     idea however the occasion happens to be quoted;
   *   · it composes with `perAge` as a **product** — a rider carrying both is
   *     ×era × slots — rather than as a second competitor to the summed
   *     percentages, which is Entry XVII's "sum within a stage, apply once" read
   *     at this scale for the second time;
   *   · it is folded in `windfallPayout`, **before anything is banked**, so the
   *     preview, the basket and the announcement remain one figure (Entry
   *     XVIII.5).
   *
   * Zero slotted Orders therefore pays **nothing**, and pays it silently: a
   * grant of zero is dropped from the payout the way every other zero line in
   * this file is dropped, rather than printed as a nought nobody can act on.
   * The card's own text is where a player reads the condition ("per slotted
   * Order"), which is War Chief's whole bargain — a warlord who fills his
   * council rides harder on every kill.
   */
  perSlottedOrder?: boolean;
  /**
   * The rider fires **only against the wild** — Border Ballads' "+4 culture for
   * every barbarian killed".
   *
   * A filter on the *occasion* rather than a fourth occasion, because "a kill"
   * and "a kill of a barbarian" are one moment asked two ways, exactly as
   * `CombatCondition`'s `vsBarbarians` narrows a strength line rather than
   * earning a second `combatLine` shape. Read where the occasion is fired: the
   * caller says whether the piece that fell was the wild's, and a rider that
   * asks for it is dropped when it was not. Meaningless on an occasion that has
   * no other side (a chop, a growth), which is a fact about the row rather than
   * a rule here.
   */
  vsBarbarians?: boolean;
}

/** What a newly founded city is founded *with*. */
export interface CardFoundingRiderEffect {
  kind: 'foundingRider';
  population?: number;
  building?: BuildingId;
  /**
   * The new town is **joined to the realm by road** — The Founders' Road's
   * second half, live since the trade pass gave the game roads.
   *
   * On this shape rather than on an `actionRule` because it is the same
   * question the other two fields answer — what does this empire's law found a
   * city *with* — and a founding is where all three are read (`foundCityAt`,
   * through `cardFoundingRider`). The road is laid along the path the caravan
   * would have worn, through `Tile.road` and nothing else: one writer, so a
   * highway a doctrine grants and a highway a trader wears are the same mark on
   * the same field.
   */
  roads?: boolean;
  /** Only the first N cities. Absent means all of them. */
  maxCities?: number;
}

/** A payout scaled by a count. See `CountKind` and `CardPayout`. */
export interface CardCountScaledEffect {
  kind: 'countScaled';
  count: CountKind;
  /** How many of the counted thing buy one helping. Default 1. */
  per?: number;
  /** The most helpings that ever pay. */
  max?: number;
  pays: CardPayout;
  /** Which building `buildingsOfKind` counts. Ignored by every other count. */
  building?: BuildingId;
  /**
   * Which category `buildingsOfCategory` counts. Ignored by every other count.
   *
   * `building`'s sibling, one grade wider: that field names a row and this names
   * what a row is *for*. Both sit on the effect rather than in the union for the
   * stated reason — the union stays a list of questions and the row says which
   * one it is asking.
   */
  category?: BuildingCategory;
  /**
   * Which units `unitsInField` counts. Ignored by every other count.
   *
   * `building`'s sibling, and the same bargain one table over: a count that
   * needs an argument names it on the effect rather than in the union, so the
   * union stays a list of *questions* and the row says which one it is asking.
   * Absent counts every piece.
   */
  class?: UnitFilter;
  /**
   * Narrows an **empire** count to the town the line is being paid in.
   *
   * The Temple of Artemis' "in this city", and a modifier on the *count* rather
   * than a second count: `improvedBonusResources` is the same sweep whether it
   * is asked of a realm or of one town's ground, so the question is which
   * ground, not which sweep. The city-scoped counts (`garrison`, `workedHills`,
   * the rest) already answer per town and ignore this.
   */
  within?: 'city';
}

/** A payout converted from a rate or a meter standing. See `RateSource`. */
export interface CardRateConversionEffect {
  kind: 'rateConversion';
  from: RateSource;
  per: number;
  pays: CardPayout;
}

/**
 * A rule about a draft offer rather than about the world.
 *
 * **Two halves, and a row says exactly one of them.** `rule` is a named rule
 * about how an offer *pays* (`OfferRuleId`); `offer` + `extra` say how much
 * *wider* an offer is dealt — the Oracle's card in every Statecraft draft, the
 * Leaning Tower's card in every draft of every kind, and the great person who
 * shows one more of everything. Both live on one shape because they are one
 * question asked of one hook ("what does this card do to an offer"), and a
 * second `kind` would have been a second thing for `liveEffects` consumers to
 * remember to read.
 *
 * `extra` is scaled by an Order's level like every other figure in the
 * vocabulary (`scaleByLevel`), and the cap in `rules.offers.max` is what keeps a
 * deeply drafted card from dealing a spread nobody can see.
 */
export interface CardOfferRiderEffect {
  kind: 'offerRider';
  /** A named rule of what an answered offer does. */
  rule?: OfferRuleId;
  /** Which draft this widens. `'all'` widens every one of them. */
  offer?: OfferRiderScope;
  /** How many extra cards it deals. Absent means one — the ordinary card. */
  extra?: number;
}

/**
 * Trade routes an empire may run at once, on top of what its buildings supply.
 *
 * `CardOfferRiderEffect`'s sibling one system over, and deliberately the same
 * shape: a number of extra somethings, scaled by an Order's level like every
 * other figure in the vocabulary, folded into a list the surface prints line by
 * line (`explainRouteSlots` in `trade.ts` — the **only** reader).
 *
 * **Scope-free for now**, and that is a declaration rather than an oversight.
 * Harbourmasters' ratified text is "coastal cities +1 route", which wants a
 * `CityScope` on a fold that is empire-wide — a route belongs to an empire, not
 * to a town — so the day that card is written the honest move is to decide what
 * a scoped route slot *means* (a slot only a coastal city may send from?) and
 * give this shape the field then. Until then the Great Lighthouse carries the
 * first one empire-wide, with a `note` on its row saying so.
 */
export interface CardRouteRiderEffect {
  kind: 'routeRider';
  /** How many extra routes. Absent means one. */
  extra?: number;
}

/** A percentage on somebody else's effect. The Grand Bazaar's whole identity. */
export interface CardEffectAmplifierEffect {
  kind: 'effectAmplifier';
  target: AmplifierTarget;
  percent: number;
}

/** A constant of the meters, replaced (`value`) or shifted (`delta`). */
export interface CardMeterRuleEffect {
  kind: 'meterRule';
  rule: MeterRuleId;
  value?: number;
  delta?: number;
}

/** A whole clause gated on a fact about the empire. */
export interface CardConditionRuleEffect {
  kind: 'conditionRule';
  when: EmpireCondition;
  then: CardEffect[];
}

/** A verb whose behaviour changes. See `ActionRuleId`. */
export interface CardActionRuleEffect {
  kind: 'actionRule';
  rule: ActionRuleId;
}

/** Something about the world that stops being true. See `BehaviorRuleId`. */
export interface CardBehaviorRuleEffect {
  kind: 'behaviorRule';
  rule: BehaviorRuleId;
}

/** A stat on the empire's *cities* — what they are worth to storm, and how far
 * they see. */
export interface CardCityStatEffect {
  kind: 'cityStat';
  stat: 'defense' | 'sight';
  amount: number;
  scope?: CityScope;
}

/** A rule of Statecraft itself. See `MetaRuleId`. */
export interface CardMetaRuleEffect {
  kind: 'metaRule';
  rule: MetaRuleId;
  value: number;
}

/**
 * A yield on every tile a condition admits — the one shape that reaches into
 * `explainTileYield`, and therefore the one that has to obey rule 5 at the
 * hex.
 */
export interface CardTileYieldEffect extends CardYieldBag {
  kind: 'tileYield';
  on: TileCondition;
  /**
   * Whose ground it lands on: the hex pays only if its **owning city** is
   * admitted. Absent means every hex this empire works.
   *
   * Petra's desert and the Hanging Gardens' farms are both "in this city", which
   * a wonder says the way every other wonder clause says it — `hasBuilding` on
   * its own row, derived from the board, so a captured wonder moves its ground
   * bonus with it.
   *
   * It is read where the *town* is known (`cityContext` in `cities.ts`) rather
   * than in the empire-wide pass, for the granary's reason exactly: a fact about
   * one city can only be resolved by whoever has one in hand, and a hex outside
   * anybody's borders has no city to ask.
   */
  scope?: CityScope;
}

/**
 * A draft that opens **on a cadence** rather than on an occasion.
 *
 * Keeper of the Calendar's "every 20 turns, claim a discovery" (Entry XXVIII),
 * and the one effect in the vocabulary whose subject is the calendar itself.
 * Every other shape is asked a question about the board and answers it; this one
 * is read by a turn phase and *opens an offer*, which is why it is a shape and
 * not a `windfallRider` — there is no occasion to ride on.
 *
 * The cadence is `state.turn % every === 0`, an **absolute** comparison rather
 * than a counter on the player, for `SlottedOrder.sealedUntil`'s reason exactly:
 * a countdown is state that has to be ticked, and a phase that ticks it is a
 * phase that can be skipped or run twice. It also means an empire that takes the
 * belief on turn 19 is offered on turn 20 — the calendar belongs to the world,
 * not to the convert.
 *
 * `site` says which pool the three cards are drawn from, so this reuses the
 * discovery draft whole (`drawDiscoveryOffer`) rather than inventing a second
 * one. An empire already holding an unanswered offer is skipped, exactly as a
 * second ruin is (`discoveryClaimError`) — an offer is a decision the player
 * owes the game, and a second one dealt on top of it would destroy the first.
 */
export interface CardPeriodicOfferEffect {
  kind: 'periodicOffer';
  /** Turns between offers. A turn is offered when `turn % every === 0`. */
  every: number;
  /** Which discovery pool the offer is drawn from. */
  site: 'ruins' | 'village';
}

/**
 * A building a card makes available. **Declared and deferred**: nothing in the
 * game can buy a building with gold yet, so The Gilded Court's Gilded Hall has
 * no mechanism to unlock into. The shape is here so the row can name it and the
 * deferral is legible; `statecraft.ts` reads it into a *description* and never
 * into a rule.
 */
export interface CardUnlocksBuildingEffect {
  kind: 'unlocksBuilding';
  building: BuildingId;
}

/**
 * Room for another god — Stonehenge's, and the Great Mosque of Djenné's.
 *
 * A *slot grant*, and the first shape in the vocabulary whose subject is a
 * structural limit rather than a number in a ledger. It is read exactly where
 * the technologies' slots are read (`pantheonSlots`, `religion.ts`), as one more
 * line of the same fold, so "how many beliefs may I hold" has one answer and a
 * wonder cannot open a slot the consecration screen does not offer.
 *
 * There is deliberately no Statecraft twin yet: the Forbidden City's "one more
 * Order office" would have to say *which kind* of slot it opens, and a spread is
 * rebuilt on every adoption (`adoptGovernmentAt`), so an office grant is a
 * design decision about the layout rather than a number added to one. It is
 * deferred on that row.
 */
export interface CardPantheonSlotsEffect {
  kind: 'pantheonSlots';
  amount: number;
}

/**
 * A percentage on what a **unit costs to buy** — the Great Ziggurat's cheaper
 * augurs.
 *
 * One labelled line in `explainPurchaseCost`'s bank (`purchase.ts`), which is
 * the whole of why it is a shape rather than a `CardRule`: a purchase price is
 * already an ordered list whose fold is the number on the button, so a discount
 * joins it as a line and the screen prints the reason without being told about
 * cards. Riders **sum before one multiplication** and the price is floored once,
 * exactly as Entry XVII sums within a stage.
 *
 * `class` is the ordinary `UnitFilter`, so the row says "religious units" by
 * asking the roster (`consecrates`) rather than by naming the augur.
 *
 * **`on` is what a filter cannot say.** Crassus and Jakob Fugger both discount
 * "units and buildings", and a `UnitFilter` has no vocabulary for a granary — so
 * *which kind of thing* is a field of its own beside the filter that says *which
 * units*. It defaults to `'unit'`, which is what every row written before it
 * meant, so the Ziggurat's augurs are byte-identical without being touched. A
 * building admits no filter at all: `class` is simply not asked when the thing
 * being priced is a building, because "religious granaries" is not a sentence.
 * (A wonder is still never for sale, in any bank, at any discount —
 * `purchaseError` refuses one before the price is ever asked for.)
 */
export interface CardPurchaseRiderEffect {
  kind: 'purchaseRider';
  class: UnitFilter;
  /** Which kind of purchase this rides on. Absent means `'unit'`. */
  on?: 'unit' | 'building' | 'all';
  /** Signed whole percent off the price. `-25` is the Ziggurat's quarter. */
  percent: number;
}

/**
 * A rule of the **zone of control** — the Great Wall's, and the only one there
 * is.
 *
 * `'borders'`: every hex this empire owns exerts a zone of control against
 * everybody else, exactly as one of its combat units would. One clause in
 * `zocField` (`pathfind.ts`), after the units and the cities, so the lock's
 * arithmetic and its four readers are untouched — a border is simply another
 * source, and `stepCost` prices a step alongside it the way it prices a step
 * alongside a spearman.
 */
export interface CardZocRuleEffect {
  kind: 'zocRule';
  rule: 'borders';
}

/**
 * More out of one turn of a **project** — the Water Clock of Su Song's beakers
 * on Scholarship.
 *
 * `pays` is a *delta* on the project's printed conversion, added where the
 * payout is banked (`payProject`, `cities.ts`) and nowhere else. It is a flat
 * addition to what comes **out**, never to the hammers going in, so Entry XXVI's
 * argument is untouched: the hammers were staged on their way into the basket
 * and this does not multiply them, it enlarges the printed rate. A card that
 * wanted a *percentage* of a conversion would be reopening that argument and is
 * deliberately not expressible.
 */
export interface CardProjectRiderEffect {
  kind: 'projectRider';
  project: ProjectId;
  pays: ProjectPayout;
}

/**
 * Renown, paid **every turn** — the fifth Entry XVIII bucket said as a card
 * clause. The Council of Elders' standing: *1 renown per turn in every city*.
 *
 * It is a `renown` shape rather than a `cityYields` one because renown is not a
 * yield: it is not worked by a citizen, it is not staged by Entry XVII's
 * percentages, and it does not sit in a city at all — it accumulates on the
 * *player*, toward a great person. So it joins `explainRenown`'s list
 * (`renown.ts`) rather than any city's, and the trickle the `renown` phase banks
 * is still the fold of exactly that list.
 *
 * `per` is the only scaling this shape has and `'city'` is its only reading:
 * "in every city" is a multiplier on a fact about the *empire*, not a line per
 * town, so one line prints with the arithmetic shown ("… · 1 per city × 3")
 * rather than three lines a player has to add up. Absent means flat.
 *
 * `family` is **optional on purpose**. A named family biases the great-person
 * draw through `Player.renownByFamily`; an unfamilied trickle feeds the pool and
 * no family, which leaves the draw exactly as flat as it was — and flat is the
 * documented behaviour when nothing has fed (`chooseGreatPerson`'s weighting).
 * A government's counsel favours nobody in particular, so the Council names
 * none.
 */
export interface CardRenownEffect {
  kind: 'renown';
  amount: number;
  /**
   * What the trickle is multiplied by. Absent means flat.
   *
   *   · `'city'` — the cities this empire holds. The Council of Elders'.
   *   · `'wonder'` — the wonders standing in them. The Magisterium's, and it
   *     follows the stones like every other wonder reading: a captured wonder
   *     pays its captor from the turn the town changes hands.
   *
   * Both are multipliers on a fact about the *empire* rather than a line per
   * thing, so one line prints with the arithmetic shown ("… · 3 per wonder × 2")
   * rather than a column a player has to add up.
   */
  per?: 'city' | 'wonder';
  /** Which family this feeds. Absent feeds the pool and no family. */
  family?: Family;
}

/** Everything a card may say. One union, one evaluator (`statecraft.ts`). */
export type CardEffect =
  | CardCityYieldsEffect
  | CardEmpireYieldsEffect
  | CardPercentYieldsEffect
  | CardProductionBonusEffect
  | CardRulePercentEffect
  | CardHappinessEffect
  | CardAuthorityEffect
  | CardHappinessTierBoostEffect
  | CardCombatLineEffect
  | CardUnitStatEffect
  | CardWindfallRiderEffect
  | CardFoundingRiderEffect
  | CardCountScaledEffect
  | CardRateConversionEffect
  | CardOfferRiderEffect
  | CardRouteRiderEffect
  | CardEffectAmplifierEffect
  | CardMeterRuleEffect
  | CardConditionRuleEffect
  | CardActionRuleEffect
  | CardBehaviorRuleEffect
  | CardCityStatEffect
  | CardMetaRuleEffect
  | CardTileYieldEffect
  | CardPeriodicOfferEffect
  | CardUnlocksBuildingEffect
  | CardPantheonSlotsEffect
  | CardPurchaseRiderEffect
  | CardZocRuleEffect
  | CardProjectRiderEffect
  | CardRenownEffect;

/** Every `kind` in the union, for the register test that pins the evaluator. */
export type CardEffectKind = CardEffect['kind'];

// --- the rows ---------------------------------------------------------------

/** What every card carries, whatever class it is. */
export interface CardDefBase {
  name: string;
  /** One line in the voice of the tech tree's aphorisms. Never a rule. */
  flavor: string;
  line?: CardLine;
  /** The ratified rules text, for the screen. The effects are the truth. */
  text?: string;
  /** Why part of this card is not built. Printed on the card, in italics. */
  note?: string;
  /** Named halves that are deliberately absent. See `docs/statecraft-cards.md`. */
  deferred?: string[];
  /**
   * False for a card the upgrade slot must never roll. **Absent means yes.**
   *
   * The second half of the 2026-08-26 upgrade fix (user: "some cards don't have
   * an upgrade"). `scaleByLevel` now guarantees that any *figure* advances by at
   * least a point per level, which reaches every card that prints a number. It
   * cannot reach a card that prints none — an `actionRule` is a switch, and a
   * switch has no louder setting — and an offer that deepened one would be a
   * draft option that changed nothing, which is the one thing a draft may never
   * be.
   *
   * So such a card says so on its row and `drawOrderOffer` skips it. It is a
   * **declaration, not a shrug**: a card marked this way is a card somebody has
   * decided has no second face, and giving it one later is deleting this field
   * and writing the clause. `test/sim/statecraft.test.ts` holds the two halves
   * together — every upgradable card's level-2 face must differ from its
   * level-1 face, and every non-upgradable card must genuinely have nothing to
   * scale, so the flag cannot be used to paper over a row that simply needs a
   * bigger number.
   */
  upgradable?: boolean;
  effects: CardEffect[];
}

/** How many slots of each type a government opens. */
export type SlotSpread = Record<SlotType, number>;

export interface GovernmentDef extends CardDefBase {
  /** The culture tier at which this government is offered. 0 is the start. */
  tier: number;
  slots: SlotSpread;
}

export interface DoctrineDef extends CardDefBase {
  /** Which adoption's pool this belongs to. 0 means *no live pool* — deferred. */
  tier: number;
}

/**
 * Something an Order hands over **the first time it is slotted**, once per game.
 *
 * The Laureate's "gain a great person". It is not a `CardEffect` and must not
 * become one: every shape in that union is a *standing* reading of the board —
 * ask it twice and it answers the same thing — while this happens at a moment
 * and never again, which is the same split `CompletionGrant` draws for a
 * building and `WindfallOccasion` draws for an act. So it is a field on the row,
 * fired by `slotOrderAt` against a once-flag on the player
 * (`PlayerStatecraft.grantedOnSlot`), and a second Order that wants one is a
 * JSON row rather than a clause in the slot verb.
 *
 * It is deliberately a *named kind of grant* rather than a figure: "gain a great
 * person" is not renown, it is the recruitment the ladder would have opened, so
 * the settlement pours exactly what the ladder still needs through
 * `settleRenownWindfall` and the offer opens the way a Triumph opens one.
 */
export interface OrderSlotGrant {
  grant: 'greatPerson';
}

export interface OrderDef extends CardDefBase {
  pool: OrderPool;
  slot: SlotType;
  /** True for a card with no archetype thread. Presentation only. */
  neutral?: boolean;
  /** What slotting this hands over, once per game. See `OrderSlotGrant`. */
  onSlot?: OrderSlotGrant[];
  /**
   * **Withdrawn from the pool**: never dealt, never offered as an upgrade, and
   * still fully readable.
   *
   * A card the design has taken out (The Loose Rein, 2026-08-28) rather than a
   * card that never existed, and the distinction is the whole point: a save from
   * before the cut may hold it slotted, and a row deleted outright would be a
   * save that cannot be replayed — `anyCardDef` would throw on an id in the log.
   * So the row stays, its effects stay live for whoever holds it, and
   * `poolOrders` simply stops dealing it. Nothing else in the game asks.
   */
  retired?: boolean;
}

/** The escalating meter, and the seal. Every number the ladder is made of. */
export interface StatecraftMeterConfig {
  /** The first draft's cost. */
  costBase: number;
  /** Linear term on the draft count. */
  costLinear: number;
  /** Exponent on the draft count — the escalation Entry XV asks for. */
  costExponent: number;
  /** How long slotting an Order seals it. `metaRule` may rewrite this. */
  sealTurns: number;
}

export interface StatecraftConfig {
  meter: StatecraftMeterConfig;
  /** What a level-2 face multiplies its printed numbers by. */
  upgradeMultiplier: number;
  // There is deliberately **no `offer` block**. How many cards a draft deals was
  // moved to `rules.offers` by the offer-size pass (Entry XXXI) and folded by
  // `explainOfferSize`, because a wonder, a belief or a great person may widen
  // it and one evaluator has to answer for all five kinds; the two numbers that
  // sat here were dead the day that landed, and a dead number in a data file is
  // a dial a designer will one day turn expecting something to happen.
  /**
   * The **whole** ratified ladder of draft tiers at which a government is
   * offered — 4, 10, 18, 29, 45 (user, 2026-08-27) — including the two rungs no
   * government row reaches yet.
   *
   * It is written down here and nowhere else because the ladder is a *pacing*
   * decision and the rows are a *content* one, and the two are ratified at
   * different times: tiers 29 and 45 belong to Gov IV and Gov V, whose triples
   * are not designed. Recording them on the rows would mean inventing six
   * governments to hold two numbers.
   *
   * **Nothing in the simulation reads this.** `GOVERNMENT_TIERS` is still the
   * live answer and is still read off the rows, so an empire is offered a
   * charter at exactly the tiers a triple exists for and never at a rung with
   * nothing on it. This is the designer's note to the next pass: when Gov IV is
   * written, its rows carry `tier: 29` and `GOVERNMENT_TIERS` grows by itself.
   */
  tierLadder: number[];
  governments: Record<GovernmentId, GovernmentDef>;
  doctrines: Record<DoctrineId, DoctrineDef>;
  orders: Record<OrderId, OrderDef>;
}

export const STATECRAFT = statecraftJson as unknown as StatecraftConfig;

// --- ordered id lists -------------------------------------------------------

/**
 * Every id in **file order**, which is the order every draw, every sweep and
 * every screen walks them in.
 *
 * File order rather than sorted, for `DISCOVERY_IDS`' reason exactly: an outcome
 * that depends on an order must depend on an order the data itself carries, so a
 * designer reordering the JSON is making a decision rather than tripping over
 * one. `Object.keys` on an object literal is insertion order for string keys,
 * which is specified behaviour and stable across engines.
 */
export const GOVERNMENT_IDS = Object.keys(STATECRAFT.governments) as GovernmentId[];
export const DOCTRINE_IDS = Object.keys(STATECRAFT.doctrines) as DoctrineId[];
export const ORDER_IDS = Object.keys(STATECRAFT.orders) as OrderId[];

/** The government every game opens under. The tier-0 row, by definition. */
export const STARTING_GOVERNMENT: GovernmentId =
  GOVERNMENT_IDS.find((id) => STATECRAFT.governments[id]!.tier === 0) ?? GOVERNMENT_IDS[0]!;

// --- lookups ----------------------------------------------------------------

export function isGovernmentId(value: unknown): value is GovernmentId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATECRAFT.governments, value);
}

export function isDoctrineId(value: unknown): value is DoctrineId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATECRAFT.doctrines, value);
}

export function isOrderId(value: unknown): value is OrderId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATECRAFT.orders, value);
}

export function governmentDef(id: GovernmentId): GovernmentDef {
  const def = STATECRAFT.governments[id];
  if (!def) throw new Error(`Unknown government "${String(id)}"`);
  return def;
}

export function doctrineDef(id: DoctrineId): DoctrineDef {
  const def = STATECRAFT.doctrines[id];
  if (!def) throw new Error(`Unknown doctrine "${String(id)}"`);
  return def;
}

export function orderDef(id: OrderId): OrderDef {
  const def = STATECRAFT.orders[id];
  if (!def) throw new Error(`Unknown order "${String(id)}"`);
  return def;
}

/**
 * Any of **Statecraft's own three** classes by id.
 *
 * Deliberately not the five-class lookup: `CardId` also spans beliefs and rites
 * (ledger Entry XXVIII), and this file may not import `religionData.ts` at
 * runtime — the two are type-only in both directions, which is what keeps a type
 * cycle from becoming a runtime one. The lookup that answers for all five is
 * `anyCardDef` in `statecraft.ts`, beside the evaluator that needs it, and any
 * surface that can be handed a belief must use that one.
 */
export function cardDef(id: CardId): CardDefBase {
  if (isOrderId(id)) return orderDef(id);
  if (isDoctrineId(id)) return doctrineDef(id);
  if (isGovernmentId(id)) return governmentDef(id);
  throw new Error(`Unknown card "${String(id)}"`);
}

/**
 * A Statecraft card's name, or the raw id when nothing here knows it — which
 * includes every belief and every rite. See `cardDef` above and `anyCardName`.
 */
export function cardName(id: CardId): string {
  if (isOrderId(id) || isDoctrineId(id) || isGovernmentId(id)) return cardDef(id).name;
  return String(id);
}

// --- pools ------------------------------------------------------------------

/**
 * Every Order in one pool, in file order — **retired rows excluded**.
 *
 * The one reader of `OrderDef.retired`, which is what makes withdrawing a card a
 * one-field decision: every draw, every upgrade roll and every screen that lists
 * a pool comes through here, so a row taken out is out of all of them at once
 * and still readable by a save that holds it.
 */
export function poolOrders(pool: OrderPool): OrderId[] {
  return ORDER_IDS.filter((id) => orderDef(id).pool === pool && orderDef(id).retired !== true);
}

/**
 * Which Order pool a government opens.
 *
 * A government's *tier* decides it rather than its id, so the three tier-4
 * governments all open pool I and a fourth added to that tier needs no edit
 * here. The chiefdom is tier 0 and opens the chiefdom pool.
 *
 * The thresholds are the **rungs of the ladder**, read as "up to and including
 * the n-th rung", so they move with `tierLadder` and with nothing else. They
 * were 3 and 7 until the pacing retune of 2026-08-27 widened the ladder to
 * 4/10/18 — a player was reaching the third rung on turn twenty-nine, in Age I.
 */
export function poolOfGovernment(id: GovernmentId): OrderPool {
  const tier = governmentDef(id).tier;
  if (tier <= 0) return 'chiefdom';
  if (tier <= 4) return 'governmentI';
  if (tier <= 10) return 'governmentII';
  return 'governmentIII';
}

/** The pool before this one, or `null` at the start of the ladder. */
export function previousPool(pool: OrderPool): OrderPool | null {
  const index = ORDER_POOLS.indexOf(pool);
  return index > 0 ? ORDER_POOLS[index - 1]! : null;
}

/** The Doctrines offered at one adoption tier, in file order. Never tier 0. */
export function poolDoctrines(tier: number): DoctrineId[] {
  if (tier <= 0) return [];
  return DOCTRINE_IDS.filter((id) => doctrineDef(id).tier === tier);
}

/**
 * The culture tiers at which a government is offered, ascending — 4, 10, 18
 * today, read off the rows rather than restated.
 *
 * The **live** ladder, and it is deliberately narrower than `tierLadder`: this
 * is "where a triple actually exists", derived from the rows, while that is the
 * ratified pacing including the two rungs nothing has been written for yet.
 */
export const GOVERNMENT_TIERS: readonly number[] = [
  ...new Set(GOVERNMENT_IDS.map((id) => governmentDef(id).tier).filter((tier) => tier > 0)),
].sort((a, b) => a - b);

/** The fixed triple offered at a tier, in file order. Deterministic — never rolled. */
export function governmentsAtTier(tier: number): GovernmentId[] {
  return GOVERNMENT_IDS.filter((id) => governmentDef(id).tier === tier);
}

/** How many slots of each type a government opens, and how many in total. */
export function slotSpread(id: GovernmentId): SlotSpread {
  return governmentDef(id).slots;
}

/**
 * The slot *layout* a government produces: one entry per slot, in `SLOT_TYPES`
 * order, military first.
 *
 * A flat array rather than three counters, because the state stores what is *in*
 * each slot by index and an index has to mean the same thing in every reading of
 * it. Derived from the government rather than stored, so a save carries what is
 * slotted and never a second copy of the spread that could disagree with it.
 */
export function slotLayout(id: GovernmentId): SlotType[] {
  const spread = slotSpread(id);
  const layout: SlotType[] = [];
  for (const type of SLOT_TYPES) {
    for (let i = 0; i < Math.max(0, Math.floor(spread[type])); i++) layout.push(type);
  }
  return layout;
}

/** How many slots a government has in all. */
export function slotCount(id: GovernmentId): number {
  return slotLayout(id).length;
}

/**
 * Does an Order fit a slot of this type?
 *
 * A **wildcard slot takes anything**, and a typed slot takes only its own type —
 * the Civ VI rule, and the reason the wildcard count is the flexibility a
 * government sells. There is no wildcard *card*: the type on an Order is what it
 * is, and a card that fitted everywhere would make the spread meaningless.
 */
export function orderFitsSlot(order: OrderId, slot: SlotType): boolean {
  return slot === 'wildcard' || orderDef(order).slot === slot;
}
