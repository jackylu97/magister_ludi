/**
 * Typed access to `data/buildings.json`.
 *
 * The third sibling of `terrainData.ts` and `unitData.ts`: the JSON is the
 * single source of truth for what a building costs and what it does, this file
 * only types it.
 *
 * Effects are flat modifier fields, not a scripting hook
 * -----------------------------------------------------
 * A building's effect is a handful of numbers a city adds up — `food`,
 * `production`, `gold`, `science`, `culture`, `faith`, `sciencePerPop` — rather
 * than a named behaviour the simulation
 * switches on. That is a deliberate ceiling: everything Milestone 3 needs is a
 * sum, and a sum can be read out of a data file, totalled in one place
 * (`foldCity` in `cities.ts`) and displayed in the city panel without any
 * module knowing that a granary is a granary. When a building eventually needs
 * a behaviour rather than a number, it gets a field naming that behaviour — not
 * a callback in the JSON, which would stop being data.
 *
 * `sciencePerPop` is fractional (a monastery is "+1 per 4 pop", stored as 0.25)
 * and is floored at the point it is applied, per building, so two half-science
 * buildings do not round into a free point. See `foldCity`.
 *
 * The five fields that name a behaviour
 * -------------------------------------
 * Five of them exist now, and each is a *number the caller interprets* rather
 * than a switch anybody has to grow a case in. The first three arrived with the
 * Age I rework, the last two with the Age I sinks (Entry XXVI), and every one
 * of them is read in exactly one place:
 *
 *   · `authorityCapacity` — writ this building supplies, counted per building
 *     type by `explainAuthority` (`meters.ts`). There is no monument special
 *     case anywhere; a second building that raises the writ is a data row.
 *   · `productionBonus` — extra hammers a city puts behind one *category* of
 *     thing it is building, as `{ category, percent }`. Applied inside
 *     `foldCity`, the one production evaluator, so the estimate, the panel and
 *     the bank cannot disagree. It was `unitProductionBonus` — a fraction that
 *     could only ever mean "units" — until luxuries needed the same mechanism
 *     for buildings; generalising the field was strictly cheaper than growing a
 *     sibling special case beside it, and `productionModifiers` (`cities.ts`)
 *     now reads buildings and resources through one shape.
 *   · `tileYields` — what the building pays on the *ground* its city works
 *     rather than in the city's own totals, as lines the tile chain folds
 *     (`buildingTileLines` in `buildingEffects.ts`). The granary's point of food
 *     on water is the first. See `BuildingTileYield`.
 *   · `happiness` — contentment this building supplies, folded as one more line
 *     of `explainHappiness` (`meters.ts`) through `buildingEffects.ts`. There is
 *     no funeral-games case in the meter; a second one is a data row.
 *   · `cityStat` — what the town is worth to storm, and how far it sees, folded
 *     into `planCombat`'s defender breakdown and `sightSources`' radius beside
 *     the card lines that already land there.
 *   · `cityHp` — hit points the walls add to the town's maximum, folded by
 *     `cityMaxHp` (`combat.ts`). `cityStat`'s sibling: strength is what a
 *     defender fights with, hit points are what a besieger has to spend.
 *
 * The charters added four more of the same kind (2026-09-04), and each is read
 * in exactly one place through `buildingEffects.ts` like the three above it:
 * `crowdingRelief` in `explainHappiness` (`meters.ts`), `purchaseDiscount` in
 * `explainPurchaseCost` (`purchase.ts`), `healsAdjacent` in `healUnits`
 * (`turn.ts`), `ritePays` in `performRiteAt` (`religion.ts`). Every one of them
 * is a number the caller interprets; not one of them is a branch anybody has to
 * grow a case in, which is the ceiling this table has kept since it was written.
 *
 * The last three are read through `buildingEffects.ts` rather than from this
 * table directly, which is `resourceEffects.ts`'s bargain one scale down: the
 * *table* says what a building is, and one evaluator says what an empire's
 * buildings are worth. Nothing else in the game asks a building for either.
 *
 * One of each per city. Nothing here says so — that is a city rule and it lives
 * in the `setCityProduction` validation and in `advanceProduction`.
 *
 * Nor does anything here say *when* a building becomes available: that is the
 * tech tree's business (`data/techs.json`, read through `isUnlocked` in
 * `tech.ts`), so a designer moves a building's era by editing one line of the
 * tree rather than two files that could disagree.
 */

import buildingsJson from '../../data/buildings.json';
// Type-only, and it must stay that way: `techData.ts` imports `BuildingId` from
// here, so a *value* import of the tech table would close a load-time cycle and
// leave whichever module evaluated second reading an uninitialised binding.
// Nothing checks that these ids are real technologies here for that reason —
// `unlockDataProblems` in `techUnlocks.ts` does it, from a module that already
// sees both tables.
// Type-only for `TechId`'s reason, one table over: `greatPeopleData.ts` imports
// nothing from here at runtime and this imports only its `Family`.
import type { Family } from './greatPeopleData';
// Type-only, and it **must** stay that way: `beadData.ts` imports this module
// for values (`buildingDef`, `isBuildingId`), so a value import back would close
// a load-time cycle. A `import type` is erased entirely, which is why the edge
// is safe in this one direction.
import type { BeadGrantId } from './beadData';
import type { TechId } from './techData';
// Type-only for `TechId`'s reason, one table over: `statecraftData.ts` imports
// `BuildingId` from here.
import type { CardEffect, CityScope, TileCondition, UnitFilter } from './statecraftData';
// Type-only for `TechId`'s reason: `unitData.ts` imports nothing from here.
import type { UnitTypeId } from './unitData';

/**
 * The kinds of thing a city can be building, and therefore the kinds a
 * production bonus can name.
 *
 * A **subset** of `QueueItem['kind']` (`state.ts`) since projects landed, and
 * the gap is the type doing its job rather than drift: a `ProductionCategory` is
 * what a bonus may *name*, and a project deliberately is not one — its rate is a
 * printed conversion (Entry XXVI), so a barracks putting ten percent behind
 * Tithes would be a barracks minting money. `productionModifiers` (`cities.ts`)
 * is the one place a queue item's kind is checked against this type, and it
 * answers an empty list for a project.
 *
 * Declared here rather than in `state.ts` because that module is the game's
 * *state*, and both tables that hand out a category bonus — buildings and
 * resources — are read by modules that must not depend on it. `cities.ts` is
 * where the two meet.
 *
 * **`wonder` is its own category and not a kind of building** (the wonders
 * framework, 2026-08-27). A wonder is a `'building'` *queue row* — it is built
 * out of the same basket by the same routine — but it is a category of its own
 * here for the reason the category exists at all: a percentage names one, and
 * the great-person legacies the design has already ratified say "+30%⚙ toward
 * wonders" rather than "+30% toward buildings". So a barracks' `building`
 * bonus does **not** ride on a wonder and a wonder bonus does not ride on a
 * granary; `queueCategory` (`cities.ts`) is the one place a row is sorted into
 * one of the three, and nothing supplies a `wonder` percentage yet.
 */
export type ProductionCategory = 'unit' | 'building' | 'wonder';

