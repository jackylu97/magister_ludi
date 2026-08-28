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
 * (`cityYields` in `cities.ts`) and displayed in the city panel without any
 * module knowing that a granary is a granary. When a building eventually needs
 * a behaviour rather than a number, it gets a field naming that behaviour — not
 * a callback in the JSON, which would stop being data.
 *
 * `sciencePerPop` is fractional (a monastery is "+1 per 4 pop", stored as 0.25)
 * and is floored at the point it is applied, per building, so two half-science
 * buildings do not round into a free point. See `cityYields`.
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
 *     `cityYields`, the one production evaluator, so the estimate, the panel and
 *     the bank cannot disagree. It was `unitProductionBonus` — a fraction that
 *     could only ever mean "units" — until luxuries needed the same mechanism
 *     for buildings; generalising the field was strictly cheaper than growing a
 *     sibling special case beside it, and `productionModifiers` (`cities.ts`)
 *     now reads buildings and resources through one shape.
 *   · `upgrades` — the building half of the punctuated-renewal hook that
 *     `improvements.json` has had since M7. See `BuildingUpgrade`.
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
import type { TechId } from './techData';
// Type-only for `TechId`'s reason, one table over: `statecraftData.ts` imports
// `BuildingId` from here.
import type { CardEffect, CityScope, TileCondition } from './statecraftData';
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

/** A percentage of a city's hammers, behind one category. See `BuildingDef`. */
export interface ProductionBonus {
  category: ProductionCategory;
  /** Signed whole percent. `10` is the barracks' ten percent toward units. */
  percent: number;
}

/**
 * Something a building hands its owner **the moment it is finished**, once.
 *
 * The wonders' shape (2026-08-27) and declared on `BuildingDef` rather than on a
 * wonder-only type, because there is nothing wonder-shaped about it: the day an
 * ordinary building wants to hand over a unit it fills this in, and
 * `realiseItem` will not notice the difference.
 *
 * Three grants, and each is a *seam that already exists* rather than a new one —
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
 */
export type CompletionGrant =
  | { grant: 'unit'; unit: UnitTypeId | 'bestMelee' }
  | { grant: 'tech' }
  | { grant: 'doctrineDraft' };

export type BuildingId =
  | 'monument'
  | 'granary'
  | 'shrine'
  | 'barracks'
  | 'palisade'
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
  // **Opened by a card, not by a node** — the one row in the table with no
  // technology behind it (`unlockedByCard`, `purchaseOnly`). The Gilded Court
  // hands it over and the treasury is the only way to raise it.
  | 'gildedHall'
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
 * One tech-driven renewal of a building's yield — the mirror of
 * `ImprovementUpgrade` (`improvementData.ts`), deliberately the same shape so
 * that "a technology quietly makes something you already own pay more" is one
 * idea with one spelling rather than two.
 *
 * `add` is a delta and never a replacement, for `ImprovementUpgrade`'s reason:
 * an entry that replaced would have to know what it was replacing, which is
 * exactly the inline adjustment hard rule 5 exists to forbid. Each renewal
 * becomes its own line in `explainBuildingYield` (`cities.ts`) and its own gift
 * on the tech screen (`techGifts`).
 *
 * There is no `requiresFreshwater` twin: an improvement stands on a tile and can
 * be asked about the ground under it, and a building stands in a city, which has
 * no such question to answer yet.
 */
export interface BuildingUpgrade {
  /** The technology that switches this on for its owner. */
  tech: TechId;
  /** Added to what the building already pays, once the owner holds `tech`. */
  add: BuildingYield;
}

/**
 * What a building pays on **the ground its city works**, rather than in the
 * city's own totals — the granary's point of food on every water hex.
 *
 * `BuildingUpgrade`'s sibling and emphatically not the same thing, which is why
 * it is a second field rather than a flag on that one. An upgrade is a number
 * added to a *building's* line and is worth the same in every town; this is a
 * number added to a *tile's* line and is worth whatever the town's ground turns
 * out to be — a granary in a landlocked city gets nothing from it, and the
 * player can see exactly why, because the line shows up in the hex's own
 * breakdown (hard rule 5) rather than in a lump on the building.
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
  /** Hammers to complete. */
  cost: number;
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
  /** Tech-driven renewals. See `BuildingUpgrade` and the module docblock. */
  upgrades?: BuildingUpgrade[];
  /** What this pays on the *ground*. See `BuildingTileYield`. */
  tileYields?: BuildingTileYield[];
  /**
   * **A wonder: one of these stands in the whole world, ever.** Absent means an
   * ordinary building, which is every row but one today.
   *
   * A flag rather than a second table, and that is the whole framework: a
   * wonder is unlocked by a technology like any building, queued like any
   * building, paid for out of the same basket by the same completion routine,
   * and pays its `yields` through `cityYields` like any building. Four things
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