/**
 * What a building is *for* — the one word on every row that says which shelf it
 * belongs on. See `BuildingDef.category`.
 *
 * Deliberately **not** `ProductionCategory`, and the two must never be merged: a
 * production category is what a *percentage may name* (three words, one of them
 * `wonder`), while this is what a building *pays* (seven words, and every wonder
 * has one like any other row). The Colossus is a `wonder` to a bonus and a
 * `gold` building to a caravan, and both readings are true at once.
 *
 * The seven are the six yields plus `military`, which is the one purpose that is
 * not a yield at all — a barracks and a palisade pay nothing and are plainly
 * what an army is built out of. Trade reads the split as "what a city consumes"
 * (food, culture, science → the caravan brings food) against "what a city makes"
 * (production, military, gold → it brings hammers); `faith` is in the vocabulary
 * and deliberately pays a route nothing, which is the user's table exactly.
 */
export type BuildingCategory =
  | 'food'
  | 'culture'
  | 'science'
  | 'production'
  | 'military'
  | 'gold'
  | 'faith';

/**
 * **How big a building is**, which is the whole of what its row says about the
 * price. See `BuildingDef.size` and `ProductionRules.sizeHammers`.
 *
 * Four sizes and a fifth that is not one: a `free` row is never built and never
 * bought with hammers, and it says so here rather than by carrying a zero
 * somebody would one day multiply.
 */
export type BuildingSize = 'small' | 'medium' | 'large' | 'wonder' | 'free';

/**
 * A stat of the city a building stands in. See `BuildingDef.cityStat`.
 *
 * `stat` is deliberately the same two words `CardCityStatEffect` uses, so that
 * `buildingCityStat` and `cardCityStat` can be asked the same question and
 * their answers concatenated without a translation in the middle.
 */
export interface BuildingCityStat {
  stat: 'defense' | 'sight';
  amount: number;
}

/**
 * The renown a building or a wonder pays, and which family it feeds.
 *
 * The **floor** of the renown bucket (`docs/great-people.md`): a library is one
 * renown a turn tagged scholar, a wonder is ten on completion and two a turn
 * thereafter. A column on the row rather than a table of its own, for
 * `productionBonus`' reason exactly — it is a fact about what this building *is*
 * — and read in one place (`explainRenown`, `renown.ts`), so a second renown
 * building is a JSON row.
 *
 * `family` is doing two jobs at once and that is the design: it says who is fed,
 * and the feed record is what **biases the draw** (`Player.renownByFamily`), so
 * an empire of libraries is offered scholars without any rule saying so.
 */
export interface BuildingRenown {
  family: Family;
  /** Paid every turn, for as long as the building stands. */
  perTurn: number;
  /** Paid once, the turn it is finished. Wonders only, today. */
  onComplete?: number;
}

/**
 * **Which bank sells this row.** See `BuildingDef.purchase`.
 *
 * One field, and the currency is spelled out here rather than imported from
 * `purchase.ts` for the reason `UnitPurchaseSpec` spells it out: this table is a
 * leaf that `purchase.ts` reads, and an import the other way would be a cycle to
 * carry two words.
 */
export interface BuildingPurchaseSpec {
  currency: 'faith' | 'gold';
}

/** A percentage of a city's hammers, behind one category. See `BuildingDef`. */
export interface ProductionBonus {
  category: ProductionCategory;
  /** Signed whole percent. `10` is the barracks' ten percent toward units. */
  percent: number;
  /**
   * Which units the hammers reach, where the row narrows them — the Shipyard's
   * ships, and nothing else on the slips.
   *
   * `CardProductionBonusEffect.class` one table over, and the *same*
   * `UnitFilter` read by the same predicate in the same place
   * (`productionModifiers`), so "ships" is one question with one answer whether
   * a building or a card asks it. Absent reaches everything of the named
   * category, which is what every row written before it meant.
   *
   * Meaningless on a `category` that is not `'unit'`, which is a fact about the
   * row rather than a rule here: a filter of silhouettes has nothing to say
   * about a granary.
   */
  class?: UnitFilter;
}

/**
 * Something a building hands its owner **the moment it is finished**, once.
 *
 * The wonders' shape (2026-08-27) and declared on `BuildingDef` rather than on a
 * wonder-only type, because there is nothing wonder-shaped about it: the day an
 * ordinary building wants to hand over a unit it fills this in, and
 * `realiseItem` will not notice the difference.
 *
 * Four grants, and each is a *seam that already exists* rather than a new one —
 * which is the whole test a grant has to pass to be in this union:
 *
 *   · **`unit`** — through `createUnit` and `spawnTileFor`, exactly as a built
 *     one is, so the spawn convention has one implementation. `'bestMelee'`
 *     resolves to the strongest melee type this empire can currently build
 *     (the Statue of Zeus' "a free melee unit of your best type"), so a row
 *     never has to name a unit the tree may retune out from under it.
 *   · **`tech`** — through `settleResearchWindfall`, so the register's refresh
 *     fires and every city of the empire is re-seated on ground a new
 *     technology just made worth more. A seat with nothing chosen loses it, and
 *     the result says so: the alternative is a second research offer, which
 *     would be a second research interface.
 *   · **`doctrineDraft`** — through `drawDoctrineOffer` at the seat's current
 *     government tier, **skipped** when the seat has no live pool or is already
 *     holding an unanswered Doctrine. That is `periodicOffer`'s precedent word
 *     for word: an offer is a decision the player owes the game, and a second
 *     one dealt on top of it would destroy the first.
 *   · **`building`** — through `realiseItem` itself, which is the seam that
 *     means "this town now has the thing" (the Theatre of Dionysus' free
 *     Amphitheater). So a granted building claims a wonder, rolls a
 *     consecration, pays its completion riders and joins the town's list
 *     exactly as a built one does, and there is still one implementation of
 *     what it means to gain a building. A town that already holds the row gets
 *     nothing rather than a second copy, which is also what stops a row that
 *     granted *itself* from recurring — `realiseItem` pushes before it asks.
 */
export type CompletionGrant =
  | { grant: 'unit'; unit: UnitTypeId | 'bestMelee' }
  | { grant: 'tech' }
  | { grant: 'doctrineDraft' }
  | { grant: 'building'; building: BuildingId }
  /**
   * A **glass bead**, through `awardBeadGrant` (`beads.ts`) — the fifth class
   * of bead row and the reason it exists (Entry LVIII, the endgame). The Opus'
   * golden bead and the three great works of the Observatory are all this one
   * arm, and it passes the same test every other grant in this union passes: it
   * reaches a seam that already exists and adds nothing beside it, so the bead
   * is announced, recorded and diffed by exactly the machinery that announces,
   * records and diffs every other bead in the game.
   *
   * Once per empire, which is the grant class's own rule: a row is refused by
   * `beadGrantedTo` if this realm already holds it, and the report says
   * `done: false` rather than paying twice.
   */
  | { grant: 'bead'; bead: BeadGrantId }
  /**
   * A **great-person draft**, through `drawGreatPersonOffer` — and optionally
   * narrowed to one family, which is what The Turning Heavens' "a draft of
   * scholars" needs.
   *
   * `doctrineDraft`'s sibling one roster over and it inherits that arm's word
   * for word rule: an offer is a decision the player owes the game, so a seat
   * already holding an unanswered name keeps the one it has and the report says
   * the grant did not land. `family` absent is the ordinary draw over the whole
   * pool.
   */
  | { grant: 'greatPerson'; family?: Family }
  /**
   * A **free rung of the faith ladder**, through `openFreeRung` (`religion.ts`)
   * — Stonehenge's, and the reason it exists (ruled 2026-09-06: the stones stop
   * leaving an augur behind and hand over the god the augur was for).
   *
   * It passes this union's one test: the seam already exists. The ladder's own
   * deal opens the ordinary consecration hand, blocks End Turn until it is
   * answered and is drawn from `state.rng` inside the log — all of it, unchanged.
   * What "free" takes out is the *quote*: the offer carries no `rungCost`, so the
   * pick spends nothing and no rung is climbed, which is `PlayerPantheon.rungs`'
   * own rule ("a wonder's god is not a rung") rather than a new one.
   *
   * `doctrineDraft`'s clause word for word on top of that: a seat already holding
   * an unanswered hand keeps the one it has and the report says the grant did not
   * land, because a second offer dealt on the first would destroy it.
   */
  | { grant: 'faithRung' };

export type BuildingId =
  // The fourteen rows the tree pass of 2026-08-30 added, in the order the ages
  // open them: the Heroes band's hall, stele and bazaar, the Empire band's
  // harbour, baths, forum, examination hall, court, shipyard and castle, and
  // the Cathedrals band's forge, caravanserai, printing house and observatory.
  | 'hallOfDeeds'
  | 'steleOfLaws'
  | 'bazaar'
  | 'harbour'
  | 'baths'
  | 'forum'
  | 'examinationHall'
  | 'courthouse'
  | 'shipyard'
  | 'castle'
  | 'forge'
  | 'caravanserai'
  | 'printingHouse'
  | 'observatory'
  | 'monument'
  | 'granary'
  | 'shrine'
  | 'barracks'
  | 'palisade'
  | 'stoneWalls'
  | 'funeralGames'
  | 'library'
  | 'temple'
  | 'market'
  | 'aqueduct'
  | 'workshop'
  | 'watermill'
  | 'amphitheater'
  | 'monastery'
  | 'university'
  // **In the data ahead of the age that opens them** (`awaitsTech`, the Bead
  // Race's Æra IV endeavours). Three rows the tree does not name yet; the pass
  // that lands Æra IV deletes the marker and adds them to a node's `unlocks`.
  | 'cathedral'
  | 'mint'
  | 'armoury'
  // **Opened by a card, not by a node** — the one row in the table with no
  // technology behind it (`unlockedByCard`, `purchaseOnly`). The Gilded Court
  // hands it over and the treasury is the only way to raise it.
  | 'gildedHall'
  // **The charters' eleven** (2026-09-04, `docs/orders-and-doctrines.md`), in
  // the order their pools open: an Order in a slot is what opens each of them,
  // no node names any of them, and what a town has already raised stays raised.
  // The Coinworks and the Orrery are rows of their own rather than early ways
  // into the Mint and the Observatory (the user's amendment, same day): a
  // charter's building is the charter's, so the tree's two Æra IV rows are
  // exactly what they were before the charters shipped.
  | 'chapel'
  | 'keep'
  | 'scriptorium'
  | 'assayHouse'
  | 'cistern'
  | 'assemblyHall'
  | 'smithy'
  | 'coinworks'
  | 'almshouse'
  | 'orrery'
  | 'assizeCourt'
  // The six rows the tree re-cut of 2026-09-02 adds (Entry LVIII), in the order
  // the ages open them: Sailing's lighthouse, the charter a chartered city is
  // founded with, Horology's clocktower, Banking's bank, Fortification's
  // bastion, and the closing node's own workshop of the age.
  | 'lighthouse'
  | 'townCharter'
  | 'clocktower'
  | 'bank'
  | 'bastion'
  | 'alchemicalSociety'
  // The Holy Office's tenant (Entry LVIII, the faith rework): the tier-4 faith
  // building, and the one row that opens a bank (`faithPurchases`).
  | 'reliquary'
  // **Batch E4b's two** (`docs/audit/deferred-rows.md`), each the answer to a
  // row that had been waiting on one: the **Stable** at The Wheel, which is what
  // The Horse-Tribes' struck clause was written for, and the **Bourse** at Paper
  // Money — a `oncePerEmpire` house because a `pays` rate is read from the
  // empire's own books and an ordinary building is only ever read by its town.
  | 'stable'
  | 'bourse'
  // **The endgame** (Entry LVIII): the Opus the world opens at the first
  // Alchemy, and the three great works of the Observatory that pay a bead
  // apiece. All four are `oncePerEmpire`; only the first `endsTheGame`. They are
  // buildings and deliberately not projects — a project never leaves the queue
  // (Entry XXVI), which is exactly the wrong shape for a one-time capstone.
  | 'theMagnumOpus'
  | 'chartTheStars'
  | 'theTurningHeavens'
  | 'theAlchemicalCodex'
  // **Placed, never built** (the fewer-things pass, 2026-09-06): an apostle
  // leaves one in a town that has topped out a cathedral. It carries `placed`,
  // so no technology, no card and no bank opens it — see `BuildingDef.placed`.
  | 'relic'
  // **The uniques** (`docs/history/tech-gifts.md` §7, ruled 2026-09-06): one to a realm,
  // each on its own node, each at about half its age's wonder. Two more of the
  // set are rows that already existed and were re-cut in place rather than added
  // — the Forum at Philosophy and the Caravanserai at Mathematics — which is
  // why only three names join here.
  | 'heroicEpic'
  | 'imperialThrone'
  | 'highTemple'
  // **The four faith houses** (batch B3, `docs/beliefs.md` — the user's marks of
  // 2026-09-08): a follower belief apiece opens each of them, they are bought
  // with faith and never built (`purchase`, `purchaseOnly`), and each may stand
  // only in a town that keeps the faith which opened it (`followingOnly`). No
  // node names any of them; they take the Temple's column, because the Temple is
  // what a faith house of that age costs.
  | 'mosque'
  | 'wat'
  | 'gurdwara'
  | 'darEMehr'
  // --- the wonders ---------------------------------------------------------
  //
  // Twenty-seven, ratified from `docs/wonders.md` and homed on the tree as it
  // stands today (2026-08-27). They are ordinary rows carrying `wonder: true`
  // and are listed here in age order only because the table is; nothing reads
  // this order, and nothing anywhere compares an id against one of these names
  // — `isWonder` is the one marker and `WONDER_IDS` the one roster.
  //
  // Æra I — the Age of Omens.
  | 'theOracle'
  | 'stonehenge'
  | 'pyramids'
  | 'hangingGardens'
  | 'wallsOfUruk'
  | 'greatZiggurat'
  | 'greatLighthouse'
  | 'templeOfArtemis'
  // Æra II — the Age of Heroes.
  | 'greatLibrary'
  | 'colossus'
  | 'petra'
  | 'circusMaximus'
  | 'terracottaArmy'
  | 'greatWall'
  | 'theatreOfDionysus'
  | 'mausoleum'
  | 'statueOfZeus'
  // Æra III — the Age of Empire.
  | 'chichenItza'
  | 'hagiaSophia'
  | 'angkorWat'
  | 'greatMosqueOfDjenne'
  | 'notreDame'
  | 'houseOfWisdom'
  | 'forbiddenCity'
  | 'alhambra'
  | 'machuPicchu'
  | 'waterClockOfSuSong';

/**
 * What a building pays a city every turn.
 *
 * Every field is optional here and required on `BuildingDef`, which is the
 * difference between a *delta* and a *definition*: a renewal that says only
 * `{ "food": 1 }` is saying the one thing it does, while a building row that
 * left a field out would be a row a designer has to remember the default of.
 */
export interface BuildingYield {
  food?: number;
  production?: number;
  gold?: number;
  /** Flat beakers, as opposed to the per-citizen term. */
  science?: number;
  culture?: number;
  /**
   * Flat faith. The sixth voice, and the last of them to reach this table:
   * faith was a *tile* yield and a luxury's until the shrine and the temple
   * were moved off culture onto it (user, 2026-08-26), which is the whole of
   * why a building may pay it at all. Accumulate-only downstream, exactly as
   * every other faith source is — see `Player.faithPool`.
   */
  faith?: number;
  /** Science per population point, floored when applied. See the docblock. */
  sciencePerPop?: number;
}

/**
 * What a building pays on **the ground its city works**, rather than in the
 * city's own totals — the harbour's point of food on every water hex.
 *
 * **The one thing a technology may still switch on for a building already
 * standing** (the renewals axe, 2026-09-04). A building's own row used to carry
 * an `upgrades` list too — the mirror of `ImprovementUpgrade` — so that a
 * granary quietly grew a fourth point of food the turn The Wheel landed; the
 * user ruled that free growth dead, the rows were cut, and the shape went with
 * them. What survives is this one, and it survives because it is not the same
 * bargain: an upgrade was a number added to a *building's* line and was worth
 * the same in every town, while this is a number added to a *tile's* line and
 * is worth whatever the town's ground turns out to be — a harbour in a
 * landlocked city gets nothing from it, and the player can see exactly why,
 * because the line shows up in the hex's own breakdown (hard rule 5) rather
 * than in a lump on the building.
 *
 * The condition is `TileCondition` (`statecraftData.ts`), shared with the cards
 * and the luxuries, so "which hexes" is one predicate for all three; and the
 * shape is generic in it rather than in "water", so a lighthouse that paid the
 * coast or a mill that paid the hills is a data row.
 *
 * `requiresTech` is the tech gate and it belongs here rather than on the
 * building's own `unlocks`, because it gates *this line* and not the building:
 * the granary is an Earthenware building whose water line waits for Sailing, so
 * it is Sailing's card that announces it (`techGifts`).
 */
export interface BuildingTileYield {
  /** Which hexes this lands on. See `tileConditionHolds`. */
  on: TileCondition;
  /** The technology the city's owner must hold, or absent for "from the start". */
  requiresTech?: TechId;
  /** Added to the tile's yield, never replacing it. */
  add: BuildingYield;
}

export interface BuildingDef {
  name: string;
  /**
   * What this building is *for*, in one word — the row's main yield or purpose.
   *
   * Read by exactly one rule (`explainRouteYield` in `routeYields.ts`, which pays a
   * caravan a point of food for every food, culture or science building at its
   * destination and a hammer for every production, military or gold one), and
   * that is deliberately all: it is a *label*, not a second `ProductionCategory`
   * — nothing multiplies a yield by it, nothing gates a build on it. The two
   * words are not the same question, which is why they are not the same type: a
   * wonder's production category is `'wonder'` and its trade category is
   * whatever the wonder pays.
   *
   * Required on every row rather than optional, so a designer adding a building
   * decides what it is instead of inheriting a default that would quietly make
   * every new building worth a hammer to somebody's caravan.
   */
  category: BuildingCategory;
  /**
   * The indefinite article this name takes, when the vowel rule gets it wrong —
   * **"a University"**, and one day "an hour-glass".
   *
   * `indefinite` in `statecraft.ts` is a *sound* rule written as a spelling
   * test, and its own docblock says what to do the day a row breaks it: earn a
   * field beside the name rather than a special case in the function. The
   * synergy pass of 2026-09-05 is that day — Scholars' Stipend was the first
   * card ever to scope a clause to the University, and it printed "an
   * University" on the compendium's page.
   *
   * Absent is the vowel test, which is exact for every other row on this
   * roster, so nothing that already reads correctly has to declare anything.
   */
  article?: 'a' | 'an';
  /**
   * **How big a thing this is** — and the whole of what the row says about its
   * price (batch P1, 2026-09-07, `docs/production-costs.md`).
   *
   * The rule is `sizeHammers[size] × columnRate ^ (column − 1)`, so a row
   * carries a *size* and never a figure: what a Library is worth against a
   * Cathedral is a design statement about the kind of building it is, and what
   * either costs in hammers is a statement about how late in the tree it stands.
   * A row that carried its own number said both at once, which is why a retune
   * of either ladder used to move the other's meaning.
   *
   * `free` is the size of a row that is **never built and never bought with
   * hammers** — the Relic an apostle leaves behind. It is a size rather than an
   * absent field so that every row answers the same question, and so the fold
   * still prints one honest line for it.
   *
   * The old `cost` field is gone rather than deprecated: a row still carrying
   * one fails the register test (`test/sim/productionCosts.test.ts`), because a
   * stale number in the data is a number some future reader will believe.
   */
  size: BuildingSize;
  /**
   * The tech-tree column this row is priced at, for a row **no technology
   * unlocks** — a charter's building, a row kept warm ahead of its node.
   *
   * Ignored when the tree names the row (`BUILDING_UNLOCK_TECH`, or
   * `worldUnlockTech` for the Opus): "when does this belong" is already written
   * down once, in the tech table's `unlocks`, and a second copy on the row is a
   * second copy to forget. A charter takes the first column of the age its
   * pool opens in — see `docs/production-costs.md` for the table of record.
   */
  column?: number;
  /** Flat food added to the city's total every turn. */
  food: number;
  /** Flat production added to the city's total every turn. */
  production: number;
  /** Flat gold added to the city's total every turn. */
  gold: number;
  /**
   * Trade routes this building lets its empire run at once, or absent for none
   * — the market's one, and the Colossus'.
   *
   * Counted per *building standing on the board* by `explainRouteSlots`
   * (`trade.ts`), so four markets are four routes and a captured market changes
   * whose caravans it pays for with no bookkeeping. Absent means none, which is
   * every row but two.
   *
   * A card may widen the same fold with a `routeRider` effect (the Great
   * Lighthouse carries the first one) — the field and the rider are two sources
   * of one number, exactly as `authorityCapacity` and a card's `authority` are.
   */
  routeSlots?: number;
  /** Flat science added to the city's total every turn, before `sciencePerPop`. */
  science: number;
  /** Flat culture added to the city's total every turn. */
  culture: number;
  /**
   * Flat faith added to the city's total every turn, or absent for none.
   *
   * The one **optional** field among the six voices, and deliberately: every
   * other one is required so that a designer reading a row never has to
   * remember a default, but faith arrived after the table was written and
   * making it required would have meant `"faith": 0` on twenty rows that have
   * nothing to do with it. Absent means zero, and `explainBuildingYield` is
   * where that is read.
   */
  faith?: number;
  /** Science per population point, floored when applied. See the docblock. */
  sciencePerPop: number;
  /**
   * Authority capacity this building supplies its owner, or absent for none.
   * Counted per building type by `explainAuthority`; see the docblock.
   */
  authorityCapacity?: number;
  /**
   * Extra hammers this building puts behind one category of thing the city may
   * be building — the barracks' ten percent toward units. Absent means none.
   *
   * A signed **whole percent**, unlike the fraction the unit-only field it
   * replaced stored: the number is printed as a percentage everywhere it is
   * shown, and one representation shared with `ResourceEffect`'s
   * `productionBonus` is one fewer ×100 for a surface to forget.
   */
  productionBonus?: ProductionBonus;
  /**
   * Happiness this building supplies its owner, counted once for **the city
   * that holds it**. Absent means none.
   *
   * The fifth field that names a behaviour, and the first building in the game
   * to touch a meter's *supply* side rather than its capacity side. Deliberately
   * the same reading a luxury's `extraHappiness` has — a number the meter's own
   * evaluator folds as one more line of `explainHappiness`, never a rule
   * anything switches on — so the second happiness building is a data row, and
   * the day one wants "in every city" it declares that the way a luxury does
   * (`per`), rather than growing a case here.
   */
  happiness?: number;
  /**
   * **What share of its town's crowding this building forgives**, as a whole
   * percent — the Assize Court's fifteen. Absent means a town that is as
   * crowded as its size says.
   *
   * `happiness`' sibling and deliberately not the same field: happiness supplied
   * is a *gain* a town pays its empire, and this is a *discount on one named
   * cost line* — the crowding a big town charges on top of its per-citizen
   * demand (`crowdingDemand`, `meters.ts`). A court that simply paid two points
   * of contentment would be worth the same in a hamlet and in a capital of
   * twelve, which is the opposite of what the row says.
   *
   * Read in exactly one place, `explainHappiness` (`meters.ts`), through
   * `buildingCrowdingRelief` (`buildingEffects.ts`), and folded as a **gain
   * line** against the full crowding cost rather than as a quieter cost line —
   * the puppet's discipline three lines down, and hard rule 5: a player being
   * charged less is entitled to see the discount and which town it came from.
   * It relieves the crowding only; the per-citizen demand and the cost of
   * governing are untouched.
   */
  crowdingRelief?: number;
  /**
   * A stat of **the city itself** — what it is worth to storm, and how far it
   * sees. Absent means none.
   *
   * Structurally `CardCityStatEffect` (`statecraftData.ts`) minus its `scope`,
   * and that is the point: a wall a card raises and a wall a city *builds* are
   * the same fact about the same city, so they fold into the same two lists
   * (`planCombat`'s defender breakdown, `sightSources`' radius) through
   * `buildingEffects.ts`. A building has no scope because it stands in exactly
   * one town — the scope *is* the building.
   */
  cityStat?: BuildingCityStat;
  /**
   * Hit points this building adds to **its own city's** maximum, on top of
   * `combat.cityBaseHp`. Absent means none.
   *
   * `cityStat`'s sibling and deliberately a field of its own rather than a third
   * `stat` on it (user, 2026-08-28: "defensive buildings raise defensive
   * strength and city health"). The two are different questions with different
   * consumers: `cityStat.defense` is *strength*, a term in the damage curve, and
   * this is *capacity*, the bar a besieger has to empty. A palisade raises both
   * and says so in two fields; a watchtower raises one.
   *
   * Read only through `buildingCityHp` (`buildingEffects.ts`), folded by
   * `cityMaxHp` (`combat.ts`), and — like everything else a wonder pays — it
   * follows the stones: a captured town keeps its buildings, so it keeps the
   * walls' hit points under its new flag.
   */
  cityHp?: number;
  /** What this pays into the renown bucket, or absent. See `BuildingRenown`. */
  renown?: BuildingRenown;
  /**
   * **This row is in the data ahead of the age that opens it.** Absent means an
   * ordinary building, which is every row but three.
   *
   * `UnitDef.awaitsTech`'s twin one table over, and it exists for that field's
   * reason exactly: the Bead Race's Æra IV endeavours are races toward a
   * cathedral, a mint and an armoury, so the rows shipped with the endeavours
   * that name them — and no technology names *them* yet. Without this marker
   * "no tech names it" reads as "available from turn one" (`isUnlocked`), which
   * would put a cathedral in the opening build list.
   *
   * Refused in the two places a thing is acquired (`buildError`,
   * `purchaseError`) and nowhere else, beside `purchaseOnly` in the same
   * switch. It is also read by `beadDataProblems`, which derives **dormancy**
   * from it: an endeavour whose prerequisite names a building nobody can build
   * is a card that is never dealt.
   *
   * **Temporary by construction.** The Æra IV tech pass deletes the field from
   * three rows and adds them to a node's `unlocks`, and nothing else changes.
   */
  awaitsTech?: boolean;
  /**
   * **A parent that must already stand in the same town** — the University's
   * Library, the Castle's Stone Walls (`docs/history/fewer-things.md` §2, RULED). Absent
   * means a row anybody may raise, which is most of them.
   *
   * The shape the cut list is built on: ten chains replace thirty-eight
   * unrelated rows, so a tall town's third decision is a *consequence* of its
   * first rather than another line on the same list. One field, one clause,
   * three surfaces — `buildError` refuses the queue and the purchase in the
   * parent's own name, the add-list greys the row with that sentence, and the
   * Compendium prints a "Needs standing here" row off the same field.
   *
   * **A grant ignores the chain**, and that is a ruling rather than an oversight
   * (`docs/history/fewer-things.md` §6.4). The two paths that hand a town a building —
   * `realiseItem`'s `CompletionGrant` (the Theatre of Dionysus' Amphitheater)
   * and `cardFoundingRider`'s founding list (Charter Towns' Granary) — never ask
   * `buildError` about anything, so neither asks about this: a wonder that
   * promises an Amphitheatre keeps its promise in a town with no Monument. The
   * chain is a rule about what a town may *decide to build*, not about what may
   * stand in it.
   *
   * A chain of one link only: the parent is asked about, never *its* parent, so
   * a Castle asks for Stone Walls and the walls' own Palisade is the walls'
   * problem. That falls out of the clause being a single reading rather than a
   * walk, and it is the right reading — a town holding Stone Walls held a
   * Palisade to build them.
   */
  requiresBuilding?: BuildingId;
  /**
   * **This row has left the buildable set** — the twelve ordinary buildings the
   * fewer-things pass cut (`docs/history/fewer-things.md` §2). Absent means a live row,
   * which is every row but those.
   *
   * `awaitsTech`'s mirror image and deliberately a second marker rather than a
   * reuse: that one says *not yet* and this one says *never again*, the two
   * sentences a player reads are opposites, and a row that carried both would be
   * a row of nothing. The row itself **stays in the table forever**, because
   * `buildingDef` must resolve every id anything can still name — a copy
   * standing in a town, a card or a wonder that grants one, a save being
   * replayed. It is *not* keeping an older save loadable: `loadGame` tests the
   * schema for exact equality and a retirement is itself a bump, so the oldest
   * save that can name a Mint is one this build wrote. This is the standing
   * convention for a cut row (`OrderDef.retired`, one table over).
   *
   * Refused in `buildError` (and therefore in `purchaseError`, which asks it),
   * hidden from the city panel's add-list and from the Compendium, and invisible
   * to the bot for free — every one of the bot's building readings is gated on
   * `buildError`. What it does **not** touch is a copy already standing: a town
   * that built a Mint keeps its three gold, its upkeep and its renown, because
   * every one of those is read off `city.buildings` and none of them asks this.
   */
  retired?: boolean;
  /**
   * **Nothing builds or buys this — something hands it over** (the Town Charter,
   * which a city founded under Daughter Cities is founded with). Absent means an
   * ordinary row.
   *
   * `purchaseOnly`'s third sibling, and the union of the three is the whole of
   * how a row may be acquired: hammered, bought, or given. It is not `retired` —
   * the row is live and towns really do gain one — and it is not `awaitsTech`,
   * because no technology is coming. Refused in `buildError` with the sentence,
   * and the row's own `note` says who does the granting.
   */
  grantedOnly?: boolean;
  /**
   * **What this building takes off the maintenance of every unit raised in its
   * town**, per turn — the Imperial Throne's one gold (`docs/history/tech-gifts.md` §7).
   * Absent means a building the payroll passes by.
   *
   * A number the caller interprets, `purchaseDiscount`'s bargain one ledger
   * over, and it is emphatically **not** `Unit.freeUpkeep`: that flag says "this
   * empire never paid for this piece" and is written at five named seams, while
   * this is a *partial* rebate on a piece the empire did pay for and did raise.
   * A row that set the flag instead would have made the Throne a way to field a
   * free army.
   *
   * It is **stamped on the piece at the moment it is raised** (`Unit.upkeepRebate`,
   * written in `realiseItem`) rather than read off the board every turn, because
   * the promise the card makes is about *where a unit was built* — a fact that
   * stops being on the board the moment the piece marches out of the town, and
   * one no later reading could recover. The stamp is therefore permanent: a
   * legion raised under the Throne is cheap to keep for the rest of its life,
   * and razing the Throne does not put it back on full pay.
   *
   * Read in exactly one place, `explainUnitUpkeepRebate` (`upkeep.ts`), as one
   * more labelled give-back line beside the law's and the salt's — so the ledger
   * still shows what the army costs and then what the Throne forgives, and
   * `disbandCandidate` still picks off the gross figures like every other rebate
   * in the game.
   */
  unitUpkeepRebate?: number;
  /** What this pays on the *ground*. See `BuildingTileYield`. */
  tileYields?: BuildingTileYield[];
  /**
   * **A wonder: one of these stands in the whole world, ever.** Absent means an
   * ordinary building, which is every row but one today.
   *
   * A flag rather than a second table, and that is the whole framework: a
   * wonder is unlocked by a technology like any building, queued like any
   * building, paid for out of the same basket by the same completion routine,
   * and pays its `yields` through `foldCity` like any building. Four things
   * key off this flag and nothing else does — the production category
   * (`queueCategory`), the one-per-world claim (`GameState.wonders`, written by
   * `realiseItem`), the refusal to sell one (`purchaseError`) and the sculpt
   * (`CityLook.wonders`).
   */
  wonder?: boolean;
  /**
   * What this building *does* beyond its yields, in the Statecraft vocabulary —
   * read by the one evaluator that reads a card (`statecraft.ts`).
   *
   * **A wonder's effect is a card, not a system.** The same bargain a belief and
   * a rite already struck (ledger Entry XXVIII): twenty-eight effect shapes go in
   * as JSON, labelled lists come out, and `statecraft.ts` stays the only module
   * in the game that switches on a `CardEffect.kind`. So The Hanging Gardens'
   * "+3🌾 and +1 happiness in this city" is two rows of data rather than two
   * branches, and a wonder whose ratified text needs a shape the vocabulary
   * lacks is **deferred and annotated** rather than bent to fit.
   *
   * The scope is the ordinary `CityScope`: an effect with **no scope** reaches
   * every city of the empire that holds the wonder (exactly as a belief does),
   * and one that means "in the city the wonder stands in" says so with
   * `{ test: 'hasBuilding', building: <this row> }` — which is derived from the
   * board, so a captured wonder pays its captor and stops paying its builder
   * with no bookkeeping at all.
   *
   * Declared on `BuildingDef` rather than on a wonder-only type because there is
   * nothing wonder-shaped about it: the day an ordinary building wants a card
   * effect it fills this in, and the evaluator will not notice the difference.
   */
  effects?: CardEffect[];
  /**
   * What the **ground under the city** must be for this to be built at all —
   * the Great Lighthouse's harbour, Petra's desert, Machu Picchu's mountain.
   * Absent means anywhere, which is every ordinary building.
   *
   * A `CityScope`, so "which towns" is the same shape and the same evaluator
   * (`cityScopeAdmits`) that decides where a card's clause lands — a site
   * requirement and a scoped effect are one question asked at two moments, and
   * a second predicate would be how a wonder comes to pay a coastal city it
   * refused to be built in. Checked in `buildError` with the `city` argument the
   * wonders framework added; a caller with no town in hand cannot ask about the
   * ground and does not (the tech screen's "what could I build one day").
   *
   * The refusal names the *site* rather than the scope — "The Colossus wants a
   * harbour" — because a player who is told "requires coastal" has been told the
   * name of a flag, not the reason.
   */
  requiresSite?: CityScope;
  /**
   * This row is **bought or not at all** — never queued, never hammered.
   *
   * `UnitDef.purchase.exclusive` one table over, and it carries the same
   * sentence: `buildError` refuses it in the row's own words, `purchaseError`
   * admits it, and `isPurchaseOnly` is the interface's half so a build list and
   * the reducer agree by construction. The Gilded Hall's whole identity — a
   * doctrine's marble counting-house that a town cannot labour its way to.
   *
   * The **price** is still the ordinary one: `goldPerHammer` coin per hammer of
   * `cost`, so the 500💰 on The Gilded Court's card is 250 hammers on this row
   * and a designer retuning the conversion moves both together. A row that
   * wanted its own figure would be a second price this game deliberately does
   * not have.
   */
  purchaseOnly?: boolean;
  /**
   * **The bank this row is sold out of**, when it is not the treasury — the four
   * faith houses a follower belief opens (batch B3). Absent means gold, which is
   * every other building in the game.
   *
   * `UnitDef.purchase`'s field one table over and it carries that field's one
   * rule: *a row that names its own bank is sold out of that bank and no other*.
   * That sentence is what keeps gold away from a Mosque without gold having to
   * know what a Mosque is — `rosterBank` (`purchase.ts`) asks both tables and
   * `purchaseError` refuses the wrong coin in the row's own words.
   *
   * It deliberately carries **no cost**, which is the whole difference from the
   * unit spec beside it. The augur's faith price is a figure on its row and has
   * nothing to do with hammers; a faith house is priced exactly as a bought
   * building has always been priced — every line of `explainBuildingCost`, then
   * the conversion as one more line, at `production.faithPerHammer` instead of
   * `goldPerHammer`. So the four rows inherit the age band and the column with no
   * second price to tune, and the two ways faith reaches a town's stones (this
   * and a contribution) agree by construction.
   *
   * It is not `faithPurchases`, which is a fact about a *town* — a Reliquary
   * opens the faith bank for the ordinary roster wherever it stands. This is a
   * fact about the *row*, and it narrows rather than widens.
   */
  purchase?: BuildingPurchaseSpec;
  /**
   * **This row may be raised only in a city that keeps the faith which opened
   * it** — the four faith houses of batch B3. Absent means a building anybody
   * may raise where they may raise anything, which is every other row.
   *
   * A **marker**, exactly as `purchaseOnly` and `consecrated` are: nothing in
   * `src/sim/` compares a building id against `"mosque"`, and nothing here names
   * a religion. The reading is `cityBeliefUnlocksBuilding` (`statecraft.ts`) —
   * *do the follower beliefs of the faith this town keeps open this row* — which
   * is derived from the citizens (`cityReligion`) and therefore cannot disagree
   * with the banner the town flies.
   *
   * Read in exactly one place, `purchaseError`, and that is the split it is for:
   * `isUnlocked` answers "may this empire have the row at all" — yes, the moment
   * any of its towns follows — and this answers "may it stand *here*", which is
   * a wonder's `requiresSite` question asked of a congregation instead of of the
   * ground. Folding the two would have left a player who holds the belief being
   * told the row was "not open yet" in the one town of theirs that had turned.
   */
  followingOnly?: boolean;
  /**
   * Nothing in the tech tree opens this row — **a card does**
   * (`CardUnlocksBuildingEffect`, and The Gilded Court is the only one today).
   *
   * Read in `isUnlocked` (`tech.ts`) as one more clause of the single
   * availability question, rather than as a second gate beside it: a building no
   * technology names is otherwise available from turn one, which is the right
   * default for content and exactly wrong for content a doctrine is supposed to
   * hand over. So the row declares that it is waiting for something, and the
   * card is what arrives.
   */
  unlockedByCard?: boolean;
  /**
   * What finishing this hands its owner, once. See `CompletionGrant`.
   *
   * Realised in `realiseItem` right after the claim, so a grant arrives by the
   * one routine that means "the city now has the thing" — and so a wonder
   * bought, gifted or granted some future way would hand its unit over by the
   * same code. Every grant that mutates a city's derived state settles through
   * the register's own wrappers (`refreshCityDerived`, CLAUDE.md).
   */
  onComplete?: CompletionGrant[];
  /**
   * **Finishing this dedicates it to a patron** — one roll off `state.rng`,
   * uniform over `religion.json`'s `consecrations`, written onto the town as
   * `City.consecration` (design ledger Entry LV). Absent means an ordinary
   * building, which is every row but the cathedral.
   *
   * A **marker**, exactly as `wonder` and `purchaseOnly` are: nothing in
   * `src/sim/` compares a building id against `"cathedral"`, so the day a second
   * row wants a pack-opening completion it sets this flag and `realiseItem`
   * learns nothing new. Read in exactly one place — `realiseItem`, the routine
   * that means "the city now has the thing" — so a cathedral bought with gold or
   * hurried by contributions is dedicated by the same line that dedicates a
   * built one.
   *
   * The roll is inside the completion routine and therefore inside the command
   * log, which is what makes it replay: a save is `{config, log}`, the same
   * commands reach the same completion in the same order, and `state.rng` is at
   * the same point when it does.
   */
  consecrated?: boolean;
  /**
   * **Gold or faith may be poured into this row's basket while it stands at the
   * front of a queue** — the `contribute` verb (Entry LV). Absent means an
   * ordinary building, which is every row but the cathedral today.
   *
   * The marker `contributeError` asks, so the narrow exception to Entry XXIX's
   * "the full cost, never the remainder" is confined to rows that *declare* it:
   * a cathedral is funded every posture's own way, and the Magnum Opus is meant
   * to be funded the same way one age later. Nothing else in the game may be
   * part-paid out of a bank.
   */
  acceptsContributions?: boolean;
  /**
   * **One of these stands in an empire, ever** — the Magnum Opus and the three
   * great works of the Observatory (Entry LVIII, the endgame).
   *
   * `BuildingDef.wonder`'s reading one scale in, and the two are deliberately
   * different questions: a wonder is one per *world* and the register that
   * settles it is `GameState.wonders`, because who raised it first is history
   * anybody may need to read. This is one per *realm* and needs no register at
   * all — the answer is on the board, in whether any city of this empire already
   * holds the row, exactly as `buildError`'s "already building it somewhere
   * else" clause is. Nothing is claimed, nothing is refunded and nothing moves
   * on a capture: a realm that takes a town holding one simply holds one.
   *
   * Refused in `buildError` (and therefore in `purchaseError`, which asks it),
   * in the two clauses a wonder is refused by and for their reasons.
   */
  oncePerEmpire?: boolean;
  /**
   * **The world opens this row, not the tree** — the Magnum Opus, which becomes
   * buildable for *every* empire the moment the world's first seat completes
   * Alchemy (Entry LVIII; `docs/tree-worksheet.md`'s ruling: "the finish line
   * announces itself to all contestants at once").
   *
   * `unlockedByCard`'s sibling and read in the same place, `isUnlocked` — one
   * clause of the one availability question rather than a second gate beside it
   * — with `buildError` printing the sentence. The reading is **derived**
   * (`worldTechReached` in `tech.ts`) and there is deliberately no flag on the
   * state: a stored `opusOpen` would be a second answer to a question the
   * technology lists already answer, and the two would part company the first
   * time a save was loaded mid-age.
   *
   * It does not replace the ordinary gate; it is for a row no node names at all.
   */
  worldUnlockTech?: TechId;
  /**
   * **Finishing this ends the game** (Entry LVIII, the finish line).
   *
   * A marker, exactly as `consecrated` and `acceptsContributions` are, read in
   * exactly one place — `realiseItem`, the routine that means "the city now has
   * the thing" — so an Opus finished by hammers, by a contribution or bought
   * outright closes the age by the same line. What it does is
   * `closeTheGreatWork` (`beads.ts`): the age's reckonings are taken as history
   * and the empire that raised it wins outright (schema 69). The beads are the
   * door the row opens behind, never the count at the curtain.
   */
  endsTheGame?: boolean;
  /**
   * **Units may be bought with faith in the town this stands in** — the
   * Reliquary's third clause (Entry LVIII, The Holy Office). Absent means a town
   * that sells its soldiers for coin like every other.
   *
   * A **marker**, exactly as `acceptsContributions` and `purchaseOnly` are:
   * `purchase.ts` asks whether *this town holds a building that says so*, never
   * whether it holds the Reliquary, so a second such row is one flag. It opens a
   * bank rather than changing a price — the faith figure is the ordinary
   * production cost converted at `production.faithPerHammer`, which is the rate
   * a contribution already buys a hammer at, so the two ways faith reaches a
   * queue agree by construction.
   *
   * It does **not** touch a row that names its own bank (`UnitDef.purchase`):
   * the augur is still sold out of faith and out of nothing else, in every town,
   * which is the rule this marker widens rather than replaces.
   *
   * **A word rather than a flag since the charters** (2026-09-04): the Almshouse
   * opens the same bank for the town's *civilians* only — settlers, workers,
   * caravans — and a second boolean beside this one would have been two markers
   * answering one question, which is exactly how a town ends up selling a
   * knight for faith because the wrong flag was read. `'all'` is the Reliquary's
   * whole roster; `'civilian'` is `isCivilian` (`unitData.ts`), the same
   * predicate `unitPurchaseBucket` sorts a purchase by, so the bank that opens
   * and the bucket that is stamped can never disagree about what a civilian is.
   */
  faithPurchases?: 'all' | 'civilian';
  /**
   * **What this building takes off the price of anything its town buys**, as a
   * signed whole percent — the Assay House's five off. Absent means a town that
   * pays the list price.
   *
   * A number the caller interprets, `authorityCapacity`'s bargain one field
   * over, and read in exactly one place: `explainPurchaseCost` (`purchase.ts`),
   * through `buildingPurchaseDiscount` (`buildingEffects.ts`). It lands in the
   * *same* fold the card riders land in — summed with them, applied once,
   * carried as one labelled line holding the difference — because Entry XVII's
   * discipline at the scale of a price tag is that percentages on one occasion
   * add before they multiply. A discount applied afterwards would be a second
   * multiplication nobody could check.
   *
   * It is a fact about the **town**, which is the whole reason it is here and
   * not a `purchaseRider` on a card: a rider is the empire's law and reaches
   * every market in the realm, and the charter's whole promise is that the
   * assayers are somewhere in particular.
   */
  purchaseDiscount?: number;
  /**
   * **What this building mends on friendly units resting in or beside its town**
   * — the Keep's five. Absent means a building that heals nobody.
   *
   * Read in exactly one place, `healUnits` (`turn.ts`), which is the one place
   * a heal is decided — beside `cardUnitStat(state, unit, 'heal')` and folded
   * into the same sum, so the ordinary rested rule still gates it: a Keep mends
   * the garrison that stood still, never the column that marched past.
   *
   * The reach is the town's own hex and the ring of six, which is
   * `isMountainAdjacent`'s reach and the reach every other "beside this town"
   * clause in the game already uses. The sweep is `turn.ts`' because that module
   * has the board in hand; this table only says what a Keep is worth, and
   * `buildingAdjacentHeal` (`buildingEffects.ts`) is the one reading of it.
   */
  healsAdjacent?: number;
  /**
   * **What this building pays its empire when a rite is performed in its town**
   * — the Chapel's five culture. Absent means a building the augurs pass by.
   *
   * A number rather than a `windfallRider`, because a rider is a card's and
   * reaches the whole realm: an ordinary building's effects are read city-locally
   * (`cityBuildingEffects`) and there is no occasion in that walk to hang one on.
   * Read in exactly one place — `performRiteAt` (`religion.ts`), the one seam a
   * rite resolves at — and paid through `settleCultureWindfall` like every other
   * culture grant in the game, so it fills the draft basket by the ordinary path.
   *
   * "In its town" is the town the rite is performed in, which since the rites
   * became city verbs (2026-09-06) is the only town there is.
   */
  ritePays?: number;
  /**
   * **This row is placed, never built and never bought** — the relic an apostle
   * leaves in a cathedral town.
   *
   * `unlockedByCard`'s and `purchaseOnly`'s third sibling and read in the same
   * place, `isUnlocked` (`tech.ts`), as one more clause of the single
   * availability question rather than a second gate beside it: a building no
   * technology names is otherwise available from turn one, which is right for
   * content the tree opens and exactly wrong for a shelf that arrives by an act.
   *
   * A row that declares it is out of every queue and every purchase list for
   * ever — there is no tech, no card and no bank that opens it — and the only
   * way it reaches a town is the act that writes it into `City.buildings`. What
   * it *pays* is then entirely ordinary: its own yields, read by the same fold
   * that reads a granary's, following the stones when the town changes hands.
   */
  placed?: boolean;
  /**
   * **This building waters the town it stands in** — the aqueduct, today.
   * Absent means an ordinary building, which is every row but one.
   *
   * A **marker**, exactly as `consecrated` and `faithPurchases` are: nothing in
   * `src/sim/` compares a building id against `"aqueduct"`, so the day a second
   * row wants to end a town's thirst it sets this flag and the growth channel
   * learns nothing new. Read in exactly one place — `cityIsWatered`
   * (`buildingEffects.ts`) — and asked by exactly one rule, the dry-settle
   * penalty a town off fresh water pays on its growth surplus
   * (`cities.drySettlePercent`, folded by `explainGrowthPercent`).
   *
   * It is emphatically **not** the freshwater predicate (`cityHasFreshwater`,
   * `statecraft.ts`): that one is a fact about the *ground*, which is what a
   * cistern's renewal and a `freshwater`-scoped card are asking about, and an
   * aqueduct does nothing for a farm three hexes out. Two questions, two
   * readings — a row that watered the fields as well would be a second answer
   * to a question the board already answers.
   */
  waters?: boolean;
  /**
   * **This building irrigates the fields the town works** — the Cistern's
   * cisterns, and the answer to the user's *"what makes this difficult?"*
   * (`docs/audit/deferred-rows.md`, 2026-09-07).
   *
   * `waters`' sibling and deliberately a **second** marker rather than a widening
   * of it, because the two are the two questions that field's own docblock says
   * they are: `waters` ends the *town's* thirst (the dry-settle penalty on its
   * growth) and this vouches for the *ground* — a farm out in the third ring
   * drawing its water from the town instead of from a river. An aqueduct does
   * the first and not the second, which is exactly why one flag could not have
   * served both.
   *
   * Read in **one place**: the renewal clause in `explainTileYield`
   * (`yields/hex.ts`) that asks a farm whether it stands on fresh water
   * (`ImprovementUpgrade.requiresFreshwater`). It reaches the hex through the
   * working city's own context (`cityContext`), which is what makes it a fact
   * about a *town* answering for its fields rather than a second kind of water
   * on the map — `Tile.freshwater` is untouched, and a hex nobody works is dry.
   *
   * A marker like every other here: nothing in `src/sim/` compares a building id
   * against `"cistern"`, so a second row that irrigates is a JSON flag.
   */
  irrigates?: boolean;
  /**
   * A half of this row's ratified text that is **deliberately not built**, in
   * the words a player reads, struck through on the card.
   *
   * `CardDefBase.deferred`'s field on a building row, carried through
   * `anyCardDef` so the two are one convention: a wonder whose text needs an
   * effect shape the vocabulary lacks ships with the half it can say and this
   * beside it, rather than with a shape bent to nearly fit. The great-people
   * table's `deferred` is the same field one table over.
   */
  deferred?: string[];
  /**
   * A standing caveat on what this row *does* do — printed in italics, not
   * struck through. `CardDefBase.note`.
   *
   * The difference from `deferred` is the difference between "this clause is
   * missing" and "this clause is here and there is something to know about it":
   * Hagia Sophia grants an augur where the ratified text says a prophet, and
   * that is a note, because a piece really does arrive.
   */
  note?: string;
  /**
   * True on a row that exists to exercise a framework and will be replaced.
   *
   * Written down in the data rather than in a comment because a comment in JSON
   * is a lie waiting to happen, and because the test that asserts the roster is
   * sane needs to be able to tell a stand-in from a ratified row.
   */
  placeholder?: boolean;
}

export interface BuildingData {
  buildings: Record<BuildingId, BuildingDef>;
}

export const BUILDING_DATA: BuildingData = buildingsJson as BuildingData;

export const BUILDING_IDS = Object.keys(BUILDING_DATA.buildings) as BuildingId[];

export function buildingDef(id: BuildingId): BuildingDef {
  return BUILDING_DATA.buildings[id];
}

/**
 * Is this building a wonder — one of which stands in the whole world?
 *
 * The one reading of `BuildingDef.wonder`, so that nothing anywhere compares a
 * building id against `"theOracle"`, exactly as nothing in `src/sim/` compares a
 * unit against `"settler"` or `"augur"`.
 */
export function isWonder(id: BuildingId): boolean {
  return buildingDef(id).wonder === true;
}

/** Every wonder, in the table's own order. The roster, derived from the flag. */
export const WONDER_IDS: readonly BuildingId[] = BUILDING_IDS.filter(isWonder);

/**
 * Runtime guard. Production queues arrive from save files and (eventually)
 * sockets, so a `BuildingId` may be any string at all.
 */
export function isBuildingId(value: unknown): value is BuildingId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(BUILDING_DATA.buildings, value)
  );
}

/**
 * "Monument" or "Monuments", for a line that counts them ("Monuments ×3").
 *
 * The sibling of `pluralUnitName` in `tech.ts` and the same bargain: a `plural`
 * field in the JSON would be the honest fix the day a name breaks the rules, and
 * until then a data field nobody could get wrong is a data field nobody should
 * have to fill in. Three rules cover this roster and the next one — a sibilant
 * takes "-es", a consonant plus "y" becomes "-ies", everything else takes "-s".
 */
export function buildingPlural(name: string, count: number): string {
  if (count === 1) return name;
  if (/(s|x|z|ch|sh)$/i.test(name)) return `${name}es`;
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}
